// Custom, deterministic 5-wave campaign. Replaces relying on Pure
// Suffering's own (semi-random, hard to debug in-game) invasion-type
// system for this specific curated progression. Pure Suffering stays
// installed but dormant (enableInvasions false) — its broader invasion
// variety is still there to re-enable later.
//
// Each wave adds a mob type on top of the previous wave's roster, per
// design: 1) zombie+skeleton, 2) +spider+flesh_human, 3) +witch+
// flesh_villager, 4) +wither_skeleton+flesh_hunter_i, 5) +ravager (mini
// boss)+flesh_suffer. Calling the horn again past wave 5 repeats wave
// 5's composition — no waves designed beyond that yet.
//
// Was vanilla-only from 2026-08-19 (TFTH removed for the first wave
// debugging pass) until TFTH mobs were folded back in starting wave 2 —
// see the WAVES comment below for which TFTH mobs and why.
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

// Mob type strings are now full namespaced IDs (was bare names like
// 'zombie' with `minecraft:` hardcoded onto every summon - changed
// 2026-08-19 so TFTH mobs, which need their own namespace, can sit in
// the same table). TFTH added starting wave 2: flesh_human (Germ stage,
// ~zombie-tier) at 2, flesh_villager (Germ stage) at 3, plaquecreaturetwo
// = "Flesh Hunter I" (Awareness stage, tougher - MaxHealth 50/Armor 6
// per TFTH.toml) at 4 alongside wither_skeleton, and flesh_suffer
// (Awareness stage, AttackDamage 25 per TFTH.toml - hits hard) at 5
// alongside the ravager mini-boss. TFTH's own autonomous Incubator/
// spread systems are disabled via config (see pack/config/TFTH.toml) -
// these are summoned directly, same as every vanilla mob here, not
// spawned by the mod's own logic.
var WAVES = [
  [['minecraft:zombie', 4], ['minecraft:skeleton', 4]],
  [['minecraft:zombie', 4], ['minecraft:skeleton', 4], ['minecraft:spider', 4], ['the_flesh_that_hates:flesh_human', 2]],
  [['minecraft:zombie', 3], ['minecraft:skeleton', 3], ['minecraft:spider', 3], ['minecraft:witch', 3], ['the_flesh_that_hates:flesh_villager', 2]],
  [['minecraft:zombie', 3], ['minecraft:skeleton', 3], ['minecraft:spider', 2], ['minecraft:witch', 2], ['minecraft:wither_skeleton', 3], ['the_flesh_that_hates:plaquecreaturetwo', 1]],
  [['minecraft:zombie', 2], ['minecraft:skeleton', 2], ['minecraft:spider', 2], ['minecraft:witch', 2], ['minecraft:wither_skeleton', 2], ['minecraft:ravager', 1], ['the_flesh_that_hates:flesh_suffer', 1]],
]

var WAVE_MOB_TYPES = [
  'minecraft:zombie',
  'minecraft:skeleton',
  'minecraft:spider',
  'minecraft:witch',
  'minecraft:wither_skeleton',
  'minecraft:ravager',
  'the_flesh_that_hates:flesh_human',
  'the_flesh_that_hates:flesh_villager',
  'the_flesh_that_hates:plaquecreaturetwo',
  'the_flesh_that_hates:flesh_suffer',
]

// Staggered emergence + sound-first spawn cues (docs/IDEAS.md's
// "Atmosphere & Wave Feel", Spawn Behavior). Design doc claimed this
// already existed via "delayed/scheduled spawns" - checked, it didn't;
// every mob summoned synchronously in one loop. Built as a plain queue
// processed by the tick handler below rather than a one-off scheduled
// callback API, since PlayerEvents.tick is the pattern already proven
// reliable throughout this pack (wave_status.js, mob_aggro.js) - no new
// unverified scheduling API introduced.
var pendingSpawns = [] // {mobType, x, y, z, spawnTick, soundTick, soundPlayed}

// Escalation lever: gap between each mob's emergence shrinks at higher
// wave tiers, so early waves stay readable and late waves collapse into
// an overwhelming dump - matches the design doc's "false security"
// curve intent. Floor at 4 ticks (0.2s) rather than 0, so even wave 5
// still reads as distinct emergences, not one instant clump.
var BASE_STAGGER_GAP_TICKS = 16
var MIN_STAGGER_GAP_TICKS = 4
var SOUND_LEAD_TICKS = 12

function staggerGapForWave(waveNumber) {
  return Math.max(MIN_STAGGER_GAP_TICKS, BASE_STAGGER_GAP_TICKS - (waveNumber - 1) * 3)
}

function nearbyWaveMobCount(player, level, radius) {
  return level.getEntities().filter(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return false
    // Same fix as wave_status.js - a killed mob lingers ~1 second
    // (death animation) before actual removal, so exclude anything
    // already at 0 health rather than waiting for it to disappear.
    if (e.getHealth() <= 0) return false
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

  // Also blocks re-use while staggered spawns are still queued but not
  // yet actually summoned - without this, spam-clicking the horn during
  // the emergence window could queue a second wave's mobs on top of the
  // first's before any of them exist yet for nearbyWaveMobCount to see.
  if (nearbyWaveMobCount(player, level, 80) > 0 || pendingSpawns.length > 0) {
    player.tell('§c[Wave Horn] §fClear the current wave before summoning the next one.')
    return
  }

  // Blocks re-use while the wave-clear reward choice (wave_status.js) is
  // still unanswered - docs/IDEAS.md pins the ordering as wave-clear
  // effects -> choice popup (blocking) -> countdown, so a manual horn
  // click can't skip the choice by racing ahead of it.
  if (data.getBoolean('td_awaitingChoice')) {
    player.tell('§c[Wave Horn] §fChoose your reward before summoning the next wave.')
    return
  }

  // A manual horn use always takes priority over an in-progress countdown
  // (docs/IDEAS.md: "the manual Wave Horn presumably still works during
  // the countdown... the timer is a forcing function for players who
  // don't act, not a removal of the existing manual trigger") - cancels
  // it here so the countdown tick handler below doesn't also fire
  // useWaveHorn a second time once it independently reaches zero.
  data.putBoolean('td_countdownActive', false)

  var waveNumber = data.getInt('td_waveNumber') + 1
  data.putInt('td_waveNumber', waveNumber)

  // Boss wave tied to a Blood Moon event (docs/IDEAS.md, built custom -
  // no Forge 1.20.1 Blood Moon mod was vetted, and the design doc itself
  // frames this as atmosphere/presentation, "rather than just a stat-
  // scaling bump," so no mob-count/stat changes here). Every wave from
  // the designed campaign's end onward is a Blood Moon - the same
  // WAVES.length threshold wave_status.js's FINAL_WAVE already caps
  // display at and removes starter gear on, so the moment training-
  // wheels gear disappears is also the first Blood Moon.
  var isBloodMoon = waveNumber >= WAVES.length

  // Force night before spawning so undead mobs (zombie, skeleton,
  // wither_skeleton) don't immediately catch fire from spawning into
  // daylight. doDaylightCycle is also disabled so time can't drift back
  // to day mid-fight - wave_status.js's "defeated" branch re-enables it
  // and sets time back to day once the wave is cleared.
  server.runCommandSilent('time set night')
  server.runCommandSilent('gamerule doDaylightCycle false')

  // Day/Night Density Contrast (docs/IDEAS.md's "Atmosphere & Wave
  // Feel") - dense, close, desaturated fog for the wave's duration via
  // YetGamer's Custom Fog's /fog command. wave_status.js's "defeated"
  // branch resets this back to vanilla fog, same pairing as the night
  // lock above. Cylinder (not sphere) to roughly match the worldborder's
  // own shape - this fog is always player-relative, not tied to the
  // border's actual position (no Forge 1.20.1 mod found that renders
  // fog at a fixed world coordinate), so it reads as "the horde's out
  // there in the dark" tension rather than a literal border wall.
  // Blood Moon waves get a single denser lever (lower MaxDistance) on
  // top of the normal wave fog - deliberately one number, not a stack of
  // new levers, per the lesson from this session's shader-tuning saga.
  var fogMaxDistance = isBloodMoon ? 24 : 32
  server.runCommandSilent('fog @a set 8 ' + fogMaxDistance + ' 25 25 30 0.3 cylinder')

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

  // Staggered instead of all-at-once - each mob gets a queued spawn
  // tick (staggerGap apart, tightening at higher waveNumber) and a sound
  // cue tick shortly before it, processed by the tick handler below.
  var staggerGap = staggerGapForWave(waveNumber)
  var mobIndex = 0

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
      var spawnTick = currentTick + mobIndex * staggerGap
      pendingSpawns.push({
        mobType: mobType,
        x: x,
        // Ground-ish estimate, reused for the sound cue's position
        // below (kept at the player's own height rather than the
        // elevated summon height, so the audio still reads as coming
        // from roughly ground level, not from up in the air).
        y: Math.floor(player.getY()),
        z: z,
        spawnTick: spawnTick,
        soundTick: spawnTick - SOUND_LEAD_TICKS,
        soundPlayed: false,
      })
      mobIndex++
      totalMobs++
    }
  })

  var displayWave = Math.min(waveNumber, WAVES.length)
  player.tell(`§6[Wave Horn] §fWave ${displayWave} incoming! (${totalMobs} mobs)`)
  // Big on-screen title (like an achievement popup), not just chat —
  // chat is easy to miss mid-fight. Uses vanilla /title via
  // runCommandSilent, consistent with every other command in this pack
  // rather than an unverified KubeJS-specific title API.
  if (isBloodMoon) {
    server.runCommandSilent(`title @a title {"text":"BLOOD MOON RISES","color":"dark_red","bold":true}`)
    server.runCommandSilent(`title @a subtitle {"text":"${totalMobs} mobs incoming!","color":"red"}`)
  } else {
    server.runCommandSilent(`title @a title {"text":"WAVE ${displayWave}","color":"gold","bold":true}`)
    server.runCommandSilent(`title @a subtitle {"text":"${totalMobs} mobs incoming!","color":"white"}`)
  }
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

// Processes pendingSpawns - plays a positioned sound-first cue shortly
// before each queued mob's spawn tick, then actually summons it once
// that tick arrives. Early-returns when the queue is empty (the common
// case) so this costs nothing outside an active wave's emergence
// window. Uses /playsound with explicit coordinates (not
// player.playSound(), which is player-relative and follows them) so the
// cue is actually positioned where the mob is about to appear -
// minecraft:ambient.cave is a generic eerie one-shot, not tied to any
// specific mob type, since TFTH's own sound event registry names
// weren't verified.
//
// SPAWN_HEIGHT_BUFFER (2026-08-20, real-terrain switch): summoning
// exactly at spawn.y (the player's own height) only worked on flat
// Superflat ground, where every column shared the same height. Real
// Desert terrain varies within the 15-25 block spawn radius (dunes,
// small dips), so a mob could summon embedded in terrain or floating
// above it. Fixed by summoning well above spawn.y and letting vanilla
// gravity drop the mob onto whatever the real ground height is at its
// specific X/Z - simpler and lower-risk than a per-mob heightmap query,
// at the cost of a brief, harmless fall (most hordes here are meant to
// be killed anyway). Not yet confirmed in-game for TFTH's GeckoLib-
// animated mobs specifically - flagged as a playtest check.
var SPAWN_HEIGHT_BUFFER = 15

PlayerEvents.tick(function (event) {
  if (pendingSpawns.length === 0) return

  var player = event.entity
  var level = player.getLevel()
  var server = player.getServer()
  var currentTick = level.getTime()
  var stillPending = []

  pendingSpawns.forEach(function (spawn) {
    if (!spawn.soundPlayed && currentTick >= spawn.soundTick) {
      server.runCommandSilent(
        `playsound minecraft:ambient.cave ambient @a ${spawn.x} ${spawn.y} ${spawn.z} 1 0.6`
      )
      spawn.soundPlayed = true
    }
    if (currentTick >= spawn.spawnTick) {
      server.runCommandSilent(
        `summon ${spawn.mobType} ${spawn.x} ${spawn.y + SPAWN_HEIGHT_BUFFER} ${spawn.z} {Attributes:[{Name:"generic.follow_range",Base:128}]}`
      )
    } else {
      stillPending.push(spawn)
    }
  })

  pendingSpawns = stillPending
})

// On-screen countdown to the next wave (docs/IDEAS.md's "On-screen
// countdown timer to the next wave"). wave_status.js starts this
// (td_countdownActive/td_countdownEndTick) once the wave-clear choice
// popup is resolved - the auto-trigger has to live here rather than
// there so it can call useWaveHorn() directly; server_scripts don't
// reliably share top-level scope/functions across files (same
// constraint noted throughout this codebase, e.g. HOSTILE_TYPES/WAVES
// being redeclared per-file rather than imported), so cross-file
// coordination goes through player.persistentData flags instead, same
// as td_inWave already does between wave_status.js/base_expansion.js/
// border_fog.js.
var COUNTDOWN_DISPLAY_THROTTLE = 20 // once/second is plenty for a countdown display

PlayerEvents.tick(function (event) {
  var player = event.entity
  var data = player.persistentData
  if (!data.getBoolean('td_countdownActive')) return

  var level = player.getLevel()
  var currentTick = level.getTime()
  var remaining = data.getInt('td_countdownEndTick') - currentTick

  if (remaining <= 0) {
    data.putBoolean('td_countdownActive', false)
    useWaveHorn(player)
    return
  }

  if (currentTick % COUNTDOWN_DISPLAY_THROTTLE !== 0) return
  var totalSeconds = Math.ceil(remaining / 20)
  var minutes = Math.floor(totalSeconds / 60)
  var seconds = totalSeconds % 60
  var secondsDisplay = seconds < 10 ? '0' + seconds : '' + seconds
  player.setStatusMessage(`§b⏱ Next wave in: ${minutes}:${secondsDisplay}`)
})
