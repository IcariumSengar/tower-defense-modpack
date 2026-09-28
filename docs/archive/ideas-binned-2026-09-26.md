# IDEAS.md sections binned 2026-09-26

Verbatim copy of every docs/IDEAS.md section removed in the 2026-09-26
backlog review (keep/bin decided item by item with the user). The
one-line binned list and reasons live in IDEAS.md's "Binned" section;
this file is the full original text, including research records on
mods that were checked and ruled out. Kept so the same ground doesn't
get re-researched blind.

---

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
- **Player-count-scaled horde difficulty — moved to FEATURES.md
  2026-09-08.** The "drifting toward multiplayer" note below turned into
  a direct ask the same day: real assessment done, a genuine
  architectural blocker found (shared campaign state lives on
  `player.persistentData`, not world state — breaks the moment a second
  player joins), and a scaling direction chosen (more mobs per wave +
  party-wide perks, tuned for 2-4 players) — see FEATURES.md's
  "Multiplayer / LAN readiness" section for the full writeup. Assessment
  only, not sent to build.

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

**More candidates surfaced 2026-09-08, from a user-supplied research
dump — each individually verified against a real CurseForge/Modrinth
files list before being logged here, not taken on the dump's own word
(3 of its claims turned out wrong — see below). Reconnaissance only,
nothing built or installed from this:**
- **Advanced Tower Defense** — real, confirmed: 50+ turrets, genuine
  Forge 1.20.1 build, actively updated (last update within days of
  checking). Its **Anvil Launcher** (drops anvils on grouped enemies
  from above) is genuinely novel — nothing like it in the current stack.
  Its basic Arrow Turret/Musket Sentry would be redundant with the
  already-live, quest-integrated Medieval Defense Turrets though — this
  is a "supplement Tier 2/3 with one specific piece" candidate, not a
  Tier 2 replacement. **Superseded 2026-09-09**: direct feedback called
  the Arrow Turret itself weak/boring and a thematic mismatch — Musket
  Sentry is now specced as the actual Tier 2 replacement, not a
  supplement. See docs/FEATURES.md's "Tier 2 trap replacements" section.
- **Tower Defense Units** ("The Angerer" taunt totem, Sniping Turret) —
  **ruled out**. Real files list tops out at 1.18.2; no 1.20.1 build
  exists at all, despite the dump's confidence.
- **Immersive Intelligence** (chemical/liquid turret, HMG sentry, an
  Immersive Engineering addon) — **ruled out**. Confirmed 1.12.2 only,
  no 1.20.1 port exists.
- **Create: Crafts & Additions' own Tesla Coil** — real, and **already
  installed** (this pack has `createaddition` since the Barbed Wire
  swap). Chain-lightning-style: redstone-signal-activated, damages/slows
  nearby mobs, can also passively charge FE items placed under it.
  Genuinely zero-install-cost Tier 3 candidate — but it **overlaps**
  with the Tesla Coil slot above that already assumes Immersive
  Engineering's own version once the power system gets built; worth a
  real pick between the two (or using both for different roles) when
  Tier 3 actually gets picked up, not decided here.
- The dump also included a large batch of generic KubeJS tutorial
  scripts (recipe-gating templates, tooltip injection, a trap-decay/
  weathering mechanic, hit/muzzle-flash particle-and-sound effects, a
  custom boss-wave spawner with a vanilla bossbar and streamed custom
  music, an FTB Quests chapter template) — read, not adopted. Mostly
  generic patterns that don't reflect this pack's own established,
  hard-won techniques (real event-cancellation vs. entity-discard
  timing, the wave_spawner.js throttle pattern, SRG-vs-official
  reflection naming) and duplicate systems this pack already has working
  a different way — Undead Nights' 4 named hordes already covers "named
  boss enemy," the live FTB Quests book already covers "quest chapter,"
  the pedestal's own bossbar already covers "boss-style health UI."
  Not something to build from as a template.

**Tier 4 deep dive + decision (2026-09-15)** — direct ask to source more
powered/damage-dealing mods, three parallel research passes (turret
mods, AoE/chain-lightning mods, IE-ecosystem addons), each verified
against real CurseForge/Modrinth files lists, not descriptions:
- **Decided: Open Modular Turrets Reborn** for Tier 4. Real, self-
  contained 1.20.1 Forge build, zero dependencies, every component
  (base/sensor/barrel/chamber) is a plain crafting-table recipe — clears
  the same "no workbench/blueprint assembly step" bar that got Create
  and Advanced Tower Defense removed. 5 tiers, low tier on furnace fuel,
  higher tiers run on **RF/FE directly** — plugs straight into the
  already-built Flux Networks grid, no parallel power system. Top tier
  is a Rail Gun/Plasma turret. **Built 2026-09-15, direct go-ahead
  ("build it")** — see docs/MODS.md's new row and docs/FEATURES.md's
  "Machine progression (Tier 3-4)" entry for the shipped implementation
  (only Grenade Turret + Rocket Turret adopted, not the full 10-turret/
  5-tier catalog — see `tier4_turret_recipes.js`'s header for the
  curated scope and why).
- **K-Turrets** — re-considered per the 2026-08-30 note above suggesting
  it for a later tier once passed over for Tier 2. Confirmed real, far
  better-maintained (5M downloads) than OMT Reborn, but ammo-based
  (bullets/gauss/fire charges) rather than FE — a separate resource loop
  instead of a power draw, needs one small library dependency (Satako).
  Its Fire Charge Turret is the one turret with real splash damage.
  **Passed over in favor of OMT Reborn** (FE integration matches the
  established Tier 3 pattern more closely) but stays logged here as a
  real, viable alternative/supplement if ammo-based variety is wanted
  later.
- **True AoE/chain-lightning: confirmed no clean mod exists.**
  **Immersive Intelligence** (IE's own warfare addon — HMG nests,
  railgun turrets, mines; would've been the ideal aesthetic/mechanical
  fit) is still 1.12.2-only, reconfirmed live against its real files
  list — same dead end as 2026-09-08, not just assumed stale.
  Mekanism has a laser-turret addon (`mekanism_turrets`) but it hard-
  requires installing the entire Mekanism tech tree alongside the
  already-installed Immersive Engineering — redundant parallel ore-
  processing/power system, ruled out on footprint alone, not mechanics.
  IE's own installed jar has nothing hidden beyond the Tesla Coil/Gun
  Turret/Chemthrower Turret already in use (its Railgun is a handheld
  item, not a turret). **The "AoE Devastator"/"Chain-Tesla Network"
  placeholder names still have no mod to hang off of** — the real path,
  if this gets picked up, is custom KubeJS on top of the existing Tesla
  Coil (e.g. scripting multiple coils to arc to each other, or a
  boosted-radius variant), same pattern as the custom Spike Trap when no
  mod fit Tier 1's design. Not scoped further, not decided to pursue.
- Also checked and ruled out: **Landmines** (real, lightweight, standalone
  1.20.1 mod with genuine AoE explosive/potion/teleport mines) — unpowered,
  and redundant with SecurityCraft's Claymore/Bouncing Betty already
  covering the landmine niche in Tier 2. **Immersive Petroleum** and
  **Immersive Machinery** — both real, current, IE-adjacent 1.20.1 mods,
  but zero combat content (oil rigs, a submarine) — logged as ruled out
  so they don't get re-researched later.

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

**Cadence resolved 2026-09-08, shared decision with the boss-wave
system's own cadence fork (docs/FEATURES.md's Track C entry / boss_wave.js) -
every 10th wave (10, 20, 30, ...), i.e. this WOULD be a boss-wave-only
reward if built.** Only the cadence question was resolved here -
the "preview vs. reward-exclusive content" fork below is still open, and
the actual placement mechanic described below is still NOT built - this
note just answers "which wave(s)" now that boss waves give it a real,
concrete anchor point instead of an unresolved "maybe."

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

## Open questions carried over (original wording, pre-2026-09-26)

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
