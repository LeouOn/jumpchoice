// ── Shared helpers for chat settings components ──
import type { ChatMemoryChunk, ChatMemoryRecallExportPayload, ExportEnvelope } from "@jumpchoice/shared";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMemoryRecallExportEnvelope(value: unknown): value is ExportEnvelope<ChatMemoryRecallExportPayload> {
  if (!isRecord(value) || value.type !== "marinara_memory_recall" || value.version !== 1) return false;
  const data = value.data;
  return isRecord(data) && Array.isArray(data.chunks);
}

export function formatMemoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function estimateMemoryTokens(memories: ChatMemoryChunk[]): number {
  const text = memories.map((memory) => memory.content).join("\n\n");
  return Math.ceil(text.length / 4);
}

export function formatMemoryChunkCount(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? "memory chunk" : "memory chunks"}`;
}

export { isRecord, isMemoryRecallExportEnvelope };

export const MEMORY_CONTENT_CLASS =
  "max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[var(--secondary)]/50 px-3 py-2 text-[0.6875rem] leading-relaxed text-[var(--foreground)]";
export const MAX_MEMORY_RECALL_IMPORT_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_MEMORY_RECALL_IMPORT_FILE_LABEL = "25 MB";
