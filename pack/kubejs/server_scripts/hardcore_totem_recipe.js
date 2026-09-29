// Crafting recipe for the Totem of Undying, which vanilla lacks. Totems matter
// most in hardcore mode, where a death can end the run (hardcore_death.js).
// The inputs come from the Epic and Legendary loot bags
// (data/bountybags/loot_tables/items).
ServerEvents.recipes((event) => {
  event.shapeless('minecraft:totem_of_undying', [
    'minecraft:nether_star',
    'minecraft:diamond_block',
    'minecraft:diamond_block',
    'minecraft:gold_block',
    'minecraft:netherite_scrap',
  ])
})
