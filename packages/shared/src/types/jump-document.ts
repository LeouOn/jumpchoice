export interface JumpDocumentOrigin {
  id: string;
  name: string;
  description: string;
  cost: number;
  freebies: string[];
  discounts: string[];
}

export interface JumpDocumentPerk {
  id: string;
  name: string;
  description: string;
  cost: number;
  originId?: string;
  tags: string[];
  requires?: string[];
}

export interface JumpDocumentItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  originId?: string;
  tags: string[];
  requires?: string[];
}

export interface JumpDocumentDrawback {
  id: string;
  name: string;
  description: string;
  bonusCP: number;
  tags: string[];
  requires?: string[];
}

export interface JumpDocumentCompanion {
  id: string;
  name: string;
  description: string;
  cost: number;
  originId?: string;
  budget: number;
  tags: string[];
  requires?: string[];
}

export interface JumpDocumentScenario {
  id: string;
  name: string;
  description: string;
  rewardCP: number;
  rewardDescription: string;
  tags: string[];
  requires?: string[];
}

export interface JumpDocumentAltForm {
  id: string;
  name: string;
  description: string;
  cost: number;
  tags: string[];
}

export interface JumpDocumentSupplement {
  id: string;
  name: string;
  description: string;
  type: "supplement" | "jump" | "gauntlet" | "end-jump";
  budget: number;
  origins: JumpDocumentOrigin[];
  perks: JumpDocumentPerk[];
  items: JumpDocumentItem[];
  drawbacks: JumpDocumentDrawback[];
  companions: JumpDocumentCompanion[];
  scenarios: JumpDocumentScenario[];
  altForms: JumpDocumentAltForm[];
}

export interface JumpDocumentExtraction {
  documentId: string;
  pageNumber: number | null;
  extractionMethod: "pdf-text" | "vision";
  title: string | null;
  description: string | null;
  supplements: JumpDocumentSupplement[];
  warnings: string[];
}

export interface JumpDocumentMerged {
  title: string;
  description: string;
  supplements: JumpDocumentSupplement[];
  mergedAt: string;
  pageCount: number;
}

export interface JumpDocumentAnalysis {
  tierList: Record<string, { name: string; tier: "S" | "A" | "B" | "C" | "D" | "F"; analysis: string }[]>;
  synergyPairs: Array<{ entryIds: string[]; description: string; combinedValue: "high" | "medium" | "low" }>;
  buildArchetypes: Array<{
    name: string;
    description: string;
    recommendedEntryIds: string[];
    totalCost: number;
    strengths: string[];
    weaknesses: string[];
  }>;
  overallSummary: string;
  analyzedAt: string;
}