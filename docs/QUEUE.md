# Build Queue

A simple lookup for the implementation session: what's actually ready
to build right now, in priority order. Each entry links to its full
spec in [FEATURES.md](FEATURES.md) rather than repeating it here — this
file only tracks *what's next and how ready it is*, not the design
itself.

**Lifecycle**: an idea starts raw in [IDEAS.md](IDEAS.md) → once it's a
real, fleshed-out design it moves into FEATURES.md marked *planned* →
if it's actually unblocked and ready to act on, it gets a line here →
whoever builds it flips the FEATURES.md entry to *live* and removes the
line from this file. Don't queue something that's still genuinely
unresolved (open forks, undecided mod picks) — flesh it out in
IDEAS.md/FEATURES.md first.

**Cleaned up 2026-09-01** — this file had accumulated stale entries for
things confirmed working, things superseded by later redesigns, and
a duplicate leftover from before the desert-drop rebuild. Trimmed to
reflect actual current status.

---

## World-gen rebuild 2026-09-09 — anchor-grid base placement (supersedes the entry below it)

Direct urgent report after the previous same-day attempt: "still
broken — takes ages to load, base not spawning correctly, structures
way too close to my base." Full root-cause writeup in docs/FEATURES.md's
"Anchor-grid base placement" entry; this tracks status against the
user's own three items.

1. **Slow load — fixed.** Two stalls: vanilla's 23–25s spawn-area pass
   near origin (wasted, the player was teleported away) and a 36–55s
   frozen server tick in the login handler, whose structure-proximity
   check reflected into `findNearestMapStructure` and synchronously
   generated hundreds of chunks per candidate. Replaced with a
   world-load-time site pick over a fixed anchor grid (pure biome
   lookups + the engine's own placement-grid math, 126ms in the
   sandbox) that pins the world spawn BEFORE vanilla's spawn-area pass,
   so that pass now prepares the base's own surroundings, and the base
   is built in `ServerEvents.loaded` before any player exists.
2. **Base not finishing — fixed.** Real cause was a marker-visibility
   race (`level.getEntities()` cannot see an entity summoned into a
   chunk generated in the same blocked tick), throwing before the house
   was placed. Marker now created via `level.createEntity` with the
   reference held directly. Also found: `Level#getHeight` returns -64
   for unloaded chunks — the "66 blocks of terrain variance" in the live
   logs was a phantom, fixed with a chunk-touching `surfaceHeightAt()`.
3. **Structures on top of the base — fixed by construction.** The
   previous `exclusion_zone` anchor was mis-sized (mid/far tiers were
   being excluded from the entire world, nothing protected the base).
   New `kubejs:base_anchor` set (spacing 64/separation 63 → placement
   chunk pinned to exactly (64i, 64j)), 52 structure_set overrides
   excluded around it, and the base is placed ON the nearest
   desert/badlands anchor chunk — a guaranteed structure-free radius,
   no search needed. Shipped at 12 chunks (~200 blocks, nearest real
   structure 254), then **cut to 9 chunks (13 for sprawling city sets)
   the same afternoon** on first-playtest feedback ("slightly too far
   away... but only slightly").

**First live playtest (same day): load, spawn-in-courtyard, full
compound and structure distance all confirmed working from the live
log and decoded save. "Base wrong" turned out to be the Red House
itself — the morning's swap was built on the misdiagnosis above (the
Brick House never failed to place, the handler crashed before reaching
it). Reverted to the Abandoned Brick House with every Brick-House
fixup and its wall reinforcement restored from 9de1941; border back to
50. Sandbox-verified from the region files.**

Also fixed while in there: `structure_loot_progression.js` and
`structure_chest_loot_fix.js` still measured distance from a hardcoded
(1171, -499) — now read from the marker, radii shifted +200.

**Not fixed, flagged:** desert/badlands is rare on the current 2-of-7
`multi_noise` blend — the first sandbox seed had exactly ONE
desert/badlands anchor point among 169 (6,152 blocks out). The search
copes, but if that reads as "too far" in play, the biome blend is the
lever, not the search.

## SUPERSEDED (same day) — "RESOLVED 2026-09-09 — 3-item world-gen regression from the previous batch"

Left for the record; its items 2 and 3 were wrong (a same-tick retry
cannot fix the marker race, and the complaint was structures too close
to the BASE, not to each other). Its working-tree edits were never
deployed to the live instance and are replaced by the entry above.

Direct live report the same day as the Red House swap + exclusion_zone
batch (58dd0bb): "world gen is broken" — slow boot with a visible fall
before the world loads, no starting base at all, and structures still
landing too close together. Diagnosed directly against the live
instance's own fresh `logs/latest.log` (a brand-new "New World" created
that session), not guessed. All 3 traced to real, distinct causes:

**1. Fall during boot.** The safety-hop `effect give @a
minecraft:slow_falling 10 0 true` in `playtest_starter_kit.js` only
covers 0.5s, on the assumption the biome search + spreadplayers landing
right after it is near-instant. This same boot's log shows that stretch
alone took ~32 real seconds (`findWastelandSpawn`'s ring search, up to
4000 blocks) inside one blocked server tick — confirmed by the server's
own "Can't keep up! Running 36276ms or 725 ticks behind" warning logged
right after. Since the whole handler runs in one tick, the *client's*
own local countdown of the 0.5s effect expires long before the server
tick actually completes, so the client's own gravity prediction resumes
normal-speed falling with no server packet yet arriving to correct it —
exactly "fall while the other world loads." Fixed: duration bumped
10 → 1200 ticks (60s, a real margin over the measured 36s worst case).

**2. No starting base.** Real crash, same boot's log:
`playtest_starter_kit.js#1226: TypeError: Cannot read property
"persistentData" from undefined` — `findWorldStateEntity(level)` came
back empty immediately after summoning the pedestal marker, under the
same heavy synchronous load as #1. This block ran *before* the Red
House placement, so the throw aborted the rest of the handler and the
house (`/place template postapocalypse_structures:red_house` + all its
interior fixups/loot removal) never ran — walls/pedestal/waystone were
already down, but no house. Fixed: moved the marker/pedestal-state block
to run *after* the house is fully placed (so a repeat only costs
targeting/HP, never the visible base), and added a real retry
(re-summon + re-query once) before giving up and logging an error
instead of throwing.

**3. Structures still too close.** The same batch's exclusion_zone fix
anchored all 29 retuned structure_sets against a new
`minecraft:ocean_monuments` override — an unrelated, sparse oceanic
structure with no bearing on the actual density-tier structures
colliding with each other. The same boot's log has real proof this did
nothing: `[Berezka API] structure the_lost_city:train ... is spawned
inside other structure the_lost_city:post`, `villages_city` inside
`big_city_structure`, and cross-mod overlaps
(`abandoned_structures:gas_station` inside `the_lost_city:roads`,
`the_lost_city:train` inside `abandoned_structures:house1`). Real root
cause: `the_lost_city:train.json` and `villages_city.json` were the only
2 of Lost City's 12 own structure_sets missing the `exclusion_zone`
their siblings already have against `the_lost_city:city`, and the
previous session's 900d52c density retune tightened `abandoned_structures`
etc. down to 28/14-chunk spacing without ever excluding them from Lost
City's own (deliberately untouched, still sprawling) city footprint.
Fixed: repointed all 29 files' `exclusion_zone.other_set` from
`minecraft:ocean_monuments` to `the_lost_city:city` (the structure
actually causing the collisions), added the same exclusion_zone to
`train.json`/`villages_city.json` to match their siblings, and deleted
the now-pointless `ocean_monuments.json` override (it also silently
changed vanilla ocean monument separation from 5 to 28 — reverted to
stock behavior as a side effect).

**Not yet playtest-confirmed** — fixed from real log evidence and
syntax-checked, but needs a fresh-world boot to verify the fall/base/
spacing symptoms are actually gone.

---

## Tier 2 trap replacements + Track C follow-ups — built and sandbox-verified, 2026-09-09

User dispatch: "tier 2 [trap replacements] and [the Track C items not
picked up: SecurityCraft turret-recipe modules, turret combat-feedback
effects, tooltip tier color-coding for Tier 2/3]." Built directly in
this session (no build-session peer was online) rather than dispatched —
full spec for the trap-replacement half already existed in this file's
own now-superseded "Tier 2 trap replacements... NOT BUILT" entry and
FEATURES.md; the other 3 items were only ever a one-line "not picked up"
note in Track C's own writeup, fleshed out here for real before building.

**Vacuum Block → Item Collectors.** Verified real via CurseForge's own
file list (not trusted from FEATURES.md's already-stale "1.1.7" pointer —
1.1.10 (file 5272968) is the actual newest build whose `versions` list
still includes 1.20.1, added via `packwiz curseforge add --addon-id
395620 --file-id 5272968`, which auto-resolved 2 real dependencies,
SuperMartijn642's Core Lib + Config Lib). Real id `itemcollectors:
basic_collector`, extracted directly from the jar's own recipe/model
JSON. Re-recipied in `tier2_recipes.js` onto the Tier 2 loot-pool filler
convention (quartz/redstone_block/iron_block). `vacuum-blocks.pw.toml`
removed via `packwiz remove`.

**Arrow Turret → Musket Sentry promoted to the Tier 2 gate.** Arrow
Turret's recipe cut entirely from `tier2_recipes.js`; Medieval Defense
Turrets uninstalled outright (`packwiz remove medieval-defense-turrets`)
rather than left with dead weight — its only other content is a whole
medieval-fantasy tech tree (catapults, knights, an orbital cannon) that
was never used and doesn't fit this pack's theme, not just the one
turret. Quest chain reroute in `campaign.snbt`: "Wired for War" removed
entirely (it had zero of its own dependencies — a real root quest, not
just a leaf); "Beyond the Bow" inherits its exact former dependency
(`1454951A7FB14A26`) and its description no longer references the Arrow
Turret; the 4 quests that depended on "Wired for War" ("Anvils From
Above", "Wired Different", "Room to Grow", "Turn Up the Heat") now
depend on "Beyond the Bow" instead — same tree shape, one node removed
and its position taken over, not a rebuild. "Waste Not" retargeted from
`vacuum_cleaner:vacuum_block_tier_1` to `itemcollectors:basic_collector`
with a rewritten description.

**SecurityCraft turret-recipe modules — real ids extracted from the jar,
not guessed.** `securitycraft:redstone_module`/`smart_module`/
`speed_module` (all real, already vanilla-material `crafting_shaped`
recipes, no gate of their own). Injected one per recipe into the 3 real,
data-driven components downstream of `tech_tablet_mechanics` — the
turret HEADS themselves stay out of reach (hardcoded-Java-only assemble
step, documented in `tier2_recipes.js`'s own header, unchanged since
Track C): `turret_base_t_0` (AI-controlled base) gets Smart Module,
`manual_turret_base_t_0` (player-aimed base) gets Redstone Module,
`winding_mechanism` (shared by both bases + the Workbench itself) gets
Speed Module — each picked to match what that module actually does in
SecurityCraft, not arbitrary.

**Turret combat-feedback effects — new `turret_combat_feedback.js`,
built from decompiling both turrets' real firing procedures, not the
mod's JEI listing.** Musket Sentry (a real traveling-bullet turret, every
shot spawns `advanced_tower_defense_mod:pellet` — a real vanilla
`AbstractArrow` subclass) gets all three requested effects: muzzle flash
on pellet spawn, a throttled per-tick tracer trail while pellets are
live, and an impact particle on hit (filtered by vanilla's own "arrow"
damage message id — real, but a roster-wide caveat documented in the
file's own header, not hidden). Anvil Launcher turned out to be a
fundamentally different mechanic on decompile (a real vanilla
`minecraft:falling_block` dropped from Y=290, not a projectile at all,
and its actual landing damage isn't reachable by any KubeJS-visible
damage-type hook with confidence) — given a distinct, honestly-scoped
pair instead: a launch telegraph at its real sky spawn point, and a
landing impact detected by polling its tracked UUID until it disappears
from `level.getEntities()` (same idiom as `ladder_climb_assist.js`), not
a damage-type guess.

**Tooltip tier color-coding, Tier 2 updated + Tier 3 added.**
`tooltip_tier_colors.js`'s Tier 2 entries swapped for the real
replacement items above (`itemcollectors:basic_collector`, both real
ATD turret-head item ids); Tier 3 added for the first time — 6 real ids
pulled from `campaign.snbt`'s own Storage & power system quest chapter
(`immersiveengineering:diesel_generator`/`tesla_coil`,
`refinedstorage:controller`, `sophisticatedstorage:barrel`,
`fluxnetworks:flux_plug`, `create:nozzle`), not guessed.

**Verified for real, not just syntax-checked.** `node --check` clean on
all 3 touched/new scripts; `campaign.snbt` brace/bracket-balanced. A real
full-mod-set sandbox boot was built specifically for this (a cached
sandbox from an earlier session turned out to be stale — missing 8 mods
including Advanced Tower Defense itself, which produced 6 real "result
can't be empty" recipe failures on the first boot attempt; rebuilt from
the live CurseForge instance's own current 81-mod `mods/` folder instead,
which caught the gap immediately). Clean result: `Done (4.681s)!`,
**29/29 KubeJS server scripts, 0 errors**, **13 recipes added, 8 removed,
0 failed**, **FTB Quests: 41 quests, 0 parse errors**. Every touched item
id (`itemcollectors:basic_collector`, all 3 SecurityCraft modules, all 3
re-recipied ATD components, both turret-head items, all 6 new Tier 3
tooltip items) RCON-confirmed real via `/give` (each returned "No player
was found", not "Unknown item" — proof the id itself parsed, not just
that the recipe didn't error). All 3 entity ids used in the new combat-
feedback script (`pellet`, `turret_t_0_musket_heavy_metal`,
`turret_t_0_anvil_launcher`) RCON-confirmed via `/summon`. The only 4
ERROR-level log lines present are pre-existing, already-documented ATD
quirks from Track C's own verification (a vampirism-tag/holy-water-tag
soft-dependency gap and one stale `deleted_mod_element` advancement) —
none reference anything built in this pass.

**Not yet confirmed by an actual player session** — sandbox boot proves
scripts/recipes/quests/ids are real and error-free, not the in-world
visual feel of the muzzle flash/tracer/impact effects or whether the
SecurityCraft-module recipes read as a sensible cost in practice.

---

## RESOLVED 2026-09-09 — BountyBags TOML regeneration (was URGENT)

**Confirmed fixed, checked directly against the live instance - no
action needed.** `config/bountybags/*.toml` mtimes are now Sep 9 09:05
(not the stale Sep 3 this entry originally recorded), and all 5
previously-missing items are present: `uncommon_bag.toml` has
gold_nugget/netherrack/arrow/carrot/kubejs:shrapnel, rare/epic both have
kubejs:shrapnel, legendary has both kubejs:shrapnel and
minecraft:totem_of_undying. Someone already did the delete-and-restart
(or `/bountybags edit` restore-defaults) this fix called for, between
this entry being written and now - not this session, not verified who.
Worth a live playtest confirmation that drops actually happen at the
expected rates, but the loot-table content itself is confirmed current.
Original finding kept below for context.

**Original finding, 2026-09-09**: BountyBags loot-table edits since
2026-09-03 had never actually reached the live game. Found during the
full-mod-set merge
verification pass (Phase 0/1 + Track B + Track C + the multiplayer
shared-state fix, all booted together for the first time). Not a bug
in this pack's own scripts — a real, decompiled characteristic of the
installed BountyBags jar: `LootDefinitionStore.loadAll()` reads
`data/bountybags/loot_tables/items/*.json` into
`config/bountybags/<tier>_bag.toml` exactly once, the first time that
TOML file doesn't exist, and never again — every later boot reads only
the TOML, never the JSON. A prior session already hit this once (see
FEATURES.md's "Real bonus lesson" note) and patched the live
`legendary_bag.toml` directly for the totem_of_undying drop, but that
was a one-off, not a standing practice - checked the live CurseForge
instance's actual `config/bountybags/*.toml` directly on 2026-09-09:
every file's mtime is 2026-09-03, and `uncommon_bag.toml` is
confirmed missing gold_nugget, netherrack, arrow, carrot, AND the new
kubejs:shrapnel entry - five real additions across multiple sessions
that were each individually believed shipped and never actually were.

**Fix needed on the live instance (not something this session can do
per [[feedback_live_save_write_permission_boundary]])**: either delete
`config/bountybags/{uncommon,rare,epic,legendary}_bag.toml` (the 4
tiers this pack actually uses - dragon/warden/wither are unused, see
loot_bag_drops.js) so BountyBags regenerates them from the current JSON
on next boot, or have an op run `/bountybags edit <tier>` in game and
click Restore Defaults per tier (real command, decompiled and
confirmed - `admin.edit` permission or op status required). Either way
needs a real server restart/reload afterward and is worth a live
playtest check that shrapnel (and the older missing items) actually
drop now. Documented directly in `loot_bag_drops.js` and
`shrapnel.js`'s own headers so this stops being a one-time lesson that
doesn't generalize - check that comment before any future BountyBags
loot-table edit.

---

## Desert dominance + structure sparseness — live feedback 2026-09-08

Direct feedback, unprompted by any roadmap item: "the all one big giant
desert biome looks bad" + "structure gen and density is still not
right." Investigated from the real current files, not guessed — two
separate root causes found, both traced to earlier fixes that were each
individually reasonable at the time but interacted badly.

**1. Biome dominance — real root cause, fixed, needs live verification.**
The live `overworld.json` `multi_noise` biome source had 7 parameter
points, but 4 of them (57%) were desert/badlands. Real cause: the
2026-09-06 savanna-removal fix (this file, "Savanna removal..." entry
above) replaced savanna's and savanna_plateau's old parameter
coordinates with *more* desert/badlands points, specifically because
plain deletion had made that territory fall to plains/meadow instead —
correct call at the time (the ask then was "more desert feel"), but
never revisited once desert/badlands ended up dominant. **User
confirmed direction 2026-09-08: cut desert/badlands back down.**
Fixed by converting those same two points from desert/badlands back to
`minecraft:plains` and `minecraft:meadow` (same parameter coordinates,
just the biome id changed) — not `savanna`/`savanna_plateau` again,
since those specific biomes were the ones that drew the original "big
blob crowding the desert" complaint. Ratio now desert/badlands 2 of 7
(~29%), down from 4 of 7 (~57%).

**Verified live, 2026-09-08, real grid sample — found a likely
overcorrection.** No sandbox/server access existed in this session, so
one was built from scratch: a genuine vanilla 1.20.1 server (not the
live CurseForge instance — a separate throwaway copy, never touched the
real save) booted with just the two real files that drive this
(`overworld.json` + `overworld_flat.json`) as a datapack, sampled via
real `/execute if biome` queries over RCON, not guessed. Real
methodology bugs hit and fixed along the way: 1.20.1 datapacks need
`functions`/`tags/functions` (plural) not the 1.21+ singular naming;
automatically-triggered load-tag functions run with feedback silenced,
needed RCON to read scores back; `/execute if biome` does NOT force
chunk generation (only `/setblock`-style edits do, and only within
already-loaded chunks) — confirmed the real ~190-block auto-loaded
radius around spawn by direct probing rather than assuming one.
**Real result**: sampled 1444 points on a 10-block grid within that
confirmed-loaded ~185-block radius of world origin — 0% desert, 0%
badlands, ~85% plains, ~10% meadow (~5% unaccounted, edge-of-radius
noise). Zero desert/badlands hits in a ~370-block-wide area is a much
bigger swing than "roughly 2 of 7 points" suggested.
**Real caveat**: this measured the area around world origin (0,0) in a
bare-vanilla sandbox, not the pack's actual live spawn point, which
`playtest_starter_kit.js`'s real biome search deliberately hunts
outward from origin specifically for a desert/badlands hit (so the
player's immediate surroundings should still be real desert regardless
of this result). What this does show: large stretches away from that
hand-picked spawn spot may now read as completely desert-free, a bigger
overcorrection than "cut back down" implied.
**Decided 2026-09-09: keep as shipped (2 of 7).** User confirmed after
seeing the real 0%-in-sample-area result — matches what was asked
directionally, want to see it in actual play before adjusting further
rather than pre-compensating for a result from a single sampled
neighborhood. Biome fix considered done pending a real playtest
opinion.

**2. Structure sparseness — real root cause found, fix scoped, not yet
built.** The world border starts at half-width 25 blocks and only
reaches ~62 by wave 8 (`base_expansion.js`'s own escalating curve,
continuing to grow slowly after). Checked every active structure_set's
real `spacing` value (chunks, not blocks) against that: even the
tightest currently in use (`the_lost_city:post` at 10 chunks/160
blocks) exceeds the wave-8 half-width, and the bulk of them (Philip's
Ruins, Abandoned Urban, The Lost City's other sets) sit at 16-48 chunks
(256-768 blocks) — Watchtowers/Abandoned Structures were deliberately
tuned even sparser (80-120 chunks) as an intentional low-priority tier.
Real reason past retuning passes didn't fix this: each was calibrated
against a border-size assumption (270, then 166, then 125 total width)
that kept shrinking separately (the border-growth curve itself got cut
twice for "expands too fast" complaints) after the structure retune
already shipped, so the spacing numbers were chasing a moving target.

**Real complication, surfaced and resolved with the user**: the
2026-09-02 "Exploration pacing retune" (see this file/FEATURES.md)
deliberately reduced near-spawn density on purpose, direct feedback at
the time was "too dense from wave 1, want exploration to feel
midgame." **User confirmed 2026-09-08: keep that midgame-gating intent
— early game stays deliberately sparse — but retune so midgame
(~wave 8+, where the border is actually large enough) is genuinely
dense, which today's numbers fail even there.**

**Real target found, not arbitrary**: `structure_loot_progression.js`
already defines `MID_TIER_RADIUS = 60` and `HIGH_TIER_RADIUS = 120` for
loot-rarity-by-distance — and the border's own half-width curve crosses
60 blocks right around wave 8 and 120 blocks around wave 13-15. Tying
structure spacing tiers to these same two radii means structure density
and loot rarity progress on the same schedule instead of two
independently-tuned systems that happen to overlap by coincidence.
Proposed 3-tier retune (not yet applied to any file):
- **Near tier** (reachable inside the ~60-block MID_TIER ring, so it's
  actually findable by the time it stops being "too dense to want
  early"): target spacing ~4-6 chunks (64-96 blocks). One or two
  representative pieces per mod family, not everything — e.g.
  `the_lost_city:post`/`roads`/`tower`, `abandoned_urban:gas_station`/
  `fire_tower`, `philipsruins:desert_structures`, `u_desert:pillager_outpost`,
  postapocalypse_structures' 4 house sets.
- **Mid tier** (reachable inside the ~120-block HIGH_TIER ring, roughly
  wave 13-15+): target spacing ~10-16 chunks (160-256 blocks). The rest
  of the_lost_city/abandoned_urban/philipsruins sets currently at
  24-50 chunks.
- **Far tier** (genuinely late/endless-only, matches the loot system's
  own "found later, higher value" framing): target spacing ~24-32
  chunks (384-512 blocks) — pulled down from Watchtowers/Abandoned
  Structures' current 80-120 chunks (1280-1920 blocks), which would
  need a border half-width that large — realistically never reached
  given how the escalation curve grows, wasting the content entirely
  rather than making it "rare."
- **Real risk, not glossed over**: ~40 structure_sets are simultaneously
  active. This pack has a documented crash history
  ([[Radium chunk_region crash]]) from far fewer (~7) simultaneous
  dense sets colliding during jigsaw placement. Tightening this many
  sets at once needs the same real fresh-world sandbox boot + crash-log
  check every past structure_set change in this pack has required, not
  a blind bulk edit — likely staged (near tier first, verify, then mid,
  then far) rather than all 40 files in one pass.
- **Built and verified live, 2026-09-09.** Same throwaway sandbox
  extended to the full modded pack: Forge 47.4.10 + all 73 real mod
  jars (copied from the live CurseForge instance's own `mods/` folder
  rather than re-downloading — a few mods, including the new
  `u_desert`, are flagged "excluded from the CurseForge API" and can't
  be fetched via packwiz outside the CurseForge client). Real,
  individually-reasoned pass, not a blanket edit — 29 files retuned:
  - **The Lost City (all `the_lost_city:*` sets) deliberately left
    untouched**, matching this file's own earlier "intentionally
    excluded from the reachability-retune pattern" note — it has its
    own internal overlap safeguards tuned to its stock spacing, and
    retuning it once already caused a real spawn-inside-a-generating-
    city incident.
  - **`minecraft:villages` left untouched** — deliberately widened
    earlier so villages stop pulling wave mobs off-target; retuning it
    back down would undo that.
  - **Near tier** (8 files: `abandoned_urban` gas_station/fire_tower,
    `philipsruins:desert_structures`, `u_desert:pillager_outpost`,
    all 4 `postapocalypse_structures` houses) → 6/3 chunk spacing/
    separation.
  - **Mid tier** (16 files: remaining `philipsruins` sets, remaining
    `abandoned_urban` sets) → 14/7.
  - **Far tier** (5 files: both `watchtower_building` sets, all 3
    `abandoned_structures` sets) → 28/14.
  - **Real crash check**: one real structure-overlap event did occur
    (`abandoned_structures:gas_station` spawned inside
    `abandoned_structures:house2`, Berezka API's own handler destroyed
    the redundant one) — this is the mod's own designed self-heal, not
    a crash, and the server reached `Done` clean afterward. The
    Radium `chunk_region` mixin (the actual fix for this pack's
    documented crash history) was already force-disabled in the
    shipped config, so this stayed safe.
  - **Real /locate results, before → after** (from world origin):
    `abandoned_urban:gas_station` 24-chunk baseline never queried at
    this exact tier before → now 35 blocks; `abandoned_urban:fire_tower`
    → 22 blocks; `postapocalypse_structures:redhouse` → 16 blocks;
    `philipsruins:ancient_ruins` (was 48-chunk tier) → 81 blocks;
    `abandoned_structures:gas_station` (was 80-chunk far tier, baseline
    unqueried) → 236 blocks; `watchtower_building:abandoned_watchtower`
    (was 80-chunk) → 658 blocks. Near/mid tier structures now land
    comfortably inside the wave-8 border (half-width ~62); far tier
    lands in the range endless-phase border growth actually reaches,
    not thousands of blocks out.
  - **Real, accepted limitation, not fixed by this pass**: desert-gated
    structures stay effectively unreachable —
    `philipsruins:desert_structures` 3823 blocks away,
    `u_desert:pillager_outpost` 4460 blocks away — because desert
    biome itself is now scarce (2 of 7 multi_noise points, see the
    biome fix above), so most of even a tightly-spaced desert-only
    set's placement attempts fail the biome check. Tightening spacing
    further doesn't fix a biome-availability problem. **User decision
    2026-09-09**: proceed with the spacing retune as-is and accept this
    trade-off, rather than revisiting the biome ratio again.
  - Deployed to the repo's real `pack/kubejs/data/` (not just the
    sandbox) — same files the live instance uses.
  - **Not yet playtest-confirmed** — sandbox-verified only, same
    standing caveat as every other worldgen change in this pack.

---

## Roadmap: tier-by-tier feature-rich buildout (2026-09-08)

**Status: user has playtested and is happy with everything shipped so
far — the 2026-09-06 "polish before new tiers" gate is explicitly
lifted for this content**, per [[feedback_polish_before_new_tiers]]
(now superseded) and [[project_frenetic_pivot_and_research_batch]].
Direct instruction: focus on getting the game "feature rich," organized
tier by tier, each tier shipping with its full bells-and-whistles - not
just the core mechanic. This section is the ordered build plan for
everything decided/specced in FEATURES.md's "Frenetic-combat pivot &
tower-defense research batch" section (2026-09-08) plus the
already-parked Storage & Power system, which now has a real reason to
move: Tier 3 can't ship its Tesla Coil without it.

**Scope note, updated 2026-09-08**: Hardcore mode, Demolition Zombie,
and Mutants-variety mob content were older, separate specs (2026-09-01)
not originally part of this research batch - user explicitly asked to
fold them in, now placed at Phase 1 (Demolition Zombie, Mutants
variety) and Phase 5 (Hardcore mode) below, on the same "spec-only,
not dispatched" footing as everything else here.

**Dispatched 2026-09-08** to the build session (`tower-defense-modpack-ca`)
as 3 parallel tracks: Track A (Phase 0+1), Track B (Phase 3), Track C
(Phase 2→4→5-boss-half, internally sequenced). Not sent piecemeal -
one dispatch covering the whole roadmap, user wants to check back in
once when it's finished rather than approve each item. Each phase
lists real open forks that need a decision before it's actually
buildable, not just a to-do list. Send phases individually as they're
ready - see "Can these run in parallel?" below, the ordering isn't as
linear as phase numbers suggest.

**Can these run in parallel? Yes, mostly - checked real file/system
overlap, not assumed.** Phase numbers are priority order, not a strict
build sequence:
- **Phase 0, Phase 1, and Phase 2 are fully parallel-safe** - different
  mods, different script files, no shared state. Real precedent check:
  the pack's actual built Tier 1→2 recipe (Medieval Defense Turrets'
  Arrow Turret) is a plain re-recipe (`bow + planks + iron_block`), it
  does NOT consume a Tier 1 item - so there's no established
  "each tier consumes the previous tier's item" pattern that would
  force Phase 3 to wait on Phase 2's real item IDs either, unless that
  gating is deliberately wanted as a new design choice.
- **Phase 3's mod-install + Tesla Coil basic setup can start in
  parallel with Phase 2** for the same reason. Its Flamethrower Nozzles
  sub-item needs its own internal damage-check first, not a cross-phase
  block.
- **Phase 4's core system (boss spawn, bossbar, music) is fully
  parallel-safe** - vanilla-command-driven, no dependency on any other
  phase's items. Only its boss-kill-loot detail references the
  shrapnel item from Phase 2 - a soft dependency, resolved by just
  deciding shrapnel's real item ID early rather than blocking all of
  Phase 4 on Phase 2 finishing.
- **Phase 5 (Hardcore mode) splits cleanly**: the crafting-recipe Totem
  of Undying source is parallel-safe with everything; the boss-kill-drop
  source genuinely needs Phase 4's boss system to exist first.
- **Phase 6 (Bounty shop)** is parallel-safe but low-priority and needs
  real design work before it's buildable regardless of what else is in
  flight.
- **Internal-only ordering** (not cross-phase): Phase 2's ammo-economy/
  SecurityCraft-module-recipe/combat-feedback sub-items all need real
  Advanced Tower Defense item IDs confirmed first - that's a first-step
  inside Phase 2, not a blocker on anything else.

### Phase 0 — Realistic Airdrop swap-in — Done, 2026-09-08

Built and syntax/sandbox-verified (see docs/FEATURES.md's "Phase 0/1
build" entry for the full decompile writeup). Real, load-bearing
correction found before building: the "already-verified facts" this
phase started from (only two 1.20.1 files, both CurseForge Beta) were
themselves stale - CurseForge actually has a whole non-beta 1.0.0.x
release line between the old 0.9.5 beta and the newer 1.1.0 beta.
Shipped on **1.1.0-1.20.1-beta** anyway (CurseForge file 7689163)
after diffing its decompiled bytecode against the newer "release"-
tagged hotfix3.0 build directly - the beta is a genuine refactor, not
just a version bump, and adds a real Xaero's Minimap waypoint
integration (`addwaypointxaero`, confirmed in
`MobairdropticksProcedure`) this pack can use for free since Xaero's is
already installed.

Trigger rebuilt exactly as specced: `wave_airdrop.js`'s
`maybeTriggerWaveAirdrop()` is now `if (waveNumber % 5 !== 0) return`,
the old `WAVE_AIRDROP_MIN_WAVE`/`WAVE_AIRDROP_TIME_LIMIT_TICKS`
constants and the whole countdown-display `PlayerEvents.tick` block are
gone. Real command chain confirmed by decompile, not guessed from the
mod's listing: `/setairdrop random @r <height> <length> <driftmin>
<driftmax> <blockid> <loot_table> <pin> <map>` - `@r` really is a plain
vanilla random-player selector here (nothing dyairdrop-specific), and
`<loot_table>` really does resolve through genuine vanilla
`RandomizableContainerBlockEntity`/`{LootTable:"..."}` NBT (confirmed
by tracing `SetairdropCommand` → `Flycode3neoProcedure` →
`MobairdropticksProcedure`'s own `setblock ... {LootTable:"<value>"}`
call) - a custom pack-registered loot table id works exactly like a
vanilla one, settling the "still needs verification" item from the
original spec. Points at a new real vanilla-format loot table,
`kubejs:chests/wave_airdrop` (`pack/kubejs/data/kubejs/loot_tables/
chests/wave_airdrop.json`), same reward composition the old
`config/airdrop/wave8_bonus.json` pool used (now deleted).

Real config judgment calls, `pack/config/dyairdrop.toml` (real field
names confirmed by decompiling `AirdropconfigConfiguration` directly -
this mod has no config beyond this one toml, everything else is
`/setairdrop` command arguments): `enable=false` (the mod's own
autonomous "global airdrop every N days" event is disabled - this
pack's own wave%5 trigger replaces it, not layers on it, same
"no autonomous world-altering systems on top of what this pack already
controls" caution applied elsewhere), `enableenemies=false` (the mod's
default hostile-mob-near-crate spawn would reintroduce a pillager - a
non-zombie-family mob stripped from this pack's roster on 2026-09-06 -
and a second, untracked spawn source), `forceload=false` (avoids a real
risk the mod author's own comment flags, unneeded since every drop
targets a position near an already-loaded online player).

Verified: `node --check` clean on all touched/new scripts, loot table
JSON parses, and a real full-mod-set sandbox boot (see the "Phase 0/1
build" FEATURES.md entry for the boot log details) - **not yet
confirmed by a live playtest** of an actual triggered drop (crate
visually landing, waypoint appearing, loot resolving on open).
**Explicitly provisional per the original ask** - "I may come back to
this mechanic to see if there is a better gameplay feel," don't treat
every-5th-wave as locked.

### Phase 1 — Tier 1 finish + the frenetic layer — Done, 2026-09-08

Built and sandbox-verified (full writeup in docs/FEATURES.md). Literal
status per the original bullet list:
- **Enhanced Hordes install - done.** Real modId `enhanced_hordes`
  (CurseForge `nojustgavin`, project 899308, file 8362601,
  `eh2.0-forge1.20.1.jar`). Real config schema, confirmed by decompile:
  there's no toml at all, only `/gamerule hordeStacking` (kept default
  true - the actual climb-assist effect) and `/gamerule
  hordeMultiplying` (a separate, unrelated "zombie digs an extra zombie
  out of the ground" autonomous-spawn mechanic - **disabled** via a new
  `enhanced_hordes_config.js`, same reasoning as every other
  autonomous-spawn caution in this pack: it would be invisible to
  `wave_status.js`'s hostile counter and un-targeted by
  `mob_aggro.js`'s pedestal redirect). Its block-smashing mechanic
  (`hordeSmashingPower` gamerule) was checked against the pack's real
  wall materials before shipping, not assumed safe: it's double-gated
  behind `mobGriefing` AND a small hardcoded allowlist tag
  (`forge:horde_breakable` - leaves/crops/glass/ice only, confirmed by
  reading the jar's own shipped tag JSON) that contains zero wall/floor
  materials - SecurityCraft's reinforced perimeter stays exactly as
  safe as before regardless of this mod's own default settings.
- **Advanced Wall Climber API conflict check - done, no conflict
  found.** Decompiled Mutants and Zombies' `CrawlerEntity` directly:
  its climbing is implemented entirely through AWC API's own
  `ClimberComponent`/`ClimberPathNavigator` (a dedicated PathNavigation
  replacement). Enhanced Hordes' own stacking mechanic only ever
  touches entities tagged `forge:hordes` (a jar-shipped tag containing
  zombie/zombie_villager/zombified_piglin/husk/drowned/slime -
  `mutantszombies:crawler` is not in it) via plain `setDeltaMovement`
  nudges, never PathNavigation. Zero shared classes, zero shared tags,
  zero collision risk - both mods installed together safely.
  **Deliberately not extended** to Undead Nights'/Mutants and Zombies'
  own mob ids in this pass (the `forge:hordes` tag could be merged via
  a datapack override to widen the stacking effect to more of the
  roster) - flagged as a real, safe future follow-up once the base
  mechanic gets a real playtest, not built blind against mobs this mod
  was never tested against.
- **WWZ counter-mechanics - decided and built: wall-mounted stakes.**
  Checked real technical feasibility of all 3 researched options before
  picking, not arbitrarily - decompiled Simply Traps directly and
  confirmed it ships a dedicated `simply_traps:stake_wall` block (a
  real `HorizontalDirectionalBlock` variant, separate from the floor
  Spike Trap, with its own real per-tick contact damage) built for
  exactly this. `playtest_starter_kit.js` now places it along the outer
  face of the starting perimeter (skipping the intentionally-weak wall
  stretch and a buffer around the gate opening) as part of the base
  build, not a player-craftable item.
- **Tier 1 trap decay/degradation - decided: not built, scope creep.**
  Real judgment call: the Simply Traps/V01D pieces were just installed
  today (2026-09-08 merge) specifically to *simplify* Tier 1 after the
  custom Trapcraft-era degrade-and-break system was torn out and
  replaced by mod pieces exactly to avoid maintaining that kind of
  state - re-adding a custom per-kill break-chance system on top of
  fresh mod blocks would reverse that simplification the same day it
  shipped, for a mechanic nothing in this pass asked for by name. Fits
  this pack's "keep it lightweight" stance better as a "not now" than a
  "yes."
- **Simply Traps' Slime Trap - evaluated and built.** Real, decompiled
  finding: zero damage, a weak crowd-control push + slipperiness, not a
  damage tool - genuinely different from Spike Trap/Bear Trap, worth
  the near-zero cost of adding. Its own stock recipe needs
  `minecraft:slime_ball`, which doesn't exist anywhere in this pack's
  loot economy (no passive mobs, no slime in the roster) - re-recipied
  in `tier1_recipes.js` using materials already in the Tier 1 economy.
- **Tooltip tier color-coding - done for Tier 1 and Tier 2.** New
  `pack/kubejs/client_scripts/tooltip_tier_colors.js` (this pack's
  first client_scripts file). **Real correction caught while building**:
  this bullet's own "Tier 1 items already have final IDs" framing was
  stale - Vacuum Blocks (this bullet's own example) is actually
  colored/treated as Tier 2 by the real code (`tier2_recipes.js`'s own
  header comment and file placement, not this file's summary line),
  alongside Medieval Defense Turrets' Arrow Turret. Colored per the
  real recipe-file tier, not the stale doc line.
- **Defense-breaching enemies (Demolition Zombie) - already shipped,
  no new work needed.** Checked the real current code before assuming
  this was still open: the 2026-09-06 zombie-apocalypse roster pivot
  (see docs/FEATURES.md's "Mob roster & defense-breaching threats")
  already put `undeadnights:demolition_zombie` into wave 8 and the
  `boss_horde` endless-phase pool, verified live via real `/summon` at
  the time. **Real stale-premise catch**: this bullet's "also reinforce
  the gate" sub-item no longer applies - `playtest_starter_kit.js`'s
  gate has had no door at all since 2026-09-04 (a deliberate, later
  redesign to a genuinely open 3-wide gap, direct playtest feedback),
  so there is nothing left to reinforce; re-adding a door would reverse
  a more recent, explicit design decision. The watchtower this bullet
  also referenced was separately removed entirely on 2026-09-03. Left
  as-is - the real remaining exposure (placed Tier 1+ machines, and the
  deliberately-unreinforced weak wall stretch) already matches this
  bullet's own "genuine strategy, not a free pass" intent without new
  construction.
- **Mutants and Zombies - already shipped, no new work needed.** Same
  2026-09-06 roster pivot already installed the mod, confirmed its real
  ids by decompile, and wired all 8 mobs into `WAVES`/loot
  bag tiers/the endless horde config/quest-relevant hostile-tracking
  lists. The one genuinely new question this phase's bullet raised
  (Advanced Wall Climber API vs. Enhanced Hordes) is answered above.

Verified: `node --check` clean on every touched/new script, and a real
full-mod-set sandbox boot (see docs/FEATURES.md's "Phase 0/1 build"
entry) - not yet confirmed by a live playtest of the actual stacking
visual, stake-wall damage tick, or tooltip rendering.

### Phase 2 — Tier 2: automated turrets + economy

**Depends on**: real Advanced Tower Defense block/item IDs confirmed
first (everything else in this phase needs them).
- **Advanced Tower Defense's Musket Sentry + Anvil Launcher**, added
  alongside the already-live Medieval Defense Turrets (MDT's Arrow
  Turret stays untouched). Real work: verify ATD's actual IDs/recipes
  from its own shipped data, re-recipe/tier-gate via the established
  `event.remove`+`event.shaped` pattern, real quest slot in the
  existing turret section of `campaign.snbt`. **Done, 2026-09-08 (Track
  C).** "MDT's Arrow Turret stays untouched" is now stale/superseded —
  see "Tier 2 trap replacements" below.
- **Ammo economy recipes** - iron_bolt from flint/barbed_wire/iron,
  bonus arrows from iron_spikes/feather/stick (the research's examples,
  needs real ATD ammo item IDs first).
- **Shrapnel/scrap folded into loot bag tables** - real open fork:
  craft-material (feeds ammo recipes) or pure flavor loot - decide
  alongside the ammo-recipe design above, not independently.
- **SecurityCraft modules as turret-recipe components - done, 2026-09-09**
  (MDT half moot - Arrow Turret/MDT itself cut the same day, see "Tier 2
  trap replacements + Track C follow-ups" near the top of this file).
- **Turret combat-feedback effects - done, 2026-09-09** - see the same
  entry.
- **Tooltip tier color-coding, extended to Tier 2 items - done,
  2026-09-09**, and Tier 3 too - see the same entry.

### Phase 3 — Tier 3: power + energetic weapons

**Done, 2026-09-08.** Full writeup in FEATURES.md's "Storage & power
system" entry (search for "BUILT, 2026-09-08"). Summary, one item per
original bullet:
- **Storage & power system** - all 4 mods installed (Sophisticated
  Storage + Sophisticated Core, Refined Storage, Immersive Engineering,
  Flux Networks). The 3 unchecked dependency lists are now checked two
  ways (packwiz's resolver + each real downloaded jar's own
  `mods.toml`) - all 3 confirmed dependency-free beyond the Forge/MC
  version floor, the "Fabric API required" hit from an earlier generic
  page scrape was a wrong-loader-variant artifact, not real for the
  Forge build actually installed.
- **Real, load-bearing correction to this phase's own dispatch**:
  "Create's own Tesla Coil" does not exist - decompiled the actual
  installed `create-1.20.1-6.0.8.jar`, zero Tesla Coil content anywhere
  in it. Built with **Immersive Engineering's real Tesla Coil**
  (`immersiveengineering:tesla_coil`) instead, picked over Create:
  Crafts & Additions' real (and also already-installed) Tesla Coil
  after decompiling and comparing both - see FEATURES.md for the full
  mechanics comparison and reasoning. This phase's "not Create: Crafts
  & Additions' Tesla Coil - already ruled out" framing was itself the
  error; corrected, not re-litigated blind.
- **Flamethrower Mechanics** - real check done by decompiling Create's
  actual fan-processing pipeline (`AirCurrent`/`AllFanProcessingTypes`):
  confirmed real, meaningful damage (4.0 dmg + 10s ignite per entry from
  a lava-catalyst stream, refreshed every tick an entity remains in it).
  Ships as a parallel/alternative Tier 3 choice, not a required second
  machine - real distinct playstyle (standing corridor vs. periodic
  single-target zap) at zero FE-chain cost (pure Create kinetic power,
  no dependency on the new mods at all).
- **Tesla Coil hit cinematics** - built, `tesla_coil_cinematics.js`,
  vanilla `electric_spark` particles + `lightning_bolt.thunder` sound
  centered on the struck entity, layered on top of the mod's own
  block-position zap sound/lightning render. Hooks `EntityEvents.hurt`
  filtered to the real `ieTesla` damage message id (decompiled/
  confirmed, not guessed).
- **Performance tip** - checked, real finding: Embeddium has no
  particle-count config of its own: decompiled the jar, the option it
  exposes is vanilla's own `options.particles` client setting, no
  server-side lever exists. Documented as player-facing guidance, not
  a code change.
- **Tooltip tier color-coding** - **not built this phase, real
  cross-track dependency block, not an oversight**: this is Phase 1's
  system to build first (Track A); it doesn't exist anywhere in this
  worktree yet (checked - no tier-color/tooltip file anywhere in
  `pack/kubejs`), so there's nothing here yet to extend to Tier 3
  items. Needs picking up once Phase 1's system merges in.
- **New quests for Tier 3 items** - done, 6 quests added to
  `campaign.snbt` (Wired Different, Room to Grow, No Cables Needed, The
  Grid, Sparks in the Dark, Turn Up the Heat), all branching off Tier
  2's "Wired for War". Sandbox-verified: FTB Quests loads all 40
  quests (was 34) with 0 parse errors.
- **Recipe/tier-gating** - deliberate choice made and documented: no
  re-recipe layer on any of the 4 mods' stock recipes. The Tesla Coil's
  own stock recipe already requires real IE-internal tech-tree
  progression (an HV Capacitor, from IE's own ore-processing chain) -
  a deeper, more meaningful gate than a materials swap, and swapping it
  for loot-tier fillers would let a player loot-shortcut past IE's own
  progression entirely, undermining the "tech pack feel" this system
  exists to deliver. The real gate is the quest dependency chain (all 6
  new quests sit behind Tier 2) plus IE's own component tree.
- **Real footprint cost, stated plainly**: the single biggest addition
  besides full Create - 5 new mod jars, Immersive Engineering alone a
  full standalone tech mod. Weighed against "keep it lightweight"
  explicitly in FEATURES.md, not ignored - the counter is this is a
  deliberate, one-time, user-requested investment scoped to Tier 3-4
  only, not creeping into every tier.
- **Sandbox-verified**: found and reused an existing throwaway
  dedicated-server sandbox (built by a sibling track this same
  session), copied to an isolated port so it wouldn't collide with a
  concurrently-running sibling server, populated from this worktree's
  real 79-mod `pack/mods` list + `kubejs`/`config`. Removed Mob
  Dismemberment from this throwaway copy only (real, pre-documented
  dedicated-server-only crash, unrelated to this phase). Clean boot,
  24/24 KubeJS server scripts at 0 errors, FTB Quests at 0 parse
  errors, RCON-verified every new block id real-placeable with real
  block-entity NBT (not placeholder stubs) - `immersiveengineering:
  tesla_coil`, `refinedstorage:controller`, `sophisticatedstorage:
  barrel`, `immersiveengineering:diesel_generator`, `fluxnetworks:
  flux_plug`, `create:nozzle` all confirmed live. **Real, honest side
  effect found**: Sophisticated Storage ships ~25 bundled advancement/
  recipe files referencing Sophisticated Backpacks (a separate mod, not
  installed) - real, non-fatal `Unknown item id` log noise on every
  boot, flagged rather than silently accepted. Not yet confirmed by an
  actual player session (placing/powering a real chain, a live Tesla
  Coil kill, standing in a Nozzle+lava stream) - needs a real playtest.

### Phase 4 — Boss wave capstone system

**Depends on**: benefits from Tier 2/3 items existing (for gear/loot
context) but isn't hard-blocked - could run in parallel with Phase 3.
- **Cadence decision** - which wave(s) get a boss. Resolves the same
  open fork already sitting in IDEAS.md ("Wave-clear reward: a
  building/machine places itself in the base... maybe only boss waves —
  cadence never decided") - decide both together, not separately.
- **Boss mob spawn** - custom stats, full netherite gear equip, zero
  drop chance so gear isn't farmable.
- **Boss bar** - real vanilla `/bossbar`, HP-tracked via a throttled
  tick handler (same idiom as `wave_status.js`'s actionbar counter).
- **Custom boss music** - real `.ogg` + `sounds.json` registration,
  `playsound`/`stopsound` commands, no mod needed.
- **Boss-kill loot** - `securitycraft:universal_block_reinforcer` +
  bonus shrapnel, consistent with the Phase 2 loot-bag fold-in decision.
- Screenshake is cut - no real Forge 1.20.1 mod exists (verified
  Fabric-only), not part of this phase.

### Phase 5 — Hardcore mode (independent toggle)

Folded in from "On hold," fully specced 2026-09-01 (see FEATURES.md's
"Hardcore mode" section). Real permadeath (player death or pedestal
destruction) softened by Totems of Undying, obtainable two ways: a rare
boss-kill drop and a new (vanilla has none) hard crafting recipe. Built
fully custom via KubeJS, not vanilla's native Hardcore flag - confirmed
that flag can't be turned on after world creation, no command/datapack
path exists. Optional toggle, not the pack's new default - endless-phase
scaling means every hardcore run eventually ends in death regardless of
skill, fine for opt-in but not a forced default. Pedestal deliberately
stays unhardened - defending it is meant to be real stakes, not
background scenery. **Real soft dependency**: the boss-kill-drop totem
source needs Phase 4's boss system to exist first; the crafting-recipe
source doesn't, so this could ship partially ahead of Phase 4 if wanted,
full design lands better once Phase 4 is in.

### Phase 6 — Exploratory, no committed design

- **Bounty shop (FTB Quests spend economy)** - FTB Quests has no native
  "deposit currency, buy item" mechanic; would need real custom
  scripting to detect deposits and grant rewards, a genuinely new
  technique for this pack. Only pick this up if there's real appetite
  for it once Phases 1-5 land.

## Ready to build

**9-item live feedback batch — built directly 2026-09-08, literal
numbering. All code/quest-file changes done, syntax-checked, not yet
confirmed by a real playtest:**
1. **Done.** Bounty quest tasks (`bounties.snbt`, all 5: First Blood/
   Exterminator/Culling/Reaper/Zombie Masher) were completable by just
   clicking the checkbox, bypassing the real kill requirement entirely -
   decompiled `CheckmarkTask.canSubmit()` directly, it's hardcoded
   `return true`, no config exists to change that. Switched all 5 to
   `type: "custom"` instead - `CustomTask` defaults `enableButton=false`
   (no player click possible) and `check=null` (no periodic auto-check
   either), completely inert until something external drives it -
   `bounty_kills.js`'s existing `ftbquests change_progress ... complete`
   commands keep working unchanged (Task's own type-agnostic
   `forceProgress()`, doesn't care what task type it's hitting).
2. **Done.** Hints & Tips chapter title (`tips_and_tricks.snbt`) was
   `"Tips & Tricks"` - FTB Quests treats `&` as a color-code shorthand
   prefix, and `& T` isn't a valid code, producing the "invalid
   formatting" error. Only `&` anywhere in the whole `ftbquests/` config
   tree. Changed to `"Tips and Tricks"`.
3. **Done.** Wave-cleared popup (`wave_status.js`) font "slightly
   smaller" - switched from `title` (big) to an empty title + `subtitle`
   (vanilla's smaller fixed HUD text), same real "subtitle only shows
   alongside an active title lifecycle" mechanic used for item 4.
4. **Done.** Pedestal damage-alert popup (`pedestal_health.js`'s
   `firePedestalAlert`) "way too large, reduce a lot" - dropped the big
   bold title line entirely (empty title + subtitle-only for the
   headline), moved the flavor line to a real `tellraw` chat message
   instead of dropping it, since chat won't get overwritten by
   `wave_status.js`'s own actionbar-based hostile counter the way a
   second title/subtitle call would.
5. **Done.** Advanced crafting table spawning with water in it - real
   root cause, not guessed: decompiled `CraftingStationBlock.class`
   directly, it's a real `SimpleWaterloggedBlock`. The structure's own
   NBT has a water source at this exact coordinate (a kitchen sink
   feature); `/setblock` replacing water with a waterloggable block
   auto-inherits `waterlogged=true`, same as hand-placing into water.
   Fixed with an explicit `[waterlogged=false]` in
   `playtest_starter_kit.js`'s setblock call - didn't need the "just use
   a normal crafting table" fallback.
6. **Done.** Mobs stuck stationary at the world border, not pathing -
   real root cause, confirmed by the actual numbers: the border starts at
   size 50 (half-width 25) and `base_expansion.js`'s own curve only
   reaches half-width 55 by wave 8, while `wave_spawner.js`'s spawn
   distance was a fixed 40-60 block radius - every hand-authored wave has
   been spawning mobs outside the border still active at that point,
   where vanilla's own border collision (applies to all entities, not
   just players, independent of the border-damage config) physically
   holds them at the edge. Spawn distance is now clamped to the border's
   own live half-width (minus a safety margin), recomputed every horn
   use, instead of the fixed band - scales automatically as the border
   grows.
7. **Done.** "Reach Further" quest (Crafting Station's connected-
   inventory explainer) moved from `campaign.snbt` to
   `tips_and_tricks.snbt` - same quest/task IDs preserved (checked the
   live save's own progress file first, confirmed unstarted, safe to
   move), dependency on "Open It" dropped since every other tips-chapter
   entry is standalone.
8. **Done.** Boomer Zombie now does real block damage on detonation, not
   just its existing poison-cloud/knockback. Decompiled Zombies More
   directly: the mod's own `BoomerChargedOnInitialEntitySpawnProcedure`
   already calls a real `level.explode(power 4.0f)` ~4 seconds after the
   original zombie dies/collides, but with
   `Level.ExplosionInteraction.NONE` hardcoded - zero block destruction
   by deliberate mod-author choice, no config exists. New file
   `boomer_zombie_explosion.js` adds an independent, real block-
   destroying explosion (0-fuse TNT, same "prefer a real vanilla command"
   idiom as the rest of this codebase) timed to the same +80-tick mark
   and captured spawn position the mod's own detonation uses, so it reads
   as one explosion, not two. Reinforced SecurityCraft walls stay
   explosion-immune regardless, same as every other explosive threat in
   this pack.
9. **Done.** Nether star pedestal-heal bug - real root cause: the old
   `BlockEvents.rightClicked` handler tried to both consume the item
   (`event.cancel()` + `stack.shrink(1)`) and stop Supplementaries' own
   native "place held item on the pedestal" interaction from also
   happening on the same click - `event.cancel()` doesn't reliably
   suppress that (client-predicted placement beats the cancel), so both
   systems raced for the same item, producing exactly the reported
   symptom (visibly placed, then "disappears" into a phantom slot on
   take-back - same add/remove desync class as the earlier rabbit-ghost
   bug). Fixed the same way `amulet_pedestal.js` already solves the
   identical problem for the amulet: stopped intercepting the click
   entirely, poll the pedestal's own real Container slot instead
   (`getDisplayedItem()`), and consume it for real via
   `setDisplayedItem(air)` - a real setter on Moonlight's
   `ItemDisplayTile` (decompiled directly), the pedestal's own single
   source of truth for "is an item here," never two competing paths
   again.

**Drop Trapcraft entirely — done, commit a92468c (2026-09-08).** Real
final picks differed slightly from the spec above (both replacements
below were caught during build, not guessed): `trapcraft:spikes` →
Simply Traps' `spike_trap`; `trapcraft:bear_trap` → V01D's Bear Traps'
`bear_trap_open` (ships with zero crafting recipe, one added from
scratch); `trapcraft:igniter`/`trapcraft:fan` cut with no replacement
(no real mod exists for either); `trapcraft:magnetic_chest` →
**Vacuum Blocks'** `vacuum_block_tier_1`, not Smart Storage as
originally proposed - Smart Storage was ruled out after decompiling
found no real item-collection logic anywhere in its jar despite its
store description. 2 FTB Quests entries removed (Spark and Flame, Herd
Them In), 3 updated in place keeping original task IDs so live-save
progress on 2 of them stayed intact. Verified via real sandbox boot
(23/23 scripts, 0 errors; 34 quests, 0 parse errors; 0 failed recipes)
before committing.

**7-item live feedback batch — dispatched 2026-09-08, literal numbering:**
1. **Done, 2026-09-08, syntax-checked, not yet playtest-confirmed.**
   Pedestal heal needs a visible animation/cue. User's real report:
   "the item stays suspended on the pedestal, and it's not till I tried
   to take it off that it was obvious that the item had been consumed."
   Real current code (`pedestal_health.js`'s `BlockEvents.rightClicked`
   handler) already does `event.cancel()` + `stack.shrink(1)` for both
   golden carrot and nether star - the item IS consumed correctly and
   never actually placed on the pedestal (that display is reserved for
   the amulet only). The only feedback right now is a plain chat message
   - add a real visible/audible cue at the moment of heal (particles at
   the pedestal position + a sound), same general idea as the existing
   pedestal-alert system's title+sound pattern, so it's obvious without
   needing to inspect. Keep the existing chat message too, this is
   additive. **Shipped as `totem_of_undying` particles + a
   `block.beacon.power_select` sound at the pedestal, fired from
   `healPedestalBy()` so it covers both the right-click heal and the
   wave-clear heal below with one change.**
2. **Done, 2026-09-08.** Wave-clear pedestal heal: 20% → 5%. Direct
   number change, `wave_status.js`'s
   `healPedestalByPercent(player, data, 0.2)` call - change the `0.2` to
   `0.05`. No other logic changes.
3. **Done, 2026-09-08, syntax-checked.** Countdown-between-waves pacing
   change - user confirmed the shape, ready to build. Current formula
   (`wave_status.js`,
   `countdownTicksForWave`): `min(1800 + 300*(waveNumber-1), 3600)`
   ticks - wave 1 = 90s, +15s/wave, capped at 180s (3 min) by wave 7. The
   wave-5 "you'll have more time to prepare from here on" title
   (`wave_status.js` ~line 168) currently fires at a wave that's still
   only 150s (2.5 min) under this formula - user wants it to actually
   mean something: 4 minutes at wave 5, then continued gradual growth
   afterward (the old cap flattened exactly where the user wants it to
   keep climbing).
   **Confirmed shape: kink at wave 5.** Waves 1-4 stay exactly as they
   are now, wave 5 becomes a new fixed 4-minute baseline, growth
   continues from there with no cap - matches "you'll have more time to
   prepare FROM HERE ON" literally, only the back half of the campaign
   changes pace. Concrete formula:
   ```
   function countdownTicksForWave(waveNumber) {
     if (waveNumber < 5) return 1800 + 300 * (waveNumber - 1) // unchanged: 90s→135s
     return 4800 + 300 * (waveNumber - 5) // wave 5 = 4min, +15s/wave after, no cap
   }
   ```
   Real thing to double check before shipping: `COUNTDOWN_MAX_TICKS`
   (3600) is referenced elsewhere in the codebase too (`wave_airdrop.js`'s
   own header comment cites it as a pacing reference for the airdrop
   timer) - confirm removing/changing the cap here doesn't need a
   matching update there, or that it was just borrowed as a rough scale
   and stays independent.
4. **Done, 2026-09-08.** Netherite Upgrade Smithing Template as a rare structure-chest find
   (not a bag reward).** Real fit found: `structure_loot_progression.js`'s
   `HIGH_TIER_POOL` (120+ blocks from spawn, already has real end-game
   items like `netherite_scrap` at weight 10, `diamond_block` at weight
   6). Add `minecraft:netherite_upgrade_smithing_template` at a low
   weight (3-5, rarer than diamond_block) with count 1-1 - "you'll find
   it if you are lucky in a structure" matches this pool's own existing
   rare-high-value-item pattern exactly, no new mechanism needed.
5. **Re-opened 2026-09-08 - real candidate found, not yet built.**
   Original investigation confirmed Paojiao134's Airdrop has no alternate
   delivery mode (Y=300 fall hardcoded) and "Apocalypse Structures: Radio
   Towers and Airdrops" was a structural mismatch (player-panel-triggered,
   not script-triggerable). User then separately named a specific mod by
   description ("Realistic Airdrop"), verified directly rather than taken
   on faith: **real**, CurseForge `naughty_keller85`, 1.2M+ downloads,
   genuine plane-flyover mechanic (configurable flight altitude, the
   plane physically flies across the sky and can crash into terrain if
   set too low - confirms it's a real flying entity, not a spawn-in-place
   effect), exposes `/airdrop @s [blockid] [true/false]` and
   `/setairdrop random|free [x] [z] [params]` commands - real
   command-triggerable surface, no KubeJS API found but commands are
   already this pack's established idiom (`server.runCommandSilent`)
   for exactly this kind of cross-mod trigger. **Real caveat, not
   glossed over**: no stable "Release"-type build exists for 1.20.1 -
   both 1.20.1 files (`0.9.5-1.20.1.jar`, Oct 2024; `1.1.0-1.20.1-beta.jar`,
   Feb 2026, actively updated) are CurseForge-labeled "Beta"; only the
   1.19.2 line has a full Release build. Worth a hands-on sandbox check
   of actual stability before committing, same rigor as every other mod
   pick, but not disqualifying on its own - many mods carry the Beta
   label indefinitely as a CurseForge convention rather than a real
   instability signal.
   **Decided 2026-09-08: replace the existing Paojiao134's Airdrop
   implementation outright**, not layer alongside it - one airdrop mod,
   not two. Real command syntax confirmed from the mod's own listed
   examples (not guessed): `/setairdrop free [x] [z] [height] [length]
   [blockid] [loottable] [true/false]` and a `/setairdrop random @r
   [height] [length] [driftmin] [driftmax] [blockid] [loottable]
   [true/false]` variant. **Real difference from the current mod, not
   yet resolved**: loot tables are referenced by a standard vanilla-style
   resource location (the mod's own example: `minecraft:chests/
   bastion_bridge`), not the current mod's custom `airdrop import`
   JSON-pool format - this likely means `wave_airdrop.js`'s existing
   hand-authored `config/airdrop/wave8_bonus.json` gets replaced by a
   real datapack-style loot table JSON instead (same mechanism this
   pack already uses for structure/chest loot elsewhere), but needs
   confirming against the mod's actual loot-loading code before
   building, not assumed from a description string.
   **What still needs verification before dispatch** (real unknowns,
   not guessable from the CurseForge listing alone):
   - The real mod id/namespace (jar is `dyairdrop`, but the command
     namespace/loot-table-lookup registry name needs confirming from
     the jar itself).
   - Exact semantics of `@r` in `/setairdrop random @r ...` - decompile
     to confirm whether this targets a random player or something else,
     since the current implementation's landing behavior (auto-inside
     the player's current world border, via Paojiao134's own
     `BorderIntegrationHandler`) has no confirmed equivalent here yet -
     `random` near the executing player may or may not reproduce it.
   - Whether a stock loot table id can be swapped for a real custom one
     registered by this pack (expected to work, standard vanilla loot
     table resolution, but confirm against the actual loot-loading code
     rather than assume).
   - A hands-on sandbox stability check given both real 1.20.1 files are
     CurseForge-labeled Beta (see above).
   **What building this touches**: swap the mod in `pack/`, rewrite
   `wave_airdrop.js`'s `maybeTriggerWaveAirdrop()` (the `airdrop
   import`/`airdrop summon` calls) to the new command + loot table id,
   convert `config/airdrop/wave8_bonus.json` to whatever real loot
   table format the new mod expects, keep the existing "SUPPLIES
   INBOUND" title/countdown UI as-is (independent of which mod supplies
   the crate). **Not yet built** - spec ready, holding behind the same
   playtest-first gate as the rest of this session's work.
6. **Done, commit a92468c (2026-09-08).** New `ladder_climb_assist.js` -
   a throttled tick handler detects a wave mob stuck next to a
   ladder/vine on its path axis and applies a direct upward
   `setDeltaMovement` nudge. Real prior history: this was investigated
   2026-09-04 and the recommendation then was "avoid ladders on exterior
   walls" rather than build a fix, since a full fix looked like it needed
   a custom pathfinder goal override. On rescoping, that turned out to be
   unnecessary - the gap is execution, not planning (vanilla's pathfinder
   already plans through the ladder node fine, it just doesn't reliably
   execute the climb), so a scripted assist was buildable with patterns
   already used elsewhere in this pack rather than a mixin/custom
   PathNavigation class. Verified via sandbox boot, not yet
   playtest-confirmed.
7. **Done, commit a92468c (2026-09-08).** `loot_bag_drops.js` redesigned:
   bag tier used to be gated by mob tier (only `RARE_MOBS`/`EPIC_MOBS`/
   `LEGENDARY_MOBS` could ever roll a Rare/Epic/Legendary bag). Now every
   wave mob gets an independent roll at each tier's own flat chance -
   `BAG_DROP_CHANCE = 0.74` on any kill, then a weighted tier roll within
   that (absolute odds: Uncommon 50%/Rare 15%/Epic 7%/Legendary 2%),
   generalizing the existing Legendary-jackpot mechanic's shape to all
   four tiers instead of mob-gating - the jackpot is folded into this
   roll, not kept as a separate additive one. Uncommon held at its
   existing ~50% deliberately, to protect the gold-economy pacing that
   was tuned against it. Real trade-off, flagged not hidden: total loot
   volume rises pack-wide since every kill now rolls for tiers it
   couldn't before. Verified via sandbox boot, not yet
   playtest-confirmed.

**7-item live feedback batch — dispatched 2026-09-06, literal numbering:**
1. **Done, 2026-09-06.** User doesn't like gold-ingot quest
   rewards anymore - since a basic (Uncommon) loot bag already has a real
   gold_nugget roll in it (weight 20, count 6-15, from the earlier gold-
   economy fix), a loot bag reads as a strictly more interesting reward
   that still covers the same gold need, plus "a loot bag is a fun reward
   in general." Real current gold-reward quests, found by direct grep -
   only 3 exist:
   - `campaign.snbt` id `80F9C1D996680B95` - 4 gold_ingot ("Spoils of War")
   - `campaign.snbt` id `AE85176DBD4A39E5` - 4 gold_ingot ("Open It")
   - `bounties.snbt` id `CF8DFC7225F517C0` - 8 gold_ingot
   Real bag item ids, confirmed from `loot_bag_drops.js`:
   `bountybags:uncommon_loot_bag` / `rare_loot_bag` / `epic_loot_bag` /
   `legendary_loot_bag`.
   **Real correction caught during build**: the dispatch's assumption that
   `CF8DFC7225F517C0` ("First Blood") was a later/bigger bounty was
   wrong - it's actually the bounties chapter's FIRST and EASIEST entry
   (25 kills), sitting below Exterminator (100 kills, 2x Uncommon),
   Culling (300, Rare), Reaper (750, Epic), Zombie Masher (1500,
   Legendary). Giving it Rare/Epic as originally suggested would have
   inverted that chapter's own difficulty curve. Built correctly instead:
   1x Uncommon bag (below Exterminator's 2x, matching its easier
   position). The 2 campaign.snbt swaps (Spoils of War, Open It) both
   went to 2x Uncommon bag as specified. Syntax-checked, not yet
   confirmed by a live playtest.
2. **Done, real root cause found and fixed, 2026-09-06.** Decompiled 3
   layers (KubeJS → Architectury → Forge): `EntityEvents.spawned` backs
   onto Forge's `EntityJoinLevelEvent` at `EventPriority.HIGH`. The old
   `entity.discard()` let the entity actually get ADDED to the level
   first (tracked, broadcast to nearby clients), then removed a moment
   later - exactly the add-then-remove race that produces an unkillable,
   motionless ghost (looks present, no AI ticking it, no real entity
   backing it server-side). Fixed by switching to `event.cancel()`,
   which Architectury translates to `event.setCanceled(true)` on the
   real Forge event - a true pre-addition deny, never added or tracked
   at all. Same fix applies to every other passive mob type on the list,
   not just rabbits. Can't visually confirm the ghost is gone without a
   real client (same limitation as every other client-visual fix) - the
   mechanism is now provably correct, not yet player-confirmed.
3. **Checked, same dead end as thickness - not fixable via config.**
   Decompiled `WorldBorderElementRenderer.class` fully (all 14 classes in
   the addon searched for config/color/json/toml, zero hits).
   `BORDER_COLOR`/`SHADOW_COLOR` are hardcoded `static final int` ARGB
   constants (opaque red + black shadow) - no config class anywhere.
   Not fixable without bytecode-patching a third-party mod, same
   real, avoidable-maintenance-burden call already made on the thickness
   issue. Leaving as-is unless the user wants to explore alternatives
   (a different border-rendering mod, or accepting the bytecode-patch
   cost).
4. **Done, 2026-09-06.** Reused `wave_spawner.js`'s exact
   `setStatusMessage`/throttle pattern in a new tick handler in
   `wave_airdrop.js`. Purely timestamp-driven off the existing
   `td_waveSpawnCompleteTick` (no new state) - naturally stops showing
   once the 180s window closes, whether from a successful clear or a
   miss. Not yet confirmed by a real playtest (client-visual, same
   limitation as always).
5. **Done, 2026-09-06.** Both IPN jars removed via packwiz - Kotlin For
   Forge correctly kept (confirmed still needed by Loot Beams: Refork,
   not IPN-specific). Removed from sandbox and the live mods folder.
   **Needs a full client restart to take effect** (mod removal, not a
   world/script reload).
6. **Done, 2026-09-06.** One-line edit in `amulet_worn.js`, syntax-
   checked. `minecraft:fire_resistance` → `minecraft:resistance` as
   specified.
7. **Real audit done via NBT parsing (not guessing), 2026-09-06 - fix
   approach needs a decision before building.** Extracted and parsed
   every structure `.nbt` file across the installed structure mods:
   - Philip's Ruins: 563 containers, only 9 truly empty (5 chests, 4
     dispensers) - small gap.
   - postapocalypse_structures: 147 containers, only 3 empty (red_mansion's
     barrels) - tiny gap.
   - abandoned_structures (Berezka): 39/39 all have real loot tables -
     zero gap, already fine.
   - **Abandoned Watchtowers: 98 of 262 containers (37%) are empty
     barrels** - every tower variant has ~15 decorative empty barrels
     plus exactly 1 hardcoded-single-item barrel, no loot tables
     anywhere in the mod at all. The real standout gap.
   - The Lost City: structure_loot_progression.js's own header comment
     already confirms (from an earlier investigation) this mod "ships
     ZERO chest loot tables across all 205 of its own structure NBTs" -
     expect a big number here too once the scan finishes.
   **Why this isn't a simple loot-table-JSON fix**: these are containers
   baked into MOD-owned NBT structure files, not this pack's own data.
   Where a real LootTable reference already exists in the NBT (like
   postapocalypse_structures' chests/trash), adding a JSON loot table
   file is enough - already proven, that's how the earlier "no fix
   needed" cases worked. But for containers with NO LootTable reference
   at all (Watchtowers' case, likely Lost City too), the reference
   itself has to be added to the block entity's own NBT - meaning
   creating override copies of the structure `.nbt` files at the same
   resource path in this pack's own data folder (the same override
   mechanism already used for `dimension.json`/`noise_settings.json`,
   just applied to binary NBT resources for the first time in this
   pack). A real chunk of additional work given the scope (110+
   containers across Philip's Ruins/postapocalypse/Watchtowers alone,
   before Lost City's count even lands) and a new technique for this
   pack - **holding for a decision on whether to proceed**, see below.

**Empty structure-chest loot fix — real approach change, built and
shipped 2026-09-09.** User raised a real worry about the binary-NBT-
patching plan above (shipping our own copies of the mods' structure
files - fragile, breaks silently on a mod update, a technique this pack
had never used). Real alternative built instead, **verified end-to-end
in a genuine headless sandbox server before shipping** (not assumed):
`structure_chest_loot_fix.js` hooks `BlockEvents.rightClicked` and, only
for a container that's genuinely empty and untagged, assigns a real
vanilla `LootTable`/`LootTableSeed` NBT pair at the moment a player
opens it - reflection-based structure-containment check (reused/adapted
from `playtest_starter_kit.js`'s already-proven `buildStructureProximityCheck`
pattern) gates this to only containers actually sitting inside one of
the target mods' own generated structures, never a player's own storage.
No mod file is touched, so it survives mod updates automatically.

**Real verification chain, not skipped:**
- Built a real headless Forge 47.4.10 sandbox server (full 73-mod set)
  to test this live, since no existing sandbox was available in-session.
- Confirmed merging `LootTable` NBT onto an already-placed empty
  container reproduces vanilla's own world-gen loot-chest shape exactly,
  and a **real player right-click** (not just a hopper) correctly rolls
  it and clears the tag - indistinguishable from genuine world-gen loot.
- **Real Radium interaction found along the way**: Radium
  short-circuits the lazy loot-unpack for non-player container access
  (a hopper pulling from a tagged container did nothing until Radium was
  disabled, confirmed both directions). Player right-click - the only
  path this fix uses - was separately confirmed unaffected.
- Caught and fixed 2 real reflection bugs during build: a
  `Stream.toList()` call that crashed with a JPMS `IllegalAccessException`
  on a JDK-internal list type (fixed via `toArray()` instead), and a
  design flaw where checking the container's own position directly hit
  "Unable to calculate boundingbox without pieces" for multi-chunk
  structures (fixed by resolving to the structure's true origin chunk
  first, same pattern `playtest_starter_kit.js` already uses).

**Real remaining gap: Lost City doesn't work.** Confirmed live -
even after the origin-chunk fix, Lost City's own structures still throw
the same "no pieces" error, meaning that mod doesn't expose piece data
through the same vanilla `StructureStart` API the other 3 mods do. Fails
safe (caught, logged, just skips the container - no crash, no false
positive), but Lost City's empty chests stay empty until that mod's own
generation mechanism is investigated separately. Watchtower_building is
individually confirmed working (containment correctly true/false against
a real located structure + 2 control points); Philip's Ruins/
postapocalypse_structures use the same standard mechanism and are
expected to work the same way but weren't individually re-tested.

Deployed to the live instance's `kubejs/server_scripts/` directly. Not
yet playtest-confirmed by the user in real play.

**Savanna removal + desert-area structure density/variety — dispatched
2026-09-06, direct user instruction with a real screenshot.** User's
starting desert patch (X:-2349 Z:-136, fresh world) shows only 2
structures in view distance and a large savanna blob crowding the
desert - "too big, takes away from the desert feel," "light on
structures and not varied."
1. **Superseded 2026-09-06 by real sandbox testing - plain deletion
   doesn't work, don't do it.** Removing `minecraft:savanna` and
   `minecraft:savanna_plateau`'s points from `overworld.json`'s
   `multi_noise` biome_source does NOT hand their territory to
   desert/badlands - verified via a genuine fresh-world sandbox test
   (same seed, before/after): the 588 grid points that were savanna/
   savanna_plateau become 83.2% meadow, 16.8% plains, 0% desert/badlands.
   Savanna's own parameter point (temp 0.5, humidity -0.3,
   continentalness 0.2, erosion 0.3) is mathematically closer to the
   plains-family cluster than to desert (0.8,-0.8,0.3,0.0) or badlands
   (0.9,-0.9,0.5,-0.3) - deleting the point just falls through to
   whichever remaining point is nearest, which is plains-family here.
   Shipping that would replace one green biome with two others (meadow
   even adds flowers) - the opposite of "more desert feel."
   **User-confirmed real fix instead**: ADD new `minecraft:desert` and/or
   `minecraft:badlands` parameter point(s) positioned at (or very near)
   savanna's/savanna_plateau's old coordinates, rather than deleting
   those points - multi_noise supports multiple points per biome, so this
   directly claims that parameter-space territory for desert/badlands
   instead of leaving it to fall through. Small, precise edit, same file
   (2-4 new point entries). Verify the same way (real before/after grid
   sample at the same coordinates) that this actually lands as
   desert/badlands now, not another fallback surprise. Also drop
   `spawn_biome_search`'s existing savanna/savanna_plateau references in
   `playtest_starter_kit.js` if any dead fallback code remains now that
   the biome won't exist in the world at all (not just excluded from
   spawn targeting - a real distinction from today's earlier fix).
2. **Done, 2026-09-06 - real fork on variety left open, see below.**
   Verified via decompile exactly which structure_sets place in
   desert/badlands: only `philipsruins:desert_structures` (3 pieces, was
   48/24 spacing) and abandoned_urban's city/gas_station/motel/
   observatory/train (5 structures, already dense at 24-40). CONFIRMED
   ZERO desert/badlands coverage from every other philipsruins-family
   set, postapocalypse_structures, watchtower_building,
   abandoned_structures, and all 13 of the_lost_city's structures (all
   target forest/mountain/taiga/plains/meadow/now-removed-savanna).
   Retuned `desert_structures` from 48/24 to 24/12 (parity with
   abandoned_urban's tier, since it was the outlier at half density).
   Verified via fresh-world boot: no crash, real `/locate` hits for
   desert_structures (883 blocks), gas_station (35 blocks), observatory
   (48 blocks). **Real fork, needs a decision**: density is fixed, but
   TYPE variety is still genuinely thin - only 2 mods/8 structure pieces
   cover desert/badlands vs. dozens covering plains-family. Source/vet a
   real desert-specific structure mod (same rigor as the earlier
   structure-variety pass), or accept 2 mods' worth of variety for now?
3. Verify via a genuine fresh-world creation (not a reload) - sample
   enough columns to confirm the savanna-claimed area actually reads as
   desert/badlands-dominant now, not some other unexpected biome winning
   the reassignment, and confirm no world-creation crash (multi_noise
   edits are usually low-risk structurally, but verify anyway per this
   pack's own history with worldgen changes).

**Held worldgen batch, dispatched 2026-09-06 overnight (user unavailable
to review same-night; working through in order per direct instruction,
documenting reasoning for the morning):**
1. **Done, commit cd18e9b.** Structure-proximity check really was
   measuring a structure's origin chunk corner, not its nearest edge -
   confirmed by decompiling ChunkGenerator/StructurePlacement directly.
   Fixed to look up the real StructureStart and measure to the nearest
   point on its actual BoundingBox (a real point-to-AABB distance,
   clamped per axis). Along the way, found that reflection against
   vanilla classes in this build sees SRG method names, not official
   Mojang ones, even against this pack's own bundled mapping file -
   every method resolved by "real" official name came back null on a
   live boot until switched to the exact SRG identifiers (verified
   against each method's real decompiled body, not just its shape).
   Generalizes no_passive_mobs.js's existing EntityType-specific
   finding to vanilla reflection in general. Sandbox-verified across 5
   real coordinates: 4 computed a correct bounding-box distance
   (including a correct 0 for a point actually inside a structure), 1
   hit a real vanilla edge case (a piece-less StructureStart) and
   correctly degraded to the old fallback instead of crashing.
2. **Re-scoped 2026-09-06 - the original "held" premise was wrong, this
   is actually low-risk. User is picking this up personally.** The
   original hold assumed "this world's surface height is genuinely
   variable per-column" (per-biome elevation, unsurveyed) - checked
   directly against the real, current `overworld_flat.json` noise_router
   and that premise is false. `final_density` is a `y_clamped_gradient`
   from `from_y: 1` to `to_y: 3` - a function of **Y only**, zero
   reference to continentalness/erosion/depth/weirdness anywhere in the
   density computation. This world is provably, structurally flat by
   construction (confirmed directly from the JSON, not inferred from
   `playtest_starter_kit.js`'s heightmap-query spawn logic, which is a
   generic runtime safety check, not evidence of real per-column height
   variance - and matches the "World type" section already in
   FEATURES.md, which independently documents this same fact). Real
   numbers: `min_y: -64`, walkable surface sits at genuinely constant
   y≈2 everywhere (the gradient's own crossing point), giving the
   already-known 65-block floor depth uniformly, not just "probably."
   The bedrock layer itself is a `vertical_gradient` keyed to
   `above_bottom` (relative to whatever `min_y` is, not an absolute Y),
   so it moves correctly with any `min_y` change automatically - no
   separate edit needed there.
   **Real hard constraint that does matter**: Minecraft's chunk-section
   format requires `min_y` to be a multiple of 16 (a vanilla engine
   limit, not this pack's choice) - "exactly 5 blocks to bedrock" isn't
   reachable at all, only the nearest 16-aligned options:
   - `min_y: -16` → 18-block floor depth (surface y≈2 down to -16),
     bedrock's own random layer occupies the bottom ~5 of those, leaving
     **~13 blocks of real diggable stone** above bedrock. Safe margin,
     closest practical fit to "~5 blocks," recommended default.
   - `min_y: 0` → only a 2-block floor depth - **too shallow, avoid**:
     the bedrock gradient (bottom 0-5 blocks above min_y) would
     literally poke through the y≈2 walkable surface, a real broken-floor
     bug, not a hypothetical.
   **User confirmed 2026-09-06: go with `min_y: -16`. Ready to build.**
   Also need `height` adjusted alongside `min_y` (currently 384, keeps
   the dimension's total span sane) and a check for whether any other
   file references the old `min_y: -64` literal (structure `y_offset`s,
   `structure_loot_progression.js`'s any absolute-Y logic, etc.) before
   touching it. Verify via a genuine fresh-world creation same as any
   other worldgen edit - low risk given the above, but still real
   engine-level config, not zero-risk.
3. **Done, commit dc87f16.** Installed both Abandoned Watchtowers
   (MasterOWS) and Abandoned Structures (Berezka). Checked real biome
   fit before installing rather than assuming: this pack's actual biome
   set is badlands/desert/meadow/plains/savanna/savanna_plateau/
   sunflower_plains (read straight from the dimension file). Watchtowers
   targets plains/forest/birch_forest/flower_forest/taiga - only
   "plains" overlaps, so real but limited. Abandoned Structures targets
   the `#berezka_api:is_plains` tag, which covers plains,
   sunflower_plains, AND meadow (confirmed by reading the tag's actual
   contents from the already-installed Berezka API dependency) - a
   solid fit.
   **Real judgment call on spacing, not a precise fit**: retuned all 6
   new structure_sets to spacing 80-120, distinctly sparser than this
   pack's existing "background variety" tier (the philipsruins family
   sits at 48/24), since each structure_set is its own independent
   placement grid with no shared budget - adding 6 more at the existing
   tier would be a real density increase even with no single type
   feeling common. This doesn't perfectly net to zero (would need
   touching the other ~39 already-tuned sets, too risky to rebalance
   blind overnight) but keeps the net addition small. Worth a real
   playtest opinion on whether it reads as "just right" or still a
   touch busy.
   Verified via a genuine fresh-world creation in the sandbox (not just
   a reload) - clean boot, and all 6 new structures individually
   confirmed real via `/locate`.

**Pedestal-under-attack alert — done, built 2026-09-05, real priority
item (a lost run: "all of it silent and unknown to me").** The existing
HP bossbar is distance-limited by design (ambient status only), useless
as a warning for a player fighting elsewhere - exactly the scenario that
cost the run. Added a distance-independent broadcast alert in
`pedestal_health.js`: title/subtitle + a sound run via
`execute as @a at @s` (plays at each player's own position, no distance
falloff, so it's audible regardless of where they are). Tier-gated, not
per-hit, so a sustained attack doesn't spam - fires only when health
drops into a new, more severe tier than the last alert (first damage
taken, then 50%/25%/10% of max), via strict `newTier > lastAlertTier`
so it also goes quiet again correctly once a future heal (item #11
below, not yet built) pushes health back up. Verified via a live
sandbox diagnostic: all 6 tier boundaries computed correctly, and
`firePedestalAlert()` itself runs with no exception. Deployed.

**Xaero's World Border line thickness — checked, not fixable via
config.** Confirmed live and working (full map screen, not minimap -
correct per the user). The "too thick" line is two hardcoded literal
draws (4.0/2.0 px) in the addon's own compiled
`WorldBorderElementRenderer.class`, no config file or exposed setting
exists at all - confirmed by decompiling it directly, not guessed from
an absent config file alone. Not fixable without bytecode-patching a
third-party mod (real, avoidable maintenance burden this pack hasn't
taken on elsewhere) - leaving as-is unless the user feels strongly.

**Pick Up Notifier — confirmed working live, old chat summary
removed.** The real popup integration built in the last batch is
confirmed working by the user. Removed the now-redundant custom chat
message ("You got: X, Y, Z") from `loot_bag_notification.js` - both
existed to answer the same question, kept only the real popup.
`pendingBagOpens` itself stays (still the real scoping gate limiting
Pick Up Notifier calls to actual bag-open windows, not every inventory
change) - simplified to drop the now-unused items/bagName aggregation
that only existed to build the removed chat text.

**3 more items from the 25-item batch — done 2026-09-05:**
- #13+25 (cobblestone scarcity): cut from weight 45→10 and count
  12-24→6-12 in the Uncommon loot pool - both frequency and per-hit
  yield reduced, so oak_log (unchanged, weight 40) becomes the clearly
  dominant early material by comparison, matching "wood by necessity."
- #16 (endless-phase brute tuning): tier 2 (both brute types plus
  elite_zombie/horde_zombie/demolition_zombie/rotten_mutant/crawler) is
  now hard-gated to zero weight below endless level 5, not just
  low-probability - a player literally cannot see one before that
  level, confirmed via the same real math that explained the original
  "2 brutes at level 1" report (a real, if unlucky, ~7-8% chance under
  the old formula).
- #17+18+20 (missing loot): netherrack and arrows added to the Uncommon
  tier. **Real correction to the batch's own claim**: nether quartz was
  NOT actually missing - `minecraft:quartz` (the real item id for it)
  was already in the Rare tier the whole time, confirmed by direct
  file read. Flagging this rather than adding a silent duplicate.
- #12 (JEI tip): new Tips & Tricks quest for the "A" key, confirmed via
  decompiling JEI's own `InternalKeyMappings` directly - GLFW key 65
  ('A') is bound to `key.jei.bookmark` ("Add/Remove Bookmark," hover an
  item + press A), not guessed from the lang file alone.

**Quest merge — done 2026-09-05** (separate request, not part of the
25-item batch): "The Reckoning" (wave-5 gear-out) and "No Turning Back"
(wave-8/endless intro) merged into one quest, keeping "The Reckoning"'s
id and its real dependency on "Watch the Walls Grow." All 3 rewards
kept (golden apple, waystone, totem of undying). Checked the real
dependency graph first - neither quest had any other dependent, so
nothing orphaned.

All of the above verified via a clean sandbox boot (0 script errors,
correct 30-quest count after the merge/additions) and deployed to the
live instance.

**New live feedback batch, 2026-09-05, 25 items, literal numbering —
sent to build. #19 cancels/supersedes the previous batch's #3 (cobweb
mechanic investigation) — drop that, just scrap the combo claim.**
1. **Done.** "Borrowed Time" rewritten as a subtle hint ("look close and
   you can already see the wear starting to show") - no explicit "wave
   5" mention anymore. Wave-5 announcement split into two genuinely
   sequential title/subtitle pairs with a real 5-second pause between
   them (`pendingDelayedTitles` queue in `wave_status.js`) - real bug
   found: it and the gear-removal beat both fired `/title` in the same
   tick, so the second one instantly overwrote the first before it
   could be read; that's fixed now, not just made "more sequential."
2. **Done.** Removed the original one-time "Sound the Horn" quest
   entirely, kept the repeatable "Lost the Horn?" as the sole horn
   quest (its own description rewritten to be self-contained, no longer
   references the deleted quest by name). Checked the real dependency
   graph first: exactly one other quest ("Thin the Horde") depended on
   it - dependency removed, it's now a standalone quest with no
   prerequisite, and the repeatable quest has zero dependents.
3. **Real live behavioral test done, real root cause found and fixed -
   not just confirmed unconfirmed.** Built a real controlled test in the
   sandbox: an enclosed cobblestone room with a real ESM blockTarget (a
   vanilla candle) sealed inside, a real digger-capable wave mob (the
   extended roster from the earlier ESM config fix) sealed right outside
   the wall. **Real confound caught and fixed first**: the first
   attempt's test mob silently burned to death in daylight before
   anything could be observed - redone with `time set night`/
   `doDaylightCycle false`. With that fixed: the mob moved once at the
   start, then sat completely stationary for 80+ real seconds - zero
   wall damage, confirmed via repeated `/setblock ... keep` checks
   (fails while the block is still solid). Matches the live report
   exactly ("I've just been able to wall off the base and it's easy").
   **Real root cause, confirmed by decompiling `ESM_EntityAIDigging.
   canUse()` directly**: it requires `digger.getNavigation().isDone()`
   before it will even consider digging - the mob's own pathfinding has
   to have genuinely given up first. `mob_aggro.js`'s own forced-
   targeting handler was calling `e.setTarget(...)` unconditionally
   every 10 ticks, even when the target hadn't changed - very likely
   kept re-triggering the mob's attack-goal pathfinding attempt against
   the same unreachable target, so the navigator never settled into
   "done" long enough for the digger goal's precondition to pass. Fixed
   by comparing the mob's current target (by UUID, not object identity -
   KubeJS entity wrappers aren't guaranteed to be the same object across
   reads) against the desired one and only calling `setTarget()` when it
   actually needs to change - still re-asserts every 10 ticks if
   something else changed the target (the original "enforce forced
   targeting" safety net), just skips the redundant call otherwise.
   **Real limitation, stated plainly**: verifying this fix actually
   restores digging behavior needs a real player - `mob_aggro.js`'s
   targeting loop is a `PlayerEvents.tick` handler that can't run at all
   in a headless sandbox with no player connected, so this is a
   well-evidenced hypothesis fix grounded in the real decompiled
   precondition, not an end-to-end confirmed one. Needs a real playtest.
   Connects to #13+25's cobblestone-scarcity fix (already shipped) for a
   different angle on the same complaint.
4. **Done.** "Spoils of War" and "Open It" both now reward 4 gold
   ingots each (guaranteed, not RNG) - stacks with the gold_nugget fix
   from the last batch, closing the gold gap faster and more reliably.
5. **Done.** Modest bump across all 8 waves - trash-floor counts only
   (zombie/husk/drowned/blister_zombie/horde_zombie), deliberately left
   every Rare (split_head_zombie) and Epic (spitter/elite_zombie) count
   untouched so it doesn't perturb the gold-economy calibration from the
   last batch.
6. **Done, real technical question answered.** Confirmed:
   `PlayerEvents.loggedIn` only fires AFTER vanilla has already placed
   the player entity in the world - there's no earlier Forge/vanilla
   hook, so "make the world ready before the player is first placed" at
   all isn't actually possible. The biome search (up to 4000 blocks)
   plus the full base build then run synchronously inside that same
   handler, taking real, measurable time while the player's client
   keeps rendering wherever they were first placed - that's the real
   double-spawn. Can't eliminate the double-teleport, but made it read
   as one clean spawn: an immediate, near-instant hop straight up to a
   fixed neutral altitude (sky, nothing identifiable to notice snapping
   away from) with a short slow_falling safety net, before any of the
   slow work starts - by the time the real spreadplayers teleport lands,
   the player was already looking at sky, not a real landscape. Fresh
   worlds only (same as every other fix inside this login gate) - can't
   help the current live save, which is already past its own first
   login. Can't verify the actual visual effect without a real client -
   verified the code loads clean, not the felt experience.
7. **Done, and it turned out to already be true.** Decompiled Crafting
   Station Improved's real `Configs$Server` class directly -
   `sideInventories` ("display side inventories in crafting grid," the
   real connected-inventories feature) already defaults to `true` in
   the mod's own stock code, and nothing in this pack overrides it.
   Nothing to fix - just reinforces that #8's explainer quest is the
   real gap (the feature works, players don't know it exists).
8. **Half done - the connected-inventory quest, not the formatting bug.**
   New quest "Reach Further" explaining the crafting station's real
   connected-inventory behavior (pairs with #7's finding that it's
   already on by default) added to the campaign chapter, depends on the
   same early root every other Tier 1 quest uses since the station is
   pre-placed at world start, not crafted. **The ch.2 formatting bug
   itself remains unconfirmed** - checked every structural angle
   available without a client: `chapter_groups.snbt`/`data.snbt` are
   both clean, `tips_and_tricks.snbt` (chapter index 1, "chapter 2" in a
   1-indexed UI) has no coordinate overlaps, no unescaped special
   characters in any description, and every referenced icon item id
   (including the ones that looked most likely to be wrong) is
   confirmed real via the source mod's own lang file. Every sandbox
   boot this whole session has shown 0 parse errors at the exact
   expected quest count too, ruling out a structural SNBT bug. This is
   a real investigation ceiling, not a shrug - whatever's actually wrong
   is either a rendering-only issue invisible to file inspection, or
   needs a more specific description of what it actually looks like
   (a screenshot, or "which quest/which part of the screen") to chase
   further.
9. **Done.** Installed "Zombies More" (CaraAleatorio7, CurseForge project
   957379, file zombiesmore-2.1.5-forge-1.20.1.jar, hash-verified before
   installing). Confirmed the real `zombiesmore:boomer_zombie` id via
   the mod's own lang file and decompiled its entity class directly:
   extends vanilla `Monster` (so every existing roster-list config
   still covers it, no special-casing needed), 20 HP/5 attack
   damage/0.5 armor (notably lower raw stats than Spitter's own
   75/4-ranged/5.0 - the real danger is its `AreaEffectCloud`-based
   poison mist on death, confirmed in its own death-handling code, not
   the mod's marketing text). Replaced every real Spitter reference
   across the whole pack (WAVES, all 4 roster-list copies, the
   endless-phase "other types" tier, loot_bag_drops.js's Epic tier,
   flesh_death_sound.js, and every epicsiegemod-common.toml mob list) -
   left the historical comments describing the original TFTH -> Spitter
   decision untouched, since those document real past context, not live
   config. Verified via a clean sandbox boot (0 script errors) and a
   real `/summon zombiesmore:boomer_zombie` test before deploying.
10. **Update, 2026-09-05: user wants to try Inventory Profiles Next
    specifically despite the documented history - re-verified current
    state before any reinstall, per direct instruction, rather than
    assume it's unchanged.** Real findings: the Kotlin For Forge
    dependency is still 100% required today - not a soft/optional
    dependency but the mod's own `modLoader="kotlinforforge"`
    declaration in `libIPN`'s real `mods.toml` (confirmed by downloading
    and inspecting the actual current jar, hash-verified, not assumed
    from an old memory). The current latest Forge 1.20.1 build
    (1.10.20, published 2026-02-02 - genuinely the newest available,
    nothing has shipped for the 1.20.1 track since, real development
    has moved to 1.21.x/26.x) predates this pack's own 2026-08-29
    removal decision by about 7 months, and its changelog history
    (versions 1.10.11 through 1.10.20) shows no fix mentioning Mouse
    Tweaks or hover/highlight behavior - no evidence either of the 2
    documented bugs has been addressed. **Also checked the user's
    belief about a sort-button keybind - it's half right**: IPN does
    have a real "Sort" button (confirmed via its own lang file: "Show
    the 'Sort' Button," a real config-toggleable feature), but it's a
    clickable ON-SCREEN GUI button overlaid on the inventory/container
    screen, not a keyboard keybind - confirmed no real keybind exists
    (zero `key.*` lang entries, and the jar's only keybind-adjacent
    class is a mixin accessor for reading vanilla's own KeyMapping
    state, not a registered new keybind of its own). Reverted the
    investigative packwiz add (checked real dependencies/hashes this
    way, cleaner than guessing) rather than leaving it half-installed -
    holding for a real go/no-go now that the user has the actual
    current facts, not proceeding unilaterally given the unchanged real
    bug/dependency history.

    **Installed, 2026-09-05: user confirmed after seeing the full
    picture above, accepting the Kotlin For Forge chain and both
    unfixed bugs.** Real bonus finding while wiring this up: Kotlin For
    Forge was already present in the pack the whole time - it was
    re-added in a later commit (for Loot Beams: Refork) after the
    original 2026-08-29 removal, and its hash on the live instance
    matched packwiz's freshly-resolved expectation exactly. So this
    install did NOT introduce a new mod-loader dependency, just the 2
    IPN jars on top of infrastructure another mod already needs -
    meaningfully cheaper than the "3-mod chain" framing used when this
    was first removed. Same 1.10.20 build re-verified above. Sandbox
    boot clean (0 KubeJS errors, no IPN-specific exceptions), both jars
    hash-verified on deploy to the live instance. **Needs a full client
    restart** (new mod jars, not just a world/server reload).

**Original investigation, superseded above but kept for context:** Also found a real bonus bug while checking the
    already-installed Inventory Sorter first (in case it already had
    this and just needed enabling, matching #7's pattern): its own
    "Move-all items"/spacebar module is a REAL DEAD STUB in the exact
    installed version - decompiled `AllItemsHandler.class` directly,
    its `accept()` method is completely empty, despite the mod's own
    lang file still describing it as a working feature. Checked 7 real
    candidates for a genuine replacement, verified via Modrinth/
    CurseForge APIs directly rather than trusting search summaries
    (caught one, "Chest Deposit," as a real naming collision - a
    same-named Fabric mod for a completely different, much newer
    Minecraft version): Chest Deposit, QuickStack, Sorting Daemon,
    Quick Stack To Nearby Chests, and Stack To Nearby Chests (868K
    downloads) are ALL Fabric/Quilt-only, no Forge 1.20.1 build exists
    for any of them - a real, consistent pattern across this whole
    feature category right now, not just bad luck. **Inventory
    Profiles Next has a real Forge 1.20.1 build, but was already tried
    in this exact pack and removed 2026-08-29** (own project memory) -
    a 3-mod dependency chain (IPN + libIPN + Kotlin for Forge) for one
    QoL feature, with 2 real, never-fully-confirmed-fixed bugs (a Mouse
    Tweaks conflict, a recurring hover-highlight bug that came back
    after being "fixed" once already) - re-adding it would repeat a
    real, documented past decision without addressing why it left.
    **Only real remaining candidate**: "Quick Transfer" by "LongName" -
    genuine Forge 1.20.1 build confirmed, but very small (1,275
    downloads) and very new (published this year), and its real
    mechanic is shift+drag-to-transfer-hovered-items rather than a
    single click/keypress to deposit everything matching at once.
    Flagging back rather than installing unilaterally - this is a
    genuine "small new mod or nothing" choice, not a confident pick.
11. **Done.** Starting HP 200→300 (`PEDESTAL_MAX_HEALTH`, one named
    constant now instead of a bare `200` duplicated in 3 places), +20%
    heal on every real wave clear (`healPedestalByPercent`, called
    cross-file from `wave_status.js` - confirmed via a live sandbox
    diagnostic that this actually resolves, not assumed). Bigger
    upgrade-point system stays parked in IDEAS.md, not built.
12. Not started - needs confirming JEI's real default "A" key binding
    before writing the quest text, not guessed.
13+25. Cobblestone loot too common (confirmed: 45 weight, heaviest in
    Uncommon pool) — dial back hard so wood becomes the real early
    defense material by necessity, not an AI change.
14. **Done** (the heal mechanic; carrots-in-loot still open). Golden
    carrot right-click heals the pedestal 10%, nether star heals to
    full (100%) - one `BlockEvents.rightClicked('supplementaries:
    pedestal', ...)` handler, cancels the event so Supplementaries'
    own native "place item on pedestal" behavior doesn't also fire
    (that's reserved for the amulet). Shares the same
    `healPedestalBy`/`healPedestalByPercent` functions as #11's
    per-wave heal. Plain carrots still confirmed absent from loot —
    decide whether to add.
15. **Investigated, real test says this isn't a bug - the hypothesis is
    wrong.** Killed 20 real zombies via non-player-attributed damage
    (`/damage ... minecraft:generic`, the same category of damage
    source a trap deals - no entity attribution at all) in a live
    sandbox test. Result: 8 Uncommon Bounty Bags dropped (40%,
    statistically consistent with the real configured 50% chance for a
    sample this size) and 10 rotten flesh (50%, matches vanilla). Loot
    bags genuinely do drop from non-player kills - `loot_bag_drops.js`'s
    `randomChance()` modifiers don't check damage source at all. **Real
    likely explanation for the original report instead**: the
    wave-8 brute that "dropped nothing" is a `LEGENDARY_MOBS` entry -
    that tier's real per-kill drop chance is 4%, so "no drop from one
    kill" is the expected outcome 96% of the time, not evidence of a
    trap-specific bug. A single observation at a 4% rate can't
    distinguish "working as designed" from "actually broken" - would
    need many more trap-kills of the same tier to say anything
    statistically meaningful, and this test already covers the more
    common Uncommon-tier case that would show a systemic bug far more
    obviously. No code change made.
16. Endless-phase tuning: 2 brutes at wave 9/level 1 is too early —
    push heavier "m"-pool types toward later endless levels.
17+18+20. Confirmed gaps: netherrack, arrows, nether quartz missing
    from every custom loot table — add all three somewhere sensible.
21. **Done - real root cause found: the existing quest text was
    factually wrong, not missing.** Decompiled both mods' real classes
    directly rather than guessing:
    - **Magnetic Chest**: the existing "Waste Not" quest said it needs
      to be "wired up" - false. Its real tick logic pulls any dropped
      item within a hardcoded 10 blocks, every tick, with zero redstone/
      power check anywhere in the code. Fixed the quest text to say so.
    - **Arrow Turret**: the existing "Herd Them In" quest said "keep it
      stocked [with arrows] or it's just decoration" - false. Its real
      attack code spawns arrows directly (`new Arrow(...)`), never
      drawing from any inventory - genuinely unlimited ammo. Also found
      two real, previously-undocumented quirks worth telling the
      player: it spawns facing a random direction until it finds a
      target, and it has a real `RandomStrollGoal` that can walk it off
      its placed position when idle - a real reason a "turret" might
      seem to wander. Also confirmed (real, positive finding, not
      assumed): its targeting goal checks vanilla's `Monster` class,
      and every custom wave mob in this pack's roster (both Undead
      Nights' and Mutants and Zombies' entities, checked directly) does
      extend `Monster` - so it does correctly target the actual
      roster, that was never the problem. Rewrote the quest text to
      match reality instead of writing a new quest.
22. **Investigated - a real, well-known vanilla limitation, not a bug
    in this pack's own scripts.** Most vanilla mob pathfinders treat
    ladders as a real climbable node when planning a route, but don't
    reliably execute the actual climb for most mob types - the same
    long-documented vanilla behavior behind villagers getting stuck at
    the base of ladders (a widely-corroborated, real Minecraft AI
    limitation, not specific to this pack, Radium, or ESM - checked
    Radium's own changelog/issue history for a ladder-specific
    regression first, found nothing). Not something fixable via a
    script without writing a custom pathfinder override (real scope
    creep for a player-placed-block issue) - practical recommendation:
    avoid ladders on exterior walls specifically, since they create an
    attractive-but-unreliable path node that snags mob pathing; a
    non-climbable block in the same spot doesn't have this problem.
23. **Investigated, real answer - not built (a real new-build decision,
    not just a bug fix, held for a real layout proposal first).**
    Decompiled Create's `AirCurrent.class` directly to answer the real
    question: fan push is a genuine per-tick velocity ADDITION
    (`entity.setDeltaMovement(currentMotion + flowVector * 0.125 *
    falloff)`), applied on top of whatever the mob's own AI pathing
    already wants - vanilla's real movement model sums external forces
    with AI-desired movement, it doesn't get overridden. So a fan
    genuinely CAN affect a mob's real trajectory, not just a cosmetic
    knockback that gets instantly walked off. **But the direction
    matters a lot**: pushing a mob PERPENDICULAR to where its
    pathfinder wants to go (a "diverter") would fight the mob's own
    movement every tick - a real, if modest (0.125/tick), continuous
    shove it would keep re-approaching against, exactly the "walks back
    into it" failure mode originally worried about. Pushing a mob ALONG
    the direction it's already trying to go (a "conveyor," reinforcing
    an existing corridor rather than diverting across it) has no such
    fight - the two forces add cleanly.
    **Real recommendation**: a maze built from plain walls/corridors is
    the actually-reliable primary technique here, not fans - real
    vanilla A*-style pathfinding already computes the genuine shortest
    route through whatever layout exists (the currently-observed
    choke-point bottleneck at the front door IS this same mechanism
    already working, proof it's a real, zero-new-mechanic option).
    Fans fit best as a flavor/pacing addition along an already-built
    corridor (speeding mobs through a kill-zone, not steering them into
    one) - not as the primary redirect mechanism. Real next step, if
    wanted: a concrete corridor/maze layout proposal for the actual
    courtyard, not more mechanism research - that's a real build
    decision on its own, not bundled into this investigation.
24. **Done.** "Turn the Crank" no longer requires possessing (or
    finding andesite to craft) a `create:hand_crank` at all - task
    changed to a plain checkmark, reward changed from 8 andesite to the
    hand_crank itself directly, so the Lootr-vs-custom-table chest
    confusion can't block it anymore. Andesite itself untouched
    elsewhere (still real, lootable loot for other uses).

**Two live bug reports, dispatched alongside the 25-item batch above -
done/investigated 2026-09-05:**
- **`/tdforceclear` "no longer works" — real bug found, likely fixed,
  not fully confirmable remotely.** Not a regression from today's edits
  (git history shows this line untouched since the command was first
  written). Real cause: `context.source.sendSuccess(() => Text.of(...),
  false)` - `Text` is not a real global anywhere else in this codebase
  (this is the pack's only custom command registration, zero other
  Component-building calls exist to have proven it). A non-player RCON
  test throws the exact same generic "unexpected error" message this
  bug would, so a headless sandbox genuinely can't distinguish the two
  failure modes - fixed by switching to `player.tell(...)`, the same
  proven chat call used everywhere else in this pack. Needs a real
  player to confirm.
- **Z-key zoom "kinda flaky" — real investigation, keybind/mod-conflict
  theories ruled out.** Checked live `options.txt` directly: nothing
  else is bound to Z. None of the 4 newly-installed client mods
  (Dynamic Lights, Damage Numbers, Pick Up Notifier, Xaero's World
  Border) register any keybind at all - checked each one's lang file
  directly, zero hits. Just Zoom's own config has no cooldown/toggle
  setting that would explain intermittent failure. Not resolved further
  than that - a deeper mixin-level interaction or a mundane window-
  focus quirk are the remaining real possibilities, not chased given
  how minor this is.
**8-item batch — done, built/deployed 2026-09-05 (except #2, held).**
1. **Waystone rendering — real root cause found and fixed.** Decompiled
   `WaystoneBlock`/`WaystoneBlockBase` directly: `waystones:waystone` is
   a real door/bed-style two-block structure (`half=lower`/`half=upper`,
   confirmed from the mod's own blockstates JSON - separate
   waystone_bottom/waystone_top models per half). A real player
   placement triggers the mod's own code to set the block ABOVE to
   `half=upper`; the pre-placement script's bare `/setblock` only ever
   created the registered default state (`half=lower`) and never
   touched the space above at all - nothing was ever placed there,
   matching "only the bottom block visible" exactly. Fixed by setting
   both halves explicitly in `playtest_starter_kit.js`. Registration as
   a real teleport target is unaffected (confirmed via
   `WaystoneBlockEntityBase.onLoad()` - self-registers on block-entity
   load regardless of placement method). Fresh-world fix only - not
   retroactive for the live save (needs re-placing manually if the
   user wants the existing world's waystone fixed too).
2. **Still HELD** — world depth reduction, parked with the other
   worldgen-risk item for a dedicated later pass.
3. **Cobweb mechanic verified live, quest text updated - then fully
   superseded by the new batch's #19 (combo idea scrapped entirely).**
   Confirmed via a live sandbox test (summoned a real zombie inside a
   cobweb, checked `ActiveEffects` - empty list, confirming cobweb's
   slow is a purely positional per-tick collision effect with no status
   effect involved, so it cannot linger once a mob leaves the block).
   First rewrote the "Better Than Nothing" quest text to describe it as
   two sequential obstacles rather than a combo; **then the new batch's
   #19 asked to drop the cobweb pairing from this quest entirely** ("this
   is what barbed wire does... keep this as a trap progression thing") -
   text now describes Spikes as a plain standalone weak trap, no cobweb
   mention at all. Re-verified via a second sandbox boot (FTB Quests
   still loads all 31 quests, 0 parse errors) before redeploying.
4. **Zcraft Decoration removed entirely.** Only real footprint was 2
   `sfz_shuiniqiang` (Concrete Wall) props flanking the gate - removed
   from fresh-world placement, mod uninstalled (packwiz + live jar).
   **Live-save risk handled**: existing saves that already built their
   base have those 2 blocks placed and would see them turn into real
   "missing block" placeholders once the mod's gone - added a one-time
   migration (`td_zcraftCleanupDone`, runs on login regardless of
   `td_playtestKitGiven` state) that recomputes the exact 2 coordinates
   from this file's own persisted `td_pedestalX/Y/Z` (an exact algebraic
   identity within the same function, not a re-derivation through
   historically-changed constants - confirmed safe) and sets them to
   air. Could not behaviorally verify the migration in the sandbox (no
   real player has ever logged into the test world, so the login-gated
   code path never runs headless) - verified by code review only.
5. **Crafting table waterlogging - re-investigated against the correct
   data source, real root cause still not found, but the block's own
   innocence is now doubly confirmed.** The earlier check looked at the
   wrong thing: this table isn't baked into the structure's NBT at all -
   it's the structure's own baked vanilla `minecraft:crafting_table`
   (confirmed a real furniture piece at local (5,1,4)), overwritten by a
   live `/setblock` to `craftingstation:crafting_station` after the
   structure generates. Re-confirmed directly from the CURRENT live
   jar's blockstate JSON: still zero properties, still structurally
   incapable of holding `waterlogged`. Checked the structure's own known
   `wet_sponge` placeholder issue (the existing floor-wide replace-fill)
   - doesn't reach this position, and the position itself sits on plain
   andesite, not wet_sponge. No water/wet_sponge block exists in the
   structure's own NBT within a 1-block radius of the table either.
   **Remaining real possibility, can't check without the live save**:
   real generated terrain water intersecting the structure at this
   specific world's seed, unrelated to structure content entirely - this
   pack never pins a seed, so no sandbox recreation of this exact
   world is possible. Needs the user to look at what's actually adjacent
   in their own game (a 5-second visual check) or run
   `/data get block ~ ~ ~` while standing on it, to actually resolve
   this - can't be determined remotely without touching their live save.
6. **Green terracotta + snow patch removed.** Real structure NBT check:
   a 3x2 `minecraft:green_terracotta` roof patch at local y=5 with 2
   real snow layers stacked directly on top at local y=6 (a "mossy
   roof with snow" accent), distinct from the plain `minecraft:terracotta`
   weathering used everywhere else on the same roof. Fixed by converting
   the green terracotta to plain terracotta (matching the rest of the
   roof, not a structural hole) and the snow to air. Fresh-world fix
   only, same live-save-migration-math caveat as #4 but NOT applied
   here since this ask didn't request retroactive handling and the
   coordinate derivation would need to pass through several historically-
   changed constants (real, higher risk than #4's exact-identity case) -
   flagging this instead of silently deciding to risk it.
7-8. **Real structural root cause found for "gold still not enough,"
   not just another blind bump.** Full economy audit: the amulet costs
   8 gold_ingot (its only real recipe, confirmed from
   `amulet_pedestal.js`), a hard one-time gate since border-crossing is
   locked to `td_amuletOnPedestal` (confirmed from `amulet_border.js`)
   with NO other exception. Of the loot-bag tiers, only Rare
   (gold_ingot, ~6 expected/bag) and Epic (gold_block, ~10
   ingot-equivalent/bag) carry any gold at all - **Uncommon, the tier
   dropping from the actual trash-floor mobs a player kills constantly,
   had ZERO gold**. Worse: Rare bags are gated behind a SINGLE mob type
   (`split_head_zombie`) appearing only 4 times total across the entire
   8-wave campaign at a 25% drop chance - expected ~1 Rare bag (~6
   ingots) by wave 8, already short of the 8-ingot amulet cost, before
   variance (real ~32% chance of getting *zero* Rare bags at all by
   wave 8). The two OTHER real gold channels
   (`structure_loot_progression.js`'s MID/HIGH_TIER pools) are
   structurally unreachable before the amulet exists at all - both
   trigger at 60+/120+ blocks from spawn, both outside the starting
   50-diameter border, which only the amulet can cross. This is a real
   chicken-and-egg gate, not just a yield problem - explains why the
   previous 2 rounds (doubling Rare-bag yield, fixing split_head_zombie
   availability) never fully closed the gap: both improved richness
   per-roll or mob availability, neither addressed that only 4 total
   *rolls* exist campaign-wide. Fixed by adding `gold_nugget` to the
   Uncommon pool (weight 20, count 6-15) sized via a worked estimate
   (cumulative Uncommon-mob kills by wave, expected bags at the
   existing 50% drop chance) to make the amulet realistically
   affordable by roughly wave 4-6 - meaningfully earlier and far less
   RNG-dependent than the previous "hope for a Rare bag by wave 8"
   reality, without oversizing a single Uncommon entry into
   implausibility. Verified end-to-end via `/loot spawn` in a live
   sandbox - a real `gold_nugget` item entity actually dropped from the
   modified table, not just valid JSON.

**Damage Numbers, Pick Up Notifier, and Xaero's World Border — done,
built and deployed 2026-09-05.** Three small polish items, closes out
the queued Pick Up Notifier/minimap investigations plus a re-attempt of
the long-stuck Damage Numbers pick:
- **Damage Numbers** (luavixen, CurseForge project 1022853) — the
  earlier "wrong mel1x mod" conclusion was a real mistake, re-verified
  via Modrinth's API that this project is genuinely luavixen's own.
  Installed clean, no mandatory dependencies, loads fine on a dedicated
  server (unlike Mob Dismemberment).
- **Pick Up Notifier**, scoped to loot bag opens only — real reflection
  integration built (not the mod's native pickup hook, which can never
  fire for a direct-to-inventory grant), verified end-to-end via a live
  sandbox diagnostic (every class/field/method resolved, message object
  actually constructed). Needs Puzzles Lib as an added dependency. Full
  writeup in FEATURES.md's "Pick Up Notifier + world border on minimap"
  entry.
- **Xaero's World Border** (Modrinth, third-party addon by "Alazi," not
  the real Xaero) — installed via `packwiz modrinth add` since it's
  Modrinth-only; caught and reverted an unintended side effect where
  packwiz's dependency resolution silently switched the already-
  installed Xaero's World Map from CurseForge to Modrinth sourcing.

All three verified via clean sandbox boots and deployed to the live
instance's actual mod/script files. **Real deployment note: mods only
load at full game launch, not on a world/server reload** - this needs
the whole Minecraft client closed and relaunched via the CurseForge
launcher, not just an exit-to-title, to actually take effect. Not yet
confirmed by a real playtest (particle rendering, popup appearance, and
border rendering are all client-visual checks a dedicated sandbox can't
verify).

**New endless-phase design, 2026-09-05 — replaces relying on
hordeSizeScaleFactor for mob COUNT, `spawn_horde` stays for flavor.**
Real finding: `spawn_horde`'s horde tiers have spawnChance values summing
to 100 per tier — a weighted single pick per call, not an independent
roll per entry, so it was never able to hit a deterministic two-part
(zombie vs. other-type) composition target. Resolved design: keep
calling `spawn_horde` unchanged (same attribute scaling, same
randomness/flavor value), ADD a second additive layer guaranteeing a
baseline count every endless wave:
- `z = round(10 + n·1.054^n)` — vanilla `minecraft:zombie` count
- `m = round(5 + n·1.01^n)` — "other types," drawn from the existing
  tiered roster pools, weighted so tougher types show up more as n climbs
- `n` = real wave number

| Wave | z | m | Total |
|---|---|---|---|
| 9 | 24 | 15 | 39 |
| 10 | 27 | 16 | 43 |
| 11 | 30 | 17 | 47 |
| 12 | 33 | 19 | 52 |
| 13 | 36 | 20 | 56 |
| 14 | 39 | 21 | 60 |
| 15 | 43 | 22 | 65 |
| 16 | 47 | 24 | 71 |
| 17 | 52 | 25 | 77 |
| 18 | 56 | 27 | 83 |
| 19 | 62 | 28 | 90 |
| 20 | 67 | 29 | 96 |
| 21 | 73 | 31 | 104 |
| 22 | 80 | 32 | 112 |
| 23 | 87 | 34 | 121 |
| 24 | 95 | 35 | 130 |
| 25 | 103 | 37 | 140 |
| 26 | 112 | 39 | 151 |
| 27 | 122 | 40 | 162 |
| 28 | 132 | 42 | 174 |
| 29 | 143 | 44 | 187 |
| 30 | 155 | 45 | 200 |

Additive, not a replacement — spawn_horde's own mobs land on top of this
baseline. **Built and deployed 2026-09-05.** Peer sent 2 follow-up
clarifications on the spawning model before this was built, both folded
into the shipped version:
- **Not a burst, and not paced across the whole wave either.** Final
  model: mobs stream in continuously starting at wave start, at
  whatever pace the game allows, until the calculated total (z+m) for
  that wave is reached — then stop; no more spawn until the next wave
  triggers. Reuse the existing `pendingSpawns` staggered-drain queue
  technique from waves 1-8, just don't rush it artificially — let it
  genuinely feel like a continuous stream, not a burst, but don't
  stretch it to fill the whole countdown window either (that was a
  since-corrected earlier version of this instruction).
- Spawn target is the pedestal (unconditional-targeting redesign's real
  live objective) — "the amulet" in the original user framing is almost
  certainly old habit from when the amulet gated the objective, worth a
  quick sanity check but not worth blocking on.
- **Performance gate dropped for this specific feature, direct
  instruction**: since spawns trickle in over time rather than landing
  concentrated in one tick, the earlier "needs real tick-time
  measurement before shipping" requirement no longer applies here — the
  separate, already-queued general FPS/world-load investigation still
  stands on its own below, just not as a gate on this.

Implementation, in `wave_spawner.js`'s endless-phase branch: `n` is the
real `waveNumber` (confirmed against the table above, not `endlessLevel`
— e.g. n=9 gives z=24/m=15, n=30 gives z=155/m=45, both match exactly).
"Other types" draw from 3 new toughness tiers (`ENDLESS_OTHER_TIERS`),
weighted by `endlessLevel` (1-40, not raw waveNumber) so heavier tiers
phase in as the difficulty climbs. Reuses the exact same
`randomObjectiveRelativePosition`/`pendingSpawns`/`staggerGapForWave`
machinery waves 1-8 already use (moved `PI`/`SPAWN_DISTANCE_MIN/MAX`/
`randomObjectiveRelativePosition` above the endless branch so both paths
share them) rather than a bespoke queue — `staggerGapForWave`'s own
4-tick/0.2s floor is already reached by wave 9, so every endless wave's
baseline layer drains at that same continuous pace (≈40s for a 200-mob
wave 30), front-loaded at wave start, exactly matching the "stream in,
then stop" spec. `spawn_horde` itself untouched. Verified via a clean
sandbox boot (`node --check` clean, KubeJS loaded 18/18 server scripts
with 0 errors) and deployed to the live instance's script file — **not
yet confirmed by an actual endless-phase playtest** (needs a real wave
9+ run to see the baseline mobs actually arrive and stream in as
intended). Live client was running during deployment; the copied
`.js` file is inert until the next full world/server reload, per this
pack's own established KubeJS load-once behavior — flag this to the user
explicitly before they judge results.

**Real bug found chasing the "hordes still feel small at wave 27"
report — sequential horde-type selection never actually cycled.** Not
the horde-SIZE bug (that curve is confirmed correctly written and
loaded - checked live level 19's real hordeSizeScaleFactor=8.4,
matches the retuned formula exactly; automatic difficulty progression
is also confirmed OFF in the live save, ruling out a silent
day-based override). Real, separate, confirmed bug instead: decompiled
`DifficultyLevelCommand.setDifficulty()` directly - every call, even a
redundant one re-setting the SAME level, unconditionally resets Undead
Nights' own sequential horde-selection index
(`serverState.setPossibleHordesIndex(-1)`). `wave_spawner.js` used to
call `/undeadnights difficulty set` on every single wave regardless of
whether the level had actually changed, so that index reset every wave
too - `listOfPossibleHordes` always resolved its first entry, never
cycling through the later hordes (elite_horde/boss_horde) the way the
mod intends. Fixed by only calling `difficulty set` when the computed
level actually differs from the last one sent. Could NOT confirm or
rule out the "stuck at level 1's exact horde size" claim through static
analysis alone - real per-entry RNG variance at level 19 (~8.4 expected
total, but each of 6+ entries independently rolls its own count and
spawn chance) can plausibly land as low as "a few mobs" on any given
real horde by chance. Real, cheap next step if it's still reported:
have the user run `/undeadnights difficulty query` themselves right
after a wave - a real player command that reports the mod's own current
level directly, not inferred.

**Endless-phase horde SIZE, not just toughness — done.** Direct
feedback once the wave-9 fix actually let mobs spawn: "I want the waves
to feel frantic, actual hordes of zombies... difficulty scaling is a
mix of stronger mobs but MAINLY quantity." Real mechanism decompiled
directly (`SpawnProcess.spawnHordeImplementation`, config variant 2 -
the one this pack uses): per mob entry,
`scaledCount = round(countMin × (1 + hordeScale) × hordeSizeScaleFactor)`,
then each entry independently rolls its own `spawnChance`. Every entry
in every horde has `countMin = countMax = 1`, `hordeScale` is 0
(dynamic scaling disabled), and the old `hordeSizeScaleFactor` curve
started at 1.0 and only crossed whole-number thresholds around level
10+ - so at low-mid endless levels, `scaledCount` mostly rounded to 1
per entry regardless of the "scaling," and each entry's own spawn-chance
thinned it further. Computed real expected mob counts per horde spawn
(not guessed): old curve gave ~1.1 mobs at level 1, ~3.5 by level 40.
Retuned `hordeSizeScaleFactor` to start at 3 and ramp +0.3/level,
capped at 12 (reached level 31) - same real math now gives ~3.5 mobs at
level 1, ~13.8 at level 40 (roughly 3-4x across the board). Deliberately
left per-entry `countMin`/`countMax` and the attribute scale factors
(health/damage/speed) untouched - one clear lever, not two compounding
at once, and toughness scaling wasn't the complaint. Verified: clean
sandbox boot with the edited config. Real cross-thread note: this
increases concurrent mob count in endless phase, directly relevant to
the separately-queued FPS investigation - factor this into that
baseline once picked up, not evaluated against the old, thinner horde
sizes.

**Andesite "medium hard to find" target — done.** Direct user ask, not
just a complaint. Real checks before touching anything: in-chest odds
were already fine (andesite weight 4 of 15 in trash.json's main pool,
~27% per roll, ~54% cumulative across its 1-4 rolls - not stripped by
loot_dead_weight_strip.js, nothing else touches it). The real gate was
structure exposure: all 4 postapocalypse_structures sets
(abandoned_brick_house, redhouse, red_mansion, yellowhouse - the 3
loot tables live across all of them) were still at their original,
untouched 30/15-chunk spacing (480/240 blocks average) - never touched
by the earlier structure-density-fix pass, and genuinely sparse relative
to this pack's early-game explorable radius. Retuned to 16/8 chunks
(256/128 blocks). Verified live via vanilla `/locate`: nearest
redhouse/yellowhouse/red_mansion now 107-137 blocks from a fresh
origin - comfortably reachable within a few waves' worldborder growth.
(abandoned_brick_house is also the player's own base template - its
natural copies read as "found a similar abandoned house," not a bug;
its 48-block real distance in the same test is still covered by the
existing spawn-proximity safety check, not a new risk.)

**Player-danger fix ("retaliate + block path") — decided and done.**
Real side effect of the mob-pathing fix (7d74545): stripping every
TargetGoal instance also removed vanilla's own `HurtByTargetGoal`, so
mobs beelining for the pedestal completely ignored the player even
mid-combat. Decision: mobs keep prioritizing the pedestal, but (a)
fight back if hit, (b) actually attack a player standing in melee
range instead of pathing through them. Fixed both without touching the
pedestal-priority guarantee: `HurtByTargetGoal` is now explicitly
excluded from the strip (kept alive - real vanilla retaliate-when-hit,
no custom logic needed), and the existing 10-tick reassertion loop now
checks distance to the player first (3.5-block melee-block range) and
targets the player instead of the pedestal for that cycle if they're
that close, reverting back to the pedestal the very next cycle once
they're not. Verified live: a real zombie's `HurtByTargetGoal` survives
the strip (target selector goes from 7 goals to exactly 1, that one),
while every ESM re-targeting goal is still correctly removed, zero
exceptions.

**CRITICAL: endless phase (wave 9+) completely non-functional since
2026-09-02 — done, real root cause found and fixed.** Live report:
"wave 9, nothing spawned in at all." Decompiled `HordeSpawner.tick()`
directly (Undead Nights' own class) - the 2026-09-02 fix that set
`undeadNightsEnabled = false` (to stop this pack's own night-locking
from also tripping the mod's autonomous horde-night system) only ever
checked whether `SpawnHordeCommand`'s own method read that flag (it
doesn't). It never checked `HordeSpawner.tick()` itself - the method
that actually processes the pending-horde queue that command adds to -
whose very FIRST line is `if (!getUndeadNightsEnabled()) return 0`.
Every `/undeadnights spawn_horde` call (wave_spawner.js's own endless-
phase trigger) was queuing a real request that nothing ever consumed.
Every endless wave has been vacuously "clearing" with zero real mobs the
entire time - not a regression from today's churn, a real gap since
that earlier fix shipped.
Fix: re-enabled `undeadNightsEnabled`, and closed the 3 real autonomous
trigger paths inside that same method at their own source instead -
`chanceForHordeNight = 0` and `enableRandomHordes = false` across all 40
levels in `undeadnights_difficulty_config.json`, `hordeZombiesSpawnNaturally
= false` in `undeadnights-server.toml` (a third, independent "stray
zombie" 3%-per-tick path, otherwise still live). This also directly
covers the separate Lure Effect disable request (same file, same
all-40-levels edit): `enableLureHordeEffect`/`lureHordeEffectSpawnsHorde`/
`strongLureHordeEffectSpawnsHorde` all set false.
**Real deployment note**: `undeadnights-server.toml` is a Forge
SERVER-type config, baked into the save at world creation
(`saves/<world>/serverconfig/`) - fixed directly in the user's own live
save, not just defaultconfigs, but still needs them to exit and reload
that SAME world (not a fresh one) for it to take effect. Real expected
side effect once they do: their save has backed-up pending-horde
requests from the wave 10-19 horn-spam - likely a noticeable batch of
mobs materializing at once rather than a clean single wave, not a bug.
Verified: clean sandbox boot with all edited configs, no load errors -
full player-triggered confirmation still pending their next login (same
real-player blind spot as every other player-input-dependent fix this
session).

**7-item live feedback batch — all done.**
1. HUD element for waves cleared - done, plain vanilla scoreboard
   sidebar (`td_waves_cleared`), objective created once at login
   (playtest_starter_kit.js), real value set every time a wave is
   actually marked cleared (wave_status.js). Verified live via RCON.
2. Loot bag notification "cooler" rendering - investigated, no genuine
   fit among already-installed mods (ToastControl is a filter/reposition
   layer over vanilla's own toast triggers, can't push custom text; Jade
   is unrelated). Real candidate found afterward: **Pick Up Notifier**
   by Fuzs, not yet installed - real Forge 1.20.1 build confirmed to
   exist, genuine theming. Needs its own investigation before building
   (native pickup-event hook vs. BountyBags granting items directly into
   inventory, not via walk-over pickup) - not started yet, queued.
3. Quest reward audit - done, all 19 original quests + the new
   repeatable one reviewed; found the real gap was much bigger than
   first estimated (only 1 of 19 quests already had a tangible reward,
   not 6 - the others were mistaking "the task requires this item" for
   "the reward gives this item"). Full proposed table approved as
   written and built exactly as proposed - real item rewards alongside
   existing XP on every quest, tied thematically to what each quest is
   about ("traps give iron" pattern). Verified live: FTB Quests loads
   the edited file with 0 errors.
4. Crafting table waterlogged bug - investigated thoroughly, could NOT
   reproduce or find a real cause. `craftingstation:crafting_station`'s
   blockstate has zero properties (confirmed via its real blockstate
   JSON and its real block-entity data after a live placement) - it
   cannot be waterlogged, full stop. No water source anywhere in the
   raw structure NBT near that position either. Reporting as a null
   result rather than guessing a fix - possibly a visual misread, or a
   different cause not reproducible from static data alone.
5. Pre-place a Waystone + Tier 1 completion reward - done. Waystone
   placed in the yard next to the pedestal at login
   (playtest_starter_kit.js), same pre-placement convention. Tier-1-
   complete quest identified from the real dependency graph (not
   assumed): "The Reckoning" - the quest whose own text says "Five
   waves was as far as whoever held this post before you got... you've
   matched that" - real narrative gate at the wave-5 milestone, gets a
   bonus `waystones:waystone` reward alongside its XP/golden_apple.
   Verified live via RCON: real waystone places with a genuine UUID
   (mod registers it immediately as a valid destination).
6. Repeatable "in case you lose it" wave_horn quest - done, new quest
   "Lost the Horn?", `can_repeat: true`, 60-second cooldown (checked
   FTB Quests' own Quest.class directly for the real field names/units -
   `repeat_cooldown` is real seconds, not ticks). Description explains
   what the horn does, doubling as documentation per the ask.
7. Wave-start sound - done, vanilla `block.bell.use` wired to both
   wave-start announcement points (hand-authored 1-8 and endless 9+),
   explicit placeholder per the ask.

**7-item live feedback batch, 2026-09-05 — original dispatch, see the
"all done" writeup near the top of this file for real results.** Item
2 (loot bag notification) is the one real exception - investigated, no
fit found among what was already installed, still open pending the
Pick Up Notifier investigation.

**Live report, 2026-09-04 (mid-playtest, right after the mob-pathing
fix shipped) — checked, NOT a regression.** "spitter's path seems off."
Summoned a real spitter in a sandbox and inspected its actual goal
selector before/after the strip: only the 2 real
`ESM_EntityAINearestAttackableTarget` goals were removed, exactly as
intended - `ESM_EntityAIAttackRanged` (its real ranged/kiting attack
goal) is fully intact both before and after. Real explanation instead:
that goal reads the mob's current `setTarget()`-assigned target for its
own logic, so once locked onto the pedestal it does what it's actually
coded to do - stop closing distance once in firing range and strafe
side-to-side around that range rather than walking straight in.
**Decision came back: force melee close-in against the pedestal
specifically, keep strafe-and-shoot against a player — done.**
`ESM_EntityAIAttackRanged` is now removed from the goal selector inside
the same one-time strip that already runs when a mob's target is forced
onto the pedestal (structural scoping, not a runtime check - the
function only ever runs from that one call site). Spitter already has a
real `ESM_EntityAIAttackMelee` goal registered alongside the ranged one,
so removing just the ranged goal is enough for melee to take over on its
own - no new goal needed. Verified live against a real spitter: ranged
goal gone, melee goal + all other real behavior (swimming, wander,
avoid-explosion, look-around) intact, zero exceptions.

**2 more live reports, 2026-09-04 — both done, real numbers checked.**
- **"Not getting enough gold still" (round 2, after item #15's per-bag
  yield bump).** Real bottleneck was availability, not yield:
  `gold_ingot`'s only source (loot_bag_drops.js's `RARE_MOBS`, 25%
  chance) was down to exactly 1 mob (`mutantszombies:split_head_zombie`,
  confirmed via the file directly), which only appeared in wave 4 (2
  individuals) in the entire hand-authored campaign and was completely
  absent from the endless-phase horde config - zero gold income past
  wave 8. Fixed by adding it to wave 6 as well and to
  `undeadnights_horde_mobs_config.json`'s `trash_horde` tier, so it has
  a second hand-authored appearance and genuine ongoing endless-phase
  presence instead of 2 individuals total.
- **"The brutes are very tanky... should be coming in later waves,
  seeing them from wave 7."** Real, already-documented cause: the TFTH-
  removal mapping (18302f7) deliberately reused
  `mutantszombies:mutant_brute`/`zombie_brute` a wave early to fill two
  old TFTH slots - explicitly flagged in that commit's own comment as a
  duplicate against their real wave-8 debut. Not a stat-nerf ask - fixed
  by removing the early-wave duplicate (wave 7 now repeats already-
  established mid-tier picks: a second Elite Zombie, more Horde Zombie,
  another Spitter) so Mutant Brute/Zombie Brute's actual first
  appearance is wave 8 again, untouched.

**REPRIORITIZED 2026-09-04 — mob pathing/aggression to the pedestal was
the user's real #1, "the main bug bear."** Done, see item 3 below - real
root cause (ESM splits its re-targeting goals across both selector
fields, plus a genuine cross-file function-name collision between
mob_aggro.js and playtest_starter_kit.js) found and fixed the same day,
commit 7d74545.

**Real playtest findings from actual play, dispatched 2026-09-04
(after the structure/loot fixes shipped) — priority over background
spacing-tuning:**
1. **Remove all TFTH mobs entirely — done, commit 18302f7.** Full
   replacement mapping in wave_spawner.js's WAVES header comment.
   **Sound-for-atmosphere question — decided and done.** User's call:
   extract the one asset, uninstall TFTH fully, no dormant mod. Picked
   `suffer_death.ogg` from TFTH's own real sound registry - Flesh
   Suffer was this pack's own documented most dangerous removed mob
   (a real combat log showed it killing the player 4 times at wave 5,
   before a damage nerf), the clearest "distinctive/atmospheric" fit,
   not a guess. Extracted into this pack's own resource pack
   (`kubejs:flesh_suffer_death`, new `flesh_death_sound.js`), wired to
   play on death for the roster's own higher-tier mobs only (loot_bag_
   drops.js's EPIC_MOBS/LEGENDARY_MOBS tiers) via a real, decompile-
   confirmed KubeJS event (`EntityEvents.death`). TFTH fully removed:
   packwiz uninstalled, both config files deleted, live jar removed.
   Verified live: clean sandbox boot with TFTH genuinely absent (0
   KubeJS script errors, the new sound script loads fine) - the one
   real warning ("Missing data pack mod:the_flesh_that_hates") is just
   that reused sandbox world's own stale datapack-list metadata, not a
   crash or a real problem; confirmed zero TFTH references remain
   anywhere in the live instance's actual config/script files.
2. **Iron rolling still insufficient with the Hand Crank actually
   connected — done, commit pending this session.** Real numbers,
   decompiled not guessed: Hand Crank is Create's own ACTIVE power
   source (32 RPM but decays to 0 every 10 ticks/0.5s without
   re-clicking, even costs the player hunger) - gearing can't fix an
   on/off source. Fixed by cutting `rolling_mill_processing_duration`
   120 → 40 in `createaddition-common.toml` (now tracked in repo for the
   first time). Full numbers in FEATURES.md.
3. **Mobs not pathing to the pedestal reliably in real play — done,
   commit 7d74545.** Real root cause: ESM splits its
   ESM_EntityAINearestAttackableTarget goals across BOTH of a mob's
   target-goal-selector fields, and the old content-based check only
   caught one; separately, mob_aggro.js and playtest_starter_kit.js had
   a real cross-file function-name collision (top-level functions DO
   share across server_scripts in this build) that was silently
   corrupting mob_aggro.js's own reflection calls - the actual cause of
   54 confirmed live errors. Both fixed, verified against 3 real mob
   types in a sandbox. Full writeup in FEATURES.md.

**2 more real asks, dispatched 2026-09-04, alongside the 3 playtest
findings above:**
4. **Escalating time-between-waves — done, commit pending this
   session.** 90s at wave 1, +15s/wave, capped at the original 3min at
   wave 7. Real title/chat announcement at wave 5 ("THE NIGHTS GROW
   LONGER"), alongside the existing gear-removal beat there. Full curve
   verified in a sandbox. Full detail in FEATURES.md's "Countdown
   timer" entry.
5. **Trapcraft's Spikes re-introduced as the weak Tier 1 interim trap,
   below Barbed Wire — done, built and deployed 2026-09-05.** Real stock
   recipe (5 iron ingots, decompiled from the jar) was too steep for
   "weak/cheap interim" - retuned via new `tier1_recipes.js` (mirrors
   `tier2_recipes.js`'s pattern) to 4 sticks + 1 iron ingot, the cheapest
   defense item in the pack. "Damage AND slow" resolved by pairing with
   plain vanilla cobweb (its own real slow effect) rather than a code
   change - `SpikesBlock.java` only ever damages, confirmed by
   decompiling it, so the new quest's own description spells the
   cobweb pairing out to the player directly instead of leaving it
   silent. New quest "Better Than Nothing" added to `campaign.snbt`
   (fresh id, no collision with any existing progress - purely
   additive). Verified via clean sandbox boot (0 script errors, 0 failed
   recipes, FTB Quests logged the expected 31-quest count) and deployed;
   `packwiz refresh` run, hashes clean. Full detail in FEATURES.md's
   "Trapcraft Spikes re-introduced" entry under Tier 1 defenses. **Not
   yet confirmed by a real playtest.**

**2 more real bugs, dispatched 2026-09-04, alongside the structure-
proximity regression above:**
1. **Big Lost City — full clean removal — done, shipped 2026-09-04
   (commit bee3780).** User's manual jar deletion had left dangling
   KubeJS override references (`Unbound values in registry
   ResourceKey[...worldgen/structure]`, all 37 real ids) — real live
   crash, root-caused against the live save directly. Fixed via proper
   packwiz removal + `rm -rf` of all 62 structure/structure_set override
   files + `packwiz refresh`, both repo and live instance. Philip's
   Ruins confirmed untouched.
2. **Starter loot scattering on the floor at spawn — done, shipped
   2026-09-04.** User's own diagnosis was right, confirmed via direct
   NBT inspection: the 5 real barrels (`abandoned_brick_house.nbt`)
   carry a `LootTable` reference, not pre-filled `Items` — vanilla
   resolves that lazily the first time anything queries the container,
   including the game's own `Containers.dropContentsOnDestroy` path that
   fires when `playtest_starter_kit.js`'s existing `setblock ... air`
   removal loop runs. That lazy-resolve-then-drop, not a "destroy after"
   ordering bug per se, was the real mechanism. Fixed by stripping the
   `LootTable` tag from the raw structure NBT (new datapack override,
   `pack/kubejs/data/postapocalypse_structures/structures/
   abandoned_brick_house.nbt`, same convention as the earlier horse-entity
   overrides) so the barrels are placed genuinely empty — confirmed
   byte-identical to the original except those 5 block entities.
   Verified live end-to-end: placed the template, confirmed
   `Items: []`/no `LootTable` tag on all 5 barrels via `/data get
   block`, ran the exact same removal sequence the real code uses, and
   confirmed zero item entities on the ground afterward.

**Polish/utility mod pass, 2026-09-04 — PAUSED 2026-09-04, 2 of 7 picks
installed.** Direct call: "i just want a stable non structure heavy
playthrough" — real bugs (structure-proximity regression, Big Lost City
crash/removal, loot-scatter) took full priority over adding more surface
area. All 3 are now fixed (2026-09-04) — still holding until the user's
had a real, confirmed playthrough on a fresh world; don't resume on its
own before that. Full spec in FEATURES.md's "Polish/utility mod pass,
2026-09-04" section (right before "Tried and explicitly retired").
- [done] **Sodium/Embeddium Dynamic Lights** + its real dependency
  **Sodium/Embeddium Options API** - installed via packwiz, both jars
  downloaded and sha1-verified, deployed to the live instance.
- [reverted, real incompatibility found] **Subtle Effects** - initially
  installed and deployed, but a genuine full-mod-set sandbox boot test
  (prompted by a direct "is it safe to launch" check, not run
  proactively enough beforehand - real process gap, noted) caught a
  real crash: `Mod 'subtle_effects' requires forge 47.4.14 or above.
  Currently, forge is 47.4.10`. Checked the real `mods.toml` in the
  installed jar directly to confirm the exact version floor, then
  checked the 2 next-older CurseForge releases (1.14.2, 1.14.1) the
  same way - **both carry the identical `[47.4.14,)` requirement**, so
  this isn't a recent regression to dodge by downgrading, the mod
  genuinely needs a newer Forge than this pack is pinned to across its
  whole recent history. Removed entirely (packwiz + live jar + sandbox)
  rather than bump this pack's own pinned Forge version unilaterally -
  that's a real, separate decision (bumping 47.4.10→47.4.14+ is a much
  smaller ask than the NeoForge migration this pack has already
  deliberately deferred, but still a real call, not mine to make
  silently for one polish mod). Re-verified clean: a full fresh-world
  boot with the complete corrected mod set reached "Done," 16/16 KubeJS
  scripts with 0 errors, FTB Quests loaded its full 29 quests.
- [real blocker found, not guessed past] **Damage Numbers by
  luavixen** - genuinely harder to pin down than expected. Two separate
  CurseForge search attempts (`damage numbers`, then the exact slug
  `damagenumbers`) both resolved to the SAME wrong project - confirmed
  by checking the real project-id in each resulting `.pw.toml`, not
  just eyeballing the filename: both are project 1022853, **mel1x's
  mod** ("Fabric mod... floating damage values" per its own CurseForge
  page - wrong author AND wrong loader), not luavixen's. Removed both
  wrong installs before anything reached the live instance. Real
  candidates confirmed to exist by name+author via a proper CurseForge
  search (luavixen's "Damage Numbers," "adds simple damage number
  particles when any entity takes damage") but its own real slug/URL
  and Forge 1.20.1 file availability still need a direct check, not
  another guessed slug.
- [not started] FancyMenu + Drippy Loading Screen, EMF + ETF, Fresh
  Animations, Tissou's Zombie Pack, and the real live layering check
  between the two resource packs.

**Real playtest feedback batch, 2026-09-04 — held, NOT sent to build.**
Full spec for every item in FEATURES.md's "Real playtest feedback batch,
2026-09-04" section (right before "Tried and explicitly retired"). Kept
here as a literal checklist matching the user's own original 1-27
numbering, not a thematic regroup — the thematic version of this entry
(replaced 2026-09-04) buried items badly enough that #14/#20/#24/#25 (4
separate original points, all really one mob-roster decision) read as
"touched on a handful of things" instead of 27 tracked items. This list
is the single source of truth for what's decided vs. still needs a call
— update the tag in place as each resolves, don't re-summarize from
memory.

1. [done, shipped 2026-09-04] Ditch doomsday decorations, AND uninstall
   the mod outright (now fully unused) + delete its lang override.
2. [confirmed] Re:Entity Outliner — real Forge 1.20.1 build, direct fit.
   Not yet installed - no install action requested in this batch.
3. [done, shipped 2026-09-04] Cobwebs removed / grave markers removed
   entirely (flavor tie-in to wave 5 knowingly dropped, not missed) /
   decorative barbed wire line removed / entrance → 3-wide, no door.
4. [done, shipped 2026-09-04] Pedestal HP bar — always-visible-in-range
   bossbar (`kubejs:pedestal_health`, real vanilla `/bossbar`, red,
   0-200). Verified live: every command (`add`/`color`/`max`/`value`/
   `players`/`remove`) confirmed working via direct RCON test.
5. [done, shipped 2026-09-04] Starter loot chests — all 5 real ones
   removed (decompiled the structure's own NBT directly - the original
   "8 chests/barrels" count doesn't match the real file, no chests
   exist at all, only 5 barrels).
6. [done, shipped 2026-09-04] "Bed-like" blocks upstairs — identified
   as real vanilla `minecraft:spruce_trapdoor` x4 (a trapdoor-bed
   decoration trick), not a mod-furniture block as guessed, at local
   [3-6,5,4] in the structure's own NBT. User's call: cleared, not
   reskinned - same as the rest of this batch's decoration-debt strip.
7. [done, shipped 2026-09-04] Front wall pushed out - implemented as a
   +3 gate-to-pedestal buffer (z1-4 -> z1-7) paired with a matching +3
   on COURTYARD_DEPTH so the rig/building gaps this layout depends on
   stay exactly what they were. A naive pedestal-only shift would have
   collided the kinetic rig with the building - caught before shipping.
8. [done, shipped 2026-09-04] Reinforce the whole house — full uniform
   coverage, no falloff. **Real scope correction found while building,
   not assumed**: the structure's true solid wall shell doesn't sit at
   its own bounding-box edges (x=0/11, z=0/10 - checked first, found
   zero real wall blocks there) - the actual walls are 2 blocks further
   in (x=2/9, z=2/9), the outer ring being a real porch/eave overhang.
   Decompiled the real NBT to find all 283 blocks on those 4 wall
   planes, matched each against SecurityCraft's own 495 real
   reinforced-block ids (checked directly - confirmed there is NO plain
   `reinforced_terracotta`, only the 16 dyed-color variants), and
   preserved every block's own exact orientation (facing/axis/slab
   type/wall connection state) from its real NBT properties rather than
   a blanket `/fill` (which would have flattened every stairs/slab/wall
   block to one uniform orientation). **Real, honest result: 212 of 283
   wall blocks (75%) covered.** Real gaps, not silently claimed as
   covered: plain terracotta (36 blocks, no reinforced equivalent
   exists at all), oak_leaves (18) and vine (17, both genuinely
   decorative). Only covers the 4 wall planes, not the roof (a real,
   stated scope limit). Verified live end-to-end: all 212 real
   `/setblock` commands executed via RCON batch with zero errors at the
   script's own real computed coordinates, spot-confirmed a real
   `reinforced_bricks` block present at its exact expected position,
   and the complete file (200+ new lines) reboots clean with 0 KubeJS
   errors.
9. [decided] Revisit house structure — parked, not pursued now (keeps
   #6/#12's NBT-decompile work on the current house worth doing).
10. [likely already works, unconfirmed] Inventory Sorter middle-click —
    real client-interaction check, can't be verified from this
    environment (no real graphical client/player, the same blind spot
    this session has hit before) - needs the user's own live test.
11. [done, shipped 2026-09-04] Crafting table → Crafting Station
    Improved (`craftingstation:crafting_station`, confirmed real via
    the mod's own blockstate JSON - single-variant, no facing property
    - and live-verified placeable in a sandbox).
12. [done, shipped 2026-09-04] Cauldron + tripwire hook — both removed,
    same NBT-decompile pass as #5/#6/#11 (real local coords: cauldron
    [8,1,5], tripwire hook [8,2,5]).
13. [investigated 2026-09-04, no code regression found] Iron rolling
    regression — checked git history first: the rig placement code
    hasn't changed at all since the last confirmed-working commit
    (46a884b, the 2-block Press/Depot clearance fix), ruling out a
    script regression directly. Live-reverified the CURRENT exact
    geometry end-to-end in a sandbox: a real iron_ingot dropped on the
    Depot correctly converted to `create:iron_sheet` via the Press, and
    the Rolling Mill correctly converted that sheet into 2x
    `createaddition:iron_wire` - the full pipeline works when powered
    from the correct kinetic input side. **Real remaining limit, not
    solved**: the rig ships deliberately UNPOWERED by design ("the only
    remaining player task is crafting a Hand Crank and connecting it")
    - "regressed" most likely traces to the player's own manual crank
    connection (whether it's connected, connected to the wrong spot, or
    a hand crank's real low rotational speed making throughput feel
    much slower than the creative-motor test conditions), which is an
    interactive building step this environment can't test without a
    real player.
14. [decided method, real prep done] TFTH roster audit, not blanket
    removal — Flesh Hysterizer confirmed cut. **Screenshot pass ruled
    out 2026-09-04** - this environment has no graphical client (same
    blind spot as #10/#16), so an actual visual audit isn't achievable
    from here. Instead did the real, cheap check that IS possible: live
    `/summon`-tested all 7 remaining TFTH mobs - all genuinely
    registered and summonable, no dead/renamed ids. **Real, useful find
    along the way**: `plaquecreaturetwo`'s actual in-game display name
    is "Flesh Hunter One," not something matching its own registry id -
    worth knowing before the user goes looking for it by a name that
    won't appear anywhere in-game. The user will do the real visual
    keep/cut call themselves next time they're in-game.
15. [done, shipped 2026-09-04] Gold roll bump — BountyBags Rare bag,
    weight 30→45, count 4-6→6-9 (roughly doubles expected gold per
    hit, first-pass tuning number).
16. [needs investigation, real limit] World border on minimap —
    checked config (no toggle key exists for it either way, only an
    unrelated "claim_border" opacity setting) - whether it actually
    renders is a real client-visual check this environment can't
    perform (no graphical client). Needs the user's own look in-game.
17. [done, shipped 2026-09-04] Quest book keybind → Tab - already bound
    correctly in the live `options.txt`. **Real conflict confirmed by
    checking, not assumed**: vanilla's own player-list overlay
    (`key.playerlist`) is ALSO bound to Tab on the same profile -
    pressing Tab now triggers both actions. Flagged, not rebound
    unilaterally - this pack's own live config already has several
    pre-existing multi-bindings on other keys (three separate binds
    share 'u' alone), so this isn't unprecedented. **User's call
    2026-09-04: keep Tab as-is, accept losing the vanilla player-list
    overlay** - no rebind needed. Shipping this as tracked config for a
    fresh install is still a real open question (`options.txt` is
    client-local state, not a mod config folder, and shipping it
    wholesale would lock in unrelated settings too) but not blocking -
    the live instance already has the right binding.
18. [done, shipped 2026-09-04] Minimap defaults — north-lock on;
    `displayed: false` set on every non-hostile category (players,
    friendly, items, other_entities) plus hostile's own `tamed`
    subcategory. **Real bug caught by decompiling Xaero's own
    `RadarColor` enum, not assumed**: the "hostile" category had no
    explicit color override at all, so it was inheriting YELLOW (index
    14) from its parent, not red - the color-index legend matches
    vanilla's 16 chat-color codes in declaration order (RED = index
    12), added explicitly.
19. [done, shipped 2026-09-04] Passive mobs still spawning — confirmed
    broader than horses, and fixed pack-wide. Real root cause: baked
    passive-mob entities directly in structure `.nbt` files (a
    placement path that bypasses `no_passive_mobs.js`'s spawn-event
    hook entirely), not a gap in the mob id list itself. Scanned and
    stripped across all 5 installed structure mods: 25 files fixed (24
    beyond the original single horse file), Philip's Ruins confirmed
    clean. Full writeup in the "Fresh-world playtest, round 3" entry
    above.
20. [folded into #14] TFTH audit example — Flesh Brute I confirmed
    keeper.
21. [done, shipped 2026-09-04] Loot bag open notification —
    custom-built (`loot_bag_notification.js`), hooked directly to the
    bag's own open action. **Real check done before building, not
    assumed**: decompiled BountyBags' own `LootBagItem#use()` directly
    - it sends exactly one real player-facing message (the luck-upgrade
    notice) and never notifies on the actual loot contents (only
    server-console debug logs) - confirms a custom hook was genuinely
    needed. Real technique: `PlayerEvents.inventoryChanged` (confirmed
    via decompile to fire per-slot with the resulting stack) collected
    during a short window opened by the bag's own right-click, chat
    message sent one tick later once the bag's fully-synchronous
    granting has finished.
22. [done, shipped 2026-09-04] Debug wave-complete command
    (`/tdforceclear`, OP-gated) — kills every real hostile within the
    same radius/objective the real clear-check already uses, so the
    existing tick-based detection fires the normal clear sequence on
    its own next pass rather than duplicating that logic. Verified
    live: command registers and executes cleanly via RCON (rejected
    only for the expected reason - no real player attached to a
    console/RCON command source).
23. [done, shipped 2026-09-04] Tips & tricks quest chapter — new
    `tips_and_tricks.snbt` chapter, all 10 confirmed tips (see list
    below), F3 dropped per direct "no." Verified live: fresh sandbox
    boot loaded "2 chapters, 29 quests" (19 + 10), 0 FTB Quests errors
    - real caution given this pack's own documented FTB Quests syntax
    crash history.
24. [real prep done, verify by eye] Other brute mob — same screenshot
    ruled out as #14, real non-visual data gathered instead: both
    `mutantszombies:zombie_brute` and `mutant_brute` confirmed
    summonable, plus their real distinguishing stats (live-checked, not
    guessed) - Zombie Brute: 100 HP / 16 attack; Mutant Brute: 120 HP /
    18 attack (tougher and hits harder). The name itself is a real clue
    too - "Zombie Brute" is the more zombie-like one by naming alone,
    not verified visually. Final identification still the user's own
    call in-game.
25. [done, shipped 2026-09-04] Flesh Hysterizer removed (same call as
    #14) — wave 8's slot filled with `mutantszombies:crawler` (the
    Advanced Wall Climber API mob), user's pick from the 4 real
    unused-candidate options. Updated in all 5 files that duplicate the
    mob roster (wave_spawner.js's WAVES + WAVE_MOB_TYPES, mob_aggro.js,
    pedestal_health.js, wave_status.js, loot_bag_drops.js's
    LEGENDARY_MOBS).
26. [investigated 2026-09-04, real numbers found] Barbed wire vs.
    Mutant Brute — **not a resistance/immunity issue, checked directly
    by decompiling `BarbedWireBlock#entityInside()`**: damage goes
    through the real, standard `Entity#hurt()` pipeline via a genuine
    (if custom) DamageSource, nothing mod-specific blocks it. Real
    cause is simpler: `barbed_wire_damage = 2.0` (config, confirmed) vs.
    Mutant Brute's real 120 max HP (confirmed live via
    `/attribute ... base get`) - 60 hits to kill from wire alone,
    genuinely negligible, not broken. **Real trap comparison, not
    guessed** (decompiled each mod's own damage logic):
    - **Trapcraft's Bear Trap**: only 1.0 dmg per ~1-2 real seconds
      while a mob is caught, but it also adds a real `DoNothingGoal`
      that holds the mob in place for the whole time it's trapped -
      the actual value here is crowd control, not raw damage.
      **Real pick to prioritize**, given the ask was specifically about
      a tanky mob that's hard to whittle down - holding it still lets
      other defenses (turrets, the player) actually focus it.
    - **Medieval Defense Turrets' Landmine**
      (`medievalturrets:landmine`): real 12.0 damage in one hit (6x
      barbed wire, 12x a single bear-trap tick) - genuinely meaningful
      burst, but single-use (consumed on trigger) and needs real
      redstone wiring to fire, not a simple walkover trap.
    - Archer Turret (`medievalturrets:archer_block`) not checked -
      needs a real ammo/targeting setup this session didn't have time
      to verify live, flagged as unchecked rather than guessed.
27. [blocker resolved, flow not yet built, PAUSED 2026-09-04 — stability
    first, see the priority note at the top of "Ready to build"] Manual
    fresh-start trigger:
    craftable/given item, same pattern as the Wave Horn. All-players-
    killed: **build the real multiplayer check**, not simplified to
    solo-player-death (user chose "plan for multiplayer" over the
    simpler singleplayer-only option). **Real blocker answered
    2026-09-04, not guessed**: compared the real `ftbquests/<uuid>.snbt`
    progress file across two different save folders on the live
    instance directly - genuinely different completion timestamps/task
    counts despite the same player UUID, confirming progress is real
    per-world save data, NOT shared or account-wide. "New world, keep
    quest progress" needs a real export/import step, exactly as
    suspected - it will never happen for free. Neither restart flow
    itself is built yet (this was investigation only, the actual
    mechanism - game-over trigger, quest export/import, fresh-start
    item, multiplayer all-killed detection - is real remaining work).

**Tips & Tricks chapter — confirmed content**, F3 dropped by direct
"no," everything else kept:
1. Z — zoom in (Just Zoom).
2. R — view a JEI recipe for the item you're hovering.
3. U — see what uses the item you're hovering (JEI).
4. M — open the full world map (Xaero World Map).
5. Tab — open the quest book (once #17 ships).
6. Middle-click a container — auto-sort its items (once #10's confirmed
   live).
7. Just look at a block or mob — Jade shows live info with no keybind
   needed.
8. Right-click a loot bag to open it.
9. Open your inventory and find the Curios accessory slot — that's
   where the amulet goes, not the armor slots.
10. Waystones — set one, then teleport back to it from any other
    Waystone once unlocked.

**Real status as of 2026-09-04**: 17 of 27 items done and shipped
(#1/#3/#4/#5/#6/#7/#8/#11/#12/#15/#17/#18/#21/#22/#23/#25, plus #19
already covered in "Fresh-world playtest, round 3" above). #13 and #26
are real investigated findings, not open questions - #13 found no code
regression (the rig works end-to-end when powered, real remaining cause
is the player's own hand-crank connection, an interactive step this
environment can't test); #26 found the real numbers (barbed wire's 2.0
dmg vs Mutant Brute's 120 HP, not a resistance issue) plus a real trap
comparison recommending the Bear Trap's crowd-control value over raw
damage. #27's real blocker is answered too (quest progress is
per-world, needs a real export/import step) but the restart flow itself
isn't built yet - the one substantial remaining build item from this
batch. #14/#20/#24's screenshot pass was ruled out (no graphical client
in this environment, same blind spot as #10/#16) - real non-visual prep
done instead: all 7 TFTH mobs and both brute variants confirmed real
and summonable, plus the brutes' real distinguishing stats gathered
live. The user does the final visual keep/cut call themselves in-game.
Still genuinely open: #9 (parked by design), #10/#16 (real
client-visual/interaction checks this environment can't perform - need
the user's own in-game look), #2 (verified real, not installed - no
install was actually requested).

**2026-09-01 playtest feedback batch** — real extended playtest, first
one to exercise the endless-phase scaling, Tier 2, and the base
redesign together. Sequenced 2026-09-01 (user-confirmed order). Phases
1, 2, and 4 are done (see "Built, awaiting your next playtest"); Phase 3
is partially done (structure loot fix shipped for one of two mods, see
below); Phase 5 not started:

3. Structure improvements, remaining — spawners in structures, held
   until after the aesthetic structure variety pass and Abandoned
   Urban's chest fix land and prove stable (user's own sequencing call,
   2026-09-04) — same real jigsaw/structure-generation crash-history
   caution as always, not stacking structure-gen changes in one pass.
5. Decoration polish last — lang-file fix is cheap and can happen any
   time, but placement/density reassessment waits until the user has
   actually seen the redesigned base in a fresh world.

- **Structure spawners — held, not sent yet.** Add spawners to
  structures for real danger via the same `processors` technique as
  the chest-loot fix below. Deliberately sequenced *after* the aesthetic
  structure variety pass and the Abandoned Urban chest fix (both sent
  2026-09-04) rather than stacked into the same batch — this pack has a
  documented history of jigsaw/structure-generation crashes from
  exactly this kind of change, and 3 structure-gen changes landing
  together would make any new crash much harder to root-cause. Send
  once those two are confirmed stable.
- **Decoration quality**: placement itself read as "lame" — worth a
  look once visually confirmed, may need denser/more varied placement
  rather than a mod swap. (Chinese labels fixed, see "Built" below.)
- **Modded crafting materials in loot — retracted 2026-09-06.** Original
  spec (bonus rolls of Create's andesite_alloy/iron_sheet/iron_wire)
  pulled after direct correction: those items are the literal outputs
  of the Press/Rolling Mill rig already pre-placed at the base, and
  andesite_alloy undercuts the existing andesite exploration-gating —
  loot shouldn't hand out shortcuts to what a placed home machine
  already makes. Full writeup + the resulting standing design principle
  in FEATURES.md's "Modded crafting materials in loot" entry (under
  "Loot bags"). No replacement item proposed — revisit once Tier 3-4/
  Storage & Power ships real components nothing at home can make.
  Superseded by the loot-table dead-weight audit below.

## In progress (sent directly to the build session)

- **Fresh-world playtest, round 3 — done, shipped 2026-09-04 (real
  commit date, not the dispatch's own 2026-09-06 dating).** Full detail
  in FEATURES.md right after "Real playtest report, 2026-09-06" (under
  "Reduce vegetation near spawn"). All 3 original items done and
  live-verified, plus a real 4th finding along the way:
  1. **Savanna/savanna_plateau removed entirely** from the spawn search
     (both `wasteland.json` and `playtest_starter_kit.js`), radius
     widened 1200 → 4000 blocks (justified against real prior data in
     this pack's own history, not guessed). Verified live: multiple
     fresh-world runs each found real desert-only spawns, at distances
     up to ~3600 blocks confirming the wider radius was actually needed.
  2. **Horses root-caused, not just patched**: confirmed the existing
     `no_passive_mobs.js` hook DOES catch natural chunk-population
     spawns (10/10 live); the real bug was baked-in horse entities in
     one of The Lost City's own structure NBTs, a placement path that
     doesn't fire KubeJS's spawn event at all (checked - no catch-all
     "entity joined" event exists in this KubeJS build). Fixed by
     surgically stripping the 3 horse entities from that one file's real
     NBT data via `prismarine-nbt`, leaving its 17 other real entities
     (villagers, decor) untouched. Verified live: placed the real
     template, confirmed villagers present, zero horses anywhere.
  3. **Structure-proximity check** added to the spawn search via real
     reflection into vanilla's `findNearestMapStructure` (SRG-obfuscated
     in this build). Caught and fixed 2 real ambiguous-reflection bugs
     along the way (`Class#getMethods()`'s ordering is unspecified by
     the JLS - a naive shape match picked the wrong same-shaped method
     between separate boots, twice, for two different classes) before
     trusting it. `STRUCTURE_MIN_DISTANCE = 200` blocks, justified
     against this pack's own real border-growth curve (caps at diameter
     125 across the full 8-wave campaign). Verified live end-to-end: a
     real 208.6-block distance computed and correctly accepted against
     the threshold, not a trivial pass.
     **REAL REGRESSION REPORTED, ROOT-CAUSED AND FIXED — 2026-09-04.**
     Real fresh playtest found structures spawning "way too close, even
     to the point of the base structure spawning on top of other
     structures." Root cause found via live instrumented diagnostic
     against the real live save's exact seed (`-7367485585009964989`):
     the merged-registry proximity check itself was working correctly
     (not scoped to one mod, not a timing gap, not missing from the
     login path — all 4 originally-suspected causes ruled out). The
     real problem was density: Philip's Ruins' 14 structure_sets were
     all packed at vanilla-village-tier spacing (16/8 chunks), and
     collectively made every biome-matched wasteland candidate within
     the full 4000-block search fail the 200-block clearance check —
     100% rejection, confirmed both before AND after Big Lost City's
     removal (best case only 192.67 blocks, just short). Worse: when
     the search came up empty, the login handler fell back to
     `spreadplayers 0 0` with **zero** structure-proximity protection at
     all — that unchecked fallback, not the threshold number, is what
     actually produced the reported overlap.
     Fix (evidence-based, not a guessed retune): Philip's Ruins' 14
     structure_sets tripled in spacing/separation (16/8 → 48/24 chunks;
     `ancient_dungeon` and `desert_structures` alone had accounted for
     67.5% of rejections), `abandoned_urban:motel` bumped similarly
     (24/12 → 40/20). `findWastelandSpawn` no longer returns null and
     silently defers to the unprotected origin fallback — it now tracks
     the best real candidate seen during the ring search and returns
     that if nothing clears the full threshold, so the unchecked (0,0)
     path is now unreachable as long as any wasteland biome exists
     anywhere in the search radius. Verified live on the real seed:
     clean boot, no crash, real non-null result in ~1.2s.
     **Scope note**: per direct user instruction, this was shipped once
     it reached "stable boot + no literal overlap" rather than chasing
     0%-rejection / multi-seed verification — further spacing/threshold
     tuning is an open background task, not a blocker. **Also**: this
     fix only applies to brand-new worlds/players (the login handler is
     gated by a one-time `td_playtestKitGiven` flag) — it does NOT
     retroactively repair an already-broken base in an existing save.
  4. **Real 4th finding, not in the original 3**: the user's own
     follow-up ("not just horses, other mob types too") was right - the
     same baked-entity root cause existed in 24 MORE structure files
     across 2 more mods (big_lost_city's skyscrapers are full of
     atmospheric bats, the_lost_city has 3 farm pens plus a couple more
     houses). Same general scan + strip technique applied pack-wide
     across all 5 installed structure mods (Philip's Ruins checked
     clean). 25 files total, all verified byte-identical except entity
     lists, full batch boot-tested clean before shipping. See item #19
     in the "Real playtest feedback batch" checklist below - now done.
- **Seed-independent world-gen — done, shipped 2026-09-06.** Full
  writeup in FEATURES.md's "Seed-independent world-gen" entry (under
  "World type").
  1. New `data/kubejs/tags/worldgen/biome/wasteland.json` shipped as
     the real documented asset; the runtime search itself checks a
     parallel plain array since `Holder<Biome>#is(String)` turned out
     not to do real tag lookups in this KubeJS build (tested directly,
     not assumed).
  2. `findWastelandSpawn()` replaces the hardcoded coordinate - a real
     ring-search from world origin using `level.getBiome(...)`
     directly, not `/locate` text-parsing or the internal-Java-method
     route originally flagged as likely - `getBiome` alone was already
     fast (~0.3ms/call) and simple enough. Verified live on the exact
     seed this bug was just reported on: found real savanna 864 blocks
     from origin in 145ms, where the old hardcoded point was still
     plains.
  3. Terrain-flatness check (9-point sample across the footprint, level
     if variance > 1 block) - the logic itself is verified by reading
     and a live sandbox check confirmed no false-positive on flat
     ground, but hasn't actually been exercised against a genuinely
     uneven footprint yet.
  **Real deployment note, worth repeating to the user**: needs a full
  game restart (not just relaunching, and not just `/reload` -
  confirmed directly that worldgen tags don't hot-reload) AND a
  genuinely fresh world.
- **Suppress Supplementaries' "Amendments not installed" startup
  screen — done, shipped 2026-09-06.** New `pack/config/
  supplementaries-client.toml`, built from the real generated file
  already on the live instance rather than hand-typed, with
  `no_amendments_screen`/`no_optifine_warn_screen` both `true`. Live
  instance's own copy edited to match.
- **Suppress vanilla's "experimental settings" world-creation warning —
  done, shipped 2026-09-06.** Hide Experimental Warning + Collective
  installed via packwiz, both jars sha1-verified, real Forge 1.20.1/MC
  1.20.1 compatibility confirmed from the mod's own `mods.toml`. Full
  mod set (68 mods) boots clean.
- **Quest tone rework, round 2 — done, shipped 2026-09-06.** All 13
  real description edits applied. **Real catch made mid-build**: the
  repo's own `campaign.snbt` had silently drifted from the live
  instance's real file (a different reward id, and 2 completely
  different quest ids plus a missing dependency, most likely from an
  in-game FTB Quests editor interaction) - checked the live save's
  progress file first, confirmed no completed progress was keyed to the
  diverged ids, then applied the text edits to the real live file and
  synced that back to the repo, instead of deploying the repo's stale
  ids over live and silently orphaning them.
- **Reduce vegetation near spawn — done, shipped 2026-09-06.** Both
  pieces live-verified. Search now tries desert/badlands first (1200
  blocks) before falling back to savanna/savanna_plateau (2000) -
  confirmed correct on the real current seed (desert/badlands genuinely
  too far, fell through to savanna_plateau as expected). Vegetation
  list verified block-by-block live: caught and fixed a real bug before
  shipping (`minecraft:short_grass` isn't valid in this 1.20.1 build,
  it's still plain `minecraft:grass` here - the rename came in 1.20.3+)
  and confirmed the corrected list clears real placed vegetation to air
  while leaving solid ground untouched.
- **Legendary loot bag jackpot + beam visual — done, shipped
  2026-09-06, one detail needs an in-game log check to fully confirm.**
  Full spec in FEATURES.md's
  "Legendary loot bag jackpot + beam-of-light visual" entry (under
  "Loot bags").
  - **Jackpot roll: done, live-verified.** `loot_bag_drops.js` now
    layers a second, independent 2% `randomChance` roll for
    `bountybags:legendary_loot_bag` across every wave mob (all 4 tiers),
    on top of the existing per-tier gating, unchanged. Verified live:
    killed 100 plain trash-floor zombies (a mob that could never roll
    Legendary before this) in a sandbox — 5 legendary bags dropped,
    consistent with the 2% rate, real proof the jackpot mechanic works.
  - **Loot Beams: Refork — installed, boots clean.** Packwiz pulled
    3.4.7 (newer than the 3.2.10 originally verified — same real mod,
    same Forge 1.20.1/uploaded-fresh status, just current). Real
    dependency chain: Nirvana Library, Common Network, Fzzy Config,
    Kotlin for Forge (all downloaded + sha1-verified). Full mod set
    boots with 0 KubeJS errors.
  - **Color override + equipment-filter question — both done, shipped
    2026-09-06** now that the peer relayed the real generated
    `config/lootbeams/light_config.toml`. `enable_custom_color` flipped
    to `true`; the color itself is a real per-channel `r`/`g`/`b`
    sub-table (decompiled `ColorHolder`'s own serializer — a hex string
    would have been wrong). The equipment-filter concern is resolved,
    not just deferred: decompiled the actual render-gating chain and
    confirmed a working color override makes an item render
    unconditionally (`ModifyContext(true)` → `hasBeenModified()` → an
    unconditional `true` branch in `checkRenderable`), regardless of
    `only_equipment`/`whitelist_by_name`. Shipped as `pack/config/
    lootbeams/light_config.toml` + the live instance's own copy edited
    to match. **Real residual limit, worth a look at the client log
    next launch**: the exact TOML syntax for a populated color map is a
    good-faith reconstruction from the decompiled schema, not a
    verified round-trip — the one real example seen was the empty map.
- **Fresh-world playtest batch, 2026-09-05 — sent to build.** Real
  feedback from the first actual playtest of the new fresh-world
  pedestal redesign, 4 items:
  1. **Mobs aren't pathing toward the pedestal at all — real root cause
     found, fixed, and committed (1520565) 2026-09-05, see FEATURES.md/MODS.md
     for the full writeup.** Diagnosed for real, not guessed: the permanent marker DID
     exist correctly on the live save (confirmed by parsing the actual
     save's entity/player NBT directly — right tags, right coordinates,
     one real wave zombie found sitting 3.6 blocks from the player and
     13.9 blocks from the pedestal, matching the report). Root cause,
     found via direct Java reflection against a live sandbox: **Epic
     Siege Mod entirely replaces vanilla's own player-targeting AI** — a
     fresh zombie's real target selector held vanilla `HurtByTargetGoal`
     plus **six** stacked `ESM_EntityAINearestAttackableTarget`
     instances, no vanilla `NearestAttackableTargetGoal<Player>` even
     left. That out-competed `mob_aggro.js`'s 10-tick-throttled
     `setTarget()` force almost every time — explains "not at all," not
     "sometimes," since ESM is built to be *more* aggressive than
     vanilla, not less. Fix: `mob_aggro.js` now physically strips every
     goal from each wave mob's target selector (goal selector — actual
     attack/dig/pillar/block-target behavior — untouched) exactly once
     per mob, so `setTarget()` is the only thing left that can ever
     assign one. Verified end to end in a sandbox before shipping:
     stripped a fresh zombie's target selector, force-set its target to
     a stand-in entity, confirmed the target was unchanged 4 real seconds
     later, and confirmed the mob had genuinely pathed 9 blocks toward it
     in that time. **Real, honest caveat**: this pack's sandbox can't
     get a live player through this modset's FML handshake (established
     blind spot), so the exact `PlayerEvents.tick` wiring itself couldn't
     be exercised end-to-end — the underlying mechanism is fully
     verified, but this still needs a real playtest to close the loop.
     Possible bonus, not claimed as fixed here: this may also explain why
     the separate pedestal mob-vulnerability config read as
     inconclusive — worth watching for on the same playtest.
  2. **Village spacing — real root cause confirmed, fixed, and
     committed (490e090) 2026-09-05.** Extracted the live save's own real
     seed (`-705653274963918758`) directly from its `level.dat` and ran
     `/locate structure #minecraft:village` from the actual fixed spawn
     point (780, -150) in a sandbox running this pack's real worldgen
     config — confirmed a real savanna village only **92 blocks** from
     spawn on this exact seed, using vanilla's untouched default village
     spacing (`spacing=34, separation=8` chunks, this pack had never
     overridden it). That's well within where wave mobs spawn (40-60
     blocks from the objective) and inside where the worldborder reaches
     by wave 6 (95 blocks) — a real, quantified collision, not
     speculation. Fix: added `pack/kubejs/data/minecraft/worldgen/
     structure_set/villages.json`, doubling spacing to 64/16 (same 5
     vanilla village variants/weights/salt, only the placement numbers
     changed). Re-tested with the identical seed and spawn point after
     the change: nearest village jumped to **813 blocks** away. Full mod
     set still boots clean with the override in place. **Real, honest
     limit**: this is a statistical spacing change for *future* worlds —
     it can't retroactively move the already-generated village on the
     current live save (structures don't relocate once generated), and a
     single seed test doesn't prove every future seed will land equally
     far, just that this exact reported scenario is now resolved and the
     odds are substantially better going forward.
  3. **Circular altar dais — built, verified, and committed
     2026-09-05.** Full rebuild in `playtest_starter_kit.js`, real
     shape-language change per the reference: square sandstone platform
     → 3 concentric octagon rings (radius 3/2/1, each one block higher
     moving inward — a small octagon at each radius, a square ring with
     its 4 true diagonal corners cut, the standard `/fill`/`/setblock`
     approximation for "round" since this pack can't build a true
     circle) leading to a flat raised platform, a plinth/column rising
     from its center, and the pedestal on top of that. Material is a
     randomized blackstone/polished blackstone/deepslate tiles/cracked
     deepslate tiles mix (same "mostly uniform, occasional weathered
     accent" ratio the perimeter walls already use), a moss-carpet ring
     one radius wider than the dais blends it into the courtyard floor,
     and two single stair blocks soften the main south-facing approach
     without stairing the whole circumference. **Every campfire
     removed outright**, not reduced — direct request, the old braziers
     were named specifically as part of what read badly. Grave arc
     relocated to the dais's west flank (its old front/back position is
     now inside the bigger radius-3 footprint) — checked against the
     real x0 wall coordinate before picking the new spot, real margin on
     both sides, not eyeballed. Pedestal height grew from wallY0+2 to
     wallY0+4 with the new plinth; `td_pedestalX/Y/Z` and the targeting
     marker's own Y both updated together, everything else that reads
     those values (mob_aggro.js, wave_spawner.js, pedestal_destruction.js,
     amulet_pedestal.js) treats them as an opaque stored coordinate, so
     nothing else needed touching. **Verified for real, not assumed
     from the math alone**: this pack's sandbox can't get a real player
     through the login flow (established FML-handshake blind spot), so
     replayed the exact same build logic via `ServerEvents.tick` against
     the live save's own real seed and real spawn coordinates instead —
     first pass returned all-air/failed everywhere (a real, separate
     gotcha: the target chunk had never been visited in that fresh test
     world, and `/setblock` at a cold, never-loaded chunk can silently
     no-op even though the production flow never hits this, since the
     player is already physically standing there when the real script
     runs); re-ran with an explicit `forceload` and real settling time
     first, and every block landed exactly as intended — pedestal,
     ring material, moss edge, and the approach stair all confirmed via
     direct block readback, zero errors, clean boot. **Real, honest
     limit**: like every other spawn-time build in this pack, this only
     applies to a **fresh world** — the current live save's actual
     placed dais is unchanged and needs a new world to see this.
  4. **"Just sand" — real root cause found and fixed 2026-09-05, the
     biggest single finding of this batch.** Not a perception issue, not
     thin variety, and not a badlands-style spawn-point problem — the
     ground was **literally sand almost everywhere in the entire world,
     regardless of biome**, a genuine leftover bug. Confirmed by
     correlating real biome tags against real surface blocks at 441
     sample points in a sandbox (this pack's actual worldgen config,
     the live save's real seed): every single savanna/plains sample
     resolved to `minecraft:sand`. Root cause, found by reading the
     dimension override directly: `data/minecraft/dimension/
     overworld.json`'s `generator.settings` still pointed at
     `kubejs:flat_desert` — a noise-settings file literally named for
     the old, already-abandoned "Single Biome: Desert" experiment
     (see the 2026-08-20 world-type history above), whose
     `surface_rule` unconditionally places sand/sandstone everywhere
     with no biome condition at all. The `biome_source` half of that
     same dimension file *was* correctly rebuilt into the real curated
     7-biome `multi_noise` set (2026-08-31's world-gen structure
     variety pass) — but biome assignment and surface material are
     two fully independent systems in a `minecraft:noise` generator,
     and only one of them got updated. Fix: spliced the real,
     authoritative vanilla `surface_rule` and `default_block`
     (extracted directly from this exact game version's own client
     jar) into a new `kubejs:overworld_flat` noise-settings file,
     keeping this pack's own deliberately-flat `noise`/`noise_router`
     section untouched — replaces `flat_desert.json` entirely (deleted,
     including its misleading name) and the dimension override's
     `settings` reference now points at the new file. **Verified for
     real, not assumed correct just because it's "the real vanilla
     data"**: re-ran the same 441-point biome/surface correlation after
     the fix — zero sand outside real structure footprints, savanna and
     plains both resolved to `grass_block`/`dirt`/`coarse_dirt` as
     expected, full mod set still boots clean on the live save's exact
     seed. **Real, honest limit — the one that matters most for the
     current live save**: worldgen changes only affect chunks generated
     from here on. The area around spawn the player has already explored
     was generated under the old broken settings and will still show
     sand until enough of the world border expands past what's already
     generated, or a fresh world is started — this is not retroactive,
     same limit as every other worldgen change this pack has shipped.
- **Aesthetic structure variety pass — done, shipped 2026-09-04
  (real commit-timestamp check — not the 2026-09-06 dispatch dating
  below).** Originally sent 2026-09-05 with real user go-ahead, fell
  through a peer-session gap, re-sent 2026-09-06 and this time actually
  built. Installed **Philip's Ruins** and **Big Lost City — Apocalyptic
  Structures!**, both dependency-free. Real scope surprise: 55 total new
  structure_sets between the two mods (not anticipated by the original
  spec) — handled with an individually-reasoned pass, not a blanket
  retune: 14 Philip's Ruins sets retuned to 16/8-chunk spacing, 6 left
  untouched for zero real biome overlap; Big Lost City's heavily
  duplicated car_N/deco_N/tent_N variant clusters (27 structures)
  consolidated into 3 weighted pools rather than shipped as 27 separate
  active sets, given this pack's own documented jigsaw crash history.
  **Real bug caught by the sandbox boot-test**: the first pass made
  redundant variants "inert" via `spacing = 999999` — crashed registry
  load (`outside of range [0:4096]`, vanilla's real codec cap). Fixed to
  `4096`, re-verified clean. Full-restart sandbox boot confirmed clean
  (`Done (29.325s)!`, zero errors tied to either mod), `/locate
  structure` confirmed real generation for a pool, a retuned individual
  set, and a Ruins set. Both mods use standard vanilla-format loot
  tables, not an opaque system — LootJS-controllable. Full detail in
  FEATURES.md, "Aesthetic structure variety pass" (under "World type").
  **Real limit**: fresh-world only, doesn't retroactively affect the
  current live save's already-generated chunks. Unconfirmed in-game (no
  real playtest yet, sandbox-verified only).
- **Abandoned Urban missing chest loot — investigated 2026-09-04, no
  fix needed, the old diagnosis was stale.** Re-decompiled all 34
  `.nbt` files directly against the exact currently-installed jar
  (`abandoned_urban-1.1.0-forge-1.20.1.jar`, file-id 5297465 — checked
  the live `pack/mods/abandoned-urban.pw.toml` to confirm it's the same
  build, not a version drift). Real, current result contradicts the
  2026-08-31 diagnosis this was queued from: **15 of the mod's real
  building pieces already carry a genuine `LootTable` NBT tag on a real
  chest**, referencing valid vanilla tables (`minecraft:chests/
  woodland_mansion`, `minecraft:chests/village/village_weaponsmith`,
  `minecraft:chests/stronghold_corridor`, `minecraft:chests/
  abandoned_mineshaft`, etc. — extracted and read directly, not
  inferred from filenames). Cross-checked against the mod's own
  `template_pool` JSON to confirm every one of those 15 pieces is
  actually placed by real worldgen, not dead weight. The only
  chestless files are genuinely decorative filler that wouldn't
  sensibly hold loot (roads, rubble, wrecked vehicles, a couple minor
  set-pieces) plus one dead, unreferenced file
  (`gas_station.nbt` — the mod's own `gas_station` structure pool
  actually points at the already-looted `gas_station_loot.nbt`
  instead, confirmed by reading the pool JSON, so the chestless
  variant is simply never placed). **No processors, no jigsaw surgery
  built** — this pack has a documented crash history from exactly that
  kind of change, and there's no real problem left to justify the risk.
  Either the mod updated with more complete loot since the original
  diagnosis, or that diagnosis checked for something narrower (e.g.
  chest-block presence without decompressing far enough to see the
  `LootTable` tag) — either way, the current jar doesn't need this fix.
  **Structure spawners were held back pending this and the aesthetic
  pass being confirmed stable** — the aesthetic pass shipped clean
  (see above) and this item is now resolved, so that sequencing gate is
  clear; spawners can be considered next if wanted.
- **Savanna spawn + vegetation-clearing regression — done, real bug
  found and fixed 2026-09-06.** Diagnosed live on the actual reported
  world first, not guessed: the savanna_plateau landing was correct
  (desert/badlands genuinely 3600+ blocks away on that seed, fallback
  worked as designed). Real bug: the vegetation-clearing pass's Y-range
  only started at `floorY+1` - on genuinely uneven plateau terrain,
  real trees can be rooted well below `floorY` (confirmed: trunks as
  low as Y5-8 against a `floorY` of 11), entirely missing the old
  range. Extended to `floorY-16` through `floorY+16` (chunked to stay
  under vanilla's `/fill` block limit). Verified live on the exact
  reported coordinates: both previously-uncleared trees now clear
  correctly, real ground stayed untouched.
- **Eliminate passive mobs entirely — done, shipped 2026-09-06.** New
  `no_passive_mobs.js`. Went with an explicit 30-id passive-animal list
  rather than a `MobCategory` filter (this build's `EntityType`
  registrations are fully SRG-obfuscated with no clean id→category
  mapping to decompile, so sidestepped the question instead of forcing
  it - villagers/golems/wandering traders are simply never in the
  list). **Real finding from live verification**: the theoretically
  better hook (`EntityEvents.checkSpawn`, pre-spawn cancel) doesn't
  actually fire for vanilla's natural chunk-population spawn pathway in
  this build - confirmed with a diagnostic logger against real fresh
  chunk generation, zero log lines despite real cows/sheep spawning
  every time. Switched to `EntityEvents.spawned` + `entity.discard()`,
  confirmed both firing and actually removing entities. Final check
  across 8 mob types in a freshly generated area: zero present.

## Built, awaiting your next playtest

- **Bounties quest chapter — built, sandbox-verified 2026-09-05 (commit
  273dde5).** New chapter, 5 tiers on a persistent kill count: First Blood
  (25), Exterminator (100), Culling (300), Reaper (750), Zombie Masher
  (1500, repeatable every +1500 after - the endless-phase grind target).
  Turret and trap kills count, not just direct combat, per direct
  request. Decompiled every trap currently in the pack (Trapcraft Spikes/
  Bear Trap, Create Addition's Barbed Wire) and found none of them attach
  a killer entity to their damage source at all, so classifies by the
  damage TYPE's real registry id instead (confirmed live that
  `source.typeHolder().unwrapKey().get().location()` works from Rhino
  even though getEntity()/getMsgId() don't) - a small blocklist excludes
  genuinely no-cause deaths (fire, drowning, falling, etc.), everything
  else counts by default, so any future trap/turret is included with
  zero code changes. MobCategory-based hostile detection isn't reachable
  from Rhino either (same gap, confirmed live) - hostile-mob-id list
  stays hand-maintained, same as every other copy of it in this
  codebase. Sandbox-verified: 20/20 scripts load clean, FTB Quests loads
  the new chapter with no parse errors (3 chapters, 36 quests). Full
  quest-completion flow needs a real client to confirm.
- **Wave-8+ speed-clear bonus airdrop — built, sandbox-verified
  2026-09-05 (commit 766be2e).** Installed Paojiao134's Airdrop (real
  Forge 1.20.1 command support, confirmed via decompile - the other
  candidate, Simply Airdrops, has no commands at all). Clear a wave
  within 180s of its mobs finishing spawning (estimate, not measured -
  adjust once real wave-8+ clear times are known) and a crate drops with
  a curated haul (legendary loot bag, netherite scrap, diamond blocks).
  **Real behavior found via decompile + live test**: the mod's own
  border-integration logic picks a random spot inside the CURRENT world
  border once one exists, ignoring the command's position entirely - a
  positioned summon silently did nothing until a real border was in
  place, then worked. Since this pack always has a real border within
  moments of a fresh join, the crate lands somewhere inside the player's
  own currently-expanded territory, not pinned to the pedestal - decided
  not to fight this with a worldborder trick (touching the real border
  programmatically felt too risky to do solo overnight, and the
  behavior is a reasonable fit for this pack's own border-centered
  design anyway). Sandbox-verified end to end: mod loads clean, pool
  imports at boot, `airdrop summon` spawns a real lootable crate.
  **Both new mods (Inventory Profiles Next + the airdrop mod) need a
  full client restart to show up - not just a world/server reload.**
  **User decision, 2026-09-06: keep random-in-border as-is, no change.**
  Random landing stays intentional (encourages exploring the base's
  surroundings), not revisited further.
- **Second fresh-world playtest batch + loot-table dead-weight audit**
  — built, verified, and deployed 2026-09-06 (commits 46a884b, e0b4939,
  7e468b7). Full detail in FEATURES.md's "Second fresh-world playtest
  batch" and "Loot-table dead-weight audit" entries (under "Pedestal
  visual upgrade + mob-attack vulnerability" and "Loot bags"). Five
  pieces, all shipped:
  1. Dais ditched entirely — pedestal now sits directly at ground level
     in the yard, no platform.
  2. Real pedestal HP (`td_pedestalHealth`, 200 first-pass) with a
     throttled tick check for wave mobs in melee range, damage-per-hit
     read from each attacker's own real attack stat, same destroy path
     as the existing explosion-based system at 0 HP — a deterministic
     replacement for relying on Epic Siege Mod's inconclusive
     block-targeting.
  3. Spawn relocated the full 520 blocks to `(1171,-499)`, a real
     savanna tile (re-verified on the live save's actual seed right
     before shipping — a real patch, not a boundary sliver; terrain
     flat within ~2.5 blocks across the planned base footprint) — user's
     own pick via AskUserQuestion over 3 smaller-disruption alternatives.
  4. Press/Depot spacing fixed exactly per the user's own direct
     instruction (Press 2 blocks above the Depot) — live-verified
     (a real iron ingot → iron sheet conversion happened) before
     committing, and this closed the separate long-open "Press never
     auto-fires" bug too, same root cause.
  5. Loot dead-weight strip (`loot_dead_weight_strip.js`) — rails,
     name tags, horse gear, vanilla maps, leads, music discs, elytra/
     End-city loot all removed from every chest, custom or vanilla.
     Real `removeLoot(ItemFilter)` syntax confirmed by decompiling the
     installed LootJS jar rather than assumed; live-verified against a
     real vanilla `abandoned_mineshaft` roll (10x, zero stripped ids
     came through, this pack's own bonus pools unaffected).
  **Fresh-world pieces (1-3) are unconfirmed in-game** — same standing
  blind spot as every other spawn-time build in this pack, no real
  player can join the build session's sandbox. Piece 4 is confirmed
  live. Piece 5 applies immediately to the current save too, not just
  fresh worlds.
- **Full zombie-apocalypse roster pivot** — built, verified, and
  deployed 2026-09-06. Full detail in FEATURES.md's "Full
  zombie-apocalypse roster pivot" entry (under "Mob roster &
  defense-breaching threats"), including a "Built, verified, and
  deployed" postscript with the full verification writeup. Short
  version: every skeleton/spider/wither_skeleton/ravager/creeper
  reference stripped from `wave_spawner.js`, `loot_bag_drops.js`,
  `undeadnights_horde_mobs_config.json`, plus 2 files the original audit
  missed but this pack's own duplication pattern required
  (`mob_aggro.js`'s and `wave_status.js`'s own copies of the roster) and
  Epic Siege Mod's `targetingMobs`. Replaced with vanilla zombie-family,
  TFTH's much bigger unused roster, Undead Nights' own 3 zombie
  variants, and a newly-installed mod (**Mutants and Zombies** + its
  **Advanced Wall Climber API** dependency). **Real correction found
  during verification, not shipped on the pattern-inferred guess**: the
  original proposal's "Flesh Unseen" turned out to have no registered
  `EntityType` at all in this exact TFTH build (config and sounds exist,
  nothing summonable) - dropped everywhere it was proposed, Mutants and
  Zombies' Mutant Brute took its wave-8 slot instead. **Real filename
  scare on the Advanced Wall Climber API dependency, resolved before
  shipping**: packwiz resolved a jar named
  `awcapi-neoforge-1.20.1-1.0.2.jar` on a Forge pack - checked its real
  `mods.toml` directly rather than trusting the name, confirmed a
  genuine Forge dependency declaration, and its Crawler entity
  (the mob that actually needs it) was successfully real-summoned in
  the verification pass. **All 23 new/changed mob ids across all 3 mod
  sources were individually real-summoned and confirmed in a sandbox**,
  not spot-checked - full mod set boots clean, 0 KubeJS errors. Not yet
  confirmed by an actual playtest.
- **Mob-attack vulnerability (pedestal)** — config built, deployed, and
  committed (f49f947) 2026-09-05, and **real live behavior is
  unconfirmed, not a clean win — flag this honestly, don't report it as
  done.** Full detail in FEATURES.md's "Pedestal visual upgrade +
  mob-attack vulnerability" entry. What shipped: both real pedestal
  block ids added to Epic Siege Mod's `blockTargets`, and
  `targetingMobs` widened from just zombie to this pack's full wave
  roster (a deliberate call — a base-under-siege premise should let the
  whole roster threaten it). Decompiled the mod's own AI goal to
  resolve the spec's open question: `blockTargeting`'s destroy behavior
  is gated by the real vanilla `mobGriefing` gamerule (confirmed `true`
  here), not ESM's own `griefing` toggle — two separate systems. Also
  found a real, non-obvious requirement: the target needs 2 full air
  blocks directly above it. **But the live test was inconclusive**: a
  zombie left adjacent to a pedestal for 60+ seconds in a sealed test
  pen never destroyed it — and neither did one left next to a plain
  vanilla candle, the mod's own untouched default target, which rules
  out this specific config as the cause and points at the whole
  destroy-mechanism possibly not firing in this environment at all.
  Shipped as correct per the real decompiled logic (harmless either
  way) but **not confirmed working — needs a real player checking
  whether mobs actually chip away at anything in `blockTargets` during
  normal play.** `diggerMobs` (whether wave mobs already partially bite
  through obstacles via a separate mechanism) is still fully open too,
  not reached.
  - **Superseded, 2026-09-05**: this whole mechanism is confirmed dead
    weight now. `pedestal_health.js`'s own header comment already
    documents that the real playtest showed this `blockTargets` path
    still wasn't damaging the pedestal even after the mob-pathing fix —
    real pedestal HP damage is that file's own separate proximity-poll
    system, unrelated to ESM entirely. Removed both pedestal block ids
    from `blockTargets` (back to the mod's stock `["#minecraft:candles"]`
    default) and corrected the misleading "must keep running for the
    pedestal-vulnerability feature" comment in `mob_aggro.js` that had
    justified leaving `ESM_EntityTargetBlock` unstripped. Same pass also
    closed the real `diggerMobs` gap flagged above, extending it (and
    `buildingMobs`/`jumpingMobs`, same gap) from just `minecraft:zombie`
    to the full 15-mob current wave roster, matching `targetingMobs`.
    Verified via a clean sandbox boot; deployed to the live instance;
    committed.
- **Pedestal: unconditional targeting + visual retrofit + compound
  redesign** — built, deployed, and committed (a9e6c1a) 2026-09-05.
  Full detail in FEATURES.md's "Superseded 2026-09-05" entry. All three
  pieces landed together (they shared the same coordinate rewiring),
  and this commit's final state also absorbed the earlier rig-placement
  hotfix — that fix's indoor location got fully superseded by this
  rework moving the rig outdoors again, so it never got a separate
  commit of its own, it's just part of this one now:
  - **Unconditional objective**: mobs always target the pedestal, no
    amulet check, no player fallback. The amulet is now purely personal
    buffs + border-crossing unlock.
  - **Supplementaries retrofit**: `amulet_pedestal.js` is now a
    tick-poll against the real Container, not a right-click hook.
  - **Recentered dais + outdoor workshop**: pedestal moved to a raised
    3×3 platform dead center of the courtyard (courtyard depth grew
    4→8 to fit it), grave markers arranged in an arc, 4 campfire
    braziers, Create rig relocated outdoors along the east wall.
  - **Real risk caught before shipping**: deleting the old pedestal
    block's registration would have destroyed the live save's actual
    placed pedestal (wave 4+ deep) on next load — Forge drops
    unregistered custom blocks to air. Fixed by keeping the old block
    registered as a real fallback, making both destruction-detection
    and the amulet-poll accept either block id, and restoring a scoped
    legacy right-click handler for the old block only.
  - **Self-healing marker**: `mob_aggro.js` now re-summons the
    permanent target marker (and forceload) on any login where the
    pedestal exists but the marker doesn't — fixes the live save
    automatically, no manual commands needed this time.
  - **Verified in 4 sandbox passes**, the last two against a real copy
    of the actual live save.
  - **Real scope limit, flagged rather than decided unilaterally**: the
    courtyard visual redesign only applies to **new** worlds — the
    build session didn't retrofit the existing live save's actual
    layout. **Resolved**: user's call was to start a fresh world for
    the full redesign rather than keep the old save or retrofit it.
  - The mob-attack-vulnerability piece (Epic Siege Mod's `blockTargets`
    config) shipped separately — see its own entry above, not part of
    this commit.

- **Quest book rebuild** — built, deployed, and committed (76f35f7)
  2026-09-05. Full detail in FEATURES.md's "Quest book
  rebuild" entry. Single consolidated chapter (`campaign.snbt`,
  replacing `basics.snbt`/`tier1_machines.snbt`/`tier2_machines.snbt`),
  19 quests total: all 17 existing quests carried over with their real,
  unchanged IDs (including ones with live completed progress, like
  "Sharpened Scrap"), plus the spine's 2 new story-beat quests. Real
  decisions the build session made where the spec left it open:
  dependencies unchanged exactly (the tree shape comes from x/y layout
  only — spine at y=0, Tier 1/amulet/Waystones branch at x=13, Tier
  2/pedestal branch at x=19, reconverging visually at "Watch the Walls
  Grow" and "The Reckoning" — no new dependency edges, no intermediate
  hub quest needed); reused the old Basics chapter's real id
  (`1178FD42CF9984A2`) for the merged chapter rather than minting a new
  one, since it's the one thing the live save's progress file actually
  references (a first-viewed timestamp) — confirmed the other two old
  chapter ids have zero references, safe to discard; "Turn the Crank"
  got a real rewrite (its shipped text was practical but didn't end on
  an open question, so it didn't match the new house style — replaced
  while keeping the real furnace/recipe detail); "A Stone That
  Remembers" (Waystones) wasn't in the finalized text list, so it kept
  its existing flavor text, just given a spot in the new layout.
  **Verified in three passes**: a fresh sandbox boot (clean, 19 quests,
  no errors), the same after deleting the 3 old files exactly as it
  would happen live, and a boot against a real copy of the actual live
  save (with its real progress data) confirming nothing about the merge
  broke existing completions. Live `ftbquests` config backed up before
  deploying. `packwiz refresh` run, all hashes clean.
- **Andesite gated behind exploration + "Turn the Crank" quest** —
  built, deployed, and committed (30588f6) 2026-09-05. Full
  detail in FEATURES.md, "Andesite gated behind exploration, not loot
  bags" (under "Loot bags"). Real recipe correction found along the
  way: Hand Crank is actually 3 planks + 1 Andesite Alloy, no Shaft
  involved (this doc's earlier text was wrong). Andesite added to all 3
  `postapocalypse_structures` base chest tables, verified live via 45
  real sandbox rolls (3 real andesite hits), deliberately not in any
  BountyBags tier. New quest "Turn the Crank" shipped in the Tier 1
  chapter, flavor text already referencing the corrected Rolling Mill
  location. This is the same quest the in-progress quest book rebuild
  should carry forward, not duplicate.
- **Barbed Wire replaces Spikes** — built, deployed, and committed
  (8e1ed02, plus a9e6c1a for the rig's final outdoor position — see the
  Pedestal entry above). Full detail in FEATURES.md's
  "Tier 1 defenses" section. What shipped:
  - **Create: Crafts & Additions installed** (author MRHminer, real
    slug `createaddition`), jar hash-verified into the live instance.
  - `trapcraft:spikes` replaced everywhere: the "Sharpened Scrap" quest
    task + both quest/chapter icons, and the decorative gate-line
    placement (`createaddition:barbed_wire[vertical=false,facing=south]`,
    confirmed real blockstate properties from the mod's own JSON).
  - **Real crafting chain, decompiled and live-verified end to end**:
    iron_ingot → Mechanical Press (over a Depot, not on top — the
    mod's own ponder text says items go beneath) → iron_sheet → Rolling
    Mill (items dropped on top) → iron_wire ×2 → crafting table
    (diamond of 4 iron wires) → barbed_wire ×2.
  - **Pre-placed rig, corrected 2026-09-05 after a real placement bug**:
    the original spot-check (local x=4-6,z=9) only verified "air, floor
    below, ceiling above" — never *what kind* of space that was. It
    turned out to be the open, unwalled entrance yard right outside the
    building's real door, not a back room, which is exactly why the
    live playtest found the rig blocking the doorway. Root-caused by
    parsing `abandoned_brick_house.nbt` block-by-block directly (not
    another spot-check), and re-verified by reproducing the bug fresh
    against real terrain with the actual deployed script's exact math —
    the already-played live save (4 real waves of playtime by then)
    wasn't trusted for reproduction, since the player could have mined/
    moved the block themselves before reporting it. **Corrected spot:
    local x=7, z=5-7**, a real enclosed room confirmed from the NBT
    itself (solid andesite foundation, 3 clear blocks of headroom, a
    real brick_slab ceiling, walls/doors/furniture boxing it in on
    every other side) — right beside the structure's own pre-placed
    furnace. Press and Mill face the same direction and conduct power
    directly to each other, no shaft needed — confirmed live with a
    temporary creative motor (real nonzero Speed on both in a single
    3-block kinetic network) at the new spot. The cell past the Mill is
    left open for the player's own Hand Crank — that one genuinely
    can't be pre-placed already-turning, it needs a real player
    right-clicking it. Real Create gotcha documented along the way,
    worth remembering for future kinetic-block placement scripts:
    overwriting a kinetic block's facing via repeated `/setblock`
    doesn't reliably rebuild Create's kinetic network — didn't affect
    this fix (each cell places into real air exactly once), but matters
    for any future hand-tuning of a live rig.
  - **Fixed script deployed to the repo and the live instance's kubejs
    folder, syntax-checked, but not committed yet** — same "hold for
    review" pattern as the original work, given how much this
    diagnosis undercut the original verification. **This only fixes
    fresh worlds** — the current live save already has the 3 wrongly-
    placed blocks built in from the old script (that part only runs
    once per world at first login), and fixing an already-placed block
    in a real save needs either a live command run by the player
    themselves or booting a server directly against that save file —
    the build session's own permission settings blocked the latter, so
    real coordinates for a manual fix were handed back instead (see
    QUEUE.md's own note to the user / chat for the exact commands).
  - **Real save-compatibility risk caught before deploying**: the live
    instance's quest save already had "Sharpened Scrap" completed under
    its own task/chapter IDs, which had diverged from the repo's copy
    of that snbt at some earlier point. Blindly overwriting live with
    repo would have orphaned that real completed progress. Fixed by
    editing the live file's item/icon/description in place (keeping its
    real IDs), then syncing the repo copy back from that live file so
    both now match exactly and the completed quest stays completed.
  - **One real, honestly-unresolved item**: the Mechanical Press never
    auto-fired in the scripted sandbox test — kinetic power and Depot
    item-holding both confirmed correct, but Running/Ticks never
    advanced even after 20+ seconds. Not chased further since it wasn't
    the actual ask (the Rolling Mill, the one being pre-placed, is
    fully verified working) — but this needs a real player to confirm
    the Press actually processes when used themselves; if it doesn't,
    that's a separate bug to open.
  `packwiz refresh` run, hashes clean. **Held for review, not committed
  yet** — waiting on you/the user before the peer commits.

- **Toast Control + Pedestal destruction = game over** — built,
  verified, and deployed 2026-09-04 (commits 3432c6b, ce75d1f).
  - **Toast Control shipped** — real dependency the spec missed:
    **Placebo** (Shadows_of_Fire's own library mod), not already in
    this pack — caught by packwiz's own CurseForge dependency
    resolution rather than missed silently, installed alongside.
    Defaults confirmed by decompiling `ToastConfig.class` directly
    rather than trusting the mod's own description: Recipe and
    Tutorial toasts both default `blocked=true` already, zero config
    needed.
  - **Pedestal destruction = game over shipped exactly per spec** —
    tick-poll against a stored coordinate (not event hooks), permanent
    Wave Horn block, countdown cancel, night-lock undo, dramatic title
    matching the pack's existing tone. The open blast-resistance
    question got a real, tested answer, not a guess: grepped the whole
    pack — `mobGriefing` is never touched anywhere, so it's still
    vanilla default (`true`); the pedestal's own block definition sets
    resistance 6.0 (the same as plain stone, not hardened). Then
    actually blew one up in the sandbox — real TNT destroyed a placed
    pedestal outright, confirmed via a live block-id readback. **No
    config change needed — it's genuinely vulnerable as-is.**
  Both **not yet confirmed by an actual playtest**.

- **Loot bag iron/cobblestone bump + amulet/pedestal objective fix** —
  built, verified, and deployed 2026-09-04 (commits b244ef0, 5293a3f).
  - **Iron/cobblestone bump shipped exactly as specced** — real bonus
    lesson: BountyBags generates a `config/bountybags/*.toml` from the
    source JSON once and never re-reads it, so the live instance's
    already-generated `uncommon_bag.toml` needed a direct edit too, same
    gotcha the legendary-tier totem fix hit earlier.
  - **Amulet/pedestal objective fix shipped exactly as proposed** — spawn
    position and both mob-count checks now key off the pedestal
    marker's stored position when `td_amuletOnPedestal` is true. The
    open question got a real answer, not a guess: this pack had never
    forceloaded anything before, and that was confirmed as a genuine
    second bug — `simulationDistance` is 12 chunks (192 blocks) centered
    on the player (from `options.txt`), so mobs spawned correctly at the
    pedestal would've just frozen the moment the player wandered off.
    Fixed with real `forceload add`/`remove` in `amulet_pedestal.js`
    exactly where `td_amuletOnPedestal` toggles, sized to a 96-block
    radius (169 chunks, checked directly against vanilla's 256-chunk
    forceload cap rather than assumed safe). `PersistenceRequired:1b`
    added to every wave-mob summon regardless, since a despawn-eligible
    mob far from any player would've quietly undone the whole fix.
    **Verified against the exact reported scenario**: a sandbox test
    with the objective 500 blocks from a stand-in "far away player" —
    8/8 mobs landed near the objective, zero near the fake player, and
    all 8 were still alive and in place after a real 10-second wait
    simulating the player staying away.
  Both **not yet confirmed by an actual playtest**.

- **Mob-tier loot progression + watchtower removal** — built, verified,
  and deployed 2026-09-03 (commits 2faf4ef, f289af7). See FEATURES.md's
  "Mob-tier loot progression" and "Watchtower — removal requested"
  entries for full detail.
  - **Loot bags reclassified exactly as specced**
    (`loot_bag_drops.js`): Uncommon = trash floor (wither_skeleton
    corrected into this tier), Rare = early roster-variety adds,
    Epic = wave 6-7 elites, Legendary = the 3 finale mobs. Same drop
    rates, only the mob→tier assignment changed.
  - **Structure chest progression shipped with a different real
    mechanism than the spec assumed** (`structure_loot_progression.js`)
    — table-ID targeting, as originally proposed, wouldn't actually
    have worked: decompiling confirmed Lost City ships **zero** chest
    loot tables of its own across all 205 of its structure NBTs
    (nothing to target), and Abandoned Urban's chests overwhelmingly
    reuse plain vanilla tables (village/dungeon/stronghold/shipwreck)
    shared with real vanilla structures elsewhere in the world —
    targeting those IDs would have buffed ordinary vanilla loot too,
    not just this pack's structures. Switched to targeting LootJS's
    `LootContextType.CHEST` instead, which sidesteps both problems and
    still covers postapocalypse_structures. Same proposed distance
    bands (60/120) and same additive bonus-pool technique as before.
    Verified via two independent `/loot spawn` rolls confirming
    distance-gated bonus items (diamond/emerald; separately gold_block/
    ender_pearl) landing on top of base loot.
  - **Real sandbox-testing gotcha found and worked around, worth
    remembering for future loot testing**: `/loot spawn` at a position
    whose chunk was force-loaded the same tick silently produces
    nothing at all (even the base vanilla table) — chunk generation
    isn't synchronous within `forceload`'s own tick. Looked exactly
    like a broken mechanism until isolated by re-testing after a real
    60-tick settle.
  - **Watchtower removed** — clean deletion exactly as pre-verified,
    nothing else in the pack touched it.
  All three **not yet confirmed by an actual playtest**.

- **Wave mechanism: mobs not reaching the player — real root cause
  found and fixed, 2026-09-02.** Investigated directly against the live
  instance's `logs/latest.log` and player stats file first (zero mob
  kills across waves 1-4 despite correct wave announcements and a
  reuse-gate that looked consistent), which narrowed it to "the live
  nearby-mob count reads zero all session" but couldn't distinguish
  *why* without a real spawn-and-check test. That test found it:
  **`Math.PI` (and `Math.E`) are undefined in this exact KubeJS/Rhino
  build** — confirmed on a genuinely clean sandbox boot, at plain
  top-level script scope, no event callback involved. `Math`'s methods
  (`cos`/`sin`/`random`) all work fine; the constants specifically
  don't. `wave_spawner.js`'s `randomPlayerRelativePosition()` computed
  every mob's spawn angle from `Math.random() * 2 * Math.PI` — always
  `NaN`, so every spawn position was `NaN,NaN`, so every `/summon` has
  been silently failing since that function was written (`
  runCommandSilent` suppresses command feedback, which is exactly why
  this never showed up in any log). The staggered `pendingSpawns` queue
  kept draining on its own schedule regardless of whether each entry's
  summon actually succeeded, which is why the Wave Horn's reuse gate
  looked like it was working correctly for a few seconds after every
  use in every earlier investigation this pack has done — that was
  real queue state, not real mobs. This was the real, dominant cause
  underneath the entire "wave mobs sometimes/often don't spawn" history
  — every other bug found chasing this symptom (the `hasTag()`
  regression, Undead Nights' own autonomous horde system, chunk-gen-
  storm timing at fresh-world login) was independently real and worth
  its own fix, but this is the one that was always still there
  underneath all of them.

  Also found and fixed the identical bug in `amulet_pedestal.js`'s bob
  effect (`Math.sin((2 * Math.PI * currentTick) / BOB_PERIOD_TICKS)`) —
  the marker's up/down float has been computing `NaN` this whole time,
  most likely a silent no-op rather than a visible error, which is why
  it read as "doesn't move" rather than "broken." Grepped the whole
  `pack/kubejs` tree for every other `Math.PI`/`Math.E` reference after
  fixing both — none remain. Fixed by hardcoding the literal PI value
  in both files instead of reading the (broken) built-in property.

  Verified for real, not just by inspection: replicated the exact fixed
  computation in a live sandbox test — 16/16 sample spawn positions
  produced real (non-`NaN`) coordinates, and all 16 resulting mobs
  persisted and landed within the 80-block radius the wave-clear gate
  and hostile counter both check, with only modest real-terrain height
  variance (-4 to +6.5 blocks). That result rules out the original
  leading hypothesis (height-correction landing a mob far enough away
  vertically to fall outside the 80-block 3D check near a tall or
  underground structure) as the explanation for *this* report — the
  terrain near the fixed spawn point isn't that hilly — though it
  remains a real, separate, still-open risk worth a defensive sanity
  clamp on the height delta if it ever gets reported for real terrain
  elsewhere; not added speculatively since the confirmed bug alone
  fully explains this report. Committed b7c66a4, deployed live. Needs a
  real wave playtest to confirm.

- **Structure & loot mod replacement** — built, verified, and deployed
  2026-09-02 (commit fdfa521). Treasure2 + GottschCore removed (mods,
  structure_set overrides, dead index entries), BountyBags + Lootr
  installed, custom loot bag system fully migrated (4-tier mob mapping
  by wave, drop rates 0.5/0.25/0.1/0.04). See FEATURES.md's "Structure
  & loot mod replacement" entry for full detail. Sandbox-verified
  clean; **not yet confirmed by an actual player session**. Two things
  worth knowing before/while playtesting:
  - **Lootr's staleness claim was wrong, corrected before install** —
    it's actually a live, maintained Forge 1.20.1 mod (builds through
    2025-11-26), not the 2023-abandoned one originally flagged.
  - **Lootr per-player chest behavior confirmed real, 2026-09-05** —
    Forge's dedicated-server scanner flags it client-only despite real
    server-side code in the jar; decompiled `ChestData.class` directly
    to check rather than assume. Confirmed genuinely per-player:
    `ChestData` (one real chest) holds `Map<UUID, SpecialChestInventory>`,
    and `createInventory(ServerPlayer, ...)` generates an independent
    loot roll (`filler.unpackLootTable(...)`) the first time each
    distinct player UUID opens it, cached in that map thereafter via
    `getInventory(ServerPlayer)`/`getInventory(UUID)`. This is real
    server-authoritative `SavedData`, not a client-only visual trick —
    the scanner's flag was a false concern. No code change needed; no
    further live test warranted beyond this source-level confirmation.
  - A real BountyBags bug (totem_of_undying over its internal max
    count, would've silently fallen back to an emergency loot pool) was
    caught and fixed before shipping, not after.
  Piece 3 of the exploration-pacing retune (loot-tier-by-progression)
  is now unblocked — buildable as a general LootJS distance/wave-based
  system across the 3 remaining structure mods. Not started, ready to
  sequence whenever you want it sent.
- **Undead Nights native horde system disabled** — built and deployed
  2026-09-02 (commit f928902), direct response to "wave system simply
  broken now." Real bug, unrelated to the same day's other retunes: the
  mod's own autonomous "Nights of the Undead" system was never actually
  turned off, so a second, uncontrolled horde (invisible to the wave
  counter) had been spawning every night on top of every deterministic
  wave this whole time. See FEATURES.md's "Endless phase scaling"
  section for the full root-cause writeup. Verified safe via decompiling
  the mod's own config/horde-spawner classes before disabling — the
  endless-phase `spawn_horde` command path is unaffected. Not yet
  confirmed by an actual playtest.
- **Exploration pacing retune (worldborder + structure spacing)** —
  built, verified, and deployed 2026-09-02 (commit 6d8c50e). Direct
  playtest feedback: structure generation too dense, worldborder
  expanding too fast. See FEATURES.md's "Base expansion" (worldborder
  curve, retune 2) and "Structure mod picks" ("Exploration pacing
  retune" entry, structure spacing) for full detail. Worldborder now
  `5 + 5*floor((waveNumber-1)/3)`, ending at border 125 by wave 8 (was
  166, was 270 originally) with a genuinely flat wave 1-3 (+15 total).
  Structure spacing loosened back on Treasure2's wishing-well set and
  the non-Lost-City reachability mods, verified via a fresh sandbox
  world with zero crashes/collisions. **Loot-tier-by-progression (the
  3rd piece of this retune) is on hold, not built** — Treasure2's
  rarity system turned out to need genuinely new LootJS logic, not a
  data retune, and building it now risks being thrown away given the
  fresh Treasure2-replacement question below. **Needs a fresh playtest
  to confirm feel** — not yet seen by an actual player.
- **Starting base redesign (Abandoned Brick House via `/place
  template`)** — built, verified, and deployed 2026-09-01, direct
  response to "the starter base and tower design is terrible." See
  FEATURES.md's "Starting base" section, "Redesign" entry for full
  detail. First shipped as Red Mansion (26×19×28), swapped same day
  after follow-up feedback it was too big — all 4 of the structure
  mod's buildings were decompiled and compared, Abandoned Brick House
  (12×13×11) was the clear smallest and is what's live now. Compound
  retuned to match: margins roughly halved, watchtower back to
  `wallY0+16`, worldborder reverted 90→50 (restores the originally-
  tuned wave-8 ending border of 166, not the mansion-driven ~206 — a
  bonus of the revert, not a separate balance change). Same
  `/place template` wet_sponge cleanup technique proven on the mansion
  reused here (78 blocks this time); one more real bug (a grave marker
  landing on the smaller building's own front wall) caught and fixed
  before the sandbox test. Verified via a full end-to-end sandbox
  replay of the real login sequence both times — no exceptions.
  **Needs a brand-new world to see** — same as every other spawn-time
  change this pack has made, doesn't apply retroactively to an existing
  save.
- **Decoration lang fix (Phase 5, partial)** — built and shipped
  2026-09-01. Root cause confirmed, not guessed: Doomsday Decoration's
  own shipped `en_us.json` (its only language file) genuinely contains
  Chinese text despite the filename — Zcraft Decoration's own lang file
  was checked too and is fully correct English already, ruling it out.
  Overrode `pack/kubejs/assets/doomsday_decoration/lang/en_us.json` —
  had to include the mod's full 1152-key file, not just the 8 keys
  actually placed in this pack's base build, since a resource pack
  replaces a language file wholesale rather than merging per-key (a
  partial override would've blanked every other label to its raw
  key). The 8 real English translations
  (barrel/woodencrate/carton/carton_2/fixedgenerator/shelf/table/
  weaponbox): confirmed by direct 1:1 translation of the mod's own
  Chinese source text, not guessed. Placement/density reassessment
  (the other half of Phase 5) still waits on the user actually seeing
  the redesigned base in-game.
- **QOL mod batch (Phase 4) + Mob Dismemberment + The Lost City** —
  built and shipped 2026-09-01. All installed, sandbox-verified with a
  fresh-world boot (real jigsaw structure generation exercised, since
  Lost City is a new structure mod) before deploying live:
  - **Inventory Sorter**, **Controlling** (+ Searchables dependency),
    **Xaero's World Map**, **Waystones** (+ Balm dependency), **Crafting
    Station Improved** — all installed as specced, each independently
    re-verified against its real CurseForge page (author/downloads/
    dependencies) before installing.
  - **Zoomify substituted for Just Zoom** — the originally-requested
    "Zoomify" (isXander) turned out to have no Forge build at all (only
    Fabric/Quilt - confirmed directly via `packwiz`'s own version
    resolution failing, not assumed from a search result). Real
    substitute found via Modrinth (`Just Zoom` by Keksuccino, 9M+
    downloads, + its Konkrete dependency) - and its real default
    keybind, confirmed by decompiling the mod's own `KeyMappings.class`,
    is already **Z** (GLFW keycode 90), so the "rebind C to Z" ask
    turned out to need zero configuration.
  - **A new Basics quest** ("A Stone That Remembers," gated on quest 6
    same as "Not Just Jewelry") teaches waystone crafting - real item
    task against `waystones:waystone`, confirmed craftable from its own
    shipped recipe before writing the task.
  - **Mob Dismemberment [UNOFFICIAL MODERN PORT]** — installed
    (ThatSoulyGuy's port, confirmed real Forge 1.20.1 build; the
    well-known original by iChun has none). **Real bug caught in
    sandbox verification**: it's genuinely client-side only and crashes
    outright when loaded in a dedicated-server context (references a
    client-only vanilla class during common setup) - packwiz's
    CurseForge metadata had defaulted its `side` to `"both"`, which
    would be wrong; corrected to `"client"`. This pack's own live
    instance runs as an integrated singleplayer client (not a dedicated
    server), so this shouldn't affect actual play - flagged as a real
    methodology gap in this session's own dedicated-server sandbox
    testing, worth remembering for any other client-only mod added
    later.
  - **The Lost City** (+ Berezka's library dependency, confirmed
    unambiguous this time, matching the peer's re-verification) — all
    12 of its own `structure_set` files retuned to moderate spacing
    (matching this pack's established pattern for every other structure
    mod), except `infinity_city.json`, which uses a custom placement
    type this session doesn't yet understand well enough to safely
    retune - left at its shipped default, flagged rather than guessed
    at. Verified for real: a fresh sandbox world booted clean through
    actual jigsaw structure placement (the highest-risk phase, given
    this pack's crash history) and `/locate structure
    the_lost_city:city` found a real instance 112 blocks from a test
    point, confirming the retuned spacing is genuinely reachable within
    this pack's small bordered play area.
  Not yet confirmed by an actual player session — sandbox verification
  covers boot/generation stability and real block/structure placement,
  not gameplay feel.
- **Fixed spawn point moved off the badlands blob + wave-spawn
  positioning rewritten** — built 2026-09-01 (see FEATURES.md's "World
  type" section for the full spec). Spawn now targets `(780, -150)`,
  picked via real RCON biome checks (badlands 300-500+ blocks away
  there vs. 0 at the old spot) rather than guessed. Confirmed the base
  build/worldborder centering/"last bastion" redesign all derive from
  the same single coordinate, so they relocate together automatically.
  Also fixed the real related bug found while doing this: the
  deterministic 1-8-wave system's mob spawn distance was
  worldborder-relative, so it grew unboundedly with the border
  (270 blocks by wave 8 from growth alone, and the amulet's
  `BORDER_EXPAND_DELTA` sends it into the millions) — rewrote to a
  fixed 40-60 block player-relative distance instead. **This does NOT
  fix the separate "endless horde spawns but nothing appears" bug** —
  confirmed by reading the code that the endless-phase branch is a
  completely different path (Undead Nights' own `spawn_horde` command),
  untouched by this change; that bug still needs its own diagnosis, see
  the 2026-09-01 feedback batch above. Not yet confirmed by an actual
  wave playtest.
- **"Last bastion, in disrepair" base redesign + amulet/pedestal
  reversal** — built and shipped 2026-08-31 (see FEATURES.md's "Starting
  base" and "The amulet" sections for the full spec). Watchpost walls
  now uneven (reinforcement concentrated at the gate, a genuinely weaker
  breached section on the back wall), gate dressed with cover props +
  a decorative spikes line, pedestal pre-placed in a shrine nook with
  grave markers, watchtower got battle-wear detail, and the previously
  unbuilt interior shack is now a real furnished room. Amulet is no
  longer starter gear — it has a real crafting recipe now, and the
  pedestal no longer gates on being crafted. Quest book updated to
  match (Basics 6.5/8.5 retasked). **Doomsday Decoration** + **Zcraft
  Decoration** installed. Verified via a live sandbox: every new block
  ID/blockstate individually confirmed placeable via RCON (caught and
  fixed 2 real "unknown block type" IDs that looked valid from
  blockstate files alone), script/quest reload clean with 0 errors. Not
  confirmed by an actual player spawn — the sandbox's mineflayer bot
  couldn't complete this mod set's FML handshake, so exact visual
  placement/spacing is unverified; expect at least one iteration round
  after your next look at it.
- **Machine progression, Tier 2** — built and shipped 2026-08-31 (see
  FEATURES.md's "Machine progression, Tier 2" and its Tier 2 quest
  chapter for the full spec). Fire Trap/Fan/Magnetic Chest (Trapcraft)
  and Arrow Turret (new install: Medieval Defense Turrets) all
  re-recipied to pull from the Uncommon loot tier; its own 4-quest FTB
  Quests chapter shipped alongside. Verified via a full-mod-set sandbox
  boot (clean `Done`, 0 script errors, exact expected 17-quest count) —
  not yet seen in-game.
- **Endless phase scaling (waves 9+)** — built 2026-09-01, **real bug
  found on first actual wave-9 playtest, real fix shipped 2026-09-01**:
  see "Structure improvements, remaining" above for the full root-cause
  writeup (Undead Nights' spawn-distance config exceeded the live
  instance's real simulation distance). Not yet confirmed by an actual
  wave-9 playtest with the fix in place.
- **2026-09-01 playtest feedback batch, Phase 2 (balance tweaks)** —
  built and shipped 2026-09-01, all four items:
  - Gold drop rate: Fortified Cache's `gold_ingot` entry weight 15->30
    (now the single highest-weight item in that pool) and quantity
    2-4->4-6 - expected ~2.4 gold ingots per bag opened, was ~0.9.
  - Worldborder growth: `base_expansion.js`'s per-wave rate cut to
    roughly 43% of the previous curve (10+3*step instead of 20+5*step),
    same step-every-2-waves shape - ends at 166 blocks by wave 8
    instead of 270.
  - Flesh Suffer nerf: attack damage 25->12 via the same Attributes-NBT
    override technique already used for the ravager, at the mob's
    summon point in `wave_spawner.js`. Also resolves the "invisible
    mob one-shot me" report from the same feedback round — investigated
    first, no literal invisible mob found (real combat log showed only
    known roster mobs; Flesh Suffer's actual ability is a Slowness VI
    melee-retaliation effect, not invisibility, which likely read as
    "got trapped and killed before I could react"). If a genuinely
    invisible attacker gets reported again after this nerf, it needs a
    fresh death with log access, not assumed to be the same thing.
  - Basics chapter: "The Reckoning" and "No Turning Back" (the last 2
    quests) removed entirely from `basics.snbt` - confirmed nothing
    else depended on them before removing. Resolves the outstanding
    "Quest 10 flavor text needs a rewrite" item by removing the need
    for it. Sandbox-verified: chapter reload shows exactly 15 quests
    (was 17), matching the removal.
  - Also fixed in the same pass, not originally its own numbered item:
    the "hostiles remaining" counter (`wave_status.js`) and the Wave
    Horn's own re-use gate (`wave_spawner.js`'s `nearbyWaveMobCount`)
    both used to match nearby hostiles by type only, so a real vanilla
    mob from a nearby structure's spawner block (spawners bypass
    `doMobSpawning`) within the counting radius got miscounted as a
    wave mob. Both now require a persistent `td_wave_mob` tag, set at
    the actual summon point, for the deterministic 1-8-wave phase;
    endless-phase mobs (which can't carry this tag, coming from Undead
    Nights' own opaque `spawn_horde` command) fall back to the old
    type-only matching, a deliberate scope boundary, not an oversight.

## Confirmed working (recent playtests)

- **Structure mod aesthetic swap** — **user-confirmed**: structure
  generation now reads as the intended abandoned aesthetic. When
  Dungeons Arise/Structory: Towers removed, Apocalypse structures:
  Abandoned city buildings + Abandoned Urban installed instead.
- World-gen: `multi_noise` biome source (7-biome curated set), raised
  floor depth, the whole 4-crash world-creation saga — **user-confirmed
  fixed**.
- The amulet + pedestal (worn buffs, border-crossing, marker
  alignment/bob fix) — exercised directly through real bug reports
  (marker misalignment, since fixed), so the core mechanic is proven
  working even though the marker height fix itself isn't pixel-verified.
- Vanilla desert pyramids disabled, Treasure2's mimic mechanic
  identified (not a bug, left undocumented on purpose).
- Base expansion's escalating growth curve — built, not separately
  confirmed by name, but the same worldborder machinery has been
  exercised repeatedly through the structure-reachability and world-gen
  playtests since.

## Not ready yet — needs fleshing out in IDEAS.md first
- Roguelike next-wave-composition choice — parked pending a GUI
  decision that was explicitly not pursued.
- **Base expansion into rooms/corridors (Schematicannon)** — mod
  question resolved (full Create installed), but a harder, genuinely
  blocking dependency remains: a lootable `create:schematic` item only
  points at a `.nbt` file, which has to already exist in that world's
  `schematics/uploaded/` folder — and none exists yet. Needs at least
  one room hand-built in-game and exported via Schematic and Quill +
  Schematic Table first. Not a coding-session task.

## Track C (2026-09-08 roadmap): Phase 2 → Phase 4 → Phase 5 boss-half — done

Built in dependency order per the "Roadmap: tier-by-tier feature-rich
buildout" section near the top of this file. Full technical detail
(real decompiled Advanced Tower Defense recipe/quantity findings, the
Shrapnel design decision, boss cadence/identity reasoning, the boss-kill
Totem mechanism) lives in docs/FEATURES.md's own new "Track C" entry and
each script's header comment - not duplicated here.

**Real sync gap, flagged for whoever merges this**: this worktree was
forked from `master` mid-session and never picked up the live
checkout's own in-progress edits to this file/FEATURES.md/IDEAS.md (the
"Roadmap"/"Frenetic-combat pivot"/"Hardcore mode" sections this track's
brief pointed at) - confirmed by direct line-count comparison, not
assumed. Everything below was built from those sections' real content
(read directly from the live checkout, not guessed), but this worktree's
own copies of all 3 docs are missing real content the live checkout has
- reconcile against the live checkout's fuller versions when merging,
this worktree's copies alone are not the full picture.

- **Phase 2 (Tier 2 turrets + economy) - done.** Advanced Tower Defense
  installed; real decompiled finding that its turret-head "crafting" is
  fully hardcoded Java (not a real recipe at all, the established
  `event.remove`+`event.shaped` pattern doesn't reach it) with one clean
  KubeJS-fixable blocker upstream (`tech_tablet_mechanics`, gated behind
  the mod's own separate unbuilt Research Table system) - fixed with one
  targeted new recipe rather than reverse-engineering that whole
  sub-system. Shrapnel shipped as a genuine crafting material (not
  flavor loot), gating that fix plus 2 new Blueprint-item recipes, added
  to all 4 loot-bag tiers. 2 new campaign.snbt quests, live-save progress
  checked first (no collision).
- **Phase 4 (boss wave capstone) - done.** Cadence: every 10th wave
  (10, 20, 30, ...) - deliberately NOT the same as Phase 0's every-5th
  airdrop trigger (would've collapsed every milestone into one
  undifferentiated tier), while still landing ON every airdrop wave
  (10 % 5 === 0 always) as an examined, intentional "biggest milestones
  get both" design, not a missed collision. Boss identity: a
  reskinned/stat-buffed `mutantszombies:mutant_brute` ("The Behemoth") -
  this pack's own toughest already-installed named mob, chosen over a
  vanilla mob specifically because [[project_zombie_apocalypse_roster_pivot]]
  already stripped every non-zombie-family vanilla mob from this pack's
  theme. Real vanilla `/bossbar` + `playsound`/`stopsound` (no custom
  `.ogg` - no tool available in this environment to synthesize a real
  one, and this pack's own Tesla Coil entry already treats that as
  optional) + particle cues, reusing pedestal_health.js's/
  wave_spawner.js's own proven idioms. Zero farmable gear via real
  `ArmorDropChances`/`DeathLootTable` vanilla mechanisms.
- **Phase 5, boss-kill-drop Totem half - done.** Guaranteed (100%, not
  an RNG roll on an already-hard fight) `minecraft:totem_of_undying` on
  every boss kill, alongside `securitycraft:universal_block_reinforcer_lvl1`
  (real id - hash-verified from the actual installed SecurityCraft jar,
  the research's guessed no-tier-suffix id doesn't exist) and 12x
  Shrapnel. Scoped narrowly on purpose: only the drop MECHANISM was
  built - the rest of Hardcore mode (permadeath toggle, death hook,
  pedestal vulnerability) stays exactly as parked in docs/FEATURES.md,
  untouched. This also resolves the same cadence fork sitting in
  docs/IDEAS.md's "Wave-clear reward: a building/machine places itself
  in the base" entry - see that entry's own updated note. The
  building-reward mechanic itself was NOT built (out of this track's
  scope) - only its cadence question, which the two entries shared, is
  now answered.
- **Not picked up, time/scope**: Phase 5's crafting-recipe Totem half,
  Phase 6 bounty shop. **SecurityCraft turret-recipe modules, turret
  combat-feedback effects, and tooltip tier color-coding are now done**
  - see "Tier 2 trap replacements + Track C follow-ups" near the top of
  this file (2026-09-09).
- **Verification**: every script `node --check`ed clean; edited JSON
  loot tables `JSON.parse`d clean; the extended `campaign.snbt` passed a
  full-file brace/bracket balance check. Full mod-set sandbox boot with
  a real player (bossbar/spawn/quest end-to-end) still needed - see this
  build session's own final report.

## Live-feedback batch, 2026-09-09 - all 3 built, none yet confirmed in live play

3 items from direct playtest feedback, full spec/reasoning in
docs/FEATURES.md's own "Live-feedback batch, 2026-09-09" section - this
entry tracks status against the user's own numbering. User said "send
it" 2026-09-09; built directly in this session rather than dispatched to
a peer (both items were small/well-specified enough not to need it, and
an interactive peer session can't be messaged safely without risking
disrupting whatever it's already doing - see this project's own past
finding on that).

1. **Chat noise -> toast popups - built.** Investigating the 8
   originally-listed call sites turned up something the original spec
   didn't know yet: 5 of them already had a paired vanilla `/title`
   popup sitting right next to the chat line (wave defeated, both wave-
   incoming messages, the "gap keeps growing" beat, airdrop inbound) -
   those chat lines were deleted outright as pure duplication rather
   than converted, which cuts more real noise than the original plan.
   The endless-wave-incoming message was converted to `player.notify()`
   instead of deleted (carries difficulty/baseline numbers the subtitle
   doesn't). 2 messages with no existing popup (base expansion border
   growth, pedestal manual-heal) converted to `player.notify()`. Command-
   feedback lines (force-clear, horn-misuse) left as chat - not part of
   the "routine ping" complaint, they're rare/player-initiated. All 5
   edited files pass `node --check`. **Not yet confirmed in live play.**
2. **Bounty quest live counter - built.** `max_progress` (25/100/300/
   750/1500) added to each task in `bounties.snbt`. `bounty_kills.js`
   now reaches `TeamData.setProgress(Task, long)` via reflection (same
   `Class.forName` bootstrap this pack already uses elsewhere), synced
   from a throttled `PlayerEvents.tick` (every 10 ticks) rather than
   every kill. **Two real bugs found and fixed while building, not
   just assumed working**: task ids are real 64-bit values that lose
   precision through JS's `parseInt` (routed through FTB Quests' own
   `QuestObjectBase.parseHexId` instead), and a raw
   `Method#invoke(Object, Object[])` call boxes a plain JS number as
   `java.lang.Double`, which `setProgress`'s `long` parameter would
   reject - routed every numeric argument through `Long.valueOf(String)`
   instead. `isCompleted`'s boolean return is stringified and compared
   (`` `${...}` === 'true' ``) rather than trusted for raw truthiness,
   matching this codebase's own established idiom for values crossing an
   uncertain Java/JS boundary. `.snbt` edit passed a brace/bracket
   balance check, `.js` passes `node --check`. **First time this pack
   has reached FTB Quests' own internals via reflection - genuinely new
   surface, not yet confirmed in live play** (does the bar actually
   render; does a completed tier stay completed once `killCount` climbs
   past its own threshold).
3. **Boomer zombie killable while armed - re-scoped and built, "telegraph
   it" direction.** The open question from the original spec came back
   negative: checked every event KubeJS 2001.6.5 actually registers
   (`KubeJSPlayerEventHandler`/`KubeJSEntityEventHandler`/
   `KubeJSItemEventHandler`, decompiled directly) - nothing fires before
   a player's attack reaches `hurt()`, and `EntityEvents.hurt` itself
   never fires at all for this specific case (`BoomerChargedEntity`'s own
   `hurt()` override returns `false` before ever calling `super.hurt()`,
   which is what would normally fire the event). Raw Forge-event-bus
   reflection hits the same functional-interface-coercion wall this
   codebase already documented for `mob_aggro.js`. Also found while
   checking: `hurt()` blocks explosion damage too (`DamageTypes.EXPLOSION`
   is in its exclusion list), so a TNT/explosive workaround doesn't
   exist either - but `mob_attack` and other custom/unlisted damage
   types (e.g. Bear Trap's own, Barbed Wire's own) are NOT blocked and
   already work today, untouched. Given no clean player-melee-detection
   path exists in this build, direct answer was to drop the "make it
   killable" goal and telegraph the moment instead: `boomer_zombie_
   explosion.js`'s own `EntityEvents.spawned` handler (already the exact
   tick a `boomer_charged` arms, since it seeds the explosion queue there)
   now also fires a red "ARMED" title, a "You cannot stop this one - move."
   subtitle, and a positioned `entity.tnt.primed` sound cue at that same
   instant - so a player knows immediately melee won't work and to
   disengage rather than waste hits on something that can't be damaged.
   `node --check` and an embedded-JSON parse check both pass. **Not yet
   confirmed in live play.**

## Live-feedback batch, 2026-09-09 (part 2) - all 3 built, none yet confirmed in live play

3 more items from direct playtest feedback, full spec/reasoning in
docs/FEATURES.md's own "Live-feedback batch, 2026-09-09 (part 2)"
section - this entry tracks status against the user's own numbering.

1. **Starting house missing -> Red House swap - built.** Root cause
   (spawn landed 20.4 blocks from a real Big Lost City/Philip's Ruins
   structure, plus 66 blocks of terrain variance the leveling pass can't
   handle) found directly in the live `logs/latest.log`. Swapped
   Abandoned Brick House for Red House (same mod, user's pick) with every
   local-coordinate fixup re-derived from Red House's own real NBT -
   loot strip (30 barrels), crafting station, cauldron/tripwire removal,
   wet_sponge fix, dimension constants, worldborder bumped 50->58 (real
   math against the new depth, not guessed). **`HOUSE_REINFORCE_BLOCKS`
   is disabled, not redone** - it's keyed to the old building's exact
   wall geometry; a real follow-up if the house's own walls should be
   reinforced again, separate from this swap. `node --check` passes.
   **Not yet confirmed in live play** - the underlying "spawn landed too
   close to a big structure" risk also isn't fixed, only worked around
   for this one report.
2. **Tab keybind for quests - no change needed.** Checked the live
   `options.txt` directly: already bound (`key_key.ftbquests.quests` ->
   Tab), coexisting with vanilla's player-list and Refined Storage's
   search-focus bindings - Minecraft fires every binding sharing a key,
   it doesn't block duplicates. Nothing to build; per-player client
   setting, not something packwiz should ship/override.
3. **Loot bags far too many - drop rates cut, built.** Root cause: the
   2026-09-08 redesign's 4 independent per-kill rolls (0.74 expected
   bags/kill) against 21 real wave 1+2 kills predicts ~15.5 bags -
   matches the report almost exactly. Cut to ~0.31 total/kill (Uncommon
   0.5->0.2, Rare 0.15->0.06, Epic 0.07->0.03, Legendary unchanged at
   0.02) - same per-tier shape, ~40% of the old volume. **Known
   trade-off, flagged not hidden**: also cuts average gold income from
   Uncommon bags by roughly the same fraction unless bag CONTENTS are
   separately bumped - not done here, revisit if gold feels short.
   `node --check` passes. **Not yet confirmed in live play.**

**Also fixed while in the area (not one of the 3 numbered items):** the
bounty progress-counter reflection shipped in part 1 above (item 2) was
silently crashing on every real boot (`TypeError: bqTaskForId is not a
function`) - found in the same `logs/latest.log` sweep used to diagnose
item 1. Real cause: a `function` declaration nested inside a `try` block
doesn't reliably hoist in this Rhino build. Fixed by converting it to a
plain `var` function-expression assignment. `node --check` passes,
**not yet confirmed the progress bar actually renders correctly now.**

**Unrelated pre-existing item, surfaced again for visibility**: the
"URGENT, needs a human action" BountyBags TOML entry at the top of this
file is still outstanding and unaffected by item 3 above (drop RATE
lives in `loot_bag_drops.js`, re-evaluated fresh every boot - it's bag
CONTENTS, in the cached TOML, that needs the manual delete/regenerate
step). Still worth doing since it's the same underlying loot system.

## Structure spawn-exclusion floor — built 2026-09-09, needs sandbox verification

Direct priority report (Xaero's map screenshot: ~a dozen structures
clustered within ~100 blocks of spawn). Full root-cause writeup and fix
in docs/FEATURES.md's own "Structure spawn-exclusion floor" section -
this entry only tracks status.

**Built**: 1 new anchor file
(`pack/kubejs/data/minecraft/worldgen/structure_set/ocean_monuments.json`)
+ `exclusion_zone` added/swapped across 29 existing `structure_set`
files (near/mid/far tiers from the 900d52c retune, plus `villages.json`,
`nether_ruins.json`, `underground_structures.json`). All 30 touched
files JSON-validated (`node -e "JSON.parse(...)"`).

**Not done**: real sandbox boot + `/locate` distance check against the
new `minecraft:ocean_monuments` anchor (this pack's usual verification
step for any structure placement change, given 3 prior real
world-creation crashes from this exact category of edit). `the_lost_city`
(10 sets) and `abandoned_structures` (4 sets, custom
`berezka_api:berezkas_structure_placement` codec) were deliberately left
untouched - see FEATURES.md for why.

**Known limit**: only affects chunks not yet generated - the live
save's already-explored area around spawn keeps its current structures
regardless. Needs either a fresh world or a real sandbox boot to
actually see the fix.

## Tier 2 trap replacements — DONE, see "Tier 2 trap replacements + Track C follow-ups" near the top of this file (2026-09-09)

Original spec kept below for reference/reasoning; status line only.

Direct feedback: "I hate the tier 2 traps... specifically the arrow
turret and vacuum chest thing." Full research/reasoning/decompiled
findings in docs/FEATURES.md's new "Tier 2 trap replacements" section
(search that heading) - this entry only tracks status.

- **Vacuum Block → Item Collectors.** Real, load-bearing finding: the
  installed `vacuum_cleaner` mod's pull mechanic is dead code on every
  tier (decompiled - no tier ever calls `.randomTicks()`, so its
  `randomTick()`-only pickup logic never fires under vanilla rules), not
  just fiddly as reported. Item Collectors (real Forge 1.20.1 build
  confirmed, 53M+ downloads) is a verified, simpler replacement -
  omnidirectional configurable radius, drops into a plain chest
  underneath, no rig.
- **Arrow Turret → promote Advanced Tower Defense's Musket Sentry into
  the actual Tier 2 gate**, replacing it rather than sitting behind it
  (reverses the "MDT's Arrow Turret stays untouched" call in Phase 2
  above). Zero new mod install - Musket Sentry's full recipe chain is
  already live from Track C. Arrow Turret's own recipe + "Wired for War"
  quest get cut entirely, not demoted to Tier 1.

**Not done**: everything - this is a spec, not a build. Real work needed:
verify Item Collectors' actual ids/recipe from its shipped data, re-recipe
via `event.remove`+`event.shaped` into the Tier 2 loot-pool filler
convention, remove the Vacuum Block recipe + uninstall `vacuum_cleaner`,
flatten "Beyond the Bow"'s quest dependency off "Wired for War" and
rewrite its description, rewrite "Waste Not"'s quest text for the new
mechanic, remove/repurpose "Wired for War", full-mod-set sandbox boot
before shipping.

**Holding for explicit "send it"** per this pack's own dispatch practice
- not sent to the build session yet.
