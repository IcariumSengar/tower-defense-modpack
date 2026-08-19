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
| Inventory Profiles Next | [Modrinth](https://modrinth.com/mod/inventory-profiles-next) | 1.10.20 (1.20.1 Forge) | One-key inventory sort | Pulls in libIPN + Kotlin for Forge automatically | testing |
| libIPN | [Modrinth](https://modrinth.com/mod/libipn) | 4.0.2 | Hard dependency of Inventory Profiles Next | — | required |
| Kotlin for Forge | [Modrinth](https://modrinth.com/mod/kotlin-for-forge) | 4.12.0 | Hard dependency of Inventory Profiles Next | — | required |
| Waystones | [Modrinth](https://modrinth.com/mod/waystones) | 14.1.20 (1.20.1 Forge) | Fast-travel network. Deliberately included despite tension with tower-defense stakes — framed as "get back to base before nightfall," not a shortcut past danger | Pulls in Balm automatically | testing |
| Balm | [Modrinth](https://modrinth.com/mod/balm) | 7.3.42 | Hard dependency of Waystones | — | required |
| Corpse | [Modrinth](https://modrinth.com/mod/corpse) | 1.0.23 (1.20.1 Forge) | Death drops become a recoverable corpse instead of scattering — chosen over GraveStone Mod (same niche, picked one) | None known yet | testing |
| LootJS | [Modrinth](https://modrinth.com/mod/lootjs) | 2.13.1 (1.20.1 Forge) | KubeJS addon for editing loot tables — powers the loot-bag drop system (see Custom glue below). Small, purpose-built companion to KubeJS, not a standalone content mod | Server-side | testing |

## Removed mods

- **TFTH (The Flesh That Hates) + Geckolib (2026-08-19)** — removed
  entirely, not just disabled. After the first real playtest, decided the
  wave campaign should be vanilla-mobs-only for now (see the Wave spawner
  entry under Custom glue) — TFTH exists purely to spawn its own
  flesh-mob roster, so with that turned off there was no reason to keep
  it loaded. Trivial to re-add (`packwiz modrinth add tfth -y`) when
  modded mobs get folded back into the wave design later.

## Custom glue

- **Wave status HUD** — `pack/kubejs/server_scripts/wave_status.js`. Action
  bar shows a live "Hostiles remaining: N" count, and chat announces
  "incoming!" / "defeated!" when the nearby hostile count rises from /
  falls to zero. Tracks all hostile mobs within 80 blocks, not
  specifically Pure Suffering invasion mobs — no confirmed way to
  distinguish "invasion mob" from "wandered in on its own" without
  deeper unverified work, so this answers "how much danger is near me"
  rather than a precise invasion-only count. Not yet tested in-game.

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

  **First playtest (2026-08-19) found three real bugs, in order**:
  1. The horn had no texture (custom `kubejs:wave_horn` item, no
     artwork, so it showed KubeJS's placeholder).
  2. The `/summon` commands were run via `player.runCommandSilent(...)`,
     which executes with the *player's own* command permission level
     (`createCommandSourceStack()` on the entity) — not necessarily
     enough for `/summon` (needs level 2) even with cheats nominally on.
  3. To fix #1, switched to reusing vanilla's Goat Horn (free texture/
     model/sound) — which introduced a *worse* bug: `ItemEvents.rightClicked`
     **never fires at all while an item is on cooldown**, confirmed
     directly from `KubeJSItemEventHandler.java`'s own dispatch logic
     (`if (!player.getCooldowns().isOnCooldown(...)) { ...post event... }`).
     Goat Horn has a real vanilla cooldown built in, so every use after
     the first was silently swallowed before our script ever saw it —
     matching exactly what was reported ("does nothing except make the
     sound," since the sound is vanilla's own native behavior,
     unrelated to and unblocked by this check).

  Reverted to the custom `kubejs:wave_horn` item for bug #3 (no
  cooldown, so the event reliably fires), with a manual
  `player.playSound(Utils.getSound('minecraft:event.raid.horn'))` to
  keep the horn feel — confirmed via source that `SoundEvent` has no
  registered TypeWrapper (a bare string would likely have thrown), but
  `ResourceLocation` does, so routing through `Utils.getSound(...)` is
  the safe path. And `player.getServer().runCommandSilent(...)` (console-
  level, always full permission) instead of `player.runCommandSilent(...)`
  for bug #2 — same pattern already proven in `playtest_starter_kit.js`.
  Applied the identical permission fix to `base_expansion.js`'s
  `/worldborder add` call, which had the same bug and was likely
  silently failing too.

  4. Even after all three fixes, multiple real clicks on the (now
     cooldown-free) custom item produced **zero log output at all** —
     no errors, no chat messages, nothing. Root cause: Forge's
     `PlayerInteractEvent.RightClickItem` (which `ItemEvents.rightClicked`
     is built on) **only fires when the player isn't targeting a
     block** — by design, confirmed against Forge's own documented
     behavior and multiple real bug reports. Targeting a block fires
     `RightClickBlock` instead, a completely separate event. On
     Superflat, the ground is within reach almost constantly, so the
     handler essentially never ran. Fixed by also hooking
     `BlockEvents.rightClicked` (unfiltered — it filters by block type,
     not held item, so it checks `event.item.getId()` itself) and
     sharing the spawn logic between both hooks.

  Texture is a known placeholder until real art is added (same
  tradeoff already accepted for the loot bags).

  Natural mob spawning is disabled (`doMobSpawning` gamerule, set
  automatically by `playtest_starter_kit.js`) so the horn is the only
  mob source — note this also stops passive mobs (cows, etc.), vanilla
  has no separate hostile-only toggle. TFTH removed entirely from the
  pack for this — see its own note below.

- **Loot bag drop system** — the base-building resource loop: mobs drop
  tiered loot bags on death, opened by right-clicking to receive a
  randomized set of vanilla materials. Deliberately vanilla-materials-only
  (no invented items besides the bag containers) to preserve the Minecraft
  aesthetic, per design decision. Retuned 2026-08-19 to track wave-roster
  tier now that TFTH is gone — three tiers, keyed on mob *type*:
  - `kubejs:scavengers_bag` (Common, 15% chance) — wave 1 mobs (zombie,
    skeleton) plus husk/drowned/creeper for good measure
  - `kubejs:fortified_cache` (Uncommon, 25% chance) — wave 2-3 additions
    (spider, witch)
  - `kubejs:warlords_hoard` (Rare, 75% chance) — wave 4-5 additions
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
  (`loot_bag_open.js`, `loot_bags.js`) loaded with zero errors throughout
  — that part's confidence was justified from the start. Bag items have
  no custom texture yet, so they'll show KubeJS's placeholder texture
  until art is added.

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

- **Base expansion (worldborder growth)** — the "custom world" idea from
  `docs/IDEAS.md`, first-step scope. `pack/kubejs/server_scripts/base_expansion.js`
  grows the worldborder by 5 blocks every 2 nights survived. Deliberately
  scoped down from the fuller design (no separate custom dimension, no
  hand-built `.nbt` structure) — reuses the Superflat Overworld and the
  existing `/fill`-based starter base instead, since both already work.
  Counter lives on the player's persistent data rather than the world/
  level — checked KubeJS's server/level `persistentData` against its own
  source (`MinecraftServerMixin.java`) and found no save/load hook at
  all, so it wouldn't actually survive a restart; player persistent data
  does (same proven mechanism as the starter kit's first-join flag). Not
  yet tested in-game.

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
