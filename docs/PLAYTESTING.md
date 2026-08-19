# Playtest setup

A repeatable, tightly-scoped way to test the pack without combat
difficulty or manual setup getting in the way. Most of it is now
automatic (via `pack/kubejs/server_scripts/playtest_starter_kit.js`).

## Automatic (fires once, on your first login to a new world)

- **Starting weapon**: a Sharpness 100 netherite sword — one-shots
  essentially everything. Keeps testing focused on the systems (waves,
  loot, base expansion), not your own combat skill.
- **Wave Horn**: right-click to summon the next wave — see below.
- **Starter base**: a small walled box (11×11, cobblestone walls, stone
  brick floor, oak door) built around wherever you spawn.
- **Natural mob spawning disabled** (`doMobSpawning` gamerule) — the Wave
  Horn is the only mob source now. Note this also stops passive mobs
  (cows, etc.) since vanilla has no separate hostile-only toggle.

This only triggers on a **brand new world** — it won't retroactively fire
on a world you've already joined once.

## Manual setup (once per new world)

1. **World Type: Superflat**, **Allow Cheats: ON** — flat terrain means no
   generation lag and clear sightlines to see hordes coming.
2. Bound the play area:
   ```
   /worldborder set 150
   ```
   Grows automatically by 5 blocks every 2 nights survived after that
   (`base_expansion.js`).

## The test loop

Right-click the **Wave Horn** to summon the next wave. Deterministic,
vanilla-mobs-only 5-wave campaign (no modded mobs for now — see
`docs/MODS.md`):
1. zombie + skeleton
2. + spider
3. + witch
4. + wither skeleton
5. + ravager (mini boss) — repeats for calls beyond wave 5

The horn refuses to summon again while mobs from the current wave are
still alive nearby — clear the wave first. Action bar shows a live
"Hostiles remaining" count; chat announces when a wave starts/clears
(`wave_status.js`).

Pure Suffering is still installed but dormant (`enableInvasions false`,
and nothing calls `/puresuffering add` anymore) — its own broader
invasion variety is documented in `docs/MODS.md` if you want to
experiment with it directly, but it's not part of the current test loop.

Epic Siege Mod's AI behavior (zombies dig/pillar, creepers breach walls,
etc.) is ambient/always-on and applies to whatever the horn spawns.

## Known caveats

- `playtest_starter_kit.js`, `wave_spawner.js`, and `wave_status.js` are
  playtest tooling / first-pass design, not settled pack content — mob
  counts per wave and the starter base are both easy to retune.
- TFTH was removed from the pack (2026-08-19) so the wave campaign could
  go vanilla-only — see `docs/MODS.md` under "Removed mods" for why and
  how to bring it back later.
