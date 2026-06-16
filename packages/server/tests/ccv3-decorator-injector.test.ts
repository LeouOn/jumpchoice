import { describe, it, expect } from "vitest";
import { applyLorebookDecorators } from "../src/services/lorebook/decorator-injector.js";
import { parseDecorators } from "@jumpchoice/shared";

describe("applyLorebookDecorators", () => {
  function buildEntry(content: string, order = 100) {
    const { directives, cleanContent } = parseDecorators(content);
    return { rawContent: content, cleanContent, directives, insertionOrder: order };
  }

  it("returns messages unchanged when no entries have decorators", () => {
    const messages = [
      { role: "system" as const, content: "sys" },
      { role: "user" as const, content: "hi" },
    ];
    const result = applyLorebookDecorators(messages, []);
    expect(result).toBe(messages); // same reference — no allocation
  });

  it("inserts content at @@depth 0 (after last message)", () => {
    const messages = [
      { role: "system" as const, content: "sys" },
      { role: "user" as const, content: "hi" },
    ];
    const entry = buildEntry("@@depth 0\n\nInjected at end");
    const result = applyLorebookDecorators(messages, [entry]);
    expect(result).toHaveLength(3);
    expect(result[2]!.content).toBe("Injected at end");
  });

  it("inserts content at @@depth 1 (one from end)", () => {
    const messages = [
      { role: "system" as const, content: "sys" },
      { role: "user" as const, content: "hi" },
      { role: "assistant" as const, content: "hello" },
    ];
    const entry = buildEntry("@@depth 1\n\nInjected before last");
    const result = applyLorebookDecorators(messages, [entry]);
    expect(result).toHaveLength(4);
    expect(result[2]!.content).toBe("Injected before last");
    // Original last message should still be last.
    expect(result[3]!.content).toBe("hello");
  });

  it("respects @@role decorator", () => {
    const messages = [{ role: "system" as const, content: "sys" }];
    const entry = buildEntry("@@depth 0\n@@role user\n\nUser msg injected");
    const result = applyLorebookDecorators(messages, [entry]);
    expect(result[1]!.role).toBe("user");
    expect(result[1]!.content).toBe("User msg injected");
  });

  it("handles @@position before_desc", () => {
    const messages = [
      { role: "system" as const, content: "sys" },
      { role: "user" as const, content: "hi" },
    ];
    const entry = buildEntry("@@position before_desc\n\nAt start");
    const result = applyLorebookDecorators(messages, [entry]);
    expect(result[0]!.content).toBe("At start");
  });

  it("handles @@position after_desc (after last system message)", () => {
    const messages = [
      { role: "system" as const, content: "sys1" },
      { role: "user" as const, content: "hi" },
      { role: "system" as const, content: "sys2" },
    ];
    const entry = buildEntry("@@position after_desc\n\nAfter system");
    const result = applyLorebookDecorators(messages, [entry]);
    // Should be after last system message (index 2), so at index 3
    expect(result[3]!.content).toBe("After system");
  });

  it("skips entries with no depth/position decorator", () => {
    const messages = [{ role: "system" as const, content: "sys" }];
    // Entry has content but no @@depth or @@position directive.
    const entry = buildEntry("Just content, no decorator");
    const result = applyLorebookDecorators(messages, [entry]);
    expect(result).toBe(messages); // same reference — nothing applied
  });

  it("skips entries with empty clean content even if decorator present", () => {
    const messages = [{ role: "system" as const, content: "sys" }];
    const entry = buildEntry("@@depth 0");
    // cleanContent is "" because the body is empty
    const result = applyLorebookDecorators(messages, [entry]);
    expect(result).toBe(messages); // same reference — nothing applied
  });

  it("handles multiple decorated entries with different insertion orders", () => {
    const messages = [
      { role: "system" as const, content: "sys" },
      { role: "user" as const, content: "hi" },
    ];
    const entry1 = buildEntry("@@depth 1\n@@role system\n\nFirst (order 10)", 10);
    const entry2 = buildEntry("@@depth 1\n@@role system\n\nSecond (order 20)", 20);
    const result = applyLorebookDecorators(messages, [entry1, entry2]);
    // Both injected before last message; order 10 before order 20
    expect(result[1]!.content).toBe("First (order 10)");
    expect(result[2]!.content).toBe("Second (order 20)");
  });

  it("invalid role falls back to system", () => {
    const messages = [{ role: "system" as const, content: "sys" }];
    const entry = buildEntry("@@depth 0\n@@role invalid\n\nContent");
    const result = applyLorebookDecorators(messages, [entry]);
    expect(result[1]!.role).toBe("system");
  });

  it("clamps negative @@depth to 0", () => {
    const messages = [{ role: "system" as const, content: "sys" }];
    // parseDecorators will store value as "-3"; the injector parses with
    // Number.parseInt and Math.max(0, ...) clamps the index.
    const entry = buildEntry("@@depth -3\n\nClamped");
    const result = applyLorebookDecorators(messages, [entry]);
    // Math.max(0, floor(-3)) === 0, so depth becomes 0 → after last message.
    expect(result).toHaveLength(2);
    expect(result[1]!.content).toBe("Clamped");
  });

  it("does not mutate the input array", () => {
    const messages = [{ role: "system" as const, content: "sys" }];
    const entry = buildEntry("@@depth 0\n\nNew");
    const result = applyLorebookDecorators(messages, [entry]);
    expect(messages).toHaveLength(1); // input unchanged
    expect(result).not.toBe(messages); // new array returned
  });
});
