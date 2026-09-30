// Nudges wave mobs that have stalled short of their target.
//
// A td_wave_mob that makes no horizontal progress for STUCK_STREAK_THRESHOLD
// checks in a row gets a horizontal push straight toward its target, repeated
// every check until it moves, but only while the cell ahead is open at foot
// and head height. That carries a mob over the lip of a trench it has stalled
// at, or through a jam in a doorway, and never through a wall. The target is
// whatever mob_aggro.js set (pedestal marker, lure or player); this only helps
// the mob get there. Structure guards are skipped.

var STUCK_CHECK_INTERVAL_TICKS = 10
var STUCK_MOVE_THRESHOLD = 0.05 // horizontal blocks per check; less counts as stuck
var STUCK_STREAK_THRESHOLD = 6 // checks in a row (3 s), past a normal repath pause
var STUCK_NUDGE_SPEED = 0.3 // horizontal velocity, blocks per tick
var STUCK_NUDGE_CHECK_DISTANCE = 1.0 // blocks ahead, toward the target, to test
var STUCK_MIN_TARGET_DISTANCE = 0.5 // horizontal blocks; closer counts as arrived

var stuckMobState = {} // uuid -> { x, z, streak }
var stuckMobLastTick = -1

// Air, or a block that doesn't block movement. A failed read counts as solid,
// so the nudge never pushes a mob into a block.
function isPassable(level, x, y, z) {
  try {
    var state = level.getBlock(x, y, z).getBlockState()
    return state.isAir() || !state.blocksMotion()
  } catch (e) {
    return false
  }
}

PlayerEvents.tick((event) => {
  var level = event.player.getLevel()
  var now = Number(level.getTime())
  if (now % STUCK_CHECK_INTERVAL_TICKS !== 0) return
  // Wave mobs are in the overworld. Game time is shared by every dimension,
  // so a player elsewhere must not take the tick's pass: the cleanup below
  // would drop every overworld mob's state.
  if (`${level.dimension}` !== 'minecraft:overworld') return
  // PlayerEvents.tick fires once per online player; only the first call in a
  // tick runs, since a second pass would measure zero movement for every mob.
  // getTime() returns a Java long; Number() makes it a JS number for ===.
  if (now === stuckMobLastTick) return
  stuckMobLastTick = now

  var seen = {}
  level.getEntities().forEach((e) => {
    var tags = e.getTags()
    if (!tags.contains('td_wave_mob') || tags.contains('td_structure_guard')) return
    if (e.getHealth() <= 0) return

    var uuid = `${e.uuid}`
    seen[uuid] = true
    var x = e.getX()
    var y = e.getY()
    var z = e.getZ()
    var state = stuckMobState[uuid]
    if (!state) {
      stuckMobState[uuid] = { x: x, z: z, streak: 0 }
      return // first sighting: no previous position yet
    }

    var dx = x - state.x
    var dz = z - state.z
    var moved = Math.sqrt(dx * dx + dz * dz)
    state.x = x
    state.z = z

    if (moved > STUCK_MOVE_THRESHOLD) {
      state.streak = 0
      return
    }
    state.streak++
    if (state.streak < STUCK_STREAK_THRESHOLD) return

    var target = null
    try { target = e.getTarget() } catch (err) { target = null }
    if (!target) return

    var tdx = target.getX() - x
    var tdz = target.getZ() - z
    var horizDist = Math.sqrt(tdx * tdx + tdz * tdz)
    if (horizDist < STUCK_MIN_TARGET_DISTANCE) return

    var dirX = tdx / horizDist
    var dirZ = tdz / horizDist
    var nx = Math.floor(x + dirX * STUCK_NUDGE_CHECK_DISTANCE)
    var nz = Math.floor(z + dirZ * STUCK_NUDGE_CHECK_DISTANCE)
    var ny = Math.floor(y)
    // The cell ahead must be open at foot and head height, so a wall is never
    // pushed through.
    if (!isPassable(level, nx, ny, nz) || !isPassable(level, nx, ny + 1, nz)) return

    // setDeltaMovement(x, y, z) doesn't resolve from JS numbers in this Rhino
    // build; the Vec3d overload does.
    try {
      var dm = e.getDeltaMovement()
      e.setDeltaMovement(new Vec3d(dirX * STUCK_NUDGE_SPEED, dm.y(), dirZ * STUCK_NUDGE_SPEED))
    } catch (err) {
      // Left stuck; retried on the next check.
    }
  })
  // Drop state for mobs that died or unloaded.
  for (var k in stuckMobState) {
    if (!seen[k]) delete stuckMobState[k]
  }
})
