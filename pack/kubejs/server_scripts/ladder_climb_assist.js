// Real fix for wave mobs getting stuck on ladders (2026-09-08, direct
// ask despite the 2026-09-04 investigation's "avoid ladders on exterior
// walls" recommendation - see docs/QUEUE.md's item 6 for the full ask).
//
// The gap is execution, not planning: vanilla mob pathfinders treat a
// ladder as a real climbable node when computing a route, but most mob
// types don't reliably apply the actual upward climb once they're
// standing at one - a long-documented vanilla AI limitation (the same
// one behind villagers stalling at ladder bases), not specific to this
// pack, Radium, or ESM. Rather than write a custom PathNavigation/Goal
// override (real mixin-level scope), this detects the specific failure
// state directly - a wave mob standing on a ladder block, not making
// horizontal progress - and manually applies the missing upward
// velocity via Entity#setDeltaMovement(double,double,double), the same
// "real vanilla method, not remapped by KubeJS" category as
// mob_aggro.js's own setTarget()/getTarget() calls.
//
// Position tracked per-mob via a plain in-file Map keyed by UUID string
// - top-level var/const doesn't reliably share across server_scripts in
// this build (see pedestal_health.js's header comment for the confirmed
// exception, which only covers top-level FUNCTIONS), but nothing here
// needs cross-file access, so a plain module-local Map is fine. Not
// pruned - each wave mob's entry is a few numbers and a real campaign's
// total distinct mob count never approaches a size where that matters.
var LADDER_ASSIST_MOB_TYPES = [
  'minecraft:zombie',
  'minecraft:husk',
  'minecraft:drowned',
  'minecraft:zombie_villager',
  'mutantszombies:mutant_zombie',
  'mutantszombies:blister_zombie',
  'mutantszombies:split_head_zombie',
  'zombiesmore:boomer_zombie',
  'undeadnights:elite_zombie',
  'undeadnights:horde_zombie',
  'undeadnights:demolition_zombie',
  'mutantszombies:zombie_brute',
  'mutantszombies:mutant_brute',
  'mutantszombies:rotten_mutant',
  'mutantszombies:crawler',
]

var LADDER_CHECK_INTERVAL_TICKS = 5 // 4x/second - responsive without scanning every tick
var LADDER_STUCK_THRESHOLD = 0.05 // horizontal blocks moved since the last check, below which counts as "stuck"
var LADDER_CLIMB_VELOCITY = 0.2 // matches vanilla's own player-on-ladder climb speed

var ladderLastPos = {} // uuid -> {x, z}

function isClimbableBlock(id) {
  return id === 'minecraft:ladder' || id === 'minecraft:vine'
}

PlayerEvents.tick((event) => {
  var level = event.entity.getLevel()
  if (level.getTime() % LADDER_CHECK_INTERVAL_TICKS !== 0) return

  level.getEntities().forEach((e) => {
    if (!LADDER_ASSIST_MOB_TYPES.includes(`${e.type}`)) return

    var uuid = `${e.uuid}`
    var x = e.getX()
    var y = e.getY()
    var z = e.getZ()

    var last = ladderLastPos[uuid]
    ladderLastPos[uuid] = { x: x, z: z }
    if (!last) return // first sighting this session, nothing to compare against yet

    var dx = x - last.x
    var dz = z - last.z
    var horizontalMoved = Math.sqrt(dx * dx + dz * dz)
    if (horizontalMoved > LADDER_STUCK_THRESHOLD) return // making real progress, leave it alone

    var blockId = `${level.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)).id}`
    if (!isClimbableBlock(blockId)) return

    // Stuck AND standing on a real climbable block - apply the missing
    // climb velocity directly. try/catch matches this codebase's own
    // "never let one mob's lookup failing break the whole tick handler"
    // convention (see pedestal_health.js's pedestalAttackDamage()) -
    // setDeltaMovement is a confirmed-real vanilla Entity method, but
    // this is a first-pass, not yet playtest-confirmed fix.
    try {
      e.setDeltaMovement(0, LADDER_CLIMB_VELOCITY, 0)
    } catch (err) {
      // Swallow - worst case this specific mob stays stuck this check,
      // same as before this fix existed.
    }
  })
})
