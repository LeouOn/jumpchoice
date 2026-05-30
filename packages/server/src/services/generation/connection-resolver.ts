import type { ServiceResult } from "./types.js";
import type { ValidatedInput } from "./request-resolver.js";
import { parseExtra } from "../../routes/generate/generate-route-utils.js";
import { resolveBaseUrl } from "../../routes/generate/generate-route-utils.js";
import { createConnectionsStorage } from "../storage/connections.storage.js";
import { resolveMemoryRecallEmbeddingSource } from "../memory-recall-embedding.js";
import { logger } from "../../lib/logger.js";

export interface ConnectionSetupResult {
  connId: string;
  conn: any;
  provider: any;
  baseUrl: string;
  chatMeta: Record<string, unknown>;
  memoryRecallEmbeddingSource: Awaited<ReturnType<typeof resolveMemoryRecallEmbeddingSource>> | null;
}

export async function resolveConnection(
  db: any,
  input: ValidatedInput,
  chat: any,
  releaseActiveGeneration: () => void,
): Promise<ServiceResult<ConnectionSetupResult>> {
  const connections = createConnectionsStorage(db);

  const impersonateConnectionOverride =
    input.impersonate && input.impersonateConnectionId ? input.impersonateConnectionId : null;
  const fallbackConnectionId = input.connectionId || chat.connectionId;
  let connId = impersonateConnectionOverride || fallbackConnectionId;

  if (connId === "random") {
    const pool = await connections.listRandomPool();
    if (!pool.length) {
      releaseActiveGeneration();
      return { ok: false, status: 400, error: "No connections are marked for the random pool" };
    }
    const picked = pool[Math.floor(Math.random() * pool.length)];
    connId = picked.id;
  }

  if (!connId) {
    releaseActiveGeneration();
    return { ok: false, status: 400, error: "No API connection configured for this chat" };
  }

  let conn = await connections.getWithKey(connId);
  if (!conn && impersonateConnectionOverride && connId === impersonateConnectionOverride && fallbackConnectionId) {
    logger.warn(
      "[generate] Impersonate connection override %s was not found; falling back to chat/request connection",
      impersonateConnectionOverride,
    );
    connId = fallbackConnectionId;
    if (connId === "random") {
      const pool = await connections.listRandomPool();
      if (!pool.length) {
        releaseActiveGeneration();
        return { ok: false, status: 400, error: "No connections are marked for the random pool" };
      }
      const picked = pool[Math.floor(Math.random() * pool.length)];
      connId = picked.id;
    }
    conn = connId ? await connections.getWithKey(connId) : null;
  }
  if (!conn) {
    releaseActiveGeneration();
    return { ok: false, status: 400, error: "API connection not found" };
  }

  const baseUrl = resolveBaseUrl(conn);
  if (!baseUrl) {
    releaseActiveGeneration();
    return { ok: false, status: 400, error: "No base URL configured for this connection" };
  }

  let chatMeta = parseExtra(chat.metadata) as Record<string, unknown>;
  let memoryRecallEmbeddingSource: Awaited<ReturnType<typeof resolveMemoryRecallEmbeddingSource>> | null = null;
  try {
    memoryRecallEmbeddingSource = await resolveMemoryRecallEmbeddingSource(db, {
      chatMetadata: chatMeta,
      activeConnection: conn,
      activeBaseUrl: baseUrl,
    });
  } catch (err) {
    logger.warn(err, "[memory-recall] Embedding source resolution failed; using default embedding path");
  }

  return {
    ok: true,
    value: {
      connId,
      conn,
      provider: null,
      baseUrl,
      chatMeta,
      memoryRecallEmbeddingSource,
    },
  };
}
