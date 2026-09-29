// Simple Guns: reworked damage bump (2026-09-27, direct ask: "increase the
// damage done by the guns. keep any existing scaling on the guns from the
// mod, just give them all an overall bump"). The user picked +50%.
//
// How the mod deals damage, decompiled from
// simple_guns_reworked-1.9.9-forge-1.20.1.jar (an MCreator mod with no
// config): every weapon fires an AbstractArrow subclass. That covers all 14
// entity types in SimpleGunsReworkedModEntities, including the laser's
// `ray`, the flamethrower, grenades, rockets and potatoes. Each shot's
// procedure builds the projectile via getArrow(level, shooter, damage,
// knockback, ...), which calls setBaseDamage(<per-gun constant>, 1.5-7.0)
// BEFORE addFreshEntity. So at EntityEvents.spawned the gun's own number is
// already set. Multiplying it there keeps everything the mod does on top:
// vanilla arrow damage = ceil(speed x baseDamage) + crit roll, per-gun
// knockback, fire ticks, and the differences between guns.
//
// Not covered: the blast from bazooka / grenade / charged-potato impacts.
// Those call Level#explode with a NULL source entity and a fixed power
// (3.0 / 2.0 / 4.0), so the damage can't be traced to a gun. Raising the
// power would also widen the blast. Their direct hits ARE bumped, since
// the projectile itself is an arrow. Since 2026-09-28 those blasts no
// longer break blocks or hurt players (explosion_player_safety.js);
// their damage to mobs is unchanged.
//
// The tag stops a double bump. EntityEvents.spawned also fires when a
// saved chunk reloads an arrow stuck in the ground, and tags persist in
// entity NBT.
var GUN_DAMAGE_MULTIPLIER = 1.5
var GUN_DAMAGE_NAMESPACE = 'simple_guns_reworked:'
var GUN_DAMAGE_TAG = 'td_gun_dmg_bumped'

EntityEvents.spawned((event) => {
  var e = event.entity
  if (`${e.type}`.indexOf(GUN_DAMAGE_NAMESPACE) !== 0) return
  if (e.getTags().contains(GUN_DAMAGE_TAG)) return
  try {
    e.setBaseDamage(e.getBaseDamage() * GUN_DAMAGE_MULTIPLIER)
    e.addTag(GUN_DAMAGE_TAG)
  } catch (err) {
    // Not an arrow after all (a future mod update adding a different
    // entity type) - leave it untouched.
  }
})
