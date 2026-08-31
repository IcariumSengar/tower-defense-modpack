// Tier 2 machine re-recipes - Fire Trap (Igniter), Fan, Magnetic Chest
// (Trapcraft, already installed) and Arrow Turret (Medieval Defense
// Turrets, installed for this tier) all ship with plain Common-tier
// recipes (cobblestone/iron_ingot/loose redstone). docs/FEATURES.md's
// Tier 2 spec calls for these to pull from the Uncommon/Fortified Cache
// loot tier instead (see loot_bag_open.js's FORTIFIED_CACHE_POOL) -
// redstone_block, quartz and iron_block are all real Uncommon-pool
// items, so swapping each recipe's structural filler (cobblestone) and
// core component (redstone dust/iron ingot) for those is a real tier
// gate, not just flavor. Confirmed real stock recipes/IDs by decompiling
// Trapcraft's and Medieval Defense Turrets' own shipped recipe JSON
// before touching any of this.
ServerEvents.recipes((event) => {
  event.remove({ output: 'trapcraft:igniter' })
  event.shaped('trapcraft:igniter', [
    'NNN',
    'QRQ',
    'QQQ',
  ], {
    N: 'minecraft:netherrack',
    Q: 'minecraft:quartz',
    R: 'minecraft:redstone_block',
  })

  event.remove({ output: 'trapcraft:fan' })
  event.shaped('trapcraft:fan', [
    'QQQ',
    'QIQ',
    'QQQ',
  ], {
    Q: 'minecraft:quartz',
    I: 'minecraft:iron_block',
  })

  event.remove({ output: 'trapcraft:magnetic_chest' })
  event.shaped('trapcraft:magnetic_chest', [
    'PPP',
    'PRP',
    'PIP',
  ], {
    P: '#minecraft:planks',
    R: 'minecraft:redstone_block',
    I: 'minecraft:iron_block',
  })

  event.remove({ output: 'medievalturrets:bow_turret_item' })
  event.shaped('medievalturrets:bow_turret_item', [
    '0PI',
    ' PI',
  ], {
    0: 'minecraft:bow',
    P: '#minecraft:planks',
    I: 'minecraft:iron_block',
  })
})
