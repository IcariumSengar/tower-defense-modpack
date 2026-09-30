// Tier 1 trap recipes. The Tier 1 traps all come from Simply Traps. The Wooden
// Stake and Stake Wall keep their stock log recipes; Stake Walls also come
// pre-placed on the starting base's outer walls (buildStarterBase in
// playtest_starter_kit.js). Ones a player places wear out like stakes
// (trap_durability.js).
ServerEvents.recipes((event) => {
  // Stock recipe: 3 iron bars + 3 smooth stone slabs for 4 traps. Five iron
  // ingots for one makes the Spike Trap a clear step up in cost from the
  // Wooden Stake. SpikeDamageMultiplier = 2.0 in pack/config/simplytraps.toml
  // doubles its damage to match.
  event.remove({ output: 'simply_traps:spike_trap' })
  event.shaped('simply_traps:spike_trap', [
    'I I',
    ' I ',
    'I I',
  ], {
    I: 'minecraft:iron_ingot',
  })

  // Not in the trap roster, so no recipe: the Slime Trap, both Circular Barbed
  // Wires and the Grass Trap.
  event.remove({ output: 'simply_traps:slime_trap' })
  event.remove({ output: 'simply_traps:circular_barbed_wire_iron' })
  event.remove({ output: 'simply_traps:circular_barbed_wire_ivy' })
  event.remove({ output: 'simply_traps:grass_trap' })
})
