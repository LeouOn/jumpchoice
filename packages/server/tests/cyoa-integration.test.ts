import { describe, it, expect, vi } from "vitest";
import type {
  CYOAExtraction,
  CYOADocument,
  CYOARawChoice,
  CYOAAnalysis,
} from "../src/services/cyoa/cyoa-types.js";
import { mergeExtractions } from "../src/services/cyoa/cyoa-merger.js";
import { analyzeDocument } from "../src/services/cyoa/cyoa-analyzer.js";
import { extractFromImage } from "../src/services/cyoa/cyoa-extractor.js";

vi.mock("../../lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    readFileSync: vi.fn(() => {
      throw new Error("ENOENT: no such file");
    }),
  };
});

vi.mock("../src/services/cyoa/ocr-service.js", () => ({
  ocrImage: vi.fn().mockResolvedValue("Telekinesis\nCost: 15 points\nMove objects with mind"),
}));

function makeRawChoice(overrides: Partial<CYOARawChoice> = {}): CYOARawChoice {
  return {
    name: "Test Choice",
    description: "A test choice",
    category: "perks",
    pointCost: 10,
    prerequisites: [],
    tags: ["test"],
    confidence: 0.9,
    ...overrides,
  };
}

function makeExtraction(overrides: Partial<CYOAExtraction> = {}): CYOAExtraction {
  return {
    imageId: "img1",
    pageNumber: 1,
    extractionMethod: "vision",
    title: "Test CYOA",
    description: "A test",
    pointBudget: 100,
    categories: ["perks", "items"],
    choices: [makeRawChoice()],
    warnings: [],
    ...overrides,
  };
}

function makeMockProvider(response: any) {
  return {
    chatComplete: vi.fn().mockResolvedValue(
      typeof response === "string" ? { content: response } : { content: JSON.stringify(response) },
    ),
  };
}

describe("CYOA Integration Tests", () => {
  it("full pipeline: extract -> review -> merge -> analyze", async () => {
    const extractions = [
      makeExtraction({
        imageId: "img1",
        title: "Grand Adventure",
        description: "An epic CYOA",
        pointBudget: 200,
        choices: [
          makeRawChoice({ name: "Sword Mastery", category: "perks", pointCost: 20, confidence: 0.95 }),
          makeRawChoice({ name: "Fire Shield", category: "items", pointCost: 15, confidence: 0.88 }),
        ],
      }),
      makeExtraction({
        imageId: "img2",
        title: null,
        description: "Second page extras",
        choices: [
          makeRawChoice({ name: "Speed Boost", category: "perks", pointCost: 10, confidence: 0.92 }),
        ],
      }),
    ];

    const document = mergeExtractions(extractions);

    expect(document.title).toBe("Grand Adventure");
    expect(document.pointBudget).toBe(200);
    expect(document.choices).toHaveLength(3);
    expect(document.imageCount).toBe(2);
    expect(document.categories).toContain("perks");
    expect(document.categories).toContain("items");

    const choiceIds = document.choices.map((c) => c.id);
    for (const id of choiceIds) {
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
    }

    const analysisResponse = {
      tierList: {
        S: [
          {
            choiceId: choiceIds[0],
            choiceName: "Sword Mastery",
            tier: "S",
            costEfficiency: 90,
            synergies: [choiceIds[1]],
            analysis: "Top tier combat perk",
          },
        ],
        B: [
          {
            choiceId: choiceIds[1],
            choiceName: "Fire Shield",
            tier: "B",
            costEfficiency: 60,
            synergies: [],
            analysis: "Decent defensive item",
          },
          {
            choiceId: choiceIds[2],
            choiceName: "Speed Boost",
            tier: "B",
            costEfficiency: 55,
            synergies: [],
            analysis: "Utility pick",
          },
        ],
      },
      categorySummaries: { perks: "Strong combat options", items: "Limited defensive items" },
      topSynergies: [
        {
          choiceIds: [choiceIds[0], choiceIds[1]],
          description: "Offense and defense combo",
          combinedValue: "high",
        },
      ],
      buildArchetypes: [
        {
          name: "Warrior",
          description: "Balanced fighter build",
          recommendedChoiceIds: [choiceIds[0], choiceIds[1]],
          totalPointCost: 35,
          strengths: ["Balanced"],
          weaknesses: ["No speed"],
        },
      ],
      overallSummary: "A well-rounded CYOA with good build variety.",
    };

    const provider = makeMockProvider(analysisResponse);
    const analysis = await analyzeDocument({ document, provider, model: "test-model" });

    expect(analysis.tierList.S).toHaveLength(1);
    expect(analysis.tierList.B).toHaveLength(2);
    expect(analysis.topSynergies).toHaveLength(1);
    expect(analysis.buildArchetypes).toHaveLength(1);
    expect(analysis.overallSummary).toBeTruthy();
    expect(analysis.analyzedAt).toBeTruthy();
  });

  it("extraction with OCR fallback when image file is missing", async () => {
    const ocrResponse = {
      title: "OCR CYOA",
      description: "Extracted via OCR",
      pointBudget: 50,
      categories: ["powers"],
      choices: [
        {
          name: "Telekinesis",
          description: "Move objects with mind",
          category: "powers",
          pointCost: 15,
          prerequisites: [],
          tags: ["psychic"],
          confidence: 0.7,
        },
      ],
    };

    const provider = makeMockProvider(ocrResponse);
    const extraction = await extractFromImage({
      imageId: "img-missing",
      imagePath: "/nonexistent/path.png",
      pageNumber: 1,
      provider,
      model: "test-model",
    });

    expect(extraction.extractionMethod).toBe("ocr");
    expect(extraction.title).toBe("OCR CYOA");
    expect(extraction.choices).toHaveLength(1);
    expect(extraction.choices[0].name).toBe("Telekinesis");
  });

  it("merge with conflicting extractions deduplicates by higher confidence", () => {
    const extraction1 = makeExtraction({
      imageId: "img1",
      choices: [
        makeRawChoice({
          name: "Flight",
          description: "Short desc",
          category: "perks",
          pointCost: 10,
          confidence: 0.8,
          tags: ["movement"],
        }),
        makeRawChoice({
          name: "Strength",
          description: "Gain physical power",
          category: "perks",
          pointCost: 12,
          confidence: 0.9,
        }),
      ],
    });

    const extraction2 = makeExtraction({
      imageId: "img2",
      choices: [
        makeRawChoice({
          name: "Flight",
          description: "Soar through the skies with great speed and agility",
          category: "movement",
          pointCost: 15,
          confidence: 0.95,
          tags: ["movement", "aerial"],
          prerequisites: ["Wings"],
        }),
        makeRawChoice({
          name: "Strength",
          description: "Short strength desc",
          category: "perks",
          pointCost: 12,
          confidence: 0.7,
        }),
      ],
    });

    const document = mergeExtractions([extraction1, extraction2]);

    expect(document.choices).toHaveLength(2);

    const flight = document.choices.find((c) => c.name === "Flight")!;
    expect(flight).toBeDefined();
    expect(flight.pointCost).toBe(15);
    expect(flight.category).toBe("movement");
    expect(flight.description).toBe("Soar through the skies with great speed and agility");
    expect(flight.tags).toContain("movement");
    expect(flight.tags).toContain("aerial");
    expect(flight.sourceImageIds).toContain("img1");
    expect(flight.sourceImageIds).toContain("img2");
    expect(flight.prerequisites).toContain("Wings");

    const strength = document.choices.find((c) => c.name === "Strength")!;
    expect(strength).toBeDefined();
    expect(strength.pointCost).toBe(12);
    expect(strength.description).toBe("Gain physical power");
  });

  it("analysis handles empty document gracefully", async () => {
    const emptyDoc: CYOADocument = {
      title: "Empty CYOA",
      description: "",
      pointBudget: null,
      categories: [],
      choices: [],
      imageCount: 0,
      mergedAt: new Date().toISOString(),
    };

    const emptyAnalysisResponse = {
      tierList: { S: [], A: [], B: [], C: [], D: [], F: [] },
      categorySummaries: {},
      topSynergies: [],
      buildArchetypes: [],
      overallSummary: "This document contains no choices to analyze.",
    };

    const provider = makeMockProvider(emptyAnalysisResponse);
    const analysis = await analyzeDocument({ document: emptyDoc, provider, model: "test-model" });

    expect(analysis.tierList.S).toHaveLength(0);
    expect(analysis.topSynergies).toHaveLength(0);
    expect(analysis.buildArchetypes).toHaveLength(0);
    expect(analysis.overallSummary).toBeTruthy();
    expect(analysis.analyzedAt).toBeTruthy();
  });

  it("end-to-end data flow with realistic extraction array", async () => {
    const extractions: CYOAExtraction[] = [
      {
        imageId: "page1",
        pageNumber: 1,
        extractionMethod: "vision",
        title: "Ultimate Power CYOA",
        description: "Choose your superpowers wisely",
        pointBudget: 100,
        categories: ["powers", "perks", "items"],
        choices: [
          {
            name: "Super Strength",
            description: "Lift anything",
            category: "powers",
            pointCost: 25,
            prerequisites: [],
            tags: ["physical", "offense"],
            confidence: 0.95,
          },
          {
            name: "Invisibility",
            description: "Become unseen",
            category: "powers",
            pointCost: 20,
            prerequisites: [],
            tags: ["stealth"],
            confidence: 0.92,
          },
          {
            name: "Healing Factor",
            description: "Regenerate health rapidly",
            category: "perks",
            pointCost: 15,
            prerequisites: [],
            tags: ["defense", "healing"],
            confidence: 0.9,
          },
        ],
        warnings: [],
      },
      {
        imageId: "page2",
        pageNumber: 2,
        extractionMethod: "vision",
        title: null,
        description: null,
        pointBudget: null,
        categories: ["items", "drawbacks"],
        choices: [
          {
            name: "Magic Sword",
            description: "A blade imbued with arcane power",
            category: "items",
            pointCost: 30,
            prerequisites: ["Super Strength"],
            tags: ["weapon", "magic"],
            confidence: 0.88,
          },
          {
            name: "Shadow Cloak",
            description: "Grants stealth in darkness",
            category: "items",
            pointCost: 18,
            prerequisites: ["Invisibility"],
            tags: ["armor", "stealth"],
            confidence: 0.85,
          },
        ],
        warnings: [],
      },
    ];

    const document = mergeExtractions(extractions);

    expect(document.title).toBe("Ultimate Power CYOA");
    expect(document.description).toBe("Choose your superpowers wisely");
    expect(document.pointBudget).toBe(100);
    expect(document.imageCount).toBe(2);
    expect(document.choices).toHaveLength(5);

    for (const choice of document.choices) {
      expect(choice.id).toBeTruthy();
      expect(typeof choice.id).toBe("string");
      expect(choice.id.length).toBeGreaterThan(0);
      expect(choice.name).toBeTruthy();
      expect(choice.category).toBeTruthy();
    }

    expect(document.categories).toContain("powers");
    expect(document.categories).toContain("perks");
    expect(document.categories).toContain("items");
    expect(document.categories).toContain("drawbacks");

    const sword = document.choices.find((c) => c.name === "Magic Sword")!;
    expect(sword.prerequisites).toContain("Super Strength");

    const choiceIds = document.choices.map((c) => c.id);

    const fullAnalysisResponse = {
      tierList: {
        S: [
          {
            choiceId: choiceIds.find((id) => {
              const c = document.choices.find((ch) => ch.id === id);
              return c?.name === "Healing Factor";
            })!,
            choiceName: "Healing Factor",
            tier: "S",
            costEfficiency: 95,
            synergies: [choiceIds[0]],
            analysis: "Best value pick in the entire CYOA",
          },
        ],
        A: [
          {
            choiceId: choiceIds.find((id) => {
              const c = document.choices.find((ch) => ch.id === id);
              return c?.name === "Super Strength";
            })!,
            choiceName: "Super Strength",
            tier: "A",
            costEfficiency: 80,
            synergies: [choiceIds[2]],
            analysis: "Strong foundation for many builds",
          },
          {
            choiceId: choiceIds.find((id) => {
              const c = document.choices.find((ch) => ch.id === id);
              return c?.name === "Invisibility";
            })!,
            choiceName: "Invisibility",
            tier: "A",
            costEfficiency: 78,
            synergies: [],
            analysis: "Versatile utility power",
          },
        ],
        B: [
          {
            choiceId: choiceIds.find((id) => {
              const c = document.choices.find((ch) => ch.id === id);
              return c?.name === "Shadow Cloak";
            })!,
            choiceName: "Shadow Cloak",
            tier: "B",
            costEfficiency: 60,
            synergies: [],
            analysis: "Good synergy with Invisibility",
          },
        ],
        C: [
          {
            choiceId: choiceIds.find((id) => {
              const c = document.choices.find((ch) => ch.id === id);
              return c?.name === "Magic Sword";
            })!,
            choiceName: "Magic Sword",
            tier: "C",
            costEfficiency: 40,
            synergies: [],
            analysis: "Expensive for what it offers",
          },
        ],
      },
      categorySummaries: {
        powers: "Strong core abilities",
        perks: "Essential healing option",
        items: "Overpriced but synergistic",
        drawbacks: "No drawbacks available",
      },
      topSynergies: [
        {
          choiceIds: [
            choiceIds.find((id) => document.choices.find((c) => c.id === id)?.name === "Invisibility")!,
            choiceIds.find((id) => document.choices.find((c) => c.id === id)?.name === "Shadow Cloak")!,
          ],
          description: "Stealth stacking for maximum evasion",
          combinedValue: "high",
        },
      ],
      buildArchetypes: [
        {
          name: "Tank",
          description: "Strength plus healing",
          recommendedChoiceIds: [
            choiceIds.find((id) => document.choices.find((c) => c.id === id)?.name === "Super Strength")!,
            choiceIds.find((id) => document.choices.find((c) => c.id === id)?.name === "Healing Factor")!,
          ],
          totalPointCost: 40,
          strengths: ["Durable", "Self-sustain"],
          weaknesses: ["No stealth"],
        },
        {
          name: "Ghost",
          description: "Maximum stealth build",
          recommendedChoiceIds: [
            choiceIds.find((id) => document.choices.find((c) => c.id === id)?.name === "Invisibility")!,
            choiceIds.find((id) => document.choices.find((c) => c.id === id)?.name === "Shadow Cloak")!,
          ],
          totalPointCost: 38,
          strengths: ["Undetectable"],
          weaknesses: ["No direct combat"],
        },
      ],
      overallSummary: "A well-balanced CYOA with distinct build paths.",
    };

    const provider = makeMockProvider(fullAnalysisResponse);
    const analysis = await analyzeDocument({ document, provider, model: "test-model" });

    expect(Object.keys(analysis.tierList)).toContain("S");
    expect(Object.keys(analysis.tierList)).toContain("A");
    expect(Object.keys(analysis.tierList)).toContain("B");
    expect(Object.keys(analysis.tierList)).toContain("C");

    expect(analysis.tierList.S).toHaveLength(1);
    expect(analysis.tierList.S[0].choiceName).toBe("Healing Factor");

    expect(analysis.topSynergies).toHaveLength(1);
    expect(analysis.topSynergies[0].combinedValue).toBe("high");

    expect(analysis.buildArchetypes).toHaveLength(2);
    expect(analysis.buildArchetypes.map((b) => b.name)).toContain("Tank");
    expect(analysis.buildArchetypes.map((b) => b.name)).toContain("Ghost");

    expect(analysis.categorySummaries.powers).toBe("Strong core abilities");
    expect(analysis.overallSummary).toBeTruthy();
    expect(analysis.analyzedAt).toBeTruthy();
  });
});
