import { describe, it, expect } from "vitest";
import { extractCardFromPng } from "@jumpchoice/shared";

// ──────────────────────────────────────────────────────────────────────────
// PNG construction helpers
// ──────────────────────────────────────────────────────────────────────────
// Build minimal valid PNGs with embedded tEXt chunks to test the
// extractCardFromPng parser directly, without importing the server's
// route module (which pulls in database/storage dependencies at import time).
// These helpers mirror the chunk layout that injectTextChunk /
// injectCardTextChunks produce in characters.routes.ts: card tEXt chunks
// inserted before the first IDAT, base64-encoded UTF-8 JSON payload.

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** CRC-32 as used by PNG (ISO 3309 / ITU-T V.42). */
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]!;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Build a single PNG chunk: length(4) + type(4) + data + crc(4). */
function buildChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([lengthBuf, typeBytes, data, crcBuf]);
}

/** Build a tEXt chunk: keyword \0 text. */
function buildTextChunk(keyword: string, text: string): Buffer {
  const data = Buffer.concat([
    Buffer.from(keyword, "latin1"),
    Buffer.from([0]),
    Buffer.from(text, "latin1"),
  ]);
  return buildChunk("tEXt", data);
}

/** Minimal 1x1 8-bit RGBA IHDR chunk. */
function buildIhdr(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); // width
  ihdr.writeUInt32BE(1, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  return buildChunk("IHDR", ihdr);
}

// Pre-computed deflate stream for a single transparent RGBA pixel
// (filter byte 0 + RGBA 0,0,0,0). The parser does not decompress IDAT,
// but valid compressed data makes the PNG structurally realistic.
const IDAT_CHUNK = buildChunk("IDAT", Buffer.from([
  0x78, 0x01, 0x62, 0x60, 0x60, 0x60, 0x60, 0x00, 0x00, 0x00, 0x05, 0x00, 0x01,
]));
const IEND_CHUNK = buildChunk("IEND", Buffer.alloc(0));

/**
 * Create a minimal PNG with the given tEXt chunks inserted between IHDR
 * and IDAT, matching the layout produced by the server's export-png route.
 */
function createPngWithTextChunks(entries: Array<{ keyword: string; text: string }>): Buffer {
  const textChunks = entries.map((e) => buildTextChunk(e.keyword, e.text));
  return Buffer.concat([PNG_SIGNATURE, buildIhdr(), ...textChunks, IDAT_CHUNK, IEND_CHUNK]);
}

/** Serialize a card object to base64 (as the export route does). */
function jsonToBase64(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf-8").toString("base64");
}

// ──────────────────────────────────────────────────────────────────────────
// Card fixtures
// ──────────────────────────────────────────────────────────────────────────

const v2CardData = {
  name: "V2 Hero",
  description: "A brave hero from V2 format",
  personality: "Courageous and kind",
  scenario: "The capital city",
  first_mes: "Greetings, traveler!",
  mes_example: "",
  creator_notes: "Created for V2 testing",
  system_prompt: "",
  post_history_instructions: "",
  tags: ["fantasy", "hero"],
  creator: "v2tester",
  character_version: "1.0",
  alternate_greetings: ["Hey there!"],
  extensions: { custom: true },
  character_book: null,
};

const v2Envelope = {
  spec: "chara_card_v2",
  spec_version: "2.0",
  data: v2CardData,
};

// V3 card data = V2 base fields + V3-only additions
const v3CardData = {
  ...v2CardData,
  name: "V3 Champion",
  creator_notes: "Created for V3 testing",
  // V3-only fields
  nickname: "Champ",
  creator_notes_multilingual: { en: "V3 test card", ja: "V3テストカード" },
  source: "https://example.com/source",
  group_only_greetings: ["Welcome, group!", "Let's adventure together!"],
  creation_date: 1700000000,
  modification_date: 1700000001,
  assets: [
    { type: "icon", uri: "assets/icon/images/main.png", name: "main", ext: "png" },
  ],
};

const v3Envelope = {
  spec: "chara_card_v3",
  spec_version: "3.0",
  data: v3CardData,
};

// V2 backfill as produced by the V3 export route: V3-only fields stripped,
// creator_notes prefixed with "[Backfilled from V3]".
const v2BackfillEnvelope = {
  spec: "chara_card_v2",
  spec_version: "2.0",
  data: {
    name: "V3 Champion",
    description: v2CardData.description,
    personality: v2CardData.personality,
    scenario: v2CardData.scenario,
    first_mes: v2CardData.first_mes,
    mes_example: "",
    creator_notes: "[Backfilled from V3] Created for V3 testing",
    system_prompt: "",
    post_history_instructions: "",
    tags: v2CardData.tags,
    creator: v2CardData.creator,
    character_version: v2CardData.character_version,
    alternate_greetings: v2CardData.alternate_greetings,
    extensions: v2CardData.extensions,
    character_book: null,
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Type helper
// ──────────────────────────────────────────────────────────────────────────

interface ParsedCard {
  spec: string;
  spec_version: string;
  data: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────

describe("CCv3 PNG round-trip", () => {
  // ── V2 chara chunk ──

  describe("V2 chara-only PNG (V2 export format)", () => {
    it("produces a PNG that round-trips through extractCardFromPng", () => {
      // V2 export injects ONLY a chara chunk
      const png = createPngWithTextChunks([
        { keyword: "chara", text: jsonToBase64(v2Envelope) },
      ]);

      const parsed = extractCardFromPng(png) as ParsedCard | null;
      expect(parsed).not.toBeNull();
      expect(parsed!.spec).toBe("chara_card_v2");
      expect(parsed!.spec_version).toBe("2.0");
    });

    it("preserves all V2 data fields through round-trip", () => {
      const png = createPngWithTextChunks([
        { keyword: "chara", text: jsonToBase64(v2Envelope) },
      ]);

      const parsed = extractCardFromPng(png) as ParsedCard | null;
      expect(parsed).not.toBeNull();
      const data = parsed!.data;

      expect(data.name).toBe("V2 Hero");
      expect(data.description).toBe("A brave hero from V2 format");
      expect(data.personality).toBe("Courageous and kind");
      expect(data.scenario).toBe("The capital city");
      expect(data.first_mes).toBe("Greetings, traveler!");
      expect(data.creator).toBe("v2tester");
      expect(data.character_version).toBe("1.0");
      expect(data.tags).toEqual(["fantasy", "hero"]);
      expect(data.alternate_greetings).toEqual(["Hey there!"]);
      expect(data.extensions).toEqual({ custom: true });
    });

    it("does not surface V3-only fields in a pure V2 card", () => {
      const png = createPngWithTextChunks([
        { keyword: "chara", text: jsonToBase64(v2Envelope) },
      ]);

      const parsed = extractCardFromPng(png) as ParsedCard | null;
      expect(parsed).not.toBeNull();
      const data = parsed!.data;

      expect(data.nickname).toBeUndefined();
      expect(data.group_only_greetings).toBeUndefined();
      expect(data.creation_date).toBeUndefined();
      expect(data.modification_date).toBeUndefined();
      expect(data.assets).toBeUndefined();
      expect(data.source).toBeUndefined();
      expect(data.creator_notes_multilingual).toBeUndefined();
    });
  });

  // ── V3 ccv3 chunk ──

  describe("V3 ccv3 PNG (ccv3-only)", () => {
    it("round-trips a ccv3-only PNG and returns V3 spec", () => {
      const png = createPngWithTextChunks([
        { keyword: "ccv3", text: jsonToBase64(v3Envelope) },
      ]);

      const parsed = extractCardFromPng(png) as ParsedCard | null;
      expect(parsed).not.toBeNull();
      expect(parsed!.spec).toBe("chara_card_v3");
      expect(parsed!.spec_version).toBe("3.0");
    });

    it("preserves all V3-specific data fields through round-trip", () => {
      const png = createPngWithTextChunks([
        { keyword: "ccv3", text: jsonToBase64(v3Envelope) },
      ]);

      const parsed = extractCardFromPng(png) as ParsedCard | null;
      expect(parsed).not.toBeNull();
      const data = parsed!.data;

      // Base fields inherited from V2
      expect(data.name).toBe("V3 Champion");
      expect(data.description).toBe("A brave hero from V2 format");
      // V3-only fields — these are the critical round-trip assertions
      expect(data.nickname).toBe("Champ");
      expect(data.creator_notes_multilingual).toEqual({ en: "V3 test card", ja: "V3テストカード" });
      expect(data.source).toBe("https://example.com/source");
      expect(data.group_only_greetings).toEqual([
        "Welcome, group!",
        "Let's adventure together!",
      ]);
      expect(data.creation_date).toBe(1700000000);
      expect(data.modification_date).toBe(1700000001);
      expect(data.assets).toEqual([
        { type: "icon", uri: "assets/icon/images/main.png", name: "main", ext: "png" },
      ]);
    });

    it("preserves unicode content through base64 encode/decode round-trip", () => {
      const unicodeEnvelope = {
        spec: "chara_card_v3",
        spec_version: "3.0",
        data: {
          name: "日本語キャラクター",
          description: "テスト説明文 🎌 — émojis & spëcial chars",
          nickname: "ニックネーム",
          creator_notes_multilingual: { ja: "日本語メモ", zh: "中文备注" },
          group_only_greetings: ["こんにちは！", "ようこそ！"],
        },
      };
      const png = createPngWithTextChunks([
        { keyword: "ccv3", text: jsonToBase64(unicodeEnvelope) },
      ]);

      const parsed = extractCardFromPng(png) as ParsedCard | null;
      expect(parsed).not.toBeNull();
      expect(parsed!.data.name).toBe("日本語キャラクター");
      expect(parsed!.data.description).toBe("テスト説明文 🎌 — émojis & spëcial chars");
      expect(parsed!.data.nickname).toBe("ニックネーム");
      expect(parsed!.data.creator_notes_multilingual).toEqual({ ja: "日本語メモ", zh: "中文备注" });
      expect(parsed!.data.group_only_greetings).toEqual(["こんにちは！", "ようこそ！"]);
    });

    it("preserves large nested character_book through round-trip", () => {
      const bookEnvelope = {
        spec: "chara_card_v3",
        spec_version: "3.0",
        data: {
          name: "Lorebook Character",
          character_book: {
            name: "World Lore",
            description: "Extensive world-building entries",
            entries: [
              {
                keys: ["kingdom", "realm"],
                content: "The Kingdom of Aldoria spans three continents.",
                extensions: { position: "before_char" },
                enabled: true,
                insertion_order: 100,
              },
              {
                keys: ["dragon"],
                content: "Dragons once ruled the skies.",
                extensions: {},
                enabled: false,
                insertion_order: 200,
              },
            ],
          },
        },
      };
      const png = createPngWithTextChunks([
        { keyword: "ccv3", text: jsonToBase64(bookEnvelope) },
      ]);

      const parsed = extractCardFromPng(png) as ParsedCard | null;
      expect(parsed).not.toBeNull();
      const book = parsed!.data.character_book as Record<string, unknown>;
      expect(book.name).toBe("World Lore");
      const entries = book.entries as unknown[];
      expect(entries).toHaveLength(2);
      const first = entries[0] as Record<string, unknown>;
      expect(first.keys).toEqual(["kingdom", "realm"]);
      expect(first.enabled).toBe(true);
    });
  });

  // ── V3 dual-chunk format (ccv3 + chara) ──

  describe("V3 dual-chunk PNG (ccv3 + chara, as produced by ?format=v3 export)", () => {
    // The V3 export route injects BOTH ccv3 (full V3 data) and chara (V2 backfill).
    // extractCardFromPng must prefer ccv3 so V3 fields survive the round-trip.

    it("prefers ccv3 over chara when both chunks are present (ccv3 first)", () => {
      const png = createPngWithTextChunks([
        { keyword: "ccv3", text: jsonToBase64(v3Envelope) },
        { keyword: "chara", text: jsonToBase64(v2BackfillEnvelope) },
      ]);

      const parsed = extractCardFromPng(png) as ParsedCard | null;
      expect(parsed).not.toBeNull();
      expect(parsed!.spec).toBe("chara_card_v3");
      expect(parsed!.spec_version).toBe("3.0");
      expect(parsed!.data.name).toBe("V3 Champion");
    });

    it("prefers ccv3 regardless of chunk order (chara before ccv3)", () => {
      const png = createPngWithTextChunks([
        { keyword: "chara", text: jsonToBase64(v2BackfillEnvelope) },
        { keyword: "ccv3", text: jsonToBase64(v3Envelope) },
      ]);

      const parsed = extractCardFromPng(png) as ParsedCard | null;
      expect(parsed).not.toBeNull();
      expect(parsed!.spec).toBe("chara_card_v3");
      expect(parsed!.data.name).toBe("V3 Champion");
    });

    it("preserves V3-only fields that are stripped from the chara backfill", () => {
      // The chara backfill strips: nickname, assets, creator_notes_multilingual,
      // source, group_only_greetings, creation_date, modification_date.
      // The ccv3 chunk retains them. Verify the parser returns the ccv3 version.
      const png = createPngWithTextChunks([
        { keyword: "ccv3", text: jsonToBase64(v3Envelope) },
        { keyword: "chara", text: jsonToBase64(v2BackfillEnvelope) },
      ]);

      const parsed = extractCardFromPng(png) as ParsedCard | null;
      expect(parsed).not.toBeNull();
      const data = parsed!.data;

      expect(data.nickname).toBe("Champ");
      expect(data.group_only_greetings).toEqual([
        "Welcome, group!",
        "Let's adventure together!",
      ]);
      expect(data.creation_date).toBe(1700000000);
      expect(data.modification_date).toBe(1700000001);
      expect(data.source).toBe("https://example.com/source");
      expect(data.assets).toHaveLength(1);
    });

    it("returns V3 creator_notes, not the backfilled V2 creator_notes", () => {
      // The V2 backfill prepends "[Backfilled from V3]" to creator_notes.
      // The parser must return the original V3 creator_notes from ccv3.
      const png = createPngWithTextChunks([
        { keyword: "ccv3", text: jsonToBase64(v3Envelope) },
        { keyword: "chara", text: jsonToBase64(v2BackfillEnvelope) },
      ]);

      const parsed = extractCardFromPng(png) as ParsedCard | null;
      expect(parsed).not.toBeNull();
      expect(parsed!.data.creator_notes).toBe("Created for V3 testing");
      expect(parsed!.data.creator_notes).not.toContain("[Backfilled from V3]");
    });
  });

  // ── Edge cases ──

  describe("edge cases", () => {
    it("returns null for PNG without any card chunk", () => {
      const png = createPngWithTextChunks([]);
      expect(extractCardFromPng(png)).toBeNull();
    });

    it("returns null for non-PNG buffer", () => {
      expect(extractCardFromPng(Buffer.from("not a png at all"))).toBeNull();
    });

    it("returns null for empty buffer", () => {
      expect(extractCardFromPng(Buffer.alloc(0))).toBeNull();
    });

    it("returns null for buffer shorter than PNG signature", () => {
      expect(extractCardFromPng(Buffer.from([0x89, 0x50]))).toBeNull();
    });

    it("ignores non-card tEXt chunks and still finds ccv3", () => {
      const png = createPngWithTextChunks([
        { keyword: "Software", text: "JumpChoice v1.7.0" },
        { keyword: "comment", text: "some comment" },
        { keyword: "ccv3", text: jsonToBase64(v3Envelope) },
      ]);

      const parsed = extractCardFromPng(png) as ParsedCard | null;
      expect(parsed).not.toBeNull();
      expect(parsed!.spec).toBe("chara_card_v3");
    });

    it("falls back to chara when only chara is present (no ccv3)", () => {
      const png = createPngWithTextChunks([
        { keyword: "chara", text: jsonToBase64(v2Envelope) },
      ]);

      const parsed = extractCardFromPng(png) as ParsedCard | null;
      expect(parsed).not.toBeNull();
      expect(parsed!.spec).toBe("chara_card_v2");
    });

    it("handles malformed base64 payload gracefully (returns null)", () => {
      const png = createPngWithTextChunks([
        { keyword: "ccv3", text: "!!!not valid base64!!!" },
      ]);

      const parsed = extractCardFromPng(png);
      // Malformed JSON should be skipped, leaving no valid card
      expect(parsed).toBeNull();
    });
  });
});
