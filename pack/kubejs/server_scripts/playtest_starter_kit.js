// Starter base and starter kit.
//
// On a fresh world, LevelEvents.loaded picks the base site (findBaseSite)
// and pins the world spawn there before vanilla prepares the spawn area.
// ServerEvents.loaded then builds the compound before anyone can join:
// levelled field, walls, command post, pedestal, power rig, starter traps,
// wall-top platforms and a ring of ruins. The pedestal marker entity it
// creates holds the world's shared state (worldData() in world_state.js).
//
// The login handler builds the base as a last resort if the load-time build
// failed, claims the starter fences, syncs the player's Waves Cleared score,
// sweeps starter gear the wave-5 removal missed and gives each player the
// starter kit once.

// The starter sword and armour carry td_starter_gear:1b (plus a Lore line)
// so the wave-5 removal (wave_status.js) and sweepLateStarterGear take
// exactly these items, never gear the player found or crafted.
function starterGearNbt(extra) {
  const lore = '\'{"text":"Looted from a fallen soul who came before you...","italic":true,"color":"gray"}\''
  const extraPart = extra ? extra + ',' : ''
  return `{${extraPart}td_starter_gear:1b,display:{Lore:[${lore}]}}`
}

// Gear for a player's first login. withGear is false once the wave-5
// removal has run (td_starterGearRemoved on the marker): a player joining
// after that gets nothing.
function giveStarterKit(player, withGear) {
  if (withGear) {
    player.give(Item.of('minecraft:netherite_sword', 1, starterGearNbt('Enchantments:[{id:"minecraft:sharpness",lvl:100}]')))
    player.give(Item.of('minecraft:iron_helmet', 1, starterGearNbt()))
    player.give(Item.of('minecraft:iron_chestplate', 1, starterGearNbt()))
    player.give(Item.of('minecraft:iron_leggings', 1, starterGearNbt()))
    player.give(Item.of('minecraft:iron_boots', 1, starterGearNbt()))
  }
}

// Login-side half of the wave-5 gear removal: wave_status.js's /clear @a
// reaches only players online at the time, so the login handler calls
// this on every login once the marker has td_starterGearRemoved. /clear
// takes only player targets, hence `execute as <uuid> ... @s`; it returns
// the item count, so the message shows only when something was taken.
var STARTER_KIT_GEAR_ITEMS = [
  'minecraft:netherite_sword',
  'minecraft:iron_helmet',
  'minecraft:iron_chestplate',
  'minecraft:iron_leggings',
  'minecraft:iron_boots',
]

// Also called by wave_status.js for every overworld player every
// STARTER_GEAR_SWEEP_TICKS once td_starterGearRemoved is set, for starter
// gear recovered later from a corpse or a chest.
function sweepLateStarterGear(player) {
  var server = player.getServer()
  var removed = 0
  STARTER_KIT_GEAR_ITEMS.forEach(function (id) {
    removed += Number(server.runCommandSilent(`execute as ${player.uuid} run clear @s ${id}{td_starter_gear:1b}`)) || 0
  })
  if (removed > 0) player.tell('§8§o[The blade and armor crumble to rust and dust in your hands.]')
}

// Base-site biomes; keep in sync with the kubejs:wasteland biome tag. A
// plain list because Holder<Biome>#is(String) in this KubeJS build matches
// only a literal biome id, not a #tag.
const BARE_WASTELAND_BIOMES = ['minecraft:desert', 'minecraft:badlands']

// level.getBiome samples the biome source directly: no chunk generation,
// cheap even far from anything loaded. .key().location() gives the plain
// 'minecraft:desert' form.
function biomeIdAt(level, x, z) {
  return `${level.getBiome([x, 64, z]).key().location()}`
}

// Reflection helpers. starter_flux_network.js and
// electric_trap_player_safety.js call these too: top-level functions are
// shared across server_scripts files, so keep the names and signatures.
//
// First public method of cls with this parameter count, return type and
// parameter types; a null type matches anything.
function findMethodByShape(cls, paramCount, retTypeName, paramTypeNames) {
  var all = cls.getMethods()
  for (var i = 0; i < all.length; i++) {
    var m = all[i]
    var params = m.getParameterTypes()
    if (params.length !== paramCount) continue
    if (retTypeName && `${m.getReturnType().getName()}` !== retTypeName) continue
    var ok = true
    if (paramTypeNames) {
      for (var j = 0; j < paramTypeNames.length; j++) {
        if (paramTypeNames[j] && `${params[j].getName()}` !== paramTypeNames[j]) ok = false
      }
    }
    if (ok) return m
  }
  return null
}

// Class.forName without the java.* global, which is disabled here: any
// bound Java object's getClass().getClass() is java.lang.Class, whose
// static forName(String) is found by shape.
function resolveClass(anyObj, className) {
  var classOfClass = anyObj.getClass().getClass()
  var forNameMethod = findMethodByShape(classOfClass, 1, 'java.lang.Class', ['java.lang.String'])
  return forNameMethod.invoke(null, [className])
}

// Like findMethodByShape, but also matches the name, for classes with
// several methods of one shape: java.lang.Integer has three static
// (String) -> Integer methods (valueOf, decode, getInteger), and the order
// of getMethods() is unspecified.
function findMethodByNameAndShape(cls, name, paramCount, retTypeName, paramTypeNames) {
  var all = cls.getMethods()
  for (var i = 0; i < all.length; i++) {
    var m = all[i]
    if (m.getName() !== name) continue
    var params = m.getParameterTypes()
    if (params.length !== paramCount) continue
    if (retTypeName && `${m.getReturnType().getName()}` !== retTypeName) continue
    var ok = true
    if (paramTypeNames) {
      for (var j = 0; j < paramTypeNames.length; j++) {
        if (paramTypeNames[j] && `${params[j].getName()}` !== paramTypeNames[j]) ok = false
      }
    }
    if (ok) return m
  }
  return null
}

// java.lang.Integer / Boolean built through valueOf(String), so reflective
// invoke() calls get the exact boxed type an int or boolean parameter
// needs, whatever number type Rhino would otherwise pass.
function boxInt(anyObj, n) {
  var intCls = resolveClass(anyObj, 'java.lang.Integer')
  var valueOf = findMethodByNameAndShape(intCls, 'valueOf', 1, 'java.lang.Integer', ['java.lang.String'])
  return valueOf.invoke(null, [`${n}`])
}
function boxBool(anyObj, b) {
  var boolCls = resolveClass(anyObj, 'java.lang.Boolean')
  var valueOf = findMethodByNameAndShape(boolCls, 'valueOf', 1, 'java.lang.Boolean', ['java.lang.String'])
  return valueOf.invoke(null, [`${b}`])
}

// ---------------------------------------------------------------------
// Base-site selection (docs/FEATURES.md, "Anchor-grid base placement").
//
// The base sits on an anchor chunk of kubejs:base_anchor, a structure set
// pinned to chunks (64i, 64j). Every structure set that can generate here,
// towns aside, has an exclusion_zone against base_anchor. Exclusion zones
// are pure grid math over the other set's placements
// (ChunkGeneratorStructureState#hasStructureChunkInRange), so every anchor
// gets a structure-free hole. findBaseSite tests only anchor points and
// re-checks the holes with that same call. (findNearestMapStructure is no
// substitute: it generates chunks for every candidate and can stall the
// server for most of a minute.)
//
// LevelEvents.loaded fires in MinecraftServer#createLevels before
// vanilla's setInitialSpawn. Setting the spawn there and marking the level
// initialized makes vanilla skip its own spawn search, so its spawn-area
// pass generates the base's surroundings and the first player lands in
// the yard. The build runs in ServerEvents.loaded, before anyone joins.
// ---------------------------------------------------------------------

// Must match data/kubejs/worldgen/structure_set/base_anchor.json. Its
// separation is spacing - 1, which pins the random offset to 0, so anchor
// chunks are exactly (64i, 64j).
var BASE_ANCHOR_SET_ID = 'kubejs:base_anchor'
var BASE_ANCHOR_SPACING_CHUNKS = 64
// Clearance radius in chunks. Must match the smallest base_anchor
// exclusion_zone in the structure_set overrides (9: villages, pillager
// outposts, ruined portals, way signs; ruins_pool uses 11, mineshafts 13).
var STRUCTURE_CLEAR_CHUNKS = 9
// Anchor rings searched around the origin: 20 rings = 41x41 points, out to
// 20480 blocks. Wasteland anchors are rare and about half hold a town, so
// the range is wide; it costs only biome lookups, well under a second.
var BASE_SEARCH_MAX_RINGS = 20
// Distance in blocks of the four extra biome samples (one per cardinal
// direction), so the view around the base reads as wasteland too.
var BASE_BIOME_SAMPLE_OFFSET = 96
// Skipped by the clearance check: base_anchor itself; mineshafts, which
// exclude base_anchor at 13 chunks, wider than this check; strongholds,
// whose concentric-rings placement isn't cheap to test (the pack's
// override leaves that set empty).
var STRUCTURE_CHECK_SKIP_SETS = [BASE_ANCHOR_SET_ID, 'minecraft:mineshafts', 'minecraft:strongholds']
// Towns sit on the anchor lattice: kubejs:towns uses base_anchor's 64/63
// spread at frequency 0.5, so a town can only start on an anchor chunk,
// and findBaseSite never picks a town anchor. The set uses legacy_type_2
// frequency reduction on purpose: the default reducer gives neighbouring
// anchors along z near-identical rolls (stripes of towns), and
// legacy_type_3 shares its first draw with the pick of which town, so only
// the first two towns would appear. The clearance check tests this set
// separately (townAt) instead of as a blocker.
var TOWN_SET_ID = 'kubejs:towns'

// Returns { blockersAt, townAt }, or null (logged) if reflection fails;
// the JSON exclusion zones still hold without it.
// - blockersAt(chunkX, chunkZ): sets with a placement chunk within
//   STRUCTURE_CLEAR_CHUNKS. At an anchor, any hit is a set missing its
//   base_anchor exclusion_zone.
// - townAt(chunkX, chunkZ): the town set's isStructureChunk at exactly
//   that chunk (radius 0), i.e. vanilla will try to start a town there.
// Sets come from ChunkGeneratorStructureState#possibleStructureSets
// (m_255252_), the list createStructures iterates, already filtered to
// sets that can generate in this world's biomes.
function buildStructureClearanceCheck(level) {
  try {
    var chunkSource = level.getChunkSource()
    var getGeneratorState = findMethodByNameAndShape(chunkSource.getClass(), 'm_255415_', 0, 'net.minecraft.world.level.chunk.ChunkGeneratorStructureState', null)
    var state = getGeneratorState.invoke(chunkSource, [])
    var possibleSetsMethod = findMethodByNameAndShape(state.getClass(), 'm_255252_', 0, 'java.util.List', null)
    var hasInRange = findMethodByNameAndShape(state.getClass(), 'm_254936_', 4, 'boolean', ['net.minecraft.core.Holder', 'int', 'int', 'int'])
    var holderRefCls = resolveClass(level, 'net.minecraft.core.Holder$Reference')
    var keyMethod = findMethodByNameAndShape(holderRefCls, 'm_205785_', 0, 'net.minecraft.resources.ResourceKey', null)
    var rkCls = resolveClass(level, 'net.minecraft.resources.ResourceKey')
    var locationMethod = findMethodByNameAndShape(rkCls, 'm_135782_', 0, 'net.minecraft.resources.ResourceLocation', null)
    if (!getGeneratorState || !possibleSetsMethod || !hasInRange || !keyMethod || !locationMethod) {
      throw new Error('one of the reflected methods resolved to null')
    }

    // The List is a java.util.ImmutableCollections$ListN, whose methods Rhino
    // can't call directly (IllegalAccessException: the class isn't exported
    // by java.base), so size() and get() are reflected off java.util.List.
    var sets = possibleSetsMethod.invoke(state, [])
    var listCls = resolveClass(level, 'java.util.List')
    var listSize = findMethodByNameAndShape(listCls, 'size', 0, 'int', null)
    var listGet = findMethodByNameAndShape(listCls, 'get', 1, 'java.lang.Object', ['int'])
    var setCount = parseInt(`${listSize.invoke(sets, [])}`, 10)
    var checked = []
    var townHolder = null
    for (var i = 0; i < setCount; i++) {
      var holder = listGet.invoke(sets, [boxInt(level, i)])
      var id = `${locationMethod.invoke(keyMethod.invoke(holder, []), [])}`
      if (id === TOWN_SET_ID) {
        townHolder = holder
        continue
      }
      if (STRUCTURE_CHECK_SKIP_SETS.includes(id)) continue
      checked.push({ id: id, holder: holder })
    }
    var radius = boxInt(level, STRUCTURE_CLEAR_CHUNKS)
    var sameChunk = boxInt(level, 0)
    console.log(`playtest_starter_kit.js: structure clearance check ready - ${checked.length} structure sets can generate in this world's biomes, town lattice ${townHolder ? 'active' : 'absent (no town can generate)'}`)

    return {
      blockersAt: function (chunkX, chunkZ) {
        var cx = boxInt(level, chunkX)
        var cz = boxInt(level, chunkZ)
        var blockers = []
        for (var i = 0; i < checked.length; i++) {
          if (`${hasInRange.invoke(state, [checked[i].holder, cx, cz, radius])}` === 'true') blockers.push(checked[i].id)
        }
        return blockers
      },
      townAt: function (chunkX, chunkZ) {
        if (!townHolder) return false
        return `${hasInRange.invoke(state, [townHolder, boxInt(level, chunkX), boxInt(level, chunkZ), sameChunk])}` === 'true'
      }
    }
  } catch (e) {
    console.log(`playtest_starter_kit.js: structure clearance check unavailable (${e}) - site search will trust the JSON exclusion floor alone`)
    return null
  }
}

function isWastelandAt(level, x, z) {
  return BARE_WASTELAND_BIOMES.includes(biomeIdAt(level, x, z))
}

// Picks the anchor chunk for the base: anchor points only, nearest to the
// origin first, never one holding a town. Score: centre in desert/badlands
// (required) 10, all four BASE_BIOME_SAMPLE_OFFSET samples wasteland +10,
// no structure set in the clearance box +5. The first perfect score wins,
// otherwise the best seen.
function findBaseSite(level) {
  var startedAt = Date.now()
  var clearance = buildStructureClearanceCheck(level)
  var structureBlockersAt = clearance ? clearance.blockersAt : null
  var townAt = clearance ? clearance.townAt : null
  if (!townAt) {
    console.error(`playtest_starter_kit.js: town lattice check unavailable - the base could land on a ${TOWN_SET_ID} anchor this world`)
  }
  var points = []
  for (var i = -BASE_SEARCH_MAX_RINGS; i <= BASE_SEARCH_MAX_RINGS; i++) {
    for (var j = -BASE_SEARCH_MAX_RINGS; j <= BASE_SEARCH_MAX_RINGS; j++) points.push([i, j])
  }
  points.sort(function (a, b) { return (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1]) })

  var best = null
  var biomeHits = 0
  var townSkips = 0
  for (var p = 0; p < points.length; p++) {
    var chunkX = points[p][0] * BASE_ANCHOR_SPACING_CHUNKS
    var chunkZ = points[p][1] * BASE_ANCHOR_SPACING_CHUNKS
    var x = chunkX * 16 + 8
    var z = chunkZ * 16 + 8
    if (!isWastelandAt(level, x, z)) continue
    if (townAt && townAt(chunkX, chunkZ)) {
      townSkips++
      continue
    }
    biomeHits++
    var o = BASE_BIOME_SAMPLE_OFFSET
    var surroundingsOk = isWastelandAt(level, x + o, z) && isWastelandAt(level, x - o, z) && isWastelandAt(level, x, z + o) && isWastelandAt(level, x, z - o)
    var blockers = structureBlockersAt ? structureBlockersAt(chunkX, chunkZ) : []
    var score = 10 + (surroundingsOk ? 10 : 0) + (blockers.length === 0 ? 5 : 0)
    var candidate = { x: x, z: z, chunkX: chunkX, chunkZ: chunkZ, score: score, surroundingsOk: surroundingsOk, blockers: blockers, biome: biomeIdAt(level, x, z) }
    if (!best || score > best.score) best = candidate
    if (score === 25) break
  }

  var elapsed = Date.now() - startedAt
  if (!best) {
    // No town-free wasteland anchor in range (rare): fall back to the
    // town-free anchor nearest the origin, which still has the
    // structure-free hole, just not the biome.
    var fallbackX = 0
    var fallbackZ = 0
    for (var q = 0; q < points.length; q++) {
      var fx = points[q][0] * BASE_ANCHOR_SPACING_CHUNKS
      var fz = points[q][1] * BASE_ANCHOR_SPACING_CHUNKS
      if (townAt && townAt(fx, fz)) continue
      fallbackX = fx
      fallbackZ = fz
      break
    }
    console.error(`playtest_starter_kit.js: no town-free desert/badlands anchor point within ${BASE_SEARCH_MAX_RINGS} rings of origin (${points.length} points, ${townSkips} wasteland anchors skipped for holding a town, ${elapsed}ms) - falling back to the nearest town-free anchor [chunk ${fallbackX},${fallbackZ}], biome will be off-theme this world`)
    return { x: fallbackX * 16 + 8, z: fallbackZ * 16 + 8, chunkX: fallbackX, chunkZ: fallbackZ, score: 0, surroundingsOk: false, blockers: structureBlockersAt ? structureBlockersAt(fallbackX, fallbackZ) : [], biome: biomeIdAt(level, fallbackX * 16 + 8, fallbackZ * 16 + 8) }
  }
  console.log(`playtest_starter_kit.js: base site chosen at (${best.x}, ${best.z}) [anchor chunk ${best.chunkX},${best.chunkZ}] biome=${best.biome} surroundings=${best.surroundingsOk ? 'wasteland' : 'MIXED'} score=${best.score} (${biomeHits} wasteland anchor points seen, ${townSkips} skipped for holding a town, ${elapsed}ms)`)
  if (best.blockers.length) {
    console.error(`playtest_starter_kit.js: structure sets still reporting a placement chunk within ${STRUCTURE_CLEAR_CHUNKS} chunks of the chosen anchor - these are missing the base_anchor exclusion_zone: ${best.blockers.join(', ')}`)
  }
  return best
}

// Surface height, loading (and if needed generating) the chunk first:
// Level#getHeight returns the minimum build height for an unloaded chunk.
// Reading a block loads it the way vanilla's setInitialSpawn does, so this
// is safe during world load.
function surfaceHeightAt(level, x, z) {
  level.getBlock(x, 64, z).getId()
  return level.getHeight('MOTION_BLOCKING', x, z)
}

// Loads every chunk overlapping the block box, the same way. /fill, /setblock
// and /place reject a position in an unloaded chunk, and the first-login
// fallback can build far from the chunks vanilla keeps loaded around the
// spawn. A chunk loaded this way stays loaded for the rest of the tick.
function starterLoadChunks(level, x0, z0, x1, z1) {
  for (var cx = Math.floor(x0 / 16); cx <= Math.floor(x1 / 16); cx++) {
    for (var cz = Math.floor(z0 / 16); cz <= Math.floor(z1 / 16); cz++) {
      level.getBlock(cx * 16, 64, cz * 16).getId()
    }
  }
}

// Starting border width in blocks, centred on the spawn, and the levelled
// field's half-width (a few blocks past the border). At this size
// wave_spawner.js clamps its 48-64 block spawn band to the border, so early
// waves spawn closer, always outside the compound (td_compoundX0/X1/Z0/Z1).
const BORDER_START = 50
const BASE_FIELD_HALF = BORDER_START / 2 + 4

// /fill rejects boxes over 32768 blocks, so split along the longest axis
// (Y first on a tie, so a flat slab splits into whole layers) until every
// piece fits.
function starterFillBoxChunked(run, x0, y0, z0, x1, y1, z1, block) {
  const FILL_COMMAND_MAX_BLOCKS = 32768
  const sx = x1 - x0 + 1
  const sy = y1 - y0 + 1
  const sz = z1 - z0 + 1
  if (sx <= 0 || sy <= 0 || sz <= 0) return
  if (sx * sy * sz <= FILL_COMMAND_MAX_BLOCKS) {
    run(`fill ${x0} ${y0} ${z0} ${x1} ${y1} ${z1} ${block}`)
    return
  }
  if (sy > 1 && sy >= sx && sy >= sz) {
    const ym = y0 + Math.floor(sy / 2) - 1
    starterFillBoxChunked(run, x0, y0, z0, x1, ym, z1, block)
    starterFillBoxChunked(run, x0, ym + 1, z0, x1, y1, z1, block)
  } else if (sx >= sz) {
    const xm = x0 + Math.floor(sx / 2) - 1
    starterFillBoxChunked(run, x0, y0, z0, xm, y1, z1, block)
    starterFillBoxChunked(run, xm + 1, y0, z0, x1, y1, z1, block)
  } else {
    const zm = z0 + Math.floor(sz / 2) - 1
    starterFillBoxChunked(run, x0, y0, z0, x1, y1, zm, block)
    starterFillBoxChunked(run, x0, y0, zm + 1, x1, y1, z1, block)
  }
}

// Starter traps: a Tesla Coil and a Sentry on the gate wall, and
// electrified fence sealing the gate (and the fort's flank holes).
// wave_status.js removes them at wave 5 along with the starter gear.
//
// starterFencePositions lists the fence cells for placement, the wave-5
// removal (wave_status.js) and ownership (login handler). The fence has no
// passable variant, so the gate is fully sealed: doorX-2..doorX+2, full
// wall height. flanks is {x0, x1, centerZ} on a fort save
// (starterFenceFlanksFromData), null on older saves.
function starterFencePositions(doorX, wallY0, z1, flanks) {
  var positions = []
  var fx, fy, fz
  for (fx = doorX - 2; fx <= doorX + 2; fx++) {
    for (fy = wallY0; fy <= wallY0 + 2; fy++) positions.push([fx, fy, z1])
  }
  if (flanks) {
    for (fz = flanks.centerZ - 1; fz <= flanks.centerZ + 1; fz++) {
      for (fy = wallY0; fy <= wallY0 + 2; fy++) {
        positions.push([flanks.x0, fy, fz])
        positions.push([flanks.x1, fy, fz])
      }
    }
  }
  return positions
}

// Gate wall z for any save. Saves without td_compoundZ1 use the pre-fort
// layout's fixed gap of 7 from the pedestal. Also used by wave_status.js.
function starterGateWallZ(data) {
  return data.contains('td_compoundZ1') ? data.getInt('td_compoundZ1') : data.getInt('td_pedestalZ') + 7
}

// td_layoutVersion 2 is the three-front fort. getInt on a missing key
// returns 0, so older saves get null.
function starterFenceFlanksFromData(data) {
  if (!data || data.getInt('td_layoutVersion') < 2) return null
  return { x0: data.getInt('td_compoundX0'), x1: data.getInt('td_compoundX1'), centerZ: data.getInt('td_pedestalZ') }
}

// Places the starter traps and returns the coil, dummy and Flux Point
// positions for the marker.
function placeStarterTraps(run, x0, x1, z0, z1, doorX, wallY0, flanks) {
  // Tesla Coil on the gate wall top at doorX+5, mirroring the Sentry at
  // doorX-5. IE's coil is a two-block multiblock and /setblock places one
  // block, so the dummy half is set explicitly; facing=up stands it upright
  // with the dummy on top (horizontal facings render it lying down). The
  // coil runs only while redstone-powered and zaps a random living entity
  // within 6 blocks (the patched IE jar skips players and Sentries), so
  // tesla_coil_auto_power.js flips its lever only while a td_wave_mob is
  // near.
  const teslaCoilX = doorX + 5
  const teslaCoilY = wallY0 + 3
  const teslaCoilZ = z1
  const TESLA_FACING = 'up' // upright; the dummy half sits on top
  // Solid support under the coil, in case this wall column was breached.
  run(`setblock ${teslaCoilX} ${wallY0 + 2} ${teslaCoilZ} minecraft:stone_bricks`)
  run(`setblock ${teslaCoilX} ${teslaCoilY} ${teslaCoilZ} immersiveengineering:tesla_coil[facing=${TESLA_FACING}]`)
  const teslaCoilDummyX = teslaCoilX
  const teslaCoilDummyY = teslaCoilY + 1
  const teslaCoilDummyZ = teslaCoilZ
  run(`setblock ${teslaCoilDummyX} ${teslaCoilDummyY} ${teslaCoilDummyZ} immersiveengineering:tesla_coil[facing=${TESLA_FACING},multiblockslave=true]`)
  // Lever on the master's west face, placed once: tesla_coil_auto_power.js
  // flips its powered state.
  run(`setblock ${teslaCoilX - 1} ${teslaCoilY} ${teslaCoilZ} minecraft:lever[face=wall,facing=west,powered=false]`)
  // Flux Point beside the coil; starter_flux_network.js links it into the
  // House Grid network along with the power rig.
  const teslaFluxPointX = teslaCoilX + 1
  const teslaFluxPointY = teslaCoilY
  const teslaFluxPointZ = teslaCoilZ
  run(`setblock ${teslaFluxPointX} ${wallY0 + 2} ${teslaFluxPointZ} minecraft:stone_bricks`)
  run(`setblock ${teslaFluxPointX} ${teslaFluxPointY} ${teslaFluxPointZ} fluxnetworks:flux_point`)

  // The Sentry discards itself as soon as the block under it isn't solid,
  // so it gets its own support block.
  run(`setblock ${doorX - 5} ${wallY0 + 2} ${z1} minecraft:stone_bricks`)
  // Centre by addition: `${doorX - 5}.5` breaks for negative x ('-1021.5'
  // is the centre of block -1022). sentry_default_mode.js switches the
  // Sentry to mobs-only when it spawns; wave_status.js finds it by its tag.
  run(`summon securitycraft:sentry ${doorX - 5 + 0.5} ${wallY0 + 3} ${z1 + 0.5} {Tags:["td_starter_trap_sentry"]}`)

  starterFencePositions(doorX, wallY0, z1, flanks).forEach(([fx, fy, fz]) => {
    run(`setblock ${fx} ${fy} ${fz} securitycraft:electrified_iron_fence`)
  })

  return {
    teslaCoilX: teslaCoilX, teslaCoilY: teslaCoilY, teslaCoilZ: teslaCoilZ,
    teslaCoilDummyX: teslaCoilDummyX, teslaCoilDummyY: teslaCoilDummyY, teslaCoilDummyZ: teslaCoilDummyZ,
    teslaFluxPointX: teslaFluxPointX, teslaFluxPointY: teslaFluxPointY, teslaFluxPointZ: teslaFluxPointZ,
  }
}

// Builds the starter compound around spawn point (x, z) and records its
// layout on the marker. Normally runs with no player online, so everything
// is server- or level-based. Returns the pedestal and spawn positions and
// the marker entity.
function buildStarterBase(server, level, x, z) {
  // Standing level: the first block above ground in the MOTION_BLOCKING
  // heightmap, which ignores grass and other non-collidable plants.
  const y = surfaceHeightAt(level, x, z)

  // World spawn at the base; spawnRadius 0 turns off vanilla's random
  // scatter around it, so everyone lands in the yard.
  server.runCommandSilent(`setworldspawn ${x} ${y} ${z}`)
  server.runCommandSilent('gamerule spawnRadius 0')

  // Border centred on the spawn, BORDER_START wide; base_expansion.js grows
  // it with `worldborder add` on each wave clear.
  server.runCommandSilent(`worldborder center ${x} ${z}`)
  server.runCommandSilent(`worldborder set ${BORDER_START}`)

  // No border damage: the border marks the play area, and amulet_border.js
  // decides when players may cross it.
  server.runCommandSilent('worldborder damage amount 0')

  // Waves Cleared sidebar, once per world. wave_status.js sets the score on
  // each clear; the login handler seeds each player's row and catches it up.
  server.runCommandSilent('scoreboard objectives add td_waves_cleared dummy {"text":"Waves Cleared"}')
  server.runCommandSilent('scoreboard objectives setdisplay sidebar td_waves_cleared')

  // No natural mob spawning: waves are the only enemies.
  server.runCommandSilent('gamerule doMobSpawning false')

  const floorY = y - 1
  const wallY0 = y
  const wallY1 = y + 2
  const doorX = x

  const run = (cmd) => server.runCommandSilent(cmd)

  // Layout: the three-front fort (docs/FEATURES.md, "Three-front fort").
  // North is -z. The gate wall is 2 blocks south of the spawn point; the
  // pedestal is 9 blocks north of it and 9 from each flank wall; then come 4
  // open rows, the command post and a back margin.
  // Command post size after rotation: 9 wide (x), 8 deep (z), 10 tall.
  const BUILDING_WIDTH = 9
  const BUILDING_DEPTH = 8
  const BUILDING_HEIGHT = 10
  // Pedestal distance from the gate wall, and open rows between the
  // pedestal and the building's front face.
  const PEDESTAL_GATE_GAP = 9
  const PEDESTAL_BUILDING_GAP = 4
  // Rows inside the gate kept free of free-standing placements (the
  // Sentry's and coil's field of fire); only the gate platform's
  // wall-hugging props sit there. Checked once at build, below.
  const KILL_ZONE_DEPTH = 6
  // Puts x0/x1 at x-9/x+9, so both flank walls are 9 blocks from the
  // pedestal, like the gate.
  const SIDE_MARGIN = 5
  const BACK_MARGIN = 2
  // The gate wall sits this far south of the spawn point, so players spawn
  // inside the yard rather than in the wall.
  const GATE_OFFSET = 2

  const z1 = z + GATE_OFFSET
  // The pedestal, on the gate's x, PEDESTAL_GATE_GAP blocks in. The rest of
  // the layout hangs off it; other scripts read it as td_pedestalX/Y/Z.
  const centerX = doorX
  const centerZ = z1 - PEDESTAL_GATE_GAP
  const buildingX0 = x - Math.floor(BUILDING_WIDTH / 2)
  const buildingX1 = buildingX0 + BUILDING_WIDTH - 1
  const buildingZ1 = centerZ - PEDESTAL_BUILDING_GAP - 1
  const buildingZ0 = buildingZ1 - BUILDING_DEPTH + 1

  const x0 = buildingX0 - SIDE_MARGIN
  const x1 = buildingX1 + SIDE_MARGIN
  const z0 = buildingZ0 - BACK_MARGIN
  // Border fit (BORDER_START 50, half-width 25, centred on the spawn):
  // z0 = z-21 is 4 blocks inside the north edge; x0/x1 = x-9/x+9. Recheck
  // if BUILDING_DEPTH or either gap grows.
  if (centerZ > z1 - KILL_ZONE_DEPTH - 1 || buildingZ1 + 1 > z1 - KILL_ZONE_DEPTH - 1) {
    console.error('playtest_starter_kit.js: layout constants put the pedestal or the command post inside the gate kill zone - recheck PEDESTAL_GATE_GAP / PEDESTAL_BUILDING_GAP / KILL_ZONE_DEPTH')
  }

  // Level a (2*BASE_FIELD_HALF+1)^2 square around the spawn to one plane at
  // floorY: air for 16 blocks above, the biome's ground blocks from 8 below.
  // No replace filter, so water, lava and feature blocks go too. Runs before
  // any of the compound exists.
  const fieldX0 = x - BASE_FIELD_HALF
  const fieldX1 = x + BASE_FIELD_HALF
  const fieldZ0 = z - BASE_FIELD_HALF
  const fieldZ1 = z + BASE_FIELD_HALF
  const FIELD_CLEAR_ABOVE = 16
  const FIELD_FILL_BELOW = 8
  const siteBiome = biomeIdAt(level, x, z)
  const fieldBlocks = siteBiome === 'minecraft:badlands'
    ? { top: 'minecraft:red_sand', topDepth: 2, sub: 'minecraft:terracotta' }
    : siteBiome === 'minecraft:desert'
      ? { top: 'minecraft:sand', topDepth: 3, sub: 'minecraft:sandstone' }
      : { top: 'minecraft:grass_block', topDepth: 1, sub: 'minecraft:dirt' }
  // Everything the build places lies inside the field.
  starterLoadChunks(level, fieldX0, fieldZ0, fieldX1, fieldZ1)
  starterFillBoxChunked(run, fieldX0, floorY + 1, fieldZ0, fieldX1, floorY + FIELD_CLEAR_ABOVE, fieldZ1, 'minecraft:air')
  starterFillBoxChunked(run, fieldX0, floorY - FIELD_FILL_BELOW, fieldZ0, fieldX1, floorY - fieldBlocks.topDepth, fieldZ1, fieldBlocks.sub)
  starterFillBoxChunked(run, fieldX0, floorY - fieldBlocks.topDepth + 1, fieldZ0, fieldX1, floorY, fieldZ1, fieldBlocks.top)
  console.log(`playtest_starter_kit.js: flat field levelled to Y ${floorY} across (${fieldX0},${fieldZ0})-(${fieldX1},${fieldZ1}) in ${siteBiome} ground blocks`)

  // Safety net after the field pass: sample the surface at the footprint's
  // corners, edge midpoints and centre.
  const flatnessSamplePoints = [
    [x0, z0], [x1, z0], [x0, z1], [x1, z1],
    [Math.floor((x0 + x1) / 2), z0], [Math.floor((x0 + x1) / 2), z1],
    [x0, Math.floor((z0 + z1) / 2)], [x1, Math.floor((z0 + z1) / 2)],
    [Math.floor((x0 + x1) / 2), Math.floor((z0 + z1) / 2)],
  ]
  let maxTerrainDeviation = 0
  flatnessSamplePoints.forEach(([sx, sz]) => {
    const sampleY = surfaceHeightAt(level, sx, sz)
    maxTerrainDeviation = Math.max(maxTerrainDeviation, Math.abs(sampleY - wallY0))
  })
  // More than one block of variation would show as walls clipping into a
  // rise or floating over a dip, so level the footprint again.
  if (maxTerrainDeviation > 1) {
    console.log(`playtest_starter_kit.js: terrain variance ${maxTerrainDeviation} blocks across the base footprint, leveling before build`)
    run(`fill ${x0} ${floorY + 1} ${z0} ${x1} ${floorY + 16} ${z1} minecraft:air`)
    run(`fill ${x0} ${floorY - 6} ${z0} ${x1} ${floorY - 1} ${z1} minecraft:stone`)
  }

  // Strip plants and tree blocks around the compound, 16 blocks below to 16
  // above floorY. The box lies inside the levelled field, so only what the
  // field pass left below its fill remains to find.
  const VEGETATION_CLEAR_MARGIN = 8
  const VEGETATION_BLOCKS = [
    'minecraft:grass', 'minecraft:fern', 'minecraft:large_fern',
    'minecraft:tall_grass', 'minecraft:dead_bush', 'minecraft:dandelion',
    'minecraft:poppy', 'minecraft:allium', 'minecraft:azure_bluet',
    'minecraft:red_tulip', 'minecraft:orange_tulip', 'minecraft:white_tulip',
    'minecraft:pink_tulip', 'minecraft:oxeye_daisy', 'minecraft:cornflower',
    'minecraft:lily_of_the_valley', 'minecraft:sunflower',
    'minecraft:acacia_log', 'minecraft:acacia_wood', 'minecraft:acacia_leaves',
    'minecraft:oak_log', 'minecraft:oak_wood', 'minecraft:oak_leaves',
    'minecraft:vine',
  ]
  const vx0 = x0 - VEGETATION_CLEAR_MARGIN
  const vx1 = x1 + VEGETATION_CLEAR_MARGIN
  const vz0 = z0 - VEGETATION_CLEAR_MARGIN
  const vz1 = z1 + VEGETATION_CLEAR_MARGIN

  // 16-high slices keep each /fill under the 32768-block limit.
  const VEGETATION_Y_LOW = floorY - 16
  const VEGETATION_Y_HIGH = floorY + 16
  const VEGETATION_Y_CHUNK = 16
  VEGETATION_BLOCKS.forEach((block) => {
    for (var yStart = VEGETATION_Y_LOW; yStart <= VEGETATION_Y_HIGH; yStart += VEGETATION_Y_CHUNK) {
      var yEnd = Math.min(yStart + VEGETATION_Y_CHUNK - 1, VEGETATION_Y_HIGH)
      run(`fill ${vx0} ${yStart} ${vz0} ${vx1} ${yEnd} ${vz1} minecraft:air replace ${block}`)
    }
  })

  // Compound floor: stone bricks across the walled footprint.
  run(`fill ${x0} ${floorY} ${z0} ${x1} ${floorY} ${z1} minecraft:stone_bricks`)

  // Perimeter walls, 1 thick and 3 tall: old cracked/mossy masonry with
  // SecurityCraft reinforced patches, densest at the gate. The plain vanilla
  // stone is the deliberately weak part. Placed by command, so the
  // reinforced blocks have no owner.
  const WALL_MOSSY_CHANCE = 0.12
  const WALL_CRACKED_CHANCE = 0.05

  function reinforcedVariant() {
    const roll = Math.random()
    if (roll < WALL_CRACKED_CHANCE) return 'securitycraft:reinforced_cracked_stone_bricks'
    if (roll < WALL_CRACKED_CHANCE + WALL_MOSSY_CHANCE) return 'securitycraft:reinforced_mossy_cobblestone'
    return 'securitycraft:reinforced_cobblestone'
  }

  // The reinforced chance falls with distance from the gate (doorX, z1):
  // 0.85 at the gate down to a floor of 0.08 from about 13 blocks out. The
  // rest is old masonry.
  function perimeterWallBlock(wx, wz) {
    const distFromGate = Math.sqrt((wx - doorX) * (wx - doorX) + (wz - z1) * (wz - z1))
    const reinforceChance = Math.max(0.08, 0.85 - distFromGate * 0.06)
    if (Math.random() < reinforceChance) return reinforcedVariant()
    return Math.random() < 0.5 ? 'minecraft:cracked_stone_bricks' : 'minecraft:mossy_cobblestone'
  }

  // Weak section: 3 blocks of the west wall at the back (north-west)
  // corner, only 2 tall and plain cobblestone.
  const WEAK_WALL_Z0 = z0
  const WEAK_WALL_Z1 = z0 + 2

  // Random full-height breaches on all four walls, with rubble at the outer
  // foot, kept clear of the corners (BREACH_CORNER_BUFFER), the weak
  // section, the gate platform and the flank posts (see below). They are
  // open from wave 1: the starter fence covers only the gate and the fixed
  // flank holes.
  const BREACH_MIN_WIDTH = 2
  const BREACH_MAX_WIDTH = 3
  const BREACH_CORNER_BUFFER = 3
  const BREACHES_PER_WALL = 3
  const BREACH_RUBBLE_BLOCKS = ['minecraft:gravel', 'minecraft:cobblestone', 'minecraft:mossy_cobblestone']

  function breachRangesOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart <= bEnd && aEnd >= bStart
  }

  // Up to BREACHES_PER_WALL non-overlapping [start, end] ranges along
  // [coordMin, coordMax], clear of the corners and of excludeRanges.
  // Attempts are bounded, so a short or crowded wall can get fewer.
  function pickBreachRanges(coordMin, coordMax, excludeRanges) {
    const picked = []
    const usableMin = coordMin + BREACH_CORNER_BUFFER
    const usableMax = coordMax - BREACH_CORNER_BUFFER
    if (usableMax - usableMin < BREACH_MIN_WIDTH) return picked
    for (var attempt = 0; attempt < BREACHES_PER_WALL * 10 && picked.length < BREACHES_PER_WALL; attempt++) {
      var width = BREACH_MIN_WIDTH + Math.floor(Math.random() * (BREACH_MAX_WIDTH - BREACH_MIN_WIDTH + 1))
      var start = usableMin + Math.floor(Math.random() * Math.max(1, usableMax - usableMin - width + 1))
      var end = start + width - 1
      var blocked = excludeRanges.concat(picked).some((r) => breachRangesOverlap(start, end, r[0], r[1]))
      if (!blocked) picked.push([start, end])
    }
    return picked
  }

  function inAnyBreachRange(coord, ranges) {
    return ranges.some((r) => coord >= r[0] && coord <= r[1])
  }

  // Fort layout: a fixed 3-wide collapsed section in each flank wall, level
  // with the pedestal, added to the breach lists so the wall loops, rubble
  // and stake walls treat it as a breach. Random breaches avoid it and the
  // flank post and ladder (centerZ+2..+5), so the post stands on solid wall,
  // and on the gate wall they avoid the whole gate platform (doorX+-7).
  const FLANK_BREACH_Z0 = centerZ - 1
  const FLANK_BREACH_Z1 = centerZ + 1
  const FLANK_RESERVED_Z0 = centerZ - 2
  const FLANK_RESERVED_Z1 = centerZ + 5
  const GATE_PLATFORM_REACH = 7
  const z0WallBreaches = pickBreachRanges(x0, x1, [])
  const z1WallBreaches = pickBreachRanges(x0, x1, [[doorX - GATE_PLATFORM_REACH, doorX + GATE_PLATFORM_REACH]])
  const x0WallBreaches = pickBreachRanges(z0, z1, [[WEAK_WALL_Z0 - 1, WEAK_WALL_Z1 + 1], [FLANK_RESERVED_Z0, FLANK_RESERVED_Z1]])
  const x1WallBreaches = pickBreachRanges(z0, z1, [[FLANK_RESERVED_Z0, FLANK_RESERVED_Z1]])
  x0WallBreaches.push([FLANK_BREACH_Z0, FLANK_BREACH_Z1])
  x1WallBreaches.push([FLANK_BREACH_Z0, FLANK_BREACH_Z1])

  function randomBreachRubble() {
    return BREACH_RUBBLE_BLOCKS[Math.floor(Math.random() * BREACH_RUBBLE_BLOCKS.length)]
  }

  for (var wx = x0; wx <= x1; wx++) {
    var z0Breach = inAnyBreachRange(wx, z0WallBreaches)
    var z1Breach = inAnyBreachRange(wx, z1WallBreaches)
    for (var wy = wallY0; wy <= wallY1; wy++) {
      run(`setblock ${wx} ${wy} ${z0} ${z0Breach ? 'minecraft:air' : perimeterWallBlock(wx, z0)}`)
      run(`setblock ${wx} ${wy} ${z1} ${z1Breach ? 'minecraft:air' : perimeterWallBlock(wx, z1)}`)
    }
    if (z0Breach && Math.random() < 0.5) run(`setblock ${wx} ${wallY0} ${z0 - 1} ${randomBreachRubble()}`)
    if (z1Breach && Math.random() < 0.5) run(`setblock ${wx} ${wallY0} ${z1 + 1} ${randomBreachRubble()}`)
  }
  for (var wz = z0; wz <= z1; wz++) {
    var isWeakWall = wz >= WEAK_WALL_Z0 && wz <= WEAK_WALL_Z1
    var x0Breach = !isWeakWall && inAnyBreachRange(wz, x0WallBreaches)
    var x1Breach = inAnyBreachRange(wz, x1WallBreaches)
    for (var wy = wallY0; wy <= wallY1; wy++) {
      if (isWeakWall) {
        run(`setblock ${x0} ${wy} ${wz} ${wy <= wallY0 + 1 ? 'minecraft:cobblestone' : 'minecraft:air'}`)
      } else {
        run(`setblock ${x0} ${wy} ${wz} ${x0Breach ? 'minecraft:air' : perimeterWallBlock(x0, wz)}`)
      }
      run(`setblock ${x1} ${wy} ${wz} ${x1Breach ? 'minecraft:air' : perimeterWallBlock(x1, wz)}`)
    }
    if (x0Breach && Math.random() < 0.5) run(`setblock ${x0 - 1} ${wallY0} ${wz} ${randomBreachRubble()}`)
    if (x1Breach && Math.random() < 0.5) run(`setblock ${x1 + 1} ${wallY0} ${wz} ${randomBreachRubble()}`)
  }
  // Rubble at the weak section's outer foot.
  run(`setblock ${x0 - 1} ${wallY0} ${z0} minecraft:gravel`)
  run(`setblock ${x0 - 1} ${wallY0} ${z0 + 1} minecraft:cobblestone`)
  run(`setblock ${x0 - 1} ${wallY0} ${z0 + 2} minecraft:gravel`)

  // Simply Traps stake walls on the outer faces, every 3 blocks, 2 high. A
  // stake wall has no collision and damages anything touching it, so mobs
  // crowding or climbing the wall (Enhanced Hordes stacking) take chip
  // damage. Breaches, the weak section and the gate columns stay clear.
  const STAKE_WALL_SPACING = 3
  const STAKE_WALL_GATE_BUFFER = 2

  function placeStakeWall(sx, sy, sz, facing) {
    run(`setblock ${sx} ${sy} ${sz} simply_traps:stake_wall[facing=${facing}]`)
  }

  for (var wx = x0; wx <= x1; wx += STAKE_WALL_SPACING) {
    if (!inAnyBreachRange(wx, z0WallBreaches)) {
      placeStakeWall(wx, wallY0, z0 - 1, 'north')
      placeStakeWall(wx, wallY0 + 1, z0 - 1, 'north')
    }
    if (Math.abs(wx - doorX) > STAKE_WALL_GATE_BUFFER && !inAnyBreachRange(wx, z1WallBreaches)) {
      placeStakeWall(wx, wallY0, z1 + 1, 'south')
      placeStakeWall(wx, wallY0 + 1, z1 + 1, 'south')
    }
  }
  for (var wz = z0; wz <= z1; wz += STAKE_WALL_SPACING) {
    if ((wz < WEAK_WALL_Z0 || wz > WEAK_WALL_Z1) && !inAnyBreachRange(wz, x0WallBreaches)) {
      placeStakeWall(x0 - 1, wallY0, wz, 'west')
      placeStakeWall(x0 - 1, wallY0 + 1, wz, 'west')
    }
    if (!inAnyBreachRange(wz, x1WallBreaches)) {
      placeStakeWall(x1 + 1, wallY0, wz, 'east')
      placeStakeWall(x1 + 1, wallY0 + 1, wz, 'east')
    }
  }

  // Gate: a 3-wide, 3-tall opening. The starter fence seals it, with the
  // column on each side, until wave 5 (placeStarterTraps).
  for (var wx = doorX - 1; wx <= doorX + 1; wx++) {
    for (var wy = wallY0; wy <= wallY0 + 2; wy++) {
      run(`setblock ${wx} ${wy} ${z1} minecraft:air`)
    }
  }

  // The pedestal; its marker entity is created further down.
  run(`setblock ${centerX} ${wallY0} ${centerZ} supplementaries:pedestal`)

  // Command post: the_lost_city:cafe4 (9x10x9 NBT: an 8x9 building plus a
  // vine column at local x=8), placed clockwise_90 so its doorway (local
  // east wall) faces the yard. Vanilla rotates about the placement position
  // with a zero pivot: local (lx, ly, lz) -> world (pos.x - lz, pos.y + ly,
  // pos.z + lx), so the building extends toward -x and placing it at
  // (buildingX1, floorY, buildingZ0) fills buildingX0..X1 / buildingZ0..Z1.
  // cafeLocal() is that mapping. floorY because local y=0 is the foundation
  // pad, which puts the ground floor level with the yard.
  //
  // Anything inside the template's box goes down after it: the NBT stores
  // explicit air, so /place template overwrites whatever was there.
  function cafeLocal(lx, ly, lz) {
    return { x: buildingX1 - lz, y: floorY + ly, z: buildingZ0 + lx }
  }
  run(`place template the_lost_city:cafe4 ${buildingX1} ${floorY} ${buildingZ0} clockwise_90`)

  // The mod's cafe4.nbt bakes in 4 villagers, which /place template would
  // spawn; no_passive_mobs.js spares villagers and zombies target them. This
  // pack overrides data/the_lost_city/structures/cafe4.nbt with no entities.
  // Clear any spawner inside the building (cafe4 has none; a template swap
  // might).
  run(`fill ${buildingX0} ${floorY} ${buildingZ0} ${buildingX1} ${floorY + BUILDING_HEIGHT} ${buildingZ1 + 1} minecraft:air replace minecraft:spawner`)

  // Per-cell fixups as world offsets from (buildingX0, floorY, buildingZ0),
  // states already rotated. Trailing notes give NBT-local coordinates.
  // - Foundation jigsaw and sunk pre-filled chest -> reinforced stone
  //   bricks. Upstairs loot chest -> air: loot belongs outside the border,
  //   not at home. Campfire and the 3 wall banners -> air.
  // - The doorway's two boarding fences -> a dark oak door, on the
  //   pedestal's x. The other ground-floor boards stay: no second entrance.
  // - Upstairs windows: glass on the yard face, boards on the back and west
  //   walls (the NBT has them the other way round).
  // - Every board and pane -> its SecurityCraft reinforced twin with the
  //   exact connection state, which a blanket /fill would reset.
  const CAFE4_FIXUPS = [
    [0, 0, 0, 'securitycraft:reinforced_stone_bricks'], // jigsaw (0,0,8)
    [2, 0, 1, 'securitycraft:reinforced_stone_bricks'], // sunk chest (1,0,6)
    [1, 5, 6, 'minecraft:air'], // loot chest (6,5,7)
    [3, 5, 3, 'minecraft:air'], // campfire (3,5,5): no fire props in the base
    // cafe4.nbt has a hole in the ground-floor ceiling at local (5,4,6).
    // Filled with a top slab, which the replace-fills below reinforce.
    [2, 4, 5, 'minecraft:smooth_stone_slab[type=top]'],
    // Bar clear-out, so the power rig is in view: the L-shaped counter of
    // top-half birch stairs, its fence gate and an 8-slab canopy (its two
    // posts are further down the list).
    [2, 1, 1, 'minecraft:air'], // bar counter (1,1,6)
    [2, 1, 2, 'minecraft:air'], // bar counter (2,1,6)
    [3, 1, 2, 'minecraft:air'], // bar counter (2,1,5), by the battery
    [4, 1, 2, 'minecraft:air'], // bar counter (2,1,4), by the generator
    [5, 1, 2, 'minecraft:air'], // bar counter (2,1,3)
    [5, 1, 1, 'minecraft:air'], // fence gate (1,1,3)
    [2, 3, 1, 'minecraft:air'], // canopy slab
    [3, 3, 1, 'minecraft:air'], // canopy slab, over the battery
    [4, 3, 1, 'minecraft:air'], // canopy slab, over the plug
    [5, 3, 1, 'minecraft:air'], // canopy slab
    [2, 3, 2, 'minecraft:air'], // canopy slab
    [3, 3, 2, 'minecraft:air'], // canopy slab
    [4, 3, 2, 'minecraft:air'], // canopy slab
    [5, 3, 2, 'minecraft:air'], // canopy slab
    [5, 4, 8, 'minecraft:air'], // lime wall banner
    [4, 4, 8, 'minecraft:air'], // lime wall banner
    [3, 4, 8, 'minecraft:air'], // lime wall banner
    [4, 1, 7, 'minecraft:dark_oak_door[facing=south,half=lower,hinge=left]'],
    [4, 2, 7, 'minecraft:dark_oak_door[facing=south,half=upper,hinge=left]'],
    [7, 2, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [6, 2, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [2, 2, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [1, 2, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [7, 3, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [6, 3, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [2, 3, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [1, 3, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    // Upstairs back windows: boards over the NBT's glass.
    [7, 6, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [6, 6, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [5, 6, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [4, 6, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [3, 6, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [2, 6, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [1, 6, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [7, 7, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [6, 7, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [5, 7, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [4, 7, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [3, 7, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [2, 7, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [1, 7, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [8, 2, 1, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 3, 1, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 6, 1, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 6, 1, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'], // west window
    [8, 7, 1, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 7, 1, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'], // west window
    [8, 2, 2, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [5, 2, 2, 'minecraft:air'], // canopy post
    [2, 2, 2, 'minecraft:air'], // canopy post
    [8, 3, 2, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [6, 5, 2, 'securitycraft:reinforced_birch_fence[east=false,north=false,south=true,west=false]'],
    [8, 6, 2, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 6, 2, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'], // west window
    [8, 7, 2, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 7, 2, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'], // west window
    [6, 5, 3, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 6, 3, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 6, 3, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'], // west window
    [8, 7, 3, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 7, 3, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'], // west window
    [6, 5, 4, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 6, 4, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 6, 4, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'], // west window
    [8, 7, 4, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 7, 4, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'], // west window
    [8, 2, 5, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 3, 5, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [6, 5, 5, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 6, 5, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 6, 5, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'], // west window
    [8, 7, 5, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 7, 5, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'], // west window
    [1, 1, 6, 'securitycraft:reinforced_birch_fence[east=false,north=false,south=true,west=true]'],
    [8, 2, 6, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 3, 6, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [6, 5, 6, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 6, 6, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 6, 6, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'], // west window
    [8, 7, 6, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 7, 6, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'], // west window
    [7, 2, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [6, 2, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [2, 2, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [1, 2, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [7, 3, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [6, 3, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [2, 3, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [1, 3, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    // Upstairs yard-face windows: glass over the NBT's boards.
    [7, 6, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],
    [6, 6, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],
    [5, 6, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],
    [4, 6, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],
    [3, 6, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],
    [2, 6, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],
    [1, 6, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],
    [7, 7, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],
    [6, 7, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],
    [5, 7, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],
    [4, 7, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],
    [3, 7, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],
    [2, 7, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],
    [1, 7, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],
  ]
  // Empty the upstairs chest's loot table first: /setblock clears the item
  // list but keeps the LootTable key, and ChestBlock.onRemove then rolls the
  // table and spills the loot. (`data remove` won't do: ChestBlockEntity.load
  // only overwrites the loot field when the tag has one.)
  run(`data merge block ${buildingX0 + 1} ${floorY + 5} ${buildingZ0 + 6} {LootTable:"minecraft:empty"}`)
  CAFE4_FIXUPS.forEach(([dx, dy, dz, block]) => {
    run(`setblock ${buildingX0 + dx} ${floorY + dy} ${buildingZ0 + dz} ${block}`)
  })
  // Reinforce the rest with one replace-fill per block state, filtered on
  // facing/half only (other NBT properties are defaults; /fill recomputes
  // shapes and connections). The fills stop at local x=7: the x=8 row
  // outside the walls is vines and foundation blocks flush with the yard
  // floor, which would become an undiggable strip. Left vanilla: the door
  // (no reinforced twin), vines and workstations.
  ;[
    ['minecraft:cyan_terracotta', 'securitycraft:reinforced_cyan_terracotta'],
    ['minecraft:stone_bricks', 'securitycraft:reinforced_stone_bricks'],
    ['minecraft:mossy_stone_bricks', 'securitycraft:reinforced_mossy_stone_bricks'],
    ['minecraft:moss_block', 'securitycraft:reinforced_moss_block'],
    ['minecraft:andesite_slab[type=bottom]', 'securitycraft:reinforced_andesite_slab[type=bottom]'],
    ['minecraft:andesite_slab[type=double]', 'securitycraft:reinforced_andesite_slab[type=double]'],
    // Counts are cells in cafe4.nbt; facings are after rotation.
    // smooth_stone_slab's twin is reinforced_stone_slab;
    // reinforced_normal_stone_slab is plain stone.
    ['minecraft:smooth_stone_slab[type=bottom]', 'securitycraft:reinforced_stone_slab[type=bottom]'], // 35
    ['minecraft:smooth_stone_slab[type=top]', 'securitycraft:reinforced_stone_slab[type=top]'], // 37
    ['minecraft:smooth_stone_slab[type=double]', 'securitycraft:reinforced_stone_slab[type=double]'], // 23
    ['minecraft:birch_slab[type=bottom]', 'securitycraft:reinforced_birch_slab[type=bottom]'], // 5
    ['minecraft:birch_slab[type=top]', 'securitycraft:reinforced_birch_slab[type=top]'], // 3
    ['minecraft:birch_stairs[facing=south,half=top]', 'securitycraft:reinforced_birch_stairs[facing=south,half=top]'], // 4, bar counter: already air, so no match
    ['minecraft:birch_stairs[facing=west,half=top]', 'securitycraft:reinforced_birch_stairs[facing=west,half=top]'], // 1, bar counter: already air, so no match
    ['minecraft:birch_stairs[facing=north,half=bottom]', 'securitycraft:reinforced_birch_stairs[facing=north,half=bottom]'], // 1, chair
    ['minecraft:stone_brick_stairs[facing=east,half=bottom]', 'securitycraft:reinforced_stone_brick_stairs[facing=east,half=bottom]'], // 1, foundation
    ['minecraft:birch_pressure_plate', 'securitycraft:reinforced_birch_pressure_plate'], // 6, table tops
    ['minecraft:white_carpet', 'securitycraft:reinforced_white_carpet'], // 4
    ['minecraft:red_carpet', 'securitycraft:reinforced_red_carpet'], // 4
  ].forEach(([from, to]) => {
    run(`fill ${buildingX0} ${floorY} ${buildingZ0} ${buildingX1} ${floorY + BUILDING_HEIGHT - 1} ${buildingZ1} ${to} replace ${from}`)
  })

  // Interior, in local coordinates (cafeLocal):
  // - The template's crafting table (3,1,4) sits between the door and the
  //   generator; a Crafting Station replaces it at (3,1,6).
  // - Power rig on the back wall: culinary generator (1,1,4) with the Flux
  //   Plug on top (1,2,4) and basic flux storage beside it (1,1,5). Plug and
  //   generator share a face, so no cables; starter_flux_network.js links
  //   Plug and storage at first login.
  // - An empty double chest at (6,1,2)+(6,1,3) and 4 empty barrels at
  //   (6,1..2,5..6) inside the doorway, all with air above in the NBT (a
  //   chest under a solid block won't open).
  const oldCraftingTablePos = cafeLocal(3, 1, 4)
  run(`setblock ${oldCraftingTablePos.x} ${oldCraftingTablePos.y} ${oldCraftingTablePos.z} minecraft:air`)
  const craftingStationPos = cafeLocal(3, 1, 6)
  run(`setblock ${craftingStationPos.x} ${craftingStationPos.y} ${craftingStationPos.z} craftingstation:crafting_station[waterlogged=false]`)
  const bioGeneratorPos = cafeLocal(1, 1, 4)
  const fluxPlugPos = cafeLocal(1, 2, 4)
  const fluxBatteryPos = cafeLocal(1, 1, 5)
  const bioGeneratorX = bioGeneratorPos.x
  const bioGeneratorY = bioGeneratorPos.y
  const bioGeneratorZ = bioGeneratorPos.z
  const fluxPlugX = fluxPlugPos.x
  const fluxPlugY = fluxPlugPos.y
  const fluxPlugZ = fluxPlugPos.z
  const fluxBatteryX = fluxBatteryPos.x
  const fluxBatteryY = fluxBatteryPos.y
  const fluxBatteryZ = fluxBatteryPos.z
  // facing=south turns the generator's front to the room; the default
  // (north) faces the back wall.
  run(`setblock ${bioGeneratorX} ${bioGeneratorY} ${bioGeneratorZ} generatorgalore:culinary_generator[facing=south]`)
  run(`setblock ${fluxPlugX} ${fluxPlugY} ${fluxPlugZ} fluxnetworks:flux_plug`)
  run(`setblock ${fluxBatteryX} ${fluxBatteryY} ${fluxBatteryZ} fluxnetworks:basic_flux_storage`)
  // Double chest facing north, into the room. ChestBlock pairs a LEFT half
  // with its neighbour at facing.getClockWise() (east, for north), so the
  // west half is left; local z=3 lands west of z=2 after the rotation.
  const chestEastPos = cafeLocal(6, 1, 2)
  const chestWestPos = cafeLocal(6, 1, 3)
  run(`setblock ${chestWestPos.x} ${chestWestPos.y} ${chestWestPos.z} minecraft:chest[facing=north,type=left,waterlogged=false]`)
  run(`setblock ${chestEastPos.x} ${chestEastPos.y} ${chestEastPos.z} minecraft:chest[facing=north,type=right,waterlogged=false]`)
  ;[[6, 1, 5], [6, 1, 6], [6, 2, 5], [6, 2, 6]].forEach(([lx, ly, lz]) => {
    var barrelPos = cafeLocal(lx, ly, lz)
    run(`setblock ${barrelPos.x} ${barrelPos.y} ${barrelPos.z} minecraft:barrel[facing=north,open=false]`)
  })

  // Waystone outside the command post, two blocks east of the door,
  // replacing the vines at local (8,1,2)/(8,2,2). It is two blocks tall and
  // /setblock sets only one, so both halves are placed. Faces south over the
  // yard. The quest book calls it "a Waystone in the courtyard".
  const waystoneLowerPos = cafeLocal(8, 1, 2)
  const waystoneUpperPos = cafeLocal(8, 2, 2)
  run(`setblock ${waystoneLowerPos.x} ${waystoneLowerPos.y} ${waystoneLowerPos.z} waystones:waystone[facing=south,half=lower]`)
  run(`setblock ${waystoneUpperPos.x} ${waystoneUpperPos.y} ${waystoneUpperPos.z} waystones:waystone[facing=south,half=upper]`)

  // Wave Horn: right-clicking this note block starts a wave (wave_spawner.js
  // matches td_waveNoteBlockX/Y/Z). Upstairs at the yard-face window on the
  // pedestal's x, local (6,5,4), looking down the yard to the gate.
  const hornPos = cafeLocal(6, 5, 4)
  const waveNoteBlockX = hornPos.x
  const waveNoteBlockY = hornPos.y
  const waveNoteBlockZ = hornPos.z
  run(`setblock ${waveNoteBlockX} ${waveNoteBlockY} ${waveNoteBlockZ} minecraft:note_block`)

  // Starter traps, including fence on the fort's flank holes.
  const starterTraps = placeStarterTraps(run, x0, x1, z0, z1, doorX, wallY0, { x0: x0, x1: x1, centerZ: centerZ })

  // Wall-top firing platforms: the gate platform in two halves, and a post
  // on each flank wall. Each is a row of planks on the wall's inside face,
  // level with its top course (standing height wallY0+3, like the Sentry and
  // coil), plus a slab lip on the wall top, some scaffolding props and a
  // ladder. The ladders are minecraft:ladder, inside face only:
  // ladder_climb_assist.js steers wave mobs up that block, which keeps the
  // platforms contestable, and one outside would give mobs a way over.
  //
  // The gate halves are not bridged: a bridge would cut the opening to 2
  // tall, too low for the larger mutants, which would then all use the
  // flank holes. Cover slabs skip wall-top cells in use: the Sentry
  // (doorX-5), the coil's lever, coil and Flux Point (doorX+4..+6), and the
  // fence columns (doorX+-2), which turn to air at wave 5.
  const PLATFORM_FLOOR_BLOCKS = ['minecraft:spruce_planks', 'minecraft:spruce_planks', 'minecraft:oak_planks', 'minecraft:stripped_spruce_log[axis=y]']
  const PLATFORM_COVER_BLOCKS = ['minecraft:cobblestone_slab[type=bottom]', 'minecraft:mossy_cobblestone_slab[type=bottom]', 'minecraft:stone_brick_slab[type=bottom]']
  const PLATFORM_SUPPORT_CHANCE = 0.4
  function platformPick(list) {
    return list[Math.floor(Math.random() * list.length)]
  }
  // cells: [wallX, wallZ, plankX, plankZ, coverAllowed]. The ladder at
  // (ladderX, ladderZ) hangs on the wall's inside face, facing away from it.
  function placePlatform(cells, ladderX, ladderZ, ladderFacing) {
    var i, ly, cell
    for (i = 0; i < cells.length; i++) {
      cell = cells[i]
      run(`setblock ${cell[2]} ${wallY0 + 2} ${cell[3]} ${platformPick(PLATFORM_FLOOR_BLOCKS)}`)
      if (Math.random() < PLATFORM_SUPPORT_CHANCE) {
        run(`setblock ${cell[2]} ${wallY0} ${cell[3]} minecraft:scaffolding[bottom=false,distance=0,waterlogged=false]`)
        run(`setblock ${cell[2]} ${wallY0 + 1} ${cell[3]} minecraft:scaffolding[bottom=false,distance=0,waterlogged=false]`)
      }
      if (cell[4]) run(`setblock ${cell[0]} ${wallY0 + 3} ${cell[1]} ${platformPick(PLATFORM_COVER_BLOCKS)}`)
    }
    for (ly = wallY0; ly <= wallY0 + 2; ly++) {
      run(`setblock ${ladderX} ${ly} ${ladderZ} minecraft:ladder[facing=${ladderFacing}]`)
    }
  }
  var gateWestCells = []
  var gateEastCells = []
  var flankWestCells = []
  var flankEastCells = []
  var pc
  for (pc = doorX - 6; pc <= doorX - 2; pc++) gateWestCells.push([pc, z1, pc, z1 - 1, pc !== doorX - 5 && pc !== doorX - 2])
  for (pc = doorX + 2; pc <= doorX + 6; pc++) gateEastCells.push([pc, z1, pc, z1 - 1, pc === doorX + 3])
  for (pc = centerZ + 2; pc <= centerZ + 4; pc++) {
    flankWestCells.push([x0, pc, x0 + 1, pc, true])
    flankEastCells.push([x1, pc, x1 - 1, pc, true])
  }
  placePlatform(gateWestCells, doorX - 7, z1 - 1, 'north')
  placePlatform(gateEastCells, doorX + 7, z1 - 1, 'north')
  placePlatform(flankWestCells, x0 + 1, centerZ + 5, 'east')
  placePlatform(flankEastCells, x1 - 1, centerZ + 5, 'west')

  // The pedestal marker: an invisible, persistent armor stand above the
  // pedestal, tagged td_pedestal_target, never killed. Wave mobs target it
  // (mob_aggro.js) and its persistentData is the world's shared state
  // (world_state.js). Created with createEntity and the reference kept: an
  // entity added to a chunk generated this tick stays invisible to
  // level.getEntities() until the chunk map ticks, so a lookup right after
  // /summon can come back empty. /summon is only the logged fallback.
  var markerEntity = null
  try {
    markerEntity = level.createEntity('minecraft:armor_stand')
    markerEntity.setPosition(centerX + 0.5, wallY0 + 1, centerZ + 0.5)
    markerEntity.mergeNbt({ Invisible: true, NoGravity: true, Marker: true, PersistenceRequired: true, Tags: ['td_pedestal_target'] })
    markerEntity.spawn()
  } catch (e) {
    console.error(`playtest_starter_kit.js: direct marker creation failed (${e}), falling back to /summon + lookup`)
    run(`summon minecraft:armor_stand ${centerX + 0.5} ${wallY0 + 1} ${centerZ + 0.5} {Invisible:1b,NoGravity:1b,Marker:1b,PersistenceRequired:1b,Tags:["td_pedestal_target"]}`)
    markerEntity = findWorldStateEntity(level)
    if (!markerEntity) console.error('playtest_starter_kit.js: pedestal marker not queryable after /summon fallback - wave targeting/pedestal HP will not work this world, needs live investigation')
  }
  const worldD = markerEntity ? markerEntity.persistentData : null

  // Written once; most wave and pedestal scripts read td_pedestalX/Y/Z.
  // worldD is null only if the fallback above failed.
  if (worldD) {
    worldD.putInt('td_pedestalX', centerX)
    worldD.putInt('td_pedestalY', wallY0)
    worldD.putInt('td_pedestalZ', centerZ)
    // The walled compound's footprint (not the wider field). wave_spawner.js
    // keeps spawns outside it and pushes horde mobs out of it; mob_aggro.js
    // uses it when sending strays back.
    worldD.putInt('td_compoundX0', x0)
    worldD.putInt('td_compoundX1', x1)
    worldD.putInt('td_compoundZ0', z0)
    worldD.putInt('td_compoundZ1', z1)
    // Wave Horn position, read by wave_spawner.js.
    worldD.putInt('td_waveNoteBlockX', waveNoteBlockX)
    worldD.putInt('td_waveNoteBlockY', waveNoteBlockY)
    worldD.putInt('td_waveNoteBlockZ', waveNoteBlockZ)
    // 2 = three-front fort (starterFenceFlanksFromData): only this layout has
    // flank-hole fences; removing them on an older save would punch holes in
    // its solid flank walls.
    worldD.putInt('td_layoutVersion', 2)
  }

  // Power rig positions. starter_flux_network.js links the Plug and storage
  // into a Flux network at first login (createNetwork needs a Player).
  if (worldD) {
    worldD.putInt('td_bioGeneratorX', bioGeneratorX)
    worldD.putInt('td_bioGeneratorY', bioGeneratorY)
    worldD.putInt('td_bioGeneratorZ', bioGeneratorZ)
    worldD.putInt('td_fluxPlugX', fluxPlugX)
    worldD.putInt('td_fluxPlugY', fluxPlugY)
    worldD.putInt('td_fluxPlugZ', fluxPlugZ)
    worldD.putInt('td_fluxBatteryX', fluxBatteryX)
    worldD.putInt('td_fluxBatteryY', fluxBatteryY)
    worldD.putInt('td_fluxBatteryZ', fluxBatteryZ)

    // Starter trap positions: wave_status.js clears them at wave 5,
    // tesla_coil_auto_power.js powers the coil and starter_flux_network.js
    // links its Flux Point into the House Grid network.
    worldD.putInt('td_starterTeslaCoilX', starterTraps.teslaCoilX)
    worldD.putInt('td_starterTeslaCoilY', starterTraps.teslaCoilY)
    worldD.putInt('td_starterTeslaCoilZ', starterTraps.teslaCoilZ)
    worldD.putInt('td_starterTeslaCoilDummyX', starterTraps.teslaCoilDummyX)
    worldD.putInt('td_starterTeslaCoilDummyY', starterTraps.teslaCoilDummyY)
    worldD.putInt('td_starterTeslaCoilDummyZ', starterTraps.teslaCoilDummyZ)
    worldD.putInt('td_starterTeslaFluxPointX', starterTraps.teslaFluxPointX)
    worldD.putInt('td_starterTeslaFluxPointY', starterTraps.teslaFluxPointY)
    worldD.putInt('td_starterTeslaFluxPointZ', starterTraps.teslaFluxPointZ)
    // No fence keys: starterFencePositions derives the cells from the
    // pedestal, the gate wall (starterGateWallZ) and the layout version.
  }

  // Pedestal HP, full at build. Must match PEDESTAL_MAX_HEALTH in
  // pedestal_health.js.
  if (worldD) worldD.putInt('td_pedestalHealth', 300)

  // Force-load the base for the whole game (+-96 blocks, 13x13 chunks) so
  // it keeps simulating, and the pedestal stays at stake, with no player
  // nearby.
  run(`forceload add ${centerX - 96} ${centerZ - 96} ${centerX + 96} ${centerZ + 96}`)

  return { centerX: centerX, centerY: wallY0, centerZ: centerZ, spawnX: x, spawnY: y, spawnZ: z, marker: markerEntity }
}

// ---------------------------------------------------------------------
// Lifecycle hooks. pendingBaseSite is set by LevelEvents.loaded on a
// fresh world and consumed by ServerEvents.loaded; both stay in this file
// because top-level vars are not shared across server_scripts files.
// ---------------------------------------------------------------------
var pendingBaseSite = null

// PrimaryLevelData via Level#getLevelData (m_6106_). isInitialized
// (m_6535_) is false only on a never-created world, and is what
// createLevels checks before its spawn search; setInitialized(true)
// (m_5555_) makes vanilla skip that search and keep the spawn set here.
function overworldLevelData(level) {
  var getLevelData = findMethodByNameAndShape(level.getClass(), 'm_6106_', 0, 'net.minecraft.world.level.storage.LevelData', null)
  return getLevelData.invoke(level, [])
}
function isFreshWorld(level) {
  var levelData = overworldLevelData(level)
  var isInitialized = findMethodByNameAndShape(levelData.getClass(), 'm_6535_', 0, 'boolean', null)
  return `${isInitialized.invoke(levelData, [])}` !== 'true'
}
function markWorldInitialized(level) {
  var levelData = overworldLevelData(level)
  var setInitialized = findMethodByNameAndShape(levelData.getClass(), 'm_5555_', 1, 'void', ['boolean'])
  setInitialized.invoke(levelData, [boxBool(level, true)])
}

// Fires in MinecraftServer#createLevels, before vanilla's setInitialSpawn
// and spawn-area pass. On a fresh overworld: pick the site, set the world
// spawn and mark the level initialized. The build waits for
// ServerEvents.loaded, when the spawn-area chunks exist and the saved
// world border is applied (a border set here would be overwritten).
LevelEvents.loaded((event) => {
  var level = event.level
  if (`${level.dimension}` !== 'minecraft:overworld') return
  try {
    if (!isFreshWorld(level)) return
    var site = findBaseSite(level)
    var y = surfaceHeightAt(level, site.x, site.z)
    // server.runCommandSilent, not level.runCommandSilent: the level version
    // runs the command once per online player, so with nobody online it does
    // nothing.
    event.server.runCommandSilent(`setworldspawn ${site.x} ${y} ${site.z}`)
    markWorldInitialized(level)
    pendingBaseSite = site
    console.log(`playtest_starter_kit.js: fresh world - spawn pinned to the base site (${site.x}, ${y}, ${site.z}) before vanilla's spawn-area pass; base build deferred to server start`)
  } catch (e) {
    console.error(`playtest_starter_kit.js: world-load site selection failed (${e}) - vanilla will pick its own spawn; the base will be built on first login instead`)
    pendingBaseSite = null
  }
})

// Builds the base once per world (a no-op once the marker exists).
// Normally called from ServerEvents.loaded on a fresh world; the login
// handler calls it as a last-resort fallback, in which case the world
// spawn is still vanilla's and the site search runs here. level must be the
// overworld: the marker is looked up in level, while the build's console
// commands (spawn, border) always act on the overworld.
function ensureBaseBuilt(server, level, reason) {
  if (`${level.dimension}` !== 'minecraft:overworld') {
    console.error(`playtest_starter_kit.js: ensureBaseBuilt called with ${level.dimension} (${reason}) - skipped, the base only builds in the overworld`)
    return null
  }
  if (findWorldStateEntity(level)) return null
  var site = pendingBaseSite || findBaseSite(level)
  pendingBaseSite = null
  var startedAt = Date.now()
  var result = buildStarterBase(server, level, site.x, site.z)
  console.log(`playtest_starter_kit.js: starter base built at (${site.x}, ${result.spawnY}, ${site.z}) in ${Date.now() - startedAt}ms (${reason})`)
  try {
    placeStarterRuinRing(server, level, site.x, site.z)
  } catch (e) {
    console.error(`playtest_starter_kit.js: ruin ring failed (${e}) - the base is unaffected`)
  }
  // Clear dropped items around the base: levelling the field pops dead
  // bushes into sticks, and the ruin ring's /place can drop items too.
  server.runCommandSilent(`kill @e[type=minecraft:item,x=${site.x},y=${result.spawnY},z=${site.z},distance=..${RUIN_RING_MAX_DIST + 64}]`)
  return result
}

// Ruin ring: RUIN_RING_COUNT medium-sized ruins_pool structures, each used
// once, /place'd RUIN_RING_MIN_DIST to RUIN_RING_MAX_DIST blocks from a
// fresh base at evenly spread, jittered angles: past the field and the
// spawn band, inside the nearest natural ruins_pool row. Worldgen can't
// put ruins this close: ruins_pool's one exclusion zone keeps its starts
// 12+ chunks from every anchor, which the town anchors need. /place
// structure fails unless every chunk it touches is loaded
// (PlaceCommand.checkLoaded), so the chunks within 3 of each target are
// loaded first; a ruin reaching past them fails and is logged as FAILED.
// Jigsaw starts snap to the target's chunk and follow the heightmap; their
// chests, guard spawners and Lootr conversion work as in a natural start.
var RUIN_RING_COUNT = 6
var RUIN_RING_MIN_DIST = 100
var RUIN_RING_MAX_DIST = 130
var RUIN_RING_STRUCTURES = [
  'postapocalypse_structures:redhouse',
  'postapocalypse_structures:yellowhouse',
  'abandoned_urban:gas_station',
  'abandoned_urban:motel',
  'watchtower_building:abandoned_watchtower',
  'philipsruins:desert_structures',
  'u_desert:desert_ruin/house',
  'nolandostructurez:abandoned_suburban',
  'nolandostructurez:overgrown_suburban',
  'nolandostructurez:abandoned_bank',
  'abandoned_structures:house1',
  'abandoned_structures:gas_station',
]

function placeStarterRuinRing(server, level, cx, cz) {
  var TWO_PI = 6.283185307179586 // Math.PI is undefined in this Rhino
  var choices = RUIN_RING_STRUCTURES.slice()
  var offset = Math.random() * TWO_PI
  var report = []
  for (var i = 0; i < RUIN_RING_COUNT && choices.length > 0; i++) {
    var angle = offset + (i * TWO_PI) / RUIN_RING_COUNT + (Math.random() - 0.5) * 0.4
    var dist = RUIN_RING_MIN_DIST + Math.random() * (RUIN_RING_MAX_DIST - RUIN_RING_MIN_DIST)
    var x = Math.floor(cx + Math.cos(angle) * dist)
    var z = Math.floor(cz + Math.sin(angle) * dist)
    var id = choices.splice(Math.floor(Math.random() * choices.length), 1)[0]
    starterLoadChunks(level, x - 48, z - 48, x + 48, z + 48)
    var y = surfaceHeightAt(level, x, z)
    var placed = server.runCommandSilent(`place structure ${id} ${x} ${y} ${z}`)
    report.push(`${id} (${x}, ${z})${placed ? '' : ' FAILED'}`)
  }
  console.log(`playtest_starter_kit.js: ruin ring placed: ${report.join(', ')}`)
}

ServerEvents.loaded((event) => {
  if (!pendingBaseSite) return
  try {
    ensureBaseBuilt(event.server, event.server.getLevel('minecraft:overworld'), 'server start, fresh world')
  } catch (e) {
    console.error(`playtest_starter_kit.js: base build at server start failed (${e}) - will retry on first login`)
  }
})

// Login: the base-build fallback, fence ownership and the Waves Cleared
// score, then the per-player kit.
PlayerEvents.loggedIn((event) => {
  const player = event.player
  const data = player.persistentData
  const server = player.getServer()
  // The marker lives in the overworld, and a player can log in anywhere.
  const overworld = server.getLevel('minecraft:overworld')

  // The marker's existence is the world's "base built" signal. Building
  // here is the last-resort fallback for a world whose load-time build
  // failed; it also moves the player onto the new spawn.
  var existingMarker = findWorldStateEntity(overworld)
  if (!existingMarker) {
    console.error('playtest_starter_kit.js: no pedestal marker found at login - the load-time build did not happen, building the base now as a fallback')
    try {
      var built = ensureBaseBuilt(server, overworld, 'first-login fallback')
      if (built) {
        existingMarker = built.marker || findWorldStateEntity(overworld)
        server.runCommandSilent(`execute in minecraft:overworld run tp ${player.uuid} ${built.spawnX + 0.5} ${built.spawnY} ${built.spawnZ + 0.5}`)
      }
    } catch (e) {
      console.error(`playtest_starter_kit.js: fallback base build failed (${e})`)
    }
  }

  if (existingMarker) {
    var worldD = existingMarker.persistentData

    // Claim the starter fences for the first player to log in: they were
    // placed with no player around, and SecurityCraft's electrified fence
    // shocks any player who isn't its owner (electric_trap_player_safety.js
    // cancels that damage too). One attempt; on failure they stay unowned.
    if (!worldD.getBoolean('td_starterTrapsOwnerSet') && worldD.contains('td_starterTeslaCoilX')) {
      worldD.putBoolean('td_starterTrapsOwnerSet', true)
      try {
        var ownerUuid = `${player.getProfile().getId()}`
        var ownerName = `${player.getProfile().getName()}`
        var fencePositions = starterFencePositions(worldD.getInt('td_pedestalX'), worldD.getInt('td_pedestalY'), starterGateWallZ(worldD), starterFenceFlanksFromData(worldD))
        fencePositions.forEach(function (pos) {
          var fenceBE = overworld.getBlockEntity(pos)
          if (fenceBE) fenceBE.setOwner(ownerUuid, ownerName)
        })
      } catch (e) {
        console.error(`playtest_starter_kit.js: starter trap fence owner assignment failed (${e}) - the fence posts stay placed but unowned, and WILL shock the player on contact`)
      }
    }

    // Waves Cleared row: wave_status.js sets it only for players online at a
    // clear, so every login seeds it or catches it up to
    // td_q_lastClearedWave (quest_milestones.js). Raise-only, because that
    // key trails a clear by up to a second; an unset score fails the
    // `unless` test, so a new row starts at the current count.
    var clearedWaves = worldD.getInt('td_q_lastClearedWave')
    server.runCommandSilent(`execute as ${player.uuid} unless score @s td_waves_cleared matches ${clearedWaves}.. run scoreboard players set @s td_waves_cleared ${clearedWaves}`)
  }

  // Per-player setup. Once wave 5 has removed the starter gear
  // (td_starterGearRemoved), every login sweeps any this player still has
  // (offline at the time, or stashed and picked up later), and a first-time
  // player gets none.
  var kitWorldD = existingMarker ? existingMarker.persistentData : null
  var starterGearGone = !!(kitWorldD && kitWorldD.getBoolean('td_starterGearRemoved'))
  if (starterGearGone) sweepLateStarterGear(player)
  if (data.getBoolean('td_playtestKitGiven')) return
  data.putBoolean('td_playtestKitGiven', true)
  giveStarterKit(player, !starterGearGone)
})
