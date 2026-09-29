// Wave progress: the "hostiles remaining" action bar, wave-clear detection and
// everything a clear triggers once (popup, pedestal heal, upgrade prompt,
// airdrop, daylight, fixed-wave story beats, countdown to the next wave), plus
// the straggler outline, a delayed-title queue and /tdforceclear.
//
// A wave counts only td_wave_mob mobs of roster types within RADIUS of the
// pedestal. State lives on the world-state marker (worldData() in
// world_state.js). This file sets td_inWave, whose true -> false edge
// base_expansion.js and quest_milestones.js treat as a clear, and starts the
// countdown (td_countdownEndTick/td_countdownActive) that wave_spawner.js
// displays and acts on.

// Counting radius around the pedestal, in blocks: wave mobs spawn 48-64 out,
// plus up to 4 from the spreadplayers snap, so 96 leaves slack for knockback
// and wandering. Must equal the 96 in useWaveHorn's check (wave_spawner.js).
const RADIUS = 96

// Set by playtest_starter_kit.js on the starter sword and armor only.
const STARTER_GEAR_TAG = 'td_starter_gear'

// Starter gear is taken on this wave's clear (FIXED_WAVE_EVENTS below).
const GEAR_REMOVAL_WAVE = 5

// Countdown to the next wave in ticks (20 per second), keyed by the wave just
// cleared: 90 s after wave 1, plus 15 s per wave. From COUNTDOWN_KINK_WAVE it
// restarts at 4 minutes and keeps adding 15 s per wave, with no cap.
const COUNTDOWN_BASE_TICKS = 1800
const COUNTDOWN_STEP_TICKS = 300
const COUNTDOWN_WAVE5_BASE_TICKS = 4800
const COUNTDOWN_KINK_WAVE = 5
// Starter traps are removed on this wave's clear. Kept separate from
// GEAR_REMOVAL_WAVE so either beat can move on its own.
const STARTER_TRAPS_REMOVAL_WAVE = 5

// Floor on the passive countdown; the curve above only exceeds it from wave
// 30. The Wave Horn can still start the next wave early.
const MIN_WAVE_GAP_TICKS = 12000 // 10 minutes

function countdownTicksForWave(waveNumber) {
  var raw = waveNumber < COUNTDOWN_KINK_WAVE
    ? COUNTDOWN_BASE_TICKS + COUNTDOWN_STEP_TICKS * (waveNumber - 1)
    : COUNTDOWN_WAVE5_BASE_TICKS + COUNTDOWN_STEP_TICKS * (waveNumber - COUNTDOWN_KINK_WAVE)
  return Math.max(MIN_WAVE_GAP_TICKS, raw)
}

// One-time story beats, run by the clear branch when wave `wave` is cleared;
// flagKey on the marker records that one has run. action gets the player whose
// poll caught the clear: player.tell reaches only them, commands use @a.
const FIXED_WAVE_EVENTS = [
  {
    wave: GEAR_REMOVAL_WAVE,
    flagKey: 'td_starterGearRemoved',
    action: (player) => {
      const server = player.getServer()

      // /clear also reaches armor and offhand slots, and in 1.20.1 its NBT
      // argument is a partial match, so the tag alone finds the starter gear.
      // At login, sweepLateStarterGear (playtest_starter_kit.js) clears the
      // same items from anyone who missed this /clear; keep the lists in step.
      server.runCommandSilent(`clear @a minecraft:netherite_sword{${STARTER_GEAR_TAG}:1b}`)
      server.runCommandSilent(`clear @a minecraft:iron_helmet{${STARTER_GEAR_TAG}:1b}`)
      server.runCommandSilent(`clear @a minecraft:iron_chestplate{${STARTER_GEAR_TAG}:1b}`)
      server.runCommandSilent(`clear @a minecraft:iron_leggings{${STARTER_GEAR_TAG}:1b}`)
      server.runCommandSilent(`clear @a minecraft:iron_boots{${STARTER_GEAR_TAG}:1b}`)

      server.runCommandSilent(`title @a title {"text":"IT'S UP TO YOU NOW","color":"red","bold":true}`)
      server.runCommandSilent(`title @a subtitle {"text":"The gear is gone. So is whoever wore it first.","color":"gray"}`)
      player.tell('§8§o[The blade and armor crumble to rust and dust in your hands.]')
      player.tell(`§7Whoever carried this before you held the line for ${GEAR_REMOVAL_WAVE} waves before this place took them too. Their debt here is paid.`)
      player.tell('§c§lIt\'s up to you now.')
    },
  },
  {
    wave: STARTER_TRAPS_REMOVAL_WAVE,
    flagKey: 'td_starterTrapsRemoved',
    action: (player) => {
      // Removes what placeStarterTraps() (playtest_starter_kit.js) built.
      const server = player.getServer()
      const data = worldData(player.getLevel())
      if (data && data.contains('td_starterTeslaCoilX')) {
        // The lever on the coil's west face. td_starterTrapsRemoved is already
        // set, so tesla_coil_auto_power.js won't setblock it back.
        server.runCommandSilent(`setblock ${data.getInt('td_starterTeslaCoilX') - 1} ${data.getInt('td_starterTeslaCoilY')} ${data.getInt('td_starterTeslaCoilZ')} minecraft:air`)
        server.runCommandSilent(`setblock ${data.getInt('td_starterTeslaCoilX')} ${data.getInt('td_starterTeslaCoilY')} ${data.getInt('td_starterTeslaCoilZ')} minecraft:air`)
        server.runCommandSilent(`setblock ${data.getInt('td_starterTeslaCoilDummyX')} ${data.getInt('td_starterTeslaCoilDummyY')} ${data.getInt('td_starterTeslaCoilDummyZ')} minecraft:air`)
        server.runCommandSilent(`setblock ${data.getInt('td_starterTeslaFluxPointX')} ${data.getInt('td_starterTeslaFluxPointY')} ${data.getInt('td_starterTeslaFluxPointZ')} minecraft:air`)
        // Saves before td_layoutVersion 2 get no flank positions
        // (starterFenceFlanksFromData() is null): those columns are solid wall.
        starterFencePositions(data.getInt('td_pedestalX'), data.getInt('td_pedestalY'), starterGateWallZ(data), starterFenceFlanksFromData(data)).forEach((pos) => {
          server.runCommandSilent(`setblock ${pos[0]} ${pos[1]} ${pos[2]} minecraft:air`)
        })
      }
      server.runCommandSilent('kill @e[type=securitycraft:sentry,tag=td_starter_trap_sentry]')
      // SecurityCraft's Sentry drops itself as an item however it is removed.
      // Sentries never move, so the drop lies where placeStarterTraps()
      // summoned it: (pedestal x - 5, pedestal y + 3, gate wall z).
      // var, not const: in this Rhino a const inside a nested block of a
      // function that also holds a closure throws "redeclaration" at runtime.
      if (data && data.contains('td_pedestalX')) {
        var sentryX = data.getInt('td_pedestalX') - 5
        var sentryY = data.getInt('td_pedestalY') + 3
        var sentryZ = starterGateWallZ(data)
        server.runCommandSilent(`kill @e[type=minecraft:item,x=${sentryX},y=${sentryY},z=${sentryZ},distance=..1.5]`)
      }
      player.tell('§8§o[The scavenged defenses spark, seize up, and fall dark for good.]')
    },
  },
]

// Delayed titles: two /title calls in one tick overwrite each other, so a
// second title waits in this queue until the first has played. 100 ticks is
// vanilla's default title length (10 fade-in + 70 stay + 20 fade-out).
var pendingDelayedTitles = [] // {fireTick, title, subtitle, color}
var DELAYED_TITLE_TICKS = 100

// Shows a title/subtitle pair to everyone DELAYED_TITLE_TICKS from now (used
// by pedestal_destruction.js). color is the title's, gold by default.
function queueDelayedTitle(player, title, subtitle, color) {
  pendingDelayedTitles.push({
    fireTick: player.getLevel().getTime() + DELAYED_TITLE_TICKS,
    title: title,
    subtitle: subtitle,
    color: color || 'gold',
  })
}

PlayerEvents.tick((event) => {
  if (pendingDelayedTitles.length === 0) return
  const player = event.player
  const currentTick = player.getLevel().getTime()
  const stillPending = []
  pendingDelayedTitles.forEach((entry) => {
    if (currentTick < entry.fireTick) {
      stillPending.push(entry)
      return
    }
    const server = player.getServer()
    server.runCommandSilent(`title @a title {"text":"${entry.title}","color":"${entry.color}","bold":true}`)
    server.runCommandSilent(`title @a subtitle {"text":"${entry.subtitle}","color":"gray"}`)
  })
  pendingDelayedTitles = stillPending
})

// Straggler outline: when a wave is down to its last TD_STRAGGLER_MAX mobs in
// range and nothing is left to spawn (tdWaveSpawnsOutstanding in
// wave_spawner.js), those mobs glow red through walls. The counter's entity
// pass drives it, and the outline comes off any mob that stops qualifying.
//
// The glow is vanilla Glowing, colored by the scoreboard team. Teams only ally
// their own members and the default collision rule is unchanged, so the side
// effects are the stragglers being allied with each other and their names
// showing red (death messages, Jade). Vanilla takes a dead non-player off its
// team (Scoreboard.entityRemoved); `team empty` on clear catches unloaded
// ones. Entity Culling never culls an entity drawn as glowing.
var TD_STRAGGLER_MAX = 2
var TD_STRAGGLER_TEAM = 'td_stragglers'
var TD_STRAGGLER_TAG = 'td_straggler'
// Resets each boot. The team itself is saved with the world, so the next
// "team add" just fails silently.
var tdStragglerTeamReady = false

function tdStragglerMark(server, e) {
  if (!tdStragglerTeamReady) {
    server.runCommandSilent(`team add ${TD_STRAGGLER_TEAM}`)
    server.runCommandSilent(`team modify ${TD_STRAGGLER_TEAM} color red`)
    tdStragglerTeamReady = true
  }
  var id = `${e.uuid}`
  e.getTags().add(TD_STRAGGLER_TAG)
  // A non-player's scoreboard name is its UUID string, so the raw UUID works
  // for team join/leave (score-holder names) and for effect (an entity).
  server.runCommandSilent(`team join ${TD_STRAGGLER_TEAM} ${id}`)
  server.runCommandSilent(`effect give ${id} minecraft:glowing infinite 0 true`)
}

function tdStragglerUnmark(server, e) {
  var id = `${e.uuid}`
  e.getTags().remove(TD_STRAGGLER_TAG)
  server.runCommandSilent(`team leave ${id}`)
  server.runCommandSilent(`effect clear ${id} minecraft:glowing`)
}

// wanted: the mobs that should glow now. marked: every live mob wearing the
// straggler tag. Only the difference is acted on, so a steady state (or a
// second player's poll in the same tick) sends no commands.
function tdStragglerSync(server, wanted, marked) {
  if (wanted.length === 0 && marked.length === 0) return
  var wantedIds = {}
  var markedIds = {}
  wanted.forEach(function (e) { wantedIds[`${e.uuid}`] = true })
  marked.forEach(function (e) {
    var id = `${e.uuid}`
    markedIds[id] = true
    if (!wantedIds[id]) tdStragglerUnmark(server, e)
  })
  wanted.forEach(function (e) {
    if (!markedIds[`${e.uuid}`]) tdStragglerMark(server, e)
  })
}

// Hostiles counter and wave-clear detection, polled in each online player's
// tick. td_inWave is shared, so the clear branch runs once per wave: the
// first poll that sees no hostiles flips it.
PlayerEvents.tick((event) => {
  const player = event.player
  const level = player.getLevel()

  // Every 4 ticks (5 times a second); each pass walks the whole entity list.
  if (level.getTime() % 4 !== 0) return

  const data = worldData(level)
  if (!data) return
  const waveNumber = data.getInt('td_waveNumber')
  // Measured from the pedestal (waveObjective, wave_spawner.js).
  const objective = waveObjective(player, data)

  // One pass feeds the counter (counted: live td_wave_mob within RADIUS) and
  // the straggler sync (stragglerMarked: live tagged stragglers, anywhere).
  var counted = []
  var stragglerMarked = []
  level.getEntities().forEach((e) => {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return
    var tags = e.getTags()
    if (tags.contains(TD_STRAGGLER_TAG) && e.getHealth() > 0) stragglerMarked.push(e)
    // Only td_wave_mob counts; structure mobs of roster types never do. Undead
    // Nights horde mobs get the tag from tdTagHordeMobs (wave_spawner.js).
    if (!tags.contains('td_wave_mob')) return
    // A killed mob stays in the entity list for its 1-second death animation;
    // skip it so the count drops on the kill.
    if (e.getHealth() <= 0) return
    var dx = e.getX() - objective.x // bare e.x is NaN in this build
    var dy = e.getY() - objective.y
    var dz = e.getZ() - objective.z
    if (dx * dx + dy * dy + dz * dz <= RADIUS * RADIUS) counted.push(e)
  })
  const hostileCount = counted.length

  // After a game over (pedestal_destruction.js, hardcore_death.js) the poll
  // only takes straggler outlines off: leftover mobs would otherwise set
  // td_inWave again and the last kill would run the clear branch. Both
  // game-over paths already end the night lock and cancel the countdown.
  var runIsOver = data.getBoolean('td_pedestalDestroyed') || data.getBoolean('td_hardcoreGameOver')
  var stragglersWanted = !runIsOver && hostileCount > 0 && hostileCount <= TD_STRAGGLER_MAX && !tdWaveSpawnsOutstanding(level)
  tdStragglerSync(player.getServer(), stragglersWanted ? counted : [], stragglerMarked)
  if (runIsOver) return

  const wasInWave = data.getBoolean('td_inWave')

  if (hostileCount > 0) {
    // The action bar is one line, shared with pedestal_health.js's alert and
    // wave_airdrop.js's airdrop notice. Those win while active (pedestal
    // first); this 5-times-a-second refresh would otherwise wipe them.
    var pedestalAlert = pedestalAlertActionbarText(data, level.getTime())
    var airdropAlert = airdropInboundActionbarText(data, level.getTime())
    player.setStatusMessage(pedestalAlert || airdropAlert || `§c⚔ ${tdWaveLabel(waveNumber)} — Hostiles remaining: ${hostileCount}`)
    if (!wasInWave) {
      data.putBoolean('td_inWave', true)
    }
  } else if (wasInWave) {
    data.putBoolean('td_inWave', false)
    // Live stragglers were unmarked above; this also clears unloaded ones.
    player.getServer().runCommandSilent(`team empty ${TD_STRAGGLER_TEAM}`)
    // Subtitle only, for the smaller font. The empty title is still needed:
    // vanilla shows a subtitle only while a title is on screen.
    player.getServer().runCommandSilent(`title @a title {"text":""}`)
    player.getServer().runCommandSilent(`title @a subtitle {"text":"${tdWaveLabel(waveNumber).toUpperCase()} CLEARED","color":"green","bold":true}`)
    // Sidebar objective created in buildStarterBase (playtest_starter_kit.js).
    player.getServer().runCommandSilent(`scoreboard players set @a td_waves_cleared ${waveNumber}`)

    // Heal the pedestal by 5% of its max HP (pedestal_health.js).
    healPedestalByPercent(player, data, 0.05)

    // Upgrade prompt (pedestal_upgrades.js). Guarded: td_inWave is already
    // false, so a throw here would skip the rest of this branch for good.
    try {
      offerPedestalUpgrades(player.getServer(), data)
    } catch (err) {
      console.error('[wave_status] pedestal upgrade prompt failed: ' + err)
    }

    // Airdrop on every 5th wave (wave_airdrop.js); a no-op otherwise.
    maybeTriggerWaveAirdrop(player, data, waveNumber)

    // End the night lock useWaveHorn (wave_spawner.js) set at wave start.
    player.getServer().runCommandSilent('time set day')
    player.getServer().runCommandSilent('gamerule doDaylightCycle true')

    // The flag is set before the action runs, so a beat fires at most once.
    FIXED_WAVE_EVENTS.forEach((fixedEvent) => {
      if (waveNumber !== fixedEvent.wave || data.getBoolean(fixedEvent.flagKey)) return
      data.putBoolean(fixedEvent.flagKey, true)
      fixedEvent.action(player)
    })

    // Start the countdown to the next wave; wave_spawner.js shows it on the
    // action bar and starts the next wave when it runs out.
    data.putInt('td_countdownEndTick', level.getTime() + countdownTicksForWave(waveNumber))
    data.putBoolean('td_countdownActive', true)
  }
})

// /tdforceclear (op level 2) unsticks a wave whose last mob is out of reach.
// It kills every roster-type mob within RADIUS of the pedestal, td_wave_mob
// or not, so the next poll sees none and runs the normal clear branch. Spawns
// still queued in wave_spawner.js are not cancelled.
ServerEvents.commandRegistry((event) => {
  var Commands = event.commands
  event.register(
    Commands.literal('tdforceclear')
      .requires((source) => source.hasPermission(2))
      .executes((context) => {
        var player = context.source.getPlayerOrException()
        var level = context.source.getLevel()
        var data = worldData(level)
        if (!data) {
          player.tell('§c[Wave] §fNothing to force-clear - the base hasn\'t finished building yet.')
          return 0
        }
        var objective = waveObjective(player, data)
        var killed = 0
        level.getEntities().forEach((e) => {
          if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return
          var dx = e.getX() - objective.x
          var dy = e.getY() - objective.y
          var dz = e.getZ() - objective.z
          if (dx * dx + dy * dy + dz * dz > RADIUS * RADIUS) return
          e.kill()
          killed++
        })
        player.tell(`§6[Wave] §aForce-cleared - killed ${killed} hostile(s).`)
        return killed
      })
  )
})
