// The amulet item and the legacy amulet pedestal block. The amulet is a Curios
// necklace and the reward of the "Not Just Jewelry" quest (one per player, no
// recipe). amulet_worn.js applies its worn buffs, and amulet_pedestal.js
// handles setting it on the pedestal.

// attachCuriosCapability and CuriosJSCapabilityBuilder come from zhaijineet's
// KubeJS Curios (CurseForge project 1255211). Players get the necklace slot
// from data/kubejs/curios/entities/player.json, and
// data/kubejs/curios/slots/necklace.json sets its size to 1; Curios needs both.
// The item is tagged for the slot in data/curios/tags/items/necklace.json.
//
// The tooltip describes amulet_worn.js and amulet_pedestal.js; keep them in
// step. Fire-resistant because a lost amulet can't be replaced.
StartupEvents.registry('item', (event) => {
  event.create('amulet', 'basic')
    .tooltip('§dWorn: slowly mends wounds and blunts every blow')
    .tooltip('§7Regeneration I, Resistance I (-20% damage taken)')
    .tooltip('§7On the pedestal: the border lets you pass')
    .fireResistant()
    .attachCuriosCapability(
      CuriosJSCapabilityBuilder.create()
        // Equipping and unequipping set td_amuletWorn on the wearer, read by
        // amulet_worn.js and quest_milestones.js. Curios can pass any
        // LivingEntity, not only players, hence the guards.
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

