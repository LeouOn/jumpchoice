import { describe, it, expect } from "vitest";
import { resolveMacros, type MacroContext } from "@jumpchoice/shared";

function makeCtx(overrides?: Partial<MacroContext>): MacroContext {
  return {
    user: "TestUser",
    char: "TestChar",
    characters: ["TestChar"],
    variables: {},
    ...overrides,
  };
}

describe("CCv3 CBS macros", () => {
  describe("{{pick}}", () => {
    it("returns one of the provided options", () => {
      const ctx = makeCtx();
      const result = resolveMacros("{{pick::A::B::C}}", ctx);
      expect(["A", "B", "C"]).toContain(result);
    });

    it("is deterministic — same input gives same output", () => {
      const ctx = makeCtx();
      const result1 = resolveMacros("{{pick::A::B::C}}", ctx);
      const result2 = resolveMacros("{{pick::A::B::C}}", ctx);
      expect(result1).toBe(result2);
    });

    it("different templates may give different results", () => {
      const ctx = makeCtx();
      // resolveMacros returns the full template with macros substituted, so
      // the surrounding text is preserved and only the pick selection differs.
      const r1 = resolveMacros("{{pick::A::B::C}}", ctx);
      const r2 = resolveMacros("Different prefix {{pick::A::B::C}}", ctx);
      expect(["A", "B", "C"]).toContain(r1);
      expect(["Different prefix A", "Different prefix B", "Different prefix C"]).toContain(r2);
    });

    it("returns the chosen option for a single-option pick", () => {
      const ctx = makeCtx();
      const result = resolveMacros("{{pick::only}}", ctx);
      expect(result).toBe("only");
    });
  });

  describe("{{hidden_key}}", () => {
    it("is stripped from output", () => {
      const ctx = makeCtx();
      const result = resolveMacros("Hello {{hidden_key:secret}} world", ctx);
      expect(result).toBe("Hello  world");
    });

    it("handles multiple hidden keys", () => {
      const ctx = makeCtx();
      const result = resolveMacros("{{hidden_key:a}}{{hidden_key:b}}", ctx);
      expect(result).toBe("");
    });
  });

  describe("{{reverse}}", () => {
    it("reverses a simple string", () => {
      const ctx = makeCtx();
      const result = resolveMacros("{{reverse:hello}}", ctx);
      expect(result).toBe("olleh");
    });

    it("reverses resolved macro content", () => {
      const ctx = makeCtx({ char: "Alice" });
      const result = resolveMacros("{{reverse:{{char}}}}", ctx);
      expect(result).toBe("ecilA");
    });
  });

  describe("existing macros still work", () => {
    it("{{user}} resolves", () => {
      const result = resolveMacros("Hi {{user}}", makeCtx());
      expect(result).toBe("Hi TestUser");
    });

    it("{{char}} resolves", () => {
      const result = resolveMacros("Hi {{char}}", makeCtx());
      expect(result).toBe("Hi TestChar");
    });

    it("{{random}} produces a number 0-100", () => {
      const result = resolveMacros("{{random}}", makeCtx());
      const num = parseInt(result, 10);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(100);
    });
  });
});
