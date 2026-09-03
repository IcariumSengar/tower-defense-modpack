// The amulet pedestal — retrofitted 2026-09-05 onto Supplementaries'
// real Pedestal block (`supplementaries:pedestal`), replacing the
// custom `kubejs:amulet_pedestal` block and its hand-built floating-item
// marker/bob visual entirely. Direct request: "can we leverage a mod
// that renders cool pedestals with floating items whilst keeping the
// entire mechanic of the pedestal." Retires the exact code the real
// Math.PI bug (2026-09-02) lived in - one whole bug class removed, not
// just patched.
//
// Real API, decompiled from the mod's own class files, not guessed:
// `PedestalBlockTile extends ItemDisplayTile` (Moonlight Library),
// which is a real single-slot Container. `getDisplayedItem()` is a
// public method, directly callable from KubeJS on the object
// `level.getBlockEntity([x,y,z])` returns - confirmed live in a sandbox
// test (real id/count/isEmpty() round-trip). `canPlaceItem` just checks
// the slot is empty - confirmed from ItemDisplayTile's own bytecode
// there's no item TYPE filter at all, so this script has to check
// specifically for `kubejs:amulet`, not assume anything placed there is
// it. A pedestal placed in open space (this shrine's case) always gets
// a real BlockEntity - the mod's own "tileless" fast path only applies
// to a status the code calls NONE, which needs something actively
// blocking the space above it; confirmed by reading a fresh pedestal's
// own block data right after placement (`Items: []` present, not a
// missing tile).
//
// Detection is a tick-poll against the pedestal's own stored item, not
// a right-click hook - Supplementaries' Pedestal already handles the
// actual pick-up/place interaction itself (real ponder-documented
// behavior: right-click with an item in hand to place it, right-click
// empty-handed to take it back), so this script doesn't drive that
// exchange at all anymore. Same "poll world/persistentData state from a
// tick handler" pattern already dominant in this codebase.
//
// Real UX difference from before, not chased further since it wasn't
// the actual ask: Supplementaries' own interact() only reads the
// player's HAND (`getItemInHand`), not the Curios necklace slot - the
// old script used to accept the amulet straight off the player's worn
// slot too. A player wanting to place a currently-worn amulet now has
// to unequip it via their Curios tab first (which already correctly
// flips td_amuletWorn off via amulet.js's own onEquip/onUnequip hooks,
// unrelated to any code in this file) before right-clicking the
// pedestal. Standard "take it off first" flow, not treated as a bug.
//
// **Real premise correction 2026-09-05** (docs/FEATURES.md, the
// "Superseded" note on the 2026-08-30/2026-09-01 objective work): the
// pedestal used to be the mob-targeting/spawn objective ONLY while the
// amulet sat on it - direct user correction: "regardless of whether the
// amulet is on the pedestal or not, this is the focus point for the
// enemies... if im not in the base to defend it then i lose the game."
// That targeting/spawn/forceload logic is now unconditional and
// permanent, set up once in playtest_starter_kit.js (the marker tagged
// `td_pedestal_target`, summoned there and never killed; forceload
// added there and never removed). This file's whole remaining job is
// just the amulet's own two effects: personal buffs while worn
// (amulet_worn.js reads td_amuletWorn, set by amulet.js's Curios
// onEquip/onUnequip hooks, untouched by any of this) and unlocking
// border-crossing while placed - fully decoupled from whether the base
// itself is being defended.

// Real border-crossing fix (2026-08-31 playtest bug): vanilla's own
// worldborder physically blocks player movement on its own, completely
// independent of any KubeJS script - see wave_spawner.js's spawn-
// position comments for the same fact used elsewhere. Expand by a fixed
// delta when the amulet goes on the pedestal, shrink by the same delta
// when it comes back off, rather than snapshot-and-restore an absolute
// size - stays correct even if base_expansion.js grows the border for
// an unrelated wave-clear while the amulet happens to be away.
var BORDER_EXPAND_DELTA = 10000000

ServerEvents.recipes((event) => {
  // New 2026-09-01, part of the pedestal/amulet reversal - the amulet
  // previously had no recipe at all (only ever given programmatically
  // at login). Hollow gold ring, matching "Not Just Jewelry"'s flavor
  // text ("melt what gold you can spare and see what comes of it") -
  // plain gold_ingot only, no invented material, Uncommon-tier per
  // loot_bag_open.js.
  event.shaped('kubejs:amulet', [
    'GGG',
    'G G',
    'GGG',
  ], {
    G: 'minecraft:gold_ingot',
  })

  // kubejs:amulet_pedestal's own recipe (sandstone-toned, matching its
  // shrine model) kept as a real fallback/spare for any already-in-
  // progress save whose actual placed pedestal is still this custom
  // block, not Supplementaries' - see startup_scripts/amulet.js's own
  // comment on why that block registration itself also stays. New
  // worlds never see this recipe used (Supplementaries' own pedestal
  // recipe is what JEI shows once a fresh base ships the real block),
  // but it costs nothing to leave working.
  event.shaped('kubejs:amulet_pedestal', [
    'GGG',
    'GSG',
    'GGG',
  ], {
    G: 'minecraft:gold_ingot',
    S: 'minecraft:sandstone',
  })
})

// Shared by both the new tick-poll (real supplementaries:pedestal) and
// the legacy right-click handler (any already-in-progress save still
// running the original custom block) - the actual border-crossing
// effect doesn't depend on which real block is involved, only on
// whether the amulet just went on or came off.
function toggleAmuletOnPedestal(player, data, level, hasAmulet) {
  data.putBoolean('td_amuletOnPedestal', hasAmulet)

  var server = player.getServer()
  var currentBorderSize = level.getWorldBorder().getSize()

  if (hasAmulet) {
    server.runCommandSilent(`worldborder set ${currentBorderSize + BORDER_EXPAND_DELTA} 0`)
    player.tell('§d[Amulet] §fThe pendant settles onto the stand. The line at the border loosens - you can walk past it without being pushed back.')
  } else {
    // Sanity-clamped rather than applied blindly - a save where the
    // amulet was placed before this delta existed never had its border
    // expanded, so shrinking that real un-expanded size by the full
    // delta would produce a nonsense deeply-negative border. A real
    // border only ever starts at 50 and grows - skip the command
    // entirely if the shrink would drop below that floor.
    var shrunkBorderSize = currentBorderSize - BORDER_EXPAND_DELTA
    if (shrunkBorderSize >= 50) {
      server.runCommandSilent(`worldborder set ${shrunkBorderSize} 0`)
    }
    player.tell('§d[Amulet] §fYou lift the pendant back off its stand.')
  }
}

// Throttled to every 10 ticks (2x/second) - matches mob_aggro.js's own
// poll rate, no need to check faster than that for a state that only
// changes on a deliberate player action.
PlayerEvents.tick((event) => {
  var player = event.entity
  var data = player.persistentData

  // td_pedestalX is only set once playtest_starter_kit.js's base build
  // finishes this login - nothing to poll before that.
  if (!data.contains('td_pedestalX')) return

  var level = player.getLevel()
  if (level.getTime() % 10 !== 0) return

  var x = data.getInt('td_pedestalX')
  var y = data.getInt('td_pedestalY')
  var z = data.getInt('td_pedestalZ')

  // Only the real supplementaries:pedestal has a Container to poll - an
  // already-in-progress save's old kubejs:amulet_pedestal block is
  // handled entirely by the legacy right-click handler below instead,
  // since it never had a block entity of its own to read.
  var block = level.getBlock(x, y, z)
  if (`${block.id}` !== 'supplementaries:pedestal') return

  var pedestalTile = level.getBlockEntity([x, y, z])
  if (!pedestalTile) return

  var displayed
  try {
    displayed = pedestalTile.getDisplayedItem()
  } catch (e) {
    return
  }

  var hasAmulet = displayed && !displayed.isEmpty() && `${displayed.id}` === 'kubejs:amulet'
  var wasOnPedestal = data.getBoolean('td_amuletOnPedestal')
  if (hasAmulet === wasOnPedestal) return

  toggleAmuletOnPedestal(player, data, level, hasAmulet)
})

// Legacy interaction for the OLD custom block only - real backward-
// compat requirement, not dead code: any save already in progress when
// this retrofit shipped has an actual placed kubejs:amulet_pedestal
// block (its registration was deliberately kept, see
// startup_scripts/amulet.js), and that block never had a Container of
// its own for the new tick-poll above to read. This is the same
// right-click logic the pedestal used before the Supplementaries
// retrofit - accepts the amulet from wherever the player actually has
// it (worn or in inventory/hand), not just held in hand the way
// Supplementaries' own interaction requires.
BlockEvents.rightClicked('kubejs:amulet_pedestal', (event) => {
  var player = event.player
  var data = player.persistentData
  var level = player.getLevel()

  if (data.getBoolean('td_amuletOnPedestal')) {
    player.give(Item.of('kubejs:amulet', 1))
    toggleAmuletOnPedestal(player, data, level, false)
    return
  }

  var equippedAmulet = player.findFirstCurio((stack) => stack.id === 'kubejs:amulet')
  if (equippedAmulet.isPresent()) {
    player.setEquippedCurio('necklace', 0, Item.of('minecraft:air'))
  } else {
    var slot = player.inventory.find('kubejs:amulet')
    if (slot === -1) {
      player.tell('§7[Amulet] §fThere\'s nothing to place here - the amulet isn\'t on you.')
      return
    }
    player.inventory.extractItem(slot, 1, false)
  }

  toggleAmuletOnPedestal(player, data, level, true)
})
