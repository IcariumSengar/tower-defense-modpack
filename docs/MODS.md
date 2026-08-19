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
| Embeddium | [Modrinth](https://modrinth.com/mod/embeddium) | 0.3.31 (1.20.1 Forge) | Forge port of Sodium — full rendering-engine rewrite, the biggest FPS win available | None known yet | testing |
| ModernFix | [Modrinth](https://modrinth.com/mod/modernfix) | 5.27.76 (1.20.1 Forge) | Faster load times, lower memory use, general bugfixes; built to be compatible with other perf mods | None known yet | testing |
| FerriteCore | [Modrinth](https://modrinth.com/mod/ferrite-core) | 6.0.1 (Forge) | Memory-only optimization — devs of ModernFix recommend always pairing the two | None known yet | testing |
| Radium | [Modrinth](https://modrinth.com/mod/radium) | 0.12.4 (1.20.1 Forge) | Forge port of Lithium — server tick/mob AI optimization, directly relevant given how many mobs Epic Siege/Pure Suffering/TFTH add | None known yet | testing |
| Entity Culling | [Modrinth](https://modrinth.com/mod/entityculling) | 1.10.5 (1.20.1 Forge) | Skips rendering entities not actually visible — helps with horde-on-screen moments | Client-side only | testing |
| Clumps | [Modrinth](https://modrinth.com/mod/clumps) | 12.0.0.4 (1.20.1 Forge) | Merges XP orbs into one entity after a big kill instead of dozens | Server-side | testing |
| Not Enough Crashes | [Modrinth](https://modrinth.com/mod/notenoughcrashes) | 4.4.9 (1.20.1 Forge) | Return to title screen and keep playing after a crash instead of losing the session | None known yet | testing |
| JEI | [Modrinth](https://modrinth.com/mod/jei) | 15.49.0.191 (1.20.1 Forge) | Recipe/item viewer | None known yet | testing |
| Jade | [Modrinth](https://modrinth.com/mod/jade) | 11.13.3 (1.20.1 Forge) | Hover-over info for blocks/entities | None known yet | testing |
| Xaero's Minimap | [Modrinth](https://modrinth.com/mod/xaeros-minimap) | 26.4.2 (1.20.1 Forge) | Minimap navigation | None known yet | testing |
| AppleSkin | [Modrinth](https://modrinth.com/mod/appleskin) | 2.5.1 (1.20.1 Forge) | Exact hunger/saturation values on food | None known yet | testing |
| Mouse Tweaks | [Modrinth](https://modrinth.com/mod/mouse-tweaks) | 2.25.1 (1.20.1 Forge) | Faster inventory management (shift/right-click-drag) | None known yet | testing |
| Inventory Profiles Next | [Modrinth](https://modrinth.com/mod/inventory-profiles-next) | 1.10.20 (1.20.1 Forge) | One-key inventory sort | Pulls in libIPN + Kotlin for Forge automatically | testing |
| libIPN | [Modrinth](https://modrinth.com/mod/libipn) | 4.0.2 | Hard dependency of Inventory Profiles Next | — | required |
| Kotlin for Forge | [Modrinth](https://modrinth.com/mod/kotlin-for-forge) | 4.12.0 | Hard dependency of Inventory Profiles Next | — | required |
| Waystones | [Modrinth](https://modrinth.com/mod/waystones) | 14.1.20 (1.20.1 Forge) | Fast-travel network. Deliberately included despite tension with tower-defense stakes — framed as "get back to base before nightfall," not a shortcut past danger | Pulls in Balm automatically | testing |
| Balm | [Modrinth](https://modrinth.com/mod/balm) | 7.3.42 | Hard dependency of Waystones | — | required |
| Corpse | [Modrinth](https://modrinth.com/mod/corpse) | 1.0.23 (1.20.1 Forge) | Death drops become a recoverable corpse instead of scattering — chosen over GraveStone Mod (same niche, picked one) | None known yet | testing |

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

## Compatibility check (2026-08-19, performance/QoL batch)

Reviewed the 15 newly added performance/stability/QoL mods (+ 3
auto-resolved dependencies) against the existing 11:
- Checked the highest-risk pairing specifically — **Radium** (Lithium-style
  mob AI/tick optimization) against **Epic Siege Mod** (heavily rewrites
  mob AI) — no reported conflicts found; the only Epic Siege compatibility
  caveats on record are from its 1.7.10-era history and don't apply to how
  modern Forge mods hook in.
- One claim needed debunking: a search turned up a list of mods supposedly
  "incompatible with ModernFix" that included **Architectury** and
  **FerriteCore** — both already in this pack, and FerriteCore is the mod
  ModernFix's own devs recommend always pairing with it. Checked the actual
  ModernFix GitHub wiki/FAQ directly — neither mod is mentioned anywhere in
  it. The scraped list was wrong; no action needed.
- No other author-declared incompatibilities found.

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
