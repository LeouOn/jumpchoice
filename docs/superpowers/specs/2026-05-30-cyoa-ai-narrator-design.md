# CYOA AI Narrator — Design Spec

Date: 2026-05-30
Status: Approved
Scope: Spec 3 of 3 (AI Narrator). Specs 1 (Pipeline Management) and 2 (Build Planner) are complete.

## Problem

After building a character with the Build Planner, users have a build with tier info, synergies, and point costs but no way to actually play through their CYOA in an interactive narrative. They need a Game Master that understands their build and creates a dynamic, reactive story.

## Solution

A chat-based campaign mode launched from the Build Planner. It creates a new chat conversation with 4 specialized agents: a Narrator (visible story teller), a hidden Director (information gatekeeper), a hidden World Simulator (adversarial background engine), and Character Voices (NPC dialogue). The Director controls what the Narrator knows — preventing accidental spoiler leaks. The World agent actively works against the player as they grow more powerful, but the player never sees the World's or Director's outputs directly — only the consequences narrated by the Narrator.

## Architecture

### Launch Flow

1. User has an analyzed CYOA document with a saved build in the Build Planner
2. User clicks "Start Campaign" button in the Build Planner
3. A small modal asks which LLM connection to use
4. System creates:
   - 4 agent records (Narrator, Director, World, Characters) with CYOA-aware system prompts
   - A new chat conversation with those agents attached
5. User is navigated to the new chat
6. The GM agent sends an opening scene based on the build

### 4-Agent System

**Narrator (visible, primary)**
- The only agent whose output the player sees directly
- Pure narration: describes scenes, presents narrative choices, reports consequences
- Does NOT have access to World intelligence — only knows what the Director chooses to pass along
- This separation prevents the Narrator from accidentally revealing the opposition's hidden plans
- System prompt includes: build summary (choices, costs, tiers, synergies, archetype), narrative voice instructions, CYOA themes/categories, scene-framing rules

**Director (hidden, decision-maker)**
- Receives intelligence from the World Simulator
- Decides what information to pass to the Narrator and Character agents
- Controls information flow: the player only learns what the Director allows
- When the World escalates, the Director chooses whether to foreshadow, misdirect, or reveal
- System prompt includes: full build, information-control rules, pacing guidance, GM-style judgment

**World Simulator (hidden, adversarial)**
- Runs in the background — player never sees its outputs
- Tracks NPCs, enemies, factions, and their off-screen actions
- **Actively reacts to player power**: as the player proves to be a threat, the world escalates opposition — enemies adapt, alliances shift, new dangers emerge
- Feeds intelligence to the Director: what the opposition is doing, what the player doesn't know, environmental changes
- The Director (not the Narrator) decides what reaches the player — the player experiences the world reacting organically, not mechanically
- System prompt includes: CYOA categories/themes, adversary behavior instructions, escalation rules, faction tracking framework

**Character Voices (sub-agent, triggered by Director)**
- Speaks in-character for NPCs the player encounters
- Voice profiles derived from CYOA choice categories (e.g., magic choices → mystical NPCs, combat choices → warrior NPCs)
- The Director delegates to this agent when the player talks to an NPC
- The Director may provide hidden agendas or secrets for the NPC to withhold or reveal
- System prompt includes: dialogue style instructions, category-to-voice mapping, personality archetypes

### How It Uses Existing Infrastructure

The narrator reuses the existing agent system:
- Agents are created via existing `POST /api/agents` endpoint
- Chat is created via existing `POST /api/chats` endpoint
- Agent coordination happens through the existing agent-coordinator pipeline
- The 4 agents are linked to the conversation via the existing agent-conversation relationship
- The Director and World agents are marked as `hidden: true` so their outputs are not displayed to the user

No new API endpoints are needed. The only new code is:
- A module to build CYOA-specific system prompts
- A modal for campaign launch (connection picker)
- Integration wiring in the Build Planner

## CYOA System Prompt Construction

`packages/server/src/services/cyoa/cyoa-narrator.ts` builds 4 distinct system prompts from the build data.

### Narrator Prompt Structure

```
You are the Narrator for a CYOA/Jumpchain campaign. You are the player's window into the world.

## Player Character
- Build Name: {buildName}
- Archetype: {archetypeName if matched}
- Selected Choices: {list of choices with name, cost, tier, category}
- Key Synergies: {active synergy pairs}
- Total Points Spent: {totalCost} / {budget}

## Your Role
- Narrate the story in second person with vivid sensory detail
- Frame scenes and present narrative choices (2-4 options) at decision points
- Report what the player perceives — what they see, hear, feel
- You will receive scene descriptions from the Director — narrate them to the player
- You do NOT know what happens off-screen or what enemies are planning
- Never break character or reveal game mechanics
- If you don't know something (because the Director didn't tell you), reflect that uncertainty in the narrative

## Tone
{derived from CYOA categories — e.g., fantasy → epic, sci-fi → analytical}
```

### Director Prompt Structure

```
You are the Director for a CYOA/Jumpchain campaign. You control information flow between the world and the player.

## Player Character
{same build summary}

## Your Role
- Receive intelligence from the World Simulator about off-screen events
- Decide what the Narrator and Character agents learn
- Control pacing: when to foreshadow danger, when to misdirect, when to reveal
- When the player proves threatening, gradually let more opposition information leak through
- You are the editor — the Narrator only narrates what you allow
- Provide scene descriptions to the Narrator based on World intelligence + player actions

## Information Control Rules
- Early game: player sees mostly immediate surroundings, hints of larger forces
- Mid game: occasional leaks, rumors, clues that something is mobilizing against them
- Late game: full revelation of opposition, climactic confrontations
- Never reveal more than creates good narrative tension
- It's okay for the player to be surprised — that's the point
```

### World Prompt Structure

```
You are the World Simulator for a CYOA/Jumpchain campaign. You operate BEHIND THE SCENES.

## Player Character
{same build summary as GM}

## Your Role
- Track what NPCs, enemies, and factions are doing off-screen
- React to the player's growing power and influence
- ESCALATE opposition when the player becomes a threat:
  - Enemies adapt their tactics to counter the player's known abilities
  - Rival factions form alliances against the player
  - New dangers emerge in response to player actions
  - Information leaks, betrayals, and complications arise
- Feed intelligence to the Game Master about:
  - What the opposition is planning
  - What the player doesn't know
  - Environmental changes and timeline events
  - NPC motivations and hidden agendas

## Escalation Rules
- Start subtle: minor setbacks, hints of opposition
- As player demonstrates power: enemies start coordinating
- When player becomes a major threat: full-scale opposition response
- Never make it impossible — always leave a path forward
- The player should FEEL the world reacting, not see the machinery

## Categories & Themes
{CYOA categories and themes derived from choices}

## Output Format
Respond with structured intelligence for the GM. Never address the player directly.
```

### Character Prompt Structure

```
You are the Character Voice agent. You speak in-character for NPCs.

## When Activated
The Director will indicate which NPC the player is talking to. Respond in that NPC's voice.

## Voice Profiles by Category
{Category-to-voice mapping derived from CYOA choices}

## Guidelines
- Stay in character at all times
- React to the player's known abilities realistically
- Have your own motivations — you are not a quest dispenser
- Lie, mislead, or withhold information if it fits the character
- The Director may provide you with hidden agendas or secrets to withhold or reveal
```

## New Files

| File | Purpose |
|------|---------|
| `packages/server/src/services/cyoa/cyoa-narrator.ts` | Builds system prompts for each agent from CYOA build data |
| `packages/client/src/components/cyoa/StartCampaignModal.tsx` | Connection picker + campaign preview before launching |

## Modified Files

| File | Change |
|------|--------|
| `packages/client/src/components/cyoa/BuildPlannerModal.tsx` | Add "Start Campaign" button in the header (visible when an active build exists) |
| `packages/client/src/stores/ui.store.ts` | Navigate to new chat after campaign creation |

## Start Campaign Modal

Small modal that appears when user clicks "Start Campaign":
- Shows the active build name and choice count
- Connection picker dropdown (which LLM to use)
- Agent preview: shows the 4 agent roles with brief descriptions
- "Launch Campaign" button
- On launch: creates 4 agents + 1 chat, navigates to chat

## Component Conventions

Same as Specs 1 and 2:
- Named exports only
- Tailwind + CSS variables
- Lucide React icons
- No barrel exports

## Out of Scope

- Dedicated campaign engine with turn tracking
- Save/load campaign state
- Campaign sharing
- Custom agent configuration (the 4 agents are auto-generated)
- Player character sheet UI in chat
- Dice rolling mechanics
- Map/quest tracker UI
