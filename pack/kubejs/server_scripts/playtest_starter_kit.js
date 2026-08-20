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
// World type switched from Superflat to Single Biome: Desert (2026-08-20,
// docs/IDEAS.md's "creating a world that isn't entirely flat" ask) — see
// docs/PLAYTESTING.md's manual setup step. This invalidated the original
// "read the player's own natural spawn Y" ground-finding trick: that was
// only safe because Superflat height is uniform everywhere, so wherever
// vanilla's default ~10-block spawn scatter landed the player, the
// height matched (0,0)'s height too. Real terrain varies within that
// same scatter radius (dunes, small hills), so a Y read from a scattered
// position can no longer be trusted for (0,0) specifically. Fixed with
// `/spreadplayers` instead — the standard vanilla heightmap-aware
// "place on solid ground near this X,Z" command (avoids voids/liquids,
// used for exactly this class of problem) — then reads the player's
// actual resulting position as the ground truth, rather than assuming a
// height. maxRange kept small (8) so this still reads as "the same
// fixed spot," not a materially different location each world.
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
  const half = 5

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
  // Wave mobs now deliberately spawn just beyond the border
  // (wave_spawner.js, docs/IDEAS.md's Fog Wall design) and walk in -
  // without this, vanilla's default border damage would chip them (and
  // the player, near the edge) for no reason this pack actually wants;
  // the border here is a containment/staging boundary, not a
  // shrinking-zone mechanic.
  event.server.runCommandSilent('worldborder damage amount 0')

  const x0 = x - half
  const x1 = x + half
  const z0 = z - half
  const z1 = z + half
  const floorY = y - 1
  const wallY0 = y
  const wallY1 = y + 2
  const doorX = x

  const run = (cmd) => event.server.runCommandSilent(cmd)

  // Real terrain isn't flat under the footprint the way Superflat was -
  // level it explicitly rather than assuming a single Y works
  // everywhere across an 11x11 area: a solid stone foundation a few
  // blocks down covers any local dips (small dunes), and clearing
  // headroom well above the walls covers any local rises or stray
  // foliage before the walls themselves go up.
  run(`fill ${x0} ${floorY - 3} ${z0} ${x1} ${floorY} ${z1} minecraft:stone`)
  run(`fill ${x0} ${wallY0} ${z0} ${x1} ${wallY1 + 3} ${z1} minecraft:air`)
  run(`fill ${x0} ${floorY} ${z0} ${x1} ${floorY} ${z1} minecraft:stone_bricks`)
  run(`fill ${x0} ${wallY0} ${z0} ${x1} ${wallY1} ${z0} minecraft:cobblestone`)
  run(`fill ${x0} ${wallY0} ${z1} ${x1} ${wallY1} ${z1} minecraft:cobblestone`)
  run(`fill ${x0} ${wallY0} ${z0} ${x0} ${wallY1} ${z1} minecraft:cobblestone`)
  run(`fill ${x1} ${wallY0} ${z0} ${x1} ${wallY1} ${z1} minecraft:cobblestone`)
  run(`setblock ${doorX} ${wallY0} ${z1} minecraft:oak_door[facing=south,half=lower]`)
  run(`setblock ${doorX} ${wallY0 + 1} ${z1} minecraft:oak_door[facing=south,half=upper]`)
})
