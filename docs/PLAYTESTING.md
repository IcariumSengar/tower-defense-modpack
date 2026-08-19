# Playtest setup

A repeatable, tightly-scoped way to test the pack without combat
difficulty or manual setup getting in the way. Almost everything is
automatic (via `pack/kubejs/server_scripts/playtest_starter_kit.js`).

## Automatic (fires once, on your first login to a new world)

- **Starting weapon**: a Sharpness 100 netherite sword — one-shots
  essentially everything. Keeps testing focused on the systems (waves,
  loot, base expansion), not your own combat skill.
- **Full iron armor set** — given to inventory, not auto-equipped.
- **Wave Horn**: right-click to summon the next wave — see below.
- **Starter base**: a small walled box (11×11, cobblestone walls, stone
  brick floor, oak door) built around wherever you spawn.
- **Worldborder set to 50**, centered on your actual spawn point (not
  the world's default 0,0). Grows automatically by 5 blocks every 2
  waves cleared after that (`base_expansion.js`).
- **Natural mob spawning disabled** (`doMobSpawning` gamerule) — the Wave
  Horn is the only mob source now. Note this also stops passive mobs
  (cows, etc.) since vanilla has no separate hostile-only toggle.

This only triggers on a **brand new world** — it won't retroactively fire
on a world you've already joined once.

## Automatic (fires once, after clearing your first wave — any world)

- **Storage chest**: one `minecraft:chest` given automatically the
  moment you've cleared wave 1, so there's somewhere to dump loot bag
  rewards. Unlike the section above, this one *does* retroactively fire
  on a world you already started, the next time it loads/reloads.

## Manual setup (once per new world)

Only the world-creation screen itself, which nothing can automate:
**World Type: Superflat**, **Allow Cheats: ON** — flat terrain means no
generation lag and clear sightlines to see hordes coming.

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
"Hostiles remaining" count; chat announces when a wave starts (with mob
count) and when it clears.

Calling the horn also forces night and locks the day/night cycle (so
zombies/skeletons don't burn on spawn or catch fire mid-fight) — it
switches back to day and lets the cycle run normally again once the
wave is cleared.

Pure Suffering is still installed but dormant (`enableInvasions false`,
and nothing calls `/puresuffering add` anymore) — its own broader
invasion variety is documented in `docs/MODS.md` if you want to
experiment with it directly, but it's not part of the current test loop.

Epic Siege Mod's AI behavior (zombies dig/pillar, creepers breach walls,
etc.) is ambient/always-on and applies to whatever the horn spawns.

## Known caveats

- `playtest_starter_kit.js`, `wave_spawner.js`, `wave_status.js`, and
  `base_expansion.js` are playtest tooling / first-pass design, not
  settled pack content — mob counts per wave and the starter base are
  both easy to retune.
- TFTH was removed from the pack (2026-08-19) so the wave campaign could
  go vanilla-only — see `docs/MODS.md` under "Removed mods" for why and
  how to bring it back later.
- The wave system went through a long real debugging saga (2026-08-19) —
  nine real bugs found and fixed end to end, then a further round after
  actual playtesting (spawn positions outside the worldborder, duplicate
  chat messages, expansion trigger mismatch). Full writeup in
  `docs/MODS.md`'s Wave spawner and Base expansion entries — worth
  reading if something in this system breaks again, several of these
  bugs were genuinely surprising (e.g. `Math.PI` not behaving as a
  normal number, bare `.x`/`.y`/`.z` on entities producing `NaN`) and
  are easy to reintroduce by instinct when writing new scripts.
- Wave Horn and all three loot bags now have hand-authored placeholder
  textures (added 2026-08-19, not KubeJS's generic missing-texture icon,
  but still not "real" art) — the bags are color-coded to match their
  rarity tooltip color (gray/gold-tan/red+gold).
- Loot bags were silently non-functional on right-click until
  2026-08-19 (same `event.level.isClientSide` crash the Wave Horn had) —
  fixed; see `docs/MODS.md`'s Loot bag drop system entry. Drop rate was
  also backwards (Rare more likely than Common) until the same day —
  now Common 50% / Uncommon 25% / Rare 10%. Common's loot pool gained
  stone/wood/food staples on top of its scrap materials.
