// The amulet on the pedestal. While the amulet sits on the pedestal the world
// border is pushed out so players can walk past it, and lifting the amulet
// closes it again. td_amuletOnPedestal (worldData() in world_state.js) records
// which it is; amulet_border.js, pedestal_upgrades.js and quest_milestones.js
// read it. The amulet's worn buffs are in amulet_worn.js.
//
// The pedestal is a Supplementaries pedestal block at td_pedestalX/Y/Z.
// Supplementaries itself places the amulet on it (right-click with the amulet
// in hand), and pedestal_upgrades.js's pedestal screen takes it back off, so
// this file only polls what the pedestal holds.

// Vanilla's border blocks movement by itself, so letting players past means
// moving it. This many blocks are added to its width when the amulet goes on
// and taken off again when it is lifted. A relative change, rather than
// restoring a saved size, keeps whatever base_expansion.js added in between.
var BORDER_EXPAND_DELTA = 10000000

// Co-op rule (2026-10-05): each player has to leave their own amulet to go
// past the border. The stand shows one amulet, the first one left; the others
// are kept here by owner. td_amuletsLeft is a JSON list of the UUIDs of the
// players whose amulet is at the pedestal, written by pedestal_upgrades.js
// when an amulet is left or taken. The vanilla border still opens while the
// stand holds an amulet (td_amuletOnPedestal); amulet_border.js holds back
// every player who isn't on the list.
var AMULETS_LEFT_KEY = 'td_amuletsLeft'

// The list, or null in a world whose amulet went on the stand before the rule
// existed.
function amuletsLeftList(data) {
  if (!data.contains(AMULETS_LEFT_KEY)) return null
  try {
    return JSON.parse(`${data.getString(AMULETS_LEFT_KEY)}`)
  } catch (e) {
    return []
  }
}

function amuletsLeftSave(data, list) {
  data.putString(AMULETS_LEFT_KEY, JSON.stringify(list))
}

// Whether this player may cross the open border. A world without the list
// keeps the old rule: an amulet on the stand lets everyone through.
function amuletLeftBy(data, player) {
  var list = amuletsLeftList(data)
  if (list === null) return data.getBoolean('td_amuletOnPedestal')
  return list.indexOf(`${player.uuid}`) >= 0
}

// Records the new state and moves the border. `player` gets the chat line; from
// the tick poll that is whichever player's tick noticed the change.
function toggleAmuletOnPedestal(player, data, level, hasAmulet) {
  data.putBoolean('td_amuletOnPedestal', hasAmulet)

  var server = player.getServer()
  // The size the border is heading to, which is its size when it isn't
  // moving. During base_expansion.js's growth getSize() is the part-grown
  // size, and a `set ... 0` from that would end the growth there for good.
  var borderTargetSize = level.getWorldBorder().getLerpTarget()

  if (hasAmulet) {
    server.runCommandSilent(`worldborder set ${borderTargetSize + BORDER_EXPAND_DELTA} 0`)
    player.tell('§d[Amulet] §fA pendant settles onto the stand. The border opens for whoever has left theirs there.')
  } else {
    // The border starts at BORDER_START (50, playtest_starter_kit.js) and
    // only grows, so a result below 50 means the matching expansion never
    // happened. Leave the border alone then.
    var shrunkBorderSize = borderTargetSize - BORDER_EXPAND_DELTA
    if (shrunkBorderSize >= 50) {
      server.runCommandSilent(`worldborder set ${shrunkBorderSize} 0`)
      amuletReturnWaveMobsInsideBorder(server, level, data)
    }
    player.tell('§d[Amulet] §fYou lift the pendant back off its stand.')
  }
}

// Wave mobs left outside the border when it closes can't path back in, and
// mob_aggro.js leaves mobs outside the border alone, so they would hold the
// wave open. Each one goes to a fresh point in wave_spawner.js's spawn band,
// as mob_aggro.js sends strays back. Runs after the shrink, so the band fits
// the closed border.
function amuletReturnWaveMobsInsideBorder(server, level, data) {
  var marker = findWorldStateEntity(level)
  if (!marker) return
  var border = level.getWorldBorder()
  var minX = border.getMinX()
  var maxX = border.getMaxX()
  var minZ = border.getMinZ()
  var maxZ = border.getMaxZ()
  var band = tdWaveSpawnBand(level)
  var rect = tdCompoundSpawnRect(data)
  level.getEntities().forEach(function (e) {
    if (!e.getTags().contains('td_wave_mob')) return
    var ex = e.getX()
    var ez = e.getZ()
    if (ex >= minX && ex <= maxX && ez >= minZ && ez <= maxZ) return
    var back = tdSpawnBandPoint(band, rect, marker.getX(), marker.getZ())
    // spreadplayers takes an entity selector, so a raw UUID works here.
    server.runCommandSilent(`spreadplayers ${back.x} ${back.z} 0 4 false ${e.uuid}`)
  })
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

  // Nothing to poll once the pedestal has been destroyed.
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
