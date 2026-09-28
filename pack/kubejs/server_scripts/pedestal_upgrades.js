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

function buyPedestalUpgrade(player, stat) {
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
  showPedestalUpgradeMenu(player)
  return 1
}

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
  event.register(
    Commands.literal('pedestal')
      .executes((context) => showPedestalUpgradeMenu(context.source.getPlayerOrException()))
      .then(
        Commands.literal('upgrade')
          .then(Commands.literal('hp').executes((context) => buyPedestalUpgrade(context.source.getPlayerOrException(), 'hp')))
          .then(Commands.literal('armor').executes((context) => buyPedestalUpgrade(context.source.getPlayerOrException(), 'armor')))
          .then(Commands.literal('thorns').executes((context) => buyPedestalUpgrade(context.source.getPlayerOrException(), 'thorns')))
      )
  )
})
