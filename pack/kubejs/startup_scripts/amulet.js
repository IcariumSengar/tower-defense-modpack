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

// The pedestal itself is **retired 2026-09-05** (docs/FEATURES.md
// "Pedestal visual upgrade" - direct request: "can we leverage a mod
// that renders cool pedestals with floating items"): every NEW world
// build now places Supplementaries' real Pedestal block
// (`supplementaries:pedestal`) instead, a genuine Container that
// renders whatever's placed in it natively - see
// server_scripts/amulet_pedestal.js for the real detail on that
// retrofit. Supplementaries' own pedestal already has a real,
// 100%-vanilla-materials crafting recipe (6x stone_brick_slab + 1x
// stone_bricks/chiseled_stone_bricks → 2 pedestals, confirmed from the
// mod's own recipe JSON), so a lost/destroyed one on a fresh world has
// a real replacement path.
//
// This registration stays, though, deliberately not deleted - real
// risk found before shipping, not assumed safe: any already-in-progress
// save (this pack's own live instance included) has an actual placed
// `kubejs:amulet_pedestal` block from before this swap. Removing its
// registration entirely would leave that block unresolvable on the
// next load - Forge's real, documented behavior for a missing custom
// block is to silently drop it to air, which would destroy an existing
// player's actual pedestal (and, with it, their save's own game-over
// failsafe) the next time they logged in. Keeping the block type
// registered costs nothing (no new build ever places it again) and
// avoids that real, silent data loss. Its own recipe still works too,
// as a genuine fallback if an old save's block is ever lost - the same
// reasoning this recipe has had since the original pedestal/amulet
// reversal.
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
