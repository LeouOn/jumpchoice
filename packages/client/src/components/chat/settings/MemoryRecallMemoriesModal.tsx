// ── Memory Recall Memories Modal ──
import { useRef, useMemo } from "react";
import { toast } from "sonner";
import { RefreshCw, Trash2, Download, Upload } from "lucide-react";
import { cn } from "../../../lib/utils";
import { showConfirmDialog } from "../../../lib/app-dialogs";
import { Modal } from "../../ui/Modal";
import {
  useChatMemories,
  useDeleteChatMemory,
  useClearChatMemories,
  useRefreshChatMemories,
  useExportChatMemories,
  useImportChatMemories,
} from "../../../hooks/use-chats";
import type { ChatMemoryChunk } from "@jumpchoice/shared";
import {
  formatMemoryDate,
  estimateMemoryTokens,
  formatMemoryChunkCount,
  isMemoryRecallExportEnvelope,
  MEMORY_CONTENT_CLASS,
  MAX_MEMORY_RECALL_IMPORT_FILE_BYTES,
  MAX_MEMORY_RECALL_IMPORT_FILE_LABEL,
} from "./chat-settings-utils";

export function MemoryRecallMemoriesModal({
  chatId,
  open,
  onClose,
}: {
  chatId: string;
  open: boolean;
  onClose: () => void;
}) {
  const memoriesQuery = useChatMemories(chatId, open);
  const deleteMemory = useDeleteChatMemory(chatId);
  const clearMemories = useClearChatMemories(chatId);
  const refreshMemories = useRefreshChatMemories(chatId);
  const exportMemories = useExportChatMemories(chatId);
  const importMemories = useImportChatMemories(chatId);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const memories = useMemo(() => memoriesQuery.data ?? [], [memoriesQuery.data]);
  const totalTokens = useMemo(() => estimateMemoryTokens(memories), [memories]);

  const handleExport = async () => {
    if (memories.length === 0) {
      toast.error("There are no recall memories to export yet.");
      return;
    }

    try {
      await exportMemories.mutateAsync();
      toast.success("Memory Recall exported.");
    } catch (err) {
      toast.error(err instanceof Error ? `Export failed: ${err.message}` : "Export failed.");
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MEMORY_RECALL_IMPORT_FILE_BYTES) {
      toast.error(`Memory Recall import files must be ${MAX_MEMORY_RECALL_IMPORT_FILE_LABEL} or smaller.`);
      event.target.value = "";
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!isMemoryRecallExportEnvelope(parsed)) {
        toast.error("Choose a Memory Recall export file.");
        return;
      }

      const result = await importMemories.mutateAsync({ envelope: parsed });
      if (result.imported > 0) {
        toast.success(`Imported ${formatMemoryChunkCount(result.imported)}.`);
      } else {
        toast.info("No new recall memories were imported.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? `Import failed: ${err.message}` : "Import failed.");
    } finally {
      event.target.value = "";
    }
  };

  const handleDelete = async (memory: ChatMemoryChunk) => {
    const ok = await showConfirmDialog({
      title: "Forget Memory",
      message: "Remove this recall memory from this chat?",
      confirmLabel: "Forget",
      tone: "destructive",
    });
    if (ok) deleteMemory.mutate(memory.id);
  };

  const handleClear = async () => {
    if (memories.length === 0) return;
    const ok = await showConfirmDialog({
      title: "Clear Memories",
      message: "Remove all recall memories for this chat? This does not delete chat messages.",
      confirmLabel: "Clear",
      tone: "destructive",
    });
    if (ok) clearMemories.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Memories for This Chat" width="max-w-3xl">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--secondary)]/70 px-3 py-2 ring-1 ring-[var(--border)]">
          <div className="text-[0.6875rem] text-[var(--muted-foreground)]">
            <span className="font-semibold text-[var(--foreground)]">{memories.length}</span>{" "}
            {memories.length === 1 ? "memory chunk" : "memory chunks"}
            {memories.length > 0 && (
              <>
                {" "}
                · <span className="tabular-nums">~{totalTokens.toLocaleString()} tokens</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <input
              ref={importInputRef}
              type="file"
              accept=".json,.marinara"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={memories.length === 0 || exportMemories.isPending}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-40"
              title="Export memories"
              aria-label="Export memories"
            >
              <Download size="0.8125rem" />
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={importMemories.isPending}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-40"
              title="Import memories"
              aria-label="Import memories"
            >
              <Upload size="0.8125rem" />
            </button>
            <button
              type="button"
              onClick={() => refreshMemories.mutate()}
              disabled={memoriesQuery.isFetching || refreshMemories.isPending || importMemories.isPending}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-50"
              title="Rebuild memories from current chat messages"
            >
              <RefreshCw
                size="0.8125rem"
                className={cn((memoriesQuery.isFetching || refreshMemories.isPending) && "animate-spin")}
              />
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={memories.length === 0 || clearMemories.isPending}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--destructive)]/15 hover:text-[var(--destructive)] disabled:opacity-40"
              title="Clear all memories"
            >
              <Trash2 size="0.8125rem" />
            </button>
          </div>
        </div>

        {memoriesQuery.isLoading && (
          <div className="rounded-xl bg-[var(--secondary)]/60 px-4 py-8 text-center text-xs text-[var(--muted-foreground)]">
            Loading memories...
          </div>
        )}

        {memoriesQuery.error && (
          <div className="rounded-xl bg-[var(--destructive)]/10 px-4 py-3 text-xs text-[var(--destructive)] ring-1 ring-[var(--destructive)]/25">
            Failed to load memories.
          </div>
        )}

        {!memoriesQuery.isLoading && !memoriesQuery.error && memories.length === 0 && (
          <div className="rounded-xl bg-[var(--secondary)]/60 px-4 py-8 text-center text-xs text-[var(--muted-foreground)]">
            No recall memories have been created for this chat yet. Marinara creates them after generation in groups of
            5 messages.
          </div>
        )}

        {memories.length > 0 && (
          <div className="space-y-2">
            {memories.map((memory) => (
              <article key={memory.id} className="rounded-xl bg-[var(--card)] px-3 py-3 ring-1 ring-[var(--border)]">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0 text-[0.625rem] text-[var(--muted-foreground)]">
                    <div className="font-medium text-[var(--foreground)]">
                      {formatMemoryDate(memory.firstMessageAt)} - {formatMemoryDate(memory.lastMessageAt)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                      <span>{memory.messageCount} messages</span>
                      <span>
                        {memory.hasEmbedding
                          ? "Vectorized"
                          : memory.embeddingStatus === "unavailable"
                            ? "Embedding unavailable"
                            : "Waiting for vector"}
                      </span>
                      <span>Created {formatMemoryDate(memory.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(memory)}
                    disabled={deleteMemory.isPending}
                    className="shrink-0 rounded-lg p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--destructive)]/15 hover:text-[var(--destructive)] disabled:opacity-40"
                    title="Forget this memory"
                  >
                    <Trash2 size="0.75rem" />
                  </button>
                </div>
                <pre className={MEMORY_CONTENT_CLASS}>{memory.content}</pre>
              </article>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
