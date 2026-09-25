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

// Full zombie-apocalypse roster pivot (2026-09-06) - same list as
// wave_spawner.js's WAVE_MOB_TYPES/mob_aggro.js's own copy, see
// wave_spawner.js for the full writeup (real ids confirmed by
// decompilation). Keep all three in sync if the roster changes again.
// TFTH removed entirely 2026-09-04 (real playtest feedback) - see
// wave_spawner.js's WAVES header comment for the full replacement
// mapping/rationale.
const HOSTILE_TYPES = [
  'minecraft:zombie',
  'minecraft:husk',
  'minecraft:drowned',
  'minecraft:zombie_villager',
  'mutantszombies:mutant_zombie',
  'mutantszombies:blister_zombie',
  'mutantszombies:split_head_zombie',
  'undeadnights:elite_zombie',
  'undeadnights:horde_zombie',
  'undeadnights:demolition_zombie',
  'mutantszombies:zombie_brute',
  'mutantszombies:mutant_brute',
  'mutantszombies:rotten_mutant',
  'mutantszombies:crawler',
]

// 80 -> 96 (2026-09-09, playtest batch part 4): wave mobs now spawn a
// fixed 48-64 blocks from the pedestal (wave_spawner.js) and the
// spreadplayers snap can add 4, so a fresh spawn can sit 68 blocks out -
// 80 left too little slack for a mob knocked or wandering outward before
// it turns in. Keep equal to wave_spawner.js's own horn-gate radius.
const RADIUS = 96


// Must match wave_spawner.js's WAVES.length — server_scripts don't
// reliably share top-level scope across files (same duplication pattern
// as HOSTILE_TYPES above), so this is redeclared here rather than
// imported. No longer drives the wave-number display (2026-08-31, see
// below - that's uncapped now that endless-phase waves are a real,
// distinct thing worth showing, not a repeat of wave 8) - kept as the
// stable "designed campaign length" reference GEAR_REMOVAL_WAVE's own
// comment below still contrasts itself against, and never drove starter
// gear removal either, see GEAR_REMOVAL_WAVE below for why those were
// split apart 2026-08-29.
const FINAL_WAVE = 8

// Tag set on the sword/armor in playtest_starter_kit.js — matching on
// this instead of item type is what lets removal target exactly the
// starter gear, not any netherite sword/iron armor legitimately
// crafted or looted since.
const STARTER_GEAR_TAG = 'td_starter_gear'

// Fixed-wave narrative beats - events tied to a SPECIFIC wave number
// that stays constant regardless of how long the designed campaign
// grows or shrinks, as opposed to FINAL_WAVE which tracks campaign
// length and is expected to change over time (5 -> 8 already, when
// waves 6-8 were added).
//
// Decoupled 2026-08-29: starter gear removal used to gate on
// `waveNumber === FINAL_WAVE` directly - fine back when the campaign
// was exactly 5 waves, since "final wave" and "wave 5" happened to be
// the same number. Bumping FINAL_WAVE to 8 silently dragged the
// gear-removal narrative beat along with it, even though "the campaign
// you inherited ends" and "wave 5, permanently" are two different
// concepts that only ever shared a number by coincidence.
// GEAR_REMOVAL_WAVE is that fixed wave 5, independent of FINAL_WAVE now.
//
// Structured as a small array of {wave, flagKey, action} entries,
// checked once in the wave-clear branch below, rather than a bespoke
// `if (waveNumber === X && !data.getBoolean('td_flagY'))` block
// hand-copied per event - not because more of these are confirmed
// coming, but because nothing about gear removal is actually special
// among "things that should happen exactly once, at a specific fixed
// wave" (a wave 3 diary moment, a distinct wave 8 finale, etc. would
// slot in the same way). Each entry's flagKey is the one-shot guard
// (same pattern as td_playtestKitGiven/td_starterGearRemoved
// elsewhere), set true before the action runs so a re-entrant call
// within the same check can't double-fire it.
const GEAR_REMOVAL_WAVE = 5

// Escalating peacetime pacing (2026-09-04, real playtest feedback: the
// flat 3-minute gap "should scale with wave number - short early on,
// longer later," with a real announced checkpoint "say after wave 5,"
// not just a silently longer number). First-pass curve: short-and-tense
// early (1800 ticks/90s at wave 1), ramping +300 ticks (15s) per wave
// cleared, capped at 3600 ticks/3min - reached at wave 7.
//
// **Kink at wave 5, 2026-09-08** - direct feedback: the wave-5 "you'll
// have more time to prepare from here on" title (below) fired at a wave
// that was still only 150s (2.5min) under the old formula, undercutting
// its own promise. Waves 1-4 are unchanged (still the original 90s→135s
// ramp); wave 5 becomes a new fixed 4-minute baseline
// (COUNTDOWN_WAVE5_BASE_TICKS), and growth continues +300 ticks/wave from
// there with NO ceiling - the old flat cap is gone entirely, replaced by
// this second, uncapped ramp. `COUNTDOWN_KINK_WAVE` is kept as its own
// constant rather than reusing `GEAR_REMOVAL_WAVE` - same wave number by
// design intent this time, but still an independently-named concept (when
// the countdown curve's own shape changes, not when starter gear is
// removed).
const COUNTDOWN_BASE_TICKS = 1800
const COUNTDOWN_STEP_TICKS = 300
const COUNTDOWN_WAVE5_BASE_TICKS = 4800
const COUNTDOWN_KINK_WAVE = 5
// Own constant, same reasoning as COUNTDOWN_KINK_WAVE just above -
// coincides with GEAR_REMOVAL_WAVE right now but is an independent
// narrative beat (playtest_starter_kit.js's starter trap showcase, see
// placeStarterTraps()'s own header comment), not derived from it.
const STARTER_TRAPS_REMOVAL_WAVE = 5

// Real floor, 2026-09-12 (direct ask: "the time between the waves should
// be a minimum 10 mins"). Before this, the escalating curve above was
// genuinely under 10 minutes for most of the campaign - wave 1 was 90s,
// even wave 10 only reached 5m15s (4800 + 300*5 ticks). This is a hard
// floor on the value this function returns, so the passive countdown
// display/auto-trigger (this file) never counts down faster than 10
// minutes. Supersedes this file's own escalating-curve design intent for
// every wave the curve would otherwise have put under 10 minutes (waves
// 1-28 at the constants above) - the curve still governs anything past
// that (wave 29+, where 4800+300*(w-5) already exceeds 12000 on its own),
// so nothing above is deleted, just floored.
//
// **No longer gates the manual horn, 2026-09-15** (direct ask: "the
// player shouldn't have to wait 10 mins between waves if they don't want
// to, they can call the wave early, just like with the horn item").
// Briefly (2026-09-12 through 2026-09-15) wave_spawner.js's useWaveHorn()
// also checked td_countdownEndTick against this same floor, so a manual
// call was blocked until 10 minutes had genuinely passed - that gate is
// gone; see useWaveHorn()'s own comment. This constant now only paces the
// passive countdown a player who does nothing waits out.
const MIN_WAVE_GAP_TICKS = 12000 // 10 minutes

function countdownTicksForWave(waveNumber) {
  var raw = waveNumber < COUNTDOWN_KINK_WAVE
    ? COUNTDOWN_BASE_TICKS + COUNTDOWN_STEP_TICKS * (waveNumber - 1)
    : COUNTDOWN_WAVE5_BASE_TICKS + COUNTDOWN_STEP_TICKS * (waveNumber - COUNTDOWN_KINK_WAVE)
  return Math.max(MIN_WAVE_GAP_TICKS, raw)
}

const FIXED_WAVE_EVENTS = [
  {
    wave: GEAR_REMOVAL_WAVE,
    flagKey: 'td_starterGearRemoved',
    action: (player) => {
      const server = player.getServer()

      // /clear reaches armor and offhand slots as well as the main
      // inventory (long-standing vanilla behavior, not KubeJS-specific),
      // and its item argument NBT-matches as a partial predicate in
      // 1.20.1 (pre-1.20.5 components rework) - the tag alone is enough
      // to match regardless of the Lore/Enchantments also present on
      // the real item. One command per item type since /clear takes a
      // single item argument, not a list. Targets @a rather than a
      // specific name/UUID - this pack is single-player-focused (see
      // base_expansion.js's notes), so it's equivalent here and avoids
      // needing to resolve the player's name from console context.
      server.runCommandSilent(`clear @a minecraft:netherite_sword{${STARTER_GEAR_TAG}:1b}`)
      server.runCommandSilent(`clear @a minecraft:iron_helmet{${STARTER_GEAR_TAG}:1b}`)
      server.runCommandSilent(`clear @a minecraft:iron_chestplate{${STARTER_GEAR_TAG}:1b}`)
      server.runCommandSilent(`clear @a minecraft:iron_leggings{${STARTER_GEAR_TAG}:1b}`)
      server.runCommandSilent(`clear @a minecraft:iron_boots{${STARTER_GEAR_TAG}:1b}`)

      // Same "big on-screen title, chat is easy to miss" reasoning as
      // the wave-cleared title below, plus the fuller narrative beat in
      // chat since a title can't carry more than a couple words legibly.
      // Interpolates GEAR_REMOVAL_WAVE rather than a hardcoded "five" -
      // it happened to still read correctly by coincidence when
      // FINAL_WAVE drifted to 8, which is exactly how that kind of bug
      // hides until it doesn't.
      server.runCommandSilent(`title @a title {"text":"IT'S UP TO YOU NOW","color":"red","bold":true}`)
      server.runCommandSilent(`title @a subtitle {"text":"The gear is gone. So is whoever wore it first.","color":"gray"}`)
      player.tell('§8§o[The blade and armor crumble to rust and dust in your hands.]')
      player.tell(`§7Whoever carried this before you held the line for ${GEAR_REMOVAL_WAVE} waves before this place took them too. Their debt here is paid.`)
      player.tell('§c§lIt\'s up to you now.')
    },
  },
  // The wave-5 "THE NIGHTS GROW LONGER" / "you'll have more time to
  // prepare from here on" beat that used to live here (fired alongside
  // the gear-removal title above, same wave) was removed entirely
  // 2026-09-16 - direct feedback: "the after wave 5 you have more time
  // message is redundant as we have fixed it to 10 mins between waves."
  // Correct catch: MIN_WAVE_GAP_TICKS (above) has floored EVERY wave's
  // gap to the same flat 10 minutes since 2026-09-12, waves 1-4 included
  // - countdownTicksForWave's escalating curve never actually reaches a
  // value the floor doesn't immediately override until wave 29. So the
  // gap was already a flat 10 minutes before wave 5 too; the message's
  // own promise ("more time from here on") never described a real change
  // to point at, making it actively misleading rather than just noise.
  {
    wave: STARTER_TRAPS_REMOVAL_WAVE,
    flagKey: 'td_starterTrapsRemoved',
    action: (player) => {
      // Removes the pre-placed Tesla Coil (+ its multiblock slave half
      // and Flux Point), the Electrified Iron Fence gate frame, and the
      // Sentry placeStarterTraps() (playtest_starter_kit.js) put down at
      // world-build/retrofit time - see that function's own header
      // comment for the full mechanism/gotcha writeup. Tesla Coil
      // coordinates read straight off the world marker rather than
      // recomputed, same "don't rederive what's already persisted"
      // reasoning as every other fixed-position reader in this pack. The
      // fence frame is the one exception - starterFencePositions()
      // (playtest_starter_kit.js, top-level FUNCTIONS share across
      // server_scripts files in this exact KubeJS build) derives its
      // whole layout fresh from td_pedestalX/Y/Z instead, since it was
      // never given its own persisted coordinates in the first place -
      // see that function's own comment.
      const server = player.getServer()
      const data = worldData(player.getLevel())
      if (data && data.contains('td_starterTeslaCoilX')) {
        // Power block tesla_coil_auto_power.js was toggling - cleared here
        // too so a lever doesn't linger after the coil it's attached to is
        // gone (that script itself stops acting on td_starterTrapsRemoved
        // being set, just below). West of the master, not above it, since
        // the coil's own 2026-09-15 upright fix (facing=up, dummy moved
        // above the master, toggle moved to a lever on the master's west
        // face) - see that script's updated header comment.
        server.runCommandSilent(`setblock ${data.getInt('td_starterTeslaCoilX') - 1} ${data.getInt('td_starterTeslaCoilY')} ${data.getInt('td_starterTeslaCoilZ')} minecraft:air`)
        server.runCommandSilent(`setblock ${data.getInt('td_starterTeslaCoilX')} ${data.getInt('td_starterTeslaCoilY')} ${data.getInt('td_starterTeslaCoilZ')} minecraft:air`)
        server.runCommandSilent(`setblock ${data.getInt('td_starterTeslaCoilDummyX')} ${data.getInt('td_starterTeslaCoilDummyY')} ${data.getInt('td_starterTeslaCoilDummyZ')} minecraft:air`)
        server.runCommandSilent(`setblock ${data.getInt('td_starterTeslaFluxPointX')} ${data.getInt('td_starterTeslaFluxPointY')} ${data.getInt('td_starterTeslaFluxPointZ')} minecraft:air`)
        // Gate wall z and the flank-hole ranges both come from
        // playtest_starter_kit.js's helpers (top-level functions are
        // global across server_scripts): td_compoundZ1 with the pre-fort
        // +7 as the old-save fallback, and flank ranges only on a
        // td_layoutVersion 2 save - on anything older those columns are
        // solid wall and this loop would punch holes in it.
        starterFencePositions(data.getInt('td_pedestalX'), data.getInt('td_pedestalY'), starterGateWallZ(data), starterFenceFlanksFromData(data)).forEach((pos) => {
          server.runCommandSilent(`setblock ${pos[0]} ${pos[1]} ${pos[2]} minecraft:air`)
        })
      }
      // Tag-matched, not coordinate-matched - it's a real entity, not a
      // block (see placeStarterTraps()'s own header comment).
      server.runCommandSilent('kill @e[type=securitycraft:sentry,tag=td_starter_trap_sentry]')
      // Real playtest bug, 2026-09-15: "the sentry block was destroyed
      // after wave 5 as expected but it dropped on the ground. it needs
      // to be gone for good, just like the electric fence." Decompiled
      // Sentry.remove(RemovalReason) directly - it unconditionally
      // Block.popResource()s a real securitycraft:sentry item (plus its
      // disguise/allowlist/speed modules if any are installed) on EVERY
      // removal path, /kill included, with no check on the removal reason
      // at all. No way to suppress that from the mod's side via commands,
      // so the drop is cleaned up here instead, same tick: Sentry.m_6478_
      // (its move()) is a real no-op override (decompiled - Sentries never
      // actually walk), so it's still sitting exactly where it was
      // summoned. That spot was never given its own persisted coordinates
      // (same as the fence frame just above - starterFencePositions()'s
      // own comment), so it's recomputed the same way: doorX-5/wallY0+3/z1
      // relative to td_pedestalX/Y and the gate wall (starterGateWallZ -
      // td_compoundZ1, or the pre-fort +7 on an old save), matching
      // placeStarterTraps()'s own summon call exactly.
      // `var`, NOT `const`, 2026-09-22 - real live crash found in the
      // instance log at the wave-5 clear: "TypeError: redeclaration of var
      // sentryX (wave_status.js#269)" thrown by Rhino's putConstImpl. In
      // this KubeJS Rhino build a `const` declared inside a nested block
      // (this `if`) of a function that ALSO contains a closure (the
      // .forEach arrow above) is registered as a plain var by the parser,
      // so the const-assignment path rejects it at runtime. The throw
      // aborted the whole wave-clear handler mid-way: the countdown to
      // wave 6 was never started (no timer on screen, no auto-trigger) and
      // the Sentry's dropped item was never cleaned up. Function-top-level
      // consts (`server`/`data` above) are unaffected - only block-scoped
      // ones inside a closure-holding function hit this.
      if (data && data.contains('td_pedestalX')) {
        var sentryX = data.getInt('td_pedestalX') - 5
        var sentryY = data.getInt('td_pedestalY') + 3
        var sentryZ = starterGateWallZ(data)
        server.runCommandSilent(`kill @e[type=minecraft:item,x=${sentryX},y=${sentryY},z=${sentryZ},distance=..1.5]`)
      }
      player.tell('§8§o[The scavenged defenses spark, seize up, and fall dark for good.]')
    },
  },
]

// Delayed-title queue (2026-09-05) - lets a SECOND title/subtitle pair
// display sequentially after a first one instead of instantly
// overwriting it, same problem `/title` always has when called twice in
// one tick. DELAY_TICKS (100 = 5s) covers vanilla's own default title
// timing (10 ticks fade-in + 70 ticks stay + 20 ticks fade-out = 100
// ticks total, confirmed vanilla default via `/title @a times`'s own
// documented defaults, not guessed) - long enough for the first title to
// fully play out (fade in, hold, fade out) before the second one begins,
// rather than an arbitrary short gap that would just move the
// overwrite-collision earlier instead of removing it.
var pendingDelayedTitles = [] // {fireTick, title, subtitle}
var DELAYED_TITLE_TICKS = 100

// `color` defaults to 'gold' (this queue's original, only use case -
// the pacing announcement above) - added as a param 2026-09-09 so
// pedestal_destruction.js/hardcore_death.js's own game-over popups
// (queued the same way, see those files) can show in red instead of
// reusing gold's tonally-mismatched "good news" color.
function queueDelayedTitle(player, title, subtitle, color) {
  pendingDelayedTitles.push({
    fireTick: player.getLevel().getTime() + DELAYED_TITLE_TICKS,
    title: title,
    subtitle: subtitle,
    color: color || 'gold',
  })
}

PlayerEvents.tick((event) => {
  if (pendingDelayedTitles.length === 0) return
  const player = event.player
  const currentTick = player.getLevel().getTime()
  const stillPending = []
  pendingDelayedTitles.forEach((entry) => {
    if (currentTick < entry.fireTick) {
      stillPending.push(entry)
      return
    }
    const server = player.getServer()
    server.runCommandSilent(`title @a title {"text":"${entry.title}","color":"${entry.color}","bold":true}`)
    server.runCommandSilent(`title @a subtitle {"text":"${entry.subtitle}","color":"gray"}`)
  })
  pendingDelayedTitles = stillPending
})

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
//
// **Escalating, not flat, 2026-09-04** - real playtest feedback, see
// countdownTicksForWave() above. This used to be a flat 3600 (3
// minutes) every wave; that's now COUNTDOWN_MAX_TICKS, the ceiling the
// curve ramps up to rather than the constant value.

// Same waveObjective() fix as wave_spawner.js (server_scripts don't
// reliably share top-level scope across files, so it's redeclared here
// rather than imported - same duplication pattern as HOSTILE_TYPES
// above). Real playtest report: "I expected the enemies to spawn near
// the base and attack the pedestal. This didn't happen - I was out
// adventuring and they spawned on me. I then ran to the base and they
// despawned, causing me to win the wave." This counter was half of that
// bug - it measured distance from the player, so a player who outran
// their own wave mobs back to base would see the wave read as
// "cleared" even though the mobs were still alive somewhere behind
// them. Originally fixed to measure from the pedestal only while the
// amulet was placed - **superseded 2026-09-05**, same premise
// correction as wave_spawner.js's own waveObjective(): the pedestal is
// the permanent objective regardless of amulet state, so this always
// measures from its fixed td_pedestalX/Y/Z now, not conditionally.
// `data` is the shared world-state object (see world_state.js), not a
// player's own persistentData - callers pass it in the same way they
// already did before 2026-09-08's multiplayer fix, just sourced
// differently now.
function waveObjective(player, data) {
  if (data.contains('td_pedestalX')) {
    return {
      x: data.getInt('td_pedestalX') + 0.5,
      y: data.getInt('td_pedestalY'),
      z: data.getInt('td_pedestalZ') + 0.5,
    }
  }
  return { x: player.getX(), y: player.getY(), z: player.getZ() }
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

  // Real multiplayer fix, 2026-09-08 (see world_state.js): this used to
  // be player.persistentData, which desynced per player - wave number,
  // the in-wave flag, and the countdown are all real shared campaign
  // state, not something each player should track a separate copy of.
  const data = worldData(level)
  if (!data) return
  // No longer capped at FINAL_WAVE (2026-08-31, endless phase scaling
  // shipped - see wave_spawner.js): waves past FINAL_WAVE are now a
  // real, distinct endless phase (Undead Nights hordes), not a silent
  // repeat of wave 8's composition, so showing the real wave number is
  // the whole point - "how far did I get" is the actual feature.
  const waveNumber = data.getInt('td_waveNumber')
  // Past the designed campaign (endless phase), mobs come from Undead
  // Nights' own spawn_horde command and can never carry td_wave_mob -
  // see wave_spawner.js's tag comment for the full story.
  const isEndlessPhase = waveNumber > FINAL_WAVE
  const objective = waveObjective(player, data)

  const hostileCount = level.getEntities().filter((e) => {
    if (!HOSTILE_TYPES.includes(`${e.type}`)) return false
    // Real bug found in playtest (2026-09-01): this used to match by
    // type only, so any vanilla zombie/skeleton/spider from a nearby
    // structure's real spawner block (spawners bypass doMobSpawning)
    // within RADIUS got miscounted as a wave mob. td_wave_mob is set
    // permanently on every mob wave_spawner.js actually summons - see
    // its own comment at the summon point for the full story.
    // td_wave_mob is now required in EVERY phase (2026-09-10, real live
    // bug - see mob_aggro.js's own comment at its td_wave_mob gate). The
    // old endless-phase bypass existed because Undead Nights' spawn_horde
    // mobs couldn't carry the tag; wave_spawner.js now sweeps it onto
    // them right after each spawn_horde (tdTagHordeMobs), so type-only
    // matching is gone for good - baked structure mobs of roster types
    // (u_desert's jigsaw husk piece, Philip's desert_pyramid) are exactly
    // what this counter must never see.
    if (!e.getTags().contains('td_wave_mob')) return false
    // A killed mob plays a ~1 second death animation before actually
    // being removed from the world, so it's still present in
    // getEntities() during that window - excluding anything already at
    // 0 health makes the counter match what the player visually sees,
    // not the ~1 second-delayed removal.
    if (e.getHealth() <= 0) return false
    const dx = e.getX() - objective.x
    const dy = e.getY() - objective.y
    const dz = e.getZ() - objective.z
    return dx * dx + dy * dy + dz * dz <= RADIUS * RADIUS
  }).length

  const wasInWave = data.getBoolean('td_inWave')

  if (hostileCount > 0) {
    // The pedestal under-attack alert rides the action bar since
    // 2026-09-10 (pedestal_health.js's firePedestalAlert - direct ask for
    // a smaller font). This counter rewrites the bar 5x/second and would
    // wipe it instantly, so while that alert's window is open it shows
    // the alert line instead of the count.
    var pedestalAlert = pedestalAlertActionbarText(data, level.getTime())
    // airdropInboundActionbarText (wave_airdrop.js) - shares this action-bar
    // line the same way pedestalAlert already does, see that function's own
    // header. Only realistically overlaps here on a fast manual-horn call
    // that starts the next wave while a drop from the last one is still
    // being watched.
    var airdropAlert = airdropInboundActionbarText(data, level.getTime())
    player.setStatusMessage(pedestalAlert || airdropAlert || `§c⚔ ${tdWaveLabel(waveNumber)} — Hostiles remaining: ${hostileCount}`)
    if (!wasInWave) {
      data.putBoolean('td_inWave', true)
    }
  } else if (wasInWave) {
    data.putBoolean('td_inWave', false)
    // Chat line removed 2026-09-09 (real playtest ask: "less noise from
    // the chat window") - the title/subtitle pair right below already
    // delivers this as a popup, the chat message was pure duplication.
    // Subtitle-only, not the big title line (2026-09-08, direct ask: font
    // "slightly smaller" for this specific popup) - an empty title still
    // has to fire first to trigger the display window at all (vanilla's
    // subtitle text is only ever shown alongside an active title
    // lifecycle, confirmed vanilla /title behavior), it just renders
    // nothing since the text is blank. Subtitle text itself already
    // renders at vanilla's smaller fixed HUD scale vs. the title line.
    player.getServer().runCommandSilent(`title @a title {"text":""}`)
    // "HORDE N CLEARED" past the written waves - tdWaveLabel, wave_spawner.js.
    player.getServer().runCommandSilent(`title @a subtitle {"text":"${tdWaveLabel(waveNumber).toUpperCase()} CLEARED","color":"green","bold":true}`)
    // Real live ask, 2026-09-05: persistent HUD element for waves
    // cleared, not just this title/chat moment - the sidebar objective
    // itself is created once at login in playtest_starter_kit.js, real
    // value set here every time a wave is actually marked cleared.
    player.getServer().runCommandSilent(`scoreboard players set @a td_waves_cleared ${waveNumber}`)

    // Pedestal heal per wave clear (2026-09-05, direct ask - quick-fix
    // scope only, the bigger upgrade-point system stays parked in
    // IDEAS.md). Cut from 20% to 5% of max HP (2026-09-08, direct ask -
    // no other reasoning given), via pedestal_health.js's own shared
    // healPedestalByPercent() - top-level FUNCTIONS reliably share scope
    // across server_scripts in this exact build (confirmed directly, see
    // pedestal_health.js's own header comment for the real sandbox test
    // that established the exception) - but top-level var/const do NOT
    // (this pack's own longer-standing, separately-confirmed rule), so
    // this deliberately calls a function rather than reading
    // PEDESTAL_MAX_HEALTH directly from this file.
    healPedestalByPercent(player, data, 0.05)

    // Every-5th-wave airdrop (rebuilt 2026-09-08, replaces the old wave-8+
    // speed-clear bonus entirely) - see wave_airdrop.js for the full
    // mechanism. No-ops unless waveNumber % 5 === 0.
    maybeTriggerWaveAirdrop(player, data, waveNumber)

    // Undo wave_spawner.js's night lock — back to day and a normally
    // advancing clock during the peaceful gap before the next horn use.
    player.getServer().runCommandSilent('time set day')
    player.getServer().runCommandSilent('gamerule doDaylightCycle true')

    // Fixed-wave narrative beats (see FIXED_WAVE_EVENTS above) - each
    // entry's own flagKey is the one-shot guard, same pattern as
    // td_playtestKitGiven elsewhere, so a beat can't re-fire on a later
    // wave clear even though waveNumber keeps getting checked every time.
    FIXED_WAVE_EVENTS.forEach((fixedEvent) => {
      if (waveNumber !== fixedEvent.wave || data.getBoolean(fixedEvent.flagKey)) return
      data.putBoolean(fixedEvent.flagKey, true)
      fixedEvent.action(player)
    })

    // Countdown to next wave (docs/IDEAS.md's "On-screen countdown
    // timer") starts directly here now, right after wave-clear effects
    // (and wave-5 gear removal, if this was that wave) - no more choice
    // step to wait on. Display + auto-trigger live in wave_spawner.js,
    // see there for why.
    data.putInt('td_countdownEndTick', level.getTime() + countdownTicksForWave(waveNumber))
    data.putBoolean('td_countdownActive', true)
  }
})

// Debug: force the current wave clear regardless of remaining mobs
// (2026-09-04, real playtest feedback batch) - real, concrete need, not
// just convenience: a mob stuck somewhere unreachable (wedged in
// geometry, pathing failure) can soft-lock the whole run, since the
// clear check above needs every real hostile actually dead. OP-gated
// (level 2), same reasoning as the Wave Horn's own console-permission
// pattern (wave_spawner.js) - a plain player-level command source isn't
// guaranteed enough permission for what this needs to do.
//
// Deliberately does NOT set a "cleared" flag directly - that would be a
// second, parallel clear-detection path to keep in sync with the real
// one above forever. Instead just kills every real HOSTILE_TYPES entity
// within the same RADIUS/waveObjective the real check already uses, so
// the very next scheduled tick sees hostileCount===0 and fires the
// EXACT same clear sequence (title, night-undo, fixed events, countdown)
// on its own - reuses the existing path instead of duplicating it.
ServerEvents.commandRegistry((event) => {
  var Commands = event.commands
  event.register(
    Commands.literal('tdforceclear')
      .requires((source) => source.hasPermission(2))
      .executes((context) => {
        var player = context.source.getPlayerOrException()
        var level = context.source.getLevel()
        var data = worldData(level)
        if (!data) {
          player.tell('§c[Wave] §fNothing to force-clear - the base hasn\'t finished building yet.')
          return 0
        }
        var objective = waveObjective(player, data)
        var killed = 0
        level.getEntities().forEach((e) => {
          if (!HOSTILE_TYPES.includes(`${e.type}`)) return
          var dx = e.getX() - objective.x
          var dy = e.getY() - objective.y
          var dz = e.getZ() - objective.z
          if (dx * dx + dy * dy + dz * dz > RADIUS * RADIUS) return
          e.kill()
          killed++
        })
        // Real bug found 2026-09-05 (live report: "no longer works"):
        // this used `context.source.sendSuccess(() => Text.of(...), ...)`
        // - `Text` is not a real KubeJS global anywhere else in this
        // codebase (checked - zero other uses of Text/Component
        // construction in the whole pack), and this command's own git
        // history shows this line was never touched since the command
        // was first written, meaning it was very likely never actually
        // verified with a real player at all, not a regression from
        // today's edits. `getPlayerOrException()` throwing from a
        // non-player source (e.g. console/RCON) produces the exact same
        // generic "An unexpected error occurred" message a broken
        // `Text` reference would for a real player, so this couldn't be
        // distinguished by a headless sandbox test - fixed by switching
        // to `player.tell(...)`, the same proven-working chat-message
        // API this file and every sibling script already use everywhere
        // else, instead of an unverified Component-building call.
        player.tell(`§6[Wave] §aForce-cleared - killed ${killed} hostile(s).`)
        return killed
      })
  )
})
