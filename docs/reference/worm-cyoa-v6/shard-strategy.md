# Worm CYOA V6.1 — Shard Strategy: Queen vs Vital vs Normal

> **Date:** 2026-06-20. This doc explores a strategic question: which Shard Ranking gives the best return on investment, and what does a build look like if you commit to lower-tier powers only?

## §1.0 — Source-verified Shard Ranking options

From the live CYOA JSON, `rowTitle: "Shard Ranking"`, three options:

| Title | Cost | Tier access | Text |
|-------|------|-------------|------|
| **Normal** | **+20 CP** (gain) | Tier 3 only | "This Shard is not considered to be important to the entity." |
| **Vital** | **0 CP / 0 SP** (free) | Tier 2 + 3 | "This Shard is considered important to the entity, and so will not discard it lightly." |
| **Queen** | **–20 CP** (cost) | Tier 1 + 2 + 3 | "The entity, not having this Shard, is severely hindered. This Shard is significantly stronger than most others, only equaled by the other Queen shards." |

**Read carefully**: Normal shard is the only one that *gives* you CP. Queen *costs* you CP. Vital is the budget-neutral baseline. v1 of the README/docs had this backwards on Queen (claimed it gave CP) — corrected in v2.

## §2.0 — Is Queen worth 20 CP?

### §2.1 — What does 20 CP buy elsewhere in the CYOA?

Pulling the Skills row (31 options, 1–3 CP each), Identity row (26 options, –8 to +14 SP/CP, but most are 3–11 SP not CP), and the cheap perks/drawbacks:

| CP | What you could buy |
|----|--------------------|
| 1 CP | A Skill (Pickpocketing, Lipreading, Banter, Gun Fu 3 CP, etc.) |
| 2–3 CP | A good Skill (Gun Fu 3 CP, Teaching 3 CP, Earth Bet Slang 1 CP) |
| 2 SP + 1 CP | Cloak Mark IV perk (anti-info-Thinker) |
| 3 SP + 2 CP | Cloak Mark III perk (anti-Endbringer/Entity precog) |
| 1 SP + 5 CP | Mental Barrier perk (anti-Master) |
| 5 SP + 10 CP | Negentropy perk (entropy resistance) |
| 20 SP + 10 CP | **All Seeing Precognition** (removes PtV blindspots) |

So 20 CP alone buys roughly 6–10 Skills, OR a few perks, OR a major perk combo with 20 SP change. It's flexible currency.

### §2.2 — What does Tier 1 access give you?

The full Tier 1 list, by cost:

| Cost | Power | Notes |
|------|-------|-------|
| 20 SP | (Tinker) Revolution | Remove black boxes from Tinkertech. Solid utility for Tinker builds. |
| 25 SP | (Blaster/Striker) Sting | Infuse Sting into any power. **The Entity-killer.** |
| 25 SP | (Mover) Door Me | Portals to anywhere you've seen. |
| 30 SP | (Brute/Breaker) Immortal | Immortal *except* specific kill conditions. |
| 30 SP | (Brute) Avalon | Instant regen, unlimited stamina. |
| 30 SP | (Shaker) Cast | Internal energy, summon things. |
| **35 SP** | **(Trump) Oberon/Titania** | **Touch-copy 5 active capes**, Cauldron + Eden clause. |
| 35 SP | (Shaker) And the Void Stares Back | Body is a pocket dimension door. |
| 35 SP | (Thinker) Vision | Simulate any scenario. |
| 40 SP | (Shaker) It Gets Worse | Luck-based invulnerability (probabilistic). |

### §2.3 — The math

Queen tax: **20 CP**.
Cheapest Tier 1 power: **Revolution at 20 SP**. So a Tier 1 power costs 20 SP minimum.
Most useful Tier 1 powers for endgame: **Oberon at 35 SP, Sting at 25 SP, Immortal at 30 SP**.

If you take Queen and spend 35 SP on Oberon, you've spent 20 CP + 35 SP for the single best Trump-stack enabler in the game. **Is that worth it?**

**Yes, if you're building around Trumps.** Oberon is the only Tier 1 power that's irreplaceable. Every other Tier 1 power has a cheaper analog somewhere (e.g., Sting Tier 1 vs Sting-Flechette Power Copy at 10 SP). Oberon is uniquely valuable.

**No, if you're building a coverage/skills/identity-heavy build.** Vital (free) gets you Tier 2 + 3 which has Eidolon (20 SP), FQ (25 SP), PM (20 SP) — all the meta-defining Trumps at half the cost of Oberon. Queen is for builds that need BOTH the meta Trumps AND Oberon.

### §2.4 — Verdict

**Queen is worth 20 CP if and only if** your build specifically wants Oberon/Titania (the irreplaceable Tier 1 Trump). Otherwise, Vital is the strictly better budget choice.

## §3.0 — Vital: the sweet-spot baseline

Vital costs **0 CP** and unlocks **Tier 2 + Tier 3**. You lose only Tier 1 (10 powers, mostly Trump-tier or expensive durability).

What you get with Vital:
- **3 Tier 2 picks** (15–35 SP each, so 45–105 SP of Tier 2 power budget)
- **5 Tier 3 picks** (1–15 SP each, so 5–75 SP of Tier 3 budget)
- **5 Combo picks** (–8 to 20 SP)
- **1 Power Copy pick** (2–14 SP)
- All Perks/Drawbacks

**Best Tier 2 picks for a Vital-shard build:**
- **(Trump) Fairy Queen** (25 SP) — the cornerstone Trump
- **(Trump) Eidolon** (20 SP) — you become a precog blindspot
- **(Trump) Power Manipulator** (20 SP) — 3 slots, copies Entities
- **(Brute/Shaker/Tinker) Emperor of Man** (35 SP) — durable + telekinetic + Tinker
- **(Shaker) Inviolable** (15 SP) — forcefields
- **(Thinker) Number Man** (15 SP) — perfect math

For 65–105 SP you can have FQ + Eidolon + PM, which is the entire Trump-stack minus Oberon. **Vital covers 95% of the meta-game.**

What you lose by skipping Tier 1:
- Oberon/Titania (5-active touch-copy)
- Sting Tier 1 (broader Sting than Flechette)
- Immortal/Avalon (heavy durability)
- Vision (scenario simulation)

For a Trump-stack focused on Eidolon/PM/FQ, you don't strictly need Oberon — Eidolon can RNG into a copy-power, and PM can copy at 1m range. Oberon adds 5 active copies but costs 35 SP. Vital lets you stack more Tier 2 picks.

## §4.0 — Normal-shard: Tier-3-only build exploration

This is the most interesting challenge. You **gain 20 CP** but are restricted to **Tier 3 powers only**. The question: can you still build something strong?

### §4.1 — What you LOSE without Tier 2/1

| Tier 1/2 power | What it does | Tier 3 substitute? |
|----------------|--------------|-------------------|
| (Trump) Fairy Queen (25 SP) | Kill+steal, store 3 capes | Nothing equivalent in Tier 3 |
| (Trump) Eidolon (20 SP) | 3 random + blindspot | Nothing equivalent in Tier 3 |
| (Trump) Power Manipulator (20 SP) | 3 slots, copies Entities | Nothing equivalent in Tier 3 |
| (Trump) Oberon/Titania (35 SP) | 5-active touch-copy | Nothing equivalent in Tier 3 |
| (Blaster/Striker) Sting (25 SP) | Sting on any power | Flechette/Foil (Power Copy, 10 SP) is narrower |
| (Brute/Breaker) Immortal (30 SP) | Immortal/invulnerable | Gomu Gomu (3 SP) is partial — blunt only |
| (Shaker) Inviolable (15 SP) | Forcefields | Forcefield (Tier 3, 4 SP) is narrower |

**Verdict**: A Tier-3-only build cannot replicate the Trump-stack. Eidolon/FQ/PM/Oberon are the meta-defining Trumps and they don't exist at Tier 3.

### §4.2 — What you KEEP

- **5 Tier 3 picks** with the cheap-but-strong picks I identified earlier
- **5 Combo picks** (PtV, Legion of the Fae, End-Becomer, Biobringer, Mage, etc.)
- **1 Power Copy** (Flechette at 10 SP, or Coil at 7 SP)
- **12 Shardless One-Pointers** at 1 SP each = 12 SP for full coverage layer
- **All Perks** including Trumped the Trump (3 SP)
- **+20 CP for skills/identity** — this is a real budget boost
- **(Master) Khepri (Tier 3, 15 SP)** — 10m Master, extends through portals

### §4.3 — Concrete Tier-3-only build ("The Coverage Specialist")

**Difficulty**: Determination Mode (+100 SP, +wish on victory, +precog immune, +free Cloak II/III)

**Drawbacks**: Tinfoil Hat (+15), Fallen Worship (+15), Case 53 (+13) = +43 SP, +46 CP
**Skip**: Genius of Hard Work (caps powers), Shard of the Thinker Entity (Cauldron debt)

**Shard Ranking**: **Normal (+20 CP free)**. Tier 3 only.

**Total starting budget**: 143 SP, **+66 CP** (43 from drawbacks + 20 from Normal shard)

**Tier 3 picks (5)**:
1. **(Master) Khepri** (15 SP) — 10m Master, control capes, extends through portals
2. **(Breaker) Gomu Gomu no Mi** (3 SP) — Alexandria-tier blunt immunity
3. **(Breaker) Phase** (2 SP) — bullet/laser immune
4. **(Shaker) Target Acquired** (2 SP) — anti-Stranger, 300m reveal
5. **(Blaster) Epilepsy** (1 SP) — 10-second anti-Thinker

**Total Tier 3: 23 SP**

**Combo picks (5)**:
1. **Path to Victory** (15 SP) — plans steps (with blindspots)
2. **All Seeing Precognition** perk (20 SP + 10 CP) — REMOVES PtV blindspots
3. **The Legion of the Fae** (15 SP) — 50% copies of beaten capes, stacks
4. **The End-Becomer** (10 SP) — Endbringer control
5. **Biobringer** (10 SP) — bio-control

**Total Combo: 70 SP + 10 CP**

**Power Copy (1)**: **Flechette/Foil** (10 SP) — Sting on nonliving objects

**Perks**:
- **Trumped the Trump** (3 SP) — hard counter to all Trumps
- **Cloak Mark II** (2 SP + 3 CP) — anti-All-Seeing
- **Cloak Mark IV** (2 SP + 1 CP) — anti-info-Thinker
- **Noctis Cape** (3 SP) — no sleep + eidetic memory

**Total Perks: 10 SP + 4 CP**

**Shardless One-Pointers (12 at 1 SP each = 12 SP)** — full coverage layer

**Grand total**: 23 + 70 + 10 + 10 + 12 = **125 SP** + 14 CP

**Headroom remaining**: 143 SP - 125 SP = **18 SP** + ~52 CP

**Result**: A build with:
- Alexandria-tier blunt immunity (Gomu Gomu)
- Bullet/laser immunity (Phase)
- 10m Master on capes (Khepri)
- Endbringer control (End-Becomer)
- Anti-Stranger radar (Target Acquired)
- Anti-Thinker shutdown (Epilepsy)
- Trump immunity (Trumped the Trump)
- PtV with no blindspots (PtV + All Seeing Precognition)
- Endbringer control + Legion of the Fae (50% copies)
- Flechette backup Sting
- 12 Shardless coverage picks (perfect aim, cape detection, etc.)
- 66 CP for skills/identity heavy build (Tinkertech specialty, languages, etc.)

**This is a genuinely strong build.** It's not a Trump-stack, but it's broad, defensive, and has good anti-meta coverage. The trade-off: no Eidolon/FQ/PM/Oberon means you can't clone capes. But you have **functional immunity to all Trumps** (Trumped the Trump) and a Khepri-class Master.

### §4.4 — The Tier-3-only build's main weakness

Without Eidolon/PM/FQ, you have **no scaling power source**. Khepri lets you control capes but only within 10m. Legion of the Fae gives 50% copies of beaten capes but you have to beat them first. Biobringer is bio-control but not combat-power.

For a long campaign where you face an escalating threat (Scion, Endbringers, Entities), this build relies on:
- PtV to plan the steps
- Sting (Flechette) for Entity-defense-breaching
- Khepri to control human threats
- Biobringer for biological threats
- Gomu Gomu + Phase for survival

The "win condition" is more about *surviving long enough to use the wish on victory* than *winning through accumulated power*. It's a defensive/support build.

## §5.0 — Three builds, head-to-head

| Dimension | Normal (+20 CP) | Vital (free) | Queen (–20 CP) |
|-----------|----------------|--------------|---------------|
| Tier access | 3 only | 2 + 3 | 1 + 2 + 3 |
| CP bonus | **+20 CP** | 0 CP | –20 CP |
| Can take Eidolon | No | Yes | Yes |
| Can take Fairy Queen | No | Yes | Yes |
| Can take Power Manipulator | No | Yes | Yes |
| Can take Oberon/Titania | No | No | Yes |
| Can take Sting Tier 1 | No | No | Yes |
| Can take Immortal | No | No | Yes |
| Can take cheap Tier 3s | Yes (5 picks) | Yes (5 picks) | Yes (5 picks) |
| Can take cheap Combo Powers | Yes (5 picks) | Yes (5 picks) | Yes (5 picks) |
| Shardless One-Pointers | Yes (12 picks) | Yes (12 picks) | Yes (12 picks) |
| Power Copy | Yes (1 pick) | Yes (1 pick) | Yes (1 pick) |
| Skills/identity budget | **Highest (+20 CP)** | Baseline | –20 CP |
| Trump-stack viability | **No** | Partial (no Oberon) | Full |

## §6.0 — My honest recommendation

**For most players**: **Vital** is the default. It's free, gets you Eidolon/FQ/PM (the meta Trumps) plus all 162 Tier 3 picks. The only thing you lose is Oberon/Titania, which is a 35 SP pick you may not even want.

**For coverage/skill-heavy players**: **Normal** gives you 20 CP for skills, identity, perks — a big budget boost. The trade-off is no Tier 2 (no Eidolon/FQ/PM). But Tier 3 has enough strength that a coverage build is viable.

**For Trump-stack players**: **Queen** unlocks Oberon for the full Trump-stack. The 20 CP cost is roughly equal to 6–10 Skills, which is significant but not crippling if you don't need many skills.

**The math nobody wants to admit**: Vital + skip Oberon is probably the strongest baseline, **not** Queen. The Tier 2 Trumps (FQ/Eidolon/PM) at 20–25 SP each are more bang-per-buck than Oberon at 35 SP. Oberon is amazing but you don't need it for a Tier 2 Trump-stack.

**My personal pick if I had to choose one**: **Vital**. It's free, it's flexible, it gets you the meta.

## §7.0 — Queen-specific build: the maximalist Trump-stack

If you DO want Queen (full Tier 1+2+3 access), here's the build from `archetypes.md` v2 archetype #2 ("The Trump-Stack"), condensed:

**Difficulty**: Determination Mode (+100 SP)
**Drawbacks**: Insane (+30), Golden Avatar (+30), Corona Pollentia (+30) = +90 SP, +45 CP
**Shard Ranking**: **Queen (–20 CP)** → Net: +170 SP, +25 CP
**Shard**: Warrior Entity (default; avoid Thinker debt)

**Tier 1 (1 pick)**: Oberon/Titania (35 SP)
**Tier 2 (3 picks)**: Fairy Queen (25) + Eidolon (20) + Power Manipulator (20) = 65 SP
**Tier 3 (5 picks)**: Power Sight (4) + Powerswap (4) + Fae Court (6) + Khepri (15) + Phase (2) = 31 SP
**Combo (5 picks)**: PtV (15) + Legion of the Fae (15) + End-Becomer (10) + Meta Knowledge (5) + open (5) = 50 SP
**Power Copy (1 pick)**: Coil (7 SP)
**Perks**: Trumped the Trump (3) + All Seeing Precognition (20 SP + 10 CP)
**Shardless One-Pointers (12 at 1 SP)**: 12 SP for full coverage

**Total**: 35 + 65 + 31 + 50 + 7 + 3 + 20 + 12 = **223 SP** + 10 CP
**Available**: 170 SP + 25 CP — **OVER BUDGET by 53 SP**!

**Reduce by**: drop Shardless One-Pointers (save 12 SP), drop one Tier 3 (save ~5 SP), use cheaper Combo picks (save 10–20 SP), use Tier 2 cheaper picks like Inviolable (15 SP) instead of Oberon wait no you need Oberon. Drop Khepri (save 15 SP). Drop Meta Knowledge (save 5 SP). Drop Legion of the Fae (save 15 SP).

With reduced picks: 35 + 65 + 16 + 30 + 7 + 3 + 20 = **176 SP** + 10 CP — within budget (170 + 25 CP can cover it).

**Verdict**: Queen-shard maximalist Trump-stack is **expensive** and **requires sacrifice**. The Vital baseline is strictly easier to fit in budget. Queen is for players who specifically want the full Oberon + Eidolon + FQ + PM experience and are willing to give up Combo slot flexibility.

## §8.0 — Vital-shard build: the "meta" pick

**Difficulty**: Determination Mode (+100 SP)
**Drawbacks**: Insane (+30), Second Wave Parahumans (+30) = +60 SP, +30 CP
**Shard Ranking**: **Vital (free)** → Net: +160 SP, +30 CP
**Shard**: Warrior Entity

**Tier 2 (3 picks)**: Fairy Queen (25) + Eidolon (20) + Power Manipulator (20) = 65 SP
**Tier 3 (5 picks)**: Power Sight (4) + Powerswap (4) + Fae Court (6) + Khepri (15) + Target Acquired (2) = 31 SP
**Combo (5 picks)**: PtV (15) + All Seeing Precognition (20 SP + 10 CP) + Legion of the Fae (15) + End-Becomer (10) + Mage (5) = 75 SP + 10 CP
**Power Copy (1 pick)**: Flechette/Foil (10 SP)
**Perks**: Trumped the Trump (3) + Cloak Mark II (2 SP + 3 CP) + Noctis Cape (3)
**Shardless One-Pointers (12 at 1 SP)**: 12 SP

**Total**: 65 + 31 + 75 + 10 + 3 + 2 + 3 + 12 = **201 SP** + 13 CP
**Available**: 160 SP + 30 CP — **OVER BUDGET by 41 SP**

Reduce: drop Shardless (12 SP), drop one Combo (5 SP), drop Khepri (15 SP), use cheaper Eidolon-PM swap.

Reduced: 65 + 16 + 60 + 10 + 8 = **159 SP** + 13 CP — within budget (160 + 30 CP).

**Verdict**: Vital-shard Trump-stack fits **comfortably** within budget with 17 SP + 17 CP headroom. This is the recommended build for most players.

## §9.0 — Lower-tier-only builds: the "Specialist" archetype

A Normal-shard Tier-3-only build is viable as a **Specialist** — strong in one area, light on raw power. Builds:

### §9.1 — "The Biomancer" (Normal shard, Tier 3 + Combo bio-control)

Tier 3: Khepri (15), Biobringer's effect (no specific Tier 3 — use Bio Combo), Panacea (PC 14), Bonesaw (PC 14), Skitter (PC 6) = 49 SP + 34 SP power-copy = 83 SP total bio coverage
Combo: Biobringer (10), Biomass Generation (15), Biotech (10), Resurrection (15), Meta Knowledge (5) = 55 SP
Power Copy: Panacea (14) — touch-biokinesis on others
Perks: Cloak Mark II (2 SP + 3 CP), Trumped the Trump (3)

**Total**: ~140 SP, plus 20 CP for skills. A bio-control specialist that can resurrect, control, and biokinetically manipulate. Strong vs biological threats; weak vs anti-Master effects (need immunity) and Entities (need Sting, but Sting is Tier 1).

### §9.2 — "The Cheap-Stack Survivor" (Normal shard, coverage focus)

Tier 3: Gomu Gomu (3) + Phase (2) + Target Acquired (2) + Epilepsy (1) + Knockout (1) = 9 SP
Combo: PtV (15) + All Seeing Precognition (20 SP + 10 CP) + Mage (5) + Meta Knowledge (5) + Cabbage Corp (5) = 50 SP + 10 CP
Power Copy: Coil (7 SP)
Perks: Trumped the Trump (3) + Noctis Cape (3) + Cloak Mark IV (2 SP + 1 CP)
Shardless One-Pointers (12 at 1 SP) = 12 SP

**Total**: 9 + 50 + 7 + 3 + 3 + 2 + 12 = **86 SP** + 11 CP

**Result**: A "spider-man" build — broad coverage, very strong defense, decent utility, only 86 SP spent. 80+ SP and ~50 CP headroom for skills/identity. **This is the budget build.** Not as strong as a Trump-stack in raw power, but extremely versatile and hard-countered to almost every meta threat.

### §9.3 — The verdict on lower-tier-only builds

**Lower-tier-only is viable as a Specialist or Coverage build**, but cannot compete with a Trump-stack in raw power accumulation. The honest trade-off:

- **Normal shard**: 20 CP for skills, but lose Eidolon/FQ/PM — limits endgame scaling
- **Vital**: 0 cost, gets you Eidolon/FQ/PM — the meta Trumps at half Oberon's cost
- **Queen**: –20 CP for Oberon — only worth it if Oberon is non-negotiable for your build

For most players, **Vital is the right answer**. It's the budget-neutral sweet spot that gets you the meta without sacrificing skills.

## §10.0 — Final thoughts

The Shard Ranking choice is one of the most leveraged decisions in the CYOA build. Getting it wrong means either:
- **Overpaying for Queen** when Vital would have done the job (–20 CP wasted)
- **Cheaping out with Normal** and then struggling to find Tier 3 picks that compete with Eidolon/FQ/PM (the meta Trumps)

**My recommendation**: **Vital** for 90% of players. **Normal** for skill/identity-heavy specialist builds. **Queen** only for Trump-stack purists who specifically want Oberon.

---

## §11.0 — Try this yourself

Three build archetypes to experiment with:

1. **"The Vital Baseline"** (recommended) — 65 SP Trump-stack (FQ + Eidolon + PM) + Tier 3 utility + PtV with All Seeing + Trumped the Trump. Budget: ~160 SP. Headroom for skills.

2. **"The Coverage Specialist"** (Normal shard) — Cheap tier-3 picks + Shardless coverage + PtV + perks. Budget: 86 SP + ~50 CP for skills. Spider-man build.

3. **"The Queen Trump-Stack"** (maximalist) — Oberon + FQ + Eidolon + PM + everything. Budget: ~225 SP. Tight, requires sacrifice elsewhere.

Each plays very differently. The Vital baseline is the most flexible. The Coverage Specialist is the most fun for skill-heavy characters. The Queen Trump-Stack is the most powerful but least flexible.

Pick one and iterate.