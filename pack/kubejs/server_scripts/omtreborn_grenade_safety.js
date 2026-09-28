// Grenade Turret explosion player/block safety, 2026-09-16 - direct ask:
// "make sure the explosions from the grenade launcher and rocket
// launcher dont blow up blocks and dont harm the player... across the
// board... for all turrets or traps (bouncing betty etc)."
//
// **Block damage** - already off by the mod's own shipped default.
// Decompiled `GrenadeProjectile.explode()` directly (omtreborn-1.1.0.jar):
// it only calls `Level#explode` with `ExplosionInteraction.BLOCK` (and a
// real 1.4 strength) when `OMTConfig.TURRETS.canGrenadesDestroyBlocks` is
// true - the shipped default is already false, giving
// `ExplosionInteraction.NONE` and a token 0.1 strength instead. Pinned
// explicitly anyway in `pack/defaultconfigs/omtreborn-common.toml`
// alongside the matching Rocket/Railgun toggles, so a future mod update
// changing its own defaults can't silently reopen this - same "pin the
// default, don't just trust it" precedent as securitycraft-server.toml's
// `sentry_bullet_damage` entry.
//
// `RocketProjectile.explode()` (same decompile) never calls `Level#explode`
// at all - just particles, a sound, and its own manual entity-damage
// loop. Rockets were never capable of block damage in the first place;
// no config or script entry needed for that half, and no matching entry
// for it below either (see the next section for why).
//
// **Player damage** - `OMTConfig.TURRETS.globalCanTargetPlayers` pinned
// to false in the same defaultconfigs file. Decompiled
// `OMTUtil.canDamagePlayer()` short-circuits to false the instant this is
// off, before any per-base "Attacks Players" toggle or owner/trust check
// even runs - and every turret head this mod has (Grenade, Rocket, Gun,
// Laser, Rail Gun, Plasma, everything) routes player damage through this
// exact same check. One config flag covers the "across the board, for
// all turrets" half of the ask for every OMT turret, current and future
// - not re-implemented per-turret here.
//
// **The real gap this file exists to close**: even with block-destroy
// off, `GrenadeProjectile.explode()` still calls a genuine vanilla
// `Level#explode(null, x, y, z, 0.1F, ExplosionInteraction.NONE)` before
// its own manual damage loop runs - the same category of problem
// `mine_player_safety.js` already found for SecurityCraft's Claymore/
// Bouncing Betty: a real vanilla `Explosion` object, independent of
// whatever the mod's own permission system decided, can still knock back
// or graze a nearby player. `LevelEvents.afterExplosion` is the same real
// hook that file uses (Forge's `ExplosionEvent.Detonate`, fires before
// vanilla applies any damage or breaks any block) - belt and suspenders
// on top of the config fix above, not a replacement for it. Rocket Turret
// needs no matching entry here - confirmed by decompile that
// `RocketProjectile` never creates a vanilla `Explosion` object at all,
// so `afterExplosion` never fires for it in the first place.
//
// **Matching strategy, deliberately different from `mine_player_safety.js`'s
// own Bouncing Betty approach**: a grenade is a lobbed, traveling
// projectile - Grenade Turret's own `baseRange` config is 18 blocks (+2
// more from a Range upgrade), so it can detonate anywhere up to ~20
// blocks from where it spawned, not near its spawn point the way a
// Bouncing Betty stays exactly where it's placed. A spawn-position-plus-
// radius match wide enough to cover that travel distance would be wide
// enough to also swallow a real Demolition Zombie dynamite blast going
// off nearby during the same wave fight - exactly the mistake
// `mine_player_safety.js`'s own header already ruled out once for a
// different trap. Instead: hold the live `omtreborn:grenade_projectile`
// entity itself (not a position snapshot) and re-read its real, current
// `getX()/getY()/getZ()` at the moment an explosion fires - since the
// explosion always originates from the grenade's own exact position the
// instant it calls `Level#explode`, right before discarding itself, a
// 1-block match radius is effectively exact, not a fuzzy window - no
// separate registry bookkeeping (spawn tick, fuse window) needed either.
var liveGrenades = []

EntityEvents.spawned((event) => {
  var entity = event.entity
  if (`${entity.type}` !== 'omtreborn:grenade_projectile') return
  liveGrenades.push(entity)
})

// Prunes independently of whether any explosion is ever matched to it -
// same hygiene mine_player_safety.js's own pendingBouncingBettys prune
// uses, needed here too since a grenade removed some other way (world
// unload, mid-air despawn) would otherwise leak in this array forever.
// `isRemoved()` (not `isAlive()` - GrenadeProjectile isn't a LivingEntity,
// it's a ThrowableProjectile, which has no `isAlive()` method at all) is
// the real base Entity method the mod's own code checks for the same
// purpose (decompiled `TurretProjectile`/`GrenadeProjectile`: every
// early-out guard reads `!this.isRemoved()`).
PlayerEvents.tick((event) => {
  if (liveGrenades.length === 0) return
  liveGrenades = liveGrenades.filter((e) => !e.isRemoved())
})

LevelEvents.afterExplosion((event) => {
  var level = event.getLevel()
  if (level.isClientSide()) return // method call - see wave_mob_spike_slow.js's header

  var ex = event.getX()
  var ey = event.getY()
  var ez = event.getZ()

  var matchIdx = liveGrenades.findIndex((e) => {
    if (e.isRemoved()) return false
    var dx = e.getX() - ex
    var dy = e.getY() - ey
    var dz = e.getZ() - ez
    return dx * dx + dy * dy + dz * dz <= 1.0
  })
  if (matchIdx === -1) return // not ours - leave it alone (Demolition Zombie's dynamite included)

  liveGrenades.splice(matchIdx, 1)

  event.getAffectedEntities().forEach((e) => {
    if (`${e.type}` === 'minecraft:player') event.removeAffectedEntity(e)
  })
  event.removeAllAffectedBlocks()
})
