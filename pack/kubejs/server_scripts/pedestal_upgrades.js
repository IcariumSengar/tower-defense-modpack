// Pedestal upgrades: Max HP, Armor, Thorns bought with XP levels
// (2026-09-27; docs/IDEAS.md's "Pedestal upgrades" idea, built on direct
// ask). Chosen with the user: XP levels as the currency, 3 tiers per stat.
// The stat numbers and what each tier does live in pedestal_health.js,
// next to the damage/heal code that uses them
// (pedestalUpgradeTier/pedestalMaxHealthForTier/...). This file is only
// the buying side.
//
// **Why a command menu, not "sneak-right-click the pedestal"**:
// Supplementaries' pedestal hands its displayed item to ANY empty-hand
// click, sneaking or not (decompiled Moonlight ItemDisplayTile.interact:
// empty hand -> removeItem, no shift check). With the amulet sitting on
// it, a sneak-click trigger would fight Supplementaries over the amulet -
// the same client/server race that caused the 2026-09-08 phantom-item
// bug (see pedestal_health.js's heal-poll header). So `/pedestal` opens a
// clickable chat menu, and at every wave clear anyone who can afford a
// tier gets a one-line clickable prompt, so nobody has to remember the
// command. The quest book teaches it too.
//
// Rules: tiers are shared world state (one pedestal, whoever pays). You
// must be within PEDESTAL_UPGRADE_RANGE of the pedestal to buy, since
// upgrading is something you do at home. A Max HP upgrade also adds the
// new 100 HP to current HP straight away, via healPedestalBy (so it plays
// the heal effect and resets alert tiers). Costs are levels, not points,
// so a tier costs more raw XP the higher your level is - vanilla's own
// enchanting-table trade-off.
var PEDESTAL_UPGRADE_COSTS = [5, 10, 15] // levels for tier I, II, III
var PEDESTAL_UPGRADE_RANGE = 32
var PEDESTAL_UPGRADE_ROMAN = ['0', 'I', 'II', 'III']
var PEDESTAL_UPGRADE_STAT_ORDER = ['hp', 'armor', 'thorns']
var PEDESTAL_UPGRADE_LABELS = { hp: 'Max HP', armor: 'Armor', thorns: 'Thorns' }

function pedestalUpgradeEffectText(stat, tier) {
  if (stat === 'hp') return `${pedestalMaxHealthForTier(tier)} HP`
  if (stat === 'armor') return `${Math.round(pedestalArmorForTier(tier) * 100)}% less damage`
  return `${pedestalThornsForTier(tier)} dmg/s back`
}

// Targets the player by NAME, not UUID. Proven in the client sandbox,
// 2026-09-27: `tellraw <uuid> ...` returns 0 even though `${player.uuid}`
// renders a valid UUID. tellraw's target is a players-only argument, and
// vanilla treats a raw UUID as a selector that may include non-players, so
// it refuses it. That's the same reason ftbquests change_progress needs
// `execute as <uuid> ... @s` (quest_milestones.js, which is fine: `execute
// as` takes any entity). Player names are [A-Za-z0-9_], so they're safe
// as a command target.
function pedestalUpgradeTell(server, player, components) {
  server.runCommandSilent(`tellraw ${player.getName().getString()} ${JSON.stringify(components)}`)
}

// The cheapest next tier across all three stats, or -1 if everything is
// maxed. Used for the wave-clear prompt.
function pedestalCheapestUpgradeCost(data) {
  var cheapest = -1
  PEDESTAL_UPGRADE_STAT_ORDER.forEach((stat) => {
    var tier = pedestalUpgradeTier(data, stat)
    if (tier >= pedestalUpgradeMaxTier()) return
    var cost = PEDESTAL_UPGRADE_COSTS[tier]
    if (cheapest === -1 || cost < cheapest) cheapest = cost
  })
  return cheapest
}

function showPedestalUpgradeMenu(player) {
  var server = player.getServer()
  var data = worldData(player.getLevel())
  if (!data || !data.contains('td_pedestalX')) {
    player.tell('§c[Pedestal] §fThere is no pedestal yet.')
    return 0
  }
  var levels = player.getXpLevel()
  pedestalUpgradeTell(server, player, [
    { text: '[Pedestal] ', color: 'light_purple' },
    { text: `Upgrades - you have ${levels} level${levels === 1 ? '' : 's'}`, color: 'white' },
  ])
  PEDESTAL_UPGRADE_STAT_ORDER.forEach((stat) => {
    var tier = pedestalUpgradeTier(data, stat)
    var label = PEDESTAL_UPGRADE_LABELS[stat]
    if (tier >= pedestalUpgradeMaxTier()) {
      pedestalUpgradeTell(server, player, [
        { text: '  [MAXED] ', color: 'dark_gray' },
        { text: `${label} ${PEDESTAL_UPGRADE_ROMAN[tier]}: ${pedestalUpgradeEffectText(stat, tier)}`, color: 'gray' },
      ])
      return
    }
    var cost = PEDESTAL_UPGRADE_COSTS[tier]
    var affordable = levels >= cost
    var button = affordable
      ? {
          text: '  [Upgrade] ',
          color: 'green',
          bold: true,
          clickEvent: { action: 'run_command', value: `/pedestal upgrade ${stat}` },
          hoverEvent: { action: 'show_text', contents: `Spend ${cost} levels` },
        }
      : { text: '  [Upgrade] ', color: 'dark_gray' }
    pedestalUpgradeTell(server, player, [
      button,
      { text: `${label} ${PEDESTAL_UPGRADE_ROMAN[tier + 1]}: `, color: 'white' },
      { text: `${pedestalUpgradeEffectText(stat, tier)} -> ${pedestalUpgradeEffectText(stat, tier + 1)}`, color: 'aqua' },
      { text: ` (${cost} levels)`, color: affordable ? 'yellow' : 'red' },
    ])
  })
  return 1
}

// `fromGui` (2026-09-29): the upgrade screen refreshes itself after a buy,
// so it skips the chat menu below.
function buyPedestalUpgrade(player, stat, fromGui) {
  var server = player.getServer()
  var data = worldData(player.getLevel())
  if (!data || !data.contains('td_pedestalX')) {
    player.tell('§c[Pedestal] §fThere is no pedestal yet.')
    return 0
  }
  if (data.getBoolean('td_pedestalDestroyed')) {
    player.tell('§c[Pedestal] §fThe pedestal has fallen. There is nothing left to upgrade.')
    return 0
  }
  var px = data.getInt('td_pedestalX')
  var py = data.getInt('td_pedestalY')
  var pz = data.getInt('td_pedestalZ')
  var dx = player.getX() - (px + 0.5)
  var dz = player.getZ() - (pz + 0.5)
  if (dx * dx + dz * dz > PEDESTAL_UPGRADE_RANGE * PEDESTAL_UPGRADE_RANGE) {
    player.tell('§c[Pedestal] §fGet back to the pedestal to upgrade it.')
    return 0
  }
  var tier = pedestalUpgradeTier(data, stat)
  var label = PEDESTAL_UPGRADE_LABELS[stat]
  if (tier >= pedestalUpgradeMaxTier()) {
    player.tell(`§7[Pedestal] ${label} is already maxed.`)
    return 0
  }
  var cost = PEDESTAL_UPGRADE_COSTS[tier]
  var levels = player.getXpLevel()
  if (levels < cost) {
    player.tell(`§c[Pedestal] §f${label} ${PEDESTAL_UPGRADE_ROMAN[tier + 1]} needs ${cost} levels. You have ${levels}.`)
    return 0
  }

  player.addXPLevels(-cost)
  data.putInt(`td_pedestalUpg_${stat}`, tier + 1)
  if (stat === 'hp') {
    refreshPedestalBossbarMax(server, data)
    healPedestalBy(player, data, pedestalMaxHealthForTier(tier + 1) - pedestalMaxHealthForTier(tier))
  }
  server.runCommandSilent(`particle minecraft:enchant ${px + 0.5} ${py + 1.5} ${pz + 0.5} 0.4 0.6 0.4 1 60`)
  server.runCommandSilent(`playsound minecraft:block.enchantment_table.use block @a ${px + 0.5} ${py} ${pz + 0.5} 1 1`)
  server.runCommandSilent(`playsound minecraft:block.anvil.use block @a ${px + 0.5} ${py} ${pz + 0.5} 0.6 1.2`)
  var who = `${player.getName().getString()}`
  server.runCommandSilent(`tellraw @a ${JSON.stringify([
    { text: '[Pedestal] ', color: 'light_purple' },
    { text: `${who} raised ${label} to ${PEDESTAL_UPGRADE_ROMAN[tier + 1]}: ${pedestalUpgradeEffectText(stat, tier + 1)}.`, color: 'white' },
  ])}`)
  if (!fromGui) showPedestalUpgradeMenu(player)
  return 1
}

// **Upgrade screen, 2026-09-29** (direct ask: "Can i add a gui to the
// pedestal, so that i right click on it with an empty hand I can apply the
// upgrades rather than using chat?"; user chose "always open GUI", with a
// Take-the-amulet button when it's on the stand). A 3-row chest screen from
// KubeJS's own server-side chest GUI (ServerPlayerKJS.openChestGUI ->
// ChestMenuData/CustomChestMenu in kubejs-forge-2001.6.5, checked in the
// jar) - vanilla's chest screen on the client, so no client mod is needed.
//
// Layout (x across 0-8, y down 0-2): the pedestal's status at (4,0); Max HP,
// Armor and Thorns at (2,1), (4,1), (6,1); Take the amulet at (4,2) while
// it's on the stand. No Close button: Esc/E close it like any chest, and
// ServerPlayer.closeContainer isn't reachable from this Rhino (only
// doCloseContainer, which closes server-side and leaves the client's
// screen up - client sandbox, 2026-09-29).
//
// Clicks go through the one `anyClicked` callback, not per-slot handlers:
// ChestMenuData.handleClick iterates a slot's clickHandlers list while
// calling them, so a buy that re-filled its own slot with a fresh handler
// would modify that list mid-iteration (ConcurrentModificationException).
// The refresh only swaps items.
//
// The empty-hand click used to lift the amulet off the stand
// (Supplementaries' ItemDisplayTile.interact). It now always opens this
// screen and is cancelled, and the button does the lift instead: it empties
// the stand and hands the exact stack back, and amulet_pedestal.js's tick
// poll sees the empty stand and runs the usual border shrink + message.
var PEDESTAL_GUI_STAT_X = { hp: 2, armor: 4, thorns: 6 }
var PEDESTAL_GUI_ICONS = { hp: 'minecraft:golden_apple', armor: 'minecraft:iron_chestplate', thorns: 'minecraft:cactus' }

// A JSON text component, escaped for a single-quoted SNBT string.
function pedestalGuiText(text, color) {
  return JSON.stringify({ text: text, color: color, italic: false }).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

// A named display item. HideFlags hides vanilla's own attribute lines
// (the chestplate's "+6 Armor" would read as the upgrade's number).
function pedestalGuiItem(id, name, nameColor, lore) {
  var loreNbt = lore.map((line) => `'${pedestalGuiText(line[0], line[1])}'`).join(',')
  return Item.of(id, 1, `{HideFlags:127,display:{Name:'${pedestalGuiText(name, nameColor)}',Lore:[${loreNbt}]}}`)
}

function pedestalGuiAmuletTile(level, data) {
  if (!data.getBoolean('td_amuletOnPedestal')) return null
  var tile = level.getBlockEntity([data.getInt('td_pedestalX'), data.getInt('td_pedestalY'), data.getInt('td_pedestalZ')])
  if (!tile) return null
  var displayed = tile.getDisplayedItem()
  if (!displayed || displayed.isEmpty() || `${displayed.id}` !== 'kubejs:amulet') return null
  return tile
}

function fillPedestalGui(gui, player) {
  var level = player.getLevel()
  var data = worldData(level)
  if (!data) return
  var levels = player.getXpLevel()
  var maxHealth = pedestalMaxHealth(data)
  var health = data.contains('td_pedestalHealth') ? data.getInt('td_pedestalHealth') : maxHealth

  gui.slot(4, 0, (slot) => {
    slot.item = pedestalGuiItem('supplementaries:pedestal', 'The Pedestal', 'light_purple', [
      [`Health: ${health} / ${maxHealth}`, 'white'],
      [`You have ${levels} level${levels === 1 ? '' : 's'} to spend`, 'yellow'],
      ['Heal it: right-click with a golden carrot', 'gray'],
      ['(+10%) or a nether star (full).', 'gray'],
    ])
  })

  PEDESTAL_UPGRADE_STAT_ORDER.forEach((stat) => {
    var tier = pedestalUpgradeTier(data, stat)
    var label = PEDESTAL_UPGRADE_LABELS[stat]
    var item
    if (tier >= pedestalUpgradeMaxTier()) {
      item = pedestalGuiItem(PEDESTAL_GUI_ICONS[stat], `${label} ${PEDESTAL_UPGRADE_ROMAN[tier]} (maxed)`, 'gray', [
        [pedestalUpgradeEffectText(stat, tier), 'gray'],
      ])
    } else {
      var cost = PEDESTAL_UPGRADE_COSTS[tier]
      var affordable = levels >= cost
      item = pedestalGuiItem(PEDESTAL_GUI_ICONS[stat], `${label} ${PEDESTAL_UPGRADE_ROMAN[tier + 1]}`, affordable ? 'green' : 'red', [
        [`${pedestalUpgradeEffectText(stat, tier)} -> ${pedestalUpgradeEffectText(stat, tier + 1)}`, 'aqua'],
        [`Costs ${cost} levels`, affordable ? 'yellow' : 'red'],
        [affordable ? 'Click to upgrade' : `You need ${cost - levels} more`, affordable ? 'green' : 'dark_gray'],
      ])
    }
    gui.slot(PEDESTAL_GUI_STAT_X[stat], 1, (slot) => {
      slot.item = item
    })
  })

  var amuletTile = pedestalGuiAmuletTile(level, data)
  gui.slot(4, 2, (slot) => {
    slot.item = amuletTile
      ? pedestalGuiItem('kubejs:amulet', 'Take the amulet', 'light_purple', [
          ['Lift the pendant off the stand.', 'gray'],
          ['The border closes back in.', 'gray'],
        ])
      : Item.of('minecraft:air')
  })

}

function pedestalGuiTakeAmulet(player) {
  var level = player.getLevel()
  var data = worldData(level)
  if (!data) return
  var tile = pedestalGuiAmuletTile(level, data)
  if (!tile) return
  var stack = tile.getDisplayedItem().copy()
  tile.setDisplayedItem(Item.of('minecraft:air'))
  tile.setChanged()
  player.give(stack)
}

function openPedestalUpgradeGui(player) {
  player.openChestGUI(Text.of('Pedestal'), 3, (gui) => {
    gui.playerSlots = false
    fillPedestalGui(gui, player)
    gui.anyClicked = (e) => {
      var type = `${e.type}`
      if (type !== 'PICKUP' && type !== 'QUICK_MOVE') return
      var x = e.slot.x
      var y = e.slot.y
      if (x === 4 && y === 2) {
        pedestalGuiTakeAmulet(player)
      } else if (y === 1) {
        PEDESTAL_UPGRADE_STAT_ORDER.forEach((stat) => {
          if (PEDESTAL_GUI_STAT_X[stat] === x) buyPedestalUpgrade(player, stat, true)
        })
      } else {
        return
      }
      fillPedestalGui(gui, player)
      gui.sync()
    }
  })
}

// Empty main hand on the real pedestal -> the screen. Same guards as the
// heal handler in pedestal_health.js (main hand, stored position). The
// clicking client has already predicted Supplementaries' take (see that
// file's pedestalHealClickResync), so the stand and inventory are resynced
// before the screen opens. event.cancel() throws in this KubeJS build, so
// it comes last.
BlockEvents.rightClicked('supplementaries:pedestal', (event) => {
  if (`${event.getHand()}` !== 'MAIN_HAND') return
  if (!event.item.isEmpty()) return
  var player = event.entity
  var data = worldData(player.getLevel())
  if (!data || !data.contains('td_pedestalX') || data.getBoolean('td_pedestalDestroyed')) return
  var block = event.getBlock()
  if (block.getX() !== data.getInt('td_pedestalX') || block.getY() !== data.getInt('td_pedestalY') || block.getZ() !== data.getInt('td_pedestalZ')) return
  pedestalHealClickResync(player, block)
  try {
    openPedestalUpgradeGui(player)
  } catch (e) {
    console.error(`pedestal_upgrades.js: could not open the upgrade screen (${e}) - showing the chat menu`)
    showPedestalUpgradeMenu(player)
  }
  event.cancel()
})

// Called from wave_status.js's wave-clear block (once per clear - that
// block is guarded by the shared td_inWave flag). Only players who can
// afford at least one tier get a line, and it's one line each.
function offerPedestalUpgrades(server, data) {
  var cheapest = pedestalCheapestUpgradeCost(data)
  if (cheapest === -1) return
  var players = server.getPlayers()
  for (var i = 0; i < players.length; i++) {
    var p = players[i]
    var levels = p.getXpLevel()
    if (levels < cheapest) continue
    pedestalUpgradeTell(server, p, [
      { text: '[Pedestal] ', color: 'light_purple' },
      { text: `You have ${levels} levels to spend. `, color: 'white' },
      {
        text: '[Upgrades]',
        color: 'green',
        bold: true,
        clickEvent: { action: 'run_command', value: '/pedestal' },
        hoverEvent: { action: 'show_text', contents: 'Open the pedestal upgrade menu' },
      },
    ])
  }
}

ServerEvents.commandRegistry((event) => {
  var Commands = event.commands
  // `/pedestal` (and the wave-clear [Upgrades] link that runs it) opens the
  // same screen as an empty-hand click since 2026-09-29; buying still needs
  // you within PEDESTAL_UPGRADE_RANGE. The chat menu is the fallback.
  event.register(
    Commands.literal('pedestal')
      .executes((context) => {
        var player = context.source.getPlayerOrException()
        try {
          openPedestalUpgradeGui(player)
          return 1
        } catch (e) {
          console.error(`pedestal_upgrades.js: could not open the upgrade screen (${e}) - showing the chat menu`)
          return showPedestalUpgradeMenu(player)
        }
      })
      .then(
        Commands.literal('upgrade')
          .then(Commands.literal('hp').executes((context) => buyPedestalUpgrade(context.source.getPlayerOrException(), 'hp')))
          .then(Commands.literal('armor').executes((context) => buyPedestalUpgrade(context.source.getPlayerOrException(), 'armor')))
          .then(Commands.literal('thorns').executes((context) => buyPedestalUpgrade(context.source.getPlayerOrException(), 'thorns')))
      )
  )
})
