import assert from "node:assert/strict";
import { buildNarratorPrompts } from "../../packages/server/src/services/cyoa/cyoa-narrator.js";
import type { CyoaDifficulty } from "../../packages/server/src/services/cyoa/cyoa-narrator.js";
import { buildAdversaryPrompt } from "../../packages/server/src/services/cyoa/cyoa-adversary.js";

type Choice = {
  id: string;
  name: string;
  description: string;
  category: string | null;
  pointCost: number | null;
  tier: string | null;
  stealth?: boolean;
};

function choice(overrides: Partial<Choice> = {}): Choice {
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

const difficulty = (overrides: Partial<CyoaDifficulty> = {}): CyoaDifficulty => ({
  directorAggression: 3,
  worldEscalation: 3,
  informationLeakage: 3,
  adversaryEnabled: false,
  stealthDisabled: false,
  ...overrides,
});

// ── buildNarratorPrompts ──
{
  const single = choice({ id: "c1" });
  const prompts = buildNarratorPrompts({ name: "Test Build", selectedChoiceIds: ["c1"] }, { name: "Test Doc", choices: [single] });
  assert.equal(typeof prompts.narrator, "string");
  assert.equal(typeof prompts.director, "string");
  assert.equal(typeof prompts.world, "string");
  assert.equal(typeof prompts.characters, "string");
}

// Build name propagates into every prompt; description appears only when given.
{
  const prompts = buildNarratorPrompts(
    { name: "My Hero", description: "A brave warrior", selectedChoiceIds: ["c1"] },
    { name: "Doc", choices: [choice({ id: "c1" })] },
  );
  for (const text of [prompts.narrator, prompts.director, prompts.world]) assert.ok(text.includes("My Hero"));
  assert.ok(prompts.narrator.includes("A brave warrior"));

  const bare = buildNarratorPrompts({ name: "Hero", selectedChoiceIds: ["c1"] }, { name: "Doc", choices: [choice({ id: "c1" })] });
  assert.equal(bare.narrator.includes("**undefined**"), false);
}

// Only selected choices are listed; point totals and budgets are computed.
{
  const prompts = buildNarratorPrompts(
    { name: "Hero", selectedChoiceIds: ["c1", "c2"] },
    {
      name: "Doc",
      choices: [
        choice({ id: "c1", name: "Selected", pointCost: 10 }),
        choice({ id: "c2", name: "Also Selected", pointCost: 8 }),
        choice({ id: "c3", name: "Not Selected" }),
      ],
    },
  );
  assert.ok(prompts.narrator.includes("Selected"));
  assert.ok(prompts.narrator.includes("18 points spent"));
  assert.equal(prompts.narrator.includes("Not Selected"), false);

  const budgeted = buildNarratorPrompts(
    { name: "Hero", selectedChoiceIds: ["c1"] },
    { name: "Doc", pointBudget: 50, choices: [choice({ id: "c1", pointCost: 10 })] },
  );
  assert.ok(budgeted.narrator.includes("10 points spent / 50 budget"));

  const unbudgeted = buildNarratorPrompts(
    { name: "Hero", selectedChoiceIds: ["c1"] },
    { name: "Doc", pointBudget: null, choices: [choice({ id: "c1", pointCost: 10 })] },
  );
  assert.ok(unbudgeted.narrator.includes("no budget limit"));

  const empty = buildNarratorPrompts({ name: "Empty Build", selectedChoiceIds: [] }, { name: "Doc", choices: [choice({ id: "c1", name: "Orphan Choice" })] });
  assert.equal(empty.narrator.includes("Orphan Choice"), false);
  assert.ok(empty.narrator.includes("0 points spent"));
}

// Tone derives from the first matching category.
{
  for (const [category, tone] of [
    ["magic", "epic fantasy"],
    ["technology", "sci-fi"],
    ["combat", "action-oriented"],
    ["stealth", "noir thriller"],
    ["cooking", "adventure"],
  ] as const) {
    const prompts = buildNarratorPrompts(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: [choice({ id: "c1", category })] },
    );
    assert.ok(prompts.narrator.includes(tone), `${category} must derive ${tone} tone`);
  }

  const mixed = buildNarratorPrompts(
    { name: "Hero", selectedChoiceIds: ["c1", "c2"] },
    { name: "Doc", choices: [choice({ id: "c1", category: "magic" }), choice({ id: "c2", category: "combat" })] },
  );
  assert.ok(mixed.narrator.includes("epic fantasy"));
}

// Synergies surface only when every referenced choice is selected.
{
  const synergy = { topSynergies: [{ choiceIds: ["c1", "c2"], description: "Fire + Steel combo", combinedValue: "high" as const }] };
  const partial = { topSynergies: [{ choiceIds: ["c1", "c2", "c3"], description: "Triple threat", combinedValue: "high" as const }] };
  const choices = [choice({ id: "c1", name: "Fireball" }), choice({ id: "c2", name: "Sword" }), choice({ id: "c3", name: "Shield" })];

  const active = buildNarratorPrompts({ name: "Hero", selectedChoiceIds: ["c1", "c2"] }, { name: "Doc", choices, analysis: synergy });
  assert.ok(active.narrator.includes("Fire + Steel combo"));
  assert.ok(active.narrator.includes("Value: high"));

  const inactive = buildNarratorPrompts({ name: "Hero", selectedChoiceIds: ["c1", "c2"] }, { name: "Doc", choices, analysis: partial });
  assert.equal(inactive.narrator.includes("Triple threat"), false);
  assert.ok(inactive.narrator.includes("No active synergies detected"));

  for (const analysis of [{ topSynergies: [] }, null]) {
    const prompts = buildNarratorPrompts({ name: "Hero", selectedChoiceIds: ["c1"] }, { name: "Doc", choices: [choice({ id: "c1" })], analysis });
    assert.ok(prompts.narrator.includes("No active synergies detected"));
  }
}

// Categories propagate; nulls degrade gracefully.
{
  const prompts = buildNarratorPrompts(
    { name: "Hero", selectedChoiceIds: ["c1", "c2"] },
    { name: "Doc", choices: [choice({ id: "c1", category: "magic" }), choice({ id: "c2", category: "combat" })] },
  );
  for (const text of [prompts.director, prompts.world, prompts.characters]) assert.ok(text.includes("magic, combat"));

  const uncategorized = buildNarratorPrompts({ name: "Hero", selectedChoiceIds: ["c1"] }, { name: "Doc", choices: [choice({ id: "c1", category: null })] });
  assert.ok(uncategorized.narrator.includes("uncategorized"));

  const free = buildNarratorPrompts({ name: "Hero", selectedChoiceIds: ["c1"] }, { name: "Doc", choices: [choice({ id: "c1", pointCost: null })] });
  assert.ok(free.narrator.includes("0 pts"));

  const untiered = buildNarratorPrompts({ name: "Hero", selectedChoiceIds: ["c1"] }, { name: "Doc", choices: [choice({ id: "c1", tier: null })] });
  assert.ok(untiered.narrator.includes("Tier ?"));
}

// Prompt structure: roles, ordering, and fixed instruction blocks.
{
  const prompts = buildNarratorPrompts({ name: "Hero", selectedChoiceIds: ["c1"] }, { name: "Doc", choices: [choice({ id: "c1" })] });
  assert.ok(prompts.narrator.indexOf("NARRATOR PERSONA") < prompts.narrator.indexOf("CHAIN OF THOUGHT") || !prompts.narrator.includes("CHAIN OF THOUGHT"));
  assert.ok(prompts.director.includes("Information Control Rules"));
  assert.ok(prompts.director.includes("Early game"));
  assert.ok(prompts.director.includes("Late game"));
  assert.ok(prompts.world.includes("ESCALATE"));
  assert.ok(prompts.world.includes("BEHIND THE SCENES"));
  assert.ok(prompts.world.includes("NEVER make it impossible"));
  assert.ok(prompts.characters.includes("Voice Profiles"));
  assert.ok(prompts.characters.includes("Authority figures"));
  assert.ok(prompts.narrator.includes("Director"));
  assert.ok(prompts.narrator.includes("scene descriptions"));
}

// Difficulty language swaps per slider position.
{
  const base = { name: "Hero", selectedChoiceIds: ["c1"] };
  const doc = { name: "Doc", choices: [choice({ id: "c1", category: "magic" })] };

  const passive = buildNarratorPrompts(base, doc, difficulty({ directorAggression: 1 }));
  assert.ok(passive.director.includes("Reveal information freely"));

  const merciless = buildNarratorPrompts(base, doc, difficulty({ directorAggression: 5 }));
  assert.ok(merciless.director.includes("Actively deceive"));

  const glacial = buildNarratorPrompts(base, doc, difficulty({ worldEscalation: 1 }));
  assert.ok(glacial.world.includes("React slowly"));

  const relentless = buildNarratorPrompts(base, doc, difficulty({ worldEscalation: 5 }));
  assert.ok(relentless.world.includes("React immediately"));

  const open = buildNarratorPrompts(base, doc, difficulty({ informationLeakage: 1 }));
  assert.ok(open.director.includes("Pass full intelligence to the Narrator"));

  const blackout = buildNarratorPrompts(base, doc, difficulty({ informationLeakage: 5 }));
  assert.ok(blackout.director.includes("Pass almost nothing"));

  const defaults = buildNarratorPrompts(base, doc);
  assert.ok(defaults.director.includes("Control information flow"));
  assert.ok(defaults.world.includes("React within a few turns"));
  assert.ok(defaults.director.includes("Filter intelligence through narrative context"));
  assert.ok(defaults.characters.includes("When the player addresses an NPC"));
}

// Large multi-category build end-to-end.
{
  const allChoices = [
    choice({ id: "c1", name: "Pyromancy", category: "magic", pointCost: 15, tier: "S" }),
    choice({ id: "c2", name: "Longsword", category: "combat", pointCost: 8, tier: "B" }),
    choice({ id: "c3", name: "Shadow Step", category: "stealth", pointCost: 10, tier: "A" }),
    choice({ id: "c4", name: "Cybernetic Eye", category: "technology", pointCost: 12, tier: "A" }),
    choice({ id: "c5", name: "Cooking", category: "lifestyle", pointCost: 2, tier: "D" }),
  ];
  const analysis = {
    topSynergies: [
      { choiceIds: ["c1", "c2"], description: "Burning Blade", combinedValue: "high" as const },
      { choiceIds: ["c3", "c4"], description: "Digital Ghost", combinedValue: "medium" as const },
      { choiceIds: ["c1", "c5"], description: "Unrelated", combinedValue: "low" as const },
    ],
  };
  const prompts = buildNarratorPrompts(
    { name: "The Avenger", description: "A multidisciplinary operative", selectedChoiceIds: ["c1", "c2", "c3", "c4"] },
    { name: "Multiverse CYOA", pointBudget: 100, choices: allChoices, analysis },
  );
  assert.ok(prompts.narrator.includes("45 points spent / 100 budget"));
  assert.ok(prompts.narrator.includes("Pyromancy"));
  assert.ok(prompts.narrator.includes("Cybernetic Eye"));
  assert.equal(prompts.narrator.includes("Cooking"), false);
  assert.ok(prompts.narrator.includes("Burning Blade"));
  assert.ok(prompts.narrator.includes("Digital Ghost"));
  assert.equal(prompts.narrator.includes("Unrelated"), false);
  assert.ok(prompts.narrator.includes("epic fantasy"));
  assert.ok(prompts.world.includes("Pyromancy"));
}

// ── buildAdversaryPrompt ──
const adversaryChoices: Choice[] = [
  { id: "c1", name: "Fireball", description: "", category: "magic", pointCost: 10, tier: "A", stealth: false },
  { id: "c2", name: "Shadow Step", description: "", category: "stealth", pointCost: 8, tier: "B", stealth: true },
  { id: "c3", name: "Healing Aura", description: "", category: "magic", pointCost: 12, tier: "A", stealth: true },
  { id: "c4", name: "Sword", description: "", category: "combat", pointCost: 6, tier: "C", stealth: false },
];

{
  const prompt = buildAdversaryPrompt(
    { name: "Hero", selectedChoiceIds: ["c1", "c2", "c4"] },
    { name: "Doc", choices: adversaryChoices },
    difficulty({ adversaryEnabled: true }),
  );
  assert.ok(prompt.length > 100);
  assert.ok(prompt.includes("Fireball"));
  assert.ok(prompt.includes("Sword"));
  assert.equal(prompt.includes("Shadow Step"), false, "stealth choices must be hidden from the Adversary");
  assert.ok(prompt.includes("1 ability hidden from you"));
  assert.ok(prompt.includes("exploit"));
  assert.ok(prompt.includes("complication"));
}

{
  const revealed = buildAdversaryPrompt(
    { name: "Hero", selectedChoiceIds: ["c1", "c2", "c4"] },
    { name: "Doc", choices: adversaryChoices },
    difficulty({ adversaryEnabled: true, stealthDisabled: true }),
  );
  assert.ok(revealed.includes("Shadow Step"));
  assert.equal(revealed.includes("hidden from you"), false);

  const noStealth = buildAdversaryPrompt(
    { name: "Hero", selectedChoiceIds: ["c1", "c4"] },
    { name: "Doc", choices: adversaryChoices },
    difficulty({ adversaryEnabled: true }),
  );
  assert.equal(noStealth.includes("hidden from you"), false);

  const named = buildAdversaryPrompt(
    { name: "The Avenger", selectedChoiceIds: ["c1"] },
    { name: "Doc", choices: adversaryChoices },
    difficulty({ adversaryEnabled: true }),
  );
  assert.ok(named.includes("The Avenger"));

  const passive = buildAdversaryPrompt({ name: "Hero", selectedChoiceIds: ["c1"] }, { name: "Doc", choices: adversaryChoices }, difficulty({ adversaryEnabled: true, directorAggression: 1 }));
  const merciless = buildAdversaryPrompt({ name: "Hero", selectedChoiceIds: ["c1"] }, { name: "Doc", choices: adversaryChoices }, difficulty({ adversaryEnabled: true, directorAggression: 5 }));
  assert.notEqual(passive, merciless);

  const free = buildAdversaryPrompt(
    { name: "Hero", selectedChoiceIds: ["c1"] },
    { name: "Doc", choices: [{ id: "c1", name: "Free", description: "", category: "magic", pointCost: null, tier: "B", stealth: false }] },
    difficulty({ adversaryEnabled: true }),
  );
  assert.ok(free.includes("Free"));
  assert.ok(free.includes("0 pts"));
}

process.stdout.write("CYOA narrator prompt regression passed.\n");
