// Live "hostiles remaining" counter (action bar) plus chat messages when
// a wave starts / clears. Tracks ALL nearby hostile mobs, not
// specifically Pure Suffering invasion mobs — there's no confirmed way to
// distinguish "this zombie is part of an invasion" from "this zombie
// wandered in on its own" without deeper unverified work against Pure
// Suffering's internals, so this answers the practical question ("how
// much danger is near me right now") rather than a precise wave-only
// count. Good enough to see a wave arrive (count jumps) and clear
// (count returns to 0).
//
// Same hostile-mob list as loot_bag_drops.js — duplicated rather than
// shared, since KubeJS server_scripts don't reliably share top-level
// scope across files. Keep both in sync if the mob list changes.

const HOSTILE_TYPES = [
  'minecraft:zombie',
  'minecraft:husk',
  'minecraft:drowned',
  'minecraft:skeleton',
  'minecraft:spider',
  'minecraft:creeper',
  'minecraft:zombie_villager',
  'the_flesh_that_hates:flesh_boomer',
  'the_flesh_that_hates:flesh_community',
  'the_flesh_that_hates:flesh_cow',
  'the_flesh_that_hates:flesh_dog',
  'the_flesh_that_hates:flesh_howler',
  'the_flesh_that_hates:flesh_human',
  'the_flesh_that_hates:flesh_hunter_two',
  'the_flesh_that_hates:flesh_hunter_three',
  'the_flesh_that_hates:flesh_justice',
  'the_flesh_that_hates:flesh_pig',
  'the_flesh_that_hates:flesh_pillager',
  'the_flesh_that_hates:flesh_servant',
  'the_flesh_that_hates:flesh_sheep',
  'the_flesh_that_hates:flesh_suffer',
  'the_flesh_that_hates:flesh_villager',
  'the_flesh_that_hates:flesh_vindicator',
  'the_flesh_that_hates:bruteplaquecreatureone',
  'the_flesh_that_hates:plaquecontaminator',
  'the_flesh_that_hates:plaquecreaturebaseone',
  'the_flesh_that_hates:plaquecreatureone',
  'the_flesh_that_hates:plaquecreaturetwo',
  'the_flesh_that_hates:plaquethreelegcreature',
  'the_flesh_that_hates:plaqueincubatorone',
  'the_flesh_that_hates:plaqueincubatorstart',
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
