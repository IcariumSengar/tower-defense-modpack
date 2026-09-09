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
