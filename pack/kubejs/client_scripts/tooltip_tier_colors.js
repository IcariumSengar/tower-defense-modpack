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
const TIER_COLORS = {
  1: { code: '§a', label: 'Tier 1 - Starting Defense' }, // green
  2: { code: '§e', label: 'Tier 2 - Automated Defense' }, // yellow
  3: { code: '§c', label: 'Tier 3 - Energetic Defense' }, // red
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
  'securitycraft:trophy_system': 2,
  'immersiveengineering:diesel_generator': 3,
  'immersiveengineering:tesla_coil': 3,
  'refinedstorage:controller': 3,
  'sophisticatedstorage:barrel': 3,
  'fluxnetworks:flux_plug': 3,
}

ItemEvents.tooltip((event) => {
  for (const itemId in TIER_ITEMS) {
    const tier = TIER_ITEMS[itemId]
    const color = TIER_COLORS[tier]
    event.add(itemId, `${color.code}${color.label}`)
  }
})
