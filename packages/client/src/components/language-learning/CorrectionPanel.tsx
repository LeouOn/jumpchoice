// ──────────────────────────────────────────────
// Language Learning: Correction Panel
// ──────────────────────────────────────────────
import { useState, useMemo } from "react";
import { Loader2, AlertTriangle, X, Filter } from "lucide-react";
import { useChatStore } from "../../stores/chat.store";
import { useCorrections, useDismissCorrection } from "../../hooks/use-learning";
import { cn } from "../../lib/utils";
import type { Correction, CorrectionSeverity } from "@jumpchoice/shared";
import { useTranslation as useUiTranslation } from "react-i18next";

export function CorrectionPanel() {
  const { t: localizeUi } = useUiTranslation();
  const activeChatId = useChatStore((s) => s.activeChatId);
  const [severityFilter, setSeverityFilter] = useState<CorrectionSeverity | "all">("all");
  const { data: corrections, isLoading } = useCorrections(activeChatId ?? "");
  const dismissMutation = useDismissCorrection();

  const grouped = useMemo(() => {
    if (!corrections) return [];
    const filtered = corrections.filter((c) => !c.dismissed);
    const byMessage = new Map<string, Correction[]>();
    for (const c of filtered) {
      const key = c.messageId ?? "__no_message__";
      const list = byMessage.get(key) ?? [];
      list.push(c);
      byMessage.set(key, list);
    }
    return [...byMessage.values()];
  }, [corrections]);

  const filteredGroups = useMemo(() => {
    if (severityFilter === "all") return grouped;
    return grouped
      .map((group) => group.filter((c) => c.severity === severityFilter))
      .filter((group) => group.length > 0);
  }, [grouped, severityFilter]);

  if (!activeChatId) return null;

  return (
    <div className="flex flex-col border-b border-[var(--border)]">
      {/* Header with filter */}
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-xs font-semibold text-[var(--foreground)]">{localizeUi("ui.languageLearning.correctionpanel.corrections")}</h3>
        <div className="flex items-center gap-1">
          <Filter size="0.75rem" className="text-[var(--muted-foreground)]" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as CorrectionSeverity | "all")}
            className="rounded bg-[var(--card)] px-1.5 py-0.5 text-xs text-[var(--foreground)] ring-1 ring-[var(--border)]"
          >
            <option value="all">{localizeUi("ui.chat.chatsettingsdrawer.spriteLayoutAll")}</option>
            <option value="minor">{localizeUi("ui.languageLearning.correctionpanel.minor")}</option>
            <option value="major">{localizeUi("ui.languageLearning.correctionpanel.major")}</option>
          </select>
        </div>
      </div>

      {/* Corrections list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-6 text-[var(--muted-foreground)]">
            <Loader2 size="1rem" className="animate-spin mr-2" />{localizeUi("ui.languageLearning.correctionpanel.loadingCorrections")}</div>
        )}
        {!isLoading && filteredGroups.length === 0 && (
          <div className="py-6 text-center text-xs text-[var(--muted-foreground)]">{localizeUi("ui.languageLearning.correctionpanel.noCorrectionsYetKeepChatting")}</div>
        )}
        {filteredGroups.map((group) =>
          group.map((correction) => (
            <CorrectionCard
              key={correction.id}
              correction={correction}
              onDismiss={() => dismissMutation.mutate(correction.id)}
            />
          )),
        )}
      </div>
    </div>
  );
}

function CorrectionCard({
  correction,
  onDismiss,
}: {
  correction: Correction;
  onDismiss: () => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  return (
    <div
      className={cn(
        "rounded-lg bg-[var(--card)] p-2.5 ring-1 ring-[var(--border)]",
        correction.severity === "major" && "ring-amber-500/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Severity badge */}
          <span
            className={cn(
              "inline-block rounded px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider",
              correction.severity === "major"
                ? "bg-amber-500/10 text-amber-500"
                : "bg-[var(--accent)] text-[var(--muted-foreground)]",
            )}
          >
            {correction.severity === "major" ? (
              <span className="inline-flex items-center gap-0.5">
                <AlertTriangle size="0.5rem" /> {localizeUi("ui.languageLearning.correctionpanel.major")}</span>
            ) : (localizeUi("ui.languageLearning.correctionpanel.minor")
            )}
          </span>

          {/* Original → Corrected */}
          <div className="mt-1.5 space-y-0.5">
            <div className="text-xs text-red-400 line-through">{correction.original}</div>
            <div className="text-xs text-emerald-400">{correction.corrected}</div>
          </div>

          {/* Explanation */}
          {correction.explanation && (
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">{correction.explanation}</div>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="shrink-0 rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] active:scale-90"
          title={localizeUi("ui.chat.slashcommandfeedback.dismiss")}
        >
          <X size="0.75rem" />
        </button>
      </div>
    </div>
  );
}
