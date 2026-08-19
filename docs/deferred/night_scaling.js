// Night-based mob scaling.
//
// Epic Siege Mod handles AI behavior (digging, sniping, wall-breaching) and
// Pure Suffering handles tiered invasion events — neither touches raw mob
// stats. This is the piece only custom glue can provide: hostile mobs get
// tougher as nights pass, so surviving night 15 is a different fight than
// night 1 even before either of those mods' own escalation kicks in.
//
// FIRST DRAFT — the attribute-modification call below is KubeJS's least
// documented corner (their own wiki has this page unwritten as of writing
// this). If /reload logs an error on this file, paste the console output
// back and it's a quick fix, not a redesign.

const NIGHT_HEALTH_BONUS = 0.15 // +15% max health per night survived
const NIGHT_DAMAGE_BONUS = 0.1 // +10% attack damage per night survived
const MAX_NIGHTS_SCALED = 20 // escalation caps here — tune once playtested

const HOSTILE_TYPES = [
  'minecraft:zombie',
  'minecraft:husk',
  'minecraft:drowned',
  'minecraft:skeleton',
  'minecraft:spider',
  'minecraft:creeper',
]

EntityEvents.spawned((event) => {
  const { entity, level } = event
  if (!HOSTILE_TYPES.includes(`${entity.type}`)) return

  const nightsPassed = Math.min(Math.floor(level.getDayTime() / 24000), MAX_NIGHTS_SCALED)
  if (nightsPassed <= 0) return

  const healthAttr = entity.getAttribute('minecraft:generic.max_health')
  const damageAttr = entity.getAttribute('minecraft:generic.attack_damage')

  if (healthAttr) {
    healthAttr.baseValue *= 1 + NIGHT_HEALTH_BONUS * nightsPassed
    entity.setHealth(entity.getMaxHealth())
  }
  if (damageAttr) {
    damageAttr.baseValue *= 1 + NIGHT_DAMAGE_BONUS * nightsPassed
  }
})
