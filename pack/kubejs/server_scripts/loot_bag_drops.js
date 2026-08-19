// Which mob kills drop which loot bag tier. Retuned for the vanilla-only
// 5-wave campaign (see wave_spawner.js) now that TFTH is removed — tier
// now tracks wave-composition tier instead of "vanilla vs. TFTH":
//   - Wave 1 mobs (zombie, skeleton) -> Scavenger's Bag (Common)
//   - Wave 2-3 additions (spider, witch) -> Fortified Cache (Uncommon)
//   - Wave 4-5 additions (wither skeleton, ravager) -> Warlord's Hoard (Rare)
// Also covers husk/drowned/creeper under Common even though they're not
// part of the curated wave roster, in case they show up some other way
// (Epic Siege Mod, a future wave, etc.) — cheap to leave in.

const COMMON_MOBS = ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:husk', 'minecraft:drowned', 'minecraft:creeper']
const UNCOMMON_MOBS = ['minecraft:spider', 'minecraft:witch']
const RARE_MOBS = ['minecraft:wither_skeleton', 'minecraft:ravager']

// `LootJS.modifiers(...)` is the correct, current outer syntax —
// confirmed directly from LootJS's own source (LootJSEvent.java
// registers "LootJS" as a KubeJS 6 EventGroup with a "modifiers"
// handler). The chained builder method is `.addLoot(...)`, not
// `.thenAdd(...)` — the README documents `.thenAdd` but that method
// doesn't exist anywhere in LootActionsBuilderJS or the
// LootActionsContainer interface it implements (confirmed by reading
// both directly, and by the actual in-game TypeError naming
// LootActionsBuilderJS when .thenAdd was tried). `.addLoot` is real,
// confirmed both from that source and from LootJS's own example_scripts.
LootJS.modifiers((event) => {
  // addEntityLootModifier is only confirmed to accept a single entity ID at
  // a time (every verified example does this), so each tier is wired up
  // per-entity rather than passing the whole array in one call.
  COMMON_MOBS.forEach((id) => {
    event.addEntityLootModifier(id).randomChance(0.15).addLoot('kubejs:scavengers_bag')
  })

  UNCOMMON_MOBS.forEach((id) => {
    event.addEntityLootModifier(id).randomChance(0.25).addLoot('kubejs:fortified_cache')
  })

  RARE_MOBS.forEach((id) => {
    event.addEntityLootModifier(id).randomChance(0.75).addLoot('kubejs:warlords_hoard')
  })
})
