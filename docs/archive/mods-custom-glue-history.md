# MODS: custom glue dead-systems history

Archived 2026-09-16 out of `docs/MODS.md`'s "Custom glue" section, to keep
that section focused on systems that are still part of the pack today.
Everything below is deep, blow-by-blow implementation narrative - research
trails, decompile findings, real bugs found and fixed, back-and-forth
iteration - for custom KubeJS systems that were later **fully replaced or
removed**: the original custom Tier 1 machines and the two full quest-book
generations that followed them, the shader/fog/darkness "Atmosphere & Wave
Feel" build-out, the original fixed-spawn/Single-Biome-Desert/Watchtower
starting-base experiments and their noise-generator rebuild, and the
Schematicannon/Create research. None of it describes how anything works
today - `docs/MODS.md`'s Mod List and Removed mods sections, and
`docs/FEATURES.md`, are the source of truth for current state. Each
section below is copied verbatim from `docs/MODS.md`, unedited; a short
pointer was left in that file's original location under the same heading
text, in case anything else in the repo cross-references these sections by
name.

---

- **Tier 1 machines — Spike Trap, Wooden Palisade, Simple Snare Trap
  (2026-08-29). ⚠ REPLACED THE SAME DAY — see "Tier 1 replaced with
  Trapcraft" below, this whole entry is history, not current state.**
  Direct playtest feedback on this custom design was "rubbish... they
  sucked"; `startup_scripts/machines.js` and the original
  `server_scripts/machine_recipes.js` were deleted entirely. Kept
  below for the research trail (the mod-replacement check in
  particular is still relevant — it's *why* a custom Spike Trap was
  ever built, not just how) — `docs/IDEAS.md`'s Machine Progression
  "Recommended next step" brief: no machines existed anywhere in the
  pack before this, despite being the actual "loot → craft machines →
  survive" loop the pack is named for. Built in the requested
  easiest-first order.
  **First time this pack has registered a custom block** — every prior
  piece of custom content (loot bags, Wave Horn) was an item. Researched
  KubeJS's real 1.20.1 block-registration API directly before writing
  anything (`.textureAll()`/`.texture()` reuse existing vanilla textures
  with zero new art needed, built-in block *types* like `fence` give
  real vanilla behavior for free, `Java.loadClass(...)` reaches
  arbitrary Minecraft/Forge classes for a custom blockstate property) —
  same "verify the mechanism, don't guess" discipline this pack has
  needed repeatedly (`/spreadplayers` on mobs, IPN's config keys, the
  worldborder blocking assumption).
  - **Wooden Palisade** (`startup_scripts/machines.js`) — KubeJS's
    built-in `fence` block type, textured with oak_log's own texture
    (not planks, for a "raw stakes" look) rather than reused vanilla
    `oak_fence` directly, so it has its own identity for future Tier
    1/2 balance work ("degrades from overuse" per the design notes).
    Gets real vanilla fence pathing-blocking/connecting behavior with
    zero custom logic — the lowest-risk piece, matching the brief's own
    assessment. Recipe: 4 oak_log + 2 cobblestone → 6
    (`server_scripts/machine_recipes.js`), both Common-tier
    (`loot_bag_open.js`'s two highest-weight rolls).
  - **Simple Snare Trap** — not a new block. The brief's own hedge
    ("check whether reskinned cobweb behavior gets most of the way
    there before building custom collision detection from scratch")
    resolved to: don't reskin it at all, just craft real vanilla
    `minecraft:cobweb` from string (4 string → 1), with a custom
    display name ("Snare Trap") via `Item.of(id, count, nbt)` recipe
    output NBT — the same technique already used for the starter gear's
    Lore line in `playtest_starter_kit.js`. Guarantees cobweb's actual
    slow/walk-through behavior exactly, zero risk of a reskinned
    version behaving subtly differently.
  - **Spike Trap** (`startup_scripts/machines.js`) — the genuinely
    novel piece, exactly as the brief predicted. Every other stateful
    mechanic in this pack lives on player `persistentData`; a block
    needing its *own* state (hit count, broken/intact) is new territory.
    Custom blockstate property `hits` (0-3) added via
    `IntegerProperty.create('hits', 0, 3)` (Java interop, not a KubeJS-
    specific helper). **Deliberately avoided reading that property's
    current value from script code at all** — genuinely unconfirmed
    whether/how that's possible in this KubeJS version, and the whole
    feature doesn't actually need it: the degrade sequence runs as a
    chain of `execute if block <pos> kubejs:spike_trap[hits=N] run
    setblock <pos> kubejs:spike_trap[hits=N+1]` commands (one per
    threshold, breaking the block entirely on the 4th hit) — standard
    vanilla conditional-command syntax, only one command in the chain
    can ever match the block's true state, so running all of them every
    trigger is harmless. Recipe: 2 iron_nugget + 6 cobblestone → 4 (the
    brief also suggested bone; iron_nugget alone made a clean "metal
    spikes" theme, bone left open for a future machine).

    **Trigger detection rebuilt (2026-08-29)** — direct pushback after
    the first writeup: "obviously it is meant to kill/harm mobs, is the
    design doc not clear enough?" The doc (`docs/IDEAS.md`'s Machine
    Progression list — Palisade "shape enemy pathing," Snare Trap
    "slow/briefly hold," Spike Traps right alongside them) was never
    ambiguous; the original implementation genuinely only checked the
    player (`PlayerEvents.tick` polling `player.getX/Y/Z()` against the
    block under their feet) — an implementation gap, not a docs
    problem. Rebuilt using a real KubeJS mechanism instead of a tick
    poll: `BlockBuilder` has a `.steppedOn(callback)` method ("Set what
    happens when an entity steps on the block" — confirmed by
    extracting and reading `BlockBuilder.class` directly out of the
    installed KubeJS jar, not assumed), chained onto the same builder
    that creates the block. It fires for *any* entity — player or mob —
    that steps on this specific block, with zero separate block-ID
    check needed since the callback is registered on the block itself.
    Old `server_scripts/spike_trap.js` deleted; everything now lives in
    `startup_scripts/machines.js`'s block registration.
    - **Per-trigger cooldown tracks BLOCK POSITION, not entity
      identity** — deliberate, not a shortcut. KubeJS's own
      `persistentData` is confirmed players/levels/servers only (its
      own wiki: kubejs.com/wiki/tips/persistent-data), not available on
      a generic mob; reliably telling "is this the same specific mob as
      last tick" apart from another of the same type standing nearby
      would need an entity UUID accessor never used or confirmed
      anywhere in this pack. A plain module-scope object keyed by
      `"x,y,z"` (same persists-for-the-server-session pattern already
      proven by `wave_spawner.js`'s `pendingSpawns` array) sidesteps
      that with only already-proven techniques. Tradeoff: two different
      entities stepping on the same trap within the same second only
      count as one trigger — a reasonable read for a trap that just
      went off, not a real gap.
    - Guards on `!entity.getServer()` (returns `null` client-side, since
      only the server has a `MinecraftServer`) rather than checking
      `level.isClientSide` — merely *accessing* that property is
      confirmed elsewhere in this pack to throw a `NullPointerException`
      outright, independent of how it's used.
    - Uses `var`, not `const`/`let`, inside the callback body — a
      never-before-used-in-this-pack callback type, and
      `ItemEvents.rightClicked`/`BlockEvents.rightClicked` both threw
      `"redeclaration of var X"` with block-scoped declarations on
      repeat invocations elsewhere in this pack. `var` until this
      callback type is specifically proven safe otherwise.
  - **Not confirmed in-game for any of the three.** Palisade is the
    safest bet (built-in vanilla block type, real behavior). Spike Trap
    is the least certain piece — specifically worth checking: the
    `IntegerProperty` blockstate actually registers and defaults to
    `hits=0` on placement (not assumed, KubeJS didn't document an
    explicit default-state setter), the `/execute if block` chain
    correctly advances/breaks the block across real hits, `.steppedOn`
    actually fires for a mob (not just the player, the entire point of
    this rebuild), and that it doesn't fire a second time client-side
    in some way the `getServer()` null-check doesn't catch.

  **Mod-replacement check (2026-08-29) — none found, custom Spike Trap
  stays.** Direct request, per this pack's standing preference for mods
  over custom code: checked whether an existing mod could replace the
  custom Spike Trap specifically (Palisade is just a themed fence,
  Snare Trap is already vanilla cobweb — neither needed checking). The
  actual bar was the Tier 1 design requirement itself — degrades and
  breaks after N hits — not just "deals damage," so a permanent spike
  block would be a mismatch, not a fit. Checked in the requested
  priority order, downloading and decompiling each mod's own jar rather
  than trusting marketing copy (same discipline as every other mod
  evaluated in this pack):
  - **Spiky Spikes** (real 1.20.1 Forge build, `v8.0.2`) — confirmed
    from its own `ServerConfig.class` and block/block-entity classes
    that its only configurable/tiered property is *damage per tier*
    (wooden through netherite). Zero durability, break, or degrade
    mechanic anywhere in the mod — it's built for permanent mob-farm
    fixtures (netherite tier is explicitly explosion-proof and
    wither-proof, the opposite of Tier 1's "cheap and breakable"
    intent). **Mismatch, not a fit**, exactly the failure mode the
    brief named as a real possibility.
  - **Simple Spikes** (Balm-based) — confirmed via CurseForge's own
    files list, filtered to 1.20.1, that **no 1.20.1 build exists at
    all** (only 1.18.2, 1.19.2, 1.21.1, 1.21.5 — it skips 1.20.1
    entirely). Ruled out on version availability alone, per the brief's
    explicit instruction to confirm this directly rather than assume
    it.
  - **Blade & Bastion** (CurseForge slug `base-defense`, real 1.20.1
    Forge build) — confirmed from its own class list and lang file
    that it has **no spike or trap block of any kind** — its actual
    scope is turrets and material generators, a bigger and differently-
    scoped base-defense system than what was being looked for.
  - **Defended Bases** (checked last, as instructed — 264 downloads,
    confirming the brief's "much less tested" characterization) — real
    1.20.1 Forge build, but its own lang file lists every block it adds
    (Barbed Wire, Damage Block, Landmine, Fire Trap, Electric Fence,
    etc.) and **none of them is a spike, nor does any of their
    MCreator-generated procedures implement a durability/break
    mechanic**. No darkness-effect content was found in this build
    either (the brief's other stated concern), but that's moot given
    there's no spike-equivalent block to weigh it against in the first
    place.
  - **Verdict: keep the custom Spike Trap as-is.** None of the four
    candidates has the degrade-and-break mechanic Tier 1 actually
    requires — three of the four don't have a spike-equivalent block at
    all, and the one that does (Simple Spikes) isn't available for this
    Minecraft version. Same precedent as the Wave Horn being custom
    mod-free out of necessity, not a failure to look — see
    `docs/IDEAS.md`'s Machine Progression section for the recorded
    decision.

  **Actual spike shape added (2026-08-29)**, direct follow-up feedback
  right after the mod-replacement check — the kept custom block was
  still visually just a plain textured cube, not spikes. True pointed
  geometry isn't achievable (Minecraft block models are rectangular
  boxes only, no real cone/pyramid tip), so this is a thin base plate
  plus 5 short square prongs of varying height clustered on top — reads
  as a "bed of nails"/caltrop rather than tall dramatic pikes.
  Deliberately kept short (max height 0.5 blocks): vanilla mobs only
  auto-step onto terrain shorter than 0.6 blocks without jumping, so
  taller spikes risked physically blocking mobs from ever walking onto
  the trap at all — turning a "step on it, take damage" mechanic into
  an accidental wall, the opposite of what Tier 1 needs. A taller,
  more dramatic version stays available for a possible future Tier 2
  "Reinforced Spikes" upgrade (already named in the Machine Progression
  notes) without this block needing to change.
  - Built via `BlockBuilder.box(x0,y0,z0,x1,y1,z1,true)` (0-16 unit
    scale), called repeatedly — confirmed from both
    `kubejs.com/wiki/ref/BlockBuilder` and `BlockBuilder.class` itself
    that each call adds one box to the shape (unioned via
    `Shapes.or(...)` for the final collision) rather than replacing the
    previous one. Existing `.texture()`/`.textureAll()` calls apply per
    face *direction* across every generated box, not per-box, so the
    spikes automatically pick up the same cobblestone/iron_block
    theming as the base with no extra texture work needed.
    `.fullBlock(false)` is set alongside — required per the wiki's own
    custom-shape guidance, otherwise the engine's light/face-culling
    against neighboring blocks assumes a full cube that no longer
    matches the real shape.
  - **Genuinely unconfirmed until an actual playtest, a real
    disagreement in the sources**: whether `.box()` alone drives both
    the collision shape *and* the visual model the way `BlockBuilder`'s
    bytecode suggests (it shares its `generateBlockModelJsons` method
    with block types that definitely auto-generate a matching visual),
    or whether KubeJS's own wiki text is right that `.box()` sets
    collision only and a hand-authored model JSON file is still needed
    for the block to actually *look* different from a cube. If the
    block still renders as a plain textured cube in-game despite this
    change, that's the wiki's claim confirmed correct, and a real
    custom model file is the next step — not more guessing at `.box()`
    alone.

---

- **FTB Quests — "Fortify," one quest telling the player traps exist
  (2026-08-29)** — `docs/IDEAS.md`'s "Decided: bring FTB Quests in now"
  brief. Tier 1 machines existed but nothing in the pack told the
  player they could be crafted; rather than waiting for the fuller
  Basics/Loot Tiers/Machines/Map Expansion/Shop chapter structure
  already planned in the "Quest book (FTB Quests) implementation plan"
  section (which stays exactly as-is), this ships the smallest possible
  slice that solves the actual problem — one quest, no dependencies, no
  chapter structure beyond what FTB Quests needs as a container.
  - **Mods installed**: FTB Quests (`2001.4.22`) plus its two mandatory
    dependencies, FTB Library (`2001.2.13`) and FTB Teams (`2001.3.2`) —
    confirmed directly from FTB Quests' own `mods.toml`, not guessed.
    Both satisfy the pack's existing Architectury API version.
  - **No dedicated SNBT-authoring tool/skill was actually available in
    this environment** — `docs/IDEAS.md` referenced one repeatedly but
    it couldn't be located anywhere (no project or user-level Claude
    Skill, nothing via tool search). Asked the user directly rather than
    guessing or silently hand-writing blind against the brief's own
    warning; a real public skill for this does exist
    (`github.com/ParticleG/ftb-quests`) but targets FTB Quests 1.21+, a
    real version mismatch against this pack's 1.20.1, and the user opted
    to hand-write it carefully instead of installing an unverified-fit
    third-party skill mid-task.
  - **SNBT hand-authored from real, verified sources, not guessed**:
    the mod's own `Quest`/`Chapter`/`ItemTask`/`QuestObjectBase` class
    files (extracted from the installed FTB Quests jar) confirmed real
    field names (`id`, `title`, `subtitle`, `description`, `icon`, `x`,
    `y`, `shape`, `size`, `tasks`, `rewards`, `dependencies`); actual
    shipped SNBT from a real, current modpack (`AllTheMods/ATM-10` and
    `EnigmaticaModpacks/Enigmatica6` on GitHub) confirmed the real
    syntax (no commas between same-level fields in the standard
    multi-line style, `d`-suffixed doubles, `description` as a string
    array, `icon`/`item` accepted as bare strings).
  - **Structure**: `config/ftbquests/quests/chapter_groups.snbt` (empty
    — no groups needed for one chapter), `data.snbt` (base file config,
    cloned from ATM-10's real defaults with the icon swapped),
    `chapters/tier1_machines.snbt` (one chapter, "Defenses," containing
    the single "Fortify" quest).
  - **The "any one of three items" requirement was the genuinely risky
    part.** FTB Quests' `ItemTask` checks exactly one item predicate per
    task (confirmed from the class file — no plural `items` array field
    exists there); the *official* documented way to let several
    alternative items satisfy one task is right-clicking it in-game and
    converting it to an **FTB Filter System tag filter**, which FTB's
    own docs say requires installing the separate FTB Filter System and
    FTB XMod Compat mods. Didn't want two more mods just for one quest
    (this pack's own standing "keep it lightweight" preference), so
    instead: tagged all three machines under one custom KubeJS item tag
    (`kubejs:tier1_machines`, added in `machine_recipes.js` — includes
    `minecraft:cobweb` since the Snare Trap is a renamed vanilla cobweb,
    safe here specifically because this Superflat world never generates
    the dungeons that are cobweb's only other vanilla source) and set
    the task's `item` field to the bare string `"#kubejs:tier1_machines"`,
    betting that FTB Quests' base ingredient parsing accepts a plain tag
    reference the same way vanilla recipe ingredients do, independent of
    the Filter System's GUI-driven conversion feature.

    **Bet confirmed wrong (2026-08-29) — and worse than "No valid
    items!", it hard-crashed the server on every launch.**
    `ItemTask.readData()` parses the `item` string directly into a
    `net.minecraft.resources.ResourceLocation`, which throws
    `ResourceLocationException` on the `#` character outright —
    `net.minecraft.ResourceLocationException: Non [a-z0-9_.-] character
    in namespace of location: #kubejs:tier1_machines`, thrown while FTB
    Quests loads its quest file on server start, before any world can
    load at all. Confirmed from two real crash reports, same stack
    trace both times. There genuinely is no plain-string tag syntax for
    an item task in this FTB Quests version — the GUI-driven Filter
    System conversion really is the only path, exactly as the official
    docs said and this bet doubted. **Fixed** by dropping the "any of
    three" idea entirely: the task now checks a single concrete item
    (`trapcraft:spikes`) via the same bare-ResourceLocation-string form
    already proven safe elsewhere in this pack's own quests. The now
    ex-unused `kubejs:tier1_machines` tag and `machine_tags.js` were
    deleted rather than left as dead code. If "any of N items" is
    wanted again later, the real options are unchanged: FTB Filter
    System + FTB XMod Compat, or N separate quests.
  - **Click-a-quest-item-to-view-its-JEI-recipe (2026-08-29)** — direct
    request after noticing this didn't work. `data.snbt`'s
    `default_quest_disable_jei: false` was already correctly set (not
    disabled), but that flag alone can't enable a bridge that doesn't
    exist — this feature is provided by a genuinely separate mod, **FTB
    XMod Compat**, confirmed from real bug reports of other users
    hitting exactly this ("click item in quest → view JEI recipe"
    silently not working) that trace to it being absent. Installed
    `2.1.2` (real 1.20.1 Forge build) — a clean, low-risk add: both its
    hard dependencies (FTB Library, Architectury) were already
    satisfied by what's installed, no new dependency chain at all, and
    it "does nothing by itself" per its own description, only bridging
    FTB Quests/JEI/KubeJS when it detects them present (all three
    already are). **Not yet confirmed in-game.**
  - **Auto-give-book: turned out to need zero configuration.** The
    brief assumed "a standard FTB Quests config option" for this exists
    — real research found the opposite: giving the book on first login
    is FTB Quests' unconditional default behavior with no toggle at all
    (confirmed both by an open, unresolved upstream feature request
    explicitly asking for a way to *disable* it, and by the complete
    absence of any book/login-related key anywhere in `data.snbt`'s
    real schema or the mod's own event-handler bytecode). Installing
    the three mods is the whole "config."
  - **Not yet confirmed in-game at all** — needs a fresh world to check
    the book is actually received, and crafting each of the three
    machines to check which (if any) actually completes the quest.

---

- **Tier 1 replaced with Trapcraft (2026-08-29)** — real playtest
  feedback on the custom Wooden Palisade/Snare Trap/Spike Trap was
  "rubbish... they sucked," a verdict on the whole custom
  craft-something-that-degrades-and-breaks design, not just the Spike
  Trap specifically. Relayed via the parallel "ideas hub" session
  (`docs/IDEAS.md`'s "Decided: replace Tier 1 altogether with
  Trapcraft" entry has the full mod-comparison reasoning); this side
  executed the actual removal/install/rewire.
  - **Deleted**: `startup_scripts/machines.js` (both custom block
    registrations) and the original `server_scripts/machine_recipes.js`
    entirely — no custom Tier 1 blocks exist in this pack anymore.
  - **Installed Trapcraft** (`2.10.2`, real Forge 1.20.1 build,
    standalone — no hard dependency beyond Forge/Minecraft, confirmed
    from its own `mods.toml`). Picked over **MineTraps** per the ideas
    hub's research: MineTraps' confirmed recent releases are
    1.21.x/NeoForge, no confirmed Forge 1.20.1 build.
  - **Which Trapcraft blocks actually count as Tier 1, and why the
    others don't** — checked every one of Trapcraft's own bundled
    recipe JSONs directly (`data/trapcraft/recipes/*.json` inside the
    jar) rather than trusting the store description, specifically for
    the thing that matters most for Tier 1: does it need power/fuel.
    - `trapcraft:spikes` (5x iron_ingot) and `trapcraft:bear_trap`
      (iron_ingot + stone_pressure_plate) — both 100% vanilla materials,
      no redstone anywhere in the recipe or in how the block operates.
      Real Tier 1 fits, used as-is with no KubeJS re-recipe — the
      brief's own instruction was to only re-recipe if defaults use
      non-vanilla materials, and these don't.
    - `trapcraft:fan`, `trapcraft:igniter`, `trapcraft:magnetic_chest`
      — `igniter` and `magnetic_chest` both have redstone as a crafting
      ingredient; `fan` has no redstone in its recipe but (per the
      mod's own description) needs a redstone *signal* to actually
      function. All three fail Tier 1's no-power/no-fuel rule and were
      deliberately left out of the `kubejs:tier1_machines` tag and out
      of this pack entirely for now — real Trapcraft content, just not
      wired into anything yet, a natural Tier 2/3 candidate later.
  - **No mod replaces the Wooden Palisade's role** — Trapcraft has no
    wall/fence-shaping block at all, and neither of the other two
    candidates checked in the earlier mod-replacement pass did either.
    Rather than force a mismatched substitute, the Palisade's function
    is now just plain vanilla `minecraft:oak_fence` — already
    100%-vanilla-craftable from `oak_log` (Common-tier loot) via real
    vanilla recipes (`oak_planks` → `oak_fence`), needing zero new code
    at all. This is arguably a *more* complete "ditch the custom
    design" outcome for that piece than installing a mod would have
    been.
  - **`kubejs:tier1_machines` item tag** (was in
    `server_scripts/machine_tags.js`, replacing the old
    `machine_recipes.js`'s tag block) updated to
    `trapcraft:spikes`/`trapcraft:bear_trap`/`minecraft:oak_fence` —
    the FTB Quests "Fortify" quest's item task already checked this tag
    rather than hardcoded item IDs, so the quest itself didn't need
    restructuring, just the tag contents and its icon/flavor text
    (`config/ftbquests/quests/chapters/tier1_machines.snbt`,
    `data.snbt`) swapped from `kubejs:spike_trap` to
    `trapcraft:spikes`.

    **This crashed the server on every launch (2026-08-29, caught from
    real crash reports, not a playtest)** — see the original Fortify
    entry above for the full stack trace and root cause
    (`ItemTask.readData()` rejects `#` in the `item` string outright,
    it's not valid tag syntax for this task type at all). Fixed by
    dropping "any of 3" and checking `trapcraft:spikes` specifically;
    `machine_tags.js` and the tag itself were deleted since nothing
    else used them.
  - **Not yet confirmed in-game** — needs a real playtest, and per the
    brief's own framing, specifically for *feel*, not just whether the
    quest completes — this is replacing something that already failed
    on feel once.

---

- **FTB Quests "Basics" chapter — 10-quest intro chain (2026-08-29)**,
  drafted by the parallel "ideas hub" session (full brief with exact
  flavor text in `docs/IDEAS.md`'s "Basics quest chapter" entry) and
  built here. `config/ftbquests/quests/chapters/basics.snbt`, a linear
  1→10 dependency chain (each quest's `dependencies` points at the
  previous quest's ID) covering the starter-gear narrative, the Wave
  Horn, a kill task, opening a loot bag, and closing with the wave-8
  endurance-run framing.
  - **"Fortify" folds in as step 7, not rebuilt** — added
    `dependencies: ["538A1BBC9A1B8EAC"]` (quest 6, "Open It") to the
    existing quest in `tier1_machines.snbt` rather than moving or
    recreating it. FTB Quests dependencies reference a quest by ID
    regardless of which chapter it physically lives in — confirmed real
    or standard practice, not assumed, from decompiling
    `Quest.class`/`Chapter.class` earlier and cross-checking against
    real cross-chapter-dependency modpacks. Quest 8 ("Watch the Walls
    Grow") depends on Fortify's own existing ID the same way.
    `tier1_machines.snbt`'s `order_index` bumped from 0 to 1 so
    "Basics" (now `order_index: 0`) shows first in the chapter list.
  - **Task types used beyond the ones "Fortify" already proved**: a
    `"kill"` task (quest 4, `entity: "minecraft:zombie", value: 5L`)
    and an `"xp_levels"` reward type (distinct from the plain `"xp"`
    raw-points reward Fortify itself uses) — both confirmed from the
    same real-source research as Fortify's own SNBT (the mod's actual
    task classes plus real shipped quest examples), not guessed fresh.
  - **Quest 9 ("The Reckoning") is deliberately just a plain checkmark
    task**, per the brief's own explicit note: FTB Quests has no
    native "wave number reached" trigger, and wiring KubeJS to
    auto-complete it the moment wave-5 gear removal fires would be real
    additional integration work, not assumed as in scope here. The
    player marks it manually after experiencing that moment in-game.
  - **Icons** reuse existing vanilla items (`netherite_sword`, `clock`,
    `zombie_head`, `chest`, `map`, `wither_skeleton_skull`,
    `totem_of_undying`) or the pack's own existing custom items
    (`kubejs:wave_horn`, `kubejs:scavengers_bag`) — no new art, same
    discipline as every other custom content this session.
  - **Not yet confirmed in-game** — same caveat as the rest of this
    quest book; specifically worth checking that the dependency chain
    actually locks/unlocks in order, and that the cross-chapter
    dependency into "Fortify" (and out of it, to quest 8) actually
    displays/functions correctly rather than just being inert SNBT.

  **Flavor text rewrite (2026-08-30)** — direct feedback on the first
  pass ("it's all very basic at the moment"). All 10 descriptions
  replaced with a found-diary voice matching the wave-5 gear-removal
  text's established tone ("the blade and armor crumble to rust and
  dust in your hands..."), drafted by the ideas-hub session and
  applied here verbatim — same quest IDs, dependencies, task types, and
  rewards, description text only. Also applied the offered (marked
  optional) rewrite to "Fortify" itself for tonal consistency across
  the chain, rather than leaving one quest sounding flatter than its
  neighbors — its new text happens to read more accurately too, now
  that the task checks `trapcraft:spikes` specifically rather than
  "any of three" (see the crash-fix entry above).

---

- **Atmosphere & Wave Feel (2026-08-20)** — the `docs/IDEAS.md`
  "Atmosphere & Wave Feel" (locked) section, built out in full the same
  day it was picked up.
  - **Shader pack**: **Oculus** (Iris-for-Forge loader) + **Spooklementary**
    (shader pack) — see the mod table entries above for the comparison
    against Hysteria Shaders and Gravemist. Just "installed and
    loadable" — shaders have no live scriptable API, so none of the
    day/night contrast logic runs through the shader itself.
  - **Day/night density contrast**: solved a different way than the
    design doc assumed. `docs/IDEAS.md` named Foggy Border and Fog
    (IMB11) for the fog-wall/ambient-fog layers — **neither has any
    Forge build, confirmed directly via Modrinth's version API** (not
    search-engine summaries, which were actively misleading for Foggy
    Border specifically — claimed "available for 1.20.1" with no loader
    caveat, when the real data shows Fabric-only, full stop). Found
    **YetGamer's Custom Fog** instead — real Forge 1.20.1 build, no
    dependencies, ships a genuine `/fog` runtime command. `wave_spawner.js`'s
    `useWaveHorn` now sets dense/close/desaturated fog
    (`fog @a set 8 32 25 25 30 0.3 cylinder`) alongside the existing
    night lock; `wave_status.js`'s wave-cleared branch resets it
    (`fog @a reset`) alongside the existing day restore — same pairing,
    same trigger points, one new command each side. Honest limit: this
    fog is always player-relative, not tied to a fixed world coordinate,
    so it delivers the "close and oppressive during a wave, pulls back
    when safe" tension the design doc actually wants, not a fog wall
    literally rendered at the worldborder's position — no Forge 1.20.1
    mod found can do that.
  - **Staggered emergence + sound-first cues** (`wave_spawner.js`):
    `docs/IDEAS.md` claimed staggered emergence already existed via
    "delayed/scheduled spawns" — checked directly, it didn't; every mob
    in a wave summoned synchronously in one loop. Built as a
    `pendingSpawns` queue processed by a new `PlayerEvents.tick` handler
    (same pattern already proven reliable in `wave_status.js`/
    `mob_aggro.js`, not a new scheduling API) — each queued mob gets a
    spawn tick and a sound-cue tick (`SOUND_LEAD_TICKS = 12`, ~0.6s)
    ahead of it, played via positioned `/playsound` (not
    `player.playSound()`, which is player-relative and wouldn't be
    positioned where the mob is about to appear) using
    `minecraft:ambient.cave` — a generic eerie one-shot, not per-mob,
    since TFTH's own sound event registry names weren't verified.
    **Escalation lever**: the gap between each mob's emergence
    (`staggerGapForWave`) shrinks from 16 ticks at wave 1 down to a
    4-tick floor by wave 5, so early waves stay readable and late waves
    collapse into the "false security" wave-dump the Balance Philosophy
    section describes. Also fixed a real edge case this introduced: the
    horn's re-use guard now also checks `pendingSpawns.length > 0`, not
    just nearby-mob-count — without that, spam-clicking the horn during
    the staggered emergence window could queue a second wave on top of
    the first before any of its mobs actually existed yet to be counted.
  - **Not built**: silhouette-first (the design doc calls this "mostly a
    function of fog density," which is now in place via the /fog
    command above, so likely already partially achieved without
    dedicated code — not separately verified).

  **First real relaunch, three issues found (2026-08-20)**:
  1. **Shader wasn't guaranteed to be active by default.** `enableShaders`/
     `shaderPack` in Iris/Oculus's `config/oculus.properties` weren't
     pinned by the pack — left to whatever Oculus does on first launch
     with exactly one shaderpack present (it did end up active, but
     nothing guaranteed that for a fresh install). Fixed by tracking
     `pack/config/oculus.properties` with `shaderPack=Spooklementary_v2.0.4.zip`
     and `enableShaders=true` baked in, same pattern as the other
     pre-seeded configs in this pack.
  2. **Too dark during the day.** First pass checked Spooklementary's
     shader source and found the day-specific intensity sliders
     (`LIGHT_MORNING_I`, `ATM_MORNING_I`, `LIGHT_NOON_I`, `ATM_NOON_I`,
     default neutral `1.00`) and bumped them to `1.60` via a settings
     override — user reported still dark after relaunch. **Real root
     cause found in `logs/latest.log` (2026-08-20)**: v2.0.4 throws
     `java.lang.RuntimeException: Unknown variable: BIOME_PALE_GARDEN`
     during `IrisRenderingPipeline`/`CustomUniforms` creation (recurred
     4x in one session) — `BIOME_PALE_GARDEN` doesn't exist until MC
     1.21.4, so this pack's 1.20.1 biome registry can't resolve it,
     and the custom-uniforms pipeline (which computes the shader's
     lighting/atmosphere values) fails to fully initialize. No amount of
     slider tuning fixes a pipeline throwing on startup. **Downgraded to
     Spooklementary v1.1** (Oct 2023, predates the Pale Garden biome
     entirely — confirmed via source, zero `BIOME_PALE_GARDEN`
     references) — pipeline confirmed clean after this (no more crash in
     `logs/latest.log`).

     **Still reported too dark after that (2026-08-20), confirmed during
     the peaceful daytime gap specifically, not misattributed to the
     intentionally-dark wave-time fog** — ruled that out directly with
     the user before doing anything else. The per-shaderpack settings
     override file (`shaderpacks/<name>.txt`, the standard Iris
     mechanism — an exported/imported `.txt` sitting next to the
     shaderpack zip) couldn't be confirmed as actually auto-loading on
     startup after two rounds of tuning through it; Iris's own docs only
     confirm an explicit in-game Import button, not automatic loading,
     and no independent evidence turned up that it also loads
     automatically. Rather than keep guessing at an unconfirmed
     mechanism, **switched to editing the shader's own `.glsl` defaults
     directly** — these are unconditionally read on every shader load,
     no external-file dependency to doubt. Extracted v1.1, changed
     `LIGHT_MORNING_I`/`ATM_MORNING_I`/`LIGHT_NOON_I`/`ATM_NOON_I` from
     `1.00` to their defined maximum `2.00`, applied `profile.LOW`'s
     quality values the same way, repackaged as
     `Spooklementary_TDM_tuned.zip`. This is no longer a byte-identical
     upstream download — tracked as a real file in `pack/shaderpacks/`
     instead of a `.pw.toml` pointing at a Modrinth URL, since the url+hash
     pairing packwiz relies on can't describe a locally-modified file.
     The old `shaderpacks/Spooklementary_1.1.txt` override and
     `spooklementary.pw.toml` metadata are both removed — superseded by
     the baked-in defaults.
  3. **Worldborder still renders as vanilla's blue line/red vignette,
     not fog.** No Forge 1.20.1 *mod* exists for this — checked four
     candidates across Modrinth's API directly: Foggy Border
     (Fabric-only), Fog by IMB11 (Fabric/NeoForge-only, 1.21+ anyway),
     **Worldborder Tweaks** (its own description offers exactly this —
     "hide the worldborder barrier" — but Fabric-only, no Forge build
     for any MC version), **No Worldborder Tint** (does have Forge
     builds, but only removes the red vignette tint, not the barrier
     texture, and even that mod's Forge support skips straight from
     1.8.9 to 1.20.6 — no 1.20.1 build).

     **Solved a different way (2026-08-20): a resource pack texture
     override, not a mod.** The border's rendered wall is just a plain
     16x16 texture, `assets/minecraft/textures/misc/forcefield.png`
     (confirmed by extracting it from the actual vanilla 1.20.1 client
     jar) — grayscale, tinted blue/green/red by game code for
     stationary/expanding/shrinking border state. That tint color isn't
     resource-pack-overridable (it's a Java-side color multiply), but
     the *pattern* is just pixels, and vanilla's own pattern is a sharp
     diagonal-stripe grid — the actual source of "jarring," not the blue
     tint itself. Replaced it with a soft, smoothly-interpolated
     cloud-like alpha pattern (`kubejs/assets/minecraft/textures/misc/forcefield.png`,
     same KubeJS resource-pack-injection mechanism already used for the
     Wave Horn and loot bag textures, just targeting the `minecraft`
     namespace this time to override vanilla instead of adding new
     content) — same tinting behavior, but reads as drifting mist
     instead of a sci-fi forcefield grid. Not literally volumetric fog
     rendered at the border's world position, and the texture alone
     wasn't a strong enough effect on its own for what the user actually
     wanted.

     **Real fix (2026-08-20): `pack/kubejs/server_scripts/border_fog.js`.**
     A texture is still just a flat wall — it can't get denser as the
     player approaches the way actual atmospheric fog does. But
     YetGamer's Custom Fog's `/fog` command *is* real, scriptable,
     distance-based fog, and we already control it. New script runs on a
     5-tick throttle, computes the player's actual distance to the
     nearest worldborder edge (`level.getWorldBorder()`, same accessor
     `wave_spawner.js` already uses for spawn clamping — border treated
     as a square, matching vanilla's real shape, not a circle), and
     scales the fog's `MaxDistance` continuously from `200` (barely
     noticeable near the center) down to `20` (thick, close) as the
     player nears the last 40 blocks before the edge — a genuine "the
     world fogs up as you approach the boundary" effect, not a static
     look. Deliberately does nothing while a wave is active
     (`td_inWave`) so it never fights `wave_spawner.js`'s already-tuned
     combat fog for control of the same command — resets its own change
     -detection cache every in-wave tick so the first peacetime tick
     after a wave clears always re-applies fresh rather than skipping
     because the computed value happens to match a stale cache from
     before the wave. This is the piece that actually delivers "look
     like actual fog" — the texture override above is a smaller,
     complementary improvement to the wall's static appearance, not the
     primary fix.
  4. **Still "far too dark" on both day AND night (2026-08-20)** — this
     changed the diagnosis. The day-specific sliders were already maxed
     at their defined ceiling (`2.00`) and guaranteed to apply (baked
     directly into the `.glsl`), so if day was still dark, those sliders
     were never the dominant factor — and "night too dark" ruled out the
     day/night-specific atmosphere multipliers entirely, since none of
     them were touched for night. Found the real lever: `T_EXPOSURE`
     (`shaders/lib/common.glsl`), labeled directly in the shader's own
     `en_US.lang` file as **"General Brightness"** — "adjusts the
     overall brightness of the whole image," day/night-agnostic. Default
     `1.40`; v1.1 uses this name where v2.0.4 used `TM_EXPOSURE`, which
     is exactly why earlier searches for the v2.0.4 variable name missed
     it in v1.1's source. Bumped to `2.60` (near its defined max `2.80`)
     plus `AMBIENT_MULT` (ambient light, also day/night-agnostic) `100`
     â†’ `170`, both baked directly into `Spooklementary_TDM_tuned.zip`
     alongside the earlier fixes.
  5. **Fog command was spamming chat** — YetGamer's Custom Fog prints
     its own confirmation message on every `/fog` call by default; fine
     for one manual command, but `border_fog.js` calls it up to
     4x/second while the player moves near the border. The mod's own
     documentation ties this to vanilla's `sendCommandFeedback`
     gamerule — silenced via `ServerEvents.loaded` in `border_fog.js`
     (fires once per server start regardless of save, unlike
     `playtest_starter_kit.js`'s first-join-only gate, so it takes
     effect on the next relaunch even for an already-started save).
     Harmless for every other command in this pack too, since they're
     all run via `runCommandSilent` and never relied on seeing vanilla
     feedback.
  6. **Day confirmed fixed (2026-08-20) — but shadows far too dark and
     night still way too dark.** Two more, more specific findings:
     - **Shadows**: the shader's own `.lang` file directly warns that
       `SHADOW_QUALITY`'s lowest tier ("Very Low", `0` — what the
       performance pass had set it to) "significantly downgrades
       shadows in multiple ways," not just resolution. Raised one tier
       to `1` ("Low") — a real, documented tradeoff between the
       performance ask and the shadow-harshness complaint, not a free
       fix. Also raised `MINIMUM_LIGHT_MODE` ("Cave Lighting" per its
       `.lang` entry — fill light for shadow-starved/no-skylight areas)
       from `2` (Default, which the shader's own comment says defers to
       the player's personal in-game Brightness slider) to `4` ("Very
       Bright") so shadow relief doesn't depend on a setting the pack
       can't control.
     - **Night**: `LIGHT_NIGHT_I`/`ATM_NIGHT_I` had been deliberately
       left untouched through every previous round, on the assumption
       night should stay moody by design. Two explicit "too dark"
       reports specifically calling out night (not just day) made clear
       that assumption was wrong — bumped both to their defined max
       `2.00`, same as morning/noon.
     All three baked into `Spooklementary_TDM_tuned.zip` alongside the
     earlier fixes.
  7. **Overcorrected — "shadow is like a bright white light"
     (2026-08-20).** Multiple brightness boosts got stacked across
     rounds 4-6 without ever pulling any back once a new one got added.
     Pulled back the two most directly tied to *shadow* brightness
     specifically (as opposed to overall scene exposure, which is
     `T_EXPOSURE` and confirmed correct for day — left alone):
     `AMBIENT_MULT` (ambient fill light, which by definition reaches
     areas not hit by direct light — i.e. shadows) `170` â†’ `110`, and
     `MINIMUM_LIGHT_MODE` (added in round 6 at its most aggressive tier
     the same round this broke) `4` â†’ `3`. Both still baked into
     `Spooklementary_TDM_tuned.zip`.

  **Lesson for this specific shader-tuning saga**: stop pushing
  individual sliders further without reconsidering earlier ones in the
  same pass — the "still dark" â†’ "now too bright" whiplash across
  rounds 4-7 came from treating each report as isolated instead of
  looking at the cumulative effect of every change made so far.

  8. **Stopped guessing, pulled real reference values (2026-08-20)** —
     user's explicit push after round 7's whiplash: "look at other
     modpacks' shader settings and get it right" rather than continuing
     to hand-tune blind. Two real findings, not more guessing:
     - Base Complementary Shaders (the engine Spooklementary re-skins)
       uses different variable names/scales entirely depending on
       branch (`TONEMAP_EXPOSURE=5.6` in one official repo, a
       completely different numeric scale than Spooklementary's
       `T_EXPOSURE` 0.4â€“2.8 range) — confirms these can't be copied
       across shader forks directly, only within the exact fork being
       used.
     - Found genuine, shader-specific community guidance instead:
       **"disable real-time shadows, since the sky is so cloudy with
       this shader that shadows can look a bit odd and out of place."**
       Not generic advice — specific to Spooklementary's own foggy
       aesthetic, and directly explains why shadow-quality tuning kept
       fighting itself across rounds 6-7. Disabled `REALTIME_SHADOWS`
       entirely (a single toggle the shader's own docs confirm cleanly
       cascades — "will stop other shadow options from doing anything"
       — costs nothing since `LIGHTSHAFT_QUALI_DEFINE` was already `0`)
       rather than continuing to tune `SHADOW_QUALITY` up and down.
       Also found a community-sourced reference pair for Complementary's
       tonemap curve (`Lower:1.3, Upper:1.5`) specifically for
       brightening dark/shadowed areas without blowing out highlights —
       applied directly (`T_LOWER_CURVE` `1.20`â†’`1.30`,
       `T_UPPER_CURVE` `1.30`â†’`1.50`), real numbers from an actual
       guide, not another blind guess.

  9. **Round 8 made it worse, not better — "absolutely garbage...
     shadows are bright lights, barely playable" (2026-08-20).**
     Checking the actual accumulated state instead of adding another
     single-variable tweak: by this point nearly every brightness lever
     was stacked at or near its max simultaneously — `T_EXPOSURE` `2.60`
     (max `2.80`, default `1.40`), all four day light/atmosphere
     intensities at their max `2.00` (default `1.00`), night intensities
     also at max `2.00` (default `1.00`), `MINIMUM_LIGHT_MODE` above
     default, **and** `REALTIME_SHADOWS` disabled — meaning nothing was
     left to darken occluded surfaces at all. With no shadow darkening
     and every light multiplier near its ceiling, occluded/shaded
     geometry rendered at the same blown-out brightness as sunlit
     surfaces instead of reading as shadow — exactly the reported
     "shadows are bright lights."  **Full reset instead of another
     incremental tweak**: re-enabled `REALTIME_SHADOWS` (`SHADOW_QUALITY`
     back to its `2` default) so occlusion darkening exists again, and
     pulled every stacked multiplier back to at-or-near default instead
     of trying to find one more offsetting value: `MINIMUM_LIGHT_MODE`
     `3`â†’`2` (default), `AMBIENT_MULT` `110`â†’`100` (default),
     `T_EXPOSURE` `2.60`â†’`1.70` (a modest bump over default `1.40`, not
     a near-max one), all four day sliders `2.00`â†’`1.20` (day brightness
     is `T_EXPOSURE`'s job, confirmed correct earlier — these were pure
     redundant stacking), night sliders `2.00`â†’`1.40`. Left the round-8
     tonemap curve (`T_LOWER_CURVE`/`T_UPPER_CURVE` `1.30`/`1.50`) alone
     — real reference values, not part of the stack that caused this.
     All baked into `Spooklementary_TDM_tuned.zip`.

  **Lesson**: disabling `REALTIME_SHADOWS` removes the *only* mechanism
  that darkens occluded surfaces — doing that while every brightness
  multiplier is simultaneously stacked near its ceiling guarantees
  everything reads as uniformly overexposed instead of having real
  shadow. When a tuning saga has been running long enough that many
  independent levers are all pushed toward one extreme, the fix is a
  full reset toward defaults, not one more offsetting nudge.

  10. **Round 9's reset undid the day fix — "all too dark again"
      (2026-08-20).** Confirmed via real research this time, not another
      guess: multiple independent sources agree **Spooklementary is
      dark by design** — "things are much darker as an intentional
      design feature of Spooklementary, as it's meant to create a moody
      and spooky atmosphere." Round 9's reset pulled nearly every
      brightness value back to at-or-near Spooklementary's own defaults
      to stop the blowout — which correctly stopped the blowout, but
      also undid the day-darkness fix, because those defaults are
      *intentionally* dark. The sources also confirm the shader's own
      Shader Options UI exposes exactly one dedicated brightness control
      for this — "General Brightness," i.e. `T_EXPOSURE` (matches the
      `.lang` label found earlier). **Root mistake across rounds 2-9**:
      spreading the brightness fix across five different levers
      (`T_EXPOSURE`, `AMBIENT_MULT`, `MINIMUM_LIGHT_MODE`, day sliders,
      night sliders) instead of using the one lever the shader is
      actually designed around — stacking multiple mechanisms at once
      is what caused every overcorrection. **Fix**: reset every other
      lever to true default (`AMBIENT_MULT 100`, `MINIMUM_LIGHT_MODE 2`,
      all day/night intensity sliders `1.00`, shadows on at default
      quality `2`), and raise only `T_EXPOSURE` (`1.70`â†’`2.50`, near but
      not at its `2.80` ceiling) as the single brightness lever for both
      day and night, since it's a global post-lighting exposure that
      isn't time-of-day-scoped. `T_LOWER_CURVE`/`T_UPPER_CURVE` (round
      8's real community-referenced values) left alone — genuinely
      separate from the brightness-stacking mistake.

  **Design choice surfaced to the user directly** rather than deciding
  unilaterally, since "the shader is dark on purpose" also meant there
  was a real fork: keep Spooklementary's spooky identity and fight its
  default brightness with the one intended lever (chosen), or drop the
  "spooky" reskin for base Complementary Unbound (same Oculus loader,
  same 1.20.1 compatibility, not built around deliberate darkness, but
  loses the horror aesthetic that was the actual reason Spooklementary
  was picked over generic Complementary for the Atmosphere & Wave Feel
  design goal in the first place). User chose to stay with Spooklementary.

  11. **"Still too dark, shadows are pitch black" — user explicitly
      directed removing shadows entirely (2026-08-20), not more tuning.**
      Technical reason `T_EXPOSURE` alone couldn't fix this:
      `T_EXPOSURE` is a global exposure multiplier applied *after*
      lighting — if the shadow map computes near-zero direct light in
      an occluded pixel, multiplying that near-zero value by a higher
      exposure still comes out near-zero. No single post-lighting
      exposure lever can lift a true shadow-black pixel; the darkness
      has to be removed at its source. **Fix**: disabled
      `REALTIME_SHADOWS` again (`//#define REALTIME_SHADOWS`) — this is
      the same toggle round 8 flipped, but this time every other
      brightness lever is at true default (only `T_EXPOSURE` at `2.50`
      is elevated, vs. round 8's five simultaneously-stacked levers),
      so the "bright white light" blowout from round 8/9 is much less
      likely to recur. `SHADOW_QUALITY` left at its default `2` — inert
      with `REALTIME_SHADOWS` off, no need to also change it.

  12. **Removed entirely (2026-08-20) — not a tuning problem, a "not
      feeling the shader feel" verdict.** After eleven rounds converging
      on a technically-defensible state (real dark-by-design confirmed
      via research, brightness isolated to `T_EXPOSURE`, shadows removed
      at the source), the user's actual issue was the aesthetic itself,
      not any remaining number: "im just not feeling the whole shader
      feel now." **Oculus** (`mods/oculus.pw.toml`) and
      **`shaderpacks/Spooklementary_TDM_tuned.zip`** deleted from both
      the tracked pack and the live instance, along with
      `config/oculus.properties`. `pack/index.toml`/`pack/pack.toml`
      hashes updated to match. Confirmed no KubeJS script referenced
      Oculus or shaders at all (`border_fog.js` and the wave-state
      `/fog` calls run entirely on YetGamer's Custom Fog, a separate mod
      with no Iris/Oculus dependency) — so nothing else needed touching.
      See `docs/IDEAS.md`'s Shaders sub-section for the closing note:
      this is a closed decision, not a paused one — don't re-propose a
      shaderpack here without new signal from the user.

  13. **Worldborder texture looked "blocky" (2026-08-20), now that
      shaders aren't there to soften it.** The original replacement
      texture (round 2 above) was still just 16x16 — small enough that
      the game visibly tiles it edge-to-edge across the huge worldborder
      wall, and the raw noise pattern didn't wrap seamlessly, so each
      16px tile boundary showed a visible seam/repeat, reading as a
      grid instead of continuous mist. Real "connected textures" (CTM)
      doesn't apply here regardless — that's block-face logic (Optifine/
      Continuity), and the worldborder isn't a block; it's a dedicated
      renderer that just repeats one square texture, consulted by
      neither Embeddium nor any CTM-style system. The actual fix is
      making the *texture itself* tile without seams. Rebuilt at 64x64
      using three octaves of **periodic value noise** — lattice grids of
      4/8/16 cells (all factors of 64), sampled with wraparound indexing
      so the noise field is mathematically continuous across every tile
      boundary, not just visually close — plus smoothstep interpolation
      to avoid any hard lattice-cell edges. Verified by rendering a 4x4
      tiled preview with gridlines overlaid before deploying: the cloud
      pattern flows unbroken across every seam. Same white-RGB/
      variable-alpha approach as before (game still applies its own
      blue/green/red border-state tint on top), same KubeJS
      `minecraft:textures/misc/forcefield.png` override mechanism.
  14. **Darkness effect built + fog restricted to wave-only (2026-08-20),
      same day the shader was dropped.** Per `docs/IDEAS.md`'s new
      "Darkness effect as the shader replacement" proposal (added by the
      user directly, then asked to be built): `wave_spawner.js`'s
      `useWaveHorn` now also runs
      `effect give @a minecraft:darkness 1000000 0 true` right after the
      fog command (1000000 is seconds, `/effect give`'s own max — no
      periodic top-up tick handler needed), cleared explicitly in
      `wave_status.js`'s "defeated" branch alongside the existing fog
      reset — same give/clear pairing already used for night-lock and
      fog, no new pattern. **Reverted the same day** — confirmed not
      working via direct playtest feedback (the user edited
      `docs/IDEAS.md` directly: "proposed and built... but didn't work
      per direct feedback — dropped"). Both the `effect give` and
      `effect clear` calls removed entirely from `wave_spawner.js`/
      `wave_status.js`; fog + night-lock are the only atmosphere layers
      a wave applies now. No specific reason given for *why* it didn't
      work (visually unconvincing? too subtle? read as a bug rather than
      atmosphere?) — worth asking directly if this comes up again, rather
      than guessing at another vanilla-effect substitute blind.
  15. **Misread "fog only during a wave" as "day gets zero fog" —
      corrected same day.** Deleted `border_fog.js` entirely on the
      assumption the user wanted fog eliminated outside waves. Actual
      ask, per direct correction ("i want some light fog on the border
      in the day and heavy fog in the night... trying to make it
      atmospheric"): day/night **contrast**, not day going silent —
      exactly what `border_fog.js` already provided and shouldn't have
      been removed. Restored it, and retuned its density since the
      original values were closer to the two states matching than
      contrasting: `NEAR_MAX_DISTANCE` (fog thickness right at the
      border edge) raised `20`â†’`60` so daytime border fog stays
      meaningfully lighter than wave-time's fixed `MaxDistance 32`
      everywhere, even at its densest point — previously the day-time
      edge fog (`20`) was actually *denser* than night's uniform fog
      (`32`), backwards from the intended contrast. `MIN_DISTANCE`
      `6`â†’`10` for a touch more clarity right around the player. The
      `gamerule sendCommandFeedback false` fix moved back to
      `border_fog.js` (undoing round 14's move into `wave_spawner.js`,
      now that `border_fog.js` owns `/fog` calls again too). The
      worldborder wall texture (round 13 above) was never affected by
      any of this — it's a static resource-pack override, always
      visible regardless of day/night.

  16. **Removed entirely — fog, the worldborder texture, and Blood Moon
      (2026-08-29)** — direct request: "remove any visual effects work,
      like fog etc, and go back to basics." Closes out this whole
      section's real implementation: `border_fog.js` deleted (peacetime
      proximity fog), `wave_spawner.js`'s wave-time fog command and
      `wave_status.js`'s reset removed, YetGamer's Custom Fog uninstalled
      (nothing left to use its `/fog` command), and the worldborder wall
      texture override (`forcefield.png`) deleted so vanilla's own
      default texture shows again. Night-lock — forced night, frozen
      daylight cycle during a wave — is **kept**, since it's a gameplay
      necessity (undead mobs would burn on spawn otherwise), not
      decoration. Staggered emergence and the sound-first cues are also
      **kept** — spawn timing and audio, not visual effects, and outside
      what was actually asked to be cut.

  None of the remaining fixes in this entry (staggered emergence, sound
  cues) have been re-tested in-game yet; the shader sub-thread is now
  moot.

  **Performance audit (2026-08-20)** — user explicitly asked to check
  this session's additions weren't costing performance without being
  weighed against the pack's existing FPS-focused mod stack (Embeddium/
  ModernFix/FerriteCore/Radium/EntityCulling).
  - **Spooklementary shipped defaulting to roughly its own `profile.HIGH`
    tier** — checked its shader source directly: `SHADOW_QUALITY=2`,
    `shadowDistance=192.0`, entity shadows and world-space reflections
    all on. First pass downgraded to `profile.MEDIUM` via a settings
    override. **User asked for more after the v1.1 downgrade (same
    day)** — went a further step to `profile.LOW` (`SHADOW_QUALITY=0`,
    `shadowDistance=96.0`, lightshafts and FXAA off, `WATER_QUALITY=1`)
    — real values from v1.1's own profile table. Once the settings-override
    mechanism itself came into doubt (see the darkness entry above),
    these `profile.LOW` values got baked directly into
    `Spooklementary_TDM_tuned.zip`'s `.glsl` defaults alongside the
    brightness fix, same reasoning: guaranteed to apply, not dependent
    on an unconfirmed external file.
  - The v1.1 downgrade above (fixing the `BIOME_PALE_GARDEN` crash) is
    also plausibly a performance win in its own right — a shader
    pipeline throwing during `CustomUniforms` initialization isn't free
    — though this wasn't directly measured/isolated from the profile
    change.
  - Oculus, YetGamer's Custom Fog, TFTH+GeckoLib: checked, no similar
    concern. TFTH's autonomous spawn/spread systems are already disabled
    (see its own config-hardening entry), so it carries registry/loading
    weight but no continuous runtime cost. YetGamer's Custom Fog is a
    lightweight rendering-parameter mod with no dependencies.

---

- **Fixed spawn + prebuilt starting building (2026-08-20)** —
  `docs/IDEAS.md`'s "Fixed spawn + prebuilt starting building(s), every
  world" idea, built into `playtest_starter_kit.js` on top of the
  existing first-login gear/base logic rather than as a separate file.
  `/setworldspawn` + `gamerule spawnRadius 0` + the existing one-shot
  guard (`td_playtestKitGiven`) built exactly per the design doc's plan.
  **One deliberate substitution**: the doc named `/place template` (a
  hand-authored `.nbt` structure) for the building itself — building a
  raw NBT file blind, with no way to test it in-game before committing
  it, is real unverified risk for no benefit when the `/fill`+`/setblock`
  code that builds the starter base is already proven working in real
  playtests. Reused that code directly, just re-anchored to the fixed
  point instead of the player's arbitrary spawn position — same
  end-user outcome, lower-risk mechanism.
  X/Z originally hardcoded to `(0, 0)` with Y read from the player's own
  natural spawn position; `worldborder center` moved to the same fixed
  point too, for consistency. **Only affects brand-new worlds** — a
  world already past its first login (including any world already being
  playtested) is completely unaffected; needs a fresh world to test, not
  just a relaunch.
  - **Superseded same day by the switch to real terrain** — "reading the
    player's own natural spawn Y" was only ever safe because Superflat
    height is uniform everywhere; real terrain varies within vanilla's
    default spawn-scatter radius, so a Y read there can't be trusted for
    world origin specifically anymore. Replaced with `/spreadplayers 0 0
    1 8 false @a` (vanilla's real heightmap-aware "place on solid ground
    near this X,Z" command, avoids voids/liquids) run first, then the
    player's *actual resulting* position is read as ground truth instead
    of assumed. The starter base's `/fill` logic also needed a real
    change beyond just re-anchoring: added a stone foundation 3 blocks
    down (covers local dips/dunes) and headroom clearing 3 blocks above
    the walls (covers local rises/foliage) before building, since a
    single flat Y across an 11x11 footprint no longer holds on uneven
    ground.
  - **`wave_spawner.js` needed the same class of fix.** Its mob-spawn
    logic reused the player's own Y for every summoned mob regardless of
    that specific mob's X/Z — harmless on flat Superflat, but on real
    terrain a mob spawning some distance away can be several blocks off
    the player's height, spawning embedded in terrain or floating.
    First fix summoned mobs 15 blocks up and let vanilla gravity drop
    them onto the real surface — technically correct, but user feedback
    after a real playtest was "enemies are falling from the sky," which
    reads as silly rather than menacing for mobs meant to approach with
    dread. **Replaced (2026-08-20) with a silent correction**: summon at
    the rough estimate regardless of accuracy, tag the entity uniquely
    (`Tags:["td_justSpawned"]`), then `/spreadplayers <x> <z> 0 4 false
    @e[type=<mobType>,tag=td_justSpawned,limit=1]` — the same vanilla
    heightmap-aware placement command used for the player's own fixed
    spawn in `playtest_starter_kit.js`, here targeting a mob instead of
    a player — then immediately clear the tag. Instant, invisible
    correction instead of a visible drop. Tag-add-then-remove is
    race-safe since `pendingSpawns.forEach` processes one spawn at a
    time, synchronously, within a tick. **Biggest unconfirmed
    assumption**: `/spreadplayers` accepting a general `@e[...]` mob
    selector, not just players, despite the command's name — reasoned
    from its argument being typed as a generic multi-entity selector in
    vanilla's command tree, consistent with how other "player" mods work
    on arbitrary entities, but not directly verified. If mobs don't
    move at all after summoning, check this first.
  - **Mobs always spawned inside the border, never from beyond it — a
    real miss against `docs/IDEAS.md`'s own Fog Wall design** ("enemies
    spawn from beyond the fog line, not inside the play area"), caught
    directly by the user after a playtest, not found proactively. The
    original spawn logic picked a position 15-25 blocks from the
    *player* and clamped it inward if that landed outside the border —
    so mobs always spawned near the player, never near the edge, and the
    gap only widened as `base_expansion.js` grew the border over time.
    **First fix still spawned mobs just inside the edge, not beyond it —
    a second real miss, corrected after direct user pushback ("no not
    inside the border!!! spawn outside").** That fix was built on a
    wrong assumption: vanilla's worldborder blocks *player* movement
    only, not general entity/mob movement — mobs path across it under
    normal AI with no special resistance. The original 2026-08-19 bug
    ("mobs spawning outside the border become permanently unreachable")
    predates `mob_aggro.js`'s unconditional, no-distance-limit
    `setTarget()` entirely, which is what actually makes a long walk-in
    reliable now, not keeping mobs inside the wall. **Real fix**:
    `randomBorderEdgePosition()` now spawns mobs 6-14 blocks genuinely
    *beyond* a random edge of the border, and mobs walk the real
    distance in. One real vanilla side effect of spawning outside:
    border damage (default ~0.2 hearts/sec past the border's 5-block
    safe buffer) would otherwise chip mobs and the player for no reason
    this pack wants — disabled once per world via
    `worldborder damage amount 0` in `playtest_starter_kit.js`'s
    existing one-time worldborder setup. **Not yet re-tested — needs a
    world with `worldborder damage amount 0` already applied; a world
    already past its first login (like an existing test world) needs
    that command run manually once.**

---

- **World type switched from Superflat to Single Biome: Desert
  (2026-08-20)** — per the direct request "creating a world that isn't
  entirely flat, and have some other structures been spawned around the
  player." Checked whether any of `docs/IDEAS.md`'s previously-logged
  candidate seeds (for real desert/badlands terrain) could be verified
  before committing to one — Chunkbase's seed map is a JS-rendered
  interactive tool, not fetchable/verifiable without actually running
  the game, so none of those unverified leads could be confirmed. Picked
  **Single Biome: Desert** instead of gambling on an unverified seed:
  deterministic (guaranteed desert terrain everywhere, no seed-hunting
  needed) and vanilla structure generation still runs normally within
  it — desert temples, wells, ruined portals, villages all still
  generate — so "structures spawn around the player" is satisfied by
  vanilla's own world generator, zero custom placement code needed. This
  also directly serves the border-expansion idea from `docs/IDEAS.md`'s
  "lootable buildings + distance-based risk" addendum (structures
  becoming reachable as the border grows) without building any of that
  addendum's more involved distance-based loot/difficulty systems yet —
  those stay a separate, later step. Badlands considered as an
  alternative (more dramatic canyon/mesa terrain) but Desert has more
  guaranteed structure variety.
  - **Automated (2026-08-20), same day — no longer a manual
    world-creation-screen step.** User asked directly not to need
    "Customize" at all. Real vanilla mechanism used: KubeJS's `data/`
    injection (already used elsewhere for recipes/tags/loot tables) can
    ship *any* datapack JSON, including a dimension override —
    `pack/kubejs/data/minecraft/dimension/overworld.json` replaces the
    vanilla `overworld` dimension's generator with
    `{"type": "minecraft:noise", "settings": "minecraft:overworld",
    "biome_source": {"type": "minecraft:fixed", "biome":
    "minecraft:desert"}}` — the exact same generator "Single Biome:
    Desert" produces manually (standard terrain-shape noise settings,
    just a fixed biome source instead of the normal biome-placement
    noise), now baked into every world automatically regardless of
    which World Type button gets clicked on the creation screen. Since
    this overrides vanilla's own `overworld` dimension definition
    directly, "Default" world type (what most players leave selected)
    picks it up with zero customization. **First time this pack has
    shipped a dimension-generator override via KubeJS** — previously
    `data/` was only used for simpler content (recipes, loot, tags), so
    this is a step further into that mechanism's range; not yet
    confirmed in-game. Manually picking Single Biome â†’ Desert on the
    creation screen remains a working fallback if the override doesn't
    take effect for some reason.
  - **Wide flatten around fixed spawn (2026-08-20).** The Desert
    override only fixes the *biome* — terrain height, ravines, and
    caves still generate under standard vanilla noise, so the ground
    immediately around the starter base was still visibly uneven.
    Seed-hunting for a naturally flat spot was considered and rejected —
    same unverifiable-lead problem (Chunkbase again) that already pushed
    this pack off a specific seed once before. Reused the existing
    starter-base leveling technique, just wider: `WIDE_HALF = 25`
    (matching the starting worldborder's 50-block diameter) instead of
    the building's own `half = 5`, resurfaced as `minecraft:sand` rather
    than exposed stone so it reads as open desert, not a quarry. Same
    one-shot trigger as the rest of `playtest_starter_kit.js`. The
    starter base's own narrow foundation-dig/headroom-clear became
    redundant once the wide pass covers that same area first, so they
    were removed rather than left as duplicate work.
    - **`/fill`'s 32,768 block limit checked, not assumed**: width is
      `2*25+1 = 51` blocks per side, `51*51 = 2601` per Y layer.
      Foundation (4 layers) = 10,404 blocks; headroom clear (6 layers)
      = 15,606 blocks — both comfortably under the limit as single
      commands, no chunking needed.
    - **Ravines deeper than the foundation's dig depth are still handled
      correctly**, not just hoped to work out: `/fill` unconditionally
      overwrites every block in its volume (not "fill only if air"), so
      any ravine or cave *within* the filled range gets solidly capped
      regardless of how far it continues below the fill's bottom layer
      — that deeper void just stays a hollow, invisible, unreachable
      cave underground, not a gap in the visible surface.
  - **Real crash found via first actual playtest of this batch**: the
    wide-flatten edit above introduced a second `const half = 5` in the
    same function scope (one left over from the earlier fixed-spawn
    edit, one added fresh for the wide-flatten edit) — a genuine
    duplicate-declaration syntax error, not the Rhino repeated-
    invocation quirk documented elsewhere in this codebase. This failed
    to *parse* entirely (`server.log`: "Loaded 8/9 KubeJS server
    scripts... 1 errors"), meaning **none** of `playtest_starter_kit.js`
    ran — no gear, no fixed spawn, no starter base, no worldborder/mob-
    spawning setup, no wide flatten. Explains three symptoms reported
    from one test as a single root cause, not three separate bugs: "wave
    0" showing (natural mobs, never disabled, against an untouched
    `td_waveNumber`), no starter structure (script never reached the
    `/fill` calls), spawning near water (vanilla's own unmodified spawn
    logic, none of the fixed-spawn/flatten code ran). Fixed by removing
    the stale duplicate declaration. **New verification step adopted
    after this**: `node --check <file>.js` catches this exact class of
    error before deploying — cheap, real syntax validation via Node's
    parser (close enough to Rhino's ES6 support for this), should have
    been run before this file was last deployed and will be from now on
    for every script edit.
  - **Reverted back to Superflat, same day, per direct feedback** ("the
    teraiin is wonky again and doesnt suit the gameplay") — real terrain
    was tried, playtested, and rejected on gameplay feel, not a
    technical failure. `kubejs/data/minecraft/dimension/overworld.json`
    now forces vanilla's own default flat generator instead of the fixed
    Desert biome source, using the exact same override mechanism, so a
    fresh world is Superflat automatically with zero manual
    customization — same "no manual step needed" property the Desert
    override had. The wide-flatten pass above became pure dead weight on
    flat ground (nothing to flatten) and would have needlessly
    resurfaced the yard as sand, so it was removed entirely rather than
    left inert. The `/spreadplayers`-based height-finding and
    `wave_spawner.js`'s spawn-beyond-border fixes were **kept** — both
    work correctly on flat terrain too, no reason to revert something
    that isn't broken. Deliberately "for now," not a closed decision —
    see `docs/IDEAS.md`'s Seed research section if real terrain gets
    revisited.

---

- **Watchtower — phase 1 of "expand the starter base into multiple
  buildings" (2026-08-20).** New idea, not previously in `docs/IDEAS.md`
  — user asked for "phase 1 of the initial buildings idea" with no
  matching section on record, so scoped it via direct questions rather
  than guessing: confirmed it meant growing the single starter box (the
  existing "Fixed spawn + prebuilt starting building(s)" idea) into
  several buildings, and that phase 1 specifically should be a
  watchtower/lookout. Built into `playtest_starter_kit.js`, right after
  the existing starter base commands, same one-shot trigger.
  - **Placement**: north of the base, behind its back wall (the door
    faces south/+Z, so the tower sits clear of the entrance) — a
    3-wide, 10-tall solid cobblestone pillar with an external ladder on
    its south face (the side facing the base, for a short walk from the
    door), topped with a 5x5 stone-brick platform and a cobblestone-wall
    parapet. Same material palette as the existing base (cobblestone/
    stone brick), not a new one.
  - **Open on all sides, not facing one direction** — a deliberate
    design choice tied directly to this session's earlier work: since
    `wave_spawner.js`'s `randomBorderEdgePosition()` spawns mobs at a
    random point on any of the 4 border edges, a lookout facing only one
    direction would miss three-quarters of what it's meant to watch for.
    The parapet ring has a single gap, at the ladder-access point, not a
    facing wall.
  - **Ladder facing convention confirmed, not guessed**: `facing=south`
    for a ladder mounted on a pillar to its north — vanilla's
    wall-attached-block convention is that `facing` points *away* from
    the block it's attached to (the direction the player faces while
    climbing), not toward it.
  - Syntax-checked with `node --check` before deploying (see the crash
    entry above for why this is now a standing step). **Not yet
    confirmed in-game.**

---

- **Schematicannon mod choice reversed (2026-08-30)** — FEATURES.md's
  "confirmed Forge 1.20.1" note for the planned "standalone
  Schematicannon" extraction turned out to only mean *targets that
  version*, not *safe to use*. Installed CurseForge project 1375728
  ("Schematicannon standalone" by VinicciusX) as queued, then decompiled
  the jar before writing any glue against it — standard practice in this
  pack after the FTB Quests `#tag` crash and Trapcraft/Spike Trap mod
  evaluations. `META-INF/mods.toml` inside it hardcodes
  `modId = "schematicannon"`, `authors = "bikerboys"`, and
  `displayURL = "https://github.com/michiel1106/Create-schematicannon"`
  — it's a straight re-upload of CurseForge's separate **"Schematicannon"**
  listing (project 1350154, also bikerboys), not an independent build.
  That other listing carries the author's own banner: **"BROKEN, MIGHT
  FIX IN THE FUTURE. DONT USE."** A web search for this exact
  mod/dependency combination turned up real, credible Flywheel-related
  launch-crash reports for Create-derived mods on Forge 1.20.1,
  consistent with the warning. No way to headlessly test-launch Forge
  in this environment to directly confirm or rule out the crash, so
  rather than gamble on it, flagged it to the user before writing any
  KubeJS glue against a foundation that might crash on every launch —
  same category of risk as the FTB Quests bug, just caught before
  shipping instead of after. **User decided: install full Create
  instead** (project 328085, `simibubi`, 6.0.8) — removed the standalone
  entry (`packwiz remove schematicannon-standalone`) and added Create
  in its place. Real Create jar-in-jars the same Flywheel/Ponder/
  Registrate/MixinExtras stack, confirmed from its own
  `META-INF/jarjar/` contents, so the footprint difference between the
  two options was smaller than FEATURES.md originally assumed — the
  fake mod's "lighter, standalone" pitch wasn't actually true.

- **Schematicannon's real mechanics, confirmed against source** —
  while vetting the mod, also resolved two things FEATURES.md had
  flagged as open: (1) the material-check-then-place gate is **native**
  to the Schematicannon, not something needing custom KubeJS glue —
  confirmed against Create's own official GitHub wiki
  (`Creators-of-Create/Create` wiki, "Printing a Schematic"): it draws
  from adjacent inventories and pauses on "Missing Block" until
  supplied. (2) A finished `create:schematic` item is **not**
  self-contained NBT — decompiling `SchematicItem.class` (from the real
  Create 6.0.8 jar) shows its NBT (`File`, `Owner`, `Bounds`,
  `Deployed`) only *points at* a `.nbt` structure file that must already
  exist in that world's `saves/<world>/schematics/uploaded/` folder.
  This is a real, harder blocker than the mod choice ever was — see
  `docs/QUEUE.md`, pulled back out of "ready to build" until an actual
  room exists as a real exported `.nbt` file (an in-game, real-client
  step no coding session can produce headlessly).

---

- **Quest book restructure: Tier 1 chapter (2026-08-30)** — split Tier 1
  out of the Basics chapter into its own chapter (`tier1_machines.snbt`,
  renamed from "Defenses" to "Tier 1"), per the new "one quest per item,
  not one quest per tier" process. The existing live Fortify quest was
  relocated and retitled "Sharpened Scrap" with its quest ID
  (`1454951A7FB14A26`) and task/dependency left untouched, so Basics
  quest 8's existing dependency on it kept working unmodified — the
  real risk was in the move, not the concept (cross-chapter dependencies
  were already proven when Fortify was first threaded into Basics). A
  new "Something Crueler" quest (craft `trapcraft:bear_trap`) was added
  parallel to it, gated on the same Basics quest 6 dependency, not
  chained to Sharpened Scrap. `trapcraft:bear_trap` was confirmed as the
  real registry name directly from Trapcraft's own jar
  (`assets/trapcraft/lang/en_us.json`) before writing the task, not
  guessed — the same discipline that would have caught the original
  Fortify `#tag` crash had it been applied there. Two new amulet-side
  quests ("Not Just Jewelry," "Leave It Behind") were also added to
  `basics.snbt` in this same pass, inserted by dependency on quests 2
  and 8 respectively rather than renumbering the existing chain. All new
  quest IDs checked for uniqueness against every existing ID in the
  quests folder before finalizing.

---

- **World type rebuilt: `noise` generator replaces `flat` (2026-08-30)**
  — see `docs/FEATURES.md`'s "World type" entry for the full detail.
  The flat-type-with-desert-biome override was confirmed broken by
  direct playtest (still rendered plains on a fresh world); replaced
  with `type: minecraft:noise` + a custom `noise_settings` file
  (`kubejs/data/kubejs/worldgen/noise_settings/flat_desert.json`) and a
  `fixed` biome_source. Every field name was checked against a real,
  downloaded copy of vanilla's own `overworld.json` noise_settings
  (120KB, fetched via `gh api` from a server-reimplementation repo that
  ships exact vanilla data) rather than trusted from summarized wiki
  fetches, which disagreed with each other and each contained at least
  one wrong field name. The desert surface rule (sand over sandstone)
  is copied verbatim from vanilla's own real desert-biome branch inside
  that file. `final_density` is a Y-only `y_clamped_gradient` — no X/Z
  term anywhere in the router — so flatness is structurally guaranteed
  rather than tuned toward, a stronger position than the originally
  planned `density_factor` approach. Deployed directly to the live
  instance. Not yet confirmed in-game — needs a brand-new world, since
  world-gen changes don't retroactively affect already-generated
  chunks.
