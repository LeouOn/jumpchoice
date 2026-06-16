import { api } from "./api-client";
import { parsePngCharacterCard } from "./png-parser";

export interface EmbeddedLorebookImportPreview {
  filename: string;
  success: boolean;
  name?: string;
  hasEmbeddedLorebook: boolean;
  embeddedLorebookEntries: number;
  error?: string;
}

export function countLorebookEntries(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const entries = (value as Record<string, unknown>).entries;
  if (Array.isArray(entries)) return entries.length;
  if (entries && typeof entries === "object") return Object.keys(entries).length;
  return 0;
}

export function hasLorebookEntries(value: unknown): boolean {
  return countLorebookEntries(value) > 0;
}

export function readEmbeddedLorebookFromCharacterPayload(raw: Record<string, unknown>): unknown {
  const target =
    (raw.spec === "chara_card_v2" || raw.spec === "chara_card_v3") &&
    raw.data &&
    typeof raw.data === "object" &&
    !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>)
      : raw;

  return target.character_book;
}

export function confirmEmbeddedLorebookImport(characterName: string, embeddedLorebook: unknown): boolean {
  const entryCount = countLorebookEntries(embeddedLorebook);
  if (entryCount === 0) return true;

  return window.confirm(
    `${characterName} includes an embedded lorebook with ${entryCount} entr${entryCount === 1 ? "y" : "ies"}.\n\nImport it as a standalone Marinara lorebook too?`,
  );
}

export async function inspectCharacterFilesForEmbeddedLorebooks(
  files: File[],
): Promise<EmbeddedLorebookImportPreview[]> {
  if (files.length === 0) return [];

  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }

  const result = await api.upload<{
    success: boolean;
    results: EmbeddedLorebookImportPreview[];
  }>("/import/st-character/inspect", form);

  return result.results.filter((item) => item.success && item.hasEmbeddedLorebook);
}

// ── V3 card detection (client-side, display-only) ──

export interface V3CardPreview {
  filename: string;
  format: "png" | "charx" | "json";
  nickname?: string;
  assetCount?: number;
}

function extractV3InfoFromCardJson(json: Record<string, unknown>): {
  nickname?: string;
  assetCount?: number;
} {
  const data =
    json.data && typeof json.data === "object" && !Array.isArray(json.data)
      ? (json.data as Record<string, unknown>)
      : json;
  const rawNickname = data.nickname;
  const nickname =
    typeof rawNickname === "string" && rawNickname.trim() ? rawNickname.trim() : undefined;
  const rawAssets = data.assets;
  const assetCount = Array.isArray(rawAssets) ? rawAssets.length : undefined;
  return { nickname, assetCount };
}

/**
 * Inspects character files client-side and returns the ones that are
 * Character Card V3 (`spec === "chara_card_v3"`). CharX (.charx) is the V3
 * zip format by definition, so it is always reported as V3. PNG and JSON
 * files are parsed locally to read the spec field.
 */
export async function inspectCharacterFilesForV3(files: File[]): Promise<V3CardPreview[]> {
  const previews: V3CardPreview[] = [];

  for (const file of files) {
    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith(".charx")) {
        previews.push({ filename: file.name, format: "charx" });
        continue;
      }
      if (lower.endsWith(".png")) {
        const { json } = await parsePngCharacterCard(file);
        if (json.spec !== "chara_card_v3") continue;
        previews.push({ filename: file.name, format: "png", ...extractV3InfoFromCardJson(json) });
        continue;
      }
      if (lower.endsWith(".json")) {
        const json = JSON.parse(await file.text()) as Record<string, unknown>;
        // Marinara native envelopes are handled by a separate import path.
        const isMarinara =
          json.version === 1 &&
          typeof json.type === "string" &&
          (json.type as string).startsWith("marinara_");
        if (isMarinara || json.spec !== "chara_card_v3") continue;
        previews.push({ filename: file.name, format: "json", ...extractV3InfoFromCardJson(json) });
        continue;
      }
    } catch {
      // Unreadable file — skip; the import itself will surface any real error.
    }
  }

  return previews;
}
