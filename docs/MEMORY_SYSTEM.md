# Memory System

JumpChoice's memory system manages conversation context for long-running roleplay sessions. It prevents token overflow by automatically summarizing old messages and replacing them with compact summaries, keeping the AI's context window focused on recent, relevant content.

## Architecture

The memory system uses a 3-tier architecture:

1. **Tier 1 - Working Memory**: Recent messages kept verbatim in the context window. These are the messages the AI reads directly during generation.

2. **Tier 2 - Summaries**: Older messages are summarized by an LLM into compact paragraph summaries. The originals are stripped from the prompt and replaced with a `<past_context>` block.

3. **Tier 3 - Vector Search**: Existing memory-recall system using SQLite + JSON embeddings with cosine similarity. Used for semantic retrieval of relevant past moments. Already present in the codebase; LanceDB migration is deferred until scale demands it.

### Source Files

| File | Purpose |
|------|---------|
| `packages/server/src/services/memory/memory-summarizer.ts` | LLM-based batch summarization |
| `packages/server/src/services/memory/memory-interceptor.ts` | Pre-generation message filtering and memory block assembly |
| `packages/server/src/services/memory/memory-db.ts` | Database persistence for summaries and watermark tracking |

## How It Works

### Summarization Trigger (Post-Generation)

After each AI response, the system checks whether summarization is needed:

1. Token count of all messages is estimated (`length / 4` heuristic)
2. If total tokens exceed **16K** (`TIER2_THRESHOLD_TOKENS`), summarization proceeds
3. At least **10 messages** (`MIN_MESSAGES_FOR_SUMMARY`) must exist before summarizing
4. The oldest batch of messages (up to **15 messages** or **5K tokens**) is sent to the LLM for summarization
5. The resulting summary is saved to the `memory_summaries` table
6. The chat metadata `lastSummarizedAt` watermark is updated to the timestamp of the last summarized message

This runs as a fire-and-forget background task after generation completes — it never blocks the user's response.

### Sliding Window (Pre-Generation)

Before each generation, the interceptor assembles the working context:

1. Checks `lastSummarizedAt` watermark in chat metadata
2. Messages at or before the watermark are classified as "archived"
3. Messages after the watermark become the "working" set
4. Summaries are loaded from the database
5. A `<past_context>` block is built from summaries and injected as a system message

The interceptor runs before memory recall (Tier 3), so both systems compose cleanly.

### Watermark Tracking

The `lastSummarizedAt` field in chat metadata tracks which messages have been summarized:

- **Type**: ISO 8601 timestamp string
- **Updated**: After each successful summarization
- **Read**: At the start of each generation to determine the working set
- **Stored**: In the chat's metadata JSON object

### Token Budget

Summaries are capped to avoid consuming too much context:

- Summary budget: **10%** of the context window (`SUMMARY_TOKEN_BUDGET_SHARE`)
- Minimum budget: **256 tokens** (`MIN_SUMMARY_TOKEN_BUDGET`)
- Per-summary cap: **512 tokens** (`MAX_SUMMARY_TOKENS`)
- Summaries are head/tail truncated if they exceed their budget allocation

## Configuration

The memory system is controlled via chat metadata JSON keys:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `lastSummarizedAt` | `string` (ISO 8601) | `null` | Watermark timestamp for last summarized message |
| `memoryTier2Enabled` | `boolean` | `true` | Set to `false` to disable Tier 2 summarization entirely |

To disable Tier 2 for a specific chat, set `memoryTier2Enabled` to `false` in the chat's metadata. When disabled, the interceptor passes all messages through unchanged.

## Integration Points

The memory system hooks into the generation pipeline in `packages/server/src/routes/generate.routes.ts`:

### Pre-Generation (Interceptor)

At ~line 3709, before the prompt is sent to the LLM:

```
1. Check if Tier 2 is enabled (chatMeta.memoryTier2Enabled !== false)
2. Call filterAndAssembleMemoryContext() with messages, metadata, and context size
3. Replace full message list with working messages
4. Inject memory block as a system message if summaries exist
```

### Post-Generation (Summarizer)

At ~line 9599, after the response is sent to the client (fire-and-forget):

```
1. Call summarizeOldestBatch() with all messages
2. If a summary is produced, save it via saveSummary()
3. Update the chat metadata watermark via updateWatermark()
4. Chunk and embed new messages for Tier 3 vector recall
```

## Testing

Run memory system tests:

```bash
pnpm test memory
```

24 memory-specific tests across 4 files, part of the 89 total test suite:

| Test File | Coverage |
|-----------|----------|
| `tests/memory-summarizer.test.ts` | Token estimation, batch selection, summarization logic |
| `tests/memory-interceptor.test.ts` | Watermark filtering, memory block assembly, budget enforcement |
| `tests/memory-db.test.ts` | Summary persistence, watermark read/write |
| `tests/memory-integration.test.ts` | End-to-end pipeline: summarize → save → intercept → inject |

## Customization

### Adjusting the Summarization Threshold

Edit constants in `packages/server/src/services/memory/memory-summarizer.ts`:

```typescript
export const TIER2_THRESHOLD_TOKENS = 16000;  // Trigger summarization above this
export const MIN_MESSAGES_FOR_SUMMARY = 10;    // Minimum messages before summarizing
export const MAX_BATCH_MESSAGES = 15;          // Max messages per summarization batch
export const MAX_BATCH_SOURCE_TOKENS = 5000;   // Max tokens per batch
```

### Adjusting the Summary Budget

Edit constants in `packages/server/src/services/memory/memory-interceptor.ts`:

```typescript
export const SUMMARY_TOKEN_BUDGET_SHARE = 0.1;  // 10% of context window
export const MIN_SUMMARY_TOKEN_BUDGET = 256;     // Minimum token budget
export const MAX_SUMMARY_TOKENS = 512;           // Per-summary cap
```

## Future Enhancements

*Note: These features are planned but subject to change.*

Planned features:
- Memory configuration UI in chat settings
- Regex cleaner for noise removal before summarization
- LanceDB migration for Tier 3 vector search at scale
- Per-character memory budget allocation
- Manual summary editing and deletion
- Memory export/import for campaign continuity
