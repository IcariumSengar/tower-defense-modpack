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

// Tags every Tier 1 machine's output under one item tag (2026-08-29,
// for the "Fortify" FTB Quests quest - see
// config/ftbquests/quests/chapters/tier1_machines.snbt). The quest's
// single item task checks `#kubejs:tier1_machines` rather than three
// separate tasks, so having crafted ANY ONE of the three completes it.
//
// The renamed Snare Trap is plain minecraft:cobweb under the hood (see
// the shapeless recipe above) - tagging the bare vanilla item is fine
// specifically because this pack's world never generates dungeons
// (Superflat, no structures), so crafting this recipe is the only real
// way to ever obtain a cobweb here.
//
// Real risk, not fully confirmed: FTB Quests' official docs describe
// converting an item task to a tag-based filter as requiring the "FTB
// Filter System" + "FTB XMod Compat" mods, which aren't installed here
// (deliberately, to avoid extra mod footprint for one quest) - betting
// instead on the base item task's own ingredient parsing accepting a
// plain "#namespace:tag" string directly, the same way vanilla recipe
// ingredients do, without needing that GUI-driven conversion feature.
// If the quest task shows "No valid items!" in-game, that confirms the
// bet was wrong and either those two mods or a different task
// structure (e.g. three separate tasks) are actually needed - see
// docs/MODS.md's FTB Quests entry.
ServerEvents.tags('item', (event) => {
  event.add('kubejs:tier1_machines', 'kubejs:wooden_palisade', 'kubejs:spike_trap', 'minecraft:cobweb')
})
