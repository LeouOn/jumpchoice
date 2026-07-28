import type { TutorPersona, CefrLevel } from "@jumpchoice/shared";
import { TUTOR_PERSONAS, LANGUAGE_LEARNING_NARRATIVE_PRINCIPLES } from "@jumpchoice/shared";

export interface LanguageLearningConfig {
  targetLanguage: string;
  languageCode: string;
  nativeLanguage: string;
  tutorPersona: TutorPersona;
  proficiencyLevel: CefrLevel | null;
}

export function buildLanguageLearningSystemPrompt(config: LanguageLearningConfig, characterName: string): string {
  const persona = TUTOR_PERSONAS[config.tutorPersona];
  const levelLine = config.proficiencyLevel
    ? `The user is at CEFR level ${config.proficiencyLevel}. Adjust vocabulary and grammar to match or slightly challenge.`
    : `The user's level is unknown. Start with simple, clear language and adapt based on their responses.`;

  return `You are ${characterName}, a language tutor helping the user learn ${config.targetLanguage}.
The user's native language is ${config.nativeLanguage}.

PERSONA: ${persona.label} — ${persona.description}
CORRECTION STYLE: ${persona.correctionTone}
CODE-SWITCHING: ${persona.codeSwitching}

${levelLine}

PRINCIPLES:
${LANGUAGE_LEARNING_NARRATIVE_PRINCIPLES.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Engage in natural conversation. When the user makes errors, follow your correction style above.`;
}
