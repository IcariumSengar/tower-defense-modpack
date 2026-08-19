// Registers the three loot bag items. Container items only — contents are
// rolled at open-time in server_scripts/loot_bag_open.js, not baked in here.
//
// Textures (2026-08-19): hand-authored 16x16 placeholders at
// pack/kubejs/assets/kubejs/textures/item/, one per tier, color-coded to
// match each bag's tooltip rarity color below (gray/Common, gold-tan
// with brass studs/Uncommon, red-and-gold with a gem/Rare) so the bag's
// rarity is visible at a glance in inventory, not just in the tooltip
// text. No model JSON needed — KubeJS's `basic` item type auto-generates
// one from the texture at the conventional path (same as wave_horn.js).

StartupEvents.registry('item', (event) => {
  event.create('scavengers_bag', 'basic').tooltip('§7Common loot bag')
  event.create('fortified_cache', 'basic').tooltip('§eUncommon loot bag')
  event.create('warlords_hoard', 'basic').tooltip('§6Rare loot bag')
})
