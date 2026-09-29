// The amulet on the pedestal. While the amulet sits on the pedestal the world
// border is pushed out so players can walk past it, and lifting the amulet
// closes it again. td_amuletOnPedestal (worldData() in world_state.js) records
// which it is; amulet_border.js, pedestal_upgrades.js and quest_milestones.js
// read it. The amulet's worn buffs are in amulet_worn.js.
//
// The pedestal is a Supplementaries pedestal block at td_pedestalX/Y/Z.
// Supplementaries itself places the amulet on it (right-click with the amulet
// in hand), and pedestal_upgrades.js's pedestal screen takes it back off, so
// this file only polls what the pedestal holds. Older saves have the legacy
// kubejs:amulet_pedestal block there instead. It has no inventory, so its
// right-click handler at the bottom does the placing and taking.

// Vanilla's border blocks movement by itself, so letting players past means
// moving it. This many blocks are added to its width when the amulet goes on
// and taken off again when it is lifted. A relative change, rather than
// restoring a saved size, keeps whatever base_expansion.js added in between.
var BORDER_EXPAND_DELTA = 10000000

// Records the new state and moves the border. `player` gets the chat line; from
// the tick poll that is whichever player's tick noticed the change.
function toggleAmuletOnPedestal(player, data, level, hasAmulet) {
  data.putBoolean('td_amuletOnPedestal', hasAmulet)

  var server = player.getServer()
  var currentBorderSize = level.getWorldBorder().getSize()

  if (hasAmulet) {
    server.runCommandSilent(`worldborder set ${currentBorderSize + BORDER_EXPAND_DELTA} 0`)
    player.tell('§d[Amulet] §fThe pendant settles onto the stand. The line at the border loosens - you can walk past it without being pushed back.')
  } else {
    // The border starts at BORDER_START (50, playtest_starter_kit.js) and
    // only grows, so a result below 50 means the matching expansion never
    // happened. Leave the border alone then.
    var shrunkBorderSize = currentBorderSize - BORDER_EXPAND_DELTA
    if (shrunkBorderSize >= 50) {
      server.runCommandSilent(`worldborder set ${shrunkBorderSize} 0`)
    }
    player.tell('§d[Amulet] §fYou lift the pendant back off its stand.')
  }
}

PlayerEvents.tick((event) => {
  var player = event.entity
  var level = player.getLevel()

  var data = worldData(level)
  if (!data || !data.contains('td_pedestalX')) return

  if (level.getTime() % 10 !== 0) return // twice a second

  var x = data.getInt('td_pedestalX')
  var y = data.getInt('td_pedestalY')
  var z = data.getInt('td_pedestalZ')

  // Only Supplementaries' pedestal has an inventory to poll; the legacy
  // block is handled by the right-click handler below.
  var block = level.getBlock(x, y, z)
  if (`${block.id}` !== 'supplementaries:pedestal') return

  var pedestalTile = level.getBlockEntity([x, y, z])
  if (!pedestalTile) return

  var displayed
  try {
    displayed = pedestalTile.getDisplayedItem()
  } catch (e) {
    return
  }

  // The pedestal takes any item, so check that it holds the amulet.
  var hasAmulet = displayed && !displayed.isEmpty() && `${displayed.id}` === 'kubejs:amulet'
  var wasOnPedestal = data.getBoolean('td_amuletOnPedestal')
  if (hasAmulet === wasOnPedestal) return

  toggleAmuletOnPedestal(player, data, level, hasAmulet)
})
