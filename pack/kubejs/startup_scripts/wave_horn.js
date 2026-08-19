// The Wave Horn — right-click to summon the next wave. See
// server_scripts/wave_spawner.js for the spawning logic.
//
// Deliberately a plain custom item, not vanilla's Goat Horn — Goat Horn
// has a real vanilla cooldown mechanic, and ItemEvents.rightClicked
// simply never fires at all while an item is on cooldown (confirmed
// from KubeJSItemEventHandler.java's own dispatch logic). That silently
// blocked every use after the first. A plain custom item has no
// cooldown, so the event always fires — wave_spawner.js plays a manual
// sound effect to keep the "horn" feel without vanilla's cooldown-gated
// behavior. Texture is a known placeholder until real art is added
// (same tradeoff already accepted for the loot bags).

StartupEvents.registry('item', (event) => {
  event.create('wave_horn', 'basic').tooltip('§6Right-click to summon the next wave')
})
