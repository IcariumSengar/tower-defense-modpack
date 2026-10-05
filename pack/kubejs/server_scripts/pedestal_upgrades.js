// Pedestal upgrades: Max HP, Armor and Thorns, three tiers each, bought with
// XP levels. Tiers are shared world state (td_pedestalUpg_*), so anyone can
// pay and everyone benefits. What each tier does is defined in
// pedestal_health.js (pedestalUpgradeTier, pedestalMaxHealthForTier, ...),
// next to the code that applies it. This file is the buying side:
// - An empty-hand right-click on the pedestal, or /pedestal, opens a
//   chest-style upgrade screen, with a clickable chat menu as the fallback.
// - /pedestal upgrade <hp|armor|thorns> buys one tier; the chat menu's
//   buttons run it.
// - On each wave clear, offerPedestalUpgrades() (called by wave_status.js)
//   prompts every player who can afford a tier.
// Buying, and taking an item off the stand, need the player within
// PEDESTAL_UPGRADE_RANGE of the pedestal. A Max HP tier also heals the HP it
// adds, through healPedestalBy().
var PEDESTAL_UPGRADE_COSTS = [6, 12, 18] // XP levels, not points, for tiers I, II, III
var PEDESTAL_UPGRADE_RANGE = 32 // blocks from the pedestal, horizontally
var PEDESTAL_UPGRADE_ROMAN = ['0', 'I', 'II', 'III']
var PEDESTAL_UPGRADE_STAT_ORDER = ['hp', 'armor', 'thorns']
var PEDESTAL_UPGRADE_LABELS = { hp: 'Max HP', armor: 'Armor', thorns: 'Thorns' }

function pedestalUpgradeEffectText(stat, tier) {
  if (stat === 'hp') return `${pedestalMaxHealthForTier(tier)} HP`
  if (stat === 'armor') return `${Math.round(pedestalArmorForTier(tier) * 100)}% less damage`
  return `${pedestalThornsForTier(tier)} dmg/s back`
}

// Targets the player by name: tellraw's target is players-only, and vanilla
// refuses a raw UUID there because a UUID may name a non-player. (`execute
// as <uuid>`, which quest_milestones.js uses, accepts any entity.) Player
// names are [A-Za-z0-9_], so they are safe in a command.
function pedestalUpgradeTell(server, player, components) {
  server.runCommandSilent(`tellraw ${player.getName().getString()} ${JSON.stringify(components)}`)
}

// Whether `player` is within PEDESTAL_UPGRADE_RANGE of the stored pedestal.
// worldData() is null outside the pedestal's dimension, so a caller holding
// `data` from the player's level has already checked the dimension.
function pedestalPlayerInRange(player, data) {
  var dx = player.getX() - (data.getInt('td_pedestalX') + 0.5)
  var dz = player.getZ() - (data.getInt('td_pedestalZ') + 0.5)
  return dx * dx + dz * dz <= PEDESTAL_UPGRADE_RANGE * PEDESTAL_UPGRADE_RANGE
}

// The cheapest next tier across all three stats, or -1 if all are maxed.
// Used for the wave-clear prompt.
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

// The chat menu: one line per stat, with a clickable [Upgrade] button when
// the player can afford the next tier. Returns a command result.
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

// Buys the next tier of `stat` and returns a command result (1 bought, 0
// refused, with the reason told to the player). `fromGui` skips the chat
// menu afterwards, since the screen refreshes itself.
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
  if (!pedestalPlayerInRange(player, data)) {
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

// Upgrade screen: a 3-row chest GUI from KubeJS's server-side openChestGUI,
// drawn by vanilla's chest screen, so clients need no extra mod. Layout (x
// 0-8 across, y 0-2 down): pedestal status at (4,0); Max HP, Armor and
// Thorns at (2,1), (4,1) and (6,1); a Take button at (4,2) while the stand
// holds anything. There is no Close button: Esc closes it like any chest, and
// this Rhino can't reach ServerPlayer.closeContainer (doCloseContainer
// closes only the server side and leaves the client's screen open).
//
// Clicks go through the single anyClicked callback, not per-slot handlers:
// ChestMenuData.handleClick iterates a slot's handler list while calling
// them, so a buy that refilled its own slot with a new handler would throw a
// ConcurrentModificationException. The refresh only swaps items.
//
// The empty-hand click that would make Supplementaries hand over the stand's
// item opens this screen instead, so the Take button is the only way to get
// the item back: it empties the stand and gives back the exact stack. Taking
// the amulet is the lift: amulet_pedestal.js's tick poll sees the empty stand
// and shrinks the border.
//
// While a KubeJS chest screen is open, KubeJS keeps the player's 36 main
// inventory slots aside and leaves them empty, and on the first server tick
// after the screen closes it writes every slot back from that copy,
// overwriting whatever is in it by then (kubejs-forge 2001.6.5,
// MinecraftServerMixin's post-tick). An item given or picked up while the
// screen is open would be deleted. So the Take button parks the stack in the
// player's persistentData (PEDESTAL_TAKEN_KEY, which survives a logout) and
// pedestalGuiDeliverTaken() gives it from ServerEvents.tick, which KubeJS
// posts after the write-back; pickups wait until the screen is closed.
var PEDESTAL_TAKEN_KEY = 'td_pedestalTakenItems' // JSON list of {id, count, nbt}
var PEDESTAL_CHEST_MENU_CLASS = 'dev.latvian.mods.kubejs.gui.chest.CustomChestMenu'
var pedestalTakenPending = {} // player UUID -> true while something is parked
var PEDESTAL_GUI_STAT_X = { hp: 2, armor: 4, thorns: 6 }
var PEDESTAL_GUI_ICONS = { hp: 'minecraft:golden_apple', armor: 'minecraft:iron_chestplate', thorns: 'minecraft:cactus' }

// A click on a stat within this many ticks of the same screen buying it is
// dropped: the screen has already refreshed when a double-click's second
// press arrives, so that press would buy the next tier.
var PEDESTAL_GUI_REBUY_TICKS = 10

// A JSON text component, escaped for a single-quoted SNBT string.
function pedestalGuiText(text, color) {
  return JSON.stringify({ text: text, color: color, italic: false }).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

// A named display item. HideFlags:127 hides vanilla's tooltip extras, such
// as the chestplate's "+6 Armor", which would read as the upgrade's number.
function pedestalGuiItem(id, name, nameColor, lore) {
  var loreNbt = lore.map((line) => `'${pedestalGuiText(line[0], line[1])}'`).join(',')
  return Item.of(id, 1, `{HideFlags:127,display:{Name:'${pedestalGuiText(name, nameColor)}',Lore:[${loreNbt}]}}`)
}

// The pedestal's block entity and the stack on its stand, or null when the
// stand is empty or the pedestal is gone.
function pedestalGuiStand(level, data) {
  var tile = level.getBlockEntity([data.getInt('td_pedestalX'), data.getInt('td_pedestalY'), data.getInt('td_pedestalZ')])
  if (!tile) return null
  var displayed
  try {
    displayed = tile.getDisplayedItem()
  } catch (e) {
    return null
  }
  if (!displayed || displayed.isEmpty()) return null
  return { tile: tile, item: displayed }
}

// Fills every slot from the current state; runs on open and after each click.
// Records the tier each stat slot shows in `shownTiers`.
function fillPedestalGui(gui, player, shownTiers) {
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
    shownTiers[stat] = tier
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

  var stand = pedestalGuiStand(level, data)
  var takeButton = Item.of('minecraft:air')
  if (stand) {
    var standId = `${stand.item.id}`
    var isAmulet = standId === 'kubejs:amulet'
    var leftList = amuletsLeftList(data)
    var leftCount = leftList === null ? 1 : leftList.length
    var mine = isAmulet && amuletLeftBy(data, player)
    var takeName = isAmulet ? 'Take your amulet' : `Take the ${stand.item.getHoverName().getString()}`
    if (isAmulet && !mine) {
      takeButton = pedestalGuiItem(standId, 'Your amulet isn\'t here', 'gray', [
        [`Amulets left here: ${leftCount}`, 'gray'],
        ['Only the player who left one can take it back.', 'gray'],
      ])
    } else if (!pedestalPlayerInRange(player, data)) {
      takeButton = pedestalGuiItem(standId, takeName, 'gray', [['Walk back to the pedestal to take it.', 'gray']])
    } else if (isAmulet) {
      takeButton = pedestalGuiItem(standId, takeName, 'light_purple', [
        [`Amulets left here: ${leftCount}`, 'gray'],
        ['Take yours back and the border holds you again.', 'gray'],
        ['It lands in your inventory when you close this.', 'gray'],
      ])
    } else {
      takeButton = pedestalGuiItem(standId, takeName, 'white', [
        ['Only the amulet belongs on the stand.', 'gray'],
        ['It lands in your inventory when you close this.', 'gray'],
      ])
    }
  }
  gui.slot(4, 2, (slot) => {
    slot.item = takeButton
  })

}

// The Take button. It needs the player at the pedestal, as buying does: from
// anywhere else, lifting the amulet would pull every player outside the
// border back to its edge (amulet_border.js).
function pedestalGuiTakeFromStand(player) {
  var level = player.getLevel()
  var data = worldData(level)
  if (!data) return
  var stand = pedestalGuiStand(level, data)
  if (!stand) return
  var isAmulet = `${stand.item.id}` === 'kubejs:amulet'
  if (isAmulet && !amuletLeftBy(data, player)) return
  if (!pedestalPlayerInRange(player, data)) {
    player.tell('§c[Pedestal] §fGet back to the pedestal to take it.')
    return
  }
  var stack = stand.item.copy()
  var clearStand = true
  if (isAmulet) {
    // Takes this player's amulet off the list. The stand keeps showing one
    // while anyone else's is still here, so the border stays open for them.
    var list = amuletsLeftList(data) || []
    var at = list.indexOf(`${player.uuid}`)
    if (at >= 0) list.splice(at, 1)
    amuletsLeftSave(data, list)
    clearStand = list.length === 0
    stack = Item.of('kubejs:amulet')
  }
  if (clearStand) {
    stand.tile.setDisplayedItem(Item.of('minecraft:air'))
    stand.tile.setChanged()
  }
  var pdata = player.persistentData
  var parked = pdata.contains(PEDESTAL_TAKEN_KEY) ? JSON.parse(`${pdata.getString(PEDESTAL_TAKEN_KEY)}`) : []
  var nbt = stack.getNbt()
  parked.push({ id: `${stack.id}`, count: stack.getCount(), nbt: nbt ? `${nbt}` : null })
  pdata.putString(PEDESTAL_TAKEN_KEY, JSON.stringify(parked))
  pedestalTakenPending[`${player.uuid}`] = true
}

function pedestalInChestScreen(player) {
  return `${player.containerMenu.getClass().getName()}` === PEDESTAL_CHEST_MENU_CLASS
}

// Gives the parked stacks once the player is alive with no chest screen open.
// KubeJS's write-back runs under the same conditions and before
// ServerEvents.tick, so by then it has already happened.
function pedestalGuiDeliverTaken(player) {
  var pdata = player.persistentData
  if (!pdata.contains(PEDESTAL_TAKEN_KEY)) return true
  if (!player.isAlive() || pedestalInChestScreen(player)) return false
  var parked = JSON.parse(`${pdata.getString(PEDESTAL_TAKEN_KEY)}`)
  pdata.remove(PEDESTAL_TAKEN_KEY)
  parked.forEach((p) => player.give(p.nbt ? Item.of(p.id, p.count, p.nbt) : Item.of(p.id, p.count)))
  return true
}

ServerEvents.tick((event) => {
  if (Object.keys(pedestalTakenPending).length === 0) return
  var online = {}
  var players = event.server.getPlayers()
  for (var i = 0; i < players.length; i++) {
    var uuid = `${players[i].uuid}`
    online[uuid] = true
    if (pedestalTakenPending[uuid] && pedestalGuiDeliverTaken(players[i])) delete pedestalTakenPending[uuid]
  }
  // Offline: the stacks stay parked, and the login handler picks them up.
  Object.keys(pedestalTakenPending).forEach((uuid) => {
    if (!online[uuid]) delete pedestalTakenPending[uuid]
  })
})

PlayerEvents.loggedIn((event) => {
  if (event.player.persistentData.contains(PEDESTAL_TAKEN_KEY)) pedestalTakenPending[`${event.player.uuid}`] = true
})

ItemEvents.canPickUp((event) => {
  if (pedestalInChestScreen(event.getEntity())) event.cancel()
})

// A stat click buys only the tier its slot showed. A slot drawn before someone
// else bought that tier just redraws, so nobody pays a price they weren't
// shown. `lastBuyTicks` holds the game time this screen last bought each stat.
function pedestalGuiBuy(player, stat, shownTiers, lastBuyTicks) {
  var data = worldData(player.getLevel())
  if (!data) return
  var now = Number(player.getLevel().getTime())
  if (lastBuyTicks[stat] !== undefined && now - lastBuyTicks[stat] < PEDESTAL_GUI_REBUY_TICKS) return
  if (pedestalUpgradeTier(data, stat) !== shownTiers[stat]) {
    player.tell(`§7[Pedestal] Someone else just upgraded ${PEDESTAL_UPGRADE_LABELS[stat]}. Check the new price.`)
    return
  }
  if (buyPedestalUpgrade(player, stat, true) === 1) lastBuyTicks[stat] = now
}

function openPedestalUpgradeGui(player) {
  // Per screen, filled in by fillPedestalGui and pedestalGuiBuy.
  var shownTiers = {}
  var lastBuyTicks = {}
  player.openChestGUI(Text.of('Pedestal'), 3, (gui) => {
    gui.playerSlots = false
    fillPedestalGui(gui, player, shownTiers)
    gui.anyClicked = (e) => {
      var type = `${e.type}`
      // Left/right clicks and shift-clicks only.
      if (type !== 'PICKUP' && type !== 'QUICK_MOVE') return
      var x = e.slot.x
      var y = e.slot.y
      if (x === 4 && y === 2) {
        pedestalGuiTakeFromStand(player)
      } else if (y === 1) {
        PEDESTAL_UPGRADE_STAT_ORDER.forEach((stat) => {
          if (PEDESTAL_GUI_STAT_X[stat] === x) pedestalGuiBuy(player, stat, shownTiers, lastBuyTicks)
        })
      } else {
        return
      }
      fillPedestalGui(gui, player, shownTiers)
      gui.sync()
    }
  })
}

// Leaves the held amulet at the pedestal for this player. The first one goes
// on the stand, which opens the border (amulet_pedestal.js's poll); later ones
// are kept on the list only. Refused if this player's is already here or the
// stand holds something else.
function pedestalLeaveAmulet(player, level, data, held) {
  var list = amuletsLeftList(data)
  var stand = pedestalGuiStand(level, data)
  if (list === null) {
    // An amulet left before the co-op rule has no recorded owner. Anyone can
    // take it back (amuletLeftBy's old rule); after that the list starts.
    if (stand && `${stand.item.id}` === 'kubejs:amulet') {
      player.notify('§d[Amulet] §fTake the amulet on the stand back first, then leave yours.')
      return
    }
    list = []
  }
  if (list.indexOf(`${player.uuid}`) >= 0) {
    player.notify('§d[Amulet] §fYour amulet is already on the stand.')
    return
  }
  if (stand && `${stand.item.id}` !== 'kubejs:amulet') {
    player.notify('§d[Pedestal] §fTake the other item off the stand first.')
    return
  }
  if (!stand) {
    var tile = level.getBlockEntity([data.getInt('td_pedestalX'), data.getInt('td_pedestalY'), data.getInt('td_pedestalZ')])
    if (!tile) return
    tile.setDisplayedItem(Item.of('kubejs:amulet'))
    tile.setChanged()
  }
  held.shrink(1)
  list.push(`${player.uuid}`)
  amuletsLeftSave(data, list)
  if (stand) player.tell('§d[Amulet] §fYour pendant joins the one on the stand. The line at the border won\'t hold you now.')
}

// The refusal notice below goes out at most once per
// PEDESTAL_STAND_REFUSED_NOTICE_TICKS per player: holding right-click repeats
// the click every 4 ticks.
var PEDESTAL_STAND_REFUSED_NOTICE_TICKS = 60
var pedestalStandRefusedNoticeTick = {} // player UUID -> game time of the last notice

// Main hand on the stored pedestal; same guards as the heal handler in
// pedestal_health.js, which handles the heal items. An empty hand opens the
// screen. The stand holds only the amulet, which Supplementaries places: any
// other item would sit there with only the Take button to get it back, and
// keep the amulet off meanwhile, so it is refused while the stand is empty.
// With the stand full Supplementaries places nothing and the item's own use
// goes ahead; sneaking with an item skips the block's use anyway. The
// clicking client has already predicted the exchange with the stand, so
// pedestalHealClickResync() puts the stand and inventory right first.
// event.cancel() throws in this KubeJS build, so it comes last.
BlockEvents.rightClicked('supplementaries:pedestal', (event) => {
  if (`${event.getHand()}` !== 'MAIN_HAND') return
  var held = event.item
  var heldId = `${held.id}`
  if (!held.isEmpty() && PEDESTAL_HEAL_ITEMS[heldId]) return
  var player = event.entity
  var level = player.getLevel()
  var data = worldData(level)
  if (!data || !data.contains('td_pedestalX') || data.getBoolean('td_pedestalDestroyed')) return
  var block = event.getBlock()
  if (block.getX() !== data.getInt('td_pedestalX') || block.getY() !== data.getInt('td_pedestalY') || block.getZ() !== data.getInt('td_pedestalZ')) return
  if (heldId === 'kubejs:amulet') {
    // Leaving an amulet is handled here rather than by Supplementaries, so
    // several players can each leave theirs (see amulet_pedestal.js).
    if (player.isShiftKeyDown()) return
    pedestalLeaveAmulet(player, level, data, held)
    pedestalHealClickResync(player, block)
  } else if (held.isEmpty()) {
    pedestalHealClickResync(player, block)
    try {
      openPedestalUpgradeGui(player)
    } catch (e) {
      console.error(`pedestal_upgrades.js: could not open the upgrade screen (${e}) - showing the chat menu`)
      showPedestalUpgradeMenu(player)
    }
  } else {
    if (player.isShiftKeyDown() || pedestalGuiStand(level, data)) return
    var now = Number(level.getTime())
    var key = `${player.uuid}`
    var lastNotice = pedestalStandRefusedNoticeTick[key]
    if (lastNotice === undefined || now - lastNotice >= PEDESTAL_STAND_REFUSED_NOTICE_TICKS) {
      pedestalStandRefusedNoticeTick[key] = now
      player.notify('§d[Pedestal] §fOnly the amulet sits on the stand.')
    }
    pedestalHealClickResync(player, block)
  }
  event.cancel()
})

// Called from wave_status.js's wave-clear branch, once per clear (it is
// guarded by the shared td_inWave flag). Only players who can afford at
// least one tier get the one-line prompt.
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
  // /pedestal (also run by the wave-clear [Upgrades] link) opens the same
  // screen as an empty-hand click, from any distance; buying and taking still
  // need the player within PEDESTAL_UPGRADE_RANGE. The chat menu is the
  // fallback.
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
