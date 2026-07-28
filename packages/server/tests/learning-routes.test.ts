import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { learningRoutes } from "../src/routes/learning.routes.js";

// Mock the logger
vi.mock("../../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// In-memory stores
const languages: any[] = [];
const vocabItems: any[] = [];
const srsStates: any[] = [];
const srsReviewsData: any[] = [];
const correctionsData: any[] = [];

function createMockDB() {
  function makeChain(data: any[]) {
    const p = Promise.resolve(data);
    return {
      where(_condition: any) { return makeChain(data); },
      orderBy(..._args: any[]) { return makeChain(data); },
      limit(n: number) { return makeChain(data.slice(0, n)); },
      offset(n: number) { return makeChain(data.slice(n)); },
      then(resolve: any, reject: any) { return p.then(resolve, reject); },
      catch(reject: any) { return p.catch(reject); },
    };
  }

  return {
    select(_fields?: any) {
      return {
        from(table: any) {
          const name = getTableName(table);
          return makeChain([...getTableData(name)]);
        },
      };
    },
    insert(table: any) {
      const name = getTableName(table);
      return {
        values(rows: any) {
          const input = Array.isArray(rows) ? rows : [rows];
          pushToTable(name, input);
          return Promise.resolve() as any;
        },
      };
    },
    update(table: any) {
      const name = getTableName(table);
      return {
        set(patch: any) {
          return {
            where(_condition: any) {
              const data = getTableData(name);
              for (const row of data) Object.assign(row, patch);
              return Promise.resolve() as any;
            },
          };
        },
      };
    },
  };
}

function getTableData(name: string): any[] {
  if (name === "languages") return languages;
  if (name === "vocabulary") return vocabItems;
  if (name === "srs_state") return srsStates;
  if (name === "srs_reviews") return srsReviewsData;
  if (name === "corrections") return correctionsData;
  return [];
}

function pushToTable(name: string, items: any[]) {
  if (name === "languages") languages.push(...items);
  else if (name === "vocabulary") vocabItems.push(...items);
  else if (name === "srs_state") srsStates.push(...items);
  else if (name === "srs_reviews") srsReviewsData.push(...items);
  else if (name === "corrections") correctionsData.push(...items);
}

function getTableName(table: any): string {
  for (const sym of Object.getOwnPropertySymbols(table)) {
    if (String(sym).includes("Name")) return (table as any)[sym];
  }
  return "unknown";
}

async function buildApp() {
  const app = Fastify();
  app.decorate("db", createMockDB() as any);
  await app.register(learningRoutes, { prefix: "/api/learning" });
  return app;
}

describe("Learning Routes", () => {
  let app: Fastify.FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    languages.length = 0;
    vocabItems.length = 0;
    srsStates.length = 0;
    srsReviewsData.length = 0;
    correctionsData.length = 0;
  });

  describe("POST /api/learning/languages", () => {
    it("creates a language and returns 200", async () => {
      app = await buildApp();
      const res = await app.inject({
        method: "POST",
        url: "/api/learning/languages",
        payload: {
          userId: "user1",
          name: "Japanese",
          code: "ja",
        },
      });
      expect(res.statusCode).toBe(200);
      expect(languages).toHaveLength(1);
      expect(languages[0].userId).toBe("user1");
      expect(languages[0].code).toBe("ja");
      await app.close();
    });
  });

  describe("GET /api/learning/languages", () => {
    it("returns list of languages for a user", async () => {
      app = await buildApp();
      languages.push({
        id: "lang1",
        userId: "user1",
        name: "Japanese",
        code: "ja",
        nativeLanguage: "English",
        proficiencyLevel: null,
        proficiencyConfidence: null,
        tutorPersona: "default",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      const res = await app.inject({
        method: "GET",
        url: "/api/learning/languages?userId=user1",
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
      expect(res.json()[0].code).toBe("ja");
      await app.close();
    });
  });

  describe("POST /api/learning/vocab", () => {
    it("adds vocabulary and returns the item", async () => {
      app = await buildApp();
      const res = await app.inject({
        method: "POST",
        url: "/api/learning/vocab",
        payload: {
          userId: "user1",
          languageCode: "ja",
          lemma: "食べる",
          surface: "食べる",
          type: "word",
          translation: "to eat",
          contextSentence: "私はりんごを食べる",
        },
      });
      expect(res.statusCode).toBe(200);
      expect(vocabItems).toHaveLength(1);
      expect(srsStates).toHaveLength(1);
      expect(vocabItems[0].lemma).toBe("食べる");
      await app.close();
    });
  });

  describe("GET /api/learning/vocab", () => {
    it("returns list of vocabulary items", async () => {
      app = await buildApp();
      vocabItems.push({
        id: "v1",
        userId: "user1",
        languageCode: "ja",
        lemma: "食べる",
        surface: "食べる",
        type: "word",
        translation: "to eat",
        contextSentence: "",
        sourceChatId: null,
        tags: "[]",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      const res = await app.inject({
        method: "GET",
        url: "/api/learning/vocab?userId=user1&languageCode=ja",
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(1);
      expect(body[0].lemma).toBe("食べる");
      await app.close();
    });
  });

  describe("POST /api/learning/reviews", () => {
    it("schedules reviews for vocabulary items", async () => {
      app = await buildApp();
      srsStates.push({
        id: "srs1",
        vocabularyId: "v1",
        stability: 1.0,
        difficulty: 5.0,
        lastReview: null,
        nextDue: "2026-01-01T00:00:00.000Z",
        reps: 0,
        lapses: 0,
        suspended: "false",
      });
      const res = await app.inject({
        method: "POST",
        url: "/api/learning/reviews",
        payload: {
          vocabularyIds: ["v1"],
          grade: 3,
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(1);
      expect(body[0].interval).toBeDefined();
      expect(srsReviewsData).toHaveLength(1);
      await app.close();
    });
  });
});
