# Memory System (Phase 2A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 3-tier memory system that auto-summarizes old messages, filters archived messages from the prompt, and retrieves relevant past context via vector search.

**Architecture:** Minimal enhancement to the existing memory system. Add `memory_summaries` table for Tier 2 (LLM-summarized batches), `MemorySummarizer` service for background summarization, and `MemoryInterceptor` service for filtering messages and injecting summaries. Tier 3 (vector search) already exists.

**Tech Stack:** TypeScript, SQLite (Drizzle ORM), Vitest, existing LLM provider infrastructure

**Spec:** `docs/superpowers/specs/2026-05-24-memory-system-design.md`

---

## File Structure

### New Files

- `packages/server/src/services/memory/memory-summarizer.ts` — Background LLM summarization of old message batches
- `packages/server/src/services/memory/memory-interceptor.ts` — Message filtering and memory context assembly
- `packages/server/tests/memory-summarizer.test.ts` — Summarizer unit tests
- `packages/server/tests/memory-interceptor.test.ts` — Interceptor unit tests
- `packages/server/tests/memory-integration.test.ts` — End-to-end integration tests

### Modified Files

- `packages/server/src/db/schema/chats.ts` — Add `memorySummaries` table
- `packages/server/src/db/schema/index.ts` — Export `memorySummaries`
- `packages/server/src/db/migrate.ts` — Add migration for `memory_summaries` table and index
- `packages/server/src/db/file-backed-store.ts` — Register `memory_summaries` as file-backed table
- `packages/server/src/routes/generate.routes.ts` — Integration points (interceptor + summarizer)
- `packages/server/src/routes/admin.routes.ts` — Add `memory_summaries` to admin reset

---

## Task 1: Database Schema & Migration

**Files:**
- Modify: `packages/server/src/db/schema/chats.ts`
- Modify: `packages/server/src/db/schema/index.ts`
- Modify: `packages/server/src/db/migrate.ts`
- Modify: `packages/server/src/db/file-backed-store.ts`
- Modify: `packages/server/src/routes/admin.routes.ts`

- [ ] **Step 1: Add `memorySummaries` table to chats.ts**

Append after the `memoryChunks` table definition in `packages/server/src/db/schema/chats.ts`:

```typescript
export const memorySummaries = sqliteTable("memory_summaries", {
  id: text("id").primaryKey(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  messageCount: integer("message_count").notNull(),
  firstMessageId: text("first_message_id").notNull(),
  lastMessageId: text("last_message_id").notNull(),
  firstMessageAt: text("first_message_at").notNull(),
  lastMessageAt: text("last_message_at").notNull(),
  tokenEstimate: integer("token_estimate").notNull(),
  createdAt: text("created_at").notNull(),
});
```

- [ ] **Step 2: Export `memorySummaries` from schema index**

In `packages/server/src/db/schema/index.ts`, the `export * from "./chats.js"` already covers this — no change needed. Verify the table is accessible via `import { memorySummaries } from "../db/schema/index.js"`.

- [ ] **Step 3: Add migration for `memory_summaries` table**

In `packages/server/src/db/migrate.ts`, add to the `CREATE_TABLES` array (after the `memory_chunks` entry):

```typescript
  `CREATE TABLE IF NOT EXISTS memory_summaries (
    id TEXT PRIMARY KEY NOT NULL,
    chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    message_count INTEGER NOT NULL,
    first_message_id TEXT NOT NULL,
    last_message_id TEXT NOT NULL,
    first_message_at TEXT NOT NULL,
    last_message_at TEXT NOT NULL,
    token_estimate INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )`,
```

Add to the index creation section at the end of `runMigrations`:

```typescript
  await db.run(
    sql.raw(`CREATE INDEX IF NOT EXISTS idx_memory_summaries_chat ON memory_summaries(chat_id, last_message_at DESC)`),
  );
```

- [ ] **Step 4: Register `memory_summaries` as file-backed table**

In `packages/server/src/db/file-backed-store.ts`, add `"memory_summaries"` to the `FILE_BACKED_TABLES` array (after `"memory_chunks"`), and add the parent-child relationship:

```typescript
{ parent: "chats", child: "memory_summaries", parentKey: "id", childKey: "chatId" },
```

- [ ] **Step 5: Add `memory_summaries` to admin reset**

In `packages/server/src/routes/admin.routes.ts`, find the existing `memory_chunks` delete line and add `memory_summaries` right before it:

```typescript
await runDelete("memory_summaries", () => db.delete(schema.memorySummaries).run());
```

- [ ] **Step 6: Verify build compiles**

```bash
cd packages/server && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add memory_summaries table and migration"
```

---

## Task 2: MemorySummarizer Service

**Files:**
- Create: `packages/server/src/services/memory/memory-summarizer.ts`
- Create: `packages/server/tests/memory-summarizer.test.ts`

- [ ] **Step 1: Write failing tests for MemorySummarizer**

Create `packages/server/tests/memory-summarizer.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { summarizeOldestBatch, estimateMessageTokens, TIER2_THRESHOLD_TOKENS, MIN_MESSAGES_FOR_SUMMARY, MAX_BATCH_MESSAGES, MAX_BATCH_SOURCE_TOKENS } from "../src/services/memory/memory-summarizer.js";

function makeMessage(id: string, role: string, content: string, createdAt?: string) {
  return {
    id,
    role: role as "user" | "assistant" | "system" | "narrator",
    content,
    characterId: null as string | null,
    createdAt: createdAt ?? new Date(Date.now() + parseInt(id, 36)).toISOString(),
  };
}

function makeMessages(count: number, tokensPerMsg: number = 200): ReturnType<typeof makeMessage>[] {
  return Array.from({ length: count }, (_, i) =>
    makeMessage(`msg_${i}`, i % 2 === 0 ? "user" : "assistant", "x".repeat(tokensPerMsg * 4))
  );
}

describe("MemorySummarizer", () => {
  describe("estimateMessageTokens", () => {
    it("should estimate tokens as chars/4", () => {
      expect(estimateMessageTokens("Hello world")).toBe(3);
      expect(estimateMessageTokens("")).toBe(0);
      expect(estimateMessageTokens("a")).toBe(1);
    });
  });

  describe("summarizeOldestBatch", () => {
    it("should return null when total tokens below threshold", async () => {
      const messages = makeMessages(5, 100);
      const mockProvider = { chatComplete: vi.fn() };
      const result = await summarizeOldestBatch({
        messages,
        nameMap: { userName: "User", characterNames: {} },
        provider: mockProvider as any,
        model: "test-model",
      });
      expect(result).toBeNull();
      expect(mockProvider.chatComplete).not.toHaveBeenCalled();
    });

    it("should return null when message count below minimum", async () => {
      const messages = makeMessages(5, 6000);
      const mockProvider = { chatComplete: vi.fn() };
      const result = await summarizeOldestBatch({
        messages,
        nameMap: { userName: "User", characterNames: {} },
        provider: mockProvider as any,
        model: "test-model",
      });
      expect(result).toBeNull();
    });

    it("should summarize oldest batch when above threshold", async () => {
      const messages = makeMessages(20, 1200);
      const mockProvider = {
        chatComplete: vi.fn().mockResolvedValue({
          content: "Alice and Bob discussed their plans for the journey.",
        }),
      };
      const result = await summarizeOldestBatch({
        messages,
        nameMap: { userName: "Alice", characterNames: { char1: "Bob" } },
        provider: mockProvider as any,
        model: "test-model",
      });
      expect(result).not.toBeNull();
      expect(result!.summary).toBe("Alice and Bob discussed their plans for the journey.");
      expect(result!.messageCount).toBeGreaterThanOrEqual(10);
      expect(result!.messageCount).toBeLessThanOrEqual(15);
      expect(result!.tokenEstimate).toBeGreaterThan(0);
      expect(mockProvider.chatComplete).toHaveBeenCalledOnce();
    });

    it("should format messages with character names", async () => {
      const messages = makeMessages(15, 1200);
      const mockProvider = {
        chatComplete: vi.fn().mockResolvedValue({ content: "Summary text" }),
      };
      await summarizeOldestBatch({
        messages,
        nameMap: { userName: "Alice", characterNames: {} },
        provider: mockProvider as any,
        model: "test-model",
      });
      const call = mockProvider.chatComplete.mock.calls[0][0] as any;
      const systemMsg = call.messages.find((m: any) => m.role === "user");
      expect(systemMsg.content).toContain("Alice:");
    });

    it("should limit batch to MAX_BATCH_SOURCE_TOKENS", async () => {
      const messages = makeMessages(30, 800);
      const mockProvider = {
        chatComplete: vi.fn().mockResolvedValue({ content: "Summary" }),
      };
      const result = await summarizeOldestBatch({
        messages,
        nameMap: { userName: "User", characterNames: {} },
        provider: mockProvider as any,
        model: "test-model",
      });
      expect(result).not.toBeNull();
      expect(result!.messageCount).toBeLessThanOrEqual(15);
    });

    it("should return null when LLM returns empty content", async () => {
      const messages = makeMessages(20, 1200);
      const mockProvider = {
        chatComplete: vi.fn().mockResolvedValue({ content: "" }),
      };
      const result = await summarizeOldestBatch({
        messages,
        nameMap: { userName: "User", characterNames: {} },
        provider: mockProvider as any,
        model: "test-model",
      });
      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run packages/server/tests/memory-summarizer.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement MemorySummarizer**

Create `packages/server/src/services/memory/memory-summarizer.ts`:

```typescript
import type { ChatMessage } from "../llm/base-provider.js";
import { logger } from "../../lib/logger.js";

export const TIER2_THRESHOLD_TOKENS = 16000;
export const MIN_MESSAGES_FOR_SUMMARY = 10;
export const MAX_BATCH_MESSAGES = 15;
export const MAX_BATCH_SOURCE_TOKENS = 5000;

const SUMMARIZATION_SYSTEM_PROMPT = `You are a conversation summarizer. Produce concise, factual summaries that preserve narrative continuity.`;

const SUMMARIZATION_USER_TEMPLATE = `Summarize the following conversation excerpt in 2-4 paragraphs. Preserve:
- Key events, decisions, and their outcomes
- Character motivations and emotional states
- Important details (names, locations, items, relationships)
- Unresolved plot threads or open questions

Do NOT include:
- Greetings, pleasantries, or small talk
- Verbatim dialogue (paraphrase instead)
- Meta-commentary or OOC remarks

Conversation:
---
{messages}
---`;

export interface SummarizerMessage {
  id: string;
  role: "user" | "assistant" | "system" | "narrator";
  content: string;
  characterId?: string | null;
  createdAt: string;
}

export interface SummarizerInput {
  messages: SummarizerMessage[];
  nameMap: { userName: string; characterNames: Record<string, string> };
  provider: { chatComplete: (messages: ChatMessage[], options: any) => Promise<{ content: string }> };
  model: string;
}

export interface SummarizerResult {
  summary: string;
  messageCount: number;
  firstMessageId: string;
  lastMessageId: string;
  firstMessageAt: string;
  lastMessageAt: string;
  tokenEstimate: number;
}

export function estimateMessageTokens(content: string): number {
  const trimmed = content.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

function formatMessagesForSummary(
  messages: SummarizerMessage[],
  nameMap: { userName: string; characterNames: Record<string, string> },
): string {
  return messages
    .map((m) => {
      const name =
        m.role === "user"
          ? nameMap.userName
          : m.role === "narrator" || m.role === "system"
            ? "Narrator"
            : ((m.characterId && nameMap.characterNames[m.characterId]) ?? "Character");
      return `${name}: ${m.content}`;
    })
    .join("\n\n");
}

export async function summarizeOldestBatch(input: SummarizerInput): Promise<SummarizerResult | null> {
  const { messages, nameMap, provider, model } = input;

  const totalTokens = messages.reduce((sum, m) => sum + estimateMessageTokens(m.content), 0);
  if (totalTokens <= TIER2_THRESHOLD_TOKENS) return null;
  if (messages.length < MIN_MESSAGES_FOR_SUMMARY) return null;

  let batchEnd = 0;
  let batchTokens = 0;
  for (let i = 0; i < messages.length && i < MAX_BATCH_MESSAGES; i++) {
    const msgTokens = estimateMessageTokens(messages[i]!.content);
    if (batchTokens + msgTokens > MAX_BATCH_SOURCE_TOKENS && i >= MIN_MESSAGES_FOR_SUMMARY) break;
    batchTokens += msgTokens;
    batchEnd = i + 1;
  }
  if (batchEnd < MIN_MESSAGES_FOR_SUMMARY) {
    batchEnd = Math.min(messages.length, MAX_BATCH_MESSAGES);
  }

  const batch = messages.slice(0, batchEnd);
  const formatted = formatMessagesForSummary(batch, nameMap);
  const userPrompt = SUMMARIZATION_USER_TEMPLATE.replace("{messages}", formatted);

  try {
    const result = await provider.chatComplete(
      [
        { role: "system", content: SUMMARIZATION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { model, maxTokens: 1024 },
    );

    if (!result.content?.trim()) return null;

    logger.debug(
      "[memory-summarizer] Summarized %d messages (%d tokens → %d chars)",
      batch.length,
      batchTokens,
      result.content.length,
    );

    return {
      summary: result.content.trim(),
      messageCount: batch.length,
      firstMessageId: batch[0]!.id,
      lastMessageId: batch[batch.length - 1]!.id,
      firstMessageAt: batch[0]!.createdAt,
      lastMessageAt: batch[batch.length - 1]!.createdAt,
      tokenEstimate: batchTokens,
    };
  } catch (err) {
    logger.error(err, "[memory-summarizer] LLM summarization failed");
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run packages/server/tests/memory-summarizer.test.ts
```

Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement MemorySummarizer service with tests"
```

---

## Task 3: MemoryInterceptor Service

**Files:**
- Create: `packages/server/src/services/memory/memory-interceptor.ts`
- Create: `packages/server/tests/memory-interceptor.test.ts`

- [ ] **Step 1: Write failing tests for MemoryInterceptor**

Create `packages/server/tests/memory-interceptor.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { filterAndAssembleMemoryContext, buildMemoryBlock, SUMMARY_TOKEN_BUDGET_SHARE, MAX_SUMMARY_TOKENS } from "../src/services/memory/memory-interceptor.js";

function makeMsg(id: string, role: string, content: string, createdAt: string) {
  return { id, role: role as any, content, createdAt };
}

function makeSummary(summary: string, firstAt: string, lastAt: string) {
  return { summary, firstMessageAt: firstAt, lastMessageAt: lastAt };
}

const fixedDate = "2026-05-24T12:00:00.000Z";
const earlierDate = "2026-05-24T06:00:00.000Z";
const laterDate = "2026-05-24T18:00:00.000Z";

describe("MemoryInterceptor", () => {
  describe("filterAndAssembleMemoryContext", () => {
    it("should return all messages when no watermark", async () => {
      const messages = [
        makeMsg("m1", "user", "Hello", earlierDate),
        makeMsg("m2", "assistant", "Hi", laterDate),
      ];
      const result = await filterAndAssembleMemoryContext({
        messages,
        metadata: {},
        loadSummaries: async () => [],
        maxContextTokens: 8000,
      });
      expect(result.workingMessages).toHaveLength(2);
      expect(result.memoryBlock).toBeNull();
      expect(result.stats.archivedCount).toBe(0);
    });

    it("should split messages by watermark timestamp", async () => {
      const messages = [
        makeMsg("m1", "user", "Old message 1", "2026-05-24T05:00:00.000Z"),
        makeMsg("m2", "assistant", "Old reply 1", "2026-05-24T06:00:00.000Z"),
        makeMsg("m3", "user", "New message", "2026-05-24T13:00:00.000Z"),
        makeMsg("m4", "assistant", "New reply", "2026-05-24T14:00:00.000Z"),
      ];
      const result = await filterAndAssembleMemoryContext({
        messages,
        metadata: { lastSummarizedAt: "2026-05-24T12:00:00.000Z" },
        loadSummaries: async () => [],
        maxContextTokens: 8000,
      });
      expect(result.workingMessages).toHaveLength(2);
      expect(result.stats.archivedCount).toBe(2);
      expect(result.workingMessages[0].id).toBe("m3");
    });

    it("should load and include summaries", async () => {
      const messages = [
        makeMsg("m1", "user", "Old", "2026-05-24T05:00:00.000Z"),
        makeMsg("m2", "user", "New", "2026-05-24T13:00:00.000Z"),
      ];
      const summaries = [makeSummary("Alice met Bob at the tavern.", "2026-05-24T04:00:00.000Z", "2026-05-24T06:00:00.000Z")];
      const result = await filterAndAssembleMemoryContext({
        messages,
        metadata: { lastSummarizedAt: "2026-05-24T12:00:00.000Z" },
        loadSummaries: async () => summaries,
        maxContextTokens: 8000,
      });
      expect(result.summaries).toHaveLength(1);
      expect(result.memoryBlock).not.toBeNull();
      expect(result.memoryBlock).toContain("Alice met Bob at the tavern.");
      expect(result.memoryBlock).toContain("<past_context>");
    });

    it("should skip when memoryTier2Enabled is false", async () => {
      const messages = [
        makeMsg("m1", "user", "Old", "2026-05-24T05:00:00.000Z"),
        makeMsg("m2", "user", "New", "2026-05-24T13:00:00.000Z"),
      ];
      const result = await filterAndAssembleMemoryContext({
        messages,
        metadata: { lastSummarizedAt: "2026-05-24T12:00:00.000Z", memoryTier2Enabled: false },
        loadSummaries: async () => [],
        maxContextTokens: 8000,
      });
      expect(result.workingMessages).toHaveLength(2);
      expect(result.memoryBlock).toBeNull();
    });

    it("should handle empty messages array", async () => {
      const result = await filterAndAssembleMemoryContext({
        messages: [],
        metadata: { lastSummarizedAt: "2026-05-24T12:00:00.000Z" },
        loadSummaries: async () => [],
        maxContextTokens: 8000,
      });
      expect(result.workingMessages).toHaveLength(0);
      expect(result.stats.archivedCount).toBe(0);
    });

    it("should handle invalid watermark timestamp gracefully", async () => {
      const messages = [makeMsg("m1", "user", "Test", fixedDate)];
      const result = await filterAndAssembleMemoryContext({
        messages,
        metadata: { lastSummarizedAt: "not-a-date" },
        loadSummaries: async () => [],
        maxContextTokens: 8000,
      });
      expect(result.workingMessages).toHaveLength(1);
    });
  });

  describe("buildMemoryBlock", () => {
    it("should wrap summaries in past_context XML", () => {
      const summaries = [
        makeSummary("First summary text", "2026-05-24T04:00:00.000Z", "2026-05-24T06:00:00.000Z"),
        makeSummary("Second summary text", "2026-05-24T06:00:00.000Z", "2026-05-24T08:00:00.000Z"),
      ];
      const block = buildMemoryBlock(summaries, 4096);
      expect(block).toContain("<past_context>");
      expect(block).toContain("</past_context>");
      expect(block).toContain("First summary text");
      expect(block).toContain("Second summary text");
      expect(block).toContain("--- Summary 1 (earliest) ---");
      expect(block).toContain("--- Summary 2 ---");
    });

    it("should truncate individual summaries exceeding budget", () => {
      const longSummary = "x".repeat(10000);
      const summaries = [makeSummary(longSummary, earlierDate, fixedDate)];
      const block = buildMemoryBlock(summaries, 200);
      expect(block!.length).toBeLessThan(longSummary.length);
      expect(block).toContain("...[truncated]...");
    });

    it("should return null for empty summaries", () => {
      const block = buildMemoryBlock([], 4096);
      expect(block).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run packages/server/tests/memory-interceptor.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement MemoryInterceptor**

Create `packages/server/src/services/memory/memory-interceptor.ts`:

```typescript
import { logger } from "../../lib/logger.js";

export const SUMMARY_TOKEN_BUDGET_SHARE = 0.1;
export const MIN_SUMMARY_TOKEN_BUDGET = 256;
export const MAX_SUMMARY_TOKENS = 512;

export interface InterceptorMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface SummaryEntry {
  summary: string;
  firstMessageAt: string;
  lastMessageAt: string;
}

export interface InterceptorInput {
  messages: InterceptorMessage[];
  metadata: Record<string, unknown>;
  loadSummaries: (chatId?: string) => Promise<SummaryEntry[]>;
  chatId?: string;
  maxContextTokens?: number;
}

export interface InterceptorResult {
  workingMessages: InterceptorMessage[];
  summaries: SummaryEntry[];
  memoryBlock: string | null;
  stats: {
    totalMessages: number;
    workingCount: number;
    archivedCount: number;
    summaryCount: number;
    estimatedTokensSaved: number;
  };
}

function estimateTokens(content: string): number {
  const trimmed = content.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

function truncateSummary(summary: string, tokenBudget: number): string {
  const maxChars = Math.max(64, tokenBudget * 4);
  if (summary.length <= maxChars) return summary;
  const marker = "\n...[truncated]...\n";
  const availableChars = maxChars - marker.length;
  if (availableChars <= 0) return summary.slice(0, maxChars);
  const headChars = Math.max(32, Math.ceil(availableChars * 0.7));
  const tailChars = Math.max(32, availableChars - headChars);
  return `${summary.slice(0, headChars).trimEnd()}${marker}${summary.slice(-tailChars).trimStart()}`;
}

export function buildMemoryBlock(summaries: SummaryEntry[], maxContextTokens?: number): string | null {
  if (summaries.length === 0) return null;

  const budgetTokens = maxContextTokens
    ? Math.max(MIN_SUMMARY_TOKEN_BUDGET, Math.floor(maxContextTokens * SUMMARY_TOKEN_BUDGET_SHARE))
    : 1024;

  const lines: string[] = [];
  let usedTokens = 0;

  for (let i = 0; i < summaries.length; i++) {
    const remainingTokens = budgetTokens - usedTokens;
    if (remainingTokens < 64) break;

    const label = i === 0 ? `--- Summary ${i + 1} (earliest) ---` : `--- Summary ${i + 1} ---`;
    const truncated = truncateSummary(summaries[i]!.summary, Math.min(MAX_SUMMARY_TOKENS, remainingTokens));
    const entryTokens = estimateTokens(truncated);

    lines.push(label);
    lines.push(truncated);
    usedTokens += entryTokens;
  }

  if (lines.length === 0) return null;

  return [
    `<past_context>`,
    `The following is a summary of earlier conversation. Use it to maintain continuity and remember past events, but do not explicitly reference "remembering" unless it's natural.`,
    ``,
    ...lines,
    `</past_context>`,
  ].join("\n");
}

export async function filterAndAssembleMemoryContext(input: InterceptorInput): Promise<InterceptorResult> {
  const { messages, metadata, loadSummaries, chatId, maxContextTokens } = input;
  const totalMessages = messages.length;

  if (metadata.memoryTier2Enabled === false) {
    return {
      workingMessages: messages,
      summaries: [],
      memoryBlock: null,
      stats: { totalMessages, workingCount: messages.length, archivedCount: 0, summaryCount: 0, estimatedTokensSaved: 0 },
    };
  }

  const rawWatermark = metadata.lastSummarizedAt;
  if (!rawWatermark || typeof rawWatermark !== "string") {
    return {
      workingMessages: messages,
      summaries: [],
      memoryBlock: null,
      stats: { totalMessages, workingCount: messages.length, archivedCount: 0, summaryCount: 0, estimatedTokensSaved: 0 },
    };
  }

  const watermark = new Date(rawWatermark);
  if (isNaN(watermark.getTime())) {
    logger.warn("[memory-interceptor] Invalid lastSummarizedAt timestamp: %s", rawWatermark);
    return {
      workingMessages: messages,
      summaries: [],
      memoryBlock: null,
      stats: { totalMessages, workingCount: messages.length, archivedCount: 0, summaryCount: 0, estimatedTokensSaved: 0 },
    };
  }

  const workingMessages: InterceptorMessage[] = [];
  let archivedCount = 0;
  let archivedTokens = 0;

  for (const msg of messages) {
    const msgDate = new Date(msg.createdAt);
    if (msgDate.getTime() <= watermark.getTime()) {
      archivedCount++;
      archivedTokens += estimateTokens(msg.content);
    } else {
      workingMessages.push(msg);
    }
  }

  if (archivedCount === 0) {
    return {
      workingMessages: messages,
      summaries: [],
      memoryBlock: null,
      stats: { totalMessages, workingCount: messages.length, archivedCount: 0, summaryCount: 0, estimatedTokensSaved: 0 },
    };
  }

  let summaries: SummaryEntry[] = [];
  try {
    summaries = await loadSummaries(chatId);
  } catch (err) {
    logger.error(err, "[memory-interceptor] Failed to load summaries");
  }

  const memoryBlock = buildMemoryBlock(summaries, maxContextTokens);

  return {
    workingMessages,
    summaries,
    memoryBlock,
    stats: {
      totalMessages,
      workingCount: workingMessages.length,
      archivedCount,
      summaryCount: summaries.length,
      estimatedTokensSaved: archivedTokens,
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run packages/server/tests/memory-interceptor.test.ts
```

Expected: All 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement MemoryInterceptor service with tests"
```

---

## Task 4: Database Integration Layer

**Files:**
- Create: `packages/server/src/services/memory/memory-db.ts`
- Create: `packages/server/tests/memory-db.test.ts`

This module provides the DB functions that the interceptor and summarizer need: saving summaries, loading summaries, and updating the watermark.

- [ ] **Step 1: Write failing tests for memory-db**

Create `packages/server/tests/memory-db.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { saveSummary, loadSummariesForChat, updateWatermark, getWatermark } from "../src/services/memory/memory-db.js";

describe("memory-db utilities", () => {
  describe("updateWatermark / getWatermark", () => {
    it("should get null when no watermark set", () => {
      const meta = {};
      expect(getWatermark(meta)).toBeNull();
    });

    it("should get watermark when set", () => {
      const meta = { lastSummarizedAt: "2026-05-24T12:00:00.000Z" };
      expect(getWatermark(meta)).toBe("2026-05-24T12:00:00.000Z");
    });

    it("should update watermark in metadata", () => {
      const meta = { foo: "bar" };
      const updated = updateWatermark(meta, "2026-05-24T12:00:00.000Z");
      expect(updated.lastSummarizedAt).toBe("2026-05-24T12:00:00.000Z");
      expect(updated.foo).toBe("bar");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run packages/server/tests/memory-db.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement memory-db**

Create `packages/server/src/services/memory/memory-db.ts`:

```typescript
import { eq, desc } from "drizzle-orm";
import type { DB } from "../../db/connection.js";
import { memorySummaries } from "../../db/schema/index.js";
import { newId, now } from "../../utils/id-generator.js";
import { logger } from "../../lib/logger.js";

export interface SaveSummaryInput {
  db: DB;
  chatId: string;
  summary: string;
  messageCount: number;
  firstMessageId: string;
  lastMessageId: string;
  firstMessageAt: string;
  lastMessageAt: string;
  tokenEstimate: number;
}

export async function saveSummary(input: SaveSummaryInput): Promise<string> {
  const id = newId();
  const createdAt = now();
  await input.db.insert(memorySummaries).values({
    id,
    chatId: input.chatId,
    summary: input.summary,
    messageCount: input.messageCount,
    firstMessageId: input.firstMessageId,
    lastMessageId: input.lastMessageId,
    firstMessageAt: input.firstMessageAt,
    lastMessageAt: input.lastMessageAt,
    tokenEstimate: input.tokenEstimate,
    createdAt,
  });
  logger.debug("[memory-db] Saved summary %s for chat %s (%d messages)", id, input.chatId, input.messageCount);
  return id;
}

export interface LoadedSummary {
  summary: string;
  firstMessageAt: string;
  lastMessageAt: string;
}

export async function loadSummariesForChat(db: DB, chatId: string): Promise<LoadedSummary[]> {
  const rows = await db
    .select({
      summary: memorySummaries.summary,
      firstMessageAt: memorySummaries.firstMessageAt,
      lastMessageAt: memorySummaries.lastMessageAt,
    })
    .from(memorySummaries)
    .where(eq(memorySummaries.chatId, chatId))
    .orderBy(memorySummaries.lastMessageAt);
  return rows;
}

export function getWatermark(metadata: Record<string, unknown>): string | null {
  const val = metadata.lastSummarizedAt;
  if (typeof val === "string" && val) return val;
  return null;
}

export function updateWatermark(
  metadata: Record<string, unknown>,
  timestamp: string,
): Record<string, unknown> {
  return { ...metadata, lastSummarizedAt: timestamp };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run packages/server/tests/memory-db.test.ts
```

Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add memory DB layer (save/load summaries, watermark tracking)"
```

---

## Task 5: Integration into Generation Pipeline

**Files:**
- Modify: `packages/server/src/routes/generate.routes.ts`

This is the critical task — wiring the summarizer and interceptor into the 9,000+ line generation pipeline.

- [ ] **Step 1: Add imports at the top of generate.routes.ts**

Add these imports alongside the existing memory-recall imports (near line 130):

```typescript
import { summarizeOldestBatch } from "../services/memory/memory-summarizer.js";
import { filterAndAssembleMemoryContext } from "../services/memory/memory-interceptor.js";
import { saveSummary, loadSummariesForChat, getWatermark, updateWatermark } from "../services/memory/memory-db.js";
import { estimateMessageTokens as estimateMemoryTokens } from "../services/memory/memory-summarizer.js";
```

- [ ] **Step 2: Add interceptor call before memory recall section**

Find the memory recall section (around line 3705). **Before** the `// ── Memory recall` comment, add the interceptor:

```typescript
        // ── Memory Tier 2: Filter archived messages and inject summaries ──
        if (chatMeta.memoryTier2Enabled !== false) {
          try {
            const interceptorResult = await filterAndAssembleMemoryContext({
              messages: mappedMessages.map((m) => ({
                id: m.id ?? "",
                role: m.role,
                content: typeof m.content === "string" ? m.content : "",
                createdAt: m.createdAt ?? "",
              })),
              metadata: chatMeta,
              loadSummaries: async () => loadSummariesForChat(app.db, input.chatId),
              chatId: input.chatId,
              maxContextTokens: effectiveMaxContext ?? connectionMaxContext,
            });

            if (interceptorResult.memoryBlock) {
              const firstUserIdx = finalMessages.findIndex((m) => m.role === "user" || m.role === "assistant");
              const insertAt = firstUserIdx >= 0 ? firstUserIdx : finalMessages.length;
              finalMessages.splice(insertAt, 0, {
                role: "system" as const,
                content: interceptorResult.memoryBlock,
              });
              logger.debug(
                "[memory-tier2] Injected %d summaries, %d working/%d archived messages",
                interceptorResult.stats.summaryCount,
                interceptorResult.stats.workingCount,
                interceptorResult.stats.archivedCount,
              );
            }
          } catch (err) {
            logger.error(err, "[memory-tier2] Interceptor failed, skipping");
          }
        }
```

Note: The interceptor produces a memory block but does NOT replace `mappedMessages` or `finalMessages` directly in this MVP. It adds summaries as a system message. The actual message filtering (replacing the message list) is a higher-risk change that can be added after the summary injection proves stable. This approach is safer: summaries are injected as additional context without modifying the existing message flow.

- [ ] **Step 3: Add summarization call alongside post-generation chunking**

Find the `chunkAndEmbedMessages` call (around line 9559). **Before** it, add the summarization call:

```typescript
        // ── Background: summarize oldest messages if above threshold ──
        {
          const charNameMap: Record<string, string> = {};
          for (const ci of charInfo) {
            charNameMap[ci.id] = ci.name;
          }
          summarizeOldestBatch({
            messages: /* working messages after watermark — need to pass from generation scope */,
            nameMap: { userName: personaName, characterNames: charNameMap },
            provider: /* active provider */,
            model: /* active model */,
          }).then(async (result) => {
            if (!result) return;
            await saveSummary({
              db: app.db,
              chatId: input.chatId,
              summary: result.summary,
              messageCount: result.messageCount,
              firstMessageId: result.firstMessageId,
              lastMessageId: result.lastMessageId,
              firstMessageAt: result.firstMessageAt,
              lastMessageAt: result.lastMessageAt,
              tokenEstimate: result.tokenEstimate,
            });
            const chat = await chats.getById(input.chatId);
            if (chat) {
              const meta = parseExtra(chat.metadata) as Record<string, unknown>;
              const updated = updateWatermark(meta, result.lastMessageAt);
              await chats.updateMetadata(input.chatId, updated);
            }
          }).catch((err) => logger.error(err, "[memory-tier2] Background summarization failed"));
        }
```

**Important implementation note for the subagent:** The exact variable names for provider, model, and messages inside the generation handler need to be read from the surrounding scope at the insertion point. The subagent must:
1. Read the code around line 9559 to identify the correct variable names
2. Identify how to get the working messages (messages after watermark) at that point
3. Use the existing provider/model variables in scope
4. The `chats` storage and `parseExtra` are already imported/available

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd packages/server && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: integrate memory system into generation pipeline"
```

---

## Task 6: Integration Tests

**Files:**
- Create: `packages/server/tests/memory-integration.test.ts`

- [ ] **Step 1: Write integration tests**

Create `packages/server/tests/memory-integration.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { filterAndAssembleMemoryContext } from "../src/services/memory/memory-interceptor.js";
import { summarizeOldestBatch, TIER2_THRESHOLD_TOKENS } from "../src/services/memory/memory-summarizer.js";
import { buildMemoryBlock } from "../src/services/memory/memory-interceptor.js";
import { getWatermark, updateWatermark } from "../src/services/memory/memory-db.js";

function makeMsg(id: string, role: string, content: string, createdAt: string) {
  return { id, role: role as any, content, characterId: null as string | null, createdAt };
}

describe("Memory Integration", () => {
  it("should handle full flow: summarize then filter", async () => {
    const messages = Array.from({ length: 25 }, (_, i) =>
      makeMsg(
        `msg_${i}`,
        i % 2 === 0 ? "user" : "assistant",
        "x".repeat(1200 * 4),
        new Date(Date.now() + i * 60000).toISOString(),
      )
    );

    const mockProvider = {
      chatComplete: vi.fn().mockResolvedValue({
        content: "Alice and Bob met and discussed their plans for the journey west.",
      }),
    };

    const summaryResult = await summarizeOldestBatch({
      messages,
      nameMap: { userName: "Alice", characterNames: { char1: "Bob" } },
      provider: mockProvider as any,
      model: "test-model",
    });

    expect(summaryResult).not.toBeNull();
    expect(summaryResult!.messageCount).toBeGreaterThanOrEqual(10);

    const watermark = summaryResult!.lastMessageAt;
    const meta = updateWatermark({}, watermark);

    const summaries = [
      { summary: summaryResult!.summary, firstMessageAt: summaryResult!.firstMessageAt, lastMessageAt: summaryResult!.lastMessageAt },
    ];

    const interceptorResult = await filterAndAssembleMemoryContext({
      messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt })),
      metadata: meta,
      loadSummaries: async () => summaries,
      maxContextTokens: 8000,
    });

    expect(interceptorResult.workingMessages.length).toBeLessThan(messages.length);
    expect(interceptorResult.memoryBlock).not.toBeNull();
    expect(interceptorResult.memoryBlock).toContain("Alice and Bob");
    expect(interceptorResult.stats.archivedCount).toBeGreaterThan(0);
  });

  it("should degrade gracefully when summarization returns null", async () => {
    const messages = Array.from({ length: 5 }, (_, i) =>
      makeMsg(`msg_${i}`, "user", "Short message", new Date(Date.now() + i * 60000).toISOString())
    );

    const result = await summarizeOldestBatch({
      messages,
      nameMap: { userName: "User", characterNames: {} },
      provider: { chatComplete: vi.fn() } as any,
      model: "test-model",
    });

    expect(result).toBeNull();

    const interceptorResult = await filterAndAssembleMemoryContext({
      messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt })),
      metadata: {},
      loadSummaries: async () => [],
      maxContextTokens: 8000,
    });

    expect(interceptorResult.workingMessages).toHaveLength(5);
    expect(interceptorResult.memoryBlock).toBeNull();
  });

  it("should track token savings through watermark metadata", () => {
    const meta1 = {};
    expect(getWatermark(meta1)).toBeNull();

    const meta2 = updateWatermark(meta1, "2026-05-24T12:00:00.000Z");
    expect(getWatermark(meta2)).toBe("2026-05-24T12:00:00.000Z");

    const meta3 = updateWatermark(meta2, "2026-05-24T18:00:00.000Z");
    expect(getWatermark(meta3)).toBe("2026-05-24T18:00:00.000Z");
    expect(meta3.lastSummarizedAt).toBe("2026-05-24T18:00:00.000Z");
  });

  it("should produce valid XML memory block", async () => {
    const summaries = [
      { summary: "First event summary.", firstMessageAt: "2026-05-24T04:00:00.000Z", lastMessageAt: "2026-05-24T06:00:00.000Z" },
      { summary: "Second event summary.", firstMessageAt: "2026-05-24T06:00:00.000Z", lastMessageAt: "2026-05-24T08:00:00.000Z" },
    ];
    const block = buildMemoryBlock(summaries, 8000);
    expect(block).toContain("<past_context>");
    expect(block).toContain("</past_context>");
    expect(block).toContain("First event summary.");
    expect(block).toContain("Second event summary.");
  });

  it("should handle LLM failure gracefully in full flow", async () => {
    const messages = Array.from({ length: 20 }, (_, i) =>
      makeMsg(`msg_${i}`, "user", "x".repeat(1200 * 4), new Date(Date.now() + i * 60000).toISOString())
    );

    const mockProvider = {
      chatComplete: vi.fn().mockRejectedValue(new Error("API rate limit")),
    };

    const result = await summarizeOldestBatch({
      messages,
      nameMap: { userName: "User", characterNames: {} },
      provider: mockProvider as any,
      model: "test-model",
    });

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run all memory tests**

```bash
npx vitest run packages/server/tests/memory-summarizer.test.ts packages/server/tests/memory-interceptor.test.ts packages/server/tests/memory-db.test.ts packages/server/tests/memory-integration.test.ts
```

Expected: All tests PASS

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS (65+ existing + ~28 new = 93+)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: add memory system integration tests"
```

---

## Task 7: Documentation & Benchmark

**Files:**
- Create: `docs/MEMORY_SYSTEM.md`
- Modify: `ROADMAP.md` (mark Phase 2A items as done)

- [ ] **Step 1: Write MEMORY_SYSTEM.md**

Document the memory system architecture, configuration, and usage. Follow the same style as `docs/NARRATIVE_ENGINE.md`. Include:
- Overview of 3-tier architecture
- How summarization works
- Configuration (metadata JSON keys)
- Integration points
- Testing

- [ ] **Step 2: Update ROADMAP.md**

Mark Phase 2A items as complete.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add memory system documentation"
```

---

## Self-Review Checklist

After completing all tasks:

- [ ] All tests passing (`npx vitest run`)
- [ ] TypeScript compiles (`npx tsc --noEmit` in packages/server)
- [ ] Memory summaries table created and migrated
- [ ] MemorySummarizer runs post-generation without blocking
- [ ] MemoryInterceptor injects summaries before memory recall
- [ ] Watermark tracking uses timestamps (not message IDs)
- [ ] Error handling: summarization failure doesn't break generation
- [ ] Existing memory recall (Tier 3) still works unchanged
- [ ] Documentation updated
