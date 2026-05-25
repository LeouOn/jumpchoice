import { describe, it, expect, vi } from "vitest";
import {
  summarizeOldestBatch,
  estimateMessageTokens,
  TIER2_THRESHOLD_TOKENS,
  MIN_MESSAGES_FOR_SUMMARY,
  MAX_BATCH_MESSAGES,
  MAX_BATCH_SOURCE_TOKENS,
} from "../src/services/memory/memory-summarizer.js";

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
    makeMessage(`msg_${i}`, i % 2 === 0 ? "user" : "assistant", "x".repeat(tokensPerMsg * 4)),
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
      const messagesArg = mockProvider.chatComplete.mock.calls[0][0] as any[];
      const systemMsg = messagesArg.find((m: any) => m.role === "user");
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
