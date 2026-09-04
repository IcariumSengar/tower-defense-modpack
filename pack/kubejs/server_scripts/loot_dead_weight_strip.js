// Loot-table dead-weight audit (2026-09-06, direct feedback: "there are
// a lot of loot items that I dont see ever being useful in the pack,
// like minecart rails or name tags"). Real source, not this pack's own
// design: this pack's own custom tables (all 4 BountyBags tiers, all 3
// postapocalypse_structures chest overrides, both
// structure_loot_progression.js bonus pools) are 100% deliberately-
// chosen items - the dead weight comes from Abandoned Urban's 34
// structures reusing stock vanilla loot tables wholesale, plus any
// genuine vanilla structure (strongholds, mineshafts, dungeons,
// shipwrecks - none of these were disabled, only desert pyramids were).
//
// Same `event.addLootTypeModifier('chest')` type-level targeting
// structure_loot_progression.js already uses for the additive
// distance-based bonus pools - covers every chest opened anywhere,
// custom or vanilla, without needing to individually override every
// table a structure mod might reuse.
//
// **Real syntax verified before shipping, not assumed from the
// block-loot-modifier form**: decompiled the installed LootJS jar
// (v2.13.1) directly. `LootContextJS` (the exact `context` object this
// pack's own `structure_loot_progression.js` already calls
// `context.addLoot(...)` on) has its own real, public
// `removeLoot(ItemFilter)` method - confirmed by javap, not guessed to
// match the block-loot-modifier form. `ItemFilter` itself is
// auto-converted from whatever's passed in
// (`LootJSPlugin.ofItemFilter`, decompiled): already an `ItemFilter` is
// used directly, anything else goes through the same `IngredientJS.of()`
// this pack already relies on elsewhere for plain KubeJS `Ingredient`
// syntax (item ids, tag references, arrays of either) - so a plain JS
// array of id/tag strings works exactly like it does everywhere else in
// this pack, no special ItemFilter construction needed.
//
// Music discs use the real `#minecraft:music_discs` tag (confirmed
// present in the vanilla 1.20.1 client jar's own data) instead of
// hand-listing every disc id - covers every vanilla disc (including the
// nested `#minecraft:creeper_drop_music_discs` discs) plus anything a
// mod tags into it later, not a guessed enumeration.
//
// Full confirmed strip list (AskUserQuestion): the whole minecart/rail
// family (no minecart transport anywhere in this pack), name tags (no
// taming/pet-naming system this pack emphasizes), horse gear (no
// mounted-travel design - worldborder is small, player is meant to be
// on foot defending a fixed base), vanilla maps (redundant now that
// Xaero's World Map is installed), leads, all music discs, and elytra
// (no End-city loot path this pack's structure set actually uses). NOT
// stripping raw crafting materials/food/combat gear/tools - even a
// "boring" vanilla item like string/gunpowder/leather has a real recipe
// use somewhere in this pack.
var DEAD_WEIGHT_ITEMS = [
  'minecraft:rail',
  'minecraft:powered_rail',
  'minecraft:detector_rail',
  'minecraft:activator_rail',
  'minecraft:minecart',
  'minecraft:chest_minecart',
  'minecraft:hopper_minecart',
  'minecraft:tnt_minecart',
  'minecraft:furnace_minecart',
  'minecraft:name_tag',
  'minecraft:saddle',
  'minecraft:iron_horse_armor',
  'minecraft:golden_horse_armor',
  'minecraft:diamond_horse_armor',
  'minecraft:leather_horse_armor',
  'minecraft:map',
  'minecraft:filled_map',
  'minecraft:lead',
  'minecraft:elytra',
  '#minecraft:music_discs',
]

LootJS.modifiers((event) => {
  event.addLootTypeModifier('chest').apply((context) => {
    context.removeLoot(DEAD_WEIGHT_ITEMS)
  })
})
