// ──────────────────────────────────────────────
// Language Learning: Chat Setup Wizard
// ──────────────────────────────────────────────
import { useState } from "react";
import { ChevronRight, ChevronLeft, GraduationCap } from "lucide-react";
import { useAddLanguage } from "../../hooks/use-learning";
import { useLearningStore } from "../../stores/learning.store";
import { TUTOR_PERSONAS } from "@jumpchoice/shared";
import type { TutorPersona, CefrLevel } from "@jumpchoice/shared";
import { cn } from "../../lib/utils";
import { useTranslation as useUiTranslation } from "react-i18next";

const COMMON_LANGUAGES = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese (Mandarin)" },
  { code: "ru", name: "Russian" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "nl", name: "Dutch" },
  { code: "sv", name: "Swedish" },
  { code: "tr", name: "Turkish" },
];

const NATIVE_LANGUAGES = [
  { code: "en", name: "English" },
  ...COMMON_LANGUAGES,
];

const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

// TODO: Replace with real userId from auth context when available
const PLACEHOLDER_USER_ID = "me";

interface WizardState {
  step: number;
  targetLanguage: string;
  targetLanguageCustom: string;
  nativeLanguage: string;
  tutorPersona: TutorPersona;
  startingLevel: CefrLevel | "auto";
}

export function LearningChatSetup({ onComplete }: { onComplete?: () => void }) {
  const { t: localizeUi } = useUiTranslation();
  const [state, setState] = useState<WizardState>({
    step: 1,
    targetLanguage: "",
    targetLanguageCustom: "",
    nativeLanguage: "en",
    tutorPersona: "default",
    startingLevel: "auto",
  });

  const addLanguage = useAddLanguage();
  const setActiveLanguage = useLearningStore((s) => s.setActiveLanguage);
  const setTutorPersona = useLearningStore((s) => s.setTutorPersona);

  const canProceed =
    state.step === 1
      ? !!(state.targetLanguage || state.targetLanguageCustom)
      : state.step === 2
        ? !!state.nativeLanguage
        : state.step === 3
          ? !!state.tutorPersona
          : true;

  function getTargetCode() {
    return state.targetLanguage || state.targetLanguageCustom.toLowerCase();
  }

  function getTargetName() {
    if (state.targetLanguage) {
      return COMMON_LANGUAGES.find((l) => l.code === state.targetLanguage)?.name ?? state.targetLanguage;
    }
    return state.targetLanguageCustom || "";
  }

  async function handleSubmit() {
    const code = getTargetCode();
    const name = getTargetName();

    try {
      await addLanguage.mutateAsync({
        userId: PLACEHOLDER_USER_ID,
        name,
        code,
      });
      setActiveLanguage(code, name);
      setTutorPersona(state.tutorPersona);
      onComplete?.();
    } catch {
      // Error is handled by React Query
    }
  }

  const totalSteps = 4;
  const progress = (state.step / totalSteps) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-4 pt-4">
        <div className="h-1 rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 text-right text-xs text-[var(--muted-foreground)]">{localizeUi("ui.game.tutorialcard.step")} {state.step} {localizeUi("ui.noodle.noodlehome.of")} {totalSteps}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {state.step === 1 && (
          <StepTargetLanguage
            value={state.targetLanguage}
            customValue={state.targetLanguageCustom}
            onSelect={(code) => setState((s) => ({ ...s, targetLanguage: code, targetLanguageCustom: "" }))}
            onCustomChange={(v) => setState((s) => ({ ...s, targetLanguageCustom: v, targetLanguage: "" }))}
          />
        )}
        {state.step === 2 && (
          <StepNativeLanguage
            value={state.nativeLanguage}
            onSelect={(code) => setState((s) => ({ ...s, nativeLanguage: code }))}
          />
        )}
        {state.step === 3 && (
          <StepTutorPersona
            value={state.tutorPersona}
            onSelect={(p) => setState((s) => ({ ...s, tutorPersona: p }))}
          />
        )}
        {state.step === 4 && (
          <StepStartingLevel
            value={state.startingLevel}
            onSelect={(l) => setState((s) => ({ ...s, startingLevel: l }))}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
        <button
          onClick={() => setState((s) => ({ ...s, step: Math.max(1, s.step - 1) }))}
          disabled={state.step === 1}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            state.step === 1
              ? "text-[var(--muted-foreground)] opacity-50 cursor-not-allowed"
              : "text-[var(--foreground)] hover:bg-[var(--accent)]",
          )}
        >
          <ChevronLeft size="0.875rem" />{localizeUi("ui.botBrowser.importDialog.back")}</button>

        {state.step < totalSteps ? (
          <button
            onClick={() => setState((s) => ({ ...s, step: s.step + 1 }))}
            disabled={!canProceed}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              canProceed
                ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white hover:opacity-90 active:scale-95"
                : "bg-[var(--border)] text-[var(--muted-foreground)] cursor-not-allowed",
            )}
          >{localizeUi("onboarding.actions.next")}<ChevronRight size="0.875rem" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={addLanguage.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            <GraduationCap size="0.875rem" />
            {addLanguage.isPending ?localizeUi("ui.chat.chatgallery.creating") :localizeUi("ui.languageLearning.learningchatsetup.startLearning")}
          </button>
        )}
      </div>
    </div>
  );
}

function StepTargetLanguage({
  value,
  customValue,
  onSelect,
  onCustomChange,
}: {
  value: string;
  customValue: string;
  onSelect: (code: string) => void;
  onCustomChange: (value: string) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{localizeUi("ui.languageLearning.steptargetlanguage.pickTargetLanguage")}</h3>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{localizeUi("ui.languageLearning.steptargetlanguage.chooseTheLanguageYouWantToLearn")}</p>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {COMMON_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code)}
            className={cn(
              "rounded-lg px-3 py-2 text-left text-sm transition-all active:scale-95",
              value === lang.code
                ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-sm"
                : "bg-[var(--card)] text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--accent)]",
            )}
          >
            {lang.name}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <input
          type="text"
          placeholder={localizeUi("ui.languageLearning.steptargetlanguage.orTypeACustomLanguage")}
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          className="w-full rounded-lg bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] ring-1 ring-[var(--border)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
        />
      </div>
    </div>
  );
}

function StepNativeLanguage({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (code: string) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{localizeUi("ui.languageLearning.stepnativelanguage.pickNativeLanguage")}</h3>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{localizeUi("ui.languageLearning.stepnativelanguage.yourNativeLanguageForTranslationsAndExplanations")}</p>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {NATIVE_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code)}
            className={cn(
              "rounded-lg px-3 py-2 text-left text-sm transition-all active:scale-95",
              value === lang.code
                ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-sm"
                : "bg-[var(--card)] text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--accent)]",
            )}
          >
            {lang.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepTutorPersona({
  value,
  onSelect,
}: {
  value: TutorPersona;
  onSelect: (persona: TutorPersona) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{localizeUi("ui.languageLearning.steptutorpersona.pickTutorPersona")}</h3>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{localizeUi("ui.languageLearning.steptutorpersona.howShouldYourAiTutorBehave")}</p>
      <div className="mt-3 space-y-2">
        {(Object.entries(TUTOR_PERSONAS) as [TutorPersona, (typeof TUTOR_PERSONAS)[TutorPersona]][]).map(
          ([key, persona]) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={cn(
                "w-full rounded-lg px-3 py-2.5 text-left transition-all active:scale-[0.99]",
                value === key
                  ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-sm"
                  : "bg-[var(--card)] text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--accent)]",
              )}
            >
              <div className="text-sm font-medium">{persona.label}</div>
              <div
                className={cn(
                  "mt-0.5 text-xs",
                  value === key ? "text-white/80" : "text-[var(--muted-foreground)]",
                )}
              >
                {persona.description}
              </div>
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function StepStartingLevel({
  value,
  onSelect,
}: {
  value: CefrLevel | "auto";
  onSelect: (level: CefrLevel | "auto") => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{localizeUi("ui.languageLearning.stepstartinglevel.pickStartingLevel")}</h3>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{localizeUi("ui.languageLearning.stepstartinglevel.yourCurrentProficiencyInTheTargetLanguage")}</p>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {CEFR_LEVELS.map((level) => (
          <button
            key={level}
            onClick={() => onSelect(level)}
            className={cn(
              "rounded-lg px-3 py-3 text-center text-sm font-medium transition-all active:scale-95",
              value === level
                ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-sm"
                : "bg-[var(--card)] text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--accent)]",
            )}
          >
            {level}
          </button>
        ))}
      </div>
      <button
        onClick={() => onSelect("auto")}
        className={cn(
          "mt-2 w-full rounded-lg px-3 py-2.5 text-left text-sm transition-all active:scale-[0.99]",
          value === "auto"
            ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-sm"
            : "bg-[var(--card)] text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--accent)]",
        )}
      >{localizeUi("ui.languageLearning.stepstartinglevel.letAiEstimateMyLevel")}</button>
    </div>
  );
}
