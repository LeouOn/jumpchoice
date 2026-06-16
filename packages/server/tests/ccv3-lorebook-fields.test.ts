// ──────────────────────────────────────────────
// T24: Character Card V3 lorebook entry field preservation
// ──────────────────────────────────────────────
// These tests verify that normalizeCharacterBook preserves the
// V3-only entry fields (probability, use_regex, position_numeric,
// group, group_weight, sticky, cooldown, delay, ephemeral,
// selective_logic, match_whole_words, prevent_recursion,
// exclude_from_vectorization) and that the legacy V2 `position`
// string field maps correctly to both the V2 `position` and the
// V3 `position_numeric` slots.
import { describe, it, expect } from "vitest";
import { normalizeCharacterBookForTest } from "../src/services/import/st-character.importer.js";

/** A book wrapping a single entry that has every V3-only field populated. */
function bookWith(entry: Record<string, unknown>): Record<string, unknown> {
  return {
    name: "Test Book",
    description: "",
    scan_depth: 2,
    token_budget: 2048,
    recursive_scanning: false,
    extensions: {},
    entries: [entry],
  };
}

const v3Entry: Record<string, unknown> = {
  keys: ["dragon", "wyrm"],
  content: "Dragons are ancient creatures.",
  extensions: {},
  enabled: true,
  insertion_order: 50,
  case_sensitive: false,
  name: "Dragon Entry",
  priority: 10,
  id: 1,
  comment: "Dragon lore",
  selective: true,
  secondary_keys: ["fire"],
  constant: false,
  position: 1, // numeric V3 position
  // ── V3-only entry fields ──
  probability: 75,
  use_regex: true,
  group: "creatures",
  group_weight: 5,
  sticky: 3,
  cooldown: 5,
  delay: 1,
  ephemeral: false,
  selective_logic: 0,
  match_whole_words: true,
  prevent_recursion: false,
  exclude_from_vectorization: false,
};

function firstEntry(raw: Record<string, unknown>) {
  const book = normalizeCharacterBookForTest(raw);
  expect(book).not.toBeNull();
  return book!.entries[0];
}

describe("normalizeCharacterBook V3 lorebook entry fields", () => {
  describe("V3-only fields preserved", () => {
    const entry = firstEntry(bookWith(v3Entry));

    it("preserves probability as a number", () => {
      expect(entry.probability).toBe(75);
    });

    it("preserves use_regex as a boolean", () => {
      expect(entry.use_regex).toBe(true);
    });

    it("preserves group as a string", () => {
      expect(entry.group).toBe("creatures");
    });

    it("preserves group_weight as a number", () => {
      expect(entry.group_weight).toBe(5);
    });

    it("preserves sticky as a number", () => {
      expect(entry.sticky).toBe(3);
    });

    it("preserves cooldown as a number", () => {
      expect(entry.cooldown).toBe(5);
    });

    it("preserves delay as a number", () => {
      expect(entry.delay).toBe(1);
    });

    it("preserves ephemeral as a boolean", () => {
      expect(entry.ephemeral).toBe(false);
    });

    it("preserves selective_logic as a number", () => {
      expect(entry.selective_logic).toBe(0);
    });

    it("preserves match_whole_words as a boolean", () => {
      expect(entry.match_whole_words).toBe(true);
    });

    it("preserves prevent_recursion as a boolean", () => {
      expect(entry.prevent_recursion).toBe(false);
    });

    it("preserves exclude_from_vectorization as a boolean", () => {
      expect(entry.exclude_from_vectorization).toBe(false);
    });
  });

  describe("numeric position maps to position_numeric", () => {
    it("sets position_numeric when position is numeric 1 (after_char)", () => {
      const entry = firstEntry(bookWith({ ...v3Entry, position: 1 }));
      expect(entry.position_numeric).toBe(1);
      expect(entry.position).toBe("after_char");
    });

    it("sets position_numeric when position is numeric 0 (before_char)", () => {
      const entry = firstEntry(bookWith({ ...v3Entry, position: 0 }));
      expect(entry.position_numeric).toBe(0);
      expect(entry.position).toBe("before_char");
    });

    it("preserves a higher numeric position (e.g. 4 = at_end)", () => {
      const entry = firstEntry(bookWith({ ...v3Entry, position: 4 }));
      expect(entry.position_numeric).toBe(4);
      // position 4 is not 1, so the V2 string falls back to "before_char"
      expect(entry.position).toBe("before_char");
    });

    it("does NOT set position_numeric when position is a string", () => {
      const entry = firstEntry(bookWith({ ...v3Entry, position: "after_char" }));
      expect(entry.position_numeric).toBeUndefined();
      expect(entry.position).toBe("after_char");
    });

    it("does NOT set position_numeric when position is absent", () => {
      const entry = firstEntry(bookWith({ ...v3Entry, position: undefined }));
      expect(entry.position_numeric).toBeUndefined();
      expect(entry.position).toBe("before_char");
    });
  });

  describe("legacy V2 position field unchanged", () => {
    it("maps string position 'before_char' verbatim", () => {
      const entry = firstEntry(bookWith({ ...v3Entry, position: "before_char" }));
      expect(entry.position).toBe("before_char");
    });

    it("maps string position 'after_char' verbatim", () => {
      const entry = firstEntry(bookWith({ ...v3Entry, position: "after_char" }));
      expect(entry.position).toBe("after_char");
    });

    it("defaults unknown string position to 'before_char'", () => {
      const entry = firstEntry(bookWith({ ...v3Entry, position: "nonsense" }));
      expect(entry.position).toBe("before_char");
    });

    it("defaults missing position to 'before_char'", () => {
      const entry = firstEntry(bookWith({ keys: ["k"], content: "c" }));
      expect(entry.position).toBe("before_char");
    });
  });

  describe("V2-only entry (no V3 fields) backward compatibility", () => {
    const v2OnlyEntry: Record<string, unknown> = {
      keys: ["kingdom"],
      content: "A kingdom to the north.",
      comment: "Kingdom",
      position: "after_char",
      insertion_order: 100,
      priority: 10,
      id: 42,
    };
    const entry = firstEntry(bookWith(v2OnlyEntry));

    it("does not synthesise probability", () => {
      expect(entry.probability).toBeUndefined();
    });

    it("does not synthesise use_regex", () => {
      expect(entry.use_regex).toBeUndefined();
    });

    it("does not synthesise position_numeric for string positions", () => {
      expect(entry.position_numeric).toBeUndefined();
    });

    it("does not synthesise group", () => {
      expect(entry.group).toBeUndefined();
    });

    it("does not synthesise sticky", () => {
      expect(entry.sticky).toBeUndefined();
    });

    it("preserves the V2 position string", () => {
      expect(entry.position).toBe("after_char");
    });

    it("populates derived V2 entry fields", () => {
      expect(entry.content).toBe("A kingdom to the north.");
      expect(entry.keys).toEqual(["kingdom"]);
      expect(entry.id).toBe(42);
      expect(entry.enabled).toBe(true);
    });
  });

  describe("null / invalid book handling", () => {
    it("returns null for null input", () => {
      expect(normalizeCharacterBookForTest(null)).toBeNull();
    });

    it("returns null for non-object input", () => {
      expect(normalizeCharacterBookForTest("not a book")).toBeNull();
    });

    it("returns a book with empty entries when no entries key", () => {
      const book = normalizeCharacterBookForTest({ name: "Empty" });
      expect(book).not.toBeNull();
      expect(book!.entries).toEqual([]);
    });

    it("accepts entries as an object map", () => {
      const book = normalizeCharacterBookForTest({
        entries: {
          a: { keys: ["a"], content: "alpha" },
          b: { keys: ["b"], content: "beta" },
        },
      });
      expect(book).not.toBeNull();
      expect(book!.entries).toHaveLength(2);
      expect(book!.entries[0].content).toBe("alpha");
      expect(book!.entries[1].content).toBe("beta");
    });
  });

  describe("V3 field type coercion", () => {
    it("coerces string probability to a number", () => {
      const entry = firstEntry(bookWith({ ...v3Entry, probability: "90" }));
      expect(entry.probability).toBe(90);
    });

    it("coerces truthy group to string", () => {
      const entry = firstEntry(bookWith({ ...v3Entry, group: 1234 }));
      expect(entry.group).toBe("1234");
    });
  });
});
