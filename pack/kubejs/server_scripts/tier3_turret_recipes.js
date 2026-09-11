// Immersive Engineering's Gun Turret / Chemthrower Turret, re-recipied to
// pull from mods across the pack's tiers instead of staying IE-only,
// 2026-09-11 - direct ask to "interleave the mods" once these turrets were
// picked as Tier 3's new powered-trap roster (SecurityCraft's Tier 2 traps
// have no FE capability of their own to hook a Flux Point to).
//
// Real stock recipes extracted directly from the installed jar
// (ImmersiveEngineering-1.20.1-10.2.0-183.jar, matching
// pack/mods/immersive-engineering.pw.toml) before writing this - both
// share the same pattern/key shape:
//   " s "
//   " gc"
//   "bte"
// Two of the six slots are swapped:
// - `c` (stock: immersiveengineering:component_electronic_adv, itself
//   gated behind a Refinery-made Plastic) -> a real Tier 2 SecurityCraft
//   item, picked per-turret for theme (Sentry's own auto-aim brain for
//   the Gun Turret; the Electrified Iron Fence's area-denial role for
//   the Chemthrower Turret's spray). This also means neither turret
//   touches the Plastic/Refinery chain at all.
// - `s` (stock: immersiveengineering:toolupgrade_railgun_scope) ->
//   fluxnetworks:flux_point, so the turret is built with its own wireless
//   power draw already wired in - the literal "hook powered traps to
//   flux points" ask.
// `b`/`e`/`g`/`t` stay stock IE (ammo/chassis/weapon-core/rotation) -
// these are the parts that actually make it a turret, not worth
// swapping just for the sake of it.
//
// Real power math, worth stating plainly - pulled straight from
// IEServerConfig$Machines' compiled defaults (decompiled, not guessed):
// teslacoil_consumption=256 Flux/t idle + teslacoil_consumption_active=512
// per hit, turret_consumption=64 Flux/t per turret just to monitor the
// area (gun and chem both), plus turret_gun_consumption=32 / chem_
// consumption=32 more while actually firing. All three machines idling
// at once costs 384 Flux/t - the stock Culinary Generator's 8 Flux/t came
// nowhere close. Fixed at the source instead of here: see
// pack/config/generatorgalore/generators/culinary.json (raises output to
// 4096 Flux/t, matching IE's dieselGen_output default) - real fix needed
// a second file too, pack/config/generatorgalore/defaults.lock, or
// Generator Galore's own first-boot seeding forcibly overwrites the
// custom json with its stock 8-value version (decompiled and confirmed -
// see docs/MODS.md's Generator Galore row for the full mechanism). Not a
// re-recipe problem, so it's not handled in this file.
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
