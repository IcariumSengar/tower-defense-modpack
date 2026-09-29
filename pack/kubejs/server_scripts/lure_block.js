// Lure Block behaviour: recipe, placement, countdown and expiry. The block is
// registered in startup_scripts/lure_block.js, and mob_aggro.js calls
// nearestActiveLure() to send nearby wave mobs to a live lure instead of the
// pedestal.
ServerEvents.recipes((event) => {
  event.shaped('kubejs:lure_block', [
    'FRF',
    'RTR',
    'FRF',
  ], {
    F: 'minecraft:rotten_flesh',
    R: 'minecraft:redstone',
    T: 'minecraft:target',
  })
})

var LURE_DURATION_TICKS = 1200 // 60 s
// Blocks, horizontal; read by mob_aggro.js. The Lure Block quest in
// campaign.snbt quotes 40.
var LURE_ATTRACT_RADIUS = 40
var LURE_WARNING_TICKS = 100 // last 5 s: red nameplate and one smoke puff

var LURE_BELL_EVERY_SECONDS = 5 // bell interval, in seconds of countdown

function lureNameplate(remainingTicks) {
  var seconds = Math.max(0, Math.ceil(remainingTicks / 20))
  var color = remainingTicks <= LURE_WARNING_TICKS ? 'red' : 'gold'
  return `{"text":"Lure ${seconds}s","color":"${color}","bold":true}`
}

// Mob#setTarget() needs a LivingEntity, so each placed lure spawns an
// invisible marker armor stand on top of the block, tagged td_lure_target and
// showing a countdown nameplate. Its persistentData holds the expiry tick and
// the block position, so lures need no shared world state.
BlockEvents.placed('kubejs:lure_block', (event) => {
  var level = event.getLevel()
  var block = event.getBlock()
  var x = block.getX()
  var y = block.getY()
  var z = block.getZ()

  var marker = level.createEntity('minecraft:armor_stand')
  marker.setPosition(x + 0.5, y + 1, z + 0.5)
  marker.mergeNbt({ Invisible: true, NoGravity: true, Marker: true, PersistenceRequired: true, Tags: ['td_lure_target'], CustomNameVisible: true, CustomName: lureNameplate(LURE_DURATION_TICKS) })
  marker.spawn()
  marker.persistentData.putInt('td_lureExpireTick', level.getTime() + LURE_DURATION_TICKS)
  marker.persistentData.putInt('td_lureBlockX', x)
  marker.persistentData.putInt('td_lureBlockY', y)
  marker.persistentData.putInt('td_lureBlockZ', z)

  try {
    var placer = event.getEntity()
    if (placer) placer.tell('§6[Lure] §fPlaced - nearby hordes will turn on it for the next minute.')
  } catch (e) {
    // The chat message is optional.
  }
})

// Nearest live lure marker within `radius` blocks of (x, z), or null.
// mob_aggro.js calls this by name for each wave mob it steers, so it must stay
// a top-level function. The marker list is built once per level per tick and
// reused; markers discarded earlier in the tick are skipped.
var tdLureCacheTick = -1
var tdLureCacheLevel = null
var tdLureCacheList = []

function nearestActiveLure(level, x, z, radius) {
  var now = Number(level.getTime())
  if (tdLureCacheTick !== now || tdLureCacheLevel !== level) {
    var lures = []
    level.getEntities().forEach(function (e) {
      if (e.getTags().contains('td_lure_target')) lures.push(e)
    })
    tdLureCacheTick = now
    tdLureCacheLevel = level
    tdLureCacheList = lures
  }
  var best = null
  var bestDistSq = radius * radius
  for (var i = 0; i < tdLureCacheList.length; i++) {
    var e = tdLureCacheList[i]
    if (e.isRemoved()) continue
    var dx = e.getX() - x
    var dz = e.getZ() - z
    var distSq = dx * dx + dz * dz
    if (distSq > bestDistSq) continue
    best = e
    bestDistSq = distSq
  }
  return best
}

// Once a second, for each live lure: refresh the countdown nameplate, particles
// and bell. At expiry, remove the block if it is still there and discard the
// marker. Mining the block early doesn't end the lure; the marker keeps drawing
// mobs until it expires.
PlayerEvents.tick((event) => {
  var level = event.player.getLevel()
  var now = level.getTime()
  if (now % 20 !== 0) return

  var server = event.player.getServer()
  level.getEntities().forEach(function (e) {
    if (!e.getTags().contains('td_lure_target')) return
    var data = e.persistentData
    var remaining = data.getInt('td_lureExpireTick') - now

    if (remaining > 0) {
      e.mergeNbt({ CustomName: lureNameplate(remaining) })
      server.runCommandSilent(`particle minecraft:note ${e.getX()} ${e.getY() + 0.3} ${e.getZ()} 0.35 0.2 0.35 1 3`)
      var secondsLeft = Math.ceil(remaining / 20)
      if (secondsLeft % LURE_BELL_EVERY_SECONDS === 0) {
        server.runCommandSilent(`playsound minecraft:block.bell.use block @a ${e.getX()} ${e.getY()} ${e.getZ()} 0.8 1.2`)
      }
      if (remaining <= LURE_WARNING_TICKS && remaining > LURE_WARNING_TICKS - 20) {
        server.runCommandSilent(`particle minecraft:smoke ${e.getX()} ${e.getY()} ${e.getZ()} 0.3 0.3 0.3 0.02 15`)
      }
      return
    }

    var bx = data.getInt('td_lureBlockX')
    var by = data.getInt('td_lureBlockY')
    var bz = data.getInt('td_lureBlockZ')
    if (`${level.getBlock(bx, by, bz).getId()}` === 'kubejs:lure_block') {
      server.runCommandSilent(`setblock ${bx} ${by} ${bz} minecraft:air`)
      server.runCommandSilent(`particle minecraft:poof ${bx + 0.5} ${by + 0.5} ${bz + 0.5} 0.4 0.4 0.4 0.02 20`)
      server.runCommandSilent(`playsound minecraft:entity.zombie.death block @a ${bx} ${by} ${bz} 0.6 1.2`)
    }
    e.discard()
  })
})
