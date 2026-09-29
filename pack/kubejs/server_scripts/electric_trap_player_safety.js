// Stops the Tesla Coil and the electrified fence from hurting players and
// SecurityCraft Sentries. The pack's patched Immersive Engineering jar
// already keeps both out of the coil's target list; this covers an unpatched
// jar, where the coil zaps a random LivingEntity in range, Sentries included.
// The fence has no such patch: it spares only its owner and allowlisted
// players, so this script is its only guard.
//
// getSource().getType() is the damage type's message_id: ieTesla (the coil's
// zap), ieTeslaPrimary (the Float.MAX_VALUE shock from sneak-using a
// screwdriver on a powered coil) and securitycraft.electricity (the fence).
var ELECTRIC_TRAP_DAMAGE_TYPES = ['ieTesla', 'ieTeslaPrimary', 'securitycraft.electricity']
var ELECTRIC_TRAP_IMMUNE_TYPES = ['minecraft:player', 'securitycraft:sentry']
var TESLA_STUN_DAMAGE_TYPES = ['ieTesla', 'ieTeslaPrimary']

// IEPotions.STUNNED is a RegistryObject<MobEffect>; resolveClass() from
// playtest_starter_kit.js loads the class by name.
var teslaStunnedEffect = null
function getTeslaStunnedEffect(anyObj) {
  if (teslaStunnedEffect) return teslaStunnedEffect
  var ieCls = resolveClass(anyObj, 'blusunrize.immersiveengineering.common.register.IEPotions')
  var registryObject = ieCls.getField('STUNNED').get(null)
  teslaStunnedEffect = registryObject.get()
  return teslaStunnedEffect
}

EntityEvents.hurt((event) => {
  var entity = event.getEntity()
  if (!ELECTRIC_TRAP_IMMUNE_TYPES.includes(`${entity.type}`)) return
  var sourceType = `${event.getSource().getType()}`
  if (!ELECTRIC_TRAP_DAMAGE_TYPES.includes(sourceType)) return
  event.cancel()
  // The coil applies Stunned before it deals damage, so cancelling the hit
  // leaves the stun. Strip it in the same tick.
  if (!TESLA_STUN_DAMAGE_TYPES.includes(sourceType)) return
  try {
    entity.removeEffect(getTeslaStunnedEffect(entity))
  } catch (e) {
    console.error(`electric_trap_player_safety.js: failed to strip Tesla Coil's Stunned effect (${e})`)
  }
})
