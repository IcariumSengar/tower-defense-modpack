// Real "the world fogs up as you approach the border" effect
// (docs/IDEAS.md's Fog Wall idea, Day/Night Density Contrast). No Forge
// 1.20.1 mod exists that renders fog at the worldborder's fixed position
// (checked exhaustively - see docs/MODS.md's Atmosphere & Wave Feel
// entry), but YetGamer's Custom Fog's /fog command is real, scriptable,
// distance-based fog - this uses it continuously, scaling density with
// the player's actual distance to the nearest border edge, instead of
// the one-shot wave-state set wave_spawner.js already does.
//
// Deliberately does nothing while a wave is active - wave_spawner.js's
// useWaveHorn sets deliberate, already-tuned (heavier) combat fog on
// wave start, and wave_status.js resets it on wave clear. This script
// only manages the *peacetime/day* gap between waves, so it never
// fights the wave-time fog for control of the same command.
// lastAppliedMaxDistance resets to -1 every tick a wave is active, so
// the first peacetime tick after a wave clears always re-applies fresh
// rather than skipping because the computed value happens to match a
// now-stale cache.
//
// Deliberately kept lighter than wave-time fog, not deleted - removed
// entirely once this session (2026-08-20) on a misreading of "only
// during a wave" as "day should have zero fog"; the actual ask was day
// gets light fog near the border, night gets heavy fog everywhere - two
// different densities, not fog-vs-no-fog. NEAR_MAX_DISTANCE (60) stays
// meaningfully lighter than wave-time's fixed MaxDistance (32) even
// right at the border edge, so night reads as denser without day being
// silent.
//
// Border treated as a square (min/maxX, min/maxZ) via
// level.getWorldBorder() - same accessor wave_spawner.js already uses
// for spawn clamping - matching vanilla's actual border shape, not a
// circle.

var PROXIMITY_FOG_START = 40 // blocks from the nearest edge where fog begins thickening
var PROXIMITY_FOG_END = 5 // blocks from the nearest edge where fog is at its densest
var FAR_MAX_DISTANCE = 200 // fog barely noticeable deep inside the border
var NEAR_MAX_DISTANCE = 60 // light fog right at the edge - stays lighter than wave-time's fixed 32
var MIN_DISTANCE = 10

var lastAppliedMaxDistance = -1

// YetGamer's Custom Fog prints its own "Fog updated" style chat message
// on every /fog call by default - fine for a single manual command, but
// this script calls it up to 4x/second while the player is moving near
// the border, which would spam chat constantly. The mod's own
// documentation ties this output to vanilla's sendCommandFeedback
// gamerule, so silencing it here covers this script (and is harmless
// for every other command in this pack, since they're all run via
// runCommandSilent and never relied on seeing vanilla command feedback
// in the first place). ServerEvents.loaded fires once per server start
// regardless of which save is loaded, unlike playtest_starter_kit.js's
// PlayerEvents.loggedIn gate - so this takes effect on the next
// relaunch even for a save that's already past first-join.
ServerEvents.loaded(function (event) {
  event.server.runCommandSilent('gamerule sendCommandFeedback false')
})

function lerp(a, b, t) {
  return a + (b - a) * t
}

PlayerEvents.tick(function (event) {
  var player = event.entity
  var level = player.getLevel()

  // Throttled to every 5 ticks (4x/second) - frequent enough to feel
  // smooth while walking toward/away from the edge, cheap enough (one
  // distance calc, no entity scan) that the throttle is just politeness.
  if (level.getTime() % 5 !== 0) return

  var data = player.persistentData
  if (data.getBoolean('td_inWave')) {
    lastAppliedMaxDistance = -1
    return
  }

  var border = level.getWorldBorder()
  var x = player.getX()
  var z = player.getZ()
  var distToEdge = Math.min(
    x - border.getMinX(),
    border.getMaxX() - x,
    z - border.getMinZ(),
    border.getMaxZ() - z
  )
  distToEdge = Math.max(0, distToEdge)

  var t = 1 - (distToEdge - PROXIMITY_FOG_END) / (PROXIMITY_FOG_START - PROXIMITY_FOG_END)
  t = Math.max(0, Math.min(1, t))

  var maxDistance = Math.round(lerp(FAR_MAX_DISTANCE, NEAR_MAX_DISTANCE, t))
  if (maxDistance === lastAppliedMaxDistance) return
  lastAppliedMaxDistance = maxDistance

  player.getServer().runCommandSilent(
    'fog @a set ' + MIN_DISTANCE + ' ' + maxDistance + ' 25 25 30 0.3 cylinder'
  )
})
