// Tier 1 defensive machines (docs/IDEAS.md's Machine Progression design
// notes) - the first slice of the "loot -> craft machines -> survive"
// loop this pack is named for. No machine blocks existed before this.
//
// Built in the requested easiest-first order: Wooden Palisade (this
// file), Simple Snare Trap (no new block needed - see
// machine_recipes.js, it's a themed recipe for vanilla cobweb, not a
// custom block), Spike Trap (this file, the genuinely novel one).
//
// Reuses existing vanilla textures via .textureAll()/.texture() rather
// than hand-authoring new art - first time this pack has registered a
// custom BLOCK (only items so far: loot bags, Wave Horn), but texture
// reuse keeps the actual new-content risk to block registration itself,
// not art production too.
//
// Spike Trap's trigger logic rebuilt 2026-08-19->2026-08-29's original
// implementation (formerly a separate server_scripts/spike_trap.js,
// deleted) only ever checked the PLAYER's own position via
// PlayerEvents.tick - a real implementation gap, not a design-doc
// ambiguity (docs/IDEAS.md's Machine Progression list is unambiguous:
// every Tier 1 entry, Palisade/Funnel Walls/Snare Trap included, is
// about shaping/hurting the ATTACKER). Rebuilt using KubeJS's own
// purpose-built block callback instead of a tick-poll: BlockBuilder
// has a real .steppedOn(callback) method ("Set what happens when an
// entity steps on the block", confirmed by extracting and reading
// dev/latvian/mods/kubejs/block/BlockBuilder.class directly from the
// installed KubeJS jar, not guessed or assumed from docs) that fires
// for ANY entity - player or mob - stepping on this specific block,
// no separate block-ID check needed since it's registered directly on
// the block itself.

StartupEvents.registry('block', (event) => {
  // Wooden Palisade - a themed fence block, not vanilla oak_fence
  // reused directly, so it has its own identity for crafting/future
  // Tier 1 "degrades from overuse" balance work. KubeJS's built-in
  // 'fence' block type gives real vanilla fence behavior for free
  // (connects to neighbors, blocks most mob pathing, spiders/flying
  // mobs still cross - same as any vanilla fence) - no custom collision
  // logic needed, matching how low-risk this piece is meant to be.
  // Oak log's own texture (not oak_planks) for a "raw timber stakes"
  // look distinct from a plank fence.
  event.create('wooden_palisade', 'fence')
    .displayName('Wooden Palisade')
    .textureAll('minecraft:block/oak_log')
    .tagBlock('minecraft:mineable/axe')
    .hardness(2.0)
    .resistance(3.0)

  // Spike Trap - the genuinely novel one. "hits" is a custom integer
  // blockstate (0-3) - Java.loadClass is a real, standard Rhino/KubeJS
  // capability for reaching arbitrary Minecraft/Forge classes, first
  // time this pack has used it, but well-documented, not a guess.
  //
  // Damage-on-contact + the hit-counter degrade are both handled right
  // here via .steppedOn(...), chained onto the same builder that
  // creates the block - KubeJS invokes this callback later, during
  // real gameplay, every time it later fires; this isn't run at
  // registration time despite being written inside StartupEvents.
  //
  // Deliberately still avoids READING the "hits" property's current
  // value from script code - genuinely unconfirmed whether/how that's
  // possible, and unnecessary either way: the degrade sequence runs as
  // a chain of `/execute if block ... [hits=N] run setblock ...
  // [hits=N+1]` commands, standard vanilla conditional-command syntax
  // with zero KubeJS-specific uncertainty on that part. Only one
  // command in the chain can ever match the block's true state, so
  // running all of them every trigger is harmless, not a bug.
  //
  // Per-trigger cooldown is tracked by BLOCK POSITION, not by which
  // specific entity stepped on it - deliberate choice, not a shortcut.
  // KubeJS's own persistentData is confirmed players/levels/servers
  // only (kubejs.com/wiki/tips/persistent-data), not available on a
  // generic mob; reliably identifying "is this the same specific mob
  // as last tick" would need an entity UUID accessor never used or
  // confirmed anywhere in this pack. spikeTrapLastTrigger (below) is a
  // plain module-scope object, same persists-for-the-server-session
  // pattern already proven by wave_spawner.js's pendingSpawns array.
  // The tradeoff: two different entities stepping on the same trap
  // within the same second only count as one trigger - a reasonable
  // read for a physical trap that just went off, not a real gap.
  //
  // Guards on `!entity.getServer()` rather than checking
  // `level.isClientSide` - confirmed elsewhere in this pack that merely
  // *accessing* isClientSide throws a NullPointerException in this
  // environment, independent of how it's used. getServer() returns
  // null client-side (a server only exists server-side) without that
  // problem, so a plain null-check gets the same "server-only" guard
  // through a path already known to be safe.
  //
  // Uses `var`, not `const`/`let`, inside the callback body - this is a
  // new-to-this-pack callback type, never confirmed safe with
  // block-scoped declarations the way PlayerEvents.tick has been;
  // ItemEvents.rightClicked/BlockEvents.rightClicked both threw
  // "redeclaration of var X" with const/let on repeat invocations
  // elsewhere in this pack, so `var` is the safe default until proven
  // otherwise here specifically.
  const $IntegerProperty = Java.loadClass('net.minecraft.world.level.block.state.properties.IntegerProperty')
  const SPIKE_TRAP_DAMAGE = 4 // 2 hearts - Tier 1, meant to deter/chip, not one-shot
  const SPIKE_TRAP_MAX_HITS = 3 // block breaks on the 4th trigger (hits 0->1->2->3->broken)
  const SPIKE_TRAP_COOLDOWN_TICKS = 20 // 1 second
  const spikeTrapLastTrigger = {}

  // Actual spike shape added 2026-08-29 - direct feedback that the
  // block just looked like a plain textured cube, not spikes. Real
  // pointed geometry isn't possible (Minecraft block models are only
  // ever rectangular boxes, no true cone/pyramid tip), so this is a
  // low, thin base plate plus 5 short square prongs of varying height
  // clustered on top - a "bed of nails"/caltrop read rather than tall
  // dramatic pikes. Kept deliberately short (max height 8/16 = 0.5
  // blocks): vanilla mobs only auto-step up terrain shorter than 0.6
  // blocks without jumping, so anything taller risked the spikes
  // physically blocking mobs from walking onto the trap at all -
  // turning a "step on it, take damage" trap into an accidental wall,
  // exactly the opposite of Tier 1's purpose. A taller, more dramatic
  // spike shape stays available for a possible future Tier 2
  // "Reinforced Spikes" upgrade (already named in docs/IDEAS.md's
  // Machine Progression notes) without this one needing to change.
  //
  // .box(x0,y0,z0, x1,y1,z1, true) sets a cuboid in 0-16 units: called
  // repeatedly, each call adds one box to the block's shape rather than
  // replacing the last (confirmed from kubejs.com/wiki/ref/BlockBuilder
  // and cross-checked against BlockBuilder.class itself, which unions
  // every box together via Shapes.or(...) for the final collision
  // shape). Existing .texture()/.textureAll() calls below still apply
  // per face DIRECTION across every generated box, not per-box, so the
  // spikes automatically pick up the same cobblestone/iron_block
  // theming as the base without extra texture work.
  //
  // .fullBlock(false) is required alongside custom .box() shapes -
  // confirmed necessary from the wiki's own custom-block guidance (a
  // block still flagged "full cube" internally after its actual shape
  // stops being one causes wrong light/face-culling behavior against
  // neighboring blocks).
  //
  // Genuinely unconfirmed until an actual playtest: whether .box()
  // alone really does drive BOTH the visual model and the collision
  // shape the way the bytecode suggests (BlockBuilder's own
  // generateBlockModelJsons method, shared with the block types that
  // definitely do this), since KubeJS's own wiki text claims the
  // opposite - that .box() sets collision only and a hand-authored
  // model JSON is still needed for the visual. If the block renders as
  // a plain cube in-game despite this, that wiki claim was the
  // accurate one and a real custom model file is the next step, not
  // more guessing at box() alone.
  event.create('spike_trap', 'basic')
    .displayName('Spike Trap')
    .textureAll('minecraft:block/cobblestone')
    .texture('up', 'minecraft:block/iron_block')
    .tagBlock('minecraft:mineable/pickaxe')
    .hardness(2.5)
    .resistance(4.0)
    .fullBlock(false)
    .box(0, 0, 0, 16, 1, 16, true)
    .box(2, 1, 2, 5, 5, 5, true)
    .box(11, 1, 2, 14, 6, 5, true)
    .box(2, 1, 11, 5, 5, 14, true)
    .box(11, 1, 11, 14, 7, 14, true)
    .box(6, 1, 6, 10, 8, 10, true)
    .property($IntegerProperty.create('hits', 0, 3))
    .steppedOn((stepEvent) => {
      var entity = stepEvent.getEntity()
      var server = entity.getServer()
      if (!server || !entity.isLiving()) return

      var pos = stepEvent.getPos()
      var key = `${pos.getX()},${pos.getY()},${pos.getZ()}`
      var currentTick = stepEvent.getLevel().getTime()

      if (spikeTrapLastTrigger[key] !== undefined && currentTick - spikeTrapLastTrigger[key] < SPIKE_TRAP_COOLDOWN_TICKS) return
      spikeTrapLastTrigger[key] = currentTick

      entity.setHealth(Math.max(0, entity.getHealth() - SPIKE_TRAP_DAMAGE))

      var posStr = `${pos.getX()} ${pos.getY()} ${pos.getZ()}`
      for (var h = 0; h < SPIKE_TRAP_MAX_HITS; h++) {
        server.runCommandSilent(`execute if block ${posStr} kubejs:spike_trap[hits=${h}] run setblock ${posStr} kubejs:spike_trap[hits=${h + 1}]`)
      }
      // The (SPIKE_TRAP_MAX_HITS)th hit breaks the trap entirely rather
      // than advancing to one final blockstate - a broken trap should
      // actually be gone, not just visually maxed-out with no further
      // effect.
      server.runCommandSilent(`execute if block ${posStr} kubejs:spike_trap[hits=${SPIKE_TRAP_MAX_HITS}] run setblock ${posStr} minecraft:air`)
    })
})
