// Live "hostiles remaining" counter (action bar) plus a chat message
// when a wave clears. Tracks all nearby hostile mobs — matches
// wave_spawner.js's roster, including the TFTH mobs folded back in
// starting wave 2 (2026-08-19).
//
// Deliberately does NOT send its own "wave incoming" chat message —
// wave_spawner.js already sends one (with the mob count, which this
// script doesn't know), so this used to duplicate it. Only sends
// "defeated," which nothing else covers.
//
// Same mob-type-list duplication pattern as loot_bag_drops.js and
// wave_spawner.js — KubeJS server_scripts don't reliably share top-level
// scope across files. Keep all three in sync if the mob roster changes.
//
// Uses .getX()/.getY()/.getZ(), not bare .x/.y/.z — confirmed in
// wave_spawner.js's debugging that the bare-property form produces NaN
// for position in this environment. This was silently broken the same
// way (the counter would never have matched real distances), just
// never surfaced since nothing depended on catching the error.

const HOSTILE_TYPES = [
  'minecraft:zombie',
  'minecraft:husk',
  'minecraft:drowned',
  'minecraft:skeleton',
  'minecraft:spider',
  'minecraft:creeper',
  'minecraft:zombie_villager',
  'minecraft:witch',
  'minecraft:wither_skeleton',
  'minecraft:ravager',
  'the_flesh_that_hates:flesh_human',
  'the_flesh_that_hates:flesh_villager',
  'the_flesh_that_hates:plaquecreaturetwo',
  'the_flesh_that_hates:flesh_suffer',
]

const RADIUS = 80

// Must match wave_spawner.js's WAVES.length — server_scripts don't
// reliably share top-level scope across files (same duplication pattern
// as HOSTILE_TYPES above), so this is redeclared here rather than
// imported. Drives both the wave-number display cap below and the
// starter gear removal trigger (was briefly split into its own
// GEAR_REMOVAL_WAVE = 2 for faster playtest iteration - confirmed
// working 2026-08-19, reset to the real wave 5 here).
const FINAL_WAVE = 5

// Tag set on the sword/armor in playtest_starter_kit.js — matching on
// this instead of item type is what lets removal target exactly the
// starter gear, not any netherite sword/iron armor legitimately
// crafted or looted since.
const STARTER_GEAR_TAG = 'td_starter_gear'

// Roguelike permanent buff choice - built 2026-08-20, removed the same
// day. The clickable /tellraw chat menu never reliably resolved (the
// player.hasTag(...) detection in the tick handler that used to sit
// below this comment apparently never caught the tag the chat click's
// clickEvent set), which left td_awaitingChoice permanently true once a
// wave cleared - silently blocking the Wave Horn from ever working
// again, and blocking the countdown timer below from ever starting
// (it only began once the choice resolved). One buggy feature caused
// three reported symptoms at once ("too buggy," horn blocked, "timer
// simply not working") - removed entirely per direct request rather
// than debugged further. Gear removal and the countdown both moved back
// to firing directly off the wave-clear edge, no choice step gating
// them. See docs/MODS.md's Wave-clear orchestration entry for the full
// post-mortem if this gets revisited.

// 3 minutes, in ticks (docs/IDEAS.md's "On-screen countdown timer to the
// next wave"). Countdown display + auto-trigger live in wave_spawner.js
// (see there for why), started here directly on wave-clear now that the
// choice step that used to gate it is gone.
const COUNTDOWN_TICKS = 3600

PlayerEvents.tick((event) => {
  const player = event.player
  const level = player.getLevel()

  // Throttled to every 4 ticks (5x/second), not every tick - this was
  // scanning the entire entity list unthrottled, all game long,
  // regardless of whether a wave was even active. mob_aggro.js already
  // throttles its own entity scan for the same reason (setTarget is
  // idempotent, no need to call it 20x/second) - this counter is a HUD
  // display, not something that needs literal 20fps precision either.
  if (level.getTime() % 4 !== 0) return

  const data = player.persistentData

  const hostileCount = level.getEntities().filter((e) => {
    if (!HOSTILE_TYPES.includes(`${e.type}`)) return false
    // A killed mob plays a ~1 second death animation before actually
    // being removed from the world, so it's still present in
    // getEntities() during that window - excluding anything already at
    // 0 health makes the counter match what the player visually sees,
    // not the ~1 second-delayed removal.
    if (e.getHealth() <= 0) return false
    const dx = e.getX() - player.getX()
    const dy = e.getY() - player.getY()
    const dz = e.getZ() - player.getZ()
    return dx * dx + dy * dy + dz * dz <= RADIUS * RADIUS
  }).length

  const wasInWave = data.getBoolean('td_inWave')
  // Capped at FINAL_WAVE (only that many waves are designed; calls
  // beyond that repeat the final wave's composition) - td_waveNumber
  // itself is an uncapped raw click-count, would otherwise show numbers
  // higher than any wave that's actually been designed.
  const waveNumber = Math.min(data.getInt('td_waveNumber'), FINAL_WAVE)

  if (hostileCount > 0) {
    player.setStatusMessage(`§c⚔ Wave ${waveNumber} — Hostiles remaining: ${hostileCount}`)
    if (!wasInWave) {
      data.putBoolean('td_inWave', true)
    }
  } else if (wasInWave) {
    data.putBoolean('td_inWave', false)
    player.tell(`§6[Wave] §aWave ${waveNumber} defeated!`)
    // Big on-screen title, same reasoning as wave_spawner.js's "incoming"
    // one — chat is easy to miss mid-fight.
    player.getServer().runCommandSilent(`title @a title {"text":"WAVE ${waveNumber} CLEARED","color":"green","bold":true}`)
    // Undo wave_spawner.js's night lock — back to day and a normally
    // advancing clock during the peaceful gap before the next horn use.
    player.getServer().runCommandSilent('time set day')
    player.getServer().runCommandSilent('gamerule doDaylightCycle true')

    // Starter gear removal, once, the moment the curated campaign's
    // final wave clears — waveNumber is capped at FINAL_WAVE, so every
    // repeat/endless wave past this point also reads as FINAL_WAVE; the
    // td_starterGearRemoved guard (same one-shot pattern as
    // td_playtestKitGiven) is what keeps this to a single firing rather
    // than re-running on every later wave clear. Fires directly here
    // now, not gated behind the removed choice-popup step.
    if (waveNumber === FINAL_WAVE && !data.getBoolean('td_starterGearRemoved')) {
      data.putBoolean('td_starterGearRemoved', true)

      // /clear reaches armor and offhand slots as well as the main
      // inventory (long-standing vanilla behavior, not KubeJS-specific),
      // and its item argument NBT-matches as a partial predicate in
      // 1.20.1 (pre-1.20.5 components rework) - the tag alone is enough
      // to match regardless of the Lore/Enchantments also present on the
      // real item. One command per item type since /clear takes a single
      // item argument, not a list. Targets @a rather than a specific
      // name/UUID - this pack is single-player-focused (see
      // base_expansion.js's notes), so it's equivalent here and avoids
      // needing to resolve the player's name from console context.
      player.getServer().runCommandSilent(`clear @a minecraft:netherite_sword{${STARTER_GEAR_TAG}:1b}`)
      player.getServer().runCommandSilent(`clear @a minecraft:iron_helmet{${STARTER_GEAR_TAG}:1b}`)
      player.getServer().runCommandSilent(`clear @a minecraft:iron_chestplate{${STARTER_GEAR_TAG}:1b}`)
      player.getServer().runCommandSilent(`clear @a minecraft:iron_leggings{${STARTER_GEAR_TAG}:1b}`)
      player.getServer().runCommandSilent(`clear @a minecraft:iron_boots{${STARTER_GEAR_TAG}:1b}`)

      // Same "big on-screen title, chat is easy to miss" reasoning as the
      // wave-cleared title above, plus the fuller narrative beat in chat
      // since a title can't carry more than a couple words legibly.
      player.getServer().runCommandSilent(`title @a title {"text":"IT'S UP TO YOU NOW","color":"red","bold":true}`)
      player.getServer().runCommandSilent(`title @a subtitle {"text":"The gear is gone. So is whoever wore it first.","color":"gray"}`)
      player.tell('§8§o[The blade and armor crumble to rust and dust in your hands.]')
      player.tell('§7Whoever carried this before you held the line for five waves before this place took them too. Their debt here is paid.')
      player.tell('§c§lIt\'s up to you now.')
    }

    // Countdown to next wave (docs/IDEAS.md's "On-screen countdown
    // timer") starts directly here now, right after wave-clear effects
    // (and wave-5 gear removal, if this was that wave) - no more choice
    // step to wait on. Display + auto-trigger live in wave_spawner.js,
    // see there for why.
    data.putInt('td_countdownEndTick', level.getTime() + COUNTDOWN_TICKS)
    data.putBoolean('td_countdownActive', true)
  }
})
