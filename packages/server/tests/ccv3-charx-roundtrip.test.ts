import { describe, it, expect } from "vitest";
import AdmZip from "adm-zip";

// ──────────────────────────────────────────────────────────────────────────
// CHARX is a zip archive following the Character Card V3 spec:
//   - card.json at the zip root: { spec: "chara_card_v3", spec_version: "3.0", data: {...} }
//   - assets/icon/images/main.png: optional avatar asset
//
// The server's export-charx route (characters.routes.ts) builds the zip with
// AdmZip. These tests mirror that construction and verify round-trip parsing
// of card.json and avatar assets.
// ──────────────────────────────────────────────────────────────────────────

// ─── Card fixtures ─────────────────────────────────────────────────────────

const v3CardData = {
  name: "CharX Hero",
  description: "A hero exported as CHARX",
  personality: "Bold and determined",
  scenario: "A vast open world",
  first_mes: "The adventure begins!",
  mes_example: "",
  creator_notes: "CHARX test card",
  system_prompt: "",
  post_history_instructions: "",
  tags: ["charx", "v3"],
  creator: "charxtester",
  character_version: "1.0",
  alternate_greetings: [],
  extensions: {},
  character_book: null,
  // V3-only fields
  nickname: "Hero",
  creator_notes_multilingual: { en: "CHARX test", ja: "CHARXテスト" },
  source: "https://example.com/charx",
  group_only_greetings: ["Group greeting!"],
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

// ─── Minimal PNG helper (for avatar asset tests) ───────────────────────────

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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

function buildChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([lengthBuf, typeBytes, data, crcBuf]);
}

/** Create a minimal 1x1 transparent RGBA PNG. */
function createMinimalPng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const idat = Buffer.from([
    0x78, 0x01, 0x62, 0x60, 0x60, 0x60, 0x60, 0x00, 0x00, 0x00, 0x05, 0x00, 0x01,
  ]);
  return Buffer.concat([
    PNG_SIGNATURE,
    buildChunk("IHDR", ihdr),
    buildChunk("IDAT", idat),
    buildChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ─── Type helper ───────────────────────────────────────────────────────────

interface ParsedCard {
  spec: string;
  spec_version: string;
  data: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────

describe("CCv3 CHARX round-trip", () => {
  // ── card.json at root ──

  describe("card.json at zip root", () => {
    it("contains card.json at root with V3 envelope", () => {
      const zip = new AdmZip();
      zip.addFile("card.json", Buffer.from(JSON.stringify(v3Envelope, null, 2), "utf-8"));
      const buf = zip.toBuffer();

      const reparsed = new AdmZip(buf);
      const entry = reparsed.getEntry("card.json");
      expect(entry).not.toBeNull();

      const card = JSON.parse(entry!.getData().toString("utf-8")) as ParsedCard;
      expect(card.spec).toBe("chara_card_v3");
      expect(card.spec_version).toBe("3.0");
    });

    it("card.json at root is sufficient for a valid CHARX (no avatar required)", () => {
      const zip = new AdmZip();
      zip.addFile("card.json", Buffer.from(JSON.stringify(v3Envelope), "utf-8"));
      const buf = zip.toBuffer();

      const reparsed = new AdmZip(buf);
      expect(reparsed.getEntry("card.json")).not.toBeNull();
      // No avatar asset — still a valid CHARX
      expect(reparsed.getEntry("assets/icon/images/main.png")).toBeNull();
    });
  });

  // ── V3 data field preservation ──

  describe("V3 data field preservation", () => {
    it("preserves all base V2-compatible data fields through round-trip", () => {
      const zip = new AdmZip();
      zip.addFile("card.json", Buffer.from(JSON.stringify(v3Envelope), "utf-8"));
      const buf = zip.toBuffer();

      const reparsed = new AdmZip(buf);
      const entry = reparsed.getEntry("card.json");
      expect(entry).not.toBeNull();
      const card = JSON.parse(entry!.getData().toString("utf-8")) as ParsedCard;

      expect(card.data.name).toBe("CharX Hero");
      expect(card.data.description).toBe("A hero exported as CHARX");
      expect(card.data.personality).toBe("Bold and determined");
      expect(card.data.scenario).toBe("A vast open world");
      expect(card.data.first_mes).toBe("The adventure begins!");
      expect(card.data.creator).toBe("charxtester");
      expect(card.data.tags).toEqual(["charx", "v3"]);
    });

    it("preserves all V3-specific data fields through round-trip", () => {
      const zip = new AdmZip();
      zip.addFile("card.json", Buffer.from(JSON.stringify(v3Envelope), "utf-8"));
      const buf = zip.toBuffer();

      const reparsed = new AdmZip(buf);
      const entry = reparsed.getEntry("card.json");
      expect(entry).not.toBeNull();
      const card = JSON.parse(entry!.getData().toString("utf-8")) as ParsedCard;

      // V3-only fields
      expect(card.data.nickname).toBe("Hero");
      expect(card.data.source).toBe("https://example.com/charx");
      expect(card.data.group_only_greetings).toEqual(["Group greeting!"]);
      expect(card.data.creation_date).toBe(1700000000);
      expect(card.data.modification_date).toBe(1700000001);
      expect(card.data.creator_notes_multilingual).toEqual({ en: "CHARX test", ja: "CHARXテスト" });
      expect(card.data.assets).toEqual([
        { type: "icon", uri: "assets/icon/images/main.png", name: "main", ext: "png" },
      ]);
    });

    it("preserves unicode content through JSON round-trip in card.json", () => {
      const unicodeEnvelope = {
        spec: "chara_card_v3",
        spec_version: "3.0",
        data: {
          name: "日本語キャラクター",
          description: "説明文 🎌 — unicode test",
          nickname: "ニックネーム",
          creator_notes_multilingual: { ja: "日本語メモ", zh: "中文备注", ko: "한국어 메모" },
          group_only_greetings: ["こんにちは！", "안녕하세요!", "你好！"],
        },
      };
      const zip = new AdmZip();
      zip.addFile("card.json", Buffer.from(JSON.stringify(unicodeEnvelope), "utf-8"));
      const buf = zip.toBuffer();

      const reparsed = new AdmZip(buf);
      const entry = reparsed.getEntry("card.json");
      expect(entry).not.toBeNull();
      const card = JSON.parse(entry!.getData().toString("utf-8")) as ParsedCard;

      expect(card.data.name).toBe("日本語キャラクター");
      expect(card.data.description).toBe("説明文 🎌 — unicode test");
      expect(card.data.nickname).toBe("ニックネーム");
      expect(card.data.group_only_greetings).toEqual([
        "こんにちは！",
        "안녕하세요!",
        "你好！",
      ]);
    });

    it("preserves nested character_book through round-trip", () => {
      const bookEnvelope = {
        spec: "chara_card_v3",
        spec_version: "3.0",
        data: {
          name: "Lorebook Character",
          character_book: {
            name: "World Lore",
            entries: [
              { keys: ["kingdom"], content: "The Kingdom of Aldoria.", enabled: true },
              { keys: ["dragon"], content: "Ancient dragons.", enabled: false },
            ],
          },
        },
      };
      const zip = new AdmZip();
      zip.addFile("card.json", Buffer.from(JSON.stringify(bookEnvelope), "utf-8"));
      const buf = zip.toBuffer();

      const reparsed = new AdmZip(buf);
      const entry = reparsed.getEntry("card.json");
      expect(entry).not.toBeNull();
      const card = JSON.parse(entry!.getData().toString("utf-8")) as ParsedCard;

      const book = card.data.character_book as Record<string, unknown>;
      expect(book.name).toBe("World Lore");
      const entries = book.entries as unknown[];
      expect(entries).toHaveLength(2);
    });
  });

  // ── Avatar asset ──

  describe("avatar asset", () => {
    it("includes avatar PNG at assets/icon/images/main.png", () => {
      const avatarPng = createMinimalPng();
      const zip = new AdmZip();
      zip.addFile("card.json", Buffer.from(JSON.stringify(v3Envelope), "utf-8"));
      zip.addFile("assets/icon/images/main.png", avatarPng);
      const buf = zip.toBuffer();

      const reparsed = new AdmZip(buf);

      // card.json still at root
      const cardEntry = reparsed.getEntry("card.json");
      expect(cardEntry).not.toBeNull();

      // avatar at the canonical CCv3 path
      const iconEntry = reparsed.getEntry("assets/icon/images/main.png");
      expect(iconEntry).not.toBeNull();
      expect(iconEntry!.getData().equals(avatarPng)).toBe(true);
    });

    it("avatar asset bytes survive round-trip unchanged", () => {
      const avatarPng = createMinimalPng();
      const zip = new AdmZip();
      zip.addFile("card.json", Buffer.from(JSON.stringify(v3Envelope), "utf-8"));
      zip.addFile("assets/icon/images/main.png", avatarPng);
      const buf = zip.toBuffer();

      const reparsed = new AdmZip(buf);
      const iconEntry = reparsed.getEntry("assets/icon/images/main.png");
      expect(iconEntry).not.toBeNull();
      const extracted = iconEntry!.getData();

      // Verify it's a valid PNG signature
      expect(extracted.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
      // Verify exact byte-for-byte equality
      expect(extracted.equals(avatarPng)).toBe(true);
    });

    it("card.json and avatar can coexist and both parse independently", () => {
      const avatarPng = createMinimalPng();
      const zip = new AdmZip();
      zip.addFile("card.json", Buffer.from(JSON.stringify(v3Envelope), "utf-8"));
      zip.addFile("assets/icon/images/main.png", avatarPng);
      const buf = zip.toBuffer();

      const reparsed = new AdmZip(buf);

      // Parse card.json
      const cardEntry = reparsed.getEntry("card.json");
      expect(cardEntry).not.toBeNull();
      const card = JSON.parse(cardEntry!.getData().toString("utf-8")) as ParsedCard;
      expect(card.spec).toBe("chara_card_v3");
      expect(card.data.name).toBe("CharX Hero");

      // Parse avatar
      const iconEntry = reparsed.getEntry("assets/icon/images/main.png");
      expect(iconEntry).not.toBeNull();
      expect(iconEntry!.getData().length).toBe(avatarPng.length);
    });
  });

  // ── Round-trip from server export format ──

  describe("server export format simulation", () => {
    it("matches the layout produced by export-charx route (pretty-printed card.json)", () => {
      // The route uses JSON.stringify(v3Envelope, null, 2) for card.json
      const zip = new AdmZip();
      zip.addFile(
        "card.json",
        Buffer.from(JSON.stringify(v3Envelope, null, 2), "utf-8"),
      );
      const buf = zip.toBuffer();

      const reparsed = new AdmZip(buf);
      const entry = reparsed.getEntry("card.json");
      expect(entry).not.toBeNull();

      const rawText = entry!.getData().toString("utf-8");
      // Pretty-printed JSON should contain newlines
      expect(rawText).toContain("\n");

      const card = JSON.parse(rawText) as ParsedCard;
      expect(card.spec).toBe("chara_card_v3");
      expect(card.spec_version).toBe("3.0");
      expect(card.data.name).toBe("CharX Hero");
    });

    it("supports .jpg avatar extension as produced by the export route", () => {
      // The route derives the extension from the avatar filename:
      //   const ext = extname(filename).slice(1) || "png";
      //   zip.addFile(`assets/icon/images/main.${ext}`, avatarBuffer);
      const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      const zip = new AdmZip();
      zip.addFile("card.json", Buffer.from(JSON.stringify(v3Envelope), "utf-8"));
      zip.addFile("assets/icon/images/main.jpg", jpegBytes);
      const buf = zip.toBuffer();

      const reparsed = new AdmZip(buf);
      const iconEntry = reparsed.getEntry("assets/icon/images/main.jpg");
      expect(iconEntry).not.toBeNull();
      expect(iconEntry!.getData().equals(jpegBytes)).toBe(true);
    });
  });
});
