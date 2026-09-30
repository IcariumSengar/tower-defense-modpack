// Keeps players inside the world border while the amulet is off the pedestal
// (td_amuletOnPedestal, set by amulet_pedestal.js). Vanilla's border stops
// players walking out, but it deals no damage in this pack, so a player who is
// already outside, for example still out there when the amulet is lifted and
// the border closes in, would otherwise stay out. Such a player is moved back
// inside: a short push keeps their Y, and a longer one in the overworld lands
// them on the surface at the edge, since the Y they had far out can be inside
// rock or high in the air there. Spectators are left alone, as vanilla's
// border does.

const AMULET_BORDER_CHECK_TICKS = 5 // ticks
const AMULET_BORDER_MARGIN = 1 // blocks inside the border edge
const AMULET_BORDER_KEEP_Y_BLOCKS = 4 // longest push that keeps the player's Y
// Blocks inside the edge for a surface landing, leaving room for
// spreadplayers' range of 1 and its move to the middle of the block.
const AMULET_BORDER_SURFACE_MARGIN = 3

PlayerEvents.tick((event) => {
  var player = event.entity
  var level = player.getLevel()

  if (level.getTime() % AMULET_BORDER_CHECK_TICKS !== 0) return
  if (player.isSpectator()) return

  // td_wasInsideBorderForAmulet is per player and remembers the last check, so
  // the chat line goes out once per crossing, not on every push.
  var data = player.persistentData
  var world = worldData(level)
  var border = level.getWorldBorder()
  var minX = border.getMinX()
  var maxX = border.getMaxX()
  var minZ = border.getMinZ()
  var maxZ = border.getMaxZ()

  var x = player.getX()
  var z = player.getZ()
  var isInside = x >= minX && x <= maxX && z >= minZ && z <= maxZ

  var wasInside = data.getBoolean('td_wasInsideBorderForAmulet')
  data.putBoolean('td_wasInsideBorderForAmulet', isInside)

  if (isInside) return
  if (world && world.getBoolean('td_amuletOnPedestal')) return

  var clampedX = Math.min(Math.max(x, minX + AMULET_BORDER_MARGIN), maxX - AMULET_BORDER_MARGIN)
  var clampedZ = Math.min(Math.max(z, minZ + AMULET_BORDER_MARGIN), maxZ - AMULET_BORDER_MARGIN)
  var pushBlocks = Math.max(Math.abs(clampedX - x), Math.abs(clampedZ - z))
  if (pushBlocks > AMULET_BORDER_KEEP_Y_BLOCKS && `${level.dimension}` === 'minecraft:overworld') {
    // spreadplayers loads the target chunk and lands on its top block, so an
    // unloaded chunk can't give a wrong height. Console commands run in the
    // overworld, hence the dimension check.
    var surfaceX = Math.min(Math.max(x, minX + AMULET_BORDER_SURFACE_MARGIN), maxX - AMULET_BORDER_SURFACE_MARGIN)
    var surfaceZ = Math.min(Math.max(z, minZ + AMULET_BORDER_SURFACE_MARGIN), maxZ - AMULET_BORDER_SURFACE_MARGIN)
    player.getServer().runCommandSilent(`spreadplayers ${surfaceX} ${surfaceZ} 0 1 false ${player.uuid}`)
  }
  // A short push, or a spreadplayers that found no safe ground (such as open
  // water) at the edge.
  var nowX = player.getX()
  var nowZ = player.getZ()
  if (nowX < minX || nowX > maxX || nowZ < minZ || nowZ > maxZ) {
    player.teleportTo(clampedX, player.getY(), clampedZ)
  }

  if (wasInside) {
    player.tell('§d[Amulet] §fSomething holds you to this ground. Leave the pendant behind if you mean to go further.')
  }
})
