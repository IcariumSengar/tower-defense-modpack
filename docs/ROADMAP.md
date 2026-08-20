# Roadmap / Notes

## Decisions
- **Guiding principle: keep footprint small.** This needs to stay
  playtestable on ordinary hardware, not become a 200-mod kitchen-sink
  pack. Applies to any mod *I* propose adding on my own initiative —
  default to the lighter/leaner option, and call out footprint cost
  (heavy deps, big content mods) before suggesting something bulky, even
  if it's otherwise a good thematic fit.
- Loader: Forge
- Target Minecraft version: 1.20.1
- Forge version pinned in `pack/pack.toml` — bump when updating.
- One pack, curated mods + glue — not a from-scratch content mod. Glue for
  cross-mod compatibility/balance is written in KubeJS (`pack/kubejs/`).
  No custom Java mod is scaffolded — if something genuinely can't be done
  in KubeJS, that'd be a deliberate new decision, not a fallback already
  in the repo.
- Pack name: "Tower Defense Modpack" (set in `pack/pack.toml`).
- Theme: tower defense — inspired by Diseased Craft, but waves are meant
  to threaten the base, not just the player. Starting with the
  **horde-density** approach: no custom AI, mobs behave normally (track by
  scent/sound/light, break doors) but get smarter/scarier/more numerous
  each night via KubeJS scaling, so "the base" is emergent — wherever
  you've fortified. **True tower defense** (mobs pathfinding to a fixed
  base-core objective regardless of player position) is a possible later
  step, deferred because it requires custom Java AI rather than just
  picking mods + KubeJS glue — bigger bet, revisit once the horde-density
  version is proven fun.
- **Base expansion / "custom world" (2026-08-19):** first-step scope
  chosen from the fuller design notes in `docs/IDEAS.md` — reuse the
  Superflat Overworld (no separate custom dimension), keep the existing
  `/fill`-based starter base, and grow the worldborder by 5 blocks every
  2 nights survived (`pack/kubejs/server_scripts/base_expansion.js`). A real
  custom dimension and a hand-built `.nbt` starter structure are noted as
  the fancier version, revisit only if Superflat proves insufficient.

## Mod list
- See [docs/MODS.md](MODS.md) — tracked per-mod as they're picked.
- **Waves are vanilla-mobs-only for now (2026-08-19)**, after feedback
  from the first real playtest — too many mob types was noise, not
  signal. A hand-authored 5-wave campaign
  (`pack/kubejs/server_scripts/wave_spawner.js`) replaced relying on
  Epic Siege Mod / Pure Suffering / TFTH's combined variety. TFTH was
  later re-added and is now folded directly into the wave roster
  (waves 2-5); Pure Suffering was removed 2026-08-20 as part of a
  footprint audit (was already dormant); Epic Siege Mod still applies
  its AI behavior to whatever the wave spawner summons — see
  `docs/MODS.md` under "Removed mods" for the removal reasoning and
  re-add paths.

## Current priority
Pack is playable and being actively playtested (see
`docs/PLAYTESTING.md`) — CurseForge instance, Superflat world, on-demand
wave triggering via the Wave Horn item. `night_scaling.js`
(mob stat scaling) stays parked in `docs/deferred/` — the current
escalation is coming from the hand-authored wave campaign (each wave
adds a tougher mob type) plus Epic Siege Mod's AI, not mob stats — that
job for now.

## Open questions
- (add things here as they come up)
