// Distance-tiered guards for structure spawners.
//
// Guard spawners in the structure .nbt overrides (data/*/structures) spawn a
// placeholder husk tagged td_structure_guard. The first time an untiered guard
// spawns, it is dropped and its spawner is rewritten to one mob from its
// distance tier (near/mid/far), with that tier's spawn settings and the
// td_guard_tiered tag. From then on it is an ordinary vanilla spawner, apart
// from the guard cap. Rewriting the spawner, rather than swapping each spawned
// mob, keeps MaxNearbyEntities working: it only counts mobs of the spawned
// class.
//
// Guards are not wave mobs: mob_aggro.js leaves their AI alone,
// loot_bag_drops.js and bounty_kills.js pay nothing for them, and ESM's
// diggingBlacklist (epicsiegemod-common.toml) stops them digging out Lootr
// containers or spawners.

var STG_GUARD_TAG = 'td_structure_guard'
var STG_TIERED_TAG = 'td_guard_tiered'
// Blocks from the pedestal. Same bands as MID_TIER_RADIUS and HIGH_TIER_RADIUS
// in structure_loot_progression.js, so guards and loot scale together.
var STG_MID_RADIUS = 210
var STG_FAR_RADIUS = 270
// A spawner places mobs within +-SpawnRange (4) blocks of itself on x/z and
// -1..+1 on y, so this box around a placeholder contains its spawner.
var STG_SCAN_H = 4
var STG_SCAN_V = 1
var STG_MAX_JOBS_PER_TICK = 3
// Skip queuing a placeholder this close (blocks, per axis) to a queued job.
var STG_DEDUPE_RADIUS = 2
var STG_QUEUE = []
var STG_AIR_IDS = ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']
// Fit check: a mob stays in the tier roll when at least STG_FIT_MIN_HITS of
// STG_FIT_SAMPLES simulated spawn positions fit it (about 1%). A spawner tries
// 2-3 positions a tick until one works, so even that spawns within seconds.
var STG_FIT_SAMPLES = 256
var STG_FIT_MIN_HITS = 3
// Guard cap per tier: a new tiered guard is dropped while this many guards
// stand within +-STG_CAP_RADIUS blocks of it, vertically too, so a multi-floor
// building counts as one area; the spawner then waits out its normal delay.
// MaxNearbyEntities alone can't do this: it only counts inside the spawner's
// +-SpawnRange box, and guards wander out of it.
var STG_CAP = { near: 6, mid: 8, far: 10 }
var STG_CAP_RADIUS = 24

var STG_NO_GEAR_DROPS = 'ArmorDropChances:[0.0f,0.0f,0.0f,0.0f],HandDropChances:[0.0f,0.0f],'

// Per tier: spawner settings (delays in ticks, ranges in blocks) and a weighted
// roster. w/h are each mob's registered hitbox width and height, for the fit
// check. extra is an SNBT fragment, ending in a comma, spliced into the entity
// compound. A spawner runs finalizeSpawn only for a bare {id:...} compound, and
// this one always carries Tags, so mod mobs miss their own spawn setup; the
// Undead Nights zombies get their health and armour here instead.
var STG_TIERS = {
  near: {
    params: 'SpawnCount:2s,MaxNearbyEntities:4s,RequiredPlayerRange:14s,SpawnRange:4s,MinSpawnDelay:300s,MaxSpawnDelay:600s',
    roster: [
      { weight: 3, id: 'minecraft:husk', w: 0.6, h: 1.95, extra: '' },
      // Zombie villagers burn in daylight (Undead Nights'
      // vanillaZombiesBurnInTheSun). A helmet stops that but loses durability
      // every sunlit tick, so this one is Unbreakable.
      { weight: 1, id: 'minecraft:zombie_villager', w: 0.6, h: 1.95, extra: 'ArmorItems:[{},{},{},{id:"minecraft:leather_helmet",Count:1b,tag:{Unbreakable:1b}}],' + STG_NO_GEAR_DROPS },
    ],
  },
  mid: {
    params: 'SpawnCount:3s,MaxNearbyEntities:5s,RequiredPlayerRange:16s,SpawnRange:4s,MinSpawnDelay:200s,MaxSpawnDelay:400s',
    roster: [
      { weight: 2, id: 'mutantszombies:mutant_zombie', w: 0.6, h: 1.95, extra: '' },
      { weight: 1, id: 'mutantszombies:blister_zombie', w: 0.9, h: 2.3, extra: '' },
      { weight: 1, id: 'mutantszombies:split_head_zombie', w: 0.9, h: 2.5, extra: '' },
    ],
  },
  far: {
    params: 'SpawnCount:3s,MaxNearbyEntities:6s,RequiredPlayerRange:16s,SpawnRange:4s,MinSpawnDelay:150s,MaxSpawnDelay:300s',
    roster: [
      { weight: 1, id: 'undeadnights:elite_zombie', w: 0.6, h: 1.95, extra: 'Attributes:[{Name:"minecraft:generic.max_health",Base:40.0d}],Health:40.0f,ArmorItems:[{},{},{id:"minecraft:iron_chestplate",Count:1b},{id:"minecraft:iron_helmet",Count:1b}],' + STG_NO_GEAR_DROPS },
      { weight: 2, id: 'undeadnights:horde_zombie', w: 0.6, h: 1.95, extra: 'Attributes:[{Name:"minecraft:generic.max_health",Base:30.0d}],Health:30.0f,ArmorItems:[{},{},{},{id:"minecraft:iron_helmet",Count:1b}],' + STG_NO_GEAR_DROPS },
      { weight: 1, id: 'mutantszombies:rotten_mutant', w: 0.9, h: 2.7, extra: '' },
      { weight: 1, id: 'mutantszombies:crawler', w: 0.95, h: 0.75, extra: '' },
    ],
  },
}
// The placeholder husk plus every mob in STG_TIERS, for the typed spawn
// handlers below. A tiered type missing here escapes the guard cap.
var STG_GUARD_IDS = ['minecraft:husk', 'minecraft:zombie_villager', 'mutantszombies:mutant_zombie', 'mutantszombies:blister_zombie', 'mutantszombies:split_head_zombie', 'undeadnights:elite_zombie', 'undeadnights:horde_zombie', 'mutantszombies:rotten_mutant', 'mutantszombies:crawler']

function stgPickWeighted(roster) {
  var total = 0
  for (var i = 0; i < roster.length; i++) total += roster[i].weight
  var roll = Math.random() * total
  for (var j = 0; j < roster.length; j++) {
    roll -= roster[j].weight
    if (roll <= 0) return roster[j]
  }
  return roster[roster.length - 1]
}

// Tier by horizontal distance from the pedestal; 'near' until the base exists.
function stgTierAt(level, x, z) {
  var base = worldData(level)
  if (!base || !base.contains('td_pedestalX')) return 'near'
  var dx = x - base.getInt('td_pedestalX')
  var dz = z - base.getInt('td_pedestalZ')
  var dist = Math.sqrt(dx * dx + dz * dz)
  if (dist > STG_FAR_RADIUS) return 'far'
  if (dist > STG_MID_RADIUS) return 'mid'
  return 'near'
}

// Air map of every block a spawn attempt can touch, relative to the spawner:
// x/z -4..+4 (spawn centre -3.5..+4.5, plus half a 0.95-wide mob) and y
// -1..+3 (feet at -1..+1, plus a 2.7-tall mob). Anything that isn't air, even
// a torch or a cobweb, counts as blocking, which only makes the check stricter.
function stgAirMap(level, sx, sy, sz) {
  var map = {}
  for (var dx = -4; dx <= 4; dx++) {
    for (var dz = -4; dz <= 4; dz++) {
      for (var dy = -1; dy <= 3; dy++) {
        map[dx + ',' + dy + ',' + dz] = STG_AIR_IDS.indexOf(`${level.getBlock(sx + dx, sy + dy, sz + dz).getId()}`) !== -1
      }
    }
  }
  return map
}

// Samples spawn positions the way BaseSpawner picks them: centre x/z =
// spawner + (rand - rand) * SpawnRange + 0.5, feet y = spawner + {-1, 0, 1}.
// A sample fits when every block the mob's box overlaps is air. SpawnRange is
// hard-coded as 4 here and in stgAirMap; every tier's params use 4.
function stgFits(map, w, h) {
  var hits = 0
  var half = w / 2
  for (var i = 0; i < STG_FIT_SAMPLES; i++) {
    var cx = (Math.random() - Math.random()) * 4 + 0.5
    var cz = (Math.random() - Math.random()) * 4 + 0.5
    var fy = Math.floor(Math.random() * 3) - 1
    var x0 = Math.floor(cx - half), x1 = Math.floor(cx + half - 1e-7)
    var z0 = Math.floor(cz - half), z1 = Math.floor(cz + half - 1e-7)
    var y1 = fy + Math.ceil(h) - 1
    var ok = true
    for (var x = x0; x <= x1 && ok; x++) {
      for (var z = z0; z <= z1 && ok; z++) {
        for (var y = fy; y <= y1 && ok; y++) {
          if (map[x + ',' + y + ',' + z] !== true) ok = false
        }
      }
    }
    if (ok) hits++
    if (hits >= STG_FIT_MIN_HITS) return true
  }
  return false
}

// A spawner whose mob can never be placed retries every tick and never spawns
// anything, so the roll only offers mobs that fit around this spawner.
function stgRosterThatFits(level, tier, sx, sy, sz) {
  var roster = STG_TIERS[tier].roster
  var map = stgAirMap(level, sx, sy, sz)
  var fits = []
  for (var i = 0; i < roster.length; i++) {
    if (stgFits(map, roster[i].w, roster[i].h)) fits.push(roster[i])
  }
  if (fits.length > 0) return fits
  // Nothing passed (a cramped spot). The placeholder husk just spawned here,
  // so husk-sized entries fit at least sometimes; offer those rather than
  // anything bigger.
  for (var j = 0; j < roster.length; j++) {
    if (roster[j].w <= 0.6 && roster[j].h <= 1.95) fits.push(roster[j])
  }
  return fits.length > 0 ? fits : roster
}

// One mob per spawner: SpawnData plus a one-entry SpawnPotentials. With
// custom_spawn_rules present the spawner skips the mob's own spawn rules
// (darkness, and Undead Nights' natural-spawn gate); only the light limits,
// which default to 0-15, and the collision checks remain. A malformed rules
// entry is dropped silently and the mob's own rules apply again, so keep the
// literal {}. Delay:20s brings the first tiered spawn a second after the
// rewrite. BaseSpawner.load reads the delay and SpawnCount keys only when
// MinSpawnDelay is present, and the range keys only when MaxNearbyEntities is,
// so every tier's params must spell out all of them.
function stgSpawnerSnbt(tier, mob) {
  var entity = '{id:"' + mob.id + '",' + mob.extra + 'Tags:["' + STG_GUARD_TAG + '","' + STG_TIERED_TAG + '"]}'
  var data = '{entity:' + entity + ',custom_spawn_rules:{}}'
  return '{Delay:20s,' + STG_TIERS[tier].params + ',SpawnData:' + data + ',SpawnPotentials:[{weight:1,data:' + data + '}]}'
}

// Rewrites every untiered guard spawner in the scan box around (cx, cy, cz).
// Idempotent: a later job for the same spawner finds it already tiered.
function stgRetierAround(level, cx, cy, cz) {
  for (var dx = -STG_SCAN_H; dx <= STG_SCAN_H; dx++) {
    for (var dz = -STG_SCAN_H; dz <= STG_SCAN_H; dz++) {
      for (var dy = -STG_SCAN_V; dy <= STG_SCAN_V; dy++) {
        var block = level.getBlock(cx + dx, cy + dy, cz + dz)
        if (`${block.getId()}` !== 'minecraft:spawner') continue
        var data = block.getEntityData()
        if (!data) continue
        var spawnData = '' + data.get('SpawnData')
        if (spawnData.indexOf(STG_GUARD_TAG) === -1 || spawnData.indexOf(STG_TIERED_TAG) !== -1) continue

        var tier = stgTierAt(level, cx + dx, cz + dz)
        var mob = stgPickWeighted(stgRosterThatFits(level, tier, cx + dx, cy + dy, cz + dz))
        var tag = NBT.toTagCompound(stgSpawnerSnbt(tier, mob))
        if (!tag) {
          console.warn(`[structure_guard_tiers] SNBT parse failed for ${mob.id} (${tier})`)
          continue
        }
        block.mergeEntityData(tag)
        var be = block.getEntity()
        if (be) be.setChanged() // mergeEntityData doesn't mark it for saving
        var check = '' + block.getEntityData().get('SpawnData')
        if (check.indexOf(STG_TIERED_TAG) === -1) {
          console.warn(`[structure_guard_tiers] rewrite did not stick at ${cx + dx} ${cy + dy} ${cz + dz}`)
        }
      }
    }
  }
}

function stgAlreadyQueued(dim, x, y, z) {
  for (var i = 0; i < STG_QUEUE.length; i++) {
    var job = STG_QUEUE[i]
    if (job.dim === dim && Math.abs(job.x - x) <= STG_DEDUPE_RADIUS && Math.abs(job.y - y) <= STG_DEDUPE_RADIUS && Math.abs(job.z - z) <= STG_DEDUPE_RADIUS) return true
  }
  return false
}

function stgGuardsNear(level, x, y, z) {
  var r = STG_CAP_RADIUS
  var near = level.getEntitiesWithin(AABB.of(x - r, y - r, z - r, x + r, y + r, z + r))
  var count = 0
  near.forEach((e) => {
    if (e.getTags().contains(STG_GUARD_TAG)) count++
  })
  return count
}

// Registered for each guard mob type; wave mobs of those types return at the
// tag check. EntityEvents.spawned also fires for entities loading from disk,
// so saved guards go through the same checks when their chunk reloads.
function stgOnGuardSpawn(event) {
  var entity = event.getEntity()
  var tags = entity.getTags()
  if (!tags.contains(STG_GUARD_TAG)) return
  var level = event.getLevel()
  var x = Math.floor(entity.getX())
  var y = Math.floor(entity.getY())
  var z = Math.floor(entity.getZ())

  if (!tags.contains(STG_TIERED_TAG)) {
    // Untiered guard: drop it and queue its spawner for a rewrite on the next
    // tick. Rewriting inside this event would lose the new Delay, because the
    // spawner counts a cancelled spawn as a success and calls delay() after it.
    var dim = `${level.dimension}` // a property here; dimension() throws
    if (!stgAlreadyQueued(dim, x, y, z)) STG_QUEUE.push({ level: level, dim: dim, x: x, y: y, z: z })
    // cancel() throws to end the handler, so it comes last, and the cap check
    // below never runs for a placeholder.
    event.cancel()
  }

  if (stgGuardsNear(level, x, y, z) >= STG_CAP[stgTierAt(level, x, z)]) event.cancel()
}

STG_GUARD_IDS.forEach((id) => {
  EntityEvents.spawned(id, stgOnGuardSpawn)
})

// Drains queued rewrites. Jobs come from spawners that just fired near a
// player, so their chunks are loaded; a job that throws anyway is dropped, and
// the spawner's next placeholder queues it again.
ServerEvents.tick((event) => {
  if (STG_QUEUE.length === 0) return
  var done = 0
  while (STG_QUEUE.length > 0 && done < STG_MAX_JOBS_PER_TICK) {
    var job = STG_QUEUE.shift()
    done++
    try {
      stgRetierAround(job.level, job.x, job.y, job.z)
    } catch (err) {
      console.warn(`[structure_guard_tiers] retier failed near ${job.x} ${job.y} ${job.z}: ${err}`)
    }
  }
})
