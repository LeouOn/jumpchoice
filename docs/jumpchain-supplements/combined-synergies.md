# Jumpchain Supplement Stack — Cross-Supplement Synergies

> **Purpose.** Document how the 5 supplements interact, compose, and chain. This is the "how do they fit together" reference.
>
> **Read first.** Read the per-supplement analysis docs for full perk details. Read `combined-tier-list.md` for the top picks. Read `combined-builds.md` for concrete examples.

---

## §0. The architecture

The 5 supplements form a layered system. From bottom (most foundational) to top (most setting-specific):

```
┌─────────────────────────────────────────┐
│  JUMP-SPECIFIC PERKS (the setting)      │  ← Per-jump, per-setting
├─────────────────────────────────────────┤
│  GENERIC FIRST JUMP (bootstrap)         │  ← First jump only
├─────────────────────────────────────────┤
│  PERSONAL REALITY (warehouse)           │  ← Cross-jump, you carry
├─────────────────────────────────────────┤
│  BODY MOD (EBM + SBM)                   │  ← Cross-jump, your body
├─────────────────────────────────────────┤
│  UNIVERSAL DRAWBACKS (engine)           │  ← Cross-chain, your CP
└─────────────────────────────────────────┘
```

UDS is at the bottom because its Chain Drawbacks affect every jump in your chain. Body Mod is above UDS because Body Mod perks integrate with UDS drawbacks (you can route half a Chain Drawback's value to Body Mod). PRS is above Body Mod because your warehouse can store body-mod related items. GFJ is above PRS because GFJ's body-mod house rule integrates its perks into your body. Jump-specific perks are at the top because they're the only layer that changes per jump.

---

## §1. The supplement trinity: UDS + Body Mod + PRS

The three supplements that form the "always with you" core are UDS, Body Mod (EBM or SBM), and PRS. The other two (GFJ, alternate Body Mod) are optional add-ons.

### The three legs of the stool

**UDS** = the engine. It provides the CP that funds everything else. Without UDS, you have 1000 CP/jump and can afford a moderate build. With UDS Chain Drawbacks, you can afford anything.

**Body Mod** = the chassis. It defines what your body can do. The SBM gives you comic-book peak human and shapeshifting. The EBM gives you a stat-block with 100+ perks and 18 Essences.

**PRS** = the home base. It gives you a pocket dimension to store things, train, recover, and plan. Without PRS, you're exposed to the world. With PRS, you have a fortress.

### Why all three?

| Need | UDS provides | Body Mod provides | PRS provides |
|------|--------------|-------------------|--------------|
| CP | Drawbacks that grant CP | n/a | n/a |
| Survivability | Mental immunity (some drawbacks give it) | Physical durability, regeneration, resistance | Safe space to recover |
| Mobility | n/a | Flight, Kinesis, Spaceflight (EBM Tier 3 Supernatural) | Portal to your reality |
| Power | n/a | All your abilities | n/a |
| Storage | n/a | Inventory IV (EBM) | Personal Reality facilities |
| Social | Stone Sober (no mood-altering) | Charismatic III, Empathetic III | Banquet hall, meeting rooms |

**If you take only one:** Take UDS. The CP engine is the multiplier that makes the others affordable.

**If you take two:** UDS + Body Mod. The combination gives you survivability + power. PRS without Body Mod is just a warehouse; Body Mod without PRS leaves you exposed.

**If you take three (recommended):** UDS + Body Mod + PRS. The full trinity.

---

## §2. UDS → Body Mod BP routing (the official pipeline)

The UDS source explicitly enables routing Chain Drawback value to Body Mod. From the source:

> "If you want, you can take a Chain Drawback to add half its value to the Body Mod Supplement... but doing so means you only get half its value in all jumps. (e.g. a 200 CP Chain Drawback would give 100 CP to the Body Mod Supplement and 100 CP each jump). Such a Chain Drawback cannot be put on Hiatus nor Revoked."

### The math

A +200 Chain Drawback routed to Body Mod:
- Body Mod gains: +100 BP (one-time, when you first take the Drawback)
- Per-jump CP: +100 (half of original value)
- Hiatus: NOT allowed
- Revoke: NOT allowed

### Comparison: route vs. don't route

| Action | Body Mod BP gained | Per-jump CP | Hiatus/Revoke | Total value over 10 jumps |
|--------|--------------------|-----------:|---------------|--------------------------|
| Don't route | 0 | +200 | Allowed | +2000 CP + flex |
| Route | +100 BP | +100 | NOT allowed | +1000 CP + 100 BP |

**Total value of routing: +100 BP** (one-time, permanent). The cost: +1000 CP over 10 jumps (you lose half the value forever).

**Is it worth it?**
- 100 BP in EBMS = a tier-1 or tier-2 perk (Reduced Sustenance I, Blank I, Inertia of Self I, etc.)
- 1000 CP over 10 jumps = 1 free Body Mod perk OR 1 free jump-native perk
- The trade is roughly even if you value the Body Mod perk at ~1 jump-native perk

**When to route:**
- If you want to start your Body Mod with a specific perk you can't afford otherwise
- If you don't anticipate needing Hiatus or Revoke
- If you're committed to the chain long-term (10+ jumps)

**When NOT to route:**
- If you might need Hiatus (some drawbacks are situationally severe)
- If you might need Revoke (Drawbacks that limit specific jumps you want to revisit)
- If you value the CP over the BP

---

## §3. UDS → PRS WP routing (the warehouse pipeline)

The UDS source mentions Warehouse Drawbacks can be made Chain Drawbacks to grant one-time WP boosts. From the source:

> "the Warehouse Drawbacks do grant one-time boosts to the Warehouse if you make them Chain Drawbacks since they limit the utility of the Warehouse."

### The mechanic

Warehouse Drawbacks (the 4 new in UDS v1.13: New Warehouse Who's This, No Inventory, Timelapse, Threadripper, plus any pre-existing ones) can be taken as Chain Drawbacks. As Chain Drawbacks, they:
- Add their full value as CP to your starting CP every jump (like all Chain Drawbacks)
- Grant a one-time WP boost to your PRS warehouse

**Note:** Full Warehouse Drawback analysis requires the missing UDS categories (see `uds-v1.13.txt` source note). The 4 new ones are listed in the UDS changelog but their full text is in the truncated portion.

### The math (estimated, based on source mechanic)

A +200 Warehouse Drawback as Chain:
- Per-jump CP: +200
- One-time PRS WP: +200 (estimated; the source says "one-time boosts" without specifying ratio)
- Plus the drawback's effect on your warehouse (which is the "limit" the drawback imposes)

**Total value: +200 CP/jump + 200 WP + warehouse limitation.** This is a strong deal IF the warehouse limitation is manageable.

### When to use this

- When the warehouse limitation doesn't impair your build
- When you need both CP and WP
- When the limitation is RP-positive (e.g., Timelapse = warehouse runs on accelerated time = free training montage)

---

## §4. The PRS + EBM Private Reality integration

The EBM has a "Private Reality" perk that's free. It integrates property into your Personal Reality. This is a one-way synergy: PRS gains from EBM, but EBM doesn't gain from PRS directly.

### The mechanic

Private Reality (EBM, free) lets you "integrate any property you own into your Personal Reality." This means if you have PRS, your PRS warehouse IS your EBM Private Reality. They merge.

### Practical effect

- EBM Private Reality properties (e.g., the Personal Reality facilities) are stored in your PRS warehouse
- PRS facilities (kitchen, library, training space) are accessible via EBM Private Reality
- Total storage: PRS WP-funded facilities + EBM Private Reality properties + EBM Inventory IV (hundreds of slots)

### Synergy with UDS

The combination Private Reality + PRS + UDS routing gives you a fortress that's:
- Funded by UDS drawbacks (WP routing)
- Defended by EBM Tier 3 Supernatural perks
- Habitable by your companions (via EBM Essential Companion perks)
- Accessible from anywhere (via EBM Spaceflight II + portal)

---

## §5. EBM + SBM dual-stacking

EBMS and SBBM serve the same role (your Jumper's body baseline) but with different design philosophies. They don't conflict — you can take both. The synergies:

### What's gained by taking both

| Need | EBM provides | SBM provides |
|------|--------------|--------------|
| Stat block | 100+ perks with explicit costs | 15 Augments × 3 levels, comic-book scaling |
| Shapeshifting | Morphic Form III (freeform) | Alt-Form Shift, Independent Forms, Coalescence |
| Essences | 18 selectable (Warlord, Mage, etc.) | n/a |
| Capstone | Divinity | n/a |
| Augments (stat-based) | Tier 3 Supernatural perks | 15 named Augments |
| Affinity discounts | n/a | Mind/Body/Heart Affinity + forfeit Ascension |
| Ascension (training) | Limited (Mode-based) | Free, ~50 years per augment |
| Discount stacking | Limited | Mind Affinity + forfeit Ascension = 200 CP tier Augments for 50 CP |

### The combo budget

If you take EBM (Mode: Mundane Start, -60 CP savings) + SBM (1000 CP budget), your total Body Mod budget is roughly 940 CP. You can:
- Take the free EBM refinements
- Take a few EBM-specific perks (Blank, Inertia, Power Toggle)
- Take the SBM S-tier Augments (Resolve 200, Memory 200, Strength 200, Endurance 200, Resistance 300)
- Take EBM Tier 3 Supernatural perks as funds allow

### The recommendation

**For most builds:** Take both. EBM gives you the stat-block precision and capstone perks (Divinity, Inventory IV). SBM gives you the comic-book scaling and shapeshifting.

**For minimalist builds:** Take one. Choose EBM if you want precision and capstone; choose SBM if you want shapeshifting and clean scaling.

**For CP-constrained builds:** Take SBM only. SBM is cheaper to optimize (less reading, clearer math).

---

## §6. Generic First Jump as bootstrap

GFJ is the canonical "first jump." It has a body-mod house rule that integrates its perks into your Body Mod. This makes GFJ the "extra budget" supplement.

### The house rule

Per the SB community convention: "GFJ perks are added to your Body Mod at no cost." This means you can take GFJ perks and they integrate into EBM/SBM without spending EP/CP.

### The 10 levels

GFJ has 10 levels of perks. Each level gives:
- More perks (cumulative)
- More free stuff (Refinements, basic abilities)
- Body-mod house rule: integrates into your Body Mod

### The math

If you take GFJ to level 5, you get ~50-100 GFJ perks added to your Body Mod for free. This is a massive budget boost.

### The recommendation

**Take GFJ to level 5+ as your first jump.** It bootstraps your Body Mod budget.

**Take GFJ to level 10 if you want the full bootstrap.** The first 5 levels give the most value; levels 6-10 are diminishing returns.

**Skip GFJ if you don't want to read 958 lines of perks.** (See the GFJ analysis doc for the full perk list.)

---

## §7. Stacking order: which supplement to take first

The order matters for some interactions. The canonical order:

### Order 1: UDS (Chain Drawbacks first)

Take UDS Chain Drawbacks at the start of your chain. This establishes the CP baseline.

**Why first:** Chain Drawbacks are "always active" once taken. The earlier you take them, the more jumps they affect.

### Order 2: GFJ (first jump)

Take GFJ as your first jump. This bootstraps your Body Mod budget.

**Why second:** GFJ's body-mod house rule needs to be active before you finalize your Body Mod build.

### Order 3: Body Mod

Take Body Mod (EBM or SBM) at the start of your first jump or as a Supplement Mode.

**Why third:** Body Mod defines your chassis. It integrates GFJ perks and receives BP from UDS routing.

### Order 4: PRS

Take PRS at the start of your first jump or as a Supplement Mode.

**Why fourth:** PRS defines your home base. It integrates with Body Mod (EBM Private Reality) and receives WP from UDS routing.

### Order 5: Jump-specific perks

Take setting-specific perks in each jump.

**Why last:** These are per-jump and not foundational.

### The alternative: Supplement Mode

Some supplements can be taken in "Supplement Mode" alongside a setting. This lets you apply them per-jump without a dedicated jump. The SB community considers this the standard approach.

**For example:** Take UDS in Supplement Mode for jump X, then take jump X's perks. This is the standard SB / QQ workflow.

---

## §8. Cross-supplement perk combos (high-value)

These are the specific combinations of perks from different supplements that produce the highest power.

### Combo 1: Trinity of Protection (EBM only)

- EBM Blank I-II
- EBM Inertia of Self I-II
- EBM Corruption Resistance
- EBM Mental Resistance III (Supernatural tier 3)

**Combined effect:** Unobservable, unchangeable, uncorruptible, uncontrollable. The four-perk suite covers all external threat vectors to your identity and mind.

**Cost:** ~-600 to -800 EP in EBM.

### Combo 2: The Offense-Defense Loop (EBM + SBM)

- EBM Defense Piercing Techniques II (pierce any defense below fiat)
- EBM Heightened Reactions IV (precognitive danger sense)
- SBM Strength 200 (2-ton bench, comic-book peak)
- SBM Endurance 200 (never tired)
- SBM Resilience 200 (action hero toughness)
- SBM Resistance 300 (resists soul-rending)

**Combined effect:** You hit anything (DPT II), you react to anything (Heightened Reactions IV), you hit hard (Strength 200), you never tire (Endurance 200), you take hits (Resilience 200), and you resist the supernatural (Resistance 300).

**Cost:** ~-300 EP (EBM) + ~-950 CP (SBM, with Body Affinity + forfeit Ascension: ~-650 CP).

### Combo 3: The Social Trinity (EBM + SBM)

- EBM Charismatic III (Supernatural tier 3, truth detection + impression control)
- EBM Empathetic III (Supernatural tier 3, never misinterpret emotional state)
- SBM Charisma 200 (know best words/tone/body-language)
- SBM Empathy 200 (never misinterpret)
- SBM Appeal 200 (universally aesthetically pleasing)

**Combined effect:** You can read anyone (Empathy), persuade anyone (Charisma), and be anyone (Appeal). The EBM versions are stronger (Supernatural tier 3) and have truth detection.

**Cost:** ~-600 EP (EBM) + ~-200 CP (SBM, with Heart Affinity + forfeit Ascension: ~-50 CP).

### Combo 4: The CP Engine + Body Mod integration (UDS + EBM + SBM)

- UDS Retail Rocker (doubles all drawback CP)
- UDS Bitch-Chan +200 (forces 600 CP native, harder to cheese)
- EBM Tier 3 Supernatural perks funded by the CP engine
- SBM S-tier Augments funded by the CP engine

**Combined effect:** The CP engine funds both EBM and SBM at maximum level. The EBM Mode system (with UDS BP routing) and the SBM Affinity system (with discounts) compound.

**Cost:** All UDS drawbacks. ~+3800 CP/jump from the engine.

### Combo 5: The Anti-Death Suite (EBM + SBM + PRS)

- EBM Cheat Death I-II (bring yourself back from death)
- EBM Regeneration III (decapitation survival)
- SBM Agelessness (don't age)
- SBM Regeneration 100 CP (slow limb regrowth)
- EBM Reflexive Reinforcement I-II (dual HP bars)
- PRS recovery room (heal in your warehouse)

**Combined effect:** Hard to kill. Even if killed, you come back. Even if you come back wrong, you have a safe space to recover.

**Cost:** ~-500 EP (EBM) + ~-200 CP (SBM) + ~100 WP (PRS).

---

## §9. The "Hate Squad → Vortex of Enemies" escalation (speculative)

The UDS changelog mentions "CID interactions with Gauntlet-Kun and Retail Rocker" and references a "Hate Squad → Vortex of Enemies" escalation. The full text is in the truncated UDS section. From the changelog:

> "Added 'New Warehouse, Who's This', 'No Inventory', 'Timelapse' and 'Threadripper' Warehouse Drawbacks."

The "Hate Squad" is likely a Chain Drawback that escalates over time. The "Vortex of Enemies" is likely the max escalation. Without the full text, I can only speculate.

### The likely mechanic (based on the name and changelog context)

- You take the Hate Squad Chain Drawback (probably +100-200 CP)
- Each jump, the number/strength of "haters" you face scales up
- The escalation can be paused, reset, or amplified
- The CP reward grows with the escalation (more hater difficulty = more CP)

### The strategy

If Hate Squad is real and works as suspected:
- Take Hate Squad early in the chain when you can handle fewer haters
- The escalation gives you a CP engine AND a built-in difficulty curve
- Combined with Retail Rocker, the CP from Hate Squad is doubled

### The risk

- Hate Squad escalation can snowball. If you can't handle the haters, you chain-fail.
- Unlike most UDS drawbacks, Hate Squad directly threatens you with combat. This is a hardcore-mode choice.

**Note:** This analysis is speculative. The full UDS text would confirm the mechanic.

---

## §10. Cross-supplement anti-synergies (combinations to avoid)

These combinations are traps or contradictions.

### Anti-Synergy 1: AEIOU + Shapeshifting Builds

AEIOU says "no clones, no evil twins, no cross-dimensional mirror selves." If your build relies on cloning yourself (e.g., Multiple Man, Naruto Shadow Clones), AEIOU breaks it.

**Resolution:** Don't take AEIOU if you want clones. Or accept that your clones will be "caricatures" (per the AEIOU text).

### Anti-Synergy 2: Singular Form + Alt-Form Shift

The SBM explicitly states: "You can only pick one of the following Perks: Alt-Form Shift or Singular Form."

**Resolution:** Pick one. Singular Form is for stable-form builds. Alt-Form Shift is for shapeshifters.

### Anti-Synergy 3: Sadist-Chan + Bitch-Chan (without Sadistic Bitch-Chan)

The UDS source says Sadistic Bitch-Chan "Replaces Sadist-Chan and Bitch-Chan." You can't take all three; you take Sadistic Bitch-Chan (which combines both effects) OR take Sadist-Chan and Bitch-Chan separately (without Sadistic Bitch-Chan).

**Resolution:** If you want both effects, take Sadistic Bitch-Chan (the combined version). Don't take Sadist-Chan + Bitch-Chan + Sadistic Bitch-Chan.

### Anti-Synergy 4: Mental Resistance III + Master/Stranger Builds

EBM Mental Resistance III is "flawless immunity to all mental intrusion." If you want to USE mental intrusion (e.g., Master powers from jumps, Stranger abilities), Mental Resistance III may block your own use.

**Resolution:** Take Mental Resistance II (which is "strong resistance" not "flawless immunity") if you want to use mental powers. Reserve III for builds that don't need Master/Stranger.

### Anti-Synergy 5: UDS Drawbacks that break Body Mod

Some UDS drawbacks directly conflict with Body Mod perks:
- Cyclopes Psi-Ops (one eye) + EBM Heightened Senses II (bloodhound senses) — the bloodhound sense still works, but with one eye, depth perception is impaired.
- Stone Sober (no mood-altering) + SBM Resolve 200 (resist supernatural control) — Resolve may depend on emotional state being intact.

**Resolution:** These are minor conflicts. Stack with awareness.

### Anti-Synergy 6: Benefits Package + UDS Drawback Min-Maxing

Benefits Package costs 300 CP every jump. If you're min-maxing UDS for CP, Benefits Package is a CP sink.

**Resolution:** Take Benefits Package only if the family/social integration is worth -300 CP/jump. Otherwise, skip.

---

## §11. Summary: the optimal composition

For a competitive Jumper, the recommended composition is:

1. **UDS** (full Chain Drawback stack + Retail Rocker + AEIOU)
2. **EBM** (Standard Start Mode + all free refinements + the trinity of protection + Tier 3 Supernatural perks as funds allow)
3. **SBM** (Body or Mind Affinity + forfeit Ascension + S-tier Augments)
4. **PRS** (100 WP default + UDS WP routing + Personal Reality facilities)
5. **GFJ** (level 5+ for body-mod house rule)

This composition gives you:
- ~2000-4000 CP/jump (UDS engine)
- All S-tier perks across supplements
- Trinity of protection
- Offense-defense loop
- Personal Reality fortress
- Maximum body-mod budget

**This is the "Godmode" build from combined-builds.md with some refinements.** The trade-off: maximum power, minimum quality of life.
