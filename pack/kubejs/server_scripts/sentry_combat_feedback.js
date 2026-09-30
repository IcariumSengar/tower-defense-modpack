// Firing and hit effects for SecurityCraft Sentries.
//
// Every shot spawns a securitycraft:bullet entity. At the muzzle this draws
// a small spark and smoke puff with a crossbow sound, then an end_rod tracer
// along the bullet's flight. A hit gets a crit burst, smoke and a crit sound.
var SENTRY_TRACER_MAX_TICKS = 40 // ticks a bullet is traced at most
var SENTRY_TRACER_POINTS_PER_TICK = 3 // tracer points per tick of flight
var sentryTracers = []

EntityEvents.spawned((event) => {
  var entity = event.entity
  if (`${entity.type}` !== 'securitycraft:bullet') return
  var level = event.level
  var x = entity.getX()
  var y = entity.getY()
  var z = entity.getZ()
  level.getServer().runCommandSilent(`particle minecraft:crit ${x} ${y} ${z} 0.1 0.1 0.1 0.02 6`)
  level.getServer().runCommandSilent(`particle minecraft:smoke ${x} ${y} ${z} 0.1 0.1 0.1 0.01 4`)
  level.getServer().runCommandSilent(`playsound minecraft:item.crossbow.shoot neutral @a ${x} ${y} ${z} 0.5 1.6`)
  sentryTracers.push({ entity: entity, x: x, y: y, z: z, age: 0 })
})

// Bullets are collected at spawn, so this walks only that short list, never
// the level's entity list. A bullet leaves the list once it is removed or
// passes SENTRY_TRACER_MAX_TICKS.
ServerEvents.tick((event) => {
  if (sentryTracers.length === 0) return
  var server = event.server
  var live = []
  for (var i = 0; i < sentryTracers.length; i++) {
    var t = sentryTracers[i]
    var e = t.entity
    t.age++
    if (e.isRemoved() || t.age > SENTRY_TRACER_MAX_TICKS) continue
    var nx = e.getX()
    var ny = e.getY()
    var nz = e.getZ()
    var dx = nx - t.x
    var dy = ny - t.y
    var dz = nz - t.z
    // A bullet spawned this tick hasn't moved yet: an entity added during the
    // level's entity loop first ticks on the next tick. A bullet never lodges
    // (it discards itself on any hit), so one that hasn't moved is kept.
    if (dx * dx + dy * dy + dz * dz < 0.0001) {
      live.push(t)
      continue
    }
    for (var s = 1; s <= SENTRY_TRACER_POINTS_PER_TICK; s++) {
      var f = s / SENTRY_TRACER_POINTS_PER_TICK
      server.runCommandSilent(`particle minecraft:end_rod ${t.x + dx * f} ${t.y + dy * f} ${t.z + dz * f} 0 0 0 0 1`)
    }
    t.x = nx
    t.y = ny
    t.z = nz
    live.push(t)
  }
  sentryTracers = live
})

// Only Sentry shots count: the damage's owner is a Sentry, or its direct
// entity is a Sentry bullet. Sentry.performRangedAttack fires a bullet owned
// by the Sentry or, with an ammo container below it, a dispensed projectile
// it sets itself as owner of. A Sentry bullet deals vanilla 'arrow' damage,
// so matching the damage id would also catch player bows and Simple Guns
// bullets. getImmediate() and getActual() are KubeJS's names for
// getDirectEntity() and getEntity().
EntityEvents.hurt((event) => {
  var source = event.getSource()
  var direct = source.getImmediate()
  if (direct == null) return
  var owner = source.getActual()
  var fromSentry = (owner != null && `${owner.type}` === 'securitycraft:sentry') || `${direct.type}` === 'securitycraft:bullet'
  if (!fromSentry) return
  var entity = event.getEntity()
  var level = entity.level
  var x = entity.getX()
  var y = entity.getY() + entity.getBbHeight() / 2
  var z = entity.getZ()
  level.getServer().runCommandSilent(`particle minecraft:crit ${x} ${y} ${z} 0.3 0.3 0.3 0.08 18`)
  level.getServer().runCommandSilent(`particle minecraft:smoke ${x} ${y} ${z} 0.2 0.2 0.2 0.03 8`)
  level.getServer().runCommandSilent(`playsound minecraft:entity.player.attack.crit hostile @a ${x} ${y} ${z} 0.6 1.3`)
})
