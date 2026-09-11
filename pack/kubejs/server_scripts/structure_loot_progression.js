// Loot-tier-by-progression for structure/dungeon chests (2026-09-03,
// direct request: "loot in structures feeling appropriately high-tier
// the further out/later it's found" - the piece held during the
// exploration-pacing retune pending the Treasure2 decision, now
// unblocked). Layers a bonus pool on top of whatever a chest already
// rolls, gated by real distance from the base at loot-roll time -
// additive, not replacing.
//
// Targets the CHEST loot context TYPE (LootJS.core.LootContextType),
// not specific loot table IDs. **Corrected 2026-09-11**: the reason
// originally given here ("the_lost_city ships ZERO chest loot tables")
// was wrong - a real census of the mod's NBT files shows its 1,487
// tagged containers point at `berezka_api:chests/*` tables (store,
// simple_chest, empty_chest, ...) that ship inside the Berezka API jar.
// Those are now overridden pack-side (data/berezka_api/loot_tables/
// chests/*.json, see docs/FEATURES.md's "Structure loot pass"), so
// table-ID targeting would have been possible after all - but the
// type-level rule is still the right shape: it also covers Abandoned
// Urban's plain vanilla tables (village/dungeon/stronghold/shipwreck,
// shared with real vanilla structures), Philip's Ruins' 17 own tables,
// Unnamed Desert's 4, Watchtowers' 2, postapocalypse_structures' 3, and
// every empty barrel structure_chest_loot_fix.js tags, without listing
// any of them.
//
// Distance is measured from the REAL base, read live from the permanent
// td_pedestal_target marker's own persistentData (world_state.js's
// worldData()) - **real bug fixed 2026-09-09**: this file still carried a
// hardcoded SPAWN_X/SPAWN_Z of (1171, -499), a coordinate verified
// against one specific seed on 2026-09-06 and stale ever since the spawn
// became a runtime search that same day; both fresh worlds this morning
// put the base 2,200 and 3,700 blocks away from it, so every chest in
// the world was being tiered against a point nobody was near.
//
// Radii shifted +150 (60/120 -> 210/270) the same day: the anchor-grid
// base placement (playtest_starter_kit.js) now guarantees no structure
// set has a placement chunk within 9 chunks (~150 blocks) of the base,
// so the old 60/120 bands would have made every reachable chest
// top-tier from wave 1. The band WIDTHS are unchanged - "first 60
// blocks of structures are mid, everything past that high" is exactly
// what it was, just measured from where structures can actually start.
// (Shipped as +200 for a few hours while the floor was 12 chunks; the
// floor was cut to 9 on first-playtest feedback and this moved with it.)
var MID_TIER_RADIUS = 210
var HIGH_TIER_RADIUS = 270

// **Pools retuned 2026-09-11 (structure loot pass, direct ask: chests and
// barrels in structures should carry "the desired materials that would
// make the player feel like they can come back to base with a good
// haul").** The old pools were gem-flavoured (lapis/gold/emerald) and
// didn't map onto what the tech tree actually consumes. Checked every
// live recipe chain first (Tier 2 SecurityCraft traps, Simple Guns ammo,
// Generator Galore's ladder, Flux Networks, Sophisticated stack upgrades,
// IE's coke oven/blast furnace) - the real sinks are iron, redstone,
// gunpowder, copper, gold, quartz, clay (coke bricks) and, for the whole
// Flux Networks chain, blaze powder (Flux Core = obsidian + flux dust +
// EYE OF ENDER, and nothing in this world drops blaze rods - no Nether
// route is mentioned anywhere in the quest book). Mid keeps the
// "next step up" feel (blocks, not dust); high is where the genuinely
// unobtainable-at-home things live: blaze powder, magma blocks (9 build
// one IE Blast Furnace - the only steel route), netherite scrap, the
// smithing template.
var MID_TIER_POOL = [
  { item: 'minecraft:iron_ingot', weight: 25, min: 3, max: 6 },
  { item: 'minecraft:gold_ingot', weight: 18, min: 2, max: 4 },
  { item: 'minecraft:redstone_block', weight: 14, min: 1, max: 2 },
  { item: 'minecraft:gunpowder', weight: 14, min: 4, max: 8 },
  { item: 'minecraft:copper_block', weight: 10, min: 1, max: 2 },
  { item: 'minecraft:quartz', weight: 10, min: 3, max: 6 },
  { item: 'minecraft:lapis_block', weight: 8, min: 1, max: 2 },
  { item: 'minecraft:emerald', weight: 8, min: 1, max: 2 },
  { item: 'minecraft:clay_ball', weight: 8, min: 4, max: 8 },
  { item: 'minecraft:iron_block', weight: 6, min: 1, max: 1 },
]

var HIGH_TIER_POOL = [
  { item: 'minecraft:diamond', weight: 20, min: 1, max: 2 },
  { item: 'minecraft:emerald', weight: 16, min: 2, max: 4 },
  { item: 'minecraft:gold_block', weight: 12, min: 1, max: 2 },
  { item: 'minecraft:ender_pearl', weight: 12, min: 2, max: 4 },
  { item: 'minecraft:blaze_powder', weight: 12, min: 2, max: 4 },
  { item: 'minecraft:magma_block', weight: 8, min: 2, max: 4 },
  { item: 'minecraft:netherite_scrap', weight: 8, min: 1, max: 1 },
  { item: 'minecraft:diamond_block', weight: 5, min: 1, max: 1 },
  // 2026-09-08, direct ask: a rare structure-chest find, not a bag
  // reward. Weight 4, deliberately rarer than diamond_block's 5 -
  // "you'll find it if you are lucky in a structure."
  { item: 'minecraft:netherite_upgrade_smithing_template', weight: 4, min: 1, max: 1 },
]

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

// One guaranteed premium roll plus a chance of a second (was a flat 2 every
// time). Changed 2026-09-11 alongside the pass above: the base tables and
// the empty-barrel fix now put real materials in every container, and a
// Lost City block holds hundreds of them, so two guaranteed premium rolls
// per container on top would have turned a far city into a diamond mine.
var SECOND_ROLL_CHANCE_MID = 0.4
var SECOND_ROLL_CHANCE_HIGH = 0.5

LootJS.modifiers((event) => {
  event.addLootTypeModifier('chest').apply((context) => {
    var pos = context.getBlockPos()
    if (!pos) return
    var base = worldData(context.getLevel())
    if (!base || !base.contains('td_pedestalX')) return
    var dx = pos.getX() - base.getInt('td_pedestalX')
    var dz = pos.getZ() - base.getInt('td_pedestalZ')
    var dist = Math.sqrt(dx * dx + dz * dz)

    var pool = null
    var secondRollChance = 0
    if (dist > HIGH_TIER_RADIUS) {
      pool = HIGH_TIER_POOL
      secondRollChance = SECOND_ROLL_CHANCE_HIGH
    } else if (dist > MID_TIER_RADIUS) {
      pool = MID_TIER_POOL
      secondRollChance = SECOND_ROLL_CHANCE_MID
    }
    if (!pool) return

    var rolls = 1 + (Math.random() < secondRollChance ? 1 : 0)
    for (var i = 0; i < rolls; i++) {
      var entry = weightedRoll(pool)
      context.addLoot(Item.of(entry.item, randomCount(entry)))
    }
  })
})
