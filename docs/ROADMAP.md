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
  `/fill`-based starter base, and grow the worldborder every 3 nights
  survived (`pack/kubejs/server_scripts/base_expansion.js`). A real
  custom dimension and a hand-built `.nbt` starter structure are noted as
  the fancier version, revisit only if Superflat proves insufficient.

## Mod list
- See [docs/MODS.md](MODS.md) — tracked per-mod as they're picked.
- Escalation is now handled by mods (Epic Siege Mod for AI, Pure Suffering
  for tiered invasions), not hand-written from scratch — KubeJS's job
  narrowed to gap-filling glue, not owning the whole mechanic.

## Current priority
Pack is playable and being actively playtested (see
`docs/PLAYTESTING.md`) — CurseForge instance, Superflat world, on-demand
wave triggering via Pure Suffering's admin commands. `night_scaling.js`
(mob stat scaling) stays parked in `docs/deferred/` — the current
mod-driven escalation (Epic Siege Mod + Pure Suffering) is covering that
job for now.

## Open questions
- (add things here as they come up)
