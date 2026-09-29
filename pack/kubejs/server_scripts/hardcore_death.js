// Hardcore mode's permadeath. With td_hardcoreEnabled set (hardcore_toggle.js),
// the run ends once every online player is dead: GAME OVER for everyone, every
// player becomes a spectator, and a few seconds later everyone is disconnected
// with the game-over text as the reason. Logging in again afterwards puts
// players in spectator mode.
//
// The disconnect is what makes a death final. The death screen still offers
// Respawn: vanilla only turns it into Spectate World in a world created as
// hardcore, a flag the client receives at login.
//
// PlayerEvents has no death event in this KubeJS build, so player deaths come
// through EntityEvents.death. A Totem of Undying save never reaches it: vanilla
// checks for a totem before the entity dies.
EntityEvents.death((event) => {
  var entity = event.entity
  if (`${entity.type}` !== 'minecraft:player') return
  var player = entity
  var level = event.level
  var data = worldData(level)
  if (!data) return
  if (!data.getBoolean('td_hardcoreEnabled')) return
  if (data.getBoolean('td_hardcoreGameOver')) return

  // A death while anyone online is still alive is an ordinary death. A player
  // on the death screen has 0 health, so a lone player's death always ends the
  // run.
  if (!hardcoreAllPlayersDead(player.getServer())) return

  triggerHardcoreGameOver(player, level)
})

function hardcoreAllPlayersDead(server) {
  var players = server.getPlayers()
  for (var i = 0; i < players.length; i++) {
    if (players[i].getHealth() > 0) return false
  }
  return true
}

// Ticks from game over to the kick: a title's default fade-in (10) plus stay
// (70), so GAME OVER shows in full on the death screen first.
var HARDCORE_KICK_DELAY_TICKS = 80
var HARDCORE_KICK_POLL_TICKS = 10

function hardcoreKickReason() {
  return '§4§lGAME OVER\n\n§cHardcore was on, and nothing caught you this time.\n§7The run is over. Start a new world to try again.\n\n§8Reopen this world to look around it as a spectator.'
}

// Vanilla 1.20.1 lets the server kick the singleplayer host too, so this also
// ends a singleplayer session.
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

// Ends the run. Sets td_hardcoreGameOver rather than td_pedestalDestroyed,
// which other scripts read as "the pedestal is gone"; scripts that stop at game
// over check both. The wave and countdown cleanup matches
// triggerPedestalDestroyed() in pedestal_destruction.js. `player` is the last
// player to die and gets the chat lines.
function triggerHardcoreGameOver(player, level) {
  var data = worldData(level)
  if (!data) return
  data.putBoolean('td_hardcoreGameOver', true)

  var server = player.getServer()

  // End the wave, undo wave_spawner.js's night lock and stop the countdown.
  if (data.getBoolean('td_inWave')) {
    data.putBoolean('td_inWave', false)
    server.runCommandSilent('time set day')
    server.runCommandSilent('gamerule doDaylightCycle true')
  }
  data.putBoolean('td_countdownActive', false)

  // One popup: GAME OVER, with the reason as subtitle, as in
  // pedestal_destruction.js.
  server.runCommandSilent('title @a title {"text":"GAME OVER","color":"dark_red","bold":true}')
  server.runCommandSilent('title @a subtitle {"text":"Hardcore: you have fallen, and nothing caught you.","color":"red"}')
  // Played at each player: the server's command source sits at world spawn, so
  // a plain ~ ~ ~ sound would only be heard within 16 blocks of spawn.
  server.runCommandSilent('execute as @a at @s run playsound minecraft:entity.wither.death master @s ~ ~ ~ 1 0.6 1')
  player.tell('§4§lGame over - the run ends here.')
  player.tell('§7Hardcore was on, and nothing was left to catch you this time.')

  // Everyone online is dead at this point.
  server.runCommandSilent('gamemode spectator @a')

  // Scheduled, so the title and sound play on the death screen before the kick.
  data.putInt('td_hardcoreKickTick', level.getTime() + HARDCORE_KICK_DELAY_TICKS)
}

// Runs the scheduled kick. PlayerEvents.tick keeps firing for players on the
// death screen, and any player's tick kicks everyone.
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

// Any respawn after game over re-applies spectator and kicks everyone at once,
// which also covers Respawn clicked before the scheduled kick.
PlayerEvents.respawned((event) => {
  var player = event.player
  var data = worldData(player.getLevel())
  if (!data) return
  if (!data.getBoolean('td_hardcoreGameOver')) return
  player.getServer().runCommandSilent('gamemode spectator @a')
  data.remove('td_hardcoreKickTick')
  hardcoreKickAll(player.getServer())
})

// On login after game over: spectator mode and a reminder title, but no kick.
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
