// Slows wave mobs caught in Simply Traps spikes and stakes.
//
// All three blocks have no collision and hurt an entity on every even-dayTime
// tick while its hitbox overlaps them (Block#entityInside), so the hurt event
// catches every mob on them, even one that crosses a single block between two
// polls. Their damage type is vanilla generic, which other sources share, so
// the cells under the hitbox are checked for a trap block; a hit of any other
// type is never a trap and skips the check. The slow wears off one to three
// seconds after a mob leaves the trap. Only td_wave_mob, never structure
// guards.
//
// EntityEvents.hurt is Forge's LivingAttackEvent, so it also fires for hits
// the invulnerability window ignores: every tick during a wave, whose night
// lock holds dayTime on an even value. A slow is only re-applied once it drops
// below its trap's refreshBelow (durations are in ticks), and the block scan is
// skipped until then, so a trapped mob is scanned about twice a second.
var TRAP_SLOWS = {
  'simply_traps:spike_trap': { amplifier: 2, duration: 60, refreshBelow: 50 }, // Slowness III
  'simply_traps:stake': { amplifier: 0, duration: 30, refreshBelow: 20 }, // Slowness I
  'simply_traps:stake_wall': { amplifier: 0, duration: 30, refreshBelow: 20 },
}

// Ticks of slow left at which the scan is skipped: the refreshBelow of the trap
// that gives this amplifier, or the highest refreshBelow for a slowness no trap
// gives. A mob stepping from stakes onto spikes gets Slowness III once its
// stake slow drops below 20 ticks, at most 10 ticks late. A stake can't
// downgrade a spike slow: it only refreshes below 20 ticks, when the spike slow
// is nearly gone.
function trapSlowSkipAtTicks(amplifier) {
  var highest = 0
  var ids = Object.keys(TRAP_SLOWS)
  for (var i = 0; i < ids.length; i++) {
    var s = TRAP_SLOWS[ids[i]]
    if (s.amplifier === amplifier) return s.refreshBelow
    if (s.refreshBelow > highest) highest = s.refreshBelow
  }
  return highest
}

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
  if (`${event.getSource().getType()}` !== 'generic') return
  var e = event.getEntity()
  var tags = e.getTags()
  if (!tags.contains('td_wave_mob') || tags.contains('td_structure_guard')) return
  var current = e.potionEffects.getActive('minecraft:slowness')
  var duration = current ? current.getDuration() : 0
  if (current && duration >= trapSlowSkipAtTicks(current.getAmplifier())) return
  var slow = strongestTrapSlowUnder(e.getLevel(), e)
  if (!slow || duration >= slow.refreshBelow) return
  e.potionEffects.add('minecraft:slowness', slow.duration, slow.amplifier, false, true)
})
