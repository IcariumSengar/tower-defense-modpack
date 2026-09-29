// Shows the contents of an opened loot bag as Pick Up Notifier popups.
// BountyBags puts a bag's loot straight into the inventory and never tells the
// player what they got, and Pick Up Notifier only reacts to item entities
// being picked up, so this script feeds it by hand.
//
// Right-clicking a bag starts a short listening window, and every inventory
// change inside it is sent to Pick Up Notifier. BountyBags grants the loot
// synchronously in the bag's use(), so the window only has to last until the
// player's next tick.
var LOOT_BAG_NAMES = { // only the keys (bag item ids) are read
  'bountybags:uncommon_loot_bag': 'Uncommon Bounty Bag',
  'bountybags:rare_loot_bag': 'Rare Bounty Bag',
  'bountybags:epic_loot_bag': 'Epic Bounty Bag',
  'bountybags:legendary_loot_bag': 'Legendary Bounty Bag',
}

// Pick Up Notifier has no API for this. Sending its S2CTakeItemStackMessage
// over the public PickUpNotifier.NETWORK channel makes the client add the same
// popup entry a real pickup would.
//
// punResolveClass reaches Class.forName through java.lang.Class itself, found
// by signature, because scripts can't load java.* classes here.
function punResolveClass(anyObj, className) {
  var classOfClass = anyObj.getClass().getClass()
  var methods = classOfClass.getMethods()
  var forNameMethod = null
  for (var i = 0; i < methods.length; i++) {
    var m = methods[i]
    var params = m.getParameterTypes()
    if (params.length === 1 && `${m.getReturnType().getName()}` === 'java.lang.Class' && `${params[0].getName()}` === 'java.lang.String') {
      forNameMethod = m
      break
    }
  }
  return forNameMethod.invoke(null, [className])
}

var pickUpNotifierAvailable = true
var pickUpNotifierInitDone = false
var pickUpNotifierCls = null
var s2cTakeItemStackMessageCls = null
var itemStackCls = null
var sendToMethod = null

function initPickUpNotifierReflection(anyObj) {
  if (pickUpNotifierInitDone) return
  pickUpNotifierInitDone = true
  try {
    pickUpNotifierCls = punResolveClass(anyObj, 'fuzs.pickupnotifier.PickUpNotifier')
    s2cTakeItemStackMessageCls = punResolveClass(anyObj, 'fuzs.pickupnotifier.network.S2CTakeItemStackMessage')
    itemStackCls = punResolveClass(anyObj, 'net.minecraft.world.item.ItemStack')
    var networkHandlerV2Cls = punResolveClass(anyObj, 'fuzs.puzzleslib.api.network.v2.NetworkHandlerV2')
    var messageV2Cls = punResolveClass(anyObj, 'fuzs.puzzleslib.api.network.v2.MessageV2')
    var serverPlayerCls = punResolveClass(anyObj, 'net.minecraft.server.level.ServerPlayer')
    // Looked up by name: sendToAllExcept has the same parameter types.
    sendToMethod = networkHandlerV2Cls.getMethod('sendTo', [messageV2Cls, serverPlayerCls])
  } catch (e) {
    // Pick Up Notifier or Puzzles Lib missing, or their internals changed: skip
    // the popups from now on.
    pickUpNotifierAvailable = false
    console.log(`[loot_bag_notification] Pick Up Notifier reflection unavailable: ${e}`)
  }
}

function notifyPickUpNotifier(player, stack) {
  initPickUpNotifierReflection(player)
  if (!pickUpNotifierAvailable) return
  try {
    var networkInstance = pickUpNotifierCls.getField('NETWORK').get(null)
    var messageCtor = s2cTakeItemStackMessageCls.getConstructor([itemStackCls])
    var message = messageCtor.newInstance([stack])
    sendToMethod.invoke(networkInstance, [message, player])
  } catch (e) {
    console.log(`[loot_bag_notification] Pick Up Notifier send failed: ${e}`)
  }
}

// Listening windows, by player uuid: { startTick }.
var pendingBagOpens = {}

ItemEvents.rightClicked((event) => {
  var id = `${event.item.id}`
  if (!LOOT_BAG_NAMES[id]) return
  var uuid = `${event.entity.uuid}`
  pendingBagOpens[uuid] = {
    startTick: event.entity.getLevel().getTime(),
  }
})

// The event carries the slot's resulting stack, not the amount added.
PlayerEvents.inventoryChanged((event) => {
  var uuid = `${event.entity.uuid}`
  var pending = pendingBagOpens[uuid]
  if (!pending) return
  var stack = event.getItem()
  if (stack.isEmpty()) return
  notifyPickUpNotifier(event.entity, stack)
})

// Closes the window on the player's next tick.
PlayerEvents.tick((event) => {
  var uuid = `${event.player.uuid}`
  var pending = pendingBagOpens[uuid]
  if (!pending) return
  var level = event.player.getLevel()
  if (level.getTime() - pending.startTick < 1) return
  delete pendingBagOpens[uuid]
})
