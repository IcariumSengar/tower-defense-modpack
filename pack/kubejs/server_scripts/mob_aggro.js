// Forces spawned wave mobs to always target the permanent pedestal
// marker, regardless of line of sight or where the player actually is.
// generic.follow_range (see wave_spawner.js) only helps a mob notice a
// target *faster once it can already see it* — it doesn't help acquire
// one through obstructed terrain, which will matter once the pack moves
// off Superflat (see docs/IDEAS.md). This script bypasses vanilla's
// sight-based target-acquisition entirely.
//
// Calls Mob#setTarget(marker) directly — a real, standard vanilla
// method (not remapped/hidden by KubeJS), same category of API as
// getX()/getServer()/playSound() that's worked reliably in this
// codebase, unlike bare properties like .x/.y/.z (see wave_spawner.js's
// notes on that). Once a mob has a target, its own attack-goal AI paths
// toward it using normal pathfinding (navigates around obstacles, digs/
// breaks per Epic Siege Mod) — this only forces WHO the target is, not
// how the mob gets there.
//
// No distance limit — every wave mob everywhere always targets the
// pedestal, per explicit design request ("this is the focus point for
// the enemies... if im not in the base to defend it then i lose the
// game" - not just "notices sooner", and not the player at all
// anymore). Throttled to every 10 ticks (twice a second), not every
// tick — setTarget is idempotent, no need to call it 20x/second.
//
// Not yet tested in-game — Mob#setTarget is a very standard, unchanged-
// across-versions vanilla method, high confidence, but flagging given
// how many "should be fine" assumptions turned out wrong earlier in
// this pack's debugging (bare .x/.y/.z, and Math.PI - confirmed real
// 2026-09-02, not just a flagged worry anymore: Math.PI/Math.E are
// undefined in this exact KubeJS/Rhino environment while Math's methods
// work fine, verified on a clean sandbox boot. This was the real,
// dominant cause behind the whole "wave mobs sometimes don't spawn"
// saga - see wave_spawner.js's randomPlayerRelativePosition() and
// amulet_pedestal.js's bob effect, both fixed the same day).
//
// Real bug found in playtest (2026-09-01): the marker lookup below used
// to call e.hasTag(...), which doesn't exist on either KubeJS's own
// entity wrapper or vanilla's real Entity class (same wrong-method
// mistake independently made in wave_spawner.js/wave_status.js, fixed
// there the same day) - this threw every throttled tick WHENEVER the
// pedestal objective was active, aborting the whole handler before ever
// reaching the aggro loop below. Real user-visible symptom this
// explains: wave mobs would summon correctly (confirmed separately)
// but never path toward the player at all - reads exactly like "the
// horn works but nothing spawns in." Fixed to the real vanilla method,
// getTags().contains(...), confirmed by decompiling Entity.class.
//
// Pedestal targeting is now unconditional and permanent (2026-09-05,
// docs/FEATURES.md's "Superseded" note - real premise correction:
// "regardless of whether the amulet is on the pedestal or not, this is
// the focus point for the enemies... if im not in the base to defend it
// then i lose the game"). Every wave mob always targets the marker
// armor stand playtest_starter_kit.js summons once at world-build time
// (tagged `td_pedestal_target`, never killed) - no more amulet-gated
// flag check, no more falling back to the player, since the marker is
// now permanent and guaranteed to exist from the moment the base is
// built. Checked once per throttled tick, not per mob, since it's the
// same entity for every mob in the loop.

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

// Self-healing marker (2026-09-05, real backward-compat need, not
// speculative): the permanent marker is normally only ever summoned
// once, in playtest_starter_kit.js's login handler - but that handler
// is itself gated to run once per world ever, so any save already in
// progress when this retrofit shipped will never get one from there.
// Re-summons it here instead, throttled far slower than the aggro
// check below (once every 5 real seconds is plenty for something that
// should only ever be genuinely missing right after this exact
// deploy), at the pedestal's own permanent td_pedestalX/Y/Z - the same
// coordinate playtest_starter_kit.js already uses, so an existing
// save's already-built base needs zero manual fix-up. Also doubles as
// a real safety net going forward if the marker is ever lost some
// other way. forceload add is idempotent - safe to call again even if
// that same save's old amulet-gated toggle already added it.
function ensurePedestalMarker(player, level) {
  var data = player.persistentData
  if (!data.contains('td_pedestalX')) return

  var existing = level.getEntities().find(function (e) {
    return e.getTags().contains('td_pedestal_target')
  })
  if (existing) return

  var x = data.getInt('td_pedestalX')
  var y = data.getInt('td_pedestalY')
  var z = data.getInt('td_pedestalZ')
  var server = player.getServer()
  server.runCommandSilent(`summon minecraft:armor_stand ${x + 0.5} ${y + 1} ${z + 0.5} {Invisible:1b,NoGravity:1b,Marker:1b,PersistenceRequired:1b,Tags:["td_pedestal_target"]}`)
  server.runCommandSilent(`forceload add ${x - 96} ${z - 96} ${x + 96} ${z + 96}`)
}

PlayerEvents.tick(function (event) {
  var player = event.entity
  var level = player.getLevel()

  if (level.getTime() % 100 === 0) ensurePedestalMarker(player, level)

  if (level.getTime() % 10 !== 0) return

  var aggroTarget = level.getEntities().find(function (e) {
    return e.getTags().contains('td_pedestal_target')
  })
  if (!aggroTarget) return

  level.getEntities().forEach(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return
    e.setTarget(aggroTarget)
  })
})
