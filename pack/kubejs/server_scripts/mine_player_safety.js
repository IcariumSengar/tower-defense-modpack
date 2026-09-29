// Keeps players and blocks out of Claymore and Bouncing Betty blasts. It is a
// second layer: explosion_player_safety.js already strips every blast not
// caused by a mob, these included. Blasts are matched positively, so anything
// unmatched, such as an enemy's TNT, is left alone. The I.M.S. launches
// securitycraft:imsbomb entities rather than Betties, so only
// explosion_player_safety.js covers it.
//
// - Claymore: explodes at its own block position with no entity involved.
//   Placed Claymores are kept in worldData() as td_claymoreRegistry
//   ("x,y,z;x,y,z") and matched by block.
// - Bouncing Betty: the block spawns a securitycraft:bouncingbetty entity (no
//   underscore, unlike the block) that hops up and explodes on its 16th tick,
//   since its fuse of 15 is tested before each decrement. Each spawn opens a
//   tick window, matched by distance from the spawn point.
var BOUNCING_BETTY_ENTITY_TYPE = 'securitycraft:bouncingbetty'
var BOUNCING_BETTY_DETONATION_TICK = 16 // ticks from spawn to blast
var BOUNCING_BETTY_WINDOW_TICKS = 3 // tolerance, in ticks either side
var BOUNCING_BETTY_MATCH_RADIUS = 10 // blocks from the spawn point

var pendingBouncingBettys = [] // {x, y, z, validFromTick, validUntilTick}

function getClaymoreRegistry(data) {
  if (!data.contains('td_claymoreRegistry')) return []
  return `${data.getString('td_claymoreRegistry')}`.split(';').filter((s) => s.length > 0).map((entry) => {
    var parts = entry.split(',')
    return { x: parseInt(parts[0], 10), y: parseInt(parts[1], 10), z: parseInt(parts[2], 10) }
  })
}

function setClaymoreRegistry(data, list) {
  data.putString('td_claymoreRegistry', list.map((c) => `${c.x},${c.y},${c.z}`).join(';'))
}

BlockEvents.placed(['securitycraft:claymore'], (event) => {
  var data = worldData(event.getLevel())
  if (!data) return
  var block = event.getBlock()
  var list = getClaymoreRegistry(data)
  list.push({ x: block.getX(), y: block.getY(), z: block.getZ() })
  setClaymoreRegistry(data, list)
})

// A player broke the Claymore: stop tracking it.
BlockEvents.broken(['securitycraft:claymore'], (event) => {
  var data = worldData(event.getLevel())
  if (!data) return
  var block = event.getBlock()
  var x = block.getX()
  var y = block.getY()
  var z = block.getZ()
  var list = getClaymoreRegistry(data)
  var filtered = list.filter((c) => !(c.x === x && c.y === y && c.z === z))
  if (filtered.length !== list.length) setClaymoreRegistry(data, filtered)
})

EntityEvents.spawned((event) => {
  var entity = event.entity
  if (`${entity.type}` !== BOUNCING_BETTY_ENTITY_TYPE) return
  var tick = event.level.getTime()
  pendingBouncingBettys.push({
    x: entity.getX(),
    y: entity.getY(),
    z: entity.getZ(),
    validFromTick: tick + BOUNCING_BETTY_DETONATION_TICK - BOUNCING_BETTY_WINDOW_TICKS,
    validUntilTick: tick + BOUNCING_BETTY_DETONATION_TICK + BOUNCING_BETTY_WINDOW_TICKS,
  })
})

// Drop Betty windows that closed without a matching blast.
PlayerEvents.tick((event) => {
  if (pendingBouncingBettys.length === 0) return
  var currentTick = event.entity.getLevel().getTime()
  pendingBouncingBettys = pendingBouncingBettys.filter((b) => currentTick <= b.validUntilTick)
})

LevelEvents.afterExplosion((event) => {
  var level = event.getLevel()

  var ex = event.getX()
  var ey = event.getY()
  var ez = event.getZ()
  var bx = Math.floor(ex)
  var by = Math.floor(ey)
  var bz = Math.floor(ez)

  var matchedClaymore = false
  var data = worldData(level)
  if (data) {
    var claymores = getClaymoreRegistry(data)
    var claymoreIdx = claymores.findIndex((c) => c.x === bx && c.y === by && c.z === bz)
    if (claymoreIdx !== -1) {
      matchedClaymore = true
      claymores.splice(claymoreIdx, 1)
      setClaymoreRegistry(data, claymores)
    }
  }

  var bettyIdx = -1
  if (!matchedClaymore) {
    var currentTick = level.getTime()
    bettyIdx = pendingBouncingBettys.findIndex((b) => {
      if (currentTick < b.validFromTick || currentTick > b.validUntilTick) return false
      var dx = ex - b.x
      var dy = ey - b.y
      var dz = ez - b.z
      return dx * dx + dy * dy + dz * dz <= BOUNCING_BETTY_MATCH_RADIUS * BOUNCING_BETTY_MATCH_RADIUS
    })
  }

  if (!matchedClaymore && bettyIdx === -1) return // not a tracked mine blast

  if (bettyIdx !== -1) pendingBouncingBettys.splice(bettyIdx, 1)

  // Spare players and clear the block list. (Mines break no blocks anyway:
  // mineExplosionsBreakBlocks = false in securitycraft-common.toml.)
  event.getAffectedEntities().forEach((e) => {
    if (`${e.type}` === 'minecraft:player') event.removeAffectedEntity(e)
  })
  event.removeAllAffectedBlocks()
})
