// Custom, deterministic 5-wave campaign. Replaces relying on Pure
// Suffering's own (semi-random, hard to debug in-game) invasion-type
// system for this specific curated progression. Pure Suffering stays
// installed but dormant (enableInvasions false) — its broader invasion
// variety is still there to re-enable later.
//
// Each wave adds a mob type on top of the previous wave's roster, per
// design: 1) zombie+skeleton, 2) +spider+flesh_human, 3) +flesh_villager,
// 4) +wither_skeleton+flesh_hunter_i, 5) +ravager (mini
// boss)+flesh_suffer. Calling the horn again past wave 8 repeats wave
// 8's composition — no waves designed beyond that yet. Witches were
// removed from the roster entirely 2026-08-29 (see docs/IDEAS.md's
// "Mob roster exclusions" note) - wave 3 originally also added witch
// alongside flesh_villager.
//
// Waves 6-8 added 2026-08-29 (direct request: "more waves, scaled
// accordingly, keep the loot philosophy, use mob types from other mods
// talked about for variety"). Rather than a new mod, drew from TFTH's
// own germsStageMobList/awarenessStageMobList entries that were never
// actually used in any wave - TFTH.toml's own per-mob Attributes lines
// (MaxHealth|AttackDamage|Armor, confirmed directly from the config,
// not guessed) picked which ones: bruteplaquecreatureone ("Flesh Brute
// I", 45/4/5 - a tank archetype distinct from anything already in the
// roster), flesh_hunter_two ("Flesh Hunter II", 45/6/4 - balanced
// bruiser), flesh_boomer ("Flesh Boomer", 20/0/0 - zero melee attack
// damage in its own attributes, presumably an explosion-based attack
// like a creeper; reinforced walls are explosion-proof either way, see
// docs/MODS.md's chokepoint-walls entry), plaquethreelegcreature
// ("Flesh Hysterizer", 55/7/4 - the tankiest of the four, closes out
// wave 8 alongside the returning ravager). flesh_howler was
// deliberately left out - its own class has a CallForHelpGoal, an
// unconfirmed "summons more mobs" risk that would break this pack's
// deterministic per-wave mob count, and better-understood alternatives
// already covered the variety goal without it.
//
// Scaled per the wave 5 rebalance precedent earlier this session (that
// wave went from 12 mobs down to 7 - "too many regular mobs stacked
// on hard hitters was the problem, not variety or toughness") - waves
// 6-8 hold the same trash floor (zombie/skeleton/spider/wither_skeleton
// @1 each - was 5 mobs including witch, now 4 since witch's removal) as
// wave 5 and add 1-2 new elites on top rather than scaling raw counts
// back up.
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
// Witches removed entirely from the roster (2026-08-29, direct
// request - "completely remove witches as a mob type," no reason
// recorded). Was in waves 3-8; those rows just drop the witch entry
// rather than backfilling with more of another mob - a clean removal,
// not a rebalance. See docs/IDEAS.md's "Mob roster exclusions" note.
var WAVES = [
  [['minecraft:zombie', 4], ['minecraft:skeleton', 4]],
  [['minecraft:zombie', 4], ['minecraft:skeleton', 4], ['minecraft:spider', 4], ['the_flesh_that_hates:flesh_human', 2]],
  [['minecraft:zombie', 3], ['minecraft:skeleton', 3], ['minecraft:spider', 3], ['the_flesh_that_hates:flesh_villager', 2]],
  [['minecraft:zombie', 3], ['minecraft:skeleton', 3], ['minecraft:spider', 2], ['minecraft:wither_skeleton', 3], ['the_flesh_that_hates:plaquecreaturetwo', 1]],
  // Scaled down 2026-08-29 (was 2/2/2/2/2/1/1 = 12 mobs, felt too OP) -
  // halved every regular-mob count to 1, kept the ravager (mini boss)
  // and flesh_suffer (25 attack damage, TFTH's hardest hitter) at their
  // existing floor of 1 each - they're the designed finale, the
  // dogpile of regular mobs alongside them was the actual problem.
  [['minecraft:zombie', 1], ['minecraft:skeleton', 1], ['minecraft:spider', 1], ['minecraft:wither_skeleton', 1], ['minecraft:ravager', 1], ['the_flesh_that_hates:flesh_suffer', 1]],
  [['minecraft:zombie', 1], ['minecraft:skeleton', 1], ['minecraft:spider', 1], ['minecraft:wither_skeleton', 1], ['the_flesh_that_hates:bruteplaquecreatureone', 1]],
  [['minecraft:zombie', 1], ['minecraft:skeleton', 1], ['minecraft:spider', 1], ['minecraft:wither_skeleton', 1], ['the_flesh_that_hates:flesh_hunter_two', 1], ['the_flesh_that_hates:flesh_boomer', 1]],
  [['minecraft:zombie', 1], ['minecraft:skeleton', 1], ['minecraft:spider', 1], ['minecraft:wither_skeleton', 1], ['minecraft:ravager', 1], ['the_flesh_that_hates:plaquethreelegcreature', 1]],
]

var WAVE_MOB_TYPES = [
  'minecraft:zombie',
  'minecraft:skeleton',
  'minecraft:spider',
  'minecraft:wither_skeleton',
  'minecraft:ravager',
  'the_flesh_that_hates:flesh_human',
  'the_flesh_that_hates:flesh_villager',
  'the_flesh_that_hates:plaquecreaturetwo',
  'the_flesh_that_hates:flesh_suffer',
  'the_flesh_that_hates:bruteplaquecreatureone',
  'the_flesh_that_hates:flesh_hunter_two',
  'the_flesh_that_hates:flesh_boomer',
  'the_flesh_that_hates:plaquethreelegcreature',
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

// requireTag defaults true (only count mobs actually spawned by this
// file's own summon code, via td_wave_mob - see the tag's own comment
// at the summon point below for why). Pass false during the endless
// phase (waveNumber > WAVES.length), where mobs come from Undead
// Nights' own opaque spawn_horde command and can never carry the tag -
// falls back to the old type-only matching for that phase specifically.
function nearbyWaveMobCount(player, level, radius, requireTag) {
  return level.getEntities().filter(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return false
    if (requireTag !== false && !e.hasTag('td_wave_mob')) return false
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
  // requireTag false once already past the designed campaign (endless
  // phase) - see nearbyWaveMobCount's own comment for why.
  var isEndlessPhase = data.getInt('td_waveNumber') > WAVES.length
  if (nearbyWaveMobCount(player, level, 80, !isEndlessPhase) > 0 || pendingSpawns.length > 0) {
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

  // Endless phase (waves 9+, direct request 2026-08-31): the designed
  // 8-wave campaign is done, hand off to Undead Nights' own difficulty-
  // level system instead of repeating WAVES[7] forever. Real
  // integration details, confirmed by decompiling the mod and real
  // sandboxed testing before this was written, not assumed:
  // - Its commands NPE from a console/RCON source (getEntity() on a
  //   non-entity source) - needs `execute as <player>`, unlike every
  //   other command in this file which uses the plain console source
  //   via server.runCommandSilent directly. `@a` rather than a
  //   specific name/UUID, same "this pack is single-player-focused"
  //   reasoning as wave_status.js's starter-gear removal.
  // - Endless level maps 1:1 to (waveNumber - FINAL_WAVE), clamped to
  //   40 (the number of authored levels in
  //   config/undeadnights_difficulty_config.json) - holds at level 40's
  //   values past that, same clamp pattern WAVES.length already uses
  //   for wave 8.
  // - spawn_horde is a genuine on-demand trigger (confirmed live in
  //   the sandbox test), no day-count dependency - difficulty set then
  //   spawn_horde, same call-and-response pattern as every other
  //   command pair in this file.
  // - Does NOT use pendingSpawns/the staggered-emergence system below -
  //   Undead Nights handles its own spawn positioning (a fixed
  //   distanceMin/distanceMax band around the player, shipped via
  //   defaultconfigs/undeadnights-server.toml since that's a SERVER-type
  //   Forge config that only loads at world start and can't be
  //   rewritten live - confirmed by direct sandboxed testing, see
  //   docs/FEATURES.md's "Wave Horn" section for the full story).
  if (waveNumber > WAVES.length) {
    var endlessLevel = Math.min(waveNumber - WAVES.length, 40)
    server.runCommandSilent(`execute as @a at @s run undeadnights difficulty set ${endlessLevel}`)
    server.runCommandSilent(`execute as @a at @s run undeadnights spawn_horde`)
    player.tell(`§6[Wave Horn] §fWave ${waveNumber} incoming! (endless horde, difficulty ${endlessLevel})`)
    server.runCommandSilent(`title @a title {"text":"WAVE ${waveNumber}","color":"gold","bold":true}`)
    server.runCommandSilent(`title @a subtitle {"text":"An endless horde approaches...","color":"white"}`)
    return
  }

  var composition = WAVES[Math.min(waveNumber, WAVES.length) - 1]
  var totalMobs = 0

  // Fixed distance from the PLAYER, not the worldborder edge (rewritten
  // 2026-09-01, real bug found in playtest: border-relative spawning
  // meant spawn distance grew with the border - base_expansion.js's
  // escalating growth curve alone reaches a 270-block half-width by
  // wave 8, and the amulet's own BORDER_EXPAND_DELTA
  // (amulet_pedestal.js, 10000000) balloons it far beyond that whenever
  // the amulet sits on the pedestal - mobs were spawning literally
  // millions of blocks away and never arriving, read in-game as "the
  // horn says a horde spawned but nothing shows up." Both this system
  // and the endless-phase system (wave_spawner.js's `undeadnights
  // spawn_horde` branch above, which already uses a fixed
  // distanceMin/distanceMax band around the player via
  // defaultconfigs/undeadnights-server.toml) now share the same
  // player-relative-fixed-distance shape instead of one being
  // border-relative and one player-relative.
  //
  // Distance band picked to land clearly outside the compound itself
  // (the base is ~11 blocks across) while staying inside typical
  // render distance for the staggered walk-in and sound-cue design to
  // still read as intended - smaller than Undead Nights' 240-256 band,
  // which was sized for endless-phase view distance, not this designed
  // 8-wave campaign.
  //
  // Border damage stays disabled regardless (playtest_starter_kit.js) -
  // harmless, and the border is still a real containment boundary
  // during normal exploration even though wave mobs no longer spawn
  // relative to it.
  var SPAWN_DISTANCE_MIN = 40
  var SPAWN_DISTANCE_MAX = 60

  function randomPlayerRelativePosition() {
    var angle = Math.random() * 2 * Math.PI
    var distance = SPAWN_DISTANCE_MIN + Math.random() * (SPAWN_DISTANCE_MAX - SPAWN_DISTANCE_MIN)
    return {
      x: Math.floor(player.getX() + Math.cos(angle) * distance),
      z: Math.floor(player.getZ() + Math.sin(angle) * distance),
    }
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
      var pos = randomPlayerRelativePosition()
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
      // td_wave_mob (2026-09-01, real bug found in playtest: the
      // "hostiles remaining" counter in wave_status.js, and this file's
      // own nearbyWaveMobCount below, both used to match by mob TYPE
      // only - any vanilla zombie/skeleton/spider from a nearby
      // structure's real spawner block (spawners bypass doMobSpawning,
      // confirmed vanilla behavior) within the counting radius got
      // miscounted as a wave mob. td_wave_mob is permanent (unlike
      // td_justSpawned below, which is removed within this same block) -
      // both counters now require it, not just a type match, for the
      // deterministic 1-8 wave phase. Endless-phase (waves 9+) mobs
      // don't go through this summon path at all - Undead Nights spawns
      // its own hordes via an opaque command - so they can't carry this
      // tag; nearbyWaveMobCount/wave_status.js fall back to type-only
      // matching specifically when waveNumber > WAVES.length.
      // Flesh Suffer-specific nerf (2026-09-01, real playtest feedback -
      // the real combat log shows it killed the player 4 separate times
      // at wave 5). TFTH.toml's own base value is 25 attack damage,
      // easily a one-shot against starter iron armor - cut to 12,
      // matching the ravager's own post-nerf value above for
      // consistency, via the same Attributes-NBT override technique.
      var isFleshSuffer = spawn.mobType === 'the_flesh_that_hates:flesh_suffer'
      var summonNbt = isRavager
        ? '{Attributes:[{Name:"generic.follow_range",Base:128},{Name:"generic.attack_damage",Base:8},{Name:"generic.max_health",Base:60}],Health:60,Tags:["td_justSpawned","td_wave_mob"]}'
        : isFleshSuffer
          ? '{Attributes:[{Name:"generic.follow_range",Base:128},{Name:"generic.attack_damage",Base:12}],Tags:["td_justSpawned","td_wave_mob"]}'
          : '{Attributes:[{Name:"generic.follow_range",Base:128}],Tags:["td_justSpawned","td_wave_mob"]}'
      // td_justSpawned added and removed within this same synchronous
      // block, so the very next spawn processed (even same tick, even
      // same mob type) can never see a stale tag from this one.
      // td_wave_mob is never removed - it identifies the mob as
      // wave-spawned for the rest of its life.
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
