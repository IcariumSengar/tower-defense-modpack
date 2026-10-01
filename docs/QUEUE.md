# Build Queue

A simple lookup for the implementation session: what's actually ready
to build right now, in priority order. Each entry links to its full
spec in [FEATURES.md](FEATURES.md) rather than repeating it here — this
file only tracks *what's next and how ready it is*, not the design
itself.

**Lifecycle**: an idea starts raw in [IDEAS.md](IDEAS.md) → once it's a
real, fleshed-out design it moves into FEATURES.md marked *planned* →
if it's actually unblocked and ready to act on, it gets a line here →
whoever builds it flips the FEATURES.md entry to *live* and removes the
line from this file. Don't queue something that's still genuinely
unresolved (open forks, undecided mod picks) — flesh it out in
IDEAS.md/FEATURES.md first.

**Cleaned up 2026-09-01** — this file had accumulated stale entries for
things confirmed working, things superseded by later redesigns, and
a duplicate leftover from before the desert-drop rebuild. Trimmed to
reflect actual current status.

**Cleaned up again 2026-09-16** — two weeks of session history had
re-accumulated since the last pass (this file had grown to a full
chronological journal of every playtest batch and build session, almost
all of it describing work that's already done and confirmed). The full
pre-cleanup content — real design decisions, root-cause writeups,
decompile findings, all of it genuinely worth looking up later — is
archived verbatim at
[docs/archive/queue-history-2026-09.md](archive/queue-history-2026-09.md).
Trimmed here to only what's genuinely still open.

**Backlog review 2026-09-26**: every unbuilt idea across IDEAS.md and
FEATURES.md went through a keep/bin round with the user. Only two
survived: pedestal upgrades (HP/armor/thorns; IDEAS.md, raw) and Tier 4
turret tracer/impact FX (FEATURES.md, needs OMT's projectile ids
decompiled first). Neither is specced enough to queue here yet. Two
superseded entries were also dropped from the confirmation list below:
the 2026-09-15 airdrop flyover, and the Tesla cutoff-radius
sub-decision.

---

## Awaiting real-play confirmation

Built and (unless noted) already deployed to the live instance/dedicated
server — nobody has actually confirmed these work in a real session yet.

- **Playtest batch, 2026-09-30** (13 items from the first session on the
  bug-sweep build). Bag opens were failing (a sweep regression that also
  broke "Open It" and the pickup popups); the pedestal screen's Take button
  deleted the amulet (KubeJS's chest screen writes the inventory back on
  close); the fence shock skipped untagged mobs. Plus base, spawn, quest,
  cost and lure-texture changes. Checklist: PLAYTESTING.md "Playtest batch,
  2026-09-30". Spec: FEATURES.md "2026-09-30 playtest batch".
- **Script cleanup and bug sweep, 2026-09-30.** Comments rewritten and
  dead code dropped (commit 8ab355c), then about 70 fixes from a
  subsystem-by-subsystem bug sweep, with 13 design calls decided in three
  question rounds. Checklist: PLAYTESTING.md "Bug sweep, 2026-09-30".
  Spec: FEATURES.md "2026-09-30 script cleanup and bug sweep". Open
  question: wave mobs reloaded from disk come back without Epic Siege
  Mod's digging and pillaring (restoring it needs an untested reflection
  call into ESM).
- **Playtest batch, 2026-09-29** (25 items from the user's first play
  on the 09-28 build; the ask-audit batch below had not reached the
  instance yet, so its amulet change covered item 1). Decided in three
  question rounds. Checklist in the user's numbering: PLAYTESTING.md
  "Playtest batch, 2026-09-29". Spec: FEATURES.md "2026-09-29 playtest
  batch".
  - **Bugs, diagnosed from the live save and log:**
    - Wave-5 plane: pinned by the world border (85 wide then) and
      discarded by the mod. The plane now spawns `noPhysics`, so every
      flight is full length. The ask-audit flight shortening is gone.
    - Stuck zombies: the buried ambushers (10 of 16 waves force-cleared).
      They now burst out of the ground 4-7 blocks outside the walls.
    - Ceiling gap and loot on the floor: a gap in cafe4.nbt itself, a loot
      chest spilling its table when removed, and 135 dead-bush sticks from
      the field levelling. All three fixed.
    - Lure: it worked, but its only cues were a smoke puff and a poof. It
      now has a countdown nameplate, a note pulse and a bell every 5 s.
    - Tesla Coil idle arcs: IE's own random discharge, now patched out of
      the IE jar together with an armor-stand target filter.
  - **Changes:** pedestal upgrade screen (empty-hand right-click or
    /pedestal); power rig cleared; Cage Trap binned; Reaper armour 20 ->
    12; Sentry 8 damage + tracer; spike/stake slows; trap damage tooltips;
    compass-direction crate message; extra cobblestone; recipes (collector,
    shotgun shells, Tesla Coil, flux dust and cores); no Flux Configurator
    in the kit; quest text (Last Written Wave, Wired Different, new Iron
    Sides, plus the lines these changes touched); menu tips.
  - **Structures:** a ring of 6 ruins /place'd 100-130 blocks around each
    new base, and **Nolando StructureZ** (4 buildings) added to the ruins
    pool. A denser pool (one per 48 blocks) was built, measured in the
    sandbox at 12 of 30 ruins overlapping another, and reverted to one per
    64 on the user's call.
  - **Verified** in the server sandbox (fresh worlds, RCON probes) and with
    a real sandbox client: 53/53 scripts, recipes read back from the live
    recipe list, command post cells, a border-geometry plane landing, the
    coil ignoring an armor stand, the GUI's buys and amulet button, the
    lure pulling a wave mob, the direction chat line. Not verifiable there:
    the actual in-world right-click, trap tooltips on hover, and the
    visuals (tracers, dirt burst, no idle arcs).
  - **Fresh worlds only:** base changes, the ruin ring, StructureZ spawns.
    The dedicated server's world dates from 09-12.

- **Ask-audit batch** (2026-09-28). The user asked "have we built
  everything I asked for?". Every typed message (746) and every
  question-round answer (213) across all transcripts was extracted, turned
  into ~200 asks (latest decision wins) and checked against the code by
  theme. About 160 were built as asked. This batch closes the rest, except
  two the user excluded: a deposit-all button, and starting a new world on
  the dedicated server after game over. Design calls were made in four
  question rounds the same day.
  - **Never built:**
    - The amulet is now a quest reward: hand in 8 gold to "Not Just
      Jewelry", one per player. It has no recipe and is fire/lava-proof.
      The 09-25 session asked the design questions, then stopped.
    - Red glow outline on the last 2 mobs of a wave (`wave_status.js`,
      team `td_stragglers`).
    - One explosion rule (`explosion_player_safety.js`): a blast not set
      off by an enemy mob never breaks blocks or hurts players. That covers
      the I.M.S., bazooka, grenades, charged potato, mines and TNT. The
      Demolition Zombie's TNT is untouched.
    - A newly placed I.M.S. starts on "mobs only".
  - **Diverged, now as asked:**
    - Airdrop lands 90-110 blocks from the pedestal in any direction. The
      plane's flight row is force-loaded. (The border shortening was
      replaced 2026-09-29: the plane is noPhysics and flies full length.
      The 09-28 wave-5 failure was the border, not a freeze.)
    - Each crate holds a gun plus its own ammo (per-gun sub-tables), and
      about 20% hold a nether star.
    - The Legendary bag gives one standout item and has an orange beam.
    - No brutes before wave 20 from any source (Undead Nights brute-free
      hordes for levels 1-11). Horde brutes get 60 HP and 0.28 speed.
    - Strays return to the real spawn band.
    - "It's Up to You Now" is removed. "No Turning Back" (all Tier 2
      traps) gives a totem.
    - Pedestal heal is right-click, always; the item never sits on the
      stand.
    - I.M.S. recipe is now 16 iron.
    - The command post roof, slabs, stairs, plates and carpets are
      reinforced.
  - **Bugs fixed:**
    - Zombie Masher repeats again (it had a quoted boolean).
    - Know Your Enemy: every quest is one kill, and the chain is reordered
      by first appearance.
    - "Thin the Horde" asks for 3 zombies.
    - Underground ambushers stay out of the command post and get an air
      pocket. (Superseded 2026-09-29: they surface outside the walls.)
    - After a game over there is no wave-clear, border growth, milestone
      or boss.
    - Rotten Mutant kills now drop bags.
    - Camel, fox, skeleton horse and zombie horse are blocked.
    - Z is only zoom (Xaero enlarge-minimap unbound in the shipped
      `options.txt`).
    - Sentry hit FX only for Sentry shots.
    - Fire and lava kills of wave mobs count for bounties.
    - The zcraft migration is skipped on fort worlds.
    - Late joiners get no starter gear.
    - Amethyst is added to `scav_hardware`.
  - **Removed:**
    - Zombies More (supplied no mobs any more).
    - The Assault Rifle recipe.
    - IE Diesel Generator and Radiator recipes (this also blocks the IE
      Excavator, which is unused).
    - The legacy amulet-pedestal recipe.
  - **Server world:** its `serverconfig/securitycraft-server.toml`
    (created 09-12, predating the pack defaults) was patched: mines no
    longer break blocks, no fire, Sentry damage 6.
  - **Sandbox-verified 2026-09-28** (server sandbox plus a client joined as
    a real player; 52/52 + 3/3 + 1/1 scripts, 0 errors, 0 runtime errors or
    warnings through the whole run, 96 quests):
    - House: 0 of the 7 vanilla trim types left; 95 `reinforced_stone_slab`.
    - Explosions: bazooka, grenade, charged potato, TNT and an I.M.S. bomb
      all hurt mobs with no crater; a burning Demolition Zombie still
      cratered.
    - Airdrop: 200 crates, exactly one gun each with its ammo; nether star
      in 22%. A real launch landed ~100 blocks NE with beacon and waypoint.
    - Mobs: camel, fox and both undead horses are blocked. 40 Rotten
      Mutant kills gave 8 bags.
    - Bounties: a fire kill of a wave mob counts; untagged and guard fire
      kills don't.
    - Late joiner got only the Flux Configurator. Assault Rifle, IE
      generator and radiator recipes are unknown.
    - Straggler outline follows 3→none, 2→marked, +1→cleared, and
      screenshots red through the command post wall.
    - Stray returned 15 blocks out, on the ground.
    - Wave-7 ambushers at pedestalY-6, none in the house. They took a
      one-off 3 HP climbing up, then held steady.
    - UN level 11: 8 hordes, 34 mobs, no brutes. Level 12: Mutant Brute at
      60 HP and 0.28 speed.
    - Pedestal destroyed mid-wave: outline cleared; killing the leftovers
      gave no clear, countdown, border growth or milestone.
    - `/tdforceclear` works from a player; from console it errors by
      design (it needs a player).
  - **Not verifiable without real mouse clicks:** pedestal right-click
    heal, the amulet hand-in claim, I.M.S. hand placement mode, Legendary
    bag opening and beam colour, Sentry FX visuals.
  - **Checklist:** PLAYTESTING.md "Ask-audit batch".

- **Structure-gen rework** (2026-09-27). **Fresh worlds only.** Synced to
  the instance and the dedicated server 2026-09-28 (hash-checked; the sync
  also carried the peer loot-tiering pass). A review measured ~1,150 structure starts/km², 57-59% of
  structures near the base clipped, and Lost City towns deleted by Berezka.
  - **Towns:** all four towns moved onto the anchor lattice
    (`kubejs:towns`, ~45% of anchors, never the base's). The nearest is
    ~1 km out.
  - **Ruins pool:** every other building, landmark and prop is in ONE set,
    `kubejs:ruins_pool` (4/2 jittered grid, one start per 64x64-block
    cell, first structures ~160 blocks out).
  - **Cuts and trims:** 20 low-value structures cut (sets disabled,
    templates kept). The skyscrapers are trimmed to ~60 barrels.
  - **Fixes:** the empty-barrel re-roll loop, the gas station that never had
    its guard spawner, and mineshafts reaching the base.
  - **Strongholds disabled** (2026-09-28, user request): they surfaced
    through the shallow ground and cut buildings. Sandbox re-run: 0
    strongholds, 904/904 starts, 0 errors. Eyes of ender now find nothing.
  - **Sandbox (Manna seed, 4,782 chunks):** 904/904 starts predicted, 2%
    damaged near the base (was 59%), all 4 towns whole, 0 errors.
  - **Base moves:** on the Manna and server seeds the old base anchor is now
    a town anchor, so a new world builds its base elsewhere.
  - **Still to confirm in real play:** see PLAYTESTING.md "Not yet
    confirmed in real play" (spacing, clipping, a town trip, a skyscraper,
    an emptied barrel). Spec and evidence: FEATURES.md "2026-09-27
    structure-gen rework" under Base & structures.
- **Guns +50% + Sophisticated Backpacks** (2026-09-27). Friend zip is
  now 0.2.2 (friends need Backpacks to join the server).
  - **Guns:** every Simple Guns projectile's base damage x1.5 on spawn
    (`gun_damage_bump.js`). Sandbox: a gun bullet read 3.0 vs a vanilla
    arrow's 2.0. Blasts are unchanged.
  - **Backpacks:** pinned to 3.26.3.2157, because the newest build
    crashes against our Sophisticated Core (see MODS.md).
  - **Backpack settings:** mob backpack spawns and chest-loot injection
    are both off.
  - **Keys:** backpack opens with B; Xaero new-waypoint moved to K.
  - **Quest:** "Pack Mule" added.
  - **Sandbox:** clean full-mod-set boot, 50/50 scripts, 96 quests.
  - **Still to confirm in real play:** guns feel stronger, crafting and
    opening a backpack works, and the Curios back slot works.
- **Pedestal upgrades + Tier 4 turret FX + multiplayer pedestal-damage
  fix** (2026-09-27). Both items kept in the 2026-09-26 backlog review are
  now built.
  - **`/pedestal` upgrades:** Max HP 400/500/600, Armor 15/30/45%, Thorns
    1/2/3 dmg/s, costing 5/10/15 XP levels per tier. There's a clickable
    prompt at wave clear, and the new "Shore It Up" quest teaches it.
  - **Turret FX (`tier4_turret_fx.js`):** a launch cue, a grenade smoke
    trail and rocket flame exhaust, and an impact burst.
  - **Multiplayer fix:** pedestal damage used to run once per online
    player, so 3 players meant 3x damage.
  - **Also fixed:** the shipped `options.txt` had no `version:` line (it
    failed to load, so friends never got the Tab-for-quests bind), and the
    quest book icon pointed at removed Barbed Wire.
  - **Verified in the client sandbox:** a real player bought all 9 tiers
    through the real command, with XP, max HP and heals all correct;
    armor measured exactly 17/s from 30/s; thorns hit the attackers;
    out-of-range and maxed buys were refused; the menu rendered; the FX
    pipeline ran launch -> trail -> impact.
  - **Not verified:** a real turret firing (a /summon'ed OMT shell
    discards itself without a turret base), the wave-clear prompt with
    enough XP, and 2+ players. On the dedicated server,
    `tellraw <uuid>` fails for players (vanilla rejects UUIDs for
    players-only arguments), so the menu targets names.
- **Script audit fixes + friend zip 0.2.1** (2026-09-27). A read-only
  audit of every script (Rhino behaviour checked in a harness against the
  pack's own jar) found:
  - **Tooltips:** every Tier 2-4 item said "Tier 1". A `const` inside a
    loop keeps its first value in this Rhino; changed to `var`.
  - **Ladder-climb assist and stuck-mob nudge:** they ran once per
    online player per tick, so with 2+ players the second pass saw zero
    movement and nudged or re-pathed every mob. Now once per game tick,
    and the position maps drop dead mobs.
  - **Legacy `kubejs:amulet_pedestal` right-click:** it fired for both
    hands, so every place was undone, and a crafted one on a new world
    could eat the amulet. Now main hand only, at the stored pedestal
    position only.
  - **Server-sourced sounds** (wave bell, boss music, boss kill, both
    game-overs) played at world spawn, so they were inaudible past ~16
    blocks. Now `execute as @a at @s ... minVolume 1`.
  - **The wave-clear upgrade prompt** is wrapped in try/catch so it can
    never kill the countdown.
  - **Verification:** server sandbox loads 49/49 scripts with 0 errors
    and 95 quests.
  - **Friend zip:** re-exported as 0.2.1 (`packwiz refresh` first; the
    menu mods and assets were never in the 0.2.0 index). It has 85 mods
    (62 CurseForge + 23 bundled) with LootJS and Radium present, and it
    sits in Downloads.
  - **Noted, not fixed:**
    - Player-directed messages (base expansion, amulet, wave-5 text,
      horn) reach only whichever player ticked first.
    - With nobody online, pedestal damage pauses but traps keep firing,
      and a countdown that expired offline starts the wave on the next
      login.
    - Sentry hit FX also fire on player bow hits.
    - Worldgen noise in the mods' own data. **Corrected 2026-09-27; neither
      is a bug to fix.**
      - `abandoned_urban:city_building` is each building's own road-side
        back-connector. It targets the name `minecraft:roads`, which
        nothing carries, so it can never attach, and fixing the spelling
        wouldn't change that. Each of the 501 warnings marks a building
        that WAS placed; all 6 building types appear in real cities. The
        real gap is that `road_corner` never places (likely too big for
        `max_distance_from_center` 48).
      - Lost City's `city_under*` pools are emptied at runtime by its
        `terrain_matching` projection, so vanilla skips those jigsaws.
        That's expected.
- **Spike slow + four dead scripts revived** (2026-09-27): wave mobs in
  a Spike Trap get Slowness II, lingering 1.5-2s
  (`wave_mob_spike_slow.js`; quest text updated). While building it,
  I found `if (level.isClientSide) return` is always truthy in this
  Rhino, so it returned on the server too. The Sentry muzzle/impact FX,
  Tesla hit cinematics, Bouncing Betty/Claymore player safety and
  Grenade Turret player safety have never actually run. All five sites
  now call `isClientSide()`. Sandbox-verified over RCON: slow applied
  only to wave mobs in spikes and wears off; every revived hook passes
  its guard; a Bouncing Betty explosion was matched with no errors.
  Not verifiable headless: Claymore and turret-grenade detonations, and
  anything involving a player. Checklist: PLAYTESTING.md "Not yet
  confirmed in real play". Synced to the instance and the dedicated
  server (restart needed).
- **Performance pass** (2026-09-26) — blood particles 100 -> 25 per kill,
  Dynamic Lights REALTIME -> FAST, ImmediatelyFast added, and four
  KubeJS entity-scan hot spots cached (marker lookup, per-mob lure lookup,
  per-tick wave-mob recount). Sandbox benchmark at peak kill load: 138 ->
  188 avg FPS at 1080p, visible-hitch seconds 77% -> 24%. Deployed to the
  instance (ImmediatelyFast jar copied in by hand - it's a packwiz mod, so
  re-exported as 0.2.1 on 2026-09-27) and the dedicated server (IF excluded,
  client-only). Needs a real wave to confirm it *feels* smoother, that
  blood still reads well at 25, and that lures still pull hordes. See
  MODS.md "Performance pass (2026-09-26)".
- **Lure Block quest** (2026-09-26) — the Lure Block (built 2026-09-12)
  was never in the quest book, so nobody would find it outside JEI.
  Added "Dinner Bell" to campaign.snbt's trap branch, hanging off the
  Spike Trap quest ("Better Than Nothing"): craft one, 1 level + 2
  redstone. Still open from 2026-09-12: whether the 40-block pull and
  60-second timer feel right mid-wave.

- **Menu makeover** (2026-09-25) — FancyMenu + Drippy reskin of the
  title, startup loading, world loading/saving/connecting, pause and
  list screens (painted dusk/night scene, TOWER DEFENSE wordmark,
  plated buttons, rotating field-note tips). Deployed to the instance
  (client-only mods; the dedicated server excludes them). Every screen
  was screenshotted in a sandbox client, but the look is the user's
  call. The friend zip was re-exported as 0.2.1 on 2026-09-27 with it
  included. See FEATURES.md "Menu makeover".
- **Six-item playtest batch** (2026-09-22) — (1) airdrop: beacon beam
  on the crate, Xaero share line (click Add), plane crosses the base
  from the west, crate 50-70 from the pedestal (placement superseded
  2026-09-28: 90-110 blocks, any direction); (2) the wave-5 clear no
  longer crashes (Rhino `const` in a nested block), so the countdown
  runs after wave 5; (3) electrified fence shocks wave mobs standing
  next to it; (4) `ImmersiveEngineering-1.20.1-10.2.0-183-tdcoilfilter.jar`:
  Tesla Coils never target players or Sentries; (5) Epic Siege digging
  no longer needs tools + Haste XV on wave mobs (4x dig speed); (6) the
  Engineer's Manual quest and the Diesel Generator wording are gone.
  Sandbox-verified where a no-player server can (script load, coil
  targeting, fence shock, dig config, airdrop `free` command + beacon);
  needs a real session. Details: PLAYTESTING.md "Not yet confirmed in
  real play".
- **Three-front fort + cafe4 command post + wall platforms**
  (2026-09-22) — pedestal moved to 9 from the gate, compound 19 wide,
  one fixed collapsed section per flank (fenced until wave 5 like the
  gate), the Abandoned Brick House replaced by `the_lost_city:cafe4`
  (rotated to face the yard, 4 baked villagers stripped, glass on the
  yard face upstairs, rig/double chest/barrels/horn inside), gate
  platform halves + one flank post per side with ladders. Sandbox-
  verified on a fresh world (50 block probes), not yet seen by a real
  player. **Fresh worlds only.** Spec + build notes: FEATURES.md
  "Three-front fort" under Base & structures. Things to look at: does
  the yard read right from the gate; waves 1-4 piling on three fences;
  stand on a platform and get a mob to climb the ladder; whether the
  boarded cafe is too dark inside.
- **Starter trap showcase polish** (2026-09-15) — Tesla Coil stood
  upright with a lever toggle (was lying on its side, redstone-block
  powered), the Sentry no longer drops its own item when removed at wave
  5, a real stun-bypass fix (coil/fence no longer stun on top of not
  damaging), cooler zap/muzzle-flash cinematics, the coil moved onto the
  front wall next to the Sentry, the starter flux rig moved to the
  house's exterior wall near the balcony (since the 09-22 fort it sits
  inside the command post, behind the bar), and the starter fence now
  fully seals the gate gap. Not yet seen in a real restart.
- **Tier 4: Open Modular Turrets Reborn** (2026-09-15/16) — Grenade
  Turret + Rocket Turret added as Tier 4, plus a player/block
  explosion-safety fix for the Grenade Turret. Not yet confirmed in a
  real client session. Full spec in FEATURES.md's "Machine progression
  (Tier 3-4)" entry — not repeated here.
- **Tier 2 trap iron-cost trim** (2026-09-11) — Sentry/Cage Trap/I.M.S.
  iron costs cut (Sentry 36→20, Cage Trap 28→~12, I.M.S. 24→16). Needs a
  real-play confirmation the costs feel right at a normal wave-clearing
  pace.
- **Mine player-safety fix** (2026-09-11) — Bouncing Betty/Claymore
  explosions should no longer hurt the player or destroy their own
  blocks (`mine_player_safety.js`). Unconfirmed live — trigger one near
  your own build and check.
- **Tier 3 Culinary Generator power economy** (2026-09-11) — the power
  math itself is confirmed working live (real FE generation, correct
  rate). Still open: whether building/upgrading multiple generators in
  parallel reads as a real base-building investment or just busywork —
  a real-play judgment call, not something a sandbox boot can answer.
- **Structure loot pass** (2026-09-11) — scavenge sub-tables,
  empty-barrel fix, and loot-table trim all shipped. Needs a real client
  pass: open an empty barrel, confirm a barrel *you* place far from base
  doesn't self-fill, and check JEI shows the new Tier 3 recipes. (Lost
  City stores are plain containers since the 2026-09-27 tiering below.)
- **Stash guard spawners** (2026-09-28) — guard spawners at every
  gold-trimmed stash in the ruins/towns (55 new, 44 converted, day or night,
  distance-tiered at runtime by `structure_guard_tiers.js`), no bags or
  bounty credit from guards. Sandbox-verified; needs a fresh world and a
  real outing: difficulty per distance, spawners that never fire, lag in
  the 11-spawner buildings. Open: guard XP still feeds pedestal upgrades.
  See FEATURES.md "Stash guard spawners".
- **Structure loot tiering** (2026-09-27) — plain containers basic, Lootr
  lucrative, ~85% fewer Lootr via `pack/config/lootr-common.toml`;
  distance bonus now Lootr-only. Needs a fresh world and a real outing:
  do gold-trimmed finds feel worth it, and does a trip still feel like a
  haul? Modelled at ~7x a barrel near base / ~12x past 270 (above the
  ~3-4x first estimated; user chose to keep it). If trips feel thin, the
  first knobs are the plain `scavenge_storage`/`store` roll counts. See
  FEATURES.md "Structure loot tiering".
- **Ladder-climb mob assist** (rebuilt 2026-09-10) — `mob_aggro.js` now
  lets a wave mob keep a player-assigned target for 8s after being hit,
  instead of the pedestal-marker re-assert silently defeating the climb
  attempt every 10 ticks. Needs the next play session to confirm: stand
  on a wall, shoot a mob, watch whether it actually climbs the ladder to
  reach you. (Wide mobs — Mutant Brute/Mutant Zombie — physically can't
  fit a 1-block ladder column and never will; standard-size mobs should.)

## Small decisions needed (not build-blocked, just undecided)

None open. The three that sat here were all closed as "leave as-is" in
the 2026-09-26 backlog review:
- Crafting Station Improved's panel overlapping JEI bookmarks: no swap.
- Inventory Sorter's middle-click sort: no Inventory Profiles Next swap.
- The base-site search stays desert/badlands only, with no plains.

Full list of what that review binned: IDEAS.md "Binned".

## Waiting on you, not on a build

- **Reported "constant" lag** (2026-09-11) — traced to host RAM
  pressure, not modpack code: the CurseForge instance requests a 10GB
  heap but this machine only has ~3.4GB free at idle with nothing else
  running. No code fix pending. Two real levers, your call: close other
  heavy apps (this session/VS Code, ~2.3GB) while playing, and/or lower
  the CurseForge instance's allocated RAM below 10GB in its settings.
  Report back whether either actually helps.
  **Update 2026-09-26**: the launcher profile now passes `-Xmx4096m`
  (already lowered). The performance-pass GC log (sandbox, 4K, peak kill
  load) shows that's plenty: live heap 575-700 MB after each young GC,
  ~8 ms pauses, no full GCs. Leave it at 4 GB.
