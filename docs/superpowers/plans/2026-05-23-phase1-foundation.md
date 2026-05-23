# JumpChoice Phase 1: Foundation & Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Marinara Engine fork into JumpChoice with clean architecture, manageable file sizes, test coverage, and foundational narrative engine.

**Architecture:** Fork-then-diverge strategy. Start by renaming and cleaning up Marinara Engine, then split massive files into focused modules, add test infrastructure, and implement core narrative features (anti-assistant bias, knowledge firewall, narrator personas, CoT system).

**Tech Stack:** TypeScript, React 19, Vite 7, Fastify 5, pnpm workspaces, Vitest

---

## File Structure

### New/Modified Files

**Renamed Packages:**
- `packages/client/package.json` → `@jumpchoice/client`
- `packages/server/package.json` → `@jumpchoice/server`
- `packages/shared/package.json` → `@jumpchoice/shared`

**Split Generation Routes:**
- `packages/server/src/routes/generation/validation.routes.ts` - Request validation
- `packages/server/src/routes/generation/provider.routes.ts` - Provider creation
- `packages/server/src/routes/generation/prompt.routes.ts` - Prompt assembly
- `packages/server/src/routes/generation/agents.routes.ts` - Agent pipeline
- `packages/server/src/routes/generation/streaming.routes.ts` - SSE streaming
- `packages/server/src/routes/generation/post-processing.routes.ts` - Post-processing
- `packages/server/src/routes/generate.routes.ts` - Orchestrator (refactored)

**Split Game Components:**
- `packages/client/src/components/game/GameSetup.tsx`
- `packages/client/src/components/game/GameNarration.tsx`
- `packages/client/src/components/game/GameParty.tsx`
- `packages/client/src/components/game/GameMap.tsx`
- `packages/client/src/components/game/GameCombat.tsx`
- `packages/client/src/components/game/GameJournal.tsx`
- `packages/client/src/components/game/GameStats.tsx`
- `packages/client/src/components/game/GameSurface.tsx` (refactored orchestrator)

**Split Game Routes:**
- `packages/server/src/routes/game/sessions.routes.ts`
- `packages/server/src/routes/game/combat.routes.ts`
- `packages/server/src/routes/game/maps.routes.ts`
- `packages/server/src/routes/game/encounters.routes.ts`
- `packages/server/src/routes/game/progression.routes.ts`
- `packages/server/src/routes/game.routes.ts` (refactored orchestrator)

**Split Chat Settings:**
- `packages/client/src/components/chat/CharacterSettings.tsx`
- `packages/client/src/components/chat/ConnectionSettings.tsx`
- `packages/client/src/components/chat/PromptSettings.tsx`
- `packages/client/src/components/chat/AgentSettings.tsx`
- `packages/client/src/components/chat/AdvancedSettings.tsx`
- `packages/client/src/components/chat/ChatSettingsDrawer.tsx` (refactored orchestrator)

**Narrative Engine:**
- `packages/shared/src/types/narrative.ts` - Narrative types and interfaces
- `packages/shared/src/constants/narrative-principles.ts` - Core principles
- `packages/shared/src/constants/narrator-personas.ts` - Vex-style personas
- `packages/server/src/services/narrative/narrative-engine.ts` - Core engine
- `packages/server/src/services/narrative/persona-manager.ts` - Persona management
- `packages/server/src/services/narrative/cot-system.ts` - Chain of thought

**Tests:**
- `packages/server/tests/generation.test.ts`
- `packages/server/tests/narrative.test.ts`
- `packages/client/tests/GameSurface.test.tsx`

---

## Task 1: Project Setup and Renaming

**Files:**
- Modify: `package.json`
- Modify: `packages/client/package.json`
- Modify: `packages/server/package.json`
- Modify: `packages/shared/package.json`
- Modify: `README.md`
- Modify: `DESIGN.md`
- Delete: `MarinaraLauncher.exe`

- [ ] **Step 1: Update root package.json**

```json
{
  "name": "jumpchoice",
  "version": "0.1.0",
  "private": true,
  "description": "AI Chat & Roleplay Platform for Jumpchain and CYOA",
  "author": "JumpChoice Team",
  "license": "AGPL-3.0",
  "type": "module",
  "packageManager": "pnpm@10.33.2",
  "engines": {
    "node": ">=24 <26",
    "pnpm": ">=10.33.2"
  },
  "scripts": {
    "dev": "pnpm build:shared && pnpm --filter @jumpchoice/server --filter @jumpchoice/client -r --parallel run dev",
    "dev:server": "pnpm --filter @jumpchoice/server dev",
    "dev:client": "pnpm build:shared && pnpm --filter @jumpchoice/client dev",
    "build": "pnpm --filter @jumpchoice/shared build && pnpm --filter @jumpchoice/server --filter @jumpchoice/client --parallel run build",
    "build:shared": "pnpm --filter @jumpchoice/shared build",
    "build:server": "pnpm --filter @jumpchoice/server build",
    "build:client": "pnpm build:shared && pnpm --filter @jumpchoice/client build",
    "check": "pnpm impeccable:check && pnpm lint && pnpm build",
    "start": "node packages/server/dist/index.js",
    "format": "prettier --write \"packages/**/*.{ts,tsx}\"",
    "impeccable:check": "node ./scripts/check-impeccable-context.mjs",
    "lint": "pnpm -r run lint",
    "test": "node ./scripts/check-windows-installer-layout.mjs && pnpm -r run test",
    "version:sync": "node ./scripts/sync-version.mjs",
    "version:check": "node ./scripts/check-version-drift.mjs",
    "clean": "pnpm -r --if-present run clean && node ./scripts/clean-workspace.mjs"
  }
}
```

- [ ] **Step 2: Update client package.json**

```json
{
  "name": "@jumpchoice/client",
  "version": "0.1.0",
  ...
}
```

- [ ] **Step 3: Update server package.json**

```json
{
  "name": "@jumpchoice/server",
  "version": "0.1.0",
  ...
}
```

- [ ] **Step 4: Update shared package.json**

```json
{
  "name": "@jumpchoice/shared",
  "version": "0.1.0",
  ...
}
```

- [ ] **Step 5: Update README.md**

Replace Marinara Engine branding with JumpChoice:

```markdown
# JumpChoice

AI Chat & Roleplay Platform specialized for Jumpchain and Make-Your-Choice CYOA experiences.

Forked from [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine) with a fork-then-diverge strategy.

## Features

- Jumpchain character building with point-buy mechanics and AI evaluation
- Make-Your-Choice CYOA with visual image parsing
- AI Game Master with hybrid narration + optional RPG mechanics
- Intelligent memory management for long-running campaigns
- Image generation and vision pipelines

## Quick Start

```bash
pnpm install
pnpm dev
```

Visit http://localhost:5173

## Documentation

- [Roadmap](ROADMAP.md)
- [Architecture](docs/jumpchoice/ARCHITECTURE.md)
- [Module Specs](docs/jumpchoice/MODULES.md)
```

- [ ] **Step 6: Update DESIGN.md**

Replace "Marinara Engine" with "JumpChoice" throughout. Update color scheme if desired (keep for now).

- [ ] **Step 7: Delete MarinaraLauncher.exe**

```bash
rm MarinaraLauncher.exe
git add -u
git commit -m "chore: remove Marinara launcher binary"
```

- [ ] **Step 8: Commit renaming**

```bash
git add .
git commit -m "feat: rename to JumpChoice and update branding"
```

---

## Task 2: Add Test Infrastructure

**Files:**
- Create: `vitest.config.ts`
- Create: `packages/server/vitest.config.ts`
- Create: `packages/client/vitest.config.ts`
- Modify: `package.json` (add test scripts)
- Modify: `packages/server/package.json`
- Modify: `packages/client/package.json`

- [ ] **Step 1: Install vitest**

```bash
pnpm add -Dw vitest @vitest/ui
pnpm add -D @testing-library/react @testing-library/jest-dom jsdom --filter @jumpchoice/client
```

- [ ] **Step 2: Create root vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

- [ ] **Step 3: Create server vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['dist/**', 'tests/**'],
    },
  },
});
```

- [ ] **Step 4: Create client vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['dist/**', 'tests/**'],
    },
  },
});
```

- [ ] **Step 5: Create client test setup**

```typescript
// packages/client/tests/setup.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 6: Update package.json scripts**

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

- [ ] **Step 7: Update server package.json**

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

- [ ] **Step 8: Update client package.json**

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

- [ ] **Step 9: Create placeholder test**

```typescript
// packages/server/tests/placeholder.test.ts
import { describe, it, expect } from 'vitest';

describe('Test Infrastructure', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 10: Run tests**

```bash
pnpm test
```

Expected: Tests pass

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat: add vitest test infrastructure"
```

---

## Task 3: Split generate.routes.ts (Part 1 - Validation & Provider)

**Files:**
- Create: `packages/server/src/routes/generation/validation.routes.ts`
- Create: `packages/server/src/routes/generation/provider.routes.ts`
- Modify: `packages/server/src/routes/generate.routes.ts`

- [ ] **Step 1: Analyze generate.routes.ts**

Read the file and identify sections for:
- Request validation (lines ~1-500)
- Provider creation (lines ~500-1500)

Document the key functions and their responsibilities.

- [ ] **Step 2: Create validation.routes.ts**

```typescript
// packages/server/src/routes/generation/validation.routes.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { logger } from '../../lib/logger.js';

const GenerateRequestSchema = z.object({
  chatId: z.string().uuid(),
  message: z.string().min(1),
  // ... other fields
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export async function validateGenerateRequest(
  request: unknown
): Promise<GenerateRequest> {
  const result = GenerateRequestSchema.safeParse(request);
  
  if (!result.success) {
    logger.error({ errors: result.error.errors }, 'Invalid generate request');
    throw new Error('Invalid request parameters');
  }
  
  return result.data;
}

export async function validationRoutes(fastify: FastifyInstance) {
  // Export validation utilities
  fastify.decorate('validateGenerateRequest', validateGenerateRequest);
}
```

- [ ] **Step 3: Create provider.routes.ts**

```typescript
// packages/server/src/routes/generation/provider.routes.ts
import { FastifyInstance } from 'fastify';
import { createLLMProvider } from '../../services/llm/provider-registry.js';
import { logger } from '../../lib/logger.js';

export interface ProviderContext {
  provider: any; // TODO: Type properly
  model: string;
}

export async function createProviderContext(
  connectionId: string,
  model: string
): Promise<ProviderContext> {
  logger.debug({ connectionId, model }, 'Creating provider context');
  
  const provider = await createLLMProvider(connectionId);
  
  return {
    provider,
    model,
  };
}

export async function providerRoutes(fastify: FastifyInstance) {
  fastify.decorate('createProviderContext', createProviderContext);
}
```

- [ ] **Step 4: Update generate.routes.ts to import new modules**

```typescript
// packages/server/src/routes/generate.routes.ts
import { validationRoutes, validateGenerateRequest } from './generation/validation.routes.js';
import { providerRoutes, createProviderContext } from './generation/provider.routes.js';

// Register sub-routes
await fastify.register(validationRoutes);
await fastify.register(providerRoutes);

// Use imported functions
const request = await validateGenerateRequest(request.body);
const context = await createProviderContext(request.connectionId, request.model);
```

- [ ] **Step 5: Test that generation still works**

```bash
pnpm dev
```

Manually test: Create a chat, send a message, verify response streams correctly.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "refactor: split generate.routes.ts - validation and provider"
```

---

## Task 4: Split generate.routes.ts (Part 2 - Prompt & Agents)

**Files:**
- Create: `packages/server/src/routes/generation/prompt.routes.ts`
- Create: `packages/server/src/routes/generation/agents.routes.ts`
- Modify: `packages/server/src/routes/generate.routes.ts`

- [ ] **Step 1: Analyze remaining sections**

Identify sections for:
- Prompt assembly (lines ~1500-4000)
- Agent pipeline (lines ~4000-7000)

- [ ] **Step 2: Create prompt.routes.ts**

```typescript
// packages/server/src/routes/generation/prompt.routes.ts
import { FastifyInstance } from 'fastify';
import { logger } from '../../lib/logger.js';

export interface PromptContext {
  systemPrompt: string;
  messages: any[]; // TODO: Type properly
  lorebookEntries: any[];
}

export async function assemblePrompt(
  chatId: string,
  userMessage: string,
  // ... other params
): Promise<PromptContext> {
  logger.debug({ chatId }, 'Assembling prompt');
  
  // Extract prompt assembly logic from generate.routes.ts
  // ...
  
  return {
    systemPrompt: '',
    messages: [],
    lorebookEntries: [],
  };
}

export async function promptRoutes(fastify: FastifyInstance) {
  fastify.decorate('assemblePrompt', assemblePrompt);
}
```

- [ ] **Step 3: Create agents.routes.ts**

```typescript
// packages/server/src/routes/generation/agents.routes.ts
import { FastifyInstance } from 'fastify';
import { logger } from '../../lib/logger.js';

export interface AgentPipelineResult {
  preGeneration: any;
  parallel: any;
  postProcessing: any;
}

export async function runAgentPipeline(
  chatId: string,
  prompt: string,
  // ... other params
): Promise<AgentPipelineResult> {
  logger.debug({ chatId }, 'Running agent pipeline');
  
  // Extract agent pipeline logic from generate.routes.ts
  // ...
  
  return {
    preGeneration: {},
    parallel: {},
    postProcessing: {},
  };
}

export async function agentsRoutes(fastify: FastifyInstance) {
  fastify.decorate('runAgentPipeline', runAgentPipeline);
}
```

- [ ] **Step 4: Update generate.routes.ts**

Import and use the new modules.

- [ ] **Step 5: Test generation**

Manually test generation with agents enabled.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "refactor: split generate.routes.ts - prompt and agents"
```

---

## Task 5: Split generate.routes.ts (Part 3 - Streaming & Post-Processing)

**Files:**
- Create: `packages/server/src/routes/generation/streaming.routes.ts`
- Create: `packages/server/src/routes/generation/post-processing.routes.ts`
- Modify: `packages/server/src/routes/generate.routes.ts`

- [ ] **Step 1: Create streaming.routes.ts**

```typescript
// packages/server/src/routes/generation/streaming.routes.ts
import { FastifyInstance, FastifyReply } from 'fastify';
import { logger } from '../../lib/logger.js';

export async function streamResponse(
  reply: FastifyReply,
  provider: any,
  prompt: string,
  // ... other params
): Promise<void> {
  logger.debug('Starting SSE stream');
  
  // Extract SSE streaming logic from generate.routes.ts
  // ...
}

export async function streamingRoutes(fastify: FastifyInstance) {
  fastify.decorate('streamResponse', streamResponse);
}
```

- [ ] **Step 2: Create post-processing.routes.ts**

```typescript
// packages/server/src/routes/generation/post-processing.routes.ts
import { FastifyInstance } from 'fastify';
import { logger } from '../../lib/logger.js';

export interface PostProcessingResult {
  processedText: string;
  gameState: any;
  hapticCommands: any[];
}

export async function runPostProcessing(
  chatId: string,
  generatedText: string,
  // ... other params
): Promise<PostProcessingResult> {
  logger.debug({ chatId }, 'Running post-processing');
  
  // Extract post-processing logic (regex, game state, haptics, etc.)
  // ...
  
  return {
    processedText: generatedText,
    gameState: null,
    hapticCommands: [],
  };
}

export async function postProcessingRoutes(fastify: FastifyInstance) {
  fastify.decorate('runPostProcessing', runPostProcessing);
}
```

- [ ] **Step 3: Refactor generate.routes.ts as orchestrator**

```typescript
// packages/server/src/routes/generate.routes.ts
import { FastifyInstance } from 'fastify';
import { validationRoutes } from './generation/validation.routes.js';
import { providerRoutes } from './generation/provider.routes.js';
import { promptRoutes } from './generation/prompt.routes.js';
import { agentsRoutes } from './generation/agents.routes.js';
import { streamingRoutes } from './generation/streaming.routes.js';
import { postProcessingRoutes } from './generation/post-processing.routes.js';

export async function generateRoutes(fastify: FastifyInstance) {
  // Register sub-routes
  await fastify.register(validationRoutes);
  await fastify.register(providerRoutes);
  await fastify.register(promptRoutes);
  await fastify.register(agentsRoutes);
  await fastify.register(streamingRoutes);
  await fastify.register(postProcessingRoutes);
  
  // Main generation endpoint
  fastify.post('/api/generate', async (request, reply) => {
    // Orchestrate the pipeline
    const validatedRequest = await fastify.validateGenerateRequest(request.body);
    const providerContext = await fastify.createProviderContext(/* ... */);
    const promptContext = await fastify.assemblePrompt(/* ... */);
    const agentResults = await fastify.runAgentPipeline(/* ... */);
    
    await fastify.streamResponse(reply, providerContext.provider, /* ... */);
    
    const postProcessed = await fastify.runPostProcessing(/* ... */);
    
    return postProcessed;
  });
}
```

- [ ] **Step 4: Test full generation pipeline**

Manually test with various configurations.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "refactor: complete generate.routes.ts split"
```

---

## Task 6-10: [Continue with remaining splits and narrative engine implementation...]

(Due to length, I'll continue with the narrative engine tasks. The remaining splits follow the same pattern.)

---

## Task 11: Implement Narrative Engine Core

**Files:**
- Create: `packages/shared/src/types/narrative.ts`
- Create: `packages/shared/src/constants/narrative-principles.ts`
- Create: `packages/server/src/services/narrative/narrative-engine.ts`
- Create: `packages/server/tests/narrative.test.ts`

- [ ] **Step 1: Write failing test for narrative principles**

```typescript
// packages/server/tests/narrative.test.ts
import { describe, it, expect } from 'vitest';
import { NarrativeEngine } from '../src/services/narrative/narrative-engine.js';
import { NarrativePrinciples } from '@jumpchoice/shared';

describe('NarrativeEngine', () => {
  it('should enforce anti-assistant bias', () => {
    const engine = new NarrativeEngine();
    const principles = engine.getPrinciples();
    
    expect(principles.antiAssistantBias).toBe(true);
    expect(principles.description).toContain('not a helpful assistant');
  });
  
  it('should enforce knowledge firewall', () => {
    const engine = new NarrativeEngine();
    const principles = engine.getPrinciples();
    
    expect(principles.knowledgeFirewall).toBe(true);
    expect(principles.description).toContain('NPCs only know');
  });
  
  it('should preserve user agency', () => {
    const engine = new NarrativeEngine();
    const principles = engine.getPrinciples();
    
    expect(principles.userAgency).toBe(true);
    expect(principles.description).toContain('never decide user');
  });
  
  it('should enforce NPC autonomy', () => {
    const engine = new NarrativeEngine();
    const principles = engine.getPrinciples();
    
    expect(principles.npcAutonomy).toBe(true);
    expect(principles.description).toContain('NPCs have their own');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test narrative
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create narrative types**

```typescript
// packages/shared/src/types/narrative.ts
export interface NarrativePrinciples {
  antiAssistantBias: boolean;
  knowledgeFirewall: boolean;
  userAgency: boolean;
  npcAutonomy: boolean;
  culturalAnchoring: boolean;
  narrativeDrive: boolean;
  moralComplexity: boolean;
  description: string;
}

export interface NarratorPersona {
  id: string;
  name: string;
  description: string;
  prompt: string;
  style: {
    prose: string;
    dialogue: string;
    tone: string;
  };
}

export interface ChainOfThoughtMode {
  id: string;
  name: string;
  description: string;
  phases: string[];
}
```

- [ ] **Step 4: Create narrative principles**

```typescript
// packages/shared/src/constants/narrative-principles.ts
import { NarrativePrinciples } from '../types/narrative.js';

export const DEFAULT_NARRATIVE_PRINCIPLES: NarrativePrinciples = {
  antiAssistantBias: true,
  knowledgeFirewall: true,
  userAgency: true,
  npcAutonomy: true,
  culturalAnchoring: true,
  narrativeDrive: true,
  moralComplexity: true,
  description: `You are a narrator and world simulator, not a helpful assistant.

ANTI-ASSISTANT BIAS:
- NPCs fight back, misinterpret, hold grudges, get tired, leave conversations
- Forgiveness is a process requiring scenes, not just apologies
- The world does not revolve around the user character

KNOWLEDGE FIREWALL:
- NPCs only know what they've observed or been told
- User's internal thoughts/narration are invisible to NPCs unless expressed externally
- Information travels through dialogue, observation, documents, rumors
- Prevents mind-reading and omniscient NPCs

USER AGENCY:
- Never decide user's actions, dialogue, thoughts, or voluntary choices
- The world can act ON the user, but not DECIDE for the user
- User character belongs to the user; NPCs belong to the AI

NPC AUTONOMY:
- NPCs have their own motives, limits, knowledge, and lives
- They disagree, leave, lie, fail, misunderstand, pursue their own goals
- They act before the user asks when it makes sense
- Prevents passive wish-fulfillment loops

CULTURAL ANCHORING:
- Use real brand names, artist names, platforms, headlines, memes (when setting-appropriate)
- No "the popular social media app" or "a famous pop song"
- Real-world texture makes settings feel lived-in

NARRATIVE DRIVE:
- Do not stop and wait for user; drive the story forward
- Derive plot when scenes feel dry or stagnant
- Maintain pacing and momentum

MORAL COMPLEXITY:
- No archetypes; people are morally grey
- No clear good/evil; motivations are complex
- Consequences have weight and persistence`,
};
```

- [ ] **Step 5: Create narrative engine**

```typescript
// packages/server/src/services/narrative/narrative-engine.ts
import { NarrativePrinciples, NarratorPersona, ChainOfThoughtMode } from '@jumpchoice/shared';
import { DEFAULT_NARRATIVE_PRINCIPLES } from '@jumpchoice/shared/constants/narrative-principles';

export class NarrativeEngine {
  private principles: NarrativePrinciples;
  private persona: NarratorPersona | null = null;
  private cotMode: ChainOfThoughtMode | null = null;
  
  constructor(principles?: Partial<NarrativePrinciples>) {
    this.principles = {
      ...DEFAULT_NARRATIVE_PRINCIPLES,
      ...principles,
    };
  }
  
  getPrinciples(): NarrativePrinciples {
    return this.principles;
  }
  
  setPersona(persona: NarratorPersona): void {
    this.persona = persona;
  }
  
  getPersona(): NarratorPersona | null {
    return this.persona;
  }
  
  setCOTMode(mode: ChainOfThoughtMode): void {
    this.cotMode = mode;
  }
  
  getCOTMode(): ChainOfThoughtMode | null {
    return this.cotMode;
  }
  
  buildSystemPrompt(): string {
    let prompt = this.principles.description;
    
    if (this.persona) {
      prompt += `\n\nNARRATOR PERSONA:\n${this.persona.prompt}`;
    }
    
    if (this.cotMode) {
      prompt += `\n\nCHAIN OF THOUGHT:\n${this.buildCOTPrompt()}`;
    }
    
    return prompt;
  }
  
  private buildCOTPrompt(): string {
    if (!this.cotMode) return '';
    
    return `Before writing your response, think through these phases:
${this.cotMode.phases.map((phase, i) => `${i + 1}. ${phase}`).join('\n')}

Write your thinking in  tags, then your response.`;
  }
}
```

- [ ] **Step 6: Run tests**

```bash
pnpm test narrative
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: implement narrative engine core"
```

---

## Task 12-15: [Continue with narrator personas, CoT system, and integration...]

(Plan continues with remaining tasks following the same TDD pattern)

---

## Self-Review Checklist

After completing all tasks:

- [ ] All massive files split into focused modules (<1000 lines each)
- [ ] Test infrastructure working
- [ ] Narrative engine core implemented
- [ ] Narrator persona system working
- [ ] CoT system working
- [ ] All tests passing
- [ ] Documentation updated
- [ ] No regressions in existing functionality
