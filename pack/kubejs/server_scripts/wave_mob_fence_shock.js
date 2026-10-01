// Electrified-fence reach for hostile mobs.
//
// SecurityCraft's electrified fence only shocks an entity whose hitbox touches
// the fence's collision box, but pathfinding treats fences as impassable, so a
// zombie stops at the centre of the next block, 0.2 blocks short, and is never
// hurt. Once a second (the fence's own cadence) this shocks every hostile mob
// standing next to an electrified fence with SecurityCraft's electricity
// damage. Hostile means the MONSTER mob category, so it covers wave mobs and
// also structure guards or other untagged zombies that follow a player back
// to the base; it never touches players, sentries or the pedestal marker.
// Shocking a mob that is already at the fence doesn't steer it anywhere, so
// the pack's wave-mobs-only rule for steering doesn't apply.
var FENCE_SHOCK_INTERVAL_TICKS = 20
var FENCE_SHOCK_DAMAGE = 6 // the fence's shock to players (it hits mobs with lightning)
var FENCE_SHOCK_REACH = 0.5 // blocks beyond the mob's hitbox, horizontally
var FENCE_SHOCK_BLOCKS = ['securitycraft:electrified_iron_fence']
var FENCE_SHOCK_DAMAGE_TYPE = 'securitycraft:electricity'

// The fence's collision box is 1.5 blocks tall, so the mob's feet level and
// the block above cover it.
function isNearElectrifiedFence(level, e) {
  var half = e.getBbWidth() / 2 + FENCE_SHOCK_REACH
  var x0 = Math.floor(e.getX() - half)
  var x1 = Math.floor(e.getX() + half)
  var z0 = Math.floor(e.getZ() - half)
  var z1 = Math.floor(e.getZ() + half)
  var y0 = Math.floor(e.getY())
  for (var x = x0; x <= x1; x++) {
    for (var z = z0; z <= z1; z++) {
      for (var y = y0; y <= y0 + 1; y++) {
        if (FENCE_SHOCK_BLOCKS.includes(`${level.getBlock(x, y, z).getId()}`)) return true
      }
    }
  }
  return false
}

// ServerEvents.tick rather than PlayerEvents.tick, so it also runs with
// nobody online.
ServerEvents.tick((event) => {
  var level = event.server.getLevel('minecraft:overworld')
  if (!level) return
  if (level.getTime() % FENCE_SHOCK_INTERVAL_TICKS !== 0) return
  var server = event.server
  level.getEntities().forEach((e) => {
    if (!e.isLiving() || !e.isMonster()) return
    if (e.getHealth() <= 0) return
    if (!isNearElectrifiedFence(level, e)) return
    var x = e.getX()
    var y = e.getY() + e.getBbHeight() / 2
    var z = e.getZ()
    server.runCommandSilent(`damage ${e.uuid} ${FENCE_SHOCK_DAMAGE} ${FENCE_SHOCK_DAMAGE_TYPE}`)
    server.runCommandSilent(`particle minecraft:electric_spark ${x} ${y} ${z} 0.3 0.5 0.3 0.05 20`)
    server.runCommandSilent(`playsound minecraft:entity.lightning_bolt.impact hostile @a ${x} ${e.getY()} ${z} 0.3 1.6`)
  })
})
