// Which mob kills drop which loot bag tier. Tier is keyed on mob TYPE only
// (per design decision — not night count), using entity IDs verified
// directly from each mod's jar rather than guessed:
//   - Vanilla hostiles -> Scavenger's Bag (Common)
//   - TFTH's "flesh_*"/"plaquecreature*" roster -> Fortified Cache (Uncommon)
//   - TFTH's Incubators specifically (the 50-heart core threats) -> Warlord's Hoard (Rare)
//
// Note: Pure Suffering's invasion mobs have no custom entity IDs of their
// own (confirmed by inspecting the mod jar — it spawns vanilla mobs), so an
// invasion zombie currently drops the same tier as any other zombie.

const VANILLA_HOSTILES = [
  'minecraft:zombie',
  'minecraft:husk',
  'minecraft:drowned',
  'minecraft:skeleton',
  'minecraft:spider',
  'minecraft:creeper',
]

const TFTH_FLESH_MOBS = [
  'the_flesh_that_hates:flesh_boomer',
  'the_flesh_that_hates:flesh_community',
  'the_flesh_that_hates:flesh_cow',
  'the_flesh_that_hates:flesh_dog',
  'the_flesh_that_hates:flesh_howler',
  'the_flesh_that_hates:flesh_human',
  'the_flesh_that_hates:flesh_hunter_two',
  'the_flesh_that_hates:flesh_hunter_three',
  'the_flesh_that_hates:flesh_justice',
  'the_flesh_that_hates:flesh_pig',
  'the_flesh_that_hates:flesh_pillager',
  'the_flesh_that_hates:flesh_servant',
  'the_flesh_that_hates:flesh_sheep',
  'the_flesh_that_hates:flesh_suffer',
  'the_flesh_that_hates:flesh_villager',
  'the_flesh_that_hates:flesh_vindicator',
  'the_flesh_that_hates:bruteplaquecreatureone',
  'the_flesh_that_hates:plaquecontaminator',
  'the_flesh_that_hates:plaquecreaturebaseone',
  'the_flesh_that_hates:plaquecreatureone',
  'the_flesh_that_hates:plaquecreaturetwo',
  'the_flesh_that_hates:plaquethreelegcreature',
]

const TFTH_INCUBATORS = ['the_flesh_that_hates:plaqueincubatorone', 'the_flesh_that_hates:plaqueincubatorstart']

// `LootJS.modifiers(...)` is the correct, current syntax — confirmed
// directly from LootJS's own source (LootJSEvent.java registers "LootJS"
// as a KubeJS 6 EventGroup with a "modifiers" handler) and from KubeJS's
// own onEvent migration guide (onEvent('x', ...) -> X.x(...), which for
// LootJS means exactly LootJS.modifiers(...)). A previous test showed
// "LootJS is not defined" and this got switched to the older onEvent()
// form as a result — but onEvent() is actually removed entirely in this
// KubeJS version (confirmed by a second, later in-game test that
// rejected it outright), so that fix was wrong. Reverted. The original
// "not defined" error was most likely caused by something else in that
// specific session (LootJS not fully loaded, from around the time the
// CurseForge instance was being recreated), not a real API mismatch.
LootJS.modifiers((event) => {
  // addEntityLootModifier is only confirmed to accept a single entity ID at
  // a time (every verified example does this), so each tier is wired up
  // per-entity rather than passing the whole array in one call.
  VANILLA_HOSTILES.forEach((id) => {
    event.addEntityLootModifier(id).randomChance(0.15).thenAdd('kubejs:scavengers_bag')
  })

  TFTH_FLESH_MOBS.forEach((id) => {
    event.addEntityLootModifier(id).randomChance(0.25).thenAdd('kubejs:fortified_cache')
  })

  TFTH_INCUBATORS.forEach((id) => {
    event.addEntityLootModifier(id).randomChance(0.75).thenAdd('kubejs:warlords_hoard')
  })
})
