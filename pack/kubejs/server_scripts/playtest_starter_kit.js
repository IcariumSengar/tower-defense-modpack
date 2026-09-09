// **Rebuilt 2026-09-09 - world-load-time base placement.** The base site
// is now chosen in LevelEvents.loaded (before vanilla prepares its spawn
// area) from a fixed grid of "anchor" chunks that every structure_set in
// the pack is excluded from by a real `exclusion_zone`, and the compound
// is built in ServerEvents.loaded before any player exists. See the
// "Base-site selection" section below for the three live root causes
// (slow load, base never finishing, structures on top of the base) this
// replaced, and docs/FEATURES.md's "Anchor-grid base placement" entry.
// The older history below is kept as-is - the build itself (walls,
// house, pedestal, rig) is the same code, just no longer player-driven.
//
// Playtest convenience gear (weapon/armor) plus the real "Fixed spawn +
// prebuilt starting building" pack design (docs/IDEAS.md) — every world
// now spawns the player at the exact same fixed point (0, groundY, 0)
// with the same starter base already there, not "wherever they happened
// to first spawn" (the old playtest-only behavior). Armor isn't
// auto-equipped, just given to inventory — same as the sword/horn.
//
// Narratively reframed (2026-08-19) as gear looted from a previous,
// unfortunate occupant of the base — same "diary from a previous soul"
// device planned for the quest book (docs/IDEAS.md's Pack Aesthetic
// idea). Mechanically, the sword/armor disappear once wave 5 clears —
// see wave_status.js's removal logic, gated on the td_starter_gear NBT
// tag set here, not item type.
//
// Fixed-spawn mechanism (2026-08-20), built per docs/IDEAS.md's "How to
// actually pin this down" plan, with one deliberate substitution: that
// plan named `/place template` (a hand-authored .nbt structure file) for
// the building itself. Building/verifying a raw NBT structure file
// blind, with no way to test it in-game before committing it, is real
// unverified risk for zero benefit here — the /fill+/setblock technique
// below is the exact same wall-building code already proven working in
// actual playtests (docs/PLAYTESTING.md), just re-anchored to a fixed
// point instead of the player's arbitrary spawn position. Same outcome
// (fixed spot, prebuilt building, every world), lower-risk mechanism.
// `/setworldspawn` + `gamerule spawnRadius 0` are still used exactly as
// the design doc describes — only the structure-placement half changed.
//
// World type switched from Superflat to Single Biome: Desert on
// 2026-08-20, then **reverted back to Superflat the same day** — real
// terrain read as "wonky, doesn't suit the gameplay" per direct
// feedback after playtesting it. `kubejs/data/minecraft/dimension/
// overworld.json` now forces vanilla's own default flat generator
// (bedrock+2 dirt+grass, plains biome) automatically, same mechanism as
// the Desert override was, just pointed at a different generator - a
// fresh world needs zero manual world-type customization either way.
// This is deliberately "for now," not a closed decision - see
// docs/IDEAS.md's Seed research section if real terrain gets revisited.
//
// `/spreadplayers` (below) was added specifically to handle uneven
// Desert terrain, but works correctly on flat terrain too (finds the
// same uniform height everywhere) - left in place rather than reverted
// back to the older "read the player's own natural spawn Y" approach,
// since it's strictly more robust with no downside on Superflat.
//
// Uses event.server.runCommandSilent(...) with absolute coordinates (not
// player-relative ~) since it executes from the server console, not "as"
// the player.
//
// Uses player.getX()/getY()/getZ(), not bare .x/.y/.z — confirmed in
// wave_spawner.js's debugging that the bare-property form produces NaN
// for position in this environment. This means the starter base has
// never actually been built until now (NaN coordinates -> every /fill
// and /setblock silently failed) — the sword/horn gave fine since
// Item.of(...) doesn't depend on position.

// Starter sword/armor carry a td_starter_gear:1b marker tag (plus a
// flavor Lore line) so wave_status.js can remove exactly these items
// after wave 5, not any netherite sword/iron armor the player has since
// crafted or looted legitimately — see starterGearNbt() below. The Wave
// Horn is NOT tagged; it's the core mechanic item, not narrative gear.
function starterGearNbt(extra) {
  const lore = '\'{"text":"Looted from a fallen soul who came before you...","italic":true,"color":"gray"}\''
  const extraPart = extra ? extra + ',' : ''
  return `{${extraPart}td_starter_gear:1b,display:{Lore:[${lore}]}}`
}

// Extracted 2026-09-08 (real multiplayer fix, see world_state.js) - used
// to be inlined once in the login handler below, now needed twice: the
// very first login (which builds the whole base) and every later
// player's own first login (which must NOT rebuild the base, just give
// them their own copy of this gear - see the existingMarker branch
// below).
function giveStarterKit(player) {
  player.give(Item.of('minecraft:netherite_sword', 1, starterGearNbt('Enchantments:[{id:"minecraft:sharpness",lvl:100}]')))
  player.give(Item.of('kubejs:wave_horn', 1))
  player.give(Item.of('minecraft:iron_helmet', 1, starterGearNbt()))
  player.give(Item.of('minecraft:iron_chestplate', 1, starterGearNbt()))
  player.give(Item.of('minecraft:iron_leggings', 1, starterGearNbt()))
  player.give(Item.of('minecraft:iron_boots', 1, starterGearNbt()))
}

// Seed-independent spawn-biome search (2026-09-06) - real replacement
// for a hardcoded fixed coordinate. Root cause, traced through this
// exact bug recurring twice: every previous spawn-relocation fix
// (badlands-avoidance, plains-to-savanna) was found by censusing ONE
// specific seed and hardcoding the resulting X/Z as a literal constant
// - but this pack never pins a world seed, so a genuinely new world
// (any fresh save) gets a random one with zero reason to land that same
// coordinate in the same biome. Confirmed directly: the very next fresh
// world after the savanna relocation shipped landed right back in
// plains at that exact point, on a totally different seed. Real fix:
// search for a real matching biome at LOGIN TIME, on whatever the
// actual seed turns out to be, instead of trusting a number picked in
// advance for a different world.
//
// Same 2 biomes as data/kubejs/tags/worldgen/biome/wasteland.json, kept
// as a plain array here rather than a live tag lookup -
// `Holder<Biome>#is(String)` in this exact KubeJS build only resolves a
// literal biome id, not real tag membership (tested directly: threw on
// the '#kubejs:wasteland' form, silently returned false without the
// '#') - the tag file ships as the real documented/reusable asset, this
// array is what the runtime search actually checks against. Keep both
// in sync if this roster ever changes.
//
// Savanna/savanna_plateau dropped entirely 2026-09-06 (real follow-up
// playtest, on a genuine fresh world: "savanna is still looking far too
// green. lose this biome, stick with wasteland feel."). The earlier
// bare-first-then-leafy-fallback search only ever deprioritized savanna
// - it never stopped landing there when desert/badlands weren't close
// enough, and the vegetation-clearing pass was always local-radius-only,
// never able to fix savanna's real problem (its green grass-block ground
// color and visible horizon past the cleared radius, not just its
// foliage). Desert/badlands are now the only acceptable outcome.
// **Superseded 2026-09-09**: this search no longer runs at login or walks
// rings of arbitrary points - see findBaseSite() below (anchor grid,
// world-load time). The biome roster and biomeIdAt() helper here are
// unchanged and still what that search uses.
const BARE_WASTELAND_BIOMES = ['minecraft:desert', 'minecraft:badlands']

// `level.getBiome([x, y, z])` is a real, fast, pure lookup - confirmed
// directly in a sandbox to resolve correctly (and near-instantly, ~0.3ms
// per call) even thousands of blocks from anything ever loaded/visited,
// since biome data comes straight from the multi_noise sampling
// function, not from actually generating terrain. `.key().location()`
// gives the clean `minecraft:plains`-style id (confirmed via a real
// probe; the raw object's own `.toString()`/`.id` are either useless or
// undefined in this build).
function biomeIdAt(level, x, z) {
  return `${level.getBiome([x, 64, z]).key().location()}`
}

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

// A Class object's own getClass() is always java.lang.Class - lets this
// reach Class.forName(String) (a static method) without the disabled
// `java.*` global, for any already-bound Java object passed in. Same
// technique as mob_aggro.js's own (now aggroResolveClass).
//
// **Correction, 2026-09-04**: the note this replaced claimed redeclaring
// per-file was safe because "server_scripts don't reliably share
// top-level var/const" - true, but incomplete, and the missing half was
// a real live bug for months. Top-level FUNCTIONS in this exact KubeJS/
// Rhino build DO reliably share across files, so this file's own
// findMethodByShape/resolveClass were silently colliding with
// mob_aggro.js's identically-named (but incompatibly-shaped) versions
// in one shared global slot - whichever file loaded last won, and
// mob_aggro.js's own stripAutoRetargeting logic broke every time it
// lost that race (real "Cannot call method 'getName' of undefined"
// errors, 54 in one real session's log - see mob_aggro.js's own header
// comment for the full diagnosis). Fixed there by prefixing its copies
// (aggroFindMethodByShape etc). This file's names are left unprefixed
// since nothing else currently collides with them, but the safe rule
// going forward is: give every per-file redeclared FUNCTION a unique,
// file-specific name, not just trust re-declaration alone to isolate it.
function resolveClass(anyObj, className) {
  var classOfClass = anyObj.getClass().getClass()
  var forNameMethod = findMethodByShape(classOfClass, 1, 'java.lang.Class', ['java.lang.String'])
  return forNameMethod.invoke(null, [className])
}

// Real second ambiguity caught by the same live audit that found the
// holders() ambiguity in the old findNearestMapStructure chain (removed
// 2026-09-09, see docs/FEATURES.md): `java.lang.Integer` has THREE real 1-arg(String)
// methods returning Integer - `valueOf` (wanted), `decode` (also parses
// hex/octal prefixes, would silently misparse some inputs), and
// `getInteger` (reads a JVM SYSTEM PROPERTY named by the string - not a
// numeric parse at all, returns null for any of our real inputs). Same
// unspecified-`getMethods()`-order risk as before, so name is checked
// explicitly here too, not just shape - java.lang.Integer is a plain,
// unobfuscated core JDK class, so matching by its real clean method name
// is exactly as reliable as shape-matching, not a step down in rigor.
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
// Base-site selection, rebuilt 2026-09-09. Real root causes, all three
// diagnosed from the live instance's own logs/latest.log + two fresh
// saves (level.dat/playerdata decoded directly), not reasoned from
// source:
//
// 1. "Takes ages to load" - two separate stalls. (a) Vanilla's own
//    "Preparing spawn area" spent 23-25s generating 441 chunks around
//    ITS spawn near world origin, which this pack then never used
//    (the player got teleported thousands of blocks away moments
//    later). (b) The old `findWastelandSpawn` ring search froze the
//    server for 36-55s ("Can't keep up! Running 55240ms or 1104 ticks
//    behind") because its structure-proximity check reflected into
//    `ChunkGenerator#findNearestMapStructure`, which is NOT a pure
//    lookup: `getStructureGeneratingAt` calls
//    `level.getChunk(x, z, ChunkStatus.STRUCTURE_STARTS)` for every
//    candidate placement chunk inside its 15-chunk search radius, i.e.
//    it synchronously generated hundreds of chunks (48 region files
//    written for a 2-minute session, probes 6000+ blocks out) - and
//    then, with near-tier structure_sets at 6-chunk spacing, it could
//    never find 200 blocks of clearance anyway (best real result on
//    the last two boots: 120.9 and 160 blocks, both "best candidate"
//    fallbacks).
// 2. "Base not spawning correctly" - `findWorldStateEntity(level)`
//    returned nothing right after `/summon`ing the marker inside that
//    same blocked tick (a freshly force-generated chunk's entity
//    section isn't promoted to TRACKED until the chunk-map's own tick
//    runs, so nothing summoned into it is visible to
//    `level.getEntities()` yet), throwing `Cannot read property
//    "persistentData" from undefined` and aborting the handler before
//    the house was placed. Both fresh saves this morning show it
//    (11:11:52 and 10:48:16). A same-tick retry cannot fix that - it
//    just summons a second invisible marker.
// 3. "Structures way too close to the base" - the previous
//    `exclusion_zone` fix anchored every set against
//    `minecraft:ocean_monuments` (spacing 32). Decompiled
//    `ChunkGeneratorStructureState#hasStructureChunkInRange`
//    (m_254936_): it is pure grid math over the OTHER set's placement
//    grid - a `chunk_count` of 20/30 against a 32-chunk grid means the
//    41/61-chunk box ALWAYS contains an anchor, so every mid/far-tier
//    set stopped generating anywhere, while nothing at all protected
//    the actual base (which never sat at the anchor).
//
// The fix turns that last finding into the mechanism: ONE anchor set
// (`kubejs:base_anchor`, spacing 64 / separation 63, so its placement
// chunk is pinned to exactly chunk (64i, 64j) for every region - no
// randomness left in the offset) and an `exclusion_zone` against it on
// every structure_set that can generate in this world's biomes. That
// carves a guaranteed structure-free box of (2*12+1)=25 chunks around
// every anchor chunk, 1024 blocks apart. The base is then simply placed
// ON the nearest anchor chunk that sits in desert/badlands - the
// search only has to test grid points, using the exact same
// `hasStructureChunkInRange` call the exclusion zone itself uses (no
// chunk generation, microseconds per set) as a self-check that nothing
// slipped through the JSON pass.
//
// Timing moved too: `LevelEvents.loaded` fires from
// `MinecraftServer#createLevels` BEFORE vanilla's `setInitialSpawn`
// (verified in the Forge-patched class: `LevelEvent$Load` is posted at
// bytecode offset 226, the `isInitialized` check at 233). Picking the
// site there and setting the world spawn ourselves - then flipping the
// level's own `initialized` flag so vanilla skips its climate-based
// spawn hunt - means the 441-chunk "Preparing spawn area" pass now
// generates the BASE's surroundings (inside the structure-free hole,
// so it is cheap), the player's first placement lands directly in the
// courtyard, and there is no double spawn, no fall, and no frozen tick.
// The build itself runs in `ServerEvents.loaded`, after those chunks
// exist and before any player can join.
// ---------------------------------------------------------------------

// Must match data/kubejs/worldgen/structure_set/base_anchor.json
// (spacing) - separation is spacing-1 there, which pins the placement
// offset to 0, so anchor chunks are exactly (64i, 64j).
var BASE_ANCHOR_SET_ID = 'kubejs:base_anchor'
var BASE_ANCHOR_SPACING_CHUNKS = 64
// Must match the smallest exclusion_zone chunk_count used across the
// structure_set overrides (9; the sprawling Lost City / Abandoned Urban
// city sets use 13). 9 chunks past the anchor chunk = the nearest
// allowed placement chunk starts ~150 blocks from the base centre.
// **12 -> 9, 2026-09-09, direct playtest feedback on the first live
// world built this way** ("the structures are slightly too far
// away... but only slightly" - nearest was 254 blocks in the sandbox,
// most 600+): three chunks closer, still more than double the wave-8
// border half-width (~67), so nothing can ever generate inside the
// campaign's playable area.
var STRUCTURE_CLEAR_CHUNKS = 9
// Grid rings searched around world origin: 10 rings = 21x21 anchor
// points, 10240 blocks each way. Sized from real data, not a guess:
// the first two sandbox seeds of this code each had exactly ONE
// desert/badlands anchor point inside 6 rings (169 points), 6-7km out -
// the 2026-09-08 "cut desert back to 2 of 7" biome blend made wasteland
// genuinely rare (docs/QUEUE.md's "Desert dominance" entry measured 0%
// near origin). 441 points still cost only ~0.2s of pure biome lookups,
// and give the scoring a real chance of finding a point whose
// surroundings are wasteland too, not just its centre column. Distance
// from origin has no gameplay cost - nothing in the pack is
// origin-relative any more.
var BASE_SEARCH_MAX_RINGS = 10
// Extra biome samples this far out in each cardinal direction so the
// whole visible area around the base reads as wasteland, not just the
// one column the base sits on (the old single-point check landed bases
// on the edge of a desert with plains in view).
var BASE_BIOME_SAMPLE_OFFSET = 96
// Underground sets - irrelevant to a surface base, and strongholds'
// concentric-ring placement is the one placement type whose
// isStructureChunk is not cheap grid math.
var STRUCTURE_CHECK_SKIP_SETS = [BASE_ANCHOR_SET_ID, 'minecraft:mineshafts', 'minecraft:strongholds']

// Builds a closure: (chunkX, chunkZ) -> array of structure_set ids that
// still have a placement chunk within STRUCTURE_CLEAR_CHUNKS of that
// chunk. Expected to be empty at every anchor chunk - a non-empty
// result names a set the exclusion_zone pass missed. Uses
// `ChunkGeneratorStructureState#possibleStructureSets` (m_255252_), the
// exact list vanilla itself iterates in createStructures (already
// filtered to sets whose structures have at least one biome in this
// world's biome source), and `hasStructureChunkInRange` (m_254936_),
// the exact method the exclusion zone calls. SRG names resolved from
// this build's own mcp_config joined.tsrg + Mojang mappings, then
// cross-checked against the decompiled bytecode. Returns null (logged)
// on any reflection failure - the JSON exclusion floor still holds
// without this, the search just loses its self-check.
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

    // The returned List is a `java.util.ImmutableCollections$ListN` -
    // calling size()/get() on it directly throws a real
    // IllegalAccessException from Rhino's MemberBox (that impl class is
    // not exported by java.base), the same module-system gotcha the old
    // Stream#toList() chain hit. Reflect both off the public List
    // interface instead - confirmed live in the sandbox, 2026-09-09.
    var sets = possibleSetsMethod.invoke(state, [])
    var listCls = resolveClass(level, 'java.util.List')
    var listSize = findMethodByNameAndShape(listCls, 'size', 0, 'int', null)
    var listGet = findMethodByNameAndShape(listCls, 'get', 1, 'java.lang.Object', ['int'])
    var setCount = parseInt(`${listSize.invoke(sets, [])}`, 10)
    var checked = []
    for (var i = 0; i < setCount; i++) {
      var holder = listGet.invoke(sets, [boxInt(level, i)])
      var id = `${locationMethod.invoke(keyMethod.invoke(holder, []), [])}`
      if (STRUCTURE_CHECK_SKIP_SETS.includes(id)) continue
      checked.push({ id: id, holder: holder })
    }
    var radius = boxInt(level, STRUCTURE_CLEAR_CHUNKS)
    console.log(`playtest_starter_kit.js: structure clearance check ready - ${checked.length} structure sets can generate in this world's biomes`)

    return function (chunkX, chunkZ) {
      var cx = boxInt(level, chunkX)
      var cz = boxInt(level, chunkZ)
      var blockers = []
      for (var i = 0; i < checked.length; i++) {
        if (`${hasInRange.invoke(state, [checked[i].holder, cx, cz, radius])}` === 'true') blockers.push(checked[i].id)
      }
      return blockers
    }
  } catch (e) {
    console.log(`playtest_starter_kit.js: structure clearance check unavailable (${e}) - site search will trust the JSON exclusion floor alone`)
    return null
  }
}

function isWastelandAt(level, x, z) {
  return BARE_WASTELAND_BIOMES.includes(biomeIdAt(level, x, z))
}

// Picks the anchor chunk the base goes on. Candidates are ONLY anchor
// grid points (chunk (64i, 64j), block centre (1024i+8, 1024j+8)),
// nearest-to-origin first. Scoring: centre column in desert/badlands
// (required), the four BASE_BIOME_SAMPLE_OFFSET samples also wasteland
// (+10), no structure set reporting a placement chunk inside the
// clearance box (+5). The first perfect score wins immediately;
// otherwise the best-scoring candidate seen. Only biome-passing points
// pay for the structure check, so the whole search is a few hundred
// pure biome lookups (~0.3ms each) plus a handful of grid-math passes.
function findBaseSite(level) {
  var startedAt = Date.now()
  var structureBlockersAt = buildStructureClearanceCheck(level)
  var points = []
  for (var i = -BASE_SEARCH_MAX_RINGS; i <= BASE_SEARCH_MAX_RINGS; i++) {
    for (var j = -BASE_SEARCH_MAX_RINGS; j <= BASE_SEARCH_MAX_RINGS; j++) points.push([i, j])
  }
  points.sort(function (a, b) { return (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1]) })

  var best = null
  var biomeHits = 0
  for (var p = 0; p < points.length; p++) {
    var chunkX = points[p][0] * BASE_ANCHOR_SPACING_CHUNKS
    var chunkZ = points[p][1] * BASE_ANCHOR_SPACING_CHUNKS
    var x = chunkX * 16 + 8
    var z = chunkZ * 16 + 8
    if (!isWastelandAt(level, x, z)) continue
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
    // No desert/badlands anchor point in a 12km square. Never seen on a
    // real seed; surfaced loudly rather than silently picking a
    // non-anchor point (which would forfeit the structure-free hole).
    // The origin anchor still has the hole, it just won't be wasteland.
    console.error(`playtest_starter_kit.js: no desert/badlands anchor point within ${BASE_SEARCH_MAX_RINGS} rings of origin (${points.length} points, ${elapsed}ms) - falling back to the origin anchor, biome will be off-theme this world`)
    return { x: 8, z: 8, chunkX: 0, chunkZ: 0, score: 0, surroundingsOk: false, blockers: structureBlockersAt ? structureBlockersAt(0, 0) : [], biome: biomeIdAt(level, 8, 8) }
  }
  console.log(`playtest_starter_kit.js: base site chosen at (${best.x}, ${best.z}) [anchor chunk ${best.chunkX},${best.chunkZ}] biome=${best.biome} surroundings=${best.surroundingsOk ? 'wasteland' : 'MIXED'} score=${best.score} (${biomeHits} wasteland anchor points seen, ${elapsed}ms)`)
  if (best.blockers.length) {
    console.error(`playtest_starter_kit.js: structure sets still reporting a placement chunk within ${STRUCTURE_CLEAR_CHUNKS} chunks of the chosen anchor - these are missing the base_anchor exclusion_zone: ${best.blockers.join(', ')}`)
  }
  return best
}

// Real surface height at a column, forcing the chunk to exist first.
// `Level#getHeight` (m_6924_) is hasChunk-gated - verified in this
// build's bytecode (m_7232_ check, else m_141937_/getMinBuildHeight):
// for a chunk that isn't loaded it returns -64 WITHOUT generating
// anything. The old login-time build only ever saw real values because
// `/spreadplayers` had already loaded the landing chunk. Reading a block
// state first goes through Level#getChunk(x, z) -> FULL, load=true,
// which synchronously generates the chunk - the same path vanilla's own
// setInitialSpawn takes via PlayerRespawnLogic, so it is safe this
// early. **Real live bug this explains, 2026-09-09**: the "terrain
// variance 66 / 61 blocks across the base footprint" lines in both
// fresh-world logs this morning were flatness sample points sitting in
// not-yet-loaded chunks reading -64 against a real surface of 2 - the
// leveling pass was firing on a phantom, not on real terrain. First
// sandbox boot of this file reproduced it exactly (base recorded at
// y=-64) before this helper existed.
function surfaceHeightAt(level, x, z) {
  level.getBlock(x, 64, z).getId()
  return level.getHeight('MOTION_BLOCKING', x, z)
}

// Starting world border and the flat field around the base. BASE_FIELD_HALF
// levels a little past the border edge on every side.
//
// **150 -> 50, 2026-09-09, direct playtest feedback: "the starting world
// border is too big, move it back to 50."** 150 was chosen the same day
// specifically to contain wave_spawner.js's 48-64-block spawn band without
// clamping it down against the compound - reverting to 50 alone would have
// reopened that exact regression (spawns collapsing to ~10-20 blocks,
// landing inside/against the walls). Real fix shipped alongside this
// revert, per the direct follow-up ("just make sure enemies cant spawn too
// close to the base"): wave_spawner.js's spawn-point picker now rejects any
// candidate that lands inside the compound's own real footprint (persisted
// below as td_compoundX0/X1/Z0/Z1) instead of relying on a uniform
// distance-from-pedestal band clamped to the border. The compound's own
// footprint (pedestal to back wall is ~17-20 blocks, to the side/gate walls
// 7-9) fits inside a 50 border (half-width 25) with real room on 3 of 4
// sides - only the "straight north, away from the gate" direction is tight,
// which the rejection-sampling naturally avoids by just retrying a
// different angle rather than needing a bigger border. mob_aggro.js's own
// stray-mob correction (see that file) is the safety net for whatever this
// doesn't catch.
const BORDER_START = 50
const BASE_FIELD_HALF = BORDER_START / 2 + 4

// /fill refuses any box over 32768 blocks; split along the longest axis
// (Y first when it ties, so a wide flat slab becomes whole layers) until
// every piece fits. Prefixed name on purpose: top-level FUNCTIONS share
// one global slot across server_scripts files in this build (see
// mob_aggro.js's collision writeup), plain `fillBox` is too generic.
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

// Builds the whole starter compound at (x, z). Runs with no player in
// the world (ServerEvents.loaded on a fresh world, see the hooks at the
// bottom of this file), so everything here is server/level-based - the
// per-player pieces (starter kit, per-player data mirror) live in the
// login handler. Returns the pedestal coordinates and the marker
// entity so the caller can teleport a late-arriving player (the login
// fallback path) without re-reading anything.
function buildStarterBase(server, level, x, z) {
  // Ground truth from the real MOTION_BLOCKING heightmap at the chosen
  // column. **Real bug found and fixed 2026-09-06, direct playtest
  // report: "my entire base is floating 1 block off the ground."**
  // Used to read `Math.floor(player.getY())` right after a
  // `/spreadplayers` landing - wrong whenever the landing column had a
  // decorative, non-collidable plant (`minecraft:grass`) on top of the
  // real ground: spreadplayers' heightmap counts that plant as "the
  // surface", one block above where gravity actually settles a player,
  // and the read happened the same tick, before gravity could correct
  // it. Confirmed on the reported column: player Y read 3, real settled
  // position 2, `MOTION_BLOCKING` (which excludes non-collidable blocks
  // by design) also 2. Reading the heightmap directly is correct
  // regardless of what's growing on the tile - and now that the site is
  // chosen at world-load time (no player, no spreadplayers), it's the
  // only sensible source anyway.
  const y = surfaceHeightAt(level, x, z)

  // Pin every future respawn to this exact point (docs/IDEAS.md's
  // "Fixed spawn" plan) - spawnRadius 0 removes vanilla's default ~10
  // block first-spawn scatter, so this is the actual landing spot, not
  // just a nearby nudge target.
  server.runCommandSilent(`setworldspawn ${x} ${y} ${z}`)
  server.runCommandSilent('gamerule spawnRadius 0')

  // Center the border on the same fixed point, not wherever the player
  // happened to be standing — matches the manual setup step from
  // docs/PLAYTESTING.md, now automatic.
  server.runCommandSilent(`worldborder center ${x} ${z}`)
  // Briefly bumped to 90 for the Red Mansion (26x28), reverted back to
  // 50 the same day (2026-09-01) once the mansion itself was swapped for
  // Abandoned Brick House (12x11, see below) - the smaller building's
  // compound footprint comfortably fits the original border size again,
  // so this also restores base_expansion.js's originally-tuned wave-8
  // ending border of 166 instead of the mansion-driven ~206.
  // (Went to 58 for a few hours on 2026-09-09 for the 15-deep Red House;
  // back to 50 with the Brick House the same day - see the building
  // comment below.)
  // 50 -> BORDER_START (150) on 2026-09-09, playtest batch part 4, items
  // 1 and 4: wave mobs now spawn a fixed 48-64 blocks from the pedestal
  // (wave_spawner.js) and a mob summoned outside the border is pinned
  // there for good, so the border has to contain the whole band from
  // wave 1 (the old 50 collapsed the band to 10-20 blocks - inside the
  // compound). Exploration pacing is untouched: structures are excluded
  // for 9 chunks around the base anyway, so nothing reachable changes,
  // and base_expansion.js's growth is a relative `worldborder add`.
  server.runCommandSilent(`worldborder set ${BORDER_START}`)

  // Wave mobs deliberately spawn just beyond the border (wave_spawner.js)
  // and walk in - without this, vanilla's default border damage would
  // chip them (and the player, near the edge) for no reason this pack
  // actually wants; the border here is a containment/staging boundary,
  // not a shrinking-zone mechanic.
  server.runCommandSilent('worldborder damage amount 0')

  // Waves Cleared sidebar (real live ask, 2026-09-05: a persistently
  // visible HUD element for waves cleared, not just a one-off chat/title
  // message). Plain vanilla scoreboard sidebar - the objective and its
  // display slot are created once per world here; each player's own
  // score row is seeded at their first login (see the login handler).
  // wave_status.js sets the real value each time a wave is marked
  // cleared.
  server.runCommandSilent('scoreboard objectives add td_waves_cleared dummy {"text":"Waves Cleared"}')
  server.runCommandSilent('scoreboard objectives setdisplay sidebar td_waves_cleared')

  // Natural hostile spawning off for the whole world - waves are the only
  // source of enemies. Was issued on first login before; same
  // once-per-world semantics, now alongside the rest of the world setup.
  server.runCommandSilent('gamerule doMobSpawning false')

  const floorY = y - 1
  const wallY0 = y
  const wallY1 = y + 2
  const doorX = x

  const run = (cmd) => server.runCommandSilent(cmd)

  // Layout wraps around a real postapocalypse_structures building
  // instead of the old hand-built shell - gate sits just off the fixed
  // spawn point, courtyard runs north from there, then the building,
  // then a back margin closing out the compound. Swapped from Red
  // Mansion to Abandoned Brick House the same day (2026-09-01, direct
  // feedback: "this mansion is too big"). Same mod, same aesthetic
  // family, already installed - no new dependency. Watchtower removed
  // entirely 2026-09-03 (direct request: "it serves no purpose now that
  // we have a better starting structure" - its original 4-sided-lookout
  // reasoning assumed border-relative mob spawns, stale since spawns
  // went player-relative 2026-09-01, and it stood outside the compound's
  // own back wall regardless, never part of the defended perimeter).
  //
  // **Red House swap reverted, 2026-09-09.** Earlier the same day the
  // building was swapped to Red House on a misdiagnosis: a live report
  // that the Brick House "has gone... no longer spawns in" was read as
  // the template failing on rough terrain, but the real cause (see the
  // site-selection section above) was the pedestal-marker crash
  // aborting the handler BEFORE the house placement ever ran. Once the
  // rebuilt world-load path placed the Red House successfully, direct
  // playtest feedback was "the base is wrong... the Red House" - user's
  // pick: Abandoned Brick House back. Every Brick-House-specific fixup
  // below (crafting station, cauldron/tripwire, 5 barrels, green roof
  // patch, trapdoor bed, HOUSE_REINFORCE_BLOCKS) is restored verbatim
  // from commit 9de1941, the last version that shipped it. Real
  // dimensions, decompiled from the mod's own NBT: 12 wide x 13 tall x
  // 11 deep, DataVersion 3465.
  const BUILDING_WIDTH = 12
  const BUILDING_DEPTH = 11
  const BUILDING_HEIGHT = 13
  // 4 → 8 (2026-09-05, "the pedestal area is lacking any oomph... I
  // want this to be the heart of the base, the centre point to
  // everything"): the centered dais/step/grave-arc redesign below needs
  // real room that the old 4-row courtyard didn't have. Every other
  // measurement in this file (walls, gate, building) already derives
  // from this constant, so the whole compound just grows northward with
  // it - no other coordinate needed a manual adjustment.
  // 8 → 11 (2026-09-04, real playtest feedback batch: "push the front
  // wall out 3 blocks so the pedestal isn't right at the opening") -
  // matched by the same +3 on the pedestal's own gate-offset below, so
  // every OTHER relative gap this constant feeds (rig-to-building,
  // pedestal-to-building) stays exactly what it was - only the
  // gate-to-pedestal buffer actually grows. Checked, not assumed: a
  // naive +3 on just the pedestal offset alone (without this) would have
  // put the kinetic rig's own Z coordinate exactly on the building's
  // front wall line - caught before shipping, not live.
  const COURTYARD_DEPTH = 11
  const SIDE_MARGIN = 3
  const BACK_MARGIN = 2
  // Gate sits 2 blocks north of the player's own spawn point, not on
  // top of it - a real bug caught before ever reaching the sandbox: a
  // literal door block placed exactly at (x, y, z) would spawn the
  // player inside/on top of a solid door every single login.
  const GATE_OFFSET = 2

  const buildingX0 = x - Math.floor(BUILDING_WIDTH / 2)
  const buildingX1 = buildingX0 + BUILDING_WIDTH - 1
  const z1 = z + GATE_OFFSET
  const buildingZ1 = z1 - COURTYARD_DEPTH - 1
  const buildingZ0 = buildingZ1 - BUILDING_DEPTH + 1

  const x0 = buildingX0 - SIDE_MARGIN
  const x1 = buildingX1 + SIDE_MARGIN
  const z0 = buildingZ0 - BACK_MARGIN

  // Wide flat field (2026-09-09, direct playtest feedback: "I need the
  // immediate area around the base to be flat (a couple of worlds I've
  // started recently have big holes which messes with the defences
  // idea)"; the user chose "out to the starting border edge" and "fully
  // level to one height" from the offered options). Real terrain,
  // decoded from both reported saves' heightmaps before writing this:
  // the generator's surface is a pure Y gradient (ground at Y 1-2), but
  // carver pits 3-5 blocks deep sit 20-60 blocks out - well past the
  // footprint-only leveling pass right below (which stays, and now finds
  // nothing left to do). Levels the whole (2*BASE_FIELD_HALF+1)^2 square
  // centred on the border centre to one plane at floorY: everything
  // above cleared to air, everything from floorY-8 up to floorY rebuilt
  // solid in the site biome's own ground blocks. Plain fills, no
  // `replace` filter - that also closes water/lava pockets and removes
  // any feature junk at those heights. Split into <=32768-block pieces
  // for vanilla's per-/fill cap (25 commands at the current size). Runs
  // while the spawn-area pass still has these chunks loaded (10-chunk
  // radius around the pinned spawn covers ±79 with room to spare) and
  // before anything of the compound exists, so walls, floor and house
  // all go down on the levelled plane.
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
  starterFillBoxChunked(run, fieldX0, floorY + 1, fieldZ0, fieldX1, floorY + FIELD_CLEAR_ABOVE, fieldZ1, 'minecraft:air')
  starterFillBoxChunked(run, fieldX0, floorY - FIELD_FILL_BELOW, fieldZ0, fieldX1, floorY - fieldBlocks.topDepth, fieldZ1, fieldBlocks.sub)
  starterFillBoxChunked(run, fieldX0, floorY - fieldBlocks.topDepth + 1, fieldZ0, fieldX1, floorY, fieldZ1, fieldBlocks.top)
  console.log(`playtest_starter_kit.js: flat field levelled to Y ${floorY} across (${fieldX0},${fieldZ0})-(${fieldX1},${fieldZ1}) in ${siteBiome} ground blocks`)

  // Real terrain-flatness verification across the WHOLE footprint, not
  // an assumption (2026-09-06, same seed-independence dispatch as the
  // wasteland search above). This pack's own "World type" doc section
  // claims `final_density` is a pure Y-only gradient ("every column
  // evaluates to the exact same surface height by construction") - real
  // empirical testing has repeatedly found genuine variance (~2.5-7
  // blocks) despite that claim (the savanna-relocation terrain checks,
  // earlier wave-mob-spawn height-correction work) - this trusts what's
  // actually been measured, not the theoretical claim. Samples real
  // `MOTION_BLOCKING` height (the same heightmap wallY0/floorY above
  // already use, post the grass-plant fix) at the footprint's 4 corners
  // + 4 edge midpoints + center, not just the single spawn point.
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
  // Tolerance of 1 - a single block of unevenness is invisible once the
  // floor fill below covers it; more than that and the compound would
  // visibly clip into a rise or float over a dip somewhere across its
  // own footprint (exactly the reported bug, just at a different point
  // than the one already fixed above). Levels the whole footprint to
  // one clean Y first when it's over tolerance - clear a generous band
  // above (bumps: trees, natural rises) and fill solid below (dips:
  // gaps, low points) - same "carve first, build after" spirit as the
  // `/place template` wet-sponge clearing already proven elsewhere in
  // this pack, adapted for this file's own `/fill`-based build. The
  // real floor fill immediately below still lays the actual walkable
  // surface on top either way.
  if (maxTerrainDeviation > 1) {
    console.log(`playtest_starter_kit.js: terrain variance ${maxTerrainDeviation} blocks across the base footprint, leveling before build`)
    run(`fill ${x0} ${floorY + 1} ${z0} ${x1} ${floorY + 16} ${z1} minecraft:air`)
    run(`fill ${x0} ${floorY - 6} ${z0} ${x1} ${floorY - 1} ${z1} minecraft:stone`)
  }

  // Real vegetation-clearing pass (2026-09-06, direct feedback: "Can we
  // have less trees on spawn, its not much of a wasteland when there
  // are flowers, trees, grass everywhere!"). The desert/badlands bias
  // above (`findWastelandSpawn`) addresses the root cause, but runs
  // regardless of which of the 4 wasteland biomes actually gets picked
  // - savanna/savanna_plateau are still real, allowed fallbacks, and
  // even desert/badlands can carry occasional decoration this pack
  // hasn't specifically catalogued. Strips real vegetation by block id
  // via `/fill ... replace`, the same safe imperative technique (not a
  // worldgen registry edit) as the terrain-leveling pass just above -
  // deliberately not touching biome feature-placement JSON, which this
  // pack has a documented crash-risk history around.
  //
  // Covers a wider margin than the footprint itself (courtyard bounds
  // ± `VEGETATION_CLEAR_MARGIN`) since "near spawn" means the ground
  // the player actually sees on login, not just where walls end up.
  // Vertical range spans well below and above `floorY` (see the real
  // bug writeup just below the block list) to catch vegetation rooted
  // in genuinely uneven terrain, not just what's visible from directly
  // above the build floor. First-pass margin/height, tunable after a
  // real playtest like every other new constant here.
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

  // **Real bug found and fixed 2026-09-06, direct playtest report on
  // this exact fix: "im spawning in a Savannah and the vegetation still
  // there."** Diagnosed live, not guessed: the savanna_plateau fallback
  // itself is correct (desert/badlands were genuinely 3600+ blocks away
  // on that world's real seed, well beyond the bare-pair search
  // radius) - the real bug was this range only clearing from `floorY+1`
  // upward. On genuinely uneven plateau terrain, `floorY` itself can
  // land well above where a nearby tree is actually rooted - confirmed
  // directly on the reported world: `floorY` was 11, but real acacia
  // trunks inside this exact vegetation margin were rooted as low as Y
  // 5-8, entirely below the old range, so they were never touched.
  // Extended well below `floorY` too, not just above - matches the
  // spirit of the terrain-leveling pass above (which already reaches
  // down to `floorY-6` for solid-ground fill) but goes further since
  // clearing vegetation doesn't need to also guarantee a solid floor
  // underneath it. Split into fixed-size Y chunks to stay under
  // vanilla's real 32768-block-per-`/fill` limit - the full
  // margin+height volume here can exceed that in one call.
  const VEGETATION_Y_LOW = floorY - 16
  const VEGETATION_Y_HIGH = floorY + 16
  const VEGETATION_Y_CHUNK = 16
  VEGETATION_BLOCKS.forEach((block) => {
    for (let yStart = VEGETATION_Y_LOW; yStart <= VEGETATION_Y_HIGH; yStart += VEGETATION_Y_CHUNK) {
      const yEnd = Math.min(yStart + VEGETATION_Y_CHUNK - 1, VEGETATION_Y_HIGH)
      run(`fill ${vx0} ${yStart} ${vz0} ${vx1} ${yEnd} ${vz1} minecraft:air replace ${block}`)
    }
  })

  // No foundation dig / headroom clear needed - back on Superflat
  // (2026-08-20, reverted from Single Biome: Desert - real terrain
  // "wonky, doesn't suit the gameplay" per direct feedback), where
  // height is uniform everywhere, so a single Y works across the whole
  // footprint the same way it always did before this pack tried real
  // terrain. See docs/IDEAS.md's Seed research section for the full
  // history if real terrain gets revisited later - this is deliberately
  // "for now," not a closed decision.
  run(`fill ${x0} ${floorY} ${z0} ${x1} ${floorY} ${z1} minecraft:stone_bricks`)

  // Perimeter walls — "the last bastion, in disrepair" redesign
  // (2026-09-01, direct request, see docs/FEATURES.md's "Starting base"
  // section for the full brief). Two layers of construction: the
  // *original* build (cracked/mossy stone, everywhere, as the base
  // material) with SecurityCraft reinforced-block *patches* bolted on
  // wherever it mattered most - heaviest right around the gate,
  // thinning toward the back. Supersedes the previous flat "reinforced
  // primary, mossy/cracked scattered for a weathered look" version
  // (2026-08-29) - same three materials, deliberately uneven
  // distribution now instead of near-uniform reinforcement with
  // scattered weathering.
  //
  // Dig resistance / pillaring reasoning for the reinforced portions is
  // unchanged from the 2026-08-29 version - see docs/MODS.md's
  // SecurityCraft entry. The unreinforced cracked/mossy portions are
  // genuinely weaker (plain vanilla blocks, no ownership protection) -
  // intentional now that reinforcement is concentrated by design, not
  // just cosmetic variance.
  //
  // Gate stays a plain vanilla oak_door (unchanged reasoning - see
  // docs/MODS.md), placed via /setblock so these walls come out
  // ownerless the same way they always have.
  const WALL_MOSSY_CHANCE = 0.12
  const WALL_CRACKED_CHANCE = 0.05

  function reinforcedVariant() {
    const roll = Math.random()
    if (roll < WALL_CRACKED_CHANCE) return 'securitycraft:reinforced_cracked_stone_bricks'
    if (roll < WALL_CRACKED_CHANCE + WALL_MOSSY_CHANCE) return 'securitycraft:reinforced_mossy_cobblestone'
    return 'securitycraft:reinforced_cobblestone'
  }

  // Chance of a reinforced patch at this position, falling off with
  // distance from the gate (doorX, z1) - 0.85 right at the gate, down
  // to a floor of 0.08 by roughly 13 blocks away and beyond (the falloff
  // rate is unchanged from the original smaller footprint; the walled
  // perimeter itself just got bigger to wrap the mansion, so more of it
  // now sits past that floor distance). The remainder is the "original"
  // cracked/mossy stone, not plain cobblestone - it's old masonry, not
  // fresh material.
  function perimeterWallBlock(wx, wz) {
    const distFromGate = Math.sqrt((wx - doorX) * (wx - doorX) + (wz - z1) * (wz - z1))
    const reinforceChance = Math.max(0.08, 0.85 - distFromGate * 0.06)
    if (Math.random() < reinforceChance) return reinforcedVariant()
    return Math.random() < 0.5 ? 'minecraft:cracked_stone_bricks' : 'minecraft:mossy_cobblestone'
  }

  // Weakest point: a 3-block stretch of the west wall nearest the back
  // (NW corner, as far from the gate as this footprint allows) - two
  // blocks tall instead of three, always plain (unreinforced)
  // cobblestone regardless of the distance roll above, reading as
  // "breached and crudely rebuilt" rather than pristine. Real gameplay
  // difference too, not just visual: no SecurityCraft protection here.
  const WEAK_WALL_Z0 = z0
  const WEAK_WALL_Z1 = z0 + 2

  for (let wx = x0; wx <= x1; wx++) {
    for (let wy = wallY0; wy <= wallY1; wy++) {
      run(`setblock ${wx} ${wy} ${z0} ${perimeterWallBlock(wx, z0)}`)
      run(`setblock ${wx} ${wy} ${z1} ${perimeterWallBlock(wx, z1)}`)
    }
  }
  for (let wz = z0; wz <= z1; wz++) {
    for (let wy = wallY0; wy <= wallY1; wy++) {
      if (wz >= WEAK_WALL_Z0 && wz <= WEAK_WALL_Z1) {
        run(`setblock ${x0} ${wy} ${wz} ${wy <= wallY0 + 1 ? 'minecraft:cobblestone' : 'minecraft:air'}`)
      } else {
        run(`setblock ${x0} ${wy} ${wz} ${perimeterWallBlock(x0, wz)}`)
      }
      run(`setblock ${x1} ${wy} ${wz} ${perimeterWallBlock(x1, wz)}`)
    }
  }
  // Cobweb debris removed 2026-09-04 (direct ask, real playtest feedback
  // batch) - the gravel/rubble scatter below stays, only the cobweb line
  // along the weak section's shortened top is gone.
  run(`setblock ${x0 - 1} ${wallY0} ${z0} minecraft:gravel`)
  run(`setblock ${x0 - 1} ${wallY0} ${z0 + 1} minecraft:cobblestone`)
  run(`setblock ${x0 - 1} ${wallY0} ${z0 + 2} minecraft:gravel`)

  // WWZ counter-mechanic (2026-09-08, Phase 1) - Simply Traps' `stake_wall`
  // mounted on the outer face of the perimeter, one block outside the wall
  // shell itself (real wall material untouched) rather than crafted by the
  // player - it's part of the starting base's own defense, same as the
  // walls. Real fit confirmed by decompile before building
  // (tier1_recipes.js has the full writeup): non-solid, empty-collision
  // block that deals real contact damage regardless of its own facing
  // property, so a mob crowding/climbing the wall's outer face takes
  // sustained chip damage rather than walls doing nothing once Enhanced
  // Hordes lets mobs climb over each other. Spaced every 3 blocks along
  // each of the 4 wall runs, 2 heights (wallY0/wallY0+1, below the
  // 3-block-tall wall's own top) - enough coverage to matter without
  // hundreds of setblock calls (this only runs once, at base creation).
  // Skips the WEAK_WALL stretch (deliberately unreinforced, stays a real
  // undefended gap - see the comment above) and a small buffer either
  // side of the gate opening (doorX ± 2) so the entrance itself stays
  // clear to walk through.
  const STAKE_WALL_SPACING = 3
  const STAKE_WALL_GATE_BUFFER = 2

  function placeStakeWall(sx, sy, sz, facing) {
    run(`setblock ${sx} ${sy} ${sz} simply_traps:stake_wall[facing=${facing}]`)
  }

  for (let wx = x0; wx <= x1; wx += STAKE_WALL_SPACING) {
    // z0 run (back wall).
    placeStakeWall(wx, wallY0, z0 - 1, 'north')
    placeStakeWall(wx, wallY0 + 1, z0 - 1, 'north')
    // z1 run (gate wall) - skip near the doorX opening.
    if (Math.abs(wx - doorX) > STAKE_WALL_GATE_BUFFER) {
      placeStakeWall(wx, wallY0, z1 + 1, 'south')
      placeStakeWall(wx, wallY0 + 1, z1 + 1, 'south')
    }
  }
  for (let wz = z0; wz <= z1; wz += STAKE_WALL_SPACING) {
    // x0 run (west wall) - skip the WEAK_WALL stretch entirely, it's
    // meant to stay undefended (see the comment above).
    if (wz < WEAK_WALL_Z0 || wz > WEAK_WALL_Z1) {
      placeStakeWall(x0 - 1, wallY0, wz, 'west')
      placeStakeWall(x0 - 1, wallY0 + 1, wz, 'west')
    }
    placeStakeWall(x1 + 1, wallY0, wz, 'east')
    placeStakeWall(x1 + 1, wallY0 + 1, wz, 'east')
  }

  // Entrance changed 2026-09-04 (direct ask, real playtest feedback
  // batch): genuinely open 3-wide, 3-tall gap, no door block at all -
  // was a single 1-wide oak_door.
  for (let wx = doorX - 1; wx <= doorX + 1; wx++) {
    for (let wy = wallY0; wy <= wallY0 + 2; wy++) {
      run(`setblock ${wx} ${wy} ${z1} minecraft:air`)
    }
  }

  // Gate dressing - the visible fault line, heaviest fought-over spot
  // (docs/FEATURES.md's "Starting base"): improvised defense props
  // (Zcraft Decoration barrels/crates as cover) flanking the door.
  // Registry names confirmed from each mod's own jar before
  // writing this, blockstates checked for facing requirements - AND,
  // real gap caught by that check alone: `hesco_sandwall`/`barbed_wire_1`
  // both had real blockstate JSON *and* real lang entries, but turned
  // out to be orphaned assets with no actual registered block behind
  // them (`/setblock` rejected both as "Unknown block type" in a live
  // sandbox test) - ships `sfz_shuiniqiang` (Concrete Wall) instead,
  // confirmed real via the same live test. Lesson: a blockstate file
  // existing is NOT sufficient proof a block is placeable - `/setblock`
  // it for real before trusting an ID, same bar as everything else this
  // session.
  //
  // **Doomsday Decoration removed entirely 2026-09-04** (direct ask,
  // real playtest feedback batch) - this was its only footprint in the
  // whole pack (`doomsday_decoration:barrel`/`woodencrate`), so the mod
  // itself is now fully unused; uninstalled outright (packwiz + live
  // jar removed) rather than just dropping these two placements, per
  // the standing "keep footprint small" principle. Its lang override
  // (`pack/kubejs/assets/doomsday_decoration/lang/en_us.json`) deleted
  // with it.
  //
  // **Decorative Barbed Wire line removed entirely 2026-09-04** (direct
  // ask) - was purely cosmetic dressing here (`createaddition:
  // barbed_wire`, independent of the real craftable Tier 1 defense
  // item, which is untouched). `sfz_lantiepiweilan` (Broken Iron Fence)
  // outer posts removed with it, since they only ever framed the wire
  // line they no longer flank.
  //
  // **sfz_shuiniqiang (Concrete Wall) removed entirely 2026-09-05**
  // (direct report: Zcraft Decoration's concrete blocks were getting
  // mobs stuck pathing near them, a real bug, not a feel complaint).
  // Whole mod uninstalled - this was its only footprint in the pack,
  // same "keep footprint small" precedent as the Doomsday Decoration
  // removal above. No replacement placed here - revisit this gate-
  // dressing spot (and similar decoration mods) during a future
  // dedicated decoration/aesthetics pass, not now. Existing saves that
  // already placed these 2 blocks are cleaned up separately, see the
  // td_zcraftCleanupDone migration near the top of this function.

  // Ground-level pedestal (2026-09-06) - second real rejection of the
  // platform-based presentation in a row (square sandstone shrine ->
  // circular dark-stone altar -> now this). Direct feedback: "the raised
  // dais is just not looking great, ditch this and just have the
  // pedestal placed in the yard." No platform, no plinth, no rings -
  // don't propose a third elaborate build without being asked. Same
  // centered plan-position as the circular altar it replaces
  // (centerX = doorX, centerZ = z1-4, later widened to z1-7 - see the
  // COURTYARD_DEPTH comment above) - the grave arc and everything else
  // below stays exactly where the circular-altar rework last put it,
  // since none of it actually
  // depended on the platform's own footprint, just on staying clear of
  // it.
  // Gate-to-pedestal buffer widened 3 blocks 2026-09-04 (direct ask:
  // "push the front wall out 3 blocks so the pedestal isn't right at
  // the opening") - paired with the same +3 on COURTYARD_DEPTH above, so
  // the pedestal-to-building and rig-to-building gaps this whole layout
  // already depends on stay exactly what they were; only the
  // gate-to-pedestal distance actually grows (4 -> 7 blocks).
  const centerX = doorX
  const centerZ = z1 - 7

  run(`setblock ${centerX} ${wallY0} ${centerZ} supplementaries:pedestal`)
  // The pre-placed Waystone used to go here too (centerX+3, out in the
  // yard beside the pedestal) - moved to the house front 2026-09-09,
  // see the placement right after the building's own /place template
  // below. It has to come AFTER the template now: the structure's NBT
  // stores explicit air for every one of its 1716 cells (checked, not
  // assumed), so anything placed inside its bounding box before
  // /place template runs gets silently wiped by it.

  // No campfires or fire props anywhere in this build - direct request,
  // dropped entirely rather than reduced. The old braziers were called
  // out by name as part of what read badly ("hot garbage... campfires
  // specifically") - this isn't an oversight, it's the ask, unchanged
  // from the circular-altar rebuild this replaces.

  // Grave markers removed entirely 2026-09-04 (direct ask, real
  // playtest feedback batch) - a knowing call, not a missed-context
  // one: these carried real flavor-text intent (reinforcing "whoever
  // held this before you," wave 5's gear-removal beat in
  // wave_status.js) and that tie-in is being dropped on purpose, per
  // explicit confirmation, not because it went unrecognized.

  // Abandoned Brick House (2026-09-01, docs/FEATURES.md's "Redesign
  // direction" - replaces the old hand-built single-room shack with a
  // real professionally-modeled structure, since no amount of /fill
  // detail fixed the "terrible" verdict on the old hand-typed shell).
  // Swapped in from Red Mansion the same day (direct feedback: "this
  // mansion is too big") - same mod, same postapocalypse aesthetic,
  // 12x13x11 (barely bigger than the original hand-built 11x11
  // footprint), real dimensions confirmed by decompiling the mod's own
  // NBT directly (DataVersion 3465 matches this pack's install exactly)
  // - not guessed. /place template loads a mod-registered structure the
  // same clean way as a vanilla one, already confirmed in a live sandbox
  // test for this same mod's Red Mansion. Its 8 chests/barrels already
  // carry LootTable refs pointing at
  // postapocalypse_structures:chests/{trash,cobwebs,food} - the exact
  // tables this pack already buffed with real treasure earlier this
  // session (see docs/QUEUE.md's Phase 3 entry) - so this is free
  // upgraded starting loot, not something that needed clearing/replacing.
  // Placed at floorY, not wallY0 - the building's own local y=0 layer is
  // its floor/foundation material (matching the courtyard's floorY
  // block below the walkable surface), so its local y=1 walkable ground
  // floor lines up exactly with the courtyard's own walkable surface at
  // wallY0 - placing at wallY0 instead would leave the building's floor
  // sitting 2 blocks above the courtyard, an awkward step up right at
  // its own front rather than a level walk-in (the exact bug caught and
  // fixed for the Red Mansion placement this same day).
  run(`place template postapocalypse_structures:abandoned_brick_house ${buildingX0} ${floorY} ${buildingZ0}`)

  // Same real bug class caught for the Red Mansion, confirmed present
  // here too by parsing this building's own NBT directly before
  // shipping: /place template bypasses the mod's own worldgen
  // block_ignore processor (which strips these during natural jigsaw
  // generation), and the raw NBT has a 78-block wet_sponge layer at its
  // own local y=0 (a "leave the terrain alone here" foundation marker)
  // that would otherwise show up as visible sponge across the ground
  // floor footprint. Replace-mode fill over just that one Y layer swaps
  // it for the same stone_bricks the rest of the compound floor uses.
  run(`fill ${buildingX0} ${floorY} ${buildingZ0} ${buildingX1} ${floorY} ${buildingZ1} minecraft:stone_bricks replace minecraft:wet_sponge`)

  // Pre-placed Waystone (real live ask, 2026-09-05: one real, findable
  // Waystone from the start, same pre-placement convention as the
  // pedestal/kinetic rig). **Moved 2026-09-09** (direct ask: "put the
  // waystone just next to the house rather than in the yard") - was
  // out in the open courtyard at centerX+3/centerZ, 3 blocks east of
  // the pedestal. Now sits in the building's own local frame like the
  // fixups below: local (7, 1-2, 9), the open strip directly in front
  // of the house's real south wall (local z=8 - the bounding-box edge
  // at z=10 is overhang, not wall), one block east of the door alcove
  // (x=4-5) and just clear of the porch awning (brick_slab at local
  // y=4 over x=3-6; x=7 is open from the ground up to the eave).
  // Checked against the structure's real NBT, not assumed: the column
  // is air at local y=1..3, the wall behind it at (7,1,8) is solid
  // packed_mud, and nothing else in this file writes to that row (the
  // HOUSE_REINFORCE_BLOCKS z=9 entries are all y>=4 awning/railing
  // blocks). Faces south so its front looks out over the yard.
  //
  // Real bug fixed 2026-09-05 (live report: "only the bottom block is
  // visible, top lights up ghost-block style with no texture"). Root
  // cause, confirmed by decompiling WaystoneBlock/WaystoneBlockBase
  // directly: waystones:waystone is a real two-block structure, same
  // door/bed-style half=lower/half=upper blockstate pair, confirmed
  // from the mod's own blockstates/waystone.json (separate
  // waystone_bottom/waystone_top models per half). A real player
  // placing one triggers the mod's own placement code, which explicitly
  // sets the block ABOVE to half=upper - a bare /setblock only ever
  // creates the block's registered default state (facing=north,
  // half=lower), and never touches the space above at all, so nothing
  // was ever placed there. Fixed by setting both halves explicitly,
  // matching what real placement does.
  run(`setblock ${buildingX0 + 7} ${floorY + 1} ${buildingZ0 + 9} waystones:waystone[facing=south,half=lower]`)
  run(`setblock ${buildingX0 + 7} ${floorY + 2} ${buildingZ0 + 9} waystones:waystone[facing=south,half=upper]`)

  // Real playtest feedback batch, 2026-09-04 - furniture baked into this
  // structure's own NBT, not scripted (same class of fix as the
  // wet_sponge layer above). Decompiled the real NBT directly to find
  // local coordinates rather than guessing - **real correction to the
  // original spec while doing so**: the doc's own count of "8 chests/
  // barrels" is wrong against the actual file. There are no chests at
  // all, and only 5 barrels total (2x `chests/food` at [8,3,6]/[8,3,7],
  // 1x `chests/trash` at [3,5,5], 2x `chests/cobwebs` at [3,6,5]/
  // [3,7,5]) - removing all 5 real ones, not a guessed 8.
  //
  // Crafting table -> Crafting Station Improved's real block
  // (`craftingstation:crafting_station`, confirmed from the mod's own
  // blockstate JSON - single-variant, no facing property needed).
  //
  // Real bug found + fixed 2026-09-08 (live report: "still spawning with
  // a water block in it"). Decompiled CraftingStationBlock.class directly:
  // it implements SimpleWaterloggedBlock with a real WATERLOGGED property
  // whose getFluidState() returns water when true. This exact coordinate
  // sits where the original structure's own NBT has a water source (a
  // kitchen sink feature) - /setblock replacing a water source with a
  // waterloggable block auto-inherits waterlogged=true, same as
  // hand-placing into water would, which is what was rendering as "water
  // inside the crafting table." Forcing it off explicitly.
  run(`setblock ${buildingX0 + 5} ${floorY + 1} ${buildingZ0 + 4} craftingstation:crafting_station[waterlogged=false]`)
  // Cauldron + tripwire hook - direct removal request.
  run(`setblock ${buildingX0 + 8} ${floorY + 1} ${buildingZ0 + 5} minecraft:air`)
  run(`setblock ${buildingX0 + 8} ${floorY + 2} ${buildingZ0 + 5} minecraft:air`)
  // Starter loot chests/barrels - direct ask, remove all of them
  // entirely, not just nerf their tables ("loot lives outside the
  // border, not at home").
  ;[[8, 3, 6], [8, 3, 7], [3, 5, 5], [3, 6, 5], [3, 7, 5]].forEach(([lx, ly, lz]) => {
    run(`setblock ${buildingX0 + lx} ${floorY + ly} ${buildingZ0 + lz} minecraft:air`)
  })

  // Double chest, direct ask 2026-09-09: "can the house have a double chest
  // already spawned instead of the log blocks that are there." Real
  // structure NBT decompiled directly (this mod's own
  // abandoned_brick_house.nbt) to find them rather than guessed - 4
  // stripped_spruce_log props form an L-shaped counter beside the crafting
  // table and furnace: (6,1,4)/(7,1,4)/(8,1,4) running along the counter,
  // (8,1,6) at its far end near the furnace. All 4 cleared; two of the
  // counter's own positions become a real double chest instead - the
  // obvious spot for storage right next to where the player already
  // crafts, backed against the solid brick wall at local z=3 behind it.
  // Facing/type aren't guessed: ChestBlock's own real placement rule is
  // `facing.getClockWise() == connectingDirection ? LEFT : RIGHT` (the
  // direction from a given half toward its pair) - south's clockwise is
  // west, so the lower-x (west) half is RIGHT and the higher-x (east)
  // half is LEFT. Waterlogged forced off same as the crafting station
  // fix just above - no known fluid source under these exact cells, but
  // cheap insurance against the same "inherited from replaced water"
  // class of bug.
  run(`setblock ${buildingX0 + 6} ${floorY + 1} ${buildingZ0 + 4} minecraft:air`)
  run(`setblock ${buildingX0 + 7} ${floorY + 1} ${buildingZ0 + 4} minecraft:chest[facing=south,type=right,waterlogged=false]`)
  run(`setblock ${buildingX0 + 8} ${floorY + 1} ${buildingZ0 + 4} minecraft:chest[facing=south,type=left,waterlogged=false]`)
  run(`setblock ${buildingX0 + 8} ${floorY + 1} ${buildingZ0 + 6} minecraft:air`)

  // Green terracotta + snow patch - direct removal request 2026-09-05.
  // Real structure NBT check first, not guessed: the building's roof
  // uses plain minecraft:terracotta as a weathered-roofing motif at many
  // points, but one 3x2 section at local y=5 ([6-8],5,[6-7]) is
  // minecraft:green_terracotta instead, with 2 real snow layers stacked
  // directly on top of it at local (8,6,6)/(8,6,7) - a "mossy patch with
  // snow" roof accent. Removing the snow layers alone would leave green
  // terracotta exposed underneath (still wrong per the ask); removing
  // the green terracotta alone would leave the snow floating with
  // nothing solid under it. Fixed both together: green_terracotta
  // becomes plain terracotta (matching the roof's own established
  // weathered color everywhere else in this same structure, not a new
  // material), snow becomes air.
  ;[[6, 5, 6], [6, 5, 7], [7, 5, 6], [7, 5, 7], [8, 5, 6], [8, 5, 7]].forEach(([lx, ly, lz]) => {
    run(`setblock ${buildingX0 + lx} ${floorY + ly} ${buildingZ0 + lz} minecraft:terracotta`)
  })
  ;[[8, 6, 6], [8, 6, 7]].forEach(([lx, ly, lz]) => {
    run(`setblock ${buildingX0 + lx} ${floorY + ly} ${buildingZ0 + lz} minecraft:air`)
  })

  // "Bed-like blocks upstairs" - real, non-obvious finding while
  // investigating, not a mod-furniture block as guessed: plain vanilla
  // `minecraft:spruce_trapdoor` x4 in a row at local [3,5,4]-[6,5,4] (a
  // classic trapdoor-bed decoration trick), one real floor up from the
  // ground-floor crafting table/cauldron. Identified first, flagged for
  // a real decision rather than guessed at - user's call 2026-09-04:
  // clear it, not reskin.
  ;[3, 4, 5, 6].forEach((lx) => {
    run(`setblock ${buildingX0 + lx} ${floorY + 5} ${buildingZ0 + 4} minecraft:air`)
  })

  // Real premise correction 2026-09-05 (docs/FEATURES.md, "Superseded"
  // note on the amulet objective fix): the pedestal is the permanent
  // front line, full stop - not an objective that only exists while the
  // amulet happens to be sitting on it. "regardless of whether the
  // amulet is on the pedestal or not, this is the focus point for the
  // enemies... if im not in the base to defend it then i lose the
  // game." Every wave mob (mob_aggro.js) targets this marker
  // unconditionally now, and wave_spawner.js/wave_status.js's own
  // waveObjective() always resolves to this same fixed point - the
  // amulet's actual remaining job (server_scripts/amulet_pedestal.js)
  // narrows to just personal buffs while worn and unlocking
  // border-crossing while placed, fully decoupled from whether the base
  // itself is being defended.
  //
  // Marker created once, here, permanently - never killed, unlike the
  // old amulet-gated marker it replaces. No HandItems - Supplementaries'
  // pedestal now renders its own contents natively, so this is a pure,
  // invisible targeting anchor, not a visual prop. One block above the
  // pedestal's own position (wallY0+1), not inside it.
  //
  // **Created through `level.createEntity`, not `/summon` + lookup,
  // 2026-09-09 - real crash found live twice this morning.** The old
  // `run('summon ...')` followed by `findWorldStateEntity(level)` threw
  // `Cannot read property "persistentData" from undefined` on both fresh
  // worlds: a chunk that was force-generated synchronously inside the
  // same tick has its entity section still HIDDEN (the chunk map only
  // promotes sections to TRACKED when its own tick processes the ticket
  // change), so `level.getEntities()` - which reads the visible-entity
  // storage only - cannot see anything summoned into it yet. A same-tick
  // retry just summons a second invisible marker. Holding the entity
  // reference directly sidesteps the lookup entirely: `createEntity`
  // returns the real Entity (`EntityType#create(level)`), `mergeNbt`
  // applies the same tags/flags the summon string carried, `spawn()` is
  // `level.addFreshEntity`. The `/summon` path stays only as a logged
  // fallback if the direct path ever throws.
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

  // Stored once here, permanent regardless of amulet state -
  // pedestal_destruction.js's own block-gone check, pedestal_health.js's
  // own HP tick, amulet_pedestal.js's border-crossing poll, and every
  // wave/mob-targeting reference below all key off this same fixed
  // coordinate. 2026-09-03, "if the pedestal is destroyed you lose." Y
  // dropped back to wallY0 (ground level, no more plinth offset).
  // Guarded - worldD is only null in the fallback-failed case logged
  // above, and every downstream reader (pedestal_health.js etc., see
  // world_state.js's own worldData()) already treats a missing
  // marker/key as "not built yet" rather than assuming it's always set.
  // The per-player mirror of these coordinates (read-only cache for
  // mob_aggro.js's ensurePedestalMarker() safety net and the
  // td_zcraftCleanupDone migration) is written in the login handler,
  // for every player, from this same marker.
  if (worldD) {
    worldD.putInt('td_pedestalX', centerX)
    worldD.putInt('td_pedestalY', wallY0)
    worldD.putInt('td_pedestalZ', centerZ)
    // Compound's own real footprint (the walled perimeter box, x0/x1/z0/z1
    // computed above - NOT the wider flat field), persisted 2026-09-09
    // alongside the border revert to 50 so wave_spawner.js's spawn-point
    // picker and mob_aggro.js's stray-mob correction can both check "is
    // this point actually inside the base" directly, instead of relying on
    // a uniform distance-from-pedestal band that no longer reliably fits
    // outside a 50 border in every direction (see BORDER_START's own
    // comment above).
    worldD.putInt('td_compoundX0', x0)
    worldD.putInt('td_compoundX1', x1)
    worldD.putInt('td_compoundZ0', z0)
    worldD.putInt('td_compoundZ1', z1)
  }

  // Real deterministic HP pool (2026-09-06, see pedestal_health.js) -
  // set once here, same pattern as td_pedestalX/Y/Z above, full at
  // world-build time. Replaces reliance on Epic Siege Mod's own
  // blockTargets AI, which stayed inconclusive even after the
  // mob-pathing fix (mob_aggro.js) was meant to give it a fair shot.
  // Bumped 200 -> 300 (2026-09-05, direct ask: "pedestal starting HP
  // up") - must match PEDESTAL_MAX_HEALTH in pedestal_health.js, this
  // pack's own established cross-file-constant duplication convention.
  if (worldD) worldD.putInt('td_pedestalHealth', 300)

  // Forceload is now a one-time permanent setup, not a toggle -
  // same 96-block/169-chunk radius already verified safe
  // (amulet_pedestal.js used to add/remove this exact range whenever
  // the amulet went on/off the pedestal; now it's just always on). Real,
  // deliberate resource-cost tradeoff, not an oversight: permanently
  // reserving chunk-loading around the base for the whole game is the
  // accepted cost of "the base is always genuinely at stake."
  run(`forceload add ${centerX - 96} ${centerZ - 96} ${centerX + 96} ${centerZ + 96}`)

  // House reinforcement (2026-09-04, real playtest feedback batch,
  // direct ask: "reinforce the whole house... full uniform coverage"
  // over a distance-falloff pattern like the courtyard walls, given the
  // house is "kinda the permanent fixture throughout the game"). Real
  // scope, not guessed: the building's true solid wall shell doesn't sit
  // at the structure's own bounding-box edges (x=0/11, z=0/10 - checked
  // first, found 0 real reinforceable blocks there) - the actual walls
  // are 2 blocks further in (x=2/9, z=2/9), the outer ring being a real
  // porch/eave overhang. Decompiled the structure's own NBT directly to
  // find every real block on those 4 wall planes (283 total), matched
  // each against SecurityCraft's own 495 real reinforced-block ids
  // (checked directly, not assumed - e.g. confirmed there is NO plain
  // "reinforced_terracotta", only the 16 dyed-color variants), and
  // preserved each block's own exact orientation (facing/axis/type/wall
  // -connection state) from its real NBT properties, not a blanket
  // /fill (which would have flattened every stairs/slab/wall block to
  // one uniform orientation). **Real, honest result: 212 of 283 wall
  // blocks (75%) get a genuine reinforced equivalent** - bricks,
  // granite, granite_wall, packed_mud, mud_bricks, spruce_planks,
  // brick_slab, spruce_slab, grass_block, and the stone_bricks the
  // wet_sponge fix above already swaps in. **Real gaps, not silently
  // claimed as covered**: plain terracotta (36 blocks - no reinforced
  // equivalent exists in this mod at all), oak_leaves (18) and vine (17)
  // - both genuinely decorative, no reinforced material makes sense for
  // either. This pass only covers the 4 real wall planes, not the roof
  // (a separate, real scope limit - the roof's own sloped-slab structure
  // wasn't mapped this pass).
  const HOUSE_REINFORCE_BLOCKS = [
    [0, 0, 2, 'securitycraft:reinforced_stone_bricks'],
    [0, 0, 9, 'securitycraft:reinforced_stone_bricks'],
    [1, 0, 2, 'securitycraft:reinforced_stone_bricks'],
    [1, 0, 9, 'securitycraft:reinforced_stone_bricks'],
    [2, 0, 0, 'securitycraft:reinforced_stone_bricks'],
    [2, 0, 1, 'securitycraft:reinforced_stone_bricks'],
    [2, 0, 2, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [2, 0, 3, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [2, 0, 4, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [2, 0, 5, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [2, 0, 6, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [2, 0, 7, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [2, 0, 8, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [2, 0, 9, 'securitycraft:reinforced_stone_bricks'],
    [2, 0, 10, 'securitycraft:reinforced_stone_bricks'],
    [3, 0, 2, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [3, 0, 9, 'securitycraft:reinforced_stone_bricks'],
    [4, 0, 2, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [4, 0, 9, 'securitycraft:reinforced_stone_bricks'],
    [5, 0, 2, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [5, 0, 9, 'securitycraft:reinforced_stone_bricks'],
    [6, 0, 2, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [6, 0, 9, 'securitycraft:reinforced_stone_bricks'],
    [7, 0, 2, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [7, 0, 9, 'securitycraft:reinforced_stone_bricks'],
    [8, 0, 2, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [8, 0, 9, 'securitycraft:reinforced_stone_bricks'],
    [9, 0, 0, 'securitycraft:reinforced_stone_bricks'],
    [9, 0, 1, 'securitycraft:reinforced_stone_bricks'],
    [9, 0, 2, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [9, 0, 3, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [9, 0, 4, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [9, 0, 5, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [9, 0, 6, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [9, 0, 7, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [9, 0, 8, 'securitycraft:reinforced_grass_block[snowy=false]'],
    [9, 0, 9, 'securitycraft:reinforced_stone_bricks'],
    [9, 0, 10, 'securitycraft:reinforced_stone_bricks'],
    [10, 0, 2, 'securitycraft:reinforced_stone_bricks'],
    [10, 0, 9, 'securitycraft:reinforced_stone_bricks'],
    [11, 0, 2, 'securitycraft:reinforced_stone_bricks'],
    [11, 0, 9, 'securitycraft:reinforced_stone_bricks'],
    [2, 1, 2, 'securitycraft:reinforced_packed_mud'],
    [2, 1, 3, 'securitycraft:reinforced_mud_bricks'],
    [2, 1, 4, 'securitycraft:reinforced_packed_mud'],
    [2, 1, 5, 'securitycraft:reinforced_packed_mud'],
    [2, 1, 6, 'securitycraft:reinforced_mud_bricks'],
    [2, 1, 7, 'securitycraft:reinforced_mud_bricks'],
    [2, 1, 8, 'securitycraft:reinforced_packed_mud'],
    [3, 1, 2, 'securitycraft:reinforced_mud_bricks'],
    [4, 1, 2, 'securitycraft:reinforced_mud_bricks'],
    [5, 1, 2, 'securitycraft:reinforced_mud_bricks'],
    [6, 1, 2, 'securitycraft:reinforced_packed_mud'],
    [7, 1, 2, 'securitycraft:reinforced_packed_mud'],
    [8, 1, 2, 'securitycraft:reinforced_mud_bricks'],
    [9, 1, 2, 'securitycraft:reinforced_packed_mud'],
    [9, 1, 3, 'securitycraft:reinforced_mud_bricks'],
    [9, 1, 4, 'securitycraft:reinforced_packed_mud'],
    [9, 1, 5, 'securitycraft:reinforced_packed_mud'],
    [9, 1, 6, 'securitycraft:reinforced_packed_mud'],
    [9, 1, 7, 'securitycraft:reinforced_mud_bricks'],
    [9, 1, 8, 'securitycraft:reinforced_packed_mud'],
    [2, 2, 2, 'securitycraft:reinforced_mud_bricks'],
    [2, 2, 3, 'securitycraft:reinforced_packed_mud'],
    [2, 2, 4, 'securitycraft:reinforced_mud_bricks'],
    [2, 2, 5, 'securitycraft:reinforced_mud_bricks'],
    [2, 2, 6, 'securitycraft:reinforced_packed_mud'],
    [2, 2, 7, 'securitycraft:reinforced_packed_mud'],
    [2, 2, 8, 'securitycraft:reinforced_mud_bricks'],
    [3, 2, 2, 'securitycraft:reinforced_mud_bricks'],
    [4, 2, 2, 'securitycraft:reinforced_mud_bricks'],
    [5, 2, 2, 'securitycraft:reinforced_mud_bricks'],
    [6, 2, 2, 'securitycraft:reinforced_mud_bricks'],
    [7, 2, 2, 'securitycraft:reinforced_mud_bricks'],
    [8, 2, 2, 'securitycraft:reinforced_mud_bricks'],
    [9, 2, 2, 'securitycraft:reinforced_mud_bricks'],
    [9, 2, 3, 'securitycraft:reinforced_mud_bricks'],
    [9, 2, 4, 'securitycraft:reinforced_mud_bricks'],
    [9, 2, 5, 'securitycraft:reinforced_mud_bricks'],
    [9, 2, 6, 'securitycraft:reinforced_mud_bricks'],
    [9, 2, 7, 'securitycraft:reinforced_packed_mud'],
    [9, 2, 8, 'securitycraft:reinforced_mud_bricks'],
    [2, 3, 2, 'securitycraft:reinforced_packed_mud'],
    [2, 3, 4, 'securitycraft:reinforced_mud_bricks'],
    [2, 3, 5, 'securitycraft:reinforced_mud_bricks'],
    [2, 3, 6, 'securitycraft:reinforced_packed_mud'],
    [2, 3, 7, 'securitycraft:reinforced_bricks'],
    [4, 3, 2, 'securitycraft:reinforced_packed_mud'],
    [6, 3, 2, 'securitycraft:reinforced_mud_bricks'],
    [7, 3, 2, 'securitycraft:reinforced_packed_mud'],
    [9, 3, 2, 'securitycraft:reinforced_packed_mud'],
    [9, 3, 3, 'securitycraft:reinforced_mud_bricks'],
    [9, 3, 6, 'securitycraft:reinforced_packed_mud'],
    [9, 3, 7, 'securitycraft:reinforced_mud_bricks'],
    [9, 3, 8, 'securitycraft:reinforced_packed_mud'],
    [2, 4, 2, 'securitycraft:reinforced_bricks'],
    [2, 4, 3, 'securitycraft:reinforced_mud_bricks'],
    [2, 4, 4, 'securitycraft:reinforced_bricks'],
    [2, 4, 5, 'securitycraft:reinforced_packed_mud'],
    [2, 4, 6, 'securitycraft:reinforced_bricks'],
    [2, 4, 8, 'securitycraft:reinforced_mud_bricks'],
    [3, 4, 2, 'securitycraft:reinforced_packed_mud'],
    [4, 4, 2, 'securitycraft:reinforced_granite'],
    [5, 4, 2, 'securitycraft:reinforced_mud_bricks'],
    [6, 4, 2, 'securitycraft:reinforced_mud_bricks'],
    [8, 4, 2, 'securitycraft:reinforced_packed_mud'],
    [9, 4, 2, 'securitycraft:reinforced_granite'],
    [9, 4, 3, 'securitycraft:reinforced_mud_bricks'],
    [9, 4, 4, 'securitycraft:reinforced_packed_mud'],
    [9, 4, 5, 'securitycraft:reinforced_bricks'],
    [9, 4, 6, 'securitycraft:reinforced_granite'],
    [9, 4, 7, 'securitycraft:reinforced_mud_bricks'],
    [9, 4, 8, 'securitycraft:reinforced_packed_mud'],
    [2, 5, 2, 'securitycraft:reinforced_granite'],
    [2, 5, 3, 'securitycraft:reinforced_granite'],
    [2, 5, 4, 'securitycraft:reinforced_bricks'],
    [2, 5, 6, 'securitycraft:reinforced_packed_mud'],
    [2, 5, 7, 'securitycraft:reinforced_granite'],
    [2, 5, 8, 'securitycraft:reinforced_bricks'],
    [4, 5, 2, 'securitycraft:reinforced_granite'],
    [5, 5, 2, 'securitycraft:reinforced_granite'],
    [7, 5, 2, 'securitycraft:reinforced_granite'],
    [8, 5, 2, 'securitycraft:reinforced_granite'],
    [9, 5, 4, 'securitycraft:reinforced_granite'],
    [9, 5, 5, 'securitycraft:reinforced_packed_mud'],
    [9, 5, 6, 'securitycraft:reinforced_mud_bricks'],
    [9, 5, 8, 'securitycraft:reinforced_granite'],
    [2, 6, 4, 'securitycraft:reinforced_granite'],
    [2, 6, 6, 'securitycraft:reinforced_bricks'],
    [3, 6, 2, 'securitycraft:reinforced_bricks'],
    [4, 6, 2, 'securitycraft:reinforced_bricks'],
    [6, 6, 2, 'securitycraft:reinforced_bricks'],
    [7, 6, 2, 'securitycraft:reinforced_bricks'],
    [9, 6, 2, 'securitycraft:reinforced_granite'],
    [9, 6, 3, 'securitycraft:reinforced_granite'],
    [9, 6, 5, 'securitycraft:reinforced_granite'],
    [9, 6, 7, 'securitycraft:reinforced_bricks'],
    [9, 6, 8, 'securitycraft:reinforced_bricks'],
    [2, 7, 2, 'securitycraft:reinforced_bricks'],
    [2, 7, 3, 'securitycraft:reinforced_bricks'],
    [2, 7, 6, 'securitycraft:reinforced_bricks'],
    [2, 7, 7, 'securitycraft:reinforced_granite'],
    [2, 7, 8, 'securitycraft:reinforced_granite'],
    [3, 7, 2, 'securitycraft:reinforced_granite'],
    [5, 7, 2, 'securitycraft:reinforced_granite'],
    [6, 7, 2, 'securitycraft:reinforced_granite'],
    [8, 7, 2, 'securitycraft:reinforced_bricks'],
    [9, 7, 2, 'securitycraft:reinforced_bricks'],
    [9, 7, 4, 'securitycraft:reinforced_granite'],
    [9, 7, 5, 'securitycraft:reinforced_granite'],
    [9, 7, 6, 'securitycraft:reinforced_bricks'],
    [2, 8, 3, 'securitycraft:reinforced_granite'],
    [2, 8, 4, 'securitycraft:reinforced_granite'],
    [2, 8, 5, 'securitycraft:reinforced_bricks'],
    [2, 8, 6, 'securitycraft:reinforced_bricks'],
    [2, 8, 7, 'securitycraft:reinforced_bricks'],
    [2, 8, 8, 'securitycraft:reinforced_bricks'],
    [4, 8, 2, 'securitycraft:reinforced_bricks'],
    [5, 8, 2, 'securitycraft:reinforced_granite'],
    [6, 8, 2, 'securitycraft:reinforced_bricks'],
    [7, 8, 2, 'securitycraft:reinforced_bricks'],
    [8, 8, 2, 'securitycraft:reinforced_bricks'],
    [9, 8, 2, 'securitycraft:reinforced_bricks'],
    [9, 8, 3, 'securitycraft:reinforced_bricks'],
    [9, 8, 4, 'securitycraft:reinforced_bricks'],
    [9, 8, 6, 'securitycraft:reinforced_bricks'],
    [9, 8, 7, 'securitycraft:reinforced_bricks'],
    [9, 8, 8, 'securitycraft:reinforced_bricks'],
    [2, 9, 3, 'securitycraft:reinforced_granite'],
    [2, 9, 4, 'securitycraft:reinforced_bricks'],
    [2, 9, 5, 'securitycraft:reinforced_bricks'],
    [2, 9, 6, 'securitycraft:reinforced_bricks'],
    [3, 9, 2, 'securitycraft:reinforced_spruce_planks'],
    [4, 9, 2, 'securitycraft:reinforced_spruce_planks'],
    [5, 9, 2, 'securitycraft:reinforced_spruce_planks'],
    [6, 9, 2, 'securitycraft:reinforced_spruce_planks'],
    [7, 9, 2, 'securitycraft:reinforced_spruce_planks'],
    [8, 9, 2, 'securitycraft:reinforced_spruce_planks'],
    [9, 9, 2, 'securitycraft:reinforced_spruce_planks'],
    [9, 9, 3, 'securitycraft:reinforced_bricks'],
    [9, 9, 4, 'securitycraft:reinforced_bricks'],
    [9, 9, 5, 'securitycraft:reinforced_bricks'],
    [9, 9, 6, 'securitycraft:reinforced_bricks'],
    [10, 9, 2, 'securitycraft:reinforced_spruce_planks'],
    [2, 10, 4, 'securitycraft:reinforced_spruce_planks'],
    [2, 10, 5, 'securitycraft:reinforced_bricks'],
    [2, 10, 6, 'securitycraft:reinforced_spruce_planks'],
    [9, 10, 4, 'securitycraft:reinforced_spruce_planks'],
    [9, 10, 5, 'securitycraft:reinforced_bricks'],
    [9, 10, 6, 'securitycraft:reinforced_spruce_planks'],
    [3, 4, 9, 'securitycraft:reinforced_brick_slab[type=top]'],
    [4, 4, 9, 'securitycraft:reinforced_brick_slab[type=top]'],
    [5, 4, 9, 'securitycraft:reinforced_brick_slab[type=top]'],
    [6, 4, 9, 'securitycraft:reinforced_brick_slab[type=top]'],
    [3, 5, 9, 'securitycraft:reinforced_granite_wall[east=low,south=none,north=low,west=none,up=true]'],
    [4, 5, 9, 'securitycraft:reinforced_granite_wall[east=low,south=none,north=none,west=low,up=false]'],
    [5, 5, 9, 'securitycraft:reinforced_granite_wall[east=low,south=none,north=none,west=low,up=false]'],
    [6, 5, 9, 'securitycraft:reinforced_granite_wall[east=none,south=none,north=low,west=low,up=true]'],
    [2, 9, 1, 'securitycraft:reinforced_spruce_slab[type=bottom]'],
    [2, 9, 9, 'securitycraft:reinforced_spruce_slab[type=bottom]'],
    [3, 9, 9, 'securitycraft:reinforced_spruce_slab[type=bottom]'],
    [4, 9, 9, 'securitycraft:reinforced_spruce_slab[type=bottom]'],
    [5, 9, 9, 'securitycraft:reinforced_spruce_slab[type=bottom]'],
    [6, 9, 9, 'securitycraft:reinforced_spruce_slab[type=bottom]'],
    [7, 9, 9, 'securitycraft:reinforced_spruce_slab[type=bottom]'],
    [9, 9, 1, 'securitycraft:reinforced_spruce_slab[type=bottom]'],
    [10, 9, 9, 'securitycraft:reinforced_spruce_slab[type=bottom]'],
    [2, 10, 3, 'securitycraft:reinforced_spruce_slab[type=bottom]'],
    [2, 10, 7, 'securitycraft:reinforced_spruce_slab[type=bottom]'],
    [9, 10, 3, 'securitycraft:reinforced_spruce_slab[type=bottom]'],
    [2, 11, 5, 'securitycraft:reinforced_spruce_slab[type=bottom]'],
    [9, 11, 5, 'securitycraft:reinforced_spruce_slab[type=bottom]'],
  ]
  HOUSE_REINFORCE_BLOCKS.forEach(([lx, ly, lz, block]) => {
    run(`setblock ${buildingX0 + lx} ${floorY + ly} ${buildingZ0 + lz} ${block}`)
  })

  // Pre-placed Tier 1 kinetic rig (2026-09-03, direct request: pre-place
  // a finished Rolling Mill "same way it already ships with a furnace
  // etc.", so the only remaining player task is crafting a Hand Crank
  // and connecting it).
  //
  // **Real hotfix 2026-09-03**: the original indoor spot (local x=4-6,
  // z=9 in the building's own NBT) was wrong - not bad math, a wrong
  // reading of the space. It turned out to be the open, unwalled yard
  // strip right outside the building's real entrance, not a room -
  // landed the rig in the walkway between the gate and the door,
  // exactly the live bug report ("blocking it"). Refit indoors first
  // (local x=7,z=5-7, beside the building's own furnace, confirmed
  // enclosed by parsing the structure's real NBT) - then **relocated
  // outdoors entirely 2026-09-05** (docs/FEATURES.md, direct request:
  // "the pre-placed Create rig... feels cramped inside the building -
  // relocate it to the yard too, off to one side, clearly secondary to
  // the pedestal"). Sits along the east wall, one courtyard row north
  // of the dais platform (rigZ = centerZ-2), a real gap from both the
  // platform (ends at centerZ-1) and the grave arc (starts at
  // centerZ-3) - checked against those real coordinates, not assumed
  // clear just because it moved outdoors.
  //
  // The Depot goes BENEATH the Press, not on top - confirmed from the
  // mod's own ponder text ("Input items can be dropped or placed on a
  // Depot under the Press"), the opposite of the Rolling Mill, which
  // takes items dropped directly onto itself.
  //
  // **Real fix 2026-09-06**: the outdoor relocation above placed the
  // Press directly on top of the Depot (one block up, zero clearance).
  // Direct bug report: "the press and depot hasnt got a space in the
  // middle which it needs to function" - the real requirement, per the
  // user directly, is a full block of open air between them (Press TWO
  // blocks above the Depot, not one). Confirmed live in a sandbox before
  // shipping: a creative Motor powering the Press alone, an iron ingot
  // fed onto the Depot via a hopper - at 1-block spacing the Press never
  // engaged (Ticks stayed 0 for 20+ real seconds); moved to 2-block
  // spacing, the same setup produced a real `Finished:1b`/`Mode:1` press
  // cycle and the Depot's held item genuinely converted from
  // `minecraft:iron_ingot` to `create:iron_sheet`. Mill stays at its old
  // XZ (rigMillX, wallY0), still not face-adjacent to the Press either
  // way - not reconnected to it, per "leave them physically disconnected
  // for now."
  const rigZ = centerZ - 2
  const rigPressX = x1 - 2
  const rigMillX = x1 - 3
  run(`setblock ${rigMillX} ${wallY0} ${rigZ} createaddition:rolling_mill[facing=west]`)
  run(`setblock ${rigPressX} ${wallY0} ${rigZ} create:depot`)
  run(`setblock ${rigPressX} ${wallY0 + 2} ${rigZ} create:mechanical_press[facing=west]`)

  return { centerX: centerX, centerY: wallY0, centerZ: centerZ, spawnX: x, spawnY: y, spawnZ: z, marker: markerEntity }
}

// ---------------------------------------------------------------------
// Lifecycle hooks. Set by the overworld's LevelEvents.loaded on a
// brand-new world, consumed by ServerEvents.loaded; both handlers live
// in this one file on purpose - top-level `var`s are NOT reliably
// shared across server_scripts files in this KubeJS build (see the
// resolveClass comment above), but within one file they are plain
// shared scope.
// ---------------------------------------------------------------------
var pendingBaseSite = null

// The overworld's own ServerLevelData (a PrimaryLevelData) via
// Level#getLevelData (m_6106_). `isInitialized` (m_6535_) is the exact
// flag vanilla's createLevels checks before running setInitialSpawn -
// false only on a world that has never been created before, which
// makes it the most honest "fresh world" gate there is (no time/entity
// heuristics). `setInitialized(true)` (m_5555_) is what createLevels
// sets right after its own spawn hunt; flipping it here first makes
// vanilla skip that hunt and keep the spawn this file just set.
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

// Fires from MinecraftServer#createLevels, BEFORE vanilla's
// setInitialSpawn and before prepareLevels' 441-chunk spawn-area pass
// (verified in this build's Forge-patched bytecode, see the header of
// the site-selection section). On a fresh overworld: pick the site,
// point the world spawn at it, and tell vanilla the spawn is already
// initialized so it doesn't overwrite it with its own climate-based
// pick near origin. Everything else (the actual build) waits for
// ServerEvents.loaded, when the spawn-area chunks already exist and the
// world border's saved settings have been applied (createLevels applies
// those AFTER this event, so a border set here would be clobbered).
LevelEvents.loaded((event) => {
  var level = event.level
  if (`${level.dimension}` !== 'minecraft:overworld') return
  try {
    if (!isFreshWorld(level)) return
    var site = findBaseSite(level)
    var y = surfaceHeightAt(level, site.x, site.z)
    // `event.server.runCommandSilent`, NOT `level.runCommandSilent` -
    // real silent failure caught in the first sandbox boot of this
    // code, 2026-09-09: LevelKJS#kjs$runCommandSilent iterates
    // Level#players() and runs the command once AS EACH PLAYER, so
    // with nobody online yet it runs nothing at all and returns
    // quietly. The server-level variant uses the console source. That
    // boot's spawn stayed at the PrimaryLevelData default (0,0), the
    // 441-chunk spawn-area pass ran at origin (4 region files there),
    // and only the build's own later setworldspawn fixed the record.
    event.server.runCommandSilent(`setworldspawn ${site.x} ${y} ${site.z}`)
    markWorldInitialized(level)
    pendingBaseSite = site
    console.log(`playtest_starter_kit.js: fresh world - spawn pinned to the base site (${site.x}, ${y}, ${site.z}) before vanilla's spawn-area pass; base build deferred to server start`)
  } catch (e) {
    console.error(`playtest_starter_kit.js: world-load site selection failed (${e}) - vanilla will pick its own spawn; the base will be built on first login instead`)
    pendingBaseSite = null
  }
})

// Idempotent: builds the base exactly once per world. Normal path is
// ServerEvents.loaded right after a fresh world's spawn area is
// prepared; the login handler calls it too as a last-resort fallback
// for a world where the load-time hook didn't run or failed (in which
// case the world spawn is still vanilla's, so the site search runs
// here instead and the joining player gets moved).
function ensureBaseBuilt(server, level, reason) {
  if (findWorldStateEntity(level)) return null
  var site = pendingBaseSite || findBaseSite(level)
  pendingBaseSite = null
  var startedAt = Date.now()
  var result = buildStarterBase(server, level, site.x, site.z)
  console.log(`playtest_starter_kit.js: starter base built at (${site.x}, ${result.spawnY}, ${site.z}) in ${Date.now() - startedAt}ms (${reason})`)
  return result
}

ServerEvents.loaded((event) => {
  if (!pendingBaseSite) return
  try {
    ensureBaseBuilt(event.server, event.server.getLevel('minecraft:overworld'), 'server start, fresh world')
  } catch (e) {
    console.error(`playtest_starter_kit.js: base build at server start failed (${e}) - will retry on first login`)
  }
})

// Mirrors the marker's pedestal coordinates onto one player's own
// persistentData (read-only cache, never authoritative) - see the
// login handler for why: mob_aggro.js's ensurePedestalMarker() recovery
// safety net and this file's own td_zcraftCleanupDone migration both
// read a player's copy, and need a real coordinate from WHICHEVER
// player happens to be online, not just the original builder.
function mirrorPedestalCoords(data, worldD) {
  if (!worldD || !worldD.contains('td_pedestalX')) return
  data.putInt('td_pedestalX', worldD.getInt('td_pedestalX'))
  data.putInt('td_pedestalY', worldD.getInt('td_pedestalY'))
  data.putInt('td_pedestalZ', worldD.getInt('td_pedestalZ'))
}

PlayerEvents.loggedIn((event) => {
  const player = event.player
  const data = player.persistentData
  const level = player.getLevel()
  const server = player.getServer()

  // Real live bug fixed 2026-09-05: Zcraft Decoration removed entirely
  // (direct report - its concrete blocks were getting mobs stuck
  // pathing near them). Full uninstall (mod + this function's own
  // placement further down), but any save that already built its
  // starter base (td_playtestKitGiven true) also already has the 2 real
  // zcraft_decorations:sfz_shuiniqiang blocks placed at the gate - once
  // the mod's gone those become real "missing block" placeholders on
  // next load, not just an unplaced decoration. Gated by its own
  // separate flag, since the world-build gate only covers fresh worlds
  // and this needs to also reach already-built ones. Recomputes the 2
  // known coordinates from this file's own persisted td_pedestalX/Y/Z
  // (same doorX/wallY0/z1 relationship the base-building code uses:
  // doorX = td_pedestalX, wallY0 = td_pedestalY, z1 = td_pedestalZ + 7)
  // and blindly overwrites them with air regardless of what's actually
  // there now - safe either way, a fresh world never had anything there.
  if (!data.getBoolean('td_zcraftCleanupDone') && data.getBoolean('td_playtestKitGiven')) {
    data.putBoolean('td_zcraftCleanupDone', true)
    var oldDoorX = data.getInt('td_pedestalX')
    var oldWallY0 = data.getInt('td_pedestalY')
    var oldZ1 = data.getInt('td_pedestalZ') + 7
    server.runCommandSilent(`setblock ${oldDoorX - 2} ${oldWallY0} ${oldZ1 + 1} minecraft:air`)
    server.runCommandSilent(`setblock ${oldDoorX + 2} ${oldWallY0} ${oldZ1 + 1} minecraft:air`)
  }

  // The amulet is NO LONGER starter gear (reversed 2026-09-01,
  // docs/FEATURES.md's "The amulet" - "the pedestal is pre-built, the
  // amulet is crafted"). It now has a real crafting recipe
  // (server_scripts/amulet_pedestal.js) instead of being given here;
  // the empty pre-built pedestal (in buildStarterBase) is the intended
  // hook - "something was supposed to be here."

  // Real multiplayer fix, 2026-09-08 (see docs/FEATURES.md's
  // "Multiplayer / LAN readiness" for the full bug writeup). Real root
  // cause: the world-build gate used to be read from THIS JOINING
  // PLAYER's own persistent data - so any player's first-ever login,
  // even into a world whose base had already existed for hours, read
  // that flag as false for them personally and ran the ENTIRE build
  // again. The permanent td_pedestal_target marker's own EXISTENCE (see
  // world_state.js) is the real "has this WORLD been built" signal,
  // independent of whether THIS player has ever logged in before.
  //
  // Since 2026-09-09 the base is normally already standing before any
  // player can join (site chosen in LevelEvents.loaded, built in
  // ServerEvents.loaded - see the hooks above), so on a healthy boot
  // this branch always finds the marker. The build-here path below is
  // the last-resort fallback for a world where that load-time path
  // failed and logged; it reuses the exact same site search and build,
  // then moves the player onto the new spawn.
  var existingMarker = findWorldStateEntity(level)
  if (!existingMarker) {
    console.error('playtest_starter_kit.js: no pedestal marker found at login - the load-time build did not happen, building the base now as a fallback')
    try {
      var built = ensureBaseBuilt(server, level, 'first-login fallback')
      if (built) {
        existingMarker = built.marker || findWorldStateEntity(level)
        player.teleportTo(built.spawnX + 0.5, built.spawnY, built.spawnZ + 0.5)
      }
    } catch (e) {
      console.error(`playtest_starter_kit.js: fallback base build failed (${e})`)
    }
  }

  if (existingMarker) {
    // Real regression fix, 2026-09-09 (see world_state.js's own comment
    // on migrateLegacySharedState for the full writeup). Must run
    // BEFORE the td_playtestKitGiven check right below - that check
    // already returns immediately for this pack's one long-running
    // player, which is exactly why the migration could never reach this
    // point if it lived any later in this function.
    migrateLegacySharedState(player, existingMarker)
  }

  // Per-player pieces only from here on. Vanilla's own /setworldspawn
  // (set once, at world build) already places a player with no personal
  // spawn override directly in the courtyard on login, so no manual
  // teleport is needed on the normal path.
  if (data.getBoolean('td_playtestKitGiven')) return
  data.putBoolean('td_playtestKitGiven', true)
  giveStarterKit(player)
  // Seeds this player's own row on the Waves Cleared sidebar (objective
  // created once per world in buildStarterBase). `add 0` creates a
  // missing score at 0 and leaves an existing one untouched, so a late
  // joiner in multiplayer doesn't reset anyone else's count the way the
  // old `set @a ... 0` did.
  server.runCommandSilent('scoreboard players add @a td_waves_cleared 0')
  mirrorPedestalCoords(data, existingMarker ? existingMarker.persistentData : null)
})
