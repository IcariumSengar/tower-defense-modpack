// Enhanced Hordes has no config file; it is driven by gamerules and tags, and
// its horde mechanics apply only to mobs in the forge:hordes entity tag
// (zombie, zombie_villager, zombified_piglin, husk, drowned, slime). Gamerules
// are saved per world, so they are re-applied on every server start.
//
// hordeMultiplying is off: it lets zombies, husks and drowned with a target
// raise extra zombies out of dirt, sand and similar ground, and those would not
// carry td_wave_mob, so wave_status.js wouldn't count them and mob_aggro.js
// wouldn't steer them.
//
// hordeStacking stays on: overlapping horde mobs push each other up, so a crowd
// climbs walls. Piles only climb. With mobGriefing on, the stacking code has
// two block-breaking rules, and both are off:
//   - a stacked mob breaks forge:horde_breakable blocks (leaves, crops, glass,
//     ice) in its own column. The tag is emptied below.
//   - a mob overlapped by hordeSmashingPower or more other horde mobs breaks
//     every block around it that isn't in forge:horde_unbreakable (vanilla
//     unbreakables only), with no hardness check, so the pedestal and reinforced
//     walls too. A power of 0 skips this rule.
ServerEvents.loaded((event) => {
  event.server.runCommandSilent('gamerule hordeMultiplying false')
  event.server.runCommandSilent('gamerule hordeSmashingPower 0')
})

ServerEvents.tags('block', (event) => {
  event.removeAll('forge:horde_breakable')
})
