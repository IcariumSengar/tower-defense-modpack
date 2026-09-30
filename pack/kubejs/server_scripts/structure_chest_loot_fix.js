// Fills empty world-gen containers with kubejs:chests/scavenge_storage.
//
// Structure mods leave many containers empty; almost half of The Lost City's
// are. On a player's first right-click, sclfMaybeAssign gives the storage
// table to a plain vanilla container that is empty, far from the base, not
// placed by a player and not seen before. Asking "is this inside a structure"
// doesn't work: The Lost City builds through Berezka API, whose structures
// have no pieces to take a bounding box from.
//
// scavenge_storage is a plain-tier table: structure_loot_progression.js never
// adds the Lootr bonus to it, and lootr-common.toml blacklists it so Lootr
// never converts a container that holds it.

// Vanilla only: Lootr containers and airdrop crates are other blocks.
var TARGET_BLOCK_IDS = [
  'minecraft:chest',
  'minecraft:trapped_chest',
  'minecraft:barrel',
  'minecraft:dispenser',
  'minecraft:dropper',
]

var STORAGE_TABLE = 'kubejs:chests/scavenge_storage'
// Blocks from the pedestal. Covers the base's own containers (within 7)
// and nearly all of its levelled field (corners about 46 out), for any
// player container td_playerContainers missed. The ruin ring
// (playtest_starter_kit.js) aims 100-130 blocks out, but a rotated ruin can
// put a container about 60 from the pedestal, so the radius stays under that.
var BASE_EXCLUSION_RADIUS = 45
// One roll per container, ever. The open that rolls a table clears LootTable,
// and a looted container saves an empty Items list, so "no table, no items"
// alone would refill it on every click. Instead, the first check of a
// world-gen container sets this flag in its block entity's Forge persistent
// data (NBT key ForgeData), which saves with the chunk and goes with the block.
var SCLF_SEEN_KEY = 'td_scavengeSeen'
// The other half of a double chest, as [dx, dz] by the clicked half's facing.
// Vanilla ChestBlock.getConnectedDirection: a left half's partner is clockwise
// of its facing, a right half's counter-clockwise.
var SCLF_PARTNER_OF_LEFT = { north: [1, 0], east: [0, 1], south: [-1, 0], west: [0, -1] }
var SCLF_PARTNER_OF_RIGHT = { north: [-1, 0], east: [0, -1], south: [1, 0], west: [0, 1] }

// getEntityData() is the full saved snapshot, so it includes ForgeData.
function sclfIsSeen(entityData) {
  return entityData.contains('ForgeData') && entityData.getCompound('ForgeData').getBoolean(SCLF_SEEN_KEY)
}

function sclfMarkOne(block) {
  var blockEntity = block.getEntity()
  if (!blockEntity) return
  blockEntity.getPersistentData().putBoolean(SCLF_SEEN_KEY, true)
  blockEntity.setChanged()
}

// A double chest is two block entities that open as one inventory, so both
// halves are marked.
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
  // Only a joined double chest: vanilla joins two halves only when they are the
  // same block with the same facing and opposite types. Any other neighbour is
  // a separate container with its own first roll.
  var partnerProps = partner.getProperties()
  if (`${partnerProps.get('facing')}` !== facing) return
  if (`${partnerProps.get('type')}` !== (type === 'left' ? 'right' : 'left')) return
  sclfMarkOne(partner)
}

// Player-placed containers, as ';'-joined 'x,y,z' keys in td_playerContainers
// in worldData(), which is null outside the overworld. Only a player break
// removes a key; one left by an explosion or a digging mob is harmless, since
// world-gen never puts a container there again.
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

// Returns a status string naming the check that decided (the right-click
// handler ignores it); only 'assigned' adds loot.
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

  // First check of a world-gen container: whatever it holds at this point is
  // its only loot, so every branch below marks it.
  if (entityData.contains('LootTable')) {
    sclfMarkSeen(block)
    return 'already-tagged'
  }
  if (entityData.contains('Items') && !entityData.getList('Items', 10).isEmpty()) {
    sclfMarkSeen(block)
    return 'has-items'
  }

  entityData.putString('LootTable', STORAGE_TABLE)
  entityData.putLong('LootTableSeed', 0) // 0: a fresh random roll
  block.setEntityData(entityData)
  // Mark only after setEntityData: its load() swaps in the snapshot's ForgeData
  // whenever the snapshot has one, which would drop a flag written earlier.
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

// Fires before the container opens, so a table assigned here is rolled by the
// same click. With Radium, non-player access such as a hopper doesn't unpack a
// loot table, so a tagged container stays unrolled until a player opens it.
BlockEvents.rightClicked((event) => {
  var block = event.getBlock()
  if (!block) return
  if (TARGET_BLOCK_IDS.indexOf(`${block.getId()}`) === -1) return
  sclfMaybeAssign(block)
})
