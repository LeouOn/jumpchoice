import { describe, it, expect, vi } from "vitest";

vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { buildAdversaryPrompt } from "../src/services/cyoa/cyoa-adversary.js";

const baseChoices = [
  { id: "c1", name: "Fireball", category: "magic", pointCost: 10, tier: "A", stealth: false },
  { id: "c2", name: "Shadow Step", category: "stealth", pointCost: 8, tier: "B", stealth: true },
  { id: "c3", name: "Healing Aura", category: "magic", pointCost: 12, tier: "A", stealth: true },
  { id: "c4", name: "Sword", category: "combat", pointCost: 6, tier: "C", stealth: false },
];

describe("buildAdversaryPrompt", () => {
  it("returns a non-empty string", () => {
    const prompt = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1", "c4"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("hides stealth choices from the Adversary when stealthDisabled is false", () => {
    const prompt = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1", "c2", "c4"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    expect(prompt).toContain("Fireball");
    expect(prompt).toContain("Sword");
    expect(prompt).not.toContain("Shadow Step");
    expect(prompt).toContain("1 ability hidden from you");
  });

  it("shows all choices when stealthDisabled is true (extreme difficulty)", () => {
    const prompt = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1", "c2", "c4"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: true },
    );
    expect(prompt).toContain("Fireball");
    expect(prompt).toContain("Shadow Step");
    expect(prompt).toContain("Sword");
    expect(prompt).not.toContain("hidden from you");
  });

  it("does not include hidden count when no stealth choices selected", () => {
    const prompt = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1", "c4"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    expect(prompt).not.toContain("hidden from you");
  });

  it("includes the player character name", () => {
    const prompt = buildAdversaryPrompt(
      { name: "The Avenger", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    expect(prompt).toContain("The Avenger");
  });

  it("includes devil-on-the-shoulder instructions", () => {
    const prompt = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    expect(prompt).toContain("Adversary");
    expect(prompt).toContain("exploit");
    expect(prompt).toContain("complication");
  });

  it("adapts tone based on Director aggression", () => {
    const passive = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 1, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    const merciless = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices: baseChoices },
      { directorAggression: 5, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    expect(passive).not.toBe(merciless);
  });

  it("handles choices with null pointCost gracefully", () => {
    const choices = [{ id: "c1", name: "Free", category: "magic", pointCost: null, tier: "B", stealth: false }];
    const prompt = buildAdversaryPrompt(
      { name: "Hero", selectedChoiceIds: ["c1"] },
      { name: "Doc", choices },
      { directorAggression: 3, worldEscalation: 3, informationLeakage: 3, adversaryEnabled: true, stealthDisabled: false },
    );
    expect(prompt).toContain("Free");
    expect(prompt).toContain("0 pts");
  });
});
