// Custom, deterministic 5-wave campaign — vanilla mobs only. Replaces
// relying on Pure Suffering's own (semi-random, hard to debug in-game)
// invasion-type system for this specific curated progression. Pure
// Suffering stays installed but dormant (enableInvasions false) —
// its broader invasion variety is still there to re-enable later.
//
// Each wave adds a mob type on top of the previous wave's roster, per
// design: 1) zombie+skeleton, 2) +spider, 3) +witch, 4) +wither_skeleton,
// 5) +ravager (mini boss). Calling the horn again past wave 5 repeats
// wave 5's composition — no waves designed beyond that yet.
//
// Counts are a first-pass guess, easy to retune (same pattern as
// base_expansion.js's tuning).
//
// Uses a plain custom item (kubejs:wave_horn), not vanilla's Goat Horn —
// tried Goat Horn first for the free texture/sound, but
// ItemEvents.rightClicked never fires at all while an item is on
// cooldown (confirmed from KubeJSItemEventHandler.java's own dispatch
// logic), and Goat Horn has a real vanilla cooldown built in. A plain
// item has no cooldown, so the event reliably fires; a manual sound
// effect below keeps the horn feel.
//
// Commands run via player.getServer().runCommandSilent(...), not
// player.runCommandSilent(...) — the latter executes with the player's
// own command permission level, which may not be enough for /summon
// (needs level 2) even with cheats nominally on. player.getServer()
// gets the console-level command source (always full permission).
//
// Hooked on BOTH ItemEvents.rightClicked and BlockEvents.rightClicked —
// confirmed in-game that both fire for the same click (contrary to
// Forge's documented "RightClickItem only fires when not targeting a
// block" — that rule didn't hold in practice here), so a same-tick
// dedup guard below prevents double-processing a single click.
//
// Player access is event.entity, not event.player — neither
// ItemClickedEventJS nor BlockRightClickedEventJS expose a .player
// property, only getEntity() (confirmed by reading both classes).
//
// Uses `var`, not `const`/`let`, inside both event callback bodies —
// confirmed via in-game testing that const/let in these specific
// repeatedly-invoked callbacks throws "TypeError: redeclaration of var
// X" on the second and later invocations (a Rhino quirk with these
// callback types specifically).
//
// Does NOT reference event.level.isClientSide anywhere — confirmed via
// in-game testing that merely accessing this property throws
// NullPointerException in this environment, independent of how it's
// used (conditional, log statement, template literal, all failed the
// same way). Root cause not fully understood; not needed anyway since
// the dedup guard makes it safe to be called from multiple firings.
//
// Uses player.getX()/getY()/getZ(), not bare .x/.y/.z — confirmed via
// in-game testing (summon commands built from .x/.y/.z came out as
// literal "NaN" for the coordinates, so /summon silently failed every
// time, result=0). getX()/getY()/getZ() are the real vanilla Entity
// methods, not remapped or hidden by KubeJS, so they're always safe to
// call directly. The bare-property form apparently doesn't resolve
// correctly for position in this environment even though it's a common
// pattern elsewhere in this codebase.

var WAVES = [
  [['zombie', 4], ['skeleton', 4]],
  [['zombie', 4], ['skeleton', 4], ['spider', 4]],
  [['zombie', 3], ['skeleton', 3], ['spider', 3], ['witch', 3]],
  [['zombie', 3], ['skeleton', 3], ['spider', 2], ['witch', 2], ['wither_skeleton', 3]],
  [['zombie', 2], ['skeleton', 2], ['spider', 2], ['witch', 2], ['wither_skeleton', 2], ['ravager', 1]],
]

var WAVE_MOB_TYPES = [
  'minecraft:zombie',
  'minecraft:skeleton',
  'minecraft:spider',
  'minecraft:witch',
  'minecraft:wither_skeleton',
  'minecraft:ravager',
]

function nearbyWaveMobCount(player, level, radius) {
  return level.getEntities().filter(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return false
    var dx = e.getX() - player.getX()
    var dy = e.getY() - player.getY()
    var dz = e.getZ() - player.getZ()
    return dx * dx + dy * dy + dz * dz <= radius * radius
  }).length
}

function useWaveHorn(player) {
  var level = player.getLevel()
  var server = player.getServer()
  var data = player.persistentData

  // Cooldown dedup (20 ticks / 1 second), not just same-tick — both
  // ItemEvents.rightClicked and BlockEvents.rightClicked fire for one
  // physical click, and holding right-click generates repeated events
  // across many ticks, so a same-tick-only check wasn't enough.
  var currentTick = level.getTime()
  var lastTick = data.getInt('td_lastHornUseTick')
  if (currentTick - lastTick < 20) return
  data.putInt('td_lastHornUseTick', currentTick)

  player.playSound(Utils.getSound('minecraft:event.raid.horn'))

  if (nearbyWaveMobCount(player, level, 80) > 0) {
    player.tell('§c[Wave Horn] §fClear the current wave before summoning the next one.')
    return
  }

  var waveNumber = data.getInt('td_waveNumber') + 1
  data.putInt('td_waveNumber', waveNumber)

  var composition = WAVES[Math.min(waveNumber, WAVES.length) - 1]
  var totalMobs = 0

  // Clamp spawn positions to the current worldborder (minus a margin so
  // nothing spawns literally against the wall) — without this, mobs
  // spawned at the usual 15-25 block radius could land outside a small
  // border, becoming permanently unreachable (and silently preventing
  // the hostile counter from ever reaching 0, so "wave defeated" would
  // never fire either).
  var border = level.getWorldBorder()
  var margin = 3
  var minX = border.getMinX() + margin
  var maxX = border.getMaxX() - margin
  var minZ = border.getMinZ() + margin
  var maxZ = border.getMaxZ() - margin

  composition.forEach(function (pair) {
    var mobType = pair[0]
    var count = pair[1]
    for (var i = 0; i < count; i++) {
      // 6.283185307179586 = 2*PI as a literal, not Math.PI - confirmed
      // via in-game testing that Math.PI itself evaluates to something
      // that isn't a usable number in this environment (Math.random(),
      // Math.cos(), Math.sin(), Math.floor() all work fine individually;
      // only Math.PI produced NaN when multiplied). Root cause not
      // understood, but sidestepping it entirely is simple and safe.
      var angle = Math.random() * 6.283185307179586
      var r = 15 + Math.random() * 10
      var x = Math.floor(player.getX() + Math.cos(angle) * r)
      var z = Math.floor(player.getZ() + Math.sin(angle) * r)
      x = Math.max(minX, Math.min(maxX, x))
      z = Math.max(minZ, Math.min(maxZ, z))
      // generic.follow_range boosted well past the spawn radius so mobs
      // can path the full distance once targeting the player. Secondary
      // to mob_aggro.js, which forces targeting directly and doesn't
      // depend on line of sight — this only matters once a mob already
      // has a target and needs to actually be allowed to chase that far.
      server.runCommandSilent(
        `summon minecraft:${mobType} ${x} ${Math.floor(player.getY())} ${z} {Attributes:[{Name:"generic.follow_range",Base:128}]}`
      )
      totalMobs++
    }
  })

  var displayWave = Math.min(waveNumber, WAVES.length)
  player.tell(`§6[Wave Horn] §fWave ${displayWave} incoming! (${totalMobs} mobs)`)
  // Big on-screen title (like an achievement popup), not just chat —
  // chat is easy to miss mid-fight. Uses vanilla /title via
  // runCommandSilent, consistent with every other command in this pack
  // rather than an unverified KubeJS-specific title API.
  server.runCommandSilent(`title @a title {"text":"WAVE ${displayWave}","color":"gold","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"${totalMobs} mobs incoming!","color":"white"}`)
}

// Covers right-clicking with nothing targeted (rare on Superflat, but
// possible e.g. looking up).
ItemEvents.rightClicked('kubejs:wave_horn', function (event) {
  useWaveHorn(event.entity)
})

// Covers right-clicking while targeting a block — the common case on
// Superflat. No per-item filter exists for this event (it filters by
// block, not held item), so it's unfiltered and checks the held item
// itself.
BlockEvents.rightClicked(function (event) {
  if (event.item.getId() !== 'kubejs:wave_horn') return
  useWaveHorn(event.entity)
})
