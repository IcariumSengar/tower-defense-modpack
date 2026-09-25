// The Lure Block (docs/QUEUE.md's 2026-09-12 playtest batch, direct ask:
// "can we add a lure block into the game. so a block that you put down
// that has [a] timer on it that attracts the mobs. but when the timer
// runs out it is destroyed"). Registration + recipe live here;
// server_scripts/lure_block.js has the actual placement/timer/targeting
// logic, and mob_aggro.js's own targeting loop was edited to check for
// one near each wave mob.
//
// Model reuses vanilla's own `minecraft:block/target_side` texture
// (kubejs/assets/kubejs/models/block/lure_block.json is a plain full-cube
// model pointed at it) - zero new texture files needed, and the Target
// block's own ringed pattern already reads as "a thing that draws
// attention" for free, same "reuse before building new" call as every
// other cosmetic-only asset in this pack. Default full-block collision -
// no `.box()` override needed, the model's own elements already cover the
// full 0-16 cube.
StartupEvents.registry('block', (event) => {
  event.create('lure_block')
    .displayName('Lure Block')
    .item((item) => item.tooltip('§6Draws nearby hordes to it for a while, then it\'s gone'))
    .hardness(0.5)
    .resistance(0.5)
    .tagBlock('mineable/pickaxe')
    .model('kubejs:block/lure_block')
})
