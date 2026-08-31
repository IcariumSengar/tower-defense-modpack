# Roadmap / Notes

High-level decisions and current priority. For the actual current
feature specs, see [docs/FEATURES.md](FEATURES.md); for what's next to
build, see [docs/QUEUE.md](QUEUE.md); for the mod-by-mod build log, see
[docs/MODS.md](MODS.md). This file stays intentionally short — it
shouldn't re-describe what those three already track.

**Rewritten 2026-09-01** — this file had drifted far out of date
(described a plains/desert Superflat world, an 8-wave-forever campaign,
no amulet, no Undead Nights, none of the structure-mod work). Trimmed
to standing decisions that don't change often, rather than a running
log of current state.

## Standing decisions

- **Guiding principle: keep footprint small.** Applies to anything
  proposed on this session's own initiative — default to the leaner
  option, call out footprint cost before suggesting something bulky,
  even if it's otherwise a good thematic fit.
- **Loader: Forge. Target: Minecraft 1.20.1.** Considered and
  deliberately deferred a jump to 1.21.1/NeoForge — see
  [docs/IDEAS.md](IDEAS.md)'s "Platform: future version bump" section
  for the full reasoning. Not being revisited until a dedicated
  migration project, at a proper checkpoint.
- **One pack, curated mods + glue** — not a from-scratch content mod.
  Glue for cross-mod compatibility/balance is written in KubeJS
  (`pack/kubejs/`). No custom Java mod is scaffolded.
- **Theme: tower defense with a Fallout-wasteland aesthetic**, not
  high fantasy. Reinforced directly by the 2026-08-31 structure-mod
  swap (fantasy towers/airships removed, abandoned-building mods added
  instead) — this is a real, tested preference now, not just an
  original pitch.
- **World is deliberately flat**, on a `noise` generator with a custom
  Y-only density function (structurally flat, not just tuned to look
  flat) rather than vanilla's `flat` type, which only ever supports one
  hardcoded biome. Real terrain was tried once early on and reverted
  same day ("wonky, doesn't suit the gameplay").
- **Mob targeting via `Mob#setTarget()`, no custom AI.** The amulet
  mechanic (drawing mob aggro to itself instead of the player) proved
  this pattern extends cleanly to "true tower defense" objectives
  without needing custom Java AI.

## Current priority

Playtesting the two most recent builds (endless-phase wave scaling,
the structure-mod aesthetic swap) — both shipped 2026-09-01, neither
confirmed by an actual playthrough yet. See QUEUE.md for exact status
of everything in flight.

Machine progression Tier 2 is fully specced and ready to build, held on
a pacing request from early in this pack's development that's likely
stale by now given how much has actually been played and iterated on
since — worth revisiting rather than assuming it should stay held
indefinitely.

## Open questions

See [docs/IDEAS.md](IDEAS.md)'s "Open questions carried over" section —
kept in one place rather than duplicated here.
