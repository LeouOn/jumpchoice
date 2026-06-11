// ──────────────────────────────────────────────
// Schema: Language Learning
// ──────────────────────────────────────────────
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ── Languages: user's target languages ──
export const languages = sqliteTable("languages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  code: text("language_code").notNull(),
  nativeLanguage: text("native_language").notNull().default("English"),
  proficiencyLevel: text("proficiency_level", { enum: ["A1", "A2", "B1", "B2", "C1", "C2"] }),
  proficiencyConfidence: real("proficiency_confidence"),
  tutorPersona: text("tutor_persona", { enum: ["default", "strict", "encouraging", "immersive"] }).notNull().default("default"),
  createdAt: text("created_at").notNull(),
});

// ── Vocabulary: words + phrases ──
export const vocabulary = sqliteTable("vocabulary", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  languageCode: text("language_code").notNull(),
  lemma: text("lemma").notNull(),
  surface: text("surface").notNull(),
  type: text("type", { enum: ["word", "phrase"] }).notNull(),
  translation: text("translation").notNull(),
  contextSentence: text("context_sentence").notNull().default(""),
  sourceChatId: text("source_chat_id"),
  tags: text("tags").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
});

// ── SRS State: FSRS per vocab item ──
export const srsState = sqliteTable("srs_state", {
  id: text("id").primaryKey(),
  vocabularyId: text("vocabulary_id").notNull().unique(),
  stability: real("stability").notNull().default(1.0),
  difficulty: real("difficulty").notNull().default(5.0),
  lastReview: text("last_review"),
  nextDue: text("next_due").notNull(),
  reps: integer("reps").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  suspended: text("suspended").notNull().default("false"),
});

// ── SRS Reviews: review history ──
export const srsReviews = sqliteTable("srs_reviews", {
  id: text("id").primaryKey(),
  vocabularyId: text("vocabulary_id").notNull(),
  grade: integer("grade").notNull(),
  reviewedAt: text("reviewed_at").notNull(),
  interval: real("interval").notNull(),
  stabilityAfter: real("stability_after").notNull(),
});

// ── Corrections: grammar errors ──
export const corrections = sqliteTable("corrections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  languageCode: text("language_code").notNull(),
  chatId: text("chat_id").notNull(),
  messageId: text("message_id"),
  original: text("original").notNull(),
  corrected: text("corrected").notNull(),
  explanation: text("explanation").notNull().default(""),
  severity: text("severity", { enum: ["minor", "major"] }).notNull(),
  dismissed: text("dismissed").notNull().default("false"),
  createdAt: text("created_at").notNull(),
});

// ── Proficiency Snapshots: level over time ──
export const proficiencySnapshots = sqliteTable("proficiency_snapshots", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  languageCode: text("language_code").notNull(),
  level: text("level", { enum: ["A1", "A2", "B1", "B2", "C1", "C2"] }).notNull(),
  confidence: real("confidence").notNull(),
  estimatedAt: text("estimated_at").notNull(),
  source: text("source", { enum: ["user_set", "ai_estimated", "hybrid"] }).notNull(),
});
