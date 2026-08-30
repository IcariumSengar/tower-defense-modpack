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
// Slot: Curios ships slot TYPES (necklace, charm, back, etc.) but grants
// zero of them to any entity by default — a consuming pack has to grant
// slot count itself via a `curios/slots/<id>.json` datapack entry (see
// pack/kubejs/data/kubejs/curios/slots/necklace.json, `{size:1,
// operation:"ADD"}`) and tag the item into that slot's item tag (see
// pack/kubejs/data/curios/tags/items/necklace.json). Confirmed from
// Curios' own CuriosSlotManager.java — slot files are merged by their
// path (the id), not their namespace, so contributing "size" from our
// own kubejs namespace correctly stacks onto Curios' own necklace.json
// (which only defines order/icon/validators, no size).
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
StartupEvents.registry('block', (event) => {
  event.create('amulet_pedestal')
    .displayName('Amulet Pedestal')
    .soundType('stone')
    .hardness(3.0)
    .resistance(6.0)
    .tagBlock('mineable/pickaxe')
})
