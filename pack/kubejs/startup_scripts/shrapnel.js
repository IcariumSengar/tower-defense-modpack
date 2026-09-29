// Registers Shrapnel (kubejs:shrapnel), a crafting material that only comes
// from fighting: it drops from uncommon, rare and epic loot bags
// (data/bountybags/loot_tables/items) and from bosses (boss_wave.js), and has
// no recipe. Used in the Sentry (securitycraft_traps.js) and shotgun shells
// (tier3_loot_aligned_recipes.js).
StartupEvents.registry('item', (event) => {
  event.create('shrapnel', 'basic')
    .tooltip('§7Scrap metal salvaged from the fight - fuel for Tier 2 tech.')
    .maxStackSize(64)
})
