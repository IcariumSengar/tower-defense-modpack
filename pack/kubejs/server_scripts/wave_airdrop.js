// Supply airdrop after every 5th wave, using the Realistic Airdrop mod
// (dyairdrop). State lives in worldData() from world_state.js.
//
// wave_status.js calls maybeTriggerWaveAirdrop() on each wave clear. That picks
// a landing spot and force-loads the plane's flight path; 12 s later the tick
// handler launches the plane with /setairdrop free. The mod drops a falling
// crate entity and swaps it for the crate block on landing, so "crate entity
// seen, then gone" means it has landed. The handler then marks the crate with
// a beacon and a Xaero's Minimap waypoint, and removes it once it is emptied.
// The mod's own random airdrops, enemies at crates and force-loading are off
// in pack/config/dyairdrop.toml.

// The constants below rely on how Realistic Airdrop behaves:
// - /setairdrop free <x> <z> <height> <length> <block> <loot table> <pin>
//   summons the plane 60 ticks later, `length` blocks west of (x, z), at
//   absolute Y `height`. <pin> password-locks the crate.
// - The plane flies due east and drops a crate entity once it has flown
//   `length` blocks. The crate falls straight down from a whole-block x/z, and
//   the mod replaces it with the crate block when it lands.
// - The jar is patched (docs/MODS.md, "Patched jars"): the plane covers about
//   0.84 blocks/tick and despawns at flight tick 400.
var WAVE_AIRDROP_INTERVAL = 5
var WAVE_AIRDROP_BLOCK_ID = 'dyairdrop:airdroplarge'
var WAVE_AIRDROP_LOOT_TABLE = 'kubejs:chests/wave_airdrop'
var WAVE_AIRDROP_HEIGHT_ABOVE_PEDESTAL = 40
// The plane's approach in blocks (`length` above). At 0.84 blocks/tick it
// reaches the drop point at flight tick ~240 (12 s), which must stay under the
// 400-tick despawn.
var WAVE_AIRDROP_LENGTH = 200
// Landing distance from the pedestal, in blocks, in any direction. The plane
// always comes from the west, so it only crosses the base when the crate lands
// to the east. Early crates often land outside the world border. Players can't
// cross it or use blocks beyond it (ServerLevel#mayInteract checks the border)
// until the amulet on the pedestal pushes it out (amulet_pedestal.js); the
// crate is meant to be something to go and get.
var WAVE_AIRDROP_DISTANCE_MIN = 90
var WAVE_AIRDROP_DISTANCE_MAX = 110
// Entities freeze outside every player's simulation distance unless their chunk
// is force-loaded. A target west of the base puts the plane's spawn point up to
// 310 blocks out, where it would hang frozen and never drop, so the chunk row
// it flies along is force-loaded from the wave clear until the plane is gone
// and the crate has landed. Chunks inside the base's permanent forceload square
// are left alone: `forceload remove` isn't reference-counted and would strip
// the base's own. The radius below must match that square in
// playtest_starter_kit.js.
var WAVE_AIRDROP_BASE_FORCELOAD_RADIUS = 96
// Blocks past the target that the flight strip covers; the plane gets about 150
// blocks past it before despawning.
var WAVE_AIRDROP_TAIL_BLOCKS = 176
// Minimum ticks after launch that the flight strip stays force-loaded: the
// 60-tick summon delay, the 400-tick flight and a margin.
var WAVE_AIRDROP_FORCE_HOLD_TICKS = 480
var WAVE_AIRDROP_LANDED_NOTE_TICKS = 20 * 20 // action-bar "crate landed" line
var WAVE_AIRDROP_BEACON_BLOCK = 'minecraft:beacon'
// A beacon draws no beam without a full 3x3 layer of #beacon_base_blocks under
// it. Reinforced iron is in that tag, and a survival player can't break or
// un-reinforce one placed by command (it has no owner), so the base is no
// source of iron.
var WAVE_AIRDROP_BEACON_BASE_BLOCK = 'securitycraft:reinforced_iron_block'

// The launch comes 12 s after the wave clear, so the LOOK UP title doesn't
// overwrite the wave-clear titles and the flight strip has time to load. The
// landing watch gives up 60 s after launch.
var WAVE_AIRDROP_DELAY_TICKS = 240
var WAVE_AIRDROP_WATCH_TIMEOUT_TICKS = 1200
var WAVE_AIRDROP_POLL_TICKS = 10
var WAVE_AIRDROP_CRATE_ENTITIES = ['dyairdrop:airdrop', 'dyairdrop:smallairdrop', 'dyairdrop:weaponairdrop', 'dyairdrop:medicalairdrop']

// Looted-crate cleanup: the mod doesn't remove a crate when it is emptied. One
// crate is watched at a time, the one that last landed or was last opened, and
// removed once it has been looted. An unlooted crate stays for good: the mod's
// own crate removal is off (airdropstolentime in pack/config/dyairdrop.toml,
// and the patched jar, docs/MODS.md "Patched jars").

// Action-bar line from launch until the crate lands, then for
// WAVE_AIRDROP_LANDED_NOTE_TICKS after; null otherwise. The action bar is one
// shared line, so this file never writes it: wave_spawner.js's countdown and
// wave_status.js's hostile counter show this text in place of their own, with
// pedestalAlertActionbarText taking precedence.
function airdropInboundActionbarText(data, now) {
  if (data.getBoolean('td_airdropWatch')) return '§b✈ §fSupply plane coming in from the west - look up!'
  if (data.contains('td_airdropLandedUntilTick') && now < data.getInt('td_airdropLandedUntilTick')) {
    var beam = data.getBoolean('td_airdropBeaconActive') ? ' §f- follow the light beam' : ''
    return `§6Supply crate landed to the ${airdropCompassDirection(data, data.getInt('td_airdropCrateX'), data.getInt('td_airdropCrateZ'))}${beam}`
  }
  return null
}

// Called from wave_status.js on each wave clear. It only schedules the drop;
// the tick handler below launches it.
function maybeTriggerWaveAirdrop(player, data, waveNumber) {
  if (waveNumber % WAVE_AIRDROP_INTERVAL !== 0) return
  var now = player.getLevel().getTime()
  data.putInt('td_airdropDueTick', now + WAVE_AIRDROP_DELAY_TICKS)
  data.putBoolean('td_airdropPending', true)
  // Planned now so the flight strip is loaded by launch time.
  airdropPlanFlight(player.getServer(), data, now)
}

// Picks a landing spot and force-loads the chunk row the plane will fly along,
// from a chunk west of its spawn point to WAVE_AIRDROP_TAIL_BLOCKS past the
// target, after releasing any strip still held from the previous drop.
// 6.283185307179586 is 2*pi: Math.PI is undefined in this Rhino.
function airdropPlanFlight(server, data, now) {
  if (data.getBoolean('td_airdropForceActive')) airdropReleaseForceload(server, data)
  var px = data.getInt('td_pedestalX')
  var pz = data.getInt('td_pedestalZ')
  var distance = WAVE_AIRDROP_DISTANCE_MIN + Math.random() * (WAVE_AIRDROP_DISTANCE_MAX - WAVE_AIRDROP_DISTANCE_MIN)
  var angle = Math.random() * 6.283185307179586
  var tx = Math.round(px + Math.cos(angle) * distance)
  var tz = Math.round(pz + Math.sin(angle) * distance)
  data.putInt('td_airdropTargetX', tx)
  data.putInt('td_airdropTargetZ', tz)
  data.putBoolean('td_airdropTargetSet', true)
  data.putInt('td_airdropForceCX0', (tx - WAVE_AIRDROP_LENGTH - 16) >> 4)
  data.putInt('td_airdropForceCX1', (tx + WAVE_AIRDROP_TAIL_BLOCKS) >> 4)
  data.putInt('td_airdropForceCZ', tz >> 4)
  data.putBoolean('td_airdropForceActive', true)
  // launchWaveAirdrop() restarts this hold from the launch tick.
  data.putInt('td_airdropForceUntilTick', now + WAVE_AIRDROP_DELAY_TICKS + WAVE_AIRDROP_FORCE_HOLD_TICKS)
  airdropForceStrip(server, data, 'add')
}

// Runs `forceload <verb>` over the stored strip, skipping chunk columns inside
// the base's permanent forceload square. One chunk row is enough: the plane
// flies due east at a fixed z, and an entity ticks with its own chunk.
function airdropForceStrip(server, data, verb) {
  var cx0 = data.getInt('td_airdropForceCX0')
  var cx1 = data.getInt('td_airdropForceCX1')
  var cz = data.getInt('td_airdropForceCZ')
  var px = data.getInt('td_pedestalX')
  var pz = data.getInt('td_pedestalZ')
  var r = WAVE_AIRDROP_BASE_FORCELOAD_RADIUS
  var segments = [[cx0, cx1]]
  if (cz >= (pz - r) >> 4 && cz <= (pz + r) >> 4) {
    segments = [[cx0, Math.min(cx1, ((px - r) >> 4) - 1)], [Math.max(cx0, ((px + r) >> 4) + 1), cx1]]
  }
  for (var i = 0; i < segments.length; i++) {
    var a = segments[i][0]
    var b = segments[i][1]
    if (a > b) continue
    server.runCommandSilent(`forceload ${verb} ${a * 16} ${cz * 16} ${b * 16 + 15} ${cz * 16 + 15}`)
  }
}

function airdropReleaseForceload(server, data) {
  data.putBoolean('td_airdropForceActive', false)
  airdropForceStrip(server, data, 'remove')
}

function launchWaveAirdrop(server, level, data, now) {
  // A drop scheduled without a stored target (an older save) is planned here;
  // the 60-tick summon delay still gives the strip a moment to load.
  if (!data.getBoolean('td_airdropTargetSet')) airdropPlanFlight(server, data, now)
  data.putBoolean('td_airdropTargetSet', false)
  var tx = data.getInt('td_airdropTargetX')
  var tz = data.getInt('td_airdropTargetZ')
  var height = data.getInt('td_pedestalY') + WAVE_AIRDROP_HEIGHT_ABOVE_PEDESTAL
  // Always the full length: with noPhysics (see the spawn hook below) neither
  // the world border nor terrain can stop the plane.
  var length = WAVE_AIRDROP_LENGTH
  data.putInt('td_airdropForceUntilTick', now + WAVE_AIRDROP_FORCE_HOLD_TICKS)
  // The mod prints no coordinates for a `free` drop, so log where it is headed.
  console.log(`wave_airdrop.js: supply plane launched toward (${tx}, ${tz}) at Y ${height}, spawning ${length} blocks west of it`)
  server.runCommandSilent(
    `setairdrop free ${tx} ${tz} ${height} ${length} "${WAVE_AIRDROP_BLOCK_ID}" "${WAVE_AIRDROP_LOOT_TABLE}" false`
  )
  server.runCommandSilent(`title @a title {"text":"LOOK UP","color":"gold","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"Supply plane coming in from the west - watch the sky.","color":"yellow"}`)
  // At each player's own position, so everyone hears it at full volume.
  server.runCommandSilent('execute as @a at @s run playsound minecraft:block.note_block.bell master @s ~ ~ ~ 1 1.2')
  data.putBoolean('td_airdropWatch', true)
  data.putBoolean('td_airdropCrateSeen', false)
  data.putInt('td_airdropWatchUntilTick', now + WAVE_AIRDROP_WATCH_TIMEOUT_TICKS)
}

// Gives every plane noPhysics. The mod discards a plane, with an explosion, as
// soon as its x-velocity is 0 or isInWall() is true, and vanilla collision
// treats the world border as a wall near its edge, so a flight that grazes the
// border or clips terrain would end early, often before the drop. With
// noPhysics, Entity#move skips collision and isInWall() returns false. The flag
// isn't saved, but this event also fires for entities loaded from disk.
var WAVE_AIRDROP_PLANE_TYPES = ['dyairdrop:plane', 'dyairdrop:transportplane']
EntityEvents.spawned((event) => {
  var entity = event.entity
  if (!WAVE_AIRDROP_PLANE_TYPES.includes(`${entity.type}`)) return
  try {
    entity.noPhysics = true
  } catch (e) {
    console.log(`wave_airdrop.js: could not set noPhysics on the plane: ${e}`)
  }
})

function findAirdropCrate(level) {
  return level.getEntities().find((e) => WAVE_AIRDROP_CRATE_ENTITIES.includes(`${e.type}`))
}

// Y of the crate block in column (x, z), searched downwards from just above
// the falling crate's last sampled Y (taken up to one poll before touchdown).
// null if there is none.
function findLandedCrateY(level, x, z, fromY) {
  for (var y = fromY + 4; y >= fromY - 40; y--) {
    if (`${level.getBlock(x, y, z).getId()}` === WAVE_AIRDROP_BLOCK_ID) return y
  }
  return null
}

// Removes the tracked beacon and its base. Given crate coordinates, it only
// does so if the beacon stands on that crate, so ending the watch on an older
// crate can't take down the newest drop's beam. Each block is read before it
// is set: the read loads its chunk (the base can reach into a neighbouring
// one), and a setblock into an unloaded chunk fails silently and would leave
// an untracked, breakable beacon.
function removeAirdropBeacon(server, level, data, crateX, crateY, crateZ) {
  if (!data.getBoolean('td_airdropBeaconActive')) return
  var bx = data.getInt('td_airdropBeaconX')
  var by = data.getInt('td_airdropBeaconY')
  var bz = data.getInt('td_airdropBeaconZ')
  if (crateX !== undefined && (bx !== crateX || by <= crateY || bz !== crateZ)) return
  data.putBoolean('td_airdropBeaconActive', false)
  if (`${level.getBlock(bx, by, bz).getId()}` === WAVE_AIRDROP_BEACON_BLOCK) {
    server.runCommandSilent(`setblock ${bx} ${by} ${bz} minecraft:air`)
  }
  for (var dx = -1; dx <= 1; dx++) {
    for (var dz = -1; dz <= 1; dz++) {
      if (`${level.getBlock(bx + dx, by - 1, bz + dz).getId()}` !== WAVE_AIRDROP_BEACON_BASE_BLOCK) continue
      server.runCommandSilent(`setblock ${bx + dx} ${by - 1} ${bz + dz} minecraft:air`)
    }
  }
}

// Whether the chunk holding (x, z) is loaded, without loading it. If Rhino
// can't reach LevelAccessor#hasChunk, assume it is.
function airdropChunkLoaded(level, x, z) {
  try {
    return level.hasChunk(x >> 4, z >> 4)
  } catch (e) {
    return true
  }
}

// A beacon over the landed crate marks it from far away: a 3x3 base on top of
// the crate with the beacon on it. The base only goes into air, so where the
// ground beside the crate is higher it is raised up to two blocks, and without
// room it isn't placed at all. The crate fell through this column, so the sky
// above the beacon is clear. One beacon is tracked at a time. Returns whether
// it was placed.
function placeAirdropBeacon(server, level, data, x, y, z) {
  removeAirdropBeacon(server, level, data)
  for (var baseY = y + 1; baseY <= y + 3; baseY++) {
    if (!airdropBeaconRoom(level, x, baseY, z)) continue
    server.runCommandSilent(`fill ${x - 1} ${baseY} ${z - 1} ${x + 1} ${baseY} ${z + 1} ${WAVE_AIRDROP_BEACON_BASE_BLOCK}`)
    server.runCommandSilent(`setblock ${x} ${baseY + 1} ${z} ${WAVE_AIRDROP_BEACON_BLOCK}`)
    data.putInt('td_airdropBeaconX', x)
    data.putInt('td_airdropBeaconY', baseY + 1)
    data.putInt('td_airdropBeaconZ', z)
    data.putBoolean('td_airdropBeaconActive', true)
    return true
  }
  return false
}

// Whether the 3x3 layer at baseY around (x, z) and the block above its centre
// are all air. The reads also load every chunk the base touches, which the
// fill needs.
function airdropBeaconRoom(level, x, baseY, z) {
  if (!level.getBlock(x, baseY + 1, z).getBlockState().isAir()) return false
  for (var dx = -1; dx <= 1; dx++) {
    for (var dz = -1; dz <= 1; dz++) {
      if (!level.getBlock(x + dx, baseY, z + dz).getBlockState().isAir()) return false
    }
  }
  return true
}

// Eight-point compass direction ("north", "north-east", ...) from the pedestal
// to (x, z). Titles and chat give this rather than coordinates; the waypoint
// line carries the exact spot. North is -z; 6.283185307179586 is 2*pi.
var AIRDROP_COMPASS_POINTS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east']
function airdropCompassDirection(data, x, z) {
  var dx = x - data.getInt('td_pedestalX')
  var dz = z - data.getInt('td_pedestalZ')
  var eighths = Math.round(Math.atan2(dz, dx) / (6.283185307179586 / 8))
  return AIRDROP_COMPASS_POINTS[((eighths % 8) + 8) % 8]
}

// Xaero's Minimap has no server-side waypoint command, but it turns a chat line
// of the form "<sender> xaero-waypoint:<name>:<initials>:<x>:<y>:<z>:<colour>:
// <rotate>:<yaw>" into "<sender> shared a waypoint" with an [Add] button.
// Colour 6 is gold.
function sendAirdropWaypoint(server, x, y, z) {
  server.runCommandSilent(`tellraw @a {"text":"<Supply Drop> xaero-waypoint:Supply Crate:S:${x}:${y}:${z}:6:false:0"}`)
}

// The tracked beacon and its base can't be broken, or every drop would hand out
// a free beacon. Survival players already can't break the unowned base; this
// also holds in creative. pollAirdropCrateCleanup removes them.
function airdropBeaconPart(block) {
  var data = worldData(block.getLevel())
  if (!data || !data.getBoolean('td_airdropBeaconActive')) return false
  var dx = block.getX() - data.getInt('td_airdropBeaconX')
  var dy = block.getY() - data.getInt('td_airdropBeaconY')
  var dz = block.getZ() - data.getInt('td_airdropBeaconZ')
  if (dy === 0) return dx === 0 && dz === 0
  return dy === -1 && Math.abs(dx) <= 1 && Math.abs(dz) <= 1
}
BlockEvents.broken(WAVE_AIRDROP_BEACON_BLOCK, (event) => {
  if (airdropBeaconPart(event.block)) event.cancel()
})
BlockEvents.broken(WAVE_AIRDROP_BEACON_BASE_BLOCK, (event) => {
  if (airdropBeaconPart(event.block)) event.cancel()
})

// One-off burst at landing. `force` shows it to players up to 512 blocks away
// instead of 32.
function fireAirdropLandingBurst(server, x, y, z) {
  server.runCommandSilent(
    `particle minecraft:end_rod ${x + 0.5} ${y + 1} ${z + 0.5} 0.25 20 0.25 0.02 120 force`
  )
  server.runCommandSilent(`particle minecraft:flash ${x + 0.5} ${y + 1} ${z + 0.5} 0 0 0 0 1 force`)
}

// Right-clicking a crate makes it the one pollAirdropCrateCleanup watches.
BlockEvents.rightClicked(WAVE_AIRDROP_BLOCK_ID, (event) => {
  var block = event.block
  var level = event.entity.getLevel()
  var data = worldData(level)
  if (!data) return
  data.putInt('td_airdropCrateX', block.getX())
  data.putInt('td_airdropCrateY', block.getY())
  data.putInt('td_airdropCrateZ', block.getZ())
  data.putBoolean('td_airdropCrateWatch', true)
})

// True once the crate's loot has been unpacked and every slot is empty. The
// crate is a vanilla RandomizableContainerBlockEntity, which saves a LootTable
// key until first opened and an Items list after. This reads the saved NBT
// because the item handler would call getItem() and unpack the loot early,
// with no player. A read error counts as not looted.
function airdropCrateLooted(block) {
  try {
    var nbt = block.getEntityData()
    if (!nbt) return false
    if (nbt.contains('LootTable')) return false
    if (!nbt.contains('Items')) return true
    return nbt.getList('Items', 10).isEmpty()
  } catch (e) {
    console.log('wave_airdrop.js: crate NBT read failed: ' + e)
    return false
  }
}

// Removes the watched crate, and its beacon, once it has been looted. The
// beacon also goes if the crate is broken.
function pollAirdropCrateCleanup(server, level, data) {
  if (!data.getBoolean('td_airdropCrateWatch')) return
  var x = data.getInt('td_airdropCrateX')
  var y = data.getInt('td_airdropCrateY')
  var z = data.getInt('td_airdropCrateZ')
  // Skipped while the crate's chunk is unloaded: getBlock() would load it
  // synchronously on every poll. Nobody can loot it meanwhile.
  if (!airdropChunkLoaded(level, x, z)) return
  var block = level.getBlock(x, y, z)
  if (`${block.getId()}` !== WAVE_AIRDROP_BLOCK_ID) {
    data.putBoolean('td_airdropCrateWatch', false) // crate broken or replaced
    removeAirdropBeacon(server, level, data, x, y, z)
    return
  }
  if (!airdropCrateLooted(block)) return
  data.putBoolean('td_airdropCrateWatch', false)
  removeAirdropBeacon(server, level, data, x, y, z)
  server.runCommandSilent(`setblock ${x} ${y} ${z} minecraft:air`)
  server.runCommandSilent(`particle minecraft:poof ${x + 0.5} ${y + 0.5} ${z + 0.5} 0.4 0.4 0.4 0.02 25`)
  server.runCommandSilent(`playsound minecraft:block.wool.break block @a ${x} ${y} ${z} 1 0.8`)
}

// Airdrop state machine, polled every WAVE_AIRDROP_POLL_TICKS. It runs once
// per player, but only in the overworld (worldData() is null elsewhere). Each
// step is safe to repeat within a tick, so extra players online do no harm.
PlayerEvents.tick((event) => {
  var player = event.player
  var level = player.getLevel()
  var now = level.getTime()
  if (now % WAVE_AIRDROP_POLL_TICKS !== 0) return
  var data = worldData(level)
  if (!data) return

  // Independent of the drop below: an old crate can outlast the next launch.
  pollAirdropCrateCleanup(player.getServer(), level, data)

  // Release the flight strip once the hold is over and the landing watch ended.
  if (
    data.getBoolean('td_airdropForceActive') &&
    !data.getBoolean('td_airdropPending') &&
    !data.getBoolean('td_airdropWatch') &&
    now >= data.getInt('td_airdropForceUntilTick')
  ) {
    airdropReleaseForceload(player.getServer(), data)
  }

  if (data.getBoolean('td_airdropPending')) {
    if (now < data.getInt('td_airdropDueTick')) return
    data.putBoolean('td_airdropPending', false)
    launchWaveAirdrop(player.getServer(), level, data, now)
    return
  }

  if (!data.getBoolean('td_airdropWatch')) return
  if (now >= data.getInt('td_airdropWatchUntilTick')) {
    data.putBoolean('td_airdropWatch', false)
    return
  }

  var crate = findAirdropCrate(level)
  if (crate) {
    if (!data.getBoolean('td_airdropCrateSeen')) data.putBoolean('td_airdropCrateSeen', true)
    // It falls straight down, so this x/z is where the block will land.
    data.putInt('td_airdropFlightX', Math.round(crate.getX()))
    data.putInt('td_airdropFlightY', Math.round(crate.getY()))
    data.putInt('td_airdropFlightZ', Math.round(crate.getZ()))
    return
  }
  if (!data.getBoolean('td_airdropCrateSeen')) return // plane still on its way in

  // Crate entity seen and now gone: the mod has placed the crate block.
  data.putBoolean('td_airdropWatch', false)
  var server = player.getServer()
  server.runCommandSilent('execute as @a at @s run playsound minecraft:entity.player.levelup master @s ~ ~ ~ 0.6 1.4')

  // If the block isn't found, only the waypoint (at the last sampled Y) and the
  // messages go out, and the watch starts when a player opens the crate.
  // Otherwise the landed crate becomes the watched crate and gets a beacon.
  var lx = data.getInt('td_airdropFlightX')
  var lz = data.getInt('td_airdropFlightZ')
  var ly = findLandedCrateY(level, lx, lz, data.getInt('td_airdropFlightY'))
  if (ly === null) {
    sendAirdropWaypoint(server, lx, data.getInt('td_airdropFlightY'), lz)
    server.runCommandSilent(`title @a title {"text":"","color":"gold"}`)
    server.runCommandSilent(`title @a subtitle {"text":"Supply crate landed to the ${airdropCompassDirection(data, lx, lz)}.","color":"gold","bold":true}`)
    server.runCommandSilent(`tellraw @a {"text":"Supply crate landed to the ${airdropCompassDirection(data, lx, lz)}. Click Add on the line above to pin it on your map.","color":"gold"}`)
    return
  }
  data.putInt('td_airdropCrateX', lx)
  data.putInt('td_airdropCrateY', ly)
  data.putInt('td_airdropCrateZ', lz)
  data.putBoolean('td_airdropCrateWatch', true)
  data.putInt('td_airdropLandedUntilTick', now + WAVE_AIRDROP_LANDED_NOTE_TICKS)
  fireAirdropLandingBurst(server, lx, ly, lz)
  var beam = placeAirdropBeacon(server, level, data, lx, ly, lz) ? ' - follow the light beam' : ''
  sendAirdropWaypoint(server, lx, ly, lz)
  server.runCommandSilent(`title @a title {"text":"","color":"gold"}`)
  server.runCommandSilent(`title @a subtitle {"text":"Supply crate landed to the ${airdropCompassDirection(data, lx, lz)}${beam}.","color":"gold","bold":true}`)
  server.runCommandSilent(`tellraw @a {"text":"Supply crate landed to the ${airdropCompassDirection(data, lx, lz)}. Click Add on the line above to pin it on your map.","color":"gold"}`)
})
