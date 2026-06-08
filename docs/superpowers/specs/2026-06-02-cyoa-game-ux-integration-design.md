# CYOA Game UX Integration Design

**Date:** 2026-06-02
**Status:** Draft
**Depends on:** CYOA AI Narrator (implemented), CYOA Build Planner (implemented), CYOA Pipeline Management UI (implemented)

## Overview

Integrate the CYOA narrator system into JumpChoice's existing game-mode UX. Players launch campaigns from the Build Planner, configure difficulty and character settings through a CYOA Setup Wizard, and play through the existing GameSurface with CYOA agents working invisibly behind the scenes.

## Design Decisions

- **Reuse GameSurface** — no new game surface. The existing RPG experience (sprites, HUD, choice cards, journal) serves CYOA campaigns.
- **Narrator = main generation, not an agent** — the main LLM call IS the Narrator. The CYOA-aware system prompt (from `buildNarratorPrompts()`) replaces the default GM prompt built by `game-prompt-builder.ts`. No separate Narrator agent.
- **3-4 pre-gen agents** — `cyoa-world`, `cyoa-director`, and optional `cyoa-adversary` run as `pre_generation` agents via the existing `pre-gen-runner.ts` pipeline. Their outputs inject into the main prompt as an Intelligence Brief. No pipeline changes needed.
- **Character Voices = prompt injection** — the Narrator prompt includes instructions to speak in NPC voices when the player addresses NPCs. No separate agent needed for this.
- **`cyoa-` prefix avoids naming collision** — the existing pipeline already has a `director` agent (Narrative Director) and `secret-plot-driver` agent. CYOA agents use `cyoa-director`, `cyoa-world`, `cyoa-adversary` to avoid collision.
- **Pre-gen output is invisible by default** — no `hiddenFromUser` flag needed. Pre-gen agent output is injected into the prompt, not displayed. Only the main generation (Narrator) is visible.
- **GameChoiceCards** — the Narrator emits `[choices: A|B|C]` tags, rendered by the existing GameChoiceCards widget.
- **Adversary is optional** — the 4th pre-gen agent combines hostile escalation (Adversary) with dramatic complication (Trickster). Toggleable at setup.

## Agent Architecture

### How CYOA Agents Fit the Existing Pipeline

The game-mode generation pipeline already has 3 phases:

```
pre_generation (existing agents):          CYOA additions:
  secret-plot-driver ──┐                    cyoa-world ──────────┐
  director (narrative)─┤ inject             cyoa-director ───────┤ inject
  knowledge-retrieval ─┤ into prompt        cyoa-adversary ──────┘ into prompt
  ...                   ┘                                         
                                                           
main generation (= Narrator):                              
  game-prompt-builder.ts builds GM prompt  →  CYOA: uses buildNarratorPrompts() instead
  streams to GameSurface                  →  same, with [choices] tags
                                                           
post_processing (existing agents):          
  world-state, expression, combat, etc.    →  unchanged
```

No changes to `pre-gen-runner.ts`, `agent-pipeline.ts`, or the post-processing pipeline.

### Pre-Gen Agents (3-4, all hidden)

| Agent Type | Phase | Existing Collision | Role |
|---|---|---|---|
| `cyoa-world` | `pre_generation` | None (new) | Tracks off-screen NPCs, factions, events. Escalates opposition. Produces intelligence brief for Director. |
| `cyoa-director` | `pre_generation` | Avoids existing `director` | Receives intelligence from World + Adversary. Filters it based on difficulty settings. Produces Intelligence Brief for the Narrator prompt. |
| `cyoa-adversary` | `pre_generation` (optional) | None (new) | "Devil on the shoulder." Exploits weaknesses, engineers failures, adds dramatic complications. Director listens to this agent. |
| `cyoa-voices` | **Not an agent** — prompt injection | — | Character voice instructions embedded in the Narrator's system prompt. The LLM speaks in NPC voices when the player addresses them, using the existing speaker-tag system. |

### Per-Turn Flow

1. Player sends message
2. `pre-gen-runner.ts` runs all pre-gen agents (existing + CYOA) in parallel:
   - `cyoa-world` produces off-screen intelligence
   - `cyoa-adversary` (if enabled) produces hostile analysis and counter-strategies
   - `cyoa-director` filters intelligence based on difficulty, produces Narrator-ready Intelligence Brief
3. Pre-gen outputs injected into the main prompt via `formatAgentInjections()` + `injectAtDepth()` (existing mechanism)
4. Main generation runs with CYOA-aware system prompt + Intelligence Brief → streams narration to GameSurface
5. Narration includes `[choices]` tags rendered by GameChoiceCards, and NPC dialogue rendered through speaker tags
6. Pre-gen outputs stored in message extras for Journal retrospective

### Stealth/Blindspot Mechanic

CYOA choices can be tagged with `stealth: true` in the build data. These choices are **omitted from the Adversary agent's prompt**. The Adversary doesn't know the player has those abilities.

When the player uses a stealth ability, the Adversary's next intelligence brief reflects surprise: "The target demonstrated an unknown capability." The system doesn't mechanically track "stealth broken" — it emerges naturally from the narrative.

At extreme difficulty settings (Information Leakage = 5, "Blackout"), stealth can be disabled entirely. The Adversary's prompt then includes all choices regardless of stealth tags.

## CYOA Setup Wizard

After clicking "Launch Campaign" in StartCampaignModal, a CYOA Setup Wizard appears before entering GameSurface. Three steps:

### Step 1: Build Review

- Build name, description, selected choices grouped by category
- Active synergies and point budget usage displayed
- Stealth choices highlighted with an eye-off icon
- Player can edit campaign name and write character notes
- "Back" returns to StartCampaignModal, "Next" proceeds to Step 2

### Step 2: Difficulty & Agents

Three sliders, each 5 positions:

| Setting | 1 | 2 | 3 | 4 | 5 | Default |
|---|---|---|---|---|---|---|
| Director Aggression | Passive | Cautious | Active | Ruthless | Merciless | 3 (Active) |
| World Escalation | Glacial | Slow | Medium | Fast | Relentless | 4 (Fast) |
| Information Leakage | Open | Forthcoming | Restricted | Paranoid | Blackout | 3 (Restricted) |

Plus a toggle: "Enable Adversary agent" (on by default).

Below the sliders, a brief explanation: "Higher difficulty means the world reacts faster, the Director reveals less, and the Adversary is more ruthless. Stealth choices can be countered by extreme difficulty."

**Extreme difficulty override:** When Information Leakage = 5 (Blackout), a warning appears: "At this difficulty, stealth abilities are revealed to all agents. The Adversary will know your full build."

### Step 3: Character Setup

- Character name (defaults to build name)
- Character background (textarea — "Who are you before the campaign starts?")
- Optional persona link (dropdown of existing personas)
- "Begin Campaign" button

### Data Storage

Settings are stored in `chat.metadata.cyoaSettings`:

```ts
interface CyoaChatSettings {
  isCyoa: true;
  difficulty: {
    directorAggression: number;      // 1-5
    worldEscalation: number;         // 1-5
    informationLeakage: number;      // 1-5
    adversaryEnabled: boolean;
    stealthDisabled: boolean;        // true at extreme difficulty
  };
  character: {
    name: string;
    background: string;
    personaId: string | null;
  };
  buildId: string;
  documentId: string;
}
```

## Director's Cut & Journal Integration

### Default: All Hidden

Pre-gen agent outputs are invisible by design — they inject into the prompt via `formatAgentInjections()`, they don't produce visible messages. The player sees only the main generation (Narrator output). This provides real challenge — the player doesn't know what's coming.

### Director's Cut Panel (Real-Time, Opt-In)

- New button in GameSurface top-right chrome (Scissors icon, labeled "Director's Cut")
- Toggle on → opens a side panel showing real-time pre-gen agent outputs as they stream
- Each agent's output displayed in a labeled section:
  - World Simulator section with globe icon
  - Director section with eye icon
  - Adversary section with devil icon (if enabled)
- Toggle persists in `chat.metadata.directorsCutEnabled`
- Use cases: debugging, less serious play, learning the narrative machinery

### Journal Campaign History (Retrospective)

- Existing GameJournal panel gets a new tab: "Campaign History"
- After each session, pre-gen agent outputs from that session are revealed in chronological order
- Player reads what was happening behind the scenes — "Here's what the World was planning while you explored the dungeon"
- Purely retrospective — no real-time spoilers
- Drives replayability: "I can't believe the Director was setting that up the whole time"

### Thought Bubbles (Vague Hints)

- Even with Director's Cut off, existing `AgentThoughtBubbles` system shows one-line summaries in the sparkles menu
- "Director: building tension" / "World: enemies adapting" / "Adversary: exploiting weakness"
- Vague enough to not spoil specifics but gives the player a sense of activity

## Prompt System & Difficulty Integration

### Difficulty Modifiers

The existing `buildNarratorPrompts()` function is extended to accept a `DifficultySettings` parameter. Each modifier replaces the corresponding neutral language in the base prompt:

**Director Aggression modifiers:**
- 1 (Passive): "Reveal information freely. The player should understand what's happening."
- 3 (Active): "Control information flow. Foreshadow danger, misdirect when it serves the story."
- 5 (Merciless): "Actively deceive. Withhold critical info. Reveal only what maximizes dramatic irony."

**World Escalation modifiers:**
- 1 (Glacial): "React slowly. The opposition is distant and disorganized."
- 3 (Medium): "React within a few turns. Enemies adapt over time."
- 5 (Relentless): "React immediately. Every action has consequences by the next scene."

**Information Leakage modifiers (applied to Director's filtering rules):**
- 1 (Open): "Pass full intelligence to the Narrator. No filters."
- 3 (Restricted): "Filter intelligence through narrative context. The Narrator knows only what they need."
- 5 (Blackout): "Pass almost nothing. The Narrator must narrate uncertainty and confusion."

### Adversary Prompt (with Stealth Filtering)

The Adversary agent receives a filtered choice list. Choices with `stealth: true` are omitted and a count is shown:

```
### Known Abilities
- Fireball (15 pts, Tier S)
- Sword Mastery (8 pts, Tier B)

[2 abilities hidden from you — the player may surprise you]
```

When `stealthDisabled` is true (extreme difficulty), all choices are shown regardless of stealth tags.

### Runtime Intelligence Assembly

At runtime, pre-gen agents produce structured outputs (as hidden messages with `extra.agentType`):

```json
{
  "agentType": "world-simulator",
  "brief": "The Crimson Guard has dispatched three scouts to the player's location. They'll arrive in approximately 6 hours. The Guard has adapted to fire magic by equipping flame-retardant cloaks."
}
```

The Narrator's system prompt includes an `## Intelligence Brief` section populated with filtered output from the Director:

```
## Intelligence Brief (from Director)
You notice fresh tracks leading away from the camp. They're heading north, toward the ridge. The wind carries a faint smell of smoke.
```

The Director filtered out the scout detail, leaving only environmental hints — demonstrating the information leakage setting in action.

## Campaign Launch Flow

```
Build Planner (existing)
  └─ Player creates build, selects choices
  └─ Clicks "Start Campaign"
      │
      ▼
StartCampaignModal (existing)
  └─ Select LLM connection
  └─ Click "Launch Campaign"
      │
      ▼  fetch prompts via POST /cyoa/prompts
      │  create 3-4 pre-gen agents (cyoa-world, cyoa-director, cyoa-adversary)
      │  create chat with mode: "game"
      │  attach agents via activeAgentIds + enableAgents
      │
      ▼
CYOA Setup Wizard (NEW)
  ├─ Step 1: Build Review
  ├─ Step 2: Difficulty Settings
  └─ Step 3: Character Setup
      │
      ▼  apply difficulty modifiers to agent prompts
      │  update chat.metadata with cyoaSettings
      │  navigate to GameSurface
      │
      ▼
GameSurface (existing)
  ├─ game-prompt-builder.ts detects CYOA campaign
  │    └─ uses buildNarratorPrompts() as system prompt (not default GM prompt)
  ├─ pre-gen-runner.ts runs existing + CYOA agents in parallel
  │    └─ CYOA agents inject Intelligence Brief into main prompt
  ├─ Main generation (= Narrator) streams narration
  │    └─ Includes [choices] tags + NPC speaker tags
  ├─ GameChoiceCards present decision points
  ├─ Director's Cut toggle (new button, reads message extras)
  ├─ Journal Campaign History tab (new, reads message extras)
  └─ Thought bubbles (existing system, automatic)
```

**Key:** The CYOA Setup Wizard runs BEFORE the existing GameSetupWizard. The CYOA wizard sets up campaign-specific metadata (difficulty, character, agents). When the player enters GameSurface, the existing setup wizard handles world-building (scene setting, genre, tone) using the CYOA build data as context.

## Implementation Scope

### New Components

1. **CyoaSetupWizard** — 3-step modal component (Build Review → Difficulty → Character)
2. **DifficultySliders** — reusable slider component for the 3 difficulty axes
3. **DirectorsCutPanel** — GameSurface sidebar showing pre-gen agent output from message extras
4. **CampaignHistoryTab** — new Journal tab showing retrospective agent outputs

### Modified Components

5. **StartCampaignModal** — after agent creation, launch CyoaSetupWizard instead of navigating directly to chat
6. **GameSurface** — add Director's Cut button to top-right chrome
7. **GameJournal** — add Campaign History tab
8. **game-prompt-builder.ts** — detect CYOA campaigns (`chat.metadata.cyoaSettings.isCyoa`) and use `buildNarratorPrompts()` output as the system prompt instead of the default GM prompt

### Extended Server Modules

9. **cyoa-narrator.ts** — extend `buildNarratorPrompts()` to accept difficulty settings and produce Adversary prompt with stealth filtering; character voice instructions embedded in narrator prompt
10. **POST /cyoa/prompts** endpoint — accept difficulty settings and optional adversary flag
11. **Agent prompt patching** — update agent configs with difficulty-modified prompts after setup wizard
12. **`BUILT_IN_AGENT_IDS`** — add `cyoa-director`, `cyoa-world`, `cyoa-adversary` to the built-in agent registry (or create them dynamically from CYOA build data)

### New Data

12. **CyoaChoice schema** — add `stealth` boolean field to choices
13. **chat.metadata.cyoaSettings** — store difficulty + character + build refs
14. **chat.metadata.directorsCutEnabled** — toggle for real-time visibility

## Prestige & Perk System (Future Scope)

The design includes hooks for a prestige system where players earn perks across campaigns:

- **Game system improvements** — persist across campaigns as rewards for prestige
- **Perk examples:** "Director's Favor" (easier info leaks), "Plot Armor" (one-shot survival), "Adversary's Respect" (fairer challenges)
- **Stealth perks** — enhance the blindspot mechanic, allow more choices to be hidden
- **Earned through prestige**, not normal play

This is out of scope for the initial implementation but the difficulty/stealth infrastructure supports it.
