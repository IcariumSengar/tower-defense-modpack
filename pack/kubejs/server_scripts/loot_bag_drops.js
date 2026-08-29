// Which mob kills drop which loot bag tier. Tier tracks wave-composition
// tier:
//   - Wave 1 mobs (zombie, skeleton) -> Scavenger's Bag (Common)
//   - Wave 2-3 additions (spider, flesh_human, flesh_villager)
//     -> Fortified Cache (Uncommon). Witch was here too until removed
//     from the roster entirely 2026-08-29 (see docs/IDEAS.md's "Mob
//     roster exclusions" note).
//   - Wave 4-8 additions (wither skeleton, ravager, plaquecreaturetwo,
//     flesh_suffer, bruteplaquecreatureone, flesh_hunter_two,
//     flesh_boomer, plaquethreelegcreature) -> Warlord's Hoard (Rare) -
//     waves 6-8 (2026-08-29) kept the same tier-by-wave-number
//     convention as wave 4-5's TFTH additions, rather than sorting by
//     TFTH's own germ/awareness stage split
// Also covers husk/drowned/creeper under Common even though they're not
// part of the curated wave roster, in case they show up some other way
// (Epic Siege Mod, a future wave, etc.) — cheap to leave in.
//
// TFTH mobs folded back into the tier lists (2026-08-19) alongside
// wave_spawner.js's wave-2-onward TFTH additions — addEntityLootModifier
// works the same for modded entity IDs as vanilla ones, no special
// handling needed.
//
// Each mob group only ever rolls its own tier's bag (no cross-tier
// entries) - a common zombie can never drop a Warlord's Hoard - which
// already satisfied "reserve higher tier drops to higher tier enemies
// only" once tier grouping was introduced.
//
// Drop RATE was inverted until 2026-08-19: Rare rolled at 75% (more
// likely than Common's 15%), the opposite of what "rare" should mean.
// Fixed so rarity now tracks both drop rate and content quality in the
// same direction - Common is the bag you see most often, Rare is the
// one that's genuinely a rare event even from a mini-boss kill.

const COMMON_MOBS = ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:husk', 'minecraft:drowned', 'minecraft:creeper']
const UNCOMMON_MOBS = ['minecraft:spider', 'the_flesh_that_hates:flesh_human', 'the_flesh_that_hates:flesh_villager']
const RARE_MOBS = ['minecraft:wither_skeleton', 'minecraft:ravager', 'the_flesh_that_hates:plaquecreaturetwo', 'the_flesh_that_hates:flesh_suffer', 'the_flesh_that_hates:bruteplaquecreatureone', 'the_flesh_that_hates:flesh_hunter_two', 'the_flesh_that_hates:flesh_boomer', 'the_flesh_that_hates:plaquethreelegcreature']

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
    event.addEntityLootModifier(id).randomChance(0.5).addLoot('kubejs:scavengers_bag')
  })

  UNCOMMON_MOBS.forEach((id) => {
    event.addEntityLootModifier(id).randomChance(0.25).addLoot('kubejs:fortified_cache')
  })

  RARE_MOBS.forEach((id) => {
    event.addEntityLootModifier(id).randomChance(0.1).addLoot('kubejs:warlords_hoard')
  })
})
