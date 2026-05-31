# CYOA Build Planner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a point-buy character builder where users create named builds per CYOA document, toggle choices from the analyzed catalog, track point budgets, and see synergy/tier information.

**Architecture:** New SQLite table + CRUD API + modal overlay on CyoaEditor. Server-persisted builds with React Query hooks. Two-panel modal: choice catalog (left) + build summary (right).

**Tech Stack:** SQLite via drizzle-orm, Fastify, React 19, TanStack React Query, Tailwind CSS, Lucide React.

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `packages/server/src/db/schema/cyoa-builds.ts` | `cyoaBuilds` SQLite table definition |
| `packages/server/src/routes/cyoa-builds.routes.ts` | 5 CRUD endpoints for builds |
| `packages/client/src/hooks/use-cyoa-builds.ts` | React Query hooks for builds |
| `packages/client/src/components/cyoa/BuildPlannerModal.tsx` | Modal shell + build selector |
| `packages/client/src/components/cyoa/ChoiceCatalog.tsx` | Left panel — searchable choice catalog |
| `packages/client/src/components/cyoa/BuildSummary.tsx` | Right panel — budget tracker + selected choices + notes |
| `packages/server/tests/cyoa-builds-routes.test.ts` | API route tests |

### Modified Files

| File | Change |
|------|--------|
| `packages/server/src/db/schema/index.ts` | Add `export * from "./cyoa-builds.js"` |
| `packages/client/src/components/cyoa/CyoaEditor.tsx` | Add "Build Planner" button in header |

---

### Task 1: DB Schema — `cyoaBuilds` Table

**Files:**
- Create: `packages/server/src/db/schema/cyoa-builds.ts`
- Modify: `packages/server/src/db/schema/index.ts`

- [ ] **Step 1: Create the schema file**

Create `packages/server/src/db/schema/cyoa-builds.ts` following the exact patterns from `cyoa.ts`:

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { cyoaDocuments } from "./cyoa.js";

export const cyoaBuilds = sqliteTable("cyoa_builds", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => cyoaDocuments.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  description: text("description").notNull().default(""),
  selectedChoiceIds: text("selected_choice_ids").notNull().default("[]"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

- [ ] **Step 2: Add barrel export**

Add to `packages/server/src/db/schema/index.ts` after the cyoa line:

```ts
export * from "./cyoa-builds.js";
```

- [ ] **Step 3: Add migration SQL**

Read `packages/server/src/db/migrate.ts` to find where CYOA tables are defined. Add a new `CREATE TABLE` block for `cyoa_builds` following the same pattern as `cyoa_documents`, `cyoa_images`, and `cyoa_choices`. The SQL:

```sql
CREATE TABLE IF NOT EXISTS cyoa_builds (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES cyoa_documents(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  selected_choice_ids TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Also check `packages/server/src/db/file-backed-store.ts` for cascade-delete registration — add `cyoa_builds` so that deleting a document cascades to its builds.

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit --project packages/server/tsconfig.json`
Expected: No errors

---

### Task 2: API Routes — Build CRUD

**Files:**
- Create: `packages/server/src/routes/cyoa-builds.routes.ts`

- [ ] **Step 1: Create the routes file**

Create `packages/server/src/routes/cyoa-builds.routes.ts` following the exact patterns from `cyoa.routes.ts`:

```ts
import type { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { newId, now } from "../utils/id-generator.js";
import { cyoaBuilds, cyoaDocuments } from "../db/schema/index.js";
import { logger } from "../lib/logger.js";

function parseChoiceIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function cyoaBuildsRoutes(app: FastifyInstance) {
  app.get("/:docId/builds", async (req, reply) => {
    const { docId } = req.params as { docId: string };
    const rows = app.db
      .select()
      .from(cyoaBuilds)
      .where(eq(cyoaBuilds.documentId, docId))
      .orderBy(desc(cyoaBuilds.createdAt))
      .all();
    const builds = rows.map((r) => ({
      ...r,
      selectedChoiceIds: parseChoiceIds(r.selectedChoiceIds),
    }));
    return reply.send(builds);
  });

  app.post("/:docId/builds", async (req, reply) => {
    const { docId } = req.params as { docId: string };
    const body = req.body as { name?: string; description?: string };
    const id = newId();
    const timestamp = now();

    const doc = app.db
      .select({ id: cyoaDocuments.id })
      .from(cyoaDocuments)
      .where(eq(cyoaDocuments.id, docId))
      .get();
    if (!doc) return reply.status(404).send({ error: "Document not found" });

    app.db.insert(cyoaBuilds).values({
      id,
      documentId: docId,
      name: body.name ?? "New Build",
      description: body.description ?? "",
      selectedChoiceIds: "[]",
      notes: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    }).run();

    return reply.send({
      id,
      documentId: docId,
      name: body.name ?? "New Build",
      description: body.description ?? "",
      selectedChoiceIds: [],
      notes: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  app.get("/:docId/builds/:buildId", async (req, reply) => {
    const { docId, buildId } = req.params as { docId: string; buildId: string };
    const row = app.db
      .select()
      .from(cyoaBuilds)
      .where(eq(cyoaBuilds.id, buildId))
      .get();
    if (!row || row.documentId !== docId) {
      return reply.status(404).send({ error: "Build not found" });
    }
    return reply.send({ ...row, selectedChoiceIds: parseChoiceIds(row.selectedChoiceIds) });
  });

  app.patch("/:docId/builds/:buildId", async (req, reply) => {
    const { docId, buildId } = req.params as { docId: string; buildId: string };
    const body = req.body as {
      name?: string;
      description?: string;
      selectedChoiceIds?: string[];
      notes?: string;
    };

    const existing = app.db
      .select()
      .from(cyoaBuilds)
      .where(eq(cyoaBuilds.id, buildId))
      .get();
    if (!existing || existing.documentId !== docId) {
      return reply.status(404).send({ error: "Build not found" });
    }

    const updates: Record<string, unknown> = { updatedAt: now() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.selectedChoiceIds !== undefined) {
      updates.selectedChoiceIds = JSON.stringify(body.selectedChoiceIds);
    }
    if (body.notes !== undefined) updates.notes = body.notes;

    app.db
      .update(cyoaBuilds)
      .set(updates)
      .where(eq(cyoaBuilds.id, buildId))
      .run();

    const updated = app.db
      .select()
      .from(cyoaBuilds)
      .where(eq(cyoaBuilds.id, buildId))
      .get();
    return reply.send({ ...updated, selectedChoiceIds: parseChoiceIds(updated!.selectedChoiceIds) });
  });

  app.delete("/:docId/builds/:buildId", async (req, reply) => {
    const { docId, buildId } = req.params as { docId: string; buildId: string };

    const existing = app.db
      .select()
      .from(cyoaBuilds)
      .where(eq(cyoaBuilds.id, buildId))
      .get();
    if (!existing || existing.documentId !== docId) {
      return reply.status(404).send({ error: "Build not found" });
    }

    app.db.delete(cyoaBuilds).where(eq(cyoaBuilds.id, buildId)).run();
    return reply.send({ success: true });
  });
}
```

- [ ] **Step 2: Register the routes**

Find where `cyoaRoutes` is registered in the main server file (search for `cyoaRoutes` in `packages/server/src/`). Add registration of `cyoaBuildsRoutes` in the same place, registered under the same `/api/cyoa` prefix. The route file uses nested params (`/:docId/builds`), so it should be registered alongside the existing cyoa routes.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit --project packages/server/tsconfig.json`
Expected: No errors

---

### Task 3: API Tests — Build Routes

**Files:**
- Create: `packages/server/tests/cyoa-builds-routes.test.ts`

- [ ] **Step 1: Create the test file**

Create `packages/server/tests/cyoa-builds-routes.test.ts` following the mock-DB pattern from `cyoa-routes.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { cyoaBuildsRoutes } from "../src/routes/cyoa-builds.routes.js";

vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

function createMockDB() {
  const _builds: any[] = [];
  const _docs: any[] = [
    { id: "doc-1", name: "Test Doc", status: "analyzed" },
  ];

  return {
    _builds,
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            all: vi.fn(() => _builds),
          }),
          get: vi.fn(() => _builds[0] ?? null),
        }),
        get: vi.fn(() => _docs[0]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        run: vi.fn(),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          run: vi.fn(),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        run: vi.fn(),
      }),
    }),
  } as any;
}

async function buildApp() {
  const app = Fastify();
  const mockDB = createMockDB();
  (app as any).db = mockDB;
  await app.register(cyoaBuildsRoutes);
  return { app, mockDB };
}

describe("CYOA Builds Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /:docId/builds returns empty list", async () => {
    const { app } = await buildApp();
    const res = await app.inject({ method: "GET", url: "/doc-1/builds" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("POST /:docId/builds creates a build", async () => {
    const { app, mockDB } = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/doc-1/builds",
      payload: { name: "My Build" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("My Build");
    expect(body.documentId).toBe("doc-1");
    expect(body.selectedChoiceIds).toEqual([]);
  });

  it("POST /:docId/builds returns 404 for missing doc", async () => {
    const { app, mockDB } = await buildApp();
    const docSelect = mockDB.select().from();
    const whereMock = docSelect.where ?? docSelect;
    whereMock.get = vi.fn(() => null);
    const res = await app.inject({
      method: "POST",
      url: "/missing-doc/builds",
      payload: { name: "Build" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /:docId/builds/:buildId returns 404 for missing build", async () => {
    const { app } = await buildApp();
    const res = await app.inject({ method: "GET", url: "/doc-1/builds/missing" });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH /:docId/builds/:buildId returns 404 for missing build", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/doc-1/builds/missing",
      payload: { name: "Updated" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /:docId/builds/:buildId returns 404 for missing build", async () => {
    const { app } = await buildApp();
    const res = await app.inject({ method: "DELETE", url: "/doc-1/builds/missing" });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /:docId/builds/:buildId deletes a build", async () => {
    const { app, mockDB } = await buildApp();
    mockDB._builds.push({
      id: "build-1",
      documentId: "doc-1",
      name: "Delete Me",
      selectedChoiceIds: "[]",
    });
    const res = await app.inject({ method: "DELETE", url: "/doc-1/builds/build-1" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });
  });

  it("POST /:docId/builds uses default name when not provided", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/doc-1/builds",
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("New Build");
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run packages/server/tests/cyoa-builds-routes.test.ts`
Expected: All tests pass

---

### Task 4: React Query Hooks — `use-cyoa-builds.ts`

**Files:**
- Create: `packages/client/src/hooks/use-cyoa-builds.ts`

- [ ] **Step 1: Create the hooks file**

Create `packages/client/src/hooks/use-cyoa-builds.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface CyoaBuild {
  id: string;
  documentId: string;
  name: string;
  description: string;
  selectedChoiceIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const buildKeys = {
  all: (docId: string) => ["cyoa-builds", docId] as const,
  list: (docId: string) => [...buildKeys.all(docId), "list"] as const,
  detail: (docId: string, id: string) => [...buildKeys.all(docId), "detail", id] as const,
};

export function useCyoaBuilds(docId: string) {
  return useQuery({
    queryKey: buildKeys.list(docId),
    queryFn: () => api.get<CyoaBuild[]>(`/cyoa/${docId}/builds`),
    enabled: !!docId,
    staleTime: 5 * 60_000,
  });
}

export function useCyoaBuild(docId: string, id: string | null) {
  return useQuery({
    queryKey: buildKeys.detail(docId, id ?? ""),
    queryFn: () => api.get<CyoaBuild>(`/cyoa/${docId}/builds/${id}`),
    enabled: !!docId && !!id,
    staleTime: 5 * 60_000,
  });
}

export function useCreateCyoaBuild(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; description?: string }) =>
      api.post<CyoaBuild>(`/cyoa/${docId}/builds`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildKeys.all(docId) });
    },
  });
}

export function useUpdateCyoaBuild(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string; name?: string; description?: string; selectedChoiceIds?: string[]; notes?: string }) =>
      api.patch<CyoaBuild>(`/cyoa/${docId}/builds/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: buildKeys.all(docId) });
      qc.invalidateQueries({ queryKey: buildKeys.detail(docId, variables.id) });
    },
  });
}

export function useDeleteCyoaBuild(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cyoa/${docId}/builds/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildKeys.all(docId) });
    },
  });
}

export type { CyoaBuild };
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

---

### Task 5: Build Planner Modal — `BuildPlannerModal.tsx`

**Files:**
- Create: `packages/client/src/components/cyoa/BuildPlannerModal.tsx`
- Create: `packages/client/src/components/cyoa/ChoiceCatalog.tsx`
- Create: `packages/client/src/components/cyoa/BuildSummary.tsx`

- [ ] **Step 1: Create `ChoiceCatalog.tsx`**

Create `packages/client/src/components/cyoa/ChoiceCatalog.tsx` — left panel with search, category filter, and choice cards:

```tsx
import { useState, useMemo } from "react";
import type { CyoaChoice } from "@/hooks/use-cyoa";
import { Search, Filter } from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  S: "bg-amber-500/20 text-amber-300",
  A: "bg-emerald-500/20 text-emerald-300",
  B: "bg-blue-500/20 text-blue-300",
  C: "bg-purple-500/20 text-purple-300",
  D: "bg-gray-500/20 text-gray-300",
  F: "bg-red-500/20 text-red-300",
};

interface ChoiceCatalogProps {
  choices: CyoaChoice[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export function ChoiceCatalog({ choices, selectedIds, onToggle }: ChoiceCatalogProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => ["all", ...new Set(choices.map((c) => c.category).filter(Boolean) as string[])],
    [choices],
  );

  const filtered = useMemo(() => {
    return choices.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [choices, search, category]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search choices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] py-2 pl-8 pr-3 text-xs text-[var(--foreground)]"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-2 text-xs text-[var(--foreground)]"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "all" ? "All Categories" : cat}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {filtered.map((choice) => {
          const isSelected = selectedIds.has(choice.id);
          return (
            <button
              key={choice.id}
              onClick={() => onToggle(choice.id)}
              className={`flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
                isSelected
                  ? "border-[var(--primary)] bg-[var(--primary)]/10"
                  : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)]"
              }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border)]"
                }`}
              >
                {isSelected && <span className="text-[10px]">&#10003;</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--foreground)]">{choice.name}</span>
                  {choice.tier && (
                    <span
                      className={`rounded px-1 py-0.5 text-[9px] font-bold ${TIER_COLORS[choice.tier] ?? ""}`}
                    >
                      {choice.tier}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  {choice.pointCost != null && (
                    <span className="text-[10px] text-[var(--muted-foreground)]">{choice.pointCost} pts</span>
                  )}
                  {choice.category && (
                    <span className="text-[10px] text-[var(--muted-foreground)]">{choice.category}</span>
                  )}
                </div>
                {choice.prerequisites.length > 0 && (
                  <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)] italic">
                    Requires: {choice.prerequisites.join(", ")}
                  </p>
                )}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-4 text-center text-xs text-[var(--muted-foreground)]">No choices match your filters</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `BuildSummary.tsx`**

Create `packages/client/src/components/cyoa/BuildSummary.tsx` — right panel with budget, selected choices, synergies, and notes:

```tsx
import { useState, useCallback, useRef } from "react";
import type { CyoaChoice, CyoaDocument } from "@/hooks/use-cyoa";
import type { CyoaBuild } from "@/hooks/use-cyoa-builds";
import { useUpdateCyoaBuild } from "@/hooks/use-cyoa-builds";
import { Trash2, AlertTriangle, Zap } from "lucide-react";

interface SynergyPair {
  choices: string[];
  synergy: string;
  combinedValue: number;
}

interface BuildSummaryProps {
  build: CyoaBuild;
  document: CyoaDocument;
  choices: CyoaChoice[];
  onRemoveChoice: (id: string) => void;
}

export function BuildSummary({ build, document, choices, onRemoveChoice }: BuildSummaryProps) {
  const updateBuild = useUpdateCyoaBuild(document.id);
  const [localNotes, setLocalNotes] = useState(build.notes);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const selectedChoices = choices.filter((c) => build.selectedChoiceIds.includes(c.id));
  const totalCost = selectedChoices.reduce((sum, c) => sum + (c.pointCost ?? 0), 0);
  const budget = document.pointBudget;

  const overBudget = budget != null && totalCost > budget;

  const rawAnalysis = document.analysis as { topSynergies?: SynergyPair[] } | null;
  const synergies = rawAnalysis?.topSynergies ?? [];
  const activeSynergies = synergies.filter((syn) =>
    syn.choices.every((id) => build.selectedChoiceIds.includes(id)),
  );

  const handleNotesChange = useCallback(
    (value: string) => {
      setLocalNotes(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateBuild.mutate({ id: build.id, notes: value });
      }, 500);
    },
    [updateBuild, build.id],
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-[var(--muted-foreground)]">Point Budget</h3>
          {overBudget && (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <AlertTriangle className="h-3 w-3" /> Over budget
            </span>
          )}
        </div>
        <div className="mt-1.5">
          {budget != null ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-[var(--foreground)]">{totalCost}</span>
                <span className="text-xs text-[var(--muted-foreground)]">/ {budget} points spent</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div
                  className={`h-full rounded-full transition-all ${
                    overBudget ? "bg-red-500" : totalCost > (budget ?? 0) * 0.8 ? "bg-amber-500" : "bg-[var(--primary)]"
                  }`}
                  style={{ width: `${Math.min((totalCost / budget) * 100, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">
              {totalCost} points spent (no budget set)
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        <h3 className="text-xs font-medium text-[var(--muted-foreground)]">
          Selected ({selectedChoices.length})
        </h3>
        {selectedChoices.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
          >
            <span className="text-xs text-[var(--foreground)]">{c.name}</span>
            {c.pointCost != null && (
              <span className="text-[10px] text-[var(--muted-foreground)]">{c.pointCost} pts</span>
            )}
            <button
              onClick={() => onRemoveChoice(c.id)}
              className="ml-auto rounded p-0.5 text-[var(--muted-foreground)] hover:bg-red-500/20 hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {selectedChoices.length === 0 && (
          <p className="py-4 text-center text-xs text-[var(--muted-foreground)]">
            Select choices from the catalog
          </p>
        )}
      </div>

      {activeSynergies.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="flex items-center gap-1 text-xs font-medium text-[var(--muted-foreground)]">
            <Zap className="h-3 w-3" /> Active Synergies
          </h3>
          {activeSynergies.map((syn, i) => (
            <div key={i} className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
              <p className="text-xs text-[var(--foreground)]">{syn.synergy}</p>
              <span className="text-[10px] text-emerald-400">Value: {syn.combinedValue}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Notes</label>
        <textarea
          value={localNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          className="h-20 resize-none rounded-md border border-[var(--border)] bg-[var(--input)] p-2 text-xs text-[var(--foreground)]"
          placeholder="Build notes..."
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `BuildPlannerModal.tsx`**

Create `packages/client/src/components/cyoa/BuildPlannerModal.tsx` — modal shell with header, build selector, and two-panel layout:

```tsx
import { useState, useCallback, useRef } from "react";
import type { CyoaDocument, CyoaChoice } from "@/hooks/use-cyoa";
import {
  useCyoaBuilds,
  useCreateCyoaBuild,
  useUpdateCyoaBuild,
  useDeleteCyoaBuild,
} from "@/hooks/use-cyoa-builds";
import type { CyoaBuild } from "@/hooks/use-cyoa-builds";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { ChoiceCatalog } from "./ChoiceCatalog";
import { BuildSummary } from "./BuildSummary";

interface BuildPlannerModalProps {
  document: CyoaDocument;
  choices: CyoaChoice[];
  onClose: () => void;
}

export function BuildPlannerModal({ document, choices, onClose }: BuildPlannerModalProps) {
  const { data: builds, isLoading } = useCyoaBuilds(document.id);
  const createBuild = useCreateCyoaBuild(document.id);
  const updateBuild = useUpdateCyoaBuild(document.id);
  const deleteBuild = useDeleteCyoaBuild(document.id);

  const [activeBuildId, setActiveBuildId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const activeBuild = builds?.find((b) => b.id === activeBuildId) ?? builds?.[0] ?? null;

  const selectedIds = new Set(activeBuild?.selectedChoiceIds ?? []);

  const handleToggleChoice = useCallback(
    (choiceId: string) => {
      if (!activeBuild) return;
      const newIds = [...activeBuild.selectedChoiceIds];
      const idx = newIds.indexOf(choiceId);
      if (idx >= 0) newIds.splice(idx, 1);
      else newIds.push(choiceId);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateBuild.mutate({ id: activeBuild.id, selectedChoiceIds: newIds });
      }, 200);
    },
    [activeBuild, updateBuild],
  );

  const handleRemoveChoice = useCallback(
    (choiceId: string) => {
      handleToggleChoice(choiceId);
    },
    [handleToggleChoice],
  );

  const handleCreate = useCallback(async () => {
    const result = await createBuild.mutateAsync({ name: `Build ${(builds?.length ?? 0) + 1}` });
    setActiveBuildId(result.id);
  }, [createBuild, builds?.length]);

  const handleDelete = useCallback(
    (id: string) => {
      if (confirmDeleteId === id) {
        deleteBuild.mutate(id, {
          onSuccess: () => {
            setConfirmDeleteId(null);
            if (activeBuildId === id) setActiveBuildId(null);
          },
        });
      } else {
        setConfirmDeleteId(id);
        setTimeout(() => setConfirmDeleteId(null), 3000);
      }
    },
    [confirmDeleteId, deleteBuild, activeBuildId],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-[90vw] flex-col rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Build Planner — {document.name}
          </h2>

          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />}

          <div className="flex flex-1 items-center gap-2">
            <select
              value={activeBuild?.id ?? ""}
              onChange={(e) => setActiveBuildId(e.target.value || null)}
              className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1 text-xs text-[var(--foreground)]"
            >
              {builds?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              disabled={createBuild.isPending}
              className="flex items-center gap-1 rounded-md bg-[var(--primary)] px-2 py-1 text-xs font-medium text-white"
            >
              <Plus className="h-3 w-3" /> New
            </button>
            {activeBuild && (
              <button
                onClick={() => handleDelete(activeBuild.id)}
                className="rounded p-1 text-[var(--muted-foreground)] hover:bg-red-500/20 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 border-r border-[var(--border)] p-3">
            <ChoiceCatalog
              choices={choices}
              selectedIds={selectedIds}
              onToggle={handleToggleChoice}
            />
          </div>
          <div className="w-1/2 p-3">
            {activeBuild ? (
              <BuildSummary
                build={activeBuild}
                document={document}
                choices={choices}
                onRemoveChoice={handleRemoveChoice}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Create a build to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

---

### Task 6: Integrate Build Planner into CyoaEditor

**Files:**
- Modify: `packages/client/src/components/cyoa/CyoaEditor.tsx`

- [ ] **Step 1: Add BuildPlannerModal import and state**

At the top of `CyoaEditor.tsx`, add the import:

```ts
import { BuildPlannerModal } from "./BuildPlannerModal";
```

Inside the `CyoaEditor` function, add local state after the existing hooks:

```ts
const [showBuildPlanner, setShowBuildPlanner] = useState(false);
```

Add the import for `useState` if not already imported from React.

- [ ] **Step 2: Add "Build Planner" button to the header**

Find the header div (the one with `ArrowLeft`, document name, and status badge). Add a button after the status badge, before the closing `</div>` of the header:

```tsx
{(document?.status === "merged" || document?.status === "analyzed") && (
  <button
    onClick={() => setShowBuildPlanner(true)}
    className="ml-auto rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
  >
    Build Planner
  </button>
)}
```

- [ ] **Step 3: Render the modal**

At the end of the CyoaEditor return, just before the closing `</div>`, add:

```tsx
{showBuildPlanner && document && (
  <BuildPlannerModal
    document={document}
    choices={document.choices}
    onClose={() => setShowBuildPlanner(false)}
  />
)}
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

---

### Task 7: Final Validation

- [ ] **Step 1: Run server tests**

Run: `npx vitest run packages/server/tests/cyoa-builds-routes.test.ts`
Expected: All tests pass

- [ ] **Step 2: Run full check**

Run: `pnpm check`
Expected: Lint + typecheck + build all pass

- [ ] **Step 3: Commit all build planner work**

```bash
git add packages/server/src/db/schema/cyoa-builds.ts packages/server/src/db/schema/index.ts packages/server/src/routes/cyoa-builds.routes.ts packages/server/tests/cyoa-builds-routes.test.ts packages/client/src/hooks/use-cyoa-builds.ts packages/client/src/components/cyoa/BuildPlannerModal.tsx packages/client/src/components/cyoa/ChoiceCatalog.tsx packages/client/src/components/cyoa/BuildSummary.tsx packages/client/src/components/cyoa/CyoaEditor.tsx
git commit -m "feat: add CYOA build planner with point-buy character builder"
```
