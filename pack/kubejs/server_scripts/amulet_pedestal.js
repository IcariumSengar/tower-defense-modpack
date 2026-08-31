// The amulet pedestal — **reversed 2026-09-01** (docs/FEATURES.md, "The
// amulet": "the pedestal is pre-built, the amulet is crafted"). The
// pedestal is now placed directly by playtest_starter_kit.js's base
// build, in a shrine nook near the grave markers, as part of the
// *original* structure layer — nothing depends on the player ever
// crafting one. Its own recipe (below) stays as a fallback/spare in
// case the block is somehow lost, not because progress requires it.
// Needed zero changes to the interaction logic below to support this —
// state already lived on the player (td_amuletWorn/td_amuletOnPedestal),
// not the block, so it never cared how the block got placed.
//
// Recipe uses gold ingots (Uncommon-tier loot pool, see
// loot_bag_open.js) + sandstone — switched from stone_bricks 2026-08-30
// to match the pedestal's new shrine model/textures (amulet.js), which
// went sandstone-toned to tie into the desert world and the amulet's
// own gold palette. No recipe was pinned down in FEATURES.md, this is
// an implementation-level pick, not a design decision needing sign-off.
//
// Right-click interaction is the actual "place the amulet on it" and
// "take it back" mechanic. State lives on the player's persistentData
// (td_amuletWorn / td_amuletOnPedestal), not the block — see amulet.js's
// comment on why. Uses player.findFirstCurio(...) / .setEquippedCurio(...)
// (KubeJS-Curios' LivingEntity mixin methods, confirmed from its source —
// see amulet.js) rather than the onEquip/onUnequip capability callbacks,
// since this is a deliberate script-driven move, not the player using
// Curios' own equip GUI. Placing it accepts the amulet from wherever the
// player actually has it (worn OR just in inventory/hand), using
// player.inventory.find()/.extractItem() (KubeJS's InventoryKJS mixin,
// confirmed by decompiling kubejs-forge's own .class file directly) for
// the non-worn case — real bug found in playtesting (2026-08-31), see
// the interaction handler's own comment below for the full story.
//
// Marker entity for mob targeting (docs/FEATURES.md's "real technical
// detail, not hand-waved": vanilla mobs can only setTarget() an entity,
// not a bare block position) is a summoned, invisible, gravity-less,
// Marker-tagged armor stand — the standard vanilla trick, spawned/killed
// via command rather than KubeJS's own entity-spawn API, matching this
// codebase's established preference for command-based world changes
// (playtest_starter_kit.js, wave_spawner.js) over less-proven direct API
// calls. server_scripts/mob_aggro.js targets it by the td_amulet_marker
// tag while td_amuletOnPedestal is true.
//
// Marker now visibly holds the amulet (2026-08-30, direct request -
// "the amulet looks like it's hovering above it"), via the summon
// command's HandItems. Real, confirmed vanilla behavior, not assumed:
// Marker:1b removes the armor stand's own hitbox/body model entirely,
// but held items still render regardless — a standard, well-documented
// "floating item" trick (distinct from just Invisible:1b, which keeps
// a hitbox).
//
// Re-offset 2026-08-31, real bug found in playtesting: the original y+1
// spawn height was wrong — a held item on an armor stand doesn't render
// at the entity's feet, it renders up near hand/shoulder height (a
// standing armor stand is ~1.975 blocks tall, hand position sits well
// above half that), so a feet-at-dais-top spawn put the actual visible
// amulet floating a full extra body-height above the shrine, nowhere
// near the ~11/16-tall dais it's meant to sit on. Two changes: added
// `Small:1b` (a real vanilla armor stand tag - halves the whole model
// including the hand's height above the feet, not just its visual
// size), and dropped the feet spawn height to just above the dais
// surface instead of a full block up, so the now-smaller hand offset
// lands the item close to the dais rather than far above it. Exact
// final height is a reasoned estimate, not pixel-measured (no GUI
// access to check this by eye) - correct on the next real playtest if
// it still reads wrong, same as the original y+1 guess needed to be.
//
// Bob added same day (direct request - "doesn't hover/bob"): the
// marker's base position is stored on the player
// (td_amuletMarkerBaseX/Y/Z) when placed, and a throttled
// PlayerEvents.tick handler below re-teleports it through a small sine
// wave around that base Y - same "store state on the player, drive it
// from a tick handler" pattern already used throughout this pack
// (mob_aggro.js, wave_status.js), no new mechanism introduced.
//
// Not yet confirmed in-game.

ServerEvents.recipes((event) => {
  event.shaped('kubejs:amulet_pedestal', [
    'GGG',
    'GSG',
    'GGG',
  ], {
    G: 'minecraft:gold_ingot',
    S: 'minecraft:sandstone',
  })

  // New 2026-09-01, part of the pedestal/amulet reversal above - the
  // amulet previously had no recipe at all (only ever given
  // programmatically at login). Hollow gold ring, matching "Not Just
  // Jewelry"'s revised flavor text ("melt what gold you can spare and
  // see what comes of it") - plain gold_ingot only, no invented
  // material, Uncommon-tier per loot_bag_open.js same as the pedestal's
  // own recipe above.
  event.shaped('kubejs:amulet', [
    'GGG',
    'G G',
    'GGG',
  ], {
    G: 'minecraft:gold_ingot',
  })
})

// Bob amplitude/period - gentle by design, a subtle float rather than an
// obvious bounce. Throttled to every 2 ticks (10x/second) - smooth
// enough for a slow sine wave, cheaper than every tick.
var BOB_AMPLITUDE = 0.08
var BOB_PERIOD_TICKS = 60

// Real bug found in playtesting (2026-08-31): placing the amulet on the
// pedestal never actually let the player cross the border - "can't
// cross either way." Root cause: amulet_border.js's own tick handler
// was already correctly skipping ITS push-back while td_amuletOnPedestal
// is true, but that was never the thing blocking movement in the first
// place - vanilla's OWN worldborder physically blocks player movement
// on its own (confirmed elsewhere in this pack, see wave_spawner.js's
// spawn-position comments: "the border only clamps *player* movement"),
// completely independent of any KubeJS script. Nothing was ever
// disabling THAT. Fixed by actually resizing the real border: expand it
// by a large fixed delta when the amulet goes on the pedestal, shrink by
// the same fixed delta when it comes back off. Using a fixed delta
// (rather than snapshot-and-restore an absolute size) means this stays
// correct even if base_expansion.js grows the border for an unrelated
// wave-clear while the amulet happens to be away - reading the border's
// real current size at both ends and only ever adding/subtracting the
// same constant preserves whatever real growth happened in between,
// nothing is silently lost or reset.
var BORDER_EXPAND_DELTA = 10000000

BlockEvents.rightClicked('kubejs:amulet_pedestal', (event) => {
  var player = event.player
  var level = player.getLevel()
  var data = player.persistentData
  var x = event.block.getX() + 0.5
  // Feet spawn height: just above the dais surface (top at 11/16 of a
  // block - see amulet_pedestal.json's model), not a full block up. The
  // Small marker's hand-held item renders somewhat above this, landing
  // near the dais rather than a full body-height above it.
  var y = event.block.getY() + 0.7
  var z = event.block.getZ() + 0.5

  if (data.getBoolean('td_amuletOnPedestal')) {
    data.putBoolean('td_amuletOnPedestal', false)
    // Returns to inventory unequipped, not auto-re-equipped - consistent
    // with the amulet no longer auto-equipping at login either (see
    // playtest_starter_kit.js) after the duplication bug that caused.
    // Player can re-equip from their Curios tab if they want the buffs
    // back before their next trip to the pedestal.
    player.give(Item.of('kubejs:amulet', 1))
    player.getServer().runCommandSilent('kill @e[type=minecraft:armor_stand,tag=td_amulet_marker]')
    // Shrink the real border back down by the same fixed delta it was
    // expanded by below - see BORDER_EXPAND_DELTA's comment. If the
    // player is currently standing beyond the real (shrunk-back) edge,
    // amulet_border.js's own tick handler picks that up on its next
    // check and pushes them back in - same intended "locked to the
    // safe zone once the amulet's back on you" behavior already
    // documented for this feature, not a new side effect.
    //
    // Sanity-clamped rather than applied blindly: any save where the
    // amulet was already sitting on the pedestal from BEFORE this fix
    // shipped never actually had its border expanded (the old code
    // never touched it) - shrinking that real, un-expanded size by the
    // full delta would produce a nonsense deeply-negative border. A
    // real border only ever starts at 50 and grows, so anything the
    // shrink would drop below that floor means there was nothing to
    // undo in the first place - skip the command entirely rather than
    // apply a broken value, and leave the border exactly as it was.
    var currentBorderSize = level.getWorldBorder().getSize()
    var shrunkBorderSize = currentBorderSize - BORDER_EXPAND_DELTA
    if (shrunkBorderSize >= 50) {
      player.getServer().runCommandSilent(`worldborder set ${shrunkBorderSize} 0`)
    }
    player.tell('§d[Amulet] §fYou lift the pendant back off its stand. It settles into your pack, not onto you.')
    return
  }

  // Accept the amulet from wherever the player actually has it right
  // now - worn in the Curios slot, or just sitting in inventory/hand -
  // rather than requiring it be worn first. Real bug found in
  // playtesting (2026-08-31): this used to ONLY check the Curios slot,
  // so a player who never manually equipped it (now the default state
  // since the amulet stopped auto-equipping at login) got "the amulet
  // isn't on you" while genuinely carrying it. inventory.find() covers
  // the hotbar/mainhand slot too, so holding it in hand already works
  // without a separate check.
  var equippedAmulet = player.findFirstCurio((stack) => stack.id === 'kubejs:amulet')
  if (equippedAmulet.isPresent()) {
    player.setEquippedCurio('necklace', 0, Item.of('minecraft:air'))
    data.putBoolean('td_amuletWorn', false)
  } else {
    var slot = player.inventory.find('kubejs:amulet')
    if (slot === -1) {
      player.tell('§7[Amulet] §fThere\'s nothing to place here - the amulet isn\'t on you.')
      return
    }
    // kjs$extractItem, confirmed from KubeJS's own InventoryKJS.class
    // (decompiled directly, not guessed) - removes exactly 1 from that
    // slot, mirroring Forge's IItemHandler#extractItem(slot, amount,
    // simulate) contract.
    player.inventory.extractItem(slot, 1, false)
  }

  data.putBoolean('td_amuletOnPedestal', true)
  // Base position stored for the bob tick handler below to orbit around -
  // block-anchored, not entity-read-back, so the bob is stable even
  // though the marker itself moves every couple ticks.
  data.putDouble('td_amuletMarkerBaseX', x)
  data.putDouble('td_amuletMarkerBaseY', y)
  data.putDouble('td_amuletMarkerBaseZ', z)
  // Expand the real border by a large fixed delta so vanilla's own
  // player-movement clamp (not just this pack's custom push-back tick
  // handler) actually stops blocking crossing - see BORDER_EXPAND_DELTA's
  // comment above for the real root cause this fixes.
  var currentBorderSize = level.getWorldBorder().getSize()
  player.getServer().runCommandSilent(`worldborder set ${currentBorderSize + BORDER_EXPAND_DELTA} 0`)
  player.getServer().runCommandSilent(`summon minecraft:armor_stand ${x} ${y} ${z} {Invisible:1b,NoGravity:1b,Marker:1b,Small:1b,HandItems:[{id:"kubejs:amulet",Count:1b},{}],Tags:["td_amulet_marker"]}`)
  player.tell('§d[Amulet] §fYou set the pendant on the stand. The line at the border loosens - everything out there stops watching you, and starts watching this instead.')
})

// Gentle floating bob while the amulet sits on its pedestal - direct
// request ("doesn't hover/bob"). Re-teleports the marker each throttled
// tick to its stored base position plus a small sine-wave Y offset,
// rather than nudging its current position incrementally - stateless
// per tick (only depends on the stored base + the clock), so it can't
// drift or accumulate error over a long play session.
PlayerEvents.tick((event) => {
  var player = event.entity
  var data = player.persistentData
  if (!data.getBoolean('td_amuletOnPedestal')) return

  var level = player.getLevel()
  var currentTick = level.getTime()
  if (currentTick % 2 !== 0) return

  var baseX = data.getDouble('td_amuletMarkerBaseX')
  var baseY = data.getDouble('td_amuletMarkerBaseY')
  var baseZ = data.getDouble('td_amuletMarkerBaseZ')
  var bobY = baseY + BOB_AMPLITUDE * Math.sin((2 * Math.PI * currentTick) / BOB_PERIOD_TICKS)

  player.getServer().runCommandSilent(
    `execute as @e[type=minecraft:armor_stand,tag=td_amulet_marker,limit=1] run tp @s ${baseX} ${bobY} ${baseZ}`
  )
})
