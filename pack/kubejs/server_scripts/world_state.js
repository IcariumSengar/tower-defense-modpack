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
// Cached since 2026-09-26 (performance pass). The old uncached version did
// a full level.getEntities() copy + JS callback per entity on EVERY call,
// and worldData() has ~35 call sites - six of them every tick before their
// own throttle - which added up to ~160 full-level scans/second between
// waves and far more during one, all garbage the client's shared heap
// (single-player) has to collect. The cache is only trusted while the
// entity is still live (not removed/unloaded) and in the level being
// asked about; anything else falls through to a real scan, and a miss is
// never cached, so "no marker yet" still re-checks on every call exactly
// like before. Top-level var with a distinctive name - shared scope
// across server_scripts files (see mob_aggro.js's header).
var tdWorldStateEntityCache = null

function findWorldStateEntity(level) {
  var cached = tdWorldStateEntityCache
  if (cached && !cached.isRemoved() && cached.getLevel() === level) return cached
  var found = level.getEntities().find(function (e) {
    return e.getTags().contains('td_pedestal_target')
  })
  if (found) tdWorldStateEntityCache = found
  return found
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

// Quest-progress carryover across worlds (2026-09-09's
// hardcore_quest_carryover.js + a manual-copy tip that lived here) was
// DROPPED 2026-09-10 on direct feedback: "drop the whole quest book
// progress carries over between worlds. Its buggy and im not invested in
// the idea." Quest progress is per world again, full stop - nothing is
// exported at game over and nothing is imported at login.
