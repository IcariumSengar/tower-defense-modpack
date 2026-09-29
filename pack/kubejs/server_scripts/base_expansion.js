// Grows the world border each time a wave is cleared. A clear is the true ->
// false edge of td_inWave, which wave_status.js sets.
//
// PlayerEvents.tick runs once per online player, but the edge fires once per
// clear: td_wasInWaveForExpansion is shared (worldData() in world_state.js),
// and the first player's handler updates it before the next one reads it.

var EXPANSION_TIME_SECONDS = 10

// Blocks added to the border's width, so each edge moves out by half that: 5
// for waves 1-3, 10 for waves 4-6, 15 for 7-9, and so on.
function expansionForWave(waveNumber) {
  return 5 + 5 * Math.floor((waveNumber - 1) / 3)
}

PlayerEvents.tick(function (event) {
  var player = event.entity
  var data = worldData(player.getLevel())
  if (!data) return

  var wasInWave = data.getBoolean('td_wasInWaveForExpansion')
  var isInWave = data.getBoolean('td_inWave')

  data.putBoolean('td_wasInWaveForExpansion', isInWave)

  if (!wasInWave || isInWave) return
  // Losing the pedestal and a hardcore game over also end the wave, but neither
  // is a clear.
  if (data.getBoolean('td_pedestalDestroyed') || data.getBoolean('td_hardcoreGameOver')) return

  // wave_spawner.js increments td_waveNumber when a wave starts, so this is the
  // wave that just cleared.
  var waveNumber = data.getInt('td_waveNumber')
  var expansionBlocks = expansionForWave(waveNumber)

  player.getServer().runCommandSilent(`worldborder add ${expansionBlocks} ${EXPANSION_TIME_SECONDS}`)
  // A toast, and only for the player whose handler caught the clear.
  player.notify(`§6Base Expansion §f- the border grows by ${expansionBlocks} blocks.`)
})
