import { describe, it, expect } from "vitest";
import { NarrativeEngine } from "../src/services/narrative/narrative-engine.js";

describe("NarrativeEngine", () => {
  it("should enforce anti-assistant bias", () => {
    const engine = new NarrativeEngine();
    const principles = engine.getPrinciples();

    expect(principles.antiAssistantBias).toBe(true);
    expect(principles.description).toContain("not a helpful assistant");
  });

  it("should enforce knowledge firewall", () => {
    const engine = new NarrativeEngine();
    const principles = engine.getPrinciples();

    expect(principles.knowledgeFirewall).toBe(true);
    expect(principles.description).toContain("NPCs only know");
  });

  it("should preserve user agency", () => {
    const engine = new NarrativeEngine();
    const principles = engine.getPrinciples();

    expect(principles.userAgency).toBe(true);
    expect(principles.description).toContain("never decide user");
  });

  it("should enforce NPC autonomy", () => {
    const engine = new NarrativeEngine();
    const principles = engine.getPrinciples();

    expect(principles.npcAutonomy).toBe(true);
    expect(principles.description).toContain("NPCs have their own");
  });
});
