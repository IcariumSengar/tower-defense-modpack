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
  // Scaled down 2026-08-29 (was 2/2/2/2/2/1/1 = 12 mobs, felt too OP) -
  // halved every regular-mob count to 1, kept the ravager (mini boss)
  // and flesh_suffer (25 attack damage, TFTH's hardest hitter) at their
  // existing floor of 1 each - they're the designed finale, the
  // dogpile of regular mobs alongside them was the actual problem.
  [['minecraft:zombie', 1], ['minecraft:skeleton', 1], ['minecraft:spider', 1], ['minecraft:witch', 1], ['minecraft:wither_skeleton', 1], ['minecraft:ravager', 1], ['the_flesh_that_hates:flesh_suffer', 1]],
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

  // A manual horn use always takes priority over an in-progress countdown
  // (docs/IDEAS.md: "the manual Wave Horn presumably still works during
  // the countdown... the timer is a forcing function for players who
  // don't act, not a removal of the existing manual trigger") - cancels
  // it here so the countdown tick handler below doesn't also fire
  // useWaveHorn a second time once it independently reaches zero.
  data.putBoolean('td_countdownActive', false)

  var waveNumber = data.getInt('td_waveNumber') + 1
  data.putInt('td_waveNumber', waveNumber)

  // Force night before spawning so undead mobs (zombie, skeleton,
  // wither_skeleton) don't immediately catch fire from spawning into
  // daylight. doDaylightCycle is also disabled so time can't drift back
  // to day mid-fight - wave_status.js's "defeated" branch re-enables it
  // and sets time back to day once the wave is cleared.
  server.runCommandSilent('time set night')
  server.runCommandSilent('gamerule doDaylightCycle false')

  var composition = WAVES[Math.min(waveNumber, WAVES.length) - 1]
  var totalMobs = 0

  // Spawn genuinely BEYOND the worldborder, not inside it (2026-08-20,
  // second attempt - the first attempt still spawned mobs just inside
  // the edge, on the wrong assumption that vanilla's worldborder blocks
  // ALL entity movement across it the way it blocks players. It
  // doesn't - the border only clamps *player* movement; mobs path
  // across it under normal AI/movement with no special resistance. The
  // original 2026-08-19 bug this used to guard against ("mobs
  // spawning outside the border become permanently unreachable") predates
  // mob_aggro.js's unconditional, no-distance-limit setTarget entirely -
  // that's what actually makes the long walk-in reliable now, not
  // keeping mobs inside the wall.
  //
  // The one real vanilla side effect of spawning outside: border damage
  // (default ~0.2 hearts/sec per block past the border's 5-block safe
  // buffer) would otherwise chip mobs (and the player, if they ever near
  // the edge) for no gameplay reason this pack actually wants - the
  // border here is a containment/staging boundary, not a shrinking-zone
  // battle-royale mechanic. Disabled once per world in
  // playtest_starter_kit.js (`worldborder damage amount 0`), alongside
  // its other one-time worldborder setup.
  var border = level.getWorldBorder()
  var edgeMinX = border.getMinX()
  var edgeMaxX = border.getMaxX()
  var edgeMinZ = border.getMinZ()
  var edgeMaxZ = border.getMaxZ()
  var SPAWN_OUTSIDE_MIN = 6
  var SPAWN_OUTSIDE_MAX = 14

  function randomBorderEdgePosition() {
    var side = Math.floor(Math.random() * 4) // 0=minZ 1=maxZ 2=minX 3=maxX
    var offset = SPAWN_OUTSIDE_MIN + Math.random() * (SPAWN_OUTSIDE_MAX - SPAWN_OUTSIDE_MIN)
    if (side === 0) return { x: Math.floor(edgeMinX + Math.random() * (edgeMaxX - edgeMinX)), z: Math.floor(edgeMinZ - offset) }
    if (side === 1) return { x: Math.floor(edgeMinX + Math.random() * (edgeMaxX - edgeMinX)), z: Math.floor(edgeMaxZ + offset) }
    if (side === 2) return { x: Math.floor(edgeMinX - offset), z: Math.floor(edgeMinZ + Math.random() * (edgeMaxZ - edgeMinZ)) }
    return { x: Math.floor(edgeMaxX + offset), z: Math.floor(edgeMinZ + Math.random() * (edgeMaxZ - edgeMinZ)) }
  }

  // Staggered instead of all-at-once - each mob gets a queued spawn
  // tick (staggerGap apart, tightening at higher waveNumber) and a sound
  // cue tick shortly before it, processed by the tick handler below.
  var staggerGap = staggerGapForWave(waveNumber)
  var mobIndex = 0

  composition.forEach(function (pair) {
    var mobType = pair[0]
    var count = pair[1]
    for (var i = 0; i < count; i++) {
      var pos = randomBorderEdgePosition()
      var spawnTick = currentTick + mobIndex * staggerGap
      pendingSpawns.push({
        mobType: mobType,
        x: pos.x,
        // Ground-ish estimate, reused for the sound cue's position and
        // as the summon command's starting Y - not required to be
        // exact, since the /spreadplayers correction in the spawn tick
        // handler below fixes the mob's actual final height.
        y: Math.floor(player.getY()),
        z: pos.z,
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
// Ground-height correction (2026-08-20, real-terrain switch): summoning
// exactly at spawn.y (a rough player-height estimate) only worked on
// flat Superflat ground, where every column shared the same height.
// Real Desert terrain varies across the border's perimeter (dunes,
// small dips), so a mob could summon embedded in terrain or floating
// above it.
//
// First fix was summoning well above spawn.y and letting vanilla
// gravity drop the mob onto the real surface — worked, but looked
// wrong ("enemies falling from the sky") for mobs that are supposed to
// read as menacingly approaching, not literally raining in. Replaced
// with a silent correction instead: summon at the rough estimate (its
// exact starting height doesn't matter, even if embedded/floating),
// tag it uniquely, then use `/spreadplayers` — the same vanilla
// heightmap-aware "place on solid ground here" command already used in
// playtest_starter_kit.js for the player's own fixed spawn — to
// teleport just that mob onto the real surface, instantly and
// invisibly, before immediately clearing the tag. A small maxRange (4)
// keeps the correction tight to the intended spawn point rather than
// drifting. Tag-then-immediately-clear is race-safe here because
// pendingSpawns.forEach processes one spawn at a time, synchronously,
// within a single tick — even same-type mobs due on the same tick can't
// collide on the tag (see the comment above summon in the loop below).
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
      // Ravager-specific nerf (2026-08-29 feedback: the halved regular-
      // mob dogpile wasn't the OP part of wave 5, the ravager itself
      // was) - vanilla's 12 attack damage / 100 health cut down via the
      // same Attributes-NBT override already used for follow_range
      // below, rather than touching every other mob's stats.
      var isRavager = spawn.mobType === 'minecraft:ravager'
      var summonNbt = isRavager
        ? '{Attributes:[{Name:"generic.follow_range",Base:128},{Name:"generic.attack_damage",Base:8},{Name:"generic.max_health",Base:60}],Health:60,Tags:["td_justSpawned"]}'
        : '{Attributes:[{Name:"generic.follow_range",Base:128}],Tags:["td_justSpawned"]}'
      // Tag added and removed within this same synchronous block, so
      // the very next spawn processed (even same tick, even same mob
      // type) can never see a stale tag from this one.
      server.runCommandSilent(
        `summon ${spawn.mobType} ${spawn.x} ${spawn.y} ${spawn.z} ${summonNbt}`
      )
      server.runCommandSilent(
        `spreadplayers ${spawn.x} ${spawn.z} 0 4 false @e[type=${spawn.mobType},tag=td_justSpawned,limit=1,sort=nearest]`
      )
      server.runCommandSilent(
        `tag @e[type=${spawn.mobType},tag=td_justSpawned,limit=1,sort=nearest] remove td_justSpawned`
      )
    } else {
      stillPending.push(spawn)
    }
  })

  pendingSpawns = stillPending
})

// On-screen countdown to the next wave (docs/IDEAS.md's "On-screen
// countdown timer to the next wave"). wave_status.js starts this
// (td_countdownActive/td_countdownEndTick) directly on wave-clear - the
// auto-trigger has to live here rather than there so it can call
// useWaveHorn() directly; server_scripts don't reliably share top-level
// scope/functions across files (same constraint noted throughout this
// codebase, e.g. HOSTILE_TYPES/WAVES being redeclared per-file rather
// than imported), so cross-file coordination goes through
// player.persistentData flags instead, same as td_inWave already does
// between wave_status.js/base_expansion.js.
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
