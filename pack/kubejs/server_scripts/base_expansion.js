// Grows the worldborder every few WAVES CLEARED — the progression
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

var WAVES_PER_EXPANSION = 2
var EXPANSION_BLOCKS = 20
var EXPANSION_TIME_SECONDS = 10

PlayerEvents.tick(function (event) {
  var player = event.entity
  var data = player.persistentData

  var wasInWave = data.getBoolean('td_wasInWaveForExpansion')
  var isInWave = data.getBoolean('td_inWave')

  data.putBoolean('td_wasInWaveForExpansion', isInWave)

  // Only react to the true -> false transition (a wave just cleared).
  if (!wasInWave || isInWave) return

  var wavesSinceExpansion = data.getInt('td_wavesSinceExpansion') + 1

  if (wavesSinceExpansion >= WAVES_PER_EXPANSION) {
    data.putInt('td_wavesSinceExpansion', 0)
    player.getServer().runCommandSilent(`worldborder add ${EXPANSION_BLOCKS} ${EXPANSION_TIME_SECONDS}`)
    player.tell(`§6[Base Expansion] §fYou cleared ${WAVES_PER_EXPANSION} more waves - the border grows by ${EXPANSION_BLOCKS} blocks.`)
  } else {
    data.putInt('td_wavesSinceExpansion', wavesSinceExpansion)
  }
})
