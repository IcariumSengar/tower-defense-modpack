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
// **Historical note (kept for the technical reasoning below, which
// mostly still applies): this used to be triggered by a plain custom
// item, kubejs:wave_horn, not vanilla's Goat Horn — tried Goat Horn
// first for the free texture/sound, but ItemEvents.rightClicked never
// fires at all while an item is on cooldown (confirmed from
// KubeJSItemEventHandler.java's own dispatch logic), and Goat Horn has a
// real vanilla cooldown built in. A plain item has no cooldown, so the
// event reliably fired; a manual sound effect below keeps the horn feel.
// The item itself is GONE as of 2026-09-13 (see the note block section
// further down) — only the "why a plain item" reasoning above is now
// moot, the "both events fire for one click" / Rhino-quirk / accessor
// findings below still describe the note block's own handler exactly.**
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
// dedup guard below prevents double-processing a single click. (Now only
// BlockEvents.rightClicked remains — see the historical note above.)
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
//
// Boomer Zombie: pulled from every wave (waves 4/5/7) 2026-09-09 ("remove
// the boomers for now, i cant figure out how to balance these, they keep
// blowing up my pedestal" - a real balance problem, boomer_zombie_
// explosion.js's own block-destroying blast, not a bug), then narrowed to
// a rare endless-phase pick 2026-09-10 ("just make them rarer, less
// frequent"), then **removed entirely 2026-09-11** ("just remove boomers
// entirely from the game" - a direct, unambiguous supersession of the
// "rarer" call from one day earlier). Fully purged this time, not left
// as inert roster-copy entries the way the 2026-09-09 pull did:
// zombiesmore:boomer_zombie is gone from WAVE_MOB_TYPES,
// ENDLESS_OTHER_TIERS, pickEndlessOtherType's own reroll (removed, no
// longer needed), and every roster-copy array elsewhere (mob_aggro.js/
// pedestal_health.js/wave_status.js/bounty_kills.js/flesh_death_sound.js/
// loot_bag_drops.js's EPIC_MOBS/epicsiegemod-common.toml's 4 mob lists).
// boomer_zombie_explosion.js (the block-destroying blast this mob alone
// needed) is deleted outright - dead code once the mob can never spawn.
// Zombies More itself is LEFT INSTALLED (not uninstalled) - its own
// natural-spawn biome-modifier override (kubejs/data/zombiesmore/forge/
// biome_modifier/boomer_zombie_biome_modifier.json) still blocks the mod's
// own worldgen spawns and must stay for boomer to be genuinely gone, not
// just absent from this pack's own spawn logic.
// Filler zombie/husk counts trimmed 2026-09-12 (real 3-player playtest
// feedback: "too difficult with three players" - waves 1-8 had only ever
// had mobs ADDED since launch, never trimmed, so several independent
// "make it harder" asks compounded into a total nobody had tuned for a
// group). Cut only the generic zombie/husk reinforcement counts - every
// named/signature mob (Crawler's pack of 4, split_head_zombie's gold-drop
// counts, Elite/Horde Zombie, etc.) is untouched. Waves 7-8 have no plain
// zombie/husk filler to cut, so they're unchanged.
var WAVES = [
  [['minecraft:zombie', 3], ['minecraft:husk', 2], ['minecraft:zombie_villager', 1]],
  [['minecraft:zombie', 2], ['minecraft:husk', 2], ['minecraft:drowned', 2], ['mutantszombies:mutant_zombie', 3]],
  [['minecraft:zombie', 2], ['minecraft:husk', 2], ['minecraft:drowned', 1], ['mutantszombies:mutant_zombie', 2], ['mutantszombies:blister_zombie', 3]],
  [['minecraft:zombie', 2], ['minecraft:husk', 2], ['mutantszombies:blister_zombie', 2], ['mutantszombies:split_head_zombie', 2]],
  // Elite Zombie (Undead Nights' own, real distinct stat block per its
  // own bytecode - slower but hits harder than Horde Zombie) replaces
  // the ravager as this wave's toughest mob. Now doing double duty as
  // both its own slot and Flesh Suffer's replacement (see the roster
  // header comment above) - a real duplication, not a fresh identity.
  [['minecraft:zombie', 1], ['minecraft:husk', 1], ['undeadnights:elite_zombie', 2]],
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
  [['minecraft:zombie', 1], ['minecraft:husk', 1], ['undeadnights:horde_zombie', 4], ['mutantszombies:split_head_zombie', 2]],
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
  [['undeadnights:elite_zombie', 2], ['undeadnights:horde_zombie', 3]],
  // Toughest hand-authored mix, including the first appearance of
  // something that can genuinely breach the base's own defenses, not
  // just the player - Demolition Zombie, real TNT capability per
  // Undead Nights' own class. A step up, not a climax: the endless
  // horde config below keeps using this exact roster past this point.
  // Mutant Brute (Mutants and Zombies' other confirmed tank mob) takes
  // the slot the original proposal gave "Flesh Unseen" - see the real
  // correction in this block's own header comment for why that mob was
  // dropped.
  // Crawler 1 -> 4 (2026-09-10, direct ask: "more crawlers as it's a new
  // mob type and I want the player to be taken off guard") - wave 8 is the
  // Crawler's debut and the only written wave it appears in, so the pack
  // of four is the beat, not a single scout.
  //
  // Mutant Brute pulled from this wave entirely, 2026-09-10 (direct ask:
  // "move the brutes to later waves, say from wave 20") - the 2026-09-04
  // fix above already pushed brutes back from wave 7 to wave 8; this is
  // the same feedback again, one tier further out. Backfilled by bumping
  // Horde Zombie 3 -> 4 (already this wave's own reinforcement pick, see
  // above) rather than introducing anything new, same "more of what's
  // already established" pattern as the 2026-09-04 fix - keeps this
  // wave's total at 10 mobs (docs/QUEUE.md item #10). See
  // BRUTE_TIER_MIN_LEVEL below for the matching endless-phase change -
  // no brute of either type (zombie_brute/mutant_brute) can appear before
  // wave 20 now, hand-authored or endless.
  [['mutantszombies:crawler', 4], ['undeadnights:demolition_zombie', 1], ['undeadnights:elite_zombie', 1], ['undeadnights:horde_zombie', 4]],
]

// Endless-phase vocabulary (2026-09-10, direct ask: the wave-start popup
// "from wave 8 onwards ... rename this and any other new wave popup to use
// the horde vocab"). Every player-facing label past the written waves says
// "Horde N" instead of "Wave N": the start title/subtitle and toast here,
// the boss title (boss_wave.js), the cleared subtitle and the hostiles
// action bar (wave_status.js), the countdown, and the one wave-start chat
// line. Shared as a top-level function (the reliable cross-file idiom in
// this Rhino build); WAVES is this file's own roster, so "written" is
// defined in exactly one place.
function tdWaveLabel(waveNumber) {
  return (waveNumber > WAVES.length ? 'Horde ' : 'Wave ') + waveNumber
}

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
  ['mutantszombies:mutant_zombie', 'mutantszombies:blister_zombie', 'mutantszombies:split_head_zombie'],
  // Crawler weighted up 2026-09-10 (direct ask: "more crawlers... to make
  // the game harder") - listed 3x instead of once, so it's 3 of 7 picks
  // here (~43%) instead of 1 of 5 (20%). Real reason it's the pick for
  // "harder," not just "more mobs": decompiled CrawlerEntity.class
  // directly - it implements Advanced Wall Climber API's own
  // IAdvancedClimber with a real ClimberPathNavigator, so it can climb
  // straight up a chokepoint wall's face instead of needing to path
  // around or through it, on top of already being faster than a vanilla
  // zombie (0.3 movement speed vs. 0.23). The other 4 tier-2 mobs keep
  // equal odds against each other, just diluted by Crawler's bigger slice.
  ['undeadnights:elite_zombie', 'undeadnights:horde_zombie', 'undeadnights:demolition_zombie', 'mutantszombies:rotten_mutant', 'mutantszombies:crawler', 'mutantszombies:crawler', 'mutantszombies:crawler'],
  // Brute-only tier, split out of tier 2 above 2026-09-10 (direct ask:
  // "move the brutes to later waves, say from wave 20"). Both brutes used
  // to share tier 2 and its single BRUTE_TIER_MIN_LEVEL gate below -
  // pushing that gate back to wave 20 would have dragged elite_zombie/
  // horde_zombie/demolition_zombie/rotten_mutant/crawler back with it
  // too, even though only the brutes were ever the complaint (2026-09-04's
  // "brutes are very tanky... should be coming in later waves" - this is
  // the same feedback, one tier further out). Splitting them into their
  // own tier lets BRUTE_TIER_MIN_LEVEL move without touching tier 2's
  // original level-5 unlock.
  ['mutantszombies:zombie_brute', 'mutantszombies:mutant_brute'],
]

// Real tuning fix, 2026-09-05 (direct live report: 2 Zombie/Mutant
// Brutes spawned at wave 9/endless level 1, "too tanky that early").
// Original tier-2 weight (min(60, endlessLevel*2)) gave a small but real
// nonzero chance even at level 1 (weight 2 of ~71 total, ~2.8% per pick)
// - with baseline `m` at ~15 picks for wave 9, a real ~7-8% chance of
// hitting 2+ brutes purely by binomial variance, matching what was
// reported. Not "reduce the odds," the ask was "push toward later
// levels" - tier 2 was HARD-GATED to zero weight below this level, not
// just low-probability - a player literally cannot see one from this
// pool before that level, then it ramps up steadily past it.
//
// **Split 2026-09-10**: this used to gate the whole tier, brutes
// included (see the tier-split comment above ENDLESS_OTHER_TIERS) -
// renamed from BRUTE_TIER_MIN_LEVEL to TIER2_MIN_LEVEL since it no
// longer has anything to do with brutes specifically, value unchanged
// (elite_zombie/horde_zombie/demolition_zombie/rotten_mutant/crawler
// still unlock at wave 13 exactly as before).
var TIER2_MIN_LEVEL = 5
// Brutes' own gate, split out 2026-09-10 (direct ask: "move the brutes
// to later waves, say from wave 20") - moved from 5 to 12 (endless level
// = waveNumber - WAVES.length, and WAVES.length is 8, so level 12 is
// wave 20 exactly). Mutant Brute's wave 8 hand-authored appearance was
// also removed (WAVES[7] above) for the same reason - no brute of
// either type before wave 20 now, hand-authored or endless.
//
// That claim missed Undead Nights' own spawn_horde half until 2026-09-28:
// config/undeadnights_horde_mobs_config.json still had mutant_brute in
// mixed_horde (level 9 = wave 17 in single player, since `difficulty set`
// resets UN's horde index every wave so each level's first listed horde is
// the one that spawns; wave 9 for a second player) and zombie_brute in
// elite_horde and the boss horde. The brutes now live only in copies of
// those hordes (ids 5-7) that levels 12+ point at - see
// undeadnights_difficulty_config.json. Keep the two gates on the same level.
var BRUTE_TIER_MIN_LEVEL = 12

// Brute speed fix, 2026-09-10 (direct ask: "the brutes aren't hard they
// are just annoying and tanky"). Decompiled both real entity classes
// directly (net/petemc/mutantszombies/entity/{Zombie,Mutant}BruteEntity.
// class createAttributes(), same jar this pack ships): zombie_brute is
// 100 HP/16 damage/16 armor at 0.21 movement speed, mutant_brute 120
// HP/18 damage/18 armor at 0.2 - both SLOWER than a vanilla zombie's
// 0.23, and both have full (1.0) knockback resistance on top of that.
// That's the real mechanism behind "annoying and tanky, not hard": a
// player who just walks (let alone sprints) away never gets hit at all,
// so the fight is either a non-event or a tedious stationary grind - the
// high HP/armor/damage never gets to matter. Not touching HP/damage/
// armor at all, only movement speed, via the same summon-NBT Attributes
// override boss_wave.js already uses for "The Behemoth" (which had this
// exact same problem and gets the same fix there). 0.28 - faster than
// every other roster mob except Crawler's dedicated 0.3 swarm speed, so
// a Brute can now actually run a player down instead of just standing
// in the way.
var BRUTE_SPEED_FIX_TYPES = ['mutantszombies:zombie_brute', 'mutantszombies:mutant_brute']
var BRUTE_MOVEMENT_SPEED = 0.28

// Mutant Brute HP halved, 2026-09-11 (direct ask: "make the brute's health
// 50% of what they currently are" - clarified to Mutant Brute specifically,
// not Zombie Brute, when both existed as candidates). Native class default
// is 120 (decompiled, see this section's own comment above) - halved to 60.
// Zombie Brute's 100 HP is deliberately untouched. Same summon-NBT
// Attributes override mechanism as BRUTE_SPEED_FIX_TYPES/boss_wave.js's own
// health override - `Health:` also has to be set alongside the
// `generic.max_health` attribute (not just the attribute alone), same as
// boss_wave.js's summon NBT does, or the entity spawns at its old native
// max HP with the new lower cap only affecting future healing/regen, not
// its actual starting health.
//
// Undead Nights' hordes (levels 12+) get the same 60 from the same two
// fields, set in the horde config's own nbtTags for mutant_brute
// (2026-09-28). UN then multiplies max_health by its level health scale
// (SpawnProcess.spawnHordeMob, decompiled) but never raises current health
// for a non-UN mob unless dynamic scaling is on (it's off), so a horde
// Mutant Brute also starts at 60 HP - only its displayed max is higher.
// Keep that nbtTags value equal to this constant.
var MUTANT_BRUTE_MAX_HEALTH = 60

function pickEndlessOtherType(waveNumber) {
  // Weight shift is keyed on endlessLevel (1-40), not the raw wave
  // number - anchors the curve to the same 1-40 scale
  // hordeSizeScaleFactor/undeadnights_difficulty_config.json already use,
  // rather than stretching arbitrarily for a very long campaign.
  var endlessLevel = Math.min(waveNumber - WAVES.length, 40)
  // Ramp rate steepened 2026-09-10 (direct ask: "the waves need to ramp
  // up in difficulty way more quickly") - *3 -> *5 and cap 60 -> 80 for
  // both. Deliberately NOT touching TIER2_MIN_LEVEL/BRUTE_TIER_MIN_LEVEL
  // themselves - those are the exact unlock levels the peer session just
  // set this same day on a direct, explicit ask ("move the brutes to
  // later waves, say from wave 20"), so brutes still can't appear before
  // level 12/wave 20. This only makes each tier dominate faster once it
  // DOES unlock - tier2 hits its new cap by level 20 (was level 25), the
  // brute tier by level 28 (was level 32).
  var tier2Weight = endlessLevel < TIER2_MIN_LEVEL ? 0 : Math.min(80, (endlessLevel - TIER2_MIN_LEVEL + 1) * 5)
  var bruteWeight = endlessLevel < BRUTE_TIER_MIN_LEVEL ? 0 : Math.min(80, (endlessLevel - BRUTE_TIER_MIN_LEVEL + 1) * 5)
  var weights = [Math.max(5, 40 - endlessLevel), 30, tier2Weight, bruteWeight]
  var totalWeight = weights[0] + weights[1] + weights[2] + weights[3]
  var roll = Math.random() * totalWeight
  var tierIndex = roll < weights[0] ? 0 : roll < weights[0] + weights[1] ? 1 : roll < weights[0] + weights[1] + weights[2] ? 2 : 3
  var tier = ENDLESS_OTHER_TIERS[tierIndex]
  // Boomer's own reroll (added 2026-09-10 to make it rarer, not removed)
  // deleted 2026-09-11 along with the rest of the mob - see this file's
  // WAVES header comment for the full removal writeup. Plain uniform pick
  // again, same as every other tier here.
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
// Endless-phase horde tagging (2026-09-10, real live bug - see
// mob_aggro.js's td_wave_mob gate comment for the incident). Undead
// Nights' spawn_horde creates its mobs itself, untagged, so every
// consumer of "is this a wave mob" used to fall back to type-only
// matching during waves 9+ - which is indistinguishable from a husk baked
// into a nearby structure. Fix: snapshot every untagged roster-type
// entity's UUID the instant spawn_horde is issued, then for
// HORDE_TAG_WINDOW_TICKS afterwards tag any roster-type mob that was NOT
// in that snapshot (and isn't a structure guard) as td_wave_mob, within
// HORDE_TAG_RADIUS of the player - the horde spawns 70-75 blocks out
// (defaultconfigs/undeadnights-server.toml). A structure mob whose chunk
// happens to load inside that window and radius gets conscripted into
// the wave; a bounded, rare edge accepted over type-only matching.
// Decompiled the mod before sizing this, not guessed: SpawnHordeCommand
// -> SpawnProcess.synchronousHordeSpawner -> spawnHordeImplementation
// loops spawnHordeMob for the whole horde INSIDE the command call (the
// only asynchronous path is the cave-spawn search, which this pack's
// config keeps off), so every horde mob already exists when spawn_horde
// returns - the first tdTagHordeMobs call right after the command does
// the real work, and this window is a 5-second safety net for any mob
// that lands a tick late.
// Correction, 2026-09-28 (re-decompiled UndeadNights-2.3.0): the COMMAND
// doesn't spawn anything - SpawnHordeCommand only adds each player to
// serverState.entitiesWithPendingHorde, and HordeSpawner's own level tick
// spawns the horde on the next server tick. So the immediate sweep usually
// tags 0 and this window does the real work. wave_status.js's straggler
// outline treats the open window as "spawns still outstanding" for that
// reason (tdWaveSpawnsOutstanding).
var HORDE_TAG_WINDOW_TICKS = 100
var HORDE_TAG_RADIUS = 128
// The world-state marker (world_state.js's findWorldStateEntity: the
// td_pedestal_target-tagged armor stand playtest_starter_kit.js creates) -
// used as the silent command source for Undead Nights' commands, see the
// chat-noise note in useWaveHorn's endless branch.
var WAVE_STATE_MARKER_SELECTOR = '@e[type=minecraft:armor_stand,tag=td_pedestal_target,limit=1]'
var tdHordeTagUntil = 0
var tdHordeTagSnapshot = {}

function tdSnapshotUntaggedRosterMobs(level) {
  var snap = {}
  level.getEntities().forEach(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return
    if (e.getTags().contains('td_wave_mob')) return
    snap[`${e.uuid}`] = true
  })
  return snap
}

// Compound safety net for Undead Nights' own spawn_horde mobs - real
// playtest report (2026-09-11): "an enemy spawned in my house. this
// shouldn't happen." spawn_horde is that mod's own opaque command
// (distanceMin/distanceMax band around the player, defaultconfigs/
// undeadnights-server.toml - see useWaveHorn's own comment on this) and
// never goes through this file's randomObjectiveRelativePosition/
// isInsideCompound check at all, so if the player is standing inside
// the compound when a horde fires, the mod can and does place horde
// mobs anywhere within its own band regardless of walls - straight
// inside the player's own house included. This is the only hook this
// pack has into those otherwise-opaque spawns (right where they're
// already being walked once to tag them td_wave_mob), so it's also the
// only place a fix can land: any mob landing inside the padded compound
// footprint gets pushed out to just past its nearest wall instead,
// same rectangle the scripted campaign spawner avoids (playtest_starter_
// kit.js writes td_compoundX0/X1/Z0/Z1 once the base finishes building).
// No-ops entirely on an old save with no persisted compound footprint.
var TD_COMPOUND_RELOCATE_PADDING = 4

function tdRelocateIfInsideCompound(entity, level) {
  var data = worldData(level)
  if (!data || !data.contains('td_compoundX0')) return
  var x0 = data.getInt('td_compoundX0') - TD_COMPOUND_RELOCATE_PADDING
  var x1 = data.getInt('td_compoundX1') + TD_COMPOUND_RELOCATE_PADDING
  var z0 = data.getInt('td_compoundZ0') - TD_COMPOUND_RELOCATE_PADDING
  var z1 = data.getInt('td_compoundZ1') + TD_COMPOUND_RELOCATE_PADDING
  var ex = entity.getX()
  var ez = entity.getZ()
  if (ex < x0 || ex > x1 || ez < z0 || ez > z1) return // already outside

  // Push out along whichever wall is nearest - cheapest way clear of the
  // rectangle, no pathfinding/chunk access needed.
  var distWest = ex - x0
  var distEast = x1 - ex
  var distNorth = ez - z0
  var distSouth = z1 - ez
  var minDist = Math.min(distWest, distEast, distNorth, distSouth)
  var nx = ex
  var nz = ez
  if (minDist === distWest) nx = x0 - 1
  else if (minDist === distEast) nx = x1 + 1
  else if (minDist === distNorth) nz = z0 - 1
  else nz = z1 + 1

  entity.teleportTo(nx, entity.getY(), nz)
  console.log(`wave_spawner.js: relocated a horde ${entity.type} out of the compound, (${Math.floor(ex)},${Math.floor(ez)}) -> (${Math.floor(nx)},${Math.floor(nz)})`)
}

function tdTagHordeMobs(player, level) {
  var tagged = 0
  level.getEntities().forEach(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return
    var tags = e.getTags()
    if (tags.contains('td_wave_mob') || tags.contains('td_structure_guard')) return
    if (tdHordeTagSnapshot[`${e.uuid}`]) return
    var dx = e.getX() - player.getX()
    var dz = e.getZ() - player.getZ()
    if (dx * dx + dz * dz > HORDE_TAG_RADIUS * HORDE_TAG_RADIUS) return
    tags.add('td_wave_mob')
    tdRelocateIfInsideCompound(e, level)
    tagged++
  })
  return tagged
}

// td_wave_mob is required in every phase now (2026-09-10) - the old
// requireTag=false endless-phase fallback to type-only matching is gone,
// since tdTagHordeMobs above puts the tag on Undead Nights' mobs too.
// Takes a plain {x,y,z} origin, not a player - see waveObjective() below
// for why: "regardless of player position" (docs/FEATURES.md's own
// stated intent for the amulet) can't hold if this still measured
// distance from the player.
function nearbyWaveMobCount(origin, level, radius) {
  return level.getEntities().filter(function (e) {
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return false
    if (!e.getTags().contains('td_wave_mob')) return false
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

// Concurrent-alive spawn cap (2026-09-11, real playtest report: "serious
// lag around wave 20"). Root cause confirmed against a real instance log,
// not guessed: the endless-phase baseline layer below spawns on an
// exponential curve (steepened the same day for a separate, real,
// direct ask - "the waves need to ramp up in difficulty way more
// quickly" - so the fix here can't just be "make the curve gentler
// again," that would undo a different explicit request). By wave 20 that
// curve alone wants ~111 new mobs in one staggered burst, ~307 by wave
// 30, ~841 by wave 40 (simulated, not guessed) - each one costing several
// synchronous commands (summon/spreadplayers/tag) on top of ongoing
// AI/targeting every tick after that, which is exactly what produced the
// real "Can't keep up! ... 163 ticks behind" warnings in the log.
//
// Rather than shrinking the formula (fights the difficulty-ramp ask
// above), this caps how many td_wave_mob entities are allowed ALIVE AT
// ONCE, checked in the pendingSpawns-draining tick handler below - a
// spawn whose turn has come up but would push the alive count over the
// cap just stays queued instead of firing, and gets retried on a later
// tick once something has died to free a slot. The formula's full total
// still eventually reaches the world exactly as designed, just spread
// out over the fight instead of dumped in one tick-lag spike - the
// intended chaos/difficulty is preserved, only the PEAK simultaneous
// entity/command load is bounded. Global (not radius-limited, unlike
// nearbyWaveMobCount above) since server tick cost comes from every live
// wave mob regardless of how far it's wandered from the pedestal.
var MAX_CONCURRENT_WAVE_MOBS = 60

// See the pending-spawn tick handler's alive-count comment (2026-09-26).
var TD_CAP_RECHECK_TICKS = 10
var tdCapHoldUntilTick = 0

function countAliveWaveMobs(level) {
  return level.getEntities().filter(function (e) {
    return WAVE_MOB_TYPES.includes(`${e.type}`) && e.getTags().contains('td_wave_mob') && e.getHealth() > 0
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

// Spawn-band geometry, pulled out of useWaveHorn 2026-09-28 so it exists
// once. mob_aggro.js's stray return used its own 20-40 block ring; the user
// chose to keep this spawn behaviour and send strays back into the SAME
// band instead, so both files now call these (top-level FUNCTIONS are
// global across server_scripts in this build, and these close over this
// file's own vars). The numbers and maths are the ones useWaveHorn already
// used inline - see its band comment for the history behind 48-64, the
// border clamp and the margin.
var TD_SPAWN_BAND_MIN = 48
var TD_SPAWN_BAND_MAX = 64
var TD_SPAWN_BORDER_MARGIN = 6 // spreadplayers maxRange 4, plus 2
var TD_COMPOUND_SPAWN_PADDING = 4
var TD_COMPOUND_SPAWN_MAX_ATTEMPTS = 30

// Read fresh on every call - the border grows every clear
// (base_expansion.js), so a cached band would go stale.
function tdWaveSpawnBand(level) {
  var border = level.getWorldBorder()
  var halfWidth = border.getSize() / 2
  var max = Math.max(15, Math.min(TD_SPAWN_BAND_MAX, halfWidth - TD_SPAWN_BORDER_MARGIN))
  return {
    min: Math.min(TD_SPAWN_BAND_MIN, max - 10),
    max: max,
    minX: Math.ceil(border.getMinX() + TD_SPAWN_BORDER_MARGIN),
    maxX: Math.floor(border.getMaxX() - TD_SPAWN_BORDER_MARGIN),
    minZ: Math.ceil(border.getMinZ() + TD_SPAWN_BORDER_MARGIN),
    maxZ: Math.floor(border.getMaxZ() - TD_SPAWN_BORDER_MARGIN),
  }
}

// The compound's real persisted footprint (td_compoundX0/X1/Z0/Z1,
// playtest_starter_kit.js), padded so nothing spawns hugging the outer wall
// face. null on a save that never persisted it - callers then skip the
// check rather than block spawning.
function tdCompoundSpawnRect(data) {
  if (!data || !data.contains('td_compoundX0')) return null
  return {
    x0: data.getInt('td_compoundX0') - TD_COMPOUND_SPAWN_PADDING,
    x1: data.getInt('td_compoundX1') + TD_COMPOUND_SPAWN_PADDING,
    z0: data.getInt('td_compoundZ0') - TD_COMPOUND_SPAWN_PADDING,
    z1: data.getInt('td_compoundZ1') + TD_COMPOUND_SPAWN_PADDING,
  }
}

// A column in the band around (cx, cz), clamped into the live border box
// and outside the padded compound.
//
// Compound-aware rejection sampling (2026-09-09, paired with the border
// revert to 50 - see playtest_starter_kit.js's BORDER_START comment): with
// the border at 50 a uniform band can land inside the compound in some
// directions (its back wall sits ~17-20 blocks from the pedestal) while
// clearing it in others, so the angle/distance is re-rolled until the
// candidate lands outside - cheap (pure arithmetic, no chunk access) and
// self-correcting, whichever directions are clear get picked more often.
//
// Real playtest report (2026-09-11): "an enemy spawned in my house. this
// shouldn't happen." The loop used to fall back to its last (possibly
// inside-compound) attempt once it ran out of tries; a growing compound
// eats more of the band over a long campaign, so that stopped being rare.
// When resampling fails it now projects a point just outside the
// compound's own nearest edge instead, geometrically guaranteed clear.
//
// Math.PI is undefined in this KubeJS/Rhino build (2026-09-02, the root
// cause of the "nothing spawns" saga) - hence the literal.
function tdSpawnBandPoint(band, rect, cx, cz) {
  var PI = 3.141592653589793
  for (var attempt = 0; attempt < TD_COMPOUND_SPAWN_MAX_ATTEMPTS; attempt++) {
    var angle = Math.random() * 2 * PI
    var distance = band.min + Math.random() * (band.max - band.min)
    // Hard clamp into the live border box - a mob summoned even one block
    // past the border is pinned there for good, unable to path back in.
    var px = Math.min(Math.max(Math.floor(cx + Math.cos(angle) * distance), band.minX), band.maxX)
    var pz = Math.min(Math.max(Math.floor(cz + Math.sin(angle) * distance), band.minZ), band.maxZ)
    if (!rect || px < rect.x0 || px > rect.x1 || pz < rect.z0 || pz > rect.z1) return { x: px, z: pz }
  }
  var side = Math.floor(Math.random() * 4) // 0=N(-Z) 1=S(+Z) 2=W(-X) 3=E(+X)
  var fx, fz
  if (side === 0) {
    fx = rect.x0 + Math.random() * (rect.x1 - rect.x0)
    fz = rect.z0 - 1
  } else if (side === 1) {
    fx = rect.x0 + Math.random() * (rect.x1 - rect.x0)
    fz = rect.z1 + 1
  } else if (side === 2) {
    fx = rect.x0 - 1
    fz = rect.z0 + Math.random() * (rect.z1 - rect.z0)
  } else {
    fx = rect.x1 + 1
    fz = rect.z0 + Math.random() * (rect.z1 - rect.z0)
  }
  var safePoint = {
    x: Math.min(Math.max(Math.floor(fx), band.minX), band.maxX),
    z: Math.min(Math.max(Math.floor(fz), band.minZ), band.maxZ),
  }
  console.log(`wave_spawner.js: could not find a spawn point outside the compound after ${TD_COMPOUND_SPAWN_MAX_ATTEMPTS} random attempts - using a guaranteed-outside point (${safePoint.x},${safePoint.z}) instead`)
  return safePoint
}

// True while a wave still has mobs to come: queued staggered spawns
// (baseline, hand-authored, underground ambush) or an open Undead Nights
// horde-tagging window. wave_status.js's straggler outline reads this - a
// var can't be read across files here, a function can.
function tdWaveSpawnsOutstanding(level) {
  return pendingSpawns.length > 0 || level.getTime() <= tdHordeTagUntil
}

// Ambush placement, reworked 2026-09-29 (direct ask: "Ive noticed some
// zombies spawing under my base, trapped in caves or something ... can we
// make sure that no zombies spawn in the base or get stuck in a hole"; user
// chose "surface outside walls"). The 2026-09-10 design summoned these
// buried under the compound to dig up to the pedestal, and the 2026-09-28
// pocket fix gave them a carved 1x2 cell to start from. In real play on
// 2026-09-28 they still got stuck: the user ran /tdforceclear on 10 of 16
// waves to kill the last 1-2 of them. Now an ambusher never starts
// underground or inside the compound at all. It bursts out of the ground
// TD_AMBUSH_WALL_GAP_MIN-MAX blocks outside a random compound wall (a spray
// of the ground's own block particles and a digging sound, after the
// existing cave-groan lead-in), then walks in like any wave mob.
//
// The gap is measured from the persisted compound footprint (the walls
// themselves). Its minimum is 4 because the spawn tick snaps the mob to the
// surface with spreadplayers maxRange 1, and a column that lands on a wall
// would put it on top of the wall. A point the border clamp pushes back
// against the compound is re-rolled on another side. After
// TD_AMBUSH_MAX_ATTEMPTS the normal spawn band is used, which is always
// outside the padded compound (tdSpawnBandPoint).
var TD_AMBUSH_WALL_GAP_MIN = 4
var TD_AMBUSH_WALL_GAP_MAX = 7
var TD_AMBUSH_MAX_ATTEMPTS = 16

// {x, y, z} on the surface outside the walls. y is the yard floor's walking
// level (td_pedestalY via the objective); the spawn tick snaps it anyway.
function tdPickAmbushPos(level, data, objective) {
  var y = Math.floor(objective.y)
  var band = tdWaveSpawnBand(level)
  var rect = tdCompoundSpawnRect(data)
  if (data.contains('td_compoundX0')) {
    var x0 = data.getInt('td_compoundX0')
    var x1 = data.getInt('td_compoundX1')
    var z0 = data.getInt('td_compoundZ0')
    var z1 = data.getInt('td_compoundZ1')
    for (var attempt = 0; attempt < TD_AMBUSH_MAX_ATTEMPTS; attempt++) {
      var gap = TD_AMBUSH_WALL_GAP_MIN + Math.floor(Math.random() * (TD_AMBUSH_WALL_GAP_MAX - TD_AMBUSH_WALL_GAP_MIN + 1))
      var side = Math.floor(Math.random() * 4) // 0=N(-Z) 1=S(+Z) 2=W(-X) 3=E(+X)
      var px, pz
      if (side === 0 || side === 1) {
        px = x0 + Math.floor(Math.random() * (x1 - x0 + 1))
        pz = side === 0 ? z0 - gap : z1 + gap
      } else {
        pz = z0 + Math.floor(Math.random() * (z1 - z0 + 1))
        px = side === 2 ? x0 - gap : x1 + gap
      }
      px = Math.min(Math.max(px, band.minX), band.maxX)
      pz = Math.min(Math.max(pz, band.minZ), band.maxZ)
      // Clamped back against the walls - try another side.
      if (px > x0 - TD_AMBUSH_WALL_GAP_MIN && px < x1 + TD_AMBUSH_WALL_GAP_MIN &&
          pz > z0 - TD_AMBUSH_WALL_GAP_MIN && pz < z1 + TD_AMBUSH_WALL_GAP_MIN) continue
      return { x: px, y: y, z: pz }
    }
  }
  var fallback = tdSpawnBandPoint(band, rect, objective.x, objective.z)
  return { x: fallback.x, y: y, z: fallback.z }
}

function useWaveHorn(player) {
  var level = player.getLevel()
  var server = player.getServer()
  // Real multiplayer fix, 2026-09-08 (see world_state.js): wave number,
  // horn cooldown, countdown state and the pedestal-destroyed flag are
  // all real shared campaign state - used to live on player.persistentData,
  // which let two different players hold two independent copies (each
  // able to blow the horn on their own cooldown, desyncing the whole
  // campaign). Silently no-ops if the base hasn't finished building yet
  // this world (the only time this can be null) - same defensive shape
  // every other handler in this pack already uses.
  var data = worldData(level)
  if (!data) return

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

  // Same permanent stop, hardcore-death side (hardcore_death.js,
  // 2026-09-09) - a separate flag from td_pedestalDestroyed since the
  // pedestal itself is still standing here, only the run is over.
  if (data.getBoolean('td_hardcoreGameOver')) {
    player.tell('§8§oThe horn has nothing left to call to.')
    return
  }

  var currentTick = level.getTime()

  // Real minimum floor on the PASSIVE countdown only, 2026-09-12 (direct
  // ask: "the time between the waves should be a minimum 10 mins") - see
  // wave_status.js's own countdownTicksForWave()/MIN_WAVE_GAP_TICKS
  // comment. That version also gated this manual path on the same
  // td_countdownEndTick floor, so spam-clicking the horn couldn't skip
  // past the 10-minute minimum either. **Reverted 2026-09-15, direct ask:
  // "the player shouldn't have to wait 10 mins between waves if they
  // don't want to, they can call the wave early, just like with the horn
  // item"** - the floor still governs how long the passive countdown/
  // auto-trigger waits (wave_status.js), it just no longer blocks a
  // manual call. Restores this function's original "manual override
  // always works" behavior from before that floor existed.

  // Cooldown dedup (20 ticks / 1 second), not just same-tick — both
  // ItemEvents.rightClicked and BlockEvents.rightClicked fire for one
  // physical click, and holding right-click generates repeated events
  // across many ticks, so a same-tick-only check wasn't enough.
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
  // Radius 80 -> 96 (2026-09-09), kept equal to wave_status.js's RADIUS:
  // with the 48-64 spawn band plus the 4-block spreadplayers snap, a
  // freshly spawned mob can legitimately be 68 blocks out.
  if (nearbyWaveMobCount(objective, level, 96) > 0 || pendingSpawns.length > 0) {

    player.tell('§c[Wave Horn] §fClear the current wave before summoning the next one.')
    return
  }

  // A manual horn use always takes priority over an in-progress countdown
  // (docs/IDEAS.md: "the manual Wave Horn presumably still works during
  // the countdown... the timer is a forcing function for players who
  // don't act, not a removal of the existing manual trigger") - cancels
  // it here so the countdown tick handler below doesn't also fire
  // useWaveHorn a second time once it independently reaches zero. Holds
  // for the whole countdown window again as of 2026-09-15 - see the
  // MIN_WAVE_GAP_TICKS comment above.
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
  // Real bug found + fixed 2026-09-08 (live report: mobs stuck stationary
  // at the world border, not pathing toward anything). Confirmed by the
  // numbers, not guessed: the border starts at size 50
  // (playtest_starter_kit.js's `worldborder set 50`, half-width 25) and
  // base_expansion.js's own escalating curve only reaches half-width 55
  // by wave 8 (border size 110) - every hand-authored wave's fixed 40-60
  // block spawn radius has been landing mobs OUTSIDE the border still
  // active at that point in the campaign for the entire designed
  // campaign, not just early waves. Vanilla's world border physically
  // clips ALL entities, not just players, regardless of the border-damage
  // config (that only controls damage-over-time once outside, not the
  // collision itself) - a mob summoned past the edge gets held right
  // there, unable to path back in, exactly the reported symptom.
  //
  // Clamped to the border's own live half-width (radius from center,
  // conservative even for a square border - see the safety-margin note)
  // instead of a fixed band, recomputed fresh every horn use so it scales
  // automatically as the border grows rather than needing its own manual
  // retune every time base_expansion.js's curve changes. A point at
  // radius <= half-width from a square border's center is guaranteed
  // inside the square on every axis (worst case is the axis-aligned
  // angle, where the full radius equals the axis offset) - a small extra
  // margin keeps mobs off the exact edge, not just barely inside it.
  //
  // Fixed 48-64 block band from the pedestal (2026-09-09, direct playtest
  // feedback: "mobs are spawning in the base. mob spawns must be a little
  // ways away... so that I can expand the base and not have mobs spawn
  // behind my lines" - 48-64 picked by the user from three offered
  // bands). The 2026-09-08 clamp right below was the real cause: at
  // border 50 (half-width 25) it collapsed the band to 10-20 blocks,
  // which is inside the ~18-wide compound or pressed against its
  // perimeter wall - mobs appeared behind the player's lines and, when
  // outside a reinforced wall with no path to the marker, just stood
  // there (the same playtest's "zombies just standing around"). Border
  // briefly went to 150 the same day so the whole band fit inside it
  // with margin, then back to 50 on 2026-09-09 (direct feedback - see
  // playtest_starter_kit.js's BORDER_START comment) - what actually
  // guarantees "not inside the compound" now is the rejection-sampling
  // check in randomObjectiveRelativePosition() below, not border size, so
  // the border could shrink back without reopening the regression. The
  // border-box clamp stays too (a mob summoned even one block past the
  // border gets stuck there for good, unable to path back in) - every
  // spawn point still has to satisfy both checks.
  //
  // Band limits, compound rectangle and point picker live in
  // tdWaveSpawnBand/tdCompoundSpawnRect/tdSpawnBandPoint above since
  // 2026-09-28 (shared with mob_aggro.js's stray return) - same numbers,
  // same clamp, same rejection sampling and guaranteed-outside fallback as
  // the inline versions that used to sit here. Read once per horn use.
  var spawnBand = tdWaveSpawnBand(level)
  var compoundSpawnRect = tdCompoundSpawnRect(data)

  function randomObjectiveRelativePosition() {
    return tdSpawnBandPoint(spawnBand, compoundSpawnRect, objective.x, objective.z)
  }

  // Underground ambush spawns (2026-09-10, direct ask: "can you make the
  // enemies be able to dig through to the base from underground"). Every
  // spawn above lands outside the compound on purpose
  // (randomObjectiveRelativePosition's whole job) - reaching the base has
  // only ever meant walking in from outside. This is the opposite: a mob
  // summoned already buried under the compound's own footprint, sealed in
  // solid ground with no walkable path to its forced target (the
  // pedestal, via mob_aggro.js). That satisfies the real, decompiled
  // precondition on ESM_EntityAIDigging.canUse() documented elsewhere in
  // this file's history (digger.getNavigation().isDone() - the mob's own
  // pathfinding has to have already given up) so its digger AI (already
  // enabled pack-wide in epicsiegemod-common.toml) takes over instead of
  // the mob just standing there. Which direction it actually digs is the
  // AI's own pathing choice, not scripted here - unverified beyond that
  // documented precondition, same real limitation noted there (no player
  // connected in a headless sandbox means mob_aggro.js's targeting loop
  // never runs). Needs a real playtest to confirm it reads as "coming up
  // from underground," not just that the mob stops idling.
  // SUPERSEDED 2026-09-29: ambushers no longer start buried - they burst
  // out of the ground outside the compound walls (tdPickAmbushPos above,
  // user's choice after they kept getting stuck). The paragraph above is
  // the original design, kept as history. tdPickAmbushPos never returns
  // null; the `if (!uPos)` guards below are just defensive.
  function undergroundAmbushPos() {
    return tdPickAmbushPos(level, data, objective)
  }

  // Wave 3+ only - the compound/walls exist from wave 1
  // (playtest_starter_kit.js builds them at world start), and this is
  // meant to punish relying on them once the player's had a couple of
  // waves to settle in, not ambush them before they understand the base
  // at all.
  //
  // Counts raised 2026-09-10 (direct ask, calling these "mining zombies" -
  // this IS that mechanic, there's no mob of that name in any installed
  // mod; confirmed nothing named "mining" exists in Mutants and Zombies/
  // Zombies More/Undead Nights before assuming - "more mining zombies to
  // make the game harder" means more of these). Was 0/1/2 for waves <3/
  // <7/8, capped at 4 in endless; now ramps higher and starts one wave
  // earlier, same "punish relying on the walls" logic as before, just
  // pushed further since the whole batch this lands in is about raising
  // difficulty generally.
  function undergroundAmbushCountForWave(n) {
    if (n > WAVES.length) return Math.min(2 + Math.floor((Math.min(n - WAVES.length, 40)) / 5), 6)
    return n < 2 ? 0 : (n < 5 ? 1 : (n < 7 ? 2 : 3))
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
    // **Chat noise fix, 2026-09-10** (direct ask: "a lot of noise/alerts in
    // chat when a new wave is started. can it just state that wave x has
    // started"). Both Undead Nights commands talk to the player directly -
    // decompiled DifficultyLevelCommand/SpawnHordeCommand: every line
    // ("Difficulty level set to: Endless N", "Trying to spawn hordes for
    // all available players.") goes through `source.getEntity()
    // .sendSystemMessage(...)`, NOT the command source's feedback channel,
    // so runCommandSilent's suppressed-output flag never touched them. A
    // vanilla Entity#sendSystemMessage is a no-op for anything that isn't
    // a ServerPlayer, so the commands now run AS the world-state marker
    // armor stand (the same entity worldData() lives on): getEntity() is
    // non-null (no NPE - the real reason `execute as` was needed at all),
    // the message goes nowhere, and spawn_horde without targets still
    // hordes every player in the source's level (`getLevel().players()`,
    // filtered to Player instances - confirmed in the bytecode). The third
    // line, "A horde has spawned!", is the mod's own hordeSpawnedMessageAndSound
    // flag (now false in defaultconfigs/undeadnights-server.toml); the horde
    // scream it also gated is replayed below so the sound survives.
    if (data.getInt('td_lastEndlessLevel') !== endlessLevel) {
      data.putInt('td_lastEndlessLevel', endlessLevel)
      server.runCommandSilent(`execute as ${WAVE_STATE_MARKER_SELECTOR} run undeadnights difficulty set ${endlessLevel}`)
    }
    // Snapshot BEFORE the command so nothing the horde itself creates is
    // in it, then open the tagging window (tdTagHordeMobs, run from the
    // PlayerEvents.tick handler below).
    tdHordeTagSnapshot = tdSnapshotUntaggedRosterMobs(level)
    tdHordeTagUntil = currentTick + HORDE_TAG_WINDOW_TICKS
    server.runCommandSilent(`execute as ${WAVE_STATE_MARKER_SELECTOR} run undeadnights spawn_horde`)
    server.runCommandSilent('execute as @a at @s run playsound undeadnights:horde_scream hostile @s ~ ~ ~ 1 1')
    // The horde spawns synchronously inside that command (see
    // HORDE_TAG_WINDOW_TICKS's comment), so tag it right here - the tick
    // window below only mops up stragglers.
    var hordeTagged = tdTagHordeMobs(player, level)
    console.log(`wave_spawner.js: endless wave ${waveNumber} - tagged ${hordeTagged} Undead Nights horde mob(s) as td_wave_mob immediately after spawn_horde`)

    // Deterministic baseline layer, additive on top of spawn_horde above
    // (see ENDLESS_OTHER_TIERS/pickEndlessOtherType's own comment for the
    // full design writeup). n = waveNumber (the real overall wave number,
    // confirmed against docs/QUEUE.md's own worked table - NOT
    // endlessLevel, which is anchored to the 1-40 difficulty scale
    // instead and used only for the other-type weighting above).
    //   z = round(12 + n*1.09^endlessLevel)  -- vanilla zombie count
    //   m = round(7 + n*1.05^endlessLevel)   -- "other types," tier-weighted
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
    //
    // Steepened 2026-09-10 (direct ask: "the waves need to ramp up in
    // difficulty way more quickly"). The exponent term now runs on
    // endlessLevel (already capped at 40 above), not the raw uncapped
    // waveNumber the original formula used - simulated both before
    // picking these numbers (node, not guessed): the old uncapped formula
    // was actually MILDER than this one through the wave range anyone
    // realistically reaches (e.g. wave 30 total baseline 200 -> 307, wave
    // 40: 403 -> 841) while also quietly heading toward a real problem of
    // its own at extreme wave counts (wave 100: 19519, a genuine perf
    // cliff, uncapped exponent compounding against uncapped waveNumber
    // forever) - capping the exponent's own input fixes that latent issue
    // for free while still ramping harder everywhere that actually gets
    // played. `n` (the linear factor) is still the real uncapped
    // waveNumber, so this never plateaus outright, just stops
    // double-compounding past level 40.
    var baselineZombieCount = Math.round(12 + waveNumber * Math.pow(1.09, endlessLevel))
    var baselineOtherCount = Math.round(7 + waveNumber * Math.pow(1.05, endlessLevel))
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

    var undergroundAmbushCount = undergroundAmbushCountForWave(waveNumber)
    for (var ui = 0; ui < undergroundAmbushCount; ui++) {
      var uPos = undergroundAmbushPos()
      if (!uPos) continue // defensive - tdPickAmbushPos always returns a point
      var uSpawnTick = currentTick + baselineIndex * baselineStaggerGap
      pendingSpawns.push({
        mobType: 'minecraft:zombie',
        x: uPos.x,
        y: uPos.y,
        z: uPos.z,
        spawnTick: uSpawnTick,
        soundTick: uSpawnTick - SOUND_LEAD_TICKS,
        soundPlayed: false,
        underground: true,
      })
      baselineIndex++
    }

    // Toast, not chat (2026-09-09, real playtest ask: "less noise from the
    // chat window") - the title/subtitle pair below already pops up the
    // wave-start moment itself, this just adds the difficulty/baseline
    // numbers the subtitle's generic text doesn't carry.
    player.notify(`§6${tdWaveLabel(waveNumber)} - difficulty ${endlessLevel}, +${baselineZombieCount + baselineOtherCount} baseline`)
    server.runCommandSilent(`title @a title {"text":"${tdWaveLabel(waveNumber).toUpperCase()}","color":"gold","bold":true}`)
    server.runCommandSilent(`title @a subtitle {"text":"The horde approaches...","color":"white"}`)
    // The one chat line per wave start (2026-09-10) - see the noise note above.
    server.runCommandSilent(`tellraw @a {"text":"${tdWaveLabel(waveNumber)} has started.","color":"gold"}`)
    // Real placeholder sound, 2026-09-05 - direct ask: something audible
    // at the exact wave-start moment, vanilla bell for now, explicitly
    // swappable for something scarier later. Wired here too, not just
    // the hand-authored path below - every wave start, not just 1-8.
    // At each player (2026-09-27 audit): a bare `playsound ... @a ~ ~ ~` from the server plays at world spawn and is inaudible past ~16 blocks.
    server.runCommandSilent(`execute as @a at @s run playsound minecraft:block.bell.use master @s ~ ~ ~ 1 1 1`)
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

  var undergroundAmbushCount = undergroundAmbushCountForWave(waveNumber)
  for (var ui = 0; ui < undergroundAmbushCount; ui++) {
    var uPos = undergroundAmbushPos()
    if (!uPos) continue // defensive - tdPickAmbushPos always returns a point
    var uSpawnTick = currentTick + mobIndex * staggerGap
    pendingSpawns.push({
      mobType: 'minecraft:zombie',
      x: uPos.x,
      y: uPos.y,
      z: uPos.z,
      spawnTick: uSpawnTick,
      soundTick: uSpawnTick - SOUND_LEAD_TICKS,
      soundPlayed: false,
      underground: true,
    })
    mobIndex++
    totalMobs++
  }

  var displayWave = Math.min(waveNumber, WAVES.length)
  // Chat line removed 2026-09-09 (real playtest ask: "less noise from the
  // chat window") - the mob count is already in the subtitle below, this
  // was pure duplication.
  // Big on-screen title (like an achievement popup), not just chat —
  // chat is easy to miss mid-fight. Uses vanilla /title via
  // runCommandSilent, consistent with every other command in this pack
  // rather than an unverified KubeJS-specific title API.
  server.runCommandSilent(`title @a title {"text":"WAVE ${displayWave}","color":"gold","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"${totalMobs} mobs incoming!","color":"white"}`)
  // The one chat line per wave start (2026-09-10, direct ask: "can it just
  // state that wave x has started") - the 2026-09-09 removal took every
  // chat line out; this puts exactly one back.
  server.runCommandSilent(`tellraw @a {"text":"Wave ${displayWave} has started.","color":"gold"}`)
  // Real placeholder sound, 2026-09-05 - direct ask: play something when
  // a wave starts, vanilla bell for now, explicitly a placeholder the
  // user may swap for something scarier later.
  // At each player (2026-09-27 audit): a bare `playsound ... @a ~ ~ ~` from the server plays at world spawn and is inaudible past ~16 blocks.
  server.runCommandSilent(`execute as @a at @s run playsound minecraft:block.bell.use master @s ~ ~ ~ 1 1 1`)
}

// Wave Horn note block (2026-09-12, direct ask: "wave horn a note block
// upstairs that spawns the wave") - a physical fixture in the base
// itself. Placed once at world-build time (playtest_starter_kit.js,
// td_waveNoteBlockX/Y/Z) in the upstairs power-rig room.
//
// **The kubejs:wave_horn item was removed entirely, 2026-09-13** (direct
// ask: "now that the wave horn is a block, no need for the item") - this
// note block is now the ONLY way to sound the horn, not a second one
// alongside it. Its own ItemEvents.rightClicked('kubejs:wave_horn', ...)
// and the item-filtered BlockEvents.rightClicked handler that used to sit
// here are both gone along with startup_scripts/wave_horn.js's item
// registration, the starter-kit give() in playtest_starter_kit.js, and
// the quest book's own "Lost the Horn?" spare-item quest (campaign.snbt/
// gen_quests.py) - "Sound the Horn" stays, retargeted at this block
// instead. td_lastHornUseTick (set inside useWaveHorn() regardless of
// caller) already drove that quest's completion check
// (quest_milestones.js), so nothing needed to change there.
//
// Filtered by real block TYPE via
// BlockEvents.rightClicked('minecraft:note_block', ...) (confirmed real
// per-block-type filtering, same call shape amulet_pedestal.js/
// pedestal_health.js already use for their own single fixed block), then
// matched against the exact stored position - every OTHER note block a
// player places anywhere else in the world stays a plain, harmless note
// block, only this one specific one calls useWaveHorn(). Deliberately
// does NOT event.cancel() the vanilla note-changing behavior - letting
// the block also cycle its own pitch on each click is a harmless, on-
// theme side effect ("sounding the alarm"), and pedestal_health.js's own
// header already documents a real case where event.cancel() didn't
// reliably suppress a mod's native block interaction - not worth risking
// here for a purely cosmetic vanilla behavior.
BlockEvents.rightClicked('minecraft:note_block', function (event) {
  var player = event.entity
  var level = player.getLevel()
  var data = worldData(level)
  if (!data || !data.contains('td_waveNoteBlockX')) return
  // Same event.getBlock().getPos() accessor pedestal_health.js's own
  // BlockEvents.rightClicked('supplementaries:pedestal', ...) handler
  // uses for the identical "is this THE specific placed block" check.
  var pos = event.getBlock().getPos()
  if (pos.getX() !== data.getInt('td_waveNoteBlockX') ||
    pos.getY() !== data.getInt('td_waveNoteBlockY') ||
    pos.getZ() !== data.getInt('td_waveNoteBlockZ')) return
  useWaveHorn(player)
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
  var player = event.entity
  var level = player.getLevel()
  var currentTick = level.getTime()

  // Endless-phase horde tagging window (see tdTagHordeMobs above) -
  // every 10 ticks while open, same throttle mob_aggro.js uses.
  if (currentTick <= tdHordeTagUntil && currentTick % 10 === 0) {
    var newlyTagged = tdTagHordeMobs(player, level)
    if (newlyTagged > 0) console.log(`wave_spawner.js: tagged ${newlyTagged} Undead Nights horde mob(s) as td_wave_mob`)
  }

  if (pendingSpawns.length === 0) return

  var server = player.getServer()
  var stillPending = []
  // Concurrent-alive cap (see MAX_CONCURRENT_WAVE_MOBS's own comment
  // above nearbyWaveMobCount) - one real scan per tick, only while
  // pendingSpawns is non-empty (the guard above), so this cost only
  // exists during an active spawn-in window, not all the time. Tracked
  // locally and incremented per actual summon below rather than
  // rescanning every entry, so a whole tick's worth of ready spawns is
  // gated off one real world query instead of one per mob.
  //
  // Performance pass 2026-09-26: that "one scan per tick" still ran on
  // every tick of a wave - spawns are staggered 4-16 ticks apart, and once
  // the cap is hit every queued spawn stays due, so it was 20 full-level
  // scans/second for most of a wave. Now it only counts when some spawn is
  // actually due this tick, and a count that came back at the cap is
  // trusted for TD_CAP_RECHECK_TICKS before rescanning (a freed slot is
  // refilled up to half a second later - the spawn stagger is already
  // coarser than that).
  var anySpawnDue = false
  for (var d = 0; d < pendingSpawns.length; d++) {
    if (currentTick >= pendingSpawns[d].spawnTick) { anySpawnDue = true; break }
  }
  var aliveWaveMobCount = 0
  if (anySpawnDue) {
    var capHeld = tdCapHoldUntilTick > currentTick && tdCapHoldUntilTick - currentTick <= TD_CAP_RECHECK_TICKS
    if (capHeld) {
      aliveWaveMobCount = MAX_CONCURRENT_WAVE_MOBS
    } else {
      aliveWaveMobCount = countAliveWaveMobs(level)
      tdCapHoldUntilTick = aliveWaveMobCount >= MAX_CONCURRENT_WAVE_MOBS ? currentTick + TD_CAP_RECHECK_TICKS : 0
    }
  }

  pendingSpawns.forEach(function (spawn) {
    if (!spawn.soundPlayed && currentTick >= spawn.soundTick) {
      server.runCommandSilent(
        `playsound minecraft:ambient.cave ambient @a ${spawn.x} ${spawn.y} ${spawn.z} 1 0.6`
      )
      spawn.soundPlayed = true
    }
    // At the cap - this spawn's turn has come up, but summoning it would
    // push the live wave-mob count over the ceiling, so it stays queued
    // and gets retried next tick (spawnTick already <= currentTick, so
    // no further stagger delay once a slot frees up). Checked AFTER the
    // sound cue above on purpose - a capped spawn should still announce
    // itself on schedule, not go silent just because it's waiting.
    if (currentTick >= spawn.spawnTick && aliveWaveMobCount >= MAX_CONCURRENT_WAVE_MOBS) {
      stillPending.push(spawn)
      return
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
      // td_undergroundAmbush (2026-09-10) marks the ambush spawns queued by
      // undergroundAmbushPos() above - tagged separately from plain
      // td_wave_mob purely so a stuck/idle report is easy to grep for
      // later, no other consumer reads it. (They surface outside the walls
      // since 2026-09-29, see tdPickAmbushPos; the tag name is historical.)
      var summonTags = spawn.underground ? '["td_justSpawned","td_wave_mob","td_undergroundAmbush"]' : '["td_justSpawned","td_wave_mob"]'
      // See BRUTE_SPEED_FIX_TYPES/BRUTE_MOVEMENT_SPEED's own comment above
      // for why this is here - real decompiled brute speed is slower than
      // a vanilla zombie, which is the actual reason they read as tanky
      // filler instead of a threat.
      var speedFix = BRUTE_SPEED_FIX_TYPES.indexOf(spawn.mobType) !== -1
        ? `,{Name:"generic.movement_speed",Base:${BRUTE_MOVEMENT_SPEED}}`
        : ''
      // See MUTANT_BRUTE_MAX_HEALTH's own comment above for why both the
      // attribute AND the top-level Health field are needed.
      var isMutantBrute = spawn.mobType === 'mutantszombies:mutant_brute'
      var healthFix = isMutantBrute ? `,{Name:"generic.max_health",Base:${MUTANT_BRUTE_MAX_HEALTH}}` : ''
      var healthField = isMutantBrute ? `,Health:${MUTANT_BRUTE_MAX_HEALTH}.0f` : ''
      var summonNbt = `{Attributes:[{Name:"generic.follow_range",Base:128}${speedFix}${healthFix}],PersistenceRequired:1b,Tags:${summonTags}${healthField}}`
      // td_justSpawned added and removed within this same synchronous
      // block, so the very next spawn processed (even same tick, even
      // same mob type) can never see a stale tag from this one.
      // td_wave_mob is never removed - it identifies the mob as
      // wave-spawned for the rest of its life.
      server.runCommandSilent(
        `summon ${spawn.mobType} ${spawn.x} ${spawn.y} ${spawn.z} ${summonNbt}`
      )
      // Ambushers (2026-09-29 rework, see tdPickAmbushPos) snap with
      // maxRange 1 instead of 4, so the snap can't carry them onto a wall,
      // then burst out of the ground: the surface block's own particles and
      // a digging sound, right where the cave groan played.
      server.runCommandSilent(
        `spreadplayers ${spawn.x} ${spawn.z} 0 ${spawn.underground ? 1 : 4} false @e[type=${spawn.mobType},tag=td_justSpawned,limit=1,sort=nearest]`
      )
      if (spawn.underground) {
        var groundId = `${level.getBlock(spawn.x, spawn.y - 1, spawn.z).getId()}`
        if (groundId === 'minecraft:air' || groundId === 'minecraft:cave_air') groundId = 'minecraft:dirt'
        server.runCommandSilent(
          `execute at @e[type=${spawn.mobType},tag=td_justSpawned,limit=1,sort=nearest] run particle minecraft:block ${groundId} ~ ~0.3 ~ 0.45 0.35 0.45 0.15 70`
        )
        server.runCommandSilent(
          `execute at @e[type=${spawn.mobType},tag=td_justSpawned,limit=1,sort=nearest] run playsound minecraft:block.rooted_dirt.break hostile @a ~ ~ ~ 1.2 0.6`
        )
      }
      server.runCommandSilent(
        `tag @e[type=${spawn.mobType},tag=td_justSpawned,limit=1,sort=nearest] remove td_justSpawned`
      )
      aliveWaveMobCount++
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
  // empty." **Real multiplayer fix, 2026-09-08**: written to the shared
  // marker's persistentData (world_state.js), not player.persistentData -
  // this is real shared campaign state (wave_airdrop.js's own check reads
  // it the same shared way now), not something tied to whichever player's
  // tick handler happened to drain the last queued spawn.
  if (stillPending.length === 0) {
    var wd = worldData(level)
    if (wd) wd.putInt('td_waveSpawnCompleteTick', currentTick)
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
  var level = player.getLevel()
  // Real multiplayer fix, 2026-09-08 (see world_state.js) - shared, not
  // per-player. Self-guards correctly against a duplicate trigger with
  // multiple players online: whichever player's tick handler runs first
  // this tick flips td_countdownActive to false before the next player's
  // handler reads it, so useWaveHorn() below only ever fires once per
  // real countdown expiry - Minecraft's server tick is single-threaded,
  // no real race window between them.
  var data = worldData(level)
  if (!data || !data.getBoolean('td_countdownActive')) return

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
  // Same action-bar sharing rule as wave_status.js's hostile counter
  // (2026-09-10): a pedestal under-attack alert between waves - a straggler
  // or a wandering structure mob at the pedestal - shows here instead of
  // the countdown for its window, rather than being overwritten by it.
  var pedestalAlert = pedestalAlertActionbarText(data, currentTick)
  // airdropInboundActionbarText (wave_airdrop.js) - this is the real target
  // window for that reminder: the every-5th-wave airdrop launches partway
  // through this exact countdown gap, see that function's own header for
  // why it shares this line the same way pedestalAlert already does rather
  // than writing to the action bar directly from its own tick handler.
  var airdropAlert = airdropInboundActionbarText(data, currentTick)
  var nextLabel = data.getInt('td_waveNumber') + 1 > WAVES.length ? 'horde' : 'wave'
  player.setStatusMessage(pedestalAlert || airdropAlert || `§b⏱ Next ${nextLabel} in: ${minutes}:${secondsDisplay}`)
})
