// Multiplies the base damage of every Simple Guns Reworked projectile by
// GUN_DAMAGE_MULTIPLIER. Every projectile the mod fires, even the laser's ray
// and the flamethrower's flames, is an AbstractArrow whose base damage the gun
// sets before it joins the world, so scaling it on spawn keeps the
// differences between guns.
//
// Impact blasts (bazooka, grenade, charged potato) are not scaled: they come
// from Level#explode with no source entity and a fixed power, and more power
// would also widen the blast. explosion_player_safety.js keeps those blasts
// from breaking blocks or hurting players.
var GUN_DAMAGE_MULTIPLIER = 1.5
var GUN_DAMAGE_NAMESPACE = 'simple_guns_reworked:'
var GUN_DAMAGE_TAG = 'td_gun_dmg_bumped'

EntityEvents.spawned((event) => {
  var e = event.entity
  if (`${e.type}`.indexOf(GUN_DAMAGE_NAMESPACE) !== 0) return
  // The spawned event also fires when a reloaded chunk brings back an arrow
  // stuck in the ground; the tag is saved with the entity.
  if (e.getTags().contains(GUN_DAMAGE_TAG)) return
  try {
    e.setBaseDamage(e.getBaseDamage() * GUN_DAMAGE_MULTIPLIER)
    e.addTag(GUN_DAMAGE_TAG)
  } catch (err) {
    // Not an arrow: leave it alone.
  }
})
