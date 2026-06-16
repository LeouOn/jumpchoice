// ──────────────────────────────────────────────
// T20: Character Card V3 field preservation through normalizeV2
// ──────────────────────────────────────────────
// These tests verify that the V3-only fields on CharacterData
// (nickname, assets, creator_notes_multilingual, source,
//  group_only_greetings, creation_date, modification_date) are
// carried through normalizeV2 unchanged when a V3 card is imported,
// that the legacy V2 fields still populate for a V3 card, and that
// importing a V2-only card does NOT synthesise V3 fields (backward
// compatibility).
import { describe, it, expect } from "vitest";
import { normalizeCharacterDataForTest } from "../src/services/import/st-character.importer.js";
import type { CharacterAsset } from "@jumpchoice/shared";

/** V3 `data` payload with every V3-only field populated. */
const v3Data: Record<string, unknown> = {
  name: "V3 Test",
  description: "A description",
  personality: "Brave",
  scenario: "A scenario",
  first_mes: "Hello there",
  mes_example: "",
  creator_notes: "Some notes",
  system_prompt: "",
  post_history_instructions: "",
  tags: ["tag1", "tag2"],
  creator: "creator",
  character_version: "1.0",
  alternate_greetings: ["Alt greeting"],
  extensions: { depth_prompt: { prompt: "depth", depth: 4, role: "system" } },
  character_book: null,
  // ── V3-only fields ──
  nickname: "V3Nick",
  assets: [
    { type: "icon", uri: "ccdefault:", name: "main", ext: "png" },
    { type: "emotion", uri: "embeded://emotions/happy.png", name: "happy", ext: "png" },
  ],
  creator_notes_multilingual: { en: "English notes", ja: "Japanese notes" },
  source: ["https://chub.ai/character/123", "https://example.com"],
  group_only_greetings: ["Group hi", "Group bye"],
  creation_date: 1700000000,
  modification_date: 1700000001,
};

/** V2-only `data` payload — no V3 fields. */
const v2OnlyData: Record<string, unknown> = {
  name: "V2 Test",
  description: "V2 desc",
  personality: "",
  scenario: "",
  first_mes: "Hi",
  mes_example: "",
  creator_notes: "",
  system_prompt: "",
  post_history_instructions: "",
  tags: [],
  creator: "",
  character_version: "1.0",
  alternate_greetings: [],
  extensions: {},
  character_book: null,
};

describe("normalizeV2 V3 field preservation", () => {
  describe("V3-only fields preserved", () => {
    const result = normalizeCharacterDataForTest(v3Data);

    it("preserves nickname", () => {
      expect(result.nickname).toBe("V3Nick");
    });

    it("preserves assets array verbatim", () => {
      expect(result.assets).toBeDefined();
      expect(result.assets).toHaveLength(2);
      const first = result.assets?.[0] as CharacterAsset;
      expect(first.type).toBe("icon");
      expect(first.uri).toBe("ccdefault:");
      expect(first.name).toBe("main");
      expect(first.ext).toBe("png");
    });

    it("preserves creator_notes_multilingual object", () => {
      expect(result.creator_notes_multilingual).toEqual({ en: "English notes", ja: "Japanese notes" });
    });

    it("preserves source array as strings", () => {
      expect(result.source).toEqual(["https://chub.ai/character/123", "https://example.com"]);
    });

    it("preserves group_only_greetings array", () => {
      expect(result.group_only_greetings).toEqual(["Group hi", "Group bye"]);
    });

    it("preserves creation_date as a number", () => {
      expect(result.creation_date).toBe(1700000000);
    });

    it("preserves modification_date as a number", () => {
      expect(result.modification_date).toBe(1700000001);
    });
  });

  describe("V2 fields still present for a V3 card", () => {
    const result = normalizeCharacterDataForTest(v3Data);

    it("keeps the core V2 identity fields", () => {
      expect(result.name).toBe("V3 Test");
      expect(result.description).toBe("A description");
      expect(result.personality).toBe("Brave");
      expect(result.scenario).toBe("A scenario");
      expect(result.first_mes).toBe("Hello there");
      expect(result.mes_example).toBe("");
      expect(result.creator_notes).toBe("Some notes");
      expect(result.creator).toBe("creator");
      expect(result.character_version).toBe("1.0");
    });

    it("keeps tags and alternate_greetings", () => {
      expect(result.tags).toEqual(["tag1", "tag2"]);
      expect(result.alternate_greetings).toEqual(["Alt greeting"]);
    });

    it("keeps extensions populated", () => {
      expect(result.extensions).toBeDefined();
      expect(result.extensions.depth_prompt.prompt).toBe("depth");
      expect(result.extensions.depth_prompt.depth).toBe(4);
    });
  });

  describe("backward compatibility — V2-only card", () => {
    const result = normalizeCharacterDataForTest(v2OnlyData);

    it("does not synthesise nickname", () => {
      expect(result.nickname).toBeUndefined();
    });

    it("does not synthesise assets", () => {
      expect(result.assets).toBeUndefined();
    });

    it("does not synthesise creator_notes_multilingual", () => {
      expect(result.creator_notes_multilingual).toBeUndefined();
    });

    it("does not synthesise source", () => {
      expect(result.source).toBeUndefined();
    });

    it("does not synthesise group_only_greetings", () => {
      expect(result.group_only_greetings).toBeUndefined();
    });

    it("does not synthesise creation_date", () => {
      expect(result.creation_date).toBeUndefined();
    });

    it("does not synthesise modification_date", () => {
      expect(result.modification_date).toBeUndefined();
    });

    it("still populates V2 fields", () => {
      expect(result.name).toBe("V2 Test");
      expect(result.description).toBe("V2 desc");
      expect(result.first_mes).toBe("Hi");
    });
  });

  describe("partial V3 fields", () => {
    it("preserves a single V3 field when only that one is present", () => {
      const partial: Record<string, unknown> = {
        name: "Partial",
        description: "",
        nickname: "OnlyNick",
      };
      const result = normalizeCharacterDataForTest(partial);
      expect(result.nickname).toBe("OnlyNick");
      expect(result.assets).toBeUndefined();
      expect(result.group_only_greetings).toBeUndefined();
      expect(result.creation_date).toBeUndefined();
    });

    it("coerces V3 numeric fields to numbers", () => {
      const numericStrings: Record<string, unknown> = {
        name: "Nums",
        creation_date: "1699000000",
        modification_date: "1699000001",
      };
      const result = normalizeCharacterDataForTest(numericStrings);
      expect(result.creation_date).toBe(1699000000);
      expect(result.modification_date).toBe(1699000001);
    });

    it("coerces source entries to strings", () => {
      const mixedSource: Record<string, unknown> = {
        name: "Mixed",
        source: [12345, "https://example.com"],
      };
      const result = normalizeCharacterDataForTest(mixedSource);
      expect(result.source).toEqual(["12345", "https://example.com"]);
    });
  });
});
