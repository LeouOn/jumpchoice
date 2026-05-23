import { generateRequestSchema, type GenerateRequestInput } from "@jumpchoice/shared";
import type { createChatsStorage } from "../../services/storage/chats.storage.js";
import type { createConnectionsStorage } from "../../services/storage/connections.storage.js";
import { resolveBaseUrl } from "./generate-route-utils.js";
import { logger } from "../../lib/logger.js";

export type GenerateRequest = GenerateRequestInput;

export type ChatsStorage = ReturnType<typeof createChatsStorage>;
export type ConnectionsStorage = ReturnType<typeof createConnectionsStorage>;

export class ValidationFailure {
  constructor(
    public status: number,
    public message: string,
  ) {}
}

export function validateGenerateRequest(body: unknown): GenerateRequest {
  return generateRequestSchema.parse(body);
}

export async function validateChatExists(
  chatId: string,
  chats: ChatsStorage,
): Promise<ValidationFailure | null> {
  const chat = await chats.getById(chatId);
  if (!chat) {
    logger.warn("[generate] Chat not found: %s", chatId);
    return new ValidationFailure(404, "Chat not found");
  }
  return null;
}

export async function validateConnectionForGeneration(
  connId: string | null | undefined,
  connections: ConnectionsStorage,
): Promise<
  | { conn: NonNullable<Awaited<ReturnType<ConnectionsStorage["getWithKey"]>>>; connId: string }
  | ValidationFailure
> {
  if (!connId) {
    return new ValidationFailure(400, "No API connection configured for this chat");
  }
  const conn = await connections.getWithKey(connId);
  if (!conn) {
    return new ValidationFailure(400, "API connection not found");
  }
  return { conn, connId };
}

export function validateBaseUrlForGeneration(
  conn: { baseUrl: string | null; provider: string },
): string | ValidationFailure {
  const baseUrl = resolveBaseUrl(conn);
  if (!baseUrl) {
    return new ValidationFailure(400, "No base URL configured for this connection");
  }
  return baseUrl;
}
