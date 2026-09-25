// Tiered tooltip color-coding (2026-09-08, Phase 1) - a client-side
// ItemEvents.tooltip addition marking Tier 1/2/3 defense items
// green/yellow/red with a one-line tier explainer, per docs/FEATURES.md's
// "Tiered tooltip color-coding" entry. First KubeJS client_scripts file in
// this pack (no client_scripts/ folder existed before this) - tooltip
// rendering is a client-side-only concern, same as every other tooltip
// mod already in this pack's stack (Jade, JEI).
//
// Real item ids used below, not guessed - pulled directly from this
// pack's own re-recipe files (tier1_recipes.js/tier2_recipes.js are the
// real source of truth for which item belongs to which tier).
//
// **Updated 2026-09-11** - Advanced Tower Defense removed entirely
// (both turret-head items cut, see tier2_recipes.js's header and
// securitycraft_traps.js) and replaced with SecurityCraft's ranged/
// proximity trap roster. All 7 stay under Tier 2 - "Automated Defense"
// fits them literally (Sentry/I.M.S./Trophy System act on their own
// once placed) and none of them use power, so they don't belong in
// Tier 3's "Energetic Defense" bucket, which stays reserved for the
// separately-planned Immersive Engineering/Flux Networks power system.
//
// **Same day** - Create and Create Addition removed entirely too
// (Barbed Wire felt redundant next to the new SecurityCraft roster;
// Create's only other live use, the Tier 3 Flamethrower Nozzle quest,
// was cut with it - see docs/MODS.md). `create:nozzle`'s Tier 3 entry
// dropped, nothing replaces it.
//
// **Also same day** - IE's Diesel Generator swapped for Generator
// Galore's Culinary Generator (single block, burns any food item
// including rotten flesh, no Refinery/biodiesel chain) as Tier 3's
// power source - see campaign.snbt's "Wired Different". IE's Gun
// Turret/Chemthrower Turret added alongside the Tesla Coil as Tier 3's
// powered-trap roster (see tier3_turret_recipes.js).
//
// **Tier 4 added 2026-09-15** - Open Modular Turrets Reborn's Grenade
// Turret and Rocket Turret, the pack's first real AoE-damage machines
// (see tier4_turret_recipes.js's header for the full research trail).
// The shared Turret Base itself stays uncolored - it has no combat role
// on its own until a head is mounted on it, same reason the Culinary
// Generator's own power-chain support blocks aren't individually listed
// here either.
const TIER_COLORS = {
  1: { code: '§a', label: 'Tier 1 - Starting Defense' }, // green
  2: { code: '§e', label: 'Tier 2 - Automated Defense' }, // yellow
  3: { code: '§c', label: 'Tier 3 - Energetic Defense' }, // red
  4: { code: '§d', label: 'Tier 4 - Elite Defense' }, // light purple
}

const TIER_ITEMS = {
  'simply_traps:stake': 1,
  'simply_traps:spike_trap': 1,
  'simply_traps:stake_wall': 1,
  'itemcollectors:basic_collector': 2,
  'securitycraft:bouncing_betty': 2,
  'securitycraft:claymore': 2,
  'securitycraft:sentry': 2,
  'securitycraft:cage_trap': 2,
  'securitycraft:electrified_iron_fence': 2,
  'securitycraft:ims': 2,
  'generatorgalore:culinary_generator': 3,
  'immersiveengineering:tesla_coil': 3,
  'immersiveengineering:turret_gun': 3,
  'immersiveengineering:turret_chem': 3,
  'refinedstorage:controller': 3,
  'sophisticatedstorage:barrel': 3,
  'fluxnetworks:flux_plug': 3,
  'omtreborn:grenade_turret': 4,
  'omtreborn:rocket_turret': 4,
}

ItemEvents.tooltip((event) => {
  for (const itemId in TIER_ITEMS) {
    const tier = TIER_ITEMS[itemId]
    const color = TIER_COLORS[tier]
    event.add(itemId, `${color.code}${color.label}`)
  }
})
