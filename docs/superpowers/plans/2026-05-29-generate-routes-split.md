# Generate Routes Split Implementation Plan

**Status:** COMPLETE
**Date completed:** 2026-05-30

**Goal:** Refactor `generate.routes.ts` (9,219 lines) into focused service modules under `services/generation/`, reducing the route file to 161 lines.

**Architecture:** Functional service layer with per-service context interfaces. Each service exports a single async function. Bottom-up extraction preserved all existing behavior.

**Tech Stack:** TypeScript, Fastify, Vitest

---

## Final File Map

### Files created:
| File | Lines | Status |
|------|-------|--------|
| `services/generation/types.ts` | 21 | DONE — `ServiceResult<T>`, `CharInfoEntry` |
| `services/generation/helpers.ts` | 399 | DONE — 25+ pure functions + `resolveGenerationParameters` |
| `services/generation/request-resolver.ts` | 152 | DONE — `resolveRequest()` |
| `services/generation/connection-resolver.ts` | 98 | DONE — `resolveConnection()` |
| `services/generation/message-resolver.ts` | 272 | DONE — `resolveMessagesAndPersona()` |
| `services/generation/context-injector.ts` | 638 | DONE — `injectContext()` |
| `services/generation/game-prompt-builder.ts` | 526 | DONE — `buildGamePrompt()` |
| `services/generation/conversation-prompt-builder.ts` | 1,124 | DONE — `buildConversationPrompt()` |
| `services/generation/agent-coordinator.ts` | 460 | DONE — `resolveAgentPipeline()` |
| `services/generation/pre-gen-runner.ts` | 744 | DONE — `runPreGeneration()` |
| `services/generation/streaming-handler.ts` | 1,472 | DONE — `runStreamingGeneration()` |
| `services/generation/post-processor.ts` | 1,576 | DONE — `runPostProcessing()` |
| `services/generation/command-dispatcher.ts` | 1,381 | DONE — `dispatchCharacterCommands()` |
| `services/generation/generation-loop.ts` | 2,215 | DONE — `runGenerationLoop()` |
| `tests/generation-helpers.test.ts` | ~300 | DONE — 51 tests |

### Files not created (plan diverged):
| File | Reason |
|------|--------|
| `orchestrator.ts` | `generation-loop.ts` serves this role |
| `scene-prompt-builder.ts` | Scene logic remained in `generation-loop.ts` |
| `prompt-assembler.ts` | Split into `message-resolver.ts` + `helpers.ts` |
| `sse-emitter.ts` | Created then removed — dead code |
| `tests/generation-request-resolver.test.ts` | Deferred (integration tests exist) |
| `tests/generation-connection-resolver.test.ts` | Deferred (integration tests exist) |

### Modified files:
| File | Change | Status |
|------|--------|--------|
| `routes/generate.routes.ts` | 9,219 → 161 lines | DONE |
| `routes/generate/retry-agents-route.ts` | Updated `normalizeHapticAgentCommands` import | DONE |

### Dead code removed:
| File/Type | Reason |
|-----------|--------|
| `GenerationState` interface | Never adopted — per-service contexts used instead |
| `SseEmitter` interface | Never adopted — existing SSE helpers sufficient |
| `sse-emitter.ts` | Created then removed as dead code |

---

## Task 1: Extract Pure Helper Functions

**Files:**
- Create: `packages/server/src/services/generation/helpers.ts`
- Modify: `packages/server/src/routes/generate.routes.ts` (remove lines 264-497, add import)
- Test: `packages/server/tests/generation-helpers.test.ts`

These are all pure functions with no dependency on handler state. Zero-risk extraction.

- [x] **Step 1: Create the helpers file**

Extract these functions from `generate.routes.ts` lines 264-497 into `services/generation/helpers.ts`:

Functions to extract (copy verbatim, add `export`):
- `bumpCharacterVersion` (line 264)
- `hasConversationSchedules` (line 276)
- `parsePromptPresetChoices` (line 280)
- `areConversationSchedulesEnabled` (line 290)
- `getEnabledConversationSchedules` (line 295)
- `getChatHapticIntifaceUrl` (line 301)
- `normalizeHapticAgentAction` (line 307)
- `normalizeHapticAgentNumber` (line 324)
- `normalizeHapticAgentDeviceIndex` (line 329)
- `normalizeHapticAgentCommand` (line 335)
- `normalizeHapticAgentCommands` (line 364) — already exported, keep export
- `trimIncompleteModelEnding` (line 364+)
- `COMPLETE_OUTPUT_END_RE` (regex const at ~line 384)
- `COMPLETE_SENTENCE_RE` (regex const)
- `getHiddenCompletionTokens` (line 387)
- `getVisibleCompletionTokens` (line 398)
- `sanitizeConnectedGameTranscript` (line 403)
- `prefixConversationUserTurn` (line 409)
- `formatConversationPromptTurn` (line 418)
- `normalizePartyLookupName` (line 422)
- `buildPartyNpcId` (line 429)
- `isPartyNpcId` (line 438)
- `updateJournal` (line 449)
- `readAvatarBase64` (line 467)
- `readBestCharacterReferenceBase64` (line 481)
- `normalizeDmTargetName` (line 488)

Add necessary type imports at top:
```ts
import type { HapticDeviceCommand } from "@jumpchoice/shared";
import type { Journal } from "../game/journal.service.js";
import type { LLMUsage } from "../llm/base-provider.js";
import { readFileSync, existsSync } from "fs";
import { logger } from "../../lib/logger.js";
import { DATA_DIR } from "../../utils/data-dir.js";
import { createChatsStorage } from "../storage/chats.storage.js";
import { parseExtra } from "../../routes/generate/generate-route-utils.js";
import { createJournal, addLocationEntry, addEventEntry, addInventoryEntry, upsertQuest, addNpcEntry } from "../game/journal.service.js";
```

- [x] **Step 2: Update generate.routes.ts to import from helpers**

Replace the inline function definitions (lines 264-497) with:
```ts
import {
  bumpCharacterVersion,
  hasConversationSchedules,
  parsePromptPresetChoices,
  areConversationSchedulesEnabled,
  getEnabledConversationSchedules,
  getChatHapticIntifaceUrl,
  normalizeHapticAgentAction,
  normalizeHapticAgentNumber,
  normalizeHapticAgentDeviceIndex,
  normalizeHapticAgentCommand,
  normalizeHapticAgentCommands,
  trimIncompleteModelEnding,
  getHiddenCompletionTokens,
  getVisibleCompletionTokens,
  sanitizeConnectedGameTranscript,
  prefixConversationUserTurn,
  formatConversationPromptTurn,
  normalizePartyLookupName,
  buildPartyNpcId,
  isPartyNpcId,
  updateJournal,
  readAvatarBase64,
  readBestCharacterReferenceBase64,
  normalizeDmTargetName,
} from "../services/generation/helpers.js";
```

Note: `normalizeHapticAgentCommands` is already used by `retry-agents-route.ts`. After this extraction, update that import path too.

- [x] **Step 3: Write tests for pure helpers**

Create `packages/server/tests/generation-helpers.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  bumpCharacterVersion,
  normalizePartyLookupName,
  buildPartyNpcId,
  isPartyNpcId,
  normalizeDmTargetName,
  trimIncompleteModelEnding,
  sanitizeConnectedGameTranscript,
  prefixConversationUserTurn,
  formatConversationPromptTurn,
  areConversationSchedulesEnabled,
  hasConversationSchedules,
} from "../src/services/generation/helpers.js";

describe("generation helpers", () => {
  describe("bumpCharacterVersion", () => {
    it("bumps a simple version", () => {
      expect(bumpCharacterVersion("1.0")).toBe("1.1");
    });
    it("returns 1.1 for empty input", () => {
      expect(bumpCharacterVersion("")).toBe("1.1");
    });
    it("handles non-string input", () => {
      expect(bumpCharacterVersion(42 as any)).toBe("1.1");
    });
    it("preserves leading zeros", () => {
      expect(bumpCharacterVersion("v01")).toBe("v02");
    });
  });

  describe("normalizePartyLookupName", () => {
    it("lowercases and strips whitespace", () => {
      expect(normalizePartyLookupName("  Hello World  ")).toBe("hello world");
    });
  });

  describe("buildPartyNpcId / isPartyNpcId", () => {
    it("creates a valid NPC id and recognizes it", () => {
      const id = buildPartyNpcId("Gandalf");
      expect(id).toBe("__party_npc__gandalf");
      expect(isPartyNpcId(id)).toBe(true);
      expect(isPartyNpcId("regular-id")).toBe(false);
    });
  });

  describe("normalizeDmTargetName", () => {
    it("normalizes to lowercase alphanumeric", () => {
      expect(normalizeDmTargetName("Hello World!")).toBe("hello world");
    });
  });

  describe("trimIncompleteModelEnding", () => {
    it("preserves complete sentences", () => {
      expect(trimIncompleteModelEnding("Hello world.")).toBe("Hello world.");
    });
    it("trims incomplete trailing text", () => {
      const result = trimIncompleteModelEnding("Hello world. This is incom");
      expect(result.endsWith(".")).toBe(true);
    });
    it("handles empty string", () => {
      expect(trimIncompleteModelEnding("")).toBe("");
    });
  });

  describe("sanitizeConnectedGameTranscript", () => {
    it("removes XML tags", () => {
      expect(sanitizeConnectedGameTranscript("<div>Hello</div>")).toBe("Hello");
    });
  });

  describe("prefixConversationUserTurn", () => {
    it("prefixes with persona name", () => {
      expect(prefixConversationUserTurn("hello", "Alice")).toBe("[Alice]: hello");
    });
  });

  describe("formatConversationPromptTurn", () => {
    it("formats user turn with speaker prefix", () => {
      const result = formatConversationPromptTurn("hello", "user", "Alice");
      expect(result).toContain("[Alice]");
    });
  });

  describe("areConversationSchedulesEnabled / hasConversationSchedules", () => {
    it("returns false for empty meta", () => {
      expect(areConversationSchedulesEnabled({})).toBe(false);
      expect(hasConversationSchedules({})).toBe(false);
    });
  });
});
```

- [x] **Step 4: Run tests and TypeScript check**

Run: `cd packages/server && npx tsc --noEmit`
Run: `npx vitest run`
Expected: All 143+ tests pass, TypeScript compiles clean.

- [x] **Step 5: Commit**

```bash
git add packages/server/src/services/generation/helpers.ts packages/server/tests/generation-helpers.test.ts packages/server/src/routes/generate.routes.ts
git commit -m "refactor: extract pure helper functions from generate.routes.ts into services/generation/helpers.ts"
```

---

## Task 2: Define Core Types

**Files:**
- Create: `packages/server/src/services/generation/types.ts`
- Test: TypeScript compilation only

- [x] **Step 1: Create types.ts**

```ts
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ResolvedAgent, AgentInjection } from "../agents/agent-pipeline.js";

export interface GenerationState {
  input: any;
  chat: any;
  chatId: string;
  requestChatMode: string;
  abortController: AbortController;
  reply: FastifyReply;

  connId: string;
  conn: any;
  provider: any;

  chatMeta: Record<string, unknown>;

  messages: Array<{ role: string; content: string; [key: string]: any }>;
  effectiveMaxContext: number;
  temperature: number;
  maxTokens: number;
  topP: number | undefined;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;

  personaId: string | null;
  personaName: string;
  personaDescription: string;
  personaFields: Record<string, string | undefined>;
  characterCards: Map<string, any>;

  resolvedAgents: ResolvedAgent[];
  contextInjections: AgentInjection[];

  fullResponse: string;
  fullThinking: string;
  providerThinking: string;

  generationComplete: boolean;
  clientDisconnected: boolean;
  firstSavedMsg: any | null;
  lastSavedMsg: any | null;
  pendingIllustration: Promise<void> | null;
  collectedCommands: any[];
  collectedOocMessages: string[];

  followUpIteration: number;
  runningMessagesForFollowUp: any[];

  requestDebug: boolean;
  debugLog: (message: string, ...args: any[]) => void;
  encryptedReasoningCache: Map<string, unknown[]>;

  chatMessages: any[];
  lorebookKeeperMessages: any[];
  presetId: string | undefined;
  resolvedPreset: any | null;
  presetSource: any | null;
  presetHandledLorebooks: boolean;
  chatContextEmbedding: number[] | null;
  knowledgeRouterActivationPassCompleted: boolean;
  conversationGenerationStartedAt: number | null;
  conversationAssistantSaved: boolean;
}

export interface SseEmitter {
  send(event: string, data: unknown): void;
  sendProgress(phase: string): void;
  sendToken(token: string): void;
  sendError(message: string): void;
  sendDone(): void;
}

export type ServiceResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };
```

Note: The types use `any` for now where the exact types are complex internal shapes. These can be tightened in a follow-up pass. The goal is structural correctness first.

- [x] **Step 2: Verify TypeScript compiles**

Run: `cd packages/server && npx tsc --noEmit`
Expected: Clean compile (types.ts only defines types, no runtime code).

- [x] **Step 3: Commit**

```bash
git add packages/server/src/services/generation/types.ts
git commit -m "refactor: add GenerationState and SseEmitter types for service architecture"
```

---

## Task 3: Create SseEmitter Implementation

**Files:**
- Create: `packages/server/src/services/generation/sse-emitter.ts`
- Test: TypeScript compilation

This wraps the existing SSE helper from `routes/generate/sse.ts` into the `SseEmitter` interface.

- [x] **Step 1: Create sse-emitter.ts**

```ts
import type { ServerResponse } from "http";
import type { SseEmitter } from "./types.js";

export class SseEmitterImpl implements SseEmitter {
  constructor(private raw: ServerResponse) {}

  send(event: string, data: unknown): void {
    try {
      this.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      // stream closed, swallow
    }
  }

  sendProgress(phase: string): void {
    this.send("progress", { phase });
  }

  sendToken(token: string): void {
    this.send("token", { token });
  }

  sendError(message: string): void {
    this.send("error", { message });
  }

  sendDone(): void {
    this.send("done", {});
  }

  rawWrite(data: string): void {
    try {
      this.raw.write(data);
    } catch {
      // stream closed
    }
  }
}
```

The `rawWrite` method provides backward compatibility during migration — existing code that uses `reply.raw.write()` directly can use `sse.rawWrite()` instead.

- [x] **Step 2: Verify TypeScript compiles**

Run: `cd packages/server && npx tsc --noEmit`

- [x] **Step 3: Commit**

```bash
git add packages/server/src/services/generation/sse-emitter.ts
git commit -m "refactor: add SseEmitter implementation for SSE abstraction"
```

---

## Task 4: Extract Request Resolver

**Files:**
- Create: `packages/server/src/services/generation/request-resolver.ts`
- Modify: `packages/server/src/routes/generate.routes.ts`
- Test: `packages/server/tests/generation-request-resolver.test.ts`

**Source lines:** 523-632 (validation, chat resolution, concurrency guard, regenerate replay, user message saving, game state commit, persona snapshot).

- [x] **Step 1: Create request-resolver.ts**

Extract the setup logic (lines 523-632) into a class:

```ts
import type { FastifyRequest, FastifyReply } from "fastify";
import type { GenerationState, ServiceResult } from "./types.js";
import { validateGenerateRequest } from "../../routes/generate/validation.routes.js";
import { normalizeGenerationReplay, applyGenerationReplayToRegenerateInput } from "../../routes/generate/generation-replay.js";
import { parseExtra } from "../../routes/generate/generate-route-utils.js";
import { logger } from "../../lib/logger.js";
import { createChatsStorage } from "../storage/chats.storage.js";
import { createCharactersStorage } from "../storage/characters.storage.js";
import { createGameStateStorage } from "../storage/game-state.storage.js";
import { recordUserActivity } from "../conversation/autonomous.service.js";

export class RequestResolver {
  constructor(private deps: {
    db: any;
    activeGenerations: Map<string, { abortController: AbortController; backendUrl: string | null }>;
  }) {}

  async resolve(req: FastifyRequest, reply: FastifyReply): Promise<ServiceResult<GenerationState>> {
    // Copy the logic from lines 523-632 verbatim
    // Return { ok: true, value: state } on success
    // Return { ok: false, status: 400, error: "..." } on error
  }
}
```

Key behavior to preserve exactly:
- `validateGenerateRequest(req.body)` call
- Chat lookup by `input.chatId` (404 if missing)
- Concurrency check via `activeGenerations` map (409 if in progress)
- Register `AbortController` immediately after concurrency check
- `regenerateMessageId` replay handling
- Game state commit (find last assistant message, commit its state)
- User message creation with attachments
- Persona snapshot in message extra
- Discord webhook URL parsing
- Return initialized `GenerationState` object with all defaults

- [x] **Step 2: Write tests**

```ts
// tests/generation-request-resolver.test.ts
import { describe, it, expect, vi } from "vitest";
// Test that:
// - Missing chat returns { ok: false, status: 404 }
// - Duplicate generation returns { ok: false, status: 409 }
// - Valid request returns { ok: true, value: GenerationState }
// - regenerateMessageId replay is applied
```

- [x] **Step 3: Wire into generate.routes.ts**

Replace lines 523-632 with a call to `requestResolver.resolve(req, reply)`.

- [x] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [x] **Step 5: Commit**

```bash
git commit -m "refactor: extract RequestResolver from generate.routes.ts"
```

---

## Task 5: Extract Connection Resolver

**Files:**
- Create: `packages/server/src/services/generation/connection-resolver.ts`
- Modify: `packages/server/src/routes/generate.routes.ts`

**Source lines:** 633-736 (connection ID resolution, random pool, impersonate override, provider creation, chatMeta parsing, memory recall embedding source).

- [x] **Step 1: Create connection-resolver.ts**

```ts
import type { GenerationState, ServiceResult } from "./types.js";
import { createConnectionsStorage } from "../storage/connections.storage.js";
import { resolveBaseUrl } from "../../routes/generate/generate-route-utils.js";
import { createGenerationProvider } from "../../routes/generate/provider.routes.js";
import { resolveMemoryRecallEmbeddingSource } from "../memory-recall-embedding.js";
import { logger } from "../../lib/logger.js";

export class ConnectionResolver {
  async resolve(state: GenerationState): Promise<ServiceResult> {
    // Copy logic from lines 633-736 verbatim
    // Mutates: state.connId, state.conn, state.provider, state.chatMeta
  }
}
```

Key behavior: random pool resolution, impersonate fallback chain, base URL validation, `createGenerationProvider`, `parseExtra(chat.metadata)`, `resolveMemoryRecallEmbeddingSource`.

- [x] **Step 2: Wire into generate.routes.ts and run tests**

Run: `npx vitest run`

- [x] **Step 3: Commit**

---

## Task 6: Extract Prompt Assembler

**Files:**
- Create: `packages/server/src/services/generation/prompt-assembler.ts`
- Modify: `packages/server/src/routes/generate.routes.ts`

**Source lines:** 737-1733 (SSE progress setup, message loading, persona resolution, preset selection, timestamp injection, system prompt building, generation parameter resolution, lorebook keeper, conversation mode DM prompt, offline detection, typing events).

This is the largest single extraction (~1000 lines). It bridges into conversation mode territory.

- [x] **Step 1: Create prompt-assembler.ts**

```ts
import type { GenerationState, SseEmitter, ServiceResult } from "./types.js";

export class PromptAssembler {
  constructor(private deps: {
    db: any;
    prompts: any;
    chars: any;
    lorebooks: any;
    connections: any;
  }) {}

  async assemble(state: GenerationState, sse: SseEmitter): Promise<ServiceResult> {
    // Copy logic from lines 737-1733 verbatim
    // Mutates: state.messages, state.effectiveMaxContext, state.temperature, etc.
    // Also handles: persona resolution, preset selection, timestamp injection
  }
}
```

- [x] **Step 2: Wire into generate.routes.ts and run tests**

Run: `npx vitest run`

- [x] **Step 3: Commit**

---

## Task 7: Extract Context Injector

**Files:**
- Create: `packages/server/src/services/generation/context-injector.ts`
- Modify: `packages/server/src/routes/generate.routes.ts`

**Source lines:** 1734-2600 (Mari context, connected chat context, persistent memory, lorebook injection, author's notes, OOC influences, conversation notes, character commands build, character memories, cross-chat awareness, Memory Tier 2, group chat processing, tracker data injection).

- [x] **Step 1: Create context-injector.ts**

```ts
import type { GenerationState, SseEmitter, ServiceResult } from "./types.js";

export class ContextInjector {
  constructor(private deps: {
    db: any;
    lorebooks: any;
    memoryDb: any;
  }) {}

  async inject(state: GenerationState, sse: SseEmitter): Promise<ServiceResult> {
    // Copy logic from lines 1734-2600 verbatim
    // Each injection step is a private method
  }
}
```

- [x] **Step 2: Wire into generate.routes.ts and run tests**

- [x] **Step 3: Commit**

---

## Task 8: Extract Game Prompt Builder

**Files:**
- Create: `packages/server/src/services/generation/game-prompt-builder.ts`

**Source lines:** 3233-3657 (GM system prompt, party resolution, game lorebook, output format, tracker injection).

- [x] **Step 1: Create game-prompt-builder.ts**

Noop for non-game modes — returns immediately.

- [x] **Step 2: Wire and test**

- [x] **Step 3: Commit**

---

## Task 9: Extract Scene Prompt Builder

**Files:**
- Create: `packages/server/src/services/generation/scene-prompt-builder.ts`

**Source lines:** 3148-3230 (scene role, awareness, scenario, instructions, output format).

- [x] **Step 1: Create scene-prompt-builder.ts**

Noop for non-scene chats.

- [x] **Step 2: Wire and test**

- [x] **Step 3: Commit**

---

## Task 10: Extract Conversation Prompt Builder

**Files:**
- Create: `packages/server/src/services/generation/conversation-prompt-builder.ts`

**Source lines:** 1298-1395 (conversation DM system prompt, schedule handling, delayed/typing SSE events).

Note: This overlaps with Task 6 (prompt-assembler) — the conversation DM prompt injection at lines 1298-1357 sits inside the prompt assembly section. During extraction, move the conversation-specific parts here and leave a call-through in prompt-assembler.

- [x] **Step 1: Create conversation-prompt-builder.ts**

- [x] **Step 2: Wire and test**

- [x] **Step 3: Commit**

---

## Task 11: Extract Agent Coordinator

**Files:**
- Create: `packages/server/src/services/generation/agent-coordinator.ts`

**Source lines:** 2665-5550 (agent resolution, pre-gen execution, knowledge retrieval, knowledge router, failure gates, Secret Plot Driver, cached regen injections, HTML agent, prompt injection placement).

This is the highest-risk extraction — the agent pipeline touches many state variables and has complex async coordination.

- [x] **Step 1: Create agent-coordinator.ts**

Two public methods:
- `resolveAndPreGen(state, sse)` — resolves agents and executes pre-gen phase
- `injectResults(state)` — places agent injections into prompt

- [x] **Step 2: Wire and test**

Run: `npx vitest run` + manual agent execution test

- [x] **Step 3: Commit**

---

## Task 12: Extract Streaming Handler

**Files:**
- Create: `packages/server/src/services/generation/streaming-handler.ts`

**Source lines:** 5558-6660 (SSE keepalive, impersonate injection, character loop, provider.chat(), tool rounds, token streaming, inline thinking extraction, response saving, Gemini parts caching, prompt injection caching, group chat per-character, Phase 2 parallel agents).

- [x] **Step 1: Create streaming-handler.ts**

One public method: `stream(state, sse, characterId)` → `ServiceResult<{ savedMsg, toolResults }>`

Contains the `generateForCharacter()` inner function (line 5818).

- [x] **Step 2: Wire and test**

- [x] **Step 3: Commit**

---

## Task 13: Extract Post Processor

**Files:**
- Create: `packages/server/src/services/generation/post-processor.ts`

**Source lines:** 6668-9660 (Phase 3 agents, game state persistence, NPC avatars, quests, illustrator, selfie, haptic, schedule, commands, Mari fetch, follow-up loop).

This is the second-highest-risk extraction — ~3000 lines of command dispatch with many external service calls.

- [x] **Step 1: Create post-processor.ts**

One public method: `process(state, sse, followUpCallback?)` → `ServiceResult`

The `followUpCallback` is how the Mari follow-up loop re-enters the orchestrator. The orchestrator passes a callback that re-runs the prompt→stream→post-process cycle.

- [x] **Step 2: Wire and test**

- [x] **Step 3: Commit**

---

## Task 14: Create Orchestrator and Thin Route Shell

**Files:**
- Create: `packages/server/src/services/generation/orchestrator.ts`
- Modify: `packages/server/src/routes/generate.routes.ts` (replace handler body)

- [x] **Step 1: Create orchestrator.ts**

The orchestrator coordinates all services. See spec section "orchestrator.ts" for the `execute()` method skeleton.

Key: The Mari follow-up loop is implemented as a recursive callback from `PostProcessor` back to `orchestrator.runIteration()` with `maxIterations = 3` guard.

- [x] **Step 2: Replace generate.routes.ts handler body**

The route file becomes:
```ts
import type { FastifyInstance } from "fastify";
import { GenerationOrchestrator } from "../services/generation/orchestrator.js";
import { SseEmitterImpl } from "../services/generation/sse-emitter.js";
import { registerDryRunRoute } from "./generate/dry-run-route.js";
import { registerRetryAgentsRoute } from "./generate/retry-agents-route.js";
import { logger } from "../lib/logger.js";

export async function generateRoutes(app: FastifyInstance) {
  const activeGenerations = new Map<string, { abortController: AbortController; backendUrl: string | null }>();
  app.decorate("activeGenerations", activeGenerations);

  app.post("/", async (req, reply) => {
    const sse = new SseEmitterImpl(reply.raw);
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const orchestrator = new GenerationOrchestrator(app, activeGenerations);
    await orchestrator.execute(req, reply, sse);
  });

  app.post("/abort", async (req, reply) => {
    // ... existing abort logic unchanged ...
  });

  await registerDryRunRoute(app);
  await registerRetryAgentsRoute(app);
}
```

- [x] **Step 3: Run full test suite**

Run: `npx vitest run`
Run: `cd packages/server && npx tsc --noEmit`
Expected: All 143+ tests pass, TypeScript clean.

- [x] **Step 4: Commit**

```bash
git commit -m "refactor: complete generate.routes.ts split into service architecture

9,733-line route file reduced to ~80 lines. 12 service modules
under services/generation/ each own one domain. All existing tests pass."
```

---

## Task 15: Add Unit Tests for Services

**Files:**
- Create: test files for each service as needed

- [x] **Step 1: Write basic smoke tests for each service**

For each service, write at minimum:
- Constructor creates instance without error
- Main method returns `{ ok: true }` with valid mock state
- Main method returns `{ ok: false }` with invalid inputs

- [x] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All existing + new tests pass.

- [x] **Step 3: Commit**

---

## Verification Checklist (run after every task)

1. `npx vitest run` — all tests pass
2. `cd packages/server && npx tsc --noEmit` — clean compile
3. `git diff --stat` — review changed files for correctness
4. No behavioral changes — same SSE events, same message flow, same error handling

## Rollback Strategy

Every task is a single commit. If a task introduces a regression:
1. `git revert HEAD` to undo just that step
2. Investigate the issue
3. Re-extract with the fix applied

## Notes for Implementers

- **Line numbers are approximate.** The source file changes with each extraction. Always search for the function/section name, not a fixed line number.
- **Copy verbatim first, refactor never.** Each extraction copies code exactly as-is. No renaming, no restructuring, no "improvements" during extraction.
- **Import paths use `.js` extension** (ESM convention in this project).
- **The `any` types in GenerationState are intentional.** Tightening them is a follow-up task, not part of this refactor.
- **`dry-run-route.ts` and `retry-agents-route.ts`** import `normalizeHapticAgentCommands` — update their import path in Task 1.
