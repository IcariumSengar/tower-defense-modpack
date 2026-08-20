# Playtest setup

A repeatable, tightly-scoped way to test the pack without combat
difficulty or manual setup getting in the way. Almost everything is
automatic (via `pack/kubejs/server_scripts/playtest_starter_kit.js`).

## Automatic (fires once, on your first login to a new world)

- **Starting weapon**: a Sharpness 100 netherite sword — one-shots
  essentially everything. Keeps testing focused on the systems (waves,
  loot, base expansion), not your own combat skill.
- **Full iron armor set** — given to inventory, not auto-equipped.
- **Wave Horn**: right-click to summon the next wave — see below.
- **Fixed spawn point**: every new world now spawns you at the same
  exact spot (near world coordinates 0, 0) instead of wherever vanilla
  happened to scatter you. `gamerule spawnRadius 0` is also set, so
  future respawns land exactly there too, not nearby.
- **Starter base**: a small walled box (11×11, cobblestone walls, stone
  brick floor, oak door) built around that fixed spawn point.
- **Watchtower**: a 10-block cobblestone pillar just north of the base,
  external ladder up to a 5×5 platform with a parapet — open on all
  sides (mobs can approach from any side of the border), not facing one
  direction. First of what's meant to grow into several starter
  buildings over time.
- **Worldborder set to 50**, centered on the same fixed point. Grows
  automatically by 5 blocks every 2 waves cleared after that
  (`base_expansion.js`).
- **Natural mob spawning disabled** (`doMobSpawning` gamerule) — the Wave
  Horn is the only mob source now. Note this also stops passive mobs
  (cows, etc.) since vanilla has no separate hostile-only toggle.

This only triggers on a **brand new world** — it won't retroactively fire
on a world you've already joined once.

## Manual setup (once per new world)

Just **Allow Cheats: ON** — pick whatever World Type you want on the
creation screen (including leaving it on "Default"), no customization
needed. The pack forces the actual generator via a datapack override
(`kubejs/data/minecraft/dimension/overworld.json`), same mechanism
regardless of which world type gets clicked.

**Back on Superflat (2026-08-20).** Briefly switched to real terrain
(Single Biome: Desert) for a non-flat, structure-populated world, but
that read as "wonky, doesn't suit the gameplay" in actual play — the
override now forces vanilla's own default flat generator (bedrock + 2
dirt + grass, plains biome) instead, so a fresh world is Superflat
automatically with zero manual customization, same as before real
terrain was ever tried. This is deliberately "for now," not a closed
decision — see `docs/IDEAS.md`'s Seed research section if real terrain
gets revisited later.

## The test loop

Right-click the **Wave Horn** to summon the next wave. Deterministic
5-wave campaign, vanilla mobs plus TFTH mobs starting wave 2 (see
`docs/MODS.md` for exact TFTH mob stats and the config changes made
before re-adding it):
1. zombie + skeleton
2. + spider + flesh_human
3. + witch + flesh_villager
4. + wither skeleton + flesh_hunter_i (tougher — TFTH's Awareness stage)
5. + ravager (mini boss) + flesh_suffer (hits hard — 25 attack damage)
   — repeats for calls beyond wave 5, and every repeat is a **Blood
   Moon** (see below)

The horn refuses to summon again while mobs from the current wave are
still alive nearby — clear the wave first. Action bar shows a live
"Hostiles remaining" count; chat announces when a wave starts (with mob
count) and when it clears.

**Mobs spawn beyond the worldborder, not near you** — they walk in from
outside the wall rather than appearing nearby, so on a large border
expect a real gap between "wave incoming" and the first mob actually
reaching you (staggered emergence + sound cues still apply on top of
this).

Calling the horn also forces night and locks the day/night cycle (so
zombies/skeletons don't burn on spawn or catch fire mid-fight) and
applies dense fog for atmosphere — it switches back to day, clears the
fog, and lets the cycle run normally again once the wave is cleared.
Fog isn't wave-only — a lighter version keeps thickening near the
worldborder edge during the peaceful gap too (`border_fog.js`), so
night reads as a heavier version of an atmosphere that's already there,
not fog appearing from nothing. (A `minecraft:darkness` vision effect
was also tried alongside the fog, but confirmed not working in
playtesting and dropped the same day — fog + night-lock are the
atmosphere layers now.)

**Wave 5 onward is a Blood Moon** — a distinct "BLOOD MOON RISES" title
and slightly denser fog than a normal wave. Atmosphere only, not a
harder mob roster (wave 5's composition is reused as-is for every
later call, same as before).

**After every wave clears, a 3-minute countdown to the next wave starts
immediately**, shown on the action bar — no reward-choice step anymore
(see below). Right-clicking the horn manually at any point during the
countdown starts the next wave immediately and cancels the countdown —
you're never forced to wait out the full 3 minutes.

The roguelike permanent-buff choice popup (chat menu, pick one of three
buffs after each wave) was built and removed the same day (2026-08-20)
— its click detection never reliably worked, which silently blocked
both the Wave Horn and the countdown timer. See the Wave-clear
orchestration entry in `docs/MODS.md` for the full story if this gets
rebuilt later.

Pure Suffering was removed 2026-08-20 as part of a footprint audit
(was already dormant, `enableInvasions false`) — see `docs/MODS.md`'s
Removed mods section if you want the re-add path later.

Epic Siege Mod's AI behavior (zombies dig/pillar, creepers breach walls,
etc.) is ambient/always-on and applies to whatever the horn spawns.

## Known caveats

- `playtest_starter_kit.js`, `wave_spawner.js`, `wave_status.js`, and
  `base_expansion.js` are playtest tooling / first-pass design, not
  settled pack content — mob counts per wave and the starter base are
  both easy to retune.
- TFTH was removed from the pack (2026-08-19) so the wave campaign could
  go vanilla-only, then re-added the same day with most of its own
  autonomous spawn/spread behavior disabled via config once wave 2+ was
  ready for modded mobs — see `docs/MODS.md`'s Wave spawner entry for
  exactly what was changed and why. **Not yet confirmed in-game** —
  config-only, next real playtest should specifically check that no
  Incubators/flesh spread show up unprompted, and watch for anything
  unusual around `TFTH.toml`'s unexplained `spawnFleshHumanFrom`
  including `"minecraft:player"`.
- The wave system went through a long real debugging saga (2026-08-19) —
  nine real bugs found and fixed end to end, then a further round after
  actual playtesting (spawn positions outside the worldborder, duplicate
  chat messages, expansion trigger mismatch). Full writeup in
  `docs/MODS.md`'s Wave spawner and Base expansion entries — worth
  reading if something in this system breaks again, several of these
  bugs were genuinely surprising (e.g. `Math.PI` not behaving as a
  normal number, bare `.x`/`.y`/`.z` on entities producing `NaN`) and
  are easy to reintroduce by instinct when writing new scripts.
- Wave Horn and all three loot bags now have hand-authored placeholder
  textures (added 2026-08-19, not KubeJS's generic missing-texture icon,
  but still not "real" art) — the bags are color-coded to match their
  rarity tooltip color (gray/gold-tan/red+gold).
- Loot bags were silently non-functional on right-click until
  2026-08-19 (same `event.level.isClientSide` crash the Wave Horn had) —
  fixed; see `docs/MODS.md`'s Loot bag drop system entry. Drop rate was
  also backwards (Rare more likely than Common) until the same day —
  now Common 50% / Uncommon 25% / Rare 10%. Common's loot pool gained
  stone/wood/food staples on top of its scrap materials.
- The starter sword/armor disappear once the campaign's final wave (5)
  clears, with an "IT'S UP TO YOU NOW" popup — **confirmed working**
  (2026-08-19 playtest, verified at a temporarily-lowered wave 2, then
  reset back to the real wave 5). See `docs/MODS.md`'s Wave status HUD
  entry for the implementation.
- Mouse Tweaks and Inventory Profiles Next were fighting over the same
  swipe/hover gestures — green flashing on inventory hover, occasional
  accidental multi-crafting. Fixed via IPN's own config (disabled its
  overlapping swipe-move/craft tweaks and hover highlight, kept Mouse
  Tweaks as-is) — see `docs/MODS.md`'s conflict write-up. **Needs a full
  relaunch and isn't yet confirmed fixed in-game.**
- Shaders (Oculus + Spooklementary) were added 2026-08-20, tuned
  across eleven rounds the same day, then **removed entirely** later
  that day — see the "Shaders removed entirely" bullet further down
  for why. This pack does not use shaders.
- Atmosphere & Wave Feel built out the same day: waves now set dense,
  close, desaturated fog (YetGamer's Custom Fog's `/fog` command)
  alongside the existing night lock, reset to normal on wave clear
  alongside the existing day restore; mobs now emerge staggered over a
  few seconds with a positioned "something's coming" sound cue just
  before each one appears, instead of all spawning in the same instant
  — the gap between emergences shrinks at higher wave numbers.
  **First relaunch (2026-08-20) found three issues** — shader not
  guaranteed active by default (fixed, pinned in `config/oculus.properties`),
  too dark during the day, worldborder still the vanilla blue
  line/vignette instead of fog.
- **Worldborder: two layers, not one.** No Forge 1.20.1 mod exists for
  this (checked four candidates directly). (1) The border's wall is just
  a 16x16 texture (`assets/minecraft/textures/misc/forcefield.png`) —
  replaced vanilla's sharp diagonal-stripe pattern with a soft cloud-like
  one via the same KubeJS resource-pack mechanism used for the Wave
  Horn/loot bag textures; the blue tint is applied by game code and
  can't be removed, but the pattern was the "jarring" part. This alone
  wasn't a strong enough effect. (2) **Real fix**: new
  `border_fog.js` continuously scales YetGamer's Custom Fog's `/fog`
  command based on the player's actual distance to the nearest
  worldborder edge — genuinely thickens as you approach, thin/barely
  there near the center. Only runs during the peacetime gap between
  waves (defers entirely to `wave_spawner.js`'s existing combat fog
  while a wave is active).
- **Worldborder texture looked "blocky" (2026-08-20).** The 16x16
  texture visibly tiled across the wall with seams at each tile
  boundary. Real CTM ("connected textures") doesn't apply — that's
  block-face logic, and the worldborder is a dedicated renderer, not a
  block, so no CTM system (or Embeddium) ever looks at it. Rebuilt at
  64x64 using periodic (wraparound) noise so the pattern is
  mathematically seamless across every tile edge, not just visually
  close — verified with a tiled preview before deploying. See
  `docs/MODS.md`'s Worldborder Fog Wall entry. **Not yet re-tested
  in-game.**
- **Darkness effect added, then reverted the same day (2026-08-20).**
  Waves briefly also applied vanilla's `minecraft:darkness` status
  effect (the Warden's vision-closing vignette) alongside the existing
  night-lock and fog — a vanilla-command replacement for the shader's
  atmosphere, per `docs/IDEAS.md`'s proposal. **Confirmed not working in
  playtesting and dropped** the same day (no specific reason given for
  why). Both the give and clear calls are removed; fog + night-lock are
  the only atmosphere layers a wave applies now.
- **Fog day/night contrast corrected (2026-08-20).** First pass
  misread "fog only during a wave" as "day should have zero fog" and
  deleted `border_fog.js` — wrong; the actual ask was light fog near
  the border by day, heavy fog during a wave, real contrast rather than
  fog/no-fog. Restored `border_fog.js` and retuned it lighter than
  wave-time fog (previously its near-border density was accidentally
  *denser* than night's, backwards from the intent). See
  `docs/MODS.md`'s Atmosphere & Wave Feel entry. **Not yet re-tested
  in-game.**
- **Darkness took three real fixes, not one** — first, a genuine bug:
  Spooklementary v2.0.4 threw `Unknown variable: BIOME_PALE_GARDEN`
  during shader pipeline creation (that biome doesn't exist until MC
  1.21.4), so its lighting pipeline never fully initialized. Downgraded
  to v1.1 (predates the biome), confirmed crash gone from
  `logs/latest.log`. **Still reported too dark after that**, confirmed
  during the peaceful daytime gap specifically — maxed the day-specific
  intensity sliders directly in the `.glsl` (guaranteed to apply, not an
  external override file). **Still reported "far too dark" on both day
  AND night** — this ruled out the day/night-specific sliders entirely
  (night's were never touched) and pointed at a day/night-agnostic
  lever instead. Found `T_EXPOSURE` ("General Brightness" per the
  shader's own `.lang` file — a *different* variable name than v2.0.4
  used, which is why it was missed until now) and `AMBIENT_MULT`, both
  bumped well above default. All three fixes are baked into
  `Spooklementary_TDM_tuned.zip`'s `.glsl` defaults. This is a
  locally-modified shader now, not a clean upstream download — see
  `docs/MODS.md`'s Spooklementary entry.
- **Fog command chat spam fixed** — YetGamer's Custom Fog prints a
  confirmation message on every `/fog` call by default, and
  `border_fog.js` calls it up to 4x/second near the border. Silenced via
  `gamerule sendCommandFeedback false` (the mod's own documented
  mechanism for this), set once per server start in `border_fog.js` via
  `ServerEvents.loaded` — takes effect on the next relaunch even for an
  already-started save.
- **Day confirmed fixed. Shadows far too dark, night still way too
  dark** — two more specific rounds. Shadows: the shader's own docs warn
  `SHADOW_QUALITY`'s lowest tier (set for performance) "significantly
  downgrades shadows in multiple ways" — raised one tier, a real
  tradeoff against the performance ask, not free. Also raised
  `MINIMUM_LIGHT_MODE` ("Cave Lighting") so shadow-starved areas get
  fill light regardless of the player's own Brightness slider. Night:
  `LIGHT_NIGHT_I`/`ATM_NIGHT_I` had been deliberately left alone every
  round on the assumption night should stay moody — two explicit "too
  dark" reports specifically naming night made clear that assumption
  was wrong, bumped both to max, same as day's sliders.
- **Overcorrected — "shadow is like a bright white light"** — several
  brightness boosts got stacked across rounds without ever pulling any
  back. Pulled back the two most directly tied to shadow brightness
  specifically: `AMBIENT_MULT` (ambient fill light literally reaches
  shadowed areas by definition) `170`→`110`, and `MINIMUM_LIGHT_MODE`
  (added at its most aggressive tier the same round this broke) `4`→`3`.
  `T_EXPOSURE` left alone since day is confirmed correct at its current
  value. See `docs/MODS.md`'s Spooklementary entry for the lesson on
  why this whiplash happened.
- **Stopped guessing, pulled real reference values** — user pushed back
  after the whiplash: "look at other modpacks' shader settings." Found
  genuine community guidance specific to Spooklementary (not generic):
  disable real-time shadows entirely, since this shader's own cloudy/
  foggy look makes cast shadows read as "odd and out of place" — done
  (`REALTIME_SHADOWS` off, a single clean toggle, costs nothing since
  lightshafts were already disabled). Also applied a real community-
  sourced tonemap curve pair (`T_LOWER_CURVE`/`T_UPPER_CURVE` →
  `1.30`/`1.50`) for brightening shadowed areas without blowing out
  highlights, instead of another guessed number.
- **That made it worse — "shadows are bright lights, barely playable."**
  By this point nearly every brightness lever was stacked near its max
  at once (`T_EXPOSURE` close to its ceiling, all day *and* night light
  intensities maxed) while `REALTIME_SHADOWS` was off — so there was
  nothing left to darken occluded surfaces, and shaded geometry rendered
  as blown-out as direct light. Fixed with a full reset rather than one
  more offsetting tweak: shadows re-enabled, and every stacked
  multiplier pulled back to at-or-near default (`T_EXPOSURE` down to a
  modest `1.70` instead of near-max, day sliders back to `1.20` from a
  maxed `2.00`, night sliders to `1.40`). See `docs/MODS.md`'s
  Spooklementary entry for the full before/after values. **Not yet
  re-tested in-game.**
- **"All too dark again" after that reset — confirmed Spooklementary is
  dark by design, not misconfigured.** Multiple sources agree the
  shader is deliberately moody/dark, and exposes exactly one intended
  brightness control in its own UI ("General Brightness" = `T_EXPOSURE`).
  The real mistake across the whole saga was spreading the brightness
  fix across five different levers instead of using that one. Reset
  every other lever to Spooklementary's true default and raised only
  `T_EXPOSURE` (1.70→2.50) as the single day+night brightness fix.
  User was given a real choice here — keep fighting Spooklementary's
  dark-by-design defaults with this one lever, or drop it for base
  Complementary Unbound (not built around darkness, same loader) at the
  cost of the spooky aesthetic — and chose to stay with Spooklementary.
  See `docs/MODS.md`'s Spooklementary entry. **Not yet re-tested
  in-game.**
- **"Shadows are pitch black" — shadows removed entirely per explicit
  direction, not more tuning.** `T_EXPOSURE` is applied after lighting,
  so it can't lift a shadow-mapped pixel that's already computing
  near-zero direct light — the only real fix was removing shadow
  occlusion at the source. `REALTIME_SHADOWS` disabled again, but this
  time with every other brightness lever at true default (only
  `T_EXPOSURE` elevated), unlike round 8 where five levers were stacked
  at once when shadows were last disabled — much less likely to repeat
  the "bright white light" blowout. See `docs/MODS.md`'s Spooklementary
  entry. **Not yet re-tested in-game.**
- **Shaders removed entirely (2026-08-20).** After eleven rounds of
  tuning converged on a defensible state, the verdict was about feel,
  not any remaining number: "im just not feeling the whole shader feel
  now." Oculus and the tuned Spooklementary shaderpack are gone from
  both the tracked pack and the live instance — this pack no longer
  uses shaders at all. **Kept**: the worldborder texture override and
  `border_fog.js`'s `/fog`-based fog (wave-state and peacetime border
  proximity) — both run on YetGamer's Custom Fog, unrelated to Oculus/
  Iris, so they're unaffected. See `docs/MODS.md`'s Spooklementary entry
  and `docs/IDEAS.md`'s Shaders sub-section for the full history — this
  is closed, not paused.
- Performance audit (2026-08-20, requested explicitly, twice): first
  pass downgraded Spooklementary from its shipped `profile.HIGH` to
  `profile.MEDIUM` via a settings override, then to `profile.LOW` when
  asked for more — both eventually baked directly into the shader's
  `.glsl` defaults alongside the darkness fix, once the override
  mechanism itself came into doubt. Also fixed an unthrottled
  full-entity-list scan in `wave_status.js` running every tick
  regardless of wave state (now every 4 ticks, matching
  `mob_aggro.js`'s existing throttle pattern). **None of this — darkness
  or performance — has been re-tested in-game yet.**
- **Wave-clear orchestration built (2026-08-20)** — three features
  requested together: the roguelike permanent buff choice (clickable
  chat menu, three buffs, repeat picks stack via effect amplifier), a
  3-minute countdown to the next wave, and Blood Moon boss waves (wave 5
  onward — a distinct title and denser fog, not a harder mob roster).
- **Buff choice removed, same day, after real playtesting (2026-08-20)**
  — "too buggy... make sure it doesn't block me from summaning a wave...
  next wave timer... simply not working." The chat-menu click detection
  never actually worked (the exact risk flagged when it was built), which
  left the choice permanently unanswered after every wave clear — this
  silently blocked the Wave Horn *and* the countdown (which only started
  once the choice resolved), so both other symptoms were downstream of
  this one bug. Removed the whole system rather than debug the click
  detection further; gear removal and the countdown now fire directly on
  wave-clear again, no choice step in between. See `docs/MODS.md`'s
  Wave-clear orchestration entry for the full story. **This should be
  what makes the countdown actually work — not yet re-tested.**
- **Fixed spawn point built (2026-08-20)** — every new world now spawns
  at a pinned point near world origin instead of wherever vanilla
  happened to scatter you, with `spawnRadius 0` so respawns land exactly
  there too. See `docs/MODS.md`'s Fixed spawn entry for why the building
  itself still uses `/fill`/`/setblock` rather than a `.nbt` template.
  **Only affects brand-new worlds** — your current test world already
  had its first login, so this needs a fresh world to check, not a
  relaunch. Worth confirming on that fresh world: the player actually
  lands standing on solid ground (not floating/underground), and the
  starter base/worldborder are both correctly centered on the new fixed
  point.
- **Switched to real (non-flat) terrain, same day — this changes the
  ground-finding mechanism.** The original version above read the
  player's own natural spawn Y directly, which only worked because
  Superflat height is uniform everywhere. Real Desert terrain varies
  within vanilla's default spawn-scatter radius, so that reasoning no
  longer holds — replaced with `/spreadplayers` (vanilla's real
  heightmap-aware "place on solid ground here" command) before reading
  position. **Confirmed working enough to playtest** — surfaced two real
  problems instead, both since fixed (see the next two bullets).
- **"Enemies are falling from the sky" — fixed (2026-08-20).** The
  gravity-drop mob-height fix above was technically correct but looked
  wrong in an actual playtest — mobs are supposed to read as menacingly
  approaching, not literally raining in. Replaced with a silent
  `/spreadplayers`-based correction (tag the just-summoned mob
  uniquely, spread it onto the real surface instantly, clear the tag) —
  see `docs/MODS.md`'s Fixed spawn entry for the full mechanism. **Not
  yet re-tested** — the biggest open question is whether
  `/spreadplayers` actually works on a tagged mob selector the same way
  it does on players (reasoned, not directly confirmed); if mobs don't
  move after summoning, that's the first thing to check.
- **"Enemies always spawn within the border, i want them to approach
  menacingly from beyond the border" — took two attempts to actually
  fix (2026-08-20).** Direct catch against `docs/IDEAS.md`'s own Fog
  Wall design ("enemies spawn from beyond the fog line, not inside the
  play area"). First fix still spawned mobs just *inside* the edge, not
  beyond it — wrong, per direct correction ("no not inside the
  border!!! spawn outside"). That mistake came from wrongly assuming
  vanilla's worldborder blocks all entity movement across it the way it
  blocks players — it doesn't; only *player* movement is clamped, mobs
  path across it freely under normal AI. **Real fix**: mobs now spawn
  6-14 blocks genuinely beyond a random edge of the border and walk in;
  `mob_aggro.js`'s existing unconditional `setTarget()` keeps them
  beelining for the player over the distance. Border damage (which
  would otherwise chip mobs/the player near the edge) is disabled once
  per world. **Your current test world won't have that disable applied
  automatically** (it only fires on first login) — run
  `/worldborder damage amount 0` manually to match. **Not yet
  re-tested in-game.**
- **First real terrain playtest crashed the whole starter-kit script
  (2026-08-20)** — a duplicate `const half` declaration (leftover from
  stacking edits) failed to parse entirely, so none of
  `playtest_starter_kit.js` ran: no gear, no fixed spawn, no starter
  base, no worldborder/mob-spawning setup. Explains three symptoms
  reported from one test as a single root cause, not three bugs: "wave
  0" showing (natural mobs, never disabled), no starter structure
  (script never got that far), spawning near water (vanilla's own
  unmodified spawn). Fixed, and `node --check` adopted as a pre-deploy
  step for every script edit going forward — see `docs/MODS.md`'s Fixed
  spawn entry.
- **Real terrain reverted back to Superflat, same day** — Desert biome
  generation (dunes, ravines, real structures) read as "wonky, doesn't
  suit the gameplay" once actually played, not just built. The
  `/spreadplayers`-based height-finding and the mob-spawn-beyond-border
  fixes above are **kept** (both work correctly on flat terrain too, no
  downside), only the world generator itself and the now-unnecessary
  wide-flatten pass were reverted. Deliberately "for now," not closed —
  see `docs/IDEAS.md`'s Seed research section if real terrain comes back
  up. **Not yet re-tested in-game.**
