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

const addVocabSchema = z.object({
  userId: z.string(),
  languageCode: z.string(),
  lemma: z.string(),
  surface: z.string(),
  type: z.enum(["word", "phrase"]),
  translation: z.string(),
  contextSentence: z.string(),
  sourceChatId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const submitReviewsSchema = z.object({
  vocabularyIds: z.array(z.string()),
  grade: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

export async function learningRoutes(app: FastifyInstance) {
  const coordinator = createLearningCoordinator(app.db);

  // Languages
  app.get<{ Querystring: { userId: string } }>("/languages", async (req) => {
    const userId = req.query.userId;
    return coordinator.proficiency.listLanguages(userId);
  });
  app.post("/languages", async (req, _reply) => {
    const input = addLanguageSchema.parse(req.body);
    return coordinator.proficiency.addLanguage(input);
  });
  app.patch<{ Params: { id: string } }>("/languages/:id/level", async (req) => {
    const { level, confidence, source } = setLevelSchema.parse(req.body);
    await coordinator.proficiency.setLevel(req.params.id, level, confidence, source);
    return { ok: true };
  });

  // Vocabulary
  app.get<{
    Querystring: {
      userId: string;
      languageCode: string;
      status?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };
  }>("/vocab", async (req) => {
    const { userId, languageCode, status, search, limit, offset } = req.query;
    return coordinator.vocab.listByLanguage(userId, languageCode, {
      status,
      search,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  });
  app.post<{ Body: z.infer<typeof addVocabSchema> }>("/vocab", async (req) => {
    const input = addVocabSchema.parse(req.body);
    return coordinator.vocab.add(input);
  });
  app.get<{ Querystring: { userId: string; languageCode: string } }>("/vocab/stats", async (req) => {
    const { userId, languageCode } = req.query;
    return coordinator.vocab.stats(userId, languageCode);
  });

  // Corrections
  app.get<{ Querystring: { chatId: string } }>("/corrections", async (req) => {
    const { chatId } = req.query;
    return coordinator.corrections.getByChat(chatId);
  });
  app.patch<{ Params: { id: string } }>("/corrections/:id/dismiss", async (req) => {
    await coordinator.corrections.dismiss(req.params.id);
    return { ok: true };
  });

  // Reviews
  app.post<{ Body: z.infer<typeof submitReviewsSchema> }>("/reviews", async (req) => {
    const { vocabularyIds, grade } = submitReviewsSchema.parse(req.body);
    return coordinator.scheduleReviews(vocabularyIds, grade);
  });
}
