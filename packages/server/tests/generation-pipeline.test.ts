import { describe, it, expect, beforeEach } from "vitest";
import { NarrativeContext } from "../src/services/narrative/narrative-context.service.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Generation Pipeline Integration", () => {
  let context: NarrativeContext;
  let config: { defaultPersona: string; defaultCOTMode: string };

  beforeEach(() => {
    const configPath = join(__dirname, "../narrative-config.json");
    config = JSON.parse(readFileSync(configPath, "utf-8"));

    context = new NarrativeContext();
    context.setPersona(config.defaultPersona);
    context.setCOTMode(config.defaultCOTMode);
  });

  describe("Narrative Context Configuration", () => {
    it("should load default persona from config", () => {
      const persona = context.getPersonaManager().getActivePersona();
      expect(persona?.id).toBe(config.defaultPersona);
    });

    it("should load default COT mode from config", () => {
      const mode = context.getCOTManager().getActiveMode();
      expect(mode?.id).toBe(config.defaultCOTMode);
    });

    it("should allow overriding persona", () => {
      context.setPersona("cozy");
      const persona = context.getPersonaManager().getActivePersona();
      expect(persona?.id).toBe("cozy");
    });

    it("should allow overriding COT mode", () => {
      context.setCOTMode("fast");
      const mode = context.getCOTManager().getActiveMode();
      expect(mode?.id).toBe("fast");
    });
  });

  describe("System Prompt Generation", () => {
    it("should include narrative principles", () => {
      const prompt = context.buildSystemPrompt();
      expect(prompt).toContain("ANTI-ASSISTANT BIAS");
      expect(prompt).toContain("KNOWLEDGE FIREWALL");
      expect(prompt).toContain("USER AGENCY");
    });

    it("should include persona when set", () => {
      const prompt = context.buildSystemPrompt();
      expect(prompt).toContain("NARRATOR PERSONA");
      expect(prompt).toContain("Noir Narrator");
    });

    it("should include COT when set", () => {
      const prompt = context.buildSystemPrompt();
      expect(prompt).toContain("CHAIN OF THOUGHT");
      expect(prompt).toContain("Main CoT");
    });

    it("should change persona dynamically", () => {
      let prompt = context.buildSystemPrompt();
      expect(prompt).toContain("Noir Narrator");

      context.setPersona("cozy");
      prompt = context.buildSystemPrompt();
      expect(prompt).toContain("Cozy Narrator");
    });

    it("should change COT mode dynamically", () => {
      let prompt = context.buildSystemPrompt();
      expect(prompt).toContain("Main CoT");

      context.setCOTMode("fast");
      prompt = context.buildSystemPrompt();
      expect(prompt).toContain("Fast CoT");
    });
  });

  describe("Edge Cases", () => {
    it("should handle no persona set", () => {
      const emptyContext = new NarrativeContext();
      const prompt = emptyContext.buildSystemPrompt();
      expect(prompt).toContain("ANTI-ASSISTANT BIAS");
      expect(prompt).not.toContain("NARRATOR PERSONA");
    });

    it("should handle no COT mode set", () => {
      const emptyContext = new NarrativeContext();
      const prompt = emptyContext.buildSystemPrompt();
      expect(prompt).toContain("ANTI-ASSISTANT BIAS");
      expect(prompt).not.toContain("CHAIN OF THOUGHT");
    });

    it("should handle invalid persona gracefully", () => {
      expect(() => context.setPersona("invalid")).toThrow();
    });

    it("should handle invalid COT mode gracefully", () => {
      expect(() => context.setCOTMode("invalid")).toThrow();
    });
  });

  describe("Prompt Structure", () => {
    it("should have proper section ordering", () => {
      const prompt = context.buildSystemPrompt();
      const principlesIdx = prompt.indexOf("ANTI-ASSISTANT BIAS");
      const personaIdx = prompt.indexOf("NARRATOR PERSONA");
      const cotIdx = prompt.indexOf("CHAIN OF THOUGHT");

      expect(principlesIdx).toBeLessThan(personaIdx);
      expect(personaIdx).toBeLessThan(cotIdx);
    });

    it("should include all COT phases for main mode", () => {
      const prompt = context.buildSystemPrompt();
      expect(prompt).toContain("1.");
      expect(prompt).toContain("2.");
      expect(prompt).toContain("3.");
      expect(prompt).toContain("4.");
      expect(prompt).toContain("5.");
    });

    it("should include persona style information", () => {
      const prompt = context.buildSystemPrompt();
      expect(prompt).toContain("STYLE:");
      expect(prompt).toContain("Prose:");
      expect(prompt).toContain("Dialogue:");
      expect(prompt).toContain("Tone:");
    });

    it("should include COT tag instruction", () => {
      const prompt = context.buildSystemPrompt();
      expect(prompt).toContain("<think>");
      expect(prompt).toContain("</think>");
    });
  });
});
