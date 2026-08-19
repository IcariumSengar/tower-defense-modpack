// Right-click-to-open logic for the three loot bag tiers. Each bag rolls a
// few weighted item stacks from its own pool and gives them to the player.
// Vanilla materials only, per design decision — no invented items besides
// the bag containers themselves.
//
// Was completely non-functional (silent no-op on right-click) until the
// same fix wave_spawner.js needed for the Wave Horn was applied here too:
//
// - `event.level.isClientSide` throws a NullPointerException just by being
//   accessed, in any context (confirmed during Wave Horn debugging) — that
//   was the very first line of openBag(), so every right-click crashed
//   before reaching shrink()/give(). Removed entirely.
// - Registered ItemEvents.rightClicked only. On Superflat (this pack's
//   test terrain) right-clicking almost always targets the ground block,
//   and BlockEvents.rightClicked needed to be registered too for the Wave
//   Horn to reliably fire. Added the matching BlockEvents.rightClicked
//   handler here, with the same 20-tick cooldown dedup wave_spawner.js
//   uses (both events firing for one physical click would otherwise
//   consume two bags and roll rewards twice).
// - Switched const/let to var/function throughout, matching
//   wave_spawner.js's confirmed-safe pattern for these callback types.

function weightedRoll(pool) {
  var totalWeight = 0
  for (var i = 0; i < pool.length; i++) totalWeight += pool[i].weight
  var roll = Math.random() * totalWeight
  for (var j = 0; j < pool.length; j++) {
    roll -= pool[j].weight
    if (roll <= 0) return pool[j]
  }
  return pool[pool.length - 1]
}

function randomCount(entry) {
  return entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1))
}

// Deliberate quality gradient across the three tiers, not just separate
// unrelated pools: Common is early-game combat/crafting scrap plus basic
// building/food staples (base-building and survival needs come first),
// Uncommon is solid bulk materials plus a small chance at Common's
// ceiling items (diamond, ender pearl), Rare is iconic top-of-the-game
// vanilla loot (totem, enchanted golden apple, netherite) that a player
// wouldn't normally see this early. Each tier's weakest items overlap
// with the tier below's strongest, so the jump feels earned rather than
// random.
var SCAVENGERS_BAG_POOL = [
  { item: 'minecraft:cobblestone', weight: 30, min: 8, max: 16 },
  { item: 'minecraft:oak_log', weight: 40, min: 4, max: 8 },
  { item: 'minecraft:bread', weight: 25, min: 3, max: 6 },
  { item: 'minecraft:iron_nugget', weight: 30, min: 2, max: 4 },
  { item: 'minecraft:coal', weight: 25, min: 2, max: 5 },
  { item: 'minecraft:string', weight: 20, min: 2, max: 4 },
  { item: 'minecraft:bone', weight: 20, min: 2, max: 4 },
  { item: 'minecraft:cooked_beef', weight: 18, min: 2, max: 4 },
  { item: 'minecraft:apple', weight: 18, min: 2, max: 4 },
  { item: 'minecraft:redstone', weight: 15, min: 2, max: 4 },
  { item: 'minecraft:gunpowder', weight: 15, min: 1, max: 3 },
  { item: 'minecraft:leather', weight: 15, min: 2, max: 3 },
  { item: 'minecraft:copper_ingot', weight: 15, min: 2, max: 4 },
  { item: 'minecraft:iron_ingot', weight: 10, min: 1, max: 2 },
  { item: 'minecraft:lapis_lazuli', weight: 10, min: 2, max: 4 },
]

var FORTIFIED_CACHE_POOL = [
  { item: 'minecraft:iron_ingot', weight: 25, min: 3, max: 6 },
  { item: 'minecraft:quartz', weight: 20, min: 3, max: 5 },
  { item: 'minecraft:gold_ingot', weight: 15, min: 2, max: 4 },
  { item: 'minecraft:redstone_block', weight: 15, min: 1, max: 2 },
  { item: 'minecraft:obsidian', weight: 15, min: 2, max: 4 },
  { item: 'minecraft:lapis_block', weight: 15, min: 1, max: 2 },
  { item: 'minecraft:iron_block', weight: 10, min: 1, max: 1 },
  { item: 'minecraft:tnt', weight: 10, min: 1, max: 2 },
  { item: 'minecraft:ender_pearl', weight: 8, min: 1, max: 2 },
  { item: 'minecraft:diamond', weight: 5, min: 1, max: 1 },
]

var WARLORDS_HOARD_POOL = [
  { item: 'minecraft:diamond', weight: 30, min: 1, max: 3 },
  { item: 'minecraft:emerald', weight: 20, min: 2, max: 4 },
  { item: 'minecraft:gold_block', weight: 20, min: 1, max: 2 },
  { item: 'minecraft:netherite_scrap', weight: 15, min: 1, max: 1 },
  { item: 'minecraft:diamond_block', weight: 10, min: 1, max: 1 },
  { item: 'minecraft:netherite_ingot', weight: 6, min: 1, max: 1 },
  { item: 'minecraft:nether_star', weight: 5, min: 1, max: 1 },
  { item: 'minecraft:totem_of_undying', weight: 4, min: 1, max: 1 },
  { item: 'minecraft:enchanted_golden_apple', weight: 2, min: 1, max: 1 },
]

var BAGS = {
  'kubejs:scavengers_bag': { pool: SCAVENGERS_BAG_POOL, rolls: 3 },
  'kubejs:fortified_cache': { pool: FORTIFIED_CACHE_POOL, rolls: 3 },
  'kubejs:warlords_hoard': { pool: WARLORDS_HOARD_POOL, rolls: 4 },
}

function useLootBag(event, itemId) {
  var bag = BAGS[itemId]
  if (!bag) return

  var player = event.entity
  var level = player.getLevel()
  var data = player.persistentData

  // Same 20-tick dedup pattern as wave_spawner.js's useWaveHorn — both
  // ItemEvents.rightClicked and BlockEvents.rightClicked fire for one
  // physical click. Keyed per item ID so opening a different bag right
  // after doesn't get wrongly blocked by the previous bag's cooldown.
  var key = 'td_lastBagOpenTick_' + itemId
  var currentTick = level.getTime()
  var lastTick = data.getInt(key)
  if (currentTick - lastTick < 20) return
  data.putInt(key, currentTick)

  event.item.shrink(1)
  for (var i = 0; i < bag.rolls; i++) {
    var entry = weightedRoll(bag.pool)
    player.give(Item.of(entry.item, randomCount(entry)))
  }
}

ItemEvents.rightClicked('kubejs:scavengers_bag', function (event) {
  useLootBag(event, 'kubejs:scavengers_bag')
})
ItemEvents.rightClicked('kubejs:fortified_cache', function (event) {
  useLootBag(event, 'kubejs:fortified_cache')
})
ItemEvents.rightClicked('kubejs:warlords_hoard', function (event) {
  useLootBag(event, 'kubejs:warlords_hoard')
})

BlockEvents.rightClicked(function (event) {
  useLootBag(event, event.item.getId())
})
