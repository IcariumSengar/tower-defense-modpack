// Empty world-gen container fix (2026-09-08/09, rewritten 2026-09-11,
// re-roll loop fixed 2026-09-27).
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
// disappears, right-click rolls it, tag clears). No distance premium
// (2026-09-27 loot tiering pass): scavenge_storage is a plain-tier table.
// structure_loot_progression.js pays its distance bonus only when the
// rolling block is a lootr:* block, and it skips every table in its
// PLAIN_TIER_TABLES list, which includes this one; lootr-common.toml also
// blacklists this table, so a tagged-but-unopened barrel is never
// converted to a Lootr block on a later chunk load. A far city's empty
// barrels stay basic scavenging, the same as a near one's.
//
// **One roll per container, ever (bug fixed 2026-09-27).** Rule 2 above
// was only ever checked against the container's CURRENT contents, and
// vanilla wipes the evidence: the open that rolls the table clears the
// LootTable tag, and once the player takes everything the block entity
// saves `Items: []` (ContainerHelper.saveAllItems always writes the list,
// empty or not). The next right-click saw "no LootTable, no items" and
// tagged it again - unlimited free loot from one barrel. It hit every
// looted plain chest too, not just the ones this script had filled: a
// household chest emptied of its own table read as an empty world-gen
// container on the next click. The fix is a marker on the container
// itself: the first time a world-gen container passes rules 1, 3 and 4,
// whatever it holds then (its own LootTable, baked items, or the storage
// roll assigned here) is its only loot, and `td_scavengeSeen` is written
// into the block entity's Forge persistent data. That is the `ForgeData`
// compound Forge 47.4.10's patched BlockEntity reads in load() and writes
// in saveAdditional(); every target block entity (chest, trapped chest,
// barrel, dispenser, dropper) chains to both through super, so the marker
// saves with the chunk, survives restarts, and disappears with the block.
// Checked by decompiling the installed forge-1.20.1-47.4.10 client and
// server jars and the srg vanilla jar. KubeJS's getEntityData() is
// saveWithFullMetadata(), so the marker is visible in the snapshot read
// below. A double chest is two block entities that open as one, so both
// halves are marked together. A world-level position registry was the
// other option; it was rejected because it grows with every container
// opened, and an NBT string longer than 65,535 bytes is saved as "" by
// StringTag.write, which would silently wipe it.
//
// Real Radium interaction, kept from the old header because it still
// applies: Radium short-circuits the lazy unpack for NON-PLAYER container
// access (a hopper pulling from a tagged-but-unopened container does
// nothing). This fix only ever triggers on BlockEvents.rightClicked, never
// a hopper/comparator, so it isn't exposed to that - but don't assume a
// hopper test proves anything about the player path in this modset.
//
// Known, accepted edges: a container placed by a player before the
// registry existed isn't in it, so if it's empty and far from the base it
// rolls storage loot once on its next open (really once now - the marker
// stops the second roll; before 2026-09-27 this note claimed the cleared
// tag did that, which was backwards). Containers already emptied in a
// world from before the fix have no marker, so each gets one more storage
// roll and is then marked. A container destroyed by an explosion keeps a
// stale registry key (harmless, nothing else can ever appear at that exact
// position without a placed event).
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
// Boolean in the block entity's Forge persistent data (NBT: ForgeData).
var SCLF_SEEN_KEY = 'td_scavengeSeen'
// The other half of a double chest, as [dx, dz] by the clicked half's
// facing - vanilla ChestBlock.getConnectedDirection: a LEFT half's partner
// is facing.getClockWise(), a RIGHT half's is facing.getCounterClockWise().
var SCLF_PARTNER_OF_LEFT = { north: [1, 0], east: [0, 1], south: [-1, 0], west: [0, -1] }
var SCLF_PARTNER_OF_RIGHT = { north: [-1, 0], east: [0, -1], south: [1, 0], west: [0, 1] }

function sclfIsSeen(entityData) {
  return entityData.contains('ForgeData') && entityData.getCompound('ForgeData').getBoolean(SCLF_SEEN_KEY)
}

function sclfMarkOne(block) {
  var blockEntity = block.getEntity()
  if (!blockEntity) return
  blockEntity.getPersistentData().putBoolean(SCLF_SEEN_KEY, true)
  blockEntity.setChanged()
}

function sclfMarkSeen(block) {
  sclfMarkOne(block)
  var id = `${block.getId()}`
  if (id !== 'minecraft:chest' && id !== 'minecraft:trapped_chest') return
  var props = block.getProperties()
  var type = `${props.get('type')}`
  var facing = `${props.get('facing')}`
  var step = type === 'left' ? SCLF_PARTNER_OF_LEFT[facing] : (type === 'right' ? SCLF_PARTNER_OF_RIGHT[facing] : null)
  if (!step) return
  var partner = block.offset(step[0], 0, step[1])
  if (`${partner.getId()}` !== id) return
  // Only a real double chest. Vanilla DoubleBlockCombiner.combineWithNeigbour
  // joins the halves only when the neighbour is the same block, its type is
  // the opposite non-single one, and its facing matches; any other
  // same-id neighbour is a separate container with its own first roll.
  var partnerProps = partner.getProperties()
  if (`${partnerProps.get('facing')}` !== facing) return
  if (`${partnerProps.get('type')}` !== (type === 'left' ? 'right' : 'left')) return
  sclfMarkOne(partner)
}

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
// right-click handler ignores it). Only 'assigned' adds loot;
// 'already-tagged', 'has-items' and 'assigned' also write the marker.
function sclfMaybeAssign(block) {
  if (!block) return 'no-block'
  if (TARGET_BLOCK_IDS.indexOf(`${block.getId()}`) === -1) return 'not-target'
  var entityData = block.getEntityData()
  if (!entityData) return 'no-entity-data'
  if (sclfIsSeen(entityData)) return 'already-seen'

  var level = block.getLevel()
  var base = worldData(level)
  if (!base || !base.contains('td_pedestalX')) return 'no-base'
  var x = block.getX(), y = block.getY(), z = block.getZ()
  var dx = x - base.getInt('td_pedestalX')
  var dz = z - base.getInt('td_pedestalZ')
  if (Math.sqrt(dx * dx + dz * dz) <= BASE_EXCLUSION_RADIUS) return 'near-base'
  if (sclfIsPlayerPlaced(base, x, y, z)) return 'player-placed'

  // First look at a world-gen container: what it holds now is its only
  // loot. Mark it either way (see the header).
  if (entityData.contains('LootTable')) {
    sclfMarkSeen(block)
    return 'already-tagged'
  }
  if (entityData.contains('Items') && !entityData.getList('Items', 10).isEmpty()) {
    sclfMarkSeen(block)
    return 'has-items'
  }

  entityData.putString('LootTable', STORAGE_TABLE)
  entityData.putLong('LootTableSeed', 0)
  block.setEntityData(entityData)
  // Mark only after setEntityData: its load() swaps in the snapshot's
  // ForgeData whenever the snapshot has one, which would drop a marker
  // written earlier.
  sclfMarkSeen(block)
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
