// Electrified Iron Fence proximity shock for wave mobs (2026-09-22, third
// report in a row: "the electric fence still isnt hurting enemies").
//
// Real cause, decompiled from the installed SecurityCraft jar
// ([1.20.1] SecurityCraft v1.10.2.1, ElectrifiedIronFenceBlock.
// hurtOrConvertEntity), not guessed: the fence only ever reacts inside
// vanilla's Block#entityInside, which the game calls ONLY for blocks whose
// cell overlaps the entity's own hitbox - and then SecurityCraft further
// requires the fence's collision shape (inflated by just 0.01) to intersect
// that hitbox, once per second. So a mob is hurt only while physically
// pressed INTO the fence. Vanilla pathfinding never does that: fences are
// PathType.FENCE, an impassable node, so a mob's path ends on the block
// NEXT to the fence and it stands at that block's centre, 0.2 blocks short
// of ever touching it. Every zombie ever seen "ignoring" a fence was
// standing exactly where the mod's own trigger can't reach. (For mobs the
// mod's damage is a fake lightning strike - Entity#thunderHit, 5 damage -
// so when contact does happen it works; contact is what never happens.)
//
// Fix: this script gives the fence a real reach against wave mobs. Once a
// second (the same cadence SecurityCraft itself uses), every td_wave_mob is
// checked for an electrified fence anywhere within FENCE_SHOCK_REACH of its
// own hitbox - i.e. standing in a cell adjacent to a fence counts, two
// cells away does not - and takes the fence's own damage type/amount
// (`securitycraft:electricity`, data/securitycraft/damage_type/
// electricity.json; 6.0, the literal in hurtOrConvertEntity) via the
// vanilla /damage command, so anything that keys off that damage type
// (electric_trap_player_safety.js, death messages) sees exactly what a real
// fence shock looks like. Vanilla's 10-tick invulnerability window can't
// eat a hit at this cadence. Only td_wave_mob, never by entity type (this
// pack's rule for every base-defense interaction - structure mobs must
// never be touched by base defenses), and td_structure_guard is excluded
// the same way stuck_mob_nudge.js does it.
//
// Cost: up to 3x3x2 block reads per wave mob per second (a fence's
// collision shape is 1.5 tall, so feet level and one above cover it) -
// ~20 reads/s/mob, a rounding error next to the pack's existing 10-tick
// entity scans. getBbWidth()/getBbHeight() are the same proven vanilla
// calls tesla_coil_cinematics.js already uses; getBlock(x,y,z).getId() is
// the pack-wide block-read idiom (wave_airdrop.js, stuck_mob_nudge.js).
// ServerEvents.tick (not PlayerEvents.tick) so it also runs with nobody
// online, matching tesla_coil_auto_power.js.
var FENCE_SHOCK_INTERVAL_TICKS = 20
var FENCE_SHOCK_DAMAGE = 6
var FENCE_SHOCK_REACH = 0.5 // blocks past the mob's own hitbox, horizontally
var FENCE_SHOCK_BLOCKS = ['securitycraft:electrified_iron_fence']
var FENCE_SHOCK_DAMAGE_TYPE = 'securitycraft:electricity'

function isNearElectrifiedFence(level, e) {
  var half = e.getBbWidth() / 2 + FENCE_SHOCK_REACH
  var x0 = Math.floor(e.getX() - half)
  var x1 = Math.floor(e.getX() + half)
  var z0 = Math.floor(e.getZ() - half)
  var z1 = Math.floor(e.getZ() + half)
  var y0 = Math.floor(e.getY())
  for (var x = x0; x <= x1; x++) {
    for (var z = z0; z <= z1; z++) {
      for (var y = y0; y <= y0 + 1; y++) {
        if (FENCE_SHOCK_BLOCKS.includes(`${level.getBlock(x, y, z).getId()}`)) return true
      }
    }
  }
  return false
}

ServerEvents.tick((event) => {
  var level = event.server.getLevel('minecraft:overworld')
  if (!level) return
  if (level.getTime() % FENCE_SHOCK_INTERVAL_TICKS !== 0) return
  var server = event.server
  level.getEntities().forEach((e) => {
    var tags = e.getTags()
    if (!tags.contains('td_wave_mob') || tags.contains('td_structure_guard')) return
    if (e.getHealth() <= 0) return
    if (!isNearElectrifiedFence(level, e)) return
    var x = e.getX()
    var y = e.getY() + e.getBbHeight() / 2
    var z = e.getZ()
    server.runCommandSilent(`damage ${e.uuid} ${FENCE_SHOCK_DAMAGE} ${FENCE_SHOCK_DAMAGE_TYPE}`)
    server.runCommandSilent(`particle minecraft:electric_spark ${x} ${y} ${z} 0.3 0.5 0.3 0.05 20`)
    server.runCommandSilent(`playsound minecraft:entity.lightning_bolt.impact hostile @a ${x} ${e.getY()} ${z} 0.3 1.6`)
  })
})
