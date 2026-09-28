// Tier 4 turret combat FX: launch cue, in-flight trail, impact burst for
// Open Modular Turrets Reborn's Grenade and Rocket Turrets (2026-09-27).
// This is the one FX item kept in the 2026-09-26 backlog review
// (docs/FEATURES.md "Bullet tracer particles for turrets"). The Sentry
// already has muzzle + impact (sentry_combat_feedback.js) and the Tesla
// Coil has hit cinematics (tesla_coil_cinematics.js). These two turrets
// had nothing at the turret itself.
//
// What the mod already draws, decompiled from omtreborn-1.1.0.jar
// (SRG names resolved against the server's own 1.20.1 mappings, not
// guessed):
// - RocketProjectile: a SMOKE puff every tick in flight, and on impact an
//   EXPLOSION particle + GENERIC_EXPLODE at volume 4. So rockets only get
//   the missing pieces here: a launch cue, a flame exhaust over the
//   existing smoke, and an impact flash.
// - GrenadeProjectile: no trail. Its impact is a 0.1-power vanilla
//   explosion (see omtreborn_grenade_safety.js), which is just the smallest
//   puff plus the vanilla bang. So grenades get the launch cue, a smoke
//   trail, and a proper impact burst.
//
// Mechanism: EntityEvents.spawned registers each shell (entity ids from
// omtreborn.init.ModEntities: grenade_projectile/rocket_projectile). A
// ServerEvents.tick every 2 ticks draws the trail and remembers the last
// position, and when isRemoved() turns true, the impact is drawn there. So
// no mod event is needed for the hit. Costs nothing when no Tier 4 shell is
// in the air (early return on an empty list). The list is capped, so
// nothing can leak. isRemoved() is called as a method: see
// wave_mob_spike_slow.js's header for why a bare `.isXxx` property read is
// a trap in this Rhino.
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
var TURRET_FX_TRAIL_INTERVAL = 2
var TURRET_FX_MAX_TRACKED = 64

var turretFxShells = [] // { entity, fx, x, y, z }

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
