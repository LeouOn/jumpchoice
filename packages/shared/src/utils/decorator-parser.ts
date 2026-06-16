// ──────────────────────────────────────────────
// CCv3 Decorator Parser
// ──────────────────────────────────────────────
// Parses @@decorator directives from lorebook entry content.
// Spec: https://github.com/kwaroran/character-card-spec-v3/blob/main/SPEC_V3.md#decorators
//
// Decorators are line-prefixed: each must be on its own line at the top of the
// content. Primary decorators start with @@; fallback decorators start with @@@.
// The body text follows after all decorator lines (optionally separated by a
// blank line). Multiple decorators stack (AND logic).
//
// MVP-supported decorators (parsed + exposed):
//   @@depth N            — inject N messages from the end of the array
//   @@role system|user|assistant — chat role of the injected message
//   @@position before_desc|after_desc|personality|scenario — anchor section
//   @@is_greeting N      — only inject when greeting index == N
//   @@constant           — always inject (same as entry.constant = true)
//   @@activate           — always activate (overrides @@dont_activate)
//   @@dont_activate      — never activate
//
// Unknown decorators are still parsed and surfaced so downstream code can
// decide what to do with them.

/** A single parsed decorator directive. */
export interface ParsedDecorator {
  /** Decorator name without the @@ prefix, e.g. "depth", "role", "is_greeting". */
  name: string;
  /** Optional value, e.g. "5" for @@depth 5, "system" for @@role system. */
  value?: string;
  /** Whether this is a fallback decorator (@@@) vs a primary (@@). */
  isFallback: boolean;
}

/** Result of parsing decorators from entry content. */
export interface ParsedDecoratorsResult {
  /** All parsed decorators, in order of appearance. */
  directives: ParsedDecorator[];
  /** The content with decorator lines stripped (leading/trailing whitespace trimmed). */
  cleanContent: string;
}

/**
 * Parse @@decorator directives from the start of a lorebook entry's content.
 *
 * Decorators are line-prefixed: each must be on its own line at the top of the
 * content. Primary decorators start with @@; fallback decorators start with @@@.
 * The body text follows after all decorator lines. A blank line may separate
 * the decorator block from the body; it is consumed and not part of cleanContent.
 *
 * Example:
 *   @@depth 5
 *   @@role system
 *
 *   You are now in a dark forest.
 *
 * → directives: [{name:"depth", value:"5", isFallback:false}, {name:"role", value:"system", isFallback:false}]
 * → cleanContent: "You are now in a dark forest."
 */
export function parseDecorators(content: string): ParsedDecoratorsResult {
  const lines = content.split(/\r?\n/);
  const directives: ParsedDecorator[] = [];
  let bodyStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();

    // Empty line marks the end of the decorator block.
    if (trimmed === "") {
      bodyStartIndex = i + 1;
      break;
    }

    // Fallback decorator (@@@) is checked first because @@@ starts with @@.
    const fallbackMatch = trimmed.match(/^@@@([A-Za-z_][\w]*)\s*(.*)$/);
    if (fallbackMatch) {
      directives.push({
        name: fallbackMatch[1]!,
        value: fallbackMatch[2]!.trim() || undefined,
        isFallback: true,
      });
      bodyStartIndex = i + 1;
      continue;
    }

    // Primary decorator (@@).
    const primaryMatch = trimmed.match(/^@@([A-Za-z_][\w]*)\s*(.*)$/);
    if (primaryMatch) {
      directives.push({
        name: primaryMatch[1]!,
        value: primaryMatch[2]!.trim() || undefined,
        isFallback: false,
      });
      bodyStartIndex = i + 1;
      continue;
    }

    // Non-decorator line — the body starts here.
    bodyStartIndex = i;
    break;
  }

  const cleanContent = lines.slice(bodyStartIndex).join("\n").trim();
  return { directives, cleanContent };
}

/**
 * Find a decorator by name, preferring a non-fallback directive.
 * Returns the first match, or undefined.
 */
export function findDecorator(
  directives: ParsedDecorator[],
  name: string,
): ParsedDecorator | undefined {
  return (
    directives.find((d) => d.name === name && !d.isFallback) ??
    directives.find((d) => d.name === name)
  );
}

/** True when the directive list contains at least one of the named decorators. */
export function hasDecorator(directives: ParsedDecorator[], name: string): boolean {
  return directives.some((d) => d.name === name);
}
