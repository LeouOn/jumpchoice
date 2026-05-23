# JumpChoice Module Specifications

Detailed specifications for each JumpChoice-specific module.

## Table of Contents

1. [Memory Module](#memory-module)
2. [Vision Module](#vision-module)
3. [Doc Parser Module](#doc-parser-module)
4. [Build Lab Module](#build-lab-module)
5. [Campaign Module](#campaign-module)
6. [GM Module](#gm-module)
7. [Image Generation Module](#image-generation-module)
8. [Writeup Module](#writeup-module)

---

## Memory Module

**Package:** `@jumpchoice/memory`  
**Phase:** 2 (Weeks 4-6)  
**Inspiration:** Megumin Suite V7 Memory Core

### Purpose

Replace Marinara's basic `memoryChunks` system with a 3-tier memory architecture that dramatically reduces token usage while maintaining continuity in long-running campaigns.

### Architecture

#### Tier 1: Working Memory
- **What:** Recent messages in the active context window
- **Behavior:** No change from current Marinara behavior
- **Size:** Configurable, typically last 20-50 messages

#### Tier 2: Short-Term Memory
- **What:** Auto-summarized chunks of older messages
- **Behavior:** Background LLM calls generate summaries of ~10 message groups
- **Storage:** `memory_summaries` table
- **Injection:** Summaries injected into prompt before generation
- **Trigger:** Automatic when messages age out of Tier 1

#### Tier 3: Long-Term Vault
- **What:** Oldest messages stored in vector database
- **Behavior:** TF-IDF keyword search + semantic embeddings for retrieval
- **Storage:** LanceDB with embeddings
- **Injection:** Only relevant memories injected based on current context
- **Trigger:** Automatic when summaries age out of Tier 2

#### Prompt Interceptor
- **What:** Strips archived messages from API payload
- **Behavior:** Messages stay in UI (greyed out) but aren't sent to model
- **Savings:** Massive token reduction (75%+ on 400+ message chats)

#### Regex Cleaner
- **What:** Strips noise before summarization
- **Behavior:** Removes HTML artifacts, formatting garbage, repeated phrases
- **Integration:** Runs before Tier 2 summarization

### Database Schema

```typescript
// packages/server/src/db/schema/memory.ts

export const memorySummaries = pgTable('memory_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').references(() => chats.id).notNull(),
  messageRange: jsonb('message_range').notNull(), // { start: number, end: number }
  summary: text('summary').notNull(),
  tokenCount: integer('token_count').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const memoryChunksV2 = pgTable('memory_chunks_v2', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').references(() => chats.id).notNull(),
  messageId: uuid('message_id').references(() => messages.id).notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 384 }), // jina-embeddings-v2-base-en
  metadata: jsonb('metadata'), // { speaker, timestamp, tags }
  tier: integer('tier').notNull(), // 2 or 3
  createdAt: timestamp('created_at').defaultNow(),
});

export const memoryConfig = pgTable('memory_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').references(() => chats.id).unique().notNull(),
  tier1Size: integer('tier1_size').default(30),
  tier2ChunkSize: integer('tier2_chunk_size').default(10),
  tier3Enabled: boolean('tier3_enabled').default(true),
  promptInterceptionEnabled: boolean('prompt_interception_enabled').default(true),
  embeddingModel: text('embedding_model').default('jina-embeddings-v2-base-en'),
});
```

### API Routes

```typescript
// packages/server/src/routes/memory.routes.ts

GET  /api/memory/:chatId/config          // Get memory config
PUT  /api/memory/:chatId/config          // Update memory config
GET  /api/memory/:chatId/summaries       // List summaries
GET  /api/memory/:chatId/vault           // Search vault (query param)
POST /api/memory/:chatId/rebuild         // Rebuild summaries
GET  /api/memory/:chatId/stats           // Token savings stats
```

### Integration Points

1. **Generation Pipeline:** Hook before prompt assembly to inject Tier 2/3 memories
2. **Message Storage:** Trigger Tier 2 summarization when messages age out
3. **UI:** Memory configuration panel in chat settings, greyed-out archived messages

### Agent Type

```typescript
// packages/shared/src/types/agent.ts

export type AgentType = 
  | ... // existing types
  | 'memory-retrieval';

// packages/shared/src/constants/agent-prompts.ts

export const agentPrompts = {
  'memory-retrieval': `You are a memory retrieval specialist. Given the current conversation context, identify which long-term memories are relevant and should be injected into the prompt. Focus on:
- Character relationships and history
- Important events and decisions
- Ongoing plot threads
- Location and setting details

Return a JSON array of memory IDs that should be included.`,
};
```

---

## Vision Module

**Package:** `@jumpchoice/vision`  
**Phase:** 3 (Weeks 7-9)

### Purpose

Accept image URLs or uploads, send to vision-capable models, and return structured analysis. Primarily for visual Make-Your-Choice CYOAs where choices are in images.

### Architecture

#### Input Methods
- **URL paste:** User pastes image URL
- **File upload:** User uploads image file
- **Clipboard paste:** User pastes from clipboard

#### Processing Pipeline
1. **Download/resize:** Fetch image, resize if needed (max 2048px)
2. **Vision model call:** Send to GPT-4V, Gemini Pro Vision, or configured model
3. **Analysis:** Extract text, choices, scene description, character details
4. **Structuring:** Convert to JSON based on analysis type

#### Analysis Types
- **General:** Freeform description of image content
- **CYOA choices:** Extract choice options with labels and descriptions
- **Character:** Extract character details (name, appearance, personality)
- **Scene:** Extract setting, mood, objects, actions

### API Routes

```typescript
// packages/server/src/routes/vision.routes.ts

POST /api/vision/analyze
  Body: { url?: string, file?: File, analysisType: 'general' | 'cyoa' | 'character' | 'scene' }
  Response: { analysis: object, rawText: string }

POST /api/vision/extract-choices
  Body: { url?: string, file?: File }
  Response: { choices: Array<{ label: string, text: string, imageUrl?: string }> }
```

### Database Schema

```typescript
// packages/server/src/db/schema/vision.ts

export const visionAnalyses = pgTable('vision_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').references(() => chats.id),
  imageUrl: text('image_url'),
  imageHash: text('image_hash'), // For deduplication
  analysisType: text('analysis_type').notNull(),
  result: jsonb('result').notNull(),
  model: text('model').notNull(),
  tokenUsage: jsonb('token_usage'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Integration Points

1. **Chat UI:** Sidebar panel for image input
2. **CYOA System:** Feed extracted choices into existing CYOA agent
3. **Character System:** Auto-populate character details from images
4. **GM Context:** Inject scene descriptions into GM prompt

---

## Doc Parser Module

**Package:** `@jumpchoice/doc-parser`  
**Phase:** 3 (Weeks 7-9)

### Purpose

Parse Jumpchain PDF/text documents into structured data: setting description, perks, drawbacks, companions, point costs, rules.

### Architecture

#### Input Methods
- **PDF upload:** User uploads jump document PDF
- **Text paste:** User pastes jump document text
- **URL:** Fetch from URL (if accessible)

#### Processing Pipeline
1. **PDF extraction:** Use `pdf-parse` library to extract text
2. **Section detection:** Identify major sections (setting, perks, drawbacks, etc.)
3. **LLM structuring:** Send sections to LLM with schema prompt
4. **Validation:** Check for required fields, point costs, etc.
5. **Storage:** Save structured `JumpDocument`

#### Output Schema

```typescript
// packages/shared/src/types/jump-document.ts

export interface JumpDocument {
  id: string;
  title: string;
  setting: string;
  description: string;
  pointBudget: number;
  perks: Perk[];
  drawbacks: Drawback[];
  companions: Companion[];
  rules: Rule[];
  metadata: {
    author?: string;
    source?: string;
    version?: string;
  };
}

export interface Perk {
  id: string;
  name: string;
  cost: number;
  description: string;
  category?: string;
  prerequisites?: string[];
  limitations?: string[];
}

export interface Drawback {
  id: string;
  name: string;
  value: number; // Points gained
  description: string;
  category?: string;
}

export interface Companion {
  id: string;
  name: string;
  cost: number;
  description: string;
  abilities?: string[];
}

export interface Rule {
  id: string;
  text: string;
  type: 'restriction' | 'clarification' | 'option';
}
```

### API Routes

```typescript
// packages/server/src/routes/doc-parser.routes.ts

POST /api/jumps/parse
  Body: { file?: File, text?: string, url?: string }
  Response: { document: JumpDocument, warnings: string[] }

GET  /api/jumps                    // List all jump documents
GET  /api/jumps/:id                // Get specific jump document
PUT  /api/jumps/:id                // Update jump document (manual edits)
DELETE /api/jumps/:id              // Delete jump document
```

### Database Schema

```typescript
// packages/server/src/db/schema/jumps.ts

export const jumpDocuments = pgTable('jump_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  setting: text('setting').notNull(),
  description: text('description').notNull(),
  pointBudget: integer('point_budget').notNull(),
  rawText: text('raw_text'),
  sourceUrl: text('source_url'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const jumpPerks = pgTable('jump_perks', {
  id: uuid('id').primaryKey().defaultRandom(),
  jumpId: uuid('jump_id').references(() => jumpDocuments.id).notNull(),
  name: text('name').notNull(),
  cost: integer('cost').notNull(),
  description: text('description').notNull(),
  category: text('category'),
  prerequisites: jsonb('prerequisites'),
  limitations: jsonb('limitations'),
});

export const jumpDrawbacks = pgTable('jump_drawbacks', {
  id: uuid('id').primaryKey().defaultRandom(),
  jumpId: uuid('jump_id').references(() => jumpDocuments.id).notNull(),
  name: text('name').notNull(),
  value: integer('value').notNull(),
  description: text('description').notNull(),
  category: text('category'),
});

export const jumpCompanions = pgTable('jump_companions', {
  id: uuid('id').primaryKey().defaultRandom(),
  jumpId: uuid('jump_id').references(() => jumpDocuments.id).notNull(),
  name: text('name').notNull(),
  cost: integer('cost').notNull(),
  description: text('description').notNull(),
  abilities: jsonb('abilities'),
});
```

### Integration Points

1. **Build Lab:** Perk/drawback browser for character building
2. **GM Module:** Inject jump context into GM prompt
3. **Campaign Module:** Associate jumps with campaign progression

---

## Build Lab Module

**Package:** `@jumpchoice/build-lab`  
**Phase:** 4 (Weeks 10-12)

### Purpose

Point-buy character building with rule validation and AI review. The core Jumpchain experience.

### Architecture

#### Point Tracker
- Tracks budget allocation across perks, drawbacks, companions
- Real-time validation against jump doc rules
- Visual budget display (spent, remaining, breakdown by category)

#### Rule Engine
- Checks for illegal combos
- Validates prerequisites
- Enforces point limits
- Checks category caps (e.g., max 300 points in drawbacks)
- Custom rules from jump document

#### AI Review
- Sends build + jump doc to LLM
- Analyzes synergy between perks
- Identifies weaknesses and blind spots
- Rates fun factor (1-10)
- Suggests improvements
- Compares to "meta" builds (if available)

#### Build Comparison
- Side-by-side comparison of alternate builds
- Diff view showing what changed
- Cost/benefit analysis

### API Routes

```typescript
// packages/server/src/routes/build-lab.routes.ts

POST /api/builds                   // Create new build
GET  /api/builds                   // List all builds
GET  /api/builds/:id               // Get specific build
PUT  /api/builds/:id               // Update build
DELETE /api/builds/:id             // Delete build

POST /api/builds/:id/validate      // Validate build against rules
POST /api/builds/:id/review        // Get AI review
GET  /api/builds/:id/comparison    // Compare with another build
POST /api/builds/:id/export        // Export build as JSON/text
```

### Database Schema

```typescript
// packages/server/src/db/schema/builds.ts

export const builds = pgTable('builds', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  jumpId: uuid('jump_id').references(() => jumpDocuments.id).notNull(),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  pointBudget: integer('point_budget').notNull(),
  pointsSpent: integer('points_spent').notNull(),
  pointsGained: integer('points_gained').notNull(), // From drawbacks
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const buildPerks = pgTable('build_perks', {
  id: uuid('id').primaryKey().defaultRandom(),
  buildId: uuid('build_id').references(() => builds.id).notNull(),
  perkId: uuid('perk_id').references(() => jumpPerks.id).notNull(),
  quantity: integer('quantity').default(1),
  notes: text('notes'),
});

export const buildDrawbacks = pgTable('build_drawbacks', {
  id: uuid('id').primaryKey().defaultRandom(),
  buildId: uuid('build_id').references(() => builds.id).notNull(),
  drawbackId: uuid('drawback_id').references(() => jumpDrawbacks.id).notNull(),
  notes: text('notes'),
});

export const buildCompanions = pgTable('build_companions', {
  id: uuid('id').primaryKey().defaultRandom(),
  buildId: uuid('build_id').references(() => builds.id).notNull(),
  companionId: uuid('companion_id').references(() => jumpCompanions.id).notNull(),
  notes: text('notes'),
});

export const buildReviews = pgTable('build_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  buildId: uuid('build_id').references(() => builds.id).notNull(),
  model: text('model').notNull(),
  synergyScore: integer('synergy_score'),
  funFactor: integer('fun_factor'),
  strengths: jsonb('strengths'),
  weaknesses: jsonb('weaknesses'),
  suggestions: jsonb('suggestions'),
  rawResponse: text('raw_response'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### UI Components

```typescript
// packages/client/src/components/build-lab/

BuildLabView.tsx          // Main build lab interface
BuildBudget.tsx           // Point budget display and tracker
PerkBrowser.tsx           // Browse and add perks from jump doc
DrawbackBrowser.tsx       // Browse and add drawbacks
CompanionBrowser.tsx      // Browse and add companions
BuildReview.tsx           // AI review display
BuildComparison.tsx       // Side-by-side comparison
BuildExport.tsx           // Export options
```

### Integration Points

1. **Doc Parser:** Perk/drawback data source
2. **Campaign Module:** Associate builds with campaign jumps
3. **GM Module:** Inject character abilities into GM context

---

## Campaign Module

**Package:** `@jumpchoice/campaign`  
**Phase:** 4 (Weeks 10-12)

### Purpose

Track progression through a chain of jumps. The "chain" in Jumpchain. Also supports non-jumpchain CYOA campaigns.

### Architecture

#### Chain Tracker
- Ordered list of completed/current jumps
- Each jump linked to its build
- Status tracking (planned, in-progress, completed)

#### Character Sheet
- Persistent character info across jumps
- Name, origin, appearance
- Accumulated perks/abilities from all jumps
- Active drawbacks

#### Progression Log
- What was gained/lost in each jump
- Key decisions and consequences
- Narrative summary

#### Make Your Choice Campaigns
- For non-jumpchain CYOA
- Tracks choices made and consequences
- Branching paths

### API Routes

```typescript
// packages/server/src/routes/campaign.routes.ts

POST /api/campaigns                // Create new campaign
GET  /api/campaigns                // List all campaigns
GET  /api/campaigns/:id            // Get specific campaign
PUT  /api/campaigns/:id            // Update campaign
DELETE /api/campaigns/:id          // Delete campaign

POST /api/campaigns/:id/jumps      // Add jump to campaign
PUT  /api/campaigns/:id/jumps/:jumpId  // Update jump status
DELETE /api/campaigns/:id/jumps/:jumpId  // Remove jump

GET  /api/campaigns/:id/character  // Get character sheet
PUT  /api/campaigns/:id/character  // Update character sheet

GET  /api/campaigns/:id/log        // Get progression log
POST /api/campaigns/:id/log        // Add log entry
```

### Database Schema

```typescript
// packages/server/src/db/schema/campaigns.ts

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'jumpchain' | 'cyoa'
  status: text('status').notNull(), // 'planned' | 'active' | 'completed'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const campaignJumps = pgTable('campaign_jumps', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => campaigns.id).notNull(),
  jumpId: uuid('jump_id').references(() => jumpDocuments.id).notNull(),
  buildId: uuid('build_id').references(() => builds.id),
  order: integer('order').notNull(),
  status: text('status').notNull(), // 'planned' | 'in-progress' | 'completed'
  chatId: uuid('chat_id').references(() => chats.id), // Associated chat
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
});

export const campaignCharacters = pgTable('campaign_characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => campaigns.id).unique().notNull(),
  name: text('name').notNull(),
  origin: text('origin'),
  appearance: text('appearance'),
  personality: text('personality'),
  accumulatedPerks: jsonb('accumulated_perks'),
  activeDrawbacks: jsonb('active_drawbacks'),
  metadata: jsonb('metadata'),
});

export const campaignLog = pgTable('campaign_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => campaigns.id).notNull(),
  jumpId: uuid('jump_id').references(() => campaignJumps.id),
  type: text('type').notNull(), // 'gain' | 'loss' | 'decision' | 'event'
  title: text('title').notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### UI Components

```typescript
// packages/client/src/components/campaign/

CampaignView.tsx          // Main campaign interface
CampaignTimeline.tsx      // Visual chain of jumps
JumpCard.tsx              // Individual jump card
CharacterSheet.tsx        // Persistent character info
ProgressionLog.tsx        // Timeline of gains/losses
CampaignStats.tsx         // Overall campaign statistics
```

### Integration Points

1. **Build Lab:** Link builds to campaign jumps
2. **GM Module:** Track current jump for GM context
3. **Memory Module:** Campaign-aware memory retrieval

---

## GM Module

**Package:** `@jumpchoice/gm`  
**Phase:** 5 (Weeks 13-15)

### Purpose

Hybrid AI narration + optional mechanical overlays for running jumps. Extends Marinara's existing Game Mode.

### Architecture

#### Narrator Engine
- Extends existing `secret-plot-driver` and `world-state` agents
- Jumpchain-aware prompts
- Knows about current jump's setting, perks, character abilities
- Maintains narrative consistency across sessions

#### Mechanics Overlay (Optional)
- Toggle-able dice rolls, stat checks, combat
- Uses Marinara's existing game mechanics as base
- Can be disabled for pure narration mode

#### Jump Context Injection
- Automatically injects relevant jump doc info
- Character build perks/abilities
- Campaign history and progression
- Active drawbacks and their narrative effects

#### Scene Management
- Tracks scenes within a jump
- Automatic world state updates
- Scene transitions and pacing

### Agent Types

```typescript
// packages/shared/src/types/agent.ts

export type AgentType = 
  | ... // existing types
  | 'jumpchain-gm'
  | 'build-context';

// packages/shared/src/constants/agent-prompts.ts

export const agentPrompts = {
  'jumpchain-gm': `You are the Game Master for a Jumpchain campaign. You have access to:
- The current jump document (setting, rules, NPCs)
- The character's build (perks, abilities, drawbacks)
- Campaign history (previous jumps, accumulated abilities)

Your role:
1. Narrate the story based on the jump setting
2. Control NPCs according to their motivations
3. Present challenges that test the character's abilities
4. Respect the character's perks and drawbacks
5. Maintain continuity with campaign history

Always consider how the character's abilities affect the narrative. A character with combat perks should have opportunities to use them. A character with social drawbacks should face consequences.`,

  'build-context': `Extract the character's relevant abilities, perks, and drawbacks that should influence this scene. Focus on:
- Combat abilities if in a fight
- Social skills if in dialogue
- Knowledge perks if investigating
- Drawbacks that might complicate things

Return a concise list that the GM can reference.`,
};
```

### API Routes

```typescript
// packages/server/src/routes/gm.routes.ts

POST /api/gm/:chatId/session/start    // Start GM session
POST /api/gm/:chatId/session/end      // End GM session
GET  /api/gm/:chatId/context          // Get current GM context
PUT  /api/gm/:chatId/mechanics        // Toggle mechanics overlay
POST /api/gm/:chatId/scene            // Advance to next scene
```

### Integration Points

1. **Campaign Module:** Current jump and progression
2. **Build Lab:** Character abilities and drawbacks
3. **Doc Parser:** Jump document context
4. **Memory Module:** Campaign-aware memory retrieval
5. **Existing Game Mode:** Reuse combat, dice, maps

---

## Image Generation Module

**Package:** `@jumpchoice/image-gen`  
**Phase:** 6 (Weeks 16-18)

### Purpose

Generate images from scene text. Two-stage pipeline: text → image prompt → image.

### Architecture

#### Stage 1: Prompt Generation
- LLM analyzes current scene
- Generates optimized image prompt
- Includes style, composition, characters, setting
- Configurable style presets (anime, realistic, painterly, etc.)

#### Stage 2: Image Generation
- Send prompt to image generation backend
- Supported: ComfyUI, Stability AI, Pollinations
- Async generation with progress tracking
- Gallery integration

#### Auto-Trigger
- Agent decides when moment is "picture-worthy"
- Configurable sensitivity
- Manual override available

### API Routes

```typescript
// packages/server/src/routes/image-gen.routes.ts

POST /api/image-gen/generate          // Generate image from scene
POST /api/image-gen/prompt            // Generate prompt only
GET  /api/image-gen/:chatId/gallery   // Get generated images
PUT  /api/image-gen/config            // Update image gen config
```

### Integration Points

1. **Generation Pipeline:** Trigger after response
2. **Gallery System:** Store generated images
3. **Agent System:** `illustrator` agent for auto-trigger

---

## Writeup Module

**Package:** Within `@jumpchoice/shared` or `@jumpchoice/server`  
**Phase:** 6 (Weeks 16-18)

### Purpose

Generate session summaries, jump recaps, and campaign chronicles.

### Architecture

#### Session Summary
- End-of-session LLM-generated recap
- Key events, decisions, outcomes
- Automatic or manual trigger

#### Jump Writeup
- Comprehensive summary of entire jump
- Character progression
- Major plot points
- Lessons learned

#### Campaign Chronicle
- Running narrative of full chain
- Epic story across jumps
- Exportable as markdown/PDF/HTML

### Agent Type

```typescript
export type AgentType = 
  | ... // existing types
  | 'writeup-generator';

export const agentPrompts = {
  'writeup-generator': `Generate a compelling summary of the session/jump/campaign. Include:
- Key events and turning points
- Character development
- Important decisions and consequences
- Memorable moments
- Setup for what's next

Write in an engaging narrative style that captures the tone of the session.`,
};
```

### API Routes

```typescript
// packages/server/src/routes/writeup.routes.ts

POST /api/writeup/session/:chatId     // Generate session summary
POST /api/writeup/jump/:jumpId        // Generate jump writeup
POST /api/writeup/campaign/:campaignId // Generate campaign chronicle
GET  /api/writeup/:id                 // Get writeup
GET  /api/writeup/:id/export          // Export writeup (md/pdf/html)
```

### Integration Points

1. **Session End:** Auto-generate summary
2. **Campaign Module:** Jump and campaign context
3. **Export System:** Multiple output formats

---

## Cross-Cutting Concerns

### Error Handling

All modules follow Marinara's patterns:
- Try/catch with structured error results
- Pino logging with error context
- User-friendly error messages
- Graceful degradation

### Testing Strategy

Each module includes:
- Unit tests for business logic
- Integration tests for API routes
- Mock data for jump documents, builds, etc.
- E2E tests for critical user flows

### Performance Targets

- Memory module: 75% token savings on 400+ message chats
- Vision module: <5s response time
- Build validation: <100ms
- Image generation: <30s (prompt + image)
- Doc parsing: <10s for typical jump document

### Security

- Sanitize all user inputs
- Validate uploaded files (PDF, images)
- Rate limit API calls to external services
- Secure vector DB access
- Encrypt sensitive data (API keys inherited from Marinara)
