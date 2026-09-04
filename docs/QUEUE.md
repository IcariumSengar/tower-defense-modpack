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

## Ready to build

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

- **Second fresh-world playtest batch** — sent to build 2026-09-06,
  user go-ahead, **priority — do this before the loot-table audit
  below.** 4 items, full detail in FEATURES.md's "Second fresh-world
  playtest batch" entry (under "Pedestal visual upgrade + mob-attack
  vulnerability"):
  1. **Done, shipped 2026-09-06.** Circular altar removed entirely,
     pedestal placed directly at ground level (`wallY0`) at the same
     centered plan-position, no platform/plinth/rings. Block placement +
     marker armor stand confirmed live in a sandbox; the full
     login-triggered build itself is unconfirmed in-game (same standing
     blind spot as every other spawn-time build in this pack — no real
     player can join the sandbox).
  2. **Done, shipped 2026-09-06.** Real `td_pedestalHealth` (200, first
     pass) + throttled tick check for wave mobs in melee range,
     damage-per-hit read from each attacker's own real
     `generic.attack_damage` attribute, calls the same destroy path as
     `pedestal_destruction.js` at 0 HP. The two genuinely new mechanics
     (the attribute read, and a new cross-file function call to share
     that destroy path) were both confirmed working in a live sandbox
     before shipping — the full `PlayerEvents.tick` wiring itself is
     unconfirmed in-game, same blind spot as item 1.
  3. **Blocked on a real user decision, not a build task right now** —
     spawn census re-run on the live save's actual seed confirms the
     plains bug, but the nearest thematic biome (savanna) is **520
     blocks away**, not "a nearby tile." Since the whole base compound
     derives from this one coordinate, this is really "relocate the
     base" not "nudge the spawn point." See FEATURES.md's "Real finding
     on item 3" for the 4 real options — needs your call before the
     build session touches this one.
  4. **Done, live-verified, shipped 2026-09-06.** Real fix was exactly
     what the user said: Depot on the floor, Press 2 blocks above it.
     Confirmed live (iron ingot → iron sheet actually processed) before
     committing. Also closed the separate "Press never auto-fires" bug
     — same root cause.
- **Loot-table dead-weight audit — done, shipped 2026-09-06.** New
  `loot_dead_weight_strip.js`. Real chest-context `removeLoot(ItemFilter)`
  syntax confirmed by decompiling the installed LootJS jar directly
  (matches `context.addLoot(...)`'s own object, auto-converts a plain JS
  array via the same `Ingredient`-style conversion used everywhere else
  in this pack). Live-verified: rolled the real vanilla
  `abandoned_mineshaft` table (confirmed by its own JSON to include
  rails/name_tag) 10 times, zero stripped ids appeared, unrelated loot
  (including this pack's own bonus pools) unaffected. Full strip list in
  FEATURES.md's "Loot-table dead-weight audit" entry.
- **Legendary loot bag jackpot + beam visual** — sent to build
  2026-09-05, user gave standing authorization to line up and dispatch
  queue items without per-item confirmation while away. Full spec in
  FEATURES.md's "Legendary loot bag jackpot + beam-of-light visual"
  entry (under "Loot bags"): a flat 2% bonus-roll on every wave mob kill
  (any tier) for `bountybags:legendary_loot_bag`, additive to the
  existing tier-gated drops, plus installing **Loot Beams: Refork**
  (verified fresh, Forge 1.20.1, uploaded 2025-11-29) for the beam
  visual, with a config check for whether the modded bag item needs an
  explicit rarity entry. Deliberately scoped to `loot_bag_drops.js`
  only — no touches to `wave_spawner.js`/`wave_status.js`/
  `mob_aggro.js`, since those are mid-debugging for the fresh-world
  mob-pathing regression right now.
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
- **Aesthetic structure variety pass** — sent to build 2026-09-05,
  user's go-ahead. Full detail in FEATURES.md, "Aesthetic structure
  variety pass" (under "World type"). Install **Philip's Ruins** and
  **Big Lost City — Apocalyptic Structures!**. Dependency
  re-verification, spacing retune to the current border curve, and a
  loot-table-opacity check all left for the build session.
- **Abandoned Urban missing chest loot** — sent to build 2026-09-05,
  user's go-ahead. 33 of its 34 structures have no chest at all
  (confirmed by decompiling all 34 `.nbt` files directly — only
  `gas_station_loot.nbt` has one). Real fix: a `processors` rule on the
  mod's own jigsaw template pool entries to probabilistically inject
  chests into the existing pieces — the standard vanilla technique, but
  real, and this pack has a documented crash history from exactly this
  kind of change (see FEATURES.md's "World type" section). **Structure
  spawners are deliberately held back, not part of this dispatch** —
  user's own sequencing: send spawners only after this and the
  aesthetic pass are confirmed stable, not stacked into the same batch.

## Built, awaiting your next playtest

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
    2025-11-26), not the 2023-abandoned one originally flagged. Real
    open question instead: Forge's dedicated-server scanner flags it
    client-only despite real server-side code in the jar — needs a real
    check that per-player chest behavior actually works, not assumed.
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

## On hold — deliberately not queued right now

- **Storage & power system** — fully specced 2026-09-01 (see
  FEATURES.md's "Defense" section, "Storage & power system" entry).
  **Sophisticated Storage** (+ required Sophisticated Core), **Refined
  Storage**, **Immersive Engineering** (power generation — also
  resolves the Tier 3 Tesla Coil candidate for free), and **Flux
  Networks** (wireless distribution) — four mods, real footprint (IE is
  a full standalone tech mod, the biggest single addition besides full
  Create). Real design decision made along the way: this becomes the
  pack's actual Tier 3-4 power system, not a separate storage-only
  addition. Three of the four mods' exact dependency lists weren't
  fetched directly from their own CurseForge relations pages (only
  Sophisticated Storage's was) — verify before installing, not assumed.
  **Deliberately parked, not sent to build** — queued behind the
  current 2026-09-01 playtest-feedback batch (13 items, 5 phases) so it
  doesn't add a fifth substantial project on top of what's already in
  flight. Send when that batch clears.
- **Hardcore mode** — fully specced 2026-09-01 (see FEATURES.md's new
  "Hardcore mode" section). Real permadeath (player death or pedestal
  destruction) softened by Totems of Undying, obtainable both as a rare
  boss-kill drop and via a new (vanilla has none) hard crafting recipe.
  Built fully custom via KubeJS, not vanilla's native Hardcore flag —
  confirmed that flag can't be turned on after world creation, no
  command/datapack path exists. Optional toggle, not the pack's new
  default — endless-phase scaling means every hardcore run eventually
  ends in death no matter how skilled the player is, which is fine for
  an opt-in but not as a forced default. Pedestal deliberately stays
  unhardened — defending it is meant to be real base-defense stakes,
  not background scenery. **Deliberately parked, not sent to build** —
  same reasoning as the storage/power system above, queued behind the
  current playtest batch rather than adding a sixth parallel project.
- **Defense-breaching enemies (Demolition Zombie)** — fully specced
  2026-09-01 (see FEATURES.md's new "Mob roster & defense-breaching
  threats" section). Introduces Undead Nights' own Demolition Zombie
  (already installed, currently unused) as a late-wave threat that can
  genuinely destroy the gate/watchtower/placed machines via real TNT —
  confirmed first that the reinforced perimeter walls themselves can
  never be the breach point (SecurityCraft's explosion immunity is
  unconditional, not tunable), so this targets what's actually
  vulnerable instead. User decided: also reinforce the gate (was left
  plain as "unnecessary complexity" before there was any real threat to
  it — that's now an accidental weak point, not an intentional one).
  Exact numbers (TNT count, spawn weight, introduction wave) still
  open. **Deliberately parked, not sent to build** — queued behind the
  current playtest batch, same as
  everything else above.
- **Mutants and Zombies (more zombie-family variety)** — fully specced
  2026-09-01 (see FEATURES.md's "Mob roster & defense-breaching
  threats" section, "More zombie-family variety" entry). 8 real
  zombie-family mobs (Zombie Brute, Crawler, Spitter, Blister Zombie,
  Split Head Zombie, Mutant Brute, Rotten Mutant, Mutant Zombie), same
  author as the already-trusted Undead Nights, confirmed to add no
  autonomous wave/horde systems of its own. One clean dependency
  (Advanced Wall Climber API, confirmed real Forge 1.20.1). Mutant
  Monsters (the more famous alternative) checked and ruled out — no
  Forge 1.20.1 build exists. Still needs: deciding which waves/hordes
  these mobs actually join, and any loot/stat re-recipe work, same
  treatment TFTH mobs got. **Deliberately parked, not sent to build** —
  queued behind the current playtest batch, same as everything else
  above.

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
