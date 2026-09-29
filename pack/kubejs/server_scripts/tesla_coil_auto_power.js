// Powers the starter Tesla Coil only while a wave mob is near it.
//
// Immersive Engineering's coil runs only while a neighbouring block gives it
// a redstone signal, and while running it draws idle power and zaps a random
// living entity within 6 blocks every 32 ticks. This flips the lever that
// placeStarterTraps() (playtest_starter_kit.js) mounts on the coil's lower
// block. Only the td_wave_mob tag counts, never the entity type: structure
// mobs share types with wave mobs. The coil's position is in worldData()
// (world_state.js); player safety is left to the patched IE jar
// (docs/MODS.md) and electric_trap_player_safety.js.
var TESLA_AUTO_POWER_INTERVAL = 20 // ticks between checks

// Blocks from the centre of the coil's lower block. The margin over the
// coil's 6-block reach covers a mob's approach between checks.
var TESLA_AUTO_POWER_RADIUS = 9
var TESLA_AUTO_POWER_RADIUS_SQ = TESLA_AUTO_POWER_RADIUS * TESLA_AUTO_POWER_RADIUS

ServerEvents.tick((event) => {
  var level = event.server.getLevel('minecraft:overworld')
  if (!level) return
  if (level.getTime() % TESLA_AUTO_POWER_INTERVAL !== 0) return

  var data = worldData(level)
  if (!data || !data.contains('td_starterTeslaCoilX')) return
  // Lever and coil are gone after wave_status.js's STARTER_TRAPS_REMOVAL_WAVE.
  if (data.getBoolean('td_starterTrapsRemoved')) return

  var cx = data.getInt('td_starterTeslaCoilX') + 0.5
  var cy = data.getInt('td_starterTeslaCoilY') + 0.5
  var cz = data.getInt('td_starterTeslaCoilZ') + 0.5

  var entities = level.getEntities()
  var enemyNear = false
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i]
    if (!e.getTags().contains('td_wave_mob')) continue
    var dx = e.getX() - cx
    var dy = e.getY() - cy
    var dz = e.getZ() - cz
    if (dx * dx + dy * dy + dz * dz > TESLA_AUTO_POWER_RADIUS_SQ) continue
    enemyNear = true
    break
  }

  // Writes only on a change, so a lever flipped by hand holds until wave-mob
  // presence next changes.
  var key = 'td_starterTeslaCoilPowered'
  if (data.getBoolean(key) === enemyNear) return
  data.putBoolean(key, enemyNear)

  // /setblock replaces the whole blockstate, so face and facing must match the
  // lever placeStarterTraps() placed.
  event.server.runCommandSilent(
    `setblock ${data.getInt('td_starterTeslaCoilX') - 1} ${data.getInt('td_starterTeslaCoilY')} ${data.getInt('td_starterTeslaCoilZ')} minecraft:lever[face=wall,facing=west,powered=${enemyNear}]`
  )
})
