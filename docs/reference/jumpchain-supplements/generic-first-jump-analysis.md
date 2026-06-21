# Generic First Jump (v1.1)  EMin-Max Analysis

**Source:** `sources/generic-first-jump.html` (Notion export)
**Author:** Ursine
**Version analyzed:** v1.1
**Total options catalogued:** 56 unique options (58 tier rows counting dual-cost variants)
**File size:** ~58 KB / ~25,500 chars of body text
**Status:** Reference doc for cross-supplement synergy work. One of 5 parallel per-supplement analyses (alongside Essential Body Mod, SB Body Mod, Personal Reality Supplement, Universal Drawbacks Supplement).

---

## §1 Source Overview

**Generic First Jump** (GFJ) by Ursine is the modern "first jump" alternative to Pokémon. Where Pokémon (the original first-jump CYOA) gives you a starter Pokémon, a companion slot of 6, and setting-specific perks, GFJ gives you **ten sequential Levels** drawn from a 1d10 table, a free origin ("The Tourist"), a 1000 CP base budget, and  Emost importantly  Ea capstone that converts every perk and item purchased into Body Mod.

### Key design

1. **Ten-Level Structure.** The Jump consists of ten "Levels" (Modern Occult, Military, Science Fiction, Fantasy, Historical/Alt-Historical/Lost World, Slice of Life, Super Hero, Modern Adventure, Survival, Horror). At each Level, you acquire an identity with full memories, plus level-appropriate baseline competency via the "Basic Requirements" free perk. Levels can be completed in any order; the same setting can fill only one Level slot.

2. **Single Origin.** "The Tourist" is the only Origin. It is the meta-origin  Ea Jumper who is in it for the experience, not for any specific build path. The Tourist gets one free 100cp perk, one discounted 100cp perk, one free 100cp Item, and discounts on remaining Origin perks.

3. **The Body Mod Reward capstone (the killer feature).** At Jump end, all perks and items purchased become Body Mod: "All perks and items from this jump (with the exception of Basic Requirements) are now considered part of your Body Mod. You will still have them, even in Gauntlets or if you take a Power Loss Drawback." This single line is the reason GFJ is the canonical way to bootstrap a supplement stack. It is the supplement-stack equivalent of a 1000-CP-bonus voucher that ignores the Power Loss and Gauntlet rules.

4. **Drawback stacking is unbounded.** "You can take as many Drawbacks as you want, without limit on cp gained." Combined with the absence of a stated CP floor (the source ledger in the Notion export shows the user reaching -1800 CP in perks before drawback gains), this is the mechanism that lets you buy most of the level-specific perks.

5. **Items section has a +200cp stipend.** The +200cp is for the Items section only  Eand is a top-level addition to the 1000-CP base budget, increasing your total spend to 1200 CP across Perks + Items.

### What's NOT in the source (honest notes)

Three things commonly attributed to GFJ are **absent from v1.1's text** and should be treated as community convention, not documented rule:

- **"Death doesn't end chain."** Not stated in v1.1. The doc does not explicitly grant immortality or death-warding. It does have several *related* effects (Body Like A Jumper's fitness floor, Mind Like A Jumper's mental-illness removal, No Matter Where You Go's trauma immunity), but death mechanics are not addressed. If you want to assert "death doesn't end chain" for your chain, treat it as a house rule layered on top. See §11.1 for the full ruling.
- **"Supplement mode" / cross-jump stacking.** The word "supplement" does not appear. The Body Mod Reward *achieves* cross-jump stacking implicitly (everything converts to body mod), but v1.1 does not self-describe as a supplement. Treat the supplement framing as a community reading of the Reward's body-mod conversion.
- **"Items +200cp stipend: bonus or section budget?"** The text says "You receive a +200cp stipend for this section." Combined with the ledger in the source (which never goes below 0 in CP after item purchases), the natural reading is: the Items section is treated as a separate 200-CP budget, not a +200-CP bonus to your total. See §11.3 for the full ruling.

### Budget math (v1.1, no discounts)

- Starting CP: 1000
- +200 Items stipend: 1200 total (perks + items spendable)
- Drawback gains: unbounded
- Perks are 50 E00cp; most level-specific perks are 100cp; Tourist perks are 100/200/400cp with 50% discount for Tourist and 100cp perks free.
- Items are 100cp (most), with one free Origin item and discounts on Origin-related items.

### How this doc is organized

§2 walks through the 10-Level system (the meta-mechanic). §3–§7 provide per-option tier rankings. §8 explores synergies, especially the Body Mod Reward interactions. §9–§10 give 5 named archetypes with sample builds. §11 covers edge cases and ambiguities. §12 assesses power creep. §13 maps the cross-supplement hooks that make GFJ the supplement-stack bootstrap.

---

## §2 Level Progression Analysis

The 10-Level structure is the meta-game of GFJ. It is not just a flavor device  Eit has direct mechanical implications for perk access, identity stacking, and chain pacing.

### §2.1 The 10 Levels (verbatim from source, 1d10 order)

| Roll | Level |
|------|-------|
| 1 | Modern Occult |
| 2 | Military |
| 3 | Science Fiction |
| 4 | Fantasy |
| 5 | Historical/Alt-Historical/Lost World |
| 6 | Slice of Life |
| 7 | Super Hero |
| 8 | Modern Adventure |
| 9 | Survival |
| 10 | Horror |

Each Level has its own pool of one-to-three level-specific 100cp perks, one-to-three level-specific 100cp drawbacks, and triggers the **Basic Requirements** free perk (level-scaling baseline identity/competence that vanishes post-jump).

### §2.2 What the Levels give you mechanically

**In-jump benefits (per Level):**

1. **Basic Requirements (Free)  Elevel-scaling baseline.** "You will receive whatever special abilities, traits, backgrounds, and skills that are required for basic participation in the Level you are in." Example: Modern Occult (psychic ghost-hunting) gives you average-setting psychic ability. Military (Vietnam) gives decent fitness + basic training. Super Hero gives average-setting powers. **This perk is excluded from the Body Mod Reward** ("with the exception of Basic Requirements"), so the level-baseline abilities do NOT carry over.

2. **An identity with all appropriate memories.** "In each Level, you acquire an identity that fits the setting, with all appropriate memories." These memories are the *narrative* mechanism for surviving 10 settings. The source is silent on whether the identity's memories survive the Jump (the perk "Mind Like A Jumper" handles pre-existing conditions; the Tourist perk "Seeing The Sights, All The Sights" handles perfect memory of experiences, not identities).

3. **Practice/training/study time** for mundane skills. "Nothing can be done to retain [Basic Requirements] abilities, but you do benefit from any practice, training, study, or actual use in the Level itself of any mundane skills." This is the loophole for keeping mundane skill gains  Ea 10-Year-Jumper trained in 10 different settings picks up real skills even if the supernatural baseline evaporates.

4. **One to two free access to level-specific perks.** You can buy the level-specific perks whenever you want, but the perks only fire when you are in that Level's setting. Buying "Run Like Hell" in the Horror level means you can run from monsters in Horror. Buying it pre-emptively for a future Horror-only jump is wasted.

5. **Drawback triggers**  Esome drawbacks are level-specific and only function in that Level (e.g., "Bandits" in Fantasy fires when you're in a Fantasy Level).

### §2.3 What unlocks at each Level  Eperk access by Level

| Level | Perks | Notable standout |
|-------|-------|------------------|
| Modern Occult | 1 (Screw the Devil, 100cp) | Possession immunity |
| Military | 2 (AIT 100cp, MOS 100cp) | Niche combat/non-combat training |
| Science Fiction | 2 (Universal Translation 100cp, Engineer 100cp) | **Universal Translation is the S-tier pick** |
| Fantasy | 2 (Cantrips 100cp, Class Skills 100cp) | Repeatable Class Skills |
| Historical | 1 (Student of War 100cp) | Strategy/tactics/logistics |
| Super Hero | 2 (Fists of Justice 100cp, Secondary Superpowers 100cp) | **Secondary Superpowers is S-tier** |
| Modern Adventure | 2 (The Quick and the Dead 100cp, Sherlock Scan 100cp) | 3x thought speed, relevance sense |
| Survival | 2 (Eagle Scout 100cp, Lone Survivor 100cp) | Resource luck |
| Horror | 2 (Run Like Hell 100cp, Be Not Afraid 100cp) | **Be Not Afraid is S-tier** |
| Slice of Life | 2 (Expertise 100cp, Friendly Friends 100cp) | Repeatable Expertise |

**General perks are available at all Levels** (you have continuous access to the Perks section). Tourist perks are available at all Levels but discounted for the Tourist origin.

### §2.4 Optimal stopping points

**You can't actually stop early.** The doc says you "can do these Levels in any order you choose" but does not provide an "early exit" option for completing fewer than 10. The only End Choice is "Go Home" or "Continue On," both of which require "You have completed all ten Levels."

**You can, however, choose Level order for free.** The "Randomized" drawback (+100cp) randomizes this; without the drawback, you pick. Optimal order is:

1. **Slice of Life first**  Eeasiest level, no combat, lets you stack Expertise and Friendly Friends early, train up Bare Necessities baseline.
2. **Science Fiction second**  Epick up Universal Translation immediately; retroactive language acquisition is useful for every later Level.
3. **Modern Occult third**  EScrew the Devil for possession immunity.
4. **Horror fourth**  EBe Not Afraid stacks onto the previous defenses.
5. **Survival fifth**  EEagle Scout for resource-finding during later harder Levels.
6. **Fantasy sixth**  ECantrips for utility, Class Skills repeatable.
7. **Modern Adventure seventh**  EQuick and the Dead (3x thought speed) and Sherlock Scan.
8. **Super Hero eighth**  ESecondary Superpowers is universally useful and a cornerstone perk.
9. **Military ninth**  EAIT + MOS for combat and logistics.
10. **Historical tenth**  EStudent of War capstone for strategy/tactics.

This order front-loads the universal-perk picks (Translation, Possession, Fear, Survival, Thought Speed) and back-loads the more setting-specific training (Super Hero, Military, Historical).

### §2.5 The "you can choose the setting" clause

The source contains a crucial clause often missed: "If you choose, you can go to a specific setting that matches the theme or genre of a Level rather than a generic version. If that specific setting has a Jump, you do not use that Jump document, and nothing done in this Jump will carry over to the actual Jump for that setting."

This is **huge**. It means:
- You can substitute any real Jump's setting for any Level (e.g., use a Modern Occult setting from a specific Jump without actually taking that Jump).
- **Nothing from GFJ carries over to the actual Jump for that setting**  Eincluding the Body Mod Reward. So if you substitute a setting from a real Jump, you lose the Body Mod conversion for the perks you bought in that Level.

This is the main "trap" in GFJ: players who take the "specific setting" option to enrich flavor end up giving up the Body Mod conversion for those perks. The recommended reading: only use generic settings (no specific Jump), or use a specific setting from a Jump you don't plan to take anyway.

### §2.6 Identity stacking

"You acquire an identity that fits the setting, with all appropriate memories" is repeated for each Level. The text does not say whether the 10 identities all persist post-Jump, or whether they merge. The conservative reading is that they are temporary cover identities that dissolve at Jump end. The "perfect memory" perk (Seeing The Sights) is the cleanest way to preserve the experiences: take it, and you will remember all 10 identities in full detail even if the identities themselves don't persist.

**Optimization note:** the Tourist perk "Ride The Rails To See The Sights" interacts with identity in an interesting way  Eit preserves the canon plot of each Level's setting, so your 10 cover identities will be embedded in a world where canon events happen. This is a flavor multiplier more than a mechanical one.

### §2.7 Why the 10-Level system exists

The 10-Level system serves three purposes:

1. **Justifies the perk variety.** A "First Jump" generic needs to expose the Jumper to enough variety to be a meaningful "tutorial" jump. 10 settings ÁE1-2 perks/Level = 18 level-specific perks, plus 12 general perks and 3 Tourist perks.

2. **Provides narrative weight.** A 10-year (or however long the Jump lasts  Ethe source is silent on duration) first jump is a substantial opening for a chain. The 10 identities give the Jumper a real backstory.

3. **Front-loads the Body Mod Reward.** By making the capstones (Instant Access, Body Mod Reward) end-of-Jump free perks, the doc incentivizes you to complete the full 10 Levels. There is no early-exit option.

---

## §3 Per-Option Tier List (Master Index)

This section is the master index. §5, §6, §7 split out Perks, Items, and Drawbacks respectively, with per-section tier justifications. The table below is a single-glance view of every option.

### §3.1 The master table

| # | Cost | Section | Option | Tier | One-line why |
|---|------|---------|--------|------|--------------|
| 1 | Free | Perks/General | Basic Requirements | **A** | Level-scaling baseline that vanishes post-jump; huge in-jump, but the Body Mod Reward excludes it. |
| 2 | Free | Perks/General | Body Like A Jumper | **S** | Permanent fitness floor, fertility control, physical ailment cure. Converts to Body Mod. |
| 3 | Free | Perks/General | Mind Like A Jumper | **S** | Removes pre-existing mental conditions. Converts to Body Mod. |
| 4 | 50cp | Perks/General | Sexy and I Know It | **C** | Appearance perk; useful but not stackable, common, and benefit is flavor-tier. |
| 5 | 50cp | Perks/General | Common Sense | **S** | Detects Benefactor-punish triggers. Unique and irreplaceable for drawback-stackers. |
| 6 | 50cp | Perks/General | Self-Motivation | **C** | Mild training buff; redundant if you have Veteran or Boredom Immunity. |
| 7 | 50cp | Perks/General | Life Skills | **C** | Mundane adulting. Common perk, no stack value. |
| 8 | 50cp | Perks/General | General Knowledge (base) | **C** | Average-citizen local knowledge. Cheap but redundant with translation perks. |
| 9 | 100cp | Perks/General | General Knowledge (upgrade) | **A** | Adds professional-grade setting knowledge that **never goes away**. Body-mod converts. |
| 10 | 100cp | Perks/General | Friendly Sort | **A** | Charisma + social anxiety removal. Body-mod converts. |
| 11 | 100cp | Perks/General | Boredom Immunity | **S** | Boredom immunity + fast-forward grind. Body-mod converts. Massive QoL over centuries. |
| 12 | 100cp | Perks/General | No Matter Where You Go, There You Are | **S** | Morality/priority lock + trauma/PTSD immunity. Body-mod converts. |
| 13 | 100cp | Perks/General | Veteran | **A** | Emotional control under pressure. Body-mod converts. |
| 14 | 100cp | Perks/Tourist | The Road Goes Ever On And On | **S** | Eternity/adaptability/ennui immunity. Free for Tourist. Body-mod converts. |
| 15 | 100cp (200cp, 100cp for Tourist) | Perks/Tourist | Seeing The Sights, All The Sights | **S** | Perfect memory, retroactive, tamper-proof. Body-mod converts. |
| 16 | 200cp (400cp, 200cp for Tourist) | Perks/Tourist | Ride The Rails To See The Sights | **S** | Canon-preservation aura. Body-mod converts. Tourist is the only Origin, so 50% discount always applies. |
| 17 | 100cp | Perks/Slice of Life | Expertise | **A** | Expert in one profession, repeatable. Body-mod converts. Stacks linearly. |
| 18 | 100cp | Perks/Slice of Life | Friendly Friends | **B** | Emotional connection + good friend. Useful but narrow. |
| 19 | 100cp | Perks/Survival | Eagle Scout | **A** | Survival expertise + resource-finding luck. Body-mod converts. |
| 20 | 100cp | Perks/Survival | Lone Survivor | **B** | Isolation resistance. Niche. |
| 21 | 100cp | Perks/Horror | Run Like Hell | **B** | Escape speed/endurance/agility. Niche. |
| 22 | 100cp | Perks/Horror | Be Not Afraid | **S** | Eldritch/fear/spiritual corruption immunity. Body-mod converts. |
| 23 | 100cp | Perks/Military | Advanced Infantry Training | **B** | Solid combat training, niche. |
| 24 | 100cp | Perks/Military | Military Occupational Specialty | **B** | Non-combat MOS, repeatable, niche. |
| 25 | 100cp | Perks/Modern Adventure | The Quick and the Dead | **A** | Peak human reaction + 3x thought speed. Body-mod converts. |
| 26 | 100cp | Perks/Modern Adventure | Sherlock Scan | **A** | Relevance highlighting. Body-mod converts. |
| 27 | 100cp | Perks/Super Hero | Fists of Justice | **B** | One martial art at expert level. Niche. |
| 28 | 100cp | Perks/Super Hero | Secondary Superpowers | **S** | Required secondary powers for ALL future powers + power throttling. Body-mod converts. |
| 29 | 100cp | Perks/Modern Occult | Screw the Devil | **S** | Possession immunity. Body-mod converts. |
| 30 | 100cp | Perks/Historical | Student of War | **A** | Strategy/tactics/logistics expertise. Body-mod converts. |
| 31 | 100cp | Perks/Fantasy | Cantrips | **B** | Minor magic (D&D 3.5 cantrip scale). Niche but useful. |
| 32 | 100cp | Perks/Fantasy | Class Skills | **A** | Fantasy class skill package, repeatable. Stacks. |
| 33 | 100cp | Perks/Science Fiction | Universal Translation | **S** | Retroactive omnilingualism. Body-mod converts. |
| 34 | 100cp | Perks/Science Fiction | Engineer | **A** | Fix tech you can use. Body-mod converts. |
| 35 | Free | Items/General | Bare Necessities (free version) | **A** | Job + home + vehicle. Free. |
| 36 | 100cp | Items/General | Bare Necessities (trust fund upgrade) | **S** | $200K/yr, multiplies ÁE0 per repurchase, follows you, can be toggled off, scales. |
| 37 | 100cp | Items/General | Franchise | **A** | Your adventures as media. Body-mod converts. |
| 38 | 100cp (Free for Tourist) | Items/Tourist | Camera | **B** | Auto-snapshot of memorable moments. Useful but narrow. |
| 39 | +100cp | Drawbacks/General | Randomized | **A** | Random level order. Pure CP gain if you don't care about order. |
| 40 | +100cp | Drawbacks/Slice of Life | Homeless | **B** | Start with nothing. Easily mitigated. |
| 41 | +100cp | Drawbacks/Slice of Life | Accident Prone | **B** | Minor bad luck. |
| 42 | +100cp | Drawbacks/Slice of Life | Odd Jobs | **A** | Constant job churn. Easily mitigated by Expertise. |
| 43 | +100cp | Drawbacks/Survival | Resource Shortage | **B** | Scarce food/water. Mitigated by Eagle Scout. |
| 44 | +100cp | Drawbacks/Survival | Horrific Weather | **A** | Bad weather only. Annoying, not dangerous. |
| 45 | +100cp | Drawbacks/Horror | Scripted Encounters | **B** | More monster encounters. |
| 46 | +100cp | Drawbacks/Horror | Monster Bait | **C** | Monsters prefer you. Dangerous if you don't have Be Not Afraid. |
| 47 | +100cp | Drawbacks/Military | I Have Truly Found Paradise | **B** | Bad chain of command. Annoying. |
| 48 | +100cp | Drawbacks/Modern Adventure | Bad Comic Relief | **C** | Annoying companion NPC. Genuine liability. |
| 49 | +100cp | Drawbacks/Modern Adventure | Secret Society | **C** | Enemy organization. Active threat. |
| 50 | +100cp | Drawbacks/Super Hero | Nemesis | **B** | Recurring enemy. Active threat. |
| 51 | +100cp | Drawbacks/Super Hero | Massive Collateral | **A** | Destruction follows you. Only matters if you care about property. |
| 52 | +100cp | Drawbacks/Modern Occult | Masquerade | **B** | Must hide the supernatural. Standard urban fantasy. |
| 53 | +100cp | Drawbacks/Historical | Modern Sensibilities | **A** | Culture shock lock. Mild inconvenience. |
| 54 | +100cp | Drawbacks/Fantasy | Bandits | **A** | Weekly ambushes. Easy fights. |
| 55 | +100cp | Drawbacks/Fantasy | Siege At Jumper Fortress | **C** | Forced into big battle. Dangerous. |
| 56 | +100cp | Drawbacks/Science Fiction | Three Sea Shells | **S** | Can't figure out future tech. Quality of life only, never lethal. Best drawback. |
| 57 | Free | End Choices | Instant Access | **S** | Warehouse summon. |
| 58 | Free | End Choices | Body Mod Reward | **S** | **Converts every perk and item to Body Mod.** The reason GFJ is taken. |

### §3.2 Tier counts

Total rows: 58 (counting dual-cost variants as separate rows for granular tier placement). Total unique options: 56.

| Tier | Count | Notes |
|------|-------|-------|
| S | 16 | Body Mod Reward + 12 perks + 1 drawback + 1 item + 2 end-choice capstones. |
| A | 19 | Most remaining level-specific perks + a few drawbacks. |
| B | 15 | Niche perks and drawbacks. |
| C | 8 | Common-flavor perks + active-threat drawbacks. |
| D | 0 |  E|
| F | 0 |  E|

### §3.3 S-Tier summary

The 16 S-tier options cluster into three groups:

**Capstones (the reason to take GFJ):**
- **Body Mod Reward** (Free, end-of-jump)  Ethe entire reason GFJ exists
- **Instant Access** (Free, end-of-jump)  EWarehouse access

**Universally useful perks that convert to body mod (12):**
- Body Like A Jumper, Mind Like A Jumper, Common Sense, Boredom Immunity, No Matter Where You Go There You Are, Secondary Superpowers, Be Not Afraid, Screw the Devil, Universal Translation
- The three Tourist perks (Road Goes Ever On, Seeing The Sights, Ride The Rails)

**The single S-tier drawback:**
- **Three Sea Shells** (+100cp, Science Fiction)  Enever lethal, easy to take, pure CP

**The single S-tier item:**
- **Bare Necessities trust fund upgrade** (100cp)  Eexponential wealth scaling, follows you to all jumps

---

## §4 Origin Analysis

GFJ has exactly **one Origin: The Tourist.**

### §4.1 The Tourist

**Description (verbatim):** "These types of Jumpers are in it for the experience. They want to visit their favorite settings, meet their favorite characters, maybe fix a few things the original author got wrong in their opinion. For them, it is all about the world they are visiting."

**Mechanical benefits:**
- 50% discount on Origin perks (perks tagged with "Discount for The Tourist")
- 100cp perks are free for The Tourist (perks tagged with "Free for The Tourist")
- One free 100cp Item, plus discount on remaining Origin Items
- All level-specific perks are full price (the discount is on Origin perks only, not level-specific)

Re-reading the source carefully: "Perks are discounted by 50% for their Origin, and 100cp perks are free for their Origin." The Origin in this Jump is "The Tourist." So **all Tourist-tagged perks are discounted 50% (and 100cp ones are free)**, but level-specific perks are full price.

This means the Tourist's perks are:
- The Road Goes Ever On And On (100cp)  E**Free** for Tourist
- Seeing The Sights, All The Sights (200cp)  E**100cp for Tourist** (50% off)
- Ride The Rails To See The Sights (400cp)  E**200cp for Tourist** (50% off)

The Tourist's Item:
- Camera (100cp)  E**Free for Tourist**

### §4.2 Tier ranking

**The Tourist  ES-tier Origin.** The 50% discount on the three most powerful perks in the doc (perfect memory, canon preservation, eternity readiness) and the free Camera item make The Tourist the obvious Origin. There is no Origin choice to make; you just take it.

### §4.3 Why there's only one Origin

GFJ is a first-jump doc. First-jump docs are intentionally narrow: they exist to bootstrap the Jumper, not to provide build variety. The Tourist framing  E"in it for the experience"  Eis consistent with this. Compare to Pokémon, which has a more structured Origin system (Trainer, Breeder, Researcher, Coordinator, etc.). GFJ's single-Origin design is a feature, not a limitation: it simplifies the bootstrap and gives every Jumper the same meta-progression path.

### §4.4 Sub-archetypes within The Tourist

The Tourist is a single Origin, but the perk selection differentiates sub-archetypes:

- **The Lore Tourist**  Eleans into Tourist perks. Canon Preservation + Perfect Memory is the S-tier Tourist core.
- **The Combat Tourist**  Eleans into level-specific combat perks (AIT, Fists of Justice, Quick and the Dead).
- **The Utility Tourist**  Eleans into support perks (Universal Translation, Secondary Superpowers, Class Skills).
- **The Drawback Tourist**  Etakes every drawback, builds for the Body Mod conversion.

The build archetypes in §9 are sub-archetypes of The Tourist.

---

## §5 Perks Tier List

This section provides tier-by-tier ranking of all 33 perks, with full justification. See §3 for the master table.

### §5.1 Tier S Perks (12)

These perks are universal  Ethey apply regardless of Level or chain phase. Combined with the Body Mod Reward, they are permanent across the entire chain.

#### Body Like A Jumper (Free)

> "You are cured of any physical ailments or disabilities you may have entered this Jump with. You become as physically fit as an average healthy athletic person would be. Your fitness will never deteriorate below this level, or any higher level that you have reached by actual training, unless you wish it to do so, as long as you have sufficient food and water to survive. You can also render yourself fertile or infertile at will and can stop or start any menstrual or breeding cycle at will."

**Why S:** Free. The fitness-floor clause ("never deteriorate below this level ... unless you wish it to do so") is a permanent baseline lock. Combined with body mod conversion, this is a permanent physical baseline for the entire chain. Fertility control is also useful for any settings that weaponize pregnancy. The ailment cure clause is a one-time benefit (pre-Jump), but combined with mind-cure (next perk) it's a free "clean slate."

#### Mind Like A Jumper (Free)

> "You are aware of any mental illness, disorders, disabilities, or other conditions you may be suffering from as you enter this jump, and may choose to have any or all of them removed. This does not make you immune to these things, it just removes pre-existing conditions."

**Why S:** Free. Pairs with Body Like A Jumper for a complete clean-slate. The "you are aware" clause is important  Eit's not a sneaky override, it's a conscious opt-in. Together with the Tourist perk "No Matter Where You Go" (trauma immunity), it forms the Jumper's mental-foundation stack.

#### Common Sense (50cp)

> "The least common advantage of all. You can tell when something you are about to do is contrary to basic common sense and rationality, or when you are about to do something your Benefactor will punish you for. You can also tell when your emotions are clouding your judgment."

**Why S:** Two unique effects. First, the **Benefactor-punish detection** is irreplaceable. Jumpchain is full of "your Benefactor will hate this" trigger conditions (drawing on settings, breaking genre conventions, killing canon characters), and this perk warns you before you trip them. Second, emotional-clouding detection is a unique utility perk. 50cp is dirt-cheap for body-mod conversion of a meta-game rule awareness.

#### Boredom Immunity (100cp)

> "You are completely immune to boredom. When engaged in a simple repetitive task, you can choose to fast-forward through it, remembering performing the task without having to experience it fully. This fast-forward ends instantly if something changes that require your attention."

**Why S:** Centuries-long chains involve a *lot* of repetitive tasks (training, grinding, watching canon play out). The fast-forward is a QoL perk with body-mod conversion that pays dividends for the entire chain. "Instantly ends if something changes" is a fair-balance clause  Eyou can't sleep through a surprise attack.

#### No Matter Where You Go, There You Are (100cp)

> "Your priorities, sense of morality and beliefs only change how you desire them to. You will instantly process and deal with any trauma in the best possible way for you, making you immune to PTSD and similar issues."

**Why S:** "Morality only changes how you desire them to" is a **character-locking clause**  Eit prevents chain drift. If you start as a hero, you stay a hero (or you intentionally change). The trauma immunity is a complementary buff. Together: this is the "Jumper is the same person across centuries" perk, and body-mod conversion makes it permanent.

#### The Road Goes Ever On And On (100cp, Free for Tourist)

> "Your mind is well-prepared for dealing with eternity. You can find joy and satisfaction in everyday life no matter how long you have been alive, you can adapt to new cultures with ease, and you will never find your emotions blunted by the passage of time and ennui."

**Why S:** Free for the only Origin in the doc. The ennui-immunity clause is the Jumper's "centuries of existence don't hollow me out" perk. Combined with No Matter Where You Go, you get a complete mental-resilience stack: morality lock + trauma immunity + eternity readiness. Adaptability to new cultures is also a real benefit for any chain with rapid setting changes.

#### Seeing The Sights, All The Sights (200cp, 100cp for Tourist)

> "You will never have to worry about that. You have a perfect memory, with instant recall, unlimited storage, tamper-proofing, perfect indexing, and protection from any form of harmful memory. This perfect memory is fully retroactive. You can choose to erase memories, leaving the knowledge that something was erased and a basic description of what that memory was, and can restore that erased memory later. Nothing can detect these erased memories or force you to restore them. Your memories can only be read by an outside force with your permission."

**Why S:** This is the **best perk in the doc.** Perfect memory is a chain-defining perk. The retroactive clause (memories from before you took the perk) is huge. The tamper-proofing (no one can mess with your memories) is huge. The selective erasure + restore is a unique utility. The "cannot be read without your permission" clause prevents telepaths/precogs from stealing your memories. Discounted 50% for Tourist (100cp). Body-mod conversion makes it permanent.

The downside: 100cp is a significant chunk of your budget. But it's a one-time investment for a chain-permanent perk. **The single best Tourist perk by CP-efficiency.**

#### Ride The Rails To See The Sights (400cp, 200cp for Tourist)

> "Maybe you want to help blow up the Death Star, fight on the walls of Gondor, or fight off the Agent Smith virus. For those events to happen, events before them kind of have to go a certain way. This is your guarantee of that. Now, as long as you do not deliberately cause large-scale changes, the canon plot of a Jump's setting will proceed as expected, adjusting for minor alterations you might have caused. This can be toggled on or off, but once turned off, the butterfly effect may make a return to canon events impossible."

**Why S:** This perk is **the meta-game-changer for plot-dependent jumps.** It guarantees that the canon events happen (Star Wars, Lord of the Rings, The Matrix) so you can participate in them. Toggleable but with a hard "once off, can't re-enable" penalty. 200cp for Tourist is a heavy investment, but it converts to body mod. **Critical for any Jumper who plans to insert themselves into canon events.**

#### Be Not Afraid (100cp, Horror)

> "You are immune to the mind-bending or destroying effects of eldritch abominations, are never impaired or disabled by fear, and are also immune to any form of spiritual corruption."

**Why S:** Three unique immunities. Eldritch-mind immunity is irreplaceable for any Lovecraftian jump. Fear impairment immunity is a combat buff. Spiritual corruption immunity is a setting-agnostic anti-corruption buff (useful in many settings, including some horror, occult, and divine-themed ones). All three survive body-mod conversion.

#### Screw the Devil (100cp, Modern Occult)

> "You are completely immune to any form of possession. Outside control might still work on you, but you are the only actual occupant of your body, mind and soul, and you are going to stay that way. If you allow something else to possess you, you can resume control and kick them out at will. Nothing can stop you from doing so, if that is what you want to do."

**Why S:** Possession is a common jumpchain threat (Solomon Kane, Constantine, many religious settings). The "even if you let something in, you can kick it out" clause is more permissive than simple immunity  Eit lets you use possession tactically while retaining control. Body-mod conversion makes it permanent.

#### Universal Translation (100cp, Science Fiction)

> "You can understand, speak, read, write, and think any language you have ever encountered, as long as you have the necessary anatomy. This is retroactive to any languages you might have been exposed to in the past."

**Why S:** Retroactive omnilingualism with body-mod conversion. The "anatomy permitting" clause is fair  Eyou can't speak whale-song without a whale's mouth. This is a chain-permanent utility perk. Pairs with the Tourist perk "Seeing The Sights" for a complete information-retention stack.

#### Secondary Superpowers (100cp, Super Hero)

> "Any power or ability that you acquire, no matter where or how you acquired it, you also receive the necessary secondary superpowers to make it function properly. You also have the ability to shut off any of your abilities, or to weaken them to any level between off and full power, at will."

**Why S:** This is **the body-mod-stack enabler.** "Required secondary superpowers" means: when you take, say, a flight power in a future jump, you automatically get the balance, spatial awareness, and acclimatization to use it. The throttling clause is a unique power-control utility (sneak past magical lie detectors by suppressing the magic sense, for example). Body-mod conversion makes it apply to every future power you acquire. **This is the perk that makes the body-mod stack actually stackable.**

### §5.2 Tier A Perks (10)

These perks are strong but situational or less unique than S-tier picks.

#### Friendly Sort (100cp)

> "People like you, you have charisma and charm. Nothing supernatural or superhuman, but you are a very likable person. This also removes any shyness, social anxiety, or similar problems that you possess."

**Why A:** Charisma is common, but the "removes social anxiety" clause is a permanent mental-health buff. Pairs well with No Matter Where You Go. Body-mod conversion makes it permanent.

#### Veteran (100cp)

> "You never lose your cool, keeping your head no matter what the situation you are in. This does not mean you don't feel emotions, just that you can control them."

**Why A:** Emotional control is useful but overlaps with No Matter Where You Go. Strictly worse than that perk, but the combat-relevant framing ("never lose your head under pressure") is a real benefit.

#### General Knowledge upgrade (100cp)

> "When you enter a new Jump, you gain knowledge of the location and culture you start in that is equivalent to what the average citizen would know. You also gain fluency in the local language or languages. For an additional 50cp, all of your knowledge will have the local equivalent added, such as a student of history knowing as much as an equivalently educated student of history in the new setting. This added information never goes away, but is never confusing and does not impair you in any way."

**Why A:** The base perk (50cp, equivalent to average citizen) is C-tier. The 100cp upgrade adds professional-grade setting knowledge that **never goes away**  Ethis is the chain-permanent utility. Body-mod conversion makes it permanent across all jumps.

#### Expertise (100cp, Slice of Life, repeatable)

> "You are at an expert level of skill and ability in one real-world profession of your choice. This level of skill does not make you one of the best in the world, but it does make you a top-notch professional. This can be taken multiple times, for a different profession each time."

**Why A:** Repeatable, body-mod-convertible. Each purchase gives a top-notch professional skill. Pairs with Class Skills (Fantasy) for a complete skill-stack. The "real-world profession" clause means you can't pick "Sorcerer Supreme"  Eit's bounded to mundane careers.

#### Eagle Scout (100cp, Survival)

> "You are an expert when it comes to survival, both wilderness and urban. You are both talented and lucky at finding the materials and resources you need, in any environment, they could exist."

**Why A:** Resource luck is a unique utility. The "talented and lucky" framing is a strong buff  Eyou can find what you need anywhere. Body-mod conversion.

#### The Quick and the Dead (100cp, Modern Adventure)

> "You think fast, react fast, and move fast. Your reaction speed is peak human, and your thought processes are three times as fast as they otherwise would be."

**Why A:** 3x thought speed is a strong cognitive buff. Pairs with Sherlock Scan for an information-processing stack. "Peak human" reaction time is good but not superhuman  Ethis is a foundation, not a capstone.

#### Sherlock Scan (100cp, Modern Adventure)

> "When examining a location, object or situation, the parts of it that are important or relevant to you in some way will stand out, calling your attention to them, without distracting you from your surroundings."

**Why A:** Relevance highlighting is a unique utility. Combined with the Quick and the Dead's 3x thought speed, it's a complete information-processing stack. Body-mod conversion.

#### Student of War (100cp, Historical)

> "The study of history is often the study of war, and you have become an expert at it. You are not only an expert strategist and tactician, you are also an expert at logistics and organization, the unsung heroes of any military campaign."

**Why A:** Strategy/tactics/logistics is a rare skill stack. Body-mod conversion. Niche but irreplaceable for war-themed jumps.

#### Engineer (100cp, Science Fiction)

> "Once you know how to use a piece of technology, you can figure out how to fix it. This does not provide tools or materials, just the know-how."

**Why A:** Tech-fixing is a Tinker-adjacent utility. Body-mod conversion. Pairs well with Science Fiction jumps (Tinker-tech, starship maintenance, etc.).

#### Class Skills (100cp, Fantasy, repeatable)

> "You have the specialized skills set that best fits an occupation or 'class' of your choice, appropriate to a fantasy setting. This does not provide any magical abilities but can include lore or theoretical knowledge of magic, which will update to your current setting. This can be taken multiple times, for a different 'class' each time."

**Why A:** Repeatable, body-mod-convertible. The "lore or theoretical knowledge of magic, which will update to your current setting" clause is unique  Eyour magical knowledge stays current as you move between settings. Stacks well with Expertise.

### §5.3 Tier B Perks (8)

#### Friendly Friends (100cp, Slice of Life)

> "No matter what you have experienced or where you have been, you have no difficulty in connecting emotionally with other people. You are also a good listener and all around good friend, when you want to be."

**Why B:** Emotional connection is useful but narrower than Friendly Sort. "When you want to be" is a fair-balance clause.

#### Lone Survivor (100cp, Survival)

> "You do not suffer any difficulty resulting from isolation or loneliness. Your social skills do not degrade, and you are guaranteed not to start having conversations with a volleyball."

**Why B:** Niche. Useful for long solitary stretches but most chains have social contact.

#### Run Like Hell (100cp, Horror)

> "You have a talent for running from trouble. You tend to choose the best path to lead to safety, you are a bit faster than would be expected, your endurance is extraordinary, and you are extremely sure-footed and agile."

**Why B:** Escape specialist. Useful in Horror but not universally.

#### Advanced Infantry Training (100cp, Military)

> "While you are no Special Forces operator, you have been through Basic Training and Advanced Infantry School, or the equivalent for the setting, and are a highly trained and conditioned soldier."

**Why B:** Solid combat training but niche. Body-mod conversion makes it permanent, so if you take it, the combat training persists across all jumps.

#### Military Occupational Specialty (100cp, Military, repeatable)

> "You have been fully trained in an M.O.S. of some sort. This could be truck driving, vehicle maintenance, cryptography, law enforcement, cooking, or any other non-combat skill set commonly taught by the military in the setting. This can be taken multiple times, for a different M.O.S. each time."

**Why B:** Non-combat MOS, repeatable. Niche but useful for military-themed jumps.

#### Fists of Justice (100cp, Super Hero, repeatable per art)

> "Pick a martial art. Kung Fu, Judo, Jeet Kune Do, Savate, whatever. You are an expert at this form of fighting. It won't let you fight Superman, but it will give you a handy advantage against someone your level."

**Why B:** One martial art at expert level. Repeatable for different arts. The "won't let you fight Superman" clause is fair-balance.

#### Cantrips (100cp, Fantasy)

> "You have minor magical abilities that you can use at will. These abilities are of the same scale as D&D 3.5ed cantrips, useful tricks like cleaning your clothing or creating a small temporary floating ball of light."

**Why B:** Minor utility magic. Niche but useful for quality-of-life improvements.

### §5.4 Tier C Perks (5)

#### Sexy and I Know It (50cp)

> "You are incredibly good-looking... You will retain your fit and attractive appearance, even without exercise or a proper diet... You never actually get dirty, always staying as pristine and perfect as you could be... Furthermore, you have perfect control over your fertility and menstrual cycle in the case of females."

**Why C:** Appearance perk. The "perfect 10" rating is a flavor-tier benefit. Most chains have multiple appearance perks available; this is the GFJ baseline. The fertility control is redundant with Body Like A Jumper. 50cp for body-mod conversion of a flavor perk is not a great deal.

#### Self-Motivation (50cp)

> "You have no difficulty motivating yourself, easily putting your full effort into any task, training, or activity."

**Why C:** Mild training buff. Redundant with Veteran or Boredom Immunity. 50cp is cheap but the body-mod conversion is wasted on a perk that overlaps with S-tier picks.

#### Life Skills (50cp)

> "You have the basic life skills that everyone really should possess. You can cook, clean, do laundry, drive, perform basic maintenance, balance finances and perform other tasks that are needed by the average person."

**Why C:** Mundane adulting. Cheap but redundant with the Body Mod Reward from later supplements (Body Mod typically covers mundane life skills).

#### General Knowledge (50cp base)

> "When you enter a new Jump, you gain knowledge of the location and culture you start in that is equivalent to what the average citizen would know. You also gain fluency in the local language or languages."

**Why C:** Average-citizen local knowledge. Cheap but redundant with Universal Translation. The base perk is much weaker than the 100cp upgrade (which adds professional-grade permanent knowledge).

### §5.5 Tier D and F Perks

None. Every perk has at least some niche utility.

### §5.6 Perks not in the source

The source contains 33 perks across 11 sub-sections (General + 10 Levels). This doc covers all 33. There are no perks missing from the analysis.

---

## §6 Items Tier List

GFJ has 3 unique items (4 purchase options counting Bare Necessities' free and trust-fund variants). All items are body-mod-convertible. Items also have their own +200cp stipend (treated separately from the 1000-CP base; see §11.3 for the ruling).

### §6.1 Tier S Items (1)

#### Bare Necessities (100cp, trust fund upgrade)

> "For 100cp, you have a trust fund that pays in whatever the local currency is, equivalent to two hundred thousand dollars ($200,000.00) per year. Your home, vehicle, and other possessions are upgraded to be appropriate for this level of income. This money is legal, with all taxes paid and all documentation needed. No one will question where it comes from. Each time you purchase the upgrade, move the decimal point one space to the right. This item follows you to all future jumps, adapting as needed, and can be toggled off for a jump. Any other form of income you receive, including from other perks or items, can be added to the trust fund, and will also be completely legal with all taxes paid and documentation needed."

**Why S:** The single best item in the doc. $200K/year, **exponentially scaling per repurchase** (ÁE0 each time: $200K ↁE$2M ↁE$20M ↁE$200M ↁE...). Follows you to all future jumps, adapts to local currency, **can be toggled off per jump** (so you can take it for the trust fund scaling and disable it in a low-income setting). Other income can be added, with all taxes paid. This is a chain-permanent wealth engine that converts to body mod.

**Critical interaction:** "Each time you purchase the upgrade, move the decimal point one space to the right." This is **multiplicative scaling**, not additive. Buying it twice in one Jump is $2M/year; buying it 3 times is $20M/year. **A 7th repurchase puts you at $2 trillion/year.** This is the most economically broken item in the supplement set.

**Optimization:** Take the free version (job+home+vehicle) at Jump start. Save the 100cp upgrade for later in the Jump (or for the next Jump entirely, since it follows you).

### §6.2 Tier A Items (2)

#### Bare Necessities (Free version)

> "You have a job that pays enough for you to live on, assuming you live simply. You also have a home of some sort, a cheap but decent vehicle of an appropriate type, and the various basic sundries needed to live. Basically, you have a life, set up and waiting for you. The job will be something you are capable of performing, and that works with your background, and the schedule will be flexible enough that it will not interfere in your normal jump activities."

**Why A:** Free, useful. Sets up civilian life for the Jump. Pairs with the 100cp upgrade for a complete life package.

#### Franchise (100cp)

> "After this jump, you will receive something like a comic or cartoon, or even a series of blockbuster-style movies, that tell stylized versions of your adventures. These update at the end of each Jump to include the events of it, and no one can view these without your permission. You may have this in multiple media styles. Pick as many as you would like. And you may pick additional ones at a later date if you choose to."

**Why A:** Body-mod conversion + media-of-your-adventures utility. Useful for narrative purposes (your chain becomes a story you can revisit). The "no one can view without your permission" clause prevents unauthorized surveillance.

### §6.3 Tier B Items (1)

#### Camera (100cp, Free for Tourist)

> "Oh! That picture reminds you of the time you challenged the devil to a game of tiddlywinks! And that one reminds you of the time you put Gabriel in a Cobra Clutch for a full day! You don't actually get a camera. Instead, every time you do something memorable, noteworthy, or just wish to remember a moment in the future, you will receive a snapshot of the moment, framed at just the right size and from just the right angle, you can always get more copies from different angles if you wish, or receive digital copies on any of your devices."

**Why B:** Auto-snapshot of memorable moments. Free for Tourist (the only Origin). Useful for nostalgia but doesn't have a combat or mechanical benefit. Pairs with Seeing The Sights, All The Sights (perfect memory) for a complete memory-stack.

### §6.4 Item mechanics

**"If these items are lost, stolen, or destroyed, new ones will be in the Warehouse 24 hours later."** This applies to all items. The 24-hour respawn timer is a unique utility  Eitems cannot be permanently lost.

**"You can combine similar items purchased from this Jump at no additional cost."** Stacking allowed at no cost. For example, multiple Bare Necessities upgrades combine into one trust fund with the higher income.

**"Any item can be taken multiple times, but 100cp Origin items are discounted instead of free after the first purchase."** The Tourist's Camera is free the first time, then discounted on subsequent purchases in future Jumps (when this Origin applies again).

**"Each Origin gets one of its 100cp items for free, and a discount on its other item."** The Tourist gets Camera free. The Tourist's "other item" is not defined in the source  Ethis is a minor source-text issue (see §11.6). The Tourist does NOT get a free Franchise or a discount on Franchise.

### §6.5 Items not in the source

The source contains 3 unique items (Bare Necessities free + trust fund variants, Franchise, Camera). This doc covers all 3.

---

## §7 Drawbacks Tier List

GFJ has 18 drawbacks, organized by Level. All drawbacks are +100cp. The doc is explicit: "You can take as many Drawbacks as you want, without limit on cp gained. If you can handle the Drawbacks, you can have the reward."

### §7.1 Drawback mechanics

Three mechanical rules govern drawbacks:

1. **No cap on CP gained.** "You can take as many Drawbacks as you want, without limit on cp gained."
2. **World-changing drawbacks are point-of-fact, not fiat-protected.** "Also, the drawbacks that change the world are altering its condition at the start of the Jump. If you are genuinely capable of changing the nature of the world, fiat will not kick in to change it back."
3. **Level-specific drawbacks only function in that Level.** "Drawbacks specific to a particular Level only function in that Level."

Rule 2 is the most interesting. The doc explicitly grants **meta-world-changes** as drawback effects, and fiat cannot revert them if you have the power to change them. This is a unique mechanic: it's an anti-fiat clause for drawbacks. The classic example: a "World Ends" drawback. If you can prevent the end of the world, fiat won't undo your prevention. If you can't, the world ends. The drawback just sets the initial condition; the outcome is up to you.

Rule 3 means that "Bandits" in Fantasy only fires when you're in the Fantasy Level, not in other Levels. This affects how you allocate CP  Eyou only "pay" the Fantasy drawbacks during the Fantasy Level of the Jump.

### §7.2 Tier S Drawbacks (1)

#### Three Sea Shells (+100cp, Science Fiction)

> "The future is full of amazing new technology designed to improve every aspect of life. The problem is that you have no clue how to use most of it, cannot figure it out for yourself, and for some reason have difficulty getting anyone to teach you how to use it. This is a quality of life issue that applies mostly to everyday convenience technology. If your life depends on it, you have as good a chance to figure it out as you normally would."

**Why S:** "If your life depends on it, you have as good a chance to figure it out as you normally would"  Ethis is the **fair-balance clause that makes Three Sea Shells the best drawback in the doc.** It's a quality-of-life inconvenience, not a combat or survival threat. Pure CP gain. Take it always.

### §7.3 Tier A Drawbacks (6)

#### Randomized (+100cp, General)

> "Your level choice is out of your hands. Roll a d10. Check the list to see which level that number corresponds to. That's your first level. Survived it? Good. Keep rolling and completing levels until all 10 are completed. You re-roll if you roll a level you have already faced."

**Why A:** Pure CP gain if you don't have a strong preference for Level order. The 10 Levels are roughly equivalent in difficulty. **The only drawback that affects the meta-game** (Level order). If you care about a specific optimal order (see §2.4), this is B-tier; if you don't, it's A-tier.

#### Odd Jobs (+100cp, Slice of Life)

> "You'll constantly be gaining and losing your job, having to learn a new minimum wage task every few weeks. Sometimes you'll be qualified, others much less so. Still, you've got to try your hardest."

**Why A:** Annoying but easily mitigated by the Bare Necessities trust fund (when you upgrade). 100cp for a job-churn inconvenience is good value.

#### Horrific Weather (+100cp, Survival)

> "For the duration of your stay in this Level, you will be plagued with bad weather. It will be drought when you need rain, rain when you need clear skies, and alternate between blistering heat and freezing cold."

**Why A:** Weather is annoying but rarely lethal. Most settings have indoor options. Pure CP.

#### Modern Sensibilities (+100cp, Historical)

> "You will never adapt culturally to this setting. You will always be surprised and shocked at the ways your current home differs from what you grew up in. This is going to cause social problems, and could make you underestimate opponents that you assume are less sophisticated than you are."

**Why A:** Culture shock is an inconvenience. The "underestimate opponents" clause is a real risk but easily managed by remembering the perk exists. Pure CP.

#### Massive Collateral (+100cp, Super Hero)

> "No matter how careful you are, you somehow seem to always end up destroying everything around you when you fight."

**Why A:** Property damage is irrelevant for most Jumpers. If you don't care about collateral, this is free CP. The Super Hero level is the easiest place to take it.

#### Bandits (+100cp, Fantasy)

> "No matter where you are going, you will be accosted by bandits, muggers, bullies, or someone else that wants to beat you down and take your stuff at least once a week. They may not be powerful, but they will be persistent, and probably ugly."

**Why A:** Easy fights. Most Jumper builds can handle weekly bandit ambushes. Pure CP.

### §7.4 Tier B Drawbacks (7)

#### Homeless (+100cp, Slice of Life)

> "Regardless of what you'd otherwise have imported into, instead you start out in a homeless shelter with just the clothes on your back and without a dime to your name."

**Why B:** Bad early, but mitigable. Body Like A Jumper helps with the physical side; the Jumper's other perks can address the rest. Worth 100cp but not "always take" tier.

#### Accident Prone (+100cp, Slice of Life)

> "You are prone to minor accidents that tend to be inconvenient, painful, or embarrassing, but will not likely kill you."

**Why B:** "Will not likely kill you" is the fair-balance clause. Annoying but survivable.

#### Resource Shortage (+100cp, Survival)

> "Food, water, and other staples are scarce. You will find it more difficult to acquire enough resources to live."

**Why B:** Mitigated by Eagle Scout. If you have Eagle Scout, the resource-finding luck counters the scarcity. If you don't, it's a real challenge.

#### Scripted Encounters (+100cp, Horror)

> "You'll run into whatever threat you're dealing with more often. You will not automatically become a priority target, but sheer proximity is likely to put you at risk."

**Why B:** More monster encounters. Mitigated by Be Not Afraid and Run Like Hell. Risky if you don't have Horror perks.

#### I Have Truly Found Paradise (+100cp, Military)

> "Your chain of command is... sub-optimal."

**Why B:** Annoying bureaucracy. Survivable.

#### Masquerade (+100cp, Modern Occult)

> "The public is not ready to discover the existence of the supernatural, and part of your job is ensuring that they don't."

**Why B:** Standard urban fantasy constraint. Some Jumps require this anyway.

#### Nemesis (+100cp, Super Hero)

> "There is this one enemy that you can never seem to get rid of."

**Why B:** Recurring villain. Real threat but manageable.

### §7.5 Tier C Drawbacks (4)

#### Monster Bait (+100cp, Horror)

> "Any monster, no matter what its type, will consider you the perfect prey, and will target you over any other person."

**Why C:** Active threat. If you have Be Not Afraid, you can survive; if you don't, this is genuinely dangerous.

#### Bad Comic Relief (+100cp, Modern Adventure)

> "You have a friend, or comrade, or student, or whatever other reason you might have a person following you around. The thing is that no matter how much you might like this person, they are really more trouble than they are worth... Unfortunately, there is just no getting rid of this person."

**Why C:** NPC liability. The "no getting rid of this person" clause is the killer  Eyou can't just ditch them. Genuine annoyance.

#### Secret Society (+100cp, Modern Adventure)

> "You are being opposed by a powerful and well-entrenched secret society of some sort."

**Why C:** Active enemy organization. Real threat.

#### Siege At Jumper Fortress (+100cp, Fantasy)

> "At some point in your time in this Level, you will be forced to participate in the kind of large set battle that fantasy blockbuster movies love. It will be bloody and dangerous, and you will be there."

**Why C:** Forced into a major battle. Dangerous.

### §7.6 Drawbacks not in the source

The source contains 18 drawbacks (1 General + 17 Level-specific). This doc covers all 18.

---

## §8 Synergies

### §8.1 Within-GFJ synergies (Tourist-pivot combos)

**The Tourist Core Stack (free or 50%-off):**
- The Road Goes Ever On And On (Free for Tourist) + Seeing The Sights, All The Sights (100cp) + Ride The Rails To See The Sights (200cp) = **300cp** for the three Tourist perks, and they cover eternity readiness + perfect memory + canon preservation.

**The Body Mod Foundation Stack:**
- Body Like A Jumper (Free) + Mind Like A Jumper (Free) + No Matter Where You Go, There You Are (100cp) + Boredom Immunity (100cp) = **200cp** for a complete physical + mental baseline that survives into body mod. This is the "Jumper doesn't decay" stack.

**The Translation Stack:**
- Universal Translation (100cp) + General Knowledge (100cp upgrade) = **200cp** for chain-permanent language and setting knowledge.

**The Defense Stack (anti-Master/Stranger):**
- Be Not Afraid (100cp, Horror) + Screw the Devil (100cp, Modern Occult) + No Matter Where You Go (100cp) = **300cp** for immunity to fear, possession, mind-bending, and trauma. Plus the morality lock.

**The Tourist Memory Loop:**
- Seeing The Sights (100cp, Tourist) + Camera (Free for Tourist) = **100cp** for a perfect-memory + auto-snapshot combo. Everything you experience is permanently recorded.

**The Thought-Speed Stack:**
- The Quick and the Dead (100cp, Modern Adventure) + Sherlock Scan (100cp, Modern Adventure) = **200cp** for peak-human reaction + 3x thought speed + relevance highlighting.

**The Skill-Stack:**
- Expertise (100cp, Slice of Life) + Class Skills (100cp, Fantasy) + General Knowledge 100cp (100cp) = **300cp** for professional-grade + fantasy-class + chain-permanent knowledge.

**The Combat Foundation Stack:**
- Advanced Infantry Training (100cp, Military) + Fists of Justice (100cp, Super Hero) + Student of War (100cp, Historical) = **300cp** for solid combat training + martial arts + military strategy.

**The Survival Stack:**
- Eagle Scout (100cp, Survival) + Lone Survivor (100cp, Survival) + Run Like Hell (100cp, Horror) = **300cp** for resource luck + isolation resistance + escape ability.

**The Power-Enabler Stack:**
- Secondary Superpowers (100cp, Super Hero) + Common Sense (50cp) = **150cp** for required secondary powers + Benefit-punish detection. The cornerstone of the body-mod power stack.

### §8.2 Drawback synergy: the "every drawback" stack

The source explicitly allows unlimited drawback stacking. Combined with the perks-first/negative-CP reading of the source ledger, the optimal drawback strategy is to take every drawback you can handle:

- All 18 drawbacks = **+1800cp**
- Combined with the source ledger's user, who went -1800cp in perks before applying drawbacks (i.e., took 1800cp worth of perks beyond the 1000-CP base)

This produces a total spend of **1000 + 1800 = 2800cp on perks**, balanced by **+1800cp from drawbacks** + **+200cp Items stipend**. Net = 1000cp + 200cp items stipend, with 1800cp of perks and 18 drawbacks.

This is the build philosophy of the source's own example playthrough. It is the most perk-intensive way to play GFJ, and the Body Mod Reward makes it the most powerful.

### §8.3 The Body Mod Reward multiplier

The Body Mod Reward converts every perk and item into body mod. The multiplier is:

> "You will still have them, even in Gauntlets or if you take a Power Loss Drawback."

This means every perk you take in GFJ is **Gauntlet-immune and Power-Loss-immune**. Compare to a typical Jump, where perks can be lost in Gauntlets. GFJ perks are body-mod-tier: they persist.

The strategic implication: **every CP spent in GFJ is a CP that is permanently locked into your body mod.** This makes GFJ the most CP-efficient Jump in the chain, by a wide margin. Even a 50cp perk like Self-Motivation is a chain-permanent buff if you take it in GFJ and it converts.

### §8.4 The "Body Mod First" foundation: the key cross-supplement hook

This is the most important synergy in the entire GFJ analysis. The standard Jumpchain supplement stack is:

1. **Body Mod** (Essential Body Mod, SB Body Mod, or similar)  Eprovides the Jumper's physical/spiritual baseline
2. **Personal Reality Supplement** (PRS)  Eprovides the Jumper's personal dimension/spaces
3. **Universal Drawbacks Supplement** (UDS)  Eapplies universal drawbacks across all jumps
4. **Generic First Jump** (GFJ)  Ethe "first jump" supplement

The intended play order is:

1. **Take GFJ as Jump 1.** This is the meta-Jump that gives you 10 Levels of training, a Tourist identity, and a Body Mod conversion at the end.
2. **At GFJ's end, the Body Mod Reward converts all your GFJ perks and items to Body Mod.** This is the "snap"  Ethe 1000+ CP you spent in GFJ is now part of your permanent body mod.
3. **Apply Body Mod to your Jumper baseline.** Essential Body Mod (or SB Body Mod) provides the structural framework; GFJ provides the content.
4. **Apply Personal Reality Supplement.** Your personal dimension is built around the body-mod-converted Jumper.
5. **Apply Universal Drawbacks Supplement.** Your standard drawbacks stack on top of the body-mod Jumper.

GFJ is the **canonical way to bootstrap your supplement stack** because:

- It's a first jump (lowest stakes, no actual setting consequences).
- It has 10 Levels (long enough to be meaningful, short enough to complete).
- It has the Body Mod Reward (the supplement-stack enabler).
- It has a +200cp Items stipend (so you can afford items as well as perks).
- It has unlimited drawback stacking (so you can buy every perk you want).
- It has the Tourist origin with three powerful discounted perks (Memory, Canon Preservation, Eternity Readiness).
- It has the Body Like A Jumper / Mind Like A Jumper free perks (a clean physical/mental baseline).
- It has Common Sense (Benefactor-punish detection) which is unique and useful for any chain.

**The supplement-stack bootstrap order is: GFJ ↁEBody Mod ↁEPRS ↁEUDS.** GFJ first because it provides the perks/items; Body Mod second because it provides the structural framework that the perks attach to; PRS third because it provides the spaces; UDS fourth because it provides the cross-jump drawback engine.

### §8.5 Synergy with other Generic jumps

GFJ's relationship to other Generic jumps is complex:

- **Generic Jumpchain** (the original, by StompieLongStocking or similar)  Eprovides a much wider origin selection and more perk variety, but lacks the Body Mod Reward. The two can be taken in either order, but GFJ should be taken first if you want the Body Mod conversion to apply to the broader perks.
- **Generic Second Jump / Generic Third Jump**  Ethe "continuation" docs that pick up where Generic First Jump leaves off. They typically assume you've taken GFJ first and have the Body Mod conversion.
- **Generic Specific Jump**  Esupplements for specific genres (Generic Harry Potter, Generic Worm, etc.)  Ethese are usually in-setting and don't interact with GFJ's body mod.
- **Generic Powers Supplement**  Eprovides power-level perks. Stacks well with GFJ's Secondary Superpowers.

The recommended reading: **take GFJ as Jump 1, then take other Generic jumps in any order, and let the Body Mod conversion handle the rest.** Each Generic jump you take adds to your body mod via its own Body Mod clause (most modern Generic jumps have one).

### §8.6 The "perks first, drawbacks balance" reading

The source ledger in the Notion export shows a user who went -1800cp in perks before applying any drawbacks. This is the most perk-intensive reading of the doc. The text does not explicitly authorize this, but the absence of a CP floor and the explicit "no limit on cp gained" from drawbacks suggests it's the intended reading.

The "strict" reading would be: you cannot spend below 0 CP. If you have 1000 CP, you can spend at most 1000 CP on perks.

The "perks-first" reading (the source ledger's reading) is: spend freely, drawbacks balance.

The "raw CP" reading (which this analysis uses throughout) is: treat drawbacks as a separate CP source, applied at Jump end to balance any perk overspend.

**This is a critical ambiguity**  Esee §11.4 for the full ruling.

### §8.7 Tourist's "Discount for The Tourist" is the only Origin discount

Because GFJ has only one Origin (The Tourist), the 50% discount on Origin perks is always active. There is no Origin choice to make; you just take the discount. This means:

- The Road Goes Ever On And On (100cp)  EFree for Tourist = 0cp
- Seeing The Sights, All The Sights (200cp)  EDiscount for Tourist = 100cp
- Ride The Rails To See The Sights (400cp)  EDiscount for Tourist = 200cp

Plus the Tourist Item (Camera) is free. So the Tourist is, mechanically, the best possible Origin in the doc  Ebecause there's no alternative.

### §8.8 The "10 levels, 10 identities" synergy

You visit 10 Levels and acquire 10 identities with full memories. Combined with Seeing The Sights, you have a perfect record of all 10 identities. Combined with the Tourist framing, this is the "lore tourist" playstyle  Eyou experience the settings, you record them, and you carry them into the chain.

Combined with Ride The Rails (canon preservation), the 10 identities exist in a world where canon events happen, so you can insert yourself into them.

Combined with Screw the Devil + Be Not Afraid, you can handle the supernatural/horror Levels.

Combined with Secondary Superpowers, the Super Hero Level's average-setting powers (from Basic Requirements) are properly supported.

This is the meta-design of GFJ: **10 settings, 10 identities, 10 training grounds, all converted to body mod.**

---

## §9 Build Archetypes

Five named archetypes, each a distinct strategy for using GFJ.

### §9.1 Archetype 1: The Body-Mod Foundation (The Bootstrapper)

**Strategy:** Use GFJ as a pure supplement-stack bootstrap. Take the minimum perks needed to enable a strong body mod conversion. Skip level-specific perks in favor of universal perks.

**CP allocation (no drawbacks, ~600cp spent):**
- The Tourist perks: 0 + 100 + 200 = 300cp
- General perks: Body Like A Jumper (0) + Mind Like A Jumper (0) + Common Sense (50) + Boredom Immunity (100) + No Matter Where You Go (100) = 250cp
- Universal Translation (100) = 100cp
- Total perks: ~650cp
- Items: Bare Necessities trust fund (100) + Camera (0) = 100cp
- Net spent: ~750cp (within budget)

**Result:** A clean Body Mod conversion of the Jumper's mental/physical baseline + the Tourist's lore-tourist core. Skips the level-specific perks entirely (no Secondary Superpowers, no Be Not Afraid, no Screw the Devil). Leaves ~250cp unspent for flexibility.

**Best for:** Players who want a clean, focused body mod conversion and plan to take many other Jumps to acquire their actual power set.

### §9.2 Archetype 2: The Drawback Stacker (The Perfectionist)

**Strategy:** Take every drawback, then buy every perk. Match the source ledger's example playthrough.

**CP allocation (all 18 drawbacks, +1800cp):**
- All 33 perks = ~2800cp (with Tourist discounts and free perks)
- All 3 unique items = ~200cp
- Total: ~3000cp
- Drawback gains: +1800cp
- Items stipend: +200cp
- Starting CP: 1000cp
- Net: 1000 + 200 - 3000 + 1800 = 0cp

**Result:** A complete Body Mod conversion of every perk in the doc. The Jumper is permanently buffed across all 10 Levels' worth of perks.

**Best for:** Players who want maximum power at the cost of maximum drawback exposure. The downsides: the 10 Levels become punishing (especially Horror with Monster Bait + Bandits in Fantasy with Siege At Jumper Fortress). The perks-first/negative-CP reading is required to make this work.

### §9.3 Archetype 3: The Self-Insert Safe Start (The Cautious Tourist)

**Strategy:** Take GFJ as a low-risk "first jump." Minimal drawbacks, focus on defensive perks. The Jumper is not a combatant yet  Ethey're a tourist.

**CP allocation (2 drawbacks, +200cp; ~600cp spent):**
- Drawbacks: Three Sea Shells (+100) + Modern Sensibilities (+100) = +200cp
- Tourist perks: 0 + 100 + 200 = 300cp
- Defensive perks: Body Like A Jumper (0) + Mind Like A Jumper (0) + Be Not Afraid (100) + Screw the Devil (100) + No Matter Where You Go (100) + Veteran (100) = 400cp
- Universal Translation (100) = 100cp
- Items: Bare Necessities trust fund (100) = 100cp
- Total spent: ~900cp; net with drawbacks: ~700cp spent (within budget)

**Result:** A defensive Jumper who is mentally and physically resilient, has possession/fear/eldritch immunity, has universal translation, has a Tourist lore-tourist core, and has a chain-permanent trust fund. Skips combat perks entirely.

**Best for:** Players who want a "no combat" first jump. The Jumper is a tourist, not a warrior. The defensive perks cover the most common supernatural threats, and the Tourist perks handle the meta-game.

### §9.4 Archetype 4: The Lore Tourist (The Canon Completionist)

**Strategy:** Lean into the Tourist Origin's three perks (perfect memory, canon preservation, eternity readiness) and ride that as the Jumper's identity. Add the Body Mod Reward and the body mod conversion to make this a permanent lore-tourist identity.

**CP allocation (3 drawbacks, +300cp; ~700cp spent):**
- Drawbacks: Three Sea Shells (+100) + Randomized (+100) + Modern Sensibilities (+100) = +300cp
- Tourist perks: 0 + 100 + 200 = 300cp
- Lore-supporting perks: Body Like A Jumper (0) + Mind Like A Jumper (0) + Universal Translation (100) + General Knowledge 100cp (100) + Veteran (100) = 300cp
- Items: Bare Necessities trust fund (100) = 100cp
- Total spent: ~700cp; net with drawbacks: ~400cp spent (well within budget)

**Result:** A Jumper who exists to experience settings, preserve canon, remember everything, and adapt to anything. The Tourist core (Memory + Canon Preservation + Eternity) is body-mod-converted, making this a chain-permanent identity.

**Best for:** Players who play Jumpchain for the stories, not the power gaming. The Lore Tourist is a "casual" build that's still very powerful (perfect memory + canon preservation are top-tier perks).

### §9.5 Archetype 5: The Power Enabler (The Future-Proofer)

**Strategy:** Take only the perks that make future powers work better: Secondary Superpowers (required secondary powers for all future powers), Common Sense (Benefactor-punish detection), No Matter Where You Go (morality lock), and Body Like A Jumper (physical baseline). Use the rest of the budget on Tourist perks for the lore side.

**CP allocation (2 drawbacks, +200cp; ~700cp spent):**
- Drawbacks: Three Sea Shells (+100) + Massive Collateral (+100) = +200cp
- Tourist perks: 0 + 100 + 200 = 300cp
- Power-enabler perks: Body Like A Jumper (0) + Mind Like A Jumper (0) + Common Sense (50) + Secondary Superpowers (100) + No Matter Where You Go (100) = 250cp
- Universal Translation (100) = 100cp
- Items: Bare Necessities trust fund (100) = 100cp
- Total spent: ~750cp; net with drawbacks: ~550cp spent (within budget)

**Result:** A Jumper whose body mod makes every future power work properly (Secondary Superpowers), who can't be punished by the Benefactor (Common Sense), who keeps their values (No Matter Where You Go), and who has the Tourist lore-tourist core.

**Best for:** Players who plan to take many high-power jumps and want a body mod that makes those powers function cleanly. Secondary Superpowers is the cornerstone of this archetype.

---

## §10 Sample Builds

Detailed builds for the most interesting archetypes, with full budget breakdowns.

### §10.1 Build A: The Lore Tourist (conservative, ~700cp spent)

**Origin:** The Tourist (mandatory)

**Drawbacks (3, +300cp):**
- Randomized (+100)  ERandom level order, doesn't matter for this build
- Three Sea Shells (+100)  EQuality-of-life inconvenience only
- Modern Sensibilities (+100)  ECulture shock, easily handled

**Perks (700cp):**
- The Road Goes Ever On And On (Free for Tourist)  E0cp
- Seeing The Sights, All The Sights (100cp, Tourist discount)  E100cp
- Ride The Rails To See The Sights (200cp, Tourist discount)  E200cp
- Body Like A Jumper (Free for All)  E0cp
- Mind Like A Jumper (Free for All)  E0cp
- Universal Translation (100cp)  E100cp
- General Knowledge 100cp upgrade (100cp)  E100cp
- Veteran (100cp)  E100cp

**Items (100cp):**
- Bare Necessities trust fund upgrade (100cp)  E$200K/yr, exponential scaling on repurchase

**Total spent: 800cp**
**Drawback gains: +300cp**
**Net: 1000 + 300 - 800 = 500cp remaining**

**Result:** A Lore Tourist with perfect memory, canon preservation, eternity readiness, universal translation, chain-permanent setting knowledge, emotional control, and a trust fund. The body mod conversion makes all of this permanent. The 500cp remaining can be used on level-specific perks (Be Not Afraid, Screw the Devil, Secondary Superpowers) or saved.

**Best for:** Players who want a strong, lore-focused first jump with room to grow. This build is conservative and well-balanced.

### §10.2 Build B: The Body-Mod Foundation (no drawbacks, ~750cp spent)

**Origin:** The Tourist

**Drawbacks:** None (the "Safe Start" approach)

**Perks (650cp):**
- The Road Goes Ever On And On (Free)  E0cp
- Seeing The Sights, All The Sights (100cp)  E100cp
- Ride The Rails To See The Sights (200cp)  E200cp
- Body Like A Jumper (Free)  E0cp
- Mind Like A Jumper (Free)  E0cp
- Common Sense (50cp)  E50cp
- Boredom Immunity (100cp)  E100cp
- No Matter Where You Go, There You Are (100cp)  E100cp
- Universal Translation (100cp)  E100cp

**Items (100cp):**
- Bare Necessities trust fund (100cp)  E$200K/yr

**Total spent: 750cp**
**Drawback gains: 0**
**Net: 1000 + 200 - 750 = 450cp remaining (250cp for Items, 200cp for Perks)**

**Result:** A Body-Mod Foundation that focuses on the meta-game perks: Memory, Canon Preservation, Eternity, Benefactor-punish detection, Boredom Immunity, Morality Lock, and Translation. The 450cp remaining can fund additional perks (General Knowledge 100cp upgrade, Friendly Sort, Veteran) or additional items (Franchise).

**Best for:** Players who want maximum meta-game power and plan to take many other Jumps. This build's body mod is the foundation of a long chain.

### §10.3 Build C: The Drawback Stacker (all drawbacks, ~3000cp spent)

**Origin:** The Tourist

**Drawbacks (all 18, +1800cp):**
- Randomized (+100)
- Homeless, Accident Prone, Odd Jobs (+300, SoL)
- Resource Shortage, Horrific Weather (+200, Survival)
- Scripted Encounters, Monster Bait (+200, Horror)
- I Have Truly Found Paradise (+100, Military)
- Bad Comic Relief, Secret Society (+200, Modern Adventure)
- Nemesis, Massive Collateral (+200, Super Hero)
- Masquerade (+100, Modern Occult)
- Modern Sensibilities (+100, Historical)
- Bandits, Siege At Jumper Fortress (+200, Fantasy)
- Three Sea Shells (+100, Science Fiction)

**Perks (all 33, ~2800cp):**
- General (4 free + 4 at 50cp + 4 at 100cp = 200 + 400 = 600)
  - Body Like A Jumper (0) + Mind Like A Jumper (0) + Basic Requirements (0) + Sexy (50) + Common Sense (50) + Self-Motivation (50) + Life Skills (50) + General Knowledge base+upgrade (50+50=100) + Friendly Sort (100) + Boredom Immunity (100) + No Matter Where You Go (100) + Veteran (100) = 800cp
- Tourist: Road (Free) + Seeing (100 for Tourist) + Ride (200 for Tourist) = 300cp
- Level-specific (18 perks ÁE100cp = 1800cp)  EExpertise, Friendly Friends, Eagle Scout, Lone Survivor, Run Like Hell, Be Not Afraid, AIT, MOS, Quick and the Dead, Sherlock Scan, Fists of Justice, Secondary Superpowers, Screw the Devil, Student of War, Cantrips, Class Skills, Universal Translation, Engineer
- Subtotal: 800 + 300 + 1800 = 2900cp

**Items (200cp):**
- Bare Necessities trust fund (100cp)  E100
- Franchise (100cp)  E100
- Camera (Free for Tourist)  E0

**Total spent: 2900 + 200 = 3100cp**
**Total budget: 1000 + 1800 + 200 = 3000cp**
**Overspend: -100cp**  Eslightly over. Drop one repeatable perk or skip a niche pick.

Adjusting: drop Self-Motivation (50) and Life Skills (50) = -100cp, bringing total to 3000cp. Or drop Cantrips (100) and add 100cp back, etc. The point: the Drawback Stacker gets every perk and item but is right at the edge of affordability.

**Result:** A near-complete Body Mod conversion. The Jumper has every Tourist perk, every level-specific perk (most taken once; repeatable perks like Expertise/MOS/Class Skills taken once), the key General perks, and a trust fund + media franchise. The body mod conversion makes all of this permanent.

**Best for:** Players who want maximum power and are willing to face every drawback. The downside: the 10 Levels become punishing, especially Horror (Monster Bait + Scripted Encounters) and Fantasy (Siege At Jumper Fortress).

### §10.4 Build D: The Power Enabler (~750cp spent)

**Origin:** The Tourist

**Drawbacks (2, +200cp):**
- Three Sea Shells (+100)  Epure CP
- Massive Collateral (+100)  Epure CP

**Perks (750cp):**
- The Road Goes Ever On And On (Free)  E0
- Seeing The Sights, All The Sights (100cp)  E100
- Ride The Rails To See The Sights (200cp)  E200
- Body Like A Jumper (Free)  E0
- Mind Like A Jumper (Free)  E0
- Common Sense (50cp)  E50
- Secondary Superpowers (100cp)  E100
- No Matter Where You Go (100cp)  E100
- Universal Translation (100cp)  E100
- Boredom Immunity (100cp)  E100

**Items (100cp):**
- Bare Necessities trust fund (100cp)  E100

**Total spent: 850cp**
**Drawback gains: +200cp**
**Net: 1000 + 200 - 850 = 350cp remaining**

**Result:** A Jumper whose body mod is the foundation for a high-power chain. Secondary Superpowers ensures every future power works properly; Common Sense prevents Benefactor punishment; No Matter Where You Go locks morality; Universal Translation handles all languages; Tourist perks handle the lore side. The 350cp remaining can fund Be Not Afraid + Screw the Devil (defensive stack) or additional perks.

**Best for:** Players who want a body mod optimized for future high-power jumps. Secondary Superpowers is the keystone.

### §10.5 Build E: The Self-Insert Safe Start (~700cp spent)

**Origin:** The Tourist

**Drawbacks (2, +200cp):**
- Three Sea Shells (+100)  Epure CP
- Modern Sensibilities (+100)  Epure CP

**Perks (700cp):**
- The Road Goes Ever On And On (Free)  E0
- Seeing The Sights, All The Sights (100cp)  E100
- Ride The Rails To See The Sights (200cp)  E200
- Body Like A Jumper (Free)  E0
- Mind Like A Jumper (Free)  E0
- Be Not Afraid (100cp)  E100
- Screw the Devil (100cp)  E100
- No Matter Where You Go (100cp)  E100
- Veteran (100cp)  E100

**Items (100cp):**
- Bare Necessities trust fund (100cp)  E100

**Total spent: 800cp**
**Drawback gains: +200cp**
**Net: 1000 + 200 - 800 = 400cp remaining**

**Result:** A defensive Jumper who is mentally and physically resilient, has possession/fear/eldritch immunity, has a Tourist lore-tourist core, and has a chain-permanent trust fund. Skips combat perks entirely. The body mod conversion is a "defensive foundation" for the chain.

**Best for:** Players who want a "no combat" first jump. The defensive perks cover the most common supernatural threats, and the Tourist perks handle the meta-game.

---

## §11 Edge Cases & Rulings

This section covers ambiguities, the absent rules, and rulings for common questions.

### §11.1 The "Death doesn't end chain" rule

**Status: NOT in the source text.** The source v1.1 does not contain the rule "death doesn't end the chain" or any equivalent. There is no clause in the doc that grants immortality or death-warding.

**Ruling:** If you want this rule for your chain, treat it as a house rule. It is a common Jumpchain convention for first jumps (the "you can't fail your first jump" trope), but the v1.1 source does not codify it. This is a community-tradition reading, not a documented rule.

**Related effects in the source that partially substitute:**
- Body Like A Jumper: physical fitness floor that doesn't deteriorate (does NOT prevent death)
- Mind Like A Jumper: mental illness removal (does NOT prevent death)
- No Matter Where You Go: trauma/PTSD immunity (does NOT prevent death)
- Basic Requirements: level-scaling baseline (does NOT prevent death)
- Be Not Afraid: eldritch mind-bending immunity (does NOT prevent physical death)
- Screw the Devil: possession immunity (does NOT prevent physical death)

None of these prevent death. The closest you get to "death doesn't end chain" is the meta-convention of "your Benefactor doesn't kill you in the first jump because that's the point of a first jump," but the source does not state this.

**Recommendation:** Take the first jump seriously, even if you have these defensive perks. The "death doesn't end chain" rule is community tradition, not doc text.

### §11.2 The "supplement mode" / cross-jump stacking

**Status: NOT in the source text as "supplement."** The word "supplement" does not appear in v1.1. The cross-jump stacking is achieved **implicitly** via the Body Mod Reward.

**Ruling:** The supplement-stack bootstrap is a community reading. The doc achieves it through the Body Mod conversion, not through self-description as a supplement. The practical effect is the same: take GFJ first, get body mod conversion, use that as the foundation for the rest of your supplement stack (Body Mod, PRS, UDS).

**Recommendation:** Treat GFJ as a supplement for cross-jump purposes. The Body Mod Reward makes it function as one even if the doc doesn't say so.

### §11.3 The Items stipend interpretation

**Source text:** "You receive a +200cp stipend for this section."

**Ambiguity:** Is the +200cp:
- (A) A bonus to the total budget, applicable anywhere?
- (B) A separate Items-only budget, on top of the 1000cp Perks budget?
- (C) A +200cp to the total, but only spendable in Items?

**Source ledger reading:** The user's ledger shows:
- 1000cp starting
- Items: -1800 + 200 = -1600 (after spending 200cp on items, the budget is -1600)
- The +200 appears as a credit in the Items section, applied at the start of the Items section.

The natural reading is **(B)**: the +200cp is a separate Items-only budget. You have 1000cp for Perks + 200cp for Items. The +200 is not added to the Perks budget.

**Ruling:** Treat the +200 as an Items-section-only budget. This is the source-ledger-confirmed reading.

### §11.4 The "perks first, drawbacks balance" reading

**Source text:** The doc says "You can take as many Drawbacks as you want, without limit on cp gained." It does not say "you cannot go below 0 CP on perks."

**Source ledger:** The user went -1800cp in perks before applying any drawbacks. This is the perks-first reading.

**Strict reading:** You cannot spend below 0 CP. If you have 1000cp, you can spend at most 1000cp on perks. Drawbacks add to your budget, but perks cannot exceed (budget + drawbacks).

**Perks-first reading:** Spend freely on perks, balance at the end with drawbacks. The 1000cp is a starting budget, not a cap.

**Ruling:** The perks-first reading is the source's own example playthrough and is the most perk-intensive interpretation. The strict reading is a more conservative interpretation that prevents the Jumper from overcommitting. **Both readings are valid; the perks-first reading is the more "intended" one based on the source's example.**

For this analysis, the perks-first reading is used. If you prefer the strict reading, all CP totals need to be adjusted downward to fit within the 1000cp Perks budget.

### §11.5 The "specific setting" trap

**Source text:** "If you choose, you can go to a specific setting that matches the theme or genre of a Level rather than a generic version. If that specific setting has a Jump, you do not use that Jump document, and nothing done in this Jump will carry over to the actual Jump for that setting."

**Trap:** If you substitute a real Jump's setting for a Level, you **lose the Body Mod conversion for the perks you bought in that Level.** The Body Mod Reward only applies to perks and items from GFJ; if you spent the Level's perks in a different Jump, those perks are subject to that Jump's rules, not GFJ's.

**Ruling:** Use the specific setting option only for settings that don't have a Jump, or for Jumps you don't plan to take. Otherwise, stick with generic settings to keep the Body Mod conversion.

### §11.6 The Tourist Origin's "discount on its other item"

**Source text:** "Each Origin gets one of its 100cp items for free, and a discount on its other item."

**The Tourist's items:**
- Camera (100cp)  EFree for Tourist ✁E- "Other item"  EThe Tourist's only Origin-tagged item is Camera. There is no "other item."

**Ruling:** The 50% discount on the Tourist's "other item" applies to a non-existent item. This is a minor source-text issue. In practice, the Tourist gets one free Item (Camera) and the other Items (Bare Necessities, Franchise) are full price.

### §11.7 The 10-Level "you can choose the order" reading

**Source text:** "You can do these Levels in any order you choose. A specific setting may fit more than one Level, but it only counts for one of them."

**Implication:** If a setting fits multiple Levels, you can use it for one Level only. So if you take the Star Wars setting for the Super Hero Level (lightsaber-wielding Jedi are super heroes), you can't also use it for the Science Fiction Level.

**Ruling:** Pick a Level order upfront. The setting-fitting-clause is a one-time choice.

### §11.8 The "Basic Requirements goes away" clause

**Source text:** "These abilities go away when you leave that Level and this perk goes away when you finish this jump. Nothing can be done to retain these abilities, but you do benefit from any practice, training, study, or actual use in the Level itself of any mundane skills."

**Ruling:** Basic Requirements explicitly vanishes post-Jump. Mundane skill gains from training/practice/use are kept. So a 10-Level Jumper who trains in 10 settings keeps 10 settings' worth of mundane skills.

The Body Mod Reward explicitly excludes Basic Requirements: "All perks and items from this jump (with the exception of Basic Requirements) are now considered part of your Body Mod."

### §11.9 The "memory persists?" ambiguity

**Source text:** The doc says you "acquire an identity that fits the setting, with all appropriate memories" at each Level. It does not say whether the 10 identities persist post-Jump, or whether they merge.

**Ruling:** The conservative reading is that the 10 identities are temporary cover identities that dissolve at Jump end. The perfect-memory perk (Seeing The Sights) is the cleanest way to preserve the experiences: take it, and you will remember all 10 identities in full detail even if the identities themselves don't persist.

The "they merge" reading is also valid  Eyou become a composite of 10 cover identities, drawing on each as needed. This is the "polymath Jumper" reading.

**Recommendation:** Take Seeing The Sights, All The Sights. The perk handles the memory preservation regardless of how the identities resolve.

### §11.10 The "you can combine similar items" rule

**Source text:** "You can combine similar items purchased from this Jump at no additional cost."

**Implication:** If you take Bare Necessities trust fund twice in one Jump, you don't pay 200cp for two trust funds  Eyou get one trust fund at the higher scaling. This is multiplicative: one purchase = $200K/yr, two purchases = $2M/yr, three purchases = $20M/yr, etc. (the "move the decimal point one space to the right" rule).

**Ruling:** Stacking is allowed at no cost. Optimize by taking the trust fund at the end of the Jump (after perks) to maximize CP efficiency.

### §11.11 The "any item can be taken multiple times" rule

**Source text:** "Any item can be taken multiple times, but 100cp Origin items are discounted instead of free after the first purchase."

**Ruling:** The Tourist's Camera is free the first time, then discounted (50% off? The source doesn't specify the discount rate) on subsequent purchases in future Jumps.

For Body-Mod-conversion purposes, you only need to take an Origin item once in GFJ to convert it. The "multiple times" clause is for future Jumps.

### §11.12 Interaction with other Generic jumps

**Question:** How does GFJ interact with other Generic jumps (Generic Jumpchain, Generic Second Jump, etc.)?

**Ruling:** Each Generic jump typically has its own Body Mod clause. If you take GFJ first, then Generic Jumpchain, the GFJ perks are already body-mod-converted. Generic Jumpchain's perks are then added to the body mod via its own clause. The two don't conflict.

**Trap:** Some Generic jumps may have a "Body Mod includes all perks from previous Generic jumps" clause that triggers a recursive conversion. This is desirable. The specifics depend on the other Generic jump.

**Recommendation:** Take GFJ as Jump 1, then other Generic jumps in any order. Each one adds to the body mod.

### §11.13 The "any monster, no matter what its type" clause

**Source text (Monster Bait):** "Any monster, no matter what its type, will consider you the perfect prey, and will target you over any other person."

**Edge case:** "Any monster, no matter what its type" is a very broad clause. Does this include "boss" monsters, named NPCs, supernatural beings, or just generic monsters? The source is silent.

**Ruling:** Interpret literally  E"any monster" means any monster, including named ones. The drawback is genuinely dangerous. Mitigate with Be Not Afraid (fear/mind immunity) + Secondary Superpowers (defensive buffs) + Run Like Hell (escape specialist).

### §11.14 The "Perks are discounted by 50% for their Origin" clause

**Source text:** "Perks are discounted by 50% for their Origin, and 100cp perks are free for their Origin."

**Re-read:** The Origin in this Jump is "The Tourist." So "their Origin" means The Tourist's perks. The line means:
- The Tourist's perks are 50% off
- 100cp Tourist perks are free for The Tourist

It does NOT mean "all perks in the doc are discounted for The Tourist." Only Tourist-tagged perks are discounted.

**Ruling:** Only Tourist perks get the discount. Level-specific perks (Horror, Military, etc.) are full price for The Tourist, even though The Tourist is the only Origin.

This is the source-text-strict reading. Some players extend the discount to all Origin-tagged perks (i.e., all perks in the doc, since The Tourist is the only Origin). The strict reading is more conservative and is what this analysis uses.

### §11.15 The "any time you do something memorable" Camera clause

**Source text (Camera):** "every time you do something memorable, noteworthy, or just wish to remember a moment in the future, you will receive a snapshot of the moment, framed at just the right size and from just the right angle."

**Edge case:** What counts as "memorable, noteworthy"? The source does not define these terms. The Camera's trigger is the Jumper's own judgment.

**Ruling:** Trigger liberally. If you think a moment is memorable, take the snapshot. The "or just wish to remember" clause gives the Jumper full control over the trigger.

### §11.16 The "any other form of income you receive ... can be added to the trust fund" clause

**Source text (Bare Necessities trust fund):** "Any other form of income you receive, including from other perks or items, can be added to the trust fund, and will also be completely legal with all taxes paid and documentation needed."

**Implication:** Income from other Body Mod perks (e.g., a future "Henchman Salary" perk) can be added to the trust fund, with all taxes paid. The trust fund becomes a chain-permanent wealth engine that incorporates all future income.

**Ruling:** This is a chain-economic-engine perk. Combined with the ÁE0 scaling on repurchase, a 7-repurchase Jumper has a $2 trillion/year trust fund that can absorb any other income. **This is the most economically broken single clause in the entire supplement set.**

---

## §12 Power Creep Assessment

GFJ is intentionally high-power. Its balancing factor is the 10-Level duration (1 year per Level, presumably) and the fact that most perks are "mundane-tier"  Eno superpowers except Cantrips (D&D 3.5 scale) and Secondary Superpowers (which doesn't grant powers, just enables them).

### §12.1 The balance mechanisms

1. **Mundane-tier perks.** Most GFJ perks are non-superpower. The Quick and the Dead grants "peak human" reaction time, not superhuman. The Tourist perks are meta-game, not combat. Be Not Afraid is immunity, not power. The only offensive perks are AIT, Fists of Justice, Student of War  Eall "trained human" tier.

2. **Cantrips only.** The Fantasy Level's magical perk is Cantrips, which is explicitly D&D 3.5 cantrip-scale (cleaning, light, etc.). No fireballs, no lightning bolts.

3. **Secondary Superpowers, not superpowers.** Super Hero's main perk is Secondary Superpowers, which doesn't grant powers  Eit makes future powers work properly.

4. **10-Level duration.** The 10 Levels are presumed to take 10 years (1 year per Level). That's a significant time investment.

5. **The "perks first, drawbacks balance" interpretation is required for over-spending.** The strict-reading players have a more balanced (less perk-intensive) build.

### §12.2 The unbalance mechanism: the Body Mod Reward

The Body Mod Reward is the killer. It says: **"All perks and items from this jump (with the exception of Basic Requirements) are now considered part of your Body Mod. You will still have them, even in Gauntlets or if you take a Power Loss Drawback."**

This single clause means:

1. **Every perk you take in GFJ is chain-permanent.** No more losing perks in Gauntlets. No more Power Loss drawbacks stripping you. Every perk is locked in.
2. **The combined effect is greater than the sum of parts.** 30 perks in GFJ = 30 chain-permanent buffs. That's massive.
3. **The CP efficiency is unprecedented.** 1000cp in a typical Jump = ~5-10 perks (depending on the doc). 1000cp in GFJ = 30+ perks (with drawback stacking). That's 3-6x the perk density.
4. **The Trust Fund's exponential scaling is unique.** No other Jump item scales like this. A 7-repurchase Jumper has a $2 trillion/year income.

**The Body Mod Reward is what makes GFJ broken.** The perks themselves are mundane-tier; the conversion is what makes them overpowered.

### §12.3 Comparison to Pokémon (the original first jump)

Pokémon (the original first-jump CYOA) gives you:
- A starter Pokémon
- 6 companion slots (for Pokémon or humans)
- 1000 CP
- Setting-specific perks (Trainer, Breeder, Researcher, Coordinator)
- No Body Mod Reward

Pokémon's perks are setting-specific and don't convert to body mod. The chain-permanent gains from Pokémon are the starter Pokémon (a permanent companion) and any items you buy.

GFJ's perks are generic (no setting dependency) and convert to body mod. The chain-permanent gains from GFJ are 30+ perks + 3 items.

**GFJ is strictly more powerful than Pokémon as a first jump.** The only Pokémon advantage is the starter Pokémon, which is a permanent companion (effectively a chain-permanent NPC) but is a single entity vs. GFJ's 30+ buffs.

### §12.4 Comparison to other Generic jumps

**Generic Jumpchain** (StompieLongStocking or similar):
- Multiple origins (more variety)
- Wider perk selection
- No Body Mod Reward (typically)
- 1000 CP base

**Generic Second Jump / Generic Third Jump** (continuation docs):
- Assume you've taken GFJ first
- Build on the body mod conversion
- Often have their own Body Mod clauses

**Generic Powers Supplement**:
- Power-level perks (not mundane-tier)
- Stacks well with GFJ's Secondary Superpowers

GFJ is the **most CP-efficient first jump** in the supplement set. Its 1000cp + 1800cp drawback potential + body mod conversion is unmatched. Other Generic jumps may have more variety, but they don't have the Body Mod conversion at this perk density.

### §12.5 The "is it game-breaking?" question

**Yes, in the context of a typical Jumpchain chain.** A Jumper who takes GFJ as Jump 1 and body-mod-converts 30+ perks starts the chain with a 30+ buff advantage over a Jumper who skips GFJ.

**No, in the context of supplement-stack Jumpers.** Supplement-stack Jumpers routinely take GFJ as part of their stack. The "balance" is that everyone who knows about GFJ takes it. The competitive advantage comes from supplement *combinations* (Body Mod + PRS + UDS), not from GFJ alone.

**The real power of GFJ is the supplement-stack foundation.** A Jumper who takes GFJ ↁEBody Mod ↁEPRS ↁEUDS has a complete supplement stack with chain-permanent buffs. That's the meta-build for serious Jumpchainers.

### §12.6 The "fair balance" clauses

The doc has several fair-balance clauses that prevent trivial abuse:

1. **Basic Requirements is excluded from body mod.** "All perks and items from this jump (with the exception of Basic Requirements) are now considered part of your Body Mod." The level-baseline abilities don't persist.

2. **Trust fund can be toggled off.** "This item follows you to all future jumps, adapting as needed, and can be toggled off for a jump." If you don't want the trust fund's wealth in a low-income setting, you can turn it off.

3. **Ride The Rails has a "once off, can't re-enable" clause.** "This can be toggled on or off, but once turned off, the butterfly effect may make a return to canon events impossible." The canon-preservation aura is toggleable but with a hard penalty.

4. **Camera doesn't actually grant a camera.** "You don't actually get a camera. Instead, every time you do something memorable, noteworthy, or just wish to remember a moment in the future, you will receive a snapshot of the moment." The "snapshot" is the perk, not the camera.

5. **Universal Translation requires anatomy.** "as long as you have the necessary anatomy." You can't speak whale-song without a whale's mouth.

6. **Three Sea Shells has a "if your life depends on it" exception.** The drawback is quality-of-life only, not lethal.

7. **Be Not Afraid only covers mind-bending, not physical death.** "You are immune to the mind-bending or destroying effects of eldritch abominations, are never impaired or disabled by fear, and are also immune to any form of spiritual corruption." It doesn't make you physically immortal.

These clauses prevent the most extreme abuse while keeping the perks useful.

### §12.7 The "is it good for narrative?" question

**Yes.** The 10-Level structure provides a meaningful first-jump narrative. The 10 identities are a rich backstory. The Tourist framing ("in it for the experience") is a strong character motivation. The Body Mod Reward is a satisfying capstone. The drawbacks (especially Monster Bait, Bandits, Siege At Jumper Fortress) provide real narrative tension.

GFJ is one of the few Generic jumps that supports both min-max optimization AND narrative depth.

### §12.8 The "is it good for long chains?" question

**Yes, especially for long chains.** The Tourist perks (Road Goes Ever On, Seeing The Sights, Ride The Rails) are explicitly designed for long-chain play:
- Road Goes Ever On: eternity readiness
- Seeing The Sights: perfect memory across centuries
- Ride The Rails: canon preservation for plot-dependent jumps

Plus the body mod conversion ensures every perk persists across the entire chain.

For a 100+ Jump chain, GFJ's Tourist core is the most valuable set of perks you can take in Jump 1.

---

## §13 Cross-Supplement Synergy Hooks

This section maps GFJ's interactions with the other 4 supplements in the analysis set.

### §13.1 GFJ ↁEEssential Body Mod (EBM)

**EBM provides:** the Jumper's physical/spiritual baseline (body, soul, perks storage, etc.)

**GFJ provides:** 33 body-mod-convertible perks + 3 items

**Synergy:** GFJ's perks become the *content* of EBM's body. EBM provides the *framework*; GFJ provides the *stuff*. Take EBM after GFJ (or together if your supplement stack allows it) so that GFJ's perks attach to EBM's body structure.

**Key interaction:** EBM's "perks storage" clause typically says "all perks from all Jumps attach to your Body Mod." GFJ's "Body Mod Reward" clause says the same. The two clauses stack  EGFJ perks are body-mod-locked by both GFJ and EBM.

### §13.2 GFJ ↁESB Body Mod (SBBM)

**SBBM provides:** an alternative body mod framework, often with more detail than EBM (Stamina, Strength, etc.)

**Synergy:** Same as EBM. GFJ's perks attach to SBBM's body. The choice between EBM and SBBM is a structural preference; the GFJ perks work with either.

**Key interaction:** SBBM may have specific slot counts or attribute caps that GFJ's perks can fill. For example, if SBBM has a "skills" slot, Expertise (100cp) and Class Skills (100cp) fill those slots.

### §13.3 GFJ ↁEPersonal Reality Supplement (PRS)

**PRS provides:** the Jumper's personal dimension/spaces (Warehouse extension, personal realm, etc.)

**Synergy:** GFJ's Trust Fund is a personal-reality-adjacent item (chain-permanent wealth). GFJ's Camera is a personal-reality-adjacent item (chain-permanent memory storage). GFJ's Instant Access capstone provides Warehouse access, which integrates with PRS's Warehouse extension.

**Key interaction:** PRS may have a "personal realm" that includes your body mod. GFJ's body mod conversion means the personal realm includes your 33 buffs. This is a chain-permanent stacking effect.

### §13.4 GFJ ↁEUniversal Drawbacks Supplement (UDS)

**UDS provides:** universal drawbacks that apply across all jumps (Power Loss, Gauntlet, etc.)

**Synergy:** GFJ's Body Mod Reward explicitly counters UDS's "Power Loss Drawback": "You will still have them, even in Gauntlets or if you take a Power Loss Drawback." GFJ's perks are UDS-immune.

This is the most important synergy: **GFJ is the UDS-counter.** A Jumper who has taken GFJ and body-mod-converted perks can take UDS's Power Loss drawback and keep all their GFJ perks. The two are designed to stack.

**Key interaction:** UDS's Gauntlets clause is also countered by GFJ's "even in Gauntlets" clause. A GFJ-boosted Jumper can take UDS's Gauntlet drawbacks without losing any GFJ perks.

### §13.5 The canonical supplement-stack bootstrap order

The recommended order for taking the 5 supplements:

1. **GFJ first** (Jump 1)  Eprovides the perks/items
2. **Body Mod** (or EBM or SBBM)  Eprovides the structural framework
3. **PRS**  Eprovides the personal spaces
4. **UDS**  Eprovides the cross-jump drawback engine

The order is important: GFJ first because the Body Mod Reward needs to fire at the end of GFJ. Body Mod second because the GFJ perks attach to it. PRS third because the personal realm builds on the body mod. UDS fourth because the UDS drawbacks stack on the body mod.

**Alternative order (PRS first):** Some players take PRS first to establish the personal realm, then Body Mod, then GFJ. This works if your PRS has a "perks from future Jumps attach here" clause. The GFJ perks then attach to the PRS via the Body Mod Reward.

**The "supplement stack" timeline:**
- Jump 1: GFJ ↁEBody Mod Reward fires
- Jump 2-5: Body Mod + PRS attached
- Jump 6+: UDS attached, full stack active

### §13.6 The "Body Mod First" key hook

The most important cross-supplement insight: **GFJ is the canonical way to bootstrap your supplement stack** because:

1. It's a first jump (no setting consequences, low stakes).
2. It has 10 Levels (long enough to be meaningful, short enough to complete).
3. It has the Body Mod Reward (the supplement-stack enabler).
4. It has a +200cp Items stipend (so you can afford items).
5. It has unlimited drawback stacking (so you can buy every perk you want).
6. It has the Tourist origin with three powerful discounted perks.
7. It has the Body Like A Jumper / Mind Like A Jumper free perks (clean baseline).
8. It has Common Sense (Benefactor-punish detection) which is unique.

A Jumper who skips GFJ in favor of another first jump misses the Body Mod Reward. A Jumper who takes GFJ but skips the Body Mod conversion (e.g., by using the "specific setting" option for all 10 Levels) misses the body mod too. **The optimal play is to take GFJ as Jump 1 with generic settings, complete all 10 Levels, and let the Body Mod Reward fire.**

### §13.7 The "supplement mode" reading

**Source text:** None (see §11.2)

**Community reading:** GFJ is treated as a supplement in modern Jumpchain play. The 1000cp is a "supplement budget" added on top of the typical first-jump budget, and the Body Mod Reward is the "supplement benefit" that ties everything together.

**Practical effect:** The supplement-mode reading means:
- Take GFJ as Jump 1 (or as a supplement to your real Jump 1).
- Apply the Body Mod conversion at the end.
- Use the converted perks as the foundation for the rest of the chain.

### §13.8 The "death doesn't end chain" hook (absent rule)

**Source text:** None (see §11.1)

**Community reading:** Many Jumpchain players assert that first jumps don't kill you ("death doesn't end the chain"). This is a meta-convention, not a doc rule.

**Practical effect:** If you assume the meta-convention, GFJ is risk-free. If you don't, GFJ is a real Jump with real dangers (especially with Monster Bait + Horror).

**Recommendation:** If you want the meta-convention, layer it as a house rule. If you don't, take defensive perks (Be Not Afraid, Screw the Devil) and avoid Monster Bait.

### §13.9 The 10-Level + 10-identity narrative hook

The 10 Levels give the Jumper a 10-identity backstory. This is a narrative hook that other supplements can build on:

- Body Mod can have a "10-identity memory" feature.
- PRS can have a "10-setting archive" feature.
- The Jumper can roleplay as a composite of 10 cover identities.

This is a soft synergy  Eit doesn't grant mechanical benefits, but it provides narrative depth.

### §13.10 The Trust Fund + UDS economic hook

The Trust Fund's exponential scaling + UDS's cross-jump drawback engine = a Jumper who can afford any UDS drawback's CP cost. The Trust Fund provides the wealth; UDS provides the spending opportunities.

**Practical effect:** A Jumper with a 7-repurchase Trust Fund ($2 trillion/year) can take every UDS drawback without worrying about the CP cost. The economic hook is unique to GFJ.

### §13.11 The "20 supplements" stack

In extreme supplement-stack play, a Jumper takes 20+ supplements in addition to a typical first jump. GFJ is usually one of the first 5 (the "supplement core"). The other supplements (Generic Powers, Generic Magic, etc.) build on the GFJ foundation.

**The supplement core (5 supplements):**
1. **GFJ**  Efirst jump + body mod conversion
2. **Body Mod**  Estructural framework
3. **PRS**  Epersonal spaces
4. **UDS**  Ecross-jump drawbacks
5. **One of the Body Mods (EBM or SBBM)**  Ealternate body mod

The supplement core is the "minimum viable supplement stack." A Jumper with the supplement core has a chain-permanent body mod, personal realm, and cross-jump drawback engine.

### §13.12 Summary: GFJ's role in the supplement ecosystem

GFJ is **the entry point** of the supplement stack. It's where the Jumper goes first, where the Body Mod Reward fires, and where the chain-permanent buffs originate. The other supplements (Body Mod, PRS, UDS) build on the GFJ foundation.

**The chain of dependencies:**
- GFJ ↁEBody Mod (GFJ's perks attach to Body Mod)
- Body Mod ↁEPRS (PRS's personal realm is built around the body mod)
- PRS ↁEUDS (UDS's cross-jump drawbacks are housed in the personal realm)
- UDS ↁEall future Jumps (UDS applies everywhere)

GFJ is the **first domino**. Without it, the supplement stack is much weaker.

---

## Appendix A: Full Option Count Summary

**Total options: 56 unique (counting dual-cost items as one each), 58 tier rows (with the free/trust-fund Bare Necessities counted as separate rows for granular tier placement).**

| Category | Unique options | Tier rows | Tier breakdown |
|----------|----------------|-----------|----------------|
| Perks (General) | 12 | 12 | 4 S, 4 A, 3 B, 1 C |
| Perks (Tourist) | 3 | 3 | 3 S, 0 A, 0 B, 0 C |
| Perks (Level-specific) | 18 | 18 | 5 S, 4 A, 5 B, 4 C |
| Items | 3 | 4 | 1 S, 2 A, 1 B |
| Drawbacks (General) | 1 | 1 | 0 S, 1 A, 0 B, 0 C |
| Drawbacks (Level-specific) | 17 | 17 | 1 S, 5 A, 7 B, 4 C |
| End Choices (Free capstones) | 2 | 2 | 2 S, 0 A, 0 B, 0 C |
| **Total** | **56** | **58** | **16 S, 19 A, 15 B, 8 C** |

**Final tier distribution (58 rows):**

| Tier | Count | % of total |
|------|-------|------------|
| S | 16 | 28% |
| A | 19 | 33% |
| B | 15 | 26% |
| C | 8 | 14% |
| D | 0 | 0% |
| F | 0 | 0% |
| **Total** | **58** | **100%** |

(Note: dual-cost items Bare Necessities counted as 2 rows. General Knowledge base+upgrade counted as 2 rows.)

---

## Appendix B: Quick-Reference Cross-Reference

For the other 4 supplement analyses:

- **Essential Body Mod (EBM)**: provides the body-mod framework that GFJ perks attach to. Synergy: see §13.1.
- **SB Body Mod (SBBM)**: alternative body-mod framework. Synergy: see §13.2.
- **Personal Reality Supplement (PRS)**: personal spaces. Synergy: see §13.3.
- **Universal Drawbacks Supplement (UDS)**: cross-jump drawbacks. Synergy: see §13.4.

**The canonical stack order:** GFJ ↁEEBM (or SBBM) ↁEPRS ↁEUDS. See §13.5.

**The "Body Mod First" key insight:** GFJ is the canonical way to bootstrap your supplement stack. See §13.6.

---

## Appendix C: Source Verification Notes

Three things commonly attributed to GFJ are NOT in v1.1's source text and are flagged as community conventions:

1. **"Death doesn't end chain"**  ENOT in source. See §11.1.
2. **"Supplement mode" / cross-jump stacking**  ENOT in source as "supplement." The Body Mod Reward achieves this implicitly. See §11.2.
3. **Items +200cp stipend**  Ecould be bonus, separate budget, or hybrid. Source-ledger reading: separate budget. See §11.3.

The analysis honors these as community readings and notes the ambiguity honestly. For the cross-supplement synergy work, these conventions are assumed to be the operating interpretation.
