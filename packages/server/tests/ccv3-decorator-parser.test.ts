import { describe, it, expect } from "vitest";
import { parseDecorators, findDecorator } from "@jumpchoice/shared";

describe("CCv3 decorator parser", () => {
  it("parses single primary decorator", () => {
    const content = "@@depth 5\n\nYou are in a forest.";
    const result = parseDecorators(content);
    expect(result.directives).toHaveLength(1);
    expect(result.directives[0]!.name).toBe("depth");
    expect(result.directives[0]!.value).toBe("5");
    expect(result.directives[0]!.isFallback).toBe(false);
    expect(result.cleanContent).toBe("You are in a forest.");
  });

  it("parses multiple stacked decorators", () => {
    const content = "@@depth 5\n@@role system\n\nYou are in a forest.";
    const result = parseDecorators(content);
    expect(result.directives).toHaveLength(2);
    expect(result.directives[0]!.name).toBe("depth");
    expect(result.directives[0]!.value).toBe("5");
    expect(result.directives[0]!.isFallback).toBe(false);
    expect(result.directives[1]!.name).toBe("role");
    expect(result.directives[1]!.value).toBe("system");
    expect(result.directives[1]!.isFallback).toBe(false);
  });

  it("parses fallback decorators (@@@)", () => {
    const content = "@@activate_after_emotion\n@@@instruct_depth 100\n@@@depth 5\n\nBody text.";
    const result = parseDecorators(content);
    expect(result.directives).toHaveLength(3);
    expect(result.directives[0]!.name).toBe("activate_after_emotion");
    expect(result.directives[0]!.isFallback).toBe(false);
    expect(result.directives[1]!.name).toBe("instruct_depth");
    expect(result.directives[1]!.value).toBe("100");
    expect(result.directives[1]!.isFallback).toBe(true);
    expect(result.directives[2]!.name).toBe("depth");
    expect(result.directives[2]!.value).toBe("5");
    expect(result.directives[2]!.isFallback).toBe(true);
  });

  it("returns content as-is when no decorators", () => {
    const content = "Just regular content here.";
    const result = parseDecorators(content);
    expect(result.directives).toHaveLength(0);
    expect(result.cleanContent).toBe("Just regular content here.");
  });

  it("handles decorator without value", () => {
    const content = "@@constant\n\nAlways active entry.";
    const result = parseDecorators(content);
    expect(result.directives).toHaveLength(1);
    expect(result.directives[0]!.name).toBe("constant");
    expect(result.directives[0]!.value).toBeUndefined();
    expect(result.directives[0]!.isFallback).toBe(false);
  });

  it("strips decorator lines and preserves body", () => {
    const content = "@@depth 5\n@@role system\n\nYou are now in a dark forest.";
    const result = parseDecorators(content);
    expect(result.cleanContent).toBe("You are now in a dark forest.");
  });

  it("treats a non-decorator first line as the body start", () => {
    const content = "Not a decorator\n@@depth 5";
    const result = parseDecorators(content);
    expect(result.directives).toHaveLength(0);
    expect(result.cleanContent).toBe("Not a decorator\n@@depth 5");
  });

  it("handles body without a blank separator line", () => {
    const content = "@@depth 5\nBody right after.";
    const result = parseDecorators(content);
    expect(result.directives).toHaveLength(1);
    expect(result.directives[0]!.name).toBe("depth");
    expect(result.cleanContent).toBe("Body right after.");
  });

  it("findDecorator returns primary over fallback", () => {
    const result = parseDecorators("@@depth 5\n@@@depth 10\n\nBody");
    const found = findDecorator(result.directives, "depth");
    expect(found).toBeDefined();
    expect(found!.value).toBe("5");
    expect(found!.isFallback).toBe(false);
  });

  it("findDecorator returns fallback when no primary present", () => {
    const result = parseDecorators("@@@depth 10\n\nBody");
    const found = findDecorator(result.directives, "depth");
    expect(found).toBeDefined();
    expect(found!.value).toBe("10");
    expect(found!.isFallback).toBe(true);
  });

  it("findDecorator returns undefined for missing decorator", () => {
    const result = parseDecorators("@@depth 5\n\nBody");
    const found = findDecorator(result.directives, "role");
    expect(found).toBeUndefined();
  });
});
