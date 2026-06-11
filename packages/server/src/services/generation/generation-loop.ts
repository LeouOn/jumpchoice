// ──────────────────────────────────────────────
// Generation Loop (SSE Streaming with Tool Use + Agent Pipeline)
// ──────────────────────────────────────────────
import type { FastifyReply } from "fastify";
import {
  BUILT_IN_TOOLS,
  BUILT_IN_AGENTS,
  getDefaultBuiltInAgentSettings,
  findKnownModel,
  nameToXmlTag,
  DEFAULT_AGENT_TOOLS,
  resolveMacros,
  resolveDeferredCharacterMacros,
  hasDeferredCharacterMacros,
} from "@jumpchoice/shared";
import type {
  AgentContext,
  AgentResult,
  AgentPhase,
  APIProvider,
  CharacterMacroProfile,
  CharacterStat,
  GameCampaignPlan,
  GameState,
  PlayerStats,
  LorebookEntryTimingState,
} from "@jumpchoice/shared";
import { applyRegexScriptsToPromptMessages } from "../regex/regex-application.js";
import { loadPrompt, CONVERSATION_SELFIE } from "../prompt-overrides/index.js";
import { renderTemplate } from "../prompt-overrides/template.js";
import { processLorebooks } from "../lorebook/index.js";
import {
  filterGameInternalAgentIds,
  resolveGameLorebookScopeExclusions,
} from "../lorebook/game-lorebook-scope.js";
import { lorebookEntryPassesContextFilters, type GameStateForScanning } from "../lorebook/keyword-scanner.js";
import { injectAtDepth } from "../lorebook/prompt-injector.js";
import { extractLeadingThinkingBlocks } from "../llm/inline-thinking.js";
import { resolveSpotifyCredentials, spotifyHasScope } from "../spotify/spotify.service.js";
import {
  assemblePrompt,
  buildPromptMacroContext,
  collectCharacterDepthPromptEntries,
  getCharacterDescriptionWithExtensions,
  resolveMacrosWithVariableSnapshot,
  type AssemblerInput,
} from "../prompt/index.js";
import { mergeAdjacentMessages } from "../prompt/merger.js";
import { wrapContent } from "../prompt/format-engine.js";
import {
  fitMessagesToContext,
  type LLMToolDefinition,
  type ChatMessage,
  type LLMUsage,
} from "../llm/base-provider.js";
import { executeToolCalls, type MetadataPatchInput } from "../tools/tool-executor.js";
import { createAgentPipeline, type ResolvedAgent, type AgentInjection } from "../agents/agent-pipeline.js";
import { DATA_DIR } from "../../utils/data-dir.js";
import { executeAgent, normalizeAgentContextSize, resolveAgentResultType } from "../agents/agent-executor.js";
import { listCharacterSprites } from "../game/sprite.service.js";
import {
  parseCharacterCommands,
  parseDirectMessageCommands,
  parseDuration,
  type CharacterCommand,
  type ScheduleUpdateCommand,
  type CrossPostCommand,
  type SelfieCommand,
  type MemoryCommand,
  type InfluenceCommand,
  type NoteCommand,
  type DirectMessageCommand,
  type SceneCommand,
  type HapticCommand,
  type SpotifyCommand,
  type CreatePersonaCommand,
  type CreateCharacterCommand,
  type UpdateCharacterCommand,
  type UpdatePersonaCommand,
  type CreateLorebookCommand,
  type UpdateLorebookCommand,
  type CreateChatCommand,
  type NavigateCommand,
  type FetchCommand,
} from "../conversation/character-commands.js";
import {
  ConversationSpotifyCommandError,
  isSilentConversationSpotifyCommandError,
  playConversationSpotifyCommand,
} from "../spotify/conversation-spotify-command.service.js";
import {
  clearGenerationInProgress,
  markGenerationInProgress,
  recordAssistantActivity,
  recordUserActivity,
} from "../conversation/autonomous.service.js";
import { buildImpersonateInstruction } from "../conversation/impersonate-prompt.js";
import { stripConversationPromptTimestamps } from "../conversation/transcript-sanitize.js";
import {
  formatConversationDateKey,
  generateMissingConversationSummaries,
  parseConversationDateKey,
} from "../conversation/auto-summary.service.js";
import { MARI_ASSISTANT_PROMPT } from "../../db/seed-mari.js";
import { executeKnowledgeRetrieval } from "../agents/knowledge-retrieval.js";
import { executeKnowledgeRouter } from "../agents/knowledge-router.js";
import { extractFileText, getSourceFilePath } from "../../routes/knowledge-sources.routes.js";
import { gameStateSnapshots as gameStateSnapshotsTable } from "../../db/schema/index.js";
import { chats as chatsTable } from "../../db/schema/index.js";
import { PROFESSOR_MARI_ID } from "@jumpchoice/shared";
import { chunkAndEmbedMessages, embedMemoryRecallTexts, recallMemories } from "../memory-recall.js";
import { resolveMemoryRecallEmbeddingSource } from "../memory-recall-embedding.js";
import { filterAndAssembleMemoryContext } from "../memory/memory-interceptor.js";
import { summarizeOldestBatch } from "../memory/memory-summarizer.js";
import { saveSummary, loadSummariesForChat, updateWatermark } from "../memory/memory-db.js";
import { warmLorebookEntryEmbeddings } from "../lorebook/embeddings.js";
import { postToDiscordWebhook } from "../discord-webhook.js";
import {
  findLastIndex,
  appendReadableAttachmentsToContent,
  extractImageAttachmentDataUrls,
  injectIntoOutputFormatOrLastUser,
  isMessageHiddenFromAI,
  mergeCustomParameters,
  parseExtra,
  parseStoredGenerationParameters,
  parseGameStateRow,
  resolveBaseUrl,
  resolveRegenerationGameStateFallbackMessageIds,
  resolveRegenerationGameStateAnchor,
  resolveVisibleGameStateAnchor,
  shouldPreferLatestVisibleGameState,
  shouldAbortOnPassiveGenerationDisconnect,
  shouldEnableAgentsForGeneration,
  shouldInjectIdentityFallback,
  wrapFields,
  type PromptAttachment,
  type SimpleMessage,
} from "../../routes/generate/generate-route-utils.js";
import {
  buildAvailableSpriteCharacter,
  normalizeSpriteDisplayModes,
} from "../../routes/generate/expression-agent-utils.js";
import { logger, logDebugOverride } from "../../lib/logger.js";
import {
  buildHistoricalLorebookKeeperContext,
  getLorebookKeeperAutomaticPendingCount,
  getLorebookKeeperAutomaticTarget,
  loadLorebookKeeperExistingEntries,
  resolveLorebookKeeperTarget,
} from "../../routes/generate/lorebook-keeper-utils.js";
import { sendSseEvent, startSseReply, trySendSseEvent } from "../../routes/generate/sse.js";
import {
  buildDefaultAgentConnectionWarning,
  buildLocalSidecarUnavailableWarning,
  isLocalSidecarConnectionId,
  resolveAgentConnectionId,
  type AgentConnectionWarning,
} from "../../routes/generate/agent-connection-guards.js";
import {
  normalizeContextInjections,
  normalizeSecretPlotSceneDirections,
  normalizeStringArray,
} from "../../routes/generate/agent-normalizers.js";
import {
  buildGenerationPromptPresetCandidates,
  type PromptPresetCandidateSource,
} from "../../routes/generate/prompt-preset-selection.js";
import {
  applyGenerationReplayToRegenerateInput,
  buildGenerationReplay,
  normalizeGenerationReplay,
} from "../../routes/generate/generation-replay.js";
import {
  validateGenerateRequest,
} from "../../routes/generate/validation.routes.js";
import {
  createGenerationProvider,
  createStandardProvider,
  seedLocalSidecarIntoCache,
  seedDefaultAgentConnectionIntoCache,
  type AgentProviderCache,
} from "../../routes/generate/provider.routes.js";
import {
  resolveLorebookGenerationTriggers,
  buildLorebookScanMessagesWithGenerationGuide,
  resolveLorebookTokenBudget,
  persistLorebookRuntimeState,
  rememberKnowledgeRouterActivatedLorebookIds,
  normalizeMaxContext,
  minContextLimit,
  packRecalledMemories,
  normalizeChatTopP,
  readChatCompletionsReasoningMetadata,
  isStandaloneCharacterProfileBlock,
  type LorebookScanMessage,
} from "../../routes/generate/prompt.routes.js";
import {
  REVIEWABLE_WRITER_AGENT_TYPES,
  type RuntimeAgentSectionType,
  type RuntimeAgentSectionTokens,
  toRuntimeAgentSectionType,
  makeRuntimeAgentSectionTokens,
  replaceRuntimeAgentSection,
  splitRuntimeHandledAgentInjections,
  clearUnusedRuntimeAgentSections,
  formatAgentInjections,
  normalizeAgentMaxTokens,
  applyProviderMaxTokensOverride,
} from "../../routes/generate/agents.routes.js";
import {
  createJournal,
  addEventEntry,
  type Journal,
} from "../game/journal.service.js";
import { buildGmSystemPrompt, buildGmFormatReminder, type GmPromptContext } from "../game/gm-prompts.js";
import {
  applyMapUpdateCommand,
  parseMapUpdateCommands,
  withActiveGameMapMeta,
} from "../game/map-position.service.js";
import { applyAllSegmentEdits, stripGmCommandTags } from "../game/segment-edits.js";
import { listPartySprites, readPreferredFullBodySpriteBase64 } from "../game/sprite.service.js";
import {
  generatePerceptionHints,
  formatPerceptionHints,
  type PerceptionContext,
} from "../game/perception.service.js";
import { getMoraleTier, formatMoraleContext } from "../game/morale.service.js";
import type { GameMap, LorebookEntry } from "@jumpchoice/shared";
import { sidecarModelService } from "../sidecar/sidecar-model.service.js";
import { NarrativeContext } from "../narrative/narrative-context.service.js";
import { resolveMessagesAndPersona } from "./message-resolver.js";
import { dispatchCharacterCommands } from "./command-dispatcher.js";
import { runPreGeneration } from "./pre-gen-runner.js";
import {
  bumpCharacterVersion,
  hasConversationSchedules,
  parsePromptPresetChoices,
  areConversationSchedulesEnabled,
  getEnabledConversationSchedules,
  getChatHapticIntifaceUrl,
  trimIncompleteModelEnding,
  getHiddenCompletionTokens,
  getVisibleCompletionTokens,
  sanitizeConnectedGameTranscript,
  prefixConversationUserTurn,
  formatConversationPromptTurn,
  normalizePartyLookupName,
  buildPartyNpcId,
  isPartyNpcId,
  readAvatarBase64,
  normalizeDmTargetName,
  resolveGenerationParameters,
} from "./helpers.js";
import { isInferenceAvailable as isSidecarInferenceAvailable } from "../sidecar/sidecar-inference.service.js";
import { buildGamePrompt } from "./game-prompt-builder.js";
import { buildConversationPrompt } from "./conversation-prompt-builder.js";
import { buildLanguageLearningSystemPrompt } from "./language-learning-prompt-builder.js";
import { injectContext } from "./context-injector.js";
import { resolveAgentPipeline } from "./agent-coordinator.js";
import { runPostProcessing } from "./post-processor.js";
import { runStreamingGeneration } from "./streaming-handler.js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface GenerationLoopContext {
  app: any;
  db: any;
  req: any;
  isDebug: boolean;
  chats: any;
  connections: any;
  presets: any;
  chars: any;
  agentsStore: any;
  gameStateStore: any;
  customToolsStore: any;
  lorebooksStore: any;
  regexScriptsStore: any;
  encryptedReasoningCache: Map<string, unknown[]>;
  input: any;
  chat: any;
  requestChatMode: string;
  abortController: AbortController;
  earlyMeta: any;
  discordWebhookUrl: string;
  pendingUserDiscordMsg: any;
  requestDebug: boolean;
  debugLog: (message: string, ...args: any[]) => void;
  conversationGenerationStartedAt: number | null;
  conversationAssistantSaved: boolean;
  connId: string;
  conn: any;
  baseUrl: string;
  memoryRecallEmbeddingSource: any;
  chatMeta: Record<string, unknown>;
}

export async function runGenerationLoop(
  ctx: GenerationLoopContext,
  reply: FastifyReply,
  activeGenerations: Map<string, { abortController: AbortController; backendUrl: string | null }>,
): Promise<void> {
  const {
    app, db, req, isDebug, chats, connections, presets, chars, agentsStore, gameStateStore,
    customToolsStore, lorebooksStore, regexScriptsStore, encryptedReasoningCache,
    input, chat, requestChatMode, abortController, earlyMeta,
    discordWebhookUrl, pendingUserDiscordMsg, requestDebug, debugLog,
    connId, conn, baseUrl, memoryRecallEmbeddingSource,
  } = ctx;
  let conversationGenerationStartedAt = ctx.conversationGenerationStartedAt;
  let conversationAssistantSaved = ctx.conversationAssistantSaved;
  let chatMeta = ctx.chatMeta;

    // Set up SSE headers
    startSseReply(reply, { "X-Accel-Buffering": "no" });

    let generationComplete = false;
    let clientDisconnected = false;
    const originalSseWrite = reply.raw.write.bind(reply.raw);
    reply.raw.write = ((chunk: any, encodingOrCallback?: any, callback?: any) => {
      if (clientDisconnected || reply.raw.destroyed) return false;
      try {
        return originalSseWrite(chunk, encodingOrCallback, callback);
      } catch {
        return false;
      }
    }) as typeof reply.raw.write;

    const onClose = () => {
      if (generationComplete) return;
      clientDisconnected = true;
      if (!shouldAbortOnPassiveGenerationDisconnect({ chatMode: requestChatMode, impersonate: input.impersonate })) {
        logger.info("[generate] Conversation client disconnected; generation will continue for chat: %s", input.chatId);
        return;
      }
      logger.info("[abort] Client disconnected — aborting generation");
      abortController.abort();
      if (activeGenerations) activeGenerations.delete(input.chatId);
      if (baseUrl) {
        const backendRoot = baseUrl.replace(/\/v1\/?$/, "");
        fetch(backendRoot + "/api/extra/abort", {
          method: "POST",
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
      }
    };
    reply.raw.on("close", onClose);
    if (requestChatMode === "conversation" && !input.impersonate) {
      conversationGenerationStartedAt = markGenerationInProgress(input.chatId);
    }

    // ── SSE progress helper: tells the client what phase we're in ──
    const sendProgress = (phase: string) => {
      trySendSseEvent(reply, { type: "progress", data: { phase } });
    };

    try {
      const msgResult = await resolveMessagesAndPersona(
        { chats, chars, presets, gameStateStore },
        input, chat, conn, chatMeta, requestChatMode, discordWebhookUrl, pendingUserDiscordMsg,
      );
      if (!msgResult.ok) {
        sendSseEvent(reply, { type: "error", data: msgResult.error });
        return;
      }
      const {
        allChatMessages,
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
      } = msgResult.value;
      const chatMode = requestChatMode;
      let chatMessages = msgResult.value.chatMessages;
      const selectedGameStateForPrompt = async (): Promise<Record<string, unknown> | null> => {
        const row = await selectedGameStateSnapshotPromise;
        return row ? (parseGameStateRow(row as Record<string, unknown>) as unknown as Record<string, unknown>) : null;
      };

      // ── Professor Mari fetch follow-up loop ──
      // After Mari executes a [fetch:], the fetched data is persisted to
      // chatMeta.mariContext but only injected into the prompt at the START
      // of a generation pass. Without a follow-up turn she goes silent
      // ("snackbar without follow-up", #898). The loop re-runs the generation
      // up to MAX_FOLLOW_UP_ITERATIONS additional times if a fetch fired in
      // the previous pass, so Mari can speak to the data she just pulled.
      let runningMessagesForFollowUp = [...mappedMessages];
      let followUpIteration = 0;
      const MAX_FOLLOW_UP_ITERATIONS = 2;

      // Hoisted out of the loop so the SSE flush, OOC posting, and
      // illustration await at the end see state from the latest iteration.
      let firstSavedMsg: any = null;
      let lastSavedMsg: any = null;
      let pendingIllustration: Promise<void> | null = null;
      const collectedCommands: Array<{
        command: CharacterCommand;
        characterId: string | null;
        messageId: string;
        swipeIndex: number;
      }> = [];
      const collectedOocMessages: string[] = [];

      // eslint-disable-next-line no-constant-condition
      while (true) {
        // Per-iteration flag: set when a Mari [fetch:] command actually returned
        // data AND persisted mariContext. The follow-up branch at the bottom of
        // the loop body gates on this so a fetch that found nothing or threw
        // doesn't burn an extra generation pass with no new context to read.
        let mariFetchSucceededThisIteration = false;
        let finalMessages: Array<{
          role: "system" | "user" | "assistant";
          content: string;
          images?: string[];
          providerMetadata?: Record<string, unknown>;
        }> = [...runningMessagesForFollowUp];
        let conversationCommandsReminder: string | null = null;
        const conversationCommandsEnabled = chatMode === "conversation" && chatMeta.characterCommands !== false;
        let temperature = 1;
        let maxTokens = 4096;
        let topP: number | undefined = 1;
        let topK = 0;
        let frequencyPenalty = 0;
        let presencePenalty = 0;
        let showThoughts = true;
        let reasoningEffort: "low" | "medium" | "high" | "maximum" | null = null;
        let verbosity: "low" | "medium" | "high" | null = null;
        let assistantPrefill = "";
        let customParameters: Record<string, unknown> = {};
        let wrapFormat: "xml" | "markdown" | "none" = "xml";
        const runtimeAgentSectionTypes = new Set<RuntimeAgentSectionType>();
        const runtimeAgentSectionTokens = new Map<RuntimeAgentSectionType, RuntimeAgentSectionTokens>();
        const connectionMaxContext = normalizeMaxContext(conn.maxContext);
        const knownModelContext = normalizeMaxContext(
          findKnownModel(conn.provider as APIProvider, conn.model)?.context,
        );
        let effectiveMaxContext = minContextLimit(connectionMaxContext, knownModelContext);

        // Determine whether agents are enabled for this chat (needed by assembler + agent pipeline)
        // Conversation mode chats never run roleplay agents — force agents off.
        logger.info("[generate] chatId=%s, chatMode=%s", input.chatId, chatMode);
        const gameSpotifyMusicEnabled = chatMode === "game" && chatMeta.gameUseSpotifyMusic === true;
        const chatEnableAgents = shouldEnableAgentsForGeneration({
          chatEnableAgents: chatMeta.enableAgents === true,
          chatMode,
          impersonate: input.impersonate,
          impersonateBlockAgents: input.impersonateBlockAgents,
        });
        const persistedChatActiveAgentIds: string[] = Array.isArray(chatMeta.activeAgentIds)
          ? (chatMeta.activeAgentIds as string[])
          : [];
        const chatActiveAgentIds: string[] = filterGameInternalAgentIds(chatMode, persistedChatActiveAgentIds).filter(
          (agentId) => !(gameSpotifyMusicEnabled && agentId === "spotify"),
        );
        const runtimeSectionEligibleAgentTypes = new Set(
          BUILT_IN_AGENTS.filter(
            (agent) =>
              chatActiveAgentIds.includes(agent.id) &&
              agent.phase === "pre_generation" &&
              agent.id !== "html" &&
              resolveAgentResultType({ type: agent.id, settings: getDefaultBuiltInAgentSettings(agent.id) }) ===
                "context_injection",
          ).map((agent) => agent.id),
        );
        const chatActiveLorebookIds: string[] = Array.isArray(chatMeta.activeLorebookIds)
          ? (chatMeta.activeLorebookIds as string[])
          : [];
        const gameLorebookScopeExclusions = resolveGameLorebookScopeExclusions(chatMode, chatMeta);
        let presetHandledLorebooks = false;
        const presetHasLorebookMarker = (sections: Array<{ isMarker: string; markerConfig: string | null }>) =>
          sections.some((section) => {
            if (section.isMarker !== "true" || !section.markerConfig) return false;
            try {
              const markerType = (JSON.parse(section.markerConfig) as { type?: unknown }).type;
              return (
                markerType === "lorebook" || markerType === "world_info_before" || markerType === "world_info_after"
              );
            } catch {
              return false;
            }
          });
        const promptGroupResponseOrder = (chatMeta.groupResponseOrder as string) ?? "sequential";
        const promptGroupChatMode =
          chatMode === "conversation"
            ? promptGroupResponseOrder === "manual"
              ? "individual"
              : "merged"
            : ((chatMeta.groupChatMode as string) ?? "merged");
        const manualPromptTargetCharId =
          promptGroupResponseOrder === "manual" &&
          typeof input.forCharacterId === "string" &&
          characterIds.includes(input.forCharacterId)
            ? input.forCharacterId
            : null;
        const promptCharacterIds = manualPromptTargetCharId ? [manualPromptTargetCharId] : characterIds;
        const deferCharacterMacros =
          characterIds.length > 1 &&
          promptGroupChatMode === "individual" &&
          promptGroupResponseOrder !== "manual" &&
          input.impersonate !== true;
        const promptMacroContext = await buildPromptMacroContext({
          db: db,
          characterIds: promptCharacterIds,
          personaName,
          personaDescription,
          personaFields,
          variables: {},
          groupScenarioOverrideText:
            typeof chatMeta.groupScenarioText === "string" && (chatMeta.groupScenarioText as string).trim()
              ? (chatMeta.groupScenarioText as string).trim()
              : null,
          lastInput: [...mappedMessages].reverse().find((message) => message.role === "user")?.content,
          chatId: input.chatId,
          model: conn.model,
        });
        const resolvePromptMacros = (value: string) => resolveMacros(value, promptMacroContext);
        const resolvePromptMacrosForLorebook = (value: string) =>
          resolveMacrosWithVariableSnapshot(
            value,
            promptMacroContext,
            deferCharacterMacros ? { deferCharacterMacros: "names" } : undefined,
          );

        // ── Apply regex scripts to prompt message content ──
        // Macro context is available now, so regex find/replace/trim fields can use prompt macros.
        // Gated to iteration 0 because applyRegexScriptsToPromptMessages mutates
        // message.content in place — running it again on a Mari follow-up pass
        // would stack non-idempotent user regex scripts on already-rewritten text.
        // The newly appended Mari turn is run through the same transforms below
        // before it lands in runningMessagesForFollowUp, so each message still
        // gets exactly one pass.
        if (followUpIteration === 0) {
          applyRegexScriptsToPromptMessages(mappedMessages, await regexScriptsStore.list(), {
            resolveMacros: (value) => resolveMacros(value, promptMacroContext, { trimResult: false }),
          });

          // Always collapse 3+ consecutive blank lines into a double newline —
          // these waste tokens and produce messy logs regardless of user regex settings.
          // Matches pure newlines AND lines that contain only whitespace.
          for (const msg of mappedMessages) {
            msg.content = msg.content.replace(/\n([ \t]*\n){2,}/g, "\n\n");
          }
        }
        promptMacroContext.lastInput = [...mappedMessages]
          .reverse()
          .find((message) => message.role === "user")?.content;
        const toLorebookScanMessages = () =>
          buildLorebookScanMessagesWithGenerationGuide(
            mappedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            input,
          );

        // ── Compute chat embedding for semantic lorebook matching (if any entries are vectorized) ──
        sendProgress("embedding");
        const _tEmbed = Date.now();
        let chatContextEmbedding: number[] | null = null;
        const knowledgeRouterActivatedLorebookEntryIds = new Set<string>();
        const knowledgeRouterExcludedLorebookEntryIds = new Set<string>();
        let knowledgeRouterActivationPassCompleted = false;
        try {
          const activeEntries = (await lorebooksStore.listActiveEntries({
            chatId: input.chatId,
            characterIds: promptCharacterIds,
            personaId,
            activeLorebookIds: chatActiveLorebookIds,
            excludedLorebookIds: gameLorebookScopeExclusions.excludedLorebookIds,
            excludedSourceAgentIds: gameLorebookScopeExclusions.excludedSourceAgentIds,
          })) as LorebookEntry[];
          await warmLorebookEntryEmbeddings(db, activeEntries, {
            embeddingSource: memoryRecallEmbeddingSource,
            batchSize: 32,
          });
          const hasEmbeddableEntries = activeEntries.length > 0;
          if (hasEmbeddableEntries) {
            const recentMsgs = mappedMessages
              .slice(-10)
              .map((m) => m.content)
              .join("\n");
            if (recentMsgs.trim()) {
              const embeddings = await embedMemoryRecallTexts([recentMsgs], {
                embeddingSource: memoryRecallEmbeddingSource,
              });
              chatContextEmbedding = embeddings[0] ?? null;
            }
          }
        } catch {
          // Embedding generation is optional — if it fails, fall back to keyword-only matching
        }
        logger.debug(`[timing] Embedding: ${Date.now() - _tEmbed}ms`);

        sendProgress("assembling");
        const _tAssemble = Date.now();
        if (presetId && resolvedPreset) {
          const preset = resolvedPreset;
          wrapFormat = (preset.wrapFormat as "xml" | "markdown" | "none") || "xml";
          const [sections, groups, choiceBlocks] = await Promise.all([
            presets.listSections(presetId),
            presets.listGroups(presetId),
            presets.listChoiceBlocksForPreset(presetId),
          ]);
          for (const section of sections) {
            if (section.enabled !== "true" || section.isMarker !== "true" || !section.markerConfig) continue;
            try {
              const markerConfig = JSON.parse(section.markerConfig) as { type?: unknown; agentType?: unknown };
              const runtimeType =
                markerConfig.type === "agent_data" && typeof markerConfig.agentType === "string"
                  ? toRuntimeAgentSectionType(markerConfig.agentType, runtimeSectionEligibleAgentTypes)
                  : null;
              if (runtimeType) runtimeAgentSectionTypes.add(runtimeType);
            } catch {
              /* ignore malformed marker config */
            }
          }
          const runtimeAgentNonce = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
          const runtimeAgentData = Object.fromEntries(
            Array.from(runtimeAgentSectionTypes).map((agentType) => {
              const tokens = makeRuntimeAgentSectionTokens(agentType, runtimeAgentNonce);
              runtimeAgentSectionTokens.set(agentType, tokens);
              return [
                agentType,
                {
                  text: tokens.placeholder,
                  startToken: tokens.start,
                  endToken: tokens.end,
                },
              ];
            }),
          );

          const assemblerInput: AssemblerInput = {
            db: db,
            preset: preset as any,
            sections: sections as any,
            groups: groups as any,
            choiceBlocks: choiceBlocks as any,
            chatChoices,
            chatId: input.chatId,
            characterIds: promptCharacterIds,
            personaId,
            personaName,
            personaDescription,
            personaFields,
            personaStats: (() => {
              if (!persona?.personaStats) return undefined;
              if (typeof persona.personaStats !== "string") return persona.personaStats;
              try {
                return JSON.parse(persona.personaStats);
              } catch {
                return undefined;
              }
            })(),
            chatMessages: mappedMessages,
            lorebookScanMessages: toLorebookScanMessages(),
            chatSummary: ((chatMeta.summary as string) ?? "").trim() || null,
            enableAgents: chatEnableAgents,
            activeAgentIds: chatActiveAgentIds,
            activeLorebookIds: chatActiveLorebookIds,
            excludedLorebookIds: gameLorebookScopeExclusions.excludedLorebookIds,
            excludedLorebookSourceAgentIds: gameLorebookScopeExclusions.excludedSourceAgentIds,
            lorebookTokenBudget: resolveLorebookTokenBudget(chatMeta),
            chatEmbedding: chatContextEmbedding,
            entryStateOverrides:
              (chatMeta.entryStateOverrides as Record<string, { ephemeral?: number | null; enabled?: boolean }>) ??
              undefined,
            entryTimingStates: (chatMeta.entryTimingStates as Record<string, LorebookEntryTimingState>) ?? undefined,
            gameState: chatMode === "game" ? await selectedGameStateForPrompt() : null,
            generationTriggers: lorebookGenerationTriggers,
            groupScenarioOverrideText:
              typeof chatMeta.groupScenarioText === "string" && (chatMeta.groupScenarioText as string).trim()
                ? (chatMeta.groupScenarioText as string).trim()
                : null,
            runtimeAgentData,
            deferCharacterMacros,
          };

          const assembled = await assemblePrompt(assemblerInput);
          presetHandledLorebooks =
            presetHasLorebookMarker(sections) ||
            assembled.lorebookDepthEntriesCount > 0 ||
            !!assembled.updatedEntryStateOverrides ||
            assembled.updatedEntryTimingStates !== undefined;
          if (assembled.lorebookActivatedEntries || assembled.lorebookBudgetSkippedEntries) {
            rememberKnowledgeRouterActivatedLorebookIds(
              knowledgeRouterActivatedLorebookEntryIds,
              knowledgeRouterExcludedLorebookEntryIds,
              {
                activatedEntries: assembled.lorebookActivatedEntries ?? [],
                budgetSkippedEntries: assembled.lorebookBudgetSkippedEntries ?? [],
              },
            );
            knowledgeRouterActivationPassCompleted = true;
          } else if (presetHandledLorebooks) {
            knowledgeRouterActivationPassCompleted = true;
          }
          finalMessages = assembled.messages;
          temperature = assembled.parameters.temperature;
          maxTokens = assembled.parameters.maxTokens;
          topP = assembled.parameters.topP ?? 1;
          topK = assembled.parameters.topK ?? 0;
          frequencyPenalty = assembled.parameters.frequencyPenalty ?? 0;
          presencePenalty = assembled.parameters.presencePenalty ?? 0;
          showThoughts = assembled.parameters.showThoughts ?? true;
          reasoningEffort = assembled.parameters.reasoningEffort ?? null;
          verbosity = assembled.parameters.verbosity ?? null;
          assistantPrefill = assembled.parameters.assistantPrefill ?? "";
          customParameters = mergeCustomParameters(customParameters, assembled.parameters.customParameters);

          const presetMaxContext = assembled.parameters.useMaxContext
            ? knownModelContext
            : normalizeMaxContext(assembled.parameters.maxContext);
          effectiveMaxContext = minContextLimit(effectiveMaxContext, presetMaxContext);

          if (assembled.updatedEntryStateOverrides) chatMeta.entryStateOverrides = assembled.updatedEntryStateOverrides;
          if (assembled.updatedEntryTimingStates) chatMeta.entryTimingStates = assembled.updatedEntryTimingStates;
          await persistLorebookRuntimeState({
            chats,
            chatId: input.chatId,
            fallbackMeta: chatMeta,
            entryStateOverrides: assembled.updatedEntryStateOverrides,
            entryTimingStates: assembled.updatedEntryTimingStates,
          });
        }

        // ── Conversation mode: inject built-in DM-style system prompt when no preset ──
        let convoAwarenessBlock: string | null = null;
        if (!presetId && chatMode === "conversation") {
          const convoResult = await buildConversationPrompt(
            {
              db, chats, chars, agentsStore, lorebooksStore, conn,
              reply, input, chat, chatMeta, chatMessages, characterIds, personaId,
              personaName, presetId, chatMode, sendProgress, contextMessageLimit,
              scopedMessages, resolvePromptMacros, conversationCommandsEnabled,
              baseUrl, gameStateStore,
            },
            finalMessages,
          );
          if (convoResult.earlyExit) return;
          finalMessages = convoResult.finalMessages;
          chatMessages = convoResult.chatMessages;
          chatMeta = convoResult.chatMeta;
          conversationCommandsReminder = convoResult.conversationCommandsReminder;
          convoAwarenessBlock = convoResult.convoAwarenessBlock;
        }

        // ── Language learning mode: inject tutor system prompt when no preset ──
        if (!presetId && chatMode === "language_learning") {
          const langConfig = chatMeta.languageLearning as
            | import("./language-learning-prompt-builder.js").LanguageLearningConfig
            | undefined;
          if (langConfig) {
            let tutorName = "Tutor";
            const firstCharId = characterIds[0];
            if (firstCharId) {
              try {
                const charRow = await chars.getById(firstCharId);
                if (charRow) {
                  const parsed = typeof charRow.data === "string" ? JSON.parse(charRow.data) : charRow.data;
                  tutorName = parsed.name ?? "Tutor";
                }
              } catch { /* use default */ }
            }
            const sysPrompt = buildLanguageLearningSystemPrompt(langConfig, tutorName);
            if (finalMessages[0]?.role === "system") {
              finalMessages[0] = {
                ...finalMessages[0],
                content: sysPrompt + "\n\n" + finalMessages[0].content,
              };
            } else {
              finalMessages.unshift({ role: "system", content: sysPrompt });
            }
          }
        }

        const isSceneChat = chatMeta.sceneStatus === "active";


        // ── Connection defaults + per-chat overrides (Chat Settings → Advanced Parameters) ──
        const resolved = resolveGenerationParameters(
          { temperature, maxTokens, topP, topK, frequencyPenalty, presencePenalty, showThoughts, reasoningEffort, verbosity, assistantPrefill, customParameters, effectiveMaxContext },
          { conn, chatMeta, chatMode, isSceneChat, knownModelContext },
        );
        ({
          temperature,
          maxTokens,
          topP,
          topK,
          frequencyPenalty,
          presencePenalty,
          showThoughts,
          reasoningEffort,
          verbosity,
          assistantPrefill,
          customParameters,
          effectiveMaxContext,
        } = resolved);
        const { resolvedEffort, enableThinking } = resolved;

        // Create provider
        const provider = createGenerationProvider(conn, baseUrl);


        const agentResult = await resolveAgentPipeline({
          agentsStore,
          connections,
          conn,
          provider,
          chars,
          earlyMeta,
          chatMeta,
          input,
          chatMode,
          characterIds,
          allChatMessages,
          chatActiveAgentIds,
          chatEnableAgents,
        });
        const {
          resolvedAgents,
          agentProviderCache,
          agentConnectionWarnings,
          responseOrchestratorSelectorAgent,
          responseOrchestratorSelectorUnavailable,
          charInfo,
          characterMacroProfilesById,
          resolveGameDiscordSpeakerName,
          enabledConfigs,
          builtInAgentTypes,
        } = agentResult;

        const isGroupChat = characterIds.length > 1;
        const groupResponseOrder = (chatMeta.groupResponseOrder as string) ?? "sequential";
        const groupChatMode =
          chatMode === "conversation"
            ? groupResponseOrder === "manual"
              ? "individual"
              : "merged"
            : ((chatMeta.groupChatMode as string) ?? "merged");

        const injectionResult = await injectContext(
          {
            db, chats, chars, agentsStore, lorebooksStore,
            reply, input, chat, chatMeta, chatMessages, chatMode,
            characterIds, personaId, personaName, personaDescription,
            personaFields, persona,
            conn, provider, baseUrl, abortController,
            sendProgress,
            presetId, chatContextEmbedding, memoryRecallEmbeddingSource,
            wrapFormat, chatActiveLorebookIds, gameLorebookScopeExclusions,
            lorebookGenerationTriggers, presetHandledLorebooks,
            knowledgeRouterActivationPassCompleted,
            knowledgeRouterActivatedLorebookEntryIds,
            knowledgeRouterExcludedLorebookEntryIds,
            resolvePromptMacros, resolvePromptMacrosForLorebook,
            toLorebookScanMessages, promptCharacterIds, promptMacroContext,
            deferCharacterMacros,
            isSceneChat, mappedMessages, scopedMessages,
            isGroupChat, groupChatMode, groupResponseOrder,
            allChatMessages, charInfo,
            selectedGameStateForPrompt, selectedGameStateSnapshotPromise,
            convoAwarenessBlock,
            manualPromptTargetCharId,
            connectionMaxContext, effectiveMaxContext,
            isDebug, requestDebug, debugLog,
          },
          finalMessages,
        );
        finalMessages = injectionResult.finalMessages;
        chatMeta = injectionResult.chatMeta;
        presetHandledLorebooks = injectionResult.presetHandledLorebooks;
        knowledgeRouterActivationPassCompleted = injectionResult.knowledgeRouterActivationPassCompleted;

        if (chatMode === "conversation" && conversationCommandsReminder && !input.impersonate) {
          finalMessages.push({ role: "user" as const, content: conversationCommandsReminder });
          logger.debug(
            "[generate/conversation] Injected commands reminder (%d chars) as last user message",
            conversationCommandsReminder.length,
          );
        }

        const roleplayDmCommandsEnabled =
          (chatMode === "roleplay" || chatMode === "visual_novel") &&
          chatMeta.roleplayDmCommandsEnabled === true &&
          !input.impersonate;
        if (roleplayDmCommandsEnabled) {
          const dmTargetHint =
            charInfo
              .map((character) => character.name.replace(/"/g, "'"))
              .filter(Boolean)
              .join(" | ") || "character name";
          const dmCommandReminder = resolvePromptMacros(
            [
              `<dm_commands>`,
              `Optional hidden command, use only when it naturally fits the scene:`,
              `- [dm: character="${dmTargetHint}" message="short text"] - only if a roleplay character sends {{user}} a direct message through a phone, communicator, letter app, terminal, or similar in-world channel. Marinara strips the command from the roleplay reply and posts the full message into the linked conversation when one exists; otherwise it creates a new DM conversation with that character.`,
              `Do not also quote the exact same direct-message text in the roleplay narration unless the user should see it in both places.`,
              `</dm_commands>`,
            ].join("\n"),
          );
          const lastUserIdx = findLastIndex(finalMessages, "user");
          if (lastUserIdx >= 0) {
            const target = finalMessages[lastUserIdx]!;
            finalMessages[lastUserIdx] = { ...target, content: `${target.content}\n\n${dmCommandReminder}` };
          } else {
            finalMessages.push({ role: "user" as const, content: dmCommandReminder });
          }
          logger.debug(
            "[generate/roleplay] Injected DM command reminder (%d chars) into last user message",
            dmCommandReminder.length,
          );
        }

        // Auto-enable speaker colors for conversation mode groups (system prompt already requests tags)
        const groupSpeakerColors = chatMeta.groupSpeakerColors === true || (chatMode === "conversation" && isGroupChat);

        if (isGroupChat && chatMode !== "conversation") {
          // Strip <speaker> tags from history to save tokens in roleplay mode.
          // Just remove the tags, keep the dialogue content as-is.
          const speakerCloseRegex = /<\/speaker>/g;
          for (let i = 0; i < finalMessages.length; i++) {
            const msg = finalMessages[i]!;
            if (msg.role === "system") continue;
            if (msg.content.includes("<speaker=")) {
              let converted = msg.content;
              converted = converted.replace(/<speaker="[^"]*">/g, "");
              converted = converted.replace(speakerCloseRegex, "");
              converted = converted.replace(/^\s*\n/gm, "").trim();
              finalMessages[i] = { ...msg, content: converted };
            }
          }
        }

        if (isGroupChat) {
          // Inject group chat instructions at the end of the last user message
          const groupInstructions: string[] = [];

          if (groupChatMode === "merged" && groupSpeakerColors && chatMode !== "conversation") {
            const charNames = charInfo.map((c) => c.name);
            groupInstructions.push(
              `- Since this is a group chat, wrap each character's dialogue in <speaker="name"> tags. Tags can appear inline with narration, they don't need to be on separate lines. Example: <speaker="${charNames[0] ?? "John"}">"Hello there,"</speaker> [action beat/dialogue tag].`,
            );
          }

          if (groupChatMode === "individual" && !input.regenerateMessageId) {
            // targetCharName is set later in the multi-char loop; for now placeholder
            // The actual injection happens per-character in the generation loop below
          }

          if (groupInstructions.length > 0) {
            const rawBlock = groupInstructions.join("\n");
            const instructionBlock = wrapFormat === "markdown" ? `\n## Group Chat\n${rawBlock}` : rawBlock;

            // Inject into the <output_format> section if present, otherwise append to last user message
            injectIntoOutputFormatOrLastUser(finalMessages, instructionBlock, { indent: true });
          }
        }

        // Get current game state (if any)
        // Prefer committed game state after a real user turn, but keep visible
        // uncommitted tracker edits authoritative for continue/impersonate flows.
        // Regenerate uses the previous assistant's tracker snapshot as the prompt baseline.
        const latestGameState = await selectedGameStateSnapshotPromise;
        const baseGameStateSnapshot = latestGameState;
        const allowLatestGameStateFallback = !input.regenerateMessageId;
        const gameState = latestGameState ? parseGameStateRow(latestGameState as Record<string, unknown>) : null;

        // Build base agent context (without mainResponse — that comes after generation)
        // Fetch enough history for the hungriest agent — individual agents trim to their own contextSize.
        const agentContextSize =
          resolvedAgents.length > 0
            ? Math.max(...resolvedAgents.map((a) => normalizeAgentContextSize(a.settings.contextSize)))
            : 5;
        const agentSlice = chatMessages.slice(-agentContextSize);

        // Batch-fetch committed game state snapshots for assistant messages in the agent context
        const assistantMsgIds = agentSlice.filter((m: any) => m.role === "assistant").map((m: any) => m.id as string);
        const committedSnapshots = await gameStateStore.getCommittedForMessages(assistantMsgIds);

        const recentMsgs = agentSlice.map((m: any) => {
          const msg: AgentContext["recentMessages"][number] = {
            role: m.role as string,
            content: m.content as string,
            characterId: m.characterId ?? undefined,
          };
          if (m.role === "assistant") {
            const snapRow = committedSnapshots.get(m.id as string);
            if (snapRow) {
              msg.gameState = parseGameStateRow(snapRow as Record<string, unknown>);
            }
          }
          return msg;
        });

        const agentContext: AgentContext = {
          chatId: input.chatId,
          chatMode,
          recentMessages: recentMsgs,
          mainResponse: null,
          gameState,
          characters: charInfo,
          persona:
            personaName !== "User"
              ? {
                  name: personaName,
                  description: personaDescription,
                  personality: personaFields.personality || undefined,
                  backstory: personaFields.backstory || undefined,
                  appearance: personaFields.appearance || undefined,
                  scenario: personaFields.scenario || undefined,
                  ...(persona?.personaStats
                    ? (() => {
                        let pStats: any;
                        try {
                          pStats =
                            typeof persona.personaStats === "string"
                              ? JSON.parse(persona.personaStats)
                              : persona.personaStats;
                        } catch {
                          return {};
                        }
                        // Merge current values from gameState so the agent sees
                        // live stats instead of the persona's default config.
                        if (pStats?.bars && gameState?.personaStats && Array.isArray(gameState.personaStats)) {
                          const currentByName = new Map(
                            (gameState.personaStats as Array<{ name: string; value: number }>).map((s) => [
                              s.name,
                              s.value,
                            ]),
                          );
                          pStats.bars = pStats.bars.map((bar: any) => ({
                            ...bar,
                            value: currentByName.has(bar.name) ? currentByName.get(bar.name) : bar.value,
                          }));
                        }
                        // Only include enabled bars
                        if (pStats && !pStats.enabled) delete pStats.bars;
                        const result: Record<string, unknown> = { personaStats: pStats };
                        if (pStats?.rpgStats?.enabled) {
                          result.rpgStats = pStats.rpgStats;
                        }
                        return result;
                      })()
                    : {}),
                }
              : null,
          memory: {},
          activatedLorebookEntries: null,
          writableLorebookIds: null,
          chatSummary: ((chatMeta.summary as string) ?? "").trim() || null,
          streaming: input.streaming,
          signal: abortController.signal,
        };

        // ── Interval gating: Narrative Director only intervenes every N assistant messages ──
        const directorAgent = resolvedAgents.find((a) => a.type === "director");
        if (directorAgent) {
          const rawInterval = (directorAgent.settings as { runInterval?: unknown }).runInterval;
          const parsed =
            typeof rawInterval === "number" ? rawInterval : typeof rawInterval === "string" ? Number(rawInterval) : NaN;
          const fallback = (getDefaultBuiltInAgentSettings("director").runInterval as number) ?? 5;
          const runInterval = Number.isFinite(parsed) && parsed >= 1 ? Math.min(100, Math.floor(parsed)) : fallback;
          if (runInterval > 1) {
            const lastRun = await agentsStore.getLastSuccessfulRunByType("director", input.chatId);
            if (lastRun) {
              const lastRunMsgId = lastRun.messageId;
              const lastRunIdx = allChatMessages.findIndex((m: any) => m.id === lastRunMsgId);
              const assistantMsgsSince =
                lastRunIdx >= 0 ? allChatMessages.slice(lastRunIdx + 1).filter((m: any) => m.role === "assistant") : [];
              if (assistantMsgsSince.length + 1 < runInterval) {
                resolvedAgents.splice(resolvedAgents.indexOf(directorAgent), 1);
              }
            }
          }
        }

        // Populate writable lorebook IDs for the lorebook-keeper agent
        if (resolvedAgents.some((a) => a.type === "lorebook-keeper")) {
          const { writableLorebookIds, targetLorebookId, targetLorebookName } = await resolveLorebookKeeperTarget({
            lorebooksStore,
            chatId: input.chatId,
            characterIds,
            personaId,
            activeLorebookIds: chatActiveLorebookIds,
            preferredTargetLorebookId: lorebookKeeperSettings.targetLorebookId,
          });
          agentContext.writableLorebookIds = writableLorebookIds;
          if (targetLorebookId) {
            agentContext.memory._lorebookKeeperTargetLorebookId = targetLorebookId;
          }
          if (targetLorebookName) {
            agentContext.memory._lorebookKeeperTargetLorebookName = targetLorebookName;
          }

          // ── Interval gating: only run every N assistant messages ──
          const lkAgent = resolvedAgents.find((a) => a.type === "lorebook-keeper")!;
          const runInterval = (lkAgent.settings.runInterval as number) ?? 8;
          const lastRun = await agentsStore.getLastSuccessfulRunByType("lorebook-keeper", input.chatId);
          const pendingLorebookMessages = getLorebookKeeperAutomaticPendingCount(
            lorebookKeeperMessages,
            lorebookKeeperSettings.readBehindMessages,
            lastRun?.messageId ?? null,
          );
          const historicalLorebookTarget = getLorebookKeeperAutomaticTarget(
            lorebookKeeperMessages,
            lorebookKeeperSettings.readBehindMessages,
          );
          if (lorebookKeeperSettings.readBehindMessages > 0 && !historicalLorebookTarget) {
            resolvedAgents.splice(resolvedAgents.indexOf(lkAgent), 1);
          } else if (runInterval > 1 && pendingLorebookMessages < runInterval) {
            // Not enough canon messages since the last successful run — remove from pipeline.
            resolvedAgents.splice(resolvedAgents.indexOf(lkAgent), 1);
          }

          // ── Feed existing target-lorebook entries to the agent for deduplication ──
          if (resolvedAgents.some((a) => a.type === "lorebook-keeper")) {
            try {
              const existingEntries = await loadLorebookKeeperExistingEntries(lorebooksStore, targetLorebookId);
              if (existingEntries.length > 0) {
                agentContext.memory._existingLorebookEntries = existingEntries;
              }
            } catch {
              /* non-critical */
            }
          }
        }

        // If the expression agent is enabled, load available sprite expressions per character
        if (resolvedAgents.some((a) => a.type === "expression")) {
          try {
            const spriteDisplayModes = normalizeSpriteDisplayModes(chatMeta.spriteDisplayModes);
            const selectedSpriteIds = new Set(
              Array.isArray(chatMeta.spriteCharacterIds)
                ? chatMeta.spriteCharacterIds.filter((id): id is string => typeof id === "string")
                : [],
            );
            const restrictToSelectedSprites = selectedSpriteIds.size > 0;
            const perChar: Array<{
              characterId: string;
              characterName: string;
              expressions: string[];
              expressionChoices?: string[];
            }> = [];
            for (const char of agentContext.characters) {
              if (restrictToSelectedSprites && !selectedSpriteIds.has(char.id)) continue;
              const sprites = listCharacterSprites(char.id);
              if (!sprites) continue;
              const spriteCharacter = buildAvailableSpriteCharacter(char.id, char.name, sprites, spriteDisplayModes);
              if (spriteCharacter) perChar.push(spriteCharacter);
            }
            if (personaId && (!restrictToSelectedSprites || selectedSpriteIds.has(personaId))) {
              const sprites = listCharacterSprites(personaId);
              if (sprites) {
                const spritePersona = buildAvailableSpriteCharacter(
                  personaId,
                  personaName,
                  sprites,
                  spriteDisplayModes,
                );
                if (spritePersona) perChar.push(spritePersona);
              }
            }
            if (perChar.length > 0) {
              agentContext.memory._availableSprites = perChar;
            }
          } catch {
            /* non-critical */
          }
        }

        // If the background agent is enabled, load available backgrounds + tags into context
        const backgroundAgent = resolvedAgents.find((a) => a.type === "background");
        if (backgroundAgent) {
          agentContext.memory._availableBackgrounds = [];
          agentContext.memory._currentBackground = chatMeta.background ?? null;
          if (backgroundAgent.settings?.autoGenerateBackgrounds === true) {
            agentContext.memory._backgroundGenerationEnabled = true;
          }
          try {
            const { readdirSync, readFileSync, existsSync } = await import("fs");
            const { join, extname } = await import("path");
            const bgDir = join(DATA_DIR, "backgrounds");
            if (existsSync(bgDir)) {
              const exts = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]);
              const files = readdirSync(bgDir).filter((f: string) => exts.has(extname(f).toLowerCase()));

              // Load metadata (tags + original names)
              let meta: Record<string, { originalName?: string; tags: string[] }> = {};
              const metaPath = join(bgDir, "meta.json");
              if (existsSync(metaPath)) {
                try {
                  meta = JSON.parse(readFileSync(metaPath, "utf-8"));
                } catch {
                  /* */
                }
              }

              agentContext.memory._availableBackgrounds = files.map((f: string) => ({
                filename: f,
                originalName: meta[f]?.originalName ?? null,
                tags: meta[f]?.tags ?? [],
              }));
            }
          } catch {
            /* non-critical */
          }
        }

        // If the haptic agent is enabled, inject connected device info (names + capabilities) into context
        if (resolvedAgents.some((a) => a.type === "haptic")) {
          try {
            const { hapticService } = await import("../haptic/buttplug-service.js");
            // Auto-connect to Intiface Central if not already connected
            if (!hapticService.connected) {
              try {
                await hapticService.connect(getChatHapticIntifaceUrl(chatMeta));
              } catch {
                logger.warn("[haptic] Auto-connect to Intiface Central failed — is the server running?");
              }
            }
            if (hapticService.connected && hapticService.devices.length > 0) {
              agentContext.memory._connectedDevices = hapticService.devices.map((d) => ({
                name: d.name,
                index: d.index,
                capabilities: d.capabilities,
              }));
              logger.debug(`[haptic] Injected ${hapticService.devices.length} device(s) into agent context`);
            } else if (!hapticService.connected) {
              logger.warn("[haptic] Agent enabled but Intiface Central is not connected — skipping device injection");
            } else {
              logger.warn("[haptic] Agent enabled and connected, but no devices found — did you scan for devices?");
            }
          } catch (err) {
            logger.error(err, "[haptic] Failed to inject device info");
          }
        }

        // If the CYOA agent is enabled, inject previous choices for anti-repetition
        if (resolvedAgents.some((a) => a.type === "cyoa")) {
          const lastAssistantMsg = chatMessages.filter((m: any) => m.role === "assistant").at(-1);
          if (lastAssistantMsg) {
            const lastExtra = parseExtra((lastAssistantMsg as any).extra);
            if (lastExtra.cyoaChoices) {
              agentContext.memory._lastCyoaChoices = lastExtra.cyoaChoices;
            }
          }
        }

        // If the secret-plot-driver agent is enabled, load its previous state from agent memory
        const secretPlotAgent = resolvedAgents.find((a) => a.type === "secret-plot-driver");
        if (secretPlotAgent) {
          try {
            const mem = await agentsStore.getMemory(secretPlotAgent.id, input.chatId);
            const state: Record<string, unknown> = {};
            if (mem.overarchingArc) state.overarchingArc = mem.overarchingArc;
            const sceneDirections = normalizeSecretPlotSceneDirections(mem.sceneDirections);
            if (sceneDirections.length > 0) state.sceneDirections = sceneDirections;
            if (mem.pacing) state.pacing = mem.pacing;
            const recentlyFulfilled = normalizeStringArray(mem.recentlyFulfilled);
            if (recentlyFulfilled.length > 0) state.recentlyFulfilled = recentlyFulfilled;
            if (mem.staleDetected != null) state.staleDetected = mem.staleDetected;
            if (Object.keys(state).length > 0) {
              agentContext.memory._secretPlotState = state;
            }
          } catch {
            /* non-critical */
          }
        }

        // If the knowledge-retrieval agent is enabled, load lorebook + file source material
        const knowledgeRetrievalAgent = resolvedAgents.find((a) => a.type === "knowledge-retrieval");
        if (knowledgeRetrievalAgent) {
          const materialParts: string[] = [];

          // Load lorebook entries
          try {
            const sourceIds = (knowledgeRetrievalAgent.settings.sourceLorebookIds as string[]) ?? [];
            if (sourceIds.length > 0) {
              const entries = await lorebooksStore.listEntriesByLorebooks(sourceIds);
              const activeEntries = entries.filter((e: any) => e.enabled !== false);
              if (activeEntries.length > 0) {
                const formatted = activeEntries
                  .map((e: any) => {
                    const header = e.name || e.keys?.join(", ") || "Entry";
                    return `## ${header}\n${e.content}`;
                  })
                  .join("\n\n");
                materialParts.push(formatted);
              }
            }
          } catch {
            /* non-critical */
          }

          // Load uploaded file sources
          try {
            const sourceFileIds = (knowledgeRetrievalAgent.settings.sourceFileIds as string[]) ?? [];
            if (sourceFileIds.length > 0) {
              for (const fileId of sourceFileIds) {
                try {
                  const sourceInfo = await getSourceFilePath(fileId);
                  if (!sourceInfo) continue;
                  const { filePath, originalName } = sourceInfo;
                  const text = await extractFileText(filePath);
                  if (text.trim()) {
                    materialParts.push(`## File: ${originalName}\n${text}`);
                  }
                } catch {
                  /* skip unreadable or missing files */
                }
              }
            }
          } catch {
            /* non-critical */
          }

          if (materialParts.length > 0) {
            agentContext.memory._knowledgeRetrievalMaterial = materialParts.join("\n\n");
          }
        }

        // If the knowledge-router agent is enabled, load candidate lorebook entries
        // for routing. The router picks IDs from this list and the selected entries
        // are injected verbatim — no per-entry summarization pass.
        const knowledgeRouterAgent = resolvedAgents.find((a) => a.type === "knowledge-router");
        const promptCharacterIdSet = new Set(promptCharacterIds);
        const knowledgeRouterActiveCharacterTags = Array.from(
          new Set(
            charInfo
              .filter((character) => promptCharacterIdSet.has(character.id))
              .flatMap((character) => character.tags),
          ),
        );
        let knowledgeRouterEntries: LorebookEntry[] = [];
        let knowledgeRouterActivatedEntries: LorebookEntry[] = [];
        let knowledgeRouterKeywordScanEntries: LorebookEntry[] = [];
        if (knowledgeRouterAgent) {
          try {
            const sourceIds = (knowledgeRouterAgent.settings.sourceLorebookIds as string[]) ?? [];
            if (sourceIds.length > 0) {
              const entries = (await lorebooksStore.listEntriesByLorebooks(sourceIds)) as LorebookEntry[];
              // Honor per-chat entry state overrides — a user can disable an entry for
              // this chat without touching the global lorebook, and ephemeral entries
              // carry per-chat countdown state. Mirrors the projection the standard
              // lorebook activation pipeline does in services/lorebook/index.ts.
              const entryStateOverrides =
                (chatMeta.entryStateOverrides as Record<string, { enabled?: boolean; ephemeral?: number | null }>) ??
                {};
              // Skip:
              //   - Disabled entries (off-limits, by global flag or per-chat override).
              //   - Exhausted ephemeral entries (countdown reached 0 in this chat).
              //   - Entries excluded by character/tag/generation-trigger filters.
              knowledgeRouterEntries = entries
                .filter((e: LorebookEntry) => {
                  const ov = entryStateOverrides[e.id];
                  const isEnabled = ov?.enabled ?? e.enabled !== false;
                  if (!isEnabled) return false;
                  // Project the ephemeral override here so the exhaustion check uses
                  // the per-chat remaining count, not the stale global default.
                  const effectiveEphemeral = ov?.ephemeral !== undefined ? ov.ephemeral : e.ephemeral;
                  if (effectiveEphemeral === 0) return false;
                  if (
                    !lorebookEntryPassesContextFilters(e, {
                      activeCharacterIds: promptCharacterIds,
                      activeCharacterTags: knowledgeRouterActiveCharacterTags,
                      generationTriggers: lorebookGenerationTriggers,
                    })
                  ) {
                    return false;
                  }
                  return true;
                })
                .map((e: LorebookEntry) => {
                  const ov = entryStateOverrides[e.id];
                  return ov?.ephemeral !== undefined ? { ...e, ephemeral: ov.ephemeral } : e;
                });
              knowledgeRouterActivatedEntries = knowledgeRouterEntries.filter((entry) =>
                knowledgeRouterActivatedLorebookEntryIds.has(entry.id),
              );
              knowledgeRouterKeywordScanEntries = knowledgeRouterActivationPassCompleted
                ? knowledgeRouterEntries.filter(
                    (entry) =>
                      !knowledgeRouterActivatedLorebookEntryIds.has(entry.id) &&
                      !knowledgeRouterExcludedLorebookEntryIds.has(entry.id),
                  )
                : knowledgeRouterEntries;
            }
          } catch (err) {
            // Non-critical: the router simply skips this turn if loading fails. Log
            // so the failure is diagnosable instead of looking like "no matches found".
            logger.warn(err, "[knowledge-router] failed to load source lorebook entries");
          }
        }

        // ────────────────────────────────────────
        // Automated Chat Summary — interval gating
        // ────────────────────────────────────────
        // Only run if the Automated Chat Summary agent is in the pipeline.
        // It triggers every N user messages (configured via `runInterval` in the agent settings).
        // The context size for summary generation comes from the chat's summaryContextSize metadata.
        if (resolvedAgents.some((a) => a.type === "chat-summary")) {
          const csAgent = resolvedAgents.find((a) => a.type === "chat-summary")!;
          const triggersAfter = (csAgent.settings.runInterval as number) ?? 5;
          let shouldRun = true;

          if (triggersAfter > 1) {
            const lastRun = await agentsStore.getLastSuccessfulRunByType("chat-summary", input.chatId);
            if (lastRun) {
              const lastRunMsgId = lastRun.messageId;
              const lastRunIdx = allChatMessages.findIndex((m: any) => m.id === lastRunMsgId);
              const userMsgsSince =
                lastRunIdx >= 0 ? allChatMessages.slice(lastRunIdx + 1).filter((m: any) => m.role === "user") : [];
              // +1 for the current user message being generated
              if (userMsgsSince.length + 1 < triggersAfter) {
                shouldRun = false;
              }
            }
            // First run ever: allow it to proceed
          }

          if (!shouldRun) {
            resolvedAgents.splice(resolvedAgents.indexOf(csAgent), 1);
          } else {
            // Override the agent's context size with the chat-level summaryContextSize
            const summaryCtxSize = (chatMeta.summaryContextSize as number) || 50;
            csAgent.settings = { ...csAgent.settings, contextSize: summaryCtxSize };
          }
        }

        // ────────────────────────────────────────
        // Tracker Data Injection
        // ────────────────────────────────────────
        // The Card Evolution Auditor proposes user-facing character-card edits,
        // so gate it by assistant-message cadence instead of auditing every turn.
        if (resolvedAgents.some((a) => a.type === "card-evolution-auditor")) {
          const ceaAgent = resolvedAgents.find((a) => a.type === "card-evolution-auditor")!;
          const defaultInterval = (getDefaultBuiltInAgentSettings("card-evolution-auditor").runInterval as number) ?? 8;
          const runInterval = (ceaAgent.settings.runInterval as number) ?? defaultInterval;

          if (runInterval > 1) {
            const lastRun = await agentsStore.getLastSuccessfulRunByType("card-evolution-auditor", input.chatId);
            if (lastRun) {
              const lastRunIdx = allChatMessages.findIndex((m: any) => m.id === lastRun.messageId);
              const assistantMsgsSince =
                lastRunIdx >= 0 ? allChatMessages.slice(lastRunIdx + 1).filter((m: any) => m.role === "assistant") : [];
              if (assistantMsgsSince.length + 1 < runInterval) {
                resolvedAgents.splice(resolvedAgents.indexOf(ceaAgent), 1);
              }
            }
          }
        }

        // Always inject committed tracker data as a system message regardless of
        // preset configuration. This replaces the old agent_data marker approach.
        if (chatEnableAgents && chatActiveAgentIds.length > 0) {
          const active = new Set(chatActiveAgentIds);
          const hasWorldState = active.has("world-state");
          const hasCharTracker = active.has("character-tracker");
          const hasPersonaStats = active.has("persona-stats");
          const hasQuest = active.has("quest");
          const hasCustomTracker = active.has("custom-tracker");

          if (hasWorldState || hasCharTracker || hasPersonaStats || hasQuest || hasCustomTracker) {
            const snap = latestGameState ?? undefined;

            if (snap) {
              const trackerParts: string[] = [];

              // World state core fields
              if (hasWorldState) {
                const wsParts: string[] = [];
                if (snap.date) wsParts.push(`Date: ${snap.date}`);
                if (snap.time) wsParts.push(`Time: ${snap.time}`);
                if (snap.location) wsParts.push(`Location: ${snap.location}`);
                if (snap.weather) wsParts.push(`Weather: ${snap.weather}`);
                if (snap.temperature) wsParts.push(`Temperature: ${snap.temperature}`);
                if (wsParts.length > 0) trackerParts.push(wrapContent(wsParts.join("\n"), "World", wrapFormat));
              }

              // Present Characters
              if (hasCharTracker) {
                const presentChars = JSON.parse(snap.presentCharacters);
                if (Array.isArray(presentChars) && presentChars.length > 0) {
                  const charLines = presentChars.map((c: any) => {
                    if (typeof c === "string") return `- ${c}`;
                    const details: string[] = [];
                    if (c.mood) details.push(`mood: ${c.mood}`);
                    if (c.appearance) details.push(`appearance: ${c.appearance}`);
                    if (c.outfit) details.push(`outfit: ${c.outfit}`);
                    if (c.thoughts) details.push(`thoughts: ${c.thoughts}`);
                    if (Array.isArray(c.stats) && c.stats.length > 0) {
                      const statStr = c.stats
                        .map((s: any) => `${s.name}: ${s.value}${s.max ? `/${s.max}` : ""}`)
                        .join(", ");
                      details.push(`stats: ${statStr}`);
                    }
                    const detailStr = details.length > 0 ? ` (${details.join("; ")})` : "";
                    return `- ${c.emoji ?? ""} ${c.name ?? c}${detailStr}`;
                  });
                  trackerParts.push(wrapContent(charLines.join("\n"), "Present Characters", wrapFormat));
                }
              }

              // Persona Stats (needs/condition bars)
              if (hasPersonaStats && snap.personaStats) {
                const psBars =
                  typeof snap.personaStats === "string" ? JSON.parse(snap.personaStats) : snap.personaStats;
                if (Array.isArray(psBars) && psBars.length > 0) {
                  const barLines = psBars.map((b: any) => `- ${b.name}: ${b.value}/${b.max}`);
                  trackerParts.push(wrapContent(barLines.join("\n"), "Persona Stats", wrapFormat));
                }
              }

              // Player stats: quests, inventory, stats, custom tracker
              if (snap.playerStats) {
                const stats = typeof snap.playerStats === "string" ? JSON.parse(snap.playerStats) : snap.playerStats;

                if (hasPersonaStats && stats.status) {
                  trackerParts.push(wrapContent(`Status: ${stats.status}`, "Status", wrapFormat));
                }

                if (hasQuest && Array.isArray(stats.activeQuests) && stats.activeQuests.length > 0) {
                  const questLines = stats.activeQuests.map((q: any) => {
                    const objectives = Array.isArray(q.objectives)
                      ? q.objectives.map((o: any) => `  ${o.completed ? "[x]" : "[ ]"} ${o.text}`).join("\n")
                      : "";
                    return `- ${q.name}${q.completed ? " (completed)" : ""}${objectives ? "\n" + objectives : ""}`;
                  });
                  trackerParts.push(wrapContent(questLines.join("\n"), "Active Quests", wrapFormat));
                }

                if (hasPersonaStats && Array.isArray(stats.inventory) && stats.inventory.length > 0) {
                  const invLines = stats.inventory.map(
                    (item: any) =>
                      `- ${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ""}${item.description ? ` — ${item.description}` : ""}`,
                  );
                  trackerParts.push(wrapContent(invLines.join("\n"), "Inventory", wrapFormat));
                }

                if (hasPersonaStats && Array.isArray(stats.stats) && stats.stats.length > 0) {
                  const statLines = stats.stats.map((s: any) => `- ${s.name}: ${s.value}${s.max ? `/${s.max}` : ""}`);
                  trackerParts.push(wrapContent(statLines.join("\n"), "Stats", wrapFormat));
                }

                if (
                  hasCustomTracker &&
                  Array.isArray(stats.customTrackerFields) &&
                  stats.customTrackerFields.length > 0
                ) {
                  const customLines = stats.customTrackerFields.map((f: any) => `- ${f.name}: ${f.value}`);
                  trackerParts.push(wrapContent(customLines.join("\n"), "Custom Tracker", wrapFormat));
                }
              }

              // Inject player notes if present
              const playerNotes = typeof chatMeta.gamePlayerNotes === "string" ? chatMeta.gamePlayerNotes.trim() : "";
              if (playerNotes) {
                trackerParts.push(
                  wrapContent(
                    `The player has written these personal notes. Consider them when narrating — they reflect what the player is tracking, their theories, and plans:\n${playerNotes}`,
                    "Player Notes",
                    wrapFormat,
                  ),
                );
              }

              if (trackerParts.length > 0) {
                const contextBlock =
                  wrapFormat === "none"
                    ? trackerParts.join("\n\n")
                    : wrapFormat === "xml"
                      ? `<context>\n${trackerParts.map((p) => "    " + p.replace(/\n/g, "\n    ")).join("\n")}\n</context>`
                      : `# Context\n*(Established state as of the last message. Do not re-describe — advance from here.)*\n${trackerParts.join("\n")}`;

                // Insert as system message right before the last user message.
                // When strict role formatting merges post-chat sections (like
                // Output Format) into the last user message, this ensures the
                // tracker context appears before those instructions.
                const lastUserIdx = findLastIndex(finalMessages, "user");
                if (lastUserIdx >= 0) {
                  finalMessages.splice(lastUserIdx, 0, { role: "system", content: contextBlock });
                } else {
                  finalMessages.splice(finalMessages.length, 0, { role: "system", content: contextBlock });
                }
              }
            }
          }
        }

        // SSE helper for sending agent events
        // Wrapped in try-catch: if the SSE stream is closed (e.g. client
        // navigated away), a write error must NOT crash the agent pipeline —
        // otherwise Promise.allSettled in executePhase silently drops the
        // entire group's results, causing agents to appear as "not triggered".
        const sendAgentEvent = (result: AgentResult) => {
          trySendSseEvent(reply, {
            type: "agent_result",
            data: {
              agentType: result.agentType,
              agentName: resolvedAgents.find((a) => a.type === result.agentType)?.name ?? result.agentType,
              resultType: result.type,
              data: result.data,
              success: result.success,
              error: result.error,
              durationMs: result.durationMs,
            },
          });
        };

        for (const warning of agentConnectionWarnings) {
          trySendSseEvent(reply, { type: "agent_warning", data: warning });
        }

        // Create the pipeline (exclude text rewrite/editor agents — they run last,
        // after all other post-processing agents have produced their context).
        const textRewriteAgents = resolvedAgents.filter(
          (a) => a.phase === "post_processing" && resolveAgentResultType(a) === "text_rewrite",
        );
        const textRewriteAgentIds = new Set(textRewriteAgents.map((a) => a.id));
        const lorebookKeeperAgent = resolvedAgents.find((a) => a.type === "lorebook-keeper") ?? null;
        let pipelineAgents = resolvedAgents.filter(
          (a) => !textRewriteAgentIds.has(a.id) && a.type !== "lorebook-keeper",
        );

        // When manualTrackers is enabled, strip tracker-category agents from the
        // automatic pipeline — the user will trigger them manually via retry-agents.
        const manualTrackers = chatMeta.manualTrackers === true;
        if (manualTrackers) {
          const trackerIds = new Set(BUILT_IN_AGENTS.filter((a) => a.category === "tracker").map((a) => a.id));
          pipelineAgents = pipelineAgents.filter((a) => !trackerIds.has(a.type));
        }

        // Echo Chamber should only fire on fresh user messages, not swipes/regenerates
        if (input.regenerateMessageId) {
          pipelineAgents = pipelineAgents.filter((a) => a.type !== "echo-chamber");
        }

        // Combat agent only needs to run when an encounter is active.
        // If the last combat result stored encounterActive = false, skip it.
        if (chatMeta.encounterActive === false) {
          pipelineAgents = pipelineAgents.filter((a) => a.type !== "combat");
        }

        // ────────────────────────────────────────
        // Tool Resolution (Main Generation + Agent Pipeline)
        // ────────────────────────────────────────
        const inputBody = req.body as Record<string, unknown>;
        const enableChatTools = inputBody.enableTools === true || chatMeta.enableTools === true;
        const enableAgentTools = resolvedAgents.some((agent) => {
          const agentSettings = typeof agent.settings === "string" ? JSON.parse(agent.settings) : agent.settings || {};
          return Array.isArray(agentSettings.enabledTools) && agentSettings.enabledTools.length > 0;
        });
        const resolveTools = enableChatTools || enableAgentTools;
        let toolDefs: LLMToolDefinition[] | undefined;
        const allToolDefs: LLMToolDefinition[] = [];
        const agentOnlyToolNames = new Set([
          "read_chat_summary",
          "append_chat_summary",
          "read_chat_variable",
          "write_chat_variable",
        ]);
        const customToolDefs: Array<{
          name: string;
          executionType: string;
          webhookUrl: string | null;
          staticResult: string | null;
          scriptBody: string | null;
        }> = [];

        if (resolveTools) {
          // Per-chat tool selection (empty = all tools)
          const chatActiveToolIds: string[] = Array.isArray(chatMeta.activeToolIds)
            ? (chatMeta.activeToolIds as string[])
            : [];
          const hasToolFilter = chatActiveToolIds.length > 0;
          const registeredToolSources = new Map<string, "built-in" | "custom">();

          // Built-in tools
          for (const t of BUILT_IN_TOOLS) {
            const existingSource = registeredToolSources.get(t.name);
            if (existingSource) {
              throw new Error(
                `Duplicate tool name "${t.name}" from built-in tool collides with existing ${existingSource} tool`,
              );
            }
            registeredToolSources.set(t.name, "built-in");
            allToolDefs.push({
              type: "function" as const,
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters as unknown as Record<string, unknown>,
              },
            });
          }

          // Custom tools from DB
          const enabledCustomTools = await customToolsStore.listEnabled();
          for (const ct of enabledCustomTools) {
            const existingSource = registeredToolSources.get(ct.name);
            if (existingSource) {
              logger.warn(
                '[tools] Skipping custom tool "%s" because it collides with existing %s tool',
                ct.name,
                existingSource,
              );
              continue;
            }
            registeredToolSources.set(ct.name, "custom");

            try {
              const schema =
                typeof ct.parametersSchema === "string" ? JSON.parse(ct.parametersSchema) : ct.parametersSchema;
              if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
                throw new Error("parametersSchema must be a JSON object");
              }
              const schemaObject = schema as Record<string, unknown>;
              const schemaType = schemaObject.type;
              const schemaProperties = schemaObject.properties;
              const schemaRequired = schemaObject.required;

              if (schemaType !== undefined && schemaType !== "object") {
                throw new Error('parametersSchema root "type" must be "object"');
              }
              if (
                schemaProperties !== undefined &&
                (!schemaProperties || typeof schemaProperties !== "object" || Array.isArray(schemaProperties))
              ) {
                throw new Error('parametersSchema "properties" must be an object');
              }
              if (
                schemaType === undefined &&
                (schemaProperties === undefined || !schemaProperties || typeof schemaProperties !== "object")
              ) {
                throw new Error('parametersSchema must define root "type": "object" or include object "properties"');
              }
              if (
                schemaRequired !== undefined &&
                (!Array.isArray(schemaRequired) || schemaRequired.some((entry) => typeof entry !== "string"))
              ) {
                throw new Error('parametersSchema "required" must be an array of strings');
              }

              customToolDefs.push({
                name: ct.name,
                executionType: ct.executionType,
                webhookUrl: ct.webhookUrl,
                staticResult: ct.staticResult,
                scriptBody: ct.scriptBody,
              });

              allToolDefs.push({
                type: "function" as const,
                function: {
                  name: ct.name,
                  description: ct.description,
                  parameters: schemaObject,
                },
              });
            } catch (error) {
              registeredToolSources.delete(ct.name);
              logger.warn(
                '[tools] Skipping custom tool "%s" with invalid parameter schema: %s %s',
                ct.name,
                error instanceof Error ? error.message : "unknown error",
                String(ct.parametersSchema),
              );
            }
          }

          if (enableChatTools) {
            toolDefs = hasToolFilter
              ? allToolDefs.filter(
                  (td) => chatActiveToolIds.includes(td.function.name) && !agentOnlyToolNames.has(td.function.name),
                )
              : allToolDefs.filter((td) => !agentOnlyToolNames.has(td.function.name));
          }
        }

        // ── Spotify Token Refresh (Early) ──
        const resolvedToolNames = new Set(allToolDefs.map((td) => td.function.name));
        const chatResolvedToolNames = new Set((toolDefs ?? []).map((td) => td.function.name));
        const spotifyToolNames = new Set(DEFAULT_AGENT_TOOLS.spotify ?? []);
        const chatAllowsSpotify = Array.from(chatResolvedToolNames).some((name) => spotifyToolNames.has(name));
        const anyAgentAllowsSpotify = resolvedAgents.some((agent) => {
          const agentSettings = typeof agent.settings === "string" ? JSON.parse(agent.settings) : agent.settings || {};
          const agentEnabledNames = Array.isArray(agentSettings.enabledTools)
            ? (agentSettings.enabledTools as string[])
            : [];
          const agentResolvedNames = agentEnabledNames.filter((name) => resolvedToolNames.has(name));
          return agentResolvedNames.some((name) => spotifyToolNames.has(name));
        });
        const needsSpotify = (enableChatTools && chatAllowsSpotify) || anyAgentAllowsSpotify;
        const spotifyAgentId =
          resolvedAgents.find((agent) => agent.type === "spotify" && !agent.id.startsWith("builtin:"))?.id ??
          enabledConfigs.find((cfg: any) => cfg.type === "spotify")?.id ??
          null;
        const spotifyCredentials = needsSpotify
          ? await resolveSpotifyCredentials(agentsStore, { agentId: spotifyAgentId, refreshSkewMs: 60_000 })
          : null;
        if (spotifyCredentials && !("accessToken" in spotifyCredentials)) {
          logger.debug("[spotify] credentials unavailable for tool execution: %s", spotifyCredentials.error);
        }
        const spotifyCreds =
          spotifyCredentials && "accessToken" in spotifyCredentials
            ? { accessToken: spotifyCredentials.accessToken }
            : undefined;
        const spotifyToolsAvailable = Boolean(
          spotifyCredentials &&
          "accessToken" in spotifyCredentials &&
          spotifyHasScope(spotifyCredentials.scopes, "user-modify-playback-state"),
        );
        if (!spotifyToolsAvailable && toolDefs) {
          const beforeCount = toolDefs.length;
          toolDefs = toolDefs.filter((td) => !spotifyToolNames.has(td.function.name));
          if (beforeCount !== toolDefs.length) {
            logger.debug("[spotify] Omitted unavailable Spotify tools from main generation");
          }
        }
        const searchLorebookForTools = async (query: string, category?: string | null) => {
          const entries = await lorebooksStore.listActiveEntries({
            chatId: input.chatId,
            characterIds,
            personaId,
            activeLorebookIds: chatActiveLorebookIds,
            excludedLorebookIds: gameLorebookScopeExclusions.excludedLorebookIds,
            excludedSourceAgentIds: gameLorebookScopeExclusions.excludedSourceAgentIds,
          });
          const q = query.toLowerCase();
          return entries
            .filter((e: any) => {
              const nameMatch = e.name?.toLowerCase().includes(q);
              const contentMatch = e.content?.toLowerCase().includes(q);
              const keyMatch = (e.keys as string[])?.some((k: string) => k.toLowerCase().includes(q));
              const catMatch = !category || e.tag === category;
              return catMatch && (nameMatch || contentMatch || keyMatch);
            })
            .slice(0, 20)
            .map((e: any) => ({ name: e.name, content: e.content, tag: e.tag, keys: e.keys as string[] }));
        };
        const updateChatMetadataForTools = async (patchOrUpdater: MetadataPatchInput) => {
          let emittedPatch: Record<string, unknown> = {};
          const updatedChat = await chats.patchMetadata(input.chatId, async (currentMeta: any) => {
            const patch =
              typeof patchOrUpdater === "function" ? await patchOrUpdater({ ...currentMeta }) : patchOrUpdater;
            emittedPatch = patch;
            return patch;
          });
          const updatedMeta = updatedChat ? parseExtra(updatedChat.metadata) : { ...chatMeta, ...emittedPatch };
          for (const key of Object.keys(chatMeta)) {
            if (!(key in updatedMeta)) {
              delete chatMeta[key];
            }
          }
          Object.assign(chatMeta, updatedMeta);
          agentContext.chatSummary =
            typeof chatMeta.summary === "string" && chatMeta.summary.trim() ? chatMeta.summary.trim() : null;
          trySendSseEvent(reply, { type: "metadata_patch", data: emittedPatch });
          return updatedMeta;
        };
        const baseToolExecutionContext = {
          gameState: gameState ? (gameState as unknown as Record<string, unknown>) : undefined,
          customTools: customToolDefs,
          spotify: spotifyCreds,
          spotifyRepeatAfterPlay: gameSpotifyMusicEnabled ? ("track" as const) : undefined,
          searchLorebook: searchLorebookForTools,
          chatMeta,
          onUpdateMetadata: updateChatMetadataForTools,
        };

        // ── Resolve tool context for all agents ──
        // This enables built-in and custom tools for any agent in the pipeline.
        for (const agent of resolvedAgents) {
          if (agent.toolContext) continue;

          const agentSettings = typeof agent.settings === "string" ? JSON.parse(agent.settings) : agent.settings || {};
          const agentEnabledNames = Array.isArray(agentSettings.enabledTools)
            ? (agentSettings.enabledTools as string[])
            : [];
          if (agentEnabledNames.length === 0) continue;

          const agentTools = allToolDefs.filter(
            (td) =>
              agentEnabledNames.includes(td.function.name) &&
              (spotifyToolsAvailable || !spotifyToolNames.has(td.function.name)),
          );
          if (agentTools.length === 0) continue;
          const allowedToolNames = new Set(agentTools.map((td) => td.function.name));

          agent.toolContext = {
            tools: agentTools,
            executeToolCall: async (call) => {
              if (!allowedToolNames.has(call.function.name)) {
                return JSON.stringify({
                  error: `Tool not allowed for agent ${agent.type}: ${call.function.name}`,
                  allowed: Array.from(allowedToolNames),
                });
              }
              const results = await executeToolCalls([call], {
                ...baseToolExecutionContext,
              });
              return results[0]?.result ?? "Tool execution failed";
            },
          };
        }

        const pipeline = createAgentPipeline(pipelineAgents, agentContext, sendAgentEvent);

        // ────────────────────────────────────────
        // Phase 1: Pre-generation agents
        // ────────────────────────────────────────
        logger.debug(`[timing] Prompt assembly + context: ${Date.now() - _tAssemble}ms`);
        const agentNameByType = new Map(resolvedAgents.map((agent) => [agent.type, agent.name] as const));
        const attachAgentName = (entry: AgentInjection): AgentInjection => ({
          ...entry,
          agentName: agentNameByType.get(entry.agentType) ?? entry.agentName,
        });
        const reviewedAgentInjections: AgentInjection[] = input.agentInjectionOverrides
          .map((entry: any) =>
            attachAgentName({ agentType: entry.agentType.trim(), agentName: entry.agentName, text: entry.text }),
          )
          .filter((entry: any) => entry.agentType && entry.text.trim().length > 0);
        const reviewedAgentTypes = new Set(reviewedAgentInjections.map((entry) => entry.agentType));
        let contextInjections: AgentInjection[] = reviewedAgentInjections;

        const preGenResult = await runPreGeneration(
          {
            db, app, chats, agentsStore, reply, input,
            chatMeta, chatMessages: chatMessages, chatMode,
            characterIds, personaId, personaName, personaDescription, personaFields,
            conn, provider, baseUrl,
            abortController, isDebug, sendProgress, sendAgentEvent,
            resolvedAgents, pipelineAgents, pipeline, agentContext,
            wrapFormat, runtimeAgentSectionTokens,
            knowledgeRetrievalAgent, knowledgeRouterAgent, knowledgeRouterEntries,
            secretPlotAgent, lorebookKeeperAgent,
            reviewedAgentTypes, reviewedAgentInjections, allChatMessages,
            gameState, contextInjections,
            memoryRecallEmbeddingSource,
            knowledgeRouterActivationPassCompleted,
            knowledgeRouterActivatedEntries,
            knowledgeRouterKeywordScanEntries,
            toLorebookScanMessages,
            promptCharacterIds,
            knowledgeRouterActiveCharacterTags,
            lorebookGenerationTriggers,
            builtInAgentTypes,
            runtimeSectionEligibleAgentTypes,
            regenMsg,
            enabledConfigs,
          },
          finalMessages,
        );
        if (preGenResult.abortGeneration) return;
        contextInjections = preGenResult.contextInjections;
        finalMessages = preGenResult.finalMessages;

        // ── Early exit if client disconnected during knowledge retrieval / injection ──
        if (abortController.signal.aborted) return;
        let allResponses: string[] = [];
        let fullResponse = "";
        let fullThinking = "";
        let providerThinking = "";
        // Phase 2: Fire parallel agents alongside the main generation
        const hasParallelAgents = pipelineAgents.some((a) => a.phase === "parallel");
        let parallelPromise: Promise<AgentResult[]> | null = null;
        if (hasParallelAgents && !abortController.signal.aborted) {
          parallelPromise = pipeline.runParallel();
        }

        // ── Run generation ──
        const normalizedGenerationGuide = typeof input.generationGuide === "string" ? input.generationGuide.trim() : "";
        const generationGuideInstruction = normalizedGenerationGuide
          ? `Take the following into special consideration for your next message: ${normalizedGenerationGuide}`
          : null;

        const streamResult = await runStreamingGeneration(
          {
            db, app, chats, chars, gameStateStore, agentsStore,
            reply, input, chat, chatMeta, chatMessages, chatMode,
            characterIds, charInfo, personaName, personaDescription, personaFields,
            conn, provider, abortController, isDebug, requestDebug, debugLog,
            discordWebhookUrl, encryptedReasoningCache,
            temperature, maxTokens, topP, topK, frequencyPenalty, presencePenalty,
            showThoughts, enableThinking, resolvedEffort, reasoningEffort,
            verbosity, assistantPrefill, customParameters, effectiveMaxContext,
            connectionMaxContext,
            resolvedAgents, toolDefs: toolDefs ?? [], chatResolvedToolNames, contextInjections,
            wrapFormat, conversationCommandsEnabled, roleplayDmCommandsEnabled,
            isGroupChat, groupChatMode, groupResponseOrder, deferCharacterMacros,
            characterMacroProfilesById, baseGameStateSnapshot,
            responseOrchestratorSelectorAgent, responseOrchestratorSelectorUnavailable,
            sendProgress,
            enableChatTools,
            baseToolExecutionContext,
            resolveGameDiscordSpeakerName,
            regenMsg,
          },
          finalMessages,
          generationGuideInstruction,
          followUpIteration,
          firstSavedMsg,
          collectedCommands,
          collectedOocMessages,
          generationComplete,
          conversationAssistantSaved,
        );
        if (!streamResult) return;
        firstSavedMsg = streamResult.firstSavedMsg;
        lastSavedMsg = streamResult.lastSavedMsg;
        allResponses = streamResult.allResponses;
        fullResponse = streamResult.fullResponse;
        fullThinking = streamResult.fullThinking;
        providerThinking = streamResult.providerThinking;
        generationComplete = streamResult.generationComplete;
        conversationAssistantSaved = streamResult.conversationAssistantSaved;
        chatMeta = streamResult.chatMeta;

        // ────────────────────────────────────────
        // Collect parallel results + Phase 3: Post-processing agents (delegated)
        // ────────────────────────────────────────
        const postResult = await runPostProcessing({
          db, app, chats, chars, connections, agentsStore, gameStateStore,
          lorebooksStore, customToolsStore, regexScriptsStore,
          reply, input, chat, chatMeta, chatMessages, chatMode, characterIds,
          personaName, personaDescription, personaFields, conn, provider, baseUrl,
          abortController, isDebug, debugLog, discordWebhookUrl, memoryRecallEmbeddingSource,
          resolvedAgents, pipelineAgents, pipeline, agentProviderCache,
          agentConnectionWarnings, contextInjections, parallelPromise,
          allResponses, allChatMessages, chatChoices, firstSavedMsg, lastSavedMsg,
          collectedCommands, collectedOocMessages,
          effectiveMaxContext, showThoughts, resolvedEffort, reasoningEffort,
          verbosity, customParameters, chatEnableAgents,
          lorebookKeeperAgent, lorebookKeeperMessages, lorebookKeeperSettings,
          secretPlotAgent, gameState, charInfo, agentContext, baseGameStateSnapshot,
          allowLatestGameStateFallback, persona, personaId, textRewriteAgents,
          sendProgress, updateChatMetadataForTools, sendAgentEvent,
        });
        pendingIllustration = postResult.pendingIllustration;

        // ────────────────────────────────────────
        // Character Command Execution (Conversation mode) — delegated
        // ────────────────────────────────────────
        const commandResult = await dispatchCharacterCommands(
          {
            db,
            app,
            chats,
            chars,
            connections,
            conn,
            lorebooksStore,
            agentsStore,
            presets,
            reply,
            input,
            chat,
            chatMeta,
            characterIds,
            charInfo,
            chatMode,
            fullResponse,
            baseUrl,
            abortController,
          },
          collectedCommands,
        );
        mariFetchSucceededThisIteration = commandResult.mariFetchSucceeded;

        // ── Trigger follow-up generation if Professor Mari's fetch landed ──
        // Mari's fetched payload was persisted to chatMeta.mariContext by the
        // fetch handler above, but mariContext is only read into the prompt at
        // the start of a generation pass — without a follow-up turn Mari would
        // go silent right after the fetch snackbar. Gating on the success flag
        // (rather than just the presence of a parsed [fetch:]) avoids burning
        // an extra pass when the fetch handler found nothing or threw.
        if (
          mariFetchSucceededThisIteration &&
          chatMode === "conversation" &&
          !input.impersonate &&
          !input.regenerateMessageId &&
          !abortController.signal.aborted &&
          followUpIteration < MAX_FOLLOW_UP_ITERATIONS
        ) {
          followUpIteration++;
          logger.info(
            "[generate] Professor Mari fetch succeeded; triggering follow-up generation (iteration %d)",
            followUpIteration,
          );

          // Carry the just-streamed assistant turn into the next prompt so
          // Mari sees her own prior message before speaking again. Apply the
          // same regex-script + blank-line compaction transforms here, since
          // the iteration-0 block above only runs on the original history.
          const lastResponseText = allResponses.join("\n\n");
          if (lastResponseText) {
            const newMariMsg: { role: "assistant"; content: string } = {
              role: "assistant",
              content: lastResponseText,
            };
            applyRegexScriptsToPromptMessages([newMariMsg], await regexScriptsStore.list(), {
              resolveMacros: (value) => resolveMacros(value, promptMacroContext, { trimResult: false }),
            });
            newMariMsg.content = newMariMsg.content.replace(/\n([ \t]*\n){2,}/g, "\n\n");
            runningMessagesForFollowUp.push(newMariMsg);
          }

          // Re-read chat metadata so the freshly-persisted mariContext is
          // visible to the next pass.
          const freshChat = await chats.getById(input.chatId);
          if (freshChat) {
            chatMeta = parseExtra(freshChat.metadata) as Record<string, unknown>;
          }

          // Reset hoisted per-iteration accumulators before continuing.
          // (firstSavedMsg stays — it's "first across the whole turn".
          //  lastSavedMsg, pendingIllustration are overwritten naturally.)
          collectedCommands.length = 0;
          collectedOocMessages.length = 0;

          continue;
        }

        // ── Background: chunk & embed new messages for memory recall ──
        // Runs once on the final iteration (fire-and-forget). Lives inside the
        // loop because charInfo is scoped here; only executes when we break.
        {
          const charNameMap: Record<string, string> = {};
          for (const ci of charInfo) {
            charNameMap[ci.id] = ci.name;
          }

          // ── Background: summarize oldest messages if above threshold (Tier 2) ──
          summarizeOldestBatch({
            messages: allChatMessages,
            nameMap: { userName: personaName, characterNames: charNameMap },
            provider: {
              chatComplete: async (msgs, opts) => {
                const res = await provider.chatComplete(msgs, opts);
                return { content: res.content ?? "" };
              },
            },
            model: conn.model,
          }).then(async (result) => {
            if (!result) return;
            await saveSummary({
              db: db,
              chatId: input.chatId,
              summary: result.summary,
              messageCount: result.messageCount,
              firstMessageId: result.firstMessageId,
              lastMessageId: result.lastMessageId,
              firstMessageAt: result.firstMessageAt,
              lastMessageAt: result.lastMessageAt,
              tokenEstimate: result.tokenEstimate,
            });
            const freshChat = await chats.getById(input.chatId);
            if (freshChat) {
              const freshMeta = parseExtra(freshChat.metadata) as Record<string, unknown>;
              const updated = updateWatermark(freshMeta, result.lastMessageAt);
              await chats.updateMetadata(input.chatId, updated);
            }
          }).catch((err) => logger.error(err, "[memory-tier2] Background summarization failed"));

          chunkAndEmbedMessages(
            db,
            input.chatId,
            { userName: personaName, characterNames: charNameMap },
            { embeddingSource: memoryRecallEmbeddingSource },
          ).catch((err) => logger.error(err, "[memory-recall] Background chunking failed"));
        }
        break;
      } // end of Professor Mari follow-up loop

      // ── Post OOC messages to connected conversation (Roleplay → Conversation) ──
      if (collectedOocMessages.length > 0 && chat.connectedChatId && !abortController.signal.aborted) {
        try {
          for (const oocText of collectedOocMessages) {
            await chats.createMessage({
              chatId: chat.connectedChatId as string,
              role: "assistant",
              characterId: lastSavedMsg?.characterId ?? characterIds[0] ?? null,
              content: oocText,
            });
          }
          logger.info(
            `[generate] Posted ${collectedOocMessages.length} OOC message(s) to conversation ${chat.connectedChatId}`,
          );
          reply.raw.write(
            `data: ${JSON.stringify({ type: "ooc_posted", data: { chatId: chat.connectedChatId, count: collectedOocMessages.length } })}\n\n`,
          );
        } catch (oocErr) {
          logger.error(oocErr, "[generate] Failed to post OOC messages");
        }
      }

      // Wait for illustration to finish before closing the SSE stream
      if (pendingIllustration) {
        try {
          await pendingIllustration;
        } catch {
          /* errors already handled inside the promise */
        }
      }

      // Signal completion
      sendSseEvent(reply, { type: "done", data: "" });
    } catch (err) {
      const message =
        err instanceof Error
          ? (err as { cause?: unknown }).cause instanceof Error
            ? `${err.message}: ${(err as { cause?: Error }).cause!.message}`
            : err.message
          : "Generation failed";
      sendSseEvent(reply, { type: "error", data: message });
    } finally {
      if (conversationGenerationStartedAt != null && !conversationAssistantSaved) {
        clearGenerationInProgress(input.chatId, conversationGenerationStartedAt);
      }
      reply.raw.off("close", onClose);
      if (activeGenerations) activeGenerations.delete(input.chatId);
      if (!clientDisconnected && !reply.raw.destroyed) {
        reply.raw.end();
      }
    }
}
