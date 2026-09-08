// Trapcraft dropped entirely (2026-09-08, direct ask - "don't like the
// traps," kept only the Magnetic Chest's mechanic, moved to a different
// mod - see tier2_recipes.js and docs/FEATURES.md's "Trapcraft dropped
// entirely" entry for the full writeup). Real replacements, individually
// verified via decompile before writing anything here, not guessed:
// - Spikes -> Simply Traps' `simply_traps:spike_trap` (CurseForge,
//   confirmed real Forge 1.20.1 build, no dependencies). Stock recipe
//   (3 iron_bars + 3 smooth_stone_slab -> 4) confirmed from the jar's
//   own data/simply_traps/recipes/spike_trap_recipe.json - re-recipied
//   below to match this slot's established "cheapest defense item in
//   the pack" role (same 4 sticks + 1 iron ingot cost the old
//   trapcraft:spikes re-recipe used).
// - Bear Trap -> V01D's Bear Traps' `vds_bear_traps:bear_trap_open`
//   (CurseForge, confirmed real Forge 1.20.1 beta build, no
//   dependencies). **Real finding, not assumed**: this mod ships with
//   NO crafting recipe at all - decompiled/inspected the full jar, it's
//   purely a world-generated structure (spawns in forest biomes,
//   picked up and re-placed by hand). A fresh recipe is added below
//   from scratch (event.shaped with no preceding event.remove, since
//   there's no stock recipe to remove) - same cost as the old
//   trapcraft:bear_trap (iron_ingot + stone_pressure_plate), so the
//   quest's "craft it" framing stays accurate.
ServerEvents.recipes((event) => {
  event.remove({ output: 'simply_traps:spike_trap' })
  event.shaped('simply_traps:spike_trap', [
    'S S',
    ' I ',
    'S S',
  ], {
    S: 'minecraft:stick',
    I: 'minecraft:iron_ingot',
  })

  event.shapeless('vds_bear_traps:bear_trap_open', [
    'minecraft:iron_ingot',
    'minecraft:stone_pressure_plate',
  ])
})
