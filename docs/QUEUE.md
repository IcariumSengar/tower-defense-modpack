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

*(nothing queued right now — see "In progress" for the 2026-08-31
world-gen/structure-variety brief just sent)*

## In progress (already sent, not yet confirmed built)

- **Drop desert-only, world-gen mechanics** — built 2026-08-31,
  **user-confirmed fixed in-game** (see FEATURES.md's "World type"
  section for the full 4-crash saga and its lessons). Biome source
  `fixed` desert → curated `multi_noise` (7 biomes); floor depth raised
  from ~4 to 65 blocks; both new structure mods' and Treasure2's own
  spacing retuned. The world-gen mechanics themselves are done — see the
  next item for the follow-on aesthetic swap this same playtest
  surfaced.
- **Structure mod aesthetic swap** — built 2026-08-31 (see FEATURES.md's
  "Structure mod picks" for full detail). When Dungeons Arise and
  Structory: Towers removed, spacing overrides cleaned up. **Apocalypse
  structures: Abandoned city buildings** and **Abandoned Urban**
  installed — both real-verified (correct author/mod confirmed on
  CurseForge directly after Modrinth's search surfaced a different,
  wrong "Abandoned Urban" by a different author), both genuinely
  dependency-free, both confirmed grounded via real `.nbt`/structure-def
  inspection (no custom processor classes, no underground digging).
  Spacing retuned moderately (uniform 24/12 across all 11 structure_sets
  from both mods) rather than aggressively, per the race-condition
  lesson. Floor depth (65 blocks) and the 7-biome curation both left
  unchanged — rechecked with real tag data, still good coverage for the
  new mods, no reason to touch either. Verified in a real sandboxed boot
  with the actual relevant mod set this time (Radium + Treasure2
  included, not a minimal set) — clean, no crash patterns. Not yet
  confirmed in-game.

- **Amulet pedestal marker fix** — built 2026-08-31: root cause found
  (armor stand held items render at hand/shoulder height, not feet, so
  the marker was a full body-height too high), fixed with `Small:1b` +
  a lowered spawn height + a gentle bob via a throttled tick handler.
  **Height is a reasoned estimate, not pixel-verified** (vanilla's
  client jar is obfuscated at the raw level, unlike the Java mod jars
  this pack usually decompiles cleanly) — worth a visual confirm next
  playtest, same as everything else in this list.
- **Vanilla desert pyramids disabled** — built 2026-08-31: emptied
  `desert_pyramids.json`'s structure list, cleaned up the now-dead
  spacing override. Confirmed root cause along the way: this world's
  floor is only ~4 blocks thick (surface at y≈-60, world min_y=-64) —
  not a desert-specific problem, any underground-digging structure on
  this world risks the same wall. Directly relevant to the "drop desert,
  pick structure mods for variety" work below.

- **Base expansion: escalating growth curve** — built 2026-08-31 (see
  FEATURES.md's "Base expansion" entry): grows on every wave clear now,
  not every 2nd, by `20 + 5 * floor((waveNumber - 1) / 2)`. Not yet
  confirmed in-game.

- **The amulet** and the **Tier 1 chapter restructure** — both built
  2026-08-30 (see FEATURES.md's "The amulet" and "Quest book"
  sections), **not yet confirmed in-game**. This is the checkpoint the
  user asked to playtest before anything else lands on top of it.
- **World type rebuild** — built 2026-08-30 (see FEATURES.md's "World
  type" section): `noise` generator + custom `noise_settings` +
  `fixed` desert biome_source, replacing the confirmed-broken `flat`
  override. Needs a brand-new world to actually test, since world-gen
  changes don't retroactively apply to already-generated chunks.
- **Endless phase scaling (waves 9+)** — sent to build 2026-08-31 on
  direct request (Tier 2 stays on hold, this one specifically was pulled
  off hold and queued — see FEATURES.md's "Wave Horn" section for the
  full spec). Built on the **Undead Nights** mod's difficulty-level
  system (health/damage/speed/armor/horde-size scale factors per level,
  wave-number-mapped via `/undeadnights difficulty set <n>`), after
  ruling out Pure Suffering and DeceasedCraft and real-testing Undead
  Nights in a sandboxed server first. Fixed `distanceMax≈256` spawn band
  (its distance config doesn't hot-reload — confirmed by direct
  measurement, not assumed) instead of tracking the worldborder live;
  holds up to ~wave 95. New footprint: adds the Undead Nights mod. Three
  integration details that are required, not optional:
  `updateAttributesOfThirdPartyMobs: true` per level,
  `securityCraftCompatibility` enabled, and its commands need
  `execute as <player>` rather than the console source the rest of
  `wave_spawner.js` uses. Two required follow-on edits: `wave_status.js`'s
  display stops capping at `FINAL_WAVE`, and Quest 10's flavor text needs
  a rewrite (it currently describes a frozen repeat that stops being
  true — left for the user to redo in the diary voice, not for the build
  session to guess at). Not yet confirmed in-game.

## On hold — deliberately not queued right now

- **Machine progression, Tier 2** — fully specced (see FEATURES.md,
  "Defense" section, plus its own new Tier 2 quest chapter: Spark and
  Flame, Herd Them In, Waste Not, Wired for War, one per item, all
  gated on "Sharpened Scrap"). Fire Trap/Fan/Magnetic Chest all
  Trapcraft (already installed), Arrow Turret from a new install
  (Medieval Defense Turrets). **Held on direct request**: the user is
  low on tokens and wants to playtest the current build (amulet + Tier
  1 chapter restructure, both now landed — see "In progress" above)
  before anything else lands on top of it, to avoid stacking up more
  unverified changes than they can afford to debug right now. Don't
  start this until told otherwise — it was already ready to build, this
  isn't a design gap, purely a pacing call. Its Tier 1 chapter
  dependency ("Sharpened Scrap") is now satisfied.

## Not ready yet — needs fleshing out in IDEAS.md first

- Power system + Tier 3-4 machines — still just a tier sketch, blocked
  on nothing specific but not yet designed in enough detail to queue.
- Roguelike next-wave-composition choice — parked pending a GUI
  decision that was explicitly not pursued.
- **Base expansion into rooms/corridors (Schematicannon)** — mod
  question resolved 2026-08-30 (full Create installed, not the
  broken "standalone" re-upload — see FEATURES.md), but a harder,
  genuinely blocking dependency turned up in its place: a lootable
  `create:schematic` item only points at a `.nbt` file, which has to
  already exist in that world's `schematics/uploaded/` folder — and no
  such file exists yet. Needs at least one room hand-built in-game and
  exported via Schematic and Quill + Schematic Table before any loot
  injection or delivery-mechanism code can be written against something
  real. Not a coding-session task — pulled back out of "ready to build"
  until that exists.
