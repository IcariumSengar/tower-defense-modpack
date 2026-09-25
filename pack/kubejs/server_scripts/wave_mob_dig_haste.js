// Wave-mob dig speed (2026-09-22, direct playtest report at wave 7: "i need
// the zombies to be way more aggressive when it comes to being able to
// break blocks ... they just stand around outside the perimeter wall").
//
// Two real causes, both confirmed by decompiling the installed Epic Siege
// Mod jar (EpicSiegeMod-14.171, funwayguy.epicsiegemod.ai.ESM_EntityAIDigging
// + ai.utils.AiUtils), not guessed:
//  1. `diggingRequiresTools = true` (config/epicsiegemod-common.toml) - the
//     bigger one, fixed there: any block with requiresCorrectToolForDrops
//     (cobble, stone, bricks, metal blocks) was undiggable unless the mob
//     happened to hold the right tool (5% do). See the config comment.
//  2. Dig SPEED. ESM has no config for it at all. AiUtils.getBlockStrength
//     is vanilla's own formula: breakSpeed / hardness / (30 with the right
//     tool, else 100), accumulated per tick until it reaches 1. A bare-
//     handed zombie is breakSpeed 1.0, so cobblestone (hardness 2) is
//     1/2/100 = 200 ticks = 10 SECONDS per block, stone bricks 7.5s,
//     deepslate 15s - slow enough to read as "not even trying" from the
//     wall. The one lever ESM's own formula exposes: AiUtils.getBreakSpeed
//     multiplies by `1 + 0.2 * (amplifier + 1)` when the mob has the Haste
//     (dig_speed) effect - exactly vanilla's own player haste math.
//
// So every td_wave_mob gets a permanent, invisible Haste effect once. Haste
// XV (amplifier 14) = 1 + 0.2 * 15 = 4x: cobblestone 2.5s, planks 2.5s,
// dirt ~0.6s, stone bricks ~1.9s, obsidian ~60s. Deliberately not a held
// pickaxe instead: a held tool changes the mob's melee damage (iron pickaxe
// = +4 attack damage) and can drop on death (loot shortcut) - Haste does
// neither. Haste's attack-speed side effect only applies to player attack
// cooldowns; mob melee cadence is a fixed goal timer, unaffected. Particles
// and the effect icon are hidden via the command's trailing `true`
// (hideParticles), so nothing visibly changes on the mob. SecurityCraft
// reinforced blocks (hardness -1) are still skipped by ESM's own
// canHarvest, so the base shell stays undiggable regardless of speed.
//
// One place, tag-guarded, covers every spawn path (wave_spawner.js summon,
// tdTagHordeMobs for Undead Nights hordes, boss_wave.js) without touching
// three summon-NBT strings. ServerEvents.tick like tesla_coil_auto_power.js
// so it also runs with nobody online (endless-phase hordes tick in force-
// loaded chunks). Every 2s is plenty: ESM's own digging goal needs a mob to
// stand still for 20 ticks before it starts a dig, so the effect is always
// on before the first block is touched. UUID-as-selector in /effect is
// plain vanilla selector syntax, same as the pack's other per-entity
// commands.
var DIG_HASTE_INTERVAL_TICKS = 40
var DIG_HASTE_AMPLIFIER = 14 // Haste XV -> 4x dig speed (1 + 0.2 * (14 + 1))
var DIG_HASTE_DURATION_TICKS = 1000000 // /effect's own maximum (~14h of game time)
var DIG_HASTE_TAG = 'td_dig_haste'

ServerEvents.tick((event) => {
  var level = event.server.getLevel('minecraft:overworld')
  if (!level) return
  if (level.getTime() % DIG_HASTE_INTERVAL_TICKS !== 0) return
  var server = event.server
  level.getEntities().forEach((e) => {
    var tags = e.getTags()
    if (!tags.contains('td_wave_mob') || tags.contains(DIG_HASTE_TAG)) return
    if (e.getHealth() <= 0) return
    tags.add(DIG_HASTE_TAG)
    server.runCommandSilent(`effect give ${e.uuid} minecraft:haste ${DIG_HASTE_DURATION_TICKS} ${DIG_HASTE_AMPLIFIER} true`)
  })
})
