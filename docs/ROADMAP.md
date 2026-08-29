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
  **Still Superflat as of 2026-08-29** — briefly switched to Single
  Biome: Desert on 2026-08-20 for real terrain, reverted the same day
  ("wonky, doesn't suit the gameplay" per direct playtest feedback);
  `pack/kubejs/data/minecraft/dimension/overworld.json` forces vanilla's
  flat generator (confirmed directly in the file, not assumed). Desert
  research in `docs/IDEAS.md` is exploratory/parked, not current state.

## Mod list
- See [docs/MODS.md](MODS.md) — tracked per-mod as they're picked.
- **Wave campaign is now 8 waves (`FINAL_WAVE = 8` in
  `wave_status.js`), extended from the original 5 on 2026-08-29.** A
  hand-authored campaign (`pack/kubejs/server_scripts/wave_spawner.js`)
  replaced relying on Epic Siege Mod / Pure Suffering / TFTH's combined
  variety back on 2026-08-19 (too many mob types was noise, not
  signal). TFTH was re-added the same day and is folded directly into
  the wave roster from wave 2 on (not vanilla-only); waves 6-8 added
  2026-08-29 reuse previously-unused TFTH mobs rather than a new mod.
  Pure Suffering was removed 2026-08-20 as part of a footprint audit
  (was already dormant); Epic Siege Mod still applies its AI behavior
  to whatever the wave spawner summons — see `docs/MODS.md` under
  "Removed mods" for the removal reasoning and re-add paths.
- **SecurityCraft, FTB Quests, FTB Library, and FTB Teams are now
  installed and wired in (2026-08-29)** — SecurityCraft's reinforced
  blocks build the starter base's perimeter walls; FTB Quests hosts one
  quest ("Fortify") telling the player Tier 1 machines can be crafted.
  See `docs/MODS.md`'s respective entries for the full implementation
  and what's still unconfirmed in-game.
- **Atmosphere work (shaders, fog) was tried and deliberately rolled
  back, not an unexplained gap.** Oculus + Spooklementary (shaders) and
  YetGamer's Custom Fog were added 2026-08-20, tuned across many real
  rounds, then removed the same day on the user's own aesthetic verdict
  ("im just not feeling the whole shader feel now") rather than a bug.
  Night-lock during waves is the only atmosphere layer left standing —
  see `docs/MODS.md`'s "Atmosphere & Wave Feel" entry for the full
  history before re-proposing anything in this space.

## Current priority
**Playtest verification, not new content (as of 2026-08-29).** The
core loop now actually exists end to end: fixed spawn + prebuilt
starter base with a SecurityCraft-reinforced chokepoint perimeter, a
watchtower, an 8-wave campaign, loot bags, and Tier 1 defensive
machines (Wooden Palisade, Snare Trap, Spike Trap) to craft from that
loot. Most of this — the chokepoint walls, the watchtower, the Tier 1
machines, waves 6-8, the FTB Quests book, the wave-5 gear-removal
fix — was built the same day it's dated and has **not yet been
confirmed in a real playthrough**. See `docs/PLAYTESTING.md` for the
full test checklist; the bottleneck right now is playing it, not
building more.

CurseForge instance, Superflat world, on-demand wave triggering via the
Wave Horn item. `night_scaling.js` (mob stat scaling) stays parked in
`docs/deferred/` — the current escalation is coming from the
hand-authored wave campaign (each wave adds a tougher mob type) plus
Epic Siege Mod's AI, not mob stats — that job for now.

## Open questions
- (add things here as they come up)
