// Tier 4 is Open Modular Turrets Reborn's Grenade and Rocket Turrets; the
// mod's own turret and part recipes are unchanged. Their parts need a lot of
// Ferronite, and mining this world's thin stone layer is an unreliable supply,
// so this adds a crafting route to Raw Ferronite (which smelts into ingots)
// from IE steel. Steel comes from iron in a vanilla blast furnace
// (tier3_loot_aligned_recipes.js).
ServerEvents.recipes((event) => {
  event.shapeless('omtreborn:raw_ferronite', [
    'immersiveengineering:ingot_steel',
    'immersiveengineering:ingot_steel',
    'minecraft:redstone',
  ]).id('kubejs:loot_aligned/raw_ferronite')

  // The turrets run on power alone (doTurretsNeedAmmo = false in
  // config/omtreborn-common.toml), so their ammo does nothing and isn't
  // craftable.
  event.remove({ output: 'omtreborn:ammo_grenade' })
  event.remove({ output: 'omtreborn:ammo_rocket' })
})
