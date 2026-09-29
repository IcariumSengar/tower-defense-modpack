// Sentry firing feedback, 2026-09-11 (direct ask: "can the sentries have a
// particle effect that tells me that its firing... we added in a cool
// particle effect feature earlier"). That earlier feature was
// turret_combat_feedback.js, deleted with Advanced Tower Defense the same
// day SecurityCraft's traps took over Tier 2 (see securitycraft_traps.js's
// header) - the muzzle-flash/impact idiom just needed re-hooking onto the
// real replacement turret, not reinventing.
//
// Decompiled SecurityCraft's own `Sentry`/`Bullet` classes directly before
// writing this, not guessed from the old ATD version: every shot spawns a
// real `securitycraft:bullet` entity (`Bullet extends AbstractArrow`,
// confirmed via `SCContent.BULLET_ENTITY`), so the same
// `EntityEvents.spawned` muzzle-flash hook the old pellet system used
// applies directly. Its `m_5790_` (onHitEntity) calls
// `DamageSources.arrow(this, owner)` - vanilla's own "arrow" damage
// message id, same as any vanilla arrow - confirmed real via decompile,
// not assumed. (The impact hook used to key on that 'arrow' id alone -
// see the 2026-09-28 note above it for why it no longer does.)
//
// Deliberately just the two event-driven cues (muzzle + impact), not the
// old system's third effect (a per-tick tracer trail scanning every live
// pellet) - that was a real recurring tick cost for a purely cosmetic
// trail the direct ask never mentioned; a Sentry's bullet is a fast, short-
// lived vanilla arrow and reads fine without one.
//
// **Made "cooler", 2026-09-15 direct ask** (same pass as tesla_coil_
// cinematics.js's own upgrade, same reasoning applies here). Muzzle
// flash gets a real third layer on top of the existing `crit` spark: a
// `smoke` puff for a "shot just fired" read and one `flash` (the bright
// Totem-pop particle) for a punchy muzzle pop, instead of a lone crit
// burst. Impact gets a bigger `crit` burst, its own `smoke` puff, and a
// NEW sound - there wasn't one here before at all; vanilla arrows only
// ever get a dedicated hit sound on BLOCK impact, not entity impact, so
// a Sentry bullet connecting with something was silent beyond the
// target's own hurt sound. `entity.player.attack.crit` (vanilla's own
// melee-crit "ting") reused here as a generic sharp impact cue - a real,
// extremely common vanilla sound id, not re-verified via decompile this
// pass (unlike the mod-specific claims elsewhere in this file), but
// non-fatal if ever wrong - `/playsound` on a bad id just silently no-ops.
//
// **Muzzle flash strengthened, 2026-09-16 direct follow-up: "the animation
// on the sentry when it fires is not showing well."** The 2026-09-15 pass
// above only widened the on-HIT effect (see that comment) - this muzzle
// burst itself was untouched and stayed at its original, easy-to-miss
// counts/spread (10 crit/0.15, 6 smoke/0.1, no dedicated sound at all). A
// Sentry's bullet is a small, fast-moving vanilla arrow fired from a
// stationary turret with no muzzle geometry of its own to draw the eye, so
// a subtle particle blip at its spawn point is genuinely easy to lose
// against a wave fight's own particle/mob noise. Counts/spread roughly
// doubled, plus a real fire-and-forget cue that didn't exist before:
// `item.crossbow.shoot` (a real vanilla mechanical "thwip" id, fitting for
// a bolt-firing turret) at every shot - sound reliably cuts through visual
// clutter in a way a particle alone can't.
//
// **Muzzle toned down, bullet made visible, 2026-09-29** (direct ask: "the
// animation be less of a flare on the machine but you can see the
// projectile better"). The `flash` pop is gone and the muzzle burst is a
// small spark + smoke puff again. Instead, each Sentry bullet now draws an
// end_rod tracer along its path. This is the per-tick trail the header
// above ruled out, but done cheaply: bullets are collected at spawn, so the
// tick handler only walks that short list (a few live bullets per Sentry,
// each ~10 ticks old at most), never the level's entity list. A bullet is
// dropped from the list when it's removed, stops moving (stuck in a block)
// or ages out.
var SENTRY_TRACER_MAX_TICKS = 40
var SENTRY_TRACER_POINTS_PER_TICK = 3 // points per tick of flight, so the streak reads as a line
var sentryTracers = []

EntityEvents.spawned((event) => {
  var entity = event.entity
  if (`${entity.type}` !== 'securitycraft:bullet') return
  var level = event.level
  if (level.isClientSide()) return // method call - see wave_mob_spike_slow.js's header
  var x = entity.getX()
  var y = entity.getY()
  var z = entity.getZ()
  level.getServer().runCommandSilent(`particle minecraft:crit ${x} ${y} ${z} 0.1 0.1 0.1 0.02 6`)
  level.getServer().runCommandSilent(`particle minecraft:smoke ${x} ${y} ${z} 0.1 0.1 0.1 0.01 4`)
  level.getServer().runCommandSilent(`playsound minecraft:item.crossbow.shoot neutral @a ${x} ${y} ${z} 0.5 1.6`)
  sentryTracers.push({ entity: entity, x: x, y: y, z: z, age: 0 })
})

ServerEvents.tick((event) => {
  if (sentryTracers.length === 0) return
  var server = event.server
  var live = []
  for (var i = 0; i < sentryTracers.length; i++) {
    var t = sentryTracers[i]
    var e = t.entity
    t.age++
    if (e.isRemoved() || t.age > SENTRY_TRACER_MAX_TICKS) continue
    var nx = e.getX()
    var ny = e.getY()
    var nz = e.getZ()
    var dx = nx - t.x
    var dy = ny - t.y
    var dz = nz - t.z
    if (dx * dx + dy * dy + dz * dz < 0.0001) continue // stuck in a block
    for (var s = 1; s <= SENTRY_TRACER_POINTS_PER_TICK; s++) {
      var f = s / SENTRY_TRACER_POINTS_PER_TICK
      server.runCommandSilent(`particle minecraft:end_rod ${t.x + dx * f} ${t.y + dy * f} ${t.z + dz * f} 0 0 0 0 1`)
    }
    t.x = nx
    t.y = ny
    t.z = nz
    live.push(t)
  }
  sentryTracers = live
})

// Impact FX restricted to real Sentry shots, 2026-09-28. The old
// 'arrow'-only check also caught player bow hits and every Simple Guns
// bullet (all vanilla AbstractArrows, see gun_damage_bump.js). Decompiled
// `Sentry.performRangedAttack`: it fires a `securitycraft:bullet` owned
// by the Sentry, or (with an ammo container below) a dispensed
// projectile it calls setOwner(this) on. So: the damage's owner is a
// Sentry, or its direct entity is a Sentry bullet. getActual()/
// getImmediate() are KubeJS's names for getEntity()/getDirectEntity()
// (DamageSourceMixin in the installed kubejs jar).
EntityEvents.hurt((event) => {
  var source = event.getSource()
  var direct = source.getImmediate()
  if (direct == null) return
  var owner = source.getActual()
  var fromSentry = (owner != null && `${owner.type}` === 'securitycraft:sentry') || `${direct.type}` === 'securitycraft:bullet'
  if (!fromSentry) return
  var entity = event.getEntity()
  var level = entity.level
  if (level.isClientSide()) return // method call - see wave_mob_spike_slow.js's header
  var x = entity.getX()
  var y = entity.getY() + entity.getBbHeight() / 2
  var z = entity.getZ()
  level.getServer().runCommandSilent(`particle minecraft:crit ${x} ${y} ${z} 0.3 0.3 0.3 0.08 18`)
  level.getServer().runCommandSilent(`particle minecraft:smoke ${x} ${y} ${z} 0.2 0.2 0.2 0.03 8`)
  level.getServer().runCommandSilent(`playsound minecraft:entity.player.attack.crit hostile @a ${x} ${y} ${z} 0.6 1.3`)
})
