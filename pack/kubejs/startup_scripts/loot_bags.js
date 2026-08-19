// Registers the three loot bag items. Container items only — contents are
// rolled at open-time in server_scripts/loot_bag_open.js, not baked in here.
//
// No custom texture supplied, so these render with KubeJS's placeholder
// item texture in-game until real artwork is added.

StartupEvents.registry('item', (event) => {
  event.create('scavengers_bag', 'basic').tooltip('§7Common loot bag')
  event.create('fortified_cache', 'basic').tooltip('§eUncommon loot bag')
  event.create('warlords_hoard', 'basic').tooltip('§6Rare loot bag')
})
