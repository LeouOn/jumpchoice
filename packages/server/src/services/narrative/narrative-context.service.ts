import { NarrativeEngine } from './narrative-engine.service.js';
import { PersonaManager } from './persona-manager.service.js';
import { COTManager } from './cot-manager.service.js';

export class NarrativeContext {
  private engine: NarrativeEngine;
  private personaManager: PersonaManager;
  private cotManager: COTManager;

  constructor() {
    this.engine = new NarrativeEngine();
    this.personaManager = new PersonaManager();
    this.cotManager = new COTManager();

    this.engine.setPersonaManager(this.personaManager);
    this.engine.setCOTManager(this.cotManager);
  }

  setPersona(personaId: string): void {
    this.personaManager.setActivePersona(personaId);
  }

  setCOTMode(modeId: string): void {
    this.cotManager.setActiveMode(modeId);
  }

  getPersonaManager(): PersonaManager {
    return this.personaManager;
  }

  getCOTManager(): COTManager {
    return this.cotManager;
  }

  getEngine(): NarrativeEngine {
    return this.engine;
  }

  buildSystemPrompt(): string {
    return this.engine.buildSystemPrompt();
  }
}
