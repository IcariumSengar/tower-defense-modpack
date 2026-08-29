// Crafting recipes for the Tier 1 defensive machines (startup_scripts/
// machines.js). All three pull from materials already in
// loot_bag_open.js's SCAVENGERS_BAG_POOL (Common-tier loot) - no
// invented materials, matching how every other recipe surface in this
// pack works (loot bags roll vanilla items only).

ServerEvents.recipes((event) => {
  // Wooden Palisade - oak_log + cobblestone, both explicitly Common-tier
  // (weights 40 and 30, the two most common rolls in the whole pool).
  // Shaped like a fence recipe (matches vanilla fence's own 3-high,
  // alternating pattern) but with raw logs instead of planks/sticks -
  // no intermediate crafting step needed, straight from loot to wall.
  event.shaped('6x kubejs:wooden_palisade', ['LCL', 'LCL'], {
    L: 'minecraft:oak_log',
    C: 'minecraft:cobblestone',
  })

  // Simple Snare Trap - not a new block at all. Vanilla cobweb already
  // does almost exactly what a snare trap should (slows entities
  // passing through, walk-through not solid) - reskinning that
  // behavior into a custom block would mean re-deriving cobweb's own
  // collision/slowdown properties from scratch for no real gameplay
  // difference. Crafts real vanilla cobweb from string (Common-tier,
  // already in the loot pool specifically for this), with a custom
  // display name via NBT so it still reads as "Snare Trap" to the
  // player rather than generic "Cobweb" - same Item.of(id, count, nbt)
  // pattern already used for the starter gear's Lore line in
  // playtest_starter_kit.js.
  event.shapeless(
    Item.of('minecraft:cobweb', 1, '{display:{Name:\'{"text":"Snare Trap","italic":false,"color":"gray"}\'}}'),
    ['minecraft:string', 'minecraft:string', 'minecraft:string', 'minecraft:string']
  )

  // Spike Trap - cobblestone base + iron_nugget "spikes", both
  // Common-tier. Craft 4 at a time to seed clearing off some ground
  // around the starter base for less scrap than most Tier 1 recipes -
  // it's the more novel/failure-prone machine, cheaper output is a
  // small hedge if the hits/degrade logic (spike_trap.js) needs
  // several real playtest rounds to get right.
  event.shaped('4x kubejs:spike_trap', ['NCN', 'CCC'], {
    N: 'minecraft:iron_nugget',
    C: 'minecraft:cobblestone',
  })
})
