# Tower Defense Modpack

Forge 1.20.1 modpack: hostile mobs get smarter and hordes escalate every
night, and you build up your base's defenses to survive them — a curated
set of existing mods, tied together with glue code, packaged for
CurseForge. This repo is storage/tracking — mod lists, compatibility
notes, glue scripts, config — not a place where other authors' mods get
edited or committed.

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
    balance tweaks) for making mods work together. Primary way to make the
    pack feel cohesive — see [pack/kubejs/README.md](pack/kubejs/README.md).
- `mod/` — Gradle/ForgeGradle project for a custom mod. Fallback only, for
  anything KubeJS genuinely can't do — not expected to be needed often.
- `docs/` — [MODS.md](docs/MODS.md) (mod list + compat notes) and
  [ROADMAP.md](docs/ROADMAP.md) (decisions/TODOs).

## Setup: custom mod (`mod/`)

Requires JDK 17 (this machine currently has JDK 18 on PATH — ForgeGradle 6
expects 17; install Temurin/Adoptium 17 and point `JAVA_HOME` at it, or use
your IDE's project SDK setting, if the build complains).

The Gradle wrapper jar isn't committed (it's a binary blob and wasn't
available to generate offline in this environment). Before building, do
**one** of:

1. Install Gradle, then from `mod/` run:
   ```
   gradle wrapper --gradle-version 8.1.1
   ```
   This generates `gradlew`, `gradlew.bat`, and `gradle-wrapper.jar` to match
   `gradle/wrapper/gradle-wrapper.properties`.
2. Download the official Forge MDK for 1.20.1 from
   [files.minecraftforge.net](https://files.minecraftforge.net/net/minecraftforge/forge/index_1.20.1.html)
   and copy its `gradlew`, `gradlew.bat`, and `gradle/wrapper/gradle-wrapper.jar`
   into `mod/`.

Then:
```
cd mod
./gradlew genEclipseRuns   # or genIntellijRuns
./gradlew runClient
```

Check `mod/gradle.properties` for the pinned Forge build (`forge_version`) —
bump it to the latest recommended build for 1.20.1 if it's gone stale.

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
packwiz cf export      # or: packwiz mr export
```

## Status

See [docs/MODS.md](docs/MODS.md) for the mod list and [docs/ROADMAP.md](docs/ROADMAP.md)
for open decisions and TODOs.
