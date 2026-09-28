// Structure guard tiers (2026-09-28). Direct ask: "can you add more
// spawners to structures. it needs to be more difficult when looting" -
// decided in two question rounds: guard spawners at every gold-trimmed
// Lootr stash, the guard type scaling with distance from the base, day or
// night, breakable, and guards never paying out loot bags or bounties.
//
// Every guard spawner in the structure .nbt overrides is baked with the same
// PLACEHOLDER: SpawnData {entity:{id:"minecraft:husk", Tags:
// ["td_structure_guard"]}, custom_spawn_rules:{}}. The first time one fires
// near a player, this script rewrites THAT spawner to its distance tier
// (one mob type, the tier's numbers, Tags [td_structure_guard,
// td_guard_tiered]) and cancels the placeholder husk. After that the
// spawner is an ordinary vanilla spawner, apart from the guard cap below.
//
// Why rewrite the spawner instead of swapping each spawned mob: vanilla's
// MaxNearbyEntities counts `getEntitiesOfClass(<spawn entity's class>)`
// around the spawner, so a spawner that makes husks but whose husks get
// replaced by mutants would never see its cap and spawn without limit.
// One type per spawner keeps that cap exact (verified in the 47.4.10
// BaseSpawner, research 2026-09-28).
//
// Verified mechanics this relies on (decompiled from the running jars):
//   - custom_spawn_rules present -> SpawnPlacements (darkness, and Undead
//     Nights' "natural spawning OK" gate that kept the old elite/horde guards
//     from ever spawning) is skipped; only the light ranges, collision and
//     Forge's checkSpawnObstruction remain. `custom_spawn_rules:{}` is the
//     safe literal - both limits default to [0,15]. A MALFORMED rules
//     entry is silently dropped (lenient optional codec) and the spawner
//     falls back to dark-only, so don't hand-edit these into anything else.
//   - A spawner only re-rolls its next mob after a successful spawn; a mob
//     that can never be placed stalls it forever (retrying every tick). So
//     the tier roll only offers mobs that can actually be placed around THIS
//     spawner - stgFitRates() replays vanilla's own spawn-position spread
//     against each mob's real width/height. (A first version only asked "is
//     there a 3-high air cell"; the live client test found one just outside
//     a pyramid wall that no 0.9-wide mob can ever reach, and a forced rotten
//     mutant stalled there.)
//   - Extra keys in the entity compound (Tags, gear) skip finalizeSpawn, so
//     mod mobs lose their own spawn setup - Undead Nights' elite/horde
//     zombies would arrive as bare 20 HP zombies. Their health/armour is
//     baked here instead (user's call). zombie_villager burns in daylight
//     (Undead Nights' vanillaZombiesBurnInTheSun) - its helmet is
//     Unbreakable, because a normal one takes durability every sunlit tick
//     and is gone in ~5.5 s (Zombie.aiStep).
//   - EntityEvents.spawned fires for spawner spawns and cancel() is honoured;
//     BaseSpawner still counts the attempt as a success and calls delay()
//     right after, overwriting any Delay written synchronously - hence the
//     queue, drained on the next server tick. EventJS.cancel() THROWS
//     (EventExit), so everything else must happen before it.
//   - setEntityData on a spawner BE runs BaseSpawner.load(), which reads
//     MinSpawnDelay/MaxSpawnDelay/SpawnCount only when MinSpawnDelay is
//     present and MaxNearbyEntities/RequiredPlayerRange only when
//     MaxNearbyEntities is present - the rewrite always writes every key.
//
// GUARD CAP: MaxNearbyEntities only counts inside the spawner's own
// +-SpawnRange (4) box, and guards wander out of it - the live client test
// had 79 guards around the 11-spawner observatory after ~105 s. So a new
// tiered guard is cancelled when STG_CAP[tier] guards already stand within
// STG_CAP_RADIUS of it; the spawner then simply waits out its normal delay.
//
// Guards keep native (ESM) AI: mob_aggro.js skips td_structure_guard, the
// wave counters ignore them, loot_bag_drops.js and bounty_kills.js exclude
// them (no farmable bags or bounty credit), and ESM's diggingBlacklist
// (epicsiegemod-common.toml) keeps them from digging out a Lootr stash or
// their own spawner. Spawners stay breakable with a pickaxe.
//
// Rhino: top-level `var` names can collide across server_scripts (the
// bounty_kills.js HOSTILE_TYPES redeclaration crash), so everything here is
// prefixed stg/STG, and no const anywhere. `level.dimension` is read as a
// property (`${level.dimension}`, as playtest_starter_kit.js does) - calling
// it throws "not a function" in this build, which broke the first synced
// version of this file before the live test caught it.

var STG_GUARD_TAG = 'td_structure_guard'
var STG_TIERED_TAG = 'td_guard_tiered'
// Same bands as structure_loot_progression.js's MID/HIGH radii - kept as
// separate names on purpose (see the Rhino note above).
var STG_MID_RADIUS = 210
var STG_FAR_RADIUS = 270
// A spawner places mobs at x/z +-SpawnRange (4) and y -1..+1 around itself,
// so a placeholder husk pins its spawner to exactly this box.
var STG_SCAN_H = 4
var STG_SCAN_V = 1
var STG_MAX_JOBS_PER_TICK = 3
// Placeholders from one spawner cycle land within a few blocks of each
// other - one job covers them.
var STG_DEDUPE_RADIUS = 2
var STG_QUEUE = []
var STG_AIR_IDS = ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']
// Fit check: this many simulated spawn positions per mob; a mob stays in the
// roll only if at least STG_FIT_MIN_HITS of them fit (~1% - with 2-3
// attempts per tick while it keeps failing, that still spawns within seconds).
var STG_FIT_SAMPLES = 256
var STG_FIT_MIN_HITS = 3
// Guard cap per tier (guards within a +-STG_CAP_RADIUS box of a new one -
// the same reach up and down as sideways: with +-8 vertically the live test
// had guards from the observatory's upper-floor spawner drop to the ground
// floor, leave its window and let it keep refilling, 17 -> 30 in two
// minutes. A box this tall treats a multi-floor building as one area).
var STG_CAP = { near: 6, mid: 8, far: 10 }
var STG_CAP_RADIUS = 24

var STG_NO_GEAR_DROPS = 'ArmorDropChances:[0.0f,0.0f,0.0f,0.0f],HandDropChances:[0.0f,0.0f],'

// params: SpawnCount / MaxNearbyEntities / RequiredPlayerRange / SpawnRange /
// Min-MaxSpawnDelay. Near and mid reuse the two old working guards' values
// (gas_station_loot, desert_pyramid); far is the step up. w/h are the
// entity types' registered width/height (ModEntities of each mod, decompiled).
var STG_TIERS = {
  near: {
    params: 'SpawnCount:2s,MaxNearbyEntities:4s,RequiredPlayerRange:14s,SpawnRange:4s,MinSpawnDelay:300s,MaxSpawnDelay:600s',
    roster: [
      { weight: 3, id: 'minecraft:husk', w: 0.6, h: 1.95, extra: '' },
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
// Every distinct guard mob id, for the typed spawn handlers below.
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

// Air map of every block a spawn attempt of this spawner can touch: x/z
// -4..+4 (spawn centre within +-4.5 plus half a 0.95-wide mob), y -1..+3
// (feet at -1..+1 plus a 2.7-tall mob). Anything that isn't air - slab,
// cobweb, torch - counts as blocking, which only ever makes the check stricter.
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

// Replays BaseSpawner's placement for one mob size: centre x/z = spawner +
// (rand - rand) * SpawnRange + 0.5, feet y = spawner + {-1,0,1}; the mob
// fits when every block its AABB overlaps is air.
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

function stgRosterThatFits(level, tier, sx, sy, sz) {
  var roster = STG_TIERS[tier].roster
  var map = stgAirMap(level, sx, sy, sz)
  var fits = []
  for (var i = 0; i < roster.length; i++) {
    if (stgFits(map, roster[i].w, roster[i].h)) fits.push(roster[i])
  }
  if (fits.length > 0) return fits
  // Nothing passed the sample (a very cramped spot). The placeholder husk
  // just spawned here, so the husk-sized entries are placeable at least
  // sometimes - offer those rather than anything bigger.
  for (var j = 0; j < roster.length; j++) {
    if (roster[j].w <= 0.6 && roster[j].h <= 1.95) fits.push(roster[j])
  }
  return fits.length > 0 ? fits : roster
}

function stgSpawnerSnbt(tier, mob) {
  var entity = '{id:"' + mob.id + '",' + mob.extra + 'Tags:["' + STG_GUARD_TAG + '","' + STG_TIERED_TAG + '"]}'
  var data = '{entity:' + entity + ',custom_spawn_rules:{}}'
  return '{Delay:20s,' + STG_TIERS[tier].params + ',SpawnData:' + data + ',SpawnPotentials:[{weight:1,data:' + data + '}]}'
}

// Rewrites every untiered guard spawner around a cancelled placeholder.
// Idempotent: the second placeholder of the same cycle finds it tiered.
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
        if (be) be.setChanged()
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

// One handler for every guard mob type (typed registrations, so wave mobs of
// other types never reach it; wave mobs of these types return on the first
// tag check).
function stgOnGuardSpawn(event) {
  var entity = event.getEntity()
  var tags = entity.getTags()
  if (!tags.contains(STG_GUARD_TAG)) return
  var level = event.getLevel()
  var x = Math.floor(entity.getX())
  var y = Math.floor(entity.getY())
  var z = Math.floor(entity.getZ())

  if (!tags.contains(STG_TIERED_TAG)) {
    // A placeholder (or an older world's untiered guard): queue its spawner
    // for the rewrite and drop this mob.
    var dim = `${level.dimension}`
    if (!stgAlreadyQueued(dim, x, y, z)) STG_QUEUE.push({ level: level, dim: dim, x: x, y: y, z: z })
    // cancel() throws EventExit - everything above must already be done.
    event.cancel()
  }

  if (stgGuardsNear(level, x, y, z) >= STG_CAP[stgTierAt(level, x, z)]) event.cancel()
}

STG_GUARD_IDS.forEach((id) => {
  EntityEvents.spawned(id, stgOnGuardSpawn)
})

// A job is queued by a placeholder that spawned next to a player the tick
// before, so its chunks are loaded; a job that still throws (player gone,
// world closing) is dropped, and the spawner's next placeholder cycle simply
// queues it again.
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
