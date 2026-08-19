# Tower Defense Modpack

Forge 1.20.1 modpack: hostile mobs get smarter and hordes escalate every
night, and you build up your base's defenses to survive them — a curated
set of existing mods, tied together with glue code, packaged for
CurseForge. This repo is storage/tracking — mod lists, compatibility
notes, glue scripts, config — not a place where other authors' mods get
edited or committed. No custom Java mod — everything is existing mods
plus KubeJS glue.

Current approach is horde-density (mobs converge on wherever you're
actually holed up, no custom AI needed) rather than true tower-defense
(mobs pathing to a fixed base-core objective) — see
[docs/ROADMAP.md](docs/ROADMAP.md) for why, and what a later "true"
version would need.

## Layout

- `pack/` — the actual modpack, managed with [packwiz](https://packwiz.infra.link/),
  a text/git-friendly modpack format (no binary blobs, mods referenced by
  URL/hash rather than committed).
  - `pack/kubejs/` — glue scripts (recipe bridges, tag merges, progression/
    balance tweaks) for making mods work together. Primary (and currently
    only) way to make the pack feel cohesive — see
    [pack/kubejs/README.md](pack/kubejs/README.md).
- `docs/` — [MODS.md](docs/MODS.md) (mod list + compat notes) and
  [ROADMAP.md](docs/ROADMAP.md) (decisions/TODOs).

## Setup: curated pack (`pack/`)

`packwiz` is installed at `%LOCALAPPDATA%\Programs\packwiz\packwiz.exe`
(added to user PATH — open a new terminal to pick it up). Mods get added by
asking in conversation; Claude runs the commands. Manually, from `pack/`:

```
packwiz refresh                 # generates/updates index.toml
packwiz modrinth add <mod-slug> # or: packwiz curseforge add <mod-slug>
```

Mods are tracked as small `.pw.toml` files (URL + hash), not committed
binaries, so the pack folder stays lightweight in git. To export a
CurseForge/Modrinth-installable pack:
```
packwiz cf export --side both      # or: packwiz mr export
```
**`--side both` is required** — `cf export` defaults to `--side client`
and silently drops server-only mods (Radium, LootJS) from the zip with
no warning. Since this pack only targets single-player (the integrated
server needs every mod too), always export both sides.

## Status

See [docs/MODS.md](docs/MODS.md) for the mod list and [docs/ROADMAP.md](docs/ROADMAP.md)
for open decisions and TODOs.
