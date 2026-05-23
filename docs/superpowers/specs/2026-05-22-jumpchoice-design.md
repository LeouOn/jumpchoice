# JumpChoice Design Specification

**Date:** 2026-05-22  
**Status:** Draft  
**Authors:** JumpChoice Team

## Executive Summary

JumpChoice is a local-first, BYOK (bring your own key) AI roleplay platform specialized for Jumpchain and Make-Your-Choice CYOA experiences. It is built on a fork of Marinara Engine v1.6.0 with a fork-then-diverge strategy: leverage Marinara's solid foundation (provider layer, agent system, chat UI), add Jumpchain-specific modules, then gradually replace core components until the codebase is substantially independent.

## Problem Statement

Existing AI roleplay platforms (SillyTavern, Marinara Engine) are general-purpose and lack specialized support for:

1. **Jumpchain character building** - Point-buy systems with complex rules, perk/drawback validation, and AI-powered build evaluation
2. **Visual CYOA parsing** - Make-Your-Choice documents are often image-based, requiring vision model integration to extract choices
3. **Campaign progression tracking** - Jumpchain is inherently a chain of settings; no platform tracks progression across multiple jumps with persistent character state
4. **Long-context memory** - Jumpchain campaigns run hundreds of sessions; existing memory systems are too simple or too expensive in tokens

## Solution

A modular platform with 8 specialized modules built on top of Marinara Engine's proven architecture:

| Module | Purpose | Phase |
|--------|---------|-------|
| Memory | 3-tier context compression (75% token savings) | 2 |
| Vision | Image analysis for visual CYOAs | 3 |
| Doc Parser | Jumpchain PDF/text → structured data | 3 |
| Build Lab | Point-buy character building + AI review | 4 |
| Campaign | Chain progression tracking | 4 |
| GM | Hybrid narration + optional mechanics | 5 |
| Image Gen | Scene → prompt → image pipeline | 6 |
| Writeup | Session/jump/campaign summaries | 6 |

## Architecture

### Fork Strategy

```
Phase 1 (Weeks 1-3):  Fork → Rename → Fix tech debt → Keep all features
Phase 2 (Weeks 4-12): Add new modules alongside existing code (purely additive)
Phase 3 (Weeks 13-18): Replace core components behind interfaces
Phase 4 (Weeks 19-21): Full divergence → Independent release cycle
```

### Package Structure

New modules start as directories within `packages/server/src/services/` and `packages/client/src/components/` (following Marinara's existing pattern). As modules mature and stabilize, they may be extracted into standalone packages under `packages/`. This avoids premature abstraction while keeping the option open.

```
jumpchoice/
├── packages/
│   ├── client/          # React 19 + Vite frontend (forked)
│   │   └── src/components/
│   │       ├── build-lab/    # NEW: Build lab UI
│   │       ├── campaign/     # NEW: Campaign UI
│   │       └── ...
│   ├── server/          # Fastify 5 backend (forked)
│   │   └── src/
│   │       ├── services/
│   │       │   ├── memory/       # NEW: 3-tier memory system
│   │       │   ├── vision/       # NEW: Image analysis pipeline
│   │       │   ├── doc-parser/   # NEW: Jump document parser
│   │       │   ├── build-lab/    # NEW: Build evaluator + point tracker
│   │       │   ├── campaign/     # NEW: Campaign/chain tracker
│   │       │   ├── gm/           # NEW: Game Master module
│   │       │   ├── image-gen/    # NEW: Image generation pipeline
│   │       │   └── writeup/      # NEW: Summary generation
│   │       └── routes/
│   │           ├── memory.routes.ts
│   │           ├── vision.routes.ts
│   │           └── ...
│   └── shared/          # Zod schemas, types, constants
│       └── src/
│           ├── types/
│           │   ├── jump-document.ts   # NEW
│           │   ├── build.ts           # NEW
│           │   ├── campaign.ts        # NEW
│           │   └── memory.ts          # NEW
│           └── constants/
│               └── agent-prompts.ts   # Extended with new agents
```
jumpchoice/
├── packages/
│   ├── client/          # React 19 + Vite frontend (forked)
│   │   └── src/components/
│   │       ├── build-lab/    # NEW: Build lab UI
│   │       ├── campaign/     # NEW: Campaign UI
│   │       └── ...
│   ├── server/          # Fastify 5 backend (forked)
│   │   └── src/
│   │       ├── services/
│   │       │   ├── memory/       # NEW: 3-tier memory system
│   │       │   ├── vision/       # NEW: Image analysis pipeline
│   │       │   ├── doc-parser/   # NEW: Jump document parser
│   │       │   ├── build-lab/    # NEW: Build evaluator + point tracker
│   │       │   ├── campaign/     # NEW: Campaign/chain tracker
│   │       │   ├── gm/           # NEW: Game Master module
│   │       │   ├── image-gen/    # NEW: Image generation pipeline
│   │       │   └── writeup/      # NEW: Summary generation
│   │       └── routes/
│   │           ├── memory.routes.ts
│   │           ├── vision.routes.ts
│   │           └── ...
│   └── shared/          # Zod schemas, types, constants
│       └── src/
│           ├── types/
│           │   ├── jump-document.ts   # NEW
│           │   ├── build.ts           # NEW
│           │   ├── campaign.ts        # NEW
│           │   └── memory.ts          # NEW
│           └── constants/
│               └── agent-prompts.ts   # Extended with new agents
```

### Module Dependency Graph

```
                    ┌─────────┐
                    │ shared  │
                    └────┬────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────┴────┐    ┌─────┴─────┐    ┌────┴────┐
   │ server  │    │  client   │    │ memory  │
   └────┬────┘    └─────┬─────┘    └────┬────┘
        │                │                │
   ┌────┴────────────────┴────────────────┴────┐
   │              Extension Modules             │
   ├──────────┬──────────┬──────────┬──────────┤
   │ build-lab│ campaign │ doc-parser│  gm     │
   ├──────────┼──────────┼──────────┼──────────┤
   │  vision  │ image-gen│          │          │
   └──────────┴──────────┴──────────┴──────────┘
```

### Integration Points

All modules integrate through two key systems:

1. **Generation Pipeline** (`generate.routes.ts`): Memory injection, vision results, GM context, image triggers
2. **Agent Pipeline**: New agent types (`memory-retrieval`, `vision-analyzer`, `jumpchain-gm`, `build-context`, `writeup-generator`)

## Narrative Engine Features

JumpChoice incorporates advanced narrative techniques from Megumin Suite V7 and NemoEngine V10 to create immersive, non-assistant-like AI storytelling.

### Core Narrative Principles

**Anti-Assistant Bias** (from Megumin V7)
- The AI is not a helpful assistant; it's a narrator and world simulator
- NPCs fight back, misinterpret, hold grudges, get tired, leave conversations
- Forgiveness is a process requiring scenes, not just apologies
- The world does not revolve around the user character

**Knowledge Firewall / Theory of Mind** (from both)
- NPCs only know what they've observed or been told
- User's internal thoughts/narration are invisible to NPCs unless expressed externally
- Information travels through dialogue, observation, documents, rumors
- Prevents mind-reading and omniscient NPCs

**User Agency Preservation** (from NemoEngine)
- AI never decides user's actions, dialogue, thoughts, or voluntary choices
- The world can act ON the user, but not DECIDE for the user
- User character belongs to the user; NPCs belong to the AI

**NPC Autonomy** (from NemoEngine)
- NPCs have their own motives, limits, knowledge, and lives
- They disagree, leave, lie, fail, misunderstand, pursue their own goals
- They act before the user asks when it makes sense
- Prevents passive wish-fulfillment loops

**Cultural Anchoring** (from Megumin V7)
- Use real brand names, artist names, platforms, headlines, memes (when setting-appropriate)
- No "the popular social media app" or "a famous pop song"
- Real-world texture makes settings feel lived-in

**Narrative Drive** (from Megumin V7)
- AI does not stop and wait for user; it drives the story forward
- Derives plot when scenes feel dry or stagnant
- Maintains pacing and momentum

**Moral Complexity** (from Megumin V7)
- No archetypes; people are morally grey
- No clear good/evil; motivations are complex
- Consequences have weight and persistence

### NPC Bank System

**Auto-Extraction**
- When AI introduces a significant NPC, automatically generate a dossier
- Dossier includes: name, age, appearance, backstory, personality, secret motivations, inner circle
- Store in persistent database

**Dynamic Injection**
- Scan last 4 messages for NPC relevance
- Inject dossiers only when NPC is actually in scene (not just mentioned in trackers)
- Regex filter prevents false positives

**AI Portraits**
- One-click ComfyUI portrait generation from AI's physical description
- Fully automated pipeline
- Portraits can be sent back to multimodal models as visual reference

**NPC Inner Chatter**
- Hidden block after each response showing NPCs' unfiltered thoughts
- True feelings behind dialogue, hidden information, unspoken observations
- Designed to be read by AI only (collapsed by default to avoid spoilers)

### Advanced Chain of Thought

**5-Phase Audit** (from Megumin V7)
1. **Ground Truth:** What actually happened in the scene
2. **Plot Engine:** How this advances the story
3. **Scene Design:** Pacing, tension, character beats
4. **Active Draft:** Writing the response
5. **Correction Loop:** Self-critique and refinement

**Multiple CoT Modes** (from NemoEngine)
- **Main CoT:** Full 5-phase audit for quality
- **Fast CoT:** Lighter reasoning for speed
- **Modular Steps:** Optional specialized reasoning (investigation, continuity, character tracking)

**Gemini Thinking Toggle**
- Triple `<think>` tags to bypass Google's reasoning filters
- Clean separation: thinking stays in thinking block, prose stays in prose
- Requires auto-parse configuration

### World State & Tracking

**World State Tracker** (from Megumin V7)
- Collapsible HTML block after each response
- Tracks: date/time/weather, PC physical state, NPC agendas, off-screen activity, unresolved threads, scene phase
- Designed to be read by AI, not user (collapsed by default)

**Story Planner** (from Megumin V7)
- Auto-generates 10+ plot milestones
- Inserts into context for AI to work toward
- Prevents aimless responding; creates narrative direction

**Dynamic Ban List / AI Slop Detector** (from Megumin V7)
- "Analyze Chat" button scans last 50 messages
- Identifies top 5 repetitive crutch phrases
- Auto-converts to negative rules, bans from future generations
- Examples: "a shiver ran down your spine", "testament to..."

**Visual Trackers** (from NemoEngine)
- Quest journals, status boards, location boards
- CYOA choices, dating sim UI, manga/webtoon panels
- HTML/CSS, ASCII, or regex render modes
- Optional; enable only when needed

### Narrator Personas (Vex System)

**Multiple Narrator Voices** (from NemoEngine)
- Default Vex, Noir Vex, Cozy Vex, Clinical Vex, Gamemaster Vex, etc.
- Each replaces narrator identity, storytelling style, dialogue texture
- Use one primary persona at a time

**Genre & Style Overlays** (from NemoEngine)
- Romance, horror, comedy, high fantasy, thriller, AO3-style, literary modes
- Author-inspired profiles
- Replace style variables throughout the system (not just add-on instructions)

**Anti-Slop Behavior** (from both)
- Built-in rules against repetitive phrases, purple prose, mind-reading
- Rhetorical device rotation, sensory channel rotation
- Last Turn Critique and Course Correction CoT steps

### Variable-Slot Composition System

**setvar/getvar Pattern** (from NemoEngine)
- Modules replace rule blocks via variables, not just stack instructions
- Prevents contradictions (e.g., "write horror" + "keep it cozy")
- Core pack pulls from active modules: `{{getvar::WritingStyle}}`, `{{getvar::Genre}}`
- Modules set variables: `{{setvar::WritingStyle::...}}`

**Composition Layers**
- Default prompts fill baseline slots
- Optional modules replace specific slots with specialized rules
- Supports: VexPersona, WritingStyle, Genre, DialogueGuidelines, CoT_Main, etc.

## Narrative Engine Features

JumpChoice incorporates advanced narrative techniques from Megumin Suite V7 and NemoEngine V10 to create immersive, non-assistant-like AI storytelling.

### Core Narrative Principles

**Anti-Assistant Bias** (from Megumin V7)
- The AI is not a helpful assistant; it's a narrator and world simulator
- NPCs fight back, misinterpret, hold grudges, get tired, leave conversations
- Forgiveness is a process requiring scenes, not just apologies
- The world does not revolve around the user character

**Knowledge Firewall / Theory of Mind** (from both)
- NPCs only know what they've observed or been told
- User's internal thoughts/narration are invisible to NPCs unless expressed externally
- Information travels through dialogue, observation, documents, rumors
- Prevents mind-reading and omniscient NPCs

**User Agency Preservation** (from NemoEngine)
- AI never decides user's actions, dialogue, thoughts, or voluntary choices
- The world can act ON the user, but not DECIDE for the user
- User character belongs to the user; NPCs belong to the AI

**NPC Autonomy** (from NemoEngine)
- NPCs have their own motives, limits, knowledge, and lives
- They disagree, leave, lie, fail, misunderstand, pursue their own goals
- They act before the user asks when it makes sense
- Prevents passive wish-fulfillment loops

**Cultural Anchoring** (from Megumin V7)
- Use real brand names, artist names, platforms, headlines, memes (when setting-appropriate)
- No "the popular social media app" or "a famous pop song"
- Real-world texture makes settings feel lived-in

**Narrative Drive** (from Megumin V7)
- AI does not stop and wait for user; it drives the story forward
- Derives plot when scenes feel dry or stagnant
- Maintains pacing and momentum

**Moral Complexity** (from Megumin V7)
- No archetypes; people are morally grey
- No clear good/evil; motivations are complex
- Consequences have weight and persistence

### NPC Bank System

**Auto-Extraction**
- When AI introduces a significant NPC, automatically generate a dossier
- Dossier includes: name, age, appearance, backstory, personality, secret motivations, inner circle
- Store in persistent database

**Dynamic Injection**
- Scan last 4 messages for NPC relevance
- Inject dossiers only when NPC is actually in scene (not just mentioned in trackers)
- Regex filter prevents false positives

**AI Portraits**
- One-click ComfyUI portrait generation from AI's physical description
- Fully automated pipeline
- Portraits can be sent back to multimodal models as visual reference

**NPC Inner Chatter**
- Hidden block after each response showing NPCs' unfiltered thoughts
- True feelings behind dialogue, hidden information, unspoken observations
- Designed to be read by AI only (collapsed by default to avoid spoilers)

### Advanced Chain of Thought

**5-Phase Audit** (from Megumin V7)
1. **Ground Truth:** What actually happened in the scene
2. **Plot Engine:** How this advances the story
3. **Scene Design:** Pacing, tension, character beats
4. **Active Draft:** Writing the response
5. **Correction Loop:** Self-critique and refinement

**Multiple CoT Modes** (from NemoEngine)
- **Main CoT:** Full 5-phase audit for quality
- **Fast CoT:** Lighter reasoning for speed
- **Modular Steps:** Optional specialized reasoning (investigation, continuity, character tracking)

**Gemini Thinking Toggle**
- Triple `<think>` tags to bypass Google's reasoning filters
- Clean separation: thinking stays in thinking block, prose stays in prose
- Requires auto-parse configuration

### World State & Tracking

**World State Tracker** (from Megumin V7)
- Collapsible HTML block after each response
- Tracks: date/time/weather, PC physical state, NPC agendas, off-screen activity, unresolved threads, scene phase
- Designed to be read by AI, not user (collapsed by default)

**Story Planner** (from Megumin V7)
- Auto-generates 10+ plot milestones
- Inserts into context for AI to work toward
- Prevents aimless responding; creates narrative direction

**Dynamic Ban List / AI Slop Detector** (from Megumin V7)
- "Analyze Chat" button scans last 50 messages
- Identifies top 5 repetitive crutch phrases
- Auto-converts to negative rules, bans from future generations
- Examples: "a shiver ran down your spine", "testament to..."

**Visual Trackers** (from NemoEngine)
- Quest journals, status boards, location boards
- CYOA choices, dating sim UI, manga/webtoon panels
- HTML/CSS, ASCII, or regex render modes
- Optional; enable only when needed

### Narrator Personas (Vex System)

**Multiple Narrator Voices** (from NemoEngine)
- Default Vex, Noir Vex, Cozy Vex, Clinical Vex, Gamemaster Vex, etc.
- Each replaces narrator identity, storytelling style, dialogue texture
- Use one primary persona at a time

**Genre & Style Overlays** (from NemoEngine)
- Romance, horror, comedy, high fantasy, thriller, AO3-style, literary modes
- Author-inspired profiles
- Replace style variables throughout the system (not just add-on instructions)

**Anti-Slop Behavior** (from both)
- Built-in rules against repetitive phrases, purple prose, mind-reading
- Rhetorical device rotation, sensory channel rotation
- Last Turn Critique and Course Correction CoT steps

### Variable-Slot Composition System

**setvar/getvar Pattern** (from NemoEngine)
- Modules replace rule blocks via variables, not just stack instructions
- Prevents contradictions (e.g., "write horror" + "keep it cozy")
- Core pack pulls from active modules: `{{getvar::WritingStyle}}`, `{{getvar::Genre}}`
- Modules set variables: `{{setvar::WritingStyle::...}}`

**Composition Layers**
- Default prompts fill baseline slots
- Optional modules replace specific slots with specialized rules
- Supports: VexPersona, WritingStyle, Genre, DialogueGuidelines, CoT_Main, etc.

## Module Specifications

### Memory Module

**Inspiration:** Megumin Suite V7 Memory Core

**3-Tier Architecture:**
- **Tier 1 (Working):** Recent messages in context window (no change)
- **Tier 2 (Short-Term):** Auto-summarized chunks of ~10 messages, background LLM calls
- **Tier 3 (Long-Term):** Vector DB (LanceDB) with TF-IDF + semantic search, only relevant memories injected
- **Prompt Interceptor:** Strips archived messages from API payload (75%+ token savings)
- **Regex Cleaner:** Strips noise before summarization

**New DB tables:** `memory_summaries`, `memory_chunks_v2` (with embeddings), `memory_config`

### Vision Module

**Purpose:** Parse visual CYOAs and analyze uploaded images

**Pipeline:** URL/upload → download/resize → vision model (GPT-4V, Gemini Pro Vision) → structured JSON

**Analysis types:** General description, CYOA choice extraction, character details, scene description

**New routes:** `POST /api/vision/analyze`, `POST /api/vision/extract-choices`

### Doc Parser Module

**Purpose:** Parse Jumpchain PDFs into structured data

**Pipeline:** PDF upload → text extraction (pdf-parse) → LLM structuring → validation → storage

**Output:** `JumpDocument` with setting, perks[], drawbacks[], companions[], rules[], point_budget

**New DB tables:** `jump_documents`, `jump_perks`, `jump_drawbacks`, `jump_companions`

### Build Lab Module

**Purpose:** Point-buy character building with rule validation and AI review

**Components:**
- **Point Tracker:** Budget allocation with real-time validation
- **Rule Engine:** Illegal combos, prerequisites, point limits, category caps
- **AI Review:** Synergy analysis, weakness identification, fun factor rating, improvement suggestions
- **Build Comparison:** Side-by-side diff of alternate builds

**New DB tables:** `builds`, `build_perks`, `build_drawbacks`, `build_companions`, `build_reviews`

### Campaign Module

**Purpose:** Track progression through a chain of jumps

**Components:**
- **Chain Tracker:** Ordered list of jumps with status (planned/in-progress/completed)
- **Character Sheet:** Persistent info across jumps, accumulated perks/abilities
- **Progression Log:** Gains/losses per jump, key decisions
- **MYC Campaigns:** For non-jumpchain CYOA, tracks choices and consequences

**New DB tables:** `campaigns`, `campaign_jumps`, `campaign_characters`, `campaign_log`

### GM Module

**Purpose:** Hybrid AI narration + optional mechanics

**Components:**
- **Narrator Engine:** Extends `secret-plot-driver` and `world-state` agents with jumpchain awareness
- **Mechanics Overlay:** Toggle-able per-session via chat settings. When enabled: dice rolls, stat checks, combat encounters use Marinara's existing game mechanics. When disabled: pure AI narration with no mechanical resolution. Default: disabled (pure narration).
- **Jump Context Injection:** Auto-injects jump doc, character build, campaign history
- **Scene Management:** Tracks scenes within a jump with world state updates

**New agent types:** `jumpchain-gm`, `build-context`

### Image Generation Module

**Purpose:** Generate images from scene text

**Pipeline:** Scene text → LLM prompt generation → ComfyUI/Stability/Pollinations → gallery

**Auto-trigger:** Agent decides "picture-worthy" moments (extends Marinara's `illustrator` agent). Configurable sensitivity: off (manual only), low (major scenes only), medium (default - scene changes and key moments), high (frequent generation). User can always manually trigger or dismiss.. Configurable sensitivity: off (manual only), low (major scenes only), medium (default - scene changes and key moments), high (frequent generation). User can always manually trigger or dismiss.

### Writeup Module

**Purpose:** Generate session summaries, jump recaps, campaign chronicles

**Triggers:** Manual or automatic at session/jump end

**Export:** Markdown, PDF, styled HTML

**New agent type:** `writeup-generator`

## Tech Stack

| Layer | Technology | Source |
|-------|-----------|--------|
| Backend | Fastify 5, TypeScript | Marinara |
| Frontend | React 19, Vite 7, Zustand, Tailwind v4 | Marinara |
| Storage | File-native JSON + SQLite + LanceDB | Marinara + new |
| Build | pnpm workspaces, esbuild | Marinara |
| Testing | Vitest (to be added) | New |
| Vector DB | LanceDB | New |
| PDF parsing | pdf-parse | New |

## Deployment Model

**Local-first:** User runs on their machine, all data stays local, BYOK for AI providers.

**Platforms:** Windows, macOS, Linux, Android (Termux), iOS (PWA)

**No account required.** No cloud dependency.

## Security

Inherited from Marinara:
- AES-256 encrypted API keys
- CSRF protection, IP allowlists, SSRF protection
- Rate limiting, Basic auth for remote access

Additional for JumpChoice:
- Sanitize uploaded PDFs and images
- Validate jump document structure
- Rate limit vision API calls
- Secure vector DB access

## Performance Targets

| Metric | Target |
|--------|--------|
| Memory token savings | 75%+ on 400+ message chats |
| Vision response time | <5 seconds |
| Build validation | <100ms |
| Image generation | <30s (prompt + image) |
| Doc parsing | <10s for typical jump doc |
| Generation pipeline | No regression from Marinara |

## License

AGPL-3.0 (inherited from Marinara Engine). All modifications must remain open source.

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Massive inherited files (10K+ lines) | Phase 1 dedicated to splitting |
| Zero test coverage | Add vitest + tests for critical paths in Phase 1 |
| AGPL-3.0 lock-in | Acceptable for open-source project |
| Upstream divergence conflicts | Clean fork with clear boundary, stop tracking after Phase 4 |
| Vision API costs | Configurable model selection, caching |
| Vector DB complexity | LanceDB is embedded, no server required |

## Success Criteria

1. Can parse a visual CYOA image and extract playable choices
2. Can parse a Jumpchain PDF and build a character with point validation
3. Can run through a complete jump with AI GM narration
4. Can track a chain of 5+ jumps with persistent character state
5. Achieves 75%+ token savings on long campaigns
6. Runs on a laptop with no cloud dependency

## References

- [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine) - Base codebase
- [Megumin Suite V7](https://github.com/Arif-salah/Megumin-Suite) - Memory system inspiration
- [NemoEngine](https://github.com/NemoVonNirgend/NemoEngine) - Agent and preset reference
- [SillyTavern](https://github.com/SillyTavern/SillyTavern) - General RP platform reference
