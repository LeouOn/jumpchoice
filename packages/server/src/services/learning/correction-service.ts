import { eq, desc } from "../../db/file-query.js";
import type { DB } from "../../db/connection.js";
import { corrections } from "../../db/schema/learning.js";
import { newId, now } from "../../utils/id-generator.js";
import type { NewCorrection, Correction } from "@jumpchoice/shared";

export function createCorrectionService(db: DB) {
  return {
    async add(input: NewCorrection): Promise<Correction> {
      const id = newId();
      const timestamp = now();
      await db.insert(corrections).values({
        id,
        userId: input.userId,
        languageCode: input.languageCode,
        chatId: input.chatId,
        messageId: input.messageId ?? null,
        original: input.original,
        corrected: input.corrected,
        explanation: input.explanation,
        severity: input.severity,
        dismissed: "false",
        createdAt: timestamp,
      });
      return (await this.getById(id))!;
    },

    async getById(id: string): Promise<Correction | null> {
      const rows = await db.select().from(corrections).where(eq(corrections.id, id));
      if (!rows[0]) return null;
      return { ...rows[0], dismissed: rows[0].dismissed === "true" } as unknown as Correction;
    },

    async getByChat(chatId: string): Promise<Correction[]> {
      const rows = await db.select().from(corrections)
        .where(eq(corrections.chatId, chatId))
        .orderBy(desc(corrections.createdAt));
      return rows.map(r => ({ ...r, dismissed: r.dismissed === "true" })) as unknown as Correction[];
    },

    async dismiss(id: string): Promise<void> {
      await db.update(corrections).set({ dismissed: "true" }).where(eq(corrections.id, id));
    },
  };
}
