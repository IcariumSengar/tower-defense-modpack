// Slows wave mobs caught in Simply Traps spikes and stakes.
//
// All three blocks have no collision and hurt an entity every other tick while
// its hitbox overlaps them (Block#entityInside), so the hurt event catches
// every mob on them, even one that crosses a single block between two polls.
// Their damage type is vanilla, so the cells under the hitbox are checked for
// a trap block instead. The slow wears off one to three seconds after a mob
// leaves the trap. Only td_wave_mob, never structure guards.
//
// EntityEvents.hurt is Forge's LivingAttackEvent, so it also fires for hits
// the invulnerability window ignores, about 10 times a second per trapped mob.
// A fresh spike slow skips the block scan, and a slow is only re-applied once
// it drops below its trap's refreshBelow (durations are in ticks).
var TRAP_SLOWS = {
  'simply_traps:spike_trap': { amplifier: 2, duration: 60, refreshBelow: 50 }, // Slowness III
  'simply_traps:stake': { amplifier: 0, duration: 30, refreshBelow: 20 }, // Slowness I
  'simply_traps:stake_wall': { amplifier: 0, duration: 30, refreshBelow: 20 },
}
// Of the trap slows, only a fresh spike one has this many ticks left, so the
// block scan is skipped. Below it the scan runs, which is how a mob stepping
// from stakes onto spikes gets Slowness III. A stake can't downgrade a spike
// slow: it only refreshes below 20 ticks, when the spike slow is nearly gone.
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
