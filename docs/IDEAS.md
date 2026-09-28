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

**Swept for staleness 2026-09-01** — closed out items resolved by the
desert-drop rebuild (BOP multi-biome path, absorbed into the shipped
`multi_noise` set) and refreshed a couple of others against what's
changed since (the 8-wave campaign framing, decoration mods' aesthetic
fit) rather than leaving them describing an outdated state.

**Backlog review 2026-09-26** — every open idea went through a
keep/bin round with the user. Only two survived (pedestal upgrades
below, and turret tracer/impact effects in FEATURES.md); everything
else is listed under "Binned" at the bottom of this file, with the
full original sections archived verbatim at
[docs/archive/ideas-binned-2026-09-26.md](archive/ideas-binned-2026-09-26.md).

---

## Pedestal upgrades: health, armor, thorns as progression

**Built 2026-09-27; moved to FEATURES.md** ("Pedestal upgrades"). You
pay in XP levels, with 3 tiers per stat, via `/pedestal`. Both kept items
from the backlog review are now built. The original note below is kept
for history.

Raised 2026-09-05 during a live playtest ("the pedestal should have
some more starting health... it would be cool if we could think about
how upgrading the pedestal's health, armor, thorns is part of the
game"). The immediate quick fix (higher starting HP, +20% heal per wave
clear) shipped separately — this entry is just the parked bigger idea:
a real upgrade-point system where the player spends some currency/
resource to raise the pedestal's max HP, add damage reduction (armor),
and/or reflect damage back at attackers (thorns), across multiple
purchasable tiers. Not scoped: what currency (gold? a dedicated point
resource earned per wave?), how many tiers, whether upgrades are
permanent or lost/reset like gear on wave 5, and how this interacts with
the pedestal's mob-attack-vulnerability config. Revisit once the current
playtest priorities clear.

## Platform: future version bump, not now

Decided 2026-08-31, worth recording so it doesn't get re-litigated
blind: this pack stays on Forge 1.20.1. Considered jumping to 1.21.1 to
match modern packs like ATM10 — two things ruled it out for now:
- **ATM10 itself is NeoForge, not Forge** — its 1.21.1 move was a
  loader switch too, not just a version bump. Forge's own 1.21.1
  ecosystem is thinner than NeoForge's, since most active mod dev moved
  to NeoForge once Forge lagged starting around 1.20.5.
- **1.20.5/1.21 replaced Minecraft's item NBT system with structured
  "data components"** — a one-time, fixed-size breaking change, not a
  gradual one. Every NBT-based technique this pack has built (summon
  Attributes overrides, custom persistent tags) would need rewriting in
  the new format, on top of re-verifying a mostly-different mod
  ecosystem from scratch.
- **No urgency**: 1.20.1 has the same kind of multi-year staying power
  Forge's 1.12.2 and 1.16.5 had — not being deprecated, no forcing
  clock running.

**If/when this does happen**: do it as a deliberate, dedicated project
at a natural checkpoint (current build fully playtested and confirmed,
not mid-buildout), and seriously consider **NeoForge** 1.21.x rather
than staying on Forge, since that's genuinely where the modern
ecosystem is concentrated. Staying on 1.20.1 longer doesn't make the
eventual rewrite harder in a compounding way — the NBT→components cost
is fixed size, not growing — it just means more of this pack's own code
sits on the old side of that boundary by the time it happens.

## Open questions carried over from the original design notes

- Win state: leaderboard/endurance only, or some form of victory? The
  "closer to a roguelike endurance challenge than a clean-victory game"
  framing is the only answer so far.

The rest of this list (how many machine tiers, the full machine list,
shared-pool vs. unlimited power, the shape of what replaced the
vanilla-only loot rule) was closed by the Tier 2-4 buildout and the
2026-09-26 review. The original wording is in the archive file above.

---

## Binned 2026-09-26 (backlog review)

Direct ask: "might bin some ideas as they are potentially old" -
decided item by item via question rounds. Don't re-propose any of these
without a new reason. The archive file above keeps each one's full
original text, including the ruled-out-mod records (Tower Defense Units,
Immersive Intelligence, Mekanism turrets, Landmines, Immersive
Petroleum/Machinery, K-Turrets as the passed-over ammo-turret
alternative). Check those before researching the same ground again.

- **Boss-wave building gift**: a machine or structure auto-placed in the
  base every 10th wave.
- **Roguelike next-wave composition choice**, which also needed a pick
  GUI nobody had solved.
- **Bounty/quest shop** (FTB Quests trade quests or QuestShop). This also
  closes the "fuller quest book" chapter plan (Loot Tiers/Machines/Map
  Expansion/Shop), already superseded by the single `campaign.snbt`
  fishbone.
- **Noise/light attracts hordes**. The Lure Block covers deliberate
  attraction.
- **Player infection on hit.**
- **Player-count scaling + party perks**. Undead Nights'
  `dynamicScalingEnabled` stays `false`; waves 1-8 got a flat filler
  trim instead (2026-09-12).
- **Chain-Tesla network / AoE "Devastator"**: custom KubeJS turrets, since
  no mod exists for either.
- **Waves 1-8 ramp ideas**: mid-ramp story beats (diary/radio at waves
  3-4) and rotating wave modifiers. The third idea, a supply drop during
  the countdown, is covered by the every-5th-wave airdrop.
- **Invented loot-material economy** (Scrap -> Refined Alloy -> Core
  Fragments + a disassembler). Shrapnel is the one scrap material; the
  disassembler leaned on Trapcraft, which is gone.
- **Wave-start siren block** (the Wave Horn and SecurityCraft's own
  alarms cover it) and the **BOP Wasteland biome** (badlands was
  reskinned instead).
- **FEATURES.md-side**, listed here so everything is in one place: the WWZ
  anti-climb lip + Fake Water moat (Stake Walls won), and SecurityCraft
  modules as turret-recipe parts (written for the now-uninstalled
  ATD/Medieval turrets).
- **QUEUE small decisions, closed as "leave as-is"**: Crafting Station
  Improved's panel overlapping JEI bookmarks (no swap), Inventory Sorter's
  middle-click sort (no Inventory Profiles Next swap), and the base-site
  search staying desert/badlands only (no plains).

---

## Working principles (apply these going forward, don't re-litigate)

- **FTB Quests ids must start with hex 0-7** (found 2026-09-09): FTB
  Quests 2001.4.22 parses ids with a plain `Long.parseLong(s, 16)`, so any
  hand-written 16-hex id starting 8-F overflows, is treated as missing,
  and is silently re-minted on every load - the actual cause of every
  repo-vs-live id drift this pack has had, and of hardcoded task ids in
  KubeJS (`change_progress`) that never fire. Before deploying anything
  under `pack/config/ftbquests`, `grep -E '^\s*id: "[89A-F]'` must be
  empty. Full note in FEATURES.md's quest book v3 entry.
- **Loot shouldn't hand out shortcuts to what a placed home machine
  already makes** — direct principle (2026-09-06): the pack is built
  around a real choice between staying home (crafting/building with
  placed machines and mob-kill materials) and venturing beyond the
  world border into dangerous structures (leaving the base unguarded
  for things you can't get any other way). Putting a home machine's own
  output in a loot bag/chest as a "bonus shortcut" collapses that
  choice instead of rewarding it. Caught when a proposed spec put the
  Press/Rolling Mill's own outputs (Iron Sheet/Iron Wire) in loot bags —
  retracted, see FEATURES.md's "Modded crafting materials in loot."
  Applies to any future loot spec, not just that one.
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
- **"Doesn't self-disable on flat worlds" is not the same claim as
  "works correctly on flat worlds"** — confirmed the hard way: YUNG's
  Better Desert Temples was checked and found to have no flat-world
  exclusion logic before installing it, but its `QuartzPillarProcessor`
  still walks a fixed distance straight down from a temple with no
  floor check, which underflows past the bottom of a genuinely flat
  world and crashed world creation deterministically. The "checked the
  jar for self-disable logic" verification pattern only rules out one
  failure mode; it doesn't substitute for an actual successful
  playtest. Removed entirely, no upstream fix exists.
- **Small deliverable scope now, explicit path to the fancier version
  later** — this pack's whole build pattern so far (base expansion's
  hard wall, staying flat, the Basics quest chapter before the fuller
  vision). Keep applying it rather than jumping straight to a "final"
  version.
- **A doc claiming "there's a dedicated tool for X" is a claim to
  verify, not a fact** — burned twice on the FTB Quests SNBT-authoring
  tool specifically. Check before planning around it.
- **Searching a mod's exact name is not enough to find the right
  listing — check the platform, author, and download source match what
  was actually intended, every time.** Recurred often enough to be a
  pattern, not a one-off: the Pure Suffering branch mismatch, the two
  same-named-but-different-API "KubeJS-Curios" projects, the
  Quest_play/berezka "Abandoned structures" naming collision, both new
  post-apocalyptic structure mods in that same report, and (2026-09-01)
  a "Controlling" search that surfaced an unrelated vampire roleplay mod
  and a "Mob Dismemberment" search that surfaced the wrong loader's
  variant. The fix each time was the same: confirm the real listing
  directly (author, platform, and — best case — a hash/checksum match
  against what's actually pinned) rather than trusting the first search
  result with a matching name. **Root cause, not just symptom**:
  CurseForge's own search matches against a mod's description text, not
  just its title — a completely unrelated mod can rank for a query if
  the right words appear anywhere in its blurb. Searching isn't a
  substitute for opening the actual project page.
- **A dedicated-server sandbox test doesn't cover client-only mods
  correctly, since this pack's live instance actually runs as an
  integrated singleplayer client, not a real dedicated server.** Mob
  Dismemberment crashed the sandbox outright (referenced a client-only
  vanilla class during common setup) purely because the test harness
  always launches as a true dedicated server — a real, structural blind
  spot in that testing method, not a bug in the mod. The actual fix was
  correcting packwiz's `side` metadata (defaulted to `"both"`, should be
  `"client"`) and excluding the mod from server-sandbox retests, not
  anything about the mod itself. Worth remembering for any future
  client-only addition (shaders, HUD mods, visual effects).
- **A crash report's own Details/Feature section names the actual
  structure/mod involved — read that line first, before speculating
  about which recently-added thing is responsible.** Cost a full round
  of wrong-direction investigation during the desert-drop world-gen
  crashes: the third crash's fix targeted When Dungeons Arise and
  Structory (a reasonable-looking lead, since crashes started right
  after installing them), but the real culprit — confirmed by the
  fourth crash's report naming it directly — was Treasure2's own
  `dungeon/general`, present since before either new mod existed, just
  left at its original tight spacing the whole time. "The newest thing
  must be the cause" is a recency bias, not a diagnosis.
- **A fix applied directly to the live instance under crash-fixing time
  pressure still needs a sync-back step to the tracked repo config** —
  it's exactly the step most likely to get skipped when moving fast on
  an active crash. Caught the hard way: a second Radium mixin fix
  (`mixin.util.chunk_access`) during the desert-drop crash debugging
  only ever got applied to the live `world/serverconfig` copy, not
  `pack/config/lithium.properties` — the tracked repo and the running
  instance silently diverged until it was specifically checked for.
- **A sandbox test needs this pack's full performance/optimization
  stack in it (Radium, Embeddium, FerriteCore, ModernFix, Clumps, Entity
  Culling), not just whatever mod is being directly evaluated.** A
  minimal-mod-set sandbox for the desert-drop structure pass came back
  clean, but the real pack crashed on actual first world creation —
  Radium's own `WorldGenRegion` mixin threw an NPE that only showed up
  once real, larger jigsaw structures (When Dungeons Arise/Structory)
  reached into a not-yet-generated neighboring chunk, an interaction the
  minimal sandbox never exercised. A minimal test proves less than it
  looks like it proves when the thing that actually breaks is an
  interaction between two mods, not either one alone.
- **When switching a world's `biome_source` to `multi_noise`, check
  whether the climate axes (temperature/humidity/continentalness/
  erosion) were hardcoded to constants for a prior single-biome setup**
  — caught before shipping during the desert-drop rebuild: the flat
  world's `noise_router` had all four pinned to `0.0` (harmless when
  only one biome ever got selected), which would have silently resolved
  every column to the same biome again under `multi_noise`, defeating
  the entire point without erroring. Fixed by reusing vanilla's own real
  noise functions for those four axes specifically, confirmed safe for
  flatness because `final_density` never reads them.
- **A Forge `SERVER`-type config never hot-reloads — only `CLIENT`/
  `COMMON` configs get the live file-watcher.** Confirmed the hard way
  evaluating Undead Nights as a wave-scaling backend: live-editing a
  `SERVER` config value while the world kept running had zero effect
  across two respawns, only a full restart picked it up. Relevant any
  time a future mod's config needs to change mid-session rather than at
  world start — check which config type a value lives in before
  designing around "just rewrite the file."
- **When checking a mod's real behavior against source, pin to the exact
  installed version/branch, not just "a real copy of the repo."** The
  world-type noise rebuild broke on its first real test because its
  reference data was verified against a source that wasn't actually
  pinned to this exact Forge 1.20.1 build. Repeated correctly for the
  Pure Suffering investigation: the mod's GitHub repo's `main` branch is
  actually a NeoForge 1.21.1 rewrite, entirely different code from what's
  installed — the real check used the repo's separate `1.20.1` branch,
  confirmed by its `gradle.properties` matching our pinned
  `1.6.8.5R-LTS1` exactly before trusting anything read from it.
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
