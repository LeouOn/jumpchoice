import type { ChainOfThoughtMode } from "@jumpchoice/shared";
import { DEFAULT_COT_MODES } from "@jumpchoice/shared";

export class COTManager {
  private modes: ChainOfThoughtMode[];
  private activeModeId: string | null = null;

  constructor(modes?: ChainOfThoughtMode[]) {
    this.modes = modes || DEFAULT_COT_MODES;
  }

  getAvailableModes(): ChainOfThoughtMode[] {
    return this.modes;
  }

  setActiveMode(modeId: string): void {
    const mode = this.modes.find((m) => m.id === modeId);
    if (!mode) {
      throw new Error(`CoT mode not found: ${modeId}`);
    }
    this.activeModeId = modeId;
  }

  getActiveMode(): ChainOfThoughtMode | null {
    if (!this.activeModeId) return null;
    return this.modes.find((m) => m.id === this.activeModeId) || null;
  }

  clearActiveMode(): void {
    this.activeModeId = null;
  }

  buildCOTPrompt(): string {
    const mode = this.getActiveMode();
    if (!mode) return "";

    const phasesText = mode.phases.map((phase, i) => `${i + 1}. ${phase}`).join("\n");

    return `CHAIN OF THOUGHT (${mode.name}):
Before responding, work through these phases inside <${mode.cotTag}> tags:

${phasesText}

After completing your reasoning, close the </${mode.cotTag}> tag and provide your response.`;
  }
}
