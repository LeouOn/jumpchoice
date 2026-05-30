# CYOA Image Pipeline

Multi-step pipeline for extracting structured data from CYOA (Choose Your Own Adventure) images, reviewing corrections, merging into a unified document, and running LLM-powered analysis.

## Architecture

```
Upload → Extract → Review → Merge → Analyze
```

5-stage pipeline with a human review checkpoint between extraction and analysis.

### Data Flow

1. **Upload** — User uploads CYOA images via multipart POST. Creates a document with images.
2. **Extract** — Each image is sent to a vision LLM (or OCR + LLM fallback) to extract structured choices.
3. **Review** — User reviews and corrects extractions before proceeding.
4. **Merge** — Deduplicates choices across images, resolves categories, produces unified document.
5. **Analyze** — LLM generates tier list (S-F), synergy pairs, build archetypes, and category summaries.

## API Endpoints

All endpoints are under `/api/cyoa`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/upload` | Upload a CYOA image, creates document + image rows |
| `POST` | `/extract` | Run extraction on all images (requires connectionId) |
| `PUT` | `/review` | Submit user-corrected extractions |
| `POST` | `/merge` | Merge extractions into unified document with choices |
| `POST` | `/analyze` | Run LLM analysis for tiers, synergies, builds |
| `GET` | `/` | List all documents |
| `GET` | `/:id` | Get document with images, choices, and analysis |
| `DELETE` | `/:id` | Delete document and all associated data |

### Upload

```bash
curl -X POST /api/cyoa/upload \
  -F "image=@cyoa-page1.png" \
  -F "name=My CYOA" \
  -F "description=A test CYOA"
```

### Extract

```bash
curl -X POST /api/cyoa/extract \
  -H "Content-Type: application/json" \
  -d '{"documentId":"...","connectionId":"..."}'
```

Uses the user's configured LLM connection (BYOK). Supports OpenAI, Anthropic, Google, OpenRouter, and local models.

### Review

```bash
curl -X PUT /api/cyoa/review \
  -H "Content-Type: application/json" \
  -d '{"documentId":"...","extractions":[...]}'
```

Submit corrected extractions. This is the human-in-the-loop checkpoint.

### Merge

```bash
curl -X POST /api/cyoa/merge \
  -H "Content-Type: application/json" \
  -d '{"documentId":"..."}'
```

Deduplicates choices by name (case-insensitive), merges categories, resolves prerequisites.

### Analyze

```bash
curl -X POST /api/cyoa/analyze \
  -H "Content-Type: application/json" \
  -d '{"documentId":"...","connectionId":"..."}'
```

Produces tier list, category summaries, top synergies, and build archetypes.

## Database Tables

### `cyoa_documents`

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Document ID |
| name | TEXT | Document name |
| description | TEXT | Description |
| status | TEXT | Pipeline status (pending_extraction → pending_review → reviewed → merged → analyzed) |
| point_budget | INTEGER | Total point budget (if detected) |
| extractions | TEXT (JSON) | Raw extractions from images |
| reviewed_extractions | TEXT (JSON) | User-corrected extractions |
| merged_document | TEXT (JSON) | Merged unified document |
| analysis | TEXT (JSON) | LLM analysis results |

### `cyoa_images`

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Image ID |
| document_id | TEXT FK | Parent document |
| file_path | TEXT | Path relative to data/cyoa/ |
| original_name | TEXT | Original filename |
| mime_type | TEXT | Image MIME type |
| extraction_method | TEXT | "vision" or "ocr" |
| extraction_result | TEXT (JSON) | Per-image extraction result |

### `cyoa_choices`

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Choice ID |
| document_id | TEXT FK | Parent document |
| name | TEXT | Choice name |
| category | TEXT | Category (perks, items, etc.) |
| point_cost | INTEGER | Point cost |
| tier | TEXT | S, A, B, C, D, or F |
| cost_efficiency | INTEGER | 0-100 efficiency score |
| synergy_ids | TEXT (JSON) | IDs of synergistic choices |
| analysis_text | TEXT | LLM analysis text |

## Services

### `cyoa-extractor.ts`

Extracts structured data from images. Two paths:
- **Vision path**: Sends image as base64 to vision-capable LLM
- **OCR fallback**: Uses tesseract.js for text extraction, then structures with LLM

### `cyoa-merger.ts`

Pure function that merges multiple extractions:
- Deduplicates by case-insensitive name matching
- Keeps higher-confidence version on conflict
- Merges source image IDs and tags
- Normalizes categories

### `cyoa-analyzer.ts`

Sends merged document to LLM for strategic analysis:
- Tier list (S through F) for every choice
- Cost efficiency scores (0-100, where 100 = best value for points)
- Top synergy pairs between choices
- Build archetypes (recommended combinations within budget)

### `ocr-service.ts`

Tesseract.js wrapper with graceful fallback when unavailable.

## Extraction Prompt

The extraction prompt asks the LLM to return JSON with:
- `title`, `description`, `pointBudget`
- `categories[]` — category names
- `choices[]` — each with name, description, category, pointCost, prerequisites, tags, confidence (0-1)

## Analysis Prompt

The analysis prompt asks the LLM to return JSON with:
- `tierList` — choices grouped by tier (S/A/B/C/D/F)
- `categorySummaries` — summary per category
- `topSynergies` — pairs of choices that work well together
- `buildArchetypes` — recommended builds with choice lists and point costs
- `overallSummary` — balance assessment

## File Storage

Uploaded images are stored in `DATA_DIR/cyoa/{documentId}/{imageId}.{ext}`.

## Tests

| Test File | Tests | Coverage |
|-----------|-------|----------|
| cyoa-ocr.test.ts | 2 | OCR availability and missing file |
| cyoa-extractor.test.ts | 10 | Vision, OCR fallback, JSON parsing, confidence |
| cyoa-merger.test.ts | 8 | Dedup, categories, prerequisites, fuzzy matching |
| cyoa-analyzer.test.ts | 9 | Tiers, synergies, builds, failure handling |
| cyoa-integration.test.ts | 5 | Full pipeline, conflicting data, empty docs |

**Total: 34 tests** across 5 test files.
