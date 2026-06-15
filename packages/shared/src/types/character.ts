// ──────────────────────────────────────────────
// Character Card V2 Types (compatible with ST / Chub)
// ──────────────────────────────────────────────
import type { AltDescription } from "./persona";

/** Full Character Card V2 envelope. */
export interface CharacterCardV2 {
  spec: "chara_card_v2";
  spec_version: "2.0";
  data: CharacterData;
}

/** Full Character Card V3 envelope. */
export interface CharacterCardV3 {
  spec: "chara_card_v3";
  spec_version: "3.0";
  data: CharacterData;
}

/** V3 asset: icon, background, emotion sprite, user icon, or inlay. */
export interface CharacterAsset {
  /** Asset type: 'icon' | 'background' | 'user_icon' | 'emotion' | 'inlay' | 'x_*' (custom) */
  type: string;
  /** URI: HTTPS URL | base64 data URL | 'embeded://path' (spec misspells intentionally) | 'ccdefault:' */
  uri: string;
  /** Identifier; for icon/background 'main' is special. For emotion = label (happy/sad/neutral). */
  name: string;
  /** Lowercase file extension without dot, e.g. 'png'. 'unknown' allowed. */
  ext: string;
}

/** Core character data (V2 spec). */
export interface CharacterData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  tags: string[];
  creator: string;
  character_version: string;
  alternate_greetings: string[];
  extensions: CharacterExtensions;
  character_book: CharacterBook | null;
  // ── V3-only fields (optional for backward compat with V2) ──
  /** V3: Short nickname that overrides {{char}} replacement */
  nickname?: string;
  /** V3: Multi-asset support (icons, backgrounds, emotions, inlays) */
  assets?: CharacterAsset[];
  /** V3: Localized creator notes (ISO 639-1 language code → text) */
  creator_notes_multilingual?: Record<string, string>;
  /** V3: Provenance URLs/IDs (append-only per spec) */
  source?: string[];
  /** V3: Greetings active only in group chats (MUST be present in V3, MAY be []) */
  group_only_greetings?: string[];
  /** V3: Unix timestamp (seconds, UTC) of card creation; 0 = unknown */
  creation_date?: number;
  /** V3: Unix timestamp (seconds, UTC) of last modification; 0 = unknown */
  modification_date?: number;
}

/** ST-compatible extension fields. */
export interface CharacterExtensions {
  talkativeness: number;
  fav: boolean;
  world: string;
  depth_prompt: DepthPrompt;
  /** Marinara Engine extension: character backstory / lore */
  backstory: string;
  /** Marinara Engine extension: physical appearance description */
  appearance: string;
  /** Marinara Engine: toggleable additions appended to the main character description */
  altDescriptions?: AltDescription[];
  /** Marinara Engine: Name display color/gradient (CSS value, e.g. "linear-gradient(90deg, #ff6b6b, #ffd93d)" or "#ff6b6b") */
  nameColor?: string;
  /** Marinara Engine: Dialogue highlight color — text in quotation marks is bold + colored with this */
  dialogueColor?: string;
  /** Marinara Engine: Chat bubble / dialogue box background color */
  boxColor?: string;
  /** Marinara Engine: RPG stats toggle + custom attributes */
  rpgStats?: RPGStatsConfig;
  /** Marinara Engine: Conversation-mode availability status */
  conversationStatus?: "online" | "idle" | "dnd" | "offline";
  [key: string]: unknown;
}

/** RPG stats configuration attached to a character card. */
export interface RPGStatsConfig {
  /** Whether RPG stats are enabled for this character */
  enabled: boolean;
  /** Custom attribute list (e.g. STR, DEX, CHA — user can rename/add/remove) */
  attributes: Array<{ name: string; value: number }>;
  /** Hit Points */
  hp: { value: number; max: number };
}

/** Depth-injected prompt attached to a character. */
export interface DepthPrompt {
  prompt: string;
  depth: number;
  role: "system" | "user" | "assistant";
}

/** Embedded lorebook inside a character card. */
export interface CharacterBook {
  name: string;
  description: string;
  scan_depth: number;
  token_budget: number;
  recursive_scanning: boolean;
  extensions: Record<string, unknown>;
  entries: CharacterBookEntry[];
}

/** A single entry in a character book. */
export interface CharacterBookEntry {
  keys: string[];
  content: string;
  extensions: Record<string, unknown>;
  enabled: boolean;
  insertion_order: number;
  case_sensitive: boolean;
  name: string;
  priority: number;
  id: number;
  comment: string;
  selective: boolean;
  secondary_keys: string[];
  constant: boolean;
  position: "before_char" | "after_char";
  // ── V3 lorebook entry fields ──
  /** V3: Probability weight (0-100) for random activation */
  probability?: number;
  /** V3: When true, keys are regex patterns (use re2 engine) */
  use_regex?: boolean;
  /** V3: Numeric position (0=before_char, 1=after_char, 2=before_an, 3=after_an, 4=at_end; ST-extended) */
  position_numeric?: number;
  /** V3: Group identifier for group-based activation logic */
  group?: string;
  /** V3: Weight within a group (higher = more likely to activate) */
  group_weight?: number;
  /** V3: Once activated, stays active for N subsequent turns */
  sticky?: number;
  /** V3: Turns to wait before this entry can reactivate */
  cooldown?: number;
  /** V3: Delay activation by N turns */
  delay?: number;
  /** V3: If true, entry is removed from context after single activation */
  ephemeral?: boolean;
  /** V3: Logic gate for selective activation (0=AND, 1=NOT, 2=OR) */
  selective_logic?: number;
  /** V3: Match whole words only (not substrings) */
  match_whole_words?: boolean;
  /** V3: Prevent recursive scanning from triggering this entry */
  prevent_recursion?: boolean;
  /** V3: Exclude this entry from vectorization/embedding */
  exclude_from_vectorization?: boolean;
}

/** Our internal Character representation (extends V2 with engine-specific fields). */
export interface Character {
  id: string;
  /** Original V2 data preserved for export compatibility */
  data: CharacterData;
  /** User-only note shown under the character name in selectors and editors */
  comment: string;
  /** Path to avatar image file */
  avatarPath: string | null;
  /** Path to sprite folder */
  spriteFolderPath: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Saved snapshot of a previous character card state. */
export interface CharacterCardVersion {
  id: string;
  characterId: string;
  data: CharacterData;
  comment: string;
  avatarPath: string | null;
  version: string;
  source: "manual" | "agent" | "command" | "restore" | string;
  reason: string;
  createdAt: string;
}

/** A group of characters (e.g. "Fatui Harbingers") — acts as a preset that adds all members to a chat. */
export interface CharacterGroup {
  id: string;
  name: string;
  description: string;
  avatarPath: string | null;
  /** IDs of characters belonging to this group */
  characterIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** A group of personas — for organising user personas. */
export interface PersonaGroup {
  id: string;
  name: string;
  description: string;
  /** IDs of personas belonging to this group */
  personaIds: string[];
  createdAt: string;
  updatedAt: string;
}
