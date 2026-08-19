// Custom, deterministic 5-wave campaign — vanilla mobs only. Replaces
// relying on Pure Suffering's own (semi-random, hard to debug in-game)
// invasion-type system for this specific curated progression. Pure
// Suffering stays installed but dormant (enableInvasions false) —
// its broader invasion variety is still there to re-enable later.
//
// Each wave adds a mob type on top of the previous wave's roster, per
// design: 1) zombie+skeleton, 2) +spider, 3) +witch, 4) +wither_skeleton,
// 5) +ravager (mini boss). Calling the horn again past wave 5 repeats
// wave 5's composition — no waves designed beyond that yet.
//
// Counts are a first-pass guess, easy to retune (same pattern as
// base_expansion.js's tuning).

const WAVES = [
  [['zombie', 4], ['skeleton', 4]],
  [['zombie', 4], ['skeleton', 4], ['spider', 4]],
  [['zombie', 3], ['skeleton', 3], ['spider', 3], ['witch', 3]],
  [['zombie', 3], ['skeleton', 3], ['spider', 2], ['witch', 2], ['wither_skeleton', 3]],
  [['zombie', 2], ['skeleton', 2], ['spider', 2], ['witch', 2], ['wither_skeleton', 2], ['ravager', 1]],
]

const WAVE_MOB_TYPES = [
  'minecraft:zombie',
  'minecraft:skeleton',
  'minecraft:spider',
  'minecraft:witch',
  'minecraft:wither_skeleton',
  'minecraft:ravager',
]

function nearbyWaveMobCount(player, level, radius) {
  return level.getEntities().filter((e) => {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return false
    const dx = e.x - player.x
    const dy = e.y - player.y
    const dz = e.z - player.z
    return dx * dx + dy * dy + dz * dz <= radius * radius
  }).length
}

ItemEvents.rightClicked('kubejs:wave_horn', (event) => {
  if (event.level.isClientSide) return

  const player = event.player
  const level = player.getLevel()

  if (nearbyWaveMobCount(player, level, 80) > 0) {
    player.tell('§c[Wave Horn] §fClear the current wave before summoning the next one.')
    event.success()
    return
  }

  const data = player.persistentData
  const waveNumber = data.getInt('td_waveNumber') + 1
  data.putInt('td_waveNumber', waveNumber)

  const composition = WAVES[Math.min(waveNumber, WAVES.length) - 1]
  let totalMobs = 0

  composition.forEach(([mobType, count]) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = 15 + Math.random() * 10
      const x = Math.floor(player.x + Math.cos(angle) * r)
      const z = Math.floor(player.z + Math.sin(angle) * r)
      player.runCommandSilent(`summon minecraft:${mobType} ${x} ${Math.floor(player.y)} ${z}`)
      totalMobs++
    }
  })

  const displayWave = Math.min(waveNumber, WAVES.length)
  player.tell(`§6[Wave Horn] §fWave ${displayWave} incoming! (${totalMobs} mobs)`)
  event.success()
})
