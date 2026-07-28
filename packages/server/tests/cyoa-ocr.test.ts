import { describe, it, expect, vi } from "vitest";
import { ocrImage, isOCRAvailable } from "../src/services/cyoa/ocr-service.js";

describe("OCR Service", () => {
  it("should report availability based on tesseract.js", () => {
    const available = isOCRAvailable();
    expect(typeof available).toBe("boolean");
  });

  it("should return empty string for non-existent file", async () => {
    const result = await ocrImage("/nonexistent/path.png");
    expect(result).toBe("");
  });
});
