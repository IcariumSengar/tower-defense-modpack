// Friendly explosions still hurt mobs but spare players, dropped items, XP orbs
// and blocks. A blast is an enemy's only when getExploder() returns something
// other than a player or a Sentry; null means friendly. getExploder() is
// vanilla's Explosion#getIndirectSourceEntity(): the exploding entity if it is
// living, a PrimedTnt's owner or a projectile's owner, else null.
//
// The wave roster's only explosive mob is Undead Nights' Demolition Zombie,
// which owns the TNT it throws and is the source of its own blast. Player
// weapons, SecurityCraft mines and I.M.S. bombs, turret shells and the
// airdrop plane crash give null or a player. A Sentry owns whatever it fires
// from the container under it, Supplementaries bombs included. Supplementaries
// cannon balls never fire the Detonate event, so the pack's
// supplementaries-common.toml disables the cannon and its balls.
// mine_player_safety.js and omtreborn_grenade_safety.js add a second layer for
// their own blasts.
var FRIENDLY_EXPLODER_TYPES = ['minecraft:player', 'securitycraft:sentry']

// Items and XP orbs have 5 HP, so a blast would destroy every loot bag and orb
// lying in its reach.
var FRIENDLY_BLAST_SPARED_TYPES = ['minecraft:player', 'minecraft:item', 'minecraft:experience_orb']

// Strips the spared entity types and every block from a friendly blast.
function spareFriendlyBlast(event) {
  // getAffectedEntities() returns a copy, so removing while iterating is safe.
  event.getAffectedEntities().forEach((e) => {
    if (FRIENDLY_BLAST_SPARED_TYPES.includes(`${e.type}`)) event.removeAffectedEntity(e)
  })
  event.removeAllAffectedBlocks()
}

// afterExplosion fires on Forge's ExplosionEvent.Detonate, before vanilla
// applies the blast's entity and block lists.
LevelEvents.afterExplosion((event) => {
  // No explosion removes the pedestal block, whatever its source, or the
  // airdrop crate's beacon (wave_airdrop.js), which would drop as a free item.
  var level = event.getLevel()
  var data = worldData(level)
  if (data && data.contains('td_pedestalX')) {
    event.removeAffectedBlock(level.getBlock(data.getInt('td_pedestalX'), data.getInt('td_pedestalY'), data.getInt('td_pedestalZ')))
  }
  if (data && data.getBoolean('td_airdropBeaconActive')) {
    event.removeAffectedBlock(level.getBlock(data.getInt('td_airdropBeaconX'), data.getInt('td_airdropBeaconY'), data.getInt('td_airdropBeaconZ')))
  }

  var exploder = event.getExploder()
  if (exploder != null && !FRIENDLY_EXPLODER_TYPES.includes(`${exploder.type}`)) return
  spareFriendlyBlast(event)
})
