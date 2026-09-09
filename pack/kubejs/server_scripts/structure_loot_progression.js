// Loot-tier-by-progression for structure/dungeon chests (2026-09-03,
// direct request: "loot in structures feeling appropriately high-tier
// the further out/later it's found" - the piece held during the
// exploration-pacing retune pending the Treasure2 decision, now
// unblocked). Layers a bonus pool on top of whatever a chest already
// rolls, gated by real distance from the fixed spawn point at
// loot-roll time - additive, not replacing, same technique already
// proven on postapocalypse_structures' own chests.
//
// Targets the CHEST loot context TYPE (LootJS.core.LootContextType),
// not specific loot table IDs - real research found table-ID targeting
// wouldn't actually cover this pack's 3 remaining structure mods
// correctly:
//   - the_lost_city ships ZERO chest loot tables across all 205 of its
//     own structure NBTs (confirmed by decompiling every one directly,
//     not guessed) - nothing to target there by table ID.
//   - abandoned_urban's chests overwhelmingly reuse plain VANILLA
//     tables (village_butcher, stronghold_corridor, simple_dungeon,
//     shipwreck_treasure, etc. - confirmed the same way, 35 structures
//     scanned), not custom ones - targeting those specific table IDs
//     would also buff every real vanilla village/dungeon/stronghold/
//     shipwreck the world generates, not just abandoned_urban's own
//     buildings.
// A type-level "any chest opened this far from spawn gets better loot"
// rule sidesteps both problems, covers postapocalypse_structures' own
// tables too, and matches the actual design intent (loot gets better
// with exploration distance) more directly than an incomplete table
// allowlist would have.
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

var MID_TIER_POOL = [
  { item: 'minecraft:iron_ingot', weight: 25, min: 2, max: 4 },
  { item: 'minecraft:gold_ingot', weight: 20, min: 2, max: 3 },
  { item: 'minecraft:lapis_block', weight: 15, min: 1, max: 2 },
  { item: 'minecraft:redstone_block', weight: 15, min: 1, max: 2 },
  { item: 'minecraft:copper_block', weight: 10, min: 2, max: 4 },
  { item: 'minecraft:emerald', weight: 8, min: 1, max: 2 },
]

var HIGH_TIER_POOL = [
  { item: 'minecraft:diamond', weight: 20, min: 1, max: 2 },
  { item: 'minecraft:emerald', weight: 18, min: 2, max: 4 },
  { item: 'minecraft:gold_block', weight: 15, min: 1, max: 2 },
  { item: 'minecraft:netherite_scrap', weight: 10, min: 1, max: 1 },
  { item: 'minecraft:diamond_block', weight: 6, min: 1, max: 1 },
  { item: 'minecraft:ender_pearl', weight: 12, min: 2, max: 4 },
  // 2026-09-08, direct ask: a rare structure-chest find, not a bag
  // reward. Weight 4, deliberately rarer than diamond_block's 6 -
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

// 1-2 rolls, same "bonus on top, not a full extra pool" shape as
// postapocalypse_structures' own treasure-pool overrides.
var BONUS_ROLLS = 2

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
    if (dist > HIGH_TIER_RADIUS) {
      pool = HIGH_TIER_POOL
    } else if (dist > MID_TIER_RADIUS) {
      pool = MID_TIER_POOL
    }
    if (!pool) return

    for (var i = 0; i < BONUS_ROLLS; i++) {
      var entry = weightedRoll(pool)
      context.addLoot(Item.of(entry.item, randomCount(entry)))
    }
  })
})
