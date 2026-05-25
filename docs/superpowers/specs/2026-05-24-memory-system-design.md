# JumpChoice Memory System Design Specification

**Date:** 2026-05-24
**Status:** Draft
**Scope:** Phase 2A - Memory System (MVP)

**Note:** This covers the memory system only. NPC Bank, World State Tracker, and AI Slop Detector are deferred to Phase 2B with separate specs.

## Overview

A 3-tier memory system that compresses long conversations by auto-summarizing old messages, keeping recent messages in full detail, and retrieving relevant past context via vector search. The goal is 75%+ token savings on conversations exceeding 16K tokens while preserving narrative continuity.

This is a minimal enhancement to the existing memory system. The current system provides Tier 1 (working messages) and basic Tier 3 (chunked embeddings with cosine similarity). We add Tier 2 (LLM-summarized batches) and a prompt interceptor that filters archived messages.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage backend | SQLite + JSON embeddings | No new dependencies, existing system works |
| Summarization | LLM-based | Nuance matters for roleplay; one extra API call is negligible |
| Trigger threshold | 16K tokens | Preserves detail before compressing |
| Trigger strategy | Sliding window | Summarize oldest batch as conversation grows |
| Prompt injection | Replace & append + vector retrieval | Strip archived messages, append summaries and relevant chunks |
| Original messages | Never deleted | Source of truth preserved in DB |
| Tracking mechanism | Watermark in chat metadata | `lastSummarizedAt` timestamp prevents re-processing |

## 3-Tier Architecture

```
Tier 1: Working Memory
  Recent messages after the watermark (full detail, no compression)
  Token budget: up to 16K before triggering summarization

Tier 2: Short-Term Memory
  LLM-summarized batches of 10-15 old messages
  Stored in memory_summaries table
  Always appended to prompt (up to token budget)

Tier 3: Long-Term Memory
  Existing chunked embeddings (memory_chunks table)
  Vector search via cosine similarity (threshold: 0.25, top-K: 8)
  Injected based on query relevance
```

## Database Schema

### New table: `memory_summaries`

Stored in `packages/server/src/db/schema/chats.ts` alongside existing `memoryChunks`.

```sql
CREATE TABLE memory_summaries (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  message_count INTEGER NOT NULL,
  first_message_id TEXT NOT NULL,
  last_message_id TEXT NOT NULL,
  first_message_at TEXT NOT NULL,
  last_message_at TEXT NOT NULL,
  token_estimate INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_memory_summaries_chat
  ON memory_summaries(chat_id, last_message_at DESC);
```

**Field definitions:**
- `summary`: LLM-generated text summarizing the batch
- `message_count`: Number of original messages in the batch (10-15)
- `first_message_id` / `last_message_id`: Message ID range for the batch; `last_message_id` serves as the watermark
- `first_message_at` / `last_message_at`: ISO timestamps for chronological ordering
- `token_estimate`: Approximate token count of the original messages (for savings tracking)

### Modified: `chats.metadata` (JSON field)

Two new keys added to the existing metadata JSON:

```json
{
  "lastSummarizedAt": "2026-05-24T12:00:00.000Z",
  "memoryTier2Enabled": true
}
```

- `lastSummarizedAt`: ISO timestamp watermark. Messages with `createdAt <= lastSummarizedAt` are archived (Tier 2/3). Messages with `createdAt > lastSummarizedAt` are working memory (Tier 1). Null or absent means no summarization has occurred. This follows the same timestamp-based tracking pattern used by the existing `chunkAndEmbedMessages` (which uses `gt(messages.createdAt, after)` to find un-chunked messages).
- `memoryTier2Enabled`: Toggle for the entire Tier 2 system. Default: true. Allows disabling per-chat without losing the watermark.

No new configuration table needed. The existing `metadata` JSON field on `chats` already stores settings like `enableMemoryRecall`, `embeddingConnectionId`, etc.

## New Services

### 1. MemorySummarizer

**File:** `packages/server/src/services/memory/memory-summarizer.ts`

**Responsibility:** Summarize the oldest batch of Tier 1 messages when the working set exceeds 16K tokens.

**API:**

```typescript
interface SummarizerInput {
  db: DB;
  chatId: string;
  messages: Array<{ id: string; role: string; content: string; characterId?: string | null; createdAt: string }>;
  nameMap: { userName: string; characterNames: Record<string, string> };
  provider: LLMProvider;
  model: string;
  embeddingSource?: MemoryRecallEmbeddingSource | null;
}

interface SummarizerResult {
  summaryId: string;
  summary: string;
  messageCount: number;
  firstMessageId: string;
  lastMessageId: string;
  tokenEstimate: number;
}

async function summarizeOldestBatch(input: SummarizerInput): Promise<SummarizerResult | null>
```

**Behavior:**
1. Count tokens in all Tier 1 messages (messages after watermark timestamp, or all messages if no watermark)
2. If total tokens <= 16K, return null (nothing to summarize)
3. If total messages < 10, return null (too few for a useful summary)
4. Select oldest batch: 10-15 messages from the start of Tier 1 (up to 5K tokens of source material)
5. Format messages as `"Name: content"` lines (same pattern as existing `chunkAndEmbedMessages`)
6. Call LLM with summarization prompt
7. Store result in `memory_summaries` table
8. Chunk and embed the summarized messages via existing `chunkAndEmbedMessages` (ensures Tier 3 coverage)
9. Update `lastSummarizedAt` in chat metadata to the `createdAt` timestamp of the last message in the batch
10. Return the summary result

**Summarization prompt:**

```
Summarize the following conversation excerpt in 2-4 paragraphs. Preserve:
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
{formatted messages}
---
```

**Token estimation:** Uses existing `estimateTextTokens()` from `prompt.routes.ts` (chars/4 heuristic). For the summarization call itself, uses the chat's active LLM provider and model.

**Batch size logic:** Summarize up to 15 messages or 5K tokens of source material, whichever comes first. This keeps the summarization API call small and focused.

### 2. MemoryInterceptor

**File:** `packages/server/src/services/memory/memory-interceptor.ts`

**Responsibility:** Filter messages by watermark and assemble the memory context block for prompt injection.

**API:**

```typescript
interface InterceptorInput {
  db: DB;
  chatId: string;
  messages: Array<{ id: string; role: string; content: string; createdAt: string }>;
  metadata: Record<string, unknown>;
  maxContextTokens?: number;
}

interface InterceptorResult {
  workingMessages: typeof input.messages;
  summaries: Array<{ summary: string; firstMessageAt: string; lastMessageAt: string }>;
  memoryBlock: string | null;
  stats: {
    totalMessages: number;
    workingCount: number;
    archivedCount: number;
    summaryCount: number;
    estimatedTokensSaved: number;
  };
}

async function filterAndAssembleMemoryContext(input: InterceptorInput): Promise<InterceptorResult>
```

**Behavior:**
1. Read `lastSummarizedAt` from metadata
2. If no watermark timestamp, all messages are working messages, return immediately
3. Split messages: `createdAt <= watermark` = archived, `createdAt > watermark` = working
4. Load summaries from `memory_summaries` for this chat, ordered chronologically
5. Build `memoryBlock` string with summaries and token budgeting
6. Return working messages + memory block + stats

**Memory block format:**

```xml
<past_context>
The following is a summary of earlier conversation. Use it to maintain continuity and remember past events, but do not explicitly reference "remembering" unless it's natural.

--- Summary 1 (earliest) ---
{summary text}

--- Summary 2 ---
{summary text}
</past_context>
```

**Token budgeting for summaries:** 10% of context window (separate from existing 15% for Tier 3 recalled memories). This gives:
- Tier 2 summaries: ~10% of context
- Tier 3 recalled chunks: ~15% of context (existing)
- Working messages + system prompt: remaining ~75%

Summaries that exceed the budget are included oldest-first (most distant context is most important to preserve). Individual summaries are truncated at 512 tokens with head/tail preservation.

### 3. Integration with Existing Memory Recall

The existing Tier 3 memory recall (vector search via `recallMemories`) continues unchanged. The MemoryInterceptor does NOT replace it. The two systems stack:

1. **MemoryInterceptor** (new): Filters messages + provides Tier 2 summaries
2. **Memory recall** (existing): Runs after interceptor, searches Tier 3 chunks for query-relevant context

Both inject as separate system messages. The interceptor runs first, then the existing memory recall runs on top.

## Integration Points

### In `generate.routes.ts`

**Pre-generation (prompt assembly phase):**

Insert MemoryInterceptor call before the memory recall section (line ~3705). The interceptor must run first to filter the message list before memory recall searches it. Execution order in the pipeline (matching line-number order in the file):

1. **MemoryInterceptor.filterAndAssembleMemoryContext** (NEW) - filter messages, build summary block
2. Memory recall via vector search (existing, line ~3705-3757) - Tier 3 retrieval on filtered messages
3. Narrative context injection (existing, line ~6657-6691) - append narrative prompt
4. Continue with normal prompt assembly

The interceptor replaces the raw message list (`mappedMessages` or `finalMessages`) with the filtered working messages. The memory block is injected as a system message before the first user/assistant message (same pattern as existing memory recall injection).

**Post-generation (background):**

Add `summarizeOldestBatch` call alongside existing `chunkAndEmbedMessages` (line ~9559-9564). Both are fire-and-forget. Summarization runs first because it may produce new messages to chunk:

```
Post-generation flow:
1. summarizeOldestBatch(db, chatId, ...)  -- may summarize 10-15 messages
2. chunkAndEmbedMessages(db, chatId, ...) -- chunks any new un-chunked messages
```

Both are wrapped in `.catch()` to prevent blocking the response.

### In `packages/server/src/db/schema/chats.ts`

Add `memorySummaries` table definition alongside existing `memoryChunks`.

### In `packages/server/src/db/migrate.ts`

Add migration for `memory_summaries` table and index.

### In `packages/server/src/db/schema/index.ts`

Export `memorySummaries` from `chats.ts`.

## Data Flow

```
USER SENDS MESSAGE
       |
       v
[1] Load chat messages from DB
       |
       v
[2] MemoryInterceptor.filterAndAssembleMemoryContext()
       |-- Read lastSummarizedAt timestamp from chat.metadata
       |-- Split: archived (createdAt <= watermark) vs working (createdAt > watermark)
       |-- Load memory_summaries for this chat (chronological)
       |-- Build <past_context> XML block with token budgeting
       |-- Return: { workingMessages, memoryBlock, stats }
       |
       v
[3] Replace full message list with workingMessages
       |
       v
[4] Memory recall: vector search (existing)
       |-- Uses last user message as query
       |-- Searches memory_chunks (Tier 3)
       |-- Builds <memories> XML block
       |
       v
[5] Narrative context injection (existing)
       |
       v
[6] Assemble final prompt:
       |-- System prompt (narrative + persona + CoT)
       |-- <past_context> block (Tier 2 summaries)
       |-- <memories> block (Tier 3 recalled chunks)
       |-- Working messages (Tier 1)
       |-- User's new message
       |
       v
[7] Generate response (LLM call)
       |
       v
[8] Post-generation (fire-and-forget):
       |-- If Tier 1 tokens > 16K:
       |     MemorySummarizer.summarizeOldestBatch()
       |       |-- Take oldest 10-15 messages from Tier 1
       |       |-- Call LLM to summarize (provider/model captured from generation scope)
       |       |-- Store summary in memory_summaries
       |       |-- Update lastSummarizedAt timestamp in chat.metadata
       |-- chunkAndEmbedMessages() (existing)
       |-- Both wrapped in .catch()
```

## Context Passing

The key concern is ensuring the right context reaches the LLM at each step.

**During generation (steps 1-7):**
- The interceptor receives the full message array and metadata
- It returns only working messages (Tier 1) to the pipeline
- The memory block (Tier 2 summaries) is a separate string injected as a system message
- Tier 3 recalled chunks are injected by the existing memory recall system
- All three tiers end up in `finalMessages` as distinct system messages

**During summarization (step 8):**
- The summarizer receives the working messages array (post-watermark)
- It selects the oldest batch from the start of this array
- It calls the LLM directly (not through the generation pipeline) with a summarization prompt
- The summary is stored in the database, not passed to the current generation

**Watermark propagation:**
- `lastSummarizedAt` timestamp is updated after successful summarization
- The next generation reads this timestamp from chat metadata
- Messages with `createdAt` at or before the timestamp are excluded from Tier 1
- Their content is available only through Tier 2 summaries and Tier 3 vector search
- Using timestamps (not random nanoid strings) ensures correct chronological ordering

**Context threading for summarization:**
- The generation handler has `provider` and `model` in scope (already resolved for the generation LLM call)
- These are captured in a closure and passed to the fire-and-forget `summarizeOldestBatch` call
- No additional DB lookups or provider resolution needed

## Error Handling

| Scenario | Behavior |
|----------|----------|
| LLM summarization fails | Log error via `logger.error`, skip summarization, try again next generation |
| No embedding model available | Tier 3 disabled, Tier 2 summaries still work independently |
| Watermark timestamp is invalid or in the future | Treat as no watermark, include all messages in Tier 1 |
| Vector search returns nothing | Tier 3 empty, Tier 1 + Tier 2 still provide full context |
| Summary exceeds 512 tokens | Truncate with head/tail preservation + "...[truncated]..." |
| Chat has < 10 messages | Skip summarization even if > 16K tokens (too few for useful summary) |
| Summarization succeeds but chunking fails | Summary stored, Tier 3 coverage incomplete for that batch. Next chunking pass will pick up the messages |
| `memoryTier2Enabled` is false | Interceptor skips, all messages remain in Tier 1 |

**Degradation principle:** Each tier is independent. If any tier fails, the others continue. The system degrades gracefully from 3-tier to 2-tier to 1-tier.

## Performance Considerations

- **Summarization is async:** Runs after generation completes, never blocks user response
- **First-cross penalty:** The first generation that crosses 16K tokens won't benefit from compression. Compression kicks in on the next generation.
- **Token counting:** Uses chars/4 heuristic (existing `estimateTextTokens`). Not perfectly accurate but fast and consistent.
- **Summary caching:** Summaries are loaded fresh each generation. No cache invalidation issues.
- **Vector search budget:** Existing 500-chunk limit and cosine similarity calculation remain unchanged.

## Testing Strategy

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| MemorySummarizer unit tests | 8 | Batch selection, summarization logic, watermark update, edge cases |
| MemoryInterceptor unit tests | 8 | Message filtering, summary loading, token budgeting, memory block format |
| Integration tests | 6 | End-to-end flow: generation with memory, token counting, context assembly |
| Edge case tests | 5 | Empty chats, no watermark, corrupted metadata, LLM failures, tier degradation |
| Benchmark test | 1 | Token savings measurement: simulate 200-message chat, compare with/without memory |
| **Total** | **28** | |

## Scope Exclusions

These are explicitly out of scope for the MVP:

- Per-chat configuration UI (use metadata JSON for now)
- Memory management UI (view/rebuild summaries)
- Multiple summarization strategies (LLM only)
- Cross-chat memory search (per-chat only, matching existing behavior)
- TF-IDF scoring (semantic similarity only)
- Regex noise cleaner before summarization (can add later)
- LanceDB migration (future if scale demands it)
- Memory analytics dashboard
- Summary versioning or rollback

## Future Enhancements

These can be added without breaking changes:

- Configuration UI for threshold, batch size, enabled/disabled per chat
- Regex noise cleaner to strip repetitive patterns before summarization
- Extractive summarization as a fallback when LLM is unavailable
- TF-IDF + semantic hybrid scoring for Tier 3 retrieval
- Cross-chat memory search for related conversations
- Summary quality scoring (LLM self-evaluation)
- Memory analytics (token savings tracking, summary quality metrics)
- LanceDB migration for improved vector search at scale
