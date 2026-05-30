import type { FastifyRequest, FastifyReply } from "fastify";
import type { ServiceResult } from "./types.js";
import { validateGenerateRequest } from "../../routes/generate/validation.routes.js";
import { normalizeGenerationReplay, applyGenerationReplayToRegenerateInput } from "../../routes/generate/generation-replay.js";
import { parseExtra } from "../../routes/generate/generate-route-utils.js";
import { logDebugOverride, logger } from "../../lib/logger.js";
import { createChatsStorage } from "../storage/chats.storage.js";
import { createCharactersStorage } from "../storage/characters.storage.js";
import { createGameStateStorage } from "../storage/game-state.storage.js";
import { recordUserActivity } from "../conversation/autonomous.service.js";

export type ValidatedInput = ReturnType<typeof validateGenerateRequest>;

export interface RequestSetupResult {
  input: ValidatedInput;
  chat: any;
  requestChatMode: string;
  abortController: AbortController;
  releaseActiveGeneration: () => void;
  conversationGenerationStartedAt: number | null;
  conversationAssistantSaved: boolean;
  earlyMeta: Record<string, unknown>;
  discordWebhookUrl: string;
  pendingUserDiscordMsg: string;
  requestDebug: boolean;
  debugLog: (message: string, ...args: any[]) => void;
}

export async function resolveRequest(
  db: any,
  req: FastifyRequest,
  reply: FastifyReply,
  activeGenerations: Map<string, { abortController: AbortController; backendUrl: string | null }> | undefined,
): Promise<ServiceResult<RequestSetupResult>> {
  const chats = createChatsStorage(db);
  const chars = createCharactersStorage(db);
  const gameStateStore = createGameStateStorage(db);

  const input = validateGenerateRequest(req.body);
  const requestDebug = input.debugMode === true;
  const debugLog = (message: string, ...args: any[]) => {
    logDebugOverride(requestDebug, message, ...args);
  };

  const chat = await chats.getById(input.chatId);
  if (!chat) {
    return { ok: false, status: 404, error: "Chat not found" };
  }
  const requestChatMode = (chat.mode as string) ?? "roleplay";
  let conversationGenerationStartedAt: number | null = null;
  let conversationAssistantSaved = false;

  if (activeGenerations?.has(input.chatId)) {
    return { ok: false, status: 409, error: "A generation is already in progress for this chat" };
  }

  const abortController = new AbortController();
  if (activeGenerations) {
    activeGenerations.set(input.chatId, { abortController, backendUrl: null });
  }
  const releaseActiveGeneration = () => {
    if (activeGenerations?.get(input.chatId)?.abortController === abortController) {
      activeGenerations.delete(input.chatId);
    }
  };

  const earlyMeta = parseExtra(chat.metadata) as Record<string, unknown>;

  if (input.regenerateMessageId) {
    const regenCandidate = await chats.getMessage(input.regenerateMessageId);
    if (regenCandidate?.chatId === input.chatId) {
      const replay = normalizeGenerationReplay(parseExtra(regenCandidate.extra).generationReplay);
      applyGenerationReplayToRegenerateInput(input, replay);
      if (!input.forCharacterId && earlyMeta.groupResponseOrder === "manual" && regenCandidate.characterId) {
        input.forCharacterId = regenCandidate.characterId;
      }
    }
  }

  const discordWebhookUrl = typeof earlyMeta.discordWebhookUrl === "string" ? earlyMeta.discordWebhookUrl : "";
  let pendingUserDiscordMsg = "";

  if (!input.impersonate && (input.userMessage || input.attachments?.length)) {
    const preMessages = await chats.listMessages(input.chatId);
    for (let i = preMessages.length - 1; i >= 0; i--) {
      if (preMessages[i]!.role === "assistant") {
        const lastAsstMsg = preMessages[i]!;
        const gs = await gameStateStore.getByMessage(lastAsstMsg.id, lastAsstMsg.activeSwipeIndex);
        if (gs) await gameStateStore.commit(gs.id);
        break;
      }
    }

    const userMsg = await chats.createMessage({
      chatId: input.chatId,
      role: "user",
      characterId: null,
      content: input.userMessage ?? "",
    });
    if (requestChatMode === "conversation") {
      recordUserActivity(input.chatId);
    }

    if (input.attachments?.length && userMsg?.id) {
      await chats.updateMessageExtra(userMsg.id, { attachments: input.attachments });
    }

    if (userMsg?.id) {
      const snapshotPersonas = await chars.listPersonas();
      const snapshotPersona =
        (chat.personaId ? snapshotPersonas.find((p: any) => p.id === chat.personaId) : null) ??
        snapshotPersonas.find((p: any) => p.isActive === "true");
      if (snapshotPersona) {
        await chats.updateMessageExtra(userMsg.id, {
          personaSnapshot: {
            personaId: snapshotPersona.id,
            name: snapshotPersona.name,
            description: snapshotPersona.description ?? "",
            personality: snapshotPersona.personality ?? "",
            scenario: snapshotPersona.scenario ?? "",
            backstory: snapshotPersona.backstory ?? "",
            appearance: snapshotPersona.appearance ?? "",
            avatarUrl: snapshotPersona.avatarPath || null,
            nameColor: snapshotPersona.nameColor || null,
            dialogueColor: snapshotPersona.dialogueColor || null,
            boxColor: snapshotPersona.boxColor || null,
          },
        });
      }
    }

    pendingUserDiscordMsg = discordWebhookUrl && input.userMessage ? input.userMessage : "";
  }

  return {
    ok: true,
    value: {
      input,
      chat,
      requestChatMode,
      abortController,
      releaseActiveGeneration,
      conversationGenerationStartedAt,
      conversationAssistantSaved,
      earlyMeta,
      discordWebhookUrl,
      pendingUserDiscordMsg,
      requestDebug,
      debugLog,
    },
  };
}
