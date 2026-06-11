// ──────────────────────────────────────────────
// Panel: Language Learning (composes sub-panels)
// ──────────────────────────────────────────────
import { useLearningStore } from "../../stores/learning.store";
import { CorrectionPanel } from "./CorrectionPanel";
import { VocabSidebar } from "./VocabSidebar";
import { ReviewSession } from "./ReviewSession";
import { LearningChatSetup } from "./LearningChatSetup";

export function LanguageLearningPanel() {
  const activeLanguageCode = useLearningStore((s) => s.activeLanguageCode);
  const reviewSession = useLearningStore((s) => s.reviewSession);

  if (reviewSession?.active) {
    return <ReviewSession />;
  }

  if (!activeLanguageCode) {
    return <LearningChatSetup />;
  }

  return (
    <div className="flex flex-col h-full">
      <CorrectionPanel />
      <VocabSidebar />
    </div>
  );
}
