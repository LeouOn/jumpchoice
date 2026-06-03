import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { cyoaRoutes } from "../src/routes/cyoa.routes.js";

vi.mock("../../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../src/services/storage/connections.storage.js", () => ({
  createConnectionsStorage: vi.fn(() => ({
    getWithKey: vi.fn().mockResolvedValue({
      id: "conn1",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "test-key",
      model: "gpt-4o",
      maxContext: 128000,
      openrouterProvider: null,
      maxTokensOverride: null,
    }),
    list: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../src/services/llm/provider-registry.js", () => ({
  createLLMProvider: vi.fn(() => ({
    chatComplete: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        tierList: { S: [], A: [], B: [], C: [], D: [], F: [] },
        categorySummaries: {},
        topSynergies: [],
        buildArchetypes: [],
        overallSummary: "Test analysis",
      }),
    }),
  })),
}));

vi.mock("../src/services/cyoa/cyoa-extractor.js", () => ({
  extractFromImage: vi.fn().mockResolvedValue({
    imageId: "test-img",
    pageNumber: 1,
    extractionMethod: "vision",
    title: "Test",
    description: null,
    pointBudget: null,
    categories: [],
    choices: [
      {
        name: "Test Choice",
        description: "",
        category: "test",
        pointCost: 5,
        prerequisites: [],
        tags: [],
        confidence: 0.9,
      },
    ],
    warnings: [],
  }),
}));

vi.mock("../src/services/cyoa/cyoa-merger.js", () => ({
  mergeExtractions: vi.fn(() => ({
    title: "Test CYOA",
    description: "",
    pointBudget: null,
    categories: ["test"],
    choices: [
      {
        id: "ch1",
        name: "Test Choice",
        description: "",
        category: "test",
        pointCost: 5,
        prerequisites: [],
        tags: [],
        sourceImageIds: ["test-img"],
      },
    ],
    imageCount: 1,
    mergedAt: new Date().toISOString(),
  })),
}));

vi.mock("../src/services/cyoa/cyoa-analyzer.js", () => ({
  analyzeDocument: vi.fn().mockResolvedValue({
    tierList: { S: [], A: [], B: [], C: [], D: [], F: [] },
    categorySummaries: {},
    topSynergies: [],
    buildArchetypes: [],
    overallSummary: "Test analysis",
    analyzedAt: new Date().toISOString(),
  }),
}));

function createMockDB() {
  const docs: any[] = [];
  const images: any[] = [];
  const choices: any[] = [];

  function tableName(table: any): string {
    for (const sym of Object.getOwnPropertySymbols(table)) {
      if (String(sym).includes("Name")) return (table as any)[sym];
    }
    return "unknown";
  }

  function tableData(name: string) {
    if (name.includes("cyoa_documents")) return docs;
    if (name.includes("cyoa_images")) return images;
    if (name.includes("cyoa_choices")) return choices;
    return [];
  }

  function applyFilter(arr: any[], condition: any): any[] {
    if (!condition) return arr;
    try {
      const condStr = JSON.stringify(condition);
      const isEq = Array.isArray(condition) && condition.length === 2;
      if (isEq) {
        const col = condition[0];
        const val = condition[1];
        if (typeof col === "string") {
          return arr.filter((r) => r[col] === val);
        }
      }
    } catch {}
    return arr;
  }

  return {
    _docs: docs,
    _images: images,
    _choices: choices,
    select(fields?: any) {
      return {
        from(table: any) {
          const name = tableName(table);
          const data = tableData(name);
          return {
            where(condition: any) {
              return Promise.resolve([...data]);
            },
            orderBy(...args: any[]) {
              return Promise.resolve([...data]);
            },
          };
        },
      };
    },
    insert(table: any) {
      const name = tableName(table);
      return {
        values(rows: any) {
          const input = Array.isArray(rows) ? rows : [rows];
          return {
            run: async () => {
              const data = tableData(name);
              data.push(...input);
            },
            onConflictDoUpdate: vi.fn(() => ({
              run: vi.fn(async () => {}),
            })),
          };
        },
      };
    },
    update(table: any) {
      const name = tableName(table);
      return {
        set(patch: any) {
          return {
            where(condition: any) {
              return {
                run: async () => {
                  const data = tableData(name);
                  for (const row of data) Object.assign(row, patch);
                },
              };
            },
          };
        },
      };
    },
    delete(table: any) {
      const name = tableName(table);
      return {
        where(condition: any) {
          return {
            run: async () => {
              const data = tableData(name);
              data.length = 0;
            },
          };
        },
      };
    },
  };
}

let mockDB: ReturnType<typeof createMockDB>;

async function buildApp() {
  mockDB = createMockDB();
  const app = Fastify();
  await app.register(multipart);
  app.decorate("db", mockDB as any);
  await app.register(cyoaRoutes, { prefix: "/api/cyoa" });
  return app;
}

describe("CYOA Routes", () => {
  let app: Fastify.FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe("GET /api/cyoa", () => {
    it("returns empty list when no documents exist", async () => {
      app = await buildApp();
      const res = await app.inject({ method: "GET", url: "/api/cyoa" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
      await app.close();
    });
  });

  describe("GET /api/cyoa/:id", () => {
    it("returns 404 for missing document", async () => {
      app = await buildApp();
      const res = await app.inject({
        method: "GET",
        url: "/api/cyoa/nonexistent",
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe("Not found");
      await app.close();
    });

    it("returns document with images and choices", async () => {
      app = await buildApp();
      mockDB._docs.push({
        id: "doc1",
        name: "Test",
        description: "",
        status: "analyzed",
        pointBudget: null,
        metadata: "{}",
        extractions: "[]",
        reviewedExtractions: "[]",
        mergedDocument: "{}",
        analysis: "{}",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      });
      mockDB._images.push({
        id: "img1",
        documentId: "doc1",
        filePath: "doc1/img.png",
        originalName: "img.png",
        mimeType: "image/png",
        byteSize: 1024,
        pageNumber: 1,
        extractionMethod: null,
        extractionResult: null,
        createdAt: "2026-01-01",
      });
      mockDB._choices.push({
        id: "ch1",
        documentId: "doc1",
        category: "test",
        name: "Test Choice",
        description: "",
        pointCost: 5,
        prerequisites: "[]",
        tags: "[]",
        tier: null,
        costEfficiency: null,
        synergyIds: "[]",
        analysisText: "",
        sourceImageIds: '["img1"]',
        metadata: "{}",
        createdAt: "2026-01-01",
      });
      const res = await app.inject({
        method: "GET",
        url: "/api/cyoa/doc1",
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe("doc1");
      expect(body.images).toHaveLength(1);
      expect(body.choices).toHaveLength(1);
      await app.close();
    });
  });

  describe("DELETE /api/cyoa/:id", () => {
    it("returns 404 for missing document", async () => {
      app = await buildApp();
      const res = await app.inject({
        method: "DELETE",
        url: "/api/cyoa/nonexistent",
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe("Not found");
      await app.close();
    });

    it("deletes an existing document", async () => {
      app = await buildApp();
      mockDB._docs.push({
        id: "doc1",
        name: "Test",
        description: "",
        status: "pending_extraction",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      });
      const res = await app.inject({
        method: "DELETE",
        url: "/api/cyoa/doc1",
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      await app.close();
    });
  });

  describe("PUT /api/cyoa/review", () => {
    it("returns 400 for missing fields", async () => {
      app = await buildApp();
      const res = await app.inject({
        method: "PUT",
        url: "/api/cyoa/review",
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("required");
      await app.close();
    });

    it("returns 404 for missing document", async () => {
      app = await buildApp();
      const res = await app.inject({
        method: "PUT",
        url: "/api/cyoa/review",
        payload: { documentId: "missing", extractions: [] },
      });
      expect(res.statusCode).toBe(404);
      await app.close();
    });

    it("rejects document not in pending_review status", async () => {
      app = await buildApp();
      mockDB._docs.push({
        id: "doc1",
        name: "Test",
        description: "",
        status: "pending_extraction",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      });
      const res = await app.inject({
        method: "PUT",
        url: "/api/cyoa/review",
        payload: { documentId: "doc1", extractions: [] },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("pending_review");
      await app.close();
    });

    it("accepts review for document in pending_review status", async () => {
      app = await buildApp();
      mockDB._docs.push({
        id: "doc1",
        name: "Test",
        description: "",
        status: "pending_review",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      });
      const res = await app.inject({
        method: "PUT",
        url: "/api/cyoa/review",
        payload: { documentId: "doc1", extractions: [{ test: true }] },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe("reviewed");
      await app.close();
    });
  });

  describe("POST /api/cyoa/extract", () => {
    it("returns 400 for missing documentId", async () => {
      app = await buildApp();
      const res = await app.inject({
        method: "POST",
        url: "/api/cyoa/extract",
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("required");
      await app.close();
    });

    it("returns 404 for missing document", async () => {
      app = await buildApp();
      const res = await app.inject({
        method: "POST",
        url: "/api/cyoa/extract",
        payload: { documentId: "missing", connectionId: "conn1" },
      });
      expect(res.statusCode).toBe(404);
      await app.close();
    });

    it("stores extractionMethod from extractor result, not hardcoded", async () => {
      const { extractFromImage } = await import("../src/services/cyoa/cyoa-extractor.js");
      (extractFromImage as any).mockResolvedValueOnce({
        imageId: "img1",
        pageNumber: 1,
        extractionMethod: "ocr",
        title: "OCR Test",
        description: null,
        pointBudget: null,
        categories: [],
        choices: [],
        warnings: [],
      });
      app = await buildApp();
      mockDB._docs.push({
        id: "doc1",
        name: "Test",
        description: "",
        status: "pending_extraction",
        pointBudget: null,
        metadata: "{}",
        extractions: "[]",
        reviewedExtractions: "[]",
        mergedDocument: "{}",
        analysis: "{}",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      });
      mockDB._images.push({
        id: "img1",
        documentId: "doc1",
        filePath: "doc1/img.png",
        originalName: "img.png",
        mimeType: "image/png",
        byteSize: 1024,
        pageNumber: 1,
        extractionMethod: null,
        extractionResult: null,
        createdAt: "2026-01-01",
      });
      const res = await app.inject({
        method: "POST",
        url: "/api/cyoa/extract",
        payload: { documentId: "doc1", connectionId: "conn1" },
      });
      expect(res.statusCode).toBe(200);
      expect(mockDB._images[0].extractionMethod).toBe("ocr");
      await app.close();
    });
  });

  describe("POST /api/cyoa/merge", () => {
    it("returns 400 for missing documentId", async () => {
      app = await buildApp();
      const res = await app.inject({
        method: "POST",
        url: "/api/cyoa/merge",
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("required");
      await app.close();
    });

    it("returns 404 for missing document", async () => {
      app = await buildApp();
      const res = await app.inject({
        method: "POST",
        url: "/api/cyoa/merge",
        payload: { documentId: "missing" },
      });
      expect(res.statusCode).toBe(404);
      await app.close();
    });

    it("rejects document not in reviewed status", async () => {
      app = await buildApp();
      mockDB._docs.push({
        id: "doc1",
        name: "Test",
        description: "",
        status: "pending_review",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      });
      const res = await app.inject({
        method: "POST",
        url: "/api/cyoa/merge",
        payload: { documentId: "doc1" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("reviewed");
      await app.close();
    });

    it("merges a reviewed document", async () => {
      app = await buildApp();
      mockDB._docs.push({
        id: "doc1",
        name: "Test",
        description: "",
        status: "reviewed",
        reviewedExtractions: JSON.stringify([{ test: true }]),
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      });
      const res = await app.inject({
        method: "POST",
        url: "/api/cyoa/merge",
        payload: { documentId: "doc1" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe("merged");
      await app.close();
    });
  });

  describe("POST /api/cyoa/analyze", () => {
    it("returns 400 for missing fields", async () => {
      app = await buildApp();
      const res = await app.inject({
        method: "POST",
        url: "/api/cyoa/analyze",
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      await app.close();
    });

    it("returns 404 for missing document", async () => {
      app = await buildApp();
      const res = await app.inject({
        method: "POST",
        url: "/api/cyoa/analyze",
        payload: { documentId: "missing", connectionId: "conn1" },
      });
      expect(res.statusCode).toBe(404);
      await app.close();
    });
  });
});
