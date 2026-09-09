// Grows the worldborder on every WAVE CLEARED, by an escalating amount —
// the progression
// trigger for the "custom world" idea in docs/IDEAS.md. Originally
// implemented as "nights survived" since that was the best available
// proxy before the Wave Horn system existed (waves were going to be
// driven by Pure Suffering's night-gated invasions at the time) — but
// the actual original intent was always "waves," and now that
// wave_status.js tracks real wave clear/incoming state directly, this
// switched to the real signal instead of the old proxy.
//
// Watches wave_status.js's `td_inWave` flag (true -> false transition)
// rather than re-scanning for nearby hostiles itself — that scan
// already happens once per tick in wave_status.js, no need to duplicate
// it here. Order between the two files' PlayerEvents.tick handlers
// within the same tick isn't guaranteed, so this can lag the real
// transition by up to one tick (~50ms) — not noticeable.
//
// Counter lives on the permanent pedestal marker entity's own persistent
// data (see world_state.js), not a player's. **Changed 2026-09-08, real
// multiplayer fix** — this used to live on player.persistentData, which
// desynced per player the moment a second player was involved (each
// online player's own tick handler would read/write a separate copy of
// td_inWave/td_waveNumber). KubeJS's server/level-scoped persistentData
// was checked against its own source (MinecraftServerMixin.java) and
// found to have no save/load hook at all — a plain in-memory CompoundTag
// that resets on every restart — so that's still not usable here either;
// the marker entity's own persistentData is durable (real per-Entity NBT,
// confirmed via decompiling this pack's exact KubeJS build — see
// world_state.js's header) AND genuinely shared, unlike either alternative.
// Multiple online players' tick handlers hitting this same shared flag in
// one tick self-guards correctly: whichever player's handler runs first
// flips td_wasInWaveForExpansion before the next player's handler reads
// it, so the transition only ever fires once per real wave-clear
// regardless of how many players are online — Minecraft's server tick is
// single-threaded, so there's no real race window between them.
//
// Runs the worldborder command via player.getServer().runCommandSilent
// (console-level, always full permission), not player.runCommandSilent
// (the player's own permission level, which may not be enough even with
// cheats nominally on).

var EXPANSION_TIME_SECONDS = 10

// Escalating growth curve, reduced again 2026-09-02 (real playtest
// feedback: "the world border is expanding too quickly" - given AFTER
// already experiencing the 2026-09-01 cut below, not against the
// original 2026-08-31 numbers, so this needed to be genuinely slower
// than 2026-09-01's own result, not just re-derive something close to
// it). 2026-08-31 original: 20 + 5*step, 20/20/25/25/30/30/35/35,
// cumulative 220, ending at 270. 2026-09-01 cut: 10 + 3*step,
// 10/10/13/13/16/16/19/19, cumulative 116, ending at 166 - still not
// flat enough early per this feedback. Regrouped to a 3-wave step
// (matching the paired "exploration pacing" retune's own back-loaded
// framing, docs/FEATURES.md's "Growth curve retune") instead of a
// 2-wave one, and cut the per-step amount too: 5/5/5/10/10/10/15/15
// across waves 1-8, cumulative 75, ending at 125 by wave 8 - waves 1-3
// (the ones driving the "reachable from wave 1" complaint) now add only
// 15 total, vs 33 under the 09-01 cut and 65 under the original.
// Continues the same escalating pattern into the endless phase past
// wave 8, same as before.
function expansionForWave(waveNumber) {
  return 5 + 5 * Math.floor((waveNumber - 1) / 3)
}

PlayerEvents.tick(function (event) {
  var player = event.entity
  var data = worldData(player.getLevel())
  if (!data) return

  var wasInWave = data.getBoolean('td_wasInWaveForExpansion')
  var isInWave = data.getBoolean('td_inWave')

  data.putBoolean('td_wasInWaveForExpansion', isInWave)

  // Only react to the true -> false transition (a wave just cleared).
  if (!wasInWave || isInWave) return

  // wave_spawner.js increments td_waveNumber at spawn time and never
  // decrements it, so at the moment a wave clears this already holds
  // the number of the wave that just ended.
  var waveNumber = data.getInt('td_waveNumber')
  var expansionBlocks = expansionForWave(waveNumber)

  player.getServer().runCommandSilent(`worldborder add ${expansionBlocks} ${EXPANSION_TIME_SECONDS}`)
  // Toast, not chat (2026-09-09, real playtest ask: "less noise from the
  // chat window") - no existing title/popup covers this specific number,
  // unlike most of this pack's other wave-clear messages.
  player.notify(`§6Base Expansion §f- the border grows by ${expansionBlocks} blocks.`)
})
