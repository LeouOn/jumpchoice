import { logger } from "../../lib/logger.js";
import { parseJSONFromLLM } from "../cyoa/json-utils.js";
import type {
  JumpDocumentExtraction,
  JumpDocumentSupplement,
} from "@jumpchoice/shared";

export interface ExtractorProvider {
  chatComplete: (messages: any[], options: any) => Promise<{ content: string }>;
}

export interface ExtractPdfInput {
  documentId: string;
  filePath: string;
  pageNumber: number | null;
  provider: ExtractorProvider;
  model: string;
}

const EXTRACTION_PROMPT = `You are a Jumpchain document analyzer. Extract all structured data from this jump document text.

Return a JSON object with this exact structure:
{
  "title": "string or null",
  "description": "string or null",
  "supplements": [
    {
      "id": "string (unique identifier)",
      "name": "string",
      "description": "string",
      "type": "jump|supplement|gauntlet|end-jump",
      "budget": number,
      "origins": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "cost": number,
          "freebies": ["string"],
          "discounts": ["string"]
        }
      ],
      "perks": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "cost": number,
          "originId": "string or null",
          "tags": ["string"],
          "requires": ["string"]
        }
      ],
      "items": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "cost": number,
          "originId": "string or null",
          "tags": ["string"],
          "requires": ["string"]
        }
      ],
      "drawbacks": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "bonusCP": number,
          "tags": ["string"],
          "requires": ["string"]
        }
      ],
      "companions": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "cost": number,
          "originId": "string or null",
          "budget": number,
          "tags": ["string"],
          "requires": ["string"]
        }
      ],
      "scenarios": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "rewardCP": number,
          "rewardDescription": "string",
          "tags": ["string"],
          "requires": ["string"]
        }
      ],
      "altForms": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "cost": number,
          "tags": ["string"]
        }
      ]
    }
  ]
}

Rules:
- Jumpchain documents typically have 1000 CP starting budget
- Extract every origin, perk, item, drawback, companion, scenario, alt form
- Organize by supplement/jump if the document has multiple
- Set "type" based on document: "jump" for main jumps, "supplement" for supplements, "gauntlet" for gauntlets, "end-jump" for end jumps
- For origins: cost is typically 0 for free origins, or CP cost if it costs points
- For perks/items: cost in CP, include originId if discounted for specific origin
- For drawbacks: bonusCP is positive (how many CP they give)
- For companions: cost to import, budget is their CP budget
- Generate unique IDs for each entry
- Use tags for categorization (e.g., "combat", "social", "utility", "magic", "tech")
- Return ONLY the JSON object, no other text`;

const RETRY_PROMPT = `Your previous response was not valid JSON. You MUST respond with ONLY a raw JSON object. No markdown, no code fences, no explanation. Just the JSON object starting with { and ending with }.

Extract Jumpchain data with the same structure as above.`;

function buildExtraction(
  parsed: Record<string, any>,
  documentId: string,
  pageNumber: number | null,
): JumpDocumentExtraction {
  const warnings: string[] = [];
  const supplements: JumpDocumentSupplement[] = (parsed.supplements ?? []).map(
    (s: any) => ({
      id: s.id ?? crypto.randomUUID(),
      name: s.name ?? "Untitled Supplement",
      description: s.description ?? "",
      type: s.type ?? "jump",
      budget: typeof s.budget === "number" ? s.budget : 1000,
      origins: Array.isArray(s.origins) ? s.origins : [],
      perks: Array.isArray(s.perks) ? s.perks : [],
      items: Array.isArray(s.items) ? s.items : [],
      drawbacks: Array.isArray(s.drawbacks) ? s.drawbacks : [],
      companions: Array.isArray(s.companions) ? s.companions : [],
      scenarios: Array.isArray(s.scenarios) ? s.scenarios : [],
      altForms: Array.isArray(s.altForms) ? s.altForms : [],
    }),
  );

  if (supplements.length === 0) {
    warnings.push("No supplements found in document");
  }

  return {
    documentId,
    pageNumber,
    extractionMethod: "pdf-text",
    title: parsed.title ?? null,
    description: parsed.description ?? null,
    supplements,
    warnings,
  };
}

function emptyExtraction(
  documentId: string,
  pageNumber: number | null,
  warnings: string[],
): JumpDocumentExtraction {
  return {
    documentId,
    pageNumber,
    extractionMethod: "pdf-text",
    title: null,
    description: null,
    supplements: [],
    warnings,
  };
}

export async function extractFromPdf(input: ExtractPdfInput): Promise<JumpDocumentExtraction> {
  const { documentId, filePath, pageNumber, provider, model } = input;

  // Import the PDF text extractor
  const { extractPdfText } = await import("./pdf-extractor.js");
  const pdfText = await extractPdfText(filePath);

  if (!pdfText || pdfText === "[PDF text extraction failed]") {
    return emptyExtraction(documentId, pageNumber, [
      "PDF text extraction failed or returned no text",
    ]);
  }

  // Truncate if too long (keep first 100k chars for context window)
  const maxChars = 100000;
  const truncatedText = pdfText.length > maxChars ? pdfText.substring(0, maxChars) + "..." : pdfText;

  try {
    const result = await provider.chatComplete(
      [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: `Extract Jumpchain data from this document text:\n\n---\n${truncatedText}\n---` },
      ],
      { model },
    );

    if (result.content?.trim()) {
      const parsed = parseJSONFromLLM(result.content);
      if (parsed) {
        logger.info("[jump-doc-extractor] Extraction succeeded for %s", documentId);
        return buildExtraction(parsed, documentId, pageNumber);
      }

      logger.warn("[jump-doc-extractor] Retrying with stricter prompt for %s", documentId);
      const retry = await provider.chatComplete(
        [
          { role: "system", content: RETRY_PROMPT },
          { role: "user", content: `Extract Jumpchain data from this document text:\n\n---\n${truncatedText}\n---` },
        ],
        { model },
      );

      if (retry.content?.trim()) {
        const retryParsed = parseJSONFromLLM(retry.content);
        if (retryParsed) {
          logger.info("[jump-doc-extractor] Retry succeeded for %s", documentId);
          return buildExtraction(retryParsed, documentId, pageNumber);
        }
      }
    }

    logger.warn("[jump-doc-extractor] Unparseable response for %s", documentId);
    return emptyExtraction(documentId, pageNumber, ["LLM returned unparseable response"]);
  } catch (err) {
    logger.error(err, "[jump-doc-extractor] Extraction failed for %s", documentId);
    return emptyExtraction(documentId, pageNumber, [
      "Extraction failed: " + (err instanceof Error ? err.message : String(err)),
    ]);
  }
}