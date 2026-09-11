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

var WAVE_AIRDROP_INTERVAL = 5
var WAVE_AIRDROP_BLOCK_ID = 'dyairdrop:airdroplarge'
var WAVE_AIRDROP_LOOT_TABLE = 'kubejs:chests/wave_airdrop'
var WAVE_AIRDROP_HEIGHT = 100
var WAVE_AIRDROP_LENGTH = 60
var WAVE_AIRDROP_DRIFT_MIN = 10
var WAVE_AIRDROP_DRIFT_MAX = 30

// 12s after the wave clears - the wave-clear subtitle (100-tick title
// lifecycle) and, at wave 5, the queued "THE NIGHTS GROW LONGER" title
// (fires at +100 ticks, runs to +200) are both off-screen by then.
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
  server.runCommandSilent(
    `setairdrop random @r ${WAVE_AIRDROP_HEIGHT} ${WAVE_AIRDROP_LENGTH} ${WAVE_AIRDROP_DRIFT_MIN} ${WAVE_AIRDROP_DRIFT_MAX} "${WAVE_AIRDROP_BLOCK_ID}" "${WAVE_AIRDROP_LOOT_TABLE}" false true`
  )
  server.runCommandSilent(`title @a title {"text":"LOOK UP","color":"gold","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"Supply plane inbound - watch the sky for the drop.","color":"yellow"}`)
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
  if (now >= data.getInt('td_airdropCrateWatchUntilTick')) {
    data.putBoolean('td_airdropCrateWatch', false)
    return
  }
  var x = data.getInt('td_airdropCrateX')
  var y = data.getInt('td_airdropCrateY')
  var z = data.getInt('td_airdropCrateZ')
  var block = level.getBlock(x, y, z)
  if (`${block.getId()}` !== WAVE_AIRDROP_BLOCK_ID) {
    data.putBoolean('td_airdropCrateWatch', false) // already gone (broken by hand, or replaced)
    return
  }
  if (!airdropCrateLooted(block)) return
  data.putBoolean('td_airdropCrateWatch', false)
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
    return
  }
  if (!data.getBoolean('td_airdropCrateSeen')) return // plane still on its way in

  // Crate entity seen earlier and gone now: it landed and the mod has
  // already swapped it for the crate block + the Xaero waypoint.
  data.putBoolean('td_airdropWatch', false)
  var server = player.getServer()
  server.runCommandSilent(`title @a title {"text":"","color":"gold"}`)
  server.runCommandSilent(`title @a subtitle {"text":"Supply crate down - it's marked on your map.","color":"gold","bold":true}`)
  server.runCommandSilent('execute as @a at @s run playsound minecraft:entity.player.levelup master @s ~ ~ ~ 0.6 1.4')
})

// Old wave-8+ speed-clear countdown display removed entirely (2026-09-08) -
// dead code once there's no time window to count down. The new trigger is
// an unconditional cadence check at wave-clear time, nothing to display
// while a wave is still being fought.
