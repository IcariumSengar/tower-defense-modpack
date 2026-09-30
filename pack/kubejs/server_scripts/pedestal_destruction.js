// Game over when the pedestal is destroyed. Once a second this checks that
// the pedestal block is still at the stored position (td_pedestalX/Y/Z, set
// by playtest_starter_kit.js), so any removal counts: explosion, mining,
// fire, pistons. The pedestal is at stake whether or not the amulet is on it.
// pedestal_health.js ends the run the same way, through
// triggerPedestalDestroyed(), when the pedestal's HP runs out.

// Ends the run. Called by the check below and by pedestal_health.js at 0 HP.
// It doesn't check td_pedestalDestroyed itself; both callers do, so it runs
// once. `player` is whoever's tick noticed the loss: the titles and sound
// reach every player, the chat lines only `player`.
function triggerPedestalDestroyed(player) {
  var data = worldData(player.getLevel())
  if (!data) return
  data.putBoolean('td_pedestalDestroyed', true)

  var server = player.getServer()

  // However the block went, the HP pool and its bar go with it. The bar is
  // saved with the world and would otherwise stay on screen for good.
  data.putInt('td_pedestalHealth', 0)
  server.runCommandSilent(`bossbar remove ${PEDESTAL_BOSSBAR_ID}`)

  // End the wave and undo wave_spawner.js's night lock, as a wave clear does.
  if (data.getBoolean('td_inWave')) {
    data.putBoolean('td_inWave', false)
    server.runCommandSilent('time set day')
    server.runCommandSilent('gamerule doDaylightCycle true')
  }
  // Drop the spawns the wave still had queued, and stop any countdown to the
  // next wave.
  tdCancelOutstandingSpawns(data)
  data.putBoolean('td_countdownActive', false)

  // One popup: GAME OVER, with the reason as subtitle, as in hardcore_death.js.
  server.runCommandSilent('title @a title {"text":"GAME OVER","color":"red","bold":true}')
  server.runCommandSilent('title @a subtitle {"text":"The pedestal has fallen. Everything it was holding back is loose.","color":"red"}')
  // Played at each player: the server's command source sits at world spawn, so
  // a plain ~ ~ ~ sound would only be heard within 16 blocks of spawn.
  server.runCommandSilent('execute as @a at @s run playsound minecraft:entity.wither.death master @s ~ ~ ~ 1 0.6 1')
  player.tell('§c§lGame over - the pedestal has fallen.')
  player.tell('§7Whatever it was keeping in check has nothing left to answer to.')

  // A second popup with what to do next. queueDelayedTitle() (wave_status.js)
  // shows it after GAME OVER; two /title calls in one tick replace each other.
  // With an empty title, the line shows alone as a subtitle.
  queueDelayedTitle(player, '', 'Start a new world to try again.', 'red')

  // td_pedestalDestroyed is never cleared. The world stays playable, but the
  // Wave Horn (useWaveHorn in wave_spawner.js) won't start another wave, and
  // wave_status.js, boss_wave.js and base_expansion.js stand down.
}

PlayerEvents.tick((event) => {
  var player = event.entity
  var level = player.getLevel()
  var data = worldData(level)
  if (!data) return

  // Nothing to do once triggered, after a hardcore game over (whose own GAME
  // OVER has already played), or before playtest_starter_kit.js has built the
  // base and set td_pedestalX.
  if (data.getBoolean('td_pedestalDestroyed') || data.getBoolean('td_hardcoreGameOver')) return
  if (!data.contains('td_pedestalX')) return

  if (level.getTime() % 20 !== 0) return // once a second

  var x = data.getInt('td_pedestalX')
  var y = data.getInt('td_pedestalY')
  var z = data.getInt('td_pedestalZ')
  var block = level.getBlock(x, y, z)
  if (`${block.id}` === 'supplementaries:pedestal') return

  triggerPedestalDestroyed(player)
})
