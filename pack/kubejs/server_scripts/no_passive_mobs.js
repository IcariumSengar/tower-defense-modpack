// Real fix, not `doMobSpawning` (2026-09-06, direct request: "passive
// mobs are spawning. I dont want passive mobs in the game at all.").
// `doMobSpawning false` (already set, `playtest_starter_kit.js`) only
// blocks vanilla's ongoing per-tick spawn cycle - it does NOT block the
// separate, one-time animal-population pass that runs the first time
// any chunk generates, which keeps happening in every newly-explored
// chunk regardless of the gamerule. That's very likely what's actually
// being seen.
//
// Real fix: `EntityEvents.spawned` + an immediate `entity.discard()`,
// event-driven so it's free when nothing spawns, matching this pack's
// own standing performance-scrutiny principle - not a recurring tick
// scan.
//
// **Real finding, not assumed - the "ideal" pre-spawn cancel approach
// genuinely doesn't work for this exact spawn path in this build.**
// KubeJS also exposes `EntityEvents.checkSpawn` (backed by
// `CheckLivingEntitySpawnEventJS`, real `.hasResult()`/`event.cancel()`
// support confirmed by decompiling the class) - the theoretically
// better hook, since it would deny the spawn before the entity ever
// exists. Tried it first, verified live in a sandbox with a diagnostic
// logger: forced fresh chunk generation in open plains multiple times
// and confirmed real cows/sheep spawned every time while the
// `checkSpawn` handler's own log line NEVER fired once - it simply
// isn't invoked for vanilla's natural chunk-population spawn pathway
// in this exact Forge/KubeJS build (`/summon`-triggered spawns don't
// reach it either - checked that too - it may only cover mob-spawner-
// block spawns, not tested further since it doesn't matter here).
// `EntityEvents.spawned` + `entity.discard()`, by contrast, was
// confirmed firing reliably for real natural spawns in the same test
// (`discard()` itself also confirmed real and working - a genuinely
// removed entity, not just hidden). Switched to the approach that's
// actually verified to work over the one that only looked cleaner on
// paper.
//
// Explicit id list, not a `MobCategory` filter - checked whether
// `MobCategory.CREATURE` also covers villagers/wandering traders/iron
// golems before picking an approach. Confirming the exact category
// boundary via decompilation wasn't a clean lookup in this exact build
// (`EntityType`'s own static registrations are fully SRG-obfuscated
// field names with no easy id->category mapping to read back). An
// explicit list sidesteps the question entirely instead of resolving
// it - villagers/iron golems/wandering traders are simply never in
// this list, so there's no overlap risk regardless of what category
// they're actually registered under. TFTH's own Flesh Villager
// mechanic needs real villagers to exist - this can't afford to guess
// wrong here. Slower to write than a category check, zero risk, the
// right tradeoff for this one.
//
// Deliberately genuinely-passive only, not every non-hostile mob -
// wolf, fox, dolphin, polar_bear, and bee are left out on purpose since
// they're neutral/conditionally-aggressive in vanilla, not purely
// passive - can be added if the user flags those too, but "passive
// mobs" as asked doesn't obviously cover a mob that can still attack
// you back.
var PASSIVE_MOB_TYPES = [
  'minecraft:cow', 'minecraft:mooshroom', 'minecraft:pig', 'minecraft:sheep',
  'minecraft:chicken', 'minecraft:rabbit', 'minecraft:horse', 'minecraft:donkey',
  'minecraft:mule', 'minecraft:llama', 'minecraft:trader_llama', 'minecraft:cat',
  'minecraft:ocelot', 'minecraft:parrot', 'minecraft:turtle', 'minecraft:cod',
  'minecraft:salmon', 'minecraft:pufferfish', 'minecraft:tropical_fish',
  'minecraft:squid', 'minecraft:glow_squid', 'minecraft:axolotl', 'minecraft:bat',
  'minecraft:panda', 'minecraft:goat', 'minecraft:frog', 'minecraft:tadpole',
  'minecraft:sniffer', 'minecraft:strider', 'minecraft:allay',
]

EntityEvents.spawned((event) => {
  var entity = event.getEntity()
  if (PASSIVE_MOB_TYPES.includes(`${entity.type}`)) entity.discard()
})
