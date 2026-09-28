// Tier 3 spec item, 2026-09-08: "Tesla Coil hit cinematics - electric-
// spark particles + thunder/conduit sound ... on Tesla damage."
//
// **Real judgment call on WHICH Tesla Coil, documented here since it
// corrects a wrong claim in the roadmap dispatch** - the dispatch said
// to use "Create's own Tesla Coil block," explicitly ruling out Create:
// Crafts & Additions' version. Decompiled the actual installed
// `create-1.20.1-6.0.8.jar` directly to check: base Create has ZERO
// Tesla Coil content anywhere in the jar (confirmed by a full jar-entry
// scan for "tesla" - no matches at all; the only "coil" hits are
// unrelated rope/hose/elevator pulley coils). The block the dispatch
// described does not exist. Two REAL Tesla Coils exist in this pack's
// actual mod set instead:
// - `createaddition:tesla_coil` (Create: Crafts & Additions, already
//   installed for barbed wire) - decompiled `TeslaCoilBlockEntity`
//   directly: a fixed-radius (3 blocks) periodic AoE tick every 20
//   ticks while redstone-powered + charged, real FE-backed (40000 FE
//   capacity/10000 FE-t max input), 3 dmg to mobs (2 to players) + a
//   "Shocking" effect, with a full-chain-armor immunity quirk. Real,
//   but a side feature of a small Create-compat mod.
// - `immersiveengineering:tesla_coil` (Immersive Engineering, being
//   installed this phase anyway as the power chain's generator mod) -
//   decompiled `TeslaCoilBlockEntity` directly: picks ONE random
//   LivingEntity within a 6-block radius every 32 ticks, deals 6.0
//   real damage (`IEServerConfig.MACHINES.teslacoil_damage`, default)
//   via a dedicated `ieTesla` damage type, applies IE's own 128-tick
//   Stunned effect to that target, and gives every OTHER nearby entity
//   a lesser residual "field" effect - genuinely closer to a literal
//   "chain lightning arcs to one target" mechanic than CC&A's flat-
//   radius tick. Real 48000 FE capacity, 256 FE/t idle + 512 FE per
//   shock, redstone-gated same as CC&A's version. Real stock crafting
//   recipe needs an HV Capacitor + MV Coil + Advanced Electronic
//   Component + iron/aluminum parts - IE's own mid-tier component
//   chain, a genuine, mod-native tier gate on its own (see
//   docs/FEATURES.md's "Storage & power system" entry for the full
//   recipe and the decision not to add a second, redundant re-recipe
//   layer on top).
//
// **Decision: Immersive Engineering's Tesla Coil is Tier 3's real
// "chain-lightning" machine.** Picked over CC&A's version because (a)
// it's genuinely free - zero additional mod footprint beyond IE, which
// this phase installs regardless for power generation, matching the
// roadmap's own original framing ("resolves the Tesla Coil candidate
// for free") that only makes literal sense for IE, not a wholly
// separate compat mod; (b) the single-random-target-plus-residual-
// field mechanic reads far more like real "chain lightning" than
// CC&A's flat AoE tick; (c) it matches this project's own actual
// history (FEATURES.md's 2026-09-01 Storage & power system spec and
// IDEAS.md's Tier 3 sketch both named IE's Tesla Coil specifically,
// long before the erroneous "Create's own" framing appeared). CC&A's
// Tesla Coil stays installed (it was already in the pack for barbed
// wire) and stays real/available, just not built into quests/tier
// infrastructure - not worth shipping two overlapping "electric zap
// tower" identities in one tier.
//
// This script adds an entity-position hit reaction on top of what the
// mod already ships (the mod's own LOUD_ZAP/tesla.ogg sound plays AT
// THE COIL, and its own LightningAnimation renders the bolt itself
// client-side) - a real vanilla thunder boom + vanilla electric_spark
// particle burst centered ON THE HIT ENTITY, so the zap reads at the
// point of impact too, not just at the block. Real KubeJS API used,
// not guessed: `EntityEvents.hurt` is backed by Forge's `LivingAttackEvent`
// (corrected 2026-09-27 from a live stack trace - see wave_mob_spike_slow.js;
// this line originally said LivingHurtEvent)
// (confirmed by decompiling KubeJS's own `EntityEvents`/
// `LivingEntityHurtEventJS` classes directly), and `event.getSource().
// getType()` (KubeJS's clean-name remap of `DamageSource.getMsgId()`,
// also decompiled directly) returns the exact `message_id` string
// authored in the mod's own damage type JSON - confirmed
// `data/immersiveengineering/damage_type/tesla.json` sets
// `"message_id": "ieTesla"` for this specific ongoing-zap damage
// (distinct from `ieTeslaPrimary`, the coil's own sneak+screwdriver
// player self-test damage - deliberately not matched here, this is a
// combat-cinematics hook, not a player-safety one).
// **Made "cooler", 2026-09-15 direct ask** (alongside the Sentry's own
// feedback getting the same treatment, see sentry_combat_feedback.js).
// Three layers instead of one: the `electric_spark` burst now spreads
// vertically the full height of the target (reading as a bolt striking
// down through them, not just a puff at chest height), a tighter `crit`
// pop adds a sharper "impact" snap at the moment of the hit, and one
// `flash` (the same bright camera-flash particle a Totem of Undying
// pop uses - a real vanilla particle, not custom) sells a single bright
// strike instant. Sound layered the same way: the existing rolling
// `thunder` boom plus a new sharp `lightning_bolt.impact` crack under
// it, the actual "CRACK" half of a real lightning strike vanilla itself
// splits across these same two sound events. `flash` and
// `entity.lightning_bolt.impact` are standard vanilla ids (Totem pop /
// the LightningBolt entity's own two-part sound respectively) - not
// re-verified via decompile this pass the way the rest of this file's
// IE-specific claims were, but a wrong particle/sound id just silently
// no-ops rather than erroring, so the risk is purely cosmetic.
//
// **Real jagged bolt shape added, 2026-09-16 direct follow-up: "the tesla
// coil animation can be cool too. I want a cool electricity bolt."** The
// straight vertical `electric_spark` column below reads more like a
// standing spark burst than an actual bolt. Real constraint this has to
// work around: `event.getSource()` for IE's `ieTesla` damage type carries
// no reference back to the coil block/position at all (confirmed from the
// same `ElectricDamageSource`/`TeslaCoilBlockEntity` decompile this file's
// own header already did - it's a plain entity-only damage source, no
// `getSourcePosition()` override), and this hook is deliberately generic
// over EVERY Tesla Coil in the world, not just the one starter coil this
// pack happens to track a persisted position for (tesla_coil_auto_power.js
// only manages that one specific coil's power, for exactly this reason -
// see its own header) - so there's no real coil-to-target line available
// to draw here regardless. A strike falling from directly overhead
// instead - vanilla's own lightning always comes from the sky, so this
// reads as a real "lightning bolt" on sight without needing the coil's
// own position at all. `drawJaggedBolt` walks from a fixed height above
// the target down to the hit point in a handful of segments, jittering
// each one sideways (`Math.random` - an established pattern already used
// elsewhere in this codebase, e.g. wave_spawner.js's own breach-range
// picker) with the jitter tapering to zero at the target, so the bolt
// actually terminates ON the entity instead of drifting past it - a real
// jagged fork shape, not a straight line. Kept as its own function rather
// than inlined purely because the segment/jitter math reads clearer named
// than crammed into the hurt handler below.
function drawJaggedBolt(server, x, y, z) {
  var SEGMENTS = 6
  var BOLT_HEIGHT = 10 // blocks above the hit point the bolt "originates" from
  var MAX_JITTER = 1.4 // widest sideways wobble, at the top of the bolt
  for (var i = SEGMENTS; i >= 0; i--) {
    var t = i / SEGMENTS // 1 at the top, 0 at the target
    var jitter = MAX_JITTER * t
    var px = x + (Math.random() - 0.5) * jitter
    var py = y + BOLT_HEIGHT * t
    var pz = z + (Math.random() - 0.5) * jitter
    server.runCommandSilent(`particle minecraft:electric_spark ${px} ${py} ${pz} 0.08 0.08 0.08 0.01 6`)
  }
}
EntityEvents.hurt((event) => {
  var source = event.getSource()
  if (source.getType() !== 'ieTesla') return
  var entity = event.getEntity()
  var level = entity.level
  if (level.isClientSide()) return // method call - see wave_mob_spike_slow.js's header
  var x = entity.getX()
  var y = entity.getY() + entity.getBbHeight() / 2
  var z = entity.getZ()
  drawJaggedBolt(level.getServer(), x, y, z)
  level.getServer().runCommandSilent(`particle minecraft:crit ${x} ${y} ${z} 0.25 0.25 0.25 0.1 15`)
  level.getServer().runCommandSilent(`particle minecraft:flash ${x} ${y} ${z} 0 0 0 0 1`)
  level.getServer().runCommandSilent(
    `playsound minecraft:entity.lightning_bolt.thunder hostile @a ${x} ${entity.getY()} ${z} 0.5 1.4`
  )
  level.getServer().runCommandSilent(
    `playsound minecraft:entity.lightning_bolt.impact hostile @a ${x} ${entity.getY()} ${z} 0.6 1.1`
  )
})
