// Forces spawned wave mobs to always target the player, regardless of
// line of sight. generic.follow_range (see wave_spawner.js) only helps
// a mob notice the player *faster once it can already see them* — it
// doesn't help acquire a target through obstructed terrain, which will
// matter once the pack moves off Superflat (see docs/IDEAS.md). This
// script bypasses vanilla's sight-based target-acquisition entirely.
//
// Calls Mob#setTarget(player) directly — a real, standard vanilla
// method (not remapped/hidden by KubeJS), same category of API as
// getX()/getServer()/playSound() that's worked reliably in this
// codebase, unlike bare properties like .x/.y/.z (see wave_spawner.js's
// notes on that). Once a mob has a target, its own attack-goal AI paths
// toward it using normal pathfinding (navigates around obstacles, digs/
// breaks per Epic Siege Mod) — this only forces WHO the target is, not
// how the mob gets there.
//
// No distance limit — every wave mob everywhere always targets the
// player, per explicit design request (not just "notices sooner").
// Throttled to every 10 ticks (twice a second), not every tick —
// setTarget is idempotent, no need to call it 20x/second.
//
// Not yet tested in-game — Mob#setTarget is a very standard, unchanged-
// across-versions vanilla method, high confidence, but flagging given
// how many "should be fine" assumptions turned out wrong earlier in
// this pack's debugging (Math.PI, bare .x/.y/.z).

var WAVE_MOB_TYPES = [
  'minecraft:zombie',
  'minecraft:skeleton',
  'minecraft:spider',
  'minecraft:witch',
  'minecraft:wither_skeleton',
  'minecraft:ravager',
  'the_flesh_that_hates:flesh_human',
  'the_flesh_that_hates:flesh_villager',
  'the_flesh_that_hates:plaquecreaturetwo',
  'the_flesh_that_hates:flesh_suffer',
]

PlayerEvents.tick(function (event) {
  var player = event.entity
  var level = player.getLevel()

  if (level.getTime() % 10 !== 0) return

  level.getEntities().forEach(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return
    e.setTarget(player)
  })
})
