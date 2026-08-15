import type { NarrativePrinciples, NarratorPersona, ChainOfThoughtMode } from '@jumpchoice/shared';
import { DEFAULT_NARRATIVE_PRINCIPLES } from '@jumpchoice/shared';
import type { PersonaManager } from './persona-manager.service.js';
import type { COTManager } from './cot-manager.service.js';

export class NarrativeEngine {
  private principles: NarrativePrinciples;
  private persona: NarratorPersona | null = null;
  private personaManager: PersonaManager | null = null;
  private cotMode: ChainOfThoughtMode | null = null;
  private cotManager: COTManager | null = null;

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
    if (!persona.prompt || persona.prompt.trim().length === 0) {
      throw new Error('Persona prompt must be non-empty');
    }
    this.persona = persona;
  }

  getPersona(): NarratorPersona | null {
    return this.persona;
  }

  setPersonaManager(manager: PersonaManager): void {
    this.personaManager = manager;
  }

  getPersonaManager(): PersonaManager | null {
    return this.personaManager;
  }

  setCOTMode(mode: ChainOfThoughtMode): void {
    if (!mode.phases || mode.phases.length === 0) {
      throw new Error('COT mode must have at least one phase');
    }
    this.cotMode = mode;
  }

  getCOTMode(): ChainOfThoughtMode | null {
    return this.cotMode;
  }

  setCOTManager(manager: COTManager): void {
    this.cotManager = manager;
  }

  getCOTManager(): COTManager | null {
    return this.cotManager;
  }

  buildSystemPrompt(): string {
    let prompt = this.principles.description;

    const managerPersonaPrompt = this.personaManager?.buildPersonaPrompt();
    if (managerPersonaPrompt) {
      prompt += `\n\n${managerPersonaPrompt}`;
    } else if (this.persona) {
      prompt += `\n\nNARRATOR PERSONA:\n${this.persona.prompt}`;
    }

    const managerCOTPrompt = this.cotManager?.buildCOTPrompt();
    if (managerCOTPrompt) {
      prompt += `\n\n${managerCOTPrompt}`;
    } else if (this.cotMode) {
      prompt += `\n\nCHAIN OF THOUGHT:\n${this.buildCOTPrompt()}`;
    }

    return prompt;
  }

  private buildCOTPrompt(): string {
    if (!this.cotMode) return '';

    const tag = this.cotMode.cotTag;
    return `Before writing your response, think through these phases:
${this.cotMode.phases.map((phase, i) => `${i + 1}. ${phase}`).join('\n')}

Write your thinking in <${tag}> tags, then your response.`;
  }
}
