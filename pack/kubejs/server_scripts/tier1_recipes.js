// Trapcraft's Spikes re-introduced 2026-09-05 as the weak Tier 1 interim
// trap, below Barbed Wire (docs/QUEUE.md's "Ready to build" list, item
// 5 - deliberately last of that original 5-item batch, repeatedly bumped
// by live bug reports until now). Already installed (Trapcraft, used for
// Bear Trap/Fire Trap/Fan/Magnetic Chest elsewhere in this pack) but
// unused since Barbed Wire replaced it as this pack's Tier 1 wall-piercing
// defense (see FEATURES.md's "Barbed Wire replaces Spikes" writeup) - the
// block itself was never removed, just never given back a real recipe or
// quest of its own.
//
// Real stock recipe (data/trapcraft/recipes/spikes.json, confirmed by
// decompiling the shipped jar, not guessed): 5 iron ingots, no other
// materials - too steep for "weak/cheap interim," especially sitting next
// to Bear Trap's own 3 iron + 3 stone pressure plates in the same
// chapter. Retuned to mostly sticks (4) plus a single iron ingot -
// genuinely the cheapest defense item in this pack, matching its real
// role as the option available before Bear Trap or Barbed Wire's
// Create-powered rig are built.
//
// SpikesBlock.java's own real damage logic (decompiled directly): 2.0f
// base plus a velocity-based bonus on normal contact, or a flat 20.0f if
// the mob fell 5+ blocks onto it - no slow effect at all. Docs/QUEUE.md's
// "damage AND slow" ask is met by pairing this with plain vanilla
// cobweb, not a code change - cobweb's own real movement-speed reduction
// while a mob stands inside it already does the slowing half genuinely,
// same as any vanilla cobweb trap; the FTB Quests entry below documents
// the pairing directly to the player rather than this being a silent
// expectation.
ServerEvents.recipes((event) => {
  event.remove({ output: 'trapcraft:spikes' })
  event.shaped('trapcraft:spikes', [
    'S S',
    ' I ',
    'S S',
  ], {
    S: 'minecraft:stick',
    I: 'minecraft:iron_ingot',
  })
})
