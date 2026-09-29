// Lootr bonus layer for structure containers (2026-09-03, rebuilt
// 2026-09-27). Layers bonus rolls on top of whatever a container's own loot
// table rolls - additive, not replacing - but ONLY for Lootr containers.
//
// **2026-09-27 tiering pass** (direct ask: "regular barrels etc should
// have basic loot in them, but the lootr chests should feel more
// lucrative. I also think there are too many lootr chests/barrels in
// general"). Measured first, from the two real saves (Manna, the dedicated
// server world) and the running jars:
//   - ~76% of the storage a player met was Lootr (Manna: 3,591 Lootr vs
//     ~1,300 plain). Two thirds of that came from the four post-apoc houses
//     (a red_house is 30 loot barrels, the houses spawn every 6 chunks).
//   - This layer used to fire on EVERY chest roll, so past 270 blocks it
//     was 58-87% of every container's value and every container - empty-
//     barrel fills included - carried a diamond/Nether-tier item. Lootr
//     beat a plain barrel by only 1.1-1.5x.
// The count is now cut by pack/config/lootr-common.toml (household/filler
// tables and the post-apoc houses stay plain vanilla containers, ~85%
// fewer Lootr), the plain tables were rebased to basic scavenging (no
// treasure, no guns), and this layer only pays out when the block at the
// roll's position is a Lootr block. Full entry: docs/FEATURES.md
// "Structure loot tiering".
//
// Why a block check and not the loot table id: Lootr rolls with the same
// CHEST context as a vanilla container (ORIGIN = the container's centre,
// verified in LootrChestBlockEntity/LootrBarrelBlockEntity.unpackLootTable),
// so the context type can't tell them apart - but the block at ORIGIN can
// (lootr:lootr_chest / lootr_barrel / lootr_trapped_chest / lootr_shulker /
// lootr_inventory). Checking the block keeps "Lootr = lucrative" true for
// every table, including the vanilla/Philip's Ruins/u_desert ones the pack
// doesn't override. It also leaves the airdrop crate (dyairdrop block) and
// every plain barrel alone. Lootr rolls once PER PLAYER, so each player's
// first open gets its own bonus. Not covered: Lootr chest minecarts
// (ORIGIN is the cart, the block there is a rail) - mineshafts are rare
// here.
//
// Distance is measured from the REAL base, read live from the permanent
// td_pedestal_target marker's persistentData (world_state.js's worldData())
// - **bug fixed 2026-09-09**: this file once carried a hardcoded spawn
// coordinate that went stale when the base became a runtime search.
// Radii are +150 on the original 60/120 because the anchor-grid base
// placement keeps every structure set ~150 blocks from the base.
var MID_TIER_RADIUS = 210
var HIGH_TIER_RADIUS = 270

// NEAR (2026-09-27): Lootr containers inside 210 blocks used to get nothing
// extra, which is part of why a near Lootr chest read the same as a barrel.
// A lighter take on MID - stacks of the materials the tech tree eats
// (iron, gold, redstone, gunpowder, copper, quartz, obsidian, clay). Gold
// ingots, quartz and obsidian left the pack's basic scav_hardware table in
// the same pass, so Lootr containers and Rare bags are their main source.
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

// MID/HIGH were retuned 2026-09-11 against the live recipe chains (Tier 2
// SecurityCraft traps, Simple Guns ammo, Generator Galore, Flux Networks,
// Sophisticated stack upgrades, IE). 2026-09-27: weight moved off the items
// whose sinks dried up since - emerald (only the Emerald Generator and
// villagers), lapis blocks (only the Construction Core), blaze powder and
// magma blocks (the Tier 3 re-recipes took them off the quest path; they
// still feed omtreborn's fire-rate upgrade / incendiary turret and IE's
// blast bricks, so they stay, rarer) - onto obsidian and ender pearls
// (every Flux Plug/Point needs a Flux Core).
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

// Obsidian and quartz are here too (review follow-up, same day): once they
// left the basic scav_hardware table, nothing past 270 blocks dropped them,
// and obsidian can't be made in this world (no water) yet gates every Flux
// Core.
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
  // 2026-09-08, direct ask: a rare structure-chest find, not a bag
  // reward - "you'll find it if you are lucky in a structure." Now a
  // Lootr-only find, deliberately rarer than diamond_block.
  { item: 'minecraft:netherite_upgrade_smithing_template', weight: 4, min: 1, max: 1 },
]

// PRIZE (2026-09-27): a separate PRIZE_CHANCE roll on every Lootr open, any
// distance - the "found something good" moment. Treasure or a gun. Guns and
// golden apples left the plain tables in this pass (scav_armory now only
// feeds the Lootr-kept military tables, scav_food lost its golden apple,
// scav_treasure was retired), so this and the airdrop are where they come
// from outside bags. Golden carrots heal the pedestal 10%.
var PRIZE_POOL = [
  { item: 'minecraft:diamond', weight: 14, min: 1, max: 2 },
  { item: 'minecraft:ender_pearl', weight: 12, min: 1, max: 3 },
  { item: 'minecraft:golden_apple', weight: 10, min: 1, max: 1 },
  { item: 'minecraft:experience_bottle', weight: 10, min: 4, max: 8 },
  { item: 'minecraft:golden_carrot', weight: 6, min: 2, max: 4 },
  { item: 'minecraft:emerald', weight: 6, min: 2, max: 4 },
  { item: 'simple_guns_reworked:pistol', weight: 8, min: 1, max: 1 },
  { item: 'simple_guns_reworked:revolver', weight: 6, min: 1, max: 1 },
  { item: 'simple_guns_reworked:shotgun', weight: 6, min: 1, max: 1 },
  { item: 'simple_guns_reworked:double_barrel_shotgun', weight: 4, min: 1, max: 1 },
  { item: 'simple_guns_reworked:submachine_gun', weight: 4, min: 1, max: 1 },
  { item: 'simple_guns_reworked:dmr', weight: 2, min: 1, max: 1 },
  { item: 'simple_guns_reworked:sniper', weight: 2, min: 1, max: 1 },
  { item: 'simple_guns_reworked:grenade', weight: 6, min: 2, max: 4 },
]

// One guaranteed tier roll plus a chance of a second (the MID/HIGH chances
// are the 2026-09-11 values, unchanged - this pass removes the bonus from
// ~85% of containers rather than shrinking it per container).
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

// PLAIN TIER (review follow-up, same day). KEEP IN SYNC with
// pack/config/lootr-common.toml's loot_table_blacklist / loot_modid_blacklist
// - Lootr's config can't be read from here. Two jobs:
//   1. The mod/vanilla tables on that list that the pack doesn't override
//      still carried premium items into what are now plain, shared
//      containers - the igloo chest guarantees a golden apple and sits in
//      every Abandoned Urban fire tower; Philip's nether_ruins_low rolls
//      golden apples and diamonds, badlands_dungeon_loot_low ender pearls,
//      the village and Philip's junk tables emeralds (sandbox: 30/30 igloo
//      rolls had the apple). PLAIN_TIER_STRIP removes those from any roll of
//      a plain-tier table. The pack's own plain tables never roll them.
//   2. An older world keeps the Lootr blocks it converted before the
//      blacklist existed (Lootr never converts back). A plain-tier table
//      never earns the bonus, even from a legacy Lootr block - otherwise an
//      old post-apoc house would start paying NEAR rolls and guns.
// Table-id scoped on purpose, not "block isn't Lootr": the airdrop crate is
// a non-Lootr block too and carries diamond blocks, netherite and guns.
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
  // Nolando StructureZ (added 2026-09-29): common/uncommon chests are plain,
  // rare_loot stays Lootr. All three tables are overridden to roll
  // kubejs:chests/scavenge_storage (data/nolandostructurez/loot_tables).
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

// Same block-id idiom as lure_block.js (int overload + string coercion, so
// Rhino neither picks the wrong getBlock overload nor compares a Java
// string).
function slpIsLootrContainer(level, pos) {
  var block = level.getBlock(pos.getX(), pos.getY(), pos.getZ())
  if (!block) return false
  return `${block.getId()}`.indexOf('lootr:') === 0
}

// Extra cobblestone, 2026-09-29 (direct ask: "I think the loot table needs
// to add a little extra cobblestone. maybe more in the regular barrels and
// chests in the structures"). Walls and pillars eat it, and until now it only
// came from scav_building's cobblestone entry (14 of 119 weight). Plain
// containers get the bigger, likelier roll; Lootr ones a smaller one.
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
      context.addLoot(Item.of(prize.item, randomCount(prize)))
    }
  })
})
