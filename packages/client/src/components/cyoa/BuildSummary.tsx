import { useState, useCallback, useRef } from "react";
import type { CyoaChoice, CyoaDocument } from "@/hooks/use-cyoa";
import type { CyoaBuild } from "@/hooks/use-cyoa-builds";
import { useUpdateCyoaBuild } from "@/hooks/use-cyoa-builds";
import { Trash2, AlertTriangle, Zap } from "lucide-react";
import { useTranslation as useUiTranslation } from "react-i18next";

interface SynergyPair {
  choiceIds: string[];
  description: string;
  combinedValue: "high" | "medium" | "low";
}

interface BuildSummaryProps {
  build: CyoaBuild;
  document: CyoaDocument;
  choices: CyoaChoice[];
  onRemoveChoice: (id: string) => void;
}

export function BuildSummary({ build, document, choices, onRemoveChoice }: BuildSummaryProps) {
  const { t: localizeUi } = useUiTranslation();
  const updateBuild = useUpdateCyoaBuild(document.id);
  const [localNotes, setLocalNotes] = useState(build.notes);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selectedChoices = choices.filter((c) => build.selectedChoiceIds.includes(c.id));
  const totalCost = selectedChoices.reduce((sum, c) => sum + (c.pointCost ?? 0), 0);
  const budget = document.pointBudget;

  const overBudget = budget != null && totalCost > budget;

  const rawAnalysis = document.analysis as { topSynergies?: SynergyPair[] } | null;
  const synergies = rawAnalysis?.topSynergies ?? [];
  const activeSynergies = synergies.filter((syn) =>
    syn.choiceIds.every((id) => build.selectedChoiceIds.includes(id)),
  );

  const handleNotesChange = useCallback(
    (value: string) => {
      setLocalNotes(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateBuild.mutate({ id: build.id, notes: value });
      }, 500);
    },
    [updateBuild, build.id],
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.buildsummary.pointBudget")}</h3>
          {overBudget && (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <AlertTriangle className="h-3 w-3" /> {localizeUi("ui.cyoa.buildsummary.overBudget")}</span>
          )}
        </div>
        <div className="mt-1.5">
          {budget != null ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-[var(--foreground)]">{totalCost}</span>
                <span className="text-xs text-[var(--muted-foreground)]">/ {budget} {localizeUi("ui.cyoa.buildsummary.pointsSpent")}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div
                  className={`h-full rounded-full transition-all ${
                    overBudget ? "bg-red-500" : totalCost > (budget ?? 0) * 0.8 ? "bg-amber-500" : "bg-[var(--primary)]"
                  }`}
                  style={{ width: `${Math.min((totalCost / budget) * 100, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">
              {totalCost} {localizeUi("ui.cyoa.buildsummary.pointsSpentNoBudgetSet")}</p>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        <h3 className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.buildsummary.selected")}{selectedChoices.length})
        </h3>
        {selectedChoices.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
          >
            <span className="text-xs text-[var(--foreground)]">{c.name}</span>
            {c.pointCost != null && (
              <span className="text-[10px] text-[var(--muted-foreground)]">{c.pointCost} {localizeUi("ui.cyoa.buildsummary.pts")}</span>
            )}
            <button
              onClick={() => onRemoveChoice(c.id)}
              className="ml-auto rounded p-0.5 text-[var(--muted-foreground)] hover:bg-red-500/20 hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {selectedChoices.length === 0 && (
          <p className="py-4 text-center text-xs text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.buildsummary.selectChoicesFromTheCatalog")}</p>
        )}
      </div>

      {activeSynergies.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="flex items-center gap-1 text-xs font-medium text-[var(--muted-foreground)]">
            <Zap className="h-3 w-3" /> {localizeUi("ui.cyoa.buildsummary.activeSynergies")}</h3>
          {activeSynergies.map((syn, i) => (
            <div key={i} className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
              <p className="text-xs text-[var(--foreground)]">{syn.description}</p>
              <span className="text-[10px] text-emerald-400">{localizeUi("ui.cyoa.buildsummary.value")} {syn.combinedValue}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.buildsummary.notes")}</label>
        <textarea
          value={localNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          className="h-20 resize-none rounded-md border border-[var(--border)] bg-[var(--input)] p-2 text-xs text-[var(--foreground)]"
          placeholder={localizeUi("ui.cyoa.buildsummary.buildNotes")}
        />
      </div>
    </div>
  );
}
