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

**Tuned after a real playtest (2026-08-19):** grows the border by 5
blocks every 2 waves cleared (watches `wave_status.js`'s `td_inWave`
flag directly, switched from an earlier "nights survived" proxy),
auto-set to 50 blocks on world creation. Playtesting also caught a real
bug this depends on: `wave_spawner.js`'s 15–25 block spawn radius could
place mobs *outside* the current border, making them permanently
unreachable and silently blocking "wave defeated" from ever firing —
fixed by clamping spawn positions to `level.getWorldBorder()`'s bounds.

### Addendum (2026-08-19): lootable buildings + distance-based risk in newly-opened areas

More detail on what the border expansion actually reveals, riffed on
further: as `/worldborder` grows with completed waves, it doesn't just
open empty space — it exposes further-out buildings that can be looted
for better gear. The further from base, the riskier: harder mobs
spawning out there, plus the practical risk of just being far from your
own defenses.

Checked `base_expansion.js` — no loot/structure/distance logic exists
yet, so this is purely additive to the current implementation, not a
conflict.

**Nice synthesis, not a new tension:** this actually resolves the
earlier "hard wall vs. soft danger-gating" question in a complementary
way rather than needing to pick one. The `/worldborder` hard wall stays
as the *outer* bound of what's reachable at all (resolved above — kept
simple, hard wall for now). Inside that bound, a distance-based danger
gradient becomes the *soft* gating layer that was floated as the later
improvement — you're never physically blocked short of the wall, but
wandering to the edge of the currently-open area gets progressively
more dangerous. Both ideas turn out to fit together rather than compete.

Cross-links:
- **Loot:** this is a second, location-based loot channel alongside the
  existing mob-drop tiered loot bags (see "Loot & Crafting Materials"
  and its "Loot materials" conflict resolution above) — better gear
  from structures, not just bags off mob kills. Worth keeping the two
  channels distinct rather than merging them prematurely.
- **Difficulty scaling:** "harder mobs spawn further out" is a new axis
  for the currently-deferred night-scaling work
  (`docs/deferred/night_scaling.js`, see the "Night-based mob scaling"
  conflict resolution above) — that script currently only thinks in
  terms of night count, not distance-from-base. Worth noting as a
  future direction for it rather than a separate system.
- **Amulet idea:** pairs with the amulet's pedestal-mode border-exit
  mechanic above — that's an explicit, costed way to leave the
  permitted area entirely; this is the "danger increases as you push to
  the edges of what's already permitted" layer for everyone else,
  even without touching the amulet.

Not decided or built — just how the pieces connect if this gets picked
up.

### Addendum (2026-08-20): "exploration feel" mod research — the earlier blocker is gone

Asked directly: research what an "exploration feel" would look like and
what mods could deliver it — named abandoned cities, settlements, and
rare/valuable loot chests specifically, with expanding outward meant to
feel like uncovering more of the map, and the amulet's border-crossing
letting players push into that further and earlier than the border
alone would allow.

**The earlier blocker on this is gone.** Back in the first mod-list
research pass (see "Mod-list research" under Pack Aesthetic above),
structure-generation mods for this exact purpose (Abandoned Structures,
Massive Ruined City, Apocalypse Structures) were found and flagged as
"blocked by the Superflat decision" — structure-gen mods need real
terrain to place naturally, and the pack was still on Superflat then.
That's no longer true: the pack now generates every world as **Single
Biome: Desert** with standard vanilla terrain noise (see the Seed
research section above) — real terrain exists now, so this class of mod
is actually installable.

**New standing filter to apply to any exploration/structure mod from
here on, specific to this pack's world-gen setup:** the desert-forced
override (`kubejs/data/minecraft/dimension/overworld.json`) only fixes
the *biome*, everything else about placement still runs through
biome-tag rules — so a candidate mod's structures need to actually be
tagged for desert (or a broad/overworld-wide tag) to ever appear at
all, and a mod that adds its **own new biome** (its structures usually
gated to that biome specifically) will likely never generate anything
here, since `biome_source: fixed` means no other biome can ever place.
And a mod that replaces/generates via its **own world/dimension
generator** (not just structure placement within the existing one) is a
real conflict risk against this pack's own custom `overworld.json`
override — needs explicit compatibility verification, not an
install-and-hope.

**Candidates found, evaluated against that filter:**
- **YUNG's Better Desert Temples** (Forge 1.20.1, 60.4M downloads,
  needs YUNG's API) — redesigns vanilla's own Desert Temple with
  puzzles/traps/parkour and a boss (60 HP "Pharaoh"), much better loot.
  **Lowest risk of all candidates** — it enhances a structure already
  confirmed generating in this exact pack (MODS.md: "desert temples...
  still generate"), not a new biome-gated structure.
- **Repurposed Structures** (Forge 1.20.1) — reskins vanilla structures
  per-biome (desert dungeons get Husk spawners instead of Zombie,
  Badlands get their own Desert Temple/Well variants) using only
  vanilla blocks. Doesn't need its own biome — it retextures whatever
  vanilla structure actually generates, which under this pack will
  always be the desert variant. Good complementary, low-risk fit.
- **Abandoned Structures** (Forge 1.20.1) — ruined houses, towers,
  dungeons with loot/mob spawns, described as spawning "across multiple
  biomes." Matches "settlements" directly — needs checking whether
  desert is actually one of its tagged biomes before assuming it'll
  appear here.
- **The Lost Cities** (Forge 1.20.1) — the strongest match for
  "abandoned cities" by far: ruined skyscrapers, apartment blocks,
  factories, roads, subways, flooded areas, loot-filled underground
  rooms. **Real conflict risk, flagged explicitly**: Lost Cities is
  historically known to work by supplying its own world/chunk
  generator layered onto terrain, which is exactly the category of mod
  that risks fighting this pack's own `overworld.json` override rather
  than just adding structures within it. Its own docs claim it "can be
  combined with other biome and terrain mods," but that needs verifying
  against this pack's specific *datapack-injected* override
  specifically, not taken on faith — highest-reward, highest-risk
  candidate here.
- **Treasure2** (Forge 1.20.1) — the closest match to "loot chests like
  those gold ones": 18+ chest types across rarity tiers, locked with
  keys/charms, plus Mimic Chests (hostile creatures disguised as
  chests). Adds its own buildings too, so it inherits the same
  desert-tag question as Abandoned Structures — needs checking.
- Considered and set aside: **Mine Treasure** (mining-triggered loot,
  not exploration/structure-based — different mechanic than what was
  asked for) and **Craftable Loot Chests** (lets the player craft their
  own themed chests — the opposite of a discovery mechanic, doesn't fit
  "uncover more of the map" at all).

**Direct tie to the amulet mechanic, as asked:** this is exactly what
gives the amulet's border-crossing (see the "solidifying" addendum
under the Amulet idea below) something concrete to be *for* — pushing
past the current border early to reach one of these richer structures
before it's "officially" opened by the border's own growth, at the
cost of giving up the amulet's buffs. Ties the two ideas together with
real content, not just an abstract mechanic.

Nothing installed — all research, pending a call on which candidates
(especially Lost Cities, given its conflict risk) are worth the actual
compatibility check.

### Addendum (2026-08-20): relaxing "literal desert" — Biomes O' Plenty researched

Follow-up: doesn't need to be locked to vanilla's exact `minecraft:desert`
biome specifically — open to something like **Biomes O' Plenty** for
biomes that feel deserty without being that one literal tag.

**Confirmed real and relevant:** BOP is available for Forge 1.20.1
(requires **TerraBlender** as a hard dependency — how BOP and most
biome mods inject themselves into world gen). Of its 50+ biomes, the
standout arid-themed one is **Wasteland**: ground made of Dried Salt,
dead leafless trees, only scattered Dead Grass/Desert Grass, dust
particles drifting through fog, no passive/neutral mobs, Husks spawn
instead of Zombies. That's arguably a **closer match to this pack's
Fallout-post-apocalyptic aesthetic than plain vanilla desert** — it's
already "desolate wasteland" by design, not just "sandy." Also has
**Lush Desert** and **Cold Desert** (cold desert is likely off-theme
for this pack specifically). Couldn't confirm whether BOP's classic
Outback/Mesa-style biomes are still in the current 1.20.1 build without
checking the wiki directly — flagged, not assumed.

**Real technical complexity, worth being honest about rather than
implying "just install it":** BOP by default adds *all* 50+ of its
biomes into world generation, not just the arid ones — getting "several
deserty biomes, nothing else" needs actively curating that down, and
this pack's current world-gen override (`biome_source: fixed`, locked
to one literal biome ID) can't express "a themed subset" at all as
currently written. Two real paths, meaningfully different effort:
- **Simple path (matches this pack's established pattern of staying
  small first):** keep the exact same `fixed` mechanism already
  working — just point it at `biomesoplenty:wasteland` instead of
  `minecraft:desert`. Zero new technical risk, same one-file override,
  same proven pattern, immediate aesthetic upgrade toward the actual
  Fallout brief. Adds one new hard dependency (TerraBlender) but no new
  world-gen complexity.
- **Richer path (real biome variety, real cost):** replace the `fixed`
  biome source with a proper `multi_noise` one carrying a curated
  parameter list of just the chosen arid biomes. Directly researched
  this is hard to hand-author — "making a biome source that places
  biomes according to terrain by hand is borderline impossible" — but a
  purpose-built community tool exists specifically for this
  (**Whitelist-Minecraft-Biomes**, a Python generator that produces the
  parameter-list JSON for a chosen biome subset), which meaningfully
  de-risks it. Also intersects with TerraBlender's own region-weighting
  config (`terrablender.toml`), which doesn't currently seem to have
  mature support for "only include these specific biomes" — another
  real unknown to resolve before committing to this path.

**Recommendation, following the same small-first pattern already used
elsewhere in this file:** the simple path (swap the fixed biome ID to
Wasteland) gets a real, better-fitting aesthetic win for near-zero
technical risk, and doesn't foreclose the richer multi-biome version
later — it's the same override mechanism either way, just a bigger
rewrite of one file when that's actually wanted. Not decided or built —
a recommendation, not a decision made here.

**Decided (2026-08-20): go with the simple path now, richer multi-biome
version stays recorded above as the explicit future upgrade** — same
"small scope first" pattern as everything else in this file. Sent as a
build instruction to the other implementation session:

> **Feature: swap the forced world biome from vanilla desert to Biomes O' Plenty's Wasteland**
>
> Context: the pack currently forces every world to generate as one
> fixed biome via a datapack override
> (`kubejs/data/minecraft/dimension/overworld.json`,
> `biome_source: {"type": "minecraft:fixed", "biome": "minecraft:desert"}`).
> Biomes O' Plenty's **Wasteland** biome (Dried Salt ground, dead
> leafless trees, dust-through-fog, Husks instead of Zombies) is a
> closer fit for this pack's Fallout-post-apocalyptic aesthetic than
> plain vanilla desert. Keep the exact same override mechanism — this
> is a one-value swap, not a world-gen rewrite.
>
> Build:
> 1. Add **Biomes O' Plenty** and its hard dependency **TerraBlender**
>    to the mod list (Forge 1.20.1 builds of both confirmed available).
> 2. In `overworld.json`, change the `biome` value from
>    `"minecraft:desert"` to `"biomesoplenty:wasteland"` — same
>    `fixed` biome-source structure, just a different biome ID.
> 3. **Verify structure compatibility didn't just break.** The
>    already-confirmed-working vanilla desert temples/wells/villages
>    (see MODS.md's Fixed spawn entry) generate because they're tagged
>    for desert-like biomes — Wasteland may or may not carry the same
>    structure-placement tags. Check in-game whether those structures
>    still appear, since this pack's whole "structures spawn around the
>    player" satisfaction depends on it, not just the ground texture
>    changing. If structures stop generating, that's the first thing to
>    debug, not a surprise to work around blindly.
> 4. Sand-resurfacing work already planned/built for the
>    flatten-a-wider-radius-around-spawn feature (see above) should
>    reconsider its resurface block choice too — Dried Salt might read
>    better than sand once the biome itself is Wasteland, worth a call
>    once both land.
>
> **Recorded, not building now:** a richer multi-biome version (several
> curated BOP arid biomes together, not just one) is a real future
> upgrade — needs a proper `multi_noise` biome source with a curated
> parameter list, hard to hand-author but de-risked by an existing
> community tool (Whitelist-Minecraft-Biomes). See the research above
> for the full tradeoff. Don't build this now — the single-biome swap
> is the whole scope for this pass.

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

**Built 2026-08-19, directly relevant:** `pack/kubejs/server_scripts/mob_aggro.js`
now exists and does real aggro-forcing — it calls the standard vanilla
`Mob#setTarget(player)` on every wave mob, every 10 ticks, unconditionally
(bypassing vanilla's sight-based target acquisition entirely), because
`generic.follow_range` alone only helps a mob that can already *see* the
player. This is currently hardcoded to always target the player, which
is the opposite default from what the amulet idea wants — but it
confirms `Mob#setTarget()` is a real, working, standard vanilla method
callable from KubeJS (same confidence tier as `getX()`/`getServer()`).
If the amulet gets built, this file is exactly the mechanism that would
change: target the amulet's current holder or its pedestal location
instead of unconditionally targeting the player.

### Addendum (2026-08-19): worn buffs + pedestal as a border-exit valve

More detail on how the two amulet states (worn vs. pedestal) would
actually differ, beyond just where mob-aggro is anchored:

- **Worn:** player gets buffs, and their defensive contraptions (the
  Tier 1–4 machines in the design notes' Machine Progression section)
  get buffs too. Amulet stays with the player, so this is the "aggro
  follows me" state.
- **On pedestal:** amulet anchors aggro at the base instead — and, new
  detail, this is specifically what *permits* the player to leave the
  base and go beyond the currently-permitted area. Framed as a
  deliberate trade: give up your buffs (and hand mob attention to a
  fixed point) in exchange for freedom of movement outside the border.
- **Leaving triggers a penalty** — e.g. a boss-wave that night, or
  something similar. Not fully specified yet, but a boss-wave penalty
  would connect naturally to the "Boss waves tied to a Blood Moon
  event" idea above — leaving via the pedestal could be one of the
  triggers for that event, rather than (or alongside) whatever
  schedule/mechanic ends up driving it.

**Direct connection to base expansion:** "the permitted area" here is
almost certainly the same boundary as the `/worldborder` hard wall
decided in "Base expansion gated like Twilight Forest progression"
above. That's notable because it gives a clean answer to the tension
flagged (and resolved-for-now) in that section — hard wall by default,
but the amulet-on-pedestal state becomes a deliberate, costed way to
step outside it, rather than needing to build full soft-gating to get
that flexibility. Worth revisiting both ideas together once either gets
picked up for real.

### Addendum (2026-08-19): solidifying — amulet is specifically the border-crossing key

Confirmed/tightened from the connection above, now the actual mechanic
being settled on: leaving the amulet on the pedestal in the base is
*specifically* what lets the player cross the `/worldborder`, whatever
its current (expanded) position is. The border keeps expanding on its
own via completed waves (per the "lootable buildings + distance-based
risk" addendum just above), opening up more territory and more
buildings worth looting — but the player can also choose to go take off
the amulet and push past the current border edge early, to reach
buildings further out than what's been unlocked yet.

The strategic tension this creates: wearing the amulet gives real buffs
(player + defensive machines), so taking it off to go past the border
has a real cost, not just the crossing-a-boundary risk. That naturally
makes the player weigh *when* it's worth it — better to wait until the
border has expanded into an area actually worth looting than to give up
buffs for a marginal reason. This sits alongside (doesn't replace) the
earlier-noted "leaving triggers a penalty, e.g. a boss-wave that night"
idea — the two costs (lost buffs + a possible penalty event) would
stack, making it a deliberately weighty decision rather than a free
action.

**Implementation note worth flagging for later:** vanilla's
`/worldborder` blocks *everyone* uniformly — there's no built-in way to
let one specific player cross based on whether they're carrying an
item. Making the border conditionally passable like this would need
custom per-player enforcement (e.g. a repeating function checking each
player's position against the border and their amulet state, applying
knockback/damage/teleport-back only when the condition isn't met)
rather than relying on `/worldborder`'s own pushback behavior for this
part. Not a blocker for the idea, just a note that "crossing" isn't as
simple as the plain command once it's conditional.

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

### Recommended next step (2026-08-20): build Tier 1, nothing exists to defend with yet (built 2026-08-29)

Flagged as the single biggest gap between what's built and the pack's
actual premise: waves, loot, mob-targeting, and atmosphere all work,
but there is currently **zero way to craft a defense** — the player
just melees everything with the starter sword. This also directly
undercuts the "Starter gear as a dead soul's leftovers" idea above —
that gear disappears at wave 5 with "it's up to you now," but right
now there's genuinely nothing built to have leaned on by then. Sent as
a build brief:

> **Feature: Tier 1 machines — Spike Trap, Palisade, Snare Trap**
>
> Context: no machines exist in the pack yet. This is the first slice
> of the "loot → craft machines → survive" loop the pack is actually
> named for. Build in this order — easiest/lowest-risk first, to bank a
> working win before the harder one:
>
> 1. **Wooden Palisade / Funnel Walls — build first, near-zero risk.**
>    This likely needs no custom logic at all: register a themed
>    wall/fence block, craft it from Common-tier loot materials (oak
>    logs, cobblestone — already in the Scavenger's Bag pool, see
>    `loot_bag_open.js`), and let vanilla pathfinding do the rest.
>    `mob_aggro.js`'s `setTarget()` only forces *who* a mob targets, not
>    *how* it paths there — normal pathfinding already routes around
>    solid blocks, so a placed wall should shape approach lanes for
>    free. Verify this assumption in-game before assuming it "just
>    works," same discipline as everything else in this pack.
> 2. **Simple Snare Trap — build second.** Vanilla cobwebs already do
>    almost exactly this (heavy movement slow on contact) — check
>    whether a reskinned cobweb-behavior block gets most of the way
>    there before building custom entity-collision detection from
>    scratch. Craft from Common-tier materials (string is already in
>    the loot pool for exactly this reason).
> 3. **Spike Trap — build last, most novel, most likely to need real
>    debugging.** Needs new territory for this codebase: damage-on-contact
>    plus a hit-counter that degrades/breaks the block after N hits.
>    Every other stateful mechanic in this pack so far has lived on
>    *player* persistent data (`td_*` flags) — per-block state (hit
>    count, broken/intact) is a genuinely new pattern, not something to
>    assume works the same way without checking. Craft from Common-tier
>    materials (iron nugget/ingot, bone already in the pool).
>
> All three should be **Tier 1 = no power, no fuel, breakable/cheap**
> per the existing Machine Progression design — don't reach for the
> Power System section below yet, that's Tier 3+ scope. Recipes should
> pull from materials already in the Scavenger's Bag (Common tier) loot
> pool specifically, not invented materials — keeps this consistent
> with the standing vanilla-materials-only loot decision.

**Built (2026-08-29), same order as the brief.** First time this pack
has registered a custom *block* (only items before now) — researched
KubeJS's actual 1.20.1 block-registration capabilities directly rather
than assuming (`.textureAll()`/`.texture()` for reusing vanilla textures
with zero new art, the built-in `fence` block type for real vanilla
fence behavior, `Java.loadClass(...IntegerProperty)` for a custom
blockstate). See `docs/MODS.md`'s Tier 1 machines entry for the full
implementation and the risk-reduction calls made for Spike Trap
specifically (avoided reading the custom blockstate property from
script code at all — genuinely unconfirmed whether that's even
possible — by running the whole hit/degrade sequence as a chain of
`/execute if block` commands instead, standard vanilla syntax with zero
KubeJS-specific uncertainty). Palisade uses oak_log's texture (not
planks) for a "raw stakes" look; Snare Trap crafts real vanilla cobweb
from string with a custom display name via NBT rather than reskinning
cobweb's collision/slow behavior from scratch; Spike Trap's recipe uses
cobblestone + iron_nugget (the brief also suggested bone — iron_nugget
alone was enough for a themed "metal spikes" recipe, bone left for a
future machine if one wants it). **None of the three confirmed in-game
yet** — Wooden Palisade is the safest bet (built-in vanilla block type),
Spike Trap the least certain (custom property + block-position reading,
neither directly confirmed against this exact KubeJS version).

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

## Boss waves tied to a Blood Moon event (built 2026-08-20, custom)

Core idea: make boss-wave nights coincide with a "Blood Moon" event from
a mod, so the wave feels extra scary via that mod's own atmosphere/spawn
changes (visual/sky effects, heavier or altered spawns) rather than
just a stat-scaling bump.

Specific mod not identified yet — several mods add a "Blood Moon"
event (e.g. a standalone Blood Moon mod), not currently in the mod
list ([MODS.md](MODS.md)). Needs a mod-list check (Forge/1.20.1
availability, compatibility with Epic Siege Mod/Pure Suffering and the
Wave Horn campaign) before this goes anywhere near a decision — logged
generic for now per your call.

**Correction (2026-08-20): TFTH is back in the pack, contradicting the
"removed entirely" note this used to have here.** It was re-added
(2026-08-19) with its own autonomous spawning explicitly disabled
(`enableIncubatorSpawn`, `enableFleshBlockSpread`, and related config
toggles turned off, since that system conflicted with "the Wave Horn is
the only mob source") — its mob types are folded into the curated wave
roster instead, summoned directly like any vanilla mob: `flesh_human`
(wave 2), `flesh_villager` (wave 3), `plaquecreaturetwo`/"Flesh Hunter
I" (wave 4), `flesh_suffer` (wave 5). So the campaign is no longer
vanilla-only, and this idea's compatibility check should include TFTH
again.

Possible connection: Pure Suffering already drives tiered invasion
events on its own schedule (see MODS.md) — worth checking whether a
Blood Moon mod could be the visual/atmosphere layer on top of an
existing Pure Suffering invasion, rather than a second, competing
event-scheduling system.

**Built (2026-08-20): custom, no mod.** Pure Suffering was removed from
the pack entirely on 2026-08-20 (footprint audit), so the possible
connection above is moot. Checked real mods first (Enhanced Celestials,
2.3M downloads, real Forge 1.20.1 build) but decided against adding one
without first confirming it doesn't bring its own autonomous mob
spawning — the same class of conflict TFTH and Pure Suffering both
caused before their configs were hardened. Built custom instead: every
wave from the designed campaign's end onward
(`waveNumber >= WAVES.length` in `wave_spawner.js`, the same threshold
`wave_status.js`'s `FINAL_WAVE` already caps display at and removes
starter gear on) is a Blood Moon — a distinct "BLOOD MOON RISES" title
and a single denser fog lever (`MaxDistance` 32→24), **not** a mob-
count/stat change, matching this idea's own framing ("feels extra
scary via atmosphere... rather than just a stat-scaling bump"). Means
the moment starter gear disappears is also the first Blood Moon — a
deliberate thematic pairing (training wheels off = the real danger
starts), not a coincidence worth decoupling.

## Pack aesthetic: Fallout-TV-series post-apocalyptic desert Southwest

Core idea: the pack's overall look and feel should evoke the *Fallout*
TV series — post-apocalyptic mid-America/southwest, desert setting,
scrappy DIY-craft vibe. Two levers to get there:

1. **Quest book & shop text/flavor.** The FTB Quests chapters (see
   "Quest book (FTB Quests) implementation plan" above) carry the theme
   through narrative framing — written as a diary/journal left behind by
   a previous, unfortunate occupant of the base, with new entries/
   mysteries unlocking as the player progresses through chapters. This
   is a content layer on top of the quest book mechanics already noted
   above, not a separate system — chapters/dependencies/task types stay
   as planned, this just decides what the text says and how it's framed.
2. **Block/item palette.** The actual build materials available in the
   pack should visually support the theme (scrap metal, rust, sun-worn
   wood, sandstone/desert terrain, corrugated/salvage-looking blocks)
   rather than defaulting to vanilla-clean textures. Not detailed yet —
   which mods actually supply a matching desert/scrap/wasteland blockset
   is an open question, needs research before it goes near a decision.

Note: this is a separate, aesthetic layer on top of the gameplay theme
already decided in [ROADMAP.md](ROADMAP.md) ("tower defense... waves
threaten the base... horde-density") — doesn't conflict with it, just
adds the visual/narrative skin on top of the existing mechanical
identity.

**Priority (2026-08-19):** custom/scrap-themed loot stays deferred —
"we'll get to custom loot at some point," vanilla-materials-only stands
for now, no change to that resolved decision. Immediate focus for this
idea is the other two pieces: (1) the quest book's diary/flavor-text
element, and (2) finding a solid mod list that actually gives the means
to visualize the aesthetic (desert/scrap/DIY blocks and decor) — that
mod-list research is the next concrete step here, ahead of writing any
actual quest content or loot rework.

### Mod-list research (2026-08-19)

Checked what's actually available for Forge/1.20.1. Current world setup
has zero aesthetic decisions baked in yet — the only existing base-build
script (`playtest_starter_kit.js`) is explicitly "playtest convenience
only, not real pack design," plain stone-brick/cobblestone on default
Superflat. Genuinely a blank slate.

**Decoration-only candidates (low footprint, no new mechanics):**
- **ZCraft: Zone Decor** (Forge 1.20.1, Modrinth + CurseForge, by
  NothingTs) — military crates, fuel barrels, tires, damaged
  appliances, industrial clutter, rusted structures. Built specifically
  for wasteland/STALKER-style/ruined-city builds — closely matches the
  brief. Small, decoration-only.
- **Doomsday Decoration** (Forge 1.20.1, CurseForge, by Huzai, 2.2M+
  downloads — well-established) — worn furniture, discarded
  belongings, ruin-building materials, apocalyptic clutter. Small file
  size (2–9MB depending on version). Decoration-only, no mechanics.
- Together these two look like the strongest, safest pick for the
  "DIY/scrap post-apocalyptic" half of the look — pure decoration, no
  mechanical footprint, both already confirmed on Forge 1.20.1.

**Mechanics mod, not just decor (needs a deliberate call, not an
aesthetic freebie):**
- **Scrap Tech Workshop** (Forge + Fabric, 1.20.1; NeoForge planned) —
  actual scavenge → assemble → recycle → expand gameplay loop: Scrap
  Piles, a Recycler, a battery-powered Scrap Multitool. Visually
  on-theme, but it's a real mechanics mod, not pure decoration.
  **Notable connection:** its Recycler is functionally the same idea as
  the "Disassembler-style mechanic: break down excess loot into
  lower-tier materials" from the Loot & Crafting Materials notes above
  (currently deferred) — this mod could be how that mechanic actually
  gets implemented later, rather than building it from scratch. Worth
  keeping in mind when custom loot gets picked back up, not decided now.

**Desert/Southwest building-block mods — dead end.** Specifically
adobe/stucco-style mods (The Adobe Mod, Adobe Blocks 2, More Adobe) are
all 1.7.10-era and unmaintained — not usable on 1.20.1.
**Recommendation: lean on vanilla's own desert palette** (sandstone,
red sand, terracotta, dead bush, cactus, mud/packed mud) for the
Southwest-desert half instead of hunting for a dedicated mod — zero
footprint cost since nothing new needs installing, and vanilla already
has real range here (terracotta alone comes in every color for
weathered/painted-adobe looks).

Open questions:
- Final call on ZCraft: Zone Decor + Doomsday Decoration as the
  decoration pick — not installed yet, just researched.
- Scrap Tech Workshop stays a "later, alongside custom loot" decision,
  not an aesthetic-only pick, given it adds real mechanics.
- Whether the vanilla-materials-only loot bag decision (see "Loot
  materials" conflict resolution above) sits comfortably with a
  scrap/salvage aesthetic long-term — deferred, not blocking anything
  now.

## Fixed spawn + prebuilt starting building(s), every world (fixed-spawn half built 2026-08-20)

Core idea: every time a new world is created, the player spawns in the
same fixed spot with the same prebuilt building(s) already there — the
starting point for expanding/defending, not something the player has to
build from scratch.

### How to actually pin this down (vanilla/datapack, no custom Java)

- **`/setworldspawn <x> <y> <z> [angle]`** — sets the world's spawn
  point outright. Run it once from a datapack `#minecraft:load`
  function tag so it fires the moment the world/datapack loads.
- **`gamerule spawnRadius 0`** — vanilla nudges first-time spawns
  within a radius of world spawn by default (10 blocks); zeroing this
  removes that scatter so the player always lands on the exact tile.
- **`/place template <id> <pos> [rotation] [mirror] [integrity] [seed]`**
  — the vanilla 1.20 command for stamping a `.nbt` structure at a fixed
  location deterministically. This is the concrete mechanism for the
  "export as `.nbt`, auto-place via datapack function" step already
  noted in the base-expansion addendum above — worth linking the two
  ideas rather than treating them separately.
- **Guard with a one-shot flag** (scoreboard dummy objective or
  similar) so the `load` function only stamps the structure/spawn once
  per world, not on every server restart — otherwise it'll keep
  re-placing the building over whatever the player has since built or
  torn down there.
- Current real implementation (`playtest_starter_kit.js`) doesn't do
  any of this yet — it builds relative to wherever the player happens
  to first spawn, and is explicitly marked "playtest convenience only,
  not real pack design." This idea is the actual fixed-spawn version of
  that, for whenever it's picked up for real.

**Built (2026-08-20), with one deliberate substitution.** `setworldspawn`
+ `gamerule spawnRadius 0` + a one-shot guard (`td_playtestKitGiven`,
already existing) built exactly as this plan describes. The structure
half didn't use `/place template` as literally suggested — hand-
authoring a raw `.nbt` structure file with no way to test it in-game
before committing it is real unverified risk for zero benefit, when the
`/fill`+`/setblock` code that builds the starter base is *already*
proven working in real playtests. Reused that code directly, just
re-anchored to the fixed point instead of the player's arbitrary spawn
position. Same outcome (fixed spot, prebuilt building, every world),
lower-risk mechanism — worth being explicit that this is a substitution
made for risk reasons, not because `/place template` doesn't work.

X/Z hardcoded to `(0, 0)` (vanilla's own default flat-world spawn
already lands near there). Y deliberately *not* hardcoded — read from
the player's own natural first-spawn Y (before any teleport), since
flat-world layer height depends on whichever preset the player picked
at world creation and guessing it wrong risks spawning underground or
floating. Only affects **brand new worlds** — a world already past its
first login is unaffected, same as every other `PlayerEvents.loggedIn`
one-shot in this pack. Not yet confirmed in-game (needs a fresh world to
test, not just a relaunch of an existing save).

### Seed research, for a real-terrain option

Looked for existing Java 1.20.1 seeds with strong desert/badlands/mesa
terrain near spawn, in case real generated terrain (rather than
Superflat) ends up being wanted for the aesthetic backdrop:
- Seed `-1319064447470609949` — desert village near badlands.
- Seed `42988917536538687` — desert/badlands/jungle multi-biome island
  spawn with a village, reported spawn coords (20, 84, 323).
- A couple of other "canyon in a Mesa biome, desert village ~200 blocks
  away" and "every biome within 1000m of spawn" seeds turned up too,
  but without a citable seed number in what was found — would need
  direct verification before relying on either.
- **Caveat:** pulled from seed-listing sites, not verified in-game —
  treat as leads to check, not confirmed picks.

**Resolved 2026-08-19:** stay on Superflat for now — the pack's current
setup deliberately uses it to *avoid* real-terrain complexity (see the
base-expansion addendum above), and that simplicity is worth keeping
while other bugs are still being ironed out. The real-seed option (with
the "only flatten the footprint under the starting building, leave the
rest natural so `/worldborder` reveals real desert terrain" middle path)
stays noted here as the later upgrade to revisit once the pack is more
stable — not blocking anything now.

**Superseded (2026-08-20): moved off Superflat, and off seed-hunting
entirely.** Direct request: "creating a world that isn't entirely flat,
and have some other structures been spawned around the player." None of
the candidate seeds above could actually be verified — Chunkbase's seed
map is a JS-rendered interactive tool, not fetchable without running the
game, so they stayed unverified leads exactly as flagged. Rather than
gambling on one, switched to vanilla's **Single Biome: Desert** world
type — deterministic (desert terrain everywhere, no seed needed) and
still runs normal structure generation within that biome (temples,
wells, ruined portals, villages), satisfying both "not flat" and
"structures around the player" without needing a specific seed at all.
The "flatten only the footprint" middle path this section already
proposed is exactly what got built — see `docs/MODS.md`'s Fixed spawn
entry. Seed-hunting for a specific desert seed is now moot; leaving the
leads above as historical record, not a live open question.

**Automated the same day** — initially required manually picking
"Single Biome: Desert" via Customize on the world-creation screen; user
asked not to need that at all. Shipped as a datapack override instead
(`kubejs/data/minecraft/dimension/overworld.json`, via KubeJS's `data/`
injection), replacing the vanilla `overworld` dimension's generator
directly — every world generates as Desert automatically now,
regardless of what's clicked on the creation screen. See
`docs/MODS.md`'s Fixed spawn entry for the exact mechanism.

**Seed-hunting reopened, then reconsidered again (2026-08-20).** Asked
in this session for seeds that are "relatively flat and not caves,"
since enemies will spawn there, with the spawn area meant to reflect
that starting feel. Worth being precise about what the override above
actually does before chasing this further: it only forces the
**biome** to desert (`biome_source: fixed`) — the generator is still
plain `minecraft:noise` with vanilla's standard `overworld` settings,
so terrain height, ravines, and caves all still generate exactly as
normal, just always tagged desert. So "flat, no caves" is a real,
separate concern from the biome decision, not something already solved
by it.

**But: this is the exact same unverifiable-seed trap the pack already
hit and deliberately avoided once.** The reason Single Biome: Desert
got picked over a specific seed in the first place was that none of the
candidate seeds above could be verified — Chunkbase's seed map is
JS-rendered, not fetchable without actually running the game. That
limitation hasn't changed. Chunkbase's **Seed Finder** app does support
searching by terrain condition (not just biome/structure), which is the
right *tool*, but any specific seed it or a search turns up still can't
be confirmed flat-near-spawn without opening it in-game — same
unverified-lead problem, just with a better search tool underneath it.

**Recommendation: don't gamble on a seed a second time — extend the
approach that's already worked twice instead.** The starter base's own
footprint already handles uneven terrain deterministically, regardless
of seed — a stone foundation dug 3 blocks down plus headroom cleared 3
blocks up, built via `/fill`, per `docs/MODS.md`'s Fixed spawn entry.
The same technique (flatten a wider radius via command, not by hoping
the seed cooperates) would guarantee a flat, cave-free spawn area no
matter what seed the world uses — deterministic, testable, and doesn't
depend on trusting an unverified web-search lead a second time. Not
built — a recommendation to weigh against actually seed-hunting, not a
decision made here.

**Sent as a build instruction to the other implementation session
(2026-08-20):**

> **Feature: flatten a wider radius around fixed spawn, deterministically, seed-independent**
>
> Context: the pack now generates every world as Single Biome: Desert
> (`kubejs/data/minecraft/dimension/overworld.json`), but that override
> only fixes the *biome* — terrain height, ravines, and caves still
> generate under standard vanilla `overworld` noise, so the area around
> the fixed spawn point isn't guaranteed flat or cave-free. Seed-hunting
> for a naturally flat spot was considered and rejected — it's the exact
> unverifiable-lead problem that already caused the earlier move away
> from a specific seed toward Single Biome: Desert in the first place
> (Chunkbase's seed map can't be checked without actually running the
> game). Building this deterministically is the more reliable path,
> consistent with what's actually worked in this pack so far.
>
> Build:
> 1. **Reuse the existing technique, wider.** The starter base's own
>    footprint already handles uneven terrain deterministically — a
>    stone foundation dug 3 blocks down (covers local dips/dunes) plus
>    headroom cleared 3 blocks up (covers local rises), via `/fill` (see
>    `playtest_starter_kit.js`, per `docs/MODS.md`'s Fixed spawn entry).
>    Apply the same foundation-dig + headroom-clear pattern over a wider
>    radius — matching the starting worldborder size (`base_expansion.js`
>    auto-sets this to **50, the border's diameter**, so roughly ±25
>    blocks from the fixed spawn point on each axis, not ±50).
> 2. **Resurface the top layer as sand**, not exposed stone — the
>    starter base building itself already has its own floor
>    (stone_bricks per the existing kit), but the open ground around it
>    should read as flat desert, not a stone quarry. Set the surface
>    layer explicitly to `minecraft:sand` (or a sand/sandstone mix) after
>    leveling.
> 3. **One-shot, same trigger as everything else in this flow** — gate
>    on the same one-time guard already used for the starter kit/fixed
>    spawn (`td_playtestKitGiven`-style flag), so this only runs once on
>    a brand-new world, not every login.
> 4. **Watch vanilla's `/fill` block-count limit** (default 32,768 blocks
>    per command, via the `commandModificationBlockLimit` gamerule) — a
>    ~50x50 area across several Y-layers (foundation + headroom) should
>    stay under that per layer, but confirm the actual math before
>    assuming one `/fill` call covers the whole volume; chunk into
>    per-layer or per-quadrant `/fill` calls if not. This is exactly the
>    kind of "should be fine" assumption that's been wrong before in this
>    codebase (Math.PI, bare `.x/.y/.z`) — verify, don't assume.
> 5. **Don't forget the vertical extent of caves/ravines** — a ravine
>    deeper than the 3-block foundation dig would still leave a gap
>    underneath. Consider filling solid stone down further (or checking
>    for air below the foundation layer and back-filling it) rather than
>    assuming 3 blocks is always enough, since this is now covering a
>    much larger area than the original 11x11 footprint it was designed
>    for.

## Confirmed working: right-click-item + mob-summon pattern (Wave Horn, 2026-08-19)

Good news worth recording here, not just in conversation: the Wave Horn
(`kubejs:wave_horn` — right-click to summon vanilla mobs, see
`pack/kubejs/startup_scripts/wave_horn.js` and
`pack/kubejs/server_scripts/wave_spawner.js`) **works.** It's the
closest existing proof that the mechanics several ideas above lean on
are actually achievable in this pack, not just theoretical.

Getting there took nine rounds of real, undocumented bugs in the first
playtest alone, all root-caused and fixed (full story in that file's
comments, `docs/MODS.md`, and git history — corrected/expanded here
from an earlier, incomplete version of this list):
1. No texture — cosmetic, not logic, fixed separately later.
2. **Wrong command permission** — `/summon` run via
   `player.runCommandSilent(...)` uses the *player's own* permission
   level, not necessarily enough for `/summon` (needs level 2) even
   with cheats on. Fix: `player.getServer().runCommandSilent(...)`
   (console-level, always full permission). The same bug existed in
   `base_expansion.js`'s `/worldborder add` call too.
3. Vanilla's Goat Horn has a built-in cooldown that silently blocks
   `ItemEvents.rightClicked` from firing at all — use a plain custom
   item instead of reusing a vanilla item that has its own cooldown.
4. **Correction:** `event.player` looked broken but was a red herring —
   `PlayerEventJS` (the shared parent class) defines `getPlayer()`
   returning the same thing as `getEntity()`, so `.player` was valid
   the whole time via inheritance. Switched to `.entity` anyway while
   chasing a different bug, but the earlier version of this note
   wrongly stated `.player` doesn't exist — it does.
5. `const`/`let` inside these repeated callbacks throws a Rhino
   "redeclaration of var" error on the second invocation — use `var`.
6. Touching `event.level.isClientSide` throws a `NullPointerException`
   unconditionally in this environment — avoid it; a persistent-data
   dedup guard covers the same need.
7. `ItemEvents.rightClicked` and `BlockEvents.rightClicked` both fire
   for the same click when a block is targeted (contrary to Forge's own
   documented behavior) — needs a dedup guard, not just one handler.
8. `player.x/.y/.z` resolve to `NaN` — use `getX()/getY()/getZ()`. This
   also silently broke `wave_status.js`'s distance check and meant
   `playtest_starter_kit.js`'s starter base had never actually been
   built in any test world.
9. **`Math.PI` itself evaluates to something unusable** in this
   environment — `Math.random()/cos()/sin()/floor()` all work
   individually, but any expression multiplying by `Math.PI` comes out
   `NaN`. Fixed by using the literal `6.283185307179586` (2π) instead.

**Why this matters for the ideas above** — several would lean on this
exact pattern (custom right-click item, and/or summoning
mobs/entities, and/or player-position math), so they inherit both the
good news and the checklist:
- **Amulet** (worn/pedestal item, buffs, mob-attraction anchor) — a
  wearable/placeable right-click item is the same category of thing as
  the wave horn. Check against all nine points above before assuming a
  fresh implementation of it will "just work" the first time.
- **Boss waves tied to a Blood Moon event** and the **lootable
  buildings / distance-based risk** addendum under base expansion —
  both would likely reuse `wave_spawner.js`'s own summon-command
  pattern (`server.getServer().runCommandSilent` +
  `getX()/getY()/getZ()` + the radius-check pattern in
  `nearbyWaveMobCount`) rather than reinventing it from scratch.
- The quest book (FTB Quests, `.snbt`) is a different tech stack
  entirely, not KubeJS/Rhino — none of the nine necessarily apply there,
  but it almost certainly has its own undiscovered quirks that need the
  same loop to catch.

**General takeaway to carry forward:** modded Minecraft + KubeJS docs
frequently don't match runtime behavior (Forge's own docs were wrong on
point 7 above) — every idea in this file should be assumed to need the
same small-change/test-in-game/write-down-why loop that got the wave
horn working, not treated as evidence anything here is unrealistic.

## Discussion: prefer an existing mod's mechanic over custom code, when one genuinely fits

Raised after the Wave Horn/loot bag debugging sagas above: given how
much back-and-forth custom KubeJS took to get right, is it better to
lean on a pre-existing mod when one is relevant, rather than writing
extensive custom code?

Two data points from this pack's own history cut in opposite
directions, worth keeping in mind rather than picking a blanket rule:
- The loot bag bugs weren't really evidence that custom code itself is
  risky — the real root cause was a `packwiz export` flag silently
  dropping server-only mods, and a README documenting a method
  (`.thenAdd`) that doesn't exist. That friction doesn't disappear by
  using a mod instead of hand-built items — integrating any mod into
  this pack's specific design still needs KubeJS glue (the original
  design notes' own plan for a "Loot Bags mod" was "reskin/re-tier via
  KubeJS," not zero code).
- The Wave Horn's curated, deterministic 5-wave campaign genuinely
  *couldn't* be a mod — Pure Suffering already does wave-style
  invasions and was deliberately rejected for this specific job because
  it's semi-random and hard to tune/debug in-game (see
  `wave_spawner.js`'s own comment). That one was custom by necessity.

**Working guideline:** prefer a mod's mechanic *wholesale* (not just as
a texture/reskin source) whenever one genuinely does the specific job —
that's where custom code actually shrinks, since nothing equivalent
needs hand-building. Scrap Tech Workshop's Recycler standing in for the
deferred Disassembler idea (see "Loot & crafting materials" above) is
exactly that case. Weigh it each time against the pack's existing
"keep footprint small" principle (ROADMAP.md) — more mods trades
hand-written-bug risk for mod-compatibility-surface risk, it doesn't
remove risk outright. Same checklist MODS.md's own "Adding a mod"
section already uses.

Not yet applied as a pass over every idea in this file — offered, not
done, pending the call on whether it's worth doing as a dedicated pass.

### Full pass (2026-08-19): mod-vs-custom check on every idea above

Went through each mechanic in this file and checked whether an existing
Forge/1.20.1 mod could take the job wholesale, does only partially, or
whether it's inherently pack-specific and has to stay custom regardless.
New research (not previously in this file) marked **NEW**.

| Idea | Verdict | Notes |
|---|---|---|
| Base expansion (`/worldborder` growth on waves cleared) | Stays custom (already minimal) | The border mechanic itself is a **vanilla command**, not a mod — nothing to swap. The only "custom" part is the trigger (watch wave count via `wave_status.js`), which is inherently specific to this pack's own Wave Horn campaign; no mod tracks that. |
| Lootable buildings further from base | **NEW** — mod could take most of it, but blocked by a standing decision | **Abandoned Structures**, **Massive Ruined City**, and **Apocalypse Structures: Abandoned City Buildings** (all Forge 1.20.1) generate ruined buildings with loot chests/mob spawns — could replace hand-building + hand-placing structures + hand-writing their loot entirely. **Caveat:** these rely on real terrain generation to place structures naturally, which conflicts with the standing "stay on Superflat for now" decision above. Real option, but gated behind that other decision, not a free win today. |
| Amulet — mob-attraction (worn item / pedestal block) | **NEW** — strong mod fit, biggest scope-reduction found in this pass | **Item & Block Attraction** (Forge 1.20.1, `.toml`-configurable) lets specific mobs be attracted to a specific block *or* held item, with tunable radius — matches both amulet states (worn = item, pedestal = block) directly. **Aggro Fix**'s "Aggrobaiting" enchantment (Forge 1.20.1, datapack-configurable) is a close alternative for the worn-item case specifically. Either would cut out the hardest, riskiest part of this idea — hand-built mob-targeting logic — almost entirely. |
| Amulet — worn buffs (player + machines) | **NEW** — mod covers the framework, not the specific buffs | **Curios API** + a trinket mod like **Fancy Trinkets** (2.7M downloads, Forge 1.20.1) gives the equip-slot + buff-on-wear framework wholesale, instead of hand-writing right-click-equip logic from scratch (same category of risk as the Wave Horn's right-click saga). The *specific* buffs (defensive-machine buffs specifically) would still need custom KubeJS glue — no mod knows about this pack's own Tier 1–4 machines. |
| Amulet — pedestal as border-crossing key, boss-wave penalty on leaving | Stays custom | Inherently pack-specific (conditional `/worldborder` passage tied to this pack's own amulet state, triggering this pack's own wave system) — no mod does this exact thing. Already flagged as needing custom per-player enforcement logic above. |
| Machine progression (traps, turrets, Tesla coils, tiers) | Already mod-first, confirmed | Original design notes already leaned on **SecurityCraft** (already installed), **Immersive Engineering/IC2-style Tesla Coil**, **Thermal Expansion/Mekanism/Industrial Foregoing** as templates — this idea was mod-oriented from the start. Remaining work is KubeJS glue tying existing mod blocks into this pack's tier-material economy, which is inherent integration work regardless of approach. |
| Power system (wireless power for Tier 3–4 machines) | Already mod-first, confirmed | **Flux Networks** / **RFTools Power Cells** — no custom power system needed, just hooking machines up. No change from original plan. |
| Quest book + shop | Already mod-first, confirmed | **FTB Quests** (+ optional **QuestShop**) — the actual work is `.snbt` data authoring, not code. Most mod-reliant idea in this whole file already. |
| Boss waves tied to Blood Moon | Already mod-first (mod not yet picked) | No custom code was ever planned here — just needs a specific Blood Moon mod chosen and checked for compatibility with the deterministic Wave Horn campaign (does its extra spawning interfere with the curated wave composition?) — worth adding to that check when a candidate mod is picked. |
| Custom loot materials / Disassembler | Partial — already noted | **Scrap Tech Workshop**'s Recycler already flagged (above) as the mod-wholesale option for the *Disassembler* mechanic specifically. The invented tier-materials themselves (Scrap, Bone Shards, etc.) would still need custom KubeJS items/loot tables regardless — no mod invents this pack's specific fictional material names. Deferred either way per the earlier resolution. |
| Fixed spawn + prebuilt building | Stays custom (already minimal) | `/setworldspawn`, `gamerule spawnRadius`, `/place template` are all **vanilla commands** wrapped in a small datapack function — about as close to "not custom code" as this gets already. No mod meaningfully replaces a few vanilla commands with less risk. |
| Pack aesthetic block palette | Already resolved mod-first | **ZCraft: Zone Decor** + **Doomsday Decoration** — decoration-only, no mechanics, already the outcome of the earlier research pass. |
| Night-based mob scaling | Already resolved mod-first | **Epic Siege Mod + Pure Suffering** handle escalation now; the hand-written script stays deferred. Already aligned with this lens before it was named. |
| Soft danger-gating for zone locking (the original Twilight Forest open question) | Deferred, not researched deeply | Not urgent since the hard-wall approach was chosen for now. If revisited: region/zone-effect mods exist (e.g. apply a debuff on entering a defined area) but weren't researched in depth this pass since the underlying idea is already parked. Worth a proper look only if soft gating actually gets picked up. |

**Overall takeaway:** the amulet idea is where this pass changes the
picture most — two real mods (Item & Block Attraction, Curios/Fancy
Trinkets) could take on its two hardest pieces (mob-targeting and
buff-on-wear) almost entirely, leaving only the pack-specific glue
(pedestal-as-border-key, penalty trigger) as genuinely custom. Most of
the rest of the file was already mod-first by design — this pass mainly
confirms that rather than changing it, with lootable buildings being
the one idea whose mod option is real but currently blocked by the
Superflat decision.

## General rule: loot rarity should drive drop rate and enemy-tier gating

Stated as a rule to hold regardless of what implements it (mod or
custom code), not just for the loot bag system specifically:
1. **Drop rate scales inversely with rarity** — the more common a bag
   tier, the more likely it is to drop, on a per-kill basis.
2. **Higher-tier drops are reserved for higher-tier enemies only** — no
   overlap where a lower-tier enemy can roll a higher-tier bag.

**Resolved and built 2026-08-19** — fixed in the real implementation
session, confirmed by re-checking `loot_bag_drops.js` and
[MODS.md](MODS.md) after the fact:
- **Rule 2 held from the start**, confirmed still true: Common mobs
  only roll Scavenger's Bag, Uncommon mobs only Fortified Cache, Rare
  mobs only Warlord's Hoard — no cross-tier bleed.
- **Rule 1 is now fixed to match.** Per-kill chances changed from
  Common 15% / Uncommon 25% / Rare 75% (backwards) to **Common 50% /
  Uncommon 25% / Rare 10%** — common bags are now genuinely the ones
  you see most often, and a Warlord's Hoard stays a real event even off
  a mini-boss kill.
- Same pass also: expanded the Common pool with base-building/survival
  staples (cobblestone, oak logs, bread, cooked beef, apple) so a fresh
  base has stone/wood/food covered before scrap materials matter, added
  a quality gradient across all three tiers (Rare now includes
  low-weight late-game vanilla items like netherite ingot and totem of
  undying), and added hand-authored placeholder textures for all three
  bags, color-coded to each tier's rarity color.

## Wave-clear reward: a building/machine places itself in the base

Core idea: on defeating a wave (exact cadence TBD — maybe only after a
boss wave, not every wave), a building, block, or machine automatically
places itself somewhere in the player's base — not something the player
built or crafted, just appears as a reward. The intent is a sense of
*receiving* things during progression, either because you can't yet
afford to craft them (materials-gated) or, alternatively, because
they're not craftable at all — the wave-reward is the *only* way to get
them.

**Open fork, not yet decided — worth flagging since it's a real design
split, not just phrasing:** those two framings lead to different
places. "Can't afford to craft it yet" implies these are the same
Tier 1–4 machines from the Machine Progression notes above, just
front-loaded as a taste of what crafting will eventually unlock.
"Can't craft it at all" implies a separate category of reward-exclusive
content, distinct from the craftable machine tiers entirely. Which one
(or both, for different specific rewards) shapes a lot of downstream
design — worth pinning down before building either.

Cross-links:
- **Technique reuse:** placing a structure into a fixed location is the
  same problem the "Fixed spawn + prebuilt building" idea above already
  solved — `/place template <id> <pos> ...` (the vanilla 1.20 command)
  is the mechanism, just triggered by a wave-clear count instead of
  world-load. `base_expansion.js` already establishes the pattern of
  "watch `wave_status.js`'s wave-clear state, trigger a placement" —
  this would very likely be a sibling script to it, not a new pattern.
- **Mod-vs-custom lens:** likely stays custom, same category as
  `base_expansion.js` — the specific behavior (a themed structure
  gifted at a specific wave-clear cadence) is pack-specific enough that
  a generic "supply crate" mod probably wouldn't match without heavy
  reconfiguration, and the placement mechanism itself is already a
  vanilla command, not something a mod would meaningfully replace.
- **Quest book:** FTB Quests already supports "kill"/"advancement" task
  types tied to real milestones (see "Quest book (FTB Quests)
  implementation plan" above) — worth checking whether wave-clear
  rewards are better modeled as quest rewards (data-driven, no code)
  rather than a bespoke KubeJS trigger, if the cadence ends up simple
  enough for FTB Quests' own reward system to express.

Open questions:
- Exact cadence (every wave? only boss waves? some mix?) — explicitly
  deferred by you already, to tune later.
- **Where** in the base it places itself — a predetermined empty plot,
  a randomly chosen valid spot, or player-designated? Not addressed yet.
- Whether this overlaps with or replaces the loot-bag → craft-machine
  economy, or sits alongside it as a separate reward channel (similar
  to how "lootable buildings" was deliberately kept separate from the
  mob-drop loot bags above).

## Implementation clusters: where one build unlocks several ideas

Looked across everything logged above for shared machinery — cases
where building one piece of infrastructure once would deliver multiple
ideas, rather than each idea needing its own separate build. Six real
clusters found.

**1. Structure placement at a triggered location (`/place template`)**
Covers: fixed spawn + prebuilt building, base-expansion content
placement into newly-opened border area, lootable buildings further
out, and the wave-clear reward building/machine. All four are the same
underlying operation — stamp a `.nbt` template at a position, gated by
some watched condition (world-load / border-growth / wave-clear count).
None of this is built yet (`base_expansion.js` currently only grows the
border — MODS.md is explicit that it deliberately skipped the
hand-built `.nbt` structure step). A single generic "place this
template at this position" helper, plus a "pick where" allocator
(empty base plot vs. random valid spot in newly-revealed territory),
is genuinely one piece of work that unlocks four ideas — only the
specific template and trigger condition differ per feature.

**2. Wave-clear state as the universal trigger**
Covers: base expansion border growth (already built on this), the
wave-clear reward building, Blood Moon tied to boss waves, the
amulet's leaving-triggers-a-penalty mechanic (same integration point in
reverse — *forcing* a wave via the same `useWaveHorn`-style function
that already exists in `wave_spawner.js`, rather than reacting to one),
the roguelike choice popup, the starter-gear removal (a one-time fire
at wave 5 specifically), and the next-wave countdown timer (also calls
`useWaveHorn` directly, just on a timer instead of a right-click).
`wave_status.js`'s `td_inWave`/`td_waveNumber` player-data flags are
already the proven detection point (`base_expansion.js` already reads
them) — every "something happens on wave N / boss wave / wave clear"
idea plugs into the same flag, no new detection logic needed each time.
**Now five separate ideas share this one trigger point** — worth
treating wave-clear as a real orchestration moment (what order things
fire in, whether they collide) rather than five independent hooks, see
the countdown-timer idea's own notes on this.

**3. Mob-targeting via `Mob#setTarget()`**
Covers: the already-built "always target player" behavior
(`mob_aggro.js`) and the amulet's aggro mechanic (worn = target the
holder, pedestal = target the fixed location). Building the amulet's
aggro half isn't new ground — it's changing `mob_aggro.js`'s target
selection from an unconditional `player` to "read amulet state, target
whoever/wherever that resolves to." Same script, same proven technique.

**4. Distance/radius-check math**
Covers: the wave-clear hostile-count check (already reused twice —
`wave_spawner.js`'s `nearbyWaveMobCount` and `wave_status.js`'s own
count) and the distance-based risk scaling floated for lootable
buildings (harder mobs further from base). Same
`dx*dx+dy*dy+dz*dz <= radius*radius` pattern each time — already a
proven utility, not something that needs re-deriving per idea.

**5. Persistent per-player state flags**
Not idea-specific, but worth naming since it's reused constantly
already (`td_waveNumber`, `td_lastHornUseTick`, `td_inWave`, the
border-growth counter — all on `player.persistentData`, chosen
specifically because level/server-scoped data doesn't survive a
restart, confirmed against KubeJS's own source). Any new idea needing
"remember something per player, across ticks and restarts" — amulet
worn/pedestal state, wave-reward already-given flags — follows this
exact same established pattern rather than inventing a new one.

**6. FTB Quests as one system serving several ideas at once**
Covers: the quest book/progression-gating idea itself, the pack
aesthetic's diary/flavor-text layer (content written *into* the same
chapters), the shop system, and potentially the wave-clear reward (if
modeled as a quest reward instead of bespoke KubeJS — worth deciding
once cadence is settled). One mod-adoption + SNBT-authoring pass
delivers most of four ideas, since they're facets of one system rather
than four separate builds. Similarly, the custom recipe glue tying
loot-tier materials to machine crafting (Machine Progression) is one
system that serves the entire Tier 1–4 machine list at once — once the
recipe-tier framework exists, adding another machine within it is data,
not new code.

**Mod-adoption doubling up, not just code:** from the earlier mod-vs-
custom pass, **Item & Block Attraction + Curios/Fancy Trinkets** cover
both amulet states (mob-attraction *and* worn-buffs) in one mod-install
pass rather than two separate builds. **ZCraft: Zone Decor + Doomsday
Decoration** cover the pack-aesthetic block palette *and* could double
as set-dressing for lootable-building interiors once a structure-gen
mod is in the picture — one decoration-mod pick serving two ideas.

## Roguelike choice mechanics: permanent buff pick + next-wave choice on wave clear (buff pick built 2026-08-20)

Core idea, two paired mechanics, both firing on wave completion:
1. A choice popup offering **three permanent player buffs** — pick one.
2. A separate mechanic letting the player **choose the next wave's
   composition** from three options, rather than it always being fixed.

**This is the first mechanic in this file that actually operationalizes
the roguelike design intent already on record** — the Core Loop &
Balance Philosophy notes above already say the pack is "closer to a
roguelike endurance challenge than a game with a clean victory state,"
but that was tone/difficulty-curve language until now. Banked,
irreversible picks at fixed checkpoints (buffs) plus direct player
agency over the next challenge (wave choice) is the actual Slay the
Spire / Risk of Rain shape that line was gesturing at.

**Mod check (per the standing "prefer a mod when one fits" rule):** no
real match for the *repeated* shape of this. **Level Up! Reloaded** has
a "choose one of three specializations" screen, but that's a one-time
class pick, not a recurring per-wave-clear choice — different shape,
not a substitute. **Decided (2026-08-19): build the choice popup with
ScreenJS** — the KubeJS addon purpose-built for custom GUI menus
(`StartupEvents.registry('menu', ...)`) — since nothing pre-built
covers this specific loop.

Cross-links:
- **Implementation cluster #2 (wave-clear as universal trigger)** —
  extends directly: both halves of this idea fire off the same
  `wave_status.js` wave-clear state that base expansion, the wave-clear
  reward building, and Blood Moon already hook into.
- **Distinct from the amulet's buffs**, worth not conflating: the
  amulet's buffs are conditional (only active while worn) and can be
  given up; these wave-clear buffs are explicitly *permanent*. Two
  different kinds of "buff" in the same pack — fine to coexist, just
  worth keeping straight when both get built.

**Resolved (2026-08-19): start small, scale later.** Ideally the
branching genuinely grows over time (real forks, not just flavor), but
per the pack's existing "small deliverable scope now, explicit path to
the fancier version later" pattern (same call already made for base
expansion's hard wall and the Superflat decision above), the first pass
should keep branches reconverging into the same next wave rather than
forking the campaign combinatorially — get the choice-popup loop itself
cemented and working first, then grow real branching once that's proven
out. Not a permanent scope cap, just the starting point.

Open questions:
- What the three permanent buffs actually are, and whether they scale
  or stay flat — not specified yet.
- Whether buff choices repeat/can reroll the same option across
  multiple wave clears, or are drawn from a shrinking pool.

**Built (2026-08-20), buff-pick half only — next-wave composition
choice still deferred, per "start small" above.** ScreenJS (this
section's planned mod) checked directly and found dead — 1.19.2 only,
last released April 2023. No actively-maintained alternative KubeJS
GUI-screen addon exists for 1.20.1 either. Built as a clickable
`/tellraw` chat menu instead (`wave_status.js`) — zero new mod
dependency, same vanilla-scriptable pattern as everything else built
this session. Resolves both open questions above: the three buffs are
**Vitality** (+2 hearts), **Fortitude** (10% less damage taken), and
**Ferocity** (hit harder) — real vanilla effects (`health_boost`,
`resistance`, `strength`) given permanently via a duration at
`/effect give`'s own max. Choices **repeat and stack**, not drawn from
a shrinking pool — each buff tracks its own pick-count on player
persistent data, and repeat picks raise the effect's amplifier (second
Vitality pick = Health Boost II, etc.), so choosing the same buff
repeatedly is a real, escalating strategy, not a wasted pick.

**"Pause the game until chosen" resolved as a soft/functional pause,
per this section's own deferred implementation-detail framing** — no
literal tick freeze. The wave-clear orchestration (immediate effects →
choice → gear removal at wave 5 → countdown) simply doesn't advance
past the choice step until a pick is registered (`td_awaitingChoice`),
and the Wave Horn itself refuses manual re-use while a choice is
pending — functionally blocking, without needing to freeze the server.

### Addendum (2026-08-20): revisiting the popup — chat-based feels wrong, want a real GUI

Direct feedback: the current `/tellraw`-clickable-text implementation is
buggy and doesn't feel right. Asked to look again at building an actual
GUI with buttons, closer to a Vampire-Survivors-style level-up screen.

**Re-checked ScreenJS's death and the "no maintained alternative"
finding — both hold up.** Searched again specifically for anything
resembling a player-facing custom-menu addon: **"KubeJS GUI"** looked
promising at first (a distinct project from "KubeJS GUI Overhauled,"
confirmed Forge 1.20.1, actively updated) but turned out to be a
recipe-authoring tool for modpack developers — a template system for
visually building KubeJS *recipes*, not an in-game player-facing
screen. Not a substitute, same category miss as "KubeJS GUI Overhauled"
already was. No real find here beyond what was already known.

**Two real candidate directions, neither built, honestly different
confidence levels:**

- **Villager-trade-GUI reuse (more confident, lower risk).** Vanilla's
  actual trading screen can be given fully custom offers via NBT
  (`Offers:{Recipes:[{buy:{id:...},sell:{id:...},...}]}` on a summoned
  villager) — real icon-based, clickable slots, much closer to
  "buttons" than clickable chat text, and zero new mod dependency,
  same "reuse a real vanilla mechanic via commands" pattern as
  everything else that's actually worked in this pack. **Real gap, not
  yet verified**: whether KubeJS exposes a reliable server-side event
  for "which trade did this player just complete," which is the actual
  mechanism needed to apply the corresponding buff — this needs
  checking directly (against KubeJS's real entity/villager event API,
  the same way ScreenJS's death was confirmed directly rather than
  assumed) before treating this as a real plan rather than a lead.
- **A genuine custom Container/Menu via KubeJS's own `StartupEvents.registry('menu', ...)`
  (higher risk, closer to what was actually asked for).** Search
  results couldn't cleanly separate whether this registry event is
  KubeJS *core* functionality (available regardless of ScreenJS) or
  something ScreenJS itself provided — every source found mixes the
  two together. Needs a direct in-game check, not a search-engine
  answer, given how often "should be fine per the docs" has been wrong
  in this exact codebase (Forge's own docs were wrong about
  `RightClickItem`/`RightClickBlock`, LootJS's README named a method
  that doesn't exist). If it does work standalone, this is the more
  literal answer to "a real GUI with buttons" — actual custom-drawn
  choice buttons, not a reused vanilla screen — but building a working
  Container/Menu from scratch is a meaningfully bigger, riskier task
  than anything else built in this pack so far; nothing existing to
  pattern-match against the way the Wave Horn's bugs at least all had
  precedent by the time loot bags hit similar ones.

**Recommendation:** verify the villager-trade approach's trade-detection
gap first — it's the cheaper, more vanilla-aligned path, and confirming
or ruling it out is quick. Only chase the real custom-Menu route if that
gap turns out to be a dead end, given its higher build risk.

**Parked (2026-08-20):** not being pursued right now. The current
`/tellraw` chat-menu implementation stays as-is, bugs and all, rather
than investing in either candidate direction above at this time. Both
directions stay recorded here for whenever this gets picked back up —
not decided against, just not now.

## Starter gear as a dead soul's leftovers, taken away after wave 5

Core idea: the sword and armor the player currently starts with
(`playtest_starter_kit.js` — a netherite sword, sharpness 100, plus a
full iron armor set, both explicitly marked "playtest convenience only,
not real pack design") get a narrative reframe — they're looted from
the corpse of the base's previous, unfortunate occupant. Mechanically,
this gear disappears once the curated 5-wave campaign is cleared, with
an on-screen popup explaining why, ending on **"it's up to you now."**

**Nice fit, not a coincidence to flag:** wave 5 is exactly where
`wave_spawner.js`'s designed campaign ends (it repeats wave 5's
composition for anything beyond that, per its own comment — "no waves
designed beyond that yet"). So the training-wheels gear disappearing
exactly when the authored campaign runs out and the player moves into
repeat/endless territory is a clean thematic pairing already latent in
the existing wave design, not something that needs a new milestone
invented for it.

**Direct connection to the Pack Aesthetic idea above:** this is the
same "diary from a previous, unfortunate soul" narrative device already
planned for the quest book's flavor text — just applied to actual
starting gear instead of only text. Worth keeping the two consistent
(same "previous occupant," same tone) once both get written.

Sent as a concrete build instruction to the other implementation
session — see below.

---

**Instruction handed off for implementation (2026-08-19):**

> **Feature: starter gear disappears after wave 5, with an explanatory popup**
>
> Context: `playtest_starter_kit.js` currently gives the player a
> netherite sword (sharpness 100) and full iron armor on first join —
> explicitly marked playtest-only, not real design. Narrative reframe:
> this gear is looted from the corpse of a previous, unfortunate
> occupant of the base (same "diary from a previous soul" narrative
> already planned for the quest book — see `docs/IDEAS.md`'s Pack
> Aesthetic idea). Mechanically, it should disappear once the curated
> 5-wave campaign (`wave_spawner.js`'s `WAVES` array) is cleared, with
> an on-screen popup ending on "It's up to you now." — deliberately
> timed to when the designed campaign runs out and repeat/endless waves
> begin.
>
> Build:
> 1. **Tag the starter items specifically** (custom NBT/lore line) so
>    removal logic can target exactly *these* items, not any
>    netherite sword or iron armor the player has since crafted or
>    looted legitimately. Don't match by item type alone — that would
>    strip gear the player actually earned.
> 2. **Reuse the existing wave-clear detection point** —
>    `wave_status.js` already tracks `td_waveNumber`/`td_inWave` on
>    player persistent data and already fires a "Wave N defeated!"
>    message on the hostile-count-reaches-0 transition. Hook into that
>    same edge, gated on wave 5 specifically (reference the campaign
>    length as a named constant, not a magic number, in case the
>    designed campaign grows later).
> 3. **One-shot guard** — same pattern as `td_playtestKitGiven` etc. on
>    player persistent data, so this fires exactly once, not on every
>    later wave-clear.
> 4. **Full removal from inventory**, not just unequip.
> 5. **Popup**: reuse the existing "prominent on-screen title" mechanic
>    already built for wave incoming/cleared (vanilla `/title`) for the
>    short, final line ("It's up to you now."), plus a `player.tell(...)`
>    chat message for the fuller narrative explanation — actual wording
>    is a creative call for that session.
> 6. **Known gotchas from this codebase's own debugging history** —
>    check against these before assuming a clean first pass: `var` not
>    `const`/`let` inside repeatedly-invoked event callbacks (Rhino
>    "redeclaration" bug), `getX()/getY()/getZ()` not bare `.x/.y/.z`,
>    never touch `event.level.isClientSide` (throws an unconditional
>    NPE in this environment), and `player.getServer().runCommandSilent(...)`
>    rather than `player.runCommandSilent(...)` for any command needing
>    elevated permission. Full list: `docs/MODS.md`'s Wave Horn
>    debugging notes / `docs/IDEAS.md`'s "Confirmed working" section.

## On-screen countdown timer to the next wave (auto-starts after 3 min) (built 2026-08-20)

Core idea: once a wave is cleared, a 3-minute countdown starts and
displays on screen; when it hits zero, the next wave starts
automatically, for a real sense of urgency between waves. Stated as
something wanted **regardless of whether waves end up mod-managed or
stay custom** — same "durable requirement, independent of
implementation" framing as the loot drop-rate rule above, not tied to
whichever wave-management approach (custom Wave Horn vs. a mod) ends up
in place.

**Assumed shape, not yet confirmed:** the manual Wave Horn presumably
still works during the countdown, letting the player start the next
wave early if they choose — the timer is a *forcing* function for
players who don't act, not a removal of the existing manual trigger.
Worth confirming this is actually the intent before building it either
way.

**Cheap to build — reuses two already-proven patterns directly, no new
infrastructure:**
- The on-screen display itself is structurally identical to
  `wave_status.js`'s existing action-bar loop (`player.setStatusMessage(...)`,
  updated every tick to show "Hostiles remaining: N") — same technique,
  just counting down seconds instead of counting hostiles.
- Auto-starting the next wave means calling the same `useWaveHorn(player)`
  function `wave_spawner.js` already defines for the manual horn — the
  timer is just a second caller of a function that already exists, not
  new spawning logic.
- The countdown's start point is the same wave-clear edge (`wave_status.js`'s
  `td_inWave` transitioning true→false) that base expansion, the
  wave-clear reward building, the roguelike choice popup, and the
  starter-gear removal all already hook into — this is now the fifth
  idea firing off that exact same trigger.

**Worth flagging now that five things share one trigger point:** wave
clear is becoming a real orchestration moment — reward placement, a
choice popup, starter-gear removal (once, at wave 5), and now a
countdown, potentially all firing at once. Two concrete questions this
raised:

- **Resolved (2026-08-19):** the roguelike choice popup **pauses the
  game until the player has chosen** — so the countdown-vs-choice
  conflict doesn't actually arise. The timer only needs to start
  counting once the choice popup has been resolved, not race against
  it. This also implies the choice popup necessarily comes first in
  wave-clear ordering (reward placement / starter-gear removal / other
  wave-clear effects, then the pausing choice popup, then the countdown
  begins) rather than everything firing simultaneously — a real
  technical requirement now (something has to actually halt/gate game
  flow for the popup), not just a UX nicety. Worth noting when this
  gets built: "pause the game" for a single player in a KubeJS/vanilla
  context most likely means freezing world tick / mob AI / the
  countdown itself while a blocking UI is up (e.g. via ScreenJS's
  screen being open), rather than a true server pause — exact mechanism
  is an implementation detail for whichever session builds it.
- **Resolved (2026-08-19): starter-gear removal happens *after* the
  choice popup is answered**, not before/simultaneously — so the
  wave-clear order is now: wave-clear effects (reward placement, etc.)
  → choice popup (blocking) → player chooses → starter-gear removal
  (at wave 5 specifically) → countdown to next wave begins. Still open:
  where reward placement specifically slots in relative to the popup —
  only the gear-removal-after-choices part is pinned down.

**Built (2026-08-20), exactly this ordering.** Wave-clear reward
placement wasn't built this pass (not requested), so the real sequence
is: wave-clear effects (title/day/fog/darkness reset) → choice popup
(blocking) → player chooses → starter-gear removal at wave 5 → 3-minute
countdown begins. Confirmed the "manual horn still works during the
countdown" assumption as the actual behavior: `useWaveHorn` cancels any
active countdown the instant it's manually triggered, so an early
right-click always wins and the auto-trigger never double-fires on top
of it. Implementation split across two files for a real technical
reason, not just organization: the countdown's display and auto-trigger
live in `wave_spawner.js` (not `wave_status.js`, where the display logic
this idea reuses actually lives) because auto-triggering the next wave
means calling `useWaveHorn()` directly, and this codebase's
`server_scripts` don't reliably share top-level functions across files
— `wave_status.js` starts the countdown via a `player.persistentData`
flag (the same cross-file channel `td_inWave` already uses), and
`wave_spawner.js`'s own tick handler owns everything from there.

## Atmosphere & Wave "Feel" (from updated design notes, 2026-08-20)

New section in the refreshed design-notes doc, not previously in this
file — the rest of that doc (Core Loop, Balance Philosophy, Map
Generation, Loot & Crafting Materials, Machine Progression, Power
System, Quest Book plan, Reference Mods, Tooling, Open Questions) is
unchanged from what's already captured under "Full system design
notes" above, so only the new material is added here. **Note the
status difference**: this section is marked **"(locked)"** in the
source doc — a firmer commitment than most raw ideas in this file,
closer to "Resolved" entries elsewhere than to "unrefined, not decided."

### Fog Wall (locked)
The worldborder isn't just mechanical — it's rendered as a dense fog
wall representing "the unknown beyond." Enemies spawn from beyond the
fog line, not inside the play area, so fog is the literal source of
threat. Border expands as waves are cleared (starts at 50, grows with
progression).

**Matches the real implementation exactly** — `base_expansion.js` is
already auto-set to 50 on world creation and grows by 5 blocks every 2
waves cleared (see the Base Expansion idea above). This section's fog
rendering is a visual layer on top of a border mechanic that's already
built, not a new mechanical system.

**Correction (2026-08-20): neither named mod actually works on this
pack.** Checked directly against Modrinth's API rather than assuming —
**Foggy Border is Fabric-only** and **Fog by IMB11 is Fabric/NeoForge
only starting at 1.21+** — neither has a Forge 1.20.1 build at all.
Real replacement found and built: **YetGamer's Custom Fog** (real Forge
1.20.1 build, no dependencies, ships an actual `/fog` runtime command).
Wired into the already-existing night-lock/day-restore pairing in
`wave_spawner.js`/`wave_status.js` — dense fog fires alongside `time set
night` when a wave starts (`fog @a set 8 32 25 25 30 0.3 cylinder`,
cylinder chosen to roughly echo the worldborder's own shape), reset back
to vanilla fog in the same "defeated" branch that restores daylight.

**Real scope-down worth being clear about:** this fog is **player-relative,
not tied to the worldborder's actual world coordinate** — no Forge
1.20.1 mod was found that renders fog fixed at a border position. So
the original "fog is the literal source of threat, rendered at the
border line" framing isn't literally true of what got built — it reads
as general ambient dread ("the horde's out there in the dark") rather
than a wall you can see receding as the border grows. Delivers the
*tension* the section wants, not the literal *visual* it originally
described.

**"Enemies spawn from beyond the fog line, not inside the play area" —
actually built correctly 2026-08-20, on the second attempt.** This
specific sentence was read multiple times earlier the same session but
never actually cross-checked against `wave_spawner.js`'s real spawn
logic, which had always clamped mobs *inward* near the player. First
correction attempt still spawned mobs just inside the border, on a
wrong assumption that the border blocks mob movement the way it blocks
players — caught directly by the user ("no not inside the border!!!
spawn outside"). Real fix: mobs now spawn 6-14 blocks genuinely beyond
a random point on the border and walk in, matching this sentence
literally, not just in spirit. See `docs/MODS.md`'s Wave-clear/Fixed
spawn entries for the mechanism.

### Day/Night Density Contrast (locked)
Day (build/loot phase) should pull the fog/horror aesthetic back
significantly so it reads as underlying tension, not dread. Night (wave
phase) ramps it up fully. Applies to the whole atmosphere stack — border
fog, ambient fog, shader intensity, ambience — not just one layer.

**Direct connection to something already built:** the "day/night lock"
mechanic (`useWaveHorn` sets `time set night` + freezes the daylight
cycle for the wave's duration, `wave_status.js` flips it back on
"defeated") is exactly the day/night-by-wave-state signal this section
assumes exists — it does. Whatever scripts the atmosphere scaling can
hook the same state this mechanic already tracks, rather than inventing
a new day/night detector.

**Partially built (2026-08-20):** the fog layer specifically is real
now — see the Fog Wall correction above, wired into this exact
night-lock/day-restore pairing. The shader layer isn't — see the
Shaders section below for a real constraint found on that front
(no live scriptable intensity control).

### Shaders (decided 2026-08-20, was "pack TBD")
Night leans into aggressive ambient darkening with the fog wall as the
primary lit/visible feature; day pulls back to a softer profile.
Candidate packs named: **Spooklementary** (Complementary-based,
increased fog, intensified darkness, blood moons — note the overlap
with the separate "Boss waves tied to a Blood Moon event" idea above,
worth checking if this shader pack's blood moons are purely visual or
also functional before assuming they're independent), **Insanity/Hysteria
Shaders** (BSL-based, configurable via in-game menu, volumetric fog),
**Gravemist** (heavy fog hiding mobs until the last second — closest
match to the silhouette-first spawn concept below). No pack chosen yet.

**Decided and built: went with Spooklementary, needs Oculus.** Compared
all three candidates against Modrinth's API directly rather than
guessing: Spooklementary confirmed 1.20.1 and actively maintained;
Hysteria Shaders' 1.20.1 build is ~1 year stale with a heavier feature
set than needed; **Gravemist couldn't be confirmed available for 1.20.1
at all — zero Modrinth results** (the candidate list above was wrong to
include it as a live option). Oculus (the shader loader Forge needs,
equivalent to Iris on Fabric) declares Embeddium as its own required
dependency — already in the pack, so it's built to work with the
existing renderer rather than fight it.

**Resolves the flagged blood-moon question:** confirmed **Spooklementary's
blood moons are visual-only**, no functional trigger of their own — no
conflict with the separate Blood Moon idea's mod-search, they're
independent as hoped.

**Real constraint found, affects the Day/Night Density Contrast idea:**
Iris/Oculus shaders don't expose a live scriptable API. Dynamic
day/night intensity control would need a settings-file-swap-and-reload
approach, not smooth KubeJS control the way the fog layer's `/fog`
command allows. Installing the pack was step one — the actual
day/night-reactive intensity, and the rest of Spawn Behavior below,
aren't built yet as of this shader-pack commit (staggered
emergence/sound-first were built in a separate, later pass — see
below).

**Reverted 2026-08-20: removed entirely, not just re-tuned.** Oculus +
Spooklementary went through eleven real tuning rounds the same day —
a version-crash bug, then a long brightness/shadow saga (confirmed via
direct web research that Spooklementary is *intentionally* dark/moody
by design, not misconfigured; isolating the fix to the shader's own
single "General Brightness" lever; then removing real-time shadows
outright once it became clear no post-lighting exposure control can
lift a pixel the shadow map computes as near-zero). Even after all of
that converged on a technically-defensible state, the user's actual
verdict was about *feel*, not any remaining number: "im just not
feeling the whole shader feel now." Removed completely — Oculus mod,
the tuned shaderpack file, and `config/oculus.properties` all deleted
from both the tracked pack and the live instance. **Kept**: the Fog
Wall's worldborder texture override
(`kubejs/assets/minecraft/textures/misc/forcefield.png`) and
`border_fog.js`/the wave-state `/fog` calls — those run on YetGamer's
Custom Fog, a separate mod with no dependency on Oculus/Iris, so they
were never actually part of what got removed here. Atmosphere & Wave
Feel now stands on Fog Wall + Day/Night Density Contrast (fog layer
only) + Spawn Behavior — the Shaders sub-section of this locked
section is closed out, not just paused; don't re-propose Spooklementary
or another shaderpack here without a new, different signal from the
user first.

**New signal received (2026-08-20) — back to the drawing board, not
just "try a different shaderpack."** Explicit feedback: it took an
incredibly long time to tune, and even the version that looked
technically fine still didn't convey the atmosphere. Confirms the
commit note above (the issue was the shader's whole aesthetic, not any
remaining number) — worth actually changing approach, not re-running
the same eleven-round tuning process against a different pack.

A `minecraft:darkness`-effect approach was proposed and built the same
day as an alternative to shaders, but **didn't work** per direct
feedback — dropped. Not detailed further here.

**Correction, same day: misread the fog instruction, then fixed it.**
Initially read "make sure the fog effect only occurs during a wave" as
"day should have zero fog" and deleted `border_fog.js` (the peacetime
proximity-fog script) entirely. Directly corrected by the user: "i want
some light fog on the border in the day and heavy fog in the night...
trying to make it atmospheric" — the actual ask was day/night
**contrast** (exactly what this section's "Day/Night Density Contrast"
idea always described), not day going silent. Restored `border_fog.js`,
and retuned its density in the process — its `NEAR_MAX_DISTANCE`
(fog thickness right at the border edge) was actually denser (`20`)
than wave-time's fixed fog (`32`) before, backwards from "light by day,
heavy by night." Raised to `60` so daytime border fog stays clearly
lighter than night's, even at its own densest point right at the edge.
The worldborder wall texture is unaffected either way — it's a static
resource-pack override, always visible regardless of day/night, never
part of either fog discussion.

### Spawn Behavior (built 2026-08-20, was "locked concept, tuning TBD")
- **Sound-first** — audio cues (growls, footsteps, ambience) play
  before mobs are visible, via `/playsound` or KubeJS `.playSound()`
  fired ahead of the actual spawn. **Built**, alongside staggered
  emergence below (same feature, same commit) — see there for detail.
- **Silhouette-first** — mobs spawn just past the fog line, visible
  only as vague shapes before committing to pathing toward the player.
  Mostly a function of fog density (border + ambient) doing the work,
  not new spawn logic. Still not built as its own thing — the fog
  layer above provides the raw material, but nothing explicitly stages
  "visible-shape-then-commit" behavior yet.
- **Staggered emergence — built 2026-08-20, and the earlier flag here
  was correct.** This section originally noted the design doc claimed
  staggered spawning already existed when it didn't — that build now
  exists for real, in `wave_spawner.js`. Implementation: a `pendingSpawns`
  queue (`{mobType, x, y, z, spawnTick, soundTick, soundPlayed}`)
  processed by a `PlayerEvents.tick` handler — deliberately reusing the
  same tick-loop pattern already proven in `wave_status.js`/`mob_aggro.js`
  (Implementation Cluster material — no new, unverified scheduling API
  introduced). Each mob gets a positioned `/playsound minecraft:ambient.cave`
  cue **12 ticks (~0.6s)** before its actual `/summon` — positioned with
  explicit coordinates rather than `player.playSound()`, so the cue
  comes from where the mob is about to appear, not from the player.
  `minecraft:ambient.cave` was chosen as a generic eerie one-shot since
  TFTH's own sound event registry names weren't verified. One real bug
  this introduced and fixed: the Wave Horn's reuse guard now also checks
  `pendingSpawns.length > 0`, not just nearby-mob count — otherwise
  spam-clicking the horn during the new emergence window could queue a
  second wave's mobs on top of the first's before any of them existed
  yet to be detected.
- **Escalation lever — built with concrete numbers.** Gap between each
  mob's emergence shrinks from a **16-tick base** at wave 1 down to a
  **4-tick floor** by wave 5 (`Math.max(4, 16 - (waveNumber - 1) * 3)`),
  matching the Balance Philosophy's "false security" curve intent — the
  floor is 4 ticks rather than 0 so even wave 5 still reads as distinct
  emergences, not one instant clump.

### Open questions from this section — updated 2026-08-20
- **Resolved, split answer:** the scriptable-hook question is answered
  now that real mods are in place — the **fog layer has one** (YetGamer's
  Custom Fog's `/fog` command, already wired to wave state), the
  **shader layer does not** (Oculus/Iris has no live API; would need a
  settings-file-swap-and-reload approach). Day/night scaling is real for
  fog, still blocked for shader intensity specifically.
- Fog + shader compatibility (YetGamer's Custom Fog + Oculus/Spooklementary,
  the actual pair now, not the originally-named Foggy Border/Gravemist
  candidates) — still not confirmed tested together in-game.
- **Resolved:** staggered emergence was built as part of `wave_spawner.js`
  directly, at the wave-**start** point (`useWaveHorn`) — not the
  wave-**clear** orchestration cluster discussed elsewhere in this file.
  Worth being precise about that distinction: these are two different
  trigger points (wave beginning vs. wave ending) that happen to both be
  "timed sequences around a wave," not the same mechanism. No shared
  machinery was needed or used between them.

## "The Watchpost" — a better starting structure

Core idea: replace the current starting structure (plain
stone_bricks/cobblestone box, explicitly marked "playtest convenience
only, not real pack design" in `playtest_starter_kit.js`) with something
that actually earns its place in the fiction — a small, fortified
homestead the previous, unfortunate occupant clearly built up before
they died, not a blank field the player starts fresh on.

**Layout:**
- A single-room shack at the center — where they lived, and where the
  starting gear/corpse narrative comes from (see "Starter gear as a
  dead soul's leftovers" above). Weathered cobblestone/stone brick
  walls (mix in mossy/cracked variants for age), a couple of boarded
  windows (iron bars behind trapdoors, reading as "boarded up"), one
  door.
- A short watchtower at one corner, 2-3 blocks above the rest, reachable
  by ladder — real sightlines over the desert. Not just flavor: a
  natural home for a Tier 2/3 turret later (Machine Progression notes
  above), and it makes "tower defense" a literal, physical feature of
  the base rather than just the pack's name.
- A low perimeter wall around a small courtyard. **Doubles as a rough
  version of the Tier 1 "Wooden Palisade" defense** already in the
  Machine Progression notes — the starting structure and the first
  line of defense become the same object. The player didn't spawn in a
  field and build a wall; they inherited one, already half-built by
  someone who didn't make it.
- A small, visually distinct pedestal just inside the entrance —
  reserved for the amulet mechanic (see the Amulet idea above). A worn
  stone pillar or lectern-style block, deliberately reading as "this
  matters" against the rest of the base.
- A well built into one side of the perimeter, styled to match
  vanilla's own desert-well structure (which already generates
  naturally around the map, per MODS.md's Fixed spawn entry) — so the
  hand-built base visually rhymes with what the world generates on its
  own, rather than looking like an obviously separate prefab dropped in.

**Fits the standing vanilla-materials-only decision as-is** — nothing
above needs a mod to work; it's buildable today with the same
`/fill`/`/setblock` technique already proven for the current starter
base.

### Decoration incorporation (once ZCraft: Zone Decor / Doomsday Decoration land)

The two decoration mods already researched under Pack Aesthetic above
(both decoration-only, no mechanics, already flagged as candidates —
not installed yet) have specific, obvious homes in this structure
rather than being generic set-dressing:

- **Inside the shack**: Doomsday Decoration's worn furniture and
  discarded daily necessities, scattered like someone left in a hurry
  or didn't get the chance to tidy — plus its human remains prop
  somewhere near the bed, making the "looted from a corpse" narrative
  literal and visible, not just implied by a tooltip.
- **Watchtower base and perimeter**: ZCraft's fuel barrels and tires
  stacked as improvised barricade reinforcement — the palisade reading
  as scavenged industrial junk, not just wood, which fits a
  scrap-and-salvage aesthetic even while the actual loot economy stays
  vanilla-materials-only underneath it (visual theme and mechanical
  materials don't have to match one-for-one).
- **Courtyard**: ZCraft's military crates/supply boxes near the well or
  shack wall — visually implies stockpiling, reinforcing the
  scavenging/loot theme without adding any new mechanic.
- **Pedestal area kept comparatively clean** — deliberately less
  cluttered than the rest of the base, so it visually stands out as the
  one place that matters against everywhere else's mess. A compositional
  choice, not just a prop-placement one.
- **Just outside the walls**: ZCraft's general waste/rusted structures
  scattered as a debris trail leading up to the perimeter — implies the
  base has weathered attacks before the player ever arrived, extending
  the "previous occupant" story into the environment itself with zero
  extra text needed.

**Two-phase build, matching the established small-scope-first pattern**:
build the structure in plain vanilla now (works today, no new
dependency), add the decoration pass as a second, separate step once
ZCraft/Doomsday Decoration actually get installed — not blocked on each
other.

Not built — a concept, logged for whenever the current placeholder
starter base gets picked up for real.

