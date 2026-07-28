import { readFileSync } from "fs";
import { extname } from "path";
import { logger } from "../../lib/logger.js";
import { ocrImage } from "./ocr-service.js";
import { parseJSONFromLLM } from "./json-utils.js";
import type { CYOAExtraction, CYOARawChoice } from "./cyoa-types.js";

export interface ExtractorProvider {
  chatComplete: (messages: any[], options: any) => Promise<{ content: string }>;
}

export interface FallbackProvider {
  provider: ExtractorProvider;
  model: string;
  label: string;
}

export interface ExtractImageInput {
  imageId: string;
  imagePath: string;
  pageNumber: number | null;
  provider: ExtractorProvider;
  model: string;
  fallbackProviders?: FallbackProvider[];
}

const VISION_PROMPT = `You are a CYOA (Choose Your Own Adventure) image analyzer. Extract all structured data from this image.

Return a JSON object with this exact structure:
{
  "title": "string or null",
  "description": "string or null",
  "pointBudget": number or null,
  "categories": ["string"],
  "choices": [
    {
      "name": "string",
      "description": "string",
      "category": "string",
      "pointCost": number,
      "prerequisites": ["string"],
      "tags": ["string"],
      "confidence": 0.0-1.0
    }
  ]
}

Rules:
- Extract every visible choice/option from the image
- Estimate point costs from the image text
- Set confidence based on how clearly the choice is visible
- Use "uncategorized" as default category if no category is clear
- Return ONLY the JSON object, no other text`;

const RETRY_PROMPT = `Your previous response was not valid JSON. You MUST respond with ONLY a raw JSON object. No markdown, no code fences, no explanation. Just the JSON object starting with { and ending with }.

Extract CYOA data with this structure:
{"title":"...","description":"...","pointBudget":N,"categories":[...],"choices":[{"name":"...","description":"...","category":"...","pointCost":N,"prerequisites":[...],"tags":[...],"confidence":0.0-1.0}]}`;

const OCR_PROMPT_TEMPLATE = `You are a CYOA (Choose Your Own Adventure) data structurer. The following text was OCR'd from a CYOA image. Extract all structured data.

Text:
---
{text}
---

Return a JSON object with this exact structure:
{
  "title": "string or null",
  "description": "string or null",
  "pointBudget": number or null,
  "categories": ["string"],
  "choices": [
    {
      "name": "string",
      "description": "string",
      "category": "string",
      "pointCost": number,
      "prerequisites": ["string"],
      "tags": ["string"],
      "confidence": 0.0-1.0
    }
  ]
}

Rules:
- Extract every choice/option from the OCR text
- Estimate point costs from the text
- Set confidence lower for choices where OCR text is unclear
- Use "uncategorized" as default category
- Return ONLY the JSON object, no other text`;

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function imageToDataUrl(filePath: string): string | null {
  try {
    const ext = extname(filePath).toLowerCase();
    const mime = MIME_MAP[ext];
    if (!mime) {
      logger.warn("[cyoa-extractor] Unsupported image extension: %s", ext);
      return null;
    }
    const buffer = readFileSync(filePath);
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch (err) {
    logger.error(err, "[cyoa-extractor] Failed to read image: %s", filePath);
    return null;
  }
}

export const parseExtractionJSON = parseJSONFromLLM;

function buildExtraction(
  parsed: Record<string, any>,
  imageId: string,
  pageNumber: number | null,
  method: "vision" | "ocr",
): CYOAExtraction {
  const warnings: string[] = [];
  const choices: CYOARawChoice[] = (parsed.choices ?? []).map(
    (c: any, i: number) => {
      const confidence = typeof c.confidence === "number" ? c.confidence : 0.5;
      if (confidence < 0.7) {
        warnings.push(`Low confidence (${confidence.toFixed(2)}) for choice: ${c.name ?? `index ${i}`}`);
      }
      return {
        name: c.name ?? "",
        description: c.description ?? "",
        category: c.category ?? "uncategorized",
        pointCost: typeof c.pointCost === "number" ? c.pointCost : 0,
        prerequisites: Array.isArray(c.prerequisites) ? c.prerequisites : [],
        tags: Array.isArray(c.tags) ? c.tags : [],
        confidence,
      };
    },
  );

  return {
    imageId,
    pageNumber,
    extractionMethod: method,
    title: parsed.title ?? null,
    description: parsed.description ?? null,
    pointBudget: typeof parsed.pointBudget === "number" ? parsed.pointBudget : null,
    categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    choices,
    warnings,
  };
}

function emptyExtraction(
  imageId: string,
  pageNumber: number | null,
  method: "vision" | "ocr",
  warnings: string[],
): CYOAExtraction {
  return {
    imageId,
    pageNumber,
    extractionMethod: method,
    title: null,
    description: null,
    pointBudget: null,
    categories: [],
    choices: [],
    warnings,
  };
}

async function tryVisionExtraction(
  provider: ExtractorProvider,
  model: string,
  dataUrl: string,
  imageId: string,
  pageNumber: number | null,
  label: string,
): Promise<CYOAExtraction | null> {
  try {
    const result = await provider.chatComplete(
      [
        { role: "system", content: VISION_PROMPT },
        { role: "user", content: "Extract CYOA data from this image.", images: [dataUrl] },
      ],
      { model },
    );

    if (result.content?.trim()) {
      const parsed = parseJSONFromLLM(result.content);
      if (parsed) {
        logger.info("[cyoa-extractor] Vision extraction succeeded via %s for %s", label, imageId);
        return buildExtraction(parsed, imageId, pageNumber, "vision");
      }

      logger.warn("[cyoa-extractor] Retrying vision (%s) with stricter prompt for %s", label, imageId);
      const retry = await provider.chatComplete(
        [
          { role: "system", content: RETRY_PROMPT },
          { role: "user", content: "Extract CYOA data from this image.", images: [dataUrl] },
        ],
        { model },
      );

      if (retry.content?.trim()) {
        const retryParsed = parseJSONFromLLM(retry.content);
        if (retryParsed) {
          logger.info("[cyoa-extractor] Vision retry succeeded via %s for %s", label, imageId);
          return buildExtraction(retryParsed, imageId, pageNumber, "vision");
        }
      }
    }
    logger.warn("[cyoa-extractor] Vision (%s) returned unparseable response for %s", label, imageId);
  } catch (err) {
    logger.error(err, "[cyoa-extractor] Vision (%s) failed for %s", label, imageId);
  }
  return null;
}

export async function extractFromImage(input: ExtractImageInput): Promise<CYOAExtraction> {
  const { imageId, imagePath, pageNumber, provider, model, fallbackProviders } = input;

  const dataUrl = imageToDataUrl(imagePath);
  if (dataUrl) {
    const primaryResult = await tryVisionExtraction(provider, model, dataUrl, imageId, pageNumber, "primary");
    if (primaryResult) return primaryResult;

    if (fallbackProviders?.length) {
      for (const fallback of fallbackProviders) {
        logger.info("[cyoa-extractor] Trying fallback vision provider: %s for %s", fallback.label, imageId);
        const fallbackResult = await tryVisionExtraction(
          fallback.provider,
          fallback.model,
          dataUrl,
          imageId,
          pageNumber,
          fallback.label,
        );
        if (fallbackResult) return fallbackResult;
      }
    }
  }

  logger.info("[cyoa-extractor] Falling back to OCR for %s", imageId);
  const ocrText = await ocrImage(imagePath);
  if (!ocrText) {
    return emptyExtraction(imageId, pageNumber, "ocr", [
      "All vision providers failed and OCR returned no text",
    ]);
  }

  const ocrPrompt = OCR_PROMPT_TEMPLATE.replace("{text}", ocrText);
  const structuringProvider = fallbackProviders?.[0]?.provider ?? provider;
  const structuringModel = fallbackProviders?.[0]?.model ?? model;
  try {
    const result = await structuringProvider.chatComplete(
      [
        { role: "system", content: "You are a data extraction assistant." },
        { role: "user", content: ocrPrompt },
      ],
      { model: structuringModel },
    );

    if (!result.content?.trim()) {
      return emptyExtraction(imageId, pageNumber, "ocr", [
        "OCR succeeded but LLM returned empty response",
      ]);
    }

    const parsed = parseJSONFromLLM(result.content);
    if (!parsed) {
      logger.warn("[cyoa-extractor] Retrying OCR structuring with stricter prompt for %s", imageId);
      try {
        const retry = await structuringProvider.chatComplete(
          [
            { role: "system", content: RETRY_PROMPT },
            { role: "user", content: ocrPrompt },
          ],
          { model: structuringModel },
        );
        if (retry.content?.trim()) {
          const retryParsed = parseJSONFromLLM(retry.content);
          if (retryParsed) {
            logger.debug("[cyoa-extractor] OCR retry succeeded for %s", imageId);
            return buildExtraction(retryParsed, imageId, pageNumber, "ocr");
          }
        }
      } catch (retryErr) {
        logger.error(retryErr, "[cyoa-extractor] OCR retry failed for %s", imageId);
      }

      return emptyExtraction(imageId, pageNumber, "ocr", [
        "OCR succeeded but LLM response was not valid JSON",
      ]);
    }

    logger.debug("[cyoa-extractor] OCR extraction succeeded for %s", imageId);
    return buildExtraction(parsed, imageId, pageNumber, "ocr");
  } catch (err) {
    logger.error(err, "[cyoa-extractor] OCR LLM structuring failed for %s", imageId);
    return emptyExtraction(imageId, pageNumber, "ocr", [
      "OCR succeeded but LLM structuring failed",
    ]);
  }
}
