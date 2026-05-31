# CYOA Pipeline Management UI — Design Spec

Date: 2026-05-30
Status: Approved
Scope: Spec 1 of 3 (Pipeline Management UI). Specs 2 (Build Planner) and 3 (AI Narrator) follow separately.

## Problem

The CYOA image pipeline has 10 working API endpoints and 54 passing tests, but no browser UI. Users cannot upload CYOA images, review extractions, or view analysis results from the app. The API is currently accessible only via direct HTTP calls.

## Solution

A right-panel document manager + center-editor pipeline stepper that covers the full document lifecycle: upload, extract, review, merge, analyze.

## Architecture

Follows existing app conventions (React 19, Zustand for UI state, React Query for server data, Tailwind, Framer Motion, `api` client from `@/lib/api-client`).

### Layout

- **Right panel** (`CyoaPanel`) — lists all CYOA documents, entry point to open one
- **Center editor** (`CyoaEditor`) — wizard-like stepper for a single document's pipeline
- **UI store** — `cyoaDetailId: string | null` + `openCyoa(id)` / `closeCyoa()` actions

### Integration Points

- Register `"cyoa"` in `RightPanel.tsx` `PANEL_CONFIG` + lazy-loaded component in `PANELS`
- Lazy-load `CyoaEditor` in `AppShell.tsx` (same pattern as other editors)
- Add TopBar toggle button for CYOA panel
- No router changes (state-based navigation, same as all other editors)

## Pipeline Stepper

The editor is a stepper that mirrors the server-side document lifecycle. Each step locks after completion.

### Step 1: Upload

- Drag-and-drop zone + file picker
- Accepts: jpg, jpeg, png, gif, webp, avif (max 20 MB each, matching server validation)
- Batch upload: drop multiple files at once, they upload sequentially via `POST /api/cyoa/upload` (first file) then `POST /api/cyoa/:id/add-image` (subsequent files)
- Thumbnail grid of uploaded pages with page numbers
- User provides document name + optional description on first upload
- "Next: Extract" button enabled once at least 1 image is uploaded

### Step 2: Extract

- Connection picker dropdown — user selects which configured LLM connection to use
- Calls `POST /api/cyoa/extract` with `{ documentId, connectionId }`
- Per-image progress: spinner → checkmark or error
- Shows extraction method per image (vision or ocr)
- "Next: Review" enabled when all images extracted successfully

### Step 3: Review

- Raw JSON editor (syntax-highlighted, editable) showing the LLM extractions
- User can correct names, costs, categories, descriptions, or fix malformed output
- "Approve & Continue" calls `PUT /api/cyoa/review` with the edited JSON

### Step 4: Merge

- Single "Merge" button calls `POST /api/cyoa/merge`
- Displays merged document summary: title, choice count, category count, point budget
- Lists all deduplicated choices in a simple list (name, cost, category)

### Step 5: Analyze

- Connection picker (same pattern as Extract step)
- Calls `POST /api/cyoa/analyze` with `{ documentId, connectionId }`
- Loading state while LLM runs analysis
- Results display with **toggle between two views**:

#### Card-Based Tiers (default)

- Tier columns: S / A / B / C / D / F
- Each choice rendered as a card showing: name, point cost, cost-efficiency score (0-100)
- Cards colored by tier (gold for S, green for A, etc.)

#### Sortable Data Table (secondary)

- Columns: name, tier, cost, cost-efficiency, category
- Click column headers to sort
- Filter by tier or category via dropdown

#### Additional sections (both views)

- **Synergy pairs**: list of choice pairs/groups with combined value rating
- **Build archetypes**: name, included choices, total cost, strengths, weaknesses

## New Files

| File | Purpose |
|------|---------|
| `src/hooks/use-cyoa.ts` | React Query query key factory + CRUD hooks + pipeline action mutations |
| `src/components/panels/CyoaPanel.tsx` | Right panel — document list with create/delete |
| `src/components/cyoa/CyoaEditor.tsx` | Center editor — stepper shell routing to step components |
| `src/components/cyoa/steps/UploadStep.tsx` | Upload UI (drag-drop, thumbnails) |
| `src/components/cyoa/steps/ExtractStep.tsx` | Extraction UI (connection picker, progress) |
| `src/components/cyoa/steps/ReviewStep.tsx` | JSON review editor |
| `src/components/cyoa/steps/MergeStep.tsx` | Merge trigger + summary |
| `src/components/cyoa/steps/AnalyzeStep.tsx` | Analysis results (card/table toggle, synergies, builds) |

All paths relative to `packages/client/`.

## Modified Files

| File | Change |
|------|--------|
| `packages/client/src/stores/ui.store.ts` | Add `cyoaDetailId`, `openCyoa(id)`, `closeCyoa()`. Add `cyoaDetailId: null` to `closeAllDetails` action. |
| `packages/client/src/components/layout/RightPanel.tsx` | Add `"cyoa"` to `PANEL_CONFIG`, lazy-load `CyoaPanel` |
| `packages/client/src/components/layout/AppShell.tsx` | Lazy-load `CyoaEditor`, render when `cyoaDetailId` is set |
| `packages/client/src/components/layout/TopBar.tsx` | Add CYOA icon toggle button (always visible, matches other panel buttons) |

## Hook API (`use-cyoa.ts`)

```
Query keys:
  cyoaKeys.all          → ["cyoa"]
  cyoaKeys.list()       → ["cyoa", "list"]
  cyoaKeys.detail(id)   → ["cyoa", "detail", id]

Hooks:
  useCyoaDocuments()              — GET /api/cyoa
  useCyoaDocument(id)             — GET /api/cyoa/:id
  useCreateCyoaDocument()         — POST /api/cyoa/upload (formData)
  useAddCyoaImage(docId)          — POST /api/cyoa/:id/add-image (formData)
  useExtractCyoa()                — POST /api/cyoa/extract
  useReviewCyoa()                 — PUT /api/cyoa/review
  useMergeCyoa()                  — POST /api/cyoa/merge
  useAnalyzeCyoa()                — POST /api/cyoa/analyze
  useDeleteCyoaDocument()         — DELETE /api/cyoa/:id
```

All mutations invalidate `cyoaKeys.list()` on success. Detail mutations also invalidate `cyoaKeys.detail(id)`.

## Component Conventions

- Named exports only (no default exports)
- Props interfaces defined inline above the component
- Hook order: Zustand selectors → React Query hooks → local state → memos/callbacks → render
- Styling: Tailwind utility classes + `cn()` from `@/lib/utils`
- Icons: Lucide React
- Animations: Framer Motion where appropriate (step transitions, card appearance)
- No barrel exports, no index files

## Out of Scope (Deferred to Specs 2 and 3)

- Build Planner (point-buy character builder with choice selection)
- AI Narrator (CYOA-aware Game Master chat mode)
- Campaign Tracker
- PDF text extraction
- Sharing CYOA documents between users

## Testing

- Existing server-side tests (54 tests, 6 files) remain untouched
- Client components tested via `pnpm check` (TypeScript + ESLint)
- No new server endpoints required — UI consumes existing API
