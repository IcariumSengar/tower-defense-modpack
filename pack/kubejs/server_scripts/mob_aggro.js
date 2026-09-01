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
//
// Real bug found in playtest (2026-09-01): the marker lookup below used
// to call e.hasTag(...), which doesn't exist on either KubeJS's own
// entity wrapper or vanilla's real Entity class (same wrong-method
// mistake independently made in wave_spawner.js/wave_status.js, fixed
// there the same day) - this threw every throttled tick WHENEVER
// td_amuletOnPedestal was true, aborting the whole handler before ever
// reaching the aggro loop below. Real user-visible symptom this
// explains: wave mobs would summon correctly (confirmed separately)
// but never path toward the player at all - reads exactly like "the
// horn works but nothing spawns in." Fixed to the real vanilla method,
// getTags().contains(...), confirmed by decompiling Entity.class.
//
// Amulet pedestal redirect (2026-08-30, docs/FEATURES.md "The amulet"):
// while td_amuletOnPedestal is true, every wave mob targets the marker
// armor stand amulet_pedestal.js spawns at the pedestal instead of the
// player — the whole point of "leaving it behind." Falls back to
// targeting the player if the flag is set but no marker is actually
// found (shouldn't happen, but a missing target is worse than a wrong
// one). Checked once per throttled tick, not per mob, since it's the
// same flag/entity for every mob in the loop.

var WAVE_MOB_TYPES = [
  'minecraft:zombie',
  'minecraft:skeleton',
  'minecraft:spider',
  'minecraft:wither_skeleton',
  'minecraft:ravager',
  'the_flesh_that_hates:flesh_human',
  'the_flesh_that_hates:flesh_villager',
  'the_flesh_that_hates:plaquecreaturetwo',
  'the_flesh_that_hates:flesh_suffer',
  'the_flesh_that_hates:bruteplaquecreatureone',
  'the_flesh_that_hates:flesh_hunter_two',
  'the_flesh_that_hates:flesh_boomer',
  'the_flesh_that_hates:plaquethreelegcreature',
]

PlayerEvents.tick(function (event) {
  var player = event.entity
  var level = player.getLevel()

  if (level.getTime() % 10 !== 0) return

  var onPedestal = player.persistentData.getBoolean('td_amuletOnPedestal')
  var aggroTarget = player
  if (onPedestal) {
    var marker = level.getEntities().find(function (e) {
      return e.getTags().contains('td_amulet_marker')
    })
    if (marker) aggroTarget = marker
  }

  level.getEntities().forEach(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return
    e.setTarget(aggroTarget)
  })
})
