// Structure loot tiers, applied to every chest-type loot roll.
//
// Rolls from a plain-tier table (PLAIN_TIER_TABLES and PLAIN_TIER_NAMESPACES
// below) lose their premium items and may gain cobblestone. Any other roll
// made at a Lootr block keeps its own loot and adds a chance of cobblestone,
// rolls from the pool for its distance band (NEAR, MID, HIGH) and a
// PRIZE_CHANCE roll from PRIZE_POOL. Lootr rolls once per player, so each
// player's first open gets its own bonus. Distance is measured from the
// pedestal (worldData() in world_state.js), in the same bands as
// structure_guard_tiers.js.
//
// Lootr rolls with the same chest context as a vanilla container, so the block
// at the roll's origin is what tells them apart; plain containers and airdrop
// crates never get the bonus. Nor do Lootr chest minecarts: their origin is
// the cart, above a rail.
var MID_TIER_RADIUS = 210 // blocks from the pedestal; MID beyond this
var HIGH_TIER_RADIUS = 270 // HIGH beyond this

// Gold ingots, quartz and obsidian aren't in the basic scav_hardware table,
// so Lootr containers and Rare loot bags are their main source.
var NEAR_TIER_POOL = [
  { item: 'minecraft:iron_ingot', weight: 25, min: 3, max: 6 },
  { item: 'minecraft:gold_ingot', weight: 15, min: 2, max: 4 },
  { item: 'minecraft:redstone', weight: 14, min: 6, max: 12 },
  { item: 'minecraft:gunpowder', weight: 14, min: 4, max: 8 },
  { item: 'minecraft:copper_ingot', weight: 10, min: 4, max: 8 },
  { item: 'minecraft:clay_ball', weight: 8, min: 4, max: 8 },
  { item: 'minecraft:quartz', weight: 8, min: 3, max: 6 },
  { item: 'minecraft:obsidian', weight: 6, min: 2, max: 4 },
]

var MID_TIER_POOL = [
  { item: 'minecraft:iron_ingot', weight: 25, min: 3, max: 6 },
  { item: 'minecraft:gold_ingot', weight: 18, min: 2, max: 4 },
  { item: 'minecraft:redstone_block', weight: 14, min: 1, max: 2 },
  { item: 'minecraft:gunpowder', weight: 14, min: 4, max: 8 },
  { item: 'minecraft:copper_block', weight: 10, min: 1, max: 2 },
  { item: 'minecraft:quartz', weight: 10, min: 3, max: 6 },
  { item: 'minecraft:clay_ball', weight: 8, min: 4, max: 8 },
  { item: 'minecraft:obsidian', weight: 6, min: 2, max: 4 },
  { item: 'minecraft:iron_block', weight: 6, min: 1, max: 1 },
  { item: 'minecraft:emerald', weight: 4, min: 1, max: 2 },
  { item: 'minecraft:lapis_block', weight: 3, min: 1, max: 2 },
]

// Obsidian and quartz are in HIGH too: the NEAR and MID pools don't apply past
// HIGH_TIER_RADIUS, and scav_hardware doesn't carry them.
var HIGH_TIER_POOL = [
  { item: 'minecraft:diamond', weight: 20, min: 1, max: 2 },
  { item: 'minecraft:ender_pearl', weight: 14, min: 2, max: 4 },
  { item: 'minecraft:gold_block', weight: 12, min: 1, max: 2 },
  { item: 'minecraft:obsidian', weight: 6, min: 3, max: 6 },
  { item: 'minecraft:quartz', weight: 5, min: 4, max: 8 },
  { item: 'minecraft:emerald', weight: 8, min: 2, max: 4 },
  { item: 'minecraft:blaze_powder', weight: 8, min: 2, max: 4 },
  { item: 'minecraft:netherite_scrap', weight: 8, min: 1, max: 1 },
  { item: 'minecraft:magma_block', weight: 5, min: 2, max: 4 },
  { item: 'minecraft:diamond_block', weight: 5, min: 1, max: 1 },
  // Rarer than diamond_block; no loot bag carries it.
  { item: 'minecraft:netherite_upgrade_smithing_template', weight: 4, min: 1, max: 1 },
]

// PRIZE: one PRIZE_CHANCE roll per Lootr open at any distance, for a gun or a
// treasure item. Golden carrots heal the pedestal (pedestal_health.js). Every
// TaCZ gun is the one item tacz:modern_kinetic_gun; its nbt picks the gun and
// a fire mode it has.
var PRIZE_GUN = 'tacz:modern_kinetic_gun'
var PRIZE_POOL = [
  { item: 'minecraft:diamond', weight: 14, min: 1, max: 2 },
  { item: 'minecraft:ender_pearl', weight: 12, min: 1, max: 3 },
  { item: 'minecraft:golden_apple', weight: 10, min: 1, max: 1 },
  { item: 'minecraft:experience_bottle', weight: 10, min: 4, max: 8 },
  { item: 'minecraft:golden_carrot', weight: 6, min: 2, max: 4 },
  { item: 'minecraft:emerald', weight: 6, min: 2, max: 4 },
  { item: PRIZE_GUN, nbt: '{GunId:"tacz:glock_17",GunFireMode:"SEMI"}', weight: 8, min: 1, max: 1 },
  { item: PRIZE_GUN, nbt: '{GunId:"tacz:rhino357",GunFireMode:"SEMI"}', weight: 6, min: 1, max: 1 },
  { item: PRIZE_GUN, nbt: '{GunId:"tacz:m870",GunFireMode:"SEMI"}', weight: 6, min: 1, max: 1 },
  { item: PRIZE_GUN, nbt: '{GunId:"tacz:db_short",GunFireMode:"SEMI"}', weight: 4, min: 1, max: 1 },
  { item: PRIZE_GUN, nbt: '{GunId:"tacz:hk_mp5a5",GunFireMode:"AUTO"}', weight: 4, min: 1, max: 1 },
  { item: PRIZE_GUN, nbt: '{GunId:"tacz:sks_tactical",GunFireMode:"SEMI"}', weight: 2, min: 1, max: 1 },
  { item: PRIZE_GUN, nbt: '{GunId:"tacz:kar98",GunFireMode:"SEMI"}', weight: 2, min: 1, max: 1 },
  { item: 'supplementaries:bomb', weight: 6, min: 2, max: 4 },
]

// Each Lootr open gets one tier roll plus this chance of a second.
var SECOND_ROLL_CHANCE_NEAR = 0
var SECOND_ROLL_CHANCE_MID = 0.4
var SECOND_ROLL_CHANCE_HIGH = 0.5
var PRIZE_CHANCE = 0.5

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

// Plain-tier tables. Keep in sync with loot_table_blacklist and
// loot_modid_blacklist in pack/config/lootr-common.toml, which stop Lootr
// converting these containers; Lootr's config can't be read from here. A roll
// from one of these tables:
//   - loses PLAIN_TIER_STRIP. Some of these tables aren't overridden by the
//     pack and still roll premium items (the igloo chest always holds a
//     golden apple).
//   - never gets the Lootr bonus, even at a Lootr block. Lootr never converts
//     a block back, so older saves can have Lootr blocks with these tables.
// Matched by table id rather than "block isn't Lootr" because airdrop crates
// aren't Lootr blocks either, and their premium loot has to stay.
var PLAIN_TIER_TABLES = [
  'berezka_api:chests/store',
  'berezka_api:chests/simple_chest',
  'berezka_api:chests/simple_chest2',
  'berezka_api:chests/empty_chest',
  'berezka_api:chests/berezkahousesmall_0',
  'berezka_api:chests/farm',
  'berezka_api:chests/diningroom',
  'minecraft:chests/houseloot',
  'minecraft:chests/village/village_butcher',
  'minecraft:chests/village/village_fisher',
  'minecraft:chests/village/village_tannery',
  'minecraft:chests/village/village_shepherd',
  'minecraft:chests/village/village_mason',
  'minecraft:chests/village/village_cartographer',
  'minecraft:chests/igloo_chest',
  'philipsruins:chest/level_three_ruins_loot',
  'philipsruins:chest/ancient_ruins_loot',
  'philipsruins:chest/ancient_ruins',
  'philipsruins:chest/ruin_loot',
  'philipsruins:chest/level_one_ruins_loot',
  'philipsruins:chest/ruin_loot_value',
  'philipsruins:chest/badlands_dungeon_loot_low',
  'philipsruins:chest/nether_ruins_low',
  'u_desert:desert_ruin/junk',
  'u_desert:pillager_outpost/supply',
  'kubejs:chests/scavenge_storage',
  // Nolando StructureZ: common and uncommon chests are plain, rare_loot stays
  // Lootr. All three roll kubejs:chests/scavenge_storage
  // (data/nolandostructurez/loot_tables).
  'nolandostructurez:chests/common_loot',
  'nolandostructurez:chests/uncommon_loot',
]
var PLAIN_TIER_NAMESPACES = ['postapocalypse_structures']
var PLAIN_TIER_STRIP = [
  'minecraft:diamond',
  'minecraft:emerald',
  'minecraft:ender_pearl',
  'minecraft:golden_apple',
  'minecraft:enchanted_golden_apple',
]

function slpIsPlainTierTable(tableId) {
  if (PLAIN_TIER_TABLES.indexOf(tableId) !== -1) return true
  return PLAIN_TIER_NAMESPACES.indexOf(tableId.split(':')[0]) !== -1
}

// Int getBlock overload and a template-string id: Rhino can pick the wrong
// getBlock overload otherwise, and the id must be a JS string, not a Java one.
function slpIsLootrContainer(level, pos) {
  var block = level.getBlock(pos.getX(), pos.getY(), pos.getZ())
  if (!block) return false
  return `${block.getId()}`.indexOf('lootr:') === 0
}

// Extra cobblestone for walls: plain-tier rolls get the bigger, likelier roll,
// Lootr bonus rolls a smaller one.
var PLAIN_COBBLE_CHANCE = 0.6
var PLAIN_COBBLE_COUNT = { min: 8, max: 20 }
var LOOTR_COBBLE_CHANCE = 0.3
var LOOTR_COBBLE_COUNT = { min: 4, max: 12 }

LootJS.modifiers((event) => {
  event.addLootTypeModifier('chest').apply((context) => {
    if (slpIsPlainTierTable(`${context.getLootTableId()}`)) {
      context.removeLoot(PLAIN_TIER_STRIP)
      if (Math.random() < PLAIN_COBBLE_CHANCE) context.addLoot(Item.of('minecraft:cobblestone', randomCount(PLAIN_COBBLE_COUNT)))
      return
    }
    var pos = context.getBlockPos()
    if (!pos) return
    var level = context.getLevel()
    if (!level || !slpIsLootrContainer(level, pos)) return
    if (Math.random() < LOOTR_COBBLE_CHANCE) context.addLoot(Item.of('minecraft:cobblestone', randomCount(LOOTR_COBBLE_COUNT)))

    var pool = NEAR_TIER_POOL
    var secondRollChance = SECOND_ROLL_CHANCE_NEAR
    var base = worldData(level)
    if (base && base.contains('td_pedestalX')) {
      var dx = pos.getX() - base.getInt('td_pedestalX')
      var dz = pos.getZ() - base.getInt('td_pedestalZ')
      var dist = Math.sqrt(dx * dx + dz * dz)
      if (dist > HIGH_TIER_RADIUS) {
        pool = HIGH_TIER_POOL
        secondRollChance = SECOND_ROLL_CHANCE_HIGH
      } else if (dist > MID_TIER_RADIUS) {
        pool = MID_TIER_POOL
        secondRollChance = SECOND_ROLL_CHANCE_MID
      }
    }

    var rolls = 1 + (Math.random() < secondRollChance ? 1 : 0)
    for (var i = 0; i < rolls; i++) {
      var entry = weightedRoll(pool)
      context.addLoot(Item.of(entry.item, randomCount(entry)))
    }
    if (Math.random() < PRIZE_CHANCE) {
      var prize = weightedRoll(PRIZE_POOL)
      context.addLoot(prize.nbt ? Item.of(prize.item, randomCount(prize), prize.nbt) : Item.of(prize.item, randomCount(prize)))
    }
  })
})
