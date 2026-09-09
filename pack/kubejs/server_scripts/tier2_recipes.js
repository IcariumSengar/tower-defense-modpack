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

  // Advanced Tower Defense's Musket Sentry + Anvil Launcher turrets,
  // 2026-09-08 (docs/QUEUE.md Roadmap Phase 2, docs/FEATURES.md
  // "Advanced Tower Defense, added alongside Medieval Defense Turrets").
  // MDT's Arrow Turret (above) stays untouched, exactly as directed.
  //
  // **Real jar decompiled before writing any of this** - CurseForge
  // project 1397871, file-id 8724397 ("3.7 [Mini Update]"), jar
  // downloaded from its real CDN URL and sha1-verified against
  // packwiz's own resolved hash (cd572bef6cc817e9a66b59a94bc04a9ce6f326c7)
  // before extracting - not trusted from the CurseForge listing alone.
  // Real namespace: `advanced_tower_defense_mod` (NOT
  // `advanced_tower_defense` - the original research's example ids were
  // never real, confirmed here directly). This is a full MCreator
  // "tech tree" mod (weapons/cannons/artillery, dozens of items) -
  // Musket Sentry ("Musket Turret") and Anvil Launcher are just its two
  // Tier-0 turret heads, real ids `turret_head_t_0_mushket` (yes,
  // "mushket" - the mod's own typo, kept verbatim since it's the real
  // registry id) and `turret_head_t_0_anvil_launcher`.
  //
  // **Real, load-bearing finding: the turret heads are NOT
  // vanilla-recipe-craftable at all**, so the established
  // `event.remove`+`event.shaped` pattern cited in the roadmap doesn't
  // apply to them directly - confirmed by decompiling the full chain,
  // not assumed from the shipped recipe JSON (which is actively
  // misleading here):
  // - `data/advanced_tower_defense_mod/recipes/craft_musket_jei.json` /
  //   `craft_anvil_launcher_jei.json` use a custom recipe type
  //   (`advanced_tower_defense_mod:turret_workbench_turrets_craft`).
  //   Decompiled `TurretWorkbenchTurretsCraftRecipe.matches()` directly
  //   - it's hardcoded `return false` always. This recipe type is
  //   JEI-display-only (feeds `TurretWorkbenchTurretsCraftRecipeCategory`),
  //   never actually completable via any RecipeManager lookup, and its
  //   JSON also omits real per-slot quantities (lists 1 of each
  //   ingredient with no counts).
  // - The REAL crafting path: place the matching Blueprint item (tagged
  //   `#atd:t0_blueprints`) into the Tier 0 Turret Workbench block's
  //   slot 7, fill slots 0-5 with the exact ingredients below, click
  //   "Assemble turret". Decompiled the actual button handler chain
  //   (`GuiTurretWorkbencht0ButtonMessage` ->
  //   `WorkbenchCraftT0Procedure` -> `CraftTurretMusketProcedure` /
  //   `CraftTurretAnvilLauncherProcedure`) - fully hardcoded Java,
  //   comparing each fixed inventory slot's item type AND exact stack
  //   size, not data-driven at all. Real, exact quantities (not in any
  //   JSON, only in the decompiled bytecode):
  //   - **Musket Turret head**: 8x minecraft:iron_ingot, 1x
  //     stone_barrel, 1x spring, 1x minecraft:spyglass, 6x
  //     wooden_parts, 4x stone_parts + Blueprint (Musket Turret) in the
  //     blueprint slot.
  //   - **Anvil Launcher Turret head**: 3x minecraft:iron_ingot, 4x
  //     minecraft:redstone, 1x minecraft:piston, 1x minecraft:spyglass,
  //     7x wooden_parts, 14x stone_parts + Blueprint (Anvil Launcher
  //     Turret).
  //   This can't be touched via KubeJS/data at all without
  //   bytecode-patching the mod - out of scope per this pack's own
  //   "no custom Java mod, existing mods plus glue only" policy (see
  //   README.md). Not a design choice, a real hard technical
  //   constraint - documented in full in docs/FEATURES.md.
  // - Both turret heads mount onto a real placed block, not a hand-held
  //   turret: Musket uses `advanced_tower_defense_mod:turret_base_t_0`
  //   ("Turret Base (Tier 0) (AI Controlled)" - matches its "Simple
  //   Turret Base (AI / Manual)" tooltip line, auto-targets like MDT's
  //   Arrow Turret). Anvil Launcher uses
  //   `advanced_tower_defense_mod:manual_turret_base_t_0` instead -
  //   its own tooltip says "Base: Simple Turret Base (Manual)" only, a
  //   real, meaningful difference: it's a player-aimed artillery piece
  //   (180m range, slow fire rate, "pretty high" damage, "Guidance
  //   system: Coordinates"), not a set-and-forget sentry. Both base
  //   blocks, `winding_mechanism` (feeds the Tier 0 Turret Workbench
  //   recipe below), and `turret_chip_t_0` all share ONE real, common
  //   blocker: every one of their shipped `minecraft:crafting_shaped`
  //   recipes requires `advanced_tower_defense_mod:tech_tablet_mechanics`
  //   as an ingredient, and THAT item has the exact same
  //   `matches()`-always-`false` JEI-only-recipe problem (its own
  //   `research_7.json`, type `advanced_tower_defense_mod:jei_all_tech`)
  //   - gated behind the mod's separate "Research Table" system, not
  //   reverse-engineered here (real, deliberate scope call - a whole
  //   second undocumented hardcoded sub-system).
  //
  // **The fix**: one single, well-targeted addition unblocks the whole
  // rest of the real chain at once - a genuine, working
  // `minecraft:crafting_shaped` recipe for `tech_tablet_mechanics`
  // itself. Not calling `event.remove` on the original broken
  // `research_7.json` first - it was never actually completable
  // in-game (same `matches()=false` issue), so it's harmless dead JSON,
  // not a competing working recipe. Gated behind Shrapnel (this pack's
  // new Tier 2 "kill mobs to fund your tech" material, see
  // startup_scripts/shrapnel.js) since it's a one-time tech unlock, not
  // a per-turret cost - kept to a single Shrapnel so it's a real but
  // light gate. Everything downstream of it
  // (winding_mechanism/turret_chip_t_0/turret_base_t_0/
  // manual_turret_base_t_0/the Tier 0 Turret Workbench itself) already
  // ships a real, working, 100%-reachable vanilla-type recipe once this
  // one piece exists - verified by reading every recipe in that chain
  // directly, not assumed. The Workbench's own shipped recipe (anvil +
  // paper + smithing_table + winding_mechanism + stripped_oak_log) is
  // left completely as-shipped - already a reasonable Tier-2-weight
  // recipe, and this pack's own precedent (MDT's Arrow Turret) is
  // explicit that there's no forced "consume the previous tier" pattern
  // to apply here.
  event.shaped('advanced_tower_defense_mod:tech_tablet_mechanics', [
    'PSP',
    'RBR',
    'NCN',
  ], {
    P: 'minecraft:paper',
    S: 'kubejs:shrapnel',
    R: 'minecraft:redstone',
    B: 'minecraft:book',
    N: 'minecraft:iron_nugget',
    C: 'minecraft:compass',
  })

  // The two Blueprint items themselves - real finding, checked
  // directly: NEITHER has any recipe anywhere in the mod's own shipped
  // data (grepped the whole extracted jar for both ids - zero hits
  // outside the `#atd:t0_blueprints` tag they're each a member of).
  // Same "gated behind the mod's own unbuilt Research/Blueprints Table
  // system" situation as tech_tablet_mechanics above - given a real,
  // working front door instead of reverse-engineering that system.
  // Anvil Launcher costs more Shrapnel than the Musket blueprint,
  // matching its real relative power (180m range/"pretty high" damage
  // artillery vs. the Musket's 40m/"Medium" direct-hit sentry).
  event.shaped('advanced_tower_defense_mod:blueprint_musket_turret', [
    'PFP',
    'SNS',
    'PGP',
  ], {
    P: 'minecraft:paper',
    F: 'minecraft:flint',
    S: 'kubejs:shrapnel',
    N: 'minecraft:iron_nugget',
    G: 'minecraft:gunpowder',
  })

  event.shaped('advanced_tower_defense_mod:blueprint_anvil_launcher', [
    'PHP',
    'SNS',
    'SRS',
  ], {
    P: 'minecraft:paper',
    H: 'minecraft:chain',
    S: 'kubejs:shrapnel',
    N: 'minecraft:iron_nugget',
    R: 'minecraft:redstone',
  })

  // Ammo economy - real finding, checked before designing anything new:
  // ALL of it already works. Musket ammo (`mushket_shell`,
  // `mushket_slug`) and their shared `paper_shell` component are real
  // `minecraft:crafting_shapeless`/`crafting_shaped` recipes using only
  // vanilla materials (iron_nugget/iron_ingot/paper/gunpowder/string/
  // honeycomb) - confirmed by reading each recipe JSON directly, no
  // dependency on anything gated above. Anvil Launcher's ammo is
  // literally vanilla `minecraft:anvil` (its own tooltip: "Ammo type:
  // Anvils"). Nothing to re-recipe or gate here - the roadmap's
  // "Ammo economy recipes" fork (iron_bolt/bonus-arrows-style examples)
  // was written against invented ids that don't exist in this mod; the
  // real ammo chain needs no new work at all.
})
