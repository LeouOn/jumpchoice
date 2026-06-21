# Worm CYOA V6.1 — Legalistic Power Interaction Analysis

*Read in the tone of a contract lawyer who read the Worm CYOA too carefully.*

## §1.0 — Construction of Powers (the rules)

Per the Difficulty row, the canonical interpretation of 'powers' is determined by:

1. The **explicit description** in the object's `text` field controls over any inferred or implied mechanics.
2. Where the description is ambiguous, the most **generous** reading applies (per 'Path to Victory' tier: Contessa's power finds the best path).
3. Restrictions are read **narrowly**. A power that 'cannot be used underwater' means underwater; it does NOT mean 'in a building with plumbing.'
4. Free perks (Cloak V2/V3 with Suicide/Determination Mode) attach to your shard, not to your body. Death does not remove them.
5. The 'wish' from Determination Mode is **not** a monkey's paw. The CYOA expressly excludes Holy Grail / corrupted wish tropes.

## §2.0 — Specific Power Interactions

### §2.1 — Eidolon vs Fairy Queen

**Issue:** Both let you stockpile stolen/copied powers. Can you stack both?

**Reading:** Yes. Eidolon's three-slot system and Fairy Queen's three-slot system are **independent state machines** because Eidolon stores powers via shard state (no UI) while Fairy Queen stores souls in her 'fae' (explicit game mechanic). Stacking yields 6 stored powers + your base kit. **Not a contradiction.**

**Caveat:** If you store Eidolon's own powers in Fairy Queen, then kill and store Glaistig Uaine via Eidolon, you have recursive power-theft with no canonical resolution. The CYOA is silent; default to the most generous reading. **Allowed.**

### §2.2 — Path to Victory + Blindspots

**Issue:** Contessa's canonical power has explicit blindspots (she can't path around Entity-level interventions). Does the Combo 'Path to Victory' share this limitation?

**Reading:** The Combo text is EXPLICIT: *"You can come up with a step-by-step plan to fulfill any goal, and can perform each step perfectly. **Blindspots include Eidolon, Trigger Events, Entities, Parts of Entities, Endbringers, etc.**"* — There is no ellipsis to interpret. The CYOA preserves the same blindspots as canon Contessa, in nearly identical wording.

**Implication:** PtV cannot plan around Eidolon, Entities, Endbringers, or trigger events. Any build that depends on PtV to handle those threats (e.g., "PtV paths around an Entity") is invalid.

**Counter — All Seeing Precognition (Perks and Drawbacks, 20 SP + 10 CP):** *"Blindspot? Hah. Your powers have no blindspots. They can see Eidolon, The Endbringers, The Entity, Mantellum, and all other blind spots. Actually, your power does have one blindspot... it cannot see those with the Cloak V2 perk."* — This perk explicitly removes ALL blindspots from ALL your powers except users of Cloak V2. It is the only way in the CYOA to remove PtV's blindspots.

**Counter-counter — Cloak Mark II (Perks and Drawbacks, 2 SP + 3 CP):** *"You are a blind spot to human precogs, including those with All-Seeing Precognition."* — This is the ONLY thing in the entire CYOA that hides from All Seeing Precognition users.

**Recommended PtV build:** PtV (15 SP Combo) + All Seeing Precognition (20 SP + 10 CP) + Cloak Mark II (2 SP + 3 CP) + Suicide Mode (50 SP) — Total **87 SP + 13 CP**, true planning omniscience.

### §2.3 — Oberon/Titania vs Eidolon

**Issue:** Both grant 'powers of capes you touch.' Does 'touch' mean physical contact, line-of-sight, or general proximity?

**Reading:** Oberon/Titania: 'You can gain a permanent copy of the power of any Parahuman you touch.' Touch = physical contact (standard English). Eidolon: 'You can have three somewhat-random powers that you can change at will' — no touch requirement, but powers are RANDOM. Oberon is targeted; Eidolon is RNG. **Different mechanics.**

### §2.4 — Immortal + It Gets Worse

**Issue:** Both claim invulnerability. Do they stack?

**Reading:** Immortal: 'You are immortal, invulnerable, inviolable.' It Gets Worse: 'There are few things that can harm you. Not because you're an ultra Brute or so fast you can't get hit. No, you…' The descriptions don't conflict; they describe different defensive layers. Immortal = timeless invulnerability. It Gets Worse = 'few things' can harm you (i.e., a more restrictive list of exceptions). **Both apply.**

### §2.5 — Captain America + Unlimited Potential

**Issue:** Both enhance physical stats. Does the 'one level above peak human' from Cap stack with UP's 'no glass ceiling'?

**Reading:** Yes. UP removes the ceiling; Cap provides the +1 baseline. Stacked: 'above peak human, with no upper limit.' **Stackable.**

### §2.6 — Power Copy: Eidolon?

**Issue:** The CYOA says certain powers are excluded from Power Copy and Twinsies. Can you Power Copy Eidolon, Contessa, or Glaistig Uaine?

**Source verification:** The phrase *"Powers like Eidolon's and Contessa's won't be there"* appears ONLY in **Twinsies** (Tier 3, 0 SP, opens a sub-list of parahumans you can pick from). The Power Copy row itself has **no exclusion text** in its titleText or opener — it's just a list of 50 pickable capes. So:
- **Power Copy row**: 50 specific capes listed, no exclusion clause. You cannot pick Eidolon or Contessa here because they aren't in the 50.
- **Twinsies**: Opens a sub-list of additional parahumans; Eidolon and Contessa explicitly excluded.
- **Tier 2 (Trump) Eidolon**: 20 SP. Explicitly permitted.
- **Tier 2 (Trump) Fairy Queen**: 25 SP. Explicitly permitted (and is the only way to access Glaistig Uaine's power).

**Reading:** The exclusion is **character-based in Twinsies**, naming Eidolon and Contessa as the canonical examples of "you-can't-have-this-power" capes. This is not a Trump-class exclusion (Contessa is a Thinker, not a Trump). The most defensible reading: Twinsies excludes capes whose powers would trivialize the sub-list mechanism (e.g., Eidolon's "have three random powers" and Contessa's "win any conflict" are too broad). Power Copy simply doesn't include Eidolon/Contessa/Glaistig Uaine in its curated 50.

**Practical implication:** You CANNOT start the CYOA as Eidolon, Contessa, Glaistig Uaine, Doormaker, Legend, or Crawler (none are pickable). However, you CAN use Fairy Queen Tier 2 to kill+steal them in-world if you encounter them — FQ says *"With a touch you can kill a Parahuman and steal their power. You can steal their power from their corpse."* This means FQ-of-Glaistig, FQ-of-Contessa, etc. are achievable mid-playthrough but not at character creation.

### §2.7 — Combo Powers + Tier prerequisites

**Issue:** Combo Powers say 'often require both Tier picks.' Are the prerequisites explicit or implicit?

**Reading:** The CYOA's Directions row says 'Some sections have requirements that aren't shown for the sake of space. Make sure you've checked every tab.' This is a **disclaimer of explicitness** — Combo requirements may be hidden elsewhere in the data (in the `requireds` arrays). Use the JSON extraction to verify before locking in a build.

### §2.8 — Shard = Mundane vs Shard of the Thinker

**Issue:** You pick ONE shard. Mundane gives +60 CP. Thinker gives +10 SP. Can you have both?

**Reading:** Per 'Shard' row, allowedChoices = 2 (you can pick 2 shards). So **yes**, you can stack Mundane + Thinker for +60 CP and +10 SP. The shard system is non-exclusive.

### §2.9 — Difficulty stacking

**Issue:** Can you take Easy AND Suicide Mode? They're both in the Difficulty row with allowedChoices = 0 (you're only allowed to pick one).

**Reading:** Per the row's allowedChoices = 0 (visible in the `rows-summary.json` extraction), the Difficulty row appears to **not enforce a single pick**. But canonically, picking multiple difficulties creates contradictions (Easy: '50% hate you' + Suicide: 'Eden didn't die'). Recommend single pick unless you want to test edge cases.

### §2.10 — Perks/Drawbacks stacking with Tier Powers

**Issue:** Can a drawback ('Overcharge Strike: +30 SP') be taken alongside Tier powers that have their own costs?

**Reading:** Yes. Drawbacks modify the **budget**, not the **build**. You can take all 65 perks/drawbacks simultaneously as long as the sum is non-negative (or accept a deficit). The CYOA does not enforce budget positivity.

## §3.0 — Recommended Disclaimers for Your Build

If posting your build publicly, include:

1. **Difficulty chosen** (so others can replicate the budget)
2. **Shard + Shard Ranking** (changes the budget and unlocks shardless path)
3. **Drawbacks taken** (so others see the budget math)
4. **Perks taken** (cost items the build)
5. **Tier picks + Combo picks + Power Copy** (the meat of the build)

## §4.0 — Limitation of Analysis

This analysis is based on the **structured extraction** of the CYOA's JSON state. The CYOA is a live SPA and its actual mechanics may have hidden state machines, time-based unlocks, or conditional logic not captured in the static JSON. **Verify with the live CYOA before committing to a build.**