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
  const messages: any[] = [];

  function tableName(table: any): string {
    for (const sym of Object.getOwnPropertySymbols(table)) {
      if (String(sym).includes("Name")) return (table as any)[sym];
    }
    return "unknown";
  }

  return {
    _messages: messages,
    select(_fields?: any) {
      return {
        from(table: any) {
          const name = tableName(table);
          const data = name === "messages" ? messages : [];
          const chainable: any = {
            where(_condition: any) { return chainable; },
            orderBy(..._args: any[]) { return chainable; },
            then(resolve: any, reject?: any) { return Promise.resolve([...data]).then(resolve, reject); },
          };
          return chainable;
        },
      };
    },
    insert(_table: any) {
      return {
        values(rows: any) {
          const input = Array.isArray(rows) ? rows : [rows];
          return { run: async () => { messages.push(...input); } };
        },
      };
    },
    update(_table: any) {
      return {
        set(_patch: any) {
          return { where(_condition: any) { return { run: async () => {} }; } };
        },
      };
    },
    delete(_table: any) {
      return {
        where(_condition: any) { return { run: async () => {} }; },
      };
    },
  };
}

describe("GET /api/cyoa/chats/:chatId/agent-outputs", () => {
  let app: any;
  let mockDB: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no messages", async () => {
    mockDB = createMockDB();
    app = Fastify();
    app.decorate("db", mockDB as any);
    await app.register(cyoaRoutes, { prefix: "/api/cyoa" });
    const res = await app.inject({ method: "GET", url: "/api/cyoa/chats/chat1/agent-outputs" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ outputs: [] });
    await app.close();
  });

  it("returns cyoa-world agent outputs", async () => {
    mockDB = createMockDB();
    mockDB._messages.push({
      id: "m1",
      chatId: "chat1",
      role: "assistant",
      content: "",
      extra: JSON.stringify({ agentType: "cyoa-world", agentOutput: "The guard is suspicious." }),
      createdAt: "2026-01-01T00:00:00Z",
    });
    app = Fastify();
    app.decorate("db", mockDB as any);
    await app.register(cyoaRoutes, { prefix: "/api/cyoa" });
    const res = await app.inject({ method: "GET", url: "/api/cyoa/chats/chat1/agent-outputs" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.outputs).toHaveLength(1);
    expect(body.outputs[0]).toMatchObject({
      id: "m1",
      agentType: "cyoa-world",
      text: "The guard is suspicious.",
      createdAt: "2026-01-01T00:00:00Z",
    });
    await app.close();
  });

  it("returns outputs for all cyoa-prefixed agent types", async () => {
    mockDB = createMockDB();
    mockDB._messages.push(
      {
        id: "m1",
        chatId: "chat1",
        role: "assistant",
        content: "",
        extra: JSON.stringify({ agentType: "cyoa-world", agentOutput: "world text" }),
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "m2",
        chatId: "chat1",
        role: "assistant",
        content: "",
        extra: JSON.stringify({ agentType: "cyoa-director", agentOutput: "director text" }),
        createdAt: "2026-01-01T00:00:01Z",
      },
      {
        id: "m3",
        chatId: "chat1",
        role: "assistant",
        content: "",
        extra: JSON.stringify({ agentType: "cyoa-adversary", agentOutput: "adversary text" }),
        createdAt: "2026-01-01T00:00:02Z",
      },
    );
    app = Fastify();
    app.decorate("db", mockDB as any);
    await app.register(cyoaRoutes, { prefix: "/api/cyoa" });
    const res = await app.inject({ method: "GET", url: "/api/cyoa/chats/chat1/agent-outputs" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.outputs).toHaveLength(3);
    expect(body.outputs.map((o: any) => o.agentType)).toEqual(["cyoa-world", "cyoa-director", "cyoa-adversary"]);
    await app.close();
  });

  it("filters out non-cyoa agent outputs", async () => {
    mockDB = createMockDB();
    mockDB._messages.push({
      id: "m1",
      chatId: "chat1",
      role: "assistant",
      content: "",
      extra: JSON.stringify({ agentType: "world-state", agentOutput: "should not appear" }),
      createdAt: "2026-01-01T00:00:00Z",
    });
    app = Fastify();
    app.decorate("db", mockDB as any);
    await app.register(cyoaRoutes, { prefix: "/api/cyoa" });
    const res = await app.inject({ method: "GET", url: "/api/cyoa/chats/chat1/agent-outputs" });
    expect(res.statusCode).toBe(200);
    expect(res.json().outputs).toEqual([]);
    await app.close();
  });

  it("filters out messages with no agentOutput", async () => {
    mockDB = createMockDB();
    mockDB._messages.push({
      id: "m1",
      chatId: "chat1",
      role: "assistant",
      content: "",
      extra: JSON.stringify({ agentType: "cyoa-world" }),
      createdAt: "2026-01-01T00:00:00Z",
    });
    app = Fastify();
    app.decorate("db", mockDB as any);
    await app.register(cyoaRoutes, { prefix: "/api/cyoa" });
    const res = await app.inject({ method: "GET", url: "/api/cyoa/chats/chat1/agent-outputs" });
    expect(res.statusCode).toBe(200);
    expect(res.json().outputs).toEqual([]);
    await app.close();
  });

  it("tolerates malformed JSON in extra field", async () => {
    mockDB = createMockDB();
    mockDB._messages.push(
      {
        id: "m1",
        chatId: "chat1",
        role: "assistant",
        content: "",
        extra: "not-json",
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "m2",
        chatId: "chat1",
        role: "assistant",
        content: "",
        extra: JSON.stringify({ agentType: "cyoa-world", agentOutput: "valid one" }),
        createdAt: "2026-01-01T00:00:01Z",
      },
    );
    app = Fastify();
    app.decorate("db", mockDB as any);
    await app.register(cyoaRoutes, { prefix: "/api/cyoa" });
    const res = await app.inject({ method: "GET", url: "/api/cyoa/chats/chat1/agent-outputs" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.outputs).toHaveLength(1);
    expect(body.outputs[0].id).toBe("m2");
    await app.close();
  });
});
