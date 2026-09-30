// Completes the campaign's milestone quests. Each is an FTB Quests custom task
// the player can't tick off by hand; this script completes it when its event
// happens: the horn first sounded, waves 1, 3, 8 and 15 cleared, the boss
// killed, the amulet worn or set on the pedestal, and a loot bag opened.
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
  wave3: '7C3E209DB5F61438',
  wave8: '1E5042BFD718365A',
  boss: '2F6153C0E829476B',
  wave15: '307264D1F93A587C',
  amuletWorn: '418375E20A4B698D',
  amuletOnPedestal: '529486F31B5C7A9E',
  openIt: '4B770968EBD48DB3',
}

// Shared milestones, in campaign order.
var QM_SHARED_KEYS = ['horn', 'wave1', 'wave3', 'wave8', 'boss', 'wave15', 'amuletOnPedestal']

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

  qmTrackWaveClear(data)
  var cleared = data.getInt('td_q_lastClearedWave')
  if (data.getInt('td_lastHornUseTick') > 0) qmCompleteShared(server, data, 'horn')
  if (cleared >= 1) qmCompleteShared(server, data, 'wave1')
  if (cleared >= 3) qmCompleteShared(server, data, 'wave3')
  if (cleared >= 8) qmCompleteShared(server, data, 'wave8')
  if (cleared >= 15) qmCompleteShared(server, data, 'wave15')
  if (data.getBoolean('td_amuletOnPedestal')) qmCompleteShared(server, data, 'amuletOnPedestal')

  var players = server.getPlayers()
  for (var i = 0; i < players.length; i++) {
    var player = players[i]
    for (var k = 0; k < QM_SHARED_KEYS.length; k++) {
      if (data.getBoolean('td_q_' + QM_SHARED_KEYS[k])) qmCompleteForPlayer(player, QM_SHARED_KEYS[k])
    }
    // td_amuletWorn lives on the player (set by startup_scripts/amulet.js).
    if (player.persistentData.getBoolean('td_amuletWorn')) qmCompleteForPlayer(player, 'amuletWorn')
  }
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
