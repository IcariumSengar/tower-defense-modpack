// Every-5th-wave airdrop (rebuilt 2026-09-08, direct instruction - replaces
// the old wave-8+ speed-clear-bonus mechanic entirely, not layered
// alongside it). New trigger: `waveNumber % 5 === 0` on wave clear, no time
// window, no skill check - a flat cadence reward. **Explicitly
// provisional** - "I may come back to this mechanic to see if there is a
// better gameplay feel that lends itself to the airdrop," so don't treat
// this cadence as locked/final.
//
// Mod swap: Paojiao134's Airdrop -> Realistic Airdrop (`dyairdrop`,
// CurseForge author naughty_keller85), 1.1.0-1.20.1-beta build (CurseForge
// file 7689163, project 1116182). Real freshness check done before picking
// this build, not assumed from the prompt's own prior research: CurseForge
// actually has a whole non-beta 1.0.0.x release line (1.0.0 -> hotfix ->
// hotfix3.0, Mar-Sep 2025) between the old 0.9.5 beta and this 1.1.0 beta -
// the "only two 1.20.1 files, both Beta" premise was stale. Picked 1.1.0-beta
// anyway over the newer-but-still-"release"-tagged hotfix3.0 after diffing
// both jars' decompiled bytecode directly: the beta is a genuine refactor
// (readable variables, not MCreator's `_levelxx` soup) that adds one real,
// useful feature relevant here - a trailing `map` boolean that, when true,
// calls Xaero's Minimap's own `addwaypointxaero` command on the landed
// crate's real position (confirmed via decompile: `MobairdropticksProcedure`
// in the beta build issues `addwaypointxaero @a <x> <y> <z> ...` right after
// the block-placement setblock). Xaero's Minimap is already installed in
// this pack, so this is a real, free "find your crate" upgrade over the old
// mod's own landing behavior - worth the Beta label, matching this pack's
// existing "Beta is often just a CurseForge convention, not a real
// instability signal" stance. No crash/instability found in a real
// full-mod-set sandbox boot (see docs/QUEUE.md for the verification note).
//
// Real command chain, confirmed by decompiling SetairdropCommand /
// Flycode3neoProcedure / MobairdropticksProcedure directly (not guessed
// from the mod's own listed examples):
// `/setairdrop random <player> <height> <length> <driftmin> <driftmax>
// <blockid> <loot_table> <pin> <map>`
// - `<player>` is a plain vanilla single-EntityArgument selector - `@r`
//   really does mean "a random online player" here (standard vanilla
//   selector semantics, nothing dyairdrop-specific), confirmed from the
//   decompiled command builder (`EntityArgument.entity()`). The crate then
//   free-drifts a random `driftmin`-`driftmax` block distance from THAT
//   player's live position in a random direction - there's no world-border
//   integration in this mod at all (a real behavior difference from the
//   old Paojiao134's Airdrop, which auto-confined itself to the current
//   border via its own BorderIntegrationHandler) - drift is kept modest
//   below specifically so this can't realistically launch the crate
//   outside the live worldborder even at wave 5 (the earliest trigger,
//   smallest border).
// - `<blockid>` = `dyairdrop:airdroplarge`, a real registered block
//   (confirmed in `DyairdropModBlocks`) - the mod's own biggest crate,
//   matching this slot's existing "big reward" framing. Its tile entity
//   (`AirdroplargeTileEntity`) genuinely `extends
//   RandomizableContainerBlockEntity` - real vanilla loot-table-on-first-
//   open mechanics, the same mechanism `structure_chest_loot_fix.js`
//   already relies on elsewhere in this pack, not a custom inventory
//   system.
// - `<loot_table>` is passed through completely unvalidated all the way
//   down into a real `setblock ... {LootTable:"<value>"}` command
//   (confirmed in `MobairdropticksProcedure` - it never touches a
//   vanilla-only allowlist), so a custom pack-registered loot table id
//   resolves exactly like any vanilla one - real confirmation of the
//   "still needs verification" item from the original spec. Points at
//   `kubejs:chests/wave_airdrop` (data/kubejs/loot_tables/chests/
//   wave_airdrop.json), the same reward composition the old hand-authored
//   `config/airdrop/wave8_bonus.json` JSON pool used (legendary loot bag +
//   netherite scrap + diamond block), just as a real vanilla-format loot
//   table instead of the old mod's bespoke pool format.
// - `<pin>` = false - no password lock, this is an unconditional reward,
//   not a puzzle.
// - `<map>` = true - drops the Xaero waypoint described above.
//
// Real config judgment calls (pack/config/dyairdrop.toml, header comment
// there has the full reasoning): `enable=false` (this pack's own trigger
// replaces the mod's autonomous global-event airdrop entirely, not
// alongside it), `enableenemies=false` (the mod's own default hostile-mob-
// near-crate mechanic would reintroduce a non-zombie-family mob
// (pillager) and a second, untracked spawn system on top of this pack's
// own wave/horde spawning), `forceload=false` (avoids a real risk the mod
// author's own comment flags, unnecessary here since every drop lands near
// an already-loaded online player).

var WAVE_AIRDROP_INTERVAL = 5
var WAVE_AIRDROP_BLOCK_ID = 'dyairdrop:airdroplarge'
var WAVE_AIRDROP_LOOT_TABLE = 'kubejs:chests/wave_airdrop'
var WAVE_AIRDROP_HEIGHT = 100
var WAVE_AIRDROP_LENGTH = 60
var WAVE_AIRDROP_DRIFT_MIN = 10
var WAVE_AIRDROP_DRIFT_MAX = 30

// Called from wave_status.js's own wave-clear branch, right alongside the
// pedestal heal - matches that file's own established cross-file call
// pattern into pedestal_health.js's healPedestalByPercent (shared top-
// level FUNCTIONS are the proven-reliable cross-file idiom in this
// codebase; shared top-level var/const are not, see bounty_kills.js's own
// real HOSTILE_TYPES collision writeup for why that distinction matters).
function maybeTriggerWaveAirdrop(player, data, waveNumber) {
  if (waveNumber % WAVE_AIRDROP_INTERVAL !== 0) return

  var server = player.getServer()
  server.runCommandSilent(
    `setairdrop random @r ${WAVE_AIRDROP_HEIGHT} ${WAVE_AIRDROP_LENGTH} ${WAVE_AIRDROP_DRIFT_MIN} ${WAVE_AIRDROP_DRIFT_MAX} "${WAVE_AIRDROP_BLOCK_ID}" "${WAVE_AIRDROP_LOOT_TABLE}" false true`
  )
  server.runCommandSilent(
    `title @a title {"text":"SUPPLIES INBOUND","color":"gold","bold":true}`
  )
  player.tell(`§6[Airdrop] §aWave ${waveNumber} cleared - a supply crate is inbound.`)
}

// Old wave-8+ speed-clear countdown display removed entirely (2026-09-08) -
// dead code once there's no time window to count down. The new trigger is
// an unconditional cadence check at wave-clear time, nothing to display
// while a wave is still being fought.
