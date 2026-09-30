// Points wave mobs at the pedestal. Only WAVE_MOB_TYPES entities tagged
// td_wave_mob are touched, never structure mobs. Every 10 ticks, while any
// player is in the overworld, each wave mob inside the world border targets
// the first of:
//   - the nearest live player within MELEE_BLOCK_RANGE (standing in its way);
//   - a live player who hit it, for AGGRO_RETALIATION_TICKS;
//   - the nearest Lure Block within LURE_ATTRACT_RADIUS (lure_block.js);
//   - the permanent td_pedestal_target marker (world_state.js).
// Wave mobs beyond STRAY_DISTANCE go back to wave_spawner.js's spawn band.
//
// setTarget() alone does not stick: Epic Siege Mod replaces vanilla target
// selection with goals that keep retargeting nearby players.
// stripAutoRetargeting() removes them, along with every TargetGoal except
// HurtByTargetGoal, once per mob each time it joins the level.
//
// Class names used by stripAutoRetargeting():
var GOAL_SELECTOR_TYPE = 'net.minecraft.world.entity.ai.goal.GoalSelector'
var TARGET_GOAL_TYPE = 'net.minecraft.world.entity.ai.goal.target.TargetGoal'
var ESM_TARGET_GOAL_TYPE = 'funwayguy.epicsiegemod.ai.ESM_EntityAINearestAttackableTarget'
var HURT_BY_TARGET_TYPE = 'net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal'
var ESM_RANGED_ATTACK_TYPE = 'funwayguy.epicsiegemod.ai.ESM_EntityAIAttackRanged'
var GOAL_TYPE = 'net.minecraft.world.entity.ai.goal.Goal'

// Reflection helpers. Mob has no getter for its goal selectors, and
// Minecraft member names are SRG-obfuscated at runtime, so fields are found
// by type and methods by signature. The aggro prefix matters: all server
// scripts share one top-level scope, and playtest_starter_kit.js has its own
// findMethodByShape() and resolveClass() with different parameters.
//
// Fields of the given type declared on the class or any superclass.
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

// First public method (inherited included) with paramCount parameters and the
// given return and (one-parameter only) parameter type; null matches any.
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

// Class.forName(className). The java.* and Packages.* globals do not exist
// in this Rhino build, so it is reached by reflection: the class of any
// Class object is java.lang.Class.
function aggroResolveClass(anyMob, className) {
  var classOfClass = anyMob.getClass().getClass()
  var forNameMethod = aggroFindMethodByShape(classOfClass, 1, 'java.lang.Class', 'java.lang.String')
  return forNameMethod.invoke(null, [className])
}

// Removes a mob's automatic targeting so that only this file, and
// HurtByTargetGoal, decide what it attacks. Reflection is slow, so the tick
// handler calls this once per mob and tags it td_retarget_stripped; the
// spawned handler below clears the tag when the mob is loaded again.
//
// Every goal in every GoalSelector field is checked, not just
// targetSelector: ESM_EntityAINearestAttackableTarget does not extend
// TargetGoal, and ESM adds some of them to goalSelector too. Movement,
// melee, digging and pillaring goals are not matched and stay.
function stripAutoRetargeting(mob) {
  try {
    var targetGoalCls = aggroResolveClass(mob, TARGET_GOAL_TYPE)
    // Null when Epic Siege Mod is not installed; its checks are then skipped.
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
      // getAvailableGoals() and removeGoal(Goal). Goals are removed one by one
      // because removeAllGoals(Predicate) would need a JS function coerced to a
      // Predicate, and Method#invoke does not do that coercion.
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
        // TargetGoals go, except HurtByTargetGoal, so a mob still turns on
        // whoever hits it; the tick handler bounds how long that lasts.
        var isRealTargetGoal = targetGoalCls.isInstance(goal) && !hurtByTargetCls.isInstance(goal)
        var isEsmTargetGoal = esmTargetGoalCls && esmTargetGoalCls.isInstance(goal)
        // ESM's ranged attack goal goes too: against the stationary pedestal
        // it stops at firing range and strafes instead of closing in. A mob
        // that also has a melee goal falls back to it. The removal is
        // permanent, so the mob does not shoot at players either. ESM only
        // gives this goal to mobs using vanilla's plain RangedAttackGoal; no
        // current roster mob does.
        var isEsmRangedAttack = esmRangedAttackCls && esmRangedAttackCls.isInstance(goal)
        if (isRealTargetGoal || isEsmTargetGoal || isEsmRangedAttack) goalsToRemove.push(goal)
      }
      goalsToRemove.forEach(function (goal) { removeOne.invoke(selector, [goal]) })
    })
  } catch (e) {
    // Logged, not rethrown, so one bad mob cannot break the tick handler.
    // The caller tags the mob anyway, so a failed strip is not retried.
    console.log('mob_aggro.js: stripAutoRetargeting failed: ' + e)
  }
}

// Blocks from the pedestal, horizontal.
var STRAY_DISTANCE = 90
var STRAY_DISTANCE_SQ = STRAY_DISTANCE * STRAY_DISTANCE
var STRAY_CHECK_INTERVAL = 100 // ticks (5 s); a multiple of the 10-tick pass

var AGGRO_RETALIATION_TICKS = 160 // 8 s
var aggroRetaliation = {} // mob uuid -> game time its retaliation window ends
var aggroPassLastTick = -1

// Goals are not saved: a wave mob loaded back from disk (restart, chunk reload)
// has its default target goals again, and Epic Siege Mod skips mobs loaded from
// disk. Clearing the tag makes the tick handler strip it again.
// EntityEvents.spawned fires for disk loads as well as new spawns.
EntityEvents.spawned(function (event) {
  var tags = event.getEntity().getTags()
  if (tags.contains('td_retarget_stripped')) tags.remove('td_retarget_stripped')
})

// True when the player with this uuid is the mob's last attacker. Vanilla
// clears that 100 ticks after the hit.
function aggroLastHurtBy(mob, playerUuid) {
  var attacker = mob.getLastHurtByMob()
  return attacker != null && `${attacker.uuid}` === playerUuid
}

PlayerEvents.tick(function (event) {
  var level = event.entity.getLevel()
  var now = Number(level.getTime())
  if (now % 10 !== 0) return
  // The marker and the wave mobs are in the overworld. Game time is shared by
  // every dimension, and PlayerEvents.tick runs once per online player, so the
  // first overworld player of the tick runs the pass for everyone.
  if (`${level.dimension}` !== 'minecraft:overworld') return
  if (now === aggroPassLastTick) return
  aggroPassLastTick = now

  var aggroTarget = findWorldStateEntity(level)
  if (!aggroTarget) return

  var server = event.entity.getServer()
  var checkStrayThisTick = now % STRAY_CHECK_INTERVAL === 0

  // Blocks, 3D. A little over a player's 3-block reach, allowing for movement
  // between passes.
  var MELEE_BLOCK_RANGE = 3.5
  // A dead player keeps ticking at the death-screen position; without the
  // health check, mobs standing on the body would target it indefinitely.
  var livePlayers = []
  level.getPlayers().forEach(function (p) {
    if (p.getHealth() > 0) livePlayers.push(p)
  })
  var border = level.getWorldBorder()
  var borderMinX = border.getMinX()
  var borderMaxX = border.getMaxX()
  var borderMinZ = border.getMinZ()
  var borderMaxZ = border.getMaxZ()
  level.getEntities().forEach(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return
    // Structure guards and untagged roster mobs (baked into structures or from
    // spawners) keep their own AI. td_wave_mob comes from wave_spawner.js,
    // including Undead Nights hordes via tdTagHordeMobs, and boss_wave.js.
    if (e.getTags().contains('td_structure_guard')) return
    if (!e.getTags().contains('td_wave_mob')) return
    var ex = e.getX()
    var ey = e.getY()
    var ez = e.getZ()

    // Stray correction. It runs before the border test, so strays outside the
    // border come back too, to a fresh point in wave_spawner.js's spawn band.
    // spreadplayers (max range 4, allowed for by TD_SPAWN_BORDER_MARGIN in
    // wave_spawner.js) lands the mob on safe ground; if it finds none, the mob
    // stays put until the next check.
    if (checkStrayThisTick) {
      var dxp = ex - aggroTarget.getX()
      var dzp = ez - aggroTarget.getZ()
      if (dxp * dxp + dzp * dzp > STRAY_DISTANCE_SQ) {
        var back = tdSpawnBandPoint(tdWaveSpawnBand(level), tdCompoundSpawnRect(aggroTarget.persistentData), aggroTarget.getX(), aggroTarget.getZ())
        // spreadplayers takes an entity selector, so a raw UUID works here;
        // only players-only arguments reject one.
        server.runCommandSilent(`spreadplayers ${back.x} ${back.z} 0 4 false ${e.uuid}`)
        return
      }
    }

    // Mobs outside the world border are left alone: they cannot path to the
    // pedestal from there, and with their targeting stripped they would stand
    // idle. They are handled once the border grows past them.
    if (ex < borderMinX || ex > borderMaxX || ez < borderMinZ || ez > borderMaxZ) return
    if (!e.getTags().contains('td_retarget_stripped')) {
      stripAutoRetargeting(e)
      e.getTags().add('td_retarget_stripped')
    }

    // The nearest live player within MELEE_BLOCK_RANGE is standing in its way.
    var blocker = null
    var blockerDistSq = MELEE_BLOCK_RANGE * MELEE_BLOCK_RANGE
    for (var i = 0; i < livePlayers.length; i++) {
      var p = livePlayers[i]
      var dx = ex - p.getX()
      var dy = ey - p.getY()
      var dz = ez - p.getZ()
      var distSq = dx * dx + dy * dy + dz * dz
      if (distSq > blockerDistSq) continue
      blocker = p
      blockerDistSq = distSq
    }

    var nearbyLure = blocker ? null : nearestActiveLure(level, ex, ez, LURE_ATTRACT_RADIUS)
    var desiredTarget = blocker || nearbyLure || aggroTarget

    // Retaliation. HurtByTargetGoal gives a stripped wave mob the player who hit
    // it. A window opens only when the mob's current player target is also its
    // last attacker, so a target left from the blocking rule goes back to the
    // lure or pedestal on the next pass. The target is kept over any lure or
    // the pedestal for AGGRO_RETALIATION_TICKS from the pass that opens the
    // window; later hits do not extend it.
    var currentTarget = e.getTarget()
    var currentTargetUuid = currentTarget ? `${currentTarget.uuid}` : null
    var mobUuid = `${e.uuid}`
    if (!blocker && currentTarget && `${currentTarget.type}` === 'minecraft:player' && currentTarget.getHealth() > 0) {
      var retaliateUntil = aggroRetaliation[mobUuid]
      if (retaliateUntil === undefined && aggroLastHurtBy(e, currentTargetUuid)) {
        retaliateUntil = now + AGGRO_RETALIATION_TICKS
        aggroRetaliation[mobUuid] = retaliateUntil
      }
      if (retaliateUntil !== undefined && now < retaliateUntil) {
        desiredTarget = currentTarget
      } else {
        delete aggroRetaliation[mobUuid]
      }
    } else if (aggroRetaliation[mobUuid] !== undefined) {
      delete aggroRetaliation[mobUuid]
    }

    // setTarget() only when the target changes. ESM's digging goal starts
    // only once the mob's navigation is done, and resetting the target every
    // pass could keep that from happening.
    if (currentTargetUuid !== `${desiredTarget.uuid}`) {
      e.setTarget(desiredTarget)
    }
  })
})
