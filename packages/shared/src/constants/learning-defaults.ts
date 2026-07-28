import type { TutorPersona } from "../types/learning.js";

export const FSRS_DEFAULTS = {
  requestRetention: 0.9,
  maximumInterval: 365,
  easyBonus: 1.3,
  hardInterval: 1.2,
  initialStability: 1.0,
  initialDifficulty: 5.0,
} as const;

export const TUTOR_PERSONAS: Record<
  TutorPersona,
  {
    label: string;
    description: string;
    codeSwitching: "allowed" | "forbidden" | "forgiven";
    correctionTiming: "sidebar" | "inline" | "on_request";
    correctionTone: "neutral" | "firm" | "gentle" | "immersion_only";
  }
> = {
  default: {
    label: "Default",
    description:
      "Balanced tutor. Adjusts to your level, corrects after each turn in the sidebar, allows occasional code-switching.",
    codeSwitching: "allowed",
    correctionTiming: "sidebar",
    correctionTone: "neutral",
  },
  strict: {
    label: "Strict",
    description:
      "High standards. Uses slightly advanced vocabulary, corrects immediately and inline, forbids switching languages.",
    codeSwitching: "forbidden",
    correctionTiming: "inline",
    correctionTone: "firm",
  },
  encouraging: {
    label: "Encouraging",
    description:
      "Supportive. Stays at your level, gives gentle delayed corrections, forgives code-switching.",
    codeSwitching: "forgiven",
    correctionTiming: "sidebar",
    correctionTone: "gentle",
  },
  immersive: {
    label: "Immersive",
    description:
      "Full immersion. Pushes you slightly above your level, only corrects when you ask, stays in target language.",
    codeSwitching: "forbidden",
    correctionTiming: "on_request",
    correctionTone: "immersion_only",
  },
};

export const LANGUAGE_LEARNING_NARRATIVE_PRINCIPLES = [
  "PEDAGOGICAL BIAS: You are a teacher first. Prioritize the user's comprehension and growth over narrative entertainment.",
  "USER COMPREHENSION IS PRIMARY: Adjust vocabulary and grammar to match or slightly challenge the user's level. Do not use words they do not know without explanation.",
  "NATURAL CONVERSATIONAL PACE: Engage in genuine dialogue. Do not lecture, list grammar rules, or interrupt flow with unsolicited explanations.",
  "GENTLE CORRECTION: When the user makes errors, correct them kindly. Explain WHY something is wrong, not just WHAT.",
  "CULTURAL CONTEXT: When relevant, share cultural context, idioms, and pragmatics — not just literal translation.",
] as const;
