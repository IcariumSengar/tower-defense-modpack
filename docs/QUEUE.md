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

*(nothing queued right now — see "Diagnosed, pending a decision" below
for one real open item)*

## Diagnosed, pending a decision

- **"Reads as entirely desert" — real cause found, no fix queued yet**.
  Diagnosed 2026-08-31 (see FEATURES.md's "World type" section for the
  full investigation) by sampling the actual live save's real biome data,
  not a fresh test world. Verdict: not a biome_source bug — the fixed
  spawn point happens to land inside a large contiguous **badlands**
  blob (72.8% of a 320x320-block sample around spawn, 0% desert), which
  reads visually close enough to "desert" to explain the report.
  Biomes O' Plenty was also ruled out as a fix (TerraBlender's
  architecture doesn't compose with this pack's own hand-written
  `multi_noise` biome_source — reasoned from its docs, not decompiled).
  Real fix options, neither built: retune badlands' own parameter point
  so it claims less territory, or move the fixed spawn point to
  known-different terrain. Not queued since it's a real design choice
  (how much do you actually mind badlands-at-spawn, given it was always
  going to be one of 7 roughly-equal-weighted biomes) rather than an
  obvious bug fix — flag if you want it built.

## In progress (sent directly to the build session)

*(nothing in progress right now)*

## Built, awaiting your next playtest

- **"Last bastion, in disrepair" base redesign + amulet/pedestal
  reversal** — built and shipped 2026-08-31 (see FEATURES.md's "Starting
  base" and "The amulet" sections for the full spec). Watchpost walls
  now uneven (reinforcement concentrated at the gate, a genuinely weaker
  breached section on the back wall), gate dressed with cover props +
  a decorative spikes line, pedestal pre-placed in a shrine nook with
  grave markers, watchtower got battle-wear detail, and the previously
  unbuilt interior shack is now a real furnished room. Amulet is no
  longer starter gear — it has a real crafting recipe now, and the
  pedestal no longer gates on being crafted. Quest book updated to
  match (Basics 6.5/8.5 retasked). **Doomsday Decoration** + **Zcraft
  Decoration** installed. Verified via a live sandbox: every new block
  ID/blockstate individually confirmed placeable via RCON (caught and
  fixed 2 real "unknown block type" IDs that looked valid from
  blockstate files alone), script/quest reload clean with 0 errors. Not
  confirmed by an actual player spawn — the sandbox's mineflayer bot
  couldn't complete this mod set's FML handshake, so exact visual
  placement/spacing is unverified; expect at least one iteration round
  after your next look at it.
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
