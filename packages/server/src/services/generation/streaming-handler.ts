import {
  resolveDeferredCharacterMacros,
  hasDeferredCharacterMacros,
} from "@jumpchoice/shared";
import type {
  GameMap,
} from "@jumpchoice/shared";
import type {
  CharacterCommand,
} from "../conversation/character-commands.js";
import { extractLeadingThinkingBlocks } from "../llm/inline-thinking.js";
import {
  fitMessagesToContext,
  type ChatMessage,
  type LLMUsage,
} from "../llm/base-provider.js";
import { executeToolCalls } from "../tools/tool-executor.js";
import {
  parseCharacterCommands,
  parseDirectMessageCommands,
} from "../conversation/character-commands.js";
import { stripConversationPromptTimestamps } from "../conversation/transcript-sanitize.js";
import {
  parseExtra,
} from "../../routes/generate/generate-route-utils.js";
import {
  readChatCompletionsReasoningMetadata,
  isStandaloneCharacterProfileBlock,
} from "../../routes/generate/prompt.routes.js";
import {
  normalizeAgentMaxTokens,
  applyProviderMaxTokensOverride,
} from "../../routes/generate/agents.routes.js";
import { mergeAdjacentMessages } from "../prompt/merger.js";
import { sendSseEvent, trySendSseEvent } from "../../routes/generate/sse.js";
import { logger } from "../../lib/logger.js";
import { postToDiscordWebhook } from "../discord-webhook.js";
import { buildImpersonateInstruction } from "../conversation/impersonate-prompt.js";
import { NarrativeContext } from "../narrative/narrative-context.service.js";
import { DATA_DIR } from "../../utils/data-dir.js";
import {
  trimIncompleteModelEnding,
  getVisibleCompletionTokens,
} from "./helpers.js";
import { buildGenerationReplay } from "../../routes/generate/generation-replay.js";
import {
  applyMapUpdateCommand,
  parseMapUpdateCommands,
  withActiveGameMapMeta,
} from "../game/map-position.service.js";
import { recordAssistantActivity } from "../conversation/autonomous.service.js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface StreamingHandlerContext {
  db: any;
  app: any;
  chats: any;
  chars: any;
  gameStateStore: any;
  agentsStore: any;
  reply: any;
  input: any;
  chat: any;
  chatMeta: Record<string, unknown>;
  chatMessages: any[];
  chatMode: string;
  characterIds: string[];
  charInfo: any[];
  personaName: string;
  personaDescription: string;
  personaFields: Record<string, string | undefined>;
  conn: any;
  provider: any;
  abortController: AbortController;
  isDebug: boolean;
  requestDebug: boolean;
  debugLog: (message: string, ...args: any[]) => void;
  discordWebhookUrl: string | null;
  encryptedReasoningCache: Map<string, unknown[]>;
  temperature: number;
  maxTokens: number;
  topP: number | undefined;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  showThoughts: boolean;
  enableThinking: boolean;
  resolvedEffort: any;
  reasoningEffort: any;
  verbosity: any;
  assistantPrefill: string;
  customParameters: Record<string, unknown>;
  effectiveMaxContext: number | undefined;
  connectionMaxContext: number | undefined;
  resolvedAgents: any[];
  toolDefs: any[];
  chatResolvedToolNames: Set<string>;
  contextInjections: any[];
  wrapFormat: "xml" | "markdown" | "none";
  conversationCommandsEnabled: boolean;
  roleplayDmCommandsEnabled: boolean;
  isGroupChat: boolean;
  groupChatMode: string;
  groupResponseOrder: string;
  deferCharacterMacros: boolean;
  characterMacroProfilesById: Map<string, any>;
  baseGameStateSnapshot: any;
  responseOrchestratorSelectorAgent: any;
  responseOrchestratorSelectorUnavailable: boolean;
  sendProgress: (phase: string) => void;
  enableChatTools: boolean;
  baseToolExecutionContext: any;
  resolveGameDiscordSpeakerName: () => Promise<string>;
  regenMsg: any;
}

export interface StreamingResult {
  firstSavedMsg: any;
  lastSavedMsg: any;
  allResponses: string[];
  collectedCommands: any[];
  collectedOocMessages: string[];
  fullResponse: string;
  fullThinking: string;
  providerThinking: string;
  generationComplete: boolean;
  conversationAssistantSaved: boolean;
  chatMeta: Record<string, unknown>;
}

export async function runStreamingGeneration(
  ctx: StreamingHandlerContext,
  finalMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
    images?: string[];
    providerMetadata?: Record<string, unknown>;
  }>,
  generationGuideInstruction: string | null,
  followUpIteration: number,
  existingFirstSavedMsg: any,
  existingCollectedCommands: any[],
  existingCollectedOocMessages: string[],
  generationComplete: boolean,
  conversationAssistantSaved: boolean,
): Promise<StreamingResult | null> {
  const {
    db, app, chats, chars, gameStateStore, agentsStore,
    reply, input, chat, chatMessages, chatMode,
    characterIds, charInfo, personaName, personaDescription, personaFields,
    conn, provider, abortController, isDebug, requestDebug, debugLog,
    discordWebhookUrl, encryptedReasoningCache,
    temperature, maxTokens, topP, topK, frequencyPenalty, presencePenalty,
    showThoughts, enableThinking, resolvedEffort, reasoningEffort,
    verbosity, assistantPrefill, customParameters, effectiveMaxContext,
    connectionMaxContext,
    resolvedAgents, toolDefs, chatResolvedToolNames, contextInjections,
    wrapFormat, conversationCommandsEnabled, roleplayDmCommandsEnabled,
    isGroupChat, groupChatMode, groupResponseOrder, deferCharacterMacros,
    characterMacroProfilesById, baseGameStateSnapshot,
    responseOrchestratorSelectorAgent, responseOrchestratorSelectorUnavailable,
    sendProgress,
    enableChatTools,
    baseToolExecutionContext,
    resolveGameDiscordSpeakerName,
    regenMsg,
  } = ctx;
  let chatMeta = ctx.chatMeta as Record<string, unknown>;
  let firstSavedMsg = existingFirstSavedMsg;
  const collectedCommands = existingCollectedCommands;
  const collectedOocMessages = existingCollectedOocMessages;
  let lastSavedMsg: any = null;
  let fullResponse = "";
  let fullThinking = "";
  let providerThinking = "";
  let allResponses: string[] = [];

  // ── Main Generation Tool Configuration ──
  // Tool definitions (toolDefs) and custom tool metadata (customToolDefs)
  // were already resolved earlier for the agent pipeline and are reused here.

  // ── Impersonate: inject instruction to respond as the user's character ──
  // Only on the user's actual turn (iteration 0). A Mari follow-up pass
  // is a continuation of the assistant's prior message, not a new user
  // turn, so re-injecting impersonate/prefill would scramble the prompt.
  if (input.impersonate && followUpIteration === 0) {
    const impersonateInstruction = buildImpersonateInstruction({
      customPrompt: input.impersonatePromptTemplate || chatMeta.impersonatePrompt,
      direction: input.userMessage,
      personaName,
      personaDescription,
    });
    finalMessages.push({ role: "user", content: impersonateInstruction });
  }

  if (assistantPrefill.trim() && followUpIteration === 0) {
    finalMessages.push({ role: "assistant", content: assistantPrefill });
    logger.debug(
      "[generate] Injected assistant prefill (%d chars) as final assistant message",
      assistantPrefill.length,
    );
  }


  const onThinking = (chunk: string) => {
    providerThinking += chunk;
    if (showThoughts) {
      fullThinking += chunk;
      trySendSseEvent(reply, { type: "thinking", data: chunk });
    }
  };
  const captureReasoning = chatMode === "roleplay" && showThoughts;

  // Helper: write text content progressively as small SSE token chunks
  const writeContentChunked = (text: string) => {
    const CHUNK_SIZE = 6;
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      const chunk = text.slice(i, i + CHUNK_SIZE);
      fullResponse += chunk;
      trySendSseEvent(reply, { type: "token", data: chunk });
    }
  };

  const resolveMessageSpeakerName = (message: any): string => {
    if (message.role === "user") return personaName;
    if (message.characterId) return charInfo.find((c) => c.id === message.characterId)?.name ?? "Character";
    return chatMode === "conversation" ? "another group member" : "the narrator";
  };

  const latestVisibleSenderOtherThan = (targetCharId: string): string | null => {
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      const message = chatMessages[i]!;
      if (message.role !== "user" && message.role !== "assistant") continue;
      if (message.role === "assistant" && message.characterId === targetCharId) continue;
      return resolveMessageSpeakerName(message);
    }
    return null;
  };

  const findLastAssistantCharacterId = (): string | null => {
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      const message = chatMessages[i]!;
      if (message.role === "assistant" && typeof message.characterId === "string" && message.characterId) {
        return message.characterId;
      }
    }
    return null;
  };

  const fallbackSmartGroupResponders = (): string[] => {
    const lastAssistantCharId = findLastAssistantCharacterId();
    if (!lastAssistantCharId || !characterIds.includes(lastAssistantCharId)) {
      return characterIds[0] ? [characterIds[0]] : [];
    }

    const lastIndex = characterIds.indexOf(lastAssistantCharId);
    for (let offset = 1; offset <= characterIds.length; offset++) {
      const candidate = characterIds[(lastIndex + offset) % characterIds.length];
      if (candidate && candidate !== lastAssistantCharId) return [candidate];
    }

    return characterIds[0] ? [characterIds[0]] : [];
  };

  const getExplicitlyMentionedCharacterIds = (): string[] => {
    const latestUserText =
      typeof input.userMessage === "string" && input.userMessage.trim()
        ? input.userMessage
        : String([...chatMessages].reverse().find((message: any) => message.role === "user")?.content ?? "");
    const requestedNames = new Set(
      (input.mentionedCharacterNames ?? []).map((name: string) => name.toLowerCase()),
    );

    return charInfo
      .filter((character) => {
        if (requestedNames.has(character.name.toLowerCase())) return true;
        const escaped = character.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`@${escaped}\\b`, "i").test(latestUserText);
      })
      .map((character) => character.id);
  };

  const parseSmartGroupSelectionIds = (raw: string): string[] => {
    const cleaned = raw
      .trim()
      .replace(/```(?:json)?\s*/gi, "")
      .replace(/```/g, "");
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first < 0 || last < first) return [];

    const parsed = JSON.parse(cleaned.slice(first, last + 1)) as Record<string, unknown>;
    const rawIds = Array.isArray(parsed.characterIds)
      ? parsed.characterIds
      : Array.isArray(parsed.characters)
        ? parsed.characters
        : [];
    const validIds = new Set(characterIds);
    const selected: string[] = [];

    for (const rawId of rawIds) {
      const id = String(rawId);
      if (validIds.has(id) && !selected.includes(id)) selected.push(id);
    }

    return selected;
  };

  const selectSmartGroupResponders = async (): Promise<string[]> => {
    const explicitMentionIds = getExplicitlyMentionedCharacterIds();
    if (explicitMentionIds.length > 0) return explicitMentionIds;
    if (responseOrchestratorSelectorUnavailable) return fallbackSmartGroupResponders();

    const recentTranscript = chatMessages
      .slice(-16)
      .filter((message: any) => message.role === "user" || message.role === "assistant")
      .map((message: any) => {
        const speaker = resolveMessageSpeakerName(message);
        const content = stripConversationPromptTimestamps(String(message.content ?? ""))
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 900);
        return `${speaker}: ${content}`;
      })
      .filter(Boolean)
      .join("\n");

    const candidates = charInfo
      .map((character) =>
        [
          `- id: ${character.id}`,
          `  name: ${character.name}`,
          `  talkativeness: ${Math.round(character.talkativeness * 100)}%`,
          character.personality ? `  personality: ${character.personality.slice(0, 500)}` : null,
          character.description ? `  description: ${character.description.slice(0, 500)}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n");

    const selectionPrompt: ChatMessage[] = [
      {
        role: "system",
        content: [
          `You are a hidden response orchestrator for a roleplay group chat.`,
          `Choose which character or characters should respond next, based on the latest user message, recent scene context, relevance, personality, and who has spoken recently.`,
          `Usually choose exactly one character. Choose multiple only when multiple characters have a strong immediate reason to answer.`,
          `Do not always choose the first character. Avoid making the same character speak twice in a row unless the context clearly calls for it.`,
          `Return ONLY valid JSON with this schema: {"characterIds":["id"],"reason":"short explanation"}.`,
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `<persona>${personaName}</persona>`,
          `<candidates>`,
          candidates,
          `</candidates>`,
          `<recent_transcript>`,
          recentTranscript || "No recent transcript.",
          `</recent_transcript>`,
        ].join("\n"),
      },
    ];

    try {
      const orchestratorAgent =
        responseOrchestratorSelectorAgent ??
        resolvedAgents.find((agent) => agent.type === "response-orchestrator");
      const selectorProvider = orchestratorAgent?.provider ?? provider;
      const selectorModel = orchestratorAgent?.model ?? conn.model;
      const selectorTemperature =
        typeof orchestratorAgent?.settings.temperature === "number"
          ? orchestratorAgent.settings.temperature
          : 0.2;
      const selectorMaxTokens = applyProviderMaxTokensOverride(
        selectorProvider,
        normalizeAgentMaxTokens(orchestratorAgent?.settings?.maxTokens),
      );

      const result = await selectorProvider.chatComplete(selectionPrompt, {
        model: selectorModel,
        temperature: selectorTemperature,
        maxTokens: selectorMaxTokens,
        maxContext: effectiveMaxContext,
        topP: 1,
        stream: false,
        signal: abortController.signal,
      });
      const selectedIds = parseSmartGroupSelectionIds(result.content ?? "");
      if (selectedIds.length > 0) {
        logger.debug(
          "[group-smart] selected responders for chat %s: %s",
          input.chatId,
          selectedIds.map((id) => charInfo.find((character) => character.id === id)?.name ?? id).join(", "),
        );
        return selectedIds;
      }
      logger.warn(
        { chatId: input.chatId, raw: (result.content ?? "").slice(0, 500) },
        "[group-smart] Selector returned no valid character IDs",
      );
    } catch (error) {
      if (abortController.signal.aborted) return [];
      logger.warn({ err: error, chatId: input.chatId }, "[group-smart] Selector failed, using fallback");
    }

    return fallbackSmartGroupResponders();
  };

  // ── Determine characters to generate for ──
  // Individual group mode: each character responds separately
  // Merged/single: one generation for the first (or mentioned) character
  const useIndividualLoop = isGroupChat && groupChatMode === "individual" && !input.regenerateMessageId; // regeneration always targets one message
  const regenGroupChatIndividual = isGroupChat && groupChatMode === "individual" && input.regenerateMessageId;
  const mentionedConversationCharacters =
    chatMode === "conversation" && isGroupChat && !input.impersonate
      ? charInfo.filter((character) =>
          (input.mentionedCharacterNames ?? []).some(
            (name: string) => name.toLowerCase() === character.name.toLowerCase(),
          ),
        )
      : [];

  // Manual mode with forCharacterId: only generate for the specified character
  // Sequential/smart: all characters respond
  const respondingCharIds = useIndividualLoop
    ? input.forCharacterId && characterIds.includes(input.forCharacterId)
      ? [input.forCharacterId]
      : groupResponseOrder === "manual"
        ? [] // manual mode without forCharacterId: no auto-generation
        : groupResponseOrder === "sequential"
          ? [...characterIds]
          : await selectSmartGroupResponders()
    : [characterIds[0] ?? null];

  /** Generate a single response for a given character and save it. */
  const generateForCharacter = async (
    targetCharId: string | null,
    messagesForGen: Array<{
      role: "system" | "user" | "assistant";
      content: string;
      contextKind?: "prompt" | "history" | "injection";
      images?: string[];
      providerMetadata?: Record<string, unknown>;
    }>,
    markGenerationCommitted = false,
  ): Promise<{
    savedMsg: Awaited<ReturnType<typeof chats.createMessage>>;
    response: string;
    commands: CharacterCommand[];
    oocMessages: string[];
    characterId: string | null;
  } | null> => {
    const targetCharacterProfile =
      deferCharacterMacros && targetCharId ? characterMacroProfilesById.get(targetCharId) : undefined;
    const preparedMessagesForGen = messagesForGen.map((message) => ({
      ...message,
      content: (targetCharacterProfile
        ? resolveDeferredCharacterMacros(message.content, targetCharacterProfile)
        : message.content
      ).replace(/\n([ \t]*\n){2,}/g, "\n\n"),
    }));
    if (
      deferCharacterMacros &&
      preparedMessagesForGen.some((message) => hasDeferredCharacterMacros(message.content))
    ) {
      logger.error(
        { chatId: input.chatId, targetCharId },
        "[generate] Deferred character macro placeholder remained before provider request",
      );
      sendSseEvent(reply, { type: "error", data: "Prompt preparation failed before generation" });
      return null;
    }

    const toProviderMessages = (
      promptMessages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
        contextKind?: "prompt" | "history" | "injection";
        images?: string[];
        providerMetadata?: Record<string, unknown>;
      }>,
    ): ChatMessage[] =>
      promptMessages.map((message) => ({
        role: message.role,
        content: message.content,
        ...(message.contextKind ? { contextKind: message.contextKind } : {}),
        ...(message.images?.length ? { images: message.images } : {}),
        ...(message.providerMetadata ? { providerMetadata: message.providerMetadata } : {}),
      }));

    const prepareProviderMessages = (messages: ChatMessage[]): ChatMessage[] => {
      // Convert mid-prompt system messages to user role after context fitting.
      // This keeps prompt/injection system blocks protected while trimming history,
      // then preserves provider alternation rules for the actual request.
      let pastLeadingSystem = false;
      const converted = messages.map((m) => {
        if (!pastLeadingSystem) {
          if (m.role !== "system") pastLeadingSystem = true;
          return m;
        }
        if (m.role === "system") return { ...m, role: "user" as const };
        return m;
      });
      return mergeAdjacentMessages(converted as any) as ChatMessage[];
    };

    let finalPromptSent: ChatMessage[] = [];
    let effectiveMaxTokensForSend = maxTokens;
    const fitPromptForSend = (candidateMessages: ChatMessage[]): ChatMessage[] => {
      const fit = fitMessagesToContext(
        candidateMessages,
        { maxContext: effectiveMaxContext, maxTokens, tools: toolDefs },
        connectionMaxContext,
      );
      finalPromptSent = fit.messages;
      effectiveMaxTokensForSend = fit.maxTokens ?? maxTokens;
      return fit.messages;
    };

    const initialProviderMessages = prepareProviderMessages(
      fitPromptForSend(toProviderMessages(preparedMessagesForGen)),
    );
    finalPromptSent = initialProviderMessages;

    // Reset per-character accumulators
    fullResponse = "";
    fullThinking = "";
    providerThinking = "";
    let geminiResponseParts: unknown[] | null = null;
    let chatCompletionsReasoning: Record<string, unknown> | null = null;
    const rememberChatCompletionsReasoning = (metadata: Record<string, unknown>) => {
      chatCompletionsReasoning = readChatCompletionsReasoningMetadata(metadata) ?? metadata;
    };

    // Track timing and usage
    const genStartTime = Date.now();
    let usage: LLMUsage | undefined;
    let finishReason: string | undefined;

    // ── SSE keepalive: send periodic comments to prevent proxy timeouts ──
    // Reasoning models (e.g. GPT-5.4 with xhigh effort) may spend a long time
    // thinking before the first token arrives. Cloudflare and other reverse
    // proxies often kill idle connections after ~100s. Sending SSE comments
    // (`: keepalive`) keeps the connection alive without affecting the client.
    const keepaliveTimer = setInterval(() => {
      try {
        if (!reply.raw.destroyed) {
          reply.raw.write(": keepalive\n\n");
        }
      } catch {
        // Connection already closed — ignore
      }
    }, 15_000);

    try {
      // ── LOG_LEVEL=debug or Settings -> Advanced -> Debug mode: log full prompt to server console ──
      if (isDebug || requestDebug) {
        const effModel = conn.model.toLowerCase();
        const tempSuppressed =
          (conn.provider === "openai" || conn.provider === "openrouter") &&
          (/^(o1|o3|o4)/.test(effModel) || (effModel.startsWith("gpt-5") && !!resolvedEffort));
        const effTemp = tempSuppressed ? "N/A" : temperature;
        const effTopP = tempSuppressed ? "N/A" : topP;

        debugLog(
          "\n[debug] Prompt sent to model (%d messages):\n  Model: %s (%s)  Temp: %s  MaxTokens: %s  MaxContext: %s  TopP: %s  TopK: %s  EnableThinking: %s  ShowThoughts: %s  Effort: %s  Verbosity: %s  Stream: %s",
          initialProviderMessages.length,
          conn.model,
          conn.provider,
          effTemp,
          effectiveMaxTokensForSend,
          effectiveMaxContext ?? connectionMaxContext ?? "default",
          effTopP,
          topK || "default",
          enableThinking,
          showThoughts,
          resolvedEffort ?? "none",
          verbosity ?? "default",
          input.streaming,
        );
        for (const m of initialProviderMessages) {
          debugLog("  [%s] %s", m.role.toUpperCase(), m.content);
        }
      }

      if (enableChatTools && provider.chatComplete) {
        const MAX_TOOL_ROUNDS = 5;
        let loopMessages: ChatMessage[] = initialProviderMessages;
        // ── Seed encrypted reasoning cache from DB ──
        // OpenAI Responses API uses encrypted reasoning items for multi-turn continuity.
        // These must be replayed on each request. If the in-memory cache was lost (e.g. server
        // restart), recover from the last assistant message's persisted extra.
        // On regens/swipes: clear the cache so we re-derive from the filtered chatMessages
        // (which excludes the message being regenerated). Otherwise we'd replay the reasoning
        // from the discarded response instead of the turn before it.
        if (input.regenerateMessageId) {
          encryptedReasoningCache.delete(input.chatId);
        }
        if (!encryptedReasoningCache.has(input.chatId)) {
          for (let i = chatMessages.length - 1; i >= 0; i--) {
            const msg = chatMessages[i]!;
            if (msg.role === "assistant") {
              const ex = parseExtra(msg.extra);
              if (Array.isArray(ex.encryptedReasoning) && ex.encryptedReasoning.length > 0) {
                encryptedReasoningCache.set(input.chatId, ex.encryptedReasoning);
              }
              break;
            }
          }
        }

        // Stream tokens in real-time via onToken callback.
        // Some providers (e.g. Gemini with thinking) return the entire response
        // in one chunk. Break large chunks into small pieces so the client sees
        // progressive streaming instead of the whole message appearing at once.
        const STREAM_CHUNK = 6;
        const onToken = (chunk: string) => {
          // If the request has been aborted, skip emitting any further tokens.
          if (abortController.signal.aborted) {
            return;
          }
          fullResponse += chunk;
          if (chunk.length <= STREAM_CHUNK) {
            reply.raw.write(`data: ${JSON.stringify({ type: "token", data: chunk })}\n\n`);
          } else {
            for (let i = 0; i < chunk.length; i += STREAM_CHUNK) {
              reply.raw.write(
                `data: ${JSON.stringify({ type: "token", data: chunk.slice(i, i + STREAM_CHUNK) })}\n\n`,
              );
            }
          }
        };

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          // Treat abort as a silent cancellation: stop the pipeline immediately.
          if (abortController.signal.aborted) {
            return null;
          }

          let result;
          try {
            loopMessages = fitPromptForSend(loopMessages);
            result = await provider.chatComplete(loopMessages, {
              model: conn.model,
              temperature,
              maxTokens: effectiveMaxTokensForSend,
              maxContext: effectiveMaxContext,
              topP,
              topK: topK || undefined,
              frequencyPenalty: frequencyPenalty || undefined,
              presencePenalty: presencePenalty || undefined,
              tools: toolDefs,
              enableCaching: conn.enableCaching === "true",
              cachingAtDepth: conn.cachingAtDepth ?? 5,
              enableThinking,
              captureReasoning,
              reasoningEffort: resolvedEffort ?? undefined,
              verbosity: verbosity ?? undefined,
              customParameters,
              onThinking,
              onToken: input.streaming ? onToken : undefined,
              openrouterProvider: conn.openrouterProvider ?? undefined,
              signal: abortController.signal,
              encryptedReasoningItems: encryptedReasoningCache.get(input.chatId),
              onEncryptedReasoning: (items: unknown[]) => encryptedReasoningCache.set(input.chatId, items),
              onChatCompletionsReasoning: rememberChatCompletionsReasoning,
            });
          } catch (err: any) {
            // If the error was caused by an abort, cancel silently and skip post-processing.
            if (abortController.signal.aborted || (err && err.name === "AbortError")) {
              return null;
            }
            throw err;
          }

          // If abort was triggered during chat completion, exit before using the result.
          if (abortController.signal.aborted) {
            return null;
          }

          // If provider doesn't support onToken (fell back to non-streaming),
          // write the content conventionally
          if (result.content && !fullResponse.endsWith(result.content)) {
            writeContentChunked(result.content);
          }

          // Accumulate usage across tool rounds
          if (result.usage) {
            if (!usage) {
              usage = { ...result.usage };
            } else {
              usage.promptTokens += result.usage.promptTokens;
              usage.completionTokens += result.usage.completionTokens;
              usage.totalTokens += result.usage.totalTokens;
              if (result.usage.cachedPromptTokens != null) {
                usage.cachedPromptTokens = (usage.cachedPromptTokens ?? 0) + result.usage.cachedPromptTokens;
              }
              if (result.usage.cacheWritePromptTokens != null) {
                usage.cacheWritePromptTokens =
                  (usage.cacheWritePromptTokens ?? 0) + result.usage.cacheWritePromptTokens;
              }
            }
          }
          finishReason = result.finishReason;

          if (!result.toolCalls.length) break;

          loopMessages.push({
            role: "assistant",
            content: result.content ?? "",
            tool_calls: result.toolCalls,
            ...(result.providerMetadata ? { providerMetadata: result.providerMetadata } : {}),
          });

          const permittedToolCalls = result.toolCalls.filter((call: any) =>
            chatResolvedToolNames.has(call.function.name),
          );
          const deniedToolResults = result.toolCalls
            .filter((call: any) => !chatResolvedToolNames.has(call.function.name))
            .map((call: any) => ({
              toolCallId: call.id,
              name: call.function.name,
              result: JSON.stringify({
                error: `Tool not allowed in this context: ${call.function.name}`,
                allowed: Array.from(chatResolvedToolNames),
              }),
              success: false,
            }));

          const executedToolResults = await executeToolCalls(permittedToolCalls, {
            ...baseToolExecutionContext,
          });
          const toolResultsById = new Map(
            [...executedToolResults, ...deniedToolResults].map((result) => [result.toolCallId, result]),
          );
          const toolResults = result.toolCalls
            .map((call: any) => toolResultsById.get(call.id))
            .filter((toolResult: any): toolResult is NonNullable<typeof toolResult> => toolResult != null);

          for (const tr of toolResults) {
            reply.raw.write(
              `data: ${JSON.stringify({
                type: "tool_result",
                data: { name: tr.name, result: tr.result, success: tr.success },
              })}\n\n`,
            );

            // Persist update_game_state tool calls to the game state DB
            if (tr.name === "update_game_state" && tr.success) {
              try {
                const parsed = JSON.parse(tr.result);
                if (parsed.applied && parsed.update) {
                  const latest = await gameStateStore.getLatest(input.chatId);
                  if (latest) {
                    const u = parsed.update;
                    const updates: Record<string, unknown> = {};
                    if (u.type === "location_change") updates.location = u.value;
                    if (u.type === "time_advance") updates.time = u.value;
                    if (Object.keys(updates).length > 0) {
                      await gameStateStore.updateLatest(input.chatId, updates);
                    }
                    // Send game_state_patch so HUD updates live
                    logger.debug("[game_state_patch] tool update_game_state: %j", updates);
                    reply.raw.write(`data: ${JSON.stringify({ type: "game_state_patch", data: updates })}\n\n`);
                  }
                }
              } catch {
                // Non-critical
              }
            }
          }

          for (const tr of toolResults) {
            loopMessages.push({
              role: "tool",
              content: tr.result,
              tool_call_id: tr.toolCallId,
            });
          }

          if (round === MAX_TOOL_ROUNDS - 1) {
            // Reset per-character accumulator for final round content
            const prevLen = fullResponse.length;
            loopMessages = fitPromptForSend(loopMessages);
            const finalResult = await provider.chatComplete(loopMessages, {
              model: conn.model,
              temperature,
              maxTokens: effectiveMaxTokensForSend,
              maxContext: effectiveMaxContext,
              topP,
              topK: topK || undefined,
              frequencyPenalty: frequencyPenalty || undefined,
              presencePenalty: presencePenalty || undefined,
              enableCaching: conn.enableCaching === "true",
              cachingAtDepth: conn.cachingAtDepth ?? 5,
              enableThinking,
              captureReasoning,
              reasoningEffort: resolvedEffort ?? undefined,
              verbosity: verbosity ?? undefined,
              customParameters,
              onThinking,
              onToken: input.streaming ? onToken : undefined,
              openrouterProvider: conn.openrouterProvider ?? undefined,
              signal: abortController.signal,
              encryptedReasoningItems: encryptedReasoningCache.get(input.chatId),
              onEncryptedReasoning: (items: unknown[]) => encryptedReasoningCache.set(input.chatId, items),
              onChatCompletionsReasoning: rememberChatCompletionsReasoning,
            });
            if (finalResult.content && fullResponse.length === prevLen) {
              writeContentChunked(finalResult.content);
            }
            if (finalResult.usage) {
              if (!usage) {
                usage = { ...finalResult.usage };
              } else {
                usage.promptTokens += finalResult.usage.promptTokens;
                usage.completionTokens += finalResult.usage.completionTokens;
                usage.totalTokens += finalResult.usage.totalTokens;
                if (finalResult.usage.cachedPromptTokens != null) {
                  usage.cachedPromptTokens =
                    (usage.cachedPromptTokens ?? 0) + finalResult.usage.cachedPromptTokens;
                }
                if (finalResult.usage.cacheWritePromptTokens != null) {
                  usage.cacheWritePromptTokens =
                    (usage.cacheWritePromptTokens ?? 0) + finalResult.usage.cacheWritePromptTokens;
                }
              }
            }
            finishReason = finalResult.finishReason;
          }
        }
      } else {
        const gen = provider.chat(initialProviderMessages, {
          model: conn.model,
          temperature,
          maxTokens: effectiveMaxTokensForSend,
          maxContext: effectiveMaxContext,
          topP,
          topK: topK || undefined,
          frequencyPenalty: frequencyPenalty || undefined,
          presencePenalty: presencePenalty || undefined,
          stream: input.streaming,
          enableCaching: conn.enableCaching === "true",
          cachingAtDepth: conn.cachingAtDepth ?? 5,
          enableThinking,
          captureReasoning,
          reasoningEffort: resolvedEffort ?? undefined,
          verbosity: verbosity ?? undefined,
          customParameters,
          openrouterProvider: conn.openrouterProvider ?? undefined,
          onThinking,
          onResponseParts: (parts: unknown[] | null) => {
            geminiResponseParts = parts;
          },
          signal: abortController.signal,
          encryptedReasoningItems: encryptedReasoningCache.get(input.chatId),
          onEncryptedReasoning: (items: unknown[]) => encryptedReasoningCache.set(input.chatId, items),
          onChatCompletionsReasoning: rememberChatCompletionsReasoning,
        });
        let result = await gen.next();
        while (!result.done) {
          fullResponse += result.value;
          // Break large chunks (e.g. Gemini non-streaming) into small pieces
          // so the client sees progressive streaming.
          const val = result.value;
          if (val.length <= 6) {
            reply.raw.write(`data: ${JSON.stringify({ type: "token", data: val })}\n\n`);
          } else {
            for (let i = 0; i < val.length; i += 6) {
              reply.raw.write(`data: ${JSON.stringify({ type: "token", data: val.slice(i, i + 6) })}\n\n`);
            }
          }
          result = await gen.next();
        }
        // Generator return value contains usage
        if (result.value) usage = result.value;
      }

      const durationMs = Date.now() - genStartTime;

      if (input.debugMode && chatMode === "game") {
        debugLog(
          "[generate/game/raw] chatId=%s characterId=%s chars=%d BEGIN",
          input.chatId,
          targetCharId ?? "gm",
          fullResponse.length,
        );
        debugLog("[generate/game/raw] %s", fullResponse);
        debugLog("[generate/game/raw] chatId=%s characterId=%s END", input.chatId, targetCharId ?? "gm");
      }

      // Some models inline reasoning blocks instead of using provider-native
      // thinking channels. Lift those blocks into message.extra.thinking.
      const inlineThinking = extractLeadingThinkingBlocks(fullResponse);
      if (inlineThinking.stripped) {
        if (inlineThinking.thinking) {
          fullThinking = fullThinking ? fullThinking + "\n\n" + inlineThinking.thinking : inlineThinking.thinking;
        }
        fullResponse = inlineThinking.content;
        reply.raw.write(`data: ${JSON.stringify({ type: "content_replace", data: fullResponse })}\n\n`);
      }

      // ── LOG_LEVEL=debug or Settings -> Advanced -> Debug mode: log full response + usage to server console ──
      if (isDebug || requestDebug) {
        debugLog("[debug] LLM response (%d chars, %dms):\n%s", fullResponse.length, durationMs, fullResponse);
        if (fullThinking) {
          debugLog("[debug] Thinking tokens (%d chars):\n%s", fullThinking.length, fullThinking);
        }
        if (usage) {
          const visibleCompletionTokens = getVisibleCompletionTokens(usage);
          debugLog(
            "[debug] Token usage — prompt: %s  completion: %s  visibleCompletion: %s  reasoning: %s  total: %s  cached: %s  cacheWrite: %s  finish: %s",
            usage.promptTokens ?? "N/A",
            usage.completionTokens ?? "N/A",
            visibleCompletionTokens ?? "N/A",
            usage.completionReasoningTokens ?? "N/A",
            usage.totalTokens ?? "N/A",
            usage.cachedPromptTokens ?? "N/A",
            usage.cacheWritePromptTokens ?? "N/A",
            finishReason ?? "N/A",
          );
        }
      }

      // ── Parse and strip hidden character commands ──
      let parsedCommands: CharacterCommand[] = [];
      let contentReplaced = false;
      const promotableThinking = providerThinking.trim() || fullThinking.trim();
      // Some OpenAI-compatible providers misplace the actual assistant text
      // in reasoning/thinking fields. Conversation mode only recovers when
      // reasoning was not requested; game mode requests reasoning by default,
      // so it still needs the recovery path to avoid empty GM turns.
      const isGlmModel = conn.model.toLowerCase().includes("glm");
      const shouldPromoteThinkingOnlyResponse =
        chatMode === "conversation" ? !enableThinking && !resolvedEffort : chatMode === "game";
      if (!fullResponse.trim() && promotableThinking && shouldPromoteThinkingOnlyResponse) {
        if (isGlmModel) {
          logger.warn(
            "[generate] Refusing to promote GLM thinking-only response for chat %s (char: %s, model: %s)",
            input.chatId,
            targetCharId,
            conn.model,
          );
        } else {
          logger.warn(
            "[generate] Promoting thinking-only response to visible text for %s chat %s (char: %s, model: %s)",
            chatMode,
            input.chatId,
            targetCharId,
            conn.model,
          );
          fullResponse = promotableThinking;
          fullThinking = "";
          providerThinking = "";
          contentReplaced = true;
        }
      }
      if (conversationCommandsEnabled && !input.impersonate) {
        const parsed = parseCharacterCommands(fullResponse);
        if (parsed.commands.length > 0) {
          parsedCommands = parsed.commands;
          fullResponse = parsed.cleanContent;
          contentReplaced = true;
          logger.info(
            "[generate] Parsed %d character command(s): %j",
            parsed.commands.length,
            parsed.commands.map((c) => c.type),
          );
        }
      }
      if (roleplayDmCommandsEnabled) {
        const parsed = parseDirectMessageCommands(fullResponse);
        if (parsed.commands.length > 0) {
          parsedCommands = [...parsedCommands, ...parsed.commands];
          fullResponse = parsed.cleanContent;
          contentReplaced = true;
          logger.info(
            "[generate] Parsed %d roleplay DM command(s): %j",
            parsed.commands.length,
            parsed.commands.map((c) => c.character),
          );
        }
      }

      // ── Extract <ooc> tags from roleplay responses and post to connected conversation ──
      let oocMessages: string[] = [];
      if (chatMode === "roleplay" && !input.impersonate && chat.connectedChatId) {
        const OOC_RE = /<ooc>([\s\S]*?)<\/ooc>/gi;
        for (const match of fullResponse.matchAll(OOC_RE)) {
          const text = match[1]!.trim();
          if (text) oocMessages.push(text);
        }
        if (oocMessages.length > 0) {
          fullResponse = fullResponse
            .replace(OOC_RE, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
          contentReplaced = true;
          logger.info(
            `[generate] Extracted ${oocMessages.length} OOC message(s) for conversation ${chat.connectedChatId}`,
          );
        }
      }

      // ── Strip character name prefix in individual group mode ──
      // LLMs often prefix the response with the character name even when told not to.
      // Also strip any leftover <speaker> tags from individual mode responses.
      if (chatMode === "conversation" && isGroupChat && groupChatMode === "individual" && targetCharId) {
        const charRow = charInfo.find((c) => c.id === targetCharId);
        if (charRow) {
          const cName = charRow.name;
          // Strip <speaker="Name">...</speaker> wrapper if present
          const speakerWrap = new RegExp(
            `^\\s*<speaker="${cName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">[\\s\\S]*?<\\/speaker>\\s*$`,
            "i",
          );
          const speakerMatch = fullResponse.match(speakerWrap);
          if (speakerMatch) {
            fullResponse = fullResponse
              .replace(/<speaker="[^"]*">/gi, "")
              .replace(/<\/speaker>/gi, "")
              .trim();
            contentReplaced = true;
          }
          // Strip plain name prefix: "Dottore\n", "Dottore:\n", "Dottore: "
          const namePrefix = new RegExp(`^\\s*${cName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:?\\s*\n`, "i");
          if (namePrefix.test(fullResponse)) {
            fullResponse = fullResponse.replace(namePrefix, "");
            contentReplaced = true;
          }
        }
      }

      // ── Strip leaked timestamps from conversation mode responses ──
      // Models sometimes echo [HH:MM] timestamps despite instructions not to.
      // Strip them before storage to prevent compounding on future generations.
      if (chatMode === "conversation" && !input.impersonate) {
        const beforeStrip = fullResponse;
        fullResponse = fullResponse
          .replace(/^(\s*\[\d{1,2}[:.]\d{2}\]\s*)+/gm, "")
          .replace(/^(\s*\[\d{1,2}\.\d{1,2}\.\d{4}\]\s*)+/gm, "")
          .trim();
        if (fullResponse !== beforeStrip) {
          contentReplaced = true;
        }
      }

      if (input.trimIncompleteModelOutput && !input.impersonate) {
        const beforeTrim = fullResponse;
        fullResponse = trimIncompleteModelEnding(fullResponse);
        if (fullResponse !== beforeTrim) {
          contentReplaced = true;
          logger.debug(
            "[generate] Trimmed incomplete model ending for chat %s (%d -> %d chars)",
            input.chatId,
            beforeTrim.length,
            fullResponse.length,
          );
        }
      }

      if (contentReplaced) {
        reply.raw.write(`data: ${JSON.stringify({ type: "content_replace", data: fullResponse })}\n\n`);
      }

      // Guard: don't save empty responses — the model returned nothing useful.
      // Exception: if the model emitted character commands (e.g. [fetch:...]) with
      // no surrounding prose, treat the commands as the useful output. Skip saving
      // a blank assistant bubble but still return the commands so they execute.
      if (!fullResponse.trim()) {
        if (!input.impersonate && parsedCommands.length > 0) {
          logger.info(
            "[generate] Model emitted %d command(s) with no visible prose for chat %s; saving hidden command anchor",
            parsedCommands.length,
            input.chatId,
          );
          const savedMsg = await chats.createMessage({
            chatId: input.chatId,
            role: "assistant",
            characterId: targetCharId,
            content: "",
          });
          const anchoredMsg = savedMsg?.id
            ? await chats.updateMessageExtra(savedMsg.id, {
                hiddenFromUser: true,
                hiddenFromAI: true,
                commandOnly: true,
                isGenerated: true,
              })
            : savedMsg;
          if (markGenerationCommitted && anchoredMsg?.id) {
            generationComplete = true;
          }
          return {
            savedMsg: anchoredMsg,
            response: "",
            commands: parsedCommands,
            oocMessages,
            characterId: targetCharId,
          };
        }
        logger.warn(`[generate] Empty response from model for chat ${input.chatId} (char: ${targetCharId})`);
        reply.raw.write(
          `data: ${JSON.stringify({ type: "error", data: "The AI returned an empty response. Try sending your message again." })}\n\n`,
        );
        return null;
      }

      // Save assistant message (or user message for impersonate)
      let savedMsg: any;
      if (input.regenerateMessageId) {
        savedMsg = await chats.addSwipe(input.regenerateMessageId, fullResponse);
        savedMsg = await chats.getMessage(input.regenerateMessageId);
      } else {
        savedMsg = await chats.createMessage({
          chatId: input.chatId,
          role: input.impersonate ? "user" : "assistant",
          characterId: input.impersonate ? null : targetCharId,
          content: fullResponse,
        });
      }
      if (markGenerationCommitted && savedMsg?.id) {
        generationComplete = true;
      }
      if (chatMode === "conversation" && !input.impersonate && !input.regenerateMessageId) {
        recordAssistantActivity(input.chatId, targetCharId ?? undefined);
        conversationAssistantSaved = true;
      }

      // Persist thinking/reasoning and generation info
      if (savedMsg?.id) {
        const extraUpdate: Record<string, unknown> = {
          generationInfo: {
            model: conn.model,
            provider: conn.provider,
            temperature: temperature ?? null,
            maxTokens: effectiveMaxTokensForSend ?? null,
            maxContext: effectiveMaxContext ?? connectionMaxContext ?? null,
            showThoughts: showThoughts ?? null,
            reasoningEffort: resolvedEffort ?? reasoningEffort ?? null,
            verbosity: verbosity ?? null,
            assistantPrefill: assistantPrefill || null,
            customParameters: Object.keys(customParameters).length > 0 ? customParameters : null,
            tokensPrompt: usage?.promptTokens ?? null,
            tokensCompletion: usage?.completionTokens ?? null,
            tokensVisibleCompletion: getVisibleCompletionTokens(usage) ?? null,
            tokensReasoning: usage?.completionReasoningTokens ?? null,
            tokensCompletionAudio: usage?.completionAudioTokens ?? null,
            tokensRejectedPrediction: usage?.rejectedPredictionTokens ?? null,
            tokensCachedPrompt: usage?.cachedPromptTokens ?? null,
            tokensCacheWritePrompt: usage?.cacheWritePromptTokens ?? null,
            durationMs,
            finishReason: finishReason ?? null,
          },
        };
        if (fullThinking) extraUpdate.thinking = fullThinking;
        else extraUpdate.thinking = null;
        // Store Gemini response parts (thought signatures + summaries) for multi-turn continuity
        if (geminiResponseParts) extraUpdate.geminiParts = geminiResponseParts;
        // Store Chat Completions reasoning fields for providers that require replay (DeepSeek/OpenRouter)
        if (chatCompletionsReasoning) extraUpdate.chatCompletionsReasoning = chatCompletionsReasoning;
        else extraUpdate.chatCompletionsReasoning = null;
        // Store OpenAI Responses API encrypted reasoning items for multi-turn continuity
        const cachedReasoning = encryptedReasoningCache.get(input.chatId);
        if (cachedReasoning?.length) extraUpdate.encryptedReasoning = cachedReasoning;
        else extraUpdate.encryptedReasoning = null;
        // Cache the exact prompt injections used for this swipe so future
        // regenerations and swipe switches replay the same guidance.
        extraUpdate.contextInjections = contextInjections.length > 0 ? contextInjections : null;
        extraUpdate.generationReplay = buildGenerationReplay(input);
        // Cache the final prompt (what was actually sent to the model) for Peek Prompt
        extraUpdate.cachedPrompt = finalPromptSent.map((m) => ({ role: m.role, content: m.content }));
        await chats.updateMessageExtra(savedMsg.id, extraUpdate);
        // Also persist on the active swipe so switching swipes preserves per-swipe extras
        const refreshedMsg = await chats.getMessage(savedMsg.id);
        if (refreshedMsg) {
          await chats.updateSwipeExtra(savedMsg.id, refreshedMsg.activeSwipeIndex, extraUpdate);
        }

        sendSseEvent(reply, {
          type: "message_saved",
          data: refreshedMsg ?? savedMsg,
        });

        if (chatMode === "game" && !input.impersonate) {
          const mapUpdates = parseMapUpdateCommands(fullResponse);
          if (mapUpdates.length > 0) {
            try {
              const freshChat = await chats.getById(input.chatId);
              const freshMeta = freshChat
                ? (parseExtra(freshChat.metadata) as Record<string, unknown>)
                : chatMeta;
              const originalMap = (freshMeta.gameMap as GameMap | null) ?? null;
              let nextMap = originalMap;
              let latestLocation: string | null = null;

              for (const command of mapUpdates) {
                const updatedMap = applyMapUpdateCommand(nextMap, command);
                if (!updatedMap) continue;
                nextMap = updatedMap;
                latestLocation = command.newLocation;
              }

              if (nextMap && nextMap !== originalMap) {
                const nextMeta = withActiveGameMapMeta(freshMeta, nextMap);
                await chats.updateMetadata(input.chatId, nextMeta);
                chatMeta.gameMap = nextMeta.gameMap;
                chatMeta.gameMaps = nextMeta.gameMaps;
                chatMeta.activeGameMapId = nextMeta.activeGameMapId;
                sendSseEvent(reply, { type: "game_map_update", data: nextMeta.gameMap });

                const persistedMsg = refreshedMsg ?? savedMsg;
                if (latestLocation && persistedMsg?.id) {
                  const persistedSwipeIndex = persistedMsg.activeSwipeIndex ?? 0;
                  await gameStateStore.updateByMessage(
                    persistedMsg.id,
                    persistedSwipeIndex,
                    input.chatId,
                    {
                      location: latestLocation,
                    },
                    undefined,
                    { baseSnapshot: baseGameStateSnapshot },
                  );
                  sendSseEvent(reply, { type: "game_state_patch", data: { location: latestLocation } });
                }

                logger.info(
                  "[generate/game/map_update] chatId=%s applied=%d location=%s",
                  input.chatId,
                  mapUpdates.length,
                  latestLocation ?? "",
                );
              }
            } catch (err) {
              logger.warn(err, "[generate/game/map_update] Failed to apply map_update");
            }
          }
        }

        // Evict cachedPrompt from older messages to save storage (keep last 2 assistant msgs)
        const allMsgs = await chats.listMessages(input.chatId);
        const assistantMsgIds = allMsgs.filter((m: any) => m.role === "assistant").map((m: any) => m.id);
        const staleIds = assistantMsgIds.slice(0, -2);
        for (const staleId of staleIds) {
          const staleMsg = await chats.getMessage(staleId);
          if (!staleMsg) continue;
          const staleExtra =
            typeof staleMsg.extra === "string" ? JSON.parse(staleMsg.extra) : (staleMsg.extra ?? {});
          if (!staleExtra.cachedPrompt) continue;
          await chats.updateMessageExtra(staleId, { cachedPrompt: null });
          // Also clean swipes
          const swipes = await chats.getSwipes(staleId);
          for (const sw of swipes) {
            const swExtra = typeof sw.extra === "string" ? JSON.parse(sw.extra) : (sw.extra ?? {});
            if (swExtra.cachedPrompt) {
              await chats.updateSwipeExtra(staleId, sw.index, { cachedPrompt: null });
            }
          }
        }
      }

      // Mirror character response to Discord (fire-and-forget, skip regens/swipes)
      if (discordWebhookUrl && fullResponse.trim() && !input.impersonate && !input.regenerateMessageId) {
        const charName =
          chatMode === "game"
            ? await resolveGameDiscordSpeakerName()
            : (charInfo.find((c) => c.id === targetCharId)?.name ?? "Character");
        postToDiscordWebhook(discordWebhookUrl, { content: fullResponse, username: charName });
      }

      return {
        savedMsg,
        response: fullResponse,
        commands: parsedCommands,
        oocMessages,
        characterId: targetCharId,
      };
    } finally {
      clearInterval(keepaliveTimer);
    }
  };

  const filterManualTargetProfileBlocks = (messages: typeof finalMessages, targetCharId: string) => {
    if (groupResponseOrder !== "manual") return messages;
    const otherNames = charInfo.filter((c) => c.id !== targetCharId).map((c) => c.name);
    if (otherNames.length === 0) return messages;
    return messages.filter((message) => {
      if (message.role !== "system") return true;
      return !otherNames.some((name) => isStandaloneCharacterProfileBlock(message.content, name));
    });
  };

  const narrativeContext = new NarrativeContext();
  try {
    const overridePath = join(DATA_DIR, "narrative-config.json");
    const defaultPath = join(DATA_DIR, "..", "narrative-config.json");
    const narrativeConfigPath = existsSync(overridePath) ? overridePath : defaultPath;
    if (existsSync(narrativeConfigPath)) {
      const narrativeConfig = JSON.parse(readFileSync(narrativeConfigPath, "utf-8"));
      if (typeof narrativeConfig.defaultPersona === "string") {
        narrativeContext.setPersona(narrativeConfig.defaultPersona);
      }
      if (typeof narrativeConfig.defaultCOTMode === "string") {
        narrativeContext.setCOTMode(narrativeConfig.defaultCOTMode);
      }
    }
  } catch (err) {
    logger.warn(err, "[narrative] Failed to load narrative-config.json; using defaults");
  }
  const narrativePrompt = narrativeContext.buildSystemPrompt();
  if (narrativePrompt) {
    const lastSystemIdx = (() => {
      for (let i = finalMessages.length - 1; i >= 0; i--) {
        if (finalMessages[i]!.role === "system") return i;
      }
      return -1;
    })();
    if (lastSystemIdx >= 0) {
      const content = finalMessages[lastSystemIdx]!.content;
      finalMessages[lastSystemIdx] = {
        ...finalMessages[lastSystemIdx]!,
        content: content ? `${content}\n\n${narrativePrompt}` : narrativePrompt,
      };
    } else {
      finalMessages.push({ role: "system" as const, content: narrativePrompt });
    }
  }

  const buildCharacterInstruction = (charId: string, charName: string) => {
    if (groupResponseOrder !== "manual") return `Respond ONLY as ${charName}.`;
    const latestOtherSender = latestVisibleSenderOtherThan(charId);
    return [
      `Respond ONLY as ${charName}.`,
      `This is an invisible manual trigger, not a visible message from ${personaName}. Do not mention being pinged, summoned, selected, or called by the user.`,
      latestOtherSender
        ? `Reply naturally to the latest visible sender other than yourself: ${latestOtherSender}.`
        : `Reply naturally to the ongoing group context.`,
      `If your own previous message is the most relevant last beat, continue naturally instead of answering the hidden trigger as if it came from ${personaName}.`,
      `You may address ${personaName} or another character if that is what the context calls for, but do not speak or act for them.`,
    ].join("\n");
  };

  if (useIndividualLoop) {
    // Individual group mode: generate one response per character
    sendProgress("generating");
    let runningMessages = [...finalMessages];

    if (generationGuideInstruction) {
      runningMessages.push({ role: "system", content: generationGuideInstruction });
    }

    for (let ci = 0; ci < respondingCharIds.length; ci++) {
      if (abortController.signal.aborted) break;
      const charId = respondingCharIds[ci]!;
      const charName = charInfo.find((c) => c.id === charId)?.name ?? "Character";

      // Tell the client which character is responding next
      reply.raw.write(
        `data: ${JSON.stringify({ type: "group_turn", data: { characterId: charId, characterName: charName, index: ci } })}\n\n`,
      );

      // Append "Respond ONLY as [name]" instruction
      const charInstruction = buildCharacterInstruction(charId, charName);
      const messagesWithInstruction = [...filterManualTargetProfileBlocks(runningMessages, charId)];
      // Add as a system message at the end (just before any trailing user message)
      messagesWithInstruction.push({ role: "system", content: charInstruction });

      const genResult = await generateForCharacter(
        charId,
        messagesWithInstruction,
        ci === respondingCharIds.length - 1,
      );
      if (!genResult) break; // aborted
      firstSavedMsg ??= genResult.savedMsg;
      lastSavedMsg = genResult.savedMsg;
      allResponses.push(genResult.response);
      for (const cmd of genResult.commands) {
        collectedCommands.push({
          command: cmd,
          characterId: charId,
          messageId: genResult.savedMsg?.id ?? "",
          swipeIndex: genResult.savedMsg?.activeSwipeIndex ?? 0,
        });
      }
      collectedOocMessages.push(...genResult.oocMessages);

      // Add this character's response to the running context for the next character
      runningMessages.push({ role: "assistant", content: genResult.response });
    }
  } else {
    // Single/merged: one generation
    sendProgress("generating");
    let targetCharId = characterIds[0] ?? null;
    const sentMessages = [...finalMessages];

    if (generationGuideInstruction) {
      sentMessages.push({ role: "system", content: generationGuideInstruction });
    }

    if (mentionedConversationCharacters.length > 0 && !regenGroupChatIndividual) {
      const mentionedNames = mentionedConversationCharacters.map((character) => character.name);

      if (mentionedConversationCharacters.length === 1) {
        const mentionedCharacter = mentionedConversationCharacters[0]!;
        targetCharId = mentionedCharacter.id;
        sentMessages.push({
          role: "system",
          content: `Respond ONLY as ${mentionedCharacter.name}. The user's latest message explicitly @mentions ${mentionedCharacter.name}, so no other character should reply to this turn.`,
        });
      } else {
        sentMessages.push({
          role: "system",
          content: `The user's latest message explicitly @mentions ${mentionedNames.join(", ")}. Only those mentioned characters may reply to this turn. Do not include any response lines from any other character.`,
        });
      }
    }

    if (regenGroupChatIndividual) {
      if (regenMsg?.chatId !== input.chatId) {
        sendSseEvent(reply, { type: "error", data: "Regenerated message does not belong to this chat" });
        return null;
      }
      if (!regenMsg?.characterId) {
        sendSseEvent(reply, { type: "error", data: "Regenerated message is missing character" });
        return null;
      }

      // Get character of regenerated message and append "Respond ONLY as [name]" instruction
      targetCharId = regenMsg?.characterId ?? null;
      const targetCharName = charInfo.find((c) => c.id === targetCharId)?.name ?? "Character";
      const charInstruction = targetCharId
        ? buildCharacterInstruction(targetCharId, targetCharName)
        : `Respond ONLY as ${targetCharName}.`;
      sentMessages.push({ role: "system", content: charInstruction });
    }

    const genResult = await generateForCharacter(targetCharId, sentMessages, true);
    if (genResult) {
      firstSavedMsg ??= genResult.savedMsg;
      lastSavedMsg = genResult.savedMsg;
      for (const cmd of genResult.commands) {
        collectedCommands.push({
          command: cmd,
          characterId: genResult.characterId,
          messageId: genResult.savedMsg?.id ?? "",
          swipeIndex: genResult.savedMsg?.activeSwipeIndex ?? 0,
        });
      }
      collectedOocMessages.push(...genResult.oocMessages);
    }
    allResponses.push(fullResponse);
  }

  return {
    firstSavedMsg,
    lastSavedMsg,
    allResponses,
    collectedCommands,
    collectedOocMessages,
    fullResponse,
    fullThinking,
    providerThinking,
    generationComplete,
    conversationAssistantSaved,
    chatMeta,
  };
}
