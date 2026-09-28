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
// **Second boss added, 2026-09-10** (direct feedback: "the behemoth boss
// is just tanky. can you put in another type of boss"). Behemoth is a
// pure stat-stick by design (see the paragraph above) - no special
// ability, just more HP/damage than anything else in the roster, so
// every boss fight plays out the same way. `undeadnights:demolition_zombie`
// ("The Demolisher") is a genuinely different fight, not a second tank:
// decompiling `DemolitionZombieEntity.class` directly confirms it adds a
// real `TntIgniteAndThrowGoal` to its own `addBehaviourGoals` unconditionally
// - it ignites and throws live primed TNT at range on its own, the exact
// "defense-breaching" capability this pack already uses it for elsewhere
// (WAVES[7], the endless horde pool) - not reflavored melee. Deliberately
// lower max health/attack damage than Behemoth (see BOSS_TYPES below) -
// its danger is area damage from the TNT, not trading blows, so
// Behemoth-level HP would just make it a slower second tank instead of a
// different fight. The two alternate by boss index (`bossConfigForWave`)
// - odd (wave 10, 30, 50...) stays Behemoth so nothing already fought in
// live play (wave 10, per docs/QUEUE.md) changes identity retroactively;
// even (wave 20, 40, 60...) is the Demolisher, debuting at wave 20 -
// coincidentally the same wave brutes (Behemoth's own base mob) start
// reappearing in the regular roster again per wave_spawner.js's
// BRUTE_TIER_MIN_LEVEL, but that's two separate asks landing on the same
// number, not a shared mechanic.
//
// **This does NOT resolve the "preview vs. reward-exclusive" fork also
// sitting in that IDEAS.md entry, and does NOT build the actual
// auto-placed-building mechanic** - only the cadence question was shared
// between the two features; the building-reward feature itself stays
// exactly as parked, IDEAS.md updated to record the now-decided cadence
// only.
//
// **Behemoth HP/armor cut, 2026-09-11** (second direct complaint about
// this specific boss: "the behemoth just isnt working as a boss - too
// tanky cant kill" - the first one, 2026-09-10 above, got answered by
// adding the Demolisher as an alternate fight rather than touching
// Behemoth itself, so the underlying number was never actually fixed).
// Two real, compounding changes, not one guessed number:
// - **maxHealth 600 -> 350.** Was deliberately set higher than
//   Demolisher's 350 to give it a distinct "the tank" identity - that
//   asymmetry is exactly what's not working, so this drops it to parity
//   instead of guessing a new number for both.
// - **Armor material is now per-boss (`armorMaterial` below) - Behemoth
//   moves from netherite to iron, Demolisher stays netherite,
//   unconfirmed-but-unreported so left alone.** Full netherite is 20
//   armor / 12 toughness; full iron is 15 armor / 0 toughness. Ran
//   vanilla's own damage formula (`CombatRules.getDamageAfterAbsorb`:
//   `f1 = clamp(armor - damage/(2+toughness/4), armor*0.2, 20)`, final
//   damage `= raw * (1 - f1/25)`) by hand for both: on a 4-damage hit
//   (typical low-end arrow/bullet tier) netherite's toughness term drags
//   f1 up to 19.2 - only ~0.9 real damage gets through, ~77% reduced.
//   Iron's zero toughness leaves f1 at 13 for the same hit - ~1.9 damage
//   gets through, close to double. Toughness is specifically what
//   crushes low-per-hit weapons hardest, which is exactly the shape of
//   this pack's actual anti-boss kit (turret/sentry fire, arrows) - not
//   just a smaller health bar, the thing making hits feel like they
//   weren't landing at all. Both changes together cut real time-to-kill
//   by roughly 3-4x, not the ~1.7x either change would give alone.
//
// **Behemoth removed entirely, 2026-09-12** (third direct complaint, same
// boss, after both fixes above already shipped: "just remove the
// behemoth its too tanky. can you replace with another boss like a hard
// zombie"). Two rounds of nerfing the SAME mutant_brute-based stat-stick
// never actually fixed it - the real problem was the archetype itself,
// not another number: mutant_brute natively carries 1.0 (full) knockback
// resistance (wave_spawner.js's own BRUTE_SPEED_FIX_TYPES comment
// documents this), which this boss's summon NBT never overrode alongside
// max_health/attack_damage/movement_speed - so even at 350 HP/iron armor
// it still felt like grinding through an immovable wall. Rather than a
// third nerf pass on the same mob, this swaps the entity entirely to
// `undeadnights:elite_zombie` - a genuine zombie (no innate knockback
// immunity, no "brute/tank" identity anywhere else in this pack), reusing
// this codebase's own existing "hits harder" framing for that exact mob
// (see wave_spawner.js's WAVES header comment on the flesh_suffer
// replacement). maxHealth dropped hard, 350 -> 200 (well below parity
// with the Demolisher now, on purpose - this boss's danger is meant to
// come from damage and speed, not a health bar), attackDamage raised
// 30 -> 24 (still a real step up from a plain elite_zombie's own 6 base
// attack damage, without repeating the one-shot-kill mistake this pack
// already learned from - docs/QUEUE.md's 25-item batch #3's cobweb
// writeup), movementSpeed raised 0.3 -> 0.36 (faster than every other
// roster mob including Crawler's 0.3 and the fixed Brute speed's 0.28 -
// genuinely cannot be outrun, forces real engagement instead of a
// walk-away non-fight). Armor material stays iron (the 2026-09-11 lesson
// above still holds - netherite's toughness term crushes exactly the
// kind of low-per-hit anti-boss kit this pack has). Renamed "The Reaper"
// since it's a completely different fight now, not a retuned Behemoth -
// keeping the old name on a different mob/identity would misrepresent it
// to a player who fought the original. The `behemoth` object key below
// is left as-is (an internal identifier, not the display name) to avoid
// churning bossConfigForWave/bossConfigForEntityType for a rename that
// changes nothing functionally.
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
var BOSS_BOSSBAR_RANGE_UNUSED = null // bossbar players set to @a below - a boss fight is meant to be seen/heard pack-wide, unlike the pedestal's distance-limited ambient bar.

// Two boss identities (see the "Second boss added" header paragraph
// above for the full reasoning). Real vanilla music tracks throughout,
// not fabricated custom .oggs - no real tool exists in this environment
// to synthesize a convincing music file, and this pack's own precedent
// (FEATURES.md's Tesla Coil entry) already treats a custom .ogg as
// optional. Played via the "master" category with player-relative
// `~ ~ ~` coordinates - the exact same call shape wave_spawner.js's own
// wave-start cue already uses, proven working in this pack.
var BOSS_TYPES = {
  behemoth: {
    // Swapped from mutantszombies:mutant_brute, 2026-09-12 - see the
    // "Behemoth removed entirely" header paragraph above for the full
    // reasoning. undeadnights:elite_zombie has no native knockback
    // resistance and no tank identity anywhere else in this pack, unlike
    // mutant_brute.
    entityType: 'undeadnights:elite_zombie',
    name: 'The Reaper',
    nameColor: 'dark_red',
    maxHealth: 200,
    attackDamage: 24,
    armorMaterial: 'iron',
    // Faster than every other roster mob (Crawler's 0.3, the fixed Brute
    // speed's 0.28) - a boss that hits hard AND cannot be outrun, the real
    // fix for "just tanky" per the header paragraph above.
    movementSpeed: 0.36,
    music: 'minecraft:music_disc.pigstep',
    arrivalSound: 'minecraft:entity.wither.spawn',
    arrivalSubtitle: 'has arrived.',
  },
  demolisher: {
    entityType: 'undeadnights:demolition_zombie',
    name: 'The Demolisher',
    nameColor: 'gold',
    maxHealth: 350,
    attackDamage: 15,
    armorMaterial: 'netherite',
    music: 'minecraft:music_disc.11',
    arrivalSound: 'minecraft:entity.tnt.primed',
    arrivalSubtitle: 'is rigging the base to blow.',
  },
}

// Odd boss index (wave 10, 30, 50...) -> Behemoth, even (wave 20, 40,
// 60...) -> Demolisher. Keeping wave 10 as Behemoth specifically (rather
// than starting the alternation from index 0) means the boss identity
// already fought in live play per docs/QUEUE.md never changes
// retroactively - only later boss waves gain the new variety.
function bossConfigForWave(waveNumber) {
  var bossIndex = waveNumber / BOSS_WAVE_INTERVAL
  return bossIndex % 2 === 0 ? BOSS_TYPES.demolisher : BOSS_TYPES.behemoth
}

// Reverse lookup for the death handler below, which only has the dead
// entity's real type to go on (nothing upstream of it persists which
// boss config spawned it) - needed there to stop the right boss's own
// music track, not the other one's.
function bossConfigForEntityType(entityType) {
  return `${entityType}` === BOSS_TYPES.demolisher.entityType ? BOSS_TYPES.demolisher : BOSS_TYPES.behemoth
}

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

// No entity-type check needed - td_boss is only ever added by spawnBoss
// below, on whichever boss type bossConfigForWave picked, so the tag
// alone is a reliable, type-agnostic "is a boss alive" marker now that
// there are two possible boss entity types instead of one.
function isBossAlive(level) {
  return level.getEntities().filter(function (e) {
    return e.getTags().contains('td_boss') && e.getHealth() > 0
  }).length > 0
}

function spawnBoss(player, data, waveNumber) {
  var server = player.getServer()
  var level = player.getLevel()
  var objective = bossWaveObjective(player, data)
  var boss = bossConfigForWave(waveNumber)

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
  var nameJson = `{"text":"${boss.name}","color":"${boss.nameColor}","bold":true}`
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
  // TYPE-matched pedestal-targeting/melee-damage logic (both
  // mutant_brute and demolition_zombie are already in every one of
  // those lists, checked before demolition_zombie became a boss option
  // too - see the "Second boss added" header paragraph) with zero extra
  // code needed anywhere else in this pack.
  var speedAttribute = boss.movementSpeed !== undefined ? `,{Name:"generic.movement_speed",Base:${boss.movementSpeed}}` : ''
  // Armor material is per-boss now (see the "Behemoth HP/armor cut" header
  // paragraph above) - was a hardcoded netherite set shared by both bosses.
  var armorMaterial = boss.armorMaterial || 'netherite'
  var armorItems = `[{id:"minecraft:${armorMaterial}_boots",Count:1b},{id:"minecraft:${armorMaterial}_leggings",Count:1b},{id:"minecraft:${armorMaterial}_chestplate",Count:1b},{id:"minecraft:${armorMaterial}_helmet",Count:1b}]`
  var summonNbt = `{CustomName:'${nameJson}',CustomNameVisible:1b,PersistenceRequired:1b,DeathLootTable:"minecraft:empty",Tags:["td_boss","td_bossJustSpawned","td_wave_mob"],Attributes:[{Name:"generic.max_health",Base:${boss.maxHealth}},{Name:"generic.attack_damage",Base:${boss.attackDamage}},{Name:"generic.follow_range",Base:128}${speedAttribute}],Health:${boss.maxHealth}.0f,ArmorItems:${armorItems},ArmorDropChances:[0.0f,0.0f,0.0f,0.0f]}`

  server.runCommandSilent(`summon ${boss.entityType} ${x} ${y} ${z} ${summonNbt}`)
  // Same ground-height correction technique as wave_spawner.js's own
  // staggered mob spawns - summon at a rough estimate, then
  // /spreadplayers (vanilla's real heightmap-aware placement command,
  // works on any entity selector) onto the actual surface, tag-then-
  // immediately-untag so it can't collide with a later spawn.
  server.runCommandSilent(
    `spreadplayers ${x} ${z} 0 6 false @e[type=${boss.entityType},tag=td_bossJustSpawned,limit=1,sort=nearest]`
  )
  server.runCommandSilent(
    `tag @e[type=${boss.entityType},tag=td_bossJustSpawned,limit=1,sort=nearest] remove td_bossJustSpawned`
  )

  // Real vanilla /bossbar, same call shape as pedestal_health.js's
  // ensurePedestalBossbar/updatePedestalBossbar - `players @a` here
  // rather than a distance-gated selector, since a boss fight is a
  // pack-wide event, not ambient status.
  server.runCommandSilent(`bossbar add ${BOSS_BOSSBAR_ID} "${boss.name}"`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} color red`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} max ${boss.maxHealth}`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} value ${boss.maxHealth}`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} players @a`)
  server.runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} visible true`)

  // Endless-phase vocabulary (2026-09-10): tdWaveLabel (wave_spawner.js)
  // says "Horde N" past the written waves, so this reads "HORDE 10: BOSS".
  server.runCommandSilent(`title @a title {"text":"${tdWaveLabel(waveNumber).toUpperCase()}: BOSS","color":"dark_red","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"${boss.name} ${boss.arrivalSubtitle}","color":"red"}`)
  server.runCommandSilent(`tellraw @a {"text":"[Boss] ${boss.name} is out there somewhere - find it and end it.","color":"red"}`)
  // At each player (2026-09-27 audit): a bare `playsound ... @a ~ ~ ~` from the server plays at world spawn and is inaudible past ~16 blocks.
  server.runCommandSilent(`execute as @a at @s run playsound ${boss.music} master @s ~ ~ ~ 1 1 1`)
  server.runCommandSilent(`particle minecraft:large_smoke ${x} ${y + 1} ${z} 1.5 1.5 1.5 0.02 80`)
  server.runCommandSilent(`playsound ${boss.arrivalSound} hostile @a ${x} ${y} ${z} 1 0.6`)
}

// Cadence trigger - watches td_waveNumber (set by wave_spawner.js's
// useWaveHorn(), both the hand-authored 1-8 path and the endless-phase
// path) rather than calling into that file directly. Cross-file
// coordination via the shared world state, same established idiom as
// wave_status.js's own countdown auto-trigger into wave_spawner.js -
// keeps this file fully additive, zero edits to the large, mature
// wave_spawner.js.
//
// **Real live bug, fixed 2026-09-10 ("got to wave 11 and didn't see any
// bosses"):** this read `player.persistentData`, but td_waveNumber moved
// onto the marker entity (world_state.js's worldData(), the LAN-readiness
// pass) - the player copy is a stale legacy value, 0 in every new world,
// so `waveNumber <= 0` returned on every tick and no boss ever spawned.
// The live log confirms waves 9-12 ran with no "[Boss]" line. Now reads
// worldData(level) like every other consumer; td_bossLastSpawnedWave moves
// there with it. Throttled every 4 ticks, matching wave_status.js's
// own throttle for the same "cheap poll, no need for 20/s precision"
// reasoning - the isBossAlive() world-entity scan only actually runs
// when the modulo/dedup guards already pass, i.e. at most once per real
// boss wave, not every throttled tick.
PlayerEvents.tick((event) => {
  var player = event.player
  var level = player.getLevel()
  if (level.getTime() % 4 !== 0) return

  var data = worldData(level)
  if (!data) return
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

  // No entity-type check needed here either - see isBossAlive's own
  // comment above.
  var bosses = level.getEntities().filter(function (e) {
    return e.getTags().contains('td_boss') && e.getHealth() > 0
  })
  if (bosses.length === 0) return

  var boss = bosses[0]
  player.getServer().runCommandSilent(`bossbar set ${BOSS_BOSSBAR_ID} value ${Math.max(0, Math.round(boss.getHealth()))}`)
})

// Boss-kill loot + cleanup (docs/FEATURES.md's boss-wave spectacle
// entry's "boss-kill loot" detail + docs/QUEUE.md Roadmap Phase 5's
// boss-kill-drop Totem half).
//
// **Reinforcer drop swapped for a Sentry, 2026-09-11** - the Universal
// Block Reinforcer was dropped from the pack entirely (see
// securitycraft_traps.js's own header: every SecurityCraft trap re-
// recipe was rebuilt around plain vanilla materials specifically so
// nothing needs the Reinforcer anymore). The boss kill now hands the
// player a guaranteed Sentry instead - `securitycraft:sentry` confirmed
// real against the same installed jar (sha1
// 6184ca6af68a0a4e8ca4dd28a542b5d1a6c2e3ab, matching
// pack/mods/securitycraft.pw.toml) - turning the boss fight into the
// moment players get their first auto-turret, not just a crafting-tool
// unlock.
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
  // Which boss config actually spawned this entity isn't persisted
  // anywhere - the real entity type is all this handler has to go on,
  // so bossConfigForEntityType looks it up in reverse (needed to stop
  // the right boss's own music track, not the other one's).
  var boss = bossConfigForEntityType(entity.type)

  server.runCommandSilent(`bossbar remove ${BOSS_BOSSBAR_ID}`)
  server.runCommandSilent(`stopsound @a master ${boss.music}`)

  server.runCommandSilent(`title @a title {"text":"${boss.name} FALLS","color":"gold","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"The base breathes easier - for now.","color":"gray"}`)
  // At each player (2026-09-27 audit): a bare `playsound ... @a ~ ~ ~` from the server plays at world spawn and is inaudible past ~16 blocks.
  server.runCommandSilent(`execute as @a at @s run playsound minecraft:entity.wither.death master @s ~ ~ ~ 1 1 1`)
  server.runCommandSilent(`particle minecraft:totem_of_undying ${x} ${y + 1} ${z} 1.0 1.0 1.0 0.02 100`)

  server.runCommandSilent(`summon minecraft:item ${x} ${y + 1} ${z} {Item:{id:"securitycraft:sentry",Count:1b}}`)
  server.runCommandSilent(`summon minecraft:item ${x} ${y + 1} ${z} {Item:{id:"kubejs:shrapnel",Count:12b}}`)
  server.runCommandSilent(`summon minecraft:item ${x} ${y + 1} ${z} {Item:{id:"minecraft:totem_of_undying",Count:1b}}`)
})
