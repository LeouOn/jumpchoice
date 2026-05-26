# CYOA Image Pipeline Design Specification

**Date:** 2026-05-25
**Status:** Draft
**Scope:** Phase 2B/3 - CYOA Image Extraction & Analysis Pipeline

## Overview

A multi-step pipeline that takes CYOA (Choose Your Own Adventure) images, extracts structured data via vision LLM or OCR fallback, lets the user review and correct extractions, merges multi-image results into a unified document, then runs LLM analysis to evaluate each choice's cost-efficiency, synergies, and tier ranking.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Extraction method | Vision LLM primary, OCR fallback | Vision handles styled layouts; OCR covers users without vision models |
| Pipeline architecture | Step-by-step API with review checkpoint | User corrects OCR errors before analysis runs |
| Review flow | Batch review (all images at once) | Balances speed with accuracy |
| Storage | SQLite table `cyoa_documents` | Consistent with existing schema patterns |
| OCR library | tesseract.js | Pure JS, no native deps, runs anywhere |
| Multi-image | Session-based grouping | Images upload to a session, extracted together |

## Pipeline Flow

```
Step 1: Upload
  POST /api/cyoa/upload
  - Accept 1-N images (PNG, JPG, WEBP)
  - Store images in DATA_DIR/cyoa/{sessionId}/
  - Return session ID + image IDs

Step 2: Extract
  POST /api/cyoa/extract
  - For each image in session:
    a. Try vision LLM first (send image as base64 data URL)
    b. If no vision model available, fall back to tesseract.js OCR + text-only LLM structuring
  - Return raw extractions per image for user review
  - Status: "pending_review"

Step 3: Review
  PUT /api/cyoa/review
  - User receives extractions, corrects errors, submits
  - Can edit: choice names, descriptions, costs, categories, prerequisites
  - Can add missing choices, remove false positives
  - Status: "reviewed"

Step 4: Merge
  POST /api/cyoa/merge
  - Combine all reviewed extractions into single CYOA document
  - Deduplicate choices across images
  - Resolve conflicting data (user's reviewed version wins)
  - Status: "merged"

Step 5: Analyze
  POST /api/cyoa/analyze
  - LLM analyzes each choice:
    a. Cost-efficiency rating (1-5)
    b. Synergy tags (which other choices it combos with)
    c. Tier ranking (S/A/B/C/D/F)
    d. Brief analysis paragraph
  - Produces tier list sorted by category
  - Status: "analyzed"
```

## Database Schema

### New table: `cyoa_documents`

```sql
CREATE TABLE cyoa_documents (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending_upload',
  -- 'pending_upload' | 'pending_extraction' | 'pending_review' | 'reviewed' | 'merged' | 'analyzed'
  point_budget INTEGER,
  metadata TEXT NOT NULL DEFAULT '{}',
  -- JSON: { visionModel, ocrFallbackUsed, imageCount, etc. }
  extractions TEXT NOT NULL DEFAULT '[]',
  -- JSON array of per-image raw extractions (before review)
  reviewed_extractions TEXT NOT NULL DEFAULT '[]',
  -- JSON array of user-corrected extractions
  merged_document TEXT NOT NULL DEFAULT '{}',
  -- JSON: the unified CYOA document structure
  analysis TEXT NOT NULL DEFAULT '{}',
  -- JSON: LLM analysis results (tier list, synergies, etc.)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_cyoa_documents_status ON cyoa_documents(status);
```

### New table: `cyoa_images`

```sql
CREATE TABLE cyoa_images (
  id TEXT PRIMARY KEY NOT NULL,
  document_id TEXT NOT NULL REFERENCES cyoa_documents(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  -- Relative path within DATA_DIR/cyoa/
  original_name TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  byte_size INTEGER NOT NULL DEFAULT 0,
  page_number INTEGER,
  -- User-assigned page order (for multi-image CYOAs)
  extraction_method TEXT,
  -- 'vision' | 'ocr' | null (before extraction)
  extraction_result TEXT,
  -- JSON: raw extraction for this specific image
  created_at TEXT NOT NULL
);

CREATE INDEX idx_cyoa_images_document ON cyoa_images(document_id, page_number);
```

### New table: `cyoa_choices`

Extracted and deduplicated choices from the merged document. Separate table enables querying and Build Lab integration.

```sql
CREATE TABLE cyoa_choices (
  id TEXT PRIMARY KEY NOT NULL,
  document_id TEXT NOT NULL REFERENCES cyoa_documents(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'uncategorized',
  -- e.g., 'perks', 'drawbacks', 'companions', 'items', 'powers'
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  point_cost INTEGER NOT NULL DEFAULT 0,
  -- Positive = costs points, Negative = grants points (drawbacks)
  prerequisites TEXT NOT NULL DEFAULT '[]',
  -- JSON array of choice IDs that must be selected first
  tags TEXT NOT NULL DEFAULT '[]',
  -- JSON array of string tags (e.g., 'combat', 'social', 'magic')
  tier TEXT,
  -- S/A/B/C/D/F — set during analysis
  cost_efficiency INTEGER,
  -- 1-5 — set during analysis
  synergy_ids TEXT NOT NULL DEFAULT '[]',
  -- JSON array of choice IDs that synergize
  analysis TEXT NOT NULL DEFAULT '',
  -- LLM-generated analysis paragraph
  source_image_ids TEXT NOT NULL DEFAULT '[]',
  -- JSON array of image IDs that contained this choice
  metadata TEXT NOT NULL DEFAULT '{}',
  -- JSON: any extra fields the LLM extracted
  created_at TEXT NOT NULL
);

CREATE INDEX idx_cyoa_choices_document ON cyoa_choices(document_id, category);
CREATE INDEX idx_cyoa_choices_tier ON cyoa_choices(document_id, tier);
```

## Data Structures

### CYOA Extraction (per image)

```typescript
interface CYOAExtraction {
  imageId: string;
  pageNumber: number | null;
  extractionMethod: "vision" | "ocr";
  title: string | null;
  description: string | null;
  pointBudget: number | null;
  categories: string[];
  choices: CYOARawChoice[];
  warnings: string[];
  // e.g., "Text was partially cut off in bottom-right corner"
}

interface CYOARawChoice {
  name: string;
  description: string;
  category: string;
  pointCost: number;
  prerequisites: string[];
  tags: string[];
  confidence: number;
  // 0-1 how confident the extraction is
  rawText?: string;
  // Original OCR text or vision model's raw output for this choice
}
```

### Merged CYOA Document

```typescript
interface CYOADocument {
  title: string;
  description: string;
  pointBudget: number | null;
  categories: string[];
  choices: CYOAChoice[];
  imageCount: number;
  mergedAt: string;
}

interface CYOAChoice {
  id: string;
  name: string;
  description: string;
  category: string;
  pointCost: number;
  prerequisites: string[];
  tags: string[];
  sourceImageIds: string[];
}
```

### Analysis Result

```typescript
interface CYOAAnalysis {
  tierList: Record<string, CYOAChoiceAnalysis[]>;
  // Keyed by tier: "S" | "A" | "B" | "C" | "D" | "F"
  categorySummaries: Record<string, string>;
  // LLM summary per category
  topSynergies: SynergyPair[];
  buildArchetypes: BuildArchetype[];
  // e.g., "Combat Build", "Social Build", "Jack of All Trades"
  overallSummary: string;
  analyzedAt: string;
}

interface CYOAChoiceAnalysis {
  choiceId: string;
  choiceName: string;
  tier: string;
  costEfficiency: number;
  synergies: string[];
  // Choice IDs
  analysis: string;
  // 2-3 sentence analysis
}

interface SynergyPair {
  choiceIds: string[];
  description: string;
  combinedValue: "high" | "medium" | "low";
}

interface BuildArchetype {
  name: string;
  description: string;
  recommendedChoiceIds: string[];
  totalPointCost: number;
  strengths: string[];
  weaknesses: string[];
}
```

## New Services

### 1. CYOAExtractor

**File:** `packages/server/src/services/cyoa/cyoa-extractor.ts`

**Responsibility:** Extract structured data from a single CYOA image using vision LLM or OCR fallback.

**API:**

```typescript
interface ExtractorInput {
  imagePath: string;
  mimeType: string;
  provider: BaseLLMProvider;
  model: string;
  hasVision: boolean;
  ocrFallback?: (imagePath: string) => Promise<string>;
}

async function extractFromImage(input: ExtractorInput): Promise<CYOAExtraction>
```

**Behavior:**
1. Read image file, convert to base64 data URL
2. If `hasVision` is true: send image to vision LLM with extraction prompt
3. If `hasVision` is false: run tesseract.js OCR, then send extracted text to text-only LLM with structuring prompt
4. Parse LLM response as JSON, validate against `CYOAExtraction` schema
5. If parsing fails, retry once with a stricter prompt
6. Return extraction with confidence scores

**Vision extraction prompt:**

```
Analyze this CYOA (Choose Your Own Adventure) image. Extract ALL choices, perks, drawbacks, companions, and items visible.

For each choice, extract:
- name: exact name as shown
- description: full description text
- category: one of "perks", "drawbacks", "companions", "items", "powers", "other"
- pointCost: point cost (negative for drawbacks that grant points)
- prerequisites: any prerequisites mentioned
- tags: relevant tags (e.g., "combat", "social", "magic", "stealth")
- confidence: your confidence in this extraction (0.0 to 1.0)

Also extract:
- title: CYOA title if visible
- description: overall CYOA description if visible
- pointBudget: starting point budget if specified
- categories: list of category names used

Respond in JSON format:
{
  "title": "...",
  "description": "...",
  "pointBudget": N,
  "categories": [...],
  "choices": [...],
  "warnings": ["any issues with the extraction"]
}

Be thorough — extract EVERY choice visible, even partially cut-off ones. Include them with lower confidence and a warning.
```

**OCR fallback prompt:**

```
The following is OCR text extracted from a CYOA image. Structure it into choices with names, descriptions, point costs, and categories.

OCR Text:
---
{text}
---

Respond in the same JSON format. Flag any ambiguous or unclear extractions in warnings.
```

### 2. CYOAMerger

**File:** `packages/server/src/services/cyoa/cyoa-merger.ts`

**Responsibility:** Merge multiple reviewed extractions into a unified CYOA document with deduplication.

**API:**

```typescript
interface MergeInput {
  reviewedExtractions: CYOAExtraction[];
}

function mergeExtractions(input: MergeInput): CYOADocument
```

**Behavior:**
1. Collect all choices from all extractions
2. Deduplicate by name (case-insensitive, fuzzy match for typos)
3. When duplicates found: prefer the version from the user's reviewed extraction
4. Assign unique IDs to each choice
5. Resolve category names (normalize "Perk" and "Perks" to same category)
6. Resolve prerequisite references: convert choice names to choice IDs (best-effort fuzzy match; unresolvable prerequisites kept as text in metadata)
7. Build final document structure
8. Preserve source image IDs on each choice for traceability

### 3. CYOAAnalyzer

**File:** `packages/server/src/services/cyoa/cyoa-analyzer.ts`

**Responsibility:** Run LLM analysis on merged CYOA document to produce tier list, synergies, and build archetypes.

**API:**

```typescript
interface AnalyzeInput {
  document: CYOADocument;
  provider: BaseLLMProvider;
  model: string;
}

async function analyzeDocument(input: AnalyzeInput): Promise<CYOAAnalysis>
```

**Behavior:**
1. Send full merged document to LLM with analysis prompt
2. LLM evaluates each choice for cost-efficiency, synergy potential, tier ranking
3. LLM identifies top synergy pairs and build archetypes
4. Parse response as JSON, validate against `CYOAAnalysis` schema
5. Return analysis results

**Analysis prompt:**

```
You are an expert CYOA build analyst. Analyze the following CYOA document.

For EACH choice, provide:
- tier: S (must-have), A (excellent), B (good), C (situational), D (suboptimal), F (trap/negative value)
- costEfficiency: 1-5 rating (5 = incredible value for cost)
- synergies: list of other choice names that combo well with this one
- analysis: 2-3 sentences explaining your rating

Then provide:
- topSynergies: top 5-10 synergy pairs with explanations
- buildArchetypes: 3-5 viable build archetypes (name, description, recommended choices, total cost, strengths, weaknesses)
- categorySummaries: brief summary of each category's overall quality
- overallSummary: 2-3 paragraph overview of this CYOA

CYOA Document:
---
{JSON document}
---

Respond in JSON format.
```

### 4. OCR Service (fallback)

**File:** `packages/server/src/services/cyoa/ocr-service.ts`

**Responsibility:** Run tesseract.js OCR on an image file, return extracted text.

**API:**

```typescript
async function ocrImage(imagePath: string): Promise<string>
```

**Behavior:**
1. Load tesseract.js worker
2. Read image file
3. Run OCR with English language pack
4. Return raw text output
5. Worker is created per-call (no long-lived workers to manage)

**Dependency:** `tesseract.js` added as optional dependency. If not installed, OCR fallback is unavailable and only vision LLM path works.

## API Routes

### `POST /api/cyoa/upload`

**Input:** `multipart/form-data` with multiple image files + optional `name` field
**Output:** `{ documentId: string, images: Array<{ id, fileName, pageNumber, previewUrl }> }`

Creates a new `cyoa_documents` row and `cyoa_images` rows. Stores files in `DATA_DIR/cyoa/{documentId}/`.

### `POST /api/cyoa/extract`

**Input:** `{ documentId: string }`
**Output:** `{ extractions: CYOAExtraction[], status: "pending_review" }`

Runs extraction on all images in the document. Uses the user's active connection for vision LLM. Falls back to OCR if no vision model is available.

### `PUT /api/cyoa/review`

**Input:** `{ documentId: string, extractions: CYOAExtraction[] }` (user-corrected)
**Output:** `{ status: "reviewed" }`

Stores user's corrected extractions in `reviewed_extractions` column.

### `POST /api/cyoa/merge`

**Input:** `{ documentId: string }`
**Output:** `{ document: CYOADocument, choiceCount: number, status: "merged" }`

Merges reviewed extractions, deduplicates choices, stores in `merged_document` column and `cyoa_choices` table.

### `POST /api/cyoa/analyze`

**Input:** `{ documentId: string }`
**Output:** `{ analysis: CYOAAnalysis, status: "analyzed" }`

Runs LLM analysis on merged document, stores results in `analysis` column and updates `cyoa_choices` with tier/efficiency/analysis.

### `GET /api/cyoa/:id`

**Output:** Full document with all related data (images, choices, analysis, extractions)

### `DELETE /api/cyoa/:id`

Deletes document, all images, all choices. Cleans up stored image files.

### `GET /api/cyoa`

Lists all CYOA documents with status, name, choice count, created date.

## Integration Points

### With existing systems

- **Connection system:** Uses user's active LLM connection for vision/analysis calls (same pattern as generation pipeline)
- **Gallery system:** CYOA images stored in `DATA_DIR/cyoa/` (separate from gallery)
- **File-backed store:** `cyoa_documents`, `cyoa_images`, `cyoa_choices` registered as file-backed tables

### Future integration (Phase 4: Build Lab)

- `cyoa_choices` table is designed to feed directly into the Build Lab
- Build Lab will reference `document_id` and `choice_id` when users create builds
- Point budget from CYOA document becomes the build's budget constraint

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Vision LLM fails | Fall back to OCR + text-only LLM |
| OCR also fails | Return extraction with empty choices + warning, let user manually enter |
| LLM returns invalid JSON | Retry once with stricter prompt; if still fails, return error |
| Image too large (>20MB) | Reject upload with size limit error |
| Unsupported file type | Reject upload with format error |
| tesseract.js not installed | Skip OCR fallback, require vision model |
| Analysis LLM fails | Document stays in "merged" status, user can retry analysis |

## Scope Exclusions

- No UI (API routes only for MVP)
- No real-time progress (synchronous API calls)
- No image preprocessing (crop, rotate, enhance)
- No export (PDF, markdown) — can add later
- No sharing or community features
- No caching of LLM results
- No concurrent processing of multiple images (sequential for simplicity)

## Future Enhancements

- Image preprocessing (auto-crop, rotate, contrast enhancement)
- Parallel image extraction (process N images simultaneously)
- Incremental extraction (add new images to existing document)
- Export to markdown/PDF
- Share CYOA documents with other users
- AI-powered build recommender (given goals, suggest optimal build)
- Integration with image generation (visualize choices)
- Caching extracted text for re-analysis without re-running OCR
