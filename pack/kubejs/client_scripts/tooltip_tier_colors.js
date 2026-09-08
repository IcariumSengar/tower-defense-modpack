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
// real source of truth for which item belongs to which tier, not
// docs/QUEUE.md's own summary line, which turned out to be stale: it
// still calls Vacuum Blocks "Tier 1" even though tier2_recipes.js's own
// header comment and file placement have treated it as Tier 2 since the
// Trapcraft removal - Vacuum Blocks/Arrow Turret both re-recipe off the
// Tier 2 (Rare-pool) loot tier, not Tier 1's Common pool. Fixed in this
// pass by coloring per the real recipe-file tier, not the stale doc line
// - see docs/FEATURES.md for the correction note.
//
// Tier 3 has no items yet (not built this session) - nothing to color
// there until Phase 3 ships real item ids.
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
  'vacuum_cleaner:vacuum_block_tier_1': 2,
  'medievalturrets:bow_turret_item': 2,
}

ItemEvents.tooltip((event) => {
  for (const itemId in TIER_ITEMS) {
    const tier = TIER_ITEMS[itemId]
    const color = TIER_COLORS[tier]
    event.add(itemId, `${color.code}${color.label}`)
  }
})
