// ──────────────────────────────────────────────
// Panel: Language Learning (composes sub-panels)
// ──────────────────────────────────────────────
import { useLearningStore } from "../../stores/learning.store";
import { CorrectionPanel } from "../language-learning/CorrectionPanel";
import { VocabSidebar } from "../language-learning/VocabSidebar";
import { ReviewSession } from "../language-learning/ReviewSession";

export function LanguageLearningPanel() {
  const activeLanguageCode = useLearningStore((s) => s.activeLanguageCode);
  const reviewSession = useLearningStore((s) => s.reviewSession);

  if (reviewSession?.active) {
    return <ReviewSession />;
  }

  if (!activeLanguageCode) {
    return (
      <div className="p-4 text-sm text-[var(--muted-foreground)]">
        Select or add a target language to start learning.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <CorrectionPanel />
      <VocabSidebar />
    </div>
  );
}
