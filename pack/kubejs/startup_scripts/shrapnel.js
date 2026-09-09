// Scrap Shrapnel - the Tier 2 "kill mobs to fund your tech" crafting
// material (docs/QUEUE.md's Roadmap, Phase 2 "Shrapnel/scrap" fork,
// docs/FEATURES.md's "Shrapnel/scrap folded into loot bag tables"
// entry, both 2026-09-08).
//
// **Real design decision, documented here since this is where the item
// itself is defined**: genuine crafting material, not pure flavor loot.
// Checked first whether anything scrap-flavored already existed
// (neither this pack's own items nor Advanced Tower Defense's own lang
// file has a generic "scrap"/"shrapnel" material - ATD's own
// `*_shrapnel*` ids are all specific late-game ammo-shell variants, not
// a base material - confirmed by grepping its extracted jar's lang
// file directly, not guessed). Real reason it needs to be a genuine
// material, not flavor: decompiling Advanced Tower Defense's actual
// jar (see tier2_recipes.js's header comment for the full writeup)
// found its real Tier 0 tech-tree gate item,
// `advanced_tower_defense_mod:tech_tablet_mechanics`, has NO reachable
// recipe anywhere in the mod's own shipped data - every path to it
// goes through the mod's own separate, fully-hardcoded "Research
// Table" system (a `matches()`-always-`false` JEI-only recipe type,
// same broken-JEI-recipe pattern found twice while researching this),
// which this pack is deliberately not reverse-engineering (a whole
// separate, undocumented sub-system, out of scope for this batch).
// Shrapnel is the real front door instead: it gates the ONE item that
// unblocks the entire rest of Advanced Tower Defense's own real,
// working, vanilla-type recipe chain (winding_mechanism -> the Tier 0
// Turret Workbench; turret_chip_t_0/turret_base_t_0/
// manual_turret_base_t_0 - the physical base blocks a turret head
// mounts on) - see tier2_recipes.js. It also gates the two brand-new
// Blueprint items this pack adds (no existing recipe for either, at
// all - the mod's own Blueprints Table research tree is the only
// other route, same reasoning as above). Per
// [[feedback_loot_shortcut_undermines_choice]], Shrapnel is never
// grantable from anything a home machine already produces - it only
// ever comes from mob-kill loot bags (see loot_bag_drops.js + the 4
// data/bountybags/loot_tables/items/*.json tables), a real "combat
// funds your tech" resource, not a shortcut.
//
// **Live deploy gotcha, see loot_bag_drops.js's own header for the full
// decompiled explanation**: BountyBags caches these JSON tables into
// config/bountybags/*.toml exactly once and never re-reads them - the
// live instance's own bag TOMLs are stale as of 2026-09-03, so this
// item does not actually drop in the live game yet. Needs the live
// TOML regenerated (delete the file, or an op runs `/bountybags edit
// <tier>` -> Restore Defaults) before this is really live, not just
// committed.
//
// Texture: no ready-made scrap-metal icon existed in this pack's own
// custom-item set (amulet.js/wave_horn.js each ship their own single
// custom PNG) - generated a small original 16x16 RGBA sprite (a few
// angular gray/rust metal shard shapes on a transparent background,
// written directly as raw PNG chunks - no art tool available in this
// environment) and validated it loads as a real, well-formed image via
// Java's ImageIO before committing it, same "verify, don't assume"
// discipline as everything else in this pack.
StartupEvents.registry('item', (event) => {
  event.create('shrapnel', 'basic')
    .tooltip('§7Scrap metal salvaged from the fight - fuel for Tier 2 tech.')
    .maxStackSize(64)
})
