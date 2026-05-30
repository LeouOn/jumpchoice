import { describe, it, expect, vi } from "vitest";
import { extractFromImage, parseExtractionJSON } from "../src/services/cyoa/cyoa-extractor.js";

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    readFileSync: vi.fn((path: string) => {
      if (path === "test.png" || path === "test.jpg" || path === "test.webp") {
        return Buffer.from("fake-png-data");
      }
      throw new Error(`ENOENT: no such file '${path}'`);
    }),
  };
});

vi.mock("../src/services/cyoa/ocr-service.js", () => ({
  ocrImage: vi.fn().mockResolvedValue("Mock Choice\nCost: 5 points\nA great choice"),
}));

vi.mock("../../lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const VALID_EXTRACTION = {
  title: "Test CYOA",
  description: "A test adventure",
  pointBudget: 20,
  categories: ["powers", "items"],
  choices: [
    {
      name: "Flight",
      description: "You can fly",
      category: "powers",
      pointCost: 5,
      prerequisites: [],
      tags: ["movement"],
      confidence: 0.95,
    },
    {
      name: "Sword",
      description: "A sharp blade",
      category: "items",
      pointCost: 3,
      prerequisites: [],
      tags: ["weapon"],
      confidence: 0.85,
    },
  ],
};

function makeProvider(response: any) {
  return {
    chatComplete: vi.fn().mockResolvedValue(
      typeof response === "string" ? { content: response } : response,
    ),
  };
}

describe("CYOAExtractor", () => {
  it("should extract data via vision path", async () => {
    const provider = makeProvider(JSON.stringify(VALID_EXTRACTION));
    const result = await extractFromImage({
      imageId: "img1",
      imagePath: "test.png",
      pageNumber: 1,
      provider,
      model: "test-model",
    });

    expect(result.imageId).toBe("img1");
    expect(result.pageNumber).toBe(1);
    expect(result.extractionMethod).toBe("vision");
    expect(result.title).toBe("Test CYOA");
    expect(result.description).toBe("A test adventure");
    expect(result.pointBudget).toBe(20);
    expect(result.categories).toEqual(["powers", "items"]);
    expect(result.choices).toHaveLength(2);
    expect(result.choices[0].name).toBe("Flight");
    expect(result.choices[0].pointCost).toBe(5);
    expect(result.choices[1].name).toBe("Sword");
    expect(result.warnings).toHaveLength(0);
  });

  it("should fall back to OCR when image file is missing", async () => {
    const { ocrImage } = await import("../src/services/cyoa/ocr-service.js");
    const mockOcr = vi.mocked(ocrImage);
    mockOcr.mockResolvedValueOnce("Flight: You can fly - 5 points\nSword: A blade - 3 points");

    const provider = makeProvider(JSON.stringify(VALID_EXTRACTION));
    const result = await extractFromImage({
      imageId: "img2",
      imagePath: "/nonexistent/path.png",
      pageNumber: null,
      provider,
      model: "test-model",
    });

    expect(result.extractionMethod).toBe("ocr");
    expect(result.choices).toHaveLength(2);
    expect(mockOcr).toHaveBeenCalledWith("/nonexistent/path.png");
  });

  it("should handle empty LLM response", async () => {
    const provider = makeProvider({ content: "" });
    const result = await extractFromImage({
      imageId: "img3",
      imagePath: "test.png",
      pageNumber: 1,
      provider,
      model: "test-model",
    });

    expect(result.choices).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("should handle invalid JSON from LLM", async () => {
    const provider = makeProvider("This is not JSON at all, just plain text.");
    const result = await extractFromImage({
      imageId: "img4",
      imagePath: "test.png",
      pageNumber: 1,
      provider,
      model: "test-model",
    });

    expect(result.choices).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("should retry once with stricter prompt on invalid JSON then succeed", async () => {
    const provider = {
      chatComplete: vi.fn()
        .mockResolvedValueOnce({ content: "not json" })
        .mockResolvedValueOnce({ content: JSON.stringify(VALID_EXTRACTION) }),
    };
    const result = await extractFromImage({
      imageId: "img_retry",
      imagePath: "test.png",
      pageNumber: 1,
      provider,
      model: "test-model",
    });

    expect(provider.chatComplete).toHaveBeenCalledTimes(2);
    expect(result.extractionMethod).toBe("vision");
    expect(result.choices).toHaveLength(2);
    expect(result.title).toBe("Test CYOA");
  });

  it("should fall back to OCR after failed vision retry", async () => {
    const provider = {
      chatComplete: vi.fn()
        .mockResolvedValueOnce({ content: "not json" })
        .mockResolvedValueOnce({ content: "still not json" }),
    };
    const { ocrImage } = await import("../src/services/cyoa/ocr-service.js");
    const mockOcr = vi.mocked(ocrImage);
    mockOcr.mockResolvedValueOnce("OCR text for structuring");
    const ocrExtraction = { ...VALID_EXTRACTION, title: "OCR Result" };
    provider.chatComplete.mockResolvedValueOnce({ content: JSON.stringify(ocrExtraction) });

    const result = await extractFromImage({
      imageId: "img_retry_fail",
      imagePath: "test.png",
      pageNumber: 1,
      provider,
      model: "test-model",
    });

    expect(provider.chatComplete).toHaveBeenCalledTimes(3);
    expect(result.extractionMethod).toBe("ocr");
    expect(result.title).toBe("OCR Result");
  });

  it("should add warnings for low-confidence choices", async () => {
    const extraction = {
      ...VALID_EXTRACTION,
      choices: [
        { ...VALID_EXTRACTION.choices[0], confidence: 0.5 },
        { ...VALID_EXTRACTION.choices[1], confidence: 0.95 },
        {
          name: "Blurry",
          description: "Hard to read",
          category: "uncategorized",
          pointCost: 1,
          prerequisites: [],
          tags: [],
          confidence: 0.3,
        },
      ],
    };
    const provider = makeProvider(JSON.stringify(extraction));
    const result = await extractFromImage({
      imageId: "img5",
      imagePath: "test.png",
      pageNumber: 1,
      provider,
      model: "test-model",
    });

    expect(result.choices).toHaveLength(3);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]).toContain("Low confidence");
    expect(result.warnings[1]).toContain("Low confidence");
  });

  it("should populate warnings for extraction issues", async () => {
    const provider = makeProvider({ content: "" });
    const result = await extractFromImage({
      imageId: "img6",
      imagePath: "test.png",
      pageNumber: 1,
      provider,
      model: "test-model",
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.imageId).toBe("img6");
    expect(result.title).toBeNull();
    expect(result.description).toBeNull();
    expect(result.pointBudget).toBeNull();
    expect(result.categories).toEqual([]);
  });

  it("should fall back to OCR gracefully for missing image file", async () => {
    const { ocrImage } = await import("../src/services/cyoa/ocr-service.js");
    const mockOcr = vi.mocked(ocrImage);
    mockOcr.mockResolvedValueOnce("Telepathy: Read minds - 8 points");

    const extraction = {
      title: "PSI CYOA",
      description: null,
      pointBudget: 15,
      categories: ["mental"],
      choices: [
        {
          name: "Telepathy",
          description: "Read minds",
          category: "mental",
          pointCost: 8,
          prerequisites: [],
          tags: ["psi"],
          confidence: 0.9,
        },
      ],
    };
    const provider = makeProvider(JSON.stringify(extraction));
    const result = await extractFromImage({
      imageId: "img7",
      imagePath: "/does/not/exist.png",
      pageNumber: 3,
      provider,
      model: "test-model",
    });

    expect(result.extractionMethod).toBe("ocr");
    expect(result.pageNumber).toBe(3);
    expect(result.title).toBe("PSI CYOA");
    expect(result.choices).toHaveLength(1);
    expect(result.choices[0].name).toBe("Telepathy");
  });
});

describe("parseExtractionJSON", () => {
  it("should parse plain JSON", () => {
    const obj = { title: "test" };
    expect(parseExtractionJSON(JSON.stringify(obj))).toEqual(obj);
  });

  it("should parse JSON from markdown code block", () => {
    const obj = { title: "test" };
    const input = "```json\n" + JSON.stringify(obj, null, 2) + "\n```";
    expect(parseExtractionJSON(input)).toEqual(obj);
  });

  it("should return null for unparseable input", () => {
    expect(parseExtractionJSON("not json at all")).toBeNull();
  });
});
