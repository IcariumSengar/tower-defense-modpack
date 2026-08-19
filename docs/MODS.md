# Mod List

Tracks every mod going into the pack, why it's in, and any compatibility
notes/conflicts found while adding it. Update this whenever a mod is
added, and re-check it as the list grows for pairwise conflicts.

Status values: `required` (pack won't run without it), `confirmed` (added,
tested, no known issues), `testing` (added, not yet verified), `flagged`
(known conflict/issue, needs a decision), `considering` (not added yet).

| Mod | Source | Version | Purpose | Compat notes | Status |
|---|---|---|---|---|---|
| KubeJS | [Modrinth](https://modrinth.com/mod/kubejs) | 2001.6.5-build.26 (1.20.1 Forge) | Data-driven glue scripting (recipes, tags, loot, progression tweaks) without editing other mods' code | Pulls in Architectury API + Rhino automatically | required |
| Architectury API | [Modrinth](https://modrinth.com/mod/architectury-api) | 9.2.14-forge | Hard dependency of KubeJS | — | required |
| Rhino | [Modrinth](https://modrinth.com/mod/rhino) | 2001.2.3-build.10 | JS engine KubeJS runs scripts on — hard dependency, packwiz added it automatically | — | required |
| Zombie Awareness | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/zombie-awareness) | 1.13.1 (1.20.1 Forge) | Zombies/skeletons track the player by scent/sound/light instead of just spawning nearby — makes hordes actually converge on wherever you're holed up at night | Requires CoroUtil (pulled in automatically). Config controls detection radius/aggression — will need tuning once other night-threat mods are picked | testing |
| CoroUtil | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/coroutil) | 1.3.7 | Hard dependency of Zombie Awareness | — | required |
| SecurityCraft | [Modrinth](https://modrinth.com/mod/security-craft) | v1.10.2.1 (1.20.1 Forge/NeoForge) | Turrets, reinforced blocks, trophies, alarms — gives "build up your base between nights" real mechanical teeth | None known yet | testing |
| Mob Grinding Utils | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/mob-grinding-utils) | 1.1.0 (1.20.1 Forge) | Mob fans/mashers/absorption hoppers — payoff for surviving a wave (turn the horde into XP/loot/power) rather than it just being a threat | None known yet | testing |

## Custom glue needed (not a mod — KubeJS)
- **Nightly wave scaling**: server-side day counter; each dusk, scale spawn count/mob health/damage and unlock tougher mobs at wave thresholds. No mod covers this — this is the KubeJS script that makes the pack actually feel like tower defense.

## Adding a mod

1. Tell me the mod (name or link), or I propose one for a gap in the list.
2. I check: Forge + 1.20.1 availability, hard dependencies, known conflicts
   with mods already in this list, and whether it overlaps mechanically
   with something already included.
3. It gets a row here with status `considering` (or `flagged` if there's a
   real conflict to resolve first).
4. Once it's actually installed via `packwiz modrinth add` /
   `packwiz curseforge add`, status flips to `testing`; once played and
   confirmed working, `confirmed`.
