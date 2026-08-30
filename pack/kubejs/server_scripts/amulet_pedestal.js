// The amulet pedestal — craftable (docs/FEATURES.md, "Decided: the
// amulet is starter gear, the pedestal is crafted"), not pre-built into
// the starting base. Recipe uses gold ingots (Uncommon-tier loot pool,
// see loot_bag_open.js) + stone_bricks (the base's own floor material,
// playtest_starter_kit.js) — no recipe was pinned down in FEATURES.md,
// this is an implementation-level pick, not a design decision needing
// sign-off.
//
// Right-click interaction is the actual "place the amulet on it" and
// "take it back" mechanic. State lives on the player's persistentData
// (td_amuletWorn / td_amuletOnPedestal), not the block — see amulet.js's
// comment on why. Uses player.findFirstCurio(...) / .setEquippedCurio(...)
// (KubeJS-Curios' LivingEntity mixin methods, confirmed from its source —
// see amulet.js) rather than the onEquip/onUnequip capability callbacks,
// since this is a deliberate script-driven move, not the player using
// Curios' own equip GUI.
//
// Marker entity for mob targeting (docs/FEATURES.md's "real technical
// detail, not hand-waved": vanilla mobs can only setTarget() an entity,
// not a bare block position) is a summoned, invisible, gravity-less,
// Marker-tagged armor stand — the standard vanilla trick, spawned/killed
// via command rather than KubeJS's own entity-spawn API, matching this
// codebase's established preference for command-based world changes
// (playtest_starter_kit.js, wave_spawner.js) over less-proven direct API
// calls. server_scripts/mob_aggro.js targets it by the td_amulet_marker
// tag while td_amuletOnPedestal is true.
//
// Not yet confirmed in-game.

ServerEvents.recipes((event) => {
  event.shaped('kubejs:amulet_pedestal', [
    'GGG',
    'GSG',
    'GGG',
  ], {
    G: 'minecraft:gold_ingot',
    S: 'minecraft:stone_bricks',
  })
})

BlockEvents.rightClicked('kubejs:amulet_pedestal', (event) => {
  var player = event.player
  var data = player.persistentData
  var x = event.block.getX() + 0.5
  var y = event.block.getY() + 1
  var z = event.block.getZ() + 0.5

  if (data.getBoolean('td_amuletOnPedestal')) {
    data.putBoolean('td_amuletOnPedestal', false)
    player.setEquippedCurio('necklace', 0, Item.of('kubejs:amulet', 1))
    data.putBoolean('td_amuletWorn', true)
    player.getServer().runCommandSilent('kill @e[type=minecraft:armor_stand,tag=td_amulet_marker]')
    player.tell('§d[Amulet] §fYou lift the pendant back off its stand. The weight - and the warmth - settles back onto you.')
    return
  }

  var equippedAmulet = player.findFirstCurio((stack) => stack.id === 'kubejs:amulet')
  if (!equippedAmulet.isPresent()) {
    player.tell('§7[Amulet] §fThere\'s nothing to place here - the amulet isn\'t on you.')
    return
  }

  player.setEquippedCurio('necklace', 0, Item.of('minecraft:air'))
  data.putBoolean('td_amuletWorn', false)
  data.putBoolean('td_amuletOnPedestal', true)
  player.getServer().runCommandSilent(`summon minecraft:armor_stand ${x} ${y} ${z} {Invisible:1b,NoGravity:1b,Marker:1b,Tags:["td_amulet_marker"]}`)
  player.tell('§d[Amulet] §fYou set the pendant on the stand. The line at the border loosens - everything out there stops watching you, and starts watching this instead.')
})
