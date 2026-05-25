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
