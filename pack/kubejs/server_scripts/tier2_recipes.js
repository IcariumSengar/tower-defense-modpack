// Tier 2 machine re-recipes - Magnetic Chest (now Vacuum Blocks, see
// below) and Arrow Turret (Medieval Defense Turrets, installed for this
// tier) ship with plain Common-tier recipes (cobblestone/iron_ingot/
// loose redstone). docs/FEATURES.md's Tier 2 spec calls for these to
// pull from the next loot tier up instead - redstone_block, quartz and
// iron_block are all real items from that pool (BountyBags' Rare tier
// pool - see data/bountybags/loot_tables/items/rare.json), so swapping
// each recipe's structural filler (cobblestone) and core component
// (redstone dust/iron ingot) for those is a real tier gate, not just
// flavor.
//
// **Fire Trap (Igniter) and Fan cut entirely, 2026-09-08** - part of
// dropping Trapcraft. No standalone mod found with a real Forge 1.20.1
// build that fills either role; both were thin content anyway (one
// item-task quest each, no deeper mechanic built on top), and Tier 2's
// real automated-defense identity is already Medieval Defense Turrets.
// Their re-recipes (and FTB Quests entries) are removed, not replaced.
//
// **Magnetic Chest dropped for Vacuum Blocks (`vacuum_cleaner`
// modid), 2026-09-08** - real, functioning replacement, verified by
// decompiling its actual tick procedure (genuine ItemEntity/AABB
// scanning code exists, confirmed not just marketing text - a real
// candidate first tried, Smart Storage, was ruled out this same session
// after decompiling it turned up NO item-collection logic anywhere in
// the jar, despite its store page claiming one). **Real, honest
// mechanic difference from the old Magnetic Chest, not glossed over**:
// this pulls items from directly in front of it and deposits into a
// container it's connected to (a hopper feeding a chest works) - a
// directional pull requiring a small rig, not the old single-block
// omnidirectional 10-block radius. Tier 1 of its 5 tiers used here;
// its own stock recipe already includes a hopper as a core ingredient
// (confirmed from the jar's own recipe JSON), kept as the functional
// core below, filler swapped to the Tier 2 loot pool same as everything
// else in this file.
ServerEvents.recipes((event) => {
  event.remove({ output: 'vacuum_cleaner:vacuum_block_tier_1' })
  event.shaped('vacuum_cleaner:vacuum_block_tier_1', [
    'QQQ',
    'QHQ',
    'QIQ',
  ], {
    Q: 'minecraft:quartz',
    H: 'minecraft:hopper',
    I: 'minecraft:iron_block',
  })

  event.remove({ output: 'medievalturrets:bow_turret_item' })
  event.shaped('medievalturrets:bow_turret_item', [
    '0PI',
    ' PI',
  ], {
    0: 'minecraft:bow',
    P: '#minecraft:planks',
    I: 'minecraft:iron_block',
  })
})
