// SecurityCraft trap recipes. The stock Sentry, I.M.S. and Electrified Iron
// Fence recipes need Reinforced parts from the Universal Block Reinforcer,
// which is uncraftable here, so they use plain vanilla parts instead. The
// Trophy System and Cage Trap are cut from the pack. Quest subtitles in
// campaign.snbt list these ingredients; keep them in step.
ServerEvents.recipes((event) => {
  // Sentry: plain parts for the Reinforced ones, an ingot at each end of the
  // bottom row, and one Shrapnel for a redstone dust, so it costs loot from
  // kills. Iron total 20, counting the Portable Radar's seven ingots.
  event.remove({ output: 'securitycraft:sentry' })
  event.shaped('securitycraft:sentry', [
    'SDR',
    'IPI',
    'IBI',
  ], {
    S: 'kubejs:shrapnel',
    D: 'minecraft:dispenser',
    R: 'minecraft:redstone',
    I: 'minecraft:iron_ingot',
    P: 'securitycraft:portable_radar',
    B: 'minecraft:iron_block',
  })

  // I.M.S. (fires up to four bombs, reloads with Bouncing Betties): the stock
  // shape minus its bottom row of two Betties, with an ingot for the Reinforced
  // Iron Block. Iron total 16, counting the radar's seven and four per Betty.
  event.remove({ output: 'securitycraft:ims' })
  event.shaped('securitycraft:ims', [
    'BPB',
    ' I ',
  ], {
    B: 'securitycraft:bouncing_betty',
    P: 'securitycraft:portable_radar',
    I: 'minecraft:iron_ingot',
  })

  event.remove({ output: 'securitycraft:trophy_system' })

  event.remove({ output: 'securitycraft:cage_trap' })

  // Electrified Iron Fence: a plain oak fence in place of the Reinforced one.
  event.remove({ output: 'securitycraft:electrified_iron_fence' })
  event.shaped('securitycraft:electrified_iron_fence', [
    ' I ',
    'IFI',
    ' I ',
  ], {
    I: 'minecraft:iron_ingot',
    F: 'minecraft:oak_fence',
  })

  // Claymore and Bouncing Betty keep their stock recipes: no Reinforced parts.

  // Universal Block Reinforcer, all three levels: no recipe. Reinforced blocks
  // still exist; the starter base uses them (playtest_starter_kit.js).
  event.remove({ output: 'securitycraft:universal_block_reinforcer_lvl1' })
  event.remove({ output: 'securitycraft:universal_block_reinforcer_lvl2' })
  event.remove({ output: 'securitycraft:universal_block_reinforcer_lvl3' })
})
