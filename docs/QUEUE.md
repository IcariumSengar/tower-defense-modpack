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
redesign together. Sequenced 2026-09-01 (user-confirmed order). Phases
1, 2, and 4 are done (see "Built, awaiting your next playtest"); Phase 3
is partially done (structure loot fix shipped for one of two mods, see
below); Phase 5 not started:

3. Structure improvements, remaining — spawners in structures and
   Abandoned Urban's own missing-loot half (see below - deliberately
   not rushed given this pack's real jigsaw/structure-generation crash
   history).
5. Decoration polish last — lang-file fix is cheap and can happen any
   time, but placement/density reassessment waits until the user has
   actually seen the redesigned base in a fresh world.

- **Structure improvements, remaining (Phase 3)**:
  - **Treasure-chest loot — half fixed, real root cause found for
    both mods, not guessed**: `postapocalypse_structures`' own 3 chest
    loot tables (`chests/{food,trash,cobwebs}.json`, real standard
    vanilla-format tables, decompiled directly from the mod's jar) were
    genuinely low-value "wasteland junk" by the mod's own design - not
    a bug, just thin. Overridden via `pack/kubejs/data/
    postapocalypse_structures/loot_tables/chests/` to add a real
    treasure pool (gold/lapis_block/ender_pearl/diamond/emerald/
    redstone_block/obsidian/golden_apple) on top of the existing junk
    pool, not replacing it. Verified end-to-end: force-loaded a real
    chunk, rolled the tables via `/loot spawn` in a live sandbox, and
    directly confirmed the new items actually drop (a first attempt at
    this check produced a false negative - the check query didn't
    account for the item's fall trajectory from the spawn height, not
    a real bug - caught and fixed the check itself). **Abandoned
    Urban is a real, harder, separate problem, still open**: decompiled
    its 34 structure `.nbt` files directly - only ONE
    (`gas_station_loot.nbt`) has any chest at all (referencing vanilla's
    own real `minecraft:chests/simple_dungeon` table, genuinely decent
    loot), the other 33 have none. Real fix would mean either
    hand-editing NBT structure files (real corruption risk, no
    in-game way to verify blind) or adding a `processors` rule to the
    mod's own jigsaw template pool entries to probabilistically inject
    chests (and see below, spawners) into the existing pieces - the
    standard vanilla technique for this, but real, and this pack has a
    documented history of jigsaw/structure-generation crashes from
    exactly this kind of change (see FEATURES.md's "World type"
    section) - deliberately not rushed into the same session as
    everything else already shipped today.
  - Add spawners to structures for real danger - same underlying
    technique (structure processors) and same caution as Abandoned
    Urban's loot fix above - worth doing together once that's designed,
    not as two separate structure-generation changes.
- **Critical bugs, remaining**:
  - Endless phase (waves 9+): Wave Horn says "a horde has spawned" but
    nothing appears. **Root cause confirmed, real fix shipped, not yet
    playtested**: the live instance's actual `simulationDistance` is 12
    chunks (192 blocks, confirmed from `options.txt`) - the shipped
    `distanceMin`/`distanceMax` (240/256, chosen to spawn "beyond the
    worldborder," the same flawed border-relative reasoning the
    deterministic wave system's own spawn code had, since fixed) always
    exceeded that, so every horde spawn target landed in an unsimulated
    chunk and never ticked or became visible. Reverted to the mod's own
    real default (70/75, confirmed from the config's own comments) in
    both the tracked `defaultconfigs/undeadnights-server.toml` and
    directly in the live save's own runtime
    `serverconfig/undeadnights-server.toml` (SERVER-type Forge configs
    don't hot-reload - editing the per-save file directly is the
    correct, established technique for an already-created save, same
    as used earlier this session). Confidence basis: this exact 70/75
    value was already confirmed working in a real sandbox test during
    the original endless-phase build (see FEATURES.md's "Wave Horn"
    section) - not a fresh guess.
  - An unidentified mob that can turn invisible one-shot-killed the
    user - **investigated, no literal invisible mob found**. Read the
    real combat log directly: the player died 5 times total, 4 to
    "Flesh Suffer" and 1 to "Flesh Hunter Two," both real, already-known
    roster mobs - no unidentified or blank attacker anywhere in the log.
    Decompiled Flesh Suffer's own entity class looking for an
    invisibility ability: found a real retaliation effect instead (
    Slowness VI for 2 seconds, applied to whoever melee-attacks it,
    confirmed by decompiling vanilla's own `MobEffects.class` to
    identify the exact SRG field, not guessed) - not invisibility, but
    a real mechanic that could easily read as "got trapped and killed
    before I could react," which may be what got described as
    "invisible." Flesh Suffer's own real 25 attack damage is separately
    nerfed below - if the user still experiences a literal invisible
    attacker after that, it needs a fresh death with log access, not
    guessed at from this window's log alone.
- **Decoration quality**: placement itself read as "lame" — worth a
  look once visually confirmed, may need denser/more varied placement
  rather than a mod swap. (Chinese labels fixed, see "Built" below.)

## In progress (sent directly to the build session)

*(nothing in progress right now)*

## Built, awaiting your next playtest

- **Decoration lang fix (Phase 5, partial)** — built and shipped
  2026-09-01. Root cause confirmed, not guessed: Doomsday Decoration's
  own shipped `en_us.json` (its only language file) genuinely contains
  Chinese text despite the filename — Zcraft Decoration's own lang file
  was checked too and is fully correct English already, ruling it out.
  Overrode `pack/kubejs/assets/doomsday_decoration/lang/en_us.json` —
  had to include the mod's full 1152-key file, not just the 8 keys
  actually placed in this pack's base build, since a resource pack
  replaces a language file wholesale rather than merging per-key (a
  partial override would've blanked every other label to its raw
  key). The 8 real English translations
  (barrel/woodencrate/carton/carton_2/fixedgenerator/shelf/table/
  weaponbox): confirmed by direct 1:1 translation of the mod's own
  Chinese source text, not guessed. Placement/density reassessment
  (the other half of Phase 5) still waits on the user actually seeing
  the redesigned base in-game.
- **QOL mod batch (Phase 4) + Mob Dismemberment + The Lost City** —
  built and shipped 2026-09-01. All installed, sandbox-verified with a
  fresh-world boot (real jigsaw structure generation exercised, since
  Lost City is a new structure mod) before deploying live:
  - **Inventory Sorter**, **Controlling** (+ Searchables dependency),
    **Xaero's World Map**, **Waystones** (+ Balm dependency), **Crafting
    Station Improved** — all installed as specced, each independently
    re-verified against its real CurseForge page (author/downloads/
    dependencies) before installing.
  - **Zoomify substituted for Just Zoom** — the originally-requested
    "Zoomify" (isXander) turned out to have no Forge build at all (only
    Fabric/Quilt - confirmed directly via `packwiz`'s own version
    resolution failing, not assumed from a search result). Real
    substitute found via Modrinth (`Just Zoom` by Keksuccino, 9M+
    downloads, + its Konkrete dependency) - and its real default
    keybind, confirmed by decompiling the mod's own `KeyMappings.class`,
    is already **Z** (GLFW keycode 90), so the "rebind C to Z" ask
    turned out to need zero configuration.
  - **A new Basics quest** ("A Stone That Remembers," gated on quest 6
    same as "Not Just Jewelry") teaches waystone crafting - real item
    task against `waystones:waystone`, confirmed craftable from its own
    shipped recipe before writing the task.
  - **Mob Dismemberment [UNOFFICIAL MODERN PORT]** — installed
    (ThatSoulyGuy's port, confirmed real Forge 1.20.1 build; the
    well-known original by iChun has none). **Real bug caught in
    sandbox verification**: it's genuinely client-side only and crashes
    outright when loaded in a dedicated-server context (references a
    client-only vanilla class during common setup) - packwiz's
    CurseForge metadata had defaulted its `side` to `"both"`, which
    would be wrong; corrected to `"client"`. This pack's own live
    instance runs as an integrated singleplayer client (not a dedicated
    server), so this shouldn't affect actual play - flagged as a real
    methodology gap in this session's own dedicated-server sandbox
    testing, worth remembering for any other client-only mod added
    later.
  - **The Lost City** (+ Berezka's library dependency, confirmed
    unambiguous this time, matching the peer's re-verification) — all
    12 of its own `structure_set` files retuned to moderate spacing
    (matching this pack's established pattern for every other structure
    mod), except `infinity_city.json`, which uses a custom placement
    type this session doesn't yet understand well enough to safely
    retune - left at its shipped default, flagged rather than guessed
    at. Verified for real: a fresh sandbox world booted clean through
    actual jigsaw structure placement (the highest-risk phase, given
    this pack's crash history) and `/locate structure
    the_lost_city:city` found a real instance 112 blocks from a test
    point, confirming the retuned spacing is genuinely reachable within
    this pack's small bordered play area.
  Not yet confirmed by an actual player session — sandbox verification
  covers boot/generation stability and real block/structure placement,
  not gameplay feel.
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
  found on first actual wave-9 playtest, real fix shipped 2026-09-01**:
  see "Structure improvements, remaining" above for the full root-cause
  writeup (Undead Nights' spawn-distance config exceeded the live
  instance's real simulation distance). Not yet confirmed by an actual
  wave-9 playtest with the fix in place.
- **2026-09-01 playtest feedback batch, Phase 2 (balance tweaks)** —
  built and shipped 2026-09-01, all four items:
  - Gold drop rate: Fortified Cache's `gold_ingot` entry weight 15->30
    (now the single highest-weight item in that pool) and quantity
    2-4->4-6 - expected ~2.4 gold ingots per bag opened, was ~0.9.
  - Worldborder growth: `base_expansion.js`'s per-wave rate cut to
    roughly 43% of the previous curve (10+3*step instead of 20+5*step),
    same step-every-2-waves shape - ends at 166 blocks by wave 8
    instead of 270.
  - Flesh Suffer nerf: attack damage 25->12 via the same Attributes-NBT
    override technique already used for the ravager, at the mob's
    summon point in `wave_spawner.js`.
  - Basics chapter: "The Reckoning" and "No Turning Back" (the last 2
    quests) removed entirely from `basics.snbt` - confirmed nothing
    else depended on them before removing. Resolves the outstanding
    "Quest 10 flavor text needs a rewrite" item by removing the need
    for it. Sandbox-verified: chapter reload shows exactly 15 quests
    (was 17), matching the removal.
  - Also fixed in the same pass, not originally its own numbered item:
    the "hostiles remaining" counter (`wave_status.js`) and the Wave
    Horn's own re-use gate (`wave_spawner.js`'s `nearbyWaveMobCount`)
    both used to match nearby hostiles by type only, so a real vanilla
    mob from a nearby structure's spawner block (spawners bypass
    `doMobSpawning`) within the counting radius got miscounted as a
    wave mob. Both now require a persistent `td_wave_mob` tag, set at
    the actual summon point, for the deterministic 1-8-wave phase;
    endless-phase mobs (which can't carry this tag, coming from Undead
    Nights' own opaque `spawn_horde` command) fall back to the old
    type-only matching, a deliberate scope boundary, not an oversight.

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

- **Storage & power system** — fully specced 2026-09-01 (see
  FEATURES.md's "Defense" section, "Storage & power system" entry).
  **Sophisticated Storage** (+ required Sophisticated Core), **Refined
  Storage**, **Immersive Engineering** (power generation — also
  resolves the Tier 3 Tesla Coil candidate for free), and **Flux
  Networks** (wireless distribution) — four mods, real footprint (IE is
  a full standalone tech mod, the biggest single addition besides full
  Create). Real design decision made along the way: this becomes the
  pack's actual Tier 3-4 power system, not a separate storage-only
  addition. Three of the four mods' exact dependency lists weren't
  fetched directly from their own CurseForge relations pages (only
  Sophisticated Storage's was) — verify before installing, not assumed.
  **Deliberately parked, not sent to build** — queued behind the
  current 2026-09-01 playtest-feedback batch (13 items, 5 phases) so it
  doesn't add a fifth substantial project on top of what's already in
  flight. Send when that batch clears.
- **Hardcore mode** — fully specced 2026-09-01 (see FEATURES.md's new
  "Hardcore mode" section). Real permadeath (player death or pedestal
  destruction) softened by Totems of Undying, obtainable both as a rare
  boss-kill drop and via a new (vanilla has none) hard crafting recipe.
  Built fully custom via KubeJS, not vanilla's native Hardcore flag —
  confirmed that flag can't be turned on after world creation, no
  command/datapack path exists. Optional toggle, not the pack's new
  default — endless-phase scaling means every hardcore run eventually
  ends in death no matter how skilled the player is, which is fine for
  an opt-in but not as a forced default. Pedestal deliberately stays
  unhardened — defending it is meant to be real base-defense stakes,
  not background scenery. **Deliberately parked, not sent to build** —
  same reasoning as the storage/power system above, queued behind the
  current playtest batch rather than adding a sixth parallel project.
- **Defense-breaching enemies (Demolition Zombie)** — fully specced
  2026-09-01 (see FEATURES.md's new "Mob roster & defense-breaching
  threats" section). Introduces Undead Nights' own Demolition Zombie
  (already installed, currently unused) as a late-wave threat that can
  genuinely destroy the gate/watchtower/placed machines via real TNT —
  confirmed first that the reinforced perimeter walls themselves can
  never be the breach point (SecurityCraft's explosion immunity is
  unconditional, not tunable), so this targets what's actually
  vulnerable instead. User decided: also reinforce the gate (was left
  plain as "unnecessary complexity" before there was any real threat to
  it — that's now an accidental weak point, not an intentional one).
  Exact numbers (TNT count, spawn weight, introduction wave) still
  open. **Deliberately parked, not sent to build** — queued behind the
  current playtest batch, same as
  everything else above.
- **Mutants and Zombies (more zombie-family variety)** — fully specced
  2026-09-01 (see FEATURES.md's "Mob roster & defense-breaching
  threats" section, "More zombie-family variety" entry). 8 real
  zombie-family mobs (Zombie Brute, Crawler, Spitter, Blister Zombie,
  Split Head Zombie, Mutant Brute, Rotten Mutant, Mutant Zombie), same
  author as the already-trusted Undead Nights, confirmed to add no
  autonomous wave/horde systems of its own. One clean dependency
  (Advanced Wall Climber API, confirmed real Forge 1.20.1). Mutant
  Monsters (the more famous alternative) checked and ruled out — no
  Forge 1.20.1 build exists. Still needs: deciding which waves/hordes
  these mobs actually join, and any loot/stat re-recipe work, same
  treatment TFTH mobs got. **Deliberately parked, not sent to build** —
  queued behind the current playtest batch, same as everything else
  above.

## Not ready yet — needs fleshing out in IDEAS.md first
- Roguelike next-wave-composition choice — parked pending a GUI
  decision that was explicitly not pursued.
- **Base expansion into rooms/corridors (Schematicannon)** — mod
  question resolved (full Create installed), but a harder, genuinely
  blocking dependency remains: a lootable `create:schematic` item only
  points at a `.nbt` file, which has to already exist in that world's
  `schematics/uploaded/` folder — and none exists yet. Needs at least
  one room hand-built in-game and exported via Schematic and Quill +
  Schematic Table first. Not a coding-session task.
