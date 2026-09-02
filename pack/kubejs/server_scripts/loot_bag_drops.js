// Which mob kills drop which BountyBags tier. Replaces the custom
// scavengers_bag/fortified_cache/warlords_hoard system (2026-09-02,
// direct feedback: "I also dont like the custom loot bags" - part of
// the same Treasure2 replacement pass, see docs/FEATURES.md's
// "Structure & loot mod replacement"). BountyBags' own native mob-drop
// system is disabled entirely (config/bountybags-common.toml,
// enableDrops = false) so this script is the only thing making mobs
// drop bags - same reasoning as disabling Undead Nights' own
// autonomous horde system rather than letting two systems fight over
// the same mobs.
//
// Tier design: BountyBags ships 4 regular tiers (Uncommon/Rare/Epic/
// Legendary, no Common) plus 3 boss-exclusive bags this pack doesn't
// use. The old system's 3 tiers (Common/Uncommon/Rare) mapped to wave-
// of-first-appearance in 3 groups; rather than cramming that onto 3 of
// BountyBags' 4 tiers and leaving Legendary dead, split into 4 groups
// along the same wave-of-first-appearance logic, using the original
// 5-wave campaign's own two designed halves (waves 1-3 "early roster",
// 4-5 "the original campaign's toughest") plus the later 2026-08-29
// TFTH-mob extension (waves 6-8) as its own top tier:
//   - Wave 1 (zombie, skeleton) -> Uncommon
//   - Waves 2-3 (spider, flesh_human, flesh_villager) -> Rare
//   - Waves 4-5, the original campaign's finale roster (wither_skeleton,
//     plaquecreaturetwo, ravager, flesh_suffer) -> Epic
//   - Waves 6-8, the later extension roster (bruteplaquecreatureone,
//     flesh_hunter_two, flesh_boomer, plaquethreelegcreature) -> Legendary
// Also covers husk/drowned/creeper under Uncommon even though they're
// not part of the curated wave roster, in case they show up some other
// way (Epic Siege Mod, a future wave, etc.) - cheap to leave in, same
// as the old system.
//
// Each mob group only ever rolls its own tier's bag (no cross-tier
// entries) - a common zombie can never drop a Legendary bag - same
// standing rule as before: rarity gates both drop rate and which
// enemies can roll which tier.
//
// Drop rate keeps roughly the same halving-per-tier shape the old
// system used (0.5/0.25/0.1), extended one more step down for the new
// top tier so Legendary stays a genuinely rare event even from a
// wave-8 kill.

const UNCOMMON_MOBS = ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:husk', 'minecraft:drowned', 'minecraft:creeper']
const RARE_MOBS = ['minecraft:spider', 'the_flesh_that_hates:flesh_human', 'the_flesh_that_hates:flesh_villager']
const EPIC_MOBS = ['minecraft:wither_skeleton', 'minecraft:ravager', 'the_flesh_that_hates:plaquecreaturetwo', 'the_flesh_that_hates:flesh_suffer']
const LEGENDARY_MOBS = ['the_flesh_that_hates:bruteplaquecreatureone', 'the_flesh_that_hates:flesh_hunter_two', 'the_flesh_that_hates:flesh_boomer', 'the_flesh_that_hates:plaquethreelegcreature']

// `LootJS.modifiers(...)` / `.addEntityLootModifier(id).randomChance(n).addLoot(id)`
// - same confirmed-working pattern as the old system, just pointed at
// bountybags:*_loot_bag instead of the custom kubejs:* items.
LootJS.modifiers((event) => {
  UNCOMMON_MOBS.forEach((id) => {
    event.addEntityLootModifier(id).randomChance(0.5).addLoot('bountybags:uncommon_loot_bag')
  })

  RARE_MOBS.forEach((id) => {
    event.addEntityLootModifier(id).randomChance(0.25).addLoot('bountybags:rare_loot_bag')
  })

  EPIC_MOBS.forEach((id) => {
    event.addEntityLootModifier(id).randomChance(0.1).addLoot('bountybags:epic_loot_bag')
  })

  LEGENDARY_MOBS.forEach((id) => {
    event.addEntityLootModifier(id).randomChance(0.04).addLoot('bountybags:legendary_loot_bag')
  })
})
