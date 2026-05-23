export interface NarrativePrinciples {
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
  cotTag: string;
}
