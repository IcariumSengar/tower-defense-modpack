// Recipe changes that make Tier 3 machines and gun supplies craftable from
// what this world provides. Inputs should come from loot or mob drops: no
// passive mobs spawn (no_passive_mobs.js), the stone layer is thin (y -16 to
// about 2) so mod ores are scarce, and players aren't expected to visit the
// Nether or the End.
//
// A recipe preceded by event.remove replaces the stock one; the others are
// added alongside the stock route. Every added recipe gets an id under
// kubejs:loot_aligned/. The Dead ends section removes recipes for items the
// pack has no use for.
ServerEvents.recipes((event) => {
  // --- Generator Galore ---
  // Bread replaces the cake in both recipes: cows don't spawn, so milk is
  // scarce. Eggs stay; they are a loot find (kubejs:chests/scav_dairy).
  // Guarded because a recipe naming an unregistered item errors at load.
  if (Platform.isLoaded('generatorgalore')) {
    event.remove({ output: 'generatorgalore:culinary_generator' })
    event.shaped('generatorgalore:culinary_generator', [
      'ICI',
      'IGI',
      'ERE',
    ], {
      I: '#forge:crops',
      C: 'minecraft:bread',
      G: 'generatorgalore:gold_generator',
      E: '#forge:eggs',
      R: '#forge:storage_blocks/redstone',
    }).id('kubejs:loot_aligned/culinary_generator')

    event.remove({ output: 'generatorgalore:gold_to_culinary_upgrade' })
    event.shaped('generatorgalore:gold_to_culinary_upgrade', [
      'ICI',
      'IFI',
      'ERE',
    ], {
      I: '#forge:crops',
      C: 'minecraft:bread',
      F: 'minecraft:item_frame',
      E: '#forge:eggs',
      R: '#forge:storage_blocks/redstone',
    }).id('kubejs:loot_aligned/gold_to_culinary_upgrade')
  }

  // --- Flux Networks ---
  // Flux Core: gold blocks and an ender pearl replace the stock obsidian and
  // eye of ender.
  event.remove({ output: 'fluxnetworks:flux_core' })
  event.shaped('4x fluxnetworks:flux_core', [
    'fof',
    'oeo',
    'fof',
  ], {
    f: 'fluxnetworks:flux_dust',
    o: 'minecraft:gold_block',
    e: 'minecraft:ender_pearl',
  }).id('kubejs:loot_aligned/flux_core')

  // Flux Dust otherwise only forms in-world (redstone dropped on obsidian that
  // sits on bedrock), so this adds a crafting route.
  event.shapeless('4x fluxnetworks:flux_dust', [
    'minecraft:lapis_block',
    'minecraft:redstone', 'minecraft:redstone', 'minecraft:redstone', 'minecraft:redstone',
  ]).id('kubejs:loot_aligned/flux_dust')

  // --- Immersive Engineering ---
  // IE's Blast Furnace needs Blast Bricks (nether brick and magma block), so a
  // vanilla blast furnace also turns iron into steel.
  event.blasting('immersiveengineering:ingot_steel', 'minecraft:iron_ingot')
    .xp(0.7).cookingTime(200)
    .id('kubejs:loot_aligned/steel_from_iron')

  // Heavy Engineering: gold replaces electrum, which needs IE silver ore.
  event.remove({ output: 'immersiveengineering:heavy_engineering' })
  event.shaped('4x immersiveengineering:heavy_engineering', [
    'igi',
    'geg',
    'igi',
  ], {
    i: '#forge:sheetmetals/steel',
    g: 'immersiveengineering:component_steel',
    e: '#forge:ingots/gold',
  }).id('kubejs:loot_aligned/heavy_engineering')

  // Treated wood otherwise needs creosote from a Coke Oven, whose bricks cost a
  // lot of clay. Planks and coal add a small route.
  event.shaped('2x immersiveengineering:treated_wood_horizontal', [
    'pcp',
  ], {
    p: '#minecraft:planks',
    c: 'minecraft:coal',
  }).id('kubejs:loot_aligned/treated_wood')

  // Casull rounds (Gun Turret ammo) are otherwise an Engineer's Workbench
  // blueprint that needs lead nuggets. This crafting route uses iron nuggets.
  event.shapeless('4x immersiveengineering:casull', [
    'immersiveengineering:empty_casing', 'immersiveengineering:empty_casing',
    'immersiveengineering:empty_casing', 'immersiveengineering:empty_casing',
    'minecraft:gunpowder', 'minecraft:gunpowder',
    'minecraft:iron_nugget', 'minecraft:iron_nugget',
  ]).id('kubejs:loot_aligned/casull')

  // Tesla Coil: the stock recipe needs aluminum plates (bauxite generates only
  // above this world's surface), an MV coil and an Advanced Electronic
  // Component. This one is built from loot-reachable materials.
  event.remove({ output: 'immersiveengineering:tesla_coil' })
  event.shaped('immersiveengineering:tesla_coil', [
    ' L ',
    'DGD',
    'sNs',
  ], {
    L: 'minecraft:lightning_rod',
    D: 'minecraft:diamond_block',
    G: 'minecraft:gold_block',
    s: 'immersiveengineering:ingot_steel',
    N: 'minecraft:netherite_ingot',
  }).id('kubejs:loot_aligned/tesla_coil')

  // --- Refined Storage ---
  // Processor Binding: rotten flesh replaces the slime ball (natural mob
  // spawning is off, so there are no slimes).
  event.remove({ output: 'refinedstorage:processor_binding' })
  event.shaped('8x refinedstorage:processor_binding', [
    'SLS',
  ], {
    S: '#forge:string',
    L: 'minecraft:rotten_flesh',
  }).id('kubejs:loot_aligned/processor_binding')

  // Construction Core: lapis replaces glowstone dust, a Nether material.
  event.remove({ output: 'refinedstorage:construction_core' })
  event.shapeless('refinedstorage:construction_core', [
    'refinedstorage:basic_processor',
    'minecraft:lapis_lazuli',
  ]).id('kubejs:loot_aligned/construction_core')

  // --- Simple Guns: reworked ---
  // Fuel Tank (Flame Thrower ammo): gunpowder and coal replace the stock blaze
  // powder, magma cream and water bucket.
  event.remove({ output: 'simple_guns_reworked:fuel_tank' })
  event.shapeless('simple_guns_reworked:fuel_tank', [
    'simple_guns_reworked:empty_fuel_tank',
    'minecraft:gunpowder', 'minecraft:gunpowder',
    'minecraft:coal', 'minecraft:coal',
  ]).id('kubejs:loot_aligned/fuel_tank')

  // Shotgun ammo (r_3, the only Simple Guns recipe with gravel) takes Shrapnel,
  // a loot-bag drop, in place of gravel.
  event.replaceInput({ id: 'simple_guns_reworked:r_3' }, 'minecraft:gravel', 'kubejs:shrapnel')

  // --- Dead ends ---
  // The Assault Rifle cannot fire: Simple Guns' firing code has no branch for
  // it. r_10 is its only recipe, and no recipe takes it as an input.
  event.remove({ id: 'simple_guns_reworked:r_10' })
  // IE's Generator Block and Radiator only build the Diesel Generator and the
  // Excavator. The pack uses neither (Tier 3 power is the Culinary Generator),
  // and no recipe takes either block.
  event.remove({ id: 'immersiveengineering:crafting/generator' })
  event.remove({ id: 'immersiveengineering:crafting/radiator' })
})
