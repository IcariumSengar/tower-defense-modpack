// Open Modular Turrets Reborn, Tier 4's new elite/endgame powered defense
// (docs/IDEAS.md's "Machine progression, Tier 3-4" - "AoE Devastator" was
// the placeholder name, never scoped until now) - 2026-09-15, direct ask
// to source and build more powered mob-damaging machines after a 3-agent
// research deep dive (see docs/IDEAS.md's "Tier 4 deep dive + decision").
//
// Only two of the mod's 10 turret heads were picked, both confirmed via
// its own lang file to deal real area damage (the thing Tier 3's Gun/Chem
// Turret don't do - both are single-target):
// - omtreborn:grenade_turret ("Lobs grenades that deal area damage") -
//   Tier II internals, cheap, fully vanilla/loot ammo (ammo_grenade:
//   redstone + iron nugget + gunpowder, zero Ferronite in the ammo loop).
// - omtreborn:rocket_turret ("Launches powerful rockets with area
//   damage") - Tier III internals + a Ferronite Frame, the flagship pick.
// Passed over: Laser/Rail Gun/Plasma Turret (Tier V, single-target beams,
// not AoE, need an End Crystal or Nether Star - this pack avoids Nether/
// End dependencies on principle, see the loot-aligned recipes below and
// tier3_loot_aligned_recipes.js's header); Incendiary/Relativistic Turret
// (need a magma block/glowstone - both already-diagnosed Nether-locked
// blockers from the Tier 3 sourcing-gap pass); Teleporter Turret (needs
// an actual Eye of Ender, same problem, and it isn't offensive anyway).
//
// All stock recipes for the two turret heads (plus their Tier II/III
// sensor/chamber/barrel components) are already a single crafting-table
// shape each - confirmed by extracting the real recipe JSONs from the
// installed omtreborn-1.1.0.jar, not assumed from the mod's description.
// No workbench/blueprint/assembly step anywhere, same bar that got Create
// and Advanced Tower Defense removed - so none of that needs re-recipeing
// here, unlike Tier 3's IE turrets (which needed a Flux Point spliced
// into their own multiblock recipe to wire up power). Open Modular
// Turrets Reborn isn't a multiblock: the Turret Base block itself is the
// thing with the Forge Energy capability ("Provides energy, inventory,
// and targeting" - its own tooltip), so a plain Flux Plug placed against
// it is the correct, sufficient hookup - no recipe hack needed.
//
// The one real blocker, found by tracing every ingredient in both
// turrets' full component trees: omtreborn:ferronite_ingot, needed
// throughout both tiers' Sensor/Chamber/Barrel and the Ferronite Frame
// (a Rocket Turret alone needs ~17 of them). Its ore (omtreborn:
// ferronite_ore, y -24 to 56 trapezoid via a real Forge biome modifier)
// is NOT a repeat of Tier 3's totally-unreachable IE ores (aluminum/
// silver, whose ranges don't overlap this world's actual ~18-block-thick
// stone slab at all) - Ferronite's range does overlap the real
// generated terrain here, so mining it may well work. But per this
// pack's own standing rule ("tweak the recipes so that they make sense
// with what is already in the loot tables" - the exact call that
// produced tier3_loot_aligned_recipes.js), a mining-only path isn't
// good enough on its own in a world this thin. Kept the mod's own
// mining/smelting chain completely untouched and added one alternate
// route alongside it, same pattern as Flux Dust/Flux Core/Casull/Heavy
// Engineering in that file: refine it straight from Tier 3's own Steel
// (already loot-reachable via the vanilla blast furnace) instead of
// digging for a new ore.
ServerEvents.recipes((event) => {
  event.shapeless('omtreborn:raw_ferronite', [
    'immersiveengineering:ingot_steel',
    'immersiveengineering:ingot_steel',
    'minecraft:redstone',
  ]).id('kubejs:loot_aligned/raw_ferronite')
})
