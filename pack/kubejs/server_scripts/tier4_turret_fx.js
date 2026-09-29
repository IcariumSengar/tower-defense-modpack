// Launch, trail and impact effects for Open Modular Turrets Reborn's Grenade
// and Rocket Turrets.
//
// The mod gives a rocket a smoke trail and its own explosion particle and
// sound. A grenade has no trail, and its blast is a 0.1-strength vanilla
// explosion (see omtreborn_grenade_safety.js): one small puff. This adds a
// launch cue for both, a flame exhaust for rockets, a smoke trail and an
// explosion burst for grenades, and a flash with lava sparks at every impact.
//
// Shells are collected at spawn. Every TURRET_FX_TRAIL_INTERVAL ticks the
// tick handler draws each trail and records its position; once a shell is
// removed, its impact is drawn at the last recorded position (up to one
// interval of flight short of the hit), so no hit event is needed.
var TURRET_FX_TYPES = {
  'omtreborn:grenade_projectile': {
    launchSound: 'minecraft:block.dispenser.launch',
    launchPitch: 0.6,
    trail: 'minecraft:smoke',
    impactExplosion: true,
  },
  'omtreborn:rocket_projectile': {
    launchSound: 'minecraft:entity.firework_rocket.launch',
    launchPitch: 0.7,
    trail: 'minecraft:flame',
    impactExplosion: false, // the mod already draws its own explosion
  },
}
var TURRET_FX_TRAIL_INTERVAL = 2 // ticks
var TURRET_FX_MAX_TRACKED = 64 // the oldest shell is dropped beyond this

var turretFxShells = [] // { entity, fx, x/y/z = last recorded position }

EntityEvents.spawned((event) => {
  var entity = event.entity
  var fx = TURRET_FX_TYPES[`${entity.type}`]
  if (!fx) return
  var x = entity.getX()
  var y = entity.getY()
  var z = entity.getZ()
  var server = event.level.getServer()
  server.runCommandSilent(`particle minecraft:flash ${x} ${y} ${z} 0 0 0 0 1`)
  server.runCommandSilent(`particle minecraft:large_smoke ${x} ${y} ${z} 0.15 0.15 0.15 0.02 6`)
  server.runCommandSilent(`playsound ${fx.launchSound} neutral @a ${x} ${y} ${z} 0.8 ${fx.launchPitch}`)
  if (turretFxShells.length >= TURRET_FX_MAX_TRACKED) turretFxShells.shift()
  turretFxShells.push({ entity: entity, fx: fx, x: x, y: y, z: z })
})

function drawTurretShellImpact(server, shell) {
  var x = shell.x
  var y = shell.y
  var z = shell.z
  server.runCommandSilent(`particle minecraft:flash ${x} ${y} ${z} 0 0 0 0 1`)
  server.runCommandSilent(`particle minecraft:lava ${x} ${y} ${z} 0.3 0.2 0.3 0 8`)
  if (shell.fx.impactExplosion) {
    server.runCommandSilent(`particle minecraft:explosion ${x} ${y} ${z} 0.4 0.3 0.4 0 3`)
    server.runCommandSilent(`particle minecraft:large_smoke ${x} ${y} ${z} 0.4 0.3 0.4 0.03 12`)
  }
}

ServerEvents.tick((event) => {
  if (turretFxShells.length === 0) return
  var level = event.server.getLevel('minecraft:overworld')
  if (!level || level.getTime() % TURRET_FX_TRAIL_INTERVAL !== 0) return
  var server = event.server
  var alive = []
  turretFxShells.forEach((shell) => {
    if (shell.entity.isRemoved()) {
      drawTurretShellImpact(server, shell)
      return
    }
    shell.x = shell.entity.getX()
    shell.y = shell.entity.getY()
    shell.z = shell.entity.getZ()
    server.runCommandSilent(`particle ${shell.fx.trail} ${shell.x} ${shell.y} ${shell.z} 0.02 0.02 0.02 0.005 2`)
    alive.push(shell)
  })
  turretFxShells = alive
})
