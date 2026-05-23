import { describe, it, expect } from "vitest";
import { PersonaManager } from "../src/services/narrative/persona-manager.service.js";
import type { NarratorPersona } from "@jumpchoice/shared";

describe("PersonaManager", () => {
  it("should have default personas available", () => {
    const manager = new PersonaManager();
    const personas = manager.getAvailablePersonas();

    expect(personas.length).toBeGreaterThan(0);
    expect(personas.find((p) => p.id === "default")).toBeDefined();
  });

  it("should set and get active persona", () => {
    const manager = new PersonaManager();
    manager.setActivePersona("noir");

    const active = manager.getActivePersona();
    expect(active?.id).toBe("noir");
  });

  it("should reject invalid persona id", () => {
    const manager = new PersonaManager();

    expect(() => manager.setActivePersona("nonexistent")).toThrow();
  });

  it("should build structured persona prompt with all sections", () => {
    const manager = new PersonaManager();
    manager.setActivePersona("noir");

    const prompt = manager.buildPersonaPrompt();
    expect(prompt).toContain("NARRATOR PERSONA: Noir Narrator");
    expect(prompt).toContain("STYLE:");
    expect(prompt).toContain("- Prose:");
    expect(prompt).toContain("- Dialogue:");
    expect(prompt).toContain("- Tone:");
  });

  it("should return empty string when no active persona", () => {
    const manager = new PersonaManager();
    expect(manager.buildPersonaPrompt()).toBe("");
  });

  it("should clear active persona", () => {
    const manager = new PersonaManager();
    manager.setActivePersona("noir");
    expect(manager.getActivePersona()?.id).toBe("noir");

    manager.clearActivePersona();
    expect(manager.getActivePersona()).toBeNull();
    expect(manager.buildPersonaPrompt()).toBe("");
  });

  it("should accept custom personas in constructor", () => {
    const customPersonas: NarratorPersona[] = [
      {
        id: "custom-1",
        name: "Custom Narrator",
        description: "A custom test narrator",
        prompt: "Custom prompt text",
        style: { prose: "custom prose", dialogue: "custom dialogue", tone: "custom tone" },
      },
    ];

    const manager = new PersonaManager(customPersonas);
    const personas = manager.getAvailablePersonas();

    expect(personas).toHaveLength(1);
    expect(personas[0].id).toBe("custom-1");
    expect(personas.find((p) => p.id === "default")).toBeUndefined();

    manager.setActivePersona("custom-1");
    expect(manager.getActivePersona()?.name).toBe("Custom Narrator");
  });
});
