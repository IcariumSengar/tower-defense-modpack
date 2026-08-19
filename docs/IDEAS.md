# Ideas Hub

Scratch space for raw ideas — not decisions, not roadmap. Nothing here is
committed to the pack until it's deliberately promoted into
[ROADMAP.md](ROADMAP.md) or [MODS.md](MODS.md). Dump things here so they
don't get lost; sort/prune later.

## Base expansion gated like Twilight Forest progression

Core idea: start with a small base area; unlocking things opens up further
areas of the base, which is how you get room to build more defenses —
mirrors how Twilight Forest gates map areas behind bosses/progression
rather than letting you roam the whole dimension immediately.

Researched how Twilight Forest actually does it, for reference:
- Bosses gate biomes in a set order (Naga → Lich → Minoshroom →
  [Hydra / Knight Phantom→Ur-Ghast / Snow Queen in parallel] → Highlands →
  Yeti → Giant Miner).
- Locked biomes mostly aren't hard-walled — they get a biome-wide weather
  effect plus a debuff (Hunger, Blindness, damage) if you go in early.
  Discourages rather than physically prevents.
- Boss trophies act as keys — trophy from boss A required to enter boss
  B's stronghold.
- A Magic Map tool reveals dungeon/biome locations as you progress, so
  there's always a "what's next" signal without spoiling the whole map.
- Hard enforcement (`tfEnforcedProgression` gamerule, literal barriers) was
  only added later as an opt-in config — soft/dangerous-but-possible was
  the long-standing default.

Possible translation to base expansion (unrefined, not decided):
- Ring the base in locked expansion zones; venturing out early is
  dangerous (stronger mobs / hazard) rather than physically blocked —
  fits the pack's existing horde-density philosophy (danger scales via
  KubeJS, no custom AI) better than an invisible wall would.
- "Trophy" analog: a drop/token from a milestone (surviving night N, a
  mini-boss wave) spent to unlock the next zone — concrete, farmable
  unlock condition rather than just a time gate.
- Parallel-gate pattern (multiple independent objectives feeding one
  unlock, like Hydra/Knight Phantom/Snow Queen all gating Highlands)
  seems like the more interesting shape for this pack vs. a single
  straight line.
- Start with soft gating (risk, not walls) and only consider hardening
  later, per Twilight Forest's own history of doing the same.
- Pairs well with the roadmap's deferred "true tower defense" idea (fixed
  base-core objective) — a fixed core gives expansion zones a clear
  origin point to ring outward from.

Open questions:
- What mod/system would actually implement zone locking (claim/plot mod?
  hazard-only, no real blocking?) — needs a mod-list check before this
  goes anywhere near a decision.
- How expansion zones interact with the horde-density "wherever you've
  fortified" framing vs. a fixed core.

### Addendum (2026-08-19): concrete implementation plan, from uploaded design notes

A separate design-notes doc answers the "what mod/system" open question
above with an actual approach — folded in here rather than as a
duplicate idea:

- **Void/flat custom dimension** — single JSON file, mostly empty, so
  there's no real terrain to hide/reveal.
- **Fixed base on load** — hand-built starting base exported as `.nbt`,
  auto-placed at world origin via a datapack function on world load.
- **Expansion via `/worldborder add <blocks> <time>`** — border starts
  small around the base and grows as progression milestones are hit
  (waves survived, loot spent, specific "expansion" items crafted —
  exact trigger not yet chosen).
- **Content placement tied to border growth** — as the border expands,
  function calls place new structures/resources/loot into the
  newly-available area, rather than relying on organic terrain
  generation.
- Explicitly **not** "fog lifting off real terrain" — it's a hard
  boundary + manual placement. Real noise-based custom terrain gen was
  considered and rejected as too experimental/fragile given the
  no-custom-Java-modding constraint. All-vanilla, datapack-only.

**Resolved 2026-08-19:** `/worldborder` is a hard, impassable wall — the
opposite of the soft-gating approach floated above (Twilight-Forest-style
danger/debuffs, nothing physically blocked). Decision: keep the hard
wall for the first pass, it's simpler to implement. Soft danger-based
gating (e.g. border grows generously ahead of what's "safe," and the
loot-bag/machine economy is what actually gates how far a player can
push) stays the noted improvement path once a hard border's been played
and proven too restrictive.

**Promoted to actual pack content 2026-08-19** — first-step scope decided
and built, see [ROADMAP.md](ROADMAP.md) Decisions and
[MODS.md](MODS.md) Custom glue for the real implementation
(`pack/kubejs/server_scripts/base_expansion.js`). The void/flat custom
dimension and hand-built `.nbt` structure from the addendum above were
both scoped down for this first pass — reusing the Superflat Overworld
and keeping the existing `/fill`-based starter base
(`playtest_starter_kit.js`) instead, since both already work and neither
custom-dimension nor hand-built-structure work is needed yet. Those stay
noted here as the fancier version to revisit if reusing Superflat ever
proves insufficient.

## Amulet as mob-attraction object (instead of motes/player/location)

Core idea: an amulet item, wearable by the player or placeable on a
pedestal, is what draws mobs — not the player themselves and not a fixed
map location. Mobs are drawn to wherever the amulet currently is.

Note: this is a plausible lightweight route to the roadmap's deferred
"true tower defense" idea (mobs pathfinding to a fixed base-core objective
regardless of player position) — the amulet-on-a-pedestal case gives a
fixed target without needing custom Java AI, since the target is an
object/pedestal rather than requiring pathfinding logic to know about a
"base" concept. Player-worn case would instead make aggro follow the
player around, which is closer to the current horde-density approach.
Unrefined — not evaluated against actual mob-lure mechanics in the
current mod list yet.

## Full system design notes (from uploaded PDF, compiled 2026-08-19)

Broader working notes covering the whole loop, not just map expansion.
Kept close to the source doc's own structure/wording since it's meant as
a future-reference compilation, not just a one-line idea.

### Core loop & balance philosophy
- Waves of mobs escalate in difficulty across nights; kills drop tiered
  loot bags; loot bags craft machines (offensive/defensive structures)
  to survive the night.
- Early game: tight resource margins, just enough to survive each wave.
- Mid game: real progression feel — unlocks, upgrades, stronger
  machines, sense of growing mastery.
- Late game: difficulty scaling outpaces player power growth on purpose
  — the "false security" collapses.
- Design intent: not meant to be reliably "won" — closer to a roguelike
  endurance challenge than a clean-victory game. Win state itself still
  open (see Open Questions).

### Loot & crafting materials (draft tier structure)
- Tier 1 (early mobs): Scrap, Bone Shards, Rotten Sinew → basic
  melee/simple turret parts.
- Tier 2 (mid mobs): Refined Alloy, Charged Dust, Venom Sacs →
  automated/ranged machines.
- Tier 3 (elite/night-boss mobs): Core Fragments, Volatile Essence →
  powerful multi-function machines.
- Possible Disassembler-style mechanic: break down excess/unwanted loot
  into lower-tier materials to avoid dead loot.

### Machine progression
Progression logic: manual/passive → semi-automated → fully powered,
mirroring loot tiers.
- **Tier 1 — Passive/Manual** (no power, breakable, cheap): Spike Traps
  (degrade after X hits), Wooden Palisade/Funnel Walls (shape enemy
  pathing into kill zones), Simple Pit/Snare Trap (slow/briefly hold).
- **Tier 2 — Semi-Automated** (needs basic resource/fuel, still
  fragile): Arrow/Dart Turret (auto-fire, needs ammo refills), Boiling
  Oil/Fire Trap (triggered DoT zone), Reinforced Spikes (tougher Tier 1,
  higher break threshold).
- **Tier 3 — Powered/Automated** (needs energy source, more durable,
  higher output): Tesla Coil (chain-lightning between clustered
  enemies), Auto-Turret gatling/cannon-style (ammo + power dependent),
  Flame Thrower Emplacement (area denial, high resource cost).
- **Tier 4 — Elite/Endgame**: AoE Devastator (explosive/energy burst,
  likely cooldown/overheat), Chain-Tesla Network (multiple linked
  coils, compounding damage over a wide area).
- Design lever: Tier 1–2 degrade from overuse (ongoing rebuild resource
  sink); Tier 3–4 need active power/fuel (different maintenance
  pressure) — keeps both early and late game resource-tense via
  different mechanisms.

### Power system
- Wireless power — no cables, place a machine and it draws power
  automatically.
- Reference mod: **Flux Networks** (wireless energy networks,
  cross-dimension transfer, per-network config) — closest match to the
  intended feel. Alt options: Wireless Networks mod, RFTools Power
  Cells (linked cells = shared pool).
- Only Tier 3–4 machines need power — Tier 1–2 stay manual/fuel-free by
  design, so the power system only "switches on" mid-late game.
- Open: shared power pool/capacity limit, or unlimited draw once a
  generator exists? (unresolved)

### Quest book (FTB Quests) implementation plan
- Purpose: guide players, gate progression behind crafting/kill
  milestones, host a "shop" for trading lower-tier items up to
  higher-tier ones.
- Chapters = progression sections (Basics, Loot Tiers, Machines, Map
  Expansion, Shop), written as `.snbt` files. Quest dependencies gate
  unlocks (locked until prerequisite complete). Task types (item, kill,
  checkmark, advancement) tie quests to real milestones.
- Shop section, two candidate approaches: native FTB Quests repeatable
  "trade" quests (submit lower-tier items, get higher-tier reward, fully
  tunable rates) vs. the **QuestShop mod** (purpose-built shop with
  currency, datapack-configured categories, optional FTB Quests
  integration for locking categories via quest rewards).
- Notes there's a dedicated tool/skill for authoring FTB Quests SNBT —
  worth using directly once the actual quest list and shop rates are
  settled. Not written yet — depends on final loot tiers, machine list,
  and map-expansion milestones being locked in first.

### Reference mods (for pulling mechanics/blocks, not modding from scratch)
| Category | Mod | Notes |
|---|---|---|
| Wireless power | Flux Networks | cable-free, cross-dimension, configurable |
| Wireless power (alt) | RFTools Power Cells | linked cells = shared pool |
| Tesla defense (classic) | IC2-style Tesla Coil | electrocutes mobs in 4-block radius, redstone-triggered, drains EU/tick |
| Tesla defense (modern) | Immersive Engineering Tesla Coil | protects 13x13x13, always-on while powered, RF/tick + RF per shock |
| Spikes/traps | — | TBD, needs research into existing hazard/spike blocks before custom recipe work |
| General machine base / tiered components | Thermal Expansion, Mekanism, Industrial Foregoing | good templates for tiered upgrade paths |
| Loot bags / tiered drops | Loot Bags mod, Lucky Block-style mods | idea was reskin/re-tier via KubeJS rather than building from scratch |

### Tooling / build approach
- Datapack-first, no custom Java modding.
- KubeJS (+ ProbeJS) for custom recipes (loot-tier materials →
  machines), custom loot tables (tiered drops per mob), tweaking
  existing machine stats, possibly custom items.
- Map "generation" solved via hand-built structures/schematics +
  datapack placement, not a custom ChunkGenerator.

### Open questions (from the design notes, unresolved)
- Any loot-tier mechanic beyond enemy type (wave number, kill method,
  crits)?
- Exact number of loot/machine tiers.
- Win state: leaderboard/endurance only, or some form of victory?
- Specific mob → tier → material mapping (deferred).
- Spike trap / hazard block source mod — needs research.
- Full machine list — more types likely to be added.
- Power system: shared pool/capacity limit, or unlimited draw?
- Map gen: exact milestones that trigger `/worldborder` growth (waves?
  loot spent? crafted items? some mix?).
- Quest book: full chapter/quest list and shop exchange rates.

### Conflicts / contradictions flagged against current repo state — resolved 2026-08-19

Guiding call across all four: **small, deliverable scope now; leave an
explicit path to the fancier version later** rather than build the
complex version first. Same spirit as the existing "keep footprint
small" principle in ROADMAP.md.

Checked these notes against [ROADMAP.md](ROADMAP.md) and
[MODS.md](MODS.md) rather than just filing them blind:

1. **Modloader/MC version.** Confirmed: staying on Forge/1.20.1. Notes
   were just stale — no action needed.
2. **Loot materials.** Keep the already-built vanilla-materials-only
   system (Common/Uncommon/Rare, keyed to mob buckets) as-is for now.
   The invented-material tier draft (Scrap, Bone Shards, Refined Alloy,
   Core Fragments, etc.) plus the Disassembler mechanic are kept on
   file as a **later expansion path**, not built now — revisit once the
   vanilla version has been played and there's a concrete reason to add
   custom materials on top.
3. **Base expansion boundary.** Keep the hard `/worldborder` wall for
   the first pass — simpler to implement than soft danger-gating.
   Soft, Twilight-Forest-style danger-based gating (debuffs/stronger
   mobs discourage early expansion instead of physically blocking it)
   stays noted as the improvement path to layer in later, once a hard
   border is proven to feel restrictive.
4. **Night-based mob scaling.** Keep the current mod-driven approach
   (Epic Siege Mod + Pure Suffering handling escalation) as the
   near-term solution — don't build custom scaling yet. The
   hand-written script (`docs/deferred/night_scaling.js`) stays parked
   as the path to a fully custom/tuned scaling system later, once the
   mod-driven version has been played and its gaps are actually known.

