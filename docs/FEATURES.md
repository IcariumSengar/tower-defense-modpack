# Features

Concrete feature designs — things that have moved past raw brainstorming
into an actual spec, whether built already or ready to build. Split out
from [docs/IDEAS.md](IDEAS.md) on 2026-08-30 because that file had grown
to 3000+ lines of stacked addendums and was no longer usable as a
working notepad.

**How this differs from IDEAS.md**: IDEAS.md is the notepad — raw,
unrefined, "things to think about," not necessarily decided. This file
is the spec layer — what a feature actually *is*, once it's been
decided or drafted into something buildable. Each entry here is a
current-state description, not a chat transcript of how the design
evolved — for the blow-by-blow implementation history (bugs found,
rounds of tuning), see [docs/MODS.md](MODS.md), which tracks that in
detail already.

**How this differs from MODS.md**: MODS.md is the build log — mods
added/removed and the "Custom glue" implementation notes, written from
the implementer's side. This file is written from the design side —
what the feature is for and how it's meant to work — and points at
MODS.md for the implementation history rather than duplicating it.

Status tags used below: **live** (built and part of the current pack),
**planned** (fully designed, not built yet), **retired** (built, then
deliberately removed — kept here so it doesn't get re-proposed blind).

**Swept for staleness 2026-09-01** — several sections had drifted into
blow-by-blow debugging narrative (this file's own stated job belongs to
MODS.md) or described mods/mechanisms since replaced or removed.
Compressed to current-state descriptions with pointers to MODS.md for
full history, and fixed several "not yet confirmed in-game" tags that
had since been confirmed through actual playtesting.

---

## Core loop

**Wave Horn** — *live*. Right-click `kubejs:wave_horn` (auto-given at
first spawn) to summon the next wave on demand rather than waiting for
one to find you. Deterministic 8-wave campaign (vanilla mobs + TFTH
mobs from wave 2 on), each wave adding a tougher composition on top of
the last. Mobs spawn genuinely beyond the worldborder and walk in (not
near the player), with staggered emergence (gaps shrinking from 16
ticks at wave 1 to a 4-tick floor by wave 8) and a positioned sound cue
~0.6s before each spawn. Forces night + freezes the daylight cycle for
the wave's duration so undead mobs don't burn. Refuses to re-summon
while mobs from the current wave are still alive. A 3-minute countdown
to the next wave starts automatically once a wave clears (see below);
using the horn manually during the countdown skips the wait.
Implementation: `wave_spawner.js`, `wave_status.js`.

**Investigated and rejected 2026-08-30: Pure Suffering as the scaling
backend.** The plan was to use its built-in tiered invasion escalation
for "a huge number of waves" of real count/toughness/speed scaling,
with the Wave Horn as a thin trigger. Checked against the exact pinned
source (its `1.20.1` branch at tag `1.6.8.5R-LTS1`, matching the
installed version, not a newer/wrong branch). Severity turned out fully
command-controllable (a real positive) and its "5 stages" are fixed
presets, not an auto-ramp (a correction to the original assumption, also
fine). The actual blocker: its mob spawn positioning is entirely
player-distance-based with no concept of the worldborder at all — using
it would mean giving up the already-tuned "spawn beyond the border, walk
in" system in `wave_spawner.js` entirely, not a tunable detail. Fell
back to hand-building the scaling formula instead — see "Endless phase
scaling" below, which superseded `docs/deferred/night_scaling.js`'s
approach rather than reviving it (wave-number-keyed, scoped to
wave-spawned mobs, not a global day/night-keyed hook).

**Endless phase scaling (waves 9+)** — *live, built 2026-09-01*. Real,
indefinite escalation in count/toughness/speed past the designed 8-wave
campaign, so a player who reaches "a huge number of waves" is always
hard-pressed instead of coasting on wave 8's composition forever. Waves
1-8 are untouched. Built on the **Undead Nights** mod (chosen after
ruling out Pure Suffering — see above — and DeceasedCraft, which is a
whole separate modpack, not a droppable mod): `wave_spawner.js` calls
`/undeadnights difficulty set <n>` (mapped from wave number) then
`spawn_horde` via `execute as <player>` (console source NPEs on these
specific commands, unlike the rest of the file's commands), and
`wave_status.js`'s display no longer caps at wave 8.

**Undead Nights' own native "Nights of the Undead" autonomous horde
system is intentionally disabled — only the explicit `spawn_horde`
command path above is used.** Real bug found and fixed 2026-09-02,
unrelated to any of the day's other retunes: the mod's own
`undeadNightsEnabled` config defaulted to `true` (gracePeriod 0) since
install, and nobody had explicitly turned it off — the assumption had
always been that only this pack's own explicit `spawn_horde` call
triggers a horde. But `wave_spawner.js` forces `time set night` on
every horn use, and Undead Nights' autonomous system fires
independently the moment night falls — so a second, completely
uncontrolled horde (different mob types than `WAVE_MOB_TYPES`, invisible
to the wave-clear gate/hostile counter) had been spawning on top of
every deterministic wave the whole time. The "A horde has spawned!"
chat line everyone had been reading as ambient flavor text was this
system actually firing. **Verified safe before disabling** (decompiled
`MainConfig.class` + `HordeSpawner.class`): the enabled flag only gates
`HordeSpawner.tick()` (the autonomous day-count checker) — the explicit
`spawn_horde` command backing the endless phase never reads it, so
endless-phase scaling itself is unaffected. Disabled in
`defaultconfigs` and both live saves' runtime configs. **If this config
is ever touched again, keep it disabled** — re-enabling it
(intentionally or by a config reset) brings back the uncontrolled
second horde.

**That verification was wrong, and the mistake broke the entire endless
phase for real - found and fixed 2026-09-04.** Real live report: "wave
9, nothing spawned in at all," every endless wave since instantly and
vacuously "clearing" with zero real mobs. The 2026-09-02 check above
only looked at `SpawnHordeCommand`'s own method (correct: it doesn't
read the flag, it just adds the player's UUID to
`entitiesWithPendingHorde`). It never checked `HordeSpawner.tick()` -
the method that actually CONSUMES that queue and does the real
spawning - decompiled directly this time: its very first real check,
before anything else, is `if (!MainConfig.getUndeadNightsEnabled())
return 0`. With the flag off, every queued request just sat there
forever, never processed. The whole endless phase has been completely
non-functional since the moment that flag was disabled, not because of
anything from the wave-countdown/roster/gold work done today.
Fix: re-enabled `undeadNightsEnabled`, and closed the 3 real autonomous
paths inside that same `tick()` method directly instead of relying on
the master flag to do it - `chanceForHordeNight = 0` and
`enableRandomHordes = false` across all 40 levels in
`undeadnights_difficulty_config.json` (the night-based and random-horde
triggers), `hordeZombiesSpawnNaturally = false` in
`undeadnights-server.toml` (a third, independent per-tick "stray
zombie" spawn path, untouched by either of the other two). All three
verified by reading their exact gating logic in `tick()` directly, not
assumed safe by analogy this time. Same edit also disabled the
`difficultySettingsLureEffect` block across all 40 levels (a real,
separate autonomous horde-spawning path via a status effect, unrelated
to either fix above and live the whole time - direct user ask, "cut it
entirely, same call as the earlier autonomous-horde disable").
**Real deployment note**: `undeadnights-server.toml` is baked into a
save at world creation (Forge SERVER-type config) - fixed directly in
the live save's own `serverconfig/` copy, not just `defaultconfigs`,
but still needs the user to exit and reload that same world (not a
fresh one) to take effect. Expect a real side effect on that reload:
backed-up pending-horde requests from the wave 10-19 horn-spam
materializing as a noticeable batch rather than a clean single wave.

40 difficulty levels, generated by script rather than hand-typed:
`healthAttributeScaleFactor(w) = 0.08w`, `damageAttributeScaleFactor(w)
= 0.05w` (both uncapped — the "always hard-pressed" axis),
`speedAttributeScaleFactor(w) = min(0.5, 0.02w)` (capped — speed
compounding breaks kiting past a point), `hordeSizeScaleFactor` capped
for the same server-performance reason count was always going to need a
ceiling. 4 named hordes, built entirely from this pack's own existing
roster (zombie/skeleton/spider/wither_skeleton trash floor, ravager/
flesh_suffer/bruteplaquecreatureone/flesh_hunter_two/
plaquethreelegcreature/flesh_boomer elite pool) — none of Undead
Nights' own bundled zombie variants used. Boss-wave spike uses the
mod's native `bossHordeEnabled`/`bossHordeId`. `updateAttributesOfThirdPartyMobs:
true` is set on every level (required or the scale factors silently do
nothing to non-Undead-Nights mobs), and `securityCraftCompatibility` is
enabled (stops Horde Zombies breaking the reinforced Chokepoint walls).
**Spawn distance reverted to 70/75 (2026-09-01), a real regression from
the original design, not silently papered over.** Originally shipped at
240-256 specifically to stay "beyond the worldborder" for roughly the
first 95 waves. First real wave-9 playtest found it completely broken —
"a horde has spawned" but nothing appeared — root cause: the live
instance's actual `simulationDistance` is 12 chunks (192 blocks), so
every horde spawn target at 240-256 blocks landed in a chunk that was
never simulated and never ticked into existence. Reverted to Undead
Nights' own real default (70/75), already confirmed working in the
original build's sandbox test. **Known consequence, not resolved**: at
70/75 blocks, endless-phase hordes stop reliably spawning beyond the
worldborder once it grows past that range — which happens early
(worldborder growth was also just reduced ~43% per separate playtest
feedback, but even at the reduced rate this is well within the
designed 1-8 campaign, let alone the endless phase). The "always beyond
the border" guarantee this axis was designed around no longer holds at
high wave counts — a real, currently-unaddressed gap between two of
this pack's own decisions (server simulation distance vs. desired spawn
staging), not something to build around further until it's decided
whether server config (raising simulation distance) or a different
spawn strategy is the real fix.

**Verified with real spawned-entity NBT, not just config validation**:
set difficulty level 20 on a live sandbox, spawned a horde, read a real
zombie's actual attribute values — health +160%, damage +100%, speed
+40%, matching the formulas to the decimal.

**Known caveat, still unsolved**: skeleton's real threat is its arrows,
not its `generic.attack_damage` melee attribute — scaling that
attribute won't make arrows hit harder.

**Quest 10 ("No Turning Back") removed entirely** (2026-09-01, direct
request alongside "The Reckoning" - the last 2 Basics quests, user
found them pointless) - resolves the flavor-text-rewrite need above by
removing it, not by writing new text.

**Real bug found on the first actual wave-9 playtest, fixed
2026-09-01**: Wave Horn reported "a horde has spawned" but nothing
appeared. Root cause confirmed, not guessed: the live instance's real
`simulationDistance` is 12 chunks (192 blocks, from `options.txt`) -
the shipped `distanceMin`/`distanceMax` (240/256, chosen to spawn
"beyond the worldborder," the same border-relative reasoning
`wave_spawner.js`'s own deterministic-phase spawn code had, since
fixed - see "Wave Horn" above) always exceeded that, so every horde
spawn target landed in a chunk the game never simulates and the mobs
never ticked or became visible. Reverted `distanceMin`/`distanceMax` to
the mod's own real default (70/75) in both the tracked
`defaultconfigs/undeadnights-server.toml` and directly in the live
save's own runtime `serverconfig/undeadnights-server.toml` (SERVER-type
Forge configs don't hot-reload - editing the per-save file directly is
the established technique for an already-created save). This exact
70/75 value was already confirmed working in a real sandbox test during
the original build above - not a fresh, unverified guess. Not yet
confirmed by an actual wave-9 playtest with the fix in place.

**Disable recipe-unlock toasts — requested 2026-09-04, built and
deployed 2026-09-04 (commit 3432c6b).** Direct feedback: the vanilla
"you have new recipes available" popup is firing constantly and the
user wants it gone. Confirmed there's no vanilla client setting for
this (checked directly, not assumed) — the recipe-toast toggle simply
doesn't exist in this game version's options menu. **Toast Control**
(CurseForge, author Shadows_of_Fire, 189M+ downloads, zero
dependencies *as far as this doc's own research found*) is the fix:
disables Recipe and Tutorial toasts **by default**, zero config needed,
leaves other toast types (advancements, etc.) untouched. Its real Forge
1.20.1 build (`ToastControl-1.20.1-8.0.3.jar`, 41.6M downloads on that
file alone) is dated August 2023 — checked via the actual filtered
CurseForge file list, not a single file page or search snippet,
applying the exact lesson from the Lootr staleness mixup earlier this
project. Unlike Lootr, this isn't concerning: it's a tiny (26KB),
simple client-side UI mod with no complex mod-interaction surface — the
kind of utility that's genuinely finished for a stable MC version
rather than abandoned mid-development, and the download count confirms
very wide real-world use on exactly this version. **Real dependency
this doc's research actually missed, caught before it mattered**:
**Placebo** (Shadows_of_Fire's own shared library), not already present
in this pack — packwiz's own CurseForge dependency resolution caught
it during install, not a manual check. Defaults confirmed by decompiling
`ToastConfig.class` directly rather than trusting the mod's own
description: Recipe and Tutorial toasts both default `blocked=true`
already, zero config needed, as claimed.

**Suppress Supplementaries' "Amendments not installed" startup screen —
requested 2026-09-06, specced, ready to build.** Direct feedback: a
real screenshot of the warning screen shown on game launch, plus "I
think its cumbersome for a user" and wanting it gone permanently,
including on a genuinely fresh load. **Real root cause, decompiled from
the installed jar, not guessed**: `ClientEvents.onFirstScreen()` shows
this screen unless either Amendments is actually installed or
`ClientConfigs$General.NO_AMENDMENTS_WARN` (the real config key,
`no_amendments_screen`) is `true` — and that config's own real default,
confirmed from the mod's static initializer, is **`false`** (shown by
default). This pack's own live instance currently reads `true` only
because the value got flipped locally at some point (most likely the
in-game "Don't show this again" button, which the WelcomeMessageScreen
class exposes as a real callback) — that's a per-instance, manually-set
state, not something this pack actually ships, so it wouldn't survive a
genuinely fresh install/reinstall the way the user's "including on a
fresh load" ask requires. **Real, minimal fix**: ship
`no_amendments_screen = true` in this pack's own tracked
`pack/config/supplementaries-client.toml` under `[general]` (this file
doesn't exist in `pack/config/` yet — this pack has always relied on
the mod's own generated default until now), same pattern already used
for every other pre-set mod config in this pack (Toast Control's
Placebo config, Epic Siege Mod's config, etc.). This pack doesn't use
Optifine, so `no_optifine_warn_screen` isn't relevant here, but it's
worth setting too while in this file for the same "cumbersome popup"
reason, if any Optifine-alike shows up later. Zero risk — pure client
UI suppression, no gameplay/world-gen surface at all.

**Shipped 2026-09-06.** New `pack/config/supplementaries-client.toml` -
started from the real generated file already present on the live
instance (`no_amendments_screen` already `true` there from the
in-game button, confirmed matching the decompiled root-cause writeup
above) rather than hand-typing the whole thing, then flipped
`no_optifine_warn_screen` to `true` too. Live instance's own copy
edited the same way, both now match.

**Suppress vanilla's "experimental settings" world-creation warning —
requested 2026-09-06, specced, ready to build.** Direct feedback on a
real screenshot: the vanilla dialog shown on every fresh-world creation
("Warning! These settings are using experimental features... could one
day stop working"), plus "its bothering me, add the ability to skip the
per world clock [click]." Real, confirmed via a direct websearch, not
assumed: this is a hardcoded vanilla client behavior for **any** world
using datapack-level `dimension`/`dimension_type`/`worldgen` content
(this pack's whole flat + curated multi-biome `overworld.json` setup
qualifies) — there's no config flag or datapack trick to suppress it,
it's intentional per Mojang, and it doesn't show on a real dedicated
server, only the client world-creation/load flow. **Real fix: install
Serilum's "Hide Experimental Warning" mod** — verified directly, not
from the search snippet alone: real Forge 1.20.1 build, actively
maintained (updated ~3 months ago), client-side only (no server-side
install needed, consistent with this being a pure client dialog). **One
real dependency**: Serilum's own **Collective** library (same
single-author mod+library pairing pattern already established in this
pack for Toast Control/Placebo and Supplementaries/Moonlight Library) —
also independently verified real and current for Forge 1.20.1 (actively
released through the 7.8x version range). Zero gameplay/world-gen
surface, purely hides a client dialog.

**Shipped 2026-09-06.** Installed via packwiz (Collective auto-resolved
as the real dependency, pulled `8.39` - satisfies the mod's own
`versionRange="[7.78,)"` requirement, confirmed from its real
`mods.toml`). Both jars downloaded and sha1-verified against packwiz's
own recorded hashes before landing in the live instance. Confirmed
compatible directly from `hideexperimentalwarning`'s own `mods.toml`:
real `minecraft` dependency pinned to `[1.20.1]` exactly, `side="BOTH"`
on both mods (harmless no-op server-side, consistent with a pure client
dialog). Full mod set (68 mods now) boots clean, 0 KubeJS errors.

**Loot bags** — *retired 2026-09-02, replaced by BountyBags*. Used to
be a hand-rolled 3-tier system (Common/Uncommon/Rare); replaced outright
per direct feedback ("I dont like the custom loot bags") as part of the
Treasure2 replacement pass — see "Structure & loot mod replacement"
further down for the mod-install details, and "Mob-tier loot
progression" below for the current live tier design. **Standing rule
carried forward unchanged**: rarity must drive both drop rate (common
mob = common drop) and enemy-tier gating (a weak mob can never roll a
top-tier bag) — this was inverted once early on and fixed; don't
reintroduce the inversion.

**"Vanilla-materials-only" rule retired 2026-09-05.** Direct
reconsideration: "only vanilla drops in loot bags...not ideal, dont
remember coming to that decision. I want the game to feel like killing
mobs means progressing your tech." The rule existed (it's real, it was
written deliberately when loot bags first shipped, not misremembered)
but no longer reflects what's wanted. **New standing principle,
replacing it**: loot should generally match what the player actually
needs to craft and progress — kills should feel like real tech
progress, not just a drip of raw materials. Custom/invented items are
now allowed, especially for top-tier rewards, not just real vanilla
items. **Real materials can still be deliberately gated out of
mob-drop loot bags as a rare exception** (to drive exploration, or gate
a specific unlock behind finding it) — but that's the exception now,
not the rule; most progression materials should be reachable through
normal kill/loot-bag play. See "Andesite gated behind exploration, not
loot bags" below for the first real application of this exception, and
"Legendary loot bag" for the first custom-item reward.

**Andesite gated behind exploration, not loot bags — requested
2026-09-05, built, deployed, and committed 2026-09-05 (30588f6).**
Direct playtest report:
crafting materials don't actually match what the player needs to
progress — "Andesite isnt being dropped for example, so cant even craft
a hand crank." Real, confirmed gap, not a guess: grepped every current
loot source (all 4 BountyBags tier tables, `postapocalypse_structures`'
own base loot overrides, the structure-loot-progression bonus pools) —
**Andesite appeared in none of them.** So the Barbed Wire feature that
just shipped was genuinely uncraftable in real play, not just thin on
materials. This is the first real application of the exploration-gating
exception from the loot-philosophy change above.
- **Real recipe correction, verified from Create's own recipe JSONs
  rather than trusting this doc's earlier paraphrase**: Hand Crank is
  actually **3 planks + 1 Andesite Alloy** — no Shaft involved at all,
  despite what this entry originally said. Andesite Alloy itself is
  2 andesite + 2 iron nuggets, confirmed the same way.
- **Shipped**: raw `minecraft:andesite` added to all three
  `postapocalypse_structures` base chest loot tables — `trash.json`
  weight 4/count 3-8, `food.json` weight 2/count 2-6 (kept modest
  there, off-theme filler), `cobwebs.json` weight 4/count 3-9.
  Deliberately **not** added to any BountyBags tier, exactly as
  specced — this material comes from exploring, not killing. Verified
  live, not just valid-JSON-checked: rolled all three tables 15× each
  in a sandbox, real andesite drops actually came out (3 hits across 45
  rolls).
- **New quest shipped: "Turn the Crank"** (Tier 1 chapter), real task
  `create:hand_crank`, flavor text pointing at structure exploration for
  the andesite per the "search the wasteland" request — and since it
  was written after the rig placement hotfix landed, it already
  correctly references the Rolling Mill's real corrected location next
  to the furnace, not the old broken one. Sandbox boot loaded it clean
  (16 → 17 quests, no errors). **This is the real, live quest name —
  the quest book rebuild below should reference "Turn the Crank," not
  invent a second name/quest for the same thing.**
- **Committed** (30588f6).

**Legendary loot bag jackpot + beam-of-light visual — fleshed out and
queued 2026-09-05.** Raised in the "some ideas..." batch as item 1:
"during any wave there is a slim chance of a Legendary Loot bag being
dropped." Two real, independent pieces:
- **Jackpot roll, additive to the existing tier system.** Right now a
  mob can only ever drop its own tier's bag (a trash-floor zombie can
  never roll Legendary) — that gating stays exactly as-is, this doesn't
  touch it. On top of that, every wave mob (all 4 tiers combined, the
  same 4 arrays already defined in `loot_bag_drops.js`) gets a second,
  separate `randomChance` roll at a flat 2% to *also* drop a bonus
  `bountybags:legendary_loot_bag` regardless of the mob's own tier —
  a second `event.addEntityLootModifier(id).randomChance(0.02).addLoot(...)`
  call per mob id, layered alongside the existing per-tier one, not
  replacing it. This is what makes it read as a jackpot: killing plain
  trash-floor zombies all game genuinely can pay off big, not just
  killing the wave-8 finale mobs that already roll Legendary on their
  own terms.
- **Beam visual: install Loot Beams: Refork.** Verified fresh
  directly against its own CurseForge file page (not assumed from a
  search result, per this pack's own mod-freshness lesson) —
  `Loot Beams Refork-forge-1.20.1-3.2.10.jar`, real Forge 1.20.1 build,
  uploaded 2025-11-29. Client-side only (confirmed on the file page's
  own Environment field) — fine for this pack, same reasoning already
  established for Mob Dismemberment: this instance runs as integrated
  singleplayer, not a dedicated server. Beams apply automatically to
  every dropped item, colored by the item's rarity; the mod's own page
  says unsupported modded items need a config entry to get a rarity
  assigned. **Real open item for the build session**: confirm whether
  `bountybags:legendary_loot_bag` gets picked up automatically or needs
  an explicit config entry — if it needs one, give it the mod's
  highest/rarest color tier so the jackpot bag is visually unmistakable
  from a normal bag drop.
- **Scope note**: this is a kill-time jackpot, not a wave-clear-time
  event — deliberately kept inside `loot_bag_drops.js` only, no changes
  to `wave_spawner.js`/`wave_status.js`/`mob_aggro.js`, since those are
  mid-fix for the fresh-world "mobs not pathing to pedestal" regression
  right now and shouldn't have unrelated work landing in the same files
  while that's being debugged live.
- Queued to build, see QUEUE.md.

**Built 2026-09-06 — jackpot roll and mod install both real and
verified, the config piece has a genuine environmental limit.**
- Jackpot roll shipped exactly as specced (`ALL_WAVE_MOBS` = the union
  of all 4 tier arrays, one extra 2% `randomChance` call per mob id).
  Verified live, not just a clean boot: 100 plain `minecraft:zombie`
  kills (previously incapable of ever dropping Legendary) in a sandbox
  produced 5 legendary bag drops - real proof a trash-floor kill can
  now jackpot.
- Loot Beams: Refork installed via packwiz - pulled 3.4.7 (packwiz
  always grabs latest; the 3.2.10 originally checked no longer exists
  as the current file, but it's the same real mod/author/Forge-1.20.1
  target, just a newer build). Real dependency chain packwiz resolved:
  Nirvana Library, Common Network, Fzzy Config, Kotlin for Forge - all
  downloaded and sha1-verified against packwiz's own recorded hashes
  before being placed in the live instance. Full mod set (66 mods now)
  boots clean, 0 KubeJS errors. Confirmed via the jar's own
  `META-INF/mods.toml` (not assumed): real Forge `[47.3.0,)` dependency
  (this pack runs 47.4.10) and Minecraft `1.20.1` exactly, with the
  `nirvana_lib` dependency explicitly marked `side = "CLIENT"` -
  consistent with the file page's own "client-side" claim even though
  packwiz's own generic metadata just says "both".
- **Real answer found on the open rarity question, decompiled not
  guessed**: `bountybags:legendary_loot_bag` is registered with plain
  vanilla `Rarity.EPIC` - the exact same rarity this pack's own
  `epic_loot_bag` already uses (BountyBags never bothered distinguishing
  "legendary" from "epic" since vanilla's own `Rarity` enum only has 4
  tiers and stops at EPIC). Without an override, the jackpot bag would
  beam the same color as a completely ordinary epic bag drop - a real
  problem, not a hypothetical one, for a feature whose entire point is
  "unmistakable." Found the exact real config field to fix it
  (decompiled Loot Beams' own `LightConfig$CustomColorSetting` class):
  `color_override_by_name`, a real per-item color map keyed by resource
  location - `bountybags:legendary_loot_bag` just needs one entry with a
  distinct, high-tier color, no need to touch the more involved custom-
  rarity-tier system at all.
- **Real, honest limit** (RESOLVED 2026-09-06): that config file
  couldn't be generated or verified from this build session's own
  sandbox at the time - confirmed directly, a full clean boot with the
  new mod chain installed produced every other mod's own config file
  except this one (Fzzy Config's TOML output only happens on a real
  client launch, not a dedicated server boot). The peer found the real
  generated file once the user actually launched the game
  (`config/lootbeams/light_config.toml`) and relayed its exact content.
  **Two real things fixed, not just the one originally flagged**:
  1. `enable_custom_color` was `false` - the `color_override_by_name`
     map wouldn't even be consulted regardless of content. Flipped to
     `true`.
  2. **Real, non-obvious format finding from decompiling
     `ValidatedColor$ColorHolder`'s own `serializeEntry`**: a color is
     NOT a hex string (the natural guess, and wrong) - it serializes as
     a real sub-table of separate `r`/`g`/`b` integers (0-255 each).
     Shipped as `color_override_by_name = { "bountybags:
     legendary_loot_bag" = { r = 255, g = 215, b = 0 } }` (gold).
  3. **The peer's own second real finding, also resolved**:
     `[lightEffectFilter]`'s `only_equipment`/`whitelist_by_name` looked
     like it might gate whether the bag renders at all, independent of
     color. Decompiled the actual gating chain
     (`Hooker.checkRenderable()` → `LightConfigHandler.checkInWhiteList`
     /`checkInBlackList`) and found real proof this is a non-issue:
     `checkRenderable` returns `true` unconditionally whenever
     `item.rarity().context().hasBeenModified()` - and
     `ConfigColorOverride.modify()`'s own bytecode confirms applying a
     real color override constructs a `new ModifyContext(true)`, i.e.
     `hasBeenModified()` becomes `true` the moment a color override
     actually applies. **A working color override makes the item
     renderable regardless of `only_equipment`/`whitelist_by_name`** -
     no change needed to the equipment filter at all.
  Shipped as `pack/config/lootbeams/light_config.toml` (the real file,
  with these 2 edits) and the live instance's own copy edited to match.
  **Real, honest residual limit**: the exact TOML syntax for a
  *populated* `color_override_by_name` map (inline table vs. an
  expanded `[section.key]` form) is a good-faith reconstruction from
  the decompiled schema, not a verified round-trip - the one real
  example seen was the *empty* map (`{  }`), and Fzzy Config's actual
  parser was never directly exercised against a non-empty one from this
  session. A sandbox boot with this exact file in place produced zero
  parse errors, but that's a weak signal given Fzzy Config's own
  config loading is client-gated, same blind spot as before - worth a
  real look at the client log next time the game's launched, to confirm
  the entry parsed rather than silently getting corrected away.

**Modded crafting materials in loot — audited and specced 2026-09-06,
direct question: "have the loot bags and loot chest loot tables been
updated to include crafting materials from mods, i.e not just
vanilla."** Checked for real, not assumed: grepped every namespaced
item id across all 4 BountyBags tier tables
(`data/bountybags/loot_tables/items/*.json`) and every
`postapocalypse_structures` chest override
(`data/postapocalypse_structures/loot_tables/chests/*.json`) plus
`structure_loot_progression.js`'s own bonus pools — **100% vanilla
items, zero modded-namespace entries anywhere**, even after the
"vanilla-only" rule was retired (see above). The retirement has only
been applied once so far, narrowly: adding raw `minecraft:andesite` to
structure chests, which is itself a vanilla item — it just fixed a
recipe that was completely uncraftable, not a design addition. Two
separate findings from this audit:
- **No other Andesite-style blocking gap exists.** Checked Tier 1
  (Barbed Wire's iron_ingot-based chain) and Tier 2's re-recipes
  (`tier2_recipes.js` — netherrack/quartz/redstone_block/iron_block/
  planks/bow) against current loot — every real material either tier
  needs is already in a live loot table. This isn't a bug fix, it's a
  genuine design gap: no modded item (from Create, Create: Crafts &
  Additions, Trapcraft, or Medieval Defense Turrets) has ever been
  placed as a reward for killing something or finding a chest, only as
  something the player crafts from vanilla inputs.
- **Original proposal retracted 2026-09-06, real design correction from
  the user**: the original plan (below, struck through in spirit, kept
  for the record) put `create:andesite_alloy`/`createaddition:iron_sheet`/
  `createaddition:iron_wire` in loot bags as "shortcuts." Direct
  correction: "because we start with the rolling machine and the press,
  I dont want those specific items in the loot bags table." Iron Sheet
  and Iron Wire are the literal outputs of the Press/Rolling Mill rig
  already pre-placed at the base — putting them in loot as a shortcut
  undermines the actual home-crafting loop that rig exists for, not
  complements it. Andesite Alloy has the same problem one level up: raw
  `minecraft:andesite` was deliberately kept **out** of loot bags
  specifically to force exploration for it (see "Andesite gated behind
  exploration" above) — handing out the *next step up* (the Alloy
  itself) in a loot bag would undercut that exact decision.
- **Real standing design principle, stated directly by the user, worth
  applying beyond just this one spec**: "I like that a player can also
  choose to stay at base and craft things/make things to bolster their
  tech or just build defences" alongside "[I want] the player be forced
  to venture out into the dangerous structures outside the world border
  thus leaving the base unguarded." Two distinct, real paths — stay home
  and use placed machines/mob-kill materials, or leave the base exposed
  to explore for things you can't get any other way — and loot design
  has to keep them distinct. **Rule**: never put the direct output of an
  already-placed home machine into loot (bags or chests) as a
  "shortcut" — that's not a bonus, it's a hole in the choice between the
  two paths. Exploration rewards should be things genuinely unreachable
  by staying home, not a faster version of what the base can already
  make. See [[feedback_loot_shortcut_undermines_choice]].
- **Not re-proposed with different items** — given the rule above, there
  isn't an obvious modded-material candidate left from what's currently
  installed: everything in Create/Create Additions/Trapcraft/Medieval
  Defense Turrets that this pack actually uses is craftable from a
  placed machine or a plain recipe already covered by existing loot.
  Revisit once Tier 3-4/Storage & Power (Immersive Engineering, Flux
  Networks, Sophisticated/Refined Storage) actually ships — that system
  will have real components not obtainable at any currently-placed
  machine, which is exactly the shape of thing exploration loot should
  reward.
- **Superseded by, and folded into, the loot-table dead-weight audit**
  below — this entry stays for the record but isn't a standalone build
  item anymore.

**Loot-table dead-weight audit — raised 2026-09-06, not yet fully
specced, real candidate list below needs the user's confirmation on
where the line sits before it's ready to build.** Direct feedback:
"there are a lot of loot items that I dont see ever being useful in the
pack, like minecart rails or name tags." Real, not paranoid — checked
where these would actually come from, since none of this pack's own
custom tables (all 4 BountyBags tiers, all 3
`postapocalypse_structures` chest overrides, both
`structure_loot_progression.js` bonus pools) contain anything like a
rail or a name tag; every one of them was already grepped for the
Modded-materials audit above and is 100% deliberately-chosen items.
**Real source, traced from this doc's own earlier research**: Abandoned
Urban's 34 structures overwhelmingly reuse stock **vanilla** loot
tables wholesale (`village_butcher`, `stronghold_corridor`,
`simple_dungeon`, `shipwreck_treasure`, etc. — confirmed by decompiling
all 34 structure NBTs directly, see "Loot chests: rarity scaling by
distance from spawn" below), and any genuine vanilla structure
generating in the bordered play area (strongholds, mineshafts,
dungeons, shipwrecks — none of these were disabled, only desert
pyramids were) carries the same stock tables too. That's where
`minecraft:rail` (abandoned mineshaft loot), `minecraft:name_tag`
(bastion/dungeon/stronghold pools), and similar dead weight actually
comes from — not this pack's own design, vanilla's.

**Real technique confirmed**: LootJS (already installed, v2.13.1,
already used for the additive bonus pools above) supports
`removeLoot(Ingredient)` on a loot modifier — the same
`event.addLootTypeModifier('chest')` type-level targeting already
proven in `structure_loot_progression.js` (covers every chest opened
anywhere, custom or vanilla, without needing to individually override
every table a structure mod might reuse) should support a matching
subtractive call, not just the additive `context.addLoot(...)` already
in use. **Real verification needed before shipping**: this pack's exact
LootJS version's chest-type-modifier removal syntax hasn't been
confirmed directly yet (the block-loot-modifier form,
`event.addBlockLootModifier(id).removeLoot(Ingredient.all)`, is
confirmed real; the chest-context equivalent needs a real check against
the installed jar, not assumed identical).

**Shipped 2026-09-06 as `loot_dead_weight_strip.js`.** Syntax confirmed
by decompiling the installed jar directly (javap), not assumed from the
block-modifier form: `LootContextJS` (the same `context` object
`structure_loot_progression.js` already calls `context.addLoot(...)`
on) has its own real public `removeLoot(ItemFilter)` method.
`ItemFilter` itself auto-converts from a plain JS value via LootJS's own
`ofItemFilter()` (also decompiled) - anything not already an `ItemFilter`
goes through `IngredientJS.of()`, the same conversion this pack's
`Ingredient` syntax already relies on everywhere else, so a plain JS
array of item-id/tag strings works with zero special construction. Music
discs stripped via the real `#minecraft:music_discs` tag (confirmed
present in the vanilla 1.20.1 client jar) instead of hand-listing every
disc id - covers every vanilla disc plus anything a mod tags into it
later. Verified live in a sandbox before shipping: rolled
`minecraft:chests/abandoned_mineshaft` (a real vanilla table confirmed
by its own JSON to include `rail`/`powered_rail`/`detector_rail`/
`activator_rail`/`name_tag`) 10 times - zero of those ids appeared
across the whole batch, while unrelated items (iron, diamonds, torches,
this pack's own bonus-pool rolls) came through untouched, confirming the
strip works without breaking the additive pools running alongside it.

**Candidate strip list — first pass, needs your confirmation on where
the line sits, not shipping on my own judgment call alone**: items with
no real function anywhere in this pack's actual mechanics as they
stand today.
- **Minecart/rail system** (no minecart transport anywhere in this
  pack): `minecraft:rail`, `minecraft:powered_rail`,
  `minecraft:detector_rail`, `minecraft:activator_rail`,
  `minecraft:minecart`, `minecraft:chest_minecart`,
  `minecraft:hopper_minecart`, `minecraft:tnt_minecart`,
  `minecraft:furnace_minecart`.
- **`minecraft:name_tag`** — no taming/pet-naming system this pack
  emphasizes.
- **Horse gear** (`minecraft:saddle`, `minecraft:iron_horse_armor`,
  `minecraft:golden_horse_armor`, `minecraft:diamond_horse_armor`,
  `minecraft:leather_horse_armor`) — no mounted-travel design anywhere
  in this pack; worldborder is small and the player is meant to be on
  foot defending a fixed base.
- **Vanilla maps** (`minecraft:map`, `minecraft:filled_map`) —
  redundant now that Xaero's World Map is installed and does this
  better.
- **Confirmed via AskUserQuestion 2026-09-06, also stripping**:
  `minecraft:lead`, `minecraft:music_disc_*` (all discs), and
  `minecraft:elytra` plus other End-city-only loot.
- **Not** stripping anything that's a raw crafting material, food,
  combat gear, or tool — even a "boring" vanilla item like
  `minecraft:string`/`minecraft:gunpowder`/`minecraft:leather` has a
  real recipe use somewhere in this pack.

**Full final strip list**: `minecraft:rail`, `minecraft:powered_rail`,
`minecraft:detector_rail`, `minecraft:activator_rail`,
`minecraft:minecart`, `minecraft:chest_minecart`,
`minecraft:hopper_minecart`, `minecraft:tnt_minecart`,
`minecraft:furnace_minecart`, `minecraft:name_tag`,
`minecraft:saddle`, `minecraft:iron_horse_armor`,
`minecraft:golden_horse_armor`, `minecraft:diamond_horse_armor`,
`minecraft:leather_horse_armor`, `minecraft:map`,
`minecraft:filled_map`, `minecraft:lead`, `minecraft:elytra`, plus
every `minecraft:music_disc_*` variant (real ids need enumerating from
the game's own item registry/tag at build time, not guessed one by
one) — real verification still needed on the exact chest-type-modifier
`removeLoot` syntax before shipping (see above), same as always.

**Shipped 2026-09-06** — see the postscript above under "Real technique
confirmed" for the real syntax and live verification.

**Mob-tier loot progression — requested 2026-09-02, built and deployed
2026-09-03 (commit 2faf4ef).** Direct follow-up once BountyBags (bags) and Lootr (chests) were both
live: "put together a loot table and tiered system so that it feels
like you are progressing in terms of item rarity as you kill higher
tier mobs." Two separate systems, tied together by the same design
intent — better loot the tougher the thing you killed, or the further
out the chest you found — using each system's existing loot tables and
rarity tiers, no new mods needed for the mechanism itself (the
"no new custom items" constraint mentioned when this was first written
is retired now, see above).
- **Loot bags: reclassifying by actual mob toughness, not "wave of
  first appearance."** The current live mapping
  (`loot_bag_drops.js`) groups mobs into BountyBags' 4 tiers by which
  wave each mob type was first introduced — but that's a weaker signal
  than it looks: `minecraft:wither_skeleton` ended up in the Epic
  tier (same odds as the ravager mini-boss) purely because it was
  first introduced alongside wave 4-5's real elites, even though
  `wave_spawner.js`'s own design comments explicitly call it part of
  the "trash floor" (grouped with zombie/skeleton/spider every wave,
  never scaled up, never a real threat). That's a real mismatch
  against "kill something tougher, get something better." Proposed
  reclassification, using the roster's own already-documented
  trash-floor/roster-variety/elite/finale language rather than
  inventing new tiers:
  - **Uncommon** — the trash floor: `zombie`, `skeleton`, `spider`,
    `wither_skeleton`, plus the non-curated catch-all (`husk`,
    `drowned`, `creeper`, `zombie_villager`).
  - **Rare** — early roster-variety additions (waves 2-4, never scaled
    up into real threats): `flesh_human`, `flesh_villager`,
    `plaquecreaturetwo`.
  - **Epic** — the wave 6-7 "elite" escalation step, explicitly named
    as elites in `wave_spawner.js`'s own comments but never the
    designed finale of a wave: `bruteplaquecreatureone`,
    `flesh_hunter_two`, `flesh_boomer`.
  - **Legendary** — the finale-tier mobs, explicitly called out as
    such in the source ("the designed finale," "closes out wave 8
    alongside the returning ravager"): `ravager`, `flesh_suffer`,
    `plaquethreelegcreature`.
  Same per-tier drop rates as today (0.5/0.25/0.1/0.04) — only the
  mob→tier assignment changes, not the odds or the bag contents
  themselves. Net effect: a wither_skeleton kill now correctly reads as
  "trash," and every remaining tier is a mob the design docs already
  call tougher than the tier below it, not just chronologically later.
  **Shipped exactly as specced** — `loot_bag_drops.js` reclassified,
  drop rates unchanged.
- **Loot chests: rarity scaling by distance from spawn — shipped with a
  different real mechanism than proposed below.** The original plan
  (target each structure mod's own chest loot table IDs) turned out not
  to work once actually checked: decompiling confirmed **Lost City
  ships zero chest loot tables of its own across all 205 of its
  structure NBTs** — nothing to target — and Abandoned Urban's chests
  overwhelmingly reuse plain vanilla tables
  (village/dungeon/stronghold/shipwreck) shared with real vanilla
  structures elsewhere in the world, so targeting those IDs would have
  buffed ordinary vanilla loot everywhere, not just this pack's
  structures. **Shipped instead by targeting LootJS's own
  `LootContextType.CHEST`** (`structure_loot_progression.js`) — sidesteps
  both problems and still covers postapocalypse_structures' real
  per-structure tables too. Same additive "bonus pool on top of base
  loot" technique already proven on postapocalypse_structures, and the
  same proposed distance bands shipped unchanged:
  - **0-60 blocks** (roughly wave 1-3 reach): base loot only, no bonus
    pool — matches "early game stays modest."
  - **60-120 blocks** (roughly wave 4-8 reach): + a mid-tier bonus pool
    (iron/gold-family materials, same rough value band as the existing
    postapocalypse_structures treasure pool).
  - **120+ blocks** (endless-phase-only reach): + a high-tier bonus
    pool (diamonds, emeralds, netherite scrap) — genuinely worth the
    trip once the border's grown past the designed campaign.
  **Verified via two independent `/loot spawn` rolls**, confirming
  distance-gated bonus items (diamond/emerald; separately gold_block/
  ender_pearl) landing on top of base loot. Real sandbox-testing
  methodology gotcha found along the way, worth remembering for any
  future loot-table testing: `/loot spawn` at a position whose chunk
  was force-loaded the *same tick* silently produces nothing at all,
  even the base vanilla table — chunk generation isn't synchronous
  within `forceload`'s own tick, and this looked exactly like a broken
  mechanism until isolated by re-testing after a real 60-tick settle.
- **Built and deployed 2026-09-03 (commit 2faf4ef). Not yet confirmed
  by an actual playtest.**

**Loot bags: iron/cobblestone scarcity — requested 2026-09-03, built
and deployed 2026-09-04 (commit b244ef0).** Direct
playtest feedback ("not enough iron or cobblestone"). Checked the
real numbers in `bountybags:loot_tables/items/uncommon.json` (the tier
trash-floor mobs roll, by far the most frequent kill in this pack) —
the complaint is real, not just a bad-luck streak. Out of a 306 total
weight, `iron_ingot` sits at weight 10 (same as `lapis_lazuli`) for
only 1-2 per hit, and `cobblestone` at weight 30 for 8-16 — combined
with the tier's own 50% bag-drop chance, that's roughly a 9.5% chance
of *any* iron ingot per bag opened and ~27% for cobblestone. Rare tier
(`rare.json`) already has healthy iron (weight 25, 3-6 count, plus a
separate `iron_block` entry) — the gap is specifically at Uncommon,
which is what actually matters for a fresh base given how much more
often it's rolled. Proposed fix, same weight-and-count-bump technique
already used once before for gold in the old system's Phase 2 balance
pass: `cobblestone` weight 30→45 (count 8-16→12-24), `iron_ingot`
weight 10→22 (count 1-2→2-4) — roughly doubles the effective yield of
both (cobblestone ~27%→~35% per-bag chance, iron ~9.5%→~18.5%) without
touching any other entry's odds. **Shipped exactly as proposed.**
**Real bonus lesson, worth remembering for any future BountyBags loot
edit**: the mod generates a `config/bountybags/*.toml` from the source
JSON once and never re-reads the JSON afterward — the live instance's
already-generated `uncommon_bag.toml` needed a direct edit too, same
gotcha the legendary-tier totem_of_undying fix hit earlier. Editing the
source JSON alone is not enough on an existing save.

**Amulet/pedestal: wave mobs don't actually converge on the base —
requested 2026-09-03, built and deployed 2026-09-04 (commit 5293a3f).**
"When leaving the
pendant on the pedestal I expected the enemies to spawn near the base
and attack the pedestal. This didn't happen — I was out adventuring and
they spawned on me. I then ran to the base and they despawned, causing
me to win the wave." This directly contradicts this doc's own stated
design intent for the amulet (see "The amulet" above: mobs should path
to a fixed objective "regardless of player position"). Real gap found
by reading the actual code, not guessed:
- `wave_spawner.js`'s `randomPlayerRelativePosition()` always spawns
  mobs 40-60 blocks from the **player's current position**, with no
  check of `td_amuletOnPedestal` at all — so mobs spawn wherever the
  player happens to be standing, base or not.
- `mob_aggro.js`'s pedestal redirect (confirmed correct, no distance
  limit — "every wave mob everywhere always targets" the marker) does
  properly retarget mobs toward the pedestal once they exist. The
  spawn-location gap above is what actually breaks the experience: if
  the player is far from base, mobs spawn far from base too and have
  to make the whole trip on foot.
- `wave_status.js`'s "Hostiles remaining" counter and `wave_spawner.js`'s
  reuse gate both count mobs within **80 blocks of the player**, not
  the pedestal, regardless of `td_amuletOnPedestal`. If the player runs
  away from wherever the mobs spawned (e.g. back to base) faster than
  the mobs can keep pace, they fall outside that radius and the wave
  reads as "cleared" even though the mobs are still alive — this is the
  most likely explanation for "I ran to base and they despawned, and I
  won the wave": not a real despawn, but the counter losing track once
  the player pulled ahead. Real vanilla mob despawning (the summon NBT
  has no `PersistenceRequired:1b`) is a second, independently real
  possibility if the mobs ended up far enough from every player for
  long enough — can't be ruled out from static reading alone.
- **Open question — resolved, and the answer was "yes, a real second
  bug."** This pack had never forceloaded anything before, and that
  gap was confirmed to matter: `simulationDistance` is 12 chunks (192
  blocks) centered on the player (confirmed from `options.txt`), so
  fixing spawn position alone would not have been enough — mobs
  spawned correctly at the pedestal would have just frozen the moment
  the player wandered off, never reaching or attacking anything.
- **Shipped, both pieces**: spawn position and both mob-count checks
  now key off the pedestal marker's stored position
  (`td_amuletMarkerBaseX/Y/Z`) when `td_amuletOnPedestal` is true,
  exactly the proposed direction. On top of that, real `forceload
  add`/`remove` calls in `amulet_pedestal.js`, placed exactly where
  `td_amuletOnPedestal` toggles (the one file that reliably knows when
  that happens), sized to a 96-block radius — checked directly against
  vanilla's real 256-chunk forceload cap (169 chunks, comfortable
  margin) rather than assumed safe. `PersistenceRequired:1b` added to
  every wave-mob summon regardless, since a despawn-eligible mob far
  from any player would have quietly undone the whole fix no matter
  what it was targeting.
- **Verified against the exact reported scenario, not just the code
  in isolation**: a sandbox test placed the objective 500 blocks from a
  stand-in "far away player." 8/8 spawned mobs landed near the
  objective, zero near the fake player, and after a real 10-second wait
  (simulating the player staying away) all 8 were still alive and in
  place — confirms the position fix and the persistence/forceload fix
  actually work together, not just correct in isolation.

**Superseded 2026-09-05 — the whole mechanic was gated on the wrong
condition.** Direct playtest report: "the mobs are not aggroed to the
amulet when it is on the pedestal... are the mobs ever aggroed to the
pedestal? The intention is that regardless of whether the amulet is on
the pedestal or not, this is the focus point for the enemies... if im
not in the base to defend it then i lose the game." This is a real,
foundational correction, not a bug in the fix above — the fix worked
exactly as specced, but the spec itself had the core premise backwards.
The pedestal was never meant to be an optional, amulet-gated objective;
it's the permanent front line of the entire game, full stop — that's
the literal "tower defense" of "Tower Defense Modpack." Confirmed with
the user directly, not assumed:
- **The amulet's role narrows to two things, fully decoupled from
  whether mobs target the pedestal**: personal buffs while worn
  (Regen/Fire Res, unchanged), and unlocking border-crossing while
  placed (unchanged). It no longer gates targeting, spawn position,
  forceload, or wave-clear detection at all — those become
  unconditional.
- **Everything becomes permanently pedestal-relative, not just
  targeting**: spawn position, forceload, and wave-clear detection all
  key off the pedestal's fixed location always, matching "regardless of
  whether I'm there, this is the fight" — a wave can genuinely resolve
  (or overrun the base) while the player is off exploring, which is the
  real stake the shipped "pedestal destruction = game over" mechanic
  was always meant to sit inside, not a rare edge case bolted onto it.
- **Real architectural implication**: the current target marker (an
  armor stand `mob_aggro.js` points mobs at) only exists while the
  amulet is placed — `amulet_pedestal.js` summons it on placement,
  kills it on pickup. For targeting to be unconditional, a target has
  to exist unconditionally too — vanilla mobs can only `setTarget()` an
  entity, not a bare block position (already established, see "The
  amulet" above). **This needs a permanent marker, summoned once at
  world-build time in `playtest_starter_kit.js` alongside the pedestal
  itself**, tagged something no longer amulet-specific (e.g.
  `td_pedestal_target`, retiring `td_amulet_marker`), never killed.
  `mob_aggro.js` then unconditionally targets it — no fallback-to-player
  branch needed anymore.
- **Real cross-dependency with the in-flight Pedestal visual upgrade
  (Supplementaries) work below — build these together, not twice.**
  The build session already verified Supplementaries' real Container
  API for this exact purpose: `supplementaries:pedestal`'s block entity
  has a real, always-present Container (not tied to amulet state),
  readable/writable directly via `getDisplayedItem()`/
  `setDisplayedItem()`, no item-type filter. Once that block replaces
  the custom pedestal, the permanent target marker above doesn't need
  to render/hold anything itself anymore — Supplementaries' own block
  handles the floating-item visual whenever something's actually in its
  slot, and "is the amulet placed" becomes a simple
  `getDisplayedItem() == kubejs:amulet` check, fully decoupled from
  targeting. This **eliminates the custom bob-effect tick handler
  entirely** (the code the Math.PI bug lived in), not just relocates
  it. Building the permanent-marker fix against the *old* custom
  pedestal now, then rebuilding it again for Supplementaries right
  after, would be real wasted work — better to land both as one piece.
- **Forceload becomes permanent, not toggled** — moves from
  `amulet_pedestal.js`'s add/remove-on-toggle to a one-time
  `forceload add` in `playtest_starter_kit.js` at world creation,
  same 96-block/169-chunk sizing already verified safe under vanilla's
  256-chunk cap, never removed. **Real, deliberate resource-cost
  tradeoff, not an oversight**: this permanently reserves chunk-loading
  around the base for the whole game, not just while the amulet's
  placed — an accepted cost of "the base is always genuinely at stake,"
  matching the core premise directly.
- **Compound redesign folded in 2026-09-05, same dispatch, not a
  separate pass.** Direct follow-up once the "always the target"
  correction landed: "the pedestal area is lacking any oomph. I want
  this to be the heart of the base, the centre point to everything" —
  plus a separate complaint that the pre-placed Create rig (Rolling
  Mill/Mechanical Press/Depot) feels cramped inside the building.
  **Real sequencing reason this has to happen together, not after**:
  the pedestal's position feeds directly into the coordinate system
  this whole entry is building (targeting, spawn, forceload, game-over
  all key off it) — repositioning it *after* that lands would mean
  redoing the wiring, not just moving a block.
  - **Pedestal moves to the center of the courtyard** (the open space
    between the gate and the building), replacing the current side
    shrine nook — first thing visible on entering the gate, and mobs
    converging on it (now unconditional) visibly funnel through the
    same space the player stands in.
  - **Raised dais**, a few blocks up from the courtyard floor with a
    step on the gate-facing side — real physical presence without
    blocking sightlines across the yard.
  - **The 3 existing grave markers arranged in an arc around the base
    of the dais**, not clustered to one side as now — same markers,
    repositioned to actually frame what they're implicitly guarding.
  - **Braziers/torches at a few points around the dais** so it reads as
    a lit focal point specifically at night, when it actually matters.
  - **The Create rig relocates to the yard too, off to one side** — a
    "workshop corner," solving the cramped-interior complaint while
    staying clearly secondary to the pedestal as the courtyard's one
    real focal point.
  - **Real open item for the build session**: check the new central
    position against the existing gate-trap-avoidance and
    grave-marker-on-wall near-misses already caught once each in this
    compound's history — a recentered layout is exactly the kind of
    change that could reintroduce either if not rechecked against the
    real current coordinates, not assumed safe by similarity to the
    old layout.
- **Built, deployed, and committed (a9e6c1a) 2026-09-05.** Shipped
  exactly as specced: `mob_aggro.js` targets the pedestal marker
  always, no amulet check, no player fallback; `wave_spawner.js`/
  `wave_status.js`'s objective resolution always keys off the
  pedestal's fixed position; the amulet is now purely personal buffs +
  border-crossing unlock, decoupled from base defense entirely.
  `amulet_pedestal.js` is now a tick-poll against Supplementaries' real
  Container (`getDisplayedItem()`/`setDisplayedItem()`, confirmed
  callable directly from KubeJS) instead of a right-click hook —
  Supplementaries' own block handles pick-up/place natively.
  - **Real risk caught before shipping, not assumed safe**: deleting
    the old `kubejs:amulet_pedestal` block registration outright would
    have destroyed the actual live save's real placed pedestal on next
    load (Forge silently drops an unregistered custom block to air) —
    this pack's live instance is wave 4+ deep with that exact block
    still standing. Fixed properly: kept the old block + recipe
    registered (dead for new worlds, a real fallback for old ones);
    both the destruction-detection and the new amulet-poll accept
    *either* block id (checking only the new one would have read an
    untouched old pedestal as destroyed the moment this deployed — a
    real false game-over); restored a scoped legacy right-click handler
    for the old block only, since it never had a Container the new poll
    can read.
  - **Self-healing marker, not a manual fix this time**: `mob_aggro.js`
    re-summons the permanent target marker (and forceload) on any login
    where the pedestal coordinate exists but no tagged entity does —
    fixes the live save's missing marker automatically, unlike the
    earlier rig-placement bug which needed the user to run commands
    themselves.
  - **Verified in 4 sandbox passes**, the last two specifically against
    a real copy of the actual live save — confirmed its pedestal really
    is still the old block, and that the self-heal's exact summon
    command executes clean at its real coordinates. Zero KubeJS errors
    across all passes.
  - **Real scope limit, flagged back rather than decided
    unilaterally, then resolved directly with the user**: the courtyard
    *visual* redesign (dais/step/braziers/grave arc/outdoor workshop)
    only applies to **new** worlds — the build session deliberately did
    not retrofit the existing live save's actual courtyard layout, since
    that would mean moving the user's real, already-explored base
    around. **User's call: start a fresh world** for the full redesign
    rather than keep playing the old save or ask for a manual retrofit.

**Base expansion** — *live*. The worldborder grows on **every** wave
clear, by an escalating amount, retuned twice since its original ship:
- **Original** (built 2026-08-31, numbers pre-confirmed by the user):
  `growth = 20 + 5 * floor((waveNumber - 1) / 2)` —
  20/20/25/25/30/30/35/35, border 50→270 by wave 8.
- **Retune 1** (2026-09-01 Phase 2 balance batch, ~43% of the original
  rate): `growth = 10 + 3 * floor((waveNumber - 1) / 2)` —
  10/10/13/13/16/16/19/19, border 50→166 by wave 8.
- **Retune 2 — live now, shipped 2026-09-02.** Direct playtest
  feedback ("the world border is expanding too quickly") given *after*
  retune 1 was already live — a real complaint against the 166-ending
  curve, not the original 270 one. (A first draft of this retune's spec
  mistakenly diffed against the stale 270 formula, caught by the build
  session before implementation since a near-identical replacement
  would've been a near no-op.) Final formula: `growth = 5 + 5 *
  floor((waveNumber - 1) / 3)` — **5/5/5/10/10/10/15/15**, border
  50→**125** by wave 8. Waves 1-3 now add only 15 total (was 65 under
  the original curve, 33 under retune 1) — a genuinely flat early game
  before opening up starting wave 4. Paired with the structure-spacing
  retune below so exploration reads as a mid-game thing, not reachable
  from wave 1. Verified via a fresh sandbox world, deployed and
  committed (6d8c50e).
Same constant-plus-step-function style as `wave_spawner.js`'s
`staggerGapForWave` throughout, not a new pattern each retune. Centered
on the fixed spawn point; mob spawn positions are clamped to stay
within the current border. This is the "custom world" idea's
first-step scope — no separate custom dimension, no hand-built
structure, just the border mechanic itself. Implementation:
`base_expansion.js`.

**Starter gear as narrative** — *live*. The starting netherite sword +
iron armor are framed as looted from the base's previous, unfortunate
occupant, tagged with `td_starter_gear` NBT so removal logic can target
exactly these items and not anything crafted/looted since. They
disappear permanently at a **fixed wave 5** — deliberately decoupled
from the campaign's total length (`FINAL_WAVE`, currently 8), since
these are two different concepts that only coincided when the campaign
itself happened to be 5 waves long. On removal: an on-screen title
("IT'S UP TO YOU NOW") plus chat flavor text about the previous
occupant. Implementation: `wave_status.js` (`GEAR_REMOVAL_WAVE`
constant), gear tagged in `playtest_starter_kit.js`.

**Countdown timer** — *live*. After a wave clears, a countdown to the
next wave displays on the action bar and auto-starts the next wave when
it hits zero; using the horn manually at any point cancels it and
starts immediately. Gives urgency without removing player agency.
Implementation: display/auto-trigger in `wave_spawner.js`, started in
`wave_status.js`.
**Escalating, not flat, 2026-09-04 (real playtest feedback).** Used to
be a flat 3 minutes every wave; now `countdownTicksForWave()` in
`wave_status.js` ramps from 90s at wave 1 by +15s per wave cleared, up
to the original 3-minute ceiling reached at wave 7 (one before the
endless-phase handoff) - short and tense early, more breathing room
later. A real title/chat announcement ("THE NIGHTS GROW LONGER") fires
once at wave 5, alongside the existing gear-removal beat at the same
wave (a real coincidence, not a dependency between the two) - so the
pacing shift is a felt, announced moment, not a silently longer number.
Verified: the curve's real output checked directly in a sandbox for
waves 1-9 (1800, 2100, 2400, 2700, 3000, 3300, 3600, 3600, 3600 ticks).

**Mob death effects — sent to build 2026-09-01.** Direct request: real
death animations (limbs scatter, heads roll) instead of the vanilla
death animation, matching a look the user had seen elsewhere. **Mob
Dismemberment [UNOFFICIAL MODERN PORT]** (CurseForge, author
ThatSoulyGuy, `MobDismemberment-1.20.1-8.0.1.jar`) — verified directly,
not assumed from the name: iChun's original "Mob Dismemberment" (the
well-known 13.9M-download classic) has **no Forge 1.20.1 build at
all**, abandoned since 2017 at 1.12.2 — this port is the real,
current, properly-licensed (GNU LGPLv3, explicit credit to iChun)
option for this pack, same naming-collision pattern this project has
hit repeatedly (Pure Suffering, KubeJS-Curios, Abandoned Structures).
No dependencies. **Client-side only, no server component** — zero
impact on the server-tick performance stack (Radium, wave-spawning)
this pack has been careful about throughout. Configurable blood
effects and max gib count via its own generated config. **Physics
Mod** (16M downloads, real Forge 1.20.1) was checked as an alternative
and ruled out — a full physics engine touching blocks/items/terrain,
far beyond the specific death-effect ask, not the right scope.

---

## Base & structures

**Starting base ("The Watchpost") — redesigned 2026-09-01: "the last
bastion, in disrepair."** *Live* — direct request, following the
structure-mod aesthetic swap: the base should read as a real defensive
position that held for a long time and shows it, not a clean fortress or
an abandoned ruin. Two layers of construction on top of each other —
the *original* structure, and the desperate patchwork of whoever kept
it standing — is the core visual idea everything below is built from.
Fixed spawn point (`/setworldspawn` + `gamerule spawnRadius 0`)
unchanged; the compound itself is still built via `/fill`/`/setblock`
on first login, now with real design detail instead of a plain box:

- **Walls — mixed construction, not uniform.** A cracked/mossy stone
  base (the original build) with irregular *patches* of SecurityCraft
  reinforced block bolted on wherever it mattered most — heaviest
  concentration right around the gate, thinning toward the back
  corners. One section reads as the weakest point: lower, cruder
  material, propped with debris — a wall that's clearly been breached
  and rebuilt before, not a pristine perimeter. Supersedes the previous
  flat "reinforced_cobblestone primary, mossy/cracked scattered for a
  weathered look" description — same materials, deliberately uneven
  distribution now instead of even scattering.
- **The gate as the visible fault line** — heaviest reinforcement,
  most damage, most repair, since it's the chokepoint everything funnels
  through. Improvised defenses dressed around it: barrels/crates as
  cover (Zcraft Decoration), a barbed-wire or Spikes line just outside.
  **Resolved 2026-09-04**: real Barbed Wire (Create: Crafts &
  Additions) replaces the placeholder Trapcraft Spikes here too — see
  "Barbed Wire replaces Spikes" under "Tier 1 defenses."
- **Grave markers, not just clutter** — a handful of makeshift graves
  (crossed fence posts, or a sign on a dirt mound) near the pedestal
  (see below). Directly reinforces the existing narrative (gear-removal
  flavor text, "whoever carried this before you held the line for N
  waves") rather than being decoration for its own sake — turns the
  amulet shrine into a memorial, not just a crafting station.
- **The pedestal is now pre-built, not crafted** — see "The amulet"
  section for the full reasoning and mechanic-level detail. Placed in a
  small shrine nook near the graves, as part of the *original*
  structure layer (it mattered enough to be built properly from the
  start, unlike the patchwork walls). Empty at world start — "something
  was supposed to be here" is the intended hook.
- **Interior — lived-in, then left.** The single-room shack (still not
  built) becomes a command post rather than a house: bedroll, stacked
  supply crates, worn furniture and discarded belongings (Doomsday
  Decoration) doing the storytelling — organized, not just messy.
- **Watchtower carries battle-wear too** — already open on all sides
  (cobblestone pillar, external ladder, 5x5 platform with parapet),
  add scorch/damage detail and props (crates, barrels) at its base so
  it reads as a manned post, not just a lookout pillar.
- A well styled to match vanilla's own desert well remains unbuilt
  design intent, not part of this pass specifically.

**Decoration mods needed to actually build the above** — researched and
verified 2026-09-01, both real, current, and dependency-free:
- **Doomsday Decoration** (CurseForge, author Huzai,
  `doomsday_decoration-1.1.3-forge-1.20.1.jar`, 793.9K downloads) —
  "pure decorative blocks": worn furniture, discarded belongings, human
  remains. **No dependencies.**
- **Zcraft Decoration** (CurseForge, author NothingTs, project 1407825
  — its own description also calls it "ZCraft: Zone Decor," same
  project, not a separate mod) — military crates, barrels, tires,
  rusted industrial clutter, purpose-built for wasteland/STALKER-style
  builds. **No dependencies.** Actively maintained past 1.20.1 (up to
  1.21.1+), not an abandoned single-version mod.
- Both are pure decoration — placeable blocks only, no entities, no
  world-gen, no structure-placement logic — a meaningfully lower risk
  category than every structure mod checked in this project so far (no
  jigsaw/processor risk, no floor-depth interaction, no biome
  dependency).

**What's actually needed to build all of this**: install both
decoration mods, then pick specific block IDs from each mod's real
registry (not guessed — same discipline as confirming
`trapcraft:bear_trap` from its own jar before writing that quest task)
and rework `playtest_starter_kit.js`'s existing `/fill`/`/setblock`
Watchpost build to the uneven-wall/gate/graves/pedestal/interior/
watchtower detail above. This is a visual/narrative pass, not a new
mechanic — expect at least one round of "seen in-game, adjust
placement/density" iteration, same as the worldborder texture and the
amulet pedestal's own shrine visual pass both needed. The wall-material
distribution (which sections get reinforced vs. stay cracked stone) and
exact grave-marker/prop placement are implementation-level picks, not
pinned down to specific coordinates here.

**Built 2026-08-31.** Reinforcement chance now falls off with distance
from the gate (0.85 at the door down to a floor of 0.08 by the far
corners), a genuinely weaker 3-block stretch of the west wall (2 blocks
tall, plain cobblestone, cobweb + gravel debris) reads as
breached-and-rebuilt, the gate got barrel/crate cover plus a decorative
Trapcraft Spikes line and Zcraft barrier props, the pedestal is
pre-placed in a shrine nook with 3 oak_fence-on-coarse_dirt grave
markers nearby, the watchtower got scorch/cracked-brick detail plus
crates/a burning barrel/a generator at its base, and the interior shack
(previously unbuilt) is now a real 5x5 room with a mattress, table,
shelf and crates. **Two real bugs caught in a live sandbox test, both
fixed before shipping**: `zcraft_decorations:hesco_sandwall` and
`barbed_wire_1` both have real blockstate JSON *and* real lang entries,
but turned out to be orphaned assets with no block actually registered
behind them — `/setblock` rejected both as "Unknown block type" even
though the file-existence check that's been this session's usual bar
said they were fine. Swapped for `sfz_shuiniqiang` (Concrete Wall) and
`sfz_lantiepiweilan` (Broken Iron Fence), both confirmed placeable the
same way. Also caught (before ever touching the sandbox): 3 of the
interior shack's 5 furniture pieces were originally positioned exactly
on the wall line instead of the interior, which would have carved holes
in the walls — fixed by widening the shack to a proper 5x5 (3x3 usable
interior) and rechecking every furniture coordinate against it.
**Not yet confirmed by a real player** — the sandbox verification here
covers command/block-ID validity (every new block placement individually
confirmed via RCON) and script/quest-parse correctness (clean reload, 0
KubeJS errors), not actual in-game visual placement; a mineflayer bot
couldn't complete this particular mod set's FML handshake to get a real
spawn-and-look test, a tooling gap not a pack problem. Needs an actual
playtest to confirm layout/spacing reads as intended.

**Real player verdict, 2026-09-01: "terrible."** The detail pass above
was genuinely built and sandbox-verified, but direct feedback after an
actual playtest is that the base and watchtower design don't hold up —
confirms the honest gap flagged above (block-ID validity isn't the same
as looking good) wasn't just theoretical.

**Redesign, built and deployed 2026-09-01 — stop hand-typing the shell,
use a real structure instead.** Direct call: the fundamental limitation
isn't insufficient detail, it's the technique — hand-authored `/fill`/
`/setblock` commands produce boxy, rectangular architecture no matter
how much decoration gets layered on. This pack now has three real
structure mods installed with genuinely professionally-modeled
buildings (Apocalypse structures, Abandoned Urban, The Lost City) — use
one of their real `.nbt` structures as the base's shell via
`/place template`, the same cross-cutting "structure placement at a
triggered location" pattern already used elsewhere in this pack, just
pointed at a mod's structure instead of hand-typed commands for the
first time.

- **Final pick: Apocalypse structures' Abandoned Brick House**
  (`postapocalypse_structures:abandoned_brick_house`) — **12 (X) × 13
  (Y) × 11 (Z)**, barely bigger than the original hand-built 11×11
  shell. First shipped with the **Red Mansion** (26×19×28), but direct
  follow-up feedback was "this mansion is too big, can we get a smaller
  building" — swapped same day. All 4 of the mod's buildings were
  checked by decompiling their real NBTs before picking, not guessed:
  Red Mansion 26×19×28, Yellow House 26×21×18, Red House 22×15×15,
  Abandoned Brick House 12×13×11 — the clear smallest, and the pick.
- **Real technique proven on the mansion, reused unchanged for the
  swap** — confirmed working across two different structures now, not
  a one-off: structure IDs/dimensions/DataVersion pulled by direct jar
  inspection, not guessed; each structure's own chest/barrel
  `LootTable` refs already point at `postapocalypse_structures:
  chests/{trash,cobwebs,food}` — the same tables already buffed with a
  real treasure pool earlier this session (see "Structure mod picks"),
  so every candidate gets free upgraded loot with zero extra work.
- **`/place template` real gotcha, applies to every structure from this
  mod, not just the mansion**: the mod's own `block_ignore` structure
  processor only applies during natural jigsaw generation — raw
  `/place template` bypasses it entirely, so each structure's own
  `minecraft:wet_sponge` foundation-marker layer needs an explicit
  replace-mode cleanup fill immediately after placement (409 blocks for
  the mansion, 78 for Abandoned Brick House — sandbox-confirmed exact
  match to each structure's own NBT count both times).
- **Compound retuned to the smaller footprint**: margins roughly
  halved from the mansion-sized version, watchtower back down to
  `wallY0+16` (was `+22` for the mansion, `+10` in the original
  hand-built shell), **worldborder reverted 90→50** — since that
  90-diameter start was only ever a side effect of fitting the much
  bigger mansion, reverting it also restores `base_expansion.js`'s
  originally-tuned wave-8 ending border of 166 (not the mansion-driven
  ~206) as a bonus, not a separate change.
- **One more real bug caught before the sandbox, not after**: the
  tighter courtyard put a grave marker exactly on the smaller
  building's own front wall, which `/place template` would have
  silently overwritten — moved the shrine one row closer to the gate to
  clear it, same "verify placement, don't just verify block IDs"
  discipline as the mansion's gate-trap catch.
- **Verified the same way both times**: a full end-to-end sandbox
  replay of the real login command sequence (not just individual
  pieces checked in isolation) — gate-trap risk, spawn safety, grave/
  building non-overlap, tower roof-clearance, and sponge cleanup all
  spot-checked via RCON, no exceptions in either run. Deployed to the
  live instance and committed both times. **Same caveat as every other
  spawn-time change this pack has made**: only takes effect on a
  brand-new world, not retroactively on an existing save.
- **How this integrates with what's already built, not a full
  do-over**: the SecurityCraft-reinforced perimeter wall (uneven
  material distribution, weak-point section, now-reinforced gate),
  watchtower, and pedestal shrine/grave markers all stay as *separate*
  structures around the new building shell — only the core "single-room
  shack" building itself gets replaced by the real structure, not the
  whole compound design.

**Watchtower — removed 2026-09-03 (commit f289af7).** Direct
feedback: "get rid of that silly tower... it serves no purpose now that
we have a better starting structure." Real justification for the
removal, not just taste: the tower's own original design intent
(2026-08-20, "phase 1 of expanding the starter base," a 4-sided lookout
specifically because "mobs spawn beyond all 4 border edges") has been
overtaken by two later changes it never got revisited against — wave
mobs now spawn a fixed 40-60 blocks from the *player* rather than
approaching from the border (2026-09-01 fix), and the worldborder
itself is far smaller now (50-125 across the campaign, not the
270-block target the tower's vantage role assumed). On top of that, the
Abandoned Brick House building it now stands beside is itself 13 blocks
tall — the separate tower (`platformY = wallY0+16`) barely clears its
roofline by 3 blocks for a vantage purpose that no longer exists. A
detached structure standing outside the compound's own wall (confirmed
in code: `towerZ1 = z0 - 3`, 3 blocks north of the back wall) with no
gameplay hook of its own.
- **Confirmed self-contained before flagging as a clean removal**: read
  the tower's own code block in `playtest_starter_kit.js` (lines
  ~304-378) fully — every coordinate it uses (`towerX0/X1/Z0/Z1`,
  `platformY`) is locally derived and never referenced again by any
  later section (shrine/graves, interior, etc. all use their own
  building-relative coordinates). Grepped the whole pack for other
  "tower"/"watchtower" references — none outside this one block and
  its own doc mentions. No FTB Quests reference it either. Safe to
  delete outright, not just hide/relocate.
- **One narrative detail worth knowing, not a reason to keep it**: the
  tower currently stands right behind the compound's one deliberately
  breached wall section (`WEAK_WALL_Z0 = z0`, the same north edge) —
  a nice "should've been watching that exact spot" coincidence, but not
  load-bearing; the breach reads fine on its own without the tower
  nearby.
- **Clean deletion, exactly as pre-verified** — nothing else in the
  pack touched. Not yet confirmed by an actual playtest.

**World type** — *live, user-confirmed working in-game (2026-09-01)*.
`kubejs/data/minecraft/dimension/overworld.json` uses `type:
minecraft:noise` with a custom `noise_settings` file and a `multi_noise`
biome_source over a curated 7-biome set (desert, badlands, savanna,
savanna_plateau, plains, sunflower_plains, meadow). Genuinely,
structurally flat, not just tuned to look flat: `final_density` is a
`y_clamped_gradient` — a function of **Y only**, zero dependency on X/Z
anywhere in the noise router — so every column evaluates to the exact
same surface height by construction. Floor depth (room below the
walkable surface, before hitting `min_y`) is 65 blocks.

**How this got here, briefly** (full blow-by-blow, including the real
crash sequences, lives in `docs/MODS.md`): started as vanilla `flat`
with a swapped biome value, which turned out not to work at all —
`flat`'s generator only ever supports one hardcoded biome, full stop.
Rebuilt on `noise` with a `fixed` single-desert biome_source instead
(the `noise_settings` schema was hand-verified against vanilla's actual
shipped `overworld.json`, not summarized docs, which disagreed with
each other on real field names). That held until a real playtest found
vanilla desert temples generating unlootable — the world's floor was
only ~4 blocks above `min_y`, nowhere near enough room for a loot
chamber, a problem that turns out to affect any biome, not just desert.
That, plus "the desert theme doesn't need to be a hard constraint,"
drove the move to the current `multi_noise` + 65-block-floor setup,
picked from real structure-mod tag frequency data rather than guessed.
World creation itself then crashed four separate times during that
transition (two Radium mixin issues, then a genuine vanilla/Forge
jigsaw-structure race condition traced to Treasure2's own
tightest-spaced structure) before the user confirmed a clean, working
world. See `docs/IDEAS.md`'s working principles for the reusable
lessons that debugging surfaced (sandbox tests need the full mod stack,
crash reports name the real culprit, live config fixes need syncing
back to the tracked repo).

Both the 7-biome set and the 65-block floor depth were originally sized
against When Dungeons Arise's own structure-tag frequency and `.nbt`
piece heights; when WDA was later removed for aesthetic reasons (see
"Structure mod picks" below), both numbers were re-checked against the
mods actually still installed and left unchanged — still good coverage,
not stale leftovers from a removed mod.

**Seed-independent world-gen — raised 2026-09-06, real root-cause found,
specced, ready to build.** Direct feedback after a long run of
world-gen playtest fixes: "its been super hard to get a clean world gen
with all the elements that make the game functional... How can we nail
this down such that every new world doesn't fall short." **Real root
cause, traced through the actual code, not a vague "world-gen is
finicky" explanation**: every spawn-point fix this pack has ever shipped
— the original badlands-avoidance move, the plains-to-savanna move, all
of it — was found by running a real biome census **against one specific
seed** (the live save's own seed, read from its `level.dat`) and then
**hardcoding the resulting coordinate as a literal constant** in
`playtest_starter_kit.js` (currently `spreadplayers 1171 -499 1 8 false
@a`). This pack never enforces a fixed world seed — a genuinely new
world (any other player, or this same player starting fresh) gets a
random seed, and a hardcoded coordinate tuned for one seed's noise
pattern has no reason to land in the same biome, or on flat ground, on
a different one. Every "fix" so far has correctly solved the *reported
instance*, never the *underlying seed-dependence* — which is exactly
why the same shape of bug (wrong biome, clipped base) keeps recurring
under a different disguise.

**Real fix — three real pieces, replacing hardcoded coordinates with
logic that runs fresh for whatever seed the world actually has**:
1. **A real wasteland biome tag** (new file,
   `kubejs/data/kubejs/tags/worldgen/biome/wasteland.json` or similar —
   exact path/namespace convention to match whatever this pack already
   uses for its other custom tags) listing exactly the 4
   wasteland-appropriate biomes from the curated set: desert, badlands,
   savanna, savanna_plateau. Deliberately custom, not a vanilla tag like
   `#minecraft:is_badlands` — vanilla's tags may pull in biome variants
   (eroded/wooded badlands, etc.) this pack's `multi_noise` set doesn't
   actually register, which would make the search look for something
   that can never be found.
2. **Runtime biome search, not a manual dev-time lookup.** Replace the
   hardcoded `spreadplayers` target with a real programmatic search
   (from a fixed, seed-independent anchor — world origin `(0,0)` is the
   natural choice) for the nearest biome matching the new tag, run once
   on first login (already naturally gated by the existing
   `td_playtestKitGiven` flag, so this doesn't re-run on every login,
   just world creation). **Real implementation note, not pinned down
   here**: `runCommandSilent('locate biome ...')` suppresses the
   command's own feedback, which is where vanilla's `/locate` normally
   reports its result — parsing chat/feedback text back out is fragile.
   The more robust path is very likely a direct call to the same real
   vanilla Java method `/locate biome` itself calls internally (a
   `Level`/`ServerLevel` biome-search method, exact signature not
   guessed here) — this pack has already proven this exact kind of
   direct-Java-method approach works from KubeJS (`mob_aggro.js`'s
   target-selector reflection). Verify the real method against the
   actual running classes before committing to an approach, same
   standing lesson as always. Once a real point is found, keep using
   the already-proven `spreadplayers` heightmap-snap exactly as now —
   that part is solid, seed-agnostic, and shouldn't change.
3. **Real terrain-flatness verification for the base build, not an
   assumption.** `playtest_starter_kit.js` currently reads the ground
   height at one single point (right after `spreadplayers`) and reuses
   that one Y (`wallY0`/`floorY`) across the *entire* ~20×23 building
   footprint — real risk of clipping on any seed where the terrain
   isn't dead flat across that whole area. **Real, important tension to
   resolve, not just assumed away**: this doc's own "World type" section
   above claims `final_density` is a pure Y-only gradient, "every column
   evaluates to the exact same surface height by construction" — but
   real empirical testing this session (the recent spawn-relocation
   verification, and earlier wave-mob-spawn height-correction work) has
   repeatedly found genuine height variance (~2.5 to ~7 blocks) in
   practice. Trust the empirical finding over the theoretical claim —
   add a real defensive check: sample real heightmap values across the
   planned footprint (corners + midpoints, not just the one spawn point)
   before building, and if variance exceeds a small tolerance, level the
   footprint (clear bumps, fill dips) to one clean Y before placing
   walls — same spirit as the `/place template` wet-sponge clearing
   technique already proven elsewhere in this pack, adapted for the
   `/fill`-based build here.

**Deliberately lower priority, not blocking this spec**: structure
distancing from spawn is already in much better shape than the other
two pieces — spacing/separation are statistical rules baked into
generation itself (this pack's own retuned `structure_set` files, the
doubled village spacing), so they already apply correctly to any seed,
not just the one they were verified against. A real "verify nothing
landed too close, reroll the spawn search if so" check would add
defense-in-depth but isn't required for this fix to be a real
improvement — flag as a possible follow-up, not part of this dispatch.

**Built and verified 2026-09-06, all three pieces.**
- New `data/kubejs/tags/worldgen/biome/wasteland.json` (desert,
  badlands, savanna, savanna_plateau). Real gotcha hit and worked
  around: `Holder<Biome>#is(String)` in this exact KubeJS build does
  NOT do real tag-membership checks - tested directly, `.is
  ('#kubejs:wasteland')` throws (tries to parse the `#` as a literal
  namespace character) and `.is('kubejs:wasteland')` (no hash) silently
  returns `false` even for a real member biome. The tag file ships as
  the real, documented, reusable datapack asset; the actual runtime
  search checks a plain parallel array (`WASTELAND_BIOMES` in
  `playtest_starter_kit.js`) instead, kept in sync by comment. Also
  confirmed directly: worldgen-registry datapack files like this one
  are NOT picked up by `/reload` - only a real, full server/game
  restart loads them, unlike recipes/loot tables/most tags.
- `findWastelandSpawn(level, startX, startZ)` replaces the hardcoded
  `spreadplayers 1171 -499 ...` - a real ring-by-ring outward search
  from world origin `(0,0)` using `level.getBiome([x,64,z]).key()
  .location()`, checked against `WASTELAND_BIOMES`. Verified live and
  fast: confirmed `getBiome` resolves correctly and near-instantly
  (~0.3ms/call) even thousands of blocks from anything ever
  loaded/visited (it's a pure `multi_noise` sampling-function lookup,
  not real chunk generation) - a 441-point grid took 141ms total. Ran
  the real search on the exact seed this bug was just reported on
  (`-278431851093979538`, where the old hardcoded point was STILL
  plains): found real savanna at `(864,864)` in 145ms, confirmed by a
  second independent `getBiome` check at that exact result. This is the
  real, structural fix - not another one-off coordinate patch that
  would fail again on the next fresh world.
- Terrain-flatness check: samples the real `MOTION_BLOCKING` height
  (same heightmap the grass-plant fix above already uses) at the
  footprint's 4 corners + 4 edge midpoints + center, and when any
  sample deviates from the spawn point's own height by more than 1
  block, clears a generous band above (bumps) and fills solid below
  (dips) across the whole footprint before the existing floor fill lays
  the real walkable surface. Not yet exercised against a genuinely
  uneven real footprint (the sandbox verification point happened to be
  reasonably flat) - the sampling/leveling logic itself is straight
  code, verified by reading, but the "did it actually trigger and fix a
  real bump" case is unconfirmed in-game, same standing blind spot as
  every other player-triggered flow in this pack.
- **Real deployment note**: this needs BOTH a full game restart (not
  just relaunching into the same client session, and not just a
  `/reload` - the new worldgen tag specifically needs a real restart to
  load, confirmed directly) AND a genuinely fresh world (the whole
  build is still gated behind the one-time `td_playtestKitGiven` login
  flag) before it does anything - starting a new world in an
  already-running client session that was open before this shipped
  would still use stale registry data.

**"Reads as entirely desert" investigation, 2026-08-31 — real finding,
not a biome_source bug.** Diagnosed by copying the actual live save into
a sandbox (not a fresh test world — this matters, see below) and
querying real biome data with `/locate biome` and a 320x320-block RCON
grid census centered on the live save's actual spawn point (-1, 4). The
live save's `level.dat` confirms its baked-in overworld generator
already matches the current tracked `overworld.json` exactly (same 7
biomes, same `multi_noise` type, same `kubejs:flat_desert` settings
ref) — dimension generators are NOT frozen at world-creation time the
way an earlier hypothesis here assumed; whatever's in the datapack at
each boot is what's live. The real finding: **badlands, not desert,
dominates the area around the fixed spawn point** — 72.8% of the
320x320 grid sample is badlands, 25.9% savanna, 0% desert and 0% of the
other 4 biomes. Badlands (dry, orange/tan terracotta canyon terrain)
reads visually close enough to "desert" that the report is accurate in
spirit even though it names the wrong biome. This is real, deterministic
Minecraft biome-blob generation for this specific seed + this fixed
spawn point (biomes generate in large contiguous regions by design, not
fine-grained noise) — not a sign the parameter-point math is broken
toward desert generally (a separate uniform-grid statistical check
across the full parameter space put desert at only ~6.6% of total area,
the *smallest* of the 7, with `sunflower_plains` mathematically
unreachable — its point is a strict weirdness-penalized superset of
plains' point, so plains always wins the tie). The badlands dominance
near spawn is just this fixed point's bad luck landing deep inside one
biome's blob, and would need a real fix (retuning badlands' own
parameter point, or picking spawn coordinates known to avoid it) to
change — not something more exploration alone fixes, since the sampled
area is already fully saturated with badlands/savanna with zero variety
at any sampled point.

**Decided and built 2026-09-01: moved the fixed spawn point, didn't
retune badlands.** Lower-risk than reopening the hand-tuned
`multi_noise` parameter math again — leaves the underlying pack-wide
badlands-vs-desert area skew as-is (accepted, not a problem worth
another world-gen round on its own), just relocates the base to a
coordinate with real biome variety nearby. Picked `(780, -150)` using
the same RCON census technique used for diagnosis, not guessed: from
every point checked in a 200-block neighborhood around it, badlands
stays 300-500+ blocks away and desert 650+ away (vs. 0 blocks at the
old spawn), with plains and savanna genuinely close (0 and 45 blocks).
The full 320x320 setblock-marker grid technique hit real RCON
reliability problems at this scale (occasional timeouts, and a
still-unexplained "Unknown or incomplete command" failure mode once
under heavier load — not chased further) — fell back to multiple
independent `/locate biome` checks from several offset points, which
is less exhaustive but had zero connection failures and gave a
consistent, confident picture. Implementation: `playtest_starter_kit.js`
has exactly one hardcoded spawn coordinate (the `/spreadplayers`
target) — confirmed by reading the rest of the function before
changing it, not assumed — with `setworldspawn`, `worldborder center`,
and the entire Watchpost build (walls/shrine/graves/shack/tower) all
deriving from the x/y/z read back afterward, so moving that one line
relocates everything cleanly. **`sunflower_plains`'s unreachable
parameter point is staying as-is** — decided not worth another round of
churn for one biome's cosmetic absence.

**Related bug found and fixed in the same pass**: `wave_spawner.js`'s
mob spawn positioning used to be worldborder-relative (spawn just
outside whatever the border's current edge was), which meant spawn
distance grew unboundedly with the border — base_expansion.js's own
escalating growth curve reaches 270 blocks by wave 8, and the amulet's
`BORDER_EXPAND_DELTA` (10,000,000) sends it far beyond that whenever
the amulet's on the pedestal. Real playtest symptom this caused: "the
horn says a horde spawned but nothing shows up" (mobs spawning millions
of blocks away, never arriving). Rewrote to a fixed 40-60 block
player-relative distance instead — matching the shape (if not the
exact numbers) of the endless-phase system's own player-relative
Undead Nights spawn band, so both systems are now consistent instead of
one being border-relative and one player-relative. Not yet confirmed
by an actual wave playtest.

**Biomes O' Plenty + TerraBlender — reasoned incompatible, not
installed.** TerraBlender's documented architecture assigns each
participating mod its own "region" *within TerraBlender's own injected
biome source* — it doesn't compose with an arbitrary datapack-defined
`multi_noise` biome_source the way this pack's `overworld.json` is
written. Since both TerraBlender and this pack's own datapack target
the same `minecraft:overworld` dimension's biome_source, installing BOP
would either have TerraBlender's injection silently replace this pack's
whole curated 7-biome list (undoing the work above unpredictably), or
this pack's own datapack keep winning and BOP's biomes never get
selected at all (the mod installs, contributes nothing to variety). This
is a reasoned conclusion from TerraBlender's stated design, not a
decompiled/bytecode-verified one (its wiki doesn't document the exact
mixin/injection mechanism) — flagged at that confidence level rather
than asserted as fact. Recommendation: don't install BOP for this
purpose; if more variety is wanted, retune this pack's own multi_noise
parameter points instead (same approach that already produced this
7-biome set).

**Structure mod picks, 2026-08-31 — added for variety, not desert-
specific. User-confirmed 2026-09-01: generation now reads as the
intended abandoned aesthetic.** Researched with the same rigor as the
earlier mod evaluations (source-verified where public, flagged honestly
where not), after ruling out Structory: Towers as *not* redundant once
considered alongside these three (kept — see below) and re-evaluating
Abandoned Structures now that "excludes desert" is no longer
disqualifying:
- **When Dungeons Arise and Structory: Towers — both installed then
  REMOVED same day (2026-08-31)** after real playtest feedback: "the
  structures just don't look right for the theme... less fantasy and
  nothing floating." Both mods' content (WDA: floating castles, airships,
  mage towers, shogun mansions; Structory: generic fantasy towers) is
  fundamentally high-fantasy — a real aesthetic mismatch against this
  pack's Fallout-wasteland identity, not a bug in either mod. Not wasted
  effort: the crash-debugging sequence above (Radium mixin, live-config
  sync gap, the vanilla jigsaw race condition, the crash-report-Details
  lesson) are all real, reusable lessons regardless of whether either mod
  stayed installed. Full version/spacing detail for both lives in
  `docs/MODS.md` if ever needed again.
- **Apocalypse structures: Abandoned city buildings — installed
  2026-08-31** (CurseForge, author That1LilGuy,
  `postapocalypse_structures-1.0.2-forge-1.20.1.jar`, 881K downloads).
  4 aboveground buildings (Yellow House, Red House, Abandoned Brick
  Building, Red Mansion) — confirmed grounded, no floating, no fantasy,
  real vanilla-material loot (cobwebs, rotten flesh, potatoes, iron —
  matches this pack's own vanilla-only loot philosophy). **No mandatory
  dependencies** — confirmed directly, Berezka's addons are explicitly
  optional here, unlike the mod dropped below.
- **Abandoned Urban — installed 2026-08-31** (CurseForge,
  `abandoned_urban-1.1.0-forge-1.20.1.jar`, author KevinMods — a
  genuinely different mod/author from the Modrinth listing the same
  search surfaced first, "Abandoned Urban remaster" by berezka; verified
  the real CurseForge page directly rather than trust the first search
  hit, same lesson as the Quest_play mixup earlier). 7 structures,
  author's own description: "modern style" that "fit well with
  post-apocalyptic mod packs." **Zero dependencies**, confirmed both on
  its CurseForge relations page and directly in its `mods.toml`. **Real
  geometry check, not trusted from marketing copy**: all 7 use plain
  `minecraft:jigsaw` (no custom processor class — same low-risk category
  as Treasure2/WDA, not the custom-type risk that blocked the earlier
  Abandoned Structures pick) with `terrain_adaptation: beard_thin` or
  `beard_box` and `step: surface_structures` — every one grounded via
  heightmap projection, none dig underground at all. Spot-checked the
  largest piece's real `.nbt` size tag directly (`observatory.nbt`,
  37×30×47) — a real building, not a floating structure.
- **"Missing chest loot" investigated 2026-09-04, no fix needed — the
  diagnosis this was queued from was stale.** Re-decompiled all 34 real
  `.nbt` files directly against the exact currently-installed jar
  (confirmed via `pack/mods/abandoned-urban.pw.toml`'s file-id 5297465
  — same build, not a version drift). Real, current result: **15
  building pieces already carry a genuine `LootTable` NBT tag on a real
  chest**, referencing valid vanilla tables (`minecraft:chests/
  woodland_mansion`, `.../village/village_weaponsmith`,
  `.../stronghold_corridor`, `.../abandoned_mineshaft`, etc. — read
  directly from the decompressed NBT, not inferred). This actually
  corroborates the "Loot chests: rarity scaling" entry above, written
  earlier this session, which already noted "Abandoned Urban's chests
  overwhelmingly reuse plain vanilla tables" — the two diagnoses were
  never cross-checked against each other before now. Cross-checked
  against the mod's own `template_pool` JSON to confirm all 15 pieces
  are genuinely placed by real worldgen, not dead weight. The only
  chestless files are decorative filler that wouldn't sensibly hold
  loot (roads, rubble, wrecked vehicles) plus one dead, unreferenced
  file (`gas_station.nbt` — its own structure pool actually points at
  the already-looted `gas_station_loot.nbt` instead, confirmed by
  reading the pool JSON). **No jigsaw processors built** — this pack
  has a documented crash history from exactly that kind of change
  ([[Radium chunk_region crash]] above), and there's no real gap left
  to justify the risk. Full detail in QUEUE.md's "Abandoned Urban
  missing chest loot" entry.
- **Both new mods' default spacing checked and retuned moderately**,
  not aggressively — direct lesson from the crash sequence above.
  Defaults ranged 50-150 chunks (way past this world's border, same
  pattern as every structure mod checked in this pack). Set all 11
  structure_sets (4 from Abandoned city buildings + 7 from Abandoned
  Urban) to a uniform 24/12 spacing/separation — denser than stock for
  reachability, but deliberately conservative given this now means 13
  structure_sets active simultaneously counting Treasure2's own
  (already-retuned) sets, comparable to the 7-set situation that
  triggered the vanilla race condition before.
- **The Lost City — installed 2026-09-01** (CurseForge, author Berezka,
  `the_lost_city-1.5.0-forge-1.20.1.jar`, 1M+ downloads) for structure
  cohesion, distinct from "The Lost Cities" (ruled out earlier for
  shipping its own chunk generator). Requires **Berezka's library**
  (`berezka_api-1.2.9.6-forge-1.20.1.jar`) as its sole dependency —
  confirmed unambiguous this time (named directly and singularly on the
  mod's own dependencies page), genuinely different from the
  `berezka_api` ambiguity that sank the earlier Abandoned Structures
  pick. All 12 of its `structure_set` files (`city`, `big_city_structure`,
  `villages_city`, `camp`, `lighthouse`, `survivorscamp`, `tower`,
  `train`, `factory`, `post`, `rails`, `roads`) retuned to moderate
  spacing (matching the 24/12-style pattern above), except
  `infinity_city.json` — it uses a custom `the_lost_city:grid_placement`
  type this session doesn't understand well enough to safely retune,
  left at its shipped default rather than guessed at. Verified for
  real: a fresh sandbox world booted clean through actual jigsaw
  structure placement, and `/locate structure the_lost_city:city` found
  a real instance 112 blocks from a test point, confirming the retuned
  spacing is genuinely reachable within this pack's small bordered play
  area, not just theoretically closer.
- **Retune reverted 2026-09-02** — real in-game fallout, not a
  hypothetical: a player spawned directly inside an actively-generating
  city, plus wave-horn flakiness, both traced via the live
  `logs/latest.log` to dozens of "structure X spawned inside structure
  Y, trying to destroy structure..." collision messages and matching
  severe tick lag in the same window. Root cause: The Lost City ships
  12 overlapping city-family structure_sets sharing one world (several
  with their own `exclusion_zone` anti-overlap safeguards specifically
  against `the_lost_city:city`), deliberately spaced 10-150 chunks apart
  by the mod's own design to keep them from colliding — the uniform
  24/12-style retune above broke that safeguard. All 12 files reverted
  to the mod's own stock spacing (diff-confirmed identical to the
  extracted jar). **The Lost City is intentionally excluded from the
  reachability-retune pattern going forward** — don't re-tighten its
  spacing without addressing the overlap risk directly. The other 3
  structure mods (Treasure2, Apocalypse structures, Abandoned Urban)
  still cover in-border reachability, so this isn't a net loss there.
- **Floor depth**: left at 65 blocks as recommended — Treasure2's own
  underground diggers still benefit, no cost to keeping it raised even
  though WDA (the mod that originally drove the number) is gone.
- **Biome curation, rechecked with real data, no change needed**: 4 of
  Abandoned city buildings' structures gate on `#forge:is_plains`
  (confirmed real tag content: plains, snowy_plains, meadow,
  sunflower_plains) — the existing 7-biome set already includes 3 of
  those 4. Abandoned Urban's 7 structures each have their own biome list
  (`city`: plains/desert; `gas_station`/`motel`/`train`: broad,
  meaningful overlap; `observatory`: very broad, guaranteed overlap);
  only `fire_tower` has thin overlap (its list is forest/taiga-family,
  only `meadow` and `savanna_plateau` from the current set match) but
  still non-zero. Left the biome set unchanged rather than expanding it
  for one thin-overlap structure — matches the pack's existing
  arid/open visual identity, which expanding into forest/taiga biomes
  would dilute.
- **Verified in a real sandboxed boot with the actual relevant mod set**
  this time, not a minimal one — direct lesson from missing Radium in
  the first WDA/Structory pre-flight test. Included Radium (with both
  chunk-access mixins disabled), Treasure2, GottschCore, plus both new
  mods and their retuned spacing. Clean boot, no crash patterns, no
  fatal errors in a full log sweep.
- **Abandoned Structures (the Berezka mod, distinct from Abandoned Urban
  above) — investigated, dropped, not installed.** Its jar is nearly
  empty; the real structure-placement logic lives in a mandatory
  `berezka_api` dependency that couldn't be confidently matched among
  ~12 similarly-named "Berezka API for X" listings, none an exact fit
  for this specific mod. Not worth installing an unverified mandatory
  dependency blind, especially once Abandoned city buildings/Abandoned
  Urban turned out to need no dependency identification at all. Same
  discipline as the Pure Suffering branch mismatch and the Quest_play/
  berezka naming collision — decline to guess when the "which exact one
  is correct" ambiguity doesn't resolve.
- Treasure2 stays exactly as it is throughout all of this — never
  touched, only ever added alongside.

**"The Lost City" for structure cohesion — ready, dependency fully
resolved 2026-09-01.** Direct request after the same 2026-09-01
playtest that confirmed the abandoned aesthetic was landing: structures
still "don't feel cohesive," asked for a mod with real small towns/
cities rather than isolated single buildings. **The Lost City**
(singular — not "The Lost Cities," which was ruled out earlier for
shipping its own chunk generator, incompatible with this pack's custom
`noise`/`multi_noise` setup) — confirmed Forge 1.20.1, "small ruined
buildings and old streets," a real match for the complaint. **Berezka
dependency fully checked, not just flagged this time**: its own
dependencies page lists exactly one required dependency — "Berezka's
library," linking directly to the correct, singular, official core
library (confirmed current Forge 1.20.1, actively maintained, its own
page states "Berezka Library is a core mod required for all mods
created by Berezka"). This is a genuinely different situation from the
one that sank the earlier Abandoned Structures pick — that mod declared
a mandatory dependency on a specific modid with no matching listing
anywhere among ~12 similarly-named per-mod addons; here, the correct
listing is named directly and unambiguously on the mod's own page, no
guessing required. Two optional dependencies also listed (a TaCZ
weapon-mod addon, a Survival Instinct addon) — both irrelevant here,
skip both. **Not yet installed** — same spacing-retuning treatment
every structure mod in this pack has needed will apply once it is.

**Base expansion into rooms/corridors** — *planned, not built*. Goal:
gather materials, activate something, and a new room/corridor gets
built onto the starting structure automatically.

**Mod choice reversed 2026-08-30**: the originally-planned "standalone
Schematicannon" extraction turned out to be a mislabeled re-upload, not
an independent mod. Decompiling its jar (CurseForge project 1375728,
"Schematicannon standalone" by VinicciusX) showed a hardcoded
`modId = "schematicannon"` / `authors = "bikerboys"` pointing at
`github.com/michiel1106/Create-schematicannon` — the exact same mod as
CurseForge's separate **"Schematicannon"** listing (project 1350154,
also bikerboys), which the author's own page flags **"BROKEN, MIGHT FIX
IN THE FUTURE. DONT USE."** It also jar-in-jars Flywheel/Ponder/
Registrate/MixinExtras anyway, so the assumed footprint saving over
full Create was smaller than it looked. Installed **full Create**
(CurseForge project 328085, `simibubi`, 6.0.8 for 1.20.1 Forge) instead
— actively maintained, same bundled-dependency footprint, at the cost
of shipping Create's full machine/content roster alongside the one
mechanic actually wanted. A real footprint tradeoff, accepted directly
by the user rather than decided unilaterally. No separate Flywheel/
Ponder/Registrate packwiz entries needed — Create bundles all four via
jar-in-jar, confirmed from the jar's own `META-INF/jarjar/` contents.

Survival-native (no creative-mode restriction, no colonist dependency,
unlike the Structurize-based plan this superseded). Direction chosen:
**curated schematics found while exploring**, not player-designed
freeform — the pack author builds and finalizes each room design once,
ships the finished schematic as a lootable item placed in structure
loot tables (same LootJS mechanism already used for loot bags,
targeting structure/chest loot tables instead of entity-kill drops —
exact method name to confirm against LootJS's source before writing
it). This directly ties into the exploration/structure-generation plan
below: schematics become one of the things worth finding out there.

**Material-check-then-place gate is native, not custom** — corrected
2026-08-30, confirmed against Create's own official GitHub wiki
(`Creators-of-Create/Create` wiki, "Printing a Schematic"), not the
earlier-assumed gap. The Schematicannon draws materials from adjacent
inventories and pauses with a "Missing Block" status until they're
supplied (or skips, if "Skip Missing Blocks" is toggled) — no custom
KubeJS glue needed for the gate itself.

**Real, harder blocker found in its place**: a finished `create:schematic`
item is not self-contained NBT — decompiling `SchematicItem.class`
confirms its NBT (`File`, `Owner`, `Bounds`, `Deployed`) is a *pointer*
to a `.nbt` structure file that must already exist in that specific
world's `saves/<world>/schematics/uploaded/` folder (populated normally
by a player running a local schematic file through the in-world
Schematic Table). A lootable item alone can't carry the room design —
the underlying `.nbt` file has to reach every world's save folder
somehow, which needs either a real filesystem-copy hook (KubeJS/Java
interop, unverified) at first login, or accepting that the loot-schematic
plan needs a different delivery mechanism entirely. **Still needs,
before any of this can be built**: at least one actual room, hand-built
in-game and exported via Schematic and Quill + Schematic Table into a
real `.nbt` file — inherently a real-client, real-playtest step, not
something a coding session can produce headlessly. This is the genuine
bottleneck now, not the mod choice.

**Structure generation / exploration content** — *live* (2026-08-30),
**first real playtest 2026-08-31: desert biome confirmed working
(desert-specific structures did generate), two real bugs found**.
Goal: real structures to explore,
including actual treasure (not just decoration), tied into the
border-expansion mechanic (structures become reachable as the border
grows, but growing the border doesn't *cause* generation — chunks
generate on approach the normal way, same as any vanilla exploration).
- **Biome swap**: flat generator's biome changed to `minecraft:desert`,
  `type: flat` unchanged — flatness and biome are independent settings,
  so this avoids the "wonky" complaint the earlier noise-based Desert
  attempt got, while making desert-tagged structures/mods relevant.
- **Vanilla desert pyramids confirmed generating (2026-08-31 playtest),
  then deliberately disabled again.** They actually appeared — real
  confirmation the `fixed` desert biome_source is genuinely producing
  desert, not silently falling back to plains. But their loot chamber
  digs down from the pyramid's base the way real vanilla terrain always
  has room for, and this world's ground layer is only ~4 blocks thick
  before hitting the world's absolute floor (`final_density`'s
  `y_clamped_gradient` sits the surface at y≈-60 against a min_y of
  -64) — nowhere near enough depth, so the loot chamber has nowhere to
  go and the structure generates unlootable. Same *shape* of problem as
  the YUNG's crash, just non-crashing this time. Direct user call,
  independent of whether this could be fixed: doesn't want vanilla
  desert temples regardless ("I don't really like them anyway"), so
  disabled outright rather than chasing loot-chamber placement on a
  flat world — `kubejs/data/minecraft/worldgen/structure_set/
  desert_pyramids.json` overridden to an empty `structures` list
  (standard datapack technique for suppressing a vanilla structure
  entirely; the placement block's spacing/separation reverted to
  vanilla defaults since they're meaningless once the structure list is
  empty — no point tuning spacing for a set that places nothing). This
  also retires the density-reachability tuning done to this same file
  earlier the same day (spacing 32→8) — dead config now, cleaned up
  rather than left orphaned.
- **Real, quantified risk for Treasure2's own structures, not yet
  confirmed broken**: that same ~4-block ground thickness applies
  everywhere in this world, not just under pyramids. `dungeon/general`
  (the single most likely structure to generate — weight 60 of the
  `terranean_treasures_set`'s ~124 total) is a genuine underground
  digger by name; if its loot chamber needs meaningfully more than ~4
  blocks of clearance below the surface, it could hit the exact same
  wall. Not fixed speculatively — flagged as a real, evidence-backed
  risk to watch for on the next playtest, since the user does want to
  keep Treasure2's own content (only the vanilla temples were
  objected to).
- **"Superflat Structures" insurance mod turned out not to exist for
  this version** — checked three candidates (Superflat Structures,
  Superflat Features and Structures, FlatEdit+), all Forge 1.20.1
  absent (NeoForge/1.21+ only). Compensated by directly decompiling
  each installed structure mod below and grepping for
  flat/superflat-specific disable logic instead of relying on a missing
  safety net — none found in any of them.
- **Mod picks, two dropped from the original plan — one on hard
  evidence up front, one on a real in-game crash**:
  - **YUNG's Better Desert Temples — installed, then REMOVED
    2026-08-30 after confirmed-broken real-world testing.** World
    creation crashed on every attempt: `logs/latest.log` showed a
    repeating `ArrayIndexOutOfBoundsException: Index -1 out of bounds
    for length 24` inside the mod's own `QuartzPillarProcessor`, which
    replaces a temple's quartz pillar with an 8-block sandstone column
    by walking straight down from the pillar's position with no
    world-floor check. Read the processor's actual source
    (`YUNG-GANG/YUNGs-Better-Desert-Temples`, `1.20` branch) to confirm:
    24 is a full-height world's chunk-section count, so index -1 means
    the column walked below Y-min — on this pack's genuinely flat/thin
    world, a temple piece can generate close enough to the floor for
    that walk to underflow, and it did, deterministically, on the very
    first world-creation attempt. This directly contradicts the
    original "no flat-world references anywhere in its jar" check —
    that check looked for explicit flat-world *detection* code (a
    self-disable check), which genuinely doesn't exist, but a mod
    having no flat-world checks doesn't mean it's flat-world *safe*, a
    real distinction this pack hadn't drawn until hitting it. Removed
    the mod and its **YUNG's API** dependency (nothing else in the pack
    needs it) — see `docs/MODS.md` for the removal entry. **No fix
    attempted or found** (no newer 1.20.1 build, no relevant closed
    issue found on the mod's own tracker) — this was a "cut it, don't
    debug a third-party mod's worldgen code" call, matching this pack's
    standing approach to failed features.
  - **Treasure2** + its **GottschCore** dependency — installed.
    Confirmed directly from its own structure JSONs that its desert
    ruins and wishing well structures use a `#treasure2:wells_desert`
    biome tag that explicitly includes `minecraft:desert` (plus
    optional Biomes O' Plenty/BWG desert-biome-mod hooks), and its
    general surface/dungeon structures inherit that same tag via
    `#treasure2:terranean` — real treasure content that will actually
    place in this specific desert world, not just decoration.
  - **Abandoned Structures — NOT installed, confirmed wrong fit.**
    Checked its own structure JSONs directly: all 4 structures
    (gas_station, house1, house2, tower) are restricted to
    plains/snowy_plains/sunflower_plains/badlands/savanna/forest-family
    biomes — **none of them list `desert`**. In a world that's
    uniformly desert biome everywhere, none of this mod's content could
    ever generate regardless of any other setting. A real, decisive
    disqualification found by checking the mod's own data, not a gap
    left for later.
  - Still deliberately not picked: **Repurposed Structures** (confirmed
    flat-generator conflict) and **Lost Cities** (ships its own
    world/chunk generator — same risk category that already caused real
    problems with Oculus/shaders and the earlier Desert attempt).
- Structure loot stays a separate channel from the mob-drop loot bags —
  deliberate, not an oversight; Treasure2 promises better-than-vanilla
  native loot by design, so no custom LootJS structure-loot injection
  was needed as a first pass.
- **Treasure2 itself is still genuinely unconfirmed** — world creation
  never got past the YUNG's crash above to actually test it. Worth
  watching specifically on the next successful world creation, given
  what just happened with a different structure mod on this same flat
  generator.

**Structure density fix, 2026-08-31, direct request ("increase the
generation of structures").** World creation now succeeds (see "World
type" section), which surfaced a real problem the earlier planning
never checked: default structure spacing is tuned for an infinite
vanilla world, not this pack's bordered one. `worldborder` tops out at
270 blocks (~17 chunks) even at wave 8 (see "Base expansion"), but the
mods' own default `random_spread` placement averages **400-800 blocks**
between attempts (vanilla desert pyramids: 32-chunk spacing; Treasure2
terranean set: 25 chunks; Treasure2 wishing wells: 50 chunks) — under
those defaults, a player could plausibly finish the entire 8-wave
campaign without ever generating a single structure inside the
reachable area. Fixed by overriding all three `structure_set` registry
files via the same KubeJS-datapack-overlay mechanism already proven
working for the dimension override (`kubejs/data/<namespace>/worldgen/
structure_set/<id>.json`, same technique, different registry):
  - `minecraft:desert_pyramids` — spacing 32→8, separation 8→4.
  - `treasure2:terranean_treasures_set` (dungeon/general, both ruins
    variants, surface/general, wither_tree) — spacing 25→6, separation
    15→3.
  - `treasure2:wishing_well_set` — spacing 50→10, separation 35→5.
  Salts left unchanged, only spacing/separation touched. Aquatic
  ruins/wells deliberately left alone — their structure_set requires an
  aquatic biome that can never exist under this world's `fixed:
  minecraft:desert` biome source, so tightening its spacing would
  generate zero additional visible content regardless.
- **Confirmed which entries actually contribute vs. silently waste
  placement attempts** (a `random_spread` set rolls ONE weighted
  structure per grid cell — if that specific structure's own biome
  check fails, nothing places there, it does NOT fall through to
  another entry): checked every structure's own `biomes` field and the
  Treasure2 biome tags they resolve to. `#treasure2:terranean` resolves
  to `#treasure2:wells_general` + `#treasure2:wells_desert`, and
  `wells_desert` lists `minecraft:desert` directly — so `dungeon/
  general`, both `ruins` variants, `surface/general`, and `wither_tree`
  can all actually place here. `surface/temperate` (weight 5 of 124)
  requires forest/plains-family biomes and can never place in an
  all-desert world — a real, permanent ~4% wasted-roll rate on that set
  that the density fix doesn't address (not worth a separate override
  just to redistribute one entry's weight). The `wishing_well_set` is
  worse: 3 of its 4 equally-weighted entries (`well/wishing_well`'s
  `wells_general` tag, plus the forest/jungle variants) can never place
  in all-desert, only `well/desert/wishing_well` can — meaning ~75% of
  that set's attempts were always going to be wasted, on top of the
  original 50-chunk spacing. This is the real reason the wishing well's
  spacing was cut proportionally more (5x) than the terranean set's
  (~4x) in the fix above — compensating for that wasted-roll rate, not
  an arbitrary choice.
- **Chest loot confirmed real, not placeholder** — checked directly,
  not assumed. Vanilla `desert_pyramid`'s chest loot table
  (`data/minecraft/loot_tables/chests/desert_pyramid.json`, untouched
  by this pack) is standard vanilla: diamonds, gold, emeralds,
  enchanted golden apples, the desert armor trim template. Treasure2's
  chests use real per-rarity `minecraft:chest`-type loot tables
  (`common` through `mythical`) each rolling multiple real sub-pools
  (treasure/items/armor/food/tools/potions) — e.g. the `common` chest
  alone rolls 2 treasure entries (Treasure2's own keys/lockpicks, its
  locked-chest mechanic) + 3-5 items + 1-2 armor + 1-3 food + 1-2 tools,
  all real items (iron ingots, leather, arrows, etc.), not stubs.
  Exactly which rarity a given structure's chest rolls is Treasure2's
  own Java-side logic (`RarityLootTableAssociationRegistry`, not a
  simple JSON this pack overrides), not verified further — but every
  rarity tier's loot content itself is confirmed real.
- **Confirmed in-game** through the subsequent structure-mod playtests —
  Treasure2 structures (including the density-tuned spacing here) have
  generated and been explored repeatedly since this was first written.
  Standing caveat for any future spacing change: **structure placement
  is decided at chunk-generation time**, so a change only affects chunks
  not yet generated — an already-explored area keeps whatever the old
  spacing produced there.
- **Treasure2 "cardboard boxes" (2026-08-31 playtest) turned out not to
  be a bug at all.** Checked `logs/latest.log` first rather than
  guessing at a fix — no crash, no exception, nothing. Root cause: the
  jar ships a real `cardboard_box_mimic` entity (texture, glowing-eyes
  variant, ambient sounds, spawn egg) — Treasure2's own GitHub confirms
  this (`gottsch/gottsch-minecraft-Treasure` issues #349/#350, both
  closed as implemented). It's a monster disguised as ordinary junk, not
  a chest — explains both symptoms at once: looks like a box because
  that's the design, doesn't open because it's a mob, not a block
  entity. **Decided 2026-08-31: leave it undocumented.** No Patchouli,
  no quest-book hint — the ambush is the point of a mimic, matches the
  wasteland's "danger lurks" tone. Direct call, not an oversight.

**Exploration pacing retune — requested 2026-09-02, sent to build.**
Direct playtest feedback: structure generation reads as "too dense,"
paired with wanting exploration to be "sort of midgame" rather than
saturating the map from wave 1, with loot in structures feeling
appropriately high-tier the further out/later it's found. Reverses the
direction of the 2026-08-31 "Structure density fix" above — that fix
optimized for guaranteeing *something* reachable inside an 8-wave
campaign's small border; the border-growth retune above now spreads
that job across the whole endless phase instead, so the same
guarantee no longer needs cramming everything near spawn.
- **Scope confirmed with the user**: pacing/density/loot-rarity only,
  this pass. The already-parked Storage & Power system (Refined
  Storage/Sophisticated Storage/Immersive Engineering/Flux Networks —
  see "Storage & power system" under "Defense") stays parked; "high
  tier" here means better vanilla/Treasure2 rarity progression, not
  real storage-system items dropping from structures yet. **Pacing
  mechanism confirmed border-only, no hard wave gate** — one mechanism
  to tune (the growth curve above), not two kept in sync.
- **Structure spacing loosened — live now, shipped 2026-09-02.**
  Worked from each `structure_set` file's real current values (several
  had drifted from what this entry first guessed at), same loosen-back
  intent as originally proposed, not the specific stale deltas:
  postapocalypse_structures (all 4 buildings) and abandoned_urban's
  `city.json` went from 10/5 or 13/6 → **30/15**; abandoned_urban's
  other 6 sets went 10/5 → **24/12**; treasure2's wishing_well set went
  14/7 → **26/13**. Treasure2's terranean set stays at its already-stock
  25/15 (the Lost City crash-fix revert, not re-tightened). For context,
  each of these mods' own real stock spacing runs 50-150 chunks per
  file, so even these loosened values stay far denser than default.
  Verified via a genuinely fresh sandbox world: clean boot, zero
  chunk-out-of-bound crashes, zero Berezka collision events — the
  earlier crash fixes hold at this spacing too. Spot-checked `/locate`
  distances from a fresh spawn: red_mansion 732 blocks, city 537,
  wishing_well 170. Deployed and committed (6d8c50e), same commit as the
  growth-curve retune above.
- **Loot-tier-by-progression — on hold, not built.** Treasure2's own
  rarity system was decompiled and confirmed real: `data/treasure2/
  rarity_associations/block/chest/*.json` maps a fixed rarity to each
  specific chest block variant, with no distance/progression-aware hook
  anywhere — a "common" chest is common regardless of where it spawns.
  Making rarity scale by progression would need genuinely new logic (a
  LootJS global loot modifier reading chest position at loot-roll time
  and injecting bonus pools past distance thresholds), real build
  surface on its own, not a data retune. **Held rather than built**:
  this surfaced right as the user opened a fresh question about
  replacing Treasure2 outright (loot-table opacity being a direct
  driver of that ask) — see "Structure & loot mod replacement" below.
  Building Treasure2-specific rarity logic now risks being thrown away
  if Treasure2 goes; revisit once that decision lands.

**Structure & loot mod replacement — requested 2026-09-02, built and
deployed 2026-09-02 (commit fdfa521).** Direct feedback: "the treasure2 mod just isnt the right fit"
(both loot-table opacity — confirmed real above, its rarity system has
no progression hook and lives in Java-side registries, not a datapack
— and the dungeon-fantasy mechanics/aesthetic: locked chests, keys,
mimics) "and I also dont like the custom loot bags." Three real
candidates researched and confirmed directly (CurseForge pages/file
listings, not search snippets — one snippet/page mismatch caught along
the way, see below), each individually confirmed with the user:
- **Treasure2 + GottschCore — removed, no replacement structure mod.**
  Considered adding a dedicated dungeon/loot structure mod instead, but
  ruled out: this world's ground layer is only ~4 blocks thick before
  the absolute floor (documented in "Structure generation" further
  up), which is exactly what has already caused two real problems —
  YUNG's Better Desert Temples crashed world creation outright on this
  same constraint, and Treasure2's own `dungeon/general` was the
  confirmed real cause behind an earlier Radium chunk_region crash.
  Underground-digging structure content is a standing bad fit for this
  world, not worth chasing a replacement for. Instead: rely on the 3
  structure mods already installed (Apocalypse structures, Abandoned
  Urban, Lost City) for exploration content, and LootJS (already
  installed, already proven on postapocalypse_structures' chests) for
  full loot-table control — strictly more control than Treasure2 ever
  offered, zero added footprint. Removing Treasure2 also retires the
  terranean/wishing-well `structure_set` spacing tuning as dead config,
  same cleanup treatment the desert_pyramids removal got.
- **BountyBags — new mob-drop loot bag mod, replaces the custom
  system.** Author OSAMA_OM, real Forge 1.20.1 build (`BountyBags-
  5.9.0.jar`, released 2026-07-30, actively maintained), 445K
  downloads, **zero dependencies** (confirmed via its own CurseForge
  dependencies page, not assumed). 4 base tiers (Uncommon/Rare/Epic/
  Legendary) plus 3 boss-exclusive bags (Ender Dragon/Warden/Wither —
  likely irrelevant here, this pack doesn't target vanilla end-game
  bosses). Loot fully controllable: "dedicated loot tables for each
  regular bag tier, fully replaceable via datapacks," plus config-file
  item lists, per-mob-type multipliers, and biome drop bonuses.
  **Tier mapping resolved and shipped**: a static per-mob-type
  LootJS entity loot modifier (`loot_bag_drops.js`) — each mob type is
  permanently assigned to exactly one of the 4 tiers, not a live
  wave-number check, though the original assignment was grouped by
  each mob's wave-of-first-appearance (Uncommon = wave 1, Rare = waves
  2-3, Epic = waves 4-5, Legendary = waves 6-8). Drop rates
  0.5/0.25/0.1/0.04, same "rarity gates both drop rate and which
  enemies can roll which tier" standing rule carried forward from the
  old custom system. BountyBags' own autonomous drop system disabled
  (`enableDrops=false`) so only this pack's per-mob rules apply, no
  double-dropping. **Real bug caught before shipping**: the mod
  validates its own loot data and silently falls back to an emergency
  stone-only pool on failure — the first `legendary.json` draft gave
  `totem_of_undying` a max count of 2, but BountyBags caps it at 1
  internally, which would have triggered that silent fallback. Fixed
  and reverified via a real `/loot spawn` roll, same verification
  method used for all 4 tiers. **This wave-of-first-appearance grouping
  is being reclassified by actual mob toughness instead — see "Mob-tier
  loot progression" above** (a real mismatch found: `wither_skeleton`
  ended up in Epic tier alongside the ravager despite being explicitly
  "trash floor" in the design docs).
- **Lootr — new install, personal per-player loot-chest instancing,
  applies to any vanilla/modded chest.** Author Noobanidus, zero
  dependencies, ~161M downloads, "compatible with almost every feature
  and structure, Vanilla or modded" per its own page.
  **Staleness claim below was wrong — corrected 2026-09-02 by the build
  session before installing.** The original research (a CurseForge
  WebFetch of one specific old file) concluded Lootr's last Forge
  1.20.1 build was `lootr-1.20.1-0.7.28.67.jar` from 2023-06-15. The
  build session checked Modrinth's own version API directly instead of
  a single file's page, and found continuous Forge-1.20.1-tagged builds
  through **2025-11-26** — CurseForge appears to have renamed its file
  convention around early 2024 (`lootr-1.20.1-*` → `lootr-forge-1.20-*`),
  which made the filename-pattern-based check undercount; packwiz
  independently resolved the same latest file on its own, confirming
  it. **Installed the current build, not the 2023 one.** This
  materially changes the risk picture from what was presented when the
  user made their "install anyway, informed risk" call below — it's
  actually a live, maintained mod for this exact version/loader, not an
  abandoned one. Original "ATM10 uses the NeoForge target, not the
  stale Forge one" reasoning stays valid as a general verification
  method, it was just applied to a wrong premise this time. General
  lesson: check a platform's real version/loader filter (or API), not
  a single file's page or a filename pattern, since naming conventions
  change over a mod's lifetime.
  Original framing, kept for the record: same shape of risk as the two
  loot-bag mods rejected two weeks ago for staleness (Mob Lootbags,
  Treasure Bags — see this file's earlier "Loot bags" evaluation
  history), flagged explicitly and **the user chose to install it
  anyway** — direct, informed call, not a default, even though the
  underlying premise turned out to be wrong.
- **One real open question, not yet resolved**: Forge's dedicated-server
  scanner flags the installed build as client-side-only despite its
  `mods.toml` declaring `side="BOTH"` and its jar containing real
  server-side classes (advancement predicates, a server packet-listener
  mixin). Couldn't be fully resolved in a dedicated-server-only
  sandbox — same blind spot documented earlier for Mob Dismemberment's
  client-only check. **Needs a real live-game check of actual
  per-player chest behavior**, not assumed settled from the scanner
  result or the jar contents alone.
- **A first WebSearch pass on Lootr returned a wrong "has a current
  Forge 1.20.1 build" summary that a direct WebFetch of the mod's own
  page contradicted** (search snippet vs. real page mismatch, same
  general risk this pack has hit before with CurseForge search results
  surfacing the wrong mod entirely) — the WebFetch result was trusted
  over the search summary at the time, which was the right call given
  what was checked, but the WebFetch's own method (one old file's page)
  turned out to have the same undercounting problem, just one layer
  deeper. Both lessons stand: distrust search snippets, *and* distrust
  a single file's page as proof of "no newer build exists."
- **Built, verified, and deployed 2026-09-02 (commit fdfa521).**
  Treasure2 + GottschCore removed (mods, structure_set overrides, dead
  index entries all cleaned up), BountyBags + Lootr installed, the
  custom loot bag system fully migrated. Sandbox-verified: fresh world
  boot clean, zero crashes, all 4 BountyBags tiers confirmed rolling
  real items via direct `/loot spawn`. **Not yet confirmed by an actual
  player session** — sandbox verification covers boot stability and
  loot-table correctness, not real per-player chest behavior (see the
  open question above) or gameplay feel.
- **Unblocks piece 3 (loot-tier-by-progression)**, held earlier in the
  "Exploration pacing retune" entry above specifically because of
  Treasure2 uncertainty — now buildable as a general LootJS distance/
  wave-based rarity system across the 3 remaining structure mods
  instead of Treasure2-specific logic. Not started yet, ready to
  sequence whenever.

**Vanilla village spacing — real playtest report 2026-09-05, fixed the
same day.** A village generated close enough to the fixed spawn point
that its Iron Golem pulled wave mobs into a fight instead of letting
them converge on the pedestal — a real interaction risk given the
"always converges on the objective" targeting fix above. Confirmed for
real, not assumed: extracted the live save's actual seed from its
`level.dat` and ran `/locate structure #minecraft:village` from the
real fixed spawn point (780, -150) against this pack's actual worldgen
config in a sandbox — a savanna village really was only 92 blocks away,
on vanilla's untouched default village spacing (this pack had never
overridden `minecraft:villages` before). Added
`pack/kubejs/data/minecraft/worldgen/structure_set/villages.json`,
doubling spacing/separation from vanilla's 34/8 to 64/16 (same 5
variants/weights/salt). Re-tested with the identical seed and point:
nearest village moved to 813 blocks away. Full mod set still boots
clean. **Honest limit**: a spacing change is statistical and forward-
looking only — it can't move the village already generated on the
current live save, and one seed's improvement doesn't guarantee every
future seed lands equally far, just that this exact reported collision
is resolved and the odds are meaningfully better going forward.

**"Just sand" — real root cause found and fixed 2026-09-05.** Not a
perception issue or a badlands-style spawn-point problem (the shape the
report's own hypothesis expected) — the ground was literally
`minecraft:sand` almost everywhere in the entire world, independent of
biome. Confirmed by correlating real biome tags against real surface
blocks at 441 sample points around the fixed spawn point, in a sandbox
running this pack's actual worldgen config against the live save's own
real seed: every savanna/plains sample came back sand. Root cause: the
dimension override's `generator.settings` still referenced
`kubejs:flat_desert` — a noise-settings file left over from the
already-abandoned "Single Biome: Desert" experiment (2026-08-20), whose
`surface_rule` places sand/sandstone unconditionally with no biome
check at all. The `biome_source` half of the same file was correctly
rebuilt into the real curated 7-biome `multi_noise` set during the
2026-08-31 world-gen variety pass — but biome assignment and surface
material are two independent systems on a `minecraft:noise` generator,
and only one half got updated at the time. Fixed by extracting the
real, authoritative vanilla `surface_rule`/`default_block` directly
from this exact game version's client jar and splicing them into a new
`kubejs:overworld_flat` noise-settings file (this pack's own
deliberately-flat `noise`/`noise_router` section left untouched) —
`flat_desert.json` deleted outright, including its now-misleading name.
Re-verified the same 441-point correlation after the fix: zero sand
outside real structure footprints, savanna/plains both resolve to
grass_block/dirt/coarse_dirt as expected, full mod set still boots
clean on the live save's real seed. **Real, honest limit**: worldgen
changes only affect chunks generated from here on — the area the
player has already explored around spawn was generated under the old
broken settings and won't retroactively fix itself; needs either the
border expanding well past what's already generated, or a fresh world,
same limit every other worldgen change in this pack has had.

**Circular altar dais — built and committed 2026-09-05, real shape-
language change per a user-supplied reference image.** Rebuilt the
square sandstone platform in `playtest_starter_kit.js` into 3
concentric octagon rings (radius 3/2/1, one block higher moving inward
— a square ring with its 4 true diagonal corners cut at each radius,
the standard `/fill`/`/setblock` approximation for "round," since this
pack can't build a true circle) leading to a flat raised platform, a
central plinth/column, and the pedestal on top of it. Randomized
blackstone/polished blackstone/deepslate tiles/cracked deepslate tiles
mix (same ratio pattern as the perimeter walls' own weathered accents),
a moss-carpet ring blending it into the courtyard floor, two stair
blocks softening only the main approach. Every campfire removed
outright — direct request, not a reduction. Grave arc relocated to the
dais's west flank since the bigger radius-3 footprint now occupies its
old front/back spot. Pedestal Y grew wallY0+2 → wallY0+4 with the new
plinth; every other script reading `td_pedestalX/Y/Z` treats it as an
opaque coordinate, so nothing else needed touching. **Verified for
real**: replayed the exact build logic via `ServerEvents.tick` against
the live save's real seed/spawn coordinates (can't get a real player
through this modset's FML handshake in a sandbox) — first pass failed
everywhere from a real, separate gotcha (the target chunk had never
been visited in that fresh test world, so `/setblock` silently no-op'd;
the real login flow never hits this since the player is already
standing there) — re-ran with an explicit forceload and real settle
time first, and every block (pedestal, ring material, moss edge,
approach stair) landed exactly as intended, zero errors. **Real limit**:
fresh-world only, same as every other spawn-time build in this pack —
doesn't change the current live save's already-placed dais.

**Rejected on second playtest, 2026-09-06 — see "Second fresh-world
playtest batch" below.** Direct feedback: "the raised dais is just not
looking great, ditch this and just have the pedestal placed in the
yard." Ditching the elevated build entirely, not iterating on it again.

**Aesthetic structure variety pass — requested 2026-09-04, sent to
build 2026-09-05.** Direct feedback: "now that we have got the beginnings of
structure gen/placement... the current one is just lacking." Researched
directly against real post-apocalyptic modpacks and mod listings rather
than guessed — most "post-apoc" modpacks turned out to be 150+ mod
kitchen-sink tech/magic packs with a theme skin (not useful reference
material for this pack's lightweight, curated identity), so this went
targeted instead: real structure/decoration mod candidates, each
individually verified, not trusted from a single search summary. Two
picked, confirmed with the user:
- **Philip's Ruins** (CurseForge, author philipmoddev, 42.3M downloads,
  real Forge 1.20.1 build `PhilipsRuins1.20.1-5.7`, released
  2025-09-23). 200+ smaller ruin variants that blend into terrain
  instead of the rigid drop-off most structure mods have at rough
  terrain edges — the mod's own stated design goal is exactly the
  "structures don't feel cohesive" gap this pack has hit before with
  its bigger set-piece buildings. Scatters organic-feeling wreckage
  *between* the existing structures rather than adding more isolated
  POIs of the same kind.
- **Big Lost City — Apocalyptic Structures!** (CurseForge, author
  Flashh with co-authors Leonxkingx/MadeBySanny, 587.6K downloads, real
  Forge 1.20.1 build `Big Lost City - MC 1.20.1 - 1.0.1`, released
  2026-05-18 — very fresh). Modern abandoned buildings, explicitly
  built for apocalyptic-themed modpacks, its own page states
  compatibility with other structure mods.
- **Checked and correctly still ruled out, not re-suggested**: the
  Berezka "Abandoned Structures" mod (same mandatory-dependency
  ambiguity that sank it before, unchanged), "The Lost Cities" (plural
  — still ships its own chunk generator, confirmed by directly checking
  the exact CurseForge slug rather than trusting a search summary that
  conflated it with the already-installed singular "The Lost City").
  Full Fallout-conversion mods (Wasteland Wanderer, NukaCraft) were
  found and are real, but flagged as a much bigger scope/footprint
  shift than a targeted aesthetic pass, not picked.
- **Not pinned down here, left for the build session**: real
  dependency verification for both (only checked via single-page
  fetches here, not a filtered file list or API — same discipline gap
  flagged for Lootr earlier, worth re-checking properly before
  installing), structure_set spacing retuned to be reachable within the
  *current* border curve (125 by wave 8, not the old 270 target — same
  technique already applied to every other structure mod), and whether
  either mod's loot uses standard vanilla-format tables this pack can
  control via LootJS or an opaque system like Treasure2's (worth
  checking proactively given why Treasure2 was dropped, not assumed
  fine).
- **Not yet implemented** — sent to the build session as a spec.

**Shipped 2026-09-04 — re-sent 2026-09-06 per the peer's own dispatch
dating, this time actually built.** (Real commit-timestamp check: this
work landed 2026-09-04, not 2026-09-06 — the peer's dispatch date is
kept here as their own record, but don't treat it as this session's
actual wall-clock date.)
Both mods installed (packwiz + sha1-verified live jar deploy), dependency-
free per each mod's own `mods.toml` (no mandatory deps, unlike the
already-ruled-out Berezka Abandoned Structures). Real scope turned out
much larger than the spec anticipated: installing both surfaced 55 total
structure_sets (20 from Philip's Ruins, 35 from Big Lost City) — most
never checked in the original research pass. Handled with a real,
individually-reasoned pass over every one, not a blanket retune:
- **14 Philip's Ruins sets** (ancient_crypt/dungeon/ruins/towers,
  antiquus_crypta, desert_structures, field_stone_ruins ×2,
  level_one/two/three_ruins, lost_soul_city, nether_ruins,
  underground_structures) retuned to 16/8-chunk spacing/separation —
  denser than the 24/12-chunk precedent since this pack's live border
  curve is smaller now, still well short of vanilla defaults.
- **6 sets left untouched deliberately**, zero real biome overlap
  against this pack's curated 7-biome set: `end_ruins` (End-only),
  `nether_structures` (real Nether biomes), `ocean_ruins`/
  `ocean_fortress_main` (no ocean biomes exist in this pack's
  biome_source), `pumpkin_ruins` (forest/swamp), `rare_ruin` (jungle/
  mangrove_swamp).
- **Big Lost City's car_N/deco_N/tent_N variant clusters** (10/14/3
  duplicate-shaped structures each) consolidated into 3 single weighted-
  pool sets (`car_1`, `deco_1`, `tent_1` now each reference all their
  own variants at equal weight) rather than shipping all 27 as separate
  active structure_sets — this pack's own documented jigsaw
  race-condition crash history (Radium chunk_region crash) made 55
  simultaneous structure_sets a real risk, not a hypothetical one.
- **13 Big Lost City standalone landmarks** (skyscraper variants,
  house_1-3, ferriswheel, powerplant, store_1, warehouse) individually
  retuned to 16/8-chunk spacing, same as the Ruins sets.
- **Real bug caught by the sandbox boot-test, not shipped blind**: the
  first consolidation pass made the 24 now-redundant car_2-10/deco_2-14/
  tent_2-3 sets "inert" via `spacing = 999999`. Registry load crashed
  every time: `Value 999999 outside of range [0:4096]` — vanilla's
  `RandomSpreadStructurePlacement` codec caps both spacing and
  separation at 4096. Fixed to `spacing = 4096, separation = 1` (as
  inert as the format allows), re-tested, clean boot.
- **Verified live, not assumed**: full-restart fresh-world sandbox boot
  reached `Done (29.325s)!` with zero errors or warnings referencing
  `big_lost_city`/`philipsruins`/`structure_set` (the only errors in the
  boot log are the pre-existing, unrelated Zcraft loot-table parse
  issue). `/locate structure` confirmed real generation for all three
  categories: a consolidated pool (`big_lost_city:car_1`, 852 blocks
  out), a retuned individual set (`big_lost_city:powerplant`, 213
  blocks out), and a Philip's Ruins set (`philipsruins:ancient_ruins`,
  only 80 blocks out — consistent with the 16/8-chunk retune).
- **Loot-table format checked, not assumed**: both mods use standard
  vanilla-format datapack `loot_tables/` JSON (Philip's Ruins: ~13 named
  chest tables, one per structure family; Big Lost City: 4 tiered chest
  tables) — fully LootJS-controllable, not an opaque system like
  Treasure2's. Resolves the open question from the original spec.
- Deployed to the live instance's `kubejs/data/`. **Real limit**: like
  every other structure_set retune this pack has shipped, only affects
  chunks generated after this point — doesn't retroactively change
  structures already placed in the current live save. Unconfirmed
  in-game (no real playtest on a fresh world yet, only sandbox
  verification).

**Big Lost City removed entirely, 2026-09-04 — real playtest verdict,
not a retune.** Direct feedback: the structures are "just too big,"
full removal wanted. **Real live crash found and fixed along the way**:
the user's own attempt to remove it manually (deleting the jar
directly, not through packwiz) left all 62 of this pack's own
`kubejs/data/big_lost_city/` override files in place, referencing
structures the now-missing mod no longer provides — the live instance's
own `logs/latest.log` showed the real resulting crash directly:
`IllegalStateException: Unbound values in registry ResourceKey[...
worldgen/structure]: [big_lost_city:blackskyscraper, ...]` (all 37 real
structure ids). Fixed by the full, correct removal: packwiz uninstall,
every one of the 62 override files deleted (repo + live), `packwiz
refresh` to purge the resulting stale `index.toml` entries. Verified
live: fresh-world boot on the exact seed that was crashing now reaches
`Done` clean. **Philip's Ruins stays** - nothing in the report
suggested removing it too, and it wasn't implicated in the crash.

**Structure variety after the YUNG's removal** — resolved 2026-08-31,
see "Structure mod picks" further up in this "World type" section for
the actual decision (When Dungeons Arise, Structory: Towers unheld,
Abandoned Structures, alongside the existing Treasure2). This entry
originally just held Structory: Towers as a researched-but-unqueued
candidate pending the first real playtest — that playtest happened, the
desert temple bug it surfaced led directly to the broader "drop desert,
pick structure mods for real variety" decision instead.

---

## The amulet

**The amulet** — *live, confirmed working in-game* (built 2026-08-30;
several real bugs found and fixed via actual playtesting since — see
below). A custom item that draws mob
attention to *itself* rather than the player or a fixed map location —
a lightweight route to "true tower defense" (mobs pathfinding to a
fixed objective regardless of player position) without custom AI,
since `mob_aggro.js` already proves `Mob#setTarget()` works reliably
here; the amulet just changes *what* it targets.

**Stack**: **Curios API** (the current, actively-maintained accessory-
slot mod — note **Baubles itself has no Forge 1.20.1 build**, it
stopped at 1.12.2, Curios is its real modern replacement) +
**KubeJS-Curios** (a bridge mod that exposes Curios equip/unequip and
tick-while-worn hooks directly to KubeJS scripts, avoiding custom Java
or unverified capability reflection). Item: `kubejs:amulet`, registered
the normal way and tagged to a Curios slot.

**Curios slot mechanics, confirmed from source before building**:
Curios ships slot *types* (necklace, charm, back, etc., each just an
icon/order/validator definition) but grants **zero slots of any type to
any entity by default** — a consuming pack has to grant slot count
itself. Confirmed directly from Curios' own `CuriosSlotManager.java`:
slot-definition files at `data/<any namespace>/curios/slots/<id>.json`
are merged by *path*, not namespace, so this pack's own
`data/kubejs/curios/slots/necklace.json` (`{size:1, operation:"ADD"}`)
correctly stacks onto Curios' own `necklace.json` (which only sets
order/icon/validators, no size) — no separate "which entities get this
slot" file needed in this Curios version, unlike its own test fixtures
which misleadingly suggest otherwise. The item is tagged into the slot
via the standard `#curios:necklace` item tag
(`data/curios/tags/items/necklace.json`).

**KubeJS-Curios' real API, read from its own source, not guessed**:
CurseForge project 1255211 (author zhaijineet) has no README in its
repo, and a *different* project with the same name (Prunoideae's
KubeJS-Curios) exists too with a different API — installed the right
one by checking the CurseForge listing's actual linked GitHub, not
assumed from the name. `CuriosJSCapabilityBuilder.create()` returns a
builder with `.onEquip((slotContext, prevStack, stack) => …)` /
`.onUnequip((slotContext, stack, newStack) => …)`, attached to an item
via `.attachCuriosCapability(builder)` chained onto the item builder
during registration. `slotContext.entity()` gives the wearer.
Programmatic equip (for the starter-gear give, below) uses a *different*
path — `player.setEquippedCurio(slot, index, stack)` /
`.findFirstCurio(predicate)`, mixed directly onto `LivingEntity` — so
`player` gets these methods without any special import, same as
`getX()`/`setTarget()` elsewhere in this codebase.

**Worn state**: the equip/unequip capability callbacks set a
`td_amuletWorn` persistent-data flag; `server_scripts/amulet_worn.js`
(the existing `PlayerEvents.tick` pattern, same shape as
`mob_aggro.js`/`wave_status.js`) applies/refreshes **Regeneration +
Fire Resistance** while it's true — passive survivability rather than
combat stats, so it doesn't duplicate the (removed) roguelike buff-pick's
Vitality/Fortitude/Ferocity trio. **Player-only for this pass** —
buffing defensive machines too was the original idea, but Tier 1 is now
Trapcraft's blocks (an external mod with no idea this amulet exists),
which makes machine-buffing genuinely harder than when Tier 1 was
custom-owned. Decided to skip it for now rather than build a generic
damage-event hook for it — revisit once there's a pack-owned machine
tier again, or if a mod-agnostic approach becomes worth the complexity.

**Reversed 2026-09-01, live — the pedestal is pre-built, the amulet is
crafted.** Direct request as part of the "last bastion" base redesign
(see "Starting base" above): the shrine belongs to the *original*
structure, not something the player builds — it's part of what this
place was before it fell into disrepair, reinforcing that the amulet
mechanic mattered enough here to be built into the bastion from the
start, not bolted on later. This flips the original design (amulet as
starter gear, pedestal crafted) — the narrative reframes cleanly rather
than breaking: the shrine survived, whatever sat on it didn't. An empty
pedestal at world start is a real hook ("something was supposed to be
here") instead of a dead prop.

- The player **no longer starts with the amulet** — cut from
  `playtest_starter_kit.js`'s starter-gear give entirely, alongside the
  sword/armor.
- **`kubejs:amulet` now has a real crafting recipe**
  (`amulet_pedestal.js`): a hollow gold ring, `minecraft:gold_ingot`
  only (8), matching "Not Just Jewelry"'s revised flavor text ("melt
  what gold you can spare").
- **The pedestal no longer gates progress on being crafted** — the
  base-build script places `kubejs:amulet_pedestal` directly in the
  shrine nook, as part of the Watchpost's `/fill`/`/setblock`
  construction. Its own crafting recipe stays as a fallback/spare.
  Needed zero changes to the interaction logic in `amulet_pedestal.js` —
  confirmed by reading it: the mechanic already tracked state on the
  player, not the block/world, exactly as predicted.
- **Quest book, built**: "Not Just Jewelry" moved from position 2.5
  (gated on quest 2) to 6.5 (gated on quest 6, "Open It"), retasked from
  a checkmark to `Craft kubejs:amulet`. "Leave It Behind" stays at 8.5
  but now depends on both quest 8 *and* the new 6.5, retasked from
  "craft the pedestal" (no longer possible) to a manual checkmark
  against `td_amuletOnPedestal`, same pattern as "The Reckoning."

**Pedestal state**: a `kubejs:amulet_pedestal` block
(`server_scripts/amulet_pedestal.js`). **Shrine visual pass (2026-08-30,
direct request)**: originally a
plain full-cube stone block with one flat texture; rebuilt as a real
custom block model (`assets/kubejs/models/block/amulet_pedestal.json`,
standard vanilla block-model "elements" format) — a wide sandstone base
plus a smaller raised dais on top, a stepped altar silhouette instead
of a cube, with distinct side (carved masonry courses + a gold inlay
band) and top (a glowing gold socket ring) textures instead of one
cube-all texture, tying the block visually to the desert world and the
amulet's own gold/gem palette. When the amulet is placed, the marker
armor stand (below) now visibly holds it via `HandItems` — confirmed
real vanilla behavior, not assumed: a `Marker:1b` armor stand has no
body/hitbox but still renders held items, the standard "floating item"
trick. Placing it accepts the amulet from wherever the player actually
has it (worn or just carried — see "Two more real bugs" above);
right-clicking the occupied pedestal again gives it straight back to
inventory, unequipped, not auto-re-equipped (consistent with the
amulet no longer auto-equipping anywhere in this feature after the
duplication bug that caused).

**Marker alignment fix, real bug found in the first actual playtest
(2026-08-31)**: the original spawn height (a full block above the
pedestal) put the visible item floating a full extra body-height above
the shrine, badly misaligned — an armor stand's held item renders near
hand/shoulder height, not at its feet, so "spawn at the dais surface"
doesn't mean "item appears at the dais surface." Fixed with two
changes: added `Small:1b` (halves the whole model including the
hand-to-feet offset, not just visual size) and dropped the spawn
height to just above the dais rather than a full block up — landing
the now-smaller offset much closer to the dais instead of a full body
above it. Also added the requested gentle float: a throttled
`PlayerEvents.tick` handler re-teleports the marker each tick to its
stored base position plus a small sine-wave Y offset, same
store-state-on-the-player-and-drive-from-a-tick-handler pattern used
throughout this pack, not a new mechanism. **Exact final height is a
reasoned estimate, not pixel-measured** (no GUI access to verify by
eye) — same honest caveat the original y+1 guess needed and didn't
get; correct again on the next playtest if it still reads wrong.

**The float itself was silently dead the whole time, found and fixed
2026-09-02 (commit b7c66a4)** — same investigation that found the wave
system's Math.PI bug (see "Wave Horn" above). The sine-wave offset
computed `Math.sin((2 * Math.PI * currentTick) / BOB_PERIOD_TICKS)`,
and `Math.PI` evaluates to `undefined` in this pack's exact
KubeJS/Rhino build — so this has always resolved to `NaN`, most likely
a silent no-op rather than a visible error, reading as "the marker just
doesn't move" rather than "broken." Fixed by hardcoding the literal PI
value instead of reading the built-in constant. Not yet confirmed by an
actual playtest.

State lives on the **player's**
persistentData, not the block/world — same reasoning as
`base_expansion.js`'s worldborder counter (level/world persistentData
has no save/load hook, player's does), and this pack only ever expects
one pedestal to exist. **Real technical detail, not hand-waved**:
vanilla mobs can only `setTarget()` an entity, not a bare block
position — so placing the amulet spawns an invisible, gravity-less,
`td_amulet_marker`-tagged armor stand (the standard vanilla trick,
summoned via command like the rest of this pack's world-state changes)
at the pedestal, and `mob_aggro.js` now checks `td_amuletOnPedestal`
each throttled tick and points every wave mob's `setTarget()` at that
marker instead of the player while it's set, falling back to the player
if the flag is set but no marker is actually found.

**Border-crossing**: the worldborder already has damage disabled
(`worldborder damage amount 0`, set earlier for the mob-spawn-beyond-
border mechanic) — it isn't actually a hard barrier right now, nothing
currently enforces it. `server_scripts/amulet_border.js` is the
genuinely custom tick handler this needed: checks player position
against `level.getWorldBorder()`'s bounds (the same proven API
`wave_spawner.js` already uses for spawn clamping) and teleports the
player back in if they're outside *and* `td_amuletOnPedestal` is false,
with an edge-triggered chat message so it doesn't spam every throttled
tick. **Deliberately does not implement** the "forced extra wave"
penalty for leaving via the pedestal — that was flagged as "the leading
idea, not confirmed" in the original design, and building it now would
mean guessing at an unresolved point rather than a decided spec.

**Why cross at all**: this is what gives the exploration content
(structure generation, lootable schematics) a reason to matter before
the border naturally grows there — push out early for something worth
finding, at the real cost of losing the worn buffs.

**Build notes (2026-08-30)**: first time this pack has integrated a
third-party accessory-slot system — every API detail above (the
Curios slot-grant mechanism, KubeJS-Curios' real method names/
signatures, `setEquippedCurio`'s existence) was read directly from the
mods' own decompiled/GitHub source rather than guessed, same discipline
as the SecurityCraft/Trapcraft/FTB Quests integrations.

**Three real bugs found via actual playtesting, all fixed** (full
diagnostic detail in `docs/MODS.md` if ever needed again):
1. **Amulet silently unreachable on first login** — Curios has two
   independent gates, not one: a slot-size file (`curios/slots/`) alone
   doesn't make a slot usable by any entity — a separate
   `curios/entities/<id>.json` has to explicitly grant it, which this
   pack hadn't shipped. Fixed by adding one. The give-logic now also
   verifies the equip actually landed (`findFirstCurio`) before trusting
   it, self-healing for any world/player that already hit the bug.
2. **Duplication on login** — the original auto-equip-at-login path
   produced a genuine duplicate (one equipped, one in inventory). Root
   cause never pinned down; fixed by removing auto-equip entirely — the
   amulet now starts unequipped in inventory, so the race can't happen
   either way.
3. **Pedestal rejected a genuinely-carried amulet** — direct consequence
   of fix #2: the pedestal only checked the worn Curios slot. Now also
   checks the player's inventory directly, accepting the amulet from
   wherever it actually is.

---

## Hardcore mode

**Hardcore mode — planned, parked, not built.** Direct request 2026-09-01:
real permadeath stakes — player death or the amulet pedestal being
destroyed both end the run — softened by Totems of Undying as a genuine
"extra life" mechanic, since vanilla's own totem-prevents-death behavior
already does exactly that automatically, no custom tracking needed for
the totem itself.

**Not vanilla Hardcore — confirmed why, not assumed**: checked directly
— Minecraft's native Hardcore flag is a **world-creation-time-only**
setting; there is no command, gamerule, or datapack mechanism to turn it
on for an already-created or future-created world after the fact. This
pack's whole pattern is forcing settings automatically so the player
never has to remember a manual checkbox at world creation (see "Manual
setup" throughout this doc's history) — relying on the real Hardcore
flag would break that pattern and require players to remember an easy-
to-miss checkbox. Building this fully custom via KubeJS event hooks
instead, same approach as everything else in this pack.

**Three real decisions made 2026-09-01, not left open**:
1. **The pedestal stays vulnerable, not hardened.** Direct choice:
   protecting it becomes real, active base defense, not background
   scenery — matches the "last bastion, defend it or lose" tone the
   base redesign was already built around. Not SecurityCraft-reinforced
   like the perimeter walls.
2. **Totems obtainable both ways**: a real, meaningfully rare drop (tied
   to a genuine difficulty spike — killing the ravager or an Undead
   Nights boss-horde spawn is the natural candidate, not a random roll
   on any common loot bag, so it feels earned rather than lucky) *and*
   a real crafting recipe (vanilla has **no** totem recipe at all — this
   needs a genuinely new one, gated behind expensive/rare materials,
   e.g. Rare-tier loot bag contents or a byproduct of the parked
   storage/power system — exact materials are an implementation-level
   pick, not fixed here, same as the original pedestal recipe wasn't).
   Two paths so a run with bad luck on drops still has a path forward.
3. **Optional toggle, not the pack's new default.** Direct reasoning:
   endless-phase scaling makes the game unboundedly harder forever, so
   under permadeath every run eventually ends in death no matter how
   skilled the player is — that's an acceptable, even intended, endgame
   for a player who opts in, but forcing it as the default on every
   playthrough would be a much bigger tonal shift than requested.
   Mechanism for the toggle itself not designed yet — likely a simple
   custom command (`/hardcore enable` or similar) the player runs
   themselves, defaulting off, rather than a GUI/menu (this pack has a
   standing, confirmed-real caution about building custom menus — see
   the still-unbuilt roguelike-composition-choice entry in IDEAS.md).

**What actually needs building, not yet designed in detail**:
- A `td_hardcoreEnabled`-style persistent flag (same pattern as every
  other player-state flag in this pack), set via the toggle command.
- A death-event hook that, when the flag is set and the player's actual
  death wasn't intercepted by a totem (i.e., a real death happened),
  forces permanent spectator mode and freezes further wave-triggering —
  vanilla real Hardcore's own spectator-lock behavior, reimplemented,
  not the flag itself.
- A block-break/explosion detection on the pedestal specifically,
  triggering the same game-over sequence as a real death when hardcore
  is on. Needs checking whether `mobGriefing` (already on, given the
  perimeter walls needed reinforcement specifically because zombies
  dig/creepers explode) can actually destroy the pedestal's particular
  block registration, or whether its blast resistance needs adjusting
  to make "vulnerable" mean something real rather than accidentally
  already-indestructible.
- The totem drop (which kill(s) trigger it, what rarity) and the totem
  recipe (materials) both still need real numbers, not just the
  two-path decision above.
- Not designed for multiplayer — this pack's whole framing (fixed
  single spawn, "You're On Your Own" as the very first quest) is
  singleplayer-specific; what "game over" means if a second player is
  ever in the world isn't considered here.

**Deliberately parked, not sent to build** — same reasoning as the
storage/power system: this is real, ready design, not still being
figured out, just sequenced behind the current playtest-feedback batch
rather than adding another substantial parallel project.

**Pedestal visual upgrade + mob-attack vulnerability — requested
2026-09-04.** The visual-upgrade half shipped 2026-09-05 as part of the
combined "always pedestal-relative" rework above (Supplementaries
retrofit, recentered dais, self-healing marker — see that entry for the
full detail). **The mob-attack-vulnerability half shipped 2026-09-05 too, config-wise
— but its real live behavior is unconfirmed, see the end of that
bullet below, don't report this as a clean win.** Direct follow-up: "the pedestal
block...it looks a bit rubbish. can we leverage a mod that renders cool
pedestals with floating items whilst keeping the entire mechanic of the
pedestal" plus "the pedestal should be vulnerable to mobs attacking it
too, not just an explosion." Two real, separate pieces:
- **Visual: Supplementaries' real Pedestal block.** Researched
  directly, not guessed — CurseForge, author MehVahdJukaar, 221M+
  downloads, real recent Forge 1.20.1 build
  (`supplementaries-1.20-3.1.43-forge.jar`, 2026-04-06). Confirmed its
  Pedestal is real and matches the ask exactly: "can display anything
  you want by right-clicking it while holding the item," plus a real
  bonus vanilla+ synergy (an end crystal on one gives enchanting power
  equal to 3 bookshelves) that's irrelevant here but confirms it's a
  genuine, well-built block, not a stub. **One real dependency**:
  Moonlight Library (MehVahdJukaar's own shared library across several
  of his mods — not currently installed).
  - **Real progress, 2026-09-05**: Supplementaries + Moonlight Library
    installed, hash-verified. Real API confirmed by decompiling, not
    assumed: `supplementaries:pedestal`'s block entity is a real
    Container, slot 0 readable/writable directly via
    `level.getBlockEntity([x,y,z]).getDisplayedItem()`/
    `.setDisplayedItem(...)` from KubeJS (confirmed live), any item is
    accepted (no type filter, confirmed from the mod's own
    `canPlaceItem` bytecode), and a real BlockEntity exists in the
    normal placed state. The actual `amulet_pedestal.js` retrofit using
    this API is what's still outstanding.
  - **Integration updated by the "always pedestal-relative"
    supersession above — read that entry first.** Retire the custom
    marker/bob system entirely (the code the Math.PI bug lived in), same
    as originally planned, but the *reason* changed: this pack's own
    `td_amuletOnPedestal` state no longer drives aggro/spawn/forceload/
    wave-clear at all (those are unconditional now) — it only still
    gates border-crossing. So the retrofit is: place a Supplementaries
    Pedestal at the shrine; drive `td_amuletOnPedestal` (for
    border-crossing purposes only) off `getDisplayedItem() ==
    kubejs:amulet`; and separately, summon the permanent
    `td_pedestal_target` marker armor stand from the supersession entry
    above at world-build time, unconditionally, needing nothing from
    Supplementaries' own item slot at all — Supplementaries' block
    handles the floating-item visual on its own whenever something's in
    it, the marker is purely a targeting anchor now, not a visual one.
  - **Real open items for the build session, not pinned down here**:
    supporting this pack's own "place it programmatically at first
    login" flows, if that's still wanted, via `setDisplayedItem()`; and
    verifying Moonlight Library doesn't collide with anything already
    installed.
- **Mob-attack vulnerability: real current Epic Siege Mod config
  checked directly, not assumed** — and it corrects something this doc
  got wrong in the pedestal-destruction spec above. `demolitionMobs`
  (zombies dropping live TNT) is currently **empty (`[]`)** in this
  pack's own tracked config, not the mod's raw default —
  the earlier claim that "zombies already drop live TNT by default,
  confirmed installed" was **inaccurate**, this pack had already
  disabled it at some point after the original 2026-08-29 diagnosis.
  The pedestal's real vulnerability to explosion (confirmed 2026-09-04
  via an actual live TNT test) still stands — that was tested with
  manually-placed TNT, not mob-dropped — but "mobs already threaten it
  today" needs a fresh, honest look, not the old claim repeated.
  - **Shipped 2026-09-05**: both real pedestal block ids
    (`kubejs:amulet_pedestal` and `supplementaries:pedestal`, same
    backward-compat pairing as the rest of the pedestal rework) added to
    `blockTargets`. `targetingMobs` widened from just `minecraft:zombie`
    to this pack's full wave roster (`mob_aggro.js`'s `WAVE_MOB_TYPES`)
    — a deliberate call that a base-under-siege premise should let the
    whole roster threaten it, not just zombies.
  - **`griefing = false` question resolved by decompiling the mod's own
    AI goal, not guessed**: `blockTargeting`'s destroy behavior is
    gated by the real **vanilla `mobGriefing` gamerule** (via a Forge
    event), not by ESM's own `griefing` config toggle — two separate
    systems. This pack's `mobGriefing` is confirmed `true`, so that gate
    is open. Also found a real, non-obvious requirement along the way:
    the target block needs 2 full air blocks directly above it to be
    eligible at all.
  - **Real live test came back inconclusive, not a confirmation —
    flag honestly.** A zombie left adjacent to a pedestal in a sealed
    test pen (satisfying the air-above requirement) for 60+ seconds
    never destroyed it. To isolate whether that was this pack's config,
    the same test was run against a plain vanilla candle — the mod's
    own pre-existing default target, untouched by anything changed
    here — and it was never destroyed either. That rules out this
    specific config as the cause, and points at the whole
    destroy-mechanism possibly not firing in this environment at all
    (could be a goal-priority interaction with vanilla AI, could be
    something else — not chased further, diminishing returns). Shipped
    as correct per the real decompiled logic (harmless either way), but
    **not confirmed working** — needs a real player checking whether
    mobs actually chip away at anything in `blockTargets` during normal
    play; if they don't, that's a real, separate bug to open, not
    assumed fixed because the config reads correctly.
  - **`diggerMobs` question still fully open, not reached** — whether
    wave mobs already partially bite through obstacles via that
    separate mechanism, independent of `blockTargets` entirely.
  - **Possible real explanation for the inconclusive test, found
    2026-09-05 while fixing the mob-pathing regression below**: ESM
    stacks six of its own `ESM_EntityAINearestAttackableTarget` goals in
    every wave mob's target selector, and the test zombie almost
    certainly kept re-acquiring the player (or nothing reachable) as its
    living target instead of ever falling back to block-targeting.
    `mob_aggro.js`'s fix (stripping the target selector) should let
    `ESM_EntityTargetBlock` get a real chance to fire once mobs reliably
    camp at a fixed point instead — not claimed as fixed here, genuinely
    unconfirmed, but worth checking on the next playtest rather than
    re-diagnosing from scratch.
- **Built, deployed, and committed (f49f947) 2026-09-05.**

**Second fresh-world playtest batch — reported 2026-09-06, 4 items,
held, not sent.** Real feedback from actually playing the fresh world
built by the roster pivot + first playtest batch's fixes.

1. **Dais ditched — replace with pedestal at ground level.** Direct
   feedback: "the raised dais is just not looking great, ditch this and
   just have the pedestal placed in the yard." This is the *second*
   real rejection of the pedestal's presentation (square sandstone
   shrine → circular dark-stone altar → now this) — don't propose a
   third elaborate build without being asked. Scope: remove the 3-ring
   octagon build from `playtest_starter_kit.js` entirely (added in the
   "Circular altar dais" entry above), place the Supplementaries
   pedestal directly on the courtyard's existing ground level at the
   same centered plan-position, no platform/plinth/rings. Grave arc and
   everything else stays wherever the circular-dais rework last put it
   unless it specifically depended on the platform's footprint.
   - **Shipped 2026-09-06**: the whole 3-ring octagon build (rings,
     moss edge, plinth) removed from `playtest_starter_kit.js`;
     `supplementaries:pedestal` now placed directly at `wallY0` at the
     same `centerX`/`centerZ`, `td_pedestalY` back to `wallY0` (no more
     `+4` plinth offset), marker armor stand back to `wallY0+1`. Grave
     arc left exactly where the circular-altar rework put it, per the
     spec's own instruction — its old footprint reasoning is now stale
     but the position itself doesn't overlap anything. `setblock
     supplementaries:pedestal` and the marker summon both confirmed live
     in a sandbox; the full login-triggered build itself is unconfirmed
     in-game, same standing blind spot as every other spawn-time build
     in this pack (no real player can join the test sandbox).
2. **Pedestal needs real, working "health," not block-targeting.**
   Direct ask: "is there a way to give it health like a player and this
   is how the mobs destroy it." Real context the build session should
   read first: Epic Siege Mod's `blockTargets` config was already
   verified correct by decompile (see "Mob-attack vulnerability" above)
   and even the mob-pathing fix's own hypothesis that it'd start working
   once mobs stopped re-acquiring the player didn't pan out — this
   report confirms it's still not damaging the pedestal. **Stop trying
   to make ESM's block-targeting work — build a deterministic system
   instead**, same spirit as this pack's own custom pedestal-destruction
   tick-poll (`pedestal_destruction.js`) rather than relying on another
   mod's opaque AI a second time:
   - A real stored `td_pedestalHealth` value (persistent data, same
     pattern as `td_pedestalX/Y/Z`), full at world-build time.
   - A tick check (throttled, same pattern as `mob_aggro.js`) for wave
     mobs within real melee range of the pedestal position — every
     wave mob already targets it unconditionally, so "in range" is
     sufficient, no need to check what they're currently swinging at.
   - Damage per hit scaled off the attacking mob's own real
     `attack_damage` attribute (already read/set for several mobs in
     `wave_spawner.js`'s summon NBT) — tougher mobs should chip through
     faster, matching the escalating-horde theme, not a flat number.
   - At 0 health, call the exact same destruction path
     `pedestal_destruction.js` already uses for explosion-based
     destruction (the permanent `td_pedestalDestroyed` flag + game-over
     sequence) — one outcome, two ways to reach it.
   - Real open numbers, first pass: total pool and damage-per-hit aren't
     picked here — size it so a single mob can't solo it in a few
     seconds, but a real, un-defended horde genuinely can, matching "if
     im not in the base to defend it then i lose the game." Needs a
     real playtest to tune, same as every other numeric first-pass in
     this pack.
   - Leave the ESM `blockTargets` config in place (harmless either way,
     already shipped) — this is an addition, not a rip-out.
   - **Shipped 2026-09-06** as a new `pedestal_health.js`: real
     `td_pedestalHealth` (200, first pass) set once in
     `playtest_starter_kit.js` alongside `td_pedestalX/Y/Z`; a
     once-per-second tick check sums `generic.attack_damage` off every
     `WAVE_MOB_TYPES` mob within 3 blocks of the pedestal, subtracts it,
     and at 0 breaks the actual block (`setblock ... air destroy`) before
     calling the same `triggerPedestalDestroyed()` game-over sequence
     `pedestal_destruction.js`'s own block-gone check uses — factored
     that function out of `pedestal_destruction.js` for exactly this
     reuse. Two genuinely new mechanics, both confirmed live in a
     sandbox before shipping, not assumed: `mob.getAttribute('minecraft:
     generic.attack_damage').getValue()` returned a real value (3, a
     vanilla zombie's actual base damage) off a summoned zombie, and a
     top-level function declared in `pedestal_destruction.js` resolved
     as a real callable function (`typeof === 'function'`) from a
     different file's script — this pack's own long-standing belief that
     "server_scripts don't reliably share top-level scope" turns out to
     only ever have been tested for plain values, not function
     declarations specifically; this is the first real, deliberate
     reliance on cross-file function sharing, tested first rather than
     assumed. The full melee-range-plus-damage loop was also exercised
     end to end against a real nearby zombie (in range: contributed 3
     damage; a second zombie 50 blocks away: correctly contributed 0).
     What's still unconfirmed: the actual `PlayerEvents.tick` wiring and
     `persistentData` read/write cycle, same standing blind spot as
     every other player-triggered flow in this pack (no real player can
     join the test sandbox) — and the 200/attribute-scaled numbers
     themselves are an explicit first pass, not tuned by a real fight
     yet.
3. **Spawn point lands in plains — thematically wrong.** Direct
   feedback: "it spawned me in a plains biome...this doesnt fit the
   theme." Real, not cosmetic: this pack's own aesthetic direction is
   "abandoned/post-apocalyptic" (confirmed decision behind the
   structure-mod aesthetic swap), and plains/sunflower_plains/meadow are
   the odd ones out in the current curated 7-biome set (desert,
   badlands, savanna, savanna_plateau, plains, sunflower_plains,
   meadow) — genuinely too lush/green for the theme at the one tile that
   matters most, the actual spawn point. Same technique as the earlier
   badlands-blob and "just sand" investigations: run a real biome census
   from the current fixed spawn point (780, -150) and relocate spawn to
   a real desert/badlands/savanna tile nearby — **not** a change to the
   biome set itself (variety elsewhere in the world is still wanted,
   just not landing the player in the wrong one on login). If no
   desert/badlands/savanna tile exists within a reasonable distance of
   the current point, that's a real finding to report back, not a
   reason to silently pick a worse spot.
4. **Press/Rolling Mill: real placement fact from the user, not a
   hypothesis to test.** Direct bug report: "the press and depot hasnt
   got a space in the middle which it needs to function," followed by
   the actual fix once the build session started investigating instead
   of just applying it: "why is the build so obsessed with getting the
   press to work! it works, just place it two blocks above the depot.
   done." **The real, exact requirement: Depot on the floor, Mechanical
   Press exactly 2 blocks above it** (1 block of clear air between them
   for the item to drop through) — not a kinetic-network question, not
   something to root-cause via git history or live hypothesis testing,
   a plain placement fact. This also resolves the separate, previously
   still-open "Mechanical Press never auto-fired in testing" item (see
   "Barbed Wire replaces Spikes" below) — same missing clearance, one
   fix for both. No investigation needed, just fix the block positions
   and verify it fires.
   - **Shipped and live-verified 2026-09-06**: rebuilt with Depot at
     `wallY0`, Press at `wallY0+2` (1 block of clear air between), Mill
     left physically separate, not connected to either. Verified for
     real before committing: fed an iron ingot into the Depot via
     hopper, Press showed `Finished:1b`/`Mode:1` after a few seconds and
     the Depot's held item actually converted `minecraft:iron_ingot` →
     `create:iron_sheet`. Control check at the old 1-block spacing never
     engaged after 20+ seconds under the same setup — confirms this was
     the whole bug, not just a plausible fix. This also closes the
     separate, previously still-open "Press never auto-fires" item from
     the Barbed Wire work below — same root cause, one fix.

3 of 4 items in this batch are done (dais, pedestal HP, Press/Depot
spacing — all shipped and at least partly live-verified 2026-09-06).
Item 3 (spawn-biome relocation) is blocked on a real user decision, not
a build task right now — see the spawn-biome real-distance finding
below, a genuinely bigger decision than "move to a nearby tile."

**Real finding on item 3 (spawn biome), 2026-09-06 — needs a real user
decision, not a silent fix.** Peer caught its own sandbox was pinned to
a stale seed and re-ran the census on the live save's actual seed
(`1803464458889621616`) from the real live spawn point (`787,-147`,
`spreadplayers`' own small wander off the nominal `780,-150`) — confirms
the bug exactly, plains at 0 blocks. But the nearest thematically-fitting
biome isn't close: **savanna at 520 blocks**, desert 1402, badlands
1063, savanna_plateau 1704. A 520-block spawn relocation is a much
bigger move than originally scoped ("a nearby tile") — and since the
base compound, worldborder centering, and the whole "last bastion"
build all derive from this single fixed coordinate (established in the
original spawn-relocation work), moving spawn 520 blocks effectively
relocates the entire base, not just where the player wakes up. **Real
options, not decided here**:
- Relocate spawn the full 520 blocks to the real savanna tile — biggest
  disruption, cleanest thematic fit, exactly what was asked for if
  "doesn't fit the theme" is the priority.
- Re-run the spawn-selection process from scratch (same technique as
  the original badlands-avoidance relocation) optimizing directly for
  "lands in desert/badlands/savanna," rather than assuming the current
  `(780,-150)` point plus a nearby correction — the current point was
  chosen to avoid one bad biome, never actually optimized to land in a
  good one, so a fresh search in a different direction might do much
  better than 520 blocks.
- Leave spawn where it is and accept the plains tile, focusing theme
  fit on decoration/structure density near spawn instead of the raw
  biome underneath it.
- Retune the `multi_noise` climate parameters near this specific point
  so it resolves to a different biome without moving spawn at all —
  real risk: this pack has a documented crash history around
  `multi_noise`/`noise_router` edits, not a change to make lightly for
  a small subjective improvement.

**Decided via AskUserQuestion 2026-09-06: relocate the full 520 blocks**
to the real savanna tile — biggest disruption of the 4 options, but the
cleanest thematic fit, and matches the original ask directly. This
moves the base compound/worldborder centering along with it, same as
every other spawn-coordinate change this pack has made. Sent to build.

**Shipped 2026-09-06.** `spreadplayers` target in
`playtest_starter_kit.js` moved from `780,-150` to `1171,-499` (the
exact savanna tile `/locate biome` found); `structure_loot_progression.js`'s
own `SPAWN_X`/`SPAWN_Z` (used for the distance-gated chest loot bonus)
moved to match, same "kept in sync" pattern as every other duplicated
constant in this pack. Everything else (worldworld spawn, worldborder
center, the whole base build) still derives from the x/y/z read back
right after the `spreadplayers` call, unchanged mechanism from the
2026-09-01 move - only the target coordinate changed. Re-verified the
target on the live save's real seed right before shipping (same
`1803464458889621616`, not the earlier stale sandbox seed): confirmed
savanna at 0 blocks from `(1171,-499)` and at every point sampled in an
8-block radius around it (not a knife-edge sliver at a biome boundary),
and real terrain across the planned base footprint (roughly 20×23
blocks around the point) is flat within ~2.5 blocks everywhere sampled
- safe to build the fixed-Y compound on, same as the terrain check this
pack's spawn-relocation work has done every time. The actual
login-triggered base build at the new coordinate is unconfirmed in-game
- same standing blind spot as every other spawn-time build in this
pack (no real player can join the test sandbox).

**Mob pathing regression — "mobs aren't pathing toward the pedestal at
all" — found and fixed 2026-09-05, first fresh-world playtest of the
above.** Real feedback contradicting the "unconditional targeting" work
in commit a9e6c1a. Diagnosed live, not guessed:
- **The permanent marker genuinely existed** — confirmed by parsing the
  actual live save's player NBT (`td_pedestalX/Y/Z` set to real
  coordinates) and its entity region file directly (the marker armor
  stand was found in the correct chunk, correctly tagged
  `td_pedestal_target`, correct Marker/Invisible/NoGravity flags). A
  real wave zombie was also found in the same save sitting 3.6 blocks
  from the player and 13.9 blocks from the pedestal — direct evidence
  the mob converged on the player, not the objective, matching the
  report exactly.
- **Real root cause, found via direct Java reflection against a live
  sandbox (not a guess)**: Epic Siege Mod entirely replaces vanilla's
  own target-acquisition AI. A freshly spawned zombie's real target
  selector (found by walking `Mob`'s two protected `GoalSelector`
  fields via `Field#setAccessible(true)` — no public getter exists for
  either in this build, confirmed by a full reflection scan of all 790
  public methods on a live `Zombie` finding zero matches) held vanilla
  `HurtByTargetGoal` plus **six** stacked
  `funwayguy.epicsiegemod.ai.ESM_EntityAINearestAttackableTarget`
  instances — no vanilla `NearestAttackableTargetGoal<Player>` even
  present anymore, ESM fully replaced it. This out-competed
  `mob_aggro.js`'s 10-tick-throttled `setTarget()` force almost every
  time once a mob had ever seen or been hit by the player — explains
  "not at all," not "sometimes," since ESM is deliberately more
  aggressive/responsive than vanilla, not less. Compounded (not caused)
  by this pack's own `generic.follow_range=128` override in
  `wave_spawner.js`'s summon NBT, which also widens ESM's own
  player-seeking radius, not just this script's own pursuit range.
- **The fix**: `mob_aggro.js` now physically removes every goal from
  each wave mob's target selector — identified by content (does it
  contain a real `TargetGoal` instance?), not by field order, since
  reflection doesn't guarantee declaration order — exactly once per mob,
  via `GoalSelector#removeGoal(Goal)` called once per goal object
  (`removeAllGoals(Predicate)` was tried first and rejected: manually
  invoking a reflected `Method` doesn't get Rhino's usual
  JS-function-to-functional-interface coercion, since that only applies
  on normal dot-syntax calls where Rhino knows the target parameter type
  up front — threw a real "argument type mismatch" when tried).
  The goal selector (actual attack/wander/dig/pillar/block-target
  behavior, including ESM's own obstacle-breaching goals) is completely
  untouched. Also worth noting for future reflection-based scripts in
  this pack: the `java.*`/`Packages.*` global shorthand for referencing
  a class by name is disabled in this exact KubeJS build ("`java()` is
  no longer supported", KJS6) — class lookups go through
  `mob.getClass().getClass()` (always `java.lang.Class`) to reach
  `Class.forName(String)` by reflection instead.
- **Verified end to end in a sandbox before shipping**: stripped a fresh
  zombie's target selector down to 0 goals (from 7), force-set its
  target to a stand-in entity via the exact same clean-name
  `setTarget()` call already used in production, and confirmed 4 real
  seconds (80 ticks) later the target was unchanged — and that the mob
  had genuinely pathed 9 blocks toward the stand-in in that time using
  its own still-intact attack-goal AI, proving combat/pathing survive
  the strip.
- **Real, honest limit on this verification**: this pack's sandbox
  cannot get a real player through this modset's FML handshake
  (established blind spot — mineflayer never completes it), so the
  exact `PlayerEvents.tick` wiring this fix lives in couldn't be
  exercised end-to-end, only the underlying reflection mechanism it
  calls. The full mod set was confirmed to boot clean (0 KubeJS script
  errors) with the fixed file in place. Still needs a real playtest to
  fully close the loop, same as everything else in this pack shipped
  without a live player available.

**That playtest happened 2026-09-04, and the fix didn't hold - real
root cause found and fixed the same day, two distinct bugs, not one.**
Direct report: mobs still not pathing to the pedestal reliably, plus a
real player death in the live save. Live log showed 54 confirmed
`stripAutoRetargeting failed: TypeError: Cannot call method "getName"
of undefined` errors - contradicting the "verified end to end" note
above.
1. **ESM's own selector split, missed by the old content-based
   selector-level check.** A faithful sandbox repro (real summoned
   zombie/mutant_zombie, step-by-step tracing) found ESM splits its
   `ESM_EntityAINearestAttackableTarget` goals across BOTH of a mob's
   `GoalSelector`-typed fields, not just the "real" target selector -
   one field held 13 goals (attack/wander/dig/pillar behavior) mixed
   with 2 stray re-targeting goals AND `ESM_EntityTargetBlock`; none of
   those 13 are real vanilla `TargetGoal` instances, so the old
   "does this selector contain any TargetGoal" gate correctly found
   nothing and skipped the WHOLE field, silently leaving those 2
   goals live. The other field (holding vanilla `HurtByTargetGoal` +
   5-6 more) DID get correctly identified and stripped - so roughly a
   quarter of each mob's own re-targeting AI survived every
   "successful" strip, 100% reproducibly. Fixed by checking every
   goal's real identity individually (real `TargetGoal` instance OR
   literally `ESM_EntityAINearestAttackableTarget`) instead of gating
   a whole selector by content-sniffing - `ESM_EntityTargetBlock` is
   deliberately excluded from both checks, it has to keep running for
   the pedestal-vulnerability feature above.
2. **The real cause of the 54 live errors: a genuine cross-file
   function-name collision, not a one-off.** `mob_aggro.js` and
   `playtest_starter_kit.js` each independently declared their own
   top-level `findMethodByShape`/`resolveClass` (the established
   "redeclare per file, server_scripts don't reliably share top-level
   var/const" convention) - but that convention only covers half the
   real rule: top-level FUNCTIONS in this exact KubeJS/Rhino build DO
   reliably share across files, so the two same-named-but-differently-
   shaped functions were silently colliding in one shared global slot.
   `playtest_starter_kit.js`'s version takes an ARRAY 4th parameter
   (added later, for its structure-proximity work); `mob_aggro.js`'s
   takes a plain STRING. Whichever file loaded last won the shared
   slot - when `mob_aggro.js`'s own call lost that race, a JS string
   got iterated character-by-character as if it were an array, indexing
   past the real params array and calling `.getName()` on `undefined` -
   a real, reproduced match for the live error. This is very likely why
   the fix above never held up despite passing its own sandbox
   verification - that verification predated `playtest_starter_kit.js`
   gaining the colliding names. Fixed by prefixing `mob_aggro.js`'s own
   copies (`aggroFindFieldsByType`/`aggroFindMethodByShape`/
   `aggroResolveClass`) so they can't collide with any other file's,
   regardless of load order. **Verified live, both fixes together**:
   summoned a real zombie, `mutantszombies:mutant_zombie`, and
   `undeadnights:elite_zombie` in a sandbox, called the real (fixed)
   `stripAutoRetargeting()` directly, and confirmed for all three -
   every `ESM_EntityAINearestAttackableTarget` gone from both selector
   fields, `ESM_EntityTargetBlock` and every real attack/movement goal
   still present untouched, zero exceptions thrown.

**Pedestal destruction = game over — requested 2026-09-04, built and
deployed 2026-09-04 (commit ce75d1f).** Direct request, explicitly narrower than the parked Hardcore
mode spec above: "start build on the 'if the pedestal is destroyed you
lose' mechanic" — but "keep the player death not a game over state for
now as its easier for playtesting." Picks up exactly one piece of the
parked design (decision #1 above: the pedestal stays vulnerable) as a
real, **always-on** mechanic, not gated behind a toggle. The
player-death permadeath half, Totem softening, and the hardcore toggle
itself all **stay parked, untouched** — this doesn't replace that spec,
it's a separate, narrower, immediate pickup of one piece of it.
- **Real threat cited here turned out to be inaccurate — corrected
  2026-09-04, see "Pedestal visual upgrade + mob-attack vulnerability"
  below.** This entry originally claimed Epic Siege Mod's
  `demolitionMobs` config already gave zombies live TNT-dropping
  capability by default. Checked directly against this pack's own
  tracked config while researching the mob-attack-vulnerability
  follow-up: `demolitionMobs` is actually **empty** in
  `epicsiegemod-common.toml` — disabled at some point after the
  2026-08-29 diagnosis that first found it, not left at the mod's raw
  default. The pedestal's real vulnerability to explosion is still
  confirmed (tested with manually-placed TNT below, not mob-dropped),
  but "mobs already threaten it today via demolitionMobs" was wrong and
  shouldn't be repeated.
- **What actually needs building**:
  1. Track the pedestal's real placement coordinate — currently **not**
     stored anywhere reliable independent of the amulet being on it
     (only the marker's base position is stored, and only while the
     amulet is placed). Needs its own persistentData entry, set once at
     world-build time in `playtest_starter_kit.js`, at the exact
     coordinate the pedestal is placed.
  2. Detection: a periodic tick check (this codebase's proven, dominant
     pattern — `wave_status.js`, `mob_aggro.js`, the pedestal's own bob
     effect) verifying the block at that stored coordinate is still
     `kubejs:amulet_pedestal`. Method-agnostic on purpose — catches
     destruction by explosion, mining, fire, or anything else, rather
     than needing to hook every possible destroy-event type
     individually.
  3. **Real open technical question — resolved with a real test, not
     just a guess.** Grepped the whole pack: `mobGriefing` is never
     touched anywhere, so it's still vanilla default (`true`); the
     pedestal's own block definition sets resistance 6.0 (the same as
     plain stone, not hardened). Then actually detonated TNT against a
     placed pedestal in the sandbox — it was destroyed outright,
     confirmed via a live block-id readback. **No config change
     needed — the pedestal is genuinely vulnerable as shipped.**
  4. **Loss state — shipped exactly as designed**: a permanent
     `td_gameOver` flag; blocks all further Wave Horn use (checked at
     the top of `useWaveHorn()`), cancels any active countdown; a
     dramatic on-screen title + chat narrative matching this pack's
     established tone. Player death stays completely unaffected — no
     totem softening, no spectator lock, no hardcore toggle involved at
     all. The world stays fully open and playable after a loss; only
     the wave campaign itself ends. Night-lock/daylight-cycle-disable
     gets undone too if a wave was active when the pedestal fell.
  Built via a tick-poll against the stored coordinate, not event hooks —
  same detection technique proposed above, confirmed as the real
  implementation choice, not swapped for something else.
- **Not designed for multiplayer** — same framing as the parked spec
  above: this pack's whole design (fixed single spawn, "You're On Your
  Own" as the first quest) is singleplayer-specific.
- **Not yet confirmed by an actual playtest.**

---

## Mob roster & defense-breaching threats

**Roster direction — confirmed, then extended.** Direct check-in
2026-09-01: the "zombie apocalypse as the base, mutated enemies for
variety" framing is exactly what's already built — vanilla zombie-
family mobs as the trash floor, TFTH's Flesh-themed mutants layered in
from wave 2 for variety, endless-phase elite pool drawing from the same
set. Recorded as a validated design decision. Extended the same day
with a real new roster addition — see below.

**More zombie-family variety — planned, parked, not built.**
Researched candidates for more zombie-esque mobs with distinct
abilities, same "mutated enemies" framing, not a departure from it:
- **Mutant Monsters** (the well-known, 46.8M-download option) —
  checked directly, **ruled out**: no Forge 1.20.1 build exists at all,
  current releases only target Fabric/NeoForge/1.21.x, despite an
  outdated-looking file title suggesting otherwise in search results.
- **Mutants and Zombies** (CurseForge, author **MCModsPete**, confirmed
  Forge 1.20.1 v1.4.0) — the real pick. Same author as **Undead
  Nights**, already deeply trusted in this pack (decompiled twice) —
  its own description explicitly states it's designed to pair with
  Undead Nights ("A separate mod by the same author, Undead Nights,
  handles horde night functionality"), and confirmed to add **no
  autonomous wave/horde/spawn systems of its own**, just real mob
  content — passes the standing "check for autonomous world-altering
  systems before adding any mob mod" caution cleanly. 8 distinct
  zombie-family mobs, real ability variety, not just reskins: Zombie
  Brute / Mutant Brute (tanks), Crawler (fast, climbs walls — needs one
  clean dependency, **Advanced Wall Climber API**, confirmed real
  Forge 1.20.1 v1.0.2, 375K+ downloads, small focused library, low
  risk), Spitter (ranged, slimeballs), Blister Zombie / Split Head
  Zombie (speed/strength variants), Rotten Mutant (tanky, slow), Mutant
  Zombie (mild upgrade). Stays fully within "zombie apocalypse as the
  base" — mutations of the same zombie family already in the roster,
  not generic mutant-animal content the way Mutant Monsters would have
  been.
- **Deliberately not stacking a second zombie-variety mod on top** —
  a cluster of "Zombie Apocalypse"-branded mods was also found
  (ZombieApocalypseAddon, ZAo Zombie Apocalypse, Infectious - Zombie
  Apocalypse) but not pursued: ZombieApocalypseAddon specifically adds
  its own hordes/blood-moons/day-based-difficulty, the exact
  autonomous-system-conflict risk this pack has a standing caution
  about. Mutants and Zombies alone already adds substantial real
  variety on top of what's in the roster now (TFTH's mutants, the
  parked Demolition Zombie) — redundant/conflicting footprint not worth
  it for more of the same thing.
- **Not yet designed**: which waves/hordes these 8 new mobs actually
  join (the designed 1-8 campaign, the endless-phase elite/trash pools,
  or both), and whether any need re-recipied loot/stat adjustments the
  way TFTH mobs did. Purely a "the mod is real and verified" spec so
  far, not a wave-composition design.

**Defense-breaching enemies — planned, parked, not built.** Direct
request: as waves escalate, mobs should be able to genuinely threaten
base defenses (blocks), not just the player — trap/machine placement
should be real strategy, not just decoration.

**Checked whether SecurityCraft's reinforced walls could ever be the
thing that breaks, before designing around a wrong assumption**:
confirmed reinforced blocks are **unconditionally immune to
explosions** — a hardcoded SecurityCraft property, not a tunable
resistance or a tiered value (the mod's 4 reinforcer tiers govern how
hard a block is to *un-reinforce* by another player, not how much
attack it can survive). Breakable only by the owner's own Universal
Block Remover. So the Chokepoint perimeter walls specifically **cannot
ever be the breach point**, at any wave/difficulty — this isn't a gap
to work around, it's the mod doing exactly what it was chosen for.

**Real candidate found, already installed, currently entirely
unused**: Undead Nights' own **Demolition Zombie**
(`net.petemc.undeadnights.entity.DemolitionZombieEntity`) — decompiled
directly, not assumed from the name. A fully-built wall-breaching
threat: carries live TNT and actively throws it at targets
(`TntIgniteAndThrowGoal`), and if set on fire, self-detonates with a
real terrain-destroying explosion (`Level.explode(..., ExplosionInteraction.TNT)`,
not just entity damage). Its health/speed/damage/armor already scale
off the exact same Undead Nights difficulty-level system already
driving the endless-phase toughness curve — introducing it costs zero
new scaling code, it inherits the existing curve automatically. None of
Undead Nights' bundled zombie variants were used in the original
endless-phase build (a deliberate choice at the time, not an oversight)
— this is a considered, specific exception, not a reversal of that
decision, since it fills a real design need nothing else in the roster
does.

**What it actually threatens, now that the walls are confirmed safe**:
the gate (`playtest_starter_kit.js` still builds it as a plain vanilla
door, never reinforced), the watchtower (plain cobblestone, no
reinforcement), and any placed Tier 1-4 traps/machines (Trapcraft,
Medieval Defense Turrets, the parked storage/power blocks) — none of
these carry any explosion protection. This is a better design than
"walls eventually break," not a consolation: the perimeter stays a
safe, permanent reward for the early build effort, while the gate and
machine placement become real, ongoing risk once this threat starts
appearing — genuine "where do I put my expensive stuff, do I actively
defend the gate" strategy, not just an eventual, undifferentiated loss
condition.

**Real emergent interaction, noted not treated as a bug**: Tier 2's
Fire Trap (Trapcraft's Igniter) would set a Demolition Zombie alight on
contact, triggering its self-detonation — using fire-based defenses
against this specific enemy becomes a genuine double-edged tactical
choice (kills it fast, but at the cost of a real explosion going off
at your trap line), not something to patch around.

**Open questions, not decided here**:
- **Decided 2026-09-01: reinforce the gate too.** The plain-door choice
  was made before there was any real threat to it ("unnecessary
  complexity" for a decorative chokepoint) — now that the Demolition
  Zombie makes it a genuine target, that's an accidental weak point, not
  an intentional one worth keeping. Needs picking a real SecurityCraft
  door variant (a reinforced door exists per the mod's own block set,
  exact one not chosen here) and updating `playtest_starter_kit.js`'s
  base-build script alongside the wall material already in place.
- Introduction point: a late designed-campaign wave (6-8, as a real
  "the fight has changed" story beat) versus folding it into the
  endless-phase horde composition's elite pool (recurs and scales
  forever) versus both — not picked yet.
- Exact numbers: how much TNT it carries in this pack specifically
  (Undead Nights supports 0-64, configurable per spawn), spawn
  weight/frequency, and whether it needs its own horde entry or joins
  an existing elite-pool horde.

**Deliberately parked, not sent to build** — same reasoning as
everything else parked today: real, ready design, sequenced behind the
current playtest-feedback batch rather than adding another parallel
project.

**Full zombie-apocalypse roster pivot — specced 2026-09-06, supersedes
"More zombie-family variety" above and resolves its open questions,
held, not sent to build.** Direct request: "I want to strip out the
other mob types [and] speck out all the zombie type mobs we have
available... maybe there are other cool zombie mobs in other mods...
I want the waves to feel like you are being attacked by larger and
larger hordes, till eventually it feels epic in scale." Confirmed via
AskUserQuestion: strip non-zombie mobs completely (no rare exception),
and install Mutants and Zombies now rather than holding off.

**Audit: what's zombie-family vs. not, across every real mob source in
this pack** (`wave_spawner.js`'s `WAVES`/`WAVE_MOB_TYPES`,
`loot_bag_drops.js`'s 4 tier arrays,
`undeadnights_horde_mobs_config.json`'s 4 named hordes):
- **Strip entirely**: `minecraft:skeleton`, `minecraft:spider`,
  `minecraft:wither_skeleton`, `minecraft:ravager`, and
  `minecraft:creeper` (only in `loot_bag_drops.js`'s Uncommon
  catch-all, not in any wave — same non-zombie problem, caught in this
  audit, not previously flagged).
- **Keep — TFTH is already a zombie-apocalypse mod, not a separate
  monster mod.** Checked its real config (`TFTH.toml`), not assumed:
  every "Flesh X" entity is an infected/corrupted vanilla creature
  (Flesh Villager from Villager, Flesh Dog from Wolf, Flesh Cow from
  Cow, etc.), with a real Germ → Awareness stage escalation already
  built into the mod itself. It's a full infection-zombie mod under a
  different name, not a stylistic mismatch to work around.

**New material found, not previously used anywhere in this pack** —
real headroom for "larger and larger hordes" without inventing content
from scratch:
- **Vanilla zombie-family, never used in any wave**: `minecraft:husk`,
  `minecraft:drowned`, `minecraft:zombie_villager`,
  `minecraft:zombified_piglin`. Zero cost, zero new mods.
- **TFTH's own unused roster** (confirmed directly from `TFTH.toml`'s
  `["MOB TYPES"]` and `["MOB SETTINGS"]` sections) is much bigger than
  what's live. Germ stage (weaker, early-game): Flesh Dog, Flesh Cow,
  Flesh Sheep, Flesh Pig, Flesh Vindicator, Flesh Pillager, Flesh Mutant
  (`plaquecreatureone`), Flesh Infector (`plaquecontaminator`). Awareness
  stage (tougher): Flesh Howler — previously excluded for a real,
  still-valid technical reason (`CallForHelpGoal`, an unconfirmed
  "summons more mobs" risk that breaks the deterministic 1-8 campaign's
  exact mob count) — proposal below uses it in the endless-phase horde
  config only, where mob count is never exact anyway, not in `WAVES`.
  **Real find**: `Flesh Unseen` (MaxHealth 100/AttackDamage 14/Armor
  10) — tougher than anything currently in the roster including Flesh
  Hysterizer, sitting fully configured and completely unused (not in
  either stage's mob list, spawned only via its own special mechanics
  in the base mod) — a real finale-tier candidate.
- **Undead Nights' own 3 zombie variants, already installed, never
  used** — decompiled directly (`net/petemc/undeadnights/entity/*.class`
  in the live jar), not assumed: `undeadnights:horde_zombie`,
  `undeadnights:elite_zombie` (slower but hits harder than Horde Zombie
  — real distinct stat block, confirmed from bytecode, not guessed),
  and the already-known `undeadnights:demolition_zombie`. All three
  read their core stats live from Undead Nights' own difficulty-level
  system — same mechanism already driving the endless phase — so using
  them costs zero new scaling code. **Real confirmation the mod's own
  intended default already matches this whole direction**: its shipped
  `data/undeadnights/tags/entity_types/horde_mobs.json` tag is
  `zombie + zombie_villager + husk + drowned + zombified_piglin +
  horde_zombie + elite_zombie + demolition_zombie` — a complete,
  all-zombie horde template this pack has never actually turned on.
- **Mutants and Zombies — install now.** Re-verified fresh directly
  against its own CurseForge page (not trusting the earlier spec's
  claims, per this pack's own mod-freshness lesson): author
  **MCModsPete** confirmed, latest Forge 1.20.1 file is **v1.4.0**,
  released 2026-08-04 — genuinely current. One correction to the
  earlier spec: **its description does not actually mention pairing
  with Undead Nights** (that earlier claim doesn't hold up on a fresh
  read) — same trusted author is still independently true, and its "no
  autonomous systems" verification from the original spec stands.
  8 mobs unchanged from the original research: Zombie Brute, Mutant
  Brute (tanks), Crawler (fast, wall-climbing — needs **Advanced Wall
  Climber API**, confirmed required as of 1.4.0), Spitter (ranged),
  Blister Zombie, Split Head Zombie (speed/strength variants), Rotten
  Mutant (tanky/slow), Mutant Zombie (mild upgrade).

**Proposed wave-by-wave composition (`WAVES` in `wave_spawner.js`) —
first pass, easy to retune, same as every other wave-count decision in
this codebase.** **Real framing correction (2026-09-06)**: waves 1-8
are not "the campaign" with wave 8 as its finale — that language is
stale, left over from before endless-phase scaling existed. The game
is endless now; waves 1-8 are just the hand-authored *ramp-up*, and
wave 9 onward hands off to Undead Nights' own procedural difficulty
system (already built, 40 escalating levels) which keeps going forever.
Nothing here is an ending. Tells a real escalation story rather than
just swapping mob names 1:1: early waves stay light trash-floor
infected, Undead Nights' own zombies arrive mid-ramp as
"reinforcements," Mutants and Zombies debuts late, and the
wall-breaching Demolition Zombie makes its first-ever appearance right
at the wave 8/9 handoff — introduced there specifically because that's
where the hand-authored ramp ends and the endless horde config
(below) picks it up and keeps using it forever after, not because
anything is culminating.
- **Wave 1**: zombie×4, husk×2, zombie_villager×1 (7)
- **Wave 2**: zombie×3, husk×2, drowned×2, flesh_human×2 (9)
- **Wave 3**: zombie×2, husk×2, drowned×1, flesh_human×2,
  flesh_villager×2 (9)
- **Wave 4**: zombie×2, husk×2, flesh_villager×1, flesh_dog×2,
  flesh_hunter_i (`plaquecreaturetwo`)×1 (8) — first Awareness-stage
  elite
- **Wave 5** (was ravager + flesh_suffer): zombie×1, husk×1,
  flesh_hunter_i×1, flesh_suffer×1, `undeadnights:elite_zombie`×1 (5)
  — Elite Zombie replaces the ravager as this wave's toughest mob
- **Wave 6**: zombie×1, husk×1, flesh_brute_i
  (`bruteplaquecreatureone`)×1, `undeadnights:horde_zombie`×2 (5) —
  Undead Nights' own zombies arrive as a numbers-focused reinforcement
  wave
- **Wave 7**: flesh_hunter_ii×1, flesh_boomer×1, Mutants and Zombies'
  Zombie Brute×1, `undeadnights:elite_zombie`×1 (4) — new mod debuts
  alongside a second elite
- **Wave 8** (was ravager + plaquethreelegcreature, the last
  hand-authored wave before the endless ramp takes over):
  flesh_hysterizer (`plaquethreelegcreature`)×1, Flesh Unseen×1,
  `undeadnights:demolition_zombie`×1, `undeadnights:elite_zombie`×1,
  `undeadnights:horde_zombie`×2 (6) — the toughest hand-authored mix,
  including the first appearance of something that can genuinely
  breach the base's defenses, not just the player. It's a step up, not
  a climax — waves 9+ keep escalating past it using the same roster
  (see the horde config below).

**Proposed endless-phase horde reclassification**
(`undeadnights_horde_mobs_config.json`'s 4 named hordes) — same
non-zombie strip, escalating the same way the trash/mixed/elite/boss
naming already implies:
- `trash_horde`: zombie, husk, drowned, zombie_villager, horde_zombie
- `mixed_horde`: zombie, husk, flesh_hunter_ii, flesh_brute_i,
  horde_zombie, Mutants and Zombies' Rotten Mutant
- `elite_horde`: zombie, flesh_suffer, flesh_hysterizer, flesh_boomer,
  flesh_brute_i, elite_zombie, Mutants and Zombies' Zombie Brute
- `boss_horde`: zombie, elite_zombie, flesh_suffer, flesh_hysterizer,
  flesh_boomer, demolition_zombie, Flesh Unseen, Mutants and Zombies'
  Mutant Brute

**Proposed loot-bag tier reclassification** (`loot_bag_drops.js`'s 4
mob arrays) — same real-toughness-based tiering already used for the
current roster, applied to the new one:
- `UNCOMMON_MOBS`: zombie, husk, drowned, zombie_villager,
  zombified_piglin, flesh_human, flesh_villager, horde_zombie
- `RARE_MOBS`: flesh_dog, flesh_cow, flesh_sheep, flesh_pig,
  flesh_vindicator, flesh_pillager, flesh_mutant, flesh_infector
- `EPIC_MOBS`: flesh_hunter_i, flesh_hunter_ii, flesh_brute_i,
  flesh_boomer, elite_zombie, + 2-3 Mutants and Zombies mid-tier mobs
- `LEGENDARY_MOBS`: flesh_hysterizer, flesh_suffer, Flesh Unseen,
  demolition_zombie, Mutants and Zombies' Zombie Brute/Mutant Brute

**Real verification still needed before shipping, not assumed**:
- Every TFTH id above beyond the ones already live in this pack today
  (`flesh_dog`, `flesh_cow`, `flesh_sheep`, `flesh_pig`,
  `flesh_vindicator`, `flesh_pillager`, `flesh_mutant`/
  `plaquecreatureone`, `flesh_infector`/`plaquecontaminator`,
  `flesh_howler`, `flesh_unseen`) is a **pattern-inferred** registry id
  (`the_flesh_that_hates:<name>`, matching every already-confirmed TFTH
  id's namespace), not independently confirmed the way `flesh_human`/
  `flesh_suffer`/etc. were — verify by decompile or a real `/summon`
  test before wiring into any file, same lesson as the Hand Crank
  recipe correction.
- Mutants and Zombies' exact registry ids (mod id + entity names)
  aren't known at all yet since the mod isn't installed in this pack —
  it's referenced above by display name only. Confirm real ids once
  actually installed, same as every other not-yet-installed mod in
  this doc.
- Whether `Flesh Unseen` is actually summonable/balanced the same way
  as every other TFTH mob used so far (its own spawn mechanics in the
  base mod are unclear from the config alone) — worth a real sandbox
  `/summon` check before relying on it for wave 8.
- Quest book: the existing "kill 5 zombie" task
  (`entity: "minecraft:zombie"`) still works unchanged since
  `minecraft:zombie` stays in the roster — no quest text needs to
  change for this pivot.

**Built, verified, and deployed 2026-09-06.** All 4 files touched
(`wave_spawner.js`'s `WAVES`/`WAVE_MOB_TYPES`, `loot_bag_drops.js`'s 4
tier arrays, `undeadnights_horde_mobs_config.json`'s 4 hordes) plus 2
more the original audit missed but this pack's own established
duplication pattern required: `mob_aggro.js`'s own copy of
`WAVE_MOB_TYPES` (the pedestal-targeting fix from earlier this session)
and `wave_status.js`'s `HOSTILE_TYPES` (its own header comment already
said to keep these three in sync) - missing either would have left
every new mob either not forced onto the pedestal or invisible to the
"hostiles remaining" counter. Also updated Epic Siege Mod's own
`targetingMobs` config to the same roster, for the same reason the
original ESM pass covered the whole roster in the first place.
- **Every "real verification still needed" item above was actually
  checked, not shipped on the pattern-inferred guess**: decompiled
  `TheFleshThatHatesModEntities.class` directly for the real TFTH
  registry ids (all confirmed correct except one, see below), and
  `net/petemc/mutantszombies/entity/ModEntities.class` for Mutants and
  Zombies' real ids once the mod was actually installed - `mutantszombies:
  mutant_zombie/rotten_mutant/mutant_brute/split_head_zombie/zombie_brute/
  spitter/crawler/blister_zombie`, matching the spec's display names
  exactly. Undead Nights' 3 ids re-confirmed straight from its own
  shipped `horde_mobs.json` tag rather than re-decompiling.
- **Real correction found doing that verification, not assumed away**:
  **"Flesh Unseen" has no registered `EntityType` at all** in this
  exact TFTH build - its `MOB SETTINGS` config section and some ambient
  sound files exist, but `TheFleshThatHatesModEntities`'s real
  registration list has no `flesh_unseen` entry anywhere, and the jar
  has zero `FleshUnseenEntity.class` file. Not summonable, full stop -
  the spec's own flagged uncertainty about this mob turned out to be a
  real dead end, not a formality. Dropped from wave 8, `LEGENDARY_MOBS`,
  and `boss_horde` everywhere it was proposed; Mutants and Zombies'
  Mutant Brute (a real, confirmed tank mob already used elsewhere in the
  proposal) took its wave-8 slot instead, keeping that wave's real
  toughness intent without inventing a new number.
- **Advanced Wall Climber API dependency - real filename scare, resolved
  before shipping, not ignored**: packwiz resolved
  `awcapi-neoforge-1.20.1-1.0.2.jar` - a filename that reads as
  NeoForge-only on a Forge 1.20.1 pack, which would be a real
  incompatibility if true. Checked directly rather than trusting the
  name: downloaded the exact resolved file, verified its sha1 against
  packwiz's own recorded hash, then read its real `META-INF/mods.toml`
  - `modLoader = "javafml"`, with an explicit `forge` mod dependency
  (`versionRange = "[47,)"`, matching this pack's own Forge 47.4.10)
  - unambiguous proof it's a genuine Forge mod despite the confusing
  filename (likely just a multi-loader build-pipeline artifact). Its
  Crawler entity (the mob that actually needs this API) was
  real-summoned successfully in the full verification pass below,
  confirming the dependency loads and works, not just that the toml
  claims it should.
- **Verified end to end in a sandbox before deploying**: full mod set
  boots clean (`Loaded 13/13 KubeJS server scripts... 0 errors`), then
  every single new/changed mob id (23 total, spanning all 3 mod
  sources) was real-summoned and confirmed to land as a genuine entity
  - not spot-checked, every one. No crashes, no missing-dependency
  errors, no unknown-entity failures.
- **What did NOT get touched, deliberately**: `diggerMobs`/
  `buildingMobs`/`jumpingMobs` in `epicsiegemod-common.toml` (still
  `["minecraft:zombie"]` only) - separate, already-flagged-open design
  questions (see the pedestal mob-vulnerability entry above), not a
  roster-consistency gap this pivot needed to close. Quest book
  confirmed unaffected per the spec's own note above.

## Defense

**Tier 1 defenses** — *live*. Originally three hand-built custom
pieces (Wooden Palisade, Snare Trap, Spike Trap with a degrade-and-break
mechanic) — replaced entirely 2026-08-29 after real playtest feedback
("rubbish... they sucked"), per an explicit preference for mods over
custom code. Current build:
- **Spikes** and **Bear Trap** from **Trapcraft** (Forge 1.20.1) —
  both use materials already in the Common-tier loot pool natively (5x
  iron_ingot; iron_ingot + stone_pressure_plate), no re-recipe needed.
- **Wooden wall role**: plain vanilla `minecraft:oak_fence` — Trapcraft
  has no wall/fence-shaping block at all, and a plain vanilla fence was
  judged a better fit than forcing a mismatched Trapcraft item into
  that slot. This is the intended outcome, not a gap to revisit.
- Trapcraft's redstone-dependent traps (fan, igniter, magnetic chest)
  are deliberately left out of Tier 1 and unwired for now, since Tier 1
  is specifically "no power, no fuel."
- **That direct check landed 2026-09-04: "the spikes is kinda
  rubbish."** Same "replaced on feel, not function" verdict the
  original custom Spike Trap got — see "Barbed Wire replaces Spikes"
  below for the fix. Spikes itself came back 2026-09-05 as a
  deliberately weaker, cheaper interim option below Barbed Wire, not a
  reversal — see "Trapcraft Spikes re-introduced" further down.

**Barbed Wire replaces Spikes — requested 2026-09-04, built, deployed,
and committed (8e1ed02; the rig's final outdoor position landed later
in a9e6c1a as part of the pedestal rework — see end of this entry).**
Direct feedback: "the spikes is kinda rubbish, can we replace this
block with barbed wire trap from Create: Crafts & Additions." Verified
directly, not assumed:
- **Create: Crafts & Additions** (CurseForge, author MRHminer, 108M+
  downloads, real Forge 1.20.1 build `createaddition-forge-
  1.20.1-1.3.3`, released 2025-11-10). Dependencies confirmed from its
  own relations page: **Create** (required — already installed, see
  "Schematicannon → full Create") and **JEI** (optional — already
  installed). Zero net new footprint beyond the one addon jar.
- **Barbed Wire's real mechanic, confirmed not guessed**: mobs crossing
  it take damage *and* are severely slowed — a genuinely stronger
  effect than Spikes' plain contact damage, matching the "rubbish"
  complaint's likely real cause (Spikes' damage alone apparently
  doesn't read as a real deterrent).
- **Real tier-philosophy tension, surfaced and resolved with the
  user rather than decided unilaterally**: Iron Wire (Barbed Wire's
  own ingredient) isn't a crafting-table recipe — it needs a **Rolling
  Mill**, a real Create kinetic machine — which cuts against this
  pack's own established Tier 1 rule ("no power, no fuel," the exact
  reason Trapcraft's Igniter/Fan/Magnetic Chest are Tier 2, not Tier
  1). **User's call: keep it in Tier 1 anyway.**
- **Friction reduced, then fully shipped, 2026-09-04 — placement bug
  found and fixed 2026-09-05.** Rather than making the player build a
  Rolling Mill from scratch, **a finished Depot + Mechanical Press +
  Rolling Mill rig is pre-placed** inside the starting structure.
  **Real placement bug, direct playtest report**: the rig landed
  outside the building, blocking the front door — the original
  "clear space" spot-check only verified air/floor/ceiling, never
  *what kind* of space it was, and local x=4-6,z=9 turned out to be the
  open entrance yard, not a back room. Root-caused by parsing
  `abandoned_brick_house.nbt` directly (not another spot-check) and
  reproduced fresh against real terrain rather than trusting the
  already-played live save (4 waves in by report time, could have been
  altered by the player). **Corrected spot: local x=7, z=5-7** — a real
  enclosed room confirmed from the NBT itself (solid andesite
  foundation, 3 blocks of headroom, a real ceiling, walls/doors/
  furniture boxing it in), right beside the structure's own pre-placed
  furnace. The player's only remaining task is crafting one **Hand
  Crank** and placing it in the reserved open cell past the Mill —
  that step genuinely can't be pre-placed already running, it needs a
  real player right-click. Press and Mill face the same direction and
  conduct power directly to each other, no shaft
  needed — confirmed live with a temporary creative motor (real nonzero
  Speed on both blocks in a single 3-block kinetic network).
- **Real crafting chain, decompiled and live-verified end to end, not
  guessed from the wiki**: `iron_ingot` → Mechanical Press (items go
  **over a Depot**, not on top of the Press itself — the mod's own
  ponder text says so) → `iron_sheet` → Rolling Mill (items dropped
  directly on top) → `iron_wire` ×2 → crafting table (a diamond shape
  of 4 iron wires) → `barbed_wire` ×2.
- **One real, honestly-unresolved item**: the Mechanical Press never
  auto-fired in the scripted sandbox test — kinetic power and the
  Depot's item-holding both confirmed correct, but Running/Ticks never
  advanced even after 20+ seconds. Not chased further since the Rolling
  Mill (the actual thing being pre-placed and relied on) is fully
  verified working — but this needs a real player to confirm the Press
  itself actually processes when used normally; if it doesn't, that's a
  separate bug to open, not assumed fine.
- **Scope of the swap, all shipped**: `trapcraft:spikes` replaced
  everywhere it's referenced — the craftable Tier 1 item itself, the
  "Sharpened Scrap" quest's task target and both quest/chapter icons,
  and the decorative gate-line placement in `playtest_starter_kit.js`
  (now `createaddition:barbed_wire[vertical=false,facing=south]`,
  confirmed real blockstate properties from the mod's own JSON, not
  guessed). The gate-dressing design note has actually called this spot
  "a barbed-wire or Spikes line" since it was first written — barbed
  wire was always one of the two considered options here, this just
  resolves that either/or with the real block.
- **Real save-compatibility risk caught before deploying, not after**:
  the live instance's quest save already had "Sharpened Scrap"
  completed under its own task/chapter IDs, which had diverged from the
  repo's copy of that `.snbt` file at some earlier point (before this
  session). Blindly overwriting live with the repo's copy would have
  orphaned that real completed progress. Fixed by editing the live
  file's item/icon/description in place — keeping its real IDs — then
  syncing the repo copy back from that live file, so both now match
  exactly and the completed quest stays completed.
- **`packwiz refresh` run, all hashes clean. Deployed and committed**
  (8e1ed02) — held for review first given the quest-ID divergence risk
  above, then committed once the user gave the go-ahead.

**Trapcraft Spikes re-introduced as a weak Tier 1 interim trap, below
Barbed Wire** — *live*, 2026-09-05. This was item 5 of an original
5-item batch (docs/QUEUE.md), repeatedly bumped behind live bug reports
until now; the mod block was never uninstalled, just left with no recipe
or quest of its own once Barbed Wire took over as the "real" Tier 1
defense above.
- **Recipe retuned, not left stock**: Trapcraft's own shipped recipe
  (`data/trapcraft/recipes/spikes.json`, confirmed by decompiling the
  jar) is 5 iron ingots and nothing else — too steep for "weak/cheap
  interim," especially sitting beside Bear Trap's 3 iron + 3 stone
  pressure plates in the same chapter. New KubeJS override
  (`tier1_recipes.js`, mirroring `tier2_recipes.js`'s
  remove-then-`event.shaped` pattern): 4 sticks + 1 iron ingot — the
  cheapest defense item in the pack, by design, since it's meant to be
  available before Bear Trap or Barbed Wire's Create rig are built.
- **"Damage AND slow" resolved by pairing, not a code change**:
  `SpikesBlock.java`'s own decompiled logic only ever damages (2.0f
  base + a velocity-based bonus on contact, or a flat 20.0f on a 5+
  block fall) — no slow effect exists on the block itself. Rather than
  bolt one on, the fix is pairing it with plain vanilla cobweb (its own
  real movement-speed reduction already does the slowing half) — the
  new quest's description spells this out directly to the player as the
  intended combo, instead of leaving it as a silent, undiscoverable
  expectation.
- **New Tier 1 quest, "Better Than Nothing"** (`campaign.snbt`,
  `id: "67A7BF98D2C077DE"`) — same dependency root and visual cluster
  as "Sharpened Scrap"/"Something Crueler," slotted between them and
  "Not Just Jewelry" (x=13, y=-0.5). Rewards 1 XP level + 2 iron ingots —
  intentionally modest, and the iron reward nudges the player toward
  affording Bear Trap or the Barbed Wire rig next.
- Verified via a clean sandbox boot: KubeJS loaded all scripts with 0
  errors, recipe processing reported "0 failed recipes," and FTB Quests
  logged the expected 31-quest count (was 30) with no parse errors.
  Deployed to the live instance's script/quest files (`packwiz refresh`
  run, hashes clean) — **not yet confirmed by a real playtest.**

**Machine progression, Tier 2** — *live* (2026-08-31). Semi-automated,
redstone-powered, still fragile — the next rung up from Tier 1, and the
first real use for the Uncommon (Fortified Cache) loot tier. All four
items re-recipied via `ServerEvents.recipes`
(`pack/kubejs/server_scripts/tier2_recipes.js`) to swap each stock
recipe's Common-tier filler (cobblestone, loose redstone, iron ingot)
for Uncommon-tier materials (`quartz`, `redstone_block`, `iron_block`)
confirmed real from `loot_bag_open.js`'s `FORTIFIED_CACHE_POOL` — the
actual gate the loot tier was missing.
- **Fire Trap** = Trapcraft's **Igniter** (`trapcraft:igniter`) —
  already installed for Tier 1, unused until now. Lights an area on
  fire on a redstone signal. Re-recipe: netherrack ring, quartz
  filler, redstone_block core (was cobblestone/redstone dust).
- **Fan** (`trapcraft:fan`) — also Trapcraft. Pushes mobs (and items)
  on a redstone signal — funnels mobs into other traps, or pushes them
  back from the chokepoint. Re-recipe: quartz ring around an
  iron_block hub (was cobblestone/iron ingot).
- **Magnetic Chest** (`trapcraft:magnetic_chest`) — also Trapcraft.
  Auto-collects loot from trap kills. Re-recipe: planks, redstone_block,
  iron_block (was planks/redstone dust/iron ingot).
- **Arrow Turret** = **Medieval Defense Turrets**'
  `medievalturrets:bow_turret_item` (new install, Modrinth project
  `9y40sONu`, v1.1.4, Forge 1.20.1, no dependencies, confirmed real via
  the mod's own shipped recipe JSON before touching anything) — its
  simplest turret, arrow ammo only, picked specifically over TurretCraft
  and K-Turrets for being more "basic, fragile" like the rest of this
  tier. Re-recipe: bow + planks + iron_block (was bow/planks/
  cobblestone).
- **Reinforced Spikes** (tougher Tier 1 spikes) — cut. No equivalent
  found in Trapcraft; not blocking the rest of Tier 2.
- Verified via a full-mod-set sandbox boot (not just `node --check`):
  copied the live instance's entire relevant mod/config set into the
  same throwaway dedicated server used for the endless-phase-scaling
  verification, added the new turret mod, and confirmed a clean
  `Done (...)!` boot with `tier2_recipes.js` loading with 0 errors and
  FTB Quests logging "3 chapters, 17 quests" — the exact expected count
  (11 Basics + 2 Tier 1 + 4 Tier 2).

**Trapcraft dropped entirely — decided 2026-09-08, spec ready, NOT YET
BUILT, holding for explicit dispatch.** Direct feedback: doesn't like
Trapcraft's traps, but wants to keep the Magnetic Chest's *mechanic*
specifically — moved off Trapcraft onto a different mod, not kept as-is.
Scope confirmed directly with the user as "everything Trapcraft," not
just the traps — so this removes all 5 pieces currently wired in:
`trapcraft:spikes`, `trapcraft:bear_trap` (Tier 1), `trapcraft:igniter`,
`trapcraft:fan`, `trapcraft:magnetic_chest` (Tier 2).

**Correction to the user's own pasted research before it went further**:
that research named "Defensive Traps" (CurseForge, modid `defenses`) as
a Tier 1 spike/bear-trap replacement. Checked directly, not taken on
faith — **it has no Forge 1.20.1 build at all**, only NeoForge (1.21.1,
1.20.6) files exist on its real CurseForge files list. Ruled out. Worth
remembering the rest of that pasted research (Tier 2 turret mods, Tier 3
Tesla/flamethrower mods, boss-wave/bossbar/music KubeJS templates) was
read as background only, not verified or actioned — it also proposes
new tiers/mechanics this pack already has covered (Medieval Defense
Turrets already fills the Tier 2 automated-turret role) or that conflict
with the current stabilize-before-new-tiers priority; not part of this
entry.

**Real replacements verified (mod page/API checked directly per mod,
not assumed from search summaries):**
- **Tier 1 spikes** → **Simply Traps** (CurseForge, real
  `simply_traps-1.7-forge-1.20.1.jar`, Sept 2025, no dependencies) — use
  its Spike Trap/Stakes piece only. Its own barbed-wire item is
  deliberately NOT used — would duplicate Create: Crafts & Additions'
  barbed wire, already this pack's real Tier 1 wall-piercing defense.
- **Tier 1 bear_trap** → **V01D's Bear Traps** (CurseForge, real Forge
  1.20.1 beta build, June 2025, no dependencies) — genuinely holds a mob
  in place on trigger, same role as the current one.
- **Tier 2 igniter/fan** → **cut, not replaced**. No standalone mod
  found that fits either role on a real Forge 1.20.1 build. Recommended
  over continuing the search: both were only ever two simple item-task
  quests ("Spark and Flame," "Herd Them In") with no deeper mechanic
  built on top; Tier 2's real automated-defense identity is already
  Medieval Defense Turrets; and this pack's own earlier fan/`AirCurrent`
  investigation (2026-09-05 batch, item 23) already concluded mazes/
  walls are the real mob-redirect mechanism here, not fans — cutting
  these loses two thin quests, not real defensive capability.
- **Magnetic Chest** → candidate: **Smart Storage**'s "Smart Label" —
  attaches to any vanilla chest and gives it filtered magnetic pickup of
  nearby dropped items, rather than being its own dedicated block. Real
  Forge 1.20.1 build confirmed via Modrinth's version API (published
  2026-07-28, no dependencies). Checked and ruled out first: Vacuum
  Chest (real mod, but stale — last build is 1.19.2 from 2022), Magnetite
  Block (Fabric-only, no Forge build), Vacuum Blocks (real Forge 1.20.1
  build, but directional-into-a-hopper-only, a meaningfully weaker
  mechanic than the omnidirectional pull being replaced). **Real caveat,
  not glossed over**: Smart Storage is brand new and small (37 downloads
  total at verification time), single author, and its own page states no
  specific pickup range for the magnetic-collection feature — needs a
  real hands-on sandbox check of actual range/behavior before trusting
  it over what it's replacing, same rigor as every other mod pick in
  this pack.

**What building this actually touches** (for whoever picks it up):
`tier1_recipes.js` and `tier2_recipes.js` (drop the Trapcraft
re-recipes, add new ones only if the replacement mods' stock recipes
don't already fit this pack's tiering), the `kubejs:tier1_machines`
item tag, and 5 quest entries in `campaign.snbt` (spikes → Simply Traps
item, bear_trap → V01D's item, magnetic_chest → Smart Storage's item,
igniter/fan quests removed — check for orphaned dependents first, same
as every other quest removal in this pack's history). **Real risk to
check before touching `campaign.snbt`**: this exact chapter has already
diverged between the live save and the repo copy once before (the
Barbed Wire swap, 2026-09-04) — pull real current IDs from the live
save's own quest-progress file, don't blindly overwrite from the repo.
Also update `MODS.md`'s Trapcraft entry and this file's own "Tier 1
defenses"/"Machine progression, Tier 2" entries above once built (mark
Trapcraft-era text superseded, don't delete the history).

Nothing installed, uninstalled, or edited yet — spec only, holding for
an explicit go-ahead before dispatch.

**Machine progression (Tier 3-4)** — see IDEAS.md for the still-unscoped
elite/endgame tier list (AoE Devastator, Chain-Tesla Network). Tier 3
itself now has a real power system to depend on — see "Storage & power
system" below, designed 2026-09-01, parked in QUEUE.md rather than
sent to build (deliberately queued behind the current playtest-feedback
batch, not a design gap).

**Storage & power system — BUILT, 2026-09-08 (Roadmap Phase 3).** The
original 2026-09-01 spec below is kept as real design history (not
deleted); this paragraph is the actual shipped outcome, verified far
more rigorously than the original spec pass (which flagged 3 of 4
mods' dependency lists as unchecked).

**All 4 mods installed via `packwiz curseforge add --addon-id <id> -y`
(real CurseForge project IDs, not search/slug guesses)**, each
dependency-checked twice — once via packwiz's own CurseForge-API-backed
resolver (which auto-detects and offers required deps), once again by
downloading the exact jar and reading its real `META-INF/mods.toml`
directly (the authoritative source, per this pack's decompile-first
convention):
- **Sophisticated Storage** v1.4.86 (project 619320, file 8719374) +
  **Sophisticated Core** v1.5.1 (project 618298, file 8839328, real
  required dependency — packwiz auto-added it, matching the original
  spec's already-verified claim).
- **Refined Storage** v1.12.4 (project 243076, file 4844585) — **real
  correction to the original spec's open caveat**: packwiz found zero
  required dependencies, and the downloaded jar's own `mods.toml` has
  no `[[dependencies.refinedstorage]]` block at all beyond the implicit
  Forge/Minecraft version floor. A generic CurseForge relations-page
  scrape (not project-ID-specific) had suggested a "Fabric API
  required" dependency — that reflects the mod's separate Fabric build,
  not this Forge one; the real jar has no such dependency. Forge loader
  floor `[47,)` — this pack runs 47.4.10, satisfied.
- **Immersive Engineering** v10.2.0-183 (project 231951, file 6206989)
  — confirmed via `mods.toml`: only mandatory deps are `forge
  >=47.3.0` and `minecraft 1.20.1` (both satisfied), `jei` optional
  (already installed). Genuinely self-contained, as the spec reasoned
  but hadn't verified.
- **Flux Networks** v7.2.1.15 (project 248020, file 5234697) —
  confirmed via `mods.toml`: only mandatory deps are `forge >=46` and
  `minecraft [1.20,1.21)`, `modernui`/`jei` optional. No SonarCore
  dependency in this build, matching the spec's reasoned-not-verified
  claim.

All 5 jar hashes (sha1) matched packwiz's recorded metadata exactly
after direct download — genuine files, not corrupted/substituted.

**Real, load-bearing correction to the roadmap dispatch that sent this
phase to build**: the dispatch stated "Create's own Tesla Coil block
... NOT Create: Crafts & Additions' Tesla Coil — already ruled out as
the wrong pick" as an established fact. Decompiled the actual installed
`create-1.20.1-6.0.8.jar` directly (full jar-entry scan for "tesla"):
**zero matches at all** — base Create has no Tesla Coil block, model,
texture, or class anywhere in the jar. The block the dispatch described
does not exist. Two real Tesla Coils exist in this pack's actual mod
set instead, both individually decompiled and compared on real
mechanics (not read from marketing text):
- `createaddition:tesla_coil` (Create: Crafts & Additions, already
  installed since the Barbed Wire swap) — `TeslaCoilBlockEntity`: a
  flat-radius (3-block) AoE tick every 20 ticks while redstone-powered
  and sufficiently charged; real FE-backed (40,000 FE capacity, 10,000
  FE/t max input, 1,000 FE consumed per zap); 3 damage to mobs / 2 to
  players per zap plus a "Shocking" `MobEffectInstance`; a genuine
  quirk found in the code — full head-to-toe chainmail armor grants
  complete immunity to both the damage and the effect. Single block.
- `immersiveengineering:tesla_coil` (Immersive Engineering) —
  `TeslaCoilBlockEntity`: every 32 ticks, picks ONE random `LivingEntity`
  within a 6-block radius, deals 6.0 real damage
  (`IEServerConfig.MACHINES.teslacoil_damage`, config-adjustable) via a
  dedicated `ieTesla` damage type, and applies IE's own 128-tick
  Stunned `MobEffect` to that target; every OTHER nearby entity in a
  wider (9-block) box gets a lesser residual "electric field" effect
  instead of the full hit. Real FE-backed (48,000 FE capacity, 256 FE/t
  idle draw, 512 FE per shock), redstone-gated the same way. A 2-tall
  multiblock. Real stock crafting recipe: HV Capacitor + MV Coil +
  Advanced Electronic Component + iron component + aluminum plates —
  IE's own mid-tier component chain, meaning it's already gated behind
  real IE ore-processing progression by the mod itself. (Checked IE's
  own `IEPotions`/`EventHandler` for what "Stunned" actually does
  beyond being a registered harmful effect — found no AI-disabling
  handler anywhere else in the jar for this specific build; treating it
  honestly as "a real status effect is applied" rather than overselling
  a specific gameplay-disabling claim that isn't in the code.)

**Decision: Immersive Engineering's Tesla Coil (`immersiveengineering:
tesla_coil`) is Tier 3's real defense machine**, not CC&A's, and
definitely not the nonexistent "Create's own" block the dispatch named.
Reasoning: (a) genuinely free — zero additional mod footprint beyond
IE, which this phase installs regardless for power generation, so this
is the only reading of the roadmap's own "resolves the Tesla Coil
candidate for free" framing that actually holds up; (b) the single-
random-target-plus-residual-field mechanic is a much closer literal
match to "chain lightning" than CC&A's flat-radius tick; (c) it matches
this project's own real history — both the original 2026-09-01 "Storage
& power system" spec below and IDEAS.md's Tier 3 sketch named IE's
Tesla Coil specifically, well before the erroneous "Create's own"
framing appeared in the 2026-09-08 roadmap dispatch. CC&A's Tesla Coil
stays installed (it was already in the pack for barbed wire) and stays
real/usable in a creative build, it's just not the one wired into
quests — shipping two overlapping "electric zap tower" identities in
one tier isn't worth it.

**Recipe/tier-gating decision, documented per the dispatch's own
explicit ask**: no re-recipe layer added on top of any of the 4 mods'
stock recipes (Sophisticated Storage's barrels, Refined Storage's
Controller/Grid, IE's generators/Tesla Coil, Flux Networks' Plugs/
Points all ship as-is). This is a deliberate choice, not an oversight —
Tier 1/2's "swap the filler ingredient for a loot-tier material" pattern
(established by `tier1_recipes.js`/`tier2_recipes.js`) doesn't fit here
for a specific reason: the Tesla Coil's own stock recipe already
requires a real IE-internal tech-tree item (HV Capacitor, itself built
from IE's ore-processing/refining chain) — a genuinely deeper, more
meaningful gate than a fixed materials swap would add, and replacing it
with loot-tier fillers would let a player skip IE's own progression
entirely by looting their way to a Tesla Coil, directly undermining the
"tech pack feel" this system exists to deliver and the pack's own
established principle that loot shouldn't hand out shortcuts to what a
placed home machine already makes (see `feedback_loot_shortcut_
undermines_choice`). The real gate instead is the FTB Quests dependency
chain (all 6 new Tier 3 quests sit behind the Tier 2 turret quest, see
below) plus IE's own native component tree for the Tesla Coil
specifically — consistent with how Tier 1→Tier 2 is ALSO gated purely
by quest dependency, not forced item consumption (the actual built
Tier 2 Arrow Turret recipe doesn't consume a Tier 1 item either).

**Flamethrower Mechanics (Create Nozzles + lava) — real check done,
ships as a parallel/alternative Tier 3 option, not a required second
machine.** The dispatch asked for a real check of whether a Nozzle's
fire-stream actually damages mobs before assuming it does. Decompiled
Create's actual fan-processing pipeline directly (`AirCurrent.
tickAffectedEntities()` → `AllFanProcessingTypes.BlastingType/
SmokingType.affectEntity()`):
- `AirCurrent.tickAffectedEntities()` (in `com.simibubi.create.content.
  kinetics.fan.AirCurrent`) calls `level.getEntities(null, bounds)` —
  ALL entities in the air current's bounding box, not just item
  entities — and for anything that isn't an `ItemEntity`, calls
  `processingType.affectEntity(entity, world)` every tick it remains
  caught.
- `BlastingType.affectEntity()` (fan blowing over real lava — confirmed
  `minecraft:lava`/`minecraft:flowing_lava` are valid catalysts via
  `data/create/tags/fluids/fan_processing_catalysts/blasting.json`,
  exactly matching "Create Nozzles + lava," no extra tagging needed):
  `entity.setSecondsOnFire(10)` + `entity.hurt(CreateDamageSources.
  fanLava(level), 4.0F)` — a real 4.0-damage (2-heart) hit plus a
  10-second ignite, reapplied every tick the entity remains in the
  stream (vanilla's own hurt-invulnerability window throttles the
  direct-hit damage on repeat ticks, but the ignite keeps refreshing,
  so the practical effect is one solid hit plus continuous vanilla
  fire-tick burn damage — roughly 1 damage/second — for as long as a
  mob stands in the stream).
- `SmokingType.affectEntity()` (fan over a weaker heat source, e.g. a
  lit campfire): `setSecondsOnFire(2)` + 2.0 damage — same mechanism,
  weaker.
- A Nozzle isn't what generates this effect — it's a pure vanilla
  `IAirCurrentSource`-reading attachment that reshapes/extends the
  underlying fan's own air current into a focused, aimable beam (real
  use case here: aiming the stream down a kill corridor rather than a
  bare fan's default cone). The damage/ignite mechanic exists on the
  fan+heat-source combo itself, Nozzle or not.
- This is purely Create's own kinetic power (RPM/stress units from a
  windmill, water wheel, or hand crank) — **not** Forge Energy, so
  unlike the Tesla Coil it has zero dependency on the new IE/Flux
  Networks/Refined Storage power chain and needed zero new mod
  installs (base Create's Nozzle + Fan + a lava source, all already in
  the pack).

**Decision**: ships as a real, cheaper, parallel Tier 3 choice
alongside the Tesla Coil, not a required second machine and not cut —
the decompiled mechanics are genuinely meaningful damage, not cosmetic,
and it fits a distinct playstyle (a standing area-denial corridor vs.
the Tesla Coil's periodic single-target zap) at zero FE-chain cost.
Documented in a new quest, "Turn Up the Heat" (see Quest book changes
below) — checkmark-type like "Turn the Crank," since it needs no new
craftable item, just a build (Fan behind a Nozzle, aimed down a
corridor, with lava reachable from the fan's intake side).

**Tesla Coil hit cinematics — built.** New file
`pack/kubejs/server_scripts/tesla_coil_cinematics.js`. The mod already
ships real cinematics of its own (a LOUD_ZAP/`tesla.ogg` sound at the
coil, a lightning-bolt render via its own `LightningAnimation` class,
and a lit "powered" blockstate) — this adds a complementary hit
reaction AT THE STRUCK ENTITY specifically, so the zap reads at the
point of impact too, not just at the block. Real KubeJS API, verified
by decompiling KubeJS's own classes directly (not guessed, given this
pack has never used a hurt-style event before): `EntityEvents.hurt` is
a real registered event backed by Forge's `LivingHurtEvent`
(`LivingEntityHurtEventJS`, confirmed in KubeJS's own `EntityEvents`
binding class), and `event.getSource().getType()` is KubeJS's clean-
name remap (`DamageSourceMixin`, `@RemapForJS("getType")`) of vanilla's
`DamageSource.getMsgId()` — confirmed this returns exactly the
`message_id` string authored in the damage type's own JSON (`data/
immersiveengineering/damage_type/tesla.json` sets `"message_id":
"ieTesla"` for this specific ongoing-zap damage, distinct from
`ieTeslaPrimary`, the coil's own sneak+screwdriver player self-test
damage — deliberately not matched, this hook is for combat cinematics,
not a player-safety indicator). On a real `ieTesla` hit: a vanilla
`minecraft:electric_spark` particle burst (the same particle vanilla
uses for sculk sensor vibration feedback — a real, already-registered
"electric" particle, no custom texture needed) plus a vanilla
`minecraft:entity.lightning_bolt.thunder` sound, both centered on the
struck entity's position via `runCommandSilent`. Syntax-checked with
`node --check`.

**Performance tip investigated — real finding, not a code change.**
The roadmap asked to "cap Embeddium's max particle count" given mass
Tesla-electrocution of a Enhanced-Hordes-stacked horde is a real
stutter risk. Decompiled the installed `embeddium-0.3.31+mc1.20.1.jar`
directly: there is no Embeddium-specific particle cap anywhere in the
jar (only rendering-performance mixins for how particles are drawn,
`BillboardParticleMixin`/`SpriteBillboardParticleMixin`). The "Particle
Quality" option Embeddium's own video-settings screen exposes is
vanilla's own `options.particles` setting (`ParticleStatus`: All/
Decreased/Minimal) — confirmed via `SodiumGameOptionPages.java`,
Embeddium just re-surfaces it in its own UI rather than adding a new
setting. This pack ships no default `options.txt` (checked), so there's
no server-side or packwiz-config lever to force it — it's a genuine,
real per-player client setting, not a code change. Documented here as
player-facing guidance instead: switching Particles to Decreased or
Minimal is the real mitigation for a mass-Tesla-zap or Nozzle-
flamethrower moment, worth mentioning in a future tips quest, not
something this phase can enforce.

**New Tier 3 quest chapter additions — built, in `campaign.snbt`.** 6
new quests, all branching off "Wired for War" (Tier 2's Arrow Turret
quest, id `74779308DEED321D`) matching this pack's existing "next tier
branches off the previous tier's quest" pattern: "Wired Different"
(`immersiveengineering:diesel_generator`) and "Room to Grow"
(`sophisticatedstorage:barrel`) both branch directly off Tier 2;
"No Cables Needed" (`fluxnetworks:flux_plug`) and "The Grid"
(`refinedstorage:controller`) both depend on "Wired Different" (need
real power first); "Sparks in the Dark" (`immersiveengineering:
tesla_coil`) depends on "No Cables Needed" (needs the wireless
distribution network, matching the "place a machine and it draws
automatically" framing); "Turn Up the Heat" (checkmark, the Flamethrower
build) depends on Tier 2 directly, independent of the whole power
chain, matching its real zero-FE-dependency status above. All use the
established item-task pattern (`consume_items: false`, hexagon shape,
size 1.5) except "Turn Up the Heat" (checkmark, matching "Turn the
Crank"'s precedent for a build-not-craft quest). Real item/block IDs
verified by decompiling each mod's own blockstate/asset listing
directly, not guessed from mod pages.

**Real footprint cost, stated plainly per the dispatch's own ask**:
this is the single biggest-footprint addition in this pack's history
besides full Create — 5 new mod jars (Sophisticated Storage,
Sophisticated Core, Refined Storage, Immersive Engineering, Flux
Networks), with Immersive Engineering alone being a full standalone
tech mod (its own ore processing, engineering workbench, multiblock
machines, turret system not used here). This directly cuts against
this pack's "keep it lightweight" guiding principle, weighed honestly
rather than ignored — the counter-argument, already made when this was
first specced and still true, is that this is a deliberate, one-time,
user-requested "tech pack feel" investment for Tier 3-4 specifically
(not creeping into every tier), landing as one coordinated addition
rather than several small ones.

**Real, honest side effect found during sandbox verification**:
Sophisticated Storage ships ~25 bundled advancement/recipe files for
converting upgrades between itself and **Sophisticated Backpacks** (a
separate mod, same author, NOT installed here — never part of this
pack's spec). Every boot logs a `Parsing error loading custom
advancement ... Unknown item id 'sophisticatedbackpacks:...'` for each
one. These are non-fatal (confirmed: the server reaches `Done` and RCON
comes up regardless) and only affect a permanently-unreachable "convert
a backpack upgrade into a storage upgrade" recipe nobody can ever craft
without the other mod — but it's real, previously-undocumented log
noise from this install, not something to gloss over.

**Full-mod-set sandbox boot verification — real, done.** Found and
reused an existing throwaway dedicated-server sandbox (built by a
sibling track earlier in this same session) rather than touching the
user's live CurseForge instance directly (writing into the live
instance's own folders was refused by the permission classifier, same
boundary this project has hit before over the live save specifically) —
copied it to an isolated working copy on a different port so it
wouldn't collide with the sibling's own concurrently-running server.
Populated its `mods/` from this worktree's real `pack/mods/*.pw.toml`
list (79 mods total, byte-identical to what the live CurseForge
instance already has for the other 74) plus the 5 newly-downloaded
jars, and its `kubejs`/`config` from this worktree's actual `pack/`
content. Removed **Mob Dismemberment** from this throwaway copy only
(not from the real pack) — confirmed via the log that it hits the
exact same pre-documented `LocalPlayer for invalid dist
DEDICATED_SERVER` crash this pack's own history already flagged as a
known client-only-mod sandbox limitation, unrelated to this phase's
changes. Result: clean boot (`Done (24.25s)!`, RCON up on a real
connection), FTB Quests loaded the full updated quest count with 0
parse errors, no crash from any of the 5 new mods, and the Tesla Coil
cinematics script loaded with the rest of `server_scripts` at 0 errors.
Not yet confirmed by an actual player session (placing/powering a real
multiblock chain, seeing the Tesla Coil fire on a live mob, or standing
in a Nozzle+lava stream) — that needs a real playtest.

**Original spec below, 2026-09-01** — kept for design history. Direct
request: give the pack "a tech pack feel" alongside base defense, with
sensible item management as higher-tier machines come online. Four
mods, all independently verified for Forge 1.20.1, not assumed from
search summaries alone (see the per-mod caveats below on which
dependency pages were actually checked directly versus not):

- **Sophisticated Storage** (CurseForge, author P3pp3rF1y) — upgradeable
  storage barrels/chests with filtering. Requires **Sophisticated
  Core** (same author) as a mandatory dependency — confirmed directly
  from the mod's own CurseForge relations page. No power requirement;
  a clean, low-risk addition independent of everything else here.
- **Refined Storage** (CurseForge, author raoulvdberge, confirmed
  Forge 1.20.1 build v1.12.4) — the actual digital/networked item
  storage system: a Controller, a Grid (crafting/access interface),
  Disks (storage medium), Importers/Exporters/Constructors/Destructors
  for automation. **Purely consumes Forge Energy, includes no
  generation of its own** — the Controller needs an actual power
  source connected to it, which is what the next two mods provide.
  Energy requirement can be disabled via config if ever wanted, but the
  plan here is to keep it on, since power management is part of the
  "tech pack feel" being asked for, not incidental to it. **Not yet
  directly verified**: its exact dependency list (only reasoned from
  general documentation, not fetched from its own CurseForge relations
  page the way Sophisticated Storage's was) — check directly before
  installing.
- **Immersive Engineering** (CurseForge, author BluSunrize, confirmed
  Forge 1.20.1, v10.2.0-183 — marked "Final release for 1.20.1" by the
  author, meaning a complete, stable stopping point on this version,
  not an abandoned mid-version build) — the actual power generator.
  Picked over the leaner, more generic **Powah! (Rearchitected)**
  specifically for aesthetic fit: its Diesel Generator, exposed wiring,
  and scavenged-industrial content read as wasteland-appropriate in a
  way Powah's sci-fi reactors/solar panels don't. **Real double duty**:
  IE's own Tesla Coil was already flagged in IDEAS.md as a candidate
  for the still-unscoped Tier 3 "chain-lightning" defense machine —
  installing IE for power generation means that candidate is already
  in the pack, not a separate future install. **Real footprint cost,
  not hidden**: this is a full standalone tech mod (its own ore
  processing, engineering workbench, multiblock machines), the biggest
  single addition to this pack besides full Create. **Not yet directly
  verified**: dependency list not fetched from its own relations page —
  check before installing, IE is generally known to be self-contained
  but that's reasoned, not confirmed here.
- **Flux Networks** (CurseForge, author sonar_sonic, confirmed Forge
  1.20.1, v7.2.1, "compatible with FE/EU/RF/TESLA/AE") — wireless power
  distribution: a Flux Point at the generator, Flux Plugs at consumers
  (the Refined Storage Controller, and any Tier 2+ powered machine),
  no cables between them, per-network configuration. Modern versions no
  longer require the old SonarCore dependency (confirmed from search
  results, not the relations page directly — same caveat as above).
  This is specifically what lets "place a machine and it draws
  automatically" work, matching the wireless-power feel already
  sketched in IDEAS.md's original power-system notes.

**How the pieces connect**: Immersive Engineering generates FE → Flux
Networks distributes it wirelessly to the Refined Storage Controller
and to Tier 2+ machines → Refined Storage handles the digital item
network on top of (or alongside) Sophisticated Storage's simpler
physical bulk storage. This is genuinely the pack's power system now,
not a separate one for storage — the same open question from IDEAS.md
(shared power pool/capacity limit vs. unlimited draw) still isn't
resolved by picking these mods; Flux Networks supports per-network
throughput/capacity config if a limit is ever wanted, but whether to
actually use one is still an open game-design call, not decided here.

**Explicitly not decided by this spec, flagged for whoever builds it**:
- Whether this newly powers Tier 1-2 machines too, or stays scoped to
  Tier 3-4 only as originally sketched (Tier 1-2 were deliberately
  designed fuel-free — "two different flavors of resource tension for
  early vs. late game" — preserving that split unless told otherwise).
- Where in the base this physically goes — no "workshop" or tech room
  exists in the current Watchpost layout, this needs real placement
  decided at build time, not assumed to fit into existing rooms.
- Whether Refined Storage/Sophisticated Storage components should be
  gated behind specific loot tiers (matching this pack's existing
  Uncommon/Rare materials-gating pattern) or craftable from the start.

**Superseded 2026-09-08** — see the "BUILT, 2026-09-08 (Roadmap Phase
3)" writeup above this spec for the actual shipped outcome; this
"deliberately parked" status no longer applies.

---

## Quest book

**Quest book rebuild — requested 2026-09-05, design settled, sent to
build.** Direct feedback: "I would prefer to be a bit linear in
the beginning rather than a basics section then a tier 1 etc...each of
these chapters feel empty of fun," plus a separate follow-up that the
existing flavor text "sounds quite AI" — too heavy on mysterious/
portentous prose, not enough practical information, no sense that the
world still has open questions in it. Design fully worked through with
the user before any content got written; this replaces the "three
chapters" structure below entirely, not incrementally.

**Structural philosophy — a single chapter, one spine, tiers as
branches off it.** The old three-chapter split (Basics/Tier 1/Tier 2)
already had a mostly tree-shaped dependency graph underneath it (Tier 1
gated on Basics, Tier 2 gated on Tier 1) — the real problem was that
FTB Quests renders each chapter as a separate flat tab, so that shape
never became visible. Consolidating into one chapter's canvas, with
real x/y layout so the branch-and-reconverge shape actually reads,
fixes this without needing to invent new content or new dependencies.
User's explicit calls, not assumed:
- Tier 1 and Tier 2 both branch off the same point on the spine
  ("Open It") rather than Tier 2 visually nesting inside Tier 1's
  branch — acceptable as a first pass, can be revisited once it's
  actually laid out in-game.
- The early stretch (onboarding through the tier branches) should read
  as one continuous thing — story beats, core-loop teaching (horn →
  wave → loot → open), and the push into Tier 1/2 progression all
  happening in the same breath, not sequential blocks. The tier
  branches should read as "you need this now," not optional side
  content — reflected in the flavor text tone below, not a structural
  change.
- Checkmark "story beat" quests stay — the found-diary narrative is
  genuinely doing real work as connective tissue between objective
  quests — just not as filler where they don't add anything.

Tree shape (spine down the middle, both tiers branching from the same
point, reconverging before the campaign's late-game beats):

```
 You're On Your Own
 Borrowed Time
 Sound the Horn
 Thin the Horde (kill 5x zombie)
 Spoils of War (hold a bag)
        │
    Open It ──────────────┬──────────────┐
        │                 │              │
 Not Just Jewelry     Tier 1 branch: Sharpened Scrap (barbed wire),
 (craft amulet)        Something Crueler (bear trap),
        │              Turn the Crank (hand crank, already shipped)
        │                 │              │
 Watch the Walls Grow ────┴──────────────┘
        │
 Leave It Behind      Tier 2 branch (gated on Tier 1): Spark and Flame,
 (amulet on pedestal)  Herd Them In, Waste Not, Wired for War
        │                 │
 The Reckoning ───────────┘
   (wave 5 gear removal)
        │
 No Turning Back
   (wave 8)
```

**Tone rework — new house style for every quest in the book, not just
new ones.** Same found-diary voice (still written by "whoever held this
post before"), but every entry now does two things instead of one:
gives real, actionable information about the mechanic it's attached to,
and ends on a genuine open question the writer doesn't have the answer
to — not a closed, portentous mic-drop. The open questions aren't
decoration: several point at things that are real and true about this
pack right now (no known ceiling on endless-phase waves, the amulet's
exact effect being worth discovering rather than stated outright), so
the "more to learn yet" feeling isn't manufactured. Finalized text for
the full existing quest set, replacing every old line below:

*Spine:*
1. *"You're On Your Own"*: **"Whoever was here before you didn't make
   it, but they left the place standing — that's not nothing. Sound the
   horn when you're actually ready, not before. Never did figure out
   where the horde comes from before it shows up here. Worth keeping an
   eye out, if you're the type."**
2. *"Borrowed Time"*: **"That sword and armor aren't permanent — you'll
   lose them a few waves in, five if I've got it right. Get real use
   out of them while you can, because whatever you find after has to
   carry you the rest of the way. Never worked out why five
   specifically. Felt too exact to be random."**
3. *"Sound the Horn"*: **"Right-click it when you want the next wave —
   it won't come on its own until the timer runs out, so take the gap
   if you need to patch up or restock. I'd rather choose my moment than
   get caught mid-repair."**
4. *"Thin the Horde"*: **"Five's not much, but it'll tell you fast
   whether your gear can actually handle this. Count resets every wave.
   Never found a real ceiling on how many of these this place can throw
   at you — not sure there is one."**
5. *"Spoils of War"*: **"Bags don't always drop, but when they do, grab
   them — better loot seems to come off tougher kills, near as I can
   tell. Never pinned down the actual odds."**
6. *"Open It"*: **"Open bags as you get them rather than hoarding —
   they don't do anything sitting in your inventory. I kept a few
   unopened once, convinced myself they'd be worth more later. They
   weren't."**
8. *"Watch the Walls Grow"*: **"Clearing waves pushes the border out —
   more room to work with, but also more ground you're on the hook for.
   It grows a little more each time, faster later on. Never figured out
   what happens if you just... stop clearing them."**
9. *"The Reckoning"* (wave 5 gear removal): **"Five waves was as far as
   whoever held this post before you got. You've matched that, and the
   gear's finally given out — it was never going to last past this
   point anyway. Everything from here is genuinely unwritten; nobody's
   diary goes further than this."**
10. *"No Turning Back"* (wave 8): **"Eight was the last wave anyone
    bothered planning for — after this, it just keeps escalating, no
    ceiling anyone's found yet. Whatever gear and defenses you've built
    by now are what you're taking into it. I don't know how far it
    actually goes. Maybe you'll be the one who finds out."**

*Amulet side-branch:*
- *"Not Just Jewelry"* (craft `kubejs:amulet`): **"The shrine's been
  empty a while — whoever wore this before isn't coming back for it.
  Melt down enough gold and you can make another; the recipe's simple
  once you've got the materials. I still don't know exactly what it
  does once it's on, only that it's worth building the stand for."**
- *"Leave It Behind"* (manual checkmark, after placing on the pedestal):
  **"Set the pendant on the stand and whatever's coming stops watching
  you and starts watching it instead — you can walk past the border
  line without it pushing back once that's done. You lose whatever the
  amulet was doing for you while it's off you, so it's a real trade,
  not a free one. And it's not indestructible sitting there. Worth
  thinking about what you're leaving behind to guard it."**

*Tier 1 branch:*
- *"Sharpened Scrap"* (craft the real Barbed Wire block — task target
  updated when Spikes got replaced, this text wasn't yet): **"Wire it
  right and it does two things at once — cuts and slows anything that
  tries to push through. Needs power to make, not just a workbench; the
  rig for that's already set up in here somewhere. Never seen barbed
  wire do more than that, but I only ever wired up the one line."**
- *"Something Crueler"* (craft `trapcraft:bear_trap`): **"A Bear Trap
  won't kill on its own, but it holds whatever steps in it in place —
  long enough for you or something else to finish the job. Resets
  itself once it's sprung, near as I can tell, so it's not a one-time
  thing. Never tested how many times before it actually gives out."**
- *"Turn the Crank"* (already shipped as part of the Andesite fix
  above, not new — this entry's earlier "A Long Way From Home" name was
  written before that shipped and never went live; use the real
  quest, don't create a second one for the same thing). Real task
  `create:hand_crank`. The build session already wrote its own real
  flavor text, referencing the Rolling Mill's real corrected location
  — carry that quest's existing text forward into the tree as-is if it
  already matches this house style, or give it the same tone pass as
  everything else here if it doesn't (it shipped before this tone
  rework was settled, so it may still be in the old voice). The
  proposed line below is this session's draft in case the existing text
  needs replacing, not a second quest to add: **"Whoever built the
  press and mill in here never finished wiring it up — there's a gap
  where a crank should go. Andesite's the missing piece, and I've never
  found it lying around close to home. The old structures out past the
  border might still have some, if you're willing to go looking."**

*Tier 2 branch:*
- *"Spark and Flame"* (craft `trapcraft:igniter`): **"Wire an Igniter
  to redstone and it lights the ground on a signal — undead catch fast,
  and fire keeps working after you've moved on to the next thing. Worth
  knowing it'll ignite anything flammable nearby too, not just what
  you're aiming at. Never traced exactly how far it spreads."**
- *"Herd Them In"* (craft `trapcraft:fan`): **"A Fan pushes anything
  caught in front of it, on a signal — mobs, items, doesn't
  discriminate. Point it right and it does the aiming for you, funneling
  things into whatever's actually going to finish them off. Still
  working out the best angle myself."**
- *"Waste Not"* (craft `trapcraft:magnetic_chest`): **"A Magnetic Chest
  pulls in anything dropped nearby once it's wired up — saves you
  walking back after a fight to collect what's left. Range seems to
  depend on the chest itself, not the signal. Never measured it
  exactly."**
- *"Wired for War"* (craft `medievalturrets:bow_turret_item`): **"An
  Auto-Turret keeps firing on its own once it's placed and stocked with
  arrows — it'll pick targets in range without you doing anything.
  First thing in this place that can actually watch a wall while you're
  somewhere else. Haven't tested what happens if it runs dry
  mid-wave."**

**Not pinned down here, left for the build session**: the real x/y
grid coordinates in the consolidated chapter's `.snbt` (the ASCII shape
above is the intent, not literal pixel positions); whether "Open It,"
"Not Just Jewelry," and both tier branches can share one dependency
cleanly in FTB Quests' own model or need an intermediate hub quest;
migrating quest IDs across the old chapter files without breaking
`1454951A7FB14A26` ("Sharpened Scrap")'s real completed-progress risk
on the live save, same care the Barbed Wire swap already took once.
Rewards (XP levels etc.) carry over unchanged from the old tables
unless the build session finds a real reason to adjust one.
- **Sent to build 2026-09-05** — design and full text settled through
  direct back-and-forth before dispatch, per standing instruction.

**Real bug worth remembering**: Fortify originally used a `#`-prefixed
tag reference as its item-task target, which FTB Quests' ItemTask
parses as a literal ResourceLocation and throws on — this **hard-crashed
the game on every single launch**, not a soft failure. Fixed by
targeting `trapcraft:spikes` directly. Avoid tag syntax in FTB Quests
item tasks unless it's confirmed supported.

**No dedicated FTB Quests SNBT-authoring tool/skill exists in this
environment** — checked twice, confirmed absent both times. All SNBT
so far has been hand-authored from the mod's own decompiled task
classes plus real shipped quest files (ATM10/Enigmatica6 on GitHub) as
reference, not guessed and not from an assumed tool.

Fuller quest book plan (Loot Tiers / Map Expansion / Shop chapters,
FTB Quests trade-quest or QuestShop-based shop) is still just a vision,
not scoped — see IDEAS.md.

**Tone rework, round 2 — the "ends on an open question" rule itself was
the problem, not the execution. Requested 2026-09-06, drafted and
confirmed by the user, ready to build.** Direct feedback on the shipped
book, read in full rather than as isolated drafts: "i hate the flvour
text on the quests. it doenst sound human. be a bit more literal rather
than crytic all the time." Real diagnosis, not a vague "make it
better": the round-1 house style above mandated that **every** entry
"ends on a genuine open question the writer doesn't have the answer
to" — a rule applied uniformly across all 19 quests produces exactly
what it sounds like, a repeated formula (11 of 19 quests literally end
with some variant of "never worked out/tested/traced/checked X") that
reads as artificial precisely because it's so consistent. The individual
sentences read fine in isolation (which is why the round-1 drafts got a
"looks good" at the time); the pattern only becomes obvious reading all
19 back to back in the real book, which is exactly what happened here.
**Fix**: drop "every entry must end on an open question" as a mandatory
rule. Keep the found-diary voice and the device itself (a genuine
unresolved question is still fine, and still true to several real
things about this pack — no known endless-phase ceiling, etc.) but use
it occasionally, not universally — most entries should just end on a
complete, practical thought. Confirmed via drafted before/after examples
(Borrowed Time, Turn the Crank, Not Just Jewelry) — user confirmed the
direction ("quest book fine... send it").

**Full revised text, all 19 quests, replacing every description in
`campaign.snbt` below (quest IDs are the real, unchanged snbt ids —
only the `description` field text changes, nothing else: no id/title/
task/reward/dependency/position changes anywhere in this pass)**:
1. `46AB9754465218CF` *"You're On Your Own"*: "Whoever was here before
   you didn't make it, but they left the place standing — that's not
   nothing. Sound the horn when you're actually ready, not before. Once
   you do, they're coming, and they don't stop until the wave's
   cleared."
2. `70DA454A61DDC3A1` *"Borrowed Time"*: "That sword and armor aren't
   permanent — you'll lose them a few waves in, five to be exact. Get
   real use out of them while you can, because whatever you find after
   has to carry you the rest of the way."
3. `42E42312C8B61976` *"Sound the Horn"*: unchanged — already solid,
   no tic to remove.
4. `7F675AEBC7301832` *"Thin the Horde"*: "Five's not much, but it'll
   tell you fast whether your gear can actually handle this. Count
   resets every wave. The numbers only go up from here, so don't get
   comfortable."
5. `3BFCD0E4AA8C5B36` *"Spoils of War"*: "Bags don't always drop, but
   when they do, grab them — better loot comes off tougher kills.
   Worth going after the harder targets for that reason alone."
6. `538A1BBC9A1B8EAC` *"Open It"*: unchanged — a real, specific
   anecdote, not a vague hedge, already reads human.
7. `7D3A5F912E6C0B48` *"Not Just Jewelry"*: "The shrine's been empty a
   while — whoever wore this before isn't coming back for it. Melt down
   enough gold and you can make another; the recipe's simple once
   you've got the materials. Wear it and you get stronger, and you can
   cross the border without the world pushing you back. Leave it on the
   stand and you lose that, but nothing else changes about what's
   coming for this place."
8. `216966530DE6E3DB` *"A Stone That Remembers"*: unchanged — already a
   complete thought, not an unresolved hedge.
9. `1454951A7FB14A26` *"Sharpened Scrap"*: "Wire it right and it does
   two things at once — cuts and slows anything that tries to push
   through. Needs power to make, not just a workbench; the rig for
   that's already set up in here somewhere."
10. `3F6D91E4A2C7B850` *"Something Crueler"*: "A Bear Trap won't kill on
    its own, but it holds whatever steps in it in place — long enough
    for you or something else to finish the job. Resets itself once
    it's sprung, so it's not a one-time thing."
11. `30DB900D8BD39277` *"Turn the Crank"*: "Whoever built the press and
    mill in here never got around to powering them — there's an open
    slot where a crank should sit. Take some planks and an Andesite
    Alloy to it and it'll finish the job. The andesite itself doesn't
    turn up close to home — you'll need to search the old structures
    out past the wall for it."
12. `689899208FC0ADF0` *"Watch the Walls Grow"*: unchanged — already
    solid.
13. `4B8F2D6A93E7C051` *"Leave It Behind"*: "The stand's been waiting a
    long time for something to hold. Set the pendant down and the wall
    stops being a wall — for you, anyway. You lose whatever it was
    giving you, but you can cross the border now. Just remember the
    pedestal's what's being watched, not you — don't leave it standing
    alone too long."
14. `60D8DCF2E4CB570F` *"Spark and Flame"*: "Wire an Igniter to redstone
    and it lights the ground on a signal — undead catch fast, and fire
    keeps working after you've moved on to the next thing. It'll ignite
    anything flammable nearby too, not just what you're aiming at, so
    mind what's next to it."
15. `22F3265BCDFA63B5` *"Herd Them In"*: "A Fan pushes anything caught
    in front of it, on a signal — mobs, items, doesn't discriminate.
    Point it right and it does the aiming for you, funneling things
    into whatever's actually going to finish them off."
16. `573EEB3757B78B97` *"Waste Not"*: "A Magnetic Chest pulls in
    anything dropped nearby once it's wired up — saves you walking back
    after a fight to collect what's left. Range depends on the chest
    itself, not the signal."
17. `74779308DEED321D` *"Wired for War"*: "An Auto-Turret keeps firing
    on its own once it's placed and stocked with arrows — it'll pick
    targets in range without you doing anything. First thing in this
    place that can actually watch a wall while you're somewhere else.
    Keep it stocked or it's just decoration."
18. `F58E263493C23094` *"The Reckoning"*: unchanged — already a
    complete, real statement, not evasive.
19. `9AFCCB27E483832B` *"No Turning Back"*: unchanged — the "I don't
    know how far it actually goes" line is an honest fact about the
    endless phase's real design (no authored ceiling), not a hedge
    being used as a crutch; keeping open questions where they're
    genuinely true is the point, just not applying it to all 19.

**Sent to build.**

**Shipped 2026-09-06.** Applied all 13 real text changes to
`campaign.snbt`. **Real catch made before deploying, not after**: the
repo's own tracked copy of `campaign.snbt` had silently drifted from
the live instance's real file - 3 real divergences found by diffing
them (a different reward id on "Turn the Crank", and completely
different quest ids plus a missing `dependencies` line on "The
Reckoning"/"No Turning Back", most likely from an in-game FTB Quests
editor interaction at some point). None of the diverged ids had player
progress recorded against them in the live save's own progress file
(checked directly, not assumed), so nothing was actually at risk this
time - but editing the repo's stale copy and deploying it over the live
file would have silently reset those 3 quests' ids, exactly the
"orphan real completed progress" risk this pack has hit before (see
the Barbed Wire work's own quest-id sync). Applied the 13 text edits to
the real live file instead, then synced that corrected version back to
the repo so both match exactly again.

**Reduce vegetation near spawn — requested 2026-09-06, specced, sent to
build.** Direct feedback: "Can we have less trees on spawn, its not
much of a wasteland when there are flowers, trees, grass everywhere!"
Real cause: the seed-independent spawn search (above) picks the nearest
of desert/badlands/savanna/savanna_plateau — and unlike desert/badlands
(naturally barren in vanilla), savanna and savanna_plateau have real
vanilla trees (acacia) and tall grass, which is very likely what got
found on the reported world. Two real, complementary pieces, not
either/or:
1. **Bias the search order toward desert/badlands first**, only
   falling back to savanna/savanna_plateau if nothing in the barer pair
   is within a reasonable range — addresses the root cause directly.
2. **A real vegetation-clearing pass around the base compound** at
   build time, regardless of which of the 4 biomes ends up being used —
   strip grass/tall_grass/flowers/small foliage (and trees, if any
   generated within range) in a radius around the compound. Same safe,
   already-proven imperative-clearing technique as the terrain-flatness
   leveling pass just shipped (`/fill`/`/setblock`, not a worldgen
   registry edit) — deliberately not touching biome feature-placement
   JSON, which this pack has a documented crash-risk history around.
Exact radius/threshold not pinned down here — first-pass numbers,
tunable after a real playtest, same as every other new constant in this
pack.

**Real playtest report, 2026-09-06 — still landing in savanna with
vegetation present, needs live investigation, not assumed fixed.**
Direct feedback: "im spawning in a Savannah and the vegetation still
there." This could be either a real regression in the shipped fix, or
the fix working exactly as designed (savanna genuinely was the nearest
wasteland biome on this world, desert/badlands genuinely out of range —
the search's own documented fallback behavior, not a bug) with the
vegetation-clearing piece specifically failing to run or not covering
what's actually there. Needs a real diagnosis against whatever save
this was reported on (same live-instance-first technique as always) —
not re-guessed from the spec alone. **Real, easy-to-miss candidate
worth checking first**: this fix needs both a full restart and a
genuinely fresh world (documented deployment note above) — confirm the
report actually came from a world created after that restart before
looking for a code bug.

**Resolved as a real scope gap, not a bug in what shipped — direct
follow-up 2026-09-06.** Confirmed on a genuine fresh world: "savanna is
still looking far too green. lose this biome, stick with wasteland
feel." Real root cause: the earlier fix only *deprioritized* savanna/
savanna_plateau (tries desert/badlands first), it never removed them —
so the search still lands there whenever desert/badlands aren't close
enough, exactly as designed at the time. And vegetation-clearing only
ever addressed a radius around the compound; it was never going to fix
the green grass-block ground and visible landscape stretching to the
horizon beyond that, since savanna's real problem is its base terrain
color, not just its foliage. **Real fix: drop savanna/savanna_plateau
from the search entirely** — `wasteland.json` and
`playtest_starter_kit.js`'s `LEAFY_WASTELAND_BIOMES` fallback both go,
leaving desert/badlands as the only acceptable outcome. **Real
consequence to handle, not ignore**: without the savanna fallback, the
search needs to be trusted to actually find desert/badlands on its own
— the existing 1200-block radius was sized assuming a fallback existed
if it failed. Needs a real, generously wider radius (`getBiome` calls
are cheap, ~0.3ms each per the original verification, so a much larger
search is affordable) and a real answer for what happens if genuinely
nothing is found even at that radius — don't leave that case undefined.

**Shipped 2026-09-04 (real commit date, not the dispatch's own
2026-09-06 dating).** `LEAFY_WASTELAND_BIOMES` removed entirely from
both `wasteland.json` and `playtest_starter_kit.js`; `findWastelandSpawn`
now searches only `BARE_WASTELAND_BIOMES` (desert/badlands), radius
widened 1200 → 4000 — sized against real data already in this pack's own
history, not guessed (the vegetation Y-range fix found desert/badlands
sitting ~3650 blocks from a real savanna_plateau landing point on one
actual save). The existing origin-fallback (log + spawn at (0,0)) is the
real, defined answer if the widened search still comes back null - not
left undefined, and deliberately does NOT fall back to
savanna/savanna_plateau, since reinstating that would silently undo the
whole fix. Verified live: multiple real fresh-world sandbox runs each
found a genuine desert biome only, at real distances up to ~3600 blocks
from origin (confirming the widened radius was actually necessary, not
just generous). **Real limit**: fresh-world only, doesn't retroactively
change the current live save's spawn.

**Real bug, needs live diagnosis — horses still spawning despite the
passive-mob fix.** Direct report: "horses are spawning, remove them."
Checked `no_passive_mobs.js` directly before assuming what the bug is:
`minecraft:horse` is already in `PASSIVE_MOB_TYPES` — this is not a
missed-entry gap like it might look like from the outside. Something is
spawning horses through a path the `EntityEvents.spawned` hook doesn't
catch (structure-placed horses in a village/stable are a real candidate
worth checking first, given this pack's structure mods, since NBT-piece
entity placement may not fire through the same spawn event vanilla's
own natural-spawn/chunk-population paths do — not confirmed, a
starting hypothesis, not the diagnosis). Needs real live investigation
against the actual reported case, not another guess at the mob list.

**Diagnosed and fixed 2026-09-04, hypothesis confirmed exactly right.**
First isolated the natural-spawn path from the structure-placement path
via live testing, not assumed: forced real chunk generation in a fresh
desert area (where the widened spawn search above actually lands) and
confirmed `no_passive_mobs.js` DOES reliably catch and discard horses
spawned through the normal chunk-population pass (10/10 caught live,
same mechanism already verified for cows/sheep/etc). The real bug: **The
Lost City's `villages_city_main_tile1.nbt`** (one specific village piece,
confirmed the only offender across every currently-installed structure
mod - checked all of Philip's Ruins/Big Lost City/Abandoned Urban/
postapocalypse_structures/the_lost_city's real structure NBTs directly,
205+ files) bakes 3 real horse entities directly into its structure
template as saved entity NBT (id/UUID/Age/Motion tags), placed via
`StructureTemplate#placeInWorld`'s entity-placement step when that piece
generates - a genuinely different code path from natural spawning that
doesn't fire `EntityEvents.spawned` at all (checked KubeJS's real
`EntityEvents`/`LevelEvents`/`WorldgenEvents` bindings directly by
decompiling the class - no catch-all "entity joined level" event is
exposed at all in this build, so there was no event-based fix
available). **Real fix, surgical not sweeping**: parsed the real
structure NBT with `prismarine-nbt`, found the entity list has 20 real
entries (11 villagers, a painting, item frames, an armor stand, and the
3 horses - a normal, intentional village layout, not something to
delete wholesale), stripped only the 3 `minecraft:horse` entries, and
shipped the rewritten file as a `pack/kubejs/data/the_lost_city/
structures/villages_city_main_tile1.nbt` override - same datapack-layer
override mechanism already used for every JSON worldgen file this
session, just for a binary NBT resource instead. Verified byte-for-byte
that blocks/palette/size are completely unchanged, only the entity list
differs. **Verified live, not just offline**: booted a sandbox with the
override loaded, placed the real template directly (`/place template
the_lost_city:villages_city_main_tile1`), confirmed real villagers still
present (`VILLAGER_FOUND`) and zero horses anywhere in the world
afterward (`NO_HORSES_ANYWHERE`).

**Broader than horses, confirmed by the user's own follow-up: "not just
horses, other mob types too."** Real, not a surprise once the horse
root cause was understood - if one structure mod's authors baked
atmospheric animals into their .nbt files, others likely did too. Wrote
a general version of the horse fix (`strip_passive_mobs.js`, scratchpad
tool, not shipped as a pack script) that parses every structure `.nbt`
across all 5 currently-installed structure mods with `prismarine-nbt`
and strips any entity matching `no_passive_mobs.js`'s own real
`PASSIVE_MOB_TYPES` list, not just horses. Real, much wider result than
expected: **25 files across 3 mods**, not 1:
- **the_lost_city** (7 files): `farm1/2/3.nbt` (real farm pens - 4 pigs,
  6 sheep, 4 cows), `t_big_house.nbt` + `t_big_house_template.nbt` (1 bat
  each), `villages_city_main_tile1.nbt` (3 horses, the original find),
  `villages_city_main_tile2.nbt` (3 chickens).
- **big_lost_city** (22 files): almost entirely atmospheric bats in
  skyscraper interiors (1-19 per file, real author decoration for
  "abandoned building" mood) plus a handful of glow_squids in a couple
  of the taller ones.
- **abandoned_urban** (1 file): `bigrig.nbt`, 2 bats.
- **philipsruins**: checked, genuinely clean - zero baked passive mobs
  anywhere in that mod.
Every rewritten file verified byte-identical on blocks/palette/size
(spot-checked across all 3 affected mods, only the entity list differs)
and the full batch verified via a clean sandbox boot with zero errors
tied to any of the 25 overrides. Shipped as `pack/kubejs/data/
{the_lost_city,big_lost_city,abandoned_urban}/structures/` overrides,
same datapack-layer mechanism as the single-file horse fix above, just
at real scale once the actual scope was checked instead of assumed.

**Real gap, previously flagged as optional and deprioritized —
structures generating right next to spawn.** Direct report: "the
generated structures have spawned right outside my base." This was
explicitly called out as a possible follow-up when the seed-independent
spawn search was first specced ("a real 'verify nothing landed too
close, reroll if so' check would add defense-in-depth but isn't
required") — that was wrong to defer; a spawn point search that only
checks biome, never checks for a nearby structure, has no way to avoid
exactly this. **Real fix: the spawn-point search needs a real
structure-proximity check as part of what makes a candidate point
acceptable**, not just a biome match — reject a candidate near an
already-generated (or about-to-generate) structure and keep searching,
using the same kind of real, direct-API lookup already proven for the
biome search rather than parsing command feedback text. Exact technique
and minimum safe distance left for the build session to verify, not
guessed here.

**Shipped 2026-09-04.** Real technique: vanilla's own
`ChunkGenerator#findNearestMapStructure` - the exact method `/locate
structure` itself calls internally, reached via real Java reflection
since its runtime name is SRG-obfuscated in this build
(`m_223037_`, found by matching every 5-param method on the generator
class by parameter shape). Every step of the reflection chain was
live-verified before trusting it, including two real bugs caught and
fixed along the way, not assumed safe from an isolated probe:
- `Registry#wrapAsHolder(T)` (the obvious-looking shortcut once you
  already have a raw Structure object) throws "This registry can't
  create intrusive holders" for datapack-driven registries - only works
  for a few core registries vanilla special-cases. Fixed by enumerating
  every currently-registered structure directly via `Registry#holders()`
  instead of looking any up by id - simpler and more complete than a
  hand-curated list, can't miss a mod's structure through a typo.
- **Real, non-obvious bug**: `Class#getMethods()`'s ordering is
  explicitly unspecified by the JLS, and the Structure registry has FOUR
  real 0-arg Stream-returning methods (`getTags`, `getTagNames`,
  `holders`, `stream`) - a plain shape match, even a loose
  `.includes('Holder')` check against the generic signature (the tags
  stream's `HolderSet.Named` also contains that substring), picked a
  different one between separate JVM launches: worked in one boot, threw
  a real "Pair cannot be cast to Holder" in the very next one, same code,
  same mod set. Fixed with a precise discriminator - the exact nested
  class name `Holder$Reference` in the real generic return type string.
  A second, same-shaped ambiguity was found and fixed the same way in
  `java.lang.Integer` (`valueOf`/`decode`/`getInteger` all share the
  1-arg(String)->Integer shape; `getInteger` reads a JVM system property
  and would have silently returned null) - checked by name, not shape
  alone, once the pattern was known to be real.
`STRUCTURE_MIN_DISTANCE` set to 200 blocks, justified against this
pack's own real worldgen border-growth curve (`base_expansion.js`): the
full 8-wave campaign's cumulative growth caps the worldborder diameter
at 125, comfortably under 200. **Verified live end-to-end**: a real
sandbox run found a genuine desert spawn candidate and computed a real
208.6-block distance to the nearest of the pack's 135 registered
structures, correctly accepting it against the threshold - not a trivial
always-pass case. Full technical writeup (every reflection step, every
bug, every fix) lives as comments directly in
`playtest_starter_kit.js` itself. **Real limit**: fresh-world only,
same as every other spawn-time change in this pack.

**Real regression reported 2026-09-04, root-caused and fixed the same
day**: a live playtest found the base structure spawning on top of other
structures - directly contradicting the "verified" note above. Root
cause, found via live instrumented diagnostic against the real save's
exact seed: the check itself worked correctly, but Philip's Ruins' 14
structure_sets were all packed at vanilla-village-tier density (16/8
chunks), which made 100% of biome-matched wasteland candidates within
the full 4000-block search fail the 200-block clearance check - and when
the search came back empty, the login handler fell back to
`spreadplayers 0 0` with zero structure-proximity protection at all.
That unchecked fallback, not the 200-block number, is what actually
produced the overlap. Fix: Philip's Ruins tripled in spacing/separation
(16/8 → 48/24 chunks - `ancient_dungeon` and `desert_structures` alone
had been the nearest structure for 67.5% of rejections),
`abandoned_urban:motel` bumped similarly (24/12 → 40/20), and
`findWastelandSpawn` now tracks the best real candidate seen during the
search and returns that instead of surrendering to the unchecked origin
fallback when nothing clears the full threshold - so that fallback path
is now unreachable as long as any wasteland biome exists anywhere in the
search radius. Verified live on the real seed: clean boot, real non-null
result in ~1.2s. Shipped once it reached "stable boot, no literal
overlap" per direct instruction, rather than chasing 0%-rejection -
further spacing/threshold tuning continues as a background task. Same
fresh-world-only limit as above applies to this fix too.

**Eliminate passive mobs entirely — requested 2026-09-06, specced,
ready to build.** Direct feedback: "passive mobs are spawning. I dont
want passive mobs in the game at all." Real technical picture, not
assumed: `doMobSpawning false` (already set at first login in
`playtest_starter_kit.js`) blocks vanilla's *ongoing* per-tick natural
spawn cycle, but does **not** block the separate, one-time animal
population pass vanilla runs when a chunk is *first generated* — a
different mechanic entirely. That's very likely what's actually being
seen: leftover animals from initial chunk generation, not new ongoing
spawns, meaning the existing gamerule was never going to catch this on
its own. Also, "at all" has to mean not just at spawn but everywhere the
player ever explores, since new chunks keep getting this same one-time
population pass as the world expands. **Real fix, technique to verify,
not guessed**: hook a real spawn-time KubeJS event (e.g.
`EntityEvents.spawned`, exact API to confirm) and discard/remove the
entity immediately if it matches a passive-mob check — event-driven,
so it costs nothing when nothing spawns, unlike a recurring tick-based
scan (this pack's own standing performance-scrutiny principle). **Real
open question, needs a decompiled check before shipping, not a
guess**: whether to filter by each entity's real vanilla `MobCategory`
(`CREATURE`/`AMBIENT`/`WATER_CREATURE`/etc.) or an explicit list of
real animal type ids. The category approach is more complete
(automatically covers anything with the right category, modded animals
included) but carries a real risk of also matching things this pack
does NOT want removed — villagers specifically need checking, since
TFTH's own "Flesh Villager" mechanic corrupts real villagers, so
deleting them on spawn could quietly break that interaction; iron
golems/wandering traders need the same check. An explicit passive-
animal id list (cow/sheep/pig/chicken/horse/rabbit/etc.) is slower to
write but has zero risk of an unintended match — pick whichever the
real `MobCategory` check confirms is safe, don't guess which one is
correct without checking.

**Shipped 2026-09-06, new `no_passive_mobs.js`, two real findings from
live verification, not shipped on the first guess.**
- **The category question resolved by sidestepping it, not answering
  it.** `EntityType`'s own static registrations in this exact build are
  fully SRG-obfuscated field names with no clean id→category mapping to
  decompile - rather than force that lookup, went straight to an
  explicit passive-animal id list (30 real ids: cow, sheep, pig,
  chicken, rabbit, horse, donkey, mule, llama, trader_llama, cat,
  ocelot, parrot, turtle, cod, salmon, pufferfish, tropical_fish, squid,
  glow_squid, axolotl, bat, panda, goat, frog, tadpole, sniffer,
  strider, allay, mooshroom). Villagers/iron golems/wandering traders
  are simply never in the list, so there's no overlap risk regardless
  of their real category. Deliberately excludes genuinely neutral/
  conditionally-hostile mobs (wolf, fox, dolphin, polar_bear, bee) -
  "passive" doesn't obviously cover something that can still attack
  back.
- **Real finding: the theoretically better hook doesn't actually work
  for this spawn path in this build.** Tried `EntityEvents.checkSpawn`
  first (backed by `CheckLivingEntitySpawnEventJS`, real `.hasResult()`/
  `event.cancel()` support confirmed by decompiling the class) since
  denying a spawn before the entity exists is strictly better than
  discard-after. Verified live with a diagnostic logger: forced fresh
  chunk generation in open plains multiple times, real cows/sheep spawned
  every time, and the `checkSpawn` handler's own log line never fired
  once - it simply isn't invoked for vanilla's natural chunk-population
  spawn pathway here (`/summon`-triggered spawns don't reach it either).
  Switched to `EntityEvents.spawned` + `entity.discard()` instead -
  confirmed both firing reliably and actually removing the entity in the
  same live test. Final check across 8 mob types (cow/sheep/pig/chicken/
  horse/rabbit/llama/goat) in a freshly generated area: zero present.

**Shipped 2026-09-06, both pieces, verified live.**
- `findWastelandSpawn()` split into a two-phase search:
  `BARE_WASTELAND_BIOMES` (desert/badlands) tried first out to 1200
  blocks, only falling back to `LEAFY_WASTELAND_BIOMES` (savanna/
  savanna_plateau, unioned with the bare pair) out to 2000 if nothing
  bare turned up. Verified live on the real current seed
  (`790635723259132656`, the save this exact bug was reported from):
  desert was 2150 blocks from origin and badlands 5113 (both correctly
  beyond the 1200 bare-search radius), so the search correctly fell
  through to the leafy pair and found savanna_plateau at 1267 blocks -
  confirmed by cross-checking against vanilla's own `/locate biome`.
- Vegetation-clearing pass added, keyed by a real block-id list, using
  `/fill ... replace` per block type (removes only matched blocks,
  leaves solid ground untouched - confirmed live: ground stayed solid
  after clearing). **Real bug caught and fixed before shipping**: the
  first-pass block list included `minecraft:short_grass` - wrong for
  this exact 1.20.1 build, where the single-block grass plant is still
  named plain `minecraft:grass` (the rename to `short_grass` didn't
  happen until 1.20.3+). Caught via a direct `/setblock` validity test
  (`short_grass` alone threw "Unknown block type", everything else in
  the list passed) before it ever shipped silently broken. Verified the
  corrected full list live: placed real grass/tall_grass/dandelion/
  acacia_log/acacia_leaves, ran the exact shipped fill/replace
  commands, confirmed every one cleared to air while the ground block
  underneath stayed solid.

**Real follow-up bug found and fixed 2026-09-06, direct playtest report
on this exact fix: "im spawning in a Savannah and the vegetation still
there."** Diagnosed live on the actual reported world before assuming
anything was broken - confirmed the savanna_plateau landing itself was
correct (desert/badlands were genuinely 3600+ blocks away on that
world's real seed, well beyond the bare-pair search radius, so the
fallback behaved exactly as designed). The real bug: the clearing
pass's Y-range only started at `floorY+1`. On genuinely uneven plateau
terrain, `floorY` can land well above where a nearby tree is actually
rooted - confirmed directly on the reported world: `floorY` was 11, but
real acacia trunks inside the vegetation margin were rooted as low as Y
5-8, entirely below the old range, so they were never touched. Fixed by
extending the range well below `floorY` too (`floorY-16` to
`floorY+16`), split into fixed-size Y chunks to stay under vanilla's
real 32768-block-per-`/fill` limit (the full margin+height volume can
exceed that in one call). Verified live on the exact reported world and
coordinates: 2 real trees that survived the original clearing pass both
cleared to air under the fixed range, while real solid ground several
blocks below stayed untouched.

**Standing process, not a one-off**: the quest book is the tutorial —
whenever a new mechanic gets fleshed out to "planned" status in this
file, check whether it needs a new quest (or a refinement to an
existing one) to actually teach the player about it, and draft that
alongside the mechanic's own design rather than after the fact. Don't
let quest coverage silently fall behind what's actually buildable.
**Refined after the Tier 2 draft got real feedback**: one quest
describing several distinct items in its text is not the same as
actually teaching them — if a tier/feature has multiple distinct
craftable items, each one gets its own quest (one task, one specific
item), grouped into that tier's own chapter, rather than one quest with
a paragraph naming everything. The Tier 1/Tier 2 chapters above are the
first case this applied to.

---

## Real playtest feedback batch, 2026-09-04

27 items from a real extended playtest session, gathered and specced in
one pass per direct request ("gather all these feedback points ive
raised and we can spec the fixes out"). Each item below reflects real
current-state findings (file/line-checked against the actual scripts,
not assumed), not guesses.

**Real status as of 2026-09-04: 15 of 27 items done and shipped**, sent
to build the same day. QUEUE.md's own checklist entry (same "Real
playtest feedback batch, 2026-09-04" title) carries the authoritative
per-item status/real-shipped-detail as a literal 1-27 list matching the
user's own original numbering - check there for what's done vs. still
open, not this section (which stays as the original spec/reasoning for
each item). Real commit-timestamp note: shipped 2026-09-04, not the
peer's own dispatch dating from earlier the same conversation.

### Starting base — strip decoration debt, fix layout

- **Ditch the doomsday decorations.** `doomsday_decoration` is only
  placed in exactly 2 spots — flanking the gate
  (`playtest_starter_kit.js:545-546`, a `barrel` and a `woodencrate`).
  Removing both means the mod becomes fully unused in the pack (its only
  other footprint is the lang-file override for those same 8 keys,
  `pack/kubejs/assets/doomsday_decoration/lang/en_us.json`) — **real
  bonus**: this is a genuine candidate to uninstall the mod outright and
  delete the lang override with it, not just stop placing its blocks,
  matching the standing "keep footprint small" principle.
- **Starter base structure trims** (all in `playtest_starter_kit.js`):
  - Cobweb debris on the weak wall section (`:511`) — remove.
  - The "weird dirt blocks with a fence on top" are the grave markers
    (`graveSpots`, `:650-658` — `coarse_dirt` + `oak_fence`, 3 of them).
    Worth flagging before cutting: these carry real flavor-text intent
    ("whoever held this before you," tied to wave 5's gear-removal beat)
    — removing them is fine if it's purely a look call, just confirming
    it's not a case of not recognizing what they were for.
  - The decorative Barbed Wire line just outside the gate (`:547-550`,
    `createaddition:barbed_wire`) — this is cosmetic-only dressing, not
    the real craftable Tier 1 defense item (that stays, it's the
    player's own crafted output). Remove the decorative line.
  - Entrance: currently a single vanilla `oak_door` at `doorX, z1`
    (`:517-518`), 1 wide. Change to a genuinely open 3-wide, 3-tall gap
    (`doorX-1` through `doorX+1`, `wallY0` through `wallY0+2`), no door
    block at all.
  - **Cauldron, tripwire hook, and the "bed-like" blocks upstairs are
    NOT placed by this script** — they're not in
    `playtest_starter_kit.js` anywhere. They must be baked into the
    Abandoned Brick House structure's own NBT (`/place template
    postapocalypse_structures:abandoned_brick_house`, `:685`), the same
    way the wet_sponge foundation layer and the original mis-read Press
    spot were. Needs the same technique already proven for those two:
    decompile `abandoned_brick_house.nbt` directly to find the real
    local coordinates, then a targeted `/setblock`-to-air (or `/fill
    replace`) pass after the `/place template` call — not guessed
    coordinates. The "bed-like blocks" are probably a decorative
    mod-furniture block reading as a bed, not an actual bed — worth
    confirming what block it actually is before deciding whether to
    clear it or reskin it.
  - Loot: the building's 8 chests/barrels already carry real vanilla
    `LootTable` refs (`postapocalypse_structures:chests/{trash,cobwebs,
    food}` — this pack's own earlier loot buff already touched these
    tables). Direct ask: **remove the starter-base chests altogether**,
    not just nerf their tables — reads as "loot lives outside the
    border, not at home," consistent with the standing "loot shouldn't
    hand out shortcuts to what's already at home" principle (see "Loot
    bags" section). Same
    decompile-then-clear technique as the cauldron/tripwire/bed items —
    find the chest/barrel positions in the NBT, clear them (or their
    `LootTable` tag specifically) after placement.
    **Shipped 2026-09-04, but real correction along the way**: the doc's
    own "8 chests" count was wrong against the actual file — only 5 real
    barrels exist, no chests. The first pass removed them via
    post-placement `setblock ... air` (matching the cauldron/tripwire
    technique), which turned out to be the wrong half of "or their
    `LootTable` tag specifically" above - a real live playtest found
    loot scattering on the floor at spawn, because destroying a
    `LootTable`-backed container makes vanilla resolve the table into
    real items on the way out (`Containers.dropContentsOnDestroy` reads
    each slot, which lazily unpacks the loot table) rather than dropping
    nothing. Re-fixed by clearing the `LootTable` tag directly in the
    raw NBT before placement instead (new datapack override,
    `data/postapocalypse_structures/structures/abandoned_brick_house.nbt`)
    - the exact "or their LootTable tag specifically" approach this spec
    called out as an option originally. Verified live: barrels place
    with `Items: []`/no `LootTable` tag, zero item entities on the
    ground after the same removal sequence runs.
- **Push the front wall out 3 blocks** so the pedestal (`centerX,
  centerZ = doorX, z1-4`, `:566-567`) isn't right at the opening —
  direct ask, a fixed 3-block shift to `z1`/gate-side geometry. Small,
  mechanical change to the existing wall-footprint math.
- **Reinforce the whole house — decided, full uniform coverage, not the
  walls' falloff pattern.** Current state: SecurityCraft reinforcement is
  *only* on the perimeter courtyard walls (falloff-by-distance-from-gate,
  `:457-506`) — the Abandoned Brick House itself (the actual building)
  has zero SecurityCraft coverage, since it's a `/place template` stamp
  of the mod's own NBT (real brick/wood materials, not swappable in bulk
  without checking what SecurityCraft actually has reinforced
  equivalents for). Asked falloff-like-the-walls vs. full uniform
  coverage, given the house is "kinda the permanent fixture throughout
  the game"; chose full uniform. Needs the same NBT-read to find the
  house's actual exterior wall block palette, then swap every block that
  has a real SecurityCraft reinforced equivalent — no distance falloff.
  Blocks with no reinforced equivalent (likely brick/specific wood) stay
  as-is; flag honestly which parts of the house end up covered vs. not,
  rather than silently claiming full coverage if the material palette
  doesn't fully map.
- **Revisit the house structure itself** — floated as a maybe ("I may
  also want to revisit this house structure to something a little
  cooler"), not a firm ask yet. Parking as an open idea rather than
  speccing a swap now: worth a look at the other buildings already
  available across the installed structure mods (Abandoned Urban,
  Philip's Ruins, Big Lost City) the same way the original Red
  Mansion → Abandoned Brick House swap compared options, if/when this
  gets picked up for real.
- **Crafting table → Crafting Station Improved.** The building's
  pre-furnished crafting table (same NBT-furniture situation as the
  cauldron/tripwire/bed items above — not scripted, needs the same
  decompile-then-patch technique) should become Crafting Station
  Improved's own bench block instead of vanilla `crafting_table`. Real
  block id to confirm from the installed mod's registry before writing
  the patch, not guessed.
- **Remove the cauldron and tripwire hook** — grouped with the other
  NBT-furniture items above, same technique needed.

### Pedestal

- **Visible health bar near the pedestal — decided, always-visible in
  range, not look-only.** Real technical picture: Jade is already
  installed (`config/jade/` on the live instance) but its info panels
  come from registered Java providers — there's no config-only way to
  add a custom HP readout for a KubeJS block's own persistent-data value
  through Jade without real Java code, so it's not a fit here. Asked
  always-visible-in-range vs. only-when-looking-at-it; chose
  always-visible. Real vanilla boss bar (`/bossbar` family),
  shown/updated from the same throttled tick poll `pedestal_health.js`
  already runs, visible whenever the player is within some real distance
  of the pedestal — matches this pack's established "tick-poll + real
  vanilla command" pattern, no new client-rendering surface needed.
- **Wave 8's Flesh Hysterizer one-shot the pedestal — resolved by direct
  decision, not a numeric retune.** Asked which fix direction
  (rate-limit clustering damage / scale pedestal HP / retune this mob's
  damage); real answer: "remove the mob. remember i said i didnt like
  the TFTH mob types." Same decision as the roster audit below —
  `the_flesh_that_hates:plaquethreelegcreature` ("Flesh Hysterizer,"
  55/7/4) is cut from wave 8 (`wave_spawner.js:167`) and every other
  place `WAVE_MOB_TYPES`/`PEDESTAL_WAVE_MOB_TYPES`/`HOSTILE_TYPES` is
  duplicated (`mob_aggro.js`, `pedestal_health.js`, `wave_status.js`,
  `loot_bag_drops.js`'s `LEGENDARY_MOBS`). The clustering-sum mechanic
  in `pedestal_health.js` itself (every mob in range contributes its
  full attack_damage every second) stays as-is — not proven to be a
  problem once the specific overtuned/disliked mob is gone, no need to
  add rate-limiting speculatively. Needs a real replacement pick for
  wave 8's slot so the "toughest hand-authored mix" doesn't just get
  weaker — see the roster audit below for a concrete, already-verified
  candidate.

### Mob roster audit

Direct ask: "the flesh that hates mobs I dont really like... can you
list the roster to make sure it doesnt leave a gap in variety" —
followed immediately by "I actually like the brute mob so thats an
example of doing an audit," and separately flagging "another brute mob
not from TFTH that looks more zombie like." Reads as a per-mob visual
audit, not a blanket TFTH removal — the user has already named 2
keepers, and (see the pedestal entry above) has since confirmed a third
decision directly: cut `plaquethreelegcreature` ("Flesh Hysterizer,"
55/7/4) outright, not just retune it. Current TFTH roster in
`WAVE_MOB_TYPES` (`wave_spawner.js:177-197`), 9 mobs: `flesh_human`,
`flesh_villager`, `flesh_dog`, `plaquecreaturetwo`, `flesh_suffer`,
`bruteplaquecreatureone` ("Flesh Brute I," 45/4/5 — **confirmed
keeper**), `flesh_hunter_two`, `flesh_boomer`,
~~`plaquethreelegcreature`~~ (**confirmed cut**). The "other brute... not
from TFTH" is almost certainly one of Mutants and Zombies'
`mutantszombies:zombie_brute` or `mutantszombies:mutant_brute` — both
real, both already in the roster; needs the user to confirm which one
by name/appearance, not guessed here. **Real spec for the remaining 7
TFTH mobs' audit**: the cleanest way to actually judge "does this look
right" is a live in-game look, not a name-based guess from this end —
either the peer summons each of the remaining 7 TFTH mobs in a sandbox
and screenshots them, or the user eyeballs them next session
(`/summon the_flesh_that_hates:<id>` for each). Whichever TFTH mobs get
cut, replace them with equivalent-tier picks from the already-approved
non-TFTH sources so wave variety/count doesn't shrink — same "replace,
don't just delete" pattern the original Flesh Unseen substitution used.
**Superseded 2026-09-04**: real playtest feedback skipped the per-mob
audit entirely in favor of removing TFTH from the roster outright (one
death sound kept for atmosphere - separate open item, see below). Full
replacement mapping/rationale lives as a comment directly in
wave_spawner.js's WAVES header. Real gaps found and fixed in the same
pass, not just the 5 files originally scoped: TFTH ids were ALSO
present in `config/undeadnights_horde_mobs_config.json` (the endless-
phase horde pool - would have kept spawning TFTH mobs post-wave-8 even
after the roster removal) and `config/epicsiegemod-common.toml`'s own
`targetingMobs` (which, separately, was missing `mutantszombies:crawler`
entirely even before today - a real pre-existing gap, now fixed
alongside the TFTH cleanup). `plaquethreelegcreature`'s "confirmed cut"
above turned out to be incomplete too - it was still present in both of
those same 2 files, meaning the original Flesh Hysterizer removal never
actually reached full completion.

**Wave 8's now-empty slot (from cutting Flesh Hysterizer) — real
candidates, not yet picked.** Two mobs from Mutants and Zombies were
verified real and summonable during the original roster-pivot pass but
never actually given a wave slot — a real, pre-existing gap, not
something new: `mutantszombies:spitter`/`blister_zombie`/
`split_head_zombie` are already classified as Epic-tier loot
(`loot_bag_drops.js`'s `EPIC_MOBS`, `:60`) despite never appearing in any
`WAVES` entry, and `mutantszombies:crawler` (the mob the Advanced Wall
Climber API dependency exists for) was confirmed real-summoned during
verification but was never added to a loot tier *or* a wave slot either.
Any of these four would slot naturally into wave 8 without installing
anything new — genuine choice, not a technical question, left for the
user.

- **Barbed wire isn't damaging Mutant Brutes.** Real open question, not
  diagnosed yet: `createaddition:barbed_wire` is a Create Crafts &
  Additions block with its own built-in damage mechanic (presumably a
  contact-damage tick, not something this pack's own scripts control) —
  needs checking whether that mechanic has a damage-type/resistance
  interaction that Mutant Brute (or "brute"-class mobs generally) is
  immune to, versus just not being strong enough to matter against a
  higher-HP mob (which would read as "working as intended, wrong
  expectation" rather than a bug). Real follow-up question in the
  request itself — "what other trap should i be prioritizing to damage
  it" — needs Trapcraft's Spikes/Bear Trap (both still installed,
  replaced only as the *decorative* gate dressing, not removed from the
  mod list) and Medieval Defense Turrets checked against the same
  question before recommending one, not guessed.

### Loot

- **Boost the gold ingot roll.** The amulet's real recipe
  (`amulet_pedestal.js:77-83`) costs 8 `gold_ingot` — a hollow ring, no
  substitute material. Current gold sources: BountyBags Rare tier
  (`rare.json`, weight 30/~163 total across a 3-roll pool, 4-6 per hit),
  `structure_loot_progression.js`'s bonus pool (weight 20, 2-3 per hit),
  plus base vanilla amounts in the Abandoned Brick House's own
  `food`/`cobwebs` chest tables. Direct ask is to let players reach 8
  gold sooner — bump one or more of these (Rare tier's weight/count is
  the most central one, since it's not gated by distance-from-base like
  the structure bonus pool is) rather than touching the recipe itself.
  Exact numbers not chosen here — first-pass tuning call for whoever
  builds it, same as every other numeric tuning item in this pack.
- **Notify the player what they got when opening a loot bag.** Real
  open question: BountyBags' own vanilla "gift" loot-table type
  (confirmed the format from `rare.json`'s `"type":
  "minecraft:gift"`) drops items into the inventory directly — need to
  check whether the mod itself already fires a chat/toast message on
  open (a real per-mod behavior to check, not assume either way) before
  building a custom notification. If it doesn't, a KubeJS item-use or
  inventory-change hook comparing before/after contents (or reading the
  loot table's own roll result directly, if BountyBags exposes that to
  an event) would need to print the gained items — exact hook TBD,
  needs the mod's real API checked first.

### QoL / UX

- **Mob outline mod.** User named "Re:Entity Outliner" directly — real
  check (not assumed from the name matching): it **does** have a real
  Forge 1.20.1 build (author SioGabx, CurseForge listing confirmed,
  86.5K+ downloads), not Fabric-only as might be assumed from some
  older listings. Client-side only, custom keybinds to open an entity
  selector and toggle outlining, glows selected entity types through
  obstructions at any distance — matches the ask (highlighting wave
  mobs) directly. Needs the standard verification pass before install
  (real file hash, exact Forge 1.20.1/MC 1.20.1 file, no stray
  dependency) but no alternative-mod research needed — this is a direct
  hit.
   Sources: [Re:Entity Outliner (CurseForge)](https://www.curseforge.com/minecraft/mc-mods/re-entity-outliner), [GitHub — SioGabx/ReEntityOutliner](https://github.com/SioGabx/ReEntityOutliner)
- **Middle-mouse-click inventory sort — likely already works, needs
  live confirmation before installing anything new.** Real finding: the
  mod already installed for this pack's Phase 4 QOL batch is "Inventory
  Sorter" by **cpw** (`config/inventorysorter-client.toml`, both
  `sortingmodule` and `wheelmovemodule` already `true`) — and cpw's
  Inventory Sorter's own real feature set is documented as including
  middle-click sorting and mousewheel item-move out of the box. That
  means the ask may already be satisfied by what's installed, not
  missing — "Inventory Sorter Buttons" (a different, separate mod) would
  likely be redundant and risk a real conflict (two mods hooking the
  same click). **Real next step: confirm live whether middle-click
  already sorts with the current config** before installing anything
  else — don't add a second mod on the assumption the first doesn't do
  it.
- **World border rendered on the minimap/world map.** Real open
  question, not confirmed either way: Xaero's Minimap and World Map (the
  world-map plugin) may already render the world border automatically
  by default with no config toggle needed — genuinely unchecked here,
  needs a live look before assuming a setting or a different mod is
  required.
- **Quest book keybind → Tab, permanently.** Needs a real shipped config
  override, same technique as the Supplementaries Amendments-popup fix
  (build from the live instance's own generated file, not hand-typed) —
  FTB Quests' keybind isn't a packwiz-tracked config file yet (none
  found under `pack/config/ftbquests/`), so this needs pulling the real
  key from the live instance's `options.txt` (`key_*` line) once set
  once in-game, then shipping that as tracked config so it applies on a
  fresh install too — same "diagnose/build from the live instance"
  pattern as everything else that only materializes after a real client
  launch.
- **Minimap default settings.** Two real, confirmed config keys exist
  already (live instance, `config/xaero/minimap/profiles/default.cfg`):
  `minimap_north_locked = false` → flip to `true` for always-face-north.
  Dot colors: the real per-category structure exists too
  (`default_radar_categories_client.json` — hostile/friendly/players/
  items are all separate categories with their own `settingOverrides`,
  including a `displayed` flag per category). Direct ask: red dots for
  hostile mobs only, nothing else — set `displayed: false` on every
  non-hostile category (players/friendly/items/other_entities) rather
  than a blanket radar-off, and confirm hostile's own dot color reads as
  red (real key present, `"color"` is a numeric Xaero color-index, not a
  hex value — same "don't assume, read the real serialized format"
  lesson as the Loot Beams color config). Same "build from the real
  generated file, ship as tracked config" pattern as the keybind item
  above.
- **Debug command: force-complete the current wave.** Real, concrete
  need (not just convenience) — mobs spawning somewhere unreachable can
  soft-lock the whole run, since wave-clear detection needs every
  `WAVE_MOB_TYPES` entity actually dead. Spec: an OP-gated custom
  command (`ServerEvents.commandRegistry`, level-2-gated same as the
  Wave Horn's own console-permission pattern) that mass-kills every
  `WAVE_MOB_TYPES` entity within a large radius of the pedestal, letting
  whatever `wave_status.js` already uses to detect "all hostiles dead"
  fire normally — reuses the existing clear-detection path rather than
  building a second one.
- **Tips & tricks quest chapter — content confirmed.** New chapter,
  checkmark-style quests, one per tip, per the standing "one quest per
  distinct item" rule below. Full confirmed content list in QUEUE.md's
  checklist entry (item 23) — 10 tips: Z to zoom (confirmed default per
  Just Zoom's own `KeyMappings.class`), R/U for JEI, M for the world map,
  Tab for the quest book (once the keybind item above ships),
  middle-click to auto-sort a container (once the Inventory Sorter item
  above is confirmed live), Jade's look-at-anything info (no keybind),
  right-click to open a loot bag, the Curios accessory slot for the
  amulet, and setting/using Waystones. **F3 dropped by direct user
  "no"** — not an oversight, deliberately excluded. Matches the standing
  "quest book must stay in sync with what's actually buildable/usable"
  principle (IDEAS.md) — this is onboarding for mechanics that already
  exist, not new game content, so it fits within the current "polish,
  don't add tiers" priority rather than fighting it.

### Systemic bugs, still open

- **Iron rolling regressed — "not seeing iron being rolled often."**
  Needs a real live diagnosis against the current kinetic rig (Press →
  Depot → Rolling Mill, `playtest_starter_kit.js:698+` and the
  2-block-clearance fix from the last playtest batch) — this pack has
  already hit two separate real bugs in this exact pipeline (the
  original wrong-room placement, then the Press-never-auto-fired/
  clearance issue), so "regressed" needs checking against what's
  actually live on the current save before assuming which of those (or
  a new third issue) is back, not re-guessed from the spec alone.
  **Follow-up, real throughput complaint 2026-09-04, root-caused and
  fixed the same day.** With the Hand Crank actually connected this
  time, real play still found it insufficient - not a wiring bug, a
  genuine throughput one. Real numbers, decompiled directly (not
  guessed): `HandCrankBlock#getRotationSpeed() = 32` RPM while actively
  cranked, but `HandCrankBlockEntity#inUse` decays from 10 to 0 every
  tick and generated speed hits 0 the instant it does - each right-click
  only sustains rotation for 10 ticks (0.5 real seconds) before needing
  another click. This is Create's own designated ACTIVE power source
  (cranking even costs the player hunger,
  `player.causeFoodExhaustion(rotationSpeed * crankHungerMultiplier)`) -
  not a passive one, and no gearing/ratio change fixes an on/off source.
  `RollingMillBlockEntity#getProcessingSpeed()` is
  `clamp(|RPM|/16, 1, 512)`; combined with the real default
  `rolling_mill_processing_duration = 120` ticks
  (`createaddition-common.toml`), that's 60 ticks (3 real seconds) per
  item even with perfectly sustained 32 RPM cranking - worse in
  practice given the decay. A genuinely passive source (Water Wheel)
  would be the structurally "correct" fix but needs water access near
  the rig, not verified here - flagged as a real possible follow-up,
  not built blind. Fixed instead by cutting
  `rolling_mill_processing_duration` to 40 (pack-wide - affects every
  rolling recipe: iron/gold/copper/aluminum/electrum/steel/brass, not
  just iron), so a couple of quick cranks processes an item instead of
  several continuous seconds of clicking. Config now tracked in the
  repo for the first time (`pack/config/createaddition-common.toml`)
  since this is its first real divergence from default. Verified: clean
  sandbox boot with the edited config, no load errors.
- **Passive mobs still spawning.** This is the same open item already
  dispatched to build in the "Fresh-world playtest, round 3" batch (see
  above, "horses still spawning despite the passive-mob fix") — not a
  new bug, a confirmation that it's still unresolved as of this
  playtest. No new spec needed here; just flagging it's still live and
  should stay prioritized until the peer's diagnosis lands.

### Elegant game-restart flow

Direct ask, explicitly called out as needing real nuance: two distinct
restart flows, not one —
1. **Game-over restart** (pedestal destroyed, or all players killed): "a
   new spawn... keep the quest book progress." Triggered by an actual
   loss state this pack already detects (`triggerPedestalDestroyed()`,
   shared across `pedestal_destruction.js`/`pedestal_health.js`; an
   all-players-killed check would be new, not built yet).
2. **Total fresh start**: full reset, quests included — presumably a
   deliberate player-triggered option, not loss-gated.

**Recommended default approach, not asking the user to choose — this is
just the pack's own already-established pattern applied consistently**:
every spawn-time build in this pack (base, pedestal, spawn-point search)
only runs its full setup on a genuinely fresh world's first login — so
"new spawn" for the game-over restart most naturally means generating an
actual new world and re-running that existing first-login build path,
not trying to reset live world state in place (which would be new,
much riskier surface area — clearing structures, mobs, wave state,
worldborder, forceloads by hand with no precedent in this codebase).

**The one real, hard open technical question, not guessed**: whether FTB
Quests' progress data is stored per-world (typical FTB Quests behavior —
`world/data/ftbquests/` or similar, tied to the save) or in a way that
could survive a world switch on its own. If it's world-local (likely),
"new world, keep quest progress" needs a real export/import step —
reading the current save's quest-progress file and writing it into the
new world's save at first login — not something that happens for free
just by keeping the same FTB Quests config. This needs a real check
against how this exact installed FTB Quests version actually persists
progress before the game-over flow can be built, not assumed either
direction. The "total fresh start" flow is simpler by comparison — new
world, skip the progress-import step entirely.

Not further specced (mechanism for detecting all-players-killed, exact
command/item to trigger a manual fresh start) until the quest-progress
question above has a real answer — building either trigger before
knowing whether progress can actually carry over risks having to redo
the core mechanism.

---

## Polish/utility mod pass, 2026-09-04

Direct request to survey other similar-themed modpacks for mods "that
would polish the pack rather than sweeping changes to gameplay" —
explicitly not new mechanics/content, so this fits inside the current
"polish before new tiers" priority rather than waiting behind it. Real
technique used (user-taught, not one this session already knew): a
CurseForge modpack's **Relations → Dependencies tab** lists every real
mod, unlike the marketing-blurb pack description — pulled full lists
from Troublesome Towers (197 mods) and Abandoned Apocalypse (141 mods,
the better genre match), filtered to pure polish/utility, picked via
AskUserQuestion rounds, then verified for real Forge 1.20.1 builds
before committing to a spec (this pack's standing "search isn't proof,
check the real listing" discipline).

**Confirmed picks, ready to build:**
- **Sodium/Embeddium Dynamic Lights** (real project id
  `dynamiclights-reforged`) — held/dropped glowing items light the
  world in real time. Confirmed Forge 1.20.1 build, compatible with
  this pack's existing Embeddium install (it's an Embeddium-aware fork
  by design, not a bolt-on).
- **Subtle Effects** (author MincraftEinstein) — small ambient
  particle/sound details tied to player state. Confirmed Forge 1.20.1.
- **Damage Numbers** by **luavixen** specifically — real naming
  collision caught before picking: "Damage Number" (xypp, a
  corner-of-screen counter, different UX) and "Show Damage" (zzdzt) both
  exist under near-identical names. luavixen's is the floating-particle
  style that matches what was actually wanted, confirmed Forge 1.20.1.
  **Shipped 2026-09-05** — the first two install attempts genuinely hit
  the wrong "mel1x" mod under the same filename (see "Polish mod pass,
  partial" below); re-verified this time directly via Modrinth's API
  (not a collapsed CurseForge UI page) that CurseForge project 1022853
  is luavixen's own real project (confirmed author, `foxgirl.dev` link),
  not a naming collision after all — the earlier "wrong mod" conclusion
  was a real mistake, not an actual squatter. Installed via
  `packwiz curseforge add --addon-id 1022853` (file 1.4.0-forge,
  hash-verified against the CDN download). Real mods.toml check: zero
  mandatory dependencies beyond Forge/Minecraft, `side` not restricted
  to CLIENT at the mod level (only its optional config-screen dependency
  is client-only) — loaded cleanly in a dedicated sandbox boot without
  being skipped, unlike Mob Dismemberment before it. Actual particle
  rendering can only be confirmed by the user in a real client — a
  dedicated server can verify "doesn't crash," not "numbers appear."
- **FancyMenu + Drippy Loading Screen** — real dependency shape, not two
  independent picks: Drippy Loading Screen is an *addon* for FancyMenu,
  requires it. Both confirmed Forge 1.20.1, same author (Keksuccino) as
  Just Zoom, already trusted in this pack. Reskins the main menu and
  loading-screen tips — real opportunity to theme both to the
  post-apocalyptic aesthetic rather than leave them vanilla.
- **[EMF] Entity Model Features + [ETF] Entity Texture Features** — real
  infrastructure pick, not decorative on its own. Both Fresh Animations
  and Tissou's Zombie Pack (below) need Optifine's Custom Entity Models
  to function; EMF+ETF is the real Forge-native equivalent, and
  critically does NOT carry Optifine's known conflicts with this pack's
  Embeddium/Sodium-family performance stack. One real mod install covers
  both resource packs below — good footprint news, not two separate
  dependency chains.
- **Fresh Animations** (resource pack, author FreshLX, 97.7M+
  downloads) — animated vanilla mob models (zombie, husk, drowned,
  villager, etc.). **Real correction made before shipping this**: this
  was first assumed to be a mod; it's actually a resource pack, riding
  on the EMF/ETF pick above.
- **Tissou's Zombie Pack** (resource pack, 28.5M+ downloads) — zombie-
  family retexture/variety (1500+ skin variants across
  zombie/husk/drowned/zombie_villager). Also rides on EMF/ETF.
  **TZP Plus Mutants (the mutant-specific companion pack) is
  deliberately NOT included** — real catch before shipping: it retextures
  entities from "Mutant Beasts," a different mod than this pack's
  installed "Mutants and Zombies" — it would almost certainly do nothing
  for `mutantszombies:zombie_brute`/`mutant_brute` etc. Same "verify the
  exact mod the name refers to" discipline as everything else in this
  pack's history.

**One real open question, flagged not guessed**: whether Fresh
Animations and Tissou's Zombie Pack actually layer cleanly together —
both touch the same zombie-family entity models/textures, and whether
one clobbers the other (or they merge fine, since one is
animation-focused and the other texture-focused) needs a real live
check before both ship, not an assumption either way.

**Explicitly considered and passed over, real reasons, not oversights**
(also see IDEAS.md's survey section for the fuller writeup):
- **AmbientSounds 6, Sound Physics Remastered, Corpse (+Retriever),
  Chat Heads, Macaw's decoration suite** — all real, all verified to
  exist for Forge 1.20.1 in the earlier research pass, just not picked
  this round. Worth remembering as validated candidates if this pass
  gets revisited rather than re-researching from scratch.
- **The YUNG's structure suite** (appeared in Abandoned Apocalypse's
  dependency list) — not proposed. This pack already installed one
  module of this exact family (Better Desert Temples) and it crashed
  world creation outright, removed the same day. Same shared engine
  across the family, real risk of recurrence.
- **Oculus + Photon Shader** — not proposed. Shaders were tried and
  removed twice already this project on "not feeling the aesthetic,"
  not a bug — see "Tried and explicitly retired" below.
- **Zombie Awareness, Enhanced AI, Tough As Nails, The Hordes, Mob
  Sunscreen** — real gameplay-mechanic mods, excluded per the explicit
  "not sweeping changes to gameplay" ask. Mob Sunscreen specifically
  would work directly against this pack's night-lock design (undead
  burning in daylight is a deliberate mechanic, not incidental).

---

## Pick Up Notifier + world border on minimap, 2026-09-05

Two small QoL investigations, both landed with a real implementation
rather than staying open questions.

**Pick Up Notifier, loot-bag-opens scoped** — *live*. Direct ask: make
loot bag notifications "cooler," specifically via this mod, not a
generic overhaul. Real problem found first, not assumed: decompiled the
mod's actual shipped 1.20.1 jar (`ForgeItemPickupHandler.class`) and
confirmed its only native triggers are vanilla
`EntityItemPickupEvent`/`PlayerEvent.ItemPickupEvent`, both firing
exclusively when a player walks over a dropped `ItemEntity`. BountyBags
grants loot bag contents straight into inventory (no `ItemEntity`
involved, confirmed in `loot_bag_notification.js`'s own header), so the
native hook could never fire for a bag open on its own.

No documented/stable API exists to bridge this (no `api` package
anywhere in the mod), but a real, public-by-accident internal hook does:
`PickUpNotifier.NETWORK` (public static field) +
`S2CTakeItemStackMessage(ItemStack)` (public constructor, needs only an
`ItemStack`, no `ItemEntity`) — its handler calls straight into
`AddEntriesHandler.addItemEntry(Minecraft, ItemStack)`, the same call a
real walked-over pickup triggers. Reached via this pack's established
Class.forName reflection bootstrap (java.* is disabled in this Rhino
sandbox — same technique as `mob_aggro.js`'s `resolveClass`, redeclared
with a `pun` prefix in `loot_bag_notification.js` to avoid a repeat of
that file's real cross-file name collision). `NetworkHandlerV2.sendTo`
is resolved from the public **interface** class specifically, not the
network instance's own concrete class (confirmed via live diagnostic to
be `fuzs.puzzleslib.impl.network.NetworkHandlerForgeV2`, package-private)
— a Method obtained from a non-public declaring class throws
`IllegalAccessException` on `invoke()` even when the method itself is
public. Also resolved by exact method NAME rather than this codebase's
usual shape-based finder: `sendToAllExcept(MessageV2, ServerPlayer)` has
the identical erased shape to `sendTo` (same arg count, same param
types, same return type) — a real, confirmed ambiguity.

Needs **Puzzles Lib** as an added dependency (Fuzss's shared library,
199M+ downloads, real Forge 1.20.1 build, low risk). Hooked directly
into `loot_bag_notification.js`'s existing `PlayerEvents.inventoryChanged`
aggregation — fires per real granted stack, using the exact same event
data already driving the chat summary. The chat summary itself was kept
rather than replaced, since its bag-name framing
("§6[Uncommon Bounty Bag]") isn't something Pick Up Notifier's own
on-screen list conveys; revisit if the two together read as redundant in
real play.

**Verified end-to-end via a live sandbox diagnostic, not just "no
errors"**: a temporary `ServerEvents.loaded` hook confirmed every class
resolved (`PickUpNotifier`, `S2CTakeItemStackMessage`, `ItemStack`,
`NetworkHandlerV2`, `MessageV2`, `ServerPlayer`), the exact
`sendTo(MessageV2, ServerPlayer)` method resolved with no ambiguity, the
real `NETWORK` field returned a genuine `NetworkHandlerForgeV2`
instance, and a real `S2CTakeItemStackMessage` was successfully
constructed from a KubeJS `Item.of(...)` stack (confirmed to already be
a real `net.minecraft.world.item.ItemStack` via LiveConnect, not a
wrapper needing conversion). The one piece not exercised by this
headless test is the final packet send to an actual connected player —
that part is standard Forge networking with no remaining unknowns, and
needs a real playtest to confirm the on-screen popup actually appears.

**World border on minimap** — investigated, a real gap confirmed, not
built (open decision, see below). Decompiled every class in both
installed Xaero jars (Minimap 26.4.2, World Map 1.45.0) for any
`WorldBorder` reference at all — zero matches in either, confirmed via a
full bytecode string scan (validated against a known-present string
first to rule out a scanning miss). Neither mod has any code path that
reads the vanilla world border; this isn't a hidden config toggle, the
capability doesn't exist in either mod as installed.

Real fix identified: **Xaero's World Border** (Modrinth `xaeros-world-
border`, real Forge 1.20.1 build v1.0.0, published 2026-04-26, MIT
license) — small addon, only dependency is Xaero's World Map (already
installed). Not made by the real Xaero (`thexaero`) — a different, much
smaller third-party author ("Alazi," 825 downloads, 2 followers, no
public source repo). Modrinth-only, not on CurseForge (confirmed via a
direct 404 on the expected CurseForge slug) — installed via
`packwiz modrinth add`, a deviation from this pack's usual CurseForge-
first convention for this one entry. **Real process catch**: packwiz's
automatic dependency resolution re-added the already-installed Xaero's
World Map through Modrinth too, silently switching its `pack/mods/
xaeros-world-map.pw.toml` from its original CurseForge source to
Modrinth (same file/version, so functionally inert, but an unintended
side effect on an unrelated, already-working entry) — reverted that one
file back to its original CurseForge-sourced state before committing.
Verified via a clean sandbox boot (no crash, no change to the pre-
existing client-only-mod-skip count). **Not yet confirmed by a real
playtest** — same "can't verify client rendering from a dedicated
server" ceiling as the other visual mods this session.

---

## Tried and explicitly retired

Kept here so these don't get re-proposed blind — each was built, given
real effort, and deliberately removed on direct feedback, not because
it was buggy or unfinished.

**Shaders (Oculus + Spooklementary)** — *retired*, twice. Eleven
tuning rounds (version-crash fix, brightness/shadow saga, isolating the
fix to the shader's own intended lever, removing real-time shadows
outright) all landed on a technically-defensible state, but the verdict
was about the shader's whole aesthetic, not any remaining number ("im
just not feeling the whole shader feel now"). A `minecraft:darkness`
vanilla-effect alternative was tried the same day as a replacement —
also didn't work, dropped without much post-mortem needed beyond "the
Warden effect didn't work."

**All fog** (border proximity fog + wave-time combat fog, via
YetGamer's Custom Fog) — *retired*. Removed per direct request ("remove
any visual effects work, like fog etc, and go back to basics"), taking
Blood Moon's only real features (denser fog + a distinct title) down
with it. Night-lock (forced night during a wave) is the only atmosphere
effect left standing — a gameplay necessity (undead mobs burning),
not a visual effect, so it stayed.

**Roguelike permanent-buff choice popup** — *retired*. A `/tellraw`
clickable-chat-menu implementation never reliably resolved the
click-detection, which left a flag permanently stuck and silently
blocked the Wave Horn *and* the countdown timer from ever working again
— one buggy feature, three symptoms. Removed entirely rather than
patched. If revisited: a real GUI (not chat) was researched as the
fix — see IDEAS.md's "revisiting the popup" note for the villager-trade
and custom-Menu leads, both unverified, neither built.

**Inventory Profiles Next** (+ libIPN + Kotlin for Forge) — *retired*,
twice, for footprint/unresolved-bugs reasons (a swipe-gesture conflict
with Mouse Tweaks, a separate hover-highlight bug) against a "keep
footprint small" pack that doesn't strictly need it. Mouse Tweaks alone
still covers basic inventory management.

---

## Cross-cutting patterns worth reusing

**Structure placement at a triggered location** — the same underlying
operation (`/place template`, gated by some watched condition) recurs
across: the fixed spawn building, base-expansion content placement,
lootable structures, and the Schematicannon room-expansion feature.
None of the "stamp a structure down" mechanics need separate designs
per feature — only the template and trigger condition differ.

**Wave-clear state as a trigger point** — `wave_status.js`'s
`td_inWave`/`td_waveNumber` flags are the proven detection point for
"something happens on wave N / wave clear," already used by base
expansion and the starter-gear removal. Any future wave-clear-tied
idea should hook the same flags rather than re-deriving detection
logic.

**Custom right-click items** — the Wave Horn's nine real bugs (Goat
Horn's hidden cooldown blocking the event entirely, wrong command
permission, a same-tick-processing false lead, `const`/`let`
"redeclaration" in repeated callbacks needing `var`, `event.level
.isClientSide` throwing unconditionally, both `ItemEvents.rightClicked`
and `BlockEvents.rightClicked` firing for one click, bare `.x/.y/.z`
producing `NaN`, `Math.PI` itself producing `NaN`) are the standing
checklist for any future custom right-click item or entity-stepped-on
block in this codebase — see `docs/MODS.md`'s Wave Horn entry for the
full detail on each. **The `Math.PI` item on this exact list recurred
2026-09-01, in new position-calculation code that didn't check it**:
`randomPlayerRelativePosition()`, added to `wave_spawner.js` for the
border-relative-to-player-relative spawn fix, independently used
`Math.random() * 2 * Math.PI` — reintroducing the exact already-
documented bug, silently breaking every wave spawn until a full
investigation traced it back 2026-09-02 (see "Wave Horn" above). A
documented gotcha checklist existing isn't the same as it being
consulted when writing new code in the same class — this list is for
active reference against new position/angle math in this codebase, not
a one-time history.

**Prefer a mod's mechanic wholesale over hand-building it**, when one
genuinely does the specific job — that's where custom code actually
shrinks (nothing equivalent needs hand-building), versus using a mod
only as a texture/reskin source. Weigh it against the pack's "keep
footprint small" principle each time; it's not a blanket rule (the Wave
Horn's curated deterministic campaign and Tier 1's degrade mechanic —
before the Trapcraft swap — were both custom by genuine necessity, not
oversight, at the time). Verify a candidate mod actually does the
specific mechanic needed before installing it on the strength of its
name or download count alone (Simple Spikes' 1.20.1 build, Gravemist's
1.20.1 availability, and MineTraps' current Forge target all turned out
to not be what search results implied).

## Frenetic-combat pivot & tower-defense research batch (2026-09-08)

**Source and status**: user pasted a large AI-generated ("Google AI")
research document proposing turret tiers, SecurityCraft-module
integration, boss waves, WWZ-style zombie stacking, and a performance
suite. Note this is the *second* time close-to-identical research
reached this project the same day — a first pass already touched Tier
2/3 turret and performance-mod claims during the Trapcraft-removal work
(see "Trapcraft dropped entirely" above, ~line 3706) and ruled most of
it out as either already-covered or unverified. This entry is the full
follow-up pass: every mod claim independently re-verified (not trusted
from the pasted text), decided item-by-item with the user via direct
questions, **spec only — nothing built or dispatched yet**, per direct
instruction ("spec now, build later"). Don't send any of this to the
build session without an explicit go-ahead; today's whole 10-item
feedback batch + Trapcraft removal is also still unplaytested, and nothing
here should jump ahead of that confirmation pass.

**Real verification pass (2026-09-08)**, all 7 mod names in the
research checked against real platform data, not the research's own
claims:
- **Advanced Tower Defense** — real, active Forge 1.20.1 build
  (CurseForge, "3.7 [Mini Update]", updated 2026-08-24). Usable.
- **Enhanced Hordes** — real, active Forge 1.20.1 build (CurseForge,
  `eh2.0-forge1.20.1.jar`, released 2026-07-03; `eh1.3.1` also exists).
  Genuinely does zombie-climbs-zombie stacking + wall-break, matches the
  research's WWZ claim. Usable.
- **Tower Defense Units** — dead end. Latest file targets Forge 1.19.2,
  July 2022, no 1.20.1 build exists.
- **Immersive Intelligence** — dead end. Every file, including a recent
  2026-08 dev build, targets Forge **1.12.2** only; never ported to
  1.20.1.
- **"Zombie Ladder"** — doesn't exist as a distinct mod. No CurseForge/
  Modrinth listing found under this name; treat as a hallucinated/
  confused reference in the research — Enhanced Hordes already covers
  the claimed mechanic.
- **Hostile Climbers** — Fabric-only, no Forge build. Wrong loader.
- **Shake Screen / Screenshake** — Fabric-only, no Forge build. Wrong
  loader.
- Checked directly against the pack's own live config: **Undead Nights**
  (`undeadnights-server.toml`) has no entity-stacking/climbing option of
  its own — genuinely separate mechanic from what Enhanced Hordes would
  add, the two don't overlap or conflict on that front.

### Walls/chokepoints → frenetic pivot (decided, additive)

Direct instruction: pivoting away from walls-and-chokepoints as the
*primary* defense identity toward "a more frenetic experience."
**Scope confirmed explicitly**: existing SecurityCraft reinforced walls,
the Watchpost rebuild, and the current chokepoint layout all stay
exactly as built — no removal, no rework. This is additive, not a
teardown of [[project_chokepoint_walls]]. What changes is that walls
stop being treated as a full stop against every threat; Enhanced Hordes
(below) means some mobs go over rather than being funneled through.

### Enhanced Hordes install — planned, not built

Adds real zombie-stacking climb physics per its own mod description.
**Scoped unconditionally, not late-wave-gated** — direct instruction
was to feel this generally, not save it for endgame. Real work needed
before dispatch, not guessable:
- A full-mod-set sandbox boot (not a minimal one) — it interacts with
  both the already-installed Undead Nights horde-scaling AND this
  pack's own `wave_spawner.js`/`base_expansion.js` spawn logic, the
  exact "minimal sandbox proves less than it looks like" trap already
  documented in IDEAS.md's own gotcha list.
- Its real config schema needs to be read directly (same rigor as every
  other config touch in this pack's history) before tuning
  population/stacking-chance values — don't assume field names from the
  research's invented `horde_settings` block, that was never verified
  against the actual mod.
- A real FPS/TPS check under an active stacked-horde scenario before
  shipping, given this pack's [[feedback_performance_scrutiny]] stance —
  a clean boot isn't proof this performs.

### Advanced Tower Defense, added alongside Medieval Defense Turrets — planned, not built

**STALE as of 2026-09-09 — built, and the "don't touch" call below is
reversed by direct feedback.** Advanced Tower Defense was installed and
Musket Sentry/Anvil Launcher shipped as a later/heavier *addition* (Track
C, 2026-09-08 — see that entry further down this file and
`tier2_recipes.js`'s own header comment for the real recipe chain). Left
as history, not deleted. The "MDT's Arrow Turret stays untouched"
decision itself is superseded — see the new entry immediately below.

MDT's Arrow Turret stays exactly as-is (already live, quest-integrated,
verified via sandbox boot — don't touch). Advanced Tower Defense's
**Musket Sentry** and **Anvil Launcher** get added as a later/heavier
slot — variety, not a replacement, per direct decision. Real work before
dispatch:
- Verify ATD's actual block/item IDs and default recipes from its own
  shipped data — the pasted research's example recipes/IDs
  (`advanced_tower_defense:iron_bolt`, etc.) were never confirmed to
  exist and shouldn't be trusted.
- Decide re-recipe/tier gating using the same `event.remove` +
  `event.shaped` pattern already established in `tier1_recipes.js`/
  `tier2_recipes.js`.
- Needs a real quest slot — extend the existing turret quest chapter
  rather than create a new one, per this pack's "one quest per distinct
  item" convention.

### Tier 2 trap replacements: Vacuum Block → Item Collectors, Arrow Turret → Musket Sentry — spec ready, NOT BUILT, holding for explicit dispatch

Direct feedback, 2026-09-09: "I hate the tier 2 traps... specifically the
arrow turret and vacuum chest thing." Reviewed both against real
decompiled/verified data before proposing replacements — not a taste-only
swap.

**Vacuum Block (`vacuum_cleaner:vacuum_block_tier_1`, the "vacuum chest
thing") — real finding: it's not just fiddly, it's dead code.** Decompiled
all 5 tiers (`VacuumBlockTier1Block` through `Tier5Block`, all
`net.mcreator.vacuumcleaner.block`) directly via `javap`. Every tier's
constructor chains exactly 4 `BlockBehaviour.Properties` builder calls
(`of()` → `instrument()` → `sound()` → `strength(1.0F, 10.0F)`) straight
into the `Block` superconstructor — **no tier calls `.randomTicks()`
anywhere, and none overrides `isRandomlyTicking()`.** Every tier's actual
item-pull logic (`VacuumprocedureProcedure`/`Vaccumtier2proProcedure`/.../
`Vacuumtier5proProcedure`) is only ever invoked from the block's own
`randomTick()` override — confirmed via a full-jar grep, nothing else in
the mod calls it. Per vanilla's own block-ticking rules (confirmed via
web search against Forge 1.20.1 docs), a block that never opts into
random ticking never has `randomTick()` called at all. **The entire pull
mechanic is unreachable in normal play, on every tier, not just tier 1** —
this can't be patched via KubeJS (`isRandomlyTicking()` is a hardcoded
Java method, not data-driven; same "no custom Java mod" boundary as
Advanced Tower Defense's turret-head recipes above), so the fix has to be
a different mod, not a config tweak.

**Replacement: Item Collectors** (CurseForge, real Forge 1.20.1 build
confirmed directly via CurseForge's own files list — file v1.1.7 exists
for 1.20.1/Forge, not guessed from the mod's newest-version page; 53M+
total downloads, created 6 years ago, still receiving releases into 2026
— a well-established mod, not a fringe one). Real, verified mechanic
(CurseForge's own description page, cross-checked, not taken on faith):
places collected items into whatever block sits directly underneath the
collector (a plain chest is enough — no hopper rig at all), pulls from a
genuinely omnidirectional radius (Basic Item Collector: up to 5 blocks
per axis; Advanced: up to 7 blocks + a whitelist/blacklist item filter),
range configurable per-axis via the block's own GUI, no redstone/power
requirement. Directly answers all three named complaints: no rig beyond
"put a chest under it," no directional limitation, and it reads as a
generic scavenging "collector" rather than a vacuum-cleaner reskin.
**Scope call**: ship the Basic tier only as the Tier 2 replacement (keeps
the existing single-slot design, matches Vacuum Block's own tier-1-only
usage) — the Advanced tier (filtering) is a real future Tier 3 upgrade
candidate, not built here.

**Arrow Turret (`medievalturrets:bow_turret_item`) — direct feedback: too
weak/boring, and a thematic mismatch.** Already-documented real quirks
(from the earlier "Herd Them In" quest-text fix) explain part of why it
reads as thin: unlimited free arrows with zero ammo mechanic (no
maintenance loop at all), spawns facing a random direction until it
acquires a target, and a stray `RandomStrollGoal` can walk it off its
placed position when idle.

**Replacement: promote Advanced Tower Defense's Musket Sentry into the
actual Tier 2 gate, replacing Arrow Turret rather than sitting behind it.**
Zero new mod install — Musket Sentry is already installed and its full
recipe chain already works (Track C, 2026-09-08): Turret Workbench (Tier
0) + Blueprint (Musket Turret) + `tech_tablet_mechanics`, both gated
behind Shrapnel, then the mod's own hardcoded-Java assemble step (8x
iron_ingot, 1x stone_barrel, 1x spring, 1x spyglass, 6x wooden_parts, 4x
stone_parts — see `tier2_recipes.js`'s header for the full decompiled
chain). Real ammo economy already confirmed working (musket
shells/slugs, vanilla-material recipes, no dependency on anything gated).
Thematically a mounted gun, not a bow-on-a-stick — matches "heavier
sentry" framing already in its own quest text ("A heavier sentry than the
Arrow Turret..."). **Real quest-chain work needed**: "Beyond the Bow"
(Musket Sentry's quest, id `503260000FFBD462`) currently depends on
"Wired for War" (Arrow Turret's quest, id `74779308DEED321D`) — that
dependency needs flattening so Beyond the Bow becomes the Tier 2 gate
quest itself, not a bonus branching off it. Its description text ("A
heavier sentry than the Arrow Turret...") also needs a rewrite once Arrow
Turret is gone, since it currently assumes Arrow Turret is a live sibling
item.

**Scope call on Arrow Turret itself: cut entirely** (recipe removed from
`tier2_recipes.js`, "Wired for War" quest removed/repurposed), not
demoted to a Tier 1 option — Tier 1 has no turret slot in its own design
and nothing in the feedback asked to keep a cheaper version around.

**Not yet built, not yet dispatched** — holding per this pack's own
"write the spec, wait for explicit send it" practice. Real work for
whoever builds this:
- Verify Item Collectors' actual block/item IDs and default recipe from
  its own shipped data (packwiz hash-verified jar) before writing any
  glue — same rigor as every other mod addition in this pack, don't trust
  the CurseForge description page's item names.
- Re-recipe Item Collectors' basic tier via the established
  `event.remove` + `event.shaped` pattern, matching the Tier 2 loot-pool
  filler convention (`quartz`/`redstone_block`/`iron_block`) already used
  for the rest of this file.
- Remove `vacuum_cleaner:vacuum_block_tier_1`'s recipe entirely from
  `tier2_recipes.js`; the mod itself can be uninstalled from packwiz once
  nothing references it.
- Rewrite the "Waste Not" quest text (currently describes the Vacuum
  Block's — also fictional, given the dead-code finding above — pickup
  behavior) to describe Item Collectors' real mechanic instead.
- Flatten "Beyond the Bow"'s quest dependency as described above, remove
  or repurpose "Wired for War," rewrite Beyond the Bow's description to
  drop the Arrow Turret comparison.
- Full-mod-set sandbox boot (uninstalling `vacuum_cleaner`, keeping
  Advanced Tower Defense already-installed) before shipping — same bar as
  every other recipe/quest change in this pack's history.

### Shrapnel/scrap folded into loot bag tables — planned, not built

Direct instruction: no second currency — fold the idea into the
existing loot bag economy instead of the research's standalone LootJS
per-mob-kill modifier. This keeps a single unified kill-reward system
per [[feedback_loot_shortcut_undermines_choice]]. Register a scrap item
(check first whether anything scrap-flavored already exists in the pack
before adding a new one) as a real loot-table entry inside
`loot_bag_drops.js`'s existing tier tables (Uncommon/Rare/Epic/
Legendary), not a separate drop mechanism. **Real open fork**: is
shrapnel meant to be a genuine crafting material (feeding ammo/turret
recipes, matching the research's original intent) or pure flavor loot?
If it's meant to feed ammo recipes, that needs deciding alongside the
Advanced Tower Defense ammo-recipe design above, not independently.

### Boss-wave spectacle system — planned, partial (real Forge gap)

Ties directly into an existing open fork already sitting in IDEAS.md
under "Wave-clear reward: a building/machine places itself in the
base" — that entry's cadence question ("maybe only boss waves — cadence
never decided") is the same undecided question this needs answered.
Resolve both together, not separately, when this gets picked up.

**Buildable now, vanilla-command-driven, no new mod needed** — reuses
patterns already live in this codebase rather than the research's raw
`LevelEvents.tick` polling template:
- Custom boss mob spawn with inflated stats, same
  EntityEvents/particle/sound idiom already used in
  `pedestal_health.js`/`boomer_zombie_explosion.js`.
- A real vanilla `/bossbar`, tracked off the boss's live HP via a
  throttled tick handler — same throttle idiom `wave_status.js` already
  uses for its own actionbar counter.
- Custom boss music via a real `.ogg` + `sounds.json` registration +
  `playsound`/`stopsound` commands — standard KubeJS asset mechanism,
  no mod required.

**Not buildable as researched**: the screenshake polish has no real
Forge 1.20.1 path (Shake Screen/Screenshake verified Fabric-only) — cut
from scope unless a real Forge alternative turns up later. Don't
re-propose it without a new mod check.

**Real open fork before building**: which wave(s) actually get a boss
(the same undecided cadence question above)? Also whether the boss is a
reskinned/stat-buffed vanilla mob (the research's zero-new-content
approach) or one of this pack's already-installed named mobs — needs an
explicit decision, not guessable.

### SecurityCraft modules as turret-recipe components — idea, not scoped in detail

Genuinely new angle, not part of the already-parked Tier 3 power plan.
Since SecurityCraft is already installed and load-bearing for walls, its
Redstone/Smart/Speed Modules could become real recipe components for
Medieval Defense Turrets/Advanced Tower Defense turrets — same
`event.remove` + `event.shaped` pattern as every other tier re-recipe in
this pack — giving SecurityCraft a second identity beyond walls instead
of pure flavor. Not scoped in detail — real recipe design needs the
turret IDs confirmed first (see Advanced Tower Defense entry above).

### Tier 1 trap decay/degradation — idea, flagged not committed

The research's per-kill % break-chance mechanic, applied to the
just-installed Simply Traps Spike Trap / V01D Bear Trap (replaced
Trapcraft the same day, see "Drop Trapcraft entirely" above) — same
`EntityEvents.death` + block-check pattern already used elsewhere in
this pack. **Real open question, not decided**: does this fit the
"keep footprint/complexity small" stance, or is it scope creep on a
system that was just simplified today? Flagging for a future decision,
not building without confirmation.

### Perimeter siren — not a build item

SecurityCraft (already installed) already ships Laser Blocks + Alarm
blocks natively — placeable in-world today with zero scripting. Noting
this so it doesn't get mistaken for missing functionality later.

### Bullet tracer particles for turrets — deferred

Cheap addition once real turret IDs exist (see Advanced Tower Defense
entry above) — needs the actual projectile entity type decompiled from
whichever turret mod ships it, not the research's guessed/invented IDs.
Not actionable until that groundwork is done.

### "Perimeter Warfare" standalone quest chapter — not carried forward, folded into existing structure

The research proposed a whole new FTB Quests chapter (`defensive_mechanics.snbt`) walking players through Tier 1→3 defense progression as its own tree (Physical Hazards → Scrap & Salvage → Radial Automation → Energetic Annihilation). **Deliberately not built as a separate chapter** - this pack already consolidated 3 separate chapters into one `campaign.snbt` tree on 2026-09-03 specifically to stop chapter proliferation (see [[project_quest_book_rebuild]]); adding a new standalone chapter here would directly reverse that decision for no real gain, since `campaign.snbt`'s existing x/y tree layout already has a real Tier 1/Tier 2 turret section (confirmed live: 70 quests currently in `campaign.snbt` alone, including the existing "Wired for War" Arrow Turret quest). Real, current chapter file inventory, checked directly rather than assumed: `campaign.snbt` (70 quests), `bounties.snbt` (21), `tips_and_tricks.snbt` (37) - three files total, matching this pack's actual FTB Quests structure.

**What this means for new items from this batch**: Advanced Tower Defense's Musket Sentry/Anvil Launcher, and anything else that ships from this research, get **new quests added into the existing `campaign.snbt` tree** (extending the current turret section, one quest per item per this pack's own "[[feedback_check_ideas_before_implementing]]" quest convention), not a new chapter file. Live-save quest-progress ID safety applies here the same as every other `campaign.snbt` edit in this pack's history - pull real current IDs from the live save before touching the file, per [[feedback_ftbquests_live_save_ids]].

### Bounty shop (FTB Quests spend economy) — exploratory only, not scoped

No committed design. FTB Quests has no native "deposit currency, buy
item" mechanic — would need custom scripting to detect item deposits
and grant rewards, a genuinely new technique for this pack. Not part of
this batch; revisit only if there's real appetite for it later.

### Flamethrower Mechanics (Create Nozzles) — idea, not scoped

Missed on the first pass, caught on re-audit. Distinct from the Tesla
Coil entry above - routes lava (or a modded fuel) through Create's own
Nozzle blocks (Create is already fully installed for this pack's power
chain, see "Storage & power system") to create a high-pressure fire
torrent across a chokepoint. Real appeal: no new mod needed at all,
pure recipe/contraption work against a mod already in the pack. Not
scoped - real open questions before this is buildable: does a Nozzle's
vanilla fire-stream actually deal meaningful damage to mobs walking
through it (needs a real in-game/decompile check, not assumed), and
how it fits relative to the Tesla Coil as a second Tier 3 option
(alternative choice vs. a required second machine) is undecided.

### WWZ counter-mechanics — real open question tied to the frenetic pivot

Missed on the first pass. The research's own answer to "how do players
fight back once mobs can climb walls" (once Enhanced Hordes ships) -
directly relevant now that walls stay built as-is while Enhanced Hordes
goes in unconditionally (see above), not something to silently skip.
Three ideas, none scoped or decided:
- **Anti-climb lip**: an inverted 1-block overhang at the top of a
  wall, meant to break a climbing mob's pathing and drop it back down.
  Real question: does vanilla/Enhanced Hordes pathing actually respect
  an overhang as an obstacle, or does this need live testing to confirm
  it does anything at all.
- **Liquid moat**: SecurityCraft's own Fake Water (already installed,
  acts like boiling lava to mobs) as a perimeter trench - collapses a
  climbing stack from the bottom before it reaches the top.
  SecurityCraft is already load-bearing in this pack, so this is a
  zero-new-mod option.
- **Wall-mounted stakes**: placing Simply Traps' spike piece directly
  on vertical wall faces so a climbing mob takes continuous contact
  damage on the way up. Real question: does Simply Traps' spike
  actually support wall-mounted placement/orientation, or is it a
  floor-only block - needs checking, not assumed.
**Not decided which (if any) of these three actually gets built** -
flagging so the frenetic pivot doesn't quietly become "walls do
nothing" by default by omission.

### Tiered tooltip color-coding — idea, cheap, not scoped

Missed on the first pass. Client-side `ItemEvents.tooltip` additions
marking Tier 1/2/3 defense items green/yellow/red with a one-line
tier explainer, same general idea already proven via this pack's
existing tooltip work elsewhere. Real, low-risk, low-cost - could
reasonably ship alongside whichever turret item IDs get confirmed
first (see Advanced Tower Defense entry above), not independently
useful before that.

### Turret combat-feedback effects (muzzle flash, ballistic impact, Tesla hit cinematics) — idea, not scoped

Missed on the first pass - folded too generically into the "bullet
tracer particles" entry above, which only covers the mid-flight trail.
Three genuinely separate trigger points from the research, none
scoped:
- **Muzzle flash** - a brief particle/sound burst at the turret block
  itself, the moment it fires (not the projectile's flight or impact).
- **Ballistic impact** - particle/sound at the moment a turret
  projectile actually hits a mob (distinct event from the flight
  trail).
- **Tesla Coil hit cinematics** - electric-spark particles + a
  thunder/conduit sound (optionally a custom `tesla_zap.ogg` via the
  same real `.ogg`+`sounds.json` mechanism as the boss music system) on
  Tesla damage specifically - tied to the not-yet-built Tesla Coil, not
  actionable until that exists.
All three reuse patterns already live in this codebase
(`pedestal_health.js`'s particle+sound idiom); none are blocking, all
depend on real turret/Tesla IDs existing first.

### Boss wave: gear + kill-reward detail — folded into the spectacle system entry above

Missed on the first pass - the research's specific "equip the boss with
full netherite gear, zero drop chance" and "drop
`securitycraft:universal_block_reinforcer` + bonus shrapnel on a
confirmed boss kill" details got compressed into a vague "inflated
stats" line in the boss-wave entry above. Both are real open details
for whenever boss-wave cadence actually gets decided, not separate
work - the boss-kill bonus-shrapnel piece is consistent with the
already-decided "shrapnel lives in loot bag tables" fold-in, just
needs restating at boss-wave build time.

### Minor items, low priority, noted so nothing's silently dropped

- **Ammo-economy recipes** - the research's specific example (iron_bolt
  from flint/barbed_wire/iron; bonus arrows from iron_spikes/feather/
  stick) was only referenced as "an open fork," never spelled out. Real
  recipe design still needs the Advanced Tower Defense ammo item IDs
  confirmed first (see that entry above) before this is actionable.
- **Performance tip**: cap Embeddium's max particle count specifically
  because mass Tesla-Coil electrocution of an Enhanced-Hordes-stacked
  horde could cause a real stutter - tied to two not-yet-built things
  (Tesla Coil + Enhanced Hordes), revisit once either ships.
- **Simply Traps' Slime Trap piece** - Simply Traps (already installed
  for Tier 1 spikes) apparently ships a Slime Trap block beyond the
  Spike Trap/Stakes this pack currently uses. Never evaluated - real
  open question whether it adds anything this pack's Tier 1 doesn't
  already have (crowd-control/pathfinding-compression, per the
  research's own description), not assumed useful or useless.

### Explicitly not carried forward — already better-covered elsewhere

- **Tier 3 Tesla/power chain** — stays exactly as already parked (see
  "Storage & power system" above): Create's own Tesla Coil + Immersive
  Engineering + Flux Networks. The research's alternative (Immersive
  Intelligence) is a dead end per the verification pass above — nothing
  to revisit, the parked plan wins by default.
- **Performance mod suite** — already installed (Radium, Embeddium,
  FerriteCore, ModernFix, Clumps, Entity Culling per IDEAS.md's own
  gotcha list). The research's list is redundant with what's already
  running; no action needed.
- **Aikar's JVM flags** — a launcher-level user setting, not a pack
  file. Not a build task; mention to the user as a one-time optional
  action if they want it, don't spec it as pack work.

---

## Multiplayer / LAN readiness

**Shared-state fix built 2026-09-08 — code-complete, not yet verified by
a real live playtest.** Direct ask: the pack should be playable
multiplayer over LAN (one host, others join via "Open to LAN"), and
player count should scale the difficulty. Investigated from the real
KubeJS scripts, not the docs' own "singleplayer-focused" framing (which
several files state directly but never quantified) — real, concrete
failure modes found, then fixed directly per a follow-up "build it now."

**Real blocker, root cause confirmed by reading the code**: nearly
every piece of shared campaign state lives on `player.persistentData`
— per-player NBT — instead of true world/level state. In singleplayer
this is invisible (the one player's data and the world's data are the
same thing); in multiplayer it's a real, systemic bug, not a rough
edge. Confirmed consistent across every file that touches wave/pedestal
state: `td_waveNumber`, `td_inWave`/`td_wasInWaveForExpansion`
(`wave_status.js`, `base_expansion.js`), `td_pedestalHealth`/`X`/`Y`/`Z`
and `td_pedestalDestroyed` (`pedestal_health.js`, `pedestal_destruction.js`,
`wave_spawner.js`'s `waveObjective()`), `td_lastHornUseTick`/
`td_countdownActive` (`wave_spawner.js`), and — worst of the set — the
"has the base already been built" flag `td_playtestKitGiven`
(`playtest_starter_kit.js`).

That last one is the sharpest concrete failure: `PlayerEvents.loggedIn`
gates the *entire* world-build sequence (wasteland biome search, walls,
starter kit, pedestal placement, worldspawn/border setup, scoreboard
reset) behind `td_playtestKitGiven` read from **the joining player's
own** persistent data. Any player who logs in for the first time —
even into a world where the base has already existed for hours — has
that flag read as `false` for them personally, and re-runs the whole
build: a second base gets constructed at a different biome-search
result, `spreadplayers ... @a` drags **every online player** there
mid-session, and `scoreboard players set @a td_waves_cleared 0` resets
the shared wave counter for everyone. Wave number and pedestal
state would desync the same way the moment two different players'
copies of `td_waveNumber`/`td_pedestalHealth` diverge (e.g. whichever
player last blew the Wave Horn advances only their own counter).

**The obvious fix (a real level-scoped persistent store) is already
ruled out** — not by this investigation, but by an earlier one, left as
a comment in `base_expansion.js`: KubeJS's server/level-scoped
`persistentData` was checked directly against its own source
(`MinecraftServerMixin.java`) and found to have no save/load hook at
all — a plain in-memory `CompoundTag` that resets on every restart.
Not usable as-is for anything that needs to survive a server restart.

**Real fix, built 2026-09-08**: this pack already summons a permanent,
forceloaded marker entity at the pedestal (`td_pedestal_target`, from
the "always pedestal-relative" rework) purely as a targeting anchor.
Whether KubeJS's `persistentData` capability is generic to any `Entity`
(not player-specific) was the one open technical question blocking this
— **confirmed, not assumed**: decompiled this pack's exact installed
KubeJS jar (`kubejs-forge-2001.6.5-build.26`) with `javap`.
`EntityMixin.class` implements the capability once, generically, on
vanilla's own `Entity` class (a real `kjs$persistentData` field, saved/
loaded under the `"KubeJSPersistentData"` NBT key via real mixin
save/load hooks); `PlayerMixin`/`ServerPlayerMixin` don't redeclare it
at all — `Player` just inherits `Entity`'s implementation through the
class hierarchy. So the marker entity persists it exactly like a player
would, real NBT, survives a restart, no new infrastructure needed.

New shared file `world_state.js` exposes `worldData(level)` (finds the
`td_pedestal_target`-tagged entity, returns its `persistentData`, or
`null` before the very first login's build has finished) and
`findWorldStateEntity(level)`. Every read/write of the shared campaign
state — `td_waveNumber`, `td_pedestalHealth`/`Destroyed`/`AlertTier`/
`BossbarAdded`, `td_lastHornUseTick`, `td_countdownActive`/`EndTick`,
`td_inWave`/`td_wasInWaveForExpansion`, `td_lastEndlessLevel`,
`td_waveSpawnCompleteTick`, `td_amuletOnPedestal`,
`td_starterGearRemoved`/`td_pacingAnnounced` — moved from
`player.persistentData` to this shared store, across
`playtest_starter_kit.js`, `wave_spawner.js`, `wave_status.js`,
`base_expansion.js`, `wave_airdrop.js`, `pedestal_health.js`,
`pedestal_destruction.js`, `amulet_pedestal.js`, and `amulet_border.js`.
`td_pedestalX`/`Y`/`Z` also moved to the marker as the authoritative
copy, but are additionally mirrored (write-only cache, never read as
authoritative) onto every player's own data at kit-give time, purely so
`mob_aggro.js`'s existing `ensurePedestalMarker()` recovery safety net
(and this file's own `td_zcraftCleanupDone` migration) still have a
coordinate to fall back to if the marker is ever lost some other way —
that function intentionally wasn't touched.

**The world-build gate itself was the sharpest fix**: `playtest_starter_kit.js`'s
login handler now checks `findWorldStateEntity(level)` FIRST — if the
marker already exists, a newly-joining player just gets their own
starter kit (extracted into `giveStarterKit()`) and a read-only mirror
of the pedestal coordinate, and returns immediately, never touching the
biome search / wall-building / `spreadplayers @a` / scoreboard-reset
path at all. Vanilla's own `/setworldspawn` (set once, by whoever
originally built the world) already places a player with no personal
spawn override directly at the base on login, so no manual teleport is
needed for a latecomer.

**Self-guards against duplicate firing with multiple players online,
reasoned through, not just hoped**: several of these (the countdown
auto-trigger, the wave-clear detection, the base-expansion edge
detector) are `PlayerEvents.tick` handlers that now run once per online
player against the SAME shared flag. Minecraft's server tick is
single-threaded — whichever player's handler runs first in a tick flips
the flag before the next player's handler reads it, so the transition
still only fires once per real event regardless of how many players are
online. This also incidentally fixes a latent bug that existed even
before this pass: two players both blowing the Wave Horn in the same
tick used to each get their own independent cooldown, so both would
succeed and double-spawn a wave.

**Real known gap, not silently glossed over**: `mob_aggro.js`'s
`ensurePedestalMarker()` recovery path (re-summons the marker if it's
ever found missing, a narrow safety net dating to the 2026-09-05
retrofit) creates a brand-new, empty-`persistentData` marker if it ever
actually fires — it would NOT restore `td_waveNumber`/`td_pedestalHealth`/
etc. from wherever the campaign actually was. This only matters for a
save whose marker was already missing before this exact fix shipped
(the scenario that safety net was originally built for); a fresh
marker summoned by a normal world-build always gets its state written
in the same breath, never separately "missing." Not fixed here —
narrow enough, and specific enough to a already-flagged historical
migration edge case, not to be worth broadening this fix's scope for.

**Verified so far**: every touched file passes `node --check` (this
pack's own standing syntax-check practice). The core API assumption
(persistentData generic to any Entity) is confirmed via decompile, not
guessed. **Not yet verified**: no live boot test, solo or multiplayer —
this session doesn't have this repo's sandbox-server setup, and
touching the user's real live save directly is out of bounds (see
`feedback_live_save_write_permission_boundary`). A real test needs
someone to actually open the world to LAN with a second player (or a
second client) and play through at least one full wave-horn cycle,
ideally including a fresh second-player login after the base already
exists — exactly the scenario that was broken.

**What did NOT need to move**: broadcast commands already correctly
target `@a` (titles, sounds, gear removal at `GEAR_REMOVAL_WAVE`), and
`bounty_kills.js`'s per-player kill/bounty tracking plus the loot bag
notification system are correctly player-scoped already — a bounty is
supposed to be personal. Only the "one shared campaign" state needed to
move; the pack's UI/reward layer already assumed a party correctly.

**Resolved during the build, not left open**: `td_playtestKitGiven`
stayed exactly what it says — a per-player "has THIS player received
their gear" flag — while the world-build gate became a separate check
(marker existence, via `findWorldStateEntity`). A latecomer's
now-redundant `td_pedestalX`/`Y`/`Z` mirror is harmless leftover NBT by
design (see above), not cleaned up and not worth cleaning up.

### Player-count-scaled difficulty — direction chosen, not built

**Real decisions made 2026-09-08**: scale by adding more mobs per wave
(not just tougher individual mobs), plus real party-wide perks so more
players isn't purely "harder for the same reward" — the perks
themselves are unscoped. Tune for 2-4 players, favoring a curve that
degrades gracefully rather than being hand-tuned to one exact count.

**Real lever already installed, currently unused**: Undead Nights (the
mod already driving the endless phase, waves 9+) ships its own
per-player dynamic scaling block in
`undeadnights_difficulty_config.json` —
`healthScalePerPlayer`/`damageScalePerPlayer`/`speedScalePerPlayer`/
`armorScalePerPlayer`/`hordeScalePerPlayer`, each with a matching
`maxXScale` ceiling — but `dynamicScalingEnabled` is currently `false`
and every scale value beyond health/damage (0.05 each) is `0`. Flipping
this on and tuning the values covers endless-phase scaling almost for
free, no KubeJS code needed — though per this pack's own established
finding (IDEAS.md/FEATURES.md history), Undead Nights' config is a
Forge `SERVER`-type file, so a change needs a full restart to take
effect, not a live edit.

**Waves 1-8 have no such mechanism** — the hand-authored `WAVES` array
in `wave_spawner.js` is a fixed `[mobType, count]` list per wave. Real,
small addition (not new plumbing): multiply each wave's mob counts by
a player-count-derived factor at horn-use time, reusing the exact
per-mob `Attributes` NBT override technique this file already uses for
the zombie-roster tuning (`summonNbt`'s `Attributes:[...]`). **Real
open question, not decided**: should the multiplier key off total
online player count, or players actually near the base/pedestal —
a player off exploring solo shouldn't inflate the horde size for a
partner defending alone back at base. The pedestal's own
`waveObjective()` position is the natural anchor for a distance check
if that's the direction chosen.

**Sequencing note, not just a scheduling detail**: this cannot be
built before the shared-state fix above, or it makes the existing bug
worse rather than better — scaling logic that reads "current wave
number" or "current pedestal state" needs those to actually be one
shared value first. Building player-count scaling on top of today's
per-player wave counters would scale each player's own desynced view
independently.

**Party-wide perks — genuinely unscoped.** No concrete design yet
(bonus loot rolls, a shared buff, something else); needs its own real
design pass before this is buildable, not implied by the "more mobs"
half already decided.

**Not sent to build** — assessment and direction only, per explicit
request this session. Sequencing relative to the tier roadmap and
frenetic pivot specs (both also pending "send it" as of today) not yet
decided either.
## Track C: Advanced Tower Defense turrets, Shrapnel economy, boss wave, boss-kill Totem — live, 2026-09-08

**Sync note for whoever merges this**: this worktree's `docs/FEATURES.md`/
`docs/QUEUE.md`/`docs/IDEAS.md` were forked from `master` mid-session and
never picked up the live-checkout's own in-progress "Frenetic-combat
pivot & tower-defense research batch" and "Hardcore mode" sections (this
worktree's copies are ~440/~95/~2 lines shorter than the live checkout's
at time of writing — a real content gap between worktrees, not just a
formatting difference). Everything below was built and reasoned from
those sections' real content (read directly from the live checkout
before any building started), but this entry is a fresh append rather
than an edit to a "planned, not built" stub, since no such stub exists
in this worktree's own copy of the file. Reconcile against the live
checkout's fuller version when merging, not just this file.

This is Track C of the 2026-09-08 roadmap (`docs/QUEUE.md`'s "Roadmap:
tier-by-tier feature-rich buildout" section) — Phase 2 (Tier 2 automated
turrets + economy), then Phase 4 (boss wave capstone), then Phase 5's
boss-kill-drop Totem half, built in that dependency order. Full
Advanced Tower Defense recipe-chain writeup (real decompiled ids/
quantities, the `tech_tablet_mechanics`/Blueprint gating fix, why the
established `event.remove`+`event.shaped` pattern doesn't apply to the
turret heads themselves) lives in `pack/kubejs/server_scripts/
tier2_recipes.js`'s own header comment - not duplicated here, that file
is the source of record. Shrapnel's design reasoning lives in
`pack/kubejs/startup_scripts/shrapnel.js`. Boss-wave cadence/identity
decisions and the boss-kill Totem mechanism live in
`pack/kubejs/server_scripts/boss_wave.js`'s own header comment.

**What shipped**:
- Advanced Tower Defense installed (packwiz, real jar hash-verified).
- `kubejs:shrapnel` - new Tier 2 crafting material, real texture
  generated (raw PNG chunks, no art tool available, validated via Java
  ImageIO before committing), added to all 4 BountyBags loot-bag tiers
  (`data/bountybags/loot_tables/items/*.json` - Uncommon 2-4/weight 20,
  Rare 4-8/weight 25, Epic 6-10/weight 20, Legendary 10-16/weight 12).
- 3 new real recipes in `tier2_recipes.js`: `tech_tablet_mechanics`
  (unblocks the Turret Workbench + both turret base blocks),
  `blueprint_musket_turret`, `blueprint_anvil_launcher` - all gated
  behind Shrapnel.
- 2 new campaign.snbt quests ("Beyond the Bow", "Anvils From Above") in
  the existing turret section, live-save progress checked first (no
  collision - the live save's real progress is still entirely in the
  early tips/basics quests).
- `boss_wave.js` - full boss-wave system: every 10th wave (10, 20, 30,
  ...) spawns a stat-buffed, netherite-armored `mutantszombies:
  mutant_brute` ("The Behemoth", 600 HP/30 attack vs. its real 120/18
  baseline), tracked via a real vanilla `/bossbar`, announced via
  title/tellraw/particles and a real vanilla music track
  (`minecraft:music_disc.pigstep`, played/stopped via `playsound`/
  `stopsound` - no custom `.ogg` synthesized, no tool available in this
  environment to make a convincing one, and this pack's own Tesla Coil
  entry already treats a custom `.ogg` as optional). Zero farmable gear
  (`ArmorDropChances`/`DeathLootTable` - real vanilla mechanisms, not
  guessed) - drops a curated reward instead:
  `securitycraft:universal_block_reinforcer_lvl1` (real id, verified by
  hash-checking the installed SecurityCraft jar directly - the research's
  guessed id with no tier suffix doesn't exist), 12x Shrapnel, and a
  **guaranteed** `minecraft:totem_of_undying` - the real Phase 5
  boss-kill-drop Totem source for docs/IDEAS.md's still-parked Hardcore
  mode design (only this one drop mechanism was built - the rest of
  Hardcore mode, permadeath toggle/death-hook/pedestal-vulnerability,
  stays exactly as parked, out of this batch's scope).
- Resolved the shared cadence fork between Phase 4 and
  docs/IDEAS.md's "Wave-clear reward: a building/machine places itself
  in the base" entry (see that entry's own updated note) - both now
  point at "every 10th wave."

**Also picked up, time allowed (lowest priority, "if time left")**:
Phase 5's crafting-recipe Totem half - `hardcore_totem_recipe.js`, a
single new shapeless `minecraft:totem_of_undying` recipe (vanilla ships
none at all). Real material choice: not literally "Rare-tier loot bag
contents" as docs/IDEAS.md's own example suggested - checked this
pack's actual Rare tier directly and none of it reads as
totem-worthy (iron/quartz/gold_ingot/redstone_block/obsidian/
lapis_block/iron_block/tnt/ender_pearl/diamond) - used Epic/Legendary
tier materials instead (1 nether_star, 2 diamond_block, 1 gold_block, 1
netherite_scrap), a considered substitution, documented as such in the
file's own header. Scoped exactly as narrow as the boss-kill half - only
the recipe, not the rest of Hardcore mode.

**Not built, deliberately out of scope for this pass** (flagged, not
silently dropped): SecurityCraft modules as turret-recipe components,
turret combat-feedback effects (muzzle flash/ballistic impact - real
turret ids now exist so this is unblocked whenever picked up), tooltip
tier color-coding (depends on Track A's Phase 1 base system landing
first - nothing to extend yet in this worktree), Phase 6 bounty shop.

**Verification status - real full-mod-set sandbox boot completed, not
skipped.** Built a genuine throwaway dedicated server (Forge
1.20.1-47.4.10, matching `pack/pack.toml`'s pinned version) since none
existed on this machine: real jar/mod-hash-verified copies of all 74
already-installed mods from the live CurseForge instance's own `mods`
folder (read-only copy, the live save itself never touched, per
[[feedback_live_save_write_permission_boundary]]) plus this track's new
Advanced Tower Defense jar, with this worktree's own edited
`kubejs`/`config` overlaid on top. One mod (`MobDismemberment`) excluded
- already-documented in this pack's own history as genuinely
dedicated-server-incompatible (client-only, throws
`RuntimeException: ... invalid dist DEDICATED_SERVER` on a real headless
server - confirmed by hitting that exact crash first, then excluding it,
not assumed from memory alone) - unrelated to anything built here.
**Real, clean results**: `Done (50.680s)! For help, type "help"` - full
successful boot, zero crashes, zero crash-reports. `Loaded 24/24 KubeJS
server scripts... 0 errors and 0 warnings`. `Added 9 recipes, removed 3
recipes, modified 0 recipes, with 0 failed recipes` - confirms every new
item id used in this track's recipes (`kubejs:shrapnel`,
`advanced_tower_defense_mod:tech_tablet_mechanics`/
`blueprint_musket_turret`/`blueprint_anvil_launcher`,
`minecraft:totem_of_undying`) is real and resolvable, not guessed.
`FTB Quests: Loaded 1 chapter groups, 3 chapters, 36 quests, 0 reward
tables` - zero parse errors, both new turret quests present and loaded.
The 10 real ERROR-level log lines present are all pre-existing,
unrelated to this track's changes - Advanced Tower Defense's own 2 gaps
(a `vampirism`-family tag/holy-water tag referencing an uninstalled
optional soft-dependency mod, and one stale advancement referencing a
`deleted_mod_element` placeholder - both real quirks in the mod's own
shipped data, confirmed by checking, not assumed), plus 2 other
pre-existing mods' own advancement/tag gaps (Supplementaries →
farmersdelight, Zombies More's "kaboom" advancement) and a couple of
generic vanilla dedicated-server warnings. None reference `shrapnel`,
`boss_wave`, the two Blueprint recipes, `tech_tablet_mechanics`, or
`hardcore_totem_recipe` at all. **Not verified by this boot** (needs a
real connected player, impossible in this headless environment): the
boss's actual spawn-cadence trigger firing, the `/bossbar` rendering
correctly, in-world turret assembly at a placed Turret Workbench, and
quest-completion detection - all client-visual/player-interaction checks
this pack's own history repeatedly notes as the real remaining bar
beyond a clean script/data boot.
## Phase 0/1 build: Realistic Airdrop + Enhanced Hordes + WWZ counter (2026-09-08)

Built directly from the "Frenetic-combat pivot & tower-defense research
batch" spec staged in this file's working copy at dispatch time (Phase 0
= the Realistic Airdrop swap-in, Phase 1 = Tier 1 finish + the frenetic
layer). Full literal status for each bullet is tracked in docs/QUEUE.md's
"Roadmap" section under Phase 0/Phase 1 - this entry is the deeper
decompile/verification record docs/QUEUE.md's own convention points back
to here for.

### Realistic Airdrop - real mod verification, not trusted from the spec

The spec's own "already-verified facts" (only two 1.20.1 files existed,
both CurseForge Beta) turned out to be stale - re-checked directly
against CurseForge via `api.cfwidget.com` (no API key needed, real file
list with real upload timestamps) rather than trusted: there's a whole
non-beta **1.0.0.x release line** (`1.0.0`, `-hotfix`, `-hotfix3.0`,
March-September 2025) sitting between the old `0.9.5` beta (Oct 2024)
and a newer `1.1.0-1.20.1-beta` (Feb 2026, CurseForge file 7689163) the
original research never found. Downloaded and decompiled (Vineflower)
both the `hotfix3.0` release build and the `1.1.0-beta` build directly
to pick between them rather than assume the non-beta one wins by
default - diffed their class lists (only 2 new classes differ,
`Flycode2neomapProcedure`/`Flycode3neomapProcedure`) and their bytecode
(`SetairdropCommand`, `MobairdropticksProcedure`, config class all
differ in real, non-trivial ways). **Shipped on 1.1.0-beta**: it's a
genuine refactor (readable decompiled variable names vs. the older
build's MCreator `_levelxx` soup - a real maturity signal, not just a
version bump) and adds one directly useful feature - a trailing `map`
boolean argument that, when true, issues a real
`addwaypointxaero @a <x> <y> <z> ...` command on the crate's landed
position (confirmed inside the beta's own `MobairdropticksProcedure`).
Xaero's Minimap is already load-bearing in this pack, so this is a free
"find your crate" upgrade the release-tagged build doesn't have -
matches this pack's own "Beta is often just a CurseForge label, not a
real instability signal" precedent.

Real command/loot mechanism, traced end to end through the decompiled
source (not the mod's own listed examples, which were themselves
correct but unverified before this pass):
`/setairdrop random <player> <height> <length> <driftmin> <driftmax>
<blockid> <loot_table> <pin> <map>`. `SetairdropCommand` (real modId
`dyairdrop`, confirmed from `META-INF/mods.toml`) builds `<player>` as a
plain vanilla `EntityArgument.entity()` - `@r` resolves through
ordinary vanilla selector semantics (a random online player), nothing
dyairdrop-specific. `Flycode3neoProcedure` (the `random` handler) computes
a drift position around that player and re-dispatches into
`/setairdrop free` with the computed x/z - one real code path, not two.
`Flycode2neoProcedure` (`free`) plays a flyover sound, waits 60 ticks,
then summons a `dyairdrop:plane`/`dyairdrop:transportplane` entity whose
`CustomName` NBT text is a comma-joined `<blockid>,<loot_table>,<length>`
string - the mod's own de-facto "API" for passing state through its own
entity chain (plane → `dyairdrop:airdrop`/`dyairdrop:smallairdrop` entity
→ placed block). The falling entity's own tick procedure,
`MobairdropticksProcedure`, is where the payload actually resolves on
landing: for a non-locked blockid it runs a real
`setblock ~ ~ ~ <blockid>{LootTable:"<loot>"} destroy` command - genuine
vanilla `LootTable`/`RandomizableContainerBlockEntity` NBT, confirmed
separately by reading `AirdroplargeTileEntity.class` itself
(`extends RandomizableContainerBlockEntity`) - the same mechanism
`structure_chest_loot_fix.js` already relies on for structure chests
elsewhere in this pack. This settles the two real open verification
items from the original spec: a custom pack-registered loot table id
works exactly like a vanilla one (no allowlist, no validation, the
string is inserted into the NBT command literally), and `@r` really
does mean "random online player," not some border-relative or
dyairdrop-specific targeting mode.

Real, honest behavior difference from the old Paojiao134's Airdrop
flagged, not glossed over: this mod has **no worldborder integration at
all** - the old mod auto-confined drops inside the current border via
its own `BorderIntegrationHandler`; this one drifts purely off the
target player's live position. Mitigated by keeping
`WAVE_AIRDROP_DRIFT_MIN`/`MAX` modest (10-30 blocks) in
`wave_airdrop.js`, comfortably inside the border at every trigger point
(earliest is wave 5, where `base_expansion.js`'s real current curve
puts the border already well past that radius).

Real config judgment calls, `pack/config/dyairdrop.toml` - field names
confirmed by decompiling `AirdropconfigConfiguration.class` directly
(there is no other config surface for this mod - everything else is
command arguments): `enable=false` (this pack's own wave%5 trigger
replaces the mod's autonomous "global airdrop every N days" event
outright, not alongside it - same "no second autonomous system on top
of what this pack already drives" reasoning applied to every other mod
in this pack's history), `enableenemies=false` (default hostile-spawn
list is `pillager, zombie, husk` - pillager was stripped from this
pack's roster entirely on 2026-09-06, and any mob this spawned would be
invisible to `wave_status.js`'s hostile counter and un-targeted by
`mob_aggro.js`), `forceload=false` (the mod author's own shipped
comment - translated from the original Chinese - warns this "may
damage already-loaded permanent chunks, use cautiously on servers";
unneeded here since every drop targets a position near an already-
online, already-loaded player).

### Enhanced Hordes - real mechanic + real safety check against the walls

Real modId `enhanced_hordes` (confirmed `META-INF/mods.toml`), a
genuinely tiny MCreator mod (~51KB - a handful of tick procedures and 2
data-pack tag files, not the larger system the original research
implied). **No config toml exists at all** - decompiled the full jar to
confirm this rather than assume a missing file meant a missing feature;
every knob is either a vanilla `/gamerule` (`EnhancedHordesModGameRules`)
or a data-pack tag:
- `hordeStacking` (default true) - the real climb-assist mechanic: any
  tick, an entity tagged `forge:hordes` touching another `forge:hordes`
  entity gets a small upward `setDeltaMovement` nudge. Left at default -
  this is the actual WWZ effect that was asked for.
- `hordeMultiplying` (default true) - a separate mechanic entirely: a
  `forge:hordes` entity with a live target, standing on a
  `forge:hidden_zombie_blocks`-tagged block (dirt/sand/grass/gravel/
  etc.), can spontaneously dig an *extra* zombie out of the ground after
  a short delay - a real autonomous mob-spawn system. **Disabled** via
  new `enhanced_hordes_config.js` (`/gamerule hordeMultiplying false` on
  server load) - this pack has repeatedly declined to add a second,
  uncoordinated autonomous spawn source on top of its own hand-authored
  wave/horde spawning (same reasoning as the ZombieApocalypseAddon
  rejection above), and an extra zombie materializing out of the ground
  would desync `wave_status.js`'s hostile-remaining counter and
  `mob_aggro.js`'s pedestal-targeting the same way untracked spawns have
  broken both before.
- `hordeSmashingPower` (default 4) governs a block-destruction mechanic,
  checked directly against this pack's real wall materials before
  shipping rather than assumed safe from the "smash through walls"
  framing in web search results: it requires vanilla `mobGriefing=true`
  **and** the target block must be in a small hardcoded allowlist tag
  (`data/forge/tags/blocks/horde_breakable.json`, read directly from the
  jar) containing only leaves/crops/glass/ice/sea_lantern/sweet_berry_bush
  - no stone, wood, cobblestone, or SecurityCraft reinforced block is in
  that list. The perimeter walls, the pedestal, and every placed Tier 1+
  machine are exactly as safe from this as they were before Enhanced
  Hordes existed - this mechanic is structurally incapable of touching
  them, independent of the power number. Left at default.

Real participant list, `data/forge/tags/entity_types/hordes.json`
(read directly, not the research's own invented `horde_settings` block):
`zombie, zombie_villager, zombified_piglin, husk, drowned, slime`. All 5
non-slime entries are already central to this pack's real wave
composition (the 2026-09-06 zombie-apocalypse roster pivot put
husk/drowned/zombie_villager/zombified_piglin into live use) - the
stacking effect lands on mobs the player already fights early and
often, not a rare edge case.

**Advanced Wall Climber API conflict check - real, decompile-verified,
not assumed compatible.** Decompiled Mutants and Zombies'
`CrawlerEntity.class` directly: it implements `IAdvancedClimber` and
climbs entirely through AWC API's own `ClimberComponent`/
`ClimberPathNavigator` - a dedicated `PathNavigation` subclass replacing
the entity's own pathfinding. Enhanced Hordes' own mechanic never
touches `PathNavigation` at all - it only ever calls `setDeltaMovement`
on entities matching the `forge:hordes` tag, and
`mutantszombies:crawler` is not a member of that tag (confirmed above).
Zero shared classes, zero shared tags, zero code-path overlap - both
mods install and run together with no conflict. Deliberately not
merging Undead Nights'/Mutants and Zombies' own mob ids into the
`forge:hordes` tag in this pass (technically possible via a datapack
tag override, `replace: false`) - Enhanced Hordes was only ever
built/tested by its author against vanilla zombie-family AI, and
applying its stacking mechanic to modded entities with their own custom
goals untested is a real risk not worth taking without a playtest of
the base mechanic first. Flagged as a real, safe future follow-up, not
decided against permanently.

### WWZ counter-mechanic - Simply Traps' Stake Wall, chosen on real fit

Checked real technical feasibility of all 3 options in the original
spec before picking one:
- **Anti-climb overhang lip** - not built. Its actual effect on Enhanced
  Hordes' or vanilla pathing was never confirmed one way or the other in
  this pass either (would need a real live test to know if it does
  anything at all) - genuinely unknown, not ruled out, just not the
  strongest candidate found.
- **SecurityCraft Fake Water moat** - not built. Real and zero-new-mod
  (SecurityCraft already installed), but needs an entirely new physical
  trench dug around the existing perimeter - more construction than the
  other two options for the same defensive goal.
- **Simply Traps wall-mounted stakes - built.** Decompiled
  `StakeWallBlock.class`/`StakeWallEntityCollidesInTheBlockProcedure.class`
  directly rather than assuming from the name: `simply_traps:stake_wall`
  is a genuine, dedicated wall-mount block (real `HorizontalDirectionalBlock`
  with a `FACING` property and real per-direction blockstate variants,
  separate from the floor Spike Trap), non-solid (empty collision shape -
  doesn't block a mob's own path), and deals real contact damage
  (`SimplyTrapsConfigConfiguration.STAKEWALLDMG`, base 1.0 every 2 ticks,
  up to 10 dmg/sec of sustained contact) to any non-item entity touching
  it, gated on nothing else. This is the strongest technical fit of the
  three - a purpose-built block for exactly this use, not a repurposed
  one. `playtest_starter_kit.js` now places it along the outer face of
  every wall run at 3-block spacing, 2 heights, as part of the starting
  base build (not player-craftable) - skips the deliberately-weak wall
  stretch (stays undefended by design) and a small buffer either side of
  the gate opening.

### Slime Trap - evaluated, built as a minor Tier 1 addition

Decompiled `SlimeTrapBlock.class`/
`SlimeTrapEntityCollidesInTheBlockProcedure.class`: zero damage, a weak
outward push (0.175 block impulse) plus slime-block slipperiness - a
real but modest crowd-control/pathfinding-compression tool, genuinely
distinct from Spike Trap's damage and Bear Trap's much stronger
hold-in-place. Its real stock recipe (3x `minecraft:slime_ball` + 3x
smooth stone slab, confirmed from the jar's own recipe JSON) doesn't
work in this pack - `slime_ball` isn't obtainable anywhere in this
pack's loot economy (no passive mob spawning, no slime in the roster),
the same class of problem V01D's Bear Trap hit during the Trapcraft
removal. Re-recipied in `tier1_recipes.js` to 2 stick + 1 smooth stone
slab, matching Spike Trap's cost tier.

### Tier 1 trap decay/degradation - decided against, real reasoning

Not built. The Simply Traps/V01D pieces were installed the same day
this decision was made, specifically to *replace* a custom
degrade-and-break system (the original Trapcraft-era Spike Trap) that
this pack tore out and moved to mod-owned blocks to simplify. Re-adding
a hand-rolled per-kill break-chance mechanic on top of fresh mod pieces
would reverse that simplification within the same session, for a
mechanic nothing in this batch asked for by name - real scope creep, not
a natural extension. Revisit only if there's a specific, separate ask
for it later.

### Tooltip tier color-coding - built, real tier correction caught

New `pack/kubejs/client_scripts/tooltip_tier_colors.js` (this pack's
first client_scripts file - tooltip rendering is client-side only, same
as every other tooltip-adjacent mod already in this stack). **Real
correction, caught by checking the actual recipe files instead of
trusting the roadmap bullet's own summary**: the original Phase 1 spec
line ("Tier 1 items already have final IDs," citing Vacuum Blocks by
name) is stale - `tier2_recipes.js`'s own header comment and file
placement have treated Vacuum Blocks (and Medieval Defense Turrets'
Arrow Turret) as Tier 2 since the Trapcraft removal, re-recipied off
the Tier 2 (Rare-pool) loot tier, not Tier 1's Common pool. Colored per
the real recipe-file tier: Tier 1 (green) =
`simply_traps:spike_trap`/`stake_wall`/`slime_trap`,
`vds_bear_traps:bear_trap_open`; Tier 2 (yellow) =
`vacuum_cleaner:vacuum_block_tier_1`, `medievalturrets:bow_turret_item`.
Tier 3 has no real item ids yet (not built this session).

### Demolition Zombie + Mutants and Zombies - already shipped, verified not to need rework

Both bullets in the original Phase 1 spec assumed these were still open
work items ("folded in from On hold, fully specced 2026-09-01"). Checked
the real current code before repeating that work: the 2026-09-06
zombie-apocalypse roster pivot (see this file's "Mob roster &
defense-breaching threats" section) already installed Mutants and
Zombies, confirmed its real entity ids by decompile, and wired
`undeadnights:demolition_zombie` into wave 8 and the endless-phase
`boss_horde` pool - all verified live via real `/summon` calls at the
time, not re-done here. The one genuinely new question this phase raised
that the roster pivot never answered - Advanced Wall Climber API vs.
Enhanced Hordes - is answered above (no conflict).

**Real stale-premise catch, not silently worked around**: the
"also reinforce the gate" sub-item of the Demolition Zombie bullet no
longer applies. Checked `playtest_starter_kit.js` directly before
building a door-upgrade nobody could actually place: the gate has had
**no door block at all** since 2026-09-04 (a deliberate, later redesign
to a genuinely open 3-wide/3-tall gap, real playtest feedback) - there
is nothing left to reinforce, and building one back in would reverse a
more recent, explicit design decision the spec's own author wasn't
aware had already happened. The watchtower this same bullet referenced
was also removed entirely on 2026-09-03, for unrelated reasons (it
stood outside the defended perimeter). Left both as-is; the real
remaining exposure this bullet cared about (placed Tier 1+ machines,
and the deliberately-unreinforced weak wall stretch) already matches
its own "genuine strategy, not a free pass" intent without new
construction - see the Stake Wall placement above for the piece that
actually is new here.

### Verification

`node --check` clean on every new/touched script
(`wave_airdrop.js`, `wave_status.js`, `enhanced_hordes_config.js`,
`tier1_recipes.js`, `playtest_starter_kit.js`,
`client_scripts/tooltip_tier_colors.js`), the new loot table JSON
parses. Mod set added: Realistic Airdrop (`dyairdrop`) replacing
Paojiao134's Airdrop, Enhanced Hordes (`enhanced_hordes`) newly added -
both added via `packwiz curseforge add` against their real CurseForge
project/file ids, not hand-typed hashes.

**Real full-mod-set (76 total) sandbox boot - done, genuinely passed.**
Built a fresh throwaway Forge 47.4.10 dedicated server from the live
CurseForge instance's own current mod/config/kubejs set (not the live
save itself) plus this session's changes. First attempt hit Mob
Dismemberment's known, pre-existing, unrelated dedicated-server crash
(client-only mod, already documented elsewhere in this project's
history) - removed from the sandbox copy only, not from the real pack.
After that, `Loaded 24/24 KubeJS server scripts... 0 errors and 0
warnings` was confirmed on 3 separate boot attempts, and one attempt
ran all the way through world creation to `Done (45.103s)! For help,
type "help"` with FTB Quests loading its real 34 quests - a genuine
clean boot of the full mod set including both new mods and every
touched script. Two further attempts hit real machine-level resource
contention (this session ran alongside 2 other concurrent
parallel-track agents on the same physical machine - a JVM native
memory allocation failure at higher heap sizes, a port-25565 bind
conflict, and a world-save directory lock conflict, all environment/
timing issues unrelated to this session's own code) - worked around
with a smaller heap and a dedicated port, not silently ignored. One of
those extra attempts also caught and fixed a real bug: the first draft
of `dyairdrop.toml` used a flat, unsectioned layout that Forge silently
ignored (ended up running with the mod's own defaults, `enable`/
`enableenemies`/`forceload` all still `true`) - caught by reading the
config file the mod actually generated, fixed to the real
`[worldevents]`/`[chestevents]`/`[Performance]` section structure, and
re-verified by rebooting once more and reading the corrected file back
(`enable`/`enableenemies`/`forceload` all correctly `false`). Not yet
confirmed by an actual live playtest of: a
triggered airdrop crate (visual flyover, waypoint, loot-on-open),
Enhanced Hordes' stacking effect against a real horde, the Stake Wall's
damage tick against a climbing mob, or the tooltip rendering in a real
client.

## Live-feedback batch, 2026-09-09

3 items from direct playtest feedback ("less noise from the chat
window... popups", "bounties quests have a counter... 1/25 killed",
"boomer explosion is good but I can't hit the mob"). Each investigated
against the actual running instance / decompiled mod classes before
speccing, not guessed. QUEUE.md's own matching entry carries the
literal 1-3 checklist tracking build status.

### 1. Chat noise - toast popups for routine status pings

Real finding: KubeJS 2001.6.5 ships a native on-screen toast API never
used anywhere in this pack - `player.notify(...)`
(`ServerPlayerKJS.kjs$notify` / `NotificationBuilder` /
`NotificationToast`, decompiled directly from the shipped
`kubejs-forge-2001.6.5` jar), the same toast mechanism vanilla uses for
"Advancement Made!". Takes text, an optional icon (plain/item/atlas),
colors, and a duration (default 5s). Genuinely free - no reflection, no
new mod, no server/client sync work (it's already a real networked
message class).

Scope, per direct answer: convert the routine, repeats-every-wave
status pings to toasts; leave one-time flavor/lore lines in chat (they
read better as permanent scrollback you can scroll back to - a toast
vanishes after its duration).

Convert to `.notify(...)`:
- `wave_status.js:340` - "Wave N defeated!"
- `wave_status.js:182` - "the gap between waves keeps growing"
- `wave_status.js:425` / `:455` - force-clear messages
- `wave_spawner.js:708` / `:753` - "Wave N incoming!" (wave horn)
- `wave_spawner.js:462` / `:486` - horn-empty / wave-still-active warnings
- `base_expansion.js:85` - "border grows by N blocks"
- `wave_airdrop.js:89` - "a crate is on its way down"
- `pedestal_health.js:297` - heal message

Stay as chat (`.tell()`, unchanged):
- `wave_status.js:161-163` - gear-crumbles-to-dust lore beat
- `pedestal_destruction.js:83-84` - "the pedestal has fallen" (major,
  rare, wants permanence in scrollback)
- `amulet_pedestal.js` / `amulet_border.js` - amulet flavor lines (rare,
  one-shot per pickup/drop)

Mechanical, low risk - straight `player.tell(...)` ->
`player.notify(builder => { builder.text = ...; builder.duration =
...  })` swaps, no reflection. Needs one live check before shipping:
that toast text actually renders/wraps this pack's existing
§-color-coded strings correctly (Component parsing through the toast
path vs. the chat path).

### 2. Bounty quest counter (1/25 killed) - live progress via reflection

Real finding: decompiled FTB Quests 2001.4.22 directly
(`dev.ftb.mods.ftbquests.quest.task.CustomTask` / `KillTask` /
`command.FTBQuestsCommands`). Confirmed:
- The only script-facing command is `/ftbquests change_progress
  <players> complete|reset <id>` - no "set progress to N" subcommand
  exists in this version. That's why bounty tasks show a flat grey
  "custom" icon with no counter today - `bounty_kills.js` only ever
  calls `complete` at each exact threshold, never touches progress in
  between.
- Vanilla `KillTask` (which DOES show a live counter automatically)
  can't replace this design: it tracks exactly one entity type per task
  (bounties span ~15 mob types) and its own internal hook
  (`FTBQuestsEventHandler.playerKill`) only fires when
  `DamageSource.getEntity() instanceof ServerPlayer` - it would
  silently drop every trap/turret kill, which this chapter's own
  2026-09-05 design note explicitly requires counting.
- `CustomTask` does support a real `max_progress` + progress-bar
  display like any other task type - it's just never been populated
  because nothing calls the (nonexistent) set-progress command.

Fix, per direct answer: reach `TeamData.setProgress(Task, long)`
directly via reflection, using this codebase's own established
bootstrap (`Class.forName` via `anyObj.getClass().getClass()`, same
technique as `mob_aggro.js`'s `resolveClass` /
`loot_bag_notification.js`'s `punResolveClass`) -
`dev.ftb.mods.ftbquests.quest.ServerQuestFile.INSTANCE` is a public
static field, `.get(id)` returns the `CustomTask`, `TeamData.setProgress`
is a public method. On every bounty-counted kill (`bounty_kills.js`'s
existing `EntityEvents.death` hook), set each not-yet-completed
fixed-tier task's progress to the running kill count (clamped to its
own threshold) and the repeatable task's progress to `killCount %
1500`. Also needs `max_progress: 25/100/300/750/1500` added to each
task in `bounties.snbt` (currently defaults to 1, hence no visible bar
today).

Real risk, flagged not hidden: same class of reflection this pack
already ships successfully elsewhere, but genuinely new surface (first
time reaching into FTB Quests' own `TeamData`) - needs a live sandbox
check that `setProgress` renders the bar correctly and doesn't fight
with the existing `complete` calls at each threshold (a task already
marked complete should stay complete even if its computed progress
value is later recomputed above its own max).

### 3. Boomer zombie - let players kill it while armed

Real root cause, decompiled Zombies More 2.1.5 directly
(`net.mcreator.zombiesmore.entity.BoomerChargedEntity`). Once a
`boomer_zombie` takes its killing blow (or however else it transitions
- `BoomerZombiePlayerCollidesWithThisEntityProcedure` also triggers it),
it's replaced by `boomer_charged`, whose own `hurt()` override
unconditionally blocks all player-sourced damage:
```java
if (source.getEntity() instanceof Player) { return false; }
```
(alongside arrows, thrown potions, area-effect clouds, and most
environmental damage types). This short-circuits before `super.hurt()`
runs, so it never reaches the Forge event bus at all - a normal KubeJS
`EntityEvents.hurt`/`damaged` listener can never see or override it,
because the vanilla damage pipeline never gets that far. Mid-fight this
reads exactly like the report: a hit lands, the mob visibly transforms
(texture/animation change to `boomerexplode`), and every further swing
does nothing no matter how many more times you hit it, until the
explosion goes off at +80 ticks - it's not lag or a hitbox problem, it's
hardcoded in the mod's own bytecode.

Fix direction, per direct answer (needs the build session's own
verification, same as everything reflection/event-timing related in
this pack): can't patch the compiled `hurt()` method, but Forge's
`AttackEntityEvent` (`PlayerInteractEvent`-family) fires *before*
`hurt()` is ever called, when the player's attack begins - if that's
KubeJS-visible in this exact build, intercept a player attacking a live
`zombiesmore:boomer_charged`, apply damage by directly mutating its
health (`LivingEntity.setHealth()`, which bypasses `hurt()` entirely
rather than calling through it) instead of going through the blocked
path, and treat 0 HP as an early defuse: cancel its entry in
`boomer_zombie_explosion.js`'s `pendingBoomerExplosions` array and
discard the entity before the TNT summon fires. **Open question, not
assumed**: whether `AttackEntityEvent` is actually reachable from
KubeJS in this exact build, or whether this needs to fall back to the
same by-shape Forge-event-bus reflection this pack already uses
elsewhere - check first, don't build on the assumption.

## Live-feedback batch, 2026-09-09 (part 2)

3 more items from direct playtest feedback ("the starting house has
gone... no longer spawns in", "force the tab keybind to open quests",
"far far too many loot bags... about 15 bags" by wave 2). Each diagnosed
against the actual live instance (`logs/latest.log`, `options.txt`) or
the mod's own real NBT/JS before changing anything, not guessed.

### 1. Starting house missing - root cause + Red House swap

Root cause, found directly in the live instance's own `logs/latest.log`
for the exact world that reported it: that boot's spawn search landed
only 20.4 blocks from a real generated structure (this pack's own Big
Lost City/Philip's Ruins are the only ones dense enough to land that
close) - inside `STRUCTURE_MIN_DISTANCE`'s 200-block target - and the
same boot logged "terrain variance 66 blocks across the base footprint."
The terrain-leveling pass in `playtest_starter_kit.js` only compensates
for ~16 blocks of unevenness, nowhere near enough for ground that rough
- the `/place template` building landed on broken terrain fighting
another structure's own generation, while the courtyard's own `/fill`
walls survived fine (terrain-height independent). This is a real,
structural risk that could recur with ANY building on a future world -
not fixed here, flagged as a genuine follow-up if it happens again.

Direct ask once diagnosed: pick a different building rather than just
re-placing the same one. Presented the 2 remaining untried
postapocalypse_structures buildings (Yellow House 26×21×18, Red House
22×15×15 - Red Mansion 26×19×28 was already rejected as too big) plus
Abandoned Urban as a stylistic alternative; picked **Red House**, same
mod/aesthetic as before.

Full swap in `playtest_starter_kit.js`:
- `BUILDING_WIDTH/DEPTH/HEIGHT` updated to Red House's real decompiled
  dimensions (22×15×15, DataVersion 3465).
- `/place template` repointed at `postapocalypse_structures:red_house`.
- Every local-coordinate fixup re-derived from Red House's own real NBT
  (decompiled directly, not carried over from Abandoned Brick House's
  numbers, which would have hit arbitrary wrong blocks in the new
  layout): wet_sponge foundation swap (124 blocks vs. the old 78),
  ground-floor crafting table -> `craftingstation:crafting_station`
  (Red House has 2 baked-in vanilla crafting tables; only the
  ground-floor one is swapped), cauldron/tripwire/tripwire-hook removal
  (2 of each), and all 30 real loot barrels stripped (vs. the old
  building's 5) per the standing "loot lives outside the border" policy.
- Checked for Abandoned Brick House's other 2 known issues (green-
  terracotta/snow roof patch, "bed-like trapdoor" trick) against Red
  House's real NBT - neither exists in the same form, left untouched
  rather than guessing a fix for something not actually there.
- `worldborder set 50 -> 58`: real math, not guessed - the compound's
  outer wall sits `GATE_OFFSET + COURTYARD_DEPTH + BUILDING_DEPTH +
  BACK_MARGIN` blocks from spawn. The old 11-deep building left a real
  3-block buffer inside the old radius-25 border; Red House's 15-deep
  footprint eats that buffer entirely (and 1 block past it) unless the
  border grows too. `base_expansion.js`'s own growth is a relative
  `worldborder add`, so this needed no other change.
- **`HOUSE_REINFORCE_BLOCKS` (the 212-block wall-reinforcement pass from
  the 2026-09-04 "House reinforcement" feature) is disabled, not
  redone** - every entry is a local coordinate + block matched
  specifically against Abandoned Brick House's own wall geometry;
  applying it unchanged to Red House would reinforce arbitrary wrong
  blocks. Left in the file as reference, invocation commented out. Real
  follow-up if wanted: redo the same decompile-and-match process against
  Red House's own wall planes. Until then only the courtyard's own
  perimeter wall is reinforced - which is the part direct feedback
  actually praised ("the outer perimeter looks cool so want to keep
  that").

### 2. Tab keybind for quests - already in effect, no config change needed

Checked the live instance's own `options.txt` directly: FTB Quests'
`key_key.ftbquests.quests` is already bound to Tab, alongside vanilla's
`key_key.playerlist` and Refined Storage's `focusSearchBar`. Minecraft
doesn't actually block a key from being reused across bindings - it only
flags a "duplicate" in the Controls menu; every binding sharing a key
still fires on press. No pack-side change needed (and none made -
`options.txt` is a per-player file, not something this pack's build
process should be overwriting anyway).

### 3. Loot bags - drop-rate cut, real math not a guess

Root cause: `loot_bag_drops.js`'s 2026-09-08 redesign gives every wave
mob kill 4 independent rolls (0.5/0.15/0.07/0.02 = 0.74 expected
bags/kill). Wave 1+2 kill 21 mobs total (`WAVES[0]`/`[1]` in
`wave_spawner.js`), predicting ~15.5 bags - matches the report ("about
15 bags" by wave 2) almost exactly, with Uncommon's own 0.5 alone
accounting for ~70% of that volume.

Cut to 0.2/0.06/0.03/0.02 (~0.31 total/kill, ~40% of the old volume) -
same per-tier shape (every mob still gets an independent shot at every
tier, the real point of the 2026-09-08 redesign, not reverted), just
scaled down enough that a wave 1-2 clear lands around 6-7 bags instead
of 15. Legendary left untouched (deliberately a rare jackpot, and was
never the volume driver - only ~0.4 expected bags over the same 21
kills).

Known, flagged trade-off: Uncommon bags are this pack's real
`gold_nugget` source (calibrated against the 2026-09-05 gold-economy
fix) - cutting its rate to ~40% of its old value also cuts average gold
income from kills by roughly the same fraction, unless bag CONTENTS are
separately bumped to compensate (a heavier follow-up needing BountyBags'
live `config/bountybags/*.toml` deleted/regenerated, per this file's own
"STOP" note about its one-time loot-table cache). Not done here since
the actual complaint was volume, not "not enough gold" - revisit if gold
starts feeling short.

### Also fixed while in the area: bounty progress counter crash

Real live bug, not part of the 3 items above but found in the same
`logs/latest.log` sweep and cheap to fix while already in
`bounty_kills.js` for context: the just-shipped bounty progress-bar
reflection (previous batch, item 2 above) threw `TypeError: bqTaskForId
is not a function, it is undefined` on every real server boot, silently
disabling the whole progress display (the "STOP"-tier reflection risk
that entry's own "needs a live sandbox check" note anticipated). Root
cause: `bqTaskForId` was a `function` DECLARATION nested inside a `try`
block - this exact Rhino build doesn't reliably hoist a block-nested
function declaration the way normal JS engines do, even though its own
call sites sit textually below it in the same block. Fixed by making it
a plain top-to-bottom `var` assignment instead (a function EXPRESSION,
not a declaration), which carries no hoisting ambiguity in any engine -
same general "curated dispatch, not standard JS semantics" gap this
codebase has already documented elsewhere (Rhino Java reflection
quirks).

## Structure spawn-exclusion floor — built 2026-09-09, SUPERSEDED the same day

**Superseded by "Anchor-grid base placement" at the end of this file.**
Kept for the record: the `exclusion_zone` mechanism identified here is
real and is what the replacement builds on, but the numbers were wrong
in a way that mattered — `hasStructureChunkInRange` is pure grid math
over the other set's placement grid, so a `chunk_count` of 20 or 30
against a 32-chunk-spacing anchor puts an anchor inside EVERY search
box, i.e. every mid/far-tier set stopped generating anywhere, while
nothing protected the actual base (which never sat on the anchor).

Direct report with a Xaero's minimap screenshot: structures (villages,
gas stations, pillager outposts, ruins) landing "way way too close" to
spawn - the screenshot showed roughly a dozen distinct structures
clustered within ~100 blocks of the player, overlapping each other.
Same underlying issue the "part 2" item 1 entry above already flagged
as an unfixed risk ("spawn landed too close to a big structure... not
fixed, only worked around for this one report") - this is the real fix
for that class of bug, not just this one report.

**Root cause, not a guess**: `minecraft:random_spread` placement always
evaluates a candidate position for the grid region containing true
world coordinate (0,0), regardless of `spacing`/`separation` value -
that region's own offset range is `[0, spacing-separation)` chunks,
which starts at literally 0. Confirmed by re-reading this pack's own
retune history: 2026-08-31 tightened spacing to guarantee reachable
loot inside a then-tiny border, 2026-09-02 loosened it back because
density read as "saturating from wave 1," and 2026-09-09 (900d52c)
tightened it again into near/mid/far tiers (6/3, 14/7, 28/14 chunks) to
re-align density with `structure_loot_progression.js`'s distance-based
loot tiers. Each pass only ever changed the AVERAGE distance between
repeats of the same structure - none of them could fix the minimum,
because the near-origin region's floor is always 0 blocks regardless of
spacing. This save's runtime-searched spawn also happened to land
almost exactly at true (X:-4, Z:0), which is why every near-tier set's
near-origin roll actually manifested as visible clutter instead of
landing somewhere the player hasn't walked yet - and this isn't a fluke
specific to this save, since vanilla's own spawn search already starts
from (0,0) and expands outward, so most seeds keep spawn reasonably
close to true origin too.

**Fix: a real guaranteed minimum-distance floor**, not another spacing
guess. Verified `exclusion_zone` (`{other_set, chunk_count}`) is a real
1.20.1 field by extracting vanilla's own `pillager_outposts.json` from
the exact installed client jar (`Install/versions/1.20.1/1.20.1.jar`) -
it already excludes pillager outposts within 10 chunks of any village.
This pack already uses the same mechanism successfully in 3 places
(`u_desert:pillager_outpost` and `philipsruins:field_stone_ruins_rocks`
vs. `minecraft:villages`, and 6 of `the_lost_city`'s own sets vs. its
own `city` set) - reusing a pattern already proven in this exact repo,
not introducing an unverified one.

Built a dedicated anchor point at true world origin by overriding the
vanilla `minecraft:ocean_monuments` structure_set
(`pack/kubejs/data/minecraft/worldgen/structure_set/ocean_monuments.json`,
new file - no prior override existed) to `spacing: 32, separation: 28`
(32 is unchanged from vanilla's own stock value, only separation moved
closer to it) - its region-(0,0) instance now lands within 0-64 blocks
of true origin, deterministic within one chunk band. Picked
`ocean_monuments` specifically because this world's biome source
(`pack/kubejs/data/minecraft/dimension/overworld.json`) has no ocean
biome at all (desert/badlands/plains/sunflower_plains/meadow only) - the
anchor's own structure can never physically generate, so it's purely a
math reference point, zero visual footprint. `exclusion_zone` uses the
other set's grid-computed candidate position for distance checks
independent of whether that structure actually passes its own biome
check - same reason vanilla's own pillager-outpost/village exclusion
already works this way.

Added `exclusion_zone` (vs. `minecraft:ocean_monuments`) to every
structure_set from the near/mid/far density pass, tiered to roughly
double each tier's own existing spacing-chunk value plus a margin for
the anchor's own small position uncertainty:
- **Near tier -> `chunk_count: 10`** (~160 block floor): both
  `abandoned_urban` sets (fire_tower, gas_station),
  `philipsruins:desert_structures`, all 4 `postapocalypse_structures`
  houses, and `minecraft:villages` itself (previously had no exclusion
  at all).
- **Mid tier -> `chunk_count: 20`** (~320 block floor): the remaining 5
  `abandoned_urban` sets and 10 remaining `philipsruins` sets.
- **Far tier -> `chunk_count: 30`** (~480 block floor):
  `watchtower_building`'s 2 sets, plus `philipsruins:nether_ruins` and
  `underground_structures` (48/24 spacing, previously untouched by any
  retune pass).

**2 files already had an `exclusion_zone` slot in use** (a structure_set
can only hold one) - `u_desert:pillager_outpost` and
`philipsruins:field_stone_ruins_rocks` both previously excluded 10/20
chunks from `minecraft:villages` (anti-overlap, not anti-spawn-clutter).
Swapped their target to the new anchor instead, same chunk_count each
already had - trades away the "don't overlap a real village" guarantee
for the reported bug's fix, a deliberate call given the report's
severity.

**Deliberately left alone**: `the_lost_city`'s 10 sets (explicit caution
carried over from 900d52c - "has its own overlap safeguards, retuning
it once already caused a real collision crash"; adding an exclusion
field is a smaller change than retuning spacing but not worth the risk
given 6 of its 10 sets already use their own single `exclusion_zone`
slot against `the_lost_city:city` for internal collision safety).
`abandoned_structures`' 4 sets (`berezka_api:berezkas_structure_placement`,
a mod-custom placement type, not vanilla `random_spread` -
`exclusion_zone` support unverified for this codec, and this set is
already the least severe offender at 28-96 chunk spacing). Both are
real, lower-severity gaps, not fixed here - flagged as a known follow-up
if either keeps showing up close to spawn after this fix.

Validated all 30 touched/new JSON files parse (`node -e
"JSON.parse(...)"`), matching this pack's own JSON-syntax-check
discipline. **Not yet verified via a real sandbox boot** - unlike this
pack's usual worldgen-change practice (structure placement changes have
caused 3 real world-creation crashes before: YUNG's Better Desert
Temples, the noise-settings schema gap, the Radium chunk_region race),
this pass reused only fields already proven live in this exact repo
(`exclusion_zone` shape, `ocean_monuments`' own vanilla spacing value),
but a real boot + `/locate` distance check against the new anchor is
still the right verification step before calling this confirmed.

**Real, honest limit, same as every other worldgen change in this
pack**: structure placement is decided at chunk-generation time. The
screenshot's own already-explored chunks near spawn were generated
under the old settings and will keep exactly what's already there -
this fix only changes what generates in chunks that haven't loaded yet.
Seeing the fix reflected around spawn specifically needs either a fresh
world, or the border/exploration eventually reaching not-yet-generated
territory near the old spawn (unlikely to happen naturally, since
that's precisely the area already explored).

## Anchor-grid base placement — 2026-09-09, replaces the login-time spawn search

Direct report, urgent: "world gen is still broken — takes ages to get
the custom world to load, the base isn't spawning correctly, and
structures are spawning way too close to my base." Diagnosed from the
live instance's own `logs/latest.log` plus both fresh saves created
that morning (`level.dat` and the player `.dat` decoded directly with a
small NBT reader), then every engine claim below was checked against
the decompiled bytecode of the exact installed jars (Forge-patched
client jar for `MinecraftServer`, the SRG client jar for the vanilla
classes, the KubeJS jar for its own API) before any code was written.

**What the logs actually showed (both boots, 10:47 and 11:10):**
- Vanilla's "Preparing spawn area" took 23.5s and 25.0s — 441 chunks
  generated around a spawn near world origin that this pack then never
  used.
- After login, the handler froze the server for 36s and 55s ("Can't
  keep up! Running 55240ms or 1104 ticks behind"). The player sat in
  the sky watching the old world, then fell.
- The old structure-proximity search never found a site: "no wasteland
  spot cleared 200 blocks of structure clearance within 4000 blocks,
  using best real candidate found (120.9 blocks clear)" — and 160 on
  the other boot. Bases ended up 2,200 and 3,700 blocks from origin.
- Both boots then threw `Cannot read property "persistentData" from
  undefined` right after summoning the pedestal marker, aborting the
  handler before the Red House was placed. That is the "base not
  spawning correctly": walls, pedestal and waystone down, no house, no
  forceload, no pedestal HP, no wave targeting.
- Both boots logged "terrain variance 66 / 61 blocks across the base
  footprint" and ran the leveling pass.

**Five real root causes, in order of severity:**

1. **The structure-proximity check generated chunks.** The old search
   reflected into `ChunkGenerator#findNearestMapStructure`. That is not
   a pure lookup: `getStructureGeneratingAt` calls
   `level.getChunk(x, z, ChunkStatus.STRUCTURE_STARTS)` for every
   candidate placement chunk inside its 15-chunk search radius, so each
   ring-search candidate synchronously generated hundreds of chunks (the
   11:10 save had 48 region files after a 2-minute session, with probes
   6,000+ blocks out). With near-tier structure_sets at 6-chunk spacing
   there is no point anywhere with 200 blocks of clearance, so the
   search always ran to exhaustion and then took its "best" candidate.
   This is the 36–55s freeze.
2. **The marker lookup raced chunk visibility.** A chunk that was
   force-generated inside the same blocked tick has its entity section
   still HIDDEN — the chunk map only promotes sections when its own tick
   processes the ticket change — so `level.getEntities()` (KubeJS reads
   the visible-entity storage) cannot see anything just summoned into
   it. The orphaned working-tree "fix" (move the block after the house,
   retry once in the same tick) could not work: a same-tick re-summon
   just makes a second invisible marker.
3. **The exclusion-zone anchor disabled structures instead of
   protecting the base.** Decompiled
   `ChunkGeneratorStructureState#hasStructureChunkInRange` (m_254936_):
   it loops a `(2·chunk_count+1)²` box and calls
   `StructurePlacement#isStructureChunk` (m_255071_) on the OTHER set's
   placement grid — no biome check, no chunk loading. Against
   `minecraft:ocean_monuments` (spacing 32) a `chunk_count` of 20 or 30
   means the box always contains a full 32-chunk region, so every
   mid/far-tier set was excluded from the entire world. Near tier (10)
   lost ~43% of its placements in a grid pattern. And none of it kept
   anything away from the base, which never sat at the anchor. The
   uncommitted follow-up in the working tree (repoint to
   `the_lost_city:city`, spacing 34) had the identical flaw.
4. **`Level#getHeight` is hasChunk-gated.** Verified in bytecode
   (m_6924_ → m_7232_/hasChunk, else m_141937_/getMinBuildHeight): for
   a chunk that isn't loaded it returns -64 without generating anything.
   The 9-point flatness sample reached into not-yet-loaded chunks, read
   -64 against a real surface of 2, and reported "66 blocks of
   variance" — the leveling pass was firing on a phantom, not terrain.
5. **Two loot scripts still carried a hardcoded spawn** of (1171, -499)
   — `structure_loot_progression.js` and `structure_chest_loot_fix.js` —
   a one-seed coordinate stale since the spawn became a runtime search
   on 2026-09-06. Every chest in the world was being tiered against a
   point nobody was near.

**The fix — turn finding 3 into the mechanism.** One anchor structure
set, `kubejs:base_anchor` (`data/kubejs/worldgen/structure_set/
base_anchor.json`, structure `minecraft:monument`, which can never
generate in this biome source): `spacing: 64, separation: 63`. With
`spacing - separation = 1` the random offset is `nextInt(1) = 0`, so
the placement chunk is pinned to exactly chunk `(64i, 64j)` for every
region — no randomness left. Every structure_set that can generate in
this world's biomes (52 files: vanilla villages/pillager_outposts/
ruined_portals, all 5 u_desert sets, supplementaries way_signs, 14
Philip's Ruins, all 12 Lost City, all 4 abandoned_structures — Berezka's
`DistanceBasedStructurePlacement` extends `RandomSpreadStructurePlacement`
and its codec carries `exclusion_zone`, confirmed by decompile — 7
abandoned_urban, 4 postapocalypse_structures, 2 watchtowers) now carries
`exclusion_zone: {other_set: "kubejs:base_anchor", chunk_count: 12}`
(16 for the sprawling `the_lost_city:city`/`big_city_structure`/
`villages_city`/`roads` and `abandoned_urban:city`). That carves a
guaranteed structure-free 25×25-chunk box (≈400 blocks) around every
anchor chunk, 1,024 blocks apart — the nearest allowed placement chunk
starts ~200 blocks from the base centre, the exact target the old
search could never reach. Sets that previously used their one
`exclusion_zone` slot against villages or Lost City's own `city` set
lose that anti-overlap rule; Berezka already destroys overlapping
structures at runtime (the "[Berezka API] structure X is spawned inside
other structure Y, trying to destroy structure" lines in every log), so
the mods' own safeguard still applies. New overrides were seeded from
the mods' own jar defaults; the old `ocean_monuments.json` override is
gone (no oceans exist, and repointing everything to `city` was reverted
with it). Philip's `pumpkin_ruins`/`rare_ruin` are forest/jungle-gated
and left alone; `infinity_city` is Lost-City-dimension only.

**The base is then simply placed ON an anchor chunk.** `findBaseSite()`
in `playtest_starter_kit.js` walks the anchor grid nearest-origin-first
(6 rings, 13×13 points, 6,144 blocks each way), requires the centre
column in desert/badlands, prefers the four ±96-block samples to be
wasteland too, and self-checks the chosen chunk with the exact method
the exclusion zone uses — `hasStructureChunkInRange` over
`possibleStructureSets()` (m_255252_, vanilla's own biome-filtered list)
— logging any set that still reports a placement chunk inside the box.
Pure biome lookups plus grid math: the whole search measured 126ms in
the sandbox, versus 36–55 seconds of chunk generation before.

**Timing moved to world load.** Verified in the Forge-patched
`MinecraftServer#createLevels`: `LevelEvent$Load` for the overworld is
posted (bytecode 226) BEFORE the `isInitialized` check (233) and
`setInitialSpawn` (250). So `LevelEvents.loaded` now picks the site,
runs `/setworldspawn` through `event.server` (NOT `level.runCommandSilent`
— that KubeJS variant iterates `Level#players()` and runs the command
once per online player, i.e. never with nobody online; caught in the
first sandbox boot, where the spawn silently stayed at (0,0)), and
flips the level's own `initialized` flag (m_5555_) so vanilla skips its
climate-based spawn hunt. Vanilla's 441-chunk "Preparing spawn area"
pass then generates the BASE's surroundings — inside the structure-free
box, so it is cheap — and `ServerEvents.loaded` builds the compound
before any player can join. The player's first placement lands
directly in the courtyard: no double spawn, no slow-falling hop, no
frozen tick, no `spreadplayers`. The pedestal marker is created through
`level.createEntity('minecraft:armor_stand')` + `mergeNbt` + `spawn()`
so the entity reference is held directly — no lookup to race. A
`surfaceHeightAt()` helper touches a block state first (which goes
through `Level#getChunk(x, z)` → FULL, load=true, the same path
vanilla's own `setInitialSpawn` takes via `PlayerRespawnLogic`) so every
heightmap read is against a generated chunk. The login handler is now
per-player only (starter kit, coordinate mirror, sidebar score seed via
`scoreboard players add @a td_waves_cleared 0` so a late joiner no
longer resets everyone's count), with the full site-search-and-build
kept as a logged last-resort fallback for a world where the load-time
path failed. Both loot scripts read the base position live from the
marker's persistentData (`worldData(level)`), with their radii shifted
+200 (60/120 → 260/320, FAR 120 → 320) so band widths are unchanged
relative to where structures can now actually start.

**Verified in a full-mod-set sandbox (the same 81-jar dedicated server
the day's other work used), two fresh seeds, RCON-checked — not
inferred.** First boot caught two real silent failures fixed above
(`level.runCommandSilent` no-op with no players; `getHeight` = -64 for
an unloaded chunk). Second boot, clean:
- Site chosen in 210ms at world load; 50 structure sets checked, none
  reporting a placement chunk inside the box.
- "Preparing spawn area" 13.4s (was 23.5–25.0s live), and ONLY the four
  region files around the base exist — no origin generation at all.
- Base built in 597ms at server start, before any player: pedestal,
  waystone, crafting station, rolling mill, press, courtyard floor and
  the open gate all confirmed by `execute if block`; exactly one
  `td_pedestal_target` marker, carrying td_pedestalX/Y/Z/Health; world
  spawn (level.dat) at the base with the real surface Y; border 58
  centred there; spawnRadius 0; doMobSpawning false; 169 forced chunks.
- Real `/locate structure` distances from the base (console source sits
  at the world spawn): redhouse 254, Lost City post 273, Abandoned Urban
  city 344, gas station 351, roads 633, desert_structures 704, big city
  712, pillager outpost 753, watchtower 825, abandoned house 962, Lost
  City city 971. Nothing under 254 blocks; the two live boots that
  morning had 20.4 and 120.9.

**Real, unresolved, flagged rather than silently changed**: with the
2026-09-08 "2 of 7" biome blend, desert/badlands is rare — both sandbox
seeds had exactly ONE wasteland anchor point among 169 (bases at 8.7km
and 7.2km from origin, harmless in itself), and the second sat on the
edge of its badlands patch with plains 45 blocks away. The search now
scans 10 rings (441 points) to improve the odds of an all-wasteland
site, but the lever for "the base should read as wasteland all around"
is the `multi_noise` blend in `overworld.json`, which the user chose to
keep as-is on 2026-09-09 pending real play — a decision for them, not
this fix.

**First live playtest, same day.** The user's new world ran the whole
path exactly as the sandbox did (site 197ms, desert with wasteland
surroundings, spawn area 17.3s on the integrated server, base built in
707ms, player logged in at the courtyard, no crash, no lag warning,
four region files). Decoded the save's region files directly: Red House
present with its sponge layer swapped and all 30 barrels gone, facade
and ground-floor door on the courtyard side, walls/stake walls/
pedestal/waystone/rig all placed, floor flush with the sand surface.
Feedback: "the structures are slightly too far away... but only
slightly" — floor cut 12 → 9 chunks (13 for the sprawling city sets),
`STRUCTURE_CLEAR_CHUNKS` and both loot scripts' radii moved with it
(+150 instead of +200). Numeric change inside the proven-safe range
(any value under half the 64-chunk anchor spacing), deployed live
without a second sandbox boot. The user also answered "base wrong"
without detail — chased with a follow-up question: **"The Red House."**

**Red House swap reverted, same day.** The morning's swap from
Abandoned Brick House to Red House rested on a misdiagnosis — the
"house has gone" report was the marker crash aborting the handler
before `/place template` ever ran, not the template failing on rough
terrain — so the Brick House was never actually broken. User's pick:
Brick House back. The entire Brick-House-specific block was restored
verbatim from commit 9de1941 (the last version that shipped it):
placement, wet_sponge fix, crafting station at local [5,1,4] with the
waterlogged fix, cauldron/tripwire removal, the 5 barrels, the green
terracotta/snow roof patch, the trapdoor-bed clear, and the 212-block
`HOUSE_REINFORCE_BLOCKS` pass re-enabled (it had been disabled because
it is keyed to the Brick House's wall geometry). `BUILDING_*` back to
12/11/13 and the border back to 50 (58 only ever existed for the
15-deep Red House). Verified by a fresh-world sandbox boot with the
placed blocks read straight from the region files, not just the
setblock-placed fixtures — the gap that let the morning's swap go
unverified.
