# Universal Drawbacks Supplement (UDS) v1.13  EMin-Max Analysis

> **Source:** UDS v1.13 (unreleased), by SJ-Chan. Google Doc v1.13 is ahead of the published v1.10.
> **Extraction scope:** PARTIAL. The source file (`sources/uds-v1.13.txt`) contains the full rules framework, Safety Dance, AEIOU, all 15 Chain Drawbacks, and all 17 Jumper Drawbacks. Every other category (Warehouse, Companion, Power, Thematic, HQ, Dietary, Challenge Mode, Origin, Questionable, Alternative Event, Starting, The Hub, Bitch of Destiny) was truncated by the webfetch tool and is NOT analyzed here. See §6 for the full missing list.
> **Quality bar:** comparable to `../worm-cyoa-v6/tier-list.md` and `../worm-cyoa-v6/archetypes.md`.
> **Companion docs (in progress):** Essential Body Mod, SB Body Mod, Personal Reality Supplement, Generic First Jump. Cross-supplement synergy docs come after all five land.

---

## §1 Source Overview

| Field | Value |
|-------|-------|
| Name | Universal Drawbacks Supplement (UDS) |
| Version | v1.13 (unreleased; ahead of published v1.10) |
| Author | SJ-Chan |
| Type | Plug-and-play Jumpchain supplement |
| Source URL | [Google Doc v1.13](https://docs.google.com/document/d/1OHjF8NterF6NAK_a4aCYJoBuBW1sbsD5YtK6fA0dGrI/edit) |
| Extraction | Partial (Chain + Jumper Drawbacks + rules only) |

### Core design

UDS does two things, and the split is the whole point.

1. **Chain Drawbacks** attach to your chain, not a jump. Once added, they fire every jump (unless Hiatused or Revoked). Their CP value adds to your Starting CP in every jump, including combined jumps. This is a permanent multiplier on your CP economy.

2. **Single Jump Drawbacks** from the UDS fill gaps when a jump document's native drawback roster is thin. They are bound by the jump's Drawback Cap and lose to Jump-Native Drawbacks on conflicts.

The supplement's stated intent (from the introduction) is to "shape a Jumpchain by fiddling with some or all of the basic assumptions." The author explicitly asks you not to cheese for points: "Please try not to cheese Universal Drawbacks just for points; they don't like that." The "must limit you" clause (see §12) is the teeth behind this. A drawback you enjoy or that has no real bite awards no CP.

### Key design pillars

- **Chain vs Single Jump split.** Chain Drawbacks are the CP engine. Single Jump Drawbacks are filler. The tier list reflects this: Chain Drawbacks dominate because their value compounds across every jump.
- **Hiatus / Revoke mechanics.** You can pause (Hiatus) or cancel (Revoke) Chain Drawbacks, but both cost 3x the drawback's value and have cooldowns. This makes Chain Drawbacks a serious commitment, not a free toggle.
- **WP / BP routing.** Chain Drawbacks can route half their value to the Body Mod Supplement (as BP) or, for Warehouse Drawbacks, grant one-time WP boosts. Routed drawbacks cannot be Hiatused or Revoked. This trades flexibility for cross-supplement value. See §9.
- **The Declaration.** "THE UDS CONTAINS NO TRAP OPTIONS." Everything is as fair as possible, no hidden text, Rules as Intended governs. This is a trust contract between author and user. See §12.

---

## §2 Rules Framework Analysis

The rules framework is the most important part of UDS. The individual drawbacks are content; the framework is the engine that makes the content meaningful. Get the framework wrong and your chain math falls apart.

### 2.1 Chain Drawback economy

From the source: "Chain Drawbacks add to the Starting CP of every jump, including jumps that have been combined by any means. As long as the component jumps could be taken separately, each jump gets the full value of all active Chain Drawbacks."

This is the compounding engine. A single +200 Chain Drawback on a 10-jump chain produces 2,000 CP. On a 20-jump chain, 4,000 CP. For comparison, a typical jump grants 1,000 starting CP. One mid-tier Chain Drawback over a medium chain equals two full jumps of bonus CP. Stack five of them and you are playing a different budget game entirely.

### 2.2 Hiatus

> "A Chain Drawback can be put on Hiatus (i.e. completely ignored for one jump) by paying thrice its CP value (e.g. A +100 Drawback would end up costing a total of 300 CP to put on Hiatus). This can happen no more than once per 4 jumps and after that jump the Drawback resumes right where it left off. Chain Drawbacks with a value that changes every jump or that have a Special Value cost 400 CP to put on Hiatus, though not all can be put on Hiatus."

**Cost:** 3x the drawback's value. For Special-value drawbacks (Gauntlet-Kun, Retail Rocker, And Only You!, Sadistic Bitch-Chan), the flat cost is 400 CP.

**Frequency cap:** Once per 4 jumps per drawback. Not once per 4 jumps globally; each drawback has its own timer.

**Net math:** Hiatusing a +200 drawback for one jump costs 600 CP. You gain the drawback's CP for that jump (because it's still "active" for fee purposes, like Revoke) but you pay 600 to suspend it. Actually, re-reading: Hiatus means "completely ignored for one jump." The 3x cost is what you pay to ignore it. The source does not say the drawback is still "active" during Hiatus the way Revoke keeps it active during the revocation jump. The cleaner reading: during Hiatus, the drawback is suspended (no effect, no CP from it) and you pay 3x its value as the fee. So Hiatusing a +200 drawback means you lose 200 CP (no effect) and pay 600 CP = net -800 CP swing for one jump of relief. This is only worth it when the drawback's effect in a specific jump would cost you more than 800 CP of advantage.

**Strategic use:** Save Hiatus for jumps where a specific drawback is uniquely punishing (a stealth-focused jump when you have We See You chained, or a social jump when you have Shut Up Jumper chained). Never Hiatus for convenience; the 3x cost makes casual use a CP sink.

### 2.3 Revoke

> "If ever you decide to permanently cancel (Revoke) a Chain-Drawback it ends with your next jump and cannot be activated again until at least 16 jumps have passed. Revoking costs the same as Hiatus. A Chain Drawback must have been active for at least 8 jumps to be eligible for Revoking and cannot have granted Warehouse Points or Body-Mod Points at all. Again, to be clear, A Revoked Chain-Drawback is active during the Jump the Revocation Fee is paid. Its effect is terminated at the end of that jump."

**Three gates:**
1. **Minimum active period:** 8 jumps. You cannot Revoke on a whim; you must have lived with the drawback.
2. **BP/WP lockout:** If the drawback ever routed value to Body Mod or Warehouse, it is permanently non-Revokeable. This is a hard lock. Routing decisions are permanent.
3. **Cooldown:** 16 jumps after Revocation before you can re-activate that drawback. For most chains, this means "gone for good."

**The worked example (from source):**
- Jumps 1-8: Without Why (+200) active. Jumper gets +800 CP over 8 jumps from it.
- Jump 9: Revoking Without Why. Jumper gets +200 (still active this jump) minus 400 (fee) = +200 net. Without Why is still in effect during jump 9.
- Jump 10+: Without Why is gone. Jumper gets +0 from it.

So the Revoke jump costs you the fee but the drawback still applies that jump. You pay 400 CP, you suffer the drawback one more time, and then it is gone forever (or for 16 jumps).

**Strategic implication:** Revoke is for drawbacks that sounded good but turned out to be chain-breaking. The 8-jump minimum means you will have suffered through it for a long time before you can escape. Plan your Chain Drawbacks carefully up front.

### 2.4 UDS and Gauntlets

> "If the Jumper enters a Gauntlet (or a Jump that grants 0 starting CP), one of two things happens; either the Chain Drawbacks are halved in value and still applied to the Gauntlet, or put on Hiatus for no points, but it must be consistent across all such jumps for you."

**Binary choice, must be consistent.** You pick one treatment for all Gauntlets and stick with it:
- **Halve and apply:** Chain Drawbacks fire at half value during Gauntlets. You still get CP.
- **Free Hiatus:** Chain Drawbacks suspend during Gauntlets at no cost. No CP, no effect.

The halve-and-apply path is generally better for CP economy. The free-Hiatus path is better if your Chain Drawbacks would be fatal in a Gauntlet (which strips most powers).

There is also a rule about Chain Drawbacks that duplicate Jump-Specific Drawbacks in Gauntlets: you cannot double-dip, but you can upgrade to the more onerous version for the difference.

### 2.5 Combined Jumps

> "If you apply any method to combine two or more jump documents into a single jump, UDS Drawbacks are applied to all documents without being divided... but all drawbacks in that combined jump become much much harder to nerf or cheese while in that state."

**Full value, all documents, anti-cheese tax.** If you combine 3 jumps, each Chain Drawback fires at full value on all 3. This is a CP bonanza. The counterbalance: drawbacks become harder to nerf. You eat the full force of every drawback across all combined documents. The logic is fair: you could have taken the 3 jumps separately and gotten full points anyway, so banning double-dipping would be pointless.

### 2.6 Renegade Supplement interaction

> "If you choose to combine the Renegade Supplement with the UDS, any drawback you force the Renegade to Chain, you must also Chain. Until you face the Renegade, you may not Revoke or Hiatus any UDS Chain-Drawbacks, but the Renegade may. They don't play by the rules, of course."

**Asymmetric lock.** You are locked out of Hiatus and Revoke until you face the Renegade. The Renegade is not locked. This means the Renegade can drop drawbacks on you that you cannot escape, while you cannot remove your own. For Renegade-integrated chains, plan your Chain Drawbacks as if they are permanent.

### 2.7 Companion CP rules

> "If a Companion gains from a UDS Drawback in a given jump, but is not imported by some mechanism, they do not gain the opportunity to take any Origin. Not even the Free Drop-In or a negative cost 'Drawback' Origin."

**Import gate.** Companions can gain CP from UDS Drawbacks (via And Only You! or other mechanics in the missing Companion Drawbacks section), but without an import mechanism, they cannot spend it on Origins. They get the CP but cannot use it for the standard Origin purchase. This prevents companion CP from becoming a backdoor to free Origins.

### 2.8 The Declaration: trust model

> "THE UDS CONTAINS NO TRAP OPTIONS. EVERYTHING IS AS FAIR AS IT IS POSSIBLE TO BE AND THERE IS NO HIDDEN TEXT. Word of honor. If something screws you it will be because you signed up for it. If it seems like a trap, assume that's because of limitations in the written format. The same applies to apparent loopholes. What you see is what you get. Assume Rules as Intended if there are any questions."

This is significant. Most CYOA supplements operate on a buyer-beware model: if you pick something that sounds good but has hidden downsides, that is your problem. UDS inverts this. The author commits to no hidden text, no trap options, no gotchas. If something reads as a trap, the deficiency is in the written format, not the intent.

**What this means for min-max:** You can read drawback text at face value. If a drawback says "you are 60% taller," that is the whole effect. There is no hidden "and also your bones hurt" clause. If you find an apparent loophole, the Declaration says to assume Rules as Intended, which is more generous than "the loophole doesn't work." It means the loophole works as you would reasonably expect it to, not as a trap.

The trust model runs both ways. You agree not to cheese for pure points (the "must limit you" clause). The author agrees not to hide gotchas. This is a social contract, not a legal one, and it shapes how ambiguities should be resolved: generously, in the spirit of the text.

---

## §3 Safety Dance and AEIOU

Two free perks that come with the UDS. Both are significant.

### 3.1 Safety Dance

> "This perk is free just for being a fan of the UDS. It guarantees that you and your companions will not transmit non-fiatbacked diseases, microbiotics, or memetics unwillingly / unwittingly between settings. This only works as long as you have at least 1 chain drawback active."

**Free disease/memetic firewall.** The catch: you must have at least one Chain Drawback active. If you take zero Chain Drawbacks, Safety Dance does nothing. If you take even one, you and your companions get a cross-setting biosafety layer for free.

This is a soft incentive to take at least one Chain Drawback. The perk itself is valuable (prevents accidental setting contamination, stops you from becoming a pandemic vector every time you jump), and it costs nothing beyond the one-drawback floor. For most builds, you are taking Chain Drawbacks anyway, so Safety Dance is effectively free.

### 3.2 Essjay's Law of AEIOU

> "Absolute, Eternal, Infinite Ontological Uniqueness is now yours. This is a bedrock rule. It cannot be toggled, cannot be drawbacked away (it is a drawback), cannot be Hiatused, cannot be Revoked, cannot be touched by a Gauntlet. If you toggle this on, it doesn't come off."

**What it does:** No evil twins. No mirror-universe selves. No clones (physical or digital) with your memories. Ever. Nobody can create them: not a Drawback, not a Perk, not a Scenario, not a Benefactor, not you.

**What it costs:** You also cannot scoop up alternate selves as backups or Companions. Mirror-universe versions of you exist but are played by "a different actor" (an approximation, not a duplicate). Self-duplication (Multiple Man, Naruto shadow clones) produces drones with just enough "youness" to function, not true copies.

**Strategic value:** This is a hard counter to every clone-twin-mirror-evil-twin plot device in fiction. Settings that weaponize your alternates (Crisis on Infinite Earths, the Mirror Universe, biometric-locked clone traps) cannot use your duplicate against you. The trade-off is losing the ability to harvest alternates as resources.

**Toggle caution:** Once on, it never comes off. It is a bedrock rule, immune to everything including Gauntlets. If your chain strategy depends on cloning yourself or recruiting alternates, do not toggle AEIOU. If your strategy depends on NOT being cloned (which covers most chains), toggle it immediately.

The "(it is a drawback)" parenthetical is odd. AEIOU is listed under "Optional / No Points." The parenthetical seems to mean it is structured as a drawback for rules-interaction purposes (so perks that protect drawbacks apply, drawbacks that cancel perks do not). The source text is ambiguous here. The Declaration says to assume Rules as Intended.

---

## §4 Chain Drawbacks Tier List

15 Chain Drawbacks (including variants and sub-options). Tiers reflect min-max value: CP generated across a chain versus severity of effect. Chain Drawbacks are evaluated differently from Single Jump Drawbacks because their value compounds.

**Tier distribution:**

| Tier | Count |
|------|-------|
| S | 2 |
| A | 4 |
| B | 5 |
| C | 3 |
| D | 1 |

### Tier S (2)

| Drawback | Cost | Justification |
|----------|------|---------------|
| **Retail Rocker** | Special | Double CP from ALL drawbacks + +100 JP/jump for Slot-O-Matic. No starting-CP penalty (unlike Gauntlet-Kun). The only cost is losing discounts ("always pay full price"). For a drawback-stacker this is the single best multiplier in UDS. Pure CP engine. Pairs with everything. |
| **Gauntlet-Kun** | Special | Doubles ALL Universal Drawbacks. Start every jump at 0 CP, earn all CP from drawbacks. Lose perks/items from failed jumps (held until Spark). Halves non-CP stipends. No Hiatus, no Revoke. Same multiplier as Retail Rocker but brutal penalty. Highest ceiling, lowest floor. Break-even is around 500 CP of base Chain Drawbacks (doubling covers the lost starting CP). Does NOT double Retail Rocker. No effect in real Gauntlets. |

### Tier A (4)

| Drawback | Cost | Justification |
|----------|------|---------------|
| **Sadistic Bitch-Chan** | Double Value (jump-specific) | Replaces Sadist-Chan + Bitch-Chan. Forces 400 to 1000 CP of drawbacks per jump, doubles jump-specific drawback value, guardrails (never picks the most expensive unless survivable and fun). Massive CP engine with safety rails. The doubling applies to jump-native drawbacks, stacking multiplicatively with Retail Rocker for jump-native drawback CP. |
| **Random-Chan** | +200 | +200 CP/jump forever. Over 10 jumps = 2,000 CP. Cost: you lose all control over jump order, author must generate a 250+ jump list, you pick 1 of 2 random options. No Revoke. For storytellers this is a feature; for min-maxers it is chaos that can break planned synergies. Raw CP value is top-tier. |
| **Bitch-Chan** | +200 | +200 CP/jump + forces full native drawback slate (600 CP min if no cap) + makes UDS drawbacks harder to cheese. Feedback loop: more drawbacks = more CP. The "harder to cheese" clause means you must genuinely engage with drawbacks. Dream scenario for a drawback-stacker, nightmare for a casual. |
| **And Only You!** | Special (requires No Drawbacks for You!-San) | Companions individually gain half the value of drawbacks you take. If you take 1,000 CP of drawbacks in a jump, each companion gets 500 CP. With 8 companions, that is 4,000 companion CP from one jump. Niche but devastating in its niche. Hiatus/Revoke fee = 400 CP. |

### Tier B (5)

| Drawback | Cost | Justification |
|----------|------|---------------|
| **No Drawbacks for You!-San** | +200 | +200 CP/jump but blocks ALL in-jump non-toggle drawback CP. For a pure Chain-Drawback build (you were not taking jump drawbacks anyway), this is free +200. The real value is enabling And Only You!. Chain Only. |
| **Sadist-Chan** | +150 (up to +300) | Forces your least-favorite jump-specific drawback each jump. +150 base, +200 if the jump has nothing cheap or the forced drawback is 300+, +300 if the forced drawback is 600+. Less severe than Bitch-Chan (one drawback, not full slate). Has a banned-items escape clause (no scaling enemies, no-win scenarios, amnesia, powerlessness, chain-enders). Solid mid-tier. Chain Only. |
| **Variant Sadist-Chan** | +100 (scaling) | Milder version. Demands at least one jump-specific drawback you really dislike every jump. +100 base, +50 more per banned-list item you willingly take. Cheaper entry, can scale. Good for jumpers who want some control. Chain Only. |
| **Old Home Week** | +100 | +100 CP/jump. Warehouse connected to your homeworld; family and friends drop by regularly. No Hiatus, no Revoke. For RP-focused builds this is a story engine. For min-maxers, free +100 with manageable inconvenience. Enables Benefits Package (which is a CP sink, see Tier D). |
| **Refresher Course** | +100 | +100 CP/jump. Personality resets to homeworld baseline at the end of every jump. Prevents character drift. Some jumpers want this (preserve original self), others hate it (lose character development and growth). Pure preference call with positive CP. |

### Tier C (3)

| Drawback | Cost | Justification |
|----------|------|---------------|
| **Pseudo-Random-Chan** | +50 | +50 CP/jump. Author controls jump order (same 250-jump restriction as Random-Chan). In single-player, where you are both author and jumper, this is nearly free CP with a fig leaf of restriction. Low value but low cost. Cannot combine with Random-Chan. |
| **Thomas Wolfe Rule** | +100 for 8 jumps, then +50 for 8 more | Can never take the Go Home option. If you chainfail, you pick any non-native reality to settle in. Persists through Spark. Time-limited (16 jumps total). For most jumpers, "home" is irrelevant since you are jumping forever. Minor. No Hiatus, no Revoke. |
| **River Corollary** | +100 (requires Thomas Wolfe Rule) | Can never return to any jump you have left. More impactful than TWR alone (locks you out of revisiting favorite settings) but still manageable for forward-looking chains. No Hiatus, no Revoke. |

### Tier D (1)

| Drawback | Cost | Justification |
|----------|------|---------------|
| **Benefits Package** | -300 CP every jump | The only CP-negative Chain Drawback. Costs 300 CP per jump, forever. Requires Old Home Week. Provides some narrative benefit to family (presumably plot hooks and complications). Never take this for min-max. Purely narrative. |

---

## §5 Jumper Drawbacks Tier List

17 Jumper Drawbacks (including variants). These are evaluated at their best-value mode (single jump or chain, whichever produces better CP-to-severity ratio). Jumper Drawbacks are lower-value than Chain Drawbacks because they do not compound. Most are single-jump inconveniences for modest CP. The tier ceiling reflects this: no Jumper Drawback reaches S tier because none can match the compounding power of Chain Drawbacks.

**Tier distribution:**

| Tier | Count |
|------|-------|
| S | 0 |
| A | 1 |
| B | 2 |
| C | 12 |
| D | 2 |

### Tier A (1)

| Drawback | Cost | Justification |
|----------|------|---------------|
| **In Deep Water** | Variable: +50 to +300, double for molasses (+600 max) | Highest single-drawback CP ceiling in the Jumper category. Setting-dependent severity: in a desert jump, "you are in deep water" is nearly free CP; in an ocean jump, it is brutal. The molasses double (+600) is comedic but offers the best CP-to-severity ratio in the category if your build can handle being submerged in molasses. Flexibility and ceiling make this top-tier. |

### Tier B (2)

| Drawback | Cost | Justification |
|----------|------|---------------|
| **Shut Up Jumper!** | +200 single / +100 chain | Cannot speak. Chained at +100/jump = 1,000 CP over 10 jumps, which is strong value. Workarounds exist: writing, sign language, telepathy, body language, powers that bypass speech. If your build has any alternative communication method, the severity drops sharply while the CP stays. |
| **Gunshy** | +100 / +200 / +300 | Escalating pacifism. +300 for total unwillingness to fight is a lot of single-jump CP. Devastating for combat builds, irrelevant for thinker/social/diplomat builds. The escalating tiers let you calibrate severity. Pick the tier that matches your build's combat dependency. |

### Tier C (12)

| Drawback | Cost | Justification |
|----------|------|---------------|
| **Age of Descent** | +50 to +200 | Agelocked at 10/8/6/4 years old. +200 max. Mechanically severe (reduced strength, reach, social standing, legal agency). Some settings treat children very differently, which can help or hurt. Body Mod offsets can mitigate. Bad for combat, neutral for social, setting-dependent overall. |
| **We See You** | +200 | Bad at stealth. +200 flat. Free CP for combat-brute-social builds that never sneak. Build-defining negative for stealth/stranger builds. No scaling, no chain variant specified. |
| **Pose of the Day!!!!** | +200 | Genki Girl/Boy at "almost always dialed to 144%." RP-heavy, mechanically minor unless the setting punishes exuberance or attention-drawing behavior. High CP for a flavor drawback. |
| **Stochastic Scalar Suckage** | +200, Chain Only | Random size changes (2x/week to 3x/day). +200 CP/jump forever. Chain-only means it compounds like a Chain Drawback. Chaotic and potentially fatal at wrong moments (mid-stealth, mid-combat, mid-delicate-social-scene). High value, high variance. |
| **A Giant Among Jumpers** | 2x Giant Adventure (~+200 single / ~+100 chain) | 210% normal size. Double the base drawback's value. Infrastructure problems, attention, cannot fit in normal spaces. Severity is real but manageable for brute or outdoor builds. |
| **A Giant Adventure!** | +100 single / +50 chain | 160% size (60% taller, wider, thicker than average). Minor inconvenience in most settings. Easy CP for larger species or builds that do not rely on blending in. |
| **A Little Drawback** | Same as A Giant Adventure! (variant) | 60% of normal size. Symmetric counterpart to A Giant Adventure. Same CP, mirror-image inconvenience. |
| **A Petite Problem** | Same as A Giant Among Jumpers (variant) | 20% of normal size. Symmetric to Giant Among Jumpers. Being mouse-sized is mechanically distinct from being giant but equally disruptive. |
| **Cyclopes Psi-Ops** | +100 single / +50 chain | One eye. +100 single jump. Minor mechanical effect (reduced depth perception, bad for ranged combat/archery). Easy CP for melee or social builds. |
| **Ferret Lady** | +108 | "You are just plain weird. Everyone notices." +108 CP. The non-round number is a gag. Nuisance but not debilitating. Enables Un-Bearable. |
| **Do You OoWoo?** | +100 | Very cute (between a bunny with a pancake on its head and a kitten). +100 CP. Minor social effect. Can be leveraged (charm, disarming) or annoying (not taken seriously). Setting-dependent. |
| **Stone Sober** | +100 | Cannot consume mood-altering substances more potent than tea. +100 CP. Irrelevant for most jumps, bad for addiction plotlines or substance-dependent power systems. Easy CP for most builds. |

### Tier D (2)

| Drawback | Cost | Justification |
|----------|------|---------------|
| **Un-Bearable** | +57 (requires Ferret Lady) | You are a bear. +57 additional CP (total with Ferret Lady: 165). The gag continues (108 + 57 = 165, both non-round numbers). Being a bear is actually a buff in some settings (natural Brute stats, claws, durability). Niche and low CP. |
| **All the Hats** | +50 | Convinced anything you can put on your head is a hat. +50 CP. Gag drawback. Minimal CP, minimal mechanical impact unless a setting exploits the delusion. |

---

## §6 Missing Categories Note

This analysis covers the Chain Drawbacks and Jumper Drawbacks sections only. The source extraction was truncated by the webfetch tool's context window. The following UDS v1.13 categories exist in the source document but are NOT analyzed here. Where applicable, I note where each would fit in a complete analysis.

### Missing categories (from changelog and source notes)

| Category | New in v1.13 | Where it fits |
|----------|--------------|---------------|
| **Warehouse Drawbacks** | New Warehouse Who's This, No Inventory, Timelapse, Threadripper | Would have their own tier list section. These are the WP-routing source (see §9). The Hate Squad and Vortex of Enemies escalation lives here (referenced in changelog: "Clarified how CID interacts with Gauntlet-Kun and Retail Rocker"). |
| **Companion Drawbacks** | Old Companion Lockout, Importation Lottery, One Jump Charlie, One Jump Charlie Foxtrot, Wedding Bell Blues | Would fit alongside the Jumper Drawbacks tier list. Include companion-specific CP routing mechanics. |
| **Power Drawbacks** | Stop Showing Off!, Wrong Genre Savant, Menu-Sama | Would fit alongside Jumper Drawbacks. These presumably limit or disrupt powers. |
| **Thematic Drawbacks** | Walking in London, Street Tier | Would fit alongside Jumper Drawbacks. "Jumpchain is Magic" was also clarified in v1.13. |
| **HQ Drawbacks** | Jonesin' for the Joe, Oh God! The Monkeys!, Creepy Cats, Of No Consequence, Of Limited Scale, Annoying Goose, Horrible Swan | Would fit alongside Jumper Drawbacks. These are the largest single-category addition in v1.13 (7 new). |
| **Dietary Drawbacks** | Supplemental Energy, Maintenance Dose | Would fit alongside Jumper Drawbacks. |
| **Challenge Mode Drawbacks** | All In Your Head | Would fit alongside Jumper Drawbacks or a dedicated Challenge Mode section. |
| **Origin Drawbacks** | Jumper Who, Awakening From A Dream | Would fit alongside Jumper Drawbacks. These disrupt the Origin purchase mechanic. |
| **Questionable Drawbacks** | Big Eater, Ferr & Balanced | Would fit alongside Jumper Drawbacks. The "Questionable" label suggests mature or gimmick content. |
| **Alternative Event Drawbacks** | Abandoned by the Chain, Historical Accuracy Be Damned | Would fit alongside Jumper Drawbacks. These alter the setting's canonical events. |
| **Starting Drawbacks** | Playing Catchup! | Would fit alongside Jumper Drawbacks. |
| **The Hub** | Clarified and expanded in v1.13 | A mechanic, not a drawback category. Presumably a between-jump space. Needs its own section. |
| **Bitch of Destiny** | Important Note added in v1.13 | A standalone mechanic. Referenced in changelog. Needs its own section. |
| **CID (Drawback Stacking) interactions** | Clarified with Gauntlet-Kun and Retail Rocker in v1.13 | A rules mechanic for how drawbacks stack. Referenced in changelog. Needs integration into §2 Rules Framework. |
| **Hate Squad / Vortex of Enemies escalation** | Referenced in Warehouse section | A two-stage enemy escalation mechanic. Hate Squad (presumably weaker) escalates to Vortex of Enemies (presumably stronger). Referenced in changelog as part of Warehouse Drawbacks. Would be high-tier enemy-spawning drawbacks. |

### Impact on this analysis

The missing categories change the tier distribution. A complete UDS analysis would likely include several more S and A tier drawbacks from Warehouse, Companion, and Power sections. The Hate Squad to Vortex of Enemies escalation alone is probably S-tier (persistent enemy spawning is a classic high-value drawback category). Without the source text, I cannot tier these honestly, so I leave them out rather than guess.

The missing CID (Drawback Stacking) interactions and the Bitch of Destiny note also affect §2 and §7. These are rules-mechanic clarifications that would refine the stacking analysis. The changelog says v1.13 clarified how CID interacts with Gauntlet-Kun and Retail Rocker, which directly affects the §8 synergy analysis. Without the text, the synergy section is necessarily incomplete.

To get the full UDS, fetch the Google Doc v1.13 text export in sections (the full export is roughly 30KB and exceeds webfetch's context window in one call).

---

## §7 Drawback Stacking Strategies

### 7.1 Hiatus math

Hiatus costs 3x a drawback's value (400 CP for Special-value drawbacks). The frequency cap is once per 4 jumps per drawback. The strategic question: when is Hiatus worth the cost?

**Break-even:** Hiatus is worth it when the drawback's effect in a specific jump costs you more than 3x its CP value in lost advantage. For a +200 drawback (600 CP Hiatus fee), you need the drawback's negative effect in that jump to be worth more than 600 CP of disadvantage. This is a high bar. Most drawbacks, even at full force, do not cost you 600 CP worth of effectiveness in a single jump.

**When to Hiatus:**
- A stealth-focused jump when you have We See You or Shut Up Jumper chained.
- A social jump when a body-mod drawback (size, appearance, speech) would be uniquely crippling.
- A Gauntlet jump (if you chose the "apply at half value" Gauntlet policy and want to avoid a specific drawback).

**When NOT to Hiatus:**
- The drawback is merely annoying. 3x value is too expensive for convenience.
- You are saving the once-per-4-jumps window for a worse jump later.
- The drawback's effect is constant across jumps, so there is no "better" jump to Hiatus it during.

### 7.2 Revoke timing

Revoke requires 8 jumps of active duration, costs 3x value (same as Hiatus), and triggers a 16-jump cooldown before re-activation. The drawback remains active during the Revocation jump.

**Optimal timing:** Revoke as early as possible after the 8-jump minimum. The longer you wait, the more jumps you suffer a drawback you already decided to remove. The 16-jump cooldown is effectively permanent for most chains, so treat Revoke as irreversible.

**BP/WP lockout:** If you ever routed the drawback to Body Mod (half value) or Warehouse (WP boost), it is permanently non-Revokeable. This is the single most important constraint on the routing decision (see §9). Route only drawbacks you are certain you will never want to remove.

### 7.3 Gauntlet interaction timing

You must choose your Gauntlet policy (halve-and-apply vs free-Hiatus) once and stick with it across all Gauntlet jumps. This is a chain-level decision, not a per-jump one.

**Halve-and-apply** is generally better for CP economy. You lose half the CP but still gain something, and your drawbacks still fire (at reduced severity). For most Chain Drawbacks, half-effect in a Gauntlet (where powers are stripped anyway) is tolerable.

**Free-Hiatus** is better if your Chain Drawback stack includes drawbacks that would be fatal without powers (enemy spawning, physical transformations, sensory penalties in power-dependent scenarios).

### 7.4 Cross-drawback interactions

Several Chain Drawbacks modify each other:

- **Sadistic Bitch-Chan replaces Sadist-Chan and Bitch-Chan.** You cannot run all three. Sadistic Bitch-Chan is the combined version with guardrails.
- **Random-Chan and Pseudo-Random-Chan cannot combine.** Same mechanic, different control levels.
- **And Only You! requires No Drawbacks for You!-San.** Sequential prerequisite.
- **River Corollary requires Thomas Wolfe Rule.** Sequential prerequisite.
- **Benefits Package requires Old Home Week.** Sequential prerequisite (and Benefits Package is a CP sink, so this is a narrative combo, not a min-max one).
- **Un-Bearable requires Ferret Lady.** Sequential prerequisite.
- **Gauntlet-Kun does NOT double Retail Rocker.** Explicit in source. These two multipliers are partially non-stacking.
- **Gauntlet-Kun has no effect in real Gauntlets.** The doubling only applies to normal jumps.

### 7.5 Hate Squad to Vortex of Enemies escalation (missing text)

The changelog references this as part of the Warehouse Drawbacks section, and the source notes list it under missing categories. Based on the naming convention and Jumpchain community context:

**Hate Squad** is presumably a persistent-enemy drawback where a group of hostile entities targets you across the chain. **Vortex of Enemies** is presumably an escalated version, either a prerequisite or a follow-up, that increases the severity or number of enemies.

Without the source text, I cannot confirm the exact mechanic, CP value, or stacking rules. The changelog note that v1.13 "Clarified how CID interacts with Gauntlet-Kun and Retail Rocker" suggests these drawbacks have non-trivial interactions with the CP-doubling multipliers. If Hate Squad or Vortex of Enemies has a Special value, Gauntlet-Kun would double it (subject to the "does not double Retail Rocker" carve-out).

In a complete analysis, this pair would likely land in S or A tier. Persistent enemy spawning is a classic high-value drawback category because it provides constant narrative pressure and combat engagement, which justifies high CP, while a prepared jumper can mitigate the threat with combat perks. This is the "baddies attack me" pattern documented in `../worm-cyoa-v6/drawback-catalog.md`, where enemy-spawning drawbacks function as inverted buffs for Trump-stack builds.

---

## §8 Within-UDS Synergies

### 8.1 The CP Engine Combo: Retail Rocker + Chain Drawback stack

Retail Rocker doubles CP from all drawbacks. Every Chain Drawback you add benefits from this doubling. This is the foundational synergy of UDS min-maxing.

**Math:** 1,000 CP of base Chain Drawbacks + Retail Rocker = 2,000 CP/jump. Over 10 jumps = 20,000 CP. The only cost is losing discounts ("always pay full price"), which is a flat tax on purchases, not a CP reduction.

**Stacking with Sadistic Bitch-Chan:** Sadistic Bitch-Chan doubles jump-specific drawback value. Retail Rocker doubles all drawback CP. These stack multiplicatively for jump-native drawbacks: a 200 CP jump-native drawback becomes 400 CP (Sadistic Bitch-Chan) then 800 CP (Retail Rocker). This is the maximum legitimate CP multiplier available for jump-native drawbacks.

### 8.2 The Companion Pump: No Drawbacks for You!-San + And Only You! + Bitch-Chan

- **No Drawbacks for You!-San** blocks you from gaining CP on in-jump non-toggle drawbacks.
- **And Only You!** redirects that CP to companions (half value each).
- **Bitch-Chan** forces a full slate of native drawbacks (600 CP min).

Combined: Bitch-Chan forces 600+ CP of native drawbacks per jump. You gain no CP from them (No Drawbacks for You!-San). Your companions each gain 300+ CP (half of 600 via And Only You!). With 8 companions, that is 2,400+ companion CP per jump. Add Retail Rocker and the question becomes whether the doubling applies to companion-routed CP (ambiguous, Declaration says assume Rules as Intended, which probably means yes).

### 8.3 Gauntlet-Kun + heavy Chain Drawback stack

Gauntlet-Kun starts you at 0 CP but doubles all Universal Drawbacks. Break-even: if your base Chain Drawback stack exceeds your normal starting CP (typically 1,000), the doubling outpaces the lost starting CP.

**Example:** 1,200 CP of base Chain Drawbacks + Gauntlet-Kun = 2,400 CP/jump from drawbacks, minus 1,000 lost starting CP = net +1,400 CP/jump. Without Gauntlet-Kun: 1,200 CP/jump from drawbacks + 1,000 starting = 2,200 CP/jump. So Gauntlet-Kun wins by 200 CP/jump if your stack exceeds the break-even point.

**Risk:** Gauntlet-Kun confiscates perks and items from failed jumps (held until Spark). If you fail jumps, you lose builds. The doubling is not worth it if your chain has a high failure risk.

**Note:** Gauntlet-Kun does NOT double Retail Rocker. If you run both, Retail Rocker stays at its base effect (double drawback CP, +100 JP/jump) and Gauntlet-Kun doubles everything else. This is one of the few explicitly non-stacking interactions.

### 8.4 Narrative combos (low min-max value, high story value)

- **Old Home Week + Benefits Package:** Family visits + complications. Costs 300 CP/jump (Benefits Package is CP-negative). Pure story engine. Do not take for CP.
- **Thomas Wolfe Rule + River Corollary:** Can never go home, can never return to past jumps. The full "no looking back" package. +200 CP/jump for the pair. Clean exile narrative.
- **Ferret Lady + Un-Bearable:** Weird + bear. 165 CP total. Comedy duo. The non-round numbers (108 + 57) are the joke.
- **A Giant Adventure + A Little Drawback:** Unclear if stackable (one makes you 160%, the other 60%). Probably mutually exclusive variants. If somehow stackable, the math does not produce a coherent size.
- **Age of Descent + A Petite Problem:** Being 4 years old and 20% size = extremely small child. Devastating mechanically, high CP, niche narrative use only.

### 8.5 Anti-synergies (do not combine)

- **Sadist-Chan + Bitch-Chan:** Sadistic Bitch-Chan replaces both. Do not take all three.
- **Random-Chan + Pseudo-Random-Chan:** Same mechanic, explicitly non-combinable.
- **Gauntlet-Kun + Retail Rocker:** Partial anti-synergy. Gauntlet-Kun does not double Retail Rocker's effect. Both can be active, but the multipliers do not fully stack.
- **No Drawbacks for You!-San + Sadist-Chan/Bitch-Chan (without And Only You!):** No Drawbacks blocks you from gaining CP on in-jump drawbacks. Sadist-Chan and Bitch-Chan force you to take in-jump drawbacks. Without And Only You!, you are forced to take drawbacks that give you nothing. Take And Only You! if you run this combo.

---

## §9 Cross-Supplement Synergy

UDS is designed to route value to other supplements. This section covers the routing mechanics that connect UDS to the Body Mod Supplement and the Warehouse / Personal Reality Supplement. The other supplement analysis docs (Essential Body Mod, SB Body Mod, Personal Reality Supplement) will complete this picture.

### 9.1 UDS to Body Mod (BP routing)

From the source: "If you want, you can take a Chain Drawback to add half its value to the Body Mod Supplement... but doing so means you only get half its value in all jumps. (e.g. a 200 CP Chain Drawback would give 100 CP to the Body Mod Supplement and 100 CP each jump). Such a Chain Drawback cannot be put on Hiatus nor Revoked."

**The trade:**
- Without routing: +200 CP/jump forever.
- With routing: +100 BP (one-time, at chain start) + +100 CP/jump forever.

You sacrifice 100 CP/jump for a 100 BP one-time boost. Over a 10-jump chain, that is 1,000 CP lost for 100 BP gained. This is a bad trade for long chains and a neutral trade for very short chains (2 jumps or fewer).

**The lock:** Routed drawbacks cannot be Hiatused or Revoked. Ever. This is permanent. If the drawback turns out to be chain-breaking, you have no escape. Route only drawbacks you are absolutely certain about.

**Strategic use:** Route only when the Body Mod CP is more valuable than the per-jump CP. This is true when:
1. Your chain is very short (2 to 3 jumps), so the per-jump loss is minimal.
2. The Body Mod purchase you want is build-defining and you need the BP now.
3. The drawback is low-severity and you would never want to remove it anyway.

For most chains, do not route. The per-jump CP loss compounds and the permanent lock is dangerous.

### 9.2 UDS to Warehouse / Personal Reality (WP routing)

From the source: "the Warehouse Drawbacks do grant one-time boosts to the Warehouse if you make them Chain Drawbacks since they limit the utility of the Warehouse."

**Mechanic:** Warehouse Drawbacks, when taken as Chain Drawbacks, grant one-time WP boosts to the Warehouse. This is separate from the BP routing mechanic. The source does not specify the WP amount (it would be in the missing Warehouse Drawbacks section).

**Note:** The Personal Reality Supplement (PRS) uses WP as its currency. UDS Warehouse Drawbacks routing to WP would feed into PRS purchases. This is the UDS-to-PRS pipeline. Without the Warehouse Drawback texts, I cannot calculate the exact routing value or identify which Warehouse Drawbacks offer the best WP-per-severity ratio.

### 9.3 Supplement Mode exception

From the source: "This does not apply to jumps in 'Supplement Mode' or jump specific supplements."

BP/WP routing does not apply when a jump is in Supplement Mode or when using jump-specific supplements. This means the routing mechanic is specifically for standalone supplements (Body Mod, Warehouse/PRS), not for jump-integrated supplement interactions.

### 9.4 What the other supplement docs will add

This section will be expanded when the Essential Body Mod, SB Body Mod, and Personal Reality Supplement analysis docs are complete. Key questions those docs will answer:

- What is the BP-to-power ratio in each Body Mod variant? (Determines whether UDS BP routing is worth the per-jump CP loss.)
- What is the WP-to-feature ratio in PRS? (Determines whether UDS WP routing is worth the Warehouse Drawback severity.)
- Are there Body Mod or PRS perks that specifically interact with UDS drawbacks (e.g., mitigate a specific drawback's effect)?

---

## §10 Build Archetypes

Five archetypes that represent distinct approaches to UDS. Each has a different relationship to the CP engine, the narrative contract, and the risk profile.

### Archetype 1: The Maximum Drawback Stacker

**Philosophy:** UDS is a CP engine. Stack every compatible multiplier and drawback. Maximize CP per jump. Accept the severity because the CP buys the tools to survive it.

**Core picks:**
- Retail Rocker (double all drawback CP)
- Bitch-Chan (force full native drawback slates, +200/jump)
- Sadist-Chan or Variant Sadist-Chan (extra forced drawback CP)
- Multiple low-severity Chain Drawbacks (Pseudo-Random-Chan, Old Home Week, Refresher Course, Thomas Wolfe Rule)
- Chain as many Jumper Drawbacks as tolerable (Shut Up Jumper, Stone Sober, Cyclopes)

**Play style:** High CP, high severity, high preparation. Every jump you are rolling in CP but dealing with 5 to 10 active drawbacks. Requires a jumper who can plan around constraints.

**Risk:** If you cannot handle the accumulated severity, you chainfail. Retail Rocker does not protect you from drawback effects, it only doubles the CP.

### Archetype 2: The Casual Storyteller

**Philosophy:** UDS is a story tool, not a CP engine. Take drawbacks that generate narrative, not CP. Let the chain breathe.

**Core picks:**
- Random-Chan or Pseudo-Random-Chan (let the chain unfold organically)
- Old Home Week (family visits, story hooks)
- Refresher Course (character consistency)
- One or two mild Jumper Drawbacks for flavor

**Play style:** Low CP, low severity, high narrative density. The chain is about the journey, not the build. Drawbacks exist to create story, not to fund power.

**Risk:** Underpowered for high-threat settings. The casual stack does not generate enough CP for expensive perk trees.

### Archetype 3: The Gauntlet-Kun Masochist

**Philosophy:** Hardcore mode. Start at 0 CP every jump. Earn everything from drawbacks. Embrace the suffering.

**Core picks:**
- Gauntlet-Kun (double all Universal Drawbacks, start at 0 CP)
- Heavy Chain Drawback stack (to push base value above break-even)
- Bitch-Chan (force native drawbacks, which you need since you start at 0)
- Retail Rocker is optional but note Gauntlet-Kun does not double it

**Play style:** Every jump is a scramble. You start with nothing and must earn your entire build from drawbacks within that jump. The doubling means your drawbacks are worth double, so you can afford more, but the severity is also doubled in practice (Gauntlet-Kun "will guarantee you deal with the full force of every Drawback you take").

**Risk:** Highest risk archetype. Failed jumps cost you all perks and items from that jump. If you fail several jumps, you are depowered for subsequent jumps, which increases failure risk. Death spiral potential.

### Archetype 4: The Companion Benefactor

**Philosophy:** UDS exists to pump companion CP. You take the hits so your companions can shine.

**Core picks:**
- No Drawbacks for You!-San (block self-CP from in-jump drawbacks)
- And Only You! (route half value to each companion)
- Bitch-Chan (force native drawbacks, feeding the companion pump)
- Retail Rocker (double the drawback value, potentially doubling companion gains)
- Old Home Week (companions can meet your family, story hook)

**Play style:** You are the tank, your companions are the DPS. Every jump, your companions gain large CP while you gain Chain Drawback CP only. Over time, your companions outscale you.

**Risk:** If your companions are killed or separated, you lose your primary asset. Your own build is underfunded because you are routing CP away from yourself.

### Archetype 5: The Hate Squad Magnet

**Philosophy:** Take every enemy-spawning drawback available. Turn the chain into a constant war zone. Use the CP to build a combat monster that thrives under pressure.

**Core picks:**
- Whatever the Hate Squad / Vortex of Enemies drawbacks are (missing from this extraction, but this is the archetype they enable)
- Bitch-Chan (more drawbacks, more enemies from native drawbacks)
- Retail Rocker (double the CP from all those enemy-spawning drawbacks)
- Gauntlet-Kun optional (double everything, embrace the chaos)

**Play style:** Every jump is a fight for survival against persistent enemies that follow you across the chain. The CP from the enemy drawbacks funds the combat perks needed to fight them. This is the "inverted buff" pattern: enemy-spawning drawbacks are CP-positive for combat builds because the CP buys more combat power than the enemies threaten.

**Risk:** If your combat build has a gap, the persistent enemies will find it. This archetype has no room for error. (This archetype is speculative pending the missing Warehouse Drawbacks text, but it is a standard Jumpchain build pattern.)

---

## §11 Sample Builds

### Sample Build 1: Maximum Drawback Stacker (10-jump chain)

**Chain Drawbacks:**
- Retail Rocker [Special]: double all drawback CP, +100 JP/jump for Slot-O-Matic
- Bitch-Chan [+200]: forces 600 CP min native drawbacks, harder to cheese
- Sadist-Chan [+150]: forces least-favorite native drawback each jump
- Old Home Week [+100]: family visits (manageable)
- Refresher Course [+100]: personality resets (narrative preference)
- Pseudo-Random-Chan [+50]: author controls jump order (you are the author)
- Thomas Wolfe Rule [+100 for 8 jumps, +50 for 2 more]: cannot go home

**Base Chain Drawback value:** 200 + 150 + 100 + 100 + 50 + 100 = 700 CP/jump average (TWR drops to +50 after jump 8).

**With Retail Rocker doubling:** 1,400 CP/jump from Chain Drawbacks.

**Plus Bitch-Chan forced native drawbacks:** 600 CP min/jump. Doubled by Retail Rocker = 1,200 CP from native drawbacks.

**Plus Sadist-Chan forced drawback:** Variable, minimum +150 CP equivalent, doubled by Retail Rocker = +300 CP.

**Total per jump:** ~1,400 (chain) + 1,200 (Bitch-Chan native) + 300 (Sadist-Chan native) = ~2,900 CP/jump.

**Over 10 jumps:** ~29,000 CP. Plus the base 1,000 CP/jump starting = 10,000 CP. Grand total: ~39,000 CP over 10 jumps.

**Cost:** You take at least 2 forced native drawbacks per jump (Bitch-Chan + Sadist-Chan), plus 6 Chain Drawbacks always active, plus no discounts on anything. Severity is high. You are playing on hard mode for premium CP.

### Sample Build 2: Companion Benefactor (8-companion chain, 10 jumps)

**Chain Drawbacks:**
- No Drawbacks for You!-San [+200]: no self-CP from in-jump drawbacks
- And Only You! [Special]: companions gain half the value of drawbacks you take
- Bitch-Chan [+200]: forces 600 CP min native drawbacks
- Retail Rocker [Special]: double all drawback CP
- Old Home Week [+100]: story hook, family meets companions

**Chain Drawback value (self):** 200 + 200 + 100 = 500 CP/jump base. With Retail Rocker doubling: 1,000 CP/jump for self.

**Native drawbacks (forced by Bitch-Chan):** 600 CP min. Doubled by Retail Rocker = 1,200 CP. Routed via And Only You!: companions each gain half = 600 CP per companion per jump.

**With 8 companions:** 8 x 600 = 4,800 companion CP/jump.

**Over 10 jumps:** 48,000 companion CP total (6,000 per companion). Plus 10,000 self CP from Chain Drawbacks. Plus 10,000 base starting CP.

**Cost:** You take forced native drawbacks every jump but gain no CP from them yourself. Your companions scale much faster than you. You are the support frame for a companion army.

**Ambiguity:** Does Retail Rocker double the companion-routed CP? The source says "you get double the CP from all drawbacks." Companions gain CP from drawbacks via And Only You!. The cleanest Rules as Intended reading is that the doubling applies to the drawback's CP value before routing, so companions get half of the doubled value. This build assumes that reading. If the doubling only applies to the jumper's CP, companion gains are halved (300 CP each instead of 600).

### Sample Build 3: Gauntlet-Kun Masochist (10-jump chain, break-even analysis)

**Chain Drawbacks:**
- Gauntlet-Kun [Special]: double all Universal Drawbacks, start at 0 CP
- Bitch-Chan [+200]: forces 600 CP native drawbacks
- Old Home Week [+100]
- Refresher Course [+100]
- Pseudo-Random-Chan [+50]
- Thomas Wolfe Rule [+100/then +50]
- Shut Up Jumper! [+100 chain variant]
- Stone Sober [+100 chained]
- Cyclopes Psi-Ops [+50 chained]

**Base Chain Drawback value:** 200 + 100 + 100 + 50 + 100 + 100 + 100 + 50 = 800 CP/jump (average, TWR varies).

**With Gauntlet-Kun doubling:** 1,600 CP/jump from Chain Drawbacks.

**But start at 0 CP:** normal starting 1,000 CP is gone.

**Net per jump:** 1,600 (from doubled chain drawbacks) + 0 (starting) = 1,600 CP/jump.

**Without Gauntlet-Kun (comparison):** 800 (chain) + 1,000 (starting) = 1,800 CP/jump.

**Break-even analysis:** Gauntlet-Kun produces 1,600 CP/jump vs 1,800 without it. This build is BELOW break-even. To make Gauntlet-Kun profitable, the base Chain Drawback stack must exceed 1,000 CP (so doubled = 2,000+, which beats 1,000 base + 1,000 chain = 2,000). This build is 200 CP short of break-even.

**Fix:** Add 200+ more base Chain Drawbacks (We See You chained at +200, or Age of Descent at +200, or both). Then base = 1,000+, doubled = 2,000+, and Gauntlet-Kun wins.

**Risk:** Every failed jump loses all perks and items from that jump. With 8+ Chain Drawbacks at full Gauntlet-Kun severity, failure risk is high. This is the highest-variance build in UDS.

---

## §12 Edge Cases and Rulings

### 12.1 The Brick rule

> "If you try to use a Single Jump Drawback from the UDS instead of an identical (or extremely similar one) from the jump document itself in order to get more points, Jump-Chan will hit you with a brick."

The brick is an anti-cheese enforcement mechanism. If a jump has a "Companion Blocker" drawback worth +100, and you try to use the UDS Companion Blocker (worth +200) instead to get more CP, you get bricked.

**Brick properties:** "Jump-Chan's bricks punch right through fiat and leave really nasty bruises." The brick bypasses fiat-backed protections. This is one of the few things in Jumpchain that ignores fiat. It exists specifically to prevent UDS Single Jump Drawbacks from being used as CP-inflated substitutes for jump-native equivalents.

**Ruling:** Always use the jump-native version of a drawback if one exists. UDS Single Jump Drawbacks are filler for jumps that lack a comparable option, not an upgrade path.

### 12.2 The "must limit you" clause

> "If a Drawback would have effectively no impact on you, you can't get points for it. It has to, in some way, limit your options or provide some negative value. You liking the Drawback does not devalue it."

Two-part test for drawback validity:
1. **Impact test:** The drawback must have some effect on your chain. A drawback that your build completely negates awards no CP.
2. **Liking test:** Enjoying the drawback does not disqualify it. If you genuinely enjoy being a giant (A Giant Adventure!) and your build benefits from size, the drawback still awards CP as long as it has some limiting effect somewhere.

**Edge case:** What if your build negates part of a drawback but not all? Example: you have a perk that lets you communicate telepathically, and you take Shut Up Jumper (cannot speak). The drawback still limits you (no verbal communication with non-telepaths, no verbal spell components, no shouting for help). It has impact. You get the CP.

**Edge case:** What if your build completely negates the drawback? Example: you have a perk that makes size irrelevant, and you take A Giant Adventure. The drawback has no impact. You get no CP. The Declaration says assume Rules as Intended: the intent is that drawbacks cost you something. If they cost nothing, they pay nothing.

### 12.3 Combined Jumps rule

> "UDS Drawbacks are applied to all documents without being divided... but all drawbacks in that combined jump become much much harder to nerf or cheese while in that state."

Full value on all combined documents. No division. The trade-off is that drawbacks become harder to nerf, meaning you eat the full severity across all combined settings.

**Implication:** Combined Jumps are a CP multiplier for Chain Drawbacks (full value per document) but also a severity multiplier (full drawback effect across all documents). This is balanced for Chain Drawbacks but can be brutal for Single Jump Drawbacks taken in a combined jump, where the "harder to nerf" clause amplifies their effect.

### 12.4 The Declaration and ambiguity resolution

The Declaration ("no trap options, no hidden text, Rules as Intended") is the governing principle for resolving ambiguities. When the text is unclear:

1. **Assume the text says what it appears to say.** No hidden meanings.
2. **If it seems like a trap, the deficiency is in the format, not the intent.** Read generously.
3. **Apparent loopholes work as you would reasonably expect.** Not as exploits, but as functional mechanics.
4. **Rules as Intended governs.** If RAW and RAI conflict, RAI wins.

This is more generous than most CYOA supplements, which default to "if it seems too good to be true, it is." UDS defaults to "if it seems fair, it is."

### 12.5 Body Mod routing and Revoke lockout

A Chain Drawback routed to Body Mod (half value as BP) can never be Hiatused or Revoked. This is permanent and irreversible. The source text is explicit: "Such a Chain Drawback cannot be put on Hiatus nor Revoked."

**Ruling:** Treat BP routing as a permanent commitment. Only route drawbacks that are low-severity and that you would never want to suspend or remove. If in doubt, do not route.

### 12.6 Companion CP without import

Companions who gain CP from UDS Drawbacks but are not imported cannot take any Origin, including Free Drop-In or negative-cost Origins. This prevents companion CP from becoming a backdoor to free Origins or Origin-discounted purchases.

**Ruling:** If you want companions to spend their UDS-gained CP on Origins, you must import them through some mechanism (jump-native import, companion supplement, etc.) in that jump. Without import, the CP sits unused or can only be spent on non-Origin purchases (if the jump allows companion spending outside Origins).

### 12.7 Renegade Supplement lockout

When running the Renegade Supplement alongside UDS, you cannot Hiatus or Revoke any UDS Chain Drawback until you face the Renegade. The Renegade can Hiatus or Revoke your drawbacks freely ("they don't play by the rules").

**Ruling:** For Renegade-integrated chains, treat all Chain Drawbacks as permanent until the Renegade confrontation. The Renegade can weaponize this by Revoking your beneficial-for-you Chain Drawbacks (if any exist that you want to keep for narrative reasons) or by adding new ones you cannot remove.

---

## §13 Power Creep Assessment

### 13.1 UDS as the dominant CP source

UDS is the single most powerful CP source in the Jumpchain supplement ecosystem. No other supplement produces CP at the scale UDS does. Here is why:

- **Chain Drawbacks compound.** A +200 Chain Drawback over 10 jumps = 2,000 CP. No other supplement offers this multiplication pattern.
- **Multipliers stack.** Retail Rocker doubles all drawback CP. Gauntlet-Kun doubles all Universal Drawbacks. Sadistic Bitch-Chan doubles jump-native drawback CP. These can stack (with the Gauntlet-Kun-does-not-double-Retail-Rocker carve-out), producing CP values that dwarf any jump-native drawback cap.
- **No upper bound on Chain Drawback count.** The source does not specify a maximum number of Chain Drawbacks. You can stack as many as you can tolerate. (The "must limit you" clause is the soft cap: if you tolerate them all without real impact, they award no CP. But a jumper who genuinely engages with 10 active Chain Drawbacks gets 10 streams of compounding CP.)

### 13.2 Impact on chain balance

UDS breaks the assumption that each jump is a self-contained CP economy. With UDS, your CP budget is not 1,000 per jump. It is 1,000 plus your Chain Drawback stack, multiplied by your active multipliers, plus forced native drawbacks. A moderate UDS build can easily hit 3,000 to 5,000 CP per jump. A heavy UDS build can exceed 10,000 CP per jump.

This means:
- **Jump-native drawbacks become less relevant.** When you have 5,000 CP from Chain Drawbacks, the 200 CP from a jump-native drawback is rounding error. The Bitch-Chan / Sadistic Bitch-Chan forced-native-drawback mechanics exist partly to keep jump-native drawbacks relevant.
- **Jump-native perks become more affordable.** With 5,000 CP, you can buy every perk in most jumps. The challenge shifts from "what can I afford?" to "what do I actually need?"
- **Power scaling accelerates.** More CP per jump means more perks per jump means faster power growth. A 10-jump UDS chain can produce a jumper who outcales a 20-jump non-UDS chain.

### 13.3 The counterbalance: severity compounds too

UDS is not free money. Every CP source is paired with a severity cost, and the severity compounds alongside the CP:

- More Chain Drawbacks = more active effects to manage every jump.
- Retail Rocker doubles CP but you pay full price for everything (no discounts).
- Gauntlet-Kun doubles CP but you start at 0 and risk losing perks on failure.
- Bitch-Chan forces native drawbacks that you must genuinely engage with ("harder to cheese").
- Sadist-Chan and Sadistic Bitch-Chan force you to take drawbacks you dislike.

The "must limit you" clause is the ultimate counterbalance. If you stack 15 Chain Drawbacks but your build negates half of them, you only get CP for the ones that actually bite. UDS rewards genuine engagement with severity, not paper-stacking.

### 13.4 Comparison to jump-native drawbacks

| Dimension | Jump-Native Drawbacks | UDS Drawbacks |
|-----------|----------------------|---------------|
| Duration | One jump | Chain Drawbacks: entire chain. Single Jump: one jump. |
| CP cap | Jump's Drawback Cap (varies) | No explicit cap on Chain Drawback count |
| Compounding | None (one-jump) | Chain Drawbacks compound across every jump |
| Multiplier stacking | None | Retail Rocker, Gauntlet-Kun, Sadistic Bitch-Chan |
| Routing | Stays in-jump | Can route to Body Mod (BP) or Warehouse (WP) |
| Escape | Ends with the jump | Hiatus (3x cost) or Revoke (3x cost, 8-jump minimum, 16-jump cooldown, BP/WP lockout) |
| Anti-cheese | Jump-specific rules | Brick rule (for Single Jump Drawbacks), "must limit you" clause, "harder to cheese" clauses |

**Where UDS provides better value:** Chain Drawbacks for long chains. A +200 Chain Drawback on a 10+ jump chain produces more CP than any single jump-native drawback can. Multiplier stacking (Retail Rocker, Gauntlet-Kun) has no jump-native equivalent. BP/WP routing has no jump-native equivalent.

**Where jump-native drawbacks provide better value:** Single-jump precision. If you want a drawback for one specific jump and no others, a jump-native drawback is cleaner (no Chain Drawback commitment, no Hiatus/Revoke complexity). Jump-native drawbacks are also balanced for their specific setting, so the severity-to-CP ratio is calibrated. UDS Single Jump Drawbacks are generic and may over- or under-punish depending on the setting.

### 13.5 The verdict

UDS is a power creep engine by design. It exists to let jumpers fiddle with the basic assumptions of Jumpchain, and one of those assumptions is the CP budget. A chain with UDS is a different game from a chain without it. The counterbalances (severity compounds, "must limit you," brick rule, Hiatus/Revoke costs) keep it from being pure inflation, but they do not change the fundamental fact that UDS dramatically increases available CP.

For cross-supplement balance analysis (combining UDS with Body Mod, PRS, Generic First Jump, etc.), the key question is not "does UDS produce too much CP?" but "does the severity paired with that CP produce a survivable chain?" That question is answered build-by-build in the archetype and sample build sections above, and it will be refined in the cross-supplement synergy docs that follow.

---

## Appendix: Drawback Count and Tier Summary

### Chain Drawbacks (15 entries, including variants and sub-options)

| Tier | Count | Drawbacks |
|------|-------|-----------|
| S | 2 | Retail Rocker, Gauntlet-Kun |
| A | 4 | Sadistic Bitch-Chan, Random-Chan, Bitch-Chan, And Only You! |
| B | 5 | No Drawbacks for You!-San, Sadist-Chan, Variant Sadist-Chan, Old Home Week, Refresher Course |
| C | 3 | Pseudo-Random-Chan, Thomas Wolfe Rule, River Corollary |
| D | 1 | Benefits Package |

### Jumper Drawbacks (17 entries, including variants)

| Tier | Count | Drawbacks |
|------|-------|-----------|
| S | 0 | (none; single-juck drawbacks cannot match Chain Drawback compounding) |
| A | 1 | In Deep Water |
| B | 2 | Shut Up Jumper!, Gunshy |
| C | 12 | Age of Descent, We See You, Pose of the Day!!!!, Stochastic Scalar Suckage, A Giant Among Jumpers, A Giant Adventure!, A Little Drawback, A Petite Problem, Cyclopes Psi-Ops, Ferret Lady, Do You OoWoo?, Stone Sober |
| D | 2 | Un-Bearable, All the Hats |

### Total drawbacks analyzed: 32 (15 Chain + 17 Jumper)

### Total drawbacks missing (from truncated categories): ~30+ (see §6)

### Combined tier distribution

| Tier | Chain | Jumper | Total |
|------|-------|--------|-------|
| S | 2 | 0 | 2 |
| A | 4 | 1 | 5 |
| B | 5 | 2 | 7 |
| C | 3 | 12 | 15 |
| D | 1 | 2 | 3 |
| **Total** | **15** | **17** | **32** |

---

*End of UDS v1.13 partial analysis. This document covers the Chain Drawbacks, Jumper Drawbacks, rules framework, Safety Dance, and AEIOU sections only. For the complete UDS, including Warehouse, Companion, Power, Thematic, HQ, Dietary, Challenge Mode, Origin, Questionable, Alternative Event, and Starting Drawbacks, plus The Hub, Bitch of Destiny, and CID interactions, fetch the full Google Doc v1.13 text export. Cross-supplement synergy docs will follow once the remaining four supplement analysis docs are complete.*
