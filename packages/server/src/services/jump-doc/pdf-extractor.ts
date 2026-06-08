import { readFile } from "fs/promises";
import { logger } from "../../lib/logger.js";

export async function extractPdfText(filePath: string): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const buf = await readFile(filePath);
    const pdf = new PDFParse({ data: new Uint8Array(buf) });
    const result = await pdf.getText();
    await pdf.destroy();
    return result.text;
  } catch (err) {
    logger.error(err, "[pdf-extractor] Failed to extract text from PDF: %s", filePath);
    return "[PDF text extraction failed]";
  }
}

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = filePath.toLowerCase().split(".").pop() ?? "";

  const textExts = new Set([
    "txt",
    "md",
    "csv",
    "json",
    "xml",
    "html",
    "htm",
    "log",
    "yaml",
    "yml",
    "tsv",
  ]);

  if (textExts.has(ext)) {
    return readFile(filePath, "utf-8");
  }

  if (ext === "pdf") {
    return extractPdfText(filePath);
  }

  return "";
}