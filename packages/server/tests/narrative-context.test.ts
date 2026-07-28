import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { NarrativeContext } from "../src/services/narrative/narrative-context.service.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Narrative Context", () => {
  let context: NarrativeContext;
  let config: { defaultPersona: string; defaultCOTMode: string };

  beforeAll(() => {
    const configPath = join(__dirname, "../narrative-config.json");
    config = JSON.parse(readFileSync(configPath, "utf-8"));
  });

  beforeEach(() => {
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
      expect(prompt).toMatch(/NARRATOR PERSONA[\s\S]*noir/i);
    });

    it("should include COT when set", () => {
      const prompt = context.buildSystemPrompt();
      expect(prompt).toContain("CHAIN OF THOUGHT");
      expect(prompt).toMatch(/CHAIN OF THOUGHT\s*\([^)]*main[^)]*\)/i);
    });

    it("should change persona dynamically", () => {
      let prompt = context.buildSystemPrompt();
      expect(prompt).toMatch(/NARRATOR PERSONA[\s\S]*noir/i);

      context.setPersona("cozy");
      prompt = context.buildSystemPrompt();
      expect(prompt).toMatch(/NARRATOR PERSONA[\s\S]*cozy/i);
    });

    it("should change COT mode dynamically", () => {
      let prompt = context.buildSystemPrompt();
      expect(prompt).toMatch(/CHAIN OF THOUGHT\s*\([^)]*main[^)]*\)/i);

      context.setCOTMode("fast");
      prompt = context.buildSystemPrompt();
      expect(prompt).toMatch(/CHAIN OF THOUGHT\s*\([^)]*fast[^)]*\)/i);
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

    it("should throw on invalid persona", () => {
      expect(() => context.setPersona("invalid")).toThrow();
    });

    it("should throw on invalid COT mode", () => {
      expect(() => context.setCOTMode("invalid")).toThrow();
    });

    it("should include persona but not COT when only persona is set", () => {
      const partialContext = new NarrativeContext();
      partialContext.setPersona("noir");
      const prompt = partialContext.buildSystemPrompt();
      expect(prompt).toMatch(/NARRATOR PERSONA[\s\S]*noir/i);
      expect(prompt).not.toContain("CHAIN OF THOUGHT");
    });

    it("should include COT but not persona when only COT is set", () => {
      const partialContext = new NarrativeContext();
      partialContext.setCOTMode("main");
      const prompt = partialContext.buildSystemPrompt();
      expect(prompt).not.toContain("NARRATOR PERSONA");
      expect(prompt).toMatch(/CHAIN OF THOUGHT\s*\([^)]*main[^)]*\)/i);
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
      expect(prompt).toMatch(/1\.\s+\w+/);
      expect(prompt).toMatch(/2\.\s+\w+/);
      expect(prompt).toMatch(/3\.\s+\w+/);
      expect(prompt).toMatch(/4\.\s+\w+/);
      expect(prompt).toMatch(/5\.\s+\w+/);
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
