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
- **Starter base**: a small walled box (11×11, cobblestone walls, stone
  brick floor, oak door) built around wherever you spawn.
- **Worldborder set to 50**, centered on your actual spawn point (not
  the world's default 0,0). Grows automatically by 5 blocks every 2
  waves cleared after that (`base_expansion.js`).
- **Natural mob spawning disabled** (`doMobSpawning` gamerule) — the Wave
  Horn is the only mob source now. Note this also stops passive mobs
  (cows, etc.) since vanilla has no separate hostile-only toggle.

This only triggers on a **brand new world** — it won't retroactively fire
on a world you've already joined once.

## Manual setup (once per new world)

Only the world-creation screen itself, which nothing can automate:
**World Type: Superflat**, **Allow Cheats: ON** — flat terrain means no
generation lag and clear sightlines to see hordes coming.

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
   — repeats for calls beyond wave 5

The horn refuses to summon again while mobs from the current wave are
still alive nearby — clear the wave first. Action bar shows a live
"Hostiles remaining" count; chat announces when a wave starts (with mob
count) and when it clears.

Calling the horn also forces night and locks the day/night cycle (so
zombies/skeletons don't burn on spawn or catch fire mid-fight) — it
switches back to day and lets the cycle run normally again once the
wave is cleared.

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
