// Gives every wave mob a hidden Haste XV, once, so Epic Siege Mod diggers get
// through walls 4x faster.
//
// ESM has no dig-speed setting, but its dig speed follows vanilla's formula,
// Haste included: a bare-handed zombie needs 10 s per cobblestone block, or
// 2.5 s with Haste XV. Haste rather than a held pickaxe, which would add melee
// damage and could drop on death. Pairs with diggingRequiresTools = false in
// pack/config/epicsiegemod-common.toml, which lets mobs dig stone at all.
// Reinforced blocks (hardness -1) stay undiggable. ServerEvents.tick so it
// also runs with nobody online.
var DIG_HASTE_INTERVAL_TICKS = 40
var DIG_HASTE_AMPLIFIER = 14 // Haste XV: 1 + 0.2 * (14 + 1) = 4x dig speed
var DIG_HASTE_DURATION_SECONDS = 1000000 // /effect give takes seconds; its maximum
var DIG_HASTE_TAG = 'td_dig_haste' // marks mobs already dosed

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
    server.runCommandSilent(`effect give ${e.uuid} minecraft:haste ${DIG_HASTE_DURATION_SECONDS} ${DIG_HASTE_AMPLIFIER} true`)
  })
})
