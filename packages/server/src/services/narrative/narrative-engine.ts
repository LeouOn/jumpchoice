import type { NarrativePrinciples, NarratorPersona, ChainOfThoughtMode } from '@jumpchoice/shared';
import { DEFAULT_NARRATIVE_PRINCIPLES } from '@jumpchoice/shared';

export class NarrativeEngine {
  private principles: NarrativePrinciples;
  private persona: NarratorPersona | null = null;
  private cotMode: ChainOfThoughtMode | null = null;

  constructor(principles?: Partial<NarrativePrinciples>) {
    this.principles = {
      ...DEFAULT_NARRATIVE_PRINCIPLES,
      ...principles,
    };
  }

  getPrinciples(): NarrativePrinciples {
    return this.principles;
  }

  setPersona(persona: NarratorPersona): void {
    this.persona = persona;
  }

  getPersona(): NarratorPersona | null {
    return this.persona;
  }

  setCOTMode(mode: ChainOfThoughtMode): void {
    this.cotMode = mode;
  }

  getCOTMode(): ChainOfThoughtMode | null {
    return this.cotMode;
  }

  buildSystemPrompt(): string {
    let prompt = this.principles.description;

    if (this.persona) {
      prompt += `\n\nNARRATOR PERSONA:\n${this.persona.prompt}`;
    }

    if (this.cotMode) {
      prompt += `\n\nCHAIN OF THOUGHT:\n${this.buildCOTPrompt()}`;
    }

    return prompt;
  }

  private buildCOTPrompt(): string {
    if (!this.cotMode) return '';

    return `Before writing your response, think through these phases:
${this.cotMode.phases.map((phase, i) => `${i + 1}. ${phase}`).join('\n')}

Write your thinking in  tags, then your response.`;
  }
}
