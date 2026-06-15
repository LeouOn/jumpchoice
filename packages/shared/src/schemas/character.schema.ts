// ──────────────────────────────────────────────
// Character Zod Schemas
// ──────────────────────────────────────────────
import { z } from "zod";

export const depthPromptSchema = z.object({
  prompt: z.string().default(""),
  depth: z.number().int().min(0).default(4),
  role: z.enum(["system", "user", "assistant"]).default("system"),
});

export const altDescriptionSchema = z.object({
  id: z.string().default(""),
  label: z.string().default("Extension"),
  content: z.string().default(""),
  active: z.boolean().default(true),
});

export const characterExtensionsSchema = z
  .object({
    talkativeness: z.number().min(0).max(1).default(0.5),
    fav: z.boolean().default(false),
    world: z.string().default(""),
    depth_prompt: depthPromptSchema.default({}),
    backstory: z.string().default(""),
    appearance: z.string().default(""),
    altDescriptions: z.array(altDescriptionSchema).default([]),
  })
  .passthrough();

export const characterAssetSchema = z.object({
  type: z.string(),
  uri: z.string(),
  name: z.string(),
  ext: z.string().default("png"),
});

export const characterBookEntrySchema = z.object({
  keys: z.array(z.string()).default([]),
  content: z.string().default(""),
  extensions: z.record(z.unknown()).default({}),
  enabled: z.boolean().default(true),
  insertion_order: z.number().default(100),
  case_sensitive: z.boolean().default(false),
  name: z.string().default(""),
  priority: z.number().default(100),
  id: z.number().default(0),
  comment: z.string().default(""),
  selective: z.boolean().default(false),
  secondary_keys: z.array(z.string()).default([]),
  constant: z.boolean().default(false),
  position: z.enum(["before_char", "after_char"]).catch("before_char").default("before_char"),
  // ── V3 lorebook entry fields ──
  probability: z.number().min(0).max(100).optional(),
  use_regex: z.boolean().optional(),
  position_numeric: z.number().int().min(0).max(4).optional(),
  group: z.string().optional(),
  group_weight: z.number().optional(),
  sticky: z.number().int().min(0).optional(),
  cooldown: z.number().int().min(0).optional(),
  delay: z.number().int().min(0).optional(),
  ephemeral: z.boolean().optional(),
  selective_logic: z.number().int().min(0).max(2).optional(),
  match_whole_words: z.boolean().optional(),
  prevent_recursion: z.boolean().optional(),
  exclude_from_vectorization: z.boolean().optional(),
});

export const characterBookSchema = z.object({
  name: z.string().default(""),
  description: z.string().default(""),
  scan_depth: z.number().default(2),
  token_budget: z.number().default(512),
  recursive_scanning: z.boolean().default(false),
  extensions: z.record(z.unknown()).default({}),
  entries: z.array(characterBookEntrySchema).default([]),
});

export const characterDataSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  personality: z.string().default(""),
  scenario: z.string().default(""),
  first_mes: z.string().default(""),
  mes_example: z.string().default(""),
  creator_notes: z.string().default(""),
  system_prompt: z.string().default(""),
  post_history_instructions: z.string().default(""),
  tags: z.array(z.string()).default([]),
  creator: z.string().default(""),
  character_version: z.string().default(""),
  alternate_greetings: z.array(z.string()).default([]),
  extensions: characterExtensionsSchema.default({}),
  character_book: characterBookSchema.nullable().default(null),
  // ── V3-only fields (optional for backward compat with V2) ──
  nickname: z.string().optional(),
  assets: z.array(characterAssetSchema).optional(),
  creator_notes_multilingual: z.record(z.string(), z.string()).optional(),
  source: z.array(z.string()).optional(),
  group_only_greetings: z.array(z.string()).default([]),
  creation_date: z.number().optional(),
  modification_date: z.number().optional(),
});

export const characterCardV2Schema = z.object({
  spec: z.literal("chara_card_v2"),
  spec_version: z.literal("2.0"),
  data: characterDataSchema,
});

export const characterCardV3Schema = z.object({
  spec: z.literal("chara_card_v3"),
  spec_version: z.literal("3.0"),
  data: characterDataSchema,
});

export const createCharacterSchema = z.object({
  data: characterDataSchema,
});

export const updateCharacterSchema = z.object({
  data: characterDataSchema.partial(),
});

export const createGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  characterIds: z.array(z.string()).default([]),
});

export const updateGroupSchema = createGroupSchema.partial();

export const createPersonaGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  personaIds: z.array(z.string()).default([]),
});

export const updatePersonaGroupSchema = createPersonaGroupSchema.partial();

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;
export type CharacterCardV2Input = z.infer<typeof characterCardV2Schema>;
export type CharacterCardV3Input = z.infer<typeof characterCardV3Schema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type CreatePersonaGroupInput = z.infer<typeof createPersonaGroupSchema>;
export type UpdatePersonaGroupInput = z.infer<typeof updatePersonaGroupSchema>;
