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
// logic), and Goat Horn has a real vanilla cooldown built in. That
// silently blocked every use after the first. A plain item has no
// cooldown, so the event reliably fires; a manual sound effect below
// keeps the horn feel.
//
// Commands run via player.getServer().runCommandSilent(...), not
// player.runCommandSilent(...) — the latter executes with the player's
// own command permission level (createCommandSourceStack() on the
// entity itself), which may not be enough for /summon (needs level 2)
// even with cheats nominally on. player.getServer() gets the actual
// console-level command source (always full permission), same pattern
// already proven working in playtest_starter_kit.js.
//
// Hooked on BOTH ItemEvents.rightClicked and BlockEvents.rightClicked —
// confirmed via Forge's own documented behavior (and multiple real bug
// reports) that the underlying RightClickItem event Forge fires
// *only* triggers when the player isn't targeting a block; targeting a
// block fires RightClickBlock instead, a completely separate event. On
// Superflat, the ground is within reach almost constantly, so relying
// on ItemEvents.rightClicked alone meant the handler essentially never
// fired — multiple real clicks produced zero log output, no errors, no
// tells, nothing. BlockEvents.rightClicked has no per-item filter (it
// filters by block, not by held item), so it's registered unfiltered
// and checks event.item.id itself.

const WAVES = [
  [['zombie', 4], ['skeleton', 4]],
  [['zombie', 4], ['skeleton', 4], ['spider', 4]],
  [['zombie', 3], ['skeleton', 3], ['spider', 3], ['witch', 3]],
  [['zombie', 3], ['skeleton', 3], ['spider', 2], ['witch', 2], ['wither_skeleton', 3]],
  [['zombie', 2], ['skeleton', 2], ['spider', 2], ['witch', 2], ['wither_skeleton', 2], ['ravager', 1]],
]

const WAVE_MOB_TYPES = [
  'minecraft:zombie',
  'minecraft:skeleton',
  'minecraft:spider',
  'minecraft:witch',
  'minecraft:wither_skeleton',
  'minecraft:ravager',
]

function nearbyWaveMobCount(player, level, radius) {
  return level.getEntities().filter((e) => {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return false
    const dx = e.x - player.x
    const dy = e.y - player.y
    const dz = e.z - player.z
    return dx * dx + dy * dy + dz * dz <= radius * radius
  }).length
}

function useWaveHorn(player) {
  const level = player.getLevel()
  const server = player.getServer()

  player.playSound(Utils.getSound('minecraft:event.raid.horn'))

  if (nearbyWaveMobCount(player, level, 80) > 0) {
    player.tell('§c[Wave Horn] §fClear the current wave before summoning the next one.')
    return
  }

  const data = player.persistentData
  const waveNumber = data.getInt('td_waveNumber') + 1
  data.putInt('td_waveNumber', waveNumber)

  const composition = WAVES[Math.min(waveNumber, WAVES.length) - 1]
  let totalMobs = 0

  composition.forEach(([mobType, count]) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = 15 + Math.random() * 10
      const x = Math.floor(player.x + Math.cos(angle) * r)
      const z = Math.floor(player.z + Math.sin(angle) * r)
      server.runCommandSilent(`summon minecraft:${mobType} ${x} ${Math.floor(player.y)} ${z}`)
      totalMobs++
    }
  })

  const displayWave = Math.min(waveNumber, WAVES.length)
  player.tell(`§6[Wave Horn] §fWave ${displayWave} incoming! (${totalMobs} mobs)`)
}

// Covers right-clicking with nothing targeted (rare on Superflat, but
// possible e.g. looking up).
ItemEvents.rightClicked('kubejs:wave_horn', (event) => {
  if (event.level.isClientSide) return
  useWaveHorn(event.player)
})

// Covers right-clicking while targeting a block — the common case on
// Superflat. No per-item filter exists for this event (it filters by
// block, not held item), so it's unfiltered and checks the held item
// itself.
BlockEvents.rightClicked((event) => {
  if (event.level.isClientSide) return
  if (event.item.getId() !== 'kubejs:wave_horn') return
  useWaveHorn(event.player)
})
