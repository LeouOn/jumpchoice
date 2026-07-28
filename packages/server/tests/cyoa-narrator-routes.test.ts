import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { cyoaRoutes } from "../src/routes/cyoa.routes.js";

vi.mock("../../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../src/services/storage/connections.storage.js", () => ({
  createConnectionsStorage: vi.fn(),
}));

vi.mock("../src/services/llm/provider-registry.js", () => ({
  createLLMProvider: vi.fn(),
}));

vi.mock("../src/services/cyoa/cyoa-extractor.js", () => ({
  extractFromImage: vi.fn(),
}));

vi.mock("../src/services/cyoa/cyoa-merger.js", () => ({
  mergeExtractions: vi.fn(),
}));

vi.mock("../src/services/cyoa/cyoa-analyzer.js", () => ({
  analyzeDocument: vi.fn(),
}));

function createMockDB() {
  const docs: any[] = [];
  const images: any[] = [];
  const choices: any[] = [];
  const builds: any[] = [];

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
    if (name.includes("cyoa_builds")) return builds;
    return [];
  }

  return {
    _docs: docs,
    _images: images,
    _choices: choices,
    _builds: builds,
    select(fields?: any) {
      return {
        from(table: any) {
          const name = tableName(table);
          const data = () => [...tableData(name)];
          const chainable = {
            where(condition: any) {
              return chainable;
            },
            orderBy(...args: any[]) {
              return chainable;
            },
            then(resolve: any, reject?: any) {
              return Promise.resolve(data()).then(resolve, reject);
            },
          };
          return chainable;
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
  app.decorate("db", mockDB as any);
  await app.register(cyoaRoutes, { prefix: "/api/cyoa" });
  return app;
}

describe("POST /api/cyoa/prompts", () => {
  let app: Fastify.FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when documentId is missing", async () => {
    app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: { buildId: "b1" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("documentId and buildId required");
    await app.close();
  });

  it("returns 400 when buildId is missing", async () => {
    app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: { documentId: "d1" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("documentId and buildId required");
    await app.close();
  });

  it("returns 400 when both are missing", async () => {
    app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("returns 404 when document not found", async () => {
    app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: { documentId: "missing", buildId: "b1" },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("Document not found");
    await app.close();
  });

  it("returns 404 when build not found", async () => {
    app = await buildApp();
    mockDB._docs.push({
      id: "doc1",
      name: "Test CYOA",
      status: "analyzed",
      analysis: "{}",
      mergedDocument: "{}",
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: { documentId: "doc1", buildId: "missing" },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("Build not found");
    await app.close();
  });

  it("returns 404 when build belongs to different document", async () => {
    app = await buildApp();
    mockDB._docs.push({
      id: "doc1",
      name: "Test CYOA",
      status: "analyzed",
      analysis: "{}",
      mergedDocument: "{}",
    });
    mockDB._builds.push({
      id: "build1",
      documentId: "other-doc",
      name: "Build",
      selectedChoiceIds: '["c1"]',
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: { documentId: "doc1", buildId: "build1" },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("Build not found");
    await app.close();
  });

  it("returns all four prompts for valid document + build", async () => {
    app = await buildApp();
    mockDB._docs.push({
      id: "doc1",
      name: "Epic Fantasy CYOA",
      description: "A grand adventure",
      status: "analyzed",
      pointBudget: 100,
      analysis: JSON.stringify({
        topSynergies: [
          { choiceIds: ["c1", "c2"], description: "Might & Magic", combinedValue: "high" },
        ],
      }),
      mergedDocument: "{}",
    });
    mockDB._builds.push({
      id: "build1",
      documentId: "doc1",
      name: "My Hero",
      description: "A brave soul",
      selectedChoiceIds: '["c1","c2"]',
      notes: "",
    });
    mockDB._choices.push(
      {
        id: "c1",
        documentId: "doc1",
        name: "Fireball",
        description: "Hurl fire",
        category: "magic",
        pointCost: 15,
        tier: "S",
      },
      {
        id: "c2",
        documentId: "doc1",
        name: "Sword Mastery",
        description: "Master the blade",
        category: "combat",
        pointCost: 10,
        tier: "A",
      },
    );
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: { documentId: "doc1", buildId: "build1" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("narrator");
    expect(body).toHaveProperty("director");
    expect(body).toHaveProperty("world");
    expect(body).toHaveProperty("characters");

    expect(body.narrator).toContain("My Hero");
    expect(body.narrator).toContain("Fireball");
    expect(body.narrator).toContain("Sword Mastery");
    expect(body.narrator).toContain("Might & Magic");
    expect(body.narrator).toContain("25 points spent / 100 budget");
    expect(body.narrator).toContain("epic fantasy");

    expect(body.director).toContain("My Hero");
    expect(body.director).toContain("Information Control Rules");

    expect(body.world).toContain("BEHIND THE SCENES");
    expect(body.world).toContain("ESCALATE");

    expect(body.characters).toContain("Voice Profiles");
    await app.close();
  });

  it("handles build with empty selectedChoiceIds gracefully", async () => {
    app = await buildApp();
    mockDB._docs.push({
      id: "doc1",
      name: "Test",
      status: "analyzed",
      analysis: "{}",
      mergedDocument: "{}",
    });
    mockDB._builds.push({
      id: "build1",
      documentId: "doc1",
      name: "Empty Build",
      selectedChoiceIds: "[]",
    });
    mockDB._choices.push({
      id: "c1",
      documentId: "doc1",
      name: "Choice",
      category: "general",
      pointCost: 5,
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: { documentId: "doc1", buildId: "build1" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.narrator).toContain("0 points spent");
    expect(body.narrator).toContain("No active synergies detected");
    await app.close();
  });

  it("handles malformed selectedChoiceIds JSON gracefully", async () => {
    app = await buildApp();
    mockDB._docs.push({
      id: "doc1",
      name: "Test",
      status: "analyzed",
      analysis: "not-json",
      mergedDocument: "{}",
    });
    mockDB._builds.push({
      id: "build1",
      documentId: "doc1",
      name: "Broken Build",
      selectedChoiceIds: "not-valid-json",
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: { documentId: "doc1", buildId: "build1" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.narrator).toContain("0 points spent");
    await app.close();
  });

  it("handles malformed analysis JSON gracefully", async () => {
    app = await buildApp();
    mockDB._docs.push({
      id: "doc1",
      name: "Test",
      status: "analyzed",
      analysis: "broken",
      mergedDocument: "{}",
    });
    mockDB._builds.push({
      id: "build1",
      documentId: "doc1",
      name: "Build",
      selectedChoiceIds: '["c1"]',
    });
    mockDB._choices.push({
      id: "c1",
      documentId: "doc1",
      name: "Choice",
      category: "magic",
      pointCost: 5,
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: { documentId: "doc1", buildId: "build1" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.narrator).toContain("No active synergies detected");
    await app.close();
  });

  it("returns adversary prompt when difficulty.adversaryEnabled is true", async () => {
    app = await buildApp();
    mockDB._docs.push({
      id: "doc1",
      name: "Test",
      status: "analyzed",
      analysis: "{}",
      mergedDocument: "{}",
    });
    mockDB._builds.push({
      id: "build1",
      documentId: "doc1",
      name: "Build",
      selectedChoiceIds: '["c1"]',
    });
    mockDB._choices.push({
      id: "c1",
      documentId: "doc1",
      name: "Fireball",
      category: "magic",
      pointCost: 5,
      stealth: false,
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: {
        documentId: "doc1",
        buildId: "build1",
        difficulty: { adversaryEnabled: true },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.adversary).toBeTruthy();
    expect(body.adversary).toContain("Adversary");
    await app.close();
  });

  it("returns adversary: null when difficulty.adversaryEnabled is false", async () => {
    app = await buildApp();
    mockDB._docs.push({
      id: "doc1",
      name: "Test",
      status: "analyzed",
      analysis: "{}",
      mergedDocument: "{}",
    });
    mockDB._builds.push({
      id: "build1",
      documentId: "doc1",
      name: "Build",
      selectedChoiceIds: '["c1"]',
    });
    mockDB._choices.push({
      id: "c1",
      documentId: "doc1",
      name: "Fireball",
      category: "magic",
      pointCost: 5,
      stealth: false,
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: {
        documentId: "doc1",
        buildId: "build1",
        difficulty: { adversaryEnabled: false },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().adversary).toBeNull();
    await app.close();
  });

  it("applies difficulty modifiers to prompts", async () => {
    app = await buildApp();
    mockDB._docs.push({
      id: "doc1",
      name: "Test",
      status: "analyzed",
      analysis: "{}",
      mergedDocument: "{}",
    });
    mockDB._builds.push({
      id: "build1",
      documentId: "doc1",
      name: "Build",
      selectedChoiceIds: '["c1"]',
    });
    mockDB._choices.push({
      id: "c1",
      documentId: "doc1",
      name: "Fireball",
      category: "magic",
      pointCost: 5,
      stealth: false,
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: {
        documentId: "doc1",
        buildId: "build1",
        difficulty: { directorAggression: 5, worldEscalation: 5, informationLeakage: 5 },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.director).toContain("Actively deceive");
    expect(body.world).toContain("React immediately");
    expect(body.director).toContain("Pass almost nothing");
    await app.close();
  });
});
