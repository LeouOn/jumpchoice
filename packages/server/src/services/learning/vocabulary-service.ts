import { eq, and, sql, count } from "drizzle-orm";
import type { DB } from "../../db/connection.js";
import { vocabulary, srsState, srsReviews } from "../../db/schema/learning.js";
import { newId, now } from "../../utils/id-generator.js";
import { SrsScheduler } from "./srs-scheduler.js";
import type { NewVocabulary, Vocabulary, VocabStats } from "@jumpchoice/shared";

export function createVocabularyService(db: DB) {
  return {
    async add(input: NewVocabulary): Promise<Vocabulary> {
      const id = newId();
      const timestamp = now();
      await db.insert(vocabulary).values({
        id,
        userId: input.userId,
        languageCode: input.languageCode,
        lemma: input.lemma,
        surface: input.surface,
        type: input.type,
        translation: input.translation,
        contextSentence: input.contextSentence,
        sourceChatId: input.sourceChatId ?? null,
        tags: JSON.stringify(input.tags ?? []),
        createdAt: timestamp,
      });
      // Initialize SRS state for the new item
      await db.insert(srsState).values({
        id: newId(),
        vocabularyId: id,
        nextDue: timestamp,
      });
      return (await this.getById(id))!;
    },

    async getById(id: string): Promise<Vocabulary | null> {
      const rows = await db.select().from(vocabulary).where(eq(vocabulary.id, id));
      if (!rows[0]) return null;
      return { ...rows[0], tags: JSON.parse(rows[0].tags) };
    },

    async findOrCreate(lemma: string, languageCode: string, userId: string, contextSentence: string): Promise<Vocabulary> {
      const existing = await db.select().from(vocabulary)
        .where(and(
          eq(vocabulary.lemma, lemma),
          eq(vocabulary.languageCode, languageCode),
          eq(vocabulary.userId, userId),
        ));
      if (existing[0]) return { ...existing[0], tags: JSON.parse(existing[0].tags) };
      return this.add({
        userId,
        languageCode,
        lemma,
        surface: lemma,
        type: "word",
        translation: "",
        contextSentence,
      });
    },

    async listByLanguage(userId: string, languageCode: string, filters?: { status?: string; search?: string; limit?: number; offset?: number }): Promise<Vocabulary[]> {
      const rows = await db.select().from(vocabulary)
        .where(and(eq(vocabulary.userId, userId), eq(vocabulary.languageCode, languageCode)))
        .limit(filters?.limit ?? 100)
        .offset(filters?.offset ?? 0);
      return rows.map(r => ({ ...r, tags: JSON.parse(r.tags) }));
    },

    async stats(userId: string, languageCode: string): Promise<VocabStats> {
      const scope = and(eq(vocabulary.userId, userId), eq(vocabulary.languageCode, languageCode));

      // Join vocabulary + srsState to compute bucket counts in one query
      const rows = await db
        .select({
          total: count(),
          newCount: sql<number>`sum(case when ${srsState.reps} = 0 then 1 else 0 end)`,
          learning: sql<number>`sum(case when ${srsState.reps} > 0 and ${srsState.reps} < 3 then 1 else 0 end)`,
          known: sql<number>`sum(case when ${srsState.reps} >= 3 and ${srsState.stability} >= 21 then 1 else 0 end)`,
          dueToday: sql<number>`sum(case when ${srsState.nextDue} <= ${now()} then 1 else 0 end)`,
        })
        .from(vocabulary)
        .leftJoin(srsState, eq(srsState.vocabularyId, vocabulary.id))
        .where(scope);

      // Retention rate: good reviews (grade >= 3) / all reviews
      const reviewRows = await db
        .select({
          totalReviews: count(),
          successful: sql<number>`sum(case when ${srsReviews.grade} >= 3 then 1 else 0 end)`,
        })
        .from(srsReviews)
        .innerJoin(vocabulary, eq(vocabulary.id, srsReviews.vocabularyId))
        .where(scope);

      const row = rows[0]!;
      const reviewRow = reviewRows[0]!;

      const retentionRate = reviewRow.totalReviews > 0
        ? Math.round((reviewRow.successful / reviewRow.totalReviews) * 100) / 100
        : 0;

      return {
        total: row.total,
        newCount: row.newCount,
        learning: row.learning,
        known: row.known,
        dueToday: row.dueToday,
        retentionRate,
      };
    },
  };
}
