// Field tests: the optional diamond quests in the campaign that tick over when
// a defence does the killing (quest book v4, 2026-10-05). Each wave-mob death
// is credited to one defence by its damage type, read the same way as in
// bounty_kills.js; spike kills are the deaths of mobs still slowed by a Spike
// Trap (Slowness III from wave_mob_spike_slow.js), whatever finished them.
// The counts live on the world-state marker (td_ft_<key>), and the quest
// completes for everyone through quest_milestones.js when a count reaches
// its target. The Sentry has no field test: its bullets carry plain arrow
// damage, the same as the players' guns.

var FIELD_TESTS = {
  ft_fence: { types: ['securitycraft:electricity'], target: 10 },
  ft_tesla: { types: ['immersiveengineering:tesla', 'immersiveengineering:tesla_primary'], target: 10 },
  ft_gunturret: {
    types: ['immersiveengineering:revolver_casull_turret', 'immersiveengineering:revolver_armorpiercing_turret', 'immersiveengineering:revolver_buckshot_turret'],
    target: 25,
  },
  ft_omt: { types: ['omtreborn:turret_normal', 'omtreborn:turret_bypass'], target: 25 },
}
var FIELD_TEST_SPIKES_TARGET = 10
var FIELD_TEST_SPIKE_SLOW_AMPLIFIER = 2 // the Spike Trap's Slowness III

function fieldTestDamageType(source) {
  try {
    return `${source.typeHolder().unwrapKey().get().location()}`
  } catch (e) {
    return null
  }
}

function fieldTestSlowedBySpikes(entity) {
  try {
    var slow = entity.potionEffects.getActive('minecraft:slowness')
    return !!slow && slow.getAmplifier() >= FIELD_TEST_SPIKE_SLOW_AMPLIFIER
  } catch (e) {
    return false
  }
}

function fieldTestCount(server, data, key, target) {
  if (data.getBoolean('td_q_' + key)) return
  var count = data.getInt('td_ft_' + key) + 1
  data.putInt('td_ft_' + key, count)
  if (count >= target) qmCompleteShared(server, data, key)
}

EntityEvents.death((event) => {
  var entity = event.entity
  if (!entity.getTags().contains('td_wave_mob')) return
  var data = worldData(event.level)
  if (!data) return
  var server = event.level.getServer()
  if (fieldTestSlowedBySpikes(entity)) fieldTestCount(server, data, 'ft_spikes', FIELD_TEST_SPIKES_TARGET)
  var type = fieldTestDamageType(event.source)
  if (type === null) return
  Object.keys(FIELD_TESTS).forEach((key) => {
    var test = FIELD_TESTS[key]
    if (test.types.includes(type)) fieldTestCount(server, data, key, test.target)
  })
})
