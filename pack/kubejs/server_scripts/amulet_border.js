// Border-crossing enforcement (docs/FEATURES.md's "Border-crossing"):
// the worldborder already has damage disabled (worldborder damage amount
// 0, set in playtest_starter_kit.js for the mob-spawn-beyond-border
// mechanic) and nothing else currently blocks player movement across it
// either, so this is a genuinely custom tick handler, not a config flip.
//
// Pushes the player back only while td_amuletOnPedestal is false — once
// the amulet's on its stand, crossing is the whole point (see
// amulet_pedestal.js). Uses level.getWorldBorder() the same way
// wave_spawner.js already does for spawn-position clamping — proven API
// in this codebase.
//
// Edge-triggered chat message (td_wasInsideBorder true -> false) rather
// than one every throttled tick, same "only announce the transition"
// pattern as wave_status.js's wave-clear detection - constantly pushing
// at the edge would otherwise spam a message every 5 ticks.
//
// Deliberately does NOT implement the "forced extra wave" penalty for
// leaving via the pedestal - docs/FEATURES.md flags that as "the leading
// idea," not confirmed. Building it now would be guessing at an
// unresolved design point rather than implementing a decided spec.
//
// Not yet confirmed in-game.

const CHECK_INTERVAL = 5
const PUSH_BACK_MARGIN = 1

PlayerEvents.tick((event) => {
  const player = event.entity
  const level = player.getLevel()

  if (level.getTime() % CHECK_INTERVAL !== 0) return

  const data = player.persistentData
  const border = level.getWorldBorder()
  const minX = border.getMinX()
  const maxX = border.getMaxX()
  const minZ = border.getMinZ()
  const maxZ = border.getMaxZ()

  const x = player.getX()
  const z = player.getZ()
  const isInside = x >= minX && x <= maxX && z >= minZ && z <= maxZ

  const wasInside = data.getBoolean('td_wasInsideBorderForAmulet')
  data.putBoolean('td_wasInsideBorderForAmulet', isInside)

  if (isInside) return
  if (data.getBoolean('td_amuletOnPedestal')) return

  const clampedX = Math.min(Math.max(x, minX + PUSH_BACK_MARGIN), maxX - PUSH_BACK_MARGIN)
  const clampedZ = Math.min(Math.max(z, minZ + PUSH_BACK_MARGIN), maxZ - PUSH_BACK_MARGIN)
  player.teleportTo(clampedX, player.getY(), clampedZ)

  if (wasInside) {
    player.tell('§d[Amulet] §fSomething holds you to this ground. Leave the pendant behind if you mean to go further.')
  }
})
