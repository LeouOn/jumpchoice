# JumpChoice Player Reference Library

> **What this is.** First-party min-max reference for Jumpchain and CYOA players. These docs are
> personal-use companion material — they are **not** JumpChoice platform documentation or architecture.
> For platform docs, see the [main README](../../README.md##documentation).
>
> **Status.** Active, maintained alongside the platform. Two volumes covering 46 reference docs.
> Last updated: 2026-06-20.

---

## Pick your adventure

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🐛  Worm CYOA V6.1              ⛓️  Jumpchain Supplement Stack   │
│   ─────────────────               ──────────────────────────│
│   Choices: 743                      Supplements: 5           │
│   Tier-ranked: all 743              Top S-picks: 25          │
│   Named archetypes: 6               Sample builds: 5         │
│   Adversarial redteam: v5           Adversarial redteam: full│
│   Last repaired: v2 (2026-06-20)    Per-supplement versions  │
│                                                             │
│   [→ Start here](reference/worm-cyoa-v6/README.md)    [→ Start here](reference/jumpchain-supplements/README.md) │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Which do you need?

| You want... | Go here | Best first page |
|-------------|---------|-----------------|
| A single-CYOA deep dive (Worm V6.1) | [🐛 Worm V6.1](reference/worm-cyoa-v6/README.md) | "Top Trump-stack" § — the I-Win button |
| The always-with-you Jumper baseline | [⛓️ Supplement Stack](reference/jumpchain-supplements/README.md) | `combined-tier-list.md` — top 25 picks |
| Cross-references between the two | [🤝 CONCEPT_CROSS_INDEX](reference/CONCEPT_CROSS_INDEX.md) | Where concepts appear in both |

## How the two sets relate

The **supplement stack** (UDS + Body Mod + PRS + GFJ) is the "always with you" Jumper baseline
that any specific CYOA build layers on top of. The **Worm V6.1** set is one specific deep dive into
a single setting. Each set cross-references the other.

Conceptually:
1. **Start with the supplement stack** (combined-tier-list.md §1). Pick your 5-10 "always on" perks.
2. **Then layer in Worm V6.1 perks** (Worm README § Top Trump-stack). The Worm perks compose with
   your baseline.
3. **Run the redteam** (both sets have adversarial reviews). Your build has gaps.

## By the numbers

| Volume | Docs | Tier-List entries | Named builds | Redteam weaknesses |
|--------|------|-------------------|--------------|-------------------|
| 🐛 Worm V6.1 | 31 | 743 | 6 archetypes | 10 (v5 build) |
| ⛓️ Supplement Stack | 15 | 5 supplements | 5 builds | 10 (Godmode build) |
| **Total** | **46** | **743 + 5 supplements** | **11** | **20** |

## How to contribute

These are first-party reference docs. If you spot a tier-list error, math mistake, or missing
cross-reference, open a PR against the specific subdoc. See each volume's README for its version
history and the `v2 — Repaired` pattern used for corrections.

## Repo notes

Sources for both sets are public CYOA documents authored by the fan community:
- Worm CYOA V6.1: PixelGMS / SoundByte ([interactivewormcyoav6.neocities.org](https://interactivewormcyoav6.neocities.org/))
- Essential Body Mod: swordchucks (wordchucks1)
- SB Body Mod: Insertrandomnickname and TangledLion
- Personal Reality Supplement: SJ-Chan and Sonic0704
- Generic First Jump: Ursine
- Universal Drawbacks Supplement: SJ-Chan v1.13

Integration into JumpChoice's narrative engine is out of scope. These docs are independent
reference material.
