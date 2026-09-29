// Keeps players inside the world border while the amulet is off the pedestal
// (td_amuletOnPedestal, set by amulet_pedestal.js). Vanilla's border stops
// players walking out, but it deals no damage in this pack, so a player who is
// already outside, for example still out there when the amulet is lifted and
// the border closes in, would otherwise stay out. Such a player is teleported
// back inside, keeping their Y.

const AMULET_BORDER_CHECK_TICKS = 5 // ticks
const AMULET_BORDER_MARGIN = 1 // blocks inside the border edge

PlayerEvents.tick((event) => {
  const player = event.entity
  const level = player.getLevel()

  if (level.getTime() % AMULET_BORDER_CHECK_TICKS !== 0) return

  // td_wasInsideBorderForAmulet is per player and remembers the last check, so
  // the chat line goes out once per crossing, not on every push.
  const data = player.persistentData
  const world = worldData(level)
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
  if (world && world.getBoolean('td_amuletOnPedestal')) return

  const clampedX = Math.min(Math.max(x, minX + AMULET_BORDER_MARGIN), maxX - AMULET_BORDER_MARGIN)
  const clampedZ = Math.min(Math.max(z, minZ + AMULET_BORDER_MARGIN), maxZ - AMULET_BORDER_MARGIN)
  player.teleportTo(clampedX, player.getY(), clampedZ)

  if (wasInside) {
    player.tell('§d[Amulet] §fSomething holds you to this ground. Leave the pendant behind if you mean to go further.')
  }
})
