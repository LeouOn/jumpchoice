# Language Learning Mode — Design Spec

**Date:** 2026-06-10
**Status:** Approved
**Scope:** Full feature — new chat mode, SRS, agents, vocab tracking, corrections, sidebar UI

---

## 1. Overview

A new chat mode in JumpChoice that turns the AI conversation platform into a language learning conversation partner. The user chats in any target language. AI agents extract vocabulary, correct grammar, and track learning progress via FSRS spaced repetition. A sidebar shows corrections, vocabulary, and SRS review sessions.

**Designed for extensibility:** The SRS tracking and agent-driven learning pipeline is domain-agnostic. While this spec targets language learning, the same architecture can later support other learning domains (e.g., programming concepts, medical terminology, musical theory).

## 2. Architecture

**Pattern:** Hybrid — Agents for AI work, Services for data work.

```
Chat UI (language_learning mode)
  ├── Main Chat Area (AI in target language)
  └── Sidebar
      ├── CorrectionPanel (grammar errors from current chat)
      ├── VocabSidebar (new/learning/known words)
      └── ReviewSession (SRS flashcard review)
              │
              ▼
Agent Pipeline (3-phase, existing system)
  PRE-GEN:
    - proficiency-estimator (estimates user CEFR level every N turns)
  POST-GEN (parallel):
    - word-extractor (extracts vocab from AI response)
    - grammar-corrector (analyzes user's message for errors)
  POST-GEN (sequential, after above):
    - srs-updater (grades touched items, calls SrsScheduler)
              │
              ▼
Service Layer (pure, no LLM)
  - SrsScheduler (FSRS-5 algorithm)
  - VocabularyService (DB CRUD)
  - ProficiencyService (level tracking + snapshots)
  - CorrectionService (persist errors)
              │
              ▼
Database (6 new Drizzle tables)
  - languages, vocabulary, srs_state, srs_reviews, corrections, proficiency_snapshots
```

### Principles
- Agents handle LLM-dependent work (extraction, correction analysis, proficiency estimation)
- Services handle deterministic work (FSRS math, DB persistence) — pure, testable
- Vocabulary is global per target language (not per-chat)
- Each agent is independently configurable and disableable
- SRS algorithm is a self-contained module with no external dependencies beyond DB

## 3. Chat Mode

### Mode Definition

Add `"language_learning"` to the `chats.mode` enum (currently: `conversation`, `roleplay`, `visual_novel`, `game`).

New fields on the chat (stored in `chats` table JSON or a join table):

```ts
interface LanguageLearningConfig {
  targetLanguage: string   // e.g., "Japanese", "Spanish"
  languageCode: string     // ISO 639-1, e.g., "ja", "es"
  nativeLanguage: string   // defaults to "English"
  tutorPersona: TutorPersona
}

type TutorPersona = "default" | "strict" | "encouraging" | "immersive"
```

### Tutor Persona Behavior

| Persona | Vocabulary Level | Corrections | Code-switching |
|---------|-----------------|-------------|----------------|
| **default** | Matches user level | Sidebar, after each turn | Allowed |
| **strict** | Slightly above user level | Inline, immediate | Forbidden |
| **encouraging** | At user level | Gentle, delayed | Forgiven |
| **immersive** | Pushed above user level | Only on request | AI stays in target |

### Narrative Principles (Override for LL Mode)

When `chat.mode === "language_learning"`, the narrative engine applies these principles instead of the roleplay set:

1. **Pedagogical bias over narrative drive** — teach, don't perform
2. **User comprehension is primary** — adjust complexity for understanding
3. **Natural conversational pace** — don't lecture
4. **Gentle correction over harshness** — explain *why*, not just *what*
5. **Cultural context when relevant** — idioms, pragmatics, not just grammar

### Prompt Builder

New `language-learning-prompt-builder.ts` in `packages/server/src/services/generation/`. Extends the conversation prompt builder with:

- Target language instruction
- Proficiency level context (injected by `proficiency-estimator` agent)
- Known vocabulary context (recently encountered words to reinforce)
- Tutor persona instructions
- Language learning narrative principles override

## 4. Agents

Four new agents. Each follows the existing `agentConfigs` schema and runs as a pipeline stage in `generation-loop.ts`.

### 4.1 `proficiency-estimator` (pre-gen)

- **Trigger:** Every N turns (configurable, default 5)
- **Input:** Last N user messages + recent corrections from `corrections` table
- **Output:** Estimated CEFR level (A1, A2, B1, B2, C1, C2) with confidence score
- **Effect:** Updates `languages.proficiencyLevel` and `languages.proficiencyConfidence`; injects level into prompt context for subsequent turns
- **LLM call:** Yes — uses the chat's configured connection
- **Fallback:** If LLM call fails, retains last estimated level

### 4.2 `word-extractor` (post-gen, parallel)

- **Trigger:** Every turn
- **Input:** Last AI response (in target language) + user's known vocabulary list
- **Output:** Array of extracted items:
  ```ts
  interface ExtractedVocab {
    lemma: string          // canonical form
    surface: string        // as it appeared in text
    type: "word" | "phrase"
    translation: string    // in user's native language
    contextSentence: string // the sentence it appeared in
    tags: string[]         // e.g., ["greeting", "formal"]
  }
  ```
- **Effect:** Calls `VocabularyService.findOrCreate()` for each item; marks re-encounters
- **LLM call:** Yes — structured output via function calling or JSON mode

### 4.3 `grammar-corrector` (post-gen, parallel with extractor)

- **Trigger:** Every turn
- **Input:** Last user message + target language + tutor persona
- **Output:** Array of corrections:
  ```ts
  interface Correction {
    original: string      // what the user wrote
    corrected: string     // the fix
    explanation: string   // why it's wrong
    severity: "minor" | "major"
  }
  ```
- **Effect:** Persists to `corrections` table; sidebar panel updates in real-time
- **LLM call:** Yes — structured output

### 4.4 `srs-updater` (post-gen, runs after extractor + corrector)

- **Trigger:** Every turn, after word-extractor and grammar-corrector complete
- **Input:** List of vocabulary items the user attempted/encountered this turn + correction results
- **Logic:**
  - If user used a word correctly → grade `Good` or `Easy` (based on context)
  - If user made an error with a word → grade `Again` or `Hard`
  - New words encountered in AI response → grade `New` (creates initial SRS state)
- **Effect:** Calls `SrsScheduler.schedule()` for each graded item
- **LLM call:** No — pure logic based on correction results

### Agent Configuration

All four agents are registered as `agentConfigs` entries. Users can:
- Enable/disable each independently
- Configure the proficiency estimator frequency
- Adjust extraction aggressiveness (how many words to extract per turn)
- Set correction strictness thresholds

## 5. Service Layer

### 5.1 `SrsScheduler` (FSRS-5 Implementation)

Self-contained module at `packages/server/src/services/learning/srs-scheduler.ts`.

```ts
type Grade = 1 | 2 | 3 | 4  // Again, Hard, Good, Easy

interface SrsState {
  stability: number       // memory stability (days)
  difficulty: number      // intrinsic difficulty [1-10]
  lastReview: Date
  nextDue: Date
  reps: number
  lapses: number
}

interface SrsUpdate {
  state: SrsState
  interval: number        // days until next review
  scheduledDate: Date
}

class SrsScheduler {
  // Core FSRS-5 algorithm
  static review(state: SrsState, grade: Grade, now?: Date): SrsUpdate

  // Create initial state for a new item
  static initialize(grade?: Grade, now?: Date): SrsState

  // Get items due for review
  static reviewQueue(
    userId: string,
    languageCode: string,
    limit: number,
    now?: Date
  ): Promise<ReviewQueueItem[]>

  // Get stats
  static stats(userId: string, languageCode: string): Promise<SrsStats>
}
```

**FSRS-5 parameters** (defaults, user-customizable):
- `requestRetention`: 0.9 (target 90% recall)
- `maximumInterval`: 365 (cap at 1 year)
- `easyBonus`: 1.3
- `hardInterval`: 1.2

**Testability:** Pure function. Input = (state, grade, now) → output = (updated state, interval, scheduled date). Deterministic. Requires ~30 unit tests covering: new items, grade progression, lapse recovery, interval capping, edge cases.

### 5.2 `VocabularyService`

```ts
class VocabularyService {
  static add(item: NewVocabulary): Promise<Vocabulary>
  static findOrCreate(lemma: string, language: string, userId: string, context: string): Promise<Vocabulary>
  static markEncountered(id: string, chatId: string): Promise<void>
  static listByLanguage(userId: string, languageCode: string, filters?: VocabFilters): Promise<Vocabulary[]>
  static stats(userId: string, languageCode: string): Promise<VocabStats>
}

interface VocabFilters {
  status?: "new" | "learning" | "known"
  tags?: string[]
  search?: string
  limit?: number
  offset?: number
}

interface VocabStats {
  total: number
  new: number
  learning: number
  known: number
  dueToday: number
  retentionRate: number
}
```

### 5.3 `ProficiencyService`

```ts
class ProficiencyService {
  static getLevel(userId: string, languageCode: string): Promise<ProficiencyLevel>
  static setLevel(userId: string, languageCode: string, level: CefrLevel, source: "user_set" | "ai_estimated" | "hybrid"): Promise<void>
  static getHistory(userId: string, languageCode: string): Promise<ProficiencySnapshot[]>
  static getActiveLanguages(userId: string): Promise<LanguageConfig[]>
}
```

### 5.4 `CorrectionService`

```ts
class CorrectionService {
  static add(correction: NewCorrection): Promise<Correction>
  static getByChat(chatId: string, filters?: CorrectionFilters): Promise<Correction[]>
  static getRecent(userId: string, languageCode: string, limit?: number): Promise<Correction[]>
  static dismiss(id: string): Promise<void>
  static stats(userId: string, languageCode: string): Promise<CorrectionStats>
}
```

## 6. Database Schema

Six new Drizzle tables. All follow existing JumpChoice conventions: `text` IDs, SQLite-compatible types, JSON columns for arrays, integer timestamps.

### `languages` — User's target languages

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | UUID |
| `userId` | text | FK to users (or app-level) |
| `name` | text | Display name, e.g., "Japanese" |
| `code` | text | ISO 639-1, e.g., "ja" |
| `nativeLanguage` | text | User's native language, default "English" |
| `proficiencyLevel` | text nullable | CEFR level: A1, A2, B1, B2, C1, C2 |
| `proficiencyConfidence` | real nullable | 0-1 confidence in level estimate |
| `tutorPersona` | text | default: "default" |
| `createdAt` | integer | Unix timestamp |

Unique constraint: `(userId, code)`

### `vocabulary` — Words and phrases

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | UUID |
| `userId` | text | Owner |
| `languageCode` | text | ISO 639-1 |
| `lemma` | text | Canonical form |
| `surface` | text | As originally encountered |
| `type` | text | "word" or "phrase" |
| `translation` | text | In user's native language |
| `contextSentence` | text | Sentence where it was encountered |
| `sourceChatId` | text nullable | Chat where first encountered |
| `tags` | text | JSON array of strings |
| `createdAt` | integer | Unix timestamp |

Unique constraint: `(userId, languageCode, lemma, type)`

### `srs_state` — FSRS state per vocabulary item

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | UUID |
| `vocabularyId` | text FK | References vocabulary.id |
| `stability` | real | Memory stability in days |
| `difficulty` | real | Intrinsic difficulty [1-10] |
| `lastReview` | integer nullable | Unix timestamp |
| `nextDue` | integer | Unix timestamp |
| `reps` | integer | Number of successful reviews |
| `lapses` | integer | Number of failed reviews |
| `suspended` | text | "true" or "false" (SQLite bool), default "false" |

Unique constraint: `(vocabularyId)`

### `srs_reviews` — Review history

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | UUID |
| `vocabularyId` | text FK | References vocabulary.id |
| `grade` | integer | 1=Again, 2=Hard, 3=Good, 4=Easy |
| `reviewedAt` | integer | Unix timestamp |
| `interval` | real | Days until next review |
| `stabilityAfter` | real | Stability after this review |

### `corrections` — Grammar errors

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | UUID |
| `userId` | text | Owner |
| `languageCode` | text | ISO 639-1 |
| `chatId` | text | Chat where error occurred |
| `messageId` | text nullable | Message where error occurred |
| `original` | text | What the user wrote |
| `corrected` | text | The fix |
| `explanation` | text | Why it's wrong |
| `severity` | text | "minor" or "major" |
| `dismissed` | text | "true" or "false" |
| `createdAt` | integer | Unix timestamp |

### `proficiency_snapshots` — Level estimates over time

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | UUID |
| `userId` | text | Owner |
| `languageCode` | text | ISO 639-1 |
| `level` | text | CEFR level |
| `confidence` | real | 0-1 |
| `estimatedAt` | integer | Unix timestamp |
| `source` | text | "user_set", "ai_estimated", or "hybrid" |

## 7. Client UI

New directory: `packages/client/src/components/language-learning/`

All components follow conventions in `packages/client/.instructions.md` (read that file first during implementation).

### 7.1 `VocabSidebar`

- **Location:** Right sidebar panel, visible when `chat.mode === "language_learning"`
- **Header:** Target language name + flag emoji + current CEFR level (with confidence bar)
- **Tabs:**
  - **New** — Words encountered this session, with context and translation
  - **Learning** — Words in SRS (active), with next review date
  - **Known** — Graduated words (SRS interval > threshold)
- **Word card:** Click to expand — shows lemma, translation, context sentence, tags, SRS status
- **Actions:** "Review now" (starts SRS review session), "Mark known" (skip SRS)
- **Footer stats:** Total words, due today, retention rate
- **State:** Uses existing Zustand store pattern + React Query for server data

### 7.2 `CorrectionPanel`

- **Location:** Sidebar section, above VocabSidebar
- **Shows:** Corrections from current chat, grouped by user message
- **Each correction:** `original` → `corrected` with `explanation` and severity badge
- **Actions:** Dismiss individual corrections
- **Filter:** By severity (minor/major)
- **Empty state:** "No corrections yet — keep chatting!" with encouraging tone

### 7.3 `ReviewSession`

- **Location:** Overlay/modal within the sidebar
- **Flow:** Shows due items one at a time, user reveals translation, then grades (Again/Hard/Good/Easy)
- **After grade:** Calls `SrsScheduler.review()`, updates UI
- **End:** Summary of session (items reviewed, grades distribution)
- **Trigger:** "Review now" button in VocabSidebar, or auto-prompt when items are due

### 7.4 Integration Points

- `useUIStore` — New panel type for language learning sidebar
- `useChatStore` — Extended with language learning config for active chat
- `useLearningStore` — New Zustand store for learning-specific state (vocab lists, corrections, review session state)
- `ChatSidebar` — New tab or section for language learning chats
- `ChatInput` — Optional target language indicator / toggle
- API routes under `/api/learning/*` — CRUD for vocab, corrections, reviews, proficiency

## 8. API Routes

New route group: `packages/server/src/routes/learning.routes.ts`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/learning/languages` | List user's target languages |
| POST | `/api/learning/languages` | Add a target language |
| PATCH | `/api/learning/languages/:id` | Update language config (persona, level) |
| DELETE | `/api/learning/languages/:id` | Remove a target language |
| GET | `/api/learning/vocab` | List vocabulary (with filters) |
| POST | `/api/learning/vocab` | Add vocabulary manually |
| PATCH | `/api/learning/vocab/:id` | Update vocab item |
| DELETE | `/api/learning/vocab/:id` | Delete vocab item |
| GET | `/api/learning/vocab/stats` | Vocab stats for a language |
| GET | `/api/learning/reviews/due` | Get due items for review |
| POST | `/api/learning/reviews` | Submit a review (grade) |
| GET | `/api/learning/corrections` | List corrections (with filters) |
| PATCH | `/api/learning/corrections/:id` | Dismiss a correction |
| GET | `/api/learning/proficiency/:languageCode` | Get proficiency level + history |

## 9. Testing

### Unit Tests (highest priority — SRS correctness is critical)

- `SrsScheduler` — ~30 tests covering:
  - New item initialization for each grade
  - Grade progression (Again → Hard → Good → Easy)
  - Lapse recovery (Good → Again → recovery path)
  - Interval capping at maximum
  - Stability/difficulty bounds
  - Deterministic output given same input
  - Edge cases: first review, long gaps, suspended items

### Integration Tests

- Agent pipeline: mock LLM → verify extraction output schema
- Agent pipeline: mock LLM → verify correction output schema
- Service + DB: round-trip tests (create vocab → schedule review → complete review → verify state)
- API routes: CRUD operations with in-memory DB

### E2E Test

Full flow: create language learning chat → send message → verify vocab extracted → verify SRS state created → run review session → verify SRS state updated

### Manual Verification Checklist

Per AGENTS.md — never auto-check:
- [ ] Manually verify chat works with target language in browser
- [ ] Manually verify vocab extraction across multiple languages
- [ ] Manually verify SRS review session surfaces correct items
- [ ] Manually verify corrections appear in sidebar panel
- [ ] Manually verify proficiency level updates after N turns
- [ ] Manually verify agent enable/disable in settings
- [ ] Manually verify review session flow (reveal → grade → next)

## 10. Extensibility

The architecture is designed to support learning domains beyond languages:

- `vocabulary.type` supports arbitrary types (not just "word"/"phrase")
- `languages` table could generalize to `learning_subjects`
- SRS algorithm is domain-agnostic
- Agent pipeline stages are pluggable per domain
- Tutor personas map to "instructor styles" in other domains

Future domains could reuse the entire SRS + agent pipeline by adding new extraction/correction agents and a new chat mode config, without touching the service layer.

## 11. File Map (New Files)

```
packages/shared/src/
  types/learning.ts              — Learning types, interfaces
  constants/learning-defaults.ts  — FSRS defaults, persona configs

packages/server/src/
  db/schema/learning.ts          — 6 new Drizzle table definitions
  services/learning/
    srs-scheduler.ts             — FSRS-5 algorithm (pure)
    vocabulary-service.ts        — Vocabulary CRUD
    proficiency-service.ts       — Level tracking
    correction-service.ts        — Error persistence
  services/generation/
    language-learning-prompt-builder.ts — Prompt assembly
  routes/learning.routes.ts      — API endpoints

packages/server/tests/
  srs-scheduler.test.ts          — FSRS unit tests (~30)
  learning-agents.test.ts        — Agent integration tests
  learning-services.test.ts      — Service round-trip tests
  learning-api.test.ts           — API route tests

packages/client/src/
  components/language-learning/
    VocabSidebar.tsx             — Vocab display + tabs
    CorrectionPanel.tsx          — Error display
    ReviewSession.tsx            — SRS flashcard review
    LearningChatSetup.tsx        — New LL chat configuration
  stores/learning.store.ts       — Zustand store for learning state
  hooks/use-learning.ts          — React hooks for learning API
```
