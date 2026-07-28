import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, Eye, Globe, MessageCircle, Skull } from "lucide-react";
import type { CyoaBuild } from "@/hooks/use-cyoa-builds";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { useCyoaNarratorPrompts, type CyoaDifficulty } from "@/hooks/use-cyoa-builds";
import { useUpdateAgent } from "@/hooks/use-agents";
import { useUpdateChatMetadata } from "@/hooks/use-chats";
import { usePersonas } from "@/hooks/use-characters";
import { DifficultySliders } from "./DifficultySliders";
import { DEFAULT_CYOA_DIFFICULTY, type CyoaChatSettings } from "./CyoaChatSettings";
import { useTranslation as useUiTranslation } from "react-i18next";

interface CyoaSetupWizardProps {
  build: CyoaBuild;
  document: CyoaDocument;
  chatId: string;
  agentIds: { world: string; director: string; adversary: string | null };
  onComplete: (settings: CyoaChatSettings) => void;
  onCancel: () => void;
}

const STEPS = ["Build Review", "Difficulty", "Character"] as const;

export function CyoaSetupWizard({ build, document, chatId, agentIds, onComplete, onCancel }: CyoaSetupWizardProps) {
  const { t: localizeUi } = useUiTranslation();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [difficulty, setDifficulty] = useState<CyoaDifficulty>(DEFAULT_CYOA_DIFFICULTY);
  const [characterName, setCharacterName] = useState(build.name);
  const [characterBackground, setCharacterBackground] = useState("");
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = useCyoaNarratorPrompts();
  const updateAgent = useUpdateAgent();
  const updateChatMetadata = useUpdateChatMetadata();
  const { data: personas } = usePersonas();

  const handleBegin = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const prompts = await fetchPrompts.mutateAsync({ documentId: document.id, buildId: build.id, difficulty });

      await updateAgent.mutateAsync({ id: agentIds.world, promptTemplate: prompts.world });
      await updateAgent.mutateAsync({ id: agentIds.director, promptTemplate: prompts.director });
      if (agentIds.adversary && prompts.adversary) {
        await updateAgent.mutateAsync({ id: agentIds.adversary, promptTemplate: prompts.adversary });
      }

      const settings: CyoaChatSettings = {
        isCyoa: true,
        difficulty,
        character: { name: characterName, background: characterBackground, personaId },
        buildId: build.id,
        documentId: document.id,
      };

      await updateChatMetadata.mutateAsync({ id: chatId, cyoaSettings: settings });

      onComplete(settings);
    } catch (err) {
      setError(`Failed to begin campaign: ${(err as Error)?.message ?? "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{localizeUi("ui.cyoa.cyoasetupwizard.campaignSetup")}</h2>
          <button onClick={onCancel} disabled={submitting} className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium ${i === step ? "bg-[var(--primary)] text-white" : i < step ? "bg-emerald-600 text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                {i + 1}
              </div>
              <span className={`text-xs ${i === step ? "font-medium text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="h-px w-8 bg-[var(--border)]" />}
            </div>
          ))}
        </div>

        <div className="mt-6 min-h-[300px]">
          {step === 0 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.cyoasetupwizard.campaignName")}</label>
                <input
                  type="text"
                  value={build.name}
                  onChange={() => {}}
                  disabled
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="text-xs font-medium text-[var(--foreground)]">{document.name}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {build.selectedChoiceIds.length} {localizeUi("ui.cyoa.cyoasetupwizard.choicesSelected")}</p>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="text-[10px] font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.cyoasetupwizard.campaignAgents")}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[var(--foreground)]">
                    <Globe className="h-3 w-3 text-[var(--primary)]" /> {localizeUi("ui.cyoa.cyoasetupwizard.worldSimulator")}</div>
                  <div className="flex items-center gap-2 text-xs text-[var(--foreground)]">
                    <Eye className="h-3 w-3 text-[var(--primary)]" /> {localizeUi("ui.cyoa.cyoasetupwizard.director")}</div>
                  {difficulty.adversaryEnabled && (
                    <div className="flex items-center gap-2 text-xs text-[var(--foreground)]">
                      <Skull className="h-3 w-3 text-[var(--primary)]" /> {localizeUi("ui.cyoa.cyoasetupwizard.adversary")}</div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <MessageCircle className="h-3 w-3" /> {localizeUi("ui.cyoa.cyoasetupwizard.characterVoicesBuiltIntoNarratorPrompt")}</div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && <DifficultySliders difficulty={difficulty} onChange={setDifficulty} />}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.cyoasetupwizard.characterName")}</label>
                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.cyoasetupwizard.backgroundOptional")}</label>
                <textarea
                  value={characterBackground}
                  onChange={(e) => setCharacterBackground(e.target.value)}
                  rows={4}
                  placeholder={localizeUi("ui.cyoa.cyoasetupwizard.whoAreYouBeforeTheCampaignStartsAnyRelevant")}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.cyoasetupwizard.personaOptional")}</label>
                <select
                  value={personaId ?? ""}
                  onChange={(e) => setPersonaId(e.target.value || null)}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]"
                >
                  <option value="">{localizeUi("ui.game.gamesurfacecomponent.none")}</option>
                  {(personas ?? []).map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name ?? p.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-6 flex justify-between">
          <button
            onClick={step === 0 ? onCancel : () => setStep((step - 1) as 0 | 1)}
            disabled={submitting}
            className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--foreground)]"
          >
            <ChevronLeft className="h-3 w-3" />
            {step === 0 ?localizeUi("chat.delete.dialog.cancel") :localizeUi("ui.botBrowser.importDialog.back")}
          </button>
          {step < 2 ? (
            <button
              onClick={() => setStep((step + 1) as 1 | 2)}
              className="flex items-center gap-1 rounded-md bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-white"
            >{localizeUi("onboarding.actions.next")}<ChevronRight className="h-3 w-3" />
            </button>
          ) : (
            <button
              onClick={handleBegin}
              disabled={submitting}
              className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3 w-3 animate-spin" />}{localizeUi("ui.cyoa.cyoasetupwizard.beginCampaign")}</button>
          )}
        </div>
      </div>
    </div>
  );
}
