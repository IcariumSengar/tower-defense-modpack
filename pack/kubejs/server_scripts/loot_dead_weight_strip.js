// Strips items with no use in this pack from every chest-type loot roll, from
// any table, vanilla or modded; structure mods reuse vanilla tables freely.
// There is no minecart transport, no mounts or pets, no End (strongholds are
// disabled), and Xaero's World Map replaces paper maps. LootJS converts the
// array, ids and #tags alike, into an ItemFilter.
var DEAD_WEIGHT_ITEMS = [
  'minecraft:rail',
  'minecraft:powered_rail',
  'minecraft:detector_rail',
  'minecraft:activator_rail',
  'minecraft:minecart',
  'minecraft:chest_minecart',
  'minecraft:hopper_minecart',
  'minecraft:tnt_minecart',
  'minecraft:furnace_minecart',
  'minecraft:name_tag',
  'minecraft:saddle',
  'minecraft:iron_horse_armor',
  'minecraft:golden_horse_armor',
  'minecraft:diamond_horse_armor',
  'minecraft:leather_horse_armor',
  'minecraft:map',
  'minecraft:filled_map',
  'minecraft:lead',
  'minecraft:elytra',
  '#minecraft:music_discs',
]

LootJS.modifiers((event) => {
  event.addLootTypeModifier('chest').apply((context) => {
    context.removeLoot(DEAD_WEIGHT_ITEMS)
  })
})
