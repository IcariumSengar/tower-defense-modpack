// Loot bag drops for wave mob kills. BountyBags' own mob drops are turned off
// (enableDrops = false in config/bountybags-common.toml), so this script is
// the only thing that makes mobs drop bags.
//
// Bag contents live in kubejs/data/bountybags/loot_tables/items/<tier>.json.
// BountyBags uses each file only to seed config/bountybags/<tier>_bag.toml
// when that TOML is missing; after that the TOML wins, so a contents change
// reaches an install only once its TOML is deleted. tools/sync_instance.sh and
// tools/sync_server.sh replace config/ wholesale, which does that.

// Must cover every mob type in wave_spawner.js's WAVE_MOB_TYPES and in
// config/undeadnights_horde_mobs_config.json; a type missing here never drops
// a bag. The four lists only group mobs by toughness; every mob gets the same
// odds. flesh_death_sound.js keeps a copy of EPIC_MOBS plus LEGENDARY_MOBS.
const UNCOMMON_MOBS = ['minecraft:zombie', 'minecraft:husk', 'minecraft:drowned', 'minecraft:zombie_villager', 'mutantszombies:mutant_zombie', 'mutantszombies:blister_zombie', 'undeadnights:horde_zombie']
const RARE_MOBS = ['mutantszombies:split_head_zombie']
const EPIC_MOBS = ['undeadnights:elite_zombie', 'mutantszombies:rotten_mutant']
const LEGENDARY_MOBS = ['mutantszombies:crawler', 'undeadnights:demolition_zombie', 'mutantszombies:zombie_brute', 'mutantszombies:mutant_brute']

const ALL_WAVE_MOBS = UNCOMMON_MOBS.concat(RARE_MOBS, EPIC_MOBS, LEGENDARY_MOBS)

// Four independent rolls per kill, so one kill can drop more than one bag.
// The quest book's "Spoils of War" quest (campaign.snbt) quotes these odds.
//
// Only td_wave_mob mobs drop bags (wave spawns, bosses and tagged Undead Nights
// hordes). Structure mobs and guards of the same types never do, or their
// spawners would be endless bag sources. entityPredicate tests the killed mob
// (LootJS's THIS_ENTITY).
LootJS.modifiers((event) => {
  var lbdIsWaveMob = function (entity) {
    return entity.getTags().contains('td_wave_mob')
  }
  ALL_WAVE_MOBS.forEach((id) => {
    event.addEntityLootModifier(id).entityPredicate(lbdIsWaveMob).randomChance(0.2).addLoot('bountybags:uncommon_loot_bag')
    event.addEntityLootModifier(id).entityPredicate(lbdIsWaveMob).randomChance(0.035).addLoot('bountybags:rare_loot_bag')
    event.addEntityLootModifier(id).entityPredicate(lbdIsWaveMob).randomChance(0.03).addLoot('bountybags:epic_loot_bag')
    event.addEntityLootModifier(id).entityPredicate(lbdIsWaveMob).randomChance(0.02).addLoot('bountybags:legendary_loot_bag')
  })
})
