// Cancels passive animals as they join the level, whether freshly spawned or
// loaded from a saved chunk. doMobSpawning is off (playtest_starter_kit.js),
// but chunk generation and structures still place animals.
//
// EntityEvents.spawned is Forge's EntityJoinLevelEvent, so cancel() stops the
// entity before it is added; discard() after it joins can leave an unkillable
// ghost on clients. EntityEvents.checkSpawn doesn't fire for chunk-generation
// spawns in this build.
//
// Villagers, wandering traders, golems and the neutral wolves, dolphins,
// polar bears and bees are left off on purpose. Foxes never attack players,
// so they are on the list.
var PASSIVE_MOB_TYPES = [
  'minecraft:cow', 'minecraft:mooshroom', 'minecraft:pig', 'minecraft:sheep',
  'minecraft:chicken', 'minecraft:rabbit', 'minecraft:horse', 'minecraft:donkey',
  'minecraft:mule', 'minecraft:llama', 'minecraft:trader_llama', 'minecraft:cat',
  'minecraft:ocelot', 'minecraft:parrot', 'minecraft:turtle', 'minecraft:cod',
  'minecraft:salmon', 'minecraft:pufferfish', 'minecraft:tropical_fish',
  'minecraft:squid', 'minecraft:glow_squid', 'minecraft:axolotl', 'minecraft:bat',
  'minecraft:panda', 'minecraft:goat', 'minecraft:frog', 'minecraft:tadpole',
  'minecraft:sniffer', 'minecraft:strider', 'minecraft:allay',
  'minecraft:camel', 'minecraft:fox', 'minecraft:skeleton_horse', 'minecraft:zombie_horse',
]

EntityEvents.spawned((event) => {
  var entity = event.getEntity()
  if (!PASSIVE_MOB_TYPES.includes(`${entity.type}`)) return
  // A rider joins after its mount (a baby zombie's jockey chicken). Left on
  // a mount that never joins the level, the rider never ticks, so it is
  // dismounted first.
  entity.ejectPassengers()
  event.cancel()
})
