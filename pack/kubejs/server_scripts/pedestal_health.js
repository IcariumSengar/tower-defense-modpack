// Deterministic pedestal HP (2026-09-06, direct ask: "is there a way to
// give it health like a player and this is how the mobs destroy it").
// Replaces reliance on Epic Siege Mod's own `blockTargets` config for
// actually damaging the pedestal - that stayed inconclusive even after
// the mob-pathing fix (mob_aggro.js, see its own writeup) was meant to
// give ESM_EntityTargetBlock a fair shot at firing once mobs reliably
// camp at a fixed point instead of re-chasing the player. Real playtest
// confirmed it's still not damaging the pedestal. Same "poll world/
// persistentData state from a throttled tick handler" pattern as
// pedestal_destruction.js/wave_status.js/mob_aggro.js, not another
// mod's opaque AI a second time. ESM's blockTargets config is left in
// place regardless (harmless, already shipped) - this is additive.
//
// Every wave mob already targets the pedestal marker unconditionally
// (mob_aggro.js) - being within real melee range is a sufficient proxy
// for "hitting it," no need to hook a real attack/swing event.
//
// Damage per hit is read from the attacking mob's own real
// generic.attack_damage attribute via mob.getAttribute(id).getValue() -
// confirmed working in this exact KubeJS build via a sandbox probe
// (returns a real AttributeInstance, .getValue() read a live zombie's
// base 3 correctly) before relying on it here, same "verify the clean
// name actually resolves" bar as mob_aggro.js's own reflection work.
// Tougher mobs (Mutants and Zombies' Brutes, TFTH's elites) chip through
// faster this way, matching the escalating-horde theme, instead of a
// flat number that treats every mob the same.
//
// At 0 HP, calls triggerPedestalDestroyed() - the same shared function
// pedestal_destruction.js's own block-gone detection uses, factored out
// there for exactly this reuse (see that file's header). Top-level
// function declarations share scope across server_scripts files in this
// exact KubeJS/Rhino build - confirmed directly in a sandbox (a
// zzprobe.js in a different file read `typeof triggerPedestalDestroyed`
// as `'function'`) before relying on it here, not assumed from this
// pack's own older "server_scripts don't reliably share top-level
// scope" belief (see feedback_rhino_java_reflection_quirks.md - that
// belief covered function-sharing specifically, which this now
// contradicts with a real, tested exception).
//
// First-pass numbers, not tuned by a real playtest yet (same "needs
// real tuning" allowance as every other numeric first-pass in this
// pack). 200 total HP, checked once/second (throttled like
// pedestal_destruction.js), one "hit" per mob in range per check -
// roughly one real attack per second per mob, close enough to vanilla
// melee cadence for a first pass without tracking each mob's own
// individual attack cooldown. A lone vanilla zombie (3 dmg/hit) needs
// ~67 checks (~67 seconds) to solo it; a 10-mob mixed horde averaging
// ~5 dmg each clears it in ~4 seconds - matches "if im not in the base
// to defend it then i lose the game" without being one-shot-able by a
// single trash mob.
var PEDESTAL_MELEE_RANGE = 3.0
var PEDESTAL_MELEE_RANGE_SQ = PEDESTAL_MELEE_RANGE * PEDESTAL_MELEE_RANGE

// Same roster as mob_aggro.js's WAVE_MOB_TYPES / wave_status.js's
// HOSTILE_TYPES / wave_spawner.js's own copy - duplicated per-file per
// this codebase's established convention (keep all four in sync if the
// roster changes again), not relying on the cross-file sharing this
// file's own triggerPedestalDestroyed() call above already leans on for
// something more targeted and safer to depend on.
// TFTH removed entirely 2026-09-04 (real playtest feedback) - see
// wave_spawner.js's WAVES header comment for the full replacement
// mapping/rationale.
var PEDESTAL_WAVE_MOB_TYPES = [
  'minecraft:zombie',
  'minecraft:husk',
  'minecraft:drowned',
  'minecraft:zombie_villager',
  'mutantszombies:mutant_zombie',
  'mutantszombies:blister_zombie',
  'mutantszombies:split_head_zombie',
  'zombiesmore:boomer_zombie',
  'undeadnights:elite_zombie',
  'undeadnights:horde_zombie',
  'undeadnights:demolition_zombie',
  'mutantszombies:zombie_brute',
  'mutantszombies:mutant_brute',
  'mutantszombies:rotten_mutant',
  'mutantszombies:crawler',
]

// Always-visible-in-range HP bossbar (2026-09-04, real playtest
// feedback batch: "always-visible-in-range" chosen over "only when
// looking at it" - Jade can't do a custom HP readout for a KubeJS
// block's own persistent-data value without real Java code, so this
// reuses the same "tick-poll + real vanilla command" pattern as
// everything else in this file instead of a new client-rendering
// surface). Real vanilla `/bossbar` - `players <selector>` each check
// naturally shows/hides it per-player based on live distance, no manual
// per-player tracking needed; safe to call redundantly (idempotent, no
// different from `forceload add` elsewhere in this pack).
var PEDESTAL_BOSSBAR_ID = 'kubejs:pedestal_health'
var PEDESTAL_BOSSBAR_RANGE = 64

// Named constant, 2026-09-05 (was a bare 200 literal duplicated in 3
// places - here, the bossbar max just below, and
// playtest_starter_kit.js's own starting td_pedestalHealth set, which
// must match this). Bumped 200 -> 300 same day (direct ask: "pedestal
// starting HP up").
var PEDESTAL_MAX_HEALTH = 300

function ensurePedestalBossbar(server, data) {
  if (data.getBoolean('td_pedestalBossbarAdded')) return
  data.putBoolean('td_pedestalBossbarAdded', true)
  server.runCommandSilent(`bossbar add ${PEDESTAL_BOSSBAR_ID} "Pedestal"`)
  server.runCommandSilent(`bossbar set ${PEDESTAL_BOSSBAR_ID} color red`)
  server.runCommandSilent(`bossbar set ${PEDESTAL_BOSSBAR_ID} max ${PEDESTAL_MAX_HEALTH}`)
}

function updatePedestalBossbar(server, health, x, z) {
  server.runCommandSilent(`bossbar set ${PEDESTAL_BOSSBAR_ID} value ${health}`)
  server.runCommandSilent(`bossbar set ${PEDESTAL_BOSSBAR_ID} players @a[x=${x},z=${z},distance=..${PEDESTAL_BOSSBAR_RANGE}]`)
}

// Distance-independent under-attack alert (2026-09-05, direct ask - a
// real lost run: a crawler slipped in and destroyed the pedestal while
// the player was off fighting a horde elsewhere, with zero warning -
// "all of it silent and unknown to me"). The bossbar above is
// deliberately distance-limited (only shows within
// PEDESTAL_BOSSBAR_RANGE) - fine for ambient status, useless as an
// alert for a player who isn't nearby, which is exactly the scenario
// that needs one most. This broadcasts to every player (`@a`,
// title/subtitle + a sound run via `execute as @a at @s` so it plays at
// each player's own position with no distance falloff, not the
// pedestal's - the whole point is it must be heard from anywhere).
//
// Tier-based, not per-hit - a sustained horde attack deals damage every
// single check (once/second), so alerting on every hit would spam
// during exactly the moments that matter most. Alerts fire only when
// HEALTH DROPS INTO a new, more severe tier than the last one already
// alerted (first damage taken at all, then 50%/25%/10% of max) -
// checked via strict `newTier > lastAlertTier`, so this naturally goes
// quiet again if a future heal (item #11, not yet built - that code
// should update td_pedestalAlertTier down to match, so a later re-attack
// can re-alert from the lower baseline) pushes health back up.
var PEDESTAL_ALERT_SOUND = 'minecraft:block.anvil.land'

function pedestalAlertTierForHealth(health, maxHealth) {
  if (health <= maxHealth * 0.1) return 4
  if (health <= maxHealth * 0.25) return 3
  if (health <= maxHealth * 0.5) return 2
  if (health < maxHealth) return 1
  return 0
}

var PEDESTAL_ALERT_MESSAGES = {
  1: ['THE PEDESTAL IS UNDER ATTACK', 'Something has found it - get back now.'],
  2: ['THE PEDESTAL IS HALFWAY GONE', "It won't hold much longer."],
  3: ['THE PEDESTAL IS CRITICAL', 'Get back NOW.'],
  4: ['THE PEDESTAL IS ABOUT TO FALL', 'This is it - move!'],
}

// Subtitle-only, not title+subtitle (2026-09-08, direct ask: "way too
// large, reduce a lot"). Dropping the big bold title line entirely rather
// than just shrinking the pair - the empty title still triggers the
// display window (subtitle only ever shows alongside an active title
// lifecycle), the flavor line (msg[1]) moves to a real tellraw chat
// message instead of being dropped, since chat is a separate channel that
// won't get overwritten by wave_status.js's own actionbar-based hostile
// counter the way a second title/subtitle call would.
function firePedestalAlert(server, tier) {
  var msg = PEDESTAL_ALERT_MESSAGES[tier]
  if (!msg) return
  server.runCommandSilent(`title @a title {"text":""}`)
  server.runCommandSilent(`title @a subtitle {"text":"${msg[0]}","color":"red","bold":true}`)
  server.runCommandSilent(`tellraw @a {"text":"${msg[1]}","color":"gold"}`)
  server.runCommandSilent(`execute as @a at @s run playsound ${PEDESTAL_ALERT_SOUND} hostile @s ~ ~ ~ 1 1`)
}

// Real heal mechanics, 2026-09-05 (quick-fix scope only, per direct
// instruction - the bigger "upgrade points for health/armor/thorns"
// idea stays parked in IDEAS.md, not built here). Shared by both the
// golden carrot/nether star right-click handler below and wave_status.js's
// own +20%-per-wave-clear heal (a top-level function, reachable
// cross-file - same confirmed-shared-scope exception this file's own
// triggerPedestalDestroyed() call already relies on, see this file's
// header comment for the real sandbox test that established it).
// Resets td_pedestalAlertTier DOWN when a heal actually raises health
// past a previously-alerted tier boundary, so a later re-attack can
// alert again from the new, lower baseline instead of staying silent
// because a higher tier was already "used up" - the alert system's own
// comment promised this when it was built.
// Visible/audible heal cue (2026-09-08, direct feedback: consuming a
// golden carrot/nether star was only confirmed by the chat message - "not
// till I tried to take it off that it was obvious that the item had been
// consumed"). Fires at the pedestal's own position for any heal, additive
// to the existing chat message - not a replacement. Shared by both the
// right-click heal below and wave_status.js's own per-wave-clear heal,
// since both go through healPedestalBy().
function firePedestalHealEffect(server, x, y, z) {
  server.runCommandSilent(`particle minecraft:totem_of_undying ${x} ${y + 1} ${z} 0.4 0.5 0.4 0.02 30`)
  server.runCommandSilent(`playsound minecraft:block.beacon.power_select block @a ${x} ${y} ${z} 1 1`)
}

// `data` is the shared world-state object (see world_state.js) in every
// real call path since 2026-09-08's multiplayer fix - wave_status.js's
// own per-wave-clear heal already passes its own (now shared) `data`
// through, and the right-click heal handler below sources it the same
// way. HP, the destroyed flag, and the alert tier are all real shared
// pedestal state - two players healing/damaging their own separate
// copies would desync exactly like the wave/pedestal state this same
// fix pass corrected elsewhere.
function healPedestalBy(player, data, amount) {
  if (data.getBoolean('td_pedestalDestroyed')) return false
  if (!data.contains('td_pedestalHealth')) return false
  var current = data.getInt('td_pedestalHealth')
  if (current <= 0) return false
  var newHealth = Math.min(PEDESTAL_MAX_HEALTH, current + amount)
  data.putInt('td_pedestalHealth', newHealth)
  var newTier = pedestalAlertTierForHealth(newHealth, PEDESTAL_MAX_HEALTH)
  if (newTier < data.getInt('td_pedestalAlertTier')) {
    data.putInt('td_pedestalAlertTier', newTier)
  }
  var px = data.getInt('td_pedestalX')
  var py = data.getInt('td_pedestalY')
  var pz = data.getInt('td_pedestalZ')
  updatePedestalBossbar(player.getServer(), newHealth, px, pz)
  firePedestalHealEffect(player.getServer(), px, py, pz)
  return true
}

// Percent-of-max wrapper, used by callers (wave_status.js's own
// +20%-per-wave-clear heal) that can't safely reference
// PEDESTAL_MAX_HEALTH directly - top-level var/const does NOT reliably
// share scope across server_scripts in this build, only top-level
// FUNCTION declarations do (see this file's header comment for the real
// sandbox test behind that distinction). Keeps the actual max-HP number
// defined in exactly one place.
function healPedestalByPercent(player, data, percent) {
  return healPedestalBy(player, data, Math.round(PEDESTAL_MAX_HEALTH * percent))
}

// Golden carrot = 10% heal, nether star = full (100%) heal - the rare/
// premium option, direct ask.
//
// **Real bug found + fixed 2026-09-08** (live report: right-click heals
// the pedestal and the item visibly sits on it; right-clicking again to
// take it back makes it "disappear" - not actually there, but not really
// gone either, a phantom that occupies an inventory slot with nothing
// real behind it). Root cause: this used to be a BlockEvents.rightClicked
// handler that called event.cancel() + stack.shrink(1), trying to both
// consume the item AND stop Supplementaries' own native "place held item
// on the pedestal" interaction from also happening on the same click.
// event.cancel() doesn't reliably suppress that - the block's own
// ItemDisplayTile placement still visually goes through (client-predicted
// before server confirmation), racing this handler's own shrink(1). Two
// systems both thought they owned the item at once - exactly the
// add/remove desync class already fixed once before for the rabbit-ghost
// bug (see docs/QUEUE.md's 7-item batch, item 2).
//
// Fixed the same way amulet_pedestal.js already solves the identical
// "don't fight Supplementaries' own interaction" problem for the amulet:
// don't intercept the click at all. Let the native placement happen
// normally (no race), poll the pedestal's own real Container slot
// (getDisplayedItem(), same call amulet_pedestal.js's own tick-poll
// already proved reachable from KubeJS), and when a healing item is
// actually sitting there, heal + consume it for real via
// setDisplayedItem(air) - a real setter on Moonlight's ItemDisplayTile
// (decompiled directly, not guessed), the same base class
// PedestalBlockTile extends. This makes the pedestal's own display slot
// the single source of truth for "is an item here," never two competing
// paths again.
var PEDESTAL_HEAL_ITEMS = {
  'minecraft:golden_carrot': { percent: 0.1, message: "§d[Pedestal] §fThe carrot's glow seeps into the stone. It holds a little steadier." },
  'minecraft:nether_star': { percent: 1.0, message: '§d[Pedestal] §fSomething ancient answers. The pedestal is whole again.' },
}

PlayerEvents.tick((event) => {
  var player = event.entity
  var level = player.getLevel()
  // Real multiplayer fix, 2026-09-08 (see world_state.js) - shared
  // pedestal state, not player.persistentData.
  var data = worldData(level)
  if (!data || !data.contains('td_pedestalX')) return

  if (level.getTime() % 10 !== 0) return

  var x = data.getInt('td_pedestalX')
  var y = data.getInt('td_pedestalY')
  var z = data.getInt('td_pedestalZ')
  if (`${level.getBlock(x, y, z).id}` !== 'supplementaries:pedestal') return

  var pedestalTile = level.getBlockEntity([x, y, z])
  if (!pedestalTile) return

  var displayed
  try {
    displayed = pedestalTile.getDisplayedItem()
  } catch (e) {
    return
  }
  if (!displayed || displayed.isEmpty()) return

  var heal = PEDESTAL_HEAL_ITEMS[`${displayed.id}`]
  if (!heal) return
  if (!healPedestalByPercent(player, data, heal.percent)) return
  pedestalTile.setDisplayedItem(Item.of('minecraft:air'))
  // Toast, not chat (2026-09-09, real playtest ask: "less noise from the
  // chat window") - no existing popup covers a manual heal-item use.
  player.notify(heal.message)
})

// Right-click-to-heal (2026-09-09, direct ask: "the quest book says to
// heal the pedestal you put the item on it and it disappears - I want to
// just right click it and it heals, not putting the item on it... if the
// amulet is on it, then this mechanic would work properly"). Gated on
// td_amuletOnPedestal (amulet_pedestal.js) specifically, per that exact
// ask, not just "a heal item is in hand." That gating is also what makes
// this safe to hook directly, unlike the tick-poll heal above's own real
// history (see its header): with the amulet already occupying the
// pedestal's one display slot, Supplementaries' own canPlaceItem (no item
// TYPE filter, "just checks the slot is empty" - amulet_pedestal.js's own
// header) can never place anything else there, so nothing competes with
// this handler for the same click the way a duplicate placement attempt
// once did. Checked against the real stored pedestal coordinate, not just
// the block id - Supplementaries' pedestal is a normal placeable block a
// player could put down elsewhere too.
//
// Real limitation, not glossed over: not yet right-clicked in a live
// game - flag this for confirmation on the next playtest, same bar as
// every other untested first pass in this file.
BlockEvents.rightClicked('supplementaries:pedestal', (event) => {
  var player = event.entity
  var level = player.getLevel()
  var data = worldData(level)
  if (!data || !data.getBoolean('td_amuletOnPedestal')) return
  if (!data.contains('td_pedestalX')) return

  var pos = event.getBlock().getPos()
  if (pos.getX() !== data.getInt('td_pedestalX') || pos.getY() !== data.getInt('td_pedestalY') || pos.getZ() !== data.getInt('td_pedestalZ')) return

  var heal = PEDESTAL_HEAL_ITEMS[`${event.item.id}`]
  if (!heal) return
  if (!healPedestalByPercent(player, data, heal.percent)) return

  event.item.shrink(1)
  event.cancel()
  player.notify(heal.message)
})

function pedestalAttackDamage(mob) {
  try {
    var attr = mob.getAttribute('minecraft:generic.attack_damage')
    if (attr) return attr.getValue()
  } catch (e) {
    // Never let one mob's attribute lookup failing break the whole
    // tick handler - worst case this specific mob deals no damage this
    // check instead of a hard crash for every player online.
  }
  return 0
}

PlayerEvents.tick((event) => {
  var player = event.entity
  var level = player.getLevel()
  // Real multiplayer fix, 2026-09-08 (see world_state.js) - shared
  // pedestal state, not player.persistentData.
  var data = worldData(level)
  if (!data) return

  // Already destroyed, or the base hasn't finished building yet this
  // login (td_pedestalHealth is only set once playtest_starter_kit.js's
  // build finishes) - either way, nothing to check.
  if (data.getBoolean('td_pedestalDestroyed')) return
  if (!data.contains('td_pedestalHealth')) return

  if (level.getTime() % 20 !== 0) return

  var x = data.getInt('td_pedestalX') + 0.5
  var y = data.getInt('td_pedestalY') + 0.5
  var z = data.getInt('td_pedestalZ') + 0.5

  ensurePedestalBossbar(player.getServer(), data)

  var damage = 0
  level.getEntities().forEach((e) => {
    if (!PEDESTAL_WAVE_MOB_TYPES.includes(`${e.type}`)) return
    var dx = e.getX() - x
    var dy = e.getY() - y
    var dz = e.getZ() - z
    if (dx * dx + dy * dy + dz * dz > PEDESTAL_MELEE_RANGE_SQ) return
    damage += pedestalAttackDamage(e)
  })
  if (damage <= 0) {
    updatePedestalBossbar(player.getServer(), data.getInt('td_pedestalHealth'), data.getInt('td_pedestalX'), data.getInt('td_pedestalZ'))
    return
  }

  var health = data.getInt('td_pedestalHealth') - damage
  if (health > 0) {
    data.putInt('td_pedestalHealth', health)
    updatePedestalBossbar(player.getServer(), health, data.getInt('td_pedestalX'), data.getInt('td_pedestalZ'))
    var newAlertTier = pedestalAlertTierForHealth(health, PEDESTAL_MAX_HEALTH)
    if (newAlertTier > data.getInt('td_pedestalAlertTier')) {
      data.putInt('td_pedestalAlertTier', newAlertTier)
      firePedestalAlert(player.getServer(), newAlertTier)
    }
    return
  }

  firePedestalAlert(player.getServer(), 4)
  data.putInt('td_pedestalHealth', 0)

  // Visually match "the pedestal has fallen" - break the actual block
  // instead of leaving it standing while the world already treats it as
  // destroyed. Same block-id pair pedestal_destruction.js's own check
  // accepts (supplementaries:pedestal on every new world, the old
  // kubejs:amulet_pedestal kept registered for pre-2026-09-05 saves).
  var bx = data.getInt('td_pedestalX')
  var by = data.getInt('td_pedestalY')
  var bz = data.getInt('td_pedestalZ')
  player.getServer().runCommandSilent(`setblock ${bx} ${by} ${bz} minecraft:air destroy`)
  player.getServer().runCommandSilent(`bossbar remove ${PEDESTAL_BOSSBAR_ID}`)

  triggerPedestalDestroyed(player)
})
