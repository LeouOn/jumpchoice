# CYOA Image Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-step pipeline that takes CYOA images, extracts structured data via vision LLM or OCR, lets users review/correct, merges into a unified document, then runs LLM analysis for tier lists, synergies, and build archetypes.

**Architecture:** Step-by-step API pipeline with 5 stages (upload → extract → review → merge → analyze). Uses vision LLM (GPT-4V/Gemini/Claude) as primary extraction, tesseract.js OCR as fallback. Three new database tables store documents, images, and choices.

**Tech Stack:** TypeScript, Fastify 5, Drizzle ORM (SQLite), tesseract.js, Vitest

**Spec:** `docs/superpowers/specs/2026-05-25-cyoa-image-pipeline-design.md`

---

## File Structure

### New Files

- `packages/server/src/db/schema/cyoa.ts` — Database schema for CYOA tables
- `packages/server/src/services/cyoa/cyoa-extractor.ts` — Vision/OCR extraction service
- `packages/server/src/services/cyoa/cyoa-merger.ts` — Multi-image merge and deduplication
- `packages/server/src/services/cyoa/cyoa-analyzer.ts` — LLM analysis (tiers, synergies, builds)
- `packages/server/src/services/cyoa/ocr-service.ts` — Tesseract.js OCR wrapper
- `packages/server/src/services/cyoa/cyoa-types.ts` — Shared TypeScript interfaces
- `packages/server/src/routes/cyoa.routes.ts` — API routes for the pipeline
- `packages/server/tests/cyoa-extractor.test.ts` — Extractor tests
- `packages/server/tests/cyoa-merger.test.ts` — Merger tests
- `packages/server/tests/cyoa-analyzer.test.ts` — Analyzer tests
- `packages/server/tests/cyoa-integration.test.ts` — End-to-end integration tests

### Modified Files

- `packages/server/src/db/schema/index.ts` — Export CYOA tables
- `packages/server/src/db/migrate.ts` — Add CYOA table migrations
- `packages/server/src/db/file-backed-store.ts` — Register CYOA tables
- `packages/server/src/routes/index.ts` — Register CYOA routes
- `packages/server/src/routes/admin.routes.ts` — Add CYOA tables to admin reset

---

## Task 1: Database Schema & Migration

**Files:**
- Create: `packages/server/src/db/schema/cyoa.ts`
- Modify: `packages/server/src/db/schema/index.ts`
- Modify: `packages/server/src/db/migrate.ts`
- Modify: `packages/server/src/db/file-backed-store.ts`
- Modify: `packages/server/src/routes/admin.routes.ts`

- [ ] **Step 1: Create cyoa.ts schema**

```typescript
// packages/server/src/db/schema/cyoa.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const cyoaDocuments = sqliteTable("cyoa_documents", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  description: text("description").notNull().default(""),
  status: text("status", {
    enum: ["pending_upload", "pending_extraction", "pending_review", "reviewed", "merged", "analyzed"],
  }).notNull().default("pending_upload"),
  pointBudget: integer("point_budget"),
  metadata: text("metadata").notNull().default("{}"),
  extractions: text("extractions").notNull().default("[]"),
  reviewedExtractions: text("reviewed_extractions").notNull().default("[]"),
  mergedDocument: text("merged_document").notNull().default("{}"),
  analysis: text("analysis").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const cyoaImages = sqliteTable("cyoa_images", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => cyoaDocuments.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  originalName: text("original_name").notNull().default(""),
  mimeType: text("mime_type").notNull().default("image/png"),
  byteSize: integer("byte_size").notNull().default(0),
  pageNumber: integer("page_number"),
  extractionMethod: text("extraction_method", { enum: ["vision", "ocr"] }),
  extractionResult: text("extraction_result"),
  createdAt: text("created_at").notNull(),
});

export const cyoaChoices = sqliteTable("cyoa_choices", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => cyoaDocuments.id, { onDelete: "cascade" }),
  category: text("category").notNull().default("uncategorized"),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  pointCost: integer("point_cost").notNull().default(0),
  prerequisites: text("prerequisites").notNull().default("[]"),
  tags: text("tags").notNull().default("[]"),
  tier: text("tier", { enum: ["S", "A", "B", "C", "D", "F"] }),
  costEfficiency: integer("cost_efficiency"),
  synergyIds: text("synergy_ids").notNull().default("[]"),
  analysisText: text("analysis_text").notNull().default(""),
  sourceImageIds: text("source_image_ids").notNull().default("[]"),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
});
```

- [ ] **Step 2: Export from schema index**

Add to `packages/server/src/db/schema/index.ts`:
```typescript
export * from "./cyoa.js";
```

- [ ] **Step 3: Add migrations to migrate.ts**

Add 3 CREATE TABLE statements and 2 indexes. Follow existing pattern (idempotent `CREATE TABLE IF NOT EXISTS`).

- [ ] **Step 4: Register file-backed tables**

Add to `packages/server/src/db/file-backed-store.ts`:
```typescript
"cyoa_documents",
"cyoa_images",
"cyoa_choices",
```
Plus parent-child relationships:
```typescript
{ parent: "cyoa_documents", child: "cyoa_images", parentKey: "id", childKey: "documentId" },
{ parent: "cyoa_documents", child: "cyoa_choices", parentKey: "id", childKey: "documentId" },
```

- [ ] **Step 5: Add to admin reset**

Add before existing memory deletes in admin.routes.ts:
```typescript
await runDelete("cyoa_choices", () => db.delete(schema.cyoaChoices).run());
await runDelete("cyoa_images", () => db.delete(schema.cyoaImages).run());
await runDelete("cyoa_documents", () => db.delete(schema.cyoaDocuments).run());
```

- [ ] **Step 6: Verify TypeScript compiles and commit**

```bash
cd packages/server && npx tsc --noEmit
git add -A && git commit -m "feat: add CYOA database schema and migration"
```

---

## Task 2: Shared Types

**Files:**
- Create: `packages/server/src/services/cyoa/cyoa-types.ts`

- [ ] **Step 1: Create shared type definitions**

```typescript
// packages/server/src/services/cyoa/cyoa-types.ts

export interface CYOARawChoice {
  name: string;
  description: string;
  category: string;
  pointCost: number;
  prerequisites: string[];
  tags: string[];
  confidence: number;
  rawText?: string;
}

export interface CYOAExtraction {
  imageId: string;
  pageNumber: number | null;
  extractionMethod: "vision" | "ocr";
  title: string | null;
  description: string | null;
  pointBudget: number | null;
  categories: string[];
  choices: CYOARawChoice[];
  warnings: string[];
}

export interface CYOAChoice {
  id: string;
  name: string;
  description: string;
  category: string;
  pointCost: number;
  prerequisites: string[];
  tags: string[];
  sourceImageIds: string[];
}

export interface CYOADocument {
  title: string;
  description: string;
  pointBudget: number | null;
  categories: string[];
  choices: CYOAChoice[];
  imageCount: number;
  mergedAt: string;
}

export interface CYOAChoiceAnalysis {
  choiceId: string;
  choiceName: string;
  tier: string;
  costEfficiency: number;
  synergies: string[];
  analysis: string;
}

export interface SynergyPair {
  choiceIds: string[];
  description: string;
  combinedValue: "high" | "medium" | "low";
}

export interface BuildArchetype {
  name: string;
  description: string;
  recommendedChoiceIds: string[];
  totalPointCost: number;
  strengths: string[];
  weaknesses: string[];
}

export interface CYOAAnalysis {
  tierList: Record<string, CYOAChoiceAnalysis[]>;
  categorySummaries: Record<string, string>;
  topSynergies: SynergyPair[];
  buildArchetypes: BuildArchetype[];
  overallSummary: string;
  analyzedAt: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles and commit**

```bash
cd packages/server && npx tsc --noEmit
git add -A && git commit -m "feat: add CYOA shared type definitions"
```

---

## Task 3: OCR Service

**Files:**
- Create: `packages/server/src/services/cyoa/ocr-service.ts`
- Create: `packages/server/tests/cyoa-ocr.test.ts`

- [ ] **Step 1: Install tesseract.js**

```bash
cd packages/server && pnpm add tesseract.js
```

- [ ] **Step 2: Write tests**

Create `packages/server/tests/cyoa-ocr.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { ocrImage, isOCRAvailable } from "../src/services/cyoa/ocr-service.js";

describe("OCR Service", () => {
  it("should report availability based on tesseract.js", () => {
    const available = isOCRAvailable();
    expect(typeof available).toBe("boolean");
  });

  it("should return empty string for non-existent file", async () => {
    const result = await ocrImage("/nonexistent/path.png");
    expect(result).toBe("");
  });
});
```

- [ ] **Step 3: Implement OCR service**

Create `packages/server/src/services/cyoa/ocr-service.ts`:

```typescript
import { existsSync, readFileSync } from "fs";
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
```

- [ ] **Step 4: Run tests and commit**

```bash
npx vitest run packages/server/tests/cyoa-ocr.test.ts
git add -A && git commit -m "feat: add OCR service with tesseract.js"
```

---

## Task 4: CYOAExtractor Service

**Files:**
- Create: `packages/server/src/services/cyoa/cyoa-extractor.ts`
- Create: `packages/server/tests/cyoa-extractor.test.ts`

- [ ] **Step 1: Write tests (7 tests)**

Tests should cover: vision extraction success, OCR fallback, empty LLM response, invalid JSON handling, confidence scores, warning generation, missing image.

- [ ] **Step 2: Implement extractor**

Vision path: convert image to base64 data URL → send to LLM with extraction prompt → parse JSON response.
OCR fallback path: call `ocrImage()` → send text to LLM with structuring prompt → parse JSON response.
Both paths: validate against CYOAExtraction interface, add warnings for low-confidence choices.

- [ ] **Step 3: Run tests and commit**

```bash
npx vitest run packages/server/tests/cyoa-extractor.test.ts
git add -A && git commit -m "feat: implement CYOA extractor with vision/OCR"
```

---

## Task 5: CYOAMerger Service

**Files:**
- Create: `packages/server/src/services/cyoa/cyoa-merger.ts`
- Create: `packages/server/tests/cyoa-merger.test.ts`

- [ ] **Step 1: Write tests (8 tests)**

Tests should cover: single extraction merge, multi-image dedup, category normalization, prerequisite resolution, empty extractions, conflicting data resolution, source image tracking, fuzzy name matching.

- [ ] **Step 2: Implement merger**

Pure function (no DB, no LLM). Takes `CYOAExtraction[]`, returns `CYOADocument`. Dedup by case-insensitive name matching. Generate nanoid for each choice. Resolve prerequisites by name→ID lookup.

- [ ] **Step 3: Run tests and commit**

```bash
npx vitest run packages/server/tests/cyoa-merger.test.ts
git add -A && git commit -m "feat: implement CYOA merger with deduplication"
```

---

## Task 6: CYOAAnalyzer Service

**Files:**
- Create: `packages/server/src/services/cyoa/cyoa-analyzer.ts`
- Create: `packages/server/tests/cyoa-analyzer.test.ts`

- [ ] **Step 1: Write tests (6 tests)**

Tests should cover: successful analysis, tier assignment, synergy detection, build archetypes, LLM failure, empty document.

- [ ] **Step 2: Implement analyzer**

Send merged document to LLM with analysis prompt. Parse JSON response into CYOAAnalysis. Handle invalid JSON with retry.

- [ ] **Step 3: Run tests and commit**

```bash
npx vitest run packages/server/tests/cyoa-analyzer.test.ts
git add -A && git commit -m "feat: implement CYOA analyzer with tier lists and synergies"
```

---

## Task 7: API Routes

**Files:**
- Create: `packages/server/src/routes/cyoa.routes.ts`
- Modify: `packages/server/src/routes/index.ts`

- [ ] **Step 1: Create route file**

Implement 7 endpoints following the gallery.routes.ts pattern:
- `POST /upload` — multipart file upload, create document + image rows
- `POST /extract` — run extractor on all images, store extractions
- `PUT /review` — accept user-corrected extractions
- `POST /merge` — run merger, store merged document + choice rows
- `POST /analyze` — run analyzer, store analysis + update choice tiers
- `GET /` — list all documents
- `GET /:id` — get single document with images, choices, analysis
- `DELETE /:id` — delete document + images + choices + files

- [ ] **Step 2: Register routes**

In `packages/server/src/routes/index.ts`:
```typescript
import { cyoaRoutes } from "./cyoa.routes.js";
// ...
await app.register(cyoaRoutes, { prefix: "/api/cyoa" });
```

- [ ] **Step 3: Verify TypeScript compiles and commit**

```bash
cd packages/server && npx tsc --noEmit
git add -A && git commit -m "feat: add CYOA pipeline API routes"
```

---

## Task 8: Integration Tests & Verification

**Files:**
- Create: `packages/server/tests/cyoa-integration.test.ts`

- [ ] **Step 1: Write integration tests (5 tests)**

Test full flow: extract → review → merge → analyze. Test degradation (OCR fallback). Test error handling (LLM failure at each stage).

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass (89 existing + ~30 new CYOA tests = ~119 total)

- [ ] **Step 3: Run full build verification**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test: add CYOA pipeline integration tests"
```

---

## Task 9: Documentation

**Files:**
- Create: `docs/CYOA_PIPELINE.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Write docs**
- [ ] **Step 2: Update ROADMAP**
- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "docs: add CYOA pipeline documentation"
```
