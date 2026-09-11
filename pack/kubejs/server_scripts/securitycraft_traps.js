// SecurityCraft ranged/proximity traps, 2026-09-11 - the "wood/iron
// spikes -> simple ranged traps" pivot away from Advanced Tower
// Defense's Turret Workbench chain (see tier2_recipes.js's own header
// for that system's real complexity - Blueprint + 6-slot hardcoded
// assemble step + a separate Research-gated tech unlock). Every item
// below is a single crafting-table recipe, no workbench GUI, no
// multi-step assembly.
//
// Real finding that shaped this file: SecurityCraft's stock recipes for
// Sentry/I.M.S./Trophy System/Cage Trap/Electrified Iron Fence all pull
// in a "Reinforced" component (Reinforced Iron Block, Reinforced
// Dispenser, Reinforced Iron Bars, a Reinforced Fence) - none of those
// are directly craftable, they only come from using a Universal Block
// Reinforcer tool on a placed vanilla block. Direct ask: drop the
// Reinforcer altogether. Every recipe below swaps each Reinforced
// ingredient for its plain vanilla equivalent - confirmed real stock
// recipes extracted directly from the installed jar
// ([1.20.1] SecurityCraft v1.10.2.1.jar, sha1
// 6184ca6af68a0a4e8ca4dd28a542b5d1a6c2e3ab, matching
// pack/mods/securitycraft.pw.toml) before writing any of this, not
// guessed. Portable Radar (Sentry/I.M.S.'s other shared component) is
// left exactly as shipped - it's already all-vanilla materials (iron
// ingots + redstone dust + redstone torch), a real small prerequisite
// craft, not a Reinforcer dependency.
ServerEvents.recipes((event) => {
  // Sentry - the flagship: place on top of a block, auto-shoots
  // arrows at anything matching its target mode (toggle by
  // right-click), infinite ammo unless a passcode-protected chest/
  // barrel of other projectiles sits underneath it. One Shrapnel in
  // the recipe (swapped in for one of the two redstone dust) keeps
  // Shrapnel's own "kill mobs to fund your tech" design intent alive
  // (see shrapnel.js's header) now that its original gate -
  // tech_tablet_mechanics - no longer exists.
  event.remove({ output: 'securitycraft:sentry' })
  event.shaped('securitycraft:sentry', [
    'SDR',
    'IPI',
    'BBB',
  ], {
    S: 'kubejs:shrapnel',
    D: 'minecraft:dispenser',
    R: 'minecraft:redstone',
    I: 'minecraft:iron_ingot',
    P: 'securitycraft:portable_radar',
    B: 'minecraft:iron_block',
  })

  // I.M.S. (Intelligent Munitions System) - refillable mine holding up
  // to 4 Bouncing Betties, auto-launches them to track down and
  // detonate on anything entering its radius.
  event.remove({ output: 'securitycraft:ims' })
  event.shaped('securitycraft:ims', [
    'BPB',
    ' I ',
    'B B',
  ], {
    B: 'securitycraft:bouncing_betty',
    P: 'securitycraft:portable_radar',
    I: 'minecraft:iron_block',
  })

  // Trophy System - defensive counter-battery, shoots down incoming
  // arrows/fireballs from range rather than attacking. Still needs a
  // Sentry as an ingredient (real stock recipe), which is fine now
  // that Sentry itself is reachable without the Reinforcer.
  event.remove({ output: 'securitycraft:trophy_system' })
  event.shaped('securitycraft:trophy_system', [
    ' T ',
    ' B ',
    'S S',
  ], {
    T: 'securitycraft:sentry',
    B: 'minecraft:iron_block',
    S: 'minecraft:stick',
  })

  // Cage Trap - non-lethal, traps a mob/player (except the owner) in a
  // block cage on contact.
  event.remove({ output: 'securitycraft:cage_trap' })
  event.shaped('securitycraft:cage_trap', [
    'BBB',
    'GRG',
    'III',
  ], {
    B: 'minecraft:iron_bars',
    G: 'minecraft:gold_ingot',
    R: 'minecraft:redstone',
    I: 'minecraft:iron_block',
  })

  // Electrified Iron Fence - unbreakable fence, shocks anyone but the
  // owner on contact.
  event.remove({ output: 'securitycraft:electrified_iron_fence' })
  event.shaped('securitycraft:electrified_iron_fence', [
    ' I ',
    'IFI',
    ' I ',
  ], {
    I: 'minecraft:iron_ingot',
    F: 'minecraft:oak_fence',
  })

  // Claymore and Bouncing Betty need no re-recipe - their real stock
  // recipes (checked in the same jar) never touched a Reinforced
  // ingredient to begin with:
  // - Bouncing Betty: minecraft:heavy_weighted_pressure_plate +
  //   2x forge:ingots/iron + 2x forge:gunpowder.
  // - Claymore: 2x minecraft:tripwire_hook + 2x forge:string +
  //   a Bouncing Betty + forge:dusts/redstone + forge:gunpowder.

  // Universal Block Reinforcer (all 3 tiers) - dropped entirely per
  // direct ask, now that nothing above depends on it. Recipes stripped
  // so it's not a craftable dead end in JEI; the mod still registers
  // every "Reinforced X" block regardless (they're baked into the base
  // structure's own placed palette in playtest_starter_kit.js,
  // unaffected by this).
  event.remove({ output: 'securitycraft:universal_block_reinforcer_lvl1' })
  event.remove({ output: 'securitycraft:universal_block_reinforcer_lvl2' })
  event.remove({ output: 'securitycraft:universal_block_reinforcer_lvl3' })
})
