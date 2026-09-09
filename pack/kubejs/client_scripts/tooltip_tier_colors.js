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
// **Updated 2026-09-09** - Tier 2 replacements: `vacuum_cleaner:
// vacuum_block_tier_1`/`medievalturrets:bow_turret_item` both dropped
// (mods uninstalled, see tier2_recipes.js's header) for
// `itemcollectors:basic_collector` and Advanced Tower Defense's two real
// turret-head items (`turret_head_t_0_mushket`/
// `turret_head_t_0_anvil_launcher` - the actual held/placed items, not
// the hardcoded-assemble-only base blocks). Tier 3 items added for the
// first time - real ids pulled from `campaign.snbt`'s own Tier 3 quest
// chapter (Storage & power system, Track C's Tesla Coil/Create Nozzle),
// not guessed.
const TIER_COLORS = {
  1: { code: '§a', label: 'Tier 1 - Starting Defense' }, // green
  2: { code: '§e', label: 'Tier 2 - Automated Defense' }, // yellow
  3: { code: '§c', label: 'Tier 3 - Energetic Defense' }, // red
}

const TIER_ITEMS = {
  'simply_traps:spike_trap': 1,
  'simply_traps:stake_wall': 1,
  'simply_traps:slime_trap': 1,
  'vds_bear_traps:bear_trap_open': 1,
  'itemcollectors:basic_collector': 2,
  'advanced_tower_defense_mod:turret_head_t_0_mushket': 2,
  'advanced_tower_defense_mod:turret_head_t_0_anvil_launcher': 2,
  'immersiveengineering:diesel_generator': 3,
  'immersiveengineering:tesla_coil': 3,
  'refinedstorage:controller': 3,
  'sophisticatedstorage:barrel': 3,
  'fluxnetworks:flux_plug': 3,
  'create:nozzle': 3,
}

ItemEvents.tooltip((event) => {
  for (const itemId in TIER_ITEMS) {
    const tier = TIER_ITEMS[itemId]
    const color = TIER_COLORS[tier]
    event.add(itemId, `${color.code}${color.label}`)
  }
})
