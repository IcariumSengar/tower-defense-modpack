// Empty world-gen container fix (2026-09-08/09, rewritten 2026-09-11).
//
// The problem, re-measured 2026-09-11 by parsing every container block
// entity in every structure mod's NBT files (a real census this time,
// not the earlier "no LootTable string anywhere" grep):
//   - The Lost City: 2,916 containers - 1,352 EMPTY (46%, almost all
//     barrels), 1,487 tagged with berezka_api tables, 77 with baked items.
//   - Abandoned Urban: 207 containers - 97 EMPTY (92 barrels).
//   - Abandoned Watchtowers: 262 containers - 98 EMPTY.
//   - Philip's Ruins: 564 containers - 10 empty (the rest are tagged).
//   - postapocalypse_structures: 147 containers - 3 empty.
// The "regular storage" a player walks past in a ruined city is, nearly
// half the time, a barrel with nothing in it.
//
// The 2026-09-09 version answered "is this container inside a structure?"
// with ~200 lines of reflection (findNearestMapStructure -> getStructureAt
// -> bounding box) and only ever worked for Abandoned Watchtowers: its own
// header recorded that The Lost City throws "Unable to calculate
// boundingbox without pieces" (Berezka API places those structures through
// its own system, see the "[Berezka API] applying offset" log lines), and
// Abandoned Urban was never in its target list at all - so the two mods
// holding 1,449 of the ~1,560 empty containers were never fixed.
//
// **Rewrite**: no structure lookup at all. A container is treated as
// world-gen storage when ALL of these hold at first right-click:
//   1. it is a plain vanilla chest/trapped chest/barrel/dispenser/dropper
//      (Sophisticated Storage, Lootr and airdrop crates are other blocks),
//   2. it has no LootTable tag and no items,
//   3. it is more than BASE_EXCLUSION_RADIUS blocks from the pedestal -
//      the anchor-grid base placement (playtest_starter_kit.js) keeps every
//      structure set at least 9 chunks (~144 blocks) from the base, so
//      nothing inside that radius can be a structure container, and the
//      base's own script-placed double chest / pre-built barrels are safe,
//   4. it was not placed by a player - BlockEvents.placed records every
//      player-placed target container's position in the shared world
//      state (td_playerContainers, same string-registry idiom as
//      trap_durability.js's td_trapRegistry) and BlockEvents.broken
//      forgets it again. Script/command-placed blocks never fire placed,
//      which is exactly right: nothing but world-gen puts a container out
//      there without a player.
// Then it gets `kubejs:chests/scavenge_storage` (data/kubejs/loot_tables/
// chests/scavenge_storage.json - a "what someone left in this barrel"
// table: hardware, building materials, food, sometimes ammo, sometimes
// nearly nothing) merged as {LootTable, LootTableSeed} - the same
// vanilla lazy-unpack shape the old version verified live (Items key
// disappears, right-click rolls it, tag clears). structure_loot_
// progression.js's distance premium layers on top of that roll like any
// other chest, so a far city's storage is still worth more than a near
// one's.
//
// Real Radium interaction, kept from the old header because it still
// applies: Radium short-circuits the lazy unpack for NON-PLAYER container
// access (a hopper pulling from a tagged-but-unopened container does
// nothing). This fix only ever triggers on BlockEvents.rightClicked, never
// a hopper/comparator, so it isn't exposed to that - but don't assume a
// hopper test proves anything about the player path in this modset.
//
// Known, accepted edges: a container placed by a player before this
// version existed isn't in the registry, so if it's empty and far from
// the base it rolls storage loot once on its next open (a one-time bonus,
// not a bug loop - the tag clears after the roll); a container destroyed
// by an explosion keeps a stale registry key (harmless, nothing else can
// ever appear at that exact position without a placed event).
//
// Per this pack's Rhino rule (top-level FUNCTIONS share across
// server_scripts, var/const don't, and same-named functions silently
// collide - see mob_aggro.js's header), every helper is prefixed sclf*.

var TARGET_BLOCK_IDS = [
  'minecraft:chest',
  'minecraft:trapped_chest',
  'minecraft:barrel',
  'minecraft:dispenser',
  'minecraft:dropper',
]

var STORAGE_TABLE = 'kubejs:chests/scavenge_storage'
var BASE_EXCLUSION_RADIUS = 100

function sclfPosKey(x, y, z) {
  return x + ',' + y + ',' + z
}

function sclfPlayerPlacedSet(data) {
  return data.contains('td_playerContainers') ? `${data.getString('td_playerContainers')}` : ''
}

function sclfIsPlayerPlaced(data, x, y, z) {
  return (';' + sclfPlayerPlacedSet(data) + ';').indexOf(';' + sclfPosKey(x, y, z) + ';') !== -1
}

function sclfSetPlayerPlaced(level, x, y, z, placed) {
  var data = worldData(level)
  if (!data) return
  var key = sclfPosKey(x, y, z)
  var entries = sclfPlayerPlacedSet(data).split(';').filter(function (s) { return s.length > 0 && s !== key })
  if (placed) entries.push(key)
  data.putString('td_playerContainers', entries.join(';'))
}

// Returns a short status string (logged by the sandbox probe; the live
// right-click handler ignores it). Only 'assigned' changes anything.
function sclfMaybeAssign(block) {
  if (!block) return 'no-block'
  if (TARGET_BLOCK_IDS.indexOf(`${block.getId()}`) === -1) return 'not-target'
  var entityData = block.getEntityData()
  if (!entityData) return 'no-entity-data'
  if (entityData.contains('LootTable')) return 'already-tagged'
  if (entityData.contains('Items') && !entityData.getList('Items', 10).isEmpty()) return 'has-items'

  var level = block.getLevel()
  var base = worldData(level)
  if (!base || !base.contains('td_pedestalX')) return 'no-base'
  var x = block.getX(), y = block.getY(), z = block.getZ()
  var dx = x - base.getInt('td_pedestalX')
  var dz = z - base.getInt('td_pedestalZ')
  if (Math.sqrt(dx * dx + dz * dz) <= BASE_EXCLUSION_RADIUS) return 'near-base'
  if (sclfIsPlayerPlaced(base, x, y, z)) return 'player-placed'

  entityData.putString('LootTable', STORAGE_TABLE)
  entityData.putLong('LootTableSeed', 0)
  block.setEntityData(entityData)
  return 'assigned'
}

BlockEvents.placed(TARGET_BLOCK_IDS, (event) => {
  var block = event.getBlock()
  if (!block) return
  sclfSetPlayerPlaced(event.getLevel(), block.getX(), block.getY(), block.getZ(), true)
})

BlockEvents.broken(TARGET_BLOCK_IDS, (event) => {
  var block = event.getBlock()
  if (!block) return
  sclfSetPlayerPlaced(event.getLevel(), block.getX(), block.getY(), block.getZ(), false)
})

BlockEvents.rightClicked((event) => {
  var block = event.getBlock()
  if (!block) return
  if (TARGET_BLOCK_IDS.indexOf(`${block.getId()}`) === -1) return
  sclfMaybeAssign(block)
})
