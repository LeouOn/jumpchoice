import { logger } from "../../lib/logger.js";

interface CyoaChoice {
  id: string;
  name: string;
  description: string;
  category: string | null;
  pointCost: number | null;
  tier: string | null;
}

interface BuildData {
  name: string;
  description?: string;
  selectedChoiceIds: string[];
  notes?: string;
}

interface DocumentData {
  name: string;
  description?: string;
  pointBudget?: number | null;
  choices: CyoaChoice[];
  analysis?: unknown;
}

interface NarratorPrompts {
  narrator: string;
  director: string;
  world: string;
  characters: string;
}

interface SynergyPair {
  choiceIds: string[];
  description: string;
  combinedValue: "high" | "medium" | "low";
}

export interface CyoaDifficulty {
  directorAggression: number;
  worldEscalation: number;
  informationLeakage: number;
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

function buildChoiceList(choices: CyoaChoice[], selectedIds: string[]): string {
  return choices
    .filter((c) => selectedIds.includes(c.id))
    .map((c) => `- ${c.name} (${c.pointCost ?? 0} pts, Tier ${c.tier ?? "?"}, ${c.category ?? "uncategorized"})${c.description ? `: ${c.description}` : ""}`)
    .join("\n");
}

function buildSynergyText(choices: CyoaChoice[], selectedIds: string[], analysis: unknown): string {
  const raw = analysis as { topSynergies?: SynergyPair[] } | null;
  const synergies = raw?.topSynergies ?? [];
  const active = synergies.filter((s) => s.choiceIds.every((id) => selectedIds.includes(id)));
  if (!active.length) return "No active synergies detected.";
  return active.map((s) => `- ${s.choiceIds.map((id) => choices.find((c) => c.id === id)?.name ?? id).join(" + ")}: ${s.description} (Value: ${s.combinedValue})`).join("\n");
}

function deriveTone(choices: CyoaChoice[]): string {
  const categories = new Set(choices.map((c) => c.category?.toLowerCase() ?? ""));
  if (categories.has("magic") || categories.has("spells")) return "epic fantasy — wondrous, mysterious, with a sense of ancient power";
  if (categories.has("technology") || categories.has("sci-fi")) return "analytical sci-fi — precise, technological, with wonder at what's possible";
  if (categories.has("combat") || categories.has("martial")) return "action-oriented — visceral, tense, with brutal combat encounters";
  if (categories.has("stealth") || categories.has("espionage")) return "noir thriller — tense, atmospheric, with deception and hidden motives";
  return "adventure — exciting, varied, with moments of tension and wonder";
}

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
- Report what the player perceives — what they see, hear, feel, smell
- You will receive scene descriptions from the Director — narrate them to the player with dramatic flair
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
- You are the editor — the Narrator only narrates what you allow
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
- It is GOOD for the player to be surprised — that is the point

## Themes: ${categories.join(", ")}`;

  const world = `You are the World Simulator for a CYOA/Jumpchain campaign. You operate BEHIND THE SCENES — the player never sees your output.

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
- NEVER make it impossible — always leave a path forward, even if it's difficult
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
- Enemies: distinctive personalities — arrogant, cunning, desperate, or fanatical
- Common folk: grounded, practical, fearful of the unknown

## Guidelines
- Stay in character at all times
- React to the player's known abilities realistically — an NPC who hears about the player's feats should react
- Have your own motivations — you are not a quest dispenser
- Lie, mislead, or withhold information if it fits the character
- The Director may provide you with hidden agendas or secrets to withhold or reveal
- Speak naturally — use verbal tics, dialect, or speech patterns that fit the character

## Tone
${tone}`;

  return { narrator, director, world, characters };
}
