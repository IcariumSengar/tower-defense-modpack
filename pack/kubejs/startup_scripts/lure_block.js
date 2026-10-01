// Registers the Lure Block. Its recipe, placement and timer are in
// server_scripts/lure_block.js, and mob_aggro.js steers wave mobs to it. The
// model (assets/kubejs/models/block/lure_block.json) is a bait crate whose
// textures come from tools/lure_block_art.py; the top's red core pulses.
StartupEvents.registry('block', (event) => {
  event.create('lure_block')
    .displayName('Lure Block')
    .item((item) => item.tooltip('§6Draws nearby hordes to it for a while, then it\'s gone'))
    .hardness(0.5)
    .resistance(0.5)
    .tagBlock('mineable/pickaxe')
    // One use: breaking it early, by hand or by a blast, gives nothing back.
    .noDrops()
    .model('kubejs:block/lure_block')
})
