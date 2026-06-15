# JumpChoice Architecture (Future Vision)

> **⚠️ STATUS: ASPIRATIONAL — NOT CURRENT REALITY**
>
> This document describes the *planned* end-state architecture from the original
> fork plan. It references packages that do **not yet exist** as of the current
> release (`@jumpchoice/memory`, `@jumpchoice/vision`, `@jumpchoice/build-lab`,
> `@jumpchoice/campaign`, `@jumpchoice/doc-parser`, `@jumpchoice/gm`,
> `@jumpchoice/image-gen`) and uses `pgTable` Postgres schemas while the actual
> codebase is SQLite/file-backed.
>
> **For the current architecture, see:**
> - `README.md` — shipped features
> - `ROADMAP.md` — phase-by-phase progress with `[x]`/`[ ]` status
> - `docs/ARCHITECTURE_MAP.md` — actual file/package map
> - `packages/` directory — only `client/`, `server/`, `shared/` exist today
>
> This file is preserved as planning context for future work. Update it only
> when a described module actually ships (then remove the corresponding banner
> item above).

## Overview

JumpChoice is a modular AI roleplay platform built on a fork of Marinara Engine. The architecture follows a **fork-then-diverge** strategy: we start with Marinara's solid foundation, add Jumpchain-specific modules alongside existing code, then gradually replace core components until the codebase is substantially different.

## Package Structure

```
jumpchoice/
├── packages/
│   ├── client/          # React 19 + Vite frontend (forked from Marinara)
│   ├── server/          # Fastify 5 backend (forked from Marinara)
│   ├── shared/          # Zod schemas, types, constants
│   ├── build-lab/       # NEW: Jumpchain build evaluator + point tracker
│   ├── memory/          # NEW: 3-tier memory system
│   ├── vision/          # NEW: Image analysis pipeline
│   ├── image-gen/       # NEW: Image generation pipeline
│   ├── campaign/        # NEW: Campaign/chain tracker
│   ├── doc-parser/      # NEW: Jump document parser
│   └── gm/              # NEW: Game Master module
├── android/             # WebView wrapper
├── docs/
└── scripts/
```

## Divergence Strategy

### Phase 1: Fork (Weeks 1-3)
- Clean fork, rename packages from `@marinara-engine/*` to `@jumpchoice/*`
- Strip Marinara branding, update documentation
- Fix critical tech debt (split 4 massive files)
- Keep all Marinara features working

### Phase 2: Extend (Weeks 4-12)
- Add new packages alongside Marinara's existing code
- New modules are purely additive - they don't touch Marinara's core
- Modules: `memory`, `vision`, `doc-parser`, `build-lab`, `campaign`

### Phase 3: Replace (Weeks 13-18)
- Gradually replace Marinara's storage with our 3-tier memory system
- Replace agent pipeline with our GM module
- Add our image pipelines
- Each replacement is behind an interface for A/B testing

### Phase 4: Diverge (Weeks 19-21)
- Codebase is substantially different
- Stop tracking upstream
- Marinara becomes a reference, not a dependency
- Establish independent release cycle

## Module Dependency Graph

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

## Core Principles

### 1. Modular by Design
Each new module is an independent package with:
- Clear API boundaries
- Own database schema
- Dedicated tests
- Independent documentation

### 2. Interface-First
All module interactions go through well-defined interfaces:
- Enables A/B testing of implementations
- Allows gradual replacement
- Prevents tight coupling

### 3. File-Native Storage
Following Marinara's approach:
- All data stored as JSON files by default
- SQLite compatibility layer for querying
- Easy backup and portability
- No database setup required for users

### 4. Agent-Driven Intelligence
Extending Marinara's agent system:
- New agent types for Jumpchain-specific tasks
- Batched execution for efficiency
- Tool-calling loops for complex operations
- Persistent agent memory

## Key Integration Points

### Generation Pipeline (`generate.routes.ts`)
The central nervous system of the application. Our modules integrate here:
- **Memory:** Injects relevant long-term memories before prompt assembly
- **Vision:** Adds image analysis results to context
- **GM:** Injects jump context and character abilities
- **Image-gen:** Triggers image generation after response

### Agent Pipeline
New agent types extend the existing system:
- `memory-retrieval` - Fetches relevant memories
- `vision-analyzer` - Processes uploaded images
- `jumpchain-gm` - Narrates with jump context
- `build-context` - Injects character abilities
- `writeup-generator` - Creates session summaries

### Storage Layer
New tables follow Marinara's patterns:
- File-backed by default
- Drizzle schema for SQL compatibility
- Zod validation for all data
- Consistent CRUD operations

## Tech Debt Management

### Critical Files to Split (Phase 1)

**`generate.routes.ts` (10,036 lines)**
Split into:
- `generation/validation.routes.ts` - Request validation
- `generation/provider.routes.ts` - Provider creation
- `generation/prompt.routes.ts` - Prompt assembly
- `generation/agents.routes.ts` - Agent pipeline orchestration
- `generation/streaming.routes.ts` - SSE streaming
- `generation/post-processing.routes.ts` - Regex, game state, etc.

**`GameSurface.tsx` (8,947 lines)**
Split into:
- `game/GameSetup.tsx` - Setup wizard
- `game/GameNarration.tsx` - GM narration display
- `game/GameParty.tsx` - Party management
- `game/GameMap.tsx` - Map display
- `game/GameCombat.tsx` - Combat UI
- `game/GameJournal.tsx` - Journal entries
- `game/GameStats.tsx` - Character stats

**`game.routes.ts` (7,378 lines)**
Split into:
- `game/sessions.routes.ts` - Session management
- `game/combat.routes.ts` - Combat resolution
- `game/maps.routes.ts` - Map generation/movement
- `game/encounters.routes.ts` - Encounter rolling
- `game/progression.routes.ts` - Campaign progression

**`ChatSettingsDrawer.tsx` (7,106 lines)**
Split into:
- `chat/CharacterSettings.tsx` - Character/persona selection
- `chat/ConnectionSettings.tsx` - API connection
- `chat/PromptSettings.tsx` - Preset management
- `chat/AgentSettings.tsx` - Agent configuration
- `chat/AdvancedSettings.tsx` - Generation parameters

### Testing Strategy

**Phase 1:** Add vitest, write tests for:
- Generation pipeline (critical path)
- Memory module (when added)
- Build validation logic

**Phase 2-4:** Add tests for each new module:
- Unit tests for business logic
- Integration tests for API routes
- E2E tests for critical user flows

**Target:** 70% coverage by v1.0

## Security Considerations

Inherited from Marinara:
- AES-256 encrypted API keys
- CSRF protection
- IP allowlists
- SSRF protection
- Rate limiting
- Basic auth for remote access

Additional for JumpChoice:
- Sanitize uploaded PDFs and images
- Validate jump document structure
- Rate limit vision API calls
- Secure vector DB access

## Performance Targets

- **Memory module:** 75% token savings on 400+ message chats
- **Vision module:** <5s response time for image analysis
- **Build validation:** <100ms for rule checking
- **Image generation:** <30s for prompt + image
- **Generation pipeline:** No regression from Marinara baseline

## Monitoring & Observability

- Structured logging via Pino (inherited)
- Agent execution metrics (tokens, duration, success rate)
- Memory system metrics (compression ratio, retrieval accuracy)
- User-facing performance dashboard

## Future Architecture Considerations

### Plugin System (Post-v1.0)
- Define plugin API for third-party modules
- Hot-reload plugins without server restart
- Plugin marketplace and discovery

### Multiplayer Support (Post-v1.0)
- WebSocket-based real-time sync
- Shared campaign state
- Turn-based multiplayer jumps

### Cloud Sync (Post-v1.0)
- Optional encrypted backup to cloud storage
- Sync across devices
- Conflict resolution
