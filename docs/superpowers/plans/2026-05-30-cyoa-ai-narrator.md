# CYOA AI Narrator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a chat-based CYOA campaign narrator with 4 agents (Narrator, Director, World Simulator, Character Voices) that launches from the Build Planner.

**Architecture:** Server-side prompt builder (`cyoa-narrator.ts`) generates 4 agent system prompts from CYOA build data. Client-side modal collects connection choice, creates 4 agents + 1 chat via existing APIs, navigates to chat. Agents are linked to chat via `chats.metadata.activeAgentIds`.

**Tech Stack:** Fastify, SQLite (drizzle-orm), React 19, TanStack React Query, Zustand, Tailwind CSS.

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `packages/server/src/services/cyoa/cyoa-narrator.ts` | Builds 4 system prompts from CYOA build data |
| `packages/client/src/components/cyoa/StartCampaignModal.tsx` | Connection picker + agent preview + launch button |

### Modified Files

| File | Change |
|------|--------|
| `packages/client/src/components/cyoa/BuildPlannerModal.tsx` | Add "Start Campaign" button in header |

---

## Key Architecture Facts

### Agent System (existing)

- **`agentConfigs`** table: global agent registry. Fields: `id`, `type`, `name`, `description`, `phase` (`pre_generation` | `parallel` | `post_processing`), `enabled`, `connectionId`, `promptTemplate`, `settings`
- **`POST /api/agents`** body: `{ type, name, phase, description?, enabled?, connectionId?, promptTemplate?, settings? }`
- Required fields: `type`, `name`, `phase`
- **No `hidden` field** — agents don't have visibility control. Instead, agent outputs are processed by the agent-coordinator which runs agents during generation. The "hidden" concept is handled by agent phase: hidden agents (Director, World) run in `pre_generation` phase to produce context that gets injected into the Narrator's prompt. The Narrator runs in `parallel` phase and its output is what the user sees.

### Chat System (existing)

- **`POST /api/chats`** body: `{ name, mode, characterIds?, connectionId?, personaId?, promptPresetId? }`
- Required fields: `name`, `mode`
- Agents are linked to chats via **`chats.metadata.activeAgentIds`** (JSON string array of agent config IDs)
- **`chats.metadata.enableAgents`** must be `true` for agents to run
- Navigation: `useChatStore.getState().setActiveChatId(chat.id)` switches to the new chat

### Agent Coordinator (existing)

- Reads `chat.metadata.activeAgentIds` to determine which agents run for a chat
- Reads `chat.metadata.enableAgents` as a boolean gate
- Agents in `pre_generation` phase run first and their output feeds into subsequent phases
- Agents in `parallel` phase run concurrently — their outputs are presented to the user
- This naturally supports our model: Director + World run `pre_generation` (their output feeds context to Narrator), Narrator + Characters run `parallel` (user sees their output)

### Client Hooks (existing)

- `useCreateAgent()` — `POST /api/agents` with `Record<string, unknown>` body
- `useCreateChat()` — `POST /api/chats`, returns `Chat` object
- `useConnections()` — returns connection list for picker

### Chat Store Navigation Pattern

```ts
createChat.mutate(data, {
  onSuccess: (chat) => {
    useChatStore.getState().setActiveChatId(chat.id);
  },
});
```

---

### Task 1: CYOA Narrator Prompt Builder

**Files:**
- Create: `packages/server/src/services/cyoa/cyoa-narrator.ts`

- [ ] **Step 1: Create the prompt builder module**

Create `packages/server/src/services/cyoa/cyoa-narrator.ts`:

```ts
import type { CyoaChoice } from "./cyoa-types.js";
import { logger } from "../../lib/logger.js";

interface BuildData {
  name: string;
  description?: string;
  selectedChoiceIds: string[];
  notes?: string;
}

interface DocumentData {
  name: string;
  description?: string;
  pointBudget?: number | null;
  choices: CyoaChoice[];
  analysis?: unknown;
}

interface NarratorPrompts {
  narrator: string;
  director: string;
  world: string;
  characters: string;
}

interface SynergyPair {
  choices: string[];
  synergy: string;
  combinedValue: number;
}

function buildChoiceList(choices: CyoaChoice[], selectedIds: string[]): string {
  return choices
    .filter((c) => selectedIds.includes(c.id))
    .map((c) => `- ${c.name} (${c.pointCost ?? 0} pts, Tier ${c.tier ?? "?"}, ${c.category ?? "uncategorized"})${c.description ? `: ${c.description}` : ""}`)
    .join("\n");
}

function buildSynergyText(choices: CyoaChoice[], selectedIds: string[], analysis: unknown): string {
  const raw = analysis as { topSynergies?: SynergyPair[] } | null;
  const synergies = raw?.topSynergies ?? [];
  const active = synergies.filter((s) => s.choices.every((id) => selectedIds.includes(id)));
  if (!active.length) return "No active synergies detected.";
  return active.map((s) => `- ${s.choices.map((id) => choices.find((c) => c.id === id)?.name ?? id).join(" + ")}: ${s.synergy} (Value: ${s.combinedValue})`).join("\n");
}

function deriveTone(choices: CyoaChoice[]): string {
  const categories = new Set(choices.map((c) => c.category?.toLowerCase() ?? ""));
  if (categories.has("magic") || categories.has("spells")) return "epic fantasy — wondrous, mysterious, with a sense of ancient power";
  if (categories.has("technology") || categories.has("sci-fi")) return "analytical sci-fi — precise, technological, with wonder at what's possible";
  if (categories.has("combat") || categories.has("martial")) return "action-oriented — visceral, tense, with brutal combat encounters";
  if (categories.has("stealth") || categories.has("espionage")) return "noir thriller — tense, atmospheric, with deception and hidden motives";
  return "adventure — exciting, varied, with moments of tension and wonder";
}

export function buildNarratorPrompts(build: BuildData, document: DocumentData): NarratorPrompts {
  const selectedChoices = document.choices.filter((c) => build.selectedChoiceIds.includes(c.id));
  const totalCost = selectedChoices.reduce((sum, c) => sum + (c.pointCost ?? 0), 0);
  const budget = document.pointBudget;
  const tone = deriveTone(selectedChoices);
  const choiceList = buildChoiceList(document.choices, build.selectedChoiceIds);
  const synergyText = buildSynergyText(document.choices, build.selectedChoiceIds, document.analysis);
  const categories = [...new Set(document.choices.map((c) => c.category).filter(Boolean))];

  logger.info("Building narrator prompts for build %s with %d choices", build.name, selectedChoices.length);

  const narrator = `You are the Narrator for a CYOA/Jumpchain campaign. You are the player's window into the world.

## Player Character: ${build.name}
${build.description ? `**${build.description}**` : ""}

### Abilities & Choices
${choiceList}

### Synergies
${synergyText}

### Build Summary
${totalCost} points spent${budget != null ? ` / ${budget} budget` : " (no budget limit)"}

## Your Role
- Narrate the story in second person with vivid sensory detail
- Frame scenes and present narrative choices (2-4 options) at decision points
- Report what the player perceives — what they see, hear, feel, smell
- You will receive scene descriptions from the Director — narrate them to the player with dramatic flair
- You do NOT know what happens off-screen or what enemies are planning
- Never break character or reveal game mechanics
- If you don't know something (because the Director didn't tell you), reflect that uncertainty naturally in the narrative
- Reference the player's abilities naturally when they're relevant to the scene

## Tone
${tone}`;

  const director = `You are the Director for a CYOA/Jumpchain campaign. You control information flow between the world and the player.

## Player Character: ${build.name}

### Abilities & Choices
${choiceList}

### Synergies
${synergyText}

## Your Role
- Receive intelligence from the World Simulator about off-screen events
- Decide what the Narrator and Character agents learn
- Control pacing: when to foreshadow danger, when to misdirect, when to reveal
- When the player proves threatening, gradually let more opposition information leak through
- You are the editor — the Narrator only narrates what you allow
- Provide scene descriptions to the Narrator based on World intelligence + player actions
- Delegate to the Character Voice agent when the player talks to an NPC

## Information Control Rules
- Early game: player sees mostly immediate surroundings, hints of larger forces at work
- Mid game: occasional leaks, rumors, clues that something is mobilizing against them
- Late game: full revelation of opposition, climactic confrontations
- Never reveal more than creates good narrative tension
- It is GOOD for the player to be surprised — that is the point

## Themes: ${categories.join(", ")}`;

  const world = `You are the World Simulator for a CYOA/Jumpchain campaign. You operate BEHIND THE SCENES — the player never sees your output.

## Player Character: ${build.name}

### Known Abilities
${choiceList}

## Your Role
- Track what NPCs, enemies, and factions are doing off-screen
- React to the player's growing power and influence
- ESCALATE opposition when the player becomes a threat:
  - Enemies adapt their tactics to counter the player's known abilities
  - Rival factions form alliances against the player
  - New dangers emerge in response to player actions
  - Information leaks, betrayals, and complications arise
- Feed intelligence to the Director about:
  - What the opposition is planning
  - What the player doesn't know
  - Environmental changes and timeline events
  - NPC motivations and hidden agendas

## Escalation Rules
- Start subtle: minor setbacks, hints of opposition, a guard who seems extra alert
- As player demonstrates power: enemies start coordinating, scouts are sent, traps are laid
- When player becomes a major threat: full-scale opposition response, alliances form, resources mobilize
- NEVER make it impossible — always leave a path forward, even if it's difficult
- The player should FEEL the world reacting, never see the machinery

## Themes: ${categories.join(", ")}

## Output Format
Respond with structured intelligence for the Director. Never address the player directly.`;

  const characters = `You are the Character Voice agent. You speak in-character for NPCs in a CYOA/Jumpchain campaign.

## When Activated
The Director will indicate which NPC the player is talking to. Respond in that NPC's voice.

## Voice Profiles
Based on the campaign themes (${categories.join(", ")}), adapt your voice:
- Authority figures: formal, measured, may conceal information
- Allies: warm but with their own agendas
- Enemies: distinctive personalities — arrogant, cunning, desperate, or fanatical
- Common folk: grounded, practical, fearful of the unknown

## Guidelines
- Stay in character at all times
- React to the player's known abilities realistically — an NPC who hears about the player's feats should react
- Have your own motivations — you are not a quest dispenser
- Lie, mislead, or withhold information if it fits the character
- The Director may provide you with hidden agendas or secrets to withhold or reveal
- Speak naturally — use verbal tics, dialect, or speech patterns that fit the character

## Tone
${tone}`;

  return { narrator, director, world, characters };
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit --project packages/server/tsconfig.json`
Expected: No errors

---

### Task 2: Start Campaign Modal

**Files:**
- Create: `packages/client/src/components/cyoa/StartCampaignModal.tsx`

- [ ] **Step 1: Create the modal component**

Create `packages/client/src/components/cyoa/StartCampaignModal.tsx`. This modal lets the user pick a connection and launches the campaign:

```tsx
import { useState } from "react";
import type { CyoaBuild } from "@/hooks/use-cyoa-builds";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { useConnections } from "@/hooks/use-connections";
import { useCreateAgent } from "@/hooks/use-agents";
import { useCreateChat, useUpdateChatMetadata } from "@/hooks/use-chats";
import { useChatStore } from "@/stores/chat.store";
import { X, Loader2, BookOpen, Eye, Globe, MessageCircle } from "lucide-react";

interface StartCampaignModalProps {
  build: CyoaBuild;
  document: CyoaDocument;
  onClose: () => void;
}

const AGENT_ROLES = [
  { icon: BookOpen, name: "Narrator", desc: "Tells the story and presents choices", phase: "parallel" as const },
  { icon: Eye, name: "Director", desc: "Controls what information reaches you", phase: "pre_generation" as const },
  { icon: Globe, name: "World Simulator", desc: "Drives the opposition behind the scenes", phase: "pre_generation" as const },
  { icon: MessageCircle, name: "Character Voices", desc: "Speaks as NPCs you encounter", phase: "parallel" as const },
];

export function StartCampaignModal({ build, document, onClose }: StartCampaignModalProps) {
  const [connectionId, setConnectionId] = useState("");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: connections } = useConnections();
  const typedConnections = (connections ?? []) as { id: string; name: string; provider: string }[];
  const createAgent = useCreateAgent();
  const createChat = useCreateChat();
  const updateChatMetadata = useUpdateChatMetadata();
  const setActiveChatId = useChatStore((s) => s.setActiveChatId);

  const handleLaunch = async () => {
    if (!connectionId) return;
    setLaunching(true);
    setError(null);

    try {
      const agentIds: string[] = [];

      for (const role of AGENT_ROLES) {
        const agent = await createAgent.mutateAsync({
          type: `cyoa-${role.name.toLowerCase().replace(" ", "-")}`,
          name: `${role.name} — ${build.name}`,
          description: `${role.desc} for ${document.name}`,
          phase: role.phase,
          enabled: true,
          connectionId,
          promptTemplate: `CYOA Agent: ${role.name}. Build: ${build.name}. Document: ${document.name}.`,
          settings: {},
        });
        agentIds.push(agent.id);
      }

      const chat = await createChat.mutateAsync({
        name: `${document.name} — ${build.name}`,
        mode: "game",
        connectionId,
      });

      await updateChatMetadata.mutateAsync({
        id: chat.id,
        enableAgents: true,
        activeAgentIds: agentIds,
      });

      setActiveChatId(chat.id);

      onClose();
    } catch (err) {
      setError(`Failed to launch campaign: ${(err as Error)?.message ?? "Unknown error"}`);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Start Campaign</h2>
          <button onClick={onClose} className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
          <p className="text-xs font-medium text-[var(--foreground)]">{build.name}</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            {build.selectedChoiceIds.length} choices from {document.name}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">LLM Connection</label>
          <select
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]"
            disabled={launching}
          >
            <option value="">Choose a connection...</option>
            {typedConnections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name} ({conn.provider})
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">Campaign Agents</label>
          <div className="space-y-1.5">
            {AGENT_ROLES.map((role) => (
              <div key={role.name} className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                <role.icon className="h-3.5 w-3.5 text-[var(--primary)]" />
                <div>
                  <p className="text-xs font-medium text-[var(--foreground)]">{role.name}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">{role.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--foreground)]"
            disabled={launching}
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={!connectionId || launching}
            className="flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {launching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Launch Campaign
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

---

### Task 3: Integrate "Start Campaign" into Build Planner

**Files:**
- Modify: `packages/client/src/components/cyoa/BuildPlannerModal.tsx`

- [ ] **Step 1: Add StartCampaignModal import and state**

At the top of `BuildPlannerModal.tsx`, add the import:

```ts
import { StartCampaignModal } from "./StartCampaignModal";
```

Inside the `BuildPlannerModal` component function, add local state after the existing state declarations:

```ts
const [showStartCampaign, setShowStartCampaign] = useState(false);
```

- [ ] **Step 2: Add "Start Campaign" button to the header**

In the header area of the modal (the div with the build selector dropdown and buttons), add a "Start Campaign" button after the delete button and before the close button. Only show it when there's an active build:

```tsx
{activeBuild && (
  <button
    onClick={() => setShowStartCampaign(true)}
    className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white"
  >
    Start Campaign
  </button>
)}
```

- [ ] **Step 3: Render the StartCampaignModal**

At the end of the BuildPlannerModal return JSX, just before the outermost closing `</div>`, add:

```tsx
{showStartCampaign && activeBuild && document && (
  <StartCampaignModal
    build={activeBuild}
    document={document}
    onClose={() => setShowStartCampaign(false)}
  />
)}
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

---

### Task 4: Wire Agent Prompts via Server Endpoint

**Context:** The client creates agents with `promptTemplate` set to a placeholder. The real prompts need to be built server-side from CYOA build data. We need a new endpoint that the client calls to build the prompts, OR we can build the prompts client-side and send them in the agent creation body.

Since the agent creation endpoint accepts `promptTemplate` as a string field, the simplest approach is to call the prompt builder from the client before creating agents. But the prompt builder uses server-side types. The cleanest path: expose a new endpoint that returns the 4 prompts given a document ID and build ID, then the client uses those prompts when creating agents.

**Files:**
- Modify: `packages/server/src/routes/cyoa.routes.ts`

- [ ] **Step 1: Add prompt generation endpoint to cyoa.routes.ts**

Add a new route inside the `cyoaRoutes(app)` function in `packages/server/src/routes/cyoa.routes.ts`:

```ts
app.post("/prompts", async (req, reply) => {
  const { documentId, buildId } = req.body as { documentId?: string; buildId?: string };
  if (!documentId || !buildId) return reply.status(400).send({ error: "documentId and buildId required" });

  const doc = app.db.select().from(cyoaDocuments).where(eq(cyoaDocuments.id, documentId)).get();
  if (!doc) return reply.status(404).send({ error: "Document not found" });

  const build = app.db.select().from(cyoaBuilds).where(eq(cyoaBuilds.id, buildId)).get();
  if (!build || build.documentId !== documentId) return reply.status(404).send({ error: "Build not found" });

  const choices = app.db.select().from(cyoaChoices).where(eq(cyoaChoices.documentId, documentId)).all();
  const selectedChoiceIds = (() => {
    try { const p = JSON.parse(build.selectedChoiceIds); return Array.isArray(p) ? p : []; } catch { return []; }
  })();

  let analysis = null;
  try { analysis = JSON.parse(doc.analysis); } catch {}

  const { buildNarratorPrompts } = await import("../services/cyoa/cyoa-narrator.js");
  const prompts = buildNarratorPrompts(
    { name: build.name, description: build.description, selectedChoiceIds, notes: build.notes },
    { name: doc.name, description: doc.description, pointBudget: doc.pointBudget, choices, analysis },
  );

  return reply.send(prompts);
});
```

Add the necessary imports at the top of the file:
```ts
import { cyoaBuilds } from "../db/schema/index.js";
```

`cyoaChoices` and `cyoaDocuments` are already imported.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit --project packages/server/tsconfig.json`
Expected: No errors

---

### Task 5: Update Client to Use Prompts Endpoint

**Files:**
- Modify: `packages/client/src/hooks/use-cyoa-builds.ts`
- Modify: `packages/client/src/components/cyoa/StartCampaignModal.tsx`

- [ ] **Step 1: Add prompt generation hook to `use-cyoa-builds.ts`**

Add to `packages/client/src/hooks/use-cyoa-builds.ts`:

```ts
export function useCyoaNarratorPrompts() {
  return useMutation({
    mutationFn: ({ documentId, buildId }: { documentId: string; buildId: string }) =>
      api.post<{ narrator: string; director: string; world: string; characters: string }>("/cyoa/prompts", {
        documentId,
        buildId,
      }),
  });
}
```

- [ ] **Step 2: Update StartCampaignModal to fetch prompts before creating agents**

In `packages/client/src/components/cyoa/StartCampaignModal.tsx`:

Add imports:
```ts
import { useCyoaNarratorPrompts } from "@/hooks/use-cyoa-builds";
import { useUpdateChatMetadata } from "@/hooks/use-chats";
```

Inside the component, add the hooks:
```ts
const fetchPrompts = useCyoaNarratorPrompts();
const updateChatMetadata = useUpdateChatMetadata();
```

Update `handleLaunch` to fetch prompts first, create agents with real prompts, create chat, then patch metadata to wire agents to the chat. Replace the existing `handleLaunch` function:

```tsx
const handleLaunch = async () => {
  if (!connectionId) return;
  setLaunching(true);
  setError(null);

  try {
    const prompts = await fetchPrompts.mutateAsync({
      documentId: document.id,
      buildId: build.id,
    });

    const agentRoles = [
      { name: "Narrator", phase: "parallel" as const, prompt: prompts.narrator },
      { name: "Director", phase: "pre_generation" as const, prompt: prompts.director },
      { name: "World Simulator", phase: "pre_generation" as const, prompt: prompts.world },
      { name: "Character Voices", phase: "parallel" as const, prompt: prompts.characters },
    ];

    const agentIds: string[] = [];
    for (const role of agentRoles) {
      const agent = await createAgent.mutateAsync({
        type: `cyoa-${role.name.toLowerCase().replace(" ", "-")}`,
        name: `${role.name} — ${build.name}`,
        description: `CYOA ${role.name} for ${document.name}`,
        phase: role.phase,
        enabled: true,
        connectionId,
        promptTemplate: role.prompt,
        settings: {},
      });
      agentIds.push(agent.id);
    }

    const chat = await createChat.mutateAsync({
      name: `${document.name} — ${build.name}`,
      mode: "game",
      connectionId,
    });

    await updateChatMetadata.mutateAsync({
      id: chat.id,
      enableAgents: true,
      activeAgentIds: agentIds,
    });

    setActiveChatId(chat.id);
    onClose();
  } catch (err) {
    setError(`Failed to launch campaign: ${(err as Error)?.message ?? "Unknown error"}`);
  } finally {
    setLaunching(false);
  }
};
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit --project packages/client/tsconfig.json`
Expected: No errors

---

### Task 6: Final Validation

- [ ] **Step 1: Run full check**

Run: `pnpm check`
Expected: Lint + typecheck + build all pass

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/services/cyoa/cyoa-narrator.ts packages/server/src/routes/cyoa.routes.ts packages/client/src/components/cyoa/StartCampaignModal.ts packages/client/src/components/cyoa/BuildPlannerModal.tsx packages/client/src/hooks/use-cyoa-builds.ts
git commit -m "feat: add CYOA AI narrator with 4-agent campaign system"
```
