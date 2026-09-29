// Friendly explosions still hurt mobs but spare players and blocks. A blast is
// an enemy's only when getExploder() returns something other than a player;
// null or a player means friendly. getExploder() is vanilla's
// Explosion#getIndirectSourceEntity(): the exploding entity if it is living,
// a PrimedTnt's owner or a projectile's owner, else null.
//
// The wave roster's only explosive mob is Undead Nights' Demolition Zombie,
// which owns the TNT it throws and is the source of its own blast. Player
// weapons, SecurityCraft mines and I.M.S. bombs, turret shells and the
// airdrop plane crash give null or a player. Supplementaries cannon balls
// never fire the Detonate event, so they bypass this. mine_player_safety.js
// and omtreborn_grenade_safety.js add a second layer for their own blasts.
LevelEvents.afterExplosion((event) => {
  var exploder = event.getExploder()
  if (exploder != null && `${exploder.type}` !== 'minecraft:player') return

  // afterExplosion fires on Forge's ExplosionEvent.Detonate, before vanilla
  // applies the blast's entity and block lists. getAffectedEntities() returns a
  // copy, so taking entries out while iterating it is safe.
  event.getAffectedEntities().forEach((e) => {
    if (`${e.type}` === 'minecraft:player') event.removeAffectedEntity(e)
  })
  event.removeAllAffectedBlocks()
})
