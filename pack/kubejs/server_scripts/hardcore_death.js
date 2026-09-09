// Hardcore mode's death hook - the actual permadeath consequence, and
// the last missing piece of docs/FEATURES.md's "Hardcore mode" section.
// hardcore_toggle.js's flag+command, both Totem-of-Undying sources
// (boss_wave.js, hardcore_totem_recipe.js), and pedestal-destruction's
// own always-on game-over (pedestal_destruction.js) all already exist
// independently of this file - nothing anywhere reacted to a real player
// death until now.
//
// Real KubeJS API, confirmed by decompiling the actual installed
// kubejs-forge-2001.6.5-build.26.jar directly (javap on
// PlayerEvents.class/EntityEvents.class), not assumed from memory of
// older KubeJS docs: PlayerEvents exposes LOGGED_IN/LOGGED_OUT/
// RESPAWNED/TICK/CHAT/DECORATE_CHAT/ADVANCEMENT/INVENTORY_*/CHEST_* -
// no death handler at all. Player death has to go through
// EntityEvents.death (LivingEntityDeathEventJS, wraps Forge's real
// LivingDeathEvent), filtered to real players the same way
// flesh_death_sound.js already filters by entity.type.
//
// Real reason this handler doesn't need to check the player's inventory
// for a Totem of Undying itself: vanilla's own totem-save mechanic
// (LivingEntity#checkTotemDeathProtection) runs inside hurt(), BEFORE
// die() is ever called - and LivingDeathEvent (what EntityEvents.death
// wraps) only ever fires from inside die(). A totem-saved hit never
// reaches this handler at all, so reaching it here already proves the
// death was real - the same well-established vanilla/Forge ordering
// every "no totem farming" mod or datapack already relies on.
EntityEvents.death((event) => {
  var entity = event.entity
  if (`${entity.type}` !== 'minecraft:player') return
  var player = entity
  var level = event.level
  var data = worldData(level)
  if (!data) return
  if (!data.getBoolean('td_hardcoreEnabled')) return
  if (data.getBoolean('td_hardcoreGameOver')) return

  // Real request, 2026-09-09: game over should only trigger once EVERY
  // currently-online player is dead, not the first one - a lone death
  // while someone else is still up should stay a completely normal
  // death (respawn, recover gear from the Corpse mod's own grave, keep
  // playing), same as it would without hardcore on at all. Checked fresh
  // at the moment of each individual death event, so this is inherently
  // agnostic to how long any given respawn-delay mechanic keeps a player
  // dead - it only cares who's actually alive right now. For the tested,
  // realistic case (one player, this pack's whole framing) this changes
  // nothing: a lone player's own death always satisfies "everyone's
  // dead."
  if (!hardcoreAllPlayersDead(player.getServer())) return

  triggerHardcoreGameOver(player, level)
})

// Real curated KubeJS API, confirmed live against the actual installed
// jar (server.getPlayers() dispatches to LevelKJS/MinecraftServerKJS's
// own kjs$getPlayers(), same remap pattern as the already-proven
// level.getEntities()) - no precedent for this exact call anywhere else
// in this pack (boss_wave.js's own header explicitly notes it avoided
// needing "a confirmed level.getPlayers()-style API" for its own,
// unrelated reason), so verified fresh here via RCON rather than
// assumed. getHealth() itself couldn't be exercised against a real
// connected player in this environment (no graphical client, same
// standing limitation as every other real-player-only check in this
// pack) - flag this specific piece for a real hands-on check.
function hardcoreAllPlayersDead(server) {
  var players = server.getPlayers()
  for (var i = 0; i < players.length; i++) {
    if (players[i].getHealth() > 0) return false
  }
  return true
}

// Shared, idempotent-guarded (td_hardcoreGameOver) game-over sequence -
// mirrors pedestal_destruction.js's own triggerPedestalDestroyed() shape
// (same countdown/night-lock cleanup, same title+tell pattern) but a
// genuinely harder real outcome, matching the actual ask: real
// permadeath, not just "can't fight more waves." A separate flag from
// td_pedestalDestroyed on purpose - that one specifically means "the
// pedestal is gone" for other scripts reading it (pedestal_health.js,
// quest_milestones.js), which isn't true here.
function triggerHardcoreGameOver(player, level) {
  var data = worldData(level)
  if (!data) return
  data.putBoolean('td_hardcoreGameOver', true)

  var server = player.getServer()

  if (data.getBoolean('td_inWave')) {
    data.putBoolean('td_inWave', false)
    server.runCommandSilent('time set day')
    server.runCommandSilent('gamerule doDaylightCycle true')
  }
  data.putBoolean('td_countdownActive', false)

  server.runCommandSilent('title @a title {"text":"HARDCORE: YOU HAVE FALLEN","color":"dark_red","bold":true}')
  server.runCommandSilent('title @a subtitle {"text":"No totem answered this time. The run ends here.","color":"gray"}')
  server.runCommandSilent('playsound minecraft:entity.wither.death master @a ~ ~ ~ 1 0.6')
  player.tell('§4§lThe run is over.')
  player.tell('§7Hardcore was on, and nothing was left to catch you this time.')
  // Same "how do I actually restart" gap as pedestal_destruction.js's own
  // game-over popup, same fix - see that file's comment for the full
  // reasoning on reusing wave_status.js's queueDelayedTitle here.
  queueDelayedTitle(player, 'GAME OVER', 'Start a new world to try again - quest book progress carries over automatically.', 'red')
  hqcExportProgress(player)
  tellQuestCarryoverTip(player)

  // @a, not a name/UUID-targeted selector - matches every other command
  // in this file and this pack's standing "not designed for multiplayer"
  // scope (docs/FEATURES.md), same convention pedestal_destruction.js's
  // own title/tellraw calls already use.
  server.runCommandSilent('gamemode spectator @a')
}

// Real respawn happens on a fresh tick after death regardless of
// gamemode - PlayerEvents.respawned fires once per respawn (confirmed in
// the same PlayerEvents.class decompile above), the exact moment vanilla
// would otherwise drop the player back into survival. Re-applies
// spectator every time so this can't be undone by dying once, respawning
// and carrying on - the real "permanent" half of permadeath, reimplementing
// vanilla real Hardcore's own spectator-lock rather than the flag itself.
PlayerEvents.respawned((event) => {
  var player = event.player
  var data = worldData(player.getLevel())
  if (!data) return
  if (!data.getBoolean('td_hardcoreGameOver')) return
  player.getServer().runCommandSilent('gamemode spectator @a')
})

// Same re-lock on login - covers leaving and rejoining the world after a
// hardcore death from an earlier session (the marker's persistentData
// survives a server restart, same as every other shared flag in
// world_state.js).
PlayerEvents.loggedIn((event) => {
  var player = event.player
  var data = worldData(player.getLevel())
  if (!data) return
  if (!data.getBoolean('td_hardcoreGameOver')) return
  player.getServer().runCommandSilent('gamemode spectator @a')
})
