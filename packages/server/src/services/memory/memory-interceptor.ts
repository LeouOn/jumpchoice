import { logger } from "../../lib/logger.js";

export const SUMMARY_TOKEN_BUDGET_SHARE = 0.1;
export const MIN_SUMMARY_TOKEN_BUDGET = 256;
export const MAX_SUMMARY_TOKENS = 512;

export interface InterceptorMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface SummaryEntry {
  summary: string;
  firstMessageAt: string;
  lastMessageAt: string;
}

export interface InterceptorInput {
  messages: InterceptorMessage[];
  metadata: Record<string, unknown>;
  loadSummaries: (chatId?: string) => Promise<SummaryEntry[]>;
  chatId?: string;
  maxContextTokens?: number;
}

export interface InterceptorResult {
  workingMessages: InterceptorMessage[];
  summaries: SummaryEntry[];
  memoryBlock: string | null;
  stats: {
    totalMessages: number;
    workingCount: number;
    archivedCount: number;
    summaryCount: number;
    estimatedTokensSaved: number;
  };
}

function estimateTokens(content: string): number {
  const trimmed = content.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

function truncateSummary(summary: string, tokenBudget: number): string {
  const maxChars = Math.max(64, tokenBudget * 4);
  if (summary.length <= maxChars) return summary;
  const marker = "\n...[truncated]...\n";
  const availableChars = maxChars - marker.length;
  if (availableChars <= 0) return summary.slice(0, maxChars);
  const headChars = Math.max(32, Math.ceil(availableChars * 0.7));
  const tailChars = Math.max(32, availableChars - headChars);
  return `${summary.slice(0, headChars).trimEnd()}${marker}${summary.slice(-tailChars).trimStart()}`;
}

export function buildMemoryBlock(summaries: SummaryEntry[], maxContextTokens?: number): string | null {
  if (summaries.length === 0) return null;

  const budgetTokens = maxContextTokens
    ? Math.max(MIN_SUMMARY_TOKEN_BUDGET, Math.floor(maxContextTokens * SUMMARY_TOKEN_BUDGET_SHARE))
    : 1024;

  const lines: string[] = [];
  let usedTokens = 0;

  for (let i = 0; i < summaries.length; i++) {
    const remainingTokens = budgetTokens - usedTokens;
    if (remainingTokens < 64) break;

    const label = i === 0 ? `--- Summary ${i + 1} (earliest) ---` : `--- Summary ${i + 1} ---`;
    const truncated = truncateSummary(summaries[i]!.summary, Math.min(MAX_SUMMARY_TOKENS, remainingTokens));
    const entryTokens = estimateTokens(truncated);

    lines.push(label);
    lines.push(truncated);
    usedTokens += entryTokens;
  }

  if (lines.length === 0) return null;

  return [
    `<past_context>`,
    `The following is a summary of earlier conversation. Use it to maintain continuity and remember past events, but do not explicitly reference "remembering" unless it's natural.`,
    ``,
    ...lines,
    `</past_context>`,
  ].join("\n");
}

export async function filterAndAssembleMemoryContext(input: InterceptorInput): Promise<InterceptorResult> {
  const { messages, metadata, loadSummaries, chatId, maxContextTokens } = input;
  const totalMessages = messages.length;

  if (metadata.memoryTier2Enabled === false) {
    return {
      workingMessages: messages,
      summaries: [],
      memoryBlock: null,
      stats: { totalMessages, workingCount: messages.length, archivedCount: 0, summaryCount: 0, estimatedTokensSaved: 0 },
    };
  }

  const rawWatermark = metadata.lastSummarizedAt;
  if (!rawWatermark || typeof rawWatermark !== "string") {
    return {
      workingMessages: messages,
      summaries: [],
      memoryBlock: null,
      stats: { totalMessages, workingCount: messages.length, archivedCount: 0, summaryCount: 0, estimatedTokensSaved: 0 },
    };
  }

  const watermark = new Date(rawWatermark);
  if (isNaN(watermark.getTime())) {
    logger.warn("[memory-interceptor] Invalid lastSummarizedAt timestamp: %s", rawWatermark);
    return {
      workingMessages: messages,
      summaries: [],
      memoryBlock: null,
      stats: { totalMessages, workingCount: messages.length, archivedCount: 0, summaryCount: 0, estimatedTokensSaved: 0 },
    };
  }

  const workingMessages: InterceptorMessage[] = [];
  let archivedCount = 0;
  let archivedTokens = 0;

  for (const msg of messages) {
    const msgDate = new Date(msg.createdAt);
    if (msgDate.getTime() <= watermark.getTime()) {
      archivedCount++;
      archivedTokens += estimateTokens(msg.content);
    } else {
      workingMessages.push(msg);
    }
  }

  if (archivedCount === 0) {
    return {
      workingMessages: messages,
      summaries: [],
      memoryBlock: null,
      stats: { totalMessages, workingCount: messages.length, archivedCount: 0, summaryCount: 0, estimatedTokensSaved: 0 },
    };
  }

  let summaries: SummaryEntry[] = [];
  try {
    summaries = await loadSummaries(chatId);
  } catch (err) {
    logger.error(err, "[memory-interceptor] Failed to load summaries");
  }

  const memoryBlock = buildMemoryBlock(summaries, maxContextTokens);

  return {
    workingMessages,
    summaries,
    memoryBlock,
    stats: {
      totalMessages,
      workingCount: workingMessages.length,
      archivedCount,
      summaryCount: summaries.length,
      estimatedTokensSaved: archivedTokens,
    },
  };
}
