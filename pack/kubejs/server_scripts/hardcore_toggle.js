// /hardcore enable and /hardcore disable set td_hardcoreEnabled in worldData()
// (world_state.js). Any player can run them; there is no permission check. The
// flag defaults to off, and only hardcore_death.js reads it.
ServerEvents.commandRegistry((event) => {
  var Commands = event.commands
  event.register(
    Commands.literal('hardcore')
      .then(
        Commands.literal('enable').executes((context) => {
          var player = context.source.getPlayerOrException()
          var data = worldData(player.getLevel())
          if (!data) {
            player.tell('§c[Hardcore] §fNothing to enable yet - the base hasn\'t finished building.')
            return 0
          }
          data.putBoolean('td_hardcoreEnabled', true)
          player.tell('§4§lHardcore mode: ON.')
          player.tell('§7Real permadeath now - if you die and no totem saves you, the run is over for good.')
          return 1
        })
      )
      .then(
        Commands.literal('disable').executes((context) => {
          var player = context.source.getPlayerOrException()
          var data = worldData(player.getLevel())
          if (!data) {
            player.tell('§c[Hardcore] §fNothing to disable yet - the base hasn\'t finished building.')
            return 0
          }
          data.putBoolean('td_hardcoreEnabled', false)
          player.tell('§a[Hardcore] §fHardcore mode: OFF.')
          return 1
        })
      )
  )
})
