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
  (SecurityCraft reinforced perimeter, one gate) wrapped around a
  pre-placed building (Abandoned Brick House, `postapocalypse_structures`).
- **Worldborder** starts at 150 (raised from 50 on 2026-09-09 so the
  whole wave-mob spawn band fits inside it), grows on every wave clear
  by an escalating amount (`5 + 5·floor((waveNumber-1)/3)`) — reaches
  225 by wave 8.
- **Flat field**: the ground is levelled to one plane out to 4 blocks
  past the starting border edge (a 159×159 square) before the base is
  built — no pits, rises, water or lava pockets anywhere inside it.
  Check the field edge for a clean step down/up to natural terrain.
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
- Mobs spawn a fixed 48-64 blocks from the pedestal (inside the border,
  never closer, since 2026-09-09) and walk in, staggered, with a sound
  cue before each — nothing should ever appear inside or against the
  compound walls.
- Boomer Zombies are out of every wave (pulled 2026-09-09 for balance)
  and out of the quest book (2026-09-10) — seeing one anywhere is a bug.
- **Enemies climb ladders — rebuilt 2026-09-10, first pass mostly
  failed, re-fixed same day (retaliation now holds for 8s per hit in
  `mob_aggro.js`).** Stand on the wall top and shoot a wave mob: for the
  next 8 seconds it should chase you instead of the pedestal, walk to
  the foot of the nearest ladder that reaches your height, press into it
  and climb, then step off at the top. Stop hitting it and it should go
  back to the pedestal after ~8s. Watch for: mobs still bouncing between
  you and the pedestal, mobs bobbing at the top without stepping off.
  **Known limit**: wide mobs (Mutant Brute, Mutant Zombie) can't fit
  their feet into a ladder column against a wall and will never climb.
- **Airdrop cues — 2026-09-10, not yet seen in play.** On a wave-5/10/15
  clear the plane no longer launches in the same instant as the
  wave-cleared popup: 12 seconds later a "LOOK UP" title + bell sound
  fires as the plane spawns (the plane's own engine sound plays too),
  and a "Supply crate down - it's marked on your map" subtitle fires the
  moment the crate lands. Check the "LOOK UP" actually precedes the plane
  passing overhead, and that the landing line fires once, not repeatedly.
- **Pedestal under-attack alert is now action-bar text** (2026-09-10, the
  second "smaller font" ask) — it replaces the hostiles-remaining counter
  / next-wave countdown line for 4 seconds, with the same anvil sound and
  gold chat line. Confirm it's readable and that the counter comes back.

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
- Craft the Spike Trap (4 sticks + 1 iron ingot) and plain vanilla oak
  fence. (Bear Trap and Slime Trap were removed 2026-09-10; the old Bear
  Trap check below is history.) Bear Trap should hold a mob in
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
- **Structure spawners, built 2026-09-10, not yet playtest-confirmed**:
  6 structures now carry real mob spawners (`abandoned_brick_house`,
  `abandoned_urban:gas_station`/`fire_tower`, `philipsruins:
  desert_pyramid`, `watchtower_building:ab_watchtower_big_tower`,
  `abandoned_structures:zapravka`), 1-3 each, tougher further from
  spawn. This could only be verified up to the point of "the spawner
  block/NBT is correct" in this environment (no connected player to
  actually trigger one) — the real things to check in play: does a
  spawner actually produce mobs when you're nearby, do those mobs stay
  and guard the structure (attack you) rather than walking off toward
  the base/pedestal, and does killing one drop a loot bag/count toward
  a Bounty quest like a normal kill.
- **Structure mobs stay put — fixed 2026-09-10 after the "attacked by a
  tonne of mobs at spawn" playtest, needs a fresh world to confirm**:
  the starter house no longer carries a spawner, and only real wave
  mobs (tagged `td_wave_mob`) are ever pulled toward the pedestal —
  husks baked into desert ruins/outposts and spawner guards keep their
  own AI where they are. Check: nothing attacks you at spawn-in; ruins
  and outposts still have husks/pillagers in them when you walk up;
  waves 1-8 behave as before; and an endless wave (9+) still shows a
  live "hostiles remaining" count that reaches 0 and clears — that
  phase's mobs now get tagged right after the horde spawns, so a wave
  that never clears or a count stuck above 0 would mean the tagging
  missed some.
- **Wasteland re-skin + one-tag structure gating, built 2026-09-10,
  not yet seen in-game**: plains/sunflower_plains/meadow now use
  badlands' dead-grass colours, no trees/flowers/tall grass, dead
  bushes, and ~60% coarse-dirt patches through the surface; every
  structure generates in every biome. Needs a **fresh world** (biome and
  structure changes only affect new chunks). Things to judge that
  couldn't be checked here: does the grass/foliage colour actually read
  as dead wasteland rather than "sick green"? Is the coarse-dirt ratio
  too barren (a one-band tweak if so)? Do Lost City towers/camps,
  fire towers, and the desert ruins/outposts now show up within a few
  hundred blocks? Does a `u_desert` oasis in dead plains look wrong
  enough to pull back to desert-only?

**Game over / hardcore (2026-09-10 rework, needs a real death to confirm)**
- Pedestal destroyed: one popup — "GAME OVER" with "The pedestal has
  fallen" as its subtitle and a wither sting — then a "start a new world"
  subtitle 5 seconds later. Not two separate popups any more.
- `/hardcore enable`, then die: "GAME OVER / Hardcore: you have fallen"
  on the death screen, then ~4 seconds later you are disconnected from
  the world with the game-over text as the reason. **You should never get
  a working Respawn** — clicking it inside those 4 seconds should
  disconnect you immediately instead. Reopening the world drops you in
  as a spectator with a GAME OVER reminder. Quest progress does NOT
  carry into a new world (the carryover feature was dropped 2026-09-10).

**Second batch, 2026-09-10 (19 items) — what to look for**
- Chat at a wave start is exactly one line, "Wave 3 has started." /
  "Horde 9 has started." — no "Difficulty level set to", no "Trying to
  spawn hordes", no "A horde has spawned!". The horde scream should still
  play at an endless wave start.
- Past wave 8 every label says Horde: "HORDE 9" / "The horde
  approaches...", "HORDE 9 CLEARED", the hostiles bar, "Next horde in",
  and "HORDE 10: BOSS".
- Wave 10 brings The Behemoth (bossbar, pigstep, "[Boss]" line). It never
  spawned before this batch.
- Wave 8 has four Crawlers.
- The supply plane is about three times slower (roughly 7 s in view);
  the crate should still land 10-30 blocks from you. Once you've taken
  everything out of the crate it puffs away on its own within a second.
- The world-border line on the world map (M) is half as thick and light
  blue instead of red.
- No Boomers, Explosive/Cursed/Tank Zombies, Brutes or Spitters wandering
  in at night outside the waves — they only arrive with a wave, a horde,
  or from a structure spawner.
- Legendary bags hand out a Totem of Undying far less often (~1 in 8 bags).
- The Last Written Wave and The Behemoth quest texts are spoiler-free.
- The quest book reveals itself as you go: on a fresh world only You're
  On Your Own is visible; each quest appears when the one before it
  completes (the tinted rib panels stay visible as empty placeholders).
  Bounties show one tier at a time.
- Tier 1 is Spike Trap and Barbed Wire only - no Slime Trap or Bear Trap
  quests, no bear trap in JEI. The starter base still has its Stake Walls.

**FTB Quests**
- "Open It" should tick the moment you right-click any loot bag, and
  "Wear It" the moment the amulet goes into the Curios slot (both were
  silently broken until 2026-09-10 — a UUID-addressed command FTB Quests
  rejects). On a world where you already tried them, each gets exactly
  one retry: open another bag / re-equip the amulet.
- Bounty tasks show a real item icon (rotten flesh, swords, legendary
  bag) instead of FTB's rainbow "custom" placeholder, and a kill counter
  that fills 1/25, 2/25... First Blood should complete at exactly 25
  kills, Exterminator at 100 — NOT all five on the first kill (that was
  the 2026-09-10 max-progress bug, fixed the same day).
- "It's Up to You Now" is invisible until wave 5 clears, then appears
  between Three Down and The Last Written Wave with its diary text. The
  Tier 3 rib and The Last Written Wave now hang off Three Down, so they
  should still be visible (locked) before wave 5.
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
