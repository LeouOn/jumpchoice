import type { DB } from "../../db/connection.js";
import { createVocabularyService } from "./vocabulary-service.js";
import { createProficiencyService } from "./proficiency-service.js";
import { createCorrectionService } from "./correction-service.js";
import { SrsScheduler } from "./srs-scheduler.js";
import { srsState, srsReviews } from "../../db/schema/learning.js";
import { newId, now } from "../../utils/id-generator.js";
import { eq } from "../../db/file-query.js";
import type { ExtractedVocab, ExtractedCorrection, SrsGrade } from "@jumpchoice/shared";

export function createLearningCoordinator(db: DB) {
  const vocab = createVocabularyService(db);
  const proficiency = createProficiencyService(db);
  const corrections = createCorrectionService(db);

  return {
    vocab,
    proficiency,
    corrections,

    async processExtractedVocab(items: ExtractedVocab[], userId: string, languageCode: string, chatId: string) {
      const results = [];
      for (const item of items) {
        const v = await vocab.add({
          userId,
          languageCode,
          lemma: item.lemma,
          surface: item.surface,
          type: item.type,
          translation: item.translation,
          contextSentence: item.contextSentence,
          sourceChatId: chatId,
          tags: item.tags,
        });
        results.push(v);
      }
      return results;
    },

    async processExtractedCorrections(items: ExtractedCorrection[], userId: string, languageCode: string, chatId: string, messageId: string | null) {
      const results = [];
      for (const c of items) {
        const saved = await corrections.add({
          userId,
          languageCode,
          chatId,
          messageId,
          original: c.original,
          corrected: c.corrected,
          explanation: c.explanation,
          severity: c.severity,
        });
        results.push(saved);
      }
      return results;
    },

    async scheduleReviews(vocabularyIds: string[], grade: SrsGrade) {
      const results = [];
      for (const vocabId of vocabularyIds) {
        const stateRows = await db.select().from(srsState).where(eq(srsState.vocabularyId, vocabId));
        const row = stateRows[0];
        if (!row) continue;
        const state = { ...row, suspended: row.suspended === "true" };
        const update = SrsScheduler.review(state, grade);
        await db.update(srsState)
          .set({
            stability: update.state.stability,
            difficulty: update.state.difficulty,
            lastReview: update.state.lastReview,
            nextDue: update.state.nextDue,
            reps: update.state.reps,
            lapses: update.state.lapses,
          })
          .where(eq(srsState.vocabularyId, vocabId));
        await db.insert(srsReviews).values({
          id: newId(),
          vocabularyId: vocabId,
          grade,
          interval: update.interval,
          stabilityAfter: update.state.stability,
          reviewedAt: now(),
        });
        results.push(update);
      }
      return results;
    },
  };
}
