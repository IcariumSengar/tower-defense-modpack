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

---

## Ready to build

**New live feedback batch, 2026-09-05, 25 items, literal numbering —
sent to build. #19 cancels/supersedes the previous batch's #3 (cobweb
mechanic investigation) — drop that, just scrap the combo claim.**
1. **Done.** "Borrowed Time" rewritten as a subtle hint ("look close and
   you can already see the wear starting to show") - no explicit "wave
   5" mention anymore. Wave-5 announcement split into two genuinely
   sequential title/subtitle pairs with a real 5-second pause between
   them (`pendingDelayedTitles` queue in `wave_status.js`) - real bug
   found: it and the gear-removal beat both fired `/title` in the same
   tick, so the second one instantly overwrote the first before it
   could be read; that's fixed now, not just made "more sequential."
2. **Done.** Removed the original one-time "Sound the Horn" quest
   entirely, kept the repeatable "Lost the Horn?" as the sole horn
   quest (its own description rewritten to be self-contained, no longer
   references the deleted quest by name). Checked the real dependency
   graph first: exactly one other quest ("Thin the Horde") depended on
   it - dependency removed, it's now a standalone quest with no
   prerequisite, and the repeatable quest has zero dependents.
3. Not started - queued behind the maze-funneling/pathing items.
4. **Done.** "Spoils of War" and "Open It" both now reward 4 gold
   ingots each (guaranteed, not RNG) - stacks with the gold_nugget fix
   from the last batch, closing the gold gap faster and more reliably.
5. **Done.** Modest bump across all 8 waves - trash-floor counts only
   (zombie/husk/drowned/blister_zombie/horde_zombie), deliberately left
   every Rare (split_head_zombie) and Epic (spitter/elite_zombie) count
   untouched so it doesn't perturb the gold-economy calibration from the
   last batch.
6. Not started.
7. **Done, and it turned out to already be true.** Decompiled Crafting
   Station Improved's real `Configs$Server` class directly -
   `sideInventories` ("display side inventories in crafting grid," the
   real connected-inventories feature) already defaults to `true` in
   the mod's own stock code, and nothing in this pack overrides it.
   Nothing to fix - just reinforces that #8's explainer quest is the
   real gap (the feature works, players don't know it exists).
8. Not started.
9. Not started.
10. Not started.
11. Not started - **also gained a 3rd healing option since this was
    queued**: nether star right-click = full (100%) heal, alongside
    golden carrot's 10% (see #14).
12. Not started - needs confirming JEI's real default "A" key binding
    before writing the quest text, not guessed.
13+25. Cobblestone loot too common (confirmed: 45 weight, heaviest in
    Uncommon pool) — dial back hard so wood becomes the real early
    defense material by necessity, not an AI change.
14. Golden carrot right-click heals pedestal 10%. **Addition**: nether
    star right-click heals to full (100%) - same right-click handler,
    the rare/premium full-heal option. Plain carrots also confirmed
    absent from loot — decide whether to add.
15. Real gap: trap kills (Spikes etc.) don't drop loot like player
    kills do (wave-8 brute/Spikes dropped nothing) — fix so there's no
    difference.
16. Endless-phase tuning: 2 brutes at wave 9/level 1 is too early —
    push heavier "m"-pool types toward later endless levels.
17+18+20. Confirmed gaps: netherrack, arrows, nether quartz missing
    from every custom loot table — add all three somewhere sensible.
21. Arrow Turret + Magnetic Chest feel janky — write a real quest-book
    explainer once mechanics are actually confirmed, not guessed.
22. Player-placed ladders on the outside wall cause mob pathing
    stuck-ness — same category as #3/#6.
23. Open ask: maze-like mob funneling near the front choke point —
    investigate whether Create's fan can redirect pathing, or other
    physical-layout techniques.
24. Likely root cause: "Turn the Crank"'s andesite reward is in
    postapocalypse_structures tables, not Lootr-managed chests (a
    different system) — user's checking the wrong chest type. Proposed
    fix: give the Hand Crank itself as a quest reward directly.

**Two live bug reports, dispatched alongside the 25-item batch above -
done/investigated 2026-09-05:**
- **`/tdforceclear` "no longer works" — real bug found, likely fixed,
  not fully confirmable remotely.** Not a regression from today's edits
  (git history shows this line untouched since the command was first
  written). Real cause: `context.source.sendSuccess(() => Text.of(...),
  false)` - `Text` is not a real global anywhere else in this codebase
  (this is the pack's only custom command registration, zero other
  Component-building calls exist to have proven it). A non-player RCON
  test throws the exact same generic "unexpected error" message this
  bug would, so a headless sandbox genuinely can't distinguish the two
  failure modes - fixed by switching to `player.tell(...)`, the same
  proven chat call used everywhere else in this pack. Needs a real
  player to confirm.
- **Z-key zoom "kinda flaky" — real investigation, keybind/mod-conflict
  theories ruled out.** Checked live `options.txt` directly: nothing
  else is bound to Z. None of the 4 newly-installed client mods
  (Dynamic Lights, Damage Numbers, Pick Up Notifier, Xaero's World
  Border) register any keybind at all - checked each one's lang file
  directly, zero hits. Just Zoom's own config has no cooldown/toggle
  setting that would explain intermittent failure. Not resolved further
  than that - a deeper mixin-level interaction or a mundane window-
  focus quirk are the remaining real possibilities, not chased given
  how minor this is.
**8-item batch — done, built/deployed 2026-09-05 (except #2, held).**
1. **Waystone rendering — real root cause found and fixed.** Decompiled
   `WaystoneBlock`/`WaystoneBlockBase` directly: `waystones:waystone` is
   a real door/bed-style two-block structure (`half=lower`/`half=upper`,
   confirmed from the mod's own blockstates JSON - separate
   waystone_bottom/waystone_top models per half). A real player
   placement triggers the mod's own code to set the block ABOVE to
   `half=upper`; the pre-placement script's bare `/setblock` only ever
   created the registered default state (`half=lower`) and never
   touched the space above at all - nothing was ever placed there,
   matching "only the bottom block visible" exactly. Fixed by setting
   both halves explicitly in `playtest_starter_kit.js`. Registration as
   a real teleport target is unaffected (confirmed via
   `WaystoneBlockEntityBase.onLoad()` - self-registers on block-entity
   load regardless of placement method). Fresh-world fix only - not
   retroactive for the live save (needs re-placing manually if the
   user wants the existing world's waystone fixed too).
2. **Still HELD** — world depth reduction, parked with the other
   worldgen-risk item for a dedicated later pass.
3. **Cobweb mechanic verified live, quest text updated - then fully
   superseded by the new batch's #19 (combo idea scrapped entirely).**
   Confirmed via a live sandbox test (summoned a real zombie inside a
   cobweb, checked `ActiveEffects` - empty list, confirming cobweb's
   slow is a purely positional per-tick collision effect with no status
   effect involved, so it cannot linger once a mob leaves the block).
   First rewrote the "Better Than Nothing" quest text to describe it as
   two sequential obstacles rather than a combo; **then the new batch's
   #19 asked to drop the cobweb pairing from this quest entirely** ("this
   is what barbed wire does... keep this as a trap progression thing") -
   text now describes Spikes as a plain standalone weak trap, no cobweb
   mention at all. Re-verified via a second sandbox boot (FTB Quests
   still loads all 31 quests, 0 parse errors) before redeploying.
4. **Zcraft Decoration removed entirely.** Only real footprint was 2
   `sfz_shuiniqiang` (Concrete Wall) props flanking the gate - removed
   from fresh-world placement, mod uninstalled (packwiz + live jar).
   **Live-save risk handled**: existing saves that already built their
   base have those 2 blocks placed and would see them turn into real
   "missing block" placeholders once the mod's gone - added a one-time
   migration (`td_zcraftCleanupDone`, runs on login regardless of
   `td_playtestKitGiven` state) that recomputes the exact 2 coordinates
   from this file's own persisted `td_pedestalX/Y/Z` (an exact algebraic
   identity within the same function, not a re-derivation through
   historically-changed constants - confirmed safe) and sets them to
   air. Could not behaviorally verify the migration in the sandbox (no
   real player has ever logged into the test world, so the login-gated
   code path never runs headless) - verified by code review only.
5. **Crafting table waterlogging - re-investigated against the correct
   data source, real root cause still not found, but the block's own
   innocence is now doubly confirmed.** The earlier check looked at the
   wrong thing: this table isn't baked into the structure's NBT at all -
   it's the structure's own baked vanilla `minecraft:crafting_table`
   (confirmed a real furniture piece at local (5,1,4)), overwritten by a
   live `/setblock` to `craftingstation:crafting_station` after the
   structure generates. Re-confirmed directly from the CURRENT live
   jar's blockstate JSON: still zero properties, still structurally
   incapable of holding `waterlogged`. Checked the structure's own known
   `wet_sponge` placeholder issue (the existing floor-wide replace-fill)
   - doesn't reach this position, and the position itself sits on plain
   andesite, not wet_sponge. No water/wet_sponge block exists in the
   structure's own NBT within a 1-block radius of the table either.
   **Remaining real possibility, can't check without the live save**:
   real generated terrain water intersecting the structure at this
   specific world's seed, unrelated to structure content entirely - this
   pack never pins a seed, so no sandbox recreation of this exact
   world is possible. Needs the user to look at what's actually adjacent
   in their own game (a 5-second visual check) or run
   `/data get block ~ ~ ~` while standing on it, to actually resolve
   this - can't be determined remotely without touching their live save.
6. **Green terracotta + snow patch removed.** Real structure NBT check:
   a 3x2 `minecraft:green_terracotta` roof patch at local y=5 with 2
   real snow layers stacked directly on top at local y=6 (a "mossy
   roof with snow" accent), distinct from the plain `minecraft:terracotta`
   weathering used everywhere else on the same roof. Fixed by converting
   the green terracotta to plain terracotta (matching the rest of the
   roof, not a structural hole) and the snow to air. Fresh-world fix
   only, same live-save-migration-math caveat as #4 but NOT applied
   here since this ask didn't request retroactive handling and the
   coordinate derivation would need to pass through several historically-
   changed constants (real, higher risk than #4's exact-identity case) -
   flagging this instead of silently deciding to risk it.
7-8. **Real structural root cause found for "gold still not enough,"
   not just another blind bump.** Full economy audit: the amulet costs
   8 gold_ingot (its only real recipe, confirmed from
   `amulet_pedestal.js`), a hard one-time gate since border-crossing is
   locked to `td_amuletOnPedestal` (confirmed from `amulet_border.js`)
   with NO other exception. Of the loot-bag tiers, only Rare
   (gold_ingot, ~6 expected/bag) and Epic (gold_block, ~10
   ingot-equivalent/bag) carry any gold at all - **Uncommon, the tier
   dropping from the actual trash-floor mobs a player kills constantly,
   had ZERO gold**. Worse: Rare bags are gated behind a SINGLE mob type
   (`split_head_zombie`) appearing only 4 times total across the entire
   8-wave campaign at a 25% drop chance - expected ~1 Rare bag (~6
   ingots) by wave 8, already short of the 8-ingot amulet cost, before
   variance (real ~32% chance of getting *zero* Rare bags at all by
   wave 8). The two OTHER real gold channels
   (`structure_loot_progression.js`'s MID/HIGH_TIER pools) are
   structurally unreachable before the amulet exists at all - both
   trigger at 60+/120+ blocks from spawn, both outside the starting
   50-diameter border, which only the amulet can cross. This is a real
   chicken-and-egg gate, not just a yield problem - explains why the
   previous 2 rounds (doubling Rare-bag yield, fixing split_head_zombie
   availability) never fully closed the gap: both improved richness
   per-roll or mob availability, neither addressed that only 4 total
   *rolls* exist campaign-wide. Fixed by adding `gold_nugget` to the
   Uncommon pool (weight 20, count 6-15) sized via a worked estimate
   (cumulative Uncommon-mob kills by wave, expected bags at the
   existing 50% drop chance) to make the amulet realistically
   affordable by roughly wave 4-6 - meaningfully earlier and far less
   RNG-dependent than the previous "hope for a Rare bag by wave 8"
   reality, without oversizing a single Uncommon entry into
   implausibility. Verified end-to-end via `/loot spawn` in a live
   sandbox - a real `gold_nugget` item entity actually dropped from the
   modified table, not just valid JSON.

**Damage Numbers, Pick Up Notifier, and Xaero's World Border — done,
built and deployed 2026-09-05.** Three small polish items, closes out
the queued Pick Up Notifier/minimap investigations plus a re-attempt of
the long-stuck Damage Numbers pick:
- **Damage Numbers** (luavixen, CurseForge project 1022853) — the
  earlier "wrong mel1x mod" conclusion was a real mistake, re-verified
  via Modrinth's API that this project is genuinely luavixen's own.
  Installed clean, no mandatory dependencies, loads fine on a dedicated
  server (unlike Mob Dismemberment).
- **Pick Up Notifier**, scoped to loot bag opens only — real reflection
  integration built (not the mod's native pickup hook, which can never
  fire for a direct-to-inventory grant), verified end-to-end via a live
  sandbox diagnostic (every class/field/method resolved, message object
  actually constructed). Needs Puzzles Lib as an added dependency. Full
  writeup in FEATURES.md's "Pick Up Notifier + world border on minimap"
  entry.
- **Xaero's World Border** (Modrinth, third-party addon by "Alazi," not
  the real Xaero) — installed via `packwiz modrinth add` since it's
  Modrinth-only; caught and reverted an unintended side effect where
  packwiz's dependency resolution silently switched the already-
  installed Xaero's World Map from CurseForge to Modrinth sourcing.

All three verified via clean sandbox boots and deployed to the live
instance's actual mod/script files. **Real deployment note: mods only
load at full game launch, not on a world/server reload** - this needs
the whole Minecraft client closed and relaunched via the CurseForge
launcher, not just an exit-to-title, to actually take effect. Not yet
confirmed by a real playtest (particle rendering, popup appearance, and
border rendering are all client-visual checks a dedicated sandbox can't
verify).

**New endless-phase design, 2026-09-05 — replaces relying on
hordeSizeScaleFactor for mob COUNT, `spawn_horde` stays for flavor.**
Real finding: `spawn_horde`'s horde tiers have spawnChance values summing
to 100 per tier — a weighted single pick per call, not an independent
roll per entry, so it was never able to hit a deterministic two-part
(zombie vs. other-type) composition target. Resolved design: keep
calling `spawn_horde` unchanged (same attribute scaling, same
randomness/flavor value), ADD a second additive layer guaranteeing a
baseline count every endless wave:
- `z = round(10 + n·1.054^n)` — vanilla `minecraft:zombie` count
- `m = round(5 + n·1.01^n)` — "other types," drawn from the existing
  tiered roster pools, weighted so tougher types show up more as n climbs
- `n` = real wave number

| Wave | z | m | Total |
|---|---|---|---|
| 9 | 24 | 15 | 39 |
| 10 | 27 | 16 | 43 |
| 11 | 30 | 17 | 47 |
| 12 | 33 | 19 | 52 |
| 13 | 36 | 20 | 56 |
| 14 | 39 | 21 | 60 |
| 15 | 43 | 22 | 65 |
| 16 | 47 | 24 | 71 |
| 17 | 52 | 25 | 77 |
| 18 | 56 | 27 | 83 |
| 19 | 62 | 28 | 90 |
| 20 | 67 | 29 | 96 |
| 21 | 73 | 31 | 104 |
| 22 | 80 | 32 | 112 |
| 23 | 87 | 34 | 121 |
| 24 | 95 | 35 | 130 |
| 25 | 103 | 37 | 140 |
| 26 | 112 | 39 | 151 |
| 27 | 122 | 40 | 162 |
| 28 | 132 | 42 | 174 |
| 29 | 143 | 44 | 187 |
| 30 | 155 | 45 | 200 |

Additive, not a replacement — spawn_horde's own mobs land on top of this
baseline. **Built and deployed 2026-09-05.** Peer sent 2 follow-up
clarifications on the spawning model before this was built, both folded
into the shipped version:
- **Not a burst, and not paced across the whole wave either.** Final
  model: mobs stream in continuously starting at wave start, at
  whatever pace the game allows, until the calculated total (z+m) for
  that wave is reached — then stop; no more spawn until the next wave
  triggers. Reuse the existing `pendingSpawns` staggered-drain queue
  technique from waves 1-8, just don't rush it artificially — let it
  genuinely feel like a continuous stream, not a burst, but don't
  stretch it to fill the whole countdown window either (that was a
  since-corrected earlier version of this instruction).
- Spawn target is the pedestal (unconditional-targeting redesign's real
  live objective) — "the amulet" in the original user framing is almost
  certainly old habit from when the amulet gated the objective, worth a
  quick sanity check but not worth blocking on.
- **Performance gate dropped for this specific feature, direct
  instruction**: since spawns trickle in over time rather than landing
  concentrated in one tick, the earlier "needs real tick-time
  measurement before shipping" requirement no longer applies here — the
  separate, already-queued general FPS/world-load investigation still
  stands on its own below, just not as a gate on this.

Implementation, in `wave_spawner.js`'s endless-phase branch: `n` is the
real `waveNumber` (confirmed against the table above, not `endlessLevel`
— e.g. n=9 gives z=24/m=15, n=30 gives z=155/m=45, both match exactly).
"Other types" draw from 3 new toughness tiers (`ENDLESS_OTHER_TIERS`),
weighted by `endlessLevel` (1-40, not raw waveNumber) so heavier tiers
phase in as the difficulty climbs. Reuses the exact same
`randomObjectiveRelativePosition`/`pendingSpawns`/`staggerGapForWave`
machinery waves 1-8 already use (moved `PI`/`SPAWN_DISTANCE_MIN/MAX`/
`randomObjectiveRelativePosition` above the endless branch so both paths
share them) rather than a bespoke queue — `staggerGapForWave`'s own
4-tick/0.2s floor is already reached by wave 9, so every endless wave's
baseline layer drains at that same continuous pace (≈40s for a 200-mob
wave 30), front-loaded at wave start, exactly matching the "stream in,
then stop" spec. `spawn_horde` itself untouched. Verified via a clean
sandbox boot (`node --check` clean, KubeJS loaded 18/18 server scripts
with 0 errors) and deployed to the live instance's script file — **not
yet confirmed by an actual endless-phase playtest** (needs a real wave
9+ run to see the baseline mobs actually arrive and stream in as
intended). Live client was running during deployment; the copied
`.js` file is inert until the next full world/server reload, per this
pack's own established KubeJS load-once behavior — flag this to the user
explicitly before they judge results.

**Real bug found chasing the "hordes still feel small at wave 27"
report — sequential horde-type selection never actually cycled.** Not
the horde-SIZE bug (that curve is confirmed correctly written and
loaded - checked live level 19's real hordeSizeScaleFactor=8.4,
matches the retuned formula exactly; automatic difficulty progression
is also confirmed OFF in the live save, ruling out a silent
day-based override). Real, separate, confirmed bug instead: decompiled
`DifficultyLevelCommand.setDifficulty()` directly - every call, even a
redundant one re-setting the SAME level, unconditionally resets Undead
Nights' own sequential horde-selection index
(`serverState.setPossibleHordesIndex(-1)`). `wave_spawner.js` used to
call `/undeadnights difficulty set` on every single wave regardless of
whether the level had actually changed, so that index reset every wave
too - `listOfPossibleHordes` always resolved its first entry, never
cycling through the later hordes (elite_horde/boss_horde) the way the
mod intends. Fixed by only calling `difficulty set` when the computed
level actually differs from the last one sent. Could NOT confirm or
rule out the "stuck at level 1's exact horde size" claim through static
analysis alone - real per-entry RNG variance at level 19 (~8.4 expected
total, but each of 6+ entries independently rolls its own count and
spawn chance) can plausibly land as low as "a few mobs" on any given
real horde by chance. Real, cheap next step if it's still reported:
have the user run `/undeadnights difficulty query` themselves right
after a wave - a real player command that reports the mod's own current
level directly, not inferred.

**Endless-phase horde SIZE, not just toughness — done.** Direct
feedback once the wave-9 fix actually let mobs spawn: "I want the waves
to feel frantic, actual hordes of zombies... difficulty scaling is a
mix of stronger mobs but MAINLY quantity." Real mechanism decompiled
directly (`SpawnProcess.spawnHordeImplementation`, config variant 2 -
the one this pack uses): per mob entry,
`scaledCount = round(countMin × (1 + hordeScale) × hordeSizeScaleFactor)`,
then each entry independently rolls its own `spawnChance`. Every entry
in every horde has `countMin = countMax = 1`, `hordeScale` is 0
(dynamic scaling disabled), and the old `hordeSizeScaleFactor` curve
started at 1.0 and only crossed whole-number thresholds around level
10+ - so at low-mid endless levels, `scaledCount` mostly rounded to 1
per entry regardless of the "scaling," and each entry's own spawn-chance
thinned it further. Computed real expected mob counts per horde spawn
(not guessed): old curve gave ~1.1 mobs at level 1, ~3.5 by level 40.
Retuned `hordeSizeScaleFactor` to start at 3 and ramp +0.3/level,
capped at 12 (reached level 31) - same real math now gives ~3.5 mobs at
level 1, ~13.8 at level 40 (roughly 3-4x across the board). Deliberately
left per-entry `countMin`/`countMax` and the attribute scale factors
(health/damage/speed) untouched - one clear lever, not two compounding
at once, and toughness scaling wasn't the complaint. Verified: clean
sandbox boot with the edited config. Real cross-thread note: this
increases concurrent mob count in endless phase, directly relevant to
the separately-queued FPS investigation - factor this into that
baseline once picked up, not evaluated against the old, thinner horde
sizes.

**Andesite "medium hard to find" target — done.** Direct user ask, not
just a complaint. Real checks before touching anything: in-chest odds
were already fine (andesite weight 4 of 15 in trash.json's main pool,
~27% per roll, ~54% cumulative across its 1-4 rolls - not stripped by
loot_dead_weight_strip.js, nothing else touches it). The real gate was
structure exposure: all 4 postapocalypse_structures sets
(abandoned_brick_house, redhouse, red_mansion, yellowhouse - the 3
loot tables live across all of them) were still at their original,
untouched 30/15-chunk spacing (480/240 blocks average) - never touched
by the earlier structure-density-fix pass, and genuinely sparse relative
to this pack's early-game explorable radius. Retuned to 16/8 chunks
(256/128 blocks). Verified live via vanilla `/locate`: nearest
redhouse/yellowhouse/red_mansion now 107-137 blocks from a fresh
origin - comfortably reachable within a few waves' worldborder growth.
(abandoned_brick_house is also the player's own base template - its
natural copies read as "found a similar abandoned house," not a bug;
its 48-block real distance in the same test is still covered by the
existing spawn-proximity safety check, not a new risk.)

**Player-danger fix ("retaliate + block path") — decided and done.**
Real side effect of the mob-pathing fix (7d74545): stripping every
TargetGoal instance also removed vanilla's own `HurtByTargetGoal`, so
mobs beelining for the pedestal completely ignored the player even
mid-combat. Decision: mobs keep prioritizing the pedestal, but (a)
fight back if hit, (b) actually attack a player standing in melee
range instead of pathing through them. Fixed both without touching the
pedestal-priority guarantee: `HurtByTargetGoal` is now explicitly
excluded from the strip (kept alive - real vanilla retaliate-when-hit,
no custom logic needed), and the existing 10-tick reassertion loop now
checks distance to the player first (3.5-block melee-block range) and
targets the player instead of the pedestal for that cycle if they're
that close, reverting back to the pedestal the very next cycle once
they're not. Verified live: a real zombie's `HurtByTargetGoal` survives
the strip (target selector goes from 7 goals to exactly 1, that one),
while every ESM re-targeting goal is still correctly removed, zero
exceptions.

**CRITICAL: endless phase (wave 9+) completely non-functional since
2026-09-02 — done, real root cause found and fixed.** Live report:
"wave 9, nothing spawned in at all." Decompiled `HordeSpawner.tick()`
directly (Undead Nights' own class) - the 2026-09-02 fix that set
`undeadNightsEnabled = false` (to stop this pack's own night-locking
from also tripping the mod's autonomous horde-night system) only ever
checked whether `SpawnHordeCommand`'s own method read that flag (it
doesn't). It never checked `HordeSpawner.tick()` itself - the method
that actually processes the pending-horde queue that command adds to -
whose very FIRST line is `if (!getUndeadNightsEnabled()) return 0`.
Every `/undeadnights spawn_horde` call (wave_spawner.js's own endless-
phase trigger) was queuing a real request that nothing ever consumed.
Every endless wave has been vacuously "clearing" with zero real mobs the
entire time - not a regression from today's churn, a real gap since
that earlier fix shipped.
Fix: re-enabled `undeadNightsEnabled`, and closed the 3 real autonomous
trigger paths inside that same method at their own source instead -
`chanceForHordeNight = 0` and `enableRandomHordes = false` across all 40
levels in `undeadnights_difficulty_config.json`, `hordeZombiesSpawnNaturally
= false` in `undeadnights-server.toml` (a third, independent "stray
zombie" 3%-per-tick path, otherwise still live). This also directly
covers the separate Lure Effect disable request (same file, same
all-40-levels edit): `enableLureHordeEffect`/`lureHordeEffectSpawnsHorde`/
`strongLureHordeEffectSpawnsHorde` all set false.
**Real deployment note**: `undeadnights-server.toml` is a Forge
SERVER-type config, baked into the save at world creation
(`saves/<world>/serverconfig/`) - fixed directly in the user's own live
save, not just defaultconfigs, but still needs them to exit and reload
that SAME world (not a fresh one) for it to take effect. Real expected
side effect once they do: their save has backed-up pending-horde
requests from the wave 10-19 horn-spam - likely a noticeable batch of
mobs materializing at once rather than a clean single wave, not a bug.
Verified: clean sandbox boot with all edited configs, no load errors -
full player-triggered confirmation still pending their next login (same
real-player blind spot as every other player-input-dependent fix this
session).

**7-item live feedback batch — all done.**
1. HUD element for waves cleared - done, plain vanilla scoreboard
   sidebar (`td_waves_cleared`), objective created once at login
   (playtest_starter_kit.js), real value set every time a wave is
   actually marked cleared (wave_status.js). Verified live via RCON.
2. Loot bag notification "cooler" rendering - investigated, no genuine
   fit among already-installed mods (ToastControl is a filter/reposition
   layer over vanilla's own toast triggers, can't push custom text; Jade
   is unrelated). Real candidate found afterward: **Pick Up Notifier**
   by Fuzs, not yet installed - real Forge 1.20.1 build confirmed to
   exist, genuine theming. Needs its own investigation before building
   (native pickup-event hook vs. BountyBags granting items directly into
   inventory, not via walk-over pickup) - not started yet, queued.
3. Quest reward audit - done, all 19 original quests + the new
   repeatable one reviewed; found the real gap was much bigger than
   first estimated (only 1 of 19 quests already had a tangible reward,
   not 6 - the others were mistaking "the task requires this item" for
   "the reward gives this item"). Full proposed table approved as
   written and built exactly as proposed - real item rewards alongside
   existing XP on every quest, tied thematically to what each quest is
   about ("traps give iron" pattern). Verified live: FTB Quests loads
   the edited file with 0 errors.
4. Crafting table waterlogged bug - investigated thoroughly, could NOT
   reproduce or find a real cause. `craftingstation:crafting_station`'s
   blockstate has zero properties (confirmed via its real blockstate
   JSON and its real block-entity data after a live placement) - it
   cannot be waterlogged, full stop. No water source anywhere in the
   raw structure NBT near that position either. Reporting as a null
   result rather than guessing a fix - possibly a visual misread, or a
   different cause not reproducible from static data alone.
5. Pre-place a Waystone + Tier 1 completion reward - done. Waystone
   placed in the yard next to the pedestal at login
   (playtest_starter_kit.js), same pre-placement convention. Tier-1-
   complete quest identified from the real dependency graph (not
   assumed): "The Reckoning" - the quest whose own text says "Five
   waves was as far as whoever held this post before you got... you've
   matched that" - real narrative gate at the wave-5 milestone, gets a
   bonus `waystones:waystone` reward alongside its XP/golden_apple.
   Verified live via RCON: real waystone places with a genuine UUID
   (mod registers it immediately as a valid destination).
6. Repeatable "in case you lose it" wave_horn quest - done, new quest
   "Lost the Horn?", `can_repeat: true`, 60-second cooldown (checked
   FTB Quests' own Quest.class directly for the real field names/units -
   `repeat_cooldown` is real seconds, not ticks). Description explains
   what the horn does, doubling as documentation per the ask.
7. Wave-start sound - done, vanilla `block.bell.use` wired to both
   wave-start announcement points (hand-authored 1-8 and endless 9+),
   explicit placeholder per the ask.

**7-item live feedback batch, 2026-09-05 — original dispatch, see the
"all done" writeup near the top of this file for real results.** Item
2 (loot bag notification) is the one real exception - investigated, no
fit found among what was already installed, still open pending the
Pick Up Notifier investigation.

**Live report, 2026-09-04 (mid-playtest, right after the mob-pathing
fix shipped) — checked, NOT a regression.** "spitter's path seems off."
Summoned a real spitter in a sandbox and inspected its actual goal
selector before/after the strip: only the 2 real
`ESM_EntityAINearestAttackableTarget` goals were removed, exactly as
intended - `ESM_EntityAIAttackRanged` (its real ranged/kiting attack
goal) is fully intact both before and after. Real explanation instead:
that goal reads the mob's current `setTarget()`-assigned target for its
own logic, so once locked onto the pedestal it does what it's actually
coded to do - stop closing distance once in firing range and strafe
side-to-side around that range rather than walking straight in.
**Decision came back: force melee close-in against the pedestal
specifically, keep strafe-and-shoot against a player — done.**
`ESM_EntityAIAttackRanged` is now removed from the goal selector inside
the same one-time strip that already runs when a mob's target is forced
onto the pedestal (structural scoping, not a runtime check - the
function only ever runs from that one call site). Spitter already has a
real `ESM_EntityAIAttackMelee` goal registered alongside the ranged one,
so removing just the ranged goal is enough for melee to take over on its
own - no new goal needed. Verified live against a real spitter: ranged
goal gone, melee goal + all other real behavior (swimming, wander,
avoid-explosion, look-around) intact, zero exceptions.

**2 more live reports, 2026-09-04 — both done, real numbers checked.**
- **"Not getting enough gold still" (round 2, after item #15's per-bag
  yield bump).** Real bottleneck was availability, not yield:
  `gold_ingot`'s only source (loot_bag_drops.js's `RARE_MOBS`, 25%
  chance) was down to exactly 1 mob (`mutantszombies:split_head_zombie`,
  confirmed via the file directly), which only appeared in wave 4 (2
  individuals) in the entire hand-authored campaign and was completely
  absent from the endless-phase horde config - zero gold income past
  wave 8. Fixed by adding it to wave 6 as well and to
  `undeadnights_horde_mobs_config.json`'s `trash_horde` tier, so it has
  a second hand-authored appearance and genuine ongoing endless-phase
  presence instead of 2 individuals total.
- **"The brutes are very tanky... should be coming in later waves,
  seeing them from wave 7."** Real, already-documented cause: the TFTH-
  removal mapping (18302f7) deliberately reused
  `mutantszombies:mutant_brute`/`zombie_brute` a wave early to fill two
  old TFTH slots - explicitly flagged in that commit's own comment as a
  duplicate against their real wave-8 debut. Not a stat-nerf ask - fixed
  by removing the early-wave duplicate (wave 7 now repeats already-
  established mid-tier picks: a second Elite Zombie, more Horde Zombie,
  another Spitter) so Mutant Brute/Zombie Brute's actual first
  appearance is wave 8 again, untouched.

**REPRIORITIZED 2026-09-04 — mob pathing/aggression to the pedestal was
the user's real #1, "the main bug bear."** Done, see item 3 below - real
root cause (ESM splits its re-targeting goals across both selector
fields, plus a genuine cross-file function-name collision between
mob_aggro.js and playtest_starter_kit.js) found and fixed the same day,
commit 7d74545.

**Real playtest findings from actual play, dispatched 2026-09-04
(after the structure/loot fixes shipped) — priority over background
spacing-tuning:**
1. **Remove all TFTH mobs entirely — done, commit 18302f7.** Full
   replacement mapping in wave_spawner.js's WAVES header comment.
   **Sound-for-atmosphere question — decided and done.** User's call:
   extract the one asset, uninstall TFTH fully, no dormant mod. Picked
   `suffer_death.ogg` from TFTH's own real sound registry - Flesh
   Suffer was this pack's own documented most dangerous removed mob
   (a real combat log showed it killing the player 4 times at wave 5,
   before a damage nerf), the clearest "distinctive/atmospheric" fit,
   not a guess. Extracted into this pack's own resource pack
   (`kubejs:flesh_suffer_death`, new `flesh_death_sound.js`), wired to
   play on death for the roster's own higher-tier mobs only (loot_bag_
   drops.js's EPIC_MOBS/LEGENDARY_MOBS tiers) via a real, decompile-
   confirmed KubeJS event (`EntityEvents.death`). TFTH fully removed:
   packwiz uninstalled, both config files deleted, live jar removed.
   Verified live: clean sandbox boot with TFTH genuinely absent (0
   KubeJS script errors, the new sound script loads fine) - the one
   real warning ("Missing data pack mod:the_flesh_that_hates") is just
   that reused sandbox world's own stale datapack-list metadata, not a
   crash or a real problem; confirmed zero TFTH references remain
   anywhere in the live instance's actual config/script files.
2. **Iron rolling still insufficient with the Hand Crank actually
   connected — done, commit pending this session.** Real numbers,
   decompiled not guessed: Hand Crank is Create's own ACTIVE power
   source (32 RPM but decays to 0 every 10 ticks/0.5s without
   re-clicking, even costs the player hunger) - gearing can't fix an
   on/off source. Fixed by cutting `rolling_mill_processing_duration`
   120 → 40 in `createaddition-common.toml` (now tracked in repo for the
   first time). Full numbers in FEATURES.md.
3. **Mobs not pathing to the pedestal reliably in real play — done,
   commit 7d74545.** Real root cause: ESM splits its
   ESM_EntityAINearestAttackableTarget goals across BOTH of a mob's
   target-goal-selector fields, and the old content-based check only
   caught one; separately, mob_aggro.js and playtest_starter_kit.js had
   a real cross-file function-name collision (top-level functions DO
   share across server_scripts in this build) that was silently
   corrupting mob_aggro.js's own reflection calls - the actual cause of
   54 confirmed live errors. Both fixed, verified against 3 real mob
   types in a sandbox. Full writeup in FEATURES.md.

**2 more real asks, dispatched 2026-09-04, alongside the 3 playtest
findings above:**
4. **Escalating time-between-waves — done, commit pending this
   session.** 90s at wave 1, +15s/wave, capped at the original 3min at
   wave 7. Real title/chat announcement at wave 5 ("THE NIGHTS GROW
   LONGER"), alongside the existing gear-removal beat there. Full curve
   verified in a sandbox. Full detail in FEATURES.md's "Countdown
   timer" entry.
5. **Trapcraft's Spikes re-introduced as the weak Tier 1 interim trap,
   below Barbed Wire — done, built and deployed 2026-09-05.** Real stock
   recipe (5 iron ingots, decompiled from the jar) was too steep for
   "weak/cheap interim" - retuned via new `tier1_recipes.js` (mirrors
   `tier2_recipes.js`'s pattern) to 4 sticks + 1 iron ingot, the cheapest
   defense item in the pack. "Damage AND slow" resolved by pairing with
   plain vanilla cobweb (its own real slow effect) rather than a code
   change - `SpikesBlock.java` only ever damages, confirmed by
   decompiling it, so the new quest's own description spells the
   cobweb pairing out to the player directly instead of leaving it
   silent. New quest "Better Than Nothing" added to `campaign.snbt`
   (fresh id, no collision with any existing progress - purely
   additive). Verified via clean sandbox boot (0 script errors, 0 failed
   recipes, FTB Quests logged the expected 31-quest count) and deployed;
   `packwiz refresh` run, hashes clean. Full detail in FEATURES.md's
   "Trapcraft Spikes re-introduced" entry under Tier 1 defenses. **Not
   yet confirmed by a real playtest.**

**2 more real bugs, dispatched 2026-09-04, alongside the structure-
proximity regression above:**
1. **Big Lost City — full clean removal — done, shipped 2026-09-04
   (commit bee3780).** User's manual jar deletion had left dangling
   KubeJS override references (`Unbound values in registry
   ResourceKey[...worldgen/structure]`, all 37 real ids) — real live
   crash, root-caused against the live save directly. Fixed via proper
   packwiz removal + `rm -rf` of all 62 structure/structure_set override
   files + `packwiz refresh`, both repo and live instance. Philip's
   Ruins confirmed untouched.
2. **Starter loot scattering on the floor at spawn — done, shipped
   2026-09-04.** User's own diagnosis was right, confirmed via direct
   NBT inspection: the 5 real barrels (`abandoned_brick_house.nbt`)
   carry a `LootTable` reference, not pre-filled `Items` — vanilla
   resolves that lazily the first time anything queries the container,
   including the game's own `Containers.dropContentsOnDestroy` path that
   fires when `playtest_starter_kit.js`'s existing `setblock ... air`
   removal loop runs. That lazy-resolve-then-drop, not a "destroy after"
   ordering bug per se, was the real mechanism. Fixed by stripping the
   `LootTable` tag from the raw structure NBT (new datapack override,
   `pack/kubejs/data/postapocalypse_structures/structures/
   abandoned_brick_house.nbt`, same convention as the earlier horse-entity
   overrides) so the barrels are placed genuinely empty — confirmed
   byte-identical to the original except those 5 block entities.
   Verified live end-to-end: placed the template, confirmed
   `Items: []`/no `LootTable` tag on all 5 barrels via `/data get
   block`, ran the exact same removal sequence the real code uses, and
   confirmed zero item entities on the ground afterward.

**Polish/utility mod pass, 2026-09-04 — PAUSED 2026-09-04, 2 of 7 picks
installed.** Direct call: "i just want a stable non structure heavy
playthrough" — real bugs (structure-proximity regression, Big Lost City
crash/removal, loot-scatter) took full priority over adding more surface
area. All 3 are now fixed (2026-09-04) — still holding until the user's
had a real, confirmed playthrough on a fresh world; don't resume on its
own before that. Full spec in FEATURES.md's "Polish/utility mod pass,
2026-09-04" section (right before "Tried and explicitly retired").
- [done] **Sodium/Embeddium Dynamic Lights** + its real dependency
  **Sodium/Embeddium Options API** - installed via packwiz, both jars
  downloaded and sha1-verified, deployed to the live instance.
- [reverted, real incompatibility found] **Subtle Effects** - initially
  installed and deployed, but a genuine full-mod-set sandbox boot test
  (prompted by a direct "is it safe to launch" check, not run
  proactively enough beforehand - real process gap, noted) caught a
  real crash: `Mod 'subtle_effects' requires forge 47.4.14 or above.
  Currently, forge is 47.4.10`. Checked the real `mods.toml` in the
  installed jar directly to confirm the exact version floor, then
  checked the 2 next-older CurseForge releases (1.14.2, 1.14.1) the
  same way - **both carry the identical `[47.4.14,)` requirement**, so
  this isn't a recent regression to dodge by downgrading, the mod
  genuinely needs a newer Forge than this pack is pinned to across its
  whole recent history. Removed entirely (packwiz + live jar + sandbox)
  rather than bump this pack's own pinned Forge version unilaterally -
  that's a real, separate decision (bumping 47.4.10→47.4.14+ is a much
  smaller ask than the NeoForge migration this pack has already
  deliberately deferred, but still a real call, not mine to make
  silently for one polish mod). Re-verified clean: a full fresh-world
  boot with the complete corrected mod set reached "Done," 16/16 KubeJS
  scripts with 0 errors, FTB Quests loaded its full 29 quests.
- [real blocker found, not guessed past] **Damage Numbers by
  luavixen** - genuinely harder to pin down than expected. Two separate
  CurseForge search attempts (`damage numbers`, then the exact slug
  `damagenumbers`) both resolved to the SAME wrong project - confirmed
  by checking the real project-id in each resulting `.pw.toml`, not
  just eyeballing the filename: both are project 1022853, **mel1x's
  mod** ("Fabric mod... floating damage values" per its own CurseForge
  page - wrong author AND wrong loader), not luavixen's. Removed both
  wrong installs before anything reached the live instance. Real
  candidates confirmed to exist by name+author via a proper CurseForge
  search (luavixen's "Damage Numbers," "adds simple damage number
  particles when any entity takes damage") but its own real slug/URL
  and Forge 1.20.1 file availability still need a direct check, not
  another guessed slug.
- [not started] FancyMenu + Drippy Loading Screen, EMF + ETF, Fresh
  Animations, Tissou's Zombie Pack, and the real live layering check
  between the two resource packs.

**Real playtest feedback batch, 2026-09-04 — held, NOT sent to build.**
Full spec for every item in FEATURES.md's "Real playtest feedback batch,
2026-09-04" section (right before "Tried and explicitly retired"). Kept
here as a literal checklist matching the user's own original 1-27
numbering, not a thematic regroup — the thematic version of this entry
(replaced 2026-09-04) buried items badly enough that #14/#20/#24/#25 (4
separate original points, all really one mob-roster decision) read as
"touched on a handful of things" instead of 27 tracked items. This list
is the single source of truth for what's decided vs. still needs a call
— update the tag in place as each resolves, don't re-summarize from
memory.

1. [done, shipped 2026-09-04] Ditch doomsday decorations, AND uninstall
   the mod outright (now fully unused) + delete its lang override.
2. [confirmed] Re:Entity Outliner — real Forge 1.20.1 build, direct fit.
   Not yet installed - no install action requested in this batch.
3. [done, shipped 2026-09-04] Cobwebs removed / grave markers removed
   entirely (flavor tie-in to wave 5 knowingly dropped, not missed) /
   decorative barbed wire line removed / entrance → 3-wide, no door.
4. [done, shipped 2026-09-04] Pedestal HP bar — always-visible-in-range
   bossbar (`kubejs:pedestal_health`, real vanilla `/bossbar`, red,
   0-200). Verified live: every command (`add`/`color`/`max`/`value`/
   `players`/`remove`) confirmed working via direct RCON test.
5. [done, shipped 2026-09-04] Starter loot chests — all 5 real ones
   removed (decompiled the structure's own NBT directly - the original
   "8 chests/barrels" count doesn't match the real file, no chests
   exist at all, only 5 barrels).
6. [done, shipped 2026-09-04] "Bed-like" blocks upstairs — identified
   as real vanilla `minecraft:spruce_trapdoor` x4 (a trapdoor-bed
   decoration trick), not a mod-furniture block as guessed, at local
   [3-6,5,4] in the structure's own NBT. User's call: cleared, not
   reskinned - same as the rest of this batch's decoration-debt strip.
7. [done, shipped 2026-09-04] Front wall pushed out - implemented as a
   +3 gate-to-pedestal buffer (z1-4 -> z1-7) paired with a matching +3
   on COURTYARD_DEPTH so the rig/building gaps this layout depends on
   stay exactly what they were. A naive pedestal-only shift would have
   collided the kinetic rig with the building - caught before shipping.
8. [done, shipped 2026-09-04] Reinforce the whole house — full uniform
   coverage, no falloff. **Real scope correction found while building,
   not assumed**: the structure's true solid wall shell doesn't sit at
   its own bounding-box edges (x=0/11, z=0/10 - checked first, found
   zero real wall blocks there) - the actual walls are 2 blocks further
   in (x=2/9, z=2/9), the outer ring being a real porch/eave overhang.
   Decompiled the real NBT to find all 283 blocks on those 4 wall
   planes, matched each against SecurityCraft's own 495 real
   reinforced-block ids (checked directly - confirmed there is NO plain
   `reinforced_terracotta`, only the 16 dyed-color variants), and
   preserved every block's own exact orientation (facing/axis/slab
   type/wall connection state) from its real NBT properties rather than
   a blanket `/fill` (which would have flattened every stairs/slab/wall
   block to one uniform orientation). **Real, honest result: 212 of 283
   wall blocks (75%) covered.** Real gaps, not silently claimed as
   covered: plain terracotta (36 blocks, no reinforced equivalent
   exists at all), oak_leaves (18) and vine (17, both genuinely
   decorative). Only covers the 4 wall planes, not the roof (a real,
   stated scope limit). Verified live end-to-end: all 212 real
   `/setblock` commands executed via RCON batch with zero errors at the
   script's own real computed coordinates, spot-confirmed a real
   `reinforced_bricks` block present at its exact expected position,
   and the complete file (200+ new lines) reboots clean with 0 KubeJS
   errors.
9. [decided] Revisit house structure — parked, not pursued now (keeps
   #6/#12's NBT-decompile work on the current house worth doing).
10. [likely already works, unconfirmed] Inventory Sorter middle-click —
    real client-interaction check, can't be verified from this
    environment (no real graphical client/player, the same blind spot
    this session has hit before) - needs the user's own live test.
11. [done, shipped 2026-09-04] Crafting table → Crafting Station
    Improved (`craftingstation:crafting_station`, confirmed real via
    the mod's own blockstate JSON - single-variant, no facing property
    - and live-verified placeable in a sandbox).
12. [done, shipped 2026-09-04] Cauldron + tripwire hook — both removed,
    same NBT-decompile pass as #5/#6/#11 (real local coords: cauldron
    [8,1,5], tripwire hook [8,2,5]).
13. [investigated 2026-09-04, no code regression found] Iron rolling
    regression — checked git history first: the rig placement code
    hasn't changed at all since the last confirmed-working commit
    (46a884b, the 2-block Press/Depot clearance fix), ruling out a
    script regression directly. Live-reverified the CURRENT exact
    geometry end-to-end in a sandbox: a real iron_ingot dropped on the
    Depot correctly converted to `create:iron_sheet` via the Press, and
    the Rolling Mill correctly converted that sheet into 2x
    `createaddition:iron_wire` - the full pipeline works when powered
    from the correct kinetic input side. **Real remaining limit, not
    solved**: the rig ships deliberately UNPOWERED by design ("the only
    remaining player task is crafting a Hand Crank and connecting it")
    - "regressed" most likely traces to the player's own manual crank
    connection (whether it's connected, connected to the wrong spot, or
    a hand crank's real low rotational speed making throughput feel
    much slower than the creative-motor test conditions), which is an
    interactive building step this environment can't test without a
    real player.
14. [decided method, real prep done] TFTH roster audit, not blanket
    removal — Flesh Hysterizer confirmed cut. **Screenshot pass ruled
    out 2026-09-04** - this environment has no graphical client (same
    blind spot as #10/#16), so an actual visual audit isn't achievable
    from here. Instead did the real, cheap check that IS possible: live
    `/summon`-tested all 7 remaining TFTH mobs - all genuinely
    registered and summonable, no dead/renamed ids. **Real, useful find
    along the way**: `plaquecreaturetwo`'s actual in-game display name
    is "Flesh Hunter One," not something matching its own registry id -
    worth knowing before the user goes looking for it by a name that
    won't appear anywhere in-game. The user will do the real visual
    keep/cut call themselves next time they're in-game.
15. [done, shipped 2026-09-04] Gold roll bump — BountyBags Rare bag,
    weight 30→45, count 4-6→6-9 (roughly doubles expected gold per
    hit, first-pass tuning number).
16. [needs investigation, real limit] World border on minimap —
    checked config (no toggle key exists for it either way, only an
    unrelated "claim_border" opacity setting) - whether it actually
    renders is a real client-visual check this environment can't
    perform (no graphical client). Needs the user's own look in-game.
17. [done, shipped 2026-09-04] Quest book keybind → Tab - already bound
    correctly in the live `options.txt`. **Real conflict confirmed by
    checking, not assumed**: vanilla's own player-list overlay
    (`key.playerlist`) is ALSO bound to Tab on the same profile -
    pressing Tab now triggers both actions. Flagged, not rebound
    unilaterally - this pack's own live config already has several
    pre-existing multi-bindings on other keys (three separate binds
    share 'u' alone), so this isn't unprecedented. **User's call
    2026-09-04: keep Tab as-is, accept losing the vanilla player-list
    overlay** - no rebind needed. Shipping this as tracked config for a
    fresh install is still a real open question (`options.txt` is
    client-local state, not a mod config folder, and shipping it
    wholesale would lock in unrelated settings too) but not blocking -
    the live instance already has the right binding.
18. [done, shipped 2026-09-04] Minimap defaults — north-lock on;
    `displayed: false` set on every non-hostile category (players,
    friendly, items, other_entities) plus hostile's own `tamed`
    subcategory. **Real bug caught by decompiling Xaero's own
    `RadarColor` enum, not assumed**: the "hostile" category had no
    explicit color override at all, so it was inheriting YELLOW (index
    14) from its parent, not red - the color-index legend matches
    vanilla's 16 chat-color codes in declaration order (RED = index
    12), added explicitly.
19. [done, shipped 2026-09-04] Passive mobs still spawning — confirmed
    broader than horses, and fixed pack-wide. Real root cause: baked
    passive-mob entities directly in structure `.nbt` files (a
    placement path that bypasses `no_passive_mobs.js`'s spawn-event
    hook entirely), not a gap in the mob id list itself. Scanned and
    stripped across all 5 installed structure mods: 25 files fixed (24
    beyond the original single horse file), Philip's Ruins confirmed
    clean. Full writeup in the "Fresh-world playtest, round 3" entry
    above.
20. [folded into #14] TFTH audit example — Flesh Brute I confirmed
    keeper.
21. [done, shipped 2026-09-04] Loot bag open notification —
    custom-built (`loot_bag_notification.js`), hooked directly to the
    bag's own open action. **Real check done before building, not
    assumed**: decompiled BountyBags' own `LootBagItem#use()` directly
    - it sends exactly one real player-facing message (the luck-upgrade
    notice) and never notifies on the actual loot contents (only
    server-console debug logs) - confirms a custom hook was genuinely
    needed. Real technique: `PlayerEvents.inventoryChanged` (confirmed
    via decompile to fire per-slot with the resulting stack) collected
    during a short window opened by the bag's own right-click, chat
    message sent one tick later once the bag's fully-synchronous
    granting has finished.
22. [done, shipped 2026-09-04] Debug wave-complete command
    (`/tdforceclear`, OP-gated) — kills every real hostile within the
    same radius/objective the real clear-check already uses, so the
    existing tick-based detection fires the normal clear sequence on
    its own next pass rather than duplicating that logic. Verified
    live: command registers and executes cleanly via RCON (rejected
    only for the expected reason - no real player attached to a
    console/RCON command source).
23. [done, shipped 2026-09-04] Tips & tricks quest chapter — new
    `tips_and_tricks.snbt` chapter, all 10 confirmed tips (see list
    below), F3 dropped per direct "no." Verified live: fresh sandbox
    boot loaded "2 chapters, 29 quests" (19 + 10), 0 FTB Quests errors
    - real caution given this pack's own documented FTB Quests syntax
    crash history.
24. [real prep done, verify by eye] Other brute mob — same screenshot
    ruled out as #14, real non-visual data gathered instead: both
    `mutantszombies:zombie_brute` and `mutant_brute` confirmed
    summonable, plus their real distinguishing stats (live-checked, not
    guessed) - Zombie Brute: 100 HP / 16 attack; Mutant Brute: 120 HP /
    18 attack (tougher and hits harder). The name itself is a real clue
    too - "Zombie Brute" is the more zombie-like one by naming alone,
    not verified visually. Final identification still the user's own
    call in-game.
25. [done, shipped 2026-09-04] Flesh Hysterizer removed (same call as
    #14) — wave 8's slot filled with `mutantszombies:crawler` (the
    Advanced Wall Climber API mob), user's pick from the 4 real
    unused-candidate options. Updated in all 5 files that duplicate the
    mob roster (wave_spawner.js's WAVES + WAVE_MOB_TYPES, mob_aggro.js,
    pedestal_health.js, wave_status.js, loot_bag_drops.js's
    LEGENDARY_MOBS).
26. [investigated 2026-09-04, real numbers found] Barbed wire vs.
    Mutant Brute — **not a resistance/immunity issue, checked directly
    by decompiling `BarbedWireBlock#entityInside()`**: damage goes
    through the real, standard `Entity#hurt()` pipeline via a genuine
    (if custom) DamageSource, nothing mod-specific blocks it. Real
    cause is simpler: `barbed_wire_damage = 2.0` (config, confirmed) vs.
    Mutant Brute's real 120 max HP (confirmed live via
    `/attribute ... base get`) - 60 hits to kill from wire alone,
    genuinely negligible, not broken. **Real trap comparison, not
    guessed** (decompiled each mod's own damage logic):
    - **Trapcraft's Bear Trap**: only 1.0 dmg per ~1-2 real seconds
      while a mob is caught, but it also adds a real `DoNothingGoal`
      that holds the mob in place for the whole time it's trapped -
      the actual value here is crowd control, not raw damage.
      **Real pick to prioritize**, given the ask was specifically about
      a tanky mob that's hard to whittle down - holding it still lets
      other defenses (turrets, the player) actually focus it.
    - **Medieval Defense Turrets' Landmine**
      (`medievalturrets:landmine`): real 12.0 damage in one hit (6x
      barbed wire, 12x a single bear-trap tick) - genuinely meaningful
      burst, but single-use (consumed on trigger) and needs real
      redstone wiring to fire, not a simple walkover trap.
    - Archer Turret (`medievalturrets:archer_block`) not checked -
      needs a real ammo/targeting setup this session didn't have time
      to verify live, flagged as unchecked rather than guessed.
27. [blocker resolved, flow not yet built, PAUSED 2026-09-04 — stability
    first, see the priority note at the top of "Ready to build"] Manual
    fresh-start trigger:
    craftable/given item, same pattern as the Wave Horn. All-players-
    killed: **build the real multiplayer check**, not simplified to
    solo-player-death (user chose "plan for multiplayer" over the
    simpler singleplayer-only option). **Real blocker answered
    2026-09-04, not guessed**: compared the real `ftbquests/<uuid>.snbt`
    progress file across two different save folders on the live
    instance directly - genuinely different completion timestamps/task
    counts despite the same player UUID, confirming progress is real
    per-world save data, NOT shared or account-wide. "New world, keep
    quest progress" needs a real export/import step, exactly as
    suspected - it will never happen for free. Neither restart flow
    itself is built yet (this was investigation only, the actual
    mechanism - game-over trigger, quest export/import, fresh-start
    item, multiplayer all-killed detection - is real remaining work).

**Tips & Tricks chapter — confirmed content**, F3 dropped by direct
"no," everything else kept:
1. Z — zoom in (Just Zoom).
2. R — view a JEI recipe for the item you're hovering.
3. U — see what uses the item you're hovering (JEI).
4. M — open the full world map (Xaero World Map).
5. Tab — open the quest book (once #17 ships).
6. Middle-click a container — auto-sort its items (once #10's confirmed
   live).
7. Just look at a block or mob — Jade shows live info with no keybind
   needed.
8. Right-click a loot bag to open it.
9. Open your inventory and find the Curios accessory slot — that's
   where the amulet goes, not the armor slots.
10. Waystones — set one, then teleport back to it from any other
    Waystone once unlocked.

**Real status as of 2026-09-04**: 17 of 27 items done and shipped
(#1/#3/#4/#5/#6/#7/#8/#11/#12/#15/#17/#18/#21/#22/#23/#25, plus #19
already covered in "Fresh-world playtest, round 3" above). #13 and #26
are real investigated findings, not open questions - #13 found no code
regression (the rig works end-to-end when powered, real remaining cause
is the player's own hand-crank connection, an interactive step this
environment can't test); #26 found the real numbers (barbed wire's 2.0
dmg vs Mutant Brute's 120 HP, not a resistance issue) plus a real trap
comparison recommending the Bear Trap's crowd-control value over raw
damage. #27's real blocker is answered too (quest progress is
per-world, needs a real export/import step) but the restart flow itself
isn't built yet - the one substantial remaining build item from this
batch. #14/#20/#24's screenshot pass was ruled out (no graphical client
in this environment, same blind spot as #10/#16) - real non-visual prep
done instead: all 7 TFTH mobs and both brute variants confirmed real
and summonable, plus the brutes' real distinguishing stats gathered
live. The user does the final visual keep/cut call themselves in-game.
Still genuinely open: #9 (parked by design), #10/#16 (real
client-visual/interaction checks this environment can't perform - need
the user's own in-game look), #2 (verified real, not installed - no
install was actually requested).

**2026-09-01 playtest feedback batch** — real extended playtest, first
one to exercise the endless-phase scaling, Tier 2, and the base
redesign together. Sequenced 2026-09-01 (user-confirmed order). Phases
1, 2, and 4 are done (see "Built, awaiting your next playtest"); Phase 3
is partially done (structure loot fix shipped for one of two mods, see
below); Phase 5 not started:

3. Structure improvements, remaining — spawners in structures, held
   until after the aesthetic structure variety pass and Abandoned
   Urban's chest fix land and prove stable (user's own sequencing call,
   2026-09-04) — same real jigsaw/structure-generation crash-history
   caution as always, not stacking structure-gen changes in one pass.
5. Decoration polish last — lang-file fix is cheap and can happen any
   time, but placement/density reassessment waits until the user has
   actually seen the redesigned base in a fresh world.

- **Structure spawners — held, not sent yet.** Add spawners to
  structures for real danger via the same `processors` technique as
  the chest-loot fix below. Deliberately sequenced *after* the aesthetic
  structure variety pass and the Abandoned Urban chest fix (both sent
  2026-09-04) rather than stacked into the same batch — this pack has a
  documented history of jigsaw/structure-generation crashes from
  exactly this kind of change, and 3 structure-gen changes landing
  together would make any new crash much harder to root-cause. Send
  once those two are confirmed stable.
- **Decoration quality**: placement itself read as "lame" — worth a
  look once visually confirmed, may need denser/more varied placement
  rather than a mod swap. (Chinese labels fixed, see "Built" below.)
- **Modded crafting materials in loot — retracted 2026-09-06.** Original
  spec (bonus rolls of Create's andesite_alloy/iron_sheet/iron_wire)
  pulled after direct correction: those items are the literal outputs
  of the Press/Rolling Mill rig already pre-placed at the base, and
  andesite_alloy undercuts the existing andesite exploration-gating —
  loot shouldn't hand out shortcuts to what a placed home machine
  already makes. Full writeup + the resulting standing design principle
  in FEATURES.md's "Modded crafting materials in loot" entry (under
  "Loot bags"). No replacement item proposed — revisit once Tier 3-4/
  Storage & Power ships real components nothing at home can make.
  Superseded by the loot-table dead-weight audit below.

## In progress (sent directly to the build session)

- **Fresh-world playtest, round 3 — done, shipped 2026-09-04 (real
  commit date, not the dispatch's own 2026-09-06 dating).** Full detail
  in FEATURES.md right after "Real playtest report, 2026-09-06" (under
  "Reduce vegetation near spawn"). All 3 original items done and
  live-verified, plus a real 4th finding along the way:
  1. **Savanna/savanna_plateau removed entirely** from the spawn search
     (both `wasteland.json` and `playtest_starter_kit.js`), radius
     widened 1200 → 4000 blocks (justified against real prior data in
     this pack's own history, not guessed). Verified live: multiple
     fresh-world runs each found real desert-only spawns, at distances
     up to ~3600 blocks confirming the wider radius was actually needed.
  2. **Horses root-caused, not just patched**: confirmed the existing
     `no_passive_mobs.js` hook DOES catch natural chunk-population
     spawns (10/10 live); the real bug was baked-in horse entities in
     one of The Lost City's own structure NBTs, a placement path that
     doesn't fire KubeJS's spawn event at all (checked - no catch-all
     "entity joined" event exists in this KubeJS build). Fixed by
     surgically stripping the 3 horse entities from that one file's real
     NBT data via `prismarine-nbt`, leaving its 17 other real entities
     (villagers, decor) untouched. Verified live: placed the real
     template, confirmed villagers present, zero horses anywhere.
  3. **Structure-proximity check** added to the spawn search via real
     reflection into vanilla's `findNearestMapStructure` (SRG-obfuscated
     in this build). Caught and fixed 2 real ambiguous-reflection bugs
     along the way (`Class#getMethods()`'s ordering is unspecified by
     the JLS - a naive shape match picked the wrong same-shaped method
     between separate boots, twice, for two different classes) before
     trusting it. `STRUCTURE_MIN_DISTANCE = 200` blocks, justified
     against this pack's own real border-growth curve (caps at diameter
     125 across the full 8-wave campaign). Verified live end-to-end: a
     real 208.6-block distance computed and correctly accepted against
     the threshold, not a trivial pass.
     **REAL REGRESSION REPORTED, ROOT-CAUSED AND FIXED — 2026-09-04.**
     Real fresh playtest found structures spawning "way too close, even
     to the point of the base structure spawning on top of other
     structures." Root cause found via live instrumented diagnostic
     against the real live save's exact seed (`-7367485585009964989`):
     the merged-registry proximity check itself was working correctly
     (not scoped to one mod, not a timing gap, not missing from the
     login path — all 4 originally-suspected causes ruled out). The
     real problem was density: Philip's Ruins' 14 structure_sets were
     all packed at vanilla-village-tier spacing (16/8 chunks), and
     collectively made every biome-matched wasteland candidate within
     the full 4000-block search fail the 200-block clearance check —
     100% rejection, confirmed both before AND after Big Lost City's
     removal (best case only 192.67 blocks, just short). Worse: when
     the search came up empty, the login handler fell back to
     `spreadplayers 0 0` with **zero** structure-proximity protection at
     all — that unchecked fallback, not the threshold number, is what
     actually produced the reported overlap.
     Fix (evidence-based, not a guessed retune): Philip's Ruins' 14
     structure_sets tripled in spacing/separation (16/8 → 48/24 chunks;
     `ancient_dungeon` and `desert_structures` alone had accounted for
     67.5% of rejections), `abandoned_urban:motel` bumped similarly
     (24/12 → 40/20). `findWastelandSpawn` no longer returns null and
     silently defers to the unprotected origin fallback — it now tracks
     the best real candidate seen during the ring search and returns
     that if nothing clears the full threshold, so the unchecked (0,0)
     path is now unreachable as long as any wasteland biome exists
     anywhere in the search radius. Verified live on the real seed:
     clean boot, no crash, real non-null result in ~1.2s.
     **Scope note**: per direct user instruction, this was shipped once
     it reached "stable boot + no literal overlap" rather than chasing
     0%-rejection / multi-seed verification — further spacing/threshold
     tuning is an open background task, not a blocker. **Also**: this
     fix only applies to brand-new worlds/players (the login handler is
     gated by a one-time `td_playtestKitGiven` flag) — it does NOT
     retroactively repair an already-broken base in an existing save.
  4. **Real 4th finding, not in the original 3**: the user's own
     follow-up ("not just horses, other mob types too") was right - the
     same baked-entity root cause existed in 24 MORE structure files
     across 2 more mods (big_lost_city's skyscrapers are full of
     atmospheric bats, the_lost_city has 3 farm pens plus a couple more
     houses). Same general scan + strip technique applied pack-wide
     across all 5 installed structure mods (Philip's Ruins checked
     clean). 25 files total, all verified byte-identical except entity
     lists, full batch boot-tested clean before shipping. See item #19
     in the "Real playtest feedback batch" checklist below - now done.
- **Seed-independent world-gen — done, shipped 2026-09-06.** Full
  writeup in FEATURES.md's "Seed-independent world-gen" entry (under
  "World type").
  1. New `data/kubejs/tags/worldgen/biome/wasteland.json` shipped as
     the real documented asset; the runtime search itself checks a
     parallel plain array since `Holder<Biome>#is(String)` turned out
     not to do real tag lookups in this KubeJS build (tested directly,
     not assumed).
  2. `findWastelandSpawn()` replaces the hardcoded coordinate - a real
     ring-search from world origin using `level.getBiome(...)`
     directly, not `/locate` text-parsing or the internal-Java-method
     route originally flagged as likely - `getBiome` alone was already
     fast (~0.3ms/call) and simple enough. Verified live on the exact
     seed this bug was just reported on: found real savanna 864 blocks
     from origin in 145ms, where the old hardcoded point was still
     plains.
  3. Terrain-flatness check (9-point sample across the footprint, level
     if variance > 1 block) - the logic itself is verified by reading
     and a live sandbox check confirmed no false-positive on flat
     ground, but hasn't actually been exercised against a genuinely
     uneven footprint yet.
  **Real deployment note, worth repeating to the user**: needs a full
  game restart (not just relaunching, and not just `/reload` -
  confirmed directly that worldgen tags don't hot-reload) AND a
  genuinely fresh world.
- **Suppress Supplementaries' "Amendments not installed" startup
  screen — done, shipped 2026-09-06.** New `pack/config/
  supplementaries-client.toml`, built from the real generated file
  already on the live instance rather than hand-typed, with
  `no_amendments_screen`/`no_optifine_warn_screen` both `true`. Live
  instance's own copy edited to match.
- **Suppress vanilla's "experimental settings" world-creation warning —
  done, shipped 2026-09-06.** Hide Experimental Warning + Collective
  installed via packwiz, both jars sha1-verified, real Forge 1.20.1/MC
  1.20.1 compatibility confirmed from the mod's own `mods.toml`. Full
  mod set (68 mods) boots clean.
- **Quest tone rework, round 2 — done, shipped 2026-09-06.** All 13
  real description edits applied. **Real catch made mid-build**: the
  repo's own `campaign.snbt` had silently drifted from the live
  instance's real file (a different reward id, and 2 completely
  different quest ids plus a missing dependency, most likely from an
  in-game FTB Quests editor interaction) - checked the live save's
  progress file first, confirmed no completed progress was keyed to the
  diverged ids, then applied the text edits to the real live file and
  synced that back to the repo, instead of deploying the repo's stale
  ids over live and silently orphaning them.
- **Reduce vegetation near spawn — done, shipped 2026-09-06.** Both
  pieces live-verified. Search now tries desert/badlands first (1200
  blocks) before falling back to savanna/savanna_plateau (2000) -
  confirmed correct on the real current seed (desert/badlands genuinely
  too far, fell through to savanna_plateau as expected). Vegetation
  list verified block-by-block live: caught and fixed a real bug before
  shipping (`minecraft:short_grass` isn't valid in this 1.20.1 build,
  it's still plain `minecraft:grass` here - the rename came in 1.20.3+)
  and confirmed the corrected list clears real placed vegetation to air
  while leaving solid ground untouched.
- **Legendary loot bag jackpot + beam visual — done, shipped
  2026-09-06, one detail needs an in-game log check to fully confirm.**
  Full spec in FEATURES.md's
  "Legendary loot bag jackpot + beam-of-light visual" entry (under
  "Loot bags").
  - **Jackpot roll: done, live-verified.** `loot_bag_drops.js` now
    layers a second, independent 2% `randomChance` roll for
    `bountybags:legendary_loot_bag` across every wave mob (all 4 tiers),
    on top of the existing per-tier gating, unchanged. Verified live:
    killed 100 plain trash-floor zombies (a mob that could never roll
    Legendary before this) in a sandbox — 5 legendary bags dropped,
    consistent with the 2% rate, real proof the jackpot mechanic works.
  - **Loot Beams: Refork — installed, boots clean.** Packwiz pulled
    3.4.7 (newer than the 3.2.10 originally verified — same real mod,
    same Forge 1.20.1/uploaded-fresh status, just current). Real
    dependency chain: Nirvana Library, Common Network, Fzzy Config,
    Kotlin for Forge (all downloaded + sha1-verified). Full mod set
    boots with 0 KubeJS errors.
  - **Color override + equipment-filter question — both done, shipped
    2026-09-06** now that the peer relayed the real generated
    `config/lootbeams/light_config.toml`. `enable_custom_color` flipped
    to `true`; the color itself is a real per-channel `r`/`g`/`b`
    sub-table (decompiled `ColorHolder`'s own serializer — a hex string
    would have been wrong). The equipment-filter concern is resolved,
    not just deferred: decompiled the actual render-gating chain and
    confirmed a working color override makes an item render
    unconditionally (`ModifyContext(true)` → `hasBeenModified()` → an
    unconditional `true` branch in `checkRenderable`), regardless of
    `only_equipment`/`whitelist_by_name`. Shipped as `pack/config/
    lootbeams/light_config.toml` + the live instance's own copy edited
    to match. **Real residual limit, worth a look at the client log
    next launch**: the exact TOML syntax for a populated color map is a
    good-faith reconstruction from the decompiled schema, not a
    verified round-trip — the one real example seen was the empty map.
- **Fresh-world playtest batch, 2026-09-05 — sent to build.** Real
  feedback from the first actual playtest of the new fresh-world
  pedestal redesign, 4 items:
  1. **Mobs aren't pathing toward the pedestal at all — real root cause
     found, fixed, and committed (1520565) 2026-09-05, see FEATURES.md/MODS.md
     for the full writeup.** Diagnosed for real, not guessed: the permanent marker DID
     exist correctly on the live save (confirmed by parsing the actual
     save's entity/player NBT directly — right tags, right coordinates,
     one real wave zombie found sitting 3.6 blocks from the player and
     13.9 blocks from the pedestal, matching the report). Root cause,
     found via direct Java reflection against a live sandbox: **Epic
     Siege Mod entirely replaces vanilla's own player-targeting AI** — a
     fresh zombie's real target selector held vanilla `HurtByTargetGoal`
     plus **six** stacked `ESM_EntityAINearestAttackableTarget`
     instances, no vanilla `NearestAttackableTargetGoal<Player>` even
     left. That out-competed `mob_aggro.js`'s 10-tick-throttled
     `setTarget()` force almost every time — explains "not at all," not
     "sometimes," since ESM is built to be *more* aggressive than
     vanilla, not less. Fix: `mob_aggro.js` now physically strips every
     goal from each wave mob's target selector (goal selector — actual
     attack/dig/pillar/block-target behavior — untouched) exactly once
     per mob, so `setTarget()` is the only thing left that can ever
     assign one. Verified end to end in a sandbox before shipping:
     stripped a fresh zombie's target selector, force-set its target to
     a stand-in entity, confirmed the target was unchanged 4 real seconds
     later, and confirmed the mob had genuinely pathed 9 blocks toward it
     in that time. **Real, honest caveat**: this pack's sandbox can't
     get a live player through this modset's FML handshake (established
     blind spot), so the exact `PlayerEvents.tick` wiring itself couldn't
     be exercised end-to-end — the underlying mechanism is fully
     verified, but this still needs a real playtest to close the loop.
     Possible bonus, not claimed as fixed here: this may also explain why
     the separate pedestal mob-vulnerability config read as
     inconclusive — worth watching for on the same playtest.
  2. **Village spacing — real root cause confirmed, fixed, and
     committed (490e090) 2026-09-05.** Extracted the live save's own real
     seed (`-705653274963918758`) directly from its `level.dat` and ran
     `/locate structure #minecraft:village` from the actual fixed spawn
     point (780, -150) in a sandbox running this pack's real worldgen
     config — confirmed a real savanna village only **92 blocks** from
     spawn on this exact seed, using vanilla's untouched default village
     spacing (`spacing=34, separation=8` chunks, this pack had never
     overridden it). That's well within where wave mobs spawn (40-60
     blocks from the objective) and inside where the worldborder reaches
     by wave 6 (95 blocks) — a real, quantified collision, not
     speculation. Fix: added `pack/kubejs/data/minecraft/worldgen/
     structure_set/villages.json`, doubling spacing to 64/16 (same 5
     vanilla village variants/weights/salt, only the placement numbers
     changed). Re-tested with the identical seed and spawn point after
     the change: nearest village jumped to **813 blocks** away. Full mod
     set still boots clean with the override in place. **Real, honest
     limit**: this is a statistical spacing change for *future* worlds —
     it can't retroactively move the already-generated village on the
     current live save (structures don't relocate once generated), and a
     single seed test doesn't prove every future seed will land equally
     far, just that this exact reported scenario is now resolved and the
     odds are substantially better going forward.
  3. **Circular altar dais — built, verified, and committed
     2026-09-05.** Full rebuild in `playtest_starter_kit.js`, real
     shape-language change per the reference: square sandstone platform
     → 3 concentric octagon rings (radius 3/2/1, each one block higher
     moving inward — a small octagon at each radius, a square ring with
     its 4 true diagonal corners cut, the standard `/fill`/`/setblock`
     approximation for "round" since this pack can't build a true
     circle) leading to a flat raised platform, a plinth/column rising
     from its center, and the pedestal on top of that. Material is a
     randomized blackstone/polished blackstone/deepslate tiles/cracked
     deepslate tiles mix (same "mostly uniform, occasional weathered
     accent" ratio the perimeter walls already use), a moss-carpet ring
     one radius wider than the dais blends it into the courtyard floor,
     and two single stair blocks soften the main south-facing approach
     without stairing the whole circumference. **Every campfire
     removed outright**, not reduced — direct request, the old braziers
     were named specifically as part of what read badly. Grave arc
     relocated to the dais's west flank (its old front/back position is
     now inside the bigger radius-3 footprint) — checked against the
     real x0 wall coordinate before picking the new spot, real margin on
     both sides, not eyeballed. Pedestal height grew from wallY0+2 to
     wallY0+4 with the new plinth; `td_pedestalX/Y/Z` and the targeting
     marker's own Y both updated together, everything else that reads
     those values (mob_aggro.js, wave_spawner.js, pedestal_destruction.js,
     amulet_pedestal.js) treats them as an opaque stored coordinate, so
     nothing else needed touching. **Verified for real, not assumed
     from the math alone**: this pack's sandbox can't get a real player
     through the login flow (established FML-handshake blind spot), so
     replayed the exact same build logic via `ServerEvents.tick` against
     the live save's own real seed and real spawn coordinates instead —
     first pass returned all-air/failed everywhere (a real, separate
     gotcha: the target chunk had never been visited in that fresh test
     world, and `/setblock` at a cold, never-loaded chunk can silently
     no-op even though the production flow never hits this, since the
     player is already physically standing there when the real script
     runs); re-ran with an explicit `forceload` and real settling time
     first, and every block landed exactly as intended — pedestal,
     ring material, moss edge, and the approach stair all confirmed via
     direct block readback, zero errors, clean boot. **Real, honest
     limit**: like every other spawn-time build in this pack, this only
     applies to a **fresh world** — the current live save's actual
     placed dais is unchanged and needs a new world to see this.
  4. **"Just sand" — real root cause found and fixed 2026-09-05, the
     biggest single finding of this batch.** Not a perception issue, not
     thin variety, and not a badlands-style spawn-point problem — the
     ground was **literally sand almost everywhere in the entire world,
     regardless of biome**, a genuine leftover bug. Confirmed by
     correlating real biome tags against real surface blocks at 441
     sample points in a sandbox (this pack's actual worldgen config,
     the live save's real seed): every single savanna/plains sample
     resolved to `minecraft:sand`. Root cause, found by reading the
     dimension override directly: `data/minecraft/dimension/
     overworld.json`'s `generator.settings` still pointed at
     `kubejs:flat_desert` — a noise-settings file literally named for
     the old, already-abandoned "Single Biome: Desert" experiment
     (see the 2026-08-20 world-type history above), whose
     `surface_rule` unconditionally places sand/sandstone everywhere
     with no biome condition at all. The `biome_source` half of that
     same dimension file *was* correctly rebuilt into the real curated
     7-biome `multi_noise` set (2026-08-31's world-gen structure
     variety pass) — but biome assignment and surface material are
     two fully independent systems in a `minecraft:noise` generator,
     and only one of them got updated. Fix: spliced the real,
     authoritative vanilla `surface_rule` and `default_block`
     (extracted directly from this exact game version's own client
     jar) into a new `kubejs:overworld_flat` noise-settings file,
     keeping this pack's own deliberately-flat `noise`/`noise_router`
     section untouched — replaces `flat_desert.json` entirely (deleted,
     including its misleading name) and the dimension override's
     `settings` reference now points at the new file. **Verified for
     real, not assumed correct just because it's "the real vanilla
     data"**: re-ran the same 441-point biome/surface correlation after
     the fix — zero sand outside real structure footprints, savanna and
     plains both resolved to `grass_block`/`dirt`/`coarse_dirt` as
     expected, full mod set still boots clean on the live save's exact
     seed. **Real, honest limit — the one that matters most for the
     current live save**: worldgen changes only affect chunks generated
     from here on. The area around spawn the player has already explored
     was generated under the old broken settings and will still show
     sand until enough of the world border expands past what's already
     generated, or a fresh world is started — this is not retroactive,
     same limit as every other worldgen change this pack has shipped.
- **Aesthetic structure variety pass — done, shipped 2026-09-04
  (real commit-timestamp check — not the 2026-09-06 dispatch dating
  below).** Originally sent 2026-09-05 with real user go-ahead, fell
  through a peer-session gap, re-sent 2026-09-06 and this time actually
  built. Installed **Philip's Ruins** and **Big Lost City — Apocalyptic
  Structures!**, both dependency-free. Real scope surprise: 55 total new
  structure_sets between the two mods (not anticipated by the original
  spec) — handled with an individually-reasoned pass, not a blanket
  retune: 14 Philip's Ruins sets retuned to 16/8-chunk spacing, 6 left
  untouched for zero real biome overlap; Big Lost City's heavily
  duplicated car_N/deco_N/tent_N variant clusters (27 structures)
  consolidated into 3 weighted pools rather than shipped as 27 separate
  active sets, given this pack's own documented jigsaw crash history.
  **Real bug caught by the sandbox boot-test**: the first pass made
  redundant variants "inert" via `spacing = 999999` — crashed registry
  load (`outside of range [0:4096]`, vanilla's real codec cap). Fixed to
  `4096`, re-verified clean. Full-restart sandbox boot confirmed clean
  (`Done (29.325s)!`, zero errors tied to either mod), `/locate
  structure` confirmed real generation for a pool, a retuned individual
  set, and a Ruins set. Both mods use standard vanilla-format loot
  tables, not an opaque system — LootJS-controllable. Full detail in
  FEATURES.md, "Aesthetic structure variety pass" (under "World type").
  **Real limit**: fresh-world only, doesn't retroactively affect the
  current live save's already-generated chunks. Unconfirmed in-game (no
  real playtest yet, sandbox-verified only).
- **Abandoned Urban missing chest loot — investigated 2026-09-04, no
  fix needed, the old diagnosis was stale.** Re-decompiled all 34
  `.nbt` files directly against the exact currently-installed jar
  (`abandoned_urban-1.1.0-forge-1.20.1.jar`, file-id 5297465 — checked
  the live `pack/mods/abandoned-urban.pw.toml` to confirm it's the same
  build, not a version drift). Real, current result contradicts the
  2026-08-31 diagnosis this was queued from: **15 of the mod's real
  building pieces already carry a genuine `LootTable` NBT tag on a real
  chest**, referencing valid vanilla tables (`minecraft:chests/
  woodland_mansion`, `minecraft:chests/village/village_weaponsmith`,
  `minecraft:chests/stronghold_corridor`, `minecraft:chests/
  abandoned_mineshaft`, etc. — extracted and read directly, not
  inferred from filenames). Cross-checked against the mod's own
  `template_pool` JSON to confirm every one of those 15 pieces is
  actually placed by real worldgen, not dead weight. The only
  chestless files are genuinely decorative filler that wouldn't
  sensibly hold loot (roads, rubble, wrecked vehicles, a couple minor
  set-pieces) plus one dead, unreferenced file
  (`gas_station.nbt` — the mod's own `gas_station` structure pool
  actually points at the already-looted `gas_station_loot.nbt`
  instead, confirmed by reading the pool JSON, so the chestless
  variant is simply never placed). **No processors, no jigsaw surgery
  built** — this pack has a documented crash history from exactly that
  kind of change, and there's no real problem left to justify the risk.
  Either the mod updated with more complete loot since the original
  diagnosis, or that diagnosis checked for something narrower (e.g.
  chest-block presence without decompressing far enough to see the
  `LootTable` tag) — either way, the current jar doesn't need this fix.
  **Structure spawners were held back pending this and the aesthetic
  pass being confirmed stable** — the aesthetic pass shipped clean
  (see above) and this item is now resolved, so that sequencing gate is
  clear; spawners can be considered next if wanted.
- **Savanna spawn + vegetation-clearing regression — done, real bug
  found and fixed 2026-09-06.** Diagnosed live on the actual reported
  world first, not guessed: the savanna_plateau landing was correct
  (desert/badlands genuinely 3600+ blocks away on that seed, fallback
  worked as designed). Real bug: the vegetation-clearing pass's Y-range
  only started at `floorY+1` - on genuinely uneven plateau terrain,
  real trees can be rooted well below `floorY` (confirmed: trunks as
  low as Y5-8 against a `floorY` of 11), entirely missing the old
  range. Extended to `floorY-16` through `floorY+16` (chunked to stay
  under vanilla's `/fill` block limit). Verified live on the exact
  reported coordinates: both previously-uncleared trees now clear
  correctly, real ground stayed untouched.
- **Eliminate passive mobs entirely — done, shipped 2026-09-06.** New
  `no_passive_mobs.js`. Went with an explicit 30-id passive-animal list
  rather than a `MobCategory` filter (this build's `EntityType`
  registrations are fully SRG-obfuscated with no clean id→category
  mapping to decompile, so sidestepped the question instead of forcing
  it - villagers/golems/wandering traders are simply never in the
  list). **Real finding from live verification**: the theoretically
  better hook (`EntityEvents.checkSpawn`, pre-spawn cancel) doesn't
  actually fire for vanilla's natural chunk-population spawn pathway in
  this build - confirmed with a diagnostic logger against real fresh
  chunk generation, zero log lines despite real cows/sheep spawning
  every time. Switched to `EntityEvents.spawned` + `entity.discard()`,
  confirmed both firing and actually removing entities. Final check
  across 8 mob types in a freshly generated area: zero present.

## Built, awaiting your next playtest

- **Second fresh-world playtest batch + loot-table dead-weight audit**
  — built, verified, and deployed 2026-09-06 (commits 46a884b, e0b4939,
  7e468b7). Full detail in FEATURES.md's "Second fresh-world playtest
  batch" and "Loot-table dead-weight audit" entries (under "Pedestal
  visual upgrade + mob-attack vulnerability" and "Loot bags"). Five
  pieces, all shipped:
  1. Dais ditched entirely — pedestal now sits directly at ground level
     in the yard, no platform.
  2. Real pedestal HP (`td_pedestalHealth`, 200 first-pass) with a
     throttled tick check for wave mobs in melee range, damage-per-hit
     read from each attacker's own real attack stat, same destroy path
     as the existing explosion-based system at 0 HP — a deterministic
     replacement for relying on Epic Siege Mod's inconclusive
     block-targeting.
  3. Spawn relocated the full 520 blocks to `(1171,-499)`, a real
     savanna tile (re-verified on the live save's actual seed right
     before shipping — a real patch, not a boundary sliver; terrain
     flat within ~2.5 blocks across the planned base footprint) — user's
     own pick via AskUserQuestion over 3 smaller-disruption alternatives.
  4. Press/Depot spacing fixed exactly per the user's own direct
     instruction (Press 2 blocks above the Depot) — live-verified
     (a real iron ingot → iron sheet conversion happened) before
     committing, and this closed the separate long-open "Press never
     auto-fires" bug too, same root cause.
  5. Loot dead-weight strip (`loot_dead_weight_strip.js`) — rails,
     name tags, horse gear, vanilla maps, leads, music discs, elytra/
     End-city loot all removed from every chest, custom or vanilla.
     Real `removeLoot(ItemFilter)` syntax confirmed by decompiling the
     installed LootJS jar rather than assumed; live-verified against a
     real vanilla `abandoned_mineshaft` roll (10x, zero stripped ids
     came through, this pack's own bonus pools unaffected).
  **Fresh-world pieces (1-3) are unconfirmed in-game** — same standing
  blind spot as every other spawn-time build in this pack, no real
  player can join the build session's sandbox. Piece 4 is confirmed
  live. Piece 5 applies immediately to the current save too, not just
  fresh worlds.
- **Full zombie-apocalypse roster pivot** — built, verified, and
  deployed 2026-09-06. Full detail in FEATURES.md's "Full
  zombie-apocalypse roster pivot" entry (under "Mob roster &
  defense-breaching threats"), including a "Built, verified, and
  deployed" postscript with the full verification writeup. Short
  version: every skeleton/spider/wither_skeleton/ravager/creeper
  reference stripped from `wave_spawner.js`, `loot_bag_drops.js`,
  `undeadnights_horde_mobs_config.json`, plus 2 files the original audit
  missed but this pack's own duplication pattern required
  (`mob_aggro.js`'s and `wave_status.js`'s own copies of the roster) and
  Epic Siege Mod's `targetingMobs`. Replaced with vanilla zombie-family,
  TFTH's much bigger unused roster, Undead Nights' own 3 zombie
  variants, and a newly-installed mod (**Mutants and Zombies** + its
  **Advanced Wall Climber API** dependency). **Real correction found
  during verification, not shipped on the pattern-inferred guess**: the
  original proposal's "Flesh Unseen" turned out to have no registered
  `EntityType` at all in this exact TFTH build (config and sounds exist,
  nothing summonable) - dropped everywhere it was proposed, Mutants and
  Zombies' Mutant Brute took its wave-8 slot instead. **Real filename
  scare on the Advanced Wall Climber API dependency, resolved before
  shipping**: packwiz resolved a jar named
  `awcapi-neoforge-1.20.1-1.0.2.jar` on a Forge pack - checked its real
  `mods.toml` directly rather than trusting the name, confirmed a
  genuine Forge dependency declaration, and its Crawler entity
  (the mob that actually needs it) was successfully real-summoned in
  the verification pass. **All 23 new/changed mob ids across all 3 mod
  sources were individually real-summoned and confirmed in a sandbox**,
  not spot-checked - full mod set boots clean, 0 KubeJS errors. Not yet
  confirmed by an actual playtest.
- **Mob-attack vulnerability (pedestal)** — config built, deployed, and
  committed (f49f947) 2026-09-05, and **real live behavior is
  unconfirmed, not a clean win — flag this honestly, don't report it as
  done.** Full detail in FEATURES.md's "Pedestal visual upgrade +
  mob-attack vulnerability" entry. What shipped: both real pedestal
  block ids added to Epic Siege Mod's `blockTargets`, and
  `targetingMobs` widened from just zombie to this pack's full wave
  roster (a deliberate call — a base-under-siege premise should let the
  whole roster threaten it). Decompiled the mod's own AI goal to
  resolve the spec's open question: `blockTargeting`'s destroy behavior
  is gated by the real vanilla `mobGriefing` gamerule (confirmed `true`
  here), not ESM's own `griefing` toggle — two separate systems. Also
  found a real, non-obvious requirement: the target needs 2 full air
  blocks directly above it. **But the live test was inconclusive**: a
  zombie left adjacent to a pedestal for 60+ seconds in a sealed test
  pen never destroyed it — and neither did one left next to a plain
  vanilla candle, the mod's own untouched default target, which rules
  out this specific config as the cause and points at the whole
  destroy-mechanism possibly not firing in this environment at all.
  Shipped as correct per the real decompiled logic (harmless either
  way) but **not confirmed working — needs a real player checking
  whether mobs actually chip away at anything in `blockTargets` during
  normal play.** `diggerMobs` (whether wave mobs already partially bite
  through obstacles via a separate mechanism) is still fully open too,
  not reached.
  - **Superseded, 2026-09-05**: this whole mechanism is confirmed dead
    weight now. `pedestal_health.js`'s own header comment already
    documents that the real playtest showed this `blockTargets` path
    still wasn't damaging the pedestal even after the mob-pathing fix —
    real pedestal HP damage is that file's own separate proximity-poll
    system, unrelated to ESM entirely. Removed both pedestal block ids
    from `blockTargets` (back to the mod's stock `["#minecraft:candles"]`
    default) and corrected the misleading "must keep running for the
    pedestal-vulnerability feature" comment in `mob_aggro.js` that had
    justified leaving `ESM_EntityTargetBlock` unstripped. Same pass also
    closed the real `diggerMobs` gap flagged above, extending it (and
    `buildingMobs`/`jumpingMobs`, same gap) from just `minecraft:zombie`
    to the full 15-mob current wave roster, matching `targetingMobs`.
    Verified via a clean sandbox boot; deployed to the live instance;
    committed.
- **Pedestal: unconditional targeting + visual retrofit + compound
  redesign** — built, deployed, and committed (a9e6c1a) 2026-09-05.
  Full detail in FEATURES.md's "Superseded 2026-09-05" entry. All three
  pieces landed together (they shared the same coordinate rewiring),
  and this commit's final state also absorbed the earlier rig-placement
  hotfix — that fix's indoor location got fully superseded by this
  rework moving the rig outdoors again, so it never got a separate
  commit of its own, it's just part of this one now:
  - **Unconditional objective**: mobs always target the pedestal, no
    amulet check, no player fallback. The amulet is now purely personal
    buffs + border-crossing unlock.
  - **Supplementaries retrofit**: `amulet_pedestal.js` is now a
    tick-poll against the real Container, not a right-click hook.
  - **Recentered dais + outdoor workshop**: pedestal moved to a raised
    3×3 platform dead center of the courtyard (courtyard depth grew
    4→8 to fit it), grave markers arranged in an arc, 4 campfire
    braziers, Create rig relocated outdoors along the east wall.
  - **Real risk caught before shipping**: deleting the old pedestal
    block's registration would have destroyed the live save's actual
    placed pedestal (wave 4+ deep) on next load — Forge drops
    unregistered custom blocks to air. Fixed by keeping the old block
    registered as a real fallback, making both destruction-detection
    and the amulet-poll accept either block id, and restoring a scoped
    legacy right-click handler for the old block only.
  - **Self-healing marker**: `mob_aggro.js` now re-summons the
    permanent target marker (and forceload) on any login where the
    pedestal exists but the marker doesn't — fixes the live save
    automatically, no manual commands needed this time.
  - **Verified in 4 sandbox passes**, the last two against a real copy
    of the actual live save.
  - **Real scope limit, flagged rather than decided unilaterally**: the
    courtyard visual redesign only applies to **new** worlds — the
    build session didn't retrofit the existing live save's actual
    layout. **Resolved**: user's call was to start a fresh world for
    the full redesign rather than keep the old save or retrofit it.
  - The mob-attack-vulnerability piece (Epic Siege Mod's `blockTargets`
    config) shipped separately — see its own entry above, not part of
    this commit.

- **Quest book rebuild** — built, deployed, and committed (76f35f7)
  2026-09-05. Full detail in FEATURES.md's "Quest book
  rebuild" entry. Single consolidated chapter (`campaign.snbt`,
  replacing `basics.snbt`/`tier1_machines.snbt`/`tier2_machines.snbt`),
  19 quests total: all 17 existing quests carried over with their real,
  unchanged IDs (including ones with live completed progress, like
  "Sharpened Scrap"), plus the spine's 2 new story-beat quests. Real
  decisions the build session made where the spec left it open:
  dependencies unchanged exactly (the tree shape comes from x/y layout
  only — spine at y=0, Tier 1/amulet/Waystones branch at x=13, Tier
  2/pedestal branch at x=19, reconverging visually at "Watch the Walls
  Grow" and "The Reckoning" — no new dependency edges, no intermediate
  hub quest needed); reused the old Basics chapter's real id
  (`1178FD42CF9984A2`) for the merged chapter rather than minting a new
  one, since it's the one thing the live save's progress file actually
  references (a first-viewed timestamp) — confirmed the other two old
  chapter ids have zero references, safe to discard; "Turn the Crank"
  got a real rewrite (its shipped text was practical but didn't end on
  an open question, so it didn't match the new house style — replaced
  while keeping the real furnace/recipe detail); "A Stone That
  Remembers" (Waystones) wasn't in the finalized text list, so it kept
  its existing flavor text, just given a spot in the new layout.
  **Verified in three passes**: a fresh sandbox boot (clean, 19 quests,
  no errors), the same after deleting the 3 old files exactly as it
  would happen live, and a boot against a real copy of the actual live
  save (with its real progress data) confirming nothing about the merge
  broke existing completions. Live `ftbquests` config backed up before
  deploying. `packwiz refresh` run, all hashes clean.
- **Andesite gated behind exploration + "Turn the Crank" quest** —
  built, deployed, and committed (30588f6) 2026-09-05. Full
  detail in FEATURES.md, "Andesite gated behind exploration, not loot
  bags" (under "Loot bags"). Real recipe correction found along the
  way: Hand Crank is actually 3 planks + 1 Andesite Alloy, no Shaft
  involved (this doc's earlier text was wrong). Andesite added to all 3
  `postapocalypse_structures` base chest tables, verified live via 45
  real sandbox rolls (3 real andesite hits), deliberately not in any
  BountyBags tier. New quest "Turn the Crank" shipped in the Tier 1
  chapter, flavor text already referencing the corrected Rolling Mill
  location. This is the same quest the in-progress quest book rebuild
  should carry forward, not duplicate.
- **Barbed Wire replaces Spikes** — built, deployed, and committed
  (8e1ed02, plus a9e6c1a for the rig's final outdoor position — see the
  Pedestal entry above). Full detail in FEATURES.md's
  "Tier 1 defenses" section. What shipped:
  - **Create: Crafts & Additions installed** (author MRHminer, real
    slug `createaddition`), jar hash-verified into the live instance.
  - `trapcraft:spikes` replaced everywhere: the "Sharpened Scrap" quest
    task + both quest/chapter icons, and the decorative gate-line
    placement (`createaddition:barbed_wire[vertical=false,facing=south]`,
    confirmed real blockstate properties from the mod's own JSON).
  - **Real crafting chain, decompiled and live-verified end to end**:
    iron_ingot → Mechanical Press (over a Depot, not on top — the
    mod's own ponder text says items go beneath) → iron_sheet → Rolling
    Mill (items dropped on top) → iron_wire ×2 → crafting table
    (diamond of 4 iron wires) → barbed_wire ×2.
  - **Pre-placed rig, corrected 2026-09-05 after a real placement bug**:
    the original spot-check (local x=4-6,z=9) only verified "air, floor
    below, ceiling above" — never *what kind* of space that was. It
    turned out to be the open, unwalled entrance yard right outside the
    building's real door, not a back room, which is exactly why the
    live playtest found the rig blocking the doorway. Root-caused by
    parsing `abandoned_brick_house.nbt` block-by-block directly (not
    another spot-check), and re-verified by reproducing the bug fresh
    against real terrain with the actual deployed script's exact math —
    the already-played live save (4 real waves of playtime by then)
    wasn't trusted for reproduction, since the player could have mined/
    moved the block themselves before reporting it. **Corrected spot:
    local x=7, z=5-7**, a real enclosed room confirmed from the NBT
    itself (solid andesite foundation, 3 clear blocks of headroom, a
    real brick_slab ceiling, walls/doors/furniture boxing it in on
    every other side) — right beside the structure's own pre-placed
    furnace. Press and Mill face the same direction and conduct power
    directly to each other, no shaft needed — confirmed live with a
    temporary creative motor (real nonzero Speed on both in a single
    3-block kinetic network) at the new spot. The cell past the Mill is
    left open for the player's own Hand Crank — that one genuinely
    can't be pre-placed already-turning, it needs a real player
    right-clicking it. Real Create gotcha documented along the way,
    worth remembering for future kinetic-block placement scripts:
    overwriting a kinetic block's facing via repeated `/setblock`
    doesn't reliably rebuild Create's kinetic network — didn't affect
    this fix (each cell places into real air exactly once), but matters
    for any future hand-tuning of a live rig.
  - **Fixed script deployed to the repo and the live instance's kubejs
    folder, syntax-checked, but not committed yet** — same "hold for
    review" pattern as the original work, given how much this
    diagnosis undercut the original verification. **This only fixes
    fresh worlds** — the current live save already has the 3 wrongly-
    placed blocks built in from the old script (that part only runs
    once per world at first login), and fixing an already-placed block
    in a real save needs either a live command run by the player
    themselves or booting a server directly against that save file —
    the build session's own permission settings blocked the latter, so
    real coordinates for a manual fix were handed back instead (see
    QUEUE.md's own note to the user / chat for the exact commands).
  - **Real save-compatibility risk caught before deploying**: the live
    instance's quest save already had "Sharpened Scrap" completed under
    its own task/chapter IDs, which had diverged from the repo's copy
    of that snbt at some earlier point. Blindly overwriting live with
    repo would have orphaned that real completed progress. Fixed by
    editing the live file's item/icon/description in place (keeping its
    real IDs), then syncing the repo copy back from that live file so
    both now match exactly and the completed quest stays completed.
  - **One real, honestly-unresolved item**: the Mechanical Press never
    auto-fired in the scripted sandbox test — kinetic power and Depot
    item-holding both confirmed correct, but Running/Ticks never
    advanced even after 20+ seconds. Not chased further since it wasn't
    the actual ask (the Rolling Mill, the one being pre-placed, is
    fully verified working) — but this needs a real player to confirm
    the Press actually processes when used themselves; if it doesn't,
    that's a separate bug to open.
  `packwiz refresh` run, hashes clean. **Held for review, not committed
  yet** — waiting on you/the user before the peer commits.

- **Toast Control + Pedestal destruction = game over** — built,
  verified, and deployed 2026-09-04 (commits 3432c6b, ce75d1f).
  - **Toast Control shipped** — real dependency the spec missed:
    **Placebo** (Shadows_of_Fire's own library mod), not already in
    this pack — caught by packwiz's own CurseForge dependency
    resolution rather than missed silently, installed alongside.
    Defaults confirmed by decompiling `ToastConfig.class` directly
    rather than trusting the mod's own description: Recipe and
    Tutorial toasts both default `blocked=true` already, zero config
    needed.
  - **Pedestal destruction = game over shipped exactly per spec** —
    tick-poll against a stored coordinate (not event hooks), permanent
    Wave Horn block, countdown cancel, night-lock undo, dramatic title
    matching the pack's existing tone. The open blast-resistance
    question got a real, tested answer, not a guess: grepped the whole
    pack — `mobGriefing` is never touched anywhere, so it's still
    vanilla default (`true`); the pedestal's own block definition sets
    resistance 6.0 (the same as plain stone, not hardened). Then
    actually blew one up in the sandbox — real TNT destroyed a placed
    pedestal outright, confirmed via a live block-id readback. **No
    config change needed — it's genuinely vulnerable as-is.**
  Both **not yet confirmed by an actual playtest**.

- **Loot bag iron/cobblestone bump + amulet/pedestal objective fix** —
  built, verified, and deployed 2026-09-04 (commits b244ef0, 5293a3f).
  - **Iron/cobblestone bump shipped exactly as specced** — real bonus
    lesson: BountyBags generates a `config/bountybags/*.toml` from the
    source JSON once and never re-reads it, so the live instance's
    already-generated `uncommon_bag.toml` needed a direct edit too, same
    gotcha the legendary-tier totem fix hit earlier.
  - **Amulet/pedestal objective fix shipped exactly as proposed** — spawn
    position and both mob-count checks now key off the pedestal
    marker's stored position when `td_amuletOnPedestal` is true. The
    open question got a real answer, not a guess: this pack had never
    forceloaded anything before, and that was confirmed as a genuine
    second bug — `simulationDistance` is 12 chunks (192 blocks) centered
    on the player (from `options.txt`), so mobs spawned correctly at the
    pedestal would've just frozen the moment the player wandered off.
    Fixed with real `forceload add`/`remove` in `amulet_pedestal.js`
    exactly where `td_amuletOnPedestal` toggles, sized to a 96-block
    radius (169 chunks, checked directly against vanilla's 256-chunk
    forceload cap rather than assumed safe). `PersistenceRequired:1b`
    added to every wave-mob summon regardless, since a despawn-eligible
    mob far from any player would've quietly undone the whole fix.
    **Verified against the exact reported scenario**: a sandbox test
    with the objective 500 blocks from a stand-in "far away player" —
    8/8 mobs landed near the objective, zero near the fake player, and
    all 8 were still alive and in place after a real 10-second wait
    simulating the player staying away.
  Both **not yet confirmed by an actual playtest**.

- **Mob-tier loot progression + watchtower removal** — built, verified,
  and deployed 2026-09-03 (commits 2faf4ef, f289af7). See FEATURES.md's
  "Mob-tier loot progression" and "Watchtower — removal requested"
  entries for full detail.
  - **Loot bags reclassified exactly as specced**
    (`loot_bag_drops.js`): Uncommon = trash floor (wither_skeleton
    corrected into this tier), Rare = early roster-variety adds,
    Epic = wave 6-7 elites, Legendary = the 3 finale mobs. Same drop
    rates, only the mob→tier assignment changed.
  - **Structure chest progression shipped with a different real
    mechanism than the spec assumed** (`structure_loot_progression.js`)
    — table-ID targeting, as originally proposed, wouldn't actually
    have worked: decompiling confirmed Lost City ships **zero** chest
    loot tables of its own across all 205 of its structure NBTs
    (nothing to target), and Abandoned Urban's chests overwhelmingly
    reuse plain vanilla tables (village/dungeon/stronghold/shipwreck)
    shared with real vanilla structures elsewhere in the world —
    targeting those IDs would have buffed ordinary vanilla loot too,
    not just this pack's structures. Switched to targeting LootJS's
    `LootContextType.CHEST` instead, which sidesteps both problems and
    still covers postapocalypse_structures. Same proposed distance
    bands (60/120) and same additive bonus-pool technique as before.
    Verified via two independent `/loot spawn` rolls confirming
    distance-gated bonus items (diamond/emerald; separately gold_block/
    ender_pearl) landing on top of base loot.
  - **Real sandbox-testing gotcha found and worked around, worth
    remembering for future loot testing**: `/loot spawn` at a position
    whose chunk was force-loaded the same tick silently produces
    nothing at all (even the base vanilla table) — chunk generation
    isn't synchronous within `forceload`'s own tick. Looked exactly
    like a broken mechanism until isolated by re-testing after a real
    60-tick settle.
  - **Watchtower removed** — clean deletion exactly as pre-verified,
    nothing else in the pack touched it.
  All three **not yet confirmed by an actual playtest**.

- **Wave mechanism: mobs not reaching the player — real root cause
  found and fixed, 2026-09-02.** Investigated directly against the live
  instance's `logs/latest.log` and player stats file first (zero mob
  kills across waves 1-4 despite correct wave announcements and a
  reuse-gate that looked consistent), which narrowed it to "the live
  nearby-mob count reads zero all session" but couldn't distinguish
  *why* without a real spawn-and-check test. That test found it:
  **`Math.PI` (and `Math.E`) are undefined in this exact KubeJS/Rhino
  build** — confirmed on a genuinely clean sandbox boot, at plain
  top-level script scope, no event callback involved. `Math`'s methods
  (`cos`/`sin`/`random`) all work fine; the constants specifically
  don't. `wave_spawner.js`'s `randomPlayerRelativePosition()` computed
  every mob's spawn angle from `Math.random() * 2 * Math.PI` — always
  `NaN`, so every spawn position was `NaN,NaN`, so every `/summon` has
  been silently failing since that function was written (`
  runCommandSilent` suppresses command feedback, which is exactly why
  this never showed up in any log). The staggered `pendingSpawns` queue
  kept draining on its own schedule regardless of whether each entry's
  summon actually succeeded, which is why the Wave Horn's reuse gate
  looked like it was working correctly for a few seconds after every
  use in every earlier investigation this pack has done — that was
  real queue state, not real mobs. This was the real, dominant cause
  underneath the entire "wave mobs sometimes/often don't spawn" history
  — every other bug found chasing this symptom (the `hasTag()`
  regression, Undead Nights' own autonomous horde system, chunk-gen-
  storm timing at fresh-world login) was independently real and worth
  its own fix, but this is the one that was always still there
  underneath all of them.

  Also found and fixed the identical bug in `amulet_pedestal.js`'s bob
  effect (`Math.sin((2 * Math.PI * currentTick) / BOB_PERIOD_TICKS)`) —
  the marker's up/down float has been computing `NaN` this whole time,
  most likely a silent no-op rather than a visible error, which is why
  it read as "doesn't move" rather than "broken." Grepped the whole
  `pack/kubejs` tree for every other `Math.PI`/`Math.E` reference after
  fixing both — none remain. Fixed by hardcoding the literal PI value
  in both files instead of reading the (broken) built-in property.

  Verified for real, not just by inspection: replicated the exact fixed
  computation in a live sandbox test — 16/16 sample spawn positions
  produced real (non-`NaN`) coordinates, and all 16 resulting mobs
  persisted and landed within the 80-block radius the wave-clear gate
  and hostile counter both check, with only modest real-terrain height
  variance (-4 to +6.5 blocks). That result rules out the original
  leading hypothesis (height-correction landing a mob far enough away
  vertically to fall outside the 80-block 3D check near a tall or
  underground structure) as the explanation for *this* report — the
  terrain near the fixed spawn point isn't that hilly — though it
  remains a real, separate, still-open risk worth a defensive sanity
  clamp on the height delta if it ever gets reported for real terrain
  elsewhere; not added speculatively since the confirmed bug alone
  fully explains this report. Committed b7c66a4, deployed live. Needs a
  real wave playtest to confirm.

- **Structure & loot mod replacement** — built, verified, and deployed
  2026-09-02 (commit fdfa521). Treasure2 + GottschCore removed (mods,
  structure_set overrides, dead index entries), BountyBags + Lootr
  installed, custom loot bag system fully migrated (4-tier mob mapping
  by wave, drop rates 0.5/0.25/0.1/0.04). See FEATURES.md's "Structure
  & loot mod replacement" entry for full detail. Sandbox-verified
  clean; **not yet confirmed by an actual player session**. Two things
  worth knowing before/while playtesting:
  - **Lootr's staleness claim was wrong, corrected before install** —
    it's actually a live, maintained Forge 1.20.1 mod (builds through
    2025-11-26), not the 2023-abandoned one originally flagged.
  - **Lootr per-player chest behavior confirmed real, 2026-09-05** —
    Forge's dedicated-server scanner flags it client-only despite real
    server-side code in the jar; decompiled `ChestData.class` directly
    to check rather than assume. Confirmed genuinely per-player:
    `ChestData` (one real chest) holds `Map<UUID, SpecialChestInventory>`,
    and `createInventory(ServerPlayer, ...)` generates an independent
    loot roll (`filler.unpackLootTable(...)`) the first time each
    distinct player UUID opens it, cached in that map thereafter via
    `getInventory(ServerPlayer)`/`getInventory(UUID)`. This is real
    server-authoritative `SavedData`, not a client-only visual trick —
    the scanner's flag was a false concern. No code change needed; no
    further live test warranted beyond this source-level confirmation.
  - A real BountyBags bug (totem_of_undying over its internal max
    count, would've silently fallen back to an emergency loot pool) was
    caught and fixed before shipping, not after.
  Piece 3 of the exploration-pacing retune (loot-tier-by-progression)
  is now unblocked — buildable as a general LootJS distance/wave-based
  system across the 3 remaining structure mods. Not started, ready to
  sequence whenever you want it sent.
- **Undead Nights native horde system disabled** — built and deployed
  2026-09-02 (commit f928902), direct response to "wave system simply
  broken now." Real bug, unrelated to the same day's other retunes: the
  mod's own autonomous "Nights of the Undead" system was never actually
  turned off, so a second, uncontrolled horde (invisible to the wave
  counter) had been spawning every night on top of every deterministic
  wave this whole time. See FEATURES.md's "Endless phase scaling"
  section for the full root-cause writeup. Verified safe via decompiling
  the mod's own config/horde-spawner classes before disabling — the
  endless-phase `spawn_horde` command path is unaffected. Not yet
  confirmed by an actual playtest.
- **Exploration pacing retune (worldborder + structure spacing)** —
  built, verified, and deployed 2026-09-02 (commit 6d8c50e). Direct
  playtest feedback: structure generation too dense, worldborder
  expanding too fast. See FEATURES.md's "Base expansion" (worldborder
  curve, retune 2) and "Structure mod picks" ("Exploration pacing
  retune" entry, structure spacing) for full detail. Worldborder now
  `5 + 5*floor((waveNumber-1)/3)`, ending at border 125 by wave 8 (was
  166, was 270 originally) with a genuinely flat wave 1-3 (+15 total).
  Structure spacing loosened back on Treasure2's wishing-well set and
  the non-Lost-City reachability mods, verified via a fresh sandbox
  world with zero crashes/collisions. **Loot-tier-by-progression (the
  3rd piece of this retune) is on hold, not built** — Treasure2's
  rarity system turned out to need genuinely new LootJS logic, not a
  data retune, and building it now risks being thrown away given the
  fresh Treasure2-replacement question below. **Needs a fresh playtest
  to confirm feel** — not yet seen by an actual player.
- **Starting base redesign (Abandoned Brick House via `/place
  template`)** — built, verified, and deployed 2026-09-01, direct
  response to "the starter base and tower design is terrible." See
  FEATURES.md's "Starting base" section, "Redesign" entry for full
  detail. First shipped as Red Mansion (26×19×28), swapped same day
  after follow-up feedback it was too big — all 4 of the structure
  mod's buildings were decompiled and compared, Abandoned Brick House
  (12×13×11) was the clear smallest and is what's live now. Compound
  retuned to match: margins roughly halved, watchtower back to
  `wallY0+16`, worldborder reverted 90→50 (restores the originally-
  tuned wave-8 ending border of 166, not the mansion-driven ~206 — a
  bonus of the revert, not a separate balance change). Same
  `/place template` wet_sponge cleanup technique proven on the mansion
  reused here (78 blocks this time); one more real bug (a grave marker
  landing on the smaller building's own front wall) caught and fixed
  before the sandbox test. Verified via a full end-to-end sandbox
  replay of the real login sequence both times — no exceptions.
  **Needs a brand-new world to see** — same as every other spawn-time
  change this pack has made, doesn't apply retroactively to an existing
  save.
- **Decoration lang fix (Phase 5, partial)** — built and shipped
  2026-09-01. Root cause confirmed, not guessed: Doomsday Decoration's
  own shipped `en_us.json` (its only language file) genuinely contains
  Chinese text despite the filename — Zcraft Decoration's own lang file
  was checked too and is fully correct English already, ruling it out.
  Overrode `pack/kubejs/assets/doomsday_decoration/lang/en_us.json` —
  had to include the mod's full 1152-key file, not just the 8 keys
  actually placed in this pack's base build, since a resource pack
  replaces a language file wholesale rather than merging per-key (a
  partial override would've blanked every other label to its raw
  key). The 8 real English translations
  (barrel/woodencrate/carton/carton_2/fixedgenerator/shelf/table/
  weaponbox): confirmed by direct 1:1 translation of the mod's own
  Chinese source text, not guessed. Placement/density reassessment
  (the other half of Phase 5) still waits on the user actually seeing
  the redesigned base in-game.
- **QOL mod batch (Phase 4) + Mob Dismemberment + The Lost City** —
  built and shipped 2026-09-01. All installed, sandbox-verified with a
  fresh-world boot (real jigsaw structure generation exercised, since
  Lost City is a new structure mod) before deploying live:
  - **Inventory Sorter**, **Controlling** (+ Searchables dependency),
    **Xaero's World Map**, **Waystones** (+ Balm dependency), **Crafting
    Station Improved** — all installed as specced, each independently
    re-verified against its real CurseForge page (author/downloads/
    dependencies) before installing.
  - **Zoomify substituted for Just Zoom** — the originally-requested
    "Zoomify" (isXander) turned out to have no Forge build at all (only
    Fabric/Quilt - confirmed directly via `packwiz`'s own version
    resolution failing, not assumed from a search result). Real
    substitute found via Modrinth (`Just Zoom` by Keksuccino, 9M+
    downloads, + its Konkrete dependency) - and its real default
    keybind, confirmed by decompiling the mod's own `KeyMappings.class`,
    is already **Z** (GLFW keycode 90), so the "rebind C to Z" ask
    turned out to need zero configuration.
  - **A new Basics quest** ("A Stone That Remembers," gated on quest 6
    same as "Not Just Jewelry") teaches waystone crafting - real item
    task against `waystones:waystone`, confirmed craftable from its own
    shipped recipe before writing the task.
  - **Mob Dismemberment [UNOFFICIAL MODERN PORT]** — installed
    (ThatSoulyGuy's port, confirmed real Forge 1.20.1 build; the
    well-known original by iChun has none). **Real bug caught in
    sandbox verification**: it's genuinely client-side only and crashes
    outright when loaded in a dedicated-server context (references a
    client-only vanilla class during common setup) - packwiz's
    CurseForge metadata had defaulted its `side` to `"both"`, which
    would be wrong; corrected to `"client"`. This pack's own live
    instance runs as an integrated singleplayer client (not a dedicated
    server), so this shouldn't affect actual play - flagged as a real
    methodology gap in this session's own dedicated-server sandbox
    testing, worth remembering for any other client-only mod added
    later.
  - **The Lost City** (+ Berezka's library dependency, confirmed
    unambiguous this time, matching the peer's re-verification) — all
    12 of its own `structure_set` files retuned to moderate spacing
    (matching this pack's established pattern for every other structure
    mod), except `infinity_city.json`, which uses a custom placement
    type this session doesn't yet understand well enough to safely
    retune - left at its shipped default, flagged rather than guessed
    at. Verified for real: a fresh sandbox world booted clean through
    actual jigsaw structure placement (the highest-risk phase, given
    this pack's crash history) and `/locate structure
    the_lost_city:city` found a real instance 112 blocks from a test
    point, confirming the retuned spacing is genuinely reachable within
    this pack's small bordered play area.
  Not yet confirmed by an actual player session — sandbox verification
  covers boot/generation stability and real block/structure placement,
  not gameplay feel.
- **Fixed spawn point moved off the badlands blob + wave-spawn
  positioning rewritten** — built 2026-09-01 (see FEATURES.md's "World
  type" section for the full spec). Spawn now targets `(780, -150)`,
  picked via real RCON biome checks (badlands 300-500+ blocks away
  there vs. 0 at the old spot) rather than guessed. Confirmed the base
  build/worldborder centering/"last bastion" redesign all derive from
  the same single coordinate, so they relocate together automatically.
  Also fixed the real related bug found while doing this: the
  deterministic 1-8-wave system's mob spawn distance was
  worldborder-relative, so it grew unboundedly with the border
  (270 blocks by wave 8 from growth alone, and the amulet's
  `BORDER_EXPAND_DELTA` sends it into the millions) — rewrote to a
  fixed 40-60 block player-relative distance instead. **This does NOT
  fix the separate "endless horde spawns but nothing appears" bug** —
  confirmed by reading the code that the endless-phase branch is a
  completely different path (Undead Nights' own `spawn_horde` command),
  untouched by this change; that bug still needs its own diagnosis, see
  the 2026-09-01 feedback batch above. Not yet confirmed by an actual
  wave playtest.
- **"Last bastion, in disrepair" base redesign + amulet/pedestal
  reversal** — built and shipped 2026-08-31 (see FEATURES.md's "Starting
  base" and "The amulet" sections for the full spec). Watchpost walls
  now uneven (reinforcement concentrated at the gate, a genuinely weaker
  breached section on the back wall), gate dressed with cover props +
  a decorative spikes line, pedestal pre-placed in a shrine nook with
  grave markers, watchtower got battle-wear detail, and the previously
  unbuilt interior shack is now a real furnished room. Amulet is no
  longer starter gear — it has a real crafting recipe now, and the
  pedestal no longer gates on being crafted. Quest book updated to
  match (Basics 6.5/8.5 retasked). **Doomsday Decoration** + **Zcraft
  Decoration** installed. Verified via a live sandbox: every new block
  ID/blockstate individually confirmed placeable via RCON (caught and
  fixed 2 real "unknown block type" IDs that looked valid from
  blockstate files alone), script/quest reload clean with 0 errors. Not
  confirmed by an actual player spawn — the sandbox's mineflayer bot
  couldn't complete this mod set's FML handshake, so exact visual
  placement/spacing is unverified; expect at least one iteration round
  after your next look at it.
- **Machine progression, Tier 2** — built and shipped 2026-08-31 (see
  FEATURES.md's "Machine progression, Tier 2" and its Tier 2 quest
  chapter for the full spec). Fire Trap/Fan/Magnetic Chest (Trapcraft)
  and Arrow Turret (new install: Medieval Defense Turrets) all
  re-recipied to pull from the Uncommon loot tier; its own 4-quest FTB
  Quests chapter shipped alongside. Verified via a full-mod-set sandbox
  boot (clean `Done`, 0 script errors, exact expected 17-quest count) —
  not yet seen in-game.
- **Endless phase scaling (waves 9+)** — built 2026-09-01, **real bug
  found on first actual wave-9 playtest, real fix shipped 2026-09-01**:
  see "Structure improvements, remaining" above for the full root-cause
  writeup (Undead Nights' spawn-distance config exceeded the live
  instance's real simulation distance). Not yet confirmed by an actual
  wave-9 playtest with the fix in place.
- **2026-09-01 playtest feedback batch, Phase 2 (balance tweaks)** —
  built and shipped 2026-09-01, all four items:
  - Gold drop rate: Fortified Cache's `gold_ingot` entry weight 15->30
    (now the single highest-weight item in that pool) and quantity
    2-4->4-6 - expected ~2.4 gold ingots per bag opened, was ~0.9.
  - Worldborder growth: `base_expansion.js`'s per-wave rate cut to
    roughly 43% of the previous curve (10+3*step instead of 20+5*step),
    same step-every-2-waves shape - ends at 166 blocks by wave 8
    instead of 270.
  - Flesh Suffer nerf: attack damage 25->12 via the same Attributes-NBT
    override technique already used for the ravager, at the mob's
    summon point in `wave_spawner.js`. Also resolves the "invisible
    mob one-shot me" report from the same feedback round — investigated
    first, no literal invisible mob found (real combat log showed only
    known roster mobs; Flesh Suffer's actual ability is a Slowness VI
    melee-retaliation effect, not invisibility, which likely read as
    "got trapped and killed before I could react"). If a genuinely
    invisible attacker gets reported again after this nerf, it needs a
    fresh death with log access, not assumed to be the same thing.
  - Basics chapter: "The Reckoning" and "No Turning Back" (the last 2
    quests) removed entirely from `basics.snbt` - confirmed nothing
    else depended on them before removing. Resolves the outstanding
    "Quest 10 flavor text needs a rewrite" item by removing the need
    for it. Sandbox-verified: chapter reload shows exactly 15 quests
    (was 17), matching the removal.
  - Also fixed in the same pass, not originally its own numbered item:
    the "hostiles remaining" counter (`wave_status.js`) and the Wave
    Horn's own re-use gate (`wave_spawner.js`'s `nearbyWaveMobCount`)
    both used to match nearby hostiles by type only, so a real vanilla
    mob from a nearby structure's spawner block (spawners bypass
    `doMobSpawning`) within the counting radius got miscounted as a
    wave mob. Both now require a persistent `td_wave_mob` tag, set at
    the actual summon point, for the deterministic 1-8-wave phase;
    endless-phase mobs (which can't carry this tag, coming from Undead
    Nights' own opaque `spawn_horde` command) fall back to the old
    type-only matching, a deliberate scope boundary, not an oversight.

## Confirmed working (recent playtests)

- **Structure mod aesthetic swap** — **user-confirmed**: structure
  generation now reads as the intended abandoned aesthetic. When
  Dungeons Arise/Structory: Towers removed, Apocalypse structures:
  Abandoned city buildings + Abandoned Urban installed instead.
- World-gen: `multi_noise` biome source (7-biome curated set), raised
  floor depth, the whole 4-crash world-creation saga — **user-confirmed
  fixed**.
- The amulet + pedestal (worn buffs, border-crossing, marker
  alignment/bob fix) — exercised directly through real bug reports
  (marker misalignment, since fixed), so the core mechanic is proven
  working even though the marker height fix itself isn't pixel-verified.
- Vanilla desert pyramids disabled, Treasure2's mimic mechanic
  identified (not a bug, left undocumented on purpose).
- Base expansion's escalating growth curve — built, not separately
  confirmed by name, but the same worldborder machinery has been
  exercised repeatedly through the structure-reachability and world-gen
  playtests since.

## On hold — deliberately not queued right now

**Priority reset, 2026-09-06** — direct instruction: "I want the early
to mid game be solid enough to sink some proper playtesting in rather
than see a bunch of bugs and visual noise... the extra tiers and
mechanics can wait." Everything in this section (new tiers, new
mechanics, new mob content) is explicitly deprioritized behind a real
extended playtest of what already exists — don't propose or build
anything here unless the user brings it back up themselves. Bugs/visual
polish surfaced by that playtest take priority over all of it.

- **Storage & power system** — fully specced 2026-09-01 (see
  FEATURES.md's "Defense" section, "Storage & power system" entry).
  **Sophisticated Storage** (+ required Sophisticated Core), **Refined
  Storage**, **Immersive Engineering** (power generation — also
  resolves the Tier 3 Tesla Coil candidate for free), and **Flux
  Networks** (wireless distribution) — four mods, real footprint (IE is
  a full standalone tech mod, the biggest single addition besides full
  Create). Real design decision made along the way: this becomes the
  pack's actual Tier 3-4 power system, not a separate storage-only
  addition. Three of the four mods' exact dependency lists weren't
  fetched directly from their own CurseForge relations pages (only
  Sophisticated Storage's was) — verify before installing, not assumed.
  **Deliberately parked, not sent to build** — queued behind the
  current 2026-09-01 playtest-feedback batch (13 items, 5 phases) so it
  doesn't add a fifth substantial project on top of what's already in
  flight. Send when that batch clears.
- **Hardcore mode** — fully specced 2026-09-01 (see FEATURES.md's new
  "Hardcore mode" section). Real permadeath (player death or pedestal
  destruction) softened by Totems of Undying, obtainable both as a rare
  boss-kill drop and via a new (vanilla has none) hard crafting recipe.
  Built fully custom via KubeJS, not vanilla's native Hardcore flag —
  confirmed that flag can't be turned on after world creation, no
  command/datapack path exists. Optional toggle, not the pack's new
  default — endless-phase scaling means every hardcore run eventually
  ends in death no matter how skilled the player is, which is fine for
  an opt-in but not as a forced default. Pedestal deliberately stays
  unhardened — defending it is meant to be real base-defense stakes,
  not background scenery. **Deliberately parked, not sent to build** —
  same reasoning as the storage/power system above, queued behind the
  current playtest batch rather than adding a sixth parallel project.
- **Defense-breaching enemies (Demolition Zombie)** — fully specced
  2026-09-01 (see FEATURES.md's new "Mob roster & defense-breaching
  threats" section). Introduces Undead Nights' own Demolition Zombie
  (already installed, currently unused) as a late-wave threat that can
  genuinely destroy the gate/watchtower/placed machines via real TNT —
  confirmed first that the reinforced perimeter walls themselves can
  never be the breach point (SecurityCraft's explosion immunity is
  unconditional, not tunable), so this targets what's actually
  vulnerable instead. User decided: also reinforce the gate (was left
  plain as "unnecessary complexity" before there was any real threat to
  it — that's now an accidental weak point, not an intentional one).
  Exact numbers (TNT count, spawn weight, introduction wave) still
  open. **Deliberately parked, not sent to build** — queued behind the
  current playtest batch, same as
  everything else above.
- **Mutants and Zombies (more zombie-family variety)** — fully specced
  2026-09-01 (see FEATURES.md's "Mob roster & defense-breaching
  threats" section, "More zombie-family variety" entry). 8 real
  zombie-family mobs (Zombie Brute, Crawler, Spitter, Blister Zombie,
  Split Head Zombie, Mutant Brute, Rotten Mutant, Mutant Zombie), same
  author as the already-trusted Undead Nights, confirmed to add no
  autonomous wave/horde systems of its own. One clean dependency
  (Advanced Wall Climber API, confirmed real Forge 1.20.1). Mutant
  Monsters (the more famous alternative) checked and ruled out — no
  Forge 1.20.1 build exists. Still needs: deciding which waves/hordes
  these mobs actually join, and any loot/stat re-recipe work, same
  treatment TFTH mobs got. **Deliberately parked, not sent to build** —
  queued behind the current playtest batch, same as everything else
  above.

## Not ready yet — needs fleshing out in IDEAS.md first
- Roguelike next-wave-composition choice — parked pending a GUI
  decision that was explicitly not pursued.
- **Base expansion into rooms/corridors (Schematicannon)** — mod
  question resolved (full Create installed), but a harder, genuinely
  blocking dependency remains: a lootable `create:schematic` item only
  points at a `.nbt` file, which has to already exist in that world's
  `schematics/uploaded/` folder — and none exists yet. Needs at least
  one room hand-built in-game and exported via Schematic and Quill +
  Schematic Table first. Not a coding-session task.
