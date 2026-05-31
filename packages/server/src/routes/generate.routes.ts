// ──────────────────────────────────────────────
// Routes: Generation (SSE Streaming with Tool Use + Agent Pipeline)
// ──────────────────────────────────────────────
import type { FastifyInstance } from "fastify";
import { createChatsStorage } from "../services/storage/chats.storage.js";
import { createConnectionsStorage } from "../services/storage/connections.storage.js";
import { createPromptsStorage } from "../services/storage/prompts.storage.js";
import { createCharactersStorage } from "../services/storage/characters.storage.js";
import { createAgentsStorage } from "../services/storage/agents.storage.js";
import { createGameStateStorage } from "../services/storage/game-state.storage.js";
import { createCustomToolsStorage } from "../services/storage/custom-tools.storage.js";
import { createLorebooksStorage } from "../services/storage/lorebooks.storage.js";
import { createRegexScriptsStorage } from "../services/storage/regex-scripts.storage.js";
import { logger } from "../lib/logger.js";
import { registerDryRunRoute } from "./generate/dry-run-route.js";
import { registerRetryAgentsRoute } from "./generate/retry-agents-route.js";
import { resolveRequest } from "../services/generation/request-resolver.js";
import { resolveConnection } from "../services/generation/connection-resolver.js";
import { normalizeHapticAgentCommands } from "../services/generation/helpers.js";
import { runGenerationLoop } from "../services/generation/generation-loop.js";

export { normalizeHapticAgentCommands };

export async function generateRoutes(app: FastifyInstance) {
  const isDebug = logger.isLevelEnabled("debug");

  const chats = createChatsStorage(app.db);
  const connections = createConnectionsStorage(app.db);
  const presets = createPromptsStorage(app.db);
  const chars = createCharactersStorage(app.db);
  const agentsStore = createAgentsStorage(app.db);
  const gameStateStore = createGameStateStorage(app.db);
  const customToolsStore = createCustomToolsStorage(app.db);
  const lorebooksStore = createLorebooksStorage(app.db);
  const regexScriptsStore = createRegexScriptsStorage(app.db);

  /**
   * In-memory cache for OpenAI Responses API encrypted reasoning items.
   * Keyed by chatId → opaque reasoning items from the last response.
   * These are replayed on the next turn so the model can continue its reasoning chain.
   */
  const encryptedReasoningCache = new Map<string, unknown[]>();

  /**
   * POST /api/generate
   * Streams AI generation via Server-Sent Events.
   */
  app.post("/", async (req, reply) => {
    const activeGenerations = (app as any).activeGenerations as Map<
      string,
      { abortController: AbortController; backendUrl: string | null }
    >;

    const setupResult = await resolveRequest(app.db, req, reply, activeGenerations);
    if (!setupResult.ok) return reply.status(setupResult.status).send({ error: setupResult.error });
    const {
      input,
      chat,
      requestChatMode,
      abortController,
      releaseActiveGeneration,
      earlyMeta,
      discordWebhookUrl,
      pendingUserDiscordMsg,
      requestDebug,
      debugLog,
    } = setupResult.value;
    let conversationGenerationStartedAt = setupResult.value.conversationGenerationStartedAt;
    let conversationAssistantSaved = setupResult.value.conversationAssistantSaved;

    // Resolve connection
    const connResult = await resolveConnection(app.db, input, chat, releaseActiveGeneration);
    if (!connResult.ok) return reply.status(connResult.status).send({ error: connResult.error });
    const { connId, conn, baseUrl, memoryRecallEmbeddingSource } = connResult.value;
    let chatMeta = connResult.value.chatMeta;

    if (activeGenerations) {
      activeGenerations.set(input.chatId, { abortController, backendUrl: baseUrl });
    }


    await runGenerationLoop(
      {
        app,
        db: app.db,
        req,
        isDebug,
        chats,
        connections,
        presets,
        chars,
        agentsStore,
        gameStateStore,
        customToolsStore,
        lorebooksStore,
        regexScriptsStore,
        encryptedReasoningCache,
        input,
        chat,
        requestChatMode,
        abortController,
        earlyMeta,
        discordWebhookUrl,
        pendingUserDiscordMsg,
        requestDebug,
        debugLog,
        conversationGenerationStartedAt,
        conversationAssistantSaved,
        connId,
        conn,
        baseUrl,
        memoryRecallEmbeddingSource,
        chatMeta,
      },
      reply,
      activeGenerations,
    );

  });

  // ── Active generation tracking for explicit abort ──
  const activeGenerations = new Map<string, { abortController: AbortController; backendUrl: string | null }>();

  // Expose the map so the route handler can register/unregister generations
  app.decorate("activeGenerations", activeGenerations);

  /**
   * POST /api/generate/abort
   * Explicitly abort an in-progress generation for a given chat.
   */
  app.post("/abort", async (req, reply) => {
    const body = req.body as { chatId?: string };
    const chatId = body?.chatId;
    if (!chatId) return reply.status(400).send({ error: "chatId is required" });

    const gen = activeGenerations.get(chatId);
    if (!gen) return reply.send({ aborted: false, reason: "No active generation for this chat" });

    logger.info("[abort] Explicit abort requested for chat: %s", chatId);
    gen.abortController.abort();

    // Send abort to backend (KoboldCPP etc.)
    if (gen.backendUrl) {
      const backendRoot = gen.backendUrl.replace(/\/v1\/?$/, "");
      const abortUrl = backendRoot + "/api/extra/abort";
      logger.info("[abort] Sending abort to backend: %s", abortUrl);
      try {
        await fetch(abortUrl, { method: "POST", signal: AbortSignal.timeout(5000) });
        logger.info("[abort] Backend abort sent successfully");
      } catch (err) {
        logger.warn(err, "[abort] Backend abort failed");
      }
    }

    activeGenerations.delete(chatId);
    return reply.send({ aborted: true });
  });

  await registerDryRunRoute(app);
  await registerRetryAgentsRoute(app);
}
