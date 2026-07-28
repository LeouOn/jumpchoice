import { existsSync } from "fs";
import { logger } from "../../lib/logger.js";

let tesseractAvailable = false;
try {
  require.resolve("tesseract.js");
  tesseractAvailable = true;
} catch {
  tesseractAvailable = false;
}

export function isOCRAvailable(): boolean {
  return tesseractAvailable;
}

export async function ocrImage(imagePath: string): Promise<string> {
  if (!tesseractAvailable) {
    logger.warn("[ocr] tesseract.js not available");
    return "";
  }

  if (!existsSync(imagePath)) {
    logger.warn("[ocr] File not found: %s", imagePath);
    return "";
  }

  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    const { data: { text } } = await worker.recognize(imagePath);
    await worker.terminate();
    logger.debug("[ocr] Extracted %d chars from %s", text.length, imagePath);
    return text.trim();
  } catch (err) {
    logger.error(err, "[ocr] Failed to OCR image: %s", imagePath);
    return "";
  }
}
