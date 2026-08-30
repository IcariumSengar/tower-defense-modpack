# Ideas Hub

Scratch space for raw, unrefined ideas — a notepad to work through, not
a spec. Nothing here is decided or built until it's promoted into
[FEATURES.md](FEATURES.md) (once a design actually crystallizes),
[ROADMAP.md](ROADMAP.md), or [MODS.md](MODS.md). Dump things here so
they don't get lost; sort/prune later.

**Reorganized 2026-08-30** — this file had grown to 3000+ lines of
addendums stacked on addendums and stopped being usable as a working
notepad. Everything that had actually crystallized into a real design
or a built feature moved to [FEATURES.md](FEATURES.md), written as
clean current-state specs instead of the layered history of how each
one got there. What's left here is the genuinely still-open stuff.

---

## Power system (Tier 3-4 machines)

Not started — Tier 1-2 machines are deliberately fuel-free by design,
so this only "switches on" once Tier 3 exists.
- Wireless power (no cables, place a machine and it draws automatically)
  is the intended feel. Reference: **Flux Networks** (closest match —
  cross-dimension, per-network config). Alternatives: Wireless Networks
  mod, RFTools Power Cells (linked cells = shared pool).
- Open question: shared power pool/capacity limit, or unlimited draw
  once a generator exists? Unresolved.

## Machine progression, Tier 3-4

Tier 1 (Trapcraft) and Tier 2 (Trapcraft's Igniter/Fan/Magnetic Chest +
Medieval Defense Turrets) are both specced now — see FEATURES.md. Tier
3-4 are still just the original design-note sketch, not scoped:
- **Tier 3 — powered** (needs the power system above): Tesla Coil
  (chain-lightning), Auto-Turret, Flame Thrower Emplacement.
- **Tier 4 — elite/endgame**: AoE Devastator, Chain-Tesla Network.
- Design lever, still valid: Tier 1-2 degrade from overuse (rebuild
  resource sink), Tier 3-4 need active power/fuel (different
  maintenance pressure) — two different flavors of resource tension for
  early vs. late game.
- Reference mods for these, never evaluated against actual flat/desert
  world-gen or footprint cost: Thermal Expansion, Mekanism, Industrial
  Foregoing (tiered component templates), IC2-style Tesla Coil vs.
  Immersive Engineering Tesla Coil for the Tier 3 defense piece
  specifically. **TurretCraft and K-Turrets** were also researched for
  Tier 2's turret slot and passed over as too feature-rich for it
  (smart auto-targeting, ammo GUIs, combat drones) — worth reconsidering
  either of them for Tier 3's Auto-Turret instead of researching fresh.

## Deferred: custom loot materials, beyond vanilla-only

The loot bag system is vanilla-materials-only by design (see
FEATURES.md) — "we'll get to custom loot at some point" is still the
standing call, not revisited. If it ever is, the original draft tier
structure: Scrap/Bone Shards/Rotten Sinew (Tier 1) → Refined
Alloy/Charged Dust/Venom Sacs (Tier 2) → Core Fragments/Volatile
Essence (Tier 3), plus a Disassembler-style mechanic to break excess
loot down a tier. **Trapcraft may already solve the Disassembler part**
now that it's installed for Tier 1 traps — worth checking its own
recycling-adjacent mechanics before building one from scratch, given
it's already in the pack for a different reason.

## Biomes O' Plenty — richer multi-biome path (deferred)

FEATURES.md's structure-generation plan uses vanilla `minecraft:desert`
on the flat generator. The richer version — several curated arid BOP
biomes together (Wasteland is the standout: Dried Salt ground, dead
trees, dust-through-fog, arguably closer to this pack's Fallout
aesthetic than plain vanilla desert) — needs a `multi_noise` biome
source with a curated parameter list, genuinely hard to hand-author but
de-risked by an existing community tool (a Python generator called
Whitelist-Minecraft-Biomes). Also needs checking whether TerraBlender's
own region-weighting config can actually restrict to a chosen biome
subset cleanly — unresolved. Not worth the complexity until the simple
version is played and found wanting.

## Wave-clear reward: a building/machine places itself in the base

Separate from the schematic-based room-expansion in FEATURES.md — this
is a *gift*, not something the player chooses to build. On some wave
cadence (maybe only boss waves — cadence never decided), a
building/block/machine automatically appears in the base, no player
action required.

**Real open fork, not just phrasing**: is this a preview of the same
Tier 1-4 machines (front-loaded, "can't afford to craft it yet"), or a
separate category of reward-exclusive content that's never craftable at
all? These lead to different builds downstream. Not decided.

Technique would reuse the same `/place template`-at-a-triggered-location
pattern as everything else in FEATURES.md's "Cross-cutting patterns"
section — likely a sibling script to `base_expansion.js`, not new
ground, once the fork above is resolved.

## Roguelike: choosing the next wave's composition

The buff-pick half of this idea shipped and is documented live in
FEATURES.md. The other half never got built: letting the player choose
the *next wave's* composition from three options, not just a permanent
buff. Explicitly deferred at "start small" — the current wave list
(`WAVES` in `wave_spawner.js`) is one fixed sequence, and turning it
into real player-chosen branches is combinatorial if unconstrained.
Whenever this gets picked up: start with branches reconverging into the
same next wave (flavor, not real forks) before building genuine
branching paths.

**GUI still needed for any of this** — the original chat-based buff
picker was removed for deadlocking the whole wave-clear sequence (see
FEATURES.md's retired section). Two directions researched, neither
verified: reusing vanilla's villager-trade screen (real clickable
icon slots via custom NBT offers — unconfirmed whether KubeJS can
detect which trade a player completed, which is the whole point), or a
genuine custom Container/Menu via `StartupEvents.registry('menu', ...)`
(unclear if this needs the now-dead ScreenJS addon or works via KubeJS
core alone — needs an in-game check, not another search). Parked, not
being pursued right now per direct request.

## Keeping the (8-wave) campaign interesting — unranked ideas

1. Smaller narrative beats mid-campaign (a diary page, a distant
   explosion, a radio crackle at wave 3 or 4), not saving all the story
   for the wave-5/wave-8 beats that already exist.
2. A genuine, distinct wave 8 finale mechanic — it's the real end of
   the designed campaign now (that role used to belong to wave 5 before
   the campaign grew), and currently isn't anything more than a scaled
   composition.
3. A supply-drop event during the peacetime countdown gap — gives the
   3-minute wait a reason to move around instead of standing still.
4. A rotating wave modifier ("faster mobs this wave," "no sound cue
   this wave") — cheap variety layered on existing systems, no new
   content needed.

## Quest book — the fuller vision, still unscoped

FEATURES.md covers the live Basics chapter. The original, bigger plan
is still just that — a plan:
- More chapters: Loot Tiers, Machines, Map Expansion, Shop.
- Shop mechanism, two candidates never chosen between: native FTB
  Quests repeatable "trade" quests (submit low-tier items, get a
  high-tier reward) vs. the **QuestShop mod** (dedicated shop UI,
  currency, datapack-configured categories).
- Depends on Tier 2-4 machines and the map-expansion/exploration
  content actually existing first, same as it always did.

## Pack aesthetic — decoration mods, not yet installed

Researched for the Watchpost's decoration pass (see FEATURES.md) and
for the general Fallout-post-apocalyptic look: **ZCraft: Zone Decor**
(military crates, barrels, tires, rusted industrial clutter — purpose-
built for wasteland builds) and **Doomsday Decoration** (worn
furniture, discarded belongings, human remains — well-established,
2.2M+ downloads, small file size). Both decoration-only, no mechanics,
no dependency on the biome/world-gen decisions above. Not installed.

## Open questions carried over from the original design notes

Mostly still genuinely open:
- Exact number of loot/machine tiers beyond what's built.
- Win state: leaderboard/endurance only, or some form of victory? The
  "closer to a roguelike endurance challenge than a clean-victory game"
  framing is the only answer so far.
- Full machine list beyond Tier 1 — more types likely as Tier 2-4 get
  designed.
- Power system: shared pool/capacity limit, or unlimited draw?
- Whether the vanilla-materials-only loot decision sits comfortably
  with a scrap/salvage aesthetic long-term, or whether that's the real
  argument for eventually revisiting custom materials.

---

## Working principles (apply these going forward, don't re-litigate)

- **Keep footprint small** — default to the leaner option for anything
  proposed on this session's own initiative; call out footprint cost
  before suggesting something bulky.
- **Prefer a mod's mechanic wholesale over hand-building it**, when one
  genuinely fits — but verify the mod actually does the specific thing
  needed (exact version, exact mechanic) before relying on it. Several
  mods researched in this project turned out not to have the feature
  their description implied (Simple Spikes' 1.20.1 build, Gravemist's
  1.20.1 availability at all, MineTraps' current Forge target). See
  FEATURES.md's "Cross-cutting patterns" for the fuller reasoning.
- **Small deliverable scope now, explicit path to the fancier version
  later** — this pack's whole build pattern so far (base expansion's
  hard wall, staying flat, the Basics quest chapter before the fuller
  vision). Keep applying it rather than jumping straight to a "final"
  version.
- **A doc claiming "there's a dedicated tool for X" is a claim to
  verify, not a fact** — burned twice on the FTB Quests SNBT-authoring
  tool specifically. Check before planning around it.
- **Connect design intent to what the code actually does**, don't just
  read the design doc and assume it's implemented that way — this has
  bitten the project multiple times (Spike Trap only checking the
  player, not mobs, being the clearest example).
- **The quest book must stay in sync with what's actually buildable** —
  whenever a mechanic gets fleshed out to a real spec in FEATURES.md,
  check whether it needs a new quest or an existing one refined to
  actually teach it, and draft that alongside the mechanic itself
  rather than after the fact. It's the tutorial; letting it fall behind
  defeats the point of having it. **One quest per distinct item, not
  one quest describing several** — a paragraph naming multiple items in
  one quest's text isn't the same as teaching each of them; a tier or
  feature with multiple craftable items gets its own chapter with one
  quest per item instead.
