import { describe, it, expect, vi } from "vitest";
import { filterAndAssembleMemoryContext } from "../src/services/memory/memory-interceptor.js";
import { summarizeOldestBatch } from "../src/services/memory/memory-summarizer.js";
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
      ),
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
      makeMsg(`msg_${i}`, "user", "Short message", new Date(Date.now() + i * 60000).toISOString()),
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
      makeMsg(`msg_${i}`, "user", "x".repeat(1200 * 4), new Date(Date.now() + i * 60000).toISOString()),
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
