// Keeps Open Modular Turrets Reborn's Turret Bases switched on. A base's
// Configure screen has an Active/Inactive button, and an inactive base's
// turrets neither aim nor fire (AbstractDirectedTurretBlockEntity.tickDirected
// returns before targeting). The button is easy to hit by mistake: a
// 2026-10-05 playtest had two powered Rocket Turrets idle on bases saved with
// active = false. Turrets never shoot players here (globalCanTargetPlayers =
// false in config/omtreborn-common.toml), so the switch has no use.
//
// The toggle arrives as a network packet KubeJS can't intercept, so known
// bases are swept every OMT_BASE_SWEEP_TICKS and any found off is switched
// back on. Bases are learned when placed or right-clicked, and once per
// server start from a scan of the base's forceload square, which finds bases
// placed before this file existed or before the restart. The list isn't
// saved: a base outside that square is learned again on its next right-click.
var OMT_BASE_SWEEP_TICKS = 40
// Half-width of the base's permanent forceload square; must match
// playtest_starter_kit.js.
var OMT_BASE_SCAN_RADIUS = 96

var OMT_BASE_IDS = [
  'omtreborn:turret_base_tier_1',
  'omtreborn:turret_base_tier_2',
  'omtreborn:turret_base_tier_3',
  'omtreborn:turret_base_tier_4',
  'omtreborn:turret_base_tier_5',
]

var omtBasePositions = {} // "x,y,z" -> [x, y, z]
var omtBaseScanned = false

function omtIsTurretBase(block) {
  return OMT_BASE_IDS.includes(`${block.getId()}`)
}

// Switches the base at block on if it's off. TurretBaseBlockEntity#
// informUpdate saves it and sends the new state to nearby clients.
function omtActivateBase(block) {
  var be = block.getEntity()
  if (!be || be.isActive()) return
  be.setActive(true)
  be.informUpdate()
}

function omtTrackBase(block) {
  omtBasePositions[`${block.getX()},${block.getY()},${block.getZ()}`] = [block.getX(), block.getY(), block.getZ()]
}

// Only reads chunks that are already loaded. The square is forceloaded, so
// all of it normally is.
function omtScanBaseArea(level, data) {
  var cx0 = (data.getInt('td_pedestalX') - OMT_BASE_SCAN_RADIUS) >> 4
  var cx1 = (data.getInt('td_pedestalX') + OMT_BASE_SCAN_RADIUS) >> 4
  var cz0 = (data.getInt('td_pedestalZ') - OMT_BASE_SCAN_RADIUS) >> 4
  var cz1 = (data.getInt('td_pedestalZ') + OMT_BASE_SCAN_RADIUS) >> 4
  for (var cx = cx0; cx <= cx1; cx++) {
    for (var cz = cz0; cz <= cz1; cz++) {
      if (!level.hasChunk(cx, cz)) continue
      var it = level.getChunk(cx, cz).getBlockEntitiesPos().iterator()
      while (it.hasNext()) {
        var block = level.getBlock(it.next())
        if (omtIsTurretBase(block)) omtTrackBase(block)
      }
    }
  }
}

BlockEvents.placed(OMT_BASE_IDS, (event) => {
  omtTrackBase(event.block)
})

BlockEvents.rightClicked(OMT_BASE_IDS, (event) => {
  omtTrackBase(event.block)
  omtActivateBase(event.block)
})

// Overworld only: worldData() is null elsewhere, and the base is there.
ServerEvents.tick((event) => {
  var level = event.server.getLevel('minecraft:overworld')
  if (!level || level.getTime() % OMT_BASE_SWEEP_TICKS !== 0) return
  if (!omtBaseScanned) {
    // The marker entity can load a little after the server starts, so the
    // scan waits for worldData().
    var data = worldData(level)
    if (!data) return
    omtBaseScanned = true
    omtScanBaseArea(level, data)
  }
  Object.keys(omtBasePositions).forEach((key) => {
    var pos = omtBasePositions[key]
    if (!level.hasChunk(pos[0] >> 4, pos[2] >> 4)) return
    var block = level.getBlock(pos[0], pos[1], pos[2])
    if (!omtIsTurretBase(block)) {
      delete omtBasePositions[key] // broken or replaced
      return
    }
    omtActivateBase(block)
  })
})
