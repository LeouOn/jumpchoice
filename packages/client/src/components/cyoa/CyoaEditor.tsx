import { useUIStore } from "@/stores/ui.store";
import { useCyoaDocument } from "@/hooks/use-cyoa";
import { ArrowLeft, Loader2 } from "lucide-react";
import { UploadStep } from "./steps/UploadStep";
import { ExtractStep } from "./steps/ExtractStep";
import { ReviewStep } from "./steps/ReviewStep";
import { MergeStep } from "./steps/MergeStep";
import { AnalyzeStep } from "./steps/AnalyzeStep";

const STEPS = [
  { id: "upload", label: "Upload", statusRequired: "pending_extraction" },
  { id: "extract", label: "Extract", statusRequired: "pending_extraction" },
  { id: "review", label: "Review", statusRequired: "pending_review" },
  { id: "merge", label: "Merge", statusRequired: "reviewed" },
  { id: "analyze", label: "Analyze", statusRequired: "merged" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const STATUS_STEP_MAP: Record<string, StepId> = {
  pending_extraction: "upload",
  pending_review: "review",
  reviewed: "merge",
  merged: "analyze",
  analyzed: "analyze",
};

export function CyoaEditor() {
  const documentId = useUIStore((s) => s.cyoaDetailId);
  const closeDetail = useUIStore((s) => s.closeCyoa);
  const { data: document, isLoading } = useCyoaDocument(documentId);

  const status = document?.status ?? "pending_extraction";
  const activeStep = STATUS_STEP_MAP[status] ?? "upload";
  const currentStepIndex = STEPS.findIndex((s) => s.id === activeStep);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <button
          onClick={closeDetail}
          className="rounded p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-sm font-semibold text-[var(--foreground)]">
          {document?.name ?? "CYOA Document"}
        </h1>
        {document && (
          <span className="rounded bg-[var(--muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
            {status}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-[var(--border)] px-4 py-2">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentStepIndex;
          const isCurrent = i === currentStepIndex;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                isCurrent
                  ? "bg-[var(--accent)] text-[var(--foreground)]"
                  : isCompleted
                    ? "text-[var(--muted-foreground)]"
                    : "text-[var(--muted-foreground)] opacity-50"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  isCompleted
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isCurrent
                      ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }`}
              >
                {i + 1}
              </span>
              {step.label}
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : activeStep === "upload" ? (
          <UploadStep document={document} documentId={documentId!} />
        ) : activeStep === "extract" ? (
          <ExtractStep document={document} documentId={documentId!} />
        ) : activeStep === "review" ? (
          <ReviewStep document={document} documentId={documentId!} />
        ) : activeStep === "merge" ? (
          <MergeStep document={document} documentId={documentId!} />
        ) : (
          <AnalyzeStep document={document} documentId={documentId!} />
        )}
      </div>
    </div>
  );
}
