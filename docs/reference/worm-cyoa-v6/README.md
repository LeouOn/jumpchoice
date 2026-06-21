# Worm CYOA V6.1 — Min-Max Reference (v2 — Repaired)

> **Repaired 2026-06-20.** v1 README had several errors propagated from Phase 2 docs: Queen "costs" 20 CP (not "gives"), Queen NOT "+20 CP"; PtV has explicit blindspots not "removed"; Khepri is Tier 3 not Combo; Mundane blocks ALL powers; Power Copy has no Eidolon (it's Tier 2); Sting Tier 1 is broader than Flechette; The End-Becomer and Power Manipulator scale-to-100% claims. v2 fixes all.

Source: <https://interactivewormcyoav6.neocities.org/WormCYOAV6.1/Worm.html>
Author: PixelGMS / SoundByte

This directory contains a structured extraction of every choice from the Worm CYOA V6.1 SPA, plus multi-layered analysis geared toward min-maxing builds.

## Files

### Core reference
| File | Purpose |
|------|---------|
| `strategy.md` | Budget math, top picks per row, all 50 Power Copy capes and Tier 3/2/1 powers. |
| `top-drawbacks.md` | Top 30 drawbacks ranked by total point gain. |
| `cheapest-by-row.md` | Top 10 cheapest options in every row. |
| `per-row-summary.md` | Per-row totals. |
| `choices.csv` | All 743 choices flat. |
| `id-map.json` | `objId → {title, row, costs}` lookup. |
| `categories.md` | Tier 3 powers grouped by Worm classification. |

### Analysis (the fun stuff)
| File | Purpose |
|------|---------|
| `tier-list.md` | S/A/B/C/D/F ranking of all 743 choices. |
| `synergies.md` | Tier-S synergy pairs + Combo Powers + auto-discovered. **(v2 — non-pickable capes removed)** |
| `utility-defense-offense.md` | Top 10 per role + archetype sketches. |
| `archetypes.md` | **6 named min-max archetypes. (v2 — Mundane/Shardless archetype fixed; Queen cost corrected)** |
| `legalistic.md` | Lawyer-style analysis of 10 power interactions. **(v2 — §2.2 PtV blindspots fixed; §2.6 Power Copy exclusion corrected)** |
| `analysis-stats.json` | Aggregate stats. |

### Deep analysis (Phase 2 — now v2)
| File | Purpose |
|------|---------|
| `trump-stack.md` | **The Trump Stack Bible — (v2 fully rewritten)** — FQ + Oberon + Eidolon + PM stacking, kill sequence, recursive FQ. (Oberon 5-cap, PM 3 slots/scaling, Eidolon blindspot clause, FQ corpse-claim all corrected) |
| `blindspots.md` | **Per-power immunity & blindspot matrix — (v2 fully rewritten)** + cross-power anti-counter clustering. (Trumped the Trump, All Seeing Precognition, Gomu Gomu, Phase, Target Acquired, Epilepsy, Sting Tier 1 all added; Crawler/Legend removed from PC) |
| `matchups.md` | **Per-threat matchup analysis — (v2 fully rewritten)** (Zion, Eden, Simurgh, Scion, Contessa, Endbringers, Eidolon, FQ, S9, Khepri). (Scion kill chain corrected; Simurgh postcog warning; non-pickable capes replaced with FQ/Eidolon) |
| `hidden-gems.md` | **Sanity-check of D/F tier — (v2 rewritten)** — manually re-rated picks. (Scarlet Witch removed; Natsuki Subaru B-tier with Witch curse; Tier 3 cheap picks highlighted) |
| `utility-catalog.md` | Skills, perks, identity, civilian identity utility options. |
| `combo-encyclopedia.md` | **All 21 Combo Powers — (v2 — Khepri removed, PtV corrected, Natsuki curse added)** |
| `anti-trump.md` | **What beats a Trump-stack — (v2 fully rewritten)** — Trumped the Trump (3 SP) is the HARD COUNTER, not "no hard counter." |
| `deep-analysis-stats.json` | Deep analysis metadata. |

### Critical review (Phase 3 — adversarial second pass)
| File | Purpose |
|------|---------|
| `critical-review.md` | **Adversarial review of Phase 2 docs** — 15 material errors cataloged with evidence, revised tier list, corrected I-Win list. Read this before trusting Phase 2. |
| `second-opinion.md` | **Course-correction after user pushback** — re-evaluates cheap perks (Perfect Aim, Gomu Gomu, Phase, Trumped the Trump), adds canon corrections from librarian (Sting alone doesn't kill Entities, Khepri Combo isn't in base V6.1, Simurgh has postcognition), 3 new archetypes (Coverage Build, Sting Economy, Anti-Trump Specialist). |
| `shard-strategy.md` | **Shard Ranking strategy** — Queen vs Vital vs Normal head-to-head math. Vital recommended for 90% of players. Includes 3 concrete build examples (Vital baseline, Normal Coverage Specialist, Queen maximalist). |
| `build-off.md` | **The Build-Off: a synthesis + game** — three playable builds (Cheap-Stack Survivor, Vital Baseline, Queen Maximilist) with head-to-head comparison and a 7-scenario "threat simulation" game you can actually play through. |
| `vital-protected.md` | **Vital Baseline v3** — the "Protected, not Paranoid" revision. Drops ASP + Cloak Mark II (convenience), adds Mental Barrier (full Master/Stranger immunity). Includes a Solo Scion variant for swap-in. |
| `vital-negentropy.md` | **Vital Baseline v4** — swaps ASP for Negentropy. Negentropy buffs every shard power (Eidolon never runs out, PM charges unlimited, Immortal becomes truly immortal) AND has the hidden Scion-Trade win condition. Gomu Gomu re-evaluated as both defensive AND offensive. |
| `vital-limitbreak.md` | **Vital Baseline v5** — adds Golden Avatar (the biggest miss — Scion permanently killable, avatar-locked at Gold Morning power level). Build now has BOTH Scion Trade (diplomatic) AND Gomu Gomu no PAUNCH (violent) paths. Includes analysis of all limit-break perks I missed: Enraged Avatar, End of the Kaiju, Weakened Kaiju, Sandbagging Kaiju, Homecoming, Extended Range, Conflicted Predictions, Backup, Plot Armor. |
| `drawback-catalog.md` | **The Drawback Catalog** — systematic audit of every "baddies attack me" drawback ranked by budget value vs. severity. Tailored for self-inserts (no Orphaned). Includes the S8 simulation scenario, the optimized drawback stack (+228 SP/CP), and the insight that "baddies attack" drawbacks are inverted buffs for Trump-stacks. |
| `redteam.md` | **The v5 Redteam** — adversarial review of every major perk/power in Vital Baseline v5. Finds 10+ hidden weaknesses including the Mental Barrier vs. Eidolon-Master ambiguity, Golden Avatar's "to some degree or another" wording, Negentropy's "more or less useless unless immortal" clause, Khepri's "such as" immunity list, FQ caricatures, no ranged offense. Includes 6 counter-build strategies and recommendations. |

## Tier distribution

| Tier | Count |
|------|-------|
| S | 56 |
| A | 147 |
| B | 268 |
| C | 137 |
| D | 134 |
| F | 1 |

## Currency

- **Shard Points (SP)** — for powers and difficulty upgrades
- **Character Points (CP)** — for skills, identity, location, age multipliers

## Budget levers (corrected)

1. **Determination Mode** (+100 SP, +wish on victory, +precog immune, +free Cloak II/III, Contessa restricted)
2. **Suicide Mode** (+50 SP, +precog immune, +free Cloak II/III, +100% int/creative)
3. **Easy** (-30 SP, but **Taylor/Amy/Lisa/Victoria all hate you** — social lockout)
4. **Perks/Drawbacks** (May you live in Interesting Times +40, Second Wave +40, Insane +35, etc.)
5. **Shard of the Thinker Entity** (-10 SP, but **2-decade power fade + $50K/SP Cauldron debt + 3 mandatory favors**)
6. **Shard Ranking = Queen** (Tier 1/2/3 unlock, **costs 20 CP**)
7. **Shard = Mundane** (-60 CP, **but blocks ALL powers** including Shardless; Shardless is a separate ambiguous mechanic)

## Power budget slots

- Power Copy: 1 pick (2–14 SP, 50 capes; cheapest is Über at 2 SP, most expensive Bonesaw/Panacea at 14 SP)
- Tier 3: 5 picks (1–15 SP, 162 options)
- Tier 2: 3 picks (15–35 SP, 19 options)
- Tier 1: 1 pick (20–40 SP, 10 options)
- Combo: 5 picks (–8 to 20 SP, 21 options)
- (Shardless) One Pointers: 12 picks at 1 SP

## Top Trump-stack (corrected)

**Budget**: Determination Mode (+100 SP) + 5 best drawbacks (~+100 SP) + Warrior Entity (default — avoid Thinker Cauldron debt) = **~200 SP**

**Build**:
- **Tier 1 (1 pick)**: Oberon/Titania (35 SP) — **touch-copy up to 5 active powers** (capped; Cauldron + Eden clause)
- **Tier 2 (×3)**: Fairy Queen (25 SP), Eidolon (20 SP), Power Manipulator (20 SP) = 65 SP
- **Tier 3 (×5)**: Power Sight (4), Powerswap (4), Fae Court (6), Khepri (15), Phase (2) = 31 SP
- **Combo (×5)**: Path to Victory (15), Legion of the Fae (15), End-Becomer (10), Meta Knowledge (5), 5th open = 45 SP
- **Power Copy**: Coil (7 SP) — backup timeline
- **Perks**: Trumped the Trump (3) + All Seeing Precognition (20 SP + 10 CP)
- **Total**: ~206 SP + 10 CP

**Result**: You are Eidolon (3 random + you're a precog blindspot) + FQ (3 stolen) + PM (3 copied at 100%, can clone Entities) + Oberon (5 active) + Khepri (10m Master). All-Seeing Precognition removes PtV blindspots. Trumped the Trump (3 SP) hard-counters any enemy Trump-stack.

## Top single-build (the I-Win button — corrected)

**PtV + All Seeing Precognition + Suicide Mode + Cloak Mark II**: 
- 50 SP (Suicide Mode) + 15 SP (PtV combo) + 20 SP + 10 CP (All Seeing Precognition) + 2 SP + 3 CP (Cloak Mark II) + free Cloak II/III perks
- **= 87 SP + 13 CP**
- v1's claim of 65 SP was incorrect — PtV alone has blindspots; you need All Seeing Precognition to remove them.
- Plus Determination Mode (+100 SP) if you want the wish on victory.

## Top cheap picks (correctly rated)

**Tier 3 (3 SP or less)**:
- **(Breaker) Gomu Gomu no Mi** (3 SP) — *"could get crushed by Behemoth or punched by Alexandria and not get damaged."* Alexandria-tier blunt immunity for 3 SP.
- **(Blaster) Epilepsy** (1 SP) — *"temporarily stop a Thinker's power from working, for maybe 10 seconds."* Anti-Thinker for 1 SP.
- **(Shaker) Target Acquired** (2 SP) — anyone in 300m glows through walls/invisibility. Hard Stranger counter.
- **(Breaker) Phase** (2 SP) — *"immune to bullets and lasers while in this state."*
- **(Striker) Knockout** (1 SP) — touch-mark + second touch = paralyze 15 min.
- **(Master) Geas** (1 SP) — enforceable contracts.
- **(Tinker) Repair** (3 SP) — Tinker-multiplier.
- **(Shaker/Master/Thinker/Blaster) Bag of Holding** (3 SP) — pocket dimension utility.

**Perks (3 SP or less)**:
- **Trumped the Trump** (3 SP) — *hard counter to all Trump powers.*
- **Noctis Cape** (3 SP) — no sleep + eidetic memory.
- **Cloak Mark II** (2 SP + 3 CP) — *only counter to All-Seeing Precognition.*
- **Cloak Mark IV** (2 SP + 1 CP) — anti-info-Thinker (Tattletale works; Cherish/Khepri don't).

## How to use this for a build (corrected workflow)

1. Pick a Difficulty from `strategy.md` §"Budget levers"
2. Stack 3–5 drawbacks from `top-drawbacks.md`
3. **Add cheap tier-3 picks first** (Gomu Gomu, Phase, Target Acquired, Epilepsy — see Top Cheap Picks above)
4. Filter Tier S/A picks from `tier-list.md`
5. Cross-reference `synergies.md` (v2) for combo pairs
6. Verify the build is real (no anti-synergy) in `blindspots.md` (v2)
7. Check matchup coverage in `matchups.md` (v2) against your threat list
8. Read `legalistic.md` (v2) for edge cases
9. If going Trump-stack, read `trump-stack.md` (v2) for stacking order
10. If facing a Trump-stack, read `anti-trump.md` (v2) — Trumped the Trump (3 SP) hard-counters it

## Repo notes

This is reference data for personal use. The JumpChoice CYOA pipeline (image-based extraction) doesn't apply directly to this live HTML SPA; if you want to integrate this data into JumpChoice, an HTML→choices ingestion path would be needed (out of scope today — see AGENTS.md coordination rules: open an issue before implementation work).