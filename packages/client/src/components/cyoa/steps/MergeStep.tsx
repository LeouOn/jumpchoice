import { useMergeCyoa, useCyoaDocument } from "@/hooks/use-cyoa";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { Merge, Loader2, Tag, Hash, Coins } from "lucide-react";
import { useTranslation as useUiTranslation } from "react-i18next";

interface MergeStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

export function MergeStep({ document, documentId }: MergeStepProps) {
  const { t: localizeUi } = useUiTranslation();
  const merge = useMergeCyoa();
  const { data: freshDoc } = useCyoaDocument(documentId);
  const doc = freshDoc ?? document;

  const merged = doc?.mergedDocument as Record<string, unknown> | null;
  const choices = doc?.choices ?? [];
  const isMerged = doc?.status === "merged" || doc?.status === "analyzed";

  const categories = [...new Set(choices.map((c) => c.category).filter(Boolean))];
  const title = (merged?.title as string) ?? doc?.name ?? "Untitled";

  return (
    <div className="flex flex-col gap-4">
      {!isMerged && (
        <button
          onClick={() => merge.mutate({ documentId })}
          disabled={merge.isPending}
          className="flex items-center justify-center gap-2 self-start rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {merge.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4" />}{localizeUi("ui.cyoa.mergestep.mergeExtractions")}</button>
      )}

      {merge.isError && (
        <p className="text-xs text-red-400">{localizeUi("ui.cyoa.mergestep.mergeFailed")} {(merge.error as Error)?.message ?? "Unknown error"}
        </p>
      )}

      {isMerged && (
        <>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
            {merged?.description != null && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {String(merged.description)}
              </p>
            )}
            <div className="mt-3 flex gap-4">
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <Hash className="h-3.5 w-3.5" />
                {choices.length} {localizeUi("ui.cyoa.mergestep.choices")}</div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <Tag className="h-3.5 w-3.5" />
                {categories.length} {localizeUi("ui.cyoa.mergestep.categories")}</div>
              {merged?.pointBudget != null && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                  <Coins className="h-3.5 w-3.5" />
                  {String(merged.pointBudget)} {localizeUi("ui.cyoa.mergestep.pointBudget")}</div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.mergestep.mergedChoices")}</h3>
            {choices.map((choice) => (
              <div
                key={choice.id}
                className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
              >
                <span className="text-sm text-[var(--foreground)]">{choice.name}</span>
                {choice.pointCost != null && (
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    {choice.pointCost} {localizeUi("ui.cyoa.buildsummary.pts")}</span>
                )}
                {choice.category && (
                  <span className="ml-auto rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                    {choice.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
