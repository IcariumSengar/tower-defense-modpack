// The Wave Horn — right-click to summon the next wave. See
// server_scripts/wave_spawner.js for the actual spawning logic. Not
// consumed on use, unlike the loot bags.

StartupEvents.registry('item', (event) => {
  event.create('wave_horn', 'basic').tooltip('§6Right-click to summon the next wave')
})
