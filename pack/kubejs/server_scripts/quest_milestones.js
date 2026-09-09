// Quest-book milestone bridge (2026-09-09, quest book redesign v3 - see
// docs/FEATURES.md "Quest book redesign v3"). Nine Campaign quests use a
// `custom` task with no button so the player can't self-tick them; this
// script completes each one the moment the world state it describes
// actually happens: horn first used, waves 1/3/8/15 cleared, the wave-5
// starter-gear removal, the boss dying, the amulet worn, the amulet set on
// the pedestal.
//
// Completion goes through FTB Quests' own `/ftbquests change_progress
// <players> complete <id>` - the exact idiom bounty_kills.js already runs
// live for the Bounties tiers. Boolean milestones have no progress bar to
// fill, so none of bounty_kills.js's TeamData.setProgress reflection is
// needed here.
//
// Task ids are the fixed constants also baked into the generated
// campaign.snbt (MILESTONE_TASK_IDS in the generator) - if the book is ever
// re-idded, this table changes with it, nothing else.
//
// State reads follow this codebase's dominant pattern: a throttled
// PlayerEvents.tick polling the marker entity's persistentData via the
// shared top-level worldData() from world_state.js (top-level FUNCTIONS are
// shared across server_scripts in this Rhino build, top-level vars are not
// - everything here is qm-prefixed for that reason). Wave clears are
// detected as a td_inWave true->false transition tracked on the marker
// itself (td_q_prevInWave / td_q_lastClearedWave), the same edge-trigger
// shape base_expansion.js uses, rather than trusting "td_waveNumber >= N
// && !td_inWave" - that reads true in the gap between the horn being blown
// (td_waveNumber already bumped) and the first mob being detected.
//
// One-shot guards (td_q_<key>) live on the marker per world, so a fresh
// world starts clean and a restart doesn't re-issue commands.
var QM_TASKS = {
  horn: '5A1C0E7B93D4F216',
  wave1: '6B2D1F8CA4E50327',
  wave3: '7C3E209DB5F61438',
  gear: '0D4F31AEC6072549',
  wave8: '1E5042BFD718365A',
  boss: '2F6153C0E829476B',
  wave15: '307264D1F93A587C',
  amuletWorn: '418375E20A4B698D',
  amuletOnPedestal: '529486F31B5C7A9E',
  openIt: '4B770968EBD48DB3',
}

// "Open It" (2026-09-09, direct playtest feedback: it was a self-click
// checkmark, completable with zero bags ever opened - now real, completes
// the moment a player actually opens one). Same detection idiom as
// loot_bag_notification.js's own bag-open hook (ItemEvents.rightClicked
// against the bag's own item id) - BountyBags' LootBagItem#use() was
// already decompiled there and confirmed synchronous, no separate check
// needed here since this only cares THAT a bag was opened, not what came
// out of it. Own copy of the id list, not shared - this file already
// redeclares its own state per this codebase's established per-file
// convention.
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
var QM_POLL_INTERVAL = 20

// Shared milestone: flag on the marker, completes for every online player
// (their team data, in FTB Teams terms). `target` is a player selector or
// uuid, both accepted by change_progress's EntityArgument.
function qmCompleteShared(server, data, key) {
  var flag = 'td_q_' + key
  if (data.getBoolean(flag)) return
  data.putBoolean(flag, true)
  server.runCommandSilent('ftbquests change_progress @a complete ' + QM_TASKS[key])
}

// Per-player milestone: flag on the player's own persistentData.
function qmCompleteForPlayer(player, key) {
  var flag = 'td_q_' + key
  var pdata = player.persistentData
  if (pdata.getBoolean(flag)) return
  pdata.putBoolean(flag, true)
  player.getServer().runCommandSilent('ftbquests change_progress ' + player.uuid + ' complete ' + QM_TASKS[key])
}

PlayerEvents.tick(function (event) {
  var player = event.player
  var level = player.getLevel()
  if (level.getTime() % QM_POLL_INTERVAL !== 0) return
  var data = worldData(level)
  if (!data) return
  var server = player.getServer()

  // Wave-clear edge detection. A pedestal loss also flips td_inWave false
  // (pedestal_destruction.js ends the wave), and that is not a clear.
  var wasInWave = data.getBoolean('td_q_prevInWave')
  var inWave = data.getBoolean('td_inWave')
  data.putBoolean('td_q_prevInWave', inWave)
  if (wasInWave && !inWave && !data.getBoolean('td_pedestalDestroyed')) {
    data.putInt('td_q_lastClearedWave', data.getInt('td_waveNumber'))
  }
  var cleared = data.getInt('td_q_lastClearedWave')

  if (data.getInt('td_lastHornUseTick') > 0) qmCompleteShared(server, data, 'horn')
  if (cleared >= 1) qmCompleteShared(server, data, 'wave1')
  if (cleared >= 3) qmCompleteShared(server, data, 'wave3')
  if (data.getBoolean('td_starterGearRemoved')) qmCompleteShared(server, data, 'gear')
  if (cleared >= 8) qmCompleteShared(server, data, 'wave8')
  if (cleared >= 15) qmCompleteShared(server, data, 'wave15')
  if (data.getBoolean('td_amuletOnPedestal')) qmCompleteShared(server, data, 'amuletOnPedestal')

  // amulet_worn.js keeps td_amuletWorn on the player, not the marker.
  if (player.persistentData.getBoolean('td_amuletWorn')) qmCompleteForPlayer(player, 'amuletWorn')
})

// Boss kill: boss_wave.js tags its summoned boss `td_boss`; its own death
// handler in that file drops the Totem. This one only marks the quest.
EntityEvents.death(function (event) {
  var entity = event.entity
  if (!entity || !entity.getTags().contains('td_boss')) return
  var level = event.level
  var data = worldData(level)
  if (!data) return
  qmCompleteShared(level.getServer(), data, 'boss')
})
