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
// not assumed. This pack has no bow-wielding mobs and no dispenser-arrow
// traps (skeletons stripped in the zombie-apocalypse pivot), so in
// practice `getSource().getType() === 'arrow'` only ever fires for a
// Sentry's own bullets, same scope caveat the old pellet hook documented
// for itself.
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
EntityEvents.spawned((event) => {
  var entity = event.entity
  if (`${entity.type}` !== 'securitycraft:bullet') return
  var level = event.level
  if (level.isClientSide()) return // method call - see wave_mob_spike_slow.js's header
  var x = entity.getX()
  var y = entity.getY()
  var z = entity.getZ()
  level.getServer().runCommandSilent(`particle minecraft:crit ${x} ${y} ${z} 0.25 0.25 0.25 0.05 22`)
  level.getServer().runCommandSilent(`particle minecraft:smoke ${x} ${y} ${z} 0.2 0.2 0.2 0.03 12`)
  level.getServer().runCommandSilent(`particle minecraft:flash ${x} ${y} ${z} 0 0 0 0 1`)
  level.getServer().runCommandSilent(`playsound minecraft:item.crossbow.shoot neutral @a ${x} ${y} ${z} 0.5 1.6`)
})

EntityEvents.hurt((event) => {
  var source = event.getSource()
  if (source.getType() !== 'arrow') return
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
