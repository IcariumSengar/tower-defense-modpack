// Client half of the Sentry mode lock in server_scripts/sentry_default_mode.js.
// The client sends the click to the server and then runs Sentry#mobInteract
// on its own copy, which would cycle the mode locally and show the new mode in
// the action bar although the server kept the old one. Cancelling it here
// stops that; the server cancels the real click and says why. Keep this check
// in step with sentryModeClick there.
var SENTRY_KEEPS_INTERACTION = [
  'securitycraft:disguise_module',
  'securitycraft:whitelist_module',
  'securitycraft:speed_module',
  'securitycraft:universal_block_modifier',
  'securitycraft:remote_access_sentry',
  'securitycraft:universal_owner_changer',
]

ItemEvents.entityInteracted((event) => {
  var target = event.target
  if (`${target.type}` !== 'securitycraft:sentry') return
  if (`${event.hand}` !== 'MAIN_HAND') return
  if (event.player.isCrouching()) return
  var itemId = `${event.item.id}`
  if (SENTRY_KEEPS_INTERACTION.includes(itemId)) return
  if (itemId === 'minecraft:redstone' && target.isShutDown()) return
  event.cancel()
})
