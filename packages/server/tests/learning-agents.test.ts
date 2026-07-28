import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentResult } from "@jumpchoice/shared";

// Mock executeAgent so we don't need a real LLM
vi.mock("../src/services/agents/agent-executor.js", () => ({
  executeAgent: vi.fn(),
}));

import { executeAgent } from "../src/services/agents/agent-executor.js";
import { executeWordExtractor } from "../src/services/agents/word-extractor.js";
import { executeGrammarCorrector } from "../src/services/agents/grammar-corrector.js";
import { executeProficiencyEstimator } from "../src/services/agents/proficiency-estimator.js";

vi.mock("../../lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockExecuteAgent = vi.mocked(executeAgent);

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-agent-id",
    type: "word-extractor",
    name: "Test Agent",
    phase: "post_processing",
    promptTemplate: "test prompt",
    connectionId: null,
    settings: {},
    ...overrides,
  };
}

function makeContext(messages: Array<{ role: string; content: string }> = []) {
  return {
    chatId: "chat-1",
    chatMode: "language_learning",
    recentMessages: messages,
    mainResponse: null,
    gameState: null,
    characters: [],
    persona: null,
    memory: {},
    activatedLorebookEntries: null,
    writableLorebookIds: null,
    chatSummary: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Word Extractor ──

describe("executeWordExtractor", () => {
  it("returns empty data when no assistant message exists", async () => {
    const config = makeConfig({ type: "word-extractor" });
    const context = makeContext([{ role: "user", content: "Hello" }]);

    const result = await executeWordExtractor(config, context, {} as any, "test-model");

    expect(result.type).toBe("vocab_extraction");
    expect(result.data).toEqual([]);
    expect(result.success).toBe(true);
    expect(result.tokensUsed).toBe(0);
    expect(mockExecuteAgent).not.toHaveBeenCalled();
  });

  it("returns extracted vocab from executeAgent result", async () => {
    const vocabItems = [
      { lemma: "gato", surface: "gatos", type: "word", translation: "cats", contextSentence: "Los gatos son bonitos.", tags: ["animals"] },
    ];
    mockExecuteAgent.mockResolvedValue({
      agentId: "test-agent-id",
      agentType: "word-extractor",
      type: "vocab_extraction",
      data: vocabItems,
      tokensUsed: 50,
      durationMs: 100,
      success: true,
      error: null,
    });

    const config = makeConfig({ type: "word-extractor" });
    const context = makeContext([
      { role: "user", content: "Hola" },
      { role: "assistant", content: "Los gatos son bonitos." },
    ]);

    const result = await executeWordExtractor(config, context, {} as any, "test-model");

    expect(result.type).toBe("vocab_extraction");
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as any[]).length).toBe(1);
    expect((result.data as any[])[0].lemma).toBe("gato");
  });

  it("returns non-array data as empty array", async () => {
    mockExecuteAgent.mockResolvedValue({
      agentId: "test-agent-id",
      agentType: "word-extractor",
      type: "vocab_extraction",
      data: "not an array",
      tokensUsed: 10,
      durationMs: 50,
      success: true,
      error: null,
    });

    const config = makeConfig({ type: "word-extractor" });
    const context = makeContext([
      { role: "assistant", content: "Some text" },
    ]);

    const result = await executeWordExtractor(config, context, {} as any, "test-model");

    expect(result.data).toEqual([]);
  });

  it("propagates failure from executeAgent", async () => {
    mockExecuteAgent.mockResolvedValue({
      agentId: "test-agent-id",
      agentType: "word-extractor",
      type: "vocab_extraction",
      data: null,
      tokensUsed: 0,
      durationMs: 0,
      success: false,
      error: "LLM error",
    });

    const config = makeConfig({ type: "word-extractor" });
    const context = makeContext([
      { role: "assistant", content: "Some text" },
    ]);

    const result = await executeWordExtractor(config, context, {} as any, "test-model");

    expect(result.success).toBe(false);
    expect(result.error).toBe("LLM error");
  });
});

// ── Grammar Corrector ──

describe("executeGrammarCorrector", () => {
  it("returns empty data when no user message exists", async () => {
    const config = makeConfig({ type: "grammar-corrector" });
    const context = makeContext([{ role: "assistant", content: "Hello" }]);

    const result = await executeGrammarCorrector(config, context, {} as any, "test-model");

    expect(result.type).toBe("grammar_correction");
    expect(result.data).toEqual([]);
    expect(result.success).toBe(true);
    expect(result.tokensUsed).toBe(0);
    expect(mockExecuteAgent).not.toHaveBeenCalled();
  });

  it("returns corrections from executeAgent result", async () => {
    const corrections = [
      { original: "Yo tengo hambre", corrected: "Tengo hambre", explanation: "Subject pronoun is redundant in Spanish", severity: "minor" },
    ];
    mockExecuteAgent.mockResolvedValue({
      agentId: "test-agent-id",
      agentType: "grammar-corrector",
      type: "grammar_correction",
      data: corrections,
      tokensUsed: 60,
      durationMs: 120,
      success: true,
      error: null,
    });

    const config = makeConfig({ type: "grammar-corrector" });
    const context = makeContext([
      { role: "user", content: "Yo tengo hambre" },
      { role: "assistant", content: "Sí, vamos a comer." },
    ]);

    const result = await executeGrammarCorrector(config, context, {} as any, "test-model");

    expect(result.type).toBe("grammar_correction");
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as any[]).length).toBe(1);
    expect((result.data as any[])[0].corrected).toBe("Tengo hambre");
  });

  it("returns non-array data as empty array", async () => {
    mockExecuteAgent.mockResolvedValue({
      agentId: "test-agent-id",
      agentType: "grammar-corrector",
      type: "grammar_correction",
      data: { not: "an array" },
      tokensUsed: 10,
      durationMs: 50,
      success: true,
      error: null,
    });

    const config = makeConfig({ type: "grammar-corrector" });
    const context = makeContext([
      { role: "user", content: "Some text" },
    ]);

    const result = await executeGrammarCorrector(config, context, {} as any, "test-model");

    expect(result.data).toEqual([]);
  });

  it("propagates failure from executeAgent", async () => {
    mockExecuteAgent.mockResolvedValue({
      agentId: "test-agent-id",
      agentType: "grammar-corrector",
      type: "grammar_correction",
      data: null,
      tokensUsed: 0,
      durationMs: 0,
      success: false,
      error: "timeout",
    });

    const config = makeConfig({ type: "grammar-corrector" });
    const context = makeContext([
      { role: "user", content: "Some text" },
    ]);

    const result = await executeGrammarCorrector(config, context, {} as any, "test-model");

    expect(result.success).toBe(false);
    expect(result.error).toBe("timeout");
  });
});

// ── Proficiency Estimator ──

describe("executeProficiencyEstimator", () => {
  it("returns proficiency estimate from executeAgent result", async () => {
    const estimate = { level: "B1", confidence: 0.8, reasoning: "Uses simple past tense correctly" };
    mockExecuteAgent.mockResolvedValue({
      agentId: "test-agent-id",
      agentType: "proficiency-estimator",
      type: "proficiency_estimate",
      data: estimate,
      tokensUsed: 80,
      durationMs: 200,
      success: true,
      error: null,
    });

    const config = makeConfig({ type: "proficiency-estimator", phase: "pre_generation" });
    const context = makeContext([
      { role: "user", content: "Ayer yo fui a la tienda." },
    ]);

    const result = await executeProficiencyEstimator(config, context, {} as any, "test-model");

    expect(result.type).toBe("proficiency_estimate");
    expect(result.success).toBe(true);
    expect((result.data as any).level).toBe("B1");
    expect((result.data as any).confidence).toBe(0.8);
  });

  it("propagates failure from executeAgent", async () => {
    mockExecuteAgent.mockResolvedValue({
      agentId: "test-agent-id",
      agentType: "proficiency-estimator",
      type: "proficiency_estimate",
      data: null,
      tokensUsed: 0,
      durationMs: 0,
      success: false,
      error: "model overloaded",
    });

    const config = makeConfig({ type: "proficiency-estimator", phase: "pre_generation" });
    const context = makeContext([]);

    const result = await executeProficiencyEstimator(config, context, {} as any, "test-model");

    expect(result.success).toBe(false);
    expect(result.error).toBe("model overloaded");
  });
});
