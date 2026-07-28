// ──────────────────────────────────────────────
// React Query: Language Learning hooks
// ──────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api-client";
import type {
  LanguageConfig,
  Vocabulary,
  Correction,
  VocabStats,
  SrsGrade,
} from "@jumpchoice/shared";

export const learningKeys = {
  all: ["learning"] as const,
  languages: (userId: string) => [...learningKeys.all, "languages", userId] as const,
  vocab: (userId: string, languageCode: string) =>
    [...learningKeys.all, "vocab", userId, languageCode] as const,
  corrections: (chatId: string) => [...learningKeys.all, "corrections", chatId] as const,
  stats: (userId: string, languageCode: string) =>
    [...learningKeys.all, "stats", userId, languageCode] as const,
};

export function useLanguages(userId: string) {
  return useQuery({
    queryKey: learningKeys.languages(userId),
    queryFn: () =>
      api.get<LanguageConfig[]>(`/learning/languages?userId=${userId}`),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}

export function useAddLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; name: string; code: string }) =>
      api.post<LanguageConfig>("/learning/languages", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: learningKeys.all });
    },
  });
}

export function useVocab(userId: string, languageCode: string) {
  return useQuery({
    queryKey: learningKeys.vocab(userId, languageCode),
    queryFn: () =>
      api.get<Vocabulary[]>(
        `/learning/vocab?userId=${userId}&languageCode=${languageCode}`,
      ),
    enabled: !!userId && !!languageCode,
    staleTime: 5 * 60_000,
  });
}

export function useVocabStats(userId: string, languageCode: string) {
  return useQuery({
    queryKey: learningKeys.stats(userId, languageCode),
    queryFn: () =>
      api.get<VocabStats>(
        `/learning/vocab/stats?userId=${userId}&languageCode=${languageCode}`,
      ),
    enabled: !!userId && !!languageCode,
    staleTime: 60_000,
  });
}

export function useCorrections(chatId: string) {
  return useQuery({
    queryKey: learningKeys.corrections(chatId),
    queryFn: () =>
      api.get<Correction[]>(`/learning/corrections?chatId=${chatId}`),
    enabled: !!chatId,
    staleTime: 30_000,
  });
}

export function useDismissCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<Correction>(`/learning/corrections/${id}/dismiss`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: learningKeys.all });
    },
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { vocabularyId: string; grade: SrsGrade }) =>
      api.post("/learning/reviews", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: learningKeys.all });
    },
  });
}
