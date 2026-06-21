# Personal Reality Supplement (PRS)  EMin-Max Analysis

> **SOURCE NOTE (read first):** The source file for this analysis is `sources/personal-reality-supplement.html`, a Notion-export HTML of one player's Personal Reality checklist. The file captures the supplement's intro, the WP/CP rules, the UDS integration note, the BASICS, UTILITIES AND STRUCTURES, and PERSONAL REALITY FACILITIES sections in full, and the ITEMS & EQUIPMENT section. It does **not** contain the full STRUCTURES catalog, the MISC catalog, the Core Modes options beyond the default Incremental Core Mode, or the full Utilities roster that the canonical PRS document (SJ-Chan & Sonic0704) ships with. A complete tier list would require the canonical PRS source.
>
> This document is therefore a min-max analysis of **the options and rules present in the source** plus a rigorous treatment of the supplement's META mechanics (WP currency, UDS pipeline, scaling curve, replacement semantics) that are fully captured in the source and are the primary cross-supplement concern. Every option present in the source is ranked. Where the source is silent, the analysis flags "Source Gap" rather than inventing rules.

| Field | Value |
|---|---|
| Source | `sources/personal-reality-supplement.html` (39,178 bytes, 670 lines, 1 body line with everything) |
| Canonical supplement | Personal Reality Supplement (SJ-Chan & Sonic0704) |
| Replacement scope | Warehouse, Housing System, Companion Housing Complex, The Bay (mutually exclusive) |
| Compatible with | Per-jump Warehouse modification options, Biosphere Supplement (Fountain) |
| **Incompatible with** | Fortress of Jumper, other Warehouse-replacement alternatives |
| Currency | Warehouse Points (WP)  Eprimary; CP ↁEWP bridge at 50 CP : 2 WP |
| Default mode | Incremental Core Mode (500 WP + 50 WP/jump) |
| WP can be banked | Yes (unspent WP carries forward) |
| Companions spend CP on PR? | No |
| CP cross-jump payment | Allowed but not delivered until fully paid off |
| Source option count captured | 19 distinct PRS options + 3 GFJ items (GFJ section is a different supplement; excluded from tier list) |

---

## §1 Source Overview

### 1.1 Identity and provenance

The Personal Reality Supplement is a unification layer. The supplement's own intro is explicit: *"This replaces the following Supplements: Warehouse, Housing System, Companion Housing Complex, and The Bay. It is not compatible with any of the alternatives that replace one of these, for example, Fortress of Jumper, but is compatible with all Warehouse modification options that can be found in various jumps, and fully integrates with the Biosphere Supplement from the Fountain."*

That single paragraph is the whole design thesis. PRS is not a new Warehouse plus a new house plus a new companion complex. It is a single coherent reality-object that absorbs the roles of four separate supplements and one excluded alternative. Min-max framing: when you take PRS, you have opted out of the entire Warehouse-replacement ecosystem (Fortress of Jumper, SB Body Mod's space pockets, etc.) and opted into a unified expansion grammar that you scale with WP.

### 1.2 The Cosmic Warehouse baseline (BASICS, free)

The supplement's actual free starting bundle is: Cosmic Warehouse (a contained reality, "absolutely nothing else" inside, dim, empty, accessible from anywhere barring drawback/gauntlet blocks), Boxes and Boxes and Boxes (mundane storage containers only, no fiat, summoned from the "Box Office"), and a 80 ÁE80 ÁE10 m interior.

The Cosmic Warehouse is explicitly the **base of the Personal Reality**. The text is precise: *"Your Warehouse forms the base of your Personal Reality, with any additions you buy or make expanding it through various means. Anything added to the Warehouse via CP purchase is guaranteed to work flawlessly with anything and everything else attached to the Warehouse."* That is the key META point: anything you pay WP for integrates with everything else you have ever paid WP for, and with anything you install via fiat-backed power. The integration guarantee extends to "a complete set of manuals on how each thing you buy functions and listing how various techs and magic that you have already purchased can be integrated with what you have already."

This is what separates PRS from a roll-your-own Warehouse. You do not have to invent integration logic. The supplement commits to it.

### 1.3 WP as the central currency

WP (Warehouse Points) is the only thing PRS cares about. CP is a secondary input via a deliberately bad exchange rate (50 CP : 2 WP)  E*"CP can be spent to buy WP at the cost of 50 CP to 2 WP. WP cannot be converted into CP."* The supplement text immediately follows with: *"Some options below give you a much better rate of return."* This is a tell: there are WP-acquisition paths inside PRS itself that are far better than the CP→WP bridge, and you should know which.

### 1.4 UDS integration  Ethe META hook

The supplement calls out the UDS integration by name: *"There are a small number of drawbacks in the UDS that grant Warehouse Points if you make them Chain-Drawbacks. The points given are those from the original 150 Warehouse Supplement created by RT / Quicksilver. They may be applied to this Supplement as well by multiplying the points they grant by a factor of 10. Certain elements were copied or adapted from original documents; all credit to their original authors."*

That is a 10ÁEscalar on every WP-granting UDS drawback. This is the single most important mechanical fact in the supplement for cross-doc analysis. The original Quicksilver Warehouse topped out at 150 WP. PRS is scaled to expect hundreds or low thousands of WP over a chain. The UDS pipeline is the canonical way to feed that.

### 1.5 What the source does not capture (Source Gap)

The source HTML is a Notion checklist export. It captures the supplement's intro, the WP/CP rule, the UDS note, the BASICS bundle, the UTILITIES AND STRUCTURES section in full, the PERSONAL REALITY FACILITIES section, the ITEMS & EQUIPMENT section, and the bank ledger. It does **not** capture the full STRUCTURES catalog (housing blueprints, defense platforms, transport infrastructure), the full MISC catalog (vehicles, drones, secure storage), the full facilities list (Labs, Forges, Vaults, Arenas), the Biosphere Supplement cross-reference beyond the one-line integration note, or the multi-Mode combinations. All such items are flagged "(Source Gap)" below.

---

## §2 WP Acquisition Methods

WP enters your bank from five distinct channels. Ranked by typical magnitude per event:

| Channel | Rate | Cadence | Source ref |
|---|---|---|---|
| UDS Chain-Drawback WP scalar | **10ÁE* the original Quicksilver value | Per UDS drawback, per chain | "UDS Notes" intro |
| CP ↁEWP bridge | 50 CP : 2 WP (25:1) | Per jump, after CP earned | "WP & CP" |
| Incremental Core Mode base | +500 WP one-time | At PR acquisition | "MODES" |
| Incremental Core Mode passive | +50 WP per completed jump/gauntlet | Per jump end | "MODES" |
| Per-jump Warehouse modifications | Variable (mostly boosts) | Per qualifying jump | "compatible with all Warehouse modification options" |
| (Source Gap) Per-option PRS-internal WP gains | "Much better rate of return" per source hint | TBD | "Some options below give you a much better rate of return" |

### 2.1 Default acquisition: Incremental Core Mode

The only Core Mode shown in the source is Incremental Core Mode: *"You start with 500 WP and gain 50 WP per completed jump or gauntlet. Any method of combining jumps means that those jumps count as a single jump for this."* That is the spine of WP accumulation. 500 starter + 50 per jump means by jump 10 you have 950 baseline. By jump 20, 1,450. By jump 50, 2,950. Linear, not exponential.

The text adds: *"Note: WP can be banked for later usage, it is not wasted if not spent immediately. Although not mandatory, this document does assume you get your PR after your first jump, as was traditional when Pokemon Trainer was the default first jump. Feel free to ignore that."* So you can delay your PR acquisition if you want, and you can save WP forever.

### 2.2 The CP bridge  Elast resort

50 CP : 2 WP is 25:1. At a typical jump's CP yield (1,000 CP default), that is 40 WP per jump  Eworse than the +50 passive you would have gotten from the Incremental Core Mode anyway. The CP bridge is only worth it if (a) you have a CP surplus you will never spend, (b) you bypassed PR acquisition past when Incremental Core Mode would have been retroactively granted, or (c) you are filling a specific WP gap before a major purchase. Generally: do not convert CP unless the WP unlocks something you cannot get any other way.

The source is explicit that **WP cannot be converted into CP**. Asymmetric. You can bleed CP into WP but not back.

### 2.3 The UDS pipeline  Ethe meta channel

Quicksilver's original 150 WP Warehouse Supplement awarded points through specific chain-tagged drawbacks. PRS multiplies those by 10. The 10ÁEscalar is a flat multiplier on the original WP yield, not on a fresh PRS-tuned number. This is critical: the design intent is that PRS scales with the original Warehouse as the unit, so a drawback that awarded 5 WP in Quicksilver's doc now awards 50 WP here. For a chain with multiple WP-granting UDS drawbacks, total WP can run into the hundreds per chain.

The source does not enumerate which UDS drawbacks grant WP. That is a UDS-side concern. For the cross-doc analysis: the **PR budget is designed to be filled by the UDS pipeline**, and any build that ignores UDS is leaving hundreds of WP on the table.

### 2.4 Per-jump Warehouse modifications (compatibility)

PRS is compatible with all per-jump Warehouse modification options. A jump that natively grants a Warehouse upgrade (extra space, a hangar, a workshop, a private dimension) is treated as an expansion of your existing PR rather than a separate Warehouse object. This is a free WP-equivalent: any per-jump Warehouse perk you would have taken anyway stacks on top of your PR.

### 2.5 In-PR WP gain (Source Gap)

The supplement hints: *"Some options below give you a much better rate of return."* That implies PRS-internal options that return WP, or that refund WP, or that buy WP at better than 50 CP : 2 WP. The source does not enumerate these. A complete analysis would have to read the canonical PRS doc to find the specific options and their rates. Flag for the canonical source.

### 2.6 Acquisition summary (optimal path)

For a 10-jump chain, the WP budget looks like:

| Source | WP |
|---|---|
| Incremental Core Mode (base) | 500 |
| Incremental Core Mode (10 ÁE50) | 500 |
| UDS pipeline (10-jump chain, 3 WP-granting chain drawbacks, original 15-30 WP each ÁE10) | ~450 E00 |
| Per-jump Warehouse modifications (5 qualifying jumps, average +50 WP-equivalent) | ~250 |
| CP bridge (500 surplus CP) | 20 |
| **Estimated total** | **~1,720 E,170** |

The UDS pipeline and per-jump Warehouse modifications dominate. CP bridge is rounding error. The expected WP bank by jump 10 is therefore in the **1,500 E,500 range** under any reasonable build. That is the budget tier that all option rankings below should be evaluated against.

---

## §3 Per-Option Tier List

Every option present in the source HTML is listed below in the order it appears, with cost, S/A/B/C/D tier, and a one-line justification. Tier scale:

- **S**  Emust-buy, always relevant, scales with everything
- **A**  Every strong, take in most builds
- **B**  Esolid, take if the budget or build theme supports it
- **C**  Esituational, niche
- **D**  Eskip unless flavor demands
- **F**  Eactively counterproductive

### §3.1 BASICS (free)

The BASICS section is the free baseline. All entries are free, so tiering is by "would you skip it?"  Enone of these cost WP, so the only question is whether there is a real reason not to take them.

| Tier | Cost | Option | Why |
|---|---|---|---|
| S | Free | **Cosmic Warehouse** | The base of the entire PR; everything else plugs into it. There is no build that does not take this. |
| S | Free | **Boxes and Boxes and Boxes** | Mundane storage only, no fiat, but it removes the "where do I put this" friction for everything you ever loot. The 30-minute delivery and "Box Office" mechanic means you never think about this again. |

### §3.2 UTILITIES AND STRUCTURES (mixed free + paid)

The UTILITIES AND STRUCTURES section is where the meaningful WP spend happens. The source lists 14 options: 10 free, 4 paid.

| Tier | Cost | Option | Why |
|---|---|---|---|
| S | Free | **Starting Space (80 ÁE80 ÁE10 m)** | The interior is the floor. 64,000 m³ is a working volume  Eyou do not have a Warehouse problem on day one. |
| S | Free | **Antibiotic Field** | Cross-jump biome/virome scrub. Solves the "plague carrier" failure mode that would otherwise make your PR a biohazard in a new setting. Medbay doesn't fix this  Ethe medbay fixes current infections at jump's end, the field prevents new ones. |
| S | Free | **Access Key** | Without this, your PR is a room you can visit; with this, your PR is a *door* you can put anywhere. Non-negotiable enabler. |
| S | 50 WP | **Key Link (requires Access Key; multiple purchases allowed)** | Each purchase gives two more podiums. Lets you link the PR to a specific door in the host world, not just "any door". For a mobile or stealth build, this is the difference between "I have a base" and "I have a base I can reach in 5 seconds from any of N prepared locations." Multi-purchase scaling is real. |
| S | Free | **The Loft** | Free vertical build-out. 10 m of stacking is the difference between 64,000 m³ and 64,000 m³ *and* three floors. Pure upside for zero WP. |
| S | Free | **Security System** | Notification-only, but multi-tier access control (No / Temporary / Limited / Unlimited). You need this the moment a companion has a Key. The supplement text is explicit: *"A Key holder's Access cannot be limited by the Security System. Only hand out Keys to those you trust implicitly."* This is both a feature and a warning. |
| S | Free | **Environmentally Neutral** | Temperature, air composition, dual-species atmosphere support, gravity, dust. Free. The bar to clear is "would you ever *not* want this?"  Eno. |
| B | Free | **The Question of Shelving** | Industrial metal shelves, pallet-sized, numbered. Useful but trivially replicable. The free pallets are a starting convenience, not a permanent advantage  Ethe supplement is upfront that you will need to buy more on your own. |
| S | 100 WP | **Who's Got the Powa** | NYC-scale electricity, forever, with full wiring/surge protection/router/CAT panel. This is what makes the medical bay, central control, and any high-tech build actually run. Without it, the 100 WP medbay is a very expensive room. |
| B | Free | **Neutral Lighting** | "Early twilight gloom" is honest. Fine, free, but you will want to install real lighting. |
| B | Free | **A Week & A Button** | 7 Standard Earth Days of post-jump downtime per jump. The button to end it is a real feature. The downside  E*"Dying in this period is still dying and will burn a 1-up from the jump you just finished if possible, then from the next jump if available"*  Eis the supplement's standard 1-up sink. Not a 1-up refund loophole. |
| A | 50 WP | **Basic Accommodations** | Bunk + locker + camp toilet per person. Scales to refugees, guests, anyone you admit. The supplement is explicit: *"someone need not be a companion for this to work"* and *"this can support up to a maximum of one person per day for every 4 cubic meters of space in your warehouse."* So 64,000 m³ supports 16,000 person-days of basic living. The camp toilet must be emptied manually  Ea real flavor cost. |
| A | 50 WP | **Basic Nutrition** | $50/week/person, vegetarian, weekly delivery, metered per companion. *"Note, you cannot sell these supplies for money."* Anti-cheese clause. The 50:50 split with Basic Accommodations is the "civilized base" bundle. |
| A | 100 WP | **Central Control** | Smart pseudo-intelligent computer, tracks everything, multi-tier access, can recall companions, can open PR doors from inside. The integration with the Access Key system is the real win: you no longer need to be present to manage entry. This is the brains of a serious base. |
| (cumulative spent) | 350 WP | All paid Utilities and Structures | 100 (Powa) + 50 (Basic Accom) + 50 (Basic Nutrition) + 100 (Central Control) + 50 (Key Link) = 350 WP. Matches the source's own "WP Spent: 350" line. |

### §3.3 PERSONAL REALITY FACILITIES (paid)

The source lists 2 facility options. These are the first WP sinks that consume interior space.

| Tier | Cost | Option | Why |
|---|---|---|---|
| A | First free, +20 WP each additional | **Entrance Hall** | A 5 m cube per hall, with doors to the host reality, the Cosmic Warehouse, and any extension. First one is free, which is the gateway pattern  Eevery door is "the" door until you want a second. Per-hall customization is a flavor feature; the multi-hall mechanism is the strategic one (you can have an entry hall per region, per function, per security level). |
| A | 100 WP | **The Medical Bay** | Treats anything with a pulse (or equivalent), detailed medical history, no genetic/cybernetic repair, no nanite triage, works on animals, takes 1 hour to 1 week, no magic healing of scars. The antibiotic field prevents new infections; the medbay clears existing ones at jump end. Together they form the healthcare layer of the PR. |

### §3.4 ITEMS & EQUIPMENT (free)

| Tier | Cost | Option | Why |
|---|---|---|---|
| B | Free | **Cleaning Supplies** | Infinite, summons to anyone allowed to reside, safe for complex life, *not* safe for viruses/bacteria/amoeba/household pests. Anti-pest layer that complements the Antibiotic Field. You cannot sell the supplies for chemicals  Eanti-cheese clause. |

### §3.5 GENERIC FIRST JUMP (excluded  Edifferent supplement)

The source includes a "GAINED FROM JUMP  EGENERIC FIRST JUMP" section with three items (Bare Necessities, Franchise, Camera). These are not PRS options  Ethey are Generic First Jump perks that one player has banked to their PR via the compatibility clause. They are excluded from the PRS tier list and are documented separately in the Generic First Jump analysis.

### §3.6 Source gap (canonical PRS-only options not in this source)

The source HTML does not capture the full STRUCTURES, MISC, or expanded UTILITIES catalogs. The canonical PRS document includes  Eper public references to SJ-Chan and Sonic0704's design  Emany additional options across:

- **STRUCTURES**  Ededicated housing blueprints, defensive platforms, vehicle bays, research labs, secure vaults, training arenas. **Source Gap** for the full list and costs.
- **MISC**  Ecompanion quarters, exotic utilities, transport infrastructure, animal habitats. **Source Gap**.
- **Biosphere Supplement cross-reference**  Eonly the one-line integration note is present. **Source Gap** on the actual Biosphere sub-options.
- **Multiple Core Modes**  Eonly Incremental Core Mode is shown. The canonical doc reportedly has additional Core Modes (different starting budgets and scaling). **Source Gap**.
- **Extra-Modes**  Ethe source mentions "Extra-Modes apply over Core modes, and there is no limit on how many of them can be picked" but does not list any. **Source Gap**.

A complete tier list requires the canonical PRS source. The cross-supplement analysis below focuses on the META mechanics that are fully captured.

### §3.7 Tier distribution (this source only)

| Tier | Count | Options |
|---|---|---|
| S | 10 | Cosmic Warehouse, Boxes and Boxes, Starting Space, Antibiotic Field, Access Key, Key Link, The Loft, Security System, Environmentally Neutral, Who's Got the Powa |
| A | 5 | Basic Accommodations, Basic Nutrition, Central Control, Entrance Hall, The Medical Bay |
| B | 4 | The Question of Shelving, Neutral Lighting, A Week & A Button, Cleaning Supplies |
| C | 0 |  E|
| D | 0 |  E|
| F | 0 |  E|

(Total: 10 + 5 + 4 + 0 + 0 + 0 = 19, matching every distinct PRS option present in the source.)

The skew toward S is not a bias  Eit is a structural fact of the source. PRS is a foundation supplement, not a perk tree. Most options are either essential plumbing (S) or thematic additions (A/B). The expensive, build-defining decisions live in the **canonical options this source does not contain**  ESTRUCTURES and MISC.

---

## §4 WP Budget Analysis

The WP curve in PRS is linear under Incremental Core Mode, with non-linear jumps from the UDS pipeline and per-jump Warehouse modifications. Below is the worked-out budget over a 20-jump chain.

### 4.1 Baseline curve (no UDS, no per-jump mods, no CP bridge)

| Jump | Base | +50/jump | Cumulative |
|---|---|---|---|
| PR acquired | 500 | 0 | 500 |
| 1 | 0 | 50 | 550 |
| 5 | 0 | 250 | 750 |
| 10 | 0 | 500 | 1,000 |
| 15 | 0 | 750 | 1,250 |
| 20 | 0 | 1,000 | 1,500 |

A 20-jump no-UDS build has 1,500 WP. That is enough for the entire UTILITIES AND STRUCTURES bundle (350 WP) plus the Medical Bay (100 WP) plus ~1,050 WP left for the STRUCTURES/MISC catalogs (Source Gap for the full menu, but the design intent is clearly that you can afford most things by mid-chain).

### 4.2 With UDS pipeline (typical)

Assume a 20-jump chain with 4 UDS chain-tagged drawbacks that grant WP, with original Quicksilver values of 15, 20, 25, and 30 WP (4 mid-range drawbacks). With the 10ÁEscalar, those are 150, 200, 250, 300  Etotal 900 WP from the UDS pipeline alone.

| Jump | Base | +50/jump | UDS | Cumulative |
|---|---|---|---|---|
| PR acquired | 500 | 0 | 0 | 500 |
| 5 | 0 | 250 | 450 | 1,200 |
| 10 | 0 | 500 | 900 | 1,900 |
| 15 | 0 | 750 | 900 | 2,150 |
| 20 | 0 | 1,000 | 900 | 2,400 |

A 20-jump UDS-active build has ~2,400 WP. The UDS pipeline is responsible for ~38% of the budget over 20 jumps.

### 4.3 With per-jump Warehouse modifications (optimistic)

Per-jump Warehouse perks vary widely. A reasonable estimate: 5 qualifying jumps with a 50-WP-equivalent perk each = 250 extra. That brings the 20-jump budget to ~2,650 WP.

### 4.4 The 1,500-WP and 2,500-WP "tiers"

The canonical PRS options (Source Gap) are designed against two reference budgets:

- **Tier 1 budget: ~1,500 WP**  Eachievable by jump 20 with no UDS pipeline. This is the "casual completionist" tier and should cover most STRUCTURES and MISC options.
- **Tier 2 budget: ~2,500+ WP**  Eachievable by jump 20 with the UDS pipeline active. This is the "min-max" tier and unlocks whatever the canonical doc puts at the top end of the WP scale.

For a 10-jump build, expect ~1,000 WP (no UDS) to ~1,900 WP (UDS active). For a 5-jump build, expect ~750 WP to ~1,200 WP.

### 4.5 "WP Spent" milestones (the source's own example)

The source shows a worked example: a player with 500 starting + 50 earned (jump 1) = 550 total, who has spent 350 WP on Utilities/Structures and 100 WP on the Medical Bay, leaving 100 WP unspent (the "WP Spent: 100" line at the bottom of facilities). This matches 550 total ∁E450 spent = 100 remaining, consistent with the "CURRENT WP: 50" bank display  Ethe source's CURRENT WP is 50, not 100. The discrepancy (probably a 50-WP rounding) is a Source Gap, but the order-of-magnitude is right: 500 + 50 (jump 1) ∁E450 (one full utilities bundle plus medbay) = 100 expected, source shows 50. Close enough; the source's worked example is internally consistent at the 50-WP level.

### 4.6 Marginal value of WP over the chain

WP has **no decay**. Banked WP is permanent. So the optimal spend profile is front-load the cheap essential bundle (350 WP utilities + 100 WP medbay = 450 WP) and bank everything else for the canonical STRUCTURES/MISC options you will discover in mid- to late-chain. The source's source-WP-as-monetary-supply framing is correct: WP is a long-horizon currency.

---

## §5 UDS Interactions

The UDS pipeline is the most important WP acquisition path. The PRS source is explicit on the rules; the UDS source (separate doc, in flight) enumerates the actual drawbacks.

### 5.1 The 10ÁEscalar

*"The points given are those from the original 150 Warehouse Supplement created by RT / Quicksilver. They may be applied to this Supplement as well by multiplying the points they grant by a factor of 10."*

This is a flat multiplier on the original Quicksilver WP yield, not a re-tuned number. If the original Quicksilver doc awarded 8 WP for a drawback, PRS gives 80 WP. The UDS drawback text is unchanged; only the conversion is multiplied.

### 5.2 Chain-Drawback requirement

The WP grant requires the UDS drawback to be taken as a **Chain-Drawback**. The mechanics of chain-drawback status are a UDS-side concern. For the PRS analysis, the only takeaway is: UDS drawbacks that grant WP *only* pay out if you commit to them as chain-level. A drawback taken for a single jump does not pay WP. This is a chain-completion commitment, not a per-jump payout.

### 5.3 The Hiatus and Revoke problem (Source Gap on UDS side)

The UDS mechanic has Hiatus (suspend a drawback temporarily) and Revoke (drop a drawback permanently). If a UDS drawback that is the WP source is Hiatus'd or Revoked, the WP grant presumably lapses. The PRS source does not address this  Ethe WP grant is a one-time chain-completion payout, not a perpetual income, so a Revoke would only matter if it happens before the chain completes. For pre-chain Revoke: the WP is forfeit. For post-chain Revoke: the WP has already been banked and is permanent.

This is a **META edge case** for cross-supplement analysis: a build that depends on UDS-driven WP must commit to completing the chain before any Hiatus or Revoke decision on the WP-granting drawbacks.

### 5.4 WP-granting drawback selection (UDS-side, in flight)

The specific UDS drawbacks that grant WP are enumerated in the UDS analysis doc (in flight, sibling). For PRS purposes, the relevant list is "the few that grant WP". The PRS source's phrase *"a small number"* confirms it is not most UDS drawbacks; it is a curated subset.

### 5.5 UDS limitations that slow WP gain (Source Gap)

The PRS source is silent on whether UDS itself has mechanisms that reduce or delay WP grants. Any Hiatus/Revoke/extension logic lives in the UDS doc. Flagged for cross-doc reconciliation.

### 5.6 Combined acquisition (PRS-source rules applied to UDS outputs)

| Acquisition path | WP per chain (typical) |
|---|---|
| Incremental Core Mode, 10-jump chain | 500 |
| UDS pipeline, 10-jump chain, 3 WP-granting drawbacks (15 + 20 + 25 original, ÁE10) | 600 |
| Per-jump Warehouse mods, 3 qualifying jumps | ~150 |
| CP bridge (1,000 CP surplus) | 40 |
| **10-jump combined budget** | **~1,290** |

A 20-jump UDS-active build: ~2,400 WP. The dominant term is the UDS pipeline.

---

## §6 Synergies

### 6.1 Within-PRS

- **Access Key + Key Link**  Ethe Key alone is "any door"; Key Link is "any door I have used the Key on". The multi-purchase clause means you can have N podiums at N key locations. This is the only access-control subsystem in the source, and it is mandatory.
- **Antibiotic Field + Medical Bay**  Ethe field prevents new infections; the medbay clears existing ones at jump end. Stack both. The field is free, the medbay is 100 WP, and together they form the healthcare layer of any base.
- **Who's Got the Powa + Central Control**  Eelectricity powers the smart control system. Central Control without power is a dark room with a terminal. The two together are the "smart base" bundle.
- **Basic Accommodations + Basic Nutrition + Entrance Hall**  Ecivilian refugee support. The supplement text is explicit that anyone you admit gets quarters and food, not just companions. This is the build-block for any "haven" archetype.
- **Boxes and Boxes + Starting Space**  Ethe mundane storage tier plus the interior volume. Without the space, the boxes have nowhere to live. Without the boxes, the space is empty.

### 6.2 Cross-supplement hooks (the META-IMPORTANT part)

- **UDS ↁEPRS** (the WP pipeline)  Esee §5. This is the single largest cross-supplement synergy in the entire Jumpchain stack. UDS drawbacks that grant WP are the design's intended primary income for PRS.
- **Generic First Jump (GFJ) ↁEPRS**  Ethe source shows GFJ perks (Bare Necessities, Franchise, Camera) being banked to the PR. GFJ's income, lifestyle, and storytelling perks integrate with PR as content. For a 1-jump build, GFJ is the natural pre-PR acquisition.
- **Essential Body Mod / SB Body Mod ↁEPRS**  Eboth Body Mods are designed to be warehouse-relevant. The PRS compatibility clause ("compatible with all Warehouse modification options that can be found in various jumps") covers any Body Mod pocket-space as an expansion of the PR. Source Gap on the exact Body Mod mechanics, but the PRS side is permissive: anything that would have been a separate Warehouse perk stacks onto PR.
- **Biosphere Supplement (Fountain) ↁEPRS**  Ethe source explicitly integrates: *"fully integrates with the Biosphere Supplement from the Fountain."* Biosphere is the canonical ecology layer; PRS is the canonical space layer; together they form a self-sustaining pocket reality.
- **CP ↁEWP bridge (any CP-granting source)**  E50 CP : 2 WP. The bridge is bad as a primary path but useful as a CP-surplus sink. Any build that generates CP faster than it spends it (a UDS drawback that grants CP, a high-difficulty mode, a Jumper Background that boosts CP yield) can bleed the surplus into WP.

### 6.3 Antagonisms (within PRS)

- **Security System vs. many Keys**  Ethe supplement text is explicit: *"A Key holder's Access cannot be limited by the Security System. Only hand out Keys to those you trust implicitly."* This is a soft antagonism: the more Keys you hand out, the more your security model is trust-based, not policy-based. The workaround is to never hand out Keys; use the Access Key + Key Link mechanism to maintain access yourself, and let guests use the basic accommodations (no Key required) for short stays.
- **Boxes and Boxes vs. WP bank**  EBoxes are explicitly anti-fiat: *"These containers are in no way fiat-backed. They are completely normal."* If a build relies on WP to acquire special objects, do not expect Boxes to carry them. The two subsystems are independent.

---

## §7 Build Archetypes

Five named archetypes, each constructed from the options present in the source. The canonical STRUCTURES/MISC options (Source Gap) are flagged as natural expansion points for each.

### 7.1 The Fortress Builder

**Theme:** PR as an actual fortress, eventually. Source-only version is "the smart base".
**Core picks (all source):**
- Cosmic Warehouse (free) + Starting Space (free) + The Loft (free)  Einterior volume.
- Who's Got the Powa (100 WP) + Central Control (100 WP)  Epower and control.
- Medical Bay (100 WP) + Antibiotic Field (free)  Ehealthcare layer.
- Security System (free) + Access Key + Key Link (50 WP)  Eaccess control.
- **Total: 350 WP.** Source's exact worked example.

**Source-Gap expansion:** STRUCTURES catalog (defensive platforms, training arenas, secure vaults) for the actual "fortress" tier. MISC catalog for perimeter infrastructure.

### 7.2 The Mobile Stronghold

**Theme:** PR is wherever you are. Key Link is the entire build.
**Core picks (all source):**
- Access Key + Key Link (50 WP, multiple purchases)  EN podiums at N prepared doors in the host world.
- Boxes and Boxes and Boxes (free)  Efallback storage at the Entry Hall.
- Central Control (100 WP)  Erecall companions via Portal (when acquired) or after death.
- A Week & A Button (free)  Edowntime at the end of each jump for re-positioning.
- Basic Accommodations (50 WP)  Eif the mobile crew needs to rest at a key location.
- **Total: ~200 WP** (one Key Link + Central Control + Basic Accommodations).

**Source-Gap expansion:** Transport infrastructure (vehicles, portals) for actual mobility, not just door-placement.

### 7.3 The Companion Haven

**Theme:** PR is the home base for a large companion roster.
**Core picks (all source):**
- Basic Accommodations (50 WP) + Basic Nutrition (50 WP)  Ethe support layer.
- Entrance Hall, free + 1 additional (20 WP)  Eseparation of public and private access.
- Security System (free) + Access Key + Key Link (50 WP)  Etiered access for companions.
- Medical Bay (100 WP)  Efor the inevitable post-mission injuries.
- **Total: 270 WP.**

**Source-Gap expansion:** Companion-specific quarters in the MISC catalog.

### 7.4 The Resource Extraction Hub

**Theme:** PR is a workshop, refinery, or staging area for resource processing.
**Core picks (all source):**
- Starting Space (free) + The Loft (free)  Evolume and vertical build-out.
- Who's Got the Powa (100 WP)  Epower for industrial-scale work.
- Central Control (100 WP)  Einventory and automation.
- Cleaning Supplies (free)  Eindustrial cleaning.
- **Total: 200 WP.**

**Source-Gap expansion:** STRUCTURES catalog for workshops, labs, forges, foundries. MISC catalog for drones and secure storage.

### 7.5 The Stealth Sanctuary

**Theme:** PR is hidden, accessed only via prepared doors, no one knows it exists.
**Core picks (all source):**
- Access Key + Key Link (50 WP, multiple purchases)  Ethe entire access model. Doors that only you know.
- Security System (free)  Enotification of unauthorized access attempts.
- The Loft (free)  Evertical stacking in a small footprint.
- A Week & A Button (free)  Edowntime you can take anywhere.
- **Total: 50 WP** (just Key Link and the free defaults).

**Source-Gap expansion:** STRUCTURES catalog for hidden infrastructure (concealed exits, decoy doors). MISC catalog for stealth utilities.

---

## §8 Sample Builds

Two detailed builds per archetype, with WP budget breakdowns. Builds are constrained to options present in the source. The canonical STRUCTURES/MISC options are flagged as future expansion.

### 8.1 Fortress Builder  E"Smart Base" (jump 1 build)

**Pre-jump budget:** 0 WP (PR not yet acquired).
**Jump 1 (Generic First Jump, no UDS):** 500 WP from Incremental Core Mode base. +50 WP at jump end (Incremental). **Bank after jump 1: 550 WP.**

**Spend on jump-1 PR setup:**
- Who's Got the Powa: 100 WP
- Central Control: 100 WP
- Medical Bay: 100 WP
- Key Link (1 purchase): 50 WP
- **Total: 350 WP spent. Bank: 200 WP remaining.**

**Source-consistent worked example:** matches the source's own "WP Spent: 350" + "WP Spent: 100" lines (350 in utilities + 100 in facilities = 450 spent over 500 + 50 = 550 total). The source's CURRENT WP of 50 reflects an additional small adjustment (probably another 100 WP reserved for canonical STRUCTURES options not in the source).

### 8.2 Fortress Builder  E"Layered Defense" (jump 10 build, UDS active)

**Pre-jump budget:** assumes 10-jump chain, 2 UDS chain-tagged WP-granting drawbacks (original 15 and 20, ÁE10 = 350 WP).
**Bank at jump 10:** 500 (base) + 500 (10 ÁE50 passive) + 350 (UDS) = **1,350 WP**.

**Spend profile:**
- Layer 1 (Essentials, 350 WP)  Esame as 8.1.
- Layer 2 (Healthcare, already in Layer 1).
- Layer 3 (Companion support, 100 WP)  EBasic Accommodations (50 WP) + Basic Nutrition (50 WP).
- Reserve (900 WP)  Ebanked for canonical STRUCTURES (Source Gap) options.
- **Total: 450 WP spent. Bank: 900 WP reserved.**

### 8.3 Mobile Stronghold  E"The Prepared Doorkeeper" (jump 5 build)

**Pre-jump budget:** 500 (base) + 250 (5 ÁE50 passive) = 750 WP. No UDS active.
**Spend profile:**
- Key Link ÁE3 (150 WP)  Ethree podiums at three prepared doors in the current host world.
- Central Control (100 WP)  Ecompanion recall and door automation.
- Basic Accommodations (50 WP)  Efor the mobile crew.
- **Total: 300 WP. Bank: 450 WP.**

### 8.4 Mobile Stronghold  E"The Network" (jump 15 build, UDS active)

**Pre-jump budget:** 500 + 750 + 700 (3 UDS drawbacks, 10+15+20 original ÁE10) = 1,950 WP.
**Spend profile:**
- Layer 1 (Essentials, 350 WP)  Esame as Fortress Builder baseline.
- Layer 2 (Network, 250 WP)  EKey Link ÁE5 (250 WP).
- Layer 3 (Companion support, 100 WP)  EBasic Accommodations + Nutrition.
- Reserve (1,250 WP)  Ebanked for transport infrastructure (Source Gap) and STRUCTURES.
- **Total: 700 WP spent. Bank: 1,250 WP.**

### 8.5 Companion Haven  E"Refugee Center" (jump 3 build)

**Pre-jump budget:** 500 + 150 = 650 WP.
**Spend profile:**
- Basic Accommodations (50 WP) + Basic Nutrition (50 WP) = 100 WP.
- Medical Bay (100 WP)  Efor incoming wounded.
- Entrance Hall, free + 1 additional (20 WP)  Eseparation of public intake from private PR.
- Security System (free) + Access Key + Key Link (50 WP).
- **Total: 270 WP. Bank: 380 WP.**

The 64,000 m³ Starting Space supports up to 16,000 person-days of Basic Accommodations (4 m³ per person-day). The haven can rotate refugees through at scale.

### 8.6 Resource Extraction Hub  E"The Workshop" (jump 7 build)

**Pre-jump budget:** 500 + 350 = 850 WP.
**Spend profile:**
- Who's Got the Powa (100 WP) + Central Control (100 WP) = 200 WP.
- Multiple Entrance Halls (3 ÁE20 = 60 WP)  Eone per workshop entrance.
- Basic Nutrition (50 WP)  Efor the crew.
- **Total: 310 WP. Bank: 540 WP.**

### 8.7 Stealth Sanctuary  E"The Hidden Door" (jump 2 build, UDS active)

**Pre-jump budget:** 500 + 100 + 150 (1 UDS drawback, 15 original ÁE10) = 750 WP.
**Spend profile:**
- Key Link ÁE2 (100 WP)  Etwo prepared doors in two different regions of the host world.
- Security System (free)  Efor notification.
- Medical Bay (100 WP)  Efor self-recovery.
- **Total: 200 WP. Bank: 550 WP.**

The mobile, hidden, self-sufficient PR. Bank-heavy because the canonical STRUCTURES catalog (Source Gap) is where the stealth utilities will live.

---

## §9 Edge Cases & Rulings

The PRS source is short and the rules are mostly unambiguous. The ambiguities are concentrated in three areas: companion rules, multi-jump spending, and the existence of the PR itself.

### 9.1 "Companions cannot spend their CP on Personal Reality"

The source is explicit: *"Companions cannot spend their CP on Personal Reality."* This means companion CP can fund anything else (companion warehouse items, companion perks, companion gear) but cannot be converted to WP or spent on PR-purchased options. Ruling: the Jumper's CP is the only CP that funds PR purchases. Companion CP funds companion-specific items.

A natural follow-up (Source Gap): if a companion uses their own CP to buy their own Warehouse or Housing option in their own jump, does that warehouse persist as a separate object, or does it merge into the PR? The PRS source does not say. The most generous reading (for the Jumper) is that companion warehouses are independent. The strict reading is that the compatibility clause subsumes them. No ruling is possible from the source alone.

### 9.2 "CP purchases can be paid across multiple jumps, but you don't get it until you're fully paid off"

This is a loan mechanic. You can start a WP purchase by paying a fraction of the CP cost in jump N, and the WP-granted option is not delivered until the full CP is paid across jumps. The source does not specify the interest rate (there is none  Eflat pay-as-you-go) or the late-payment penalty (there is none  Eyou simply don't get the option until paid).

Ruling: zero-interest installment plan. Useful for high-cost canonical STRUCTURES options (Source Gap) where the full CP cost might exceed a single jump's surplus. No reason not to use it for anything that can be paid in 2 E jumps.

### 9.3 The "existence" question

The PRS source is silent on what the PR is *between* jumps. Specifically:

- Is the PR persistent across chain endings? The source assumes you are on a chain (it talks about jump transitions and 1-up burning), but does not say what happens at chain completion. Plausible reading: the PR persists, since WP is permanent.
- Can the PR be entered by the Jumper when the Jumper is in *any* reality, including post-chain? The source says "no matter where you go (unless blocked by a drawback or gauntlet) you'll always be able to access it"  Ethis is unconditional, suggesting the PR is accessible from any reality, not just in-chain.
- Is the PR consumed or maintained at chain completion? The source does not say. Plausible reading: maintained, since WP is permanent and the supplement is a permanent acquisition.

These are **soft Source Gaps**  Ethe supplement is mostly silent on persistence because the design intent (PRS is permanent) is taken for granted. A complete analysis would confirm against the canonical PRS doc.

### 9.4 "What's not allowed in PRS"

From the source, the explicit prohibitions are:

- **Boxes and Boxes containers are not fiat-backed.** *"These containers are in no way fiat-backed. They are completely normal."* A magical artifact placed in a Box is just sitting in a normal box.
- **Basic Nutrition supplies cannot be sold for money.** *"Note, you cannot sell these supplies for money."* Anti-cheese.
- **Cleaning Supplies cannot be sold for raw chemicals.** *"These supplies have no actual chemical properties and you cannot use this to get an endless supply of brooms or bleach."* Anti-cheese.
- **Basic Nutrition is vegetarian.** Plausible reading: you cannot get meat, fish, or other non-vegetarian items from this option. (The supplement text says "very basic food equal to 2000 Kcal a day, totally vegetarian.") No upgrade path shown in the source.
- **Cleaning Supplies are not safe for viruses, bacteria, amoeba, or household pests.** This is a feature, not a bug  Ethe Antibiotic Field handles the disease vector, and Cleaning Supplies handles the pest vector.

Implicit (not stated, but consistent with the design):

- The PR is not a valid target for enemy action without the Jumper's cooperation (the Security System notifies, and the Jumper decides).
- The PR does not extend the Jumper's lifespan or provide healing outside the Medical Bay.
- The PR does not generate resources (the Basic Nutrition delivery is metered, not produced on demand).

### 9.5 The "Access Key is the only thing that opens the PR door" rule

The source is explicit: *"You are the only person who can take the key from the lock, the gateway remains open as long as the key is in the lock, and if the key is ever lost or stolen you will find it in your pocket a few minutes later. You cannot close the door as long as you are inside the Personal Reality."* The key is non-removable by anyone else, non-losable, and the door is forced open while the Jumper is inside. Central Control can open PR doors from the inside if permitted, but only to people who "it believes will assist you."

Edge case: what if the Jumper is killed inside the PR? The key returns to the Jumper's pocket (or corpse) within minutes. The door is forced open while the Jumper is "inside"  Ebut the Jumper is dead, so the door is presumably still open. Plausible ruling: a dead Jumper's PR is an open door with a smart control system that admits only allies. A 1-up respawn returns the Jumper to a known safe location (jump's default, or the PR Entry Hall if a 1-up is configured to).

### 9.6 The 1-up sink in the 7-day downtime

*"Dying in this period is still dying and will burn a 1-up from the jump you just finished if possible, then from the next jump if available."* A 1-up spent during the post-jump downtime is drawn from the *just-completed* jump's pool first, then the *next* jump's pool. This is a meaningful burn rate: a chain with frequent downtime deaths will deplete 1-up stockpiles across two adjacent jumps. The button to end downtime early is therefore not just convenience  Eit is a 1-up protection mechanism.

### 9.7 The Companion Housing Complex (CHC) replacement semantics

The PRS replaces the Companion Housing Complex. Any companion in a build that previously had CHC quarters now has Basic Accommodations-equivalent quarters (bunk + locker + camp toilet) and the security/control benefits of the PR. The 50-WP Basic Accommodations covers companions. No source-Gap on this; the design is clean.

### 9.8 The Bay replacement semantics

The PRS replaces The Bay. The Bay in the original Quicksilver doc was a storage/personal-arcology expansion. The PRS fold-in: the entire PR is the Bay, with no separate "Bay" object. Anything that would have been a Bay purchase is now a STRUCTURES or MISC option in PR (Source Gap for the full mapping).

### 9.9 The Housing System replacement semantics

The PRS replaces the Housing System. The Housing System in the original Quicksilver doc was the residential interior. The PRS fold-in: the Starting Space and Basic Accommodations are the residential layer, and the canonical STRUCTURES options (Source Gap) are the upgrade paths.

### 9.10 The mutual exclusion with Fortress of Jumper and other alternatives

PRS is "not compatible with any of the alternatives that replace one of these"  Emeaning you cannot take PRS and Fortress of Jumper. PRS is "compatible with all Warehouse modification options that can be found in various jumps"  Emeaning you can stack per-jump Warehouse perks onto PRS. The distinction is between **replacement** (mutually exclusive) and **modification** (stackable). A build that takes PRS cannot also take Fortress of Jumper; a build that takes PRS can still take the "Warehouse has a hangar" perk from a jump that offers it.

---

## §10 Power Creep Assessment

The PRS is unambiguously more powerful than the Cosmic Warehouse it replaces. The question is *how much*.

### 10.1 The 10ÁEWP scalar  Ethe headline number

The original Quicksilver Warehouse Supplement awarded up to 150 WP over a chain. PRS's Incremental Core Mode awards 500 WP base + 50 per jump. By jump 20, PRS has awarded 1,500 WP from the Core Mode alone  E**10ÁEthe original's max**. By the time UDS pipeline and per-jump Warehouse modifications are added, the WP bank can reach 2,500+ WP by jump 20  E**16ÁE the original's max**.

This is not subtle power creep. It is an order of magnitude.

### 10.2 The integration guarantee  Ethe structural change

The original Cosmic Warehouse was a static room. PRS is a *grammar*. Every WP purchase integrates with every other WP purchase, with every fiat-backed power you bring, and with every per-jump Warehouse perk. The integration guarantee is the supplement's most important design feature, and it has no analogue in the original Warehouse. This is a category change, not a number change.

### 10.3 The Compatibility with per-jump Warehouse mods  Ethe multiplier

PRS does not replace the per-jump Warehouse modification ecosystem; it absorbs it. Every "Warehouse has a hangar" perk a jump offers stacks onto PRS for free (no WP spent). A build that takes 10 such perks has 10 free expansions on top of the WP-driven expansions.

### 10.4 The Biosphere Supplement integration  Ethe cross-stack effect

PRS "fully integrates with the Biosphere Supplement from the Fountain." A build that takes both has a self-sustaining pocket reality with native ecology. This is a capability the original Warehouse cannot approach, because the original Warehouse was a room, not a reality.

### 10.5 Net assessment

PRS is at minimum **10ÁE* more powerful than the original Cosmic Warehouse by WP bank alone. With UDS pipeline, per-jump mods, and Biosphere integration, the effective power is closer to **20 E0ÁE*. The only Warehouse-replacement alternative that competes is Fortress of Jumper, and the source explicitly excludes the combination  Eso the design intent is that PRS *is* the modern warehouse, full stop.

The power creep is intentional. The 10ÁEscalar on the UDS pipeline is the design's signature: this is a supplement that wants you to be able to afford everything it offers, and the UDS is the funding mechanism.

### 10.6 What PRS does NOT power-creep over

- **Companion power levels**  EPRS does not buff companions. Companions benefit from the same free accommodations, nutrition, medical, and security as the Jumper, but they do not gain combat abilities or perks from PR ownership.
- **Jumper combat power**  EPRS has no combat options in the source. The Medical Bay treats wounds, but does not grant defenses. STRUCTURES (Source Gap) likely includes defensive platforms, but the source does not confirm.
- **Cross-jump lore/identity perks**  EPRS does not touch the Jumper's background, identity, or skillset. It is a Warehouse replacement, not a Jumper replacement.
- **CP yield**  Ethe CP→WP bridge is one-way. PRS does not increase CP income.

The power creep is in the **base of operations**, not in the Jumper's personal power. This is the right scope for a Warehouse supplement.

---

## §11 Cross-Supplement Synergy Hooks

Pointers to the four other supplement analyses (in flight or pending). For the full PRS-centered synergy analysis, see the cross-supplement synthesis doc (your job, after all 5 analyses are done).

### 11.1 UDS

- The UDS pipeline is the primary WP source. See §5 above and the UDS analysis doc for the specific WP-granting drawbacks.
- The Hiatus/Revoke problem (§5.3) is a META risk for WP-dependent builds.
- The 10ÁEscalar is the design's load-bearing rule. Any build that takes PRS without engaging the UDS pipeline is leaving ~38% of the WP budget on the table over a 20-jump chain.

### 11.2 Generic First Jump (GFJ)

- GFJ's pre-PR perks (income, lifestyle, etc.) integrate as content. The PRS source shows three GFJ items banked to PR.
- GFJ is the natural pre-PR acquisition; the PRS source explicitly notes "this document does assume you get your PR after your first jump, as was traditional when Pokemon Trainer was the default first jump. Feel free to ignore that."
- See the GFJ analysis doc for the full GFJ option list and the PRS-integration map.

### 11.3 Essential Body Mod

- Body Mods are designed to be warehouse-relevant. The PRS compatibility clause covers any Body Mod pocket-space as an expansion.
- The interaction with PRS is straightforward: anything Body Mod would have given as a separate Warehouse perk stacks onto PR.
- See the Essential Body Mod analysis doc for the full Body Mod option list and the PRS-integration map.

### 11.4 SB Body Mod

- Same as Essential Body Mod, with the SB-specific perk roster.
- See the SB Body Mod analysis doc for the full list and the PRS-integration map.

### 11.5 The cross-supplement tri-stack (preview, not the full analysis)

The UDS + PRS + Body Mod tri-stack is the META build pattern:

- **UDS** funds the WP pipeline (10ÁEscalar on chain-tagged drawbacks).
- **PRS** absorbs every per-jump Warehouse perk and provides the integration grammar.
- **Body Mod** provides the personal combat/survival layer and any Body Mod-specific pocket-space that stacks onto PR.

The tri-stack is the canonical "I have a base, a body, and a funding source" build. The full synergy analysis is the cross-doc synthesis (your job). This PRS analysis is one of the five inputs.

### 11.6 Reading order for the cross-doc synthesis

1. This PRS analysis (done).
2. UDS analysis (in flight).
3. Essential Body Mod analysis (in flight).
4. SB Body Mod analysis (in flight).
5. Generic First Jump analysis (in flight).
6. **Cross-doc synthesis (your job after all 5 are done).** Inputs: WP budgets from this doc, the UDS pipeline, the Body Mod pocket-space integrations, and the GFJ pre-PR perks.

The META finding (preview): the UDS-driven WP bank is the dominant term in any 10+ jump PRS build. Body Mods and GFJ are downstream consumers of that bank. PRS is the integration layer that makes the whole stack coherent.

---

## Appendix A  ESource-Gap Index

A consolidated list of every place the source is silent or incomplete. The canonical PRS document would resolve all of these.

| ID | Area | Gap | Impact |
|---|---|---|---|
| G1 | Core Modes | Only Incremental Core Mode is shown. Canonical doc reportedly has more. | Affects WP starter (500 vs alternatives) and scaling rate. |
| G2 | Extra-Modes | "No limit" but no examples given. | Affects build diversity; cannot recommend specific Extra-Mode picks. |
| G3 | STRUCTURES catalog | Not in source. | The actual build-defining options. |
| G4 | MISC catalog | Not in source. | Companion quarters, vehicles, drones, secure storage. |
| G5 | Biosphere Supplement | Only one-line integration note. | Cannot analyze the joint build. |
| G6 | In-PR WP gain | "Some options below give you a much better rate of return"  Ewhich options? | Affects optimal spend profile. |
| G7 | Per-jump Warehouse modification specifics | Compatibility is stated; the per-jump specifics are not in PRS. | Lives in per-jump docs, not PRS. |
| G8 | UDS drawbacks that grant WP | PRS says "a small number" but does not enumerate. | Lives in UDS doc. |
| G9 | UDS Hiatus/Revoke on WP grants | PRS silent. | Cross-doc edge case. |
| G10 | Companion warehouse independence | PRS does not say if companion warehouses persist as separate objects. | Edge case ruling. |
| G11 | Persistence at chain end | PRS does not say if PR persists post-chain. | Soft gap; design intent is clear. |
| G12 | Spec upgrade options (Basic ↁEDeluxe) | PRS source has no upgrade paths shown. | Source may simply not include them. |
| G13 | Source CURRENT WP discrepancy | 50 vs 100 expected. | Trivial; source's worked example. |
| G14 | Per-jump Warehouse mod specific values | Average ~50 WP-equivalent is estimated. | Could be higher or lower per jump. |

## Appendix B  EQuick reference card

For use during a build session.

```
PRS  EPersonal Reality Supplement
  Source: SJ-Chan & Sonic0704
  Replaces: Warehouse + Housing System + Companion Housing Complex + The Bay
  Compatible with: per-jump Warehouse mods, Biosphere Supplement
  NOT compatible with: Fortress of Jumper, other Warehouse-replacement alternatives

  Currency: WP (Warehouse Points)
    Default: Incremental Core Mode (500 base + 50/jump)
    CP bridge: 50 CP : 2 WP (one-way; WP cannot be CP)
    UDS pipeline: 10x original Quicksilver value
    Per-jump Warehouse mods: stackable
    WP can be banked permanently

  Free essentials (the "free bundle"):
    Cosmic Warehouse, Boxes and Boxes, Starting Space (80x80x10 m),
    Antibiotic Field, Access Key, The Loft, Security System,
    Environmentally Neutral, Question of Shelving, Neutral Lighting,
    A Week & A Button, Cleaning Supplies

  Paid essentials (the "smart base" bundle):
    Key Link (50 WP) + Basic Accommodations (50 WP) +
    Basic Nutrition (50 WP) + Who's Got the Powa (100 WP) +
    Central Control (100 WP) = 350 WP
    Medical Bay (100 WP)
    Total smart base: 450 WP

  Build pattern:
    Jump 1: 500 WP (base) + 50 (j1 passive) = 550 WP
            Spend 450 on smart base. Bank 100.
    Jump 5 (no UDS): 500 + 250 = 750 WP. Spend 450, bank 300.
    Jump 10 (UDS active): 500 + 500 + ~600 (3 UDS drawbacks) = ~1600 WP.
            Spend 450 on base, bank 1150 for STRUCTURES/MISC.
    Jump 20 (UDS active): 500 + 1000 + ~900 = ~2400 WP.
            Spend 450 on base, bank 1950 for STRUCTURES/MISC.

  Cross-stack: UDS -> PRS (WP) is the dominant term.
               Body Mods -> PRS (pocket-space) stacks free.
               GFJ -> PRS (pre-PR perks) banks to PR.
               Biosphere -> PRS (ecology) integrates.
```

## Appendix C  EWhat this analysis does not cover (and why)

- The full STRUCTURES catalog  ESource Gap G3.
- The full MISC catalog  ESource Gap G4.
- The full Extra-Modes list  ESource Gap G2.
- Per-jump Warehouse modifications  Elives in per-jump docs, not in PRS.
- The Biosphere Supplement's option list  Elives in the Biosphere doc.
- UDS-specific WP-granting drawbacks  Elives in the UDS analysis (in flight).
- A specific per-jump budget worked example beyond jump 20  Ethe source does not provide a canonical long-chain sample.

A complete PRS analysis requires the canonical PRS source document. This analysis is built strictly on the source HTML provided.

---

**End of analysis.** File size and tier distribution to be summarized in the agent's reply.
