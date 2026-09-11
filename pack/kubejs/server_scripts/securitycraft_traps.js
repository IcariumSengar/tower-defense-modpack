// SecurityCraft ranged/proximity traps, 2026-09-11 - the "wood/iron
// spikes -> simple ranged traps" pivot away from Advanced Tower
// Defense's Turret Workbench chain (see tier2_recipes.js's own header
// for that system's real complexity - Blueprint + 6-slot hardcoded
// assemble step + a separate Research-gated tech unlock). Every item
// below is a single crafting-table recipe, no workbench GUI, no
// multi-step assembly.
//
// Real finding that shaped this file: SecurityCraft's stock recipes for
// Sentry/I.M.S./Trophy System/Cage Trap/Electrified Iron Fence all pull
// in a "Reinforced" component (Reinforced Iron Block, Reinforced
// Dispenser, Reinforced Iron Bars, a Reinforced Fence) - none of those
// are directly craftable, they only come from using a Universal Block
// Reinforcer tool on a placed vanilla block. Direct ask: drop the
// Reinforcer altogether. Every recipe below swaps each Reinforced
// ingredient for its plain vanilla equivalent - confirmed real stock
// recipes extracted directly from the installed jar
// ([1.20.1] SecurityCraft v1.10.2.1.jar, sha1
// 6184ca6af68a0a4e8ca4dd28a542b5d1a6c2e3ab, matching
// pack/mods/securitycraft.pw.toml) before writing any of this, not
// guessed. Portable Radar (Sentry/I.M.S.'s other shared component) is
// left exactly as shipped - it's already all-vanilla materials (iron
// ingots + redstone dust + redstone torch), a real small prerequisite
// craft, not a Reinforcer dependency.
ServerEvents.recipes((event) => {
  // Sentry - the flagship: place on top of a block, auto-shoots
  // arrows at anything matching its target mode (toggle by
  // right-click), infinite ammo unless a passcode-protected chest/
  // barrel of other projectiles sits underneath it. One Shrapnel in
  // the recipe (swapped in for one of the two redstone dust) keeps
  // Shrapnel's own "kill mobs to fund your tech" design intent alive
  // (see shrapnel.js's header) now that its original gate -
  // tech_tablet_mechanics - no longer exists.
  //
  // Iron cost trimmed 2026-09-11 (direct feedback: "a lot of trap
  // recipes require iron, I don't have enough to craft what I want").
  // The original 3x iron_block bottom row wasn't the "small step up
  // from vanilla" it looked like - iron_block is 9 ingots each, so
  // that row alone was 27 ingots, for 36 total with Portable Radar's
  // own 7-ingot prereq folded in. Center block kept (still a real,
  // meaningful material cost past just ingots) but the two outer
  // corners drop to plain ingots: new total 4 ingot + 1 block (9) + 7
  // (radar) = 20, down from 36.
  event.remove({ output: 'securitycraft:sentry' })
  event.shaped('securitycraft:sentry', [
    'SDR',
    'IPI',
    'IBI',
  ], {
    S: 'kubejs:shrapnel',
    D: 'minecraft:dispenser',
    R: 'minecraft:redstone',
    I: 'minecraft:iron_ingot',
    P: 'securitycraft:portable_radar',
    B: 'minecraft:iron_block',
  })

  // I.M.S. (Intelligent Munitions System) - refillable mine holding up
  // to 4 Bouncing Betties, auto-launches them to track down and
  // detonate on anything entering its radius.
  //
  // Iron cost trimmed 2026-09-11, same feedback as Sentry above: the
  // center iron_block (9 ingots) was the biggest single ingredient
  // here even before the 4 Bouncing Betties (2 ingots each) and
  // Portable Radar (7) are counted - dropped to a plain ingot. New
  // total 8 (Betties) + 1 (ingot) + 7 (radar) = 16, down from 24.
  event.remove({ output: 'securitycraft:ims' })
  event.shaped('securitycraft:ims', [
    'BPB',
    ' I ',
    'B B',
  ], {
    B: 'securitycraft:bouncing_betty',
    P: 'securitycraft:portable_radar',
    I: 'minecraft:iron_ingot',
  })

  // Trophy System removed entirely, 2026-09-11 (direct feedback: "serves
  // no purpose as there are no air based enemies attacks"). Checked
  // before cutting it, not just taken on faith: this pack's roster has no
  // bow-wielding mobs and no dispenser-arrow traps (skeletons were
  // stripped in the zombie-apocalypse pivot - see the old
  // turret_combat_feedback.js's own scope-caveat comment, git history),
  // and Demolition Zombie (zombiesmore's Explosive Zombie) attacks by
  // throwing a `zombiesmore:dynamite_projectile` that detonates a real
  // TNT-type explosion (decompiled `DynamiteProjectileProjectileHits*`
  // procedures directly) - not an arrow or fireball, the only two
  // projectile types the Trophy System's own counter-battery AI shoots
  // down. No hostile in this pack's actual roster gives it anything to
  // intercept. No re-recipe added back - just the stock recipe removal
  // below, same treatment as the Universal Block Reinforcer got. Quest
  // node removed from campaign.snbt, tier color entry removed from
  // tooltip_tier_colors.js.
  event.remove({ output: 'securitycraft:trophy_system' })

  // Cage Trap - non-lethal, traps a mob/player (except the owner) in a
  // block cage on contact.
  //
  // Iron cost trimmed 2026-09-11, same feedback as Sentry/I.M.S. above:
  // this was the single worst offender - 3x iron_block for 27 ingots,
  // 28 total with the bars. Down to 1 block + 2 ingots: 9 + 2 + ~1
  // (bars) = ~12, still a real step up from Electrified Fence's plain-
  // ingot cost but no longer the most expensive trap in the roster.
  event.remove({ output: 'securitycraft:cage_trap' })
  event.shaped('securitycraft:cage_trap', [
    'BBB',
    'GRG',
    'JKJ',
  ], {
    B: 'minecraft:iron_bars',
    G: 'minecraft:gold_ingot',
    R: 'minecraft:redstone',
    J: 'minecraft:iron_ingot',
    K: 'minecraft:iron_block',
  })

  // Electrified Iron Fence - unbreakable fence, shocks anyone but the
  // owner on contact.
  event.remove({ output: 'securitycraft:electrified_iron_fence' })
  event.shaped('securitycraft:electrified_iron_fence', [
    ' I ',
    'IFI',
    ' I ',
  ], {
    I: 'minecraft:iron_ingot',
    F: 'minecraft:oak_fence',
  })

  // Claymore and Bouncing Betty need no re-recipe - their real stock
  // recipes (checked in the same jar) never touched a Reinforced
  // ingredient to begin with:
  // - Bouncing Betty: minecraft:heavy_weighted_pressure_plate +
  //   2x forge:ingots/iron + 2x forge:gunpowder.
  // - Claymore: 2x minecraft:tripwire_hook + 2x forge:string +
  //   a Bouncing Betty + forge:dusts/redstone + forge:gunpowder.

  // Universal Block Reinforcer (all 3 tiers) - dropped entirely per
  // direct ask, now that nothing above depends on it. Recipes stripped
  // so it's not a craftable dead end in JEI; the mod still registers
  // every "Reinforced X" block regardless (they're baked into the base
  // structure's own placed palette in playtest_starter_kit.js,
  // unaffected by this).
  event.remove({ output: 'securitycraft:universal_block_reinforcer_lvl1' })
  event.remove({ output: 'securitycraft:universal_block_reinforcer_lvl2' })
  event.remove({ output: 'securitycraft:universal_block_reinforcer_lvl3' })
})
