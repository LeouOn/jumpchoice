import type {
  GameCampaignPlan,
  GameActiveState,
  GameMap,
  GameNpc,
  LorebookEntry,
  LorebookEntryTimingState,
  SessionSummary,
} from "@jumpchoice/shared";
import { buildGmSystemPrompt, buildGmFormatReminder, type GmPromptContext } from "../game/gm-prompts.js";
import {
  generatePerceptionHints,
  formatPerceptionHints,
  type PerceptionContext,
} from "../game/perception.service.js";
import { getMoraleTier, formatMoraleContext } from "../game/morale.service.js";
import { listPartySprites } from "../game/sprite.service.js";
import { buildPartyNpcId, isPartyNpcId } from "./helpers.js";
import { processLorebooks } from "../lorebook/index.js";
import { injectAtDepth } from "../lorebook/prompt-injector.js";
import { applyLorebookDecorators } from "../lorebook/decorator-injector.js";
import {
  resolveLorebookTokenBudget,
  persistLorebookRuntimeState,
  rememberKnowledgeRouterActivatedLorebookIds,
} from "../../routes/generate/prompt.routes.js";
import { sidecarModelService } from "../sidecar/sidecar-model.service.js";
import { isInferenceAvailable as isSidecarInferenceAvailable } from "../sidecar/sidecar-inference.service.js";
import { parseExtra } from "../../routes/generate/generate-route-utils.js";
import { logger } from "../../lib/logger.js";

export interface GamePromptContext {
  db: any;
  chats: any;
  chars: any;
  chatMeta: Record<string, unknown>;
  chat: any;
  input: any;
  characterIds: string[];
  personaName: string;
  personaId: string | null;
  chatMode: string;
  presetHandledLorebooks: boolean;
  selectedGameStateSnapshotPromise: Promise<any>;
  selectedGameStateForPrompt: () => Promise<Record<string, unknown> | null>;
  mappedMessages: any[];
  chatContextEmbedding: number[] | null;
  chatActiveLorebookIds: string[];
  gameLorebookScopeExclusions: { excludedLorebookIds: string[]; excludedSourceAgentIds: string[] };
  lorebookGenerationTriggers: any[];
  resolvePromptMacros: (value: string) => any;
  resolvePromptMacrosForLorebook: (value: string) => any;
  sendProgress: (phase: string) => void;
  toLorebookScanMessages: () => any;
  isDebug: boolean;
  requestDebug: boolean;
  debugLog: (message: string, ...args: any[]) => void;
  knowledgeRouterActivatedLorebookEntryIds: Set<string>;
  knowledgeRouterExcludedLorebookEntryIds: Set<string>;
}

export interface GamePromptResult {
  finalMessages: any[];
  chatMeta: Record<string, unknown>;
  presetHandledLorebooks: boolean;
}

export async function buildGamePrompt(
  ctx: GamePromptContext,
  finalMessages: any[],
): Promise<GamePromptResult> {
  const {
    db,
    chats,
    chars,
    chatMeta,
    chat,
    input,
    characterIds,
    personaName,
    personaId,
    presetHandledLorebooks,
    selectedGameStateSnapshotPromise,
    selectedGameStateForPrompt,
    mappedMessages,
    chatContextEmbedding,
    chatActiveLorebookIds,
    gameLorebookScopeExclusions,
    lorebookGenerationTriggers,
    resolvePromptMacros,
    resolvePromptMacrosForLorebook,
    sendProgress,
    toLorebookScanMessages,
    isDebug,
    requestDebug,
    debugLog,
    knowledgeRouterActivatedLorebookEntryIds,
    knowledgeRouterExcludedLorebookEntryIds,
  } = ctx;

  // Gather game metadata for prompt context
  const setupConfig =
    chatMeta.gameSetupConfig &&
    typeof chatMeta.gameSetupConfig === "object" &&
    !Array.isArray(chatMeta.gameSetupConfig)
      ? (chatMeta.gameSetupConfig as Record<string, unknown>)
      : null;
  const gameActiveState = (chatMeta.gameActiveState as string) || "exploration";
  const sessionNumber = (chatMeta.gameSessionNumber as number) || 1;
  const storyArc = (chatMeta.gameStoryArc as string) || null;
  const plotTwists = Array.isArray(chatMeta.gamePlotTwists) ? (chatMeta.gamePlotTwists as string[]) : null;
  const gameBlueprint =
    chatMeta.gameBlueprint &&
    typeof chatMeta.gameBlueprint === "object" &&
    !Array.isArray(chatMeta.gameBlueprint)
      ? (chatMeta.gameBlueprint as { campaignPlan?: GameCampaignPlan; hudWidgets?: unknown })
      : null;
  const gameMap = (chatMeta.gameMap as GameMap) || null;
  const gameNpcs = Array.isArray(chatMeta.gameNpcs)
    ? (chatMeta.gameNpcs as GameNpc[])
    : [];
  const sessionSummaries = Array.isArray(chatMeta.gamePreviousSessionSummaries)
    ? (chatMeta.gamePreviousSessionSummaries as SessionSummary[])
    : [];
  const playerNotes =
    typeof chatMeta.gamePlayerNotes === "string" ? chatMeta.gamePlayerNotes.trim() : undefined;

  // Resolve GM character card if in "character" GM mode
  let gmCharacterCard: string | null = null;
  const gmCharId = chatMeta.gameGmCharacterId as string | null;
  if (gmCharId) {
    try {
      const gmChar = await chars.getById(gmCharId);
      if (gmChar) {
        const gmData = typeof gmChar.data === "string" ? JSON.parse(gmChar.data) : gmChar.data;
        const parts = [`Name: ${gmData.name}`];
        if (gmData.personality) parts.push(`Personality: ${gmData.personality}`);
        if (gmData.description) parts.push(`Description: ${gmData.description}`);
        const gmBackstory = gmData.extensions?.backstory || gmData.backstory;
        const gmAppearance = gmData.extensions?.appearance || gmData.appearance;
        if (gmBackstory) parts.push(`Backstory: ${gmBackstory}`);
        if (gmAppearance) parts.push(`Appearance: ${gmAppearance}`);
        gmCharacterCard = parts.join("\n");
      }
    } catch {
      /* ignore */
    }
  }

  // Resolve party character cards (full detail for GM context)
  const partyCharIds = Array.isArray(chatMeta.gamePartyCharacterIds)
    ? (chatMeta.gamePartyCharacterIds as string[])
    : characterIds;
  const partyNames: string[] = [];
  const partyCards: Array<{ name: string; card: string }> = [];
  const partyIdNamePairs: Array<{ id: string; name: string }> = [];
  // Load game character cards for appending game-specific info
  const gameCharCards = Array.isArray(chatMeta.gameCharacterCards)
    ? (chatMeta.gameCharacterCards as Array<Record<string, unknown>>)
    : [];
  const gameCardByName = new Map<string, Record<string, unknown>>();
  for (const gc of gameCharCards) {
    if (gc.name) gameCardByName.set((gc.name as string).toLowerCase(), gc);
  }
  for (const pcId of partyCharIds) {
    try {
      const pc = await chars.getById(pcId);
      if (pc) {
        const pcData = typeof pc.data === "string" ? JSON.parse(pc.data) : pc.data;
        const name = pcData.name || "Unknown";
        partyNames.push(name);
        partyIdNamePairs.push({ id: pcId, name });
        const parts = [`Name: ${name}`];
        if (pcData.personality) parts.push(`Personality: ${pcData.personality}`);
        if (pcData.description) parts.push(`Description: ${pcData.description}`);
        const backstory = pcData.extensions?.backstory || pcData.backstory;
        const appearance = pcData.extensions?.appearance || pcData.appearance;
        if (backstory) parts.push(`Backstory: ${backstory}`);
        if (appearance) parts.push(`Appearance: ${appearance}`);
        // Append game character card info (class, abilities, etc.)
        const gc = gameCardByName.get(name.toLowerCase());
        if (gc) {
          if (gc.class) parts.push(`Class: ${gc.class}`);
          if ((gc.abilities as string[])?.length)
            parts.push(`Abilities: ${(gc.abilities as string[]).join(", ")}`);
          if ((gc.strengths as string[])?.length)
            parts.push(`Strengths: ${(gc.strengths as string[]).join(", ")}`);
          if ((gc.weaknesses as string[])?.length)
            parts.push(`Weaknesses: ${(gc.weaknesses as string[]).join(", ")}`);
          const extra = gc.extra as Record<string, string> | undefined;
          if (extra) {
            for (const [k, v] of Object.entries(extra)) {
              parts.push(`${k}: ${v}`);
            }
          }
        }
        partyCards.push({ name, card: parts.join("\n") });
      }
    } catch {
      /* ignore */
    }
  }

  for (const npcId of partyCharIds) {
    if (!isPartyNpcId(npcId)) continue;
    const npc = gameNpcs.find((candidate) => buildPartyNpcId(candidate.name) === npcId);
    if (!npc) continue;
    const name = npc.name || "Unknown";
    partyNames.push(name);
    partyIdNamePairs.push({ id: npcId, name });
    const parts = [`Name: ${name}`, "Source: Tracked NPC companion, not a character-library card"];
    if (npc.description) parts.push(`Description: ${npc.description}`);
    if (npc.location) parts.push(`Last Known Location: ${npc.location}`);
    if (npc.notes?.length) parts.push(`Notes: ${npc.notes.join("; ")}`);
    const gc = gameCardByName.get(name.toLowerCase());
    if (gc) {
      if (gc.class) parts.push(`Class: ${gc.class}`);
      if ((gc.abilities as string[])?.length) parts.push(`Abilities: ${(gc.abilities as string[]).join(", ")}`);
      if ((gc.strengths as string[])?.length) parts.push(`Strengths: ${(gc.strengths as string[]).join(", ")}`);
      if ((gc.weaknesses as string[])?.length)
        parts.push(`Weaknesses: ${(gc.weaknesses as string[]).join(", ")}`);
      const extra = gc.extra as Record<string, string> | undefined;
      if (extra) {
        for (const [key, value] of Object.entries(extra)) {
          parts.push(`${key}: ${value}`);
        }
      }
    }
    partyCards.push({ name, card: parts.join("\n") });
  }

  // Resolve player persona card
  let playerCard: string | null = null;
  if (chat.personaId || (setupConfig as Record<string, unknown> | null)?.personaId) {
    try {
      const persona = await chars.getPersona(
        (chat.personaId || (setupConfig as Record<string, unknown>)?.personaId) as string,
      );
      if (persona) {
        const parts = [`Name: ${persona.name}`];
        if (persona.description) parts.push(`Description: ${persona.description}`);
        if (persona.personality) parts.push(`Personality: ${persona.personality}`);
        if (persona.backstory) parts.push(`Backstory: ${persona.backstory}`);
        if (persona.appearance) parts.push(`Appearance: ${persona.appearance}`);
        // Append game character card info for persona
        const pgc = gameCardByName.get(persona.name.toLowerCase());
        if (pgc) {
          if (pgc.class) parts.push(`Class: ${pgc.class}`);
          if ((pgc.abilities as string[])?.length)
            parts.push(`Abilities: ${(pgc.abilities as string[]).join(", ")}`);
          if ((pgc.strengths as string[])?.length)
            parts.push(`Strengths: ${(pgc.strengths as string[]).join(", ")}`);
          if ((pgc.weaknesses as string[])?.length)
            parts.push(`Weaknesses: ${(pgc.weaknesses as string[]).join(", ")}`);
          const extra = pgc.extra as Record<string, string> | undefined;
          if (extra) {
            for (const [k, v] of Object.entries(extra)) {
              parts.push(`${k}: ${v}`);
            }
          }
        }
        playerCard = parts.join("\n");
      }
    } catch {
      /* ignore */
    }
  }

  // Get weather from latest game state snapshot
  let weatherContext: string | undefined;
  let gameTime: string | undefined;
  try {
    const snap = await selectedGameStateSnapshotPromise;
    if (snap) {
      if (snap.weather)
        weatherContext = `Current weather: ${snap.weather}${snap.temperature ? `, ${snap.temperature}` : ""}`;
      if (snap.time || snap.date) gameTime = [snap.date, snap.time].filter(Boolean).join(", ");
    }
  } catch {
    /* ignore */
  }

  // Determine if a separate scene model handles bg/music/sfx/widgets
  const sceneConnectionId = (setupConfig?.sceneConnectionId as string) || null;
  const sidecarCfg = sidecarModelService.getConfig();
  const sidecarHandlesScene = sidecarCfg.useForGameScene && (await isSidecarInferenceAvailable());
  const hasSceneModel = !!sceneConnectionId || sidecarHandlesScene;

  // Approximate turn number: count user messages in the chat (each user message ≈ 1 turn)
  const gameTurnNumber = mappedMessages.filter((m) => m.role === "user").length + 1;

  // Detect whether the player moved since last turn
  const lastMapPos = chatMeta.lastMapPosition as string | { x: number; y: number } | undefined;
  const currentMapPos = gameMap?.partyPosition;
  const playerMoved =
    !lastMapPos || !currentMapPos || JSON.stringify(lastMapPos) !== JSON.stringify(currentMapPos);
  // Persist current position for next turn comparison
  if (currentMapPos && JSON.stringify(lastMapPos) !== JSON.stringify(currentMapPos)) {
    chatMeta.lastMapPosition = currentMapPos;
    const freshChat = await chats.getById(input.chatId);
    const freshMeta = freshChat ? (parseExtra(freshChat.metadata) as Record<string, unknown>) : chatMeta;
    await chats.updateMetadata(input.chatId, { ...freshMeta, lastMapPosition: currentMapPos });
  }

  // ── Passive perception hints ──
  let perceptionHintsBlock: string | undefined;
  try {
    const latSnap = await selectedGameStateSnapshotPromise;
    const pStats = latSnap?.playerStats ? JSON.parse(latSnap.playerStats as string) : null;
    if (pStats) {
      const presentNpcs = latSnap?.presentCharacters
        ? JSON.parse(latSnap.presentCharacters as string)
            .map((c: { name?: string }) => c.name)
            .filter(Boolean)
        : [];
      const pCtx: PerceptionContext = {
        perceptionMod: pStats.skills?.Perception ?? pStats.skills?.perception ?? 0,
        wisdomScore: pStats.attributes?.wis ?? 10,
        gameState: gameActiveState,
        location: latSnap?.location ?? null,
        weather: latSnap?.weather ?? null,
        timeOfDay: latSnap?.time ?? null,
        presentNpcNames: presentNpcs,
      };
      const hints = generatePerceptionHints(pCtx);
      if (hints.length > 0) {
        perceptionHintsBlock = formatPerceptionHints(hints);
      }
    }
  } catch {
    /* non-fatal */
  }

  const gmCtx: GmPromptContext = {
    gameActiveState: gameActiveState as GameActiveState,
    storyArc,
    plotTwists,
    map: gameMap,
    npcs: gameNpcs,
    sessionSummaries,
    sessionNumber,
    partyNames,
    partyCards,
    playerName: personaName,
    playerCard,
    gmCharacterCard,
    difficulty: (setupConfig?.difficulty as string) || "normal",
    genre: (setupConfig?.genre as string) || "fantasy",
    setting: (setupConfig?.setting as string) || "original",
    tone: (setupConfig?.tone as string) || "balanced",
    rating: (setupConfig?.rating as "sfw" | "nsfw") || "sfw",
    campaignPlan: gameBlueprint?.campaignPlan ?? null,
    gameTime,
    weatherContext,
    playerNotes,
    hudWidgets: Array.isArray(chatMeta.gameWidgetState)
      ? (chatMeta.gameWidgetState as any[])
      : Array.isArray(gameBlueprint?.hudWidgets)
        ? (gameBlueprint.hudWidgets as any[])
        : undefined,
    hasSceneModel,
    playerMoved,
    turnNumber: gameTurnNumber,
    perceptionHints: perceptionHintsBlock,
    moraleContext: (() => {
      const morale = (chatMeta.gameMorale as number) ?? 50;
      const tier = getMoraleTier(morale);
      return formatMoraleContext({ value: morale, tier });
    })(),
    characterSprites: listPartySprites(partyIdNamePairs),
    language: (setupConfig?.language as string) || undefined,
  };

  const builtGmPrompt = buildGmSystemPrompt(gmCtx);

  // User can override/extend with a custom prompt from Chat Settings
  const customGmPrompt = typeof chatMeta.customGmPrompt === "string" ? chatMeta.customGmPrompt.trim() : "";
  const gameExtraPrompt =
    typeof chatMeta.gameExtraPrompt === "string"
      ? chatMeta.gameExtraPrompt.trim().replace(/<\/?special_instructions>/gi, "")
      : "";
  let fullGmPrompt = customGmPrompt ? `${builtGmPrompt}\n\n${customGmPrompt}` : builtGmPrompt;
  if (gameExtraPrompt) {
    fullGmPrompt += `\n\n<special_instructions>\n${gameExtraPrompt}\n</special_instructions>`;
  }
  fullGmPrompt = resolvePromptMacros(fullGmPrompt);

  // Game mode: REPLACE the conversation system prompt with the GM prompt.
  // The conversation prompt ("you are X chatting with user") conflicts with the GM role.
  const sysIdx = finalMessages.findIndex((m) => m.role === "system");
  if (sysIdx >= 0) {
    finalMessages[sysIdx] = { role: "system" as const, content: fullGmPrompt };
  } else {
    finalMessages.unshift({ role: "system" as const, content: fullGmPrompt });
  }

  // ── Lorebook injection for game mode ──
  if (!presetHandledLorebooks) {
    sendProgress("lorebooks");
    const lorebookResult = await processLorebooks(
      db,
      toLorebookScanMessages(),
      await selectedGameStateForPrompt(),
      {
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
        entryTimingStates:
          (chatMeta.entryTimingStates as Record<string, LorebookEntryTimingState>) ?? undefined,
        generationTriggers: lorebookGenerationTriggers,
        resolveContent: resolvePromptMacrosForLorebook,
      },
    );
    rememberKnowledgeRouterActivatedLorebookIds(
      knowledgeRouterActivatedLorebookEntryIds,
      knowledgeRouterExcludedLorebookEntryIds,
      lorebookResult,
    );

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
      // Append lore to the GM system prompt
      const sysMsg = finalMessages.find((m) => m.role === "system");
      if (sysMsg) {
        sysMsg.content += "\n\n" + loreBlock;
      } else {
        finalMessages.unshift({ role: "system" as const, content: loreBlock });
      }
    }
    if (lorebookResult.depthEntries.length > 0) {
      finalMessages = injectAtDepth(finalMessages, lorebookResult.depthEntries);
    }
    if (lorebookResult.decoratedEntries && lorebookResult.decoratedEntries.length > 0) {
      finalMessages = applyLorebookDecorators(finalMessages, lorebookResult.decoratedEntries);
    }
  }

  // LOG_LEVEL=debug or Settings -> Advanced -> Debug mode: log game-mode prompt details.
  if (isDebug || requestDebug) {
    debugLog(
      "[debug/game] GM prompt length: %d chars, messages: %d",
      finalMessages[0]?.content.length ?? 0,
      finalMessages.length,
    );
    debugLog(
      "[debug/game] GM context: storyArc=%s, map=%s, npcs=%d, widgets=%s, hasSceneModel=%s, state=%s",
      !!gmCtx.storyArc,
      !!gmCtx.map,
      gmCtx.npcs.length,
      !!gmCtx.hudWidgets?.length,
      gmCtx.hasSceneModel,
      gmCtx.gameActiveState,
    );
    for (const msg of finalMessages) {
      debugLog("[debug/game] [%s] %s", msg.role.toUpperCase(), msg.content);
    }
  }

  // Inject the output format + commands as the last user message so they
  // sit closest to generation in the model's attention window.
  // Detect special address prefixes from the latest user message so the
  // prompt block is only sent when actually relevant.
  const latestUserMsg = [...finalMessages].reverse().find((m) => m.role === "user");
  const latestUserContent = latestUserMsg?.content.trimStart() ?? "";
  const addressMode = latestUserContent.startsWith("[To the party]")
    ? "party"
    : latestUserContent.startsWith("[To the GM]")
      ? "gm"
      : undefined;
  const playerDiceRollSubmitted = /\[dice\b/i.test(latestUserContent);
  const formatReminder = resolvePromptMacros(
    buildGmFormatReminder({
      hasSceneModel,
      hudWidgets: gmCtx.hudWidgets,
      turnNumber: gameTurnNumber,
      gameActiveState: gameActiveState as GameActiveState,
      sessionNumber,
      gameTime,
      map: gameMap,
      partyNames: gmCtx.partyNames,
      playerName: gmCtx.playerName,
      characterSprites: gmCtx.characterSprites,
      language: gmCtx.language,
      rating: gmCtx.rating,
      addressMode,
      playerDiceRollSubmitted,
      playerInventory: (() => {
        try {
          const inv = (chatMeta.gameInventory as Array<{ name: string; quantity: number }>) ?? [];
          return inv.length > 0 ? inv : undefined;
        } catch {
          return undefined;
        }
      })(),
    }),
  );
  finalMessages.push({ role: "user" as const, content: formatReminder });
  logger.debug(
    "[generate/game] Injected format reminder (%d chars) as last user message",
    formatReminder.length,
  );

  return {
    finalMessages,
    chatMeta,
    presetHandledLorebooks,
  };
}
