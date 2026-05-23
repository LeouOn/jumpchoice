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

## Narrative Engine

JumpChoice includes an advanced narrative engine inspired by Megumin V7 and NemoEngine V10, designed to create immersive, non-assistant-like AI storytelling.

### Core Principles

The narrative engine enforces seven core principles:

- **Anti-Assistant Bias**: The AI acts as a narrator and world simulator, not a helpful assistant
- **Knowledge Firewall**: NPCs only know what they've observed or been told
- **User Agency**: The AI never decides the user's actions, dialogue, or thoughts
- **NPC Autonomy**: NPCs have their own motives, limits, and lives
- **Cultural Anchoring**: Use real-world references when setting-appropriate
- **Narrative Drive**: Drive the story forward, don't wait passively
- **Moral Complexity**: Characters are morally grey, not archetypes

### Narrator Personas

Choose from multiple narrator voices to shape the storytelling style:

- **Default Narrator**: Balanced, clear, and adaptive
- **Noir Narrator**: Gritty, cynical, atmospheric with hard-boiled edge
- **Cozy Narrator**: Warm, gentle, comforting with attention to small details
- **Epic Narrator**: Grand, sweeping, mythic with heroic scope

Configure in `packages/server/narrative-config.json`:
```json
{
  "defaultPersona": "noir"
}
```

### Chain of Thought

The AI reasons through problems step-by-step before generating responses:

- **Main CoT**: Full 5-step reasoning for complex scenarios
- **Fast CoT**: Streamlined 3-step reasoning for quick responses
- **Creative CoT**: Enhanced creative reasoning for complex narratives

Configure in `packages/server/narrative-config.json`:
```json
{
  "defaultCOTMode": "main"
}
```

### Configuration

Edit `packages/server/narrative-config.json` to set default persona and CoT mode:

```json
{
  "defaultPersona": "noir",
  "defaultCOTMode": "main"
}
```

## Documentation

- [Roadmap](ROADMAP.md)
- [Architecture](docs/jumpchoice/ARCHITECTURE.md)
- [Module Specs](docs/jumpchoice/MODULES.md)
- [Narrative Engine](docs/NARRATIVE_ENGINE.md)
