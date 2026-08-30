# Build Queue

A simple lookup for the implementation session: what's actually ready
to build right now, in priority order. Each entry links to its full
spec in [FEATURES.md](FEATURES.md) rather than repeating it here — this
file only tracks *what's next and how ready it is*, not the design
itself.

**Lifecycle**: an idea starts raw in [IDEAS.md](IDEAS.md) → once it's a
real, fleshed-out design it moves into FEATURES.md marked *planned* →
if it's actually unblocked and ready to act on, it gets a line here →
whoever builds it flips the FEATURES.md entry to *live* and removes the
line from this file. Don't queue something that's still genuinely
unresolved (open forks, undecided mod picks) — flesh it out in
IDEAS.md/FEATURES.md first.

---

## Ready to build

1. **Base expansion into rooms/corridors** (Schematicannon) — see
   FEATURES.md, "Base & structures" section. Fully specced: mod choice
   made (standalone Schematicannon, not full Create), delivery
   mechanism decided (curated schematics found as loot, not
   player-scanned freeform). Two things to confirm as part of the build
   itself, not blockers to starting: a finished schematic's exact NBT
   shape for loot-table placement, and the material-check-then-place
   trigger (custom KubeJS glue either way).

## In progress (already sent, not yet confirmed built)

- **Structure generation / exploration content** (biome swap to flat+desert,
  Superflat Structures, YUNG's Better Desert Temples, Treasure2,
  Abandoned Structures) — sent 2026-08-20, see FEATURES.md's "Base &
  structures" section for the full plan.

## Not ready yet — needs fleshing out in IDEAS.md first

- The amulet (mob-attraction, buffs, border-crossing) — real idea, real
  mod candidates researched, but never turned into a concrete build
  brief.
- Power system + Tier 2-4 machines — depends on the amulet's machine
  buffs and each other; still just a tier sketch.
- Roguelike next-wave-composition choice — parked pending a GUI
  decision that was explicitly not pursued.
