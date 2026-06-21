# Essential Body Modification Supplement (EBMS) — Min-Max Analysis

> **Source note.** The provided HTML file (`sources/essential-body-mod.html`) is a **partial Notion export of v1.12**. It cuts off after the Spiritual Perks section (Blank I/II). The canonical live document is **v1.13 (the "stop touching it" edition)** by swordchucks (aka swordchucks1), hosted on Google Docs. This analysis is based on the full v1.13 text, cross-referenced against the v1.12 HTML where wording differs. Where the two versions conflict, v1.13 wins. Material differences are flagged inline.
>
> **Canonical source:** <https://docs.google.com/document/d/1rM_GgmNu__30nNOcUO_0f844Fi1sAyHip_c0bzaYil0/edit>
> **Archive (v1.12):** the HTML file in `sources/`
> **Author:** swordchucks / swordchucks1 (Reddit u/t2_qmuhy)

---

## §1. Source Overview

| Field | Value |
|-------|-------|
| Name | Essential Body Modification Supplement |
| Version analyzed | v1.13 ("stop touching it" edition) |
| HTML source version | v1.12 ("back from the dead" edition), partial |
| Author | swordchucks (swordchucks1) |
| Currency | Essential Points (EP), separate from jump CP |
| Starting budget (default) | 100 EP + 1 Essence (Essential Mode) |
| Total option count | ~130 distinct perks/drawbacks across 10 categories |
| Pre-defined modes | 3 (Body Mod, Essential, Mundane Start) |
| Custom mode dimensions | 4 (Starting, Essence, Advancement, EP Access) |
| Variant modes | 5 (2 balanced, 3 unbalanced) |
| Limiters | 7 |
| Essences | 18 |

### Design Philosophy

swordchucks built EBMS as a **companion document for an entire Jumpchain**, not a one-and-done purchase. The Quick Start Guide and the author's own Reddit comments make this explicit:

> "This document is meant to be used as a companion document to your entire Jumpchain. When you have an odd 50 or 100 CP left over, you can shove them into this document to get something you want instead of picking up a novelty item or something you'll never use."

The supplement does two jobs. First, it replaces other body mod supplements (Quicksilver, SB Body Mod). Second, it **divorces fundamentally useful perks from specific jumps** so you don't have to always run Young Justice for Toggle or Generic First Jump for basic survival perks. The Supernatural section explicitly exists as a convenience layer for niche abilities.

The author directly calibrated power levels against the SB Body Mod (1000-point supplement):

> "I took power-level cues from the SB Body Mod supplement, which gives you a top speed of 250 kph. The 200kph sprint / 100 kph run I offer is actually a slight downgrade."

And against the original Quicksilver Body Mod (600-point supplement):

> "The Quicksilver Body Mod is a 600 point supplement and very outdated (it spends a ton of time charging you for cosmetics, for instance)."

### The Modes System (Core Mechanic)

EBMS runs on a **four-dimensional mode selector**. You pick one option from each dimension, optionally add a Variant Mode and a Limiter, and that defines your entire interaction with the supplement for the rest of your chain. Once set, the mode cannot change (except via Limiters that scale or vanish).

The four dimensions:

1. **Starting Mode** — your initial EP budget
2. **Essence Mode** — how many Essences you get and how
3. **Advancement Mode** — whether you gain EP passively over jumps
4. **EP Access Mode** — whether you can convert jump CP into EP

The provided HTML only shows one combination ("Meteoric Mode"), but the full document offers dozens of valid combinations. This is the single biggest gap between the HTML source and the canonical document.

### Key Mechanical Rules

- **Discounts are always 50%**, stacking caps at one 50% reduction. Discounted 50 EP perks are free.
- **Tiered perks** grant all lower-tier benefits. Upgrading costs the EP difference (minimum 50 EP).
- **Gauntlet rule**: Basic, Physical, Mental, Spiritual, and Skill perks count as "Body Mod" and function in Gauntlets. Supernatural perks do not. If a perk spans both categories, only the highest non-Supernatural tier applies in a Gauntlet.
- **Stacking rule**: Body Mod abilities stack with alt-forms and other perks "as long as it makes sense." Physical Prowess II on a horse form gives 2x peak horse. You can opt out per-ability, or take the Unstackable drawback to disable it entirely.
- **Drawbacks** grant EP once, are always on, and can be paid off for their base value at any time.

---

## §2. Mode Analysis

The four mode dimensions are the most important structural choice in EBMS. They determine your entire budget trajectory. Get this wrong and you're playing catch-up for the rest of your chain.

### Starting Mode

| Option | EP | Notes |
|--------|----|-------|
| Heroic Start | 500 | Front-loaded. Best for one-and-done builds or short chains. |
| Standard Start | 100 | Recommended. Matches SB Body Mod's effective starting budget. |
| Hardcore Start | 0 | Pairs with Unlockable Essence or Questing for a slow-burn progression. |

**Min-max verdict.** Heroic Start is the obvious power pick if your chain allows it. 500 EP buys a complete defensive kit (Physical Prowess III, Physical Resistance III, Regeneration II, Mental Resistance III, Blank I, Corruption Resistance) with ~100 EP left for flavor. Standard Start is the balanced default. Hardcore Start is only viable with Questing Advancement or Unlockable Essence modes.

### Essence Mode

| Option | What it does | Drawback cost |
|--------|--------------|---------------|
| Single Essence | One Essence, 50% discount on its perks, ~11 free 50 EP perks | None |
| Dual Essence | Two Essences | +100 EP in mandatory drawbacks |
| Multi-Essence | Three or more | +200 EP per Essence after the second (3rd = +300, 4th = +500...) |
| No Essence | No Essence, flat EP bonus instead | None (but no discounts) |
| No Essence Rocker | No discounts, but double EP from all sources | None |
| Unlockable (Single/Dual/Multi) | Buy all 50 EP perks for an Essence to unlock it, retroactive rebate | Same as the base mode |

**Min-max verdict.** Single Essence is the recommended default and the strongest choice for most chains. The 50% discount on a well-chosen Essence saves 3500+ EP over a full build. No Essence gives a flat +400 EP (Standard Start) or +500 EP (Heroic Start), which is a lot of upfront points but loses the compounding value of discounts over a long chain. No Essence Rocker is a trap unless you're running a very long chain with heavy CP-to-EP conversion, because double EP from all sources only matters if you have many sources.

**Essence selection matters more than mode.** The discount spread determines which perks are affordable. Essence of the Superior discounts Physical Prowess, Physical Resistance, Reduced Sustenance, Environmental Tolerance, Regeneration, Mental Prowess, Mental Resistance, Blank, and Heightened Senses, which covers nearly the entire defensive stack. Essence of the Explorer is the author's preferred generalist pick. Essence of the Brute discounts almost every Physical perk and is the melee-combat pick.

### Advancement Mode

| Option | EP gain | Notes |
|--------|---------|-------|
| Standard Advancement | 0 | Recommended default. No passive gain. |
| Meteoric Advancement | +100 EP per jump/gauntlet completed | Strong for long chains. |
| Heroic Advancement | +50 EP per jump/gauntlet completed | Half of Meteoric. |
| Questing Advancement | +50 to +100 EP per challenge | Benefactor-dependent. Variable. |

**Min-max verdict.** Meteoric Advancement is the clear winner for any chain longer than 5 jumps. By jump 10 you've gained 1000 EP, which is enough to max out an entire perk tree. Standard Advancement is only correct if you're using EP Access Mode to convert CP instead (avoiding double-dipping). Questing is high-variance: great with a generous benefactor, bad with a stingy one.

### EP Access Mode

| Option | Rule |
|--------|------|
| Standard Access | One Lesser or Greater Essence Infusion per jump |
| Lesser Access | One Lesser Essence Infusion per jump only |
| No Access | Cannot convert CP to EP |
| Cumulative | Bank unused conversions for later jumps |
| Retroactive Cumulative | Bank conversions from all jumps, including before you took this supplement |

**Min-max verdict.** Retroactive Cumulative (Standard Access) is the strongest option by far. It lets you retroactively claim EP for every jump you've ever completed, which can be thousands of EP if you're mid-chain. If your chain is starting fresh, Cumulative and Standard Access are equivalent. No Access is a self-imposed challenge mode.

### Pre-Defined Mode Combinations

| Mode | Composition | Use case |
|------|-------------|----------|
| **Body Mod Mode** | Standard + Single Essence + Standard Adv + No Access + Training Allowance | Replaces other body mods. 100 EP, one Essence, train perks through effort. |
| **Essential Mode** | Standard + Single Essence + Standard Adv + Standard Access | The recommended mode. 100 EP, one Essence, convert CP to EP once per jump. |
| **Mundane Start Mode** | Hardcore + Unlockable Single Essence + Questing + Cumulative Standard Access | Start with nothing, earn EP through play. |

**Meteoric Mode (from the HTML source)** is Standard Start + No Essence + Meteoric Advancement + No Access. It starts with 500 EP (100 base + 400 No Essence bonus) and gains 100 EP per jump. This is a solid generalist mode but loses the discount value of an Essence.

### Recommended Mode Combinations

**For min-max power:**
- Heroic Start + Single Essence (Superior) + Meteoric Advancement + Retroactive Cumulative Standard Access
- Result: 500 EP upfront, Essence discounts on the defensive stack, +100 EP per jump, retroactive CP conversion.

**For long-chain scaling:**
- Standard Start + Single Essence + Meteoric Advancement + Retroactive Cumulative Standard Access
- Result: 100 EP upfront, but compounding gains from Meteoric + CP conversion make this the highest-EP mode over 10+ jumps.

**For faithful body mod replacement:**
- Essential Mode (the recommended default)
- Result: closest to SB Body Mod balance, with gradual growth.

### Edge Modes (Unbalanced Variant Modes)

These are explicitly labeled "not balanced" by the author:

- **Harmonized Essence Mode** (requires Dual Essence): Removes the drawback requirement for two Essences.
- **Very Harmonized Essence Mode** (requires Multi-Essence): Reduces drawback requirement by 300 EP.
- **Perfectly Harmonized Essence Mode** (requires Multi-Essence): Removes all drawback requirements for multiple Essences.

**Min-max verdict.** Perfectly Harmonized with Multi-Essence is the single most point-efficient mode in the document. You get 3+ Essences with full discounts and zero drawback cost. If your table allows unbalanced modes, this is the pick. If not, Single Essence with a well-chosen Essence is the balanced optimum.

---

## §3. Per-Option Tier List

**Tier definitions:**
- **S**: Meta-defining. Changes how you build and play your entire chain. Almost always worth the cost.
- **A**: Strong. High priority for most builds. Excellent value or unique effect.
- **B**: Solid. Good value, situational, or moderate impact. Take if it fits your theme.
- **C**: Niche. Overcosted, very situational, or redundant. Take only for thematic builds.
- **D**: Weak. Outclassed by alternatives or provides minimal mechanical benefit.

Free perks are ranked separately since cost is not a factor.

### Basic Perks (All Free)

These are free for everyone. You can decline any of them, but almost all are worth keeping.

| Perk | Tier | Reason |
|------|------|--------|
| **Secondary Powers Refinement** (free) | S | "Comic book physics" for all your powers. Superspeed without tearing yourself apart. Arguably the strongest free perk in the document. |
| **Spiritual Refinement** (free) | S | Counts as having any non-purchasable prerequisite (bloodlines, species requirements). Build-enabling for magic systems with gated access. |
| **Spiritual Resource Refinement** (free) | S | All non-physical energy is interchangeable. Cast spells with ki, fuel martial arts with mana. The author admits this can be "out of hand" if pools add directly rather than averaging. |
| **Physical Health Refinement** (free) | A | Cures genetic issues, prevents cancer, voluntary fertility. The waste-removal clause (v1.13) is a quality-of-life bonus. |
| **Mental Health Refinement** (free) | A | Baseline mental health, PTSD resistance, immunities to centurion-scale ennui. Not immunity, but strong resistance. |
| **Physical Prowess Refinement** (free) | A | Half peak human fitness, no deterioration. The floor for physical capability. |
| **Mental Awareness Refinement** (free) | A | Diagnoses your own mental issues and tells you how to address them. Therapy accelerator. |
| **Soul Refinement** (free) | A | (v1.13 name; v1.12 calls this "Spiritual Awareness Refinement") Diagnoses soul state, tracks stolen soul fragments. Essential for settings with soul mechanics. |
| **Cosmetic Refinement** (free) | A | Reshape your body to any natural configuration. 0.5m to 3m height range. Pure cosmetic, no supernatural benefit. |
| **Species Refinement** (free) | A | (v1.13 name; v1.12 calls this "Cosmetic Reconfiguration") Removes species restriction from Cosmetic Refinement. Add claws, gills, wings, fur. You get an alt-form per jump based on local species. |
| **Reproductive Refinement** (free) | B | (v1.13 only; not in v1.12 HTML) Voluntary fertility, easy pregnancy, offspring inherit refinements. Situational unless you plan to have kids. |
| **Morality Refinement** (free) | B | One-time moral compass shift. Useful for self-inserts who want to adjust their psychology, but permanently lock-in is a cost. |
| **The Interface** (benefactor choice) | A | Video-game UI. Character sheet, status window, party window, quest tracker, timer, help menu, push notifications. Not player-chosen, but if your benefactor offers it, take all options. |

### Physical Perks

| Perk | Tier | Reason |
|------|------|--------|
| **Regeneration I/II** (-100/-200 EP) | S | The core survival perk. II heals severed limbs in hours and grants Ageless I for free, making the -200 tier a two-for-one. |
| **Physical Prowess I/II/III** (-50/-100/-200 EP) | A | x1/x2/x5 peak human. III removes sleep need. The multiplicative stacking with alt-forms makes this the foundation of any physical build. |
| **Physical Resistance I/II/III** (-50/-100/-200 EP) | A | Disease/toxin immunity at I, 25% damage reduction at II, 50% at III plus mutation resistance. Stacks with Regeneration for effective immortality. |
| **Ageless I/II** (-50/-100 EP) | A | I doubles lifespan. II is true immortality with slow indefinite improvement. II also lets you retain alt-form aging benefits between jumps. |
| **Environmental Tolerance I/II** (-50/-100 EP) | A | I: no breathing, -100C to +100C, space radiation. II: vacuum pressure, 1500C, total radiation immunity. II is the spacewalk tier. |
| **Reduced Sustenance I/II/III** (-50/-100/-200 EP) | B | I halves food need. II broadens diet and immunizes consumed poisons. III removes food/drink need entirely. Good for survival builds but III is overpriced compared to Environmental Tolerance I (no breathing need). |
| **Undead Physiology I-V** (-50/-100/-200/-400/-600 EP) | B | Transforms you into undead. Tiers II-V grant 400/600/800/1000 EP to spend on associated abilities. The EP rebate makes this budget-positive for Lich/Vampire builds, but it's a thematic commitment. |
| **Elemental Physiology I-V** (-50/-100/-200/-400/-600 EP) | B | Non-standard anatomy that defeats organ-targeting attacks. Tiers II-V grant EP for elemental abilities. Strong for Elemental Essence builds. |
| **Creature Soul I-V** (-50/-100/-200/-400/-600 EP) | B | Bond with an inner creature (beast or dragon). II grants a second base form. III-V grant 600/800/1000 EP for creature abilities. The EP rebate is generous but the theme is narrow. |

### Mental Perks

| Perk | Tier | Reason |
|------|------|--------|
| **Mental Resistance I/II/III** (-50/-100/-200 EP) | S | III is complete immunity to mental fatigue, memetic hazards, insanity, and mind control. The author confirms it's "not complete immunity" against Old One-tier threats, but for everything else, this is total protection. |
| **Heightened Reactions I/II** (-50/-100 EP) | A | I: rarely surprised. II: never surprised, can dodge attacks you're unaware of. The "never surprised" clause is enormous for combat survival. |
| **Mental Prowess I/II/III** (-50/-100/-200 EP) | A | Perfect memory, lightning calculation, instant text absorption. III retroactively sharpens old memories. The "no skill deterioration from disuse" clause is a hidden multiplier. |
| **Heightened Senses I/II** (-50/-100 EP) | B | I: peak senses plus input management (flashbang resistance). II: biological-maximum senses (bloodhound scent, echolocation, IR/UV). Solid utility but many jumps offer equivalent perks. |

### Spiritual Perks

| Perk | Tier | Reason |
|------|------|--------|
| **Blank I/II** (-100/-200 EP) | S | Precognition, scrying, divination, and mind reading immunity. II also defeats technological observation (cameras, radar) and lets you feed false information. The group/party protection clause extends this to companions via Essential Mutuality. The single most important defensive perk in the document. |
| **Inertia of Self I/II** (-100/-200 EP) | S | I: memory protection across time/reality alterations. II: existence/destiny protection against conceptual, temporal, and reality-warping effects. Prevents grandfather-paradox kills and prophecy binding. Cheap for what it does. |
| **Corruption Resistance** (-100 EP) | S | Total protection against supernatural soul-targeting effects: contracts, curses, possession, binding. Restores soul to whole state on pickup. Underpriced for its effect. |
| **Supernatural Resource Recovery I/II/III/IV** (-50/-100/-200/-400 EP) | A | x1/x2/x4/x10 energy recovery rate. IV recovers a non-regenerating pool daily. Essential for any magic/ki-based build. I is already strong (removes all recovery penalties). |
| **Empathetic I/II** (-50/-100 EP) | B | Read emotional states and truthfulness. II works on aliens without cultural knowledge. Useful for social builds but Charismatic and Social Mastery cover similar ground. |
| **Charismatic I/II** (-50/-100 EP) | B | Body language control, impression management. II boosts positive impressions by 50% and reduces negative ones. Supernatural concealment of intent at II is the valuable part. |
| **Wild Empathy I/II** (-50/-100 EP) | C | Communicate with sub-sapient creatures. Very niche unless your chain involves animals heavily. |
| **Unflappable** (-50 EP) | D | Stay clean and presentable in the wilderness. Pure aesthetic with minimal mechanical benefit. Take only if you have 50 EP left and nothing better. |

### Skill Perks

Skill perks use a standard tier system: I-IV give x2/x10/x100/x1000 learning speed and Familiar/Competent/Expert/Master initial knowledge. At tier IV, you reach world-class mastery in 10 hours.

| Perk | Tier | Reason |
|------|------|--------|
| **Polyglot** (-50 EP) | A | Fluency in every encountered language, 1000x learning rate for new ones (fluency in ~1 hour). Cheap, broadly useful, works in Gauntlets. |
| **Supernatural Engineer** (-200 EP) | A | Treat supernatural abilities as technology. Improve potency, efficiency, reduce components. Create new combined abilities. The "refine abilities like science" clause is unique and powerful. |
| **Martial Mastery I-IV** (-50/-100/-200/-400 EP) | B | All weapons and martial arts plus physical ki/chi techniques. The broadest combat skill perk. IV (Master, x1000 learning) makes you a world-class fighter in hours. |
| **Occult Mastery I-IV** (-50/-100/-200/-400 EP) | B | Supernatural studies and non-physical ki/chi use. Pairs with Magical Mastery for full magic system coverage. |
| **Magical Mastery I-IV** (-50/-100/-200/-400 EP) | B | Magical studies and spells. Does not grant casting directly (you need other perks for that). Essential prerequisite for any magic build. |
| **Social Mastery I-IV** (-50/-100/-200/-400 EP) | B | All social skills, body language, diplomacy, deception, plus arts and soft sciences. The Swiss army knife of social perks. |
| **Biomedical Mastery I-IV** (-50/-100/-200/-400 EP) | B | Medicine, herbalism, cybernetics, genetic engineering, magical medicine. The medical/biological Swiss army knife. |
| **Subterfuge Mastery I-IV** (-50/-100/-200/-400 EP) | B | Stealth, impersonation, surveillance, deception. The infiltration pick. |
| **Strategic Mastery I-IV** (-50/-100/-200/-400 EP) | B | Tactics, strategy, logistics, leadership morale. Applies to military, government, business. |
| **Engineering Mastery I-IV** (-50/-100/-200/-400 EP) | B | Design and fabrication. Pairs with Reverse Engineering for full tech-tree mastery. |
| **Reverse Engineering Mastery I-IV** (-50/-100/-200/-400 EP) | B | Derive designs from artifacts. Strong for tech-scavenger builds. |
| **Scientific Mastery I-IV** (-50/-100/-200/-400 EP) | B | All scientific fields. Broad but less immediately actionable than specialized masteries. |
| **Leadership Mastery I-IV** (-50/-100/-200/-400 EP) | B | Inspire and bolster followers, instill loyalty. Essential for army/kingdom builds. |
| **Wilderness Mastery I-IV** (-50/-100/-200/-400 EP) | B | Survival, primitive construction, foraging, animal handling. Survival build core. |
| **Alchemical Mastery I-IV** (-50/-100/-200/-400 EP) | B | Alchemy and potion creation. Niche but strong for crafting builds. |
| **Thanatologist** (-200 EP) | B | Death and undead proficiency across all creation methods. Modify/upgrade undead post-creation. Essential for Lich/Vampire builds, niche otherwise. |
| **Geneticist** (-200 EP) | B | DNA manipulation. Count as "familiar" with any creature whose genome you've studied. Strong for shapeshifter/biologist builds. |
| **Field Technician** (-100 EP) | C | Repair/maintain any item you can use. Good for survival but capped at your usage skill level. |
| **Natural Teacher** (-100 EP) | C | Teach effectively, students learn at 2x. You don't get bonuses to learn what you teach. Situational. |
| **Vehicle Empathy** (-100 EP) | C | Tier III skill with all vehicles and pilot-fired weapons. Niche unless your chain is vehicle-heavy. |
| **Tooth and Claw** (-100 EP) | C | Tier III skill with natural weapons (claws, fangs, tails). Only useful if you have a beast form. |
| **Natural Athlete** (-100 EP) | C | Tier III athletics skill (swimming, climbing, running, throwing). Outclassed by Physical Prowess for most builds. |
| **Natural Craftsman** (-50 EP) | C | Tier III crafting skill. Cheap but narrow. Outclassed by Engineering Mastery. |
| **Natural Homemaker** (-50 EP) | D | Tier III home maintenance (sewing, cleaning, cooking). Minimal adventuring value. |

### Supernatural Perks

These do NOT function in Gauntlets. They are convenience picks that save you from visiting specific jumps for fundamental abilities.

| Perk | Tier | Reason |
|------|------|--------|
| **Power Toggle** (-50 EP) | S | Turn off any power, perk, or ability individually. Voluntary only, immune to outside coercion. The cheapest S-tier perk in the document. Replaces the need to visit Young Justice for Toggle. |
| **Personal Immunity** (-400 EP) | S | Immunity to your own abilities and their corrupting effects. The 40k Psyker clause (corruption only in settings with a corrupting Warp) is enormous. Shares full protection with companions via Essential Mutuality. |
| **Power Drain Protection** (-400 EP) | S | Abilities cannot be drained, suppressed, stolen, copied, or altered without willing participation. "As always, drawbacks trump this perk." The single best anti-Trump defense available. |
| **Cheat Death I/II** (-400/-600 EP) | S | Survive a chain-failing death once per jump or 10 years. II reduces vulnerability to minutes (or seconds if respawning at death location) plus 1 minute of invulnerability. The chain-insurance pick. |
| **Private Reality** (-600 EP) | S | 1 km² extradimensional farmland with cottage. Integrates properties from jumps for free. Can insert into jump reality with narrative justification. The free property-import clause alone is worth the cost. |
| **Power Combination III** (-600 EP for III) | S | Combine unlimited abilities simultaneously. Merge abilities permanently into new unified powers. III removes the combination count cap. Cheaper than the sum of buying each component ability in separate jumps. |
| **Healing Touch IV** (-600 EP) | S | 50x passive healing aura. Force-heal patients in seconds. Raise the recently dead (3-minute window). Grant Physical Prowess I, Physical Resistance I, and Ageless I to others via daily treatments. The buff-others clause is build-defining for support characters. |
| **Divinity** (-600 EP, requires 1000 accumulated EP) | S | Godhood capstone. Divine portfolio, worship energy, soul routing, post-chain ascension to true godhood. The most powerful capstone in the document, locked behind an EP threshold. |
| **Master of Many Arts III** (-400 EP for III) | S | Ignore perk purchase restrictions. Buy both Light Side and Dark Side Force perks. Buy mutually exclusive magic systems. III removes prohibition-based gating entirely. |
| **Defense Piercing Techniques II** (-600 EP for II) | A | 50% of your attack penetrates any defense below Drawback/Jump Fiat level. Works against general magic immunity. Does not overcome size/toughness-based defense, only formal defenses. |
| **Reflexive Reinforcement I/II** (-400/-600 EP) | A | Dual HP bars: damage depletes energy reserves before physical integrity. Always survives one fatal blow per refill cycle. II lets you choose the split ratio. The "stop a single fatal blow" clause is the chain-saver. |
| **Heightened Reactions III/IV** (-200/-400 EP) | A | III: 1-second precognitive danger sense. IV: hours-to-days advance warning via unease/dreams, with 5-second clear warning before danger. Combat-defining for any build. |
| **Physical Prowess IV/V** (-400/-600 EP) | A | x25/x100 peak human. V makes you 100x stronger and faster than any human. The stacking with Enlarged Form IV (Titan, x1,000,000) creates truly absurd numbers. |
| **Physical Resistance IV/V** (-400/-600 EP) | A | 75%/90% damage reduction plus pain immunity (IV) and total mutation immunity (V). V effectively makes you immune to transformative attacks. |
| **Regeneration III** (-600 EP) | A | Sub-second minor healing, seconds for major, minutes for severed limbs. Survives decapitation if brain persists (regrows body in hours, or reattach head within ~1 minute for near-instant recovery). |
| **Inventory IV** (-400 EP) | A | Hundreds of slots, 999 items per slot, no weight/volume limit. Physically lift any item that would fit. The game-breaking storage tier. |
| **Energy Drain V** (-600 EP) | A | Fully configurable energy/substance drain. Touch to unlimited range, up to 10 targets, aura mode, invisible activation. The most customizable perk in the document. |
| **Kinesis IV** (-600 EP) | A | Control 20 tons of a chosen substance or blast-furnace-equivalent energy. Repeatable for different types. Pairs with Material Creation and Energy Projection for full elementalist builds. |
| **Enlarged Form IV** (-600 EP) | A | Titan Form: 100x height, x1,000,000 weight and strength. The "become a kaiju" button. Stacks with Physical Prowess for multiplicative scaling. |
| **Morphic Form III** (-200 EP) | A | At-will shapeshifting within 10% to 1,000% of base mass. Add/remove limbs, claws, fangs. The flexible-shapeshifter pick. |
| **Fantastic Beast Form II** (-600 EP) | A | Transform into any supernatural creature with no mass restriction (ant to kaiju). 400 EP budget for innate abilities. The "become a dragon" pick. |
| **Flight IV** (-600 EP) | A | Supersonic flight (1,400 kph / 870 mph). Includes sonic boom suppression with practice. The top-tier mobility perk. |
| **Spaceflight II** (-200 EP) | A | 2x speed of light in vacuum. Reach Neptune from the sun in 4 hours. Includes space hazard immunity. The interstellar travel pick. |
| **Intangible Form II** (-600 EP) | A | Ghost Form: completely intangible, pass through solid matter, immune to physical damage, reduced energy damage. Only magical damage and special materials affect you. |
| **Form Mastery III** (-200 EP) | A | Instant form changes, combine forms freely, mix-and-match supernatural abilities across forms. The shapeshifter force-multiplier. |
| **Elemental Resistance IV** (-600 EP) | B | Total immunity to one element. Repeatable for different elements. Strong but narrow per element. |
| **Bodily Reinforcement Techniques II** (-400 EP) | B | Project supernatural reinforcement outward to body and items. Invisibility, weapon channeling. The magical-equipment perk. |
| **Unusual Senses** (-200 EP) | B | One exotic sense (x-ray vision, radar, emotion sight). Repeatable. Useful but many settings offer equivalent abilities. |
| **Over-Caster** (-400 EP) | B | Pump more energy/time into spells for greater effect with diminishing returns. Strong for casters but the tapering returns limit the ceiling. |
| **Energy Projection** (-100 EP) | B | Project one energy type (kinetic, heat, magic) via one method (hand blast, breath, eye beams). Repeatable. Cheap entry to ranged combat. |
| **Material Creation** (-100 EP) | B | Create small amounts of one mundane substance (ice, stone, water). Repeatable. Cheap utility. |
| **Minion Creation III** (-600 EP) | B | Create minions in moments. Undead are permanent until destroyed. The army-builder pick, but minions are capped at "regular human" strength. |
| **Minion Empowerment IV** (-600 EP) | B | Grant minions 200 EP budgets or Essences. Buffs last one day. Strong force-multiplier for minion builds. |
| **Mental Prowess IV** (-400 EP) | B | Ultra-tech computer thought speed, dozens of parallel thought chains, fan-book reading. The intelligence capstone. |
| **Empathetic III** (-200 EP) | B | Instant emotional read on any sentient creature. One-month therapeutic treatment grants Mental Health Refinement to patients. Niche but powerful for healer/diplomat builds. |
| **Charismatic III** (-200 EP) | B | Double positive impressions, near-immunity to lasting negative impressions, control emotion-read results, truth-telling conviction. The social capstone. |
| **Copyright Enforcement** (-100 EP) | C | Your designs cannot be reverse-engineered. Niche unless you're a tech-builder in a competitive setting. |
| **Trivial Applications** (-50 EP) | C | Produce cantrip-level effects of your abilities for free. Flavorful but mechanically minor. |
| **Animal Form I/II** (-100/-200 EP) | C | Transform into 3 (I) or any (II) natural animal. Outclassed by Fantastic Beast Form for any supernatural creature. |
| **Reduced Form I-IV** (-50/-100/-200/-400 EP) | C | Shrink from Halfling (I) to Ant (IV) size. Niche unless you need infiltration forms. Stacks with other form perks. |
| **Enlarged Form I-III** (-100/-200/-400 EP) | C | Ogre/Giant/Colossus forms. Only IV (Titan) is worth the cost for combat purposes. I-III are stepping stones. |

### Item Perks

| Perk | Tier | Reason |
|------|------|--------|
| **Essential Comforts II** (-100 EP) | A | Start every jump with lower-upper-class housing, transport, wardrobe, income, and communications. Bring personal possessions across settings. The "never start destitute" perk. |
| **Essential Annexation IV** (-600 EP) | A | Claim and keep a star system's worth of property from jumps. Connects to your Warehouse or Private Reality. The property-import capstone. |
| **Essence Infusion** (-100 EP) | B | Grant one non-CP item fiat protection (respawns each jump). One extra use per 10 jumps completed. Good for protecting acquired gear. |
| **Essential Item** (-100 EP) | B | One fiat-backed item appears at arm's reach each jump, including Gauntlets (conforming to local tech level). The gauntlet-safe item import. |
| **Essence Integration** (-100 EP) | B | Cybernetics and internal magitech count as base form. Functions in Gauntlets at Physical/Mental perk cap. The augmentation perk. |
| **Essential Comforts I** (-50 EP) | C | Basic dwelling, transport, wardrobe, month of supplies, small income. The budget tier of Essential Comforts. |

### Companion Perks

| Perk | Tier | Reason |
|------|------|--------|
| **Essential Mutuality** (-200 EP) | S | Companions gain half-strength versions of your non-physical defensive perks. Blank and Personal Immunity grant FULL benefit. The force-multiplier for companion survival. |
| **Essence Network I/II** (-400/-600 EP) | A | Essence Link for 8 companions per purchase. I gives half your EP to each. II lets them unlock Essences. The mass-companion-sharing pick. |
| **Essential Companion IV** (-600 EP) | A | Import one companion into any jump for free, including Gauntlets (conforming to local standards). Gauntlet protections apply. The companion portability capstone. |
| **Essence Link I/II** (-100/-200 EP) | A | Share half your accumulated EP with one companion. II lets them unlock their own Essence. The single-companion sharing pick. |
| **Essence Investment** (-200 EP) | B | Lend perks to companions between jumps. Perks return at jump end regardless of what happened. Flexible but temporary. |
| **Essential Legacy** (-200 EP) | B | Children grow into your powers. +100 CP per 2 years to buy your perks at your discounted price. The dynasty-building pick. |
| **Essence Transfer** (Variable) | B | One-way EP transfer to companions. Flexible but you lose the EP permanently. |
| **Essential Followers** (-50 EP) | B | Followers enter jumps for free, gain survival basics, and can use your CP-supported abilities. Scale depends on jump scope. Cheap but situational. |

### Drawbacks (Ranked by Point Efficiency)

Drawbacks grant EP once. Higher tier means better point-to-inconvenience ratio.

| Drawback | Tier | EP | Reason |
|----------|------|----|--------|
| **Wardrobe Malfunction I** | S | +50 | Clothing lags 1-2 seconds during shapeshifting. Pure inconvenience, no mechanical penalty if you have Cosmetic Refinement or private shifting spaces. Free 50 EP. |
| **Dependency** | A | +100 | Need a specific substance. Adapts to your environment and abilities. Alcohol, exotic foods, etc. Manageable with Reduced Sustenance or planning. |
| **Standout I (Noticed)** | A | +100 | You stand out in crowds, benign interest. Minimal penalty if you have Blank or don't need stealth. |
| **Unnatural Presence** | B | +100 | Animals react to you. Dogs bark, deer flee, crows flock. Nuisance in rural settings, irrelevant in urban or space settings. |
| **Softhearted** | B | +100 | Compelled to help sob stories and finish the job. Significant for ruthless builds, negligible for heroic ones. |
| **Lovable Goof** | B | +100 | Lose charisma/empathy perks, but social failures are "awkwardly adorable." Net neutral if you weren't investing in charisma anyway. |
| **Elemental Vulnerability** | B | +50 | 2x damage from one element, cannot be reduced. Risky but the element is your choice. Pick something rare in your chain. |
| **Dread** | B | +100 | Three supernatural compulsions (repelled by faith objects, can't lie to holy men, etc.). Annoying but quirky, not life-threatening. |
| **Compelled** | B | +100 | Three compelled activities (anagram names, hoard gold, can't refuse aid). Similar to Dread but self-driven rather than trigger-driven. |
| **Unstackable I** | C | +50 | Body Mod abilities only stack with base alt-form capabilities. Significant power reduction for multi-form builds. |
| **Vulnerability I** | C | +100 | Specific substance ignores defenses or causes damage. Enemies will obtain it. The "ensures your enemies can create an equivalent" clause is dangerous. |
| **Achilles Heel** | C | +100 | Unprotectable vulnerability. Dedicated enemies always have a chance to exploit it. High-risk for only 100 EP. |
| **Standout III (Provocative)** | C | +300 | Fight/flight/food/mating visceral reaction from everyone. 300 EP is a lot, but this makes social interaction extremely difficult. |
| **Unstackable II** | D | +100 | Body Mod abilities don't stack at all. Massive power reduction. Only worth it if you're desperate for EP and have no alt-forms. |
| **Vulnerability II** | D | +200 | Severe vulnerability (flesh melts in sunlight, silver contact damage). Fatal within seconds for exotic materials. Too dangerous for the points. |
| **Standout II (Unnerving)** | D | +200 | Visceral unease in all who notice you. Authorities always look for you. Severe social and infiltration penalty. |

---

## §4. Limiters & Variant Modes

### Limiters

Limiters are optional restrictions that define the power ceiling of your build. You may select one. They are mandatory for some playstyles (Gauntlet-focused, narrative-balanced) and self-imposed challenges for others.

| Limiter | Effect | When to take it |
|---------|--------|-----------------|
| **Everyday Hero** | No perk costing >100 EP before discounts | True street-level chains. Forces creative budget use. |
| **Street Level** | No perk costing >100 EP after discounts | Similar to Everyday Hero but discounts matter. Slightly more permissive with a good Essence. |
| **Mid Level** | No perk costing >200 EP after discounts | The middle ground. Allows most tier-2 perks but blocks capstones. |
| **Base Form** | No Supernatural perks. Free Supernatural perks from Essence become +50 EP each | The Gauntlet-purist pick. Ensures everything you buy works in Gauntlets. |
| **Scaling Limiter I** | Choose a limiter. At 1000 total EP, raise it one grade | For chains that start restricted and open up. Good narrative progression. |
| **Scaling Limiter II** | Choose a limiter. At 500 EP raise one grade, at 1000 raise again | Faster scaling version of I. |
| **Vanishing Limiter** | Choose a limiter. At 1000 total EP, remove all limiters | The "training wheels" pick. Start restricted, graduate to unlimited. |

**Min-max verdict.** Vanishing Limiter with Street Level is the optimal Limiter combo for long chains. You start with a reasonable power ceiling (100 EP per perk after discounts), and once you've accumulated 1000 EP (achievable in 5-10 jumps with Meteoric Advancement), all restrictions vanish. Base Form Limiter is the pick for Gauntlet-focused chains since it ensures every perk you buy is Gauntlet-legal.

### Variant Modes

**Balanced:**
- **Training Allowance** (requires Standard Advancement + No Access): Train perks through superhuman effort. No EP refunds. The "earn it through play" mode. Only usable when you can't buy more with EP.
- **Tempered by Suffering** (incompatible with Retroactive Cumulative): +100 EP per Gauntlet completed before taking this supplement. Retroactive Gauntlet credit.

**Unbalanced (explicitly labeled by the author):**
- **Harmonized Essence Mode** (requires Dual Essence): Remove drawback requirement for 2 Essences.
- **Very Harmonized Essence Mode** (requires Multi-Essence): Reduce drawback requirement by 300 EP.
- **Perfectly Harmonized Essence Mode** (requires Multi-Essence): Remove all drawback requirements for multiple Essences.

The Harmonized modes are the most point-efficient options in the document if your table allows them. Perfectly Harmonized Multi-Essence gives you 3+ Essences (each with ~3500 EP in discounts and 11 free perks) for zero drawback cost. This is explicitly unbalanced and should only be used in high-power chains or solo play.

---

## §5. Synergies

### [DEF] The Unkillable Stack

**Regeneration II + Physical Resistance III + Ageless II + Environmental Tolerance II**

- Physical Resistance III: 50% damage reduction, mutation resistance
- Regeneration II: severed limbs in hours, free Ageless I
- Ageless II: true immortality, slow indefinite improvement
- Environmental Tolerance II: vacuum, 1500C, total radiation immunity

Total cost: 200 + 200 + 100 + 100 = 600 EP (300 EP with a stacking Essence discount). You are immune to age, disease, toxin, radiation, vacuum, extreme temperature, and regenerate from anything short of brain destruction. This is the defensive floor for any survival-focused build.

### [DEF] The Information Blackout

**Blank II + Mental Resistance III + Corruption Resistance + Inertia of Self II**

- Blank II: immune to all scrying, divination, mind reading, and technological observation. Can feed false information.
- Mental Resistance III: complete immunity to mind control, memetic hazards, insanity.
- Corruption Resistance: soul cannot be bound, possessed, contracted, or cursed.
- Inertia of Self II: immune to memory alteration, time-travel kills, reality warping, destiny/prophesy binding.

Total cost: 200 + 200 + 100 + 200 = 700 EP (350 EP with appropriate Essence discounts). You are invisible to every form of information gathering, immune to every form of mental/spiritual assault, and protected against timeline manipulation. No precog can find you, no Master can control you, no curse can touch you, and no time traveler can unmake you.

### [META] The Gauntlet Survival Kit

**Power Toggle + Base Form Limiter + every Physical/Mental/Spiritual perk**

- Power Toggle (-50 EP): the only supernatural perk that's cheap enough to be worth it even if you're running Base Form Limiter. Wait, it's in the Supernatural section. Under Base Form Limiter, you cannot take it. Correction: Power Toggle is Supernatural and is blocked by Base Form Limiter.
- The actual Gauntlet kit is: Physical Prowess III, Physical Resistance III, Regeneration II, Mental Resistance III, Blank I, Corruption Resistance, Environmental Tolerance I. All non-Supernatural, all Gauntlet-legal.

Total cost: 200 + 200 + 200 + 200 + 100 + 100 + 50 = 1050 EP. This is a lot, but with Heroic Start (500 EP) + Essence discounts (50% on most of these) + Meteoric Advancement over a few jumps, it's achievable.

### [PWR] The Shapeshifter Force-Multiplier

**Species Refinement (free) + Form Mastery III + Morphic Form III + Fantastic Beast Form II + Master of Many Arts III**

- Species Refinement: flexible base form with biological advantages
- Form Mastery III: instant form changes, combine forms freely, mix supernatural abilities across forms
- Morphic Form III: at-will shapeshifting within 10% to 1,000% mass
- Fantastic Beast Form II: any supernatural creature, ant to kaiju, 400 EP ability budget
- Master of Many Arts III: ignore perk restrictions on conflicting abilities per form

Total cost: 0 + 200 + 200 + 600 + 400 = 1400 EP. You can be anything, anytime, with any combination of abilities. Form Mastery III lets you cherry-pick which aspects of each form to use simultaneously.

### [PWR] The Kaiju Multiplier

**Physical Prowess V + Enlarged Form IV + Physical Resistance V**

- Physical Prowess V: x100 peak human baseline
- Enlarged Form IV (Titan Form): x1,000,000 weight and strength multiplier
- Physical Resistance V: 90% damage reduction, total mutation immunity

Total cost: 600 + 600 + 600 = 1800 EP. At Titan size with Physical Prowess V, your strength is x100 peak human TIMES x1,000,000 from Titan Form. The author notes "the suggestion about diminishing returns... is even stronger at this level," meaning your benefactor may cap the multiplication. Even at conservative stacking (additive rather than multiplicative), this is continent-shaking power.

### [UTIL] The Resource Engine

**Spiritual Resource Refinement (free) + Supernatural Resource Recovery IV + Over-Caster + Energy Drain V**

- Spiritual Resource Refinement: all non-physical energy is interchangeable
- Supernatural Resource Recovery IV: x10 recovery rate, non-regenerating pools recover daily
- Over-Caster: pump more energy into spells for greater effect
- Energy Drain V: drain energy from any source at unlimited range, configurable

Total cost: 0 + 400 + 400 + 600 = 1400 EP. You have a unified energy pool that recovers 10x faster than normal, can be refilled from any source via Energy Drain, and can be dumped into spells via Over-Caster. Effectively unlimited magical output.

### [META] The Companion Network

**Essential Mutuality + Essence Network II + Essential Companion IV + Blank II + Personal Immunity**

- Essential Mutuality: companions get half your defensive perks
- Essence Network II: 8 companions get half your EP and can unlock Essences
- Essential Companion IV: import one companion anywhere, including Gauntlets
- Blank II: full benefit to companions via Mutuality
- Personal Immunity: full benefit to companions via Mutuality

Total cost: 200 + 600 + 600 + 200 + 400 = 2000 EP. Your companion roster is nearly as durable as you are, with full Blank and Personal Immunity protection. This is the party-build capstone.

### [DEF] The Chain Insurance

**Cheat Death II + Reflexive Reinforcement II + Inertia of Self II**

- Cheat Death II: survive one chain-failing death per jump, respawn in minutes with 1 minute invulnerability
- Reflexive Reinforcement II: dual HP bars, absorb any single fatal blow per energy refill cycle
- Inertia of Self II: immune to existence erasure, destiny manipulation, temporal kills

Total cost: 600 + 600 + 200 = 1400 EP. Three layers of chain-failure prevention. Reflexive Reinforcement stops the first fatal blow, Cheat Death saves you if that fails, and Inertia of Self prevents the timeline from being rewritten to erase you.

---

## §6. Build Archetypes

### 1. The Immortal Warrior

**Concept:** Unkillable melee fighter who wins through attrition and raw physical dominance.

**Core perks:** Physical Prowess III-V, Physical Resistance III-V, Regeneration II-III, Ageless II, Heightened Reactions II-IV, Martial Mastery IV, Reflexive Reinforcement I-II, Cheat Death I-II.

**Essence:** Brute or Superior. Both discount the entire physical defensive stack.

**Mode:** Heroic Start + Single Essence + Meteoric Advancement + Retroactive Cumulative Standard Access. 500 EP upfront lets you buy the core kit immediately.

**Playstyle:** Walk into melee, absorb damage with Physical Resistance and Reflexive Reinforcement, regenerate everything, and respond with Heightened Reactions precognition. Cheat Death and Inertia of Self are your safety nets.

### 2. The Mystic Scholar

**Concept:** Master of all magical and supernatural systems, with the intellect to combine them.

**Core perks:** Magical Mastery IV, Occult Mastery IV, Supernatural Engineer, Master of Many Arts III, Power Combination III, Mental Prowess III-IV, Supernatural Resource Recovery IV, Over-Caster, Blank II.

**Essence:** Archmage or Scholar. Archmage discounts Magical Mastery, Blank, and most casting-adjacent perks. Scholar discounts Mental Prowess, Occult Mastery, and Supernatural Engineer.

**Mode:** Standard Start + Single Essence + Meteoric Advancement + Retroactive Cumulative Standard Access. The long game: start with core magic theory, scale into combination abilities over jumps.

**Playstyle:** Learn every magic system you encounter, combine them with Power Combination and Supernatural Engineer, and ignore conflicting-ability restrictions with Master of Many Arts III. Master of Many Arts III is the key perk: it lets you buy mutually exclusive magic systems from jumps.

### 3. The Social Chameleon

**Concept:** Master diplomat, infiltrator, and manipulator who never needs to fight.

**Core perks:** Charismatic III, Empathetic III, Social Mastery IV, Subterfuge Mastery IV, Blank II, Polyglot, Mental Resistance III, Supernatural Resource Recovery I (for sustained charm effects).

**Essence:** King or Healer. King discounts Charismatic, Subterfuge, and Social Mastery. Healer discounts Empathetic, Social Mastery, and Charismatic.

**Mode:** Standard Start + Single Essence + Standard Advancement + Standard Access. Social builds don't need massive EP; they need consistent growth.

**Playstyle:** Read anyone instantly (Empathetic III), control impressions (Charismatic III), lie to supernatural detection (Blank II), and communicate in any language (Polyglot). You win encounters before they become fights.

### 4. The Self-Sufficient Survivor

**Concept:** Complete independence from external support. Survives any environment, any Gauntlet, any drawback.

**Core perks:** Reduced Sustenance III, Environmental Tolerance II, Regeneration II, Ageless II, Physical Resistance III, Mental Resistance III, Blank I, Corruption Resistance, Essential Comforts II, Inventory III.

**Essence:** Explorer or Superior. Explorer discounts survival-adjacent perks and Heightened Senses. Superior discounts the defensive stack.

**Mode:** Body Mod Mode (Standard Start + Single Essence + Standard Advancement + No Access + Training Allowance). The faithful body-mod-replacement mode. You get 100 EP and one Essence, then train up from there.

**Playstyle:** Never need food, water, air, or sleep. Immune to disease, toxin, radiation, vacuum, extreme temperature. Regenerate from anything. This is the Gauntlet-proof baseline. Every perk is non-Supernatural, so it all works under power-loss conditions.

### 5. The Liminal Shapeshifter

**Concept:** Fluid identity. Be anything, anyone, at any time, with any combination of abilities.

**Core perks:** Species Refinement (free), Form Mastery III, Morphic Form III, Fantastic Beast Form II, Animal Form II, Reduced Form IV, Enlarged Form IV, Master of Many Arts III, Power Combination II-III, Geneticist.

**Essence:** Shapeshifter. Discounts Morphic Form, Form Mastery, and most form perks.

**Mode:** Standard Start + Single Essence + Meteoric Advancement + Retroactive Cumulative Standard Access. Shapeshifter builds are EP-hungry because form perks are expensive and numerous.

**Playstyle:** Adapt to any situation by changing form. Be a mouse for infiltration, a kaiju for combat, a specific person for infiltration. Form Mastery III lets you mix aspects of multiple forms simultaneously. Master of Many Arts III ensures your forms can use conflicting ability sets.

---

## §7. Sample Builds

### Build 1: The Essential Baseline (Essential Mode, 100 EP + Essence)

**Mode:** Essential Mode (Standard Start + Single Essence + Standard Advancement + Standard Access)
**Essence:** Superior
**Starting EP:** 100

| Perk | Cost (discounted) | Effect |
|------|-------------------|--------|
| Mental Resistance III | 100 EP (50% Superior discount from 200) | Complete mind control / memetic immunity |
| **Total** | **100 EP** | |

**Remaining:** 0 EP.

**Analysis:** This is the minimum viable defensive build. Mental Resistance III alone makes you immune to the most dangerous category of chain-ending effects. Everything else can be bought later via Lesser/Greater Essence Infusion (50/100 CP per jump for 50/100 EP).

**Growth path (next 5 jumps with Standard Access):**
- Jump 2: Greater Essence Infusion (-100 CP) → +100 EP → Blank I (50 EP discounted from 100) + Physical Resistance I (25 EP discounted from 50) + carry 25 EP
- Jump 3: Greater Essence Infusion (-100 CP) → +100 EP + 25 carried → Regeneration I (50 EP discounted from 100) + Physical Prowess I (25 EP discounted from 50) + carry 50 EP
- Jump 4: Greater Essence Infusion (-100 CP) → +100 EP + 50 carried → Blank II (100 EP discounted from 200) + carry 50 EP
- Jump 5: Greater Essence Infusion (-100 CP) → +100 EP + 50 carried → Regeneration II (100 EP discounted from 200, grants free Ageless I) + Physical Resistance II (50 EP discounted from 100)

After 5 jumps you have: Mental Resistance III, Blank II, Regeneration II (with free Ageless I), Physical Prowess I, Physical Resistance II. This is a solid defensive foundation for 500 CP total investment spread across 5 jumps.

### Build 2: The Heroic Defender (Heroic Start, 500 EP + Essence)

**Mode:** Heroic Start + Single Essence (Superior) + Meteoric Advancement + Retroactive Cumulative Standard Access
**Essence:** Superior
**Starting EP:** 500

| Perk | Cost (discounted) | Effect |
|------|-------------------|--------|
| Physical Prowess III | 100 EP (from 200, Superior 50%) | x5 peak human, no sleep |
| Physical Resistance III | 100 EP (from 200, Superior 50%) | 50% damage reduction, mutation resistance |
| Regeneration II | 100 EP (from 200, Superior 50%) | Severed limbs in hours, free Ageless I |
| Mental Resistance III | 100 EP (from 200, Superior 50%) | Mind control immunity |
| Blank I | 50 EP (from 100, Superior 50%) | Scrying/divination immunity |
| Power Toggle | 50 EP (no discount) | Turn off any ability voluntarily |
| **Total** | **500 EP** | |

**Analysis:** This is the complete defensive starter kit. You are x5 peak human, take half damage from everything, regenerate limbs in hours, are immune to mind control and supernatural information gathering, and can selectively disable any problematic ability. Power Toggle is the wildcard: it handles situations where a perk would be counterproductive (e.g., turning off Blank to let an ally scry you, or turning off an always-on defensive aura).

With Meteoric Advancement (+100 EP per jump), by jump 5 you have 900 additional EP to spend on the Spiritual defensive stack (Corruption Resistance, Inertia of Self, Blank II upgrade) and the supernatural utility layer.

### Build 3: The Gauntlet Purist (Base Form Limiter)

**Mode:** Standard Start + Single Essence (Superior) + Meteoric Advancement + Retroactive Cumulative Standard Access + Base Form Limiter
**Essence:** Superior
**Starting EP:** 100

**Limiter effect:** No Supernatural perks. If Superior would grant a free Supernatural perk, gain +50 EP instead.

| Perk | Cost (discounted) | Effect |
|------|-------------------|--------|
| Physical Resistance III | 100 EP (from 200, Superior 50%) | 50% damage reduction |
| Regeneration II | 100 EP (from 200, Superior 50%) | Limb regen, free Ageless I |
| **Total** | **200 EP** | |

**Over budget by:** 100 EP. Adjust by taking one drawback (Wardrobe Malfunction I for +50 EP, Dependency for +100 EP) or dropping to Physical Resistance II (50 EP discounted) and adding Mental Resistance I (25 EP discounted) + Blank I (50 EP discounted) = 225 EP total, within 100 EP + 125 EP from drawbacks.

**Analysis:** Every perk is Gauntlet-legal. You walk into any Gauntlet with disease/toxin immunity, 25-50% damage reduction, limb regeneration, agelessness, and mind control resistance. The Base Form Limiter costs you access to Power Toggle, Cheat Death, and the entire Supernatural utility layer, but ensures nothing you buy is wasted when a Gauntlet strips your powers.

### Build 4: The Chain God (Long-chain capstone)

**Mode:** Heroic Start + Multi-Essence (Perfectly Harmonized) + Meteoric Advancement + Retroactive Cumulative Standard Access
**Essences:** Superior + Archmage + King (no drawback cost via Perfectly Harmonized)
**Starting EP:** 500
**Accumulated EP (jump 10):** 500 + 1000 (Meteoric) + ~1000 (Retroactive CP conversion) = ~2500 EP
**Divinity requirement:** 1000 accumulated EP (met by jump 5-6)

| Capstone perks | Cost | Effect |
|----------------|------|--------|
| Divinity | 600 EP | Godhood, divine portfolio, worship energy, soul routing |
| Power Combination III | 600 EP | Combine unlimited abilities |
| Private Reality | 600 EP | 1 km² extradimensional space, free property import |
| Personal Immunity | 400 EP | Immune to own abilities |
| Power Drain Protection | 400 EP | Abilities can't be stolen/suppressed |
| Healing Touch IV | 600 EP | Raise dead, buff allies to Physical Prowess I + Ageless I |
| Cheat Death II | 600 EP | Chain-fail insurance |
| **Total capstones** | **3800 EP** | Achievable by jump 15-20 with all EP sources |

**Analysis:** This is the endgame build. Divinity is the capstone that transforms you from a powerful Jumper into a literal god. By the time you can afford this stack, you have: a divine portfolio boosting your Essence-related skills, worship energy as a passive resource, the ability to route follower souls to your Private Reality (which you've expanded into an afterlife), complete immunity to your own abilities, un-drainable powers, the ability to combine any number of abilities simultaneously, and the power to raise the dead and buff your followers to superhuman levels.

---

## §8. Edge Cases & Rulings

### Blank II and Direct Observation

The v1.12 HTML and v1.13 differ on a key point. The v1.12 HTML states:

> "Even mundane versions of the above items do not function against you."

The v1.13 canonical text is more precise:

> "As tier I, plus it is effective against direct observation by technological or magical means (such as cameras, x-ray scanners, radar, and magical equivalents)... This is not effective against the senses of living beings, but it may be effective against artificial lifeforms at your discretion."

**Ruling:** Blank II defeats all technological and magical observation but NOT the direct senses of living beings. A person looking at you with their eyes still sees you. A camera does not. An artificial lifeform (android, AI drone) is a gray area left to benefactor discretion. This is a significant clarification from v1.12, which could be read as defeating mundane observation entirely.

### Spiritual Resource Refinement Power Level

The author himself flagged this as ambiguous:

> "The power level of Spiritual Resource Refinement depends on how you interpret the combined resource pool. If they all add directly on top of each other and you go from 5 spells + 5 ki blasts to 10 spells or ki blasts, it can get out of hand in short order. If it goes to 5.5 or 6... less so. I tend to look at it as mostly a convenience item instead of a power boost."

**Ruling:** Two valid interpretations. The "convenience" reading (pools are merged but total capacity stays similar) is balanced. The "additive" reading (pools stack directly, doubling or tripling total capacity) is game-breaking for multi-system casters. Clarify with your benefactor before building around this perk.

### Mental Resistance III and Old One-Tier Threats

The author clarified in comments:

> "It's just not complete immunity, which means long term exposure or very intense exposure (like sticking your face into an Old One or something) would overcome it."

**Ruling:** Mental Resistance III is complete immunity for all normal purposes but can be overwhelmed by cosmic-tier memetic threats (Lovecraftian entities, reality-warping madness auras). For chains that include such settings, pair with Corruption Resistance and Inertia of Self for layered defense.

### Stacking Physical Prowess with Size-Changing Perks

The Enlarged Form perk multiplies strength by a factor tied to size. Physical Prowess multiplies the base. The interaction is unclear:

> "It is suggested, but not required, that the physical abilities gained through this shift and those from other sources such as Physical Prowess be considered the same thing for purposes of diminishing returns."

**Ruling:** The author suggests treating them as the same source (diminishing returns) rather than multiplicative. A Jumper with Physical Prowess V (x100) and Enlarged Form IV (Titan, x1,000,000 strength) would NOT have x100,000,000 strength under this reading. Instead, the larger multiplier dominates and the smaller one adds marginally. Conservative tables should apply this rule. Power-gaming tables may allow full multiplication, but the author explicitly flags this as not recommended.

### Undead/Elemental/Creature Physiology EP Budget

These perks grant EP to spend on associated abilities at tiers II-V. The key question: does this EP count toward mode limits or Divinity requirements?

> "While these EPs are part of your base form, the abilities purchased with these EPs are treated as any other for purposes of determining access within Gauntlets."

**Ruling:** The EP is restricted to the associated ability lists (Vampire abilities for Undead Physiology, elemental abilities for Elemental Physiology, etc.). It does count as accumulated EP for Divinity's 1000 EP threshold, since it's "part of your base form." However, the restricted spending limits its effective value compared to unrestricted EP.

### Cheat Death and Warehouse Respawning

> "You may only resurrect in an area which could reasonably be accessed by a determined enemy, so choosing to have your respawn point inside your Warehouse is likely to severely undermine your security."

**Ruling:** Cheat Death cannot be safely chained with Warehouse respawning. If you set your respawn point inside your Warehouse, the perk's protection is undermined (presumably meaning enemies can follow you in, or the respawn fails). The safest respawn points are areas that are accessible but defensible.

### UDS Drawback Conversion

The author explicitly allows Universal Drawbacks Supplement points to convert to EP:

> "At your discretion, you may apply the points gained from Chain Drawbacks in the Universal Drawbacks Supplement to this as EP in this document. If you do so, you may not put the drawbacks on hiatus and you only gain the points once."

**Ruling:** UDS chain drawbacks can be converted to EP at 1:1 ratio. The drawbacks must remain active (no hiatus) and points are granted once. Revoking the drawbacks requires paying back the EP. This is a significant budget lever for chains using both supplements.

### The "Familiar" Requirement for Form Perks

> "When a perk requires you to be 'familiar' with a creature, that usually equates to having seen and touched a living specimen or having done extensive examinations of dead specimens."

**Ruling:** "Familiar" requires physical contact with a living specimen OR extensive study of dead specimens. Seeing a creature on TV or in a book is not sufficient. Geneticist perk expands this: studying genetic data counts as becoming familiar.

---

## §9. Power Creep Assessment

### EBMS vs. Quicksilver Body Mod

The original Quicksilver Body Mod is a 600-point supplement. swordchucks directly addresses it:

> "The Quicksilver Body Mod is a 600 point supplement and very outdated (it spends a ton of time charging you for cosmetics, for instance)."

**Where EBMS wins:**
- Cosmetics are free (Basic Refinements) instead of costing points
- The Mode system allows for scaling power across an entire chain, not just a one-time purchase
- The Essence discount system effectively doubles your purchasing power on themed builds
- Supernatural perks offer capabilities Quicksilver never touches (Flight, Kinesis, Power Combination, Divinity)

**Where Quicksilver is competitive:**
- Simplicity. 600 points, pick your perks, done. No mode math, no Essence selection, no advancement tracking.
- The top speed comparison: Quicksilver gives "Usain Bolt on a motorcycle," EBMS Physical Prowess III gives 200 kph sprint / 100 kph run. The author notes EBMS is "actually a slight downgrade" from SB Body Mod's 250 kph, though both exceed Quicksilver's vague benchmark.

**Verdict:** EBMS strictly dominates Quicksilver in capability and flexibility. The only reason to use Quicksilver instead is simplicity or chain-rule restrictions.

### EBMS vs. SB Body Mod

The SB Body Mod (by Insertrandomnickname and TangledLion) is a 1000-point supplement. swordchucks calibrated EBMS against it:

> "I've tried to keep things roughly balanced against the SB Body Mod supplement, which is a 1000 point supplement."

> "The SB Body Mod should be roughly balanced against the non-Supernatural perks in this document after you've gained a few hundred EP."

**Where EBMS wins:**
- Chain-long scaling. SB Body Mod is fire-and-forget. EBMS grows with your chain via Advancement and EP Access modes.
- The Supernatural section. SB Body Mod has no equivalent to Flight, Kinesis, Power Combination, Divinity, Private Reality, etc.
- The Essence system. Themed discounts and free perks have no SB Body Mod equivalent.
- Companion and Item perks. SB Body Mod doesn't integrate with companion systems or property import.

**Where SB Body Mod is competitive:**
- Upfront simplicity. 1000 points, buy what you want, no mode selection.
- The SB Body Mod's Resilience at max level lets you "walk off shots to 'non-critical' parts of your body," which the author admits is comparable to EBMS Regeneration in some ways.

**Verdict:** EBMS at 500+ accumulated EP matches or exceeds SB Body Mod in every category. Below that threshold (100 EP starting), EBMS is weaker because you can't afford the full defensive stack. The Mode system is EBMS's key advantage: it scales with chain length while SB Body Mod is static.

### Where EBMS Sits on the Balance Spectrum

EBMS is a **mid-to-high power supplement** that scales with investment. At 100 EP (Essential Mode start), it's comparable to other body mods. At 500 EP (Heroic Start), it's noticeably stronger. At 1000+ accumulated EP (long chain with Meteoric Advancement), it enters territory that other body mods can't reach without specific jump perks.

The Supernatural section is explicitly flagged as unbalanced convenience content. The author states these perks exist "largely as a convenience (so you can pick up both very core and very niche abilities without having to go to specific jumps to get them)." They are not intended for Gauntlet use and should be treated as bonus capabilities, not core build material.

The unbalanced Variant Modes (Harmonized Essence) and the lack of hard caps on stacking (Physical Prowess V + Enlarged Form IV) mean EBMS can scale to cosmic power levels in long chains. This is by design: the supplement is meant to grow with your chain, and a Jumper on jump 30 should be vastly more powerful than one on jump 3.

---

## §10. Cross-Supplement Synergy Hooks

These are pointers for the cross-supplement synergy docs. Full analysis will be done after all 5 supplement docs are complete.

### Universal Drawbacks Supplement (UDS)

- **UDS Chain Drawbacks → EP:** The author explicitly allows converting UDS chain drawback points to EP at 1:1 ratio. This is the single largest external budget lever for EBMS. A typical UDS drawback stack can generate 500-1000+ EP.
- **UDS "No Access" Drawback:** The UDS drawback that adds Warehouse Points to Body Mod when you lack a Warehouse can be converted to EP. The author suggests 150 EP (simplicity), 250 EP (proportional scaling from Quicksilver's 600-point base to SB's 1000-point base), or a contextual amount based on your EP-per-jump rate.
- **Drawback overlap:** EBMS drawbacks and UDS drawbacks can coexist. EBMS drawbacks grant EP once; UDS drawbacks grant CP per jump. Both can be active simultaneously.

### Personal Reality Supplement (PRS)

- **Private Reality integration:** EBMS Private Reality perk (-600 EP) explicitly integrates with Warehouse and property import systems. PRS Warehouse Points can expand or enhance the Private Reality.
- **Essential Annexation:** The property-claiming perk connects to your "cosmic warehouse or similar reality." If you're using PRS, this connects to your Personal Reality.
- **Property import:** Private Reality's free property import clause ("if a jump has an option to import or merge a property, if you import/merge with the Private Reality, you get that option for no CP") synergizes with PRS property management.

### Generic First Jump (GFJ)

- **Perk overlap:** EBMS explicitly incorporates "perks and items which are similar to many perks and items found in 'first jump only' jumps in order to reduce the 'mandatory' nature of such jumps." Using EBMS with GFJ is "not generally recommended" because of this redundancy.
- **Survival perks:** EBMS's free Basic Refinements cover most of what GFJ offers for basic survival (health, fitness, mental stability). The Regeneration, Ageless, and Environmental Tolerance perks cover the rest.
- **If using both:** Treat EBMS as the body mod layer and GFJ as a jump. EBMS perks stack with GFJ perks unless you take the Unstackable drawback.

### SB Body Mod

- **Not compatible simultaneously.** The author states EBMS "should generally not be used with other body modification supplements." If transitioning from SB Body Mod to EBMS, use Essential Mode and treat your existing SB Body Mod purchases as roughly equivalent to 200-300 EP of EBMS perks.

### Quicksilver Body Mod

- **Same incompatibility as SB Body Mod.** If transitioning, the author suggests Essential Mode. Quicksilver's 600 points roughly equate to 200 EP of EBMS perks after accounting for cosmetics being free in EBMS.

---

## Appendix: Peak Human Benchmarks

From the Additional Notes section (v1.13):

> "Some reasonable numbers to use for peak human performance are as follows (these are slightly lower than true maximum, but they give round numbers that work well with the math)."

| Attribute | Peak Human | x5 (PP III) | x25 (PP IV) | x100 (PP V) |
|-----------|-----------|-------------|-------------|-------------|
| Overhead lift | 250 kg (550 lbs) | 1,250 kg | 6,250 kg | 25,000 kg |
| Sprint | 40 kph (25 mph) | 200 kph | 1,000 kph | 4,000 kph |
| Run | 20 kph (12 mph) | 100 kph | 500 kph | 2,000 kph |
| Endurance | 3 days without sleep | No sleep needed | No sleep needed | No sleep needed |

Deadlift numbers are approximately 2x overhead lift for unassisted, 3x for assisted.

**Note on strength scaling:** These are clean-and-jerk numbers (ground to overhead). For context, the world record clean and jerk is ~266 kg. The 250 kg benchmark is slightly below true maximum for round-number math.

## Appendix: Skill Tier Benchmarks

| Tier | Knowledge level | Learning speed | Time to mastery |
|------|----------------|----------------|-----------------|
| I | Familiar (10 hrs) | x2 | 5,000 hrs to Master |
| II | Competent (100 hrs) | x10 | 1,000 hrs to Master |
| III | Expert (1,000 hrs) | x100 | 100 hrs to Master |
| IV | Master (10,000 hrs) | x1,000 | 10 hrs to Master |

At tier IV, you can become a world-class master in any covered skill in 10 hours of study. All skill learning perks stack multiplicatively with external learning boosters.

---

*Document end. This analysis covers EBMS v1.13. For the partial v1.12 HTML source in `sources/`, see the source note at the top of this document.*
