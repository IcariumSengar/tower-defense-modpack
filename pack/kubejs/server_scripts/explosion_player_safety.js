// Friendly explosion safety, 2026-09-28. Direct ask: explosions "dont
// blow up blocks and dont harm the player... across the board. i.e for
// all turrets or traps", confirmed to include the player's own weapons
// (Simple Guns bazooka/grenade/charged potato) and the I.M.S.
//
// **Rule**: an explosion that can't be traced to a non-player mob keeps
// hurting mobs but loses its block list and every player target. The
// trace is `event.getExploder()`, which KubeJS maps to vanilla's
// `Explosion#getIndirectSourceEntity()` (decompiled from the 1.20.1 srg
// jar): the exploding entity if it is a LivingEntity, a PrimedTnt's
// owner, or a projectile's owner, else null. Same afterExplosion hook
// and list-pruning calls as mine_player_safety.js (see its header for
// why they really stop the damage and the block breaking).
//
// **Every explosion source in the installed jars** (a scan for classes
// referencing Explosion / ExplosionInteraction / PrimedTnt, then each
// call site decompiled):
// Enemy, left alone (exploder is the mob):
// - Undead Nights Demolition Zombie's thrown TNT: TntIgniteAndThrowGoal
//   spawns a vanilla PrimedTnt owned by the zombie.
// - The Demolition Zombie itself when hurt while burning
//   (DemolitionZombieEntity.hurt: explode(this, power 5, TNT, fire)).
// - Creepers (stripped from spawns; would still count as enemy).
// Friendly, sanitized (exploder null or a player):
// - Simple Guns bazooka (3.0, TNT), grenade (2.0) and charged potato
//   (4.0, both NONE): Level#explode(null, ...) from each projectile's
//   onHitEntity/onHitBlock. The jar has no other explode call.
// - SecurityCraft I.M.S. bomb (7.0): source is the IMSBomb, a Fireball
//   with no vanilla owner (SC keeps its own Owner), so null. Bouncing
//   Betty (the betty entity, not living), Claymore and the block mines
//   (null), Track Mine (a minecart).
// - OMT Reborn grenade (null, 0.1, NONE).
// - IE HE cartridge (the shooter: a player, or null from the Gun
//   Turret's ownerless shots) and Gunpowder Barrel (a PrimedTnt
//   subclass, owner = igniter).
// - Supplementaries bombs (owner = thrower), vanilla TNT and TNT
//   minecarts (owner = igniter or none), beds/anchors/end crystals.
// - Airdrop plane crash (dyairdrop, null, 4.0, MOB).
// Never reach this hook: Supplementaries cannon balls
// (CannonBallExplosion overrides explode() and never fires Forge's
// Detonate), OMT rockets (no Explosion object at all).
//
// **Why null is safe now** - mine_player_safety.js rejected a null rule
// because it believed the Demolition Zombie threw null-source dynamite.
// That was Zombies More's Explosive Zombie; the roster's Demolition
// Zombie is Undead Nights' (PrimedTnt, above). Zombies More's explosive
// mobs (Explosive Zombie, Boomer) are the only null-source enemies, and
// neither is in the roster.
//
// mine_player_safety.js and omtreborn_grenade_safety.js keep their own
// positive matches as a second layer; pruning an entity or block twice
// is a no-op.
LevelEvents.afterExplosion((event) => {
  var level = event.getLevel()
  if (level.isClientSide()) return // method call - see wave_mob_spike_slow.js's header

  var exploder = event.getExploder()
  if (exploder != null && `${exploder.type}` !== 'minecraft:player') return // an enemy mob's blast - leave it alone

  event.getAffectedEntities().forEach((e) => {
    if (`${e.type}` === 'minecraft:player') event.removeAffectedEntity(e)
  })
  event.removeAllAffectedBlocks()
})
