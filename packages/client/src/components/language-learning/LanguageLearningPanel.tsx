// ──────────────────────────────────────────────
// Panel: Language Learning (composes sub-panels)
// ──────────────────────────────────────────────
import { useLearningStore } from "../../stores/learning.store";
import { CorrectionPanel } from "./CorrectionPanel";
import { VocabSidebar } from "./VocabSidebar";
import { ReviewSession } from "./ReviewSession";
import { LearningChatSetup } from "./LearningChatSetup";
import { useTranslation as useUiTranslation } from "react-i18next";

export function LanguageLearningPanel() {
  const { t: localizeUi } = useUiTranslation();
  const activeLanguageCode = useLearningStore((s) => s.activeLanguageCode);
  const activeLanguageName = useLearningStore((s) => s.activeLanguageName);
  const reviewSession = useLearningStore((s) => s.reviewSession);

  if (reviewSession?.active) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--border)] px-3 py-2">
          <h3 className="text-xs font-semibold text-[var(--foreground)]">{localizeUi("ui.languageLearning.languagelearningpanel.reviewSession")} {activeLanguageName ?? "Language"}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ReviewSession />
        </div>
      </div>
    );
  }

  if (!activeLanguageCode) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--border)] px-3 py-2">
          <h3 className="text-xs font-semibold text-[var(--foreground)]">{localizeUi("ui.languageLearning.languagelearningpanel.selectOrAddATargetLanguageToStartLearning")}</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          <LearningChatSetup />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CorrectionPanel />
      <div className="flex-1 overflow-y-auto">
        <VocabSidebar />
      </div>
    </div>
  );
}
