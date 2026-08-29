// Tier 1 defensive machines (docs/IDEAS.md's Machine Progression design
// notes) - the first slice of the "loot -> craft machines -> survive"
// loop this pack is named for. No machine blocks existed before this.
//
// Built in the requested easiest-first order: Wooden Palisade (this
// file), Simple Snare Trap (no new block needed - see
// machine_recipes.js, it's a themed recipe for vanilla cobweb, not a
// custom block), Spike Trap (this file, the genuinely novel one).
//
// Reuses existing vanilla textures via .textureAll()/.texture() rather
// than hand-authoring new art - first time this pack has registered a
// custom BLOCK (only items so far: loot bags, Wave Horn), but texture
// reuse keeps the actual new-content risk to block registration itself,
// not art production too.

StartupEvents.registry('block', (event) => {
  // Wooden Palisade - a themed fence block, not vanilla oak_fence
  // reused directly, so it has its own identity for crafting/future
  // Tier 1 "degrades from overuse" balance work. KubeJS's built-in
  // 'fence' block type gives real vanilla fence behavior for free
  // (connects to neighbors, blocks most mob pathing, spiders/flying
  // mobs still cross - same as any vanilla fence) - no custom collision
  // logic needed, matching how low-risk this piece is meant to be.
  // Oak log's own texture (not oak_planks) for a "raw timber stakes"
  // look distinct from a plank fence.
  event.create('wooden_palisade', 'fence')
    .displayName('Wooden Palisade')
    .textureAll('minecraft:block/oak_log')
    .tagBlock('minecraft:mineable/axe')
    .hardness(2.0)
    .resistance(3.0)

  // Spike Trap - the genuinely novel one. Damage-on-contact and a
  // hit-counter that degrades the block are both handled in
  // server_scripts/spike_trap.js, not here - this only registers the
  // block shape/look/property. "hits" is a custom integer blockstate
  // (0-3), read and incremented via /execute commands in that script,
  // the same command-based state-management style this pack already
  // uses everywhere else (no block-entity/NBT persistence attempted -
  // per-block NBT state is unverified territory for this pack, a plain
  // blockstate property is the lower-risk equivalent). Java.loadClass
  // is a real, standard Rhino/KubeJS capability for reaching arbitrary
  // Minecraft/Forge classes - first time this pack has used it, but
  // well-documented, not a guess.
  const $IntegerProperty = Java.loadClass('net.minecraft.world.level.block.state.properties.IntegerProperty')
  event.create('spike_trap', 'basic')
    .displayName('Spike Trap')
    .textureAll('minecraft:block/cobblestone')
    .texture('up', 'minecraft:block/iron_block')
    .tagBlock('minecraft:mineable/pickaxe')
    .hardness(2.5)
    .resistance(4.0)
    .property($IntegerProperty.create('hits', 0, 3))
})
