import type { LorebookEntryTimingState } from "@jumpchoice/shared";
import { nameToXmlTag, resolveMacros } from "@jumpchoice/shared";
import { processLorebooks } from "../lorebook/index.js";
import { injectAtDepth } from "../lorebook/prompt-injector.js";
import { collectCharacterDepthPromptEntries } from "../prompt/index.js";
import {
  resolveLorebookTokenBudget,
  persistLorebookRuntimeState,
  rememberKnowledgeRouterActivatedLorebookIds,
  packRecalledMemories,
} from "../../routes/generate/prompt.routes.js";
import { stripConversationPromptTimestamps } from "../conversation/transcript-sanitize.js";
import { recallMemories } from "../memory-recall.js";
import { loadSummariesForChat } from "../memory/memory-db.js";
import { filterAndAssembleMemoryContext } from "../memory/memory-interceptor.js";
import { logger } from "../../lib/logger.js";
import { wrapContent } from "../prompt/format-engine.js";
import {
  wrapFields,
  shouldInjectIdentityFallback,
} from "../../routes/generate/generate-route-utils.js";
import { buildGamePrompt } from "./game-prompt-builder.js";

export interface ContextInjectionContext {
  db: any;
  chats: any;
  chars: any;
  agentsStore: any;
  lorebooksStore: any;
  reply: any;
  input: any;
  chat: any;
  chatMeta: Record<string, unknown>;
  chatMessages: any[];
  chatMode: string;
  characterIds: string[];
  personaId: string | null;
  personaName: string;
  personaDescription: string;
  personaFields: Record<string, string | undefined>;
  persona: any;
  conn: any;
  provider: any;
  baseUrl: string;
  abortController: AbortController;
  sendProgress: (phase: string) => void;
  presetId: string | undefined;
  chatContextEmbedding: number[] | null;
  memoryRecallEmbeddingSource: any;
  wrapFormat: "xml" | "markdown" | "none";
  chatActiveLorebookIds: string[];
  gameLorebookScopeExclusions: any;
  lorebookGenerationTriggers: any[];
  presetHandledLorebooks: boolean;
  knowledgeRouterActivationPassCompleted: boolean;
  knowledgeRouterActivatedLorebookEntryIds: Set<string>;
  knowledgeRouterExcludedLorebookEntryIds: Set<string>;
  resolvePromptMacros: (value: string) => any;
  resolvePromptMacrosForLorebook: (value: string) => any;
  toLorebookScanMessages: () => any;
  promptCharacterIds: string[];
  promptMacroContext: any;
  deferCharacterMacros: boolean;
  isSceneChat: boolean;
  mappedMessages: any[];
  scopedMessages: any[];
  isGroupChat: boolean;
  groupChatMode: string;
  groupResponseOrder: string;
  allChatMessages: any[];
  charInfo: any[];
  selectedGameStateForPrompt: () => Promise<any>;
  selectedGameStateSnapshotPromise: Promise<any>;
  convoAwarenessBlock: string | null;
  manualPromptTargetCharId: string | null;
  connectionMaxContext: number | undefined;
  effectiveMaxContext: number | undefined;
  isDebug: boolean;
  requestDebug: boolean;
  debugLog: (message: string, ...args: any[]) => void;
}

export interface ContextInjectionResult {
  finalMessages: any[];
  chatMeta: Record<string, unknown>;
  presetHandledLorebooks: boolean;
  knowledgeRouterActivationPassCompleted: boolean;
}

export async function injectContext(
  ctx: ContextInjectionContext,
  finalMessages: any[],
): Promise<ContextInjectionResult> {
  let chatMeta = ctx.chatMeta;
  const {
    db,
    chats,
    chars,
    agentsStore,
    lorebooksStore,
    reply,
    input,
    chat,
    chatMessages,
    chatMode,
    characterIds,
    personaId,
    personaName,
    personaDescription,
    personaFields,
    persona,
    conn,
    provider,
    baseUrl,
    abortController,
    sendProgress,
    presetId,
    chatContextEmbedding,
    memoryRecallEmbeddingSource,
    wrapFormat,
    chatActiveLorebookIds,
    gameLorebookScopeExclusions,
    lorebookGenerationTriggers,
    presetHandledLorebooks: initialPresetHandledLorebooks,
    knowledgeRouterActivationPassCompleted: initialKnowledgeRouterActivationPassCompleted,
    knowledgeRouterActivatedLorebookEntryIds,
    knowledgeRouterExcludedLorebookEntryIds,
    resolvePromptMacros,
    resolvePromptMacrosForLorebook,
    toLorebookScanMessages,
    promptCharacterIds,
    promptMacroContext,
    deferCharacterMacros,
    isSceneChat,
    mappedMessages,
    scopedMessages,
    isGroupChat,
    groupChatMode,
    groupResponseOrder,
    allChatMessages,
    charInfo,
    selectedGameStateForPrompt,
    selectedGameStateSnapshotPromise,
    convoAwarenessBlock,
    manualPromptTargetCharId,
    connectionMaxContext,
    effectiveMaxContext,
    isDebug,
    requestDebug,
    debugLog,
  } = ctx;

  let presetHandledLorebooks = initialPresetHandledLorebooks;
  let knowledgeRouterActivationPassCompleted = initialKnowledgeRouterActivationPassCompleted;

  // ── Lorebook injection for conversation / roleplay / visual_novel (no preset) ──
  const needsLorebook = !presetId && (chatMode === "conversation" || chatMode === "roleplay" || chatMode === "visual_novel");
  if (needsLorebook) {
    sendProgress("lorebooks");
    const lorebookResult = await processLorebooks(db, toLorebookScanMessages(), null, {
      chatId: input.chatId,
      characterIds,
      personaId,
      activeLorebookIds: chatActiveLorebookIds,
      excludedLorebookIds: gameLorebookScopeExclusions.excludedLorebookIds,
      excludedSourceAgentIds: gameLorebookScopeExclusions.excludedSourceAgentIds,
      tokenBudget: resolveLorebookTokenBudget(chatMeta),
      chatEmbedding: chatContextEmbedding,
      entryStateOverrides:
        (chatMeta.entryStateOverrides as Record<string, { ephemeral?: number | null; enabled?: boolean }>) ??
        undefined,
      entryTimingStates: (chatMeta.entryTimingStates as Record<string, LorebookEntryTimingState>) ?? undefined,
      generationTriggers: lorebookGenerationTriggers,
      resolveContent: resolvePromptMacrosForLorebook,
    });
    rememberKnowledgeRouterActivatedLorebookIds(
      knowledgeRouterActivatedLorebookEntryIds,
      knowledgeRouterExcludedLorebookEntryIds,
      lorebookResult,
    );
    knowledgeRouterActivationPassCompleted = true;

    if (lorebookResult.updatedEntryStateOverrides)
      chatMeta.entryStateOverrides = lorebookResult.updatedEntryStateOverrides;
    if (lorebookResult.updatedEntryTimingStates)
      chatMeta.entryTimingStates = lorebookResult.updatedEntryTimingStates;
    await persistLorebookRuntimeState({
      chats,
      chatId: input.chatId,
      fallbackMeta: chatMeta,
      entryStateOverrides: lorebookResult.updatedEntryStateOverrides,
      entryTimingStates: lorebookResult.updatedEntryTimingStates,
    });
    const loreContent = [lorebookResult.worldInfoBefore, lorebookResult.worldInfoAfter]
      .filter(Boolean)
      .join("\n");
    if (loreContent) {
      const loreBlock = `<lore>\n${loreContent}\n</lore>`;
      const firstUserIdx = finalMessages.findIndex((m) => m.role === "user" || m.role === "assistant");
      const insertAt = firstUserIdx >= 0 ? firstUserIdx : finalMessages.length;
      finalMessages.splice(insertAt, 0, { role: "system" as const, content: loreBlock });
    }
    if (lorebookResult.depthEntries.length > 0) {
      finalMessages = injectAtDepth(finalMessages, lorebookResult.depthEntries);
    }
  }

  if (!presetId && chatMode !== "game") {
    const characterDepthEntries = await collectCharacterDepthPromptEntries(
      db,
      promptCharacterIds,
      promptMacroContext,
    );
    if (characterDepthEntries.length > 0) {
      finalMessages = injectAtDepth(finalMessages, characterDepthEntries);
    }
  }

  // ── Author's Notes injection ──
  const authorNotes = (chatMeta.authorNotes as string | undefined)?.trim();
  if (authorNotes) {
    const authorNotesDepth = (chatMeta.authorNotesDepth as number) ?? 4;
    finalMessages = injectAtDepth(finalMessages, [
      { content: authorNotes, role: "system", depth: authorNotesDepth },
    ]);
  }

  // ── Roleplay/Game: inject pending OOC influences from connected conversation ──
  if ((chatMode === "roleplay" || chatMode === "game") && chat.connectedChatId && !isSceneChat) {
    const pendingInfluences = await chats.listPendingInfluences(input.chatId);
    if (pendingInfluences.length > 0) {
      const influenceLines = pendingInfluences
        .map((inf: any) => stripConversationPromptTimestamps(String(inf.content ?? "")))
        .filter((content: string) => content.length > 0)
        .map((content: string) => `- ${content}`);

      if (influenceLines.length > 0) {
        const influenceBlock = [
          `<ooc_influences>`,
          chatMode === "game"
            ? `The following out-of-character notes come from a connected conversation. They represent things the players discussed or decided outside the game. Use them to steer the next scene, NPC reactions, objectives, or world state when appropriate — don't mention them explicitly as "OOC" in the narrative.`
            : `The following out-of-character notes come from a connected conversation. They represent things the players discussed or decided outside of the roleplay. Weave them naturally into the story — don't mention them explicitly as "OOC" in the narrative.`,
          ...influenceLines,
          `</ooc_influences>`,
        ].join("\n");

        const lastUserIdx = finalMessages.map((m) => m.role).lastIndexOf("user");
        if (lastUserIdx >= 0) {
          finalMessages.splice(lastUserIdx, 0, { role: "system" as const, content: influenceBlock });
        } else {
          finalMessages.push({ role: "system" as const, content: influenceBlock });
        }
      }

      for (const inf of pendingInfluences) {
        await chats.markInfluenceConsumed(inf.id);
      }
    }
  }

  // ── Roleplay/Game: inject durable conversation notes (persist until cleared) ──
  if ((chatMode === "roleplay" || chatMode === "game") && chat.connectedChatId && !isSceneChat) {
    const persistentNotes = await chats.listNotes(input.chatId);
    if (persistentNotes.length > 0) {
      const noteLines = persistentNotes
        .map((n: any) => stripConversationPromptTimestamps(String(n.content ?? "")))
        .filter((content: string) => content.length > 0)
        .map((content: string) => `- ${content}`);

      if (noteLines.length > 0) {
        const noteBlock = [
          `<conversation_notes>`,
          chatMode === "game"
            ? `Durable notes from a connected conversation. These persist across every turn until the user clears them and represent things the players have established as ongoing truth — character knowledge, world facts, recurring dynamics. Use them to inform NPC behavior, world state, and scene framing — don't reference them explicitly as "notes" in the narrative.`
            : `Durable notes from a connected conversation. These persist across every turn until the user clears them and represent things the character has been told to durably remember about themselves, the user, or the world. Use them to inform behavior, knowledge, and reactions naturally — don't reference them explicitly as "notes" in the narrative.`,
          ...noteLines,
          `</conversation_notes>`,
        ].join("\n");

        const lastUserIdx = finalMessages.map((m) => m.role).lastIndexOf("user");
        if (lastUserIdx >= 0) {
          finalMessages.splice(lastUserIdx, 0, { role: "system" as const, content: noteBlock });
        } else {
          finalMessages.push({ role: "system" as const, content: noteBlock });
        }
      }
    }
  }

  if (chatMode === "roleplay" && chat.connectedChatId && !isSceneChat) {
    const convChat = await chats.getById(chat.connectedChatId as string);
    if (convChat && convChat.mode === "conversation") {
      const oocInstruction = [
        `<ooc_instruction>`,
        `You have a connected out-of-character conversation: "${convChat.name}".`,
        `If a character wants to break the fourth wall and comment on something happening in the roleplay, post a reaction, or chat casually with the user "outside" the story, they can use an <ooc> tag:`,
        `<ooc>casual comment or reaction about what just happened in the RP</ooc>`,
        ``,
        `The <ooc> text is stripped from the roleplay response and posted as a message in the conversation chat.`,
        `Use this very sparingly — only when a character would genuinely want to comment out-of-character. Most RP responses should NOT include <ooc> tags.`,
        `</ooc_instruction>`,
      ].join("\n");

      const firstSysIdx = finalMessages.findIndex((m) => m.role === "system");
      if (firstSysIdx >= 0) {
        finalMessages.splice(firstSysIdx + 1, 0, { role: "system" as const, content: oocInstruction });
      } else {
        finalMessages.unshift({ role: "system" as const, content: oocInstruction });
      }
    }
  }

  // ── Fallback: inject character & persona info only when no prompt preset is active ──
  if (shouldInjectIdentityFallback({ chatMode, presetId })) {
    const allContent = finalMessages.map((m) => m.content).join("\n");
    const fallbackCharInfo = manualPromptTargetCharId
      ? charInfo.filter((c) => c.id === manualPromptTargetCharId)
      : charInfo;
    for (const ci of fallbackCharInfo) {
      const xmlTag = nameToXmlTag(ci.name);
      const hasCharInfo =
        (ci.description && allContent.includes(ci.description.split("\n")[0]!.trim().slice(0, 80))) ||
        allContent.includes(`<${xmlTag}>`) ||
        allContent.includes(`<${ci.name}>`) ||
        new RegExp(`^#{1,6} ${ci.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m").test(allContent);
      if (!hasCharInfo && ci.description) {
        const characterMacroContext = {
          ...promptMacroContext,
          char: ci.name,
          characterFields: {
            description: ci.description,
            personality: ci.personality,
            scenario: ci.scenario,
            backstory: ci.backstory,
            appearance: ci.appearance,
            example: ci.mesExample,
            systemPrompt: ci.systemPrompt,
            postHistoryInstructions: ci.postHistoryInstructions,
          },
        };
        const resolveCharacterMacros = (value: string) => resolveMacros(value, characterMacroContext);
        const fieldParts = wrapFields(
          {
            description: resolveCharacterMacros(ci.description),
            personality: resolveCharacterMacros(ci.personality),
            scenario: resolveCharacterMacros(ci.scenario),
            backstory: resolveCharacterMacros(ci.backstory),
            appearance: resolveCharacterMacros(ci.appearance),
            system_prompt: resolveCharacterMacros(ci.systemPrompt),
            example_dialogue: resolveCharacterMacros(ci.mesExample),
            post_history_instructions: resolveCharacterMacros(ci.postHistoryInstructions),
          },
          wrapFormat,
        );
        if (fieldParts.length > 0) {
          const block = wrapContent(fieldParts.join("\n"), ci.name, wrapFormat, 1);
          const firstSysIdx = finalMessages.findIndex((m) => m.role === "system");
          const insertAt = firstSysIdx >= 0 ? firstSysIdx + 1 : 0;
          finalMessages.splice(insertAt, 0, { role: "system", content: block });
        }
      }
    }
    if (personaDescription) {
      const personaXmlTag = nameToXmlTag(personaName);
      const hasPersonaInfo =
        allContent.includes(personaDescription.split("\n")[0]!.trim().slice(0, 80)) ||
        allContent.includes(`<${personaXmlTag}>`) ||
        allContent.includes(`<${personaName}>`) ||
        new RegExp(`^#{1,6} ${personaName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m").test(allContent);
      if (!hasPersonaInfo) {
        const fieldParts = wrapFields(
          {
            description: resolvePromptMacros(personaDescription),
            personality: resolvePromptMacros(personaFields.personality ?? ""),
            backstory: resolvePromptMacros(personaFields.backstory ?? ""),
            appearance: resolvePromptMacros(personaFields.appearance ?? ""),
            scenario: resolvePromptMacros(personaFields.scenario ?? ""),
          },
          wrapFormat,
        );
        if (persona?.personaStats) {
          const pStats =
            typeof persona.personaStats === "string" ? JSON.parse(persona.personaStats) : persona.personaStats;
          if (pStats?.rpgStats?.enabled) {
            const rpg = pStats.rpgStats as {
              attributes: Array<{ name: string; value: number }>;
              hp: { value: number; max: number };
            };
            const rpgLines = [`Max HP: ${rpg.hp.max}`];
            for (const attr of rpg.attributes) {
              rpgLines.push(`${attr.name}: ${attr.value}`);
            }
            fieldParts.push(wrapContent(rpgLines.join("\n"), "rpg_attributes", wrapFormat, 2));
          }
        }
        if (fieldParts.length > 0) {
          const block = wrapContent(fieldParts.join("\n"), personaName, wrapFormat, 1);
          const firstUserIdx = finalMessages.findIndex((m) => m.role === "user" || m.role === "assistant");
          const insertAt = firstUserIdx >= 0 ? firstUserIdx : finalMessages.length;
          finalMessages.splice(insertAt, 0, { role: "system", content: block });
        }
      }
    }
  }

  // ── Scene-specific context injection ──
  if (isSceneChat) {
    const charNames = charInfo.map((c) => c.name);
    const isGroup = charNames.length > 1;

    const roleText = isGroup
      ? [
          `<role>`,
          `You are ${charNames.join(", ")}; real and autonomous people, roleplaying with the user called ${personaName} in a scene.`,
          `</role>`,
        ].join("\n")
      : [
          `<role>`,
          `You are ${charNames[0] ?? "the character"}, a real and autonomous person, roleplaying with the user called ${personaName} in a scene.`,
          `</role>`,
        ].join("\n");

    const sceneScenario = chatMeta.sceneScenario as string | undefined;
    const scenarioText = sceneScenario ? [`<scenario>`, sceneScenario, `</scenario>`].join("\n") : "";

    const sceneConvoCtx = chatMeta.sceneConversationContext as string | undefined;
    const sceneRelHistory = chatMeta.sceneRelationshipHistory as string | undefined;
    const awarenessLines: string[] = [];
    if (sceneRelHistory) {
      awarenessLines.push(`## Relationship History`, sceneRelHistory, ``);
    }
    if (sceneConvoCtx) {
      awarenessLines.push(
        `## Conversation Context`,
        `The following is a transcript of the conversation that led up to this scene:`,
        sceneConvoCtx,
      );
    }
    const awarenessText =
      awarenessLines.length > 0 ? [`<awareness>`, ...awarenessLines, `</awareness>`].join("\n") : "";

    const sceneSystemPrompt = chatMeta.sceneSystemPrompt as string | undefined;
    const sceneSysText = sceneSystemPrompt
      ? [`<scene_instructions>`, sceneSystemPrompt, `</scene_instructions>`].join("\n")
      : "";

    const outputFormatText = [
      `<output_format>`,
      `When you respond in the conversation:`,
      `- Think about it first and internalize your instructions.`,
      `- Continue directly with new content from the final line of the last message. You don't have to address everything from it; this is a creative freeform piece, so prioritize organic flow. Favor characterizations driven by the chat history over the static character descriptions. Explicit content is allowed, no plot armor. Don't play for ${personaName}.`,
      `- The response length should be flexible, based on the current scene. During a conversation between you and the user, you have two options:`,
      `  (1) ONLY respond with a dialogue line plus an optional dialogue tag/action beat, and stop, creating space for a dynamic back-and-forth.`,
      `  (2) Continue into a longer response provided the conversation is concluded, interrupted, includes a longer monologue, or an exchange between multiple NPCs.`,
      `In action, when the user's agency is high, keep it concise (up to 150 words), and leave room for user input. In case you'd like to progress, for instance, in scene transitions, establishing shots, and plot developments, build content (unlimited, above 150 words), but allow the user to react to it. Never end on handover cues; finish naturally.`,
      `- No GPTisms/AI Slop. BAN and NEVER output generic structures (such as "if X, then Y", or "not X, but Y"), and literature clichés (NO: "physical punches," "practiced things," "predatory instincts," "mechanical precisions," or "jaws working"). Combat them with the human touch.`,
      `- Describe what DOES happen, rather than what doesn't (for example, go for "remains still" instead of "doesn't move"). Mention what occurs, or show the consequences of happenings ("the water sits untouched" instead of "isn't being drunk").`,
      `- CRITICAL! Do not repeat, echo, parrot, or restate distinctive words, phrases, and dialogues. When reacting to speech, show interpretation or response, NOT repetition.`,
      `EXAMPLE: "Are you a gooner?"`,
      `BAD: "Gooner?"`,
      `GOOD: A flat look. "What type of question is that?"`,
      `</output_format>`,
    ].join("\n");

    const sceneBlocks = [roleText, awarenessText, scenarioText, sceneSysText, outputFormatText]
      .filter(Boolean)
      .join("\n\n");

    if (sceneBlocks) {
      const firstSysIdx = finalMessages.findIndex((m) => m.role === "system");
      if (firstSysIdx >= 0) {
        finalMessages.splice(firstSysIdx + 1, 0, { role: "system" as const, content: sceneBlocks });
      } else {
        finalMessages.unshift({ role: "system" as const, content: sceneBlocks });
      }
    }
  }

  // ── Game mode: build and inject full GM system prompt ──
  if (chatMode === "game") {
    const gameResult = await buildGamePrompt(
      {
        db, chats, chars,
        chatMeta, chat, input, characterIds, personaName, personaId, chatMode,
        presetHandledLorebooks, selectedGameStateSnapshotPromise,
        selectedGameStateForPrompt, mappedMessages, chatContextEmbedding,
        chatActiveLorebookIds, gameLorebookScopeExclusions,
        lorebookGenerationTriggers, resolvePromptMacros, resolvePromptMacrosForLorebook,
        sendProgress, toLorebookScanMessages,
        isDebug, requestDebug, debugLog,
        knowledgeRouterActivatedLorebookEntryIds,
        knowledgeRouterExcludedLorebookEntryIds,
      },
      finalMessages,
    );
    finalMessages = gameResult.finalMessages;
    chatMeta = gameResult.chatMeta;
    presetHandledLorebooks = gameResult.presetHandledLorebooks;
    knowledgeRouterActivationPassCompleted = true;
  }

  // ── Inject character memories into awareness ──
  // Characters can create "memories" targeting other characters.
  // These appear in the awareness context and are cleaned up after the day ends.
  let awarenessBlock = convoAwarenessBlock;
  if (chatMode === "conversation") {
    const memoryLines: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const cid of characterIds) {
      const charRow = await chars.getById(cid);
      if (!charRow) continue;
      const charData = JSON.parse(charRow.data as string);
      const memories: Array<{ from: string; fromCharId: string; summary: string; createdAt: string }> =
        charData.extensions?.characterMemories ?? [];
      if (memories.length === 0) continue;

      const validMemories = memories.filter((m) => new Date(m.createdAt) >= today);

      if (validMemories.length !== memories.length) {
        const extensions = { ...(charData.extensions ?? {}), characterMemories: validMemories };
        await chars.update(cid, { extensions } as any);
      }

      for (const mem of validMemories) {
        memoryLines.push(`Memory from ${mem.from}: ${mem.summary}`);
      }
    }

    if (memoryLines.length > 0) {
      const memoriesSection = `\n\n## Memories\n${memoryLines.join("\n")}`;
      if (awarenessBlock) {
        awarenessBlock = awarenessBlock.replace(/<\/awareness>$/, memoriesSection + "\n</awareness>");
      } else {
        awarenessBlock = `<awareness>\n${memoriesSection.trimStart()}\n</awareness>`;
      }
    }
  }

  // ── Inject cross-chat awareness (after persona info so it appears right before chat history) ──
  if (awarenessBlock) {
    const firstUserIdx = finalMessages.findIndex((m) => m.role === "user" || m.role === "assistant");
    const insertAt = firstUserIdx >= 0 ? firstUserIdx : finalMessages.length;
    finalMessages.splice(insertAt, 0, { role: "system", content: awarenessBlock });
  }

  // ── Memory Tier 2: Filter archived messages and inject summaries ──
  if (chatMeta.memoryTier2Enabled !== false) {
    try {
      const tier2Result = await filterAndAssembleMemoryContext({
        messages: mappedMessages.map((m: any) => ({
          id: m.id ?? "",
          role: m.role,
          content: typeof m.content === "string" ? m.content : "",
          createdAt: m.createdAt ?? "",
        })),
        metadata: chatMeta,
        loadSummaries: async () => loadSummariesForChat(db, input.chatId),
        chatId: input.chatId,
        maxContextTokens: effectiveMaxContext ?? connectionMaxContext,
      });

      if (tier2Result.memoryBlock) {
        const firstUserIdx = finalMessages.findIndex((m: any) => m.role === "user" || m.role === "assistant");
        const insertAt = firstUserIdx >= 0 ? firstUserIdx : finalMessages.length;
        finalMessages.splice(insertAt, 0, {
          role: "system" as const,
          content: tier2Result.memoryBlock,
        });
        logger.debug(
          "[memory-tier2] Injected %d summaries, %d working/%d archived messages",
          tier2Result.stats.summaryCount,
          tier2Result.stats.workingCount,
          tier2Result.stats.archivedCount,
        );
      }
    } catch (err) {
      logger.error(err, "[memory-tier2] Interceptor failed, skipping");
    }
  }

  // ── Memory recall: semantic retrieval of relevant past conversation fragments ──
  const memoryRecallDefault = chatMode === "conversation" || isSceneChat;
  const enableMemoryRecall =
    chatMeta.enableMemoryRecall !== undefined ? chatMeta.enableMemoryRecall === true : memoryRecallDefault;
  if (enableMemoryRecall) {
    sendProgress("memory_recall");
    const _tRecall = Date.now();
    try {
      const lastUserMsg = [...mappedMessages].reverse().find((m) => m.role === "user");
      if (lastUserMsg?.content?.trim()) {
        const recalled = await recallMemories(db, lastUserMsg.content, [input.chatId], {
          embeddingSource: memoryRecallEmbeddingSource,
        });
        if (recalled.length > 0) {
          const packedRecall = packRecalledMemories(recalled, effectiveMaxContext ?? connectionMaxContext);
          if (packedRecall.lines.length === 0) {
            logger.debug(
              "[memory-recall] Skipped recalled memories after budgeting (%d candidates)",
              recalled.length,
            );
          } else {
            const memoriesBlock = [
              `<memories>`,
              `The following are recalled fragments from earlier in this conversation. Use them to maintain continuity, remember past events, and stay in character — but do not explicitly reference "remembering" unless it's natural.`,
              ...packedRecall.lines.map((line, i) => `--- Memory ${i + 1} ---\n${line}`),
              `</memories>`,
            ].join("\n");

            logger.debug(
              "[memory-recall] Injecting %d/%d recalled memories (~%d/%d tokens)%s",
              packedRecall.lines.length,
              recalled.length,
              packedRecall.estimatedTokens,
              packedRecall.budgetTokens,
              packedRecall.trimmed ? " after trimming" : "",
            );

            const firstUserIdx = finalMessages.findIndex((m) => m.role === "user" || m.role === "assistant");
            const insertAt = firstUserIdx >= 0 ? firstUserIdx : finalMessages.length;
            finalMessages.splice(insertAt, 0, { role: "system" as const, content: memoriesBlock });
          }
        }
      }
    } catch (err) {
      logger.error(err, "[memory-recall] Recall failed, skipping");
    }
    logger.debug(`[timing] Memory recall: ${Date.now() - _tRecall}ms`);
  }

  return {
    finalMessages,
    chatMeta,
    presetHandledLorebooks,
    knowledgeRouterActivationPassCompleted,
  };
}
