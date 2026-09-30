// Boss waves. Every 10th wave summons a boss in the wave mobs' spawn band,
// with a boss bar, music and a title for every player. Boss waves alternate
// between The Reaper and The Demolisher, and a kill drops a Sentry, 12
// shrapnel and a Totem of Undying.
//
// The boss is tagged td_wave_mob, so it counts toward the wave
// (wave_status.js) and is steered at the pedestal (mob_aggro.js) like any
// other wave mob. td_boss marks it for this file and quest_milestones.js.
// Wave state comes from worldData() (world_state.js), where td_bossActive
// is set from the boss's spawn until its fight ends. tdWaveLabel() and the
// spawn band helpers are in wave_spawner.js.

var BOSS_WAVE_INTERVAL = 10
var BOSS_BOSSBAR_ID = 'kubejs:main_boss'

// Keys are internal ids; `name` is what players see. /summon with NBT skips
// finalizeSpawn, so Undead Nights' spawn-time bonuses never reach a boss.
var BOSS_TYPES = {
  behemoth: {
    entityType: 'undeadnights:elite_zombie',
    name: 'The Reaper',
    nameColor: 'dark_red',
    maxHealth: 200,
    attackDamage: 24,
    // elite_zombie has 5 armor of its own; the leather set adds 7.
    armorMaterial: 'leather',
    armorDyeColor: 1908001, // vanilla black dye, 0x1D1D21
    // elite_zombie's default is 0.27; the Reaper should be hard to outrun.
    movementSpeed: 0.36,
    music: 'minecraft:music_disc.pigstep',
    arrivalSound: 'minecraft:entity.wither.spawn',
    arrivalSubtitle: 'has arrived.',
  },
  // The tank. demolition_zombie's TntIgniteAndThrowGoal throws only from the
  // TNT stack finalizeSpawn puts in its hand, so this boss throws no TNT.
  demolisher: {
    entityType: 'undeadnights:demolition_zombie',
    name: 'The Demolisher',
    nameColor: 'gold',
    maxHealth: 350,
    attackDamage: 15,
    // demolition_zombie has 4 armor of its own; the golden set adds 11.
    armorMaterial: 'golden',
    music: 'minecraft:music_disc.11',
    arrivalSound: 'minecraft:entity.zombie.break_wooden_door',
    arrivalSubtitle: 'is coming for the pedestal.',
  },
}

// Boss index = wave / 10: odd (waves 10, 30, 50...) gets The Reaper, even
// (20, 40, 60...) The Demolisher.
function bossConfigForWave(waveNumber) {
  var bossIndex = waveNumber / BOSS_WAVE_INTERVAL
  return bossIndex % 2 === 0 ? BOSS_TYPES.demolisher : BOSS_TYPES.behemoth
}

// The death handler only has the dead entity's type; nothing records which
// config spawned it.
function bossConfigForEntityType(entityType) {
  return `${entityType}` === BOSS_TYPES.demolisher.entityType ? BOSS_TYPES.demolisher : BOSS_TYPES.behemoth
}

// td_boss is only added by spawnBoss(), so the tag alone marks either boss.
function isBossAlive(level) {
  return level.getEntities().filter(function (e) {
    return e.getTags().contains('td_boss') && e.getHealth() > 0
  }).length > 0
}

function spawnBoss(player, data, waveNumber) {
  var server = player.getServer()
  var level = player.getLevel()
  var objective = waveObjective(player, data) // wave_spawner.js
  var boss = bossConfigForWave(waveNumber)

  // Same band as wave mobs: 48-64 blocks out, inside the border and outside
  // the compound.
  var spawnPoint = tdSpawnBandPoint(tdWaveSpawnBand(level), tdCompoundSpawnRect(data), objective.x, objective.z)
  var x = spawnPoint.x
  var z = spawnPoint.z
  var y = Math.floor(objective.y)

  // Single-quoted in the NBT, so its double quotes need no escaping.
  var nameJson = `{"text":"${boss.name}","color":"${boss.nameColor}","bold":true}`
  var speedAttribute = boss.movementSpeed !== undefined ? `,{Name:"generic.movement_speed",Base:${boss.movementSpeed}}` : ''
  var armorMaterial = boss.armorMaterial || 'netherite'
  // Optional leather dye: vanilla display.color, an RGB int.
  var armorTag = boss.armorDyeColor !== undefined ? `,tag:{display:{color:${boss.armorDyeColor}}}` : ''
  var armorItems = `[{id:"minecraft:${armorMaterial}_boots",Count:1b${armorTag}},{id:"minecraft:${armorMaterial}_leggings",Count:1b${armorTag}},{id:"minecraft:${armorMaterial}_chestplate",Count:1b${armorTag}},{id:"minecraft:${armorMaterial}_helmet",Count:1b${armorTag}}]`
  // DeathLootTable and ArmorDropChances stop the boss dropping its own loot
  // and armor. loot_bag_drops.js's bag rolls still apply, since LootJS
  // matches the entity type, not the loot table.
  var summonNbt = `{CustomName:'${nameJson}',CustomNameVisible:1b,PersistenceRequired:1b,DeathLootTable:"minecraft:empty",Tags:["td_boss","td_bossJustSpawned","td_wave_mob"],Attributes:[{Name:"generic.max_health",Base:${boss.maxHealth}},{Name:"generic.attack_damage",Base:${boss.attackDamage}},{Name:"generic.follow_range",Base:128}${speedAttribute}],Health:${boss.maxHealth}.0f,ArmorItems:${armorItems},ArmorDropChances:[0.0f,0.0f,0.0f,0.0f]}`

  server.runCommandSilent(`summon ${boss.entityType} ${x} ${y} ${z} ${summonNbt}`)
  // Summoned at the pedestal's height, then spreadplayers moves it onto the
  // surface within 4 blocks, as wave_spawner.js does. td_bossJustSpawned
  // picks out the new boss and is removed straight after.
  var newBoss = `@e[type=${boss.entityType},tag=td_bossJustSpawned,limit=1,sort=nearest]`
  server.runCommandSilent(`spreadplayers ${x} ${z} 0 4 false ${newBoss}`)
  // Arrival cue where the boss landed. The band is past normal particle (32
  // blocks) and sound (16) range: force sends the smoke up to 512 blocks, and
  // players out of sound range hear it at volume 0.5 from its direction.
  server.runCommandSilent(`execute at ${newBoss} run particle minecraft:large_smoke ~ ~1 ~ 1.5 1.5 1.5 0.02 80 force`)
  server.runCommandSilent(`execute at ${newBoss} run playsound ${boss.arrivalSound} hostile @a ~ ~ ~ 1 0.6 0.5`)
  server.runCommandSilent(`tag ${newBoss} remove td_bossJustSpawned`)

  data.putBoolean('td_bossActive', true)
  bossCachedEntity = null

  // Shown to every player, unlike pedestal_health.js's range-limited bar. A
  // bar left over from an earlier fight is removed first, since `bossbar add`
  // keeps an existing bar and its old name.
  server.runCommandSilent(`bossbar remove ${BOSS_BOSSBAR_ID}`)
  server.runCommandSilent(`bossbar add ${BOSS_BOSSBAR_ID} "${boss.name}"`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} color red`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} max ${boss.maxHealth}`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} value ${boss.maxHealth}`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} players @a`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} visible true`)

  // tdWaveLabel() reads "Horde N" past the written waves.
  server.runCommandSilent(`title @a title {"text":"${tdWaveLabel(waveNumber).toUpperCase()}: BOSS","color":"dark_red","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"${boss.name} ${boss.arrivalSubtitle}","color":"red"}`)
  server.runCommandSilent(`tellraw @a {"text":"[Boss] ${boss.name} is out there somewhere - find it and end it.","color":"red"}`)
  // At each player: a console playsound at ~ ~ ~ would sound from world spawn.
  server.runCommandSilent(`execute as @a at @s run playsound ${boss.music} master @s ~ ~ ~ 1 1 1`)
}

// Boss trigger. Polls td_waveNumber, which useWaveHorn() in wave_spawner.js
// bumps, instead of hooking the horn. Spawns once per boss wave
// (td_bossLastSpawnedWave) and only when no boss is alive. The cheap checks
// come first, so the entity scan in isBossAlive() rarely runs.
PlayerEvents.tick((event) => {
  var player = event.player
  var level = player.getLevel()
  if (level.getTime() % 4 !== 0) return

  var data = worldData(level)
  if (!data) return
  // No boss once the run is over. The horn is blocked by then; this stops a
  // boss wave whose boss hasn't spawned yet.
  if (data.getBoolean('td_pedestalDestroyed') || data.getBoolean('td_hardcoreGameOver')) return
  var waveNumber = data.getInt('td_waveNumber')
  if (waveNumber <= 0) return
  if (waveNumber % BOSS_WAVE_INTERVAL !== 0) return
  if (data.getInt('td_bossLastSpawnedWave') === waveNumber) return
  if (isBossAlive(level)) return

  data.putInt('td_bossLastSpawnedWave', waveNumber)
  spawnBoss(player, data, waveNumber)
})

// The live boss, kept between polls so its removal can be seen: a burning
// demolition_zombie removes itself (reason KILLED) and explodes without
// dying, so no death event fires. Found again by a scan after a reload.
var bossCachedEntity = null

// Ends the fight: removes the bar and stops the music, and for a kill shows
// the title and drops the rewards where the boss was. Called from the death
// event, and from the poll below for a boss removed without one.
function endBossFight(server, bossEntity, killed) {
  var data = worldData(server.getLevel('minecraft:overworld'))
  if (data) data.putBoolean('td_bossActive', false)
  bossCachedEntity = null

  var boss = bossConfigForEntityType(bossEntity.type)
  server.runCommandSilent(`bossbar remove ${BOSS_BOSSBAR_ID}`)
  server.runCommandSilent(`stopsound @a master ${boss.music}`)
  if (!killed) return

  var x = bossEntity.getX()
  var y = bossEntity.getY()
  var z = bossEntity.getZ()
  server.runCommandSilent(`title @a title {"text":"${boss.name} FALLS","color":"gold","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"The base breathes easier - for now.","color":"gray"}`)
  // At each player, like the boss music.
  server.runCommandSilent(`execute as @a at @s run playsound minecraft:entity.wither.death master @s ~ ~ ~ 1 1 1`)
  server.runCommandSilent(`particle minecraft:totem_of_undying ${x} ${y + 1} ${z} 1.0 1.0 1.0 0.02 100`)

  // Invulnerable, so the fire a demolition_zombie's blast leaves behind can't
  // burn the rewards.
  server.runCommandSilent(`summon minecraft:item ${x} ${y + 1} ${z} {Item:{id:"securitycraft:sentry",Count:1b},Invulnerable:1b}`)
  server.runCommandSilent(`summon minecraft:item ${x} ${y + 1} ${z} {Item:{id:"kubejs:shrapnel",Count:12b},Invulnerable:1b}`)
  server.runCommandSilent(`summon minecraft:item ${x} ${y + 1} ${z} {Item:{id:"minecraft:totem_of_undying",Count:1b},Invulnerable:1b}`)
}

// Every 10 ticks during a fight: copy the boss's health onto the bar, give
// the bar to players who joined since the spawn (it keeps only the players it
// was given), and end the fight for a boss removed without a death event.
var BOSS_BOSSBAR_UPDATE_THROTTLE = 10

ServerEvents.tick((event) => {
  var server = event.server
  var level = server.getLevel('minecraft:overworld')
  if (!level || level.getTime() % BOSS_BOSSBAR_UPDATE_THROTTLE !== 0) return
  var data = worldData(level)
  if (!data || !data.getBoolean('td_bossActive')) return

  var boss = bossCachedEntity
  if (boss && boss.isRemoved()) {
    bossCachedEntity = null
    // A chunk unload or a portal also removes the entity object; only KILLED
    // or DISCARDED means the boss is gone.
    var reason = `${boss.getRemovalReason()}`
    if (reason === 'KILLED' || reason === 'DISCARDED') {
      endBossFight(server, boss, reason === 'KILLED')
      // quest_milestones.js completes the boss quest from the death event,
      // which this removal skipped.
      if (reason === 'KILLED') qmCompleteShared(server, data, 'boss')
      return
    }
    boss = null
  }
  if (!boss) {
    boss = level.getEntities().find(function (e) {
      return e.getTags().contains('td_boss') && e.getHealth() > 0
    })
    if (!boss) return
    bossCachedEntity = boss
  }
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} value ${Math.max(0, Math.round(boss.getHealth()))}`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} players @a`)
})

// Boss death. quest_milestones.js completes the boss quest from the same
// event.
EntityEvents.death((event) => {
  var entity = event.entity
  if (!entity.getTags().contains('td_boss')) return
  endBossFight(event.level.getServer(), entity, true)
})
