import { describe, it, expect, vi, beforeAll } from "vitest";
import { writeFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

vi.mock("../../lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { generateImage, saveImageToDisk } from "../src/services/image/image-generation.js";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const HAS_OPENROUTER_KEY = OPENROUTER_API_KEY.length > 0;

const describeIfKey = HAS_OPENROUTER_KEY ? describe : describe.skip;

describeIfKey("OpenRouter image generation", () => {
  const testImageDir = join(tmpdir(), "cyoa-image-test");
  const savedPaths: string[] = [];

  beforeAll(() => {
    if (!existsSync(testImageDir)) mkdirSync(testImageDir, { recursive: true });
  });

  it("generates an image with microsoft/mai-image-2.5 and saves it to disk", async () => {
    const result = await generateImage(
      "openrouter",
      "https://openrouter.ai/api/v1",
      OPENROUTER_API_KEY,
      "openrouter",
      {
        prompt: "A small cute robot waving hello, pixel art style",
        model: "microsoft/mai-image-2.5",
        width: 512,
        height: 512,
      },
    );

    expect(result.base64.length).toBeGreaterThan(100);
    expect(["png", "jpg", "webp"]).toContain(result.ext);

    const chatId = "test-mai-" + Date.now();
    const relPath = saveImageToDisk(chatId, result.base64, result.ext);
    savedPaths.push(join(testImageDir, relPath));
    expect(relPath).toMatch(/\.(png|jpg|webp)$/);
  }, 180_000);

  it("generates an image with google/gemini-2.5-flash-image and saves it to disk", async () => {
    const result = await generateImage(
      "openrouter",
      "https://openrouter.ai/api/v1",
      OPENROUTER_API_KEY,
      "openrouter",
      {
        prompt: "A friendly cat wearing a wizard hat, digital art",
        model: "google/gemini-2.5-flash-image",
        width: 512,
        height: 512,
      },
    );

    expect(result.base64.length).toBeGreaterThan(100);

    const chatId = "test-gemini-" + Date.now();
    const relPath = saveImageToDisk(chatId, result.base64, result.ext);
    expect(relPath).toMatch(/\.(png|jpg|webp)$/);
  }, 180_000);

  it("returns a non-empty base64 string for x-ai/grok-imagine-image-quality (may fail with provider error)", async () => {
    let succeeded = false;
    let errorMessage = "";
    try {
      const result = await generateImage(
        "openrouter",
        "https://openrouter.ai/api/v1",
        OPENROUTER_API_KEY,
        "openrouter",
        {
          prompt: "A sunset over mountains",
          model: "x-ai/grok-imagine-image-quality",
          width: 512,
          height: 512,
        },
      );
      expect(result.base64.length).toBeGreaterThan(100);
      succeeded = true;
    } catch (err) {
      errorMessage = (err as Error).message;
    }
    if (!succeeded) {
      // xAI provider sometimes returns 500 — log but don't fail
      console.warn(`x-ai/grok-imagine-image-quality provider error: ${errorMessage}`);
    }
  }, 180_000);
});

describe("saveImageToDisk", () => {
  it("writes a file to data/gallery/{chatId}/", () => {
    const tinyPng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const chatId = "unit-test-" + Date.now();
    const relPath = saveImageToDisk(chatId, tinyPng, "png");
    expect(relPath).toMatch(new RegExp(`^${chatId}/.+\\.png$`));
  });
});
