// Completes the campaign's milestone quests. Each is an FTB Quests custom task
// the player can't tick off by hand; this script completes it when its event
// happens: the horn first sounded, waves 1, 3, 8 and 15 cleared, the boss
// killed, the amulet worn or set on the pedestal, and a loot bag opened.
//
// Completion runs /ftbquests change_progress. Shared milestones keep a one-shot
// flag (td_q_<key>) on the world-state marker (worldData() from
// world_state.js), so each world completes them once and a restart doesn't
// repeat them. Per-player ones keep theirs (td_qp_<key>) in the player's
// persistentData.
//
// QM_TASKS must match the custom task ids in
// config/ftbquests/quests/chapters/campaign.snbt.
var QM_TASKS = {
  horn: '5A1C0E7B93D4F216',
  wave1: '6B2D1F8CA4E50327',
  wave3: '7C3E209DB5F61438',
  wave8: '1E5042BFD718365A',
  boss: '2F6153C0E829476B',
  wave15: '307264D1F93A587C',
  amuletWorn: '418375E20A4B698D',
  amuletOnPedestal: '529486F31B5C7A9E',
  openIt: '4B770968EBD48DB3',
}

// "Open It" is per player and completes on the first right-click of any bag.
var QM_LOOT_BAG_IDS = [
  'bountybags:uncommon_loot_bag',
  'bountybags:rare_loot_bag',
  'bountybags:epic_loot_bag',
  'bountybags:legendary_loot_bag',
]

ItemEvents.rightClicked((event) => {
  if (!QM_LOOT_BAG_IDS.includes(`${event.item.id}`)) return
  qmCompleteForPlayer(event.entity, 'openIt')
})
var QM_POLL_INTERVAL = 20 // ticks

// Once per world, for every player online at that moment.
function qmCompleteShared(server, data, key) {
  var flag = 'td_q_' + key
  if (data.getBoolean(flag)) return
  data.putBoolean(flag, true)
  server.runCommandSilent('ftbquests change_progress @a complete ' + QM_TASKS[key])
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

PlayerEvents.tick(function (event) {
  var player = event.player
  var level = player.getLevel()
  if (level.getTime() % QM_POLL_INTERVAL !== 0) return
  var data = worldData(level)
  if (!data) return
  var server = player.getServer()

  // A wave is cleared when td_inWave goes from true to false. td_waveNumber
  // alone can't tell: it rises when the horn sounds, before wave_status.js sees
  // the first mob and sets td_inWave. A pedestal loss or a hardcore game over
  // also clears td_inWave, and neither counts as a clear.
  var wasInWave = data.getBoolean('td_q_prevInWave')
  var inWave = data.getBoolean('td_inWave')
  data.putBoolean('td_q_prevInWave', inWave)
  if (wasInWave && !inWave && !data.getBoolean('td_pedestalDestroyed') && !data.getBoolean('td_hardcoreGameOver')) {
    data.putInt('td_q_lastClearedWave', data.getInt('td_waveNumber'))
  }
  var cleared = data.getInt('td_q_lastClearedWave')

  if (data.getInt('td_lastHornUseTick') > 0) qmCompleteShared(server, data, 'horn')
  if (cleared >= 1) qmCompleteShared(server, data, 'wave1')
  if (cleared >= 3) qmCompleteShared(server, data, 'wave3')
  if (cleared >= 8) qmCompleteShared(server, data, 'wave8')
  if (cleared >= 15) qmCompleteShared(server, data, 'wave15')
  if (data.getBoolean('td_amuletOnPedestal')) qmCompleteShared(server, data, 'amuletOnPedestal')

  // td_amuletWorn lives on the player (set by startup_scripts/amulet.js).
  if (player.persistentData.getBoolean('td_amuletWorn')) qmCompleteForPlayer(player, 'amuletWorn')
})

// Boss kill: boss_wave.js tags its boss td_boss and handles its drops.
EntityEvents.death(function (event) {
  var entity = event.entity
  if (!entity || !entity.getTags().contains('td_boss')) return
  var level = event.level
  var data = worldData(level)
  if (!data) return
  qmCompleteShared(level.getServer(), data, 'boss')
})
