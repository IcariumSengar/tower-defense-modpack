// Enhanced Hordes install (2026-09-08, WWZ-style zombie stacking/climbing,
// unconditional per direct instruction - not late-wave-gated). Real mod:
// CurseForge `nojustgavin`, `eh2.0-forge1.20.1.jar` (project 899308, file
// 8362601, real modId `enhanced_hordes` - confirmed from the jar's own
// mods.toml, not guessed). No mandatory dependencies beyond minecraft
// itself. Genuinely tiny (a ~51KB MCreator mod - a handful of tick
// procedures plus two data-pack tag files), not the heavier system the
// research doc implied.
//
// Real config schema, confirmed by decompiling the jar directly (there is
// NO config toml at all for this mod - every knob is either a vanilla
// `/gamerule` or a data-pack tag):
// - `/gamerule hordeStacking` (default true) - the actual WWZ climb-assist
//   effect: every tick, an entity tagged `forge:hordes` that's touching
//   another `forge:hordes` entity gets a small upward velocity nudge -
//   this is the mechanic that was actually asked for. Left at its default
//   (true).
// - `/gamerule hordeMultiplying` (default true) - a SEPARATE, unrelated
//   mechanic: a `forge:hordes` entity with a live target, standing on a
//   `forge:hidden_zombie_blocks`-tagged block (dirt/sand/grass/etc), can
//   spontaneously dig an EXTRA zombie out of the ground after a short
//   "thinking" delay - a real autonomous mob-spawning system layered on
//   top of the base climbing effect. **Judgment call: disabled below**,
//   set via `/gamerule hordeMultiplying false` on server load. This pack
//   has a standing caution (see [[feedback_mod_readd_caution]]) against
//   any mod adding its own autonomous spawn system on top of the
//   hand-authored wave/horde spawning already in place - an extra zombie
//   materializing out of the ground would be invisible to
//   wave_status.js's own "hostiles remaining" actionbar counter and
//   un-targeted by mob_aggro.js's pedestal-redirect, the same class of
//   bug this pack has fixed before for other untracked spawns. Disabling
//   it keeps only the pure stacking/climbing visual effect that was
//   actually requested.
// - `hordeSmashingPower` gamerule (default 4) governs a block-destruction
//   mechanic, but it's double-gated and never actually threatens this
//   pack's real building materials: (1) it requires vanilla `mobGriefing`
//   to be true, AND (2) the blocks it can ever destroy are limited to a
//   small, hardcoded ALLOWLIST tag (`forge:horde_breakable` - confirmed
//   by reading the jar's own shipped
//   data/forge/tags/blocks/horde_breakable.json directly) containing only
//   soft/decorative blocks: leaves, crops, glass, ice, sea lantern, etc.
//   No stone, wood, cobblestone, SecurityCraft reinforced block, or any
//   other real wall/floor/gate material is in that list. Left at default -
//   the perimeter walls, the pedestal, and every placed Tier 1+ machine
//   stay exactly as exposed (or not) to this as they already were; this
//   mechanic is structurally incapable of touching them regardless of the
//   power number.
//
// Real participant list, also confirmed from the jar's own shipped
// data/forge/tags/entity_types/hordes.json (NOT the research's invented
// `horde_settings` block): zombie, zombie_villager, zombified_piglin,
// husk, drowned, slime - all 5 non-slime entries are already central to
// this pack's early/mid-wave composition (wave_spawner.js's WAVES 1-3
// alone use zombie/husk/drowned/zombie_villager heavily) per the
// 2026-09-06 zombie-apocalypse roster pivot. **Deliberately NOT extended**
// to Undead Nights' or Mutants and Zombies' own mob ids in this pass - see
// the Advanced Wall Climber API note below for why, and because doing so
// would apply an untested mechanic (this mod was only ever built/tested
// against vanilla zombie-family AI/entity classes) to modded entities with
// their own custom AI, a real risk not worth taking blind. Flagged as a
// possible future follow-up once the base mechanic is playtest-confirmed,
// not decided against permanently.
//
// **Advanced Wall Climber API conflict check, done via decompile, not
// assumed**: Mutants and Zombies' Crawler (the one mob in this pack that
// already climbs walls, via the separately-installed Advanced Wall Climber
// API) implements climbing entirely through its own
// `com.nyfaria.awcapi.entity.ClimberComponent` / `ClimberPathNavigator` -
// a dedicated PathNavigation replacement, completely independent of
// Enhanced Hordes' own tick-based nudge mechanic. Since
// `mutantszombies:crawler` is NOT in Enhanced Hordes' `forge:hordes` tag
// (confirmed above) and Enhanced Hordes' own code never touches
// PathNavigation at all (it only ever calls `setDeltaMovement` on
// `forge:hordes`-tagged entities), the two mods operate on fully disjoint
// entity sets through fully disjoint mechanisms - zero shared classes,
// zero shared tags, zero collision risk. Both can be installed safely.
ServerEvents.loaded((event) => {
  event.server.runCommandSilent('gamerule hordeMultiplying false')
})
