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
// X/Z are hardcoded to (0, 0) — vanilla's own default flat-world spawn
// already lands within a few blocks of the origin, so this doesn't
// relocate anything surprising. Y is deliberately NOT hardcoded: flat
// worlds use whatever layer preset the player picked at world creation,
// and guessing that height risks spawning underground or floating (the
// same class of "assumed it'd just work" bug this codebase has hit
// before). Instead, groundY is read from the player's own Y at the
// moment of this first natural login — vanilla has already placed them
// standing safely on the real flat surface for THIS world's preset, so
// that's the ground truth, not an assumption.
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

  // Ground truth read BEFORE any teleport — vanilla's own natural
  // first-spawn Y for this world's flat preset, not a hardcoded guess.
  const groundY = Math.floor(player.getY())
  const x = 0
  const y = groundY
  const z = 0
  const half = 5

  // Pin every future respawn to this exact point (docs/IDEAS.md's
  // "Fixed spawn" plan) - spawnRadius 0 removes vanilla's default ~10
  // block first-spawn scatter, so this is the actual landing spot, not
  // just a nearby nudge target.
  event.server.runCommandSilent(`setworldspawn ${x} ${y} ${z}`)
  event.server.runCommandSilent('gamerule spawnRadius 0')
  // Move the player here too, for this first login specifically -
  // setworldspawn only affects *future* respawns, not where vanilla
  // already placed them just now. @a, not @s - this runs from the
  // server console command source (event.server), which has no "self"
  // for @s to resolve against (same reasoning as every command below
  // and throughout wave_status.js/wave_spawner.js); @a is equivalent
  // here since this pack is single-player-focused.
  event.server.runCommandSilent(`tp @a ${x + 0.5} ${y} ${z + 0.5}`)

  // Center the border on the same fixed point, not wherever the player
  // happened to be standing — matches the manual setup step from
  // docs/PLAYTESTING.md, now automatic.
  event.server.runCommandSilent(`worldborder center ${x} ${z}`)
  event.server.runCommandSilent('worldborder set 50')

  const x0 = x - half
  const x1 = x + half
  const z0 = z - half
  const z1 = z + half
  const floorY = y - 1
  const wallY0 = y
  const wallY1 = y + 2
  const doorX = x

  const run = (cmd) => event.server.runCommandSilent(cmd)

  run(`fill ${x0} ${floorY} ${z0} ${x1} ${floorY} ${z1} minecraft:stone_bricks`)
  run(`fill ${x0} ${wallY0} ${z0} ${x1} ${wallY1} ${z0} minecraft:cobblestone`)
  run(`fill ${x0} ${wallY0} ${z1} ${x1} ${wallY1} ${z1} minecraft:cobblestone`)
  run(`fill ${x0} ${wallY0} ${z0} ${x0} ${wallY1} ${z1} minecraft:cobblestone`)
  run(`fill ${x1} ${wallY0} ${z0} ${x1} ${wallY1} ${z1} minecraft:cobblestone`)
  run(`fill ${x0 + 1} ${wallY0} ${z0 + 1} ${x1 - 1} ${wallY1} ${z1 - 1} minecraft:air`)
  run(`setblock ${doorX} ${wallY0} ${z1} minecraft:oak_door[facing=south,half=lower]`)
  run(`setblock ${doorX} ${wallY0 + 1} ${z1} minecraft:oak_door[facing=south,half=upper]`)
})
