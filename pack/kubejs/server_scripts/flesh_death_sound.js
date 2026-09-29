// Plays a death cry where an elite mob dies. kubejs:flesh_suffer_death is
// Flesh Suffer's death sound from The Flesh That Hates, bundled under
// kubejs/assets/kubejs/ (sounds/flesh_suffer_death.ogg and sounds.json).
//
// HIGH_TIER_DEATH_SOUND_TYPES is loot_bag_drops.js's EPIC_MOBS plus
// LEGENDARY_MOBS, minus mutantszombies:rotten_mutant.
var HIGH_TIER_DEATH_SOUND_TYPES = [
  'undeadnights:elite_zombie',
  'mutantszombies:crawler',
  'undeadnights:demolition_zombie',
  'mutantszombies:zombie_brute',
  'mutantszombies:mutant_brute',
]

EntityEvents.death((event) => {
  var entity = event.entity
  if (!HIGH_TIER_DEATH_SOUND_TYPES.includes(`${entity.type}`)) return
  var level = event.level
  // level.runCommandSilent would run this once per player in the level.
  level.getServer().runCommandSilent(
    `playsound kubejs:flesh_suffer_death hostile @a ${entity.getX()} ${entity.getY()} ${entity.getZ()} 1 1`
  )
})
