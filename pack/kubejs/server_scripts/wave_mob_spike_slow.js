// Spike Trap and Wooden Stake slows (2026-09-27, direct ask: "did you do
// the cobweb/slow affect on the spikes?" -> "do it"; stakes added
// 2026-09-29, see the constants below). Tier 1 lost its only slowing trap
// when Barbed Wire went out with Create (2026-09-11). The old Trapcraft
// Spikes' cobweb pairing had already been dropped by then, on the grounds
// that slowing was Barbed Wire's job. So the Spike Trap now slows as well
// as hurts.
//
// Hooked on the spike's own damage rather than a poll. Decompiled from the
// installed simply_traps-1.7-forge-1.20.1.jar: SpikeTrapBlock has an empty
// collision shape and does all its work in Block#entityInside, which runs
// SpikeTrapEntityWalksOnTheBlockProcedure every tick a mob's hitbox
// overlaps the block's cell. That hurts the mob every 2nd tick (2.0 x
// simplytraps.toml's SpikeDamageMultiplier). A once-a-second poll
// (trap_durability.js's cadence) could miss a fast mob crossing a single
// spike between checks; the hurt event can't.
//
// EntityEvents.hurt is Forge's LivingAttackEvent (via Architectury), NOT
// LivingHurtEvent. The live stack trace in a sandbox shows
// KubeJSEntityEventHandler.livingHurt called from EventHandlerImplCommon's
// LivingAttackEvent handler. So it fires on every hurt() call, including
// ones the 10-tick invulnerability window then swallows: about 10 times a
// second per mob standing in spikes. Hence the refresh check before the
// block scan: the slow is only re-applied once it drops below
// its trap's refreshBelow (TRAP_SLOWS), so each mob gets a block scan and an
// effect update about twice a second, not ten times.
//
// The damage type isn't matched, because the procedure uses a vanilla
// DamageTypes entry rather than a mod-specific one. Instead, the cells the
// hitbox covers are checked for a spike. That's the same shape as
// wave_mob_fence_shock.js's check, but with no extra reach, since
// entityInside needs real overlap. Any hurt while standing in spikes
// re-applies the slow, because the mob is on the spikes either way. Only
// td_wave_mob mobs are affected (never matched by entity type;
// td_structure_guard excluded), the same base-defense rule every other
// trap script follows.
//
// **No `level.isClientSide` guard, on purpose - and why it was wrong
// everywhere else too (found here, 2026-09-27)**: Minecraft's Level has
// BOTH a field and a method named `isClientSide`, so Rhino hands back a
// combined field-and-method wrapper object, not the boolean. That object
// is always truthy in an `if`, so `if (level.isClientSide) return`
// returned on the SERVER every time. Converting it to a string throws an
// NPE - the "merely accessing it throws" note in wave_spawner.js's header
// was this same wrapper. Proven live in a sandbox: all five
// `if (level.isClientSide) return` sites (mine_player_safety.js,
// omtreborn_grenade_safety.js, sentry_combat_feedback.js x2,
// tesla_coil_cinematics.js) logged "reached guard, truthy" on the server
// and never ran a line past it. They now call the method,
// `level.isClientSide()`, which returns the real boolean (false on the
// server). This file needs no guard at all: server_scripts only receive
// server-side events.
//
// Refreshed while the mob stays in the trap, so the slow wears off a
// second or two after it walks out. The vanilla effect swirl is the
// visible cue.
//
// Stronger on spikes, and stakes slow too, 2026-09-29 (direct ask: "can you
// increase the slow effect on the iron spikes and also add a little to the
// wooden stake blocks"). Spikes went Slowness II/40 ticks -> III/60 ticks
// (-45% speed). Wooden Stakes and Stake Walls now give Slowness I for 30
// ticks (-15%). Both stake blocks use the same entityInside pattern as the
// spike (StakeEntityCollidesInTheBlockProcedure /
// StakeWallEntityCollidesInTheBlockProcedure: no collision, hurt every 2nd
// tick while overlapping), so the same hurt hook covers all three.
var TRAP_SLOWS = {
  'simply_traps:spike_trap': { amplifier: 2, duration: 60, refreshBelow: 50 }, // Slowness III
  'simply_traps:stake': { amplifier: 0, duration: 30, refreshBelow: 20 }, // Slowness I
  'simply_traps:stake_wall': { amplifier: 0, duration: 30, refreshBelow: 20 },
}
// Any slowness this fresh can only have come from spikes (the strongest and
// longest), so the block scan is skipped. Below it the scan runs, which is
// how a mob stepping from stakes onto spikes gets upgraded to Slowness III.
// A weaker trap never downgrades a stronger slow: a stake's refresh line
// (20) is under anything a spike leaves behind until it has nearly worn off.
var TRAP_SLOW_SKIP_ABOVE_TICKS = 50

// The strongest trap slow among the cells the hitbox covers, or null.
function strongestTrapSlowUnder(level, e) {
  var half = e.getBbWidth() / 2
  var x0 = Math.floor(e.getX() - half)
  var x1 = Math.floor(e.getX() + half)
  var z0 = Math.floor(e.getZ() - half)
  var z1 = Math.floor(e.getZ() + half)
  var y0 = Math.floor(e.getY())
  var y1 = Math.floor(e.getY() + e.getBbHeight())
  var best = null
  for (var x = x0; x <= x1; x++) {
    for (var z = z0; z <= z1; z++) {
      for (var y = y0; y <= y1; y++) {
        var slow = TRAP_SLOWS[`${level.getBlock(x, y, z).getId()}`]
        if (slow && (!best || slow.amplifier > best.amplifier)) best = slow
      }
    }
  }
  return best
}

EntityEvents.hurt((event) => {
  var e = event.getEntity()
  var tags = e.getTags()
  if (!tags.contains('td_wave_mob') || tags.contains('td_structure_guard')) return
  var duration = e.potionEffects.getDuration('minecraft:slowness')
  if (duration >= TRAP_SLOW_SKIP_ABOVE_TICKS) return
  var slow = strongestTrapSlowUnder(e.getLevel(), e)
  if (!slow || duration >= slow.refreshBelow) return
  e.potionEffects.add('minecraft:slowness', slow.duration, slow.amplifier, false, true)
})
