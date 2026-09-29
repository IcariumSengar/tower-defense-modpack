// Registers the Lure Block. Its recipe, placement and timer are in
// server_scripts/lure_block.js, and mob_aggro.js steers wave mobs to it. The
// model (assets/kubejs/models/block/lure_block.json) is a full cube with
// vanilla's target_side texture.
StartupEvents.registry('block', (event) => {
  event.create('lure_block')
    .displayName('Lure Block')
    .item((item) => item.tooltip('§6Draws nearby hordes to it for a while, then it\'s gone'))
    .hardness(0.5)
    .resistance(0.5)
    .tagBlock('mineable/pickaxe')
    .model('kubejs:block/lure_block')
})
