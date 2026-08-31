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

**Investigated and decided against 2026-08-30: don't hand off scaling to
Pure Suffering.** The plan was to use Pure Suffering's built-in tiered
escalation as the scaling backend for "a huge number of waves" with
real, indefinite escalation (count/toughness/speed), with the Wave Horn
as a thin trigger calling `/puresuffering add primary ... set <severity>`.
Checked directly against the actual pinned source (cloned the mod's
`1.20.1` branch at tag `1.6.8.5R-LTS1`, matching our exact installed
version — not a newer branch, which would have been a repeat of the
noise-generator mistake of verifying against the wrong version):

1. **Severity is fully controllable, better than assumed.** `/puresuffering
   add primary <session> <difficulty> <type> set <severity>` takes an
   explicit severity 1-N directly (`AddInvasionsCommand`) — no dependency
   on real in-game days. That part of the plan checks out cleanly.
2. **Correction to the record: there is no in-invasion ramp.** Each
   invasion type's "5 stages" (confirmed exactly 5 in every
   `invasion_types/*.json`, e.g. `zombie.json`) are 5 separate
   hand-authored `SeverityInfo` presets — mob cap, spawn tick delay, and
   roster all fixed at whichever severity you pick when the invasion is
   created (`Invasion.java`'s `severity` field, set once in the
   constructor, never changed by `tick()`). It doesn't escalate on its
   own during a single invasion; we would drive escalation ourselves by
   commanding a higher severity number as waves climb — this is actually
   simpler than a "ramp," not a problem.
3. **Real, structural blocker: mob positioning.** `Invasion.getMobSpawnPos`
   always picks a spawn point within `mobSpawnChunkRadius` chunks of the
   player's *current chunk* (game rule, config range 1-8, default 8 ≈ up
   to 128 blocks), excluding only a minimum-distance ring around the
   player (`noSpawnMobsBlockRadius`, config range 1-256, default 16
   blocks). This is entirely player-distance-based and has no concept of
   the worldborder at all — there's no config path to "spawn just beyond
   the border." Worse, the two radii fight each other: pushing
   `noSpawnMobsBlockRadius` out far enough to clear our worldborder (which
   starts well under 128 blocks) shrinks the valid spawn ring toward zero
   and starves spawning. Using Pure Suffering as the mob source would mean
   giving up the already-tuned "spawn beyond the border, walk in with
   staggered sound cues" system in `wave_spawner.js`
   (`randomBorderEdgePosition()`) — not a compatibility risk to mitigate,
   a straight either/or.
4. Checked the mixins it applies (`MobMixin`, `SensorMixin`, etc.) for
   collision with `mob_aggro.js`'s forced `setTarget()` or Epic Siege
   Mod's AI changes — `MobMixin` only adds synced hyper-charge data via
   `@Inject(at = @At("RETURN"))`, purely additive, no override risk. This
   part was never the blocker.

**Net call**: severity control and the escalation-preset idea are sound
and worth keeping as inspiration, but the positioning system is a
hard architectural mismatch with the border-edge spawn staging this pack
is built around, not a tunable detail — reusing Pure Suffering's own
spawning would mean throwing out the "walk in from beyond the border"
feel entirely. Falling back to hand-building the scaling formula instead
— see the "Endless phase scaling" entry immediately below, which
supersedes `docs/deferred/night_scaling.js`'s approach rather than
reviving it as-is (wave-number-keyed and scoped to wave-spawned mobs via
the existing per-mob summon NBT, not a global `EntityEvents.spawned`
hook keyed to real day/night count) — keeping `wave_spawner.js`'s own
spawn-position system untouched either way.

**Endless phase scaling (waves 9+) — planned, designed 2026-08-30, not
yet built.** Direct request: real, indefinite escalation in count,
toughness, and speed so a player who reaches "a huge number of waves"
is always hard-pressed, not coasting on wave 8's composition forever.
Today, `wave_spawner.js`'s `WAVES` array only defines 8 hand-authored
waves; `Math.min(waveNumber, WAVES.length)` silently repeats wave 8's
exact composition for every wave after that — no scaling exists past
the designed campaign at all. Waves 1-8 stay exactly as they are (that's
the narrative-driven tutorial arc, not something to touch); this only
adds a procedural phase once `waveNumber > FINAL_WAVE` (8).

Three separate formulas, one per axis, `endlessWave = waveNumber - FINAL_WAVE`
(1, 2, 3, ... starting at real wave 9) — deliberately split rather than
one combined "difficulty" number, so each axis can be retuned
independently after playtesting, same as every other formula in this
codebase (`staggerGapForWave`, the worldborder growth curve):

- **Mob count — capped, this is the performance-safety axis.**
  `totalMobs(w) = min(20, 6 + floor(w / 2))` — +1 mob every 2 endless
  waves on top of wave 8's baseline of 6, hard-capped at 20 (reached
  around endless wave 28, real wave 36). Count is the one axis that
  actually costs server tick time (this is exactly the load Radium/
  Entity Culling/Clumps were justified for in MODS.md), so it's the only
  one that stops growing — toughness carries the escalation from there.
- **Toughness — uncapped, this is the "always hard-pressed" axis.**
  `healthMult(w) = 1 + 0.08w`, `damageMult(w) = 1 + 0.05w`. No ceiling —
  by design, since capping this would put a ceiling on how hard-pressed
  the player can ever be, which is the entire point of the request. At
  endless wave 10 (real wave 19): health ×1.8, damage ×1.5. At endless
  wave 30 (real wave 39): health ×3.4, damage ×2.5.
- **Speed — capped, unlike toughness.** `speedMult(w) = 1 + min(0.5, 0.02w)`,
  capping at +50% around endless wave 25. Unlike raw stat bloat, movement
  speed compounding past a point breaks kiting/pathfinding balance rather
  than just taking longer to kill something, so this one gets a ceiling
  toughness doesn't.
- **Roster mix — reuses the existing pool, no new mods.** Split each
  wave's mob count between a trash pool (zombie/skeleton/spider/
  wither_skeleton) and an elite pool (ravager, flesh_suffer,
  bruteplaquecreatureone, flesh_hunter_two, plaquethreelegcreature,
  flesh_boomer — all already in the roster from waves 5-8).
  `eliteFraction(w) = min(0.6, 0.05w)` shifts the mix toward elites as w
  grows, capped at 60% so there's always some low-effort chaff for
  contrast, never a pure elite swarm. Every 5th endless wave forces one
  extra ravager into the roll on top, as a recognizable spike layered on
  the smooth ramp (same "boss wave" beat already established for the
  designed campaign's ravager waves).

**Mechanism**: generalizes the per-mob NBT Attributes override already
proven on the ravager nerf (`Attributes:[{Name:"generic.attack_damage",
Base:8},{Name:"generic.max_health",Base:60}]` in `wave_spawner.js`'s
summon call) to every mob type in the endless phase, via a small
`BASE_STATS` table keyed by mob type — vanilla defaults for the base
four (zombie 20/3, skeleton 20/2, spider 16/2, wither_skeleton 20/8) and
the TFTH values already reverse-engineered from `TFTH.toml` and recorded
in `wave_spawner.js`'s own comments for the elite pool. Each spawn's
`Base` value becomes `baseStat * mult(endlessWave)` instead of a fixed
number.

**Known caveat, not silently assumed away**: skeleton's real threat is
its arrows, not its `generic.attack_damage` melee attribute — scaling
that attribute won't make arrows hit harder. Speed scaling partially
compensates (a faster skeleton repositions and closes distance more
often) but this is a real, untested gap in the toughness curve for
ranged mobs specifically, not a solved problem — flag it for an in-game
check once built rather than trusting the formula blindly for that one
mob type.

**Two follow-on changes this requires elsewhere, not optional cleanup**:
1. `wave_status.js` currently caps the on-screen display at
   `Math.min(data.getInt('td_waveNumber'), FINAL_WAVE)` — literally
   showing "Wave 8" forever past the designed campaign. That has to stop
   capping once this ships, since "how far did I get" is the actual
   point of an endless phase.
2. Quest 10 "No Turning Back"'s flavor text ("Eight is where the map
   runs out... it's the same night, over and over, until it isn't")
   describes a frozen repeat, which stops being true the moment real
   escalation exists. Needs a rewrite in the same diary voice — left for
   the user to redo rather than guessed at here, since tone/flavor is
   editorial, not a technical spec.

**Not sent to build yet** — per the standing pacing call, the amulet,
Tier 1 chapter restructure, and world-type rebuild are all still
unconfirmed in-game (see QUEUE.md); this is designed and ready to queue,
not queued.

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

**Base expansion** — *live*. The worldborder grows on **every** wave
clear, by an escalating amount — `growth = 20 + 5 * floor((waveNumber -
1) / 2)`, same constant-plus-step-function style as `wave_spawner.js`'s
`staggerGapForWave`, not a new pattern. Gives 20/20/25/25/30/30/35/35
across waves 1-8, taking the border from 50 (auto-set on world
creation) to 270 by the end of the designed campaign — up from only 70
under the original flat +20-every-2-waves rate. Built 2026-08-31,
numbers pre-confirmed with the user before implementation. Centered on
the fixed spawn point; mob spawn positions are clamped to stay within
the current border. This is the "custom world" idea's first-step scope
— no separate custom dimension, no hand-built structure, just the
border mechanic itself. Implementation: `base_expansion.js`. Not yet
confirmed in-game.

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

**World type** — *rebuilt 2026-08-30, not yet confirmed in-game*. The
flat-generator-with-desert-biome override (`type: flat`, `biome:
minecraft:desert`) was confirmed broken on a genuinely fresh world —
still rendered as plains. Root cause not diagnosed (vanilla's `flat`
generator type only ever supports **one hardcoded biome, by design** —
that may be part of why the override never behaved as expected), and
rather than debug `flat` further, replaced the mechanism entirely.

**Real fix, verified against actual vanilla data before writing a
single line**: switched `kubejs/data/minecraft/dimension/overworld.json`
to `type: minecraft:noise` with a custom `noise_settings` file
(`kubejs/data/kubejs/worldgen/noise_settings/flat_desert.json`) and a
`{"type":"minecraft:fixed","biome":"minecraft:desert"}` biome_source —
the same `fixed` biome_source this pack's own earlier real-terrain
Desert attempt already proved works correctly, so that half carried no
real risk. The `noise_settings` schema itself (an unfamiliar, easy to
get subtly wrong format) was **not** taken from summarized wiki/doc
fetches — those turned out to disagree with each other on real field
names (one invented a nonexistent `initial_density_without_jaggedness`
field, another used the wrong key name `surface_rules` instead of the
real singular `surface_rule`). Instead, downloaded vanilla's actual
120KB `overworld.json` noise_settings directly and diffed every one of
my keys against its real ones programmatically — exact match, 15/15
`noise_router` keys, no invented or missing fields. The desert
sand/sandstone surface rule (`stone_depth` + `above_preliminary_surface`
condition structure) was copied verbatim from vanilla's own real
desert-biome branch inside that same file, not guessed.

**"Genuinely, crisply flat" is structurally guaranteed here, not just
tuned toward** — a real, deliberate improvement over the originally
planned `density_factor`-tuning approach (which would have needed
real in-game trial and error to find a value that "looks flat enough").
`final_density` is a `y_clamped_gradient` — a function of **Y only**,
with zero dependency on X or Z anywhere in the noise router (all the
climate/terrain-shaping terms that normally introduce horizontal
variation — continents, erosion, depth, ridges — are set to flat
constants, inert since a `fixed` biome_source never samples them
anyway). A density function with no X/Z input mathematically cannot
produce horizontal height variation — every column in the world
evaluates to the exact same surface Y, by construction, not by
approximation. This also directly satisfies the fixed-spawn base
logic's uniform-flat-Y assumption, for the same reason.

**Still genuinely unverified**: this is real, unfamiliar Minecraft
worldgen format, hand-assembled from verified real fragments rather
than one complete tested example — confident in the reasoning, not
yet confirmed by actually loading a world. **World-gen changes only
affect newly generated chunks** — testing this needs a brand-new
world, not the existing one already played on. Structure generation
(Treasure2, vanilla desert content) is worth re-confirming once a
world loads — `noise`-type generators are architecturally closer to
normal terrain than `flat` was, which is why `flat` needed all the
"check every mod for self-disable logic" caution in the first place;
this isn't expected to be a new risk, possibly a reduced one.

**Base expansion into rooms/corridors** — *planned, not built*. Goal:
gather materials, activate something, and a new room/corridor gets
built onto the starting structure automatically.

**Mod choice reversed 2026-08-30**: the originally-planned "standalone
Schematicannon" extraction turned out to be a mislabeled re-upload, not
an independent mod. Decompiling its jar (CurseForge project 1375728,
"Schematicannon standalone" by VinicciusX) showed a hardcoded
`modId = "schematicannon"` / `authors = "bikerboys"` pointing at
`github.com/michiel1106/Create-schematicannon` — the exact same mod as
CurseForge's separate **"Schematicannon"** listing (project 1350154,
also bikerboys), which the author's own page flags **"BROKEN, MIGHT FIX
IN THE FUTURE. DONT USE."** It also jar-in-jars Flywheel/Ponder/
Registrate/MixinExtras anyway, so the assumed footprint saving over
full Create was smaller than it looked. Installed **full Create**
(CurseForge project 328085, `simibubi`, 6.0.8 for 1.20.1 Forge) instead
— actively maintained, same bundled-dependency footprint, at the cost
of shipping Create's full machine/content roster alongside the one
mechanic actually wanted. A real footprint tradeoff, accepted directly
by the user rather than decided unilaterally. No separate Flywheel/
Ponder/Registrate packwiz entries needed — Create bundles all four via
jar-in-jar, confirmed from the jar's own `META-INF/jarjar/` contents.

Survival-native (no creative-mode restriction, no colonist dependency,
unlike the Structurize-based plan this superseded). Direction chosen:
**curated schematics found while exploring**, not player-designed
freeform — the pack author builds and finalizes each room design once,
ships the finished schematic as a lootable item placed in structure
loot tables (same LootJS mechanism already used for loot bags,
targeting structure/chest loot tables instead of entity-kill drops —
exact method name to confirm against LootJS's source before writing
it). This directly ties into the exploration/structure-generation plan
below: schematics become one of the things worth finding out there.

**Material-check-then-place gate is native, not custom** — corrected
2026-08-30, confirmed against Create's own official GitHub wiki
(`Creators-of-Create/Create` wiki, "Printing a Schematic"), not the
earlier-assumed gap. The Schematicannon draws materials from adjacent
inventories and pauses with a "Missing Block" status until they're
supplied (or skips, if "Skip Missing Blocks" is toggled) — no custom
KubeJS glue needed for the gate itself.

**Real, harder blocker found in its place**: a finished `create:schematic`
item is not self-contained NBT — decompiling `SchematicItem.class`
confirms its NBT (`File`, `Owner`, `Bounds`, `Deployed`) is a *pointer*
to a `.nbt` structure file that must already exist in that specific
world's `saves/<world>/schematics/uploaded/` folder (populated normally
by a player running a local schematic file through the in-world
Schematic Table). A lootable item alone can't carry the room design —
the underlying `.nbt` file has to reach every world's save folder
somehow, which needs either a real filesystem-copy hook (KubeJS/Java
interop, unverified) at first login, or accepting that the loot-schematic
plan needs a different delivery mechanism entirely. **Still needs,
before any of this can be built**: at least one actual room, hand-built
in-game and exported via Schematic and Quill + Schematic Table into a
real `.nbt` file — inherently a real-client, real-playtest step, not
something a coding session can produce headlessly. This is the genuine
bottleneck now, not the mod choice.

**Structure generation / exploration content** — *live* (2026-08-30),
**partially confirmed broken in-game, one mod removed 2026-08-30**.
Goal: real structures to explore,
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
- **Mod picks, two dropped from the original plan — one on hard
  evidence up front, one on a real in-game crash**:
  - **YUNG's Better Desert Temples — installed, then REMOVED
    2026-08-30 after confirmed-broken real-world testing.** World
    creation crashed on every attempt: `logs/latest.log` showed a
    repeating `ArrayIndexOutOfBoundsException: Index -1 out of bounds
    for length 24` inside the mod's own `QuartzPillarProcessor`, which
    replaces a temple's quartz pillar with an 8-block sandstone column
    by walking straight down from the pillar's position with no
    world-floor check. Read the processor's actual source
    (`YUNG-GANG/YUNGs-Better-Desert-Temples`, `1.20` branch) to confirm:
    24 is a full-height world's chunk-section count, so index -1 means
    the column walked below Y-min — on this pack's genuinely flat/thin
    world, a temple piece can generate close enough to the floor for
    that walk to underflow, and it did, deterministically, on the very
    first world-creation attempt. This directly contradicts the
    original "no flat-world references anywhere in its jar" check —
    that check looked for explicit flat-world *detection* code (a
    self-disable check), which genuinely doesn't exist, but a mod
    having no flat-world checks doesn't mean it's flat-world *safe*, a
    real distinction this pack hadn't drawn until hitting it. Removed
    the mod and its **YUNG's API** dependency (nothing else in the pack
    needs it) — see `docs/MODS.md` for the removal entry. **No fix
    attempted or found** (no newer 1.20.1 build, no relevant closed
    issue found on the mod's own tracker) — this was a "cut it, don't
    debug a third-party mod's worldgen code" call, matching this pack's
    standing approach to failed features.
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
  deliberate, not an oversight; Treasure2 promises better-than-vanilla
  native loot by design, so no custom LootJS structure-loot injection
  was needed as a first pass.
- **Treasure2 itself is still genuinely unconfirmed** — world creation
  never got past the YUNG's crash above to actually test it. Worth
  watching specifically on the next successful world creation, given
  what just happened with a different structure mod on this same flat
  generator.

**Structure density fix, 2026-08-31, direct request ("increase the
generation of structures").** World creation now succeeds (see "World
type" section), which surfaced a real problem the earlier planning
never checked: default structure spacing is tuned for an infinite
vanilla world, not this pack's bordered one. `worldborder` tops out at
270 blocks (~17 chunks) even at wave 8 (see "Base expansion"), but the
mods' own default `random_spread` placement averages **400-800 blocks**
between attempts (vanilla desert pyramids: 32-chunk spacing; Treasure2
terranean set: 25 chunks; Treasure2 wishing wells: 50 chunks) — under
those defaults, a player could plausibly finish the entire 8-wave
campaign without ever generating a single structure inside the
reachable area. Fixed by overriding all three `structure_set` registry
files via the same KubeJS-datapack-overlay mechanism already proven
working for the dimension override (`kubejs/data/<namespace>/worldgen/
structure_set/<id>.json`, same technique, different registry):
  - `minecraft:desert_pyramids` — spacing 32→8, separation 8→4.
  - `treasure2:terranean_treasures_set` (dungeon/general, both ruins
    variants, surface/general, wither_tree) — spacing 25→6, separation
    15→3.
  - `treasure2:wishing_well_set` — spacing 50→10, separation 35→5.
  Salts left unchanged, only spacing/separation touched. Aquatic
  ruins/wells deliberately left alone — their structure_set requires an
  aquatic biome that can never exist under this world's `fixed:
  minecraft:desert` biome source, so tightening its spacing would
  generate zero additional visible content regardless.
- **Confirmed which entries actually contribute vs. silently waste
  placement attempts** (a `random_spread` set rolls ONE weighted
  structure per grid cell — if that specific structure's own biome
  check fails, nothing places there, it does NOT fall through to
  another entry): checked every structure's own `biomes` field and the
  Treasure2 biome tags they resolve to. `#treasure2:terranean` resolves
  to `#treasure2:wells_general` + `#treasure2:wells_desert`, and
  `wells_desert` lists `minecraft:desert` directly — so `dungeon/
  general`, both `ruins` variants, `surface/general`, and `wither_tree`
  can all actually place here. `surface/temperate` (weight 5 of 124)
  requires forest/plains-family biomes and can never place in an
  all-desert world — a real, permanent ~4% wasted-roll rate on that set
  that the density fix doesn't address (not worth a separate override
  just to redistribute one entry's weight). The `wishing_well_set` is
  worse: 3 of its 4 equally-weighted entries (`well/wishing_well`'s
  `wells_general` tag, plus the forest/jungle variants) can never place
  in all-desert, only `well/desert/wishing_well` can — meaning ~75% of
  that set's attempts were always going to be wasted, on top of the
  original 50-chunk spacing. This is the real reason the wishing well's
  spacing was cut proportionally more (5x) than the terranean set's
  (~4x) in the fix above — compensating for that wasted-roll rate, not
  an arbitrary choice.
- **Chest loot confirmed real, not placeholder** — checked directly,
  not assumed. Vanilla `desert_pyramid`'s chest loot table
  (`data/minecraft/loot_tables/chests/desert_pyramid.json`, untouched
  by this pack) is standard vanilla: diamonds, gold, emeralds,
  enchanted golden apples, the desert armor trim template. Treasure2's
  chests use real per-rarity `minecraft:chest`-type loot tables
  (`common` through `mythical`) each rolling multiple real sub-pools
  (treasure/items/armor/food/tools/potions) — e.g. the `common` chest
  alone rolls 2 treasure entries (Treasure2's own keys/lockpicks, its
  locked-chest mechanic) + 3-5 items + 1-2 armor + 1-3 food + 1-2 tools,
  all real items (iron ingots, leather, arrows, etc.), not stubs.
  Exactly which rarity a given structure's chest rolls is Treasure2's
  own Java-side logic (`RarityLootTableAssociationRegistry`, not a
  simple JSON this pack overrides), not verified further — but every
  rarity tier's loot content itself is confirmed real.
- **Not yet confirmed in-game** — the density fix is real-data-verified
  the same way the world-type rebuild was (checked spacing/biome-tag
  math directly, not assumed), but hasn't been seen in a live world
  yet. Same caveat as every worldgen change this pack has made:
  **structure placement is decided at chunk-generation time**, so this
  only affects chunks not yet generated — an already-explored area
  keeps whatever the old spacing produced (or didn't) there; new
  structures at the new density only appear in newly generated chunks,
  which in practice means most of the map as the border keeps
  expanding into unexplored territory.

**Structure variety after the YUNG's removal — researched, held, not
queued.** With YUNG's gone and Abandoned Structures never installed,
the only structure content left is Treasure2 (unconfirmed) plus
whatever vanilla itself generates on this flat world (also unconfirmed
— the plan's own first step, "check the free baseline," never got done
before YUNG's crashed world creation). Researched a candidate to fill
that gap if it turns out to be real once tested: **Structory: Towers**
— confirmed Forge 1.20.1, 47.8M downloads (far more real-world use than
YUNG's Better Desert Temples ever had), includes a desert-specific
"desert mirage" tower among ~20 biome-themed towers. Structurally a
different risk shape than what just crashed — towers generate *upward*
from a placement point rather than digging down into surrounding
terrain to find a floor, which was the exact pattern behind the YUNG's
underflow bug — but that's a different risk profile, not proof of
safety, per the standing lesson above. **Held, not installed or sent
as a build brief** — the user wants to playtest the current build
(amulet + Tier 1 restructure) before anything else lands on top of it.
Revisit once that playtest happens, especially if it confirms the
current structure variety (Treasure2 + vanilla) actually feels thin in
practice.

---

## The amulet

**The amulet** — *live* (2026-08-30), **not yet confirmed in-game**. A custom item that draws mob
attention to *itself* rather than the player or a fixed map location —
a lightweight route to "true tower defense" (mobs pathfinding to a
fixed objective regardless of player position) without custom AI,
since `mob_aggro.js` already proves `Mob#setTarget()` works reliably
here; the amulet just changes *what* it targets.

**Stack**: **Curios API** (the current, actively-maintained accessory-
slot mod — note **Baubles itself has no Forge 1.20.1 build**, it
stopped at 1.12.2, Curios is its real modern replacement) +
**KubeJS-Curios** (a bridge mod that exposes Curios equip/unequip and
tick-while-worn hooks directly to KubeJS scripts, avoiding custom Java
or unverified capability reflection). Item: `kubejs:amulet`, registered
the normal way and tagged to a Curios slot.

**Curios slot mechanics, confirmed from source before building**:
Curios ships slot *types* (necklace, charm, back, etc., each just an
icon/order/validator definition) but grants **zero slots of any type to
any entity by default** — a consuming pack has to grant slot count
itself. Confirmed directly from Curios' own `CuriosSlotManager.java`:
slot-definition files at `data/<any namespace>/curios/slots/<id>.json`
are merged by *path*, not namespace, so this pack's own
`data/kubejs/curios/slots/necklace.json` (`{size:1, operation:"ADD"}`)
correctly stacks onto Curios' own `necklace.json` (which only sets
order/icon/validators, no size) — no separate "which entities get this
slot" file needed in this Curios version, unlike its own test fixtures
which misleadingly suggest otherwise. The item is tagged into the slot
via the standard `#curios:necklace` item tag
(`data/curios/tags/items/necklace.json`).

**KubeJS-Curios' real API, read from its own source, not guessed**:
CurseForge project 1255211 (author zhaijineet) has no README in its
repo, and a *different* project with the same name (Prunoideae's
KubeJS-Curios) exists too with a different API — installed the right
one by checking the CurseForge listing's actual linked GitHub, not
assumed from the name. `CuriosJSCapabilityBuilder.create()` returns a
builder with `.onEquip((slotContext, prevStack, stack) => …)` /
`.onUnequip((slotContext, stack, newStack) => …)`, attached to an item
via `.attachCuriosCapability(builder)` chained onto the item builder
during registration. `slotContext.entity()` gives the wearer.
Programmatic equip (for the starter-gear give, below) uses a *different*
path — `player.setEquippedCurio(slot, index, stack)` /
`.findFirstCurio(predicate)`, mixed directly onto `LivingEntity` — so
`player` gets these methods without any special import, same as
`getX()`/`setTarget()` elsewhere in this codebase.

**Worn state**: the equip/unequip capability callbacks set a
`td_amuletWorn` persistent-data flag; `server_scripts/amulet_worn.js`
(the existing `PlayerEvents.tick` pattern, same shape as
`mob_aggro.js`/`wave_status.js`) applies/refreshes **Regeneration +
Fire Resistance** while it's true — passive survivability rather than
combat stats, so it doesn't duplicate the (removed) roguelike buff-pick's
Vitality/Fortitude/Ferocity trio. **Player-only for this pass** —
buffing defensive machines too was the original idea, but Tier 1 is now
Trapcraft's blocks (an external mod with no idea this amulet exists),
which makes machine-buffing genuinely harder than when Tier 1 was
custom-owned. Decided to skip it for now rather than build a generic
damage-event hook for it — revisit once there's a pack-owned machine
tier again, or if a mod-agnostic approach becomes worth the complexity.

**Decided: the amulet is starter gear, the pedestal is crafted.** The
amulet arrives already worn at world start, alongside the sword/armor
— same "inherited from the previous occupant" narrative, generating
buffs from turn one. The **pedestal** (`kubejs:amulet_pedestal`) is a
craftable block, not pre-built into the starting base — consistent with
every other capability in this pack being earned (Tier 1 traps, border
growth, quest unlocks), and it gives border-crossing an actual "you
just unlocked this" moment rather than being available immediately,
which would undercut the tension the mechanic is meant to create.

**Pedestal state**: a `kubejs:amulet_pedestal` block
(`server_scripts/amulet_pedestal.js`), crafted from 8x gold_ingot
(Uncommon-tier loot pool) + 1x sandstone in a ring pattern — no recipe
was pinned down in the design, so this is an implementation-level pick.
**Shrine visual pass (2026-08-30, direct request)**: originally a
plain full-cube stone block with one flat texture; rebuilt as a real
custom block model (`assets/kubejs/models/block/amulet_pedestal.json`,
standard vanilla block-model "elements" format) — a wide sandstone base
plus a smaller raised dais on top, a stepped altar silhouette instead
of a cube, with distinct side (carved masonry courses + a gold inlay
band) and top (a glowing gold socket ring) textures instead of one
cube-all texture, tying the block visually to the desert world and the
amulet's own gold/gem palette. When the amulet is placed, the marker
armor stand (below) now visibly holds it via `HandItems` — confirmed
real vanilla behavior, not assumed: a `Marker:1b` armor stand has no
body/hitbox but still renders held items, the standard "floating item"
trick — positioned to hover just above the dais rather than sit on it.
Right-clicking it while the
amulet's worn clears `td_amuletWorn`, sets `td_amuletOnPedestal`, and
unequips the item via `setEquippedCurio(slot, index, air)`;
right-clicking it again while occupied gives the amulet back and
re-equips it the same way. State lives on the **player's**
persistentData, not the block/world — same reasoning as
`base_expansion.js`'s worldborder counter (level/world persistentData
has no save/load hook, player's does), and this pack only ever expects
one pedestal to exist. **Real technical detail, not hand-waved**:
vanilla mobs can only `setTarget()` an entity, not a bare block
position — so placing the amulet spawns an invisible, gravity-less,
`td_amulet_marker`-tagged armor stand (the standard vanilla trick,
summoned via command like the rest of this pack's world-state changes)
at the pedestal, and `mob_aggro.js` now checks `td_amuletOnPedestal`
each throttled tick and points every wave mob's `setTarget()` at that
marker instead of the player while it's set, falling back to the player
if the flag is set but no marker is actually found.

**Border-crossing**: the worldborder already has damage disabled
(`worldborder damage amount 0`, set earlier for the mob-spawn-beyond-
border mechanic) — it isn't actually a hard barrier right now, nothing
currently enforces it. `server_scripts/amulet_border.js` is the
genuinely custom tick handler this needed: checks player position
against `level.getWorldBorder()`'s bounds (the same proven API
`wave_spawner.js` already uses for spawn clamping) and teleports the
player back in if they're outside *and* `td_amuletOnPedestal` is false,
with an edge-triggered chat message so it doesn't spam every throttled
tick. **Deliberately does not implement** the "forced extra wave"
penalty for leaving via the pedestal — that was flagged as "the leading
idea, not confirmed" in the original design, and building it now would
mean guessing at an unresolved point rather than a decided spec.

**Why cross at all**: this is what gives the exploration content
(structure generation, lootable schematics) a reason to matter before
the border naturally grows there — push out early for something worth
finding, at the real cost of losing the worn buffs.

**Build notes (2026-08-30)**: first time this pack has integrated a
third-party accessory-slot system — every API detail above (the
Curios slot-grant mechanism, KubeJS-Curios' real method names/
signatures, `setEquippedCurio`'s existence) was read directly from the
mods' own decompiled/GitHub source rather than guessed, same discipline
as the SecurityCraft/Trapcraft/FTB Quests integrations.

**Real bug found in first playtest — the amulet was silently
unreachable, not just unconfirmed.** On this world's very first login,
`setEquippedCurio` no-op'd: the item never landed in the inventory or
the Curios slot, so the player genuinely couldn't find it anywhere.
Diagnosed directly from the player's own saved NBT data (parsed with a
small hand-written Node NBT reader, since no Python was available) —
`ForgeCaps.curios:inventory.Curios` only had a `head` entry, no
`necklace` entry at all, even though `td_amuletWorn` had been set to
`1` (the flag and the actual equip state had desynced) and the worn
buffs were active anyway (a real, separate small bug: the buff tick
handler only checks the flag, not the item's actual presence). First
fix attempt (unambiguous `SET`+`replace:true` in
`data/kubejs/curios/slots/necklace.json`) turned out to be treating a
symptom, not the cause — user still saw only one Curios slot in-game
(a "head" one) after it. **Real, complete root cause, found by reading
`CuriosEntityManager.java` directly**: Curios has *two* independent
gates, not one. A `curios/slots/<id>.json` file (what the first fix
touched) only defines a slot *type*'s size — it does **not** make that
slot usable by any entity. A *separate* `curios/entities/<id>.json`
file has to explicitly list which entity types can use which slot IDs;
`CuriosEntityManager.getEntitySlots(type)` returns a **flat empty map**
for any entity type with no matching entry, regardless of what any slot
type's own size says. This pack had never shipped one — the "head"
slot the player could see was coming from some other installed mod's
own legacy Java-side registration, not from anything of ours. Added
`data/kubejs/curios/entities/player.json` (`{"entities":
["minecraft:player"], "slots": ["necklace"]}`, no `replace`, so it adds
to rather than overwrites whatever's already granting "head") — this is
the actual fix; the earlier `SET`+`replace:true` change to the slot
size was harmless but not what fixed it. Also corrected this doc's
earlier "Curios grants zero slots by default" claim (confirmed via
`docs.illusivesoulworks.com` that a slot type's own default size is 1,
not 0) — the real "zero by default" behavior lives in the
entity-eligibility gate, not the slot-size default.

Also made the give-logic in `playtest_starter_kit.js` verify the equip
actually landed (`findFirstCurio`) before trusting it, falling back to
a plain inventory `give()` — and never trusting a lost item to a flag —
so the amulet is never silently lost again even if some other gate
turns out to be missing too. Moved out from behind the
`td_playtestKitGiven` one-shot flag into its own "does the player
already have one" check, run on every login — self-healing for any
world/player that already hit the bug, not just new ones.

Two more real unverified assumptions still worth flagging: whether
`setEquippedCurio` actually routes through the same onEquip-callback
pipeline as a manual GUI equip (mitigated the same way, by verifying
and setting `td_amuletWorn` explicitly rather than trusting the
callback), and `Entity#teleportTo(x,y,z)`'s exact behavior for the
border push-back (a real, standard vanilla method, but not yet seen
used elsewhere in this codebase, and not yet actually tested).

**Two more real bugs, found once world creation actually started
succeeding (2026-08-30/31)**:
1. **Duplication on login** — the auto-equip-at-login path (setEquippedCurio
   + a findFirstCurio re-check, falling back to give() if the equip
   looked like it hadn't landed) produced a genuine duplicate: one
   amulet equipped, one in inventory. The re-check must have false-
   negatived a real success. Never root-caused which part was
   unreliable — fixed by removing the whole auto-equip path per direct
   request: the amulet now just starts unequipped in inventory, which
   has no Curios-slot interaction at login at all, so the race can't
   happen either way.
2. **Pedestal rejected a genuinely-carried amulet** — direct
   consequence of fix #1. The pedestal's placement check only ever
   looked at the worn Curios slot (`findFirstCurio`); once the amulet
   stopped auto-equipping, a player who hadn't manually equipped it yet
   got "the amulet isn't on you" while actually holding/carrying it.
   Fixed: the pedestal now also checks `player.inventory.find(...)` /
   `.extractItem(slot, 1, false)` (KubeJS's `InventoryKJS` mixin,
   confirmed by decompiling `kubejs-forge`'s own class file directly,
   not guessed) when nothing's equipped, accepting the amulet from
   wherever the player actually has it — worn, in hand, or just sitting
   in inventory. Taking it back off the pedestal now also gives it
   unequipped (`give()`, not `setEquippedCurio`), consistent with fix
   #1's "never auto-equip" direction.

The rest of the feature — worn buffs, marker targeting, border
push-back — still hasn't been reached in a real playtest.

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

**Machine progression, Tier 2** — *planned, not built*. Semi-automated,
redstone-powered, still fragile — the next rung up from Tier 1, and the
first real use for the Uncommon (Fortified Cache) loot tier, which
currently has nothing to spend on. Recipes should pull from that tier
specifically rather than Common — it already contains `redstone_block`,
which pairs naturally with these being redstone-dependent.
- **Fire Trap** = Trapcraft's **Igniter** — already installed for Tier
  1, unused until now. Lights an area on fire on a redstone signal,
  range upgradeable via its own module. Matches the original Tier 2
  sketch almost exactly, zero new footprint.
- **Fan** — also Trapcraft, already installed. Pushes mobs (and items)
  on a redstone signal — not in the original sketch, but a natural fit:
  funnel mobs into other traps, or push them back from the chokepoint.
- **Magnetic Chest** — also Trapcraft. Auto-collects loot from trap
  kills — more a QoL piece than a defense, but fits the tier and cuts
  down on manual bag-collection.
- **Arrow Turret** = **Medieval Defense Turrets**' basic bow turret (new
  install, Forge 1.20.1) — its simplest turret, arrow ammo only, picked
  specifically over TurretCraft (smart spherical auto-targeting, ammo
  GUI) and K-Turrets (needs an actual bow/crossbow, adds combat drones)
  because both of those sound more like Tier 3 material than Tier 2's
  "basic, fragile" framing.
- **Reinforced Spikes** (tougher Tier 1 spikes) — cut. No equivalent
  found in Trapcraft; not blocking the rest of Tier 2.
- Still needs, before build: confirming Medieval Defense Turrets' own
  recipe materials (re-recipe via `ServerEvents.recipes` if it doesn't
  already use vanilla materials, same pattern as Tier 1), same check
  Trapcraft's Tier 1 items already got.

**Machine progression (Tier 3-4)** — see IDEAS.md, still just the
original tier concept (powered → elite). Depends on the power system,
also undesigned.

---

## Quest book

**FTB Quests — three chapters: Basics, Tier 1, Tier 2** — *Basics and
Tier 1 are live* (2026-08-30), Tier 2 as its own chapter is **planned,
on hold** — see QUEUE.md, held deliberately at the user's request so
they can playtest the current build before more lands on top of it, not
a design gap. Original design put every quest in one "Basics" chapter;
per direct feedback, each tier now gets its own chapter with one quest
per item, rather than one quest per tier carrying a wall of text
describing several items at once.

**Basics chapter** — *live*, 12-quest chain (10 linear onboarding quests
plus 2 amulet side-quests inserted by dependency, not renumbering):

| # | Quest | Task | Reward |
|---|---|---|---|
| 1 | You're On Your Own | Checkmark | 2 XP levels |
| 2 | Borrowed Time | Checkmark | 2 XP levels |
| 2.5 | Not Just Jewelry | Checkmark | 2 XP levels |
| 3 | Sound the Horn | Checkmark | 4x cobblestone + 4x oak_log |
| 4 | Thin the Horde | Kill 5x zombie | 3 XP levels |
| 5 | Spoils of War | Hold a Scavenger's Bag | — |
| 6 | Open It | Checkmark | 3 XP levels |
| 8 | Watch the Walls Grow | Checkmark | 3 XP levels |
| 8.5 | Leave It Behind | Craft `kubejs:amulet_pedestal` | — |
| 9 | The Reckoning | Checkmark (manual, after wave 5 gear removal) | — |
| 10 | No Turning Back | Checkmark | — |

*(Quest 7, "Fortify," is no longer part of this chapter — see "Tier 1
chapter" below. It's still numbered 7 for reference to its old
position; nothing here renumbers the rest of the chain.)*

**Two amulet quests, live**: "Not Just Jewelry" depends on quest 2
(Borrowed Time) and introduces the amulet's worn buffs, since it
arrives as starter gear like the sword/armor. "Leave It Behind" depends
on quest 8 (Watch the Walls Grow) and introduces the pedestal as the
crafted unlock for border-crossing — a deliberate "the wall grows on
its own, or you can step past it yourself" pairing.
- *"Not Just Jewelry"*: **"That pendant isn't just for show. Wear it
  and something in you mends faster, and the heat doesn't bite the way
  it should. Whoever had it before you needed both. So will you."**
- *"Leave It Behind"*: **"Build the stand, set the pendant down, and
  the wall stops being a wall — for you, anyway. Everything out there
  stops watching you and starts watching it instead. That's the trade:
  no more mending, no more warmth, but nothing's stopping you from
  walking past that line. Just remember what you're leaving
  unguarded."**

Basics quest flavor text (found-diary voice, matched against the wave-5
gear-removal text as the tone benchmark), quest 7 omitted since it no
longer lives here:

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

**Tier 1 chapter** — *live* (2026-08-30). Two quests, parallel (both
gated on Basics quest 6, not on each other — Spikes and Bear Trap are
alternatives, not a sequence):

| Quest | Task | Reward |
|---|---|---|
| Sharpened Scrap *(= the existing live "Fortify," relocated)* | Craft `trapcraft:spikes` | — |
| Something Crueler *(new)* | Craft `trapcraft:bear_trap` | 2 XP levels |

- *"Sharpened Scrap"* keeps its existing text: **"The dead didn't just
  leave gear behind — some of them left know-how. Turn scrap into
  something with teeth. Spikes don't ask questions, and they don't get
  tired."**
- *"Something Crueler"*: **"A Bear Trap doesn't kill quick, but it
  holds. Whatever steps in it stays there — long enough for whatever
  comes next."**

**Real migration note, not fresh content**: "Sharpened Scrap" is the
already-live Fortify quest, relocated into its own chapter — moved with
its quest ID (`1454951A7FB14A26`) and task/dependency untouched, only
the title and chapter changed, so Basics quest 8's existing dependency
on it keeps working unmodified. Confirmed `trapcraft:bear_trap` as the
real registry name directly from Trapcraft's own jar (`assets/trapcraft/
lang/en_us.json`'s `block.trapcraft.bear_trap` key) before writing
"Something Crueler"'s task, not guessed — same discipline that would
have caught the original Fortify `#tag` crash earlier if it'd been
applied there. Chapter itself renamed from "Defenses" to "Tier 1" for
the new one-chapter-per-tier structure.

**Tier 2 chapter** — *planned*. Four quests, all gated on "Sharpened
Scrap" (not chained to each other — order of crafting Tier 2 items
doesn't matter narratively):

| Quest | Task | Reward |
|---|---|---|
| Spark and Flame | Craft the Igniter (confirm real item ID) | 2 XP levels |
| Herd Them In | Craft the Fan (confirm real item ID) | 2 XP levels |
| Waste Not | Craft the Magnetic Chest (confirm real item ID) | 2 XP levels |
| Wired for War | Craft the Arrow Turret (confirm real item ID) | 2 XP levels |

- *"Spark and Flame"*: **"Wire an Igniter and it'll set the ground
  itself against them — you won't need to swing a blade if the fire
  gets there first."**
- *"Herd Them In"*: **"A Fan won't kill anything on its own. It doesn't
  need to — it just makes sure they end up exactly where your other
  traps are waiting."**
- *"Waste Not"*: **"A Magnetic Chest does the grim work so you don't
  have to — walk away from a kill and let it do the collecting."**
- *"Wired for War"*: **"An Auto-Turret keeps swinging long after your
  own arm gives out. Wire one, and for the first time, something else
  is watching the wall while you sleep."**

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

**Standing process, not a one-off**: the quest book is the tutorial —
whenever a new mechanic gets fleshed out to "planned" status in this
file, check whether it needs a new quest (or a refinement to an
existing one) to actually teach the player about it, and draft that
alongside the mechanic's own design rather than after the fact. Don't
let quest coverage silently fall behind what's actually buildable.
**Refined after the Tier 2 draft got real feedback**: one quest
describing several distinct items in its text is not the same as
actually teaching them — if a tier/feature has multiple distinct
craftable items, each one gets its own quest (one task, one specific
item), grouped into that tier's own chapter, rather than one quest with
a paragraph naming everything. The Tier 1/Tier 2 chapters above are the
first case this applied to.

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
