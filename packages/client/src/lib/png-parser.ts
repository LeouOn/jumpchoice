// ──────────────────────────────────────────────
// Utility: Parse SillyTavern PNG character cards
// Thin browser wrapper around the shared PNG parser.
// Extracts JSON from tEXt/iTXt chunks with key "chara" or "ccv3"
// (supports V2 and V3 character card specs), preferring ccv3.
// ──────────────────────────────────────────────
import { extractCardFromPng } from "@jumpchoice/shared";

/**
 * Reads a PNG file's text chunks and extracts character card JSON.
 * Delegates chunk parsing to the shared `extractCardFromPng` and only handles
 * the browser-specific concerns (File → buffer, File → data URL).
 *
 * Returns the parsed JSON object and the raw PNG as a base64 data URL.
 * Throws if the file is not a valid PNG character card.
 */
export async function parsePngCharacterCard(
  file: File,
): Promise<{ json: Record<string, unknown>; imageDataUrl: string }> {
  const buffer = await file.arrayBuffer();
  const json = extractCardFromPng(buffer);
  if (!json) {
    throw new Error("No character data found in PNG — this doesn't appear to be a SillyTavern character card");
  }

  const imageDataUrl = await fileToDataUrl(file);
  return { json, imageDataUrl };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
