// Tesla Coil auto-power (2026-09-15, direct ask: "i have a redstone block
// under the tesla coil and its always fireing. if i only want it to attck
// if enememies are near do i juts need a lever to turn it on?").
//
// Real answer, established before writing this: no. Immersive Engineering's
// own `TeslaCoilBlockEntity.tickServer()` has zero target-selection logic -
// it picks ONE RANDOM LivingEntity within 6 blocks unconditionally the
// instant it's redstone-powered + FE-charged (real bytecode:
// `RANDOM.nextInt(list.size())` over every LivingEntity in a padded 6-block
// AABB, not the nearest one - corrected 2026-09-15 after re-reading the
// same decompile more carefully; tesla_coil_cinematics.js's own header
// already had this right, this file and a couple of others didn't). A
// lever only changes WHO decides when it's powered - it doesn't add enemy
// detection, so it'd still zap a random living thing (mob, villager,
// player) the moment it's flipped on.
//
// This script is the real fix: replaces the permanent redstone_block
// placeStarterTraps() used to put directly under the starter coil (removed
// in this same change) with a throttled proximity check, swapping
// redstone_block/air in under the coil based on real enemy presence. Only
// mobs tagged `td_wave_mob` count - never matched by entity type, same
// reasoning as every other trap/aggro system in this pack (trap_durability.js,
// mob_aggro.js's target-selector fix, etc): structure-spawner mobs share
// entity types with wave mobs but must never interact with base defenses.
//
// Scoped to the one Tesla Coil this pack actually tracks a position for -
// td_starterTeslaCoilX/Y/Z on the shared world marker (world_state.js's
// worldData()), set by playtest_starter_kit.js. A player-built coil
// elsewhere wires its own power source and is untouched by this.
//
// Toggle position moved from directly BELOW the coil to directly ABOVE
// it, 2026-09-15, alongside the coil's own move onto the wall (mirroring
// the Sentry - see placeStarterTraps()'s header comment): the block
// below used to be harmless open ground, but it's now the wall's own
// load-bearing top course, and swapping it to air every time the coil
// loses power would punch a real hole in the wall. IE's own
// `isRSPowered()` checks all 6 neighbors, not specifically the block
// below, so the direction was never functionally required - only ever
// chosen for being invisible underground at the old ground-level spot.
//
// Moved again, same day: the coil itself stood upright (facing=up
// instead of facing=west - see placeStarterTraps()'s header comment for
// the full decompile writeup), which puts its multiblock slave half
// directly above the master - exactly where this toggle used to live.
// Direct follow-up ask in the same message: "instead of the redstone
// block on top of the tesla coil can you make it a lever on the side."
// Moved to the master's west face instead (the old dummy's spot, now
// free) as a permanent `minecraft:lever` placed once by
// placeStarterTraps(); this script only ever flips its `powered` state
// from here on, never swaps the block itself in and out like the old
// redstone_block/air toggle did.
//
// **Superseded 2026-09-22 - the player/Sentry exclusion below is now done
// at the source, in the mod's own bytecode.** Third report in a row ("the
// tesla coil is still zapping me ... its still firing and wasting energy"),
// and the real gap was scope: this script only ever manages the ONE starter
// coil, which is gone from wave 5 on - the coil the player builds later
// (their own redstone block under it, per the 2026-09-15 report) was never
// covered by any power cutoff at all, only by the after-the-fact damage/
// stun cancel. The installed IE jar is now
// `ImmersiveEngineering-1.20.1-10.2.0-183-tdcoilfilter.jar` (see
// docs/MODS.md's patched-jar list): TeslaCoilBlockEntity's own target
// predicate (`lambda$tickServer$1`) and its residual-field loop skip
// players and SecurityCraft Sentries outright, so no coil anywhere ever
// picks them, never fires the bolt at them, and never spends the 512 FE
// active-shock cost on them. With that in place the immuneNear cutoff here
// (and its accepted "coil idles whenever a player fights near it" tradeoff)
// is dead weight and was removed; this script is back to its one real job,
// enemy-presence power for the starter coil, on its original 20-tick poll.
// electric_trap_player_safety.js stays as a second line of defense.
//
// (Original 2026-09-15 reasoning kept below for the record.)
// **Player/Sentry exclusion added same day, direct follow-up: "i dont
// want it to appear to zap any players at all."** electric_trap_player_
// safety.js already cancels the damage and strips the Stunned effect
// when the coil DOES pick a player or the Sentry - real gap that fix
// can't close on its own: it reacts after the mod has already committed
// to the zap (no Forge event fires anywhere in target selection, per the
// same decompile - confirmed again while fixing the "nearest" mistake
// above), so the visible bolt/sound still happens even though nothing
// actually lands. Genuinely preventing the coil from ever considering a
// player/Sentry as a candidate would mean patching the mod's own
// target-selection bytecode (real control-flow surgery, not a constant
// swap like the airdrop jar) - out of proportion, and a real risk of
// bricking the whole IE jar if it goes wrong, for what's fundamentally a
// cosmetic flash once damage/stun are already neutralized.
//
// Real, in-proportion alternative: since the coil can only tick its zap
// logic AT ALL while `isRSPowered()` is true, cutting power the instant a
// player or the Sentry gets within range means it never even reaches its
// own random-pick step while they're around - so in practice it can only
// ever zap (visibly, at all) when neither is nearby. Not a mathematical
// guarantee (a player could theoretically cross from just-outside this
// radius to just-inside the coil's own smaller 6-block kill zone within
// one poll interval, e.g. sprinting or flying) - narrowed as far as
// reasonably possible below: same 9-block radius already used for enemy
// detection (a real 3-block margin past the coil's own 6-block zap
// range, not a new number), checked every 5 ticks instead of every 20
// (still cheap - one proximity scan against a handful of nearby
// entities, for the one coil this pack tracks). Real, accepted tradeoff:
// the coil now also goes idle whenever a player is fighting within 9
// blocks of it, which can be a meaningful chunk of an actual wave fight
// at the wall - the same wide radius that makes the exclusion reliable
// also cuts into the coil's own uptime as a real defense mechanism.
var TESLA_AUTO_POWER_INTERVAL = 20 // 5 -> back to 20, 2026-09-22 - the player/Sentry exclusion that needed the tight poll now lives in the patched IE jar

// Wider than the coil's own 6-block zap radius on purpose, for both checks
// below: this only runs every 5 ticks and the coil's own zap cycle is every
// 32 ticks, so a tight radius would mean power often isn't live yet by the
// time a fast mob is actually in kill range - and, symmetrically, the same
// margin is what gives the player/Sentry exclusion below real reaction
// time before anyone reaches the coil's actual kill range. 9 matches the
// coil's own residual-field cube (electric_trap_player_safety.js's
// writeup), not picked arbitrarily.
var TESLA_AUTO_POWER_RADIUS = 9
var TESLA_AUTO_POWER_RADIUS_SQ = TESLA_AUTO_POWER_RADIUS * TESLA_AUTO_POWER_RADIUS

ServerEvents.tick((event) => {
  var level = event.server.getLevel('minecraft:overworld')
  if (!level) return
  if (level.getTime() % TESLA_AUTO_POWER_INTERVAL !== 0) return

  var data = worldData(level)
  if (!data || !data.contains('td_starterTeslaCoilX')) return
  // Coil's already been cleared at STARTER_TRAPS_REMOVAL_WAVE (wave_status.js)
  // - nothing left to power.
  if (data.getBoolean('td_starterTrapsRemoved')) return

  var cx = data.getInt('td_starterTeslaCoilX') + 0.5
  var cy = data.getInt('td_starterTeslaCoilY') + 0.5
  var cz = data.getInt('td_starterTeslaCoilZ') + 0.5

  var entities = level.getEntities()
  var enemyNear = false
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i]
    if (!e.getTags().contains('td_wave_mob')) continue
    var dx = e.getX() - cx
    var dy = e.getY() - cy
    var dz = e.getZ() - cz
    if (dx * dx + dy * dy + dz * dz > TESLA_AUTO_POWER_RADIUS_SQ) continue
    enemyNear = true
    break
  }
  var shouldPower = enemyNear

  var key = 'td_starterTeslaCoilPowered'
  if (data.getBoolean(key) === shouldPower) return // no state change, skip the setblock
  data.putBoolean(key, shouldPower)

  // Lever lives one block west of the master (placeStarterTraps() places
  // it once, attached to the master's own west face) - only `powered`
  // toggles here, `face`/`facing` are re-sent every time since /setblock
  // replaces the whole blockstate.
  event.server.runCommandSilent(
    `setblock ${data.getInt('td_starterTeslaCoilX') - 1} ${data.getInt('td_starterTeslaCoilY')} ${data.getInt('td_starterTeslaCoilZ')} minecraft:lever[face=wall,facing=west,powered=${shouldPower}]`
  )
})
