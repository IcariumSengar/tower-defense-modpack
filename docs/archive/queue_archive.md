# Queue archive

Sections moved out of `docs/QUEUE.md` because they're explicitly closed
(superseded or resolved) in their own text — kept here verbatim, just
relocated, so the active doc stays focused on open work. Each moved
section left a one-line pointer at its original location in QUEUE.md.

---

## SUPERSEDED (same day) — "RESOLVED 2026-09-09 — 3-item world-gen regression from the previous batch"

Left for the record; its items 2 and 3 were wrong (a same-tick retry
cannot fix the marker race, and the complaint was structures too close
to the BASE, not to each other). Its working-tree edits were never
deployed to the live instance and are replaced by the entry above.

Direct live report the same day as the Red House swap + exclusion_zone
batch (58dd0bb): "world gen is broken" — slow boot with a visible fall
before the world loads, no starting base at all, and structures still
landing too close together. Diagnosed directly against the live
instance's own fresh `logs/latest.log` (a brand-new "New World" created
that session), not guessed. All 3 traced to real, distinct causes:

**1. Fall during boot.** The safety-hop `effect give @a
minecraft:slow_falling 10 0 true` in `playtest_starter_kit.js` only
covers 0.5s, on the assumption the biome search + spreadplayers landing
right after it is near-instant. This same boot's log shows that stretch
alone took ~32 real seconds (`findWastelandSpawn`'s ring search, up to
4000 blocks) inside one blocked server tick — confirmed by the server's
own "Can't keep up! Running 36276ms or 725 ticks behind" warning logged
right after. Since the whole handler runs in one tick, the *client's*
own local countdown of the 0.5s effect expires long before the server
tick actually completes, so the client's own gravity prediction resumes
normal-speed falling with no server packet yet arriving to correct it —
exactly "fall while the other world loads." Fixed: duration bumped
10 → 1200 ticks (60s, a real margin over the measured 36s worst case).

**2. No starting base.** Real crash, same boot's log:
`playtest_starter_kit.js#1226: TypeError: Cannot read property
"persistentData" from undefined` — `findWorldStateEntity(level)` came
back empty immediately after summoning the pedestal marker, under the
same heavy synchronous load as #1. This block ran *before* the Red
House placement, so the throw aborted the rest of the handler and the
house (`/place template postapocalypse_structures:red_house` + all its
interior fixups/loot removal) never ran — walls/pedestal/waystone were
already down, but no house. Fixed: moved the marker/pedestal-state block
to run *after* the house is fully placed (so a repeat only costs
targeting/HP, never the visible base), and added a real retry
(re-summon + re-query once) before giving up and logging an error
instead of throwing.

**3. Structures still too close.** The same batch's exclusion_zone fix
anchored all 29 retuned structure_sets against a new
`minecraft:ocean_monuments` override — an unrelated, sparse oceanic
structure with no bearing on the actual density-tier structures
colliding with each other. The same boot's log has real proof this did
nothing: `[Berezka API] structure the_lost_city:train ... is spawned
inside other structure the_lost_city:post`, `villages_city` inside
`big_city_structure`, and cross-mod overlaps
(`abandoned_structures:gas_station` inside `the_lost_city:roads`,
`the_lost_city:train` inside `abandoned_structures:house1`). Real root
cause: `the_lost_city:train.json` and `villages_city.json` were the only
2 of Lost City's 12 own structure_sets missing the `exclusion_zone`
their siblings already have against `the_lost_city:city`, and the
previous session's 900d52c density retune tightened `abandoned_structures`
etc. down to 28/14-chunk spacing without ever excluding them from Lost
City's own (deliberately untouched, still sprawling) city footprint.
Fixed: repointed all 29 files' `exclusion_zone.other_set` from
`minecraft:ocean_monuments` to `the_lost_city:city` (the structure
actually causing the collisions), added the same exclusion_zone to
`train.json`/`villages_city.json` to match their siblings, and deleted
the now-pointless `ocean_monuments.json` override (it also silently
changed vanilla ocean monument separation from 5 to 28 — reverted to
stock behavior as a side effect).

**Not yet playtest-confirmed** — fixed from real log evidence and
syntax-checked, but needs a fresh-world boot to verify the fall/base/
spacing symptoms are actually gone.

---

## RESOLVED 2026-09-09 — BountyBags TOML regeneration (was URGENT)

**Confirmed fixed, checked directly against the live instance - no
action needed.** `config/bountybags/*.toml` mtimes are now Sep 9 09:05
(not the stale Sep 3 this entry originally recorded), and all 5
previously-missing items are present: `uncommon_bag.toml` has
gold_nugget/netherrack/arrow/carrot/kubejs:shrapnel, rare/epic both have
kubejs:shrapnel, legendary has both kubejs:shrapnel and
minecraft:totem_of_undying. Someone already did the delete-and-restart
(or `/bountybags edit` restore-defaults) this fix called for, between
this entry being written and now - not this session, not verified who.
Worth a live playtest confirmation that drops actually happen at the
expected rates, but the loot-table content itself is confirmed current.
Original finding kept below for context.

**Original finding, 2026-09-09**: BountyBags loot-table edits since
2026-09-03 had never actually reached the live game. Found during the
full-mod-set merge
verification pass (Phase 0/1 + Track B + Track C + the multiplayer
shared-state fix, all booted together for the first time). Not a bug
in this pack's own scripts — a real, decompiled characteristic of the
installed BountyBags jar: `LootDefinitionStore.loadAll()` reads
`data/bountybags/loot_tables/items/*.json` into
`config/bountybags/<tier>_bag.toml` exactly once, the first time that
TOML file doesn't exist, and never again — every later boot reads only
the TOML, never the JSON. A prior session already hit this once (see
FEATURES.md's "Real bonus lesson" note) and patched the live
`legendary_bag.toml` directly for the totem_of_undying drop, but that
was a one-off, not a standing practice - checked the live CurseForge
instance's actual `config/bountybags/*.toml` directly on 2026-09-09:
every file's mtime is 2026-09-03, and `uncommon_bag.toml` is
confirmed missing gold_nugget, netherrack, arrow, carrot, AND the new
kubejs:shrapnel entry - five real additions across multiple sessions
that were each individually believed shipped and never actually were.

**Fix needed on the live instance (not something this session can do
per [[feedback_live_save_write_permission_boundary]])**: either delete
`config/bountybags/{uncommon,rare,epic,legendary}_bag.toml` (the 4
tiers this pack actually uses - dragon/warden/wither are unused, see
loot_bag_drops.js) so BountyBags regenerates them from the current JSON
on next boot, or have an op run `/bountybags edit <tier>` in game and
click Restore Defaults per tier (real command, decompiled and
confirmed - `admin.edit` permission or op status required). Either way
needs a real server restart/reload afterward and is worth a live
playtest check that shrapnel (and the older missing items) actually
drop now. Documented directly in `loot_bag_drops.js` and
`shrapnel.js`'s own headers so this stops being a one-time lesson that
doesn't generalize - check that comment before any future BountyBags
loot-table edit.

---

## Confirmed working (recent playtests)

- **Structure mod aesthetic swap** — **user-confirmed**: structure
  generation now reads as the intended abandoned aesthetic. When
  Dungeons Arise/Structory: Towers removed, Apocalypse structures:
  Abandoned city buildings + Abandoned Urban installed instead.
- World-gen: `multi_noise` biome source (7-biome curated set), raised
  floor depth, the whole 4-crash world-creation saga — **user-confirmed
  fixed**.
- The amulet + pedestal (worn buffs, border-crossing, marker
  alignment/bob fix) — exercised directly through real bug reports
  (marker misalignment, since fixed), so the core mechanic is proven
  working even though the marker height fix itself isn't pixel-verified.
- Vanilla desert pyramids disabled, Treasure2's mimic mechanic
  identified (not a bug, left undocumented on purpose).
- Base expansion's escalating growth curve — built, not separately
  confirmed by name, but the same worldborder machinery has been
  exercised repeatedly through the structure-reachability and world-gen
  playtests since.
