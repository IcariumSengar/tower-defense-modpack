// Spike Trap damage + degrade logic (startup_scripts/machines.js
// registers the block itself). The genuinely novel piece of the Tier 1
// machines batch - every other stateful thing in this pack lives on
// player.persistentData; a block that needs its OWN state (how many
// times it's been stepped on) is new territory, so this is built to
// avoid the riskiest unknown rather than assume it away.
//
// Deliberately does NOT try to read the "hits" blockstate property's
// current value from KubeJS script code - whether that's even possible,
// and what the exact syntax is, wasn't confirmed (only setting/creating
// blockstate properties at registration time was). Sidesteps the
// question entirely: the whole degrade sequence runs as a chain of
// `/execute if block ... [hits=N] run setblock ... [hits=N+1]`
// commands, standard vanilla conditional-command syntax with zero
// KubeJS-specific uncertainty. Only one of the four commands below can
// ever actually match the block's true current state, so running all
// of them every trigger is harmless, not a bug.
//
// Only checking the block ID itself (level.getBlock(x,y,z).id) is
// needed from KubeJS - basic block-type lookup, not property reading,
// much more standard/foundational KubeJS surface.

var SPIKE_TRAP_ID = 'kubejs:spike_trap'
var SPIKE_TRAP_DAMAGE = 4 // 2 hearts - Tier 1, meant to deter/chip, not one-shot
var MAX_HITS = 3 // block breaks on the 4th trigger (hits 0->1->2->3->broken)

PlayerEvents.tick((event) => {
  const player = event.player
  const level = player.getLevel()

  // Throttled to every 4 ticks, same as wave_status.js's hostile-count
  // scan - a trap doesn't need literal 20fps precision, and this is a
  // single block lookup per player per check, already cheap.
  if (level.getTime() % 4 !== 0) return

  const data = player.persistentData
  const x = Math.floor(player.getX())
  const y = Math.floor(player.getY()) - 1 // the block the player is standing ON, not standing IN
  const z = Math.floor(player.getZ())

  const block = level.getBlock(x, y, z)
  const onSpikeTrap = block && `${block.id}` === SPIKE_TRAP_ID
  const wasOnSpikeTrap = data.getBoolean('td_onSpikeTrap')
  data.putBoolean('td_onSpikeTrap', onSpikeTrap)

  // Only trigger on the false->true transition (freshly stepping onto
  // it), not every tick spent standing still on top of one - otherwise
  // a stationary player would take damage 5 times a second.
  if (!onSpikeTrap || wasOnSpikeTrap) return

  player.setHealth(Math.max(0, player.getHealth() - SPIKE_TRAP_DAMAGE))

  const server = player.getServer()
  const pos = `${x} ${y} ${z}`
  for (var h = 0; h < MAX_HITS; h++) {
    server.runCommandSilent(`execute if block ${pos} ${SPIKE_TRAP_ID}[hits=${h}] run setblock ${pos} ${SPIKE_TRAP_ID}[hits=${h + 1}]`)
  }
  // The (MAX_HITS)th hit breaks the trap entirely rather than advancing
  // to one final blockstate - a broken trap should actually be gone,
  // not just visually maxed-out with no further effect.
  server.runCommandSilent(`execute if block ${pos} ${SPIKE_TRAP_ID}[hits=${MAX_HITS}] run setblock ${pos} minecraft:air`)
})
