export interface NarrativePrinciples {
  antiAssistantBias: boolean;
  knowledgeFirewall: boolean;
  userAgency: boolean;
  npcAutonomy: boolean;
  culturalAnchoring: boolean;
  narrativeDrive: boolean;
  moralComplexity: boolean;
  description: string;
}

export interface NarratorPersona {
  id: string;
  name: string;
  description: string;
  prompt: string;
  style: {
    prose: string;
    dialogue: string;
    tone: string;
  };
}

export interface ChainOfThoughtMode {
  id: string;
  name: string;
  description: string;
  phases: string[];
}
