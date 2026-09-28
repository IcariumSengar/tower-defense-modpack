// The Lure Block's actual behavior - see startup_scripts/lure_block.js
// for the block registration/model, and mob_aggro.js's own targeting
// loop (edited alongside this file) for how wave mobs actually respond
// to one.
//
// Recipe: a real vanilla Target block (the "draws attention" motif this
// block's own texture already borrows) + rotten flesh (real zombie bait)
// + redstone (the timer) - cheap, thematically obvious, no new mod.
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

// Real vanilla Mob#setTarget() needs a LivingEntity, not a BlockPos - same
// problem mob_aggro.js's own td_pedestal_target marker solves for the
// pedestal. An invisible, no-gravity marker armor stand spawns at the
// lure block's own position the moment it's placed, tagged
// td_lure_target, carrying its own expiry tick and the block's position
// in its own persistentData (self-contained - no shared worldData key
// needed, since a lure is a short-lived, player-placed object, not
// permanent campaign state like the pedestal).
var LURE_DURATION_TICKS = 1200 // 60 real seconds - a real tactical window, not a permanent decoy
var LURE_ATTRACT_RADIUS = 40 // meaningfully smaller than STRAY_DISTANCE (mob_aggro.js, 90) - a redirect, not a global magnet
var LURE_WARNING_TICKS = 100 // last 5s - one particle cue before it goes, same "give some warning" idiom as pedestal_health.js's own alert tiers

BlockEvents.placed('kubejs:lure_block', (event) => {
  var level = event.getLevel()
  var block = event.getBlock()
  var x = block.getX()
  var y = block.getY()
  var z = block.getZ()

  var marker = level.createEntity('minecraft:armor_stand')
  marker.setPosition(x + 0.5, y, z + 0.5)
  marker.mergeNbt({ Invisible: true, NoGravity: true, Marker: true, PersistenceRequired: true, Tags: ['td_lure_target'] })
  marker.spawn()
  marker.persistentData.putInt('td_lureExpireTick', level.getTime() + LURE_DURATION_TICKS)
  marker.persistentData.putInt('td_lureBlockX', x)
  marker.persistentData.putInt('td_lureBlockY', y)
  marker.persistentData.putInt('td_lureBlockZ', z)

  try {
    var placer = event.getEntity()
    if (placer) placer.tell('§6[Lure] §fPlaced - nearby hordes will turn on it for the next minute.')
  } catch (e) {
    // Not critical - the block itself is the real feedback.
  }
})

// Nearest live lure marker within `radius` blocks of (x,z), or null.
// Shared top-level FUNCTION (the proven cross-file idiom in this
// codebase - see mob_aggro.js's own header for why var/const don't work
// the same way) - called from mob_aggro.js's per-mob targeting loop so
// that file doesn't need its own copy of the lure-scanning logic.
//
// Performance pass 2026-09-26: mob_aggro.js calls this once PER WAVE MOB
// every 10 ticks, and each call used to be its own full-level entity scan
// (60 mobs = 60 scans per pass). The lure list is now collected once per
// level per tick and reused by every later call in that same tick - lures
// only change on placement/expiry, never mid-pass. Removed entries (a lure
// that expired earlier this tick) are skipped.
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

// Expiry - throttled once/second (a timer, not a twitch mechanic). Breaks
// the block if it's still there (a player could have mined it early,
// which just leaves a now-pointless marker to clean up) and always
// discards the marker on expiry either way.
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
      if (remaining <= LURE_WARNING_TICKS && remaining > LURE_WARNING_TICKS - 20) {
        server.runCommandSilent(`particle minecraft:smoke ${e.getX()} ${e.getY() + 0.5} ${e.getZ()} 0.3 0.3 0.3 0.02 15`)
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
