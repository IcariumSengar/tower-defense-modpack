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

// Real structure-proximity check (2026-09-06 follow-up: "the generated
// structures have spawned right outside my base" - the spawn search
// only ever checked biome, never checked for a nearby structure, so it
// had no way to avoid this). Real, direct-API technique, same spirit as
// the biome check above, not parsing command feedback text: vanilla's
// own `ChunkGenerator#findNearestMapStructure` - the exact method
// `/locate structure` itself calls internally, a pure deterministic
// lookup that works without needing the area actually generated, same
// category as `getBiome`.
//
// Real Java reflection required to reach it, every step live-verified
// in a sandbox before trusting it, not guessed:
// - This exact method's real runtime name in this build is
//   SRG-obfuscated (`m_223037_`, found by dumping every 5-param method
//   on the chunk generator's class and matching by parameter shape -
//   ServerLevel/HolderSet/BlockPos/int/boolean -> Pair) even though
//   sibling methods on Level/ServerLevel (getChunkSource/getGenerator)
//   resolve to clean names directly by dot-syntax. This build's
//   clean-name coverage is inconsistent per-method, not a simple
//   "vanilla methods work / don't" rule - has to be checked per method.
// - Building the required `HolderSet<Structure>` argument took several
//   live-corrected wrong turns: `Registry#wrapAsHolder(T)` (the
//   obvious-looking shortcut once you already have a raw Structure
//   object) throws "This registry can't create intrusive holders" for
//   datapack-driven registries like Structure - that path only works
//   for the handful of core registries vanilla special-cases
//   (Block/Item/EntityType). Real fix: enumerate the registry directly
//   via `Registry#holders()` (a `Stream<Holder.Reference<T>>` of every
//   currently-registered structure) instead of looking any up by id -
//   simpler AND more complete than a hand-curated id list, can't miss a
//   structure mod's id through a typo, and stays correct automatically
//   if the mod roster ever changes. Structures outside this pack's
//   curated biome set (ocean/nether/end ones) are harmless to include -
//   they simply can never be found nearby, since they can't generate in
//   this pack's biome_source at all.
// - `Stream#toList()` threw a real `IllegalAccessException` when
//   reflected off the stream's own concrete class
//   (`java.util.stream.ReferencePipeline`) - a Java module-system
//   gotcha, that impl class isn't exported by the `java.base` module
//   even though `toList()` itself is public. Fixed by reflecting the
//   method off the public `Stream` INTERFACE class instead of the
//   concrete implementation.
// - Raw `Method#invoke()`/`Constructor#newInstance()` need REAL boxed
//   Java primitives, not bare JS numbers/booleans - confirmed live via
//   a genuine "argument type mismatch" `IllegalArgumentException` from
//   passing a plain JS number for `BlockPos`'s `int` constructor params.
//   Rhino's usual automatic coercion only applies to normal dot-syntax
//   calls, not manual reflection invocation (the same underlying
//   limitation mob_aggro.js already hit for functional-interface
//   coercion). Fixed via `Integer.valueOf(String)`/
//   `Boolean.valueOf(String)`, since a JS string DOES pass through
//   reflection cleanly (proven working elsewhere in this same chain).
//
// `STRUCTURE_MIN_DISTANCE` (200 blocks) is sized against this pack's own
// real worldborder growth curve (`base_expansion.js`), not guessed:
// starting diameter 50 + the full 8-wave campaign's cumulative growth
// (5+5+5+10+10+10+15+15 = 75) caps at diameter 125 - comfortably under
// 200 even counting the full designed campaign's end state, with margin
// left over for early endless-phase growth beyond that.
//
// Cost: the whole reflection chain (registry lookup + enumerating every
// registered structure, 135 on this pack's real mod set + one
// `findNearestMapStructure` call) measured live at ~1.6s - but that
// setup only happens ONCE per login (`buildStructureProximityCheck`
// below), reused across every ring-search candidate; only the cheap
// final `findNearestMapStructure` call itself repeats per candidate.
var STRUCTURE_MIN_DISTANCE = 200

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
// holders() bug above: `java.lang.Integer` has THREE real 1-arg(String)
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

// Builds the real find-nearest-structure closure ONCE (not per
// candidate point) - every reflection lookup below only runs one time;
// only the returned function's own `invoke()` call repeats per
// candidate. Returns null (logged) if anything in the chain fails -
// never lets a reflection break spawn placement entirely, same
// resilience philosophy as mob_aggro.js's stripAutoRetargeting: the
// caller falls back to a biome-only search rather than being unable to
// spawn the player at all.
function buildStructureProximityCheck(level) {
  try {
    var rlCls = resolveClass(level, 'net.minecraft.resources.ResourceLocation')
    var rlCtor = null
    var rlCtors = rlCls.getConstructors()
    for (var i = 0; i < rlCtors.length; i++) {
      var ps = rlCtors[i].getParameterTypes()
      if (ps.length === 1 && `${ps[0].getName()}` === 'java.lang.String') rlCtor = rlCtors[i]
    }

    var rkCls = resolveClass(level, 'net.minecraft.resources.ResourceKey')
    var createRegistryKeyMethod = findMethodByShape(rkCls, 1, null, ['net.minecraft.resources.ResourceLocation'])
    var structureRegistryKey = createRegistryKeyMethod.invoke(null, [rlCtor.newInstance(['minecraft:worldgen/structure'])])

    var ra = level.registryAccess()
    var registryOrThrow = findMethodByShape(ra.getClass(), 1, 'net.minecraft.core.Registry', ['net.minecraft.resources.ResourceKey'])
    var structureRegistry = registryOrThrow.invoke(ra, [structureRegistryKey])

    // Every currently-registered structure, as real Holder.Reference
    // objects directly - see the header comment above for why this
    // beats a hand-curated id list.
    //
    // Real bug caught by a live end-to-end test, not assumed safe from
    // the isolated reflection probe alone: `Class#getMethods()`'s
    // ordering is explicitly unspecified by the JLS, and this registry
    // class has FOUR real 0-arg Stream-returning methods, not one -
    // `Stream<Pair<TagKey<T>, HolderSet.Named<T>>>` (getTags),
    // `Stream<TagKey<T>>` (getTagNames), `Stream<Holder.Reference<T>>`
    // (holders - the one actually wanted), and `Stream<T>` (stream, raw
    // values). A plain `paramCount+returnType` shape match, or even a
    // loose `.includes('Holder')` check against the generic signature
    // (the tags stream's `HolderSet.Named` also contains the substring
    // "Holder"!), picked a different one of these between separate JVM
    // launches depending on `getMethods()`'s own unspecified ordering -
    // worked in one boot, then threw a real "Pair cannot be cast to
    // Holder" in the very next one, same code, same mod set, once the
    // tags-stream method happened to win instead. Fixed with a precise
    // discriminator: the exact nested-class name `Holder$Reference` in
    // the real GENERIC return type string (`getGenericReturnType()`,
    // which survives erasure unlike `getReturnType()`) - the ONLY one of
    // the 4 real candidates whose signature contains that exact string.
    var regMethodsForHolders = structureRegistry.getClass().getMethods()
    var holdersMethod = null
    for (var hi = 0; hi < regMethodsForHolders.length; hi++) {
      var hm = regMethodsForHolders[hi]
      if (hm.getParameterTypes().length !== 0) continue
      if (`${hm.getReturnType().getName()}` !== 'java.util.stream.Stream') continue
      if (!`${hm.getGenericReturnType()}`.includes('Holder$Reference')) continue
      holdersMethod = hm
    }
    var holdersStream = holdersMethod.invoke(structureRegistry, [])
    var streamCls = resolveClass(level, 'java.util.stream.Stream')
    var toListMethod = findMethodByShape(streamCls, 0, 'java.util.List', null)
    var holdersList = toListMethod.invoke(holdersStream, [])

    var holderSetCls = resolveClass(level, 'net.minecraft.core.HolderSet')
    var directMethod = findMethodByShape(holderSetCls, 1, null, ['java.util.List'])
    var allStructuresHolderSet = directMethod.invoke(null, [holdersList])

    var gen = level.getChunkSource().getGenerator()
    var genMethods = gen.getClass().getMethods()
    var findNearestMethod = null
    for (var i = 0; i < genMethods.length; i++) {
      var m = genMethods[i]
      var ps = m.getParameterTypes()
      if (ps.length === 5 && `${ps[3].getName()}` === 'int' && `${ps[4].getName()}` === 'boolean') findNearestMethod = m
    }

    var bpCls = resolveClass(level, 'net.minecraft.core.BlockPos')
    var bpCtor = null
    var bpCtors = bpCls.getConstructors()
    for (var i = 0; i < bpCtors.length; i++) {
      var ps = bpCtors[i].getParameterTypes()
      if (ps.length === 3 && `${ps[0].getName()}` === 'int') bpCtor = bpCtors[i]
    }

    // +2 chunks of margin past the exact block-distance threshold, so a
    // structure just past STRUCTURE_MIN_DISTANCE in blocks isn't missed
    // by a search radius that's rounded down in chunks.
    var searchRadiusChunks = boxInt(level, Math.ceil(STRUCTURE_MIN_DISTANCE / 16) + 2)
    var skipKnown = boxBool(level, false)

    // Real fix (2026-09-06 follow-up to the follow-up): decompiled
    // ChunkGenerator/StructurePlacement directly and confirmed
    // findNearestMapStructure's own returned BlockPos is the structure's
    // ORIGIN CHUNK CORNER (StructurePlacement.getLocatePos ->
    // ChunkPos.getMinBlockX/Z, no size adjustment at all) - not any point
    // on the structure's real footprint. Fine for a small structure; for
    // a large multi-chunk one (a city, a big dungeon) the true nearest
    // edge can be dozens of blocks closer than this origin point
    // suggests, which is exactly the kind of gap that could let a
    // structure read as comfortably clear via this check while actually
    // sitting right next to (or under) the spot chosen. Real fix: look
    // up the actual StructureStart at that origin (structure starts are
    // always placed from their own origin chunk, so this reliably finds
    // it) and measure to the nearest point on its real BoundingBox
    // instead.
    //
    // **Real finding, not assumed - named by SRG identifier, not by
    // clean name.** First attempt used the real official-mapping names
    // (minX/maxX/getBoundingBox/etc, cross-checked against this exact
    // build's own bundled Mojang mapping file) via
    // findMethodByNameAndShape - every single one resolved to null on a
    // live sandbox boot. A diagnostic dump of BoundingBox's own
    // `getMethods()` at runtime showed why: reflection here sees SRG
    // names (`m_162395_`, `m_162399_`, ...), not official ones. This is
    // the same gap no_passive_mobs.js already documented for EntityType
    // ("fully SRG-obfuscated with no clean id->category mapping"), just
    // not previously known to be a GENERAL property of raw reflection
    // against vanilla classes in this build rather than an EntityType-
    // specific quirk - Forge's compile-time remapping only rewrites
    // bytecode that CALLS these methods directly (mod Java source, or
    // this pack's own already-working shape-only lookups, which never
    // needed a name at all), not what a live `getMethods()` scan
    // reports back to a script. Every SRG id below was cross-verified by
    // reading the actual decompiled method BODY (not just its shape) to
    // confirm which of several same-shaped candidates it really is -
    // StructureManager alone has two different (BlockPos,Structure)
    // methods (getStructureAt vs. getStructureWithPieceAt) that shape
    // matching alone can't tell apart.
    var structureManager = level.structureManager()
    var holderCls = resolveClass(level, 'net.minecraft.core.Holder')
    var holderValueMethod = findMethodByNameAndShape(holderCls, 'm_203334_', 0, null, null)
    var getStructureAtMethod = findMethodByNameAndShape(
      structureManager.getClass(), 'm_220494_', 2, null,
      ['net.minecraft.core.BlockPos', 'net.minecraft.world.level.levelgen.structure.Structure']
    )
    var structureStartCls = resolveClass(level, 'net.minecraft.world.level.levelgen.structure.StructureStart')
    var isValidMethod = findMethodByNameAndShape(structureStartCls, 'm_73606_', 0, 'boolean', null)
    var getBoundingBoxMethod = findMethodByNameAndShape(structureStartCls, 'm_73601_', 0, 'net.minecraft.world.level.levelgen.structure.BoundingBox', null)
    var boundingBoxCls = resolveClass(level, 'net.minecraft.world.level.levelgen.structure.BoundingBox')
    var minXMethod = findMethodByNameAndShape(boundingBoxCls, 'm_162395_', 0, 'int', null)
    var maxXMethod = findMethodByNameAndShape(boundingBoxCls, 'm_162399_', 0, 'int', null)
    var minZMethod = findMethodByNameAndShape(boundingBoxCls, 'm_162398_', 0, 'int', null)
    var maxZMethod = findMethodByNameAndShape(boundingBoxCls, 'm_162401_', 0, 'int', null)

    // Real distance (blocks) to the nearest structure of any kind, or
    // null if none within the search radius - the caller compares this
    // against STRUCTURE_MIN_DISTANCE itself, since findNearestMapStructure's
    // own searchRadius argument is in CHUNKS and only bounds the search -
    // it doesn't guarantee the result is within any particular block
    // distance, that still has to be computed from the real returned
    // position.
    return function (x, z) {
      var pos = bpCtor.newInstance([boxInt(level, x), boxInt(level, 64), boxInt(level, z)])
      var result = findNearestMethod.invoke(gen, [level, allStructuresHolderSet, pos, searchRadiusChunks, skipKnown])
      if (result == null) return null
      var foundPos = result.getFirst()
      var structureHolder = result.getSecond()

      try {
        var structure = holderValueMethod.invoke(structureHolder, [])
        var structureStart = getStructureAtMethod.invoke(structureManager, [foundPos, structure])
        if (structureStart != null && isValidMethod.invoke(structureStart, [])) {
          var bbox = getBoundingBoxMethod.invoke(structureStart, [])
          var minX = minXMethod.invoke(bbox, [])
          var maxX = maxXMethod.invoke(bbox, [])
          var minZ = minZMethod.invoke(bbox, [])
          var maxZ = maxZMethod.invoke(bbox, [])
          var clampedX = Math.max(minX, Math.min(x, maxX))
          var clampedZ = Math.max(minZ, Math.min(z, maxZ))
          var edx = x - clampedX
          var edz = z - clampedZ
          return Math.sqrt(edx * edx + edz * edz)
        }
      } catch (e) {
        console.log('playtest_starter_kit.js: bounding-box lookup failed (' + e + '), falling back to origin-point distance for this candidate')
      }

      // Fallback if the bounding-box lookup didn't resolve (shouldn't
      // normally happen given a structure start is always at its own
      // origin chunk, but this is reflection reaching into internal
      // generation state, not a stable public API) - degrade to the old
      // origin-point distance rather than breaking the whole search.
      var dx = foundPos.getX() - x
      var dz = foundPos.getZ() - z
      return Math.sqrt(dx * dx + dz * dz)
    }
  } catch (e) {
    console.log('playtest_starter_kit.js: structure-proximity check unavailable (' + e + '), spawn search will skip it and fall back to biome-only')
    return null
  }
}

// Ring-by-ring outward search from a given anchor for any biome in
// `biomeList` - cheap enough to run synchronously during login (a real
// sandbox timing test: 441 lookups in 141ms). Step 48 keeps the ring
// count (and worst-case call count) reasonable while still being
// fine-grained enough not to skip over a real biome patch. `isAcceptable`
// (optional) runs only on cells that already matched the biome, and can
// reject an otherwise-matching candidate to keep searching - used by the
// structure-proximity check below.
function searchForBiome(level, startX, startZ, biomeList, maxRadius, isAcceptable) {
  const step = 48
  function candidateOk(x, z) {
    if (!biomeList.includes(biomeIdAt(level, x, z))) return false
    if (isAcceptable && !isAcceptable(x, z)) return false
    return true
  }
  if (candidateOk(startX, startZ)) return [startX, startZ]
  for (let r = step; r <= maxRadius; r += step) {
    for (let dx = -r; dx <= r; dx += step) {
      for (let dz = -r; dz <= r; dz += step) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue // ring only, not a full grid
        if (candidateOk(startX + dx, startZ + dz)) return [startX + dx, startZ + dz]
      }
    }
  }
  return null
}

// Seed-independent from a seed-independent anchor (world origin) -
// correct for whatever the actual seed is, unlike a hardcoded
// coordinate. **Radius widened to 4000 (from 1200) 2026-09-06** - real
// consequence of dropping the leafy fallback above, handled
// deliberately, not ignored: the old radius was sized assuming a safety
// net existed if it came up short. With no net, the radius itself has to
// be trusted to actually find desert/badlands - 4000 is directly
// informed by real data already measured in this pack's own history, not
// picked arbitrarily: the vegetation Y-range fix found desert/badlands
// sitting ~3650 blocks from a real savanna_plateau landing point on one
// actual save. Worst-case cost at this radius (only paid if genuinely
// nothing barren turns up anywhere within it, which would itself be a
// real finding about the seed, not the expected path): ~27,900
// `getBiome` calls at this file's own measured ~0.3ms/call, ~8.4s - a
// one-time login cost, acceptable for how rare that case should be given
// desert+badlands are 2 of only 7 curated biomes in this pack's
// multi_noise blend. If it still comes back null, the caller (below)
// has a real, defined fallback - not left undefined.
//
// **Best-candidate fallback, real fix 2026-09-06**: a real live playtest
// found the base structure spawning on top of other structures - traced
// to this function returning null whenever every biome-matched candidate
// fell short of STRUCTURE_MIN_DISTANCE, which sent the login handler down
// its own fallback path (`spreadplayers 0 0`) with ZERO structure-proximity
// protection at all - worse than just accepting the least-bad real
// candidate. Every biome-matched candidate seen during the search (pass or
// fail) is now tracked by its own structure distance; if none clear the
// full threshold, the search returns whichever one had the most clearance
// instead of surrendering to the unchecked origin fallback.
function findWastelandSpawn(level, startX, startZ) {
  var structureDistanceAt = buildStructureProximityCheck(level)
  var bestCandidate = null
  var bestDistance = -1
  var isAcceptable = structureDistanceAt ? function (x, z) {
    var dist = structureDistanceAt(x, z)
    if (dist === null) return true
    if (dist > bestDistance) {
      bestDistance = dist
      bestCandidate = [x, z]
    }
    return dist >= STRUCTURE_MIN_DISTANCE
  } : null
  var found = searchForBiome(level, startX, startZ, BARE_WASTELAND_BIOMES, 4000, isAcceptable)
  if (found) return found
  if (bestCandidate) {
    console.log('playtest_starter_kit.js: no wasteland spot cleared ' + STRUCTURE_MIN_DISTANCE + ' blocks of structure clearance within 4000 blocks, using best real candidate found (' + bestDistance + ' blocks clear) instead of the unchecked origin fallback')
    return bestCandidate
  }
  return null
}

PlayerEvents.loggedIn((event) => {
  const player = event.player
  const data = player.persistentData

  // Real live bug fixed 2026-09-05: Zcraft Decoration removed entirely
  // (direct report - its concrete blocks were getting mobs stuck
  // pathing near them). Full uninstall (mod + this function's own
  // placement further down), but any save that already built its
  // starter base (td_playtestKitGiven true) also already has the 2 real
  // zcraft_decorations:sfz_shuiniqiang blocks placed at the gate - once
  // the mod's gone those become real "missing block" placeholders on
  // next load, not just an unplaced decoration. This runs BEFORE the
  // td_playtestKitGiven early-return below on purpose, gated by its own
  // separate flag, since that gate only covers fresh worlds and this
  // needs to also reach already-built ones. Recomputes the 2 known
  // coordinates from this file's own persisted td_pedestalX/Y/Z (same
  // doorX/wallY0/z1 relationship the base-building code below uses:
  // doorX = td_pedestalX, wallY0 = td_pedestalY, z1 = td_pedestalZ + 7)
  // and blindly overwrites them with air regardless of what's actually
  // there now - safe either way, a fresh world never had anything there.
  if (!data.getBoolean('td_zcraftCleanupDone') && data.getBoolean('td_playtestKitGiven')) {
    data.putBoolean('td_zcraftCleanupDone', true)
    var oldDoorX = data.getInt('td_pedestalX')
    var oldWallY0 = data.getInt('td_pedestalY')
    var oldZ1 = data.getInt('td_pedestalZ') + 7
    player.getServer().runCommandSilent(`setblock ${oldDoorX - 2} ${oldWallY0} ${oldZ1 + 1} minecraft:air`)
    player.getServer().runCommandSilent(`setblock ${oldDoorX + 2} ${oldWallY0} ${oldZ1 + 1} minecraft:air`)
  }

  // The amulet is NO LONGER starter gear (reversed 2026-09-01,
  // docs/FEATURES.md's "The amulet" - "the pedestal is pre-built, the
  // amulet is crafted"). It now has a real crafting recipe
  // (server_scripts/amulet_pedestal.js) instead of being given here;
  // the empty pre-built pedestal (below, in the base-building section)
  // is the intended hook - "something was supposed to be here."

  if (data.getBoolean('td_playtestKitGiven')) return
  data.putBoolean('td_playtestKitGiven', true)

  // Real UX fix, 2026-09-05 (live report: the player visibly spawns
  // once at the vanilla default point, then gets teleported to the
  // real wasteland base moments later - reads as a jarring double
  // spawn). Real investigation: `PlayerEvents.loggedIn` only fires
  // AFTER vanilla has already placed the player entity in the world -
  // there is no earlier Forge/vanilla hook that runs before that first
  // placement, so the world/terrain genuinely can't be "ready first."
  // Everything below this point (the biome search, up to 4000 blocks,
  // plus the full base build - walls, structure placement, loot) runs
  // synchronously inside this one handler and takes real, measurable
  // time, during which the player's client is still rendering
  // whatever real (wrong) terrain they were first placed on. Can't
  // eliminate the double-teleport, but can make it read as one clean
  // spawn instead of a correction: an immediate, near-instant safety
  // hop straight up to a fixed neutral altitude (sky, nothing
  // identifiable to notice snapping away from) before any of the slow
  // work starts, with a short slow_falling grant as a safety net in
  // case of any lag - by the time the real spreadplayers teleport below
  // lands, the player was already looking at sky, not a real landscape.
  event.server.runCommandSilent('effect give @a minecraft:slow_falling 10 0 true')
  player.teleportTo(player.getX(), 300, player.getZ())

  // Real live ask, 2026-09-05: a persistently visible HUD element for
  // waves cleared, not just a one-off chat/title message. Plain vanilla
  // scoreboard sidebar - real, idempotent objective creation (a second
  // `objectives add` with the same name is a real no-op error, silenced
  // since this only runs once per player anyway via the gate above).
  // wave_status.js sets the real value each time a wave is marked
  // cleared.
  player.getServer().runCommandSilent('scoreboard objectives add td_waves_cleared dummy {"text":"Waves Cleared"}')
  player.getServer().runCommandSilent('scoreboard objectives setdisplay sidebar td_waves_cleared')
  player.getServer().runCommandSilent('scoreboard players set @a td_waves_cleared 0')

  player.give(Item.of('minecraft:netherite_sword', 1, starterGearNbt('Enchantments:[{id:"minecraft:sharpness",lvl:100}]')))
  player.give(Item.of('kubejs:wave_horn', 1))
  player.give(Item.of('minecraft:iron_helmet', 1, starterGearNbt()))
  player.give(Item.of('minecraft:iron_chestplate', 1, starterGearNbt()))
  player.give(Item.of('minecraft:iron_leggings', 1, starterGearNbt()))
  player.give(Item.of('minecraft:iron_boots', 1, starterGearNbt()))

  event.server.runCommandSilent('gamerule doMobSpawning false')

  // Spawn-biome target history, condensed (full real writeup in
  // docs/FEATURES.md's "Seed-independent world-gen" entry): (0,0) landed
  // in a badlands blob -> hardcoded (780,-150) -> that turned out to be
  // plains, hardcoded (1171,-499) after a real census against the live
  // save's own seed -> the VERY NEXT fresh world landed back in plains
  // at that exact point too, because it rolled a different seed and a
  // hardcoded coordinate tuned for one seed's noise pattern has no
  // reason to hold on another. **Real, structural fix 2026-09-06**:
  // search for a real wasteland-tagged biome at LOGIN TIME instead of
  // trusting a number picked in advance - see `findWastelandSpawn()`
  // above. World origin (0,0) is the anchor precisely because it's
  // seed-independent - no reason to prefer one arbitrary point over
  // another when the search itself now does the real work.
  // **Savanna/savanna_plateau dropped entirely 2026-09-06** (real
  // follow-up playtest: "savanna is still looking far too green. lose
  // this biome, stick with wasteland feel.") - desert/badlands are now
  // the only acceptable outcome, see `findWastelandSpawn()` above for
  // the widened radius that makes that safe.
  const wastelandTarget = findWastelandSpawn(player.getLevel(), 0, 0)
  if (wastelandTarget) {
    event.server.runCommandSilent(`spreadplayers ${wastelandTarget[0]} ${wastelandTarget[1]} 1 8 false @a`)
  } else {
    // Real, honest fallback - a search radius of 4000 blocks turning up
    // neither desert nor badlands is itself a finding worth surfacing
    // (unusual seed, or the curated biome set is oddly sparse near
    // origin), not silently pretending it worked. Falls back to world
    // origin - still heightmap-snapped, still gets a working base, just
    // not guaranteed to be in-theme this one time. Deliberately does NOT
    // fall back to savanna/savanna_plateau - that fallback is exactly
    // what this fix removed, reinstating it here would silently undo it
    // in the one case it's most likely to matter.
    console.log('playtest_starter_kit.js: no desert/badlands biome found within 4000 blocks of origin, falling back to (0,0)')
    event.server.runCommandSilent('spreadplayers 0 0 1 8 false @a')
  }

  // Ground truth read AFTER spreadplayers — this is where the player is
  // actually now standing, on real terrain, not a guess.
  //
  // **Real bug found and fixed 2026-09-06, direct playtest report:
  // "my entire base is floating 1 block off the ground."** Used to read
  // `Math.floor(player.getY())` here directly - wrong whenever the
  // landing column happens to have a decorative, non-collidable plant
  // (`minecraft:grass`, the 1.20.1 single-block tall-grass, confirmed
  // live at the actual reported column) sitting on top of the real
  // ground. `/spreadplayers` places the player using a heightmap that
  // counts that plant as "the surface," one block above where real
  // collision/gravity would actually settle them - and since this read
  // happens the same tick, immediately after the teleport, gravity never
  // gets a chance to correct it before every wall/floor/pedestal Y in
  // this whole function gets derived from the inflated number. Confirmed
  // directly on the exact real live-save column this bug was reported
  // from: `Math.floor(player.getY())` gave 3, but the real settled
  // player position after actual play (read from the save's own player
  // data) was 2, and vanilla's own real `MOTION_BLOCKING` heightmap
  // (which explicitly excludes non-collidable blocks like this one, by
  // design - the same value real gravity converges to) also gives 2.
  // Fixed by reading the real heightmap instead of the player's own
  // possibly-not-yet-settled Y - correct regardless of what's growing on
  // the landing tile, no hand-maintained "which plants don't count" list
  // needed.
  const x = Math.floor(player.getX())
  const z = Math.floor(player.getZ())
  const y = player.getLevel().getHeight('MOTION_BLOCKING', x, z)

  // Pin every future respawn to this exact point (docs/IDEAS.md's
  // "Fixed spawn" plan) - spawnRadius 0 removes vanilla's default ~10
  // block first-spawn scatter, so this is the actual landing spot, not
  // just a nearby nudge target.
  event.server.runCommandSilent(`setworldspawn ${x} ${y} ${z}`)
  event.server.runCommandSilent('gamerule spawnRadius 0')

  // Center the border on the same fixed point, not wherever the player
  // happened to be standing — matches the manual setup step from
  // docs/PLAYTESTING.md, now automatic.
  event.server.runCommandSilent(`worldborder center ${x} ${z}`)
  // Briefly bumped to 90 for the Red Mansion (26x28), reverted back to
  // 50 the same day (2026-09-01) once the mansion itself was swapped for
  // Abandoned Brick House (12x11, see below) - the smaller building's
  // compound footprint comfortably fits the original border size again,
  // so this also restores base_expansion.js's originally-tuned wave-8
  // ending border of 166 instead of the mansion-driven ~206.
  event.server.runCommandSilent('worldborder set 50')
  // Wave mobs deliberately spawn just beyond the border (wave_spawner.js)
  // and walk in - without this, vanilla's default border damage would
  // chip them (and the player, near the edge) for no reason this pack
  // actually wants; the border here is a containment/staging boundary,
  // not a shrinking-zone mechanic.
  event.server.runCommandSilent('worldborder damage amount 0')

  const floorY = y - 1
  const wallY0 = y
  const wallY1 = y + 2
  const doorX = x

  const run = (cmd) => event.server.runCommandSilent(cmd)

  // Layout wraps around a real postapocalypse_structures building
  // instead of the old hand-built shell - gate sits just off the fixed
  // spawn point, courtyard runs north from there, then the building,
  // then a back margin closing out the compound. Swapped from Red
  // Mansion to Abandoned Brick House the same day (2026-09-01, direct
  // feedback: "this mansion is too big") - real dimensions confirmed by
  // decompiling its own NBT directly (12 wide (X) x 13 tall (Y) x 11
  // deep (Z), DataVersion 3465 matches this pack's install exactly),
  // barely bigger than the original hand-built 11x11 footprint. Same
  // mod, same aesthetic family, already installed - no new dependency.
  // Watchtower removed entirely 2026-09-03 (direct request: "it serves
  // no purpose now that we have a better starting structure" - its
  // original 4-sided-lookout reasoning assumed border-relative mob
  // spawns, stale since spawns went player-relative 2026-09-01, and it
  // stood outside the compound's own back wall regardless, never part
  // of the defended perimeter).
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
    const sampleY = player.getLevel().getHeight('MOTION_BLOCKING', sx, sz)
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
  // Real live ask, 2026-09-05: pre-place a Waystone in the yard on a
  // fresh world, same pre-placement convention as the pedestal/kinetic
  // rig above - one real, findable Waystone from the start, distinct
  // position from the pedestal itself so the two don't overlap.
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
  run(`setblock ${centerX + 3} ${wallY0} ${centerZ} waystones:waystone[facing=north,half=lower]`)
  run(`setblock ${centerX + 3} ${wallY0 + 1} ${centerZ} waystones:waystone[facing=north,half=upper]`)
  // Stored once here, permanent regardless of amulet state -
  // pedestal_destruction.js's own block-gone check, pedestal_health.js's
  // own HP tick, amulet_pedestal.js's border-crossing poll, and every
  // wave/mob-targeting reference below all key off this same fixed
  // coordinate. 2026-09-03, "if the pedestal is destroyed you lose." Y
  // dropped back to wallY0 (ground level, no more plinth offset).
  data.putInt('td_pedestalX', centerX)
  data.putInt('td_pedestalY', wallY0)
  data.putInt('td_pedestalZ', centerZ)

  // Real deterministic HP pool (2026-09-06, see pedestal_health.js) -
  // set once here, same pattern as td_pedestalX/Y/Z above, full at
  // world-build time. Replaces reliance on Epic Siege Mod's own
  // blockTargets AI, which stayed inconclusive even after the
  // mob-pathing fix (mob_aggro.js) was meant to give it a fair shot.
  // Bumped 200 -> 300 (2026-09-05, direct ask: "pedestal starting HP
  // up") - must match PEDESTAL_MAX_HEALTH in pedestal_health.js, this
  // pack's own established cross-file-constant duplication convention.
  data.putInt('td_pedestalHealth', 300)

  // No campfires or fire props anywhere in this build - direct request,
  // dropped entirely rather than reduced. The old braziers were called
  // out by name as part of what read badly ("hot garbage... campfires
  // specifically") - this isn't an oversight, it's the ask, unchanged
  // from the circular-altar rebuild this replaces.

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
  // Marker summoned once, here, permanently - never killed, unlike the
  // old amulet-gated marker it replaces. `PersistenceRequired:1b`
  // (same real bug this pack already hit once with wave mobs -
  // unpersisted entities silently despawn) keeps it from vanishing on a
  // server restart or long absence. No HandItems - Supplementaries'
  // pedestal now renders its own contents natively, so this is a pure,
  // invisible targeting anchor, not a visual prop. One block above the
  // pedestal's own position (back to wallY0+1, ground-level pedestal
  // above), not inside it.
  run(`summon minecraft:armor_stand ${centerX + 0.5} ${wallY0 + 1} ${centerZ + 0.5} {Invisible:1b,NoGravity:1b,Marker:1b,PersistenceRequired:1b,Tags:["td_pedestal_target"]}`)

  // Forceload is now a one-time permanent setup, not a toggle -
  // same 96-block/169-chunk radius already verified safe
  // (amulet_pedestal.js used to add/remove this exact range whenever
  // the amulet went on/off the pedestal; now it's just always on). Real,
  // deliberate resource-cost tradeoff, not an oversight: permanently
  // reserving chunk-loading around the base for the whole game is the
  // accepted cost of "the base is always genuinely at stake."
  run(`forceload add ${centerX - 96} ${centerZ - 96} ${centerX + 96} ${centerZ + 96}`)

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
  run(`setblock ${buildingX0 + 5} ${floorY + 1} ${buildingZ0 + 4} craftingstation:crafting_station`)
  // Cauldron + tripwire hook - direct removal request.
  run(`setblock ${buildingX0 + 8} ${floorY + 1} ${buildingZ0 + 5} minecraft:air`)
  run(`setblock ${buildingX0 + 8} ${floorY + 2} ${buildingZ0 + 5} minecraft:air`)
  // Starter loot chests/barrels - direct ask, remove all of them
  // entirely, not just nerf their tables ("loot lives outside the
  // border, not at home").
  ;[[8, 3, 6], [8, 3, 7], [3, 5, 5], [3, 6, 5], [3, 7, 5]].forEach(([lx, ly, lz]) => {
    run(`setblock ${buildingX0 + lx} ${floorY + ly} ${buildingZ0 + lz} minecraft:air`)
  })

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
})
