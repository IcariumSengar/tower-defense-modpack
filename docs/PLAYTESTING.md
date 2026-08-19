# Playtest setup

A repeatable, tightly-scoped way to test the pack without combat
difficulty or manual setup getting in the way. Two pieces are now
automatic (via `pack/kubejs/server_scripts/playtest_starter_kit.js`);
everything else is a couple of commands.

## Automatic (fires once, on your first login to a new world)

- **Starting weapon**: a Sharpness 100 netherite sword — one-shots
  essentially everything, including TFTH's 50-heart Incubators. Keeps
  testing focused on the systems (waves, loot, AI), not your own combat
  skill.
- **Starter base**: a small walled box (11×11, cobblestone walls, stone
  brick floor, oak door) built around wherever you spawn.

This only triggers on a **brand new world** — it won't retroactively fire
on a world you've already joined once.

## Manual setup (once per new world)

1. **World Type: Superflat**, **Allow Cheats: ON** — flat terrain means no
   generation lag and clear sightlines to see hordes coming.
2. Bound the play area:
   ```
   /worldborder set 150
   ```
3. Make waves deterministic instead of random:
   ```
   /gamerule enableInvasions false
   ```
   Pure Suffering's automatic RNG rolls stop; `/puresuffering add` still
   works as an explicit exception (confirmed from the mod's own
   changelog).

## The test loop

```
/puresuffering clear                              # reset
/puresuffering add primary puresuffering:zombie    # trigger a wave on demand
/puresuffering query                               # check status
```

Swap `zombie` for `undead`, `mega_raid`, `warden`, `phantom_zone`,
`arachnophobia`, etc. — see `docs/MODS.md` for the fuller list of
invasion type IDs, pulled directly from the mod jar.

Epic Siege Mod's AI behavior and TFTH's infection are both ambient/
always-on regardless of the above — see `docs/MODS.md` for why only Pure
Suffering is schedule-based.

## Known caveats

- `playtest_starter_kit.js` is playtest tooling, not real pack design —
  don't read the starter base as an actual base-defense recommendation.
- Not yet verified in-game as of writing — `event.server.runCommandSilent`
  and `persistentData` are confirmed-real KubeJS APIs (checked against the
  wiki and a working 1.20.1 mod integration example), but the specific
  `/fill`/`/setblock` sequence here hasn't been run yet. If the base comes
  out wrong or the sword doesn't appear, paste the log back.
