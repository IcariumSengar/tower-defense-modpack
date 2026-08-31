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

**Cleaned up 2026-09-01** — this file had accumulated stale entries for
things confirmed working, things superseded by later redesigns, and
a duplicate leftover from before the desert-drop rebuild. Trimmed to
reflect actual current status.

---

## Ready to build

1. **Pack decoration pass** — see FEATURES.md's "Base & structures"
   section, "Pack decoration pass" entry. Install **Doomsday
   Decoration** + **Zcraft Decoration** (both real-verified, no
   dependencies, pure decorative blocks — lowest-risk category of
   anything added to this pack so far), then pick real block IDs from
   each mod's registry and dress the Watchpost/watchtower via
   `/setblock`/`/fill` calls in `playtest_starter_kit.js`. Expect a
   visual-iteration round after the first pass, same as other cosmetic
   work in this pack.

## In progress (sent directly to the build session)

- **Biome variety investigation** — sent 2026-09-01, diagnosis only, not
  a build yet. Playtest reported the world reading as entirely desert
  despite the curated 7-biome `multi_noise` set being live — could be a
  real bug in the hand-assigned biome parameter-point placement (never
  verified against vanilla's real values, see FEATURES.md's "World
  type" section), or just unexplored territory. User also asked about
  adding Biomes O' Plenty for more variety — held pending the diagnosis,
  since BOP's TerraBlender integration compatibility with this pack's
  fully custom biome_source is a real open question, not confirmed
  either way. Not yet reported back.

## Built, awaiting your next playtest

- **Machine progression, Tier 2** — built and shipped 2026-08-31 (see
  FEATURES.md's "Machine progression, Tier 2" and its Tier 2 quest
  chapter for the full spec). Fire Trap/Fan/Magnetic Chest (Trapcraft)
  and Arrow Turret (new install: Medieval Defense Turrets) all
  re-recipied to pull from the Uncommon loot tier; its own 4-quest FTB
  Quests chapter shipped alongside. Verified via a full-mod-set sandbox
  boot (clean `Done`, 0 script errors, exact expected 17-quest count) —
  not yet seen in-game.
- **Endless phase scaling (waves 9+)** — built and shipped 2026-09-01
  (see FEATURES.md's "Wave Horn" section for the full spec). 40
  difficulty levels, 4 hordes built from this pack's own roster, verified
  against real spawned-entity attribute NBT (exact match to the
  formulas). Quest 10's flavor text still needs a rewrite — left for the
  user, not built by either Claude session. Needs an actual wave-9
  playtest to fully confirm.

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

## On hold — deliberately not queued right now

*(nothing on hold right now)*

## Not ready yet — needs fleshing out in IDEAS.md first

- Power system + Tier 3-4 machines — still just a tier sketch, blocked
  on nothing specific but not yet designed in enough detail to queue.
- Roguelike next-wave-composition choice — parked pending a GUI
  decision that was explicitly not pursued.
- **Base expansion into rooms/corridors (Schematicannon)** — mod
  question resolved (full Create installed), but a harder, genuinely
  blocking dependency remains: a lootable `create:schematic` item only
  points at a `.nbt` file, which has to already exist in that world's
  `schematics/uploaded/` folder — and none exists yet. Needs at least
  one room hand-built in-game and exported via Schematic and Quill +
  Schematic Table first. Not a coding-session task.
