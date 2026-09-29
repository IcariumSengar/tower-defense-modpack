// Wave spawning: the Wave Horn, the eight written waves, the endless phase
// and the countdown between waves.
//
// useWaveHorn() starts the next wave; the Wave Horn note block and the
// countdown both call it. Waves 1-8 come from WAVES. From wave 9 ("Horde N")
// it sets Undead Nights' difficulty to wave - 8 (at most 40), runs
// spawn_horde, and queues its own baseline of mobs on top. Queued mobs are
// summoned a few ticks apart outside the compound, most in a band around the
// pedestal. Every wave mob is tagged td_wave_mob; the pack identifies wave
// mobs by that tag, never by type. Wave state lives in worldData()
// (world_state.js); wave_status.js detects the clear and starts the countdown.

// The written waves 1-8, as [entity id, count] pairs. Vanilla zombie variants
// fill waves 1-6; Mutants and Zombies' mutants join from wave 2, Undead
// Nights' zombies from wave 5, and wave 8 brings a pack of four Crawlers and
// the first Demolition Zombie. Brutes never appear in a written wave (see
// BRUTE_TIER_MIN_LEVEL). Ambushers are queued on top of these counts
// (undergroundAmbushCountForWave).
var WAVES = [
  [['minecraft:zombie', 3], ['minecraft:husk', 2], ['minecraft:zombie_villager', 1]],
  [['minecraft:zombie', 2], ['minecraft:husk', 2], ['minecraft:drowned', 2], ['mutantszombies:mutant_zombie', 3]],
  [['minecraft:zombie', 2], ['minecraft:husk', 2], ['minecraft:drowned', 1], ['mutantszombies:mutant_zombie', 2], ['mutantszombies:blister_zombie', 3]],
  [['minecraft:zombie', 2], ['minecraft:husk', 2], ['mutantszombies:blister_zombie', 2], ['mutantszombies:split_head_zombie', 2]],
  [['minecraft:zombie', 1], ['minecraft:husk', 1], ['undeadnights:elite_zombie', 2]],
  [['minecraft:zombie', 1], ['minecraft:husk', 1], ['undeadnights:horde_zombie', 4], ['mutantszombies:split_head_zombie', 2]],
  [['undeadnights:elite_zombie', 2], ['undeadnights:horde_zombie', 3]],
  [['mutantszombies:crawler', 4], ['undeadnights:demolition_zombie', 1], ['undeadnights:elite_zombie', 1], ['undeadnights:horde_zombie', 4]],
]

// "Wave N" for the written waves, "Horde N" past them. boss_wave.js and
// wave_status.js use it too, so the split is defined once, here.
function tdWaveLabel(waveNumber) {
  return (waveNumber > WAVES.length ? 'Horde ' : 'Wave ') + waveNumber
}

// Every entity type a wave can contain: WAVES, ENDLESS_OTHER_TIERS and the
// Undead Nights hordes (undeadnights_horde_mobs_config.json). Horde mobs of a
// type missing here never get tagged. The pack's one roster list: mob_aggro.js,
// wave_status.js, pedestal_health.js and bounty_kills.js read it too.
var WAVE_MOB_TYPES = [
  'minecraft:zombie',
  'minecraft:husk',
  'minecraft:drowned',
  'minecraft:zombie_villager',
  'mutantszombies:mutant_zombie',
  'mutantszombies:blister_zombie',
  'mutantszombies:split_head_zombie',
  'undeadnights:elite_zombie',
  'undeadnights:horde_zombie',
  'undeadnights:demolition_zombie',
  'mutantszombies:zombie_brute',
  'mutantszombies:mutant_brute',
  'mutantszombies:rotten_mutant',
  'mutantszombies:crawler',
]

// Endless-phase baseline. spawn_horde gives no predictable mob count, so each
// endless wave also queues plain zombies plus these other types, grouped
// light to heavy: tier 0, tier 1, tier 2, then brutes. pickEndlessOtherType
// weights the heavier tiers in as the level climbs.
var ENDLESS_OTHER_TIERS = [
  ['minecraft:husk', 'minecraft:drowned', 'minecraft:zombie_villager'],
  ['mutantszombies:mutant_zombie', 'mutantszombies:blister_zombie', 'mutantszombies:split_head_zombie'],
  // Crawler is listed three times (3 of 7 picks): it climbs walls (Advanced
  // Wall Climber API) and outruns a vanilla zombie (0.3 speed vs 0.23).
  ['undeadnights:elite_zombie', 'undeadnights:horde_zombie', 'undeadnights:demolition_zombie', 'mutantszombies:rotten_mutant', 'mutantszombies:crawler', 'mutantszombies:crawler', 'mutantszombies:crawler'],
  // Brutes, gated separately by BRUTE_TIER_MIN_LEVEL.
  ['mutantszombies:zombie_brute', 'mutantszombies:mutant_brute'],
]

// Endless level (wave - 8) from which tier 2 can be picked: wave 13.
var TIER2_MIN_LEVEL = 5
// Endless level from which brutes can be picked: wave 20. Undead Nights'
// hordes use the same gate: in undeadnights_difficulty_config.json, levels
// 1-11 only use brute-free hordes (id 1 and the copies 5-7) and levels 12+
// the originals with brutes (ids 2-4). Keep the two in step.
var BRUTE_TIER_MIN_LEVEL = 12

// Both brutes are slower than a vanilla zombie (zombie_brute 0.21,
// mutant_brute 0.2, zombie 0.23) and immune to knockback, so a player can
// just walk away from them. Summoned brutes get this speed instead; the
// horde config's nbtTags give Undead Nights' brutes the same 0.28.
var BRUTE_SPEED_FIX_TYPES = ['mutantszombies:zombie_brute', 'mutantszombies:mutant_brute']
var BRUTE_MOVEMENT_SPEED = 0.28

// Mutant Brute's native 120 HP, halved; Zombie Brute keeps its 100. Health is
// set along with generic.max_health, or the mob spawns at its native 120. The
// horde config's nbtTags set the same 60 for Undead Nights' Mutant Brutes;
// Undead Nights scales max_health per level but leaves a non-Undead-Nights
// mob's current health alone (dynamic scaling is off), so they start at 60
// too. Keep the two equal.
var MUTANT_BRUTE_MAX_HEALTH = 60

function pickEndlessOtherType(waveNumber) {
  // Keyed on the endless level (1-40), the scale the Undead Nights difficulty
  // config uses.
  var endlessLevel = Math.min(waveNumber - WAVES.length, 40)
  // Relative weights: tier 0 fades to a floor of 5, tier 1 stays at 30, and
  // tier 2 and brutes ramp in by 5 per level once unlocked, capped at 80.
  var tier2Weight = endlessLevel < TIER2_MIN_LEVEL ? 0 : Math.min(80, (endlessLevel - TIER2_MIN_LEVEL + 1) * 5)
  var bruteWeight = endlessLevel < BRUTE_TIER_MIN_LEVEL ? 0 : Math.min(80, (endlessLevel - BRUTE_TIER_MIN_LEVEL + 1) * 5)
  var weights = [Math.max(5, 40 - endlessLevel), 30, tier2Weight, bruteWeight]
  var totalWeight = weights[0] + weights[1] + weights[2] + weights[3]
  var roll = Math.random() * totalWeight
  var tierIndex = roll < weights[0] ? 0 : roll < weights[0] + weights[1] ? 1 : roll < weights[0] + weights[1] + weights[2] ? 2 : 3
  var tier = ENDLESS_OTHER_TIERS[tierIndex]
  return tier[Math.floor(Math.random() * tier.length)]
}

// Spawns waiting for their tick, drained by the PlayerEvents.tick handler
// below. Staggering spreads a wave's arrival out and lets each mob's sound
// cue play first. In memory only: a server restart drops anything still
// queued. Entries: {mobType, x, y, z, spawnTick, soundTick, soundPlayed},
// plus underground: true for ambushers.
var pendingSpawns = []

// Ticks between queued spawns: 16 on wave 1, 3 fewer each wave, down to 4
// from wave 5 on. A mob's sound cue plays SOUND_LEAD_TICKS before it.
var BASE_STAGGER_GAP_TICKS = 16
var MIN_STAGGER_GAP_TICKS = 4
var SOUND_LEAD_TICKS = 12

function staggerGapForWave(waveNumber) {
  return Math.max(MIN_STAGGER_GAP_TICKS, BASE_STAGGER_GAP_TICKS - (waveNumber - 1) * 3)
}

// Tagging Undead Nights' horde mobs, which spawn_horde creates untagged.
// useWaveHorn snapshots the untagged roster mobs already in the level; for
// HORDE_TAG_WINDOW_TICKS afterwards, any other untagged roster mob within
// HORDE_TAG_RADIUS of a player is tagged td_wave_mob, structure guards
// excepted. spawn_horde only queues the horde and Undead Nights spawns it on
// its next tick, so the window does the tagging. A structure mob whose chunk
// loads inside the window and radius gets tagged too; a rare edge, accepted.
var HORDE_TAG_WINDOW_TICKS = 100 // 5 seconds
var HORDE_TAG_RADIUS = 128 // blocks from a player; hordes spawn 70-75 out
// The world-state marker: the td_pedestal_target armor stand worldData()
// lives on. Undead Nights' commands run as it (see useWaveHorn).
var WAVE_STATE_MARKER_SELECTOR = '@e[type=minecraft:armor_stand,tag=td_pedestal_target,limit=1]'
var tdHordeTagUntil = 0
var tdHordeTagSnapshot = {}

function tdSnapshotUntaggedRosterMobs(level) {
  var snap = {}
  level.getEntities().forEach(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return
    if (e.getTags().contains('td_wave_mob')) return
    snap[`${e.uuid}`] = true
  })
  return snap
}

// Undead Nights places a player's horde 70-75 blocks from that player with
// no regard for the base, so horde mobs can land inside the compound. A newly
// tagged horde mob inside the padded compound footprint
// (td_compoundX0/X1/Z0/Z1, from playtest_starter_kit.js) is moved just past
// the nearest side. No-op on a save without a stored footprint.
var TD_COMPOUND_RELOCATE_PADDING = 4 // blocks

function tdRelocateIfInsideCompound(entity, level) {
  var data = worldData(level)
  if (!data || !data.contains('td_compoundX0')) return
  var x0 = data.getInt('td_compoundX0') - TD_COMPOUND_RELOCATE_PADDING
  var x1 = data.getInt('td_compoundX1') + TD_COMPOUND_RELOCATE_PADDING
  var z0 = data.getInt('td_compoundZ0') - TD_COMPOUND_RELOCATE_PADDING
  var z1 = data.getInt('td_compoundZ1') + TD_COMPOUND_RELOCATE_PADDING
  var ex = entity.getX()
  var ez = entity.getZ()
  if (ex < x0 || ex > x1 || ez < z0 || ez > z1) return // already outside

  // Out past the nearest side of the padded rectangle.
  var distWest = ex - x0
  var distEast = x1 - ex
  var distNorth = ez - z0
  var distSouth = z1 - ez
  var minDist = Math.min(distWest, distEast, distNorth, distSouth)
  var nx = ex
  var nz = ez
  if (minDist === distWest) nx = x0 - 1
  else if (minDist === distEast) nx = x1 + 1
  else if (minDist === distNorth) nz = z0 - 1
  else nz = z1 + 1

  entity.teleportTo(nx, entity.getY(), nz)
  console.log(`wave_spawner.js: relocated a horde ${entity.type} out of the compound, (${Math.floor(ex)},${Math.floor(ez)}) -> (${Math.floor(nx)},${Math.floor(nz)})`)
}

function tdTagHordeMobs(player, level) {
  var tagged = 0
  level.getEntities().forEach(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return
    var tags = e.getTags()
    if (tags.contains('td_wave_mob') || tags.contains('td_structure_guard')) return
    if (tdHordeTagSnapshot[`${e.uuid}`]) return
    var dx = e.getX() - player.getX()
    var dz = e.getZ() - player.getZ()
    if (dx * dx + dz * dz > HORDE_TAG_RADIUS * HORDE_TAG_RADIUS) return
    tags.add('td_wave_mob')
    tdRelocateIfInsideCompound(e, level)
    tagged++
  })
  return tagged
}

// Live td_wave_mob roster mobs within radius blocks of origin ({x, y, z}).
function nearbyWaveMobCount(origin, level, radius) {
  return level.getEntities().filter(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return false
    if (!e.getTags().contains('td_wave_mob')) return false
    // A killed mob stays in the entity list through its ~1 s death animation.
    if (e.getHealth() <= 0) return false
    var dx = e.getX() - origin.x
    var dy = e.getY() - origin.y
    var dz = e.getZ() - origin.z
    return dx * dx + dy * dy + dz * dz <= radius * radius
  }).length
}

// Most wave mobs alive at once. The endless baseline grows fast (about 111
// mobs at wave 20, 841 at wave 40), so a due spawn waits in the queue for a
// free slot and a big wave arrives over the fight instead of in one lag
// spike. Counted across the whole level, since every live mob costs server
// time wherever it is.
var MAX_CONCURRENT_WAVE_MOBS = 60

// Once a count comes back at the cap, it is trusted for this many ticks
// before counting again; tdCapHoldUntilTick holds the expiry.
var TD_CAP_RECHECK_TICKS = 10
var tdCapHoldUntilTick = 0

function countAliveWaveMobs(level) {
  return level.getEntities().filter(function (e) {
    return WAVE_MOB_TYPES.includes(`${e.type}`) && e.getTags().contains('td_wave_mob') && e.getHealth() > 0
  }).length
}

// The point waves are built around: the pedestal (td_pedestalX/Y/Z, written
// once by playtest_starter_kit.js), wherever the players are. The player's
// position is a fallback for before the base exists. wave_status.js and
// boss_wave.js use it too.
function waveObjective(player, data) {
  if (data.contains('td_pedestalX')) {
    return {
      x: data.getInt('td_pedestalX') + 0.5,
      y: data.getInt('td_pedestalY'),
      z: data.getInt('td_pedestalZ') + 0.5,
    }
  }
  return { x: player.getX(), y: player.getY(), z: player.getZ() } // getX(): bare .x is NaN on entities here
}

// Spawn band: 48-64 blocks from the pedestal, clamped into the live border
// and kept outside the compound. mob_aggro.js returns stray wave mobs into
// the same band through these helpers. The band lies inside the permanent
// forceload covering 96 blocks around the pedestal (playtest_starter_kit.js),
// so spawn points are always loaded.
var TD_SPAWN_BAND_MIN = 48
var TD_SPAWN_BAND_MAX = 64
var TD_SPAWN_BORDER_MARGIN = 6 // blocks: spreadplayers' 4-block snap, plus 2
var TD_COMPOUND_SPAWN_PADDING = 4 // blocks around the compound footprint
var TD_COMPOUND_SPAWN_MAX_ATTEMPTS = 30

// Read fresh on every call: the border grows after each clear
// (base_expansion.js). Until the border is 140 blocks wide the band shrinks
// to fit inside it (max at least 15, min at most max - 10).
function tdWaveSpawnBand(level) {
  var border = level.getWorldBorder()
  var halfWidth = border.getSize() / 2
  var max = Math.max(15, Math.min(TD_SPAWN_BAND_MAX, halfWidth - TD_SPAWN_BORDER_MARGIN))
  return {
    min: Math.min(TD_SPAWN_BAND_MIN, max - 10),
    max: max,
    minX: Math.ceil(border.getMinX() + TD_SPAWN_BORDER_MARGIN),
    maxX: Math.floor(border.getMaxX() - TD_SPAWN_BORDER_MARGIN),
    minZ: Math.ceil(border.getMinZ() + TD_SPAWN_BORDER_MARGIN),
    maxZ: Math.floor(border.getMaxZ() - TD_SPAWN_BORDER_MARGIN),
  }
}

// The compound footprint (td_compoundX0/X1/Z0/Z1, from
// playtest_starter_kit.js) plus TD_COMPOUND_SPAWN_PADDING, or null on a save
// without one, in which case callers skip the check.
function tdCompoundSpawnRect(data) {
  if (!data || !data.contains('td_compoundX0')) return null
  return {
    x0: data.getInt('td_compoundX0') - TD_COMPOUND_SPAWN_PADDING,
    x1: data.getInt('td_compoundX1') + TD_COMPOUND_SPAWN_PADDING,
    z0: data.getInt('td_compoundZ0') - TD_COMPOUND_SPAWN_PADDING,
    z1: data.getInt('td_compoundZ1') + TD_COMPOUND_SPAWN_PADDING,
  }
}

// A spawn column in the band around (cx, cz), clamped into the border box and
// outside the padded compound. Tries random angles and distances (arithmetic
// only, no chunk reads); if all TD_COMPOUND_SPAWN_MAX_ATTEMPTS land inside
// the compound, it falls back to a point one block outside a random side of
// the padded compound, clamped into the border box.
function tdSpawnBandPoint(band, rect, cx, cz) {
  var PI = 3.141592653589793 // Math.PI is undefined in this Rhino build
  for (var attempt = 0; attempt < TD_COMPOUND_SPAWN_MAX_ATTEMPTS; attempt++) {
    var angle = Math.random() * 2 * PI
    var distance = band.min + Math.random() * (band.max - band.min)
    // Clamp into the border box: a mob summoned past the border is stuck
    // there for good, unable to path back in.
    var px = Math.min(Math.max(Math.floor(cx + Math.cos(angle) * distance), band.minX), band.maxX)
    var pz = Math.min(Math.max(Math.floor(cz + Math.sin(angle) * distance), band.minZ), band.maxZ)
    if (!rect || px < rect.x0 || px > rect.x1 || pz < rect.z0 || pz > rect.z1) return { x: px, z: pz }
  }
  var side = Math.floor(Math.random() * 4) // 0=N 1=S 2=W 3=E (-Z +Z -X +X)
  var fx, fz
  if (side === 0) {
    fx = rect.x0 + Math.random() * (rect.x1 - rect.x0)
    fz = rect.z0 - 1
  } else if (side === 1) {
    fx = rect.x0 + Math.random() * (rect.x1 - rect.x0)
    fz = rect.z1 + 1
  } else if (side === 2) {
    fx = rect.x0 - 1
    fz = rect.z0 + Math.random() * (rect.z1 - rect.z0)
  } else {
    fx = rect.x1 + 1
    fz = rect.z0 + Math.random() * (rect.z1 - rect.z0)
  }
  var safePoint = {
    x: Math.min(Math.max(Math.floor(fx), band.minX), band.maxX),
    z: Math.min(Math.max(Math.floor(fz), band.minZ), band.maxZ),
  }
  console.log(`wave_spawner.js: could not find a spawn point outside the compound after ${TD_COMPOUND_SPAWN_MAX_ATTEMPTS} random attempts - using a guaranteed-outside point (${safePoint.x},${safePoint.z}) instead`)
  return safePoint
}

// True while the current wave still has mobs to come: queued spawns, or an
// open horde-tagging window (the horde may not have landed yet).
// wave_status.js holds back its straggler outline until this is false.
function tdWaveSpawnsOutstanding(level) {
  return pendingSpawns.length > 0 || level.getTime() <= tdHordeTagUntil
}

// Ambushers surface TD_AMBUSH_WALL_GAP_MIN-MAX blocks outside a random
// compound wall, measured from the walls themselves. The minimum keeps the
// spawn tick's 1-block surface snap off the wall. A point the border clamp
// pulls back inside that minimum is re-rolled; after TD_AMBUSH_MAX_ATTEMPTS,
// or on a save without a stored footprint, the normal spawn band is used.
var TD_AMBUSH_WALL_GAP_MIN = 4
var TD_AMBUSH_WALL_GAP_MAX = 7
var TD_AMBUSH_MAX_ATTEMPTS = 16

// Returns {x, y, z}. y is the objective's floor level; the spawn tick's
// surface snap corrects it anyway.
function tdPickAmbushPos(level, data, objective) {
  var y = Math.floor(objective.y)
  var band = tdWaveSpawnBand(level)
  var rect = tdCompoundSpawnRect(data)
  if (data.contains('td_compoundX0')) {
    var x0 = data.getInt('td_compoundX0')
    var x1 = data.getInt('td_compoundX1')
    var z0 = data.getInt('td_compoundZ0')
    var z1 = data.getInt('td_compoundZ1')
    for (var attempt = 0; attempt < TD_AMBUSH_MAX_ATTEMPTS; attempt++) {
      var gap = TD_AMBUSH_WALL_GAP_MIN + Math.floor(Math.random() * (TD_AMBUSH_WALL_GAP_MAX - TD_AMBUSH_WALL_GAP_MIN + 1))
      var side = Math.floor(Math.random() * 4) // 0=N 1=S 2=W 3=E (-Z +Z -X +X)
      var px, pz
      if (side === 0 || side === 1) {
        px = x0 + Math.floor(Math.random() * (x1 - x0 + 1))
        pz = side === 0 ? z0 - gap : z1 + gap
      } else {
        pz = z0 + Math.floor(Math.random() * (z1 - z0 + 1))
        px = side === 2 ? x0 - gap : x1 + gap
      }
      px = Math.min(Math.max(px, band.minX), band.maxX)
      pz = Math.min(Math.max(pz, band.minZ), band.maxZ)
      // The border clamp pulled it back within the minimum gap: re-roll.
      if (px > x0 - TD_AMBUSH_WALL_GAP_MIN && px < x1 + TD_AMBUSH_WALL_GAP_MIN &&
          pz > z0 - TD_AMBUSH_WALL_GAP_MIN && pz < z1 + TD_AMBUSH_WALL_GAP_MIN) continue
      return { x: px, y: y, z: pz }
    }
  }
  var fallback = tdSpawnBandPoint(band, rect, objective.x, objective.z)
  return { x: fallback.x, y: y, z: fallback.z }
}

// Starts the next wave, or tells the player why it can't. Called by the Wave
// Horn note block and by the countdown when it runs out.
function useWaveHorn(player) {
  var level = player.getLevel()
  var server = player.getServer() // console source: /summon needs op level 2
  // Shared world state (world_state.js); null until the base is built.
  var data = worldData(level)
  if (!data) return

  // After a loss the horn is silent for good: pedestal_destruction.js sets
  // td_pedestalDestroyed, hardcore_death.js sets td_hardcoreGameOver, and
  // neither is ever cleared.
  if (data.getBoolean('td_pedestalDestroyed')) {
    player.tell('§8§oThe horn has nothing left to call to.')
    return
  }

  if (data.getBoolean('td_hardcoreGameOver')) {
    player.tell('§8§oThe horn has nothing left to call to.')
    return
  }

  var currentTick = level.getTime()

  // One use per second: holding right-click repeats the click every few ticks.
  // td_lastHornUseTick also completes the "Sound the Horn" quest
  // (quest_milestones.js).
  var lastTick = data.getInt('td_lastHornUseTick')
  if (currentTick - lastTick < 20) return
  data.putInt('td_lastHornUseTick', currentTick)

  player.playSound(Utils.getSound('minecraft:event.raid.horn'))

  var objective = waveObjective(player, data)
  // Refuse while the current wave is still alive near the pedestal or still
  // queued (queued mobs don't exist yet for nearbyWaveMobCount to see).
  // Radius 96 matches wave_status.js's RADIUS: the spawn band plus the
  // spreadplayers snap puts fresh mobs up to 68 blocks out.
  if (nearbyWaveMobCount(objective, level, 96) > 0 || pendingSpawns.length > 0) {

    player.tell('§c[Wave Horn] §fClear the current wave before summoning the next one.')
    return
  }

  // A manual use doesn't wait for the countdown. It cancels it, so the
  // countdown can't start another wave when it reaches zero. The 10-minute
  // minimum gap (MIN_WAVE_GAP_TICKS, wave_status.js) only paces the automatic
  // trigger.
  data.putBoolean('td_countdownActive', false)

  var waveNumber = data.getInt('td_waveNumber') + 1
  data.putInt('td_waveNumber', waveNumber)

  // Night for the whole wave, so zombies don't burn in daylight.
  // wave_status.js restores day and the daylight cycle on the clear, as do
  // both game-over paths.
  server.runCommandSilent('time set night')
  server.runCommandSilent('gamerule doDaylightCycle false')

  // Spawn band and compound rectangle, read once per horn use.
  var spawnBand = tdWaveSpawnBand(level)
  var compoundSpawnRect = tdCompoundSpawnRect(data)

  function randomObjectiveRelativePosition() {
    return tdSpawnBandPoint(spawnBand, compoundSpawnRect, objective.x, objective.z)
  }

  // Ambushers: zombies that burst out of the ground just outside a compound
  // wall (tdPickAmbushPos).
  function undergroundAmbushPos() {
    return tdPickAmbushPos(level, data, objective)
  }

  // Ambushers per wave: none on wave 1, then 1 (waves 2-4), 2 (5-6), 3 (7-8);
  // in the endless phase 2 plus one per 5 levels, at most 6.
  function undergroundAmbushCountForWave(n) {
    if (n > WAVES.length) return Math.min(2 + Math.floor((Math.min(n - WAVES.length, 40)) / 5), 6)
    return n < 2 ? 0 : (n < 5 ? 1 : (n < 7 ? 2 : 3))
  }

  // Endless phase: an Undead Nights horde plus a baseline of queued mobs.
  if (waveNumber > WAVES.length) {
    var endlessLevel = Math.min(waveNumber - WAVES.length, 40)
    // Undead Nights' commands need an entity source, and they send their chat
    // messages to that entity rather than to the command output, so they run
    // as the world-state marker: an armor stand drops the messages. spawn_horde
    // with no target sends a horde at every player in the level, spawning 70-75
    // blocks from each (undeadnights-server.toml).
    //
    // Setting the difficulty resets Undead Nights' sequential horde index, so
    // it is only sent when the level changes. The level changes every wave up
    // to 40, so a lone player always gets each level's first listed horde
    // (undeadnights_difficulty_config.json).
    if (data.getInt('td_lastEndlessLevel') !== endlessLevel) {
      data.putInt('td_lastEndlessLevel', endlessLevel)
      server.runCommandSilent(`execute as ${WAVE_STATE_MARKER_SELECTOR} run undeadnights difficulty set ${endlessLevel}`)
    }
    // Snapshot the roster mobs already here, then open the tagging window; the
    // PlayerEvents.tick handler below does the tagging.
    tdHordeTagSnapshot = tdSnapshotUntaggedRosterMobs(level)
    tdHordeTagUntil = currentTick + HORDE_TAG_WINDOW_TICKS
    server.runCommandSilent(`execute as ${WAVE_STATE_MARKER_SELECTOR} run undeadnights spawn_horde`)
    // The horde scream is replayed here: hordeSpawnedMessageAndSound is off in
    // undeadnights-server.toml, since it also posts a chat line.
    server.runCommandSilent('execute as @a at @s run playsound undeadnights:horde_scream hostile @s ~ ~ ~ 1 1')
    // Usually tags nothing: the horde lands on Undead Nights' next tick, inside
    // the tagging window.
    var hordeTagged = tdTagHordeMobs(player, level)
    console.log(`wave_spawner.js: endless wave ${waveNumber} - tagged ${hordeTagged} Undead Nights horde mob(s) as td_wave_mob immediately after spawn_horde`)

    // Baseline on top of the horde: plain zombies plus tier-weighted other
    // types, queued back to back at the 4-tick stagger floor. The exponents
    // use the capped endless level and the linear factor the raw wave number,
    // so counts keep growing past level 40 without compounding.
    var baselineZombieCount = Math.round(12 + waveNumber * Math.pow(1.09, endlessLevel))
    var baselineOtherCount = Math.round(7 + waveNumber * Math.pow(1.05, endlessLevel))
    var baselineStaggerGap = staggerGapForWave(waveNumber)
    var baselineIndex = 0
    for (var zi = 0; zi < baselineZombieCount; zi++) {
      var zPos = randomObjectiveRelativePosition()
      var zSpawnTick = currentTick + baselineIndex * baselineStaggerGap
      pendingSpawns.push({
        mobType: 'minecraft:zombie',
        x: zPos.x,
        y: Math.floor(objective.y),
        z: zPos.z,
        spawnTick: zSpawnTick,
        soundTick: zSpawnTick - SOUND_LEAD_TICKS,
        soundPlayed: false,
      })
      baselineIndex++
    }
    for (var mi = 0; mi < baselineOtherCount; mi++) {
      var mPos = randomObjectiveRelativePosition()
      var mSpawnTick = currentTick + baselineIndex * baselineStaggerGap
      pendingSpawns.push({
        mobType: pickEndlessOtherType(waveNumber),
        x: mPos.x,
        y: Math.floor(objective.y),
        z: mPos.z,
        spawnTick: mSpawnTick,
        soundTick: mSpawnTick - SOUND_LEAD_TICKS,
        soundPlayed: false,
      })
      baselineIndex++
    }

    var undergroundAmbushCount = undergroundAmbushCountForWave(waveNumber)
    for (var ui = 0; ui < undergroundAmbushCount; ui++) {
      var uPos = undergroundAmbushPos()
      if (!uPos) continue // defensive: tdPickAmbushPos always returns a point
      var uSpawnTick = currentTick + baselineIndex * baselineStaggerGap
      pendingSpawns.push({
        mobType: 'minecraft:zombie',
        x: uPos.x,
        y: uPos.y,
        z: uPos.z,
        spawnTick: uSpawnTick,
        soundTick: uSpawnTick - SOUND_LEAD_TICKS,
        soundPlayed: false,
        underground: true,
      })
      baselineIndex++
    }

    player.notify(`§6${tdWaveLabel(waveNumber)} - difficulty ${endlessLevel}, +${baselineZombieCount + baselineOtherCount} baseline`)
    server.runCommandSilent(`title @a title {"text":"${tdWaveLabel(waveNumber).toUpperCase()}","color":"gold","bold":true}`)
    server.runCommandSilent(`title @a subtitle {"text":"The horde approaches...","color":"white"}`)
    // The one chat line per wave start; everything else is titles and toasts.
    server.runCommandSilent(`tellraw @a {"text":"${tdWaveLabel(waveNumber)} has started.","color":"gold"}`)
    // Bell at each player: a server-sourced playsound at ~ ~ ~ would play at
    // world spawn.
    server.runCommandSilent(`execute as @a at @s run playsound minecraft:block.bell.use master @s ~ ~ ~ 1 1 1`)
    return
  }

  // Written waves 1-8.
  var composition = WAVES[Math.min(waveNumber, WAVES.length) - 1]
  var totalMobs = 0

  var staggerGap = staggerGapForWave(waveNumber)
  var mobIndex = 0

  composition.forEach(function (pair) {
    var mobType = pair[0]
    var count = pair[1]
    for (var i = 0; i < count; i++) {
      var pos = randomObjectiveRelativePosition()
      var spawnTick = currentTick + mobIndex * staggerGap
      pendingSpawns.push({
        mobType: mobType,
        x: pos.x,
        // Rough ground level; the spawn tick's spreadplayers snap fixes the
        // height.
        y: Math.floor(objective.y),
        z: pos.z,
        spawnTick: spawnTick,
        soundTick: spawnTick - SOUND_LEAD_TICKS,
        soundPlayed: false,
      })
      mobIndex++
      totalMobs++
    }
  })

  var undergroundAmbushCount = undergroundAmbushCountForWave(waveNumber)
  for (var ui = 0; ui < undergroundAmbushCount; ui++) {
    var uPos = undergroundAmbushPos()
    if (!uPos) continue // defensive: tdPickAmbushPos always returns a point
    var uSpawnTick = currentTick + mobIndex * staggerGap
    pendingSpawns.push({
      mobType: 'minecraft:zombie',
      x: uPos.x,
      y: uPos.y,
      z: uPos.z,
      spawnTick: uSpawnTick,
      soundTick: uSpawnTick - SOUND_LEAD_TICKS,
      soundPlayed: false,
      underground: true,
    })
    mobIndex++
    totalMobs++
  }

  var displayWave = Math.min(waveNumber, WAVES.length)
  server.runCommandSilent(`title @a title {"text":"WAVE ${displayWave}","color":"gold","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"${totalMobs} mobs incoming!","color":"white"}`)
  server.runCommandSilent(`tellraw @a {"text":"Wave ${displayWave} has started.","color":"gold"}`)
  // Bell at each player, as in the endless branch.
  server.runCommandSilent(`execute as @a at @s run playsound minecraft:block.bell.use master @s ~ ~ ~ 1 1 1`)
}

// The Wave Horn: the note block playtest_starter_kit.js places upstairs in
// the command post (td_waveNoteBlockX/Y/Z). Other note blocks are left
// alone. The click isn't cancelled, so the horn block still changes pitch.
BlockEvents.rightClicked('minecraft:note_block', function (event) {
  var player = event.entity
  var level = player.getLevel()
  var data = worldData(level)
  if (!data || !data.contains('td_waveNoteBlockX')) return
  var pos = event.getBlock().getPos()
  if (pos.getX() !== data.getInt('td_waveNoteBlockX') ||
    pos.getY() !== data.getInt('td_waveNoteBlockY') ||
    pos.getZ() !== data.getInt('td_waveNoteBlockZ')) return
  useWaveHorn(player)
})

// Drains pendingSpawns. Each queued mob's cave-sound cue plays at its spawn
// point, then on its spawn tick the mob is summoned and snapped onto the
// surface with spreadplayers, which is why the queued y only needs to be
// roughly right. Also runs the horde-tagging window.
PlayerEvents.tick(function (event) {
  var player = event.entity
  var level = player.getLevel()
  var currentTick = level.getTime()

  // Horde-tagging window (HORDE_TAG_WINDOW_TICKS), every 10 ticks.
  if (currentTick <= tdHordeTagUntil && currentTick % 10 === 0) {
    var newlyTagged = tdTagHordeMobs(player, level)
    if (newlyTagged > 0) console.log(`wave_spawner.js: tagged ${newlyTagged} Undead Nights horde mob(s) as td_wave_mob`)
  }

  if (pendingSpawns.length === 0) return

  var server = player.getServer()
  var stillPending = []
  // Concurrent cap: count live wave mobs only on ticks where some spawn is
  // due, and after a count at the cap reuse it for TD_CAP_RECHECK_TICKS
  // instead of rescanning. The count is then advanced locally per summon, so
  // one scan gates the whole tick. A hold further ahead than one recheck
  // period is treated as stale.
  var anySpawnDue = false
  for (var d = 0; d < pendingSpawns.length; d++) {
    if (currentTick >= pendingSpawns[d].spawnTick) { anySpawnDue = true; break }
  }
  var aliveWaveMobCount = 0
  if (anySpawnDue) {
    var capHeld = tdCapHoldUntilTick > currentTick && tdCapHoldUntilTick - currentTick <= TD_CAP_RECHECK_TICKS
    if (capHeld) {
      aliveWaveMobCount = MAX_CONCURRENT_WAVE_MOBS
    } else {
      aliveWaveMobCount = countAliveWaveMobs(level)
      tdCapHoldUntilTick = aliveWaveMobCount >= MAX_CONCURRENT_WAVE_MOBS ? currentTick + TD_CAP_RECHECK_TICKS : 0
    }
  }

  pendingSpawns.forEach(function (spawn) {
    if (!spawn.soundPlayed && currentTick >= spawn.soundTick) {
      server.runCommandSilent(
        `playsound minecraft:ambient.cave ambient @a ${spawn.x} ${spawn.y} ${spawn.z} 1 0.6`
      )
      spawn.soundPlayed = true
    }
    // At the cap a due spawn stays queued and is retried next tick. Its sound
    // cue has already played on schedule.
    if (currentTick >= spawn.spawnTick && aliveWaveMobCount >= MAX_CONCURRENT_WAVE_MOBS) {
      stillPending.push(spawn)
      return
    }
    if (currentTick >= spawn.spawnTick) {
      // td_wave_mob marks the mob as wave-spawned for life; everything that
      // counts, steers or targets wave mobs keys off it. td_undergroundAmbush
      // marks ambushers for log searches; nothing reads it.
      var summonTags = spawn.underground ? '["td_justSpawned","td_wave_mob","td_undergroundAmbush"]' : '["td_justSpawned","td_wave_mob"]'
      var speedFix = BRUTE_SPEED_FIX_TYPES.indexOf(spawn.mobType) !== -1
        ? `,{Name:"generic.movement_speed",Base:${BRUTE_MOVEMENT_SPEED}}`
        : ''
      var isMutantBrute = spawn.mobType === 'mutantszombies:mutant_brute'
      var healthFix = isMutantBrute ? `,{Name:"generic.max_health",Base:${MUTANT_BRUTE_MAX_HEALTH}}` : ''
      var healthField = isMutantBrute ? `,Health:${MUTANT_BRUTE_MAX_HEALTH}.0f` : ''
      // PersistenceRequired: no despawning while players are away.
      // follow_range 128: pathfinding is capped at follow range (35 for a
      // vanilla zombie), and mobs spawn up to 68 blocks from the pedestal.
      var summonNbt = `{Attributes:[{Name:"generic.follow_range",Base:128}${speedFix}${healthFix}],PersistenceRequired:1b,Tags:${summonTags}${healthField}}`
      // td_justSpawned lets the commands below find this mob and comes off at
      // the end of this block, so the next spawn (same type, same tick) can't
      // match it.
      server.runCommandSilent(
        `summon ${spawn.mobType} ${spawn.x} ${spawn.y} ${spawn.z} ${summonNbt}`
      )
      // Snap onto the surface within 4 blocks, or 1 for ambushers so they
      // can't land on a wall. Ambushers then burst out: particles of the
      // ground block (read at the queued spot) and a digging sound where the
      // cave cue played.
      server.runCommandSilent(
        `spreadplayers ${spawn.x} ${spawn.z} 0 ${spawn.underground ? 1 : 4} false @e[type=${spawn.mobType},tag=td_justSpawned,limit=1,sort=nearest]`
      )
      if (spawn.underground) {
        var groundId = `${level.getBlock(spawn.x, spawn.y - 1, spawn.z).getId()}`
        if (groundId === 'minecraft:air' || groundId === 'minecraft:cave_air') groundId = 'minecraft:dirt'
        server.runCommandSilent(
          `execute at @e[type=${spawn.mobType},tag=td_justSpawned,limit=1,sort=nearest] run particle minecraft:block ${groundId} ~ ~0.3 ~ 0.45 0.35 0.45 0.15 70`
        )
        server.runCommandSilent(
          `execute at @e[type=${spawn.mobType},tag=td_justSpawned,limit=1,sort=nearest] run playsound minecraft:block.rooted_dirt.break hostile @a ~ ~ ~ 1.2 0.6`
        )
      }
      server.runCommandSilent(
        `tag @e[type=${spawn.mobType},tag=td_justSpawned,limit=1,sort=nearest] remove td_justSpawned`
      )
      aliveWaveMobCount++
    } else {
      stillPending.push(spawn)
    }
  })

  pendingSpawns = stillPending
})

// Countdown to the next wave. wave_status.js starts it on a clear
// (td_countdownActive, td_countdownEndTick); this handler shows it in the
// action bar and calls useWaveHorn when it runs out.
var COUNTDOWN_DISPLAY_THROTTLE = 20 // ticks between action-bar refreshes

PlayerEvents.tick(function (event) {
  var player = event.entity
  var level = player.getLevel()
  // The first player tick to see the expiry clears td_countdownActive before
  // calling useWaveHorn, so one wave starts however many players are online.
  var data = worldData(level)
  if (!data || !data.getBoolean('td_countdownActive')) return

  var currentTick = level.getTime()
  var remaining = data.getInt('td_countdownEndTick') - currentTick

  if (remaining <= 0) {
    data.putBoolean('td_countdownActive', false)
    useWaveHorn(player)
    return
  }

  if (currentTick % COUNTDOWN_DISPLAY_THROTTLE !== 0) return
  var totalSeconds = Math.ceil(remaining / 20)
  var minutes = Math.floor(totalSeconds / 60)
  var seconds = totalSeconds % 60
  var secondsDisplay = seconds < 10 ? '0' + seconds : '' + seconds
  // The action bar is one shared line: a pedestal alert (pedestal_health.js)
  // or airdrop notice (wave_airdrop.js) takes it over from the countdown, in
  // the same order wave_status.js uses for its hostile counter.
  var pedestalAlert = pedestalAlertActionbarText(data, currentTick)
  var airdropAlert = airdropInboundActionbarText(data, currentTick)
  var nextLabel = data.getInt('td_waveNumber') + 1 > WAVES.length ? 'horde' : 'wave'
  player.setStatusMessage(pedestalAlert || airdropAlert || `§b⏱ Next ${nextLabel} in: ${minutes}:${secondsDisplay}`)
})
