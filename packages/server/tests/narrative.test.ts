import { describe, it, expect } from "vitest";
import { NarrativeEngine } from "../src/services/narrative/narrative-engine.service.js";
import { PersonaManager } from "../src/services/narrative/persona-manager.service.js";
import type { NarratorPersona, ChainOfThoughtMode } from "@jumpchoice/shared";

const testPersona: NarratorPersona = {
  id: "noir-narrator",
  name: "Noir Narrator",
  description: "A gritty noir-style narrator",
  prompt: "You narrate in a dark, atmospheric noir style with short punchy sentences.",
  style: {
    prose: "terse and atmospheric",
    dialogue: "clipped, hardboiled",
    tone: "cynical",
  },
};

const testCOTMode: ChainOfThoughtMode = {
  id: "standard",
  name: "Standard COT",
  description: "Standard chain of thought reasoning",
  phases: ["Analyze the scene", "Consider NPC motivations", "Draft narrative beat"],
  cotTag: "think",
};

describe("NarrativeEngine", () => {
  describe("default principles", () => {
    it("should enforce anti-assistant bias", () => {
      const engine = new NarrativeEngine();
      const principles = engine.getPrinciples();
      expect(principles.description).toContain("not a helpful assistant");
    });

    it("should enforce knowledge firewall", () => {
      const engine = new NarrativeEngine();
      const principles = engine.getPrinciples();
      expect(principles.description).toContain("NPCs only know");
    });

    it("should preserve user agency", () => {
      const engine = new NarrativeEngine();
      const principles = engine.getPrinciples();
      expect(principles.description).toContain("never decide user");
    });

    it("should enforce NPC autonomy", () => {
      const engine = new NarrativeEngine();
      const principles = engine.getPrinciples();
      expect(principles.description).toContain("NPCs have their own");
    });

    it("should enforce cultural anchoring", () => {
      const engine = new NarrativeEngine();
      const principles = engine.getPrinciples();
      expect(principles.description).toContain("real brand names");
    });

    it("should enforce narrative drive", () => {
      const engine = new NarrativeEngine();
      const principles = engine.getPrinciples();
      expect(principles.description).toContain("drive the story forward");
    });

    it("should enforce moral complexity", () => {
      const engine = new NarrativeEngine();
      const principles = engine.getPrinciples();
      expect(principles.description).toContain("morally grey");
    });
  });

  describe("custom principle overrides", () => {
    it("should accept a custom description override", () => {
      const engine = new NarrativeEngine({ description: "Custom narrator rules" });
      expect(engine.getPrinciples().description).toBe("Custom narrator rules");
    });

    it("should merge partial overrides with defaults", () => {
      const engine = new NarrativeEngine({ description: "Override" });
      const principles = engine.getPrinciples();
      expect(principles.description).toBe("Override");
    });

    it("should use defaults when no override provided", () => {
      const engine = new NarrativeEngine();
      const principles = engine.getPrinciples();
      expect(principles.description).toContain("ANTI-ASSISTANT BIAS");
    });
  });

  describe("persona integration", () => {
    it("should set and get persona", () => {
      const engine = new NarrativeEngine();
      engine.setPersona(testPersona);
      expect(engine.getPersona()).toEqual(testPersona);
    });

    it("should include persona prompt in buildSystemPrompt", () => {
      const engine = new NarrativeEngine();
      engine.setPersona(testPersona);
      const prompt = engine.buildSystemPrompt();
      expect(prompt).toContain("NARRATOR PERSONA:");
      expect(prompt).toContain(testPersona.prompt);
    });

    it("should not include persona section when no persona set", () => {
      const engine = new NarrativeEngine();
      const prompt = engine.buildSystemPrompt();
      expect(prompt).not.toContain("NARRATOR PERSONA:");
    });

    it("should reject persona with empty prompt", () => {
      const engine = new NarrativeEngine();
      const badPersona = { ...testPersona, prompt: "" };
      expect(() => engine.setPersona(badPersona)).toThrow("Persona prompt must be non-empty");
    });

    it("should reject persona with whitespace-only prompt", () => {
      const engine = new NarrativeEngine();
      const badPersona = { ...testPersona, prompt: "   " };
      expect(() => engine.setPersona(badPersona)).toThrow("Persona prompt must be non-empty");
    });
  });

  describe("PersonaManager integration", () => {
    it("should use PersonaManager active persona in buildSystemPrompt", () => {
      const engine = new NarrativeEngine();
      const manager = new PersonaManager();
      manager.setActivePersona("noir");
      engine.setPersonaManager(manager);

      const prompt = engine.buildSystemPrompt();
      expect(prompt).toContain("NARRATOR PERSONA:");
      expect(prompt).toContain("noir");
    });

    it("should prefer PersonaManager persona over direct persona", () => {
      const engine = new NarrativeEngine();
      engine.setPersona(testPersona);

      const manager = new PersonaManager();
      manager.setActivePersona("cozy");
      engine.setPersonaManager(manager);

      const prompt = engine.buildSystemPrompt();
      expect(prompt).toContain("cozy");
      expect(prompt).not.toContain(testPersona.prompt);
    });

    it("should fall back to direct persona when manager has no active", () => {
      const engine = new NarrativeEngine();
      engine.setPersona(testPersona);

      const manager = new PersonaManager();
      engine.setPersonaManager(manager);

      const prompt = engine.buildSystemPrompt();
      expect(prompt).toContain(testPersona.prompt);
    });

    it("should set and get PersonaManager", () => {
      const engine = new NarrativeEngine();
      expect(engine.getPersonaManager()).toBeNull();

      const manager = new PersonaManager();
      engine.setPersonaManager(manager);
      expect(engine.getPersonaManager()).toBe(manager);
    });
  });

  describe("COT mode integration", () => {
    it("should set and get COT mode", () => {
      const engine = new NarrativeEngine();
      engine.setCOTMode(testCOTMode);
      expect(engine.getCOTMode()).toEqual(testCOTMode);
    });

    it("should include COT prompt in buildSystemPrompt", () => {
      const engine = new NarrativeEngine();
      engine.setCOTMode(testCOTMode);
      const prompt = engine.buildSystemPrompt();
      expect(prompt).toContain("CHAIN OF THOUGHT:");
      expect(prompt).toContain("1. Analyze the scene");
      expect(prompt).toContain("2. Consider NPC motivations");
      expect(prompt).toContain("3. Draft narrative beat");
    });

    it("should use cotTag from COT mode", () => {
      const engine = new NarrativeEngine();
      engine.setCOTMode(testCOTMode);
      const prompt = engine.buildSystemPrompt();
      expect(prompt).toContain("<think>");
    });

    it("should use custom cotTag", () => {
      const engine = new NarrativeEngine();
      const customCOT = { ...testCOTMode, cotTag: "reasoning" };
      engine.setCOTMode(customCOT);
      const prompt = engine.buildSystemPrompt();
      expect(prompt).toContain("<reasoning>");
    });

    it("should not include COT section when no mode set", () => {
      const engine = new NarrativeEngine();
      const prompt = engine.buildSystemPrompt();
      expect(prompt).not.toContain("CHAIN OF THOUGHT:");
    });

    it("should reject COT mode with empty phases", () => {
      const engine = new NarrativeEngine();
      const badMode = { ...testCOTMode, phases: [] };
      expect(() => engine.setCOTMode(badMode)).toThrow("COT mode must have at least one phase");
    });
  });

  describe("buildSystemPrompt composition", () => {
    it("should combine principles, persona, and COT", () => {
      const engine = new NarrativeEngine();
      engine.setPersona(testPersona);
      engine.setCOTMode(testCOTMode);
      const prompt = engine.buildSystemPrompt();
      expect(prompt).toContain("ANTI-ASSISTANT BIAS");
      expect(prompt).toContain("NARRATOR PERSONA:");
      expect(prompt).toContain("CHAIN OF THOUGHT:");
    });

    it("should place persona before COT", () => {
      const engine = new NarrativeEngine();
      engine.setPersona(testPersona);
      engine.setCOTMode(testCOTMode);
      const prompt = engine.buildSystemPrompt();
      const personaIndex = prompt.indexOf("NARRATOR PERSONA:");
      const cotIndex = prompt.indexOf("CHAIN OF THOUGHT:");
      expect(personaIndex).toBeLessThan(cotIndex);
    });
  });
});
