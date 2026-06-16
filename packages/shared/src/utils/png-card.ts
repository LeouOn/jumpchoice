// ──────────────────────────────────────────────
// PNG Character Card Parser (shared)
// ──────────────────────────────────────────────
// Extracts character card data from PNG tEXt/iTXt chunks.
// Supports both V2 ('chara') and V3 ('ccv3') keywords, preferring V3.
//
// Pure Uint8Array manipulation with a self-contained base64 + UTF-8 decoder,
// so the module runs in Node.js, browsers, and any ES2022 environment
// without depending on TextDecoder/Buffer/atob type declarations.

/** Keywords that carry a character card payload. ccv3 = V3, chara = V2. */
const CC_KEYWORDS = new Set(["ccv3", "chara"]);

/** 8-byte PNG file signature. */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// ─── Base64 decode (pure JS) ──────────────────────────────────────────────
// Standard RFC 4648 base64 decoder. Streaming bit-buffer implementation
// that handles padding and whitespace transparently.

const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_DECODE_TABLE: Int8Array = (() => {
  const table = new Int8Array(128).fill(-1);
  for (let i = 0; i < B64_ALPHABET.length; i++) {
    table[B64_ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

function b64CharVal(code: number): number {
  return code < 128 ? (B64_DECODE_TABLE[code] ?? -1) : -1;
}

/** Decode a base64 string into a new Uint8Array. Skips padding and whitespace. */
function base64ToBytes(input: string): Uint8Array {
  const len = input.length;
  // Upper bound: every 4 source chars yield at most 3 bytes. Slight over-allocation
  // is trimmed with subarray at the end.
  const out = new Uint8Array(Math.ceil(len / 4) * 3);
  let outPos = 0;
  let bits = 0;
  let count = 0;

  for (let i = 0; i < len; i++) {
    const val = b64CharVal(input.charCodeAt(i));
    if (val < 0) continue; // skip '=', whitespace, newlines, etc.

    bits = (bits << 6) | val;
    count += 6;
    if (count >= 8) {
      count -= 8;
      out[outPos++] = (bits >> count) & 0xff;
      bits &= (1 << count) - 1; // retain only the unflushed low bits
    }
  }

  return out.subarray(0, outPos);
}

// ─── UTF-8 decode (pure JS) ───────────────────────────────────────────────
// Tolerant UTF-8 decoder. Stray continuation bytes are skipped rather than
// throwing, matching the forgiving behavior of TextDecoder's default mode.

function utf8Decode(bytes: Uint8Array): string {
  let result = "";
  let i = 0;
  const len = bytes.length;
  while (i < len) {
    const b1 = bytes[i++]!;
    if (b1 < 0x80) {
      // U+0000–U+007F
      result += String.fromCharCode(b1);
    } else if (b1 < 0xc0) {
      // Stray continuation byte — skip (tolerant decoder)
    } else if (b1 < 0xe0) {
      // U+0080–U+07FF (2 bytes)
      if (i >= len) break;
      const b2 = bytes[i++]!;
      result += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f));
    } else if (b1 < 0xf0) {
      // U+0800–U+FFFF (3 bytes)
      if (i + 1 >= len) break;
      const b2 = bytes[i++]!;
      const b3 = bytes[i++]!;
      result += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f));
    } else {
      // U+10000–U+10FFFF (4 bytes → UTF-16 surrogate pair)
      if (i + 2 >= len) break;
      const b2 = bytes[i++]!;
      const b3 = bytes[i++]!;
      const b4 = bytes[i++]!;
      const cp = ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
      const adj = cp - 0x10000;
      result += String.fromCharCode(0xd800 + (adj >> 10), 0xdc00 + (adj & 0x3ff));
    }
  }
  return result;
}

// ─── Byte-level helpers ───────────────────────────────────────────────────

/** Find the first null byte at or after `from`. Returns its index, or -1. */
function findNull(data: Uint8Array, from: number): number {
  for (let i = from; i < data.length; i++) {
    if (data[i] === 0) return i;
  }
  return -1;
}

/** Read a Latin1/ASCII byte range as a string (chunk type, keyword). */
function asciiSlice(data: Uint8Array, start: number, end: number): string {
  let s = "";
  for (let i = start; i < end; i++) s += String.fromCharCode(data[i]!);
  return s;
}

/** Read a big-endian uint32 at `offset`. Caller guarantees 4 bytes are available. */
function readUint32BE(data: Uint8Array, offset: number): number {
  return (
    ((data[offset]! << 24) | (data[offset + 1]! << 16) | (data[offset + 2]! << 8) | data[offset + 3]!) >>>
    0
  );
}

/** Normalize the accepted buffer shapes into a Uint8Array view (no copy). */
function toUint8Array(buffer: Uint8Array | ArrayBuffer | ArrayBufferView): Uint8Array {
  if (buffer instanceof Uint8Array) return buffer;
  if (ArrayBuffer.isView(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  // ArrayBuffer
  return new Uint8Array(buffer as ArrayBuffer);
}

// ─── Main entry point ─────────────────────────────────────────────────────

/**
 * Extract a character card JSON object from a PNG buffer.
 *
 * Walks PNG chunks looking for `tEXt` and `iTXt` chunks whose keyword is
 * `ccv3` (V3 spec) or `chara` (V2 spec). The chunk payload is base64-decoded
 * (or read directly for iTXt) into a UTF-8 JSON string and parsed.
 *
 * When both keywords are present, `ccv3` is preferred over `chara` because V3
 * carries the full card data while V2 is often a backward-compat fallback.
 *
 * @param buffer PNG file bytes. Accepts `Uint8Array`, `ArrayBuffer`, or any
 *   `ArrayBufferView` (e.g. Node.js `Buffer`, which extends `Uint8Array`).
 * @returns The parsed card object, or `null` if the buffer is not a valid PNG
 *   or contains no character-card chunk.
 */
export function extractCardFromPng(
  buffer: Uint8Array | ArrayBuffer | ArrayBufferView,
): Record<string, unknown> | null {
  const bytes = toUint8Array(buffer);

  // Verify minimum size and PNG signature
  if (bytes.length < 8) return null;
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return null;
  }

  const found = new Map<string, Record<string, unknown>>();
  let offset = 8; // skip signature

  // Leave at least 8 bytes for a chunk header (length + type)
  while (offset < bytes.length - 8) {
    const length = readUint32BE(bytes, offset);
    const type = String.fromCharCode(
      bytes[offset + 4]!,
      bytes[offset + 5]!,
      bytes[offset + 6]!,
      bytes[offset + 7]!,
    );
    const payloadStart = offset + 8;
    const payloadEnd = payloadStart + length;
    const payload = bytes.subarray(payloadStart, payloadEnd);

    if (type === "tEXt") {
      // tEXt chunk layout: keyword \0 text
      // Keyword is Latin1; text is conventionally base64-encoded UTF-8 JSON.
      const nullIdx = findNull(payload, 0);
      if (nullIdx >= 0) {
        const keyword = asciiSlice(payload, 0, nullIdx);
        if (CC_KEYWORDS.has(keyword) && !found.has(keyword)) {
          const b64 = asciiSlice(payload, nullIdx + 1, payload.length);
          try {
            const jsonStr = utf8Decode(base64ToBytes(b64));
            found.set(keyword, JSON.parse(jsonStr) as Record<string, unknown>);
          } catch {
            /* skip malformed */
          }
        }
      }
    } else if (type === "iTXt") {
      // iTXt chunk layout:
      //   keyword \0 compressionFlag compressionMethod
      //   languageTag \0 translatedKeyword \0 text
      // Text is UTF-8 (may be raw JSON or base64-encoded).
      const nullIdx = findNull(payload, 0);
      if (nullIdx >= 0) {
        const keyword = asciiSlice(payload, 0, nullIdx);
        if (CC_KEYWORDS.has(keyword) && !found.has(keyword)) {
          const compressionFlag = payload[nullIdx + 1];
          // Only uncompressed iTXt is handled (compressionFlag === 0).
          // Compressed iTXt is rare for character cards; skip otherwise.
          if (compressionFlag === 0) {
            // nullIdx+1 = compressionFlag, nullIdx+2 = compressionMethod,
            // then languageTag \0 translatedKeyword \0 text
            const langEnd = findNull(payload, nullIdx + 3);
            if (langEnd >= 0) {
              const transEnd = findNull(payload, langEnd + 1);
              if (transEnd >= 0) {
                const textBytes = payload.subarray(transEnd + 1);
                const text = utf8Decode(textBytes);
                // iTXt may carry raw JSON or base64-encoded JSON — try both.
                try {
                  found.set(keyword, JSON.parse(text) as Record<string, unknown>);
                } catch {
                  try {
                    const decoded = utf8Decode(base64ToBytes(text));
                    found.set(keyword, JSON.parse(decoded) as Record<string, unknown>);
                  } catch {
                    /* skip */
                  }
                }
              }
            }
          }
        }
      }
    }

    // Advance past length(4) + type(4) + data(length) + crc(4)
    offset = payloadEnd + 4;
    if (type === "IEND") break;
  }

  // Prefer ccv3 (V3 full data) over chara (V2 / backward-compat)
  return found.get("ccv3") ?? found.get("chara") ?? null;
}
