// Enhanced Hordes has no config file; it is driven by gamerules and tags, and
// its horde mechanics apply only to mobs in the forge:hordes entity tag
// (zombie, zombie_villager, zombified_piglin, husk, drowned, slime). This turns
// hordeMultiplying off: it lets zombies, husks and drowned with a target raise
// extra zombies out of dirt, sand and similar ground, and those would not
// carry td_wave_mob, so wave_status.js wouldn't count them and mob_aggro.js
// wouldn't steer them. Gamerules are saved per world, so this is re-applied on
// every server start.
//
// hordeStacking stays on: overlapping horde mobs push each other up, so a crowd
// climbs walls. hordeSmashingPower keeps its default of 4: with mobGriefing on,
// a horde mob overlapped by 4 or more others breaks every block around it that
// isn't in forge:horde_unbreakable (bedrock, obsidian and the like).
ServerEvents.loaded((event) => {
  event.server.runCommandSilent('gamerule hordeMultiplying false')
})
