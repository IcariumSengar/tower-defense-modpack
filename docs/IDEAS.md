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

---

## Pedestal upgrades: health, armor, thorns as progression

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

## Survey of similar-themed modpacks, 2026-09-04

**Round 1 resolved 2026-09-04 — moved to FEATURES.md's "Polish/utility
mod pass" entry.** Direct follow-up correction after the first pass
(gameplay-mechanic finds) missed the actual ask: "dont like any of
these... im thinking of mods/utilities/resource packs etc that would
polish the pack rather than sweeping changes to gameplay." Real fix,
also user-taught: use a CurseForge modpack's own **Relations →
Dependencies tab** to get the real, complete mod list, not the
marketing-blurb description — this surfaces far better candidates and
is the technique to reuse for any future pack survey. Pulled full
dependency lists from Troublesome Towers (197 mods) and Abandoned
Apocalypse (141 mods, better genre fit), filtered for pure polish/
utility (no new mobs, mechanics, or content systems), confirmed via
AskUserQuestion rounds. Full picks + real Forge-1.20.1-availability
verification + 2 real gotchas caught (a 3-way "Damage Numbers" naming
collision; Fresh Animations/Tissou's Zombie Pack both being resource
packs, not mods, needing EMF+ETF as real Forge infrastructure instead
of Optifine) in FEATURES.md.

Original framing preserved below for context on the caveat/process.
**One correction to the "parked" note in it**: that applied to the
gameplay-mechanic ideas the first pass surfaced (noise/light-attracts-
hordes, player-side infection, player-count-scaling — all still
genuinely parked, unchanged). It does NOT apply to the actual polish/
utility mod picks that came out of round 1 above — those are real
polish work, which is exactly what the current "polish before new
tiers" priority asks for, not something waiting behind it.

Direct request: look at other zombie-apocalypse/horde-defense modpacks
for mods/mechanics we haven't considered. **Real caveat up front**: most
CurseForge modpack pages have thin, marketing-style descriptions, not
itemized mod lists — this is a partial survey built from what could
actually be verified, not exhaustive.

**Concrete, verified candidates:**
- **Open Modular Turrets Reborn** — see "Machine progression, Tier 3-4"
  above, real Forge 1.20.1 build confirmed, strong Tier 3 Auto-Turret
  candidate.
- **A siren/alarm block as a wave-start cue** — several real alarm/siren
  mods exist for 1.20.1 (Orva Alarms and Sirens confirmed 1.20.1; PAM;
  Alarms & Sirens on Modrinth), but every one of them is a
  redstone-triggered cosmetic block, not an actual mob-detection system
  — there's no mod that does "auto-detect approaching horde and sound
  an alarm." The real idea worth keeping: our own wave-start hook
  (`wave_spawner.js`) already exists and could trigger a real siren
  block via a KubeJS-flipped lever/redstone signal at wave start,
  layering a genuine alarm sound on top of the existing Wave Horn cue
  using an off-the-shelf block instead of building new sound assets —
  cheap, small-footprint, matches "prefer a mod's mechanic wholesale."

**Mechanics seen in other packs, not mod recommendations — food for
thought, not scoped:**
- **Noise/light-attracts-hordes** ("Mustard Virus" modpack's own
  framing: infected mobs "attracted to light, sound, and movement") —
  would be a genuinely new mechanic (not a mod install), real tension
  with base lighting/redstone/machine noise. Interesting fit for this
  pack's "stay home and craft vs. venture out" choice (loud machines at
  home could have a real cost), but this is new-mechanic-category work,
  parked behind the current priority same as everything else.
- **Infection-on-hit for the player** (seen in "Cursed Walking," "The
  Hordes," and others as a genre staple) — TFTH's own infection system
  already exists in this pack's mob roster but has never been extended
  to the player; several packs build a whole progression around it.
  Worth a real look at what TFTH itself might already support for
  player-side infection before reaching for a different mod, given
  TFTH's already installed.
- **Player-count-scaled horde difficulty** (Troublesome Towers, Wave
  Defense) — not relevant to a currently-singleplayer-assumed pack (see
  the multiplayer all-players-killed decision in the current playtest
  batch — this pack is drifting toward at least considering multiplayer
  more seriously), but if that direction firms up, several packs already
  have real, working patterns for this worth studying rather than
  designing from scratch.

**Packs surveyed, real findings (not all panned out):**
- **Troublesome Towers** — closest thematic match to "tower defense +
  expanding world border" of anything found; genuinely parallel design
  (players defend one base inside a growing world border against an
  evolving hostile faction). Its actual mod list wasn't published in
  enough detail to extract concrete picks beyond the general shape
  already confirming our own approach isn't a strange one.
- **Cursed Walking** — zombie-phase escalation (runner zombies, brutes,
  in later phases) matches our own wave-escalation shape closely, but
  its actual defense-mod stack leans hard into firearms (Timeless and
  Classic guns, Marbled's Arsenal/Melees) — a real aesthetic mismatch
  with this pack's medieval-leaning Tier 1-2 (Trapcraft, Medieval
  Defense Turrets), not recommended to pull from directly.
  Considered and set aside for that reason, not missed.
- **Wave Defense** (skyblock-flavored) — real mod picks worth noting:
  Open Modular Turrets (its pre-Reborn, dead branch — see above for the
  live one), Utility Mobs, Quiverbow/Quivermob (gun-themed, same
  aesthetic-mismatch concern as Cursed Walking above).
- Several other packs surfaced by name only, no real mod-list detail
  extractable (Zombie Hordes, Abandoned Apocalypse, ZombieCraft,
  PwrDown's Zombie Apocalypse, The Last Survivor, Mustard Virus,
  Crafting Dead) — Crafting Dead in particular is PvP-multiplayer-
  server-focused, a different genre fit than this pack's structure.

**Worth a deeper pass later, not done here**: this was a first, fairly
shallow survey (a handful of web searches, most modpack pages too thin
to extract real mod lists from). If this direction is worth more time,
a more thorough pass would mean actually opening each pack's full
manifest/mod list (via a packwiz-style export or the pack's own
changelog) rather than relying on marketing descriptions — genuinely
more work, not done speculatively here.

## Power system — moved to FEATURES.md 2026-09-01

**Decided and fleshed out**: Immersive Engineering (generation) + Flux
Networks (wireless distribution), tied to a new Refined
Storage/Sophisticated Storage storage system in the same design pass —
see FEATURES.md's "Storage & power system" entry under "Defense" for
the full spec. Parked in QUEUE.md, not yet sent to build. The shared-
pool-vs-unlimited-draw question from the original note here is still
genuinely unresolved — carried forward into that entry rather than
answered.

## Machine progression, Tier 3-4

Tier 1 (Trapcraft) and Tier 2 (Trapcraft's Igniter/Fan/Magnetic Chest +
Medieval Defense Turrets) are both specced now — see FEATURES.md. Tier
3-4 are still just the original design-note sketch, not scoped:
- **Tier 3 — powered** (power system now resolved, see above): Tesla
  Coil (chain-lightning) — **Immersive Engineering's own Tesla Coil is
  now already in the pack once the power system above is built**, no
  separate install needed for this piece specifically. Auto-Turret,
  Flame Thrower Emplacement still unscoped.
- **Tier 4 — elite/endgame**: AoE Devastator, Chain-Tesla Network.
- Design lever, still valid: Tier 1-2 degrade from overuse (rebuild
  resource sink), Tier 3-4 need active power/fuel (different
  maintenance pressure) — two different flavors of resource tension for
  early vs. late game. **Whether the new power system retroactively
  powers Tier 1-2 too is explicitly not decided** — see FEATURES.md's
  entry — default assumption is it stays Tier 3-4 only, preserving this
  split, unless told otherwise.
- Reference mods for the rest of Tier 3-4, never evaluated against
  actual flat/desert world-gen or footprint cost: Thermal Expansion,
  Mekanism, Industrial Foregoing (tiered component templates).
  **TurretCraft and K-Turrets** were also researched for Tier 2's
  turret slot and passed over as too feature-rich for it (smart
  auto-targeting, ammo GUIs, combat drones) — worth reconsidering
  either of them for Tier 3's Auto-Turret instead of researching fresh.
  **New candidate, found via the 2026-09-04 similar-modpack survey (see
  below): Open Modular Turrets Reborn** — real Forge 1.20.1 build
  confirmed (the original Open Modular Turrets stops at 1.12.2; "Reborn"
  is a from-scratch 1.20.1 revival, self-contained, no external
  dependencies, its own reworked progression system). Not yet compared
  against TurretCraft/K-Turrets on the specific "too feature-rich for
  Tier 2, might be right for Tier 3" axis — worth a real look when Tier
  3 gets picked up.

## Custom loot materials, beyond vanilla-only — rule retired 2026-09-05, this draft tier structure is now live design material, not deferred

**Stale until 2026-09-06**: this section used to say the loot system was
vanilla-materials-only "by design" and that was still the standing call
— that's no longer true and hadn't been swept here when it changed.
Real timeline: the vanilla-only rule was retired 2026-09-05, direct
quote, "I want the game to feel like killing mobs means progressing
your tech" (see FEATURES.md's "Loot bags" section) — custom/modded
items are explicitly allowed now, especially top-tier rewards. **First
attempted application retracted same day it was specced (2026-09-06)**:
bonus rolls of Create-family items (`create:andesite_alloy`,
`createaddition:iron_sheet`/`iron_wire`) — pulled after a real
correction, see the new "Loot shouldn't hand out shortcuts to what a
placed home machine already makes" working principle below. Nothing
modded has actually shipped into loot yet; still open until Tier 3-4
ships real components nothing at home can make.

The original draft tier structure below was written before any of that
existed — it's **entirely custom invented materials** (not from any
installed mod), a different, bigger idea than the modded-Create-items
approach that's actually shipping now: Scrap/Bone Shards/Rotten Sinew
(Tier 1) → Refined Alloy/Charged Dust/Venom Sacs (Tier 2) → Core
Fragments/Volatile Essence (Tier 3), plus a Disassembler-style mechanic
to break excess loot down a tier. Worth a real decision at some point:
does this pack want *both* (real modded items as shortcuts/rewards, plus
a wholly invented material economy on top), or does the modded-items
approach already scratch this itch and the invented-tier idea should be
dropped? Not decided either way. **Trapcraft may already solve the
Disassembler part** now that it's installed for Tier 1 traps — worth
checking its own recycling-adjacent mechanics before building one from
scratch, given it's already in the pack for a different reason.

## Biomes O' Plenty — richer multi-biome path (resolved differently, not pursued)

**Closed 2026-08-31**: the goal this idea was chasing — real biome
variety on the flat world, not locked to one desert biome — actually
shipped, just via a different mechanism than planned here. The
desert-drop rebuild moved the world straight to a curated 7-biome
`multi_noise` source (desert, badlands, savanna, savanna_plateau,
plains, sunflower_plains, meadow — picked from real structure-mod tag
frequency, see FEATURES.md's "World type" section) using **vanilla
biomes only**, no BOP needed. BOP's Wasteland biome (Dried Salt ground,
dead trees) is still a genuinely closer aesthetic match than any vanilla
biome if the current set ever feels thin — worth revisiting for that
specific reason, not for the "need multi-biome at all" problem, which
is solved.

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

## Keeping the hand-authored ramp (waves 1-8) interesting — unranked ideas

**Dropped 2026-09-06**: the "distinct wave 8 finale mechanic" idea that
used to live here. Stale premise — waves 1-8 aren't a self-contained
campaign with wave 8 as its ending, they're the hand-authored ramp
before the endless phase (already built, 40 escalating difficulty
levels) takes over and keeps going forever. There's no ending for a
finale mechanic to attach to. See FEATURES.md's "Full zombie-apocalypse
roster pivot" for the corrected framing.

1. Smaller narrative beats mid-ramp (a diary page, a distant explosion,
   a radio crackle at wave 3 or 4), not saving all the story for the
   wave-5 beat that already exists.
2. A supply-drop event during the peacetime countdown gap — gives the
   3-minute wait a reason to move around instead of standing still.
3. A rotating wave modifier ("faster mobs this wave," "no sound cue
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

**Moved to FEATURES.md 2026-09-01** — fleshed out into a real spec (both
mods re-verified: exact names, real Forge 1.20.1 files, confirmed no
dependencies) under "Base & structures" once the 2026-08-31 structure
swap confirmed "abandoned/post-apocalyptic, not fantasy" as the pack's
actual aesthetic direction, making this a direct match rather than a
speculative fit. See FEATURES.md's "Pack decoration pass" entry.

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

Mostly still genuinely open:
- Exact number of loot/machine tiers beyond what's built.
- Win state: leaderboard/endurance only, or some form of victory? The
  "closer to a roguelike endurance challenge than a clean-victory game"
  framing is the only answer so far.
- Full machine list beyond Tier 1 — more types likely as Tier 2-4 get
  designed.
- Power system: shared pool/capacity limit, or unlimited draw?
- **Resolved 2026-09-05** — the vanilla-materials-only loot rule was
  retired, not just questioned; see the "Custom loot materials" section
  above. What's still genuinely open is the *shape* of what replaces it
  (modded items as shortcuts vs. a wholly invented material economy vs.
  both).

---

## Working principles (apply these going forward, don't re-litigate)

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
