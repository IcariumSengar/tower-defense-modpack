# Playtest setup

A repeatable way to test the pack without combat difficulty or manual
setup getting in the way. Almost everything is automatic (via
`pack/kubejs/server_scripts/playtest_starter_kit.js`). For what each
feature actually is, see [docs/FEATURES.md](FEATURES.md); this file is
just the "what to check on a fresh world" list.

**Refreshed 2026-09-16** — the previous version (last rewritten
2026-09-01) had gone stale again: it still described a Tier 1-only
defense line and a right-click Wave Horn item, both wrong by this
point, and had no mention of Tier 2/3/4 defenses at all despite them
being built and live. Full old text (useful for a history of what was
checked at each point) is archived at
[docs/archive/playtesting-history-2026-09.md](archive/playtesting-history-2026-09.md).

## Automatic on first login to a new world

- **Starting gear**: a Sharpness 100 netherite sword and full iron
  armor, given to inventory (not equipped). A Flux Configurator too, for
  manually re-linking the starter power rig if the automatic link ever
  fails. The amulet also starts in inventory, unequipped.
- **No Wave Horn item any more** (removed 2026-09-13) — the horn is now
  a real note block placed upstairs in the starter house's power-rig
  room; right-click it to summon the next wave.
- **Fixed spawn point**, chosen at world-load time on a town-free
  desert/badlands "anchor grid" point that every structure set keeps
  clear (nothing within ~150 blocks), with a small walled compound
  (SecurityCraft reinforced perimeter + Stake Walls, one gate) wrapped
  around a pre-placed building (the Lost City cafe, `the_lost_city:cafe4`,
  since 2026-09-22).
- **Starter trap showcase**, pre-built into the compound wall so a new
  player sees working examples before crafting anything: a Tesla Coil
  (wall-mounted, upright, lever-toggled — only auto-powers when a real
  wave mob is nearby), a Sentry, and an Electrified Iron Fence sealing
  the gate opening. All three are removed again at wave 5, same beat as
  the starter gear, so from wave 5 on you're defending with what you
  built, not what you inherited.
- **Worldborder** starts at 50, grows on every wave clear by
  `5 + 5·floor((waveNumber-1)/3)` blocks (5/5/5/10/10/10/15/15 across
  waves 1-8, reaching 125 total by wave 8), and keeps escalating the
  same way into the endless phase.
- **Flat field**: the ground is levelled to one plane out to the
  starting border edge (roughly 59×59) before the base is built — no
  pits, rises, water or lava pockets anywhere inside it.
- **Natural mob spawning disabled** worldwide — waves are the only mob
  source.

Only fires on a genuinely new world — won't retroactively run on a
world you've already logged into once, and world-gen changes (biome,
structures) only affect chunks not yet generated.

## Manual setup (once per new world)

Just **Allow Cheats: ON** — any World Type selection works, the pack
forces the real generator via a datapack override regardless.

## Core wave loop

- Right-click the upstairs note block (or wait out the countdown, which
  has a 10-minute floor) to start the next wave. 8 hand-authored waves,
  then an endless phase (waves 9+, labeled "Horde N" instead of
  "Wave N") handed off to Undead Nights' own difficulty system —
  nothing repeats, difficulty keeps climbing.
- **Mob roster is zombie-family only** — no skeleton, spider, creeper,
  wither_skeleton or vanilla ravager anywhere (stripped pack-wide in the
  zombie-apocalypse pivot). Roster is vanilla zombie/husk/drowned/
  zombie_villager/zombified_piglin, TFTH's infected "Flesh X" mobs,
  Undead Nights' Horde/Elite/Demolition Zombie, and Mutants and Zombies'
  8 mobs (Crawler, Spitter, Blister/Split Head/Mutant Zombie, Rotten
  Mutant, Zombie Brute, Mutant Brute). Zombie/Mutant Brute are locked
  out before wave 20 (both hand-authored and endless).
- Gear removal (starter sword + armor) and the starter trap showcase's
  removal both fire at wave 5.
- **Boss waves every 10th wave** (10, 20, 30...): odd index is **The
  Reaper** (a reskinned Elite Zombie — 200 HP, 24 attack, 0.36 speed,
  iron armor, chosen for speed/damage over an unkillable tank), even
  index is **The Demolisher** (Demolition Zombie — 350 HP, 15 attack,
  netherite armor, throws live TNT and can breach undefended blocks).
  A boss kill always drops a Sentry, 12 Shrapnel, and a guaranteed Totem
  of Undying.
- Mobs spawn from a safe band outside the compound (48-64 blocks once
  the border has grown enough to fit it, clamped tighter early on so
  nothing spawns past the border) and walk in, staggered, with a sound
  cue before each — nothing should ever appear inside or against the
  compound walls.
- **Ladder climbing**: hitting a mob makes it chase you instead of the
  pedestal for 8 seconds per hit, climbing a ladder if that's the way to
  reach you, then returning to the pedestal once the window lapses.
  Mutant/Zombie Brute are too wide to fit a ladder column and never
  climb — a known, accepted limit.
- **Lure Block** (Target block + rotten flesh + redstone): pulls any
  wave mob within 40 blocks off the pedestal for 60 seconds, then
  self-destructs.
- **Airdrops** land every 5th wave clear (5, 10, 15...): ~12 seconds
  after the wave-cleared popup a "LOOK UP" title + bell plays as the
  plane spawns 200 blocks west of the base and crosses it on a real
  ~10-second flyover before the crate drops 50-70 blocks from the
  pedestal, on the eastern side; a beacon beam on top of the crate marks
  the landing spot until the crate is opened, the action bar shows the
  crate's coordinates for 20 seconds, and chat gets a Xaero "Supply Drop
  shared a waypoint" line - click Add, then confirm, to put it on your
  map (Xaero's Minimap has no way for a server to add a waypoint
  silently). The crate and its beacon despawn shortly after the crate is
  emptied.
- **Pedestal under-attack alert** is action-bar text (not chat) that
  replaces the hostiles-remaining/countdown line for 4 seconds, with an
  anvil sound and a gold chat line alongside it.

**The amulet + pedestal**
- Amulet starts unequipped; equipping it via Curios (necklace slot)
  should apply Regeneration + Fire Resistance.
- Placing it on a crafted pedestal (`kubejs:amulet_pedestal`) redirects
  wave-mob targeting to the pedestal and lets you cross the worldborder
  without being pushed back — this is a permanent objective marker, not
  amulet-gated, and exists from world creation regardless.

**Multiplayer**: shared campaign state (wave number, pedestal HP, horn
cooldown, etc.) lives on a permanent world-level marker entity, not a
player, specifically so a second player joining an existing world
doesn't desync the campaign or re-trigger the base build. Built
2026-09-08, still not verified against an actual second live player.

## Tier 1: Simply Traps

- **Spike Trap** (`simply_traps:spike_trap`) — 5 iron ingots (a diamond
  shape), damage doubled over the mod's stock value via config. The
  cheap, no-power option. Since 2026-09-27 it also gives wave mobs
  Slowness II while they're in it, lingering 1.5-2s after they step off
  (`wave_mob_spike_slow.js`; wave mobs only, not structure mobs or you).
- **Stake Walls** are already mounted on the compound's own perimeter
  walls (wall-mounted, non-solid, continuous contact damage on anything
  climbing past) — nothing to craft to see them, though the recipe
  (4 logs → 4) exists if you want more elsewhere.
- No Bear Trap, no Slime Trap, no Barbed Wire — all removed with no
  replacement (Trapcraft dropped entirely 2026-09-08, Create/Create:
  Crafts & Additions removed entirely 2026-09-11).

## Tier 2: SecurityCraft traps

All single crafting-table recipes on plain vanilla materials — no
Universal Block Reinforcer needed anywhere (it's been stripped from the
pack, along with Trophy System, which had nothing to shoot down in this
mob roster).
- **Sentry** — auto-fires at wave mobs, ~20 ingots' worth including its
  Portable Radar prerequisite.
- **Cage Trap** — non-lethally traps a mob/player in a block cage,
  ~12 ingots' worth.
- **I.M.S.** — refillable mine holding up to 4 Bouncing Betties,
  ~16 ingots' worth.
- **Electrified Iron Fence** — shocks anything but its owner on contact,
  and (since 2026-09-22) shocks any wave mob standing in a block next to
  it for 6 a second - the mod's own contact trigger never fired on mobs
  because their path ends on the adjacent block, 0.2 short of touching.
- **Bouncing Betty** and **Claymore** — stock recipes, unchanged.
- Check: a Bouncing Betty or Claymore going off near your own build
  should never damage you or break a block — only a mob standing in the
  blast should take damage.

## Tier 3: Immersive Engineering + Flux Networks

- **Culinary Generator** (Generator Galore) — reached via a short
  Copper → Iron → Gold → Culinary crafting ladder, burns any food item
  including rotten flesh. Output is boosted well past the mod's stock
  value so one generator alone should power the Tesla Coil and both
  turrets below running at once.
- **Tesla Coil** — re-recipied onto lightning rod + LV coils + gold
  block/steel + a Flux Point (no IE ore-processing chain needed). Zaps
  one random living thing within 6 blocks and applies a lesser field to
  everyone else within 9 (this is real, intended mod behavior, not a
  bug) — it has no owner check, so it also has an auto-power cutoff that
  goes idle whenever a player or Sentry is within its detection radius,
  and player/Sentry hits are neutralized (no damage, no stun) as a
  backstop.
- **Gun Turret** and **Chemthrower Turret** (single-target, unlike Tier
  4's turrets below) — each built with a Tier 2 SecurityCraft item
  (Sentry / Electrified Iron Fence) plus a Flux Point spliced into the
  recipe, so they arrive already wired for wireless power.
- Sophisticated Storage barrels and a Refined Storage network round out
  storage — both ship with their stock recipes, no re-tiering.

## Tier 4: Open Modular Turrets Reborn

- **Grenade Turret** — cheap, Tier II internals, ammo is fully
  vanilla/loot materials (iron nugget + redstone + gunpowder).
- **Rocket Turret** — the flagship, Tier III internals plus a Ferronite
  Frame (~17 Ferronite ingots for one turret). Ferronite has an
  alternate recipe (2 Steel + redstone) alongside the mod's own ore/
  smelting chain, so it doesn't hard-depend on finding the ore.
- Both are single crafting-table builds (no workbench/blueprint step)
  and plug straight into a Flux Networks grid via a Flux Plug on the
  Turret Base — no recipe hack needed the way Tier 3's turrets needed
  one.
- Both deal real area damage (unlike Tier 3's single-target turrets),
  but are configured not to hurt blocks or players: block damage is off
  by the mod's own default (pinned in `omtreborn-common.toml`), player
  targeting is globally disabled the same way, and the Grenade Turret's
  own small vanilla explosion is separately neutralized by script.
- Check: a Flux Plug against a Turret Base actually delivers power, both
  heads fire and land area damage on approaching mobs, and a Grenade
  Turret kill leaves the terrain and you untouched.

## Quest book

Auto-given on first login. 4 chapters:
- **Campaign** — the main story/tier-progression line (Basics → Tier 1
  → Tier 2 → Tier 3 → Tier 4, plus the amulet side-quests and wave
  milestones). Reveals itself as you go: only the first quest is visible
  on a fresh world, each next one appears as its dependency completes.
- **Bounties** — kill-count tasks per mob tier, shown one tier at a
  time (e.g. First Blood at 25 kills, Exterminator at 100).
- **Tips & Tricks** — standalone gameplay tips.
- **Arsenal** — 24 flat, dependency-free item-possession quests, one
  per Simple Guns gun/ammo type; completes on pickup or crafting, not
  just crafting.

Clicking an item icon in a quest should jump to JEI showing its recipe
(FTB XMod Compat). Quest progress does not carry over into a new world.

## Structure generation / loot

- World should show real biome variety (desert, badlands, and a
  deliberately barren re-skinned plains/sunflower_plains/meadow), not
  one biome everywhere. Every ruin, house and town can generate in every
  biome.
- **Spacing (2026-09-27 rework, fresh worlds only)**:
  - About one structure per 64 blocks, on a loose, jittered grid. There
    should be no piles of 3-5 buildings on one spot any more.
  - Nothing within ~150 blocks of the base. The first structures start
    around 160 blocks out.
  - Houses, ruins, watchtowers, gas stations, motels, outposts, desert
    ruins and the Lost City camps/towers/factory all share that one grid.
  - Props (rocks, bones, oasis, geyser) are rare.
- **Towns are ~1 km out**: the Lost City city, the big city (a skyscraper),
  villages_city and the Abandoned Urban city now sit only on the other
  points of the base's anchor grid, 1,024 blocks apart. About half of those
  points hold one, so the nearest is at least 1,024 blocks from the base.
  Each should be whole, with no ruin jammed into it and no half-deleted
  city. Worth reporting: whether a town trip feels worth the walk.
- **No clipping**: no building should have another building punched
  through it or sitting on its roof. Known rare exceptions:
  - Mineshaft tunnels can nick a few blocks.
  - Berezka can delete one of two neighbouring Lost City / Abandoned
    Structures buildings outright. The deleted one just isn't there.
- **Skyscrapers have ~60 barrels** (was 255-536), about 4 per office floor.
  The removed barrels are spruce planks now.
- **Gone on purpose**: Lost City roads/rails/train/post boxes/lighthouse,
  the Abandoned Urban fire tower, the Abandoned Brick House as a world
  structure, and Philip's crypts, flat rubble and underground ruins. Report
  one if it turns up in a fresh world.
- Several structures carry their own mob spawners (including one behind
  the gas-station counter: husks and zombie villagers). Those mobs guard
  the structure and don't get pulled toward the pedestal. Only mobs tagged
  `td_wave_mob` (actual wave/horde spawns) are ever steered there.
- **Plain vs gold-trimmed (2026-09-27 tiering)**: most barrels and chests
  out there are plain vanilla containers with basic scavenging (food,
  planks/logs, a few iron/redstone/gunpowder, sometimes ammo) - never
  diamonds, guns, netherite or the smithing template. That includes Lost
  City store shelves and every post-apoc house. The **gold-trimmed** Lootr
  chests/barrels (dungeons, strongholds, shipwreck/buried treasure,
  mansions, watchtower armouries, outposts, Lost City cars/towers) are the
  stashes: each should feel clearly better than a barrel, and turns grey
  once you've looted your copy. Worth reporting: whether gold-trimmed
  finds feel rare-but-worth-it or too rare, and whether an outing still
  feels like a haul. Needs a **fresh world** - an older world keeps the
  Lootr containers it already converted.
- **Empty barrels** inside structures fill with a one-time "someone left
  this here" haul on first open. **Once emptied they stay empty**:
  clicking one again must not re-roll it (a loop fixed 2026-09-27). The
  same goes for any looted structure chest. A barrel **you** place and
  leave empty out in the world must stay empty, including after breaking
  and re-placing it.
- **Distance bonus (Lootr only)**: a gold-trimmed container further from
  the pedestal should show better finds on top (iron/gold/redstone near
  the base; resource blocks/gunpowder/clay at medium range; diamonds,
  ender pearls, blaze powder, netherite scrap further out), and about half
  of them carry an extra treasure-or-gun find. Plain barrels don't get
  better with distance.
- **Multiplayer**: each player gets their own roll from a gold-trimmed
  container; a plain barrel is first-come, first-served.
- **Stash guards (2026-09-28)**: every gold-trimmed stash in the ruins and
  towns has a guard spawner nearby that fires day or night once you're
  within ~14-16 blocks. The first wave from a fresh spawner comes ~1 s
  after you arrive. Near the base expect husks and helmeted zombie
  villagers (who shouldn't burn in the sun), mid-range mutant/blister/
  split-head zombies, far out armoured elite/horde zombies, rotten mutants
  and crawlers. Guards stay and fight at their structure; they don't walk
  to the pedestal. Break the spawner with a pickaxe to shut it off. Guards
  drop no loot bags and don't count for bounties. Worth reporting: too
  hard or too easy per distance, any spawner that never fires, anything
  on fire in daylight, and lag in the big multi-spawner buildings (the
  observatory and the Lost City factory have 11 each). Needs a **fresh
  world** - structures already generated keep their old contents.
- Watch the loot volume — a town is still ~150-250 barrels (a lone
  skyscraper ~60); if a full haul feels like too much, that's a real,
  reportable balance question.

## Hardcore mode / game over

- **Pedestal destroyed**: one popup — "GAME OVER" with "The pedestal
  has fallen" as its subtitle and a wither sting — then a "start a new
  world" subtitle a few seconds later.
- **`/hardcore enable`, then die** (with every online player dead, not
  just one in a multiplayer session): "GAME OVER / Hardcore: you have
  fallen" on the death screen, then a ~4-second delay before every
  player is disconnected with the game-over text as the reason. You
  should never get a working Respawn — clicking it inside that window
  disconnects you immediately instead. Reopening the world drops you in
  as a spectator with a GAME OVER reminder. Quest progress does not
  carry into a new world.

## Not yet confirmed in real play

Everything below is built and deployed, but only verified via
decompiling the relevant mod, `node --check`, and/or a sandbox boot/RCON
probe — not an actual playtest.

- **Structure-gen rework, 2026-09-27** (sandbox-pregenerated and checked
  block by block; needs a **fresh world**, and on an old seed the base
  lands somewhere new):
  1. **Spacing** - walk out ~300 blocks. Structures should read as spread
     out, roughly one per 64 blocks, with none stacked or clipped into
     each other. Is it still too many, or too few?
  2. **A town** - fly or walk ~1 km to a neighbouring grid point (1,024
     blocks along x or z from the base centre). Is a whole city there, and
     does it feel worth the trip?
  3. **A skyscraper** - about 4 barrels per floor, ~60 in all. Does it
     still feel worth climbing?
  4. **An emptied barrel** - loot one fully, close it, open it again. It
     must stay empty.
  5. **Gas station** - husks/zombie villagers should come from behind the
     counter.
  6. **Base area** - no mineshaft openings in or near the compound.

- **Guns + backpacks, 2026-09-27**:
  1. **Guns hit 50% harder** - any Simple Guns weapon. Direct hits are
     bumped; bazooka/grenade blasts are not.
  2. **Backpack** - craft one (4 leather, 4 string, chest), press B to
     open, wear it on your back, then upgrade with a copper ring.
  3. **Xaero new waypoint** is on K now.
  4. **No backpack-wearing zombies** should turn up in waves.

- **Pedestal upgrades + Tier 4 turret FX, 2026-09-27** (verified with
  a real player in the client sandbox, but not in a real game yet):
  1. **Upgrade menu** - type `/pedestal` in the base. Check the menu
     reads clearly, the green [Upgrade] buttons work when clicked, and
     your levels drop by 5/10/15.
  2. **Wave-clear prompt** - clear a wave with 5+ levels. One
     "[Pedestal] You have N levels to spend. [Upgrades]" line should
     appear.
  3. **Armor/Thorns in a real wave** - does 45% armor make the pedestal
     feel much safer? Do attackers visibly take thorns hits (sparkles)?
  4. **Grenade/Rocket Turret** - a flash and "thunk" at the turret when
     it fires, smoke behind grenades, flame behind rockets, and a bigger
     burst where grenades land.
  5. **Multiplayer** - with 2-3 players, the pedestal should now lose HP
     at the same rate as solo, not 2-3x faster.
  6. **Tooltips** - hover a Sentry, Tesla Coil or Grenade Turret. The line
     should read Tier 2/3/4 in yellow/red. Before this fix every item said
     green "Tier 1".
  7. **Sounds from anywhere** - the wave bell, boss music and game-over
     sound should be heard even when you're far from the base.
  8. **Multiplayer mob assists** - with 2+ players, mobs at a ladder
     shouldn't all get shoved upward constantly, and stuck mobs shouldn't
     be nudged every second.

- **Spike slow + four scripts that had never run, 2026-09-27**
  (sandbox-tested over RCON; not yet seen in real play):
  1. **Spikes slow wave mobs** - watch for the grey effect swirl on
     mobs crossing a spike strip, and whether Slowness II is noticeable
     enough.
  2. **Sentry muzzle flash + hit sparks** - these have never actually
     shown before now. Every shot should crack, flash and throw crit
     particles, and every hit should spark.
  3. **Tesla Coil hit cinematics** - also never shown before now. Zapped
     mobs should get the jagged spark bolt plus a thunder crack.
  4. **Bouncing Betty/Claymore player safety** - never ran before now.
     Stand near your own mine when it goes off; you shouldn't take
     damage. The Betty half was confirmed matching in the sandbox; a
     no-player sandbox couldn't set off a Claymore.
  5. **Grenade Turret player safety** - never ran before now. Stand
     near a grenade impact; you shouldn't take damage. The sandbox
     couldn't fire a real turret grenade, only prove the hook now runs.

  Cause of 2-5: a Rhino quirk. `level.isClientSide` without `()` is
  always truthy, so each script's "skip on client" guard skipped on the
  server too. Details are in `wave_mob_spike_slow.js`'s header.

- **Six-item playtest batch, 2026-09-22** (built, `node --check`ed,
  sandbox-booted; nothing seen in a real session yet):
  1. **Airdrop** - real beacon beam on top of the crate, a Xaero
     "Supply Drop shared a waypoint" chat line (click Add, confirm),
     the plane crosses the base from the west, the crate lands 50-70
     blocks from the pedestal on the eastern side, the plane flies 40
     above pedestal height. Confirm the plane is actually visible
     crossing overhead, the beam is visible from the base, and the Add
     click opens Xaero's prefilled waypoint screen.
  2. **Countdown after wave 5** - the wave-5 clear was crashing inside
     the starter-trap removal hook (Rhino `const` in a nested block),
     which skipped starting the countdown. On the live save wave 5 is
     already past; just confirm the timer shows after the next clear.
  3. **Electrified fence** - a wave mob standing next to a fence should
     visibly spark and lose health once a second.
  4. **Tesla Coil never targets you or a Sentry** (patched IE jar) -
     stand inside a powered coil's range with a zombie also in range:
     every bolt should go to the zombie, none to you, and the coil's
     energy should only drop for real hits.
  5. **Mobs dig through player-built walls** - cobble/stone at roughly
     2.5s per block. Block the gate and watch them come through instead
     of standing outside.
  6. **Quest book** - no Engineer's Manual quest, no Diesel Generator
     wording. On the live save the removed quest simply disappears.
- **Starter trap showcase** (several rounds of fixes on 2026-09-15):
  confirm the Tesla Coil now stands upright with a working lever, the
  Sentry leaves nothing behind when removed at wave 5, neither the coil
  nor the fence damages/stuns you or the Sentry any more, the coil and
  Flux rig sit where the last fix left them (front wall / interior
  balcony wall), and the gate fence fully seals the opening.
  **Reported still dealing damage 2026-09-16** ("do they need to be
  hooked up somehow?") - to be clear, no: unlike the Tesla Coil, the
  Electrified Iron Fence needs no power/redstone at all, it's always
  live and only owner/allowlist-gated. Checked the live log from that
  exact session - `electric_trap_player_safety.js` was loaded with 0
  errors, so the safety net should have been active; still unconfirmed
  whether the shock itself actually landed or this was just asking
  whether the mechanic was supposed to be always-on. Watch for it
  specifically next session. **Resolved 2026-09-22** ("the electric
  fence still isnt hurting enemies"): the shock was never landing on
  MOBS at all - decompiled, the fence only fires on hitbox overlap and
  mobs stop on the adjacent block - `wave_mob_fence_shock.js` now
  shocks wave mobs standing next to a fence (item 3 above).
- **Airdrop flyover + landing beacon** (2026-09-15): confirm the plane's
  flight genuinely takes ~10 seconds now, and a visible beam of light
  marks the crate's landing spot until it's opened. **"Didn't see the
  plane fly overhead" reported again 2026-09-16** despite the flight
  actually running (confirmed in the live log - the plane did launch),
  same complaint the 2026-09-10 title+bell fix was meant to solve.
  Replaced the one-shot title with a standing action-bar reminder for
  the whole time a drop is being watched - confirm it's now genuinely
  hard to miss. **Rebuilt 2026-09-22** (item 1 above): the map waypoint
  had never worked - the airdrop mod calls a Xaero command that does not
  exist - and the drop is now closer, in front of the base, with a real
  beacon beam.
- **Sentry muzzle flash** (boosted 2026-09-16, "the animation on the
  sentry when it fires is not showing well"): particle counts/spread
  roughly doubled and a real firing sound added (there wasn't one
  before) - confirm a shot is now clearly noticeable mid-fight.
- **Tesla Coil zap bolt** (reshaped 2026-09-16, "I want a cool
  electricity bolt"): the flat vertical spark column is now a jagged,
  multi-segment bolt falling from above the struck target - confirm it
  actually reads as a bolt rather than a straight column.
- **Tier 2 iron costs** (trimmed 2026-09-11): confirm a Sentry/Cage
  Trap/I.M.S. feels affordable at a normal wave-clearing pace, not still
  too steep.
- **Tier 3 power economy**: confirm one Culinary Generator (fed food/
  rotten flesh) actually sustains the Tesla Coil and both turrets
  running at once in a real fight — only checked via RCON math so far.
- **Tier 4 turrets + their explosion-safety fix** (built 2026-09-15/16):
  see the Tier 4 section above — nothing about them has been seen in a
  real client session yet.
- **Ladder-climb mob assist** (rebuilt 2026-09-10): confirm a wave mob
  you've hit actually climbs a ladder to reach you rather than snapping
  back to the pedestal mid-climb — the retarget-window fix was never
  confirmed against a real climb attempt afterward.

## Known, accepted gaps (not bugs to report)

- Zombie/Mutant Brute pillaring or otherwise breaching the chokepoint
  walls is an accepted difficulty factor, not something the reinforced
  material is meant to stop (the walls themselves are unconditionally
  explosion- and dig-proof).
- Mutant Brute / Zombie Brute are too wide to climb a ladder column
  against a wall — they'll never chase you up one.
- The Tesla Coil's zap is a genuine random pick within its own 6-block
  cube (not "nearest target"), and it goes idle whenever a player or the
  Sentry is within its wider detection radius — a deliberate tradeoff
  for making it safe, not a targeting bug.
- The vanilla jigsaw structure-generation race condition is mitigated by
  structure spacing, not guaranteed gone — if world creation ever
  crashes, check the crash report's own Details/Feature section for
  which structure was actually involved before assuming it's the newest
  thing added.
