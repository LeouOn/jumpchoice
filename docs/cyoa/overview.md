# CYOA Documents

JumpChoice's choose-your-own-adventure document system: turn jumpchain-style
choice catalog images into a structured, mergeable, analyzable document that
drives guided campaign play.

This is a fork feature. It is separate from — and complements — the upstream
**CYOA Choices** downloadable agent, which renders interactive choice buttons
after assistant messages in any chat. The CYOA Choices agent needs no document;
this system builds the catalog those campaigns draw from.

## Where to find it

- **CYOA panel** in the right panel rail (book icon): lists every document with
  its pipeline status.
- Clicking a document opens the **full-page editor** with the five-step
  workflow: Upload → Extract → Review → Merge → Analyze.

## Document pipeline

A document moves through five statuses, and each step guards the next:

| Status | Meaning | Next step |
| --- | --- | --- |
| `pending_extraction` | Images uploaded, nothing read yet | Extract with a vision-capable connection |
| `pending_review` | Machine extractions ready for human review | Correct choices in the Review step |
| `reviewed` | Extractions accepted | Merge into one catalog |
| `merged` | Single unified document with deduplicated choices | Analyze with an LLM connection |
| `analyzed` | Tier list, synergies, and build archetypes attached | Start a campaign |

- **Upload** — add catalog images to the document (PNG/JPG). Images are stored
  per-document under the data directory.
- **Extract** — each image is read by the configured connection (vision) with
  an OCR fallback, producing raw choices with confidence scores.
- **Review** — fix misreads, drop junk entries, adjust point costs. Only
  reviewed extractions continue.
- **Merge** — extractions are deduplicated by name and category into one
  catalog with source-image provenance.
- **Analyze** — an LLM connection ranks choices into a tier list, surfaces
  synergies, and proposes build archetypes under the document's point budget.

## Campaigns and builds

From an analyzed document you can plan builds (Build Planner) and start
campaigns that hand the catalog to the narrator. Campaign chats run through the
normal chat stack; the narrator prompt is assembled from the merged document.

## Relationship to Jump Documents

The `services/jump-doc` pipeline is the PDF-native sibling of this system: it
extracts, merges, and analyzes PDFs into `jump_documents` tables. The two
pipelines intentionally stay separate — different input modalities, different
storage, no shared mutable state beyond the tiny `cyoa/json-utils.ts` JSON
helper. Consolidating them is possible later, but they are currently staged
independently and the CYOA pipeline is the only one wired to the UI.

## Regression coverage

`pnpm regression:cyoa-routes` pins the route contract: list/get/delete
behavior, the review and merge status gates, and the real merger output against
the file-native database in a temporary data directory.
