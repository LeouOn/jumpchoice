import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mergeExtractions } from "../../packages/server/src/services/cyoa/cyoa-merger.js";
import { analyzeDocument, parseAnalysisJSON } from "../../packages/server/src/services/cyoa/cyoa-analyzer.js";
import { extractFromImage, parseExtractionJSON } from "../../packages/server/src/services/cyoa/cyoa-extractor.js";
import type { ExtractorProvider } from "../../packages/server/src/services/cyoa/cyoa-extractor.js";
import { isOCRAvailable, ocrImage } from "../../packages/server/src/services/cyoa/ocr-service.js";
import type { CYOADocument, CYOAExtraction, CYOARawChoice } from "../../packages/server/src/services/cyoa/cyoa-types.js";

const workDir = await mkdtemp(join(tmpdir(), "marinara-cyoa-services-"));

function rawChoice(overrides: Partial<CYOARawChoice> = {}): CYOARawChoice {
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

function extraction(overrides: Partial<CYOAExtraction> = {}): CYOAExtraction {
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

function fakeProvider(responses: Array<{ content: string } | Error>): ExtractorProvider & { calls: number } {
  const queue = [...responses];
  const provider: ExtractorProvider & { calls: number } = {
    calls: 0,
    chatComplete: async () => {
      provider.calls += 1;
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return next ?? { content: "" };
    },
  };
  return provider;
}

try {
  // ── mergeExtractions ──
  {
    const doc = mergeExtractions([
      extraction({
        title: "My CYOA",
        description: "An adventure",
        pointBudget: 30,
        categories: ["powers", "items"],
        choices: [
          rawChoice({ name: "Flight", category: "powers", pointCost: 5, confidence: 0.95 }),
          rawChoice({ name: "Sword", category: "items", pointCost: 3, confidence: 0.85 }),
          rawChoice({ name: "Shield", category: "items", pointCost: 2, confidence: 0.9 }),
        ],
      }),
    ]);
    assert.equal(doc.title, "My CYOA");
    assert.equal(doc.pointBudget, 30);
    assert.deepEqual(doc.categories, ["powers", "items"]);
    assert.equal(doc.choices.length, 3);
    assert.equal(doc.imageCount, 1);
    assert.ok(doc.mergedAt);
    for (const choice of doc.choices) {
      assert.ok(choice.id);
      assert.deepEqual(choice.sourceImageIds, ["img_1"]);
    }
  }

  // Duplicate choices merge by higher confidence, keeping provenance of both images.
  {
    const doc = mergeExtractions([
      extraction({ imageId: "img_1", choices: [rawChoice({ name: "Fireball", confidence: 0.8, category: "magic", pointCost: 5 })] }),
      extraction({ imageId: "img_2", choices: [rawChoice({ name: "Fireball", confidence: 0.95, category: "spells", pointCost: 6 })] }),
    ]);
    assert.equal(doc.choices.length, 1);
    assert.equal(doc.choices[0]?.category, "spells");
    assert.equal(doc.choices[0]?.pointCost, 6);
    assert.deepEqual(doc.choices[0]?.sourceImageIds, ["img_1", "img_2"]);

    const cased = mergeExtractions([
      extraction({ imageId: "img_1", choices: [rawChoice({ name: "Fire Ball", confidence: 0.85 })] }),
      extraction({ imageId: "img_2", choices: [rawChoice({ name: "Fire ball", confidence: 0.92 })] }),
    ]);
    assert.equal(cased.choices.length, 1);
    assert.equal(cased.choices[0]?.name, "Fire ball");
  }

  // Categories normalize case-insensitively, preserving first casing.
  {
    const doc = mergeExtractions([
      extraction({ categories: ["Perks"] }),
      extraction({ categories: ["perks", "Items"] }),
      extraction({ categories: ["PERKS", "ITEMS"] }),
    ]);
    assert.deepEqual(doc.categories, ["Perks", "Items"]);
  }

  // Prerequisites survive verbatim; empty input yields the empty document; longer
  // descriptions win; provenance tracks across three images.
  {
    const chained = mergeExtractions([
      extraction({
        choices: [
          rawChoice({ name: "Basic Magic" }),
          rawChoice({ name: "Advanced Magic", prerequisites: ["Basic Magic"] }),
        ],
      }),
    ]);
    assert.deepEqual(chained.choices.find((c) => c.name === "Advanced Magic")?.prerequisites, ["Basic Magic"]);

    const empty = mergeExtractions([]);
    assert.equal(empty.title, "Untitled CYOA");
    assert.equal(empty.pointBudget, null);
    assert.deepEqual(empty.choices, []);

    const short = "A sword.";
    const long = "A legendary blade forged in dragon fire, capable of cutting through any material known to mortals.";
    const described = mergeExtractions([
      extraction({ imageId: "img_1", choices: [rawChoice({ name: "Dragon Sword", description: short, confidence: 0.7 })] }),
      extraction({ imageId: "img_2", choices: [rawChoice({ name: "Dragon Sword", description: long, confidence: 0.9 })] }),
    ]);
    assert.equal(described.choices[0]?.description, long);

    const tracked = mergeExtractions([
      extraction({ imageId: "img_alpha", choices: [rawChoice({ name: "Healing" })] }),
      extraction({ imageId: "img_beta", choices: [rawChoice({ name: "Healing" })] }),
      extraction({ imageId: "img_gamma", choices: [rawChoice({ name: "Healing" })] }),
    ]);
    assert.deepEqual(tracked.choices[0]?.sourceImageIds, ["img_alpha", "img_beta", "img_gamma"]);
    assert.equal(tracked.imageCount, 3);
  }

  // ── OCR service ──
  assert.equal(typeof isOCRAvailable(), "boolean");
  assert.equal(await ocrImage(join(workDir, "does-not-exist.png")), "", "missing files must OCR to empty text");

  // ── extractFromImage ──
  const imageFile = join(workDir, "page.png");
  await writeFile(imageFile, Buffer.from("fake-png-data"));

  const validExtraction = {
    title: "Test CYOA",
    description: "A test adventure",
    pointBudget: 20,
    categories: ["powers", "items"],
    choices: [
      { name: "Flight", description: "You can fly", category: "powers", pointCost: 5, prerequisites: [], tags: ["movement"], confidence: 0.95 },
      { name: "Sword", description: "A sharp blade", category: "items", pointCost: 3, prerequisites: [], tags: ["weapon"], confidence: 0.85 },
    ],
  };

  // Vision path on a real image file.
  {
    const provider = fakeProvider([{ content: JSON.stringify(validExtraction) }]);
    const result = await extractFromImage({ imageId: "img1", imagePath: imageFile, pageNumber: 1, provider, model: "test-model" });
    assert.equal(result.extractionMethod, "vision");
    assert.equal(result.title, "Test CYOA");
    assert.equal(result.pointBudget, 20);
    assert.deepEqual(result.categories, ["powers", "items"]);
    assert.equal(result.choices.length, 2);
    assert.equal(result.choices[0]?.name, "Flight");
    assert.deepEqual(result.warnings, []);
  }

  // Invalid JSON triggers the stricter retry; success on the second call.
  {
    const provider = fakeProvider([{ content: "not json" }, { content: JSON.stringify(validExtraction) }]);
    const result = await extractFromImage({ imageId: "img_retry", imagePath: imageFile, pageNumber: 1, provider, model: "test-model" });
    assert.equal(provider.calls, 2);
    assert.equal(result.extractionMethod, "vision");
    assert.equal(result.title, "Test CYOA");
  }

  // Fallback vision providers get a turn when the primary cannot parse.
  {
    const primary = fakeProvider([{ content: "not json" }, { content: "still not json" }]);
    const fallback = fakeProvider([{ content: JSON.stringify({ ...validExtraction, title: "Fallback Result" }) }]);
    const result = await extractFromImage({
      imageId: "img_fallback",
      imagePath: imageFile,
      pageNumber: 1,
      provider: primary,
      model: "test-model",
      fallbackProviders: [{ label: "backup", provider: fallback, model: "backup-model" }],
    });
    assert.equal(result.extractionMethod, "vision");
    assert.equal(result.title, "Fallback Result");
  }

  // Missing image file: vision is skipped, OCR finds no text, empty extraction returned.
  {
    const provider = fakeProvider([{ content: JSON.stringify(validExtraction) }]);
    const result = await extractFromImage({
      imageId: "img_missing",
      imagePath: join(workDir, "missing.png"),
      pageNumber: 3,
      provider,
      model: "test-model",
    });
    assert.equal(provider.calls, 0, "vision must never run without a readable image");
    assert.equal(result.extractionMethod, "ocr");
    assert.equal(result.title, null);
    assert.deepEqual(result.choices, []);
    assert.deepEqual(result.warnings, ["All vision providers failed and OCR returned no text"]);
  }

  // Empty LLM response falls through to the same OCR-dead-end contract.
  {
    const provider = fakeProvider([{ content: "" }]);
    const result = await extractFromImage({ imageId: "img_empty", imagePath: imageFile, pageNumber: 1, provider, model: "test-model" });
    assert.deepEqual(result.warnings, ["All vision providers failed and OCR returned no text"]);
    assert.equal(result.pointBudget, null);
  }

  // Low-confidence choices are flagged.
  {
    const shaky = {
      ...validExtraction,
      choices: [
        { ...validExtraction.choices[0], confidence: 0.5 },
        validExtraction.choices[1],
        { name: "Blurry", description: "Hard to read", category: "uncategorized", pointCost: 1, prerequisites: [], tags: [], confidence: 0.3 },
      ],
    };
    const provider = fakeProvider([{ content: JSON.stringify(shaky) }]);
    const result = await extractFromImage({ imageId: "img5", imagePath: imageFile, pageNumber: 1, provider, model: "test-model" });
    assert.equal(result.choices.length, 3);
    assert.equal(result.warnings.length, 2);
    assert.ok(result.warnings[0]?.includes("Low confidence"));
    assert.ok(result.warnings[1]?.includes("Low confidence"));
  }

  // JSON helpers tolerate markdown fences and reject garbage.
  {
    const payload = { title: "test" };
    assert.deepEqual(parseExtractionJSON(JSON.stringify(payload)), payload);
    assert.deepEqual(parseExtractionJSON("```json\n" + JSON.stringify(payload, null, 2) + "\n```"), payload);
    assert.equal(parseExtractionJSON("not json at all"), null);
  }

  // ── analyzeDocument ──
  const analysisDoc: CYOADocument = {
    title: "Test CYOA",
    description: "A test CYOA",
    pointBudget: 100,
    categories: ["perks", "items"],
    choices: [
      { id: "ch1", name: "Fire Ball", description: "Shoot fire", category: "perks", pointCost: 10, prerequisites: [], tags: ["magic"], sourceImageIds: ["img1"] },
      { id: "ch2", name: "Shield", description: "Block damage", category: "items", pointCost: 15, prerequisites: [], tags: ["defense"], sourceImageIds: ["img1"] },
      { id: "ch3", name: "Heal", description: "Restore health", category: "perks", pointCost: 8, prerequisites: [], tags: ["magic", "healing"], sourceImageIds: ["img1"] },
    ],
    imageCount: 1,
    mergedAt: new Date().toISOString(),
  };

  const validAnalysis = {
    tierList: {
      S: [{ choiceId: "ch3", choiceName: "Heal", tier: "S", costEfficiency: 95, synergies: ["ch1"], analysis: "Best value heal in the game" }],
      A: [{ choiceId: "ch1", choiceName: "Fire Ball", tier: "A", costEfficiency: 80, synergies: ["ch3"], analysis: "Strong offensive pick" }],
      B: [{ choiceId: "ch2", choiceName: "Shield", tier: "B", costEfficiency: 60, synergies: [], analysis: "Decent defensive option" }],
      C: [],
      D: [],
      F: [],
    },
    categorySummaries: { perks: "Strong offensive and healing options", items: "Limited but useful defensive items" },
    topSynergies: [
      { choiceIds: ["ch1", "ch3"], description: "Fire and healing combo for sustained combat", combinedValue: "high" },
      { choiceIds: ["ch2", "ch3"], description: "Tanky healer build", combinedValue: "medium" },
      { choiceIds: ["ch1", "ch2"], description: "Balanced fighter", combinedValue: "medium" },
    ],
    buildArchetypes: [
      { name: "Battle Mage", description: "Offensive magic with healing support", recommendedChoiceIds: ["ch1", "ch3"], totalPointCost: 18, strengths: ["High damage"], weaknesses: ["No defense"] },
      { name: "Paladin", description: "Balanced defense and healing", recommendedChoiceIds: ["ch2", "ch3"], totalPointCost: 23, strengths: ["Tanky"], weaknesses: ["Low damage"] },
    ],
    overallSummary: "This CYOA offers a well-balanced set of choices with clear synergy paths.",
  };

  {
    const provider = fakeProvider([{ content: JSON.stringify(validAnalysis) }]);
    const result = await analyzeDocument({ document: analysisDoc, provider, model: "test-model" });
    assert.equal(result.tierList.S?.length, 1);
    assert.equal(result.tierList.S[0]?.choiceId, "ch3");
    assert.equal(result.tierList.A?.length, 1);
    assert.equal(result.tierList.B?.length, 1);
    assert.equal(result.topSynergies.length, 3);
    assert.equal(result.buildArchetypes.length, 2);
    assert.equal(result.buildArchetypes.find((b) => b.name === "Battle Mage")?.totalPointCost, 18);
    assert.ok(result.analyzedAt);

    const tieredIds = Object.values(result.tierList).flat().map((entry) => entry.choiceId);
    for (const id of ["ch1", "ch2", "ch3"]) assert.ok(tieredIds.includes(id), `${id} must land in a tier`);

    const validIds = new Set(analysisDoc.choices.map((c) => c.id));
    for (const synergy of result.topSynergies) {
      assert.ok(synergy.choiceIds.length >= 2);
      for (const id of synergy.choiceIds) assert.ok(validIds.has(id));
    }
  }

  // Provider failure degrades to the fallback analysis, not a throw.
  {
    const provider = fakeProvider([new Error("LLM unavailable")]);
    const result = await analyzeDocument({ document: analysisDoc, provider, model: "test-model" });
    assert.deepEqual(result.tierList, {});
    assert.deepEqual(result.topSynergies, []);
    assert.ok(result.overallSummary.includes("failed"));
    assert.ok(result.analyzedAt);
  }

  // Empty documents analyze to an empty-but-valid structure.
  {
    const emptyAnalysis = {
      tierList: { S: [], A: [], B: [], C: [], D: [], F: [] },
      categorySummaries: {},
      topSynergies: [],
      buildArchetypes: [],
      overallSummary: "This CYOA document contains no choices to analyze.",
    };
    const provider = fakeProvider([{ content: JSON.stringify(emptyAnalysis) }]);
    const result = await analyzeDocument({
      document: { ...analysisDoc, choices: [], categories: [] },
      provider,
      model: "test-model",
    });
    assert.deepEqual(result.tierList.S, []);
    assert.equal(result.buildArchetypes.length, 0);
    assert.ok(result.analyzedAt);
  }

  {
    const payload = { tierList: { S: [] } };
    assert.deepEqual(parseAnalysisJSON(JSON.stringify(payload)), payload);
    assert.deepEqual(parseAnalysisJSON("```json\n" + JSON.stringify(payload, null, 2) + "\n```"), payload);
    assert.equal(parseAnalysisJSON("not json at all"), null);
  }

  // ── Pipeline composition: extract outputs feed the merger, then the analyzer ──
  {
    const document = mergeExtractions([
      extraction({
        imageId: "img1",
        title: "Grand Adventure",
        pointBudget: 200,
        choices: [
          rawChoice({ name: "Sword Mastery", category: "perks", pointCost: 20, confidence: 0.95 }),
          rawChoice({ name: "Fire Shield", category: "items", pointCost: 15, confidence: 0.88 }),
        ],
      }),
      extraction({
        imageId: "img2",
        title: null,
        choices: [rawChoice({ name: "Speed Boost", category: "perks", pointCost: 10, confidence: 0.92 })],
      }),
    ]);
    assert.equal(document.title, "Grand Adventure");
    assert.equal(document.pointBudget, 200);
    assert.equal(document.choices.length, 3);
    assert.equal(document.imageCount, 2);

    const ids = document.choices.map((c) => c.id);
    const composed = {
      ...validAnalysis,
      tierList: {
        S: [{ choiceId: ids[0], choiceName: "Sword Mastery", tier: "S", costEfficiency: 90, synergies: [], analysis: "Top tier combat perk" }],
        B: [
          { choiceId: ids[1], choiceName: "Fire Shield", tier: "B", costEfficiency: 60, synergies: [], analysis: "Decent defensive item" },
          { choiceId: ids[2], choiceName: "Speed Boost", tier: "B", costEfficiency: 55, synergies: [], analysis: "Utility pick" },
        ],
      },
      topSynergies: [{ choiceIds: [ids[0], ids[1]], description: "Offense and defense combo", combinedValue: "high" }],
      buildArchetypes: [
        { name: "Warrior", description: "Balanced fighter build", recommendedChoiceIds: [ids[0], ids[1]], totalPointCost: 35, strengths: ["Balanced"], weaknesses: ["No speed"] },
      ],
    };
    const provider = fakeProvider([{ content: JSON.stringify(composed) }]);
    const analysis = await analyzeDocument({ document, provider, model: "test-model" });
    assert.equal(analysis.tierList.S?.length, 1);
    assert.equal(analysis.tierList.B?.length, 2);
    assert.equal(analysis.topSynergies.length, 1);
    assert.ok(analysis.analyzedAt);
  }

  process.stdout.write("CYOA services regression passed.\n");
} finally {
  await rm(workDir, { recursive: true, force: true });
}
