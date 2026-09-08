// Wave-8+ speed-clear bonus airdrop (2026-09-05, direct request). Clear a
// wave within a time limit from when its mobs finish emerging and a crate
// descends with a curated bonus haul.
//
// Mod pick: Paojiao134's Airdrop, not the other real Forge 1.20.1 candidate
// (Simply Airdrops). Decompiled both real jars before choosing - Simply
// Airdrops has NO command classes in it at all, only an item-based "radio
// controller" trigger, which isn't something a script can invoke cleanly.
// Paojiao134's Airdrop has a real Brigadier command (`AirdropCommand.
// summon`, confirmed via decompile) that spawns a crate at the executing
// command source's position - combined with `execute positioned <x> <y>
// <z> run airdrop summon`, that's a fully scriptable trigger at any
// coordinate. The mod hardcodes the crate's spawn height to Y=300
// internally regardless of the executor's own Y (confirmed in
// AirdropCommand.spawnAirdrop), so only X/Z need to be right here.
//
// Loot pool is real hand-authored JSON at config/airdrop/wave8_bonus.json
// (format confirmed by decompiling AirdropExportImport's serialize/
// deserialize methods - a flat list of {slot, nbt} entries, same idea as
// this pack's own loot tables), imported once at server start below. The
// crate always uses `getRandomPool()` internally (picks any pool that
// exists, not a name you specify at summon time) - since this is the only
// pool ever registered in this pack, that's equivalent to picking it by
// name for now. If a second real pool gets added later for an unrelated
// reason, this stops being true and `airdrop summon` will need revisiting.
//
// Real, decompile-and-live-tested finding on WHERE it lands: the mod has
// its own BorderIntegrationHandler that, whenever a real (non-default)
// world border exists, picks a random x/z anywhere inside the CURRENT
// border and ignores the command executor's own position entirely - a
// plain `execute positioned <x> <y> <z> run airdrop summon` does nothing
// once that kicks in. Confirmed live: it silently failed to spawn
// anywhere near a positioned coordinate while the sandbox's border was at
// vanilla default, then worked correctly and landed inside a real small
// border the moment one was set - which happens immediately in this pack
// anyway (playtest_starter_kit.js sets a 50-block border on first join,
// grown ever after by base_expansion.js). Net effect: the crate lands
// somewhere inside the player's own currently-expanded playable area, not
// pinned to the pedestal and not scattered across the whole map either -
// a reasonable fit for how this pack already uses its border, so this
// doesn't fight the mod's own behavior with a position argument that
// won't do anything once real play starts.
//
// Timer start point: when the wave's mobs finish spawning
// (td_waveSpawnCompleteTick, written by wave_spawner.js's own drain loop),
// not wave start - doesn't penalize the player for the staggered spawn-in
// time on big wave-8+ mob counts. Threshold is an estimate (180s, matching
// the existing COUNTDOWN_MAX_TICKS pacing scale from wave_status.js) with
// no real wave-8+ clear-time data behind it yet - flagged as adjustable
// once actual play confirms whether it's landing too easy or too strict.

var WAVE_AIRDROP_MIN_WAVE = 8
var WAVE_AIRDROP_TIME_LIMIT_TICKS = 3600 // 180s
var WAVE_AIRDROP_POOL_NAME = 'wave8_bonus'

ServerEvents.loaded((event) => {
  // Idempotent - re-importing the same pool file just overwrites it with
  // identical content, safe to run on every server start.
  event.server.runCommandSilent(`airdrop import ${WAVE_AIRDROP_POOL_NAME}`)
})

// Called from wave_status.js's own wave-clear branch, right alongside the
// pedestal heal - matches that file's own established cross-file call
// pattern into pedestal_health.js's healPedestalByPercent (shared top-
// level FUNCTIONS are the proven-reliable cross-file idiom in this
// codebase; shared top-level var/const are not, see bounty_kills.js's own
// real HOSTILE_TYPES collision writeup for why that distinction matters).
function maybeTriggerWaveAirdrop(player, data, waveNumber) {
  if (waveNumber < WAVE_AIRDROP_MIN_WAVE) return
  if (!data.contains('td_waveSpawnCompleteTick')) return

  var level = player.getLevel()
  var elapsed = level.getTime() - data.getInt('td_waveSpawnCompleteTick')
  if (elapsed > WAVE_AIRDROP_TIME_LIMIT_TICKS) return

  var server = player.getServer()
  // No position argument - see the header comment above for why passing
  // one wouldn't do anything once a real border exists anyway.
  server.runCommandSilent('airdrop summon')
  player.getServer().runCommandSilent(
    `title @a title {"text":"SUPPLIES INBOUND","color":"gold","bold":true}`
  )
  player.tell(`§6[Airdrop] §aWave ${waveNumber} cleared fast enough - a crate is on its way down.`)
}

// On-screen countdown for the speed-clear window itself (2026-09-06 live
// feedback: "currently 100% silent server-side check"). Same
// setStatusMessage/throttle pattern as wave_spawner.js's own next-wave
// countdown - reused deliberately, not a new display mechanism. Purely
// timestamp-driven like the trigger check above (no separate active/
// inactive flag needed): once `elapsed` exceeds the time limit, the
// window has closed and this naturally stops rendering on its own -
// whether that's because the bonus was already claimed (wave cleared,
// `td_waveSpawnCompleteTick` will be overwritten fresh next wave) or
// simply missed. Both display loops can coexist on the same actionbar
// slot since they're never live at the same time in practice - this one
// only has anything to show while a wave 8+ is still being fought, the
// other only once a wave has already been cleared.
var AIRDROP_COUNTDOWN_DISPLAY_THROTTLE = 20 // once/second, matches wave_spawner.js's pacing

PlayerEvents.tick(function (event) {
  var player = event.entity
  var data = player.persistentData
  if (data.getInt('td_waveNumber') < WAVE_AIRDROP_MIN_WAVE) return
  if (!data.contains('td_waveSpawnCompleteTick')) return

  var level = player.getLevel()
  var currentTick = level.getTime()
  var elapsed = currentTick - data.getInt('td_waveSpawnCompleteTick')
  var remaining = WAVE_AIRDROP_TIME_LIMIT_TICKS - elapsed
  if (remaining <= 0) return

  if (currentTick % AIRDROP_COUNTDOWN_DISPLAY_THROTTLE !== 0) return
  var totalSeconds = Math.ceil(remaining / 20)
  var minutes = Math.floor(totalSeconds / 60)
  var seconds = totalSeconds % 60
  var secondsDisplay = seconds < 10 ? '0' + seconds : '' + seconds
  player.setStatusMessage(`§6⏱ Airdrop window: ${minutes}:${secondsDisplay}`)
})
