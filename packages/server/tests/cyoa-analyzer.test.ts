import { describe, it, expect, vi } from "vitest";
import { analyzeDocument, parseAnalysisJSON } from "../src/services/cyoa/cyoa-analyzer.js";
import type { CYOADocument, CYOAAnalysis } from "../src/services/cyoa/cyoa-types.js";

vi.mock("../../lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function makeDocument(overrides: Partial<CYOADocument> = {}): CYOADocument {
  return {
    title: "Test CYOA",
    description: "A test CYOA",
    pointBudget: 100,
    categories: ["perks", "items"],
    choices: [
      {
        id: "ch1",
        name: "Fire Ball",
        description: "Shoot fire",
        category: "perks",
        pointCost: 10,
        prerequisites: [],
        tags: ["magic"],
        sourceImageIds: ["img1"],
      },
      {
        id: "ch2",
        name: "Shield",
        description: "Block damage",
        category: "items",
        pointCost: 15,
        prerequisites: [],
        tags: ["defense"],
        sourceImageIds: ["img1"],
      },
      {
        id: "ch3",
        name: "Heal",
        description: "Restore health",
        category: "perks",
        pointCost: 8,
        prerequisites: [],
        tags: ["magic", "healing"],
        sourceImageIds: ["img1"],
      },
    ],
    imageCount: 1,
    mergedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeProvider(response: any) {
  return {
    chatComplete: vi.fn().mockResolvedValue(
      typeof response === "string" ? { content: response } : response,
    ),
  };
}

const VALID_ANALYSIS = {
  tierList: {
    S: [
      {
        choiceId: "ch3",
        choiceName: "Heal",
        tier: "S",
        costEfficiency: 95,
        synergies: ["ch1"],
        analysis: "Best value heal in the game",
      },
    ],
    A: [
      {
        choiceId: "ch1",
        choiceName: "Fire Ball",
        tier: "A",
        costEfficiency: 80,
        synergies: ["ch3"],
        analysis: "Strong offensive pick",
      },
    ],
    B: [
      {
        choiceId: "ch2",
        choiceName: "Shield",
        tier: "B",
        costEfficiency: 60,
        synergies: [],
        analysis: "Decent defensive option",
      },
    ],
    C: [],
    D: [],
    F: [],
  },
  categorySummaries: {
    perks: "Strong offensive and healing options",
    items: "Limited but useful defensive items",
  },
  topSynergies: [
    {
      choiceIds: ["ch1", "ch3"],
      description: "Fire and healing combo for sustained combat",
      combinedValue: "high",
    },
    {
      choiceIds: ["ch2", "ch3"],
      description: "Tanky healer build",
      combinedValue: "medium",
    },
    {
      choiceIds: ["ch1", "ch2"],
      description: "Balanced fighter",
      combinedValue: "medium",
    },
  ],
  buildArchetypes: [
    {
      name: "Battle Mage",
      description: "Focus on offensive magic with healing support",
      recommendedChoiceIds: ["ch1", "ch3"],
      totalPointCost: 18,
      strengths: ["High damage", "Self-sustain"],
      weaknesses: ["No defense"],
    },
    {
      name: "Paladin",
      description: "Balanced defense and healing",
      recommendedChoiceIds: ["ch2", "ch3"],
      totalPointCost: 23,
      strengths: ["Tanky", "Self-heal"],
      weaknesses: ["Low damage"],
    },
  ],
  overallSummary:
    "This CYOA offers a well-balanced set of choices with clear synergy paths between perks and items.",
};

describe("CYOAAnalyzer", () => {
  it("should return full analysis on successful LLM response", async () => {
    const provider = makeProvider(JSON.stringify(VALID_ANALYSIS));
    const result = await analyzeDocument({
      document: makeDocument(),
      provider,
      model: "test-model",
    });

    expect(result.tierList).toBeDefined();
    expect(result.tierList.S).toHaveLength(1);
    expect(result.tierList.S[0].choiceId).toBe("ch3");
    expect(result.tierList.A).toHaveLength(1);
    expect(result.tierList.A[0].choiceId).toBe("ch1");
    expect(result.tierList.B).toHaveLength(1);
    expect(result.tierList.B[0].choiceId).toBe("ch2");
    expect(result.categorySummaries.perks).toBe("Strong offensive and healing options");
    expect(result.topSynergies).toHaveLength(3);
    expect(result.buildArchetypes).toHaveLength(2);
    expect(result.overallSummary).toBeTruthy();
    expect(result.analyzedAt).toBeTruthy();
  });

  it("should distribute all choices across tiers", async () => {
    const provider = makeProvider(JSON.stringify(VALID_ANALYSIS));
    const result = await analyzeDocument({
      document: makeDocument(),
      provider,
      model: "test-model",
    });

    const allTieredIds: string[] = [];
    for (const entries of Object.values(result.tierList)) {
      for (const entry of entries) {
        allTieredIds.push(entry.choiceId);
      }
    }

    expect(allTieredIds).toContain("ch1");
    expect(allTieredIds).toContain("ch2");
    expect(allTieredIds).toContain("ch3");
  });

  it("should have synergy pairs referencing valid choice IDs", async () => {
    const doc = makeDocument();
    const provider = makeProvider(JSON.stringify(VALID_ANALYSIS));
    const result = await analyzeDocument({
      document: doc,
      provider,
      model: "test-model",
    });

    const validIds = new Set(doc.choices.map((c) => c.id));
    for (const synergy of result.topSynergies) {
      expect(synergy.choiceIds.length).toBeGreaterThanOrEqual(2);
      for (const id of synergy.choiceIds) {
        expect(validIds.has(id)).toBe(true);
      }
      expect(synergy.description).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(synergy.combinedValue);
    }
  });

  it("should have build archetypes with valid choice IDs and calculated costs", async () => {
    const doc = makeDocument();
    const provider = makeProvider(JSON.stringify(VALID_ANALYSIS));
    const result = await analyzeDocument({
      document: doc,
      provider,
      model: "test-model",
    });

    const validIds = new Set(doc.choices.map((c) => c.id));
    const costMap = new Map(doc.choices.map((c) => [c.id, c.pointCost]));

    for (const build of result.buildArchetypes) {
      expect(build.name).toBeTruthy();
      expect(build.description).toBeTruthy();
      expect(build.recommendedChoiceIds.length).toBeGreaterThan(0);
      for (const id of build.recommendedChoiceIds) {
        expect(validIds.has(id)).toBe(true);
      }
      expect(typeof build.totalPointCost).toBe("number");
      expect(build.strengths.length).toBeGreaterThan(0);
      expect(build.weaknesses.length).toBeGreaterThan(0);
    }

    const battleMage = result.buildArchetypes.find((b) => b.name === "Battle Mage")!;
    expect(battleMage.totalPointCost).toBe(18);
  });

  it("should return fallback analysis when LLM throws an error", async () => {
    const provider = {
      chatComplete: vi.fn().mockRejectedValue(new Error("LLM unavailable")),
    };
    const result = await analyzeDocument({
      document: makeDocument(),
      provider,
      model: "test-model",
    });

    expect(result.tierList).toEqual({});
    expect(result.topSynergies).toEqual([]);
    expect(result.buildArchetypes).toEqual([]);
    expect(result.overallSummary).toContain("failed");
    expect(result.analyzedAt).toBeTruthy();
  });

  it("should handle empty document with zero choices", async () => {
    const emptyAnalysis = {
      tierList: { S: [], A: [], B: [], C: [], D: [], F: [] },
      categorySummaries: {},
      topSynergies: [],
      buildArchetypes: [],
      overallSummary: "This CYOA document contains no choices to analyze.",
    };
    const provider = makeProvider(JSON.stringify(emptyAnalysis));
    const result = await analyzeDocument({
      document: makeDocument({ choices: [], categories: [] }),
      provider,
      model: "test-model",
    });

    expect(result.tierList.S).toHaveLength(0);
    expect(result.topSynergies).toHaveLength(0);
    expect(result.buildArchetypes).toHaveLength(0);
    expect(result.overallSummary).toBeTruthy();
    expect(result.analyzedAt).toBeTruthy();
  });
});

describe("parseAnalysisJSON", () => {
  it("should parse plain JSON", () => {
    const obj = { tierList: { S: [] } };
    expect(parseAnalysisJSON(JSON.stringify(obj))).toEqual(obj);
  });

  it("should parse JSON from markdown code block", () => {
    const obj = { tierList: { S: [] } };
    const input = "```json\n" + JSON.stringify(obj, null, 2) + "\n```";
    expect(parseAnalysisJSON(input)).toEqual(obj);
  });

  it("should return null for unparseable input", () => {
    expect(parseAnalysisJSON("not json at all")).toBeNull();
  });
});
