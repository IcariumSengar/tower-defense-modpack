// Links the starter power blocks into one Flux Network, "House Grid", on the
// first login: the Flux Plug on the culinary generator, the Basic Flux
// Storage beside it, and the Flux Point that feeds the starter Tesla Coil.
// Positions come from worldData() (world_state.js), where
// playtest_starter_kit.js records them. The generator is not a Flux Networks
// block; the plug takes its power through their shared face.
//
// FluxNetworkData.createNetwork() needs a Player to own the network, so the
// link waits for a login instead of running at world build.
// playtest_starter_kit.js calls linkStarterFluxNetwork() again after moving
// these blocks, because a moved block gets a new tile entity with no
// network. Each call creates a new network.
function linkStarterFluxNetwork(player, level, data) {
  try {
    // Flux Networks' classes are reached by reflection, via resolveClass,
    // findMethodByNameAndShape and boxInt from playtest_starter_kit.js.
    var dataCls = resolveClass(player, 'sonar.fluxnetworks.common.connection.FluxNetworkData')
    var getInstance = findMethodByNameAndShape(dataCls, 'getInstance', 0, 'sonar.fluxnetworks.common.connection.FluxNetworkData', null)
    var networkData = getInstance.invoke(null, [])

    var secCls = resolveClass(player, 'sonar.fluxnetworks.api.network.SecurityLevel')
    var secValueOf = findMethodByNameAndShape(secCls, 'valueOf', 1, 'sonar.fluxnetworks.api.network.SecurityLevel', ['java.lang.String'])
    // The owner is whoever logged in first. On a PUBLIC network every other
    // player gets USER access, so they can open these blocks and join their
    // own Flux Points; a PRIVATE one blocks everyone but the owner. Editing or
    // deleting the network still needs the owner (or an admin they add).
    var securityPublic = secValueOf.invoke(null, ['PUBLIC'])

    // createNetwork(owner, name, colour, security level, password)
    var createNetwork = findMethodByNameAndShape(dataCls, 'createNetwork', 5, 'sonar.fluxnetworks.common.connection.FluxNetwork', [
      'net.minecraft.world.entity.player.Player', 'java.lang.String', 'int', 'sonar.fluxnetworks.api.network.SecurityLevel', 'java.lang.String',
    ])
    var network = createNetwork.invoke(networkData, [player, 'House Grid', boxInt(player, 0x3399ff), securityPublic, ''])

    var getNetworkID = findMethodByNameAndShape(network.getClass(), 'getNetworkID', 0, 'int', null)
    var networkId = parseInt(`${getNetworkID.invoke(network, [])}`, 10)

    var linked = []
    // Members link wirelessly, so the coil's Flux Point can sit far from the
    // generator. With no starter Flux Point (keys missing read as 0,0,0, or the
    // block already removed) the lookup normally finds no tile and skips it.
    ;['td_fluxPlug', 'td_fluxBattery', 'td_starterTeslaFluxPoint'].forEach((prefix) => {
      var x = data.getInt(`${prefix}X`)
      var y = data.getInt(`${prefix}Y`)
      var z = data.getInt(`${prefix}Z`)
      var tile = level.getBlockEntity([x, y, z])
      if (!tile) {
        console.error(`starter_flux_network.js: no block entity at ${x} ${y} ${z} (${prefix}) - can't connect it`)
        return
      }
      // connect() links the loaded tile live. Writing networkID into its NBT
      // instead would only take effect once the tile reloaded.
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
  // Set before linking, so a failed link is not retried on later logins.
  data.putBoolean('td_starterFluxNetworkLinked', true)
  linkStarterFluxNetwork(player, level, data)
})
