export type TutorPersona = "default" | "strict" | "encouraging" | "immersive";
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type ProficiencySource = "user_set" | "ai_estimated" | "hybrid";
export type VocabType = "word" | "phrase";
export type CorrectionSeverity = "minor" | "major";
export type SrsGrade = 1 | 2 | 3 | 4;

export interface LanguageConfig {
  id: string;
  userId: string;
  name: string;
  code: string;
  nativeLanguage: string;
  proficiencyLevel: CefrLevel | null;
  proficiencyConfidence: number | null;
  tutorPersona: TutorPersona;
  createdAt: string;
}

export interface Vocabulary {
  id: string;
  userId: string;
  languageCode: string;
  lemma: string;
  surface: string;
  type: VocabType;
  translation: string;
  contextSentence: string;
  sourceChatId: string | null;
  tags: string[];
  createdAt: string;
}

export interface NewVocabulary {
  userId: string;
  languageCode: string;
  lemma: string;
  surface: string;
  type: VocabType;
  translation: string;
  contextSentence: string;
  sourceChatId?: string | null;
  tags?: string[];
}

export interface SrsState {
  id: string;
  vocabularyId: string;
  stability: number;
  difficulty: number;
  lastReview: string | null;
  nextDue: string;
  reps: number;
  lapses: number;
  suspended: boolean;
}

export interface SrsReview {
  id: string;
  vocabularyId: string;
  grade: SrsGrade;
  reviewedAt: string;
  interval: number;
  stabilityAfter: number;
}

export interface Correction {
  id: string;
  userId: string;
  languageCode: string;
  chatId: string;
  messageId: string | null;
  original: string;
  corrected: string;
  explanation: string;
  severity: CorrectionSeverity;
  dismissed: boolean;
  createdAt: string;
}

export interface NewCorrection {
  userId: string;
  languageCode: string;
  chatId: string;
  messageId?: string | null;
  original: string;
  corrected: string;
  explanation: string;
  severity: CorrectionSeverity;
}

export interface ProficiencySnapshot {
  id: string;
  userId: string;
  languageCode: string;
  level: CefrLevel;
  confidence: number;
  estimatedAt: string;
  source: ProficiencySource;
}

export interface ReviewQueueItem {
  vocabulary: Vocabulary;
  srsState: SrsState;
}

export interface VocabStats {
  total: number;
  newCount: number;
  learning: number;
  known: number;
  dueToday: number;
  retentionRate: number;
}

export interface ExtractedVocab {
  lemma: string;
  surface: string;
  type: VocabType;
  translation: string;
  contextSentence: string;
  tags: string[];
}

export interface ExtractedCorrection {
  original: string;
  corrected: string;
  explanation: string;
  severity: CorrectionSeverity;
}
