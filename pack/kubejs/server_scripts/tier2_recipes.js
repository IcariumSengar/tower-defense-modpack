// Tier 2 recipe changes. The Tier 2 SecurityCraft traps are set up in
// securitycraft_traps.js; this file only re-costs the Item Collector.
ServerEvents.recipes((event) => {
  event.remove({ output: 'itemcollectors:basic_collector' })
  // Stock recipe: an ender pearl over four obsidian. Quartz and redstone blocks
  // drop from Rare loot bags; ender pearls from Rare and Epic bags and Lootr
  // containers.
  event.shaped('itemcollectors:basic_collector', [
    ' Q ',
    ' R ',
    'PPP',
  ], {
    Q: 'minecraft:quartz',
    R: 'minecraft:redstone_block',
    P: 'minecraft:ender_pearl',
  })
})
