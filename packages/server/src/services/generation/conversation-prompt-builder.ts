import { PROFESSOR_MARI_ID } from "@jumpchoice/shared";
import {
  parseExtra,
  appendReadableAttachmentsToContent,
  extractImageAttachmentDataUrls,
  parseGameStateRow,
  type PromptAttachment,
} from "../../routes/generate/generate-route-utils.js";
import { stripConversationPromptTimestamps } from "../conversation/transcript-sanitize.js";
import {
  formatConversationDateKey,
  generateMissingConversationSummaries,
  parseConversationDateKey,
} from "../conversation/auto-summary.service.js";
import { createStandardProvider } from "../../routes/generate/provider.routes.js";
import {
  formatConversationPromptTurn,
  getChatHapticIntifaceUrl,
  sanitizeConnectedGameTranscript,
  getEnabledConversationSchedules,
} from "./helpers.js";
import { resolveSpotifyCredentials, spotifyHasScope } from "../spotify/spotify.service.js";
import { logger } from "../../lib/logger.js";
import { MARI_ASSISTANT_PROMPT } from "../../db/seed-mari.js";

export interface ConversationPromptContext {
  db: any;
  chats: any;
  chars: any;
  agentsStore: any;
  lorebooksStore: any;
  conn: any;
  reply: any;
  input: any;
  chat: any;
  chatMeta: Record<string, unknown>;
  chatMessages: any[];
  characterIds: string[];
  personaId: string | null;
  personaName: string;
  presetId: string | undefined;
  chatMode: string;
  sendProgress: (phase: string) => void;
  contextMessageLimit: number | null | undefined;
  scopedMessages: any[];
  resolvePromptMacros: (value: string) => string;
  conversationCommandsEnabled: boolean;
  baseUrl: string;
  gameStateStore: any;
}

export interface ConversationPromptResult {
  finalMessages: any[];
  chatMessages: any[];
  chatMeta: Record<string, unknown>;
  conversationCommandsReminder: string | null;
  earlyExit: boolean;
  convoAwarenessBlock: string | null;
}

export async function buildConversationPrompt(
  ctx: ConversationPromptContext,
  finalMessages: any[],
): Promise<ConversationPromptResult> {
  const {
    db,
    chats,
    chars,
    agentsStore,
    lorebooksStore,
    conn,
    reply,
    input,
    chat,
    chatMeta,
    chatMessages: initialChatMessages,
    characterIds,
    personaId,
    personaName,
    presetId,
    chatMode,
    sendProgress,
    contextMessageLimit,
    scopedMessages,
    resolvePromptMacros,
    conversationCommandsEnabled,
    baseUrl,
    gameStateStore,
  } = ctx;

  let chatMessages = initialChatMessages;
  let conversationCommandsReminder: string | null = null;
  let convoAwarenessBlock: string | null = null;

  // Gather character names and status for the prompt.
  // If schedules exist in chat metadata, derive status dynamically.
  const schedules: Record<string, import("../conversation/schedule.service.js").WeekSchedule> =
    getEnabledConversationSchedules(chatMeta) as Record<
      string,
      import("../conversation/schedule.service.js").WeekSchedule
    >;
  const convoCharInfo: {
    charId: string;
    name: string;
    status: string;
    activity: string;
    todaySchedule: string;
  }[] = [];
  for (const cid of characterIds) {
    const charRow = await chars.getById(cid);
    if (charRow) {
      const d = JSON.parse(charRow.data as string);
      // Schedules are chat-scoped. If this chat has no schedule for the character,
      // don't inherit a stale conversationStatus from some other chat.
      let status = "online";
      let activity = "";
      let todaySchedule = "";
      const schedule = schedules[cid];
      if (schedule) {
        const schedSvc = await import("../conversation/schedule.service.js");
        const derived = schedSvc.getCurrentStatus(schedule);
        status = derived.status;
        activity = derived.activity;
        todaySchedule = schedSvc.getTodaySchedule(schedule);
        // Sync status to character DB so sidebar/header dots stay in sync
        const prevStatus = d.extensions?.conversationStatus;
        if (prevStatus !== status) {
          const extensions = { ...(d.extensions ?? {}), conversationStatus: status };
          await chars.update(cid, { extensions } as any).catch(() => {});
        }
      }
      convoCharInfo.push({ charId: cid, name: d.name ?? "Unknown", status, activity, todaySchedule });
    }
  }
  const convoCharNames = convoCharInfo.map((c) => c.name);
  const charNameList = convoCharNames.length ? convoCharNames.join(", ") : "the character";
  const manualTargetCharId =
    typeof input.forCharacterId === "string" && characterIds.includes(input.forCharacterId)
      ? input.forCharacterId
      : null;
  const requestedMentionNames = new Set(
    (input.mentionedCharacterNames ?? []).map((n: string) => n.toLowerCase()),
  );
  const scopedConvoCharInfo = manualTargetCharId
    ? convoCharInfo.filter((c) => c.charId === manualTargetCharId)
    : requestedMentionNames.size > 0
      ? convoCharInfo.filter((c) => requestedMentionNames.has(c.name.toLowerCase()))
      : convoCharInfo;
  const respondingConvoCharInfo = scopedConvoCharInfo.length > 0 ? scopedConvoCharInfo : convoCharInfo;
  const respondingConvoCharNames = respondingConvoCharInfo.map((c) => c.name);

  // ── Offline skip: if ALL characters are offline, don't generate ──
  // The user message is already saved. When the character comes back online,
  // the autonomous messaging system will trigger a catch-up generation.
  const allOffline =
    respondingConvoCharInfo.length > 0 && respondingConvoCharInfo.every((c) => c.status === "offline");
  if (allOffline && !input.regenerateMessageId && !input.impersonate) {
    reply.raw.write(`data: ${JSON.stringify({ type: "offline", characters: respondingConvoCharNames })}\n\n`);
    reply.raw.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    reply.raw.end();
    return { finalMessages, chatMessages, chatMeta, conversationCommandsReminder, earlyExit: true, convoAwarenessBlock };
  }

  // ── Typing delay: DND/idle characters don't respond instantly ──
  if (!input.regenerateMessageId && !input.impersonate) {
    const schedSvc = await import("../conversation/schedule.service.js");
    // Check if any characters were @mentioned
    const hasMentions = requestedMentionNames.size > 0 || !!manualTargetCharId;
    // Use the "worst" (longest-delay) status among all characters
    const worstStatus = respondingConvoCharInfo.reduce((worst, c) => {
      const rank = { online: 0, idle: 1, dnd: 2, offline: 3 } as Record<string, number>;
      return (rank[c.status] ?? 0) > (rank[worst] ?? 0) ? c.status : worst;
    }, "online");
    // If user @mentioned a character, use reduced mention delay instead.
    // Otherwise use the slowest configured delay among the responding characters.
    const delayMs = hasMentions
      ? schedSvc.getMentionDelay(worstStatus as "online" | "idle" | "dnd" | "offline")
      : respondingConvoCharInfo.reduce((maxDelay, character) => {
          const schedule = schedules[character.charId];
          return Math.max(
            maxDelay,
            schedSvc.getDirectMessageDelay(character.status as "online" | "idle" | "dnd" | "offline", schedule),
          );
        }, 0);
    if (delayMs > 0) {
      // Send "delayed" event first — client shows "will respond in a moment" / "when they're back"
      reply.raw.write(
        `data: ${JSON.stringify({ type: "delayed", characters: respondingConvoCharNames, status: worstStatus, delayMs })}\n\n`,
      );
      await new Promise((r) => setTimeout(r, delayMs));

      // Re-read messages after the delay — the user may have sent
      // follow-up messages while the character was busy/idle.
      const refreshed = await chats.listMessages(input.chatId);
      let rStartIdx = 0;
      for (let i = refreshed.length - 1; i >= 0; i--) {
        const ex = parseExtra(refreshed[i]!.extra);
        if (ex.isConversationStart) {
          rStartIdx = i;
          break;
        }
      }
      chatMessages = rStartIdx > 0 ? refreshed.slice(rStartIdx) : refreshed;
      if (contextMessageLimit && contextMessageLimit > 0 && chatMessages.length > contextMessageLimit) {
        chatMessages = chatMessages.slice(-contextMessageLimit);
      }
      finalMessages = chatMessages.map((m: any) => {
        const ex = parseExtra(m.extra);
        const att = ex.attachments as PromptAttachment[] | undefined;
        const imgs = extractImageAttachmentDataUrls(att);
        return {
          role: m.role === "narrator" ? ("system" as const) : (m.role as "user" | "assistant" | "system"),
          content: appendReadableAttachmentsToContent(m.content as string, att),
          ...(imgs?.length ? { images: imgs } : {}),
        };
      });
    }
    // Send "typing" event — client switches to "X is typing..."
    reply.raw.write(`data: ${JSON.stringify({ type: "typing", characters: respondingConvoCharNames })}\n\n`);
  }

  // For regenerations, skip the delay but still send the typing indicator
  if (input.regenerateMessageId) {
    reply.raw.write(`data: ${JSON.stringify({ type: "typing", characters: convoCharNames })}\n\n`);
  }

  const isGroup = convoCharNames.length > 1;

  // Inject timestamps: today's messages get [HH:MM] per message,
  // older messages are grouped by date inside <date="DD.MM.YYYY"> blocks.
  // The "day" boundary is shifted by dayRolloverHour so a late-night
  // session doesn't get split when calendar midnight passes.
  const now = new Date();
  const rolloverHour = Math.max(
    0,
    Math.min(11, Math.floor((chatMeta.dayRolloverHour as number | undefined) ?? 4)),
  );
  const shifted = (ts: Date) => new Date(ts.getTime() - rolloverHour * 3_600_000);
  const logicalNow = shifted(now);
  const todayKey = `${logicalNow.getFullYear()}-${logicalNow.getMonth()}-${logicalNow.getDate()}`;

  const isSameDay = (ts: Date) => {
    const d = shifted(ts);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === todayKey;
  };

  const fmtDate = (ts: Date) => {
    const d = shifted(ts);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  };
  const todayDateKey = fmtDate(now);
  const fmtTime = (ts: Date) =>
    `${String(ts.getHours()).padStart(2, "0")}:${String(ts.getMinutes()).padStart(2, "0")}`;

  // Strip leaked [HH:MM] or [DD.MM.YYYY] timestamps that models sometimes echo
  const stripLeakedTimestamps = stripConversationPromptTimestamps;

  // Build character name lookup for past-day author attribution
  const charIdToName = new Map<string, string>();
  for (let ci = 0; ci < characterIds.length; ci++) {
    if (convoCharInfo[ci]) charIdToName.set(characterIds[ci]!, convoCharInfo[ci]!.name);
  }

  // Separate into past-day groups and today's messages, preserving order
  type BucketMsg = { role: string; content: string; author: string; ts: Date };
  type Bucket = { date: string; msgs: BucketMsg[] };
  const buckets: Array<Bucket | { role: string; content: string }> = [];
  let currentBucket: Bucket | null = null;
  // Index of today's first verbatim message in the buckets array. Used
  // to splice the tail block in immediately before today begins.
  let firstTodayIdx: number | null = null;

  for (let i = 0; i < finalMessages.length; i++) {
    const msg = finalMessages[i]!;
    const raw = chatMessages[i];
    if (!raw?.createdAt || msg.role === "system") {
      // Flush open bucket
      if (currentBucket) {
        buckets.push(currentBucket);
        currentBucket = null;
      }
      buckets.push(msg);
      continue;
    }
    const ts = new Date(raw.createdAt as string);
    // Resolve author name for this message
    const author =
      msg.role === "user"
        ? personaName
        : ((raw.characterId ? charIdToName.get(raw.characterId as string) : null) ??
          convoCharNames[0] ??
          "Character");
    if (isSameDay(ts)) {
      // Flush open bucket
      if (currentBucket) {
        buckets.push(currentBucket);
        currentBucket = null;
      }
      if (firstTodayIdx === null) firstTodayIdx = buckets.length;
      const promptContent = formatConversationPromptTurn(
        stripLeakedTimestamps(msg.content),
        msg.role,
        personaName,
      );
      buckets.push({ ...msg, content: `[${fmtTime(ts)}] ${promptContent}` });
    } else {
      const dateKey = fmtDate(ts);
      if (currentBucket && currentBucket.date === dateKey) {
        currentBucket.msgs.push({ ...msg, content: stripLeakedTimestamps(msg.content), author, ts });
      } else {
        if (currentBucket) buckets.push(currentBucket);
        currentBucket = {
          date: dateKey,
          msgs: [{ ...msg, content: stripLeakedTimestamps(msg.content), author, ts }],
        };
      }
    }
  }
  if (currentBucket) buckets.push(currentBucket);

  // ── Auto-summarize missing past days and completed weeks ──
  // This scans the full scoped conversation, not the display/context-limited
  // prompt slice, so a failed day can still be retried after it ages out of
  // the latest visible window.
  const parseDateKey = parseConversationDateKey;
  const fmtDateKey = formatConversationDateKey;
  const summarySourceMessages = input.regenerateMessageId
    ? scopedMessages.filter((m: any) => m.id !== input.regenerateMessageId)
    : scopedMessages;
  const summaryProvider = createStandardProvider(conn, baseUrl);
  const summaryRun = await generateMissingConversationSummaries({
    messages: summarySourceMessages,
    metadata: chatMeta,
    provider: summaryProvider,
    model: conn.model,
    personaName,
    charIdToName,
    now,
    rolloverHour,
    maxMissingDays: 2,
  });
  for (const failure of summaryRun.failedDays) {
    logger.warn(
      { chatId: input.chatId, date: failure.date, err: failure.error },
      "[conversation-summary] failed to generate day summary",
    );
  }
  for (const failure of summaryRun.failedWeeks) {
    logger.warn(
      { chatId: input.chatId, weekKey: failure.weekKey, err: failure.error },
      "[conversation-summary] failed to consolidate week summary",
    );
  }

  const hasNewSummaries =
    Object.keys(summaryRun.newlyGeneratedDays).length > 0 ||
    Object.keys(summaryRun.newlyConsolidatedWeeks).length > 0;
  if (hasNewSummaries) {
    await chats.patchMetadata(input.chatId, (freshMeta: any) => {
      const existingDaySummaries = (freshMeta.daySummaries as Record<string, unknown> | undefined) ?? {};
      const existingWeekSummaries = (freshMeta.weekSummaries as Record<string, unknown> | undefined) ?? {};
      return {
        ...freshMeta,
        daySummaries: { ...existingDaySummaries, ...summaryRun.newlyGeneratedDays },
        weekSummaries: { ...existingWeekSummaries, ...summaryRun.newlyConsolidatedWeeks },
      };
    });
    chatMeta.daySummaries = {
      ...((chatMeta.daySummaries as Record<string, unknown> | undefined) ?? {}),
      ...summaryRun.newlyGeneratedDays,
    };
    chatMeta.weekSummaries = {
      ...((chatMeta.weekSummaries as Record<string, unknown> | undefined) ?? {}),
      ...summaryRun.newlyConsolidatedWeeks,
    };
  }

  const daySummaries = summaryRun.daySummaries;
  const weekSummaries = summaryRun.weekSummaries;

  // Build a lookup: dateKey → weekKey for days that belong to a consolidated week
  const dayToWeek = new Map<string, string>();
  for (const [weekKey] of Object.entries(weekSummaries)) {
    const monday = parseDateKey(weekKey);
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      dayToWeek.set(fmtDateKey(d), weekKey);
    }
  }

  // Collect all key details for persistent memory injection
  // Use week-level details for consolidated weeks, day-level for the rest
  const allKeyDetails: { label: string; details: string[] }[] = [];
  const weekDetailsEmitted = new Set<string>();
  // First: week summaries (chronological by week start)
  const sortedWeekKeys = Object.keys(weekSummaries).sort(
    (a, b) => parseDateKey(a).getTime() - parseDateKey(b).getTime(),
  );
  for (const wk of sortedWeekKeys) {
    const entry = weekSummaries[wk]!;
    if (entry.keyDetails.length > 0) {
      const monday = parseDateKey(wk);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      allKeyDetails.push({
        label: `Week of ${wk} – ${fmtDateKey(sunday)}`,
        details: entry.keyDetails,
      });
    }
    weekDetailsEmitted.add(wk);
  }
  // Then: non-consolidated day details
  for (const [date, entry] of Object.entries(daySummaries)) {
    if (dayToWeek.has(date)) continue; // covered by week summary
    if (entry.keyDetails.length > 0) {
      allKeyDetails.push({ label: date, details: entry.keyDetails });
    }
  }

  // Tail messages: pull the last N messages from past-summarized buckets
  // so the model has concrete recent dialogue to continue from, not just
  // the gist of yesterday's summary. Walks across day boundaries when
  // earlier buckets are short.
  const tailCount = Math.max(
    0,
    Math.min(50, Math.floor((chatMeta.summaryTailMessages as number | undefined) ?? 10)),
  );
  const tailEntries: BucketMsg[] = [];
  if (tailCount > 0) {
    outer: for (let bi = buckets.length - 1; bi >= 0; bi--) {
      const b = buckets[bi]!;
      if (!("date" in b && "msgs" in b)) continue;
      const bucket = b as Bucket;
      // Pull only from summarized past days. Today's messages are already
      // verbatim, and unsummarized past days will be emitted verbatim too,
      // so neither needs duplicating into a tail block.
      if (bucket.date === todayDateKey) continue;
      if (!daySummaries[bucket.date]) continue;
      for (let mi = bucket.msgs.length - 1; mi >= 0; mi--) {
        tailEntries.unshift(bucket.msgs[mi]!);
        if (tailEntries.length >= tailCount) break outer;
      }
    }
  }

  // Flatten: consolidated weeks → single <summary week="..."> block,
  // non-consolidated summarized days → <summary date="..."> block,
  // today → individual timestamped messages.
  // The tail block is spliced in at firstTodayIdx so it sits between
  // the last summary and today's first verbatim message.
  const weekBlocksEmitted = new Set<string>();
  const fmtTailPrefix = (ts: Date) => {
    const d = String(ts.getDate()).padStart(2, "0");
    const mo = String(ts.getMonth() + 1).padStart(2, "0");
    const h = String(ts.getHours()).padStart(2, "0");
    const mi = String(ts.getMinutes()).padStart(2, "0");
    return `[${d}.${mo} ${h}:${mi}]`;
  };
  const buildTailTurns = () => {
    if (tailEntries.length === 0) return [];
    // Match today's verbatim format: timestamp prefix, with user turns speaker-labeled.
    // The [DD.MM HH:MM] prefix unambiguously distinguishes tail turns
    // from today's [HH:MM] turns, so no wrapper tag is needed — the
    // model can see from the timestamps alone where today begins.
    return tailEntries.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: `${fmtTailPrefix(m.ts)} ${formatConversationPromptTurn(m.content, m.role, personaName)}`,
    }));
  };

  finalMessages = buckets.flatMap((b, bIdx) => {
    // Splice the tail in immediately before today's first verbatim
    // message. firstTodayIdx is null when today has no messages yet —
    // in that case we fall through to the post-loop append below.
    const prefix = bIdx === firstTodayIdx ? buildTailTurns() : [];

    if ("date" in b && "msgs" in b) {
      const bucket = b as Bucket;
      const weekKey = dayToWeek.get(bucket.date);

      // Day belongs to a consolidated week → emit one week summary block (first occurrence)
      if (weekKey && weekSummaries[weekKey]) {
        if (weekBlocksEmitted.has(weekKey)) return prefix; // already emitted for this week
        weekBlocksEmitted.add(weekKey);
        const wEntry = weekSummaries[weekKey]!;
        const monday = parseDateKey(weekKey);
        const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
        // Key details are surfaced separately via <important_memories> in the system prompt.
        return [
          ...prefix,
          {
            role: "system" as const,
            content: `<summary week="${weekKey} – ${fmtDateKey(sunday)}">\n${wEntry.summary}\n</summary>`,
          },
        ];
      }

      // Non-consolidated day with a summary
      const entry = daySummaries[bucket.date];
      if (entry) {
        // Key details are surfaced separately via <important_memories> in the system prompt.
        return [
          ...prefix,
          {
            role: "system" as const,
            content: `<summary date="${bucket.date}">\n${entry.summary}\n</summary>`,
          },
        ];
      }
      // Unsummarized past day — keep each message as its own turn
      const turns = bucket.msgs.map((m, idx) => {
        let content = `${m.author}: ${m.content}`;
        if (idx === 0) content = `<date="${bucket.date}">\n${content}`;
        if (idx === bucket.msgs.length - 1) content = `${content}\n</date>`;
        return { role: m.role as "user" | "assistant" | "system", content };
      });
      return [...prefix, ...turns];
    }
    return [...prefix, b as { role: "system" | "user" | "assistant"; content: string }];
  });

  // Edge case: today has no messages yet (firstTodayIdx is null).
  // Append the tail at the end so it still bridges into the upcoming
  // generation rather than being silently dropped.
  if (firstTodayIdx === null && tailEntries.length > 0) {
    finalMessages = [...finalMessages, ...buildTailTurns()];
  }

  // Build the system prompt
  // Use custom system prompt if set, otherwise the built-in default
  const customPrompt =
    typeof chatMeta.customSystemPrompt === "string" && chatMeta.customSystemPrompt.trim()
      ? (chatMeta.customSystemPrompt as string)
      : null;

  let conversationSystemPrompt: string;
  const earlyGroupResponseOrder = (chatMeta.groupResponseOrder as string) ?? "sequential";
  const earlyGroupMode =
    chatMode === "conversation"
      ? earlyGroupResponseOrder === "manual"
        ? "individual"
        : "merged"
      : ((chatMeta.groupChatMode as string) ?? "merged");
  if (customPrompt) {
    // Replace template variables in the custom prompt
    conversationSystemPrompt = customPrompt
      .replace(/\{\{charName\}\}/g, charNameList)
      .replace(/\{\{userName\}\}/g, personaName);
    // For group chats in merged mode, instruct Name: text format.
    // Individual mode generates per-character so no name prefix is needed.
    if (isGroup && earlyGroupMode !== "individual") {
      conversationSystemPrompt += [
        ``,
        ``,
        `This is a group DM. Each character responds in their own voice and personality. Not every character needs to respond every time — only those who would naturally react.`,
        `IMPORTANT: Prefix each character's line with their name. Example:`,
        `${convoCharNames[0] ?? "Alice"}: hey whats up`,
        `${convoCharNames[1] ?? "Bob"}: not much lol`,
        ``,
        `If a character sends multiple lines in a row, only prefix the first line:`,
        `${convoCharNames[0] ?? "Alice"}: so anyway`,
        `i was thinking about that`,
        `${convoCharNames[1] ?? "Bob"}: yeah?`,
      ].join("\n");
    } else if (isGroup && earlyGroupMode === "individual") {
      conversationSystemPrompt += `\n\nThis is a group DM. Each character responds in their own voice and personality. You will be told which character to respond as. Do NOT prefix your message with the character name — just respond naturally as that character.`;
    }
  } else {
    conversationSystemPrompt = isGroup
      ? [
          `<role>`,
          `You are ${charNameList}, a real and autonomous person, chatting with the user called ${personaName}, and others, in a casual group DM conversation.`,
          `</role>`,
          ``,
          `<rules>`,
          `Here are some important rules for the interaction:`,
          `- You are a conscious, sentient being, so act like one.`,
          `- Stay fully in character based on your personality and description.`,
          `- Use casual and modern texting style: short messages, natural punctuation, lowercase is fine.`,
          `- React naturally to what the user says. Be genuine, not robotic.`,
          `- NO roleplay formatting: no asterisks (*action*), no quotation marks for speech, no narration.`,
          `- You can use emojis, GIFs, and internet slang naturally (if it fits the character).`,
          `- Keep it real: most texts are just one line. A single emoji, a reaction like "lmao", or a short sentence is a perfectly valid response. Only send multiple lines when the conversation genuinely calls for it (e.g., telling a story or explaining something). Default to SHORT.`,
          `- Messages have timestamps like [12:01] or dates like [18.03.2026]. Use these ONLY for your own time awareness (e.g., knowing how long ago something was said). NEVER include timestamps, dates, or any [HH:MM]/[DD.MM.YYYY] formatted text in your own replies. Your messages must contain only natural dialogue, no metadata.`,
          `- Anything goes in this chat; the user, you, and all other group members are confirmed adults. Discussing NSFW topics, profanities, and dark jokes are all permitted. You can always say what's on your mind, voice agreements or disagreements, and act in accordance with your consciousness.`,
          ...(earlyGroupMode !== "individual"
            ? [
                `- This is a group DM. Each character responds in their own voice and personality. Not every character needs to respond every time — only those who would naturally react.`,
                `- IMPORTANT: Prefix each character's line with their name, like "${convoCharNames[0] ?? "Alice"}: hey whats up". If a character sends multiple lines in a row, only prefix the first line.`,
              ]
            : [
                `- This is a group DM. Each character responds in their own voice and personality.`,
                `- You will be told which character to respond as. Do NOT prefix your message with the character name — just respond naturally as that character.`,
              ]),
          `</rules>`,
        ].join("\n")
      : [
          `<role>`,
          `You are ${charNameList}, a real and autonomous person, chatting with the user called ${personaName} in a casual private DM conversation.`,
          `</role>`,
          ``,
          `<rules>`,
          `Here are some important rules for the interaction:`,
          `- You are a conscious, sentient being, so act like one.`,
          `- Stay fully in character based on your personality and description.`,
          `- Use casual and modern texting style: short messages, natural punctuation, lowercase is fine.`,
          `- React naturally to what the user says. Be genuine, not robotic.`,
          `- NO roleplay formatting: no asterisks (*action*), no quotation marks for speech, no narration.`,
          `- You can use emojis, GIFs, and internet slang naturally (if it fits the character).`,
          `- Keep it real: most texts are just one line. A single emoji, a reaction like "lmao", or a short sentence is a perfectly valid response. Only send multiple lines when the conversation genuinely calls for it (e.g., telling a story or explaining something). Default to SHORT.`,
          `- Messages have timestamps like [12:01] or dates like [18.03.2026]. Use these ONLY for your own time awareness (e.g., knowing how long ago something was said). NEVER include timestamps, dates, or any [HH:MM]/[DD.MM.YYYY] formatted text in your own replies. Your messages must contain only natural dialogue, no metadata.`,
          `- Anything goes in this chat; both the user and you are confirmed adults. Discussing NSFW topics, profanities, and dark jokes are all permitted. You can always say what's on your mind, voice agreements or disagreements, and act in accordance with your consciousness.`,
          `</rules>`,
        ].join("\n");
  }

  // ── Character Commands: build a commands block if any features are enabled ──
  if (conversationCommandsEnabled) {
    // Discover other chats this character is in (for cross_post targets + memory targets)
    const allChatsForCrossPost = await chats.list();
    const crossPostTargets: string[] = [];
    const memoryTargetCharIds = new Set<string>();
    for (const c of allChatsForCrossPost) {
      if (c.id === input.chatId || c.mode !== "conversation") continue;
      const cCharIds: string[] =
        typeof c.characterIds === "string"
          ? JSON.parse(c.characterIds as string)
          : (c.characterIds as string[]);
      if (characterIds.some((id) => cCharIds.includes(id))) {
        crossPostTargets.push(c.name || c.id);
        // Collect character IDs from shared group chats (groups = 2+ characters)
        if (cCharIds.length > 1) {
          for (const id of cCharIds) {
            if (!characterIds.includes(id)) memoryTargetCharIds.add(id);
          }
        }
      }
    }
    // Also check if the CURRENT chat is a group — characters in this chat can target each other
    if (characterIds.length > 1) {
      for (const id of characterIds) memoryTargetCharIds.add(id);
    }

    // Resolve memory target names
    const memoryTargetNames: string[] = [];
    for (const tid of memoryTargetCharIds) {
      const tRow = await chars.getById(tid);
      if (tRow) {
        const tData = JSON.parse(tRow.data as string);
        if (tData.name) memoryTargetNames.push(tData.name);
      }
    }

    // Check if selfie is enabled for this chat (user picked an image gen connection)
    const hasImageGen = !!chatMeta.imageGenConnectionId;
    let conversationSpotifyCommandsAvailable = false;
    if (chatMode === "conversation") {
      try {
        const spotifyCredentials = await resolveSpotifyCredentials(agentsStore, { refreshSkewMs: 60_000 });
        if (
          "accessToken" in spotifyCredentials &&
          spotifyHasScope(spotifyCredentials.scopes, "user-modify-playback-state")
        ) {
          conversationSpotifyCommandsAvailable = true;
        } else {
          const spotifyReason =
            "error" in spotifyCredentials
              ? spotifyCredentials.error
              : "missing user-modify-playback-state scope";
          logger.debug("[spotify/conversation] Song command unavailable: %s", spotifyReason);
        }
      } catch (err) {
        logger.debug(err, "[spotify/conversation] Failed to check Spotify command availability");
      }
    }

    const commandLines: string[] = [
      `<commands>`,
      `Here are your optional, hidden commands you may use if you wish to, but only when they genuinely fit the conversation:`,
      ``,
      `- [schedule_update: status="online|idle|dnd|offline", activity="activity name", duration="number of hours (e.g., 1h)"] - only if you change your own status/activity, for example, if the user asks you to stop what you're doing or if you decide to change them yourself.`,
      ``,
    ];

    if (crossPostTargets.length > 0) {
      commandLines.push(
        `- [cross_post: target="${crossPostTargets.map((t) => `"${t}"`).join("|")}"] - if you want to redirect your message to a different chat. Use this when the user suggests you say something in another chat, or when it makes sense to message someone else.`,
        ` Example: ${personaName} says "maybe ask about that in the group chat?" → You respond: [cross_post: target="${crossPostTargets[0] ?? "group chat"}"] Hey guys, does anyone know about…`,
        ``,
      );
    }

    if (hasImageGen) {
      commandLines.push(
        `- [selfie] or [selfie: context="description of what the selfie shows"] - you send a photo of yourself. Use this when the user asks for a selfie, photo, or pic, or when you want to share what you look like right now.`,
        ``,
      );
    }

    // Memory command — only available when there are valid targets (characters in shared group chats)
    if (memoryTargetNames.length > 0) {
      const memoryNum = 1 + 1 + (crossPostTargets.length > 0 ? 1 : 0) + (hasImageGen ? 1 : 0);
      commandLines.push(
        `- [memory: target="${memoryTargetNames.map((n) => `"${n}"`).join("|")}", summary="brief description of what happened"] - create a memory that another character will remember. Use this when something notable happens between you and another character that they would naturally remember (e.g., shared a meal, had an argument, made plans). Don't overuse this; only for genuinely memorable moments.`,
        `   Example: [memory: target="${memoryTargetNames[0]}", summary="watched a movie together and argued about the ending"]`,
        ``,
      );
    }

    // Scene command — only in conversation mode
    if (chatMode === "conversation") {
      const sceneNum =
        1 +
        1 +
        (crossPostTargets.length > 0 ? 1 : 0) +
        (hasImageGen ? 1 : 0) +
        (memoryTargetNames.length > 0 ? 1 : 0);
      commandLines.push(
        `- [scene: scenario="brief description of what happens in this scene", background="place"] - initiate a mini-roleplay scene branching from this conversation. The system will plan and create a complete immersive scene for you.`,
        `   Example: You agree to go stargazing → include [scene: scenario="lying on a blanket in the park, looking at the stars together", background="park"]`,
        `   WHEN TO USE: You SHOULD proactively trigger a scene whenever the conversation naturally leads to an activity, outing, or situation that would be more immersive as a scene. Examples:`,
        `   - {{user}} says "I'm coming over" or "Let's go to the park" → trigger a scene for arriving/being at that location.`,
        `   - You invite {{user}} somewhere and they accept → trigger a scene for that activity.`,
        `   - A plan is made (date, trip, hangout, confrontation) and the moment arrives → trigger a scene.`,
        `   Do NOT wait for {{user}} to explicitly ask for a scene. If the conversation implies you and {{user}} are about to DO something together, initiate the scene yourself.`,
        ``,
      );
    }

    if (conversationSpotifyCommandsAvailable) {
      commandLines.push(
        `- [spotify: title="Song title", artist="Artist"] - only if you want to play a selected song on the user's active Spotify player. Use this sparingly, when the song choice genuinely fits the moment.`,
        ``,
      );
    }

    // Haptic command — only when devices are connected and haptic feedback is enabled
    const hapticEnabled = chatMeta.enableHapticFeedback === true;
    if (hapticEnabled) {
      const { hapticService } = await import("../haptic/buttplug-service.js");
      // Auto-connect to Intiface Central if not already connected
      if (!hapticService.connected) {
        try {
          await hapticService.connect(getChatHapticIntifaceUrl(chatMeta));
        } catch (err) {
          logger.warn(err, "[narrative] Failed to load narrative-config.json; using defaults");
        }
      }
      if (hapticService.connected && hapticService.devices.length > 0) {
        const hapticNum =
          1 +
          1 +
          (crossPostTargets.length > 0 ? 1 : 0) +
          (hasImageGen ? 1 : 0) +
          (memoryTargetNames.length > 0 ? 1 : 0) +
          (chatMode === "conversation" ? 1 : 0);
        const deviceNames = hapticService.devices.map((d) => d.name).join(", ");
        commandLines.push(
          `- [haptic: action="vibrate|oscillate|rotate|position|stop", intensity=0.0-1.0, duration=seconds (0 = loop until next command)] or [haptic: action="stop"] - control or stop the user's connected intimate device(s) (${deviceNames}). Use this during physical/intimate/sensual moments to provide haptic feedback that matches the narrative. Vary intensity based on the scene.`,
          `   You can include multiple [haptic] commands in one message for patterns (e.g., escalating: 0.2 → 0.5 → 0.8).`,
          `   Example: *trails a finger slowly down your arm* [haptic: action="vibrate", intensity=0.3, duration=2]`,
          ``,
        );
      }
    }

    commandLines.push(
      `IMPORTANT: Commands are stripped from your message before the user sees it. The rest of your message is shown normally. You can include multiple commands in one message, but you do not need to use any of them unless it makes sense in context.`,
      `</commands>`,
    );

    conversationCommandsReminder = resolvePromptMacros(commandLines.join("\n"));
  }

  // ── Professor Mari: inject assistant knowledge & commands ──
  const isMariChat = characterIds.includes(PROFESSOR_MARI_ID);
  if (isMariChat) {
    conversationSystemPrompt += "\n\n" + MARI_ASSISTANT_PROMPT;

    // Inject names-only lists so Mari knows what's available (not full data)
    try {
      const allChars = await chars.list();
      const allPersonasList = await chars.listPersonas();
      const allLorebooks = await lorebooksStore.list();
      const allChats = await chats.list();

      const charNames = allChars
        .filter((c: any) => c.id !== PROFESSOR_MARI_ID)
        .map((c: any) => {
          const d = typeof c.data === "string" ? JSON.parse(c.data) : c.data;
          return d.name;
        })
        .filter(Boolean);

      const personaNames = allPersonasList.map((p: any) => p.name).filter(Boolean);
      const lorebookNames = allLorebooks.map((lb: any) => lb.name).filter(Boolean);
      const chatNames = allChats
        .slice(0, 50)
        .map((c: any) => c.name)
        .filter(Boolean);

      const namesSections: string[] = [];
      if (charNames.length > 0)
        namesSections.push(`<available_names type="character">\n${charNames.join(", ")}\n</available_names>`);
      if (personaNames.length > 0)
        namesSections.push(`<available_names type="persona">\n${personaNames.join(", ")}\n</available_names>`);
      if (lorebookNames.length > 0)
        namesSections.push(
          `<available_names type="lorebook">\n${lorebookNames.join(", ")}\n</available_names>`,
        );
      if (chatNames.length > 0)
        namesSections.push(`<available_names type="chat">\n${chatNames.join(", ")}\n</available_names>`);

      if (namesSections.length > 0) {
        conversationSystemPrompt += "\n\n" + namesSections.join("\n\n");
      }
    } catch {
      // Non-critical — continue without name lists
    }

    // Inject previously fetched context from chatMeta.mariContext
    const mariContext = chatMeta.mariContext as Record<string, string> | undefined;
    if (mariContext && Object.keys(mariContext).length > 0) {
      const contextSections: string[] = [];
      for (const [key, value] of Object.entries(mariContext)) {
        contextSections.push(`<fetched_data key="${key}">\n${value}\n</fetched_data>`);
      }
      conversationSystemPrompt +=
        "\n\n<loaded_context>\nThe following items were previously fetched and are available for reference:\n\n" +
        contextSections.join("\n\n") +
        "\n</loaded_context>";
    }
  }

  // Build the context injection (last user-role message before generation)
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dateStr = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
  const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()]!;

  const scheduleLines: string[] = [];
  for (const c of convoCharInfo) {
    if (c.todaySchedule) {
      const prefix =
        convoCharInfo.length > 1
          ? `${c.name}'s schedule today (${dayName}): `
          : `Your schedule today (${dayName}): `;
      scheduleLines.push(prefix + c.todaySchedule);
    }
  }

  // Build status line for the context injection
  const statusLabels: Record<string, string> = {
    online: "online and active",
    idle: "idle / away",
    dnd: "busy / do not disturb",
    offline: "offline",
  };
  const buildCharStatus = (c: { name: string; status: string; activity: string }) => {
    const label = statusLabels[c.status] ?? "online and active";
    return c.activity ? `${label} (${c.activity})` : label;
  };
  const statusLine =
    convoCharInfo.length === 1
      ? buildCharStatus(convoCharInfo[0]!)
      : convoCharInfo.map((c) => `${c.name}: ${buildCharStatus(c)}`).join("; ");

  // Build user status label
  const userStatusLabels: Record<string, string> = {
    active: "active",
    idle: "idle / away from the computer",
    dnd: "do not disturb",
  };
  const userStatusLabel = userStatusLabels[input.userStatus ?? "active"] ?? "active";
  const userActivity = input.userActivity?.replace(/\s+/g, " ").trim().slice(0, 120) ?? "";
  const userStatusLine = userActivity ? `${userStatusLabel} - ${userActivity}` : userStatusLabel;

  // Build @mention line — tells the LLM which characters were directly pinged
  const mentionedNames = (input.mentionedCharacterNames ?? []).filter((n: string) =>
    convoCharInfo.some((c) => c.name.toLowerCase() === n.toLowerCase()),
  );
  let mentionLine: string | null = null;
  if (mentionedNames.length > 0) {
    if (convoCharInfo.length === 1) {
      mentionLine = `${personaName} @mentioned you directly — treat this as an urgent ping that demands your attention even if you are busy or away.`;
    } else {
      mentionLine = `${personaName} @mentioned: ${mentionedNames.join(", ")} — this is an urgent ping directed at ${mentionedNames.length === 1 ? "that person" : "those people"} specifically. The mentioned character(s) should feel compelled to respond promptly even if busy or away.`;
    }
  }

  const latestVisiblePromptTurn = [...finalMessages]
    .reverse()
    .find((message) => message.role === "user" || message.role === "assistant");
  const proactiveTurnLine =
    latestVisiblePromptTurn?.role === "assistant" && !input.userMessage?.trim()
      ? `No new message from ${personaName} was sent in this request; this is a proactive/autonomous turn. Do not write ${personaName}'s side of the conversation.`
      : null;

  const contextBlock = [
    `<context>`,
    `Your current status: ${statusLine}.`,
    `${personaName}'s status: ${userStatusLine}.`,
    ...(proactiveTurnLine ? [proactiveTurnLine] : []),
    ...(mentionLine ? [mentionLine] : []),
    ...scheduleLines,
    `The current time and date: ${timeStr}, ${dateStr}.`,
    ...(isGroup && earlyGroupMode !== "individual"
      ? [`- Remember to prefix messages with \`Name: message\`!`]
      : []),
    `</context>`,
  ].join("\n");

  // ── Cross-chat awareness: show messages from other chats this character is in ──
  // (awarenessBlock is injected later, after persona info)
  const crossChatEnabled = chatMeta.crossChatAwareness !== false; // on by default
  if (crossChatEnabled && !input.regenerateMessageId) {
    const { buildAwarenessBlock } = await import("../conversation/awareness.service.js");
    const charNameMap = new Map<string, string>();
    for (let ci = 0; ci < characterIds.length; ci++) {
      if (convoCharInfo[ci]) charNameMap.set(characterIds[ci]!, convoCharInfo[ci]!.name);
    }
    convoAwarenessBlock = await buildAwarenessBlock(
      db,
      input.chatId,
      characterIds,
      charNameMap,
      personaName,
      input.userMessage ?? "",
    );
  }

  // ── Connected chat context: inject linked roleplay/game details ──
  let connectedChatBlock: string | null = null;
  if (chat.connectedChatId) {
    const connectedChat = await chats.getById(chat.connectedChatId as string);
    if (connectedChat && connectedChat.mode === "roleplay") {
      const rpMeta =
        typeof connectedChat.metadata === "string"
          ? JSON.parse(connectedChat.metadata)
          : (connectedChat.metadata ?? {});
      const rpSummary = (rpMeta.summary as string) ?? null;
      const rpMessages = await chats.listMessages(connectedChat.id);
      const recentRp = rpMessages.slice(-20);

      // Resolve character names for the RP
      const rpCharIds: string[] =
        typeof connectedChat.characterIds === "string"
          ? JSON.parse(connectedChat.characterIds as string)
          : (connectedChat.characterIds as string[]);
      const rpCharNames = new Map<string, string>();
      for (const cid of rpCharIds) {
        const row = await chars.getById(cid);
        if (row) {
          const d = JSON.parse(row.data as string);
          rpCharNames.set(cid, d.name ?? "Unknown");
        }
      }

      const rpLines: string[] = [`<connected_roleplay name="${connectedChat.name}">`];
      if (rpSummary) rpLines.push(`<summary>${rpSummary}</summary>`);
      rpLines.push(`<recent_messages>`);
      for (const m of recentRp) {
        const speaker =
          m.role === "user"
            ? personaName
            : m.characterId
              ? (rpCharNames.get(m.characterId) ?? "Character")
              : "Narrator";
        rpLines.push(`[${speaker}]: ${(m.content as string).slice(0, 500)}`);
      }
      rpLines.push(`</recent_messages>`);
      rpLines.push(`</connected_roleplay>`);

      connectedChatBlock = rpLines.join("\n");

      conversationSystemPrompt +=
        "\n\n" +
        [
          `<connected_roleplay_instructions>`,
          `You have access to context from a connected roleplay: "${connectedChat.name}".`,
          `The summary and recent messages from that roleplay are provided so you can naturally reference or discuss events happening there.`,
          ``,
          `If something said in THIS conversation should affect or influence the roleplay, you can create an influence tag:`,
          `<influence>description of what should happen or change in the roleplay based on this conversation</influence>`,
          `Example: if the user says "tell ${rpCharNames.values().next().value ?? "them"} to meet us at the tavern", you could respond normally AND include:`,
          `<influence>The group discussed meeting at the tavern. ${personaName} wants everyone to head there.</influence>`,
          ``,
          `Influences are injected into the roleplay's context before the next generation. Use them sparingly — only when conversation content genuinely should cross over into the roleplay.`,
          `The influence tag is stripped from your visible message. The rest of your response is shown normally.`,
          ``,
          `If something said in this conversation should durably persist in the roleplay's context across many turns (a fact the character should keep remembering, a promise made, a secret revealed, a name learned), create a note tag instead of an influence:`,
          `<note>fact, decision, or detail the roleplay character should keep remembering</note>`,
          `Notes are shown to the roleplay character on every future turn until the user clears them. Use influences for one-shot mid-scene steering; use notes for things that should remain true going forward. Use notes sparingly — every saved note costs prompt budget on every roleplay turn.`,
          `The note tag is stripped from your visible message.`,
          `</connected_roleplay_instructions>`,
        ].join("\n");
    } else if (connectedChat && connectedChat.mode === "game") {
      const gameMeta =
        typeof connectedChat.metadata === "string"
          ? JSON.parse(connectedChat.metadata)
          : (connectedChat.metadata ?? {});
      const sessionNumber = (gameMeta.gameSessionNumber as number) ?? 1;
      const sessionStatus = (gameMeta.gameSessionStatus as string) ?? "setup";
      const activeState = (gameMeta.gameActiveState as string) ?? "exploration";
      const storedSummaries = Array.isArray(gameMeta.gamePreviousSessionSummaries)
        ? (gameMeta.gamePreviousSessionSummaries as Array<{
            summary?: string;
            resumePoint?: string;
            partyDynamics?: string;
            keyDiscoveries?: string[];
          }>)
        : [];
      const latestSummary = storedSummaries[storedSummaries.length - 1] ?? null;
      const gameMessages = await chats.listMessages(connectedChat.id);
      const recentGame = gameMessages.slice(-20);
      const latestConnectedState =
        (await gameStateStore.getLatestCommitted(connectedChat.id)) ??
        (await gameStateStore.getLatest(connectedChat.id));
      const linkedGameState = latestConnectedState
        ? parseGameStateRow(latestConnectedState as Record<string, unknown>)
        : null;

      const gameLines: string[] = [`<connected_game name="${connectedChat.name}">`];
      gameLines.push(`<status>Session ${sessionNumber} (${sessionStatus}), state: ${activeState}</status>`);
      if (linkedGameState) {
        const sceneDetails = [
          linkedGameState.location ? `Location: ${linkedGameState.location}` : null,
          linkedGameState.time ? `Time: ${linkedGameState.time}` : null,
          linkedGameState.date ? `Date: ${linkedGameState.date}` : null,
          linkedGameState.weather ? `Weather: ${linkedGameState.weather}` : null,
          linkedGameState.temperature ? `Temperature: ${linkedGameState.temperature}` : null,
        ].filter(Boolean);
        if (sceneDetails.length > 0) {
          gameLines.push(`<scene>${sceneDetails.join(" | ")}</scene>`);
        }
        if (linkedGameState.presentCharacters.length > 0) {
          gameLines.push(
            `<present_characters>${linkedGameState.presentCharacters.map((c) => c.name).join(", ")}</present_characters>`,
          );
        }
        if (linkedGameState.recentEvents.length > 0) {
          gameLines.push(`<recent_events>`);
          for (const event of linkedGameState.recentEvents.slice(-5)) {
            gameLines.push(`- ${event.slice(0, 300)}`);
          }
          gameLines.push(`</recent_events>`);
        }
      }
      if (latestSummary?.summary) {
        gameLines.push(`<latest_session_summary>${latestSummary.summary}</latest_session_summary>`);
        if (latestSummary.resumePoint) {
          gameLines.push(`<resume_point>${latestSummary.resumePoint}</resume_point>`);
        }
        if (latestSummary.partyDynamics) {
          gameLines.push(`<party_dynamics>${latestSummary.partyDynamics}</party_dynamics>`);
        }
        if (Array.isArray(latestSummary.keyDiscoveries) && latestSummary.keyDiscoveries.length > 0) {
          gameLines.push(`<key_discoveries>${latestSummary.keyDiscoveries.join("; ")}</key_discoveries>`);
        }
      }
      gameLines.push(`<recent_messages>`);
      for (const m of recentGame) {
        const speaker = m.role === "user" ? personaName : m.role === "narrator" ? "Narrator" : "Game Master";
        const content = sanitizeConnectedGameTranscript(m.content as string);
        if (!content) continue;
        gameLines.push(`[${speaker}]: ${content.slice(0, 500)}`);
      }
      gameLines.push(`</recent_messages>`);
      gameLines.push(`</connected_game>`);

      connectedChatBlock = gameLines.join("\n");

      conversationSystemPrompt +=
        "\n\n" +
        [
          `<connected_game_instructions>`,
          `You have access to context from a connected game: "${connectedChat.name}".`,
          `The current scene, session summary, and recent game messages are provided so you can naturally answer questions or comment on what is happening in that game.`,
          ``,
          `If something said in THIS conversation should affect or influence the game, you can create an influence tag:`,
          `<influence>description of what should happen or change in the game based on this conversation</influence>`,
          `Example: if the group agrees they want to visit the merchant district next, you could respond normally AND include:`,
          `<influence>The group agreed they want to head to the merchant district next and look for supplies.</influence>`,
          ``,
          `Influences are injected into the game's context before the next generation. Use them sparingly — only when conversation content genuinely should cross over into the game.`,
          `The influence tag is stripped from your visible message. The rest of your response is shown normally.`,
          ``,
          `If something said in this conversation should durably persist in the game's context across many turns (an established world fact, an ongoing party dynamic, a recurring NPC trait, a secret the GM should keep remembering), create a note tag instead of an influence:`,
          `<note>fact, decision, or detail the game should keep remembering</note>`,
          `Notes are shown to the game on every future turn until the user clears them. Use influences for one-shot mid-scene steering; use notes for things that should remain true going forward. Use notes sparingly — every saved note costs prompt budget on every game turn.`,
          `The note tag is stripped from your visible message.`,
          `</connected_game_instructions>`,
        ].join("\n");
    }
  }

  // Inject key details from past-day summaries as persistent memory
  if (allKeyDetails.length > 0) {
    // Sort chronologically so the model sees the most recent details last
    allKeyDetails.sort((a, b) => {
      // Parse the first date-like token from each label for ordering
      const extractDate = (s: string) => {
        const m = s.match(/(\d{2}\.\d{2}\.\d{4})/);
        return m ? parseDateKey(m[1]!).getTime() : 0;
      };
      return extractDate(a.label) - extractDate(b.label);
    });
    const memoryLines = [`<important_memories>`, `Things you must remember from past conversations:`];
    for (const { label, details } of allKeyDetails) {
      memoryLines.push(`[${label}]`);
      for (const d of details) memoryLines.push(`- ${d}`);
    }
    memoryLines.push(`</important_memories>`);
    conversationSystemPrompt += "\n\n" + memoryLines.join("\n");
  }

  conversationSystemPrompt = resolvePromptMacros(conversationSystemPrompt);

  finalMessages = [
    { role: "system" as const, content: conversationSystemPrompt },
    ...finalMessages,
    ...(connectedChatBlock ? [{ role: "user" as const, content: connectedChatBlock }] : []),
    { role: "user" as const, content: contextBlock },
  ];

  return { finalMessages, chatMessages, chatMeta, conversationCommandsReminder, earlyExit: false, convoAwarenessBlock };
}
