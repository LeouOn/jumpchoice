import { describe, it, expect } from "vitest";
import { COTManager } from "../src/services/narrative/cot-manager.service.js";
import type { ChainOfThoughtMode } from "@jumpchoice/shared";

describe("COTManager", () => {
  it("should have default modes available", () => {
    const manager = new COTManager();
    const modes = manager.getAvailableModes();

    expect(modes.length).toBeGreaterThan(0);
    expect(modes.find((m) => m.id === "main")).toBeDefined();
    expect(modes.find((m) => m.id === "fast")).toBeDefined();
  });

  it("should set and get active mode", () => {
    const manager = new COTManager();
    manager.setActiveMode("fast");

    const active = manager.getActiveMode();
    expect(active?.id).toBe("fast");
  });

  it("should reject invalid mode id", () => {
    const manager = new COTManager();

    expect(() => manager.setActiveMode("nonexistent")).toThrow();
  });

  it("should build CoT prompt with phases", () => {
    const manager = new COTManager();
    manager.setActiveMode("main");

    const prompt = manager.buildCOTPrompt();
    expect(prompt).toContain("CHAIN OF THOUGHT");
    expect(prompt).toContain("1.");
    expect(prompt).toContain("2.");
  });

  it("should return empty prompt when no mode active", () => {
    const manager = new COTManager();

    const prompt = manager.buildCOTPrompt();
    expect(prompt).toBe("");
  });

  it("should clear active mode", () => {
    const manager = new COTManager();
    manager.setActiveMode("fast");
    expect(manager.getActiveMode()?.id).toBe("fast");

    manager.clearActiveMode();
    expect(manager.getActiveMode()).toBeNull();
    expect(manager.buildCOTPrompt()).toBe("");
  });

  it("should accept custom modes in constructor", () => {
    const customModes: ChainOfThoughtMode[] = [
      {
        id: "custom-1",
        name: "Custom CoT",
        description: "A custom test mode",
        phases: ["Step one", "Step two"],
        cotTag: "think",
      },
    ];

    const manager = new COTManager(customModes);
    const modes = manager.getAvailableModes();

    expect(modes).toHaveLength(1);
    expect(modes[0].id).toBe("custom-1");
    expect(modes.find((m) => m.id === "main")).toBeUndefined();

    manager.setActiveMode("custom-1");
    expect(manager.getActiveMode()?.name).toBe("Custom CoT");
  });
});
