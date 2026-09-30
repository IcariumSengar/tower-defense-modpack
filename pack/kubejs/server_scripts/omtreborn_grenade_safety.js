// Keeps players, dropped items, XP orbs and blocks out of OMT Reborn Grenade
// Turret blasts, as a second layer to explosion_player_safety.js.
// omtreborn-common.toml in pack/defaultconfigs already turns off turret damage
// to players (globalCanTargetPlayers) and grenade block damage
// (canGrenadesDestroyBlocks), but a grenade also calls Level#explode (null
// source, strength 0.1), and that vanilla explosion hurts whatever is in
// range. Rockets make no vanilla explosion, so they need nothing here.
//
// Grenades fly well away from their spawn point, so a spawn-radius match
// would also catch enemy blasts. The live grenade entities are kept instead
// and matched by current position, within a block: a grenade explodes where
// it is.
var liveGrenades = []

EntityEvents.spawned((event) => {
  var entity = event.entity
  if (`${entity.type}` !== 'omtreborn:grenade_projectile') return
  liveGrenades.push(entity)
})

// Forget grenades that are gone without a matching blast, such as ones
// unloaded with their chunk.
PlayerEvents.tick((event) => {
  if (liveGrenades.length === 0) return
  liveGrenades = liveGrenades.filter((e) => !e.isRemoved())
})

LevelEvents.afterExplosion((event) => {
  var ex = event.getX()
  var ey = event.getY()
  var ez = event.getZ()

  var matchIdx = liveGrenades.findIndex((e) => {
    if (e.isRemoved()) return false
    var dx = e.getX() - ex
    var dy = e.getY() - ey
    var dz = e.getZ() - ez
    return dx * dx + dy * dy + dz * dz <= 1.0
  })
  if (matchIdx === -1) return // not a tracked grenade

  liveGrenades.splice(matchIdx, 1)

  spareFriendlyBlast(event) // explosion_player_safety.js
})
