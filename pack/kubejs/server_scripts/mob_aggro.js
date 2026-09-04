// Forces spawned wave mobs to always target the permanent pedestal
// marker, regardless of line of sight or where the player actually is.
// generic.follow_range (see wave_spawner.js) only helps a mob notice a
// target *faster once it can already see it* — it doesn't help acquire
// one through obstructed terrain, which will matter once the pack moves
// off Superflat (see docs/IDEAS.md). This script bypasses vanilla's
// sight-based target-acquisition entirely.
//
// Calls Mob#setTarget(marker) directly — a real, standard vanilla
// method (not remapped/hidden by KubeJS), same category of API as
// getX()/getServer()/playSound() that's worked reliably in this
// codebase, unlike bare properties like .x/.y/.z (see wave_spawner.js's
// notes on that). Once a mob has a target, its own attack-goal AI paths
// toward it using normal pathfinding (navigates around obstacles, digs/
// breaks per Epic Siege Mod) — this only forces WHO the target is, not
// how the mob gets there.
//
// No distance limit — every wave mob everywhere always targets the
// pedestal, per explicit design request ("this is the focus point for
// the enemies... if im not in the base to defend it then i lose the
// game" - not just "notices sooner", and not the player at all
// anymore). Throttled to every 10 ticks (twice a second), not every
// tick — setTarget is idempotent, no need to call it 20x/second.
//
// Not yet tested in-game — Mob#setTarget is a very standard, unchanged-
// across-versions vanilla method, high confidence, but flagging given
// how many "should be fine" assumptions turned out wrong earlier in
// this pack's debugging (bare .x/.y/.z, and Math.PI - confirmed real
// 2026-09-02, not just a flagged worry anymore: Math.PI/Math.E are
// undefined in this exact KubeJS/Rhino environment while Math's methods
// work fine, verified on a clean sandbox boot. This was the real,
// dominant cause behind the whole "wave mobs sometimes don't spawn"
// saga - see wave_spawner.js's randomPlayerRelativePosition() and
// amulet_pedestal.js's bob effect, both fixed the same day).
//
// Real bug found in playtest (2026-09-01): the marker lookup below used
// to call e.hasTag(...), which doesn't exist on either KubeJS's own
// entity wrapper or vanilla's real Entity class (same wrong-method
// mistake independently made in wave_spawner.js/wave_status.js, fixed
// there the same day) - this threw every throttled tick WHENEVER the
// pedestal objective was active, aborting the whole handler before ever
// reaching the aggro loop below. Real user-visible symptom this
// explains: wave mobs would summon correctly (confirmed separately)
// but never path toward the player at all - reads exactly like "the
// horn works but nothing spawns in." Fixed to the real vanilla method,
// getTags().contains(...), confirmed by decompiling Entity.class.
//
// Pedestal targeting is now unconditional and permanent (2026-09-05,
// docs/FEATURES.md's "Superseded" note - real premise correction:
// "regardless of whether the amulet is on the pedestal or not, this is
// the focus point for the enemies... if im not in the base to defend it
// then i lose the game"). Every wave mob always targets the marker
// armor stand playtest_starter_kit.js summons once at world-build time
// (tagged `td_pedestal_target`, never killed) - no more amulet-gated
// flag check, no more falling back to the player, since the marker is
// now permanent and guaranteed to exist from the moment the base is
// built. Checked once per throttled tick, not per mob, since it's the
// same entity for every mob in the loop.
//
// **Real root cause found 2026-09-05, first fresh-world playtest of the
// above** (docs/QUEUE.md's "Fresh-world playtest batch", #1: "mobs
// aren't pathing toward the pedestal at all"). setTarget() alone was
// never enough to make this stick - verified via direct Java reflection
// against a live sandbox, not guessed: Epic Siege Mod (already
// installed, config/epicsiegemod-common.toml) entirely REPLACES
// vanilla's own NearestAttackableTargetGoal<Player> with its own AI - a
// fresh zombie's real target selector held vanilla HurtByTargetGoal PLUS
// SIX stacked funwayguy.epicsiegemod.ai.ESM_EntityAINearestAttackableTarget
// instances, zero vanilla player-target goal even present anymore. That
// out-competes this handler's own 10-tick-throttled force almost every
// time once a mob has ever seen or been hit by the player - explains
// "not at all," not just "sometimes," since ESM's whole point is being
// MORE aggressive/responsive than vanilla, not less. Made worse (not the
// root cause, but compounding) by this file's own generic.follow_range
// override in wave_spawner.js's summon NBT - widens ESM's own
// player-seeking radius too, not just this script's pursuit range.
//
// Real, verified fix: physically strip every goal from each wave mob's
// target SELECTOR (a genuinely different object from its goal selector -
// that one is untouched, still handles actual attack/movement/dig/
// pillar/block-target behavior, including ESM's own obstacle-breaching
// goals and ESM_EntityTargetBlock, the pedestal-vulnerability goal from
// a separate dispatch) exactly once per mob, in stripAutoRetargeting()
// below - after that, setTarget() is the ONLY thing that can ever assign
// a target. Verified end to end in a sandbox before shipping: stripped a
// fresh zombie's target selector, force-set its target to a stand-in
// entity, and confirmed 4 real seconds (80 ticks) later the target was
// still that same entity (nothing left to reclaim it) - and that the
// mob had genuinely pathed 9 blocks toward it in that time using its own
// still-intact attack-goal AI, proving combat/pathing survive the strip.
// Real side-effect worth watching for on the next playtest, not claimed
// as fixed here: this may also be why the separate pedestal
// mob-vulnerability config read as "inconclusive" - ESM_EntityTargetBlock
// likely never got a real chance to fire while mobs kept re-acquiring a
// moving, always-reachable player instead of camping at a fixed point.
//
// No public getter for Mob's own goalSelector/targetSelector fields
// exists in this exact build - confirmed empirically, not assumed: a
// full reflection scan of all 790 public methods on a live Zombie found
// zero 0-arg GoalSelector-returning methods (they're plain protected
// fields, per the game's own SRG-mapped class data), so this reads them
// directly via Field#setAccessible(true) instead of a name-based getter.
// Also can't call GoalSelector#removeAllGoals(Predicate) directly -
// manually invoking a reflected Method doesn't get Rhino's usual
// JS-function-to-functional-interface coercion (that only happens on
// normal dot-syntax calls, where Rhino knows the target parameter type
// up front; a raw Method#invoke(Object,Object[]) call doesn't carry that
// context - threw a real "argument type mismatch" when tried). Removes
// goals one at a time via removeGoal(Goal) instead, using the actual
// Goal objects already in hand from iterating the selector's own
// contents - no functional-interface construction needed at all.
//
// The `java.*`/`Packages.*` global shorthand for referencing a class by
// name is disabled in this exact KubeJS build ("java() is no longer
// supported", KJS6) - gets a java.lang.Class.class reference the
// roundabout way instead (a Class object's own getClass() IS
// java.lang.Class), then finds+invokes its static forName(String) via
// the same by-shape reflection technique as everything else here.
//
// The target selector is identified by CONTENT, not by field
// declaration order (index 0 vs 1) - reflection doesn't guarantee field
// order across JVMs/compilations, even though it was stable within this
// session's own testing. A field only gets stripped if at least one of
// its current goals is a real instance of TargetGoal (vanilla's own
// common base class for every target-acquisition goal, including ESM's
// replacements) - the goal selector never legitimately contains one.
var GOAL_SELECTOR_TYPE = 'net.minecraft.world.entity.ai.goal.GoalSelector'
var TARGET_GOAL_TYPE = 'net.minecraft.world.entity.ai.goal.target.TargetGoal'
var GOAL_TYPE = 'net.minecraft.world.entity.ai.goal.Goal'

function findFieldsByType(startCls, typeName) {
  var found = []
  var cls = startCls
  while (cls != null) {
    var fields = cls.getDeclaredFields()
    for (var i = 0; i < fields.length; i++) {
      if (`${fields[i].getType().getName()}` === typeName) found.push(fields[i])
    }
    cls = cls.getSuperclass()
  }
  return found
}

function findMethodByShape(cls, paramCount, retTypeName, paramTypeName) {
  var methods = cls.getMethods()
  for (var i = 0; i < methods.length; i++) {
    var m = methods[i]
    var params = m.getParameterTypes()
    if (params.length !== paramCount) continue
    if (retTypeName && `${m.getReturnType().getName()}` !== retTypeName) continue
    if (paramCount === 1 && paramTypeName && `${params[0].getName()}` !== paramTypeName) continue
    return m
  }
  return null
}

// A Class object's own getClass() is always java.lang.Class - lets this
// reach Class.forName(String) (a static method) without the disabled
// `java.*` global, for any mob passed in.
function resolveClass(anyMob, className) {
  var classOfClass = anyMob.getClass().getClass()
  var forNameMethod = findMethodByShape(classOfClass, 1, 'java.lang.Class', 'java.lang.String')
  return forNameMethod.invoke(null, [className])
}

// Runs exactly once per mob, guarded by the td_retarget_stripped tag
// below - real reflection cost, not something to pay every throttled
// tick for every mob.
function stripAutoRetargeting(mob) {
  try {
    var targetGoalCls = resolveClass(mob, TARGET_GOAL_TYPE)
    var fields = findFieldsByType(mob.getClass(), GOAL_SELECTOR_TYPE)
    fields.forEach(function (field) {
      field.setAccessible(true)
      var selector = field.get(mob)
      var selCls = selector.getClass()
      var availGetter = findMethodByShape(selCls, 0, 'java.util.Set', null)
      var removeOne = findMethodByShape(selCls, 1, null, GOAL_TYPE)
      if (!availGetter || !removeOne) return

      var wrappedGoals = availGetter.invoke(selector, [])
      var wgGetGoal = null
      var goals = []
      var isTargetSelector = false
      var it = wrappedGoals.iterator()
      while (it.hasNext()) {
        var wrapped = it.next()
        if (!wgGetGoal) wgGetGoal = findMethodByShape(wrapped.getClass(), 0, GOAL_TYPE, null)
        var goal = wgGetGoal.invoke(wrapped, [])
        goals.push(goal)
        if (targetGoalCls.isInstance(goal)) isTargetSelector = true
      }
      if (!isTargetSelector) return
      goals.forEach(function (goal) { removeOne.invoke(selector, [goal]) })
    })
  } catch (e) {
    // Never let a reflection failure break the whole tick handler -
    // worst case this specific mob just keeps losing the setTarget race
    // like before this fix, not a hard crash for every player online.
    console.log('mob_aggro.js: stripAutoRetargeting failed: ' + e)
  }
}

// Full zombie-apocalypse roster pivot (2026-09-06) - real ids confirmed
// by decompilation, not pattern-guessed; see wave_spawner.js's own
// WAVE_MOB_TYPES for the full writeup (same list, redeclared here per
// this codebase's established cross-file duplication pattern - server_
// scripts don't reliably share top-level scope). Keep both in sync, plus
// wave_status.js's HOSTILE_TYPES, if this roster changes again.
var WAVE_MOB_TYPES = [
  'minecraft:zombie',
  'minecraft:husk',
  'minecraft:drowned',
  'minecraft:zombie_villager',
  'the_flesh_that_hates:flesh_human',
  'the_flesh_that_hates:flesh_villager',
  'the_flesh_that_hates:flesh_dog',
  'the_flesh_that_hates:plaquecreaturetwo',
  'the_flesh_that_hates:flesh_suffer',
  'the_flesh_that_hates:bruteplaquecreatureone',
  'the_flesh_that_hates:flesh_hunter_two',
  'the_flesh_that_hates:flesh_boomer',
  'undeadnights:elite_zombie',
  'undeadnights:horde_zombie',
  'undeadnights:demolition_zombie',
  'mutantszombies:zombie_brute',
  'mutantszombies:mutant_brute',
  'mutantszombies:rotten_mutant',
  'mutantszombies:crawler',
]

// Self-healing marker (2026-09-05, real backward-compat need, not
// speculative): the permanent marker is normally only ever summoned
// once, in playtest_starter_kit.js's login handler - but that handler
// is itself gated to run once per world ever, so any save already in
// progress when this retrofit shipped will never get one from there.
// Re-summons it here instead, throttled far slower than the aggro
// check below (once every 5 real seconds is plenty for something that
// should only ever be genuinely missing right after this exact
// deploy), at the pedestal's own permanent td_pedestalX/Y/Z - the same
// coordinate playtest_starter_kit.js already uses, so an existing
// save's already-built base needs zero manual fix-up. Also doubles as
// a real safety net going forward if the marker is ever lost some
// other way. forceload add is idempotent - safe to call again even if
// that same save's old amulet-gated toggle already added it.
function ensurePedestalMarker(player, level) {
  var data = player.persistentData
  if (!data.contains('td_pedestalX')) return

  var existing = level.getEntities().find(function (e) {
    return e.getTags().contains('td_pedestal_target')
  })
  if (existing) return

  var x = data.getInt('td_pedestalX')
  var y = data.getInt('td_pedestalY')
  var z = data.getInt('td_pedestalZ')
  var server = player.getServer()
  server.runCommandSilent(`summon minecraft:armor_stand ${x + 0.5} ${y + 1} ${z + 0.5} {Invisible:1b,NoGravity:1b,Marker:1b,PersistenceRequired:1b,Tags:["td_pedestal_target"]}`)
  server.runCommandSilent(`forceload add ${x - 96} ${z - 96} ${x + 96} ${z + 96}`)
}

PlayerEvents.tick(function (event) {
  var player = event.entity
  var level = player.getLevel()

  if (level.getTime() % 100 === 0) ensurePedestalMarker(player, level)

  if (level.getTime() % 10 !== 0) return

  var aggroTarget = level.getEntities().find(function (e) {
    return e.getTags().contains('td_pedestal_target')
  })
  if (!aggroTarget) return

  level.getEntities().forEach(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return
    // One-time per mob (any spawn origin - the deterministic wave_spawner.js
    // path and Undead Nights' own endless-phase spawn_horde both produce
    // WAVE_MOB_TYPES entities, and both need this) - see the real root
    // cause writeup above for why setTarget() alone was never enough.
    if (!e.getTags().contains('td_retarget_stripped')) {
      stripAutoRetargeting(e)
      e.getTags().add('td_retarget_stripped')
    }
    e.setTarget(aggroTarget)
  })
})
