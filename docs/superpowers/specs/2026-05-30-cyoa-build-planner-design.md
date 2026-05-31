# CYOA Build Planner — Design Spec

Date: 2026-05-30
Status: Approved
Scope: Spec 2 of 3 (Build Planner). Spec 3 (AI Narrator) follows separately.

## Problem

After analyzing a CYOA document, users have tier lists, synergies, and build archetypes but no way to interactively select choices, track point budgets, or save builds. They need a point-buy character builder that turns analysis data into playable builds.

## Solution

A modal-based build planner that opens from the CyoaEditor. Users create named builds, toggle choices from the analyzed document's catalog, track point spending against the document's budget, and see synergy/tier information as they build.

## Architecture

### Data Layer

- **New DB table**: `cyoa_builds` — server-persisted named builds per CYOA document
- **New API endpoints**: CRUD under `/api/cyoa/:docId/builds`
- **React Query hooks**: `use-cyoa-builds.ts`

### UI Layer

- **Modal overlay**: `BuildPlannerModal` — opens as a large modal scoped to the CYOA editor. Managed via local `showBuildPlanner` state in `CyoaEditor` (not the global `ModalRenderer` + `openModal()` system) because the build planner is inherently tied to a specific document and its choices/analysis context. The global modal system is reserved for cross-cutting actions (create, import, generate) that aren't scoped to a single open entity.
- **Two-panel layout inside modal**: choice catalog (left) + build summary (right)

### Integration

- "Build Planner" button appears in CyoaEditor header when document status is `merged` or `analyzed`
- Clicking it opens BuildPlannerModal
- Reads choices from the existing `cyoaChoices` table (via `useCyoaDocument(docId).choices` — no new endpoint needed; the existing `GET /api/cyoa/:id` already returns the full choice catalog) and analysis from the document

## Database Schema

```ts
cyoaBuilds = pgTable("cyoa_builds", {
  id: text("id").primaryKey(),                              // nanoid
  documentId: text("document_id")
    .notNull()
    .references(() => cyoaDocuments.id),
  name: text("name").notNull(),
  description: text("description"),
  selectedChoiceIds: text("selected_choice_ids"),            // JSON string: string[]
  notes: text("notes"),                                      // free-form user notes
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/cyoa/:docId/builds` | List all builds for a document |
| POST | `/api/cyoa/:docId/builds` | Create a new build |
| GET | `/api/cyoa/:docId/builds/:buildId` | Get a single build |
| PATCH | `/api/cyoa/:docId/builds/:buildId` | Update build (name, choices, notes) |
| DELETE | `/api/cyoa/:docId/builds/:buildId` | Delete a build |

### Request/Response Details

**POST /api/cyoa/:docId/builds**
- Body: `{ name: string, description?: string }`
- Returns: created build object

**PATCH /api/cyoa/:docId/builds/:buildId**
- Body: `{ name?: string, description?: string, selectedChoiceIds?: string[], notes?: string }`
- Returns: updated build object

All endpoints validate that the document exists and belongs to the referenced docId.

## Build Planner Modal

Opens as a large modal overlay on top of CyoaEditor. Size: approximately 90% of viewport width and height.

### Header

- Document title
- Build selector dropdown — switch between saved builds
- "New Build" button — creates a new empty build
- Close button (X)

### Left Panel: Choice Catalog

- **Search bar** — filter choices by name
- **Category filter** — dropdown or tabs to filter by category
- **Choice cards** — each showing:
  - Name
  - Point cost (or "Free")
  - Tier badge (S/A/B/C/D/F with color, from analysis)
  - Category tag
  - Prerequisite info (displayed as text, not enforced)
  - Selected state (checkbox or highlight)
- Clicking a choice toggles it in/out of the active build
- Selected choices show a visual indicator (checkmark, border color change)

### Right Panel: Build Summary

- **Build name** — editable inline
- **Build description** — editable inline (optional)
- **Point budget tracker** — shows "X / Y points spent" with a progress bar, or "No budget set" if document has no pointBudget
- **Selected choices list** — cards showing name, cost, tier, with a remove button
- **Synergy highlights** — if any selected choices appear together in the document's synergy pairs, show them with the synergy description
- **Build archetype match** — if selected choices match an analyzed archetype, highlight it
- **Notes** — free-form textarea for the user's own notes about this build
- **Auto-save** — changes are saved via debounced mutation (no explicit save button needed)

### Prerequisites

Prerequisites are **displayed but not enforced**. The LLM extraction can misidentify prerequisite chains, so the planner shows them as informational text on each choice card but does not block selection.

## New Files

| File | Purpose |
|------|---------|
| `packages/server/src/db/schema/cyoa-builds.ts` | DB table definition |
| `packages/server/src/routes/cyoa-builds.routes.ts` | 5 API endpoints |
| `packages/client/src/hooks/use-cyoa-builds.ts` | React Query hooks (list, detail, create, update, delete) |
| `packages/client/src/components/cyoa/BuildPlannerModal.tsx` | Modal shell with header and build selector |
| `packages/client/src/components/cyoa/ChoiceCatalog.tsx` | Left panel — searchable/filterable choice catalog |
| `packages/client/src/components/cyoa/BuildSummary.tsx` | Right panel — budget tracker, selected choices, synergies, notes |
| `packages/server/tests/cyoa-builds-routes.test.ts` | API endpoint tests |

All client paths relative to `packages/client/`. All server paths relative to `packages/server/`.

## Modified Files

| File | Change |
|------|--------|
| `packages/client/src/components/cyoa/CyoaEditor.tsx` | Add "Build Planner" button in header, visible when status is `merged` or `analyzed`. Manages `showBuildPlanner` local state. |
| `packages/server/src/routes/index.ts` | Register `cyoaBuildsRoutes` under prefix `/api/cyoa` (same prefix as existing `cyoaRoutes`; nested `/:docId/builds` routes won't collide with existing `/:id` routes). |
| `packages/server/src/db/schema/index.ts` | Export `cyoaBuilds` from `./cyoa-builds.js`. |

## Hook API (`use-cyoa-builds.ts`)

```
Query keys:
  cyoaBuildKeys.all(docId)           → ["cyoa-builds", docId]
  cyoaBuildKeys.list(docId)          → ["cyoa-builds", docId, "list"]
  cyoaBuildKeys.detail(docId, id)    → ["cyoa-builds", docId, "detail", id]

Hooks:
  useCyoaBuilds(docId)                    — GET /api/cyoa/:docId/builds
  useCyoaBuild(docId, id)                 — GET /api/cyoa/:docId/builds/:id
  useCreateCyoaBuild(docId)               — POST /api/cyoa/:docId/builds
  useUpdateCyoaBuild(docId)               — PATCH /api/cyoa/:docId/builds/:id
  useDeleteCyoaBuild(docId)               — DELETE /api/cyoa/:docId/builds/:id
```

All mutations invalidate `cyoaBuildKeys.list(docId)` on success. Detail mutations also invalidate `cyoaBuildKeys.detail(docId, id)`.

## Component Conventions

Same as Spec 1:
- Named exports only
- Props interfaces inline
- Hook order: Zustand → React Query → local state → memos/callbacks → render
- Tailwind + `cn()` + `var(--theme)` CSS variables
- Lucide React icons
- No barrel exports, no index files

## Testing

- Server-side: API route tests following existing `cyoa-routes.test.ts` pattern (Fastify `app.inject()`, mock DB)
- Client: validated via `pnpm check` (TypeScript + ESLint)
- No new server test framework — uses existing Vitest setup

## Out of Scope

- AI Narrator (Spec 3)
- Campaign tracking / session management
- Sharing builds between users
- Build import/export
- Enforced prerequisites
- Point budget hard limits (user can exceed budget — shown as warning only)
