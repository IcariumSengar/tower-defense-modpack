// Spike Trap slow (2026-09-27, direct ask: "did you do the cobweb/slow
// affect on the spikes?" -> "do it"). Tier 1 lost its only slowing trap
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
// SPIKE_SLOW_REFRESH_BELOW_TICKS, so each mob gets a block scan and an
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
// Slowness II for 40 ticks, refreshed while the mob stays in the spikes,
// so it wears off 1.5-2s after the mob walks out. The vanilla effect swirl
// is the visible cue.
var SPIKE_SLOW_BLOCK = 'simply_traps:spike_trap'
var SPIKE_SLOW_DURATION_TICKS = 40
var SPIKE_SLOW_REFRESH_BELOW_TICKS = 30
var SPIKE_SLOW_AMPLIFIER = 1 // 0 = Slowness I, 1 = Slowness II (-30% speed)

function isInSpikeTrap(level, e) {
  var half = e.getBbWidth() / 2
  var x0 = Math.floor(e.getX() - half)
  var x1 = Math.floor(e.getX() + half)
  var z0 = Math.floor(e.getZ() - half)
  var z1 = Math.floor(e.getZ() + half)
  var y0 = Math.floor(e.getY())
  var y1 = Math.floor(e.getY() + e.getBbHeight())
  for (var x = x0; x <= x1; x++) {
    for (var z = z0; z <= z1; z++) {
      for (var y = y0; y <= y1; y++) {
        if (`${level.getBlock(x, y, z).getId()}` === SPIKE_SLOW_BLOCK) return true
      }
    }
  }
  return false
}

EntityEvents.hurt((event) => {
  var e = event.getEntity()
  var tags = e.getTags()
  if (!tags.contains('td_wave_mob') || tags.contains('td_structure_guard')) return
  if (e.potionEffects.getDuration('minecraft:slowness') >= SPIKE_SLOW_REFRESH_BELOW_TICKS) return
  if (!isInSpikeTrap(e.getLevel(), e)) return
  e.potionEffects.add('minecraft:slowness', SPIKE_SLOW_DURATION_TICKS, SPIKE_SLOW_AMPLIFIER, false, true)
})
