// Completes the quest book's event quests. Each is an FTB Quests custom task
// the player can't tick off by hand; this script completes it when its event
// happens: the horn, wave and horde clears, the boss, the amulet, a bag
// opened, the first airdrop, stragglers, heals, upgrades, worn traps,
// ambushers, spawners, the field tests (field_tests.js) and the Challenges.
// Several are reported from other scripts through qmCompleteShared().
//
// Completion runs /ftbquests change_progress for one player, and FTB Quests
// applies it to that player's quest team. A shared milestone is recorded once
// per world as td_q_<key> on the world-state marker (worldData() from
// world_state.js), and every player gets it from the poll below, including
// players who were offline when it happened or join later. td_qp_<key> in the
// player's persistentData records that the player has been given a milestone,
// shared or their own.
//
// QM_TASKS must match the custom task ids in
// config/ftbquests/quests/chapters/campaign.snbt.
var QM_TASKS = {
  horn: '5A1C0E7B93D4F216',
  wave1: '6B2D1F8CA4E50327',
  wave8: '1E5042BFD718365A',
  boss: '2F6153C0E829476B',
  wave15: '307264D1F93A587C',
  amuletWorn: '418375E20A4B698D',
  amuletOnPedestal: '529486F31B5C7A9E',
  openIt: '4B770968EBD48DB3',
  // Quest book v4 (tools/quest_book/build_v4.py prints these ids).
  countdown: '61D73004511CFD13', // "The Clock Runs", from wave_spawner.js
  stragglers: '6711A51E8E6BC502', // wave_status.js tdStragglerMark
  heal: '7DBE83849EA1F877', // pedestal_health.js heal handler
  ambush: '7C39539CA1093C35', // wave_spawner.js, first ambusher surfacing
  upgrade: '3AFF52491B56CEC1',
  pastLine: '16BF12591766C9AC', // per player
  spawner: '6A5EEDAE53EEE2FF', // per player
  wave5: '6163F37DEF0131C1',
  delivery: '02AE15A46D5200D9',
  trapWorn: '63CDD9727D7AD87E', // trap_durability.js
  horde20: '5DF4CDD61C21DBF6',
  horde30: '5A023C20B3CFAA46',
  horde40: '66C9A90A69B83A51',
  // field tests (field_tests.js)
  ft_spikes: '29EF15EF1B80F815',
  ft_fence: '76E811588BEC3472',
  ft_tesla: '147200F34EA68865',
  ft_gunturret: '6CB2B153C2DCE888',
  ft_omt: '1A31C278C68063AA',
  // Challenges chapter
  ch_untouched: '7392F838FA8CC7CA',
  ch_intercept: '22DE4C71A7372D6E',
  ch_maxed: '5E83BD689FF3BF2E',
  ch_hardcore20: '2F2CDCEA7354D7D6',
}

// Shared milestones, in campaign order.
var QM_SHARED_KEYS = ['horn', 'wave1', 'wave8', 'boss', 'wave15', 'amuletOnPedestal',
  'countdown', 'stragglers', 'heal', 'ambush', 'upgrade', 'wave5', 'delivery', 'trapWorn',
  'horde20', 'horde30', 'horde40', 'ft_spikes', 'ft_fence', 'ft_tesla', 'ft_gunturret', 'ft_omt',
  'ch_untouched', 'ch_intercept', 'ch_maxed', 'ch_hardcore20']

// "Past the Line": this many blocks beyond the closed border's edge.
var QM_PAST_LINE_BLOCKS = 16

// "Open It" is per player and completes on the first bag opened.
var QM_LOOT_BAG_IDS = [
  'bountybags:uncommon_loot_bag',
  'bountybags:rare_loot_bag',
  'bountybags:epic_loot_bag',
  'bountybags:legendary_loot_bag',
]

ItemEvents.rightClicked((event) => {
  if (!QM_LOOT_BAG_IDS.includes(`${event.item.id}`)) return
  // A sneaking click only previews the bag's loot table (BountyBags'
  // LootBagItem.use), so it opens nothing.
  if (event.entity.isShiftKeyDown()) return
  qmCompleteForPlayer(event.entity, 'openIt')
})
var QM_POLL_INTERVAL = 20 // ticks

// Records a shared milestone once per world and completes it for everyone
// online. boss_wave.js also calls this.
function qmCompleteShared(server, data, key) {
  var flag = 'td_q_' + key
  if (data.getBoolean(flag)) return
  data.putBoolean(flag, true)
  var players = server.getPlayers()
  for (var i = 0; i < players.length; i++) qmCompleteForPlayer(players[i], key)
}

// Once per player. change_progress's players-only argument rejects a raw UUID
// (vanilla treats it as a selector that may match non-players), so the command
// runs as the player and targets @s.
function qmCompleteForPlayer(player, key) {
  var flag = 'td_qp_' + key
  var pdata = player.persistentData
  if (pdata.getBoolean(flag)) return
  pdata.putBoolean(flag, true)
  player.getServer().runCommandSilent('execute as ' + player.uuid + ' run ftbquests change_progress @s complete ' + QM_TASKS[key])
}

// Raises td_q_lastClearedWave (also read by playtest_starter_kit.js). A wave is
// cleared when td_inWave goes from true to false; a pedestal loss or a
// hardcore game over also clears td_inWave, and neither counts. The wave
// number is sampled while td_inWave is set (td_q_runningWave): after a clear
// the horn can raise td_waveNumber for the next wave before this poll runs. A
// running wave above the last sample means the previous wave cleared between
// polls.
function qmTrackWaveClear(data) {
  var inWave = data.getBoolean('td_inWave')
  var wasInWave = data.getBoolean('td_q_prevInWave')
  data.putBoolean('td_q_prevInWave', inWave)
  var lastCleared = data.getInt('td_q_lastClearedWave')
  var cleared = lastCleared
  if (inWave) {
    var running = data.getInt('td_waveNumber')
    if (running > data.getInt('td_q_runningWave')) cleared = Math.max(cleared, running - 1)
    data.putInt('td_q_runningWave', running)
  } else if (wasInWave && !data.getBoolean('td_pedestalDestroyed') && !data.getBoolean('td_hardcoreGameOver')) {
    cleared = Math.max(cleared, data.getInt('td_q_runningWave'))
  }
  if (cleared > lastCleared) data.putInt('td_q_lastClearedWave', cleared)
}

// World-level, so a clear or a boss kill with nobody online still counts.
ServerEvents.tick(function (event) {
  var server = event.server
  var level = server.getLevel('minecraft:overworld')
  if (!level || level.getTime() % QM_POLL_INTERVAL !== 0) return
  var data = worldData(level)
  if (!data) return

  qmTrackPedestalDamage(server, data)
  qmTrackWaveClear(data)
  var cleared = data.getInt('td_q_lastClearedWave')
  if (data.getInt('td_lastHornUseTick') > 0) qmCompleteShared(server, data, 'horn')
  if (cleared >= 1) qmCompleteShared(server, data, 'wave1')
  if (cleared >= 5) qmCompleteShared(server, data, 'wave5')
  if (cleared >= 8) qmCompleteShared(server, data, 'wave8')
  if (cleared >= 15) qmCompleteShared(server, data, 'wave15')
  if (cleared >= 20) qmCompleteShared(server, data, 'horde20')
  if (cleared >= 30) qmCompleteShared(server, data, 'horde30')
  if (cleared >= 40) qmCompleteShared(server, data, 'horde40')
  if (cleared >= 20 && data.getBoolean('td_hardcoreEnabled')) qmCompleteShared(server, data, 'ch_hardcore20')
  if (data.getBoolean('td_amuletOnPedestal')) qmCompleteShared(server, data, 'amuletOnPedestal')
  // wave_airdrop.js sets this when a supply crate lands.
  if (data.contains('td_airdropLandedUntilTick')) qmCompleteShared(server, data, 'delivery')
  var tiers = PEDESTAL_UPGRADE_STAT_ORDER.map((stat) => pedestalUpgradeTier(data, stat))
  if (tiers.some((t) => t > 0)) qmCompleteShared(server, data, 'upgrade')
  if (tiers.every((t) => t >= pedestalUpgradeMaxTier())) qmCompleteShared(server, data, 'ch_maxed')

  var players = server.getPlayers()
  for (var i = 0; i < players.length; i++) {
    var player = players[i]
    for (var k = 0; k < QM_SHARED_KEYS.length; k++) {
      if (data.getBoolean('td_q_' + QM_SHARED_KEYS[k])) qmCompleteForPlayer(player, QM_SHARED_KEYS[k])
    }
    // td_amuletWorn lives on the player (set by startup_scripts/amulet.js).
    if (player.persistentData.getBoolean('td_amuletWorn')) qmCompleteForPlayer(player, 'amuletWorn')
    qmCheckPastLine(player, level, data)
  }
})

// "Past the Line": the player stands QM_PAST_LINE_BLOCKS beyond the closed
// border while the border is open (amulet_pedestal.js), in the overworld.
function qmCheckPastLine(player, level, data) {
  if (player.persistentData.getBoolean('td_qp_pastLine')) return
  if (!data.getBoolean('td_amuletOnPedestal')) return
  if (`${player.getLevel().dimension}` !== 'minecraft:overworld') return
  var border = level.getWorldBorder()
  var half = border.getSize() / 2 - BORDER_EXPAND_DELTA / 2
  var out = Math.max(Math.abs(player.getX() - border.getCenterX()), Math.abs(player.getZ() - border.getCenterZ())) - half
  if (out >= QM_PAST_LINE_BLOCKS) qmCompleteForPlayer(player, 'pastLine')
}

// Challenges chapter: was the pedestal hit during the current wave? The
// health at the wave's start is kept, and any poll that sees less marks the
// wave as damaged. A clear from wave 5 on with no damage completes "Not a
// Scratch".
function qmTrackPedestalDamage(server, data) {
  var inWave = data.getBoolean('td_inWave')
  var was = data.getBoolean('td_q_dmgPrevInWave')
  data.putBoolean('td_q_dmgPrevInWave', inWave)
  var health = data.contains('td_pedestalHealth') ? data.getInt('td_pedestalHealth') : pedestalMaxHealth(data)
  if (inWave && !was) {
    data.putInt('td_q_waveStartHealth', health)
    data.putBoolean('td_q_waveDamaged', false)
  } else if (inWave && health < data.getInt('td_q_waveStartHealth')) {
    data.putBoolean('td_q_waveDamaged', true)
  } else if (!inWave && was && !data.getBoolean('td_q_waveDamaged') && !data.getBoolean('td_pedestalDestroyed') &&
             data.getInt('td_q_runningWave') >= 5) {
    qmCompleteShared(server, data, 'ch_untouched')
  }
}

// "Silence the Spawner": any spawner broken by a player.
BlockEvents.broken('minecraft:spawner', (event) => {
  var player = event.player
  if (player) qmCompleteForPlayer(player, 'spawner')
})

// Boss kill: boss_wave.js tags its boss td_boss and handles its drops.
EntityEvents.death(function (event) {
  var entity = event.entity
  if (!entity || !entity.getTags().contains('td_boss')) return
  var level = event.level
  var data = worldData(level)
  if (!data) return
  qmCompleteShared(level.getServer(), data, 'boss')
  // "Intercept": the pedestal untouched this wave when the boss falls.
  var health = data.contains('td_pedestalHealth') ? data.getInt('td_pedestalHealth') : pedestalMaxHealth(data)
  if (data.getBoolean('td_inWave') && !data.getBoolean('td_q_waveDamaged') && health >= data.getInt('td_q_waveStartHealth')) {
    qmCompleteShared(level.getServer(), data, 'ch_intercept')
  }
})
