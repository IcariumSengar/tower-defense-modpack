// Every-5th-wave airdrop (rebuilt 2026-09-08, direct instruction - replaces
// the old wave-8+ speed-clear-bonus mechanic entirely, not layered
// alongside it). New trigger: `waveNumber % 5 === 0` on wave clear, no time
// window, no skill check - a flat cadence reward. **Explicitly
// provisional** - "I may come back to this mechanic to see if there is a
// better gameplay feel that lends itself to the airdrop," so don't treat
// this cadence as locked/final.
//
// Mod swap: Paojiao134's Airdrop -> Realistic Airdrop (`dyairdrop`,
// CurseForge author naughty_keller85), 1.1.0-1.20.1-beta build (CurseForge
// file 7689163, project 1116182). Real freshness check done before picking
// this build, not assumed from the prompt's own prior research: CurseForge
// actually has a whole non-beta 1.0.0.x release line (1.0.0 -> hotfix ->
// hotfix3.0, Mar-Sep 2025) between the old 0.9.5 beta and this 1.1.0 beta -
// the "only two 1.20.1 files, both Beta" premise was stale. Picked 1.1.0-beta
// anyway over the newer-but-still-"release"-tagged hotfix3.0 after diffing
// both jars' decompiled bytecode directly: the beta is a genuine refactor
// (readable variables, not MCreator's `_levelxx` soup) that adds one real,
// useful feature relevant here - a trailing `map` boolean that, when true,
// calls Xaero's Minimap's own `addwaypointxaero` command on the landed
// crate's real position (confirmed via decompile: `MobairdropticksProcedure`
// in the beta build issues `addwaypointxaero @a <x> <y> <z> ...` right after
// the block-placement setblock). Xaero's Minimap is already installed in
// this pack, so this is a real, free "find your crate" upgrade over the old
// mod's own landing behavior - worth the Beta label, matching this pack's
// existing "Beta is often just a CurseForge convention, not a real
// instability signal" stance. No crash/instability found in a real
// full-mod-set sandbox boot (see docs/QUEUE.md for the verification note).
//
// Real command chain, confirmed by decompiling SetairdropCommand /
// Flycode3neoProcedure / MobairdropticksProcedure directly (not guessed
// from the mod's own listed examples):
// `/setairdrop random <player> <height> <length> <driftmin> <driftmax>
// <blockid> <loot_table> <pin> <map>`
// - `<player>` is a plain vanilla single-EntityArgument selector - `@r`
//   really does mean "a random online player" here (standard vanilla
//   selector semantics, nothing dyairdrop-specific), confirmed from the
//   decompiled command builder (`EntityArgument.entity()`). The crate then
//   free-drifts a random `driftmin`-`driftmax` block distance from THAT
//   player's live position in a random direction - there's no world-border
//   integration in this mod at all (a real behavior difference from the
//   old Paojiao134's Airdrop, which auto-confined itself to the current
//   border via its own BorderIntegrationHandler) - drift is kept modest
//   below specifically so this can't realistically launch the crate
//   outside the live worldborder even at wave 5 (the earliest trigger,
//   smallest border).
// - `<blockid>` = `dyairdrop:airdroplarge`, a real registered block
//   (confirmed in `DyairdropModBlocks`) - the mod's own biggest crate,
//   matching this slot's existing "big reward" framing. Its tile entity
//   (`AirdroplargeTileEntity`) genuinely `extends
//   RandomizableContainerBlockEntity` - real vanilla loot-table-on-first-
//   open mechanics, the same mechanism `structure_chest_loot_fix.js`
//   already relies on elsewhere in this pack, not a custom inventory
//   system.
// - `<loot_table>` is passed through completely unvalidated all the way
//   down into a real `setblock ... {LootTable:"<value>"}` command
//   (confirmed in `MobairdropticksProcedure` - it never touches a
//   vanilla-only allowlist), so a custom pack-registered loot table id
//   resolves exactly like any vanilla one - real confirmation of the
//   "still needs verification" item from the original spec. Points at
//   `kubejs:chests/wave_airdrop` (data/kubejs/loot_tables/chests/
//   wave_airdrop.json), the same reward composition the old hand-authored
//   `config/airdrop/wave8_bonus.json` JSON pool used (legendary loot bag +
//   netherite scrap + diamond block), just as a real vanilla-format loot
//   table instead of the old mod's bespoke pool format.
// - `<pin>` = false - no password lock, this is an unconditional reward,
//   not a puzzle.
// - `<map>` = true - drops the Xaero waypoint described above.
//
// **Weapon/ammo/grenade pools added 2026-09-11**, direct feedback: airdrops
// always gave the exact same 3 items (legendary bag + netherite scrap +
// diamond block, kept unchanged below) - flat, no variety. No firearm mod
// was installed in this pack; **Simple Guns: reworked** added (CurseForge
// project 437035, file 7924023, `simple_guns_reworked-1.9.9-forge-1.20.1.jar`,
// zero dependencies, real Forge 1.20.1 build - confirmed fresh, uploaded
// Apr 2026, not a stale pick) - single small MCreator mod (same shape as
// dyairdrop/TFTH/Advanced Tower Defense already in this pack) that covers
// guns, ammo AND a grenade in one zero-footprint jar, so no second mod was
// needed. Real item/registry ids below confirmed by decompiling the exact
// installed jar's `SimpleGunsReworkedModItems.class` constant pool directly,
// not guessed from the mod's lang file alone (which also carries stale
// `item.simple_guns.*` keys from before the "reworked" rename - those are
// NOT real registry ids, only `simple_guns_reworked:*` ones are). 16 guns,
// 7 ammo/consumable types (pistol_ammo/rifle_ammo/shotgun_ammo/sniper_ammo
// cover the 4 core gun families; rocket/fuel_tank/charged_potato are the
// bazooka/flame_thrower/potato_cannon's own specialty ammo) plus
// `simple_guns_reworked:grenade` - all real, all player-craftable via the
// mod's own stock vanilla-material recipes too (e.g. grenade = 4x
// iron_nugget + gunpowder, confirmed from `data/simple_guns_reworked/
// recipes/rgrneade.json`) - putting them in loot here is a deliberate
// choice, same call as retiring the vanilla-only loot rule for "kills should
// feel like progressing your tech" (see `docs/IDEAS.md`), not an oversight
// of the "no loot shortcuts for a home machine's own output" principle.
// 3 new pools in `wave_airdrop.json`, additive only - the original 3 pools
// are untouched: one weighted pick across all 16 guns (commoner/weaker guns
// weighted higher - first-pass numbers, not playtested), 2 weighted ammo
// rolls, and a guaranteed 2-4 grenades. No re-recipe layer added, matching
// this pack's existing "don't re-recipe stock mod content" convention (see
// FEATURES.md's Storage & power system entry for the precedent).
// Real config judgment calls (pack/config/dyairdrop.toml, header comment
// there has the full reasoning): `enable=false` (this pack's own trigger
// replaces the mod's autonomous global-event airdrop entirely, not
// alongside it), `enableenemies=false` (the mod's own default hostile-mob-
// near-crate mechanic would reintroduce a non-zombie-family mob
// (pillager) and a second, untracked spawn system on top of this pack's
// own wave/horde spawning), `forceload=false` (avoids a real risk the mod
// author's own comment flags, unnecessary here since every drop lands near
// an already-loaded online player).
//
// **"Airdrop incoming" cues, 2026-09-10** - direct playtest feedback: "it
// dropped but i missed the plane coming over and stuff, i want to know
// when to look up." Two real reasons the old single "SUPPLIES INBOUND"
// title was missable, both fixed here:
//  1. It fired in the same tick as the wave-clear popup - and at wave 5
//     (the first airdrop wave) in the same tick as the gear-removal title
//     too. Vanilla `/title` resets on every call, so it was overwritten
//     before it could be read - the exact collision wave_status.js's
//     delayed-title queue exists for. The drop is now DELAYED: the wave
//     clear only schedules it (td_airdropDueTick, WAVE_AIRDROP_DELAY_TICKS
//     later - past the wave-clear popup and the wave-5 follow-up titles),
//     and the plane is launched from the tick handler below with its own
//     clear title ("LOOK UP") and an attention sound at every player, on a
//     screen that's otherwise quiet.
//  2. Nothing marked the actual landing. The falling crate is a real
//     entity (`dyairdrop:airdrop` for the large crate - decompiled
//     `PlaneticksneoProcedure`: the plane summons it at tick 105 of its
//     flight, small crates use `dyairdrop:smallairdrop`) that the mod
//     replaces with the crate block + Xaero waypoint the moment it lands
//     (`MobairdropticksProcedure` discards the entity right after its
//     setblock). So "crate entity seen, then gone" == landed, polled every
//     10 ticks only while a drop is in flight (td_airdropWatch), never
//     otherwise. That moment gets its own subtitle pointing at the map
//     marker.
// The mod's own plane sound (`dyairdrop:planesound`, volume 25, played by
// `Flycode2neoProcedure` at the plane's spawn) and its own chat line ("A
// random airdrop is being deployed! Expected coordinates: ...") are left
// as they were - both still fire, they just weren't enough on their own.
//
// **Plane flight duration + landing beacon, 2026-09-15** - direct
// feedback: "the airdrop plane animations should last longer" and "can
// there be a large beam of light or something indicating where it is, a
// marker on the map would be good too" (the map marker half already
// exists - `<map>=true` above already drops a real Xaero waypoint on
// landing - only the flight duration and a physical beam needed
// building).
//
// Flight duration, decompiled directly (`javap -c` against the actual
// installed jar, not guessed): `Flycode3neoProcedure` computes the drop
// TARGET x/z once (the drift-around-the-player calc already described
// above) and forwards it untouched into `/setairdrop free`;
// `Flycode2neoProcedure` (the `free` handler) then spawns the plane
// entity at `x - length` (real bytecode: `getDouble("x")` minus
// `getDouble("length")`, rounded) - i.e. `length` is how far back the
// plane spawns from the FIXED target, not a scale on the target itself,
// so raising it lengthens the flyover without moving the landing spot.
// `PlaneticksProcedure` (the plane's own tick - already carrying this
// pack's earlier 3.0 -> 1.0 blocks/tick speed patch, see MODS.md's
// constant-patch entry) tracks `dpassed = abs(currentX - startX)` every
// tick and drops the real crate entity once `dpassed` is within 1 block
// of `length` (`flytime` records the tick that happened on), then keeps
// flying until `timer >= flytime*2` OR a hardcoded `timer >= 205`
// absolute cap, whichever comes first - so `length` can't be pushed past
// ~200 ticks of flight or the plane self-destructs before ever reaching
// its drop distance and no crate spawns at all. First pass: 60 -> 120
// (~3s -> ~6s pre-drop at the patched speed).
//
// **Bumped again same day, direct follow-up: "can you make the plane
// take 10 secs. its cool to see it fly over."** 10s = 200 ticks, which
// only leaves 5 ticks of slack under that hardcoded 205 absolute cap -
// real risk of the plane self-destructing before it ever reaches its
// drop distance (no crate, no loot, nothing logged) on a run where the
// every-5-tick velocity reassert or the `round(...) <= 1` trigger
// tolerance eats into that margin. No way around this by tuning
// `length`/speed alone - the 205 is a hardcoded tick count, independent
// of how a 200-tick flight is reached. So the SAME `tools/
// patch_class_constants.py` technique this jar's speed constant already
// used got pointed at this cap too: `net/mcreator/dyairdrop/procedures/
// PlaneticksProcedure.class`, `Double 205.0 -> 250.0` (confirmed a
// single, unambiguous constant-pool hit via `javap -c` before and after,
// same jar entry count before/after - see MODS.md's constant-patch
// entry). `WAVE_AIRDROP_LENGTH` 120 -> 200 for the real 10s pre-drop
// flyover this asked for, now with a genuine ~50-tick (~2.5s) margin
// under the raised cap instead of 5, and `flytime*2`=400 still exceeds
// the new 250 cap, so the post-drop tail is governed by it the same way
// as before (~2.5s flyaway before despawn).
//
// Landing beacon: neither the mod nor this file previously tracked the
// crate's landing spot proactively - `td_airdropCrateX/Y/Z` was only ever
// populated reactively, by `BlockEvents.rightClicked` once a player
// physically found and opened it. Fixed by watching the falling crate
// entity's own position on the existing 10-tick poll while it's still
// airborne (`td_airdropFlightX/Y/Z`, overwritten every cycle - it falls
// straight down once dropped, no horizontal drift, so X/Z stay accurate;
// only Y goes stale between polls) and, the moment it's gone (landed),
// scanning a bounded column down from that last-seen Y for the real
// placed `dyairdrop:airdroplarge` block (`findLandedCrateY` below) -
// exact, and immune to nearby foliage throwing off a heightmap guess.
// That seeds the SAME `td_airdropCrateWatch` state `pollAirdropCrateCleanup`
// already maintains (normally only ever started by the player's first
// right-click), so the beam and the existing auto-cleanup share one
// position/lifetime instead of a second parallel tracker - a plain
// vanilla `particle minecraft:end_rod ... force` column at that spot,
// redrawn on the same 10-tick cadence `pollAirdropCrateCleanup` already
// runs on, plus one bigger one-off burst the instant landing is
// detected. `force` is deliberate: the crate can land 90-110 blocks from
// the player (`WAVE_AIRDROP_DRIFT_MIN`/`MAX`), well past vanilla's normal
// particle-visibility range - the whole point is a real long-range
// landmark, not a close-up effect. Stops the moment
// `pollAirdropCrateCleanup`'s own loot-check clears the watch (looted or
// broken/replaced), same as the existing auto-cleanup - no separate
// timer needed.

// **2026-09-22 - "the airdrop location NEEDS to add a waypoint marker on
// the map. I could see [neither] the plane nor the drop. maybe it was too
// far away?"** Four real findings, four changes:
//  1. The map waypoint NEVER worked. The `<map>=true` mechanism described
//     above is real in the airdrop mod (it does issue `addwaypointxaero @a
//     x y z ...` on landing) - but that command does not exist: the
//     installed xaerominimap-forge-1.20.1-26.4.2.jar contains no such
//     string anywhere (full jar scan), so it has silently failed on every
//     drop since 2026-09-08. What Xaero's Minimap actually supports from a
//     server is its chat-sharing protocol (decompiled ClientEvents.
//     handleClientSystemChatReceivedEvent -> WaypointSharingHandler.
//     onWaypointReceived): a system message containing
//     `xaero-waypoint:<name>:<initials>:<x>:<y>:<z>:<color>:<rotate>:<yaw>`
//     is swallowed client-side and re-rendered as "<sender> shared a
//     waypoint: <name> [Add]", where Add opens the mod's own prefilled
//     Add-Waypoint screen (RUN_COMMAND "/xaero_waypoint_add:..." which the
//     mod intercepts in its client-send handler). The mod's only
//     fully-automatic prefix (`xaero_waypoint_add:`) is intercepted from
//     chat the PLAYER sends, not from server messages, so a genuinely
//     silent server-side add is not possible - click Add, confirm, done.
//     sendAirdropWaypoint() below sends exactly that message on landing.
//  2. A REAL in-world marker: a vanilla `minecraft:beacon` placed on top of
//     the landed crate. A beacon renders its full-height beam with no
//     pyramid at all (BeaconBlockEntity.tick computes the beam column
//     independently of the base; the base only gates effects/sound), and
//     the crate fell through that exact air column, so the sky above is
//     guaranteed clear. Visible from render distance (BeaconRenderer's own
//     256-block view distance), far more than the end_rod particle column
//     it replaces (the periodic redraw is gone; the one-off landing burst
//     stays). Unbreakable while tracked (BlockEvents.broken cancel on that
//     one position - a free beacon per drop would be a real loot exploit),
//     removed together with the crate by pollAirdropCrateCleanup's own
//     exits (looted / broken by hand / 30-min timeout), and only ever one
//     tracked at a time (a new landing removes the previous drop's).
//  3. Closer and in view: the landing spot is now chosen HERE, 50-70
//     blocks from the pedestal (was 90-110 from a random player), and
//     handed to `/setairdrop free <x> <z> ...` (explicit target; decompiled
//     SetairdropCommand - 7 args: x z height length blockid loot_table
//     pin, no map bool on this variant) instead of `/setairdrop random`.
//     The plane always spawns WAVE_AIRDROP_LENGTH blocks WEST of its
//     target and flies east (Flycode2neoProcedure, decompiled), so keeping
//     the target inside a +/-75 degree eastern arc of the pedestal means
//     the 10-second flyover crosses the base itself before the drop
//     instead of passing 100 blocks off to one random side. "Random
//     direction" is now "random within the eastern arc" - a deliberate
//     trade for a flyover people can actually see; the plane's own
//     64-chunk tracking range (DyairdropModEntities, decompiled) means the
//     client sees it from spawn at any normal render distance.
//  4. Altitude: `<height>` is the plane's ABSOLUTE spawn Y (Flycode2neo
//     summons it at (x - length, height, z)), and it was a flat 100 - on a
//     base built at Y 90 that is a plane at treetop level. Now pedestalY +
//     WAVE_AIRDROP_HEIGHT_ABOVE_PEDESTAL at launch time.
// Plus the standing action-bar line now says which way to look ("coming
// in from the west") and, for 20s after touchdown, gives the crate's real
// coordinates (airdropInboundActionbarText grew a `now` parameter for
// that; both callers updated).
var WAVE_AIRDROP_INTERVAL = 5
var WAVE_AIRDROP_BLOCK_ID = 'dyairdrop:airdroplarge'
var WAVE_AIRDROP_LOOT_TABLE = 'kubejs:chests/wave_airdrop'
// Absolute Y 100 -> pedestal-relative, 2026-09-22 (see header item 4).
var WAVE_AIRDROP_HEIGHT_ABOVE_PEDESTAL = 40
// 60 -> 120 -> 200, 2026-09-15 (see header) - a real 10s pre-drop flyover
// at the patched 1.0 blocks/tick plane speed, safe now that the mod's own
// 205-tick despawn ceiling is also constant-patched up to 250.
var WAVE_AIRDROP_LENGTH = 200
// Drift range widened 10-30 -> 90-110, 2026-09-12 (direct ask: "the
// airdrop should land randomally 100 blocks away in any direction" - the
// "any direction" half was already true, `/setairdrop random` already
// free-drifts in a random direction from the target player, see this
// file's own header). Centered on 100 with a real +/-10 spread so it's
// still "random," not a laser-precise 100.00 every time. Real tradeoff
// accepted, not glossed over: the old 10-30 range was deliberately kept
// modest specifically so a drop couldn't realistically land outside the
// live world border even at wave 5 (the earliest trigger, smallest
// border) - 100 blocks routinely will, at least for the first several
// airdrop waves before base_expansion.js's growth catches up. That's
// fine for the CRATE itself (a plain `/setblock`, unaffected by border
// collision) and for the PLAYER retrieving it (world border only clips
// non-player entities in vanilla; player movement isn't blocked by it,
// and border damage is already disabled pack-wide) - just a real,
// accepted change from "always inside the safe zone" to "sometimes a
// short walk past it," not a silent one.
// 90-110 from a random player -> 50-70 from the pedestal, 2026-09-22 (see
// header item 3). The old drift constants are gone with `/setairdrop
// random`; the border reasoning above still holds a fortiori at this range.
var WAVE_AIRDROP_DISTANCE_MIN = 50
var WAVE_AIRDROP_DISTANCE_MAX = 70
var WAVE_AIRDROP_APPROACH_ARC_DEG = 75 // landing direction: within +/- this of due east from the pedestal
var WAVE_AIRDROP_LANDED_NOTE_TICKS = 20 * 20 // action-bar "crate down at X, Z" line after touchdown
var WAVE_AIRDROP_BEACON_BLOCK = 'minecraft:beacon'

// 12s after the wave clears - the wave-clear subtitle (100-tick title
// lifecycle) is off-screen by then. Used to also wait out the wave-5
// "THE NIGHTS GROW LONGER" follow-up title too - removed 2026-09-16 (see
// wave_status.js's FIXED_WAVE_EVENTS) - but 240 is kept as-is, the
// wave-clear subtitle alone already justifies it.
var WAVE_AIRDROP_DELAY_TICKS = 240
var WAVE_AIRDROP_WATCH_TIMEOUT_TICKS = 1200 // give up watching for a crate after 60s (command failed, chunk issue, etc.)
var WAVE_AIRDROP_POLL_TICKS = 10
var WAVE_AIRDROP_CRATE_ENTITIES = ['dyairdrop:airdrop', 'dyairdrop:smallairdrop', 'dyairdrop:weaponairdrop', 'dyairdrop:medicalairdrop']

// **Looted crate cleanup, 2026-09-10** (direct ask: "is there a way for the
// drop loot crate to go away after its been looted. right now i have to
// break it with a pickaxe"). The mod has no such behaviour of its own -
// decompiled AirdroplargeBlock: its randomTick runs AirdroplargeticksProcedure,
// a slow self-timer (thresholds of 80/3000/20000 on a random-tick-driven
// counter) that has nothing to do with the contents. So this file watches
// the crate the player actually opened: `BlockEvents.rightClicked` on the
// crate block records its position on the shared world state, and the
// 10-tick poll below reads the block entity's saved NBT - a
// RandomizableContainerBlockEntity keeps a `LootTable` key until the first
// open unpacks it, then saves an `Items` list - and removes the block the
// first time that list is empty AFTER the loot was unpacked. Reading saved
// NBT (block.getEntityData) rather than the item-handler capability is
// deliberate: touching the capability would call getItem() and unpack the
// loot table early, with no player. One crate is watched at a time (the
// last one opened); a crate never opened is never touched. The Xaero
// waypoint the mod added on landing is client-side and stays - delete it
// from the map if it bothers you.
var WAVE_AIRDROP_CRATE_WATCH_TIMEOUT_TICKS = 20 * 60 * 30 // stop watching an opened-but-unfinished crate after 30 min

// **Persistent "look up" reminder, 2026-09-16** - direct follow-up feedback:
// "didnt see the plane fly overhead," the exact same complaint the LOOK UP
// title + note block bell (2026-09-10, see this file's own header above)
// were built to fix. That title only shows for vanilla's own ~5s (100-tick)
// fade-in/stay/fade-out lifecycle - a single flash a player mid-fight or
// looking at their inventory the instant it fires can easily miss, with
// nothing left on screen a few seconds later to say a plane is still out
// there. Real fix: a standing action-bar line for the whole time a drop is
// actually being watched (td_airdropWatch - covers both the plane's flight
// and the crate's fall, the same window this file already tracks for its
// own timeout logic), not a one-shot popup.
//
// Deliberately NOT just a raw `player.setStatusMessage(...)` call from this
// file's own tick handler below - the action bar is a single shared line,
// and two different scripts refreshing it on two different poll cadences
// (this file's 10-tick airdrop poll vs. wave_spawner.js's 20-tick countdown
// display / wave_status.js's 4-tick hostile counter) would just flicker
// between them. Same problem pedestal_health.js's own
// pedestalAlertActionbarText already solved for the pedestal-under-attack
// alert - this follows that exact shared-function convention (top-level
// FUNCTIONS reliably share scope across server_scripts in this build, see
// that function's own header) instead of a second competing writer:
// wave_spawner.js's countdown line and wave_status.js's hostile-count line
// both check this alongside their own pedestalAlert now, in the same
// pedestalAlert-wins-first order, so whichever is actually relevant at a
// given moment shows without the two fighting over the line.
function airdropInboundActionbarText(data, now) {
  if (data.getBoolean('td_airdropWatch')) return '§b✈ §fSupply plane coming in from the west - look up!'
  if (data.contains('td_airdropLandedUntilTick') && now < data.getInt('td_airdropLandedUntilTick')) {
    return `§6Supply crate down at ${data.getInt('td_airdropCrateX')}, ${data.getInt('td_airdropCrateZ')} §f- follow the light beam`
  }
  return null
}

// Called from wave_status.js's own wave-clear branch, right alongside the
// pedestal heal - matches that file's own established cross-file call
// pattern into pedestal_health.js's healPedestalByPercent (shared top-
// level FUNCTIONS are the proven-reliable cross-file idiom in this
// codebase; shared top-level var/const are not, see bounty_kills.js's own
// real HOSTILE_TYPES collision writeup for why that distinction matters).
// Only schedules now - see the header for why the launch itself is
// deferred to the tick handler below.
function maybeTriggerWaveAirdrop(player, data, waveNumber) {
  if (waveNumber % WAVE_AIRDROP_INTERVAL !== 0) return
  data.putInt('td_airdropDueTick', player.getLevel().getTime() + WAVE_AIRDROP_DELAY_TICKS)
  data.putBoolean('td_airdropPending', true)
}

function launchWaveAirdrop(server, data, now) {
  // Landing spot: 50-70 blocks from the pedestal inside an eastern arc, so
  // the plane (always spawned WAVE_AIRDROP_LENGTH blocks west of its target,
  // flying east) crosses the base before it drops - header item 3. Math.PI
  // is undefined in this Rhino build (mob_aggro.js's confirmed finding),
  // hence the literal.
  var px = data.getInt('td_pedestalX')
  var py = data.getInt('td_pedestalY')
  var pz = data.getInt('td_pedestalZ')
  var distance = WAVE_AIRDROP_DISTANCE_MIN + Math.random() * (WAVE_AIRDROP_DISTANCE_MAX - WAVE_AIRDROP_DISTANCE_MIN)
  var angle = (Math.random() * 2 - 1) * WAVE_AIRDROP_APPROACH_ARC_DEG * (3.141592653589793 / 180)
  var tx = Math.round(px + Math.cos(angle) * distance)
  var tz = Math.round(pz + Math.sin(angle) * distance)
  var height = py + WAVE_AIRDROP_HEIGHT_ABOVE_PEDESTAL
  // Logged so a "never saw the drop" report can be checked against where it
  // actually went (the mod's own coordinates chat line was on the `random`
  // path only).
  console.log(`wave_airdrop.js: supply plane launched toward (${tx}, ${tz}) at Y ${height}, spawning ${WAVE_AIRDROP_LENGTH} blocks west of it`)
  server.runCommandSilent(
    `setairdrop free ${tx} ${tz} ${height} ${WAVE_AIRDROP_LENGTH} "${WAVE_AIRDROP_BLOCK_ID}" "${WAVE_AIRDROP_LOOT_TABLE}" false`
  )
  server.runCommandSilent(`title @a title {"text":"LOOK UP","color":"gold","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"Supply plane coming in from the west - watch it cross the base.","color":"yellow"}`)
  // Played at each player's own position (no distance falloff) - the
  // plane's own engine sound plays at the plane, which may start well
  // outside earshot depending on where it spawns.
  server.runCommandSilent('execute as @a at @s run playsound minecraft:block.note_block.bell master @s ~ ~ ~ 1 1.2')
  data.putBoolean('td_airdropWatch', true)
  data.putBoolean('td_airdropCrateSeen', false)
  data.putInt('td_airdropWatchUntilTick', now + WAVE_AIRDROP_WATCH_TIMEOUT_TICKS)
}

function findAirdropCrate(level) {
  return level.getEntities().find((e) => WAVE_AIRDROP_CRATE_ENTITIES.includes(`${e.type}`))
}

// Scans a bounded column (see header) for the real landed crate block,
// starting a little above the falling entity's last-seen Y since that
// poll sample is always slightly before touchdown, not after.
function findLandedCrateY(level, x, z, fromY) {
  for (var y = fromY + 4; y >= fromY - 40; y--) {
    if (`${level.getBlock(x, y, z).getId()}` === WAVE_AIRDROP_BLOCK_ID) return y
  }
  return null
}

// Real beacon beam + Xaero share line, 2026-09-22 - header items 1 and 2.
// Beacon removal is keyed to the crate it stands on (crate coords given)
// so a switch of pollAirdropCrateCleanup's single watch to some OTHER,
// older crate (the player right-clicking it) cannot strip the fresh drop's
// beam; called without crate coords (a new landing) it clears whatever
// beacon is tracked.
function removeAirdropBeacon(server, data, crateX, crateY, crateZ) {
  if (!data.getBoolean('td_airdropBeaconActive')) return
  var bx = data.getInt('td_airdropBeaconX')
  var by = data.getInt('td_airdropBeaconY')
  var bz = data.getInt('td_airdropBeaconZ')
  if (crateX !== undefined && (bx !== crateX || by !== crateY + 1 || bz !== crateZ)) return
  data.putBoolean('td_airdropBeaconActive', false)
  server.runCommandSilent(`execute if block ${bx} ${by} ${bz} ${WAVE_AIRDROP_BEACON_BLOCK} run setblock ${bx} ${by} ${bz} minecraft:air`)
}

function placeAirdropBeacon(server, level, data, x, y, z) {
  removeAirdropBeacon(server, data)
  if (!level.getBlock(x, y + 1, z).getBlockState().isAir()) return
  server.runCommandSilent(`setblock ${x} ${y + 1} ${z} ${WAVE_AIRDROP_BEACON_BLOCK}`)
  data.putInt('td_airdropBeaconX', x)
  data.putInt('td_airdropBeaconY', y + 1)
  data.putInt('td_airdropBeaconZ', z)
  data.putBoolean('td_airdropBeaconActive', true)
}

// Xaero's Minimap share protocol (header item 1): `<sender>` is what the
// client shows as who shared it, colour 6 = gold, no rotation, yaw 0.
function sendAirdropWaypoint(server, x, y, z) {
  server.runCommandSilent(`tellraw @a {"text":"<Supply Drop> xaero-waypoint:Supply Crate:S:${x}:${y}:${z}:6:false:0"}`)
}

BlockEvents.broken(WAVE_AIRDROP_BEACON_BLOCK, (event) => {
  var block = event.block
  var data = worldData(block.getLevel())
  if (!data || !data.getBoolean('td_airdropBeaconActive')) return
  if (block.getX() !== data.getInt('td_airdropBeaconX') || block.getY() !== data.getInt('td_airdropBeaconY') || block.getZ() !== data.getInt('td_airdropBeaconZ')) return
  event.cancel()
})

function fireAirdropLandingBurst(server, x, y, z) {
  server.runCommandSilent(
    `particle minecraft:end_rod ${x + 0.5} ${y + 1} ${z + 0.5} 0.25 20 0.25 0.02 120 force`
  )
  server.runCommandSilent(`particle minecraft:flash ${x + 0.5} ${y + 1} ${z + 0.5} 0 0 0 0 1 force`)
}

BlockEvents.rightClicked(WAVE_AIRDROP_BLOCK_ID, (event) => {
  var block = event.block
  var level = event.entity.getLevel()
  var data = worldData(level)
  if (!data) return
  data.putInt('td_airdropCrateX', block.getX())
  data.putInt('td_airdropCrateY', block.getY())
  data.putInt('td_airdropCrateZ', block.getZ())
  data.putInt('td_airdropCrateWatchUntilTick', level.getTime() + WAVE_AIRDROP_CRATE_WATCH_TIMEOUT_TICKS)
  data.putBoolean('td_airdropCrateWatch', true)
})

// true only once the loot has been unpacked (no LootTable key left) AND
// every slot is empty. Any read failure counts as "not looted" - the crate
// stays, exactly as it does today.
function airdropCrateLooted(block) {
  try {
    var nbt = block.getEntityData()
    if (!nbt) return false
    if (nbt.contains('LootTable')) return false
    if (!nbt.contains('Items')) return true
    return nbt.getList('Items', 10).isEmpty()
  } catch (e) {
    console.log('wave_airdrop.js: crate NBT read failed: ' + e)
    return false
  }
}

function pollAirdropCrateCleanup(server, level, data, now) {
  if (!data.getBoolean('td_airdropCrateWatch')) return
  var x = data.getInt('td_airdropCrateX')
  var y = data.getInt('td_airdropCrateY')
  var z = data.getInt('td_airdropCrateZ')
  if (now >= data.getInt('td_airdropCrateWatchUntilTick')) {
    data.putBoolean('td_airdropCrateWatch', false)
    removeAirdropBeacon(server, data, x, y, z)
    return
  }
  var block = level.getBlock(x, y, z)
  if (`${block.getId()}` !== WAVE_AIRDROP_BLOCK_ID) {
    data.putBoolean('td_airdropCrateWatch', false) // already gone (broken by hand, or replaced)
    removeAirdropBeacon(server, data, x, y, z)
    return
  }
  if (!airdropCrateLooted(block)) return
  data.putBoolean('td_airdropCrateWatch', false)
  removeAirdropBeacon(server, data, x, y, z)
  server.runCommandSilent(`setblock ${x} ${y} ${z} minecraft:air`)
  server.runCommandSilent(`particle minecraft:poof ${x + 0.5} ${y + 0.5} ${z + 0.5} 0.4 0.4 0.4 0.02 25`)
  server.runCommandSilent(`playsound minecraft:block.wool.break block @a ${x} ${y} ${z} 1 0.8`)
}

PlayerEvents.tick((event) => {
  var player = event.player
  var level = player.getLevel()
  var now = level.getTime()
  if (now % WAVE_AIRDROP_POLL_TICKS !== 0) return
  var data = worldData(level)
  if (!data) return

  // Independent of the launch/landing state machine below - an opened crate
  // can be sitting there while the next drop is already in flight.
  pollAirdropCrateCleanup(player.getServer(), level, data, now)

  if (data.getBoolean('td_airdropPending')) {
    if (now < data.getInt('td_airdropDueTick')) return
    data.putBoolean('td_airdropPending', false)
    launchWaveAirdrop(player.getServer(), data, now)
    return
  }

  if (!data.getBoolean('td_airdropWatch')) return
  if (now >= data.getInt('td_airdropWatchUntilTick')) {
    data.putBoolean('td_airdropWatch', false)
    return
  }

  var crate = findAirdropCrate(level)
  if (crate) {
    if (!data.getBoolean('td_airdropCrateSeen')) data.putBoolean('td_airdropCrateSeen', true)
    // Last-known in-flight position - see this file's header. Only
    // needed to locate the block the instant landing is detected below.
    data.putInt('td_airdropFlightX', Math.round(crate.getX()))
    data.putInt('td_airdropFlightY', Math.round(crate.getY()))
    data.putInt('td_airdropFlightZ', Math.round(crate.getZ()))
    return
  }
  if (!data.getBoolean('td_airdropCrateSeen')) return // plane still on its way in

  // Crate entity seen earlier and gone now: it landed and the mod has
  // already swapped it for the crate block (its own map waypoint never
  // worked - header item 1; the share line below is the real one).
  data.putBoolean('td_airdropWatch', false)
  var server = player.getServer()
  server.runCommandSilent('execute as @a at @s run playsound minecraft:entity.player.levelup master @s ~ ~ ~ 0.6 1.4')

  // Seed the crate watch + beacon - see this file's header for why this
  // reuses pollAirdropCrateCleanup's own td_airdropCrateWatch state instead
  // of a second tracker. If the block can't be found in the scanned column
  // there's no beacon and no early auto-cleanup watch (the player's own
  // right-click still seeds that as a fallback), but the waypoint line and
  // the coordinates still go out - the plane's drop point is exact in x/z.
  var lx = data.getInt('td_airdropFlightX')
  var lz = data.getInt('td_airdropFlightZ')
  var ly = findLandedCrateY(level, lx, lz, data.getInt('td_airdropFlightY'))
  if (ly === null) {
    sendAirdropWaypoint(server, lx, data.getInt('td_airdropFlightY'), lz)
    server.runCommandSilent(`title @a title {"text":"","color":"gold"}`)
    server.runCommandSilent(`title @a subtitle {"text":"Supply crate down near ${lx}, ${lz}.","color":"gold","bold":true}`)
    server.runCommandSilent(`tellraw @a {"text":"Supply crate down near ${lx}, ${lz}. Click Add on the line above to put it on your map.","color":"gold"}`)
    return
  }
  data.putInt('td_airdropCrateX', lx)
  data.putInt('td_airdropCrateY', ly)
  data.putInt('td_airdropCrateZ', lz)
  data.putInt('td_airdropCrateWatchUntilTick', now + WAVE_AIRDROP_CRATE_WATCH_TIMEOUT_TICKS)
  data.putBoolean('td_airdropCrateWatch', true)
  data.putInt('td_airdropLandedUntilTick', now + WAVE_AIRDROP_LANDED_NOTE_TICKS)
  fireAirdropLandingBurst(server, lx, ly, lz)
  placeAirdropBeacon(server, level, data, lx, ly, lz)
  sendAirdropWaypoint(server, lx, ly, lz)
  server.runCommandSilent(`title @a title {"text":"","color":"gold"}`)
  server.runCommandSilent(`title @a subtitle {"text":"Supply crate down at ${lx}, ${lz} - follow the light beam.","color":"gold","bold":true}`)
  server.runCommandSilent(`tellraw @a {"text":"Supply crate down at ${lx}, ${lz}. Click Add on the line above to put it on your map.","color":"gold"}`)
})

// Old wave-8+ speed-clear countdown display removed entirely (2026-09-08) -
// dead code once there's no time window to count down. The new trigger is
// an unconditional cadence check at wave-clear time, nothing to display
// while a wave is still being fought.
