// Multiplies the base damage of every Simple Guns Reworked projectile by
// GUN_DAMAGE_MULTIPLIER. Every projectile the mod fires, even the laser's ray
// and the flamethrower's flames, is an AbstractArrow whose base damage the gun
// sets before it joins the world, so scaling it on spawn keeps the
// differences between guns.
//
// The flamethrower, bazooka, charged potato and grenade fire projectiles with
// 0 base damage, so the multiplier does nothing for them. Their damage is fire
// or an impact blast. The blasts are not scaled: they come from Level#explode
// with no source entity and a fixed power, and more power would also widen
// the blast. explosion_player_safety.js keeps those blasts from breaking
// blocks or hurting players. The flamethrower's bump is a longer burn instead
// (see the hurt handler below).
var GUN_DAMAGE_MULTIPLIER = 1.5
var GUN_DAMAGE_NAMESPACE = 'simple_guns_reworked:'
var GUN_DAMAGE_TAG = 'td_gun_dmg_bumped'
var GUN_FLAME_PROJECTILE = 'simple_guns_reworked:flame_thrower_projectile'
var GUN_FLAME_BURN_TICKS = 150 // 7.5 s; a burning arrow's hit sets 100 (5 s)

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

// A flamethrower hit sets the mob burning for 5 s (vanilla's rule for any
// burning arrow) just before this event; this stretches that burn to
// GUN_FLAME_BURN_TICKS. A hit that lit nothing (the flames were put out) is
// left alone, and so are players. EntityEvents.hurt fires on every attack
// attempt, so the projectile type is tested first. If the hit is then
// refused, the arrow restores the mob's earlier fire time itself.
EntityEvents.hurt((event) => {
  var direct = event.getSource().getImmediate()
  if (direct == null || `${direct.type}` !== GUN_FLAME_PROJECTILE) return
  var entity = event.getEntity()
  if (`${entity.type}` === 'minecraft:player') return
  var fire = entity.getRemainingFireTicks()
  if (fire > 0 && fire < GUN_FLAME_BURN_TICKS) entity.setRemainingFireTicks(GUN_FLAME_BURN_TICKS)
})
