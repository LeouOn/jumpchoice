// ──────────────────────────────────────────────
// Moments: "Render this moment" (JumpChoice fork feature)
// ──────────────────────────────────────────────
// Prompt building blocks, defaults and the request/response contract for the
// preview-then-confirm moment renderer. The block texts are the user's tested
// wording and are sent to the image model verbatim.
import { z } from "zod";

export const MOMENT_STYLE_PRESETS = [
  {
    id: "classic-pixel",
    label: "Classic pixel",
    text: "Detailed 16-bit-era pixel art illustration, like a hand-made scene from a 1990s adventure game. Low internal resolution scaled up with nearest-neighbour, so every pixel is a crisp visible square. Limited palette of about 32 colours, hard edges, no anti-aliasing, no blur, no gradients except dithered ones, no photographic texture. Warm, nostalgic lighting. No text, no letters, no logos, no watermark.",
  },
  {
    id: "hi-bit-anime",
    label: "Hi-bit anime",
    text: "High-resolution modern pixel art at about 640×360 on a strict pixel grid, with thousands of colours. Pixel clusters are shaped like brush strokes, giving painterly hi-bit shading. Anime-film lighting: glowing skies, bloom, light shafts, sparkling highlights in the eyes and hair. Crisp pixel edges, no blur, no anti-aliasing. It should look like the title screen of a lovingly made modern indie game. No text, no logos.",
  },
  {
    id: "pixel-pointillism",
    label: "Pixel pointillism",
    text: "Neo-pointillist pixel art. The whole image is built from visible square pixels at about 640×360, each pixel a single dab of pure, saturated colour, like Seurat and Signac but with square pixels instead of round dots. Thousands of colours, with no smooth blending: colours mix optically, so complementary colours sit side by side (orange beside blue, violet beside gold) and shimmer. Light glows by density of bright pixels. Her face and eyes stay clean and refined, in delicate anime proportions with fine pixel linework, while the background dissolves into luminous pixel dabs. No text, no logos.",
  },
] as const;

export type MomentPresetStyleId = (typeof MOMENT_STYLE_PRESETS)[number]["id"];
export const MOMENT_CUSTOM_STYLE_ID = "custom";
export type MomentStyleId = MomentPresetStyleId | typeof MOMENT_CUSTOM_STYLE_ID;
export const MOMENT_STYLE_IDS = [
  "classic-pixel",
  "hi-bit-anime",
  "pixel-pointillism",
  "custom",
] as const satisfies readonly MomentStyleId[];
export const DEFAULT_MOMENT_STYLE_ID: MomentStyleId = "classic-pixel";

export const MOMENT_ASPECTS = ["desktop", "phone"] as const;
export type MomentAspect = (typeof MOMENT_ASPECTS)[number];

export const MOMENT_FORMATS: Record<
  MomentAspect,
  { aspectRatio: "16:9" | "9:16"; width: number; height: number; text: string }
> = {
  desktop: {
    aspectRatio: "16:9",
    width: 1344,
    height: 768,
    text: "Wide 16:9 composition. The companion in the left or right third, the scene across the rest of the frame, with a deep sense of place. One single continuous illustration that fills the whole frame edge to edge: no inset panels, no split or stacked frames, no borders, no picture-in-picture, no black bands.",
  },
  phone: {
    aspectRatio: "9:16",
    width: 768,
    height: 1344,
    text: "Vertical 9:16 composition for a phone screen, one continuous scene from top to bottom. The companion in the middle third, from the waist or knees up, standing inside the scene; sky above, ground below, all one picture.",
  },
};

export const MOMENT_RULES_BLOCK =
  "The viewer is never shown except perhaps one hand at the frame edge. Every person has exactly two arms and two hands, clearly attached. The companion looks at the viewer. No readable text anywhere: signs and screens are blank or abstract. Nobody resembles a real, famous person.";

export const MOMENT_REFERENCE_LINE = "Keep her face, hair and colouring consistent with the attached reference image.";

export const MOMENT_SCENE_SUMMARY_INSTRUCTION =
  "Describe this moment as one vivid paragraph for an illustrator: place, time, light, what the companion is doing and wearing, her expression; present tense; no dialogue";

/** Number of recent chat messages the scene-summary helper reads. */
export const MOMENT_SCENE_SUMMARY_MESSAGE_COUNT = 8;

/** Conservative per-image cost used for cap checks and when the provider reports no cost. */
export const MOMENT_ESTIMATED_COST_USD = 0.05;

export const DEFAULT_MOMENT_MODEL = "google/gemini-nano-banana-2.1";

/** Synced app-settings key holding the moment model and spending caps. */
export const MOMENT_RENDER_SETTINGS_KEY = "momentRenderSettings";

const usdAmount = z.number().finite().min(0).max(100_000);

export const momentRenderSettingsSchema = z.object({
  /** Image model sent for moments. Blank means "use the image connection's own model". */
  model: z.string().trim().max(200).default(DEFAULT_MOMENT_MODEL),
  /** Optional image-generation connection for moments; blank uses the chat's / default image connection. */
  connectionId: z.string().trim().max(200).default(""),
  dailyCapUsd: usdAmount.default(2),
  totalCapUsd: usdAmount.default(20),
  /** Optional ceiling on the OpenRouter account's lifetime usage (USD). null = not checked. */
  accountUsageCeilingUsd: usdAmount.nullable().default(null),
});

export type MomentRenderSettings = z.infer<typeof momentRenderSettingsSchema>;

export const DEFAULT_MOMENT_RENDER_SETTINGS: MomentRenderSettings = momentRenderSettingsSchema.parse({});

export function normalizeMomentRenderSettings(raw: unknown): MomentRenderSettings {
  const parsed = momentRenderSettingsSchema.safeParse(raw && typeof raw === "object" ? raw : {});
  return parsed.success ? parsed.data : DEFAULT_MOMENT_RENDER_SETTINGS;
}

export const momentPromptInputSchema = z.object({
  /** Companion character to depict; defaults to the chat's remembered/first character. */
  characterId: z.string().trim().min(1).max(200).optional(),
  styleId: z.enum(MOMENT_STYLE_IDS).optional(),
  customStyle: z.string().max(4000).optional(),
  aspect: z.enum(MOMENT_ASPECTS).optional(),
  scene: z.string().max(8000).default(""),
  debugMode: z.boolean().optional(),
});

export type MomentPromptInput = z.infer<typeof momentPromptInputSchema>;

export const momentRenderInputSchema = momentPromptInputSchema.extend({
  /** The exact prompt the user reviewed (and possibly edited). Sent to the provider unchanged. */
  prompt: z.string().trim().min(1).max(20_000),
  /** Must be true: the client only renders after the user confirmed the reviewed prompt. */
  confirmed: z.literal(true),
});

export type MomentRenderInput = z.infer<typeof momentRenderInputSchema>;

export const momentSceneInputSchema = z.object({
  characterId: z.string().trim().min(1).max(200).optional(),
  debugMode: z.boolean().optional(),
});

export interface MomentSpendStatus {
  todayUsd: number;
  totalUsd: number;
  dailyCapUsd: number;
  totalCapUsd: number;
  accountUsageCeilingUsd: number | null;
  pendingCount: number;
  estimateUsd: number;
}

export interface MomentPreviewResponse {
  prompt: string;
  model: string;
  connectionName: string;
  aspect: MomentAspect;
  aspectRatio: string;
  width: number;
  height: number;
  styleId: MomentStyleId;
  customStyle: string;
  character: { id: string; name: string } | null;
  /** Small data-URL thumbnails of the attached reference image(s). Empty when none is sent. */
  referenceThumbs: string[];
  referenceSource: "character-sheet" | "avatar" | "sprite" | null;
  estimatedCostUsd: number;
  spend: MomentSpendStatus;
  /** Null when a render would be allowed; otherwise the reason it would be refused. */
  blockedReason: string | null;
}

export interface MomentRenderResponse {
  image: {
    id: string;
    chatId: string;
    filePath: string;
    prompt: string;
    model: string;
    width: number | null;
    height: number | null;
    createdAt: string;
    url: string;
  };
  costUsd: number;
  costSource: "provider" | "estimate";
  spend: MomentSpendStatus;
}
