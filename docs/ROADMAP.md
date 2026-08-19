# Roadmap / Notes

## Decisions
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

## Mod list
- See [docs/MODS.md](MODS.md) — tracked per-mod as they're picked.

## Open questions
- (add things here as they come up)
