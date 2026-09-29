// Shared run state: wave number, pedestal position and HP, cooldowns and
// one-shot flags. It lives in the persistentData of the td_pedestal_target
// marker, an invisible armor stand that playtest_starter_kit.js summons at the
// pedestal when it builds the base. KubeJS saves an entity's persistentData
// with the entity (NBT key KubeJSPersistentData), so the state survives
// restarts and every player reads the same copy. The base area is forceloaded,
// so the marker stays loaded, and its existence is the world's "base has been
// built" signal.
//
// The marker is cached: worldData() runs in many tick handlers, and a lookup
// scans every entity in the level. A cached marker is used only while it is
// still in the world and in the level asked about. Misses are not cached.
var tdWorldStateEntityCache = null

function findWorldStateEntity(level) {
  var cached = tdWorldStateEntityCache
  if (cached && !cached.isRemoved() && cached.getLevel() === level) return cached
  var found = level.getEntities().find(function (e) {
    return e.getTags().contains('td_pedestal_target')
  })
  if (found) tdWorldStateEntityCache = found
  return found
}

// The marker's persistentData, or null before the base is built and in any
// dimension other than the overworld, where the marker lives. Callers must
// handle null.
function worldData(level) {
  var entity = findWorldStateEntity(level)
  return entity ? entity.persistentData : null
}
