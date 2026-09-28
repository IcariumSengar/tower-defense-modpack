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
//
// **No respawn, 2026-09-10** - direct playtest report: "i enabled hardcore
// mode and i died but i was able to respawn." The live log for that death
// shows this hook DID fire (game-over chat, "Your game mode has been
// updated to Spectator Mode", the quest-progress export) - the gap was the
// death screen itself. Vanilla only removes the Respawn button when the
// LEVEL is hardcore, a flag the client receives once at login and that
// this pack's runtime-toggled mode can't flip, so the player was still
// offered "Respawn", took it, and came back (as a spectator - technically
// locked out, but it read as "I respawned"). Fixed by ending the session
// instead of the life: HARDCORE_KICK_DELAY_TICKS after the death - long
// enough for the GAME OVER title and sting to land on the death screen -
// every online player is disconnected with the game-over text as the
// disconnect reason (ServerPlayer#kick via KubeJS's own kjs$kick(Component),
// confirmed present in the installed jar; vanilla 1.20.1's kick has no
// "can't kick the host" guard either, checked against the real client
// jar's KickCommand). Reopening the world afterwards drops straight into
// spectator (the login hook below) so the world can still be looked
// around, never played. If Respawn is clicked before the delay elapses,
// the respawn hook below kicks immediately instead.
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
// assumed. Confirmed for real on 2026-09-10 by the live death itself:
// the lone player's own death passed this check and the game-over ran.
function hardcoreAllPlayersDead(server) {
  var players = server.getPlayers()
  for (var i = 0; i < players.length; i++) {
    if (players[i].getHealth() > 0) return false
  }
  return true
}

var HARDCORE_KICK_DELAY_TICKS = 80 // vanilla title fade-in (10) + hold (70): the GAME OVER title plays out fully first
var HARDCORE_KICK_POLL_TICKS = 10

function hardcoreKickReason() {
  return '§4§lGAME OVER\n\n§cHardcore was on, and nothing caught you this time.\n§7The run is over. Start a new world to try again.\n\n§8Reopen this world to look around it as a spectator.'
}

function hardcoreKickAll(server) {
  var players = server.getPlayers()
  for (var i = 0; i < players.length; i++) {
    try {
      players[i].kick(hardcoreKickReason())
    } catch (e) {
      console.log('hardcore_death.js: kick failed: ' + e)
    }
  }
}

// Shared, idempotent-guarded (td_hardcoreGameOver) game-over sequence -
// mirrors pedestal_destruction.js's own triggerPedestalDestroyed() shape
// (same countdown/night-lock cleanup, same "GAME OVER + reason" popup
// framing since 2026-09-10) but a genuinely harder real outcome, matching
// the actual ask: real permadeath, not just "can't fight more waves." A
// separate flag from td_pedestalDestroyed on purpose - that one
// specifically means "the pedestal is gone" for other scripts reading it
// (pedestal_health.js, quest_milestones.js), which isn't true here.
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

  // One popup, "GAME OVER" first and the reason as its subtitle - the
  // same shape pedestal_destruction.js uses since 2026-09-10 (direct
  // feedback there: the reason "should be part of the game over message").
  server.runCommandSilent('title @a title {"text":"GAME OVER","color":"dark_red","bold":true}')
  server.runCommandSilent('title @a subtitle {"text":"Hardcore: you have fallen, and nothing caught you.","color":"red"}')
  // At each player (2026-09-27 audit): a bare `playsound ... @a ~ ~ ~` from the server plays at world spawn and is inaudible past ~16 blocks.
  server.runCommandSilent('execute as @a at @s run playsound minecraft:entity.wither.death master @s ~ ~ ~ 1 0.6 1')
  player.tell('§4§lGame over - the run ends here.')
  player.tell('§7Hardcore was on, and nothing was left to catch you this time.')

  // @a, not a name/UUID-targeted selector - matches every other command
  // in this file and this pack's standing "not designed for multiplayer"
  // scope (docs/FEATURES.md), same convention pedestal_destruction.js's
  // own title/tellraw calls already use.
  server.runCommandSilent('gamemode spectator @a')

  // The actual "no respawn" - see the header. Scheduled, not immediate,
  // so the title/sting above are seen on the death screen first.
  data.putInt('td_hardcoreKickTick', level.getTime() + HARDCORE_KICK_DELAY_TICKS)
}

// Delayed disconnect. Driven from any online player's tick rather than
// the dead one specifically - ServerPlayer#doTick (and with it Forge's
// PlayerTickEvent, what PlayerEvents.tick rides on) keeps running for a
// player sitting on the death screen, but nothing here depends on that
// being true for the one who died: whoever ticks first fires it for all.
PlayerEvents.tick((event) => {
  var player = event.player
  var level = player.getLevel()
  if (level.getTime() % HARDCORE_KICK_POLL_TICKS !== 0) return
  var data = worldData(level)
  if (!data || !data.getBoolean('td_hardcoreGameOver')) return
  if (!data.contains('td_hardcoreKickTick')) return
  if (level.getTime() < data.getInt('td_hardcoreKickTick')) return
  data.remove('td_hardcoreKickTick')
  hardcoreKickAll(player.getServer())
})

// Real respawn happens on a fresh tick after death regardless of
// gamemode - PlayerEvents.respawned fires once per respawn (confirmed in
// the same PlayerEvents.class decompile above), the exact moment vanilla
// would otherwise drop the player back into survival. Re-applies
// spectator every time so this can't be undone by dying once, respawning
// and carrying on - and, since 2026-09-10, ends the session right there:
// a respawn after a hardcore game-over only happens if Respawn was clicked
// inside the kick delay, and the answer is the same disconnect either way.
PlayerEvents.respawned((event) => {
  var player = event.player
  var data = worldData(player.getLevel())
  if (!data) return
  if (!data.getBoolean('td_hardcoreGameOver')) return
  player.getServer().runCommandSilent('gamemode spectator @a')
  data.remove('td_hardcoreKickTick')
  hardcoreKickAll(player.getServer())
})

// Same re-lock on login - covers leaving and rejoining the world after a
// hardcore death from an earlier session (the marker's persistentData
// survives a server restart, same as every other shared flag in
// world_state.js). Deliberately NOT a kick: this is the "look around the
// world you lost" path the disconnect text points at - spectator only,
// with a reminder popup so it can't be mistaken for a live run.
PlayerEvents.loggedIn((event) => {
  var player = event.player
  var data = worldData(player.getLevel())
  if (!data) return
  if (!data.getBoolean('td_hardcoreGameOver')) return
  var server = player.getServer()
  server.runCommandSilent('gamemode spectator @a')
  server.runCommandSilent('title @a title {"text":"GAME OVER","color":"dark_red","bold":true}')
  server.runCommandSilent('title @a subtitle {"text":"This run ended in hardcore. Spectating only - start a new world to play again.","color":"gray"}')
})
