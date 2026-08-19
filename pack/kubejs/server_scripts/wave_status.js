// Live "hostiles remaining" counter (action bar) plus a chat message
// when a wave clears. Tracks all nearby vanilla hostile mobs — matches
// wave_spawner.js's roster now that TFTH is removed and waves are
// vanilla-only.
//
// Deliberately does NOT send its own "wave incoming" chat message —
// wave_spawner.js already sends one (with the mob count, which this
// script doesn't know), so this used to duplicate it. Only sends
// "defeated," which nothing else covers.
//
// Same mob-type-list duplication pattern as loot_bag_drops.js and
// wave_spawner.js — KubeJS server_scripts don't reliably share top-level
// scope across files. Keep all three in sync if the mob roster changes.
//
// Uses .getX()/.getY()/.getZ(), not bare .x/.y/.z — confirmed in
// wave_spawner.js's debugging that the bare-property form produces NaN
// for position in this environment. This was silently broken the same
// way (the counter would never have matched real distances), just
// never surfaced since nothing depended on catching the error.

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
    const dx = e.getX() - player.getX()
    const dy = e.getY() - player.getY()
    const dz = e.getZ() - player.getZ()
    return dx * dx + dy * dy + dz * dz <= RADIUS * RADIUS
  }).length

  const wasInWave = data.getBoolean('td_inWave')
  // Capped at 5 to match wave_spawner.js's WAVES.length (only 5 waves are
  // designed; calls beyond that repeat wave 5's composition) - td_waveNumber
  // itself is an uncapped raw click-count, would otherwise show numbers
  // higher than any wave that's actually been designed.
  const waveNumber = Math.min(data.getInt('td_waveNumber'), 5)

  if (hostileCount > 0) {
    player.setStatusMessage(`§c⚔ Wave ${waveNumber} — Hostiles remaining: ${hostileCount}`)
    if (!wasInWave) {
      data.putBoolean('td_inWave', true)
    }
  } else if (wasInWave) {
    data.putBoolean('td_inWave', false)
    player.tell(`§6[Wave] §aWave ${waveNumber} defeated!`)
    // Big on-screen title, same reasoning as wave_spawner.js's "incoming"
    // one — chat is easy to miss mid-fight.
    player.getServer().runCommandSilent(`title @a title {"text":"WAVE ${waveNumber} CLEARED","color":"green","bold":true}`)
  }
})
