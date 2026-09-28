// **Rebuilt 2026-09-09 - world-load-time base placement.** The base site
// is now chosen in LevelEvents.loaded (before vanilla prepares its spawn
// area) from a fixed grid of "anchor" chunks that every structure_set in
// the pack is excluded from by a real `exclusion_zone` (except
// kubejs:towns, which since 2026-09-27 puts a town ON about half of them -
// the base only takes a town-free one), and the compound
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
  // kubejs:wave_horn item removed entirely, 2026-09-13 (direct ask: "now
  // that the wave horn is a block, no need for the item") - the upstairs
  // note block (this same function's own waveNoteBlockX/Y/Z placement,
  // further down) is now the only way to sound the horn.
  player.give(Item.of('minecraft:iron_helmet', 1, starterGearNbt()))
  player.give(Item.of('minecraft:iron_chestplate', 1, starterGearNbt()))
  player.give(Item.of('minecraft:iron_leggings', 1, starterGearNbt()))
  player.give(Item.of('minecraft:iron_boots', 1, starterGearNbt()))
  // Manual fallback for the starter power rig (see starter_flux_network.js)
  // - if the reflection-based auto-link ever fails on a given world, this
  // is the mod's own real tool for linking the pre-placed generator/plug/
  // battery upstairs by hand (right-click each once), no different from
  // wiring any future turret to the network later. Given regardless of
  // whether auto-link succeeds, since it's the normal way to add MORE
  // devices to the network later anyway, not just a failure fallback.
  player.give(Item.of('fluxnetworks:flux_configurator', 1))
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
// carves a guaranteed structure-free box around every anchor chunk,
// 1024 blocks apart: (2*9+1)=19 chunks for the vanilla sets and way
// signs, 23 for
// kubejs:ruins_pool (11), 27 for mineshafts (13) - see
// STRUCTURE_CLEAR_CHUNKS below; it was 12 when this was first built.
// Since 2026-09-27 about half the anchors hold a town (TOWN_SET_ID
// below), so the base is placed ON the nearest town-free anchor chunk
// that sits in desert/badlands - the search only has to test grid
// points, using the exact same `hasStructureChunkInRange` call the
// exclusion zone itself uses (no chunk generation, microseconds per
// set) as a self-check that nothing slipped through the JSON pass.
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
// structure_set overrides (9: villages, pillager outposts, ruined
// portals, way signs). The old 13-chunk city sets are disabled (empty
// `structures`) since the towns moved onto the anchor lattice - see
// TOWN_SET_ID below. 9 chunks past the anchor chunk = the nearest chunk
// those sets may start in is ~150 blocks from the base centre. Every
// ruin, house and prop now comes from ONE set, 2026-09-27:
// data/kubejs/worldgen/structure_set/ruins_pool.json, random_spread 4/2
// (a 4-chunk grid, each start jittered 0-1 chunk) excluding base_anchor
// at 11. Its first row is therefore 12 chunks (~192 blocks) from the
// anchor, and since a building's footprint reaches back toward the base
// from its start chunk, structures now start around 160 blocks out
// (simulated over 726 anchors: nearest edge median ~167, p10 ~153;
// the median was ~127 under the old per-mod sets at 9).
// Mineshafts exclude at 13 but are in STRUCTURE_CHECK_SKIP_SETS below.
// **12 -> 9, 2026-09-09, direct playtest feedback on the first live
// world built this way** ("the structures are slightly too far
// away... but only slightly" - nearest was 254 blocks in the sandbox,
// most 600+): three chunks closer, still more than double the wave-8
// border half-width (~67), so nothing can ever generate inside the
// campaign's playable area.
var STRUCTURE_CLEAR_CHUNKS = 9
// Grid rings searched around world origin: 20 rings = 41x41 anchor
// points, 20480 blocks each way. **10 -> 20, 2026-09-27, with the town
// lattice**: half the anchors now hold a town and are never a base
// site. Measured over 200 seeds with a port of this search (biome
// lookup validated quart-for-quart against both real saves, and it
// reproduces both real base picks): at 10 rings the perfect-score
// (all-wasteland) pick fell from 165/200 to 117/200 and the no-wasteland
// fallback rose from 5/200 to 26/200; at 20 rings it is 194/200 perfect,
// 0/200 fallback. Worst case is ~1,700 pure biome lookups (<1s, once per
// world); the search still stops at the first perfect score. Older note:
// 10 rings = 21x21 anchor points. Sized from real data, not a guess:
// the first two sandbox seeds of this code each had exactly ONE
// desert/badlands anchor point inside 6 rings (169 points), 6-7km out -
// the 2026-09-08 "cut desert back to 2 of 7" biome blend made wasteland
// genuinely rare (docs/QUEUE.md's "Desert dominance" entry measured 0%
// near origin). 441 points still cost only ~0.2s of pure biome lookups,
// and give the scoring a real chance of finding a point whose
// surroundings are wasteland too, not just its centre column. Distance
// from origin has no gameplay cost - nothing in the pack is
// origin-relative any more.
var BASE_SEARCH_MAX_RINGS = 20
// Extra biome samples this far out in each cardinal direction so the
// whole visible area around the base reads as wasteland, not just the
// one column the base sits on (the old single-point check landed bases
// on the edge of a desert with plains in view).
var BASE_BIOME_SAMPLE_OFFSET = 96
// Mineshafts are NOT irrelevant to a surface base: the ground is only
// ~18 blocks deep, and before 2026-09-27 their pieces reached 0-27
// blocks from the pedestal in both real saves. Since then
// data/minecraft/worldgen/structure_set/mineshafts.json excludes
// base_anchor at 13 chunks (nearest piece ~118+ blocks out), wider than
// this 9-chunk check, so they are skipped here. Strongholds'
// concentric-ring placement is the one placement type whose
// isStructureChunk is not cheap grid math (and the vanilla set has no
// base exclusion at all).
var STRUCTURE_CHECK_SKIP_SETS = [BASE_ANCHOR_SET_ID, 'minecraft:mineshafts', 'minecraft:strongholds']
// Towns live ON the anchor lattice, 2026-09-27. data/kubejs/worldgen/
// structure_set/towns.json is random_spread 64/63 (same pinning as
// base_anchor: its only possible start chunk is the anchor chunk
// (64i, 64j)) with frequency 0.5 via `legacy_type_2`. Every other set
// excludes base_anchor, so each anchor already has a structure-free
// hole - on half of them a town now fills it, protected from every
// other set by that same hole. The one set whose worst-case reach
// (vanilla villages, 88 blocks) can still cross into a town from 10
// chunks out is handled from the town side: towns.json's own
// exclusion_zone against minecraft:villages drops that town (13 chunks
// for the full-size Lost City, ~4% of town anchors) instead of
// widening the villages set. townAt() below
// asks isStructureChunk, which includes that exclusion. The base must
// never share an anchor with a town, so this is a hard disqualifier in
// findBaseSite(), not a score. `legacy_type_2`, not `default`: the
// `default` reducer seeds with (salt, x) as the region coords and z as
// the salt, so neighbouring anchors along z get nearly identical rolls
// (measured: P(next anchor along z is a town | this one is) = 0.95 at
// f=0.5) - whole north-south stripes of towns. `legacy_type_3` shares
// its first RNG draw with vanilla's weighted pick of WHICH town, so with
// equal weights only the first two towns in the list could ever appear.
// Not in STRUCTURE_CHECK_SKIP_SETS: the clearance check pulls it out of
// the generic blocker list and asks about it separately (townAt).
var TOWN_SET_ID = 'kubejs:towns'

// Builds { blockersAt, townAt }. blockersAt: (chunkX, chunkZ) -> array
// of structure_set ids that still have a placement chunk within
// STRUCTURE_CLEAR_CHUNKS of that chunk. Expected to be empty at every
// anchor chunk - a non-empty result names a set the exclusion_zone pass
// missed. townAt: (chunkX, chunkZ) -> true when TOWN_SET_ID's own
// isStructureChunk passes at exactly that chunk (a radius-0 box), i.e.
// vanilla's createStructures will start a town there. If the town set
// is not in possibleStructureSets (no member can spawn in this world's
// biomes) no town can generate anywhere and townAt is always false. Uses
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

// Picks the anchor chunk the base goes on. Candidates are ONLY anchor
// grid points (chunk (64i, 64j), block centre (1024i+8, 1024j+8)),
// nearest-to-origin first. An anchor holding a town (TOWN_SET_ID) is
// never a candidate - skipped outright, including in the fallback.
// Scoring: centre column in desert/badlands (required), the four
// BASE_BIOME_SAMPLE_OFFSET samples also wasteland (+10), no structure
// set reporting a placement chunk inside the clearance box (+5). The
// first perfect score wins immediately; otherwise the best-scoring
// candidate seen. Only biome-passing points pay for the town and
// structure checks, so the whole search is pure biome lookups (~0.3ms
// each) plus a handful of grid-math passes.
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
    // No town-free desert/badlands anchor point in the searched square.
    // Rare (0 of 200 simulated seeds at 20 rings; 5 of 200 had no
    // wasteland anchor at all at the old 10 rings); surfaced loudly
    // rather than silently picking a non-anchor point (which would
    // forfeit the structure-free hole). Falls back to the anchor
    // nearest origin that holds no town - it still has the hole, it just
    // won't be wasteland. The old fallback was always the origin anchor,
    // which can now hold a town.
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

// Starter trap showcase (2026-09-12, direct ask: "pre deploy traps in
// the base... disappear after wave 5... tesla coils and other cool
// traps from the tiers, give the player an idea of how and what can be
// built"). Removed again at wave_status.js's STARTER_TRAPS_REMOVAL_WAVE
// - same beat as the starter sword/armor (GEAR_REMOVAL_WAVE there), so
// from wave 5 on the player is defending with defenses they built, not
// ones they inherited. Shared between the fresh-world build path
// (buildStarterBase, below) and the existing-save retrofit in the login
// handler - takes the compound's own wall/gate coordinates as plain
// arguments (both callers already have them, one live, one read back
// off the marker's own td_compoundX0/X1/Z0/Z1) rather than recomputing
// them a second way.
//
// Real gotchas found by decompiling the actual installed jars first
// (immersiveengineering-10.2.0-183, securitycraft-1.10.2.1), not
// guessed:
// - `immersiveengineering:tesla_coil` is a real 2-block multiblock
//   (TeslaCoilBlockEntity implements IHasDummyBlocks). A player placing
//   it triggers placeDummies(), which sets a second "slave" block one
//   space in the facing direction with `multiblockslave=true` (a real
//   registered property, confirmed in TeslaCoilBlock's own
//   m_7926_/createBlockStateDefinition) - a bare /setblock only ever
//   touches the one position it's given, so the slave half is set
//   explicitly below to match what real placement does.
// - Its tickServer() only ever runs when canRun() is true, and canRun()
//   is gated on isRSPowered() (XORed against a redstoneControlInverted
//   flag that starts false) - unlike every other Tier 3 machine this
//   pack has shipped so far, real Forge Energy alone isn't enough, it
//   also needs a live redstone signal. No block placed directly under
//   it here anymore (2026-09-15, direct ask: "if I only want it to
//   attack if enemies are near do I just need a lever to turn it on?")
//   - a permanent redstone_block used to sit there, but tickServer() has
//   zero target-selection logic of its own (see the next bullet), so a
//   lever would only change WHO flips power on, not WHEN - it'd still
//   zap a random living thing the instant it's on. tesla_coil_auto_power.js
//   now owns this position instead: a throttled proximity check swaps
//   redstone_block/air in based on real td_wave_mob presence, the same
//   tag-gated approach every other trap/aggro system in this pack
//   already uses.
// - Real, more important finding: TeslaCoilBlockEntity has NO owner
//   check anywhere in its tick method - it picks ONE RANDOM LivingEntity
//   within a 6-block cube outright (a real `RANDOM.nextInt()` pick, not
//   the closest one - corrected 2026-09-15, tesla_coil_cinematics.js's
//   own header had this right from the start), and applies a lesser
//   residual field effect to everyone else in a 9-block cube, player
//   included, unconditionally. Originally placed at the compound's NE
//   exterior corner (outside the BACK wall) specifically because of
//   this, for maximum distance from the gate/defense line. **Moved to
//   the front wall 2026-09-15 (direct ask: "can the tesla coil be setup
//   at the front part of the perimeter wall")** - still the same 3-block
//   outside-the-wall margin as before, just mirrored to the z1/gate side
//   instead of z0, so it's now visible in the thick of a wave fight
//   rather than tucked away. That margin keeps it ~11-12 blocks from
//   both the fixed spawn point and the gate opening (outside its own
//   9-block residual-field radius), but a player who wanders along the
//   front wall face will come well within zap range - accepted with this
//   ask, not missed. Worth a direct report back after the first live
//   wave defense with it up front.
// - **Moved again, same day: mounted ON TOP of the wall, mirroring the
//   Sentry, instead of freestanding 3 blocks out in front of it** (direct
//   ask: "can the tesla coil be setup on the wall like the sentry, at the
//   front"). The wall is only 1 block thick (confirmed from the wall-
//   build loop just above this function: a single fixed z1 with fx
//   varying - no second thickness column), so the 2-block multiblock
//   can't keep its old north/south orientation up there (both halves
//   would need the SAME z1, one block apart in z, which doesn't fit a
//   1-thick wall) - re-oriented to `facing=west` instead, so both halves
//   sit at the same z1, offset in x, running along the wall's own length
//   the same way the Sentry already does. Placed at doorX+5 (mirroring
//   the Sentry's own doorX-5, on the OTHER side of the gate - keeps them
//   visually spread out rather than stacked on the same spot) at
//   wallY0+3, the exact height the Sentry already stands at. Explicit
//   stone_bricks support placed under both multiblock halves AND the
//   Flux Point, same reasoning as the Sentry's own platform fix just
//   below - the wall-breach RNG can hollow out any column including this
//   one, and an unsupported Tesla Coil sitting over a hole would look
//   broken even if it doesn't technically fall (redstone-powered blocks
//   don't check for gravity, but a floating coil over open sky reads as
//   a bug, not a feature). Real side-effect caught before shipping:
//   tesla_coil_auto_power.js's own redstone toggle used to swap
//   redstone_block/air in the block directly BELOW the coil - harmless
//   underground at the old ground-level spot, but the block below the
//   coil is now the wall's own load-bearing top course, so toggling it
//   to air would punch a hole in the wall every time the coil powers
//   down. Retargeted to the block directly ABOVE the coil instead (open
//   air either way, no structural or wall-breach interaction) - see that
//   script's own updated comment.
// - **Corrected same day, direct follow-up: "the tesla coil is lying on
//   its side. it should be placed upright" + "instead of the redstone
//   block on top of the tesla coil can you make it a lever on the
//   side."** `facing=west` above was a real bug, not a style choice -
//   decompiled the blockstate json directly: `teslacoil_split`'s base
//   model is authored LYING DOWN, and only the `facing=up`/`facing=down`
//   variants apply the x:-90/x:90 rotation that stands it up; every
//   horizontal facing (including the `west` used here) just spins that
//   same lying-down model around the vertical axis. Also re-decompiled
//   `TeslaCoilBlockEntity.placeDummies()` to confirm what "upright" does
//   to the multiblock shape before changing it: the slave half is always
//   placed at `master.relative(getFacing())`, so `facing=up` puts the
//   slave directly ABOVE the master (a real 2-tall vertical machine, the
//   mod's own normal/intended orientation - `getFacingLimitation()`
//   returns `SIDE_CLICKED`, meaning a survival player clicking the TOP of
//   a floor block to place it gets exactly this) instead of beside it.
//   That frees up the old dummy's spot one block west of the master,
//   which is where the lever now goes instead - attached directly to the
//   master's own west face. IE's `isRSPowered()` checks all 6 neighbors
//   (see tesla_coil_auto_power.js's own header), so a lever touching the
//   coil works exactly like the old floating redstone_block above it,
//   just wall-mounted instead of floating and flippable instead of
//   summoned/despawned. The lever block itself is placed once here and
//   never removed - tesla_coil_auto_power.js only ever flips its
//   `powered` state from here on.
// - `securitycraft:electrified_iron_fence` shocks any Player who isn't
//   its owner (or allowlisted) for 6 damage every 20 ticks of contact -
//   decompiled ElectrifiedIronFenceBlock.hurtOrConvertEntity() directly.
//   An unclaimed fence (the default for a console /setblock, same as
//   this pack's existing reinforced-wall blocks) would shock the player
//   too; deliberately left unowned here and claimed on the real player's
//   first login instead (see the owner-assignment block in the login
//   handler below) since no Player object exists yet at this
//   world-build/retrofit point. A mob touching it is neither a Player
//   nor an OwnableEntity, so it takes the block's other branch instead -
//   a real lightning strike - a working "anything that isn't the owner"
//   alarm effect.
// - `securitycraft:sentry` is a real ENTITY (not a block) that
//   self-destroys the instant the block under it isn't solid
//   (Sentry.m_8119_()/tick(), decompiled) - summoned on top of the gate
//   wall, not /setblock, and placed outside the gate's own
//   BREACH_GATE_BUFFER so it's guaranteed solid wall underneath, not a
//   random breach column. Its placement item hardcodes the mode to
//   CAMOUFLAGE_HP (targets players AND mobs) and only reaches
//   AGGRESSIVE_H (mobs-only) via a real player's UseOnContext -
//   sentry_default_mode.js already exists for this (direct 2026-09-11
//   ask) and fires from EntityEvents.spawned, which also covers a plain
//   /summon, so it flips to mobs-only the same tick it's summoned, no
//   new code needed for that part.
// Electrified Iron Fence positions flanking the gate opening, shared
// across placement (placeStarterTraps below), wave-5 removal
// (wave_status.js's STARTER_TRAPS_REMOVAL_WAVE beat) and first-login
// owner assignment (the login handler below) - one source of truth for
// the layout instead of three copies drifting apart. Pure function of
// doorX/wallY0/z1, all independently recoverable from the persisted
// pedestal position (td_pedestalX/Y/Z, z1 = td_pedestalZ + 7 - see the
// retrofit code's own comment), so nothing about the fence itself needs
// its own persisted coordinates.
//
// Originally just 2 single posts at doorX-2/doorX+2 (wallY0 only) - real
// playtest feedback 2026-09-15: "can the fence at the front span the
// entire gap, atm there are only two fence blocks in the corners." Then
// widened to a full gate FRAME (both posts full wall height plus a
// header across the top of the 3-tall opening), leaving the
// doorX-1..doorX+1 span walkable at wallY0/wallY0+1.
//
// **Fully sealed, same day, direct follow-up: "make the fence block the
// front hole in the wall... dont mind if it blocks me in as its just the
// start."** electrified_iron_fence is a plain solid block (confirmed:
// SecurityCraft ships no gate/passable variant of it), so "block the
// hole" now means exactly that - every column doorX-2..doorX+2 (the 2
// original corner posts plus the previously-open doorX-1..doorX+1 gap),
// full wall height, no walkable opening left at all. Simpler than the
// old frame-shaped version too, not just more solid. var, not let/const
// in a loop body - same Rhino redeclaration quirk as pickBreachRanges
// above; fx/fy are declared once via `var fx, fy` outside the loop
// specifically to avoid it.
//
// **Flank holes added 2026-09-22 (three-front fort, docs/FEATURES.md):**
// the two fixed collapsed sections on the flank walls get the gate's
// treatment - boarded with the electrified fence until wave 5 ("every
// hole the previous occupant boarded comes down at wave 5"), the direct
// pick over leaving them open from wave 1. `flanks` is {x0, x1, centerZ}
// on a fort-layout save and null on anything older (see
// starterFenceFlanksFromData below) - on an old save those columns are
// solid wall, and the wave-5 removal would punch holes in it.
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

// Gate wall z for any save. td_compoundZ1 has been persisted at build
// since 2026-09-09; the literal +7 is the pre-fort layout's fixed
// pedestal-to-gate gap and only applies to a save older than that key.
// The fort moved the pedestal to 9 from the gate, so every "+7" that used
// to be scattered across wave_status.js and the login handler reads this
// instead (top-level functions are global across server_scripts files -
// see mob_aggro.js's collision writeup, hence the specific name).
function starterGateWallZ(data) {
  return data.contains('td_compoundZ1') ? data.getInt('td_compoundZ1') : data.getInt('td_pedestalZ') + 7
}

// td_layoutVersion 2 = three-front fort, written at build. getInt on a
// missing key is 0, so every older save falls through to null here.
function starterFenceFlanksFromData(data) {
  if (!data || data.getInt('td_layoutVersion') < 2) return null
  return { x0: data.getInt('td_compoundX0'), x1: data.getInt('td_compoundX1'), centerZ: data.getInt('td_pedestalZ') }
}

function placeStarterTraps(run, x0, x1, z0, z1, doorX, wallY0, flanks) {
  // Wall-mounted, mirroring the Sentry - see this function's header
  // comment for the full reasoning (doorX+5 mirrors the Sentry's own
  // doorX-5 on the other side of the gate; facing=up stands the coil
  // upright, its own multiblock slave stacking directly above it rather
  // than needing a second wall-length column like a horizontal facing
  // would).
  const teslaCoilX = doorX + 5
  const teslaCoilY = wallY0 + 3
  const teslaCoilZ = z1
  const TESLA_FACING = 'up' // stands the coil upright; slave half sits directly above the master (see this function's header comment)
  // Explicit solid support under the coil, regardless of whatever the
  // wall-breach RNG did to this column - same reasoning as the Sentry's
  // own stone_bricks platform below.
  run(`setblock ${teslaCoilX} ${wallY0 + 2} ${teslaCoilZ} minecraft:stone_bricks`)
  // Power block below deliberately NOT placed here - tesla_coil_auto_power.js
  // manages a position dynamically (lever powered=true/false only while a
  // real td_wave_mob is in range), see this function's own header comment.
  run(`setblock ${teslaCoilX} ${teslaCoilY} ${teslaCoilZ} immersiveengineering:tesla_coil[facing=${TESLA_FACING}]`)
  const teslaCoilDummyX = teslaCoilX
  const teslaCoilDummyY = teslaCoilY + 1
  const teslaCoilDummyZ = teslaCoilZ
  run(`setblock ${teslaCoilDummyX} ${teslaCoilDummyY} ${teslaCoilDummyZ} immersiveengineering:tesla_coil[facing=${TESLA_FACING},multiblockslave=true]`)
  // Lever on the master's own west face - the old dummy's spot before the
  // coil stood upright, now free. Placed once here and never removed;
  // tesla_coil_auto_power.js only flips its `powered` state.
  run(`setblock ${teslaCoilX - 1} ${teslaCoilY} ${teslaCoilZ} minecraft:lever[face=wall,facing=west,powered=false]`)
  const teslaFluxPointX = teslaCoilX + 1
  const teslaFluxPointY = teslaCoilY
  const teslaFluxPointZ = teslaCoilZ
  run(`setblock ${teslaFluxPointX} ${wallY0 + 2} ${teslaFluxPointZ} minecraft:stone_bricks`)
  run(`setblock ${teslaFluxPointX} ${teslaFluxPointY} ${teslaFluxPointZ} fluxnetworks:flux_point`)

  // Real bug caught in a sandbox boot, 2026-09-12: 5 blocks clear of the
  // gate opening is outside BREACH_GATE_BUFFER (4), which only keeps
  // breach RANGES from starting inside the gate buffer - it does nothing
  // to stop one from being rolled a few blocks further down the same
  // wall and landing exactly here anyway (real, randomized, confirmed by
  // summoning into an air-breached column on the very first sandbox
  // boot: Sentry.m_8119_() discards itself the instant the block below
  // isn't solid, decompiled - the entity vanished the same tick with no
  // error logged anywhere, silent by design). Fixed by placing the
  // Sentry's own solid platform explicitly, regardless of whatever the
  // wall-breach RNG did to the real wall at this column - the same
  // stone_bricks the compound's own floor already uses elsewhere.
  run(`setblock ${doorX - 5} ${wallY0 + 2} ${z1} minecraft:stone_bricks`)
  // Real second bug caught in the same sandbox pass, on a different
  // fresh-world site (negative X this time): `${doorX - 5}.5` is STRING
  // concatenation, not arithmetic - for a negative doorX-5 (e.g. -1021)
  // it produces the literal text "-1021.5", which is 0.5 more NEGATIVE
  // than -1021, not "-1021 + 0.5" (-1020.5) - so the entity spawned
  // centered over the block one further west/negative than the support
  // block just placed above, standing over nothing. Every other spawn
  // position in this file already does real addition (`centerX + 0.5`,
  // see the marker/fallback-summon code above) - this one now matches.
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

  // Layout, rebuilt 2026-09-22 as the "three-front fort" (docs/FEATURES.md,
  // "Three-front fort" under Base & structures - the live diagnosis, the
  // spawn-band maths and the structure census live there, not here). Gate
  // sits just off the fixed spawn point, 8 open rows of yard run north to
  // the pedestal, 4 more open rows, then the command post, then a back
  // margin closing out the compound. The pedestal is 9 from the gate and
  // 9 from each flank wall by construction; the building is the protected
  // rear. Replaces the Abandoned Brick House layout described below
  // (pedestal 7 from the gate, 17 from the back wall with the whole house
  // in between), whose geometry funnelled every wave onto the gate.
  // Watchtower removed entirely 2026-09-03 (direct request: "it serves no
  // purpose now that we have a better starting structure") - it was never
  // part of the defended perimeter.
  //
  // History of the building this replaces, kept as-is:
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
  // Command post: the_lost_city:cafe4, placed rotated clockwise_90 so its
  // boarded east doorway faces the yard (the placement section below has
  // the rotation mapping). NBT size 9x10x9, real footprint 8 (local x) by
  // 9 (local z); after rotation that is 9 wide (world x) by 8 deep (world
  // z), plus a vine column hanging on the yard face. Decompiled from the
  // mod's own NBT (nbtlib, DataVersion 3465), not guessed.
  const BUILDING_WIDTH = 9
  const BUILDING_DEPTH = 8
  const BUILDING_HEIGHT = 10
  // Open rows between the gate wall and the pedestal (was 7 - the whole
  // reason for the rebuild), and between the pedestal and the building's
  // front face.
  const PEDESTAL_GATE_GAP = 9
  const PEDESTAL_BUILDING_GAP = 4
  // Rows inside the gate that stay empty of free-standing scripted
  // placements - the Sentry's and Tesla Coil's arcs land here. Direct pick
  // ("open kill zone inside the gate"); the inner barricade and work alley
  // offered alongside it were declined. The gate platform's wall-hugging
  // props (further down) are the one thing in this zone. Checked once at
  // build (the console.error below), otherwise a rule for future edits.
  const KILL_ZONE_DEPTH = 6
  // 3 -> 5 with the 9-wide building, so x0/x1 land at x-9/x+9 and both
  // flanks match the gate distance exactly (they were 9 and 8 before).
  const SIDE_MARGIN = 5
  const BACK_MARGIN = 2
  // Gate sits 2 blocks north of the player's own spawn point, not on
  // top of it - a real bug caught before ever reaching the sandbox: a
  // literal door block placed exactly at (x, y, z) would spawn the
  // player inside/on top of a solid door every single login.
  const GATE_OFFSET = 2

  const z1 = z + GATE_OFFSET
  // The pedestal - every other coordinate hangs off it. On the gate's own
  // X, PEDESTAL_GATE_GAP rows in. Persisted further down as
  // td_pedestalX/Y/Z; everything outside this function reads that.
  const centerX = doorX
  const centerZ = z1 - PEDESTAL_GATE_GAP
  const buildingX0 = x - Math.floor(BUILDING_WIDTH / 2)
  const buildingX1 = buildingX0 + BUILDING_WIDTH - 1
  const buildingZ1 = centerZ - PEDESTAL_BUILDING_GAP - 1
  const buildingZ0 = buildingZ1 - BUILDING_DEPTH + 1

  const x0 = buildingX0 - SIDE_MARGIN
  const x1 = buildingX1 + SIDE_MARGIN
  const z0 = buildingZ0 - BACK_MARGIN
  // Border fit (BORDER_START 50 = half-width 25, centred on the spawn):
  // z0 = z-21 against the border's north edge at z-25, 4 blocks clear;
  // x0/x1 = x-9/x+9. Recheck if BUILDING_DEPTH or either gap ever grows.
  if (centerZ > z1 - KILL_ZONE_DEPTH - 1 || buildingZ1 + 1 > z1 - KILL_ZONE_DEPTH - 1) {
    console.error('playtest_starter_kit.js: layout constants put the pedestal or the command post inside the gate kill zone - recheck PEDESTAL_GATE_GAP / PEDESTAL_BUILDING_GAP / KILL_ZONE_DEPTH')
  }

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
    // var, not let/const - same Rhino "redeclaration" quirk as the
    // breach loops below (see pickBreachRanges' own comment); a loop
    // body's let/const that runs more than one iteration isn't safe in
    // this build, even nested inside a forEach callback.
    for (var yStart = VEGETATION_Y_LOW; yStart <= VEGETATION_Y_HIGH; yStart += VEGETATION_Y_CHUNK) {
      var yEnd = Math.min(yStart + VEGETATION_Y_CHUNK - 1, VEGETATION_Y_HIGH)
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

  // "Loads of breaches" pass, 2026-09-10 (direct ask: "can the starting
  // base's perimeter wall be way more delapidated on spawn"). WEAK_WALL
  // above and the gate opening (further down, doorX-1..doorX+1 on the z1
  // wall - already genuinely open, no door block) were the only two
  // deliberate gaps until now. This scatters several more real,
  // full-height holes (wallY0 to wallY1, all air - actually walkable
  // through, not WEAK_WALL's shorter-but-still-2-blocks-solid treatment)
  // around ALL FOUR wall runs, each with a rubble scatter at its outer
  // foot echoing WEAK_WALL's own gravel/cobblestone dressing just below.
  // Kept clear of the wall corners (BREACH_CORNER_BUFFER) and the gate
  // opening (BREACH_GATE_BUFFER on the z1/front wall) so those two
  // landmarks stay readable, and clear of WEAK_WALL's own stretch on the
  // west wall so the two systems never double up in the same spot.
  const BREACH_MIN_WIDTH = 2
  const BREACH_MAX_WIDTH = 3
  const BREACH_CORNER_BUFFER = 3
  const BREACH_GATE_BUFFER = 4
  const BREACHES_PER_WALL = 3
  const BREACH_RUBBLE_BLOCKS = ['minecraft:gravel', 'minecraft:cobblestone', 'minecraft:mossy_cobblestone']

  function breachRangesOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart <= bEnd && aEnd >= bStart
  }

  // Picks up to BREACHES_PER_WALL non-overlapping [start,end] ranges
  // along [coordMin, coordMax], clear of corners and any exclude range.
  // Bounded attempt count rather than a guaranteed count - a short wall
  // or heavy exclusion can legitimately end up with fewer breaches, same
  // bounded-rejection-sampling shape as wave_spawner.js's own
  // randomObjectiveRelativePosition, not a bug if a wall comes up short.
  function pickBreachRanges(coordMin, coordMax, excludeRanges) {
    const picked = []
    const usableMin = coordMin + BREACH_CORNER_BUFFER
    const usableMax = coordMax - BREACH_CORNER_BUFFER
    if (usableMax - usableMin < BREACH_MIN_WIDTH) return picked
    for (let attempt = 0; attempt < BREACHES_PER_WALL * 10 && picked.length < BREACHES_PER_WALL; attempt++) {
      // var, not const/let - this function is called 4x per base build
      // (once per wall) and this exact Rhino build throws "redeclaration
      // of var width" on the 2nd call if these are block-scoped inside a
      // loop body (real crash, 2026-09-11: aborted the whole base build,
      // house included, both at world-start and the login fallback -
      // see this file's own header comment on Rhino let/const quirks).
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

  // Three-front fort, 2026-09-22: one FIXED collapsed section per flank
  // wall, 3 wide, level with the pedestal - full-height air with the same
  // rubble roll as the random breaches ("plain like the existing
  // breaches" was the explicit pick over any ramp/sally-port dressing).
  // Pushed onto the flank breach lists after the random picker runs, so
  // the wall loop, rubble scatter and stake-wall skip below all treat it
  // as a breach with no new code path. The random picker keeps clear of
  // the fixed hole AND the flank firing post beside it (centerZ+2..+4 plus
  // its ladder column at +5 - see the platforms section) so the post
  // always sits on solid wall; the front wall's exclusion widens from the
  // old gate buffer to the whole gate platform (doorX+-7, ladders
  // included).
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

  // var throughout these two wall loops (and every loop below down to
  // the entrance carve) - not let/const. Real crash, 2026-09-11: this
  // exact Rhino build throws "redeclaration of var z0Breach" (and every
  // other loop-body let/const here) once a loop runs a 2nd+ iteration,
  // aborting the whole base build (walls, pedestal, house) partway
  // through. Same fix as pickBreachRanges' own comment above.
  for (var wx = x0; wx <= x1; wx++) {
    var z0Breach = inAnyBreachRange(wx, z0WallBreaches)
    var z1Breach = inAnyBreachRange(wx, z1WallBreaches)
    for (var wy = wallY0; wy <= wallY1; wy++) {
      run(`setblock ${wx} ${wy} ${z0} ${z0Breach ? 'minecraft:air' : perimeterWallBlock(wx, z0)}`)
      run(`setblock ${wx} ${wy} ${z1} ${z1Breach ? 'minecraft:air' : perimeterWallBlock(wx, z1)}`)
    }
    // Rubble at each breach's outer foot, not every column - a scattered
    // pile reads better than a solid debris line the same width as the hole.
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

  for (var wx = x0; wx <= x1; wx += STAKE_WALL_SPACING) {
    // z0 run (back wall) - also skips the new breach columns above, same
    // "stays undefended" reasoning as WEAK_WALL below: a trap guarding an
    // intentional gap defeats the point of it being a gap.
    if (!inAnyBreachRange(wx, z0WallBreaches)) {
      placeStakeWall(wx, wallY0, z0 - 1, 'north')
      placeStakeWall(wx, wallY0 + 1, z0 - 1, 'north')
    }
    // z1 run (gate wall) - skip near the doorX opening and breach columns.
    if (Math.abs(wx - doorX) > STAKE_WALL_GATE_BUFFER && !inAnyBreachRange(wx, z1WallBreaches)) {
      placeStakeWall(wx, wallY0, z1 + 1, 'south')
      placeStakeWall(wx, wallY0 + 1, z1 + 1, 'south')
    }
  }
  for (var wz = z0; wz <= z1; wz += STAKE_WALL_SPACING) {
    // x0 run (west wall) - skip the WEAK_WALL stretch and the new breach
    // columns, all meant to stay undefended (see the comments above).
    if ((wz < WEAK_WALL_Z0 || wz > WEAK_WALL_Z1) && !inAnyBreachRange(wz, x0WallBreaches)) {
      placeStakeWall(x0 - 1, wallY0, wz, 'west')
      placeStakeWall(x0 - 1, wallY0 + 1, wz, 'west')
    }
    if (!inAnyBreachRange(wz, x1WallBreaches)) {
      placeStakeWall(x1 + 1, wallY0, wz, 'east')
      placeStakeWall(x1 + 1, wallY0 + 1, wz, 'east')
    }
  }

  // Entrance changed 2026-09-04 (direct ask, real playtest feedback
  // batch): genuinely open 3-wide, 3-tall gap, no door block at all -
  // was a single 1-wide oak_door.
  for (var wx = doorX - 1; wx <= doorX + 1; wx++) {
    for (var wy = wallY0; wy <= wallY0 + 2; wy++) {
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
  // centerX/centerZ come from the layout constants at the top of this
  // function (PEDESTAL_GATE_GAP - 9 rows in from the gate as of the
  // 2026-09-22 fort; the "z1-7" this comment block describes is history).
  run(`setblock ${centerX} ${wallY0} ${centerZ} supplementaries:pedestal`)
  // The Waystone sits beside the command post's door - placed right after
  // the template below. It has to come AFTER the template: a structure's
  // NBT stores explicit air for every cell it covers, so anything placed
  // inside its box first gets silently wiped by /place template.

  // No campfires or fire props anywhere in this build - direct request,
  // dropped entirely rather than reduced. The old braziers were called
  // out by name as part of what read badly ("hot garbage... campfires
  // specifically") - this isn't an oversight, it's the ask. cafe4's own
  // baked campfire is stripped below for the same reason.

  // Grave markers removed entirely 2026-09-04 (direct ask, real
  // playtest feedback batch) - a knowing call, not a missed-context
  // one: these carried real flavor-text intent (reinforcing "whoever
  // held this before you," wave 5's gear-removal beat in
  // wave_status.js) and that tie-in is being dropped on purpose, per
  // explicit confirmation, not because it went unrecognized.

  // Command post: the_lost_city:cafe4 (2026-09-22, docs/FEATURES.md's
  // "Three-front fort" - replaces the Abandoned Brick House; every
  // Brick-House-specific fixup that used to live here (sponge layer, sink
  // water, bookcase/terracotta/trapdoor-bed clearing, green roof patch,
  // counter logs, HOUSE_REINFORCE_BLOCKS) went with it - each one was a
  // coordinate inside that one NBT, nothing else read them). Picked from
  // a census of all 658 structure NBTs in the installed jars (247 with a
  // footprint <= 12; the other finalists were house_with_car and the
  // clean cafe0): 9x10x9 NBT, real footprint 8x9, cyan terracotta over
  // stone brick, 45 vines, boarded windows, and the last occupant's
  // smithing table / cartography table / stonecutter / crafting table
  // still inside - the "someone held out here" read the brief asked for.
  // Every coordinate below was read from the NBT layer by layer
  // (nbtlib), same discipline as the Brick House before it.
  //
  // Rotation: the NBT's one doorway is on its local EAST wall (x=7); the
  // yard is SOUTH of the building, so it's placed `clockwise_90` (east ->
  // south). Vanilla rotates about the placement pos with a zero pivot,
  // so local (lx, ly, lz) -> world (pos.x - lz, pos.y + ly, pos.z + lx) -
  // the footprint extends to NEGATIVE x from the placement pos. Placing
  // at (buildingX1, floorY, buildingZ0) therefore lands it exactly on
  // buildingX0..buildingX1 / buildingZ0..buildingZ1, with the local-x=8
  // vine column hanging one row further south on the yard face.
  // cafeLocal() is the one place that mapping lives; every post-
  // placement coordinate in this section is written in the NBT's own
  // local space so it can be checked against the decompile directly.
  //
  // Placed at floorY, not wallY0: local y=0 is a full 9x9 stone-brick
  // foundation pad (flush with the levelled ground), so the walkable
  // ground floor (local y=1) lines up with the yard at wallY0 - the same
  // convention, and the same off-by-one bug class, as the Brick House.
  function cafeLocal(lx, ly, lz) {
    return { x: buildingX1 - lz, y: floorY + ly, z: buildingZ0 + lx }
  }
  run(`place template the_lost_city:cafe4 ${buildingX1} ${floorY} ${buildingZ0} clockwise_90`)

  // The mod's file bakes 4 villagers (cartographer/toolsmith/mason/none,
  // spawn-egg captures from the author's own world) and /place template
  // places entities. no_passive_mobs.js deliberately spares villagers
  // (TFTH's Flesh Villager needs real ones) and zombies target villagers
  // (the village-spacing finding), so they're stripped at the source:
  // data/the_lost_city/structures/cafe4.nbt in this pack is the mod's own
  // file with `entities` emptied, the same technique as the 2026-09-04
  // pack-wide pass (which never covered this file). Natural Lost City
  // cafes lose those 4 traders too - accepted.
  //
  // Same spawner sweep as before (a structure-danger spawner must never
  // end up inside the base) - cafe4 has none; kept for any future swap.
  run(`fill ${buildingX0} ${floorY} ${buildingZ0} ${buildingX1} ${floorY + BUILDING_HEIGHT} ${buildingZ1 + 1} minecraft:air replace minecraft:spawner`)

  // Post-placement fixups, generated from the NBT with the rotation
  // applied: world offsets from (buildingX0, floorY, buildingZ0), block
  // properties rotated with the structure (a fence that ran north-south
  // in the file runs east-west in the world).
  // - jigsaw (local 0,0,8) and the sunk pre-filled chest (1,0,6) in the
  //   foundation -> reinforced stone bricks; the upstairs chest (6,5,7)
  //   carried berezka_api:chests/berezkahousesmall_0 -> air ("loot lives
  //   outside the border, not at home", 2026-09-04); campfire (3,5,5) ->
  //   air; the 3 lime wall banners on the yard face -> air.
  // - doorway: the two boarding fences at (7,1..2,4) -> a real dark oak
  //   door (cafe0's own door block), dead centre of the yard face on the
  //   pedestal's X - the inner chokepoint. Ground-floor boards elsewhere
  //   stay: solid to mobs, no second entrance.
  // - upstairs windows, direct pick "glass on the yard face only": the 14
  //   boards on the yard face -> glass; the 26 intact panes on the back
  //   and west-flank walls -> boards. Three boarded sides, one glass side
  //   looking down the yard to the gate.
  // - every board and pane -> its SecurityCraft reinforced twin, exact
  //   connection state preserved (a blanket /fill would flatten them).
  // The full-block shell (cyan terracotta, stone bricks, mossy stone
  // bricks, moss, andesite roof slabs) is reinforced by the replace-fills
  // right after - rotation-invariant blocks, no per-cell list needed.
  // Checked against the SecurityCraft jar's 632 blockstates: 21 of the 24
  // block types in this NBT have a real reinforced id; the 95
  // smooth_stone_slab floor/roof cells don't and stay vanilla (a digger
  // never reaches them). A more complete shell than the Brick House's 75%.
  const CAFE4_FIXUPS = [
    [0, 0, 0, 'securitycraft:reinforced_stone_bricks'],  // jigsaw
    [2, 0, 1, 'securitycraft:reinforced_stone_bricks'],  // sunk pre-filled chest
    [1, 5, 6, 'minecraft:air'],  // upstairs berezka loot chest
    [3, 5, 3, 'minecraft:air'],  // campfire
    [5, 4, 8, 'minecraft:air'],  // lime wall banner
    [4, 4, 8, 'minecraft:air'],  // lime wall banner
    [3, 4, 8, 'minecraft:air'],  // lime wall banner
    [4, 1, 7, 'minecraft:dark_oak_door[facing=south,half=lower,hinge=left]'],  // doorway
    [4, 2, 7, 'minecraft:dark_oak_door[facing=south,half=upper,hinge=left]'],  // doorway
    [7, 2, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [6, 2, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [2, 2, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [1, 2, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [7, 3, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [6, 3, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [2, 3, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [1, 3, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [7, 6, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],  // back window boarded (was glass)
    [6, 6, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],  // back window boarded (was glass)
    [5, 6, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],  // back window boarded (was glass)
    [4, 6, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],  // back window boarded (was glass)
    [3, 6, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],  // back window boarded (was glass)
    [2, 6, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],  // back window boarded (was glass)
    [1, 6, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],  // back window boarded (was glass)
    [7, 7, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],  // back window boarded (was glass)
    [6, 7, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],  // back window boarded (was glass)
    [5, 7, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],  // back window boarded (was glass)
    [4, 7, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],  // back window boarded (was glass)
    [3, 7, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],  // back window boarded (was glass)
    [2, 7, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],  // back window boarded (was glass)
    [1, 7, 0, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],  // back window boarded (was glass)
    [8, 2, 1, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 3, 1, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 6, 1, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 6, 1, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],  // west-flank window boarded (was glass)
    [8, 7, 1, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 7, 1, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],  // west-flank window boarded (was glass)
    [8, 2, 2, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [5, 2, 2, 'securitycraft:reinforced_birch_fence[east=false,north=false,south=false,west=false]'],
    [2, 2, 2, 'securitycraft:reinforced_birch_fence[east=false,north=false,south=false,west=false]'],
    [8, 3, 2, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [6, 5, 2, 'securitycraft:reinforced_birch_fence[east=false,north=false,south=true,west=false]'],
    [8, 6, 2, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 6, 2, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],  // west-flank window boarded (was glass)
    [8, 7, 2, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 7, 2, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],  // west-flank window boarded (was glass)
    [6, 5, 3, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 6, 3, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 6, 3, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],  // west-flank window boarded (was glass)
    [8, 7, 3, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 7, 3, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],  // west-flank window boarded (was glass)
    [6, 5, 4, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 6, 4, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 6, 4, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],  // west-flank window boarded (was glass)
    [8, 7, 4, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 7, 4, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],  // west-flank window boarded (was glass)
    [8, 2, 5, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 3, 5, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [6, 5, 5, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 6, 5, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 6, 5, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],  // west-flank window boarded (was glass)
    [8, 7, 5, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 7, 5, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],  // west-flank window boarded (was glass)
    [1, 1, 6, 'securitycraft:reinforced_birch_fence[east=false,north=false,south=true,west=true]'],
    [8, 2, 6, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 3, 6, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [6, 5, 6, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [8, 6, 6, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 6, 6, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],  // west-flank window boarded (was glass)
    [8, 7, 6, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],
    [0, 7, 6, 'securitycraft:reinforced_birch_fence[east=false,north=true,south=true,west=false]'],  // west-flank window boarded (was glass)
    [7, 2, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [6, 2, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [2, 2, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [1, 2, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [7, 3, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [6, 3, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [2, 3, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [1, 3, 7, 'securitycraft:reinforced_birch_fence[east=true,north=false,south=false,west=true]'],
    [7, 6, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],  // yard-face window (was board)
    [6, 6, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],  // yard-face window (was board)
    [5, 6, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],  // yard-face window (was board)
    [4, 6, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],  // yard-face window (was board)
    [3, 6, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],  // yard-face window (was board)
    [2, 6, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],  // yard-face window (was board)
    [1, 6, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],  // yard-face window (was board)
    [7, 7, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],  // yard-face window (was board)
    [6, 7, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],  // yard-face window (was board)
    [5, 7, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],  // yard-face window (was board)
    [4, 7, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],  // yard-face window (was board)
    [3, 7, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],  // yard-face window (was board)
    [2, 7, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],  // yard-face window (was board)
    [1, 7, 7, 'securitycraft:reinforced_glass_pane[east=true,north=false,south=false,west=true]'],  // yard-face window (was board)
  ]
  CAFE4_FIXUPS.forEach(([dx, dy, dz, block]) => {
    run(`setblock ${buildingX0 + dx} ${floorY + dy} ${buildingZ0 + dz} ${block}`)
  })
  ;[
    ['minecraft:cyan_terracotta', 'securitycraft:reinforced_cyan_terracotta'],
    ['minecraft:stone_bricks', 'securitycraft:reinforced_stone_bricks'],
    ['minecraft:mossy_stone_bricks', 'securitycraft:reinforced_mossy_stone_bricks'],
    ['minecraft:moss_block', 'securitycraft:reinforced_moss_block'],
    ['minecraft:andesite_slab[type=bottom]', 'securitycraft:reinforced_andesite_slab[type=bottom]'],
    ['minecraft:andesite_slab[type=double]', 'securitycraft:reinforced_andesite_slab[type=double]'],
  ].forEach(([from, to]) => {
    run(`fill ${buildingX0} ${floorY} ${buildingZ0} ${buildingX1} ${floorY + BUILDING_HEIGHT - 1} ${buildingZ1} ${to} replace ${from}`)
  })

  // Interior, in NBT-local coordinates through cafeLocal():
  // - crafting table (3,1,4) -> Crafting Station Improved's real block,
  //   same swap as before (single-variant; waterlogged forced off - the
  //   inherited-water bug class from the Brick House's sink).
  // - power rig behind the bar counter, against the back wall: culinary
  //   generator (1,1,4) with the flux plug stacked on it (1,2,4) and the
  //   basic flux storage one tile over (1,1,5) - the same relative shape
  //   starter_flux_network.js links (the Plug reads the generator's Forge
  //   Energy capability off the shared face, no cabling), on the ground
  //   floor now ("power gear inside, not bolted to the exterior"). Both
  //   cells are open floor behind the counter in the decompile.
  // - storage flanking the inside of the doorway: an empty double chest
  //   at (6,1,2)+(6,1,3) and 4 empty barrels at (6,1..2,5..6). All eight
  //   cells are air with air above in the NBT (a chest under a solid
  //   block won't open). Chest halves face north (into the room; local
  //   west). ChestBlock's own rule: `facing.getClockWise() ==
  //   connectingDirection ? LEFT : RIGHT` - north's clockwise is east, so
  //   the west half (pair to its east) is LEFT and the east half RIGHT;
  //   local z=3 lands west of local z=2 after the rotation.
  // - the smithing table, cartography table and stonecutter stay where
  //   the occupant left them.
  const craftingStationPos = cafeLocal(3, 1, 4)
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
  run(`setblock ${bioGeneratorX} ${bioGeneratorY} ${bioGeneratorZ} generatorgalore:culinary_generator`)
  run(`setblock ${fluxPlugX} ${fluxPlugY} ${fluxPlugZ} fluxnetworks:flux_plug`)
  run(`setblock ${fluxBatteryX} ${fluxBatteryY} ${fluxBatteryZ} fluxnetworks:basic_flux_storage`)
  const chestEastPos = cafeLocal(6, 1, 2)
  const chestWestPos = cafeLocal(6, 1, 3)
  run(`setblock ${chestWestPos.x} ${chestWestPos.y} ${chestWestPos.z} minecraft:chest[facing=north,type=left,waterlogged=false]`)
  run(`setblock ${chestEastPos.x} ${chestEastPos.y} ${chestEastPos.z} minecraft:chest[facing=north,type=right,waterlogged=false]`)
  ;[[6, 1, 5], [6, 1, 6], [6, 2, 5], [6, 2, 6]].forEach(([lx, ly, lz]) => {
    var barrelPos = cafeLocal(lx, ly, lz)
    run(`setblock ${barrelPos.x} ${barrelPos.y} ${barrelPos.z} minecraft:barrel[facing=north,open=false]`)
  })

  // Pre-placed Waystone (2026-09-05 ask: one real, findable Waystone from
  // the start) - outside, beside the door on the yard face, replacing one
  // of the hanging vines (local (8,1,2)/(8,2,2): the vine column is the
  // only thing in that row). Two-block structure, both halves set
  // explicitly (real bug fixed 2026-09-05: a bare /setblock only creates
  // the default half=lower state and never touches the block above).
  // Faces south so its front looks out over the yard. Two blocks east of
  // the door - the quest book's "Waystone in the courtyard" still reads
  // true.
  const waystoneLowerPos = cafeLocal(8, 1, 2)
  const waystoneUpperPos = cafeLocal(8, 2, 2)
  run(`setblock ${waystoneLowerPos.x} ${waystoneLowerPos.y} ${waystoneLowerPos.z} waystones:waystone[facing=south,half=lower]`)
  run(`setblock ${waystoneUpperPos.x} ${waystoneUpperPos.y} ${waystoneUpperPos.z} waystones:waystone[facing=south,half=upper]`)

  // Wave Horn note block - a physical fixture in the base itself;
  // wave_spawner.js's BlockEvents.rightClicked matches on this exact
  // position (td_waveNoteBlockX/Y/Z, persisted below), same "specific
  // placed block, not every block of this type" pattern the pedestal
  // uses. Upstairs at the yard-face window, on the pedestal's X (local
  // (6,5,4): open floor beside the glass), looking straight down the
  // yard to the gate - the "horn with a view of the yard" line of the
  // command-post brief. The kubejs:wave_horn item was removed 2026-09-13
  // ("now that the wave horn is a block, no need for the item"), so this
  // block is the only way to sound the horn.
  const hornPos = cafeLocal(6, 5, 4)
  const waveNoteBlockX = hornPos.x
  const waveNoteBlockY = hornPos.y
  const waveNoteBlockZ = hornPos.z
  run(`setblock ${waveNoteBlockX} ${waveNoteBlockY} ${waveNoteBlockZ} minecraft:note_block`)

  // Starter trap showcase - see placeStarterTraps()'s own header comment
  // above for the full mechanism/gotcha writeup. The flank holes get the
  // gate's wave-5 fence too (fort layout - td_layoutVersion 2 below).
  const starterTraps = placeStarterTraps(run, x0, x1, z0, z1, doorX, wallY0, { x0: x0, x1: x1, centerZ: centerZ })

  // Wall-top firing platforms (2026-09-22, docs/FEATURES.md's "Three-front
  // fort") - the answer to "do I need stairs going to the walls with
  // ramparts and platforms": three small platforms, not a rampart. The
  // wall stays 1 thick and 3 tall everywhere. Each platform is the wall's
  // own top course plus one row of planks bracketed onto the INSIDE face
  // at the same height (standing surface wallY0+3, level with where the
  // Sentry and Tesla Coil already stand), a knee-high slab lip on the
  // wall top for cover (rubble, not a parapet), scaffolding props under
  // some of the plank cells, and a real minecraft:ladder on the inside
  // face. The real ladder block on purpose, not stairs or scaffolding:
  // ladder_climb_assist.js only steers wave mobs up `minecraft:ladder`,
  // which keeps a platform contestable instead of a permanent safe zone.
  // Inside face only - an outside ladder hands every mob a route up.
  //
  // Gate platform: two halves flanking the 3-wide opening (doorX-6..-2
  // and doorX+2..+6), deliberately NOT bridged over it - a bridge at
  // wall-top height caps the opening at 2 tall, which the wide mutants
  // can't fit through (every one of them would take the flank holes
  // instead). Cover slabs skip the wall-top cells already taken: the
  // Sentry (doorX-5), the coil's lever (doorX+4), the coil (doorX+5) and
  // its flux point (doorX+6), and the starter-fence columns (doorX+-2)
  // that turn to air at wave 5. Ladders at doorX-7 / doorX+7.
  // Flank posts: the 3 columns just gate-ward of each fixed collapsed
  // section (centerZ+2..+4), overlooking the hole and the gate approach,
  // ladder at centerZ+5. The random breach picker keeps every column a
  // platform or ladder needs solid (FLANK_RESERVED_*, GATE_PLATFORM_REACH
  // above). The plank row sits one row inside the wall - inside
  // KILL_ZONE_DEPTH for the gate platform, but hugging the wall face, not
  // in the field of fire; its props are the one scripted thing in that
  // zone.
  const PLATFORM_FLOOR_BLOCKS = ['minecraft:spruce_planks', 'minecraft:spruce_planks', 'minecraft:oak_planks', 'minecraft:stripped_spruce_log[axis=y]']
  const PLATFORM_COVER_BLOCKS = ['minecraft:cobblestone_slab[type=bottom]', 'minecraft:mossy_cobblestone_slab[type=bottom]', 'minecraft:stone_brick_slab[type=bottom]']
  const PLATFORM_SUPPORT_CHANCE = 0.4
  function platformPick(list) {
    return list[Math.floor(Math.random() * list.length)]
  }
  // cells: [wallX, wallZ, plankX, plankZ, coverAllowed]; the ladder column
  // at (ladderX, ladderZ) hangs on the wall's inside face, facing away
  // from it. var throughout - this runs 4x per build (see the Rhino
  // let/const-in-loop crash note on pickBreachRanges).
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
    // Wave Horn note block's own fixed position - see this function's
    // earlier waveNoteBlockX/Y/Z placement for the full comment.
    worldD.putInt('td_waveNoteBlockX', waveNoteBlockX)
    worldD.putInt('td_waveNoteBlockY', waveNoteBlockY)
    worldD.putInt('td_waveNoteBlockZ', waveNoteBlockZ)
    // Layout generation (2026-09-22): 2 = three-front fort. Read by
    // starterFenceFlanksFromData() - the flank-hole fences only exist on
    // this layout, and an older save must never have the wave-5 removal
    // set air into its solid flank walls.
    worldD.putInt('td_layoutVersion', 2)
    // Every one-shot old-save migration in the login handler is marked
    // done at build. They all recompute "where the old layout put X" from
    // td_pedestalX/Y/Z with fixed offsets (rig at pedZ-10, coil on the
    // pedZ+7 wall) - right for the saves they were written for, wrong for
    // this layout, and two of them (the power-rig and trap relocations)
    // would otherwise fire on this world's very first login and move
    // fixtures that are already where they belong.
    worldD.putBoolean('td_starterPowerRigRelocated', true)
    worldD.putBoolean('td_starterTrapsRelocated', true)
    worldD.putBoolean('td_starterTeslaCoilUpright', true)
  }

  // Starter power rig coordinates (blocks already placed above) - read by
  // starter_flux_network.js's login handler to create the real Flux
  // Network and link these 3 blocks into it (deferred to login since
  // createNetwork needs a real Player, and none exists during world-build).
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

    // Starter trap showcase coordinates - read by wave_status.js's
    // STARTER_TRAPS_REMOVAL_WAVE beat to clear them again, and by
    // starter_flux_network.js's login handler to link the Tesla Coil's
    // Flux Point into the same "House Grid" network as the power rig
    // above (wireless - no proximity to the generator required).
    worldD.putInt('td_starterTeslaCoilX', starterTraps.teslaCoilX)
    worldD.putInt('td_starterTeslaCoilY', starterTraps.teslaCoilY)
    worldD.putInt('td_starterTeslaCoilZ', starterTraps.teslaCoilZ)
    worldD.putInt('td_starterTeslaCoilDummyX', starterTraps.teslaCoilDummyX)
    worldD.putInt('td_starterTeslaCoilDummyY', starterTraps.teslaCoilDummyY)
    worldD.putInt('td_starterTeslaCoilDummyZ', starterTraps.teslaCoilDummyZ)
    worldD.putInt('td_starterTeslaFluxPointX', starterTraps.teslaFluxPointX)
    worldD.putInt('td_starterTeslaFluxPointY', starterTraps.teslaFluxPointY)
    worldD.putInt('td_starterTeslaFluxPointZ', starterTraps.teslaFluxPointZ)
    // No td_starterFence* keys - starterFencePositions() derives the whole
    // fence frame straight from td_pedestalX/Y/Z on demand (wave_status.js's
    // removal beat, the owner-assignment block below), same "don't persist
    // what's already a pure function of the pedestal" reasoning the power
    // rig retrofit above already uses.
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

  // House reinforcement now lives in the command-post section above
  // (2026-09-22): replace-fills for the full-block shell plus the
  // per-cell CAFE4_FIXUPS list for boards and panes. The old
  // HOUSE_REINFORCE_BLOCKS list (212 cells, 2026-09-04) was a per-cell
  // map of the Abandoned Brick House's own NBT and went with that
  // building.

  // Pre-placed Tier 1 kinetic rig - removed 2026-09-11 along with Create
  // and Create Addition entirely (direct feedback: Barbed Wire felt
  // redundant next to the new SecurityCraft trap roster, and Create's
  // only other live use, the Tier 3 Flamethrower Nozzle quest, was cut
  // with it - see docs/MODS.md's Removed mods section). The Rolling
  // Mill/Depot/Mechanical Press this used to place here are gone; no
  // replacement rig placed.

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

    // Retroactive starter power rig, 2026-09-11 - real playtest report
    // ("not seeing the generator and the flux plug"): this save's base
    // was already built (existingMarker exists) by a version of
    // buildStarterBase from before the power rig existed, so the
    // world-build gate above (which only fires once per world, ever)
    // never re-runs and this save never got the 3 blocks or the
    // td_bioGenerator*/td_fluxPlug*/td_fluxBattery* keys starter_flux_
    // network.js needs. Gated on worldD's own td_bioGeneratorX key
    // rather than a separate flag - a genuinely fresh world already has
    // it (buildStarterBase writes it directly), so this only ever does
    // anything on an old save, and only once (the write below makes
    // every later login see the key and skip straight past). Coordinates
    // reconstructed from td_pedestalX/Y/Z with the same fixed offsets
    // buildStarterBase itself derives them through (doorX/wallY0/z1 ->
    // buildingX0/floorY/buildingZ0 -> the rig's own +8/+5/+4/+7/-11
    // offsets) since BUILDING_WIDTH/GATE_OFFSET/etc. aren't in scope
    // here - see that function's power-rig section for the real numbers.
    // X offsets updated 2026-09-15 alongside the live "move the flux
    // network into the corner" rework (buildStarterBase's own comment) -
    // this retrofit only ever fires for a save that never got the rig at
    // all, so it should place it straight at the new canonical spot, not
    // the superseded one.
    //
    // Offsets updated again same day, alongside the near-the-balcony
    // relocation (buildStarterBase's own comment has the full reasoning,
    // including the same-day interior-vs-exterior correction) -
    // pedX-6=buildingX0, pedY-1=floorY, pedZ-15=buildingZ0 (verified
    // against this same retrofit's own pre-existing offsets before this
    // edit: buildingX0+8=pedX+2 -> buildingX0=pedX-6, etc.), so the new
    // buildingX0+7/floorY+5/buildingZ0+5 (generator) becomes pedX+1/
    // pedY+4/pedZ-10 here.
    var worldD = existingMarker.persistentData
    if (!worldD.contains('td_bioGeneratorX')) {
      var pedX = worldD.getInt('td_pedestalX')
      var pedY = worldD.getInt('td_pedestalY')
      var pedZ = worldD.getInt('td_pedestalZ')
      var rigBioGeneratorX = pedX + 1
      var rigBioGeneratorY = pedY + 4
      var rigBioGeneratorZ = pedZ - 10
      var rigFluxPlugX = rigBioGeneratorX
      var rigFluxPlugY = rigBioGeneratorY + 1
      var rigFluxPlugZ = rigBioGeneratorZ
      var rigFluxBatteryX = pedX + 2
      var rigFluxBatteryY = pedY + 4
      var rigFluxBatteryZ = pedZ - 10
      server.runCommandSilent(`setblock ${rigBioGeneratorX} ${rigBioGeneratorY} ${rigBioGeneratorZ} generatorgalore:culinary_generator`)
      server.runCommandSilent(`setblock ${rigFluxPlugX} ${rigFluxPlugY} ${rigFluxPlugZ} fluxnetworks:flux_plug`)
      server.runCommandSilent(`setblock ${rigFluxBatteryX} ${rigFluxBatteryY} ${rigFluxBatteryZ} fluxnetworks:basic_flux_storage`)
      worldD.putInt('td_bioGeneratorX', rigBioGeneratorX)
      worldD.putInt('td_bioGeneratorY', rigBioGeneratorY)
      worldD.putInt('td_bioGeneratorZ', rigBioGeneratorZ)
      worldD.putInt('td_fluxPlugX', rigFluxPlugX)
      worldD.putInt('td_fluxPlugY', rigFluxPlugY)
      worldD.putInt('td_fluxPlugZ', rigFluxPlugZ)
      worldD.putInt('td_fluxBatteryX', rigFluxBatteryX)
      worldD.putInt('td_fluxBatteryY', rigFluxBatteryY)
      worldD.putInt('td_fluxBatteryZ', rigFluxBatteryZ)
      // giveStarterKit (below) already gave this returning player their
      // one-time kit long ago (td_playtestKitGiven is already true), so
      // its own new flux_configurator line never reaches them - give it
      // directly here instead, same fallback-linking-tool reasoning as
      // starter_flux_network.js's own header comment.
      player.give(Item.of('fluxnetworks:flux_configurator', 1))
      console.log(`playtest_starter_kit.js: retrofitted starter power rig onto a pre-existing world at (${rigBioGeneratorX}, ${rigBioGeneratorY}, ${rigBioGeneratorZ}) - starter_flux_network.js will link it on this same login`)
    }

    // Live relocation, 2026-09-15, same day as the near-the-balcony
    // rework above - a save that already HAD the rig (built upstairs by
    // an earlier version of this same file, this same session) needs its
    // 3 physical blocks actually moved, not just new fresh-build code
    // that a once-per-world gate will never re-run for it. Gated on a
    // dedicated one-shot flag so it only ever attempts once; the inner
    // check only proceeds if a rig genuinely exists yet at this point in
    // THIS login (it does, only if it predates this fix - the retrofit
    // right above, and buildStarterBase itself, both already place a
    // fresh rig straight at the new position, and neither has run yet by
    // this point if this save had no rig at all).
    if (!worldD.getBoolean('td_starterPowerRigRelocated')) {
      worldD.putBoolean('td_starterPowerRigRelocated', true)
      if (worldD.contains('td_bioGeneratorX')) {
        var oldGenX = worldD.getInt('td_bioGeneratorX')
        var oldGenY = worldD.getInt('td_bioGeneratorY')
        var oldGenZ = worldD.getInt('td_bioGeneratorZ')
        var oldPlugX = worldD.getInt('td_fluxPlugX')
        var oldPlugY = worldD.getInt('td_fluxPlugY')
        var oldPlugZ = worldD.getInt('td_fluxPlugZ')
        var oldBattX = worldD.getInt('td_fluxBatteryX')
        var oldBattY = worldD.getInt('td_fluxBatteryY')
        var oldBattZ = worldD.getInt('td_fluxBatteryZ')
        // Old spot was open upstairs floor before the rig ever existed
        // (buildStarterBase's own comment on the old x=7/8 corner) - air
        // restores exactly that.
        server.runCommandSilent(`setblock ${oldGenX} ${oldGenY} ${oldGenZ} minecraft:air`)
        server.runCommandSilent(`setblock ${oldPlugX} ${oldPlugY} ${oldPlugZ} minecraft:air`)
        server.runCommandSilent(`setblock ${oldBattX} ${oldBattY} ${oldBattZ} minecraft:air`)

        var newGenX = worldD.getInt('td_pedestalX') + 1
        var newGenY = worldD.getInt('td_pedestalY') + 4
        var newGenZ = worldD.getInt('td_pedestalZ') - 10
        var newPlugX = newGenX
        var newPlugY = newGenY + 1
        var newPlugZ = newGenZ
        var newBattX = worldD.getInt('td_pedestalX') + 2
        var newBattY = worldD.getInt('td_pedestalY') + 4
        var newBattZ = worldD.getInt('td_pedestalZ') - 10
        server.runCommandSilent(`setblock ${newGenX} ${newGenY} ${newGenZ} generatorgalore:culinary_generator`)
        server.runCommandSilent(`setblock ${newPlugX} ${newPlugY} ${newPlugZ} fluxnetworks:flux_plug`)
        server.runCommandSilent(`setblock ${newBattX} ${newBattY} ${newBattZ} fluxnetworks:basic_flux_storage`)
        worldD.putInt('td_bioGeneratorX', newGenX)
        worldD.putInt('td_bioGeneratorY', newGenY)
        worldD.putInt('td_bioGeneratorZ', newGenZ)
        worldD.putInt('td_fluxPlugX', newPlugX)
        worldD.putInt('td_fluxPlugY', newPlugY)
        worldD.putInt('td_fluxPlugZ', newPlugZ)
        worldD.putInt('td_fluxBatteryX', newBattX)
        worldD.putInt('td_fluxBatteryY', newBattY)
        worldD.putInt('td_fluxBatteryZ', newBattZ)

        // The old tile entities are gone the moment the blocks above were
        // cleared, taking whatever network membership they had with them
        // - re-linking fresh rather than trying to preserve the old
        // network id. starter_flux_network.js's own linkStarterFluxNetwork
        // (pulled out into a shared function for exactly this call, see
        // its own header comment) creates a new "House Grid" network and
        // connects the Plug/Battery at their now-current coordinates plus
        // the starter Tesla Coil's own Flux Point - called directly
        // rather than resetting td_starterFluxNetworkLinked and hoping a
        // second, separately-registered PlayerEvents.loggedIn listener in
        // another file fires after this one; relative ordering between
        // two such listeners for the same event isn't something to rely on.
        linkStarterFluxNetwork(player, level, worldD)
        console.log(`playtest_starter_kit.js: relocated starter power rig from (${oldGenX}, ${oldGenY}, ${oldGenZ}) to (${newGenX}, ${newGenY}, ${newGenZ}) and re-linked its Flux Network`)
      }
    }

    // Retroactive starter trap showcase, 2026-09-12 - same "old save
    // never got a new base fixture" reasoning as the power rig retrofit
    // just above, but simpler: any marker that already has
    // td_bioGeneratorX also already carries td_compoundX0/X1/Z0/Z1
    // (persisted since 2026-09-09, well before either feature) and
    // td_pedestalX/Y/Z, which is everything placeStarterTraps() needs -
    // no hand-rederived wall math required this time, just read the
    // real numbers straight off the marker.
    //
    // Skipped once the world's already past GEAR_REMOVAL_WAVE
    // (td_starterGearRemoved) - wave_status.js's own removal beat can
    // only ever fire again AT wave 5, and waveNumber only goes up, so a
    // save already further along than that would get starter traps that
    // could never be cleared again. Placing nothing there is correct,
    // not a gap: the narrative beat ("whoever held this before you") has
    // already played out on that save.
    if (worldD.contains('td_compoundX0') && !worldD.contains('td_starterTeslaCoilX') && !worldD.getBoolean('td_starterGearRemoved')) {
      var retrofitTraps = placeStarterTraps(
        function (cmd) { server.runCommandSilent(cmd) },
        worldD.getInt('td_compoundX0'), worldD.getInt('td_compoundX1'),
        worldD.getInt('td_compoundZ0'), worldD.getInt('td_compoundZ1'),
        worldD.getInt('td_pedestalX'), worldD.getInt('td_pedestalY'),
        // Pre-fort save (the only kind this retrofit can reach) - no flank holes to board.
        null
      )
      worldD.putInt('td_starterTeslaCoilX', retrofitTraps.teslaCoilX)
      worldD.putInt('td_starterTeslaCoilY', retrofitTraps.teslaCoilY)
      worldD.putInt('td_starterTeslaCoilZ', retrofitTraps.teslaCoilZ)
      worldD.putInt('td_starterTeslaCoilDummyX', retrofitTraps.teslaCoilDummyX)
      worldD.putInt('td_starterTeslaCoilDummyY', retrofitTraps.teslaCoilDummyY)
      worldD.putInt('td_starterTeslaCoilDummyZ', retrofitTraps.teslaCoilDummyZ)
      worldD.putInt('td_starterTeslaFluxPointX', retrofitTraps.teslaFluxPointX)
      worldD.putInt('td_starterTeslaFluxPointY', retrofitTraps.teslaFluxPointY)
      worldD.putInt('td_starterTeslaFluxPointZ', retrofitTraps.teslaFluxPointZ)
      // No td_starterFence* keys - see the fresh-build path's own comment above.
      console.log('playtest_starter_kit.js: retrofitted starter trap showcase onto a pre-existing world - starter_flux_network.js will link the Tesla Coil\'s Flux Point on this same login')
    }

    // Live relocation, 2026-09-15 - same "old save already has the
    // fixture, a once-per-world build gate will never re-run" problem as
    // the power rig migration above, for the starter Tesla Coil (moved
    // onto the wall, mirroring the Sentry) and the starter fence (now
    // fully sealing the gate instead of just framing it - direct ask:
    // "make the fence block the front hole in the wall... dont mind if
    // it blocks me in as its just the start"). One shared flag/block for
    // both, since they're the same "refresh the showcase to the new
    // layout" beat. The inner check only proceeds if a coil genuinely
    // exists yet at this point in THIS login - it can only be the OLD
    // ground-level one, since the retrofit right above (and
    // buildStarterBase itself) both already build the NEW wall-mounted
    // layout from the start, and neither has run yet by this point if
    // this save had no showcase at all. Skipped once the showcase is
    // already gone (td_starterTrapsRemoved, same guard
    // tesla_coil_auto_power.js itself uses) - nothing to relocate or
    // seal on a save already past that beat.
    if (!worldD.getBoolean('td_starterTrapsRelocated')) {
      worldD.putBoolean('td_starterTrapsRelocated', true)
      if (worldD.contains('td_starterTeslaCoilX') && !worldD.getBoolean('td_starterTrapsRemoved')) {
        var oldCoilX = worldD.getInt('td_starterTeslaCoilX')
        var oldCoilY = worldD.getInt('td_starterTeslaCoilY')
        var oldCoilZ = worldD.getInt('td_starterTeslaCoilZ')
        var oldDummyX = worldD.getInt('td_starterTeslaCoilDummyX')
        var oldDummyY = worldD.getInt('td_starterTeslaCoilDummyY')
        var oldDummyZ = worldD.getInt('td_starterTeslaCoilDummyZ')
        var oldFluxX = worldD.getInt('td_starterTeslaFluxPointX')
        var oldFluxY = worldD.getInt('td_starterTeslaFluxPointY')
        var oldFluxZ = worldD.getInt('td_starterTeslaFluxPointZ')
        // Old spot was open ground before the coil existed there. Also
        // clears the old auto-power toggle position (one BELOW the old
        // coil Y, tesla_coil_auto_power.js's pre-2026-09-15 direction) in
        // case a wave mob happened to be in range the instant this
        // migration runs and left a real redstone_block behind - that
        // script reads td_starterTeslaCoilY fresh every tick, so it's
        // already toggling the NEW (above) position by the time this code
        // finishes, and would never clean up the old one itself.
        server.runCommandSilent(`setblock ${oldCoilX} ${oldCoilY} ${oldCoilZ} minecraft:air`)
        server.runCommandSilent(`setblock ${oldDummyX} ${oldDummyY} ${oldDummyZ} minecraft:air`)
        server.runCommandSilent(`setblock ${oldFluxX} ${oldFluxY} ${oldFluxZ} minecraft:air`)
        server.runCommandSilent(`setblock ${oldCoilX} ${oldCoilY - 1} ${oldCoilZ} minecraft:air`)

        var trapDoorX = worldD.getInt('td_pedestalX')
        var trapWallY0 = worldD.getInt('td_pedestalY')
        var trapZ1 = worldD.getInt('td_pedestalZ') + 7
        var newCoilX = trapDoorX + 5
        var newCoilY = trapWallY0 + 3
        var newCoilZ = trapZ1
        var newDummyX = newCoilX - 1
        var newFluxX = newCoilX + 1
        server.runCommandSilent(`setblock ${newCoilX} ${trapWallY0 + 2} ${newCoilZ} minecraft:stone_bricks`)
        server.runCommandSilent(`setblock ${newCoilX} ${newCoilY} ${newCoilZ} immersiveengineering:tesla_coil[facing=west]`)
        server.runCommandSilent(`setblock ${newDummyX} ${trapWallY0 + 2} ${newCoilZ} minecraft:stone_bricks`)
        server.runCommandSilent(`setblock ${newDummyX} ${newCoilY} ${newCoilZ} immersiveengineering:tesla_coil[facing=west,multiblockslave=true]`)
        server.runCommandSilent(`setblock ${newFluxX} ${trapWallY0 + 2} ${newCoilZ} minecraft:stone_bricks`)
        server.runCommandSilent(`setblock ${newFluxX} ${newCoilY} ${newCoilZ} fluxnetworks:flux_point`)
        worldD.putInt('td_starterTeslaCoilX', newCoilX)
        worldD.putInt('td_starterTeslaCoilY', newCoilY)
        worldD.putInt('td_starterTeslaCoilZ', newCoilZ)
        worldD.putInt('td_starterTeslaCoilDummyX', newDummyX)
        worldD.putInt('td_starterTeslaCoilDummyY', newCoilY)
        worldD.putInt('td_starterTeslaCoilDummyZ', newCoilZ)
        worldD.putInt('td_starterTeslaFluxPointX', newFluxX)
        worldD.putInt('td_starterTeslaFluxPointY', newCoilY)
        worldD.putInt('td_starterTeslaFluxPointZ', newCoilZ)
        // The Flux Point's old tile is gone along with its old network
        // membership - same reasoning as the power rig migration above,
        // reusing the exact same shared re-link function (which also
        // covers the Plug/Battery at whatever their own current
        // coordinates are, old or already-relocated either way).
        linkStarterFluxNetwork(player, level, worldD)

        // Fence: starterFencePositions() itself now returns the fully-
        // sealed footprint (see its own updated comment) - just
        // re-running it over every returned position is enough. The 2 old
        // corner posts get the same fence block set again (a harmless
        // no-op); the 6 previously-open doorX-1..doorX+1 positions get
        // real fence for the first time.
        starterFencePositions(trapDoorX, trapWallY0, trapZ1).forEach(([fx, fy, fz]) => {
          server.runCommandSilent(`setblock ${fx} ${fy} ${fz} securitycraft:electrified_iron_fence`)
        })
        console.log(`playtest_starter_kit.js: relocated starter Tesla Coil to (${newCoilX}, ${newCoilY}, ${newCoilZ}) and sealed the starter fence gate`)
      }
    }

    // Live upright-fix migration, 2026-09-15 (second direct ask the same
    // day as the relocation migration just above): "the tesla coil is
    // lying on its side, it should be placed upright" + "instead of the
    // redstone block on top of the tesla coil can you make it a lever on
    // the side." Separate flag from td_starterTrapsRelocated - that one
    // already fired (and reads true) on any save that went through the
    // wall-mount move earlier, so reusing it here would never re-run.
    // Real reasoning for what changes and why is in placeStarterTraps()'s
    // own header comment (facing=up vs facing=west, lever vs
    // redstone_block). Master X/Y/Z don't move, only its facing, the
    // dummy's position (now above instead of beside), and the power
    // toggle (now a lever west of the master instead of a redstone_block
    // above it).
    if (!worldD.getBoolean('td_starterTeslaCoilUpright')) {
      worldD.putBoolean('td_starterTeslaCoilUpright', true)
      if (worldD.contains('td_starterTeslaCoilX') && !worldD.getBoolean('td_starterTrapsRemoved')) {
        var uprightCoilX = worldD.getInt('td_starterTeslaCoilX')
        var uprightCoilY = worldD.getInt('td_starterTeslaCoilY')
        var uprightCoilZ = worldD.getInt('td_starterTeslaCoilZ')
        var uprightOldDummyX = worldD.getInt('td_starterTeslaCoilDummyX')
        var uprightOldDummyY = worldD.getInt('td_starterTeslaCoilDummyY')
        var uprightOldDummyZ = worldD.getInt('td_starterTeslaCoilDummyZ')
        // Old sideways dummy (west of the master) and the old above-master
        // redstone toggle spot both go to air first - the new dummy
        // reuses the toggle's old spot (directly above the master) and
        // the new lever reuses the old dummy's spot (west of the master).
        server.runCommandSilent(`setblock ${uprightOldDummyX} ${uprightOldDummyY} ${uprightOldDummyZ} minecraft:air`)
        server.runCommandSilent(`setblock ${uprightCoilX} ${uprightCoilY + 1} ${uprightCoilZ} minecraft:air`)
        server.runCommandSilent(`setblock ${uprightCoilX} ${uprightCoilY} ${uprightCoilZ} immersiveengineering:tesla_coil[facing=up]`)
        server.runCommandSilent(`setblock ${uprightCoilX} ${uprightCoilY + 1} ${uprightCoilZ} immersiveengineering:tesla_coil[facing=up,multiblockslave=true]`)
        server.runCommandSilent(`setblock ${uprightCoilX - 1} ${uprightCoilY} ${uprightCoilZ} minecraft:lever[face=wall,facing=west,powered=false]`)
        worldD.putInt('td_starterTeslaCoilDummyX', uprightCoilX)
        worldD.putInt('td_starterTeslaCoilDummyY', uprightCoilY + 1)
        worldD.putInt('td_starterTeslaCoilDummyZ', uprightCoilZ)
        console.log(`playtest_starter_kit.js: stood the starter Tesla Coil upright at (${uprightCoilX}, ${uprightCoilY}, ${uprightCoilZ}) and swapped its power toggle to a lever`)
      }
    }

    // Starter trap showcase owner assignment - the Electrified Iron
    // Fence gate frame placeStarterTraps() just placed (fresh build or
    // retrofit, either path) is deliberately left unowned there, since
    // no Player object exists yet at world-build/retrofit time. An
    // unowned fence shocks EVERY player, owner included (decompiled
    // ElectrifiedIronFenceBlock.hurtOrConvertEntity - see
    // placeStarterTraps()'s own header comment), so it's claimed here,
    // on whichever real player actually logs in first, using the same
    // "call the real public method directly on the bound Java object"
    // pattern starter_flux_network.js already proved for
    // TileFluxDevice.connect(). Non-fatal by design, same reasoning as
    // that file's own try/catch: if SecurityCraft's real setOwner
    // signature ever changes, the fence frame stays placed and merely
    // unowned, not broken.
    // td_starterTeslaCoilX as the "have traps been placed yet" guard, not a
    // fence-specific key - both are written by the exact same if-block in
    // both the fresh-build and retrofit paths above, and the fence itself
    // no longer has persisted coordinates (starterFencePositions() derives
    // them from td_pedestalX/Y/Z instead, same as z1 = td_pedestalZ + 7
    // below - see the retrofit code's own comment on that offset).
    if (!worldD.getBoolean('td_starterTrapsOwnerSet') && worldD.contains('td_starterTeslaCoilX')) {
      worldD.putBoolean('td_starterTrapsOwnerSet', true)
      try {
        var ownerUuid = `${player.getProfile().getId()}`
        var ownerName = `${player.getProfile().getName()}`
        var fencePositions = starterFencePositions(worldD.getInt('td_pedestalX'), worldD.getInt('td_pedestalY'), starterGateWallZ(worldD), starterFenceFlanksFromData(worldD))
        fencePositions.forEach(function (pos) {
          var fenceBE = level.getBlockEntity(pos)
          if (fenceBE) fenceBE.setOwner(ownerUuid, ownerName)
        })
      } catch (e) {
        console.error(`playtest_starter_kit.js: starter trap fence owner assignment failed (${e}) - the fence posts stay placed but unowned, and WILL shock the player on contact`)
      }
    }
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
