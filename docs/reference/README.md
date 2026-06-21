# JumpChoice Reference Library

> **You are here:** the JumpChain and CYOA player reference collection. For the top-level library index
> with decision guidance, see [../CYOA_REFERENCE_INDEX.md](../CYOA_REFERENCE_INDEX.md).

---

## What's inside

| Volume | Title | Contents | Start |
|--------|-------|----------|-------|
| 🐛 Vol. 1 | [Worm CYOA V6.1](worm-cyoa-v6/README.md) | 31-doc min-max analysis: 743 choices tier-ranked, 6 archetypes, 5 Vital Baseline revisions, adversarial v5 redteam | [README § Top Trump-stack](worm-cyoa-v6/README.md#top-trump-stack-corrected) |
| ⛓️ Vol. 2 | [Jumpchain Supplement Stack](jumpchain-supplements/README.md) | 15-doc cross-jump analysis: 5 supplements tier-ranked, 5 builds, 4 combined docs, stack-level redteam | [README § Top picks TL;DR](jumpchain-supplements/README.md#top-picks-tldr) |

## Quick cross-link

Concepts that appear in both volumes are indexed in [CONCEPT_CROSS_INDEX.md](CONCEPT_CROSS_INDEX.md).
Examples: Trump-stacking, drawback optimization, adversarial review methodology, Mental Barrier
interactions, Body Mod philosophy split.

## Versioning

Each volume maintains its own version history:
- **Worm V6.1:** v2 — Repaired 2026-06-20 (Phase 3 audit, 17 critical errors fixed)
- **Supplement Stack:** 2026-06-20 initial analysis; per-supplement versions vary (EBM v1.13, SBM v1.2, UDS v1.13-unreleased)

## Source quality

Each per-supplement analysis doc notes its source quality (full/partial/checklist). The Worm V6.1
source was a full HTML/JS SPA machine-extraction. Supplements are mixed: two HTML exports, one
Google Doc text export, one partial UDS extraction. See each volume's README for details.

## Adding a new volume

To add a new CYOA deep-dive or supplement analysis:
1. Create `reference/<new-cyoa-slug>/` with its own README
2. Add a row to this hub's table
3. Update the top-level [CYOA_REFERENCE_INDEX.md](../CYOA_REFERENCE_INDEX.md)
4. Run `grep -r "<old-cyoa>" docs/` to catch any cross-references that need updating
