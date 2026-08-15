import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const dataDir = await mkdtemp(join(tmpdir(), "marinara-cyoa-routes-"));
process.env.DATA_DIR = dataDir;

const { createFileNativeDB } = await import("../../packages/server/src/db/file-backed-store.js");
const { cyoaDocuments, cyoaImages, cyoaChoices } = await import("../../packages/server/src/db/schema/index.js");
const { cyoaRoutes } = await import("../../packages/server/src/routes/cyoa.routes.js");
const Fastify = (await import("../../packages/server/node_modules/fastify/fastify.js")).default;
const multipart = (await import("../../packages/server/node_modules/@fastify/multipart/index.js")).default;
const { eq } = await import("../../packages/server/src/db/file-query.js");

const db = await createFileNativeDB();

async function buildApp() {
  const app = Fastify();
  await app.register(multipart);
  app.decorate("db", db);
  await app.register(cyoaRoutes, { prefix: "/api/cyoa" });
  await app.ready();
  return app;
}

async function seedDocument(overrides: Record<string, unknown> = {}) {
  await db
    .insert(cyoaDocuments)
    .values({
      id: "doc1",
      name: "Test Document",
      description: "",
      status: "pending_extraction",
      pointBudget: null,
      metadata: "{}",
      extractions: "[]",
      reviewedExtractions: "[]",
      mergedDocument: "{}",
      analysis: "{}",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...overrides,
    })
    .run();
}

const reviewedExtraction = {
  imageId: "img1",
  pageNumber: 1,
  extractionMethod: "vision",
  title: "Regression CYOA",
  description: "A seeded document for merge coverage",
  pointBudget: 20,
  categories: ["regression"],
  choices: [
    {
      name: "Seeded Choice",
      description: "A choice seeded for the merge pipeline",
      category: "regression",
      pointCost: 5,
      prerequisites: [],
      tags: ["seed"],
      confidence: 0.9,
    },
  ],
  warnings: [],
};

try {
  // GET /api/cyoa — empty list on a fresh database.
  {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/cyoa" });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), []);
    await app.close();
  }

  // GET /api/cyoa/:id — 404 contract.
  {
    const app = await buildApp();
    const missing = await app.inject({ method: "GET", url: "/api/cyoa/nonexistent" });
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json().error, "Not found");
    await app.close();
  }

  // GET /api/cyoa/:id — joined images and choices payload.
  await seedDocument({ status: "analyzed" });
  await db
    .insert(cyoaImages)
    .values({
      id: "img1",
      documentId: "doc1",
      filePath: "doc1/img.png",
      originalName: "img.png",
      mimeType: "image/png",
      byteSize: 1024,
      pageNumber: 1,
      extractionMethod: null,
      extractionResult: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    })
    .run();
  await db
    .insert(cyoaChoices)
    .values({
      id: "ch1",
      documentId: "doc1",
      category: "regression",
      name: "Seeded Choice",
      description: "",
      pointCost: 5,
      prerequisites: "[]",
      tags: "[]",
      tier: null,
      costEfficiency: null,
      synergyIds: "[]",
      analysisText: "",
      sourceImageIds: '["img1"]',
      metadata: "{}",
      createdAt: "2026-01-01T00:00:00.000Z",
    })
    .run();
  {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/cyoa/doc1" });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.id, "doc1");
    assert.equal(body.images.length, 1);
    assert.equal(body.choices.length, 1);
    await app.close();
  }

  // DELETE /api/cyoa/:id — 404 contract and successful delete with read-back.
  {
    const app = await buildApp();
    const missing = await app.inject({ method: "DELETE", url: "/api/cyoa/nonexistent" });
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json().error, "Not found");
    await app.close();
  }
  await seedDocument({ id: "doc2", name: "Deletion target" });
  {
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: "/api/cyoa/doc2" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().success, true);
    const readBack = await app.inject({ method: "GET", url: "/api/cyoa/doc2" });
    assert.equal(readBack.statusCode, 404);
    await app.close();
  }

  // PUT /api/cyoa/review — validation and the pending_review status gate.
  {
    const app = await buildApp();
    const missingFields = await app.inject({ method: "PUT", url: "/api/cyoa/review", payload: {} });
    assert.equal(missingFields.statusCode, 400);
    assert.ok(String(missingFields.json().error).includes("required"));
    const missingDoc = await app.inject({
      method: "PUT",
      url: "/api/cyoa/review",
      payload: { documentId: "missing", extractions: [] },
    });
    assert.equal(missingDoc.statusCode, 404);
    await app.close();
  }
  await seedDocument({ id: "doc3", status: "pending_extraction" });
  {
    const app = await buildApp();
    const wrongStatus = await app.inject({
      method: "PUT",
      url: "/api/cyoa/review",
      payload: { documentId: "doc3", extractions: [] },
    });
    assert.equal(wrongStatus.statusCode, 400);
    assert.ok(String(wrongStatus.json().error).includes("pending_review"));
    await app.close();
  }
  await seedDocument({ id: "doc4", status: "pending_review" });
  {
    const app = await buildApp();
    const accepted = await app.inject({
      method: "PUT",
      url: "/api/cyoa/review",
      payload: { documentId: "doc4", extractions: [reviewedExtraction] },
    });
    assert.equal(accepted.statusCode, 200);
    assert.equal(accepted.json().status, "reviewed");
    const stored = await db.select().from(cyoaDocuments).where(eq(cyoaDocuments.id, "doc4"));
    assert.equal(stored[0]?.status, "reviewed");
    await app.close();
  }

  // POST /api/cyoa/extract — validation branches (the LLM-backed happy path is
  // exercised through the document workflow, not this contract script).
  {
    const app = await buildApp();
    const missingFields = await app.inject({ method: "POST", url: "/api/cyoa/extract", payload: {} });
    assert.equal(missingFields.statusCode, 400);
    assert.ok(String(missingFields.json().error).includes("required"));
    const missingDoc = await app.inject({
      method: "POST",
      url: "/api/cyoa/extract",
      payload: { documentId: "missing", connectionId: "conn1" },
    });
    assert.equal(missingDoc.statusCode, 404);
    await app.close();
  }

  // POST /api/cyoa/merge — validation, the reviewed status gate, and the real
  // merger turning reviewed extractions into a merged document.
  {
    const app = await buildApp();
    const missingFields = await app.inject({ method: "POST", url: "/api/cyoa/merge", payload: {} });
    assert.equal(missingFields.statusCode, 400);
    assert.ok(String(missingFields.json().error).includes("required"));
    const missingDoc = await app.inject({ method: "POST", url: "/api/cyoa/merge", payload: { documentId: "missing" } });
    assert.equal(missingDoc.statusCode, 404);
    await app.close();
  }
  await seedDocument({ id: "doc5", status: "pending_review" });
  {
    const app = await buildApp();
    const wrongStatus = await app.inject({ method: "POST", url: "/api/cyoa/merge", payload: { documentId: "doc5" } });
    assert.equal(wrongStatus.statusCode, 400);
    assert.ok(String(wrongStatus.json().error).includes("reviewed"));
    await app.close();
  }
  await seedDocument({
    id: "doc6",
    status: "reviewed",
    reviewedExtractions: JSON.stringify([reviewedExtraction]),
  });
  {
    const app = await buildApp();
    const merged = await app.inject({ method: "POST", url: "/api/cyoa/merge", payload: { documentId: "doc6" } });
    assert.equal(merged.statusCode, 200);
    assert.equal(merged.json().status, "merged");
    const storedChoices = await db.select().from(cyoaChoices).where(eq(cyoaChoices.documentId, "doc6"));
    assert.equal(storedChoices.length, 1);
    assert.equal(storedChoices[0]?.name, "Seeded Choice");
    await app.close();
  }

  // POST /api/cyoa/analyze — validation branches.
  {
    const app = await buildApp();
    const missingFields = await app.inject({ method: "POST", url: "/api/cyoa/analyze", payload: {} });
    assert.equal(missingFields.statusCode, 400);
    const missingDoc = await app.inject({
      method: "POST",
      url: "/api/cyoa/analyze",
      payload: { documentId: "missing", connectionId: "conn1" },
    });
    assert.equal(missingDoc.statusCode, 404);
    await app.close();
  }

  process.stdout.write("CYOA routes regression passed.\n");
} finally {
  await rm(dataDir, { recursive: true, force: true });
}
