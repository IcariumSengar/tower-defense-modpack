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
// Reclassified 2026-09-03 by real toughness (mob-of-first-appearance
// isn't the same thing once a wave mixes a new elite in with repeated
// trash-floor mobs) - see git history for that pass's full reasoning,
// superseded below.
//
// **Reclassified again 2026-09-06** for the full zombie-apocalypse
// roster pivot (see wave_spawner.js's WAVE_MOB_TYPES for the complete
// writeup) - same toughness-tiering principle, applied to the new
// roster:
//   - Uncommon = the trash floor (zombie/husk/drowned/zombie_villager,
//     the roster's actual filler) plus zombified_piglin (real vanilla
//     headroom, never in any wave, same "cheap to cover" reasoning as
//     before) and Undead Nights' own Horde Zombie (a numbers-focused
//     reinforcement, not an elite).
//   - Rare = TFTH's early-Germ-stage variety adds - not trash-floor
//     filler, not elites either.
//   - Epic = the wave 6-8 elites (TFTH's Awareness-stage mobs, Undead
//     Nights' Elite Zombie) plus 3 of Mutants and Zombies' own mid-tier
//     mobs (ranged/speed variants, not its 2 confirmed tank mobs).
//   - Legendary = the toughest confirmed mobs in the new roster -
//     TFTH's own hardest hitters, Undead Nights' Demolition Zombie (the
//     one that can breach the base itself), and Mutants and Zombies'
//     2 tank mobs (Zombie Brute, Mutant Brute).
// Same drop rates as before - only which mob maps to which tier changed.
//
// Each mob group only ever rolls its own tier's bag (no cross-tier
// entries) - a trash-floor zombie can never drop a Legendary bag - same
// standing rule as before: rarity gates both drop rate and which
// enemies can roll which tier.

// Full zombie-apocalypse roster pivot (2026-09-06) - see
// wave_spawner.js's WAVE_MOB_TYPES for the full writeup. Real ids
// confirmed by decompiling each mod's own registration class, not
// pattern-guessed - includes one real correction along the way: the
// original proposal's "Flesh Unseen" turned out to have no registered
// EntityType at all in this exact TFTH build (config/sounds exist,
// nothing actually summonable), so it's dropped here too, not just from
// the wave table. `minecraft:zombified_piglin` is real, confirmed
// vanilla headroom never used in any wave - included here purely for
// loot coverage, same "not in the curated roster but cheap to cover"
// reasoning the old system already used for husk/drowned/creeper.
// `mutantszombies:*` ids confirmed from ModEntities.class directly.
const UNCOMMON_MOBS = ['minecraft:zombie', 'minecraft:husk', 'minecraft:drowned', 'minecraft:zombie_villager', 'minecraft:zombified_piglin', 'the_flesh_that_hates:flesh_human', 'the_flesh_that_hates:flesh_villager', 'undeadnights:horde_zombie']
const RARE_MOBS = ['the_flesh_that_hates:flesh_dog', 'the_flesh_that_hates:flesh_cow', 'the_flesh_that_hates:flesh_sheep', 'the_flesh_that_hates:flesh_pig', 'the_flesh_that_hates:flesh_vindicator', 'the_flesh_that_hates:flesh_pillager', 'the_flesh_that_hates:plaquecreatureone', 'the_flesh_that_hates:plaquecontaminator']
const EPIC_MOBS = ['the_flesh_that_hates:plaquecreaturetwo', 'the_flesh_that_hates:flesh_hunter_two', 'the_flesh_that_hates:bruteplaquecreatureone', 'the_flesh_that_hates:flesh_boomer', 'undeadnights:elite_zombie', 'mutantszombies:spitter', 'mutantszombies:blister_zombie', 'mutantszombies:split_head_zombie']
const LEGENDARY_MOBS = ['the_flesh_that_hates:plaquethreelegcreature', 'the_flesh_that_hates:flesh_suffer', 'undeadnights:demolition_zombie', 'mutantszombies:zombie_brute', 'mutantszombies:mutant_brute']

// Legendary jackpot roll (2026-09-06, raised in the "some ideas..."
// batch: "during any wave there is a slim chance of a Legendary Loot
// bag being dropped"). Additive to the per-tier gating above, not a
// replacement - every wave mob, regardless of its own tier, gets a
// SECOND independent roll at a flat 2% to also drop a bonus
// `bountybags:legendary_loot_bag`. This is what makes it read as a
// jackpot: a trash-floor zombie kill can genuinely pay off big, not
// just the wave-8 finale mobs that already roll Legendary on their own
// terms. Deliberately kept in this file only - no touches to
// wave_spawner.js/wave_status.js/mob_aggro.js.
const ALL_WAVE_MOBS = UNCOMMON_MOBS.concat(RARE_MOBS, EPIC_MOBS, LEGENDARY_MOBS)
const JACKPOT_CHANCE = 0.02

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

  ALL_WAVE_MOBS.forEach((id) => {
    event.addEntityLootModifier(id).randomChance(JACKPOT_CHANCE).addLoot('bountybags:legendary_loot_bag')
  })
})
