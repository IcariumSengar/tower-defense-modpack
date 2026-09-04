// Deterministic pedestal HP (2026-09-06, direct ask: "is there a way to
// give it health like a player and this is how the mobs destroy it").
// Replaces reliance on Epic Siege Mod's own `blockTargets` config for
// actually damaging the pedestal - that stayed inconclusive even after
// the mob-pathing fix (mob_aggro.js, see its own writeup) was meant to
// give ESM_EntityTargetBlock a fair shot at firing once mobs reliably
// camp at a fixed point instead of re-chasing the player. Real playtest
// confirmed it's still not damaging the pedestal. Same "poll world/
// persistentData state from a throttled tick handler" pattern as
// pedestal_destruction.js/wave_status.js/mob_aggro.js, not another
// mod's opaque AI a second time. ESM's blockTargets config is left in
// place regardless (harmless, already shipped) - this is additive.
//
// Every wave mob already targets the pedestal marker unconditionally
// (mob_aggro.js) - being within real melee range is a sufficient proxy
// for "hitting it," no need to hook a real attack/swing event.
//
// Damage per hit is read from the attacking mob's own real
// generic.attack_damage attribute via mob.getAttribute(id).getValue() -
// confirmed working in this exact KubeJS build via a sandbox probe
// (returns a real AttributeInstance, .getValue() read a live zombie's
// base 3 correctly) before relying on it here, same "verify the clean
// name actually resolves" bar as mob_aggro.js's own reflection work.
// Tougher mobs (Mutants and Zombies' Brutes, TFTH's elites) chip through
// faster this way, matching the escalating-horde theme, instead of a
// flat number that treats every mob the same.
//
// At 0 HP, calls triggerPedestalDestroyed() - the same shared function
// pedestal_destruction.js's own block-gone detection uses, factored out
// there for exactly this reuse (see that file's header). Top-level
// function declarations share scope across server_scripts files in this
// exact KubeJS/Rhino build - confirmed directly in a sandbox (a
// zzprobe.js in a different file read `typeof triggerPedestalDestroyed`
// as `'function'`) before relying on it here, not assumed from this
// pack's own older "server_scripts don't reliably share top-level
// scope" belief (see feedback_rhino_java_reflection_quirks.md - that
// belief covered function-sharing specifically, which this now
// contradicts with a real, tested exception).
//
// First-pass numbers, not tuned by a real playtest yet (same "needs
// real tuning" allowance as every other numeric first-pass in this
// pack). 200 total HP, checked once/second (throttled like
// pedestal_destruction.js), one "hit" per mob in range per check -
// roughly one real attack per second per mob, close enough to vanilla
// melee cadence for a first pass without tracking each mob's own
// individual attack cooldown. A lone vanilla zombie (3 dmg/hit) needs
// ~67 checks (~67 seconds) to solo it; a 10-mob mixed horde averaging
// ~5 dmg each clears it in ~4 seconds - matches "if im not in the base
// to defend it then i lose the game" without being one-shot-able by a
// single trash mob.
var PEDESTAL_MELEE_RANGE = 3.0
var PEDESTAL_MELEE_RANGE_SQ = PEDESTAL_MELEE_RANGE * PEDESTAL_MELEE_RANGE

// Same roster as mob_aggro.js's WAVE_MOB_TYPES / wave_status.js's
// HOSTILE_TYPES / wave_spawner.js's own copy - duplicated per-file per
// this codebase's established convention (keep all four in sync if the
// roster changes again), not relying on the cross-file sharing this
// file's own triggerPedestalDestroyed() call above already leans on for
// something more targeted and safer to depend on.
// TFTH removed entirely 2026-09-04 (real playtest feedback) - see
// wave_spawner.js's WAVES header comment for the full replacement
// mapping/rationale.
var PEDESTAL_WAVE_MOB_TYPES = [
  'minecraft:zombie',
  'minecraft:husk',
  'minecraft:drowned',
  'minecraft:zombie_villager',
  'mutantszombies:mutant_zombie',
  'mutantszombies:blister_zombie',
  'mutantszombies:split_head_zombie',
  'mutantszombies:spitter',
  'undeadnights:elite_zombie',
  'undeadnights:horde_zombie',
  'undeadnights:demolition_zombie',
  'mutantszombies:zombie_brute',
  'mutantszombies:mutant_brute',
  'mutantszombies:rotten_mutant',
  'mutantszombies:crawler',
]

// Always-visible-in-range HP bossbar (2026-09-04, real playtest
// feedback batch: "always-visible-in-range" chosen over "only when
// looking at it" - Jade can't do a custom HP readout for a KubeJS
// block's own persistent-data value without real Java code, so this
// reuses the same "tick-poll + real vanilla command" pattern as
// everything else in this file instead of a new client-rendering
// surface). Real vanilla `/bossbar` - `players <selector>` each check
// naturally shows/hides it per-player based on live distance, no manual
// per-player tracking needed; safe to call redundantly (idempotent, no
// different from `forceload add` elsewhere in this pack).
var PEDESTAL_BOSSBAR_ID = 'kubejs:pedestal_health'
var PEDESTAL_BOSSBAR_RANGE = 64

function ensurePedestalBossbar(server, data) {
  if (data.getBoolean('td_pedestalBossbarAdded')) return
  data.putBoolean('td_pedestalBossbarAdded', true)
  server.runCommandSilent(`bossbar add ${PEDESTAL_BOSSBAR_ID} "Pedestal"`)
  server.runCommandSilent(`bossbar set ${PEDESTAL_BOSSBAR_ID} color red`)
  server.runCommandSilent(`bossbar set ${PEDESTAL_BOSSBAR_ID} max 200`)
}

function updatePedestalBossbar(server, health, x, z) {
  server.runCommandSilent(`bossbar set ${PEDESTAL_BOSSBAR_ID} value ${health}`)
  server.runCommandSilent(`bossbar set ${PEDESTAL_BOSSBAR_ID} players @a[x=${x},z=${z},distance=..${PEDESTAL_BOSSBAR_RANGE}]`)
}

function pedestalAttackDamage(mob) {
  try {
    var attr = mob.getAttribute('minecraft:generic.attack_damage')
    if (attr) return attr.getValue()
  } catch (e) {
    // Never let one mob's attribute lookup failing break the whole
    // tick handler - worst case this specific mob deals no damage this
    // check instead of a hard crash for every player online.
  }
  return 0
}

PlayerEvents.tick((event) => {
  var player = event.entity
  var data = player.persistentData

  // Already destroyed, or the base hasn't finished building yet this
  // login (td_pedestalHealth is only set once playtest_starter_kit.js's
  // build finishes) - either way, nothing to check.
  if (data.getBoolean('td_pedestalDestroyed')) return
  if (!data.contains('td_pedestalHealth')) return

  var level = player.getLevel()
  if (level.getTime() % 20 !== 0) return

  var x = data.getInt('td_pedestalX') + 0.5
  var y = data.getInt('td_pedestalY') + 0.5
  var z = data.getInt('td_pedestalZ') + 0.5

  ensurePedestalBossbar(player.getServer(), data)

  var damage = 0
  level.getEntities().forEach((e) => {
    if (!PEDESTAL_WAVE_MOB_TYPES.includes(`${e.type}`)) return
    var dx = e.getX() - x
    var dy = e.getY() - y
    var dz = e.getZ() - z
    if (dx * dx + dy * dy + dz * dz > PEDESTAL_MELEE_RANGE_SQ) return
    damage += pedestalAttackDamage(e)
  })
  if (damage <= 0) {
    updatePedestalBossbar(player.getServer(), data.getInt('td_pedestalHealth'), data.getInt('td_pedestalX'), data.getInt('td_pedestalZ'))
    return
  }

  var health = data.getInt('td_pedestalHealth') - damage
  if (health > 0) {
    data.putInt('td_pedestalHealth', health)
    updatePedestalBossbar(player.getServer(), health, data.getInt('td_pedestalX'), data.getInt('td_pedestalZ'))
    return
  }

  data.putInt('td_pedestalHealth', 0)

  // Visually match "the pedestal has fallen" - break the actual block
  // instead of leaving it standing while the world already treats it as
  // destroyed. Same block-id pair pedestal_destruction.js's own check
  // accepts (supplementaries:pedestal on every new world, the old
  // kubejs:amulet_pedestal kept registered for pre-2026-09-05 saves).
  var bx = data.getInt('td_pedestalX')
  var by = data.getInt('td_pedestalY')
  var bz = data.getInt('td_pedestalZ')
  player.getServer().runCommandSilent(`setblock ${bx} ${by} ${bz} minecraft:air destroy`)
  player.getServer().runCommandSilent(`bossbar remove ${PEDESTAL_BOSSBAR_ID}`)

  triggerPedestalDestroyed(player)
})
