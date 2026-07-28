import { fileTable, text, integer, real } from "../file-schema.js";

export const languages = fileTable("languages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  code: text("language_code").notNull(),
  nativeLanguage: text("native_language").notNull().default("English"),
  proficiencyLevel: text("proficiency_level"),
  proficiencyConfidence: real("proficiency_confidence"),
  tutorPersona: text("tutor_persona").notNull().default("default"),
  createdAt: text("created_at").notNull(),
});

export const vocabulary = fileTable("vocabulary", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  languageCode: text("language_code").notNull(),
  lemma: text("lemma").notNull(),
  surface: text("surface").notNull(),
  type: text("type").notNull(),
  translation: text("translation").notNull(),
  contextSentence: text("context_sentence").notNull().default(""),
  sourceChatId: text("source_chat_id"),
  tags: text("tags").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
});

export const srsState = fileTable("srs_state", {
  id: text("id").primaryKey(),
  vocabularyId: text("vocabulary_id").notNull(),
  stability: real("stability").notNull().default(1.0),
  difficulty: real("difficulty").notNull().default(5.0),
  lastReview: text("last_review"),
  nextDue: text("next_due").notNull(),
  reps: integer("reps").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  suspended: text("suspended").notNull().default("false"),
});

export const srsReviews = fileTable("srs_reviews", {
  id: text("id").primaryKey(),
  vocabularyId: text("vocabulary_id").notNull(),
  grade: integer("grade").notNull(),
  reviewedAt: text("reviewed_at").notNull(),
  interval: real("interval").notNull(),
  stabilityAfter: real("stability_after").notNull(),
});

export const corrections = fileTable("corrections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  languageCode: text("language_code").notNull(),
  chatId: text("chat_id").notNull(),
  messageId: text("message_id"),
  original: text("original").notNull(),
  corrected: text("corrected").notNull(),
  explanation: text("explanation").notNull().default(""),
  severity: text("severity").notNull(),
  dismissed: text("dismissed").notNull().default("false"),
  createdAt: text("created_at").notNull(),
});

export const proficiencySnapshots = fileTable("proficiency_snapshots", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  languageCode: text("language_code").notNull(),
  level: text("level").notNull(),
  confidence: real("confidence").notNull(),
  estimatedAt: text("estimated_at").notNull(),
  source: text("source").notNull(),
});