// ──────────────────────────────────────────────
// Post-Processing Agents (Phase 3)
// ──────────────────────────────────────────────
import type { FastifyReply } from "fastify";
import {
  coerceGameStateTextValue,
  appendChatSummaryEntryToMetadata,
} from "@jumpchoice/shared";
import type {
  AgentContext,
  AgentResult,
  HapticDeviceCommand,
  ChatSummaryEntry,
  GameMap,
  GameNpc,
} from "@jumpchoice/shared";
import { resolveConnectionImageDefaults } from "../image/image-generation-defaults.js";
import { loadImageGenerationUserSettings } from "../image/image-generation-settings.js";
import { createPromptOverridesStorage } from "../storage/prompt-overrides.storage.js";
import { executeAgent } from "../agents/agent-executor.js";
import type { ResolvedAgent } from "../agents/agent-pipeline.js";
import { generateChatBackground } from "../game/game-asset-generation.js";
import { sanitizeGameNpcAvatarUrls } from "../game/npc-avatar-utils.js";
import { gameStateSnapshots as gameStateSnapshotsTable } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import {
  parseExtra,
  preserveTrackerCharacterUiFields,
} from "../../routes/generate/generate-route-utils.js";
import {
  validateSpriteExpressionEntries,
} from "../../routes/generate/expression-agent-utils.js";
import { logger } from "../../lib/logger.js";
import {
  buildHistoricalLorebookKeeperContext,
  getLorebookKeeperAutomaticTarget,
  persistLorebookKeeperUpdates,
} from "../../routes/generate/lorebook-keeper-utils.js";
import { sendSseEvent, trySendSseEvent } from "../../routes/generate/sse.js";
import type { MetadataPatchInput } from "../tools/tool-executor.js";
import {
  addLocationEntry,
  addInventoryEntry,
  upsertQuest,
  addNpcEntry,
} from "../game/journal.service.js";
import {
  syncGameMapMetaPartyPosition,
  getGameMapsFromMeta,
} from "../game/map-position.service.js";
import { DATA_DIR } from "../../utils/data-dir.js";
import {
  updateJournal,
  readBestCharacterReferenceBase64,
  normalizeHapticAgentCommand,
  normalizeHapticAgentCommands,
} from "./helpers.js";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { executeWordExtractor } from "../agents/word-extractor.js";
import { executeGrammarCorrector } from "../agents/grammar-corrector.js";
import { createLearningCoordinator } from "../learning/learning-coordinator.js";

export interface PostProcessorContext {
  db: any;
  app: any;
  chats: any;
  chars: any;
  connections: any;
  agentsStore: any;
  gameStateStore: any;
  lorebooksStore: any;
  customToolsStore: any;
  regexScriptsStore: any;
  reply: FastifyReply;
  input: any;
  chat: any;
  chatMeta: Record<string, unknown>;
  chatMessages: any[];
  chatMode: string;
  characterIds: string[];
  personaName: string;
  personaDescription: string;
  personaFields: Record<string, string | undefined>;
  conn: any;
  provider: any;
  baseUrl: string;
  abortController: AbortController;
  isDebug: boolean;
  debugLog: (message: string, ...args: any[]) => void;
  discordWebhookUrl: string | null;
  memoryRecallEmbeddingSource: any;
  resolvedAgents: ResolvedAgent[];
  pipelineAgents: any[];
  pipeline: any;
  agentProviderCache: any;
  agentConnectionWarnings: any[];
  contextInjections: any[];
  parallelPromise: Promise<AgentResult[]> | null;
  allResponses: string[];
  allChatMessages: any[];
  chatChoices: any;
  firstSavedMsg: any;
  lastSavedMsg: any;
  collectedCommands: any[];
  collectedOocMessages: string[];
  effectiveMaxContext: number | undefined;
  showThoughts: boolean;
  resolvedEffort: any;
  reasoningEffort: any;
  verbosity: any;
  customParameters: Record<string, unknown>;
  chatEnableAgents: boolean;
  lorebookKeeperAgent: ResolvedAgent | null;
  lorebookKeeperMessages: any[];
  lorebookKeeperSettings: any;
  secretPlotAgent: ResolvedAgent | undefined;
  gameState: any;
  charInfo: any[];
  agentContext: AgentContext;
  baseGameStateSnapshot: any;
  allowLatestGameStateFallback: boolean;
  persona: any;
  personaId: string | null;
  textRewriteAgents: ResolvedAgent[];
  sendProgress: (phase: string) => void;
  updateChatMetadataForTools: (patchOrUpdater: MetadataPatchInput) => Promise<Record<string, unknown>>;
  sendAgentEvent: (result: AgentResult) => void;
}

export interface PostProcessorResult {
  pendingIllustration: Promise<void> | null;
}

export async function runPostProcessing(
  ctx: PostProcessorContext,
): Promise<PostProcessorResult> {
  const {
    db,
    chats,
    connections,
    agentsStore,
    gameStateStore,
    lorebooksStore,
    reply,
    input,
    chat,
    chatMeta,
    abortController,
    isDebug,
    resolvedAgents,
    pipelineAgents,
    pipeline,
    contextInjections,
    parallelPromise,
    allResponses,
    firstSavedMsg,
    lastSavedMsg,
    lorebookKeeperAgent,
    lorebookKeeperMessages,
    lorebookKeeperSettings,
    agentContext,
    baseGameStateSnapshot,
    allowLatestGameStateFallback,
    charInfo,
    persona,
    personaId,
    personaName,
    characterIds,
    textRewriteAgents,
    sendAgentEvent,
    updateChatMetadataForTools,
    chatMode,
  } = ctx;

  // Await parallel agents that were started alongside the generation
  let parallelResults: AgentResult[] = [];
  if (parallelPromise) {
    try {
      parallelResults = await parallelPromise;
    } catch {
      // Non-critical — parallel agents may fail independently
    }
  }

  // Persist successful Narrative Director runs.
  // Interval gating uses getLastSuccessfulRunByType("director", …); those rows were
  // never inserted because only post_generation results were saved below. Pre-gen runs
  // before the assistant message exists — anchor each run to the first saved
  // assistant message from this turn so group-chat cadence counts from the
  // earliest generated response.
  const preGenAnchorMessageId =
    (firstSavedMsg as any)?.role === "assistant" ? ((firstSavedMsg as any)?.id ?? "") : "";
  if (preGenAnchorMessageId && !input.regenerateMessageId && !abortController.signal.aborted) {
    const preGenSuccessful = pipeline.results.filter((r: AgentResult) => {
      if (!r.success || r.agentType !== "director") return false;
      const cfg = pipelineAgents.find((a: any) => a.type === r.agentType);
      return cfg?.phase === "pre_generation";
    });
    for (const result of preGenSuccessful) {
      try {
        await agentsStore.saveRun({
          agentConfigId: result.agentId,
          chatId: input.chatId,
          messageId: preGenAnchorMessageId,
          result,
        });
      } catch (err) {
        logger.warn(err, "[agents] Failed to persist Narrative Director run");
      }
    }
  }

  const hasPostProcessingAgents = resolvedAgents.some((a) => a.phase === "post_processing");
  const combinedResponse = allResponses.join("\n\n");
  let lorebookKeeperProcessedMessageId = "";
  // Illustration runs asynchronously so it doesn't block other agents.
  // (pendingIllustration is hoisted above the follow-up loop.)
  const hasPostWork = hasPostProcessingAgents || parallelResults.length > 0;
  let pendingIllustration: Promise<void> | null = null;

  if (hasPostWork && combinedResponse && !abortController.signal.aborted) {
    reply.raw.write(`data: ${JSON.stringify({ type: "agent_start", data: { phase: "post_generation" } })}\n\n`);

    // LOG_LEVEL=debug: log post-processing agents
    if (isDebug) {
      const postAgents = pipelineAgents.filter((a: any) => a.phase === "post_processing");
      logger.debug(
        "[debug] Post-generation agents (%d): %s",
        postAgents.length,
        postAgents.map((a: any) => `${a.name} (${a.model})`).join(", "),
      );
    }

    let postResults = hasPostProcessingAgents
      ? [
          ...(await pipeline.postGenerate(combinedResponse, {
            preGenInjections: contextInjections,
            parallelResults,
          })),
          ...parallelResults,
        ]
      : [...parallelResults];

    if (lorebookKeeperAgent) {
      const historicalLorebookTarget = getLorebookKeeperAutomaticTarget(
        lorebookKeeperMessages,
        lorebookKeeperSettings.readBehindMessages,
      );
      const lorebookKeeperContext = historicalLorebookTarget
        ? buildHistoricalLorebookKeeperContext(agentContext, lorebookKeeperMessages, historicalLorebookTarget.id)
        : { ...agentContext, mainResponse: combinedResponse };
      const processedMessageId = historicalLorebookTarget?.id ?? (lastSavedMsg as any)?.id ?? "";

      if (lorebookKeeperContext && processedMessageId) {
        lorebookKeeperProcessedMessageId = processedMessageId;
        const lorebookKeeperResult = await executeAgent(
          lorebookKeeperAgent,
          lorebookKeeperContext,
          lorebookKeeperAgent.provider,
          lorebookKeeperAgent.model,
        );
        sendAgentEvent(lorebookKeeperResult);
        postResults.push(lorebookKeeperResult);
      }
    }

    // ── Auto-retry failed agents once ──
    const failedResults = postResults.filter((r) => !r.success);
    if (failedResults.length > 0 && !abortController.signal.aborted) {
      const retryResults: AgentResult[] = [];
      for (const failed of failedResults) {
        const agentCfg = resolvedAgents.find((a) => a.type === failed.agentType && a.type !== "editor");
        if (!agentCfg) continue;
        try {
          const historicalLorebookTarget =
            failed.agentType === "lorebook-keeper"
              ? getLorebookKeeperAutomaticTarget(
                  lorebookKeeperMessages,
                  lorebookKeeperSettings.readBehindMessages,
                )
              : null;
          const retryCtx: AgentContext = historicalLorebookTarget
            ? (buildHistoricalLorebookKeeperContext(
                agentContext,
                lorebookKeeperMessages,
                historicalLorebookTarget.id,
              ) ?? {
                ...agentContext,
                mainResponse: combinedResponse,
              })
            : { ...agentContext, mainResponse: combinedResponse };
          const retried = await executeAgent(
            agentCfg,
            retryCtx,
            agentCfg.provider,
            agentCfg.model,
            agentCfg.toolContext,
          );
          sendAgentEvent(retried);
          retryResults.push(retried);
        } catch {
          retryResults.push(failed);
        }
      }
      // Replace original failed results with retry outcomes
      postResults = postResults.map((r) => {
        if (r.success) return r;
        const retried = retryResults.find((rr) => rr.agentType === r.agentType);
        return retried ?? r;
      });

      // Notify client about agents that still failed after retry
      // Use postResults (not retryResults) so agents skipped during retry (e.g. agentCfg not found) are included
      const stillFailed = postResults.filter((r) => !r.success);
      if (stillFailed.length > 0) {
        reply.raw.write(
          `data: ${JSON.stringify({
            type: "agents_retry_failed",
            data: stillFailed.map((r) => ({
              agentType: r.agentType,
              agentName: resolvedAgents.find((agent) => agent.type === r.agentType)?.name ?? r.agentType,
              error: r.error,
            })),
          })}\n\n`,
        );
      }
    }

    // LOG_LEVEL=debug: log post-generation agent results
    if (isDebug) {
      for (const r of postResults) {
        logger.debug(
          "[debug] Agent result: %s — %s (%dms, %d tokens)%s",
          r.agentType,
          r.success ? "OK" : "FAILED",
          r.durationMs,
          r.tokensUsed,
          r.error ? ` — ${r.error}` : "",
        );
      }
    }

    // Persist agent runs to DB + handle game state updates
    // Sort so game_state_update (world-state) is processed before dependent types
    // (character_tracker_update, persona_stats_update) that merge into the snapshot.
    const RESULT_ORDER: Record<string, number> = { game_state_update: 0 };
    const sortedResults = [...postResults].sort(
      (a, b) => (RESULT_ORDER[a.type] ?? 1) - (RESULT_ORDER[b.type] ?? 1),
    );
    const messageId = (lastSavedMsg as any)?.id ?? "";
    // Determine swipe index for this generation so ALL tracker agents target the
    // same (messageId, swipeIndex) snapshot that the world-state agent creates.
    let targetSwipeIndex = 0;
    if (input.regenerateMessageId && messageId) {
      const refreshedForSwipe = await chats.getMessage(messageId);
      if (refreshedForSwipe) targetSwipeIndex = refreshedForSwipe.activeSwipeIndex ?? 0;
    }

    const resolveAgentImageConnectionId = async (agent: ResolvedAgent | undefined): Promise<string | null> => {
      let imgConnId = (agent?.settings?.imageConnectionId as string) ?? null;
      if (!imgConnId) {
        const defaultImageConn = (await connections.list()).find(
          (c: any) =>
            c.provider === "image_generation" && (c.defaultForAgents === true || c.defaultForAgents === "true"),
        );
        imgConnId = defaultImageConn?.id ?? null;
      }
      return imgConnId;
    };

    for (const result of sortedResults) {
      const resultMessageId =
        result.agentType === "lorebook-keeper" && lorebookKeeperProcessedMessageId
          ? lorebookKeeperProcessedMessageId
          : messageId;

      // Validate background agent result — reject hallucinated filenames
      if (
        result.success &&
        result.type === "background_change" &&
        result.data &&
        typeof result.data === "object"
      ) {
        const bgData = result.data as {
          chosen?: string | null;
          generate?: {
            location?: unknown;
            locationSlug?: unknown;
            slug?: unknown;
            prompt?: unknown;
            description?: unknown;
            reason?: unknown;
          } | null;
          generated?: boolean;
          error?: string;
        };
        if (typeof bgData.chosen === "string") {
          bgData.chosen = bgData.chosen.trim() || null;
        } else {
          bgData.chosen = null;
        }
        if (bgData.chosen) {
          const availableBgs = agentContext.memory._availableBackgrounds as
            | Array<{ filename: string }>
            | undefined;
          if (availableBgs) {
            const valid = availableBgs.some((b) => b.filename === bgData.chosen);
            if (!valid) {
              logger.warn(`[generate] Background agent chose "${bgData.chosen}" which doesn't exist — rejecting`);
              bgData.chosen = null;
            }
          }
        }

        const generationRequest =
          bgData.generate && typeof bgData.generate === "object" && !Array.isArray(bgData.generate)
            ? bgData.generate
            : null;
        const currentBackgroundAgent = resolvedAgents.find(
          (a) => a.id === result.agentId || a.type === "background",
        );
        const canGenerateBackground = currentBackgroundAgent?.settings?.autoGenerateBackgrounds === true;
        if (!bgData.chosen && canGenerateBackground && generationRequest) {
          const promptText =
            typeof generationRequest.prompt === "string" && generationRequest.prompt.trim()
              ? generationRequest.prompt.trim()
              : typeof generationRequest.description === "string"
                ? generationRequest.description.trim()
                : "";
          const locationSource =
            typeof generationRequest.location === "string" && generationRequest.location.trim()
              ? generationRequest.location
              : typeof generationRequest.locationSlug === "string" && generationRequest.locationSlug.trim()
                ? generationRequest.locationSlug
                : typeof generationRequest.slug === "string" && generationRequest.slug.trim()
                  ? generationRequest.slug
                  : typeof generationRequest.reason === "string" && generationRequest.reason.trim()
                    ? generationRequest.reason
                    : promptText;
          const locationText = locationSource.trim();
          if (promptText && locationText) {
            try {
              const imgConnId = await resolveAgentImageConnectionId(currentBackgroundAgent);
              if (!imgConnId) {
                bgData.error =
                  "No image generation connection set on the Background agent, and no default agent image connection is configured.";
                trySendSseEvent(reply, {
                  type: "agent_error",
                  data: {
                    agentType: "background",
                    agentName: currentBackgroundAgent?.name ?? "Background",
                    error:
                      "No image generation connection set on the Background agent, and no default agent image connection is configured. Assign one in Settings → Agents → Background.",
                  },
                });
              } else {
                const imgConnFull = await connections.getWithKey(imgConnId);
                if (!imgConnFull) throw new Error("Cannot resolve Background agent image connection");

                const imageDefaults = resolveConnectionImageDefaults(imgConnFull);
                const imageSettings = await loadImageGenerationUserSettings(db);
                const promptOverridesStorage = createPromptOverridesStorage(db);
                const generatedFilename = await generateChatBackground({
                  chatId: input.chatId,
                  locationSlug: locationText.slice(0, 120),
                  sceneDescription: promptText.slice(0, 1000),
                  reason:
                    typeof generationRequest.reason === "string"
                      ? generationRequest.reason.trim().slice(0, 300)
                      : undefined,
                  imgModel: imgConnFull.model || "",
                  imgBaseUrl: imgConnFull.baseUrl || "https://image.pollinations.ai",
                  imgApiKey: imgConnFull.apiKey || "",
                  imgSource: (imgConnFull as any).imageGenerationSource || imgConnFull.model || "",
                  imgService: imgConnFull.imageService || (imgConnFull as any).imageGenerationSource || "",
                  imgEndpointId: imgConnFull.imageEndpointId || undefined,
                  imgComfyWorkflow: imgConnFull.comfyuiWorkflow || undefined,
                  imgDefaults: imageDefaults,
                  promptOverridesStorage,
                  size: {
                    width: imageSettings.background.width,
                    height: imageSettings.background.height,
                  },
                  debugLog: ctx.debugLog,
                });
                if (generatedFilename) {
                  bgData.chosen = generatedFilename;
                  bgData.generated = true;
                  trySendSseEvent(reply, {
                    type: "agent_result",
                    data: {
                      agentType: result.agentType,
                      agentName: currentBackgroundAgent?.name ?? "Background",
                      resultType: result.type,
                      data: bgData,
                      success: result.success,
                      error: result.error,
                      durationMs: result.durationMs,
                    },
                  });
                } else {
                  bgData.error = "Background image generation failed";
                  trySendSseEvent(reply, {
                    type: "agent_error",
                    data: {
                      agentType: "background",
                      agentName: currentBackgroundAgent?.name ?? "Background",
                      error: "Background image generation failed. Check the image connection and server logs.",
                    },
                  });
                }
              }
            } catch (bgErr) {
              logger.error(bgErr, "[background-agent] Image generation failed");
              bgData.error = bgErr instanceof Error ? bgErr.message : "Background image generation failed";
              trySendSseEvent(reply, {
                type: "agent_error",
                data: {
                  agentType: "background",
                  agentName: currentBackgroundAgent?.name ?? "Background",
                  error: `Background image generation failed: ${bgData.error}`,
                },
              });
            }
          }
        }

        // Persist the validated background to chat metadata so it restores on reload
        if (bgData.chosen) {
          try {
            await updateChatMetadataForTools({ background: bgData.chosen });
          } catch {
            /* non-critical */
          }
        }
      }

      try {
        await agentsStore.saveRun({
          agentConfigId: result.agentId,
          chatId: input.chatId,
          messageId: resultMessageId,
          result,
        });
      } catch {
        // Non-critical — don't fail the whole generation
      }

      // Validate expression agent results — reject hallucinated expressions and unknown characters
      if (result.success && result.type === "sprite_change" && result.data && typeof result.data === "object") {
        const spriteData = result.data as {
          expressions?: Array<{
            characterId?: string;
            characterName?: string;
            expression?: string;
            transition?: string;
          }>;
        };
        const availableSprites = agentContext.memory._availableSprites as
          | Array<{ characterId: string; characterName: string; expressions: string[] }>
          | undefined;
        if (Array.isArray(spriteData.expressions)) {
          const validation = validateSpriteExpressionEntries(spriteData.expressions, availableSprites);
          spriteData.expressions = validation.expressions as typeof spriteData.expressions;
          for (const warning of validation.warnings) {
            logger.warn("[generate] %s", warning.message);
          }
        }
        // Persist validated expressions onto the message/swipe extra so they survive page refresh
        // and swipe switching. The chat-level metadata is also updated for backward compat.
        const persistedExpressions =
          spriteData.expressions?.filter(
            (entry): entry is { characterId: string; expression: string } =>
              typeof entry.characterId === "string" && typeof entry.expression === "string",
          ) ?? [];
        if (persistedExpressions.length > 0) {
          const exprMap: Record<string, string> = {};
          for (const e of persistedExpressions) exprMap[e.characterId] = e.expression;
          try {
            await chats.updateMessageExtra(messageId, { spriteExpressions: exprMap });
            await chats.updateSwipeExtra(messageId, targetSwipeIndex, { spriteExpressions: exprMap });
          } catch {
            /* non-critical */
          }
        }
      }

      // Persist CYOA choices onto message/swipe extra so they survive page refresh
      if (result.success && result.type === "cyoa_choices" && result.data && typeof result.data === "object") {
        const cyoaData = result.data as { choices?: Array<{ label: string; text: string }> };
        if (cyoaData.choices && cyoaData.choices.length > 0) {
          try {
            await chats.updateMessageExtra(messageId, { cyoaChoices: cyoaData.choices });
            await chats.updateSwipeExtra(messageId, targetSwipeIndex, { cyoaChoices: cyoaData.choices });
          } catch {
            /* non-critical */
          }
        }
      }

      // Persist game state snapshots from world-state agent
      if (
        result.success &&
        result.type === "game_state_update" &&
        result.data &&
        typeof result.data === "object"
      ) {
        try {
          const gs = result.data as Record<string, unknown>;

          // Manual overrides are one-shot: they live on the snapshot the user
          // edited and are visible to the agent as the prevSnap values, but they
          // are NOT carried forward to new snapshots.  The agent naturally reads
          // the edited prevSnap values and produces its own output.
          const prevSnap =
            baseGameStateSnapshot ??
            (allowLatestGameStateFallback ? await gameStateStore.getLatest(input.chatId) : null);

          // Build the new snapshot from agent output, falling back to previous snapshot.
          const newDate = coerceGameStateTextValue(gs.date) ?? coerceGameStateTextValue(prevSnap?.date);
          const newTime = coerceGameStateTextValue(gs.time) ?? coerceGameStateTextValue(prevSnap?.time);
          const newLocation =
            coerceGameStateTextValue(gs.location) ?? coerceGameStateTextValue(prevSnap?.location);
          const newWeather = coerceGameStateTextValue(gs.weather) ?? coerceGameStateTextValue(prevSnap?.weather);
          const newTemperature =
            coerceGameStateTextValue(gs.temperature) ?? coerceGameStateTextValue(prevSnap?.temperature);

          // The world-state agent ONLY produces date/time/location/weather/temperature
          // (and optionally recentEvents).  In batch mode the model often cross-
          // contaminates the world-state result with fields from other agent task
          // schemas (presentCharacters, personaStats, playerStats).  Even a partial
          // cross-contaminated playerStats (e.g. { status: "...", activeQuests: [] })
          // would clobber the real data and break downstream handlers (quest, persona-
          // stats) that read from this snapshot.  Therefore we ALWAYS carry forward
          // these fields from the previous snapshot — the dedicated tracker agents
          // (character-tracker, persona-stats, quest, custom-tracker) will update
          // them with authoritative data in their own handler blocks below.
          const snapshotChars = prevSnap?.presentCharacters
            ? typeof prevSnap.presentCharacters === "string"
              ? JSON.parse(prevSnap.presentCharacters)
              : prevSnap.presentCharacters
            : [];
          const snapshotPersonaStats = prevSnap?.personaStats
            ? typeof prevSnap.personaStats === "string"
              ? JSON.parse(prevSnap.personaStats)
              : prevSnap.personaStats
            : null;
          const snapshotPlayerStats = prevSnap?.playerStats
            ? typeof prevSnap.playerStats === "string"
              ? JSON.parse(prevSnap.playerStats)
              : prevSnap.playerStats
            : null;
          logger.info(
            `[generate] world-state snapshot: chars=${snapshotChars.length} (prev), personaStats=${snapshotPersonaStats ? "present" : "null"} (prev)`,
          );
          await gameStateStore.create(
            {
              chatId: input.chatId,
              messageId,
              swipeIndex: targetSwipeIndex,
              date: newDate,
              time: newTime,
              location: newLocation,
              weather: newWeather,
              temperature: newTemperature,
              presentCharacters: snapshotChars,
              recentEvents: (gs.recentEvents as string[]) ?? [],
              playerStats: snapshotPlayerStats,
              personaStats: snapshotPersonaStats,
            },
            null, // manual overrides are one-shot — never carry forward
          );
          // Send game state to client so HUD updates live
          // ONLY send the fields world-state actually produces (date/time/location/weather/temperature).
          // Do NOT spread the whole `gs` — in batch mode the model may cross-contaminate
          // fields like presentCharacters:[] from other agent tasks, clobbering the HUD.
          const worldStatePatch = {
            date: newDate,
            time: newTime,
            location: newLocation,
            weather: newWeather,
            temperature: newTemperature,
          };
          logger.debug("[game_state_patch] world-state: %j", worldStatePatch);
          reply.raw.write(`data: ${JSON.stringify({ type: "game_state_patch", data: worldStatePatch })}\n\n`);

          const existingGameMap = (chatMeta.gameMap as GameMap | null) ?? null;
          const syncedMeta = syncGameMapMetaPartyPosition(chatMeta, newLocation);
          const syncedGameMap = (syncedMeta.gameMap as GameMap | null) ?? null;
          if (syncedGameMap && syncedGameMap !== existingGameMap) {
            Object.assign(chatMeta, syncedMeta);
            // Re-fetch fresh metadata before write so we don't clobber concurrent updates
            // (e.g. /game/start flipping gameSessionStatus from "ready" to "active").
            const freshChat = await chats.getById(input.chatId);
            const freshMeta = freshChat ? (parseExtra(freshChat.metadata) as Record<string, unknown>) : chatMeta;
            await chats.updateMetadata(input.chatId, {
              ...freshMeta,
              gameMap: syncedMeta.gameMap,
              gameMaps: syncedMeta.gameMaps,
              activeGameMapId: syncedMeta.activeGameMapId,
            });
            sendSseEvent(reply, { type: "game_map_update", data: syncedGameMap });
          } else if (getGameMapsFromMeta(syncedMeta).length > 0) {
            Object.assign(chatMeta, syncedMeta);
          }

          // Auto-populate journal: location change
          const prevLocation = prevSnap?.location as string | null;
          if (newLocation && newLocation !== prevLocation) {
            updateJournal(db, input.chatId, (j) =>
              addLocationEntry(
                j,
                newLocation,
                `Arrived at ${newLocation}${newWeather ? ` (${newWeather})` : ""}`,
              ),
            );
          }
        } catch {
          // Non-critical
        }
      }

      // Character Tracker agent → merge presentCharacters into latest game state
      if (
        result.success &&
        result.type === "character_tracker_update" &&
        result.data &&
        typeof result.data === "object"
      ) {
        try {
          const ctData = result.data as Record<string, unknown>;
          const chars = (ctData.presentCharacters as any[]) ?? [];
          const snapBeforeUpdate = await gameStateStore.getByMessage(messageId, targetSwipeIndex);
          const oldChars: any[] = snapBeforeUpdate?.presentCharacters
            ? typeof snapBeforeUpdate.presentCharacters === "string"
              ? JSON.parse(snapBeforeUpdate.presentCharacters)
              : snapBeforeUpdate.presentCharacters
            : [];
          preserveTrackerCharacterUiFields(chars, oldChars);

          // ── Enrich with avatar paths ──
          // 1. Match against known character records in this chat
          // 2. Fall back to stored NPC avatars (per-chat generated/uploaded)
          const NPC_AVATAR_DIR = join(DATA_DIR, "avatars", "npc");
          const storedNpcAvatarByName = new Map<string, string>();
          const gameNpcs = sanitizeGameNpcAvatarUrls((chatMeta.gameNpcs as GameNpc[]) ?? []);
          if (gameNpcs !== chatMeta.gameNpcs) {
            chatMeta.gameNpcs = gameNpcs;
          }
          for (const npc of gameNpcs) {
            const name = typeof npc.name === "string" ? npc.name.trim().toLowerCase() : "";
            if (name && npc.avatarUrl) storedNpcAvatarByName.set(name, npc.avatarUrl);
          }

          for (const char of chars) {
            if (char.avatarPath) continue; // already set
            const name = (char.name as string) ?? "";
            // Try matching against the chat's character cards (case-insensitive)
            const matched = charInfo.find((c) => c.name.toLowerCase() === name.toLowerCase());
            if (matched?.avatarPath) {
              char.avatarPath = matched.avatarPath;
              continue;
            }
            const storedNpcAvatar = storedNpcAvatarByName.get(name.toLowerCase());
            if (storedNpcAvatar) {
              char.avatarPath = storedNpcAvatar;
              continue;
            }
            // Try loading a stored NPC avatar from disk
            const safeName = name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
            if (safeName) {
              const npcAvatarPath = join(NPC_AVATAR_DIR, input.chatId, `${safeName}.png`);
              if (existsSync(npcAvatarPath)) {
                char.avatarPath = `/api/avatars/npc/${input.chatId}/${safeName}.png`;
              }
            }
          }

          logger.info(
            `[generate] character-tracker: ${chars.length} characters to persist (msg=${messageId}, swipe=${targetSwipeIndex})`,
          );

          // ── Auto-generate NPC avatars if enabled ──
          const charTrackerAgent = resolvedAgents.find((a) => a.type === "character-tracker");
          const autoGenAvatars = !!charTrackerAgent?.settings?.autoGenerateAvatars;
          const npcImgConnId = (charTrackerAgent?.settings?.imageConnectionId as string) ?? null;
          if (autoGenAvatars && npcImgConnId) {
            const charsNeedingAvatars = chars.filter(
              (c: any) => !c.avatarPath && (c.name as string) && (c.appearance as string),
            );
            if (charsNeedingAvatars.length > 0) {
              // Fire-and-forget: generate avatars in background so we don't block
              (async () => {
                try {
                  const imgConnFull = await connections.getWithKey(npcImgConnId);
                  if (!imgConnFull) return;
                  const { generateImage } = await import("../image/image-generation.js");
                  const imgModel = imgConnFull.model || "";
                  const imgBaseUrl = imgConnFull.baseUrl || "https://image.pollinations.ai";
                  const imgApiKey = imgConnFull.apiKey || "";
                  const imgSource = (imgConnFull as any).imageGenerationSource || imgModel;
                  const imgServiceHint = imgConnFull.imageService || imgSource;
                  const imageDefaults = resolveConnectionImageDefaults(imgConnFull);
                  const imageSettings = await loadImageGenerationUserSettings(db);

                  for (const npc of charsNeedingAvatars) {
                    try {
                      const npcName = npc.name as string;
                      const appearance = (npc.appearance as string) || "";
                      const outfit = (npc.outfit as string) || "";
                      const prompt =
                        `Portrait of ${npcName}, ${appearance}${outfit ? `, wearing ${outfit}` : ""}. Character portrait, head and shoulders, detailed face, high quality`.slice(
                          0,
                          1000,
                        );

                      const imageResult = await generateImage(imgModel, imgBaseUrl, imgApiKey, imgServiceHint, {
                        prompt,
                        model: imgModel,
                        width: imageSettings.portrait.width,
                        height: imageSettings.portrait.height,
                        imageEndpointId: imgConnFull.imageEndpointId || undefined,
                        comfyWorkflow: imgConnFull.comfyuiWorkflow || undefined,
                        imageDefaults,
                      });

                      // Save to NPC avatars directory
                      const safeName = npcName
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");
                      const npcDir = join(NPC_AVATAR_DIR, input.chatId);
                      if (!existsSync(npcDir)) mkdirSync(npcDir, { recursive: true });
                      writeFileSync(join(npcDir, `${safeName}.png`), Buffer.from(imageResult.base64, "base64"));

                      // Update the character's avatarPath and stream to client
                      npc.avatarPath = `/api/avatars/npc/${input.chatId}/${safeName}.png`;
                      logger.info(`[character-tracker] Generated avatar for NPC "${npcName}"`);
                    } catch (err) {
                      logger.warn(err, '[character-tracker] Failed to generate avatar for "%s"', npc.name);
                    }
                  }

                  // Re-persist with avatar paths and notify client
                  await gameStateStore.updateByMessage(
                    messageId,
                    targetSwipeIndex,
                    input.chatId,
                    {
                      presentCharacters: chars,
                    },
                    undefined,
                    { baseSnapshot: baseGameStateSnapshot },
                  );
                  try {
                    logger.debug("[game_state_patch] character-tracker (avatar update): %d chars", chars.length);
                    reply.raw.write(
                      `data: ${JSON.stringify({ type: "game_state_patch", data: { presentCharacters: chars } })}\n\n`,
                    );
                  } catch {
                    /* stream closed */
                  }
                } catch (err) {
                  logger.warn(err, "[character-tracker] Avatar generation error");
                }
              })();
            }
          }

          const updated = await gameStateStore.updateByMessage(
            messageId,
            targetSwipeIndex,
            input.chatId,
            {
              presentCharacters: chars,
            },
            undefined,
            { baseSnapshot: baseGameStateSnapshot },
          );
          logger.info(
            `[generate] character-tracker: updateByMessage returned ${updated ? "ok" : "null (no snapshot)"}`,
          );
          // Merge into the game_state SSE event for the HUD
          try {
            logger.debug(
              "[game_state_patch] character-tracker: %s",
              chars.map((c: any) => c.name ?? c).join(", "),
            );
            reply.raw.write(
              `data: ${JSON.stringify({ type: "game_state_patch", data: { presentCharacters: chars } })}\n\n`,
            );
          } catch {
            /* stream closed */
          }

          // Auto-populate journal: NPC encounters
          try {
            const prevNames = new Set(oldChars.map((c: any) => ((c.name as string) ?? "").toLowerCase()));
            for (const char of chars) {
              const name = (char.name as string) ?? "";
              if (!name || prevNames.has(name.toLowerCase())) continue;
              // Skip player-character cards — only track NPCs
              if (charInfo.some((c) => c.name.toLowerCase() === name.toLowerCase())) continue;
              const appearance = (char.appearance as string) || "";
              const mood = (char.mood as string) || "";
              const npc: GameNpc = {
                id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                name,
                emoji: "👤",
                description: appearance,
                location: "",
                reputation: 0,
                met: true,
                notes: [],
              };
              const interaction = mood ? `Encountered (${mood})` : "Encountered";
              updateJournal(db, input.chatId, (j) => addNpcEntry(j, npc, interaction));
            }
          } catch {
            // Non-critical
          }
        } catch (err) {
          logger.error(err, "[generate] character-tracker persistence error");
        }
      }

      // Persona Stats agent → update personaStats on the latest game state snapshot
      if (
        result.success &&
        result.type === "persona_stats_update" &&
        result.data &&
        typeof result.data === "object"
      ) {
        try {
          const psData = result.data as Record<string, unknown>;
          const bars = (psData.stats as any[]) ?? [];
          const status = (psData.status as string) ?? "";
          const inventory = (psData.inventory as any[]) ?? [];

          // Ensure a snapshot exists for this (messageId, swipeIndex).
          // If world-state didn't create one, updateByMessage clones the
          // generation baseline into a new row so we don't corrupt old data.
          let snap = await gameStateStore.getByMessage(messageId, targetSwipeIndex);
          if (!snap) {
            await gameStateStore.updateByMessage(messageId, targetSwipeIndex, input.chatId, {}, undefined, {
              baseSnapshot: baseGameStateSnapshot,
            });
            snap = await gameStateStore.getByMessage(messageId, targetSwipeIndex);
          }
          if (snap) {
            const updates: Record<string, unknown> = {};
            if (bars.length > 0) updates.personaStats = JSON.stringify(bars);
            // Merge status + inventory into playerStats
            const existingPS = snap.playerStats
              ? typeof snap.playerStats === "string"
                ? JSON.parse(snap.playerStats)
                : snap.playerStats
              : { stats: [], attributes: null, skills: {}, inventory: [], activeQuests: [], status: "" };
            const mergedPS = { ...existingPS };
            if (status) mergedPS.status = status;
            if (inventory.length > 0) mergedPS.inventory = inventory;
            updates.playerStats = JSON.stringify(mergedPS);
            await db
              .update(gameStateSnapshotsTable)
              .set(updates)
              .where(eq(gameStateSnapshotsTable.id, snap.id));
          }
          const patchData: Record<string, unknown> = {};
          if (bars.length > 0) patchData.personaStats = bars;
          if (status || inventory.length > 0) {
            patchData.playerStats = {
              status: status || undefined,
              inventory: inventory.length > 0 ? inventory : undefined,
            };
          }
          logger.debug("[game_state_patch] persona-stats: %j", patchData);
          reply.raw.write(`data: ${JSON.stringify({ type: "game_state_patch", data: patchData })}\n\n`);

          // Auto-populate journal: inventory changes
          if (inventory.length > 0) {
            const existingInv = snap?.playerStats
              ? typeof snap.playerStats === "string"
                ? ((JSON.parse(snap.playerStats) as any).inventory ?? [])
                : ((snap.playerStats as any).inventory ?? [])
              : [];
            const oldNames = new Set((existingInv as any[]).map((i: any) => i.name));
            for (const item of inventory) {
              if (!oldNames.has(item.name)) {
                updateJournal(db, input.chatId, (j) =>
                  addInventoryEntry(j, item.name, "acquired", item.quantity ?? 1),
                );
              }
            }
          }
        } catch {
          // Non-critical
        }
      }

      // Custom Tracker agent → merge custom fields into playerStats.customTrackerFields
      if (
        result.success &&
        result.type === "custom_tracker_update" &&
        result.data &&
        typeof result.data === "object"
      ) {
        try {
          const ctData = result.data as Record<string, unknown>;
          const fields = (ctData.fields as any[]) ?? [];
          if (fields.length > 0) {
            // Ensure a snapshot exists for this (messageId, swipeIndex)
            let snap = await gameStateStore.getByMessage(messageId, targetSwipeIndex);
            if (!snap) {
              await gameStateStore.updateByMessage(messageId, targetSwipeIndex, input.chatId, {}, undefined, {
                baseSnapshot: baseGameStateSnapshot,
              });
              snap = await gameStateStore.getByMessage(messageId, targetSwipeIndex);
            }
            const existingPS = snap?.playerStats
              ? typeof snap.playerStats === "string"
                ? JSON.parse(snap.playerStats)
                : snap.playerStats
              : { stats: [], attributes: null, skills: {}, inventory: [], activeQuests: [], status: "" };
            const mergedPS = { ...existingPS, customTrackerFields: fields };
            if (snap) {
              await db
                .update(gameStateSnapshotsTable)
                .set({ playerStats: JSON.stringify(mergedPS) })
                .where(eq(gameStateSnapshotsTable.id, snap.id));
            }
            logger.debug("[game_state_patch] custom-tracker: %j", fields);
            reply.raw.write(
              `data: ${JSON.stringify({ type: "game_state_patch", data: { playerStats: { customTrackerFields: fields } } })}\n\n`,
            );
          }
        } catch {
          // Non-critical
        }
      }

      // Quest Tracker agent → merge quest updates into playerStats.activeQuests
      if (result.success && result.type === "quest_update" && result.data && typeof result.data === "object") {
        try {
          const qData = result.data as Record<string, unknown>;
          const updates = (qData.updates as any[]) ?? [];
          logger.debug(
            "[generate] Quest agent result — updates: %d, data keys: %s %s",
            updates.length,
            Object.keys(qData).join(","),
            JSON.stringify(qData).slice(0, 500),
          );
          if (updates.length > 0) {
            // Ensure a snapshot exists for this (messageId, swipeIndex)
            let snap = await gameStateStore.getByMessage(messageId, targetSwipeIndex);
            if (!snap) {
              await gameStateStore.updateByMessage(messageId, targetSwipeIndex, input.chatId, {}, undefined, {
                baseSnapshot: baseGameStateSnapshot,
              });
              snap = await gameStateStore.getByMessage(messageId, targetSwipeIndex);
            }
            const existingPS = snap?.playerStats
              ? typeof snap.playerStats === "string"
                ? JSON.parse(snap.playerStats)
                : snap.playerStats
              : { stats: [], attributes: null, skills: {}, inventory: [], activeQuests: [], status: "" };
            const originalQuests: any[] = existingPS.activeQuests ?? [];
            const quests: any[] = [...originalQuests];
            for (const u of updates) {
              const idx = quests.findIndex((q: any) => q.name === u.questName);
              if (u.action === "create" && idx === -1) {
                quests.push({
                  questEntryId: u.questName,
                  name: u.questName,
                  currentStage: 0,
                  objectives: u.objectives ?? [],
                  completed: false,
                });
              } else if (idx !== -1) {
                if (u.action === "update") {
                  if (u.objectives) quests[idx].objectives = u.objectives;
                } else if (u.action === "complete") {
                  quests[idx].completed = true;
                  if (u.objectives) quests[idx].objectives = u.objectives;
                } else if (u.action === "fail") {
                  quests.splice(idx, 1);
                }
              }
            }
            // Auto-remove quests that are fully completed (all objectives done)
            for (let i = quests.length - 1; i >= 0; i--) {
              const q = quests[i];
              if (
                q.completed &&
                Array.isArray(q.objectives) &&
                q.objectives.length > 0 &&
                q.objectives.every((o: any) => o.completed)
              ) {
                quests.splice(i, 1);
              }
            }

            // Only persist + send if quests actually changed
            const changed = JSON.stringify(quests) !== JSON.stringify(originalQuests);
            if (changed) {
              const mergedPS = { ...existingPS, activeQuests: quests };
              if (snap) {
                await db
                  .update(gameStateSnapshotsTable)
                  .set({ playerStats: JSON.stringify(mergedPS) })
                  .where(eq(gameStateSnapshotsTable.id, snap.id));
              }
              logger.debug("[game_state_patch] quests: %j", quests);
              reply.raw.write(
                `data: ${JSON.stringify({ type: "game_state_patch", data: { playerStats: { activeQuests: quests } } })}\n\n`,
              );

              // Auto-populate journal: quest updates
              for (const u of updates) {
                const questData = {
                  id: u.questName,
                  name: u.questName,
                  status: (u.action === "complete" ? "completed" : u.action === "fail" ? "failed" : "active") as
                    | "active"
                    | "completed"
                    | "failed",
                  description: u.description || u.questName,
                  objectives: (u.objectives ?? []).map((o: any) =>
                    typeof o === "string" ? o : o.text || o.description || "",
                  ),
                };
                updateJournal(db, input.chatId, (j) => upsertQuest(j, questData));
              }
            }
          }
        } catch {
          // Non-critical
        }
      }

      // Lorebook Keeper agent → persist new/updated entries to the database
      if (result.success && result.type === "lorebook_update" && result.data && typeof result.data === "object") {
        try {
          const lkData = result.data as Record<string, unknown>;
          const updates = (lkData.updates as any[]) ?? [];
          if (updates.length > 0) {
            await persistLorebookKeeperUpdates({
              lorebooksStore,
              chatId: input.chatId,
              chatName: chat.name,
              preferredTargetLorebookId:
                typeof agentContext.memory._lorebookKeeperTargetLorebookId === "string"
                  ? (agentContext.memory._lorebookKeeperTargetLorebookId as string)
                  : null,
              writableLorebookIds: agentContext.writableLorebookIds,
              updates,
            });
          }
        } catch {
          // Non-critical
        }
      }

      // Combat agent → persist encounterActive flag to chatMeta so we can
      // skip the combat agent on subsequent generations when no encounter is running.
      if (result.success && result.agentType === "combat" && result.data && typeof result.data === "object") {
        try {
          const combatData = result.data as Record<string, unknown>;
          const isActive = combatData.encounterActive === true;
          const freshChat = await chats.getById(input.chatId);
          if (freshChat) {
            const freshMeta = parseExtra(freshChat.metadata);
            await chats.updateMetadata(input.chatId, { ...freshMeta, encounterActive: isActive });
          }
        } catch {
          // Non-critical
        }
      }

      // Chat Summary agent → persist rolling summary to chat metadata
      if (result.success && result.type === "chat_summary" && result.data && typeof result.data === "object") {
        try {
          const csData = result.data as Record<string, unknown>;
          const newText = ((csData.summary as string) ?? "").trim();
          if (newText) {
            let createdEntry: ChatSummaryEntry | null = null;
            let summaryEntries: ChatSummaryEntry[] = [];
            const updatedMeta = await updateChatMetadataForTools((currentMeta) => {
              const result = appendChatSummaryEntryToMetadata(currentMeta, {
                kind: "rolling",
                origin: "automated",
                sourceMode: "agent",
                content: newText,
                enabled: true,
              });
              createdEntry = result.entry;
              summaryEntries = result.entries;
              return { summary: result.summary, summaryEntries: result.entries };
            });
            const combined = typeof updatedMeta.summary === "string" ? updatedMeta.summary : newText;
            reply.raw.write(
              `data: ${JSON.stringify({ type: "chat_summary", data: { summary: combined, entry: createdEntry, entries: summaryEntries } })}\n\n`,
            );
          }
        } catch {
          // Non-critical
        }
      }

      // ── Haptic agent: execute device commands from agent output ──
      if (result.success && result.type === "haptic_command" && result.data && typeof result.data === "object") {
        try {
          const hData = result.data as Record<string, unknown>;
          if (hData.parseError) {
            logger.warn(
              "[haptic] Agent output could not be parsed as JSON: %s",
              (hData.raw as string)?.slice(0, 200),
            );
          } else {
            const cmds = normalizeHapticAgentCommands(hData);
            if (cmds.length > 0) {
              const { hapticService } = await import("../haptic/buttplug-service.js");
              if (hapticService.connected) {
                const executedCommands: HapticDeviceCommand[] = [];
                for (const cmd of cmds) {
                  const hapticCommand = normalizeHapticAgentCommand(cmd);
                  if (!hapticCommand) {
                    logger.warn("[haptic] Agent produced unsupported command action: %s", String(cmd.action));
                    continue;
                  }

                  try {
                    await hapticService.executeCommand(hapticCommand);
                    executedCommands.push(hapticCommand);
                  } catch (commandErr) {
                    logger.warn(commandErr, "[haptic] Agent command %s skipped", hapticCommand.action);
                  }
                }
                if (executedCommands.length > 0) {
                  reply.raw.write(
                    `data: ${JSON.stringify({ type: "haptic_command", data: { commands: executedCommands, reasoning: hData.reasoning } })}\n\n`,
                  );
                  logger.info(
                    "[haptic] Agent executed %d command(s): %s",
                    executedCommands.length,
                    hData.reasoning ?? "",
                  );
                } else {
                  logger.warn(
                    "[haptic] Agent produced %d command(s), but none could be executed: %s",
                    cmds.length,
                    hData.reasoning ?? "",
                  );
                }
              } else {
                logger.warn(
                  `[haptic] Agent produced ${cmds.length} command(s) but Intiface Central is disconnected — commands dropped`,
                );
              }
            } else {
              logger.debug(
                `[haptic] Agent returned no commands (reasoning: ${(hData.reasoning as string) ?? "none"})`,
              );
            }
          }
        } catch (hapErr) {
          logger.error(hapErr, "[haptic] Agent command execution failed");
        }
      }

      // ── ILLUSTRATOR HANDLER: generate image from agent prompt ──
      if (result.success && result.type === "image_prompt" && result.data && typeof result.data === "object") {
        const illData = result.data as Record<string, unknown>;
        const shouldGenerate = illData.shouldGenerate === true;
        const imagePrompt = ((illData.prompt as string) ?? "").trim();
        const negativePrompt = ((illData.negativePrompt as string) ?? "").trim();
        const style = ((illData.style as string) ?? "").trim();
        const illCharacters = Array.isArray(illData.characters) ? (illData.characters as string[]) : [];

        // Always log what the illustrator decided
        logger.debug(
          `[illustrator] shouldGenerate=${shouldGenerate}, reason="${(illData.reason as string) ?? "none"}", prompt="${imagePrompt.slice(0, 500) || "(empty)"}"${illData.parseError ? " [JSON PARSE ERROR — raw: " + ((illData.raw as string) ?? "").slice(0, 300) + "]" : ""}`,
        );

        if (shouldGenerate && imagePrompt) {
          // Resolve connections: text LLM = connectionId, image gen = settings.imageConnectionId
          const illustratorAgent = resolvedAgents.find(
            (a) => a.id === result.agentId || a.type === "illustrator",
          );
          const imagePositivePrompt = ((illustratorAgent?.settings?.imagePositivePrompt as string) ?? "").trim();
          const savedNegativePrompt = ((illustratorAgent?.settings?.imageNegativePrompt as string) ?? "").trim();
          let imgConnId = (illustratorAgent?.settings?.imageConnectionId as string) ?? null;
          if (!imgConnId) {
            const defaultImageConn = (await connections.list()).find(
              (c: any) =>
                c.provider === "image_generation" &&
                (c.defaultForAgents === true || c.defaultForAgents === "true"),
            );
            imgConnId = defaultImageConn?.id ?? null;
          }
          if (imgConnId) {
            // Queue image generation to run after the result loop so it doesn't
            // block other agents (game state, trackers, consistency editor).
            pendingIllustration = (async () => {
              try {
                const imgConnFull = await connections.getWithKey(imgConnId);
                if (!imgConnFull) throw new Error("Cannot resolve Illustrator agent connection");

                const { generateImage, saveImageToDisk } = await import("../image/image-generation.js");
                const { createGalleryStorage } = await import("../storage/gallery.storage.js");
                const galleryStore = createGalleryStorage(db);

                const imgModel = imgConnFull.model || "";
                const imgBaseUrl = imgConnFull.baseUrl || "https://image.pollinations.ai";
                const imgApiKey = imgConnFull.apiKey || "";
                const imgSource = (imgConnFull as any).imageGenerationSource || imgModel;
                const imgServiceHint = imgConnFull.imageService || imgSource;
                const imageDefaults = resolveConnectionImageDefaults(imgConnFull);
                const imageSettings = await loadImageGenerationUserSettings(db);

                // Use per-chat selfie resolution if set; otherwise use the synced global selfie canvas.
                const selfieRes = (chatMeta.selfieResolution as string) ?? "";
                const resParts = selfieRes.split("x").map(Number);
                const parsedW = resParts[0] ?? 0;
                const parsedH = resParts[1] ?? 0;
                let imgWidth: number;
                let imgHeight: number;
                if (parsedW > 0 && parsedH > 0) {
                  imgWidth = parsedW;
                  imgHeight = parsedH;
                } else {
                  imgWidth = imageSettings.selfie.width;
                  imgHeight = imageSettings.selfie.height;
                }

                // Prepend style to the prompt for better results
                let fullPrompt = style ? `${style}, ${imagePrompt}` : imagePrompt;
                if (imagePositivePrompt) {
                  fullPrompt = `${fullPrompt}, ${imagePositivePrompt}`;
                }
                const finalNegativePrompt = [negativePrompt, savedNegativePrompt].filter(Boolean).join(", ");

                logger.debug(`[illustrator] Starting image generation (${imgWidth}x${imgHeight})...`);

                // Collect character reference images when the setting is enabled.
                // Prefer saved full-body sprites, then fall back to avatar portraits.
                const useAvatarRefs = illustratorAgent?.settings?.useAvatarReferences === true;
                let illustratorRefImages: string[] | undefined;
                if (useAvatarRefs) {
                  // Match character names from the Illustrator's output to character IDs.
                  // The LLM picks which characters are visible in the image via the "characters" field.
                  // If it didn't specify any, fall back to all characters in the chat.
                  const illCharLower = illCharacters.map((n) => n.toLowerCase().trim());
                  const relevantCharIds =
                    illCharLower.length > 0
                      ? charInfo
                          .filter((c) => illCharLower.some((n) => c.name.toLowerCase() === n))
                          .map((c) => c.id)
                      : characterIds;
                  const includePersona =
                    illCharLower.length === 0 || illCharLower.some((n) => n === personaName.toLowerCase());

                  // Collect visual reference images for chosen characters + persona.
                  const refImages: string[] = [];
                  for (const cid of relevantCharIds) {
                    const ci = charInfo.find((c) => c.id === cid);
                    if (!ci) continue;
                    const b64 = readBestCharacterReferenceBase64(ci.id, ci.avatarPath);
                    if (b64) refImages.push(b64);
                  }
                  if (includePersona && persona) {
                    const personaB64 = readBestCharacterReferenceBase64(
                      personaId,
                      persona.avatarPath as string | null,
                    );
                    if (personaB64) refImages.push(personaB64);
                  }
                  if (refImages.length > 0) {
                    illustratorRefImages = refImages;
                    logger.debug(
                      `[illustrator] Sending ${refImages.length} character reference(s) for: ${illCharLower.length > 0 ? illCharacters.join(", ") : "all characters"}`,
                    );
                  }

                  // Build character appearance descriptions and augment the prompt
                  const appearanceLines: string[] = [];
                  for (const cid of relevantCharIds) {
                    const ci = charInfo.find((c) => c.id === cid);
                    if (!ci) continue;
                    const visual = ci.appearance || ci.description;
                    if (visual) appearanceLines.push(`${ci.name}: ${visual}`);
                  }
                  if (includePersona && persona) {
                    const pAppearance = (persona as any).appearance ?? "";
                    if (pAppearance) appearanceLines.push(`${personaName}: ${pAppearance}`);
                  }
                  if (appearanceLines.length > 0 || illustratorRefImages) {
                    const parts: string[] = [];
                    if (illustratorRefImages) {
                      parts.push(
                        "Reference images of the characters are attached. " +
                          "Use them closely to match each character's exact visual appearance — face, hair, eyes, build, etc.",
                      );
                    }
                    if (appearanceLines.length > 0) {
                      parts.push("Character visual descriptions:\n" + appearanceLines.join("\n"));
                    }
                    fullPrompt = fullPrompt + "\n\n" + parts.join("\n");
                  }
                }

                const imageResult = await generateImage(imgModel, imgBaseUrl, imgApiKey, imgServiceHint, {
                  prompt: fullPrompt,
                  negativePrompt: finalNegativePrompt || undefined,
                  model: imgModel,
                  width: imgWidth,
                  height: imgHeight,
                  imageEndpointId: imgConnFull.imageEndpointId || undefined,
                  comfyWorkflow: imgConnFull.comfyuiWorkflow || undefined,
                  imageDefaults,
                  referenceImages: illustratorRefImages,
                });

                // Save to disk
                const filePath = saveImageToDisk(input.chatId, imageResult.base64, imageResult.ext);

                // Save to gallery
                const galleryEntry = await galleryStore.create({
                  chatId: input.chatId,
                  filePath,
                  prompt: fullPrompt,
                  provider: "image_generation",
                  model: imgModel || "unknown",
                  width: imgWidth,
                  height: imgHeight,
                });

                // Attach to the assistant message + its specific swipe row
                const filename = filePath.split("/").pop()!;
                const imageUrl = `/api/gallery/file/${input.chatId}/${encodeURIComponent(filename)}`;
                if (messageId) {
                  const attachment = {
                    type: "image",
                    url: imageUrl,
                    filename: `illustration.${imageResult.ext}`,
                    prompt: fullPrompt,
                    galleryId: (galleryEntry as any)?.id,
                  };

                  // Always persist to the swipe row so the attachment survives
                  // swipe switches even if the user has already navigated away.
                  await chats.appendSwipeAttachment(messageId, targetSwipeIndex, attachment);

                  // Also update the live message row if this swipe is still active,
                  // so the SSE illustration event is immediately visible.
                  const msgRow = await chats.getMessage(messageId);
                  if (msgRow && (msgRow.activeSwipeIndex ?? 0) === targetSwipeIndex) {
                    await chats.appendMessageAttachment(messageId, attachment);
                  }
                }

                // Notify client
                reply.raw.write(
                  `data: ${JSON.stringify({
                    type: "illustration",
                    data: {
                      messageId,
                      imageUrl,
                      prompt: fullPrompt,
                      reason: illData.reason,
                      galleryId: (galleryEntry as any)?.id,
                    },
                  })}\n\n`,
                );
                logger.info(
                  `[illustrator] Generated illustration: ${(illData.reason as string)?.slice(0, 80) ?? imagePrompt.slice(0, 80)}...`,
                );
              } catch (illErr) {
                logger.error(illErr, "[illustrator] Image generation failed");
                reply.raw.write(
                  `data: ${JSON.stringify({
                    type: "agent_error",
                    data: {
                      agentType: "illustrator",
                      agentName: illustratorAgent?.name ?? "Illustrator",
                      error: `Image generation failed: ${illErr instanceof Error ? illErr.message : String(illErr)}`,
                    },
                  })}\n\n`,
                );
              }
            })();
          } else {
            logger.warn("[illustrator] Agent wants to generate but no image generation connection configured");
            reply.raw.write(
              `data: ${JSON.stringify({
                type: "agent_error",
                data: {
                  agentType: "illustrator",
                  agentName: illustratorAgent?.name ?? "Illustrator",
                  error:
                    "No image generation connection set on the Illustrator agent, and no default Illustrator image connection is configured. Go to Settings → Connections and mark an image generation connection as the default for Illustrator, or assign one directly in Settings → Agents → Illustrator.",
                },
              })}\n\n`,
            );
          }
        }
      }
    }

    // ── Language learning: run word extractor + grammar corrector in post-gen ──
    if (chatMode === "language_learning" && messageId && !abortController.signal.aborted) {
      const wordExtractorAgent = resolvedAgents.find((a) => a.type === "word-extractor");
      const grammarCorrectorAgent = resolvedAgents.find((a) => a.type === "grammar-corrector");

      const wordExtractorPromise = wordExtractorAgent
        ? executeWordExtractor(wordExtractorAgent, { ...agentContext, mainResponse: combinedResponse }, wordExtractorAgent.provider, wordExtractorAgent.model).catch((err) => {
            logger.warn(err, "[word-extractor] failed — continuing");
            return null as AgentResult | null;
          })
        : Promise.resolve(null as AgentResult | null);

      const grammarCorrectorPromise = grammarCorrectorAgent
        ? executeGrammarCorrector(grammarCorrectorAgent, { ...agentContext, mainResponse: combinedResponse }, grammarCorrectorAgent.provider, grammarCorrectorAgent.model).catch((err) => {
            logger.warn(err, "[grammar-corrector] failed — continuing");
            return null as AgentResult | null;
          })
        : Promise.resolve(null as AgentResult | null);

      const [wordResult, grammarResult] = await Promise.all([wordExtractorPromise, grammarCorrectorPromise]);

      const coordinator = createLearningCoordinator(db);
      const langConfig = chatMeta.languageLearning as
        | import("./language-learning-prompt-builder.js").LanguageLearningConfig
        | undefined;
      const languageCode = langConfig?.languageCode ?? "en";
      const userId = ((chatMeta as Record<string, unknown>).userId as string) ?? "unknown";

      if (wordResult?.success && Array.isArray(wordResult.data)) {
        try {
          await coordinator.processExtractedVocab(
            wordResult.data as import("@jumpchoice/shared").ExtractedVocab[],
            userId,
            languageCode,
            input.chatId,
          );
        } catch (err) {
          logger.warn(err, "[word-extractor] failed to persist vocab");
        }
      }

      if (grammarResult?.success && Array.isArray(grammarResult.data)) {
        try {
          await coordinator.processExtractedCorrections(
            grammarResult.data as import("@jumpchoice/shared").ExtractedCorrection[],
            userId,
            languageCode,
            input.chatId,
            messageId,
          );
        } catch (err) {
          logger.warn(err, "[grammar-corrector] failed to persist corrections");
        }
      }
    }

    // ── Text rewrite/editing agents: run after ALL other agents ──
    if (textRewriteAgents.length > 0 && messageId && !abortController.signal.aborted) {
      let currentResponseForRewrite = combinedResponse;

      for (const textRewriteAgent of textRewriteAgents) {
        if (abortController.signal.aborted) break;
        try {
          // Collect all successful agent outputs as a summary for rewrite agents.
          const agentSummary: Record<string, unknown> = {};
          for (const result of postResults) {
            if (result.success && result.data) {
              agentSummary[result.agentType ?? result.type] = result.data;
            }
          }

          const editorContext: AgentContext = {
            ...agentContext,
            mainResponse: currentResponseForRewrite,
            preGenInjections:
              textRewriteAgent.settings.includePreGenInjections === true ? contextInjections : undefined,
            parallelResults:
              textRewriteAgent.settings.includeParallelResults === true ? parallelResults : undefined,
            memory: { ...agentContext.memory, _agentResults: agentSummary },
          };

          const editorResult = await executeAgent(
            textRewriteAgent,
            editorContext,
            textRewriteAgent.provider,
            textRewriteAgent.model,
          );
          sendAgentEvent(editorResult);

          try {
            await agentsStore.saveRun({
              agentConfigId: editorResult.agentId,
              chatId: input.chatId,
              messageId,
              result: editorResult,
            });
          } catch {
            /* Non-critical */
          }

          if (editorResult.success && editorResult.type === "text_rewrite" && editorResult.data) {
            const edData = editorResult.data as Record<string, unknown>;
            const editedText = (edData.editedText as string) ?? "";
            const changes = (edData.changes as Array<{ description: string }>) ?? [];
            if (editedText && changes.length > 0) {
              currentResponseForRewrite = editedText;
              await chats.updateMessageContent(messageId, editedText);
              reply.raw.write(
                `data: ${JSON.stringify({
                  type: "text_rewrite",
                  data: { editedText, changes },
                })}\n\n`,
              );
            }
          }
        } catch {
          // Non-critical — don't fail generation if a rewrite agent errors.
        }
      }
    }
  }

  return { pendingIllustration };
}
