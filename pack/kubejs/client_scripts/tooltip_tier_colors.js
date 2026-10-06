// Adds a colored tier line to the tooltips of the pack's tiered items, with a
// gray damage line under it for the ones that deal damage. Support items (Item
// Collector, Culinary Generator, storage, Flux Plug) get the tier line only.
// When an item joins or leaves a tier, update TIER_ITEMS and TIER_DAMAGE to
// match.
const TIER_COLORS = {
  1: { code: '§a', label: 'Tier 1 - Starting Defense' }, // green
  2: { code: '§e', label: 'Tier 2 - Automated Defense' }, // yellow
  3: { code: '§c', label: 'Tier 3 - Energetic Defense' }, // red
  4: { code: '§d', label: 'Tier 4 - Elite Defense' }, // light purple
}

const TIER_ITEMS = {
  'simply_traps:stake': 1,
  'simply_traps:spike_trap': 1,
  'simply_traps:stake_wall': 1,
  'itemcollectors:basic_collector': 2,
  'securitycraft:bouncing_betty': 2,
  'securitycraft:claymore': 2,
  'securitycraft:sentry': 2,
  'securitycraft:electrified_iron_fence': 2,
  'securitycraft:ims': 2,
  'generatorgalore:culinary_generator': 3,
  'immersiveengineering:tesla_coil': 3,
  'immersiveengineering:turret_gun': 3,
  'immersiveengineering:turret_chem': 3,
  'refinedstorage:controller': 3,
  'sophisticatedstorage:barrel': 3,
  'fluxnetworks:flux_plug': 3,
  'omtreborn:grenade_turret': 4,
  'omtreborn:rocket_turret': 4,
}

// Damage figures come from the pack's configs and scripts and the mods'
// defaults: simplytraps.toml multipliers, securitycraft-server.toml (Sentry
// bullet damage), SecurityCraft explosion powers run through vanilla's
// explosion formula (up to 14 * power + 1 damage, reaching 2 * power blocks),
// wave_mob_fence_shock.js, wave_mob_spike_slow.js, IE's server config
// ([machines.teslacoil], [tools.bullet_damage]) and Open Modular Turrets
// Reborn's turret defaults. The Simply Traps per-second figures assume one
// hit per half second, the vanilla invulnerability window. Keep all of these
// in sync with their sources.
const TIER_DAMAGE = {
  'simply_traps:stake': 'Damage: 1 a step (~2/s), ignores armour. Slows a little.',
  'simply_traps:spike_trap': 'Damage: 4 a step (~8/s), ignores armour. Slows hard.',
  'simply_traps:stake_wall': 'Damage: 1 a step (~2/s), ignores armour. Slows a little.',
  'securitycraft:bouncing_betty': 'Damage: blast up to 85, reaching 12 blocks.',
  'securitycraft:claymore': 'Damage: blast up to 50, reaching 7 blocks.',
  'securitycraft:sentry': 'Damage: 8 a shot, 2 shots/s, 20-block range.',
  'securitycraft:electrified_iron_fence': 'Damage: 6/s to mobs beside it, ignores armour.',
  'securitycraft:ims': 'Damage: 4 bombs, blast up to 99 each, one every 4s.',
  'immersiveengineering:tesla_coil': 'Damage: 6 + stun every 1.6s, 6-block reach, ignores armour.',
  'immersiveengineering:turret_gun': 'Damage: 10 a shot, 2 shots/s, 16-block range. Needs no ammo.',
  'immersiveengineering:turret_chem': 'Damage: ~12/s + fire, 8-block range. Needs no fuel.',
  'omtreborn:grenade_turret': 'Damage: 5 to all within 3 blocks, every 2s, 18-block range.',
  'omtreborn:rocket_turret': 'Damage: 8 to all within 5 blocks, every 2s, 30-block range.',
}

ItemEvents.tooltip((event) => {
  // var, not const: in this Rhino a const in a loop body keeps its first value.
  for (var itemId in TIER_ITEMS) {
    var tier = TIER_ITEMS[itemId]
    var color = TIER_COLORS[tier]
    var damage = TIER_DAMAGE[itemId]
    event.add(itemId, damage ? [`${color.code}${color.label}`, `§7${damage}`] : `${color.code}${color.label}`)
  }
})
