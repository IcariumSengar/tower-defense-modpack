// Recipes for Immersive Engineering's Gun Turret and Chemthrower Turret, the
// Tier 3 turrets. Two slots differ from the stock recipes:
// - c: a Tier 2 SecurityCraft item replaces the Advanced Electronic Component
//   (which needs plastic and aluminum wire), so each turret consumes a Tier 2
//   trap: the Sentry for the Gun Turret, the Electrified Iron Fence for the
//   Chemthrower Turret.
// - s: a Flux Point replaces the railgun scope. As an ingredient it does not
//   power the placed turret.
// The other slots (b, g, t, e) keep their stock items.
ServerEvents.recipes((event) => {
  event.remove({ output: 'immersiveengineering:turret_gun' })
  event.shaped('immersiveengineering:turret_gun', [
    ' s ',
    ' gc',
    'bte',
  ], {
    s: 'fluxnetworks:flux_point',
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
    s: 'fluxnetworks:flux_point',
    g: 'immersiveengineering:chemthrower',
    c: 'securitycraft:electrified_iron_fence',
    b: 'immersiveengineering:metal_barrel',
    t: 'immersiveengineering:turntable',
    e: 'immersiveengineering:rs_engineering',
  })
})
