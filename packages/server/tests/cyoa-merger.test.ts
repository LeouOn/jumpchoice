import { describe, it, expect } from "vitest";
import type { CYOAExtraction, CYOARawChoice } from "../src/services/cyoa/cyoa-types.js";
import { mergeExtractions } from "../src/services/cyoa/cyoa-merger.js";

function makeExtraction(overrides: Partial<CYOAExtraction> = {}): CYOAExtraction {
  return {
    imageId: "img_1",
    pageNumber: 1,
    extractionMethod: "vision",
    title: null,
    description: null,
    pointBudget: null,
    categories: [],
    choices: [],
    warnings: [],
    ...overrides,
  };
}

function makeChoice(overrides: Partial<CYOARawChoice> = {}): CYOARawChoice {
  return {
    name: "Test Choice",
    description: "A test choice",
    category: "uncategorized",
    pointCost: 0,
    prerequisites: [],
    tags: [],
    confidence: 0.9,
    ...overrides,
  };
}

describe("mergeExtractions", () => {
  it("merges a single extraction with all fields populated", () => {
    const extraction = makeExtraction({
      title: "My CYOA",
      description: "An adventure",
      pointBudget: 30,
      categories: ["powers", "items"],
      choices: [
        makeChoice({ name: "Flight", category: "powers", pointCost: 5, confidence: 0.95 }),
        makeChoice({ name: "Sword", category: "items", pointCost: 3, confidence: 0.85 }),
        makeChoice({ name: "Shield", category: "items", pointCost: 2, confidence: 0.9 }),
      ],
    });

    const doc = mergeExtractions([extraction]);

    expect(doc.title).toBe("My CYOA");
    expect(doc.description).toBe("An adventure");
    expect(doc.pointBudget).toBe(30);
    expect(doc.categories).toEqual(["powers", "items"]);
    expect(doc.choices).toHaveLength(3);
    expect(doc.imageCount).toBe(1);
    expect(doc.mergedAt).toBeTruthy();
    for (const choice of doc.choices) {
      expect(choice.id).toBeTruthy();
      expect(choice.sourceImageIds).toEqual(["img_1"]);
    }
  });

  it("deduplicates choices across extractions keeping higher confidence", () => {
    const extraction1 = makeExtraction({
      imageId: "img_1",
      choices: [
        makeChoice({ name: "Fireball", confidence: 0.8, category: "magic", pointCost: 5 }),
      ],
    });
    const extraction2 = makeExtraction({
      imageId: "img_2",
      choices: [
        makeChoice({ name: "Fireball", confidence: 0.95, category: "spells", pointCost: 6 }),
      ],
    });

    const doc = mergeExtractions([extraction1, extraction2]);

    expect(doc.choices).toHaveLength(1);
    expect(doc.choices[0].name).toBe("Fireball");
    expect(doc.choices[0].confidence).toBeUndefined();
    expect(doc.choices[0].category).toBe("spells");
    expect(doc.choices[0].pointCost).toBe(6);
    expect(doc.choices[0].sourceImageIds).toEqual(["img_1", "img_2"]);
  });

  it("normalizes categories case-insensitively preserving first casing", () => {
    const extraction1 = makeExtraction({ categories: ["Perks"] });
    const extraction2 = makeExtraction({ categories: ["perks", "Items"] });
    const extraction3 = makeExtraction({ categories: ["PERKS", "ITEMS"] });

    const doc = mergeExtractions([extraction1, extraction2, extraction3]);

    expect(doc.categories).toEqual(["Perks", "Items"]);
  });

  it("preserves prerequisite names referencing other choices", () => {
    const extraction = makeExtraction({
      choices: [
        makeChoice({ name: "Basic Magic", prerequisites: [] }),
        makeChoice({ name: "Advanced Magic", prerequisites: ["Basic Magic"] }),
        makeChoice({ name: "Master Spell", prerequisites: ["Advanced Magic", "Basic Magic"] }),
      ],
    });

    const doc = mergeExtractions([extraction]);

    const advanced = doc.choices.find((c) => c.name === "Advanced Magic")!;
    expect(advanced.prerequisites).toEqual(["Basic Magic"]);

    const master = doc.choices.find((c) => c.name === "Master Spell")!;
    expect(master.prerequisites).toEqual(["Advanced Magic", "Basic Magic"]);
  });

  it("returns empty document for empty extractions array", () => {
    const doc = mergeExtractions([]);

    expect(doc.title).toBe("Untitled CYOA");
    expect(doc.description).toBe("");
    expect(doc.pointBudget).toBeNull();
    expect(doc.categories).toEqual([]);
    expect(doc.choices).toEqual([]);
    expect(doc.imageCount).toBe(0);
    expect(doc.mergedAt).toBeTruthy();
  });

  it("keeps longer description when choices conflict", () => {
    const short = "A sword.";
    const long = "A legendary blade forged in dragon fire, capable of cutting through any material known to mortals.";
    const extraction1 = makeExtraction({
      imageId: "img_1",
      choices: [
        makeChoice({ name: "Dragon Sword", description: short, confidence: 0.7 }),
      ],
    });
    const extraction2 = makeExtraction({
      imageId: "img_2",
      choices: [
        makeChoice({ name: "Dragon Sword", description: long, confidence: 0.9 }),
      ],
    });

    const doc = mergeExtractions([extraction1, extraction2]);

    expect(doc.choices[0].description).toBe(long);
  });

  it("tracks source image IDs when a choice appears in multiple images", () => {
    const extraction1 = makeExtraction({
      imageId: "img_alpha",
      choices: [
        makeChoice({ name: "Healing", tags: ["support"] }),
      ],
    });
    const extraction2 = makeExtraction({
      imageId: "img_beta",
      choices: [
        makeChoice({ name: "Healing", tags: ["magic"] }),
      ],
    });
    const extraction3 = makeExtraction({
      imageId: "img_gamma",
      choices: [
        makeChoice({ name: "Healing", tags: ["support", "restoration"] }),
      ],
    });

    const doc = mergeExtractions([extraction1, extraction2, extraction3]);

    expect(doc.choices).toHaveLength(1);
    expect(doc.choices[0].sourceImageIds).toEqual(["img_alpha", "img_beta", "img_gamma"]);
    expect(doc.imageCount).toBe(3);
  });

  it("deduplicates choices with different casing via case-insensitive matching", () => {
    const extraction1 = makeExtraction({
      imageId: "img_1",
      choices: [
        makeChoice({ name: "Fire Ball", confidence: 0.85, description: "A ball of fire." }),
      ],
    });
    const extraction2 = makeExtraction({
      imageId: "img_2",
      choices: [
        makeChoice({ name: "Fire ball", confidence: 0.92, description: "A ball of fire." }),
      ],
    });

    const doc = mergeExtractions([extraction1, extraction2]);

    expect(doc.choices).toHaveLength(1);
    expect(doc.choices[0].name).toBe("Fire ball");
    expect(doc.choices[0].sourceImageIds).toEqual(["img_1", "img_2"]);
  });
});
