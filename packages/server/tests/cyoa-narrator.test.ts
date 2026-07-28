import { describe, it, expect, vi } from "vitest";

vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { buildNarratorPrompts } from "../src/services/cyoa/cyoa-narrator.js";

function makeChoice(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? `ch-${Math.random().toString(36).slice(2, 8)}`,
    name: overrides.name ?? "Test Choice",
    description: overrides.description ?? "A test choice",
    category: overrides.category ?? "general",
    pointCost: overrides.pointCost ?? 5,
    tier: overrides.tier ?? "B",
    ...overrides,
  };
}

const baseChoices = [
  makeChoice({ id: "c1", name: "Fireball", category: "magic", pointCost: 10, tier: "A" }),
  makeChoice({ id: "c2", name: "Sword Mastery", category: "combat", pointCost: 8, tier: "B" }),
  makeChoice({ id: "c3", name: "Stealth", category: "stealth", pointCost: 6, tier: "C" }),
  makeChoice({ id: "c4", name: "Healing Aura", category: "magic", pointCost: 12, tier: "A" }),
  makeChoice({ id: "c5", name: "Hacking", category: "technology", pointCost: 7, tier: "B" }),
];

describe("buildNarratorPrompts", () => {
  it("returns all four prompt keys", () => {
    const result = buildNarratorPrompts(
      { name: "Test Build", selectedChoiceIds: ["c1"] },
      { name: "Test Doc", choices: [makeChoice({ id: "c1" })] },
    );
    expect(result).toHaveProperty("narrator");
    expect(result).toHaveProperty("director");
    expect(result).toHaveProperty("world");
    expect(result).toHaveProperty("characters");
    expect(typeof result.narrator).toBe("string");
    expect(typeof result.director).toBe("string");
    expect(typeof result.world).toBe("string");
    expect(typeof result.characters).toBe("string");
  });

  it("includes the build name in all prompts", () => {
    const result = buildNarratorPrompts(
      { name: "My Hero", selectedChoiceIds: ["c1"] },
      { name: "Test Doc", choices: [makeChoice({ id: "c1" })] },
    );
    expect(result.narrator).toContain("My Hero");
    expect(result.director).toContain("My Hero");
    expect(result.world).toContain("My Hero");
  });

  it("includes build description in narrator when provided", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", description: "A brave warrior", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [makeChoice({ id: "c1" })] },
    );
    expect(result.narrator).toContain("A brave warrior");
  });

  it("omits description line when not provided", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [makeChoice({ id: "c1" })] },
    );
    expect(result.narrator).not.toContain("**undefined**");
  });

  it("lists selected choices in narrator and director", () => {
    const choices = [
      makeChoice({ id: "c1", name: "Fireball", pointCost: 10, tier: "A", category: "magic" }),
      makeChoice({ id: "c2", name: "Sword", pointCost: 8, tier: "B", category: "combat" }),
    ];
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1", "c2"] },
      { name: "Doc", choices },
    );
    expect(result.narrator).toContain("Fireball");
    expect(result.narrator).toContain("Sword");
    expect(result.director).toContain("Fireball");
    expect(result.director).toContain("Sword");
  });

  it("does not include unselected choices in the choice list", () => {
    const choices = [
      makeChoice({ id: "c1", name: "Selected" }),
      makeChoice({ id: "c2", name: "Not Selected" }),
    ];
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices },
    );
    expect(result.narrator).toContain("Selected");
    expect(result.narrator).not.toContain("Not Selected");
  });

  it("shows point budget when provided", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", pointBudget: 50, choices: [makeChoice({ id: "c1", pointCost: 10 })] },
    );
    expect(result.narrator).toContain("10 points spent / 50 budget");
  });

  it("shows no budget limit when budget is null", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", pointBudget: null, choices: [makeChoice({ id: "c1", pointCost: 10 })] },
    );
    expect(result.narrator).toContain("no budget limit");
  });

  it("derives epic fantasy tone for magic category", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [makeChoice({ id: "c1", category: "magic" })] },
    );
    expect(result.narrator).toContain("epic fantasy");
  });

  it("derives sci-fi tone for technology category", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [makeChoice({ id: "c1", category: "technology" })] },
    );
    expect(result.narrator).toContain("sci-fi");
  });

  it("derives action tone for combat category", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [makeChoice({ id: "c1", category: "combat" })] },
    );
    expect(result.narrator).toContain("action-oriented");
  });

  it("derives noir tone for stealth category", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [makeChoice({ id: "c1", category: "stealth" })] },
    );
    expect(result.narrator).toContain("noir thriller");
  });

  it("derives adventure tone as fallback", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [makeChoice({ id: "c1", category: "cooking" })] },
    );
    expect(result.narrator).toContain("adventure");
  });

  it("uses first matching category for tone (magic wins over combat)", () => {
    const choices = [
      makeChoice({ id: "c1", category: "magic" }),
      makeChoice({ id: "c2", category: "combat" }),
    ];
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1", "c2"] },
      { name: "Doc", choices },
    );
    expect(result.narrator).toContain("epic fantasy");
  });

  it("shows active synergies when all referenced choices are selected", () => {
    const analysis = {
      topSynergies: [
        { choiceIds: ["c1", "c2"], description: "Fire + Steel combo", combinedValue: "high" as const },
      ],
    };
    const choices = [
      makeChoice({ id: "c1", name: "Fireball" }),
      makeChoice({ id: "c2", name: "Sword" }),
    ];
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1", "c2"] },
      { name: "Doc", choices, analysis },
    );
    expect(result.narrator).toContain("Fire + Steel combo");
    expect(result.narrator).toContain("Value: high");
  });

  it("hides synergies when not all referenced choices are selected", () => {
    const analysis = {
      topSynergies: [
        { choiceIds: ["c1", "c2", "c3"], description: "Triple threat", combinedValue: "high" as const },
      ],
    };
    const choices = [
      makeChoice({ id: "c1", name: "Fireball" }),
      makeChoice({ id: "c2", name: "Sword" }),
      makeChoice({ id: "c3", name: "Shield" }),
    ];
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1", "c2"] },
      { name: "Doc", choices, analysis },
    );
    expect(result.narrator).not.toContain("Triple threat");
    expect(result.narrator).toContain("No active synergies detected");
  });

  it("shows 'No active synergies detected' when analysis has no synergies", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [makeChoice({ id: "c1" })], analysis: { topSynergies: [] } },
    );
    expect(result.narrator).toContain("No active synergies detected");
  });

  it("shows 'No active synergies detected' when analysis is null", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [makeChoice({ id: "c1" })], analysis: null },
    );
    expect(result.narrator).toContain("No active synergies detected");
  });

  it("includes categories in director and world prompts", () => {
    const choices = [
      makeChoice({ id: "c1", category: "magic" }),
      makeChoice({ id: "c2", category: "combat" }),
    ];
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1", "c2"] },
      { name: "Doc", choices },
    );
    expect(result.director).toContain("magic, combat");
    expect(result.world).toContain("magic, combat");
    expect(result.characters).toContain("magic, combat");
  });

  it("handles choices with null category gracefully", () => {
    const choices = [makeChoice({ id: "c1", category: null })];
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices },
    );
    expect(result.narrator).toContain("uncategorized");
  });

  it("handles empty selectedChoiceIds", () => {
    const choices = [makeChoice({ id: "c1", name: "Orphan Choice" })];
    const result = buildNarratorPrompts(
      { name: "Empty Build", selectedChoiceIds: [] },
      { name: "Doc", choices },
    );
    expect(result.narrator).not.toContain("Orphan Choice");
    expect(result.narrator).toContain("0 points spent");
  });

  it("handles choices with null pointCost as 0", () => {
    const choices = [makeChoice({ id: "c1", pointCost: null })];
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices },
    );
    expect(result.narrator).toContain("0 pts");
    expect(result.narrator).toContain("0 points spent");
  });

  it("handles choices with null tier as question mark", () => {
    const choices = [makeChoice({ id: "c1", tier: null })];
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices },
    );
    expect(result.narrator).toContain("Tier ?");
  });

  it("includes world simulator escalation rules", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [makeChoice({ id: "c1" })] },
    );
    expect(result.world).toContain("ESCALATE");
    expect(result.world).toContain("Start subtle");
    expect(result.world).toContain("NEVER make it impossible");
  });

  it("includes information control rules in director", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [makeChoice({ id: "c1" })] },
    );
    expect(result.director).toContain("Information Control Rules");
    expect(result.director).toContain("Early game");
    expect(result.director).toContain("Late game");
  });

  it("includes voice profiles in characters prompt", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [makeChoice({ id: "c1" })] },
    );
    expect(result.characters).toContain("Voice Profiles");
    expect(result.characters).toContain("Authority figures");
    expect(result.characters).toContain("Allies");
    expect(result.characters).toContain("Enemies");
  });

  it("narrator mentions receiving from Director", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [makeChoice({ id: "c1" })] },
    );
    expect(result.narrator).toContain("Director");
    expect(result.narrator).toContain("scene descriptions");
  });

  it("world mentions it is behind the scenes", () => {
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [makeChoice({ id: "c1" })] },
    );
    expect(result.world).toContain("BEHIND THE SCENES");
    expect(result.world).toContain("player never sees");
  });

  it("computes total cost across multiple choices", () => {
    const choices = [
      makeChoice({ id: "c1", pointCost: 10 }),
      makeChoice({ id: "c2", pointCost: 8 }),
      makeChoice({ id: "c3", pointCost: 5 }),
    ];
    const result = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1", "c2", "c3"] },
      { name: "Doc", choices },
    );
    expect(result.narrator).toContain("23 points spent");
  });

  it("handles large multi-category builds end-to-end", () => {
    const allChoices = [
      makeChoice({ id: "c1", name: "Pyromancy", category: "magic", pointCost: 15, tier: "S" }),
      makeChoice({ id: "c2", name: "Longsword", category: "combat", pointCost: 8, tier: "B" }),
      makeChoice({ id: "c3", name: "Shadow Step", category: "stealth", pointCost: 10, tier: "A" }),
      makeChoice({ id: "c4", name: "Cybernetic Eye", category: "technology", pointCost: 12, tier: "A" }),
      makeChoice({ id: "c5", name: "Cooking", category: "lifestyle", pointCost: 2, tier: "D" }),
    ];
    const analysis = {
      topSynergies: [
        { choiceIds: ["c1", "c2"], description: "Burning Blade", combinedValue: "high" as const },
        { choiceIds: ["c3", "c4"], description: "Digital Ghost", combinedValue: "medium" as const },
        { choiceIds: ["c1", "c5"], description: "Unrelated", combinedValue: "low" as const },
      ],
    };
    const result = buildNarratorPrompts(
      { name: "The Avenger", description: "A multidisciplinary operative", selectedChoiceIds: ["c1", "c2", "c3", "c4"] },
      { name: "Multiverse CYOA", pointBudget: 100, choices: allChoices, analysis },
    );

    expect(result.narrator).toContain("The Avenger");
    expect(result.narrator).toContain("A multidisciplinary operative");
    expect(result.narrator).toContain("45 points spent / 100 budget");
    expect(result.narrator).toContain("Pyromancy");
    expect(result.narrator).toContain("Cybernetic Eye");
    expect(result.narrator).not.toContain("Cooking");
    expect(result.narrator).toContain("Burning Blade");
    expect(result.narrator).toContain("Digital Ghost");
    expect(result.narrator).not.toContain("Unrelated");
    expect(result.narrator).toContain("epic fantasy");

    expect(result.director).toContain("The Avenger");
    expect(result.director).toContain("Information Control Rules");

    expect(result.world).toContain("ESCALATE");
    expect(result.world).toContain("BEHIND THE SCENES");
    expect(result.world).toContain("Pyromancy");
    expect(result.world).toContain("Cybernetic Eye");

    expect(result.characters).toContain("Voice Profiles");
    expect(result.characters).toContain("epic fantasy");
  });
});

describe("buildNarratorPrompts with difficulty", () => {
  const baseBuild = { name: "Hero", selectedChoiceIds: ["c1"] };
  const baseDoc = { name: "Doc", choices: [{ id: "c1", name: "Choice", category: "magic", pointCost: 5, tier: "B" }] };

  it("applies Director aggression = 1 (Passive) language", () => {
    const result = buildNarratorPrompts(
      baseBuild,
      baseDoc,
      { directorAggression: 1, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: false, stealthDisabled: false },
    );
    expect(result.director).toContain("Reveal information freely");
  });

  it("applies Director aggression = 5 (Merciless) language", () => {
    const result = buildNarratorPrompts(
      baseBuild,
      baseDoc,
      { directorAggression: 5, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: false, stealthDisabled: false },
    );
    expect(result.director).toContain("Actively deceive");
  });

  it("applies World escalation = 1 (Glacial) language", () => {
    const result = buildNarratorPrompts(
      baseBuild,
      baseDoc,
      { directorAggression: 3, worldEscalation: 1, informationLeakage: 3, adversaryEnabled: false, stealthDisabled: false },
    );
    expect(result.world).toContain("React slowly");
  });

  it("applies World escalation = 5 (Relentless) language", () => {
    const result = buildNarratorPrompts(
      baseBuild,
      baseDoc,
      { directorAggression: 3, worldEscalation: 5, informationLeakage: 3, adversaryEnabled: false, stealthDisabled: false },
    );
    expect(result.world).toContain("React immediately");
  });

  it("applies Information leakage = 1 (Open) to Director", () => {
    const result = buildNarratorPrompts(
      baseBuild,
      baseDoc,
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 1, adversaryEnabled: false, stealthDisabled: false },
    );
    expect(result.director).toContain("Pass full intelligence to the Narrator");
  });

  it("applies Information leakage = 5 (Blackout) to Director", () => {
    const result = buildNarratorPrompts(
      baseBuild,
      baseDoc,
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 5, adversaryEnabled: false, stealthDisabled: false },
    );
    expect(result.director).toContain("Pass almost nothing");
  });

  it("uses default difficulty when not provided", () => {
    const result = buildNarratorPrompts(baseBuild, baseDoc);
    expect(result.director).toContain("Control information flow");
    expect(result.world).toContain("React within a few turns");
    expect(result.director).toContain("Filter intelligence through narrative context");
  });

  it("embeds character voice instructions in characters prompt", () => {
    const result = buildNarratorPrompts(
      baseBuild,
      baseDoc,
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: false, stealthDisabled: false },
    );
    expect(result.characters).toContain("When the player addresses an NPC");
  });
});
