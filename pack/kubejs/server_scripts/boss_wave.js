// Boss wave capstone system (Phase 4, docs/QUEUE.md Roadmap "tier-by-
// tier feature-rich buildout" 2026-09-08, docs/FEATURES.md's "Boss-wave
// spectacle system" entry). Vanilla-command-driven throughout (real
// `/bossbar`, `/summon` NBT, `playsound`/`stopsound`) - no new mod, reuses
// the exact idioms already proven in this codebase (pedestal_health.js's
// bossbar functions, particle+sound heal/alert cues; wave_spawner.js's
// staggered-summon/ground-correction technique) rather than the source
// research's raw `LevelEvents.tick` polling template.
//
// **Cadence + boss-identity decisions, both made here as documented
// judgment calls (user AFK, per direct instruction) - resolves the same
// open fork sitting in docs/IDEAS.md under "Wave-clear reward: a
// building/machine places itself in the base" (its own cadence question,
// "maybe only boss waves — cadence never decided", is the same question):**
//
// - **Cadence: every 10th wave (10, 20, 30, ...), including the endless
//   phase.** Considered matching wave_airdrop.js's every-5th-wave
//   trigger (Phase 0, same day) but rejected - that would put a boss on
//   EVERY airdrop wave too (10, 20... are already multiples of 5),
//   collapsing "milestone wave" into one undifferentiated tier. Every
//   10th keeps bosses meaningfully rarer than airdrops while still
//   landing ON an airdrop wave every time (10 % 5 === 0 always) - a
//   deliberate, examined choice, not a missed collision: the biggest
//   milestone waves get BOTH a supply drop and a boss fight, smaller
//   milestones (5, 15, 25...) stay airdrop-only. First boss at wave 10 -
//   one wave into the endless phase (WAVES.length is 8), so the player
//   has already stabilized past the hand-authored campaign's own finale
//   beat ("The Reckoning") before facing the first one.
// - **Boss identity: `mutantszombies:mutant_brute`, reskinned/stat-
//   buffed, not a new mob.** Checked both real options before deciding.
//   A vanilla mob (the source research's own zero-new-content approach)
//   was ruled out - this pack's [[project_zombie_apocalypse_roster_pivot]]
//   deliberately stripped every non-zombie-family vanilla mob (skeleton/
//   spider/wither_skeleton/ravager/creeper) from the whole roster;
//   reintroducing one just for a boss would contradict that pivot for no
//   real gain. Mutant Brute is this pack's own toughest already-installed
//   named mob (LEGENDARY_MOBS tier in loot_bag_drops.js, real live-
//   checked baseline 120 HP / 18 attack per docs/QUEUE.md's item #24 -
//   not guessed), already deeply integrated everywhere (mob_aggro.js's
//   forced pedestal-targeting, pedestal_health.js's melee damage,
//   ladder_climb_assist.js, bounty_kills.js, flesh_death_sound.js) - a
//   real, proven-working AI/targeting base, not a fresh integration risk
//   for something this important. Named "The Behemoth", NBT-buffed to
//   600 max health (5x) / 30 attack damage (real step up from 18 without
//   repeating the Flesh Suffer one-shot-kill mistake this pack already
//   learned from - see docs/QUEUE.md's 25-item batch #3's cobweb writeup
//   for that history) plus full netherite armor for visual weight.
//
// **This does NOT resolve the "preview vs. reward-exclusive" fork also
// sitting in that IDEAS.md entry, and does NOT build the actual
// auto-placed-building mechanic** - only the cadence question was shared
// between the two features; the building-reward feature itself stays
// exactly as parked, IDEAS.md updated to record the now-decided cadence
// only.
//
// **Real, considered non-fix**: the boss is a genuine
// `mutantszombies:mutant_brute` entity, so it still has its own normal
// ~2% per-kill Legendary-bag roll from loot_bag_drops.js's existing
// LootJS entity modifier (that system hooks by entity TYPE, not by loot
// table id, so DeathLootTable below can't suppress it, and a
// per-instance suppression would need touching that shared file for a
// single boss encounter). Left as-is deliberately - a small bonus on top
// of the curated boss-kill reward below, not a conflict. The "zero drop
// chance so gear isn't farmable" spec language is specifically about the
// EQUIPPED GEAR - handled for real via `ArmorDropChances`/
// `DeathLootTable`, the two actual vanilla mechanisms that control that,
// not by fighting every other loot system in the pack.
//
// **Boss "aliveness" is tracked by querying the real world entity list
// (tag `td_boss` + type + alive), not a persistentData flag** - simpler
// and self-healing (can't drift out of sync with reality the way a
// per-player boolean could), and sidesteps needing a confirmed
// `level.getPlayers()`-style API to reset per-player state from the
// death event (no precedent for that call anywhere else in this pack -
// not risked here).

var BOSS_WAVE_INTERVAL = 10
var BOSS_BOSSBAR_ID = 'kubejs:main_boss'
// Real vanilla track, not a fabricated custom .ogg - no real tool exists
// in this environment to synthesize a convincing music file, and this
// pack's own precedent (FEATURES.md's Tesla Coil entry) already treats a
// custom .ogg as optional ("optionally a custom tesla_zap.ogg"). Played
// via the "master" category with player-relative `~ ~ ~` coordinates -
// the exact same call shape wave_spawner.js's own wave-start cue already
// uses (`playsound ... master @a ~ ~ ~ 1 1`), proven working in this pack.
var BOSS_MUSIC = 'minecraft:music_disc.pigstep'
var BOSS_ENTITY_TYPE = 'mutantszombies:mutant_brute'
var BOSS_NAME = 'The Behemoth'
var BOSS_MAX_HEALTH = 600
var BOSS_ATTACK_DAMAGE = 30
var BOSS_BOSSBAR_RANGE_UNUSED = null // bossbar players set to @a below - a boss fight is meant to be seen/heard pack-wide, unlike the pedestal's distance-limited ambient bar.

// Same waveObjective() shape as wave_spawner.js/wave_status.js - the
// pedestal's own fixed td_pedestalX/Y/Z, redeclared here per this
// codebase's established per-file duplication convention (server_scripts
// don't reliably share top-level var/const, only top-level FUNCTION
// declarations - see pedestal_health.js's header for the real sandbox
// test behind that distinction; this stays a plain function anyway since
// wave_spawner.js's own copy has drifted independently before).
function bossWaveObjective(player, data) {
  if (data.contains('td_pedestalX')) {
    return {
      x: data.getInt('td_pedestalX') + 0.5,
      y: data.getInt('td_pedestalY'),
      z: data.getInt('td_pedestalZ') + 0.5,
    }
  }
  return { x: player.getX(), y: player.getY(), z: player.getZ() }
}

function isBossAlive(level) {
  return level.getEntities().filter(function (e) {
    return `${e.type}` === BOSS_ENTITY_TYPE && e.getTags().contains('td_boss') && e.getHealth() > 0
  }).length > 0
}

function spawnBoss(player, data, waveNumber) {
  var server = player.getServer()
  var level = player.getLevel()
  var objective = bossWaveObjective(player, data)

  // Same real Math.PI-undefined-in-this-build workaround as
  // wave_spawner.js's own randomObjectiveRelativePosition() - confirmed
  // there via sandbox test, not re-tested here, same fix applied
  // defensively since this file also computes an angle.
  var PI = 3.141592653589793
  var angle = Math.random() * 2 * PI

  // Same border-half-width clamp wave_spawner.js added 2026-09-08 for
  // the exact same reason (a fixed spawn distance can land outside a
  // still-small early-campaign world border, where vanilla's border
  // collision holds any entity - not just players - at the edge,
  // unable to path back in). Boss waves start at wave 10, past
  // base_expansion.js's escalating growth curve having run several
  // times, but this stays safe regardless of exactly how far the border
  // has grown by then.
  var borderHalfWidth = level.getWorldBorder().getSize() / 2
  var BORDER_SAFETY_MARGIN = 5
  var spawnDistance = Math.max(10, Math.min(30, borderHalfWidth - BORDER_SAFETY_MARGIN))

  var x = Math.floor(objective.x + Math.cos(angle) * spawnDistance)
  var z = Math.floor(objective.z + Math.sin(angle) * spawnDistance)
  var y = Math.floor(objective.y)

  // Standard vanilla SNBT technique: wrap the JSON text component in
  // SINGLE quotes at the NBT-string level so its own double quotes don't
  // need escaping at all (single-quoted NBT strings only escape `\` and
  // `'`, not `"`) - the extremely common `CustomName:'{"text":"..."}'`
  // shape seen throughout vanilla data packs/commands, not this pack's
  // own invention.
  var nameJson = `{"text":"${BOSS_NAME}","color":"dark_red","bold":true}`
  // Real vanilla Entity/Mob NBT throughout - ArmorItems is the fixed
  // [boots, leggings, chestplate, helmet] order, ArmorDropChances is a
  // SEPARATE parallel float list (not embedded per-item) that zeroes
  // drop odds regardless of Looting - both genuine, documented vanilla
  // fields, not something requiring this mod's own decompilation.
  // DeathLootTable overrides the mob's own default loot table roll
  // (rotten flesh etc.) with vanilla's real empty table - "zero drop
  // chance so gear isn't farmable" from the spec, done for real rather
  // than asserted. td_wave_mob tag deliberately included - it's the
  // same tag every other wave mob gets (wave_spawner.js), so the boss
  // automatically counts toward wave_status.js's "hostiles remaining"
  // check (a boss wave can't silently read as cleared while the boss
  // still lives) and mob_aggro.js's/pedestal_health.js's own
  // TYPE-matched pedestal-targeting/melee-damage logic (mutant_brute is
  // already in every one of those lists) with zero extra code needed
  // anywhere else in this pack.
  var summonNbt = `{CustomName:'${nameJson}',CustomNameVisible:1b,PersistenceRequired:1b,DeathLootTable:"minecraft:empty",Tags:["td_boss","td_bossJustSpawned","td_wave_mob"],Attributes:[{Name:"generic.max_health",Base:${BOSS_MAX_HEALTH}},{Name:"generic.attack_damage",Base:${BOSS_ATTACK_DAMAGE}},{Name:"generic.follow_range",Base:128}],Health:${BOSS_MAX_HEALTH}.0f,ArmorItems:[{id:"minecraft:netherite_boots",Count:1b},{id:"minecraft:netherite_leggings",Count:1b},{id:"minecraft:netherite_chestplate",Count:1b},{id:"minecraft:netherite_helmet",Count:1b}],ArmorDropChances:[0.0f,0.0f,0.0f,0.0f]}`

  server.runCommandSilent(`summon ${BOSS_ENTITY_TYPE} ${x} ${y} ${z} ${summonNbt}`)
  // Same ground-height correction technique as wave_spawner.js's own
  // staggered mob spawns - summon at a rough estimate, then
  // /spreadplayers (vanilla's real heightmap-aware placement command,
  // works on any entity selector) onto the actual surface, tag-then-
  // immediately-untag so it can't collide with a later spawn.
  server.runCommandSilent(
    `spreadplayers ${x} ${z} 0 6 false @e[type=${BOSS_ENTITY_TYPE},tag=td_bossJustSpawned,limit=1,sort=nearest]`
  )
  server.runCommandSilent(
    `tag @e[type=${BOSS_ENTITY_TYPE},tag=td_bossJustSpawned,limit=1,sort=nearest] remove td_bossJustSpawned`
  )

  // Real vanilla /bossbar, same call shape as pedestal_health.js's
  // ensurePedestalBossbar/updatePedestalBossbar - `players @a` here
  // rather than a distance-gated selector, since a boss fight is a
  // pack-wide event, not ambient status.
  server.runCommandSilent(`bossbar add ${BOSS_BOSSBAR_ID} "${BOSS_NAME}"`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} color red`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} max ${BOSS_MAX_HEALTH}`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} value ${BOSS_MAX_HEALTH}`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} players @a`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} visible true`)

  server.runCommandSilent(`title @a title {"text":"WAVE ${waveNumber}: BOSS","color":"dark_red","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"${BOSS_NAME} has arrived.","color":"red"}`)
  server.runCommandSilent(`tellraw @a {"text":"[Boss] ${BOSS_NAME} is out there somewhere - find it and end it.","color":"red"}`)
  server.runCommandSilent(`playsound ${BOSS_MUSIC} master @a ~ ~ ~ 1 1`)
  server.runCommandSilent(`particle minecraft:large_smoke ${x} ${y + 1} ${z} 1.5 1.5 1.5 0.02 80`)
  server.runCommandSilent(`playsound minecraft:entity.wither.spawn hostile @a ${x} ${y} ${z} 1 0.6`)
}

// Cadence trigger - watches td_waveNumber (set by wave_spawner.js's
// useWaveHorn(), both the hand-authored 1-8 path and the endless-phase
// path) rather than calling into that file directly. Cross-file
// coordination via persistentData, same established idiom as
// wave_status.js's own countdown auto-trigger into wave_spawner.js -
// keeps this file fully additive, zero edits to the large, mature
// wave_spawner.js. Throttled every 4 ticks, matching wave_status.js's
// own throttle for the same "cheap poll, no need for 20/s precision"
// reasoning - the isBossAlive() world-entity scan only actually runs
// when the modulo/dedup guards already pass, i.e. at most once per real
// boss wave, not every throttled tick.
PlayerEvents.tick((event) => {
  var player = event.player
  var level = player.getLevel()
  if (level.getTime() % 4 !== 0) return

  var data = player.persistentData
  var waveNumber = data.getInt('td_waveNumber')
  if (waveNumber <= 0) return
  if (waveNumber % BOSS_WAVE_INTERVAL !== 0) return
  if (data.getInt('td_bossLastSpawnedWave') === waveNumber) return
  if (isBossAlive(level)) return

  data.putInt('td_bossLastSpawnedWave', waveNumber)
  spawnBoss(player, data, waveNumber)
})

// Bossbar HP tracking - throttled tick handler reading the boss's real
// live health, same idiom as pedestal_health.js's own HP polling.
// Early-returns immediately (cheap) whenever no boss is alive, so this
// costs nothing outside an active boss fight.
var BOSS_BOSSBAR_UPDATE_THROTTLE = 10

PlayerEvents.tick((event) => {
  var player = event.player
  var level = player.getLevel()
  if (level.getTime() % BOSS_BOSSBAR_UPDATE_THROTTLE !== 0) return

  var bosses = level.getEntities().filter(function (e) {
    return `${e.type}` === BOSS_ENTITY_TYPE && e.getTags().contains('td_boss') && e.getHealth() > 0
  })
  if (bosses.length === 0) return

  var boss = bosses[0]
  player.getServer().runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} value ${Math.max(0, Math.round(boss.getHealth()))}`)
})

// Boss-kill loot + cleanup (docs/FEATURES.md's boss-wave spectacle
// entry's "boss-kill loot" detail + docs/QUEUE.md Roadmap Phase 5's
// boss-kill-drop Totem half). Real ids verified before use, not
// guessed - `securitycraft:universal_block_reinforcer_lvl1` confirmed by
// downloading and hash-checking the actual installed SecurityCraft jar
// (sha1 6184ca6af68a0a4e8ca4dd28a542b5d1a6c2e3ab, matching
// pack/mods/securitycraft.pw.toml exactly) and reading its own lang
// file directly - the original research's guessed
// `securitycraft:universal_block_reinforcer` (no tier suffix) is NOT a
// real item id in this build; SecurityCraft ships 3 tiered variants
// (lvl1/lvl2/lvl3), lvl1 used here as the appropriate low tier for an
// early-boss reward.
//
// **Totem of Undying: 100% guaranteed on every boss kill, not an RNG
// roll on top of an already-hard fight.** This is the real "boss-kill-
// drop" source for docs/IDEAS.md's Hardcore mode Totem design (its
// other source, a hard crafting recipe, is NOT built here - out of this
// batch's scope, see docs/FEATURES.md's Hardcore mode section, still
// parked). Scoped deliberately narrow: this only builds the drop
// MECHANISM, not the rest of Hardcore mode (the permadeath toggle/
// death-hook/pedestal-vulnerability pieces all remain unbuilt, exactly
// as already documented) - a Totem earned here works today as a normal,
// always-useful defensive item (same as the two other real Totem
// sources already in this pack: "The Reckoning"'s quest reward, and the
// existing ~2% Legendary-bag roll), ready to plug into Hardcore mode's
// two-path design whenever that gets picked up.
EntityEvents.death((event) => {
  var entity = event.entity
  if (!entity.getTags().contains('td_boss')) return

  var level = event.level
  var server = level.getServer()
  var x = entity.getX()
  var y = entity.getY()
  var z = entity.getZ()

  server.runCommandSilent(`bossbar remove ${BOSS_BOSSBAR_ID}`)
  server.runCommandSilent(`stopsound @a master ${BOSS_MUSIC}`)

  server.runCommandSilent(`title @a title {"text":"${BOSS_NAME} FALLS","color":"gold","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"The base breathes easier - for now.","color":"gray"}`)
  server.runCommandSilent(`playsound minecraft:entity.wither.death master @a ~ ~ ~ 1 1`)
  server.runCommandSilent(`particle minecraft:totem_of_undying ${x} ${y + 1} ${z} 1.0 1.0 1.0 0.02 100`)

  server.runCommandSilent(`summon minecraft:item ${x} ${y + 1} ${z} {Item:{id:"securitycraft:universal_block_reinforcer_lvl1",Count:1b}}`)
  server.runCommandSilent(`summon minecraft:item ${x} ${y + 1} ${z} {Item:{id:"kubejs:shrapnel",Count:12b}}`)
  server.runCommandSilent(`summon minecraft:item ${x} ${y + 1} ${z} {Item:{id:"minecraft:totem_of_undying",Count:1b}}`)
})
