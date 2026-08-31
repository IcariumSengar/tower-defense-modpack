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

  // The amulet is NO LONGER starter gear (reversed 2026-09-01,
  // docs/FEATURES.md's "The amulet" - "the pedestal is pre-built, the
  // amulet is crafted"). It now has a real crafting recipe
  // (server_scripts/amulet_pedestal.js) instead of being given here;
  // the empty pre-built pedestal (below, in the base-building section)
  // is the intended hook - "something was supposed to be here."

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

  // Perimeter walls — "the last bastion, in disrepair" redesign
  // (2026-09-01, direct request, see docs/FEATURES.md's "Starting base"
  // section for the full brief). Two layers of construction: the
  // *original* build (cracked/mossy stone, everywhere, as the base
  // material) with SecurityCraft reinforced-block *patches* bolted on
  // wherever it mattered most - heaviest right around the gate,
  // thinning toward the back. Supersedes the previous flat "reinforced
  // primary, mossy/cracked scattered for a weathered look" version
  // (2026-08-29) - same three materials, deliberately uneven
  // distribution now instead of near-uniform reinforcement with
  // scattered weathering.
  //
  // Dig resistance / pillaring reasoning for the reinforced portions is
  // unchanged from the 2026-08-29 version - see docs/MODS.md's
  // SecurityCraft entry. The unreinforced cracked/mossy portions are
  // genuinely weaker (plain vanilla blocks, no ownership protection) -
  // intentional now that reinforcement is concentrated by design, not
  // just cosmetic variance.
  //
  // Gate stays a plain vanilla oak_door (unchanged reasoning - see
  // docs/MODS.md), placed via /setblock so these walls come out
  // ownerless the same way they always have.
  const WALL_MOSSY_CHANCE = 0.12
  const WALL_CRACKED_CHANCE = 0.05

  function reinforcedVariant() {
    const roll = Math.random()
    if (roll < WALL_CRACKED_CHANCE) return 'securitycraft:reinforced_cracked_stone_bricks'
    if (roll < WALL_CRACKED_CHANCE + WALL_MOSSY_CHANCE) return 'securitycraft:reinforced_mossy_cobblestone'
    return 'securitycraft:reinforced_cobblestone'
  }

  // Chance of a reinforced patch at this position, falling off with
  // distance from the gate (doorX, z1) - 0.85 right at the gate, down
  // to a floor of 0.08 by the far corners (~15 blocks away on this
  // 11x11 footprint). The remainder is the "original" cracked/mossy
  // stone, not plain cobblestone - it's old masonry, not fresh
  // material.
  function perimeterWallBlock(wx, wz) {
    const distFromGate = Math.sqrt((wx - doorX) * (wx - doorX) + (wz - z1) * (wz - z1))
    const reinforceChance = Math.max(0.08, 0.85 - distFromGate * 0.06)
    if (Math.random() < reinforceChance) return reinforcedVariant()
    return Math.random() < 0.5 ? 'minecraft:cracked_stone_bricks' : 'minecraft:mossy_cobblestone'
  }

  // Weakest point: a 3-block stretch of the west wall nearest the back
  // (NW corner, as far from the gate as this footprint allows) - two
  // blocks tall instead of three, always plain (unreinforced)
  // cobblestone regardless of the distance roll above, reading as
  // "breached and crudely rebuilt" rather than pristine. Real gameplay
  // difference too, not just visual: no SecurityCraft protection here.
  const WEAK_WALL_Z0 = z0
  const WEAK_WALL_Z1 = z0 + 2

  for (let wx = x0; wx <= x1; wx++) {
    for (let wy = wallY0; wy <= wallY1; wy++) {
      run(`setblock ${wx} ${wy} ${z0} ${perimeterWallBlock(wx, z0)}`)
      run(`setblock ${wx} ${wy} ${z1} ${perimeterWallBlock(wx, z1)}`)
    }
  }
  for (let wz = z0; wz <= z1; wz++) {
    for (let wy = wallY0; wy <= wallY1; wy++) {
      if (wz >= WEAK_WALL_Z0 && wz <= WEAK_WALL_Z1) {
        run(`setblock ${x0} ${wy} ${wz} ${wy <= wallY0 + 1 ? 'minecraft:cobblestone' : 'minecraft:air'}`)
      } else {
        run(`setblock ${x0} ${wy} ${wz} ${perimeterWallBlock(x0, wz)}`)
      }
      run(`setblock ${x1} ${wy} ${wz} ${perimeterWallBlock(x1, wz)}`)
    }
  }
  // Debris propping the weak section - cobweb along its shortened top
  // (where the missing third row would be) and a scatter of gravel/
  // rubble just outside, like it's never been properly rebuilt.
  for (let wz = WEAK_WALL_Z0; wz <= WEAK_WALL_Z1; wz++) {
    run(`setblock ${x0} ${wallY1} ${wz} minecraft:cobweb`)
  }
  run(`setblock ${x0 - 1} ${wallY0} ${z0} minecraft:gravel`)
  run(`setblock ${x0 - 1} ${wallY0} ${z0 + 1} minecraft:cobblestone`)
  run(`setblock ${x0 - 1} ${wallY0} ${z0 + 2} minecraft:gravel`)

  run(`setblock ${doorX} ${wallY0} ${z1} minecraft:oak_door[facing=south,half=lower]`)
  run(`setblock ${doorX} ${wallY0 + 1} ${z1} minecraft:oak_door[facing=south,half=upper]`)

  // Gate dressing - the visible fault line, heaviest fought-over spot
  // (docs/FEATURES.md's "Starting base"): improvised defense props
  // (Zcraft Decoration barrels/crates as cover) flanking the door, and
  // a Trapcraft Spikes line just outside - placed purely decoratively
  // via /setblock, independent of the real craftable Tier 1 spikes
  // (see docs/MODS.md's Trapcraft replacement entry), no power/wiring
  // implied. Registry names confirmed from each mod's own jar before
  // writing this, blockstates checked for facing requirements - AND,
  // real gap caught by that check alone: `hesco_sandwall`/`barbed_wire_1`
  // both had real blockstate JSON *and* real lang entries, but turned
  // out to be orphaned assets with no actual registered block behind
  // them (`/setblock` rejected both as "Unknown block type" in a live
  // sandbox test) - ships `sfz_shuiniqiang` (Concrete Wall) and
  // `sfz_lantiepiweilan` (Broken Iron Fence) instead, both confirmed
  // real via the same live test. Lesson: a blockstate file existing is
  // NOT sufficient proof a block is placeable - `/setblock` it for real
  // before trusting an ID, same bar as everything else this session.
  run(`setblock ${doorX - 2} ${wallY0} ${z1 + 1} zcraft_decorations:sfz_shuiniqiang[facing=south]`)
  run(`setblock ${doorX + 2} ${wallY0} ${z1 + 1} zcraft_decorations:sfz_shuiniqiang[facing=south]`)
  run(`setblock ${doorX - 1} ${wallY0} ${z1 + 1} doomsday_decoration:barrel[facing=south]`)
  run(`setblock ${doorX + 1} ${wallY0} ${z1 + 1} doomsday_decoration:woodencrate[facing=south]`)
  for (let wx = x0; wx <= x1; wx++) {
    if (Math.abs(wx - doorX) <= 1) continue
    run(`setblock ${wx} ${wallY0} ${z1 + 2} trapcraft:spikes`)
  }
  run(`setblock ${doorX - 2} ${wallY0} ${z1 + 3} zcraft_decorations:sfz_lantiepiweilan[facing=south]`)
  run(`setblock ${doorX + 2} ${wallY0} ${z1 + 3} zcraft_decorations:sfz_lantiepiweilan[facing=south]`)

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

  // Tower battle-wear + base props (2026-09-01, folds into the same
  // "manned post, not just a lookout pillar" brief as the rest of this
  // pass) - a scorch mark near the base (coal_block, the plain vanilla
  // "burnt" block reused this way in `docs/FEATURES.md`'s own worked
  // examples elsewhere in this codebase) and cracked stone worked into
  // the otherwise-uniform cobblestone pillar, plus crates/barrels/a
  // burning barrel/a generator at its base - real-verified block IDs
  // from Doomsday Decoration + Zcraft Decoration, facing states checked
  // against each mod's own blockstate JSON before writing this, same
  // discipline as the wall/gate names above.
  run(`setblock ${towerX0} ${wallY0} ${towerZ1} minecraft:coal_block`)
  run(`setblock ${towerX0} ${wallY0 + 1} ${towerZ0} minecraft:cracked_stone_bricks`)
  run(`setblock ${towerX1} ${wallY0 + 2} ${towerZ0} minecraft:cracked_stone_bricks`)
  run(`setblock ${towerX0 - 1} ${wallY0} ${towerZ0} doomsday_decoration:woodencrate[facing=east]`)
  run(`setblock ${towerX1 + 1} ${wallY0} ${towerZ0} doomsday_decoration:carton[facing=west]`)
  run(`setblock ${towerX0 - 1} ${wallY0} ${towerZ1} doomsday_decoration:barrel[facing=east]`)
  run(`setblock ${towerX1 + 1} ${wallY0} ${towerZ1} zcraft_decorations:sfz_ranhaodetietong[facing=west]`)
  run(`setblock ${towerX0} ${wallY0} ${towerZ0 - 1} doomsday_decoration:fixedgenerator[facing=north]`)

  // Two more (unlit, decorative only - the torches above are the real
  // light source) police lights on the platform's south corners,
  // mirroring the existing torches on the north corners. Clear of the
  // ladder gap at (x, platformY+1, towerZ1+1).
  run(`setblock ${towerX0} ${platformY + 1} ${towerZ1} zcraft_decorations:sfz_buliangdejingdeng[facing=south]`)
  run(`setblock ${towerX1} ${platformY + 1} ${towerZ1} zcraft_decorations:sfz_buliangdejingdeng[facing=south]`)

  // Shrine nook + grave markers (2026-09-01, docs/FEATURES.md's "The
  // amulet" reversal - the pedestal is now pre-built into the *original*
  // structure layer, not something the player crafts). NE interior
  // corner, away from both the door and the interior shack (below).
  // The pedestal mechanic itself (server_scripts/amulet_pedestal.js)
  // already tracks state on the player, not the block/world, so
  // pre-placing it here needed zero changes to that file's own logic -
  // confirmed by reading it, not assumed.
  const shrineX = x1 - 2
  const shrineZ = z0 + 2
  run(`setblock ${shrineX} ${wallY0} ${shrineZ} kubejs:amulet_pedestal`)

  // Grave markers - plain vanilla oak_fence posts on small coarse_dirt
  // mounds, not a sign (avoids the 1.20.1 sign-NBT format entirely -
  // this pack already has one real crash history with guessed NBT
  // syntax, see docs/FEATURES.md's FTB Quests `#`-tag entry, not worth
  // repeating for a purely cosmetic prop). Clustered around the shrine,
  // directly reinforcing the existing "whoever held this before you"
  // wave-5 gear-removal flavor text (wave_status.js) rather than being
  // generic clutter.
  const graveSpots = [
    [shrineX - 1, shrineZ - 1],
    [shrineX + 1, shrineZ - 1],
    [shrineX, shrineZ + 2],
  ]
  graveSpots.forEach(([gx, gz]) => {
    run(`setblock ${gx} ${wallY0} ${gz} minecraft:coarse_dirt`)
    run(`setblock ${gx} ${wallY0 + 1} ${gz} minecraft:oak_fence`)
  })

  // Interior shack (2026-09-01, "still not built" per docs/FEATURES.md
  // - this pass builds it for the first time, not just decorates an
  // existing room). NW interior corner, clear of the door, the shrine,
  // and the tower's own footprint outside z0. A single 5x5 room (3x3
  // usable interior once the 1-thick walls are subtracted), walls two
  // blocks tall (shorter than the 3-block perimeter, reads as a lean-to
  // rather than a second fortification), oak_planks floor distinct from
  // the compound's stone_bricks, flat oak_planks roof, one doorway
  // facing the compound interior (south wall, centered). Dressed as a
  // command post, not a house - bedroll (Zcraft's mattress, not a
  // vanilla bed, to keep the "found, not slept in for real" reading),
  // stacked crates, a shelf, a table - worn furniture and discarded
  // belongings doing the storytelling per the brief, not a tidy room.
  // Furniture positions are all genuinely interior (shackX0+1..X1-1,
  // shackZ0+1..Z1-1) - a real placement bug caught in a live sandbox
  // test put 3 of these directly ON the wall line instead, which would
  // have carved holes in the walls rather than furnishing the room.
  const shackX0 = x0 + 1
  const shackX1 = x0 + 5
  const shackZ0 = z0 + 1
  const shackZ1 = z0 + 5
  const shackWallY1 = wallY0 + 1
  const shackDoorX = shackX0 + 2

  run(`fill ${shackX0} ${floorY + 1} ${shackZ0} ${shackX1} ${floorY + 1} ${shackZ1} minecraft:oak_planks`)
  for (let sx = shackX0; sx <= shackX1; sx++) {
    for (let sy = wallY0; sy <= shackWallY1; sy++) {
      run(`setblock ${sx} ${sy} ${shackZ0} minecraft:cracked_stone_bricks`)
      run(`setblock ${sx} ${sy} ${shackZ1} minecraft:cracked_stone_bricks`)
    }
  }
  for (let sz = shackZ0; sz <= shackZ1; sz++) {
    for (let sy = wallY0; sy <= shackWallY1; sy++) {
      run(`setblock ${shackX0} ${sy} ${sz} minecraft:cracked_stone_bricks`)
      run(`setblock ${shackX1} ${sy} ${sz} minecraft:cracked_stone_bricks`)
    }
  }
  run(`fill ${shackX0} ${shackWallY1 + 1} ${shackZ0} ${shackX1} ${shackWallY1 + 1} ${shackZ1} minecraft:oak_planks`)
  // Doorway - punched through the south wall (the side facing the
  // compound's open interior, toward the shrine/pedestal), centered.
  run(`setblock ${shackDoorX} ${wallY0} ${shackZ1} minecraft:air`)
  run(`setblock ${shackDoorX} ${wallY0 + 1} ${shackZ1} minecraft:air`)

  // 3x3 interior grid (columns shackX0+1..shackX0+3, rows
  // shackZ0+1..shackZ0+3) - mattress/shelf along the back wall, table
  // centered, crates flanking the doorway, the tile directly in front
  // of the door (shackDoorX, shackZ1-1) left clear as the walk-in path.
  run(`setblock ${shackX0 + 1} ${wallY0} ${shackZ0 + 1} zcraft_decorations:sfz_chuangdian_2[facing=north]`)
  run(`setblock ${shackX0 + 3} ${wallY0} ${shackZ0 + 1} doomsday_decoration:shelf[facing=north]`)
  run(`setblock ${shackX0 + 2} ${wallY0} ${shackZ0 + 2} doomsday_decoration:table`)
  run(`setblock ${shackX0 + 1} ${wallY0} ${shackZ0 + 3} doomsday_decoration:carton_2[facing=south]`)
  run(`setblock ${shackX0 + 3} ${wallY0} ${shackZ0 + 3} doomsday_decoration:weaponbox[facing=south]`)
})
