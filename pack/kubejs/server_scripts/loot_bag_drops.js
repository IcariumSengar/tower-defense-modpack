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
// use.
//
// Reclassified 2026-09-03 (direct follow-up once BountyBags/Lootr were
// live) - the original 2026-09-02 mapping grouped mobs by wave-of-
// first-appearance, which put wither_skeleton in Epic tier even though
// wave_spawner.js's own comments explicitly call it part of the "trash
// floor" alongside zombie/skeleton/spider in every wave it appears in
// (waves 4-8) - wave-of-first-appearance isn't the same thing as actual
// toughness once a wave's roster mixes a new elite in with repeated
// trash-floor mobs. Regrouped by real toughness instead, drawn from
// each mob's own comments/attributes already documented in
// wave_spawner.js:
//   - Uncommon = the trash floor itself (zombie, skeleton, spider,
//     wither_skeleton - all explicitly grouped as "trash floor" in
//     wave_spawner.js's wave 5-8 comment), plus husk/drowned/creeper/
//     zombie_villager for the same "not in the curated roster but cheap
//     to cover" reasoning the old system used.
//   - Rare = the early roster-variety adds that aren't trash-floor
//     filler but aren't elites either (flesh_human, flesh_villager,
//     plaquecreaturetwo).
//   - Epic = the wave 6-7 elites introduced alongside the trash floor,
//     not part of it (bruteplaquecreatureone, flesh_hunter_two,
//     flesh_boomer).
//   - Legendary = the 3 mobs wave_spawner.js's own comments explicitly
//     call the designed finale/climax (ravager - "mini boss";
//     flesh_suffer - TFTH's hardest hitter; plaquethreelegcreature -
//     "the tankiest of the four," closing out wave 8 alongside the
//     ravager).
// Same drop rates as before - only which mob maps to which tier changed.
//
// Each mob group only ever rolls its own tier's bag (no cross-tier
// entries) - a trash-floor zombie can never drop a Legendary bag - same
// standing rule as before: rarity gates both drop rate and which
// enemies can roll which tier.

const UNCOMMON_MOBS = ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:spider', 'minecraft:wither_skeleton', 'minecraft:husk', 'minecraft:drowned', 'minecraft:creeper', 'minecraft:zombie_villager']
const RARE_MOBS = ['the_flesh_that_hates:flesh_human', 'the_flesh_that_hates:flesh_villager', 'the_flesh_that_hates:plaquecreaturetwo']
const EPIC_MOBS = ['the_flesh_that_hates:bruteplaquecreatureone', 'the_flesh_that_hates:flesh_hunter_two', 'the_flesh_that_hates:flesh_boomer']
const LEGENDARY_MOBS = ['minecraft:ravager', 'the_flesh_that_hates:flesh_suffer', 'the_flesh_that_hates:plaquethreelegcreature']

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
