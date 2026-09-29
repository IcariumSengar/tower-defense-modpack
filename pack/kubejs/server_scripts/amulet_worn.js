// The amulet's worn buffs, Regeneration I and Resistance I (20% less damage),
// while td_amuletWorn is set in the player's persistentData by the Curios hooks
// in startup_scripts/amulet.js, whose tooltip lists these effects. Each
// refresh outlasts AMULET_EFFECT_REFRESH_TICKS, so the buffs never lapse while
// the amulet is worn.

const AMULET_EFFECT_DURATION_TICKS = 200 // 10 seconds
const AMULET_EFFECT_REFRESH_TICKS = 60 // ticks

PlayerEvents.tick((event) => {
  const player = event.entity
  const level = player.getLevel()

  if (level.getTime() % AMULET_EFFECT_REFRESH_TICKS !== 0) return

  const data = player.persistentData
  if (!data.getBoolean('td_amuletWorn')) return

  // Arguments: effect, ticks, amplifier (0 is level I), ambient, visible.
  // Invisible effects show no particles and no HUD icon.
  player.potionEffects.add('minecraft:regeneration', AMULET_EFFECT_DURATION_TICKS, 0, false, false)
  player.potionEffects.add('minecraft:resistance', AMULET_EFFECT_DURATION_TICKS, 0, false, false)
})
