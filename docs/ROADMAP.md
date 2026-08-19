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
- Escalation is now handled by mods (Epic Siege Mod for AI, Pure Suffering
  for tiered invasions), not hand-written from scratch — KubeJS's job
  narrowed to gap-filling glue, not owning the whole mechanic.

## Current priority
No playable setup exists yet (no client/launcher configured), so the
focus is getting the mod list itself solid — compatible, deduped,
dependency-resolved — rather than writing/tuning KubeJS glue that can't
be tested. Glue work (e.g. `night_scaling.js`, currently an uncommitted
draft) resumes once the pack can actually be run.

## Open questions
- (add things here as they come up)
