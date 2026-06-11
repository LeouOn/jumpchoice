// ──────────────────────────────────────────────
// Zustand Store: Language Learning
// ──────────────────────────────────────────────
import { create } from "zustand";
import type { TutorPersona, CefrLevel, Vocabulary } from "@jumpchoice/shared";

interface LearningState {
  activeLanguageCode: string | null;
  activeLanguageName: string | null;
  tutorPersona: TutorPersona;
  proficiencyLevel: CefrLevel | null;
  reviewSession: { active: boolean; items: Vocabulary[]; currentIndex: number } | null;
  newVocabCount: number;
  setActiveLanguage: (code: string, name: string) => void;
  setTutorPersona: (persona: TutorPersona) => void;
  setProficiencyLevel: (level: CefrLevel) => void;
  startReviewSession: (items: Vocabulary[]) => void;
  endReviewSession: () => void;
  advanceReviewIndex: () => void;
}

export const useLearningStore = create<LearningState>((set) => ({
  activeLanguageCode: null,
  activeLanguageName: null,
  tutorPersona: "default",
  proficiencyLevel: null,
  reviewSession: null,
  newVocabCount: 0,

  setActiveLanguage: (code, name) =>
    set({ activeLanguageCode: code, activeLanguageName: name }),
  setTutorPersona: (persona) => set({ tutorPersona: persona }),
  setProficiencyLevel: (level) => set({ proficiencyLevel: level }),
  startReviewSession: (items) =>
    set({ reviewSession: { active: true, items, currentIndex: 0 } }),
  endReviewSession: () => set({ reviewSession: null }),
  advanceReviewIndex: () =>
    set((s) => {
      if (!s.reviewSession) return {};
      const nextIndex = s.reviewSession.currentIndex + 1;
      if (nextIndex >= s.reviewSession.items.length) {
        return { reviewSession: null };
      }
      return { reviewSession: { ...s.reviewSession, currentIndex: nextIndex } };
    }),
}));
