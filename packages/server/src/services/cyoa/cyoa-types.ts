export interface CYOARawChoice {
  name: string;
  description: string;
  category: string;
  pointCost: number;
  prerequisites: string[];
  tags: string[];
  confidence: number;
  rawText?: string;
}

export interface CYOAExtraction {
  imageId: string;
  pageNumber: number | null;
  extractionMethod: "vision" | "ocr";
  title: string | null;
  description: string | null;
  pointBudget: number | null;
  categories: string[];
  choices: CYOARawChoice[];
  warnings: string[];
}

export interface CYOAChoice {
  id: string;
  name: string;
  description: string;
  category: string;
  pointCost: number;
  prerequisites: string[];
  tags: string[];
  sourceImageIds: string[];
  stealth?: boolean;
}

export interface CYOADocument {
  title: string;
  description: string;
  pointBudget: number | null;
  categories: string[];
  choices: CYOAChoice[];
  imageCount: number;
  mergedAt: string;
}

export interface CYOAChoiceAnalysis {
  choiceId: string;
  choiceName: string;
  tier: string;
  costEfficiency: number;
  synergies: string[];
  analysis: string;
}

export interface SynergyPair {
  choiceIds: string[];
  description: string;
  combinedValue: "high" | "medium" | "low";
}

export interface BuildArchetype {
  name: string;
  description: string;
  recommendedChoiceIds: string[];
  totalPointCost: number;
  strengths: string[];
  weaknesses: string[];
}

export interface CYOAAnalysis {
  tierList: Record<string, CYOAChoiceAnalysis[]>;
  categorySummaries: Record<string, string>;
  topSynergies: SynergyPair[];
  buildArchetypes: BuildArchetype[];
  overallSummary: string;
  analyzedAt: string;
}
