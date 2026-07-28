import { useState } from "react";
import { useAnalyzeCyoa, useCyoaDocument } from "@/hooks/use-cyoa";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { useConnections } from "@/hooks/use-connections";
import { Loader2, BarChart3, Table, Crown, Swords, Target } from "lucide-react";
import { useTranslation as useUiTranslation } from "react-i18next";

interface AnalyzeStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

interface ChoiceAnalysis {
  tier: string;
  costEfficiency: number;
  synergies: string[];
  analysis: string;
}

interface SynergyPair {
  choiceIds: string[];
  description: string;
  combinedValue: "high" | "medium" | "low";
}

interface BuildArchetype {
  name: string;
  description: string;
  choiceIds: string[];
  totalCost: number;
  strengths: string[];
  weaknesses: string[];
}

interface Analysis {
  tierList: Record<string, ChoiceAnalysis[]>;
  categorySummaries: Record<string, string>;
  topSynergies: SynergyPair[];
  buildArchetypes: BuildArchetype[];
  overallSummary: string;
}

const TIER_COLORS: Record<string, string> = {
  S: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  A: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
  B: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  C: "bg-purple-500/20 border-purple-500/40 text-purple-300",
  D: "bg-gray-500/20 border-gray-500/40 text-gray-300",
  F: "bg-red-500/20 border-red-500/40 text-red-300",
};

const TIER_ORDER = ["S", "A", "B", "C", "D", "F"];
const TIER_INDEX: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };

export function AnalyzeStep({ document, documentId }: AnalyzeStepProps) {
  const { t: localizeUi } = useUiTranslation();
  const [connectionId, setConnectionId] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [sortKey, setSortKey] = useState<"name" | "tier" | "cost" | "efficiency">("tier");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterTier, setFilterTier] = useState<string>("all");

  const analyze = useAnalyzeCyoa();
  const { data: connections } = useConnections();
  const typedConnections = (connections ?? []) as { id: string; name: string; provider: string }[];
  const { data: freshDoc } = useCyoaDocument(documentId);
  const doc = freshDoc ?? document;

  const choices = doc?.choices ?? [];
  const rawAnalysis = doc?.analysis as Analysis | null;
  const isAnalyzed = doc?.status === "analyzed";

  const analysis = rawAnalysis;
  const tierList = analysis?.tierList ?? {};
  const synergies = analysis?.topSynergies ?? [];
  const builds = analysis?.buildArchetypes ?? [];

  const choiceMap = new Map(choices.map((c) => [c.id, c]));

  const handleAnalyze = () => {
    if (!connectionId) return;
    analyze.mutate({ documentId, connectionId });
  };

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortedChoices = [...choices]
    .filter((c) => filterTier === "all" || c.tier === filterTier)
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return dir * a.name.localeCompare(b.name);
      if (sortKey === "tier") return dir * ((TIER_INDEX[a.tier ?? "F"] ?? 5) - (TIER_INDEX[b.tier ?? "F"] ?? 5));
      if (sortKey === "cost") return dir * ((a.pointCost ?? 0) - (b.pointCost ?? 0));
      return dir * ((a.costEfficiency ?? 0) - (b.costEfficiency ?? 0));
    });

  return (
    <div className="flex flex-col gap-4">
      {!isAnalyzed && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.analyzestep.selectLlmConnectionForAnalysis")}</label>
          <div className="flex gap-2">
            <select
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]"
              disabled={analyze.isPending}
            >
              <option value="">{localizeUi("ui.cyoa.startcampaignmodal.chooseAConnection")}</option>
              {typedConnections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.name} ({conn.provider})
                </option>
              ))}
            </select>
            <button
              onClick={handleAnalyze}
              disabled={!connectionId || analyze.isPending}
              className="flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}{localizeUi("ui.cyoa.analyzestep.analyze")}</button>
          </div>
        </div>
      )}

      {analyze.isPending && (
        <div className="flex flex-col items-center gap-2 py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.analyzestep.runningLlmAnalysis")}</p>
        </div>
      )}

      {isAnalyzed && analysis && (
        <>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-sm text-[var(--foreground)]">{analysis.overallSummary}</p>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.analyzestep.tierList")}</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode("cards")}
                className={`rounded p-1.5 ${viewMode === "cards" ? "bg-[var(--accent)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}
              >
                <Crown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded p-1.5 ${viewMode === "table" ? "bg-[var(--accent)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}
              >
                <Table className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {viewMode === "cards" ? (
            <div className="flex flex-col gap-3">
              {TIER_ORDER.filter((t) => tierList[t]?.length).map((tier) => {
                const tierChoices = tierList[tier] ?? [];
                return (
                  <div key={tier}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${TIER_COLORS[tier] ?? "bg-gray-500/20 text-gray-300"}`}
                      >
                        {tier}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {tierChoices.length} {localizeUi("ui.cyoa.analyzestep.choice")}{tierChoices.length !== 1 ?localizeUi("ui.noodle.stageprofileview.s") : ""}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {tierChoices.map((ca: ChoiceAnalysis & { choiceId?: string }, idx: number) => {
                        const id = (ca as unknown as Record<string, unknown>).choiceId as string | undefined;
                        const ch = id ? choiceMap.get(id) : choices.find((c) => c.tier === tier);
                        return (
                          <div
                            key={id ?? idx}
                            className={`rounded-md border p-2 ${TIER_COLORS[tier] ?? "border-[var(--border)] bg-[var(--card)]"}`}
                          >
                            <p className="text-xs font-medium">{ch?.name ?? "Unknown"}</p>
                            <div className="mt-1 flex items-center gap-2">
                              {ch?.pointCost != null && (
                                <span className="text-[10px] opacity-70">{ch.pointCost} {localizeUi("ui.cyoa.buildsummary.pts")}</span>
                              )}
                              <span className="text-[10px] opacity-70">{localizeUi("ui.cyoa.analyzestep.eff")} {ca.costEfficiency}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1 text-xs text-[var(--foreground)]"
                >
                  <option value="all">{localizeUi("ui.cyoa.analyzestep.allTiers")}</option>
                  {TIER_ORDER.map((t) => (
                    <option key={t} value={t}>{localizeUi("ui.cyoa.analyzestep.tier")} {t}</option>
                  ))}
                </select>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                    <th className="cursor-pointer px-2 py-1.5 text-left" onClick={() => toggleSort("name")}>{localizeUi("settings.customGenerationParameters.name")}</th>
                    <th className="cursor-pointer px-2 py-1.5 text-left" onClick={() => toggleSort("tier")}>{localizeUi("ui.cyoa.analyzestep.tier")}</th>
                    <th className="cursor-pointer px-2 py-1.5 text-right" onClick={() => toggleSort("cost")}>{localizeUi("ui.cyoa.analyzestep.cost")}</th>
                    <th className="cursor-pointer px-2 py-1.5 text-right" onClick={() => toggleSort("efficiency")}>{localizeUi("ui.cyoa.analyzestep.efficiency")}</th>
                    <th className="px-2 py-1.5 text-left">{localizeUi("ui.lorebooks.lorebookeditor.category")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedChoices.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--border)]">
                      <td className="px-2 py-1.5 text-[var(--foreground)]">{c.name}</td>
                      <td className="px-2 py-1.5">
                        {c.tier && (
                          <span className={`inline-block rounded px-1 py-0.5 text-[10px] font-bold ${TIER_COLORS[c.tier] ?? ""}`}>
                            {c.tier}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right text-[var(--foreground)]">{c.pointCost ?? "—"}</td>
                      <td className="px-2 py-1.5 text-right text-[var(--foreground)]">{c.costEfficiency ?? "—"}</td>
                      <td className="px-2 py-1.5 text-[var(--muted-foreground)]">{c.category ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {synergies.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                <Swords className="h-3.5 w-3.5" /> {localizeUi("ui.cyoa.analyzestep.topSynergies")}</h3>
              {synergies.map((syn, i) => (
                <div
                  key={i}
                  className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3"
                >
                  <p className="text-sm text-[var(--foreground)]">{syn.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.buildsummary.value")} {syn.combinedValue}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {syn.choiceIds.map((id) => choiceMap.get(id)?.name ?? id).join(" + ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {builds.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                <Target className="h-3.5 w-3.5" /> {localizeUi("ui.cyoa.analyzestep.buildArchetypes")}</h3>
              {builds.map((build, i) => (
                <div
                  key={i}
                  className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--foreground)]">{build.name}</p>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {build.totalCost} {localizeUi("ui.cyoa.buildsummary.pts")}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{build.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {build.choiceIds.map((id) => (
                      <span
                        key={id}
                        className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]"
                      >
                        {choiceMap.get(id)?.name ?? id}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-3">
                    <div className="text-[10px] text-emerald-400">{localizeUi("ui.cyoa.analyzestep.strengths")} {build.strengths.join(", ")}
                    </div>
                    <div className="text-[10px] text-red-400">{localizeUi("ui.cyoa.analyzestep.weaknesses")} {build.weaknesses.join(", ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
