import { LIMITS, nameToXmlTag } from "@jumpchoice/shared";
import type { LorebookEntryTimingState } from "@jumpchoice/shared";
import { createChatsStorage } from "../../services/storage/chats.storage.js";
import { parseExtra } from "./generate-route-utils.js";

export function resolveLorebookGenerationTriggers(
  input: {
    impersonate?: boolean;
    regenerateMessageId?: string | null;
    userMessage?: string | null;
    generationGuide?: string | null;
    generationGuideSource?: "narrator" | "guide" | "game_start" | null;
  },
  chatMode: string,
): string[] {
  const triggers = new Set<string>();
  triggers.add(chatMode === "game" ? "game" : chatMode);

  if (input.impersonate) {
    triggers.add("impersonate");
  } else if (input.regenerateMessageId) {
    triggers.add("swipe");
    triggers.add("regenerate");
  } else if (
    input.generationGuide?.trim() &&
    (input.generationGuideSource === "narrator" || input.generationGuideSource === "guide")
  ) {
    triggers.add("chat");
  } else if (!input.userMessage?.trim()) {
    triggers.add("continue");
    triggers.add("autonomous");
  } else {
    triggers.add("chat");
  }

  return Array.from(triggers);
}

export type LorebookScanMessage = { role: "user" | "assistant" | "system"; content: string };

export function buildLorebookScanMessagesWithGenerationGuide(
  messages: LorebookScanMessage[],
  input: {
    generationGuide?: string | null;
    generationGuideSource?: "narrator" | "guide" | "game_start" | null;
  },
): LorebookScanMessage[] {
  const guide = input.generationGuide?.trim();
  if (!guide || (input.generationGuideSource !== "narrator" && input.generationGuideSource !== "guide")) {
    return messages;
  }
  return [...messages, { role: "user", content: guide }];
}

export function resolveLorebookTokenBudget(meta: Record<string, unknown>): number {
  const raw = meta.lorebookTokenBudget;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
    return LIMITS.DEFAULT_LOREBOOK_TOKEN_BUDGET;
  }
  return Math.floor(raw);
}

export async function persistLorebookRuntimeState(args: {
  chats: ReturnType<typeof createChatsStorage>;
  chatId: string;
  fallbackMeta: Record<string, unknown>;
  entryStateOverrides?: Record<string, { ephemeral?: number | null; enabled?: boolean }>;
  entryTimingStates?: Record<string, LorebookEntryTimingState>;
}): Promise<void> {
  if (args.entryStateOverrides === undefined && args.entryTimingStates === undefined) return;
  const freshChat = await args.chats.getById(args.chatId);
  const freshMeta = freshChat ? (parseExtra(freshChat.metadata) as Record<string, unknown>) : args.fallbackMeta;
  await args.chats.updateMetadata(args.chatId, {
    ...freshMeta,
    ...(args.entryStateOverrides !== undefined ? { entryStateOverrides: args.entryStateOverrides } : {}),
    ...(args.entryTimingStates !== undefined ? { entryTimingStates: args.entryTimingStates } : {}),
  });
}

export function rememberKnowledgeRouterActivatedLorebookIds(
  targetActivated: Set<string>,
  targetExcludedFromKeywordScan: Set<string>,
  result: {
    activatedEntries: Array<{ id: string; matchedKeys: string[] }>;
    budgetSkippedEntries: Array<{ id: string; matchedKeys: string[] }>;
  },
): void {
  for (const entry of result.activatedEntries) {
    if (!entry.matchedKeys.some((key) => !key.startsWith("[semantic:"))) continue;
    targetActivated.add(entry.id);
  }
  for (const entry of result.budgetSkippedEntries) {
    targetExcludedFromKeywordScan.add(entry.id);
  }
}

export function normalizeMaxContext(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.floor(value);
}

export function minContextLimit(...limits: Array<number | undefined>): number | undefined {
  let resolved: number | undefined;
  for (const limit of limits) {
    if (limit === undefined) continue;
    resolved = resolved === undefined ? limit : Math.min(resolved, limit);
  }
  return resolved;
}

const DEFAULT_MEMORY_RECALL_BUDGET_TOKENS = 1024;
const MIN_MEMORY_RECALL_BUDGET_TOKENS = 384;
const MAX_MEMORY_RECALL_BUDGET_TOKENS = 1536;
const MAX_RECALLED_MEMORY_TOKENS = 384;
const MIN_RECALLED_MEMORY_TOKENS = 96;
const MEMORY_RECALL_CONTEXT_SHARE = 0.15;
const RECALL_TRUNCATION_MARKER = "\n...[recalled memory truncated]...\n";

export function estimateTextTokens(content: string): number {
  const trimmed = content.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function truncateRecalledMemory(content: string, tokenBudget: number): string {
  const maxChars = Math.max(32, tokenBudget * 4);
  if (content.length <= maxChars) return content;

  const availableChars = maxChars - RECALL_TRUNCATION_MARKER.length;
  if (availableChars <= 0) {
    return content.slice(0, maxChars);
  }

  const headChars = Math.max(16, Math.ceil(availableChars * 0.7));
  const tailChars = Math.max(16, availableChars - headChars);
  return `${content.slice(0, headChars).trimEnd()}${RECALL_TRUNCATION_MARKER}${content.slice(-tailChars).trimStart()}`;
}

export function packRecalledMemories(
  recalled: Array<{ content: string }>,
  maxContext?: number,
): { lines: string[]; estimatedTokens: number; budgetTokens: number; trimmed: boolean } {
  const targetBudget = maxContext
    ? Math.floor(maxContext * MEMORY_RECALL_CONTEXT_SHARE)
    : DEFAULT_MEMORY_RECALL_BUDGET_TOKENS;
  const budgetTokens = Math.max(
    MIN_MEMORY_RECALL_BUDGET_TOKENS,
    Math.min(MAX_MEMORY_RECALL_BUDGET_TOKENS, targetBudget),
  );

  const lines: string[] = [];
  let estimatedTokens = 0;
  let trimmed = false;

  for (const memory of recalled) {
    const remainingTokens = budgetTokens - estimatedTokens;
    if (remainingTokens < MIN_RECALLED_MEMORY_TOKENS) {
      trimmed = true;
      break;
    }

    const packed = truncateRecalledMemory(memory.content, Math.min(MAX_RECALLED_MEMORY_TOKENS, remainingTokens));
    const packedTokens = estimateTextTokens(packed);
    if (packedTokens <= 0 || packedTokens > remainingTokens) {
      trimmed = true;
      break;
    }

    lines.push(packed);
    estimatedTokens += packedTokens;
    if (packed !== memory.content) trimmed = true;
  }

  return { lines, estimatedTokens, budgetTokens, trimmed };
}

export function normalizeChatTopP(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value <= 0) return 1;
  return Math.min(value, 1);
}

export function readChatCompletionsReasoningMetadata(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const metadata: Record<string, unknown> = {};
  if (typeof source.reasoning_content === "string" && source.reasoning_content) {
    metadata.reasoning_content = source.reasoning_content;
  }
  if (typeof source.reasoning === "string" && source.reasoning) {
    metadata.reasoning = source.reasoning;
  }
  if (Array.isArray(source.reasoning_details) && source.reasoning_details.length) {
    metadata.reasoning_details = source.reasoning_details;
  }
  return Object.keys(metadata).length ? metadata : undefined;
}

export function isStandaloneCharacterProfileBlock(content: string, characterName: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  const xmlTag = nameToXmlTag(characterName);
  if (
    (trimmed.startsWith(`<${xmlTag}>`) && trimmed.endsWith(`</${xmlTag}>`)) ||
    (trimmed.startsWith(`<${characterName}>`) && trimmed.endsWith(`</${characterName}>`))
  ) {
    return true;
  }
  const escaped = characterName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^#{1,6}\\s+${escaped}\\s*$`, "m").test(trimmed);
}
