// "Bounties" quest chapter (bounties.snbt) - persistent hostile-kill
// counter, real trap/turret kills included on purpose (2026-09-05).
//
// Real design constraint, not guessed: decompiled every trap currently in
// this pack (Trapcraft's SpikesBlock/BearTrapTileEntity, Create Addition's
// BarbedWireBlock) and NONE of them attach a killer entity to their damage
// source - Spikes uses `damageSources().cactus()`, Bear Trap uses
// `damageSources().mobAttack(null)`, Barbed Wire uses its own custom
// "createaddition:barbed_wire" type. All three are anonymous/no-attacker by
// design. That rules out "does this death have a known killer entity" as
// the inclusion test - it would silently exclude every trap kill that
// exists in this pack today, which is exactly the outcome this chapter is
// supposed to reward.
//
// Real fix: classify by the damage TYPE's registry id instead of by
// attacker, and default to counting - only exclude a small, genuinely-no-
// cause blocklist (fire, drowning, falling, starving, freezing, void,
// cramming, suffocation, and /kill-style generic_kill). Any current trap/
// turret's own damage type, and any future one a new mod adds, counts
// automatically with zero code change needed when the trap/turret roster
// changes - the same property the mob-side roster below still can't have.
//
// Confirmed live in a sandbox (not assumed): `event.source.typeHolder().
// unwrapKey().get().location()` reliably returns the real registry id
// ("minecraft:generic_kill", "minecraft:in_wall", etc.) even though
// `getMsgId()`/`getEntity()`/`getDirectEntity()` all fail from Rhino in
// this build - a different slice of the same curated-dispatch gap already
// documented elsewhere in this codebase. MobCategory has the identical gap
// on the entity side (`entity.type.category`/`.getCategory()` both fail
// live, matching no_passive_mobs.js's own finding for the passive-mob
// case), so HOSTILE_TYPES below stays a real hand-maintained id list, same
// as every other copy of it in this codebase - that part of the ask isn't
// achievable in this exact build, flagged rather than silently skipped.

// Same list as wave_status.js's HOSTILE_TYPES/wave_spawner.js/
// pedestal_health.js/loot_bag_drops.js/flesh_death_sound.js/mob_aggro.js/
// epicsiegemod-common.toml - keep in sync if the roster changes again.
// Named uniquely (not "HOSTILE_TYPES") - confirmed live this session that
// top-level var/const DOES share scope across server_scripts in this
// build (despite the older belief otherwise), and reusing that exact name
// crashed wave_status.js on boot with "redeclaration of var HOSTILE_TYPES"
// the first time this file was tested. Every other file's own roster copy
// already uses a distinct name for the same reason (WAVE_MOB_TYPES,
// PEDESTAL_WAVE_MOB_TYPES, EPIC_MOBS, HIGH_TIER_DEATH_SOUND_TYPES) - this
// one just hadn't been caught yet since nothing had collided with the
// literal name "HOSTILE_TYPES" itself until now.
var BOUNTY_HOSTILE_TYPES = [
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

// Real vanilla damage_type registry ids with no player/defense involvement
// at all - checked directly against the actual 1.20.1 data/minecraft/
// damage_type registry, not guessed. generic_kill is what /kill and
// /tdforceclear-style commands produce - deliberately excluded so admin/
// debug kills don't inflate the tally.
var BOUNTY_EXCLUDED_DAMAGE_TYPES = [
  'minecraft:in_fire',
  'minecraft:on_fire',
  'minecraft:lava',
  'minecraft:drown',
  'minecraft:starve',
  'minecraft:freeze',
  'minecraft:fall',
  'minecraft:out_of_world',
  'minecraft:cramming',
  'minecraft:in_wall',
  'minecraft:generic_kill',
]

// bounties.snbt's tasks are `type: "custom"`, not "checkmark" (2026-09-08
// fix, real ask: bounties should complete on the kill event, not be
// clickable). Decompiled dev/ftb/mods/ftbquests/quest/task/CheckmarkTask
// directly: its canSubmit() is hardcoded `return true` - any player could
// click a checkmark bounty complete for free, no kills required. CustomTask
// defaults enableButton=false (no player click possible) and check=null
// (no periodic auto-check either) - completely inert until something
// external drives it, exactly this file's `ftbquests change_progress
// ... complete` below, which calls Task's own type-agnostic
// forceProgress() and doesn't care what task type it's hitting.
var BOUNTY_OBJECTIVE = 'td_hostile_kills'
var BOUNTY_MOD_OBJECTIVE = 'td_bountyMod1500'
var BOUNTY_REPEATABLE_INTERVAL = 1500
var BOUNTY_REPEATABLE_TASK_ID = '1355429CD45AF725'

// Fixed one-time tiers - bounties.snbt's own quest ids.
var BOUNTY_FIXED_TIERS = [
  { threshold: 25, taskId: '42F2080CC88FFF1F' },
  { threshold: 100, taskId: 'A690E47C2C2FFDB5' },
  { threshold: 300, taskId: '57C0DB55E9655079' },
  { threshold: 750, taskId: '81F132C101C25BDA' },
]

ServerEvents.loaded((event) => {
  var server = event.server
  server.runCommandSilent(`scoreboard objectives add ${BOUNTY_OBJECTIVE} dummy {"text":"Hostile Kills"}`)
  // Scratch objective for the repeatable tier's modulo check below - never
  // displayed, holds a working copy of the kill count plus a fake-player
  // literal-value holder (#const) for the vanilla scoreboard-math idiom
  // (`operation ... %=` needs a real score on both sides, not a literal).
  server.runCommandSilent(`scoreboard objectives add ${BOUNTY_MOD_OBJECTIVE} dummy`)
  server.runCommandSilent(`scoreboard players set #const ${BOUNTY_MOD_OBJECTIVE} ${BOUNTY_REPEATABLE_INTERVAL}`)
})

function bountyDamageTypeId(source) {
  try {
    return `${source.typeHolder().unwrapKey().get().location()}`
  } catch (e) {
    return null
  }
}

EntityEvents.death((event) => {
  var entity = event.entity
  if (!BOUNTY_HOSTILE_TYPES.includes(`${entity.type}`)) return

  var typeId = bountyDamageTypeId(event.source)
  if (typeId !== null && BOUNTY_EXCLUDED_DAMAGE_TYPES.includes(typeId)) return

  var server = event.level.getServer()
  server.runCommandSilent(`scoreboard players add @a ${BOUNTY_OBJECTIVE} 1`)

  // Exact-score match, not a range - kills only ever increment by 1, so
  // the score passes through each threshold exactly once. Avoids re-
  // issuing `change_progress complete` on every kill for the rest of the
  // game once a tier is already past.
  BOUNTY_FIXED_TIERS.forEach((tier) => {
    server.runCommandSilent(
      `execute as @a[scores={${BOUNTY_OBJECTIVE}=${tier.threshold}}] run ftbquests change_progress @s complete ${tier.taskId}`
    )
  })

  // Repeatable tier - pure vanilla scoreboard math (copy kill count into a
  // scratch objective, mod by the interval, check for an exact 0) rather
  // than a script-side claims counter, so this can't drift out of sync
  // with the real running kill total.
  server.runCommandSilent(`execute as @a run scoreboard players operation @s ${BOUNTY_MOD_OBJECTIVE} = @s ${BOUNTY_OBJECTIVE}`)
  server.runCommandSilent(`execute as @a run scoreboard players operation @s ${BOUNTY_MOD_OBJECTIVE} %= #const ${BOUNTY_MOD_OBJECTIVE}`)
  server.runCommandSilent(
    `execute as @a[scores={${BOUNTY_MOD_OBJECTIVE}=0}] run ftbquests change_progress @s complete ${BOUNTY_REPEATABLE_TASK_ID}`
  )
})
