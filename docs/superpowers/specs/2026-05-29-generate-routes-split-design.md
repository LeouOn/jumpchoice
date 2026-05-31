# Spec: Split `generate.routes.ts` into Clean Service Architecture

**Date:** 2026-05-29
**Status:** COMPLETE
**Scope:** `packages/server/src/routes/generate.routes.ts` (was 9,219 lines, now 161 lines)

## Problem

`generate.routes.ts` contained a single 9,100-line async handler with:
- 40+ mutable variables shared across the handler scope
- A `while(true)` Mari follow-up loop spanning 8,660 lines
- 70+ SSE event emission points across 30+ event types
- 20+ prompt injection steps mutating a single `finalMessages` array
- ~30 distinct code sections reading/writing `chatMeta`

This made it impossible to understand, test, or modify any single concern in isolation.

## Goal

Refactor into a service layer where each module owns one domain, has a clear API, and can be reasoned about independently. The route file becomes a thin shell (~161 lines).

## Architecture (As Implemented)

### Directory Structure

```
packages/server/src/
  routes/
    generate.routes.ts                          (161 lines, thin shell)
    generate/                                   (existing helpers, kept as-is)
  services/
    generation/
      generation-loop.ts                        (2,215 lines, loop orchestrator)
      streaming-handler.ts                      (1,472 lines, LLM streaming + tool calls)
      post-processor.ts                         (1,576 lines, agent result processing)
      command-dispatcher.ts                     (1,381 lines, character command execution)
      conversation-prompt-builder.ts            (1,124 lines, conversation mode prompt)
      pre-gen-runner.ts                         (744 lines, pre-gen agent execution)
      context-injector.ts                       (638 lines, lorebook/memory/Mari injection)
      game-prompt-builder.ts                    (526 lines, game mode GM prompt)
      agent-coordinator.ts                      (460 lines, agent pipeline resolution)
      helpers.ts                                (399 lines, pure utility functions)
      message-resolver.ts                       (272 lines, message/persona resolution)
      request-resolver.ts                       (152 lines, input validation + chat resolution)
      connection-resolver.ts                    (98 lines, connection resolution)
      types.ts                                  (21 lines, ServiceResult<T>, CharInfoEntry)
```

### Design Decisions

1. **Functions, not classes.** Each service exports a single async function (e.g., `runStreamingGeneration()`, `buildGamePrompt()`) rather than a class. This matches the codebase's existing style and avoids unnecessary ceremony.

2. **Per-service context interfaces.** Each function declares its own context interface with only the fields it needs (e.g., `StreamingHandlerContext`, `GamePromptContext`). No shared mega-state object.

3. **`generation-loop.ts` as orchestrator.** Instead of a separate `orchestrator.ts`, the loop function `runGenerationLoop()` coordinates the pipeline: resolve → inject → build prompt → agents → stream → post-process → follow-up loop.

4. **No `SseEmitter` abstraction.** The existing SSE helpers (`sendSseEvent`, `trySendSseEvent`, `startSseReply`) are used directly. The planned `SseEmitter` class was created then removed as dead code.

5. **No `GenerationState` interface.** The planned shared state object was never adopted — per-service context interfaces proved more practical and type-safe.

6. **Mutable references for accumulation.** `collectedCommands` and `collectedOocMessages` are passed as mutable arrays that services push into. `chatMeta` is passed as a mutable `Record<string, unknown>`.

7. **`any` types kept in context interfaces.** Context interfaces use `any` for `db`, `conn`, `input`, etc. Tightening is a follow-up task.

### Core Types (`services/generation/types.ts`)

```ts
export type ServiceResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

export interface CharInfoEntry {
  characterId: string;
  characterName: string;
  connectionId: string | null;
}
```

### Service Contracts

Each service exports a single async function. Services are stateless — they receive a context object and return a `ServiceResult`.

#### 1. `helpers.ts` — Pure Utility Functions (399 lines)

25+ pure functions extracted from the handler, plus `resolveGenerationParameters()`. All have zero dependency on handler state. 51 unit tests cover the pure functions.

#### 2. `request-resolver.ts` — Setup & Validation (152 lines)

```
resolveRequest(req, reply, activeGenerations, app) → ServiceResult<RequestContext>
```

Validates input, resolves chat, saves user message, commits game state, registers abort controller.

#### 3. `connection-resolver.ts` — LLM Connection Resolution (98 lines)

```
resolveConnection(ctx) → ServiceResult<ConnectionContext>
```

Resolves connection ID (random pool, impersonate override, fallback), creates provider, parses chatMeta.

#### 4. `message-resolver.ts` — Message & Persona Resolution (272 lines)

```
resolveMessagesAndPersona(ctx) → Promise<ServiceResult<MessageContext>>
```

Loads chat messages, resolves persona, applies regeneration filtering, injects timestamps.

#### 5. `context-injector.ts` — Prompt Context Injection (638 lines)

```
injectContext(ctx) → Promise<void>
```

Injects lorebook, memory, Mari, OOC, conversation notes, group chat instructions, tracker data. Deduplicated two identical lorebook injection blocks.

#### 6. `game-prompt-builder.ts` — Game Mode GM Prompt (526 lines)

```
buildGamePrompt(ctx) → Promise<void>
```

Builds and injects the full GM system prompt for game mode. Noop for non-game modes.

#### 7. `conversation-prompt-builder.ts` — Conversation Mode (1,124 lines)

```
buildConversationPrompt(ctx) → Promise<ServiceResult | void>
```

Handles conversation-mode DM prompt, schedule handling, delayed typing events, early-exit for offline characters.

#### 8. `pre-gen-runner.ts` — Pre-Generation Agents (744 lines)

```
runPreGeneration(ctx) → Promise<void>
```

Executes pre-generation agent phase (Phase 1), knowledge retrieval, knowledge router, failure gates.

#### 9. `agent-coordinator.ts` — Agent Pipeline (460 lines)

```
resolveAgentPipeline(ctx) → Promise<ServiceResult<AgentPipelineResult>>
```

Resolves enabled agents, handles per-agent connection overrides, places agent injections.

#### 10. `streaming-handler.ts` — Token Streaming & Response Saving (1,472 lines)

```
runStreamingGeneration(ctx) → Promise<ServiceResult<StreamingResult>>
```

Main generation: streaming tokens, tool call rounds, response saving, impersonate, group chat per-character generation.

#### 11. `post-processor.ts` — Post-Generation Processing (1,576 lines)

```
runPostProcessing(ctx) → Promise<ServiceResult>
```

Phase 3 agents, game state persistence, character commands (15+ command types), illustrator, haptic, Mari fetch.

#### 12. `command-dispatcher.ts` — Character Command Execution (1,381 lines)

```
dispatchCharacterCommands(ctx) → Promise<void>
```

Executes collected character commands: schedule, cross-post, selfie, memory, influence, note, spotify, haptic, scene, Mari commands.

### Dependency Graph (Clean DAG, No Cycles)

```
generate.routes.ts
  → request-resolver.ts
  → connection-resolver.ts
  → message-resolver.ts
  → generation-loop.ts
    → context-injector.ts → game-prompt-builder.ts (only cross-dependency)
    → conversation-prompt-builder.ts
    → pre-gen-runner.ts
    → agent-coordinator.ts
    → streaming-handler.ts
    → post-processor.ts → command-dispatcher.ts
  → helpers.ts (used by many)
  → types.ts (used by all)
```

### Route File After Refactor (`generate.routes.ts`, 161 lines)

```ts
export async function generateRoutes(app: FastifyInstance) {
  const activeGenerations = new Map<...>();
  app.decorate("activeGenerations", activeGenerations);

  app.post("/", async (req, reply) => {
    const resolveResult = await resolveRequest(req, reply, activeGenerations, app);
    if (!resolveResult.ok) return;
    const { ... } = resolveResult.value;

    const connResult = await resolveConnection({ ... });
    if (!connResult.ok) return;

    const msgResult = await resolveMessagesAndPersona({ ... });
    if (!msgResult.ok) return;

    await runGenerationLoop({ ... }); // contains the while(true) Mari loop
  });

  app.post("/abort", ...);
  await registerDryRunRoute(app);
  await registerRetryAgentsRoute(app);
}
```

## Migration Strategy (As Executed)

### Bottom-Up Extraction Order

Each step produced a working codebase with all tests passing:

| Step | Extract | Lines | Tests |
|------|---------|-------|-------|
| 1 | `helpers.ts` — pure functions | 399 | 51 new |
| 2 | `types.ts` — `ServiceResult<T>` | 21 | tsc clean |
| 3 | `request-resolver.ts` — validation | 152 | existing pass |
| 4 | `connection-resolver.ts` — connection | 98 | existing pass |
| 5 | `message-resolver.ts` — messages/persona | 272 | existing pass |
| 6 | `resolveGenerationParameters` → helpers | +88 | +10 new |
| 7 | `generation-loop.ts` — entire while(true) loop | 2,215 | existing pass |
| 8a | `command-dispatcher.ts` — commands | 1,381 | existing pass |
| 8b | `game-prompt-builder.ts` — GM prompt | 526 | existing pass |
| 8c | `conversation-prompt-builder.ts` — DM prompt | 1,124 | existing pass |
| 8d | `agent-coordinator.ts` — agent pipeline | 460 | existing pass |
| 8e | `post-processor.ts` — post-gen | 1,576 | existing pass |
| 8f | `streaming-handler.ts` — streaming | 1,472 | existing pass |
| 8g | `pre-gen-runner.ts` — pre-gen agents | 744 | existing pass |
| 8h | `context-injector.ts` — context injection | 638 | existing pass |

**Key pivot:** Instead of extracting services one-by-one from the monolith, we first extracted the entire `while(true)` loop as `generation-loop.ts` (step 7), then decomposed that file into sub-services (steps 8a-8h). This was more pragmatic given the deep coupling between sections.

### Dead Code Removed

- `GenerationState` interface — planned but never adopted
- `SseEmitter` interface + `sse-emitter.ts` — created then removed
- `scene-prompt-builder.ts` — scene logic remained in `generation-loop.ts`

### Deduplications

- Two identical ~50-line lorebook injection blocks merged into one in `context-injector.ts`
- `CharInfoEntry` type consolidated to `types.ts` (was duplicated in two files)

## Out of Scope

- Refactoring `dry-run-route.ts` or `retry-agents-route.ts` — separate effort
- Adding new features — this was pure restructuring
- Tightening `any` types in context interfaces
- Further decomposing `generation-loop.ts` (still 2,215 lines)
- Extracting scene-specific prompt logic from `generation-loop.ts`

## Success Criteria

- [x] `generate.routes.ts` is under 200 lines (actual: 161)
- [x] All existing tests pass without modification (194 tests across 18 files)
- [x] TypeScript compiles with zero errors
- [x] `dry-run-route.ts` and `retry-agents-route.ts` still work
- [x] `helpers.ts` has 51 unit tests
- [x] No behavior changes — same SSE events, same message flow, same error handling
- [x] Clean dependency graph with no circular imports
- [x] `pnpm check` passes (lint + typecheck + build)

## Remaining Improvement Opportunities

1. **Decompose `generation-loop.ts`** (2,215 lines) — extract the ~490-line group chat + interval gating section
2. **Tighten `any` types** in context interfaces
3. **Per-service unit tests** for services beyond `helpers.ts`
4. **Extract agent context builder** (~450 lines in `generation-loop.ts`)
5. **Group `StreamingHandlerContext` fields** (58 fields) into sub-objects
