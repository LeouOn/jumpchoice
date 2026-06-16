// ──────────────────────────────────────────────
// Lorebook: Prompt Injector
// Takes activated lorebook entries and injects
// them into the prompt at the correct positions
// (WORLD_INFO_BEFORE / WORLD_INFO_AFTER / depth).
// ──────────────────────────────────────────────
import { findDecorator, parseDecorators } from "@jumpchoice/shared";
import type { LorebookEntry, LorebookRole } from "@jumpchoice/shared";
import type { ActivatedEntry } from "./keyword-scanner.js";
import type { LorebookEntryForInjection } from "./decorator-injector.js";

/** A prompt message ready for injection. */
export interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
  contextKind?: "prompt" | "history" | "injection";
  /** Optional name for multi-character */
  name?: string;
}

export interface InjectAtDepthOptions {
  /** Earliest index an entry may be inserted at. */
  minIndex?: number;
  /** Index considered "after the last message" for depth 0. Defaults to the full prompt length. */
  anchorIndex?: number;
}

/**
 * Build the World Info content blocks from activated entries.
 * Position 0 = WORLD_INFO_BEFORE (before character defs)
 * Position 1 = WORLD_INFO_AFTER (after character defs)
 */
export function buildWorldInfoBlocks(activatedEntries: ActivatedEntry[]): {
  before: string;
  after: string;
} {
  const beforeParts: string[] = [];
  const afterParts: string[] = [];

  // Sort by order
  const sorted = [...activatedEntries].sort((a, b) => a.entry.order - b.entry.order);

  for (const { entry } of sorted) {
    if (entry.position <= 0) {
      beforeParts.push(entry.content);
    } else if (entry.position === 1) {
      afterParts.push(entry.content);
    }
    // position >= 2 entries are handled by getDepthInjectedEntries
  }

  return {
    before: beforeParts.join("\n\n"),
    after: afterParts.join("\n\n"),
  };
}

/**
 * Get entries that should be injected at specific depths in the message array.
 * Only entries with position >= 2 (depth injection mode) are included.
 * Position 0/1 entries always go to worldInfoBefore/After via buildWorldInfoBlocks.
 */
export function getDepthInjectedEntries(activatedEntries: ActivatedEntry[]): Array<{
  content: string;
  role: LorebookRole;
  depth: number;
  order: number;
}> {
  return activatedEntries
    .filter((a) => a.entry.position >= 2 && a.entry.depth >= 0)
    .map((a) => ({
      content: a.entry.content,
      role: a.entry.role,
      depth: a.entry.depth,
      order: a.entry.order,
    }))
    .sort((a, b) => {
      // Same depth: sort by order
      if (a.depth === b.depth) return a.order - b.order;
      return a.depth - b.depth;
    });
}

/**
 * Inject depth-based entries into a message array.
 * Depth 0 = after the last message, depth 1 = before the last message, etc.
 */
export function injectAtDepth(
  messages: PromptMessage[],
  depthEntries: Array<{ content: string; role: LorebookRole; depth: number }>,
  options: InjectAtDepthOptions = {},
): PromptMessage[] {
  if (depthEntries.length === 0) return messages;

  const result = [...messages];
  const baseLength = messages.length;
  const minIndex = Math.min(Math.max(0, options.minIndex ?? 0), baseLength);
  const anchorIndex = Math.min(Math.max(minIndex, options.anchorIndex ?? baseLength), baseLength);

  // Group entries by the final original-array insertion index. Computing
  // all targets before splicing keeps depth 0 anchored after the original
  // last message even when deeper entries are inserted earlier.
  const byIndex = new Map<number, Array<{ content: string; role: LorebookRole; depth: number; order: number }>>();
  for (const [order, entry] of depthEntries.entries()) {
    const depth = Number.isFinite(entry.depth) ? Math.max(0, Math.floor(entry.depth)) : 0;
    const insertionIndex = Math.max(minIndex, anchorIndex - depth);
    const list = byIndex.get(insertionIndex) ?? [];
    list.push({ content: entry.content, role: entry.role, depth, order });
    byIndex.set(insertionIndex, list);
  }

  // Process later original indices first so earlier insertions do not shift them.
  const insertionIndexes = [...byIndex.keys()].sort((a, b) => b - a);

  for (const insertionIndex of insertionIndexes) {
    const entries = (byIndex.get(insertionIndex) ?? []).sort((a, b) => a.depth - b.depth || a.order - b.order);

    const toInsert: PromptMessage[] = entries.map((e) => ({
      role: e.role,
      content: e.content,
      contextKind: "injection",
    }));

    result.splice(insertionIndex, 0, ...toInsert);
  }

  return result;
}

/**
 * Apply token budget to activated entries.
 * Trims entries (by priority/order) until total tokens are within budget.
 * Uses a rough estimate of 4 characters per token.
 */
export function applyTokenBudget(activatedEntries: ActivatedEntry[], tokenBudget: number): ActivatedEntry[] {
  if (tokenBudget <= 0) return activatedEntries;

  const CHARS_PER_TOKEN = 4;
  let totalTokens = 0;
  const result: ActivatedEntry[] = [];

  // Sort: constant entries first, then by order
  const sorted = [...activatedEntries].sort((a, b) => {
    if (a.entry.constant && !b.entry.constant) return -1;
    if (!a.entry.constant && b.entry.constant) return 1;
    return a.entry.order - b.entry.order;
  });

  for (const entry of sorted) {
    const entryTokens = Math.ceil(entry.entry.content.length / CHARS_PER_TOKEN);
    if (totalTokens + entryTokens > tokenBudget) {
      // Budget exhausted — skip remaining entries
      break;
    }
    totalTokens += entryTokens;
    result.push(entry);
  }

  return result;
}

/**
 * Split activated entries into decorator-driven and default-path groups.
 *
 * Entries whose content carries a `@@depth` or `@@position` decorator are routed
 * to the decorator injector (`applyLorebookDecorators`). All other entries keep
 * using the existing before/after/depth injection path. In both cases the
 * decorator lines are stripped so they never leak into the prompt as text.
 */
function splitByDecorators(activatedEntries: ActivatedEntry[]): {
  decorated: LorebookEntryForInjection[];
  normal: ActivatedEntry[];
} {
  const decorated: LorebookEntryForInjection[] = [];
  const normal: ActivatedEntry[] = [];

  for (const a of activatedEntries) {
    const parsed = parseDecorators(a.entry.content);
    const hasInjectionDecorator =
      !!findDecorator(parsed.directives, "depth") ||
      !!findDecorator(parsed.directives, "position");

    // Always strip decorator lines from the content that reaches the prompt.
    const cleanContent = parsed.cleanContent || a.entry.content;
    const strippedEntry: ActivatedEntry = {
      ...a,
      entry: { ...a.entry, content: cleanContent },
    };

    if (hasInjectionDecorator) {
      decorated.push({
        rawContent: a.entry.content,
        cleanContent,
        directives: parsed.directives,
        insertionOrder: a.injectionOrder,
      });
    } else {
      normal.push(strippedEntry);
    }
  }

  return { decorated, normal };
}

/**
 * Full pipeline: process activated entries into injectable content.
 *
 * Entries with `@@depth`/`@@position` content decorators are returned in
 * `decoratedEntries` for downstream injection via `applyLorebookDecorators`;
 * they are excluded from `worldInfoBefore` / `worldInfoAfter` / `depthEntries`
 * so they are never injected twice. Entries without those decorators use the
 * existing injection path unchanged.
 */
export function processActivatedEntries(
  activatedEntries: ActivatedEntry[],
  tokenBudget: number = 0,
): {
  worldInfoBefore: string;
  worldInfoAfter: string;
  depthEntries: Array<{ content: string; role: LorebookRole; depth: number; order: number }>;
  decoratedEntries: LorebookEntryForInjection[];
  totalEntries: number;
  totalTokensEstimate: number;
} {
  // Apply budget
  const budgeted = applyTokenBudget(activatedEntries, tokenBudget);

  // Split decorator-driven entries from the default injection path.
  const { decorated, normal } = splitByDecorators(budgeted);

  // Build blocks
  const { before, after } = buildWorldInfoBlocks(normal);

  // Get depth entries
  const depthEntries = getDepthInjectedEntries(normal);

  // Estimate tokens (decorator-stripped content for both paths)
  const normalChars = normal.reduce((sum, a) => sum + a.entry.content.length, 0);
  const decoratedChars = decorated.reduce((sum, d) => sum + d.cleanContent.length, 0);

  return {
    worldInfoBefore: before,
    worldInfoAfter: after,
    depthEntries,
    decoratedEntries: decorated,
    totalEntries: budgeted.length,
    totalTokensEstimate: Math.ceil((normalChars + decoratedChars) / 4),
  };
}
