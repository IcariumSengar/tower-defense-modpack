// Live "hostiles remaining" counter (action bar) plus chat messages when
// a wave starts / clears. Tracks all nearby vanilla hostile mobs — matches
// wave_spawner.js's roster now that TFTH is removed and waves are
// vanilla-only. Some overlap with wave_spawner.js's own "Wave N incoming!"
// message when the horn is used — both are kept since this one is a more
// general ambient-danger signal, not exclusively tied to horn use.
//
// Same mob-type-list duplication pattern as loot_bag_drops.js and
// wave_spawner.js — KubeJS server_scripts don't reliably share top-level
// scope across files. Keep all three in sync if the mob roster changes.

const HOSTILE_TYPES = [
  'minecraft:zombie',
  'minecraft:husk',
  'minecraft:drowned',
  'minecraft:skeleton',
  'minecraft:spider',
  'minecraft:creeper',
  'minecraft:zombie_villager',
  'minecraft:witch',
  'minecraft:wither_skeleton',
  'minecraft:ravager',
]

const RADIUS = 80

PlayerEvents.tick((event) => {
  const player = event.player
  const level = player.getLevel()
  const data = player.persistentData

  const hostileCount = level.getEntities().filter((e) => {
    if (!HOSTILE_TYPES.includes(`${e.type}`)) return false
    const dx = e.x - player.x
    const dy = e.y - player.y
    const dz = e.z - player.z
    return dx * dx + dy * dy + dz * dz <= RADIUS * RADIUS
  }).length

  const wasInWave = data.getBoolean('td_inWave')

  if (hostileCount > 0) {
    player.setStatusMessage(`§c⚔ Hostiles remaining: ${hostileCount}`)
    if (!wasInWave) {
      data.putBoolean('td_inWave', true)
      player.tell('§6[Wave] §fHostiles detected — incoming!')
    }
  } else if (wasInWave) {
    data.putBoolean('td_inWave', false)
    player.tell('§6[Wave] §aAll clear — defeated!')
  }
})
