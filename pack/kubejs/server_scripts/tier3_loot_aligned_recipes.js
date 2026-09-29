// Tier 3 recipes aligned with what the loot tables actually supply,
// 2026-09-11 - direct ask right after the structure loot pass: "tweak the
// recipes so that they make sense with what is already in the loot
// tables." Every recipe below was traced from a quest-book item down to
// raw inputs against the live jars (see docs/FEATURES.md's "Structure
// loot pass" entry for the census and the "Tier 3 recipes aligned with
// loot" entry for this file's reasoning); only the inputs this world
// cannot produce were swapped, and each swap is the nearest material
// that IS in a loot table or a mob drop. Nothing here touches the Tier 2
// SecurityCraft traps, Simply Traps, Item Collectors or Sophisticated
// Storage - all of those were already fully vanilla-craftable from loot.
//
// What was blocked, and by what (stock recipes, real jar contents):
// - Culinary Generator / Gold->Culinary upgrade: a CAKE (3 milk buckets)
//   in a world where no_passive_mobs.js cancels every cow and chicken.
//   Eggs stay in the recipe - they're the deliberate loot find
//   (kubejs:chests/scav_dairy, rolled by Lost City stores/farms/dining
//   rooms and postapocalypse food chests); the cake becomes bread.
// - Flux Core (every Plug/Point needs one): an EYE OF ENDER -> blaze
//   powder -> the Nether. Swapped for an ender pearl (the Lootr bonus
//   pools in structure_loot_progression.js, Rare/Epic bags). Flux Dust itself is made in-world
//   (drop redstone onto obsidian that sits on bedrock - enableFluxRecipe
//   is on, bedrock is 18 blocks down at y=-16) but nothing in the pack
//   explains that, so a plain crafting route is added alongside it.
// - IE steel (revolver gun parts, revolver magazine, component_steel,
//   heavy engineering, i.e. both turrets): the Blast Furnace needs magma
//   blocks (Nether-only bar the far loot pool). Vanilla blast furnace now
//   blasts iron into steel; IE's own multiblock route still works.
// - Heavy Engineering (Chemthrower -> Chem Turret): ELECTRUM needs silver,
//   whose IE ore placement mostly sits below this world's y=-16 floor.
//   Swapped for gold.
// - Treated wood (wooden grip, turntable, workbench): creosote from a
//   27-brick Coke Oven whose bricks need ~72 clay - clay is in loot now
//   but at that volume it's a wall, not a gate. Planks + coal gives a
//   small alternative; the Coke Oven still exists for creosote as Chem
//   Turret fuel.
// - Revolver ammo (the Gun Turret fires it): Casull rounds are a
//   workbench blueprint needing LEAD nuggets (same ore problem). A plain
//   crafting route with iron nuggets is added; the blueprint stays.
// - Refined Storage processors: Processor Binding needs SLIME BALLS (no
//   slimes spawn - natural spawns are stripped), Construction Core needs
//   GLOWSTONE (Nether). Rotten flesh (the zombie-apocalypse glue) and
//   lapis instead.
// - Tesla Coil: aluminum plates (bauxite ore, y 40-85 in a world whose
//   surface is y~2), an MV coil (electrum wire) and an Advanced Electronic
//   Component (Plastic -> Refinery). Rebuilt from parts that exist:
//   a lightning rod (copper), two LV coils (copper wire), a gold block,
//   steel, and a Flux Point so it's born wired - same "flux point in the
//   recipe" convention tier3_turret_recipes.js already set. (2026-09-29:
//   the Flux Point and LV coils are now a netherite ingot and two diamond
//   blocks - see the recipe below.)
// - Simple Guns Fuel Tank (flame thrower ammo): blaze powder x2 + magma
//   cream (slime again). Gunpowder + coal.
//
// Every new recipe carries an explicit id under kubejs:loot_aligned/ so
// a sandbox probe can look it up by key; JEI shows them like any other.
ServerEvents.recipes((event) => {
  // --- Generator Galore ---
  // Guarded: the Tier 3 session's Generator Galore install was still
  // sandbox-only when this shipped (the live instance had no
  // generatorgalore jar yet), and a shaped recipe naming an unregistered
  // item fails at recipe-load. The guard makes this file safe to deploy
  // ahead of that jar and correct the moment it lands.
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
  // Obsidian swapped out of both recipes, 2026-09-29 (direct ask: "the flux
  // dust should have lapis block instead of the obsidian block in its
  // recipe. flux cores should have gold blocks instead of obsidian blocks").
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

  event.shapeless('4x fluxnetworks:flux_dust', [
    'minecraft:lapis_block',
    'minecraft:redstone', 'minecraft:redstone', 'minecraft:redstone', 'minecraft:redstone',
  ]).id('kubejs:loot_aligned/flux_dust')

  // --- Immersive Engineering ---
  event.blasting('immersiveengineering:ingot_steel', 'minecraft:iron_ingot')
    .xp(0.7).cookingTime(200)
    .id('kubejs:loot_aligned/steel_from_iron')

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

  event.shaped('2x immersiveengineering:treated_wood_horizontal', [
    'pcp',
  ], {
    p: '#minecraft:planks',
    c: 'minecraft:coal',
  }).id('kubejs:loot_aligned/treated_wood')

  event.shapeless('4x immersiveengineering:casull', [
    'immersiveengineering:empty_casing', 'immersiveengineering:empty_casing',
    'immersiveengineering:empty_casing', 'immersiveengineering:empty_casing',
    'minecraft:gunpowder', 'minecraft:gunpowder',
    'minecraft:iron_nugget', 'minecraft:iron_nugget',
  ]).id('kubejs:loot_aligned/casull')

  // 2026-09-29 (direct ask: "the tesla coil recipe is way too faffy... i
  // dont want the flux point to be an ingredient, nor do i want the copper
  // coil. can you replace these with netherite ingot and diamond blocks
  // respectively"): Flux Point -> netherite ingot, both LV coils -> diamond
  // blocks. The coil is no longer born wired; it takes power from a Flux
  // Point placed next to it like any other machine.
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
  event.remove({ output: 'refinedstorage:processor_binding' })
  event.shaped('8x refinedstorage:processor_binding', [
    'SLS',
  ], {
    S: '#forge:string',
    L: 'minecraft:rotten_flesh',
  }).id('kubejs:loot_aligned/processor_binding')

  event.remove({ output: 'refinedstorage:construction_core' })
  event.shapeless('refinedstorage:construction_core', [
    'refinedstorage:basic_processor',
    'minecraft:lapis_lazuli',
  ]).id('kubejs:loot_aligned/construction_core')

  // --- Simple Guns: reworked ---
  event.remove({ output: 'simple_guns_reworked:fuel_tank' })
  event.shapeless('simple_guns_reworked:fuel_tank', [
    'simple_guns_reworked:empty_fuel_tank',
    'minecraft:gunpowder', 'minecraft:gunpowder',
    'minecraft:coal', 'minecraft:coal',
  ]).id('kubejs:loot_aligned/fuel_tank')

  // Shotgun shells take Shrapnel instead of gravel, 2026-09-29 (direct ask:
  // "can the crafting material of ammo be shrapnel instead of gravel").
  // r_3 (5 shotgun_ammo) is the only Simple Guns recipe with gravel in it.
  event.replaceInput({ id: 'simple_guns_reworked:r_3' }, 'minecraft:gravel', 'kubejs:shrapnel')

  // --- Dead ends pulled, 2026-09-28 ---
  // Assault Rifle: reported as a gun that can't fire; the user asked to
  // "pull it". r_10 is the only recipe that makes
  // simple_guns_reworked:assault_rifle, and no recipe uses it as an input.
  event.remove({ id: 'simple_guns_reworked:r_10' })
  // IE Generator Block + Radiator: parts for the Diesel Generator, which
  // was dropped 2026-09-11 for Generator Galore's Culinary Generator. No
  // recipe uses either block. The Radiator is also an Excavator part, and
  // the Excavator is unused in this pack too.
  event.remove({ id: 'immersiveengineering:crafting/generator' })
  event.remove({ id: 'immersiveengineering:crafting/radiator' })
})
