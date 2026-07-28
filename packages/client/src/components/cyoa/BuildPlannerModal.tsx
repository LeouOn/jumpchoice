import { useState, useCallback, useRef } from "react";
import type { CyoaDocument, CyoaChoice } from "@/hooks/use-cyoa";
import {
  useCyoaBuilds,
  useCreateCyoaBuild,
  useUpdateCyoaBuild,
  useDeleteCyoaBuild,
} from "@/hooks/use-cyoa-builds";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { ChoiceCatalog } from "./ChoiceCatalog";
import { BuildSummary } from "./BuildSummary";
import { StartCampaignModal } from "./StartCampaignModal";
import { useTranslation as useUiTranslation } from "react-i18next";

interface BuildPlannerModalProps {
  document: CyoaDocument;
  choices: CyoaChoice[];
  onClose: () => void;
}

export function BuildPlannerModal({ document, choices, onClose }: BuildPlannerModalProps) {
  const { t: localizeUi } = useUiTranslation();
  const { data: builds, isLoading } = useCyoaBuilds(document.id);
  const createBuild = useCreateCyoaBuild(document.id);
  const updateBuild = useUpdateCyoaBuild(document.id);
  const deleteBuild = useDeleteCyoaBuild(document.id);

  const [activeBuildId, setActiveBuildId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showStartCampaign, setShowStartCampaign] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const activeBuild = builds?.find((b) => b.id === activeBuildId) ?? builds?.[0] ?? null;

  const selectedIds = new Set(activeBuild?.selectedChoiceIds ?? []);

  const handleToggleChoice = useCallback(
    (choiceId: string) => {
      if (!activeBuild) return;
      const newIds = [...activeBuild.selectedChoiceIds];
      const idx = newIds.indexOf(choiceId);
      if (idx >= 0) newIds.splice(idx, 1);
      else newIds.push(choiceId);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateBuild.mutate({ id: activeBuild.id, selectedChoiceIds: newIds });
      }, 200);
    },
    [activeBuild, updateBuild],
  );

  const handleRemoveChoice = useCallback(
    (choiceId: string) => {
      handleToggleChoice(choiceId);
    },
    [handleToggleChoice],
  );

  const handleCreate = useCallback(async () => {
    const result = await createBuild.mutateAsync({ name: `Build ${(builds?.length ?? 0) + 1}` });
    setActiveBuildId(result.id);
  }, [createBuild, builds?.length]);

  const handleDelete = useCallback(
    (id: string) => {
      if (confirmDeleteId === id) {
        deleteBuild.mutate(id, {
          onSuccess: () => {
            setConfirmDeleteId(null);
            if (activeBuildId === id) setActiveBuildId(null);
          },
        });
      } else {
        setConfirmDeleteId(id);
        setTimeout(() => setConfirmDeleteId(null), 3000);
      }
    },
    [confirmDeleteId, deleteBuild, activeBuildId],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-[90vw] flex-col rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{localizeUi("ui.cyoa.buildplannermodal.buildPlanner")} {document.name}
          </h2>

          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />}

          <div className="flex flex-1 items-center gap-2">
            <select
              value={activeBuild?.id ?? ""}
              onChange={(e) => setActiveBuildId(e.target.value || null)}
              className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1 text-xs text-[var(--foreground)]"
            >
              {builds?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              disabled={createBuild.isPending}
              className="flex items-center gap-1 rounded-md bg-[var(--primary)] px-2 py-1 text-xs font-medium text-white"
            >
              <Plus className="h-3 w-3" /> {localizeUi("ui.chat.mariediteasyviewer.actionNew")}</button>
            {activeBuild && (
              <button
                onClick={() => handleDelete(activeBuild.id)}
                className="rounded p-1 text-[var(--muted-foreground)] hover:bg-red-500/20 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            {activeBuild && (
              <button
                onClick={() => setShowStartCampaign(true)}
                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white"
              >{localizeUi("ui.cyoa.buildplannermodal.startCampaign")}</button>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 border-r border-[var(--border)] p-3">
            <ChoiceCatalog
              choices={choices}
              selectedIds={selectedIds}
              onToggle={handleToggleChoice}
            />
          </div>
          <div className="w-1/2 p-3">
            {activeBuild ? (
              <BuildSummary
                build={activeBuild}
                document={document}
                choices={choices}
                onRemoveChoice={handleRemoveChoice}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.buildplannermodal.createABuildToGetStarted")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {showStartCampaign && activeBuild && document && (
        <StartCampaignModal
          build={activeBuild}
          document={document}
          onClose={() => setShowStartCampaign(false)}
        />
      )}
    </div>
  );
}
