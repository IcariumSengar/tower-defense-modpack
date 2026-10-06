// Keeps SecurityCraft's Sentry in mobs-only targeting for good, and starts the
// I.M.S. in mobs-only; the mod places both in a mode that also targets
// players.
var SENTRY_DEFAULT_MODE = 4 // SentryMode.AGGRESSIVE_H ordinal, hostiles only

// SentryItem places a Sentry in CAMOUFLAGE_HP (hostiles and players) and no
// config option changes that. EntityEvents.spawned also fires when a Sentry
// loads from disk, so any Sentry not in AGGRESSIVE_H, new or saved in another
// mode before the lock below, is switched here.
EntityEvents.spawned((event) => {
  var entity = event.entity
  if (`${entity.type}` !== 'securitycraft:sentry') return
  if (entity.getMode().ordinal() === SENTRY_DEFAULT_MODE) return
  // toggleMode(player, mode, sendMessage) sets an explicit mode. No message:
  // SentryItem's placement message, which always names CAMOUFLAGE_HP, can't be
  // suppressed, and a second one would contradict it.
  entity.toggleMode(null, SENTRY_DEFAULT_MODE, false)
})

// The mode can't be changed. The Sentry Remote Access Tool, one way to set
// it, has no recipe (securitycraft_traps.js). The other is a right-click:
// Sentry#mobInteract (SecurityCraft 1.10.2.1) handles its owner's main-hand
// click in this order: sneaking picks it up; redstone restarts a shut-down
// Sentry; the Disguise, Allowlist (whitelist_module) and Speed Modules fit;
// the Universal Block Modifier strips modules; the Remote Access Tool binds;
// the Universal Owner Changer hands it over; anything else, an empty hand
// included, cycles the mode. That last click is cancelled. The Universal
// Block Remover isn't spared: with vanilla_tool_block_breaking = true (this
// pack's setting) mobInteract skips it and it cycles the mode too. Clicks by
// other players never reach the mode branch, so cancelling them costs
// nothing. client_scripts/sentry_mode_lock.js cancels the same click on the
// client, whose own run of mobInteract would otherwise show a mode change
// that never happened; keep its copy of this check in step.
var SENTRY_KEEPS_INTERACTION = [
  'securitycraft:disguise_module',
  'securitycraft:whitelist_module',
  'securitycraft:speed_module',
  'securitycraft:universal_block_modifier',
  'securitycraft:remote_access_sentry',
  'securitycraft:universal_owner_changer',
]

function sentryModeClick(event) {
  var target = event.target
  if (`${target.type}` !== 'securitycraft:sentry') return false
  if (`${event.hand}` !== 'MAIN_HAND') return false
  if (event.player.isCrouching()) return false
  var itemId = `${event.item.id}`
  if (SENTRY_KEEPS_INTERACTION.includes(itemId)) return false
  return !(itemId === 'minecraft:redstone' && target.isShutDown())
}

ItemEvents.entityInteracted((event) => {
  if (!sentryModeClick(event)) return
  event.player.setStatusMessage('§eSentries only shoot hostile mobs. Their mode is locked.')
  event.cancel()
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
