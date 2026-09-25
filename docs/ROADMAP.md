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

**Updated 2026-09-16** — the previous "current priority" text here dated
to 2026-09-01 and was long stale (Tier 2/3/4 have all since been fully
built — see MODS.md). Machine progression is now complete through Tier 4
(Open Modular Turrets Reborn's Grenade/Rocket Turret, shipped
2026-09-15/16, still needs a real playtest confirmation). The actual
current priority is a real playtest pass: a real backlog of shipped-but-
unconfirmed work has built up (today's Tier 4 turrets, yesterday's Tesla
Coil/trap showcase polish, airdrop changes, Tier 2 cost trim, mine
player-safety fix, Culinary Generator power economy, structure loot
pass) — see QUEUE.md for the exact current list. Holding off on new
builds until that backlog gets a real session and actual feedback,
rather than continuing to build further ahead of what's been tested.

## Open questions

See [docs/IDEAS.md](IDEAS.md)'s "Open questions carried over" section —
kept in one place rather than duplicated here.
