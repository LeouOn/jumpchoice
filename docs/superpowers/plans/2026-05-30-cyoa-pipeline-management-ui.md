# CYOA Pipeline Management UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser UI for the CYOA document pipeline — upload images, extract choices via LLM, review/correct extractions, merge, and view tier-list analysis.

**Architecture:** Right-panel document list + center-editor stepper. Follows existing detail-ID + lazy-load pattern. No new server endpoints — consumes existing CYOA API (10 endpoints, 54 tests passing).

**Tech Stack:** React 19, TypeScript, Zustand (ui.store.ts), TanStack React Query, Tailwind CSS, Framer Motion, Lucide React, `api` from `@/lib/api-client`.

---

## File Map

### New Files (all paths relative to `packages/client/`)

| File | Responsibility |
|------|---------------|
| `src/hooks/use-cyoa.ts` | React Query hooks: query key factory, CRUD, pipeline actions |
| `src/components/panels/CyoaPanel.tsx` | Right panel — document list, create button, delete |
| `src/components/cyoa/CyoaEditor.tsx` | Center editor — stepper shell, reads `cyoaDetailId` from store |
| `src/components/cyoa/steps/UploadStep.tsx` | Step 1: drag-drop upload, thumbnail grid |
| `src/components/cyoa/steps/ExtractStep.tsx` | Step 2: connection picker, per-image progress |
| `src/components/cyoa/steps/ReviewStep.tsx` | Step 3: raw JSON editor |
| `src/components/cyoa/steps/MergeStep.tsx` | Step 4: merge trigger + summary |
| `src/components/cyoa/steps/AnalyzeStep.tsx` | Step 5: analysis results with card/table toggle |

### Modified Files

| File | Change |
|------|--------|
| `src/stores/ui.store.ts` | Add `cyoaDetailId`, `openCyoa`, `closeCyoa`; update `closeAllDetails`, `hasAnyDetailOpen`, and every `open*Detail` action to null `cyoaDetailId` |
| `src/components/layout/RightPanel.tsx` | Add `CyoaPanel` lazy import, add `"cyoa"` to `PANEL_CONFIG` and `PANELS` |
| `src/components/layout/AppShell.tsx` | Add `CyoaEditor` lazy import, add `cyoaDetailId` selector, add to `detailView` ternary |
| `src/components/layout/TopBar.tsx` | Add CYOA entry to `RIGHT_PANEL_BUTTONS` |

---

### Task 1: UI Store — Add `cyoaDetailId` + Actions

**Files:**
- Modify: `packages/client/src/stores/ui.store.ts`

- [ ] **Step 1: Add `cyoaDetailId` to the `UIState` interface**

Find the `UIState` interface and add `cyoaDetailId: string | null;` after the existing detail ID fields (around line 248, after `regexDetailId`):

```ts
regexDetailId: string | null;
cyoaDetailId: string | null;
botBrowserOpen: boolean;
```

- [ ] **Step 2: Add `openCyoa` and `closeCyoa` action signatures to `UIState`**

Find the action declarations (around line 460) and add after `openRegexDetail`/`closeRegexDetail`:

```ts
openRegexDetail: (id: string) => void;
closeRegexDetail: () => void;
openCyoa: (id: string) => void;
closeCyoa: () => void;
openCharacterLibrary: () => void;
```

- [ ] **Step 3: Initialize `cyoaDetailId: null` in the store default state**

Find the initial state object (search for `regexDetailId: null,`) and add:

```ts
regexDetailId: null,
cyoaDetailId: null,
botBrowserOpen: false,
```

- [ ] **Step 4: Implement `openCyoa` action**

Follow the existing `openCharacterDetail` pattern — set `cyoaDetailId` to the provided id, null all other detail IDs, close right panel on mobile. Find where `openCharacterDetail` is implemented and add `openCyoa` after the last `open*Detail` implementation:

```ts
openCyoa: (id) =>
  set({
    cyoaDetailId: id,
    characterDetailId: null,
    lorebookDetailId: null,
    presetDetailId: null,
    connectionDetailId: null,
    agentDetailId: null,
    toolDetailId: null,
    personaDetailId: null,
    regexDetailId: null,
    ...(window.innerWidth < 768 && { rightPanelOpen: false }),
  }),
closeCyoa: () => set({ cyoaDetailId: null, editorDirty: false }),
```

- [ ] **Step 5: Add `cyoaDetailId: null` to `closeAllDetails`**

Find the `closeAllDetails` action and add `cyoaDetailId: null,` to the `set(...)` call:

```ts
closeAllDetails: () =>
  set({
    characterDetailId: null,
    lorebookDetailId: null,
    presetDetailId: null,
    connectionDetailId: null,
    agentDetailId: null,
    toolDetailId: null,
    personaDetailId: null,
    regexDetailId: null,
    cyoaDetailId: null,
    characterLibraryOpen: false,
    botBrowserOpen: false,
    gameAssetsBrowserOpen: false,
    editorDirty: false,
  }),
```

- [ ] **Step 6: Add `cyoaDetailId` to `hasAnyDetailOpen`**

Find the `hasAnyDetailOpen` action and add `s.cyoaDetailId ||` to the boolean expression:

```ts
hasAnyDetailOpen: () => {
  const s = get();
  return !!(
    s.characterDetailId ||
    s.lorebookDetailId ||
    s.presetDetailId ||
    s.connectionDetailId ||
    s.agentDetailId ||
    s.toolDetailId ||
    s.personaDetailId ||
    s.regexDetailId ||
    s.cyoaDetailId ||
    s.characterLibraryOpen ||
    s.botBrowserOpen ||
    s.gameAssetsBrowserOpen
  );
},
```

- [ ] **Step 7: Add `cyoaDetailId: null` to every existing `open*Detail` action**

Each existing `openXxxDetail` action (openCharacterDetail, openLorebookDetail, openPresetDetail, openConnectionDetail, openAgentDetail, openToolDetail, openPersonaDetail, openRegexDetail) has a `set({...})` call that nulls all sibling detail IDs. Add `cyoaDetailId: null,` to each one. For example, `openCharacterDetail` becomes:

```ts
openCharacterDetail: (id) =>
  set({
    characterDetailId: id,
    lorebookDetailId: null,
    presetDetailId: null,
    connectionDetailId: null,
    agentDetailId: null,
    toolDetailId: null,
    personaDetailId: null,
    regexDetailId: null,
    cyoaDetailId: null,
    ...(window.innerWidth < 768 && { rightPanelOpen: false }),
  }),
```

Repeat for all 8 `open*Detail` actions.

- [ ] **Step 8: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

---

### Task 2: React Query Hooks — `use-cyoa.ts`

**Files:**
- Create: `packages/client/src/hooks/use-cyoa.ts`

- [ ] **Step 1: Create the hook file**

Create `packages/client/src/hooks/use-cyoa.ts` with the full query key factory and hooks:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface CyoaImage {
  id: string;
  documentId: string;
  filename: string;
  originalName: string;
  pageNumber: number;
  mimeType: string;
  sizeBytes: number;
  extractions: unknown | null;
  reviewedExtractions: unknown | null;
  extractionMethod: string | null;
  createdAt: string;
}

interface CyoaChoice {
  id: string;
  documentId: string;
  name: string;
  pointCost: number | null;
  category: string | null;
  description: string | null;
  tags: string[];
  prerequisites: string[];
  tier: string | null;
  costEfficiency: number | null;
  synergies: unknown | null;
  analysis: unknown | null;
  sourceImageIds: string[];
}

interface CyoaDocument {
  id: string;
  name: string;
  description: string | null;
  status: string;
  pointBudget: number | null;
  extractions: unknown | null;
  reviewedExtractions: unknown | null;
  mergedDocument: unknown | null;
  analysis: unknown | null;
  choiceCount: number;
  images: CyoaImage[];
  choices: CyoaChoice[];
  createdAt: string;
  updatedAt: string;
}

export const cyoaKeys = {
  all: ["cyoa"] as const,
  list: () => [...cyoaKeys.all, "list"] as const,
  detail: (id: string) => [...cyoaKeys.all, "detail", id] as const,
};

export function useCyoaDocuments() {
  return useQuery({
    queryKey: cyoaKeys.list(),
    queryFn: () => api.get<CyoaDocument[]>("/cyoa"),
    staleTime: 5 * 60_000,
  });
}

export function useCyoaDocument(id: string | null) {
  return useQuery({
    queryKey: cyoaKeys.detail(id ?? ""),
    queryFn: () => api.get<CyoaDocument>(`/cyoa/${id}`),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}

export function useCreateCyoaDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, name, description }: { file: File; name?: string; description?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (name) formData.append("name", name);
      if (description) formData.append("description", description);
      return api.upload<CyoaDocument>("/cyoa/upload", formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cyoaKeys.list() });
    },
  });
}

export function useAddCyoaImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, file }: { documentId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload<CyoaImage>(`/cyoa/${documentId}/add-image`, formData);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: cyoaKeys.detail(variables.documentId) });
      qc.invalidateQueries({ queryKey: cyoaKeys.list() });
    },
  });
}

export function useExtractCyoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, connectionId }: { documentId: string; connectionId: string }) =>
      api.post<CyoaDocument>("/cyoa/extract", { documentId, connectionId }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: cyoaKeys.detail(variables.documentId) });
      qc.invalidateQueries({ queryKey: cyoaKeys.list() });
    },
  });
}

export function useReviewCyoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, extractions }: { documentId: string; extractions: unknown[] }) =>
      api.put<CyoaDocument>("/cyoa/review", { documentId, extractions }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: cyoaKeys.detail(variables.documentId) });
    },
  });
}

export function useMergeCyoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId }: { documentId: string }) =>
      api.post<CyoaDocument>("/cyoa/merge", { documentId }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: cyoaKeys.detail(variables.documentId) });
    },
  });
}

export function useAnalyzeCyoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, connectionId }: { documentId: string; connectionId: string }) =>
      api.post<CyoaDocument>("/cyoa/analyze", { documentId, connectionId }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: cyoaKeys.detail(variables.documentId) });
    },
  });
}

export function useDeleteCyoaDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cyoa/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cyoaKeys.list() });
    },
  });
}

export type { CyoaDocument, CyoaImage, CyoaChoice };
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

---

### Task 3: Right Panel — `CyoaPanel.tsx`

**Files:**
- Create: `packages/client/src/components/panels/CyoaPanel.tsx`
- Modify: `packages/client/src/components/layout/RightPanel.tsx`

- [ ] **Step 1: Create `CyoaPanel.tsx`**

Create `packages/client/src/components/panels/CyoaPanel.tsx`. This panel lists all CYOA documents, shows status badges, and lets users open one in the editor or delete it:

```tsx
import { useUIStore } from "@/stores/ui.store";
import { useCyoaDocuments, useDeleteCyoaDocument } from "@/hooks/use-cyoa";
import { Plus, Trash2, ImageIcon, Loader2 } from "lucide-react";
import { useState } from "react";

const STATUS_LABELS: Record<string, string> = {
  pending_extraction: "Pending",
  pending_review: "Review",
  reviewed: "Reviewed",
  merged: "Merged",
  analyzed: "Analyzed",
};

const STATUS_COLORS: Record<string, string> = {
  pending_extraction: "bg-yellow-500/20 text-yellow-400",
  pending_review: "bg-blue-500/20 text-blue-400",
  reviewed: "bg-indigo-500/20 text-indigo-400",
  merged: "bg-purple-500/20 text-purple-400",
  analyzed: "bg-emerald-500/20 text-emerald-400",
};

export function CyoaPanel() {
  const openCyoa = useUIStore((s) => s.openCyoa);
  const { data: documents, isLoading } = useCyoaDocuments();
  const deleteDoc = useDeleteCyoaDocument();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      deleteDoc.mutate(id, { onSuccess: () => setConfirmDeleteId(null) });
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="px-1 text-xs text-[var(--muted-foreground)]">
        Upload CYOA/Jumpchain images to extract and analyze choices.
      </p>

      {!documents?.length && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--border)] py-10 text-center">
          <ImageIcon className="h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="text-sm text-[var(--muted-foreground)]">No CYOA documents yet</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Open a document or create one in the editor
          </p>
        </div>
      )}

      {documents?.map((doc) => (
        <button
          key={doc.id}
          onClick={() => openCyoa(doc.id)}
          className="group flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--accent)]"
        >
          <ImageIcon className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{doc.name}</p>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[doc.status] ?? "bg-gray-500/20 text-gray-400"}`}
              >
                {STATUS_LABELS[doc.status] ?? doc.status}
              </span>
              {doc.choiceCount > 0 && (
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  {doc.choiceCount} choices
                </span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(doc.id);
            }}
            className="shrink-0 rounded p-1 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Register CyoaPanel in `RightPanel.tsx`**

Add lazy import at the top with the other lazy imports (after `SettingsPanel`):

```ts
const CyoaPanel = lazy(() =>
  import("../panels/CyoaPanel").then((module) => ({ default: module.CyoaPanel })),
);
```

Add to `PANEL_CONFIG`:

```ts
cyoa: { title: "CYOA", icon: <ImageIcon size="0.875rem" />, gradient: "from-orange-400 to-red-500" },
```

(Import `ImageIcon` from `lucide-react` at the top.)

Add to `PANELS`:

```ts
cyoa: CyoaPanel,
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

---

### Task 4: TopBar Button + AppShell Integration

**Files:**
- Modify: `packages/client/src/components/layout/TopBar.tsx`
- Modify: `packages/client/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Add CYOA button to `TopBar.tsx`**

Find the `RIGHT_PANEL_BUTTONS` array and add the CYOA entry. Import `ImageIcon` from `lucide-react` if not already imported:

```ts
import { ..., ImageIcon } from "lucide-react";
```

Add to `RIGHT_PANEL_BUTTONS` (e.g., after the personas entry):

```ts
{ panel: "cyoa" as const, icon: ImageIcon, label: "CYOA", color: "from-orange-400 to-red-500" },
```

- [ ] **Step 2: Add CyoaEditor lazy import to `AppShell.tsx`**

Find the lazy-loaded editors (after the last editor import) and add:

```ts
const CyoaEditor = lazy(() =>
  import("../cyoa/CyoaEditor").then((module) => ({ default: module.CyoaEditor })),
);
```

- [ ] **Step 3: Add `cyoaDetailId` selector to `AppShell.tsx`**

Find the detail ID selectors (around line 259) and add:

```ts
const cyoaDetailId = useUIStore((s) => s.cyoaDetailId);
```

- [ ] **Step 4: Add CyoaEditor to the `detailView` ternary**

Find the `detailView` definition and add `cyoaDetailId` as the first check:

```ts
const detailView = cyoaDetailId ? (
  <CyoaEditor />
) : regexDetailId ? (
  <RegexScriptEditor />
) : personaDetailId ? (
...
```

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors (CyoaEditor doesn't exist yet — create a placeholder next)

---

### Task 5: Stepper Shell — `CyoaEditor.tsx`

**Files:**
- Create: `packages/client/src/components/cyoa/CyoaEditor.tsx`
- Create: `packages/client/src/components/cyoa/steps/UploadStep.tsx` (placeholder)
- Create: `packages/client/src/components/cyoa/steps/ExtractStep.tsx` (placeholder)
- Create: `packages/client/src/components/cyoa/steps/ReviewStep.tsx` (placeholder)
- Create: `packages/client/src/components/cyoa/steps/MergeStep.tsx` (placeholder)
- Create: `packages/client/src/components/cyoa/steps/AnalyzeStep.tsx` (placeholder)

- [ ] **Step 1: Create the `cyoa/steps/` directory**

Create the directory structure:
- `packages/client/src/components/cyoa/`
- `packages/client/src/components/cyoa/steps/`

- [ ] **Step 2: Create placeholder step components**

Each placeholder step component accepts `{ document, documentId }` props and renders a simple message. Create all five files:

**`UploadStep.tsx`:**
```tsx
import type { CyoaDocument } from "@/hooks/use-cyoa";

interface UploadStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

export function UploadStep({ document }: UploadStepProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
      <p className="text-sm">Upload step — coming next</p>
    </div>
  );
}
```

**`ExtractStep.tsx`:**
```tsx
import type { CyoaDocument } from "@/hooks/use-cyoa";

interface ExtractStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

export function ExtractStep({ document }: ExtractStepProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
      <p className="text-sm">Extract step — coming next</p>
    </div>
  );
}
```

**`ReviewStep.tsx`:**
```tsx
import type { CyoaDocument } from "@/hooks/use-cyoa";

interface ReviewStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

export function ReviewStep({ document }: ReviewStepProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
      <p className="text-sm">Review step — coming next</p>
    </div>
  );
}
```

**`MergeStep.tsx`:**
```tsx
import type { CyoaDocument } from "@/hooks/use-cyoa";

interface MergeStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

export function MergeStep({ document }: MergeStepProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
      <p className="text-sm">Merge step — coming next</p>
    </div>
  );
}
```

**`AnalyzeStep.tsx`:**
```tsx
import type { CyoaDocument } from "@/hooks/use-cyoa";

interface AnalyzeStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

export function AnalyzeStep({ document }: AnalyzeStepProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
      <p className="text-sm">Analyze step — coming next</p>
    </div>
  );
}
```

- [ ] **Step 3: Create `CyoaEditor.tsx`**

Create `packages/client/src/components/cyoa/CyoaEditor.tsx`. This is the main stepper shell:

```tsx
import { useUIStore } from "@/stores/ui.store";
import { useCyoaDocument } from "@/hooks/use-cyoa";
import { ArrowLeft, Loader2 } from "lucide-react";
import { UploadStep } from "./steps/UploadStep";
import { ExtractStep } from "./steps/ExtractStep";
import { ReviewStep } from "./steps/ReviewStep";
import { MergeStep } from "./steps/MergeStep";
import { AnalyzeStep } from "./steps/AnalyzeStep";

const STEPS = [
  { id: "upload", label: "Upload", statusRequired: "pending_extraction" },
  { id: "extract", label: "Extract", statusRequired: "pending_extraction" },
  { id: "review", label: "Review", statusRequired: "pending_review" },
  { id: "merge", label: "Merge", statusRequired: "reviewed" },
  { id: "analyze", label: "Analyze", statusRequired: "merged" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const STATUS_STEP_MAP: Record<string, StepId> = {
  pending_extraction: "upload",
  pending_review: "review",
  reviewed: "merge",
  merged: "analyze",
  analyzed: "analyze",
};

export function CyoaEditor() {
  const documentId = useUIStore((s) => s.cyoaDetailId);
  const closeDetail = useUIStore((s) => s.closeCyoa);
  const { data: document, isLoading } = useCyoaDocument(documentId);

  const status = document?.status ?? "pending_extraction";
  const activeStep = STATUS_STEP_MAP[status] ?? "upload";

  const currentStepIndex = STEPS.findIndex((s) => s.id === activeStep);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <button
          onClick={closeDetail}
          className="rounded p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-sm font-semibold text-[var(--foreground)]">
          {document?.name ?? "CYOA Document"}
        </h1>
        {document && (
          <span className="rounded bg-[var(--muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
            {status}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-[var(--border)] px-4 py-2">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentStepIndex;
          const isCurrent = i === currentStepIndex;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                isCurrent
                  ? "bg-[var(--accent)] text-[var(--foreground)]"
                  : isCompleted
                    ? "text-[var(--muted-foreground)]"
                    : "text-[var(--muted-foreground)] opacity-50"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  isCompleted
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isCurrent
                      ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }`}
              >
                {i + 1}
              </span>
              {step.label}
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : activeStep === "upload" ? (
          <UploadStep document={document} documentId={documentId!} />
        ) : activeStep === "extract" ? (
          <ExtractStep document={document} documentId={documentId!} />
        ) : activeStep === "review" ? (
          <ReviewStep document={document} documentId={documentId!} />
        ) : activeStep === "merge" ? (
          <MergeStep document={document} documentId={documentId!} />
        ) : (
          <AnalyzeStep document={document} documentId={documentId!} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

- [ ] **Step 5: Commit the skeleton**

Commit the full skeleton (ui.store, hooks, panel, editor shell, placeholders, layout integrations) as one commit:

```bash
git add packages/client/src/stores/ui.store.ts packages/client/src/hooks/use-cyoa.ts packages/client/src/components/panels/CyoaPanel.tsx packages/client/src/components/cyoa/ packages/client/src/components/layout/RightPanel.tsx packages/client/src/components/layout/AppShell.tsx packages/client/src/components/layout/TopBar.tsx
git commit -m "feat(client): add CYOA pipeline management UI skeleton"
```

---

### Task 6: Upload Step — Drag-Drop + Thumbnails

**Files:**
- Modify: `packages/client/src/components/cyoa/steps/UploadStep.tsx`

- [ ] **Step 1: Implement full UploadStep**

Replace the placeholder with the full upload implementation:

```tsx
import { useState, useCallback } from "react";
import { useCyoaDocument, useCreateCyoaDocument, useAddCyoaImage } from "@/hooks/use-cyoa";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { Upload, ImageIcon, X, Loader2, ChevronRight } from "lucide-react";

interface UploadStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
  onProceed?: () => void;
}

const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];
const MAX_SIZE_BYTES = 20 * 1024 * 1024;

function isAcceptedFile(file: File): boolean {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return ACCEPTED_EXTENSIONS.includes(ext) && file.size <= MAX_SIZE_BYTES;
}

export function UploadStep({ document, documentId }: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createDoc = useCreateCyoaDocument();
  const addImage = useAddCyoaImage();

  const images = document?.images ?? [];
  const isExistingDoc = !!document;

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const accepted = Array.from(files).filter(isAcceptedFile);
      if (!accepted.length) {
        setError("No valid image files selected (jpg, png, gif, webp, avif, max 20MB)");
        return;
      }
      setError(null);

      for (const file of accepted) {
        setUploadingFiles((prev) => [...prev, file.name]);
        try {
          if (!isExistingDoc) {
            await createDoc.mutateAsync({ file, name: file.name });
          } else {
            await addImage.mutateAsync({ documentId, file });
          }
        } catch (err) {
          setError(`Failed to upload ${file.name}`);
        } finally {
          setUploadingFiles((prev) => prev.filter((n) => n !== file.name));
        }
      }
    },
    [isExistingDoc, documentId, createDoc, addImage],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      uploadFiles(e.dataTransfer.files);
    },
    [uploadFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) uploadFiles(e.target.files);
    },
    [uploadFiles],
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed py-10 transition-colors ${
          isDragging
            ? "border-[var(--primary)] bg-[var(--primary)]/5"
            : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
        }`}
      >
        <Upload className="h-8 w-8 text-[var(--muted-foreground)]" />
        <p className="text-sm text-[var(--muted-foreground)]">
          Drag & drop CYOA images here, or click to browse
        </p>
        <label className="cursor-pointer rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90">
          Browse Files
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.avif"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </label>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {uploadingFiles.length > 0 && (
        <div className="flex flex-col gap-1">
          {uploadingFiles.map((name) => (
            <div key={name} className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading {name}...
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-[var(--muted-foreground)]">
            Uploaded Pages ({images.length})
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {images
              .sort((a, b) => a.pageNumber - b.pageNumber)
              .map((img) => (
                <div
                  key={img.id}
                  className="group relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]"
                >
                  <img
                    src={`/api/cyoa/file/${documentId}/${img.filename}`}
                    alt={`Page ${img.pageNumber}`}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                    {img.pageNumber}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="flex justify-end">
          <p className="text-xs text-[var(--muted-foreground)]">
            Ready to extract choices from {images.length} page{images.length > 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

---

### Task 7: Extract Step — Connection Picker + Progress

**Files:**
- Modify: `packages/client/src/components/cyoa/steps/ExtractStep.tsx`

- [ ] **Step 1: Implement full ExtractStep**

Replace the placeholder. This step shows a connection picker and runs extraction on all images:

```tsx
import { useState } from "react";
import { useCyoaDocument, useExtractCyoa } from "@/hooks/use-cyoa";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";
import { useConnections } from "@/hooks/use-connections";

interface ExtractStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

export function ExtractStep({ document, documentId }: ExtractStepProps) {
  const [connectionId, setConnectionId] = useState("");
  const extract = useExtractCyoa();
  const { data: connections } = useConnections();
  const { data: freshDoc } = useCyoaDocument(documentId);
  const doc = freshDoc ?? document;

  const images = doc?.images ?? [];
  const isExtracting = extract.isPending;

  const handleExtract = () => {
    if (!connectionId) return;
    extract.mutate({ documentId, connectionId });
  };

  const allExtracted = images.length > 0 && images.every((img) => img.extractions !== null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">
          Select LLM Connection
        </label>
        <select
          value={connectionId}
          onChange={(e) => setConnectionId(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]"
          disabled={isExtracting}
        >
          <option value="">Choose a connection...</option>
          {connections?.map((conn) => (
            <option key={conn.id} value={conn.id}>
              {conn.name} ({conn.provider})
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleExtract}
        disabled={!connectionId || isExtracting || allExtracted}
        className="flex items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isExtracting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Zap className="h-4 w-4" />
        )}
        {isExtracting ? "Extracting..." : allExtracted ? "Extraction Complete" : "Start Extraction"}
      </button>

      {images.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-[var(--muted-foreground)]">
            Image Progress ({images.filter((img) => img.extractions).length}/{images.length})
          </h3>
          <div className="flex flex-col gap-1.5">
            {images
              .sort((a, b) => a.pageNumber - b.pageNumber)
              .map((img) => {
                const done = img.extractions !== null;
                return (
                  <div
                    key={img.id}
                    className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : isExtracting ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                    )}
                    <span className="text-sm text-[var(--foreground)]">
                      Page {img.pageNumber}
                    </span>
                    {img.extractionMethod && (
                      <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">
                        {img.extractionMethod}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
```

Note: This assumes a `useConnections` hook exists in `src/hooks/use-connections.ts`. Verify this file exists and export name matches. If it uses a different name or export pattern, adjust the import accordingly.

- [ ] **Step 2: Verify `useConnections` hook exists**

Search for the connections hook file and confirm the import path and export name. If the hook is named differently (e.g., `useAllConnections`), update the import in ExtractStep.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

---

### Task 8: Review Step — JSON Editor

**Files:**
- Modify: `packages/client/src/components/cyoa/steps/ReviewStep.tsx`

- [ ] **Step 1: Implement full ReviewStep**

Replace the placeholder. Shows extractions as editable JSON with approve button:

```tsx
import { useState, useEffect } from "react";
import { useReviewCyoa } from "@/hooks/use-cyoa";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { Check, Loader2 } from "lucide-react";

interface ReviewStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

export function ReviewStep({ document, documentId }: ReviewStepProps) {
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const review = useReviewCyoa();

  useEffect(() => {
    if (document?.images) {
      const extractions = document.images
        .sort((a, b) => a.pageNumber - b.pageNumber)
        .filter((img) => img.extractions)
        .map((img) => img.extractions);
      setJsonText(JSON.stringify(extractions, null, 2));
    }
  }, [document]);

  const handleApprove = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        setParseError("Extractions must be a JSON array");
        return;
      }
      setParseError(null);
      review.mutate({ documentId, extractions: parsed });
    } catch {
      setParseError("Invalid JSON — please fix syntax errors");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--muted-foreground)]">
        Review and correct the extracted choices below. Edit the JSON directly, then approve to continue.
      </p>

      <textarea
        value={jsonText}
        onChange={(e) => {
          setJsonText(e.target.value);
          setParseError(null);
        }}
        className="h-[400px] w-full resize-y rounded-md border border-[var(--border)] bg-[var(--input)] p-3 font-mono text-xs text-[var(--foreground)]"
        spellCheck={false}
      />

      {parseError && <p className="text-xs text-red-400">{parseError}</p>}

      <div className="flex justify-end">
        <button
          onClick={handleApprove}
          disabled={review.isPending}
          className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {review.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Approve & Continue
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

---

### Task 9: Merge Step — Trigger + Summary

**Files:**
- Modify: `packages/client/src/components/cyoa/steps/MergeStep.tsx`

- [ ] **Step 1: Implement full MergeStep**

Replace the placeholder. Single merge button + merged document summary:

```tsx
import { useMergeCyoa, useCyoaDocument } from "@/hooks/use-cyoa";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { Merge, Loader2, Tag, Hash, Coins } from "lucide-react";

interface MergeStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

export function MergeStep({ document, documentId }: MergeStepProps) {
  const merge = useMergeCyoa();
  const { data: freshDoc } = useCyoaDocument(documentId);
  const doc = freshDoc ?? document;

  const merged = doc?.mergedDocument as Record<string, unknown> | null;
  const choices = doc?.choices ?? [];
  const isMerged = doc?.status === "merged" || doc?.status === "analyzed";

  const categories = [...new Set(choices.map((c) => c.category).filter(Boolean))];
  const title = (merged?.title as string) ?? doc?.name ?? "Untitled";

  return (
    <div className="flex flex-col gap-4">
      {!isMerged && (
        <button
          onClick={() => merge.mutate({ documentId })}
          disabled={merge.isPending}
          className="flex items-center justify-center gap-2 self-start rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {merge.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4" />}
          Merge Extractions
        </button>
      )}

      {merge.isError && (
        <p className="text-xs text-red-400">
          Merge failed: {(merge.error as Error)?.message ?? "Unknown error"}
        </p>
      )}

      {isMerged && (
        <>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
            {merged?.description && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {merged.description as string}
              </p>
            )}
            <div className="mt-3 flex gap-4">
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <Hash className="h-3.5 w-3.5" />
                {choices.length} choices
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <Tag className="h-3.5 w-3.5" />
                {categories.length} categories
              </div>
              {merged?.pointBudget != null && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                  <Coins className="h-3.5 w-3.5" />
                  {String(merged.pointBudget)} point budget
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-medium text-[var(--muted-foreground)]">
              Merged Choices
            </h3>
            {choices.map((choice) => (
              <div
                key={choice.id}
                className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
              >
                <span className="text-sm text-[var(--foreground)]">{choice.name}</span>
                {choice.pointCost != null && (
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    {choice.pointCost} pts
                  </span>
                )}
                {choice.category && (
                  <span className="ml-auto rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                    {choice.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

---

### Task 10: Analyze Step — Card/Table Toggle + Analysis Results

**Files:**
- Modify: `packages/client/src/components/cyoa/steps/AnalyzeStep.tsx`

- [ ] **Step 1: Implement full AnalyzeStep**

Replace the placeholder. Connection picker, analysis trigger, and results display with card/table toggle:

```tsx
import { useState } from "react";
import { useAnalyzeCyoa, useCyoaDocument } from "@/hooks/use-cyoa";
import type { CyoaDocument, CyoaChoice } from "@/hooks/use-cyoa";
import { useConnections } from "@/hooks/use-connections";
import { Loader2, BarChart3, Table, Zap, Crown, Swords, Target } from "lucide-react";

interface AnalyzeStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

interface ChoiceAnalysis {
  tier: string;
  costEfficiency: number;
  synergies: string[];
  analysis: string;
}

interface SynergyPair {
  choices: string[];
  synergy: string;
  combinedValue: number;
}

interface BuildArchetype {
  name: string;
  description: string;
  choiceIds: string[];
  totalCost: number;
  strengths: string[];
  weaknesses: string[];
}

interface Analysis {
  tierList: Record<string, ChoiceAnalysis[]>;
  categorySummaries: Record<string, string>;
  topSynergies: SynergyPair[];
  buildArchetypes: BuildArchetype[];
  overallSummary: string;
}

const TIER_COLORS: Record<string, string> = {
  S: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  A: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
  B: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  C: "bg-purple-500/20 border-purple-500/40 text-purple-300",
  D: "bg-gray-500/20 border-gray-500/40 text-gray-300",
  F: "bg-red-500/20 border-red-500/40 text-red-300",
};

const TIER_ORDER = ["S", "A", "B", "C", "D", "F"];

export function AnalyzeStep({ document, documentId }: AnalyzeStepProps) {
  const [connectionId, setConnectionId] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [sortKey, setSortKey] = useState<"name" | "tier" | "cost" | "efficiency">("tier");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterTier, setFilterTier] = useState<string>("all");

  const analyze = useAnalyzeCyoa();
  const { data: connections } = useConnections();
  const { data: freshDoc } = useCyoaDocument(documentId);
  const doc = freshDoc ?? document;

  const choices = doc?.choices ?? [];
  const rawAnalysis = doc?.analysis as Analysis | null;
  const isAnalyzed = doc?.status === "analyzed";

  const analysis = rawAnalysis;
  const tierList = analysis?.tierList ?? {};
  const synergies = analysis?.topSynergies ?? [];
  const builds = analysis?.buildArchetypes ?? [];

  const choiceMap = new Map(choices.map((c) => [c.id, c]));

  const handleAnalyze = () => {
    if (!connectionId) return;
    analyze.mutate({ documentId, connectionId });
  };

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const TIER_INDEX: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };

  const sortedChoices = [...choices]
    .filter((c) => filterTier === "all" || c.tier === filterTier)
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return dir * a.name.localeCompare(b.name);
      if (sortKey === "tier") return dir * ((TIER_INDEX[a.tier ?? "F"] ?? 5) - (TIER_INDEX[b.tier ?? "F"] ?? 5));
      if (sortKey === "cost") return dir * ((a.pointCost ?? 0) - (b.pointCost ?? 0));
      return dir * ((a.costEfficiency ?? 0) - (b.costEfficiency ?? 0));
    });

  return (
    <div className="flex flex-col gap-4">
      {!isAnalyzed && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">
            Select LLM Connection for Analysis
          </label>
          <div className="flex gap-2">
            <select
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]"
              disabled={analyze.isPending}
            >
              <option value="">Choose a connection...</option>
              {connections?.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.name} ({conn.provider})
                </option>
              ))}
            </select>
            <button
              onClick={handleAnalyze}
              disabled={!connectionId || analyze.isPending}
              className="flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              Analyze
            </button>
          </div>
        </div>
      )}

      {analyze.isPending && (
        <div className="flex flex-col items-center gap-2 py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--muted-foreground)]">Running LLM analysis...</p>
        </div>
      )}

      {isAnalyzed && analysis && (
        <>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-sm text-[var(--foreground)]">{analysis.overallSummary}</p>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-[var(--muted-foreground)]">Tier List</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode("cards")}
                className={`rounded p-1.5 ${viewMode === "cards" ? "bg-[var(--accent)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}
              >
                <Crown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded p-1.5 ${viewMode === "table" ? "bg-[var(--accent)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}
              >
                <Table className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {viewMode === "cards" ? (
            <div className="flex flex-col gap-3">
              {TIER_ORDER.filter((t) => tierList[t]?.length).map((tier) => {
                const tierChoices = tierList[tier] ?? [];
                return (
                  <div key={tier}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${TIER_COLORS[tier] ?? "bg-gray-500/20 text-gray-300"}`}
                      >
                        {tier}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {tierChoices.length} choice{tierChoices.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {tierChoices.map((ca: ChoiceAnalysis & { choiceId?: string }) => {
                        const choice = choices.find((c) => c.tier === tier && c.name);
                        const id = (ca as Record<string, unknown>).choiceId as string | undefined;
                        const ch = id ? choiceMap.get(id) : choice;
                        return (
                          <div
                            key={id ?? ca.analysis}
                            className={`rounded-md border p-2 ${TIER_COLORS[tier] ?? "border-[var(--border)] bg-[var(--card)]"}`}
                          >
                            <p className="text-xs font-medium">{ch?.name ?? "Unknown"}</p>
                            <div className="mt-1 flex items-center gap-2">
                              {ch?.pointCost != null && (
                                <span className="text-[10px] opacity-70">{ch.pointCost} pts</span>
                              )}
                              <span className="text-[10px] opacity-70">Eff: {ca.costEfficiency}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1 text-xs text-[var(--foreground)]"
                >
                  <option value="all">All tiers</option>
                  {TIER_ORDER.map((t) => (
                    <option key={t} value={t}>Tier {t}</option>
                  ))}
                </select>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                    <th className="cursor-pointer px-2 py-1.5 text-left" onClick={() => toggleSort("name")}>Name</th>
                    <th className="cursor-pointer px-2 py-1.5 text-left" onClick={() => toggleSort("tier")}>Tier</th>
                    <th className="cursor-pointer px-2 py-1.5 text-right" onClick={() => toggleSort("cost")}>Cost</th>
                    <th className="cursor-pointer px-2 py-1.5 text-right" onClick={() => toggleSort("efficiency")}>Efficiency</th>
                    <th className="px-2 py-1.5 text-left">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedChoices.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--border)]">
                      <td className="px-2 py-1.5 text-[var(--foreground)]">{c.name}</td>
                      <td className="px-2 py-1.5">
                        {c.tier && (
                          <span className={`inline-block rounded px-1 py-0.5 text-[10px] font-bold ${TIER_COLORS[c.tier] ?? ""}`}>
                            {c.tier}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right text-[var(--foreground)]">{c.pointCost ?? "—"}</td>
                      <td className="px-2 py-1.5 text-right text-[var(--foreground)]">{c.costEfficiency ?? "—"}</td>
                      <td className="px-2 py-1.5 text-[var(--muted-foreground)]">{c.category ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {synergies.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                <Swords className="h-3.5 w-3.5" /> Top Synergies
              </h3>
              {synergies.map((syn, i) => (
                <div
                  key={i}
                  className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3"
                >
                  <p className="text-sm text-[var(--foreground)]">{syn.synergy}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      Value: {syn.combinedValue}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {syn.choices.map((id) => choiceMap.get(id)?.name ?? id).join(" + ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {builds.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                <Target className="h-3.5 w-3.5" /> Build Archetypes
              </h3>
              {builds.map((build, i) => (
                <div
                  key={i}
                  className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--foreground)]">{build.name}</p>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {build.totalCost} pts
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{build.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {build.choiceIds.map((id) => (
                      <span
                        key={id}
                        className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]"
                      >
                        {choiceMap.get(id)?.name ?? id}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-3">
                    <div className="text-[10px] text-emerald-400">
                      Strengths: {build.strengths.join(", ")}
                    </div>
                    <div className="text-[10px] text-red-400">
                      Weaknesses: {build.weaknesses.join(", ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

---

### Task 11: Final Validation + Commit

- [ ] **Step 1: Run full check**

Run: `pnpm check`
Expected: Lint + typecheck + build all pass

- [ ] **Step 2: Commit all step implementations**

```bash
git add packages/client/src/components/cyoa/steps/
git commit -m "feat(client): implement CYOA pipeline upload, extract, review, merge, analyze steps"
```
