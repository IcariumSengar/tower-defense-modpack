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
// not guessed: `EntityEvents.hurt` is backed by Forge's `LivingHurtEvent`
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
EntityEvents.hurt((event) => {
  var source = event.getSource()
  if (source.getType() !== 'ieTesla') return
  var entity = event.getEntity()
  var level = entity.level
  if (level.isClientSide) return
  level.getServer().runCommandSilent(
    `particle minecraft:electric_spark ${entity.getX()} ${entity.getY() + entity.getBbHeight() / 2} ${entity.getZ()} 0.3 0.3 0.3 0.02 40`
  )
  level.getServer().runCommandSilent(
    `playsound minecraft:entity.lightning_bolt.thunder hostile @a ${entity.getX()} ${entity.getY()} ${entity.getZ()} 0.5 1.4`
  )
})
