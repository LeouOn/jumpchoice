// ──────────────────────────────────────────────
// Language Learning: Review Session (SRS Flashcard)
// ──────────────────────────────────────────────
import { useState } from "react";
import { Eye, RotateCcw, ThumbsDown, ThumbsUp, ChevronRight, Star } from "lucide-react";
import { useLearningStore } from "../../stores/learning.store";
import { useSubmitReview } from "../../hooks/use-learning";
import { cn } from "../../lib/utils";
import type { SrsGrade } from "@jumpchoice/shared";
import { useTranslation as useUiTranslation } from "react-i18next";

export function ReviewSession() {
  const { t: localizeUi } = useUiTranslation();
  const reviewSession = useLearningStore((s) => s.reviewSession);
  const endReviewSession = useLearningStore((s) => s.endReviewSession);
  const advanceReviewIndex = useLearningStore((s) => s.advanceReviewIndex);
  const submitReview = useSubmitReview();
  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  if (!reviewSession || !reviewSession.active) return null;

  const { items, currentIndex } = reviewSession;
  const current = items[currentIndex];
  if (!current) {
    // Session complete
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <Star size="2rem" className="text-amber-400" />
        <h3 className="text-lg font-semibold text-[var(--foreground)]">{localizeUi("ui.languageLearning.reviewsession.sessionComplete")}</h3>
        <p className="text-sm text-[var(--muted-foreground)]">{localizeUi("ui.languageLearning.reviewsession.youReviewed")} {reviewedCount} {localizeUi("ui.noodle.noodlehome.of")} {items.length} {localizeUi("ui.languageLearning.reviewsession.cards")}</p>
        <button
          onClick={() => {
            endReviewSession();
            setReviewedCount(0);
          }}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 active:scale-95"
        >{localizeUi("lorebook.editor.batch.done")}</button>
      </div>
    );
  }

  function handleGrade(grade: SrsGrade) {
    submitReview.mutate({ vocabularyId: current.id, grade });
    setRevealed(false);
    setReviewedCount((c) => c + 1);
    advanceReviewIndex();
  }

  const grades: { value: SrsGrade; label: string; color: string; icon: typeof ThumbsDown }[] = [
    { value: 1, label: "Again", color: "text-red-400 hover:bg-red-500/10", icon: RotateCcw },
    { value: 2, label: "Hard", color: "text-amber-400 hover:bg-amber-500/10", icon: ThumbsDown },
    { value: 3, label: "Good", color: "text-emerald-400 hover:bg-emerald-500/10", icon: ThumbsUp },
    { value: 4, label: "Easy", color: "text-sky-400 hover:bg-sky-500/10", icon: ChevronRight },
  ];

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* Progress */}
      <div className="w-full">
        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] mb-1">
          <span>{localizeUi("editor.tabs.card")} {currentIndex + 1} {localizeUi("ui.noodle.noodlehome.of")} {items.length}</span>
          <span>{Math.round(((currentIndex + 1) / items.length) * 100)}%</span>
        </div>
        <div className="h-1 rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all"
            style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full rounded-xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)] shadow-sm">
        <div className="text-center">
          <div className="text-xl font-semibold text-[var(--foreground)]">{current.surface}</div>
          {current.lemma !== current.surface && (
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">{localizeUi("ui.languageLearning.reviewsession.lemma")} {current.lemma}</div>
          )}
        </div>

        {!revealed ? (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setRevealed(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:opacity-90 active:scale-95"
            >
              <Eye size="0.875rem" />{localizeUi("ui.game.gamenarration.reveal")}</button>
          </div>
        ) : (
          <>
            <div className="mt-4 border-t border-[var(--border)] pt-4 text-center">
              <div className="text-lg text-emerald-400">{current.translation}</div>
              {current.contextSentence && (
                <div className="mt-2 text-xs italic text-[var(--muted-foreground)]">{localizeUi("ui.languageLearning.reviewsession.ldquo")}{current.contextSentence}{localizeUi("ui.languageLearning.reviewsession.rdquo")}</div>
              )}
            </div>

            {/* Grade buttons */}
            <div className="mt-6 grid grid-cols-4 gap-2">
              {grades.map(({ value, label, color, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleGrade(value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium transition-all active:scale-90",
                    color,
                  )}
                >
                  <Icon size="1rem" />
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
