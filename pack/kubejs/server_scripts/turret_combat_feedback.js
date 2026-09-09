// Turret combat-feedback effects, 2026-09-09 (docs/QUEUE.md Phase 2's
// "not yet picked up" item - unblocked now that Track C shipped real
// Musket Sentry/Anvil Launcher ids, 2026-09-08). Three real trigger
// points, matched to each turret's own actual mechanic rather than
// forced identical - decompiled both turrets' firing procedures directly
// before writing any of this (`TurretT0MushketHeavyMetalOnEntityTickUpdateProcedure`/
// `MusketProjectileUseProcedure`/`TurretT0AnvilLauncherOnEntityTickUpdateProcedure`/
// `FatalAnvilBlockAddedProcedure`, all in the installed
// advanced_tower_defense_mod-3.7 jar), not guessed from the mod's JEI
// listing.
//
// **Musket Sentry** is a real traveling-bullet turret: every shot spawns
// one or more `advanced_tower_defense_mod:pellet` entities (a real
// vanilla `AbstractArrow` subclass, confirmed by decompile - both the
// "shell" and "slug" ammo types use it, only velocity/damage differ), so
// it gets all three effects: muzzle flash + tracer at the pellet's own
// spawn point/lifetime, impact at the hit entity.
//
// **Anvil Launcher** is not a gun - it drops a real vanilla
// `minecraft:falling_block` (carrying `advanced_tower_defense_mod:
// fatal_anvil`) from Y=290 directly above its aimed X/Z, decompiled
// `FatalAnvilBlockAddedProcedure` confirms the actual 60-damage AABB hit
// happens when that block lands and immediately breaks itself, not via
// any event this pack could hook by damage-type string with confidence
// (the two `DamageTypes` constants it references are plain vanilla SRG
// fields, not one of this mod's own - not worth guessing which vanilla
// type they resolve to). So instead of a muzzle flash/tracer it gets a
// distinct "launch telegraph" (at the real sky spawn point) and a
// "landing impact" - detected by tracking the falling_block entity's own
// UUID and firing the moment `level.getEntities()` no longer contains it
// (same polling idiom as ladder_climb_assist.js), not by damage type.
//
// **Real, honest scope caveats, not glossed over**:
// - The `advanced_tower_defense_mod:pellet` type is shared by the mod's
//   whole turret-head roster (150+ variants), only 2 of which this pack
//   actually unlocks - harmless, since nothing else in this pack's
//   recipe chain can ever produce a pellet.
// - The pellet-hit filter uses vanilla's own "arrow" damage message id
//   (confirmed real: `PelletEntity extends AbstractArrow` and its
//   `onHitEntity` calls `super.onHitEntity()` unmodified before removing
//   itself, so damage flows through vanilla's own arrow damage source
//   unchanged) - this pack's roster has no bow-wielding mobs and no
//   dispenser-arrow traps (skeletons were stripped in the 2026-09-06
//   zombie-apocalypse pivot), so in practice this only ever fires for
//   Musket pellets, but it would also fire for a real vanilla arrow if
//   one were ever added later.
// - `minecraft:falling_block` is likewise vanilla-generic (sand/gravel/
//   anvils all use it) - this pack doesn't otherwise spawn any, so in
//   practice this only ever fires for the Anvil Launcher's shell, same
//   caveat as above.
var PELLET_TICK_INTERVAL = 3 // throttled, not per-tick - still ~6.7 updates/sec, smooth enough for a short-lived tracer without scanning every entity every tick
var ANVIL_CHECK_INTERVAL = 5 // falling shells take many seconds to land; no need for tick precision

var trackedAnvilShells = [] // {uuid, x, y, z}

EntityEvents.spawned((event) => {
  var entity = event.entity
  var type = `${entity.type}`
  var level = event.level

  if (type === 'advanced_tower_defense_mod:pellet') {
    // Muzzle flash - fires at the exact tick/position the turret fires,
    // since the pellet spawns at the turret's own muzzle height
    // (confirmed: MusketProjectileUseProcedure sets its spawn Y to
    // `entity.y + turret_fire_from(0.9375)`, not the ground).
    level.getServer().runCommandSilent(
      `particle minecraft:crit ${entity.getX()} ${entity.getY()} ${entity.getZ()} 0.15 0.15 0.15 0.01 6`
    )
    return
  }

  if (type === 'minecraft:falling_block') {
    // Launch telegraph - the shell's real spawn point is Y=290 directly
    // above the target, not the turret itself (see header). A distinct
    // cue from Musket's muzzle flash on purpose - this is an artillery
    // drop, not a gunshot.
    level.getServer().runCommandSilent(
      `particle minecraft:cloud ${entity.getX()} ${entity.getY()} ${entity.getZ()} 0.3 0.3 0.3 0.01 12`
    )
    level.getServer().runCommandSilent(
      `playsound minecraft:item.trident.throw ambient @a ${entity.getX()} ${entity.getY()} ${entity.getZ()} 0.4 0.6`
    )
    trackedAnvilShells.push({ uuid: `${entity.uuid}`, x: entity.getX(), y: entity.getY(), z: entity.getZ() })
  }
})

PlayerEvents.tick((event) => {
  // Bullet tracer trail - a lightweight per-tick particle at every live
  // pellet's current position. Cheap by construction: pellet count is
  // bounded by how often Musket Sentries can fire (50-tick reload,
  // ~12 pellets/shell-shot) and each pellet only lives a second or two
  // at 40-block range, same "throttled tick handler, bounded by real
  // game state" idiom as ladder_climb_assist.js.
  var level = event.entity.getLevel()
  if (level.getTime() % PELLET_TICK_INTERVAL !== 0) return
  var server = level.getServer()
  level.getEntities().forEach((e) => {
    if (`${e.type}` !== 'advanced_tower_defense_mod:pellet') return
    server.runCommandSilent(
      `particle minecraft:smoke ${e.getX()} ${e.getY()} ${e.getZ()} 0 0 0 0 1`
    )
  })
})

EntityEvents.hurt((event) => {
  var source = event.getSource()
  if (source.getType() !== 'arrow') return
  var entity = event.getEntity()
  var level = entity.level
  if (level.isClientSide) return
  level.getServer().runCommandSilent(
    `particle minecraft:crit ${entity.getX()} ${entity.getY() + entity.getBbHeight() / 2} ${entity.getZ()} 0.25 0.25 0.25 0.05 10`
  )
})

PlayerEvents.tick((event) => {
  if (trackedAnvilShells.length === 0) return
  var level = event.entity.getLevel()
  if (level.getTime() % ANVIL_CHECK_INTERVAL !== 0) return

  var liveUuids = {}
  level.getEntities().forEach((e) => {
    liveUuids[`${e.uuid}`] = e
  })

  var stillFalling = []
  var server = level.getServer()

  trackedAnvilShells.forEach((shell) => {
    var live = liveUuids[shell.uuid]
    if (live) {
      // Still falling - refresh its last-known position for a more
      // accurate impact point than the original sky spawn coordinate.
      stillFalling.push({ uuid: shell.uuid, x: live.getX(), y: live.getY(), z: live.getZ() })
      return
    }
    // Gone - landed and broke itself (FatalAnvilBlockAddedProcedure).
    // Position is approximate within ANVIL_CHECK_INTERVAL ticks of fall,
    // same tolerance this codebase already accepts elsewhere for
    // throttled tick-polled effects.
    server.runCommandSilent(
      `particle minecraft:explosion ${shell.x} ${shell.y} ${shell.z} 0 0 0 0 1`
    )
    server.runCommandSilent(
      `playsound minecraft:block.anvil.land block @a ${shell.x} ${shell.y} ${shell.z} 1 0.7`
    )
  })

  trackedAnvilShells = stillFalling
})
