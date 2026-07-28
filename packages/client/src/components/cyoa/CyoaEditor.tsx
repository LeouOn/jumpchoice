import { useState } from "react";
import { useUIStore } from "@/stores/ui.store";
import { useCyoaDocument } from "@/hooks/use-cyoa";
import { ArrowLeft, Loader2 } from "lucide-react";
import { UploadStep } from "./steps/UploadStep";
import { ExtractStep } from "./steps/ExtractStep";
import { ReviewStep } from "./steps/ReviewStep";
import { MergeStep } from "./steps/MergeStep";
import { AnalyzeStep } from "./steps/AnalyzeStep";
import { BuildPlannerModal } from "./BuildPlannerModal";
import { useTranslation as useUiTranslation } from "react-i18next";

const STEPS = [
  { id: "upload", label: "Upload", allowedStatuses: ["pending_extraction"] },
  { id: "extract", label: "Extract", allowedStatuses: ["pending_extraction"] },
  { id: "review", label: "Review", allowedStatuses: ["pending_review"] },
  { id: "merge", label: "Merge", allowedStatuses: ["reviewed"] },
  { id: "analyze", label: "Analyze", allowedStatuses: ["merged", "analyzed"] },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function getDefaultStep(status: string): StepId {
  if (status === "pending_extraction") return "upload";
  if (status === "pending_review") return "review";
  if (status === "reviewed") return "merge";
  return "analyze";
}

function isStepAllowed(status: string, stepId: StepId): boolean {
  const step = STEPS.find((s) => s.id === stepId);
  return step ? (step.allowedStatuses as readonly string[]).includes(status) : false;
}

export function CyoaEditor() {
  const { t: localizeUi } = useUiTranslation();
  const documentId = useUIStore((s) => s.cyoaDetailId);
  const closeDetail = useUIStore((s) => s.closeCyoa);
  const { data: document, isLoading } = useCyoaDocument(documentId);
  const [showBuildPlanner, setShowBuildPlanner] = useState(false);

  const status = document?.status ?? "pending_extraction";
  const defaultStep = getDefaultStep(status);
  const [activeStep, setActiveStep] = useState<StepId>(defaultStep);

  // Sync to new status when document status changes (e.g. extraction → review)
  const currentDefault = getDefaultStep(status);
  const effectiveStep = isStepAllowed(status, activeStep) ? activeStep : currentDefault;
  if (effectiveStep !== activeStep) {
    setActiveStep(effectiveStep);
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === effectiveStep);

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
        {(document?.status === "merged" || document?.status === "analyzed") && (
          <button
            onClick={() => setShowBuildPlanner(true)}
            className="ml-auto rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >{localizeUi("ui.cyoa.cyoaeditor.buildPlanner")}</button>
        )}
      </div>

      {/* Interactive step bar — clickable when step is allowed */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] px-4 py-2">
        {STEPS.map((step, i) => {
          const allowed = isStepAllowed(status, step.id);
          const isCurrent = i === currentStepIndex;
          const isPast = i < currentStepIndex;
          return (
            <button
              key={step.id}
              onClick={() => {
                if (allowed) setActiveStep(step.id);
              }}
              disabled={!allowed}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                isCurrent
                  ? "bg-[var(--accent)] text-[var(--foreground)]"
                  : allowed
                    ? "text-[var(--muted-foreground)] hover:bg-[var(--accent)]/50 hover:text-[var(--foreground)] cursor-pointer"
                    : "cursor-not-allowed text-[var(--muted-foreground)] opacity-40"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  isPast
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isCurrent
                      ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }`}
              >
                {i + 1}
              </span>
              {step.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : effectiveStep === "upload" ? (
          <UploadStep document={document} documentId={documentId!} />
        ) : effectiveStep === "extract" ? (
          <ExtractStep document={document} documentId={documentId!} />
        ) : effectiveStep === "review" ? (
          <ReviewStep document={document} documentId={documentId!} />
        ) : effectiveStep === "merge" ? (
          <MergeStep document={document} documentId={documentId!} />
        ) : (
          <AnalyzeStep document={document} documentId={documentId!} />
        )}
      </div>
      {showBuildPlanner && document && (
        <BuildPlannerModal
          document={document}
          choices={document.choices}
          onClose={() => setShowBuildPlanner(false)}
        />
      )}
    </div>
  );
}
