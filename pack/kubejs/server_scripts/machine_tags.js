// Tags whatever currently counts as a Tier 1 defense for the FTB Quests
// "Fortify" quest (config/ftbquests/quests/chapters/tier1_machines.snbt
// - its item task checks #kubejs:tier1_machines, not hardcoded item
// IDs, so this is the only file that needs to change when the actual
// Tier 1 items change).
//
// Replaces the old custom Wooden Palisade/Snare Trap/Spike Trap
// (startup_scripts/machines.js + this file's old recipe-only content,
// both deleted 2026-08-29) - direct playtest feedback was "rubbish...
// they sucked," a feel/design verdict on the whole custom
// craft-a-block-that-breaks-after-N-hits loop, not just the Spike Trap
// specifically. Full reasoning in docs/IDEAS.md's "Decided: replace
// Tier 1 altogether with Trapcraft" entry.
//
// Trapcraft's own default recipes (data/trapcraft/recipes/*.json in
// the installed jar) are used as-is, not re-recipe'd via
// ServerEvents.recipes - confirmed directly from those files that
// every one of them already uses 100% vanilla materials
// (trapcraft:spikes = 5x iron_ingot, trapcraft:bear_trap = iron_ingot
// + stone_pressure_plate), so nothing here needs KubeJS glue to keep
// the vanilla-materials-only loot economy intact. Both iron_ingot and
// cobblestone (for the pressure plate) are already Common-tier drops
// in loot_bag_open.js's SCAVENGERS_BAG_POOL.
//
// Trapcraft also adds fan/igniter/magnetic_chest, deliberately left
// out of this tag and out of the pack's Tier 1 framing entirely - all
// three need a redstone signal or a redstone crafting cost (confirmed
// from their own recipe JSONs/description), which breaks Tier 1's
// no-power/no-fuel design rule. They're real Trapcraft content, just
// not wired into anything in this pack yet - a natural Tier 2/3
// candidate later, not a rejection of the mod.
//
// No mod adds a wall/fence-shaping block (Trapcraft doesn't have one) -
// the old Wooden Palisade's role is now just plain vanilla
// minecraft:oak_fence, craftable today with zero new code from
// oak_log (already Common-tier loot) via oak_planks -> sticks, real
// vanilla recipes that already exist. Tagged here too so building one
// still counts toward "Fortify".
ServerEvents.tags('item', (event) => {
  event.add('kubejs:tier1_machines', 'trapcraft:spikes', 'trapcraft:bear_trap', 'minecraft:oak_fence')
})
