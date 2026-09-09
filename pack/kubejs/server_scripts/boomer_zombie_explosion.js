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
  var x = entity.getX()
  var y = entity.getY()
  var z = entity.getZ()
  pendingBoomerExplosions.push({ x: x, y: y, z: z, tick: event.level.getTime() + BOOMER_EXPLOSION_DELAY_TICKS })

  // Armed warning (2026-09-09, direct answer to real playtest feedback:
  // "I can't seem to be able to actually hit the mob" trying to kill it
  // before it explodes). Decompiled BoomerChargedEntity.hurt() directly -
  // once this entity exists, it unconditionally blocks ALL player-sourced
  // damage (melee AND arrows), plus thrown potions, area-effect clouds,
  // and even explosion damage (DamageTypes.EXPLOSION is in its own
  // exclusion list, so a TNT trick doesn't work either) - there is no way
  // to stop this once it's armed, by the mod's own design, not a bug on
  // this pack's side. Checked whether a KubeJS-side fix could intercept
  // the player's attack before hurt() ever runs: no event in this exact
  // KubeJS build fires early enough (EntityEvents.hurt itself never fires
  // for this case either, since hurt()'s own override returns false
  // before ever calling super.hurt(), which is what would normally raise
  // it), and reaching Forge's own pre-hurt AttackEntityEvent via raw
  // event-bus reflection hits the same functional-interface-coercion
  // wall this codebase already documented for mob_aggro.js. Direct
  // answer: don't try to make it stoppable, make the "you can't stop
  // this, move" moment clear and immediate instead, right at the exact
  // tick it becomes unstoppable (this handler already captures that exact
  // moment for the explosion queue above).
  var server = event.level.getServer()
  server.runCommandSilent(`title @a title {"text":"ARMED","color":"red","bold":true}`)
  server.runCommandSilent(`title @a subtitle {"text":"You cannot stop this one - move.","color":"gray"}`)
  server.runCommandSilent(`playsound minecraft:entity.tnt.primed master @a ${x} ${y} ${z} 1 1`)
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
