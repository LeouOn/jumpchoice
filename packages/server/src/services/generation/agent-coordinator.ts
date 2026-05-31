import {
  BUILT_IN_AGENTS,
  DEFAULT_AGENT_TOOLS,
  getDefaultBuiltInAgentSettings,
} from "@jumpchoice/shared";
import type { CharacterMacroProfile } from "@jumpchoice/shared";
import type { ResolvedAgent } from "../agents/agent-pipeline.js";
import {
  createStandardProvider,
  seedLocalSidecarIntoCache,
  seedDefaultAgentConnectionIntoCache,
  type AgentProviderCache,
} from "../../routes/generate/provider.routes.js";
import {
  buildDefaultAgentConnectionWarning,
  buildLocalSidecarUnavailableWarning,
  resolveAgentConnectionId,
  type AgentConnectionWarning,
} from "../../routes/generate/agent-connection-guards.js";
import { sidecarModelService } from "../sidecar/sidecar-model.service.js";
import { logger } from "../../lib/logger.js";
import { resolveBaseUrl } from "../../routes/generate/generate-route-utils.js";
import { getCharacterDescriptionWithExtensions } from "../prompt/index.js";

import type { CharInfoEntry } from "./types.js";

export type { CharInfoEntry };

export interface AgentPipelineContext {
  agentsStore: any;
  connections: any;
  conn: any;
  provider: any;
  chars: any;
  earlyMeta: any;
  chatMeta: Record<string, unknown>;
  input: any;
  chatMode: string;
  characterIds: string[];
  allChatMessages: any[];
  chatActiveAgentIds: string[];
  chatEnableAgents: boolean;
}

export interface AgentPipelineResult {
  resolvedAgents: ResolvedAgent[];
  agentProviderCache: AgentProviderCache;
  agentConnectionWarnings: AgentConnectionWarning[];
  responseOrchestratorSelectorAgent: ResolvedAgent | null;
  responseOrchestratorSelectorUnavailable: boolean;
  charInfo: CharInfoEntry[];
  characterMacroProfilesById: Map<string, CharacterMacroProfile>;
  resolveGameDiscordSpeakerName: () => Promise<string>;
  enabledConfigs: any[];
  builtInAgentTypes: Set<string>;
}

export async function resolveAgentPipeline(
  ctx: AgentPipelineContext,
): Promise<AgentPipelineResult> {
  const {
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
  } = ctx;

  // ────────────────────────────────────────
  // Agent Pipeline: resolve enabled agents
  // ────────────────────────────────────────
  const hasPerChatAgentList = chatActiveAgentIds.length > 0;
  const perChatAgentSet = new Set(chatActiveAgentIds);

  // Only run agents that are explicitly added to the chat.
  // Empty activeAgentIds = no agents (not "all globally-enabled").
  const enabledConfigs = chatEnableAgents && hasPerChatAgentList ? await agentsStore.list() : [];

  // Build ResolvedAgent array — each agent gets its own provider/model or falls back to chat connection
  const resolvedAgents: ResolvedAgent[] = [];
  // Cache per-connection providers so agents sharing the same connection batch together
  const chatConnectionMaxParallelJobs = Number(conn.maxParallelJobs) || 1;
  const agentProviderCache: AgentProviderCache = new Map();
  const localSidecarAvailableForTrackers =
    sidecarModelService.getConfig().useForTrackers && sidecarModelService.getConfiguredModelRef() !== null;
  seedLocalSidecarIntoCache(agentProviderCache, localSidecarAvailableForTrackers);

  // Check if there's a connection marked as default for all agents
  const defaultAgentConn = await connections.getDefaultForAgents();
  await seedDefaultAgentConnectionIntoCache(agentProviderCache, defaultAgentConn);

  const agentConnectionWarnings: AgentConnectionWarning[] = [];
  const skippedLocalSidecarAgents: string[] = [];
  const defaultAgentConnectionAgents: string[] = [];
  let responseOrchestratorSelectorAgent: ResolvedAgent | null = null;
  let responseOrchestratorSelectorUnavailable = false;
  for (const cfg of enabledConfigs) {
    // If this chat has a per-chat agent list, only include agents in that list
    if (hasPerChatAgentList && !perChatAgentSet.has(cfg.type)) continue;
    const settings = cfg.settings ? JSON.parse(cfg.settings as string) : {};
    let agentProvider = provider;
    let agentModel = conn.model;
    let agentMaxParallelJobs = chatConnectionMaxParallelJobs;

    // Resolve connection: per-agent override > default-for-agents > chat connection
    const effectiveConnectionId = resolveAgentConnectionId({
      requestedConnectionId: cfg.connectionId as string | null,
      defaultAgentConnectionId: defaultAgentConn?.id ?? null,
      localSidecarAvailable: localSidecarAvailableForTrackers,
    });

    if (effectiveConnectionId === "skip-local-sidecar") {
      skippedLocalSidecarAgents.push(cfg.name ?? cfg.type);
      logger.warn(
        "[generate] Skipping agent %s for chat %s because Local Model was requested but the sidecar is unavailable",
        cfg.type,
        input.chatId,
      );
      continue;
    }
    if (defaultAgentConn && effectiveConnectionId === defaultAgentConn.id) {
      defaultAgentConnectionAgents.push(cfg.name ?? cfg.type);
    }
    if (effectiveConnectionId) {
      const cached = agentProviderCache.get(effectiveConnectionId);
      if (cached) {
        agentProvider = cached.provider;
        agentModel = cached.model;
        agentMaxParallelJobs = cached.maxParallelJobs;
      } else {
        const agentConn = await connections.getWithKey(effectiveConnectionId);
              if (agentConn) {
                const agentBaseUrl = resolveBaseUrl(agentConn);
                if (agentBaseUrl) {
                  agentProvider = createStandardProvider(agentConn, agentBaseUrl);
                  agentModel = agentConn.model;
                  agentMaxParallelJobs = Number(agentConn.maxParallelJobs) || 1;
                  agentProviderCache.set(effectiveConnectionId, {
                    provider: agentProvider,
                    model: agentModel,
                    maxParallelJobs: agentMaxParallelJobs,
                  });
                }
              }
      }
    }

    resolvedAgents.push({
      id: cfg.id,
      type: cfg.type,
      name: cfg.name,
      phase: cfg.phase as string,
      promptTemplate: cfg.promptTemplate as string,
      connectionId: effectiveConnectionId,
      settings,
      provider: agentProvider,
      model: agentModel,
      maxParallelJobs: agentMaxParallelJobs,
    });
  }
  if (skippedLocalSidecarAgents.length > 0) {
    agentConnectionWarnings.push(buildLocalSidecarUnavailableWarning(skippedLocalSidecarAgents));
  }

  // Built-in agents with no DB row → use defaults only if explicitly in the per-chat list
  const resolvedTypes = new Set(resolvedAgents.map((a) => a.type));
  const builtInFallbacks =
    chatEnableAgents && hasPerChatAgentList
      ? BUILT_IN_AGENTS.filter((a) => {
          if (resolvedTypes.has(a.id)) return false;
          if (a.id === "chat-summary") return false;
          return perChatAgentSet.has(a.id);
        })
      : [];
  for (const builtIn of builtInFallbacks) {
    // Built-in agents also respect the default-for-agents connection
    const builtInCached = defaultAgentConn ? agentProviderCache.get(defaultAgentConn.id) : null;
    if (defaultAgentConn) {
      defaultAgentConnectionAgents.push(builtIn.name);
    }
    const builtInSettings = getDefaultBuiltInAgentSettings(builtIn.id);
    if (builtIn.id === "spotify" && !Array.isArray(builtInSettings.enabledTools)) {
      builtInSettings.enabledTools = DEFAULT_AGENT_TOOLS.spotify ?? [];
    }

    resolvedAgents.push({
      id: `builtin:${builtIn.id}`,
      type: builtIn.id,
      name: builtIn.name,
      phase: builtIn.phase,
      promptTemplate: "",
      connectionId: defaultAgentConn?.id ?? null,
      settings: builtInSettings,
      provider: builtInCached?.provider ?? provider,
      model: builtInCached?.model ?? conn.model,
      maxParallelJobs: builtInCached?.maxParallelJobs ?? chatConnectionMaxParallelJobs,
    });
  }

  // The smart group speaker picker is an internal Response Orchestrator call,
  // not a normal pipeline agent. Resolve only that agent's config so its
  // connection/model/budget controls apply without enabling unrelated agents.
  const selectorGroupResponseOrder = (chatMeta.groupResponseOrder as string) ?? "sequential";
  const selectorGroupChatMode =
    chatMode === "conversation"
      ? selectorGroupResponseOrder === "manual"
        ? "individual"
        : "merged"
      : ((chatMeta.groupChatMode as string) ?? "merged");
  const shouldResolveResponseOrchestratorSelector =
    !input.impersonate &&
    !input.regenerateMessageId &&
    characterIds.length > 1 &&
    selectorGroupChatMode === "individual" &&
    selectorGroupResponseOrder === "smart";
  if (shouldResolveResponseOrchestratorSelector) {
    const resolvedResponseOrchestratorAgent = resolvedAgents.find(
      (agent) => agent.type === "response-orchestrator",
    );
    if (resolvedResponseOrchestratorAgent) {
      responseOrchestratorSelectorAgent = resolvedResponseOrchestratorAgent;
    } else {
      const storedResponseOrchestratorConfig = await agentsStore.getByType("response-orchestrator");
      const cfg =
        storedResponseOrchestratorConfig ??
        (defaultAgentConn
          ? (BUILT_IN_AGENTS.find((agent) => agent.id === "response-orchestrator") ?? null)
          : null);
      if (cfg) {
        const settings =
          "settings" in cfg && cfg.settings
            ? JSON.parse(cfg.settings as string)
            : getDefaultBuiltInAgentSettings("response-orchestrator");
        let agentProvider = provider;
        let agentModel = conn.model;
        let agentMaxParallelJobs = chatConnectionMaxParallelJobs;
        const requestedConnectionId = "connectionId" in cfg ? (cfg.connectionId as string | null) : null;
        const effectiveConnectionId = resolveAgentConnectionId({
          requestedConnectionId,
          defaultAgentConnectionId: defaultAgentConn?.id ?? null,
          localSidecarAvailable: localSidecarAvailableForTrackers,
        });

        if (effectiveConnectionId === "skip-local-sidecar") {
          responseOrchestratorSelectorUnavailable = true;
          const alreadyWarned = skippedLocalSidecarAgents.some(
            (agentName) => agentName === "Response Orchestrator",
          );
          if (!alreadyWarned) {
            agentConnectionWarnings.push(buildLocalSidecarUnavailableWarning(["Response Orchestrator"]));
          }
          logger.warn(
            "[group-smart] Skipping Response Orchestrator Local Model override for chat %s because the sidecar is unavailable",
            input.chatId,
          );
        } else {
          if (defaultAgentConn && effectiveConnectionId === defaultAgentConn.id) {
            defaultAgentConnectionAgents.push("Response Orchestrator");
          }
          if (effectiveConnectionId) {
            const cached = agentProviderCache.get(effectiveConnectionId);
            if (cached) {
              agentProvider = cached.provider;
              agentModel = cached.model;
              agentMaxParallelJobs = cached.maxParallelJobs;
            } else {
              const agentConn = await connections.getWithKey(effectiveConnectionId);
              if (agentConn) {
                const agentBaseUrl = resolveBaseUrl(agentConn);
                if (agentBaseUrl) {
                  agentProvider = createStandardProvider(agentConn, agentBaseUrl);
                  agentModel = agentConn.model;
                  agentMaxParallelJobs = Number(agentConn.maxParallelJobs) || 1;
                  agentProviderCache.set(effectiveConnectionId, {
                    provider: agentProvider,
                    model: agentModel,
                    maxParallelJobs: agentMaxParallelJobs,
                  });
                }
              }
            }
          }

          responseOrchestratorSelectorAgent = {
            id: "id" in cfg ? String(cfg.id) : "builtin:response-orchestrator",
            type: "response-orchestrator",
            name: "name" in cfg ? String(cfg.name) : "Response Orchestrator",
            phase: "phase" in cfg ? String(cfg.phase) : "pre_generation",
            promptTemplate: "promptTemplate" in cfg ? String(cfg.promptTemplate ?? "") : "",
            connectionId: effectiveConnectionId,
            settings,
            provider: agentProvider,
            model: agentModel,
            maxParallelJobs: agentMaxParallelJobs,
          };
        }
      }
    }
  }

  if (defaultAgentConn && defaultAgentConnectionAgents.length > 0) {
    agentConnectionWarnings.push(
      buildDefaultAgentConnectionWarning({
        agentNames: defaultAgentConnectionAgents,
        connectionName: defaultAgentConn.name,
        model: defaultAgentConn.model,
      }),
    );
  }

  logger.info(
    "[generate] Resolved %d agents for chat %s (enableAgents=%s, perChatList=%s, activeIds=[%s]): %s",
    resolvedAgents.length,
    input.chatId,
    chatEnableAgents,
    hasPerChatAgentList,
    chatActiveAgentIds.join(","),
    resolvedAgents.map((a) => `${a.type}(${a.phase})`).join(", "),
  );

  const builtInAgentTypes = new Set(BUILT_IN_AGENTS.map((agent) => agent.id));
  const userMessagesSinceLastAgentRun = async (agentType: string) => {
    const lastRun = await agentsStore.getLastRunByType(agentType, input.chatId);
    if (!lastRun) return Number.POSITIVE_INFINITY;

    const lastRunIdx = allChatMessages.findIndex((message: any) => message.id === lastRun.messageId);
    if (lastRunIdx < 0) return Number.POSITIVE_INFINITY;

    return allChatMessages.slice(lastRunIdx + 1).filter((message: any) => message.role === "user").length;
  };

  for (let index = resolvedAgents.length - 1; index >= 0; index--) {
    const agent = resolvedAgents[index]!;
    if (builtInAgentTypes.has(agent.type)) continue;

    const runInterval = Number(agent.settings.runInterval ?? 0);
    if (!Number.isFinite(runInterval) || runInterval <= 1) continue;

    const userMessageCount = await userMessagesSinceLastAgentRun(agent.type);
    if (userMessageCount < runInterval) {
      logger.debug(
        "[agents] Skipping custom agent %s until cadence threshold: %d/%d user messages",
        agent.type,
        userMessageCount,
        runInterval,
      );
      resolvedAgents.splice(index, 1);
    }
  }

  // Resolve character info (used for agent context AND prompt fallback)
  const charInfo: CharInfoEntry[] = [];
  for (const cid of characterIds) {
    const charRow = await chars.getById(cid);
    if (charRow) {
      const charData = JSON.parse(charRow.data as string);
      let scenario: string = charData.scenario ?? "";
      // Strip assistant-only capabilities from Mari's scenario in non-conversation modes
      if (chatMode !== "conversation" && charData.extensions?.isBuiltInAssistant) {
        scenario = scenario.replace(/<assistant_capabilities>[\s\S]*?<\/assistant_capabilities>/gi, "").trim();
      }
      const description = getCharacterDescriptionWithExtensions(charData);
      charInfo.push({
        id: cid,
        name: charData.name ?? "Unknown",
        description,
        personality: charData.personality ?? "",
        scenario,
        creatorNotes: charData.creator_notes ?? "",
        systemPrompt: charData.system_prompt ?? "",
        backstory: charData.extensions?.backstory ?? "",
        appearance: charData.extensions?.appearance ?? "",
        mesExample: charData.mes_example ?? "",
        firstMes: charData.first_mes ?? "",
        postHistoryInstructions: charData.post_history_instructions ?? "",
        tags: Array.isArray(charData.tags) ? charData.tags.map(String).filter(Boolean) : [],
        talkativeness: Math.max(0, Math.min(1, Number(charData.extensions?.talkativeness ?? 0.5))),
        avatarPath: (charRow.avatarPath as string) ?? null,
      });
    }
  }
  const characterMacroProfilesById = new Map<string, CharacterMacroProfile>(
    charInfo.map((character) => [
      character.id,
      {
        name: character.name,
        description: character.description,
        personality: character.personality,
        backstory: character.backstory,
        appearance: character.appearance,
        scenario: character.scenario,
        example: character.mesExample,
        systemPrompt: character.systemPrompt,
        postHistoryInstructions: character.postHistoryInstructions,
      },
    ]),
  );

  let resolvedGameDiscordSpeakerName: string | null = null;
  let gameDiscordSpeakerResolved = false;

  const resolveGameDiscordSpeakerName = async (): Promise<string> => {
    if (gameDiscordSpeakerResolved) {
      return resolvedGameDiscordSpeakerName ?? "Narrator";
    }

    gameDiscordSpeakerResolved = true;
    const gmMode = typeof earlyMeta.gameGmMode === "string" ? earlyMeta.gameGmMode : "";
    const gmCharacterId =
      typeof earlyMeta.gameGmCharacterId === "string" && earlyMeta.gameGmCharacterId.trim()
        ? earlyMeta.gameGmCharacterId.trim()
        : null;

    if (chatMode === "game" && gmMode === "character" && gmCharacterId) {
      const knownCharacter = charInfo.find((character) => character.id === gmCharacterId);
      if (knownCharacter?.name) {
        resolvedGameDiscordSpeakerName = knownCharacter.name;
        return knownCharacter.name;
      }

      const gmRow = await chars.getById(gmCharacterId);
      if (gmRow) {
        try {
          const gmData = JSON.parse(gmRow.data as string);
          if (typeof gmData.name === "string" && gmData.name.trim()) {
            const gmName = gmData.name.trim();
            resolvedGameDiscordSpeakerName = gmName;
            return gmName;
          }
        } catch {
          /* ignore malformed GM card data */
        }
      }
    }

    resolvedGameDiscordSpeakerName = "Narrator";
    return "Narrator";
  };

  return {
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
  };
}
