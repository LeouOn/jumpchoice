import type { ChainOfThoughtMode } from "../types/narrative.js";

export const DEFAULT_COT_MODES: ChainOfThoughtMode[] = [
  {
    id: "main",
    name: "Main CoT",
    description: "Full 5-step reasoning process for complex scenarios",
    phases: [
      "Analyze the user's input and identify key elements (characters, setting, conflict, intent)",
      "Consider relevant context from previous messages and world state",
      "Plan the narrative direction and character responses",
      "Draft the response focusing on show-don't-tell and character voice",
      "Review and refine for consistency, tone, and engagement",
    ],
    cotTag: "think",
  },
  {
    id: "fast",
    name: "Fast CoT",
    description: "Streamlined 3-step reasoning for quick responses",
    phases: [
      "Identify the core request and key context",
      "Plan the response direction",
      "Draft and refine the response",
    ],
    cotTag: "think",
  },
  {
    id: "creative",
    name: "Creative CoT",
    description: "Enhanced creative reasoning for complex narrative scenarios",
    phases: [
      "Analyze the narrative context, character motivations, and dramatic potential",
      "Brainstorm multiple possible directions and evaluate their impact",
      "Select the most compelling path and outline key beats",
      "Draft the response with attention to prose quality and emotional resonance",
      "Polish for rhythm, imagery, and thematic coherence",
    ],
    cotTag: "think",
  },
];
