// Empty structure-chest loot fix (2026-09-08/09) - see docs/QUEUE.md's
// "Empty structure-chest loot fix" entry for the full audit: Abandoned
// Watchtowers ships 98 of 262 containers completely empty (37%, no
// LootTable reference anywhere in the mod at all), The Lost City ships
// ZERO chest loot tables across all 205 of its own structure NBTs
// (already confirmed by structure_loot_progression.js's own header
// comment), and small gaps exist in Philip's Ruins (9) and
// postapocalypse_structures (3).
//
// Deliberately NOT binary-NBT-patching the mods' own structure files -
// that would mean shipping our own copies of someone else's shipped
// files (fragile: a mod update silently reverts the fix, hand-editing
// binary NBT risks corrupting the structure) and is a technique this
// pack has never used. Instead this assigns a real loot table to a
// container at the exact moment a player opens it, if (and only if)
// it's genuinely empty, untagged, and sitting inside one of the target
// mods' own generated structures.
//
// **Real, live-confirmed status, 2026-09-09 - not all 4 target mods
// actually work yet.** Watchtower_building is confirmed working
// end-to-end (containment correctly resolves true/false, verified
// against a real /locate'd structure and 2 control points). Lost City
// is NOT currently fixed by this script - its structures throw a real
// "Unable to calculate boundingbox without pieces" even once resolved
// to their own true origin chunk, meaning that mod's structures don't
// expose piece data through the same vanilla StructureStart API the
// other 3 mods do. It's left in TARGET_STRUCTURE_NAMESPACES anyway
// because the failure is fully caught and fails safe (just skips the
// container, no crash, no false positive) - but its empty chests stay
// empty until someone investigates that mod's own structure-generation
// mechanism specifically. Philip's Ruins/postapocalypse_structures use
// the same standard mechanism Watchtowers does and are expected to work
// the same way, but weren't individually re-tested after the fix.
//
// **Verified end-to-end in a real headless sandbox server before
// writing this**, not assumed: merging {LootTable, LootTableSeed} NBT
// onto an already-placed, already-empty container reproduces vanilla's
// own world-gen loot-chest shape exactly (Items key disappears, replaced
// by LootTable) and a real player right-click correctly rolls it and
// clears the tag afterward, indistinguishable from a genuine
// world-gen loot chest.
//
// **Real Radium interaction found during that same verification, worth
// remembering for any future work in this area**: Radium
// short-circuits the lazy unpack for NON-PLAYER container access - a
// hopper pulling from a tagged-but-unopened container did nothing until
// Radium was disabled, confirmed by reproducing the difference directly
// (disable Radium -> hopper works; re-enable -> hopper fails again).
// Player right-click is a different code path and was separately
// confirmed unaffected by a real live open. This fix only ever triggers
// on BlockEvents.rightClicked, never a hopper/comparator, so it's not
// exposed to that interaction at all - but don't assume a
// hopper/comparator-based test proves anything about the player path in
// this exact modset, they're genuinely different.
//
// Structure-containment reflection reuses the exact same SRG method ids
// playtest_starter_kit.js's buildStructureProximityCheck already
// verified live (m_220494_/m_203334_/m_73606_/m_73601_/m_162395_/
// m_162399_/m_162398_/m_162401_) - see that file's own header comment
// for why raw reflection sees SRG names here, not official ones, in
// this exact build. Per this pack's own established Rhino rule
// (top-level FUNCTIONS share across server_scripts, top-level var/const
// do not, and identically-named functions SILENTLY COLLIDE - see
// mob_aggro.js's header for the real bug this caused before), every
// helper below is prefixed sclf* (Structure Chest Loot Fix) rather than
// reusing playtest_starter_kit.js's unprefixed names directly.

var TARGET_STRUCTURE_NAMESPACES = [
  'watchtower_building',
  'the_lost_city',
  'philipsruins',
  'postapocalypse_structures',
]

var TARGET_BLOCK_IDS = [
  'minecraft:chest',
  'minecraft:trapped_chest',
  'minecraft:barrel',
  'minecraft:dispenser',
  'minecraft:dropper',
]

// Real vanilla tables, not invented ones - same "prefer a real vanilla
// mechanism" idiom as the rest of this codebase. Distance split mirrors
// structure_loot_progression.js's own tiering shape, but deliberately
// NOT sharing its actual pools/vars (top-level var/const don't reliably
// share across server_scripts in this exact Rhino build - only
// functions do) - a fresh, self-contained copy avoids that pitfall.
// Distance is measured from the REAL base, read live from the permanent
// td_pedestal_target marker (world_state.js's worldData()) - **real bug
// fixed 2026-09-09**: this file still carried a hardcoded SPAWN_X/SPAWN_Z
// of (1171, -499), a one-seed coordinate that has been stale since the
// spawn became a runtime search on 2026-09-06 (both fresh worlds this
// morning put the base 2,200 and 3,700 blocks from it). FAR_DISTANCE
// shifted +200 (120 -> 320) alongside structure_loot_progression.js's
// radii, for the same reason: the anchor-grid base placement guarantees
// no structure can start within ~200 blocks of the base, so the old
// threshold would have made every reachable chest "far".
var FAR_DISTANCE = 320
var NEAR_TABLE = 'minecraft:chests/simple_dungeon'
var FAR_TABLE = 'minecraft:chests/stronghold_corridor'

function sclfFindMethodByShape(cls, paramCount, retTypeName, paramTypeNames) {
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

function sclfResolveClass(anyObj, className) {
  var classOfClass = anyObj.getClass().getClass()
  var forNameMethod = sclfFindMethodByShape(classOfClass, 1, 'java.lang.Class', ['java.lang.String'])
  return forNameMethod.invoke(null, [className])
}

function sclfFindMethodByNameAndShape(cls, name, paramCount, retTypeName, paramTypeNames) {
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

function sclfBoxInt(anyObj, n) {
  var intCls = sclfResolveClass(anyObj, 'java.lang.Integer')
  var valueOf = sclfFindMethodByNameAndShape(intCls, 'valueOf', 1, 'java.lang.Integer', ['java.lang.String'])
  return valueOf.invoke(null, [`${n}`])
}
function sclfBoxBool(anyObj, b) {
  var boolCls = sclfResolveClass(anyObj, 'java.lang.Boolean')
  var valueOf = sclfFindMethodByNameAndShape(boolCls, 'valueOf', 1, 'java.lang.Boolean', ['java.lang.String'])
  return valueOf.invoke(null, [`${b}`])
}

// Builds the real "is this exact BlockPos inside one of our 4 target
// mods' own generated structures" closure ONCE per server start (not
// per container-open) - every reflection lookup below only runs one
// time; only the returned function's own invoke() calls repeat.
// Returns null (logged) if anything in the chain fails - never lets a
// reflection break normal chest-opening, same resilience philosophy as
// mob_aggro.js's stripAutoRetargeting and playtest_starter_kit.js's own
// buildStructureProximityCheck.
function sclfBuildChecker(level) {
  try {
    var rlCls = sclfResolveClass(level, 'net.minecraft.resources.ResourceLocation')
    var rlCtor = null
    var rlCtors = rlCls.getConstructors()
    for (var i = 0; i < rlCtors.length; i++) {
      var ps = rlCtors[i].getParameterTypes()
      if (ps.length === 1 && `${ps[0].getName()}` === 'java.lang.String') rlCtor = rlCtors[i]
    }

    var rkCls = sclfResolveClass(level, 'net.minecraft.resources.ResourceKey')
    var createRegistryKeyMethod = sclfFindMethodByShape(rkCls, 1, null, ['net.minecraft.resources.ResourceLocation'])
    var structureRegistryKey = createRegistryKeyMethod.invoke(null, [rlCtor.newInstance(['minecraft:worldgen/structure'])])

    var ra = level.registryAccess()
    var registryOrThrow = sclfFindMethodByShape(ra.getClass(), 1, 'net.minecraft.core.Registry', ['net.minecraft.resources.ResourceKey'])
    var structureRegistry = registryOrThrow.invoke(ra, [structureRegistryKey])

    // Same real ambiguity playtest_starter_kit.js already documented -
    // Registry has 4 real 0-arg Stream-returning methods, only one of
    // which returns Stream<Holder.Reference<T>>. Discriminated the same
    // way: the exact nested-class name in the real GENERIC return type
    // string, not the erased return type or a loose name match.
    var regMethods = structureRegistry.getClass().getMethods()
    var holdersMethod = null
    for (var hi = 0; hi < regMethods.length; hi++) {
      var hm = regMethods[hi]
      if (hm.getParameterTypes().length !== 0) continue
      if (`${hm.getReturnType().getName()}` !== 'java.util.stream.Stream') continue
      if (!`${hm.getGenericReturnType()}`.includes('Holder$Reference')) continue
      holdersMethod = hm
    }
    var holdersStream = holdersMethod.invoke(structureRegistry, [])
    var streamCls = sclfResolveClass(level, 'java.util.stream.Stream')
    // Real bug caught by a live sandbox test, not assumed safe: Stream's
    // 0-arg List-returning method is toList() (Java 16+), which returns
    // a JDK-internal ImmutableCollections$ListN - calling .size()/.get()
    // on THAT directly from script hits a real IllegalAccessException
    // (JPMS module-access restriction on a non-exported java.base
    // class). playtest_starter_kit.js's own similar-looking code avoids
    // this because it never calls a method on that list itself, only
    // passes it opaquely into another reflectively-invoked method
    // (HolderSet.direct(List), whose own trusted module context can
    // call .size()/.get() fine). This file DOES need to iterate the
    // list directly, so it uses toArray() instead - a plain Object[],
    // always safely accessible, no module restriction at all.
    var toArrayMethod = sclfFindMethodByNameAndShape(streamCls, 'toArray', 0, null, null)
    var allHoldersArray = toArrayMethod.invoke(holdersStream, [])

    var holderCls = sclfResolveClass(level, 'net.minecraft.core.Holder')
    var holderValueMethod = sclfFindMethodByNameAndShape(holderCls, 'm_203334_', 0, null, null)

    // Only the structures actually registered under our 4 target mod
    // namespaces - far cheaper to check per container-open than "every
    // registered structure" would be, and precise: we only ever want to
    // touch containers these 4 mods themselves generated.
    var targetHolders = []
    for (var li = 0; li < allHoldersArray.length; li++) {
      var holder = allHoldersArray[li]
      var key = holder.unwrapKey().get()
      var id = `${key.location()}`
      for (var ni = 0; ni < TARGET_STRUCTURE_NAMESPACES.length; ni++) {
        if (id.indexOf(TARGET_STRUCTURE_NAMESPACES[ni] + ':') === 0) {
          targetHolders.push(holder)
          break
        }
      }
    }
    console.log('structure_chest_loot_fix.js: tracking ' + targetHolders.length + ' structures across ' + TARGET_STRUCTURE_NAMESPACES.length + ' target mods')

    // Real bug caught by a live sandbox test, not assumed safe: calling
    // getStructureAt(pos, structure) with the CONTAINER's own position
    // directly looked plausible (returns a non-null, isValid()=true
    // StructureStart) but its getBoundingBox() throws a real
    // "Unable to calculate boundingbox without pieces" - a multi-chunk
    // structure (a watchtower/city complex) only has its REAL piece data
    // resident in the chunk it actually STARTED generating from; a
    // container elsewhere inside the structure's footprint sits in a
    // different chunk that only carries a reference back to that start,
    // not the real piece list. Fixed by reusing the exact same working
    // pattern playtest_starter_kit.js's buildStructureProximityCheck
    // already proved live: findNearestMapStructure resolves to the
    // structure's own true origin-chunk position first (guaranteed to
    // have real pieces), THEN getStructureAt/getBoundingBox are called
    // against THAT resolved position, never the container's raw one.
    var arrayListCls = sclfResolveClass(level, 'java.util.ArrayList')
    var arrayListCtor = null
    var alCtors = arrayListCls.getConstructors()
    for (var aci = 0; aci < alCtors.length; aci++) {
      if (alCtors[aci].getParameterTypes().length === 0) arrayListCtor = alCtors[aci]
    }
    var targetHoldersList = arrayListCtor.newInstance([])
    for (var thi = 0; thi < targetHolders.length; thi++) targetHoldersList.add(targetHolders[thi])

    var holderSetCls = sclfResolveClass(level, 'net.minecraft.core.HolderSet')
    var directMethod = sclfFindMethodByShape(holderSetCls, 1, null, ['java.util.List'])
    var targetHolderSet = directMethod.invoke(null, [targetHoldersList])

    var gen = level.getChunkSource().getGenerator()
    var genMethods = gen.getClass().getMethods()
    var findNearestMethod = null
    for (var gi = 0; gi < genMethods.length; gi++) {
      var gm = genMethods[gi]
      var gps = gm.getParameterTypes()
      if (gps.length === 5 && `${gps[3].getName()}` === 'int' && `${gps[4].getName()}` === 'boolean') findNearestMethod = gm
    }

    // Generous radius (chunks) - this only runs on the rare
    // container-open event, not per-tick, so the extra search cost is
    // cheap. Needs to comfortably cover the largest of our 4 target
    // mods' own structures (a Lost City "city" can span many chunks).
    var searchRadiusChunks = sclfBoxInt(level, 32)
    var skipKnown = sclfBoxBool(level, false)

    var structureManager = level.structureManager()
    var getStructureAtMethod = sclfFindMethodByNameAndShape(
      structureManager.getClass(), 'm_220494_', 2, null,
      ['net.minecraft.core.BlockPos', 'net.minecraft.world.level.levelgen.structure.Structure']
    )
    var structureStartCls = sclfResolveClass(level, 'net.minecraft.world.level.levelgen.structure.StructureStart')
    var isValidMethod = sclfFindMethodByNameAndShape(structureStartCls, 'm_73606_', 0, 'boolean', null)
    var getBoundingBoxMethod = sclfFindMethodByNameAndShape(structureStartCls, 'm_73601_', 0, 'net.minecraft.world.level.levelgen.structure.BoundingBox', null)
    var boundingBoxCls = sclfResolveClass(level, 'net.minecraft.world.level.levelgen.structure.BoundingBox')
    var minXMethod = sclfFindMethodByNameAndShape(boundingBoxCls, 'm_162395_', 0, 'int', null)
    var maxXMethod = sclfFindMethodByNameAndShape(boundingBoxCls, 'm_162399_', 0, 'int', null)
    var minZMethod = sclfFindMethodByNameAndShape(boundingBoxCls, 'm_162398_', 0, 'int', null)
    var maxZMethod = sclfFindMethodByNameAndShape(boundingBoxCls, 'm_162401_', 0, 'int', null)

    // Returns true if pos falls inside the real bounding box of the
    // nearest of our 4 target mods' own generated structures (only if
    // that nearest one is actually within its own real footprint -
    // findNearestMapStructure only guarantees "close enough to search",
    // not "actually inside", hence the explicit bbox check after).
    return function (pos) {
      try {
        var result = findNearestMethod.invoke(gen, [level, targetHolderSet, pos, searchRadiusChunks, skipKnown])
        if (result == null) return false
        var foundPos = result.getFirst()
        var structureHolder = result.getSecond()
        var structure = holderValueMethod.invoke(structureHolder, [])
        var structureStart = getStructureAtMethod.invoke(structureManager, [foundPos, structure])
        if (structureStart == null) return false
        if (!isValidMethod.invoke(structureStart, [])) return false
        var bbox = getBoundingBoxMethod.invoke(structureStart, [])
        var minX = minXMethod.invoke(bbox, [])
        var maxX = maxXMethod.invoke(bbox, [])
        var minZ = minZMethod.invoke(bbox, [])
        var maxZ = maxZMethod.invoke(bbox, [])
        var x = pos.getX(), z = pos.getZ()
        return x >= minX && x <= maxX && z >= minZ && z <= maxZ
      } catch (e) {
        console.log('structure_chest_loot_fix.js: containment check failed (' + e + ') - treating as not-contained')
        return false
      }
    }
  } catch (e) {
    console.log('structure_chest_loot_fix.js: reflection setup failed (' + e + ') - fix disabled for this session')
    return null
  }
}

// Built lazily on first right-click, not at script-load time - the
// level/structure registry isn't reliably ready that early, same
// deferred-init caution playtest_starter_kit.js's own spawn logic
// already uses.
var sclfChecker = null
var sclfCheckerAttempted = false

BlockEvents.rightClicked((event) => {
  var block = event.getBlock()
  if (!block) return
  var id = block.getId()
  if (TARGET_BLOCK_IDS.indexOf(id) === -1) return

  var entityData = block.getEntityData()
  if (entityData.contains('LootTable')) return // already tagged (real or previously assigned) - never touch twice
  if (entityData.contains('Items') && !entityData.getList('Items', 10).isEmpty()) return // has real contents - never clobber

  if (!sclfCheckerAttempted) {
    sclfCheckerAttempted = true
    sclfChecker = sclfBuildChecker(block.getLevel())
  }
  if (!sclfChecker) return

  var pos = block.getPos()
  if (!sclfChecker(pos)) return // not inside one of our 4 target structures - leave it alone (a player's own empty barrel stays empty)

  var base = worldData(block.getLevel())
  if (!base || !base.contains('td_pedestalX')) return // base not built yet - nothing to measure from, leave the chest untouched
  var dx = pos.getX() - base.getInt('td_pedestalX')
  var dz = pos.getZ() - base.getInt('td_pedestalZ')
  var dist = Math.sqrt(dx * dx + dz * dz)
  var table = dist > FAR_DISTANCE ? FAR_TABLE : NEAR_TABLE

  entityData.putString('LootTable', table)
  entityData.putLong('LootTableSeed', 0)
  block.setEntityData(entityData)
})
