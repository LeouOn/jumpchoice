// ──────────────────────────────────────────────
// Language Learning: Vocab Sidebar
// ──────────────────────────────────────────────
import { useState, useMemo } from "react";
import { Loader2, BookOpen, Tag } from "lucide-react";
import { useLearningStore } from "../../stores/learning.store";
import { useVocab, useVocabStats } from "../../hooks/use-learning";
import type { Vocabulary } from "@jumpchoice/shared";
import { cn } from "../../lib/utils";
import { useTranslation as useUiTranslation } from "react-i18next";

type VocabTab = "new" | "learning" | "known";

/** Single-user local app placeholder until multi-user auth is added. */
const USER_ID = "me";

export function VocabSidebar() {
  const { t: localizeUi } = useUiTranslation();
  const activeLanguageCode = useLearningStore((s) => s.activeLanguageCode);
  const [activeTab, setActiveTab] = useState<VocabTab>("new");

  const { data: vocab, isLoading } = useVocab(USER_ID, activeLanguageCode ?? "");
  const { data: stats } = useVocabStats(USER_ID, activeLanguageCode ?? "");

  const filtered = useMemo(() => {
    if (!vocab) return [];
    return vocab;
  }, [vocab]);

  if (!activeLanguageCode) return null;

  const tabs: { key: VocabTab; label: string }[] = [
    { key: "new", label: "New" },
    { key: "learning", label: "Learning" },
    { key: "known", label: "Known" },
  ];

  return (
    <div className="flex flex-col border-t border-[var(--border)]">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 px-3 py-2 text-xs font-medium transition-colors",
              activeTab === tab.key
                ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Word list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-[var(--muted-foreground)]">
            <Loader2 size="1rem" className="animate-spin mr-2" />{localizeUi("ui.languageLearning.vocabsidebar.loadingVocabulary")}</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-[var(--muted-foreground)]">{localizeUi("ui.languageLearning.vocabsidebar.noVocabularyYetStartALearningChat")}</div>
        )}
        {filtered.map((item) => (
          <VocabCard key={item.id} item={item} />
        ))}
      </div>

      {/* Footer stats */}
      {stats && (
        <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
          <span>{stats.total} {localizeUi("ui.languageLearning.vocabsidebar.words")}</span>
          <span>{stats.dueToday} {localizeUi("ui.languageLearning.vocabsidebar.dueToday")}</span>
        </div>
      )}
    </div>
  );
}

function VocabCard({ item }: { item: Vocabulary }) {
  const { t: localizeUi } = useUiTranslation();
  return (
    <div className="group relative rounded-lg bg-[var(--card)] p-2.5 ring-1 ring-[var(--border)] transition-colors hover:bg-[var(--accent)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">{item.surface}</span>
            {item.lemma !== item.surface && (
              <span className="text-xs text-[var(--muted-foreground)]">({item.lemma})</span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{item.translation}</div>
          {item.contextSentence && (
            <div className="mt-1 text-xs italic text-[var(--muted-foreground)] line-clamp-2">{localizeUi("ui.languageLearning.reviewsession.ldquo")}{item.contextSentence}{localizeUi("ui.languageLearning.reviewsession.rdquo")}</div>
          )}
        </div>
        <BookOpen size="0.75rem" className="mt-0.5 shrink-0 text-[var(--muted-foreground)]" />
      </div>
      {item.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[0.625rem] text-[var(--muted-foreground)]"
            >
              <Tag size="0.5rem" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
