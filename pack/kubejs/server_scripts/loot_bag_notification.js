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

var pendingBagOpens = {}

ItemEvents.rightClicked((event) => {
  var id = `${event.item.id}`
  if (!LOOT_BAG_NAMES[id]) return
  var uuid = `${event.entity.uuid}`
  pendingBagOpens[uuid] = {
    bagName: LOOT_BAG_NAMES[id],
    items: {},
    startTick: event.entity.getLevel().getTime(),
  }
})

PlayerEvents.inventoryChanged((event) => {
  var uuid = `${event.entity.uuid}`
  var pending = pendingBagOpens[uuid]
  if (!pending) return
  var stack = event.getItem()
  if (stack.isEmpty()) return
  var itemId = `${stack.id}`
  pending.items[itemId] = (pending.items[itemId] || 0) + stack.getCount()
})

// Reports one tick after the bag's own right-click - real granting is
// synchronous within that same tick, so by the next tick every
// inventoryChanged event it produced has already fired and been
// collected above.
PlayerEvents.tick((event) => {
  var uuid = `${event.player.uuid}`
  var pending = pendingBagOpens[uuid]
  if (!pending) return
  var level = event.player.getLevel()
  if (level.getTime() - pending.startTick < 1) return
  delete pendingBagOpens[uuid]

  var itemIds = Object.keys(pending.items)
  if (itemIds.length === 0) return
  var summary = itemIds.map((id) => `${pending.items[id]}x ${id.split(':')[1]}`).join(', ')
  event.player.tell(`§6[${pending.bagName}] §aYou got: ${summary}`)
})
