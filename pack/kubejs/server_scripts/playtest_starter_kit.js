// Playtest convenience only — not real pack design. On a player's first
// join to a world, gives an overpowered weapon and fills in a small
// starter base around their spawn point, so a fresh Superflat test world
// is immediately playable without manual setup each time.
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

PlayerEvents.loggedIn((event) => {
  const player = event.player
  const data = player.persistentData

  if (data.getBoolean('td_playtestKitGiven')) return
  data.putBoolean('td_playtestKitGiven', true)

  player.give(Item.of('minecraft:netherite_sword', 1, '{Enchantments:[{id:"minecraft:sharpness",lvl:100}]}'))
  player.give(Item.of('kubejs:wave_horn', 1))

  event.server.runCommandSilent('gamerule doMobSpawning false')

  const x = Math.floor(player.getX())
  const y = Math.floor(player.getY())
  const z = Math.floor(player.getZ())
  const half = 5

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
