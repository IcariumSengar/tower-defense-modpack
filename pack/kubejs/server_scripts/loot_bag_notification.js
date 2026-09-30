// Shows the contents of an opened loot bag as Pick Up Notifier popups.
// BountyBags puts a bag's loot straight into the inventory and never tells the
// player what they got, and Pick Up Notifier only reacts to item entities
// being picked up, so this script feeds it by hand.
//
// Right-clicking a bag records the player's item counts before BountyBags'
// use() runs, which grants the loot synchronously. The next level tick counts
// again and sends Pick Up Notifier the amount of each item that went up, so
// loot that merges into a stack shows what the bag gave, and the bag itself
// (which went down) doesn't show. Levels tick before players, so items picked
// up off the ground in that tick aren't counted; Pick Up Notifier shows those
// itself.
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

// Item counts in the player's inventory, keyed by item id and NBT. When
// samples is given, it also collects one stack per key.
function lbnInventoryCounts(player, samples) {
  var counts = {}
  var inv = player.getInventory()
  for (var i = 0; i < inv.getContainerSize(); i++) {
    var stack = inv.getItem(i)
    if (stack.isEmpty()) continue
    var key = `${stack.id}|${stack.getTag()}`
    counts[key] = (counts[key] || 0) + stack.getCount()
    if (samples && !samples[key]) samples[key] = stack
  }
  return counts
}

// Sends each item whose count rose since `before`, with the amount gained.
function lbnNotifyGains(player, before) {
  var samples = {}
  var after = lbnInventoryCounts(player, samples)
  Object.keys(after).forEach((key) => {
    var gained = after[key] - (before[key] || 0)
    // The message carries the count in a byte, so large gains go in parts.
    while (gained > 0) {
      var part = Math.min(gained, 64)
      var shown = samples[key].copy()
      shown.setCount(part)
      notifyPickUpNotifier(player, shown)
      gained -= part
    }
  })
}

// Open windows: { uuid, player, startTick, before }.
var pendingBagOpens = []

ItemEvents.rightClicked((event) => {
  var id = `${event.item.id}`
  if (!LOOT_BAG_NAMES[id]) return
  var player = event.entity
  var uuid = `${player.uuid}`
  // A second open before the window closes keeps the first record, so the
  // gains from both are shown.
  for (var i = 0; i < pendingBagOpens.length; i++) {
    if (pendingBagOpens[i].uuid === uuid) return
  }
  pendingBagOpens.push({
    uuid: uuid,
    player: player,
    startTick: Number(player.getLevel().getTime()),
    before: lbnInventoryCounts(player, null),
  })
})

// Closes a window on its player's level's first tick after the click.
LevelEvents.tick((event) => {
  if (pendingBagOpens.length === 0) return
  var level = event.level
  var now = Number(level.getTime())
  for (var i = pendingBagOpens.length - 1; i >= 0; i--) {
    var pending = pendingBagOpens[i]
    if (pending.player.isRemoved()) {
      pendingBagOpens.splice(i, 1)
      continue
    }
    if (pending.player.getLevel() !== level || now <= pending.startTick) continue
    pendingBagOpens.splice(i, 1)
    lbnNotifyGains(pending.player, pending.before)
  }
})
