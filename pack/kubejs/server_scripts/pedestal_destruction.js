// Pedestal destruction = game over (2026-09-03, direct request: "if the
// pedestal is destroyed you lose"). Player death is explicitly kept a
// non-event for now ("easier for playtesting") - this is a narrower,
// always-on pickup of just one piece of the parked Hardcore mode spec
// (docs/FEATURES.md) - no totem softening, no toggle, no player-death
// tie-in, all of that stays parked untouched.
//
// Detects destruction via a periodic tick check against the pedestal's
// stored coordinate (playtest_starter_kit.js sets td_pedestalX/Y/Z once
// at world-build time, independent of whether the amulet is ever placed
// on it) rather than hooking specific destroy-event types - same
// dominant "poll world/persistentData state from a tick handler"
// pattern already used throughout this pack (wave_status.js,
// mob_aggro.js, amulet_pedestal.js's own bob effect). Catches
// explosion, mining, fire, a piston push, anything that removes the
// block - no need to enumerate every possible cause.
//
// Real threat already exists today, confirmed installed: Epic Siege
// Mod's demolitionMobs config already gives zombies live TNT by
// default (see docs/MODS.md's chokepoint-walls entry) - this doesn't
// need the still-parked Demolition Zombie spec to matter.
//
// Real open question resolved, not assumed: does mobGriefing/the
// pedestal's own blast resistance actually let an explosion destroy
// it? Checked directly - mobGriefing is never referenced anywhere in
// this pack (grepped pack/), so it stays at vanilla's own default,
// true. The original custom block's own definition
// (startup_scripts/amulet.js) sets .resistance(6.0), the same real
// blast resistance as plain vanilla stone - well within TNT's real
// destructive range, not explosion-proof like SecurityCraft's
// reinforced blocks. Confirmed live in a sandbox test (not just
// reasoned from the numbers): a real TNT explosion next to a placed
// amulet_pedestal block destroyed it. Supplementaries' own pedestal
// (2026-09-05's real block) hasn't had its own resistance value
// independently re-verified - a real gap, not assumed identical, but
// this detection logic doesn't depend on the exact number either way:
// it just checks the block is gone, whatever destroyed it.

// Shared game-over sequence (2026-09-06, factored out so
// pedestal_health.js's own HP-hitting-0 path can trigger the exact same
// outcome as this file's own block-gone detection, per the dispatch:
// "call the exact same destruction path... one outcome, two ways to
// reach it"). Top-level function declarations share scope across
// server_scripts files in this exact KubeJS/Rhino build - confirmed
// directly in a sandbox before relying on it here (see
// feedback_rhino_java_reflection_quirks.md for the same-session finding
// that top-level names collide/share scope, not just an assumption).
// Idempotent-safe to call twice (guarded by td_pedestalDestroyed at
// each caller), but only ever actually called once in practice.
function triggerPedestalDestroyed(player) {
  // Real multiplayer fix, 2026-09-08 (see world_state.js) - the
  // game-over flag, in-wave flag and countdown are all shared campaign
  // state, not player.persistentData. Guarded null-check even though
  // this should be unreachable with a null world state in practice
  // (both real callers - this file's own tick handler and
  // pedestal_health.js's HP-hitting-0 path - already require
  // td_pedestalX/td_pedestalHealth to exist before calling this).
  var data = worldData(player.getLevel())
  if (!data) return
  data.putBoolean('td_pedestalDestroyed', true)

  var server = player.getServer()

  // Undo the night-lock if a wave was active when this happened - same
  // "defeated" cleanup wave_status.js already does on a real wave clear,
  // run here too since a destroyed pedestal ends the run regardless of
  // whether a wave happens to be in progress.
  if (data.getBoolean('td_inWave')) {
    data.putBoolean('td_inWave', false)
    server.runCommandSilent('time set day')
    server.runCommandSilent('gamerule doDaylightCycle true')
  }
  // Also cancels any in-progress countdown to the next wave - nothing
  // left to count down to.
  data.putBoolean('td_countdownActive', false)

  // Same "big on-screen title, chat is easy to miss mid-fight" pattern
  // as every other major beat in this pack (wave-cleared, gear removal,
  // wave-incoming) - matching tone against those, not inventing a new
  // voice.
  server.runCommandSilent('title @a title {"text":"THE PEDESTAL HAS FALLEN","color":"red","bold":true}')
  server.runCommandSilent('title @a subtitle {"text":"Everything it was holding back is gone with it.","color":"gray"}')
  player.tell('§c§lThe pedestal has fallen.')
  player.tell('§7Whatever it was keeping in check has nothing left to answer to.')

  // Real gap, direct playtest report 2026-09-09: "im not seeing a way to
  // restart the game when the pedestal is destroyed. I want a pop up
  // telling me game over and that I can restart." The world stays fully
  // playable after a loss (see the comment at the bottom of this
  // function) - there was never a mechanical block, just nothing telling
  // the player the run is actually over and what to do next. Queued as a
  // SECOND title via wave_status.js's own queueDelayedTitle (top-level
  // function, shared across server_scripts files in this Rhino build -
  // see feedback_rhino_java_reflection_quirks) rather than a second
  // immediate `title` call right after the one above - back-to-back
  // `/title` calls in the same tick overwrite each other before the
  // first is even readable, the exact bug that queue was built to fix
  // for the wave-5/pacing announcements; reusing it here instead of
  // re-inventing the same fix a third time.
  queueDelayedTitle(player, 'GAME OVER', 'Start a new world to try again - quest book progress carries over automatically.', 'red')
  hqcExportProgress(player)
  tellQuestCarryoverTip(player)

  // World stays fully playable after the loss - this only blocks the
  // Wave Horn (checked at useWaveHorn()'s own top, wave_spawner.js),
  // nothing else about the world changes or locks.
}

PlayerEvents.tick((event) => {
  var player = event.entity
  var level = player.getLevel()
  // Real multiplayer fix, 2026-09-08 (see world_state.js) - shared
  // pedestal state, not player.persistentData.
  var data = worldData(level)
  if (!data) return

  // Already triggered, or the base hasn't finished building yet this
  // login (td_pedestalX is only set once playtest_starter_kit.js's
  // build finishes) - either way, nothing to check.
  if (data.getBoolean('td_pedestalDestroyed')) return
  if (!data.contains('td_pedestalX')) return

  // Once/second is plenty for a destruction check - this isn't a
  // display that needs to feel instant, just needs to catch it
  // eventually. Same throttle rate as wave_status.js's own hostile
  // counter's own reasoning (a HUD-adjacent check, not a hot loop).
  if (level.getTime() % 20 !== 0) return

  var x = data.getInt('td_pedestalX')
  var y = data.getInt('td_pedestalY')
  var z = data.getInt('td_pedestalZ')
  var block = level.getBlock(x, y, z)
  // Accepts either real pedestal block - `supplementaries:pedestal` is
  // what every new world places (2026-09-05), but `kubejs:amulet_pedestal`
  // is still a real, currently-placed block on any save from before
  // that swap (its registration was deliberately kept, see
  // startup_scripts/amulet.js). Checking only the new id would read an
  // untouched old pedestal as destroyed the moment this script deployed
  // - a real false game-over this pack came within one save-diff of
  // shipping.
  var blockId = `${block.id}`
  if (blockId === 'supplementaries:pedestal' || blockId === 'kubejs:amulet_pedestal') return

  triggerPedestalDestroyed(player)
})
