import type { HapticDeviceCommand } from "@jumpchoice/shared";
import type { Journal } from "../game/journal.service.js";
import type { LLMUsage } from "../llm/base-provider.js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { logger } from "../../lib/logger.js";
import { DATA_DIR } from "../../utils/data-dir.js";
import { createChatsStorage } from "../storage/chats.storage.js";
import {
  parseExtra,
  parseStoredGenerationParameters,
  mergeCustomParameters,
} from "../../routes/generate/generate-route-utils.js";
import { normalizeChatTopP, normalizeMaxContext, minContextLimit } from "../../routes/generate/prompt.routes.js";
import { createJournal } from "../game/journal.service.js";
import { stripGmCommandTags } from "../game/segment-edits.js";
import { readPreferredFullBodySpriteBase64 } from "../game/sprite.service.js";

export function bumpCharacterVersion(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "1.1";
  const match = raw.match(/^(.*?)(\d+)(\D*)$/);
  if (!match) return `${raw}.1`;
  const prefix = match[1] ?? "";
  const numberPart = match[2] ?? "0";
  const suffix = match[3] ?? "";
  const next = String(Number(numberPart) + 1).padStart(numberPart.length, "0");
  return `${prefix}${next}${suffix}`;
}

export function hasConversationSchedules(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && Object.keys(value as Record<string, unknown>).length > 0;
}

export function parsePromptPresetChoices(value: unknown): Record<string, string | string[]> | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, string | string[]>;
  } catch {
    return null;
  }
}

export function areConversationSchedulesEnabled(meta: Record<string, any>): boolean {
  if (typeof meta.conversationSchedulesEnabled === "boolean") return meta.conversationSchedulesEnabled;
  return hasConversationSchedules(meta.characterSchedules);
}

export function getEnabledConversationSchedules(meta: Record<string, any>): Record<string, any> {
  return areConversationSchedulesEnabled(meta) && hasConversationSchedules(meta.characterSchedules)
    ? meta.characterSchedules
    : {};
}

export function getChatHapticIntifaceUrl(meta: Record<string, unknown>): string | undefined {
  const url = meta.hapticIntifaceUrl;
  if (typeof url !== "string") return undefined;
  return url.trim() || undefined;
}

export function normalizeHapticAgentAction(action: unknown): HapticDeviceCommand["action"] | null {
  if (typeof action !== "string") return null;
  const key = action
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (key === "positionwithduration" || key === "hwpositionwithduration" || key === "linear") return "position";
  if (key === "vibrate") return "vibrate";
  if (key === "rotate") return "rotate";
  if (key === "oscillate") return "oscillate";
  if (key === "constrict") return "constrict";
  if (key === "inflate") return "inflate";
  if (key === "position") return "position";
  if (key === "stop") return "stop";
  return null;
}

export function normalizeHapticAgentNumber(value: unknown): number | undefined {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numeric) ? numeric : undefined;
}

export function normalizeHapticAgentDeviceIndex(value: unknown): HapticDeviceCommand["deviceIndex"] {
  if (value === "all" || value === undefined || value === null) return "all";
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : "all";
}

export function normalizeHapticAgentCommand(command: Record<string, unknown>): HapticDeviceCommand | null {
  const action = normalizeHapticAgentAction(command.action);
  if (!action) return null;

  return {
    deviceIndex: normalizeHapticAgentDeviceIndex(command.deviceIndex),
    action,
    intensity: normalizeHapticAgentNumber(command.intensity),
    duration: normalizeHapticAgentNumber(command.duration),
  };
}

export function normalizeHapticAgentCommands(data: Record<string, unknown>): Array<Record<string, unknown>> {
  if (Array.isArray(data.commands)) {
    return data.commands.filter(
      (entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object",
    );
  }

  if (normalizeHapticAgentAction(data.action)) {
    return [data];
  }

  return [];
}

const COMPLETE_OUTPUT_END_RE = /[.!?…。！？]["'"\u2019)\]}\u00bb\u203a]*$/;
const COMPLETE_SENTENCE_RE = /[.!?…。！？](?:["'"\u2019)\]}\u00bb\u203a]+)?(?=\s|$)/g;

export function trimIncompleteModelEnding(content: string): string {
  const trailingWhitespace = content.match(/\s*$/)?.[0] ?? "";
  const body = content.trimEnd();
  if (!body || COMPLETE_OUTPUT_END_RE.test(body)) return content;

  let lastCompleteEnd = -1;
  for (const match of body.matchAll(COMPLETE_SENTENCE_RE)) {
    lastCompleteEnd = (match.index ?? 0) + match[0].length;
  }
  if (lastCompleteEnd <= 0) return content;

  const tail = body.slice(lastCompleteEnd).trim();
  if (!tail) return content;

  const tailWithoutCommands = tail
    .replace(/\[[^\]]+\]/g, "")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .trim();
  if (!tailWithoutCommands) return content;

  return body.slice(0, lastCompleteEnd).trimEnd() + trailingWhitespace;
}

export function getHiddenCompletionTokens(usage: LLMUsage | undefined): number | undefined {
  if (!usage) return undefined;
  const hiddenParts = [
    usage.completionReasoningTokens,
    usage.completionAudioTokens,
    usage.rejectedPredictionTokens,
  ].filter((value): value is number => typeof value === "number");
  if (hiddenParts.length === 0) return undefined;
  return hiddenParts.reduce((sum, value) => sum + value, 0);
}

export function getVisibleCompletionTokens(usage: LLMUsage | undefined): number | undefined {
  if (!usage || typeof usage.completionTokens !== "number") return undefined;
  return Math.max(0, usage.completionTokens - (getHiddenCompletionTokens(usage) ?? 0));
}

export function sanitizeConnectedGameTranscript(content: string): string {
  return stripGmCommandTags(content)
    .replace(/^\[(?:To the party|To the GM)\]\s*/i, "")
    .trim();
}

export function prefixConversationUserTurn(content: string, personaName: string): string {
  const speaker = personaName.trim() || "User";
  const trimmed = content.trim();
  const escapedSpeaker = speaker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`^${escapedSpeaker}\\s*:`, "i").test(trimmed)) return trimmed;
  if (speaker === "User" && /^user\s*:/i.test(trimmed)) return trimmed;
  return trimmed ? `${speaker}: ${trimmed}` : `${speaker}:`;
}

export function formatConversationPromptTurn(content: string, role: string, personaName: string): string {
  return role === "user" ? prefixConversationUserTurn(content, personaName) : content.trim();
}

export function normalizePartyLookupName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buildPartyNpcId(name: string): string {
  const slug = normalizePartyLookupName(name).replace(/\s+/g, "-");
  const encodedSlug = encodeURIComponent(name.trim().toLowerCase())
    .replace(/%/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `npc:${slug || encodedSlug || "unknown"}`;
}

export function isPartyNpcId(id: string): boolean {
  return id.startsWith("npc:");
}

export async function updateJournal(db: any, chatId: string, transform: (journal: Journal) => Journal | null): Promise<void> {
  try {
    const chatsStore = createChatsStorage(db);
    const chat = await chatsStore.getById(chatId);
    if (!chat) return;
    const meta = parseExtra(chat.metadata) as Record<string, unknown>;
    const journal = (meta.gameJournal as Journal) ?? createJournal();
    const updated = transform(journal);
    if (updated) {
      await chatsStore.updateMetadata(chatId, { ...meta, gameJournal: updated });
    }
  } catch {
    // Non-critical — don't break generation
  }
}

export function readAvatarBase64(avatarPath: string | null | undefined): string | undefined {
  if (!avatarPath) return undefined;
  const filename = avatarPath.split("?")[0]?.split("/").pop();
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) return undefined;
  const diskPath = join(DATA_DIR, "avatars", filename);
  try {
    if (!existsSync(diskPath)) return undefined;
    return readFileSync(diskPath).toString("base64");
  } catch {
    return undefined;
  }
}

export function readBestCharacterReferenceBase64(
  characterId: string | null | undefined,
  avatarPath: string | null | undefined,
): string | undefined {
  return readPreferredFullBodySpriteBase64(characterId)?.base64 ?? readAvatarBase64(avatarPath);
}

export function normalizeDmTargetName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^il\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface GenerationParameters {
  temperature: number;
  maxTokens: number;
  topP: number | undefined;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  showThoughts: boolean;
  reasoningEffort: "low" | "medium" | "high" | "maximum" | null;
  verbosity: "low" | "medium" | "high" | null;
  assistantPrefill: string;
  customParameters: Record<string, unknown>;
  effectiveMaxContext: number | undefined;
}

export interface ResolvedGenerationParameters extends GenerationParameters {
  resolvedEffort: "low" | "medium" | "high" | "xhigh" | null;
  enableThinking: boolean;
}

export function resolveGenerationParameters(
  current: GenerationParameters,
  options: {
    conn: any;
    chatMeta: Record<string, unknown>;
    chatMode: string;
    isSceneChat: boolean;
    knownModelContext: number | undefined;
  },
): ResolvedGenerationParameters {
  const { conn, chatMeta, chatMode, isSceneChat, knownModelContext } = options;

  let {
    temperature,
    maxTokens,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    showThoughts,
    reasoningEffort,
    verbosity,
    assistantPrefill,
    customParameters,
    effectiveMaxContext,
  } = current;

  const connectionParams = parseStoredGenerationParameters(conn.defaultParameters);
  const chatParams = parseStoredGenerationParameters(chatMeta.chatParameters);

  const applyParameterOverrides = (params: typeof connectionParams) => {
    if (!params) return;
    if (typeof params.temperature === "number") temperature = params.temperature;
    if (typeof params.maxTokens === "number") maxTokens = params.maxTokens;
    topP = normalizeChatTopP(params.topP) ?? topP;
    if (typeof params.topK === "number") topK = params.topK;
    if (typeof params.frequencyPenalty === "number") frequencyPenalty = params.frequencyPenalty;
    if (typeof params.presencePenalty === "number") presencePenalty = params.presencePenalty;
    if (typeof params.showThoughts === "boolean") showThoughts = params.showThoughts;
    if (params.reasoningEffort !== undefined) reasoningEffort = params.reasoningEffort;
    if (params.verbosity !== undefined) verbosity = params.verbosity;
    if (typeof params.assistantPrefill === "string") assistantPrefill = params.assistantPrefill;
    customParameters = mergeCustomParameters(customParameters, params.customParameters);

    const paramsMaxContext = params.useMaxContext ? knownModelContext : normalizeMaxContext(params.maxContext);
    effectiveMaxContext = minContextLimit(effectiveMaxContext, paramsMaxContext);
  };

  if (isSceneChat) {
    maxTokens = 8192;
    reasoningEffort = "maximum";
    verbosity = "high";
  }

  const isLocalGemma = (conn.model ?? "").toLowerCase().includes("gemma");
  if (chatMode === "game" && !isLocalGemma) {
    temperature = 1;
    maxTokens = 16384;
    topP = 1;
    topK = 0;
    frequencyPenalty = 0;
    presencePenalty = 0;
    reasoningEffort = "maximum";
    verbosity = null;
  } else if (chatMode === "game") {
    if (typeof chatParams?.maxTokens !== "number") {
      maxTokens = Math.max(maxTokens, 16384);
    }
  }

  applyParameterOverrides(connectionParams);
  applyParameterOverrides(chatParams);

  let resolvedEffort: "low" | "medium" | "high" | "xhigh" | null =
    reasoningEffort !== "maximum" ? reasoningEffort : null;
  if (reasoningEffort === "maximum") {
    const modelLower = (conn.model ?? "").toLowerCase();
    const supportsXhigh =
      modelLower.startsWith("gpt-5.5") ||
      modelLower.startsWith("gpt-5.4") ||
      modelLower === "grok-4.20-multi-agent" ||
      /claude-opus-4-(?:[7-9]|\d{2,})/.test(modelLower);
    resolvedEffort = supportsXhigh ? "xhigh" : "high";
  }

  const modelLower = (conn.model ?? "").toLowerCase();
  const providerLower = (conn.provider ?? "").toLowerCase();
  const isXaiAutoReasoningModel =
    (providerLower === "xai" && (modelLower.startsWith("grok-4.3") || modelLower.startsWith("grok-4-1-fast"))) ||
    (providerLower === "openrouter" && modelLower.startsWith("x-ai/grok-"));
  if (isXaiAutoReasoningModel) {
    resolvedEffort = null;
  }

  if (resolvedEffort && !showThoughts) {
    showThoughts = true;
  }

  const enableThinking = !!resolvedEffort;

  const modelLc = (conn.model ?? "").toLowerCase();

  const isClaudeNoSampling = /claude-opus-4-(?:[7-9]|\d{2,})/.test(modelLc);
  if (isClaudeNoSampling) {
    topP = undefined;
    topK = 0;
    frequencyPenalty = 0;
    presencePenalty = 0;
  }

  const isClaudeTemperatureOnly =
    !isClaudeNoSampling &&
    (/claude-(opus|sonnet)-4-[56]/.test(modelLc) || /claude-(opus|sonnet)-4\.[56]/.test(modelLc));
  if (isClaudeTemperatureOnly) {
    topP = undefined;
    topK = 0;
    frequencyPenalty = 0;
    presencePenalty = 0;
  }

  return {
    temperature,
    maxTokens,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    showThoughts,
    reasoningEffort,
    verbosity,
    assistantPrefill,
    customParameters,
    effectiveMaxContext,
    resolvedEffort,
    enableThinking,
  };
}
