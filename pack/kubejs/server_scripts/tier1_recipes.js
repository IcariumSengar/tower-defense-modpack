// Trapcraft dropped entirely (2026-09-08, direct ask - "don't like the
// traps," kept only the Magnetic Chest's mechanic, moved to a different
// mod - see tier2_recipes.js and docs/FEATURES.md's "Trapcraft dropped
// entirely" entry for the full writeup). Real replacements, individually
// verified via decompile before writing anything here, not guessed:
// - Spikes -> Simply Traps' `simply_traps:spike_trap` (CurseForge,
//   confirmed real Forge 1.20.1 build, no dependencies). Stock recipe
//   (3 iron_bars + 3 smooth_stone_slab -> 4) confirmed from the jar's
//   own data/simply_traps/recipes/spike_trap_recipe.json - re-recipied
//   below to match this slot's established "cheapest defense item in
//   the pack" role (same 4 sticks + 1 iron ingot cost the old
//   trapcraft:spikes re-recipe used).
// - Bear Trap -> V01D's Bear Traps' `vds_bear_traps:bear_trap_open`
//   (CurseForge, confirmed real Forge 1.20.1 beta build, no
//   dependencies). **Real finding, not assumed**: this mod ships with
//   NO crafting recipe at all - decompiled/inspected the full jar, it's
//   purely a world-generated structure (spawns in forest biomes,
//   picked up and re-placed by hand). A fresh recipe is added below
//   from scratch (event.shaped with no preceding event.remove, since
//   there's no stock recipe to remove) - same cost as the old
//   trapcraft:bear_trap (iron_ingot + stone_pressure_plate), so the
//   quest's "craft it" framing stays accurate.
ServerEvents.recipes((event) => {
  // Spike Trap re-costed 2026-09-10 (direct ask: "the iron spike are too
  // easy to make... i want the iron spike to deal more damage but are
  // harder to make"). Old recipe (4 sticks + 1 iron ingot) made it barely
  // more expensive than the new Wooden Stake tier below it (see
  // campaign.snbt's new "Cheap and Cheerful" quest) - not a real iron
  // investment. Real precedent for the new cost: Trapcraft's own
  // `trapcraft:spikes` (the mod this replaced, see this file's own header)
  // charged 5x iron_ingot with no wood at all - reused exactly, not
  // invented. Damage bumped to match (simplytraps.toml's
  // SpikeDamageMultiplier 1.0 -> 2.0, doubling its per-step hit) so the
  // higher cost buys something real.
  event.remove({ output: 'simply_traps:spike_trap' })
  event.shaped('simply_traps:spike_trap', [
    'I I',
    ' I ',
    'I I',
  ], {
    I: 'minecraft:iron_ingot',
  })

  // Bear Trap recipe removed 2026-09-10 (direct feedback: "the slime trap
  // and the bear trap are not great" -> "remove them, no replacement");
  // V01D's Bear Traps is uninstalled with it. Tier 1 is Spike Trap +
  // Barbed Wire (+ the pre-placed Stake Walls).

  // WWZ counter-mechanic + Slime Trap evaluation (2026-09-08, Phase 1).
  // Both from Simply Traps (already installed for the Spike Trap above) -
  // no new mod needed for either.
  //
  // **Stake Wall = the real WWZ counter-mechanic pick.** Checked all 3
  // researched options in docs/FEATURES.md before picking one, not
  // arbitrarily: an anti-climb overhang lip's actual effect on pathing was
  // unverified (would need live testing to know if it does anything at
  // all); a SecurityCraft Fake Water moat is real but needs a whole new
  // physical trench dug around the existing perimeter. Simply Traps'
  // `stake_wall` won on real technical fit, confirmed by decompile
  // (`StakeWallBlock`/`StakeWallEntityCollidesInTheBlockProcedure`), not
  // assumed from the name: it's a genuine wall-mounted block (a
  // `HorizontalDirectionalBlock` placed against a vertical face, like a
  // torch or ladder - real `FACING` property, real blockstate variants for
  // all 4 directions), non-solid (empty collision shape, so it doesn't
  // block the mob's own path), and deals real config-driven contact
  // damage (`SimplyTrapsConfigConfiguration.STAKEWALLDMG`, base 1.0 every
  // 2 ticks = up to 10 dmg/sec of sustained contact) to any non-item
  // entity touching it - exactly "continuous contact damage on the way
  // up" as specced, and it's a dedicated block for this purpose, not a
  // misuse of the floor Spike Trap. Placed directly on the existing
  // perimeter wall faces in playtest_starter_kit.js (see that file's own
  // wall-building section) rather than crafted by the player - it's part
  // of the starting base's defense, the same way the walls themselves
  // are. Real stock recipe (4 logs -> 4, confirmed from the jar's own
  // data/simply_traps/recipes/stake_wall_recipe.json) is left untouched -
  // already cheap and thematically fine, no re-recipe needed the way
  // Spike Trap and Bear Trap needed one.
  //
  // **Slime Trap - evaluated, built as a minor Tier 1 addition.**
  // Decompiled `SlimeTrapBlock`/`SlimeTrapEntityCollidesInTheBlockProcedure`
  // directly: zero damage, purely a weak outward push (0.175 block
  // impulse) plus slime-block-like slipperiness - a real but modest
  // crowd-control/pathfinding-compression tool, distinct from Spike
  // Trap's damage and Bear Trap's hold-in-place (already a much stronger
  // CC tool). Real stock recipe (3x minecraft:slime_ball + 3x
  // smooth_stone_slab -> 4, confirmed from the jar's own
  // data/simply_traps/recipes/slime_trap_recipe.json) is NOT usable as-is
  // in this pack - `minecraft:slime_ball` doesn't appear anywhere in this
  // pack's loot tables (no passive mob spawning, no slime in the
  // zombie-family roster), the same "stock recipe needs an ingredient
  // this pack doesn't actually have" problem Bear Trap hit. Re-recipied
  // below using materials already in the Tier 1 economy instead, same
  // cost tier as Spike Trap.
  // Slime Trap removed from Tier 1 the same day as the Bear Trap (see above).
  // The stock recipe stays removed so the block never shows as craftable;
  // Simply Traps itself stays installed for the Spike Trap and Stake Wall.
  event.remove({ output: 'simply_traps:slime_trap' })
})
