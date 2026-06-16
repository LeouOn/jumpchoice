// ──────────────────────────────────────────────
// Lorebook: Decorator Injector
// ──────────────────────────────────────────────
// Applies CCv3 decorator directives to inject lorebook content at the correct
// position in the message array. Only handles entries whose content carries
// `@@depth` / `@@position` decorators — everything else flows through the
// existing injection path (prompt-injector.ts).
//
// Spec: https://github.com/kwaroran/character-card-spec-v3/blob/main/SPEC_V3.md#decorators

import { findDecorator, type ParsedDecorator } from "@jumpchoice/shared";

/** Minimal message shape accepted by the injector. */
export interface DecoratorMessage {
  role: "system" | "user" | "assistant";
  content: string;
  [key: string]: unknown;
}

/** A lorebook entry prepared for decorator-driven injection. */
export interface LorebookEntryForInjection {
  /** Entry content before decorator stripping. */
  rawContent: string;
  /** Decorator-stripped content (what actually gets injected). */
  cleanContent: string;
  /** Parsed directives from the entry's content. */
  directives: ParsedDecorator[];
  /** Entry's default insertion order (lower = earlier). */
  insertionOrder: number;
}

type ValidRole = "system" | "user" | "assistant";
const VALID_ROLES: ReadonlySet<string> = new Set(["system", "user", "assistant"]);

function resolveRole(value: string | undefined, fallback: ValidRole): ValidRole {
  if (value && VALID_ROLES.has(value)) return value as ValidRole;
  return fallback;
}

/**
 * Apply decorator-driven injection to a message array.
 *
 * Returns a NEW message array with decorated entries inserted at the positions
 * specified by their `@@depth` / `@@position` decorators. Entries without an
 * injection-shaping decorator (`@@depth` or `@@position`) are skipped here —
 * they are expected to use the default lorebook injection path.
 *
 * Insertion is order-stable: all target indices are computed against the
 * original array and applied from the highest index downward so earlier
 * insertions never shift later targets.
 */
export function applyLorebookDecorators<T extends DecoratorMessage>(
  messages: T[],
  decoratedEntries: LorebookEntryForInjection[],
): T[] {
  if (decoratedEntries.length === 0) return messages;

  const baseLength = messages.length;

  // Sort entries by insertionOrder so ties resolve deterministically.
  const sorted = [...decoratedEntries].sort((a, b) => a.insertionOrder - b.insertionOrder);

  // Compute (insertionIndex, entry) pairs against the ORIGINAL array.
  type Plan = { index: number; role: ValidRole; content: string; order: number };
  const plans: Plan[] = [];

  for (const entry of sorted) {
    const depthDecorator = findDecorator(entry.directives, "depth");
    const positionDecorator = findDecorator(entry.directives, "position");
    const roleDecorator = findDecorator(entry.directives, "role");

    // Skip entries with no depth/position decorator — they use default injection.
    if (!depthDecorator && !positionDecorator) continue;

    if (entry.cleanContent === "") continue;

    const role = resolveRole(roleDecorator?.value, "system");

    if (depthDecorator) {
      const parsed = Number.parseInt(depthDecorator.value ?? "0", 10);
      const depth = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
      // Depth 0 = after the last message; Depth N = N messages from the end.
      const index = Math.max(0, baseLength - depth);
      plans.push({ index, role, content: entry.cleanContent, order: entry.insertionOrder });
      continue;
    }

    // positionDecorator (no depth)
    const pos = positionDecorator!.value ?? "before_desc";
    if (pos === "before_desc") {
      plans.push({ index: 0, role, content: entry.cleanContent, order: entry.insertionOrder });
    } else {
      // after_desc | personality | scenario → after the last system message.
      const lastSystemIdx = (() => {
        for (let i = baseLength - 1; i >= 0; i--) {
          if (messages[i]!.role === "system") return i;
        }
        return -1;
      })();
      plans.push({
        index: lastSystemIdx + 1,
        role,
        content: entry.cleanContent,
        order: entry.insertionOrder,
      });
    }
  }

  if (plans.length === 0) return messages;

  // Group plans by index, then apply from the highest index downward.
  const byIndex = new Map<number, Plan[]>();
  for (const plan of plans) {
    const list = byIndex.get(plan.index) ?? [];
    list.push(plan);
    byIndex.set(plan.index, list);
  }

  const result = [...messages];
  const indices = [...byIndex.keys()].sort((a, b) => b - a);

  for (const index of indices) {
    const group = (byIndex.get(index) ?? []).sort((a, b) => a.order - b.order);
    const toInsert: T[] = group.map((p) => ({ role: p.role, content: p.content }) as T);
    result.splice(index, 0, ...toInsert);
  }

  return result;
}
