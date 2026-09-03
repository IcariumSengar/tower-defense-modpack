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
// it? Checked both directly - mobGriefing is never referenced anywhere
// in this pack (grepped pack/), so it stays at vanilla's own default,
// true. The pedestal's own block definition (startup_scripts/amulet.js)
// sets .resistance(6.0), the same real blast resistance as plain
// vanilla stone - well within TNT's real destructive range, not
// explosion-proof like SecurityCraft's reinforced blocks. Confirmed
// live in a sandbox test (not just reasoned from the numbers): a real
// TNT explosion next to a placed amulet_pedestal block destroyed it.

PlayerEvents.tick((event) => {
  var player = event.entity
  var data = player.persistentData

  // Already triggered, or the base hasn't finished building yet this
  // login (td_pedestalX is only set once playtest_starter_kit.js's
  // build finishes) - either way, nothing to check.
  if (data.getBoolean('td_pedestalDestroyed')) return
  if (!data.contains('td_pedestalX')) return

  var level = player.getLevel()
  // Once/second is plenty for a destruction check - this isn't a
  // display that needs to feel instant, just needs to catch it
  // eventually. Same throttle rate as wave_status.js's own hostile
  // counter's own reasoning (a HUD-adjacent check, not a hot loop).
  if (level.getTime() % 20 !== 0) return

  var x = data.getInt('td_pedestalX')
  var y = data.getInt('td_pedestalY')
  var z = data.getInt('td_pedestalZ')
  var block = level.getBlock(x, y, z)
  if (`${block.id}` === 'kubejs:amulet_pedestal') return

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

  // World stays fully playable after the loss - this only blocks the
  // Wave Horn (checked at useWaveHorn()'s own top, wave_spawner.js),
  // nothing else about the world changes or locks.
})
