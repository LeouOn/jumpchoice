import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { cyoaBuildsRoutes } from "../src/routes/cyoa-builds.routes.js";

vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function createMockDB() {
  const docs: any[] = [];
  const builds: any[] = [];

  function tableName(table: any): string {
    for (const sym of Object.getOwnPropertySymbols(table)) {
      if (String(sym).includes("Name")) return (table as any)[sym];
    }
    return "unknown";
  }

  function tableData(name: string) {
    if (name.includes("cyoa_documents")) return docs;
    if (name.includes("cyoa_builds")) return builds;
    return [];
  }

  return {
    _docs: docs,
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
  await app.register(cyoaBuildsRoutes, { prefix: "/api/cyoa" });
  return app;
}

describe("CYOA Builds Routes", () => {
  let app: Fastify.FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /:docId/builds returns empty list", async () => {
    app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/cyoa/doc1/builds" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
    await app.close();
  });

  it("POST /:docId/builds creates a build with name", async () => {
    app = await buildApp();
    mockDB._docs.push({ id: "doc1", name: "Test Doc", createdAt: "2026-01-01", updatedAt: "2026-01-01" });
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/doc1/builds",
      payload: { name: "My Build" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("My Build");
    expect(body.selectedChoiceIds).toEqual([]);
    await app.close();
  });

  it("POST /:docId/builds returns 404 for missing document", async () => {
    app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/missing-doc/builds",
      payload: { name: "Build" },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("Document not found");
    await app.close();
  });

  it("GET /:docId/builds/:buildId returns 404 for missing build", async () => {
    app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/cyoa/doc1/builds/nonexistent" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("Build not found");
    await app.close();
  });

  it("PATCH /:docId/builds/:buildId returns 404 for missing build", async () => {
    app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/cyoa/doc1/builds/nonexistent",
      payload: { name: "Updated" },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("Build not found");
    await app.close();
  });

  it("DELETE /:docId/builds/:buildId returns 404 for missing build", async () => {
    app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: "/api/cyoa/doc1/builds/nonexistent" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("Build not found");
    await app.close();
  });

  it("DELETE /:docId/builds/:buildId deletes a build successfully", async () => {
    app = await buildApp();
    mockDB._builds.push({
      id: "build1",
      documentId: "doc1",
      name: "Build",
      description: "",
      selectedChoiceIds: "[]",
      notes: "",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    });
    const res = await app.inject({ method: "DELETE", url: "/api/cyoa/doc1/builds/build1" });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
    expect(mockDB._builds).toHaveLength(0);
    await app.close();
  });

  it("POST /:docId/builds uses default name when not provided", async () => {
    app = await buildApp();
    mockDB._docs.push({ id: "doc1", name: "Test Doc", createdAt: "2026-01-01", updatedAt: "2026-01-01" });
    const res = await app.inject({
      method: "POST",
      url: "/api/cyoa/doc1/builds",
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("");
    expect(body.description).toBe("");
    await app.close();
  });
});
