// Wave mobs climb ladders (rewritten 2026-09-10, direct playtest ask:
// "can you give enemies the ability to climb ladders" - the 2026-09-08
// first pass this replaces never visibly worked in play).
//
// Why the first pass failed, from vanilla's own movement code rather
// than guessed: vanilla mobs CAN climb - LivingEntity#travel gives any
// mob that is standing inside a climbable block AND pressing into a
// wall (`horizontalCollision && onClimbable()`) a fixed 0.2/tick upward
// motion, the exact same rule players climb by. What no mob has is a
// reason to walk into the ladder: WalkNodeEvaluator never plans a route
// UP a ladder column, so a mob whose target is above it finds no path at
// all, its attack goal never starts, and it idles at the bottom. The old
// pass waited for a mob to already be "stuck on a ladder block" - a state
// a mob almost never reaches on its own - and then nudged its velocity
// once per 5 ticks, which gravity ate between checks.
//
// This version supplies the missing intent instead of fighting physics:
//  1. a wave mob whose current target sits >= LADDER_MIN_CLIMB_DY above
//     it, and whose own navigation has nothing to do (no path - isDone()
//     - or no horizontal progress since the last check), looks for a
//     ladder column within LADDER_SEARCH_RADIUS whose top actually
//     reaches up toward the target;
//  2. it is walked to the foot of that column with its own PathNavigation
//     (moveTo - the ladder's foot is an ordinary walkable node);
//  3. once inside the column, its navigation is stopped and its
//     MoveControl is pointed straight at the wall block BEHIND the ladder,
//     one block above its head - so every tick it presses into the wall
//     and vanilla's own climb rule lifts it 0.2 blocks, continuously, no
//     velocity hacks. At the top it simply keeps walking forward onto
//     whatever the ladder led to.
//
// Only real wave mobs (td_wave_mob) are ever steered - structure guards
// and baked-in structure mobs keep their own AI, per 2026-09-10's
// "structure mobs stay put" rule (mob_aggro.js). Targets come from
// Mob#getTarget(), the same call mob_aggro.js already relies on, so this
// follows whatever that file decided the mob wants: the pedestal marker
// normally, the player when they're the one blocking the way or hit the
// mob first (HurtByTargetGoal is kept alive there) - which is exactly the
// wall-top-sniper case a ladder matters for.
//
// Mob#getNavigation()/getMoveControl(), PathNavigation#moveTo(dddd)/
// isDone()/stop() and MoveControl#setWantedPosition(dddd) are all plain
// public vanilla methods, reached the same way this codebase already
// reaches setTarget()/getTarget()/teleportTo() on the same entities.
// Every call is wrapped so one mob's failure can't break the handler for
// every player online - same convention as pedestal_health.js's
// pedestalAttackDamage().
var LADDER_ASSIST_INTERVAL_TICKS = 5
var LADDER_MIN_CLIMB_DY = 1.5 // target has to be at least this far above the mob before a ladder is worth taking
var LADDER_SEARCH_RADIUS = 6 // horizontal blocks around the mob to scan for a ladder column
var LADDER_SEARCH_DOWN = 1
var LADDER_SEARCH_UP = 3
var LADDER_RESCAN_TICKS = 40 // a mob that found nothing waits this long before scanning again
var LADDER_MAX_COLUMN = 64 // sanity cap when walking a ladder column up/down
var LADDER_STUCK_THRESHOLD = 0.05 // horizontal blocks moved since the last check, below which counts as "not going anywhere"
var LADDER_AT_FOOT_RANGE = 1.3 // horizontal distance to the column at which the mob switches from pathing to pressing in
var LADDER_APPROACH_SPEED = 1.1
var LADDER_PRESS_SPEED = 1.0

var LADDER_CLIMB_NUDGE_VELOCITY = 0.25 // applied only when a mob inside a column isn't rising on its own
var LADDER_RISE_THRESHOLD = 0.05 // vertical blocks gained since the last check, below which the nudge kicks in

var ladderAssistState = {} // uuid -> { x, y, z, ladder, nextScanTick }
var ladderAssistLastTick = -1

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

// Walks a ladder column up and down from any one of its blocks. Returns
// the column's foot, top and the wall block the ladder hangs on.
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

// Nearest ladder column around (mx, my, mz) whose top reaches at least
// up to `minTopY` - a ladder that ends well below the target is no route
// to it. Bounded scan: (2R+1)^2 * (down+up+1) block reads, only ever run
// for a mob that genuinely needs to climb and has no column cached.
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
        break // same column, no need to test its other blocks
      }
    }
  }
  return best
}

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
    // Swallow - worst case this mob doesn't get steered this check.
  }
}

// Press the mob into the wall behind the ladder: vanilla's own
// `horizontalCollision && onClimbable()` rule does the actual lifting.
// `nudge` (2026-09-10, after the first real playtest of this rewrite):
// when the mob is already inside the column but hasn't risen since the
// last check - its own attack goal re-pathing every 20 ticks can steal
// the MoveControl for a moment, which is enough for gravity to win -
// a direct upward setDeltaMovement tops it up. Supplementary only; the
// press is still what does the climbing (a sandboxed husk climbed a
// 6-block ladder from the press alone).
function ladderPressIntoWall(mob, column, mobY, nudge) {
  try {
    mob.getNavigation().stop()
  } catch (e) {}
  try {
    mob.getMoveControl().setWantedPosition(column.wallX + 0.5, mobY + 2, column.wallZ + 0.5, LADDER_PRESS_SPEED)
  } catch (e) {
    // Swallow - see ladderWalkTo.
  }
  if (!nudge) return
  // Real Rhino finding, sandbox-probed 2026-09-10 (not assumed): the
  // three-double overloads `setDeltaMovement(x, y, z)` and `push(x, y, z)`
  // DON'T resolve from JS numbers in this build - Rhino binds the name to
  // the single-object overload (Vec3 / Entity) and throws "Can't find
  // method ...(number,number,number)". The 2026-09-08 first pass called
  // exactly that inside a try/catch, so its one mechanism silently never
  // ran once. The Vec3 overload works: `setDeltaMovement(new Vec3d(...))`
  // and `getDeltaMovement().add(x, y, z)` both resolved and the probe read
  // the changed velocity back (KubeJS's own Vec3d global binding).
  try {
    var dm = mob.getDeltaMovement()
    mob.setDeltaMovement(new Vec3d(dm.x(), LADDER_CLIMB_NUDGE_VELOCITY, dm.z()))
  } catch (e) {}
}

PlayerEvents.tick((event) => {
  var level = event.entity.getLevel()
  var now = Number(level.getTime())
  if (now % LADDER_ASSIST_INTERVAL_TICKS !== 0) return
  // Once per game tick, not once per online player (2026-09-27 audit):
  // PlayerEvents.tick fires for every player, so with 2+ online the second
  // pass in the same tick saw zero movement for every mob. File-scoped var,
  // Number() because getTime() is a Java long.
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
      return // first sighting - nothing to compare against yet
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
      return // nothing above worth climbing to - normal AI
    }

    var bx = Math.floor(x)
    var by = Math.floor(y)
    var bz = Math.floor(z)

    // Already inside a ladder column: keep pressing into its wall so
    // vanilla keeps lifting it, whatever its own AI would rather do.
    var here = ladderColumnAt(level, bx, by, bz)
    if (here) {
      state.ladder = here
      ladderPressIntoWall(e, here, y, risen < LADDER_RISE_THRESHOLD)
      return
    }

    // Not on a ladder. Only intervene when the mob's own pathfinding has
    // genuinely nothing for it - no path (the "target is above me" case
    // exactly) or no progress - never while it's walking somewhere.
    if (!ladderNavIsDone(e) && horizontalMoved > LADDER_STUCK_THRESHOLD) return

    if (!state.ladder || now >= state.nextScanTick) {
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
      // At the foot - navigation tends to stop a step short of a ladder
      // block, so close the last gap by pressing in directly.
      ladderPressIntoWall(e, column, y, false)
      return
    }
    ladderWalkTo(e, cx, column.foot, cz)
  })
  // Forget mobs that are gone (dead/unloaded) so the map doesn't grow all session.
  for (var k in ladderAssistState) {
    if (!seen[k]) delete ladderAssistState[k]
  }
})
