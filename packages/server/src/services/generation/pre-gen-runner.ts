import { BUILT_IN_AGENTS } from "@jumpchoice/shared";
import type { AgentResult } from "@jumpchoice/shared";
import { executeKnowledgeRetrieval } from "../agents/knowledge-retrieval.js";
import { executeKnowledgeRouter } from "../agents/knowledge-router.js";
import { executeProficiencyEstimator } from "../agents/proficiency-estimator.js";
import { createLearningCoordinator } from "../learning/learning-coordinator.js";
import { logger } from "../../lib/logger.js";
import {
  findLastIndex,
  parseExtra,
} from "../../routes/generate/generate-route-utils.js";
import { sendSseEvent, trySendSseEvent } from "../../routes/generate/sse.js";
import { injectAtDepth } from "../lorebook/prompt-injector.js";
import {
  normalizeContextInjections,
  normalizeSecretPlotSceneDirections,
  normalizeStringArray,
} from "../../routes/generate/agent-normalizers.js";
import {
  REVIEWABLE_WRITER_AGENT_TYPES,
  toRuntimeAgentSectionType,
  replaceRuntimeAgentSection,
  splitRuntimeHandledAgentInjections,
  clearUnusedRuntimeAgentSections,
  formatAgentInjections,
} from "../../routes/generate/agents.routes.js";
import { wrapContent } from "../prompt/format-engine.js";
import type { AgentInjection } from "../agents/agent-pipeline.js";
import type { GameStateForScanning } from "../lorebook/keyword-scanner.js";

export interface PreGenContext {
  db: any;
  app: any;
  chats: any;
  agentsStore: any;
  reply: any;
  input: any;
  chatMeta: Record<string, unknown>;
  chatMessages: any[];
  chatMode: string;
  characterIds: string[];
  personaId: string | null;
  personaName: string;
  personaDescription: string;
  personaFields: Record<string, string | undefined>;
  conn: any;
  provider: any;
  baseUrl: string;
  abortController: AbortController;
  isDebug: boolean;
  sendProgress: (phase: string) => void;
  resolvedAgents: any[];
  pipelineAgents: any[];
  pipeline: any;
  agentContext: any;
  wrapFormat: "xml" | "markdown" | "none";
  runtimeAgentSectionTokens: Map<any, any>;
  knowledgeRetrievalAgent: any;
  knowledgeRouterAgent: any;
  knowledgeRouterEntries: any[];
  secretPlotAgent: any;
  lorebookKeeperAgent: any;
  reviewedAgentTypes: Set<string>;
  reviewedAgentInjections: any[];
  allChatMessages: any[];
  gameState: any;
  contextInjections: any[];
  sendAgentEvent: (result: any) => void;
  memoryRecallEmbeddingSource: any;
  knowledgeRouterActivationPassCompleted: boolean;
  knowledgeRouterActivatedEntries: any[];
  knowledgeRouterKeywordScanEntries: any[];
  toLorebookScanMessages: () => any[];
  promptCharacterIds: string[];
  knowledgeRouterActiveCharacterTags: any[];
  lorebookGenerationTriggers: any;
  builtInAgentTypes: Set<string>;
  runtimeSectionEligibleAgentTypes: Set<string>;
  regenMsg: any;
  enabledConfigs: any[];
}

export interface PreGenResult {
  contextInjections: any[];
  finalMessages: any[];
  abortGeneration: boolean;
}

export async function runPreGeneration(
  ctx: PreGenContext,
  finalMessages: any[],
): Promise<PreGenResult> {
  const {
    db,
    resolvedAgents,
    input,
    reviewedAgentTypes,
    reviewedAgentInjections,
    wrapFormat,
    sendProgress,
    reply,
    isDebug,
    pipelineAgents,
    pipeline,
    sendAgentEvent,
    knowledgeRetrievalAgent,
    agentContext,
    knowledgeRouterAgent,
    knowledgeRouterEntries,
    memoryRecallEmbeddingSource,
    knowledgeRouterActivationPassCompleted,
    knowledgeRouterActivatedEntries,
    knowledgeRouterKeywordScanEntries,
    toLorebookScanMessages,
    gameState,
    promptCharacterIds,
    knowledgeRouterActiveCharacterTags,
    lorebookGenerationTriggers,
    runtimeAgentSectionTokens,
    allChatMessages,
    agentsStore,
    chatMode,
    chatMeta,
    secretPlotAgent,
    abortController,
    builtInAgentTypes,
    runtimeSectionEligibleAgentTypes,
    regenMsg,
    enabledConfigs,
  } = ctx;

  const agentNameByType = new Map(resolvedAgents.map((agent) => [agent.type, agent.name] as const));
  const attachAgentName = (entry: AgentInjection): AgentInjection => ({
    ...entry,
    agentName: agentNameByType.get(entry.agentType) ?? entry.agentName,
  });

  let contextInjections: AgentInjection[] = ctx.contextInjections;
  const STATIC_INJECTION_AGENTS = new Set(["html"]);
  const SEPARATE_INJECTION_AGENTS = new Set(["knowledge-retrieval", "knowledge-router"]);
  const EXCLUDED_FROM_PIPELINE = new Set(["html", "knowledge-retrieval", "knowledge-router"]);
  const hasPreGenAgents = resolvedAgents.some(
    (a) => a.phase === "pre_generation" && !EXCLUDED_FROM_PIPELINE.has(a.type) && !reviewedAgentTypes.has(a.type),
  );

  const shouldRunKR = !!(
    knowledgeRetrievalAgent &&
    agentContext.memory._knowledgeRetrievalMaterial &&
    !input.regenerateMessageId
  );
  const shouldRunRouter = !!(
    knowledgeRouterAgent &&
    knowledgeRouterEntries.length > 0 &&
    !input.regenerateMessageId
  );
  const shouldRunPreGen = (hasPreGenAgents || reviewedAgentInjections.length > 0) && !input.regenerateMessageId;

  const appendSeparateAgentInjection = (
    agentType: "knowledge-retrieval" | "knowledge-router",
    text: string,
  ): void => {
    const isRouter = agentType === "knowledge-router";
    const heading = isRouter ? "Knowledge Router" : "Knowledge Retrieval";
    const tag = isRouter ? "knowledge_router" : "knowledge_retrieval";
    const wrapped =
      wrapFormat === "none"
        ? `\n\n${text}`
        : wrapFormat === "markdown"
          ? `\n\n## ${heading}\n${text}`
          : `\n\n<${tag}>\n${text}\n</${tag}>`;
    const lastUserIdx = findLastIndex(finalMessages, "user");
    if (lastUserIdx >= 0) {
      const target = finalMessages[lastUserIdx]!;
      finalMessages[lastUserIdx] = { ...target, content: target.content + wrapped };
    } else {
      const last = finalMessages[finalMessages.length - 1]!;
      finalMessages[finalMessages.length - 1] = { ...last, content: last.content + wrapped };
    }
  };

  if (shouldRunPreGen || shouldRunKR || shouldRunRouter) {
    sendProgress("agents");

    const preGenPromise = hasPreGenAgents
      ? (async () => {
          reply.raw.write(
            `data: ${JSON.stringify({ type: "agent_start", data: { phase: "pre_generation" } })}\n\n`,
          );
          if (isDebug) {
            const preGenAgents = pipelineAgents.filter(
              (a) => a.phase === "pre_generation" && !EXCLUDED_FROM_PIPELINE.has(a.type),
            );
            logger.debug(
              "[debug] Pre-generation agents (%d): %s",
              preGenAgents.length,
              preGenAgents.map((a) => `${a.name} (${a.model})`).join(", "),
            );
          }
          const _tAgents = Date.now();
          const injections = (
            await pipeline.preGenerate((t: string) => !EXCLUDED_FROM_PIPELINE.has(t) && !reviewedAgentTypes.has(t))
          ).map(attachAgentName);
          logger.debug(`[timing] Pre-gen agents: ${Date.now() - _tAgents}ms`);
          return injections;
        })()
      : Promise.resolve([] as AgentInjection[]);

    const krPromise = shouldRunKR
      ? (async () => {
          const _tKR = Date.now();
          try {
            reply.raw.write(
              `data: ${JSON.stringify({ type: "agent_start", data: { phase: "pre_generation", agentType: "knowledge-retrieval" } })}\n\n`,
            );
            const krConfig = {
              id: knowledgeRetrievalAgent!.id,
              type: knowledgeRetrievalAgent!.type,
              name: knowledgeRetrievalAgent!.name,
              phase: knowledgeRetrievalAgent!.phase,
              promptTemplate: knowledgeRetrievalAgent!.promptTemplate,
              connectionId: knowledgeRetrievalAgent!.connectionId,
              settings: knowledgeRetrievalAgent!.settings,
            };
            const sourceMaterial = agentContext.memory._knowledgeRetrievalMaterial as string;
            const krResult = await executeKnowledgeRetrieval(
              krConfig,
              agentContext,
              knowledgeRetrievalAgent!.provider,
              knowledgeRetrievalAgent!.model,
              sourceMaterial,
            );
            sendAgentEvent(krResult);
            logger.debug(`[timing] Knowledge retrieval: ${Date.now() - _tKR}ms`);
            return krResult;
          } catch (err) {
            logger.warn(err, "[knowledge-retrieval] failed — continuing generation without retrieved context");
            trySendSseEvent(reply, {
              type: "agent_error",
              data: {
                agentType: "knowledge-retrieval",
                agentName: knowledgeRetrievalAgent!.name,
                error: err instanceof Error ? err.message : "Knowledge retrieval failed",
              },
            });
            return null;
          }
        })()
      : Promise.resolve(null);

    const krRouterPromise = shouldRunRouter
      ? (async () => {
          const _tRouter = Date.now();
          try {
            reply.raw.write(
              `data: ${JSON.stringify({ type: "agent_start", data: { phase: "pre_generation", agentType: "knowledge-router" } })}\n\n`,
            );
            const routerConfig = {
              id: knowledgeRouterAgent!.id,
              type: knowledgeRouterAgent!.type,
              name: knowledgeRouterAgent!.name,
              phase: knowledgeRouterAgent!.phase,
              promptTemplate: knowledgeRouterAgent!.promptTemplate,
              connectionId: knowledgeRouterAgent!.connectionId,
              settings: knowledgeRouterAgent!.settings,
            };
            const routerResult = await executeKnowledgeRouter(
              routerConfig,
              agentContext,
              knowledgeRouterAgent!.provider,
              knowledgeRouterAgent!.model,
              knowledgeRouterEntries,
              {
                embeddingSource: memoryRecallEmbeddingSource,
                semanticTopK: knowledgeRouterAgent!.settings.semanticTopK,
                ...(knowledgeRouterActivationPassCompleted
                  ? { activatedEntries: knowledgeRouterActivatedEntries }
                  : {}),
                keywordScanEntries: knowledgeRouterKeywordScanEntries,
                scanMessages: toLorebookScanMessages(),
                scanOptions: {
                  gameState: gameState as GameStateForScanning | null,
                  activeCharacterIds: promptCharacterIds,
                  activeCharacterTags: knowledgeRouterActiveCharacterTags,
                  generationTriggers: lorebookGenerationTriggers,
                },
              },
            );
            sendAgentEvent(routerResult);
            logger.debug(`[timing] Knowledge router: ${Date.now() - _tRouter}ms`);
            return routerResult;
          } catch (err) {
            logger.warn(err, "[knowledge-router] failed — continuing generation without routed context");
            trySendSseEvent(reply, {
              type: "agent_error",
              data: {
                agentType: "knowledge-router",
                error: err instanceof Error ? err.message : "Knowledge router failed",
              },
            });
            return null;
          }
        })()
      : Promise.resolve(null);

    const [preGenResult, krResult, routerResult] = await Promise.all([preGenPromise, krPromise, krRouterPromise]);
    contextInjections = [...reviewedAgentInjections, ...preGenResult];

    const preGenResults: AgentResult[] = pipeline.results.filter(
      (r: any) => r.agentType !== "knowledge-retrieval" && r.agentType !== "knowledge-router",
    );
    const latestUserMessageForPreGenRun = [...allChatMessages]
      .reverse()
      .find((message: any) => message.role === "user");
    const preGenRunMessageId = latestUserMessageForPreGenRun?.id ?? "";
    if (preGenRunMessageId) {
      for (const result of preGenResults) {
        if (builtInAgentTypes.has(result.agentType)) continue;
        try {
          await agentsStore.saveRun({
            agentConfigId: result.agentId,
            chatId: input.chatId,
            messageId: preGenRunMessageId,
            result,
          });
        } catch {
        }
      }
    }
    const criticalFailed = preGenResults.filter((r: any) => !r.success && r.type === "secret_plot");
    const nonCriticalFailed = preGenResults.filter((r: any) => !r.success && r.type !== "secret_plot");
    if (criticalFailed.length > 0) {
      const failedNames = criticalFailed.map((r: any) => r.agentType).join(", ");
      const firstError = criticalFailed[0]!.error ?? "unknown error";
      logger.error(`[pre-gen] FATAL: critical agent(s) failed (${failedNames}) — aborting generation`);
      sendSseEvent(reply, {
        type: "error",
        data: `Critical pre-generation agent failed (${failedNames}): ${firstError}. Please try again.`,
      });
      return { contextInjections, finalMessages, abortGeneration: true };
    }
    if (nonCriticalFailed.length > 0) {
      const failedNames = nonCriticalFailed.map((r: any) => r.agentType).join(", ");
      logger.warn(`[pre-gen] Non-critical agent(s) failed (${failedNames}) — continuing generation`);
    }

    const shouldReviewWriterAgentOutputs =
      (chatMode === "roleplay" || chatMode === "visual_novel") &&
      chatMeta.reviewWriterAgentOutputs === true &&
      reviewedAgentInjections.length === 0 &&
      !input.regenerateMessageId;
    const reviewableWriterInjections = contextInjections.filter((entry) =>
      REVIEWABLE_WRITER_AGENT_TYPES.has(entry.agentType),
    );
    if (shouldReviewWriterAgentOutputs && reviewableWriterInjections.length > 0) {
      const agentNames = new Map(resolvedAgents.map((agent) => [agent.type, agent.name] as const));
      sendSseEvent(reply, {
        type: "agent_injection_review",
        data: {
          chatId: input.chatId,
          injections: reviewableWriterInjections.map((entry) => ({
            agentType: entry.agentType,
            agentName: agentNames.get(entry.agentType) ?? entry.agentType,
            text: entry.text,
          })),
        },
      });
      return { contextInjections, finalMessages, abortGeneration: true };
    }

    const plotResult = preGenResults.find((r: any) => r.type === "secret_plot");
    if (plotResult?.success && plotResult.data && typeof plotResult.data === "object") {
      const plotData = plotResult.data as Record<string, unknown>;
      const agentConfigId = secretPlotAgent?.id ?? plotResult.agentId;

      try {
        if (plotData.overarchingArc) {
          await agentsStore.setMemory(agentConfigId, input.chatId, "overarchingArc", plotData.overarchingArc);
        }
        if (plotData.sceneDirections) {
          const allDirections = normalizeSecretPlotSceneDirections(plotData.sceneDirections);
          const active = allDirections.filter((d) => !d.fulfilled);
          const justFulfilled = allDirections.filter((d) => d.fulfilled).map((d) => d.direction);
          await agentsStore.setMemory(agentConfigId, input.chatId, "sceneDirections", active);

          if (justFulfilled.length > 0) {
            const mem = await agentsStore.getMemory(agentConfigId, input.chatId);
            const prev = normalizeStringArray(mem.recentlyFulfilled);
            const merged = [...prev, ...justFulfilled].slice(-10);
            await agentsStore.setMemory(agentConfigId, input.chatId, "recentlyFulfilled", merged);
          }
        } else {
          await agentsStore.setMemory(agentConfigId, input.chatId, "sceneDirections", []);
        }
        if (plotData.pacing) {
          await agentsStore.setMemory(agentConfigId, input.chatId, "pacing", plotData.pacing);
        }
        await agentsStore.setMemory(
          agentConfigId,
          input.chatId,
          "staleDetected",
          plotData.staleDetected ?? false,
        );
        logger.debug(
          `[secret-plot-driver] Persisted pre-gen state — arc: ${plotData.overarchingArc ? "updated" : "unchanged"}, directions: ${Array.isArray(plotData.sceneDirections) ? (plotData.sceneDirections as any[]).filter((d: any) => !d.fulfilled).length : 0} active, pacing: ${plotData.pacing ?? "unknown"}`,
        );
      } catch (persistErr) {
        logger.error(persistErr, "[secret-plot-driver] Failed to persist state");
      }
    }

    const runtimeHandledPreGen = splitRuntimeHandledAgentInjections(
      finalMessages,
      runtimeAgentSectionTokens,
      contextInjections,
    );

    if (runtimeHandledPreGen.fallbackInjections.length > 0) {
      const wrapped = formatAgentInjections(runtimeHandledPreGen.fallbackInjections, wrapFormat);
      finalMessages = injectAtDepth(finalMessages, [{ content: wrapped, role: "system", depth: 0 }]);
    }

    if (krResult?.success && krResult.data) {
      const krText =
        typeof krResult.data === "string" ? krResult.data : ((krResult.data as { text?: string })?.text ?? "");
      if (krText) {
        const tokens = runtimeAgentSectionTokens.get("knowledge-retrieval");
        const handledByPresetSection =
          !runtimeHandledPreGen.handledTypes.has("knowledge-retrieval") &&
          tokens !== undefined &&
          replaceRuntimeAgentSection(finalMessages, tokens, krText);
        if (!handledByPresetSection) {
          appendSeparateAgentInjection("knowledge-retrieval", krText);
        }
        contextInjections.push({ agentType: "knowledge-retrieval", text: krText });
      }
    }

    if (routerResult?.success && routerResult.data) {
      const routerText =
        typeof routerResult.data === "string"
          ? routerResult.data
          : ((routerResult.data as { text?: string })?.text ?? "");
      if (routerText) {
        const tokens = runtimeAgentSectionTokens.get("knowledge-router");
        const handledByPresetSection =
          !runtimeHandledPreGen.handledTypes.has("knowledge-router") &&
          tokens !== undefined &&
          replaceRuntimeAgentSection(finalMessages, tokens, routerText);
        if (!handledByPresetSection) {
          appendSeparateAgentInjection("knowledge-router", routerText);
        }
        contextInjections.push({ agentType: "knowledge-router", text: routerText });
      }
    }
    clearUnusedRuntimeAgentSections(finalMessages, runtimeAgentSectionTokens);
  } else if (input.regenerateMessageId) {
    const regenExtra = parseExtra(regenMsg?.extra);
    const cached = normalizeContextInjections(regenExtra.contextInjections);
    const cachedSansSecret = cached.filter((i) => i.agentType !== "secret-plot-driver");

    if (cachedSansSecret && cachedSansSecret.length > 0) {
      contextInjections = cachedSansSecret;
      for (const inj of cachedSansSecret) {
        reply.raw.write(
          `data: ${JSON.stringify({
            type: "agent_result",
            data: {
              agentType: inj.agentType,
              agentName: agentNameByType.get(inj.agentType) ?? inj.agentName ?? inj.agentType,
              resultType: "context_injection",
              data: { text: inj.text },
              success: true,
              error: null,
              durationMs: 0,
              cached: true,
            },
          })}\n\n`,
        );
      }
    } else if (hasPreGenAgents) {
      const hasContextInjectionAgents = resolvedAgents.some(
        (a) => a.phase === "pre_generation" && !EXCLUDED_FROM_PIPELINE.has(a.type),
      );
      if (hasContextInjectionAgents) {
        reply.raw.write(
          `data: ${JSON.stringify({ type: "agent_start", data: { phase: "pre_generation" } })}\n\n`,
        );
        contextInjections = (
          await pipeline.preGenerate(
            (agentType: string) => !EXCLUDED_FROM_PIPELINE.has(agentType) && agentType !== "secret-plot-driver",
          )
        ).map(attachAgentName);

        const regenPreGenResults: AgentResult[] = pipeline.results.filter(
          (r: any) =>
            r.agentType !== "knowledge-retrieval" &&
            r.agentType !== "knowledge-router" &&
            r.agentType !== "secret-plot-driver",
        );
        const failedRegen = regenPreGenResults.filter((r: any) => !r.success);
        if (failedRegen.length > 0) {
          const failedNames = failedRegen.map((r: any) => r.agentType).join(", ");
          const firstError = failedRegen[0]!.error ?? "unknown error";
          logger.error(
            `[pre-gen] FATAL: ${failedRegen.length} agent(s) failed on regen (${failedNames}) — aborting generation`,
          );
          sendSseEvent(reply, {
            type: "error",
            data: `Pre-generation agent${failedRegen.length > 1 ? "s" : ""} failed (${failedNames}): ${firstError}. Please try again.`,
          });
          return { contextInjections, finalMessages, abortGeneration: true };
        }
      }
    }

    const runtimeHandledCached = splitRuntimeHandledAgentInjections(
      finalMessages,
      runtimeAgentSectionTokens,
      contextInjections,
    );

    const cachedPipelineInjections = runtimeHandledCached.fallbackInjections.filter(
      (inj) => !SEPARATE_INJECTION_AGENTS.has(inj.agentType),
    );
    const cachedSeparateInjections = runtimeHandledCached.fallbackInjections.filter((inj) =>
      SEPARATE_INJECTION_AGENTS.has(inj.agentType),
    );

    if (cachedPipelineInjections.length > 0) {
      const wrapped = formatAgentInjections(cachedPipelineInjections, wrapFormat);
      finalMessages = injectAtDepth(finalMessages, [{ content: wrapped, role: "system", depth: 0 }]);
    }

    for (const inj of cachedSeparateInjections) {
      const runtimeType = toRuntimeAgentSectionType(inj.agentType, runtimeSectionEligibleAgentTypes);
      const tokens = runtimeType ? runtimeAgentSectionTokens.get(runtimeType) : undefined;
      const handledByPresetSection =
        tokens !== undefined && replaceRuntimeAgentSection(finalMessages, tokens, inj.text);
      if (!handledByPresetSection) {
        appendSeparateAgentInjection(inj.agentType as "knowledge-retrieval" | "knowledge-router", inj.text);
      }
    }
    clearUnusedRuntimeAgentSections(finalMessages, runtimeAgentSectionTokens);
  } else {
    clearUnusedRuntimeAgentSections(finalMessages, runtimeAgentSectionTokens);
  }

  if (secretPlotAgent) {
    try {
      const plotMem = await agentsStore.getMemory(secretPlotAgent.id, input.chatId);
      const arcRaw = plotMem.overarchingArc as Record<string, unknown> | string | undefined;
      const sceneDirections = normalizeSecretPlotSceneDirections(plotMem.sceneDirections);

      if (arcRaw) {
        const arcLines: string[] = [];
        if (typeof arcRaw === "object" && arcRaw !== null) {
          if (arcRaw.description) arcLines.push(String(arcRaw.description));
          if (arcRaw.protagonistArc) arcLines.push(`Protagonist arc: ${arcRaw.protagonistArc}`);
        } else {
          arcLines.push(String(arcRaw));
        }
        if (arcLines.length > 0) {
          const arcBlock = wrapContent(arcLines.join("\n"), "overarching_arc", wrapFormat);

          let injected = false;

          if (wrapFormat === "xml") {
            for (let i = 0; i < finalMessages.length; i++) {
              const msg = finalMessages[i]!;
              if (msg.role !== "system") continue;
              if (!msg.content.includes("<lore>")) continue;

              const personaMatch = msg.content.match(/^([ \t]*)<\/persona>/m);
              const indent = personaMatch?.[1] ?? "    ";
              const indentedArc = arcBlock.replace(/\n/g, "\n" + indent);
              if (msg.content.includes("</persona>")) {
                finalMessages[i] = {
                  ...msg,
                  content: msg.content.replace("</persona>", `</persona>\n${indent}${indentedArc}`),
                };
              } else {
                const loreMatch = msg.content.match(/^([ \t]*)<\/lore>/m);
                const loreIndent = loreMatch?.[1] ?? "";
                const innerIndent = loreIndent + "    ";
                const indentedArcLore = arcBlock.replace(/\n/g, "\n" + innerIndent);
                finalMessages[i] = {
                  ...msg,
                  content: msg.content.replace(
                    "</lore>",
                    `${innerIndent}${indentedArcLore}\n${loreIndent}</lore>`,
                  ),
                };
              }
              injected = true;
              break;
            }
          } else if (wrapFormat === "markdown") {
            for (let i = 0; i < finalMessages.length; i++) {
              const msg = finalMessages[i]!;
              if (msg.role !== "system") continue;
              if (!msg.content.includes("# Lore")) continue;
              finalMessages[i] = { ...msg, content: msg.content + "\n" + arcBlock };
              injected = true;
              break;
            }
          }

          if (!injected) {
            const firstChatIdx = finalMessages.findIndex((m) => m.role === "user" || m.role === "assistant");
            const searchEnd = firstChatIdx >= 0 ? firstChatIdx : finalMessages.length;
            let lastSysIdx = -1;
            for (let i = searchEnd - 1; i >= 0; i--) {
              if (finalMessages[i]!.role === "system") {
                lastSysIdx = i;
                break;
              }
            }
            if (lastSysIdx >= 0) {
              const sysMsg = finalMessages[lastSysIdx]!;
              finalMessages[lastSysIdx] = { ...sysMsg, content: sysMsg.content + "\n" + arcBlock };
            } else {
              const insertAt = firstChatIdx >= 0 ? firstChatIdx : finalMessages.length;
              finalMessages.splice(insertAt, 0, { role: "system", content: arcBlock });
            }
          }
        }
      }

      const activeDirections = sceneDirections.filter((d) => !d.fulfilled);
      if (activeDirections.length > 0) {
        const dirLines = activeDirections.map((d) => `- ${d.direction}`).join("\n");
        const dirBlock = wrapContent(dirLines, "scene_directions", wrapFormat);

        if (wrapFormat === "xml") {
          const ctxIdx = finalMessages.findIndex((m) => m.role === "system" && m.content.includes("<context>"));
          if (ctxIdx >= 0) {
            const ctxMsg = finalMessages[ctxIdx]!;
            finalMessages[ctxIdx] = {
              ...ctxMsg,
              content: ctxMsg.content.replace(
                "</context>",
                `    ${dirBlock.replace(/\n/g, "\n    ")}\n</context>`,
              ),
            };
          } else {
            const contextBlock = `<context>\n    ${dirBlock.replace(/\n/g, "\n    ")}\n</context>`;
            const lastUserIdx = findLastIndex(finalMessages, "user");
            finalMessages.splice(lastUserIdx >= 0 ? lastUserIdx : finalMessages.length, 0, {
              role: "system",
              content: contextBlock,
            });
          }
        } else if (wrapFormat === "markdown") {
          const ctxIdx = finalMessages.findIndex((m) => m.role === "system" && m.content.includes("# Context"));
          if (ctxIdx >= 0) {
            const ctxMsg = finalMessages[ctxIdx]!;
            finalMessages[ctxIdx] = { ...ctxMsg, content: ctxMsg.content + "\n" + dirBlock };
          } else {
            const contextBlock = `# Context\n${dirBlock}`;
            const lastUserIdx = findLastIndex(finalMessages, "user");
            finalMessages.splice(lastUserIdx >= 0 ? lastUserIdx : finalMessages.length, 0, {
              role: "system",
              content: contextBlock,
            });
          }
        } else {
          const lastUserIdx = findLastIndex(finalMessages, "user");
          finalMessages.splice(lastUserIdx >= 0 ? lastUserIdx : finalMessages.length, 0, {
            role: "system",
            content: dirBlock,
          });
        }
      }
    } catch (plotInjectErr) {
      logger.error(plotInjectErr, "[secret-plot-driver] Failed to inject arc/directions");
    }
  }

  if (resolvedAgents.some((a) => a.type === "html")) {
    const htmlAgent = resolvedAgents.find((a) => a.type === "html")!;
    const { getDefaultAgentPrompt } = await import("@jumpchoice/shared");
    const htmlPrompt = (htmlAgent.promptTemplate || getDefaultAgentPrompt("html")).trim();
    if (htmlPrompt) {
      const htmlBlock = wrapFormat === "markdown" ? `\n## Immersive HTML\n${htmlPrompt}` : htmlPrompt;

      let injected = false;
      for (let i = 0; i < finalMessages.length; i++) {
        const msg = finalMessages[i]!;
        if (msg.content.includes("</output_format>")) {
          finalMessages[i] = {
            ...msg,
            content: msg.content.replace("</output_format>", "    " + htmlBlock + "\n</output_format>"),
          };
          injected = true;
          break;
        }
      }
      if (!injected) {
        const lastUserIdx = findLastIndex(finalMessages, "user");
        const idx = lastUserIdx >= 0 ? lastUserIdx : finalMessages.length - 1;
        const target = finalMessages[idx]!;
        finalMessages[idx] = {
          ...target,
          content:
            target.content +
            "\n\n" +
            (wrapFormat === "xml" ? `<immersive_html>\n${htmlPrompt}\n</immersive_html>` : htmlBlock),
        };
      }

      reply.raw.write(
        `data: ${JSON.stringify({
          type: "agent_result",
          data: {
            agentType: "html",
            agentName: htmlAgent.name || "Immersive HTML",
            resultType: "context_injection",
            data: { text: "HTML formatting instructions injected into prompt" },
            success: true,
            error: null,
            durationMs: 0,
          },
        })}\n\n`,
      );
    }
  }

  if (chatMeta.summary) {
    const chatSummaryCfg = enabledConfigs.find((c: any) => c.type === "chat-summary");
    reply.raw.write(
      `data: ${JSON.stringify({
        type: "agent_result",
        data: {
          agentType: "chat-summary",
          agentName: (chatSummaryCfg as any)?.name || "Chat Summary",
          resultType: "context_injection",
          data: { text: "Chat summary injected into prompt" },
          success: true,
           error: null,
          durationMs: 0,
        },
      })}\n\n`,
    );
  }

  // ── Language learning: run proficiency estimator in pre-gen ──
  if (chatMode === "language_learning" && !input.regenerateMessageId) {
    const proficiencyAgent = resolvedAgents.find((a) => a.type === "proficiency-estimator");
    if (proficiencyAgent) {
      try {
        const langConfig = chatMeta.languageLearning as
          | import("../generation/language-learning-prompt-builder.js").LanguageLearningConfig
          | undefined;
        if (langConfig) {
          const profResult = await executeProficiencyEstimator(
            proficiencyAgent,
            agentContext,
            proficiencyAgent.provider,
            proficiencyAgent.model,
          );
          sendAgentEvent(profResult);
          if (profResult.success && profResult.data) {
            const coordinator = createLearningCoordinator(db);
            const data = profResult.data as { level?: string; confidence?: number };
            if (data.level) {
              const userId = (chatMeta.userId as string) ?? "unknown";
              const langs = await coordinator.proficiency.listLanguages(userId);
              const lang = langs.find((l) => l.code === langConfig.languageCode);
              if (lang) {
                await coordinator.proficiency.setLevel(
                  lang.id,
                  data.level as import("@jumpchoice/shared").CefrLevel,
                  data.confidence ?? 0.5,
                  "ai_estimated" as import("@jumpchoice/shared").ProficiencySource,
                );
              }
            }
          }
        }
      } catch (err) {
        logger.warn(err, "[proficiency-estimator] failed — continuing generation");
      }
    }
  }

  return { contextInjections, finalMessages, abortGeneration: false };
}
