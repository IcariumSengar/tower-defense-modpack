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
| SecurityCraft | [CurseForge](https://www.curseforge.com/minecraft/mc-mods/security-craft) | 1.10.2.1 (1.20.1 Forge) | Re-added 2026-08-29 to build the starting base's perimeter walls from reinforced (undiggable, explosion-proof) blocks — see the "Chokepoint walls" entry under Custom glue below for the full build and the dig/pillar-resistance reasoning | Removed 2026-08-20 (footprint audit, never integrated at the time), re-added same as TFTH was — this time actually wired into a built system, not just installed | testing |

## Removed mods

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
- **Waystones** + its hard dependency **Balm** — never integrated.
  Was a deliberate inclusion ("get back to base before nightfall"
  framing) but nothing mechanical ever tied it to the wave loop — pure
  flavor-text framing around an otherwise-standalone mod. Revisit if
  the base-relocation/travel angle becomes an actual designed mechanic
  rather than just flavor.
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
  reverse by cutting it now.
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
  (2026-08-29)** — `docs/IDEAS.md`'s Machine Progression "Recommended
  next step" brief: no machines existed anywhere in the pack before
  this, despite being the actual "loot → craft machines → survive" loop
  the pack is named for. Built in the requested easiest-first order.
  **First time this pack has registered a custom block** — every prior
  piece of custom content (loot bags, Wave Horn) was an item. Researched
  KubeJS's real 1.20.1 block-registration API directly before writing
  anything (`.textureAll()`/`.texture()` reuse existing vanilla textures
  with zero new art needed, built-in block *types* like `fence` give
  real vanilla behavior for free, `Java.loadClass(...)` reaches
  arbitrary Minecraft/Forge classes for a custom blockstate property) —
  same "verify the mechanism, don't guess" discipline this pack has
  needed repeatedly (`/spreadplayers` on mobs, IPN's config keys, the
  worldborder blocking assumption).
  - **Wooden Palisade** (`startup_scripts/machines.js`) — KubeJS's
    built-in `fence` block type, textured with oak_log's own texture
    (not planks, for a "raw stakes" look) rather than reused vanilla
    `oak_fence` directly, so it has its own identity for future Tier
    1/2 balance work ("degrades from overuse" per the design notes).
    Gets real vanilla fence pathing-blocking/connecting behavior with
    zero custom logic — the lowest-risk piece, matching the brief's own
    assessment. Recipe: 4 oak_log + 2 cobblestone → 6
    (`server_scripts/machine_recipes.js`), both Common-tier
    (`loot_bag_open.js`'s two highest-weight rolls).
  - **Simple Snare Trap** — not a new block. The brief's own hedge
    ("check whether reskinned cobweb behavior gets most of the way
    there before building custom collision detection from scratch")
    resolved to: don't reskin it at all, just craft real vanilla
    `minecraft:cobweb` from string (4 string → 1), with a custom
    display name ("Snare Trap") via `Item.of(id, count, nbt)` recipe
    output NBT — the same technique already used for the starter gear's
    Lore line in `playtest_starter_kit.js`. Guarantees cobweb's actual
    slow/walk-through behavior exactly, zero risk of a reskinned
    version behaving subtly differently.
  - **Spike Trap** (`startup_scripts/machines.js`) — the genuinely
    novel piece, exactly as the brief predicted. Every other stateful
    mechanic in this pack lives on player `persistentData`; a block
    needing its *own* state (hit count, broken/intact) is new territory.
    Custom blockstate property `hits` (0-3) added via
    `IntegerProperty.create('hits', 0, 3)` (Java interop, not a KubeJS-
    specific helper). **Deliberately avoided reading that property's
    current value from script code at all** — genuinely unconfirmed
    whether/how that's possible in this KubeJS version, and the whole
    feature doesn't actually need it: the degrade sequence runs as a
    chain of `execute if block <pos> kubejs:spike_trap[hits=N] run
    setblock <pos> kubejs:spike_trap[hits=N+1]` commands (one per
    threshold, breaking the block entirely on the 4th hit) — standard
    vanilla conditional-command syntax, only one command in the chain
    can ever match the block's true state, so running all of them every
    trigger is harmless. Recipe: 2 iron_nugget + 6 cobblestone → 4 (the
    brief also suggested bone; iron_nugget alone made a clean "metal
    spikes" theme, bone left open for a future machine).

    **Trigger detection rebuilt (2026-08-29)** — direct pushback after
    the first writeup: "obviously it is meant to kill/harm mobs, is the
    design doc not clear enough?" The doc (`docs/IDEAS.md`'s Machine
    Progression list — Palisade "shape enemy pathing," Snare Trap
    "slow/briefly hold," Spike Traps right alongside them) was never
    ambiguous; the original implementation genuinely only checked the
    player (`PlayerEvents.tick` polling `player.getX/Y/Z()` against the
    block under their feet) — an implementation gap, not a docs
    problem. Rebuilt using a real KubeJS mechanism instead of a tick
    poll: `BlockBuilder` has a `.steppedOn(callback)` method ("Set what
    happens when an entity steps on the block" — confirmed by
    extracting and reading `BlockBuilder.class` directly out of the
    installed KubeJS jar, not assumed), chained onto the same builder
    that creates the block. It fires for *any* entity — player or mob —
    that steps on this specific block, with zero separate block-ID
    check needed since the callback is registered on the block itself.
    Old `server_scripts/spike_trap.js` deleted; everything now lives in
    `startup_scripts/machines.js`'s block registration.
    - **Per-trigger cooldown tracks BLOCK POSITION, not entity
      identity** — deliberate, not a shortcut. KubeJS's own
      `persistentData` is confirmed players/levels/servers only (its
      own wiki: kubejs.com/wiki/tips/persistent-data), not available on
      a generic mob; reliably telling "is this the same specific mob as
      last tick" apart from another of the same type standing nearby
      would need an entity UUID accessor never used or confirmed
      anywhere in this pack. A plain module-scope object keyed by
      `"x,y,z"` (same persists-for-the-server-session pattern already
      proven by `wave_spawner.js`'s `pendingSpawns` array) sidesteps
      that with only already-proven techniques. Tradeoff: two different
      entities stepping on the same trap within the same second only
      count as one trigger — a reasonable read for a trap that just
      went off, not a real gap.
    - Guards on `!entity.getServer()` (returns `null` client-side, since
      only the server has a `MinecraftServer`) rather than checking
      `level.isClientSide` — merely *accessing* that property is
      confirmed elsewhere in this pack to throw a `NullPointerException`
      outright, independent of how it's used.
    - Uses `var`, not `const`/`let`, inside the callback body — a
      never-before-used-in-this-pack callback type, and
      `ItemEvents.rightClicked`/`BlockEvents.rightClicked` both threw
      `"redeclaration of var X"` with block-scoped declarations on
      repeat invocations elsewhere in this pack. `var` until this
      callback type is specifically proven safe otherwise.
  - **Not confirmed in-game for any of the three.** Palisade is the
    safest bet (built-in vanilla block type, real behavior). Spike Trap
    is the least certain piece — specifically worth checking: the
    `IntegerProperty` blockstate actually registers and defaults to
    `hits=0` on placement (not assumed, KubeJS didn't document an
    explicit default-state setter), the `/execute if block` chain
    correctly advances/breaks the block across real hits, `.steppedOn`
    actually fires for a mob (not just the player, the entire point of
    this rebuild), and that it doesn't fire a second time client-side
    in some way the `getServer()` null-check doesn't catch.

- **Atmosphere & Wave Feel (2026-08-20)** — the `docs/IDEAS.md`
  "Atmosphere & Wave Feel" (locked) section, built out in full the same
  day it was picked up.
  - **Shader pack**: **Oculus** (Iris-for-Forge loader) + **Spooklementary**
    (shader pack) — see the mod table entries above for the comparison
    against Hysteria Shaders and Gravemist. Just "installed and
    loadable" — shaders have no live scriptable API, so none of the
    day/night contrast logic runs through the shader itself.
  - **Day/night density contrast**: solved a different way than the
    design doc assumed. `docs/IDEAS.md` named Foggy Border and Fog
    (IMB11) for the fog-wall/ambient-fog layers — **neither has any
    Forge build, confirmed directly via Modrinth's version API** (not
    search-engine summaries, which were actively misleading for Foggy
    Border specifically — claimed "available for 1.20.1" with no loader
    caveat, when the real data shows Fabric-only, full stop). Found
    **YetGamer's Custom Fog** instead — real Forge 1.20.1 build, no
    dependencies, ships a genuine `/fog` runtime command. `wave_spawner.js`'s
    `useWaveHorn` now sets dense/close/desaturated fog
    (`fog @a set 8 32 25 25 30 0.3 cylinder`) alongside the existing
    night lock; `wave_status.js`'s wave-cleared branch resets it
    (`fog @a reset`) alongside the existing day restore — same pairing,
    same trigger points, one new command each side. Honest limit: this
    fog is always player-relative, not tied to a fixed world coordinate,
    so it delivers the "close and oppressive during a wave, pulls back
    when safe" tension the design doc actually wants, not a fog wall
    literally rendered at the worldborder's position — no Forge 1.20.1
    mod found can do that.
  - **Staggered emergence + sound-first cues** (`wave_spawner.js`):
    `docs/IDEAS.md` claimed staggered emergence already existed via
    "delayed/scheduled spawns" — checked directly, it didn't; every mob
    in a wave summoned synchronously in one loop. Built as a
    `pendingSpawns` queue processed by a new `PlayerEvents.tick` handler
    (same pattern already proven reliable in `wave_status.js`/
    `mob_aggro.js`, not a new scheduling API) — each queued mob gets a
    spawn tick and a sound-cue tick (`SOUND_LEAD_TICKS = 12`, ~0.6s)
    ahead of it, played via positioned `/playsound` (not
    `player.playSound()`, which is player-relative and wouldn't be
    positioned where the mob is about to appear) using
    `minecraft:ambient.cave` — a generic eerie one-shot, not per-mob,
    since TFTH's own sound event registry names weren't verified.
    **Escalation lever**: the gap between each mob's emergence
    (`staggerGapForWave`) shrinks from 16 ticks at wave 1 down to a
    4-tick floor by wave 5, so early waves stay readable and late waves
    collapse into the "false security" wave-dump the Balance Philosophy
    section describes. Also fixed a real edge case this introduced: the
    horn's re-use guard now also checks `pendingSpawns.length > 0`, not
    just nearby-mob-count — without that, spam-clicking the horn during
    the staggered emergence window could queue a second wave on top of
    the first before any of its mobs actually existed yet to be counted.
  - **Not built**: silhouette-first (the design doc calls this "mostly a
    function of fog density," which is now in place via the /fog
    command above, so likely already partially achieved without
    dedicated code — not separately verified).

  **First real relaunch, three issues found (2026-08-20)**:
  1. **Shader wasn't guaranteed to be active by default.** `enableShaders`/
     `shaderPack` in Iris/Oculus's `config/oculus.properties` weren't
     pinned by the pack — left to whatever Oculus does on first launch
     with exactly one shaderpack present (it did end up active, but
     nothing guaranteed that for a fresh install). Fixed by tracking
     `pack/config/oculus.properties` with `shaderPack=Spooklementary_v2.0.4.zip`
     and `enableShaders=true` baked in, same pattern as the other
     pre-seeded configs in this pack.
  2. **Too dark during the day.** First pass checked Spooklementary's
     shader source and found the day-specific intensity sliders
     (`LIGHT_MORNING_I`, `ATM_MORNING_I`, `LIGHT_NOON_I`, `ATM_NOON_I`,
     default neutral `1.00`) and bumped them to `1.60` via a settings
     override — user reported still dark after relaunch. **Real root
     cause found in `logs/latest.log` (2026-08-20)**: v2.0.4 throws
     `java.lang.RuntimeException: Unknown variable: BIOME_PALE_GARDEN`
     during `IrisRenderingPipeline`/`CustomUniforms` creation (recurred
     4x in one session) — `BIOME_PALE_GARDEN` doesn't exist until MC
     1.21.4, so this pack's 1.20.1 biome registry can't resolve it,
     and the custom-uniforms pipeline (which computes the shader's
     lighting/atmosphere values) fails to fully initialize. No amount of
     slider tuning fixes a pipeline throwing on startup. **Downgraded to
     Spooklementary v1.1** (Oct 2023, predates the Pale Garden biome
     entirely — confirmed via source, zero `BIOME_PALE_GARDEN`
     references) — pipeline confirmed clean after this (no more crash in
     `logs/latest.log`).

     **Still reported too dark after that (2026-08-20), confirmed during
     the peaceful daytime gap specifically, not misattributed to the
     intentionally-dark wave-time fog** — ruled that out directly with
     the user before doing anything else. The per-shaderpack settings
     override file (`shaderpacks/<name>.txt`, the standard Iris
     mechanism — an exported/imported `.txt` sitting next to the
     shaderpack zip) couldn't be confirmed as actually auto-loading on
     startup after two rounds of tuning through it; Iris's own docs only
     confirm an explicit in-game Import button, not automatic loading,
     and no independent evidence turned up that it also loads
     automatically. Rather than keep guessing at an unconfirmed
     mechanism, **switched to editing the shader's own `.glsl` defaults
     directly** — these are unconditionally read on every shader load,
     no external-file dependency to doubt. Extracted v1.1, changed
     `LIGHT_MORNING_I`/`ATM_MORNING_I`/`LIGHT_NOON_I`/`ATM_NOON_I` from
     `1.00` to their defined maximum `2.00`, applied `profile.LOW`'s
     quality values the same way, repackaged as
     `Spooklementary_TDM_tuned.zip`. This is no longer a byte-identical
     upstream download — tracked as a real file in `pack/shaderpacks/`
     instead of a `.pw.toml` pointing at a Modrinth URL, since the url+hash
     pairing packwiz relies on can't describe a locally-modified file.
     The old `shaderpacks/Spooklementary_1.1.txt` override and
     `spooklementary.pw.toml` metadata are both removed — superseded by
     the baked-in defaults.
  3. **Worldborder still renders as vanilla's blue line/red vignette,
     not fog.** No Forge 1.20.1 *mod* exists for this — checked four
     candidates across Modrinth's API directly: Foggy Border
     (Fabric-only), Fog by IMB11 (Fabric/NeoForge-only, 1.21+ anyway),
     **Worldborder Tweaks** (its own description offers exactly this —
     "hide the worldborder barrier" — but Fabric-only, no Forge build
     for any MC version), **No Worldborder Tint** (does have Forge
     builds, but only removes the red vignette tint, not the barrier
     texture, and even that mod's Forge support skips straight from
     1.8.9 to 1.20.6 — no 1.20.1 build).

     **Solved a different way (2026-08-20): a resource pack texture
     override, not a mod.** The border's rendered wall is just a plain
     16x16 texture, `assets/minecraft/textures/misc/forcefield.png`
     (confirmed by extracting it from the actual vanilla 1.20.1 client
     jar) — grayscale, tinted blue/green/red by game code for
     stationary/expanding/shrinking border state. That tint color isn't
     resource-pack-overridable (it's a Java-side color multiply), but
     the *pattern* is just pixels, and vanilla's own pattern is a sharp
     diagonal-stripe grid — the actual source of "jarring," not the blue
     tint itself. Replaced it with a soft, smoothly-interpolated
     cloud-like alpha pattern (`kubejs/assets/minecraft/textures/misc/forcefield.png`,
     same KubeJS resource-pack-injection mechanism already used for the
     Wave Horn and loot bag textures, just targeting the `minecraft`
     namespace this time to override vanilla instead of adding new
     content) — same tinting behavior, but reads as drifting mist
     instead of a sci-fi forcefield grid. Not literally volumetric fog
     rendered at the border's world position, and the texture alone
     wasn't a strong enough effect on its own for what the user actually
     wanted.

     **Real fix (2026-08-20): `pack/kubejs/server_scripts/border_fog.js`.**
     A texture is still just a flat wall — it can't get denser as the
     player approaches the way actual atmospheric fog does. But
     YetGamer's Custom Fog's `/fog` command *is* real, scriptable,
     distance-based fog, and we already control it. New script runs on a
     5-tick throttle, computes the player's actual distance to the
     nearest worldborder edge (`level.getWorldBorder()`, same accessor
     `wave_spawner.js` already uses for spawn clamping — border treated
     as a square, matching vanilla's real shape, not a circle), and
     scales the fog's `MaxDistance` continuously from `200` (barely
     noticeable near the center) down to `20` (thick, close) as the
     player nears the last 40 blocks before the edge — a genuine "the
     world fogs up as you approach the boundary" effect, not a static
     look. Deliberately does nothing while a wave is active
     (`td_inWave`) so it never fights `wave_spawner.js`'s already-tuned
     combat fog for control of the same command — resets its own change
     -detection cache every in-wave tick so the first peacetime tick
     after a wave clears always re-applies fresh rather than skipping
     because the computed value happens to match a stale cache from
     before the wave. This is the piece that actually delivers "look
     like actual fog" — the texture override above is a smaller,
     complementary improvement to the wall's static appearance, not the
     primary fix.
  4. **Still "far too dark" on both day AND night (2026-08-20)** — this
     changed the diagnosis. The day-specific sliders were already maxed
     at their defined ceiling (`2.00`) and guaranteed to apply (baked
     directly into the `.glsl`), so if day was still dark, those sliders
     were never the dominant factor — and "night too dark" ruled out the
     day/night-specific atmosphere multipliers entirely, since none of
     them were touched for night. Found the real lever: `T_EXPOSURE`
     (`shaders/lib/common.glsl`), labeled directly in the shader's own
     `en_US.lang` file as **"General Brightness"** — "adjusts the
     overall brightness of the whole image," day/night-agnostic. Default
     `1.40`; v1.1 uses this name where v2.0.4 used `TM_EXPOSURE`, which
     is exactly why earlier searches for the v2.0.4 variable name missed
     it in v1.1's source. Bumped to `2.60` (near its defined max `2.80`)
     plus `AMBIENT_MULT` (ambient light, also day/night-agnostic) `100`
     â†’ `170`, both baked directly into `Spooklementary_TDM_tuned.zip`
     alongside the earlier fixes.
  5. **Fog command was spamming chat** — YetGamer's Custom Fog prints
     its own confirmation message on every `/fog` call by default; fine
     for one manual command, but `border_fog.js` calls it up to
     4x/second while the player moves near the border. The mod's own
     documentation ties this to vanilla's `sendCommandFeedback`
     gamerule — silenced via `ServerEvents.loaded` in `border_fog.js`
     (fires once per server start regardless of save, unlike
     `playtest_starter_kit.js`'s first-join-only gate, so it takes
     effect on the next relaunch even for an already-started save).
     Harmless for every other command in this pack too, since they're
     all run via `runCommandSilent` and never relied on seeing vanilla
     feedback.
  6. **Day confirmed fixed (2026-08-20) — but shadows far too dark and
     night still way too dark.** Two more, more specific findings:
     - **Shadows**: the shader's own `.lang` file directly warns that
       `SHADOW_QUALITY`'s lowest tier ("Very Low", `0` — what the
       performance pass had set it to) "significantly downgrades
       shadows in multiple ways," not just resolution. Raised one tier
       to `1` ("Low") — a real, documented tradeoff between the
       performance ask and the shadow-harshness complaint, not a free
       fix. Also raised `MINIMUM_LIGHT_MODE` ("Cave Lighting" per its
       `.lang` entry — fill light for shadow-starved/no-skylight areas)
       from `2` (Default, which the shader's own comment says defers to
       the player's personal in-game Brightness slider) to `4` ("Very
       Bright") so shadow relief doesn't depend on a setting the pack
       can't control.
     - **Night**: `LIGHT_NIGHT_I`/`ATM_NIGHT_I` had been deliberately
       left untouched through every previous round, on the assumption
       night should stay moody by design. Two explicit "too dark"
       reports specifically calling out night (not just day) made clear
       that assumption was wrong — bumped both to their defined max
       `2.00`, same as morning/noon.
     All three baked into `Spooklementary_TDM_tuned.zip` alongside the
     earlier fixes.
  7. **Overcorrected — "shadow is like a bright white light"
     (2026-08-20).** Multiple brightness boosts got stacked across
     rounds 4-6 without ever pulling any back once a new one got added.
     Pulled back the two most directly tied to *shadow* brightness
     specifically (as opposed to overall scene exposure, which is
     `T_EXPOSURE` and confirmed correct for day — left alone):
     `AMBIENT_MULT` (ambient fill light, which by definition reaches
     areas not hit by direct light — i.e. shadows) `170` â†’ `110`, and
     `MINIMUM_LIGHT_MODE` (added in round 6 at its most aggressive tier
     the same round this broke) `4` â†’ `3`. Both still baked into
     `Spooklementary_TDM_tuned.zip`.

  **Lesson for this specific shader-tuning saga**: stop pushing
  individual sliders further without reconsidering earlier ones in the
  same pass — the "still dark" â†’ "now too bright" whiplash across
  rounds 4-7 came from treating each report as isolated instead of
  looking at the cumulative effect of every change made so far.

  8. **Stopped guessing, pulled real reference values (2026-08-20)** —
     user's explicit push after round 7's whiplash: "look at other
     modpacks' shader settings and get it right" rather than continuing
     to hand-tune blind. Two real findings, not more guessing:
     - Base Complementary Shaders (the engine Spooklementary re-skins)
       uses different variable names/scales entirely depending on
       branch (`TONEMAP_EXPOSURE=5.6` in one official repo, a
       completely different numeric scale than Spooklementary's
       `T_EXPOSURE` 0.4â€“2.8 range) — confirms these can't be copied
       across shader forks directly, only within the exact fork being
       used.
     - Found genuine, shader-specific community guidance instead:
       **"disable real-time shadows, since the sky is so cloudy with
       this shader that shadows can look a bit odd and out of place."**
       Not generic advice — specific to Spooklementary's own foggy
       aesthetic, and directly explains why shadow-quality tuning kept
       fighting itself across rounds 6-7. Disabled `REALTIME_SHADOWS`
       entirely (a single toggle the shader's own docs confirm cleanly
       cascades — "will stop other shadow options from doing anything"
       — costs nothing since `LIGHTSHAFT_QUALI_DEFINE` was already `0`)
       rather than continuing to tune `SHADOW_QUALITY` up and down.
       Also found a community-sourced reference pair for Complementary's
       tonemap curve (`Lower:1.3, Upper:1.5`) specifically for
       brightening dark/shadowed areas without blowing out highlights —
       applied directly (`T_LOWER_CURVE` `1.20`â†’`1.30`,
       `T_UPPER_CURVE` `1.30`â†’`1.50`), real numbers from an actual
       guide, not another blind guess.

  9. **Round 8 made it worse, not better — "absolutely garbage...
     shadows are bright lights, barely playable" (2026-08-20).**
     Checking the actual accumulated state instead of adding another
     single-variable tweak: by this point nearly every brightness lever
     was stacked at or near its max simultaneously — `T_EXPOSURE` `2.60`
     (max `2.80`, default `1.40`), all four day light/atmosphere
     intensities at their max `2.00` (default `1.00`), night intensities
     also at max `2.00` (default `1.00`), `MINIMUM_LIGHT_MODE` above
     default, **and** `REALTIME_SHADOWS` disabled — meaning nothing was
     left to darken occluded surfaces at all. With no shadow darkening
     and every light multiplier near its ceiling, occluded/shaded
     geometry rendered at the same blown-out brightness as sunlit
     surfaces instead of reading as shadow — exactly the reported
     "shadows are bright lights."  **Full reset instead of another
     incremental tweak**: re-enabled `REALTIME_SHADOWS` (`SHADOW_QUALITY`
     back to its `2` default) so occlusion darkening exists again, and
     pulled every stacked multiplier back to at-or-near default instead
     of trying to find one more offsetting value: `MINIMUM_LIGHT_MODE`
     `3`â†’`2` (default), `AMBIENT_MULT` `110`â†’`100` (default),
     `T_EXPOSURE` `2.60`â†’`1.70` (a modest bump over default `1.40`, not
     a near-max one), all four day sliders `2.00`â†’`1.20` (day brightness
     is `T_EXPOSURE`'s job, confirmed correct earlier — these were pure
     redundant stacking), night sliders `2.00`â†’`1.40`. Left the round-8
     tonemap curve (`T_LOWER_CURVE`/`T_UPPER_CURVE` `1.30`/`1.50`) alone
     — real reference values, not part of the stack that caused this.
     All baked into `Spooklementary_TDM_tuned.zip`.

  **Lesson**: disabling `REALTIME_SHADOWS` removes the *only* mechanism
  that darkens occluded surfaces — doing that while every brightness
  multiplier is simultaneously stacked near its ceiling guarantees
  everything reads as uniformly overexposed instead of having real
  shadow. When a tuning saga has been running long enough that many
  independent levers are all pushed toward one extreme, the fix is a
  full reset toward defaults, not one more offsetting nudge.

  10. **Round 9's reset undid the day fix — "all too dark again"
      (2026-08-20).** Confirmed via real research this time, not another
      guess: multiple independent sources agree **Spooklementary is
      dark by design** — "things are much darker as an intentional
      design feature of Spooklementary, as it's meant to create a moody
      and spooky atmosphere." Round 9's reset pulled nearly every
      brightness value back to at-or-near Spooklementary's own defaults
      to stop the blowout — which correctly stopped the blowout, but
      also undid the day-darkness fix, because those defaults are
      *intentionally* dark. The sources also confirm the shader's own
      Shader Options UI exposes exactly one dedicated brightness control
      for this — "General Brightness," i.e. `T_EXPOSURE` (matches the
      `.lang` label found earlier). **Root mistake across rounds 2-9**:
      spreading the brightness fix across five different levers
      (`T_EXPOSURE`, `AMBIENT_MULT`, `MINIMUM_LIGHT_MODE`, day sliders,
      night sliders) instead of using the one lever the shader is
      actually designed around — stacking multiple mechanisms at once
      is what caused every overcorrection. **Fix**: reset every other
      lever to true default (`AMBIENT_MULT 100`, `MINIMUM_LIGHT_MODE 2`,
      all day/night intensity sliders `1.00`, shadows on at default
      quality `2`), and raise only `T_EXPOSURE` (`1.70`â†’`2.50`, near but
      not at its `2.80` ceiling) as the single brightness lever for both
      day and night, since it's a global post-lighting exposure that
      isn't time-of-day-scoped. `T_LOWER_CURVE`/`T_UPPER_CURVE` (round
      8's real community-referenced values) left alone — genuinely
      separate from the brightness-stacking mistake.

  **Design choice surfaced to the user directly** rather than deciding
  unilaterally, since "the shader is dark on purpose" also meant there
  was a real fork: keep Spooklementary's spooky identity and fight its
  default brightness with the one intended lever (chosen), or drop the
  "spooky" reskin for base Complementary Unbound (same Oculus loader,
  same 1.20.1 compatibility, not built around deliberate darkness, but
  loses the horror aesthetic that was the actual reason Spooklementary
  was picked over generic Complementary for the Atmosphere & Wave Feel
  design goal in the first place). User chose to stay with Spooklementary.

  11. **"Still too dark, shadows are pitch black" — user explicitly
      directed removing shadows entirely (2026-08-20), not more tuning.**
      Technical reason `T_EXPOSURE` alone couldn't fix this:
      `T_EXPOSURE` is a global exposure multiplier applied *after*
      lighting — if the shadow map computes near-zero direct light in
      an occluded pixel, multiplying that near-zero value by a higher
      exposure still comes out near-zero. No single post-lighting
      exposure lever can lift a true shadow-black pixel; the darkness
      has to be removed at its source. **Fix**: disabled
      `REALTIME_SHADOWS` again (`//#define REALTIME_SHADOWS`) — this is
      the same toggle round 8 flipped, but this time every other
      brightness lever is at true default (only `T_EXPOSURE` at `2.50`
      is elevated, vs. round 8's five simultaneously-stacked levers),
      so the "bright white light" blowout from round 8/9 is much less
      likely to recur. `SHADOW_QUALITY` left at its default `2` — inert
      with `REALTIME_SHADOWS` off, no need to also change it.

  12. **Removed entirely (2026-08-20) — not a tuning problem, a "not
      feeling the shader feel" verdict.** After eleven rounds converging
      on a technically-defensible state (real dark-by-design confirmed
      via research, brightness isolated to `T_EXPOSURE`, shadows removed
      at the source), the user's actual issue was the aesthetic itself,
      not any remaining number: "im just not feeling the whole shader
      feel now." **Oculus** (`mods/oculus.pw.toml`) and
      **`shaderpacks/Spooklementary_TDM_tuned.zip`** deleted from both
      the tracked pack and the live instance, along with
      `config/oculus.properties`. `pack/index.toml`/`pack/pack.toml`
      hashes updated to match. Confirmed no KubeJS script referenced
      Oculus or shaders at all (`border_fog.js` and the wave-state
      `/fog` calls run entirely on YetGamer's Custom Fog, a separate mod
      with no Iris/Oculus dependency) — so nothing else needed touching.
      See `docs/IDEAS.md`'s Shaders sub-section for the closing note:
      this is a closed decision, not a paused one — don't re-propose a
      shaderpack here without new signal from the user.

  13. **Worldborder texture looked "blocky" (2026-08-20), now that
      shaders aren't there to soften it.** The original replacement
      texture (round 2 above) was still just 16x16 — small enough that
      the game visibly tiles it edge-to-edge across the huge worldborder
      wall, and the raw noise pattern didn't wrap seamlessly, so each
      16px tile boundary showed a visible seam/repeat, reading as a
      grid instead of continuous mist. Real "connected textures" (CTM)
      doesn't apply here regardless — that's block-face logic (Optifine/
      Continuity), and the worldborder isn't a block; it's a dedicated
      renderer that just repeats one square texture, consulted by
      neither Embeddium nor any CTM-style system. The actual fix is
      making the *texture itself* tile without seams. Rebuilt at 64x64
      using three octaves of **periodic value noise** — lattice grids of
      4/8/16 cells (all factors of 64), sampled with wraparound indexing
      so the noise field is mathematically continuous across every tile
      boundary, not just visually close — plus smoothstep interpolation
      to avoid any hard lattice-cell edges. Verified by rendering a 4x4
      tiled preview with gridlines overlaid before deploying: the cloud
      pattern flows unbroken across every seam. Same white-RGB/
      variable-alpha approach as before (game still applies its own
      blue/green/red border-state tint on top), same KubeJS
      `minecraft:textures/misc/forcefield.png` override mechanism.
  14. **Darkness effect built + fog restricted to wave-only (2026-08-20),
      same day the shader was dropped.** Per `docs/IDEAS.md`'s new
      "Darkness effect as the shader replacement" proposal (added by the
      user directly, then asked to be built): `wave_spawner.js`'s
      `useWaveHorn` now also runs
      `effect give @a minecraft:darkness 1000000 0 true` right after the
      fog command (1000000 is seconds, `/effect give`'s own max — no
      periodic top-up tick handler needed), cleared explicitly in
      `wave_status.js`'s "defeated" branch alongside the existing fog
      reset — same give/clear pairing already used for night-lock and
      fog, no new pattern. **Reverted the same day** — confirmed not
      working via direct playtest feedback (the user edited
      `docs/IDEAS.md` directly: "proposed and built... but didn't work
      per direct feedback — dropped"). Both the `effect give` and
      `effect clear` calls removed entirely from `wave_spawner.js`/
      `wave_status.js`; fog + night-lock are the only atmosphere layers
      a wave applies now. No specific reason given for *why* it didn't
      work (visually unconvincing? too subtle? read as a bug rather than
      atmosphere?) — worth asking directly if this comes up again, rather
      than guessing at another vanilla-effect substitute blind.
  15. **Misread "fog only during a wave" as "day gets zero fog" —
      corrected same day.** Deleted `border_fog.js` entirely on the
      assumption the user wanted fog eliminated outside waves. Actual
      ask, per direct correction ("i want some light fog on the border
      in the day and heavy fog in the night... trying to make it
      atmospheric"): day/night **contrast**, not day going silent —
      exactly what `border_fog.js` already provided and shouldn't have
      been removed. Restored it, and retuned its density since the
      original values were closer to the two states matching than
      contrasting: `NEAR_MAX_DISTANCE` (fog thickness right at the
      border edge) raised `20`â†’`60` so daytime border fog stays
      meaningfully lighter than wave-time's fixed `MaxDistance 32`
      everywhere, even at its densest point — previously the day-time
      edge fog (`20`) was actually *denser* than night's uniform fog
      (`32`), backwards from the intended contrast. `MIN_DISTANCE`
      `6`â†’`10` for a touch more clarity right around the player. The
      `gamerule sendCommandFeedback false` fix moved back to
      `border_fog.js` (undoing round 14's move into `wave_spawner.js`,
      now that `border_fog.js` owns `/fog` calls again too). The
      worldborder wall texture (round 13 above) was never affected by
      any of this — it's a static resource-pack override, always
      visible regardless of day/night.

  16. **Removed entirely — fog, the worldborder texture, and Blood Moon
      (2026-08-29)** — direct request: "remove any visual effects work,
      like fog etc, and go back to basics." Closes out this whole
      section's real implementation: `border_fog.js` deleted (peacetime
      proximity fog), `wave_spawner.js`'s wave-time fog command and
      `wave_status.js`'s reset removed, YetGamer's Custom Fog uninstalled
      (nothing left to use its `/fog` command), and the worldborder wall
      texture override (`forcefield.png`) deleted so vanilla's own
      default texture shows again. Night-lock — forced night, frozen
      daylight cycle during a wave — is **kept**, since it's a gameplay
      necessity (undead mobs would burn on spawn otherwise), not
      decoration. Staggered emergence and the sound-first cues are also
      **kept** — spawn timing and audio, not visual effects, and outside
      what was actually asked to be cut.

  None of the remaining fixes in this entry (staggered emergence, sound
  cues) have been re-tested in-game yet; the shader sub-thread is now
  moot.

  **Performance audit (2026-08-20)** — user explicitly asked to check
  this session's additions weren't costing performance without being
  weighed against the pack's existing FPS-focused mod stack (Embeddium/
  ModernFix/FerriteCore/Radium/EntityCulling).
  - **Spooklementary shipped defaulting to roughly its own `profile.HIGH`
    tier** — checked its shader source directly: `SHADOW_QUALITY=2`,
    `shadowDistance=192.0`, entity shadows and world-space reflections
    all on. First pass downgraded to `profile.MEDIUM` via a settings
    override. **User asked for more after the v1.1 downgrade (same
    day)** — went a further step to `profile.LOW` (`SHADOW_QUALITY=0`,
    `shadowDistance=96.0`, lightshafts and FXAA off, `WATER_QUALITY=1`)
    — real values from v1.1's own profile table. Once the settings-override
    mechanism itself came into doubt (see the darkness entry above),
    these `profile.LOW` values got baked directly into
    `Spooklementary_TDM_tuned.zip`'s `.glsl` defaults alongside the
    brightness fix, same reasoning: guaranteed to apply, not dependent
    on an unconfirmed external file.
  - The v1.1 downgrade above (fixing the `BIOME_PALE_GARDEN` crash) is
    also plausibly a performance win in its own right — a shader
    pipeline throwing during `CustomUniforms` initialization isn't free
    — though this wasn't directly measured/isolated from the profile
    change.
  - Oculus, YetGamer's Custom Fog, TFTH+GeckoLib: checked, no similar
    concern. TFTH's autonomous spawn/spread systems are already disabled
    (see its own config-hardening entry), so it carries registry/loading
    weight but no continuous runtime cost. YetGamer's Custom Fog is a
    lightweight rendering-parameter mod with no dependencies.

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

- **Fixed spawn + prebuilt starting building (2026-08-20)** —
  `docs/IDEAS.md`'s "Fixed spawn + prebuilt starting building(s), every
  world" idea, built into `playtest_starter_kit.js` on top of the
  existing first-login gear/base logic rather than as a separate file.
  `/setworldspawn` + `gamerule spawnRadius 0` + the existing one-shot
  guard (`td_playtestKitGiven`) built exactly per the design doc's plan.
  **One deliberate substitution**: the doc named `/place template` (a
  hand-authored `.nbt` structure) for the building itself — building a
  raw NBT file blind, with no way to test it in-game before committing
  it, is real unverified risk for no benefit when the `/fill`+`/setblock`
  code that builds the starter base is already proven working in real
  playtests. Reused that code directly, just re-anchored to the fixed
  point instead of the player's arbitrary spawn position — same
  end-user outcome, lower-risk mechanism.
  X/Z originally hardcoded to `(0, 0)` with Y read from the player's own
  natural spawn position; `worldborder center` moved to the same fixed
  point too, for consistency. **Only affects brand-new worlds** — a
  world already past its first login (including any world already being
  playtested) is completely unaffected; needs a fresh world to test, not
  just a relaunch.
  - **Superseded same day by the switch to real terrain** — "reading the
    player's own natural spawn Y" was only ever safe because Superflat
    height is uniform everywhere; real terrain varies within vanilla's
    default spawn-scatter radius, so a Y read there can't be trusted for
    world origin specifically anymore. Replaced with `/spreadplayers 0 0
    1 8 false @a` (vanilla's real heightmap-aware "place on solid ground
    near this X,Z" command, avoids voids/liquids) run first, then the
    player's *actual resulting* position is read as ground truth instead
    of assumed. The starter base's `/fill` logic also needed a real
    change beyond just re-anchoring: added a stone foundation 3 blocks
    down (covers local dips/dunes) and headroom clearing 3 blocks above
    the walls (covers local rises/foliage) before building, since a
    single flat Y across an 11x11 footprint no longer holds on uneven
    ground.
  - **`wave_spawner.js` needed the same class of fix.** Its mob-spawn
    logic reused the player's own Y for every summoned mob regardless of
    that specific mob's X/Z — harmless on flat Superflat, but on real
    terrain a mob spawning some distance away can be several blocks off
    the player's height, spawning embedded in terrain or floating.
    First fix summoned mobs 15 blocks up and let vanilla gravity drop
    them onto the real surface — technically correct, but user feedback
    after a real playtest was "enemies are falling from the sky," which
    reads as silly rather than menacing for mobs meant to approach with
    dread. **Replaced (2026-08-20) with a silent correction**: summon at
    the rough estimate regardless of accuracy, tag the entity uniquely
    (`Tags:["td_justSpawned"]`), then `/spreadplayers <x> <z> 0 4 false
    @e[type=<mobType>,tag=td_justSpawned,limit=1]` — the same vanilla
    heightmap-aware placement command used for the player's own fixed
    spawn in `playtest_starter_kit.js`, here targeting a mob instead of
    a player — then immediately clear the tag. Instant, invisible
    correction instead of a visible drop. Tag-add-then-remove is
    race-safe since `pendingSpawns.forEach` processes one spawn at a
    time, synchronously, within a tick. **Biggest unconfirmed
    assumption**: `/spreadplayers` accepting a general `@e[...]` mob
    selector, not just players, despite the command's name — reasoned
    from its argument being typed as a generic multi-entity selector in
    vanilla's command tree, consistent with how other "player" mods work
    on arbitrary entities, but not directly verified. If mobs don't
    move at all after summoning, check this first.
  - **Mobs always spawned inside the border, never from beyond it — a
    real miss against `docs/IDEAS.md`'s own Fog Wall design** ("enemies
    spawn from beyond the fog line, not inside the play area"), caught
    directly by the user after a playtest, not found proactively. The
    original spawn logic picked a position 15-25 blocks from the
    *player* and clamped it inward if that landed outside the border —
    so mobs always spawned near the player, never near the edge, and the
    gap only widened as `base_expansion.js` grew the border over time.
    **First fix still spawned mobs just inside the edge, not beyond it —
    a second real miss, corrected after direct user pushback ("no not
    inside the border!!! spawn outside").** That fix was built on a
    wrong assumption: vanilla's worldborder blocks *player* movement
    only, not general entity/mob movement — mobs path across it under
    normal AI with no special resistance. The original 2026-08-19 bug
    ("mobs spawning outside the border become permanently unreachable")
    predates `mob_aggro.js`'s unconditional, no-distance-limit
    `setTarget()` entirely, which is what actually makes a long walk-in
    reliable now, not keeping mobs inside the wall. **Real fix**:
    `randomBorderEdgePosition()` now spawns mobs 6-14 blocks genuinely
    *beyond* a random edge of the border, and mobs walk the real
    distance in. One real vanilla side effect of spawning outside:
    border damage (default ~0.2 hearts/sec past the border's 5-block
    safe buffer) would otherwise chip mobs and the player for no reason
    this pack wants — disabled once per world via
    `worldborder damage amount 0` in `playtest_starter_kit.js`'s
    existing one-time worldborder setup. **Not yet re-tested — needs a
    world with `worldborder damage amount 0` already applied; a world
    already past its first login (like an existing test world) needs
    that command run manually once.**

- **World type switched from Superflat to Single Biome: Desert
  (2026-08-20)** — per the direct request "creating a world that isn't
  entirely flat, and have some other structures been spawned around the
  player." Checked whether any of `docs/IDEAS.md`'s previously-logged
  candidate seeds (for real desert/badlands terrain) could be verified
  before committing to one — Chunkbase's seed map is a JS-rendered
  interactive tool, not fetchable/verifiable without actually running
  the game, so none of those unverified leads could be confirmed. Picked
  **Single Biome: Desert** instead of gambling on an unverified seed:
  deterministic (guaranteed desert terrain everywhere, no seed-hunting
  needed) and vanilla structure generation still runs normally within
  it — desert temples, wells, ruined portals, villages all still
  generate — so "structures spawn around the player" is satisfied by
  vanilla's own world generator, zero custom placement code needed. This
  also directly serves the border-expansion idea from `docs/IDEAS.md`'s
  "lootable buildings + distance-based risk" addendum (structures
  becoming reachable as the border grows) without building any of that
  addendum's more involved distance-based loot/difficulty systems yet —
  those stay a separate, later step. Badlands considered as an
  alternative (more dramatic canyon/mesa terrain) but Desert has more
  guaranteed structure variety.
  - **Automated (2026-08-20), same day — no longer a manual
    world-creation-screen step.** User asked directly not to need
    "Customize" at all. Real vanilla mechanism used: KubeJS's `data/`
    injection (already used elsewhere for recipes/tags/loot tables) can
    ship *any* datapack JSON, including a dimension override —
    `pack/kubejs/data/minecraft/dimension/overworld.json` replaces the
    vanilla `overworld` dimension's generator with
    `{"type": "minecraft:noise", "settings": "minecraft:overworld",
    "biome_source": {"type": "minecraft:fixed", "biome":
    "minecraft:desert"}}` — the exact same generator "Single Biome:
    Desert" produces manually (standard terrain-shape noise settings,
    just a fixed biome source instead of the normal biome-placement
    noise), now baked into every world automatically regardless of
    which World Type button gets clicked on the creation screen. Since
    this overrides vanilla's own `overworld` dimension definition
    directly, "Default" world type (what most players leave selected)
    picks it up with zero customization. **First time this pack has
    shipped a dimension-generator override via KubeJS** — previously
    `data/` was only used for simpler content (recipes, loot, tags), so
    this is a step further into that mechanism's range; not yet
    confirmed in-game. Manually picking Single Biome â†’ Desert on the
    creation screen remains a working fallback if the override doesn't
    take effect for some reason.
  - **Wide flatten around fixed spawn (2026-08-20).** The Desert
    override only fixes the *biome* — terrain height, ravines, and
    caves still generate under standard vanilla noise, so the ground
    immediately around the starter base was still visibly uneven.
    Seed-hunting for a naturally flat spot was considered and rejected —
    same unverifiable-lead problem (Chunkbase again) that already pushed
    this pack off a specific seed once before. Reused the existing
    starter-base leveling technique, just wider: `WIDE_HALF = 25`
    (matching the starting worldborder's 50-block diameter) instead of
    the building's own `half = 5`, resurfaced as `minecraft:sand` rather
    than exposed stone so it reads as open desert, not a quarry. Same
    one-shot trigger as the rest of `playtest_starter_kit.js`. The
    starter base's own narrow foundation-dig/headroom-clear became
    redundant once the wide pass covers that same area first, so they
    were removed rather than left as duplicate work.
    - **`/fill`'s 32,768 block limit checked, not assumed**: width is
      `2*25+1 = 51` blocks per side, `51*51 = 2601` per Y layer.
      Foundation (4 layers) = 10,404 blocks; headroom clear (6 layers)
      = 15,606 blocks — both comfortably under the limit as single
      commands, no chunking needed.
    - **Ravines deeper than the foundation's dig depth are still handled
      correctly**, not just hoped to work out: `/fill` unconditionally
      overwrites every block in its volume (not "fill only if air"), so
      any ravine or cave *within* the filled range gets solidly capped
      regardless of how far it continues below the fill's bottom layer
      — that deeper void just stays a hollow, invisible, unreachable
      cave underground, not a gap in the visible surface.
  - **Real crash found via first actual playtest of this batch**: the
    wide-flatten edit above introduced a second `const half = 5` in the
    same function scope (one left over from the earlier fixed-spawn
    edit, one added fresh for the wide-flatten edit) — a genuine
    duplicate-declaration syntax error, not the Rhino repeated-
    invocation quirk documented elsewhere in this codebase. This failed
    to *parse* entirely (`server.log`: "Loaded 8/9 KubeJS server
    scripts... 1 errors"), meaning **none** of `playtest_starter_kit.js`
    ran — no gear, no fixed spawn, no starter base, no worldborder/mob-
    spawning setup, no wide flatten. Explains three symptoms reported
    from one test as a single root cause, not three separate bugs: "wave
    0" showing (natural mobs, never disabled, against an untouched
    `td_waveNumber`), no starter structure (script never reached the
    `/fill` calls), spawning near water (vanilla's own unmodified spawn
    logic, none of the fixed-spawn/flatten code ran). Fixed by removing
    the stale duplicate declaration. **New verification step adopted
    after this**: `node --check <file>.js` catches this exact class of
    error before deploying — cheap, real syntax validation via Node's
    parser (close enough to Rhino's ES6 support for this), should have
    been run before this file was last deployed and will be from now on
    for every script edit.
  - **Reverted back to Superflat, same day, per direct feedback** ("the
    teraiin is wonky again and doesnt suit the gameplay") — real terrain
    was tried, playtested, and rejected on gameplay feel, not a
    technical failure. `kubejs/data/minecraft/dimension/overworld.json`
    now forces vanilla's own default flat generator instead of the fixed
    Desert biome source, using the exact same override mechanism, so a
    fresh world is Superflat automatically with zero manual
    customization — same "no manual step needed" property the Desert
    override had. The wide-flatten pass above became pure dead weight on
    flat ground (nothing to flatten) and would have needlessly
    resurfaced the yard as sand, so it was removed entirely rather than
    left inert. The `/spreadplayers`-based height-finding and
    `wave_spawner.js`'s spawn-beyond-border fixes were **kept** — both
    work correctly on flat terrain too, no reason to revert something
    that isn't broken. Deliberately "for now," not a closed decision —
    see `docs/IDEAS.md`'s Seed research section if real terrain gets
    revisited.

- **Watchtower — phase 1 of "expand the starter base into multiple
  buildings" (2026-08-20).** New idea, not previously in `docs/IDEAS.md`
  — user asked for "phase 1 of the initial buildings idea" with no
  matching section on record, so scoped it via direct questions rather
  than guessing: confirmed it meant growing the single starter box (the
  existing "Fixed spawn + prebuilt starting building(s)" idea) into
  several buildings, and that phase 1 specifically should be a
  watchtower/lookout. Built into `playtest_starter_kit.js`, right after
  the existing starter base commands, same one-shot trigger.
  - **Placement**: north of the base, behind its back wall (the door
    faces south/+Z, so the tower sits clear of the entrance) — a
    3-wide, 10-tall solid cobblestone pillar with an external ladder on
    its south face (the side facing the base, for a short walk from the
    door), topped with a 5x5 stone-brick platform and a cobblestone-wall
    parapet. Same material palette as the existing base (cobblestone/
    stone brick), not a new one.
  - **Open on all sides, not facing one direction** — a deliberate
    design choice tied directly to this session's earlier work: since
    `wave_spawner.js`'s `randomBorderEdgePosition()` spawns mobs at a
    random point on any of the 4 border edges, a lookout facing only one
    direction would miss three-quarters of what it's meant to watch for.
    The parapet ring has a single gap, at the ladder-access point, not a
    facing wall.
  - **Ladder facing convention confirmed, not guessed**: `facing=south`
    for a ladder mounted on a pillar to its north — vanilla's
    wall-attached-block convention is that `facing` points *away* from
    the block it's attached to (the direction the player faces while
    climbing), not toward it.
  - Syntax-checked with `node --check` before deploying (see the crash
    entry above for why this is now a standing step). **Not yet
    confirmed in-game.**

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
  were added (see the Wave spawner entry below) — the gear-removal
  narrative beat is defined as firing when the *curated campaign*
  actually ends, and that endpoint moved. Not re-verified with the
  temporary-constant trick above; low risk since the trigger logic
  itself is untouched, only which wave number it compares against, but
  genuinely not re-tested.

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
    `8` — see the Starter gear removal entry above for what that
    affects.
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
