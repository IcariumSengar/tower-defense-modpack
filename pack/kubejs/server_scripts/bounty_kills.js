// "Bounties" quest chapter (bounties.snbt) - persistent hostile-kill
// counter, real trap/turret kills included on purpose (2026-09-05).
//
// Real design constraint, not guessed: decompiled every trap currently in
// this pack (Trapcraft's SpikesBlock/BearTrapTileEntity, Create Addition's
// BarbedWireBlock) and NONE of them attach a killer entity to their damage
// source - Spikes uses `damageSources().cactus()`, Bear Trap uses
// `damageSources().mobAttack(null)`, Barbed Wire uses its own custom
// "createaddition:barbed_wire" type. All three are anonymous/no-attacker by
// design. That rules out "does this death have a known killer entity" as
// the inclusion test - it would silently exclude every trap kill that
// exists in this pack today, which is exactly the outcome this chapter is
// supposed to reward.
//
// Real fix: classify by the damage TYPE's registry id instead of by
// attacker, and default to counting - only exclude a small, genuinely-no-
// cause blocklist (fire, drowning, falling, starving, freezing, void,
// cramming, suffocation, and /kill-style generic_kill). Any current trap/
// turret's own damage type, and any future one a new mod adds, counts
// automatically with zero code change needed when the trap/turret roster
// changes - the same property the mob-side roster below still can't have.
//
// Confirmed live in a sandbox (not assumed): `event.source.typeHolder().
// unwrapKey().get().location()` reliably returns the real registry id
// ("minecraft:generic_kill", "minecraft:in_wall", etc.) even though
// `getMsgId()`/`getEntity()`/`getDirectEntity()` all fail from Rhino in
// this build - a different slice of the same curated-dispatch gap already
// documented elsewhere in this codebase. MobCategory has the identical gap
// on the entity side (`entity.type.category`/`.getCategory()` both fail
// live, matching no_passive_mobs.js's own finding for the passive-mob
// case), so HOSTILE_TYPES below stays a real hand-maintained id list, same
// as every other copy of it in this codebase - that part of the ask isn't
// achievable in this exact build, flagged rather than silently skipped.

// Same list as wave_status.js's HOSTILE_TYPES/wave_spawner.js/
// pedestal_health.js/loot_bag_drops.js/flesh_death_sound.js/mob_aggro.js/
// epicsiegemod-common.toml - keep in sync if the roster changes again.
// Named uniquely (not "HOSTILE_TYPES") - confirmed live this session that
// top-level var/const DOES share scope across server_scripts in this
// build (despite the older belief otherwise), and reusing that exact name
// crashed wave_status.js on boot with "redeclaration of var HOSTILE_TYPES"
// the first time this file was tested. Every other file's own roster copy
// already uses a distinct name for the same reason (WAVE_MOB_TYPES,
// PEDESTAL_WAVE_MOB_TYPES, EPIC_MOBS, HIGH_TIER_DEATH_SOUND_TYPES) - this
// one just hadn't been caught yet since nothing had collided with the
// literal name "HOSTILE_TYPES" itself until now.
var BOUNTY_HOSTILE_TYPES = [
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

// Real vanilla damage_type registry ids with no player/defense involvement
// at all - checked directly against the actual 1.20.1 data/minecraft/
// damage_type registry, not guessed. generic_kill is what /kill and
// /tdforceclear-style commands produce - deliberately excluded so admin/
// debug kills don't inflate the tally.
var BOUNTY_EXCLUDED_DAMAGE_TYPES = [
  'minecraft:in_fire',
  'minecraft:on_fire',
  'minecraft:lava',
  'minecraft:drown',
  'minecraft:starve',
  'minecraft:freeze',
  'minecraft:fall',
  'minecraft:out_of_world',
  'minecraft:cramming',
  'minecraft:in_wall',
  'minecraft:generic_kill',
]

// bounties.snbt's tasks are `type: "custom"`, not "checkmark" (2026-09-08
// fix, real ask: bounties should complete on the kill event, not be
// clickable). Decompiled dev/ftb/mods/ftbquests/quest/task/CheckmarkTask
// directly: its canSubmit() is hardcoded `return true` - any player could
// click a checkmark bounty complete for free, no kills required. CustomTask
// defaults enableButton=false (no player click possible) and check=null
// (no periodic auto-check either) - completely inert until something
// external drives it, exactly this file's `ftbquests change_progress
// ... complete` below, which calls Task's own type-agnostic
// forceProgress() and doesn't care what task type it's hitting.
var BOUNTY_OBJECTIVE = 'td_hostile_kills'
var BOUNTY_MOD_OBJECTIVE = 'td_bountyMod1500'
var BOUNTY_REPEATABLE_INTERVAL = 1500
var BOUNTY_REPEATABLE_TASK_ID = '1355429CD45AF725'

// Fixed one-time tiers - bounties.snbt's own quest ids.
var BOUNTY_FIXED_TIERS = [
  { threshold: 25, taskId: '42F2080CC88FFF1F' },
  { threshold: 100, taskId: 'A690E47C2C2FFDB5' },
  { threshold: 300, taskId: '57C0DB55E9655079' },
  { threshold: 750, taskId: '81F132C101C25BDA' },
]

ServerEvents.loaded((event) => {
  var server = event.server
  server.runCommandSilent(`scoreboard objectives add ${BOUNTY_OBJECTIVE} dummy {"text":"Hostile Kills"}`)
  // Scratch objective for the repeatable tier's modulo check below - never
  // displayed, holds a working copy of the kill count plus a fake-player
  // literal-value holder (#const) for the vanilla scoreboard-math idiom
  // (`operation ... %=` needs a real score on both sides, not a literal).
  server.runCommandSilent(`scoreboard objectives add ${BOUNTY_MOD_OBJECTIVE} dummy`)
  server.runCommandSilent(`scoreboard players set #const ${BOUNTY_MOD_OBJECTIVE} ${BOUNTY_REPEATABLE_INTERVAL}`)
})

function bountyDamageTypeId(source) {
  try {
    return `${source.typeHolder().unwrapKey().get().location()}`
  } catch (e) {
    return null
  }
}

EntityEvents.death((event) => {
  var entity = event.entity
  if (!BOUNTY_HOSTILE_TYPES.includes(`${entity.type}`)) return

  var typeId = bountyDamageTypeId(event.source)
  if (typeId !== null && BOUNTY_EXCLUDED_DAMAGE_TYPES.includes(typeId)) return

  var server = event.level.getServer()
  server.runCommandSilent(`scoreboard players add @a ${BOUNTY_OBJECTIVE} 1`)

  // JS-readable copy of the same running total, world-scoped like every
  // other piece of wave state in this pack (worldData/findWorldStateEntity,
  // shared from world_state.js) - kept purely so the progress-display tick
  // handler below has a real number to work with. KubeJS has no binding to
  // read a vanilla scoreboard score back into a script (checked - nothing
  // on EntityKJS/PlayerKJS exposes one), so the scoreboard objective above
  // and this int can't just be the same storage; they're driven by the
  // same kill events so they can't drift apart either.
  var bqData = worldData(event.level)
  if (bqData) bqData.putInt('td_bountyKillCount', bqData.getInt('td_bountyKillCount') + 1)

  // Exact-score match, not a range - kills only ever increment by 1, so
  // the score passes through each threshold exactly once. Avoids re-
  // issuing `change_progress complete` on every kill for the rest of the
  // game once a tier is already past.
  BOUNTY_FIXED_TIERS.forEach((tier) => {
    server.runCommandSilent(
      `execute as @a[scores={${BOUNTY_OBJECTIVE}=${tier.threshold}}] run ftbquests change_progress @s complete ${tier.taskId}`
    )
  })

  // Repeatable tier - pure vanilla scoreboard math (copy kill count into a
  // scratch objective, mod by the interval, check for an exact 0) rather
  // than a script-side claims counter, so this can't drift out of sync
  // with the real running kill total.
  server.runCommandSilent(`execute as @a run scoreboard players operation @s ${BOUNTY_MOD_OBJECTIVE} = @s ${BOUNTY_OBJECTIVE}`)
  server.runCommandSilent(`execute as @a run scoreboard players operation @s ${BOUNTY_MOD_OBJECTIVE} %= #const ${BOUNTY_MOD_OBJECTIVE}`)
  server.runCommandSilent(
    `execute as @a[scores={${BOUNTY_MOD_OBJECTIVE}=0}] run ftbquests change_progress @s complete ${BOUNTY_REPEATABLE_TASK_ID}`
  )
})

// Live progress display (2026-09-09, real playtest ask: "can the bounty
// quests have a counter on them like 1/25 killed, at the moment its just
// a colourful circle with the word custom on it"). Decompiled FTB Quests
// 2001.4.22 directly - the only script-facing command is `/ftbquests
// change_progress <players> complete|reset <id>`, no "set progress to N"
// subcommand exists in this version, which is why the `complete` calls
// above only ever flip a task from 0 to fully done with nothing showing
// in between. CustomTask does support a real max_progress + progress bar
// (now set per-task in bounties.snbt) - it's just never been populated
// because nothing calls the set-progress command that doesn't exist.
//
// Fix: reach `TeamData.setProgress(Task, long)` directly via reflection,
// the same Class.forName bootstrap this codebase already uses elsewhere
// (mob_aggro.js's own resolveClass / loot_bag_notification.js's
// punResolveClass) since java.*/Packages.* is disabled in this Rhino
// build. Named with a bq prefix, not shared with those other files' own
// copies - top-level var/const don't share scope across server_scripts
// in this exact build (confirmed elsewhere in this codebase already),
// only top-level FUNCTIONS do.
function bqResolveClass(anyObj, className) {
  var classOfClass = anyObj.getClass().getClass()
  var methods = classOfClass.getMethods()
  for (var i = 0; i < methods.length; i++) {
    var m = methods[i]
    var params = m.getParameterTypes()
    if (params.length === 1 && `${m.getReturnType().getName()}` === 'java.lang.Class' && `${params[0].getName()}` === 'java.lang.String') {
      return m.invoke(null, [className])
    }
  }
  return null
}

var bqProgressAvailable = true
var bqProgressInitDone = false
var bqServerQuestFileInstance = null
var bqGetOrCreateTeamDataMethod = null
var bqIsCompletedMethod = null
var bqSetProgressMethod = null
var bqLongValueOfMethod = null
// {task: <CustomTask>, threshold: <number>} per fixed tier, plus the
// repeatable task on its own - resolved once at init via ServerQuestFile's
// own getBase(long), not re-looked-up on every kill. threshold itself
// stays a plain JS number (max 1500, nowhere near the 2^53 safe-integer
// ceiling that ruled out parseInt for the ids themselves) - it only ever
// gets boxed via bqBoxLong() right before crossing into a reflective call.
var bqFixedTierTasks = []
var bqRepeatableTask = null

// A raw Method#invoke(Object, Object[]) call is genuine Java reflection,
// not Rhino's own normal dot-call dispatch - Rhino can't inspect the
// target parameter's declared type through it (same real gap this
// codebase already hit and documented for functional-interface
// coercion, mob_aggro.js's own header comment), so a plain JS number
// gets boxed as java.lang.Double for the call's Object[] args, and
// setProgress's own `long` parameter would reject that with a real
// IllegalArgumentException at runtime - a Double, unlike a Long, isn't
// auto-unboxed to `long`. Routed through Long.valueOf(String) instead
// (unambiguous - String isn't a primitive type reflection could get
// wrong), same rigor as parseHexId above for the ids themselves.
function bqBoxLong(n) {
  return bqLongValueOfMethod.invoke(null, [`${n}`])
}

function bqInitProgressReflection(anyObj) {
  if (bqProgressInitDone) return
  bqProgressInitDone = true
  try {
    var serverQuestFileCls = bqResolveClass(anyObj, 'dev.ftb.mods.ftbquests.quest.ServerQuestFile')
    var teamDataCls = bqResolveClass(anyObj, 'dev.ftb.mods.ftbquests.quest.TeamData')
    var taskCls = bqResolveClass(anyObj, 'dev.ftb.mods.ftbquests.quest.task.Task')
    var questObjectCls = bqResolveClass(anyObj, 'dev.ftb.mods.ftbquests.quest.QuestObject')
    var questObjectBaseCls = bqResolveClass(anyObj, 'dev.ftb.mods.ftbquests.quest.QuestObjectBase')
    var entityCls = bqResolveClass(anyObj, 'net.minecraft.world.entity.Entity')
    var stringCls = bqResolveClass(anyObj, 'java.lang.String')
    var optionalCls = bqResolveClass(anyObj, 'java.util.Optional')
    var longCls = bqResolveClass(anyObj, 'java.lang.Long')
    var longPrimitiveCls = longCls.getField('TYPE').get(null)

    bqServerQuestFileInstance = serverQuestFileCls.getField('INSTANCE').get(null)
    var getBaseMethod = serverQuestFileCls.getMethod('getBase', [longPrimitiveCls])
    bqGetOrCreateTeamDataMethod = serverQuestFileCls.getMethod('getOrCreateTeamData', [entityCls])
    bqIsCompletedMethod = teamDataCls.getMethod('isCompleted', [questObjectCls])
    bqSetProgressMethod = teamDataCls.getMethod('setProgress', [taskCls, longPrimitiveCls])
    bqLongValueOfMethod = longCls.getMethod('valueOf', [stringCls])

    // Hex quest-object ids are real 64-bit values (e.g.
    // "42F2080CC88FFF1F") - well beyond JS's safe-integer range, so this
    // uses FTB Quests' own QuestObjectBase.parseHexId(String) (the exact
    // method FTBQuestsCommands itself calls to turn a command's hex-id
    // argument into a real long) instead of a lossy parseInt(id, 16), to
    // resolve each task's actual Java object once via getBase(long).
    var parseHexIdMethod = questObjectBaseCls.getMethod('parseHexId', [stringCls])
    var optionalGetMethod = optionalCls.getMethod('get', [])

    function bqTaskForId(hexId) {
      var optionalLong = parseHexIdMethod.invoke(null, [hexId])
      var idLong = optionalGetMethod.invoke(optionalLong, [])
      return getBaseMethod.invoke(bqServerQuestFileInstance, [idLong])
    }

    BOUNTY_FIXED_TIERS.forEach((tier) => {
      bqFixedTierTasks.push({ task: bqTaskForId(tier.taskId), threshold: tier.threshold })
    })
    bqRepeatableTask = bqTaskForId(BOUNTY_REPEATABLE_TASK_ID)
  } catch (e) {
    bqProgressAvailable = false
    console.log(`[bounty_kills] progress-display reflection unavailable: ${e}`)
  }
}

function bqSyncPlayerProgress(player, killCount) {
  bqInitProgressReflection(player)
  if (!bqProgressAvailable) return
  try {
    var teamData = bqGetOrCreateTeamDataMethod.invoke(bqServerQuestFileInstance, [player])

    // isCompleted's real return type is a primitive `boolean` - Java
    // autoboxes it to a Boolean crossing back through invoke()'s own
    // Object return type, but this codebase doesn't trust raw truthiness
    // on a value that came back through a generic-Object reflective call
    // (a non-null wrapper object is always JS-truthy regardless of the
    // boolean it actually holds, if Rhino doesn't unwrap it here the same
    // way it does for a normal dot-call). Stringified and compared
    // instead, the same defensive idiom this codebase already uses
    // everywhere else for values crossing an uncertain Java/JS boundary
    // (`` `${entity.type}` ``, `` `${source.typeHolder()...}` ``) -
    // correct either way, since Boolean#toString() is exactly "true"/
    // "false" regardless of how Rhino wrapped it.
    bqFixedTierTasks.forEach((entry) => {
      // Skip once already completed - the `complete` calls in
      // EntityEvents.death above are still what actually finishes a
      // tier and grants its rewards; this only ever fills the bar in
      // between, and must never fight a completed task back toward a
      // recomputed value (killCount keeps climbing past every earlier
      // tier's own threshold for the rest of the game).
      if (`${bqIsCompletedMethod.invoke(teamData, [entry.task])}` === 'true') return
      bqSetProgressMethod.invoke(teamData, [entry.task, bqBoxLong(Math.min(killCount, entry.threshold))])
    })

    // Repeatable tier - same modulo the scoreboard math already uses, so
    // this can't drift from the real running total either. A completed-
    // but-not-yet-reset repeatable task is left alone for the same reason
    // as the fixed tiers above.
    if (`${bqIsCompletedMethod.invoke(teamData, [bqRepeatableTask])}` !== 'true') {
      bqSetProgressMethod.invoke(teamData, [bqRepeatableTask, bqBoxLong(killCount % BOUNTY_REPEATABLE_INTERVAL)])
    }
  } catch (e) {
    console.log(`[bounty_kills] progress-display sync failed: ${e}`)
  }
}

// Throttled to every 10 ticks (matches pedestal_health.js's own polling
// cadence) rather than every tick - this is a display-only sync, not
// something that needs to be frame-perfect, and the actual tier-complete
// calls in EntityEvents.death above already fire immediately on the real
// kill event regardless of this handler's own cadence.
PlayerEvents.tick((event) => {
  if (event.player.getLevel().getTime() % 10 !== 0) return
  var data = worldData(event.player.getLevel())
  if (!data) return
  bqSyncPlayerProgress(event.player, data.getInt('td_bountyKillCount'))
})
