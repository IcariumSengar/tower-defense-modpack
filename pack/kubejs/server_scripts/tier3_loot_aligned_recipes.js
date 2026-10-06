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

  // Flux Point: 2 Flux Cores in place of the stock 4. Every machine needs its
  // own Point, and at 4 Cores each one cost 4 gold blocks.
  event.remove({ id: 'fluxnetworks:fluxpoint' }) // the stock recipe; its wipe recipe stays
  event.shaped('fluxnetworks:flux_point', [
    'c',
    'b',
    'c',
  ], {
    c: 'fluxnetworks:flux_core',
    b: 'minecraft:redstone_block',
  }).id('kubejs:loot_aligned/flux_point')

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

  // Casull rounds (optional Gun Turret ammo: an empty turret fires free ones)
  // are otherwise an Engineer's Workbench blueprint that needs lead nuggets.
  // This crafting route uses iron nuggets.
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

  // --- TaCZ (Timeless and Classics Zero) ---
  // Guns and attachments come only from loot, so every Gun Smith Table recipe
  // goes (guns, ammo, attachments, a painting), with the three workbenches
  // and TaCZ's flint-and-sugar gunpowder. Ammo is crafted at a crafting table
  // instead: a copper ingot for the cases, gunpowder, and nuggets for the
  // bullets, more of each for bigger rounds. Shotgun shells take Shrapnel, a
  // loot-bag drop. Each recipe's ingredients differ from every other's, so
  // none shadows another. Ammo is one item, tacz:ammo; AmmoId picks the round.
  if (Platform.isLoaded('tacz')) {
    event.remove({ type: 'tacz:gun_smith_table_crafting' })
    event.remove({ id: 'tacz:gun_smith_table' })
    event.remove({ id: 'tacz:ammo_workbench' })
    event.remove({ id: 'tacz:attachment_workbench' })
    event.remove({ id: 'tacz:gunpowder' })

    var cu = 'minecraft:copper_ingot'
    var gp = 'minecraft:gunpowder'
    var fe = 'minecraft:iron_nugget'
    var au = 'minecraft:gold_nugget'
    var ammo = (id, count, ingredients) => {
      event.shapeless(Item.of('tacz:ammo', count, `{AmmoId:"tacz:${id}"}`), ingredients)
        .id(`kubejs:loot_aligned/ammo_${id}`)
    }
    ammo('9mm', 10, [cu, gp, fe, fe])
    ammo('45acp', 10, [cu, gp, fe, fe, fe])
    ammo('357mag', 6, [cu, gp, fe, fe, au])
    ammo('12g', 6, [cu, gp, 'kubejs:shrapnel'])
    ammo('762x39', 8, [cu, gp, gp, fe, fe])
    ammo('556x45', 10, [cu, gp, gp, fe, fe, fe])
    ammo('308', 10, [cu, gp, gp, fe, fe, au])
    ammo('792x57', 5, [cu, gp, gp, au, au])
    ammo('50bmg', 4, [cu, cu, gp, gp, gp, 'minecraft:diamond'])
    ammo('rpg_rocket', 1, ['minecraft:tnt', 'minecraft:iron_ingot'])
    ammo('40mm', 2, ['minecraft:tnt', cu])
  }

  // --- Dead ends ---
  // IE's Generator Block and Radiator only build the Diesel Generator and the
  // Excavator. The pack uses neither (Tier 3 power is the Culinary Generator),
  // and no recipe takes either block.
  event.remove({ id: 'immersiveengineering:crafting/generator' })
  event.remove({ id: 'immersiveengineering:crafting/radiator' })
})
