// Per-trap durability (2026-09-10, direct ask: "the wood then iron tier
// jump should reflect this fragility too" - the reasoning behind re-costing
// Simply Traps' Wooden Stake/Spike Trap in tier1_recipes.js/campaign.snbt).
// Neither block has any destroy-on-contact mechanic of its own (decompiled
// both - `StakeEntityCollidesInTheBlockProcedure`/
// `SpikeTrapEntityWalksOnTheBlockProcedure` only ever call
// `Entity#hurt()`), and Epic Siege Mod's own block-destruction AI
// (`blockTargets`) is confirmed non-functional in this exact pack - real
// playtest on the pedestal never got it to break anything, including the
// mod's own stock candle target (see pedestal_health.js's header for the
// full writeup and why that system was rebuilt as a deterministic HP poll
// instead of trusting ESM's AI a second time). Same call here: a real,
// deterministic per-trap HP pool, same "poll world/persistentData state
// from a throttled tick handler" pattern as pedestal_health.js, generalized
// from one fixed position to however many traps are actually placed.
//
// Registry lives on the shared world-state marker's persistentData (see
// world_state.js) as one string, `td_trapRegistry` - a `;`-separated list
// of `x,y,z,code,hp` entries. No existing file in this pack stores a list/
// map of many positions (every prior persistentData use - pedestal HP,
// wave number, etc - is a single tracked instance), so this deliberately
// avoids inventing new NBT compound/list API calls untested in this build
// and sticks to putString/getString, already proven working everywhere
// else in this codebase.
//
// Only mobs actually tagged `td_wave_mob` count toward wearing a trap down
// - never matched by entity type. Structure-spawner mobs (Philip's Ruins,
// the wasteland structures) share the same entity types as wave mobs but
// are deliberately NOT supposed to interact with the base's own defenses;
// matching by type here would repeat the exact mistake that dragged 43+
// baked structure husks onto the pedestal on 2026-09-10 - see
// mob_aggro.js's own td_wave_mob gate comment for that incident.
//
// First-pass HP numbers, not tuned by a real playtest yet (same allowance
// as every other numeric first-pass in this pack, e.g. pedestal_health.js's
// own 300). Wooden Stake (cheap, 3 logs) is deliberately flimsy - a single
// vanilla zombie (3 dmg) breaks one in ~7 hits/seconds. Spike Trap (5 iron
// ingots) is 3x tougher on top of hitting twice as hard
// (simplytraps.toml's SpikeDamageMultiplier), matching "harder to make,
// but it holds up" rather than just a bigger number for its own sake.
// breakSound picked per material for the no-drop destroy path below -
// vanilla's own SoundType break sounds (wood/metal), not tied to either
// block's specific SoundType registration (irrelevant now that `destroy`
// is no longer what plays it).
var TRAP_TYPES = {
  'simply_traps:stake': { code: 'W', maxHp: 20, breakSound: 'minecraft:block.wood.break' },
  'simply_traps:spike_trap': { code: 'I', maxHp: 60, breakSound: 'minecraft:block.metal.break' },
}
var TRAP_CODE_TO_ID = {
  W: 'simply_traps:stake',
  I: 'simply_traps:spike_trap',
}
var TRAP_IDS = Object.keys(TRAP_TYPES)

// A mob standing on (or immediately beside) the trap block - this is a
// floor trap, not a multi-block structure like the pedestal, so the range
// stays tight rather than reusing pedestal_health.js's 3-block melee
// radius.
var TRAP_RANGE = 1.2
var TRAP_RANGE_SQ = TRAP_RANGE * TRAP_RANGE
var TRAP_CHECK_INTERVAL = 20 // once/second, same cadence as pedestal_health.js

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
  // `data.getString()` returns a raw Java String here, not an auto-coerced
  // JS one (confirmed live in a sandbox - `.split()` on it invokes Java's
  // own String#split, returning a Java array whose elements' `.length` is
  // the unevaluated method object, not a number, so `.filter(s => s.length
  // > 0)` silently dropped every real entry). Same `${...}` coercion this
  // codebase already uses everywhere else a Java-returned value crosses
  // into JS territory (e.g. `${level.getBlock(...).id}` below) - just
  // missing here originally.
  return parseTrapRegistry(data.contains('td_trapRegistry') ? `${data.getString('td_trapRegistry')}` : '')
}

function setTrapRegistry(data, list) {
  data.putString('td_trapRegistry', serializeTrapRegistry(list))
}

// Same defensive try/catch as pedestal_health.js's own pedestalAttackDamage
// - one mob's attribute lookup failing must never break the check for
// every other tracked trap.
function trapAttackDamage(mob) {
  try {
    var attr = mob.getAttribute('minecraft:generic.attack_damage')
    if (attr) return attr.getValue()
  } catch (e) {
    // fall through to 0
  }
  return 0
}

BlockEvents.placed(TRAP_IDS, (event) => {
  var block = event.getBlock()
  var info = TRAP_TYPES[`${block.id}`]
  if (!info) return
  var data = worldData(event.getLevel())
  if (!data) return
  var list = getTrapRegistry(data)
  list.push({ x: block.getX(), y: block.getY(), z: block.getZ(), code: info.code, hp: info.maxHp })
  setTrapRegistry(data, list)
})

// Player mined it up before a mob finished it off - stop tracking that
// position so it doesn't keep taking up a slot in the registry forever.
// Never fires from this file's own mob-destruction setblock below (that
// uses console-issued `destroy`, which has no attached ServerPlayer - the
// real KubeJS BlockBrokenEventJS requires one, confirmed by decompiling
// this exact installed kubejs-forge-2001.6.5-build.26 jar), so there's no
// double-bookkeeping to worry about between the two removal paths.
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
    // Destroyed - verify the block is still really the trap we're tracking
    // (same defensive id check pedestal_health.js's own tick handler uses)
    // before breaking it, in case it was already removed some other way
    // without going through the broken handler above (an explosion, say).
    var expectedId = TRAP_CODE_TO_ID[trap.code]
    if (`${level.getBlock(trap.x, trap.y, trap.z).id}` === expectedId) {
      // Real playtest report (2026-09-11): "when the wood spikes break
      // they should be gone forever, no drop on the floor as if it was
      // broken normally." `destroy` (the original choice here) is
      // exactly vanilla's own player-mining removal mode - real item
      // drop included, which is the opposite of "worn out for good."
      // `replace` removes the block with no drop and no automatic
      // effects, so the break particle/sound now have to be played
      // explicitly to keep the same feedback the old `destroy` call gave
      // for free.
      var info = TRAP_TYPES[expectedId]
      var cx = trap.x + 0.5
      var cy = trap.y + 0.5
      var cz = trap.z + 0.5
      event.server.runCommandSilent(`particle minecraft:block ${expectedId} ${cx} ${cy} ${cz} 0.3 0.3 0.3 0 15`)
      event.server.runCommandSilent(`playsound ${info.breakSound} block @a ${cx} ${cy} ${cz} 1 1`)
      event.server.runCommandSilent(`setblock ${trap.x} ${trap.y} ${trap.z} minecraft:air replace`)
    }
  })
  if (changed) setTrapRegistry(data, survivors)
})
