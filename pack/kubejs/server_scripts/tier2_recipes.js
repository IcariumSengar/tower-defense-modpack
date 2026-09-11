// Tier 2 machine re-recipes. docs/FEATURES.md's Tier 2 spec calls for
// these to pull from the next loot tier up - redstone_block, quartz and
// iron_block are all real items from that pool (BountyBags' Rare tier
// pool - see data/bountybags/loot_tables/items/rare.json), so swapping
// each recipe's structural filler (cobblestone) and core component
// (redstone dust/iron ingot) for those is a real tier gate, not just
// flavor.
//
// **Fire Trap (Igniter) and Fan cut entirely, 2026-09-08** - part of
// dropping Trapcraft. No standalone mod found with a real Forge 1.20.1
// build that fills either role; both were thin content anyway (one
// item-task quest each, no deeper mechanic built on top).
//
// **Magnetic Chest -> Vacuum Blocks -> Item Collectors, 2026-09-09.**
// Vacuum Blocks (`vacuum_cleaner` modid, added 2026-09-08) turned out to
// be dead code, not just fiddly - direct feedback ("I hate ... the
// vacuum chest thing") prompted a redecompile: every one of its 5 tiers'
// constructors chain straight into the `Block` superconstructor with no
// `.randomTicks()` call and no `isRandomlyTicking()` override, and its
// actual item-pull logic only ever runs from `randomTick()`. Per
// vanilla's own block-ticking rules, a block that never opts into random
// ticking never gets `randomTick()` called at all - the entire pull
// mechanic was unreachable in normal play on every tier, not a directional-
// only quirk. Can't be patched via KubeJS (`isRandomlyTicking()` is
// hardcoded Java), so replaced the mod outright with **Item Collectors**
// (CurseForge project 395620, file 5272968 - `itemcollectors-1.1.10-
// forge-mc1.20.jar`, real Forge 1.20.1 build confirmed from the file's
// own `versions` list, 53M+ downloads across all files, added via
// `packwiz curseforge add --addon-id 395620 --file-id 5272968`, which
// auto-resolved its 2 real dependencies - SuperMartijn642's Core Lib and
// Config Lib). Real, verified mechanic (`itemcollectors:basic_collector`,
// confirmed from the jar's own recipe/model JSON): sits on top of any
// block (a plain chest is enough, no hopper rig) and pulls loose items
// from a genuinely omnidirectional 5-block radius - directly answers the
// "vacuum chest thing"/no-rig/directional complaints. Basic tier only
// shipped here (Advanced tier adds a whitelist/blacklist filter - a real
// Tier 3 upgrade candidate, not built now). Its stock recipe (ender_pearl
// + 4x obsidian) is real and already vanilla-material, re-recipe below
// only swaps in the Tier 2 loot-pool filler convention.
//
// **Arrow Turret -> Musket Sentry -> Advanced Tower Defense removed
// entirely, 2026-09-11.** Direct feedback called the whole Turret
// Workbench chain "too convoluted" - real complexity, not a perception
// problem: a Blueprint item + a 6-slot hardcoded assemble step at a
// dedicated Workbench block, gated behind a separate `tech_tablet_
// mechanics`/Research-table unlock this pack had to build a front door
// for from scratch (neither the turret heads nor tech_tablet_mechanics
// shipped a real completable recipe - both were JEI-display-only dead
// JSON, confirmed by decompiling `TurretWorkbenchTurretsCraftRecipe.
// matches()`, hardcoded `return false`). Advanced Tower Defense
// uninstalled outright (`packwiz remove advanced-tower-defense`, no
// packwiz-tracked dependents), `turret_combat_feedback.js` deleted (it
// existed only for the two turret heads' firing effects), and the 3
// SecurityCraft modules previously injected into this chain
// (`redstone_module`/`smart_module`/`speed_module`) are untouched - they
// were always just SecurityCraft's own stock vanilla-material recipes,
// nothing else in the pack used them, they simply have no consumer here
// anymore. Real replacement: SecurityCraft's own ranged/proximity trap
// roster (Sentry, I.M.S., Trophy System, Cage Trap, Electrified Iron
// Fence, Bouncing Betty, Claymore) - see securitycraft_traps.js, one
// crafting-table recipe each, no workbench/blueprint/assembly step for
// any of them. Quest-chain removal documented in campaign.snbt.
ServerEvents.recipes((event) => {
  event.remove({ output: 'itemcollectors:basic_collector' })
  event.shaped('itemcollectors:basic_collector', [
    ' Q ',
    ' R ',
    'III',
  ], {
    Q: 'minecraft:quartz',
    R: 'minecraft:redstone_block',
    I: 'minecraft:iron_block',
  })
})
