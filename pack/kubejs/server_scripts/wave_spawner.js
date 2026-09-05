// Custom, deterministic 5-wave campaign. Replaces relying on Pure
// Suffering's own (semi-random, hard to debug in-game) invasion-type
// system for this specific curated progression. Pure Suffering stays
// installed but dormant (enableInvasions false) — its broader invasion
// variety is still there to re-enable later.
//
// Each wave adds a mob type on top of the previous wave's roster, per
// design: 1) zombie+skeleton, 2) +spider+flesh_human, 3) +flesh_villager,
// 4) +wither_skeleton+flesh_hunter_i, 5) +ravager (mini
// boss)+flesh_suffer. Calling the horn again past wave 8 repeats wave
// 8's composition — no waves designed beyond that yet. Witches were
// removed from the roster entirely 2026-08-29 (see docs/IDEAS.md's
// "Mob roster exclusions" note) - wave 3 originally also added witch
// alongside flesh_villager.
//
// Waves 6-8 added 2026-08-29 (direct request: "more waves, scaled
// accordingly, keep the loot philosophy, use mob types from other mods
// talked about for variety"). Rather than a new mod, drew from TFTH's
// own germsStageMobList/awarenessStageMobList entries that were never
// actually used in any wave - TFTH.toml's own per-mob Attributes lines
// (MaxHealth|AttackDamage|Armor, confirmed directly from the config,
// not guessed) picked which ones: bruteplaquecreatureone ("Flesh Brute
// I", 45/4/5 - a tank archetype distinct from anything already in the
// roster), flesh_hunter_two ("Flesh Hunter II", 45/6/4 - balanced
// bruiser), flesh_boomer ("Flesh Boomer", 20/0/0 - zero melee attack
// damage in its own attributes, presumably an explosion-based attack
// like a creeper; reinforced walls are explosion-proof either way, see
// docs/MODS.md's chokepoint-walls entry), plaquethreelegcreature
// ("Flesh Hysterizer", 55/7/4 - the tankiest of the four, closed out
// wave 8 alongside the returning ravager). **Removed 2026-09-04**
// (direct feedback, real playtest batch: it one-shot the pedestal via
// pedestal_health.js's clustering-sum mechanic, and separately "I didnt
// like the TFTH mob types" - not a numeric retune, a removal). Wave 8's
// slot filled with `mutantszombies:crawler` instead (the Advanced Wall
// Climber API mob, confirmed real-summonable but never given a wave
// slot before this) - user's pick among the real pre-existing
// candidates. flesh_howler was
// deliberately left out - its own class has a CallForHelpGoal, an
// unconfirmed "summons more mobs" risk that would break this pack's
// deterministic per-wave mob count, and better-understood alternatives
// already covered the variety goal without it.
//
// Scaled per the wave 5 rebalance precedent earlier this session (that
// wave went from 12 mobs down to 7 - "too many regular mobs stacked
// on hard hitters was the problem, not variety or toughness") - waves
// 6-8 hold the same trash floor (zombie/skeleton/spider/wither_skeleton
// @1 each - was 5 mobs including witch, now 4 since witch's removal) as
// wave 5 and add 1-2 new elites on top rather than scaling raw counts
// back up.
//
// Was vanilla-only from 2026-08-19 (TFTH removed for the first wave
// debugging pass) until TFTH mobs were folded back in starting wave 2 —
// see the WAVES comment below for which TFTH mobs and why.
//
// Counts are a first-pass guess, easy to retune (same pattern as
// base_expansion.js's tuning).
//
// Uses a plain custom item (kubejs:wave_horn), not vanilla's Goat Horn —
// tried Goat Horn first for the free texture/sound, but
// ItemEvents.rightClicked never fires at all while an item is on
// cooldown (confirmed from KubeJSItemEventHandler.java's own dispatch
// logic), and Goat Horn has a real vanilla cooldown built in. A plain
// item has no cooldown, so the event reliably fires; a manual sound
// effect below keeps the horn feel.
//
// Commands run via player.getServer().runCommandSilent(...), not
// player.runCommandSilent(...) — the latter executes with the player's
// own command permission level, which may not be enough for /summon
// (needs level 2) even with cheats nominally on. player.getServer()
// gets the console-level command source (always full permission).
//
// Hooked on BOTH ItemEvents.rightClicked and BlockEvents.rightClicked —
// confirmed in-game that both fire for the same click (contrary to
// Forge's documented "RightClickItem only fires when not targeting a
// block" — that rule didn't hold in practice here), so a same-tick
// dedup guard below prevents double-processing a single click.
//
// Player access is event.entity, not event.player — neither
// ItemClickedEventJS nor BlockRightClickedEventJS expose a .player
// property, only getEntity() (confirmed by reading both classes).
//
// Uses `var`, not `const`/`let`, inside both event callback bodies —
// confirmed via in-game testing that const/let in these specific
// repeatedly-invoked callbacks throws "TypeError: redeclaration of var
// X" on the second and later invocations (a Rhino quirk with these
// callback types specifically).
//
// Does NOT reference event.level.isClientSide anywhere — confirmed via
// in-game testing that merely accessing this property throws
// NullPointerException in this environment, independent of how it's
// used (conditional, log statement, template literal, all failed the
// same way). Root cause not fully understood; not needed anyway since
// the dedup guard makes it safe to be called from multiple firings.
//
// Uses player.getX()/getY()/getZ(), not bare .x/.y/.z — confirmed via
// in-game testing (summon commands built from .x/.y/.z came out as
// literal "NaN" for the coordinates, so /summon silently failed every
// time, result=0). getX()/getY()/getZ() are the real vanilla Entity
// methods, not remapped or hidden by KubeJS, so they're always safe to
// call directly. The bare-property form apparently doesn't resolve
// correctly for position in this environment even though it's a common
// pattern elsewhere in this codebase.

// Full zombie-apocalypse roster pivot (2026-09-06, direct request: "I
// want to strip out the other mob types [and] speck out all the zombie
// type mobs we have available... I want the waves to feel like you are
// being attacked by larger and larger hordes"). Every non-zombie-family
// mob (skeleton/spider/wither_skeleton/ravager/creeper) stripped
// entirely - TFTH's own "Flesh X" mobs are already a zombie-apocalypse
// roster under a different name (Flesh Villager from Villager, Flesh
// Dog from Wolf, etc. - a real Germ->Awareness infection escalation
// built into the mod itself per TFTH.toml, not a stylistic mismatch
// worked around here), so they stay and expand. New material folded in,
// none of it previously used anywhere in this pack: vanilla husk/
// drowned/zombie_villager (zero cost, zero new mods), TFTH's own much
// larger unused roster (flesh_dog/flesh_hunter_i etc., all real
// registry ids confirmed by decompiling TheFleshThatHatesModEntities.class
// directly, not pattern-guessed from the namespace - real correction
// found doing that: "Flesh Unseen," the spec's own proposed wave-8
// finale mob, turned out to have NO registered EntityType at all in
// this exact mod build - only its combat-stat config section and some
// ambient sound files exist, nothing summonable - so it's not used
// anywhere below despite being in the original proposal), Undead
// Nights' own 3 previously-unused zombie variants (`horde_zombie`/
// `elite_zombie`/`demolition_zombie` - real ids confirmed straight from
// the mod's own shipped `data/undeadnights/tags/entity_types/
// horde_mobs.json` tag, which already bundles exactly this
// all-zombie roster as its own intended default), and a new mod,
// **Mutants and Zombies** (author MCModsPete, same trusted author as
// Undead Nights, v1.4.0/2026-08-04, needs the **Advanced Wall Climber
// API** dependency for its Crawler mob - real ids confirmed by
// decompiling ModEntities.class directly: mod id `mutantszombies`,
// `zombie_brute`/`mutant_brute`/`crawler`/`spitter`/`blister_zombie`/
// `split_head_zombie`/`rotten_mutant`/`mutant_zombie`).
//
// Real framing correction (2026-09-06): waves 1-8 below are NOT "the
// campaign" with wave 8 as a finale - that language is stale, left over
// from before endless-phase scaling existed (see docs/FEATURES.md).
// This is just the hand-authored ramp-up; wave 9 hands off to Undead
// Nights' own already-built 40-level procedural difficulty system,
// which keeps escalating forever. Nothing below is an ending - early
// waves stay light trash-floor infected, Undead Nights' own zombies
// arrive mid-ramp as reinforcements, Mutants and Zombies debuts late,
// and the wall-breaching Demolition Zombie makes its first-ever
// appearance right at the wave 8/9 handoff specifically because that's
// where the endless horde config (undeadnights_horde_mobs_config.json)
// picks it up and keeps using it forever after - not because anything
// is culminating. Witches were removed entirely 2026-08-29 (unrelated
// to this pivot, predates it) - see docs/IDEAS.md's "Mob roster
// exclusions" note.
//
// **TFTH removed entirely, 2026-09-04** - direct real playtest feedback,
// full roster removal (not a per-mob audit as originally planned) but
// the mod's most distinctive death sound is being kept for atmosphere
// (see mob_aggro.js/pedestal_health.js for where that lands). Real
// constraint found while picking replacements: decompiling Undead
// Nights + Mutants and Zombies' own entity registries directly turned
// up only 5 mob types in either mod that weren't already used somewhere
// in this roster - `mutantszombies:blister_zombie`/`split_head_zombie`/
// `spitter`/`mutant_zombie` and vanilla `zombified_piglin` (skipped -
// its real attributes come from an inherited class this pack didn't
// chase down, not a guessed number). 8 TFTH mobs needed replacing, so
// 4 of them reuse an already-scheduled type in an earlier/additional
// wave instead of introducing something new - real, not silently
// papered over. Every fresh pick's real stats (MAX_HEALTH/ATTACK_DAMAGE/
// ARMOR) came from decompiling each mob's own `createAttributes()`, not
// guessed, then tier-matched against TFTH.toml's own real base values
// for the mob being replaced (Global Modifier confirmed 1.0, so the
// config file's numbers are the actual live ones):
// - `flesh_human` (TFTH: 20/4/1) -> `mutantszombies:mutant_zombie`
//   (24/5/0.6) - closest fresh early-tier match.
// - `flesh_villager` (22/4/1) -> `mutantszombies:blister_zombie`
//   (24/5/0.6) - same tier, distinct fresh identity from mutant_zombie.
// - `flesh_dog` (25/6/0) -> `mutantszombies:split_head_zombie`
//   (24/6/0.5) - real attack-damage match (6 vs 6).
// - `plaquecreaturetwo` "Flesh Hunter I" (50/7/6, the toughest
//   non-boss original) -> `mutantszombies:spitter` (75/4-ranged/5.0) -
//   real HP/armor upgrade even against the original, ranged instead of
//   melee but a genuine step up in toughness, fits the "hunter" framing.
// - `flesh_suffer` (40/25, nerfed to 12 here after a real combat
//   incident/4)`) -> `undeadnights:elite_zombie` **reused** (already
//   this wave's other slot - real duplication, not a fresh identity).
//   Elite Zombie's own documented framing ("hits harder... real
//   distinct stat block") is the closest existing match to what Flesh
//   Suffer represented; the custom damage nerf isn't carried over since
//   Elite Zombie's damage is Undead Nights' own tuned value, not a known
//   one-shot risk in this pack.
// - `bruteplaquecreatureone` "Flesh Brute I" (45/4/5) ->
//   `undeadnights:horde_zombie` **reused** (already this wave's other
//   slot too) - "numbers-focused reinforcement" framing is the closest
//   fit available.
// - `flesh_hunter_two` "Flesh Hunter II" (45/6/4) and `flesh_boomer`
//   (20/0, an exploding mob with zero melee damage) originally reused
//   `mutantszombies:mutant_brute`/`zombie_brute` a wave early at wave 7.
//   **Reverted 2026-09-04**, real playtest feedback: "the brutes are
//   very tanky... should be coming in later waves" - not a stat-nerf
//   ask, the user just wanted their real wave-8 debut respected instead
//   of an early duplicate. Wave 7 now repeats already-established
//   mid-tier picks instead (see its own comment there) - Flesh Boomer's
//   explosion archetype still has no real analog in either replacement
//   mod, that gap stands regardless of which mob fills its old numeric
//   slot.
//   equivalent-behavior one.
// Spitter -> Boomer Zombie, 2026-09-05 (direct decision - new mod
// install, "Zombies More" by CaraAleatorio7, real Forge 1.20.1 build,
// hash-verified before installing). Real id `zombiesmore:boomer_zombie`,
// confirmed via the mod's own lang file (not guessed) - decompiled its
// entity class directly too: extends vanilla `Monster` (same as every
// other mob in this roster, so ESM/Arrow Turret targeting and every
// existing roster-list config still covers it with no special-casing
// needed), 20 HP / 5 attack damage / 0.5 armor (real stats, notably
// lower raw stats than Spitter's own 75/4-ranged/5.0 - the real danger
// here is its own special ability, not raw combat stats), and a real
// `AreaEffectCloud`-based poison mist on death (confirmed in its own
// death-handling code, not assumed from the mod's marketing text).
// Replaced everywhere Spitter appeared in the live roster (WAVES,
// WAVE_MOB_TYPES, the endless-phase "other types" tier, loot_bag_drops.js's
// Epic tier, flesh_death_sound.js, mob_aggro.js/pedestal_health.js/
// wave_status.js's own roster copies, and every epicsiegemod-common.toml
// mob list) - old historical comments describing the original TFTH ->
// Spitter replacement decision left untouched, since those document a
// real past decision, not live configuration.
// Modest across-the-board bump, 2026-09-05 (real playtest feedback:
// "waves 1-8 felt too easy") - trash-floor counts only (zombie/husk/
// drowned/blister_zombie/horde_zombie), NOT the Rare (split_head_zombie)
// or Epic (spitter/elite_zombie) tier counts, deliberately - those feed
// directly into the same-day gold-economy fix's own worked math
// (docs/QUEUE.md's "gold still not enough" writeup), and bumping them
// here would silently invalidate that calibration. Not the endless-
// phase's explosive per-level growth - just "a little more," per the
// direct ask, not a difficulty overhaul.
var WAVES = [
  [['minecraft:zombie', 5], ['minecraft:husk', 3], ['minecraft:zombie_villager', 1]],
  [['minecraft:zombie', 4], ['minecraft:husk', 3], ['minecraft:drowned', 2], ['mutantszombies:mutant_zombie', 3]],
  [['minecraft:zombie', 3], ['minecraft:husk', 3], ['minecraft:drowned', 1], ['mutantszombies:mutant_zombie', 2], ['mutantszombies:blister_zombie', 3]],
  [['minecraft:zombie', 3], ['minecraft:husk', 3], ['mutantszombies:blister_zombie', 2], ['mutantszombies:split_head_zombie', 2], ['zombiesmore:boomer_zombie', 1]],
  // Elite Zombie (Undead Nights' own, real distinct stat block per its
  // own bytecode - slower but hits harder than Horde Zombie) replaces
  // the ravager as this wave's toughest mob. Now doing double duty as
  // both its own slot and Flesh Suffer's replacement (see the roster
  // header comment above) - a real duplication, not a fresh identity.
  [['minecraft:zombie', 2], ['minecraft:husk', 2], ['zombiesmore:boomer_zombie', 1], ['undeadnights:elite_zombie', 2]],
  // Undead Nights' own zombies arrive as a numbers-focused reinforcement
  // wave - a real, intended "horde grows" beat, not filler. Horde Zombie
  // now also stands in for Flesh Brute I's slot (see roster header
  // comment) - x3 total this wave, real duplication.
  // split_head_zombie added here 2026-09-04 (real playtest feedback,
  // "not getting enough gold still") - it's the ONLY mob in loot_bag_
  // drops.js's RARE_MOBS tier (gold_ingot's real source), and it only
  // appeared in wave 4 before this - a real, confirmed availability
  // bottleneck, not just a per-bag yield problem (that was already
  // bumped once and still wasn't enough). A second hand-authored
  // appearance here, plus the endless-phase addition in
  // undeadnights_horde_mobs_config.json, gives it real ongoing
  // presence instead of 2 individuals in the entire campaign.
  [['minecraft:zombie', 2], ['minecraft:husk', 2], ['undeadnights:horde_zombie', 4], ['mutantszombies:split_head_zombie', 2]],
  // **Real fix, 2026-09-04**: this wave originally previewed Mutant
  // Brute and Zombie Brute a wave early (filling Flesh Hunter II's and
  // Flesh Boomer's old TFTH slots) - real playtest feedback found this
  // landing wrong once played for real ("the brutes are very tanky...
  // should be coming in later waves, seeing them from wave 7"). Not a
  // stat-nerf ask - the user likes the mobs, just wants their real
  // wave-8 debut respected instead of an early duplicate. Backfilled
  // with more of what's already established by this point (a second
  // Elite Zombie, more Horde Zombie reinforcements, another Spitter)
  // rather than introducing anything new - Mutant Brute/Zombie Brute's
  // actual first appearance is wave 8 below, untouched.
  [['undeadnights:elite_zombie', 2], ['undeadnights:horde_zombie', 3], ['zombiesmore:boomer_zombie', 1]],
  // Toughest hand-authored mix, including the first appearance of
  // something that can genuinely breach the base's own defenses, not
  // just the player - Demolition Zombie, real TNT capability per
  // Undead Nights' own class. A step up, not a climax: the endless
  // horde config below keeps using this exact roster past this point.
  // Mutant Brute (Mutants and Zombies' other confirmed tank mob) takes
  // the slot the original proposal gave "Flesh Unseen" - see the real
  // correction in this block's own header comment for why that mob was
  // dropped.
  [['mutantszombies:crawler', 1], ['mutantszombies:mutant_brute', 1], ['undeadnights:demolition_zombie', 1], ['undeadnights:elite_zombie', 1], ['undeadnights:horde_zombie', 3]],
]

// Also the endless-phase horde roster's own mob set (see
// undeadnights_horde_mobs_config.json) - kept as a superset, same as
// before this pivot, so mob_aggro.js's forced pedestal-targeting and
// wave_status.js's HOSTILE_TYPES counter cover every mob that can
// actually appear post-wave-8, not just the hand-authored ramp.
// `mutantszombies:rotten_mutant` is horde-config-only, never in WAVES
// above - included here for exactly that reason.
var WAVE_MOB_TYPES = [
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

// Endless-phase deterministic baseline layer (2026-09-05, design
// finalized after 3 real clarification rounds with the peer session -
// full writeup in docs/QUEUE.md's "New endless-phase design" entry).
// spawn_horde's own horde tiers are a single weighted pick per call
// (spawnChance sums to 100 per tier, confirmed by decompiling
// SpawnProcess.class), never able to hit a deterministic mob-count
// target - this is an ADDITIVE second layer guaranteeing a real minimum
// count every endless wave, on top of spawn_horde's unchanged own call
// (same attribute scaling, same randomness/flavor value it already had).
// "Other types" tiers below, light to heavy, same real ids as
// WAVE_MOB_TYPES above just grouped by toughness, so
// pickEndlessOtherType can weight heavier types in more as the endless
// level climbs (direct ask: "weighted so tougher types show up more as
// n climbs").
var ENDLESS_OTHER_TIERS = [
  ['minecraft:husk', 'minecraft:drowned', 'minecraft:zombie_villager'],
  ['mutantszombies:mutant_zombie', 'mutantszombies:blister_zombie', 'mutantszombies:split_head_zombie', 'zombiesmore:boomer_zombie'],
  ['undeadnights:elite_zombie', 'undeadnights:horde_zombie', 'undeadnights:demolition_zombie', 'mutantszombies:zombie_brute', 'mutantszombies:mutant_brute', 'mutantszombies:rotten_mutant', 'mutantszombies:crawler'],
]

// Real tuning fix, 2026-09-05 (direct live report: 2 Zombie/Mutant
// Brutes spawned at wave 9/endless level 1, "too tanky that early").
// Original tier-2 weight (min(60, endlessLevel*2)) gave a small but real
// nonzero chance even at level 1 (weight 2 of ~71 total, ~2.8% per pick)
// - with baseline `m` at ~15 picks for wave 9, a real ~7-8% chance of
// hitting 2+ brutes purely by binomial variance, matching what was
// reported. Not "reduce the odds," the ask was "push toward later
// levels" - tier 2 (which includes both confirmed tank mobs,
// zombie_brute/mutant_brute, alongside elite_zombie/horde_zombie/
// demolition_zombie/rotten_mutant/crawler) is now HARD-GATED to zero
// weight below BRUTE_TIER_MIN_LEVEL, not just low-probability - a
// player literally cannot see one from this pool before that level,
// then it ramps up steadily past it.
var BRUTE_TIER_MIN_LEVEL = 5

function pickEndlessOtherType(waveNumber) {
  // Weight shift is keyed on endlessLevel (1-40), not the raw wave
  // number - anchors the curve to the same 1-40 scale
  // hordeSizeScaleFactor/undeadnights_difficulty_config.json already use,
  // rather than stretching arbitrarily for a very long campaign.
  var endlessLevel = Math.min(waveNumber - WAVES.length, 40)
  var tier2Weight = endlessLevel < BRUTE_TIER_MIN_LEVEL ? 0 : Math.min(60, (endlessLevel - BRUTE_TIER_MIN_LEVEL + 1) * 3)
  var weights = [Math.max(5, 40 - endlessLevel), 30, tier2Weight]
  var totalWeight = weights[0] + weights[1] + weights[2]
  var roll = Math.random() * totalWeight
  var tierIndex = roll < weights[0] ? 0 : roll < weights[0] + weights[1] ? 1 : 2
  var tier = ENDLESS_OTHER_TIERS[tierIndex]
  return tier[Math.floor(Math.random() * tier.length)]
}

// Staggered emergence + sound-first spawn cues (docs/IDEAS.md's
// "Atmosphere & Wave Feel", Spawn Behavior). Design doc claimed this
// already existed via "delayed/scheduled spawns" - checked, it didn't;
// every mob summoned synchronously in one loop. Built as a plain queue
// processed by the tick handler below rather than a one-off scheduled
// callback API, since PlayerEvents.tick is the pattern already proven
// reliable throughout this pack (wave_status.js, mob_aggro.js) - no new
// unverified scheduling API introduced.
var pendingSpawns = [] // {mobType, x, y, z, spawnTick, soundTick, soundPlayed}

// Escalation lever: gap between each mob's emergence shrinks at higher
// wave tiers, so early waves stay readable and late waves collapse into
// an overwhelming dump - matches the design doc's "false security"
// curve intent. Floor at 4 ticks (0.2s) rather than 0, so even wave 5
// still reads as distinct emergences, not one instant clump.
var BASE_STAGGER_GAP_TICKS = 16
var MIN_STAGGER_GAP_TICKS = 4
var SOUND_LEAD_TICKS = 12

function staggerGapForWave(waveNumber) {
  return Math.max(MIN_STAGGER_GAP_TICKS, BASE_STAGGER_GAP_TICKS - (waveNumber - 1) * 3)
}

// requireTag defaults true (only count mobs actually spawned by this
// file's own summon code, via td_wave_mob - see the tag's own comment
// at the summon point below for why). Pass false during the endless
// phase (waveNumber > WAVES.length), where mobs come from Undead
// Nights' own opaque spawn_horde command and can never carry the tag -
// falls back to the old type-only matching for that phase specifically.
//
// Takes a plain {x,y,z} origin, not a player - see waveObjective() below
// for why: "regardless of player position" (docs/FEATURES.md's own
// stated intent for the amulet) can't hold if this still measured
// distance from the player.
function nearbyWaveMobCount(origin, level, radius, requireTag) {
  return level.getEntities().filter(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return false
    if (requireTag !== false && !e.getTags().contains('td_wave_mob')) return false
    // Same fix as wave_status.js - a killed mob lingers ~1 second
    // (death animation) before actual removal, so exclude anything
    // already at 0 health rather than waiting for it to disappear.
    if (e.getHealth() <= 0) return false
    var dx = e.getX() - origin.x
    var dy = e.getY() - origin.y
    var dz = e.getZ() - origin.z
    return dx * dx + dy * dy + dz * dz <= radius * radius
  }).length
}

// Real design gap found in playtest (2026-09-02): "I expected the
// enemies to spawn near the base and attack the pedestal. This didn't
// happen - I was out adventuring and they spawned on me. I then ran to
// the base and they despawned, causing me to win the wave." Root cause,
// confirmed by reading the code, not assumed: every spawn-position and
// mob-count calculation in this file always used the player's own
// position. Originally fixed by pointing this at the pedestal only
// while the amulet sat on it (2026-09-02) - **superseded 2026-09-05**,
// real premise correction from the user: the pedestal is the permanent
// front line regardless of amulet state ("if im not in the base to
// defend it then i lose the game"), not an objective that only exists
// while the amulet happens to be placed.
//
// Returns the pedestal's own fixed, permanent position
// (td_pedestalX/Y/Z, set once in playtest_starter_kit.js at world-build
// time, independent of the amulet entirely) - same coordinate
// pedestal_destruction.js already uses for its own destruction check.
// The defensive fallback to the player's own position only matters for
// the narrow window before the base finishes building on a brand-new
// login.
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
//
// Chunk simulation around the pedestal is now a one-time permanent
// forceload set up in playtest_starter_kit.js at world-build time, not
// a toggle - see that file's own comment for the real resource-cost
// tradeoff this accepts.

function useWaveHorn(player) {
  var level = player.getLevel()
  var server = player.getServer()
  var data = player.persistentData

  // Real permanent stop condition (2026-09-03, direct request: "if the
  // pedestal is destroyed you lose") - checked before the cooldown dedup
  // below since this should block every future use, not just get
  // silently swallowed by it. Set once by pedestal_destruction.js and
  // never cleared - the world stays playable after the loss, this is
  // the only thing it locks.
  if (data.getBoolean('td_pedestalDestroyed')) {
    player.tell('§8§oThe horn has nothing left to call to.')
    return
  }

  // Cooldown dedup (20 ticks / 1 second), not just same-tick — both
  // ItemEvents.rightClicked and BlockEvents.rightClicked fire for one
  // physical click, and holding right-click generates repeated events
  // across many ticks, so a same-tick-only check wasn't enough.
  var currentTick = level.getTime()
  var lastTick = data.getInt('td_lastHornUseTick')
  if (currentTick - lastTick < 20) return
  data.putInt('td_lastHornUseTick', currentTick)

  player.playSound(Utils.getSound('minecraft:event.raid.horn'))

  // Also blocks re-use while staggered spawns are still queued but not
  // yet actually summoned - without this, spam-clicking the horn during
  // the emergence window could queue a second wave's mobs on top of the
  // first's before any of them exist yet for nearbyWaveMobCount to see.
  // requireTag false once already past the designed campaign (endless
  // phase) - see nearbyWaveMobCount's own comment for why.
  var isEndlessPhase = data.getInt('td_waveNumber') > WAVES.length
  var objective = waveObjective(player, data)
  if (nearbyWaveMobCount(objective, level, 80, !isEndlessPhase) > 0 || pendingSpawns.length > 0) {
    player.tell('§c[Wave Horn] §fClear the current wave before summoning the next one.')
    return
  }

  // A manual horn use always takes priority over an in-progress countdown
  // (docs/IDEAS.md: "the manual Wave Horn presumably still works during
  // the countdown... the timer is a forcing function for players who
  // don't act, not a removal of the existing manual trigger") - cancels
  // it here so the countdown tick handler below doesn't also fire
  // useWaveHorn a second time once it independently reaches zero.
  data.putBoolean('td_countdownActive', false)

  var waveNumber = data.getInt('td_waveNumber') + 1
  data.putInt('td_waveNumber', waveNumber)

  // Force night before spawning so undead mobs (zombie, skeleton,
  // wither_skeleton) don't immediately catch fire from spawning into
  // daylight. doDaylightCycle is also disabled so time can't drift back
  // to day mid-fight - wave_status.js's "defeated" branch re-enables it
  // and sets time back to day once the wave is cleared.
  server.runCommandSilent('time set night')
  server.runCommandSilent('gamerule doDaylightCycle false')

  // Endless phase (waves 9+, direct request 2026-08-31): the designed
  // 8-wave campaign is done, hand off to Undead Nights' own difficulty-
  // level system instead of repeating WAVES[7] forever. Real
  // integration details, confirmed by decompiling the mod and real
  // sandboxed testing before this was written, not assumed:
  // - Its commands NPE from a console/RCON source (getEntity() on a
  //   non-entity source) - needs `execute as <player>`, unlike every
  //   other command in this file which uses the plain console source
  //   via server.runCommandSilent directly. `@a` rather than a
  //   specific name/UUID, same "this pack is single-player-focused"
  //   reasoning as wave_status.js's starter-gear removal.
  // - Endless level maps 1:1 to (waveNumber - FINAL_WAVE), clamped to
  //   40 (the number of authored levels in
  //   config/undeadnights_difficulty_config.json) - holds at level 40's
  //   values past that, same clamp pattern WAVES.length already uses
  //   for wave 8.
  // - spawn_horde is a genuine on-demand trigger (confirmed live in
  //   the sandbox test), no day-count dependency - difficulty set then
  //   spawn_horde, same call-and-response pattern as every other
  //   command pair in this file.
  // - Does NOT use pendingSpawns/the staggered-emergence system below -
  //   Undead Nights handles its own spawn positioning (a fixed
  //   distanceMin/distanceMax band around the player, shipped via
  //   defaultconfigs/undeadnights-server.toml since that's a SERVER-type
  //   Forge config that only loads at world start and can't be
  //   rewritten live - confirmed by direct sandboxed testing, see
  //   docs/FEATURES.md's "Wave Horn" section for the full story).
  //
  // Moved up from below the endless-phase branch (2026-09-05) so the
  // endless-phase baseline-mob layer added below can reuse the exact
  // same position/stagger helpers as the hand-authored wave branch,
  // rather than duplicating them.
  //
  // Fixed distance from the OBJECTIVE (the pedestal while the amulet
  // sits on it, else the player - see waveObjective() above), not the
  // worldborder edge (rewritten 2026-09-01, real bug found in playtest:
  // border-relative spawning meant spawn distance grew with the border -
  // base_expansion.js's escalating growth curve alone reaches a
  // 270-block half-width by wave 8, and the amulet's own
  // BORDER_EXPAND_DELTA (amulet_pedestal.js, 10000000) balloons it far
  // beyond that whenever the amulet sits on the pedestal - mobs were
  // spawning literally millions of blocks away and never arriving, read
  // in-game as "the horn says a horde spawned but nothing shows up."
  // Both this system and the endless-phase system (wave_spawner.js's
  // `undeadnights spawn_horde` branch below, which already uses a fixed
  // distanceMin/distanceMax band around the player via
  // defaultconfigs/undeadnights-server.toml, unaffected by the amulet -
  // that's Undead Nights' own separate spawn positioning, out of scope
  // here) now share the same fixed-distance shape instead of one being
  // border-relative and one player-relative.
  //
  // Switched from always-player to waveObjective() 2026-09-02, real
  // playtest report: "I expected the enemies to spawn near the base and
  // attack the pedestal. This didn't happen - I was out adventuring and
  // they spawned on me." See waveObjective()'s own comment above for
  // the full root-cause writeup.
  //
  // Distance band picked to land clearly outside the compound itself
  // (the base is ~11 blocks across) while staying inside typical
  // render distance for the staggered walk-in and sound-cue design to
  // still read as intended - smaller than Undead Nights' 240-256 band,
  // which was sized for endless-phase view distance, not this designed
  // 8-wave campaign.
  //
  // Border damage stays disabled regardless (playtest_starter_kit.js) -
  // harmless, and the border is still a real containment boundary
  // during normal exploration even though wave mobs no longer spawn
  // relative to it.
  var SPAWN_DISTANCE_MIN = 40
  var SPAWN_DISTANCE_MAX = 60

  // Real, confirmed root cause of the "nothing spawns" saga across this
  // whole pack's history (2026-09-02): Math.PI is undefined in this
  // exact KubeJS/Rhino environment - confirmed on a clean sandbox boot,
  // at top-level script scope, with zero event-callback involvement
  // (Math.cos/Math.sin/Math.random all work fine; Math.PI and Math.E
  // specifically do not - a real quirk in how this KubeJS version
  // exposes Math's static fields, not a guess). Every angle computed
  // below was silently NaN, so every mob spawn position was NaN,NaN -
  // /summon with NaN coordinates fails silently (runCommandSilent
  // suppresses the feedback), so no wave mob has ever actually spawned
  // via this function. The staggered pendingSpawns queue still drained
  // normally regardless (queue entries are removed once processed,
  // whether their summon succeeded or not), which is why re-using the
  // horn still looked correctly gated for the first few seconds after
  // each use - that was the queue itself, not real mobs, misleading
  // every earlier investigation into this bug. Hardcoded literal below,
  // not Math.PI - see mob_aggro.js's own historical flag on this exact
  // constant for the earlier, unconfirmed version of this same worry.
  var PI = 3.141592653589793

  function randomObjectiveRelativePosition() {
    var angle = Math.random() * 2 * PI
    var distance = SPAWN_DISTANCE_MIN + Math.random() * (SPAWN_DISTANCE_MAX - SPAWN_DISTANCE_MIN)
    return {
      x: Math.floor(objective.x + Math.cos(angle) * distance),
      z: Math.floor(objective.z + Math.sin(angle) * distance),
    }
  }

  if (waveNumber > WAVES.length) {
    var endlessLevel = Math.min(waveNumber - WAVES.length, 40)
    // Real bug found 2026-09-05 (live report: horde size/type reads
    // "stuck" well past the wave it should have grown at): decompiled
    // DifficultyLevelCommand.setDifficulty() directly - every single
    // call, even one that re-sets the SAME level, unconditionally resets
    // UndeadNights' own sequential horde-selection index
    // (serverState.setPossibleHordesIndex(-1)). Since this command used
    // to run on every wave regardless of whether the level actually
    // changed, that index got reset every wave too - real, confirmed
    // effect: listOfPossibleHordes always resolves its first entry,
    // never actually cycling through the rest as the mod intends. Now
    // only calling `difficulty set` when the level genuinely changes.
    // (`data` is already in scope from this function's own top - see
    // useWaveHorn()'s own opening lines.)
    if (data.getInt('td_lastEndlessLevel') !== endlessLevel) {
      data.putInt('td_lastEndlessLevel', endlessLevel)
      server.runCommandSilent(`execute as @a at @s run undeadnights difficulty set ${endlessLevel}`)
    }
    server.runCommandSilent(`execute as @a at @s run undeadnights spawn_horde`)

    // Deterministic baseline layer, additive on top of spawn_horde above
    // (see ENDLESS_OTHER_TIERS/pickEndlessOtherType's own comment for the
    // full design writeup). n = waveNumber (the real overall wave number,
    // confirmed against docs/QUEUE.md's own worked table - NOT
    // endlessLevel, which is anchored to the 1-40 difficulty scale
    // instead and used only for the other-type weighting above).
    //   z = round(10 + n*1.054^n)  -- vanilla zombie count
    //   m = round(5 + n*1.01^n)    -- "other types," tier-weighted
    // Reuses this same function's own randomObjectiveRelativePosition/
    // pendingSpawns/staggerGapForWave - front-loaded continuous stream at
    // wave start (staggerGapForWave's own 4-tick/0.2s floor is already
    // reached by wave 9, so every endless wave drains at that pace) until
    // the full total is queued, then stops - NOT paced out across the
    // whole countdown window (an earlier version of this spec called for
    // that; corrected by the peer before this was built). No performance
    // gate required per direct instruction - spreading spawns over time
    // inherently avoids the concentrated-tick-load concern that would
    // have needed measuring first; the separate, already-queued general
    // FPS/world-load investigation is unrelated and still stands on its
    // own.
    var baselineZombieCount = Math.round(10 + waveNumber * Math.pow(1.054, waveNumber))
    var baselineOtherCount = Math.round(5 + waveNumber * Math.pow(1.01, waveNumber))
    var baselineStaggerGap = staggerGapForWave(waveNumber)
    var baselineIndex = 0
    for (var zi = 0; zi < baselineZombieCount; zi++) {
      var zPos = randomObjectiveRelativePosition()
      var zSpawnTick = currentTick + baselineIndex * baselineStaggerGap
      pendingSpawns.push({
        mobType: 'minecraft:zombie',
        x: zPos.x,
        y: Math.floor(objective.y),
        z: zPos.z,
        spawnTick: zSpawnTick,
        soundTick: zSpawnTick - SOUND_LEAD_TICKS,
        soundPlayed: false,
      })
      baselineIndex++
    }
    for (var mi = 0; mi < baselineOtherCount; mi++) {
      var mPos = randomObjectiveRelativePosition()
      var mSpawnTick = currentTick + baselineIndex * baselineStaggerGap
      pendingSpawns.push({
        mobType: pickEndlessOtherType(waveNumber),
        x: mPos.x,
        y: Math.floor(objective.y),
        z: mPos.z,
        spawnTick: mSpawnTick,
        soundTick: mSpawnTick - SOUND_LEAD_TICKS,
        soundPlayed: false,
      })
      baselineIndex++
    }

    player.tell(`§6[Wave Horn] §fWave ${waveNumber} incoming! (endless horde, difficulty ${endlessLevel}, +${baselineZombieCount + baselineOtherCount} baseline)`)
    server.runCommandSilent(`title @a title {"text":"WAVE ${waveNumber}","color":"gold","bold":true}`)
    server.runCommandSilent(`title @a subtitle {"text":"An endless horde approaches...","color":"white"}`)
    // Real placeholder sound, 2026-09-05 - direct ask: something audible
    // at the exact wave-start moment, vanilla bell for now, explicitly
    // swappable for something scarier later. Wired here too, not just
    // the hand-authored path below - every wave start, not just 1-8.
    server.runCommandSilent(`playsound minecraft:block.bell.use master @a ~ ~ ~ 1 1`)
    return
  }

  var composition = WAVES[Math.min(waveNumber, WAVES.length) - 1]
  var totalMobs = 0

  // Staggered instead of all-at-once - each mob gets a queued spawn
  // tick (staggerGap apart, tightening at higher waveNumber) and a sound
  // cue tick shortly before it, processed by the tick handler below.
  var staggerGap = staggerGapForWave(waveNumber)
  var mobIndex = 0

  composition.forEach(function (pair) {
    var mobType = pair[0]
    var count = pair[1]
    for (var i = 0; i < count; i++) {
      var pos = randomObjectiveRelativePosition()
      var spawnTick = currentTick + mobIndex * staggerGap
      pendingSpawns.push({
        mobType: mobType,
        x: pos.x,
        // Ground-ish estimate, reused for the sound cue's position and
        // as the summon command's starting Y - not required to be
        // exact, since the /spreadplayers correction in the spawn tick
        // handler below fixes the mob's actual final height.
        y: Math.floor(objective.y),
        z: pos.z,
        spawnTick: spawnTick,
        soundTick: spawnTick - SOUND_LEAD_TICKS,
        soundPlayed: false,
      })
      mobIndex++
      totalMobs++
    }
  })

  var displayWave = Math.min(waveNumber, WAVES.length)
  player.tell(`§6[Wave Horn] §fWave ${displayWave} incoming! (${totalMobs} mobs)`)
  // Big on-screen title (like an achievement popup), not just chat —
  // chat is easy to miss mid-fight. Uses vanilla /title via
  // runCommandSilent, consistent with every other command in this pack
  // rather than an unverified KubeJS-specific title API.
  server.runCommandSilent(`title @a title {"text":"WAVE ${displayWave}","color":"gold","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"${totalMobs} mobs incoming!","color":"white"}`)
  // Real placeholder sound, 2026-09-05 - direct ask: play something when
  // a wave starts, vanilla bell for now, explicitly a placeholder the
  // user may swap for something scarier later.
  server.runCommandSilent(`playsound minecraft:block.bell.use master @a ~ ~ ~ 1 1`)
}

// Covers right-clicking with nothing targeted (rare on Superflat, but
// possible e.g. looking up).
ItemEvents.rightClicked('kubejs:wave_horn', function (event) {
  useWaveHorn(event.entity)
})

// Covers right-clicking while targeting a block — the common case on
// Superflat. No per-item filter exists for this event (it filters by
// block, not held item), so it's unfiltered and checks the held item
// itself.
BlockEvents.rightClicked(function (event) {
  if (event.item.getId() !== 'kubejs:wave_horn') return
  useWaveHorn(event.entity)
})

// Processes pendingSpawns - plays a positioned sound-first cue shortly
// before each queued mob's spawn tick, then actually summons it once
// that tick arrives. Early-returns when the queue is empty (the common
// case) so this costs nothing outside an active wave's emergence
// window. Uses /playsound with explicit coordinates (not
// player.playSound(), which is player-relative and follows them) so the
// cue is actually positioned where the mob is about to appear -
// minecraft:ambient.cave is a generic eerie one-shot, not tied to any
// specific mob type, since TFTH's own sound event registry names
// weren't verified.
//
// Ground-height correction (2026-08-20, real-terrain switch): summoning
// exactly at spawn.y (a rough player-height estimate) only worked on
// flat Superflat ground, where every column shared the same height.
// Real Desert terrain varies across the border's perimeter (dunes,
// small dips), so a mob could summon embedded in terrain or floating
// above it.
//
// First fix was summoning well above spawn.y and letting vanilla
// gravity drop the mob onto the real surface — worked, but looked
// wrong ("enemies falling from the sky") for mobs that are supposed to
// read as menacingly approaching, not literally raining in. Replaced
// with a silent correction instead: summon at the rough estimate (its
// exact starting height doesn't matter, even if embedded/floating),
// tag it uniquely, then use `/spreadplayers` — the same vanilla
// heightmap-aware "place on solid ground here" command already used in
// playtest_starter_kit.js for the player's own fixed spawn — to
// teleport just that mob onto the real surface, instantly and
// invisibly, before immediately clearing the tag. A small maxRange (4)
// keeps the correction tight to the intended spawn point rather than
// drifting. Tag-then-immediately-clear is race-safe here because
// pendingSpawns.forEach processes one spawn at a time, synchronously,
// within a single tick — even same-type mobs due on the same tick can't
// collide on the tag (see the comment above summon in the loop below).
PlayerEvents.tick(function (event) {
  if (pendingSpawns.length === 0) return

  var player = event.entity
  var level = player.getLevel()
  var server = player.getServer()
  var currentTick = level.getTime()
  var stillPending = []

  pendingSpawns.forEach(function (spawn) {
    if (!spawn.soundPlayed && currentTick >= spawn.soundTick) {
      server.runCommandSilent(
        `playsound minecraft:ambient.cave ambient @a ${spawn.x} ${spawn.y} ${spawn.z} 1 0.6`
      )
      spawn.soundPlayed = true
    }
    if (currentTick >= spawn.spawnTick) {
      // td_wave_mob (2026-09-01, real bug found in playtest: the
      // "hostiles remaining" counter in wave_status.js, and this file's
      // own nearbyWaveMobCount below, both used to match by mob TYPE
      // only - any vanilla zombie/skeleton/spider from a nearby
      // structure's real spawner block (spawners bypass doMobSpawning,
      // confirmed vanilla behavior) within the counting radius got
      // miscounted as a wave mob. td_wave_mob is permanent (unlike
      // td_justSpawned below, which is removed within this same block) -
      // both counters now require it, not just a type match, for the
      // deterministic 1-8 wave phase. Endless-phase (waves 9+) mobs
      // don't go through this summon path at all - Undead Nights spawns
      // its own hordes via an opaque command - so they can't carry this
      // tag; nearbyWaveMobCount/wave_status.js fall back to type-only
      // matching specifically when waveNumber > WAVES.length.
      // Flesh Suffer-specific attack-damage nerf (2026-09-01, real
      // combat incident) removed 2026-09-04 along with the mob itself -
      // TFTH fully removed from the roster (see the WAVES header comment
      // above). Its replacement (undeadnights:elite_zombie) uses its own
      // mod-tuned damage value, not a known one-shot risk here.
      // PersistenceRequired:1b added 2026-09-02, part of the same
      // amulet-objective fix as waveObjective() above - "regardless of
      // player position" (docs/FEATURES.md's own stated design intent)
      // can never actually hold while these mobs stay vanilla-
      // despawnable, since a hostile mob far from every player is
      // eligible to despawn on its own regardless of what's targeting
      // it. Applies to every wave mob now, not just the amulet case -
      // no real downside outside it either, since td_wave_mob-tagged
      // mobs are meant to be fought, not left to quietly disappear.
      var summonNbt = '{Attributes:[{Name:"generic.follow_range",Base:128}],PersistenceRequired:1b,Tags:["td_justSpawned","td_wave_mob"]}'
      // td_justSpawned added and removed within this same synchronous
      // block, so the very next spawn processed (even same tick, even
      // same mob type) can never see a stale tag from this one.
      // td_wave_mob is never removed - it identifies the mob as
      // wave-spawned for the rest of its life.
      server.runCommandSilent(
        `summon ${spawn.mobType} ${spawn.x} ${spawn.y} ${spawn.z} ${summonNbt}`
      )
      server.runCommandSilent(
        `spreadplayers ${spawn.x} ${spawn.z} 0 4 false @e[type=${spawn.mobType},tag=td_justSpawned,limit=1,sort=nearest]`
      )
      server.runCommandSilent(
        `tag @e[type=${spawn.mobType},tag=td_justSpawned,limit=1,sort=nearest] remove td_justSpawned`
      )
    } else {
      stillPending.push(spawn)
    }
  })

  // Real signal for wave_airdrop.js's clear-time check (2026-09-05): the
  // tick every queued mob for this wave has actually emerged, not wave
  // start - doesn't penalize the player for this file's own staggered
  // spawn-in time on big wave-8+ mob counts. Written to persistentData
  // (not a shared top-level var) since that's this codebase's proven
  // cross-file communication idiom - see pedestal_health.js's own
  // functions for the other sanctioned one (shared top-level FUNCTIONS).
  // The guard above (`if (pendingSpawns.length === 0) return`) means this
  // block only ever runs when the queue was non-empty at tick start, so
  // an empty result here always means "just finished," not "was already
  // empty."
  if (stillPending.length === 0) {
    player.persistentData.putInt('td_waveSpawnCompleteTick', currentTick)
  }

  pendingSpawns = stillPending
})

// On-screen countdown to the next wave (docs/IDEAS.md's "On-screen
// countdown timer to the next wave"). wave_status.js starts this
// (td_countdownActive/td_countdownEndTick) directly on wave-clear - the
// auto-trigger has to live here rather than there so it can call
// useWaveHorn() directly; server_scripts don't reliably share top-level
// scope/functions across files (same constraint noted throughout this
// codebase, e.g. HOSTILE_TYPES/WAVES being redeclared per-file rather
// than imported), so cross-file coordination goes through
// player.persistentData flags instead, same as td_inWave already does
// between wave_status.js/base_expansion.js.
var COUNTDOWN_DISPLAY_THROTTLE = 20 // once/second is plenty for a countdown display

PlayerEvents.tick(function (event) {
  var player = event.entity
  var data = player.persistentData
  if (!data.getBoolean('td_countdownActive')) return

  var level = player.getLevel()
  var currentTick = level.getTime()
  var remaining = data.getInt('td_countdownEndTick') - currentTick

  if (remaining <= 0) {
    data.putBoolean('td_countdownActive', false)
    useWaveHorn(player)
    return
  }

  if (currentTick % COUNTDOWN_DISPLAY_THROTTLE !== 0) return
  var totalSeconds = Math.ceil(remaining / 20)
  var minutes = Math.floor(totalSeconds / 60)
  var seconds = totalSeconds % 60
  var secondsDisplay = seconds < 10 ? '0' + seconds : '' + seconds
  player.setStatusMessage(`§b⏱ Next wave in: ${minutes}:${secondsDisplay}`)
})
