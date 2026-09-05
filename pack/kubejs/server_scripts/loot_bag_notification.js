// Notify the player what they got when opening a loot bag (2026-09-04,
// real playtest feedback batch). Real check done first, not assumed:
// decompiled BountyBags' own LootBagItem#use() directly - it sends
// exactly ONE real player-facing chat message (the luck-upgrade
// notice), and the actual loot GENERATION/granting
// (UnifiedLootGenerator.generate(...)) only ever logs to the server
// console (LOGGER.debug/info), never to the player. Confirms the real
// open question from the spec: the mod does NOT already notify what was
// received - a custom hook is genuinely needed, not redundant.
//
// Direct decision (not Loot Journal, a general "any item gained" mod):
// custom-built and hooked directly to the bag's own open action, so
// it's structurally scoped to bag-opens only - can't fire on regular
// kill/mining pickups the way an unverified general-purpose mod filter
// might.
//
// Real technique: BountyBags' own granting is fully synchronous inside
// Item#use() (confirmed from the same decompile - no scheduled/deferred
// packet, no delay), so this doesn't need to guess at BountyBags' own
// internal API. Uses KubeJS's real `PlayerEvents.inventoryChanged`
// (backed by InventoryChangedEventJS, confirmed via decompile: fires
// per-slot with the resulting ItemStack) - flag a short listening
// window on the bag's own right-click (ItemEvents.rightClicked, same
// event wave_horn already uses), collect every inventoryChanged event
// that fires inside that window, then report the total once the window
// closes. Not a real inventory before/after diff - simpler, and doesn't
// need to snapshot 36+ slots for every single right-click of anything.
var LOOT_BAG_NAMES = {
  'bountybags:uncommon_loot_bag': 'Uncommon Bounty Bag',
  'bountybags:rare_loot_bag': 'Rare Bounty Bag',
  'bountybags:epic_loot_bag': 'Epic Bounty Bag',
  'bountybags:legendary_loot_bag': 'Legendary Bounty Bag',
}

// Pick Up Notifier integration, added 2026-09-05 (direct ask: "cooler"
// notification, scoped to loot-bag-opens only, not a general "any item
// gained" hook). Real investigation first: decompiled Pick Up
// Notifier's own shipped 1.20.1 jar directly (not just its GitHub
// source, in case they'd diverged) - its ONLY native triggers are
// vanilla EntityItemPickupEvent/PlayerEvent.ItemPickupEvent, both firing
// exclusively when a player walks over a dropped ItemEntity. BountyBags
// grants items straight into inventory (confirmed in this file's own
// header above - no ItemEntity involved), so the native hook could
// never fire for a bag open on its own; this feeds it manually.
//
// No documented/stable API exists for this (no `api` package, no
// stability annotations on anything below) - `PickUpNotifier.NETWORK`
// (public static field) + `S2CTakeItemStackMessage(ItemStack)` (public
// constructor, needs only an ItemStack, no ItemEntity) is a
// public-by-accident internal hook, confirmed by decompiling the real
// shipped classes: its handler calls straight into
// `AddEntriesHandler.addItemEntry(Minecraft, ItemStack)`, the exact
// same call a real walked-over pickup would trigger. Reached via this
// codebase's established Class.forName bootstrap (java.* is disabled in
// this Rhino sandbox - see mob_aggro.js's own resolveClass for the same
// technique, redeclared here with a `pun` prefix rather than shared,
// per this codebase's own established top-level-var/const-doesn't-share
// rule, and to avoid a repeat of mob_aggro.js's real cross-file name
// collision).
//
// `NetworkHandlerV2.sendTo(MessageV2, ServerPlayer)` is a default
// interface method, resolved from the INTERFACE class specifically -
// not from the network instance's own concrete class, which is
// package-private inside Puzzles Lib. A Method obtained from a
// non-public declaring class throws IllegalAccessException on invoke()
// even for a public method; resolving via the public interface instead
// sidesteps that. Also confirmed a real ambiguity that rules out this
// file's usual shape-based method finder: `sendToAllExcept(MessageV2,
// ServerPlayer)` has the exact same erased shape as `sendTo` (both
// 2-arg, void, identical param types) - resolved by NAME instead via
// `getMethod`, which (like `getConstructor`/`getField` below) is a
// plain public method safely called directly on an already-held
// Class/Field/Constructor/Method object, no different from this
// codebase's existing direct calls to `cls.getMethods()`/
// `cls.getSuperclass()` elsewhere.
//
// Kept the existing chat summary below rather than replacing it - its
// bag-name framing ("§6[Uncommon Bounty Bag]") isn't something Pick Up
// Notifier's own on-screen list conveys, so both together read better
// than either alone. Revisit if that reads as redundant in real play.
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
    sendToMethod = networkHandlerV2Cls.getMethod('sendTo', [messageV2Cls, serverPlayerCls])
  } catch (e) {
    // Pick Up Notifier/Puzzles Lib not present, or their internals
    // changed shape in a future update - fail closed and keep the chat
    // summary working on its own rather than erroring every bag open.
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

// Real chat-summary text (bagName/items aggregation, the tick handler
// that reported "You got: X, Y, Z") removed 2026-09-05 - confirmed live
// that the Pick Up Notifier popup below actually works, making the
// custom chat summary redundant (both existed to answer the same "what
// did I get" question). pendingBagOpens itself stays - it's still the
// real scoping gate keeping notifyPickUpNotifier() below limited to
// items granted during an actual bag-open window, not every inventory
// change ever (the whole "scoped to loot bags only" design intent from
// when this was built - see this function's own header above).
var pendingBagOpens = {}

ItemEvents.rightClicked((event) => {
  var id = `${event.item.id}`
  if (!LOOT_BAG_NAMES[id]) return
  var uuid = `${event.entity.uuid}`
  pendingBagOpens[uuid] = {
    startTick: event.entity.getLevel().getTime(),
  }
})

PlayerEvents.inventoryChanged((event) => {
  var uuid = `${event.entity.uuid}`
  var pending = pendingBagOpens[uuid]
  if (!pending) return
  var stack = event.getItem()
  if (stack.isEmpty()) return
  notifyPickUpNotifier(event.entity, stack)
})

// Closes the bag-open window one tick after the right-click - real
// granting is synchronous within that same tick, so by the next tick
// every inventoryChanged event it produced has already fired and been
// handled above. No longer builds/sends anything on its own (see the
// removal note above) - just bounds pendingBagOpens so it doesn't grow
// unboundedly.
PlayerEvents.tick((event) => {
  var uuid = `${event.player.uuid}`
  var pending = pendingBagOpens[uuid]
  if (!pending) return
  var level = event.player.getLevel()
  if (level.getTime() - pending.startTick < 1) return
  delete pendingBagOpens[uuid]
})
