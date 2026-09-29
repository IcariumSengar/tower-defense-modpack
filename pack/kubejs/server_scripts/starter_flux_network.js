// Starter flux network auto-link, 2026-09-11 - wires the 3 pre-placed
// blocks (bio generator/flux plug/basic flux storage, see
// playtest_starter_kit.js's "Starter power rig") into a real, live Flux
// Network on first login, so "the flux network is already set up" is
// literally true from the start of a run, not just three touching blocks.
//
// Deferred to PlayerEvents.loggedIn rather than world-build time - no
// player exists then, and FluxNetworkData#createNetwork requires a real
// Player argument (used for ownership, not a null-safe formality -
// decompiled and confirmed real from the installed
// FluxNetworks-1.20.1-7.2.1.15.jar, not guessed).
//
// Real Java reflection, same bootstrap this pack already uses
// (playtest_starter_kit.js's resolveClass/findMethodByNameAndShape/
// boxInt, itself modeled on mob_aggro.js's own version) - top-level
// FUNCTIONS reliably share across server_scripts files in this exact
// KubeJS build, so this file calls those directly rather than
// redeclaring its own copies (would risk exactly the shape-collision bug
// documented in mob_aggro.js's own header comment).
//
// Real API surface, decompiled directly from
// sonar/fluxnetworks/common/connection/FluxNetworkData.class and
// sonar/fluxnetworks/api/network/SecurityLevel.class, not guessed:
// - FluxNetworkData.getInstance() - static, 0 args, returns FluxNetworkData
// - createNetwork(Player, String, int, SecurityLevel, String) - instance
//   method, returns FluxNetwork
// - FluxNetwork.getNetworkID() - instance, 0 args, returns int
// - SecurityLevel.valueOf(String) - static, 1 arg, same Enum.valueOf
//   pattern already proven via this pack's own boxInt/boxBool
//
// Only the Flux Plug and Basic Flux Storage get linked - both are real
// TileFluxDevice subtypes (decompiled, confirmed). The Culinary Generator
// itself is Generator Galore's own block, not Flux Networks' - it has no
// network membership of its own; the Flux Plug reads its Forge Energy
// capability directly off the shared block face instead (that's the
// entire "no cables needed" point).
//
// **Real, sandbox-verified bug, first version of this file, 2026-09-11**:
// the first attempt linked each tile by `/data merge block ... {networkID
// :...}` - the reflection/createNetwork half worked perfectly (confirmed
// live: real network id returned, real method-shape matches on the first
// try), but the merge alone never took effect on the already-loaded tile
// this exact area is permanently forceloaded from world-build time
// onward, so the tile is never naturally reconstructed from NBT during a
// real session; a manual server restart proved the NBT value WAS correct
// and flux genuinely flowed once the tile reloaded and re-read it, but
// that reload would never happen in a real continuous playthrough - a
// player's first login would report success and silently move zero
// power forever. Root cause: raw NBT merge patches saved data, it
// doesn't call into the mod's own runtime connection bookkeeping.
//
// Real fix: `TileFluxDevice.connect(FluxNetwork)` (decompiled, public,
// unambiguous - the mod's own live-linking method, exactly what a normal
// tile reload calls internally) invoked DIRECTLY on the block entity
// object `level.getBlockEntity([x,y,z])` returns - no reflection dance
// needed for this part, since it's a public method on a public class,
// same "call it directly on the bound Java object" pattern already
// proven live in this codebase (amulet_pedestal.js's getDisplayedItem()).
// The `network` object already in hand from createNetwork() above is
// passed straight through - same real Java object, not re-derived.
//
// Failure is non-fatal by design: wrapped in try/catch, logs and returns
// rather than throwing. If this ever breaks (a future Flux Networks
// update renaming something), the 3 blocks stay physically placed and
// touching, and the player can link them by hand from each block's own
// screen (right-click the plug and battery, pick the network) - the mod's
// own normal, always-working path, not a special-cased fallback. (Until
// 2026-09-29 the starter kit also carried a Flux Configurator for this;
// it was removed on request.)
// Pulled out into its own function 2026-09-15 so the relocation migration
// in playtest_starter_kit.js's login handler (starter power rig moved to
// the exterior front wall, see that file's own header) can call this
// exact same create-network-and-link-3-devices logic directly, right
// after physically moving the blocks - a fresh `createNetwork()` call,
// not a reused old id, since the devices' old network membership is lost
// the moment their tile entities are destroyed by the move. Calling this
// directly sidesteps any cross-file PlayerEvents.loggedIn ordering
// question entirely (a second registered listener for the same login
// event could fire before or after this file's own, undocumented either
// way) - a plain synchronous function call has no such ambiguity.
function linkStarterFluxNetwork(player, level, data) {
  try {
    var dataCls = resolveClass(player, 'sonar.fluxnetworks.common.connection.FluxNetworkData')
    var getInstance = findMethodByNameAndShape(dataCls, 'getInstance', 0, 'sonar.fluxnetworks.common.connection.FluxNetworkData', null)
    var networkData = getInstance.invoke(null, [])

    var secCls = resolveClass(player, 'sonar.fluxnetworks.api.network.SecurityLevel')
    var secValueOf = findMethodByNameAndShape(secCls, 'valueOf', 1, 'sonar.fluxnetworks.api.network.SecurityLevel', ['java.lang.String'])
    var securityPrivate = secValueOf.invoke(null, ['PRIVATE'])

    var createNetwork = findMethodByNameAndShape(dataCls, 'createNetwork', 5, 'sonar.fluxnetworks.common.connection.FluxNetwork', [
      'net.minecraft.world.entity.player.Player', 'java.lang.String', 'int', 'sonar.fluxnetworks.api.network.SecurityLevel', 'java.lang.String',
    ])
    var network = createNetwork.invoke(networkData, [player, 'House Grid', boxInt(player, 0x3399ff), securityPrivate, ''])

    var getNetworkID = findMethodByNameAndShape(network.getClass(), 'getNetworkID', 0, 'int', null)
    var networkId = parseInt(`${getNetworkID.invoke(network, [])}`, 10)

    var linked = []
    // td_starterTeslaFluxPoint (2026-09-12) - the starter trap
    // showcase's own Flux Point (playtest_starter_kit.js's
    // placeStarterTraps()), linked into the exact same "House Grid"
    // network as the power rig's Plug/Battery. Flux Networks is
    // wireless between members - no proximity to the generator needed -
    // so this works regardless of how far the Tesla Coil actually sits
    // from the house. Missing on a save whose trap-showcase retrofit
    // deliberately skipped (already past GEAR_REMOVAL_WAVE - see
    // playtest_starter_kit.js's own retrofit comment) - getInt then
    // returns 0 for each coordinate and the loop below's own `if (!tile)`
    // guard logs and moves on rather than linking a bogus (0,0,0) tile,
    // same graceful-failure path as any other real lookup miss here.
    ;['td_fluxPlug', 'td_fluxBattery', 'td_starterTeslaFluxPoint'].forEach((prefix) => {
      var x = data.getInt(`${prefix}X`)
      var y = data.getInt(`${prefix}Y`)
      var z = data.getInt(`${prefix}Z`)
      var tile = level.getBlockEntity([x, y, z])
      if (!tile) {
        console.error(`starter_flux_network.js: no block entity at ${x} ${y} ${z} (${prefix}) - can't connect it`)
        return
      }
      tile.connect(network)
      linked.push(prefix)
    })

    console.log(`starter_flux_network.js: created network "House Grid" (id ${networkId}), connected: ${linked.join(', ')}`)
  } catch (e) {
    console.error(`starter_flux_network.js: auto-link failed (${e}) - the 3 blocks are still placed and touching; the player links them by hand from each block's own screen instead`)
  }
}

PlayerEvents.loggedIn((event) => {
  var player = event.player
  var level = player.getLevel()
  var data = worldData(level)
  if (!data) return
  if (data.getBoolean('td_starterFluxNetworkLinked')) return
  if (!data.contains('td_bioGeneratorX')) return
  data.putBoolean('td_starterFluxNetworkLinked', true)
  linkStarterFluxNetwork(player, level, data)
})
