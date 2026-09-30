// Helps wave mobs climb ladders toward a target above them.
//
// Vanilla lifts any mob that is inside a ladder block and pushing into a wall
// (0.2 blocks a tick, the same rule players climb by), but mob pathfinding
// never plans a route up a ladder, so a mob whose target is above it waits at
// the bottom. For a td_wave_mob whose target is at least LADDER_MIN_CLIMB_DY
// above it and whose navigation is idle or making no progress, this walks it
// to the foot of a nearby ladder that reaches up to the target, then stops its
// navigation and aims its MoveControl at the wall behind the ladder, so
// vanilla does the climbing. The target is whatever mob_aggro.js set: the
// pedestal marker, a lure, or a player the mob is chasing. Structure guards
// are skipped.
var LADDER_ASSIST_INTERVAL_TICKS = 5
var LADDER_MIN_CLIMB_DY = 1.5 // blocks the target must be above the mob
var LADDER_SEARCH_RADIUS = 6 // horizontal blocks to scan around the mob
var LADDER_SEARCH_DOWN = 1 // blocks below the mob's feet to scan
var LADDER_SEARCH_UP = 3 // blocks above the mob's feet to scan
var LADDER_RESCAN_TICKS = 40 // ticks between one mob's ladder scans, hit or miss
var LADDER_MAX_COLUMN = 64 // max blocks followed up or down
var LADDER_STUCK_THRESHOLD = 0.05 // horizontal blocks per check; less is no progress
var LADDER_AT_FOOT_RANGE = 1.3 // horizontal blocks; closer than this, press in
var LADDER_APPROACH_SPEED = 1.1 // navigation speed multiplier
var LADDER_PRESS_SPEED = 1.0 // MoveControl speed multiplier

var LADDER_CLIMB_NUDGE_VELOCITY = 0.25 // upward blocks per tick, when not rising
var LADDER_RISE_THRESHOLD = 0.05 // vertical blocks per check; less gets a nudge

var ladderAssistState = {} // uuid -> { x, y, z, ladder, nextScanTick }
var ladderAssistLastTick = -1

// Unit step in the direction a ladder faces, away from the wall it hangs on.
function ladderFacingOffset(facing) {
  var f = `${facing}`
  if (f === 'north') return { x: 0, z: -1 }
  if (f === 'south') return { x: 0, z: 1 }
  if (f === 'west') return { x: -1, z: 0 }
  if (f === 'east') return { x: 1, z: 0 }
  return null
}

function ladderAt(level, x, y, z) {
  var block = level.getBlock(x, y, z)
  if (`${block.id}` !== 'minecraft:ladder') return null
  var offset = null
  try {
    offset = ladderFacingOffset(block.properties.get('facing'))
  } catch (e) {
    offset = null
  }
  if (!offset) return null
  return { x: x, y: y, z: z, facing: offset }
}

// Walks a ladder column up and down from one of its blocks. Returns the
// column's foot and top, and the wall block the ladder hangs on.
function ladderColumnAt(level, x, y, z) {
  var base = ladderAt(level, x, y, z)
  if (!base) return null
  var top = y
  var steps = 0
  while (steps < LADDER_MAX_COLUMN && ladderAt(level, x, top + 1, z)) { top++; steps++ }
  var foot = y
  steps = 0
  while (steps < LADDER_MAX_COLUMN && ladderAt(level, x, foot - 1, z)) { foot--; steps++ }
  return {
    x: x,
    z: z,
    foot: foot,
    top: top,
    wallX: x - base.facing.x,
    wallZ: z - base.facing.z,
  }
}

// Nearest ladder column whose top reaches at least minTopY; a ladder that ends
// below the target is no route to it. Scans (2R+1)^2 * (DOWN+UP+1) blocks per
// call, using the LADDER_SEARCH_ constants.
function findLadderColumn(level, mx, my, mz, minTopY) {
  var best = null
  var bestDistSq = 0
  for (var dx = -LADDER_SEARCH_RADIUS; dx <= LADDER_SEARCH_RADIUS; dx++) {
    for (var dz = -LADDER_SEARCH_RADIUS; dz <= LADDER_SEARCH_RADIUS; dz++) {
      for (var dy = -LADDER_SEARCH_DOWN; dy <= LADDER_SEARCH_UP; dy++) {
        var x = mx + dx
        var y = my + dy
        var z = mz + dz
        if (!ladderAt(level, x, y, z)) continue
        var column = ladderColumnAt(level, x, y, z)
        if (!column || column.top < minTopY) continue
        var distSq = dx * dx + dz * dz
        if (best && distSq >= bestDistSq) continue
        best = column
        bestDistSq = distSq
        break // one hit per column is enough
      }
    }
  }
  return best
}

// Navigation and MoveControl calls are wrapped so one mob's failure can't
// abort the pass for the others.
function ladderNavIsDone(mob) {
  try {
    return mob.getNavigation().isDone()
  } catch (e) {
    return true
  }
}

function ladderWalkTo(mob, x, y, z) {
  try {
    mob.getNavigation().moveTo(x, y, z, LADDER_APPROACH_SPEED)
  } catch (e) {
  }
}

// Stops the mob's navigation and aims its MoveControl at the wall block behind
// the ladder, 2 blocks above its feet, so it keeps walking into the wall and
// vanilla lifts it. `nudge` also sets an upward velocity, for a mob in the
// column that hasn't risen since the last check: its attack goal can take the
// MoveControl back for a moment when it re-paths, long enough for gravity to
// win.
function ladderPressIntoWall(mob, column, mobY, nudge) {
  try {
    mob.getNavigation().stop()
  } catch (e) {}
  try {
    mob.getMoveControl().setWantedPosition(column.wallX + 0.5, mobY + 2, column.wallZ + 0.5, LADDER_PRESS_SPEED)
  } catch (e) {
  }
  if (!nudge) return
  // setDeltaMovement(x, y, z) doesn't resolve from JS numbers in this Rhino
  // build; the Vec3d overload does.
  try {
    var dm = mob.getDeltaMovement()
    mob.setDeltaMovement(new Vec3d(dm.x(), LADDER_CLIMB_NUDGE_VELOCITY, dm.z()))
  } catch (e) {}
}

PlayerEvents.tick((event) => {
  var level = event.entity.getLevel()
  var now = Number(level.getTime())
  if (now % LADDER_ASSIST_INTERVAL_TICKS !== 0) return
  // Wave mobs are in the overworld. Game time is shared by every dimension,
  // so a player elsewhere must not take the tick's pass: the cleanup below
  // would drop every overworld mob's state.
  if (`${level.dimension}` !== 'minecraft:overworld') return
  // PlayerEvents.tick fires once per online player; only the first call in a
  // tick runs, since a second pass would measure zero movement for every mob.
  // getTime() returns a Java long; Number() makes it a JS number for ===.
  if (now === ladderAssistLastTick) return
  ladderAssistLastTick = now

  var seen = {}
  level.getEntities().forEach((e) => {
    var tags = e.getTags()
    if (!tags.contains('td_wave_mob') || tags.contains('td_structure_guard')) return

    var uuid = `${e.uuid}`
    seen[uuid] = true
    var x = e.getX()
    var y = e.getY()
    var z = e.getZ()
    var state = ladderAssistState[uuid]
    if (!state) {
      state = { x: x, y: y, z: z, ladder: null, nextScanTick: 0 }
      ladderAssistState[uuid] = state
      return // first sighting: no previous position yet
    }
    var dx = x - state.x
    var dz = z - state.z
    var horizontalMoved = Math.sqrt(dx * dx + dz * dz)
    var risen = y - state.y
    state.x = x
    state.y = y
    state.z = z

    var target = null
    try { target = e.getTarget() } catch (err) { target = null }
    if (!target || target.getY() - y < LADDER_MIN_CLIMB_DY) {
      state.ladder = null
      return // nothing above to climb to
    }

    var bx = Math.floor(x)
    var by = Math.floor(y)
    var bz = Math.floor(z)

    // Inside a ladder column: keep pressing into the wall, nudging a mob that
    // isn't rising.
    var here = ladderColumnAt(level, bx, by, bz)
    if (here) {
      state.ladder = here
      ladderPressIntoWall(e, here, y, risen < LADDER_RISE_THRESHOLD)
      return
    }

    // Not on a ladder: step in only when the mob's own navigation has no path
    // or is making no progress.
    if (!ladderNavIsDone(e) && horizontalMoved > LADDER_STUCK_THRESHOLD) return

    // A scan reads (2R+1)^2 * (DOWN+UP+1) blocks, so a mob with no ladder in
    // reach waits as long as one with a cached ladder before the next scan.
    if (now >= state.nextScanTick) {
      state.nextScanTick = now + LADDER_RESCAN_TICKS
      state.ladder = findLadderColumn(level, bx, by, bz, Math.floor(target.getY()) - 1)
    }
    var column = state.ladder
    if (!column) return

    var cx = column.x + 0.5
    var cz = column.z + 0.5
    var ddx = x - cx
    var ddz = z - cz
    if (ddx * ddx + ddz * ddz <= LADDER_AT_FOOT_RANGE * LADDER_AT_FOOT_RANGE) {
      // At the foot: navigation tends to stop a step short of a ladder, so
      // press in directly.
      ladderPressIntoWall(e, column, y, false)
      return
    }
    ladderWalkTo(e, cx, column.foot, cz)
  })
  // Drop state for mobs that died or unloaded.
  for (var k in ladderAssistState) {
    if (!seen[k]) delete ladderAssistState[k]
  }
})
