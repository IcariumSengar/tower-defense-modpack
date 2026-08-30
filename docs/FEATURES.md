# Features

Concrete feature designs — things that have moved past raw brainstorming
into an actual spec, whether built already or ready to build. Split out
from [docs/IDEAS.md](IDEAS.md) on 2026-08-30 because that file had grown
to 3000+ lines of stacked addendums and was no longer usable as a
working notepad.

**How this differs from IDEAS.md**: IDEAS.md is the notepad — raw,
unrefined, "things to think about," not necessarily decided. This file
is the spec layer — what a feature actually *is*, once it's been
decided or drafted into something buildable. Each entry here is a
current-state description, not a chat transcript of how the design
evolved — for the blow-by-blow implementation history (bugs found,
rounds of tuning), see [docs/MODS.md](MODS.md), which tracks that in
detail already.

**How this differs from MODS.md**: MODS.md is the build log — mods
added/removed and the "Custom glue" implementation notes, written from
the implementer's side. This file is written from the design side —
what the feature is for and how it's meant to work — and points at
MODS.md for the implementation history rather than duplicating it.

Status tags used below: **live** (built and part of the current pack),
**planned** (fully designed, not built yet), **retired** (built, then
deliberately removed — kept here so it doesn't get re-proposed blind).

---

## Core loop

**Wave Horn** — *live*. Right-click `kubejs:wave_horn` (auto-given at
first spawn) to summon the next wave on demand rather than waiting for
one to find you. Deterministic 8-wave campaign (vanilla mobs + TFTH
mobs from wave 2 on), each wave adding a tougher composition on top of
the last. Mobs spawn genuinely beyond the worldborder and walk in (not
near the player), with staggered emergence (gaps shrinking from 16
ticks at wave 1 to a 4-tick floor by wave 8) and a positioned sound cue
~0.6s before each spawn. Forces night + freezes the daylight cycle for
the wave's duration so undead mobs don't burn. Refuses to re-summon
while mobs from the current wave are still alive. A 3-minute countdown
to the next wave starts automatically once a wave clears (see below);
using the horn manually during the countdown skips the wait.
Implementation: `wave_spawner.js`, `wave_status.js`.

**Loot bags** — *live*. Kills drop tiered bags — Scavenger's Bag
(Common, 50%), Fortified Cache (Uncommon, 25%), Warlord's Hoard (Rare,
10%) — keyed to which wave a mob's type first appears in, not to a
generic "enemy type" scheme. Right-click to open for a randomized set
of vanilla materials; deliberately vanilla-materials-only, no invented
items, to preserve the Minecraft aesthetic. Common pool includes
base-building staples (cobblestone, oak logs, bread, cooked beef,
apple) alongside scrap, so a fresh base has essentials covered before
scrap starts mattering. **Standing rule**: rarity must drive both drop
rate (common bag = common drop) and enemy-tier gating (a common mob can
never roll a rare bag) — this was inverted once and fixed, don't
reintroduce the inversion. Real textures exist for all three tiers.
Implementation: `loot_bags.js`, `loot_bag_drops.js`, `loot_bag_open.js`.

**Base expansion** — *live*. The worldborder grows 5 blocks every 2
waves cleared, auto-set to 50 on world creation, centered on the fixed
spawn point. Mob spawn positions are clamped to stay within the current
border. This is the "custom world" idea's first-step scope — no
separate custom dimension, no hand-built structure, just the border
mechanic itself. Implementation: `base_expansion.js`.

**Starter gear as narrative** — *live*. The starting netherite sword +
iron armor are framed as looted from the base's previous, unfortunate
occupant, tagged with `td_starter_gear` NBT so removal logic can target
exactly these items and not anything crafted/looted since. They
disappear permanently at a **fixed wave 5** — deliberately decoupled
from the campaign's total length (`FINAL_WAVE`, currently 8), since
these are two different concepts that only coincided when the campaign
itself happened to be 5 waves long. On removal: an on-screen title
("IT'S UP TO YOU NOW") plus chat flavor text about the previous
occupant. Implementation: `wave_status.js` (`GEAR_REMOVAL_WAVE`
constant), gear tagged in `playtest_starter_kit.js`.

**Countdown timer** — *live*. After a wave clears, a 3-minute countdown
to the next wave displays on the action bar and auto-starts the next
wave when it hits zero; using the horn manually at any point cancels it
and starts immediately. Gives urgency without removing player agency.
Implementation: display/auto-trigger in `wave_spawner.js`, started in
`wave_status.js`.

---

## Base & structures

**Starting base ("The Watchpost")** — *live, partially built*. Fixed
spawn point (`/setworldspawn` + `gamerule spawnRadius 0`), a small
walled compound built via `/fill` on first login. Current build:
- **Chokepoint perimeter** — full-height walls in SecurityCraft
  reinforced blocks (`reinforced_cobblestone` primary, mossy/cracked
  variants scattered for a weathered look), with one gate (plain
  vanilla door — SecurityCraft's own lockable door was considered and
  rejected as unnecessary complexity for a singleplayer pack). Chosen
  specifically because Epic Siege Mod's zombies dig/pillar through
  plain blocks; reinforced blocks resist that (reasoned from both
  mods' decompiled bytecode, not yet confirmed in a real fight).
  **Known, accepted gap**: wall height (3 blocks) doesn't stop a
  zombie pillaring its own blocks up and over the top — raised and
  explicitly accepted as a difficulty factor, not a bug to fix.
- **Watchtower** (phase 1 of "expand into multiple buildings") — a
  cobblestone pillar north of the base, external ladder, 5x5 platform
  with a parapet gap at the ladder — deliberately open on all sides
  since mobs can approach from any border edge, not just one direction.
- Design intent for the full concept (not all built): a single-room
  shack (narrative home of the previous occupant), the watchtower
  overlooking the chokepoint gate specifically, a pedestal near the
  entrance reserved for the amulet mechanic (see Ideas), a well styled
  to match vanilla's own desert well. Decoration pass (ZCraft: Zone
  Decor + Doomsday Decoration props) planned as a later, separate step
  once those mods are installed — not blocking the base structure
  itself.

**World type** — *live*. Every world forces a **flat, desert-biome**
generator via a datapack override
(`kubejs/data/minecraft/dimension/overworld.json`), regardless of what's
picked on the world-creation screen. History: was flat/plains by
default, briefly switched to real terrain (Single Biome: Desert, `noise`
generator) for a non-flat, structure-populated world, reverted the same
day — real terrain "read as wonky, didn't suit the gameplay." Switched
to flat + desert-biome (2026-08-30) — a different, lower-risk
combination than the noise-based attempt, since flatness and biome are
independent settings in the same generator config; this keeps the world
exactly as flat as it's always been while making desert-tagged
structures/mods relevant. See "Structure generation / exploration
content" below for what that unlocked. **Not yet confirmed in-game.**

**Base expansion into rooms/corridors** — *planned, not built*. Goal:
gather materials, activate something, and a new room/corridor gets
built onto the starting structure automatically. Decided approach:
**Create's standalone Schematicannon mod** (not full Create — a real
extraction that ships just the Schematicannon/Schematic-and-Quill/
Schematic Table/clipboard, confirmed Forge 1.20.1). Survival-native
(no creative-mode restriction, no colonist dependency, unlike the
Structurize-based plan this superseded). Direction chosen: **curated
schematics found while exploring**, not player-designed freeform — the
pack author scans/finalizes each room design once, ships the finished
schematic as a lootable item placed in structure loot tables (same
LootJS mechanism already used for loot bags, targeting structure/chest
loot tables instead of entity-kill drops — exact method name to
confirm against LootJS's source before writing it). This directly ties
into the exploration/structure-generation plan below: schematics become
one of the things worth finding out there. Still needs: confirming a
finished schematic's NBT shape for loot-table placement, and the
material-check-then-place trigger logic (custom KubeJS glue — no mod
does the "check materials, consume them, build" gate on its own).

**Structure generation / exploration content** — *live* (2026-08-30),
**not yet confirmed in-game**. Goal: real structures to explore,
including actual treasure (not just decoration), tied into the
border-expansion mechanic (structures become reachable as the border
grows, but growing the border doesn't *cause* generation — chunks
generate on approach the normal way, same as any vanilla exploration).
- **Biome swap**: flat generator's biome changed to `minecraft:desert`,
  `type: flat` unchanged — flatness and biome are independent settings,
  so this avoids the "wonky" complaint the earlier noise-based Desert
  attempt got, while making desert-tagged structures/mods relevant.
- **Vanilla desert structures (temples, wells) should generate** —
  reasoned, not yet observed in-game: the flat generator's `features`
  flag only suppresses decorative placed-features, not structures;
  `structure_overrides` defaults to "all structure sets" when unset
  (confirmed from the vanilla Superflat/Settings docs), and this pack's
  `overworld.json` doesn't set that key, so nothing is excluding
  vanilla desert structures by default.
- **"Superflat Structures" insurance mod turned out not to exist for
  this version** — checked three candidates (Superflat Structures,
  Superflat Features and Structures, FlatEdit+), all Forge 1.20.1
  absent (NeoForge/1.21+ only). Compensated by directly decompiling
  each installed structure mod below and grepping for
  flat/superflat-specific disable logic instead of relying on a missing
  safety net — none found in any of them.
- **Mod picks, one dropped from the original plan on hard evidence**:
  - **YUNG's Better Desert Temples** + its **YUNG's API** dependency —
    installed. Enhances vanilla's own Desert Temple, no own
    biome/generator, no flat-world references anywhere in its jar.
  - **Treasure2** + its **GottschCore** dependency — installed.
    Confirmed directly from its own structure JSONs that its desert
    ruins and wishing well structures use a `#treasure2:wells_desert`
    biome tag that explicitly includes `minecraft:desert` (plus
    optional Biomes O' Plenty/BWG desert-biome-mod hooks), and its
    general surface/dungeon structures inherit that same tag via
    `#treasure2:terranean` — real treasure content that will actually
    place in this specific desert world, not just decoration.
  - **Abandoned Structures — NOT installed, confirmed wrong fit.**
    Checked its own structure JSONs directly: all 4 structures
    (gas_station, house1, house2, tower) are restricted to
    plains/snowy_plains/sunflower_plains/badlands/savanna/forest-family
    biomes — **none of them list `desert`**. In a world that's
    uniformly desert biome everywhere, none of this mod's content could
    ever generate regardless of any other setting. A real, decisive
    disqualification found by checking the mod's own data, not a gap
    left for later.
  - Still deliberately not picked: **Repurposed Structures** (confirmed
    flat-generator conflict) and **Lost Cities** (ships its own
    world/chunk generator — same risk category that already caused real
    problems with Oculus/shaders and the earlier Desert attempt).
- Structure loot stays a separate channel from the mob-drop loot bags —
  deliberate, not an oversight; both YUNG's and Treasure2 promise
  better-than-vanilla native loot by design, so no custom LootJS
  structure-loot injection was needed as a first pass.

---

## Defense

**Tier 1 defenses** — *live*. Originally three hand-built custom
pieces (Wooden Palisade, Snare Trap, Spike Trap with a degrade-and-break
mechanic) — replaced entirely 2026-08-29 after real playtest feedback
("rubbish... they sucked"), per an explicit preference for mods over
custom code. Current build:
- **Spikes** and **Bear Trap** from **Trapcraft** (Forge 1.20.1) —
  both use materials already in the Common-tier loot pool natively (5x
  iron_ingot; iron_ingot + stone_pressure_plate), no re-recipe needed.
- **Wooden wall role**: plain vanilla `minecraft:oak_fence` — Trapcraft
  has no wall/fence-shaping block at all, and a plain vanilla fence was
  judged a better fit than forcing a mismatched Trapcraft item into
  that slot. This is the intended outcome, not a gap to revisit.
- Trapcraft's redstone-dependent traps (fan, igniter, magnetic chest)
  are deliberately left out of Tier 1 and unwired for now, since Tier 1
  is specifically "no power, no fuel."
- Not yet confirmed to actually feel better in a real playtest — that's
  the real bar here, given what they replaced failed on feel
  specifically, not just function.

**Machine progression (Tier 2-4)** — see IDEAS.md, not designed in
detail yet beyond the original tier concept (semi-automated → powered →
elite). Depends on the power system, also undesigned.

---

## Quest book

**FTB Quests — "Basics" chapter** — *live*, 10-quest onboarding chain
plus the pre-existing "Fortify" quest folded in as step 7 via a
cross-chapter dependency (FTB Quests supports this natively by ID).
Linear, one quest unlocking the next:

| # | Quest | Task | Reward |
|---|---|---|---|
| 1 | You're On Your Own | Checkmark | 2 XP levels |
| 2 | Borrowed Time | Checkmark | 2 XP levels |
| 3 | Sound the Horn | Checkmark | 4x cobblestone + 4x oak_log |
| 4 | Thin the Horde | Kill 5x zombie | 3 XP levels |
| 5 | Spoils of War | Hold a Scavenger's Bag | — |
| 6 | Open It | Checkmark | 3 XP levels |
| 7 | Fortify *(pre-existing)* | Craft `trapcraft:spikes` | — |
| 8 | Watch the Walls Grow | Checkmark | 3 XP levels |
| 9 | The Reckoning | Checkmark (manual, after wave 5 gear removal) | — |
| 10 | No Turning Back | Checkmark | — |

Final flavor text (found-diary voice, matched against the wave-5
gear-removal text as the tone benchmark) is live for all 10, including
an optional rewrite of Fortify's own text for tonal consistency:

1. *"If you're reading this, they didn't make it. Doesn't matter who
   they were. What matters is this: the walls are still standing, the
   horn still works, and the desert doesn't care either way. Get
   moving."*
2. *"Notice the notches in that blade? Someone put those there fighting
   for this exact patch of dirt. The armor's dented in places that
   matter. None of it was made for you — it was made to last just long
   enough for whoever's holding it. Don't get comfortable."*
3. *"Out here, waiting is worse than fighting. The horn doesn't summon
   anything that wasn't already coming — it just decides when. Better
   you pick the hour than the dark does."*
4. *"Count doesn't matter until it's zero. Five isn't a milestone, it's
   a start — the desert's got more where these came from, and it isn't
   running out before you do."*
5. *"Strip what you can off anything that stops moving. Whatever's
   left in their pockets is worth more to you now than it ever was to
   them."*
6. *"A sealed bag is just extra weight. Open it before you decide it
   wasn't worth carrying."*
7. *"The dead didn't just leave gear behind — some of them left
   know-how. Turn scrap into something with teeth. Spikes don't ask
   questions, and they don't get tired."*
8. *"Every wall you're not standing behind yet is still just desert.
   Clear what's in front of you and the line moves — more ground to
   hold, more reasons it might not hold."*
9. *"Five waves. That's the whole story of whoever came before — start
   to finish, blade to dust. You've matched them. Now you get to find
   out what happens after the story usually ends."*
10. *"Eight is where the map runs out. Nobody wrote down what comes
    after, because nobody who saw it lived to write it down. From here
    it's the same night, over and over, until it isn't. How long you
    last is the only story left to tell."*

**Real bug worth remembering**: Fortify originally used a `#`-prefixed
tag reference as its item-task target, which FTB Quests' ItemTask
parses as a literal ResourceLocation and throws on — this **hard-crashed
the game on every single launch**, not a soft failure. Fixed by
targeting `trapcraft:spikes` directly. Avoid tag syntax in FTB Quests
item tasks unless it's confirmed supported.

**No dedicated FTB Quests SNBT-authoring tool/skill exists in this
environment** — checked twice, confirmed absent both times. All SNBT
so far has been hand-authored from the mod's own decompiled task
classes plus real shipped quest files (ATM10/Enigmatica6 on GitHub) as
reference, not guessed and not from an assumed tool.

Fuller quest book plan (Loot Tiers / Map Expansion / Shop chapters,
FTB Quests trade-quest or QuestShop-based shop) is still just a vision,
not scoped — see IDEAS.md.

---

## Tried and explicitly retired

Kept here so these don't get re-proposed blind — each was built, given
real effort, and deliberately removed on direct feedback, not because
it was buggy or unfinished.

**Shaders (Oculus + Spooklementary)** — *retired*, twice. Eleven
tuning rounds (version-crash fix, brightness/shadow saga, isolating the
fix to the shader's own intended lever, removing real-time shadows
outright) all landed on a technically-defensible state, but the verdict
was about the shader's whole aesthetic, not any remaining number ("im
just not feeling the whole shader feel now"). A `minecraft:darkness`
vanilla-effect alternative was tried the same day as a replacement —
also didn't work, dropped without much post-mortem needed beyond "the
Warden effect didn't work."

**All fog** (border proximity fog + wave-time combat fog, via
YetGamer's Custom Fog) — *retired*. Removed per direct request ("remove
any visual effects work, like fog etc, and go back to basics"), taking
Blood Moon's only real features (denser fog + a distinct title) down
with it. Night-lock (forced night during a wave) is the only atmosphere
effect left standing — a gameplay necessity (undead mobs burning),
not a visual effect, so it stayed.

**Roguelike permanent-buff choice popup** — *retired*. A `/tellraw`
clickable-chat-menu implementation never reliably resolved the
click-detection, which left a flag permanently stuck and silently
blocked the Wave Horn *and* the countdown timer from ever working again
— one buggy feature, three symptoms. Removed entirely rather than
patched. If revisited: a real GUI (not chat) was researched as the
fix — see IDEAS.md's "revisiting the popup" note for the villager-trade
and custom-Menu leads, both unverified, neither built.

**Inventory Profiles Next** (+ libIPN + Kotlin for Forge) — *retired*,
twice, for footprint/unresolved-bugs reasons (a swipe-gesture conflict
with Mouse Tweaks, a separate hover-highlight bug) against a "keep
footprint small" pack that doesn't strictly need it. Mouse Tweaks alone
still covers basic inventory management.

---

## Cross-cutting patterns worth reusing

**Structure placement at a triggered location** — the same underlying
operation (`/place template`, gated by some watched condition) recurs
across: the fixed spawn building, base-expansion content placement,
lootable structures, and the Schematicannon room-expansion feature.
None of the "stamp a structure down" mechanics need separate designs
per feature — only the template and trigger condition differ.

**Wave-clear state as a trigger point** — `wave_status.js`'s
`td_inWave`/`td_waveNumber` flags are the proven detection point for
"something happens on wave N / wave clear," already used by base
expansion and the starter-gear removal. Any future wave-clear-tied
idea should hook the same flags rather than re-deriving detection
logic.

**Custom right-click items** — the Wave Horn's nine real bugs (Goat
Horn's hidden cooldown blocking the event entirely, wrong command
permission, a same-tick-processing false lead, `const`/`let`
"redeclaration" in repeated callbacks needing `var`, `event.level
.isClientSide` throwing unconditionally, both `ItemEvents.rightClicked`
and `BlockEvents.rightClicked` firing for one click, bare `.x/.y/.z`
producing `NaN`, `Math.PI` itself producing `NaN`) are the standing
checklist for any future custom right-click item or entity-stepped-on
block in this codebase — see `docs/MODS.md`'s Wave Horn entry for the
full detail on each.

**Prefer a mod's mechanic wholesale over hand-building it**, when one
genuinely does the specific job — that's where custom code actually
shrinks (nothing equivalent needs hand-building), versus using a mod
only as a texture/reskin source. Weigh it against the pack's "keep
footprint small" principle each time; it's not a blanket rule (the Wave
Horn's curated deterministic campaign and Tier 1's degrade mechanic —
before the Trapcraft swap — were both custom by genuine necessity, not
oversight, at the time). Verify a candidate mod actually does the
specific mechanic needed before installing it on the strength of its
name or download count alone (Simple Spikes' 1.20.1 build, Gravemist's
1.20.1 availability, and MineTraps' current Forge target all turned out
to not be what search results implied).
