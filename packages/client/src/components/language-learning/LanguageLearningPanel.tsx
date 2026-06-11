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
  const activeLanguageName = useLearningStore((s) => s.activeLanguageName);
  const reviewSession = useLearningStore((s) => s.reviewSession);

  if (reviewSession?.active) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--border)] px-3 py-2">
          <h3 className="text-xs font-semibold text-[var(--foreground)]">
            Review Session — {activeLanguageName ?? "Language"}
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
          <h3 className="text-xs font-semibold text-[var(--foreground)]">
            Select or add a target language to start learning.
          </h3>
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
