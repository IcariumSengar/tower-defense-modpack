// Boomer Zombie block-destroying explosion (2026-09-08, direct ask: "have
// the boomer zombies be able to blow up blocks as well, like a creeper").
//
// Decompiled Zombies More's own classes directly, not guessed. On death/
// player-collision, `zombiesmore:boomer_zombie` discards itself and spawns
// `zombiesmore:boomer_charged` in its place (BoomerZombiePlayerCollidesWithThisEntityProcedure,
// called from BoomerZombieEntity's own die() too). That charged entity has
// no explosion logic of its own in its tick loop - the actual detonation
// is queued via ZombiesmoreMod.queueServerWork at fixed 80/85/90-tick
// delays from the moment it spawns (BoomerChargedOnInitialEntitySpawnProcedure):
// at +80 it calls a real `level.explode(null, x, y, z, 4.0f,
// Level.ExplosionInteraction.NONE)` (explosion sound/knockback/damage,
// but NONE means zero block destruction - a deliberate mod-author choice,
// hardcoded, no config exists) plus a poison area_effect_cloud; at +85 it
// gives XP and discards itself; at +90 it drops loot. All of this already
// works and is left untouched.
//
// This adds a second, independent, real block-destroying explosion
// (vanilla 0-fuse TNT - same "prefer a real vanilla command over an
// unverified KubeJS Level.explode call" idiom already used throughout
// this codebase) timed to the same +80-tick mark, at the same captured
// spawn position the mod's own detonation uses (it also fixes its
// position at boomer_charged's spawn moment, not wherever it wanders to
// during the fuse - matched here for the same reason, not a deviation),
// so it reads as one explosion with real block damage, not two separate
// events. TNT's own explosion power (~4) matches the mod's own 4.0f.
// Reinforced SecurityCraft walls stay explosion-immune regardless (same
// as every other explosive threat in this pack) - only soft, unreinforced
// builds are actually at risk.
var pendingBoomerExplosions = [] // {x,y,z,tick}
var BOOMER_EXPLOSION_DELAY_TICKS = 80

EntityEvents.spawned((event) => {
  var entity = event.entity
  if (`${entity.type}` !== 'zombiesmore:boomer_charged') return
  pendingBoomerExplosions.push({
    x: entity.getX(),
    y: entity.getY(),
    z: entity.getZ(),
    tick: event.level.getTime() + BOOMER_EXPLOSION_DELAY_TICKS,
  })
})

PlayerEvents.tick((event) => {
  if (pendingBoomerExplosions.length === 0) return

  var player = event.entity
  var currentTick = player.getLevel().getTime()
  var server = player.getServer()
  var stillPending = []

  pendingBoomerExplosions.forEach((boom) => {
    if (currentTick < boom.tick) {
      stillPending.push(boom)
      return
    }
    server.runCommandSilent(`summon minecraft:tnt ${boom.x} ${boom.y} ${boom.z} {Fuse:0}`)
  })

  pendingBoomerExplosions = stillPending
})
