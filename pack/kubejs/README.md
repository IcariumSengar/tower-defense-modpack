# KubeJS scripts

Glue code that turns the pack's mods into the tower-defense game: the wave
loop, the pedestal objective, mob steering, trap and turret behaviour, loot,
quests and the world setup. Needs KubeJS, Rhino and Architectury (see
[docs/MODS.md](../../docs/MODS.md)).

## Layout

- `startup_scripts/` registers the custom items and blocks (amulet, lure
  block, shrapnel). Runs once at game start.
- `server_scripts/` is everything that runs in the world. `/reload` re-runs
  these files, but commands registered in `ServerEvents.commandRegistry` only
  change after a full restart.
- `client_scripts/` holds the tooltip colours and tier labels.
- `data/` is datapack content: loot tables, tags, worldgen and structures.
- `assets/` has textures, models and sounds for the custom items.

## Where things live

| Area | Files |
| --- | --- |
| World setup | `playtest_starter_kit.js` (base site, starter base, pedestal, marker, kit, forceloading), `world_state.js` |
| Wave loop | `wave_spawner.js` (horn, wave roster, spawning), `wave_status.js` (remaining count, wave clear, countdown), `boss_wave.js`, `base_expansion.js`, `wave_airdrop.js` |
| Pedestal | `pedestal_health.js`, `pedestal_destruction.js`, `pedestal_upgrades.js`, `amulet_*.js` |
| Mob steering | `mob_aggro.js`, `stuck_mob_nudge.js`, `ladder_climb_assist.js`, `wave_mob_dig_haste.js`, `lure_block.js`, `no_passive_mobs.js`, `enhanced_hordes_config.js` |
| Defences | `securitycraft_traps.js`, `trap_durability.js`, `wave_mob_fence_shock.js`, `wave_mob_spike_slow.js`, `sentry_*.js`, `tesla_coil_*.js`, `tier4_turret_fx.js`, `starter_flux_network.js`, `gun_damage_bump.js` |
| Player safety | `explosion_player_safety.js`, `electric_trap_player_safety.js`, `mine_player_safety.js`, `omtreborn_grenade_safety.js` |
| Loot and progression | `loot_*.js`, `structure_*.js`, `bounty_kills.js`, `quest_milestones.js`, `flesh_death_sound.js`, `tier*_recipes.js` |
| Hardcore | `hardcore_toggle.js`, `hardcore_death.js`, `hardcore_totem_recipe.js` |

## Shared state and rules

- Run state (wave number, pedestal position and HP, one-shot flags) lives in
  `worldData(level)` from `world_state.js`: the persistentData of an invisible
  marker armor stand tagged `td_pedestal_target` at the pedestal, in the
  overworld. It survives restarts and every player sees the same values. Keys
  start with `td_`. It is null until the base is built, so readers check for
  that. Never keep run state in `player.persistentData`.
- Plain JS variables reset on every restart and `/reload`. Use them only for
  caches that can be rebuilt.
- `td_wave_mob` marks a mob a wave spawned (wave summons, bosses, and Undead
  Nights hordes). Only these mobs are steered, counted, rewarded or hit by
  base defences. Never decide that a mob is a wave mob from its entity type:
  the same types spawn inside structures. `td_structure_guard` marks stash
  guards, which base defences leave alone.
- The action bar is one shared line. Only the countdown (`wave_spawner.js`)
  and the hostile counter (`wave_status.js`) write it; other features expose a
  text function (`pedestalAlertActionbarText`, `airdropInboundActionbarText`)
  that those writers show first.
- Two `/title` commands in the same tick overwrite each other; queue the
  second with `queueDelayedTitle` (`wave_status.js`).
- Some jars in `pack/mods` are patched (listed in docs/MODS.md under "Patched
  jars"). Updating one of those mods means redoing its patch.

## Writing scripts for this Rhino build

KubeJS 2001.6.5 runs scripts on Rhino, which differs from a modern JavaScript
engine in ways that have each caused a shipped bug in this pack.

Scope and load order:

- Every file in `server_scripts` is evaluated into one shared scope. Two files
  that declare the same top-level name share one binding, and the file loaded
  last wins; a top-level `const` that clashes with any other file's name stops
  that whole file from loading. Give top-level names a file-specific prefix.
- KubeJS sorts files only by a `// priority: N` header; otherwise they load in
  directory-listing order (alphabetical on Windows, not guaranteed on Linux).
  Use another file's functions and variables inside event handlers, never
  while the files are still loading.

Language:

- Use `var` inside functions. A `const` or `let` in a loop body keeps its
  first value; one in a block of a function that also creates a closure
  throws "redeclaration of var" when it runs.
- A `function` declaration inside a `try` block doesn't hoist; write
  `var name = function () {...}`.
- `Math.PI` and `Math.E` are undefined; write the number.
- Java `long` values (`level.getTime()`, NBT `getLong`) need `Number()` before
  `===` or arithmetic you store. A Java `String` from NBT needs
  `` `${s}` `` before JS string methods such as `split`.

Minecraft and KubeJS APIs:

- Entity position is `getX()`/`getY()`/`getZ()`; bare `.x` is NaN.
- `level.isClientSide` without parentheses is always truthy; call
  `isClientSide()` (server scripts never need the guard).
- `setDeltaMovement(x, y, z)` and `push(x, y, z)` throw; pass a `Vec3d`.
- `event.cancel()` ends the handler by throwing, so call it last.
- `server.runCommandSilent` runs one console-level command positioned at the
  overworld world spawn, so `~ ~ ~` means spawn: use
  `execute as @a at @s run playsound ... @s ~ ~ ~` to reach each player.
  `level.runCommandSilent` runs once per player in that level (never with
  nobody online), and `player.runCommandSilent` has only the player's
  permission level.
- A positional `playsound` reaches players within 16 blocks (more only with a
  volume above 1 or a minimum volume); `particle ... force` reaches 512.
- `PlayerEvents.tick` runs once per online player per tick (also for a player
  on the death screen) and never with nobody online. World-level work belongs
  in `ServerEvents.tick`, or needs a once-per-tick guard.
- `EntityEvents.hurt` is Forge's LivingAttackEvent: it fires for every attack
  attempt, including ones the invulnerability window cancels.
- `EntityEvents.spawned` also fires for entities loaded from disk, so
  once-per-entity work needs a saved guard tag. `BlockEvents.placed` and
  `BlockEvents.broken` fire only for players, never for `/setblock`, `/fill`
  or structure placement.
- `PlayerEvents` has no death event; player deaths arrive through
  `EntityEvents.death`.
- `/summon` with an NBT argument skips `finalizeSpawn`, so the mob gets no
  spawn-time equipment or mod bonuses; give it what it needs in the NBT.
- `LevelEvents.afterExplosion` runs before the blast applies damage and breaks
  blocks, and its affected entity and block lists can be edited there.
  `getExploder()` is the blast's indirect source (null for many mod blasts).
- `DamageSource.getType()` returns the damage type's message id (for example
  `securitycraft.electricity`), not its registry id.
- Players-only command arguments (`tellraw`, `title`, `ftbquests
  change_progress`) reject a raw UUID; use the player's name or
  `execute as <uuid> run ... @s`.

Reflection:

- `java.*` and `Packages.*` are disabled. Files reach `Class.forName` by
  finding it by signature on `anyObject.getClass().getClass()`.
- Minecraft members have SRG names at runtime (`m_12345_`), so match methods
  by shape (parameter and return types), and make sure the shape matches
  exactly one method: `getMethods()` order changes between launches. Other
  mods' classes keep their real names.
- `Method#invoke` does not convert JS values to Java types: box numbers
  through `Integer.valueOf(String)`/`Long.valueOf(String)`, and don't pass JS
  arrays or functions.

## Content conventions

- Recipes: an `event.remove({ output })` before a recipe replaces the stock
  one; otherwise it is an extra route. Added recipes get explicit ids.
  Inputs should come from loot, loot bags or wave-mob drops.
- When a trap, turret or support item is added or cut, update
  `client_scripts/tooltip_tier_colors.js` and the quest book
  (`pack/config/ftbquests/quests/chapters/campaign.snbt`) in the same change.
  Quest task ids used by scripts must match that hand-edited file;
  `tools/quest_book/gen_quests.py` is out of date.
- BountyBags turns `data/bountybags/loot_tables/items/*.json` into
  `config/bountybags/*.toml` only when the TOML is missing, and the TOML wins
  after that; delete the TOML after editing the JSON.

## Checking a change

Run `node --check <file>` after every edit: a syntax error stops the whole
file from loading, and the game only reports it in the log. Then load a world
and check `logs/kubejs/server.log` for "Loaded N/N KubeJS server scripts ...
with 0 errors".
