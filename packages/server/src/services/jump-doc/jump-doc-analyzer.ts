import { logger } from "../../lib/logger.js";
import { parseJSONFromLLM } from "../cyoa/json-utils.js";
import type { JumpDocumentMerged, JumpDocumentAnalysis } from "@jumpchoice/shared";

export interface AnalyzerProvider {
  chatComplete: (messages: any[], options: any) => Promise<{ content: string }>;
}

export interface AnalyzeDocumentInput {
  document: JumpDocumentMerged;
  provider: AnalyzerProvider;
  model: string;
}

const ANALYSIS_PROMPT = `You are a Jumpchain build analyzer. Analyze this jump document and provide tier lists, synergies, and build archetypes.

Document:
{document}

Return a JSON object with this exact structure:
{
  "tierList": {
    "Perks": [
      { "name": "string", "tier": "S|A|B|C|D|F", "analysis": "string" }
    ],
    "Items": [
      { "name": "string", "tier": "S|A|B|C|D|F", "analysis": "string" }
    ],
    "Drawbacks": [
      { "name": "string", "tier": "S|A|B|C|D|F", "analysis": "string" }
    ],
    "Companions": [
      { "name": "string", "tier": "S|A|B|C|D|F", "analysis": "string" }
    ],
    "Origins": [
      { "name": "string", "tier": "S|A|B|C|D|F", "analysis": "string" }
    ],
    "Scenarios": [
      { "name": "string", "tier": "S|A|B|C|D|F", "analysis": "string" }
    ]
  },
  "synergyPairs": [
    { "entryIds": ["string"], "description": "string", "combinedValue": "high|medium|low" }
  ],
  "buildArchetypes": [
    {
      "name": "string",
      "description": "string",
      "recommendedEntryIds": ["string"],
      "totalCost": number,
      "strengths": ["string"],
      "weaknesses": ["string"]
    }
  ],
  "overallSummary": "string"
}

Rules:
- Tier S = Must-have / game-changing, A = Excellent, B = Good, C = Average, D = Niche/Weak, F = Trap/Actively harmful
- Analyze cost efficiency, versatility, synergy potential, and setting relevance
- Synergy pairs: find 2-5 entries that work exceptionally well together
- Build archetypes: create 3-5 distinct build paths (e.g., "Combat Monster", "Social Butterfly", "Magic Scholar", "Tech Specialist", "Jack of All Trades")
- Each archetype should stay within the document's CP budget
- overallSummary: 2-3 paragraph assessment of the document's strengths, weaknesses, and best strategies
- Return ONLY the JSON object, no other text`;

const RETRY_PROMPT = `Your previous response was not valid JSON. You MUST respond with ONLY a raw JSON object. No markdown, no code fences, no explanation. Just the JSON object starting with { and ending with }.`;

function formatDocumentForAnalysis(doc: JumpDocumentMerged): string {
  let output = `Title: ${doc.title}\nDescription: ${doc.description}\n\n`;

  for (const supp of doc.supplements) {
    output += `=== ${supp.name} (${supp.type}, Budget: ${supp.budget} CP) ===\n`;
    output += `${supp.description}\n\n`;

    if (supp.origins.length > 0) {
      output += "Origins:\n";
      for (const o of supp.origins) {
        output += `  - ${o.name} (${o.cost} CP): ${o.description}\n`;
        if (o.freebies.length > 0) output += `    Freebies: ${o.freebies.join(", ")}\n`;
        if (o.discounts.length > 0) output += `    Discounts: ${o.discounts.join(", ")}\n`;
      }
      output += "\n";
    }

    if (supp.perks.length > 0) {
      output += "Perks:\n";
      for (const p of supp.perks) {
        output += `  - ${p.name} (${p.cost} CP): ${p.description}\n`;
      }
      output += "\n";
    }

    if (supp.items.length > 0) {
      output += "Items:\n";
      for (const i of supp.items) {
        output += `  - ${i.name} (${i.cost} CP): ${i.description}\n`;
      }
      output += "\n";
    }

    if (supp.drawbacks.length > 0) {
      output += "Drawbacks:\n";
      for (const d of supp.drawbacks) {
        output += `  - ${d.name} (+${d.bonusCP} CP): ${d.description}\n`;
      }
      output += "\n";
    }

    if (supp.companions.length > 0) {
      output += "Companions:\n";
      for (const c of supp.companions) {
        output += `  - ${c.name} (${c.cost} CP, ${c.budget} CP budget): ${c.description}\n`;
      }
      output += "\n";
    }

    if (supp.scenarios.length > 0) {
      output += "Scenarios:\n";
      for (const s of supp.scenarios) {
        output += `  - ${s.name} (+${s.rewardCP} CP): ${s.description}\n`;
      }
      output += "\n";
    }

    if (supp.altForms.length > 0) {
      output += "Alt Forms:\n";
      for (const a of supp.altForms) {
        output += `  - ${a.name} (${a.cost} CP): ${a.description}\n`;
      }
      output += "\n";
    }
  }

  return output;
}

export async function analyzeDocument(input: AnalyzeDocumentInput): Promise<JumpDocumentAnalysis> {
  const { document, provider, model } = input;

  const formattedDoc = formatDocumentForAnalysis(document);

  const prompt = ANALYSIS_PROMPT.replace("{document}", formattedDoc);

  try {
    const result = await provider.chatComplete(
      [
        { role: "system", content: prompt },
        { role: "user", content: "Analyze this jump document." },
      ],
      { model },
    );

    if (result.content?.trim()) {
      const parsed = parseJSONFromLLM(result.content);
      if (parsed) {
        logger.info("[jump-doc-analyzer] Analysis succeeded");
        return {
          tierList: parsed.tierList ?? {},
          synergyPairs: parsed.synergyPairs ?? [],
          buildArchetypes: parsed.buildArchetypes ?? [],
          overallSummary: parsed.overallSummary ?? "",
          analyzedAt: new Date().toISOString(),
        };
      }

      logger.warn("[jump-doc-analyzer] Retrying with stricter prompt");
      const retry = await provider.chatComplete(
        [
          { role: "system", content: RETRY_PROMPT },
          { role: "user", content: "Analyze this jump document." },
        ],
        { model },
      );

      if (retry.content?.trim()) {
        const retryParsed = parseJSONFromLLM(retry.content);
        if (retryParsed) {
          logger.info("[jump-doc-analyzer] Retry succeeded");
          return {
            tierList: retryParsed.tierList ?? {},
            synergyPairs: retryParsed.synergyPairs ?? [],
            buildArchetypes: retryParsed.buildArchetypes ?? [],
            overallSummary: retryParsed.overallSummary ?? "",
            analyzedAt: new Date().toISOString(),
          };
        }
      }
    }

    logger.warn("[jump-doc-analyzer] Unparseable response");
    return {
      tierList: {},
      synergyPairs: [],
      buildArchetypes: [],
      overallSummary: "Analysis failed: unparseable response",
      analyzedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error(err, "[jump-doc-analyzer] Analysis failed");
    return {
      tierList: {},
      synergyPairs: [],
      buildArchetypes: [],
      overallSummary: "Analysis failed: " + (err instanceof Error ? err.message : String(err)),
      analyzedAt: new Date().toISOString(),
    };
  }
}