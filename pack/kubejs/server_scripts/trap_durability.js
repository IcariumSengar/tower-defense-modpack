// Simply Traps' Wooden Stake, Stake Wall and Spike Trap never break on their
// own, so this gives each one a player places an HP pool. Once a second a trap
// loses HP equal to the summed attack damage of the wave mobs within
// TRAP_RANGE of it, and at 0 HP it breaks for good, leaving no drop. Only
// td_wave_mob counts: structure mobs never wear down base defences. The Stake
// Walls playtest_starter_kit.js sets on the base walls are never tracked, so
// they last.
//
// Placed traps are tracked in worldData() (world_state.js) as td_trapRegistry,
// a ';'-separated list of "x,y,z,code,hp" entries.
//
// HP: a plain zombie (3 attack damage) wears out a stake or Stake Wall in 7
// seconds. The Spike Trap (five iron ingots) lasts three times as long and also
// hits twice as hard (SpikeDamageMultiplier in simplytraps.toml).
var TRAP_TYPES = {
  'simply_traps:stake': { code: 'W', maxHp: 20, breakSound: 'minecraft:block.wood.break' },
  'simply_traps:stake_wall': { code: 'S', maxHp: 20, breakSound: 'minecraft:block.wood.break' },
  'simply_traps:spike_trap': { code: 'I', maxHp: 60, breakSound: 'minecraft:block.metal.break' },
}
var TRAP_CODE_TO_ID = {
  W: 'simply_traps:stake',
  S: 'simply_traps:stake_wall',
  I: 'simply_traps:spike_trap',
}
var TRAP_IDS = Object.keys(TRAP_TYPES)

// Blocks from the trap block's centre to a mob's feet: on the trap or right
// beside it.
var TRAP_RANGE = 1.2
var TRAP_RANGE_SQ = TRAP_RANGE * TRAP_RANGE
var TRAP_CHECK_INTERVAL = 20 // ticks

function parseTrapRegistry(str) {
  if (!str) return []
  return str.split(';').filter((s) => s.length > 0).map((entry) => {
    var parts = entry.split(',')
    return {
      x: parseInt(parts[0], 10),
      y: parseInt(parts[1], 10),
      z: parseInt(parts[2], 10),
      code: parts[3],
      hp: parseInt(parts[4], 10),
    }
  })
}

function serializeTrapRegistry(list) {
  return list.map((t) => `${t.x},${t.y},${t.z},${t.code},${t.hp}`).join(';')
}

function getTrapRegistry(data) {
  // getString() returns a Java String. split() on it yields Java strings whose
  // .length is a method, not a number, so coerce it to a JS string first.
  return parseTrapRegistry(data.contains('td_trapRegistry') ? `${data.getString('td_trapRegistry')}` : '')
}

function setTrapRegistry(data, list) {
  data.putString('td_trapRegistry', serializeTrapRegistry(list))
}

// A failed attribute lookup counts as 0 instead of breaking the whole check.
function trapAttackDamage(mob) {
  try {
    var attr = mob.getAttribute('minecraft:generic.attack_damage')
    if (attr) return attr.getValue()
  } catch (e) {
  }
  return 0
}

BlockEvents.placed(TRAP_IDS, (event) => {
  var block = event.getBlock()
  var info = TRAP_TYPES[`${block.id}`]
  if (!info) return
  var data = worldData(event.getLevel())
  if (!data) return
  var x = block.getX()
  var y = block.getY()
  var z = block.getZ()
  // Drop any entry left at this cell by a trap that went without a player
  // break (an explosion, a piston), or its lower HP would break the new trap.
  var list = getTrapRegistry(data).filter((t) => !(t.x === x && t.y === y && t.z === z))
  list.push({ x: x, y: y, z: z, code: info.code, hp: info.maxHp })
  setTrapRegistry(data, list)
})

// A player broke the trap: stop tracking it. BlockEvents.broken only fires
// for player breaks, so the setblock in the tick handler never triggers it.
BlockEvents.broken(TRAP_IDS, (event) => {
  var data = worldData(event.getLevel())
  if (!data) return
  var block = event.getBlock()
  var x = block.getX()
  var y = block.getY()
  var z = block.getZ()
  var list = getTrapRegistry(data)
  var filtered = list.filter((t) => !(t.x === x && t.y === y && t.z === z))
  if (filtered.length !== list.length) setTrapRegistry(data, filtered)
})

// The Spike Trap only drops for a pickaxe, the vanilla rule for metal blocks,
// so one broken by hand or with a sword was lost with its five iron ingots.
// This drops it for any tool. A creative player gets no drop, as with any
// block.
BlockEvents.broken('simply_traps:spike_trap', (event) => {
  var player = event.player
  if (!player || player.isCreative()) return
  var block = event.getBlock()
  if (player.hasCorrectToolForDrops(block.getBlockState())) return
  event.getLevel().getServer().runCommandSilent(`summon minecraft:item ${block.getX() + 0.5} ${block.getY() + 0.25} ${block.getZ() + 0.5} {Item:{id:"simply_traps:spike_trap",Count:1b}}`)
})

ServerEvents.tick((event) => {
  var level = event.server.getLevel('minecraft:overworld')
  if (!level) return
  if (level.getTime() % TRAP_CHECK_INTERVAL !== 0) return

  var data = worldData(level)
  if (!data) return

  var list = getTrapRegistry(data)
  if (list.length === 0) return

  var attackers = []
  level.getEntities().forEach((e) => {
    if (e.getTags().contains('td_wave_mob')) attackers.push(e)
  })
  if (attackers.length === 0) return

  var changed = false
  var survivors = []
  list.forEach((trap) => {
    var cx = trap.x + 0.5
    var cy = trap.y + 0.5
    var cz = trap.z + 0.5
    var damage = 0
    attackers.forEach((e) => {
      var dx = e.getX() - cx
      var dy = e.getY() - cy
      var dz = e.getZ() - cz
      if (dx * dx + dy * dy + dz * dz > TRAP_RANGE_SQ) return
      damage += trapAttackDamage(e)
    })
    if (damage <= 0) {
      survivors.push(trap)
      return
    }
    changed = true
    var newHp = trap.hp - damage
    if (newHp > 0) {
      trap.hp = newHp
      survivors.push(trap)
      return
    }
    // Worn out: drop the entry. Remove the block only if it is still the
    // tracked trap; an explosion may already have taken it.
    var expectedId = TRAP_CODE_TO_ID[trap.code]
    if (`${level.getBlock(trap.x, trap.y, trap.z).id}` === expectedId) {
      // Replace mode leaves no item drop (destroy mode would), so the break
      // particles and sound are played by hand.
      var info = TRAP_TYPES[expectedId]
      var cx = trap.x + 0.5
      var cy = trap.y + 0.5
      var cz = trap.z + 0.5
      event.server.runCommandSilent(`particle minecraft:block ${expectedId} ${cx} ${cy} ${cz} 0.3 0.3 0.3 0 15`)
      event.server.runCommandSilent(`playsound ${info.breakSound} block @a ${cx} ${cy} ${cz} 1 1`)
      event.server.runCommandSilent(`setblock ${trap.x} ${trap.y} ${trap.z} minecraft:air replace`)
      // "Wear and Tear" quest (quest_milestones.js); a no-op after the first.
      qmCompleteShared(event.server, data, 'trapWorn')
    }
  })
  if (changed) setTrapRegistry(data, survivors)
})
