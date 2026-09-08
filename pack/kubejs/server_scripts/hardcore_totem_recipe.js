// Hardcore mode's Totem of Undying - crafting-recipe half (docs/QUEUE.md
// Roadmap Phase 5, docs/IDEAS.md's "Hardcore mode" section - real
// decision #2, 2026-09-01: totems obtainable "both ways... a real
// crafting recipe (vanilla has NO totem recipe at all - this needs a
// genuinely new one, gated behind expensive/rare materials)"). This is
// the lowest-priority, explicitly-optional half of this build's scope
// ("not blocked by anything - pick up if time left") - picked up since
// time allowed. The OTHER half (boss-kill drop) is the real, primary
// Phase 5 deliverable - see boss_wave.js.
//
// **Scoped exactly as narrow as the boss-kill half**: only the recipe
// itself. The rest of Hardcore mode (the `/hardcore enable` toggle, the
// permadeath death-hook, pedestal-vulnerability tie-in) is NOT built
// here - stays exactly as parked in docs/FEATURES.md's "Hardcore mode"
// section. A Totem crafted here works today as a normal, always-useful
// defensive item (same as this pack's other 2 real Totem sources - "The
// Reckoning"'s quest reward, and loot_bag_drops.js's existing ~2%
// Legendary-bag roll), ready to plug into Hardcore mode's two-path
// design whenever the rest of it gets built.
//
// **Real material choice, not vanilla-only**: vanilla ships zero recipe
// for this item at all (confirmed - no `minecraft:totem_of_undying`
// recipe exists anywhere in the base game's own recipe folder), so
// there's no existing recipe to remove/replace, just a genuinely new
// one to add. IDEAS.md's own spec suggested "Rare-tier loot bag
// contents" as an example - checked directly against this pack's real
// Rare tier (`data/bountybags/loot_tables/items/rare.json`: iron_ingot/
// quartz/gold_ingot/redstone_block/obsidian/lapis_block/iron_block/tnt/
// ender_pearl/diamond) and none of those read as "totem-worthy" - the
// real expensive, genuinely rare materials in this pack's own loot
// economy live in the Epic/Legendary tiers instead (diamond/emerald/
// gold_block/diamond_block/netherite_scrap/netherite_ingot/nether_star),
// used here instead of literally the Rare tier - a considered
// substitution, not a literal reading of the spec's own example.
// Shapeless (not shaped) - nothing about this item reads as having a
// meaningful physical arrangement, matching vanilla's own real
// shapeless recipes for other single-output rare items (e.g. netherite
// ingot from netherite_scrap+gold_ingot).
ServerEvents.recipes((event) => {
  event.shapeless('minecraft:totem_of_undying', [
    'minecraft:nether_star',
    'minecraft:diamond_block',
    'minecraft:diamond_block',
    'minecraft:gold_block',
    'minecraft:netherite_scrap',
  ])
})
