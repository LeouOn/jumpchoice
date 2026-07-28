import { useState } from "react";
import { useCyoaDocument, useExtractCyoa } from "@/hooks/use-cyoa";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { Loader2, CheckCircle2, XCircle, Zap, AlertTriangle } from "lucide-react";
import { useConnections } from "@/hooks/use-connections";
import { useTranslation as useUiTranslation } from "react-i18next";

interface ExtractStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

export function ExtractStep({ document, documentId }: ExtractStepProps) {
  const { t: localizeUi } = useUiTranslation();
  const [connectionId, setConnectionId] = useState("");
  const extract = useExtractCyoa();
  const { data: connections } = useConnections();
  const typedConnections = (connections ?? []) as { id: string; name: string; provider: string }[];

  // Poll the document every 2s during extraction to pick up per-image progress
  const isExtracting = extract.isPending;
  const { data: freshDoc } = useCyoaDocument(documentId, { refetchInterval: isExtracting ? 2000 : false });
  const doc = freshDoc ?? document;

  const images = doc?.images ?? [];
  const progress = doc?.extractionProgress;

  // Count completed images from the polling data (more granular than just isPending)
  const completedCount = images.filter((img) => img.extractions !== null).length;
  const totalCount = progress?.total ?? images.length;

  const handleExtract = () => {
    if (!connectionId) return;
    extract.mutate({ documentId, connectionId });
  };

  const allExtracted = !isExtracting && images.length > 0 && completedCount === images.length;

  const noConnections = typedConnections.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.extractstep.selectLlmConnection")}</label>
        {noConnections ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <div className="text-xs text-amber-400">
              <p className="font-medium">{localizeUi("ui.cyoa.extractstep.noApiConnectionsConfigured")}</p>
              <p className="mt-0.5">{localizeUi("ui.cyoa.extractstep.youNeedAtLeastOneLlmConnectionWithVision")}{" "}{localizeUi("ui.cyoa.extractstep.addOneInTheConnectionsPanelThenComeBack")}</p>
            </div>
          </div>
        ) : (
          <select
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]"
            disabled={isExtracting}
          >
            <option value="">{localizeUi("ui.cyoa.startcampaignmodal.chooseAConnection")}</option>
            {typedConnections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name} ({conn.provider})
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        onClick={handleExtract}
        disabled={!connectionId || isExtracting || allExtracted}
        className="flex items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isExtracting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />{localizeUi("ui.cyoa.extractstep.extracting")}{completedCount}/{totalCount} {localizeUi("ui.cyoa.extractstep.pages")}</>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            {allExtracted ?localizeUi("ui.cyoa.extractstep.extractionComplete") :localizeUi("ui.cyoa.extractstep.startExtraction")}
          </>
        )}
      </button>

      {/* Progress bar during extraction */}
      {isExtracting && totalCount > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
            <span>{localizeUi("ui.cyoa.extractstep.processingPage")} {Math.min(completedCount + 1, totalCount)} {localizeUi("ui.noodle.noodlehome.of")} {totalCount}</span>
            <span>{Math.round((completedCount / totalCount) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.extractstep.imageProgress")}{completedCount}/{images.length})
          </h3>
          <div className="flex flex-col gap-1.5">
            {images
              .sort((a, b) => a.pageNumber - b.pageNumber)
              .map((img) => {
                const done = img.extractions !== null;
                const isProcessing = isExtracting && !done;
                const isPending = !isExtracting && !done;
                const extraction = img.extractions as { warnings?: string[]; title?: string; choices?: unknown[] } | null;
                const warnings = extraction?.warnings ?? [];
                const hasWarnings = warnings.length > 0;
                const choiceCount = extraction?.choices?.length ?? 0;

                return (
                  <div
                    key={img.id}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
                      isProcessing
                        ? "border-[var(--primary)]/30 bg-[var(--accent)]/50"
                        : done
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-[var(--border)] bg-[var(--card)]"
                    }`}
                  >
                    {done ? (
                      hasWarnings ? (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      )
                    ) : isProcessing ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-[var(--foreground)]">{localizeUi("ui.botBrowser.botbrowserview.page")} {img.pageNumber}</span>
                      {done && extraction?.title && (
                        <span className="ml-2 text-[10px] text-[var(--muted-foreground)]">
                          — {extraction.title}
                        </span>
                      )}
                      {done && choiceCount > 0 && (
                        <span className="ml-1 text-[10px] text-[var(--muted-foreground)]">
                          · {choiceCount} {localizeUi("ui.cyoa.analyzestep.choice")}{choiceCount !== 1 ?localizeUi("ui.noodle.stageprofileview.s") : ""}
                        </span>
                      )}
                      {hasWarnings && (
                        <p className="mt-0.5 text-[10px] text-amber-400 leading-tight">
                          {warnings[0]}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {img.extractionMethod && (
                        <span className="rounded bg-[var(--muted)]/50 px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                          {img.extractionMethod}
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[10px] text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.extractstep.waiting")}</span>
                      )}
                      {isProcessing && (
                        <span className="text-[10px] text-[var(--primary)] animate-pulse">{localizeUi("ui.cyoa.extractstep.processing")}</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
