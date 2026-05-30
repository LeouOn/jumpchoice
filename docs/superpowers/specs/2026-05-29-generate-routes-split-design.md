# Spec: Split `generate.routes.ts` into Clean Service Architecture

**Date:** 2026-05-29
**Status:** Ready for Review
**Scope:** `packages/server/src/routes/generate.routes.ts` (9,733 lines)

## Problem

`generate.routes.ts` contains a single 9,100-line async handler with:
- 40+ mutable variables shared across the handler scope
- A `while(true)` Mari follow-up loop spanning 8,660 lines
- 70+ SSE event emission points across 30+ event types
- 20+ prompt injection steps mutating a single `finalMessages` array
- ~30 distinct code sections reading/writing `chatMeta`

This makes it impossible to understand, test, or modify any single concern in isolation.

## Goal

Refactor into a service layer where each module owns one domain, has a clear API, and can be reasoned about independently. The route file becomes a thin orchestrator (~80 lines).

## Architecture

### Directory Structure

```
packages/server/src/
  routes/
    generate.routes.ts                          (~80 lines, thin orchestrator)
    generate/                                   (existing helpers, kept as-is)
      sse.ts
      validation.routes.ts
      dry-run-route.ts
      retry-agents-route.ts
      generate-route-utils.ts
      agent-connection-guards.ts
      agent-normalizers.ts
      agents.routes.ts
      expression-agent-utils.ts
      generation-replay.ts
      lorebook-keeper-utils.ts
      prompt-preset-selection.ts
      prompt.routes.ts
      provider.routes.ts
  services/
    generation/
      orchestrator.ts                           (~200 lines)
      request-resolver.ts                       (~250 lines)
      connection-resolver.ts                    (~150 lines)
      prompt-assembler.ts                       (~600 lines)
      context-injector.ts                       (~600 lines)
      game-prompt-builder.ts                    (~500 lines)
      scene-prompt-builder.ts                   (~200 lines)
      conversation-prompt-builder.ts            (~200 lines)
      agent-coordinator.ts                      (~500 lines)
      streaming-handler.ts                      (~500 lines)
      post-processor.ts                         (~700 lines)
      helpers.ts                                (~250 lines)
      types.ts                                  (~150 lines)
```

### Core Types (`services/generation/types.ts`)

All services communicate through typed interfaces. No service reaches into another service's internals.

```ts
// The per-request state object. Created once per POST / request.
// Services receive this (or subsets) as their input.

interface GenerationState {
  // ── Input (set once, immutable after setup) ──
  input: ValidatedGenerateRequest;
  chat: ChatRecord;
  chatId: string;
  requestChatMode: string;
  abortController: AbortController;
  reply: FastifyReply;

  // ── Connection (set by connection-resolver) ──
  connId: string;
  conn: ConnectionRecord;
  provider: LLMProvider;

  // ── Chat metadata (read by many, written by few) ──
  chatMeta: Record<string, unknown>;

  // ── Prompt state (mutated by injection pipeline) ──
  messages: PromptMessage[];
  effectiveMaxContext: number;
  temperature: number;
  maxTokens: number;
  topP: number | undefined;
  frequencyPenalty: number;
  presencePenalty: number;

  // ── Character / persona ──
  personaId: string | null;
  personaName: string;
  characterCards: Map<string, CharacterRecord>;

  // ── Agent pipeline ──
  resolvedAgents: ResolvedAgent[];
  contextInjections: AgentInjection[];

  // ── Streaming accumulator ──
  fullResponse: string;
  fullThinking: string;
  providerThinking: string;

  // ── Generation lifecycle ──
  generationComplete: boolean;
  clientDisconnected: boolean;
  firstSavedMsg: any | null;
  lastSavedMsg: any | null;
  pendingIllustration: Promise<void> | null;
  collectedCommands: CommandAccumulator[];
  collectedOocMessages: string[];

  // ── Iteration state (Mari follow-up loop) ──
  followUpIteration: number;
  runningMessagesForFollowUp: PromptMessage[];
}

// Thin wrapper for SSE events
interface SseEmitter {
  send(event: string, data: unknown): void;
  sendProgress(phase: string): void;
  sendToken(token: string): void;
  sendError(message: string): void;
  sendDone(): void;
}

// Service result — services return these instead of throwing for flow control
type ServiceResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };
```

### Service Contracts

Each service has a single `execute()` or domain-specific method. Services are stateless — they receive `GenerationState` (or a subset) and return a `ServiceResult`.

#### 1. `helpers.ts` — Pure Utility Functions (~250 lines)

**Source:** Lines 264-510 of `generate.routes.ts` (inline helper functions).

```
bumpCharacterVersion(value) → string
hasConversationSchedules(value) → boolean
parsePromptPresetChoices(value) → Record | null
areConversationSchedulesEnabled(meta) → boolean
getEnabledConversationSchedules(meta) → Record
getChatHapticIntifaceUrl(meta) → string | undefined
normalizeHapticAgentAction(action) → HapticDeviceCommand["action"] | null
normalizeHapticAgentNumber(value) → number | undefined
normalizeHapticAgentDeviceIndex(value) → HapticDeviceCommand["deviceIndex"]
normalizeHapticAgentCommand(command) → HapticDeviceCommand | null
normalizeHapticAgentCommands(data) → Array<Record<string, unknown>>
trimIncompleteModelEnding(content) → string
getHiddenCompletionTokens(usage) → number | undefined
getVisibleCompletionTokens(usage) → number | undefined
sanitizeConnectedGameTranscript(content) → string
prefixConversationUserTurn(content, personaName) → string
formatConversationPromptTurn(content, role, personaName) → string
normalizePartyLookupName(value) → string
buildPartyNpcId(name) → string
isPartyNpcId(id) → boolean
readAvatarBase64(avatarPath) → string | undefined
readBestCharacterReferenceBase64(...) → string | undefined
normalizeDmTargetName(value) → string
```

All pure functions. No `GenerationState` dependency. Zero risk extraction.

#### 2. `request-resolver.ts` — Setup & Validation (~250 lines)

**Source:** Lines 523-632 (validation, chat resolution, user message saving, game state commit).

```
class RequestResolver {
  constructor(deps: { db; chats; chars; gameStateStore })

  // Validates input, resolves chat, saves user message, commits game state.
  // Returns initialized GenerationState or error result.
  async resolve(req, reply): Promise<ServiceResult<GenerationState>>
}
```

Responsibilities:
- Validate request body via `validateGenerateRequest`
- Resolve chat by ID (404 if not found)
- Register abort controller in `activeGenerations` map
- Handle `regenerateMessageId` replay
- Commit previous game state (find last assistant message's state, commit it)
- Save user message with attachments and persona snapshot
- Initialize `GenerationState` with all fields set to their defaults
- Handle Discord webhook URL parsing

**Owns:** `GenerationState` creation and initialization.

#### 3. `connection-resolver.ts` — LLM Connection Resolution (~150 lines)

**Source:** Lines 633-736 (connection resolution, random pool, provider creation).

```
class ConnectionResolver {
  constructor(deps: { connections; sidecarModelService })

  // Resolves the LLM connection and creates the provider.
  // Mutates state.connId, state.conn, state.provider, state.chatMeta.
  async resolve(state: GenerationState): Promise<ServiceResult>
}
```

Responsibilities:
- Resolve connection ID (impersonate override, random pool, fallback)
- Validate connection exists and has a base URL
- Create LLM provider via `createGenerationProvider`
- Parse `chatMeta` from chat metadata
- Resolve memory recall embedding source

**Owns:** Connection resolution logic. Reads `state.input`, writes `state.connId`, `state.conn`, `state.provider`.

#### 4. `prompt-assembler.ts` — Message History & System Prompt (~600 lines)

**Source:** Lines 737-960 (message assembly, persona resolution, preset selection, timestamp injection, system prompt building, character commands, parameter resolution).

```
class PromptAssembler {
  constructor(deps: { prompts; chars; lorebooks; connections })

  // Builds the initial message array and system prompt.
  // Sets state.messages, state.effectiveMaxContext, state.temperature, etc.
  async assemble(state: GenerationState, sse: SseEmitter): Promise<ServiceResult>
}
```

Responsibilities:
- Load chat messages and apply regeneration filtering
- Resolve persona (per-chat or globally active)
- Resolve prompt preset (candidates + selection)
- Load lorebook keeper messages
- Inject timestamps (today's messages get `[HH:MM]`, older grouped by date)
- Build system prompt from preset or default
- Resolve generation parameters (temperature, maxTokens, topP, etc.) from preset/connection/chat overrides
- Compute `chatContextEmbedding` for lorebook/memory recall
- Handle conversation mode DM system prompt injection
- Handle offline character detection (all characters offline → send delayed event)

**Owns:** `state.messages` initialization, all generation parameters. Reads `state.chatMeta`, `state.conn`.

#### 5. `context-injector.ts` — Prompt Context Injection (~600 lines)

**Source:** Lines 953-2600 (lorebook, Mari, connected chat, memory, author's notes, OOC, conversation notes, memory recall, group chat instructions, narrative context).

```
class ContextInjector {
  constructor(deps: { lorebooks; memoryDb; memoryRecall })

  // Injects all context into state.messages.
  // Each injection step is a separate private method for testability.
  async inject(state: GenerationState, sse: SseEmitter): Promise<ServiceResult>
}
```

Responsibilities (each a separate private method):
- Inject Mari context (assistant knowledge + commands + fetched context)
- Inject connected chat context (linked RP/game details)
- Inject persistent memory from past-day summaries
- Inject lorebook entries (conversation mode, preset-less roleplay/VN)
- Inject author's notes
- Inject OOC influences from connected conversation
- Inject conversation notes (durable, persist until cleared)
- Inject character memories into awareness block
- Inject cross-chat awareness
- Inject Memory Tier 2 (filter archived messages, inject summaries)
- Inject group chat processing instructions
- Inject agent context building (tracker data, tool context)

**Owns:** Mutates `state.messages` via injection. Reads `state.chatMeta`, `state.chat`, `state.characterCards`.

#### 6. `game-prompt-builder.ts` — Game Mode GM Prompt (~500 lines)

**Source:** Lines 3233-3657 (GM system prompt, party resolution, game lorebook, output format, tracker injection).

```
class GamePromptBuilder {
  constructor(deps: { chars; maps; sprites; prompts; perception; morale })

  // Builds and injects the full GM system prompt for game mode.
  // Returns early (noop) for non-game modes.
  async build(state: GenerationState): Promise<ServiceResult>
}
```

Responsibilities:
- Build GM system prompt via `buildGmSystemPrompt` (GmPromptContext)
- Resolve GM character card (character-mode GM)
- Resolve party character cards (full detail for GM context)
- Resolve player persona card
- Determine scene model (separate bg/music/sfx/widgets)
- Process game-mode lorebook entries
- Inject output format + commands as last user message
- Inject tracker data (committed game state, player notes)

**Owns:** Game-mode-specific mutations to `state.messages`. Returns noop result for non-game modes.

#### 7. `scene-prompt-builder.ts` — Scene Context (~200 lines)

**Source:** Lines 3148-3230 (scene-specific context injection).

```
class ScenePromptBuilder {
  constructor(deps: { chars; prompts })

  // Injects scene-specific context (role, awareness, scenario, instructions, output format).
  async build(state: GenerationState): Promise<ServiceResult>
}
```

**Owns:** Scene-specific mutations to `state.messages`. Noop for non-scene chats.

#### 8. `conversation-prompt-builder.ts` — Conversation Mode (~200 lines)

**Source:** Lines 1298-1395 (conversation DM prompt, schedule handling, delayed typing events).

```
class ConversationPromptBuilder {
  constructor(deps: { chars; autonomous; spotify })

  // Handles conversation-mode-specific prompt injection and typing events.
  async build(state: GenerationState, sse: SseEmitter): Promise<ServiceResult>
}
```

Responsibilities:
- Inject built-in DM-style system prompt when no preset
- Handle schedule-based character availability
- Send offline/delayed/typing SSE events
- Handle conversation commands reminder

**Owns:** Conversation-mode prompt mutations and SSE timing events.

#### 9. `agent-coordinator.ts` — Agent Pipeline (~500 lines)

**Source:** Lines 2665-5550 (agent resolution, pre-gen execution, knowledge retrieval/routing, injection placement).

```
class AgentCoordinator {
  constructor(deps: { agents; tools; providerCache })

  // Resolves agents and executes pre-generation phase.
  async resolveAndPreGen(state: GenerationState, sse: SseEmitter): Promise<ServiceResult>

  // Inject agent results into the prompt at correct positions.
  injectResults(state: GenerationState): void
}
```

Responsibilities:
- Resolve enabled agents and build `ResolvedAgent[]`
- Handle per-agent connection overrides (resolveAgentConnectionId)
- Build agent context (with game state snapshots)
- Execute pre-generation agents (Phase 1)
- Execute knowledge retrieval agent
- Execute knowledge router agent
- Handle failure gates (critical vs non-critical)
- Handle Secret Plot Driver state persistence + injection
- Handle regeneration cached context replay
- Place agent injections at correct prompt positions

**Owns:** `state.resolvedAgents`, `state.contextInjections`. Mutates `state.messages` via injection.

#### 10. `streaming-handler.ts` — Token Streaming & Response Saving (~500 lines)

**Source:** Lines 5558-6660 (streaming loop, token handling, response saving, impersonate, game state patches, group chat per-character generation).

```
class StreamingHandler {
  constructor(deps: { chats; chars; agents; tools; discord })

  // Main generation loop. Streams tokens via SSE and saves the response.
  // Returns the saved message(s) and any tool results.
  async stream(
    state: GenerationState,
    sse: SseEmitter,
    characterId: string | null
  ): Promise<ServiceResult<{ savedMsg: any; toolResults: any[] }>>
}
```

Responsibilities:
- Start SSE keepalive interval
- Handle impersonate instruction injection
- Resolve characters to generate for (group chat modes)
- Call provider.chat() with onToken/onThinking callbacks
- Handle tool call rounds (max 5)
- Handle provider fallback (non-streaming → chunked streaming)
- Extract inline thinking blocks
- Strip commands/timestamps from response
- Trim incomplete model endings
- Save assistant message (or user message for impersonate)
- Store Gemini response parts for multi-turn continuity
- Cache prompt injections for regeneration replay
- Handle per-character generation in group chat individual mode
- Send game_state_patch events for tool-triggered updates
- Fire Phase 2 parallel agents alongside main generation

**Owns:** Token accumulation (`state.fullResponse`, `state.fullThinking`), message persistence, SSE token streaming.

#### 11. `post-processor.ts` — Post-Generation Processing (~700 lines)

**Source:** Lines 6668-9660 (Phase 3 agents, game state persistence, NPC avatars, quests, illustrator, selfie, haptic, schedule, commands, Mari fetch, follow-up loop).

```
class PostProcessor {
  constructor(deps: { db; chars; gameStateStore; imageGen; spotify; discord; maps; sprites })

  // Runs all post-generation processing: agents, commands, follow-up.
  async process(state: GenerationState, sse: SseEmitter): Promise<ServiceResult>
}
```

Responsibilities (each a separate private method):
- Execute Phase 3 post-processing agents
- Persist agent runs to DB + handle game state updates
- Process world-state agent results (date/time/weather/location/temperature)
- Process character-tracker agent results (NPC avatars, presence)
- Process persona-stats, custom-tracker, quest tracker agents
- Process rolling summary agent
- Process haptic agent commands
- Process illustrator agent (image generation)
- Process text-rewrite agent (segment edits)
- Execute collected character commands:
  - schedule_update
  - cross_post
  - selfie (image generation)
  - memory (create/recall)
  - influence (OOC injection)
  - note (conversation notes)
  - direct_message
  - scene (branch new chat)
  - haptic
  - spotify
  - create/update persona
  - create/update character
  - create/update lorebook
  - create chat
  - navigate
  - fetch (Mari)
- Handle Mari follow-up loop (re-run entire pipeline if `[fetch:]` succeeded)

**Owns:** All post-generation mutations, game state persistence, command execution.

#### 12. `orchestrator.ts` — Lifecycle Coordinator (~200 lines)

```
class GenerationOrchestrator {
  private state: GenerationState;
  private sse: SseEmitter;

  constructor(
    private deps: {
      requestResolver: RequestResolver;
      connectionResolver: ConnectionResolver;
      promptAssembler: PromptAssembler;
      contextInjector: ContextInjector;
      gamePromptBuilder: GamePromptBuilder;
      scenePromptBuilder: ScenePromptBuilder;
      conversationPromptBuilder: ConversationPromptBuilder;
      agentCoordinator: AgentCoordinator;
      streamingHandler: StreamingHandler;
      postProcessor: PostProcessor;
    },
    private app: FastifyInstance,
    private req: FastifyRequest,
    private reply: FastifyReply,
  ) {}

  async execute(): Promise<void> {
    // 1. Setup SSE
    this.sse = startSseReply(this.reply);

    try {
      // 2. Resolve request + validate
      const setupResult = await this.deps.requestResolver.resolve(this.req, this.reply);
      if (!setupResult.ok) return this.reply.status(setupResult.status).send({ error: setupResult.error });
      this.state = setupResult.value;

      // 3. Resolve connection
      const connResult = await this.deps.connectionResolver.resolve(this.state);
      if (!connResult.ok) return this.reply.status(connResult.status).send({ error: connResult.error });

      // 4. Build prompt
      const promptResult = await this.deps.promptAssembler.assemble(this.state, this.sse);
      if (!promptResult.ok) return this.sse.sendError(promptResult.error);

      // 5. Inject context (lorebook, memory, Mari, etc.)
      const injectResult = await this.deps.contextInjector.inject(this.state, this.sse);
      if (!injectResult.ok) return this.sse.sendError(injectResult.error);

      // 6. Mode-specific prompt building
      await this.deps.gamePromptBuilder.build(this.state);
      await this.deps.scenePromptBuilder.build(this.state);
      await this.deps.conversationPromptBuilder.build(this.state, this.sse);

      // 7. Resolve agents + execute pre-gen
      const agentResult = await this.deps.agentCoordinator.resolveAndPreGen(this.state, this.sse);
      if (!agentResult.ok) return this.sse.sendError(agentResult.error);
      this.deps.agentCoordinator.injectResults(this.state);

      // 8. Stream generation
      const streamResult = await this.deps.streamingHandler.stream(this.state, this.sse, null);
      if (!streamResult.ok) return this.sse.sendError(streamResult.error);

      // 9. Post-process
      await this.deps.postProcessor.process(this.state, this.sse);

      // 10. Done
      this.sse.sendDone();
    } catch (err) {
      if (!this.state?.clientDisconnected && !this.reply.raw.destroyed) {
        this.sse.sendError(err instanceof Error ? err.message : "Generation failed");
      }
    } finally {
      // Cleanup: remove from activeGenerations, end SSE stream
    }
  }
}
```

### Route File After Refactor (`generate.routes.ts`, ~80 lines)

```ts
import type { FastifyInstance } from "fastify";
import { GenerationOrchestrator } from "../services/generation/orchestrator.js";
// ... dependency imports

export async function generateRoutes(app: FastifyInstance) {
  const deps = createServiceDependencies(app);

  app.post("/", async (req, reply) => {
    const orchestrator = new GenerationOrchestrator(deps, app, req, reply);
    await orchestrator.execute();
  });

  const activeGenerations = new Map<string, { abortController: AbortController; backendUrl: string | null }>();
  app.decorate("activeGenerations", activeGenerations);

  app.post("/abort", async (req, reply) => { /* unchanged */ });

  await registerDryRunRoute(app);
  await registerRetryAgentsRoute(app);
}
```

## SseEmitter Abstraction

The current code has two paths for SSE:
1. Direct `reply.raw.write()` — ~45 call sites, unchecked
2. `trySendSseEvent()` / `sendSseEvent()` — ~25 call sites, error-caught

The new `SseEmitter` interface unifies both:

```ts
class SseEmitterImpl implements SseEmitter {
  constructor(private raw: ServerResponse) {}

  send(event: string, data: unknown): void {
    try {
      this.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch { /* stream closed, swallow */ }
  }

  sendProgress(phase: string): void { this.send("progress", { phase }); }
  sendToken(token: string): void { this.send("token", { token }); }
  sendError(message: string): void { this.send("error", { message }); }
  sendDone(): void { this.send("done", {}); }
}
```

This replaces the 70+ raw `.write()` calls with typed, safe methods.

## Migration Strategy

### Bottom-Up Extraction Order

Each step produces a working codebase with all 143 tests still passing:

| Step | Extract | Risk | Verification |
|------|---------|------|-------------|
| 1 | `helpers.ts` — pure functions (lines 264-510) | Zero | Tests pass |
| 2 | `types.ts` — GenerationState interface + SseEmitter | Zero | TypeScript compiles |
| 3 | `request-resolver.ts` — setup & validation (lines 523-632) | Low | Tests pass, manual chat test |
| 4 | `connection-resolver.ts` — connection resolution (lines 633-736) | Low | Tests pass, manual chat test |
| 5 | `prompt-assembler.ts` — message history + system prompt (lines 737-1733) | Medium | Tests pass, manual generation test |
| 6 | `context-injector.ts` — all context injection (lines 1734-2600) | Medium | Tests pass, lorebook/memory injection test |
| 7 | `game-prompt-builder.ts` — game mode GM prompt (lines 3233-3657) | Medium | Tests pass, game mode test |
| 8 | `scene-prompt-builder.ts` — scene context (lines 3148-3230) | Low | Tests pass |
| 9 | `conversation-prompt-builder.ts` — conversation mode (lines 1298-1395) | Low | Tests pass, conversation mode test |
| 10 | `agent-coordinator.ts` — agent pipeline (lines 2665-5550) | High | Tests pass, agent execution test |
| 11 | `streaming-handler.ts` — token streaming (lines 5558-6660) | High | Tests pass, streaming + group chat test |
| 12 | `post-processor.ts` — post-generation (lines 6668-9660) | High | Tests pass, full pipeline test |
| 13 | `orchestrator.ts` — wire everything together | High | Tests pass, full E2E test |
| 14 | Update `generate.routes.ts` to thin shell | High | All tests pass |
| 15 | Add unit tests for each service | Low | New tests pass |

### Regression Safety

- **No behavior changes.** Every `if`, every `await`, every `reply.raw.write()` call is preserved exactly.
- **Existing tests unchanged.** The 143 existing tests should pass at every step.
- **Manual smoke tests** at each medium/high-risk step: send a message, verify streaming works.
- **`dry-run-route.ts` and `retry-agents-route.ts`** (already extracted, ~168KB combined) must continue working — they share helpers and types.

## Out of Scope

- Refactoring `dry-run-route.ts` (76KB) or `retry-agents-route.ts` (92KB) — separate effort
- Adding new features — this is pure restructuring
- Changing SSE event format or adding new events
- Refactoring the agent pipeline service (`services/agents/agent-pipeline.ts`) itself
- Changing how `activeGenerations` is tracked (kept as-is in route file)
- Memory system changes (only moving code, not modifying behavior)

## Open Questions

1. **Service instantiation:** Services are created once per `generateRoutes()` call (shared across requests). They're stateless — they receive `GenerationState` per request and never store request-scoped data as instance state.
2. **Mari follow-up loop:** The `while(true)` loop currently re-runs most of the pipeline. In the new architecture, `PostProcessor.process()` calls back into the orchestrator for follow-up iterations via a callback. The orchestrator enforces `maxIterations: 3` as an explicit guard against infinite recursion.

## Success Criteria

- [ ] `generate.routes.ts` is under 100 lines
- [ ] No file in `services/generation/` exceeds 800 lines
- [ ] All 143 existing tests pass without modification
- [ ] TypeScript compiles with zero errors
- [ ] `dry-run-route.ts` and `retry-agents-route.ts` still work
- [ ] Each service has at least basic unit tests
- [ ] No behavior changes — same SSE events, same message flow, same error handling
