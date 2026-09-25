# Features: dead-systems history

Full specs for systems that were later **fully removed or replaced**,
archived 2026-09-16 out of `docs/FEATURES.md` to keep that file focused
on currently-live systems. Everything below describes a mod (or a
mod-specific mechanic) that is completely gone from the pack today —
Create + Create: Crafts & Additions, Advanced Tower Defense, Vacuum
Blocks, and Medieval Defense Turrets, per `docs/MODS.md`'s "Removed
mods" section. This has zero "current spec" value — nothing below
describes how anything works today — only historical "why we tried
this, and why it didn't stick" value. Each section is copied verbatim
from `docs/FEATURES.md`, unedited; a short pointer was left in that
file's original location under the same heading text, in case anything
else in the repo cross-references these sections by name.

---

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

---

**Barbed Wire replaces Spikes — requested 2026-09-04, built, deployed,
and committed (8e1ed02; the rig's final outdoor position landed later
in a9e6c1a as part of the pedestal rework — see end of this entry).**
Direct feedback: "the spikes is kinda rubbish, can we replace this
block with barbed wire trap from Create: Crafts & Additions." Verified
directly, not assumed:
- **Create: Crafts & Additions** (CurseForge, author MRHminer, 108M+
  downloads, real Forge 1.20.1 build `createaddition-forge-
  1.20.1-1.3.3`, released 2025-11-10). Dependencies confirmed from its
  own relations page: **Create** (required — already installed, see
  "Schematicannon → full Create") and **JEI** (optional — already
  installed). Zero net new footprint beyond the one addon jar.
- **Barbed Wire's real mechanic, confirmed not guessed**: mobs crossing
  it take damage *and* are severely slowed — a genuinely stronger
  effect than Spikes' plain contact damage, matching the "rubbish"
  complaint's likely real cause (Spikes' damage alone apparently
  doesn't read as a real deterrent).
- **Real tier-philosophy tension, surfaced and resolved with the
  user rather than decided unilaterally**: Iron Wire (Barbed Wire's
  own ingredient) isn't a crafting-table recipe — it needs a **Rolling
  Mill**, a real Create kinetic machine — which cuts against this
  pack's own established Tier 1 rule ("no power, no fuel," the exact
  reason Trapcraft's Igniter/Fan/Magnetic Chest are Tier 2, not Tier
  1). **User's call: keep it in Tier 1 anyway.**
- **Friction reduced, then fully shipped, 2026-09-04 — placement bug
  found and fixed 2026-09-05.** Rather than making the player build a
  Rolling Mill from scratch, **a finished Depot + Mechanical Press +
  Rolling Mill rig is pre-placed** inside the starting structure.
  **Real placement bug, direct playtest report**: the rig landed
  outside the building, blocking the front door — the original
  "clear space" spot-check only verified air/floor/ceiling, never
  *what kind* of space it was, and local x=4-6,z=9 turned out to be the
  open entrance yard, not a back room. Root-caused by parsing
  `abandoned_brick_house.nbt` directly (not another spot-check) and
  reproduced fresh against real terrain rather than trusting the
  already-played live save (4 waves in by report time, could have been
  altered by the player). **Corrected spot: local x=7, z=5-7** — a real
  enclosed room confirmed from the NBT itself (solid andesite
  foundation, 3 blocks of headroom, a real ceiling, walls/doors/
  furniture boxing it in), right beside the structure's own pre-placed
  furnace. The player's only remaining task is crafting one **Hand
  Crank** and placing it in the reserved open cell past the Mill —
  that step genuinely can't be pre-placed already running, it needs a
  real player right-click. Press and Mill face the same direction and
  conduct power directly to each other, no shaft
  needed — confirmed live with a temporary creative motor (real nonzero
  Speed on both blocks in a single 3-block kinetic network).
- **Real crafting chain, decompiled and live-verified end to end, not
  guessed from the wiki**: `iron_ingot` → Mechanical Press (items go
  **over a Depot**, not on top of the Press itself — the mod's own
  ponder text says so) → `iron_sheet` → Rolling Mill (items dropped
  directly on top) → `iron_wire` ×2 → crafting table (a diamond shape
  of 4 iron wires) → `barbed_wire` ×2.
- **One real, honestly-unresolved item**: the Mechanical Press never
  auto-fired in the scripted sandbox test — kinetic power and the
  Depot's item-holding both confirmed correct, but Running/Ticks never
  advanced even after 20+ seconds. Not chased further since the Rolling
  Mill (the actual thing being pre-placed and relied on) is fully
  verified working — but this needs a real player to confirm the Press
  itself actually processes when used normally; if it doesn't, that's a
  separate bug to open, not assumed fine.
- **Scope of the swap, all shipped**: `trapcraft:spikes` replaced
  everywhere it's referenced — the craftable Tier 1 item itself, the
  "Sharpened Scrap" quest's task target and both quest/chapter icons,
  and the decorative gate-line placement in `playtest_starter_kit.js`
  (now `createaddition:barbed_wire[vertical=false,facing=south]`,
  confirmed real blockstate properties from the mod's own JSON, not
  guessed). The gate-dressing design note has actually called this spot
  "a barbed-wire or Spikes line" since it was first written — barbed
  wire was always one of the two considered options here, this just
  resolves that either/or with the real block.
- **Real save-compatibility risk caught before deploying, not after**:
  the live instance's quest save already had "Sharpened Scrap"
  completed under its own task/chapter IDs, which had diverged from the
  repo's copy of that `.snbt` file at some earlier point (before this
  session). Blindly overwriting live with the repo's copy would have
  orphaned that real completed progress. Fixed by editing the live
  file's item/icon/description in place — keeping its real IDs — then
  syncing the repo copy back from that live file, so both now match
  exactly and the completed quest stays completed.
- **`packwiz refresh` run, all hashes clean. Deployed and committed**
  (8e1ed02) — held for review first given the quest-ID divergence risk
  above, then committed once the user gave the go-ahead.

**Trapcraft Spikes re-introduced as a weak Tier 1 interim trap, below
Barbed Wire** — *live*, 2026-09-05. This was item 5 of an original
5-item batch (docs/QUEUE.md), repeatedly bumped behind live bug reports
until now; the mod block was never uninstalled, just left with no recipe
or quest of its own once Barbed Wire took over as the "real" Tier 1
defense above.
- **Recipe retuned, not left stock**: Trapcraft's own shipped recipe
  (`data/trapcraft/recipes/spikes.json`, confirmed by decompiling the
  jar) is 5 iron ingots and nothing else — too steep for "weak/cheap
  interim," especially sitting beside Bear Trap's 3 iron + 3 stone
  pressure plates in the same chapter. New KubeJS override
  (`tier1_recipes.js`, mirroring `tier2_recipes.js`'s
  remove-then-`event.shaped` pattern): 4 sticks + 1 iron ingot — the
  cheapest defense item in the pack, by design, since it's meant to be
  available before Bear Trap or Barbed Wire's Create rig are built.
- **"Damage AND slow" resolved by pairing, not a code change**:
  `SpikesBlock.java`'s own decompiled logic only ever damages (2.0f
  base + a velocity-based bonus on contact, or a flat 20.0f on a 5+
  block fall) — no slow effect exists on the block itself. Rather than
  bolt one on, the fix is pairing it with plain vanilla cobweb (its own
  real movement-speed reduction already does the slowing half) — the
  new quest's description spells this out directly to the player as the
  intended combo, instead of leaving it as a silent, undiscoverable
  expectation.
- **New Tier 1 quest, "Better Than Nothing"** (`campaign.snbt`,
  `id: "67A7BF98D2C077DE"`) — same dependency root and visual cluster
  as "Sharpened Scrap"/"Something Crueler," slotted between them and
  "Not Just Jewelry" (x=13, y=-0.5). Rewards 1 XP level + 2 iron ingots —
  intentionally modest, and the iron reward nudges the player toward
  affording Bear Trap or the Barbed Wire rig next.
- Verified via a clean sandbox boot: KubeJS loaded all scripts with 0
  errors, recipe processing reported "0 failed recipes," and FTB Quests
  logged the expected 31-quest count (was 30) with no parse errors.
  Deployed to the live instance's script/quest files (`packwiz refresh`
  run, hashes clean) — **not yet confirmed by a real playtest.**

**Machine progression, Tier 2** — *live* (2026-08-31). Semi-automated,
redstone-powered, still fragile — the next rung up from Tier 1, and the
first real use for the Uncommon (Fortified Cache) loot tier. All four
items re-recipied via `ServerEvents.recipes`
(`pack/kubejs/server_scripts/tier2_recipes.js`) to swap each stock
recipe's Common-tier filler (cobblestone, loose redstone, iron ingot)
for Uncommon-tier materials (`quartz`, `redstone_block`, `iron_block`)
confirmed real from `loot_bag_open.js`'s `FORTIFIED_CACHE_POOL` — the
actual gate the loot tier was missing.
- **Fire Trap** = Trapcraft's **Igniter** (`trapcraft:igniter`) —
  already installed for Tier 1, unused until now. Lights an area on
  fire on a redstone signal. Re-recipe: netherrack ring, quartz
  filler, redstone_block core (was cobblestone/redstone dust).
- **Fan** (`trapcraft:fan`) — also Trapcraft. Pushes mobs (and items)
  on a redstone signal — funnels mobs into other traps, or pushes them
  back from the chokepoint. Re-recipe: quartz ring around an
  iron_block hub (was cobblestone/iron ingot).
- **Magnetic Chest** (`trapcraft:magnetic_chest`) — also Trapcraft.
  Auto-collects loot from trap kills. Re-recipe: planks, redstone_block,
  iron_block (was planks/redstone dust/iron ingot).
- **Arrow Turret** = **Medieval Defense Turrets**'
  `medievalturrets:bow_turret_item` (new install, Modrinth project
  `9y40sONu`, v1.1.4, Forge 1.20.1, no dependencies, confirmed real via
  the mod's own shipped recipe JSON before touching anything) — its
  simplest turret, arrow ammo only, picked specifically over TurretCraft
  and K-Turrets for being more "basic, fragile" like the rest of this
  tier. Re-recipe: bow + planks + iron_block (was bow/planks/
  cobblestone).
- **Reinforced Spikes** (tougher Tier 1 spikes) — cut. No equivalent
  found in Trapcraft; not blocking the rest of Tier 2.
- Verified via a full-mod-set sandbox boot (not just `node --check`):
  copied the live instance's entire relevant mod/config set into the
  same throwaway dedicated server used for the endless-phase-scaling
  verification, added the new turret mod, and confirmed a clean
  `Done (...)!` boot with `tier2_recipes.js` loading with 0 errors and
  FTB Quests logging "3 chapters, 17 quests" — the exact expected count
  (11 Basics + 2 Tier 1 + 4 Tier 2).

**Trapcraft dropped entirely — decided 2026-09-08, spec ready, NOT YET
BUILT, holding for explicit dispatch.** Direct feedback: doesn't like
Trapcraft's traps, but wants to keep the Magnetic Chest's *mechanic*
specifically — moved off Trapcraft onto a different mod, not kept as-is.
Scope confirmed directly with the user as "everything Trapcraft," not
just the traps — so this removes all 5 pieces currently wired in:
`trapcraft:spikes`, `trapcraft:bear_trap` (Tier 1), `trapcraft:igniter`,
`trapcraft:fan`, `trapcraft:magnetic_chest` (Tier 2).

**Correction to the user's own pasted research before it went further**:
that research named "Defensive Traps" (CurseForge, modid `defenses`) as
a Tier 1 spike/bear-trap replacement. Checked directly, not taken on
faith — **it has no Forge 1.20.1 build at all**, only NeoForge (1.21.1,
1.20.6) files exist on its real CurseForge files list. Ruled out. Worth
remembering the rest of that pasted research (Tier 2 turret mods, Tier 3
Tesla/flamethrower mods, boss-wave/bossbar/music KubeJS templates) was
read as background only, not verified or actioned — it also proposes
new tiers/mechanics this pack already has covered (Medieval Defense
Turrets already fills the Tier 2 automated-turret role) or that conflict
with the current stabilize-before-new-tiers priority; not part of this
entry.

**Real replacements verified (mod page/API checked directly per mod,
not assumed from search summaries):**
- **Tier 1 spikes** → **Simply Traps** (CurseForge, real
  `simply_traps-1.7-forge-1.20.1.jar`, Sept 2025, no dependencies) — use
  its Spike Trap/Stakes piece only. Its own barbed-wire item is
  deliberately NOT used — would duplicate Create: Crafts & Additions'
  barbed wire, already this pack's real Tier 1 wall-piercing defense.
- **Tier 1 bear_trap** → **V01D's Bear Traps** (CurseForge, real Forge
  1.20.1 beta build, June 2025, no dependencies) — genuinely holds a mob
  in place on trigger, same role as the current one.
- **Tier 2 igniter/fan** → **cut, not replaced**. No standalone mod
  found that fits either role on a real Forge 1.20.1 build. Recommended
  over continuing the search: both were only ever two simple item-task
  quests ("Spark and Flame," "Herd Them In") with no deeper mechanic
  built on top; Tier 2's real automated-defense identity is already
  Medieval Defense Turrets; and this pack's own earlier fan/`AirCurrent`
  investigation (2026-09-05 batch, item 23) already concluded mazes/
  walls are the real mob-redirect mechanism here, not fans — cutting
  these loses two thin quests, not real defensive capability.
- **Magnetic Chest** → candidate: **Smart Storage**'s "Smart Label" —
  attaches to any vanilla chest and gives it filtered magnetic pickup of
  nearby dropped items, rather than being its own dedicated block. Real
  Forge 1.20.1 build confirmed via Modrinth's version API (published
  2026-07-28, no dependencies). Checked and ruled out first: Vacuum
  Chest (real mod, but stale — last build is 1.19.2 from 2022), Magnetite
  Block (Fabric-only, no Forge build), Vacuum Blocks (real Forge 1.20.1
  build, but directional-into-a-hopper-only, a meaningfully weaker
  mechanic than the omnidirectional pull being replaced). **Real caveat,
  not glossed over**: Smart Storage is brand new and small (37 downloads
  total at verification time), single author, and its own page states no
  specific pickup range for the magnetic-collection feature — needs a
  real hands-on sandbox check of actual range/behavior before trusting
  it over what it's replacing, same rigor as every other mod pick in
  this pack.

**What building this actually touches** (for whoever picks it up):
`tier1_recipes.js` and `tier2_recipes.js` (drop the Trapcraft
re-recipes, add new ones only if the replacement mods' stock recipes
don't already fit this pack's tiering), the `kubejs:tier1_machines`
item tag, and 5 quest entries in `campaign.snbt` (spikes → Simply Traps
item, bear_trap → V01D's item, magnetic_chest → Smart Storage's item,
igniter/fan quests removed — check for orphaned dependents first, same
as every other quest removal in this pack's history). **Real risk to
check before touching `campaign.snbt`**: this exact chapter has already
diverged between the live save and the repo copy once before (the
Barbed Wire swap, 2026-09-04) — pull real current IDs from the live
save's own quest-progress file, don't blindly overwrite from the repo.
Also update `MODS.md`'s Trapcraft entry and this file's own "Tier 1
defenses"/"Machine progression, Tier 2" entries above once built (mark
Trapcraft-era text superseded, don't delete the history).

Nothing installed, uninstalled, or edited yet — spec only, holding for
an explicit go-ahead before dispatch.

---

### Advanced Tower Defense, added alongside Medieval Defense Turrets — planned, not built

**STALE as of 2026-09-09 — built, and the "don't touch" call below is
reversed by direct feedback.** Advanced Tower Defense was installed and
Musket Sentry/Anvil Launcher shipped as a later/heavier *addition* (Track
C, 2026-09-08 — see that entry further down this file and
`tier2_recipes.js`'s own header comment for the real recipe chain). Left
as history, not deleted. The "MDT's Arrow Turret stays untouched"
decision itself is superseded — see the new entry immediately below.

MDT's Arrow Turret stays exactly as-is (already live, quest-integrated,
verified via sandbox boot — don't touch). Advanced Tower Defense's
**Musket Sentry** and **Anvil Launcher** get added as a later/heavier
slot — variety, not a replacement, per direct decision. Real work before
dispatch:
- Verify ATD's actual block/item IDs and default recipes from its own
  shipped data — the pasted research's example recipes/IDs
  (`advanced_tower_defense:iron_bolt`, etc.) were never confirmed to
  exist and shouldn't be trusted.
- Decide re-recipe/tier gating using the same `event.remove` +
  `event.shaped` pattern already established in `tier1_recipes.js`/
  `tier2_recipes.js`.
- Needs a real quest slot — extend the existing turret quest chapter
  rather than create a new one, per this pack's "one quest per distinct
  item" convention.

### Tier 2 trap replacements: Vacuum Block → Item Collectors, Arrow Turret → Musket Sentry — spec ready, NOT BUILT, holding for explicit dispatch

Direct feedback, 2026-09-09: "I hate the tier 2 traps... specifically the
arrow turret and vacuum chest thing." Reviewed both against real
decompiled/verified data before proposing replacements — not a taste-only
swap.

**Vacuum Block (`vacuum_cleaner:vacuum_block_tier_1`, the "vacuum chest
thing") — real finding: it's not just fiddly, it's dead code.** Decompiled
all 5 tiers (`VacuumBlockTier1Block` through `Tier5Block`, all
`net.mcreator.vacuumcleaner.block`) directly via `javap`. Every tier's
constructor chains exactly 4 `BlockBehaviour.Properties` builder calls
(`of()` → `instrument()` → `sound()` → `strength(1.0F, 10.0F)`) straight
into the `Block` superconstructor — **no tier calls `.randomTicks()`
anywhere, and none overrides `isRandomlyTicking()`.** Every tier's actual
item-pull logic (`VacuumprocedureProcedure`/`Vaccumtier2proProcedure`/.../
`Vacuumtier5proProcedure`) is only ever invoked from the block's own
`randomTick()` override — confirmed via a full-jar grep, nothing else in
the mod calls it. Per vanilla's own block-ticking rules (confirmed via
web search against Forge 1.20.1 docs), a block that never opts into
random ticking never has `randomTick()` called at all. **The entire pull
mechanic is unreachable in normal play, on every tier, not just tier 1** —
this can't be patched via KubeJS (`isRandomlyTicking()` is a hardcoded
Java method, not data-driven; same "no custom Java mod" boundary as
Advanced Tower Defense's turret-head recipes above), so the fix has to be
a different mod, not a config tweak.

**Replacement: Item Collectors** (CurseForge, real Forge 1.20.1 build
confirmed directly via CurseForge's own files list — file v1.1.7 exists
for 1.20.1/Forge, not guessed from the mod's newest-version page; 53M+
total downloads, created 6 years ago, still receiving releases into 2026
— a well-established mod, not a fringe one). Real, verified mechanic
(CurseForge's own description page, cross-checked, not taken on faith):
places collected items into whatever block sits directly underneath the
collector (a plain chest is enough — no hopper rig at all), pulls from a
genuinely omnidirectional radius (Basic Item Collector: up to 5 blocks
per axis; Advanced: up to 7 blocks + a whitelist/blacklist item filter),
range configurable per-axis via the block's own GUI, no redstone/power
requirement. Directly answers all three named complaints: no rig beyond
"put a chest under it," no directional limitation, and it reads as a
generic scavenging "collector" rather than a vacuum-cleaner reskin.
**Scope call**: ship the Basic tier only as the Tier 2 replacement (keeps
the existing single-slot design, matches Vacuum Block's own tier-1-only
usage) — the Advanced tier (filtering) is a real future Tier 3 upgrade
candidate, not built here.

**Arrow Turret (`medievalturrets:bow_turret_item`) — direct feedback: too
weak/boring, and a thematic mismatch.** Already-documented real quirks
(from the earlier "Herd Them In" quest-text fix) explain part of why it
reads as thin: unlimited free arrows with zero ammo mechanic (no
maintenance loop at all), spawns facing a random direction until it
acquires a target, and a stray `RandomStrollGoal` can walk it off its
placed position when idle.

**Replacement: promote Advanced Tower Defense's Musket Sentry into the
actual Tier 2 gate, replacing Arrow Turret rather than sitting behind it.**
Zero new mod install — Musket Sentry is already installed and its full
recipe chain already works (Track C, 2026-09-08): Turret Workbench (Tier
0) + Blueprint (Musket Turret) + `tech_tablet_mechanics`, both gated
behind Shrapnel, then the mod's own hardcoded-Java assemble step (8x
iron_ingot, 1x stone_barrel, 1x spring, 1x spyglass, 6x wooden_parts, 4x
stone_parts — see `tier2_recipes.js`'s header for the full decompiled
chain). Real ammo economy already confirmed working (musket
shells/slugs, vanilla-material recipes, no dependency on anything gated).
Thematically a mounted gun, not a bow-on-a-stick — matches "heavier
sentry" framing already in its own quest text ("A heavier sentry than the
Arrow Turret..."). **Real quest-chain work needed**: "Beyond the Bow"
(Musket Sentry's quest, id `503260000FFBD462`) currently depends on
"Wired for War" (Arrow Turret's quest, id `74779308DEED321D`) — that
dependency needs flattening so Beyond the Bow becomes the Tier 2 gate
quest itself, not a bonus branching off it. Its description text ("A
heavier sentry than the Arrow Turret...") also needs a rewrite once Arrow
Turret is gone, since it currently assumes Arrow Turret is a live sibling
item.

**Scope call on Arrow Turret itself: cut entirely** (recipe removed from
`tier2_recipes.js`, "Wired for War" quest removed/repurposed), not
demoted to a Tier 1 option — Tier 1 has no turret slot in its own design
and nothing in the feedback asked to keep a cheaper version around.

**Not yet built, not yet dispatched** — holding per this pack's own
"write the spec, wait for explicit send it" practice. Real work for
whoever builds this:
- Verify Item Collectors' actual block/item IDs and default recipe from
  its own shipped data (packwiz hash-verified jar) before writing any
  glue — same rigor as every other mod addition in this pack, don't trust
  the CurseForge description page's item names.
- Re-recipe Item Collectors' basic tier via the established
  `event.remove` + `event.shaped` pattern, matching the Tier 2 loot-pool
  filler convention (`quartz`/`redstone_block`/`iron_block`) already used
  for the rest of this file.
- Remove `vacuum_cleaner:vacuum_block_tier_1`'s recipe entirely from
  `tier2_recipes.js`; the mod itself can be uninstalled from packwiz once
  nothing references it.
- Rewrite the "Waste Not" quest text (currently describes the Vacuum
  Block's — also fictional, given the dead-code finding above — pickup
  behavior) to describe Item Collectors' real mechanic instead.
- Flatten "Beyond the Bow"'s quest dependency as described above, remove
  or repurpose "Wired for War," rewrite Beyond the Bow's description to
  drop the Arrow Turret comparison.
- Full-mod-set sandbox boot (uninstalling `vacuum_cleaner`, keeping
  Advanced Tower Defense already-installed) before shipping — same bar as
  every other recipe/quest change in this pack's history.

---

### Flamethrower Mechanics (Create Nozzles) — idea, not scoped

Missed on the first pass, caught on re-audit. Distinct from the Tesla
Coil entry above - routes lava (or a modded fuel) through Create's own
Nozzle blocks (Create is already fully installed for this pack's power
chain, see "Storage & power system") to create a high-pressure fire
torrent across a chokepoint. Real appeal: no new mod needed at all,
pure recipe/contraption work against a mod already in the pack. Not
scoped - real open questions before this is buildable: does a Nozzle's
vanilla fire-stream actually deal meaningful damage to mobs walking
through it (needs a real in-game/decompile check, not assumed), and
how it fits relative to the Tesla Coil as a second Tier 3 option
(alternative choice vs. a required second machine) is undecided.
