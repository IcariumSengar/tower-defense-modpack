// Boss waves. Every 10th wave summons a boss 10-30 blocks from the
// pedestal, with a boss bar, music and a title for every player. Boss waves
// alternate between The Reaper and The Demolisher, and a kill drops a
// Sentry, 12 shrapnel and a Totem of Undying.
//
// The boss is tagged td_wave_mob, so it counts toward the wave
// (wave_status.js) and is steered at the pedestal (mob_aggro.js) like any
// other wave mob. td_boss marks it for this file and quest_milestones.js.
// Wave state comes from worldData() (world_state.js); tdWaveLabel() is in
// wave_spawner.js.

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
  // demolition_zombie throws lit TNT by itself (TntIgniteAndThrowGoal).
  demolisher: {
    entityType: 'undeadnights:demolition_zombie',
    name: 'The Demolisher',
    nameColor: 'gold',
    maxHealth: 350,
    attackDamage: 15,
    armorMaterial: 'netherite',
    music: 'minecraft:music_disc.11',
    arrivalSound: 'minecraft:entity.tnt.primed',
    arrivalSubtitle: 'is rigging the base to blow.',
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

  // Math.PI is undefined in this Rhino build.
  var PI = 3.141592653589793
  var angle = Math.random() * 2 * PI

  // 10-30 blocks out, shortened when the world border is small: a mob summoned
  // outside the border can't path back in.
  var borderHalfWidth = level.getWorldBorder().getSize() / 2
  var BORDER_SAFETY_MARGIN = 5
  var spawnDistance = Math.max(10, Math.min(30, borderHalfWidth - BORDER_SAFETY_MARGIN))

  var x = Math.floor(objective.x + Math.cos(angle) * spawnDistance)
  var z = Math.floor(objective.z + Math.sin(angle) * spawnDistance)
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
  // surface within 6 blocks. td_bossJustSpawned picks out the new boss and is
  // removed straight after.
  server.runCommandSilent(
    `spreadplayers ${x} ${z} 0 6 false @e[type=${boss.entityType},tag=td_bossJustSpawned,limit=1,sort=nearest]`
  )
  server.runCommandSilent(
    `tag @e[type=${boss.entityType},tag=td_bossJustSpawned,limit=1,sort=nearest] remove td_bossJustSpawned`
  )

  // Shown to every player, unlike pedestal_health.js's range-limited bar.
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
  server.runCommandSilent(`particle minecraft:large_smoke ${x} ${y + 1} ${z} 1.5 1.5 1.5 0.02 80`)
  server.runCommandSilent(`playsound ${boss.arrivalSound} hostile @a ${x} ${y} ${z} 1 0.6`)
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

// Every 10 ticks, copy the boss's health onto the boss bar.
var BOSS_BOSSBAR_UPDATE_THROTTLE = 10

PlayerEvents.tick((event) => {
  var player = event.player
  var level = player.getLevel()
  if (level.getTime() % BOSS_BOSSBAR_UPDATE_THROTTLE !== 0) return

  var bosses = level.getEntities().filter(function (e) {
    return e.getTags().contains('td_boss') && e.getHealth() > 0
  })
  if (bosses.length === 0) return

  var boss = bosses[0]
  player.getServer().runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} value ${Math.max(0, Math.round(boss.getHealth()))}`)
})

// Boss death: clear the bar and the music, announce it and drop the rewards.
// quest_milestones.js handles the boss quest from the same event.
EntityEvents.death((event) => {
  var entity = event.entity
  if (!entity.getTags().contains('td_boss')) return

  var level = event.level
  var server = level.getServer()
  var x = entity.getX()
  var y = entity.getY()
  var z = entity.getZ()
  var boss = bossConfigForEntityType(entity.type)

  server.runCommandSilent(`bossbar remove ${BOSS_BOSSBAR_ID}`)
  server.runCommandSilent(`stopsound @a master ${boss.music}`)

  server.runCommandSilent(`title @a title {"text":"${boss.name} FALLS","color":"gold","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"The base breathes easier - for now.","color":"gray"}`)
  // At each player, like the boss music.
  server.runCommandSilent(`execute as @a at @s run playsound minecraft:entity.wither.death master @s ~ ~ ~ 1 1 1`)
  server.runCommandSilent(`particle minecraft:totem_of_undying ${x} ${y + 1} ${z} 1.0 1.0 1.0 0.02 100`)

  server.runCommandSilent(`summon minecraft:item ${x} ${y + 1} ${z} {Item:{id:"securitycraft:sentry",Count:1b}}`)
  server.runCommandSilent(`summon minecraft:item ${x} ${y + 1} ${z} {Item:{id:"kubejs:shrapnel",Count:12b}}`)
  server.runCommandSilent(`summon minecraft:item ${x} ${y + 1} ${z} {Item:{id:"minecraft:totem_of_undying",Count:1b}}`)
})
