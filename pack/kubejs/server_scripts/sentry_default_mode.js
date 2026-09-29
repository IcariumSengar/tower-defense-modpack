// Starts SecurityCraft's Sentry and I.M.S. in mobs-only targeting; the mod
// places both in a mode that also targets players.
var SENTRY_DEFAULT_MODE = 4 // SentryMode.AGGRESSIVE_H ordinal, hostiles only

// SentryItem places a Sentry in CAMOUFLAGE_HP (hostiles and players) and no
// config option changes that. EntityEvents.spawned also fires when a Sentry
// loads from disk, and the KubeJS event can't tell the two apart, so only
// CAMOUFLAGE_HP is switched: other modes survive a reload, but a Sentry
// deliberately set to CAMOUFLAGE_HP flips to mobs-only on its next load.
EntityEvents.spawned((event) => {
  var entity = event.entity
  if (`${entity.type}` !== 'securitycraft:sentry') return
  if (`${entity.getMode().name()}` !== 'CAMOUFLAGE_HP') return
  // toggleMode(player, mode, sendMessage) sets an explicit mode. No message:
  // SentryItem's placement message, which always names CAMOUFLAGE_HP, can't be
  // suppressed, and a second one would contradict it.
  entity.toggleMode(null, SENTRY_DEFAULT_MODE, false)
})

// The I.M.S. mode is a private targetingMode option (default
// PLAYERS_AND_MOBS) reached through the public customOptions().
// TargetingMode's order is PLAYERS, PLAYERS_AND_MOBS, MOBS, and toggle()
// steps to the next, so one toggle gives MOBS. onOptionChanged and
// sendBlockUpdated follow SecurityCraft's own option handler: mark the block
// entity for saving, then sync the client. BlockEvents.placed fires only on
// placement, so a mode the player picks later sticks.
BlockEvents.placed(['securitycraft:ims'], (event) => {
  try {
    var be = event.getBlock().getEntity()
    if (!be) return
    var options = be.customOptions()
    for (var i = 0; i < options.length; i++) {
      var option = options[i]
      if (`${option.getName()}` !== 'targetingMode') continue
      if (`${option.get().name()}` !== 'PLAYERS_AND_MOBS') return
      option.toggle()
      be.onOptionChanged(option)
      var state = be.getBlockState()
      event.getLevel().sendBlockUpdated(be.getBlockPos(), state, state, 3)
      return
    }
  } catch (e) {
    console.error(`sentry_default_mode.js: failed to set the I.M.S. to mobs-only (${e})`)
  }
})
