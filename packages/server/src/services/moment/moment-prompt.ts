// ──────────────────────────────────────────────
// Moments: prompt assembly (JumpChoice fork feature)
// ──────────────────────────────────────────────
// Pure functions. The assembled prompt is shown to the user before anything is
// sent; block order is fixed:
//   style → character card → format → scene → rules → reference line
import {
  DEFAULT_MOMENT_STYLE_ID,
  MOMENT_ASPECTS,
  MOMENT_CUSTOM_STYLE_ID,
  MOMENT_FORMATS,
  MOMENT_REFERENCE_LINE,
  MOMENT_RULES_BLOCK,
  MOMENT_STYLE_IDS,
  MOMENT_STYLE_PRESETS,
  type MomentAspect,
  type MomentStyleId,
} from "@jumpchoice/shared";

export function isMomentStyleId(value: unknown): value is MomentStyleId {
  return typeof value === "string" && (MOMENT_STYLE_IDS as readonly string[]).includes(value);
}

export function isMomentAspect(value: unknown): value is MomentAspect {
  return typeof value === "string" && (MOMENT_ASPECTS as readonly string[]).includes(value);
}

/** Resolve the style block text. Custom uses the user's text verbatim. */
export function resolveMomentStyleText(styleId: MomentStyleId, customStyle?: string | null): string {
  if (styleId === MOMENT_CUSTOM_STYLE_ID) return (customStyle ?? "").trim();
  const preset = MOMENT_STYLE_PRESETS.find((entry) => entry.id === styleId);
  return (preset ?? MOMENT_STYLE_PRESETS.find((entry) => entry.id === DEFAULT_MOMENT_STYLE_ID)!).text;
}

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * The per-character "moment card" text (character editor → Moment card), falling
 * back to the card's appearance. Returned verbatim (trimmed).
 */
export function readMomentCharacterCard(characterData: unknown): string {
  const data = readRecord(characterData);
  const extensions = readRecord(data.extensions);
  for (const candidate of [extensions.momentCard, extensions.appearance, data.appearance]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

export type MomentPromptParts = {
  styleId: MomentStyleId;
  customStyle?: string | null;
  characterCard: string;
  aspect: MomentAspect;
  scene: string;
  /** Append the "keep her face consistent" line; only meaningful when a reference image is attached. */
  includeReferenceLine: boolean;
};

/** Assemble the final moment prompt. Empty blocks are skipped; non-empty blocks are separated by a blank line. */
export function assembleMomentPrompt(parts: MomentPromptParts): string {
  const blocks = [
    resolveMomentStyleText(parts.styleId, parts.customStyle),
    parts.characterCard.trim(),
    MOMENT_FORMATS[parts.aspect].text,
    parts.scene.trim(),
    MOMENT_RULES_BLOCK,
    parts.includeReferenceLine ? MOMENT_REFERENCE_LINE : "",
  ];
  return blocks.filter((block) => block.length > 0).join("\n\n");
}
