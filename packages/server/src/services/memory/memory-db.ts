import { eq } from "drizzle-orm";
import type { DB } from "../../db/connection.js";
import { memorySummaries } from "../../db/schema/index.js";
import { newId, now } from "../../utils/id-generator.js";
import { logger } from "../../lib/logger.js";

export interface SaveSummaryInput {
  db: DB;
  chatId: string;
  summary: string;
  messageCount: number;
  firstMessageId: string;
  lastMessageId: string;
  firstMessageAt: string;
  lastMessageAt: string;
  tokenEstimate: number;
}

export async function saveSummary(input: SaveSummaryInput): Promise<string> {
  const id = newId();
  const createdAt = now();
  await input.db.insert(memorySummaries).values({
    id,
    chatId: input.chatId,
    summary: input.summary,
    messageCount: input.messageCount,
    firstMessageId: input.firstMessageId,
    lastMessageId: input.lastMessageId,
    firstMessageAt: input.firstMessageAt,
    lastMessageAt: input.lastMessageAt,
    tokenEstimate: input.tokenEstimate,
    createdAt,
  });
  logger.debug("[memory-db] Saved summary %s for chat %s (%d messages)", id, input.chatId, input.messageCount);
  return id;
}

export interface LoadedSummary {
  summary: string;
  firstMessageAt: string;
  lastMessageAt: string;
}

export async function loadSummariesForChat(db: DB, chatId: string): Promise<LoadedSummary[]> {
  const rows = await db
    .select({
      summary: memorySummaries.summary,
      firstMessageAt: memorySummaries.firstMessageAt,
      lastMessageAt: memorySummaries.lastMessageAt,
    })
    .from(memorySummaries)
    .where(eq(memorySummaries.chatId, chatId))
    .orderBy(memorySummaries.lastMessageAt);
  return rows;
}

export function getWatermark(metadata: Record<string, unknown>): string | null {
  const val = metadata.lastSummarizedAt;
  if (typeof val === "string" && val) return val;
  return null;
}

export function updateWatermark(
  metadata: Record<string, unknown>,
  timestamp: string,
): Record<string, unknown> {
  return { ...metadata, lastSummarizedAt: timestamp };
}
