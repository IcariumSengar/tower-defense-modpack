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
//
// **That last assumption was real but WRONG, found 2026-09-04 doing the
// live root-cause diagnosis this same report asked for.** A real user
// death in their actual save, plus 54 confirmed
// "stripAutoRetargeting failed" errors in the live log, prompted a
// faithful sandbox repro against real summoned mobs (both a vanilla
// zombie and one of today's new mutantszombies replacements) with
// step-by-step tracing. Two distinct real bugs found, not one:
// 1) ESM's own `ESM_EntityAINearestAttackableTarget` goal does NOT
//    extend vanilla's `TargetGoal` - confirmed directly via
//    `targetGoalCls.isInstance(goal)` returning false for it. Worse,
//    ESM splits its own re-targeting goals across BOTH GoalSelector-
//    typed fields, not just the "real" target selector: a live zombie's
//    goal-selector-shaped field held 13 goals including attack/wander/
//    dig/pillar behavior PLUS 2 stray ESM_EntityAINearestAttackableTarget
//    instances and ESM_EntityTargetBlock (the pedestal-vulnerability
//    goal, which must stay) all mixed together - none of those 13 are a
//    real TargetGoal instance, so the old `isTargetSelector` check
//    correctly found nothing there and skipped the WHOLE field,
//    silently leaving those 2 re-targeting goals live and active. The
//    OTHER field (the real target selector, holding vanilla
//    HurtByTargetGoal plus 5-6 more ESM_EntityAINearestAttackableTarget)
//    DID get correctly identified and fully stripped - so roughly a
//    quarter of each mob's own re-targeting AI survived every "successful"
//    strip, 100% reproducibly, not intermittently. Fixed below by
//    checking every goal's real identity directly (real TargetGoal
//    instance OR literally ESM_EntityAINearestAttackableTarget) instead
//    of gating a whole selector by whether it "looks like" the target
//    selector - ESM_EntityTargetBlock is explicitly excluded, it must
//    keep running for the pedestal-vulnerability feature.
// 2) The live log's 54 "Cannot call method 'getName' of undefined"
//    errors did NOT reproduce against either a vanilla zombie or a
//    mutantszombies mob in this same sandbox pass - real, not assumed:
//    every reflection step (GoalSelector's own method scan included)
//    resolved cleanly. That live log predates today's TFTH removal, when
//    TFTH mobs were still being summoned - plausible this crash was
//    specific to TFTH's own entity class hierarchy, which no longer
//    spawns at all now. Flagging as likely-but-not-confirmed-resolved,
//    not claiming it fixed outright - worth watching the next real
//    playtest's log for a recurrence now that TFTH mobs can't spawn.
var GOAL_SELECTOR_TYPE = 'net.minecraft.world.entity.ai.goal.GoalSelector'
var TARGET_GOAL_TYPE = 'net.minecraft.world.entity.ai.goal.target.TargetGoal'
var ESM_TARGET_GOAL_TYPE = 'funwayguy.epicsiegemod.ai.ESM_EntityAINearestAttackableTarget'
// Real live decision, 2026-09-04: "retaliate + block path" - stripping
// EVERY real TargetGoal instance (the original, blunt approach) also
// removed vanilla's own HurtByTargetGoal, which is what makes a mob
// fight back when the player hits it - a real, reported side effect
// ("mobs beelining for the pedestal now completely ignore the player,
// even mid-combat"). HurtByTargetGoal is now explicitly excluded from
// the strip below - kept alive so retaliation-when-hit still works via
// vanilla's own tested mechanic, without needing to hand-build that
// behavior. This file's own 10-tick setTarget(pedestal) reassertion
// still wins back the objective shortly after the player stops hitting
// the mob (whatever HurtByTargetGoal set the target to only holds until
// the next reassertion), so "objective priority holds once the player
// stops directly interfering" is preserved.
var HURT_BY_TARGET_TYPE = 'net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal'
// Real live report, 2026-09-04: "spitter's path seems off," right after
// the fix above shipped. Checked directly, not assumed - a sandbox
// repro against a real spitter found the strip working exactly as
// intended (only the 2 real re-targeting goals removed, its ranged
// attack goal untouched). The real explanation: decompiling
// ESM_EntityAIAttackRanged directly showed it reads the mob's own
// current setTarget()-assigned target for its own logic - so once
// forced onto the (stationary) pedestal, it does what it's actually
// coded to do: stop closing distance once in firing range and strafe
// side-to-side around that range instead of walking straight in. Real
// decision (not guessed): force melee close-in against the pedestal
// specifically, keep the strafe-and-shoot behavior intact against a
// player. Spitter already has a real ESM_EntityAIAttackMelee goal
// registered alongside the ranged one (confirmed live) - removing only
// the ranged goal lets the already-present melee one take over on its
// own, no new goal needs constructing via reflection.
var ESM_RANGED_ATTACK_TYPE = 'funwayguy.epicsiegemod.ai.ESM_EntityAIAttackRanged'
var GOAL_TYPE = 'net.minecraft.world.entity.ai.goal.Goal'

// **Real, function-name-prefixed 2026-09-04** (part of the same live
// root-cause diagnosis as the per-goal fix above): these 3 helpers used
// to be named findFieldsByType/findMethodByShape/resolveClass, plain
// and unprefixed. playtest_starter_kit.js independently declares its
// OWN findMethodByShape/resolveClass for its structure-proximity
// reflection - its own comment there claims this is safe because
// "server_scripts don't reliably share top-level var/const," but that's
// only half the real rule: top-level FUNCTIONS in this exact KubeJS/
// Rhino build DO reliably share across files, so the two same-named
// functions were silently colliding in one shared global slot, and
// whichever file's definition happened to load last (real, and not
// necessarily stable across reboots) silently overwrote the other's -
// playtest_starter_kit.js's own version uses an ARRAY 4th parameter
// (`paramTypeNames`, plural, iterated by `.length`), genuinely
// incompatible with this file's SINGLE-STRING 4th parameter. When
// mob_aggro.js's own call lost that race, a JS string got iterated
// character-by-character as if it were an array, indexing past the
// real 1-element params array and calling .getName() on the resulting
// undefined - a real, confirmed match for the "Cannot call method
// 'getName' of undefined" error found live (54 occurrences in one
// session's log) and reproduced directly in a sandbox once this exact
// collision was suspected and tested for. This is very likely the real,
// primary reason the whole stripAutoRetargeting fix never reliably held
// up in real play despite passing its own original sandbox
// verification - that verification predated playtest_starter_kit.js's
// later structure-proximity work adding the colliding names. Prefixing
// this file's own copies closes the collision for good, independent of
// load order.
function aggroFindFieldsByType(startCls, typeName) {
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

function aggroFindMethodByShape(cls, paramCount, retTypeName, paramTypeName) {
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
function aggroResolveClass(anyMob, className) {
  var classOfClass = anyMob.getClass().getClass()
  var forNameMethod = aggroFindMethodByShape(classOfClass, 1, 'java.lang.Class', 'java.lang.String')
  return forNameMethod.invoke(null, [className])
}

// Runs exactly once per mob, guarded by the td_retarget_stripped tag
// below - real reflection cost, not something to pay every throttled
// tick for every mob. This function only ever runs from the
// pedestal-targeting handler below, right before the mob's target is
// forced onto the pedestal marker - so removing the ranged-attack goal
// here is inherently scoped to "this mob is about to target the
// pedestal," not applied unconditionally. If a future change ever adds
// a real player-targeting path, it would call setTarget() from a
// different place and never reach this function, so Spitter's
// strafe-and-shoot behavior against an actual player is untouched.
function stripAutoRetargeting(mob) {
  try {
    var targetGoalCls = aggroResolveClass(mob, TARGET_GOAL_TYPE)
    // ESM's own classes may not exist if Epic Siege Mod were ever
    // removed - each resolved separately and tolerated as null (falls
    // back to skipping that specific check) rather than aborting the
    // whole strip.
    var esmTargetGoalCls = null
    try { esmTargetGoalCls = aggroResolveClass(mob, ESM_TARGET_GOAL_TYPE) } catch (eEsm) {}
    var esmRangedAttackCls = null
    try { esmRangedAttackCls = aggroResolveClass(mob, ESM_RANGED_ATTACK_TYPE) } catch (eEsm2) {}
    var hurtByTargetCls = aggroResolveClass(mob, HURT_BY_TARGET_TYPE)
    var fields = aggroFindFieldsByType(mob.getClass(), GOAL_SELECTOR_TYPE)
    fields.forEach(function (field) {
      field.setAccessible(true)
      var selector = field.get(mob)
      var selCls = selector.getClass()
      var availGetter = aggroFindMethodByShape(selCls, 0, 'java.util.Set', null)
      var removeOne = aggroFindMethodByShape(selCls, 1, null, GOAL_TYPE)
      if (!availGetter || !removeOne) return

      var wrappedGoals = availGetter.invoke(selector, [])
      var wgGetGoal = null
      var goalsToRemove = []
      var it = wrappedGoals.iterator()
      while (it.hasNext()) {
        var wrapped = it.next()
        if (!wgGetGoal) wgGetGoal = aggroFindMethodByShape(wrapped.getClass(), 0, GOAL_TYPE, null)
        var goal = wgGetGoal.invoke(wrapped, [])
        // Per-goal identity check, not a whole-selector gate (2026-09-04
        // fix - see the header comment above for the real bug this
        // replaced): ESM splits its own re-targeting goals across BOTH
        // selector fields, and its own goal class doesn't extend
        // vanilla's TargetGoal, so a selector-level "does this look like
        // the target selector" check silently missed some. Every goal in
        // every GoalSelector-typed field is checked individually instead.
        // ESM_EntityTargetBlock is deliberately NOT matched by either
        // check. **Correction, 2026-09-05**: this was originally kept
        // alive because it was assumed to drive real pedestal damage -
        // confirmed false, per pedestal_health.js's own header comment
        // ("real playtest confirmed it's still not damaging the
        // pedestal"). Real pedestal damage is that file's own separate
        // proximity-poll system, unrelated to this goal. Left
        // unstripped anyway since it's harmless (an idle mob just walks
        // up to the pedestal) and touching it has no real upside.
        // HurtByTargetGoal excluded explicitly (see HURT_BY_TARGET_TYPE's
        // own comment above) - it's a real TargetGoal instance, but kept
        // alive on purpose now for retaliate-when-hit.
        var isRealTargetGoal = targetGoalCls.isInstance(goal) && !hurtByTargetCls.isInstance(goal)
        var isEsmTargetGoal = esmTargetGoalCls && esmTargetGoalCls.isInstance(goal)
        // Real live report, 2026-09-04: force melee close-in against the
        // pedestal for ranged mobs (Spitter) instead of strafe-and-shoot
        // - see the ESM_RANGED_ATTACK_TYPE comment above. Spitter already
        // has a real melee attack goal registered alongside this one, so
        // removing just the ranged goal is enough for the melee one to
        // take over on its own.
        var isEsmRangedAttack = esmRangedAttackCls && esmRangedAttackCls.isInstance(goal)
        if (isRealTargetGoal || isEsmTargetGoal || isEsmRangedAttack) goalsToRemove.push(goal)
      }
      goalsToRemove.forEach(function (goal) { removeOne.invoke(selector, [goal]) })
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
// TFTH removed entirely 2026-09-04 (real playtest feedback) - see
// wave_spawner.js's WAVES header comment for the full replacement
// mapping/rationale.
var WAVE_MOB_TYPES = [
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

  // Real live decision, 2026-09-04: "retaliate + block path" - part 2.
  // HurtByTargetGoal (kept alive above) covers "fight back if hit," but
  // a player who just stands in a mob's way without ever hitting it
  // would still get silently walked through, since the mob's forced
  // target is always the pedestal regardless of who's physically
  // blocking the path. MELEE_BLOCK_RANGE (3.5 blocks - a little past
  // vanilla's own ~3-block melee reach, real margin for movement between
  // this handler's 10-tick throttle) checks distance to THIS player
  // specifically, not a level-wide nearest-player search - this pack is
  // single-player-focused (see base_expansion.js's own notes on the
  // same assumption), so re-using the handler's own `player` is
  // equivalent and cheaper. Reverts to the pedestal again on the very
  // next 10-tick cycle once the player is no longer in range - same
  // "objective priority holds once the player stops interfering" shape
  // as the HurtByTargetGoal side above.
  var MELEE_BLOCK_RANGE = 3.5
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
    var dx = e.getX() - player.getX()
    var dy = e.getY() - player.getY()
    var dz = e.getZ() - player.getZ()
    var isBlockingPath = dx * dx + dy * dy + dz * dz <= MELEE_BLOCK_RANGE * MELEE_BLOCK_RANGE
    var desiredTarget = isBlockingPath ? player : aggroTarget

    // Real fix, 2026-09-05 (live report + a real controlled sandbox
    // test: "walling off the base is easy" - wave-6+ digger/climber
    // mobs never actually breach a wall despite the correctly-extended
    // ESM roster config). Root cause, confirmed by decompiling
    // ESM_EntityAIDigging.canUse() directly: it requires
    // `digger.getNavigation().isDone()` before it will even consider
    // digging - i.e. the mob's own pathfinding has to have genuinely
    // given up first. Calling setTarget() unconditionally every 10
    // ticks (this handler's own throttle), even when the target hasn't
    // actually changed, very likely keeps re-triggering the mob's
    // attack-goal pathfinding attempt against the same unreachable
    // target - so the navigator never settles into "done" long enough
    // for the digger goal's own precondition to pass. Comparing by UUID
    // rather than object identity - KubeJS entity wrappers aren't
    // guaranteed to be the same object across two separate
    // getTarget()/variable reads even for the same real underlying
    // entity. Still re-asserts every 10 ticks if something else
    // actually changed the target (the original "enforce forced
    // targeting" safety net this handler exists for), just skips the
    // call entirely when nothing needs to change.
    var currentTarget = e.getTarget()
    var currentTargetUuid = currentTarget ? `${currentTarget.uuid}` : null
    if (currentTargetUuid !== `${desiredTarget.uuid}`) {
      e.setTarget(desiredTarget)
    }
  })
})
