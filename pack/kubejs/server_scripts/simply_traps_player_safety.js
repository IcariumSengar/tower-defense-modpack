// Stops Simply Traps' Spike Trap, Wooden Stake and Stake Wall from hurting
// players, as the Tesla Coil, the electrified fence, mines and friendly blasts
// already don't (electric_trap_player_safety.js, mine_player_safety.js,
// explosion_player_safety.js). Mobs are still hurt.
//
// The three blocks have no collision and hurt any entity whose hitbox overlaps
// them, with vanilla generic damage and no attacker. Other sources share that
// type, so a generic hit is cancelled only when a trap block is in one of the
// cells the player's hitbox covers. Hits of any other type skip the scan.
var SIMPLY_TRAPS_DAMAGE_BLOCKS = ['simply_traps:spike_trap', 'simply_traps:stake', 'simply_traps:stake_wall']

function simplyTrapUnder(level, e) {
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
        if (SIMPLY_TRAPS_DAMAGE_BLOCKS.includes(`${level.getBlock(x, y, z).getId()}`)) return true
      }
    }
  }
  return false
}

EntityEvents.hurt((event) => {
  if (`${event.getSource().getType()}` !== 'generic') return
  var entity = event.getEntity()
  if (`${entity.type}` !== 'minecraft:player') return
  if (simplyTrapUnder(entity.getLevel(), entity)) event.cancel()
})
