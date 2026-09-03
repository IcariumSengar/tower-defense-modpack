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
  // Fixed spawn target moved 2026-09-01 (direct request, real diagnosis
  // in docs/FEATURES.md's "World type" section): the original (0,0)
  // landed the whole base inside a huge contiguous badlands blob (72.8%
  // of a 320x320-block sample, 0% desert - not a biome_source bug,
  // just this seed's bad luck for that exact point). (780,-150) was
  // picked from a real RCON grid census, not guessed: badlands stays
  // 300-500+ blocks away and desert 650+ blocks away from every point
  // checked in a 200-block neighborhood around it, with plains/savanna
  // genuinely close (plains at 0 blocks, savanna 45 blocks). Everything
  // else (setworldspawn, worldborder center, the whole Watchpost build
  // below) already derives from the x/y/z read back right after this
  // one command - confirmed by reading the rest of this function before
  // changing this line, not assumed - so moving just this target
  // coordinate relocates the entire base cleanly with it.
  event.server.runCommandSilent('spreadplayers 780 -150 1 8 false @a')

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
  // Briefly bumped to 90 for the Red Mansion (26x28), reverted back to
  // 50 the same day (2026-09-01) once the mansion itself was swapped for
  // Abandoned Brick House (12x11, see below) - the smaller building's
  // compound footprint comfortably fits the original border size again,
  // so this also restores base_expansion.js's originally-tuned wave-8
  // ending border of 166 instead of the mansion-driven ~206.
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

  // Layout wraps around a real postapocalypse_structures building
  // instead of the old hand-built shell - gate sits just off the fixed
  // spawn point, courtyard runs north from there, then the building,
  // then a back margin closing out the compound. Swapped from Red
  // Mansion to Abandoned Brick House the same day (2026-09-01, direct
  // feedback: "this mansion is too big") - real dimensions confirmed by
  // decompiling its own NBT directly (12 wide (X) x 13 tall (Y) x 11
  // deep (Z), DataVersion 3465 matches this pack's install exactly),
  // barely bigger than the original hand-built 11x11 footprint. Same
  // mod, same aesthetic family, already installed - no new dependency.
  // Watchtower removed entirely 2026-09-03 (direct request: "it serves
  // no purpose now that we have a better starting structure" - its
  // original 4-sided-lookout reasoning assumed border-relative mob
  // spawns, stale since spawns went player-relative 2026-09-01, and it
  // stood outside the compound's own back wall regardless, never part
  // of the defended perimeter).
  const BUILDING_WIDTH = 12
  const BUILDING_DEPTH = 11
  const BUILDING_HEIGHT = 13
  // 4 → 8 (2026-09-05, "the pedestal area is lacking any oomph... I
  // want this to be the heart of the base, the centre point to
  // everything"): the centered dais/step/grave-arc redesign below needs
  // real room that the old 4-row courtyard didn't have. Every other
  // measurement in this file (walls, gate, building) already derives
  // from this constant, so the whole compound just grows northward with
  // it - no other coordinate needed a manual adjustment.
  const COURTYARD_DEPTH = 8
  const SIDE_MARGIN = 3
  const BACK_MARGIN = 2
  // Gate sits 2 blocks north of the player's own spawn point, not on
  // top of it - a real bug caught before ever reaching the sandbox: a
  // literal door block placed exactly at (x, y, z) would spawn the
  // player inside/on top of a solid door every single login.
  const GATE_OFFSET = 2

  const buildingX0 = x - Math.floor(BUILDING_WIDTH / 2)
  const buildingX1 = buildingX0 + BUILDING_WIDTH - 1
  const z1 = z + GATE_OFFSET
  const buildingZ1 = z1 - COURTYARD_DEPTH - 1
  const buildingZ0 = buildingZ1 - BUILDING_DEPTH + 1

  const x0 = buildingX0 - SIDE_MARGIN
  const x1 = buildingX1 + SIDE_MARGIN
  const z0 = buildingZ0 - BACK_MARGIN

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
  // to a floor of 0.08 by roughly 13 blocks away and beyond (the falloff
  // rate is unchanged from the original smaller footprint; the walled
  // perimeter itself just got bigger to wrap the mansion, so more of it
  // now sits past that floor distance). The remainder is the "original"
  // cracked/mossy stone, not plain cobblestone - it's old masonry, not
  // fresh material.
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
  // a Barbed Wire line just outside - placed purely decoratively via
  // /setblock, independent of the real craftable Tier 1 barbed wire
  // (see docs/MODS.md's Trapcraft replacement entry), no power/wiring
  // implied. Switched from Trapcraft's Spikes 2026-09-03 (direct
  // request: Barbed Wire replaces Spikes as the Tier 1 defense item) -
  // createaddition:barbed_wire needs both `vertical` and `facing`
  // blockstate properties (confirmed from the mod's own blockstate
  // JSON, not guessed); vertical=false is the ground-laid variant this
  // decorative line wants, matching how the old Spikes line sat.
  // Registry names confirmed from each mod's own jar before
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
    run(`setblock ${wx} ${wallY0} ${z1 + 2} createaddition:barbed_wire[vertical=false,facing=south]`)
  }
  run(`setblock ${doorX - 2} ${wallY0} ${z1 + 3} zcraft_decorations:sfz_lantiepiweilan[facing=south]`)
  run(`setblock ${doorX + 2} ${wallY0} ${z1 + 3} zcraft_decorations:sfz_lantiepiweilan[facing=south]`)

  // Centered dais (2026-09-05, real redesign, docs/FEATURES.md's
  // "Superseded" note - direct request: "the pedestal area is lacking
  // any oomph... I want this to be the heart of the base, the centre
  // point to everything"). Moved from a side shrine nook (the old
  // shrineX = x1-3, tucked against the east wall) to dead center of the
  // courtyard, between the gate and the building - this is why
  // COURTYARD_DEPTH grew from 4 to 8 above, real room for a platform,
  // a step, and a grave arc that don't feel cramped. centerX = doorX
  // (the courtyard is already roughly centered on the player's own
  // spawn X, confirmed by re-deriving x0/x1 above - x1-x0 = 17,
  // centerX sits 8-9 blocks from either wall, comfortable margin for
  // everything below). centerZ = z1-4, middle of the new 8-row
  // courtyard (walkable rows z1-1 through z1-8, building front wall at
  // buildingZ1 = z1-9) - every measurement below is checked against
  // that real range, not assumed clear:
  //   z1-2: step (between gate and platform)
  //   z1-3..z1-5: 3x3 platform (centerZ ± 1)
  //   z1-6..z1-7: grave arc
  //   z1-8: buffer row before the building's own front wall
  // Real gate-trap risk this pack already hit once (a door landing
  // exactly on the spawn coordinate) is untouched by any of this -
  // doorX/GATE_OFFSET/z1 aren't touched here, only what happens deeper
  // in the courtyard. Real grave-overlap risk this pack also already
  // hit once (shrineZ = z1-3 vs z1-4) is the reason every row above is
  // spelled out and checked against buildingZ1 before shipping, not
  // just eyeballed.
  //
  // Platform: cut sandstone, one block riser (wallY0+1) - matches the
  // amulet's own established gold/sandstone palette (amulet.js). Real
  // block swap 2026-09-05 for the pedestal itself (docs/FEATURES.md
  // "Pedestal visual upgrade"): `supplementaries:pedestal` replaces the
  // custom `kubejs:amulet_pedestal` - a real Container block that
  // renders whatever's placed in it natively, so the pack no longer
  // hand-builds the floating-item visual. No blockstate properties
  // needed for a plain freestanding placement - confirmed live.
  const centerX = doorX
  const centerZ = z1 - 4
  for (let px = centerX - 1; px <= centerX + 1; px++) {
    for (let pz = centerZ - 1; pz <= centerZ + 1; pz++) {
      run(`setblock ${px} ${wallY0 + 1} ${pz} minecraft:cut_sandstone`)
    }
  }
  // Step on the gate-facing (south) side, one row south of the
  // platform's own edge - bridges the 1-block rise from the courtyard
  // floor (wallY0) up to the platform surface (wallY0+1). Not load-
  // bearing for traversal (a 1-block rise is climbable unaided anyway)
  // - purely the "step" the direct request asked for. Orientation
  // reasoned from vanilla's stair-facing convention, not visually
  // confirmed (no GUI access to check this by eye) - correct on the
  // next real playtest if it reads backwards.
  run(`setblock ${centerX} ${wallY0 + 1} ${centerZ + 2} minecraft:sandstone_stairs[facing=north]`)
  run(`setblock ${centerX} ${wallY0 + 2} ${centerZ} supplementaries:pedestal`)
  // Stored once here, permanent regardless of amulet state -
  // pedestal_destruction.js's own destruction check, amulet_pedestal.js's
  // border-crossing poll, and every wave/mob-targeting reference below
  // all key off this same fixed coordinate. 2026-09-03, "if the pedestal
  // is destroyed you lose."
  data.putInt('td_pedestalX', centerX)
  data.putInt('td_pedestalY', wallY0 + 2)
  data.putInt('td_pedestalZ', centerZ)

  // Braziers - real vanilla campfires (not an unverified mod block),
  // flanking the platform's east/west sides front and back rather than
  // its north/south center lines (which the step and grave arc already
  // occupy). Real "night presence" per the direct request, and a real
  // light source, not just a prop.
  const brazierSpots = [
    [centerX - 2, centerZ - 1],
    [centerX + 2, centerZ - 1],
    [centerX - 2, centerZ + 1],
    [centerX + 2, centerZ + 1],
  ]
  brazierSpots.forEach(([bx, bz]) => {
    run(`setblock ${bx} ${wallY0} ${bz} minecraft:campfire`)
  })

  // Real premise correction 2026-09-05 (docs/FEATURES.md, "Superseded"
  // note on the amulet objective fix): the pedestal is the permanent
  // front line, full stop - not an objective that only exists while the
  // amulet happens to be sitting on it. "regardless of whether the
  // amulet is on the pedestal or not, this is the focus point for the
  // enemies... if im not in the base to defend it then i lose the
  // game." Every wave mob (mob_aggro.js) targets this marker
  // unconditionally now, and wave_spawner.js/wave_status.js's own
  // waveObjective() always resolves to this same fixed point - the
  // amulet's actual remaining job (server_scripts/amulet_pedestal.js)
  // narrows to just personal buffs while worn and unlocking
  // border-crossing while placed, fully decoupled from whether the base
  // itself is being defended.
  //
  // Marker summoned once, here, permanently - never killed, unlike the
  // old amulet-gated marker it replaces. `PersistenceRequired:1b`
  // (same real bug this pack already hit once with wave mobs -
  // unpersisted entities silently despawn) keeps it from vanishing on a
  // server restart or long absence. No HandItems - Supplementaries'
  // pedestal now renders its own contents natively, so this is a pure,
  // invisible targeting anchor, not a visual prop. One block above the
  // pedestal's own position, not inside it.
  run(`summon minecraft:armor_stand ${centerX + 0.5} ${wallY0 + 3} ${centerZ + 0.5} {Invisible:1b,NoGravity:1b,Marker:1b,PersistenceRequired:1b,Tags:["td_pedestal_target"]}`)

  // Forceload is now a one-time permanent setup, not a toggle -
  // same 96-block/169-chunk radius already verified safe
  // (amulet_pedestal.js used to add/remove this exact range whenever
  // the amulet went on/off the pedestal; now it's just always on). Real,
  // deliberate resource-cost tradeoff, not an oversight: permanently
  // reserving chunk-loading around the base for the whole game is the
  // accepted cost of "the base is always genuinely at stake."
  run(`forceload add ${centerX - 96} ${centerZ - 96} ${centerX + 96} ${centerZ + 96}`)

  // Grave markers - plain vanilla oak_fence posts on small coarse_dirt
  // mounds, not a sign (avoids the 1.20.1 sign-NBT format entirely -
  // this pack already has one real crash history with guessed NBT
  // syntax, see docs/FEATURES.md's FTB Quests `#`-tag entry, not worth
  // repeating for a purely cosmetic prop). Arranged in an arc around the
  // dais's north side (2026-09-05, direct request - "arranged in an arc
  // around the dais's base instead of clustered to one side"), facing
  // the platform from the side opposite the gate/step, directly
  // reinforcing the existing "whoever held this before you" wave-5
  // gear-removal flavor text (wave_status.js) rather than being generic
  // clutter.
  const graveSpots = [
    [centerX - 2, centerZ - 3],
    [centerX, centerZ - 4],
    [centerX + 2, centerZ - 3],
  ]
  graveSpots.forEach(([gx, gz]) => {
    run(`setblock ${gx} ${wallY0} ${gz} minecraft:coarse_dirt`)
    run(`setblock ${gx} ${wallY0 + 1} ${gz} minecraft:oak_fence`)
  })

  // Abandoned Brick House (2026-09-01, docs/FEATURES.md's "Redesign
  // direction" - replaces the old hand-built single-room shack with a
  // real professionally-modeled structure, since no amount of /fill
  // detail fixed the "terrible" verdict on the old hand-typed shell).
  // Swapped in from Red Mansion the same day (direct feedback: "this
  // mansion is too big") - same mod, same postapocalypse aesthetic,
  // 12x13x11 (barely bigger than the original hand-built 11x11
  // footprint), real dimensions confirmed by decompiling the mod's own
  // NBT directly (DataVersion 3465 matches this pack's install exactly)
  // - not guessed. /place template loads a mod-registered structure the
  // same clean way as a vanilla one, already confirmed in a live sandbox
  // test for this same mod's Red Mansion. Its 8 chests/barrels already
  // carry LootTable refs pointing at
  // postapocalypse_structures:chests/{trash,cobwebs,food} - the exact
  // tables this pack already buffed with real treasure earlier this
  // session (see docs/QUEUE.md's Phase 3 entry) - so this is free
  // upgraded starting loot, not something that needed clearing/replacing.
  // Placed at floorY, not wallY0 - the building's own local y=0 layer is
  // its floor/foundation material (matching the courtyard's floorY
  // block below the walkable surface), so its local y=1 walkable ground
  // floor lines up exactly with the courtyard's own walkable surface at
  // wallY0 - placing at wallY0 instead would leave the building's floor
  // sitting 2 blocks above the courtyard, an awkward step up right at
  // its own front rather than a level walk-in (the exact bug caught and
  // fixed for the Red Mansion placement this same day).
  run(`place template postapocalypse_structures:abandoned_brick_house ${buildingX0} ${floorY} ${buildingZ0}`)

  // Same real bug class caught for the Red Mansion, confirmed present
  // here too by parsing this building's own NBT directly before
  // shipping: /place template bypasses the mod's own worldgen
  // block_ignore processor (which strips these during natural jigsaw
  // generation), and the raw NBT has a 78-block wet_sponge layer at its
  // own local y=0 (a "leave the terrain alone here" foundation marker)
  // that would otherwise show up as visible sponge across the ground
  // floor footprint. Replace-mode fill over just that one Y layer swaps
  // it for the same stone_bricks the rest of the compound floor uses.
  run(`fill ${buildingX0} ${floorY} ${buildingZ0} ${buildingX1} ${floorY} ${buildingZ1} minecraft:stone_bricks replace minecraft:wet_sponge`)

  // Pre-placed Tier 1 kinetic rig (2026-09-03, direct request: pre-place
  // a finished Rolling Mill "same way it already ships with a furnace
  // etc.", so the only remaining player task is crafting a Hand Crank
  // and connecting it).
  //
  // **Real hotfix 2026-09-03**: the original indoor spot (local x=4-6,
  // z=9 in the building's own NBT) was wrong - not bad math, a wrong
  // reading of the space. It turned out to be the open, unwalled yard
  // strip right outside the building's real entrance, not a room -
  // landed the rig in the walkway between the gate and the door,
  // exactly the live bug report ("blocking it"). Refit indoors first
  // (local x=7,z=5-7, beside the building's own furnace, confirmed
  // enclosed by parsing the structure's real NBT) - then **relocated
  // outdoors entirely 2026-09-05** (docs/FEATURES.md, direct request:
  // "the pre-placed Create rig... feels cramped inside the building -
  // relocate it to the yard too, off to one side, clearly secondary to
  // the pedestal"). Sits along the east wall, one courtyard row north
  // of the dais platform (rigZ = centerZ-2), a real gap from both the
  // platform (ends at centerZ-1) and the grave arc (starts at
  // centerZ-3) - checked against those real coordinates, not assumed
  // clear just because it moved outdoors.
  //
  // The Depot goes BENEATH the Press, not on top - confirmed from the
  // mod's own ponder text ("Input items can be dropped or placed on a
  // Depot under the Press"), the opposite of the Rolling Mill, which
  // takes items dropped directly onto itself. Outdoors, "beneath" means
  // the depot sits AT floorY (replacing one courtyard floor tile,
  // already solid stone_bricks from the fill above) with the Press
  // standing on top of it at wallY0 - the Mill sits at that same wallY0
  // height on ordinary floor, no depot needed under it. Both kinetic
  // blocks face the same direction (west, along this row's real open
  // run) so they share a rotation axis and conduct power to each other
  // through direct adjacency, no shaft needed - live-verified with a
  // temporary creative motor: both blocks showed a real nonzero Speed
  // and a single 3-block kinetic Network. Real gotcha hit during that
  // same verification: /setblock-ing a block's facing property in
  // place, without actually removing and replacing it, did not reliably
  // rebuild Create's kinetic network - Speed read 0 until the blocks
  // were cleared to air and placed fresh. Not a concern for this script
  // (each cell is placed exactly once, into real air, every time), but
  // worth knowing if this rig is ever hand-tuned again through repeated
  // /setblock calls in a live test.
  //
  // The cell west of the Mill is left open on purpose (closer to
  // center, away from the wall) - it's the next block in that same
  // kinetic line, reserved for the player's own Hand Crank, which (like
  // any hand-cranked source) needs a real player right-clicking it and
  // can't be pre-placed already turning.
  const rigZ = centerZ - 2
  const rigPressX = x1 - 2
  const rigMillX = x1 - 3
  run(`setblock ${rigMillX} ${wallY0} ${rigZ} createaddition:rolling_mill[facing=west]`)
  run(`setblock ${rigPressX} ${wallY0} ${rigZ} create:mechanical_press[facing=west]`)
  run(`setblock ${rigPressX} ${floorY} ${rigZ} create:depot`)
})
