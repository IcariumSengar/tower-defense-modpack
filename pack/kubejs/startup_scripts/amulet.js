// The amulet (docs/FEATURES.md "The amulet") — a Curios-slot accessory
// that draws mob aggro to itself once placed on its pedestal, a
// lightweight route to "true tower defense" without custom AI (see
// server_scripts/mob_aggro.js, which already proves Mob#setTarget()
// works reliably here).
//
// Stack: Curios API (accessory-slot capability) + KubeJS-Curios (bridges
// Curios' equip/unequip hooks to KubeJS). CurseForge project 1255211,
// author zhaijineet, github.com/zhaijineet/KubeJS-Curios — no README in
// that repo, so the real API (CuriosJSCapabilityBuilder, .attachCuriosCapability
// on the item builder, onEquip/onUnequip signatures) was read directly
// from its decompiled/source .java files on the 1.20.1 branch, not
// guessed or taken from a similarly-named different KubeJS-Curios fork
// (Prunoideae/KubeJS-Curios exists too, but is a different project with
// a different API — this pack installed zhaijineet's, per the CurseForge
// listing's actual GitHub link).
//
// Slot: Curios gates slot access with TWO independent mechanisms, both
// needed - real bug found in first playtest, see docs/FEATURES.md's
// amulet "Build notes" for the full story. (1) A slot TYPE's size,
// granted via `curios/slots/<id>.json` (see
// pack/kubejs/data/kubejs/curios/slots/necklace.json, `{size:1,
// operation:"SET",replace:true}`) - this alone does NOT make the slot
// usable by anyone. (2) Per-entity-type ELIGIBILITY, granted separately
// via `curios/entities/<id>.json` (see
// pack/kubejs/data/kubejs/curios/entities/player.json) - Curios'
// CuriosEntityManager.getEntitySlots(type) returns a flat empty map for
// any entity type with no matching entry here, regardless of slot size.
// Both confirmed directly from Curios' own source
// (CuriosSlotManager.java, CuriosEntityManager.java). Also tag the item
// into the slot's item tag (see
// pack/kubejs/data/curios/tags/items/necklace.json).
//
// onEquip/onUnequip just set td_amuletWorn — server_scripts/amulet_worn.js
// applies the actual buffs while that flag is true, same PlayerEvents.tick
// pattern as mob_aggro.js/wave_status.js. Guarded with a persistentData
// check since slotContext.entity() is any LivingEntity, not guaranteed
// a player (Curios' capability can attach to any entity type in theory).
//
// Not yet confirmed in-game — first time this pack has integrated a
// third-party accessory-slot system; every step here was reasoned from
// the mods' own source rather than guessed, same discipline as the
// SecurityCraft/Trapcraft/FTB Quests integrations, but real playtesting
// is still the actual bar.

StartupEvents.registry('item', (event) => {
  event.create('amulet', 'basic')
    .tooltip('§dWorn: mends faster, the desert heat doesn\'t bite')
    .attachCuriosCapability(
      CuriosJSCapabilityBuilder.create()
        .onEquip((slotContext, prevStack, stack) => {
          var entity = slotContext.entity()
          if (!entity || !entity.persistentData) return
          entity.persistentData.putBoolean('td_amuletWorn', true)
        })
        .onUnequip((slotContext, stack, newStack) => {
          var entity = slotContext.entity()
          if (!entity || !entity.persistentData) return
          entity.persistentData.putBoolean('td_amuletWorn', false)
        })
    )
})

// The pedestal — a plain block, no block entity/GUI. "Has the amulet"
// state deliberately lives on the player's own persistentData
// (td_amuletOnPedestal), not on the block/world, matching this pack's
// established reasoning in base_expansion.js: KubeJS's level/world
// persistentData has no save/load hook and resets on restart, player
// persistentData survives. Fine given this pack is single-player-focused
// and the design only ever calls for one pedestal. See
// server_scripts/amulet_pedestal.js for the recipe + interaction logic.
//
// Custom shrine-shaped model (2026-08-30, direct request - "more of a
// shrine kind of thing"), not the default full cube: a wide sandstone
// base (0-8/16 tall) plus a smaller raised dais on top (8-11/16),
// giving a stepped altar silhouette instead of a plain block. Model at
// assets/kubejs/models/block/amulet_pedestal.json, standard vanilla
// block-model "elements" format (unchanged since 1.8, not a KubeJS-
// specific schema, so not decompiled/verified against source the way
// the Curios API was - this one's just documented Minecraft data).
// Sandstone-toned textures (side: carved masonry courses + a gold
// inlay band; top: a glowing gold socket ring) tie it visually to the
// desert world and the amulet's own gold/gem palette, replacing the
// first pass's generic gray stone-cube placeholder.
// .fullBlock(false) + a matching .box() hitbox since this isn't a full
// opaque cube anymore (per KubeJS's own docs: required whenever .box()
// defines a custom hitbox). Hitbox height (11) matches the dais' top,
// not the full 16 - otherwise the block would still collide like a
// full cube despite visually stopping partway up.
StartupEvents.registry('block', (event) => {
  event.create('amulet_pedestal')
    .displayName('Amulet Pedestal')
    .sandSoundType()
    .hardness(3.0)
    .resistance(6.0)
    .tagBlock('mineable/pickaxe')
    .model('kubejs:block/amulet_pedestal')
    .fullBlock(false)
    .box(0, 0, 0, 16, 11, 16)
})
