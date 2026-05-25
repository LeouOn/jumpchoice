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
