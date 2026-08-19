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
| SecurityCraft | [Modrinth](https://modrinth.com/mod/security-craft) | v1.10.2.1 (1.20.1 Forge/NeoForge) | Turrets, reinforced blocks, trophies, alarms — gives "build up your base between nights" real mechanical teeth | None known yet | testing |
| Mob Grinding Utils | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/mob-grinding-utils) | 1.1.0 (1.20.1 Forge) | Mob fans/mashers/absorption hoppers — payoff for surviving a wave (turn the horde into XP/loot/power) rather than it just being a threat | None known yet | testing |
| Epic Siege Mod | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/epic-siege-mod) | 14.171 (1.20.1 Forge) | Rewrites mob AI wholesale: zombies dig/pillar to reach you, creepers breach walls, skeletons snipe, endermen teleport targets, mobs swim/raid villages. Fully configurable (awareness radius, chaos mode) — this is the pack's primary "hordes get scary" mod | Replaces **Zombie Awareness** (removed — both rewrote mob AI goals, redundant/risked conflicting; Epic Siege is the more configurable, more established of the two, so it's the one that stayed). Also considered but rejected: **Nightmare Epic Siege** (same overlap problem, smaller/less-tested mod) | testing |
| The Pure Suffering Mod | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/the-pure-suffering-mod) | 1.6.8.5R-LTS1 (1.20.1 Forge) | Invasion events that escalate in tier/severity over time — largely covers the "each night harder" escalation we'd planned to hand-write in KubeJS | Overlaps with the planned custom "nightly wave scaling" glue script (see docs/ROADMAP.md) — decide whether this mod replaces that script, or the script layers on top for something this mod doesn't cover (e.g. driving Epic Siege's aggression settings) | testing |
| TFTH (The Flesh That Hates) | [Modrinth](https://modrinth.com/mod/tfth) | 1.1b (1.20.1 Forge) | Spreading-infection threat with its own dynamic difficulty ("Biomass") that grows if ignored, shrinks if fought — a background threat independent of the day/night cycle | Pulls in Geckolib automatically. Runs on its own clock, not nights — decide later whether Incubators should be gated to only matter/spawn at certain times so it doesn't fight the night-based pacing of everything else | testing |
| Geckolib | [Modrinth](https://modrinth.com/mod/geckolib) | 4.8.4 | Hard dependency of TFTH (animation library) | — | required |
| Scape And Spartans: Parasites Port | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/srp-spartans-port) | 1.0.5 (1.20.1 Forge) | **Not** the actual Scape and Run: Parasites mod (that's 1.12.2-only, unported, no permission for ports) — this only ports 4 SRP-themed weapon variants (bleed/viral/corrosion/immalleable) onto Spartan Weaponry. Added as the closest available substitute | Niche/early-stage mod — its own CurseForge page has a past warning about a save-breaking update (v1.0.1); we're on v1.0.5, but treat future `packwiz update` on this one with extra care (check changelog first) rather than blind-updating | testing |
| Spartan Weaponry | [Modrinth](https://modrinth.com/mod/spartan-weaponry) | 3.2.1 (1.20.1 Forge) | Hard dependency of the Parasites weapon port | — | required |
| Spartan Weaponry Addon Toolkit | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/spartan-weaponry-addon-toolkit) | 1.6.1 | Hard dependency of the Parasites weapon port | — | required |

## Custom glue

- **Night-based mob scaling** — first draft exists at
  `pack/kubejs/server_scripts/night_scaling.js` but is **deferred, not
  committed**. There's no playable setup to test it against yet, and with
  Epic Siege Mod (AI behavior) and Pure Suffering (tiered invasion events)
  both already handling escalation, hand-tuning raw mob stats on top is a
  later-priority refinement, not part of getting the mod list itself
  solid. Revisit once the pack is actually running.

## Compatibility check (2026-08-19)

Reviewed all 11 tracked mods (7 picks + 4 auto-resolved dependencies)
against each other:
- No mod author has declared an "Incompatible" relation against any other
  mod in this list (checked CurseForge's own Incompatible-relations field
  directly for Epic Siege Mod, Pure Suffering, TFTH, and the Parasites
  port — the four most likely to have known conflicts; the rest have no
  dependency conflicts per packwiz's own resolution).
- Pure Suffering had a real past bug ("crashes when a mod adds a mob with
  broken AI," relevant given Epic Siege Mod and TFTH both add custom mob
  behavior) — fixed in v1.6.8.3R; we're pinned to v1.6.8.5R-LTS1, so this
  doesn't apply.
- **Design note, not a conflict**: Epic Siege Mod's zombies dig/pillar to
  reach targets, which can break vanilla-style mob-farm designs used with
  Mob Grinding Utils. Build farms out of SecurityCraft reinforced blocks
  (which Epic Siege's mobs can't break) to keep them escape-proof.

No blockers found — this list is a solid base to build the pack around.

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
