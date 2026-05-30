import { describe, it, expect } from "vitest";
import {
  bumpCharacterVersion,
  normalizePartyLookupName,
  buildPartyNpcId,
  isPartyNpcId,
  normalizeDmTargetName,
  trimIncompleteModelEnding,
  sanitizeConnectedGameTranscript,
  prefixConversationUserTurn,
  formatConversationPromptTurn,
  areConversationSchedulesEnabled,
  hasConversationSchedules,
  getChatHapticIntifaceUrl,
  normalizeHapticAgentAction,
  normalizeHapticAgentNumber,
  normalizeHapticAgentDeviceIndex,
  normalizeHapticAgentCommand,
  normalizeHapticAgentCommands,
  parsePromptPresetChoices,
  getHiddenCompletionTokens,
  getVisibleCompletionTokens,
} from "../src/services/generation/helpers.js";

describe("generation helpers", () => {
  describe("bumpCharacterVersion", () => {
    it("bumps a simple version", () => {
      expect(bumpCharacterVersion("1.0")).toBe("1.1");
    });
    it("returns 1.1 for empty input", () => {
      expect(bumpCharacterVersion("")).toBe("1.1");
    });
    it("handles non-string input", () => {
      expect(bumpCharacterVersion(42 as any)).toBe("1.1");
    });
    it("preserves leading zeros", () => {
      expect(bumpCharacterVersion("v01")).toBe("v02");
    });
    it("handles version with suffix", () => {
      expect(bumpCharacterVersion("2.0-beta")).toBe("2.1-beta");
    });
  });

  describe("normalizePartyLookupName", () => {
    it("lowercases and strips non-alphanumeric", () => {
      expect(normalizePartyLookupName("Hello World!")).toBe("hello world");
    });
    it("trims whitespace", () => {
      expect(normalizePartyLookupName("  Gandalf  ")).toBe("gandalf");
    });
  });

  describe("buildPartyNpcId / isPartyNpcId", () => {
    it("creates a valid NPC id and recognizes it", () => {
      const id = buildPartyNpcId("Gandalf");
      expect(id).toMatch(/^npc:/);
      expect(isPartyNpcId(id)).toBe(true);
      expect(isPartyNpcId("regular-id")).toBe(false);
    });
  });

  describe("normalizeDmTargetName", () => {
    it("normalizes to lowercase", () => {
      expect(normalizeDmTargetName("Hello World")).toBe("hello world");
    });
    it("strips accents", () => {
      expect(normalizeDmTargetName("caf\u00e9")).toBe("cafe");
    });
    it("strips il prefix", () => {
      expect(normalizeDmTargetName("il negozio")).toBe("negozio");
    });
  });

  describe("trimIncompleteModelEnding", () => {
    it("preserves complete sentences", () => {
      expect(trimIncompleteModelEnding("Hello world.")).toBe("Hello world.");
    });
    it("preserves empty string", () => {
      expect(trimIncompleteModelEnding("")).toBe("");
    });
    it("trims incomplete trailing text after complete sentence", () => {
      const result = trimIncompleteModelEnding("Hello world. This is incomplete");
      expect(result.endsWith(".")).toBe(true);
    });
  });

  describe("sanitizeConnectedGameTranscript", () => {
    it("strips leading GM address prefix", () => {
      const result = sanitizeConnectedGameTranscript("[To the party] Hello world");
      expect(result).toBe("Hello world");
    });
    it("strips GM address prefix case-insensitively", () => {
      const result = sanitizeConnectedGameTranscript("[to the gm] Hello");
      expect(result).toBe("Hello");
    });
  });

  describe("prefixConversationUserTurn", () => {
    it("prefixes with persona name", () => {
      expect(prefixConversationUserTurn("hello", "Alice")).toBe("Alice: hello");
    });
    it("does not duplicate existing prefix", () => {
      expect(prefixConversationUserTurn("Alice: hello", "Alice")).toBe("Alice: hello");
    });
  });

  describe("formatConversationPromptTurn", () => {
    it("formats user turn with speaker prefix", () => {
      const result = formatConversationPromptTurn("hello", "user", "Alice");
      expect(result).toContain("Alice");
    });
    it("passes through assistant turn unchanged", () => {
      expect(formatConversationPromptTurn("  hello  ", "assistant", "Alice")).toBe("hello");
    });
  });

  describe("areConversationSchedulesEnabled / hasConversationSchedules", () => {
    it("returns false for empty meta", () => {
      expect(areConversationSchedulesEnabled({})).toBe(false);
      expect(hasConversationSchedules({})).toBe(false);
    });
    it("returns true when explicitly enabled", () => {
      expect(areConversationSchedulesEnabled({ conversationSchedulesEnabled: true })).toBe(true);
    });
    it("returns true when schedules exist", () => {
      expect(hasConversationSchedules({ characterSchedules: { a: {} } })).toBe(true);
    });
  });

  describe("getChatHapticIntifaceUrl", () => {
    it("returns undefined for non-string", () => {
      expect(getChatHapticIntifaceUrl({})).toBeUndefined();
    });
    it("returns trimmed url", () => {
      expect(getChatHapticIntifaceUrl({ hapticIntifaceUrl: "  ws://localhost  " })).toBe("ws://localhost");
    });
    it("returns undefined for empty string", () => {
      expect(getChatHapticIntifaceUrl({ hapticIntifaceUrl: "  " })).toBeUndefined();
    });
  });

  describe("haptic normalization", () => {
    it("normalizes action names", () => {
      expect(normalizeHapticAgentAction("Vibrate")).toBe("vibrate");
      expect(normalizeHapticAgentAction("stop")).toBe("stop");
      expect(normalizeHapticAgentAction("invalid")).toBeNull();
      expect(normalizeHapticAgentAction(42 as any)).toBeNull();
    });

    it("normalizes numbers", () => {
      expect(normalizeHapticAgentNumber(5)).toBe(5);
      expect(normalizeHapticAgentNumber("3.5")).toBe(3.5);
      expect(normalizeHapticAgentNumber("abc")).toBeUndefined();
    });

    it("normalizes device index", () => {
      expect(normalizeHapticAgentDeviceIndex(0)).toBe(0);
      expect(normalizeHapticAgentDeviceIndex("all")).toBe("all");
      expect(normalizeHapticAgentDeviceIndex(null)).toBe("all");
      expect(normalizeHapticAgentDeviceIndex(-1)).toBe("all");
    });

    it("normalizes full command", () => {
      const cmd = normalizeHapticAgentCommand({ action: "vibrate", intensity: 0.5, duration: 2 });
      expect(cmd).toEqual({ deviceIndex: "all", action: "vibrate", intensity: 0.5, duration: 2 });
    });

    it("normalizes command array", () => {
      const cmds = normalizeHapticAgentCommands({
        commands: [{ action: "vibrate" }, { action: "stop" }],
      });
      expect(cmds).toHaveLength(2);
    });

    it("handles single command", () => {
      const cmds = normalizeHapticAgentCommands({ action: "vibrate" });
      expect(cmds).toHaveLength(1);
    });

    it("returns empty for no commands", () => {
      expect(normalizeHapticAgentCommands({})).toHaveLength(0);
    });
  });

  describe("parsePromptPresetChoices", () => {
    it("parses valid JSON string", () => {
      expect(parsePromptPresetChoices('{"a":"b"}')).toEqual({ a: "b" });
    });
    it("parses object directly", () => {
      expect(parsePromptPresetChoices({ a: "b" })).toEqual({ a: "b" });
    });
    it("returns null for arrays", () => {
      expect(parsePromptPresetChoices([1, 2, 3])).toBeNull();
    });
    it("returns null for invalid JSON", () => {
      expect(parsePromptPresetChoices("not json")).toBeNull();
    });
  });

  describe("token helpers", () => {
    it("getHiddenCompletionTokens returns undefined for no usage", () => {
      expect(getHiddenCompletionTokens(undefined)).toBeUndefined();
    });
    it("getHiddenCompletionTokens sums hidden parts", () => {
      expect(getHiddenCompletionTokens({
        completionTokens: 100,
        completionReasoningTokens: 10,
        completionAudioTokens: 5,
      })).toBe(15);
    });
    it("getVisibleCompletionTokens subtracts hidden", () => {
      expect(getVisibleCompletionTokens({
        completionTokens: 100,
        completionReasoningTokens: 30,
      })).toBe(70);
    });
    it("getVisibleCompletionTokens returns undefined for no usage", () => {
      expect(getVisibleCompletionTokens(undefined)).toBeUndefined();
    });
  });
});
