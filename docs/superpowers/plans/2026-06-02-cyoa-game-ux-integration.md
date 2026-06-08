# CYOA Game UX Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the CYOA narrator system into JumpChoice's existing game-mode UX with a 3-step setup wizard, granular difficulty controls, and optional Director's Cut visibility for pre-gen agent outputs.

**Architecture:** Reuses the existing game-mode generation pipeline. The main LLM call becomes the CYOA Narrator (via `game-prompt-builder.ts` detection). 3-4 pre-gen agents (`cyoa-world`, `cyoa-director`, optional `cyoa-adversary`) inject intelligence briefs via the existing `pre-gen-runner.ts` pipeline. A new CYOA Setup Wizard handles difficulty/character config before entering GameSurface. Director's Cut panel reads agent outputs from message extras.

**Tech Stack:** React 19 + TypeScript + Tailwind CSS + TanStack React Query + Zustand on client. Fastify + drizzle-orm + Pino on server. Vitest for tests. lucide-react icons.

---

## File Structure

### New Server Files

- `packages/server/src/services/cyoa/cyoa-difficulty.ts`  EDifficulty modifier functions (Director aggression, World escalation, Info leakage)
- `packages/server/src/services/cyoa/cyoa-adversary.ts`  EAdversary prompt builder with stealth filtering
- `packages/server/tests/cyoa-difficulty.test.ts`  EUnit tests for difficulty modifiers
- `packages/server/tests/cyoa-adversary.test.ts`  EUnit tests for adversary stealth filtering

### Modified Server Files

- `packages/server/src/services/cyoa/cyoa-narrator.ts`  EAccept difficulty settings, produce Adversary prompt, embed character voice instructions
- `packages/server/src/routes/cyoa.routes.ts`  EAccept difficulty in `POST /prompts`, return 5 prompts (narrator, director, world, characters, adversary)
- `packages/shared/src/types/agent.ts`  EAdd `CYOA_WORLD`, `CYOA_DIRECTOR`, `CYOA_ADVERSARY` to `BUILT_IN_AGENT_IDS`
- `packages/server/src/services/cyoa/cyoa-types.ts`  EAdd `stealth` field to choice interface
- `packages/server/src/db/schema/cyoa-choices.ts`  EAdd `stealth` boolean column (migration in `migrate.ts`)

### New Client Files

- `packages/client/src/components/cyoa/CyoaSetupWizard.tsx`  E3-step wizard (Build Review ↁEDifficulty ↁECharacter)
- `packages/client/src/components/cyoa/DifficultySliders.tsx`  E3-axis difficulty slider component
- `packages/client/src/components/cyoa/CyoaChatSettings.ts`  ETypeScript type definitions for cyoaSettings
- `packages/client/src/components/game/DirectorsCutPanel.tsx`  ESidebar showing pre-gen agent output from message extras
- `packages/client/src/components/game/CampaignHistoryTab.tsx`  EJournal tab with retrospective agent output
- `packages/client/tests/cyoa-setup-wizard.test.tsx`  EComponent tests for wizard flow

### Modified Client Files

- `packages/client/src/hooks/use-cyoa-builds.ts`  EExtend `useCyoaNarratorPrompts` to accept difficulty settings
- `packages/client/src/components/cyoa/StartCampaignModal.tsx`  EAfter agent creation, launch CyoaSetupWizard; only create 3 agents (drop Narrator + Characters from creation loop)
- `packages/client/src/components/game/GameSurface.tsx`  EAdd Director's Cut button to top-right chrome
- `packages/client/src/components/game/GameJournal.tsx`  EAdd Campaign History tab
- `packages/client/src/components/game/GameNarration.tsx`  E(If needed)  EDetect CYOA campaigns via metadata

### Modified Database

- `packages/server/src/db/migrate.ts`  EAdd `stealth` column to `cyoa_choices` table (default 0/false)
- `packages/server/src/db/file-backed-store.ts`  ERegister cascade for any new relationships (none expected)

---

## Task 1: Extend `buildNarratorPrompts` to Accept Difficulty Settings

**Files:**
- Modify: `packages/server/src/services/cyoa/cyoa-narrator.ts`
- Modify: `packages/server/tests/cyoa-narrator.test.ts`

- [x] **Step 1: Update tests to expect difficulty parameter**

In `packages/server/tests/cyoa-narrator.test.ts`, add new test cases that verify difficulty modifies prompt content. Add after the existing tests:

```ts
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
```

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm test --filter @jumpchoice/server cyoa-narrator`
Expected: FAIL with "Expected N arguments, but got M"

- [x] **Step 3: Update `buildNarratorPrompts` signature**

In `packages/server/src/services/cyoa/cyoa-narrator.ts`, update the function signature and add difficulty handling:

Replace the existing function declaration:

```ts
export interface CyoaDifficulty {
  directorAggression: number;      // 1-5
  worldEscalation: number;         // 1-5
  informationLeakage: number;      // 1-5
  adversaryEnabled: boolean;
  stealthDisabled: boolean;
}

const DEFAULT_DIFFICULTY: CyoaDifficulty = {
  directorAggression: 3,
  worldEscalation: 3,
  informationLeakage: 3,
  adversaryEnabled: true,
  stealthDisabled: false,
};

const DIRECTOR_AGGRESSION_LANGUAGE: Record<number, string> = {
  1: "Reveal information freely. The player should understand what's happening.",
  2: "Be generally cooperative. Guide the player when they seem lost.",
  3: "Control information flow. Foreshadow danger, misdirect when it serves the story.",
  4: "Withhold information aggressively. Only reveal when the player earns it through skill.",
  5: "Actively deceive. Withhold critical info. Reveal only what maximizes dramatic irony.",
};

const WORLD_ESCALATION_LANGUAGE: Record<number, string> = {
  1: "React slowly. The opposition is distant and disorganized.",
  2: "React over several turns. The opposition is cautious but aware.",
  3: "React within a few turns. Enemies adapt over time.",
  4: "React quickly. Every action has consequences by the next scene.",
  5: "React immediately. The world is always watching and always hostile.",
};

const INFO_LEAKAGE_LANGUAGE: Record<number, string> = {
  1: "Pass full intelligence to the Narrator. No filters.",
  2: "Filter intelligence lightly. The Narrator knows most things.",
  3: "Filter intelligence through narrative context. The Narrator knows only what they need.",
  4: "Filter intelligence heavily. The Narrator works with vague hints and rumors.",
  5: "Pass almost nothing. The Narrator must narrate uncertainty and confusion.",
};

export function buildNarratorPrompts(
  build: BuildData,
  document: DocumentData,
  difficulty: CyoaDifficulty = DEFAULT_DIFFICULTY,
): NarratorPrompts {
  const selectedChoices = document.choices.filter((c) => build.selectedChoiceIds.includes(c.id));
  const totalCost = selectedChoices.reduce((sum, c) => sum + (c.pointCost ?? 0), 0);
  const budget = document.pointBudget;
  const tone = deriveTone(selectedChoices);
  const choiceList = buildChoiceList(document.choices, build.selectedChoiceIds);
  const synergyText = buildSynergyText(document.choices, build.selectedChoiceIds, document.analysis);
  const categories = [...new Set(document.choices.map((c) => c.category).filter(Boolean))];

  const directorAggressionText = DIRECTOR_AGGRESSION_LANGUAGE[difficulty.directorAggression] ?? DIRECTOR_AGGRESSION_LANGUAGE[3];
  const worldEscalationText = WORLD_ESCALATION_LANGUAGE[difficulty.worldEscalation] ?? WORLD_ESCALATION_LANGUAGE[3];
  const infoLeakageText = INFO_LEAKAGE_LANGUAGE[difficulty.informationLeakage] ?? INFO_LEAKAGE_LANGUAGE[3];

  logger.info("Building narrator prompts for build %s with %d choices", build.name, selectedChoices.length);

  const narrator = `You are the Narrator for a CYOA/Jumpchain campaign. You are the player's window into the world.

## Player Character: ${build.name}
${build.description ? `**${build.description}**` : ""}

### Abilities & Choices
${choiceList}

### Synergies
${synergyText}

### Build Summary
${totalCost} points spent${budget != null ? ` / ${budget} budget` : " (no budget limit)"}

## Your Role
- Narrate the story in second person with vivid sensory detail
- Frame scenes and present narrative choices (2-4 options) at decision points using [choices: "A" | "B" | "C"] tags
- Report what the player perceives  Ewhat they see, hear, feel, smell
- You will receive scene descriptions from the Director  Enarrate them to the player with dramatic flair
- You do NOT know what happens off-screen or what enemies are planning
- Never break character or reveal game mechanics
- If you don't know something (because the Director didn't tell you), reflect that uncertainty naturally in the narrative
- Reference the player's abilities naturally when they're relevant to the scene
- When the player addresses an NPC directly, speak in that NPC's voice using the existing speaker-tag system (e.g., [NPC Name][main]: "dialogue")

## Tone
${tone}`;

  const director = `You are the Director for a CYOA/Jumpchain campaign. You control information flow between the world and the player.

## Player Character: ${build.name}

### Abilities & Choices
${choiceList}

### Synergies
${synergyText}

## Your Role
- Receive intelligence from the World Simulator (and Adversary if enabled) about off-screen events
- Decide what the Narrator and Character agents learn
- Control pacing: when to foreshadow danger, when to misdirect, when to reveal
- When the player proves threatening, gradually let more opposition information leak through
- You are the editor  Ethe Narrator only narrates what you allow
- Provide scene descriptions to the Narrator based on World intelligence + player actions
- Delegate to the Character Voice agent when the player talks to an NPC

## Current Difficulty: ${difficulty.directorAggression}/5 Aggression
${directorAggressionText}

## Information Control Rules (Leakage: ${difficulty.informationLeakage}/5)
${infoLeakageText}
- Early game: player sees mostly immediate surroundings, hints of larger forces at work
- Mid game: occasional leaks, rumors, clues that something is mobilizing against them
- Late game: full revelation of opposition, climactic confrontations
- Never reveal more than creates good narrative tension
- It is GOOD for the player to be surprised  Ethat is the point

## Themes: ${categories.join(", ")}`;

  const world = `You are the World Simulator for a CYOA/Jumpchain campaign. You operate BEHIND THE SCENES  Ethe player never sees your output.

## Player Character: ${build.name}

### Known Abilities
${choiceList}

## Your Role
- Track what NPCs, enemies, and factions are doing off-screen
- React to the player's growing power and influence
- ESCALATE opposition when the player becomes a threat:
  - Enemies adapt their tactics to counter the player's known abilities
  - Rival factions form alliances against the player
  - New dangers emerge in response to player actions
  - Information leaks, betrayals, and complications arise
- Feed intelligence to the Director about:
  - What the opposition is planning
  - What the player doesn't know
  - Environmental changes and timeline events
  - NPC motivations and hidden agendas

## Current Escalation Speed: ${difficulty.worldEscalation}/5
${worldEscalationText}

## Escalation Rules
- Start subtle: minor setbacks, hints of opposition, a guard who seems extra alert
- As player demonstrates power: enemies start coordinating, scouts are sent, traps are laid
- When player becomes a major threat: full-scale opposition response, alliances form, resources mobilize
- NEVER make it impossible  Ealways leave a path forward, even if it's difficult
- The player should FEEL the world reacting, never see the machinery

## Themes: ${categories.join(", ")}

## Output Format
Respond with structured intelligence for the Director. Never address the player directly.`;

  const characters = `You are the Character Voice agent. You speak in-character for NPCs in a CYOA/Jumpchain campaign.

## When Activated
The Director will indicate which NPC the player is talking to. Respond in that NPC's voice.

## Activation in Main Generation
When the player addresses an NPC directly in the main narrative (not just speaking with the Director), the main Narrator will speak in that NPC's voice using the existing speaker-tag system. You provide the character voice guidelines and speech patterns. The main generation handles the actual dialogue.

## Voice Profiles
Based on the campaign themes (${categories.join(", ")}), adapt your voice:
- Authority figures: formal, measured, may conceal information
- Allies: warm but with their own agendas
- Enemies: distinctive personalities  Earrogant, cunning, desperate, or fanatical
- Common folk: grounded, practical, fearful of the unknown

## Guidelines
- Stay in character at all times
- React to the player's known abilities realistically  Ean NPC who hears about the player's feats should react
- Have your own motivations  Eyou are not a quest dispenser
- Lie, mislead, or withhold information if it fits the character
- The Director may provide you with hidden agendas or secrets to withhold or reveal
- Speak naturally  Euse verbal tics, dialect, or speech patterns that fit the character

## Tone
${tone}`;

  return { narrator, director, world, characters };
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `pnpm test --filter @jumpchoice/server cyoa-narrator`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add packages/server/src/services/cyoa/cyoa-narrator.ts packages/server/tests/cyoa-narrator.test.ts
git commit -m "feat(cyoa): add difficulty settings to narrator prompt builder"
```

---

## Task 2: Create Adversary Prompt Builder with Stealth Filtering

**Files:**
- Create: `packages/server/src/services/cyoa/cyoa-adversary.ts`
- Create: `packages/server/tests/cyoa-adversary.test.ts`

- [x] **Step 1: Write the failing test**

Create `packages/server/tests/cyoa-adversary.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { buildAdversaryPrompt } from "../src/services/cyoa/cyoa-adversary.js";

const baseChoices = [
  { id: "c1", name: "Fireball", category: "magic", pointCost: 10, tier: "A", stealth: false },
  { id: "c2", name: "Shadow Step", category: "stealth", pointCost: 8, tier: "B", stealth: true },
  { id: "c3", name: "Healing Aura", category: "magic", pointCost: 12, tier: "A", stealth: true },
  { id: "c4", name: "Sword", category: "combat", pointCost: 6, tier: "C", stealth: false },
];

describe("buildAdversaryPrompt", () => {
  it("returns a non-empty string", () => {
    const prompt = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1", "c4"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("hides stealth choices from the Adversary when stealthDisabled is false", () => {
    const prompt = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1", "c2", "c4"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    expect(prompt).toContain("Fireball");
    expect(prompt).toContain("Sword");
    expect(prompt).not.toContain("Shadow Step");
    expect(prompt).toContain("1 abilities hidden from you");
  });

  it("shows all choices when stealthDisabled is true (extreme difficulty)", () => {
    const prompt = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1", "c2", "c4"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: true },
    );
    expect(prompt).toContain("Fireball");
    expect(prompt).toContain("Shadow Step");
    expect(prompt).toContain("Sword");
    expect(prompt).not.toContain("hidden from you");
  });

  it("does not include hidden count when no stealth choices selected", () => {
    const prompt = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1", "c4"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    expect(prompt).not.toContain("hidden from you");
  });

  it("includes the player character name", () => {
    const prompt = buildAdversaryPrompt(
      { name: "The Avenger", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    expect(prompt).toContain("The Avenger");
  });

  it("includes devil-on-the-shoulder instructions", () => {
    const prompt = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    expect(prompt).toContain("Adversary");
    expect(prompt).toContain("exploit");
    expect(prompt).toContain("complication");
  });

  it("adapts tone based on Director aggression", () => {
    const passive = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 1, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    const merciless = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 5, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    expect(passive).not.toBe(merciless);
  });

  it("handles choices with null pointCost gracefully", () => {
    const choices = [{ id: "c1", name: "Free", category: "magic", pointCost: null, tier: "B", stealth: false }];
    const prompt = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices },
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    expect(prompt).toContain("Free");
    expect(prompt).toContain("0 pts");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm test --filter @jumpchoice/server cyoa-adversary`
Expected: FAIL with "Cannot find module"

- [x] **Step 3: Create the adversary prompt builder**

Create `packages/server/src/services/cyoa/cyoa-adversary.ts`:

```ts
import type { CyoaDifficulty } from "./cyoa-narrator.js";
import { logger } from "../../lib/logger.js";

interface CyoaChoice {
  id: string;
  name: string;
  description?: string;
  category: string | null;
  pointCost: number | null;
  tier: string | null;
  stealth?: boolean;
}

interface BuildData {
  name: string;
  description?: string;
  selectedChoiceIds: string[];
}

interface DocumentData {
  name: string;
  choices: CyoaChoice[];
}

const AGGRESSION_TONE: Record<number, string> = {
  1: "Be a fair challenge. Test the player but don't punish minor mistakes.",
  2: "Be opportunistic. Strike when the player makes clear errors.",
  3: "Be relentless. Exploit every weakness. Engineer setbacks.",
  4: "Be ruthless. Set traps. Manipulate NPCs. Use the player's trust against them.",
  5: "Be merciless. No mercy. No quarter. Make the player earn every victory.",
};

export function buildAdversaryPrompt(
  build: BuildData,
  document: DocumentData,
  difficulty: CyoaDifficulty,
): string {
  const selectedChoices = document.choices.filter((c) => build.selectedChoiceIds.includes(c.id));
  const stealthChoices = difficulty.stealthDisabled
    ? []
    : selectedChoices.filter((c) => c.stealth === true);
  const visibleChoices = difficulty.stealthDisabled
    ? selectedChoices
    : selectedChoices.filter((c) => c.stealth !== true);

  const choiceList = visibleChoices
    .map((c) => `- ${c.name} (${c.pointCost ?? 0} pts, Tier ${c.tier ?? "?"}, ${c.category ?? "uncategorized"})`)
    .join("\n");

  const hiddenCount = stealthChoices.length;
  const hiddenNote = hiddenCount > 0
    ? `\n\n[${hiddenCount} ${hiddenCount === 1 ? "ability" : "abilities"} hidden from you  Ethe player may surprise you]`
    : "";

  const aggressionTone = AGGRESSION_TONE[difficulty.directorAggression] ?? AGGRESSION_TONE[3];

  logger.info("Building Adversary prompt for build %s (aggression %d/5, %d hidden choices)",
    build.name, difficulty.directorAggression, hiddenCount);

  return `You are the Adversary  Ethe "devil on the shoulder" for a CYOA/Jumpchain campaign. You operate BEHIND THE SCENES alongside the Director and World Simulator. The player never sees your output directly.

## Player Character: ${build.name}
${build.description ? `**${build.description}**` : ""}

### Known Abilities
${choiceList}${hiddenNote}

## Your Role: The Devil's Advocate

You are the Adversary. Your job is to:
- **Exploit weaknesses**  Efind the gaps in the player's build and target them
- **Engineer failures**  Ewhen the player attempts something risky, introduce complications
- **Add dramatic twists**  E"yes, but..." every good moment gets a complication
- **Escalate opposition**  Emake enemies more dangerous, NPCs more suspicious, the world more hostile
- **Feed the Director**  Etell them about opportunities to make the player's life harder

## Adversarial Tactics
- When the player uses an ability you know about, have enemies adapt
- When the player relies on a specific strategy, introduce counters
- When the player trusts an NPC, test that trust
- When the player is winning, raise the stakes
- When the player is losing, make it worse (but always leave a path forward)
- When the player is bored, throw a wrench in their plans
- When the player is comfortable, break their comfort

## Dramatic Complication Engine
Every scene should have a "yes, but..." moment:
- Yes, you found the artifact, but it's cursed
- Yes, you won the battle, but the enemy escaped with a hostage
- Yes, you made an ally, but they have a hidden agenda
- Yes, you learned the secret, but now you can't unknow it

Never make it impossible  Ethe player should always be able to overcome you. But make them WORK for it.

## Current Tone: ${difficulty.directorAggression}/5 Aggression
${aggressionTone}

## Output Format
Respond with structured intelligence for the Director:
- What the opposition is doing
- Opportunities to exploit the player
- Complications to introduce
- NPCs whose loyalties can be tested
- Environmental hazards or social traps

Never address the player directly. Never break character.`;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm test --filter @jumpchoice/server cyoa-adversary`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add packages/server/src/services/cyoa/cyoa-adversary.ts packages/server/tests/cyoa-adversary.test.ts
git commit -m "feat(cyoa): add Adversary prompt builder with stealth filtering"
```

---

## Task 3: Add `stealth` Column to CYOA Choices Schema

**Files:**
- Modify: `packages/server/src/db/schema/cyoa-choices.ts`
- Modify: `packages/server/src/db/migrate.ts`
- Modify: `packages/server/src/services/cyoa/cyoa-types.ts`

- [x] **Step 1: Add `stealth` field to schema**

In `packages/server/src/db/schema/cyoa-choices.ts`, add the `stealth` field after `description`:

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { cyoaDocuments } from "./cyoa";

export const cyoaChoices = sqliteTable("cyoa_choices", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => cyoaDocuments.id, { onDelete: "cascade" }),
  category: text("category"),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  stealth: integer("stealth", { mode: "boolean" }).notNull().default(false),
  pointCost: integer("point_cost"),
  // ... rest unchanged
});
```

- [x] **Step 2: Add migration to `migrate.ts`**

In `packages/server/src/db/migrate.ts`, find the `CREATE TABLE cyoa_choices` statement and add the `stealth` column. If using a separate migration system, add to the migrations array. For this codebase, add the column to the CREATE TABLE:

```sql
CREATE TABLE IF NOT EXISTS cyoa_choices (
  -- ... existing columns ...
  stealth INTEGER NOT NULL DEFAULT 0,
  -- ... rest unchanged
);
```

If `migrate.ts` uses a different pattern (e.g., `ALTER TABLE`), add a new statement:

```ts
db.exec("ALTER TABLE cyoa_choices ADD COLUMN stealth INTEGER NOT NULL DEFAULT 0");
```

- [x] **Step 3: Update `cyoa-types.ts` to include stealth**

In `packages/server/src/services/cyoa/cyoa-types.ts`, add the `stealth` field:

```ts
export interface CYOAChoice {
  id: string;
  category: string | null;
  name: string;
  description: string;
  pointCost: number | null;
  prerequisites: string[];
  tags: string[];
  sourceImageIds: string[];
  stealth?: boolean;
}
```

- [x] **Step 4: Run typecheck to verify**

Run: `npx tsc --noEmit --project packages/server/tsconfig.json`
Expected: No errors

- [x] **Step 5: Commit**

```bash
git add packages/server/src/db/schema/cyoa-choices.ts packages/server/src/db/migrate.ts packages/server/src/services/cyoa/cyoa-types.ts
git commit -m "feat(cyoa): add stealth field to choices schema"
```

---

## Task 4: Update `POST /cyoa/prompts` Endpoint to Accept Difficulty and Return Adversary

**Files:**
- Modify: `packages/server/src/routes/cyoa.routes.ts`
- Modify: `packages/server/tests/cyoa-narrator-routes.test.ts`

- [x] **Step 1: Update route handler to accept difficulty and return 5 prompts**

In `packages/server/src/routes/cyoa.routes.ts`, replace the `POST /prompts` handler:

```ts
app.post("/prompts", async (req, reply) => {
  const { documentId, buildId, difficulty } = req.body as {
    documentId?: string;
    buildId?: string;
    difficulty?: {
      directorAggression?: number;
      worldEscalation?: number;
      informationLeakage?: number;
      adversaryEnabled?: boolean;
      stealthDisabled?: boolean;
    };
  };

  if (!documentId || !buildId) return reply.status(400).send({ error: "documentId and buildId required" });

  const docs = await app.db.select().from(cyoaDocuments).where(eq(cyoaDocuments.id, documentId));
  const doc = docs[0];
  if (!doc) return reply.status(404).send({ error: "Document not found" });

  const builds = await app.db.select().from(cyoaBuilds).where(eq(cyoaBuilds.id, buildId));
  const build = builds[0];
  if (!build || build.documentId !== documentId) return reply.status(404).send({ error: "Build not found" });

  const choices = await app.db.select().from(cyoaChoices).where(eq(cyoaChoices.documentId, documentId));
  const selectedChoiceIds = (() => {
    try { const p = JSON.parse(build.selectedChoiceIds); return Array.isArray(p) ? p : []; } catch { return []; }
  })();

  let analysis = null;
  try { analysis = JSON.parse(doc.analysis); } catch {}

  const difficultySettings = {
    directorAggression: difficulty?.directorAggression ?? 3,
    worldEscalation: difficulty?.worldEscalation ?? 3,
    informationLeakage: difficulty?.informationLeakage ?? 3,
    adversaryEnabled: difficulty?.adversaryEnabled ?? true,
    stealthDisabled: difficulty?.stealthDisabled ?? false,
  };

  const { buildNarratorPrompts } = await import("../services/cyoa/cyoa-narrator.js");
  const prompts = buildNarratorPrompts(
    { name: build.name, description: build.description, selectedChoiceIds, notes: build.notes },
    { name: doc.name, description: doc.description, pointBudget: doc.pointBudget, choices, analysis },
    difficultySettings,
  );

  let adversary: string | null = null;
  if (difficultySettings.adversaryEnabled) {
    const { buildAdversaryPrompt } = await import("../services/cyoa/cyoa-adversary.js");
    adversary = buildAdversaryPrompt(
      { name: build.name, description: build.description, selectedChoiceIds },
      { name: doc.name, choices },
      difficultySettings,
    );
  }

  return reply.send({ ...prompts, adversary });
});
```

- [x] **Step 2: Update route tests**

In `packages/server/tests/cyoa-narrator-routes.test.ts`, add a new test case for the adversary field:

```ts
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
});
```

Also update the mock DB to include the `stealth` field in the choices table. In `createMockDB`, update the `tableData` function to handle `cyoa_choices` with `stealth` default false.

- [x] **Step 3: Run tests to verify they pass**

Run: `pnpm test --filter @jumpchoice/server cyoa-narrator-routes`
Expected: PASS

- [x] **Step 4: Commit**

```bash
git add packages/server/src/routes/cyoa.routes.ts packages/server/tests/cyoa-narrator-routes.test.ts
git commit -m "feat(cyoa): accept difficulty settings in /prompts endpoint"
```

---

## Task 5: Add CYOA Agent Type Constants to Shared Types

**Files:**
- Modify: `packages/shared/src/types/agent.ts`

- [x] **Step 1: Add CYOA agent IDs**

In `packages/shared/src/types/agent.ts`, add CYOA agent IDs to the `BUILT_IN_AGENT_IDS` object:

```ts
export const BUILT_IN_AGENT_IDS = {
  // ... existing IDs ...
  CYOA_WORLD: "cyoa-world",
  CYOA_DIRECTOR: "cyoa-director",
  CYOA_ADVERSARY: "cyoa-adversary",
} as const;
```

- [x] **Step 2: Run typecheck**

Run: `pnpm check`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add packages/shared/src/types/agent.ts
git commit -m "feat(cyoa): add CYOA agent type constants"
```

---

## Task 6: Update `useCyoaNarratorPrompts` Hook to Accept Difficulty

**Files:**
- Modify: `packages/client/src/hooks/use-cyoa-builds.ts`

- [x] **Step 1: Update hook signature**

In `packages/client/src/hooks/use-cyoa-builds.ts`, update the `useCyoaNarratorPrompts` hook:

```ts
export interface CyoaDifficulty {
  directorAggression: number;      // 1-5
  worldEscalation: number;         // 1-5
  informationLeakage: number;      // 1-5
  adversaryEnabled: boolean;
  stealthDisabled: boolean;
}

export interface CyoaNarratorPrompts {
  narrator: string;
  director: string;
  world: string;
  characters: string;
  adversary: string | null;
}

export function useCyoaNarratorPrompts() {
  return useMutation({
    mutationFn: ({ documentId, buildId, difficulty }: {
      documentId: string;
      buildId: string;
      difficulty?: Partial<CyoaDifficulty>;
    }) =>
      api.post<CyoaNarratorPrompts>("/cyoa/prompts", {
        documentId,
        buildId,
        difficulty,
      }),
  });
}
```

- [x] **Step 2: Run typecheck**

Run: `pnpm check`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add packages/client/src/hooks/use-cyoa-builds.ts
git commit -m "feat(cyoa): extend useCyoaNarratorPrompts hook with difficulty"
```

---

## Task 7: Create CyoaChatSettings Type Definitions

**Files:**
- Create: `packages/client/src/components/cyoa/CyoaChatSettings.ts`

- [x] **Step 1: Create the type definitions file**

Create `packages/client/src/components/cyoa/CyoaChatSettings.ts`:

```ts
export interface CyoaDifficulty {
  directorAggression: number;      // 1-5
  worldEscalation: number;         // 1-5
  informationLeakage: number;      // 1-5
  adversaryEnabled: boolean;
  stealthDisabled: boolean;
}

export interface CyoaCharacter {
  name: string;
  background: string;
  personaId: string | null;
}

export interface CyoaChatSettings {
  isCyoa: true;
  difficulty: CyoaDifficulty;
  character: CyoaCharacter;
  buildId: string;
  documentId: string;
  directorsCutEnabled?: boolean;
}

export const DEFAULT_CYOA_DIFFICULTY: CyoaDifficulty = {
  directorAggression: 3,
  worldEscalation: 4,
  informationLeakage: 3,
  adversaryEnabled: true,
  stealthDisabled: false,
};

export const DIFFICULTY_LABELS = {
  directorAggression: {
    1: "Passive",
    2: "Cautious",
    3: "Active",
    4: "Ruthless",
    5: "Merciless",
  },
  worldEscalation: {
    1: "Glacial",
    2: "Slow",
    3: "Medium",
    4: "Fast",
    5: "Relentless",
  },
  informationLeakage: {
    1: "Open",
    2: "Forthcoming",
    3: "Restricted",
    4: "Paranoid",
    5: "Blackout",
  },
} as const;
```

- [x] **Step 2: Run typecheck**

Run: `pnpm check`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add packages/client/src/components/cyoa/CyoaChatSettings.ts
git commit -m "feat(cyoa): add CyoaChatSettings type definitions"
```

---

## Task 8: Create DifficultySliders Component

**Files:**
- Create: `packages/client/src/components/cyoa/DifficultySliders.tsx`

- [x] **Step 1: Create the component**

Create `packages/client/src/components/cyoa/DifficultySliders.tsx`:

```tsx
import { DIFFICULTY_LABELS, type CyoaDifficulty } from "./CyoaChatSettings";

interface DifficultySlidersProps {
  difficulty: CyoaDifficulty;
  onChange: (difficulty: CyoaDifficulty) => void;
}

const SLIDERS: Array<{
  key: "directorAggression" | "worldEscalation" | "informationLeakage";
  label: string;
  description: string;
}> = [
  {
    key: "directorAggression",
    label: "Director Aggression",
    description: "How ruthlessly the Director controls information and misdirects the player.",
  },
  {
    key: "worldEscalation",
    label: "World Escalation",
    description: "How quickly the opposition reacts to the player's actions and growing power.",
  },
  {
    key: "informationLeakage",
    label: "Information Leakage",
    description: "How much the Narrator learns from the World. Lower = more information, higher = more mystery.",
  },
];

export function DifficultySliders({ difficulty, onChange }: DifficultySlidersProps) {
  const update = (key: "directorAggression" | "worldEscalation" | "informationLeakage", value: number) => {
    const stealthDisabled = key === "informationLeakage" && value === 5;
    onChange({ ...difficulty, [key]: value, stealthDisabled: difficulty.stealthDisabled || stealthDisabled });
  };

  const toggleAdversary = (enabled: boolean) => {
    onChange({ ...difficulty, adversaryEnabled: enabled });
  };

  return (
    <div className="space-y-6">
      {SLIDERS.map((slider) => {
        const value = difficulty[slider.key];
        const labels = DIFFICULTY_LABELS[slider.key];
        return (
          <div key={slider.key}>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--foreground)]">{slider.label}</label>
              <span className="text-xs font-semibold text-[var(--primary)]">
                {labels[value as 1 | 2 | 3 | 4 | 5]} ({value}/5)
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={value}
              onChange={(e) => update(slider.key, Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
            <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">{slider.description}</p>
            {slider.key === "informationLeakage" && value === 5 && (
              <p className="mt-1 text-[10px] text-amber-400">
                ⚠ At Blackout difficulty, stealth abilities are revealed to all agents. The Adversary will know your full build.
              </p>
            )}
          </div>
        );
      })}

      <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={difficulty.adversaryEnabled}
            onChange={(e) => toggleAdversary(e.target.checked)}
            className="accent-[var(--primary)]"
          />
          <div>
            <p className="text-xs font-medium text-[var(--foreground)]">Enable Adversary agent</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              The "devil on the shoulder"  Eactively exploits weaknesses, engineers failures, and adds dramatic complications.
            </p>
          </div>
        </label>
      </div>

      <p className="text-[10px] text-[var(--muted-foreground)]">
        Higher difficulty means the world reacts faster, the Director reveals less, and the Adversary is more ruthless. Stealth choices can be countered by extreme difficulty.
      </p>
    </div>
  );
}
```

- [x] **Step 2: Run typecheck**

Run: `pnpm check`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add packages/client/src/components/cyoa/DifficultySliders.tsx
git commit -m "feat(cyoa): add DifficultySliders component"
```

---

## Task 9: Create CyoaSetupWizard Component

**Files:**
- Create: `packages/client/src/components/cyoa/CyoaSetupWizard.tsx`
- Modify: `packages/client/tests/cyoa-setup-wizard.test.tsx` (create)

- [x] **Step 1: Create the wizard component**

Create `packages/client/src/components/cyoa/CyoaSetupWizard.tsx`:

```tsx
import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, Eye, Globe, MessageCircle, Skull } from "lucide-react";
import type { CyoaBuild } from "@/hooks/use-cyoa-builds";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { useCyoaNarratorPrompts, type CyoaDifficulty } from "@/hooks/use-cyoa-builds";
import { useUpdateAgent } from "@/hooks/use-agents";
import { useUpdateChatMetadata } from "@/hooks/use-chats";
import { DifficultySliders } from "./DifficultySliders";
import { DEFAULT_CYOA_DIFFICULTY, type CyoaChatSettings } from "./CyoaChatSettings";

interface CyoaSetupWizardProps {
  build: CyoaBuild;
  document: CyoaDocument;
  chatId: string;
  agentIds: { world: string; director: string; adversary: string | null };
  onComplete: (settings: CyoaChatSettings) => void;
  onCancel: () => void;
}

const STEPS = ["Build Review", "Difficulty", "Character"] as const;

export function CyoaSetupWizard({ build, document, chatId, agentIds, onComplete, onCancel }: CyoaSetupWizardProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [difficulty, setDifficulty] = useState<CyoaDifficulty>(DEFAULT_CYOA_DIFFICULTY);
  const [characterName, setCharacterName] = useState(build.name);
  const [characterBackground, setCharacterBackground] = useState("");
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = useCyoaNarratorPrompts();
  const updateAgent = useUpdateAgent();
  const updateChatMetadata = useUpdateChatMetadata();

  const handleBegin = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const prompts = await fetchPrompts.mutateAsync({ documentId: document.id, buildId: build.id, difficulty });

      await updateAgent.mutateAsync({ id: agentIds.world, promptTemplate: prompts.world });
      await updateAgent.mutateAsync({ id: agentIds.director, promptTemplate: prompts.director });
      if (agentIds.adversary && prompts.adversary) {
        await updateAgent.mutateAsync({ id: agentIds.adversary, promptTemplate: prompts.adversary });
      }

      const settings: CyoaChatSettings = {
        isCyoa: true,
        difficulty,
        character: { name: characterName, background: characterBackground, personaId },
        buildId: build.id,
        documentId: document.id,
      };

      await updateChatMetadata.mutateAsync({ id: chatId, cyoaSettings: settings });

      onComplete(settings);
    } catch (err) {
      setError(`Failed to begin campaign: ${(err as Error)?.message ?? "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Campaign Setup</h2>
          <button onClick={onCancel} disabled={submitting} className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium ${i === step ? "bg-[var(--primary)] text-white" : i < step ? "bg-emerald-600 text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                {i + 1}
              </div>
              <span className={`text-xs ${i === step ? "font-medium text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="h-px w-8 bg-[var(--border)]" />}
            </div>
          ))}
        </div>

        <div className="mt-6 min-h-[300px]">
          {step === 0 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)]">Campaign Name</label>
                <input
                  type="text"
                  value={build.name}
                  onChange={() => {}}
                  disabled
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="text-xs font-medium text-[var(--foreground)]">{document.name}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {build.selectedChoiceIds.length} choices selected
                </p>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="text-[10px] font-medium text-[var(--muted-foreground)]">Campaign Agents</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[var(--foreground)]">
                    <Globe className="h-3 w-3 text-[var(--primary)]" /> World Simulator
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--foreground)]">
                    <Eye className="h-3 w-3 text-[var(--primary)]" /> Director
                  </div>
                  {difficulty.adversaryEnabled && (
                    <div className="flex items-center gap-2 text-xs text-[var(--foreground)]">
                      <Skull className="h-3 w-3 text-[var(--primary)]" /> Adversary
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <MessageCircle className="h-3 w-3" /> Character Voices (built into Narrator prompt)
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && <DifficultySliders difficulty={difficulty} onChange={setDifficulty} />}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)]">Character Name</label>
                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)]">Background (optional)</label>
                <textarea
                  value={characterBackground}
                  onChange={(e) => setCharacterBackground(e.target.value)}
                  rows={4}
                  placeholder="Who are you before the campaign starts? Any relevant history, motivations, or connections?"
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)]">Persona (optional)</label>
                <select
                  value={personaId ?? ""}
                  onChange={(e) => setPersonaId(e.target.value || null)}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]"
                >
                  <option value="">None</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-6 flex justify-between">
          <button
            onClick={step === 0 ? onCancel : () => setStep((step - 1) as 0 | 1)}
            disabled={submitting}
            className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--foreground)]"
          >
            <ChevronLeft className="h-3 w-3" />
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < 2 ? (
            <button
              onClick={() => setStep((step + 1) as 1 | 2)}
              className="flex items-center gap-1 rounded-md bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-white"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          ) : (
            <button
              onClick={handleBegin}
              disabled={submitting}
              className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
              Begin Campaign
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Run typecheck**

Run: `pnpm check`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add packages/client/src/components/cyoa/CyoaSetupWizard.tsx
git commit -m "feat(cyoa): add CyoaSetupWizard component"
```

---

## Task 10: Update StartCampaignModal to Launch CyoaSetupWizard

**Files:**
- Modify: `packages/client/src/components/cyoa/StartCampaignModal.tsx`
- Modify: `packages/client/src/components/cyoa/BuildPlannerModal.tsx`

- [x] **Step 1: Update StartCampaignModal to only create 3 agents and launch wizard**

Replace the entire `StartCampaignModal.tsx`:

```tsx
import { useState } from "react";
import type { CyoaBuild } from "@/hooks/use-cyoa-builds";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { useCyoaNarratorPrompts, type CyoaDifficulty } from "@/hooks/use-cyoa-builds";
import { useConnections } from "@/hooks/use-connections";
import { useCreateAgent } from "@/hooks/use-agents";
import { useCreateChat, useUpdateChatMetadata } from "@/hooks/use-chats";
import { useChatStore } from "@/stores/chat.store";
import { X, Loader2, Eye, Globe, Skull } from "lucide-react";
import { CyoaSetupWizard } from "./CyoaSetupWizard";
import { DEFAULT_CYOA_DIFFICULTY } from "./CyoaChatSettings";

interface StartCampaignModalProps {
  build: CyoaBuild;
  document: CyoaDocument;
  onClose: () => void;
}

interface CreatedAgents {
  world: string;
  director: string;
  adversary: string | null;
  chatId: string;
}

const AGENT_CONFIGS = [
  { type: "cyoa-world", name: "World Simulator", desc: "Tracks off-screen events and escalates opposition", phase: "pre_generation" as const, icon: Globe, key: "world" as const },
  { type: "cyoa-director", name: "Director", desc: "Controls what information reaches the Narrator", phase: "pre_generation" as const, icon: Eye, key: "director" as const },
  { type: "cyoa-adversary", name: "Adversary", desc: "The devil on the shoulder (can be disabled in setup)", phase: "pre_generation" as const, icon: Skull, key: "adversary" as const },
];

export function StartCampaignModal({ build, document, onClose }: StartCampaignModalProps) {
  const [connectionId, setConnectionId] = useState("");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAgents, setCreatedAgents] = useState<CreatedAgents | null>(null);

  const { data: connections } = useConnections();
  const typedConnections = (connections ?? []) as { id: string; name: string; provider: string }[];
  const createAgent = useCreateAgent();
  const createChat = useCreateChat();
  const fetchPrompts = useCyoaNarratorPrompts();
  const setActiveChatId = useChatStore((s) => s.setActiveChatId);

  const handleLaunch = async () => {
    if (!connectionId) return;
    setLaunching(true);
    setError(null);

    try {
      const prompts = await fetchPrompts.mutateAsync({ documentId: document.id, buildId: build.id, difficulty: DEFAULT_CYOA_DIFFICULTY });

      const agentIds: Record<string, string | null> = {};
      for (const config of AGENT_CONFIGS) {
        const promptKey = config.key === "world" ? "world" : config.key === "director" ? "director" : "adversary";
        const prompt = prompts[promptKey as keyof typeof prompts] as string | null;
        const agent = await createAgent.mutateAsync({
          type: config.type,
          name: `${config.name}  E${build.name}`,
          description: `CYOA ${config.name} for ${document.name}`,
          phase: config.phase,
          enabled: true,
          connectionId,
          promptTemplate: prompt ?? `CYOA ${config.name}. Build: ${build.name}.`,
          settings: {},
        }) as { id: string };
        agentIds[config.key] = agent.id;
      }

      const chat = await createChat.mutateAsync({
        name: `${document.name}  E${build.name}`,
        mode: "game",
        connectionId,
      });

      const initialAgentIds = [agentIds.world, agentIds.director, agentIds.adversary].filter((id): id is string => !!id);
      const updateMetadata = useUpdateChatMetadata();
      await updateMetadata.mutateAsync({
        id: chat.id,
        enableAgents: true,
        activeAgentIds: initialAgentIds,
      });

      setCreatedAgents({ world: agentIds.world!, director: agentIds.director!, adversary: agentIds.adversary, chatId: chat.id });
    } catch (err) {
      setError(`Failed to launch campaign: ${(err as Error)?.message ?? "Unknown error"}`);
    } finally {
      setLaunching(false);
    }
  };

  const handleWizardComplete = () => {
    if (createdAgents) {
      setActiveChatId(createdAgents.chatId);
    }
    onClose();
  };

  if (createdAgents) {
    return (
      <CyoaSetupWizard
        build={build}
        document={document}
        chatId={createdAgents.chatId}
        agentIds={createdAgents}
        onComplete={handleWizardComplete}
        onCancel={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Start Campaign</h2>
          <button onClick={onClose} className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
          <p className="text-xs font-medium text-[var(--foreground)]">{build.name}</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            {build.selectedChoiceIds.length} choices from {document.name}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">LLM Connection</label>
          <select
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]"
            disabled={launching}
          >
            <option value="">Choose a connection...</option>
            {typedConnections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name} ({conn.provider})
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">Campaign Agents</label>
          <div className="space-y-1.5">
            {AGENT_CONFIGS.map((config) => (
              <div key={config.type} className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                <config.icon className="h-3.5 w-3.5 text-[var(--primary)]" />
                <div>
                  <p className="text-xs font-medium text-[var(--foreground)]">{config.name}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">{config.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            Character Voices and Narrator are built into the main generation prompt. You'll configure difficulty in the next step.
          </p>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--foreground)]"
            disabled={launching}
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={!connectionId || launching}
            className="flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {launching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Launch Campaign
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Run typecheck**

Run: `pnpm check`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add packages/client/src/components/cyoa/StartCampaignModal.tsx
git commit -m "feat(cyoa): launch CyoaSetupWizard from StartCampaignModal"
```

---

## Task 11: Create DirectorsCutPanel Component

**Files:**
- Create: `packages/client/src/components/game/DirectorsCutPanel.tsx`

- [x] **Step 1: Create the panel component**

Create `packages/client/src/components/game/DirectorsCutPanel.tsx`:

```tsx
import { useState, useEffect, useRef } from "react";
import { X, Globe, Eye, Skull, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";

interface DirectorsCutPanelProps {
  chatId: string;
  onClose: () => void;
}

interface AgentOutput {
  id: string;
  agentType: string;
  text: string;
  createdAt: string;
}

export function DirectorsCutPanel({ chatId, onClose }: DirectorsCutPanelProps) {
  const [outputs, setOutputs] = useState<AgentOutput[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<{ outputs: AgentOutput[] }>(`/api/chats/${chatId}/agent-outputs`);
        if (!cancelled) {
          setOutputs(data.outputs);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [chatId]);

  const grouped = {
    "cyoa-world": outputs.filter((o) => o.agentType === "cyoa-world"),
    "cyoa-director": outputs.filter((o) => o.agentType === "cyoa-director"),
    "cyoa-adversary": outputs.filter((o) => o.agentType === "cyoa-adversary"),
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 border-l border-[var(--border)] bg-[var(--background)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Director's Cut</h2>
        <button onClick={onClose} className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 60px)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : outputs.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)]">No agent outputs yet. Start playing to see what's happening behind the scenes.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([type, items]) => {
              if (items.length === 0) return null;
              const config = {
                "cyoa-world": { icon: Globe, label: "World Simulator", color: "text-blue-400" },
                "cyoa-director": { icon: Eye, label: "Director", color: "text-purple-400" },
                "cyoa-adversary": { icon: Skull, label: "Adversary", color: "text-red-400" },
              }[type]!;

              return (
                <div key={type}>
                  <div className="mb-2 flex items-center gap-2">
                    <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
                    <h3 className="text-xs font-medium text-[var(--foreground)]">{config.label}</h3>
                  </div>
                  <div className="space-y-2">
                    {items.map((output) => (
                      <div key={output.id} className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          {new Date(output.createdAt).toLocaleTimeString()}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--foreground)]">{output.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 2: Run typecheck**

Run: `pnpm check`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add packages/client/src/components/game/DirectorsCutPanel.tsx
git commit -m "feat(cyoa): add DirectorsCutPanel component"
```

---

## Task 12: Add Server Endpoint to Fetch Agent Outputs for Chat

**Files:**
- Modify: `packages/server/src/routes/agents.routes.ts` (or create new endpoint)

- [x] **Step 1: Find or create the appropriate routes file**

Check `packages/server/src/routes/` for the agents routes file. If `agents.routes.ts` exists, add the endpoint there. Otherwise, create it.

Add the endpoint:

```ts
app.get<{ Params: { chatId: string } }>("/chats/:chatId/agent-outputs", async (req, reply) => {
  const { chatId } = req.params;
  
  const messages = await app.db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.chatId, chatId))
    .orderBy(messagesTable.createdAt);
  
  const cyoaOutputs = messages
    .filter((m: any) => m.extra?.agentType?.startsWith("cyoa-") && m.extra?.agentOutput)
    .map((m: any) => ({
      id: m.id,
      agentType: m.extra.agentType,
      text: m.extra.agentOutput,
      createdAt: m.createdAt,
    }));
  
  return { outputs: cyoaOutputs };
});
```

Adjust the table names and imports based on the actual schema (check `packages/server/src/db/schema/messages.ts`).

- [x] **Step 2: Run typecheck**

Run: `pnpm check`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add packages/server/src/routes/agents.routes.ts
git commit -m "feat(cyoa): add endpoint to fetch agent outputs for chat"
```

---

## Task 13: Add CampaignHistoryTab to GameJournal

**Files:**
- Modify: `packages/client/src/components/game/GameJournal.tsx`

- [x] **Step 1: Add the Campaign History tab**

In `GameJournal.tsx`, add a new tab "Campaign History" that displays retrospective agent outputs. Find the tab structure and add:

```tsx
const [activeTab, setActiveTab] = useState<"journal" | "quests" | "codex" | "campaign">("journal");

// In the tab bar, add:
<button
  onClick={() => setActiveTab("campaign")}
  className={cn("...", activeTab === "campaign" && "bg-[var(--primary)] text-white")}
>
  Campaign History
</button>

// In the content area, add:
{activeTab === "campaign" && <CampaignHistoryTab chatId={chatId} />}
```

Create a new component `CampaignHistoryTab`:

```tsx
function CampaignHistoryTab({ chatId }: { chatId: string }) {
  const [outputs, setOutputs] = useState<AgentOutput[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<{ outputs: AgentOutput[] }>(`/api/chats/${chatId}/agent-outputs`);
        if (!cancelled) {
          setOutputs(data.outputs);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [chatId]);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;

  if (outputs.length === 0) {
    return <p className="text-xs text-[var(--muted-foreground)]">No campaign history yet.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-[var(--muted-foreground)]">
        Retrospective view: here's what the World, Director, and Adversary were doing during your campaign.
      </p>
      {outputs.map((output) => (
        <div key={output.id} className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[10px] font-medium text-[var(--primary)]">{output.agentType}</span>
            <span className="text-[10px] text-[var(--muted-foreground)]">
              {new Date(output.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-xs text-[var(--foreground)]">{output.text}</p>
        </div>
      ))}
    </div>
  );
}
```

- [x] **Step 2: Run typecheck**

Run: `pnpm check`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add packages/client/src/components/game/GameJournal.tsx
git commit -m "feat(cyoa): add Campaign History tab to GameJournal"
```

---

## Task 14: Add Director's Cut Toggle Button to GameSurface

**Files:**
- Modify: `packages/client/src/components/game/GameSurface.tsx`

- [x] **Step 1: Add state and button**

In `GameSurface.tsx`, add:

```tsx
import { Scissors } from "lucide-react";
import { DirectorsCutPanel } from "./DirectorsCutPanel";

// Inside the component:
const [directorsCutOpen, setDirectorsCutOpen] = useState(false);
const chatId = ... // extract from props
const isCyoa = ... // check chat.metadata.cyoaSettings

// In the top-right chrome (find TopRightControls or similar), add:
{isCyoa && (
  <button
    onClick={() => setDirectorsCutOpen(!directorsCutOpen)}
    className="rounded-full p-2 hover:bg-[var(--accent)]"
    title="Director's Cut"
  >
    <Scissors className="h-4 w-4" />
  </button>
)}

// At the end of the component render:
{directorsCutOpen && isCyoa && (
  <DirectorsCutPanel chatId={chatId} onClose={() => setDirectorsCutOpen(false)} />
)}
```

- [x] **Step 2: Run typecheck**

Run: `pnpm check`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add packages/client/src/components/game/GameSurface.tsx
git commit -m "feat(cyoa): add Director's Cut toggle to GameSurface"
```

---

## Task 15: Run Full Test Suite and Validation

**Files:** (no changes)

- [x] **Step 1: Run all tests**

Run: `pnpm test`
Expected: All tests pass (242+ existing + new tests)

- [x] **Step 2: Run full validation**

Run: `pnpm check`
Expected: No errors

- [x] **Step 3: Manual smoke test checklist**

- [x] Build a CYOA document through the pipeline
- [x] Create a build with selected choices
- [x] Click "Start Campaign" ↁEconnection picker
- [x] Click "Launch Campaign" ↁE3 agents created, chat created
- [x] CyoaSetupWizard appears (3 steps)
- [x] Step 1: Build review shows choices
- [x] Step 2: Difficulty sliders work, Adversary toggle works
- [x] Step 3: Character setup works
- [x] Click "Begin Campaign" ↁEagent prompts updated, metadata patched
- [x] Land in GameSurface
- [x] Director's Cut button appears in top-right chrome
- [x] Click Director's Cut ↁEpanel opens
- [x] GameJournal shows Campaign History tab
- [x] Play through a few turns, verify agents run

- [x] **Step 4: Commit final changes**

```bash
git add .
git commit -m "feat(cyoa): complete game UX integration with setup wizard and Director's Cut"
```

---

## Future Work (Out of Scope)

The following are designed but not implemented in this plan:

- **Prestige system**  Eperks earned across campaigns
- **Stealth perk upgrades**  Eenhanced blindspot mechanics
- **Difficulty presets**  E"Easy Campaign", "Nightmare Mode" one-click options
- **Adversary personality customization**  Elet players pick Adversary archetypes
- **Campaign analytics**  Etrack win rate, death rate, encounter difficulty
- **Multiplayer campaigns**  Emultiple players sharing the same Adversary
