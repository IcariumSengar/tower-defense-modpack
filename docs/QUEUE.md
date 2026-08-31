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

*(nothing queued right now)*

## In progress (already sent, not yet confirmed built)

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
- **Endless phase scaling (waves 9+)** — fully specced 2026-08-30 (see
  FEATURES.md's "Wave Horn" section): separate count/toughness/speed
  formulas past wave 8, roster mix shifting toward existing elite mobs,
  generalizing the ravager's proven per-mob NBT stat override to every
  mob type. Investigated and ruled out handing this to Pure Suffering
  first (see the same section) before designing it custom. Two required
  follow-on edits bundled with it: `wave_status.js`'s display stops
  capping at `FINAL_WAVE`, and Quest 10's flavor text needs a rewrite
  (it currently describes a frozen repeat that stops being true). **Held
  for the same pacing reason as Tier 2 above** — not queued until the
  user has actually playtested the amulet/Tier 1/world-type rebuild
  that's already landed.

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
