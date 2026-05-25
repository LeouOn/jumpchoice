# JumpChoice Roadmap

A full AI roleplay platform forked from Marinara Engine, specialized for Jumpchain and Make-Your-Choice CYOA experiences.

## Vision

JumpChoice is a local-first, BYOK (bring your own key) AI roleplay platform that combines:
- **Jumpchain character building** with point-buy mechanics and AI evaluation
- **Make-Your-Choice CYOA** with visual image parsing
- **AI Game Master** with hybrid narration + optional RPG mechanics
- **Intelligent memory management** for long-running campaigns
- **Image generation and vision** pipelines for immersive storytelling

## Current State

Forked from Marinara Engine v1.6.0 (May 2026). Inherited:
- Chat UI with conversation, roleplay, visual novel, and game modes
- 25+ built-in AI agents with batched execution
- Multi-provider LLM support (OpenAI, Anthropic, Google, OpenRouter, local models)
- Full RPG game mode with campaigns, combat, dice, maps
- CYOA choice generation system
- File-native storage with SQLite compatibility layer

**Known tech debt:**
- `generate.routes.ts` (10,036 lines) - needs splitting
- `GameSurface.tsx` (8,947 lines) - needs splitting
- `game.routes.ts` (7,378 lines) - needs splitting
- `ChatSettingsDrawer.tsx` (7,106 lines) - needs splitting
- Zero automated tests

## Phases

### Phase 1: Foundation & Cleanup (Weeks 1-3)

**Goal:** Clean fork, rename to JumpChoice, fix critical tech debt, establish our own identity.

- [x] Rename packages from `@marinara-engine/*` to `@jumpchoice/*`
- [ ] Update branding, remove Marinara-specific assets
- [ ] Split `generate.routes.ts` into focused route modules
- [ ] Split `GameSurface.tsx` into smaller components
- [ ] Split `game.routes.ts` into domain-specific route files
- [ ] Split `ChatSettingsDrawer.tsx` into focused setting panels
- [ ] Add basic test infrastructure (vitest)
- [ ] Write tests for core generation pipeline
- [ ] Update documentation for JumpChoice context
- [ ] **Implement core narrative principles** (anti-assistant bias, knowledge firewall, user agency, NPC autonomy)
- [ ] **Add narrator persona system** (Vex-style with 3-4 default voices)
- [ ] **Implement basic CoT system** (Main and Fast modes)

**Deliverable:** Clean, renamed codebase with manageable file sizes, basic test coverage, and foundational narrative engine.

### Phase 2A: Memory System (Weeks 4-5)

**Goal:** Implement 3-tier memory system with auto-summarization and context compression.

- [x] Design memory module API and database schema
- [ ] Implement Tier 2: Auto-summarization of old messages (LLM-based)
- [ ] Build prompt interceptor to strip archived messages
- [ ] Write tests for memory pipeline
- [ ] Benchmark token savings vs. baseline
- [ ] Update documentation for memory system

**Deliverable:** Working 3-tier memory system with measurable token savings on long conversations.

### Phase 2B: NPC Tracking & Intelligence (Weeks 5-6)

**Goal:** Add NPC tracking, world state management, and AI slop detection.

- [ ] **Implement NPC Bank system** (auto-extraction, dossier generation, dynamic injection)
- [ ] **Add NPC Inner Chatter** (hidden thoughts block, collapsed by default)
- [ ] **Implement World State Tracker** (collapsible HTML block with date/weather/PC state/NPC agendas)
- [ ] **Add Dynamic Ban List / AI Slop Detector** (analyze chat, identify crutch phrases, auto-ban)
- [ ] Add regex cleaner for noise removal
- [ ] Write tests for NPC and world state features

**Deliverable:** NPC tracking, world state management, and slop detection working alongside memory system.

**Note:** Tier 3 vector search already exists (SQLite + JSON embeddings with cosine similarity). LanceDB migration deferred until scale demands it. Memory configuration UI deferred to future phase.

### Phase 3: Vision & Document Parsing (Weeks 7-9)

**Goal:** Enable image analysis for visual CYOAs and PDF parsing for Jumpchain docs.

- [ ] Design vision module API
- [ ] Implement image URL/upload ingestion
- [ ] Integrate vision models (GPT-4V, Gemini Pro Vision)
- [ ] Build CYOA choice extraction from images
- [ ] Design doc-parser module API
- [ ] Implement PDF text extraction
- [ ] Build LLM-assisted jump document structuring
- [ ] Create jump document browser UI
- [ ] Write tests for both modules

**Deliverable:** Can parse visual CYOAs and Jumpchain PDFs into structured data.

### Phase 4: Build Lab & Campaign Tracker (Weeks 10-12)

**Goal:** Core Jumpchain experience - build characters, track chains.

- [ ] Design build-lab module API and database schema
- [ ] Implement point tracker with budget validation
- [ ] Build rule engine for perk/drawback validation
- [ ] Integrate AI build review (synergy, weaknesses, fun factor)
- [ ] Create build lab UI (perk browser, point allocation, review panel)
- [ ] Design campaign module API
- [ ] Implement chain tracker with progression log
- [ ] Build persistent character sheet across jumps
- [ ] Create campaign overview UI
- [ ] Write tests for both modules

**Deliverable:** Can build Jumpchain characters and track campaign progression.

### Phase 5: Game Master Module (Weeks 13-15)

**Goal:** Hybrid AI narration + optional mechanics for running jumps, with advanced narrative engine.

- [ ] Design GM module API extending existing game mode
- [ ] Implement jumpchain-aware narrator agent
- [ ] Build jump context injection (setting, perks, abilities)
- [ ] Add toggle-able mechanics overlay (dice, stats, combat)
- [ ] Create scene management with world state tracking
- [ ] Integrate with campaign and build-lab modules
- [ ] Write tests for GM pipeline
- [ ] Playtest: Run a complete jump with the GM
- [ ] **Implement 5-Phase CoT Audit** (Ground Truth → Plot Engine → Scene Design → Active Draft → Correction Loop)
- [ ] **Add Story Planner** (auto-generate 10+ plot milestones, inject into context)
- [ ] **Implement variable-slot composition system** (setvar/getvar pattern for module composition)
- [ ] **Add genre & style overlays** (romance, horror, comedy, fantasy, thriller modes)
- [ ] **Implement cultural anchoring** (real brands, names, references when setting-appropriate)
- [ ] **Add Gemini Thinking toggle** (triple  tags for reasoning separation)

**Deliverable:** Can run through a Jumpchain setting with AI narration, optional mechanics, and advanced narrative techniques.

### Phase 6: Image Generation & Immersion (Weeks 16-18)

**Goal:** Generate images from scenes, add writeup generation.

- [ ] Design image-gen module API
- [ ] Implement Stage 1: Scene-to-prompt generation
- [ ] Integrate Stage 2: ComfyUI, Stability AI, Pollinations
- [ ] Add auto-trigger agent for "picture-worthy" moments
- [ ] Build image gallery integration
- [ ] Implement writeup module (session summaries, jump recaps)
- [ ] Add export system (markdown, PDF, HTML)
- [ ] Write tests for image pipeline

**Deliverable:** Automatic image generation and session writeups.

### Phase 7: Polish & Divergence (Weeks 19-21)

**Goal:** Final polish, mobile support, full divergence from Marinara.

- [ ] Mobile-responsive PWA optimization
- [ ] Multi-backend TTS integration (browser, ElevenLabs, OpenAI, local)
- [ ] Performance optimization and caching
- [ ] Comprehensive test suite (target 70% coverage)
- [ ] Documentation overhaul (user guide, API docs, module docs)
- [ ] Remove remaining Marinara-specific code
- [ ] Establish independent release cycle
- [ ] Community contribution guidelines

**Deliverable:** Production-ready v1.0 with full feature set.

## Future Considerations (Post-v1.0)

- **Multiplayer/co-op campaigns** - Multiple users in the same jumpchain
- **Shared jumpchain libraries** - Community-created jump documents and builds
- **Advanced analytics** - Token usage, cost tracking, session statistics
- **Plugin marketplace** - Third-party modules and extensions
- **Cloud sync** - Optional backup/sync across devices
- **Android/iOS native apps** - Beyond WebView wrappers

## Tech Stack

- **Backend:** Fastify 5, TypeScript, Drizzle ORM, LanceDB
- **Frontend:** React 19, Vite 7, Zustand, Tailwind v4
- **Storage:** File-native JSON + SQLite compatibility layer + vector DB
- **Build:** pnpm workspaces, esbuild
- **Testing:** Vitest (to be added)

## License

AGPL-3.0 (inherited from Marinara Engine)

## References

- [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine) - Original codebase
- [Megumin Suite V7](https://github.com/Arif-salah/Megumin-Suite) - Memory system inspiration
- [NemoEngine](https://github.com/NemoVonNirgend/NemoEngine) - Agent and preset system reference
- [SillyTavern](https://github.com/SillyTavern/SillyTavern) - General RP platform reference
