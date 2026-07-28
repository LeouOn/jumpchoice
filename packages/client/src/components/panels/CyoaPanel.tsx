import { useUIStore } from "@/stores/ui.store";
import { useCyoaDocuments, useDeleteCyoaDocument } from "@/hooks/use-cyoa";
import { Trash2, ImageIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation as useUiTranslation } from "react-i18next";

const STATUS_LABELS: Record<string, string> = {
  pending_extraction: "Pending",
  pending_review: "Review",
  reviewed: "Reviewed",
  merged: "Merged",
  analyzed: "Analyzed",
};

const STATUS_COLORS: Record<string, string> = {
  pending_extraction: "bg-yellow-500/20 text-yellow-400",
  pending_review: "bg-blue-500/20 text-blue-400",
  reviewed: "bg-indigo-500/20 text-indigo-400",
  merged: "bg-purple-500/20 text-purple-400",
  analyzed: "bg-emerald-500/20 text-emerald-400",
};

export function CyoaPanel() {
  const { t: localizeUi } = useUiTranslation();
  const openCyoa = useUIStore((s) => s.openCyoa);
  const { data: documents, isLoading } = useCyoaDocuments();
  const deleteDoc = useDeleteCyoaDocument();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      deleteDoc.mutate(id, { onSuccess: () => setConfirmDeleteId(null) });
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="px-1 text-xs text-[var(--muted-foreground)]">{localizeUi("ui.panels.cyoapanel.uploadCyoaJumpchainImagesToExtractAndAnalyzeChoices")}</p>

      {!documents?.length && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--border)] py-10 text-center">
          <ImageIcon className="h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="text-sm text-[var(--muted-foreground)]">{localizeUi("ui.panels.cyoapanel.noCyoaDocumentsYet")}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{localizeUi("ui.panels.cyoapanel.openADocumentOrCreateOneInTheEditor")}</p>
        </div>
      )}

      {documents?.map((doc) => (
        <button
          key={doc.id}
          onClick={() => openCyoa(doc.id)}
          className="group flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--accent)]"
        >
          <ImageIcon className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{doc.name}</p>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[doc.status] ?? "bg-gray-500/20 text-gray-400"}`}
              >
                {STATUS_LABELS[doc.status] ?? doc.status}
              </span>
              {doc.choiceCount > 0 && (
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  {doc.choiceCount} {localizeUi("ui.panels.cyoapanel.choices")}</span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(doc.id);
            }}
            className="shrink-0 rounded p-1 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </button>
      ))}
    </div>
  );
}
