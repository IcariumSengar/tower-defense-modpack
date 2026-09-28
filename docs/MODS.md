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
| Epic Siege Mod | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/epic-siege-mod) | 14.171 (1.20.1 Forge) | Rewrites mob AI wholesale: zombies dig/pillar to reach you, creepers breach walls, skeletons snipe, endermen teleport targets, mobs swim/raid villages. Fully configurable (awareness radius, chaos mode) — this is the pack's primary "hordes get scary" mod | Replaces **Zombie Awareness** (removed — both rewrote mob AI goals, redundant/risked conflicting; Epic Siege is the more configurable, more established of the two, so it's the one that stayed). Also considered but rejected: **Nightmare Epic Siege** (same overlap problem, smaller/less-tested mod) | testing |
| Embeddium | [Modrinth](https://modrinth.com/mod/embeddium) | 0.3.31 (1.20.1 Forge) | Forge port of Sodium — full rendering-engine rewrite, the biggest FPS win available | None known yet | testing |
| ModernFix | [Modrinth](https://modrinth.com/mod/modernfix) | 5.27.76 (1.20.1 Forge) | Faster load times, lower memory use, general bugfixes; built to be compatible with other perf mods | None known yet | testing |
| FerriteCore | [Modrinth](https://modrinth.com/mod/ferrite-core) | 6.0.1 (Forge) | Memory-only optimization — devs of ModernFix recommend always pairing the two | None known yet | testing |
| Radium | [Modrinth](https://modrinth.com/mod/radium) | 0.12.4 (1.20.1 Forge) | Forge port of Lithium — server tick/mob AI optimization, directly relevant given how many mobs the wave system throws at once | None known yet | testing |
| Entity Culling | [Modrinth](https://modrinth.com/mod/entityculling) | 1.10.5 (1.20.1 Forge) | Skips rendering entities not actually visible — helps with horde-on-screen moments | Client-side only | testing |
| Clumps | [Modrinth](https://modrinth.com/mod/clumps) | 12.0.0.4 (1.20.1 Forge) | Merges XP orbs into one entity after a big kill instead of dozens | Server-side | testing |
| ImmediatelyFast | [Modrinth](https://modrinth.com/mod/immediatelyfast) | 1.5.5+1.20.4 (Forge, MC 1.20-1.20.4, version `rvsLEEZU`) | Added 2026-09-26 (performance pass) - batches immediate-mode drawing: HUD, text, nametags, map/minimap, GUI items. This pack draws a lot of that per frame (Damage Numbers' per-hit text, Xaero minimap/radar, Jade, boss bars) | mods.toml checked: Forge `[46,)` (fine on 47.4.10), no dependencies, all deps side=CLIENT. packwiz `side = "client"`; listed in `tools/sync_server.sh` CLIENT_ONLY. No known issue with Embeddium/Entity Culling/FancyMenu on 1.20.1 | testing |
| Not Enough Crashes | [Modrinth](https://modrinth.com/mod/notenoughcrashes) | 4.4.9 (1.20.1 Forge) | Return to title screen and keep playing after a crash instead of losing the session | None known yet | testing |
| JEI | [Modrinth](https://modrinth.com/mod/jei) | 15.49.0.191 (1.20.1 Forge) | Recipe/item viewer | None known yet | testing |
| Jade | [Modrinth](https://modrinth.com/mod/jade) | 11.13.3 (1.20.1 Forge) | Hover-over info for blocks/entities | None known yet | testing |
| Xaero's Minimap | [Modrinth](https://modrinth.com/mod/xaeros-minimap) | 26.4.2 (1.20.1 Forge) | Minimap navigation | None known yet | testing |
| AppleSkin | [Modrinth](https://modrinth.com/mod/appleskin) | 2.5.1 (1.20.1 Forge) | Exact hunger/saturation values on food | None known yet | testing |
| Mouse Tweaks | [Modrinth](https://modrinth.com/mod/mouse-tweaks) | 2.25.1 (1.20.1 Forge) | Faster inventory management (shift/right-click-drag) | Was in a real swipe-gesture conflict with Inventory Profiles Next — moot now that IPN is removed (see Removed mods below) | testing |
| Corpse | [Modrinth](https://modrinth.com/mod/corpse) | 1.0.23 (1.20.1 Forge) | Death drops become a recoverable corpse instead of scattering — chosen over GraveStone Mod (same niche, picked one) | None known yet | testing |
| LootJS | [Modrinth](https://modrinth.com/mod/lootjs) | 2.13.1 (1.20.1 Forge) | KubeJS addon for editing loot tables — powers the loot-bag drop system (see Custom glue below). Small, purpose-built companion to KubeJS, not a standalone content mod | Server-side | testing |
| TFTH (The Flesh That Hates) | [Modrinth](https://modrinth.com/mod/tfth) | 1.1b (1.20.1 Forge) | Re-added 2026-08-19 to supply modded mob types for wave_spawner.js starting wave 2 — see the Wave spawner entry under Custom glue for exactly which mobs, and the "TFTH config hardening" entry there for why most of its own default behavior is disabled | Removed 2026-08-19 (first playtest, vanilla-only decision), re-added same day once the wave campaign was ready for modded mobs. TFTH is not just a mob roster — see the config hardening entry, this needed real care, not a blind re-add | testing |
| GeckoLib | [Modrinth](https://modrinth.com/mod/geckolib) | 4.8.4 (1.20.1 Forge) | Hard dependency of TFTH (animation library) | — | required |
| SecurityCraft | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/security-craft) | 1.10.2.1 (1.20.1 Forge) | Re-added 2026-08-29 to build the starting base's perimeter walls from reinforced (undiggable, explosion-proof) blocks — see the "Chokepoint walls" entry under Custom glue below. **Second role added 2026-09-11**: its ranged/proximity trap roster (Sentry, I.M.S., Trophy System, Cage Trap, Electrified Iron Fence, Bouncing Betty, Claymore) is now the whole Tier 2 defense line, replacing Advanced Tower Defense's Turret Workbench chain (see Removed mods below and `securitycraft_traps.js`) — all 5 traps that shipped with a Reinforced-block ingredient were re-recipied onto plain vanilla materials, and the Universal Block Reinforcer's own 3 recipes were stripped since nothing needs it anymore. **Trophy System cut the same day**, direct feedback ("serves no purpose as there are no air based enemies attacks") — checked, not just taken on faith: no bow-wielding mob and no dispenser-arrow trap in this pack's roster, and Demolition Zombie's thrown dynamite isn't an arrow/fireball either, so its counter-battery AI had nothing to ever shoot down. Tier 2 roster is now Sentry, I.M.S., Cage Trap, Electrified Iron Fence, Bouncing Betty, Claymore | Removed 2026-08-20 (footprint audit, never integrated at the time), re-added same as TFTH was — this time actually wired into a built system, not just installed | testing |
| FTB Quests | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/ftb-quests-forge) | 2001.4.22 (1.20.1 Forge) | Added 2026-08-29 for one quest ("Fortify") telling the player Tier 1 machines can be crafted — see the FTB Quests entry under Custom glue below | Requires FTB Library + FTB Teams (both added alongside it) | testing |
| FTB Library | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/ftb-library-forge) | 2001.2.13 (1.20.1 Forge) | Hard dependency of FTB Quests | — | required |
| FTB Teams | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/ftb-teams-forge) | 2001.3.2 (1.20.1 Forge) | Hard dependency of FTB Quests | — | required |
| FTB XMod Compat | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/ftb-xmod-compat) | 2.1.2 (1.20.1 Forge) | Added 2026-08-29 so clicking an item in a quest jumps to its JEI recipe — does nothing by itself, only bridges FTB Quests/JEI/KubeJS when it detects them installed | Both hard dependencies (FTB Library, Architectury) already satisfied by what's installed; no new dependency chain | testing |
| Simply Traps | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/simply-traps) | 1.7 (1.20.1 Forge) | Added 2026-09-08, replaces Trapcraft's Spikes (`spike_trap`) — see "Trapcraft dropped entirely" in FEATURES.md | Standalone, no dependencies | testing |
| V01D's Bear Traps | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/v01ds-bear-traps) | BETA build (1.20.1 Forge) | Added 2026-09-08, replaces Trapcraft's Bear Trap (`bear_trap_open`). Ships with no crafting recipe at all (world-gen only, confirmed by decompile) — a KubeJS recipe was added from scratch in `tier1_recipes.js` | Standalone, no dependencies | testing |
| Treasure2 | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/treasure2) | 4.0.5 (1.20.1 Forge) | Added 2026-08-30 for the desert-biome structure-generation plan — desert ruins/wishing wells + general surface/dungeon structures, 18+ tiered locked treasure chests including Mimic Chests. Confirmed directly from its own structure JSONs that these actually target the `minecraft:desert` biome this world uses | Requires GottschCore (added alongside it) | testing |
| GottschCore | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/gottschcore) | 2.8.0 (1.20.1 Forge) | Hard dependency of Treasure2 | — | required |
| Curios API | [Modrinth](https://modrinth.com/mod/curios) | 5.14.1+1.20.1 (Forge) | Added 2026-08-30 for the amulet (FEATURES.md's "The amulet") — the current, actively-maintained accessory-slot mod; Baubles (the older equivalent) has no Forge 1.20.1 build at all | Ships slot *types* but grants zero slots to any entity by default — this pack grants 1 necklace slot itself via `pack/kubejs/data/kubejs/curios/slots/necklace.json`, confirmed against Curios' own `CuriosSlotManager.java` source | testing |
| KubeJS-Curios | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/kubejs-curios) | 1.0.4 (1.20.1 Forge) | Added 2026-08-30 alongside Curios API — bridges Curios' equip/unequip/tick-while-worn hooks to KubeJS scripts. CurseForge project 1255211, author zhaijineet — a *different*, same-named project (Prunoideae/KubeJS-Curios) also exists with a different API; installed the one the actual CurseForge listing links to, not assumed from the name | Requires Curios API, Architectury API, KubeJS, Rhino — all already present, packwiz added no new dependency chain | testing |
| Sophisticated Storage | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/sophisticated-storage) | 1.4.86 (1.20.1 Forge) | Added 2026-09-08 (Roadmap Phase 3) — upgradeable barrels/chests with filtering, the storage half of the Tier 3 "tech pack feel" power/storage system. See FEATURES.md's "Storage & power system" entry | Requires Sophisticated Core (packwiz auto-added it, confirmed real dependency via both packwiz's resolver and the jar's own `mods.toml`). Ships ~25 bundled advancement/recipe files referencing Sophisticated Backpacks (a separate, NOT-installed mod, same author) — real, non-fatal `Unknown item id` log noise on every boot, flagged not fixed | testing |
| Sophisticated Core | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/sophisticated-core) | 1.5.1 (1.20.1 Forge) | Hard dependency of Sophisticated Storage | — | required |
| Sophisticated Backpacks | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/sophisticated-backpacks) | 3.26.3.2157 (project 422301, file 8845923, 1.20.1 Forge) | Added 2026-09-27 on direct ask. Craftable, upgradeable backpacks (leather/string/chest, then copper/iron/gold/diamond rings); open with B, wearable in the Curios back slot. Quest "Pack Mule" (after "Room to Grow"). Two built-in systems turned OFF, user-picked: `entityBackpackAdditions.chance = 0.0` (the default 1% put buffed, armoured, loot-carrying backpack mobs into the wave roster) via `defaultconfigs/sophisticatedbackpacks-server.toml`, and `chestLootEnabled = false` (the mod injected backpacks/upgrades into vanilla chest loot, which some structures use) in `config/sophisticatedbackpacks-common.toml`. Xaero's new-waypoint key moved B -> K to free B (instance options.txt + shipped options.txt). | **Pinned to 3.26.3.2157 on purpose, not the newest.** The newest build (3.26.3.2167, released the same day as Sophisticated Core 1.5.2 and Storage 1.5.0) declares `sophisticatedcore [1.5.1.+,)` but actually needs Core 1.5.2's `ILinkedStorageEndpointAccessProvider`, so a full-mod-set sandbox boot crashed on it (NoClassDefFoundError). 2157 (2026-09-09) pairs with the installed Core 1.5.1.2335 (2026-09-08). **Gotcha:** `packwiz cf add --file-id` for the pinned build silently bumped `sophisticated-core.pw.toml` to 1.5.2.2346 while "adding" the dependency; reverted with git. Update all three Sophisticated mods together or not at all. Also clears the ~116 sophisticatedstorage advancement errors that referenced Backpacks items. Jar sha1 `9be2c9c5...` matches the metafile. | testing |
| Refined Storage | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/refined-storage) | 1.12.4 (1.20.1 Forge) | Added 2026-09-08 (Roadmap Phase 3) — the networked digital item storage system (Controller/Grid/Disks), the actual "tech pack" storage backbone. Purely consumes FE, no generation of its own | Confirmed via the downloaded jar's own `mods.toml`: zero required dependencies beyond the Forge `[47,)`/Minecraft `[1.20.1]` floor. A generic CurseForge relations-page scrape had suggested a required Fabric API dependency — that's real only for the mod's separate Fabric build, not this Forge one; corrected after downloading and checking the real jar directly | testing |
| Immersive Engineering | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/immersive-engineering) | 10.2.0-183 (1.20.1 Forge) | Added 2026-09-08 (Roadmap Phase 3) for Tier 3's real Tesla Coil (`immersiveengineering:tesla_coil`, decompiled and picked over both the nonexistent "Create's own Tesla Coil" the roadmap dispatch named and Create: Crafts & Additions' real-but-smaller version — see FEATURES.md for the full mechanics comparison). **2026-09-11**: also now the source of the Gun Turret/Chemthrower Turret (`turret_gun`/`turret_chem`, re-recipied — see `tier3_turret_recipes.js`), Tier 3's new powered-trap roster alongside the Tesla Coil. Its own Diesel Generator (a 3×3×5 multiblock needing a Squeezer/Fermenter/Refinery biodiesel chain) was dropped the same day in favor of Generator Galore's Culinary Generator (see that row below) — direct ask for a single-block, renewable fuel source instead. Marked "Final release for 1.20.1" by the author. **2026-09-22: installed as a patched plain jar** (`ImmersiveEngineering-1.20.1-10.2.0-183-tdcoilfilter.jar`, packwiz metafile removed) so Tesla Coils never target players or Sentries - see the patched-jars section below. Real footprint: a full standalone tech mod (own ore processing, engineering workbench, multiblock machines) — the biggest single addition to this pack besides full Create | Confirmed via the downloaded jar's own `mods.toml`: only mandatory deps are `forge >=47.3.0` (this pack runs 47.4.10, satisfied) and `minecraft 1.20.1`; `jei` optional, already installed | testing |
| Flux Networks | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/flux-networks) | 7.2.1.15 (1.20.1 Forge) | Added 2026-09-08 (Roadmap Phase 3) — wireless FE distribution (Flux Point at the generator, Flux Plugs at consumers), the "place a machine and it draws automatically" piece of the Tier 3 power chain | Confirmed via the downloaded jar's own `mods.toml`: only mandatory deps are `forge >=46` and `minecraft [1.20,1.21)`; `modernui`/`jei` optional. No SonarCore dependency in this build | testing |
| Generator Galore | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/generatorgalore) | 1.2.5 (1.20.1 Forge) | Added 2026-09-11 — replaces Immersive Engineering's Diesel Generator as Tier 3's power source. Its Culinary Generator (`generatorgalore:culinary_generator`) is a single block with `fuelType: "FOOD"` (verified via the jar's own `data/generatorgalore/generators/culinary.json`) — burns any food item, rotten flesh included, so wave kills directly fund the base's power instead of piling up as loot deadweight. Reached via a short tier ladder (Copper → Iron → Gold → Culinary, each a plain crafting-table recipe), not a single from-scratch craft. **Power output tuned to match, not stock**: the shipped Culinary Generator only makes 8 Flux/t — real config defaults decompiled from `IEServerConfig$Machines` showed the Tesla Coil alone needs 256 Flux/t idle + 512/hit, plus 64 Flux/t idle + 32 firing per turret (384 Flux/t for all three just sitting there). Rather than pushing generator-count math onto the player, output is raised to 4096 Flux/t (matching IE's own `dieselGen_output` default, so it's a genuine drop-in for the Diesel Generator it replaced). **Real mechanism, found the hard way**: a first attempt used KubeJS's `ServerEvents.highPriorityData`/`event.addJson` to override `data/generatorgalore/generators/culinary.json` as a datapack resource — sandbox-verified to have *zero effect*: decompiling `GeneratorRegistry.discoverGeneratorFiles()` showed this mod never reads through Minecraft's resource-pack system at all. It copies its bundled generator jsons out of its own jar via raw `java.io.FileInputStream`/`Files.copy` straight into `<config>/generatorgalore/generators/` during FML mod construction — before any world or datapack exists. The real fix ships two files directly: `pack/config/generatorgalore/generators/culinary.json` (the boosted values) *and* `pack/config/generatorgalore/defaults.lock` (an empty marker file). Both are required together — decompiled `discoverGeneratorFiles()`/`setupDefaultFiles()`/`copyFiles()` show that without the lock file present, the mod's first-boot path force-copies its own stock json over ours with `REPLACE_EXISTING`; with the lock file present (mimicking "defaults already set up"), it only copies files that don't already exist, so ours survives. **Confirmed live via RCON**: placed the block, fed it rotten flesh, and its real `generationRate` field read `16384.0` (4 nutrition × 4096, exactly as predicted) — the 100,000-unit buffer filled essentially instantly instead of the ~17-18/tick the stock 8-rate version showed in the first (failed) fix's own test | No listed dependencies; confirmed via the downloaded jar directly (no `mods.toml` required-mod entries beyond the Forge/MC floor) | testing |
| Item Collectors | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/item-collectors) | 1.1.10 (1.20.1 Forge) | Added 2026-09-09, replaces Vacuum Blocks (`vacuum_block_tier_1`) — direct feedback ("the vacuum chest thing"), and Vacuum Blocks turned out to be genuine dead code on redecompile (no tier ever opts into random ticking, so its only pull logic never runs). Real mechanic: omnidirectional 5-block pull into whatever's underneath, no rig | Requires SuperMartijn642's Core Lib + Config Lib (both added alongside it, packwiz auto-resolved) | testing |
| SuperMartijn642's Core Lib | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/supermartijn642s-core-lib) | 1.1.24a (1.20.1 Forge) | Hard dependency of Item Collectors | — | required |
| SuperMartijn642's Config Lib | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/supermartijn642s-config-lib) | 1.1.8 (1.20.1 Forge) | Hard dependency of Item Collectors | — | required |
| Waystones | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/waystones) | 14.1.20 (project 245755, file 7682270, 1.20.1 Forge) | **Correction, 2026-09-16**: this pack's own "Removed mods" section below had said Waystones was removed 2026-08-20 as "never integrated" — that's stale and wrong. Real, direct ask 2026-09-05 ("one real, findable Waystone from the start") re-added it for real: `playtest_starter_kit.js` pre-places a real two-block Waystone in the starter house (moved once already, 2026-09-09, on direct feedback), `campaign.snbt` and `tips_and_tricks.snbt` each have a quest teaching/requiring it, and Xaero's Minimap has its waystone-waypoint display options enabled. A real bug was found and fixed here too: a bare `/setblock` only ever writes the block's default `half=lower` state, never the `half=upper` block above it that real player-placement code sets automatically (confirmed by decompiling `WaystoneBlock`/`WaystoneBlockBase` directly) — fixed by setting both halves explicitly. **A near-miss**: today's docs cleanup almost removed this mod again, trusting the stale "never integrated" note instead of checking the actual scripts first — caught before the fix shipped by grepping the codebase for real references. Nothing in "Removed mods" below should be trusted without the same check going forward | Requires Balm (present, hard dependency) | confirmed |
| Balm | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/balm) | 7.3.42 (project 531761, file 8545415, 1.20.1 Forge) | Hard dependency of Waystones | — | required |
| Open Modular Turrets Reborn | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/open-modular-turrets-reborn) | 1.1.0 (project 1588314, file 8344785, 1.20.1 Forge) | Added 2026-09-15 for Tier 4 ("elite/endgame" — see docs/IDEAS.md's Machine progression entry). A from-scratch 1.20.1 revival of the classic Open Modular Turrets, picked after a 3-agent research deep dive found nothing else cleanly fit: real AoE-damage turrets (`omtreborn:grenade_turret`/`rocket_turret`, both confirmed via the mod's own lang file to deal genuine "area damage" — Tier 3's Gun/Chem Turret are single-target only), every component a plain crafting-table recipe (base/sensor/barrel/chamber, no workbench/blueprint step — same bar that got Create and Advanced Tower Defense removed), and native Forge Energy support so the Turret Base plugs straight into the already-built Flux Networks grid with no recipe hack needed (it's a single block with its own FE capability, unlike IE's turrets which are multiblocks that needed a Flux Point spliced into their recipe). Real project/file IDs, downloaded and sha1-verified (`f9ec1ffedfede502c7a36a90df86cec46433f5b0`) against packwiz's recorded metadata before decompiling. **One real gap found and fixed**: every component past Tier 1 needs `omtreborn:ferronite_ingot`, smelted from the mod's own `ferronite_ore` — real ore, real biome-modifier registration, and (unlike Tier 3's IE ores) its placement range does overlap this world's actual thin stone slab instead of missing it entirely, but per this pack's standing "recipes should make sense with the loot tables" rule, mining alone isn't relied on: `tier4_turret_recipes.js` adds an alternate Ferronite source refined straight from Tier 3's own (already loot-reachable) Steel + Redstone, alongside the mod's own untouched mining/smelting chain. Only 2 of the mod's 10 turret heads were adopted — see that file's header for what was passed over and why (Tier 5's Laser/Rail Gun/Plasma need an End Crystal or Nether Star; Incendiary/Relativistic/Teleporter need Nether items or an actual Eye of Ender — all dependencies this pack has avoided since the Tier 3 sourcing-gap pass). No dependencies — confirmed via packwiz's own resolver (zero `[[dependencies]]` entries) | Metadata-only in packwiz (`mode = "metadata:curseforge"`), matching every other CurseForge-sourced mod in this pack — the actual jar was downloaded straight into the live CurseForge instance and dedicated server `mods/` folders to complete the install (see the sandbox verification note under Tier 4 in FEATURES.md) | testing |

**37 rows below added 2026-09-16** — a rigorous diff of every `pack/mods/*.pw.toml` slug against every slug/name referenced anywhere in this table found 38 genuinely-installed mods with no row at all (Kotlin for Forge below makes 38; the other 37 came from two parallel research passes, each mod's real purpose verified against actual `pack/kubejs`/`pack/config` usage and existing docs mentions, not described from a generic mod-page blurb — see the retired staging notes for the full per-mod research trail). Grouped by real hard-dependency chain where one exists, rather than alphabetically.

| Undead Nights | [Modrinth](https://modrinth.com/mod/undead-nights) | 2.3.0 (project g0mmcQV2, version EMzeC0pU, 1.20.1 Forge) | This pack's endless-phase backend, not a minor add-on. `wave_spawner.js` hands off from wave 8 to Undead Nights' own `spawn_horde` command for "Horde N" (waves 9+), riding the mod's real 40-level escalating difficulty system so toughness keeps climbing forever with zero extra scaling code. Its own `horde_zombie`/`elite_zombie`/`demolition_zombie` are used directly in the wave roster; `demolition_zombie` is a real wall-breaching entity with a genuine terrain-destroying explosion (decompiled). | Its own native "Nights of the Undead" autonomous horde system is deliberately disabled (fired independently of this pack's own `spawn_horde` calls, spawning an uncontrolled second horde every night — found and fixed 2026-09-02). Its config is a Forge `SERVER`-type file — live-editing it does nothing until a full restart. Commands message the source entity directly, so `runCommandSilent` can't mute them — run them `execute as` the marker armor stand instead. | confirmed |
| The Lost City | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/the-lost-city) | 1.5.0 (project 1159207, file 8762809, 1.20.1 Forge) | Installed 2026-09-01 for structure cohesion (author Berezka — the singular "The Lost City," deliberately distinct from "The Lost Cities," ruled out for shipping its own chunk generator). Ships 12 structure_sets generating real small towns/cities. **None of them is active since 2026-09-27** (disabled with `structures: []`, every structure JSON and template kept): `city`/`big_city_structure`/`villages_city` generate through the pack's own `kubejs:towns` set on the base-anchor lattice (~1 km out), `camp`/`tower`/`survivorscamp`/`factory` through `kubejs:ruins_pool`, and `post`/`roads`/`rails`/`train`/`lighthouse` are cut. The four big-city skyscraper templates are overridden down to 56-71 barrels (from 255-536). Real loot depth found via a full container census: 2,916 containers, 1,352 completely empty (filled live by this pack's own scavenge system) and 1,487 pre-tagged with dependency Berezka API's own tables. | **Hard dependency: Berezka's Library** (row below). Real, still-live crash history: 12 overlapping city-family structure_sets sharing one world; a 2026-09-01 spacing retune broke Berezka's own `exclusion_zone` anti-overlap safeguard and caused a "structure spawned inside structure" crash storm — reverted to stock spacing, and **The Lost City is intentionally excluded from the reachability-retune pattern going forward.** *Superseded 2026-09-27:* the 2026-09-09 anchor grid had already swapped its city exclusions for `base_anchor`, and Berezka's overlap handler then deleted most towns (it removes whichever Berezka structure generates second in a shared chunk). Towns now sit alone on anchor chunks; see docs/FEATURES.md "2026-09-27 structure-gen rework". | confirmed |
| Berezka's library | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/berezka-library) | 1.2.9.6 (project 1160598, file 8762847, 1.20.1 Forge) | Real, sole hard dependency of The Lost City above (its own dependencies page names this library directly and singularly). Also the mod that actually ships the loot tables found during the structure container census: The Lost City's containers are largely Berezka's own `berezka_api:chests/*` tables (`store`, `simple_chest`, `empty_chest`, `farm`, `car`, `diningroom`, `tower_chest`), all overridden pack-side with real loot. | **Not the same dependency ambiguity that sank the unrelated, never-installed "Abandoned Structures" (Berezka) mod below** — that one needed one of ~12 similarly-named per-mod addons that couldn't be confidently matched; this is Berezka's actual singular core library, a genuinely different, resolved situation. | required |
| Mutants and Zombies | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/mutants-and-zombies) | 1.4.0 (project 1204883, file 8577715, 1.20.1 Forge) | Installed as part of the zombie-apocalypse roster pivot, same author (MCModsPete) as the already-trusted Undead Nights. Supplies 8 live-used mobs (`mutant_zombie`/`rotten_mutant`/`mutant_brute`/`split_head_zombie`/`zombie_brute`/`spitter`/`crawler`/`blister_zombie`, ids confirmed by decompile). `mutant_brute` is "The Behemoth," the boss-wave mob spawned every 10th wave (`boss_wave.js`, 600 HP/30 attack, netherite-armored, real `/bossbar`). Confirmed via decompile to add no autonomous hordes/blood-moons/day-based-difficulty of its own. | **Hard dependency: Advanced Wall Climber API** (row below) — decompile-verified real use, not redundant: `CrawlerEntity` implements `IAdvancedClimber` and climbs via AWC's own `ClimberComponent`, not vanilla PathNavigation. Ships its own natural night spawns for every biome, overridden off pack-wide (8 biome-modifier files) so only wave/horde spawns produce these mobs. | confirmed |
| Advanced Wall Climber API | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/advanced-wall-climber-api) | 1.0.2 (project 1425144, file 7567734) | Real, decompile-confirmed hard dependency for Mutants and Zombies' Crawler mob above — Crawler implements climbing entirely through this API's `ClimberComponent`/`ClimberPathNavigator`. Decompile-verified zero conflict with Enhanced Hordes' own stacking mechanic (fully disjoint entity tags and mechanisms). The Crawler was real-summoned in a sandbox specifically to confirm this dependency actually loads and works. | **Filename reads as NeoForge-only** (`awcapi-neoforge-1.20.1-1.0.2.jar`) on this Forge pack — checked directly rather than trusted: the jar's own `mods.toml` shows `modLoader = "javafml"` with a real `forge [47,)` dependency, unambiguous proof it's a genuine Forge build despite the filename. | confirmed |
| Zombies More | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/zombies-more) | 2.1.5 (project 957379, file 5900446, 1.20.1 Forge; author CaraAleatorio7) | Another zombie-family roster addition, namespace `zombiesmore`. Its Boomer Zombie is a real quest icon in campaign.snbt ("Three Down"), and its decompiled `BoomerChargedOnInitialEntitySpawnProcedure` does a genuine `level.explode()` on death — a real mechanic, not cosmetic. Its `crawler` id overlaps in name with Mutants and Zombies' `crawler` but is a distinct entity in a distinct namespace. | Ships its own natural night spawns for every biome too, overridden off pack-wide via 5 biome-modifier files (boomer/crawler/cursed_zombie/explosive_zombie/tank_zombie) — this override is load-bearing, not redundant: an earlier "early boomers" playtest complaint traced directly to this mod's own vanilla spawns before the fix landed. Zero declared dependencies. | confirmed |
| Simple Guns: reworked | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/simple-guns-reworked) | 1.9.9 (project 437035, file 7924023, 1.20.1 Forge) | Gives wave/airdrop loot real firearm variety. 16 guns + 7 ammo/consumable types, namespace `simple_guns_reworked`, used directly in `wave_airdrop.js` and structure loot tables. Has its own dedicated FTB Quests chapter, Arsenal (24 flat item-possession quests). **2026-09-27: +50% damage on every gun** (`gun_damage_bump.js`). Each projectile's own base damage is multiplied by 1.5 on spawn, so per-gun values, speed scaling and crits are kept. Bazooka/grenade/charged-potato *blast* damage is unchanged, because those explode with a null source entity and a fixed power. | Zero declared dependencies. One dead item confirmed during the Arsenal build (see docs/archive/queue-history-2026-09.md's "found and confirmed a real dead gun," 2026-09-11) — the Assault Rifle, since pulled from all loot tables 2026-09-16. | confirmed |
| Lootr | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/lootr) | 0.7.35.94 (project 361276, file 7263076, 1.20.1 Forge) | Gives loot-tagged structure chests/barrels personal per-player loot instancing. Since 2026-09-27 `pack/config/lootr-common.toml` blacklists the household/filler tables and the whole `postapocalypse_structures` namespace, so only real stashes convert (~85% fewer), and `structure_loot_progression.js` pays its bonus to Lootr containers only - the gold trim is the "this one's worth it" signal (FEATURES.md "Structure loot tiering"). The config must live in `pack/config/`, not `defaultconfigs/` (Lootr creates the file itself first). Its per-player-opened state can't be verified from a script/sandbox — needs an actual client right-click. | **Real mod-freshness scare, resolved.** A CurseForge single-file check once wrongly concluded Lootr's last Forge 1.20.1 build was from 2023 (stale) — CurseForge had silently renamed its file convention, fooling a filename-pattern check. Modrinth's real version API showed continuous builds through late 2025. Origin of this pack's own "verify mod freshness via API" standing lesson. | confirmed |
| BountyBags | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/bounty-bags) | 5.9.0 (project 1206557, file 8537855, 1.20.1 Forge) | Supplies the `bountybags:{uncommon,rare,epic,legendary}_loot_bag` items that are this pack's actual loot-bag currency — granted via `loot_bag_drops.js`'s own LootJS modifiers keyed to this pack's wave-tier roster (including TFTH mobs this mod's native list doesn't know about), not its own native drop system. | Its own native drop system is deliberately disabled (`enableDrops = false`, `pack/config/bountybags-common.toml`) since this pack drives every bag drop itself — leaving it on would double-drop from a narrower, vanilla-only default mob list (same "two systems fighting" class of bug already found for Undead Nights' native horde system). | confirmed |
| Loot Beams: Refork | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/loot-beams-refork) | 3.4.7 (project 1150640, file 8358513, 1.20.1 Forge) | Client-side visual beam over dropped items, installed so the 2%-per-kill legendary-bag jackpot is unmistakable. Real shipped tuning beyond defaults: `pack/config/lootbeams/light_config.toml` sets a real per-item gold color override for `bountybags:legendary_loot_bag` (decompiled the mod's own classes to find the real serialization format), plus a mixin making item-entity beams unconditionally renderable. | **A real mandatory dependency chain runs through this mod down to Kotlin for Forge (see that row below)** — caught mid-cleanup when this same 2026-09-16 audit briefly removed Kotlin for Forge as apparent dead weight from the old Inventory Profiles Next removal; restored immediately once the live chain was decompiled and confirmed. Chain: this mod → Nirvana Library → Fzzy Config (+ Common Networking) → Kotlin for Forge. | confirmed |
| Nirvana Library | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/nirvana-library) | 2.2.0 (project 1164411, file 7986008, 1.20.1 Forge) | Pure library mod, ships no content of its own — exists purely as Loot Beams: Refork's mandatory client-side runtime dependency (row above). Not referenced anywhere in kubejs/config/quests on its own, which is expected for infrastructure whose only job is making Loot Beams load. | Mandatorily requires Fzzy Config and Common Networking (both below) — same chain as Loot Beams above, same near-miss/restore story. | required |
| Common Network | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/common-network) | 1.0.6 (project 806044, file 8357966, 1.20.1 Forge) | Part of the real dependency chain packwiz auto-resolved for Loot Beams: Refork, alongside Nirvana Library and Fzzy Config. No direct KubeJS/config reference of its own — pure networking-support library. | Same chain as Loot Beams/Nirvana Library above. | required |
| Fzzy Config | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/fzzy-config) | 0.7.6 (project 1005914, file 7568893, 1.20.1 Forge) | Real hard dependency of Loot Beams: Refork's config system. Actively load-bearing: the legendary-jackpot loot-beam gold color override required decompiling this mod's own classes to find the real config serialization format. | Its own TOML output/parsing only happens on a real client launch, not a dedicated-server sandbox boot — the shipped config is a good-faith reconstruction confirmed only by a clean sandbox boot, not a verified real round-trip. **Mandatorily requires Kotlin for Forge** — see that row, the actual bottom of this chain. | required |
| Kotlin for Forge | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/kotlin-for-forge) | 4.12.0 (project 351264, file 7291067, 1.20.1 Forge) | The real bottom of the Loot Beams → Nirvana Library → Fzzy Config chain above — `mandatory = true` in Fzzy Config's own live `mods.toml`, `versionRange [4.11.0,4.99.0]`, decompiled and confirmed directly, not assumed. **Nearly removed by mistake during this same 2026-09-16 cleanup pass**, on the assumption it was leftover cruft from the (correctly) already-removed Inventory Profiles Next — see that entry under Removed mods below for the real timeline. Caught and restored before it reached the live instance for good. | Originally added 2026-08-19 for Inventory Profiles Next, removed with it 2026-08-29, then genuinely re-needed and re-added 2026-09-06 when Loot Beams: Refork was installed — two unrelated reasons for the same mod across two different weeks, which is exactly why the "Removed mods" note went stale. | required |
| Toast Control | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/toast-control) | 8.0.3 (project 271740, file 4711316, 1.20.1 Forge; author Shadows_of_Fire) | Permanently suppresses the vanilla recipe-unlock toast popup spam (confirmed no vanilla client setting for this exists). Filters/repositions vanilla's own toast triggers only — can't push custom text, so it's not a general notification system (that's Pick Up Notifier's job, below). | **Hard dependency: Placebo** (row below), same single-author pairing pattern this pack already knows from Supplementaries/Moonlight Lib. | confirmed |
| Placebo | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/placebo) | 8.6.3 (project 283644, file 6274231, 1.20.1 Forge; author Shadows_of_Fire) | Shared utility library, installed as Toast Control's real hard dependency (packwiz auto-resolved it). No direct kubejs/quest references of its own — pure infrastructure. | Zero further dependencies beyond minecraft. | required |
| Pick Up Notifier | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/pick-up-notifier) | 8.0.0 (project 351441, file 4613538, 1.20.1 Forge; author Fuzss) | Wired deliberately narrow — only loot-bag-opens (`loot_bag_notification.js`), not a general "any item gained" popup, since BountyBags never natively notifies the player and its own native trigger can't fire for a direct-to-inventory grant. Fed via an undocumented-but-public internal hook, confirmed live and working per direct feedback. | **Hard dependency: Puzzles Lib** (row below). Zero keybinds registered, no UI-conflict risk. | confirmed |
| Puzzles Lib | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/puzzles-lib) | 8.1.33 (project 495476, file 6918565, 1.20.1 Forge; author Fuzss) | Fuzss's shared library, added as Pick Up Notifier's real dependency. More than passive infrastructure: `loot_bag_notification.js` reflects directly into its own networking classes to relay the bag-open popup, including a documented package-private-class/name-based-method-lookup gotcha. | Jar-in-jars its own Puzzles Access API dependency — no separate mod file needed. 199M+ downloads, low-risk. | confirmed |
| Supplementaries | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/supplementaries) | 3.1.43 (project 412082, file 7884611, 1.20.1 Forge; author MehVahdJukaar) | Installed specifically for its real Pedestal block, which now IS the amulet/pedestal system's visual and logic layer — `amulet_pedestal.js` polls its real Container API directly instead of a from-scratch custom block. Same config also disables the mod's "Amendments not installed"/Optifine warning screens. | **Hard dependency: Moonlight Lib** (row below, packwiz slug `selene`). Optional soft deps on `quark`/`create`, neither installed. | confirmed |
| Moonlight Lib | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/selene) | 2.16.34 (project 499980, file 8261419, packwiz slug `selene`, 1.20.1 Forge; author MehVahdJukaar) | **Naming note**: the packwiz slug/filename is `selene`, but the mod's own real `displayName` is "Moonlight Lib" — Selene was its old name before a rename. Don't create a duplicate row if it's ever searched under "Selene." Pure shared library, installed purely as Supplementaries' real dependency (row above). | No further dependencies beyond forge/minecraft. | required |
| Philip's Ruins | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/philips-ruins) | 5.7 (project 569737, file 7024377, packwiz slug `ruins`, 1.20.1 Forge; author philipmoddev) | 200+ smaller ruin variants that blend into terrain rather than standing out as loot piñatas — 20 structure_sets. **Since 2026-09-27** `ancient_towers`, `level_three_ruins`, `desert_structures` (with its badlands pieces), `field_stone_ruins_rocks` and `start_nether_ruin` generate through `kubejs:ruins_pool`. The crypts, flat rubble and underground sets (`ancient_crypt`, `ancient_dungeon`, `ancient_ruins`, `antiquus_crypta`, `field_stone_ruins`, `level_one/two_ruins`, `lost_soul_city`, `underground_structures`) are cut (sets disabled, templates kept). `end_ruins`/`nether_structures` are untouched. Ships ~13 real vanilla-format chest loot tables, fully LootJS-controllable, confirmed via container census (no dead/empty-barrel problem the way Lost City had). | None found beyond forge/minecraft. Confirmed NOT implicated in the Big Lost City removal / Radium `chunk_region` crash history — stayed installed through that pass on purpose. | confirmed |
| Unnamed Desert | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/unnamed-desert) | 1.6.3 (project 960356, file 6792605, 1.20.1 Forge) | Structure/decoration content, namespace `u_desert` — 5 structure_sets, each with real monster spawn_overrides baked directly into jigsaw pieces (confirmed via NBT scan, not a live spawner — `doMobSpawning false` correctly keeps them dormant). Desert-only in the jar, but gated to all 5 in-world biomes since 2026-09-10 (`#kubejs:ruins_biomes`). **Since 2026-09-27 all 5 sets are disabled** and every piece generates through `kubejs:ruins_pool`: outposts and desert ruins as buildings, and oasis/geyser/skeletons/pillar as rare props. The old reachability retunes are superseded. | None found beyond forge/minecraft. One open cosmetic question in PLAYTESTING.md: whether a `u_desert:oasis` in this pack's dead-plains terrain looks thematically odd — not yet resolved by a real client check. | confirmed |
| Apocalypse structures: Abandoned city buildings | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/abandoned-post-apocalyptic-buildings) | 1.0.2 (project 1192082, file 6596819, 1.20.1 Forge; author That1LilGuy) | Adds 4 aboveground buildings under namespace `postapocalypse_structures`. Its Abandoned Brick House was the starter-base template until 2026-09-22. The base now `/place`s `the_lost_city:cafe4`, and no script places the brick house. **Since 2026-09-27** redhouse, yellowhouse and red_mansion generate through `kubejs:ruins_pool`. The brick house is cut as a world structure: its set is disabled, but its template and `.nbt` override (which held the near-tier guard spawner) stay. None of the three kept houses has a guard spawner. | No mandatory dependencies. Biome placement re-tagged to `#kubejs:ruins_biomes` pack-side, same as every other structure mod here. | confirmed |
| Abandoned Structures | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/abandoned-structures) | 1.4.0 (project 1398609, file 8168655, 1.20.1 Forge) | Namespace `abandoned_structures`. Its gas station (`zapravka.nbt` override) carries the toughest ("far tier") guard-spawner roster. **Corrected 2026-09-27:** the jar does ship its own worldgen (structure, template_pool and structure_set files, stock spacing 20/10, 30/15, 26/20 and 34/8); the pack overrides them. Since 2026-09-27 all four (gas_station, house1, house2, tower) generate through `kubejs:ruins_pool`. | **Naming collision worth flagging**: docs/FEATURES.md has older entries about a *different*, Berezka-authored mod with the same display name, ruled out for an unidentifiable dependency. That rejection is real but about a different mod — this one (a separate listing, zero dependencies) was found and installed later and is genuinely in active use. | confirmed |
| Abandoned urban | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/abandoned-urban) | 1.1.0 (project 1003507, file 5297465, 1.20.1 Forge; author KevinMods) | 7 structures under namespace `abandoned_urban` (gas_station/fire_tower/motel/city/observatory/plane_crash/train). **Since 2026-09-27** `city` is one of the `kubejs:towns` on the anchor lattice, and gas_station/motel/observatory/plane_crash/train generate through `kubejs:ruins_pool`. The gas station's near-tier guard spawner now sits in `gas_station_loot.nbt` (the template its pool actually places; the 2026-09-10 spawner was in the dead `gas_station.nbt`, now deleted). Uses plain jigsaw with heightmap terrain adaptation, low structural risk. | No mandatory dependencies. `fire_tower` was biome-starved (meadow only) until the 2026-09-10 one-tag gating made it world-wide (113 starts in the Manna save). **Cut 2026-09-27**: set disabled, template and its `.nbt` override kept. The 501 `city_building` pool warnings are harmless: it's the buildings' own back-connector (see QUEUE.md). | confirmed |
| Abandoned Watchtowers | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/abandoned-watchtowers) | 7.0 (project 1274025, file 7776825, 1.20.1 Forge) | Namespace `watchtower_building`. Its big tower carries the far-tier guard-spawner roster, spread up the real 29-block structure. Both towers generate through `kubejs:ruins_pool` since 2026-09-27. Its 157 barrel-tagged containers were folded into the pack-wide loot-table override pass. | No mandatory dependencies. | confirmed |
| Collective | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/collective) | 8.39 (project 342584, file 8341458, 1.20.1 Forge) | Serilum's shared library — real hard dependency of Hide Experimental Warning below. Same single-author mod+library pairing already established in this pack for Corpse (also Serilum). No direct KubeJS/config usage of its own. | — | required |
| Hide Experimental Warning | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/hide-experimental-warning) | 1.2 (project 1009556, file 5572389, 1.20.1 Forge; author Serilum) | Suppresses vanilla's "experimental settings" world-creation warning dialog, which is hardcoded for any world using datapack-level dimension/worldgen content (this pack's flat + curated multi-biome overworld qualifies) — no other suppression trick exists. Purely a client dialog, doesn't show on a real dedicated server. | Requires Collective above. | testing |
| Controlling | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/controlling) | 12.0.2 (project 250398, file 4646682, 1.20.1 Forge) | Adds a searchable keybind list to vanilla's Controls menu. Sandbox-verified on a fresh-world boot alongside Inventory Sorter/Xaero's World Map/Waystones/Crafting Station Improved. Pure client QoL, no KubeJS/config glue needed. | Requires Searchables below. One real naming collision caught during research: an initial search surfaced an unrelated vampire-roleplay mod before the real listing was confirmed directly. | testing |
| Searchables | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/searchables) | 1.0.3 (project 858542, file 5284015, 1.20.1 Forge) | Installed as Controlling's real dependency above — adds search-bar functionality other mods hook into. No direct kubejs/config/quest references of its own, expected for a library whose entire job is being consumed by another mod's UI. | None found beyond forge/minecraft. | confirmed |
| Crafting Station Improved | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/crafting-station-improved) | 1.4.0 (project 1310299, file 8108816, 1.20.1 Forge) | Replaces the starter base's pre-furnished vanilla crafting table with `craftingstation:crafting_station`. Its "Reach Further" quest teaches the connected-inventory mechanic. | **Known, real, still-open issue** (see docs/QUEUE.md): its inventory panel is hardcoded over JEI's bookmark panel. No drop-in fix exists on Forge 1.20.1 — every alternative checked has the same panel, and the one no-panel mod has no Forge 1.20.1 build. Left as-is per direct call, a deliberate tradeoff. | flagged |
| Inventory Sorter | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/inventory-sorter) | 23.0.11 (project 240633, file 7188685, 1.20.1 Forge; author cpw) | Middle-click sort + mousewheel item-move. | **Known, real, still-open bug** (see docs/QUEUE.md): middle-click sort only ever sorts the clicked section (hotbar never included), and inside Sophisticated Storage containers it competes with Sophisticated Core's own middle-click sort. A fix is written up (swap to Inventory Profiles Next) but explicitly not acted on yet. | flagged |
| Damage Numbers | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/damagenumbers) | 1.4.0 (project 1022853, file 5475417, 1.20.1 Forge; author luavixen) | Pure floating damage-particle visual effect on hit — zero KubeJS/config integration found anywhere in this pack. Registers no keybind of its own. | Real naming collision caught before picking: two unrelated same-genre mods exist under near-identical names — the real luavixen project was confirmed directly via Modrinth's API. | testing |
| Sodium/Embeddium Dynamic Lights | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/dynamiclights-reforged) | 1.0.10 (project 551736, file 6044481, 1.20.1 Forge) | Held/dropped glowing items light the world in real time; an Embeddium-aware fork, compatible with this pack's existing Embeddium install. Pure client visual QoL. | Requires Sodium/Embeddium Options API below. | testing |
| Sodium/Embeddium Options API | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/sodium-options-api) | 1.0.10 (project 1103431, file 6100812, 1.20.1 Forge) | Installed as Dynamic Lights Reforged's real dependency above — provides shared settings-screen plumbing Embeddium-family client mods hook into. No gameplay behavior of its own. | None found beyond forge/minecraft. | confirmed |
| Enhanced Hordes | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/enhanced-hordes) | 2.0 (project 899308, file 8362601, 1.20.1 Forge; author nojustgavin) | WWZ-style zombie stacking/climbing effect, applied unconditionally per direct instruction. Config is entirely `/gamerule`-based (`enhanced_hordes_config.js`): `hordeStacking` left default `true` (the wanted effect); `hordeMultiplying` (an autonomous "digs an extra zombie out of the ground" mechanic) deliberately disabled on server load, per this pack's standing caution against autonomous spawn systems layered on the hand-authored wave engine. | Decompile-verified zero conflict with Advanced Wall Climber API. Config shipped and sandbox-verified, but the actual stacking/climbing effect itself is not yet confirmed by a live playtest. | testing |
| Just Zoom | [Modrinth](https://modrinth.com/mod/just-zoom) | 2.1.1 (Modrinth id `iAiqcykM`, MC 1.20.1 Forge, client-only; author Keksuccino) | The real substitute for the originally-requested "Zoomify," which turned out to have no Forge build at all (Fabric/Quilt only). Default keybind is already Z, matching the Tips & Tricks quest chapter's zoom content. | Requires Konkrete below. One real, still-unresolved report of intermittent Z-key zoom failures, ruled out as Just-Zoom-specific — filed as a possible mixin/window-focus issue, not further diagnosed. | testing |
| Konkrete | [Modrinth](https://modrinth.com/mod/konkrete) | 1.8.0 (Modrinth id `J81TRJWm`, MC 1.20-1.20.1 Forge) | Hard dependency of Just Zoom, FancyMenu and Drippy Loading Screen (all Keksuccino). | FancyMenu/Drippy need `[1.6.1,)`, Just Zoom `[1.8.0,)`. Stays Modrinth-sourced: `packwiz curseforge add` for FancyMenu/Drippy offers to add a second, CurseForge-sourced Konkrete - answer **n**. | required |
| FancyMenu | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/fancymenu) | 3.9.12 (project 367706, file 8752289, 1.20.1 Forge) | Reskins the title screen, pause menu, world/server lists and world-loading screens from hand-written layouts in `pack/config/fancymenu/` (art generated by `tools/menu_art/`). | `side = "client"`. It can load on a dedicated server, but its server mixins send a packet per entity spawn/death and do a structure lookup per player tick, so `tools/sync_server.sh` excludes it. Singleplayer/LAN hosts still run those mixins in the integrated server. Needs Melody + Konkrete. Forge floor `[47.1.47,)`. | testing |
| Drippy Loading Screen | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/drippy-loading-screen) | 3.1.5 (project 511770, file 8552902, 1.20.1 Forge) | FancyMenu addon that makes the startup/resource-reload loading overlay customizable (night scene, ember bar, rotating tips). | `side = "client"` (client-only by design). Requires FancyMenu `[3.9.9,)` - upgrade/downgrade the two together. Cannot restyle Forge's native early-loading window. | testing |
| Melody | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/melody) | 1.0.3 (project 938643, file 5109692, MC 1.20.1-1.20.4) | Keksuccino's audio library, a hard dependency of FancyMenu. No behaviour of its own here (the menus are silent). | `side = "client"`; disables itself when loaded server-side. The jar's own mods.toml says 1.0.2 (upstream typo). | required |
| Xaero's World Map | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/xaeros-world-map) | 1.45.0 (project 317780, file 8698646, 1.20.1 Forge) | Companion to the already-installed Xaero's Minimap — full zoomed-out map view (waypoints, waystone markers). Directly replaced vanilla maps/filled maps in loot design, deliberately stripped as "redundant now that this does it better." Also the base for Xaero's World Border (already in this table). | Jar-in-jars its own XaeroLib dependency. One real packwiz gotcha already in this pack's history: a resolution pass once silently tried to switch this mod's source to Modrinth — caught and reverted, stays CurseForge-sourced. | confirmed |

## Removed mods

- **Create** (CurseForge, 6.0.8, 1.20.1 Forge) + **Create: Crafts &
  Additions** (CurseForge, 1.3.3, 1.20.1 Forge, hard-depends on Create) —
  Create added 2026-08-30 for the Schematicannon/base-expansion-into-
  rooms mechanic (never actually built - blocked on a player hand-
  exporting a `.nbt` schematic, "no coding session can produce
  headlessly"); Create Addition added alongside it for Barbed Wire, the
  Tier 1 defense item crafted from its Rolling Mill's iron wire. Both
  uninstalled entirely 2026-09-11, direct feedback: Barbed Wire felt
  redundant next to the new SecurityCraft trap roster
  ([[project_tier2_securitycraft_traps]]-adjacent decision). This also
  cut Create's other live use - the Tier 3 "Turn Up the Heat" Flamethrower
  Nozzle quest (`create:nozzle`/`create:encased_fan`), dropped with no
  replacement per direct instruction, plus the pre-placed Rolling Mill/
  Depot/Mechanical Press rig at the starting base
  (`playtest_starter_kit.js`). Create Addition's own Tesla Coil was
  installed but never wired into anything (Immersive Engineering's
  Tesla Coil was used instead, see that row above) - no loss there.
- **Advanced Tower Defense** (CurseForge, 3.7, 1.20.1 Forge) — added
  2026-09-08 (Track C) for Musket Sentry + Anvil Launcher, promoted to
  the Tier 2 gate 2026-09-09, removed entirely 2026-09-11 after direct
  feedback called the whole Turret Workbench chain "too convoluted" for
  this pack's frenetic pace. Real complexity, not a perception problem:
  a Blueprint item plus a 6-slot hardcoded assemble step at a dedicated
  Workbench block, gated behind a `tech_tablet_mechanics` unlock this
  pack had to build a front door for from scratch (the mod's own real
  recipe for it was JEI-display-only dead JSON, `matches()` hardcoded
  `false` - confirmed by decompile). Uninstalled outright (`packwiz
  remove advanced-tower-defense`, no packwiz-tracked dependents),
  `turret_combat_feedback.js` deleted with it (existed only for these
  two turrets' firing effects). Replaced by SecurityCraft's own ranged/
  proximity trap roster (Sentry, I.M.S., Trophy System, Cage Trap,
  Electrified Iron Fence, Bouncing Betty, Claymore) - one crafting-table
  recipe each, no workbench/blueprint/assembly step for any of them. See
  `securitycraft_traps.js` and `tier2_recipes.js`'s header.
- **Vacuum Blocks** (CurseForge, 1.20.1 build 2023-08-21) — added
  2026-09-08 as Trapcraft's Magnetic Chest replacement, removed
  2026-09-09 after direct feedback ("the vacuum chest thing") prompted a
  redecompile: every one of its 5 tiers' constructors never opts into
  random ticking, and its only item-pull logic (`randomTick()`-only) can
  therefore never run under vanilla rules — not just directionally
  fiddly as the earlier decompile pass concluded, genuinely dead code on
  every tier. Replaced with **Item Collectors** (see main table above).
- **Medieval Defense Turrets** (CurseForge, 1.1.4, 1.20.1 Forge) — added
  2026-08-31 for the Arrow Turret (Tier 2's first automated-defense
  item), removed 2026-09-09 after direct feedback named it too
  ("specifically the arrow turret and vacuum chest thing"). Uninstalled
  outright rather than left with a cut recipe: its only other content is
  a whole medieval-fantasy tech tree (catapults, knights, an orbital
  cannon, summonable soldier "tokens") that was never used and doesn't
  fit this pack's Fallout-wasteland theme. Replaced by promoting
  Advanced Tower Defense's Musket Sentry (already installed since Track
  C) into the actual Tier 2 gate.

- **Trapcraft** (CurseForge, 2.10.2, 1.20.1 Forge) — removed 2026-09-08,
  direct feedback: didn't like its traps, wanted the Magnetic Chest's
  mechanic kept but moved to a different mod. Full removal, not a
  partial trim: Spikes, Bear Trap, Igniter, Fan, and Magnetic Chest all
  gone. Replacements: Simply Traps + V01D's Bear Traps for the two Tier
  1 traps, Vacuum Blocks for the Magnetic Chest's role (see the new
  table rows above); Igniter and Fan were cut with no replacement (no
  real mod found for either, and both were thin content - one item-task
  quest each). Full writeup, including the real research trail (a
  user-supplied mod-research dump had 3 wrong claims, all caught by
  checking the real CurseForge files list before trusting the text) in
  FEATURES.md's "Trapcraft dropped entirely" entry.

- **YUNG's Better Desert Temples** + its hard dependency **YUNG's API**
  (CurseForge, 3.0.3 / 4.0.6, 1.20.1 Forge) — added 2026-08-30 for the
  desert-biome structure-generation plan, **removed the same day after
  a confirmed real crash, not a footprint decision.** World creation
  failed on every attempt: the live instance's `logs/latest.log` showed
  a repeating `ArrayIndexOutOfBoundsException: Index -1 out of bounds
  for length 24` inside the mod's own `QuartzPillarProcessor`
  (`com.yungnickyoung.minecraft.betterdeserttemples.world.processor`),
  which replaces a temple's quartz pillar with an 8-block sandstone
  column by walking straight down with no world-floor check — on this
  pack's genuinely flat/thin world, a temple piece can generate close
  enough to the floor for that walk to underflow past Y-min, and it did
  on the very first attempt, deterministically, blocking world creation
  entirely. Confirmed by reading the actual processor source
  (`YUNG-GANG/YUNGs-Better-Desert-Temples` GitHub, `1.20` branch), not
  guessed from the stack trace alone. No newer 1.20.1 build exists and
  no matching closed issue was found on the mod's own tracker, so this
  was a "cut it" call rather than a debug-a-third-party-mod's-worldgen
  attempt. Removed via `packwiz remove` from the tracked pack **and**
  deleted directly from the live CurseForge instance's `mods/` folder
  (packwiz doesn't auto-sync into a running instance) so world creation
  is unblocked immediately, not just fixed in the repo. See
  `docs/FEATURES.md`'s "Structure generation / exploration content"
  entry for the full detail — Treasure2 (the other structure mod added
  the same day) is still genuinely unconfirmed, since world creation
  never got past this crash to test it.

Footprint audit (2026-08-20) — user asked to remove anything installed
but not actually wired into any built system, tracking it here for
future plans/ideas rather than carrying the weight of an unused mod.
Cross-checked every mod against the actual KubeJS scripts (zero
references found for any of these) before removing, not just guessed:

- **SecurityCraft** — never integrated. Was meant to give base defense
  "real mechanical teeth" but nothing in the pack ever gave/referenced
  any of its items or directed the player toward it. Revisit if
  base-building ever gets its own dedicated defense layer beyond the
  worldborder + starter base. **Re-added 2026-08-29** — see the main
  mod table above and the "Chokepoint walls" entry under Custom glue
  below; this note stays for the removal history.
- **Mob Grinding Utils** — never integrated. Was meant to be the
  "payoff for surviving a wave" reward loop, but the loot bag system
  ended up filling that role instead. Revisit only if the loot bag
  system ever needs a farming/automation layer on top.
- **Scape And Spartans: Parasites Port** + its two hard dependencies
  (**Spartan Weaponry**, **Spartan Weaponry Addon Toolkit**) — never
  integrated. Nothing gives or references any of its weapons anywhere;
  `playtest_starter_kit.js` only ever gave the plain netherite sword.
  Revisit if weapon variety becomes a real design goal — note the
  parasites port's own CurseForge page had a past save-breaking update
  warning, worth rechecking before a future re-add.
- **The Pure Suffering Mod** — was already dormant (`enableInvasions
  false`, nothing calls `/puresuffering add`), kept installed
  specifically as a candidate to replace the custom wave engine later
  (see the Wave spawner sequencing discussion). Removed now per the
  "don't carry unused footprint" audit — re-adding is a single
  `packwiz` command if that direction gets picked up again, this isn't
  a decision that got harder to reverse by removing it.
- **Waystones + Balm — no longer removed, moved back to the main Mod
  List table 2026-09-16.** Original entry, kept for history only: this
  pack removed both 2026-08-20 as "never integrated... pure flavor-text
  framing around an otherwise-standalone mod." That stopped being true
  2026-09-05, when a direct ask wired a real pre-placed Waystone into
  the starter house plus two quests teaching it — nobody swept this
  section to match at the time, so it sat here describing a removal
  that had already been reversed for three weeks. See the main table's
  entry for the real current status and the real bug fixed along the
  way.
- **Oculus** + **Spooklementary (locally tuned)** — added 2026-08-20 for
  the "Atmosphere & Wave Feel" shader layer, tuned across eleven real
  rounds (version-incompatibility crash, a long brightness/shadow saga,
  isolating the fix to the shader's own single intended lever, removing
  real-time shadows once exposure alone couldn't fix pitch-black
  occlusion) — every individual fix was technically sound, but the
  user's actual verdict was about the shader's whole aesthetic, not any
  remaining number ("im just not feeling the whole shader feel now").
  Removed entirely the same day, replaced with vanilla's own
  `minecraft:darkness` status effect for the atmosphere piece instead —
  **that also didn't work, per direct playtest feedback, and was
  dropped the same day** (see the Wave-clear orchestration entry below).
  Fog was removed too, later the same day (see the YetGamer's Custom Fog
  entry below) — night-lock is the only atmosphere layer left standing.
  Revisit shaders only with a genuinely new signal from the user — this
  isn't an "unused, never integrated" removal like the others above,
  it's a "built, tuned extensively, and explicitly rejected on feel"
  one; don't re-propose a shaderpack here without that new signal.
- **Inventory Profiles Next** + its two hard dependencies **libIPN** and
  **Kotlin for Forge** (2026-08-29) — a stripped-down-prototype audit
  ("no extraneous code/config... based on the design premise, do it
  small first"). Different removal category than the others above: not
  unused (it worked, one-key inventory sort), but pure QoL with real,
  never-fully-resolved cost — a genuine swipe-gesture conflict with
  Mouse Tweaks (fixed via IPN config, but that fix was never confirmed
  in-game) and a separate green hover-highlight bug reported later that
  was still unresolved when this audit happened. Three mods total for
  one QoL feature, against the pack's own "keep footprint small, no
  200-mod kitchen-sink" guiding principle (`docs/ROADMAP.md`) and not
  load-bearing for the tower-defense premise itself. Mouse Tweaks alone
  still covers drag/scroll item movement. Revisit if inventory
  management becomes a real pain point without it — re-add is a
  single `packwiz` command away, no design decision got harder to
  reverse by cutting it now. libIPN did go with it for good. **Kotlin
  for Forge looked like the same kind of leftover during the 2026-09-16
  docs sweep (a systematic check of every "Removed mods" claim against
  the actual `pack/mods/` contents, the same check that caught the
  Waystones entry above) and was removed for real this time — that was
  a real mistake, caught before it shipped.** It was genuinely orphaned
  by this removal for about a week, but became a real, mandatory
  dependency again on 2026-09-06 when **Loot Beams: Refork** was
  installed for the legendary-jackpot loot beam colors: Loot Beams:
  Refork → Nirvana Library → Fzzy Config → Kotlin for Forge, the last
  link `mandatory = true` in Fzzy Config's own `mods.toml` (decompiled
  and confirmed directly, not assumed). Restored immediately once found
  — see the main Mod List table's entry for it, filed as `required`
  under that chain rather than removed.
- **YetGamer's Custom Fog** (2026-08-29) — direct request: "remove any
  visual effects work, like fog etc, and go back to basics." Removed
  along with everything it powered: `border_fog.js` (peacetime
  proximity fog), the wave-time combat fog and its reset, and Blood
  Moon's denser-fog lever and distinct title (Blood Moon's only two
  pieces, both fog-adjacent — removed entirely, wave 5+ is a plain
  repeat of wave 5 again). Same pass also reverted the worldborder wall
  texture back to vanilla's default (see the Fog Wall entry below).
  Night-lock (forced night + frozen daylight cycle during a wave) is
  kept — that's a gameplay necessity (undead mobs would burn on spawn
  otherwise), not a visual effect. Mob spawn-beyond-the-border and the
  `/spreadplayers` height corrections are also kept — those are spawn-
  position/gameplay fixes, not atmosphere. This closes out the entire
  "Atmosphere & Wave Feel" locked section from `docs/IDEAS.md` back to
  nothing — see that doc's own entries for the full eleven-plus-round
  history if this ever gets revisited.

None of these were hard blockers or bugs — all were clean removals of
mods sitting parallel to, not part of, the pack's actual built systems.

## Custom glue

- **Tier 1 machines — Spike Trap, Wooden Palisade, Simple Snare Trap
  (2026-08-29).** The pack's first custom-registered blocks: a themed
  fence (Palisade), a renamed vanilla cobweb (Snare Trap), and a
  hand-built degrading Spike Trap with its own blockstate. Replaced the
  same day by Trapcraft (see below), which was itself removed entirely
  2026-09-08 in favor of Simply Traps/V01D's Bear Traps (see Removed
  mods above) — none of these three custom blocks exist in the pack
  anymore. Full research trail (the block-registration API findings,
  the mod-replacement decompile check, the caltrop-shape modeling)
  archived in [docs/archive/mods-custom-glue-history.md](archive/mods-custom-glue-history.md).

- **FTB Quests — "Fortify," one quest telling the player traps exist
  (2026-08-29).** The very first FTB Quests content — one quest in a
  `tier1_machines.snbt` chapter pointing the player at the (then-new)
  Tier 1 machines, including a real server crash from a `#`-prefixed
  tag string in an item task. Long since superseded: the quest book was
  rebuilt into a single `campaign.snbt` (2026-09-03) and then a
  73-quest v3 structure (2026-09-09) — `basics.snbt`/`tier1_machines.snbt`
  no longer exist. Full authoring history (real SNBT field names, the
  crash's root cause, the auto-give-book research) archived in
  [docs/archive/mods-custom-glue-history.md](archive/mods-custom-glue-history.md).

- **Tier 1 replaced with Trapcraft (2026-08-29).** Deleted the custom
  Tier 1 blocks entirely and installed Trapcraft (Spikes, Bear Trap) as
  their replacement, with plain vanilla `oak_fence` standing in for the
  Palisade. Trapcraft was itself removed entirely 2026-09-08 (see
  Removed mods above) in favor of Simply Traps/V01D's Bear Traps —
  nothing from this entry is installed anymore. Full mod-selection
  reasoning and the recipe-by-recipe Tier 1 qualification check archived
  in [docs/archive/mods-custom-glue-history.md](archive/mods-custom-glue-history.md).

- **FTB Quests "Basics" chapter — 10-quest intro chain (2026-08-29)** —
  the original linear 10-quest starter chain (`basics.snbt`), folding
  "Fortify" in as step 7, plus a same-week flavor-text rewrite.
  Superseded along with the rest of that original chapter-file structure
  by the quest book rebuilds (single `campaign.snbt` 2026-09-03,
  73-quest v3 2026-09-09) — `basics.snbt` no longer exists. Full
  quest-by-quest detail and the cross-chapter-dependency research
  archived in [docs/archive/mods-custom-glue-history.md](archive/mods-custom-glue-history.md).

- **Structure generation: desert biome swap + Treasure2/YUNG's Better
  Desert Temples (2026-08-30)** — direct instruction, full plan drafted
  by the ideas-hub session (`docs/IDEAS.md`'s "Structure generation
  plan" at the time, since moved into `docs/FEATURES.md`'s "Base &
  structures" section as it crystallized into shipped content).
  - **Biome swap**: `kubejs/data/minecraft/dimension/overworld.json`'s
    `biome` changed from `minecraft:plains` to `minecraft:desert`,
    `type: minecraft:flat` and the `layers` array left untouched —
    exactly as specified, no unrequested changes (e.g. didn't swap the
    surface layer to sand even though that would match desert
    aesthetically better, since that wasn't part of what was asked).
    Genuinely different from the earlier Desert attempt this session
    (that one used a real `noise` generator and got reverted for
    feeling "wonky") — flatness and biome are independent settings in
    the same generator config.
  - **Why vanilla desert structures should still generate on a flat
    world, reasoned from the actual mechanism, not assumed**: checked
    the vanilla Superflat/Settings documentation directly. The flat
    generator's `features` boolean (already `false` in this pack's
    config) only suppresses decorative placed-features — its own
    documented text specifically calls out that this is unrelated to
    structures. Structure eligibility is controlled separately by
    `structure_overrides`, which **defaults to "all structure sets"
    when the key is absent** — and this pack's `overworld.json` has
    never set that key. So nothing in the existing config excludes
    vanilla (or modded) desert structures from attempting to place; the
    flat generator was never the blocker the plan worried it might be,
    at least not via this mechanism.
  - **The proposed "Superflat Structures" insurance mod doesn't
    actually exist for this version** — checked three real candidates
    (Superflat Structures, Superflat Features and Structures,
    FlatEdit+), all confirmed Forge-1.20.1-absent (NeoForge/1.21+
    only) directly against CurseForge's own files list. Compensated by
    decompiling each structure mod actually installed below and
    grepping for flat/superflat-specific disable logic in their own
    code, rather than leaving this as an unverified risk — arguably
    more certain than blind insurance would have been anyway.
  - **YUNG's Better Desert Temples** (`3.0.3`) + **YUNG's API**
    (`4.0.6`, its one hard dependency) — installed. Grepped the entire
    jar for "flat"/"superflat" and found nothing; it doesn't touch
    world generation type at all, only replaces vanilla's own Desert
    Temple structure pieces.
  - **Treasure2** (`4.0.5`) + **GottschCore** (`2.8.0`, its one hard
    dependency) — installed. Its own `data/treasure2/worldgen/structure/`
    JSONs were checked directly: `ruins/desert/ruins.json` and
    `well/desert/wishing_well.json` both use `biomes:
    "#treasure2:wells_desert"`, and that tag's own definition
    (`tags/worldgen/biome/wells_desert.json`) explicitly includes
    `"minecraft:desert"` (plus optional, gracefully-`required:false`
    hooks for Biomes O' Plenty/BWG desert biomes if those ever get
    installed). The general surface/dungeon structures
    (`surface/general.json`, `dungeon/general.json`) use `biomes:
    "#treasure2:terranean"`, which itself includes `#treasure2:wells_desert`
    — so those are eligible here too, not just the desert-specific
    ones. Real, confirmed treasure content for this specific world, not
    a hopeful guess.
  - **Abandoned Structures — checked, then deliberately NOT
    installed.** The brief's own confidence in this pick was
    conditional on the (turned-out-unavailable) Superflat Structures
    insurance mod, so it got extra scrutiny here rather than being
    installed on the original reasoning alone. Downloaded the real
    1.20.1 Forge jar and checked its own structure definitions
    directly: all 4 structures it adds (`gas_station`, `house1`,
    `house2`, `tower`) have hardcoded biome lists —
    plains/snowy_plains/sunflower_plains for the houses/tower,
    badlands/savanna/birch_forest/cherry_grove/crimson_forest/
    dark_forest/flower_forest/forest/old_growth_birch_forest/plains/taiga
    for the gas station. **`desert` appears in none of them.** In a
    world that's uniformly desert biome everywhere, none of this mod's
    content could ever place, full stop, regardless of any other
    setting. A confirmed, decisive disqualification found by checking
    the mod's own data — not a gap left for "maybe later," a real
    reason this specific mod doesn't fit this specific pack's world.
  - Deliberately still not picked, unchanged from the earlier
    exploration-mod research: **Repurposed Structures** (confirmed
    flat-generator conflict) and **Lost Cities** (ships its own
    world/chunk generator — the same risk category that already caused
    real problems with Oculus/shaders and the earlier noise-based
    Desert attempt).
  - Structure loot stays a separate channel from the mob-drop loot
    bags, per the pack's own standing "lootable buildings" decision —
    not re-litigated here. Both installed mods promise better-than-
    vanilla native loot by design, so no custom LootJS structure-loot
    injection was needed as a first pass.
  - **Not yet confirmed in-game at all** — this is a bigger unknown
    than most recent additions: whether vanilla structures actually
    place on this exact flat+desert combination has never been
    observed, only reasoned from documentation. First real test should
    specifically check for a desert temple, a desert well, and at least
    one Treasure2 structure within a reasonable exploration radius of
    spawn.

- **Atmosphere & Wave Feel (2026-08-20)** — the full shader/fog/
  darkness-effect/Blood Moon build-out for `docs/IDEAS.md`'s "Atmosphere
  & Wave Feel" section: Oculus + Spooklementary (eleven-plus rounds of
  brightness/shadow tuning), YetGamer's Custom Fog (wave-time and
  border-proximity fog), a worldborder texture override, a vanilla
  darkness-effect substitute, and a Blood Moon wave-5+ variant. Every
  piece was removed entirely by 2026-08-29 ("remove any visual effects
  work... go back to basics"); only night-lock (forced night during a
  wave) remains, and this is a closed decision — don't re-propose a
  shaderpack here without new signal from the user. Full round-by-round
  tuning saga (the real crash causes, the brightness-lever lessons)
  archived in [docs/archive/mods-custom-glue-history.md](archive/mods-custom-glue-history.md).

- **Wave-clear orchestration (2026-08-20)** — three `docs/IDEAS.md` ideas
  built together, since the doc itself pins down a real ordering
  requirement between them: wave-clear effects â†’ choice popup (blocking)
  â†’ player chooses â†’ starter-gear removal (wave 5 specifically) â†’
  countdown to next wave. All three reuse the wave-clear trigger point
  (`wave_status.js`'s `td_inWave` trueâ†’false transition) that base
  expansion and starter-gear removal already hooked into — now five
  things share it, exactly the "orchestration moment, not five
  independent hooks" the design doc flagged as worth treating deliberately
  once that many ideas converged on one trigger.
  - **Roguelike permanent buff choice.** `docs/IDEAS.md`'s planned mod for
    this, ScreenJS, checked directly and found dead — 1.19.2 only, last
    released April 2023. Searched for an actively-maintained alternative
    (per explicit request, not just defaulting to the fallback): the two
    closest hits, "KubeJS GUI Overhauled" and "KubeJS Studio," are a
    recipe-authoring tool and a developer IDE respectively — neither is a
    player-facing in-game menu, and neither confirmed 1.20.1 anyway. Built
    as a clickable `/tellraw` chat menu instead (`wave_status.js`) — three
    JSON text components, each with a `clickEvent` running
    `/tag @s add td_pick_<id>` as the clicking player. A second tick
    handler watches for these tags via `player.hasTag(...)` (a direct
    KubeJS entity method call, not a command — avoids the "commands run
    via `player.getServer()` have no `@s`" pitfall entirely for the
    read/clear side; the tag-setting `clickEvent` itself runs client-side
    as the player, so `@s` is valid there specifically). Three buffs,
    all real vanilla effects given permanently (`/effect give`'s own max
    duration, ~11.6 days): **Vitality** (`health_boost`, +2 hearts),
    **Fortitude** (`resistance`, less damage taken), **Ferocity**
    (`strength`, hit harder). Repeat picks stack via amplifier (tracked
    per-buff on player persistent data) rather than being wasted or drawn
    from a shrinking pool — "start small, scale later" per the design
    doc's own resolved note; real branching next-wave-composition choice
    (the doc's second, separate mechanic) wasn't built this pass.
  - **On-screen countdown timer.** 3-minute countdown starts once the
    choice above resolves, auto-triggering the next wave at zero. Display
    and auto-trigger deliberately live in `wave_spawner.js`, not
    `wave_status.js` (where the structurally-similar action-bar pattern
    this reuses actually lives) — auto-triggering means calling
    `useWaveHorn()` directly, and this codebase's `server_scripts` don't
    reliably share top-level functions across files, so `wave_status.js`
    only sets a `player.persistentData` flag (`td_countdownActive`/
    `td_countdownEndTick`), the same cross-file channel `td_inWave`
    already uses between three other files. Manual horn use always
    cancels a pending countdown (checked at the top of `useWaveHorn`) so
    an early right-click can't race against the auto-trigger and cause a
    double-fire — confirms the design doc's own "assumed but unconfirmed"
    note that the manual horn should still work as an early-trigger
    override, not get replaced by the timer.
  - **Boss wave tied to a Blood Moon event, built custom.** Checked real
    mods first — Enhanced Celestials (2.3M downloads, real Forge 1.20.1
    build) — but decided against adding one without first confirming it
    doesn't bring its own autonomous mob spawning, the same class of
    conflict TFTH and Pure Suffering both caused before their configs
    were hardened. Built custom instead, in `wave_spawner.js`: every wave
    from the designed campaign's end onward (`waveNumber >= WAVES.length`,
    the same threshold `wave_status.js`'s `FINAL_WAVE` caps display at and
    removes starter gear on) is a Blood Moon — a distinct "BLOOD MOON
    RISES" title and one denser fog lever (`MaxDistance` 32â†’24), no
    mob-count/stat changes, matching the design doc's own framing ("feels
    extra scary via atmosphere... rather than just a stat-scaling bump").
    Deliberately a single new lever, not a stack of them, per the lesson
    from this session's shader-tuning saga about compounding brightness/
    intensity changes without re-examining the total.
    - **Removed entirely, same day** ("remove any visual effects work,
      like fog etc, and go back to basics") — both of Blood Moon's
      pieces (the denser fog lever, the distinct title) were atmosphere,
      not mechanics; with fog gone this feature had nothing load-bearing
      left. Wave 5+ is back to a plain repeat of wave 5's composition,
      no special treatment.
  - **Darkness effect** (built earlier the same day as a shader
    replacement, then reverted the same day per direct playtest
    feedback) already covered under Atmosphere & Wave Feel above — not
    duplicated here, just noted as part of the same wave-clear-adjacent
    work.
  - The roguelike buff choice, countdown, and Blood Moon (this entry's
    actual three pieces) have not been re-tested in-game yet — the
    darkness-effect revert above is confirmed, the rest still isn't.
  - **Roguelike buff choice removed entirely, same day, per direct
    feedback** ("too buggy... make sure it doesn't block me from
    summaning a wave... next wave timer... simply not working"). The
    `/tellraw` chat-menu click detection (`player.hasTag(...)` watching
    for the tag a `clickEvent` set) never reliably resolved — flagged as
    the single biggest unconfirmed assumption in this feature when it
    was built, and it turned out to be the actual failure. Left
    `td_awaitingChoice` stuck `true` forever once a wave cleared, which
    silently blocked the Wave Horn from working again *and* blocked the
    countdown from ever starting (it only began once the choice
    resolved) — one bug, three reported symptoms. Removed the whole
    system (`BUFF_OPTIONS`, `sendChoicePrompt`, the tag-detection
    handler) from `wave_status.js` rather than debugging the click
    detection further, per explicit request. Starter-gear removal and
    the countdown both moved back to firing directly off the wave-clear
    edge, with no choice step gating either — `wave_spawner.js`'s
    matching `td_awaitingChoice` horn-block guard removed too. Fixed a
    missing closing brace introduced while removing the second tick
    handler (caught by `node --check`, not a manual read) before
    deploying. **Not yet re-tested — this is what should make the
    countdown timer actually work for the first time.**

- **Fixed spawn + prebuilt starting building (2026-08-20)** — the
  original fixed-world-spawn mechanism: `/setworldspawn` hardcoded to
  `(0, 0)`, later corrected to use `/spreadplayers` for real terrain,
  plus the matching mob-spawn-height and spawn-beyond-the-border fixes.
  Fully superseded 2026-09-09 by the anchor-grid base-placement rebuild
  (see `docs/FEATURES.md`'s "Anchor-grid base placement" entry and
  `playtest_starter_kit.js`'s own header comment) — spawn/base siting
  works nothing like this anymore. Full debugging history (the NaN/
  Rhino bugs this uncovered, the border-edge spawn fixes) archived in
  [docs/archive/mods-custom-glue-history.md](archive/mods-custom-glue-history.md).

- **World type switched from Superflat to Single Biome: Desert
  (2026-08-20)** — first attempt at non-flat terrain: a
  `minecraft:flat` generator with its biome swapped to desert, automated
  via a KubeJS dimension override, plus a wide sand-flatten pass around
  spawn — reverted to Superflat the same day ("terrain is wonky again").
  `docs/FEATURES.md`'s "World type" entry confirms this exact
  flat-plus-biome-swap mechanism "turned out not to work at all" and was
  rebuilt from scratch on the `noise` generator (see below, and the
  current curated multi_noise 7-biome setup). Full research and the
  mid-session syntax-error crash archived in
  [docs/archive/mods-custom-glue-history.md](archive/mods-custom-glue-history.md).

- **Watchtower — phase 1 of "expand the starter base into multiple
  buildings" (2026-08-20).** A custom-built cobblestone lookout tower
  placed behind the starter base, open on all sides so it could watch
  mobs spawning from any border edge. Removed entirely 2026-09-03
  (commit f289af7) once the base was rebuilt around a real placed
  structure ("we have a better starting structure") — nothing from this
  entry exists in the pack anymore. Full placement/design reasoning
  archived in [docs/archive/mods-custom-glue-history.md](archive/mods-custom-glue-history.md).

- **Chokepoint walls — starter base perimeter rebuilt from SecurityCraft
  reinforced blocks (2026-08-29).** Direct request, following on from
  `docs/IDEAS.md`'s "redesigned as a single chokepoint" addendum (a
  parallel session's concurrent edit, not this one's) which had already
  flagged that plain cobblestone walls would just get dug/pillared
  through by Epic Siege Mod's zombies. Built into
  `playtest_starter_kit.js`, replacing the previous 4 `/fill` wall
  calls with a per-block loop (SecurityCraft's `/fill`-friendly reinforced
  blocks don't support percentage-random material mixing any other way).
  - **Block IDs confirmed directly from the mod jar's own lang file**
    (`assets/securitycraft/lang/en_us.json`, extracted and grepped, not
    guessed or taken from the in-game guide book — the guide book and
    the lang file describe the same registry names, this was just the
    faster way to get them precisely): `securitycraft:reinforced_cobblestone`
    (primary, 83%), `securitycraft:reinforced_mossy_cobblestone` (12%),
    `securitycraft:reinforced_cracked_stone_bricks` (5%) — the mossy/
    cracked scatter matches the weathered-stone look from `docs/IDEAS.md`'s
    "Watchpost" concept ("mix in mossy/cracked variants for age").
    SecurityCraft ships a `reinforced_<vanilla name>` variant of nearly
    every vanilla block, confirmed by the same lang-file scan.
  - **Gate**: stayed a plain vanilla `oak_door` (unchanged from the
    original build) sitting in the wall's one opening, not
    SecurityCraft's own lockable Reinforced Door. Decided against the
    lockable door specifically because its owner/whitelist system exists
    to keep *other players* out, which a singleplayer pack has no use
    for, and because placing one via console `/setblock` has no
    real-player context to assign an owner from at all — a plain door
    in a reinforced frame gets the identical practical result (walls
    can't be dug/breached, the door is just an opening) for zero added
    complexity. This was the explicit "whichever is less complexity for
    the same result" call from the brief.
  - **Dig/pillar resistance — reasoned from decompiled bytecode of both
    mods, genuinely not the same as confirmed in-game, and the request
    was explicit that this distinction matters.** Downloaded and
    inspected both jars directly (`EpicSiegeMod-14.171.jar`,
    `[1.20.1] SecurityCraft v1.10.2.1.jar`) rather than trusting the old
    "should be fine" compat note from before SecurityCraft was even
    re-added:
    - Epic Siege's digging AI (`ESM_EntityAIDigging.class`) breaks
      blocks by spawning a real Forge `FakePlayer` (via
      `FakePlayerFactory.getMinecraft(...)`) and running it through the
      **standard block-breaking pipeline** —
      not a raw block-removal bypass. SecurityCraft's protection is an
      ownership check on that exact pipeline (confirmed separately:
      "to non-Owners, the block is unbreakable and explosion-proof").
      A FakePlayer can never be a wall's owner, so on paper this should
      block digging exactly like it blocks a real non-owner player.
      Creeper breaching should be blocked too, independent of
      ownership, since reinforced blocks are unconditionally
      explosion-proof.
    - **Under this pack's actual config, zombie is the only mob this
      even applies to** — `epicsiegemod-common.toml`'s `diggerMobs`,
      `buildingMobs` (pillaring), and `targetingMobs` all default to
      `["minecraft:zombie"]` only, nothing else in the wave roster has
      dig/pillar/block-targeting behavior at all. Matches the brief's
      own framing ("against this pack's real summoned zombies").
    - **NOT solved by any of this**: pillaring is the mob placing its
      *own* blocks outside the wall to climb over the top — a
      height/coverage problem, not a material one. This wall's height
      (3 blocks, unchanged from the original build) wasn't reconsidered
      here. A zombie could plausibly still get over the top even though
      it can no longer dig through or get blown through the sides.
    - **Bottom line: needs a real playtest to confirm, not assume** —
      the bytecode reasoning is much stronger evidence than the old
      pre-removal compat note ever had, but it's still reasoning, not
      an observed result. If a zombie gets through some way this
      analysis didn't predict, that's exactly the kind of finding worth
      recording here, not quietly patching around.
  - **Known follow-up, not yet done**: walls were placed via console
    `/setblock` (no player context), so they come out ownerless. This
    doesn't weaken mob resistance (mobs can never be an "owner" either
    way) but does mean the player themself can't casually break/modify
    their own walls later without SecurityCraft's
    `allow_breaking_non_owned_blocks` config option (confirmed as a
    real key via the mod jar's own bytecode strings, exact default
    unknown) enabled first. Unlike Epic Siege Mod and TFTH, no
    SecurityCraft config was hand-authored ahead of time — this project's
    established pattern is pulling real generated config files, not
    guessing their structure, and SecurityCraft has never actually run
    in this instance before now. **After the first real launch**, check
    `config/securitycraft-common.toml` (auto-generated on first world
    load) for this key and flip it to `true` if wall edits are ever
    wanted without switching to creative mode.

- **Wave status HUD** — `pack/kubejs/server_scripts/wave_status.js`.
  Action bar shows a live "Hostiles remaining: N" count, and chat announces
  "incoming!" / "defeated!" when the nearby hostile count rises from /
  falls to zero. Tracks all hostile mobs within 80 blocks, not
  specifically Pure Suffering invasion mobs — no confirmed way to
  distinguish "invasion mob" from "wandered in on its own" without
  deeper unverified work, so this answers "how much danger is near me"
  rather than a precise invasion-only count. Confirmed working across
  multiple playtests (see Wave spawner's debugging log below).

  **Unthrottled entity scan found in performance audit (2026-08-20)** —
  this tick handler was scanning the entire entity list every single
  tick (20x/second), all game long, regardless of whether a wave was
  even active — `mob_aggro.js` already throttles its own equivalent scan
  to every 10 ticks for the same reason, this one never got matching
  treatment. Throttled to every 4 ticks (5x/second) — still reads as
  instant for a HUD counter, cuts scan frequency 80%.

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
  reuses this same wave-clear detection edge (`td_inWave` trueâ†’false)
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
    everything else in this file.

  **Confirmed working (2026-08-19)** — verified with a temporary
  `GEAR_REMOVAL_WAVE` constant (`2`) swapped in for `FINAL_WAVE`, so it
  could be checked without a full 5-wave clear each time; kept as a
  separate constant rather than lowering `FINAL_WAVE` itself, since that
  one also drives the wave-number display cap and there are genuinely 5
  designed waves. Player confirmed "work perfectly." Reset to
  `FINAL_WAVE` (real wave 5) immediately after — same trigger logic,
  just the wave number it fires on.

  **`FINAL_WAVE` moved from `5` to `8` (2026-08-29)** when waves 6-8
  were added (see the Wave spawner entry below) — at the time, gear
  removal was gated directly on `waveNumber === FINAL_WAVE`, so this
  silently dragged the gear-removal narrative beat along with it.

  **Decoupled the same day, second fix**: direct pushback caught that
  `FINAL_WAVE` (campaign length, expected to keep changing) and "wave 5,
  permanently" are two different concepts that only shared a number by
  coincidence — bumping one shouldn't have moved the other. Added a
  separate `GEAR_REMOVAL_WAVE = 5` constant, independent of
  `FINAL_WAVE`, and the trigger now checks `waveNumber ===
  GEAR_REMOVAL_WAVE`. Also fixed the flavor text, which had "held the
  line for five waves" hardcoded as a literal string — it happened to
  still read correctly by coincidence once `FINAL_WAVE` drifted to 8,
  which is exactly how that class of bug hides until it doesn't; now
  interpolates `${GEAR_REMOVAL_WAVE}` instead.

  **Structured as a small, reusable "fixed wave event" pattern**, not a
  one-off fix — a `FIXED_WAVE_EVENTS` array of `{wave, flagKey, action}`
  entries, checked once in the existing wave-clear branch, rather than
  a bespoke `if (waveNumber === X && !flag)` block per event. Gear
  removal is currently the only entry; the array shape exists so a
  future fixed-wave beat (a wave 3 diary moment, a distinct wave 8
  finale, etc.) can slot in as data instead of needing its own
  hand-copied conditional. Not over-built beyond that — no scheduling,
  no priority ordering, just a list checked in order.

  **Not yet confirmed in-game** — specifically needs a playtest through
  wave 5 itself (not just to wave 8), since the original "gear removal
  stopped working" report actually had two independent candidate causes
  once investigated: this `FINAL_WAVE`/`GEAR_REMOVAL_WAVE` drift, and
  an already-fixed `td_awaitingChoice` deadlock left over from the
  removed roguelike choice-popup feature (see the Wave-clear
  orchestration entry below). Only an actual wave-5 clear tells you
  which one actually applied here.

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
     this double-processed every click (e.g. wave 1â†’2, 3â†’4). Fixed with
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
     `6.283185307179586` (2Ï€) instead of `Math.PI * 2`.

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

  **Waves 6-8 added (2026-08-29)**, direct request: "add some more
  waves ... scale accordingly ... keep the loot philosophy ... feel
  free to use some mob types from other mods that have been talked
  about." Rather than installing a new mob mod, drew from TFTH's own
  `germsStageMobList`/`awarenessStageMobList` entries that had never
  actually been used in any wave — TFTH is already integrated, already
  config-hardened (see below), zero new mod risk. Stats pulled directly
  from `TFTH.toml`'s per-mob `Attributes` lines
  (`MaxHealth|AttackDamage|Armor`), not guessed:
  - **Wave 6**: the wave 1-5 "trash" roster held at its wave-5 floor
    (zombie/skeleton/spider/wither_skeleton, 1 each — witch has since
    been removed, see the "Witches removed" entry below) plus
    `bruteplaquecreatureone` x1 ("Flesh Brute I", 45/4/5 — a tank
    archetype, nothing else in the roster has that health/armor
    combination with comparatively low attack).
  - **Wave 7**: same trash floor plus `flesh_hunter_two` x1 ("Flesh
    Hunter II", 45/6/4 — a balanced bruiser) and `flesh_boomer` x1
    ("Flesh Boomer", 20/0/0 — zero melee attack damage in its own
    attributes, presumably an explosion-based attack given the name;
    the starter base's walls are explosion-proof reinforced blocks
    regardless, see the Chokepoint walls entry above).
  - **Wave 8**: same trash floor, the ravager mini-boss returns
    (unchanged from its wave-5 nerf), plus `plaquethreelegcreature` x1
    ("Flesh Hysterizer", 55/7/4 — the tankiest of the four new
    additions), closing out the campaign.
  - **`flesh_howler` deliberately left out** — its own class
    (`FleshHowlerEntity$CallForHelpGoal.class`, confirmed by extracting
    and inspecting the actual TFTH jar) suggests it can summon
    reinforcements on its own, which would break this pack's
    deterministic per-wave mob count (the whole reason TFTH's own
    autonomous spawn systems were disabled in the first place). Not
    worth the unconfirmed risk when better-understood alternatives
    already covered the variety goal.
  - **Scaling followed the wave 5 rebalance precedent from earlier this
    same session** (12 mobs → 7, because "the dogpile of regular mobs
    stacked on hard hitters was the problem, not variety or
    toughness") — waves 6-8 total 6, 7, and 7 mobs respectively, in
    the same range as wave 5's 7, not a return to the old waves 2-4's
    12-14. Escalation comes from new tougher/varied unit types, not
    raw headcount.
  - **Loot tier**: all four new mobs went into `RARE_MOBS` in
    `loot_bag_drops.js`, continuing the pack's existing convention of
    tiering TFTH mobs by *which wave they're introduced in*, not by
    TFTH's own germ/awareness stage split (`bruteplaquecreatureone` is
    technically germ-stage per TFTH's own list despite fairly high
    stats — wave-number tiering already overrode TFTH's stage split
    for wave 4's `plaquecreaturetwo`, so this just continues that).
  - `wave_status.js`'s `HOSTILE_TYPES`, `mob_aggro.js`'s
    `WAVE_MOB_TYPES`, and `wave_spawner.js`'s own `WAVE_MOB_TYPES` were
    all updated to match (same four-file-sync pattern as every prior
    roster change). `wave_status.js`'s `FINAL_WAVE` moved from `5` to
    `8` (display cap only, as of a later fix the same day that
    decoupled it from starter gear removal — see the Starter gear
    removal entry above).
  - **Not yet confirmed in-game** — same caveat as every other roster
    change in this file until actually played.

  **Witches removed entirely (2026-08-29)** — direct request
  ("completely remove witches as a mob type"), no reason recorded.
  Witch was in waves 3-8 (introduced wave 3, carried forward as part of
  the "trash" floor through wave 8); every occurrence removed outright
  rather than backfilled with more of another mob — a clean removal,
  not a rebalance, so total mob counts per wave drop by exactly one
  where witch used to be. Removed from all four roster-tracking files
  (`WAVES`/`WAVE_MOB_TYPES` in `wave_spawner.js`, `HOSTILE_TYPES` in
  `wave_status.js`, `WAVE_MOB_TYPES` in `mob_aggro.js`, `UNCOMMON_MOBS`
  in `loot_bag_drops.js`) — same four-file-sync pattern as every prior
  roster change. Also logged as a standing design decision in
  `docs/IDEAS.md`'s "Mob roster exclusions" note, per direct request,
  so a future session doesn't reintroduce it without a new signal from
  the user. Epic Siege Mod's `witchPotions` config entry (which potions
  a witch throws) is now dead/unused config — left alone rather than
  removed, since it's a harmless default with nothing left to apply to.

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

- **Zombies dropping live TNT disabled, wave 5 scaled down (2026-08-29)**
  — direct playtest feedback: zombies (present from wave 1 onward, every
  wave) were dropping live TNT and it felt too OP that early. Root cause
  wasn't a KubeJS script at all — **Epic Siege Mod**'s own "demolition"
  behavior, auto-generated at
  `config/epicsiegemod-common.toml` (`[Advanced]` block) with
  `demolitionMobs = ["minecraft:zombie"]` by default (the mod's own
  comment: "List of mobs that can drop live TNT"). This config had never
  been tracked in `pack/config/` before — it only existed as a
  live-instance default. Fixed by setting `demolitionMobs = []` and
  tracking the full file at `pack/config/epicsiegemod-common.toml` (same
  pattern as `TFTH.toml`) so the fix ships with the pack. Left every
  other Epic Siege behavior (digging, pillaring, creeper breaching)
  untouched — the complaint was specifically about TNT, not the mod's
  broader siege AI.

  Also scaled down wave 5's composition in `wave_spawner.js`'s `WAVES`
  table — was `zombie x2, skeleton x2, spider x2, witch x2,
  wither_skeleton x2, ravager x1, flesh_suffer x1` (12 mobs total, the
  regular-mob dogpile stacked on top of two hard hitters). Halved every
  regular-mob count to `x1`, left `ravager` (mini boss) and
  `flesh_suffer` (25 attack damage, TFTH's hardest hitter per
  `TFTH.toml`) at their existing floor of 1 each, since they're the
  designed finale and weren't what was called out. New total: 7 mobs.

  **Follow-up (same day): the ravager itself was the actual OP part**,
  not the regular-mob dogpile the count-halving above addressed. Nerfed
  via the same Attributes-NBT override pattern already used for
  `generic.follow_range` on every mob's `/summon` in the pendingSpawns
  tick handler — added a ravager-only branch overriding
  `generic.attack_damage` (vanilla 12 → 8) and `generic.max_health`
  (vanilla 100 → 60, with a matching `Health:60` tag so it actually
  spawns at that reduced health rather than full). Every other mob's
  summon NBT is unchanged. `flesh_suffer` (25 attack damage) is
  untouched too — the report was specifically about the ravager.

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

- **Schematicannon / Create research (2026-08-30)** — two entries
  covering the Schematicannon base-expansion research: catching a
  broken "standalone Schematicannon" re-upload before it shipped,
  installing full Create instead, and confirming the Schematicannon's
  real material-gate and `.nbt`-file mechanics from decompiled source.
  Moot now — Create and Create: Crafts & Additions were uninstalled
  entirely 2026-09-11 (see Removed mods above) and the room-expansion
  feature was never built. Full decompile findings archived in
  [docs/archive/mods-custom-glue-history.md](archive/mods-custom-glue-history.md).

- **The amulet (2026-08-30)** — see FEATURES.md's "The amulet" section
  for the full mechanic and its "Build notes" for the specific API
  findings (Curios' slot-grant mechanism, KubeJS-Curios' real method
  signatures). Implementation split across `startup_scripts/amulet.js`
  (item + block registration, Curios capability attach),
  `server_scripts/amulet_pedestal.js` (recipe + place/retrieve
  interaction + marker entity spawn/despawn),
  `server_scripts/amulet_worn.js` (buff tick handler),
  `server_scripts/amulet_border.js` (worldborder push-back), plus edits
  to the existing `mob_aggro.js` (marker-entity targeting redirect) and
  `playtest_starter_kit.js` (starter-gear give/equip). Two hand-authored
  16x16 placeholder textures (a gold-chain-and-gem pendant, a stone
  plinth with a gold-ringed socket), same style as the pack's existing
  item icons. First time this pack has built a full accessory-slot
  integration — every non-obvious API detail (slot grants, capability
  builder methods, the `LivingEntity`-mixed `setEquippedCurio`/
  `findFirstCurio` helpers) was read from the mods' own GitHub source
  before being used, not guessed.

  **First real playtest immediately found the amulet missing entirely
  — genuinely lost, not just untested — and it took two fix attempts
  to actually resolve.** Diagnosed by parsing the live instance's own
  player `.dat` file directly (a small hand-written Node NBT reader,
  gzip + manual binary parse, since no Python was available) rather
  than guessing: `setEquippedCurio` had silently no-op'd, and
  `td_amuletWorn` was set `true` anyway with buffs applying for an item
  that didn't exist. **First attempt** — made the slot-size grant
  (`data/kubejs/curios/slots/necklace.json`) unambiguous
  (`SET`+`replace:true` instead of `ADD`) on the theory it was a
  load-order race. Didn't fix it — the user still saw only a single
  "head" slot in-game. **Real root cause, found by reading
  `CuriosEntityManager.java` directly**: Curios gates slot access with
  *two independent* mechanisms, and only one had been addressed. A
  `curios/slots/<id>.json` file defines a slot type's size; a
  *separate* `curios/entities/<id>.json` file has to explicitly grant
  which entity types may use which slot IDs at all —
  `getEntitySlots(type)` returns a flat empty map for any type with no
  matching entry, independent of any slot's own size. This pack had
  never shipped an entities file; the "head" slot visible in-game was
  coming from some other installed mod's own legacy Java registration,
  not from anything of ours. Added
  `data/kubejs/curios/entities/player.json` granting the player the
  `necklace` slot specifically (not `replace`, so "head" stays intact)
  — this is what actually fixed it. Also corrected this doc's earlier
  "Curios grants zero slots by default" claim: a slot type's own
  default size really is 1 (confirmed via
  `docs.illusivesoulworks.com`), the actual "zero by default" behavior
  lives in the entity-eligibility gate, not slot size.

  Separately, made the login give-logic verify the equip actually
  landed before trusting it, falling back to a plain inventory give —
  and checks "does the player already have one" on every login instead
  of a one-shot flag, so it self-heals any world/player that already
  hit the bug. All three fixed files were copied directly into the live
  CurseForge instance so each fix applied without a full pack
  re-export/re-import cycle.

  Still not yet confirmed in-game beyond this one fix — the rest of the
  feature (worn buffs actually tied to a real equipped item, pedestal,
  marker targeting, border push-back) hasn't been reached in a real
  playtest yet. This is the checkpoint the user asked to playtest
  before more work lands.

  **Shrine visual pass, same day, direct request** ("more of a shrine
  kind of thing... amulet looks like it's hovering above it"). Replaced
  the pedestal's plain full-cube/single-texture placeholder with a real
  custom block model — wide sandstone base + smaller raised dais,
  distinct side/top textures (carved masonry + gold inlay; a glowing
  gold socket ring) — and gave the marker armor stand `HandItems` so it
  visibly holds the amulet, floating just above the dais, instead of
  being purely invisible. `.fullBlock(false)` + a matching `.box()`
  hitbox added since it's no longer a full opaque cube. Recipe filler
  switched stone_bricks → sandstone to match. Block-model JSON is
  standard vanilla format (documented, stable since 1.8), not something
  needing mod-source verification the way the Curios integration did;
  the "Marker armor stands still render held items" behavior *was*
  checked against real sources first, since that one's a common enough
  point of confusion to get wrong. **Real caveat**: this changed the
  block's registration (model/hitbox), which only re-runs on a full
  game relaunch, unlike the KubeJS-Curios fixes above which just needed
  a world relog — flagged clearly to the user. Deployed directly to the
  live instance alongside the tracked commit, same as the other amulet
  fixes. Not yet seen in-game.

- **Quest book restructure: Tier 1 chapter (2026-08-30)** — split Tier 1
  out of the Basics chapter into its own `tier1_machines.snbt`
  ("Sharpened Scrap," "Something Crueler"), plus two new amulet-side
  quests added to `basics.snbt`. Superseded along with the rest of that
  chapter-file structure by the later quest book rebuilds (single
  `campaign.snbt` 2026-09-03, 73-quest v3 2026-09-09) — neither
  `tier1_machines.snbt` nor `basics.snbt` exists anymore. Full
  quest-ID/dependency detail archived in
  [docs/archive/mods-custom-glue-history.md](archive/mods-custom-glue-history.md).

- **World type rebuilt: `noise` generator replaces `flat` (2026-08-30)**
  — replaced the broken flat-plus-desert-biome override with a real
  `minecraft:noise` generator and a hand-verified `noise_settings` file
  using a `fixed` single-desert biome source. Itself superseded by a
  later move to a curated `multi_noise` 7-biome set (desert, badlands,
  savanna, savanna_plateau, plains, sunflower_plains, meadow) once
  desert temples were found generating unlootable — see
  `docs/FEATURES.md`'s "World type" entry for the current, live setup.
  Full noise_settings field-verification detail archived in
  [docs/archive/mods-custom-glue-history.md](archive/mods-custom-glue-history.md).

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
  (which Epic Siege's mobs can't break) to keep them escape-proof. Mob
  Grinding Utils was removed in the 2026-08-20 footprint audit, so this
  specific farm-escape scenario no longer applies, but the same
  reasoning is exactly what the 2026-08-29 chokepoint-wall build (see
  the Custom glue entry above) is actually built on now, for the
  starter base's perimeter instead of a farm.

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

**Never actually confirmed fixed, and it recurred (2026-08-20).** The
user reported the same "green fill on items when I hover them" symptom
again in a later session — the config above was already correctly set
to `false` in both the tracked pack and the live instance, so either
the required full relaunch never happened between the original fix and
this report, or the derived (not bytecode-confirmed) key names for
`highlight_focused_items`/`highlight_clicking_slot` weren't actually
the right ones after all — genuinely unresolved either way. **Moot now
— Inventory Profiles Next removed entirely** (see the Removed mods
section) as part of a "strip down the prototype" audit; this recurring,
never-fully-diagnosed bug was itself part of the case for cutting it
rather than chasing it a third time.

## Performance pass (2026-09-26)

Direct ask: "optimise it for performance, want it to be ultra slick in terms
of FPS." Measured, not guessed: a repeatable benchmark in the client sandbox
(`D:\mc-client-sandbox\bench\`, never the real instance) - a copy of the
sandbox world plus a `bench` datapack that keeps ~120 NoAI zombies/husks/
horde zombies 14-46 blocks in front of a fixed vantage point and kills 3 +
respawns 3 per second (peak turret kill load). A sandbox-only KubeJS client
script logs `fpsString`, live particles and the worst frame in the
FrameTimer ring once per second; 40 warm-up samples dropped, 70 used. Window
kept off-screen by `offscreen.ps1`; runs are only compared under identical
window conditions.

**Where the time was going (live instance, 2026-09-25 logs):** the game was
already on the GTX 1070 (not the Intel iGPU) and yesterday's session ran
waves 1-9 twice with zero "Can't keep up" warnings - the integrated server
was fine, the cost was on the render side. Hardware: i7-8750H, GTX 1070
Max-Q, 4K 60 Hz panel, 4 GB heap.

| Run | Avg FPS | Worst 10% | Min | Seconds with a >16.7 ms frame |
|---|---|---|---|---|
| Baseline, 1080p, player's settings | 138 | 108 | 91 | 77% |
| Pack changes below, 1080p | 188 | 158 | 141 | 24% |
| Pack changes, player's 4K + settings | 164 | 127 | 118 | 54% |
| Pack changes, 4K + lean video profile | 192 | 163 | 129 | 20% |

On a 60 Hz vsync panel the last column is the one that reads as "slick":
any frame over 16.7 ms is a visible hitch.

**Pack changes (shipped):**
- `config/mobdismemberment-client.toml` - `bloodCount` 100 -> 25. The single
  biggest cost: decompiled `ParticleBlood` lives 200-400 ticks with block
  collision, so 100 per kill kept ~1,500+ particles alive in the benchmark
  (thousands in a real wave), each re-lit every frame. Gibs untouched (they
  already despawn ~6 s after landing).
- `config/sodiumdynamiclights-client.toml` - `mode` REALTIME -> FAST
  (decompiled: REALTIME = 0 ms delay, relights + queues chunk rebuilds every
  frame a light moves; FAST = 250 ms). Not exercised by the benchmark.
- **ImmediatelyFast** added (row in the table above) - batches HUD/text/GUI
  drawing (Damage Numbers, Xaero, Jade).
- KubeJS: `world_state.js` caches the marker entity (`worldData()` was an
  uncached full-entity scan at ~35 call sites, 6 of them every tick);
  `mob_aggro.js` uses that cache instead of its own two scans;
  `lure_block.js`'s `nearestActiveLure` collects the lure list once per
  level per tick (it was a full scan PER WAVE MOB every 10 ticks - ~60 scans
  per pass, a ~50 ms server spike every half second in a 60-mob wave);
  `wave_spawner.js` only recounts live wave mobs when a spawn is actually due
  and trusts an at-cap count for 10 ticks (was a full scan every tick for
  most of a wave). A sandbox probe confirmed every cache hits in this Rhino
  build (`===` on wrapped Level objects works) and timed a full forEach scan
  at ~0.5 ms / 158 entities - so the ~20 remaining per-second scans in other
  handlers cost ~1-2% of a core and were deliberately left alone.

**Checked and left alone:** GC - `-Xlog:gc` in the 4K run showed young
pauses averaging 8 ms every ~3 s, no full GCs, live heap 575-700 MB of the 4
GB allowed; no JVM flag or heap change is worth it. ModernFix's default-off
options (load-time/memory only). Epic Siege/Enhanced Hordes/wave configs -
server tick had headroom, and they're gameplay. Radium/Embeddium/Entity
Culling configs - already sensible defaults.

**Mods evaluated and not added** (all checked against the live Modrinth API
and their real `mods.toml`): Chloride (its FPS comes from not rendering
entities past 64 blocks by default - wave mobs spawn 48-75 out, seeing them
coming is the game); Particle Core (culls off-screen particles, but async
ticking has an open crash report and blood is already cut 4x - revisit if
particles ever measure as a problem again); BadOptimizations (open issue
hiding player icons on Xaero's radar); AI Improvements (server-side, and the
server isn't the bottleneck); Dynamic FPS (only helps when alt-tabbed); More
Culling/Starlight/Exordium (no Forge 1.20.1 build or obsolete); Canary
(Radium declares it incompatible); Let Me Despawn (wave mobs are
PersistenceRequired, natural spawns stripped); Noisium (worldgen risk given
the custom noise settings); Immersive Optimization/No See No Tick (throttle
off-screen mobs = gameplay change). Entity Culling 1.11.x was skipped too -
three hotfixes in three days at the time.

**Player video settings (per-player, not shipped - `options.txt` isn't the
pack's to overwrite):** the lean profile measured above is particles
Decreased, entity shadows off, clouds Fast, render distance 10, simulation
distance 8, biome blend 1 - at 4K it took the worst-10% FPS from 127 to 163
and hitch-seconds from 54% to 20%. Keeping 4K costs little once those are
set (4K lean ~= 1080p lean). The user chose to keep their own settings
(2026-09-26); this is here for anyone who wants the extra headroom.
Simulation distance 8 (128 blocks) still covers every wave/horde spawn
(48-75 blocks), and the base area is forceloaded anyway.

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

## Patched jars (plain files in `pack/mods/`, no packwiz metafile)

Each replaces a packwiz metafile that was removed the same day. The
first two (2026-09-10) were made with `tools/patch_class_constants.py` from the exact jar the live
instance had installed, then javap-verified (constant pool shows the new
value, class still parses, entry counts match). Neither mod exposes the
value in any config - they were `private static final` constants
inlined into bytecode, confirmed by decompiling.

- `dyairdrop-1.1.0-1.20.1-beta-tdslowplane.jar` (Realistic Airdrop,
  CurseForge file 7689163): `net/mcreator/dyairdrop/procedures/
  PlaneticksProcedure.class`, Double 3.0 -> 1.0 - the plane's per-tick
  velocity (re-asserted every 5 ticks). The crate drop is keyed on
  distance flown (`dpassed == length`) and despawn on 2x the drop tick,
  so only the speed changes. Retune: rerun the tool with `D:1.0=<new>`.
  **Second patch to the same class, 2026-09-15** (direct ask: "make the
  plane take 10 secs"): despawn isn't purely "2x the drop tick" - it's
  whichever is SOONER of that or a second, hardcoded `timer >= 205`
  absolute cap, independent of `flytime`/`length`. A 10s (200-tick)
  flyover (`wave_airdrop.js`'s `WAVE_AIRDROP_LENGTH`) only leaves 5 ticks
  of slack under the stock 205 - real risk of the plane self-destructing
  before ever reaching its drop distance, no crate spawned at all.
  Raised the cap itself: Double 205.0 -> 250.0 in the same class (single,
  unambiguous constant-pool hit, javap-verified before/after, entry
  counts match). Retune together: `D:1.0=<new speed>
  D:250.0=<new cap>`, keeping the cap comfortably above whatever
  `WAVE_AIRDROP_LENGTH`/speed combination the drop tick works out to.
  **Third patch, 2026-09-22**: measured live in the sandbox (plane Pos
  sampled every 0.8s), the 1.0 constant nets 0.84 blocks/tick with drag,
  so the 200-block drop distance is reached at tick ~238 - only 12 ticks
  under the 250 cap. It worked every time, but that margin is one small
  speed nudge away from "no crate ever drops, nothing logged". Cap
  raised Double 250.0 -> 400.0 (patched from the already-patched jar,
  single hit, javap-verified, entry count unchanged); the plane now
  flies ~8s past the drop before despawning instead of ~0.5s. Retune
  spec from the ORIGINAL jar is now `D:3.0=1.0 D:205.0=400.0`; from this
  jar, `D:400.0=<new cap>`.
- `xaeroworldborder-1.0.0-tdthin.jar` (Modrinth vfOkGQEG):
  `dev/alazi/xaeroworldborder/client/map/WorldBorderElementRenderer.class`,
  Doubles 4.0 -> 2.0 and 2.0 -> 1.0 (outline / core line widths) and
  Integer -788582352 -> -799670273 (core colour 0xD0FF3030 red ->
  0xD055FFFF light blue, chosen 2026-09-10). The outline is the other
  Integer, -1879048192 (0x90000000); to recolour again patch from the
  ORIGINAL jar (Modrinth vfOkGQEG / z9DhUpQg) with
  `I:-788582352=<ARGB as signed int>` plus the two Double specs. The jar's `WorldBorderMapOverlay`
  class is never registered (dead code); leave it.
- `ImmersiveEngineering-1.20.1-10.2.0-183-tdcoilfilter.jar` (Immersive
  Engineering, CurseForge file 6206989), **2026-09-22 - a different kind
  of patch**: not a constant swap but a small bytecode edit made with
  `tools/patch_tesla_coil_targets.java` (ASM, compiled and run against
  the `org.ow2.asm` 9.8 jars Forge already ships in the server's
  `libraries/`; usage: `javac -cp asm.jar;asm-tree.jar` then `java ...
  PatchTeslaCoil <in.jar> <out.jar>`). `TeslaCoilBlockEntity`'s target
  predicate (`lambda$tickServer$1`) and its residual-field loop now skip
  players and SecurityCraft Sentries
  (`net.geforcemods.securitycraft.entity.sentry.Sentry`, matched by class
  name so the jar gains no hard reference to SecurityCraft) via a new
  `td$blocked(Entity)` helper - so no coil anywhere ever picks them,
  never fires a bolt at them, and never spends its 512 FE active-shock
  cost on them. The original jar is signed (`SIGNFILE.SF`/`.DSA` plus
  per-entry digests in a 1.2 MB manifest); a modified entry would fail
  digest verification, so the tool drops the two signature files and
  keeps only the manifest's main section (`Manifest-Version` +
  `MixinConfigs`). javap-verified (both methods read exactly as intended;
  entry count 8884 -> 8882 = the two signature files) and sandbox-booted
  (IE loads clean, a powered coil zaps a zombie in range on its normal
  32-tick cadence, a Sentry beside it is never picked). Redo against the
  new jar if IE is ever updated - the tool refuses to run if the lambda's
  shape has changed.

If any of these mods is updated, the patch has to be redone against the
new jar (the constant tool aborts unless each value matches exactly once). The
CurseForge app may re-download the original jar on a profile repair -
delete it again if a plain `dyairdrop-1.1.0-1.20.1-beta.jar` or
`xaeroworldborder-1.0.0.jar` reappears next to the patched one.

## Removed 2026-09-10: V01D's Bear Traps

`packwiz remove v01ds-bear-traps`, jar deleted from the live instance.
Only ever used for the Tier 1 "Something Crueler" quest and its
hand-written recipe; both were removed on direct feedback ("not great",
"remove them, no replacement"). Simply Traps stays (Spike Trap, Stake
Wall); its Slime Trap block is still registered but has no recipe and no
quest. Worlds that still contain a placed bear trap get Forge's one-time
"missing registry entries" prompt and the block becomes air.
