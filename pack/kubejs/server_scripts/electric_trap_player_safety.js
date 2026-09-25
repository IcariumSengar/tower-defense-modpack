// Tesla Coil / Electrified Iron Fence player immunity - direct, urgent
// report 2026-09-15 after the starter trap showcase shipped: "the tesla
// coil and fence hurting the players is a major issue... priority."
//
// **2026-09-22: second line of defense only, no longer the primary fix.**
// The Tesla Coil half is now solved in the mod's own bytecode - the
// installed jar is `ImmersiveEngineering-1.20.1-10.2.0-183-tdcoilfilter.jar`
// (docs/MODS.md, patched-jar list), whose TeslaCoilBlockEntity never puts
// a player or a SecurityCraft Sentry in its target list in the first place
// (no bolt, no stun, no 512 FE shock spent on them). Everything below
// still runs unchanged and still matters for the fence's contact shock
// and as a safety net should an unpatched IE jar ever end up installed.
//
// **Sentry exemption added same day** - direct follow-up report: "ive
// noticed the tesla coil is attacking the sentry." Real cause, same root
// problem as the player case right above: `TeslaCoilBlockEntity.
// tickServer()` zaps a single random LivingEntity within 6 blocks with
// no owner/allegiance check of any kind, and `securitycraft:sentry` is a
// real LivingEntity (decompiled `Sentry.class`, `extends Mob`), not a
// block - it's exactly as eligible a target as any zombie. The starter
// coil sits on the front/gate wall and the starter Sentry stands guard a
// few blocks down that same wall (`placeStarterTraps()` in
// playtest_starter_kit.js), well within the coil's own 6-block random-
// pick range alongside whatever wave mob it's meant to be zapping. Not
// scoped to the starter showcase's own Sentry, same
// reasoning as the player exemption above not being scoped to the
// starter coil: IE's coil never gained an owner check either way, so any
// player-built coil near any player-placed Sentry would hit the exact
// same problem.
//
// Real root cause, decompiled directly (see placeStarterTraps()'s own
// header comment in playtest_starter_kit.js for the original writeup):
// neither trap has a reliable owner exemption.
// `TeslaCoilBlockEntity.tickServer()` (Immersive Engineering) zaps a
// single random LivingEntity within 6 blocks unconditionally - player
// included, no ownership concept exists on this block at all, full stop.
// `ElectrifiedIronFenceBlock.hurtOrConvertEntity()` (SecurityCraft) DOES
// check ownership, but the fence's owner is only ever assigned once, on
// the first player's login (playtest_starter_kit.js's own try/catch,
// non-fatal by design) - a later player, a save where that assignment
// silently failed, or simply standing near it before that login handler
// has run all leave the fence live and unclaimed in the meantime.
//
// Real, unconditional fix instead of chasing every one of those paths:
// cancel the damage at the KubeJS level for players specifically -
// matching this pack's own established principle that a placed trap,
// starter showcase or player-built, should never hurt the player
// defending against it (mine_player_safety.js's exact same reasoning,
// there for Claymore/Bouncing Betty's explosions - this is the same rule
// for contact-damage traps). Deliberately NOT scoped to just the starter
// showcase's own coil/fence - the same "no owner check" problem exists
// on ANY Tesla Coil a player builds themselves in real Tier 3
// progression, since IE's own block never gained one either way.
//
// Real message ids, confirmed directly from each installed jar's own
// datapack JSON, not guessed:
// - `data/immersiveengineering/damage_type/tesla.json`: message_id
//   "ieTesla" - the coil's ongoing passive zap (every 32 ticks, picks
//   one nearby LivingEntity, 6 real damage).
// - Also cancels "ieTeslaPrimary" - the coil's own sneak+screwdriver
//   self-test shock (`TeslaCoilBlockEntity.screwdriverUseSide()`,
//   `Float.MAX_VALUE` damage - a real, literal one-shot kill if the coil
//   has power and a player sneak-right-clicks it). A new player
//   inspecting their own starter base has no way to know that's a real
//   hazard - exactly the kind of accident this fix exists to prevent.
// - `data/securitycraft/damage_type/electricity.json`: message_id
//   "securitycraft.electricity" - Electrified Iron Fence/Gate's contact
//   shock. Belt and suspenders on top of the real ownership fix already
//   in place, not a replacement for it - ownership still governs
//   whatever else SecurityCraft keys off it.
//
// `EntityEvents.hurt` + `event.getSource().getType()` is real, proven API
// already shipped in this pack (tesla_coil_cinematics.js uses the exact
// same call for its own hit VFX, decompiled and confirmed there).
// `event.cancel()` genuinely prevents the underlying Forge
// `LivingHurtEvent` rather than just reacting after the fact - confirmed
// by decompiling KubeJS's own `EntityEvents` binding class directly:
// `EntityEvents.HURT` is registered `.hasResult()`, the same mechanism
// this pack's own `no_passive_mobs.js` already relies on for a different
// cancelable event (`CheckLivingEntitySpawnEventJS`), and `cancel()`
// itself (the shared `EventJS` base) throws a real
// `EventResult.Type.INTERRUPT_FALSE`, not a no-op.
//
// **Real gap found live, 2026-09-15: "the tesla coil is attacked me and
// stunning me. im not taking damage though. this is not right, it
// whould simply not attack."** Decompiled `TeslaCoilBlockEntity.
// tickServer()` again, this time the FULL zap sequence, not just the
// damage line: it applies a real `MobEffectInstance(IEPotions.STUNNED,
// 128)` to the target FIRST, several instructions before it ever calls
// `ElectricDamageSource.apply()` (the real vanilla `hurt()` call our
// `event.cancel()` above intercepts) - the stun isn't gated on the
// damage succeeding at all, so cancelling `LivingHurtEvent` was always
// going to stop the HP loss but never the stun. `sendRenderPacket()`
// (the client-side lightning-bolt render/zap sound trigger) is ALSO
// unconditional, called regardless of whether the damage call actually
// lands - so the visible "zap" itself can't be suppressed from script
// either way; no Forge event fires anywhere in the target-selection or
// stun-application path (confirmed from the same decompile - it's a raw
// `RANDOM.nextInt()` pick over an AABB-filtered entity list, no
// cancelable hook exists). Genuinely "simply not attack" would need
// patching the mod's own target-selection bytecode, not a script - out
// of proportion for a cosmetic flash. Real, in-proportion fix instead:
// strip the Stunned effect the instant it's applied, same tick, so the
// visible zap keeps happening but nothing about it actually affects the
// player/Sentry anymore (no damage, no stun, no slowdown) - as close to
// "doesn't attack" as reachable without a bytecode patch.
//
// `blusunrize.immersiveengineering.common.register.IEPotions.STUNNED` is
// a `RegistryObject<MobEffect>` (real field, confirmed from the same
// decompile pass) - resolved via this pack's own established
// `resolveClass`/direct-public-method-call reflection pattern (top-level
// FUNCTIONS share across server_scripts files; `resolveClass` is
// playtest_starter_kit.js's own, `Class.getField`/`Field.get`/
// `RegistryObject.get` are all plain unambiguous public methods, same
// "call it directly on the bound Java object" idiom already proven live
// in starter_flux_network.js). Resolved once and cached - the class/field
// never change at runtime.
var ELECTRIC_TRAP_DAMAGE_TYPES = ['ieTesla', 'ieTeslaPrimary', 'securitycraft.electricity']
var ELECTRIC_TRAP_IMMUNE_TYPES = ['minecraft:player', 'securitycraft:sentry']
var TESLA_STUN_DAMAGE_TYPES = ['ieTesla', 'ieTeslaPrimary']

var teslaStunnedEffect = null
function getTeslaStunnedEffect(anyObj) {
  if (teslaStunnedEffect) return teslaStunnedEffect
  var ieCls = resolveClass(anyObj, 'blusunrize.immersiveengineering.common.register.IEPotions')
  var registryObject = ieCls.getField('STUNNED').get(null)
  teslaStunnedEffect = registryObject.get()
  return teslaStunnedEffect
}

EntityEvents.hurt((event) => {
  var entity = event.getEntity()
  if (!ELECTRIC_TRAP_IMMUNE_TYPES.includes(`${entity.type}`)) return
  var sourceType = `${event.getSource().getType()}`
  if (!ELECTRIC_TRAP_DAMAGE_TYPES.includes(sourceType)) return
  event.cancel()
  if (!TESLA_STUN_DAMAGE_TYPES.includes(sourceType)) return
  try {
    entity.removeEffect(getTeslaStunnedEffect(entity))
  } catch (e) {
    console.error(`electric_trap_player_safety.js: failed to strip Tesla Coil's Stunned effect (${e})`)
  }
})
