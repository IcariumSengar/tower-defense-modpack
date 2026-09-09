// Which mob kills drop which BountyBags tier. Replaces the custom
// scavengers_bag/fortified_cache/warlords_hoard system (2026-09-02,
// direct feedback: "I also dont like the custom loot bags" - part of
// the same Treasure2 replacement pass, see docs/FEATURES.md's
// "Structure & loot mod replacement"). BountyBags' own native mob-drop
// system is disabled entirely (config/bountybags-common.toml,
// enableDrops = false) so this script is the only thing making mobs
// drop bags - same reasoning as disabling Undead Nights' own
// autonomous horde system rather than letting two systems fight over
// the same mobs.
//
// Tier design: BountyBags ships 4 regular tiers (Uncommon/Rare/Epic/
// Legendary, no Common) plus 3 boss-exclusive bags this pack doesn't
// use.
//
// Reclassified 2026-09-03 by real toughness (mob-of-first-appearance
// isn't the same thing once a wave mixes a new elite in with repeated
// trash-floor mobs) - see git history for that pass's full reasoning,
// superseded below.
//
// **Reclassified again 2026-09-06** for the full zombie-apocalypse
// roster pivot (see wave_spawner.js's WAVE_MOB_TYPES for the complete
// writeup) - same toughness-tiering principle, applied to the new
// roster:
//   - Uncommon = the trash floor (zombie/husk/drowned/zombie_villager,
//     the roster's actual filler) plus zombified_piglin (real vanilla
//     headroom, never in any wave, same "cheap to cover" reasoning as
//     before) and Undead Nights' own Horde Zombie (a numbers-focused
//     reinforcement, not an elite).
//   - Rare = TFTH's early-Germ-stage variety adds - not trash-floor
//     filler, not elites either.
//   - Epic = the wave 6-8 elites (TFTH's Awareness-stage mobs, Undead
//     Nights' Elite Zombie) plus 3 of Mutants and Zombies' own mid-tier
//     mobs (ranged/speed variants, not its 2 confirmed tank mobs).
//   - Legendary = the toughest confirmed mobs in the new roster -
//     TFTH's own hardest hitters, Undead Nights' Demolition Zombie (the
//     one that can breach the base itself), and Mutants and Zombies'
//     2 tank mobs (Zombie Brute, Mutant Brute).
// Same drop rates as before - only which mob maps to which tier changed.
//
// Each mob group only ever rolls its own tier's bag (no cross-tier
// entries) - a trash-floor zombie can never drop a Legendary bag - same
// standing rule as before: rarity gates both drop rate and which
// enemies can roll which tier.
//
// **Shrapnel added to all 4 bag tiers, 2026-09-08** (docs/QUEUE.md
// Roadmap Phase 2 "Shrapnel/scrap" fork) - the real, only place this
// item is obtainable, per direct instruction ("not a new standalone
// currency or separate LootJS drop mechanism"). Decided as a genuine
// crafting material, not flavor loot - see startup_scripts/shrapnel.js
// for the full reasoning (it's the real gate on Advanced Tower
// Defense's tech-tree unlock item and its two new Blueprint recipes,
// see tier2_recipes.js). Lives in the 4 real tier tables this file's
// entity modifiers point at -
// `data/bountybags/loot_tables/items/{uncommon,rare,epic,legendary}.json`
// - not in this file directly (BountyBags' own loot-table JSON is
// where bag CONTENTS are defined; this file only controls which mob
// kills drop a bag at all). Counts scale up per tier (2-4 Uncommon,
// 4-8 Rare, 6-10 Epic, 10-16 Legendary) matching this file's existing
// "richer tiers give richer rolls" shape.
//
// **STOP - re-confirmed 2026-09-09, this bites every time and it bit
// again here**: BountyBags decompiles to a real one-way cache
// (`LootDefinitionStore.loadAll()` in the installed jar) - it reads
// this JSON exactly ONCE, the first time `config/bountybags/<tier>_bag.toml`
// doesn't exist yet, to seed that file. Every boot after that,
// `readBag()` loads straight from the TOML and the JSON is never
// consulted again, no matter how many times the JSON changes or the
// server restarts. A prior session already learned this once (see
// docs/FEATURES.md's "Real bonus lesson" note near the cobblestone/
// iron_ingot retune) and manually patched the live `legendary_bag.toml`
// for the totem_of_undying drop - but every OTHER live edit since
// (gold_nugget, netherrack, arrow, carrot, and now this shrapnel change)
// never got the same treatment: checked the real live instance's
// `config/bountybags/*.toml` directly on 2026-09-09 and every one of
// those items is still absent from the live `uncommon_bag.toml`
// (file untouched since 2026-09-03). **Editing this JSON alone does
// NOT ship the change** - the live instance's stale
// `config/bountybags/{uncommon,rare,epic,legendary}_bag.toml` must
// also be deleted (so BountyBags regenerates them from this JSON on
// next boot) or fixed via an op running `/bountybags edit <tier>` in
// game and clicking Restore Defaults (decompiled
// `LootEditorCommands`/`AdminActionPacket.RESTORE_DEFAULTS` - real,
// but GUI-only, not RCON-automatable). Do this for every future
// bag-contents edit, not just this one.

// Full zombie-apocalypse roster pivot (2026-09-06) - see
// wave_spawner.js's WAVE_MOB_TYPES for the full writeup. Real ids
// confirmed by decompiling each mod's own registration class, not
// pattern-guessed - includes one real correction along the way: the
// original proposal's "Flesh Unseen" turned out to have no registered
// EntityType at all in this exact TFTH build (config/sounds exist,
// nothing actually summonable), so it's dropped here too, not just from
// the wave table. `minecraft:zombified_piglin` is real, confirmed
// vanilla headroom never used in any wave - included here purely for
// loot coverage, same "not in the curated roster but cheap to cover"
// reasoning the old system already used for husk/drowned/creeper.
// `mutantszombies:*` ids confirmed from ModEntities.class directly.
// TFTH removed entirely 2026-09-04 (real playtest feedback) - see
// wave_spawner.js's WAVES header comment for the full replacement
// mapping. Real re-tiering, not a 1-for-1 id swap: blister_zombie and
// split_head_zombie moved DOWN from Epic to Uncommon/Rare, since their
// real roster role (see wave_spawner.js) is now early-wave trash, not
// an elite - an Epic bag dropping from a wave-3 kill would be a real
// balance bug. flesh_dog/cow/sheep/pig/vindicator/pillager/
// plaquecreatureone/plaquecontaminator are gone without replacement -
// confirmed real dead weight, not live variety: TFTH's own autonomous
// spawning is fully disabled in TFTH.toml (enableGermStageMobSpawn,
// enableIncubatorSpawn, enableStructuresSpawn all already false), so
// only flesh_dog (spawned via wave_spawner.js) was ever actually
// reachable - the rest could never be killed, so removing them doesn't
// shrink anything real. Epic thins from 8 entries to 2 as a real,
// honest consequence - there isn't a 3rd genuinely mid-tough identity
// left in the roster after TFTH's removal, not papered over with a
// forced duplicate.
const UNCOMMON_MOBS = ['minecraft:zombie', 'minecraft:husk', 'minecraft:drowned', 'minecraft:zombie_villager', 'minecraft:zombified_piglin', 'mutantszombies:mutant_zombie', 'mutantszombies:blister_zombie', 'undeadnights:horde_zombie']
const RARE_MOBS = ['mutantszombies:split_head_zombie']
const EPIC_MOBS = ['undeadnights:elite_zombie', 'zombiesmore:boomer_zombie']
const LEGENDARY_MOBS = ['mutantszombies:crawler', 'undeadnights:demolition_zombie', 'mutantszombies:zombie_brute', 'mutantszombies:mutant_brute']

// **Redesigned 2026-09-08, direct ask - real design change, not a
// tuning pass.** Old system (kept above in git history, not here)
// gated bag TIER by mob tier - only RARE_MOBS/EPIC_MOBS/LEGENDARY_MOBS
// (a small, tougher subset of the roster) could ever roll a Rare/Epic/
// Legendary bag at all, on top of the flat 2% Legendary "jackpot" any
// mob could roll. Correctly-diagnosed complaint: since higher tiers
// were gated behind mobs that are themselves rare across the campaign,
// the player rarely got a real shot at a good bag. Fix: every wave mob
// kill, regardless of type, gets an independent roll at EACH tier's own
// flat absolute chance - same "generalize the jackpot's shape to every
// tier" idea the user asked for, just implemented as 4 independent
// per-tier rolls (matching this file's own existing LootJS idiom -
// randomChance().addLoot() per tier) rather than a single roll-then-
// subdivide, since LootJS's simple API doesn't have a clean built-in
// "roll once, pick a weighted outcome" primitive and the old jackpot
// mechanic already worked exactly this way (independent rolls that CAN
// double up on the same kill, extremely rarely - a feature, reads as an
// extra-lucky jackpot, not a bug).
//
// Numbers, worked estimate (not a first guess): target was preserving
// Uncommon's existing ~50% per-kill rate exactly, since that's the
// tier the gold_nugget economy fix (2026-09-05) was calibrated against
// - changing it would re-break pacing that was hard-won. Rare/Epic
// raised from "basically inaccessible outside 1-2 specific mob types"
// to a real flat shot on every kill; Legendary held at 2%, matching the
// old jackpot's own rate almost exactly (was 4% tier-gated + 2% jackpot
// for the 4 Legendary-tier mobs specifically, ~2% blended average
// pack-wide since those mobs are a small fraction of total kills).
// Real, deliberate trade-off: total loot volume across the whole
// roster rises, since mob types that previously couldn't roll Rare/
// Epic/Legendary at all now can, on top of keeping their own existing
// odds. That's the actual point of the fix, not a side effect to hide.
const ALL_WAVE_MOBS = UNCOMMON_MOBS.concat(RARE_MOBS, EPIC_MOBS, LEGENDARY_MOBS)

// **Rates cut 2026-09-09, direct playtest report: "far far too many loot
// bags drop... just finished wave 2 and I had about 15 bags."** Real
// math, not a guess: wave 1+2 kill 21 mobs total (WAVES[0]/[1] in
// wave_spawner.js), and the old flat rates below (0.5+0.15+0.07+0.02 =
// 0.74 expected bags/kill) predict 21*0.74 ≈ 15.5 - matches the report
// almost exactly, and Uncommon's own 0.5 alone accounts for ~70% of that
// volume (the other 3 tiers combine for barely 4-5 bags over the same
// span). Cut to ~0.31 total/kill (≈40% of the old volume) - same
// per-tier SHAPE (every mob still gets an independent shot at every
// tier, the real point of the 2026-09-08 redesign above, not reverted)
// just scaled down enough that a wave 1-2 clear lands around 6-7 bags
// instead of 15. Legendary left untouched - it was never the volume
// problem (only ~0.4 expected bags over the same 21 kills) and is
// deliberately a rare jackpot, not something to tune for count.
// Real, known trade-off, not hidden: Uncommon bags are this pack's real
// gold_nugget source (see the redesign comment above, "calibrated
// against the gold_nugget economy fix") - cutting its rate to ~40% of
// its old value also cuts average gold income from kills to roughly the
// same fraction, unless bag CONTENTS are separately bumped to
// compensate (a heavier follow-up: BountyBags caches its loot tables
// into config/bountybags/*.toml after first boot, per this file's own
// "STOP" note above, so a contents change needs the live TOML deleted/
// regenerated, not just this file edited). Left as a known follow-up,
// not done automatically here, since the actual complaint was volume,
// not "not enough gold."
//
// `LootJS.modifiers(...)` / `.addEntityLootModifier(id).randomChance(n).addLoot(id)`
// - same confirmed-working pattern as the old system, just pointed at
// bountybags:*_loot_bag instead of the custom kubejs:* items, and now
// applied to every wave mob instead of a tier-specific subset.
LootJS.modifiers((event) => {
  ALL_WAVE_MOBS.forEach((id) => {
    event.addEntityLootModifier(id).randomChance(0.2).addLoot('bountybags:uncommon_loot_bag')
    event.addEntityLootModifier(id).randomChance(0.06).addLoot('bountybags:rare_loot_bag')
    event.addEntityLootModifier(id).randomChance(0.03).addLoot('bountybags:epic_loot_bag')
    event.addEntityLootModifier(id).randomChance(0.02).addLoot('bountybags:legendary_loot_bag')
  })
})
