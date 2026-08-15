# Narrative Engine

JumpChoice's narrative engine is the core system that shapes how the AI generates responses. It's designed to create immersive, character-driven storytelling that feels like collaborative fiction rather than assistant-like responses.

> **Status: staged module.** The engine, persona manager, COT manager, and
> context facade are ported and their contract is pinned by
> `pnpm regression:narrative-engine`, but they are **not yet wired into the
> generation pipeline**. Marinara's preset/section system owns live prompt
> assembly; where this engine should hook in (per-chat override, preset
> section, or global default) is an open product decision. Treat this document
> as the design reference for that future integration.

## Architecture

The narrative engine consists of four main components:

1. **NarrativeEngine**: Core service that manages narrative principles and builds system prompts
2. **PersonaManager**: Manages narrator personas and their characteristics
3. **COTManager**: Manages chain-of-thought reasoning modes
4. **NarrativeContext**: Facade that wires all components together

## Narrative Principles

The engine enforces seven core principles that shape all AI responses:

### Anti-Assistant Bias

The AI is a narrator and world simulator, not a helpful assistant. This means:

- NPCs don't exist to serve the user
- The world doesn't revolve around the user character
- Conflicts aren't automatically resolved
- NPCs have their own agendas

### Knowledge Firewall

NPCs only know what they've observed or been told:

- No omniscient NPCs
- Information spreads realistically
- Secrets stay secret until discovered
- Rumors and misinformation are possible

### User Agency

The AI never decides the user's actions, dialogue, or thoughts:

- User controls their character completely
- AI only describes the world and NPC actions
- No "you feel" or "you think" statements
- User choices have real consequences

### NPC Autonomy

NPCs have their own motives, limits, and lives:

- NPCs pursue their own goals
- They disagree, leave, lie, fail
- They act before the user asks when appropriate
- Relationships develop naturally

### Cultural Anchoring

Use real-world references when setting-appropriate:

- Real brand names, artists, platforms
- No "the popular social media app"
- Makes settings feel lived-in
- Adjusts to time period and setting

### Narrative Drive

Drive the story forward actively:

- Don't wait passively for user input
- Introduce complications and opportunities
- Maintain pacing and momentum
- Create dramatic tension

### Moral Complexity

Characters are morally grey, not archetypes:

- No clear good/evil
- Motivations are complex
- Choices have trade-offs
- Consequences are nuanced

## Narrator Personas

Personas define the narrator's voice and style. Each persona includes:

- **Prose style**: How the narration is written
- **Dialogue style**: How character dialogue is presented
- **Tone**: The overall emotional quality

### Available Personas

#### Default Narrator
Balanced, clear, and adaptive narration that works well for most scenarios.

#### Noir Narrator
Gritty, cynical, atmospheric narration with:
- Hard-boiled metaphors
- Moral ambiguity
- Shadow-drenched descriptions
- World-weary tone

#### Cozy Narrator
Warm, gentle, comforting narration with:
- Attention to small pleasures
- Sensory details (warm drinks, soft fabrics)
- Nurturing tone
- Leisurely pacing

#### Epic Narrator
Grand, sweeping, mythic narration with:
- Elevated diction
- Heroic language
- Cinematic scope
- Rhythmic cadence

### Configuring Personas

Edit `packages/server/narrative-config.json`:

```json
{
  "defaultPersona": "noir"
}
```

Or change dynamically in code:

```typescript
const context = new NarrativeContext();
context.setPersona('cozy');
```

## Chain of Thought

Chain of Thought (CoT) makes the AI reason through problems step-by-step before generating responses. This improves coherence and reduces contradictions.

### Available Modes

#### Main CoT (5 phases)
Full reasoning for complex scenarios:
1. Analyze user input and context
2. Consider character motivations and world state
3. Plan narrative direction
4. Draft response
5. Review and refine

#### Fast CoT (3 phases)
Streamlined reasoning for quick responses:
1. Quick context analysis
2. Plan response
3. Draft and review

#### Creative CoT (5 phases)
Enhanced creative reasoning:
1. Analyze narrative potential
2. Explore creative possibilities
3. Plan narrative arc
4. Draft with creative flourishes
5. Polish and enhance

### Configuring CoT

Edit `packages/server/narrative-config.json`:

```json
{
  "defaultCOTMode": "main"
}
```

Or change dynamically:

```typescript
const context = new NarrativeContext();
context.setCOTMode('fast');
```

## Integration

The narrative engine integrates into the generation pipeline automatically:

1. `NarrativeContext` is created for each generation request
2. Configuration is loaded from `narrative-config.json` when `NarrativeContext` is instantiated in the generation pipeline
3. System prompt is built with principles + persona + CoT
4. Prompt is injected into the generation context
5. AI generates response following the narrative framework

## Customization

### Adding Custom Personas

Create a new persona object:

```typescript
import { NarratorPersona, DEFAULT_NARRATOR_PERSONAS } from '@jumpchoice/shared';

const customPersona: NarratorPersona = {
  id: 'mystery',
  name: 'Mystery Narrator',
  description: 'Suspenseful, enigmatic narration',
  prompt: 'You are a mystery narrator...',
  style: {
    prose: 'Suspenseful, hint-laden',
    dialogue: 'Cryptic, revealing',
    tone: 'Enigmatic, tense'
  }
};
```

Add to PersonaManager:

```typescript
const manager = new PersonaManager([...DEFAULT_NARRATOR_PERSONAS, customPersona]);
```

### Adding Custom CoT Modes

Create a new CoT mode:

```typescript
import { ChainOfThoughtMode, DEFAULT_COT_MODES } from '@jumpchoice/shared';

const customMode: ChainOfThoughtMode = {
  id: 'analytical',
  name: 'Analytical CoT',
  description: 'Deep analytical reasoning',
  phases: [
    'Analyze the problem space',
    'Identify key variables',
    'Evaluate options',
    'Synthesize solution',
    'Validate reasoning'
  ],
  cotTag: 'think'
};
```

Add to COTManager:

```typescript
const manager = new COTManager([...DEFAULT_COT_MODES, customMode]);
```

### Validation

The narrative engine validates inputs:
- `setPersona()` throws if persona prompt is empty
- `setCOTMode()` throws if phases array is empty
- Invalid persona/COT mode IDs throw errors

## Testing

Run narrative engine tests:

```bash
pnpm test narrative
```

All 49 tests should pass, covering:
- Narrative principles
- Persona management
- CoT modes
- Integration scenarios
- Edge cases

## Future Enhancements

*Note: These features are planned but subject to change.*

Planned features:
- Per-character persona settings
- Dynamic persona switching based on scene
- Custom principle overrides
- Persona blending
- Advanced CoT visualization
