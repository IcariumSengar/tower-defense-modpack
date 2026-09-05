// Real live decision, 2026-09-05: TFTH is being uninstalled entirely
// (see wave_spawner.js's WAVES header comment for the roster removal),
// but one specific TFTH death sound is kept for atmosphere, applied to
// higher-tier mob kills only - not every trash-floor zombie. Real
// footprint tradeoff, decided by the user: extract the one audio asset
// into this pack's own resource pack (pack/kubejs/assets/kubejs/
// sounds/flesh_suffer_death.ogg + sounds.json) rather than keep TFTH
// installed dormant just to borrow it.
//
// Sound picked from TFTH's own real sound registry (checked directly,
// not guessed): `suffer_death.ogg` - Flesh Suffer's own death cry. Real
// justification, not arbitrary: Flesh Suffer was this pack's own
// documented most dangerous removed mob (real combat log showed it
// killing the player 4 separate times at wave 5, before a damage nerf),
// making its death sound the most genuinely dread-associated audio
// asset in TFTH's whole roster - the closest fit to "distinctive/
// atmospheric," not just "a random flesh groan."
//
// "Higher-tier only" = loot_bag_drops.js's own EPIC_MOBS/LEGENDARY_MOBS
// tiers, redeclared here per this codebase's established cross-file
// duplication convention (server_scripts don't reliably share top-level
// var/const - see mob_aggro.js's own real collision writeup for why
// that matters).
var HIGH_TIER_DEATH_SOUND_TYPES = [
  'undeadnights:elite_zombie',
  'mutantszombies:spitter',
  'mutantszombies:crawler',
  'undeadnights:demolition_zombie',
  'mutantszombies:zombie_brute',
  'mutantszombies:mutant_brute',
]

// Real KubeJS API, confirmed by decompiling LivingEntityDeathEventJS/
// EntityEventJS directly rather than guessed - `getEntity()`/
// `getLevel()` (bean-style access via event.entity/event.level both
// resolve to those same real methods in this Rhino build), explicit
// getX()/getY()/getZ() used for coordinates matching this codebase's
// own established safe pattern elsewhere (bare .x/.y/.z proved
// unreliable on other classes earlier this session).
EntityEvents.death((event) => {
  var entity = event.entity
  if (!HIGH_TIER_DEATH_SOUND_TYPES.includes(`${entity.type}`)) return
  var level = event.level
  level.getServer().runCommandSilent(
    `playsound kubejs:flesh_suffer_death hostile @a ${entity.getX()} ${entity.getY()} ${entity.getZ()} 1 1`
  )
})
