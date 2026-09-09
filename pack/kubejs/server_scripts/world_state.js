// Shared, durable, cross-player campaign state (wave number, pedestal
// HP/position/destroyed flag, wave-horn cooldown/countdown, amulet-on-
// pedestal flag, "has the base already been built" gate) - used to live
// on player.persistentData everywhere in this pack, which is genuinely
// per-player NBT, not world state. Invisible in singleplayer (the one
// player's data and the world's data are the same thing); broke outright
// the moment a second player was involved - see docs/FEATURES.md's
// "Multiplayer / LAN readiness" for the full writeup (a fresh login
// re-triggered the entire base-build, wave number/pedestal HP desynced
// between players, two players could double-fire the Wave Horn in the
// same tick, etc).
//
// Real fix: attach this state to the permanent, forceloaded
// td_pedestal_target marker armor stand (already summoned once at
// world-build time in playtest_starter_kit.js, never killed) instead of
// a player. Confirmed via decompiling this pack's exact installed KubeJS
// build (kubejs-forge-2001.6.5-build.26) with javap, not assumed:
// EntityMixin.class implements persistentData generically on vanilla's
// own Entity class (a real kjs$persistentData CompoundTag field, saved/
// loaded under the "KubeJSPersistentData" NBT key via real mixin
// save/load hooks) - PlayerMixin/ServerPlayerMixin don't redeclare it at
// all, Player just inherits Entity's implementation via the class
// hierarchy. So any entity, including this permanent marker, persists it
// exactly like a player would - real NBT, saved with the entity,
// survives a server restart. (KubeJS's own level/server-scoped
// persistentData was already checked and ruled out for this exact
// purpose - see base_expansion.js's older comment - it's in-memory only,
// never save-backed.)
//
// The marker's own EXISTENCE doubles as the "has this world's base
// already been built" signal - no separate boolean flag needed, which
// sidesteps the chicken-and-egg problem of needing a flag before the
// entity that would hold it exists. mob_aggro.js's own
// ensurePedestalMarker() already uses this same "does a
// td_pedestal_target-tagged entity exist" check as its own idempotency
// test; playtest_starter_kit.js's login handler now uses it as the real
// world-build gate too, replacing the old per-player td_playtestKitGiven
// check for that specific purpose (td_playtestKitGiven itself stays, but
// narrows to just "has THIS player personally received their starter
// kit" - a genuinely per-player concern, unlike the base build).
//
// Not cached - a plain level.getEntities() scan per call, same uncached-
// scan cost every other throttled tick handler in this pack already pays
// for its own entity checks (wave_status.js's hostile counter,
// pedestal_health.js's mob-damage scan). If this turns out to be a real
// measured cost, worth revisiting then - not guessed at here.
function findWorldStateEntity(level) {
  return level.getEntities().find(function (e) {
    return e.getTags().contains('td_pedestal_target')
  })
}

// Returns null only before the very first login's base-build has
// finished (the one time no marker exists anywhere in a real world) -
// every caller already has to handle "hasn't been built yet" one way or
// another, same as the old `data.contains('td_pedestalX')` checks did.
function worldData(level) {
  var entity = findWorldStateEntity(level)
  return entity ? entity.persistentData : null
}

// One-time migration, 2026-09-09 - real regression found live (direct
// report: "I no longer see the pedestal's health bar"). Root cause: the
// 2026-09-08 multiplayer fix above moved every key below from
// player.persistentData onto this marker's own persistentData, but only
// ever WROTE fresh values here for a brand-new world build
// (playtest_starter_kit.js's build-the-base branch). Any world whose
// marker was summoned before that fix - this pack's own long-running
// dev save included - kept an empty marker forever: nothing ever
// satisfied `data.contains('td_pedestalX')` again, so pedestal_health.js/
// pedestal_destruction.js/wave_spawner.js/wave_status.js/amulet_border.js
// all silently no-op on their very first check, every tick, forever -
// not just the bossbar, the wave counter and every other shared flag
// below reset to defaults too. Copies the full known shared-key set from
// the joining player's own (now legacy, orphaned) persistentData onto
// the marker exactly once, gated by the same td_pedestalX canary every
// reader already relies on to mean "real data lives here" - a fresh
// world's marker already has this key the moment it's built, so this
// safely never fires for one.
var LEGACY_SHARED_INT_KEYS = [
  'td_pedestalX', 'td_pedestalY', 'td_pedestalZ', 'td_pedestalHealth',
  'td_pedestalAlertTier', 'td_waveNumber', 'td_lastHornUseTick',
  'td_countdownEndTick', 'td_waveSpawnCompleteTick', 'td_lastEndlessLevel',
  'td_bossLastSpawnedWave', 'td_bountyKillCount',
]
var LEGACY_SHARED_BOOLEAN_KEYS = [
  'td_pedestalDestroyed', 'td_pedestalBossbarAdded', 'td_amuletOnPedestal',
  'td_inWave', 'td_wasInWaveForExpansion', 'td_countdownActive',
  'td_pacingAnnounced', 'td_starterGearRemoved',
]

function migrateLegacySharedState(player, marker) {
  var markerData = marker.persistentData
  if (markerData.contains('td_pedestalX')) return
  var legacy = player.persistentData
  if (!legacy.contains('td_pedestalX')) return
  LEGACY_SHARED_INT_KEYS.forEach(function (key) {
    if (legacy.contains(key)) markerData.putInt(key, legacy.getInt(key))
  })
  LEGACY_SHARED_BOOLEAN_KEYS.forEach(function (key) {
    if (legacy.contains(key)) markerData.putBoolean(key, legacy.getBoolean(key))
  })
}

// Shared by both game-over triggers (pedestal_destruction.js,
// hardcore_death.js) - direct question, 2026-09-09: "can quest book
// progress carry over on a restart after game over?" Real answer: yes -
// hardcore_quest_carryover.js's hqcExportProgress (called right before
// this) already snapshots it automatically to this modpack instance's
// own shared config folder, and any later login (in this same instance)
// picks it up on its own. This tip is the fallback for the one case that
// doesn't cover: moving to a different instance/PC entirely, where
// nothing shared survives. FTB Quests stores progress in one small
// per-player file INSIDE the current world's save folder
// (`<save>/ftbquests/<uuid>.snbt`, confirmed by reading a real one from
// the live instance directly), not account-wide, and ships no real
// export/import command for full progress (`/ftbquests` only has
// change_progress for one task at a time, plus a separate reward-table
// export/import for unclaimed loot chests - a different thing,
// confirmed by decompiling FTBQuestsCommands.class directly). The manual
// copy works for the same reason the automatic version does: quest/task
// ids come from the pack's own data (identical in every world using this
// pack), and a player's UUID doesn't change between worlds either - same
// file, copied verbatim into the new save's own ftbquests folder,
// restores everything.
function tellQuestCarryoverTip(player) {
  player.tell('§7Quest progress for a new world in this same install is handled automatically.')
  player.tell('§7Moving to a different install/PC instead? Copy')
  player.tell(`§7"ftbquests/${player.uuid}.snbt" from this world's save folder into`)
  player.tell('§7the new one\'s save folder (same file name) after creating it.')
}
