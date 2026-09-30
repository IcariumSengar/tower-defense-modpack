// Recipes for Immersive Engineering's Gun Turret and Chemthrower Turret, the
// Tier 3 turrets, and the Chemthrower Turret's Ignite default.
//
// One slot differs from the stock recipes: c, a Tier 2 SecurityCraft item,
// replaces the Advanced Electronic Component (which needs plastic and
// aluminum wire), so each turret consumes a Tier 2 trap: the Sentry for the
// Gun Turret, the Electrified Iron Fence for the Chemthrower Turret. The
// other slots (s, b, g, t, e) keep their stock items. A placed turret takes
// power from a Flux Point next to it, like any other machine.
ServerEvents.recipes((event) => {
  event.remove({ output: 'immersiveengineering:turret_gun' })
  event.shaped('immersiveengineering:turret_gun', [
    ' s ',
    ' gc',
    'bte',
  ], {
    s: 'immersiveengineering:toolupgrade_railgun_scope',
    g: 'immersiveengineering:revolver',
    c: 'securitycraft:sentry',
    b: 'immersiveengineering:toolupgrade_revolver_magazine',
    t: 'immersiveengineering:turntable',
    e: 'immersiveengineering:rs_engineering',
  })

  event.remove({ output: 'immersiveengineering:turret_chem' })
  event.shaped('immersiveengineering:turret_chem', [
    ' s ',
    ' gc',
    'bte',
  ], {
    s: 'immersiveengineering:toolupgrade_railgun_scope',
    g: 'immersiveengineering:chemthrower',
    c: 'securitycraft:electrified_iron_fence',
    b: 'immersiveengineering:metal_barrel',
    t: 'immersiveengineering:turntable',
    e: 'immersiveengineering:rs_engineering',
  })
})

// IE places a Chemthrower Turret with Ignite off, and creosote (the pack's
// fuel for it) only hurts when the spray is lit, so a placed turret gets
// Ignite on. Only placement sets it: the player can switch it off in the
// turret's screen, and the item doesn't carry it. The turret's data lives in
// its lower block; the upper one (multiblockslave=true) is a dummy.
BlockEvents.placed('immersiveengineering:turret_chem', (event) => {
  var block = event.getBlock()
  if (`${block.getProperties().get('multiblockslave')}` === 'true') block = block.getDown()
  block.mergeEntityData({ ignite: true })
})
