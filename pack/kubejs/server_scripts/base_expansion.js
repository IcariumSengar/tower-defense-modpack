// Grows the worldborder every few nights survived — the progression
// trigger for the "custom world" idea in docs/IDEAS.md (resolved to:
// hard worldborder wall, expansion tied to waves/nights survived).
//
// Counter lives on the player's own persistent data, not the world/level.
// KubeJS's server/level-scoped persistentData was checked against its own
// source (MinecraftServerMixin.java) and has no save/load hook at all —
// it's a plain in-memory CompoundTag that resets on every restart. Player
// persistent data does survive (same mechanism playtest_starter_kit.js
// already relies on, confirmed working in-game) — fine given this pack
// is single-player-focused, not built for a real multiplayer server.
//
// Runs the worldborder command via player.getServer().runCommandSilent
// (console-level, always full permission), not player.runCommandSilent
// (the player's own permission level, which may not be enough even with
// cheats nominally on) — same fix applied to wave_spawner.js after the
// wave horn silently failed to summon anything for exactly this reason.

const NIGHTS_PER_EXPANSION = 2
const EXPANSION_BLOCKS = 5
const EXPANSION_TIME_SECONDS = 30

PlayerEvents.tick((event) => {
  const player = event.player
  const data = player.persistentData
  const level = player.getLevel()

  const currentNight = Math.floor(level.getDayTime() / 24000)
  const lastSeenNight = data.getInt('td_lastSeenNight')

  if (currentNight <= lastSeenNight) return
  data.putInt('td_lastSeenNight', currentNight)

  const nightsSinceExpansion = data.getInt('td_nightsSinceExpansion') + 1

  if (nightsSinceExpansion >= NIGHTS_PER_EXPANSION) {
    data.putInt('td_nightsSinceExpansion', 0)
    player.getServer().runCommandSilent(`worldborder add ${EXPANSION_BLOCKS} ${EXPANSION_TIME_SECONDS}`)
    player.tell(`§6[Base Expansion] §fYou survived ${NIGHTS_PER_EXPANSION} more nights - the border grows by ${EXPANSION_BLOCKS} blocks.`)
  } else {
    data.putInt('td_nightsSinceExpansion', nightsSinceExpansion)
  }
})
