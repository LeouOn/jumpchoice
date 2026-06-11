import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createLearningCoordinator } from "../services/learning/learning-coordinator.js";

const addLanguageSchema = z.object({
  userId: z.string(),
  name: z.string().min(1),
  code: z.string().length(2),
  nativeLanguage: z.string().optional(),
});

const setLevelSchema = z.object({
  level: z.enum(["A1","A2","B1","B2","C1","C2"]),
  confidence: z.number().min(0).max(1),
  source: z.enum(["user_set","ai_estimated","hybrid"]),
});

export async function learningRoutes(app: FastifyInstance) {
  const coordinator = createLearningCoordinator(app.db);

  // Languages
  app.get("/languages", async (req) => {
    const userId = (req.query as any).userId;
    return coordinator.proficiency.listLanguages(userId);
  });
  app.post("/languages", async (req, reply) => {
    const input = addLanguageSchema.parse(req.body);
    return coordinator.proficiency.addLanguage(input);
  });
  app.patch<{ Params: { id: string } }>("/languages/:id/level", async (req) => {
    const { level, confidence, source } = setLevelSchema.parse(req.body);
    await coordinator.proficiency.setLevel(req.params.id, level, confidence, source);
    return { ok: true };
  });

  // Vocabulary
  app.get("/vocab", async (req) => {
    const { userId, languageCode, status, search, limit, offset } = req.query as any;
    return coordinator.vocab.listByLanguage(userId, languageCode, { status, search, limit, offset });
  });
  app.post("/vocab", async (req) => {
    const input = (req.body as any);
    return coordinator.vocab.add(input);
  });
  app.get("/vocab/stats", async (req) => {
    const { userId, languageCode } = req.query as any;
    return coordinator.vocab.stats(userId, languageCode);
  });

  // Corrections
  app.get("/corrections", async (req) => {
    const { chatId } = req.query as any;
    return coordinator.corrections.getByChat(chatId);
  });
  app.patch<{ Params: { id: string } }>("/corrections/:id/dismiss", async (req) => {
    await coordinator.corrections.dismiss(req.params.id);
    return { ok: true };
  });

  // Reviews
  app.post("/reviews", async (req) => {
    const { vocabularyIds, grade } = req.body as { vocabularyIds: string[]; grade: 1|2|3|4 };
    return coordinator.scheduleReviews(vocabularyIds, grade);
  });
}
