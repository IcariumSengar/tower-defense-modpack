// Applies the amulet's passive buffs while td_amuletWorn is true (set by
// amulet.js's onEquip/onUnequip capability callbacks, or directly by
// amulet_pedestal.js when the player takes it back off the pedestal).
// Regeneration + Fire Resistance, per docs/FEATURES.md — passive
// survivability rather than combat stats, so it doesn't duplicate the
// (removed) roguelike buff-pick's Vitality/Fortitude/Ferocity trio.
//
// Same PlayerEvents.tick + throttle pattern as mob_aggro.js/wave_status.js.
// Re-applies every 60 ticks (3s) rather than every tick — both potion
// effects last longer than that refresh window (see DURATION_TICKS), so
// this just keeps them topped up without spamming
// MobEffectEvents/addEffect calls 20x/second for no visible benefit.
// amplifier 0 = the potion's base/level-1 strength for both effects.

const DURATION_TICKS = 200 // 10s - well past the 60-tick refresh below
const REFRESH_INTERVAL = 60

PlayerEvents.tick((event) => {
  const player = event.entity
  const level = player.getLevel()

  if (level.getTime() % REFRESH_INTERVAL !== 0) return

  const data = player.persistentData
  if (!data.getBoolean('td_amuletWorn')) return

  player.potionEffects.add('minecraft:regeneration', DURATION_TICKS, 0, false, false)
  player.potionEffects.add('minecraft:fire_resistance', DURATION_TICKS, 0, false, false)
})
