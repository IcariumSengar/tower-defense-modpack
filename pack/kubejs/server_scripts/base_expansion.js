// Grows the worldborder on every WAVE CLEARED, by an escalating amount —
// the progression
// trigger for the "custom world" idea in docs/IDEAS.md. Originally
// implemented as "nights survived" since that was the best available
// proxy before the Wave Horn system existed (waves were going to be
// driven by Pure Suffering's night-gated invasions at the time) — but
// the actual original intent was always "waves," and now that
// wave_status.js tracks real wave clear/incoming state directly, this
// switched to the real signal instead of the old proxy.
//
// Watches wave_status.js's `td_inWave` flag (true -> false transition)
// rather than re-scanning for nearby hostiles itself — that scan
// already happens once per tick in wave_status.js, no need to duplicate
// it here. Order between the two files' PlayerEvents.tick handlers
// within the same tick isn't guaranteed, so this can lag the real
// transition by up to one tick (~50ms) — not noticeable.
//
// Counter lives on the player's own persistent data, not the world/level.
// KubeJS's server/level-scoped persistentData was checked against its own
// source (MinecraftServerMixin.java) and has no save/load hook at all —
// it's a plain in-memory CompoundTag that resets on every restart. Player
// persistent data does survive — fine given this pack is single-player-
// focused, not built for a real multiplayer server.
//
// Runs the worldborder command via player.getServer().runCommandSilent
// (console-level, always full permission), not player.runCommandSilent
// (the player's own permission level, which may not be enough even with
// cheats nominally on).

var EXPANSION_TIME_SECONDS = 10

// Escalating growth curve (2026-08-31, direct request, numbers
// pre-confirmed with the user via docs/QUEUE.md before this was built):
// grows on EVERY wave clear now, not every 2nd, by an amount that steps
// up every 2 waves - same constant-plus-step-function style as
// wave_spawner.js's staggerGapForWave, not a new pattern. Gives
// 20/20/25/25/30/30/35/35 across waves 1-8, taking the border from 50
// to 270 by the end of the designed campaign (vs. 70 under the old flat
// +20-every-2-waves rate) - intent is late-campaign expansion feeling
// like real access to the world's generated structures opening up, not
// a slow trickle.
function expansionForWave(waveNumber) {
  return 20 + 5 * Math.floor((waveNumber - 1) / 2)
}

PlayerEvents.tick(function (event) {
  var player = event.entity
  var data = player.persistentData

  var wasInWave = data.getBoolean('td_wasInWaveForExpansion')
  var isInWave = data.getBoolean('td_inWave')

  data.putBoolean('td_wasInWaveForExpansion', isInWave)

  // Only react to the true -> false transition (a wave just cleared).
  if (!wasInWave || isInWave) return

  // wave_spawner.js increments td_waveNumber at spawn time and never
  // decrements it, so at the moment a wave clears this already holds
  // the number of the wave that just ended.
  var waveNumber = data.getInt('td_waveNumber')
  var expansionBlocks = expansionForWave(waveNumber)

  player.getServer().runCommandSilent(`worldborder add ${expansionBlocks} ${EXPANSION_TIME_SECONDS}`)
  player.tell(`§6[Base Expansion] §fWave ${waveNumber} cleared - the border grows by ${expansionBlocks} blocks.`)
})
