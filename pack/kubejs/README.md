# KubeJS glue scripts

Data-driven "glue" for making the pack's mods play nicely together —
recipe bridges, tag merges, loot/progression tweaks — without editing any
other mod's code. Requires the KubeJS + Architectury API mods (see
[docs/MODS.md](../../docs/MODS.md)).

- `startup_scripts/` — runs once at game start, before recipes/loot exist.
  Best for tag additions/removals and registry-level changes.
- `server_scripts/` — recipes, loot table edits, server-side event
  handlers. Reloadable with `/kubejs reload server_scripts` (or `/reload`),
  no restart needed.
- `client_scripts/` — client-only tweaks: tooltips, JEI/REI hiding,
  particle/rendering tweaks.

See `server_scripts/example_glue.js` for the two most common patterns.
Delete or replace it once real glue scripts exist.

Docs: https://kubejs.com/
