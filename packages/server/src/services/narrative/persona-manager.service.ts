import type { NarratorPersona } from "@jumpchoice/shared";
import { DEFAULT_NARRATOR_PERSONAS } from "@jumpchoice/shared";

export class PersonaManager {
  private personas: NarratorPersona[];
  private activePersonaId: string | null = null;

  constructor(personas?: NarratorPersona[]) {
    this.personas = personas || DEFAULT_NARRATOR_PERSONAS;
  }

  getAvailablePersonas(): NarratorPersona[] {
    return this.personas;
  }

  setActivePersona(personaId: string): void {
    const persona = this.personas.find((p) => p.id === personaId);
    if (!persona) {
      throw new Error(`Persona not found: ${personaId}`);
    }
    this.activePersonaId = personaId;
  }

  getActivePersona(): NarratorPersona | null {
    if (!this.activePersonaId) return null;
    return this.personas.find((p) => p.id === this.activePersonaId) || null;
  }

  clearActivePersona(): void {
    this.activePersonaId = null;
  }

  buildPersonaPrompt(): string {
    const persona = this.getActivePersona();
    if (!persona) return "";

    return `NARRATOR PERSONA: ${persona.name}
${persona.prompt}

STYLE:
- Prose: ${persona.style.prose}
- Dialogue: ${persona.style.dialogue}
- Tone: ${persona.style.tone}`;
  }
}
