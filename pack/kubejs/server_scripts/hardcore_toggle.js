// Hardcore mode toggle - first piece of the still-partial Hardcore mode
// spec (docs/FEATURES.md's "Hardcore mode" section, corrected 2026-09-09).
// Player-run command, no permission gate - matches the spec's own "no
// GUI, defaults off, player flips it on themselves" decision, same as
// the Wave Horn being a plain item rather than an OP-only command.
//
// Just the switch itself. Both Totem-of-Undying sources
// (boss_wave.js's boss-kill drop, hardcore_totem_recipe.js's crafting
// recipe), the pedestal-destruction game-over path
// (pedestal_destruction.js), and the actual permadeath consequence
// (hardcore_death.js's death-event hook - real player death, no totem
// saved it, forces permanent spectator + freezes further wave-
// triggering) all react to td_hardcoreEnabled independently of this
// file - this one just flips the flag.
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
