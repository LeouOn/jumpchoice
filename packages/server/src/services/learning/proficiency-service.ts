import { eq, and } from "../../db/file-query.js";
import type { DB } from "../../db/connection.js";
import { languages, proficiencySnapshots } from "../../db/schema/learning.js";
import { newId, now } from "../../utils/id-generator.js";
import type { LanguageConfig, CefrLevel, ProficiencySource } from "@jumpchoice/shared";

export function createProficiencyService(db: DB) {
  return {
    async addLanguage(input: { userId: string; name: string; code: string; nativeLanguage?: string }): Promise<LanguageConfig> {
      const id = newId();
      const timestamp = now();
      await db.insert(languages).values({
        id,
        userId: input.userId,
        name: input.name,
        code: input.code,
        nativeLanguage: input.nativeLanguage ?? "English",
        tutorPersona: "default",
        createdAt: timestamp,
      });
      return (await this.getLanguage(id))!;
    },

    async getLanguage(id: string): Promise<LanguageConfig | null> {
      const rows = await db.select().from(languages).where(eq(languages.id, id));
      return (rows[0] ?? null) as unknown as LanguageConfig | null;
    },

    async listLanguages(userId: string): Promise<LanguageConfig[]> {
      const rows = await db.select().from(languages).where(eq(languages.userId, userId));
      return rows as unknown as LanguageConfig[];
    },

    async setLevel(languageId: string, level: CefrLevel, confidence: number, source: ProficiencySource): Promise<void> {
      const lang = await this.getLanguage(languageId);
      if (!lang) throw new Error("Language not found");
      await db.update(languages)
        .set({ proficiencyLevel: level, proficiencyConfidence: confidence })
        .where(eq(languages.id, languageId));
      await db.insert(proficiencySnapshots).values({
        id: newId(),
        userId: lang.userId,
        languageCode: lang.code,
        level,
        confidence,
        source,
        estimatedAt: now(),
      });
    },

    async getHistory(userId: string, languageCode: string) {
      return db.select().from(proficiencySnapshots)
        .where(and(
          eq(proficiencySnapshots.userId, userId),
          eq(proficiencySnapshots.languageCode, languageCode),
        ));
    },
  };
}
