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
EntityEvents.spawned((event) => {
  var entity = event.entity
  if (`${entity.type}` !== 'securitycraft:bullet') return
  var level = event.level
  if (level.isClientSide) return
  level.getServer().runCommandSilent(
    `particle minecraft:crit ${entity.getX()} ${entity.getY()} ${entity.getZ()} 0.15 0.15 0.15 0.01 6`
  )
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
