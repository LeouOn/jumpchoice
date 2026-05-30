import type { ServiceResult } from "./types.js";
import type { ValidatedInput } from "./request-resolver.js";
import {
  parseExtra,
  parseGameStateRow,
  isMessageHiddenFromAI,
  resolveVisibleGameStateAnchor,
  resolveRegenerationGameStateAnchor,
  resolveRegenerationGameStateFallbackMessageIds,
  extractImageAttachmentDataUrls,
  appendReadableAttachmentsToContent,
  shouldPreferLatestVisibleGameState,
  type PromptAttachment,
} from "../../routes/generate/generate-route-utils.js";
import {
  readChatCompletionsReasoningMetadata,
  resolveLorebookGenerationTriggers,
} from "../../routes/generate/prompt.routes.js";
import { buildGenerationPromptPresetCandidates, type PromptPresetCandidateSource } from "../../routes/generate/prompt-preset-selection.js";
import { getLorebookKeeperSettings } from "../../routes/generate/lorebook-keeper-utils.js";
import { applyAllSegmentEdits } from "../game/segment-edits.js";
import { parsePromptPresetChoices } from "./helpers.js";
import { postToDiscordWebhook } from "../discord-webhook.js";
import { logger } from "../../lib/logger.js";

export interface MessageSetupResult {
  allChatMessages: any[];
  chatMessages: any[];
  lorebookKeeperMessages: any[];
  regenMsg: any | undefined;
  mappedMessages: Array<{ role: "user" | "assistant" | "system"; content: string; images?: string[]; providerMetadata?: Record<string, unknown> }>;
  characterIds: string[];
  personaId: string | null;
  personaName: string;
  personaDescription: string;
  personaFields: { personality?: string; scenario?: string; backstory?: string; appearance?: string };
  presetId: string | undefined;
  resolvedPreset: any | null;
  presetSource: PromptPresetCandidateSource | null;
  chatChoices: Record<string, string | string[]>;
  selectedGameStateSnapshotPromise: Promise<any>;
  lorebookGenerationTriggers: any;
  selectedPresetDiffersFromChat: boolean;
  isGoogleProvider: boolean;
  persona: any;
  scopedMessages: any[];
  contextMessageLimit: number | null;
  lorebookKeeperSettings: any;
}

export async function resolveMessagesAndPersona(
  deps: {
    chats: any;
    chars: any;
    presets: any;
    gameStateStore: any;
  },
  input: ValidatedInput,
  chat: any,
  conn: any,
  chatMeta: Record<string, unknown>,
  requestChatMode: string,
  discordWebhookUrl: string,
  pendingUserDiscordMsg: string,
): Promise<ServiceResult<MessageSetupResult>> {
  const { chats, chars, presets, gameStateStore } = deps;

  const allChatMessages = await chats.listMessages(input.chatId);
  const chatMode = requestChatMode;
  const lorebookGenerationTriggers = resolveLorebookGenerationTriggers(input, chatMode);
  const supportsHiddenFromAI =
    chatMode === "conversation" || chatMode === "roleplay" || chatMode === "visual_novel";
  const preferLatestVisibleGameState = shouldPreferLatestVisibleGameState(input);

  let startIdx = 0;
  for (let i = allChatMessages.length - 1; i >= 0; i--) {
    const extra = parseExtra(allChatMessages[i]!.extra);
    if (extra.isConversationStart) {
      startIdx = i;
      break;
    }
  }
  const scopedMessages = startIdx > 0 ? allChatMessages.slice(startIdx) : allChatMessages;
  let chatMessages = supportsHiddenFromAI
    ? scopedMessages.filter((message: any) => !isMessageHiddenFromAI(message))
    : scopedMessages;
  let lorebookKeeperMessages = chatMessages;
  let regenMsg;

  if (input.regenerateMessageId) {
    regenMsg = scopedMessages.find((m: any) => m.id === input.regenerateMessageId);
    if (!regenMsg) {
      return { ok: false, status: 400, error: "Regenerated message not found" };
    }
    chatMessages = chatMessages.filter((m: any) => m.id !== input.regenerateMessageId);
    lorebookKeeperMessages = lorebookKeeperMessages.filter((m: any) => m.id !== input.regenerateMessageId);
  }

  const visibleGameStateAnchor = input.regenerateMessageId
    ? resolveRegenerationGameStateAnchor(scopedMessages, input.regenerateMessageId)
    : resolveVisibleGameStateAnchor(allChatMessages);
  const gameStateGenerationOptions = {
    preferLatestVisible: preferLatestVisibleGameState,
    visibleAnchor: visibleGameStateAnchor,
    excludeMessageId: input.regenerateMessageId ?? null,
    fallbackMessageIds: resolveRegenerationGameStateFallbackMessageIds(scopedMessages, input.regenerateMessageId),
  };
  const selectedGameStateSnapshotPromise = gameStateStore.getForGeneration(
    input.chatId,
    gameStateGenerationOptions,
  );

  const lorebookKeeperSettings = getLorebookKeeperSettings(chatMeta);
  const contextMessageLimit = chatMeta.contextMessageLimit as number | null;
  if (contextMessageLimit && contextMessageLimit > 0 && chatMessages.length > contextMessageLimit) {
    chatMessages = chatMessages.slice(-contextMessageLimit);
  }

  const isGoogleProvider = conn.provider === "google" || conn.provider === "google_vertex";

  const mappedMessages = chatMessages.map((m: any) => {
    const extra = parseExtra(m.extra);
    const attachments = extra.attachments as PromptAttachment[] | undefined;
    const images = extractImageAttachmentDataUrls(attachments);
    const providerMetadata: Record<string, unknown> = {};
    if (isGoogleProvider && m.role === "assistant" && extra.geminiParts) {
      providerMetadata.geminiParts = extra.geminiParts;
    }
    const chatCompletionsReasoning =
      m.role === "assistant" ? readChatCompletionsReasoningMetadata(extra.chatCompletionsReasoning) : undefined;
    if (chatCompletionsReasoning) {
      Object.assign(providerMetadata, chatCompletionsReasoning);
    }
    let content = appendReadableAttachmentsToContent(m.content as string, attachments);
    const userUploadedImages = attachments?.filter((a) => a.type?.startsWith("image/"));
    if (m.role === "assistant" && userUploadedImages?.length) {
      const photoName = userUploadedImages[0]?.filename ?? userUploadedImages[0]?.name;
      content += `\n[Sent a photo${photoName ? `: ${photoName}` : ""}]`;
    }
    return {
      role: m.role === "narrator" ? ("system" as const) : (m.role as "user" | "assistant" | "system"),
      content,
      ...(images?.length ? { images } : {}),
      ...(Object.keys(providerMetadata).length ? { providerMetadata } : {}),
    };
  });

  if (input.attachments?.length && !input.impersonate) {
    const imageAttachments = extractImageAttachmentDataUrls(input.attachments);
    if (imageAttachments.length) {
      for (let i = mappedMessages.length - 1; i >= 0; i--) {
        if (mappedMessages[i]!.role === "user") {
          mappedMessages[i] = { ...mappedMessages[i]!, images: imageAttachments };
          break;
        }
      }
    }
  }

  for (const msg of mappedMessages) {
    msg.content = msg.content.replace(/\n([ \t]*\n){2,}/g, "\n\n");
  }

  const characterIds: string[] = JSON.parse(chat.characterIds as string);

  let personaId: string | null = null;
  let personaName = "User";
  let personaDescription = "";
  let personaFields: { personality?: string; scenario?: string; backstory?: string; appearance?: string } = {};
  const allPersonas = await chars.listPersonas();

  if (chatMode === "game") {
    applyAllSegmentEdits(mappedMessages, chatMeta as Record<string, unknown>, chatMessages);
  }

  const persona =
    (chat.personaId ? allPersonas.find((p: any) => p.id === chat.personaId) : null) ??
    (chatMode !== "game" ? allPersonas.find((p: any) => p.isActive === "true") : null);
  if (persona) {
    personaId = persona.id as string;
    personaName = persona.name;
    personaDescription = persona.description;
    if (persona.altDescriptions) {
      try {
        const altDescs = JSON.parse(persona.altDescriptions as string) as Array<{
          active: boolean;
          content: string;
        }>;
        for (const ext of altDescs) {
          if (ext.active && ext.content) {
            personaDescription += "\n" + ext.content;
          }
        }
      } catch {
        /* ignore malformed JSON */
      }
    }
    personaFields = {
      personality: persona.personality ?? "",
      scenario: persona.scenario ?? "",
      backstory: persona.backstory ?? "",
      appearance: persona.appearance ?? "",
    };
  }

  if (pendingUserDiscordMsg) {
    postToDiscordWebhook(discordWebhookUrl, { content: pendingUserDiscordMsg, username: personaName });
  }

  const chatPromptPresetId = (chat.promptPresetId as string | null) ?? null;
  const presetCandidates = buildGenerationPromptPresetCandidates({
    chatMode,
    chatPromptPresetId,
    connectionPromptPresetId: conn.promptPresetId,
    impersonate: input.impersonate,
    impersonatePromptPresetId: input.impersonatePresetId,
  });
  let presetId: string | undefined;
  let resolvedPreset: Awaited<ReturnType<typeof presets.getById>> | null = null;
  let presetSource: PromptPresetCandidateSource | null = null;
  for (const candidate of presetCandidates) {
    const candidatePreset = await presets.getById(candidate.id);
    if (candidatePreset) {
      presetId = candidate.id;
      resolvedPreset = candidatePreset;
      presetSource = candidate.source;
      break;
    }
    if (candidate.source !== "chat") {
      logger.warn(
        "[generate] %s prompt preset override %s was not found; falling back to the next preset candidate",
        candidate.source,
        candidate.id,
      );
    }
  }
  const selectedPresetDiffersFromChat = !!resolvedPreset && !!presetId && presetId !== chatPromptPresetId;
  const overrideDefaultChoices =
    selectedPresetDiffersFromChat && presetSource !== "chat"
      ? (parsePromptPresetChoices((resolvedPreset as { defaultChoices?: unknown }).defaultChoices) ?? {})
      : null;
  const chatChoices: Record<string, string | string[]> =
    overrideDefaultChoices ?? ((chatMeta.presetChoices ?? {}) as Record<string, string | string[]>);

  return {
    ok: true,
    value: {
      allChatMessages,
      chatMessages,
      lorebookKeeperMessages,
      regenMsg,
      mappedMessages,
      characterIds,
      personaId,
      personaName,
      personaDescription,
      personaFields,
      presetId,
      resolvedPreset,
      presetSource,
      chatChoices,
      selectedGameStateSnapshotPromise,
      lorebookGenerationTriggers,
      selectedPresetDiffersFromChat,
      isGoogleProvider,
      persona,
      scopedMessages,
      contextMessageLimit,
      lorebookKeeperSettings,
    },
  };
}
