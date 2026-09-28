// Bouncing Betty/Claymore player-safety, 2026-09-11 - replaces the same-day
// bouncing_betty_safety.js, which shipped a real bug and never covered
// Claymore at all. Direct playtest report that caught it: "either the
// bouncing bettie or the claymore exploded and destroyed my own blocks...
// only harm enemies not players."
//
// **Bug #1, why the previous fix never fired**: bouncing_betty_safety.js
// matched spawned entities against `securitycraft:bouncing_betty` (with an
// underscore) - that's the real id of the BLOCK/item (confirmed working
// elsewhere in this pack, e.g. tooltip_tier_colors.js's own
// `'securitycraft:bouncing_betty': 2` entry). The live ENTITY the block
// spawns registers under a different string entirely - decompiled
// `SCContent.class` directly: `ENTITY_TYPES.register("bouncingbetty", ...)`,
// no underscore. `EntityEvents.spawned` was checking a string that could
// never match, so `pendingBouncingBettys` stayed empty forever and the
// player-hurt cancellation never ran. One-character-class typo, real
// consequence: the entire fix was dead code.
//
// **Bug #2, why Claymore was never touched**: decompiled
// `ClaymoreBlock.explode(Level, BlockPos)` directly - it removes its own
// block, then calls a plain vanilla `Level#explode(null, x, y, z, power,
// shouldSpawnFire, BlockUtils.getExplosionInteraction())` straight from the
// block, no entity ever spawned. There was nothing for the old
// `EntityEvents.spawned` hook to catch - Claymore needed a wholly different
// detection path, not a typo fix.
//
// **Why "null exploder = safe to sanitize" is NOT the right rule**: both
// traps pass `null` as the exploding entity, which looks like a clean
// discriminator against real hostile explosions - it isn't. Decompiled
// zombiesmore's own `DynamiteProjectileProjectileHitsBlockProcedure`/
// `...HitsLivingEntityProcedure` (Demolition Zombie's thrown-dynamite
// attack, this pack's one remaining hostile explosion source after the
// boomer/creeper strips): it ALSO calls `Level#explode` with a null source.
// A blanket null-exploder check would have silently defanged the one real
// enemy explosive attack left in the pack too - wrong, the ask is only
// about the two friendly traps.
//
// **Real fix - positive-match against two live registries, not exclusion**:
// - Claymore: tracked by its own placed block position, persisted on the
//   shared world-state marker's persistentData (`td_claymoreRegistry`,
//   same `x,y,z;x,y,z` string idiom trap_durability.js already uses for
//   `td_trapRegistry` - proven working NBT approach in this codebase).
//   Claymore's explosion center is always exactly its own BlockPos
//   (bytecode-confirmed: `pos.getX()/getY()/getZ()` fed straight into
//   `Level#explode`), so an exact integer-position match is precise, no
//   radius needed.
// - Bouncing Betty/I.M.S.: same entity-spawn-position + detonation-tick-
//   window idea the old script used (real fuse is 16 ticks after spawn,
//   not the block's own hardcoded `setFuse(15)` - `Bullet`/`BouncingBetty`
//   entity ticks with a post-decrement check), just matched against the
//   EXPLOSION's own real position this time instead of a victim's position
//   at hurt-time - tighter and no longer dependent on where a victim
//   happened to be standing.
// Only an explosion that matches one of these two registries gets
// sanitized. Everything else - Demolition Zombie's dynamite included - is
// left completely alone.
//
// **The mechanism itself - `LevelEvents.afterExplosion`**, decompiled
// directly from this pack's exact installed KubeJS build
// (kubejs-forge-2001.6.5-build.26.jar): wraps Forge's own
// `ExplosionEvent.Detonate` as `ExplosionEventJS.After`, firing after the
// affected-entity/affected-block lists are computed but BEFORE vanilla
// applies any damage or destroys any block. `getAffectedEntities()`
// returns a fresh copy each call, but `removeAffectedEntity()` mutates the
// real backing list vanilla's own `hurtEntities()` reads from right after -
// confirmed by decompile, not assumed - so removing a player here
// genuinely prevents that hit, it doesn't just look like it did.
// `removeAllAffectedBlocks()` clears the same live list vanilla's own
// block-destroy loop consumes. Block-breaking for both traps is already
// correctly OFF pack-wide via `mineExplosionsBreakBlocks = false` in
// securitycraft-common.toml (verified present in both the repo and the
// live instance's copy, and confirmed by decompile that both
// `ClaymoreBlock.explode`/`BouncingBetty.explode` read this exact config
// through the same `BlockUtils.getExplosionInteraction()` call) -
// `removeAllAffectedBlocks()` is added below anyway as a free, config-
// independent guarantee for the two matched cases specifically.
var BOUNCING_BETTY_ENTITY_TYPE = 'securitycraft:bouncingbetty' // real registered entity id - see header
var BOUNCING_BETTY_DETONATION_TICK = 16 // real fuse (15) + 1 - post-decrement tick check in the entity's own tick()
var BOUNCING_BETTY_WINDOW_TICKS = 3 // tolerance either side of the real tick
var BOUNCING_BETTY_MATCH_RADIUS = 10 // blast radius (6, or 3 halved) + margin for I.M.S.'s own tracking/launch drift

var pendingBouncingBettys = [] // {x, y, z, validFromTick, validUntilTick}

function getClaymoreRegistry(data) {
  if (!data.contains('td_claymoreRegistry')) return []
  return `${data.getString('td_claymoreRegistry')}`.split(';').filter((s) => s.length > 0).map((entry) => {
    var parts = entry.split(',')
    return { x: parseInt(parts[0], 10), y: parseInt(parts[1], 10), z: parseInt(parts[2], 10) }
  })
}

function setClaymoreRegistry(data, list) {
  data.putString('td_claymoreRegistry', list.map((c) => `${c.x},${c.y},${c.z}`).join(';'))
}

BlockEvents.placed(['securitycraft:claymore'], (event) => {
  var data = worldData(event.getLevel())
  if (!data) return
  var block = event.getBlock()
  var list = getClaymoreRegistry(data)
  list.push({ x: block.getX(), y: block.getY(), z: block.getZ() })
  setClaymoreRegistry(data, list)
})

// Player mined it up before it ever triggered - stop tracking that
// position, same hygiene trap_durability.js's own broken handler does.
BlockEvents.broken(['securitycraft:claymore'], (event) => {
  var data = worldData(event.getLevel())
  if (!data) return
  var block = event.getBlock()
  var x = block.getX()
  var y = block.getY()
  var z = block.getZ()
  var list = getClaymoreRegistry(data)
  var filtered = list.filter((c) => !(c.x === x && c.y === y && c.z === z))
  if (filtered.length !== list.length) setClaymoreRegistry(data, filtered)
})

EntityEvents.spawned((event) => {
  var entity = event.entity
  if (`${entity.type}` !== BOUNCING_BETTY_ENTITY_TYPE) return
  var tick = event.level.getTime()
  pendingBouncingBettys.push({
    x: entity.getX(),
    y: entity.getY(),
    z: entity.getZ(),
    validFromTick: tick + BOUNCING_BETTY_DETONATION_TICK - BOUNCING_BETTY_WINDOW_TICKS,
    validUntilTick: tick + BOUNCING_BETTY_DETONATION_TICK + BOUNCING_BETTY_WINDOW_TICKS,
  })
})

// Prunes independently of whether any explosion is ever matched to it
// (despawn, wire-cutter defuse, etc), same reasoning the old script's own
// tick-based prune used.
PlayerEvents.tick((event) => {
  if (pendingBouncingBettys.length === 0) return
  var currentTick = event.entity.getLevel().getTime()
  pendingBouncingBettys = pendingBouncingBettys.filter((b) => currentTick <= b.validUntilTick)
})

LevelEvents.afterExplosion((event) => {
  var level = event.getLevel()
  if (level.isClientSide()) return // method call - see wave_mob_spike_slow.js's header

  var ex = event.getX()
  var ey = event.getY()
  var ez = event.getZ()
  var bx = Math.floor(ex)
  var by = Math.floor(ey)
  var bz = Math.floor(ez)

  var matchedClaymore = false
  var data = worldData(level)
  if (data) {
    var claymores = getClaymoreRegistry(data)
    var claymoreIdx = claymores.findIndex((c) => c.x === bx && c.y === by && c.z === bz)
    if (claymoreIdx !== -1) {
      matchedClaymore = true
      claymores.splice(claymoreIdx, 1)
      setClaymoreRegistry(data, claymores)
    }
  }

  var bettyIdx = -1
  if (!matchedClaymore) {
    var currentTick = level.getTime()
    bettyIdx = pendingBouncingBettys.findIndex((b) => {
      if (currentTick < b.validFromTick || currentTick > b.validUntilTick) return false
      var dx = ex - b.x
      var dy = ey - b.y
      var dz = ez - b.z
      return dx * dx + dy * dy + dz * dz <= BOUNCING_BETTY_MATCH_RADIUS * BOUNCING_BETTY_MATCH_RADIUS
    })
  }

  if (!matchedClaymore && bettyIdx === -1) return // not one of ours - e.g. Demolition Zombie's dynamite, leave it alone

  if (bettyIdx !== -1) pendingBouncingBettys.splice(bettyIdx, 1)

  event.getAffectedEntities().forEach((e) => {
    if (`${e.type}` === 'minecraft:player') event.removeAffectedEntity(e)
  })
  event.removeAllAffectedBlocks()
})
