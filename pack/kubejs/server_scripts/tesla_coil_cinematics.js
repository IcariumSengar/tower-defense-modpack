// Hit effects for Immersive Engineering's Tesla Coil.
//
// The mod plays its zap sound at the coil and renders its own arc on the
// client. This adds a strike at the target: a jagged spark bolt falling onto
// it, a crit pop, a flash, and thunder over an impact crack. The damage
// source carries no coil position, so the bolt comes down from above the
// target rather than from the coil. Covers every Tesla Coil, not only the
// starter one.
function drawJaggedBolt(server, x, y, z) {
  // Walks from BOLT_HEIGHT above the hit point down to it in SEGMENTS steps.
  // The sideways jitter shrinks to zero at the bottom, so the bolt ends on the
  // target.
  var SEGMENTS = 6
  var BOLT_HEIGHT = 10 // blocks above the hit point where the bolt starts
  var MAX_JITTER = 1.4 // blocks of sideways wobble at the top of the bolt
  for (var i = SEGMENTS; i >= 0; i--) {
    var t = i / SEGMENTS // 1 at the top, 0 at the target
    var jitter = MAX_JITTER * t
    var px = x + (Math.random() - 0.5) * jitter
    var py = y + BOLT_HEIGHT * t
    var pz = z + (Math.random() - 0.5) * jitter
    server.runCommandSilent(`particle minecraft:electric_spark ${px} ${py} ${pz} 0.08 0.08 0.08 0.01 6`)
  }
}
EntityEvents.hurt((event) => {
  var source = event.getSource()
  // getType() is the damage type's message_id. ieTesla is the coil's zap;
  // ieTeslaPrimary, the screwdriver test shock, is not matched.
  if (source.getType() !== 'ieTesla') return
  var entity = event.getEntity()
  var level = entity.level
  var x = entity.getX()
  var y = entity.getY() + entity.getBbHeight() / 2
  var z = entity.getZ()
  drawJaggedBolt(level.getServer(), x, y, z)
  level.getServer().runCommandSilent(`particle minecraft:crit ${x} ${y} ${z} 0.25 0.25 0.25 0.1 15`)
  level.getServer().runCommandSilent(`particle minecraft:flash ${x} ${y} ${z} 0 0 0 0 1`)
  level.getServer().runCommandSilent(
    `playsound minecraft:entity.lightning_bolt.thunder hostile @a ${x} ${entity.getY()} ${z} 0.5 1.4`
  )
  level.getServer().runCommandSilent(
    `playsound minecraft:entity.lightning_bolt.impact hostile @a ${x} ${entity.getY()} ${z} 0.6 1.1`
  )
})
