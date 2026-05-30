import type { FastifyInstance } from "fastify";
import { existsSync, mkdirSync, unlinkSync, readdirSync, rmSync, statSync } from "fs";
import { join, extname } from "path";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { eq, desc } from "drizzle-orm";
import { newId, now } from "../utils/id-generator.js";
import { DATA_DIR } from "../utils/data-dir.js";
import { createConnectionsStorage } from "../services/storage/connections.storage.js";
import { createLLMProvider } from "../services/llm/provider-registry.js";
import { resolveBaseUrl } from "./generate/generate-route-utils.js";
import { extractFromImage } from "../services/cyoa/cyoa-extractor.js";
import { mergeExtractions } from "../services/cyoa/cyoa-merger.js";
import { analyzeDocument } from "../services/cyoa/cyoa-analyzer.js";
import { cyoaDocuments, cyoaImages, cyoaChoices } from "../db/schema/index.js";
import { logger } from "../lib/logger.js";

const CYOA_DIR = join(DATA_DIR, "cyoa");
const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]);

function toMime(ext: string): string {
  const map: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif" };
  return map[ext] ?? "application/octet-stream";
}

export async function cyoaRoutes(app: FastifyInstance) {
  // POST /upload — single file, creates new document + image
  app.post("/upload", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "No file uploaded" });

    const ext = extname(data.filename).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) return reply.status(400).send({ error: "Unsupported file type: " + ext });

    const docId = newId();
    const timestamp = now();
    const fields = data.fields as Record<string, { value?: string } | undefined> | undefined;
    const name = fields?.name?.value ?? "";
    const description = fields?.description?.value ?? "";

    await app.db.insert(cyoaDocuments).values({
      id: docId,
      name,
      description,
      status: "pending_extraction",
      createdAt: timestamp,
      updatedAt: timestamp,
    }).run();

    const dir = join(CYOA_DIR, docId);
    mkdirSync(dir, { recursive: true });
    const filename = newId() + ext;
    const filePath = join(dir, filename);
    await pipeline(data.file, createWriteStream(filePath));
    const byteSize = statSync(filePath).size;

    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    if (byteSize > MAX_FILE_SIZE) {
      unlinkSync(filePath);
      return reply.status(400).send({ error: "File too large (max 20MB)" });
    }

    const imgId = newId();
    await app.db.insert(cyoaImages).values({
      id: imgId,
      documentId: docId,
      filePath: docId + "/" + filename,
      originalName: data.filename,
      mimeType: toMime(ext),
      byteSize,
      createdAt: timestamp,
    }).run();

    return { id: docId, name, description, status: "pending_extraction", images: [{ id: imgId, filePath: docId + "/" + filename, originalName: data.filename }] };
  });

  // POST /:id/add-image — add image to existing document
  app.post<{ Params: { id: string } }>("/:id/add-image", async (req, reply) => {
    const { id } = req.params;
    const docs = await app.db.select().from(cyoaDocuments).where(eq(cyoaDocuments.id, id));
    const doc = docs[0];
    if (!doc) return reply.status(404).send({ error: "Document not found" });
    if (doc.status !== "pending_extraction") return reply.status(400).send({ error: "Can only add images to documents in pending_extraction status" });

    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "No file uploaded" });

    const ext = extname(data.filename).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) return reply.status(400).send({ error: "Unsupported file type: " + ext });

    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    const dir = join(CYOA_DIR, id);
    mkdirSync(dir, { recursive: true });
    const filename = newId() + ext;
    const filePath = join(dir, filename);
    await pipeline(data.file, createWriteStream(filePath));
    const byteSize = statSync(filePath).size;

    if (byteSize > MAX_FILE_SIZE) {
      unlinkSync(filePath);
      return reply.status(400).send({ error: "File too large (max 20MB)" });
    }

    const imgId = newId();
    const timestamp = now();
    const images = await app.db.select().from(cyoaImages).where(eq(cyoaImages.documentId, id));
    const pageNumber = images.length + 1;

    await app.db.insert(cyoaImages).values({
      id: imgId,
      documentId: id,
      filePath: id + "/" + filename,
      originalName: data.filename,
      mimeType: toMime(ext),
      byteSize,
      pageNumber,
      createdAt: timestamp,
    }).run();

    await app.db.update(cyoaDocuments).set({ updatedAt: timestamp }).where(eq(cyoaDocuments.id, id)).run();

    return { id: imgId, filePath: id + "/" + filename, originalName: data.filename, pageNumber };
  });

  // GET /file/:docId/:filename — serve image files
  app.get<{ Params: { docId: string; filename: string } }>("/file/:docId/:filename", async (req, reply) => {
    const { docId, filename } = req.params;
    if (filename.includes("..") || filename.includes("/") || docId.includes("..") || docId.includes("/")) {
      return reply.status(400).send({ error: "Invalid path" });
    }

    const filePath = join(CYOA_DIR, docId, filename);
    if (!existsSync(filePath)) {
      return reply.status(404).send({ error: "Not found" });
    }

    return reply.sendFile(filename, join(CYOA_DIR, docId));
  });

  // POST /extract — run extraction on all images for a document
  app.post<{ Body: { documentId: string; connectionId: string } }>("/extract", async (req, reply) => {
    const { documentId, connectionId } = req.body;
    if (!documentId || !connectionId) return reply.status(400).send({ error: "documentId and connectionId required" });

    const docs = await app.db.select().from(cyoaDocuments).where(eq(cyoaDocuments.id, documentId));
    const doc = docs[0];
    if (!doc) return reply.status(404).send({ error: "Document not found" });
    if (doc.status !== "pending_extraction") return reply.status(400).send({ error: "Document must be in pending_extraction status, got: " + doc.status });

    const connections = createConnectionsStorage(app.db);
    const conn = await connections.getWithKey(connectionId);
    if (!conn) return reply.status(404).send({ error: "Connection not found" });
    const baseUrl = resolveBaseUrl(conn as any);
    if (!baseUrl) return reply.status(400).send({ error: "Invalid connection configuration" });
    const provider = createLLMProvider(conn.provider, baseUrl, conn.apiKey, conn.maxContext, conn.openrouterProvider, conn.maxTokensOverride);

    const images = await app.db.select().from(cyoaImages).where(eq(cyoaImages.documentId, documentId));
    if (images.length === 0) return reply.status(400).send({ error: "No images found for document" });

    const extractions = [];
    for (const img of images) {
      const imagePath = join(CYOA_DIR, img.filePath);
      try {
        const extraction = await extractFromImage({
          imageId: img.id,
          imagePath,
          pageNumber: img.pageNumber,
          provider: provider as any,
          model: conn.model,
        });
        extractions.push(extraction);
        await app.db.update(cyoaImages).set({ extractionMethod: "vision", extractionResult: JSON.stringify(extraction) }).where(eq(cyoaImages.id, img.id)).run();
      } catch (err) {
        logger.error(err, "[cyoa] Extraction failed for image %s", img.id);
        extractions.push({
          imageId: img.id,
          pageNumber: img.pageNumber,
          extractionMethod: "vision" as const,
          title: null,
          description: null,
          pointBudget: null,
          categories: [],
          choices: [],
          warnings: ["Extraction failed: " + (err instanceof Error ? err.message : String(err))],
        });
      }
    }

    const timestamp = now();
    await app.db.update(cyoaDocuments).set({
      extractions: JSON.stringify(extractions),
      status: "pending_review",
      updatedAt: timestamp,
    }).where(eq(cyoaDocuments.id, documentId)).run();

    return { id: documentId, status: "pending_review", extractions };
  });

  // PUT /review — accept user-corrected extractions
  app.put<{ Body: { documentId: string; extractions: any[] } }>("/review", async (req, reply) => {
    const { documentId, extractions } = req.body;
    if (!documentId || !Array.isArray(extractions)) return reply.status(400).send({ error: "documentId and extractions array required" });

    const docs = await app.db.select().from(cyoaDocuments).where(eq(cyoaDocuments.id, documentId));
    const doc = docs[0];
    if (!doc) return reply.status(404).send({ error: "Document not found" });
    if (doc.status !== "pending_review") return reply.status(400).send({ error: "Document must be in pending_review status" });

    const timestamp = now();
    await app.db.update(cyoaDocuments).set({
      reviewedExtractions: JSON.stringify(extractions),
      status: "reviewed",
      updatedAt: timestamp,
    }).where(eq(cyoaDocuments.id, documentId)).run();

    return { id: documentId, status: "reviewed" };
  });

  // POST /merge — merge extractions into unified document
  app.post<{ Body: { documentId: string } }>("/merge", async (req, reply) => {
    const { documentId } = req.body;
    if (!documentId) return reply.status(400).send({ error: "documentId required" });

    const docs = await app.db.select().from(cyoaDocuments).where(eq(cyoaDocuments.id, documentId));
    const doc = docs[0];
    if (!doc) return reply.status(404).send({ error: "Document not found" });
    if (doc.status !== "reviewed") return reply.status(400).send({ error: "Document must be in reviewed status" });

    const extractions = JSON.parse(doc.reviewedExtractions || "[]");
    const merged = mergeExtractions(extractions);
    const images = await app.db.select().from(cyoaImages).where(eq(cyoaImages.documentId, documentId));

    for (const choice of merged.choices) {
      await app.db.insert(cyoaChoices).values({
        id: choice.id,
        documentId,
        category: choice.category,
        name: choice.name,
        description: choice.description,
        pointCost: choice.pointCost,
        prerequisites: JSON.stringify(choice.prerequisites),
        tags: JSON.stringify(choice.tags),
        sourceImageIds: JSON.stringify(choice.sourceImageIds),
        createdAt: now(),
      }).run();
    }

    const timestamp = now();
    await app.db.update(cyoaDocuments).set({
      mergedDocument: JSON.stringify(merged),
      name: doc.name || merged.title,
      description: doc.description || merged.description,
      pointBudget: merged.pointBudget,
      status: "merged",
      updatedAt: timestamp,
    }).where(eq(cyoaDocuments.id, documentId)).run();

    return { id: documentId, status: "merged", mergedDocument: merged, choicesCount: merged.choices.length };
  });

  // POST /analyze — run LLM analysis
  app.post<{ Body: { documentId: string; connectionId: string } }>("/analyze", async (req, reply) => {
    const { documentId, connectionId } = req.body;
    if (!documentId || !connectionId) return reply.status(400).send({ error: "documentId and connectionId required" });

    const docs = await app.db.select().from(cyoaDocuments).where(eq(cyoaDocuments.id, documentId));
    const doc = docs[0];
    if (!doc) return reply.status(404).send({ error: "Document not found" });
    if (doc.status !== "merged") return reply.status(400).send({ error: "Document must be in merged status" });

    const connections = createConnectionsStorage(app.db);
    const conn = await connections.getWithKey(connectionId);
    if (!conn) return reply.status(404).send({ error: "Connection not found" });
    const baseUrl = resolveBaseUrl(conn as any);
    if (!baseUrl) return reply.status(400).send({ error: "Invalid connection configuration" });
    const provider = createLLMProvider(conn.provider, baseUrl, conn.apiKey, conn.maxContext, conn.openrouterProvider, conn.maxTokensOverride);

    const mergedDoc = JSON.parse(doc.mergedDocument || "{}");
    const analysis = await analyzeDocument({
      document: mergedDoc,
      provider: provider as any,
      model: conn.model,
    });

    for (const [tier, analyses] of Object.entries(analysis.tierList)) {
      for (const ca of analyses as any[]) {
        try {
          await app.db.update(cyoaChoices).set({
            tier: ca.tier || tier,
            costEfficiency: ca.costEfficiency,
            analysisText: ca.analysis || "",
            synergyIds: JSON.stringify(ca.synergies || []),
          }).where(eq(cyoaChoices.id, ca.choiceId)).run();
        } catch (err) {
          logger.warn("[cyoa] Failed to update choice %s: %s", ca.choiceId, err);
        }
      }
    }

    const timestamp = now();
    await app.db.update(cyoaDocuments).set({
      analysis: JSON.stringify(analysis),
      status: "analyzed",
      updatedAt: timestamp,
    }).where(eq(cyoaDocuments.id, documentId)).run();

    return { id: documentId, status: "analyzed", analysis };
  });

  // GET / — list all documents
  app.get("/", async () => {
    const docs = await app.db.select().from(cyoaDocuments).orderBy(desc(cyoaDocuments.createdAt));
    const results = [];
    for (const doc of docs) {
      const choices = await app.db.select({ id: cyoaChoices.id }).from(cyoaChoices).where(eq(cyoaChoices.documentId, doc.id));
      results.push({ ...doc, choiceCount: choices.length });
    }
    return results;
  });

  // GET /:id — get single document with images and choices
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = req.params;
    const docs = await app.db.select().from(cyoaDocuments).where(eq(cyoaDocuments.id, id));
    const doc = docs[0];
    if (!doc) return reply.status(404).send({ error: "Not found" });

    const images = await app.db.select().from(cyoaImages).where(eq(cyoaImages.documentId, id));
    const choices = await app.db.select().from(cyoaChoices).where(eq(cyoaChoices.documentId, id));

    return {
      ...doc,
      extractions: JSON.parse(doc.extractions || "[]"),
      reviewedExtractions: JSON.parse(doc.reviewedExtractions || "[]"),
      mergedDocument: JSON.parse(doc.mergedDocument || "{}"),
      analysis: JSON.parse(doc.analysis || "{}"),
      images,
      choices,
    };
  });

  // DELETE /:id — delete document + files
  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = req.params;
    const docs = await app.db.select().from(cyoaDocuments).where(eq(cyoaDocuments.id, id));
    const doc = docs[0];
    if (!doc) return reply.status(404).send({ error: "Not found" });

    const dir = join(CYOA_DIR, id);
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }

    await app.db.delete(cyoaChoices).where(eq(cyoaChoices.documentId, id)).run();
    await app.db.delete(cyoaImages).where(eq(cyoaImages.documentId, id)).run();
    await app.db.delete(cyoaDocuments).where(eq(cyoaDocuments.id, id)).run();

    return { success: true };
  });
}
