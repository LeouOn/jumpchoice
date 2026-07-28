import { useState, useMemo } from "react";
import type { CyoaChoice } from "@/hooks/use-cyoa";
import { Search } from "lucide-react";
import { useTranslation as useUiTranslation } from "react-i18next";

const TIER_COLORS: Record<string, string> = {
  S: "bg-amber-500/20 text-amber-300",
  A: "bg-emerald-500/20 text-emerald-300",
  B: "bg-blue-500/20 text-blue-300",
  C: "bg-purple-500/20 text-purple-300",
  D: "bg-gray-500/20 text-gray-300",
  F: "bg-red-500/20 text-red-300",
};

interface ChoiceCatalogProps {
  choices: CyoaChoice[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export function ChoiceCatalog({ choices, selectedIds, onToggle }: ChoiceCatalogProps) {
  const { t: localizeUi } = useUiTranslation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => ["all", ...new Set(choices.map((c) => c.category).filter(Boolean) as string[])],
    [choices],
  );

  const filtered = useMemo(() => {
    return choices.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [choices, search, category]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder={localizeUi("ui.cyoa.choicecatalog.searchChoices")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] py-2 pl-8 pr-3 text-xs text-[var(--foreground)]"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-2 text-xs text-[var(--foreground)]"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "all" ?localizeUi("ui.cyoa.choicecatalog.allCategories") : cat}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {filtered.map((choice) => {
          const isSelected = selectedIds.has(choice.id);
          return (
            <button
              key={choice.id}
              onClick={() => onToggle(choice.id)}
              className={`flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
                isSelected
                  ? "border-[var(--primary)] bg-[var(--primary)]/10"
                  : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)]"
              }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border)]"
                }`}
              >
                {isSelected && <span className="text-[10px]">&#10003;</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--foreground)]">{choice.name}</span>
                  {choice.tier && (
                    <span
                      className={`rounded px-1 py-0.5 text-[9px] font-bold ${TIER_COLORS[choice.tier] ?? ""}`}
                    >
                      {choice.tier}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  {choice.pointCost != null && (
                    <span className="text-[10px] text-[var(--muted-foreground)]">{choice.pointCost} {localizeUi("ui.cyoa.buildsummary.pts")}</span>
                  )}
                  {choice.category && (
                    <span className="text-[10px] text-[var(--muted-foreground)]">{choice.category}</span>
                  )}
                </div>
                {Array.isArray(choice.prerequisites) && choice.prerequisites.length > 0 && (
                  <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)] italic">{localizeUi("ui.cyoa.choicecatalog.requires")} {choice.prerequisites.join(", ")}
                  </p>
                )}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-4 text-center text-xs text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.choicecatalog.noChoicesMatchYourFilters")}</p>
        )}
      </div>
    </div>
  );
}
