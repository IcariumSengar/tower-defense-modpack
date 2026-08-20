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

// Roguelike permanent buff choice (docs/IDEAS.md's "Roguelike choice
// mechanics") - fires on every wave clear, not capped at FINAL_WAVE.
// "Start small, scale later" per the design doc: repeat picks of the
// same buff stack via amplifier (countKey tracks how many times picked),
// rather than building real branching wave-composition choice yet (the
// doc's second, deferred mechanic).
//
// ScreenJS was the design doc's planned mod for this popup - checked
// directly (2026-08-20) and it's dead, 1.19.2 only, last released April
// 2023. No actively-maintained alternative KubeJS GUI-screen addon
// exists for 1.20.1 either (the two closest hits, "KubeJS GUI
// Overhauled" and "KubeJS Studio," are a recipe-authoring tool and a dev
// IDE respectively - neither is a player-facing in-game menu). Built as
// a clickable /tellraw chat menu instead - zero new mod dependency, same
// vanilla-scriptable approach as everything else built this session.
const BUFF_OPTIONS = [
  {
    id: 'vitality',
    label: 'Vitality',
    desc: '+2 hearts, permanently',
    effect: 'minecraft:health_boost',
    countKey: 'td_buffVitalityCount',
    color: 'red',
  },
  {
    id: 'fortitude',
    label: 'Fortitude',
    desc: '10% less damage taken, permanently',
    effect: 'minecraft:resistance',
    countKey: 'td_buffFortitudeCount',
    color: 'aqua',
  },
  {
    id: 'ferocity',
    label: 'Ferocity',
    desc: 'hit harder, permanently',
    effect: 'minecraft:strength',
    countKey: 'td_buffFerocityCount',
    color: 'light_purple',
  },
]

// 3 minutes, in ticks (docs/IDEAS.md's "On-screen countdown timer to the
// next wave"). Countdown display + auto-trigger live in wave_spawner.js
// (see there for why), started here once the choice popup resolves.
const COUNTDOWN_TICKS = 3600

// Click sets a vanilla entity tag as the clicking player (not routed
// through player.getServer(), so @s correctly resolves to "whoever
// clicked" here - unlike every other command in this file, which runs
// via player.getServer().runCommandSilent() and must target @a instead,
// since console command sources have no "self").
function sendChoicePrompt(player) {
  const components = [{ text: '\n=== Choose a permanent reward ===\n', color: 'gold', bold: true }]
  BUFF_OPTIONS.forEach((opt, i) => {
    components.push({
      text: `[${i + 1}] ${opt.label} - ${opt.desc}\n`,
      color: opt.color,
      clickEvent: { action: 'run_command', value: `/tag @s add td_pick_${opt.id}` },
      hoverEvent: { action: 'show_text', value: { text: `Click to choose ${opt.label}` } },
    })
  })
  player.getServer().runCommandSilent(`tellraw @a ${JSON.stringify(components)}`)
}

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
    // Undo wave_spawner.js's dense wave-fog — resets to vanilla fog for
    // one tick; border_fog.js's own tick handler immediately takes back
    // over with its lighter peacetime proximity fog (its
    // lastAppliedMaxDistance cache reset happens on the same td_inWave
    // flip), giving the "day pulls back significantly, doesn't go silent"
    // contrast the design doc actually asks for.
    player.getServer().runCommandSilent('fog @a reset')

    // Wave-clear orchestration ordering, per docs/IDEAS.md: wave-clear
    // effects (above) -> choice popup (blocking) -> player chooses ->
    // starter-gear removal (wave 5 specifically) -> countdown begins.
    // Gear removal moved out of this branch into the tag-detection
    // handler below, so it fires after the choice is answered, not
    // simultaneously with it. td_pendingWaveNumber carries this branch's
    // local waveNumber across to that later handler, since persistent
    // data (not shared top-level scope) is this codebase's proven
    // cross-tick-invocation channel.
    data.putInt('td_pendingWaveNumber', waveNumber)
    data.putBoolean('td_awaitingChoice', true)
    sendChoicePrompt(player)
  }
})

// Resolves the wave-clear choice popup once the player clicks an option
// in chat (sendChoicePrompt above tags them via a vanilla /tag command).
// Early-returns when no choice is pending (the common case) so this
// costs nothing outside the brief wave-clear window - same "cheap early
// exit" shape as wave_spawner.js's pendingSpawns handler.
PlayerEvents.tick((event) => {
  const player = event.player
  const data = player.persistentData
  if (!data.getBoolean('td_awaitingChoice')) return

  const picked = BUFF_OPTIONS.find((opt) => player.hasTag(`td_pick_${opt.id}`))
  if (!picked) return

  BUFF_OPTIONS.forEach((opt) => player.removeTag(`td_pick_${opt.id}`))
  data.putBoolean('td_awaitingChoice', false)

  // Repeat picks stack via amplifier (0-indexed - first pick is
  // amplifier 0, i.e. effect level I), not a fresh independent buff each
  // time - "start small, scale later" per the design doc's own resolved
  // note, real branching composition choice deferred to a later pass.
  const newCount = data.getInt(picked.countKey) + 1
  data.putInt(picked.countKey, newCount)
  // @a, not @s - this runs via player.getServer(), the console command
  // source, which has no "self" to resolve @s against (same reasoning
  // as every other command in this file).
  player.getServer().runCommandSilent(`effect give @a ${picked.effect} 1000000 ${newCount - 1} true`)
  player.tell(`§a[Reward] §fYou chose ${picked.label}! (Rank ${newCount})`)

  // Starter gear removal, once, the moment the curated campaign's final
  // wave's choice is answered — td_pendingWaveNumber is capped at
  // FINAL_WAVE the same way the live counter above is, so every
  // repeat/endless wave past this point also reads as FINAL_WAVE; the
  // td_starterGearRemoved guard (same one-shot pattern as
  // td_playtestKitGiven) is what keeps this to a single firing rather
  // than re-running on every later wave clear.
  const waveNumber = data.getInt('td_pendingWaveNumber')
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

  // Countdown to next wave (docs/IDEAS.md's "On-screen countdown timer")
  // starts only now, after the choice (and wave-5 gear removal, if this
  // was that wave) is fully resolved - display + auto-trigger live in
  // wave_spawner.js, see there for why.
  data.putInt('td_countdownEndTick', player.getLevel().getTime() + COUNTDOWN_TICKS)
  data.putBoolean('td_countdownActive', true)
})
