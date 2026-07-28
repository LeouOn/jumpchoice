import { logger } from "../../lib/logger.js";
import { parseJSONFromLLM } from "./json-utils.js";
import type {
  CYOADocument,
  CYOAAnalysis,
  CYOAChoiceAnalysis,
  SynergyPair,
  BuildArchetype,
} from "./cyoa-types.js";

export interface AnalyzerProvider {
  chatComplete: (messages: any[], options: any) => Promise<{ content: string }>;
}

export interface AnalyzeInput {
  document: CYOADocument;
  provider: AnalyzerProvider;
  model: string;
}

const SYSTEM_PROMPT = `You are an expert CYOA (Choose Your Own Adventure) build analyzer. Analyze the following CYOA document and provide strategic insights.`;

function formatChoices(choices: CYOADocument["choices"]): string {
  return choices
    .map(
      (c, i) =>
        `${i + 1}. [${c.id}] ${c.name} (Category: ${c.category}, Cost: ${c.pointCost}) - ${c.description}`,
    )
    .join("\n");
}

function buildUserPrompt(doc: CYOADocument): string {
  const choicesFormatted = formatChoices(doc.choices);
  return `Document: ${doc.title}
Description: ${doc.description}
Point Budget: ${doc.pointBudget ?? "Unlimited"}
Categories: ${doc.categories.join(", ")}

Choices:
${choicesFormatted}

Return a JSON object with this exact structure:
{
  "tierList": {
    "S": [{"choiceId": "id", "choiceName": "name", "tier": "S", "costEfficiency": 95, "synergies": ["id"], "analysis": "text"}],
    "A": [...],
    "B": [...],
    "C": [...],
    "D": [...],
    "F": [...]
  },
  "categorySummaries": {
    "categoryName": "summary text"
  },
  "topSynergies": [
    {"choiceIds": ["id1", "id2"], "description": "why they work together", "combinedValue": "high"}
  ],
  "buildArchetypes": [
    {"name": "Build Name", "description": "desc", "recommendedChoiceIds": ["id"], "totalPointCost": 50, "strengths": ["s"], "weaknesses": ["w"]}
  ],
  "overallSummary": "A paragraph summarizing the CYOA's balance and notable strategies"
}

Rules:
- Tier every choice: S (must-have) through F (trap/never pick)
- costEfficiency: 0-100 scale (100 = best value for points)
- Include at least 3 synergy pairs and 2 build archetypes
- Budget-aware: builds should respect the point budget
- Return ONLY the JSON object`;
}

export const parseAnalysisJSON = parseJSONFromLLM;

function buildFallbackAnalysis(_doc: CYOADocument): CYOAAnalysis {
  return {
    tierList: {},
    categorySummaries: {},
    topSynergies: [],
    buildArchetypes: [],
    overallSummary:
      "Analysis failed: the LLM was unable to produce a valid analysis. Please try again.",
    analyzedAt: new Date().toISOString(),
  };
}

export async function analyzeDocument(input: AnalyzeInput): Promise<CYOAAnalysis> {
  const { document, provider, model } = input;

  try {
    const userPrompt = buildUserPrompt(document);
    const result = await provider.chatComplete(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { model, maxTokens: 4096 },
    );

    if (!result.content?.trim()) {
      logger.warn("[cyoa-analyzer] LLM returned empty response");
      return buildFallbackAnalysis(document);
    }

    const parsed = parseJSONFromLLM(result.content);
    if (!parsed) {
      logger.warn("[cyoa-analyzer] LLM returned unparseable response");
      return buildFallbackAnalysis(document);
    }

    const tierList: Record<string, CYOAChoiceAnalysis[]> = {};
    if (parsed.tierList && typeof parsed.tierList === "object") {
      for (const [tier, entries] of Object.entries(parsed.tierList)) {
        if (Array.isArray(entries)) {
          tierList[tier] = entries.map((e: any) => ({
            choiceId: e.choiceId ?? "",
            choiceName: e.choiceName ?? "",
            tier: e.tier ?? tier,
            costEfficiency: typeof e.costEfficiency === "number" ? e.costEfficiency : 50,
            synergies: Array.isArray(e.synergies) ? e.synergies : [],
            analysis: e.analysis ?? "",
          }));
        }
      }
    }

    const categorySummaries: Record<string, string> = {};
    if (parsed.categorySummaries && typeof parsed.categorySummaries === "object") {
      for (const [cat, summary] of Object.entries(parsed.categorySummaries)) {
        categorySummaries[cat] = typeof summary === "string" ? summary : "";
      }
    }

    const topSynergies: SynergyPair[] = Array.isArray(parsed.topSynergies)
      ? parsed.topSynergies.map((s: any) => ({
          choiceIds: Array.isArray(s.choiceIds) ? s.choiceIds : [],
          description: s.description ?? "",
          combinedValue:
            s.combinedValue === "high" || s.combinedValue === "medium" || s.combinedValue === "low"
              ? s.combinedValue
              : "medium",
        }))
      : [];

    const buildArchetypes: BuildArchetype[] = Array.isArray(parsed.buildArchetypes)
      ? parsed.buildArchetypes.map((b: any) => ({
          name: b.name ?? "",
          description: b.description ?? "",
          recommendedChoiceIds: Array.isArray(b.recommendedChoiceIds) ? b.recommendedChoiceIds : [],
          totalPointCost: typeof b.totalPointCost === "number" ? b.totalPointCost : 0,
          strengths: Array.isArray(b.strengths) ? b.strengths : [],
          weaknesses: Array.isArray(b.weaknesses) ? b.weaknesses : [],
        }))
      : [];

    const analysis: CYOAAnalysis = {
      tierList,
      categorySummaries,
      topSynergies,
      buildArchetypes,
      overallSummary: parsed.overallSummary ?? "",
      analyzedAt: new Date().toISOString(),
    };

    logger.debug(
      "[cyoa-analyzer] Analysis complete: %d tiers, %d synergies, %d builds",
      Object.keys(tierList).length,
      topSynergies.length,
      buildArchetypes.length,
    );

    return analysis;
  } catch (err) {
    logger.error(err, "[cyoa-analyzer] Analysis failed");
    return buildFallbackAnalysis(document);
  }
}
