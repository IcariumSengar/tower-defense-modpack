// Bounties chapter (config/ftbquests/quests/chapters/bounties.snbt).
//
// Each td_wave_mob death adds one to the world kill count td_bountyKillCount
// in worldData() (world_state.js), the only bounty counter. Structure mobs and
// guards never count, and neither do environmental deaths or /kill
// (BOUNTY_EXCLUDED_DAMAGE_TYPES). Deaths are classified by damage type rather
// than by killer because trap damage often has no attacking entity (the
// fence shock in wave_mob_fence_shock.js has none).
//
// When the count reaches a tier's threshold, /ftbquests change_progress
// completes it for everyone online; the repeatable Zombie Masher completes the
// same way at every multiple of BOUNTY_REPEATABLE_INTERVAL. FTB Quests keeps
// progress per quest team, so a party is paid once. bqSyncPlayerProgress()
// fills the bars in between and completes whatever a player's team missed
// while nobody in it was online.

// Damage type ids that don't count: environmental deaths, plus generic_kill
// from /kill and /tdforceclear. Fire and lava do count: the Chemthrower Turret
// and the Simple Guns flamethrower kill by burning, and lava moats by lava.
var BOUNTY_EXCLUDED_DAMAGE_TYPES = [
  'minecraft:drown',
  'minecraft:starve',
  'minecraft:freeze',
  'minecraft:fall',
  'minecraft:out_of_world',
  'minecraft:cramming',
  'minecraft:in_wall',
  'minecraft:generic_kill',
]

var BOUNTY_REPEATABLE_INTERVAL = 1500
var BOUNTY_REPEATABLE_TASK_ID = '1355429CD45AF725'

// One-time tiers. taskId is the tier's task in bounties.snbt; those tasks are
// type custom, so players can't tick them off by hand. title only feeds the
// chat notice.
var BOUNTY_FIXED_TIERS = [
  { threshold: 25, taskId: '42F2080CC88FFF1F', title: 'First Blood' },
  { threshold: 100, taskId: '23C4C36D29BF9EDF', title: 'Exterminator' },
  { threshold: 300, taskId: '57C0DB55E9655079', title: 'Culling' },
  { threshold: 750, taskId: '1CB86244570F2424', title: 'Reaper' },
]
var BOUNTY_REPEATABLE_TITLE = 'Zombie Masher'

// The damage type's registry id (e.g. minecraft:on_fire), or null if it
// can't be read. A null type counts. Read through typeHolder() because
// getMsgId(), getEntity() and getDirectEntity() fail from Rhino in this build.
function bountyDamageTypeId(source) {
  try {
    return `${source.typeHolder().unwrapKey().get().location()}`
  } catch (e) {
    return null
  }
}

EntityEvents.death((event) => {
  var entity = event.entity
  // Only wave mobs count, never a structure spawner's mobs, which could farm
  // the repeatable Zombie Masher.
  if (!entity.getTags().contains('td_wave_mob')) return
  var typeId = bountyDamageTypeId(event.source)
  if (typeId !== null && BOUNTY_EXCLUDED_DAMAGE_TYPES.includes(typeId)) return

  var bqData = worldData(event.level)
  if (!bqData) return
  var kills = bqData.getInt('td_bountyKillCount') + 1
  bqData.putInt('td_bountyKillCount', kills)

  // Kills only rise by one, so each threshold is met once.
  var server = event.level.getServer()
  BOUNTY_FIXED_TIERS.forEach((tier) => {
    if (kills !== tier.threshold) return
    server.runCommandSilent(`ftbquests change_progress @a complete ${tier.taskId}`)
    server.runCommandSilent(`tellraw @a {"text":"[Bounty] ${tier.title} complete - ${tier.threshold} kills.","color":"gold"}`)
  })
  if (kills % BOUNTY_REPEATABLE_INTERVAL === 0) {
    server.runCommandSilent(`ftbquests change_progress @a complete ${BOUNTY_REPEATABLE_TASK_ID}`)
    server.runCommandSilent(`tellraw @a {"text":"[Bounty] ${BOUNTY_REPEATABLE_TITLE} complete - another ${BOUNTY_REPEATABLE_INTERVAL} kills banked.","color":"gold"}`)
  }
})

// Progress bars. change_progress can only complete or reset a task, so the
// count in between is written with FTB Quests' TeamData.setProgress through
// reflection. FTB Quests isn't obfuscated, so its members resolve by name.
//
// Looks up a class through Class.forName(String), found by signature
// because java.* is disabled in this Rhino build.
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

// Reflection state and handles, set by bqInitProgressReflection().
var bqProgressAvailable = true
var bqProgressInitDone = false
var bqServerQuestFileInstance = null
var bqGetOrCreateTeamDataMethod = null
var bqIsCompletedMethod = null
var bqSetProgressMethod = null
var bqLongValueOfMethod = null
var bqSetMaxProgressMethod = null
var bqGetCompletionCountMethod = null
// Task objects: {task, threshold} per fixed tier, plus the repeatable task and
// its quest.
var bqFixedTierTasks = []
var bqRepeatableTask = null
var bqRepeatableQuest = null

// Method#invoke passes a JS number as a Double, which a long parameter
// rejects; Long.valueOf(String) returns a java.lang.Long instead.
function bqBoxLong(n) {
  return bqLongValueOfMethod.invoke(null, [`${n}`])
}

// Resolves the reflection handles and task objects, then applies the
// maximums. Returns false, leaving init open for a retry, until the quest
// file and its bounty tasks are loaded; an exception turns the progress
// bars off until restart.
function bqInitProgressReflection(anyObj) {
  if (bqProgressInitDone) return bqProgressAvailable
  try {
    var serverQuestFileCls = bqResolveClass(anyObj, 'dev.ftb.mods.ftbquests.quest.ServerQuestFile')
    var teamDataCls = bqResolveClass(anyObj, 'dev.ftb.mods.ftbquests.quest.TeamData')
    var taskCls = bqResolveClass(anyObj, 'dev.ftb.mods.ftbquests.quest.task.Task')
    var questObjectCls = bqResolveClass(anyObj, 'dev.ftb.mods.ftbquests.quest.QuestObject')
    var questCls = bqResolveClass(anyObj, 'dev.ftb.mods.ftbquests.quest.Quest')
    var entityCls = bqResolveClass(anyObj, 'net.minecraft.world.entity.Entity')
    var stringCls = bqResolveClass(anyObj, 'java.lang.String')
    var longCls = bqResolveClass(anyObj, 'java.lang.Long')
    var longPrimitiveCls = longCls.getField('TYPE').get(null)
    var intCls = bqResolveClass(anyObj, 'java.lang.Integer')
    var intPrimitiveCls = intCls.getField('TYPE').get(null)

    bqServerQuestFileInstance = serverQuestFileCls.getField('INSTANCE').get(null)
    if (!bqServerQuestFileInstance) return false // not loaded yet; retry
    var getBaseMethod = serverQuestFileCls.getMethod('getBase', [longPrimitiveCls])
    bqGetOrCreateTeamDataMethod = serverQuestFileCls.getMethod('getOrCreateTeamData', [entityCls])
    bqIsCompletedMethod = teamDataCls.getMethod('isCompleted', [questObjectCls])
    bqSetProgressMethod = teamDataCls.getMethod('setProgress', [taskCls, longPrimitiveCls])
    bqGetCompletionCountMethod = teamDataCls.getMethod('getCompletionCount', [questCls])
    bqLongValueOfMethod = longCls.getMethod('valueOf', [stringCls])

    // Task ids are 64-bit hex, beyond JS number precision, so Long.parseLong
    // parses them; its radix is boxed for the same reason as bqBoxLong().
    // FTB's own parseHexId returns an Optional that comes back empty through
    // invoke().
    var longParseLongMethod = longCls.getMethod('parseLong', [stringCls, intPrimitiveCls])
    var intValueOfMethod = intCls.getMethod('valueOf', [stringCls])
    // Function expressions, not declarations: a function declared inside a
    // try block doesn't hoist in this Rhino build.
    var bqBoxInt = function (n) {
      return intValueOfMethod.invoke(null, [`${n}`])
    }

    var bqTaskForId = function (hexId) {
      var idLong = longParseLongMethod.invoke(null, [hexId, bqBoxInt(16)])
      return getBaseMethod.invoke(bqServerQuestFileInstance, [idLong])
    }

    var resolved = []
    BOUNTY_FIXED_TIERS.forEach((tier) => {
      resolved.push({ task: bqTaskForId(tier.taskId), threshold: tier.threshold })
    })
    var repeatable = bqTaskForId(BOUNTY_REPEATABLE_TASK_ID)
    // Retry while any bounty task is missing from the loaded file.
    if (repeatable === null || resolved.some((entry) => entry.task === null)) return false
    bqFixedTierTasks = resolved
    bqRepeatableTask = repeatable
    bqRepeatableQuest = repeatable.getQuest()

    var customTaskCls = bqResolveClass(anyObj, 'dev.ftb.mods.ftbquests.quest.task.CustomTask')
    bqSetMaxProgressMethod = customTaskCls.getMethod('setMaxProgress', [longPrimitiveCls])
    bqProgressInitDone = true
    bqApplyMaxProgress()
    return true
  } catch (e) {
    bqProgressInitDone = true
    bqProgressAvailable = false
    console.log(`[bounty_kills] progress-display reflection unavailable: ${e}`)
    return false
  }
}

// Init runs on the first server ticks: ServerQuestFile.INSTANCE is still null
// at ServerEvents.loaded, and the maximums must be in place before a client's
// login sync, which carries them. After BQ_INIT_MAX_TICKS this loop gives up
// and the bars stay off until a restart; the tiers still complete through
// change_progress in the death handler.
var bqInitTicksTried = 0
var BQ_INIT_MAX_TICKS = 1200 // ticks (one minute)
ServerEvents.tick((event) => {
  if (bqProgressInitDone) return
  bqInitTicksTried++
  if (bqInitProgressReflection(event.server)) {
    console.log(`[bounty_kills] bounty tasks resolved on server tick ${bqInitTicksTried}`)
  } else if (bqInitTicksTried >= BQ_INIT_MAX_TICKS) {
    bqProgressInitDone = true
    bqProgressAvailable = false
    console.log('[bounty_kills] gave up resolving the bounty tasks - bars and max progress NOT applied')
  }
})

// FTB Quests ignores the max_progress values in bounties.snbt (CustomTask
// keeps its maximum only in network data), so every bounty task loads with
// max 1 and would complete on its first setProgress. This sets each maximum
// to its kill threshold; it runs once, when init succeeds.
function bqApplyMaxProgress() {
  if (!bqSetMaxProgressMethod) return
  var applied = []
  bqFixedTierTasks.forEach((entry) => {
    bqSetMaxProgressMethod.invoke(entry.task, [bqBoxLong(entry.threshold)])
    applied.push(`${entry.task.getMaxProgress()}`)
  })
  bqSetMaxProgressMethod.invoke(bqRepeatableTask, [bqBoxLong(BOUNTY_REPEATABLE_INTERVAL)])
  applied.push(`${bqRepeatableTask.getMaxProgress()}`)
  console.log(`[bounty_kills] bounty task max progress applied: ${applied.join('/')}`)
}

// Mirrors the world kill total onto the bars of the player's quest team, and
// completes any tier the team reached while nobody in it was online.
function bqSyncPlayerProgress(player, killCount) {
  if (!bqProgressInitDone || !bqProgressAvailable) return
  try {
    var teamData = bqGetOrCreateTeamDataMethod.invoke(bqServerQuestFileInstance, [player])

    // isCompleted's boolean comes back from invoke() as a Boolean object, which
    // may be truthy even when false, so its string form is compared.
    bqFixedTierTasks.forEach((entry) => {
      // Completed tiers are left alone. setProgress at the maximum completes a
      // task, so a tier can also finish here, not only via change_progress.
      if (`${bqIsCompletedMethod.invoke(teamData, [entry.task])}` === 'true') return
      bqSetProgressMethod.invoke(teamData, [entry.task, bqBoxLong(Math.min(killCount, entry.threshold))])
    })

    // Repeatable tier: kills mod the interval. A completed task is left alone
    // until its reward is claimed and FTB Quests resets it; writing 0 (the
    // value right after completion) would clear the completion. FTB Quests
    // adds one to the team's completion count each time the reward is claimed
    // and the quest resets; a team whose count is behind the world count's
    // whole intervals (offline at a multiple, or still holding an unclaimed
    // completion when the next one came) completes the next one here.
    if (`${bqIsCompletedMethod.invoke(teamData, [bqRepeatableTask])}` !== 'true') {
      var paid = Number(`${bqGetCompletionCountMethod.invoke(teamData, [bqRepeatableQuest])}`)
      var owed = Math.floor(killCount / BOUNTY_REPEATABLE_INTERVAL) > paid
      var progress = owed ? BOUNTY_REPEATABLE_INTERVAL : killCount % BOUNTY_REPEATABLE_INTERVAL
      bqSetProgressMethod.invoke(teamData, [bqRepeatableTask, bqBoxLong(progress)])
    }
  } catch (e) {
    console.log(`[bounty_kills] progress-display sync failed: ${e}`)
  }
}

// Every 10 ticks, sync this player's bars with the world total. The marker
// lives in the overworld, whichever dimension the player is in.
PlayerEvents.tick((event) => {
  var player = event.player
  if (player.getLevel().getTime() % 10 !== 0) return
  var data = worldData(player.getServer().getLevel('minecraft:overworld'))
  if (!data) return
  bqSyncPlayerProgress(player, data.getInt('td_bountyKillCount'))
})
