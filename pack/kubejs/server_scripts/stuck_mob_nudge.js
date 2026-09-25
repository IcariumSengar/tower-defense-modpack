// Stuck wave-mob nudge (2026-09-12, direct playtest report: "i build a
// two wide trench all around the base and they just were unable to fall
// in, that must be a default ai thing"). Confirmed real, not a bug in
// this pack's own scripts: vanilla PathfinderMob navigation treats
// stepping into a deep-enough drop as a hazard and routes AROUND it
// whenever any alternate path exists to reach the current target -
// mob_aggro.js's forced setTarget() only controls WHERE a mob is trying
// to go, never HOW its own navigation avoids hazards getting there. A
// trench that fully encircles the base (no way around at all) leaves a
// mob with no path Navigation will accept, so it just stalls at the
// edge instead of "falling in" - the reported symptom.
//
// Fix: detect a td_wave_mob that hasn't made real horizontal progress
// for a few checks in a row, then - ONLY if the very next step toward its
// current target is genuinely open space (never through a solid block) -
// give it a small forward velocity shove. A wall in the way fails that
// openness check and is left completely untouched (still a real,
// unbypassable obstacle); an open trench edge passes it, the mob's
// hitbox crosses the edge, and vanilla's own gravity does the rest -
// no teleport across the trench, just enough of a push to stop hazard-
// avoidance from freezing it at the lip forever. This also quietly fixes
// the more mundane case of mobs stalling in a crowd at a doorway (open
// space ahead, just physically jammed) - same nudge, same safety gate,
// works for either reason a mob might be stuck.
//
// Mob#getTarget() (same call ladder_climb_assist.js and mob_aggro.js
// already rely on) is used to read WHAT this mob is currently trying to
// reach, so this stays correct whether that's the pedestal marker, an
// active Lure Block marker, or a blocking/retaliated-against player -
// whatever mob_aggro.js decided this tick, this file just tries to help
// it get there.
//
// getDeltaMovement()/setDeltaMovement(Vec3d) is the exact working call
// shape ladder_climb_assist.js already proved in a real sandbox probe -
// the 3-double setDeltaMovement(x,y,z) overload does NOT resolve in this
// Rhino build (binds to the wrong overload and throws), only the single
// Vec3d-object form does. Reused directly rather than re-discovering it.

var STUCK_CHECK_INTERVAL_TICKS = 10 // same cadence as mob_aggro.js's own main loop
var STUCK_MOVE_THRESHOLD = 0.05 // horizontal blocks moved since the last check, below which counts as "not going anywhere" - same value ladder_climb_assist.js's own LADDER_STUCK_THRESHOLD uses
var STUCK_STREAK_THRESHOLD = 6 // consecutive checks (~3s at this interval) before a nudge is attempted - long enough to rule out a normal AI pause between path recalculations
var STUCK_NUDGE_SPEED = 0.3
var STUCK_NUDGE_CHECK_DISTANCE = 1.0 // how far ahead (toward the target) to test for open space before nudging
var STUCK_MIN_TARGET_DISTANCE = 0.5 // don't nudge a mob that's already essentially at its target (e.g. mid-melee)

// Never cleaned up for despawned/killed mobs - same accepted tradeoff as
// ladder_climb_assist.js's own ladderAssistState (each entry is a few
// numbers; unbounded only across a single world's entire lifetime of
// wave mobs, not a per-tick cost).
var stuckMobState = {} // uuid -> { x, z, streak }

// Real vanilla BlockState methods, surfaced directly through KubeJS's
// BlockContainerJS#getBlockState() the same way this codebase already
// calls straight through to other vanilla objects (Mob#getTarget(),
// LevelAccessor#getWorldBorder(), etc.) - isAir()/blocksMotion() are
// exactly what vanilla's own WalkNodeEvaluator uses to decide "can
// something stand here," not a guessed proxy. Any read failure counts as
// solid/blocked - the safe default, since the only real risk here is
// nudging a mob through something that should have stopped it.
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
  if (level.getTime() % STUCK_CHECK_INTERVAL_TICKS !== 0) return

  level.getEntities().forEach((e) => {
    var tags = e.getTags()
    if (!tags.contains('td_wave_mob') || tags.contains('td_structure_guard')) return
    if (e.getHealth() <= 0) return

    var uuid = `${e.uuid}`
    var x = e.getX()
    var y = e.getY()
    var z = e.getZ()
    var state = stuckMobState[uuid]
    if (!state) {
      stuckMobState[uuid] = { x: x, z: z, streak: 0 }
      return // first sighting - nothing to compare against yet
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
    // Foot level and one above - the same two-tile margin vanilla itself
    // needs before anything can occupy a space. A solid block at either
    // (a wall) fails this and the mob is left exactly as stuck as before -
    // this never bypasses a real obstacle.
    if (!isPassable(level, nx, ny, nz) || !isPassable(level, nx, ny + 1, nz)) return

    try {
      var dm = e.getDeltaMovement()
      e.setDeltaMovement(new Vec3d(dirX * STUCK_NUDGE_SPEED, dm.y(), dirZ * STUCK_NUDGE_SPEED))
    } catch (err) {
      // Worst case this mob just stays stuck until the next check.
    }
  })
})
