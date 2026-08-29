// Playtest convenience gear (weapon/armor) plus the real "Fixed spawn +
// prebuilt starting building" pack design (docs/IDEAS.md) — every world
// now spawns the player at the exact same fixed point (0, groundY, 0)
// with the same starter base already there, not "wherever they happened
// to first spawn" (the old playtest-only behavior). Armor isn't
// auto-equipped, just given to inventory — same as the sword/horn.
//
// Narratively reframed (2026-08-19) as gear looted from a previous,
// unfortunate occupant of the base — same "diary from a previous soul"
// device planned for the quest book (docs/IDEAS.md's Pack Aesthetic
// idea). Mechanically, the sword/armor disappear once wave 5 clears —
// see wave_status.js's removal logic, gated on the td_starter_gear NBT
// tag set here, not item type.
//
// Fixed-spawn mechanism (2026-08-20), built per docs/IDEAS.md's "How to
// actually pin this down" plan, with one deliberate substitution: that
// plan named `/place template` (a hand-authored .nbt structure file) for
// the building itself. Building/verifying a raw NBT structure file
// blind, with no way to test it in-game before committing it, is real
// unverified risk for zero benefit here — the /fill+/setblock technique
// below is the exact same wall-building code already proven working in
// actual playtests (docs/PLAYTESTING.md), just re-anchored to a fixed
// point instead of the player's arbitrary spawn position. Same outcome
// (fixed spot, prebuilt building, every world), lower-risk mechanism.
// `/setworldspawn` + `gamerule spawnRadius 0` are still used exactly as
// the design doc describes — only the structure-placement half changed.
//
// World type switched from Superflat to Single Biome: Desert on
// 2026-08-20, then **reverted back to Superflat the same day** — real
// terrain read as "wonky, doesn't suit the gameplay" per direct
// feedback after playtesting it. `kubejs/data/minecraft/dimension/
// overworld.json` now forces vanilla's own default flat generator
// (bedrock+2 dirt+grass, plains biome) automatically, same mechanism as
// the Desert override was, just pointed at a different generator - a
// fresh world needs zero manual world-type customization either way.
// This is deliberately "for now," not a closed decision - see
// docs/IDEAS.md's Seed research section if real terrain gets revisited.
//
// `/spreadplayers` (below) was added specifically to handle uneven
// Desert terrain, but works correctly on flat terrain too (finds the
// same uniform height everywhere) - left in place rather than reverted
// back to the older "read the player's own natural spawn Y" approach,
// since it's strictly more robust with no downside on Superflat.
//
// Uses event.server.runCommandSilent(...) with absolute coordinates (not
// player-relative ~) since it executes from the server console, not "as"
// the player.
//
// Uses player.getX()/getY()/getZ(), not bare .x/.y/.z — confirmed in
// wave_spawner.js's debugging that the bare-property form produces NaN
// for position in this environment. This means the starter base has
// never actually been built until now (NaN coordinates -> every /fill
// and /setblock silently failed) — the sword/horn gave fine since
// Item.of(...) doesn't depend on position.

// Starter sword/armor carry a td_starter_gear:1b marker tag (plus a
// flavor Lore line) so wave_status.js can remove exactly these items
// after wave 5, not any netherite sword/iron armor the player has since
// crafted or looted legitimately — see starterGearNbt() below. The Wave
// Horn is NOT tagged; it's the core mechanic item, not narrative gear.
function starterGearNbt(extra) {
  const lore = '\'{"text":"Looted from a fallen soul who came before you...","italic":true,"color":"gray"}\''
  const extraPart = extra ? extra + ',' : ''
  return `{${extraPart}td_starter_gear:1b,display:{Lore:[${lore}]}}`
}

PlayerEvents.loggedIn((event) => {
  const player = event.player
  const data = player.persistentData

  if (data.getBoolean('td_playtestKitGiven')) return
  data.putBoolean('td_playtestKitGiven', true)

  player.give(Item.of('minecraft:netherite_sword', 1, starterGearNbt('Enchantments:[{id:"minecraft:sharpness",lvl:100}]')))
  player.give(Item.of('kubejs:wave_horn', 1))
  player.give(Item.of('minecraft:iron_helmet', 1, starterGearNbt()))
  player.give(Item.of('minecraft:iron_chestplate', 1, starterGearNbt()))
  player.give(Item.of('minecraft:iron_leggings', 1, starterGearNbt()))
  player.give(Item.of('minecraft:iron_boots', 1, starterGearNbt()))

  event.server.runCommandSilent('gamerule doMobSpawning false')

  // Snap onto solid ground near world origin (0,0) — heightmap-aware,
  // avoids voids/liquids, unlike a raw teleport to a guessed Y. Small
  // maxRange (8) keeps this close enough to true origin to still read
  // as "the same fixed spot" every world, while giving the command room
  // to find a valid column if (0,0) exactly happens to be an edge case.
  event.server.runCommandSilent('spreadplayers 0 0 1 8 false @a')

  // Ground truth read AFTER spreadplayers — this is where the player is
  // actually now standing, on real terrain, not a guess.
  const x = Math.floor(player.getX())
  const y = Math.floor(player.getY())
  const z = Math.floor(player.getZ())

  // Pin every future respawn to this exact point (docs/IDEAS.md's
  // "Fixed spawn" plan) - spawnRadius 0 removes vanilla's default ~10
  // block first-spawn scatter, so this is the actual landing spot, not
  // just a nearby nudge target.
  event.server.runCommandSilent(`setworldspawn ${x} ${y} ${z}`)
  event.server.runCommandSilent('gamerule spawnRadius 0')

  // Center the border on the same fixed point, not wherever the player
  // happened to be standing — matches the manual setup step from
  // docs/PLAYTESTING.md, now automatic.
  event.server.runCommandSilent(`worldborder center ${x} ${z}`)
  event.server.runCommandSilent('worldborder set 50')
  // Wave mobs deliberately spawn just beyond the border (wave_spawner.js)
  // and walk in - without this, vanilla's default border damage would
  // chip them (and the player, near the edge) for no reason this pack
  // actually wants; the border here is a containment/staging boundary,
  // not a shrinking-zone mechanic.
  event.server.runCommandSilent('worldborder damage amount 0')

  const floorY = y - 1
  const wallY0 = y
  const wallY1 = y + 2
  const doorX = x

  const run = (cmd) => event.server.runCommandSilent(cmd)

  const half = 5
  const x0 = x - half
  const x1 = x + half
  const z0 = z - half
  const z1 = z + half

  // No foundation dig / headroom clear needed - back on Superflat
  // (2026-08-20, reverted from Single Biome: Desert - real terrain
  // "wonky, doesn't suit the gameplay" per direct feedback), where
  // height is uniform everywhere, so a single Y works across the whole
  // footprint the same way it always did before this pack tried real
  // terrain. See docs/IDEAS.md's Seed research section for the full
  // history if real terrain gets revisited later - this is deliberately
  // "for now," not a closed decision.
  run(`fill ${x0} ${floorY} ${z0} ${x1} ${floorY} ${z1} minecraft:stone_bricks`)
  run(`fill ${x0} ${wallY0} ${z0} ${x1} ${wallY1} ${z0} minecraft:cobblestone`)
  run(`fill ${x0} ${wallY0} ${z1} ${x1} ${wallY1} ${z1} minecraft:cobblestone`)
  run(`fill ${x0} ${wallY0} ${z0} ${x0} ${wallY1} ${z1} minecraft:cobblestone`)
  run(`fill ${x1} ${wallY0} ${z0} ${x1} ${wallY1} ${z1} minecraft:cobblestone`)
  run(`setblock ${doorX} ${wallY0} ${z1} minecraft:oak_door[facing=south,half=lower]`)
  run(`setblock ${doorX} ${wallY0 + 1} ${z1} minecraft:oak_door[facing=south,half=upper]`)

  // Watchtower (2026-08-20) - phase 1 of expanding the starter base
  // into multiple buildings, per direct request. Placed north of the
  // base (behind the back wall, clear of the door on the south/+Z
  // side), a solid cobblestone pillar with an external ladder up to a
  // platform - matches the base's own material palette rather than
  // introducing a new one. Open on all sides at the top rather than
  // facing one direction, since wave_spawner.js's
  // randomBorderEdgePosition() spawns mobs at a random point on any of
  // the 4 border edges - a lookout facing only one way would miss
  // three-quarters of what it's meant to watch for.
  const towerX0 = x - 1
  const towerX1 = x + 1
  const towerZ1 = z0 - 3
  const towerZ0 = towerZ1 - 2
  const platformY = wallY0 + 10

  run(`fill ${towerX0} ${wallY0} ${towerZ0} ${towerX1} ${platformY - 1} ${towerZ1} minecraft:cobblestone`)

  // Ladder on the south face (the side facing the base, for a short,
  // convenient walk from the door). Placed in the air position just
  // outside the pillar's south face; facing=south points away from the
  // pillar (the block it's mounted against is to its north) - standard
  // vanilla wall-attachment convention, same direction as the block it
  // opens away from.
  for (let ly = wallY0; ly < platformY; ly++) {
    run(`setblock ${x} ${ly} ${towerZ1 + 1} minecraft:ladder[facing=south]`)
  }

  // 5x5 platform (one block wider than the pillar on each side), same
  // stone brick as the base floor for visual consistency.
  run(`fill ${towerX0 - 1} ${platformY} ${towerZ0 - 1} ${towerX1 + 1} ${platformY} ${towerZ1 + 1} minecraft:stone_bricks`)

  // Parapet ring around the platform edge, one block above the floor -
  // four separate fills for the four edges rather than a hollow-box
  // trick, so the ladder-access gap (punched out after) is easy to
  // reason about precisely.
  run(`fill ${towerX0 - 1} ${platformY + 1} ${towerZ0 - 1} ${towerX1 + 1} ${platformY + 1} ${towerZ0 - 1} minecraft:cobblestone_wall`)
  run(`fill ${towerX0 - 1} ${platformY + 1} ${towerZ1 + 1} ${towerX1 + 1} ${platformY + 1} ${towerZ1 + 1} minecraft:cobblestone_wall`)
  run(`fill ${towerX0 - 1} ${platformY + 1} ${towerZ0 - 1} ${towerX0 - 1} ${platformY + 1} ${towerZ1 + 1} minecraft:cobblestone_wall`)
  run(`fill ${towerX1 + 1} ${platformY + 1} ${towerZ0 - 1} ${towerX1 + 1} ${platformY + 1} ${towerZ1 + 1} minecraft:cobblestone_wall`)
  run(`setblock ${x} ${platformY + 1} ${towerZ1 + 1} minecraft:air`)

  // Two torches for a lit lookout point at night, placed on the
  // platform floor near the north edge - clear of the ladder gap.
  run(`setblock ${towerX0} ${platformY + 1} ${towerZ0} minecraft:torch`)
  run(`setblock ${towerX1} ${platformY + 1} ${towerZ0} minecraft:torch`)
})
