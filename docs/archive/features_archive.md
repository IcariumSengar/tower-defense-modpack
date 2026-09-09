# Features archive

Sections moved out of `docs/FEATURES.md` because they're explicitly closed
(retired, superseded, or resolved) in their own text — kept here verbatim,
just relocated, so the active doc stays focused on open work. Each moved
section left a one-line pointer at its original location in FEATURES.md.

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
