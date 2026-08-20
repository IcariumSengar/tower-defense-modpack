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
| Mouse Tweaks | [Modrinth](https://modrinth.com/mod/mouse-tweaks) | 2.25.1 (1.20.1 Forge) | Faster inventory management (shift/right-click-drag) | None known yet | testing |
| Inventory Profiles Next | [Modrinth](https://modrinth.com/mod/inventory-profiles-next) | 1.10.20 (1.20.1 Forge) | One-key inventory sort | Pulls in libIPN + Kotlin for Forge automatically. **Real conflict with Mouse Tweaks found 2026-08-19** — both mods implement their own swipe-to-move/craft gestures over the same slots; see the Inventory conflict entry under Custom glue for the fix | testing |
| libIPN | [Modrinth](https://modrinth.com/mod/libipn) | 4.0.2 | Hard dependency of Inventory Profiles Next | — | required |
| Kotlin for Forge | [Modrinth](https://modrinth.com/mod/kotlin-for-forge) | 4.12.0 | Hard dependency of Inventory Profiles Next | — | required |
| Corpse | [Modrinth](https://modrinth.com/mod/corpse) | 1.0.23 (1.20.1 Forge) | Death drops become a recoverable corpse instead of scattering — chosen over GraveStone Mod (same niche, picked one) | None known yet | testing |
| LootJS | [Modrinth](https://modrinth.com/mod/lootjs) | 2.13.1 (1.20.1 Forge) | KubeJS addon for editing loot tables — powers the loot-bag drop system (see Custom glue below). Small, purpose-built companion to KubeJS, not a standalone content mod | Server-side | testing |
| TFTH (The Flesh That Hates) | [Modrinth](https://modrinth.com/mod/tfth) | 1.1b (1.20.1 Forge) | Re-added 2026-08-19 to supply modded mob types for wave_spawner.js starting wave 2 — see the Wave spawner entry under Custom glue for exactly which mobs, and the "TFTH config hardening" entry there for why most of its own default behavior is disabled | Removed 2026-08-19 (first playtest, vanilla-only decision), re-added same day once the wave campaign was ready for modded mobs. TFTH is not just a mob roster — see the config hardening entry, this needed real care, not a blind re-add | testing |
| GeckoLib | [Modrinth](https://modrinth.com/mod/geckolib) | 4.8.4 (1.20.1 Forge) | Hard dependency of TFTH (animation library) | — | required |
| Oculus | [Modrinth](https://modrinth.com/mod/oculus) | 1.20.1-1.8.0 (1.20.1 Forge) | Iris-for-Forge shader loader — added 2026-08-20 to run the shader pack below, first piece of the "Atmosphere & Wave Feel" design (`docs/IDEAS.md`) | Declares **Embeddium** as its own required dependency (confirmed via Modrinth API, "any compatible version") — built to work with our existing renderer, not fight it, despite some older/version-unspecific web chatter about Oculus/Embeddium friction | testing |
| Spooklementary (locally tuned) | [Modrinth](https://modrinth.com/shader/spooklementary) (v1.1 base) | v1.1 base, hand-edited | Shader pack — Complementary-based, moody/desaturated horror atmosphere. Picked 2026-08-20 over Hysteria Shaders (1.20.1 build ~1yr stale, heavier volumetric feature set) and Gravemist (couldn't confirm it's actually available for 1.20.1 — zero Modrinth results). Blood moon effect confirmed **visual-only**, no functional overlap with the separate "Boss waves tied to Blood Moon" idea | **No longer a clean upstream download.** Downgraded v2.0.4 → v1.1 first (v2.0.4 throws `RuntimeException: Unknown variable: BIOME_PALE_GARDEN` during pipeline creation — that biome doesn't exist until MC 1.21.4; confirmed via source that v1.1, Oct 2023, predates it). Still too dark after that fix, and the per-shaderpack settings-override file (`shaderpacks/<name>.txt`, the "correct" Iris mechanism) couldn't be confirmed as actually taking effect after two attempts — so **the shader's own `.glsl` defaults were hand-edited directly** (`shaders/lib/common.glsl`: day-intensity sliders to their max `2.00`, quality settings to `profile.LOW`) and repackaged as `Spooklementary_TDM_tuned.zip`, tracked as a real file in `pack/shaderpacks/` rather than a `.pw.toml` pointing at an upstream URL, since the bytes no longer match anything Modrinth serves. Not a mod — loaded via Oculus. See its own writeup under Custom glue | testing |
| YetGamer's Custom Fog | [Modrinth](https://modrinth.com/mod/yetgamers-custom-fog) | 1.0.1 (1.20.1 Forge) | Added 2026-08-20 as a substitute for `docs/IDEAS.md`'s named Foggy Border/Fog (IMB11), **neither of which has any Forge build at all** (Foggy Border is Fabric-only; Fog/IMB11 is Fabric/NeoForge-only and starts at 1.21+ anyway — confirmed via Modrinth's version API directly, not search summaries). Ships a real runtime `/fog <targets> set\|reset <min> <max> <r> <g> <b> <sat> cylinder\|sphere` command — scriptable via the same `runCommandSilent` pattern as everything else in this pack, unlike a shader's own settings | No dependencies. Its fog is always player-relative, not tied to a fixed world coordinate — can't literally render fog "at the worldborder," see the Custom glue writeup for what it actually delivers instead | testing |

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
  worldborder + starter base.
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

None of these were hard blockers or bugs — all were clean removals of
mods sitting parallel to, not part of, the pack's actual built systems.

## Custom glue

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
     → `170`, both baked directly into `Spooklementary_TDM_tuned.zip`
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
     areas not hit by direct light — i.e. shadows) `170` → `110`, and
     `MINIMUM_LIGHT_MODE` (added in round 6 at its most aggressive tier
     the same round this broke) `4` → `3`. Both still baked into
     `Spooklementary_TDM_tuned.zip`.

  **Lesson for this specific shader-tuning saga**: stop pushing
  individual sliders further without reconsidering earlier ones in the
  same pass — the "still dark" → "now too bright" whiplash across
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
       `T_EXPOSURE` 0.4–2.8 range) — confirms these can't be copied
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
       applied directly (`T_LOWER_CURVE` `1.20`→`1.30`,
       `T_UPPER_CURVE` `1.30`→`1.50`), real numbers from an actual
       guide, not another blind guess.

  None of the fixes in this entry have been re-tested in-game yet.

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

- **Wave status HUD** — `pack/kubejs/server_scripts/wave_status.js`. Action
  bar shows a live "Hostiles remaining: N" count, and chat announces
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
    everything else in this file.

  **Confirmed working (2026-08-19)** — verified with a temporary
  `GEAR_REMOVAL_WAVE` constant (`2`) swapped in for `FINAL_WAVE`, so it
  could be checked without a full 5-wave clear each time; kept as a
  separate constant rather than lowering `FINAL_WAVE` itself, since that
  one also drives the wave-number display cap and there are genuinely 5
  designed waves. Player confirmed "work perfectly." Reset to
  `FINAL_WAVE` (real wave 5) immediately after — same trigger logic,
  just the wave number it fires on.

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
