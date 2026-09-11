// Sentry default targeting mode (2026-09-11, direct playtest ask: "can the
// sentry default to aggressive: mobs only by default when i put it down").
//
// SecurityCraft's own Sentry.class hardcodes the mode at placement time -
// decompiled `SentryItem.useOn()` calls `setUpSentry(player)`, which
// explicitly writes `SentryMode.CAMOUFLAGE_HP` (camouflaged, targets
// players AND mobs) into the entity's synced MODE data right before
// spawning it. No config option exists for this (checked
// securitycraft-common.toml directly, no matching key) - it's baked into
// the mod's own Java, not datapack-controlled.
//
// Real public API found by decompiling Sentry.class:
// `toggleMode(Player, int, boolean)` sets the mode to an explicit ordinal
// (not just "cycle to next") - callable directly on the entity like any
// other public method, no reflection needed. SentryMode's declared enum
// order (CAMOUFLAGE_HP, CAMOUFLAGE_H, CAMOUFLAGE_P, AGGRESSIVE_HP,
// AGGRESSIVE_H, AGGRESSIVE_P, IDLE) puts AGGRESSIVE_H - aggressive
// stance, mobs-only targeting, exactly what was asked for - at ordinal 4.
// `sendMessage` is passed false: SentryItem's own placement message is a
// separate hardcoded call that always prints the Camouflage-HP text
// regardless of real mode, fires before this event, and can't be
// suppressed from script - a second, correct message right after it would
// just read as a contradiction rather than a fix.
//
// **Real limitation, not missed**: `EntityEvents.spawned` fires for every
// entity add, including a sentry reloading from disk on chunk load, not
// just a fresh placement - confirmed from KubeJS's own doc comment on the
// event ("This event also fires for existing entities when they are
// loaded from a save") and from decompiling the handler chain
// (`KubeJSEntityEventHandler.entitySpawned`, backed by Architectury's
// `EntityEvent.ADD`) - that callback's signature is just `(Entity,
// Level)`, so even Forge's real `loadedFromDisk` flag on the underlying
// `EntityJoinLevelEvent` never reaches KubeJS at all. No clean "was this
// just placed" check exists at this hook. Guarding on `getMode().name()
// === 'CAMOUFLAGE_HP'` is what makes this safe anyway: `setUpSentry`
// always writes exactly that value right before a fresh placement, and a
// sentry's real mode is saved/restored across reloads (`SentryMode` NBT
// tag, read in `Sentry`'s load method) - so once this fix (or the player)
// moves a sentry off the factory default, every future reload keeps that
// choice instead of getting stomped back to aggressive. The one real gap:
// a player who deliberately dials a sentry BACK to Camouflage - Hostiles
// and Players will see it flip to Aggressive - Mobs Only on its next
// reload - accepted, since that's the one mode this fix makes obsolete as
// a deliberate choice anyway.
var SENTRY_DEFAULT_MODE = 4 // Sentry.SentryMode.AGGRESSIVE_H (aggressive stance, mobs only)

EntityEvents.spawned((event) => {
  var entity = event.entity
  if (`${entity.type}` !== 'securitycraft:sentry') return
  if (`${entity.getMode().name()}` !== 'CAMOUFLAGE_HP') return
  entity.toggleMode(null, SENTRY_DEFAULT_MODE, false)
})
