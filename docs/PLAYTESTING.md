# Playtest setup

A repeatable way to test the pack without combat difficulty or manual
setup getting in the way. Almost everything is automatic (via
`pack/kubejs/server_scripts/playtest_starter_kit.js`). For what each
feature actually is, see [docs/FEATURES.md](FEATURES.md); this file is
just the "what to check on a fresh world" list.

**Rewritten 2026-09-01** — this file had grown into a full development
history (eleven rounds of shader tuning, multiple reverted world-gen
attempts, fog/darkness experiments all removed months ago) that
belonged in [docs/MODS.md](MODS.md), not a testing checklist. Trimmed
to what's actually live right now and worth checking.

## Automatic on first login to a new world

- **Starting gear**: a Sharpness 100 netherite sword (one-shots nearly
  everything, so testing focuses on systems, not combat skill) and full
  iron armor, given to inventory. The amulet (see below) also starts in
  inventory, unequipped.
- **Wave Horn**: right-click to summon the next wave.
- **Fixed spawn point** near world origin (`gamerule spawnRadius 0`, so
  respawns land there too), with a small walled starter base
  (SecurityCraft reinforced perimeter, one gate) and a watchtower to its
  north.
- **Worldborder** starts at 50, grows on every wave clear by an
  escalating amount (`20 + 5·floor((waveNumber-1)/2)`) — reaches 270 by
  wave 8.
- **Natural mob spawning disabled** — the Wave Horn is the only mob
  source.

Only fires on a genuinely new world — won't retroactively run on a
world you've already logged into once, and world-gen changes (biome,
structures) only affect chunks not yet generated.

## Manual setup (once per new world)

Just **Allow Cheats: ON** — any World Type selection works, the pack
forces the real generator via a datapack override regardless.

## What to check

**Wave Horn / core loop**
- The 8-wave designed campaign plays through as expected (vanilla mobs
  + TFTH mobs from wave 2, ravager mini-boss at 5 and 8), gear removal
  fires at wave 5 specifically (not tied to campaign length).
- **Endless phase (waves 9+), built 2026-09-01, not yet played through**:
  difficulty should keep escalating past wave 8 instead of repeating —
  the on-screen wave number should no longer cap at 8 either. Watch
  specifically for: does the horde-spawn distance (fixed at 240-256
  blocks) feel right against the worldborder, or too far/close? Does
  skeleton damage feel under-scaled relative to melee mobs (a known,
  unaddressed gap — scaling doesn't touch arrow damage)?
- Mobs spawn beyond the worldborder and walk in, staggered, with a
  sound cue before each — not clustered near the player.

**The amulet + pedestal**
- Amulet starts unequipped in inventory (not auto-equipped — this was
  deliberately changed after a duplication bug). Equipping it via
  Curios should apply Regeneration + Fire Resistance.
- Placing it on a crafted pedestal (`kubejs:amulet_pedestal`) should
  redirect wave-mob targeting to the pedestal instead of the player, and
  allow crossing the worldborder without being pushed back.
- The floating-item visual on the pedestal: alignment/bob was fixed
  2026-08-31 but the exact height is a reasoned estimate, not
  pixel-verified — worth a visual check.

**Tier 1 defenses**
- Craft Trapcraft's Spikes and Bear Trap (both from Common-tier loot
  materials) and plain vanilla oak fence. Bear Trap should hold a mob in
  place on contact and be resettable; Spikes should damage on contact.

**Structure generation** (rebuilt twice — desert-only dropped, then a
fantasy/floating-content swap, both since confirmed shipping)
- World should show real biome variety (desert, badlands, savanna,
  plains, sunflower_plains, meadow) rather than one biome everywhere.
- Treasure2 structures, Apocalypse structures: Abandoned city buildings,
  and Abandoned Urban should all generate within reasonable range of the
  worldborder (spacing was retuned specifically for this).
- **A Treasure2 "cardboard box" that won't open and doesn't look like a
  chest is a real mimic monster, not a bug** — deliberately left
  undocumented in-game, this is expected behavior.
- World creation has crashed intermittently in the past from a real
  vanilla/Forge structure-generation race condition — mitigated by
  moderate structure spacing, not fully eliminated. If it recurs, check
  the crash report's own Details/Feature section for which structure was
  involved before assuming it's the newest thing added.

**FTB Quests**
- Book auto-given on first login. "Basics" chapter (12 quests including
  2 amulet side-quests) and "Tier 1" chapter (2 quests, both gated on
  Basics quest 6) should both be present and gate correctly.
- Clicking an item icon in a quest should jump to JEI showing its
  recipe (FTB XMod Compat).
- Quest 10's flavor text still describes wave 8 as a permanent dead end
  ("the same night, over and over") — inaccurate now that endless phase
  scaling exists, needs a rewrite, not yet done.

**SecurityCraft walls**
- A summoned zombie shouldn't be able to dig through a wall segment or
  blast through it with a creeper. Pillaring over the top is a known,
  accepted gap (wall height wasn't changed to prevent it).

## Known, accepted gaps (not bugs to report)

- Skeleton's arrow damage isn't affected by the endless-phase toughness
  scaling (only melee `attack_damage` is scaled).
- Zombie pillaring over the chokepoint walls is possible — an accepted
  difficulty factor, not something the reinforced material is meant to
  stop.
- The vanilla jigsaw structure-generation race condition (see above) is
  mitigated, not guaranteed gone.
