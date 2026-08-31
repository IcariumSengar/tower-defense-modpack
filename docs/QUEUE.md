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

**2026-09-01 playtest feedback batch** — real extended playtest, first
one to exercise the endless-phase scaling, Tier 2, and the base
redesign together. See the full build brief sent to the build session
for exact detail; grouped here by category. Two items below are already
done — see "Built, awaiting your next playtest":

- **Critical bugs (investigate first, gameplay-breaking)**:
  - Endless phase (waves 9+): Wave Horn says "a horde has spawned" but
    nothing appears. **Confirmed NOT fixed by the spawn-positioning
    rewrite below** — that rewrite only touches the deterministic
    1-8-wave system's own spawn code; the endless-phase branch returns
    early and calls Undead Nights' own `spawn_horde` command directly,
    a completely separate code path untouched by this fix. Still needs
    its own diagnosis.
  - "Hostiles remaining" wave counter includes mobs elsewhere on the
    map (likely structure-spawned), not just wave mobs — needs scoping
    to wave-tagged mobs only. Real candidate fix identified while
    reading this code for the spawn-positioning rewrite:
    `wave_spawner.js`'s own staggered-spawn tick handler already tags
    each mob `td_justSpawned` for one tick (then clears it) — could add
    a second, persistent `td_wave_mob` tag at the same summon point and
    have both `nearbyWaveMobCount()` (this file) and `wave_status.js`'s
    counter filter on it instead of by type list. Doesn't obviously
    cover endless-phase mobs the same way, since those aren't summoned
    through this file's own code at all (see above) — needs a decision
    on whether that matters in practice (Undead Nights' hordes spawn
    240-256 blocks out, likely outside the 80-block counting radius
    until they close in) before implementing.
  - Structures generate with no real treasure-chest loot, only basic
    barrel contents — Treasure2's chest tiers not confirmed showing up
    in the newer structure mods, needs diagnosis.
  - An unidentified mob that can turn invisible one-shot-killed the
    user — needs identifying (check combat/death log) before it can be
    removed from whatever roster it's in.
- **Balance tweaks (clear direction, just needs numbers)**:
  - Gold drop rate too low to craft the amulet — increase it.
  - Worldborder growing too fast — reduce the per-wave escalation.
  - Flesh Suffer one-shots the player at wave 5 — nerf its attack
    damage (same technique as the ravager nerf), or move it later in
    the campaign.
  - Remove the last 2 Basics quests ("The Reckoning," "No Turning
    Back") — user finds them pointless. Conveniently resolves the
    already-flagged "Quest 10 flavor text needs a rewrite" item by
    removing the need for it.
- **Decoration quality**: some of the new decoration blocks show
  Chinese labels instead of English (likely an incomplete `en_us` lang
  file in Doomsday Decoration or Zcraft Decoration — fixable via a lang
  override). Placement itself also read as "lame" — worth a look once
  visually confirmed, may need denser/more varied placement rather than
  a mod swap.
- **New mod requests, researched 2026-09-01**:
  - **Inventory Sorter** (CurseForge, middle-click sort) — confirmed
    real, Forge 1.20.1.
  - **Controlling** (CurseForge, Jaredlll08, 390M+ downloads) —
    searchable/conflict-highlighting keybind menu, confirmed real,
    Forge 1.20.1.
  - **Xaero's World Map** (CurseForge) — fullscreen map, designed to
    pair with the already-installed Xaero's Minimap, confirmed real,
    Forge 1.20.1.
  - **Waystones + Balm** (CurseForge, BlayTheNinth) — re-adding what
    was removed in the original footprint audit, confirmed still real
    and current for Forge 1.20.1. Needs a new quest teaching the
    mechanic, per direct request.
  - **Zoomify** (CurseForge, isXander, 33M+ downloads) — confirmed
    real, Forge 1.20.1. Default keybind is C, not Z — fully
    configurable, just needs rebinding.
  - **Crafting table with adjacent-inventory pull** — NOT YET
    IDENTIFIED. Searched for a specific match to "remembers its
    inventory, pulls from an adjacent inventory to craft" — no
    confident match found (a mod called "Smart Crafting Table" looked
    promising by name but turned out Fabric-only, 1.19/1.12.2, wrong
    fit). Held until the exact mod is identified — asked the user for
    the name/source if they remember it.
  - **"Abandoned towns/cities" structure mod for cohesion** — candidate
    found: **The Lost City** (singular — distinct from "The Lost
    Cities," which was already ruled out for shipping its own chunk
    generator). Confirmed Forge 1.20.1, "small ruined buildings and old
    streets." **Real caution flag**: requires "Berezka library" as a
    dependency — same mod family whose unclear dependency chain
    (`berezka_api`) sank the earlier Abandoned Structures pick. This
    time the dependency is named unambiguously on the mod's own page
    (unlike the ~12-way-ambiguous situation before), but still needs
    the same real verification (exact version, confirm it's genuinely
    the general "Berezka's Library" core dependency and not another
    per-mod addon) before installing, not assumed safe just because the
    name is clearer this time.

## In progress (sent directly to the build session)

*(nothing in progress right now)*

## Built, awaiting your next playtest

- **Fixed spawn point moved off the badlands blob + wave-spawn
  positioning rewritten** — built 2026-09-01 (see FEATURES.md's "World
  type" section for the full spec). Spawn now targets `(780, -150)`,
  picked via real RCON biome checks (badlands 300-500+ blocks away
  there vs. 0 at the old spot) rather than guessed. Confirmed the base
  build/worldborder centering/"last bastion" redesign all derive from
  the same single coordinate, so they relocate together automatically.
  Also fixed the real related bug found while doing this: the
  deterministic 1-8-wave system's mob spawn distance was
  worldborder-relative, so it grew unboundedly with the border
  (270 blocks by wave 8 from growth alone, and the amulet's
  `BORDER_EXPAND_DELTA` sends it into the millions) — rewrote to a
  fixed 40-60 block player-relative distance instead. **This does NOT
  fix the separate "endless horde spawns but nothing appears" bug** —
  confirmed by reading the code that the endless-phase branch is a
  completely different path (Undead Nights' own `spawn_horde` command),
  untouched by this change; that bug still needs its own diagnosis, see
  the 2026-09-01 feedback batch above. Not yet confirmed by an actual
  wave playtest.
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
- **Endless phase scaling (waves 9+)** — built 2026-09-01, **real bug
  found on first actual wave-9 playtest**: Wave Horn reports "a horde
  has spawned" but nothing appears. See "2026-09-01 playtest feedback
  batch" above — needs investigation, not yet fixed. Quest 10 ("No
  Turning Back") is slated for removal per the same feedback batch,
  which resolves its outstanding flavor-text-rewrite need by removing
  it entirely.

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
