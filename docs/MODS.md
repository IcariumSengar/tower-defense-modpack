# Mod List

Tracks every mod going into the pack, why it's in, and any compatibility
notes/conflicts found while adding it. Update this whenever a mod is
added, and re-check it as the list grows for pairwise conflicts.

Status values: `required` (pack won't run without it), `confirmed` (added,
tested, no known issues), `testing` (added, not yet verified), `flagged`
(known conflict/issue, needs a decision), `considering` (not added yet).

| Mod | Source | Version | Purpose | Compat notes | Status |
|---|---|---|---|---|---|
| KubeJS | [Modrinth](https://modrinth.com/mod/kubejs) | 2001.6.5-build.26 (1.20.1 Forge) | Data-driven glue scripting (recipes, tags, loot, progression tweaks) without editing other mods' code | Pulls in Architectury API + Rhino automatically | required |
| Architectury API | [Modrinth](https://modrinth.com/mod/architectury-api) | 9.2.14-forge | Hard dependency of KubeJS | — | required |
| Rhino | [Modrinth](https://modrinth.com/mod/rhino) | 2001.2.3-build.10 | JS engine KubeJS runs scripts on — hard dependency, packwiz added it automatically | — | required |
| SecurityCraft | [Modrinth](https://modrinth.com/mod/security-craft) | v1.10.2.1 (1.20.1 Forge/NeoForge) | Turrets, reinforced blocks, trophies, alarms — gives "build up your base between nights" real mechanical teeth | None known yet | testing |
| Mob Grinding Utils | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/mob-grinding-utils) | 1.1.0 (1.20.1 Forge) | Mob fans/mashers/absorption hoppers — payoff for surviving a wave (turn the horde into XP/loot/power) rather than it just being a threat | None known yet | testing |
| Epic Siege Mod | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/epic-siege-mod) | 14.171 (1.20.1 Forge) | Rewrites mob AI wholesale: zombies dig/pillar to reach you, creepers breach walls, skeletons snipe, endermen teleport targets, mobs swim/raid villages. Fully configurable (awareness radius, chaos mode) — this is the pack's primary "hordes get scary" mod | Replaces **Zombie Awareness** (removed — both rewrote mob AI goals, redundant/risked conflicting; Epic Siege is the more configurable, more established of the two, so it's the one that stayed). Also considered but rejected: **Nightmare Epic Siege** (same overlap problem, smaller/less-tested mod) | testing |
| The Pure Suffering Mod | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/the-pure-suffering-mod) | 1.6.8.5R-LTS1 (1.20.1 Forge) | Invasion events that escalate in tier/severity over time | **Kept installed but dormant (2026-08-19)** — `enableInvasions` gamerule set `false`, and the custom vanilla-only wave campaign (`pack/kubejs/server_scripts/wave_spawner.js`) replaces it for now rather than fighting its semi-random invasion-type system for a specific curated progression. Its broader invasion variety (`zombie`, `undead`, `mega_raid`, `warden`, `wither`, `arachnophobia`, `phantom_zone`, and more, via `/puresuffering add primary puresuffering:<type>`) stays available to re-enable later at zero setup cost. | testing |
| Scape And Spartans: Parasites Port | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/srp-spartans-port) | 1.0.5 (1.20.1 Forge) | **Not** the actual Scape and Run: Parasites mod (that's 1.12.2-only, unported, no permission for ports) — this only ports 4 SRP-themed weapon variants (bleed/viral/corrosion/immalleable) onto Spartan Weaponry. Added as the closest available substitute | Niche/early-stage mod — its own CurseForge page has a past warning about a save-breaking update (v1.0.1); we're on v1.0.5, but treat future `packwiz update` on this one with extra care (check changelog first) rather than blind-updating | testing |
| Spartan Weaponry | [Modrinth](https://modrinth.com/mod/spartan-weaponry) | 3.2.1 (1.20.1 Forge) | Hard dependency of the Parasites weapon port | — | required |
| Spartan Weaponry Addon Toolkit | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/spartan-weaponry-addon-toolkit) | 1.6.1 | Hard dependency of the Parasites weapon port | — | required |
| Embeddium | [Modrinth](https://modrinth.com/mod/embeddium) | 0.3.31 (1.20.1 Forge) | Forge port of Sodium — full rendering-engine rewrite, the biggest FPS win available | None known yet | testing |
| ModernFix | [Modrinth](https://modrinth.com/mod/modernfix) | 5.27.76 (1.20.1 Forge) | Faster load times, lower memory use, general bugfixes; built to be compatible with other perf mods | None known yet | testing |
| FerriteCore | [Modrinth](https://modrinth.com/mod/ferrite-core) | 6.0.1 (Forge) | Memory-only optimization — devs of ModernFix recommend always pairing the two | None known yet | testing |
| Radium | [Modrinth](https://modrinth.com/mod/radium) | 0.12.4 (1.20.1 Forge) | Forge port of Lithium — server tick/mob AI optimization, directly relevant given how many mobs the wave system throws at once | None known yet | testing |
| Entity Culling | [Modrinth](https://modrinth.com/mod/entityculling) | 1.10.5 (1.20.1 Forge) | Skips rendering entities not actually visible — helps with horde-on-screen moments | Client-side only | testing |
| Clumps | [Modrinth](https://modrinth.com/mod/clumps) | 12.0.0.4 (1.20.1 Forge) | Merges XP orbs into one entity after a big kill instead of dozens | Server-side | testing |
| Not Enough Crashes | [Modrinth](https://modrinth.com/mod/notenoughcrashes) | 4.4.9 (1.20.1 Forge) | Return to title screen and keep playing after a crash instead of losing the session | None known yet | testing |
| JEI | [Modrinth](https://modrinth.com/mod/jei) | 15.49.0.191 (1.20.1 Forge) | Recipe/item viewer | None known yet | testing |
| Jade | [Modrinth](https://modrinth.com/mod/jade) | 11.13.3 (1.20.1 Forge) | Hover-over info for blocks/entities | None known yet | testing |
| Xaero's Minimap | [Modrinth](https://modrinth.com/mod/xaeros-minimap) | 26.4.2 (1.20.1 Forge) | Minimap navigation | None known yet | testing |
| AppleSkin | [Modrinth](https://modrinth.com/mod/appleskin) | 2.5.1 (1.20.1 Forge) | Exact hunger/saturation values on food | None known yet | testing |
| Mouse Tweaks | [Modrinth](https://modrinth.com/mod/mouse-tweaks) | 2.25.1 (1.20.1 Forge) | Faster inventory management (shift/right-click-drag) | None known yet | testing |
| Inventory Profiles Next | [Modrinth](https://modrinth.com/mod/inventory-profiles-next) | 1.10.20 (1.20.1 Forge) | One-key inventory sort | Pulls in libIPN + Kotlin for Forge automatically. **Real conflict with Mouse Tweaks found 2026-08-19** — both mods implement their own swipe-to-move/craft gestures over the same slots; see the Inventory conflict entry under Custom glue for the fix | testing |
| libIPN | [Modrinth](https://modrinth.com/mod/libipn) | 4.0.2 | Hard dependency of Inventory Profiles Next | — | required |
| Kotlin for Forge | [Modrinth](https://modrinth.com/mod/kotlin-for-forge) | 4.12.0 | Hard dependency of Inventory Profiles Next | — | required |
| Waystones | [Modrinth](https://modrinth.com/mod/waystones) | 14.1.20 (1.20.1 Forge) | Fast-travel network. Deliberately included despite tension with tower-defense stakes — framed as "get back to base before nightfall," not a shortcut past danger | Pulls in Balm automatically | testing |
| Balm | [Modrinth](https://modrinth.com/mod/balm) | 7.3.42 | Hard dependency of Waystones | — | required |
| Corpse | [Modrinth](https://modrinth.com/mod/corpse) | 1.0.23 (1.20.1 Forge) | Death drops become a recoverable corpse instead of scattering — chosen over GraveStone Mod (same niche, picked one) | None known yet | testing |
| LootJS | [Modrinth](https://modrinth.com/mod/lootjs) | 2.13.1 (1.20.1 Forge) | KubeJS addon for editing loot tables — powers the loot-bag drop system (see Custom glue below). Small, purpose-built companion to KubeJS, not a standalone content mod | Server-side | testing |
| TFTH (The Flesh That Hates) | [Modrinth](https://modrinth.com/mod/tfth) | 1.1b (1.20.1 Forge) | Re-added 2026-08-19 to supply modded mob types for wave_spawner.js starting wave 2 — see the Wave spawner entry under Custom glue for exactly which mobs, and the "TFTH config hardening" entry there for why most of its own default behavior is disabled | Removed 2026-08-19 (first playtest, vanilla-only decision), re-added same day once the wave campaign was ready for modded mobs. TFTH is not just a mob roster — see the config hardening entry, this needed real care, not a blind re-add | testing |
| GeckoLib | [Modrinth](https://modrinth.com/mod/geckolib) | 4.8.4 (1.20.1 Forge) | Hard dependency of TFTH (animation library) | — | required |

## Custom glue

- **Wave status HUD** — `pack/kubejs/server_scripts/wave_status.js`. Action
  bar shows a live "Hostiles remaining: N" count, and chat announces
  "incoming!" / "defeated!" when the nearby hostile count rises from /
  falls to zero. Tracks all hostile mobs within 80 blocks, not
  specifically Pure Suffering invasion mobs — no confirmed way to
  distinguish "invasion mob" from "wandered in on its own" without
  deeper unverified work, so this answers "how much danger is near me"
  rather than a precise invasion-only count. Confirmed working across
  multiple playtests (see Wave spawner's debugging log below).

  **Storage-after-wave-1 request (2026-08-19)** — raised as "give the
  player a way to store loot in a chest after wave 1." First pass gave a
  `minecraft:chest` item directly; corrected per the actual intent —
  the player wants to *craft* their own chest (8 planks, vanilla
  recipe), not be handed one. No code needed for that beyond raw
  material supply, which the oak log weight bump right above already
  covers (4-8 logs per roll = 16-32 planks, well over the 8 a chest
  needs).

  **Starter gear removal + "It's up to you now" (2026-08-19)** —
  narrative reframe of `playtest_starter_kit.js`'s overpowered starting
  sword/armor as loot from a previous, unfortunate occupant of the base
  (same "diary from a previous soul" device planned for the quest book,
  `docs/IDEAS.md`'s Pack Aesthetic idea). Mechanically, the gear
  disappears the moment the curated campaign's final wave clears —
  reuses this same wave-clear detection edge (`td_inWave` true→false)
  rather than adding a new one. Implementation:
  - `FINAL_WAVE` constant (currently `5`) replaces what was a magic
    number already present in the `waveNumber` cap logic — must be kept
    in sync with `wave_spawner.js`'s `WAVES.length` by hand, same
    cross-file duplication this pack already lives with for mob rosters.
  - The starter sword/armor (not the Wave Horn — that stays) get a
    `td_starter_gear:1b` NBT marker tag plus a flavor `Lore` line in
    `playtest_starter_kit.js`, so removal matches on the tag, not item
    type — a netherite sword or iron armor the player crafts or loots
    later is untouched.
  - Removal runs via five `/clear <target> <item>{td_starter_gear:1b}`
    commands (one per item type — `/clear` takes a single item argument,
    not a list), through the same `player.getServer().runCommandSilent`
    elevated-permission pattern used everywhere else in this pack.
    `/clear` reaches armor and offhand slots as well as the main
    inventory (ordinary vanilla behavior, confirmed by removing to
    validated Minecraft/Forge modding knowledge rather than a KubeJS
    wrapper API) — chosen deliberately over KubeJS's own JS-side
    inventory-manipulation surface (`player.inventory.extractItem`,
    `player.armorSlots`, etc.), since that surface's exact scope
    (whether the main-inventory wrapper alone covers equipped armor)
    couldn't be confirmed from available docs, and 1.20.1 predates the
    1.20.5 components rework so `/clear`'s legacy NBT-predicate matching
    still applies cleanly.
  - One-shot guarded by `td_starterGearRemoved`, same pattern as
    `td_playtestKitGiven`.
  - Popup reuses the existing `/title` mechanic for the short line
    ("IT'S UP TO YOU NOW"), plus `player.tell(...)` for the fuller
    narrative beat in chat (a title can't legibly carry more than a
    couple words). Wording is a first pass, easy to retune like
    everything else in this file — it still says "five waves" even
    while `GEAR_REMOVAL_WAVE` is temporarily 2 (see below), since the
    text describes the real intended trigger.

  **Temporarily gated on wave 2, not wave 5 (2026-08-19)** — added a
  separate `GEAR_REMOVAL_WAVE` constant (`2`) rather than repurposing
  `FINAL_WAVE` for this, since `FINAL_WAVE` also drives the wave-number
  display cap and there are still genuinely 5 designed waves — lowering
  it would've broken the HUD showing "Wave 3/4/5" correctly. Playtest
  convenience only, so removal/popup can be checked without a full
  5-wave clear each time; reset to `FINAL_WAVE` (or delete
  `GEAR_REMOVAL_WAVE` and reference `FINAL_WAVE` directly) once
  confirmed working.

  Not yet tested in-game — a full 5-wave clear takes real playtest time
  to reach; flagged the same way `mob_aggro.js`'s `setTarget` was before
  its own confirmation.

- **Wave spawner** — `pack/kubejs/server_scripts/wave_spawner.js` +
  `pack/kubejs/startup_scripts/wave_horn.js`. Replaces relying on
  `/puresuffering add` for testing (that command turned out to work, but
  debugging exactly when/why an invasion actually starts — time-of-day
  gating, rarity rolls — was more friction than it was worth for a
  precise curated progression). Right-click the **Wave Horn** item
  (`kubejs:wave_horn`, auto-given by the starter kit) to summon the next
  wave; refuses to summon while mobs from the current wave are still
  alive within 80 blocks. Deterministic, vanilla-only 5-wave campaign
  (2026-08-19 design decision — no modded mobs for now):
  1. zombie + skeleton
  2. + spider
  3. + witch
  4. + wither skeleton
  5. + ravager (mini boss) — repeats for any call beyond wave 5, no
     further waves designed yet

  **First real playtest (2026-08-19) was a long debugging saga — nine
  real bugs found and fixed, in order, each confirmed against actual
  source code or actual in-game evidence, not guessed**:
  1. **No texture** — custom `kubejs:wave_horn` item, no artwork, shows
     KubeJS's placeholder. Fixed 2026-08-19 — see below.
  2. **Wrong command permission** — `/summon` ran via
     `player.runCommandSilent(...)`, which uses the *player's own*
     command permission level, not necessarily enough for `/summon`
     (needs level 2) even with cheats nominally on. Fixed:
     `player.getServer().runCommandSilent(...)` (console-level, always
     full permission). Same bug existed in `base_expansion.js`'s
     `/worldborder add` call — fixed there too.
  3. **Goat Horn's cooldown silently blocks the event entirely** — tried
     switching to vanilla's Goat Horn for a free texture/sound;
     `ItemEvents.rightClicked` **never fires while an item is on
     cooldown**, confirmed directly from `KubeJSItemEventHandler.java`'s
     dispatch logic. Reverted to the custom item (no cooldown), with a
     manual `player.playSound(Utils.getSound('minecraft:event.raid.horn'))`
     to keep the horn feel — routed through `Utils.getSound(...)` since
     `SoundEvent` has no registered TypeWrapper but `ResourceLocation` does.
  4. **`event.player` looked broken but wasn't** — a red herring.
     `ItemClickedEventJS`/`BlockRightClickedEventJS` only expose
     `getEntity()` directly, but `PlayerEventJS` (their shared parent)
     defines `getPlayer()` returning the same thing, so `.player` was
     valid the whole time via inheritance. Switched to `.entity` anyway
     (harmless, identical result) while chasing what turned out to be
     bug #6.
  5. **`const`/`let` inside `ItemEvents`/`BlockEvents.rightClicked`
     callbacks throws `"redeclaration of var X"`** on the second and
     later invocations — a Rhino quirk specific to these particular
     callback types (`PlayerEvents.tick` elsewhere uses `const` with no
     issue). Fixed by using `var` throughout both callback bodies.
  6. **`event.level.isClientSide` throws `NullPointerException` just by
     being accessed** — independent of how it's used (conditional, log
     statement, template literal, all failed identically). Root cause
     not fully understood; fixed by not referencing it at all.
  7. **Both `ItemEvents.rightClicked` and `BlockEvents.rightClicked`
     fire for the same physical click** — contrary to Forge's own
     documented "`RightClickItem` only fires when not targeting a
     block" rule, which didn't hold in practice here. Without a guard
     this double-processed every click (e.g. wave 1→2, 3→4). Fixed with
     a 20-tick (1 second) cooldown guard in `useWaveHorn` — also
     necessary since holding right-click generates repeated events
     across many ticks, not just one per physical click.
  8. **Bare `.x`/`.y`/`.z` on entities produces `NaN`** — the real,
     working accessors are `.getX()`/`.getY()`/`.getZ()` (plain vanilla
     `Entity` methods, not remapped by KubeJS). This silently broke
     `wave_status.js`'s distance check too, and — the big one —
     **`playtest_starter_kit.js`'s starter base has never actually been
     built in any test world**, since every `/fill`/`/setblock` had NaN
     coordinates and silently failed. All three fixed.
  9. **`Math.PI` itself evaluates to something unusable** in this
     environment — confirmed directly in-game: `Math.random()`,
     `Math.cos()`, `Math.sin()`, `Math.floor()` all worked individually,
     but any expression multiplying by `Math.PI` came out `NaN`. Root
     cause not understood; fixed by using the literal
     `6.283185307179586` (2π) instead of `Math.PI * 2`.

  Confirmed working in-game after all nine fixes: wave spawning, the
  hostile counter, and the wave-complete/incoming messages.

  **Second playtest (2026-08-19)** — texture still a known placeholder
  at this point (fixed later the same day, see below). Consolidated to
  one "wave incoming" message
  (was firing from both this script and `wave_status.js` — removed the
  duplicate from `wave_status.js`, kept this one since it includes the
  mob count). Border-clamp and wave-triggered expansion fixes described
  under Base expansion below.

  **Instant aggro, revised**: first pass gave summoned mobs
  `Attributes:[{Name:"generic.follow_range",Base:128}]` in their
  `/summon` NBT — correct as far as it goes, but only helps a mob that
  can already *see* the player path further/faster. Flagged as
  insufficient once terrain stops being guaranteed-flat (`docs/IDEAS.md`'s
  fuller design), since vanilla's target-acquisition itself needs line of
  sight — follow range alone doesn't bypass that. Real fix:
  **`pack/kubejs/server_scripts/mob_aggro.js`**, a new script that calls
  `Mob#setTarget(player)` directly on every wave-type mob in the level,
  every 10 ticks, unconditionally — bypasses vanilla's sight-based
  acquisition entirely, no distance or line-of-sight requirement, per
  explicit design request. `setTarget` is a real, standard, unchanged-
  across-versions vanilla method (not remapped/hidden by KubeJS), same
  category of API as `getX()`/`getServer()`/`playSound()` that's worked
  reliably throughout this pack's debugging — high confidence, but not
  yet tested in-game. `follow_range` stays in place as a secondary
  measure (lets a targeted mob actually chase the full distance once it
  has a target).

  **Day/night lock (2026-08-19)** — reported bug: summoned undead mobs
  (zombie, skeleton, wither skeleton) were catching fire immediately on
  spawn because waves could be called during daytime. Fixed by having
  `useWaveHorn` run `time set night` + `gamerule doDaylightCycle false`
  right before spawning, and `wave_status.js`'s "defeated" branch flip
  both back (`time set day` + `doDaylightCycle true`) once the hostile
  count returns to zero — locking the cycle, not just setting the time
  once, so it can't drift back to day mid-fight on a long wave.

  **Texture added (2026-08-19)** —
  `pack/kubejs/assets/kubejs/textures/item/wave_horn.png`, a hand-authored
  16x16 placeholder (curved tan horn shape with a gold band and dark
  bell), no model JSON needed since KubeJS's `basic` item type
  auto-generates a model from the texture at the conventional path.
  Replaces KubeJS's generic missing-texture icon; still not "real" art.

  Natural mob spawning is disabled (`doMobSpawning` gamerule, set
  automatically by `playtest_starter_kit.js`) so the horn is the only
  vanilla mob source — note this also stops passive mobs (cows, etc.),
  vanilla has no separate hostile-only toggle.

  **TFTH mobs folded in starting wave 2 (2026-08-19)** — mob type
  strings in `WAVES`/`WAVE_MOB_TYPES` are now full namespaced IDs
  (`minecraft:zombie`, `the_flesh_that_hates:flesh_human`, etc.) instead
  of bare names with `minecraft:` hardcoded onto every `/summon` — that
  hardcoding is what made TFTH mobs impossible before; fixing it took
  one line. Added, per wave: 2) `flesh_human` x2 (Germ stage, ~zombie
  tier), 3) `flesh_villager` x2 (Germ stage), 4) `plaquecreaturetwo`
  ("Flesh Hunter I", Awareness stage — MaxHealth 50/Armor 6 per
  `TFTH.toml`, notably tougher) alongside wither_skeleton, 5)
  `flesh_suffer` (Awareness stage, AttackDamage 25 per `TFTH.toml` — hits
  harder than anything else in the roster) alongside the ravager
  mini-boss. Mob IDs came directly from `TFTH.toml`'s own
  `germsStageMobList`/`awarenessStageMobList` entries and its
  "plaquecreaturetwo = Flesh Hunter I" style comments, not guessed.
  `wave_status.js`'s `HOSTILE_TYPES`, `mob_aggro.js`'s `WAVE_MOB_TYPES`,
  and `loot_bag_drops.js`'s tier lists were all updated to match (same
  four-file-sync pattern already documented for the vanilla roster).

  **TFTH config hardening (2026-08-19)** — before re-adding, checked
  what TFTH actually does beyond supplying mob types, since research
  showed it's an autonomous, self-spreading system (Incubators that
  infect blocks and keep spawning mobs on their own timer, independent
  of `doMobSpawning`) — directly opposed to this pack's "the Wave Horn
  is the only mob source" design. Confirmed via the actual config file
  left over from when TFTH was previously installed
  (`config/TFTH.toml`/`config/TFTH-Data.toml`, now tracked at
  `pack/config/`) rather than guessed from docs. Disabled before
  re-adding the mod to the live instance:
  - `enableIncubatorSpawn = false` — stops Incubators (the root of the
    autonomous spawn/spread chain) from ever appearing on their own.
  - `enableFleshBlockSpread = false` — stops the block-corruption
    mechanic; the config's own infectable-block lists name
    `oak_log`/`stone`/`cobblestone`/`stone_bricks` directly, i.e.
    exactly the starter base's materials.
  - `enableStructuresSpawn`, `enableFleshSpikes`, `enableFleshTerns`,
    `enableGermStageMobSpawn`, `enableFleshBoil` — all set `false` too,
    belt-and-suspenders in case any of these have a spawn trigger
    independent of the Incubator/spread systems above (not fully
    verifiable from config alone).
  With these off, TFTH's entity types are summoned directly by
  `wave_spawner.js` exactly like the vanilla mobs — nothing about the
  mod's own automatic behavior should ever fire. One thing config
  couldn't answer and is worth specifically watching for in-game:
  `TFTH.toml`'s `spawnFleshHumanFrom` list includes `"minecraft:player"`
  alongside `"minecraft:zombie"` — unclear what that does or whether it
  can affect the player directly.

- **Loot bag drop system** — the base-building resource loop: mobs drop
  tiered loot bags on death, opened by right-clicking to receive a
  randomized set of vanilla materials. Deliberately vanilla-materials-only
  (no invented items besides the bag containers) to preserve the Minecraft
  aesthetic, per design decision. Retuned 2026-08-19 to track wave-roster
  tier now that TFTH is gone — three tiers, keyed on mob *type*, each
  mob group only ever rolling its own tier's bag (no cross-tier drops):
  - `kubejs:scavengers_bag` (Common, 50% chance) — wave 1 mobs (zombie,
    skeleton) plus husk/drowned/creeper for good measure
  - `kubejs:fortified_cache` (Uncommon, 25% chance) — wave 2-3 additions
    (spider, witch)
  - `kubejs:warlords_hoard` (Rare, 10% chance) — wave 4-5 additions
    (wither skeleton, ravager)

  Implementation: `pack/kubejs/startup_scripts/loot_bags.js` (item
  registration), `pack/kubejs/server_scripts/loot_bag_drops.js` (LootJS
  drop rules), `pack/kubejs/server_scripts/loot_bag_open.js` (right-click
  reward rolling).
  **Real root cause found after three rounds of in-game testing
  (2026-08-19)**: `LootJS.modifiers(...)` — the syntax LootJS's own
  README documents — was correct the whole time. The `ReferenceError:
  "LootJS" is not defined` errors weren't a syntax problem at all: the
  LootJS mod jar was never actually present in the running instance. Root
  cause was `packwiz cf export` defaulting to `--side client`, which
  **silently drops server-only mods with no warning** — both LootJS and
  Radium are marked `side = "server"` in their `.pw.toml` (correctly —
  neither has a client component) and were getting dropped from every
  export. Fixed by always exporting `--side both` (documented in
  README.md) — this pack only targets single-player, where the
  integrated server needs every mod regardless of side. Two wrong
  detours happened chasing this before finding it: first swapping to the
  older `onEvent("lootjs", ...)` form (which KubeJS then hard-rejected as
  a removed API), then confirming via source that `LootJS.modifiers`
  really was right — neither fix mattered since the mod itself wasn't
  loaded either time. The custom-item + right-click half
  (`loot_bag_open.js`, `loot_bags.js`) loaded with zero *console* errors
  throughout — but see the 2026-08-19 bug below, since "no console
  errors" turned out not to mean "actually works."

  **Fourth round (2026-08-19), once the mod was actually loading**:
  `LootJS.modifiers(...)` ran without error, but `.thenAdd(...)` — the
  chained method the README also documents — threw `TypeError: Cannot
  find function thenAdd in object ...LootActionsBuilderJS`. Confirmed by
  reading `LootActionsBuilderJS.java` and the `LootActionsContainer`
  interface it implements directly: `.addLoot(...)` is the only real
  method for adding loot, `thenAdd` doesn't exist anywhere in either.
  The README's outer wrapper (`LootJS.modifiers`) was right; its inner
  method name wasn't. Switched to `.addLoot(...)` — also confirmed via
  `LootJSPlugin.java` that `LootEntry` has a registered TypeWrapper, so
  passing a plain string item ID straight to `addLoot` is safe.

  **Right-click-to-open never actually worked (found 2026-08-19)** —
  bags were dropping fine but right-clicking one did nothing. Root
  cause: the exact same confirmed bug as Wave Horn debugging bug #6 —
  `event.level.isClientSide` throws a `NullPointerException` just by
  being accessed, in any context, and it was the very first line of
  `openBag()`. Every right-click crashed before reaching `shrink()`/
  `give()`. Also only had `ItemEvents.rightClicked` registered, not
  `BlockEvents.rightClicked` — the Wave Horn needed both to reliably
  fire on Superflat (where right-clicking almost always targets the
  ground block). Fixed by removing the `isClientSide` check, adding the
  matching `BlockEvents.rightClicked` handler with the same 20-tick
  cooldown dedup `wave_spawner.js` uses (keyed per item ID this time, so
  opening a different bag right after doesn't get wrongly blocked), and
  switching `const`/`let` to `var`/`function` throughout to match
  `wave_spawner.js`'s confirmed-safe pattern for these callback types.

  **Loot table quality gradient (2026-08-19)** — expanded each tier's
  pool so the tiers read as a deliberate progression rather than three
  disconnected lists: Common stays early-game scrap (added leather,
  copper ingot, lapis lazuli), Uncommon is solid bulk materials with a
  reachable ceiling into Common's ceiling items (added lapis block, iron
  block, ender pearl), Rare now includes genuinely exciting late-game
  vanilla items a player wouldn't normally see this early (netherite
  ingot, totem of undying, enchanted golden apple) at low weight, on top
  of the existing diamond/emerald/gold/netherite scrap/nether star
  entries.

  **Second balance pass, textures + drop rate + Common contents
  (2026-08-19)**:
  - **Drop rate was backwards** — Rare rolled at 75% (more likely than
    Common's 15%), the opposite of what "rare" should signal. Fixed to
    Common 50% / Uncommon 25% / Rare 10%, so common bags are the ones you
    actually see most often and a Warlord's Hoard stays a genuine event
    even off a mini-boss kill. Tier separation itself (which mob group
    can drop which bag) was already correct — each group only ever rolls
    its own tier, no cross-tier contamination.
  - **Common pool now includes base-building/survival staples** —
    cobblestone, oak logs, bread, cooked beef, apple — alongside the
    existing scrap materials, on the reasoning that a fresh base needs
    stone/wood/food before scrap metal matters.
  - **Oak log weight bumped** from 25 to 40 (2026-08-19, after first
    real playtest feedback) so it shows up more often than the other
    Common entries — a fresh base wants wood most.
  - **Textures added** for all three bags —
    `pack/kubejs/assets/kubejs/textures/item/{scavengers_bag,
    fortified_cache,warlords_hoard}.png`, hand-authored 16x16 placeholders
    color-coded to each bag's existing tooltip rarity color: gray/plain
    for Common, gold-tan with brass studs for Uncommon, deep red with a
    gold trim band and a gem for Rare — so rarity reads at a glance in
    inventory, not just from hovering for the tooltip.

  **TFTH mobs added to tier lists (2026-08-19)** — `flesh_human`/
  `flesh_villager` (wave 2-3 TFTH additions) join the Uncommon tier
  alongside spider/witch; `plaquecreaturetwo`/`flesh_suffer` (wave 4-5
  TFTH additions) join the Rare tier alongside wither_skeleton/ravager —
  same wave-tier-tracks-loot-tier logic already used for the vanilla
  roster (see Wave spawner's TFTH entry above for what these mobs are).
  `addEntityLootModifier` needed no special handling for modded entity
  IDs — same call, just a different namespace.

- **Base expansion (worldborder growth)** — the "custom world" idea from
  `docs/IDEAS.md`, first-step scope. `pack/kubejs/server_scripts/base_expansion.js`
  grows the worldborder by 5 blocks every 2 **waves cleared**. Originally
  built as "nights survived" (the available proxy before the Wave Horn
  system existed), switched 2026-08-19 after a real playtest — the
  original intent was always waves, and it now watches
  `wave_status.js`'s `td_inWave` flag directly instead of re-scanning for
  hostiles itself. Deliberately scoped down from the fuller design (no
  separate custom dimension, no hand-built `.nbt` structure) — reuses the
  Superflat Overworld and the existing `/fill`-based starter base
  instead, since both already work. Counter lives on the player's
  persistent data rather than the world/level — checked KubeJS's
  server/level `persistentData` against its own source
  (`MinecraftServerMixin.java`) and found no save/load hook at all, so it
  wouldn't actually survive a restart; player persistent data does.

  **Playtest feedback (2026-08-19)** also surfaced a real bug this
  depends on: `wave_spawner.js` could summon mobs *outside* the current
  worldborder (its 15-25 block spawn radius easily exceeds a small
  border), making them permanently unreachable — which also silently
  prevented the hostile counter from ever reaching 0, so "wave defeated"
  never fired either. Fixed by clamping spawn positions to
  `level.getWorldBorder()`'s bounds (minus a margin). This specific API
  call (`getWorldBorder()`, `getMinX()`/`getMaxX()`/`getMinZ()`/`getMaxZ()`)
  is standard vanilla `Level`/`WorldBorder` methods, not KubeJS-specific,
  but hasn't been confirmed in-game yet given how many "should be fine"
  assumptions turned out wrong in this same debugging session — worth
  double-checking if the border-clamp behaves oddly.

- **Night-based mob scaling** — first draft preserved at
  `docs/deferred/night_scaling.js` (moved out of `pack/kubejs/` so it
  doesn't get bundled into exports and can't accidentally load/error
  during playtesting). Still **deferred** — with Epic Siege Mod (AI
  behavior) and Pure Suffering (tiered invasion events) both already
  handling escalation, hand-tuning raw mob stats on top is a
  later-priority refinement. Revisit once the mod-driven version's gaps
  are actually known from play.

## Compatibility check (2026-08-19)

Reviewed all 11 tracked mods (7 picks + 4 auto-resolved dependencies)
against each other:
- No mod author has declared an "Incompatible" relation against any other
  mod in this list (checked CurseForge's own Incompatible-relations field
  directly for Epic Siege Mod, Pure Suffering, TFTH, and the Parasites
  port — the four most likely to have known conflicts; the rest have no
  dependency conflicts per packwiz's own resolution).
- Pure Suffering had a real past bug ("crashes when a mod adds a mob with
  broken AI," relevant given Epic Siege Mod and TFTH both add custom mob
  behavior) — fixed in v1.6.8.3R; we're pinned to v1.6.8.5R-LTS1, so this
  doesn't apply.
- **Design note, not a conflict**: Epic Siege Mod's zombies dig/pillar to
  reach targets, which can break vanilla-style mob-farm designs used with
  Mob Grinding Utils. Build farms out of SecurityCraft reinforced blocks
  (which Epic Siege's mobs can't break) to keep them escape-proof.

No blockers found — this list is a solid base to build the pack around.

## Compatibility check (2026-08-19, performance/QoL batch)

Reviewed the 15 newly added performance/stability/QoL mods (+ 3
auto-resolved dependencies) against the existing 11:
- Checked the highest-risk pairing specifically — **Radium** (Lithium-style
  mob AI/tick optimization) against **Epic Siege Mod** (heavily rewrites
  mob AI) — no reported conflicts found; the only Epic Siege compatibility
  caveats on record are from its 1.7.10-era history and don't apply to how
  modern Forge mods hook in.
- One claim needed debunking: a search turned up a list of mods supposedly
  "incompatible with ModernFix" that included **Architectury** and
  **FerriteCore** — both already in this pack, and FerriteCore is the mod
  ModernFix's own devs recommend always pairing with it. Checked the actual
  ModernFix GitHub wiki/FAQ directly — neither mod is mentioned anywhere in
  it. The scraped list was wrong; no action needed.
- No other author-declared incompatibilities found.

## Real conflict found in playtesting: Mouse Tweaks vs. Inventory Profiles Next (2026-08-19)

Not an author-declared incompatibility (matches the note above — none
were found that way), but a genuine in-game one, reported by the player
as "hovering over inventory slots flashes green and fills, crafting
gets buggy, items get crafted multiple times by accident." Both mods
implement their own version of "swipe/drag the mouse across slots to
move or craft items," and having both active at once caused the same
gesture to be handled twice.

Root-caused by extracting `InventoryProfilesNext-forge-1.20-1.10.20.jar`
and reading its compiled config classes directly (`ModSettings`,
`GuiSettings`, `Tweaks`) rather than guessing from its (mostly
undocumented) settings menu — same "read the real thing, don't guess"
approach as this pack's other debugging. Confirmed real, exact JSON
config keys (one, `highlight_focused_items`, was confirmed as a literal
string constant in the bytecode; the rest were derived from their
Kotlin `SCREAMING_SNAKE_CASE` constant names via the same simple
lowercase pattern the one confirmed key follows — not 100% guaranteed
the same way, worth a quick in-game check that they took effect).
Disabled in `config/inventoryprofilesnext/inventoryprofiles.json`
(tracked at `pack/config/inventoryprofilesnext/`):
- `Tweaks.swipe_move_crafting_result_slot` and
  `Tweaks.container_swipe_moving_items` — IPN's own swipe-move/craft
  gestures, the direct overlap with Mouse Tweaks' RMB/LMB drag tweaks.
  Mouse Tweaks stays as the sole owner of drag-to-move behavior; nothing
  changed in `config/MouseTweaks.cfg`.
- `GuiSettings.show_continuous_crafting_checkbox` — hides the checkbox
  IPN injects into crafting screens, so it can't be mis-clicked into a
  persistent "keep crafting" mode. `continuous_crafting_saved_value`
  (the checkbox's own toggle state) was already `false`.
- `ModSettings.highlight_focused_items` and
  `ModSettings.highlight_clicking_slot` — the actual "green fill on
  hover, flashes" visual the player described; disabled since it read as
  a bug rather than a feature in normal play.

Needs a full relaunch to take effect (config file, read at startup, not
a `server_scripts` hot-reload) — not yet confirmed fixed in-game.

## Adding a mod

1. Tell me the mod (name or link), or I propose one for a gap in the list.
2. I check: Forge + 1.20.1 availability, hard dependencies, known conflicts
   with mods already in this list, and whether it overlaps mechanically
   with something already included.
3. It gets a row here with status `considering` (or `flagged` if there's a
   real conflict to resolve first).
4. Once it's actually installed via `packwiz modrinth add` /
   `packwiz curseforge add`, status flips to `testing`; once played and
   confirmed working, `confirmed`.
