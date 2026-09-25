# Build Queue

A simple lookup for the implementation session: what's actually ready
to build right now, in priority order. Each entry links to its full
spec in [FEATURES.md](FEATURES.md) rather than repeating it here — this
file only tracks *what's next and how ready it is*, not the design
itself.

**Lifecycle**: an idea starts raw in [IDEAS.md](IDEAS.md) → once it's a
real, fleshed-out design it moves into FEATURES.md marked *planned* →
if it's actually unblocked and ready to act on, it gets a line here →
whoever builds it flips the FEATURES.md entry to *live* and removes the
line from this file. Don't queue something that's still genuinely
unresolved (open forks, undecided mod picks) — flesh it out in
IDEAS.md/FEATURES.md first.

**Cleaned up 2026-09-01** — this file had accumulated stale entries for
things confirmed working, things superseded by later redesigns, and
a duplicate leftover from before the desert-drop rebuild. Trimmed to
reflect actual current status.

**Cleaned up again 2026-09-16** — two weeks of session history had
re-accumulated since the last pass (this file had grown to a full
chronological journal of every playtest batch and build session, almost
all of it describing work that's already done and confirmed). The full
pre-cleanup content — real design decisions, root-cause writeups,
decompile findings, all of it genuinely worth looking up later — is
archived verbatim at
[docs/archive/queue-history-2026-09.md](archive/queue-history-2026-09.md).
Trimmed here to only what's genuinely still open.

---

## Awaiting real-play confirmation

Built and (unless noted) already deployed to the live instance/dedicated
server — nobody has actually confirmed these work in a real session yet.

- **Six-item playtest batch** (2026-09-22) — (1) airdrop: beacon beam
  on the crate, Xaero share line (click Add), plane crosses the base
  from the west, crate 50-70 from the pedestal; (2) the wave-5 clear no
  longer crashes (Rhino `const` in a nested block), so the countdown
  runs after wave 5; (3) electrified fence shocks wave mobs standing
  next to it; (4) `ImmersiveEngineering-1.20.1-10.2.0-183-tdcoilfilter.jar`:
  Tesla Coils never target players or Sentries; (5) Epic Siege digging
  no longer needs tools + Haste XV on wave mobs (4x dig speed); (6) the
  Engineer's Manual quest and the Diesel Generator wording are gone.
  Sandbox-verified where a no-player server can (script load, coil
  targeting, fence shock, dig config, airdrop `free` command + beacon);
  needs a real session. Details: PLAYTESTING.md "Not yet confirmed in
  real play".
- **Three-front fort + cafe4 command post + wall platforms**
  (2026-09-22) — pedestal moved to 9 from the gate, compound 19 wide,
  one fixed collapsed section per flank (fenced until wave 5 like the
  gate), the Abandoned Brick House replaced by `the_lost_city:cafe4`
  (rotated to face the yard, 4 baked villagers stripped, glass on the
  yard face upstairs, rig/double chest/barrels/horn inside), gate
  platform halves + one flank post per side with ladders. Sandbox-
  verified on a fresh world (50 block probes), not yet seen by a real
  player. **Fresh worlds only.** Spec + build notes: FEATURES.md
  "Three-front fort" under Base & structures. Things to look at: does
  the yard read right from the gate; waves 1-4 piling on three fences;
  stand on a platform and get a mob to climb the ladder; whether the
  boarded cafe is too dark inside.
- **Starter trap showcase polish** (2026-09-15) — Tesla Coil stood
  upright with a lever toggle (was lying on its side, redstone-block
  powered), the Sentry no longer drops its own item when removed at wave
  5, a real stun-bypass fix (coil/fence no longer stun on top of not
  damaging), cooler zap/muzzle-flash cinematics, the coil moved onto the
  front wall next to the Sentry, the starter flux rig moved to the
  house's exterior wall near the balcony, and the starter fence now
  fully seals the gate gap. Not yet seen in a real restart. Open
  sub-decision: if the coil's 9-block player/Sentry power-cutoff radius
  feels idle too often mid-fight, narrow it back toward its actual
  6-block kill range. **Moot 2026-09-22**: that cutoff is gone - the
  patched IE jar excludes players/Sentries at the source and the script
  is back to enemy-only power on a 20-tick poll.
- **Airdrop flyover + landing beacon** (2026-09-15) — flyover lengthened
  to ~10s (patched the plane mod's own self-destruct cap), plus a
  landing light-column/particle beacon and periodic re-draw so a landed
  crate is easy to find from a distance. Not yet sandbox-booted or seen
  in a real wave-5/10/15 drop. **Superseded 2026-09-22** by the airdrop
  rebuild in the six-item batch above.
- **Tier 4: Open Modular Turrets Reborn** (2026-09-15/16) — Grenade
  Turret + Rocket Turret added as Tier 4, plus a player/block
  explosion-safety fix for the Grenade Turret. Not yet confirmed in a
  real client session. Full spec in FEATURES.md's "Machine progression
  (Tier 3-4)" entry — not repeated here.
- **Tier 2 trap iron-cost trim** (2026-09-11) — Sentry/Cage Trap/I.M.S.
  iron costs cut (Sentry 36→20, Cage Trap 28→~12, I.M.S. 24→16). Needs a
  real-play confirmation the costs feel right at a normal wave-clearing
  pace.
- **Mine player-safety fix** (2026-09-11) — Bouncing Betty/Claymore
  explosions should no longer hurt the player or destroy their own
  blocks (`mine_player_safety.js`). Unconfirmed live — trigger one near
  your own build and check.
- **Tier 3 Culinary Generator power economy** (2026-09-11) — the power
  math itself is confirmed working live (real FE generation, correct
  rate). Still open: whether building/upgrading multiple generators in
  parallel reads as a real base-building investment or just busywork —
  a real-play judgment call, not something a sandbox boot can answer.
- **Structure loot pass** (2026-09-11) — scavenge sub-tables,
  empty-barrel fix, and loot-table trim all shipped. Needs a real client
  pass: open a Lost City store chest through Lootr, open an empty
  barrel, confirm a barrel *you* place far from base doesn't self-fill,
  and check JEI shows the new Tier 3 recipes.
- **Ladder-climb mob assist** (rebuilt 2026-09-10) — `mob_aggro.js` now
  lets a wave mob keep a player-assigned target for 8s after being hit,
  instead of the pedestal-marker re-assert silently defeating the climb
  attempt every 10 ticks. Needs the next play session to confirm: stand
  on a wall, shoot a mob, watch whether it actually climbs the ladder to
  reach you. (Wide mobs — Mutant Brute/Mutant Zombie — physically can't
  fit a 1-block ladder column and never will; standard-size mobs should.)

## Small decisions needed (not build-blocked, just undecided)

- **Crafting Station's inventory panel blocks JEI bookmarks** — no
  drop-in fix exists on Forge 1.20.1 (checked every Tinkers-style
  crafting-station spinoff; the one no-panel mod, Nearby Crafting, has
  no Forge 1.20.1 build). Options on the table: Sophisticated Storage's
  own `crafting_upgrade` (already installed, zero extra footprint),
  Tom's Simple Storage's crafting terminal (one new jar), or just a
  lower GUI scale. Your call.
- **Inventory Sorter's middle-click sort is unreliable in some
  containers** — real cause found: it only sorts the section you
  clicked in (never the hotbar), and inside a Sophisticated Storage
  container its sort competes with Sophisticated Core's own
  middle-click sort instead. Proposed fix: install Inventory Profiles
  Next (explicit on-screen Sort buttons, nothing to aim) and remove
  Inventory Sorter. Not installed — say the word if you want it swapped.
- **Anchor-site biome preference — admit plains too?** — the base-site
  search (`BARE_WASTELAND_BIOMES` in `playtest_starter_kit.js`) only
  accepts desert/badlands anchor points. Left open on purpose during the
  2026-09-10 wasteland re-skin: now that badlands itself was reskinned
  to a dead-grass wasteland look, should the search also accept plains,
  or is desert/badlands-only worth keeping as the pickier default?

## Waiting on you, not on a build

- **Reported "constant" lag** (2026-09-11) — traced to host RAM
  pressure, not modpack code: the CurseForge instance requests a 10GB
  heap but this machine only has ~3.4GB free at idle with nothing else
  running. No code fix pending. Two real levers, your call: close other
  heavy apps (this session/VS Code, ~2.3GB) while playing, and/or lower
  the CurseForge instance's allocated RAM below 10GB in its settings.
  Report back whether either actually helps.
