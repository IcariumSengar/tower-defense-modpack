// Pedestal hit points. Once a second, every mob on the wave roster within
// PEDESTAL_MELEE_RANGE of the pedestal deals its generic.attack_damage to a
// shared HP pool. mob_aggro.js points every wave mob at the pedestal, so a
// mob in range is treated as attacking it; no attack event is hooked. At 0 HP
// the block breaks and triggerPedestalDestroyed() (pedestal_destruction.js)
// ends the run.
//
// This file also owns the HP bossbar, the under-attack alerts, healing
// (right-click with a golden carrot or nether star; healPedestalByPercent()
// for wave_status.js's wave-clear heal) and the stat numbers behind the
// upgrades that pedestal_upgrades.js sells. All pedestal state lives in
// worldData() (world_state.js); other files call the top-level functions here.
var PEDESTAL_MELEE_RANGE = 3.0 // blocks, pedestal centre to the mob's feet
var PEDESTAL_MELEE_RANGE_SQ = PEDESTAL_MELEE_RANGE * PEDESTAL_MELEE_RANGE

// HP bossbar for players within PEDESTAL_BOSSBAR_RANGE blocks of the
// pedestal. Its player list is reset on every update, so the bar follows
// players in and out of range.
var PEDESTAL_BOSSBAR_ID = 'kubejs:pedestal_health'
var PEDESTAL_BOSSBAR_RANGE = 64

// Max HP with no upgrades. playtest_starter_kit.js starts td_pedestalHealth
// at a literal 300; keep the two equal.
var PEDESTAL_MAX_HEALTH = 300

// Upgrade tiers, 0 to PEDESTAL_UPGRADE_MAX_TIER, are stored in worldData() as
// td_pedestalUpg_hp, td_pedestalUpg_armor and td_pedestalUpg_thorns.
// pedestal_upgrades.js sells them and uses these getters for its menu text.
var PEDESTAL_HP_PER_TIER = 100 // max HP 400/500/600 at tiers 1-3
var PEDESTAL_ARMOR_PER_TIER = 0.15 // damage taken cut by 15/30/45%
var PEDESTAL_THORNS_PER_TIER = 1 // damage a second to each attacker, per tier
var PEDESTAL_UPGRADE_MAX_TIER = 3

function pedestalUpgradeTier(data, stat) {
  var tier = data.getInt(`td_pedestalUpg_${stat}`)
  return Math.max(0, Math.min(PEDESTAL_UPGRADE_MAX_TIER, tier))
}

function pedestalUpgradeMaxTier() {
  return PEDESTAL_UPGRADE_MAX_TIER
}

function pedestalMaxHealthForTier(tier) {
  return PEDESTAL_MAX_HEALTH + PEDESTAL_HP_PER_TIER * tier
}

function pedestalArmorForTier(tier) {
  return PEDESTAL_ARMOR_PER_TIER * tier
}

function pedestalThornsForTier(tier) {
  return PEDESTAL_THORNS_PER_TIER * tier
}

function pedestalMaxHealth(data) {
  return pedestalMaxHealthForTier(pedestalUpgradeTier(data, 'hp'))
}

function ensurePedestalBossbar(server, data) {
  if (data.getBoolean('td_pedestalBossbarAdded')) return
  data.putBoolean('td_pedestalBossbarAdded', true)
  server.runCommandSilent(`bossbar add ${PEDESTAL_BOSSBAR_ID} "Pedestal"`)
  server.runCommandSilent(`bossbar set ${PEDESTAL_BOSSBAR_ID} color red`)
  server.runCommandSilent(`bossbar set ${PEDESTAL_BOSSBAR_ID} max ${pedestalMaxHealth(data)}`)
}

// Called after a Max HP upgrade; ensurePedestalBossbar() only sets the max
// when it creates the bar.
function refreshPedestalBossbarMax(server, data) {
  server.runCommandSilent(`bossbar set ${PEDESTAL_BOSSBAR_ID} max ${pedestalMaxHealth(data)}`)
}

function updatePedestalBossbar(server, health, x, z) {
  server.runCommandSilent(`bossbar set ${PEDESTAL_BOSSBAR_ID} value ${health}`)
  server.runCommandSilent(`bossbar set ${PEDESTAL_BOSSBAR_ID} players @a[x=${x},z=${z},distance=..${PEDESTAL_BOSSBAR_RANGE}]`)
}

// Under-attack alert for every player, wherever they are; the bossbar only
// reaches players near the pedestal. It fires only when health drops into a
// worse tier than td_pedestalAlertTier (1 below full, 2 at half, 3 at a
// quarter, 4 at a tenth of max), so a sustained attack doesn't repeat it
// every second. healPedestalBy() lowers the stored tier, so a later attack
// can alert again.
var PEDESTAL_ALERT_SOUND = 'minecraft:block.anvil.land'

function pedestalAlertTierForHealth(health, maxHealth) {
  if (health <= maxHealth * 0.1) return 4
  if (health <= maxHealth * 0.25) return 3
  if (health <= maxHealth * 0.5) return 2
  if (health < maxHealth) return 1
  return 0
}

// Alert tier -> [action-bar headline, chat line].
var PEDESTAL_ALERT_MESSAGES = {
  1: ['THE PEDESTAL IS UNDER ATTACK', 'Something has found it - get back now.'],
  2: ['THE PEDESTAL IS HALFWAY GONE', "It won't hold much longer."],
  3: ['THE PEDESTAL IS CRITICAL', 'Get back NOW.'],
  4: ['THE PEDESTAL IS ABOUT TO FALL', 'This is it - move!'],
}

// The headline goes to the action bar, the smallest on-screen text, and the
// second line goes to chat. The sound plays at each player's own position so
// distance can't mute it. wave_status.js's hostile counter and
// wave_spawner.js's countdown keep rewriting the action bar, so the headline
// is also stored until td_pedestalAlertUntilTick, and both show it in place
// of their own text (pedestalAlertActionbarText below).
var PEDESTAL_ALERT_ACTIONBAR_TICKS = 80 // 4 seconds

function firePedestalAlert(server, data, tier, now) {
  var msg = PEDESTAL_ALERT_MESSAGES[tier]
  if (!msg) return
  data.putString('td_pedestalAlertText', '§c§l' + msg[0])
  data.putInt('td_pedestalAlertUntilTick', now + PEDESTAL_ALERT_ACTIONBAR_TICKS)
  server.runCommandSilent(`title @a actionbar {"text":"${msg[0]}","color":"red","bold":true}`)
  server.runCommandSilent(`tellraw @a {"text":"${msg[1]}","color":"gold"}`)
  server.runCommandSilent(`execute as @a at @s run playsound ${PEDESTAL_ALERT_SOUND} hostile @s ~ ~ ~ 1 1`)
}

// The alert headline to show in the action bar now, or null once its window
// has closed. Called by wave_status.js and wave_spawner.js.
function pedestalAlertActionbarText(data, now) {
  if (!data.contains('td_pedestalAlertUntilTick')) return null
  if (now >= data.getInt('td_pedestalAlertUntilTick')) return null
  return data.getString('td_pedestalAlertText')
}

// Particles and a sound at the pedestal for every heal.
function firePedestalHealEffect(server, x, y, z) {
  server.runCommandSilent(`particle minecraft:totem_of_undying ${x} ${y + 1} ${z} 0.4 0.5 0.4 0.02 30`)
  server.runCommandSilent(`playsound minecraft:block.beacon.power_select block @a ${x} ${y} ${z} 1 1`)
}

// Adds `amount` HP, capped at the current max, and returns whether it did.
// Does nothing for a destroyed pedestal or one not built yet. Lowers
// td_pedestalAlertTier to match the new health, so a later attack can alert
// again. pedestal_upgrades.js calls this directly when Max HP goes up.
function healPedestalBy(player, data, amount) {
  if (data.getBoolean('td_pedestalDestroyed')) return false
  if (!data.contains('td_pedestalHealth')) return false
  var current = data.getInt('td_pedestalHealth')
  if (current <= 0) return false
  var maxHealth = pedestalMaxHealth(data)
  var newHealth = Math.min(maxHealth, current + amount)
  data.putInt('td_pedestalHealth', newHealth)
  var newTier = pedestalAlertTierForHealth(newHealth, maxHealth)
  if (newTier < data.getInt('td_pedestalAlertTier')) {
    data.putInt('td_pedestalAlertTier', newTier)
  }
  var px = data.getInt('td_pedestalX')
  var py = data.getInt('td_pedestalY')
  var pz = data.getInt('td_pedestalZ')
  updatePedestalBossbar(player.getServer(), newHealth, px, pz)
  firePedestalHealEffect(player.getServer(), px, py, pz)
  return true
}

// Heals `percent` (a fraction, 0.1 = 10%) of the current max HP, upgrades
// included. wave_status.js calls it on every wave clear.
function healPedestalByPercent(player, data, percent) {
  return healPedestalBy(player, data, Math.round(pedestalMaxHealth(data) * percent))
}

// Right-click heal items; `percent` is a fraction of max HP. The upgrade
// screen's lore (fillPedestalGui in pedestal_upgrades.js) describes these,
// so keep the two in step.
var PEDESTAL_HEAL_ITEMS = {
  'minecraft:golden_carrot': { percent: 0.1, message: "§d[Pedestal] §fThe carrot's glow seeps into the stone. It holds a little steadier." },
  'minecraft:nether_star': { percent: 1.0, message: '§d[Pedestal] §fSomething ancient answers. The pedestal is whole again.' },
}

// Right-clicking the pedestal with a heal item heals it on the spot, with or
// without the amulet on it, and the item never goes on the stand. The
// pedestal's own interaction (Moonlight's ItemDisplayTile.interact) also runs
// on the client, so the clicking client has already put the item on the
// stand when the server cancels the click; pedestalHealClickResync() corrects
// that client, so at worst the item shows on the stand for one round trip.
//
// Main hand only: Supplementaries only places from the main hand, and the
// off-hand event for the same click must not heal again. The block must be
// the stored pedestal, since other Supplementaries pedestals can be placed
// anywhere. event.cancel() throws in this KubeJS build, ending the handler,
// so it comes last.
BlockEvents.rightClicked('supplementaries:pedestal', (event) => {
  if (`${event.getHand()}` !== 'MAIN_HAND') return
  var heal = PEDESTAL_HEAL_ITEMS[`${event.item.id}`]
  if (!heal) return

  var player = event.entity
  var level = player.getLevel()
  var data = worldData(level)
  if (!data || !data.contains('td_pedestalX')) return
  var block = event.getBlock()
  if (block.getX() !== data.getInt('td_pedestalX') || block.getY() !== data.getInt('td_pedestalY') || block.getZ() !== data.getInt('td_pedestalZ')) return

  // The stored pedestal and a heal item: from here the item never goes on the
  // stand, healed or not. Nothing is used up at full health or on a fallen
  // pedestal.
  var health = data.getInt('td_pedestalHealth')
  if (data.getBoolean('td_pedestalDestroyed') || (data.contains('td_pedestalHealth') && health <= 0)) {
    player.notify('§d[Pedestal] §fThere is nothing left here to mend.')
  } else if (!data.contains('td_pedestalHealth') || health >= pedestalMaxHealth(data)) {
    player.notify('§d[Pedestal] §fThe pedestal is already whole.')
  } else if (healPedestalByPercent(player, data, heal.percent)) {
    if (!player.isCreative()) event.item.shrink(1)
    player.notify(heal.message)
  }
  pedestalHealClickResync(player, block)
  event.cancel()
})

// Puts the clicking client back in step with the server after a cancelled
// click on the stand: setChanged() makes Moonlight's ItemDisplayTile send a
// block update with the stand's contents, and sendAllDataToRemote() resyncs
// the player's inventory. Also used by pedestal_upgrades.js. Each step has
// its own try, so a failure can't skip the caller's event.cancel().
function pedestalHealClickResync(player, block) {
  try {
    var tile = block.getEntity()
    if (tile) tile.setChanged()
  } catch (e) {
    console.error(`pedestal_health.js: pedestal resync after a heal click failed (${e})`)
  }
  try {
    player.containerMenu.sendAllDataToRemote()
  } catch (e) {
    console.error(`pedestal_health.js: inventory resync after a heal click failed (${e})`)
  }
}

// The mob's generic.attack_damage, so tougher mobs chip faster.
function pedestalAttackDamage(mob) {
  try {
    var attr = mob.getAttribute('minecraft:generic.attack_damage')
    if (attr) return attr.getValue()
  } catch (e) {
    // An unreadable attribute counts as 0 damage instead of failing the check.
  }
  return 0
}

// Once a second, while any player is in the pedestal's dimension: total the
// damage from roster mobs in range, apply the armor and thorns upgrades, then
// update HP, the bossbar and the alerts.
PlayerEvents.tick((event) => {
  var player = event.entity
  var level = player.getLevel()
  var data = worldData(level)
  if (!data) return

  // Nothing to do once the run is over, or before playtest_starter_kit.js has
  // built the base and set td_pedestalHealth. After a hardcore game over the
  // leftover horde would otherwise wear the pedestal down and end the run a
  // second time.
  if (data.getBoolean('td_pedestalDestroyed') || data.getBoolean('td_hardcoreGameOver')) return
  if (!data.contains('td_pedestalHealth')) return

  var now = level.getTime()
  if (now % 20 !== 0) return
  // PlayerEvents.tick fires for every online player, and all of them pass the
  // % 20 check on the same tick. Stamping the tick in the shared state applies
  // damage once a second rather than once per player. getLong() and getTime()
  // return Java longs, hence Number() on both sides.
  if (data.contains('td_pedestalDamageTick') && Number(data.getLong('td_pedestalDamageTick')) === Number(now)) return
  data.putLong('td_pedestalDamageTick', now)

  var x = data.getInt('td_pedestalX') + 0.5
  var y = data.getInt('td_pedestalY') + 0.5
  var z = data.getInt('td_pedestalZ') + 0.5

  ensurePedestalBossbar(player.getServer(), data)

  var damage = 0
  var attackers = []
  level.getEntities().forEach((e) => {
    // By type, not by the td_wave_mob tag: any roster mob at the pedestal
    // damages it, wave-spawned or not.
    if (!WAVE_MOB_TYPES.includes(`${e.type}`)) return
    // A killed mob stays in the level for its 20-tick death animation.
    if (e.getHealth() <= 0) return
    var dx = e.getX() - x
    var dy = e.getY() - y
    var dz = e.getZ() - z
    if (dx * dx + dy * dy + dz * dz > PEDESTAL_MELEE_RANGE_SQ) return
    damage += pedestalAttackDamage(e)
    attackers.push(e)
  })
  if (damage <= 0) {
    updatePedestalBossbar(player.getServer(), data.getInt('td_pedestalHealth'), data.getInt('td_pedestalX'), data.getInt('td_pedestalZ'))
    return
  }

  // Armor cuts each second's total by its fraction, never below 1, so an
  // attacking horde always chips it. Thorns hits every mob in range with its
  // tier's damage once a second, as the minecraft:thorns damage type.
  damage = Math.max(1, Math.round(damage * (1 - pedestalArmorForTier(pedestalUpgradeTier(data, 'armor')))))
  var thorns = pedestalThornsForTier(pedestalUpgradeTier(data, 'thorns'))
  if (thorns > 0) {
    attackers.forEach((e) => {
      player.getServer().runCommandSilent(`damage ${e.uuid} ${thorns} minecraft:thorns`)
      player.getServer().runCommandSilent(`particle minecraft:enchanted_hit ${e.getX()} ${e.getY() + e.getBbHeight() / 2} ${e.getZ()} 0.2 0.3 0.2 0.1 6`)
    })
  }

  var health = data.getInt('td_pedestalHealth') - damage
  if (health > 0) {
    data.putInt('td_pedestalHealth', health)
    updatePedestalBossbar(player.getServer(), health, data.getInt('td_pedestalX'), data.getInt('td_pedestalZ'))
    var newAlertTier = pedestalAlertTierForHealth(health, pedestalMaxHealth(data))
    if (newAlertTier > data.getInt('td_pedestalAlertTier')) {
      data.putInt('td_pedestalAlertTier', newAlertTier)
      firePedestalAlert(player.getServer(), data, newAlertTier, level.getTime())
    }
    return
  }

  // Out of HP: the final alert fires whatever td_pedestalAlertTier says, then
  // the run ends.
  firePedestalAlert(player.getServer(), data, 4, level.getTime())
  data.putInt('td_pedestalHealth', 0)

  // Break the block itself (setblock's destroy mode, as if mined) so the world
  // matches the fallen state.
  var bx = data.getInt('td_pedestalX')
  var by = data.getInt('td_pedestalY')
  var bz = data.getInt('td_pedestalZ')
  player.getServer().runCommandSilent(`setblock ${bx} ${by} ${bz} minecraft:air destroy`)
  player.getServer().runCommandSilent(`bossbar remove ${PEDESTAL_BOSSBAR_ID}`)

  triggerPedestalDestroyed(player) // pedestal_destruction.js
})
