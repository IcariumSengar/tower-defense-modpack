// Right-click-to-open logic for the three loot bag tiers. Each bag rolls a
// few weighted item stacks from its own pool and gives them to the player.
// Vanilla materials only, per design decision — no invented items besides
// the bag containers themselves.

function weightedRoll(pool) {
  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = Math.random() * totalWeight
  for (const entry of pool) {
    roll -= entry.weight
    if (roll <= 0) return entry
  }
  return pool[pool.length - 1]
}

function randomCount(entry) {
  return entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1))
}

function openBag(event, pool, rolls) {
  if (event.level.isClientSide) return

  event.item.shrink(1)
  for (let i = 0; i < rolls; i++) {
    const entry = weightedRoll(pool)
    event.player.give(Item.of(entry.item, randomCount(entry)))
  }
  event.success()
}

const SCAVENGERS_BAG_POOL = [
  { item: 'minecraft:iron_nugget', weight: 30, min: 2, max: 4 },
  { item: 'minecraft:coal', weight: 25, min: 2, max: 5 },
  { item: 'minecraft:string', weight: 20, min: 2, max: 4 },
  { item: 'minecraft:bone', weight: 20, min: 2, max: 4 },
  { item: 'minecraft:redstone', weight: 15, min: 2, max: 4 },
  { item: 'minecraft:gunpowder', weight: 15, min: 1, max: 3 },
  { item: 'minecraft:iron_ingot', weight: 10, min: 1, max: 2 },
]

const FORTIFIED_CACHE_POOL = [
  { item: 'minecraft:iron_ingot', weight: 25, min: 3, max: 6 },
  { item: 'minecraft:quartz', weight: 20, min: 3, max: 5 },
  { item: 'minecraft:gold_ingot', weight: 15, min: 2, max: 4 },
  { item: 'minecraft:redstone_block', weight: 15, min: 1, max: 2 },
  { item: 'minecraft:obsidian', weight: 15, min: 2, max: 4 },
  { item: 'minecraft:tnt', weight: 10, min: 1, max: 2 },
  { item: 'minecraft:diamond', weight: 5, min: 1, max: 1 },
]

const WARLORDS_HOARD_POOL = [
  { item: 'minecraft:diamond', weight: 30, min: 1, max: 3 },
  { item: 'minecraft:emerald', weight: 20, min: 2, max: 4 },
  { item: 'minecraft:gold_block', weight: 20, min: 1, max: 2 },
  { item: 'minecraft:netherite_scrap', weight: 15, min: 1, max: 1 },
  { item: 'minecraft:diamond_block', weight: 10, min: 1, max: 1 },
  { item: 'minecraft:nether_star', weight: 5, min: 1, max: 1 },
]

ItemEvents.rightClicked('kubejs:scavengers_bag', (event) => openBag(event, SCAVENGERS_BAG_POOL, 3))
ItemEvents.rightClicked('kubejs:fortified_cache', (event) => openBag(event, FORTIFIED_CACHE_POOL, 3))
ItemEvents.rightClicked('kubejs:warlords_hoard', (event) => openBag(event, WARLORDS_HOARD_POOL, 4))
