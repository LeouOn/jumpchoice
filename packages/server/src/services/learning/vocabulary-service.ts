import { eq, and, inArray } from "../../db/file-query.js";
import type { DB } from "../../db/connection.js";
import { vocabulary, srsState, srsReviews } from "../../db/schema/learning.js";
import { newId, now } from "../../utils/id-generator.js";
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
      return { ...rows[0], tags: JSON.parse(rows[0].tags) } as unknown as Vocabulary;
    },

    async findOrCreate(lemma: string, languageCode: string, userId: string, contextSentence: string): Promise<Vocabulary> {
      const existing = await db.select().from(vocabulary)
        .where(and(
          eq(vocabulary.lemma, lemma),
          eq(vocabulary.languageCode, languageCode),
          eq(vocabulary.userId, userId),
        ));
      if (existing[0]) return { ...existing[0], tags: JSON.parse(existing[0].tags) } as unknown as Vocabulary;
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
      return rows.map(r => ({ ...r, tags: JSON.parse(r.tags) })) as unknown as Vocabulary[];
    },

    async stats(userId: string, languageCode: string): Promise<VocabStats> {
      const scope = and(eq(vocabulary.userId, userId), eq(vocabulary.languageCode, languageCode));
      const allVocab = await db.select().from(vocabulary).where(scope);
      const vocabIds = allVocab.map(v => v.id);
      const allSrs = vocabIds.length > 0
        ? await db.select().from(srsState).where(inArray(srsState.vocabularyId, vocabIds))
        : [];
      const srsMap = new Map(allSrs.map(s => [s.vocabularyId, s]));
      const allReviews = vocabIds.length > 0
        ? await db.select().from(srsReviews).where(inArray(srsReviews.vocabularyId, vocabIds))
        : [];
      const currentTime = now();
      let newCount = 0, learning = 0, known = 0, dueToday = 0;
      for (const v of allVocab) {
        const srs = srsMap.get(v.id);
        if (!srs || srs.reps === 0) { newCount++; continue; }
        if (srs.reps < 3) { learning++; }
        if (srs.reps >= 3 && srs.stability >= 21) { known++; }
        if (srs.nextDue <= currentTime) { dueToday++; }
      }
      const totalReviews = allReviews.length;
      const successful = allReviews.filter(r => r.grade >= 3).length;
      const retentionRate = totalReviews > 0 ? Math.round((successful / totalReviews) * 100) / 100 : 0;
      return { total: allVocab.length, newCount, learning, known, dueToday, retentionRate };
    },
  };
}
