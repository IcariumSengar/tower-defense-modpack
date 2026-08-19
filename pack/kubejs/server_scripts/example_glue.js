// Example patterns — replace with real glue once mods are picked.

ServerEvents.recipes(event => {
    // Recipe bridge: let an item from mod A be crafted/smelted using
    // something from mod B, tying two mods' progression together.
    // event.shaped('minecraft:iron_ingot', [...], {...})
    // event.remove({ output: 'somemod:some_item' })
})

ServerEvents.tags('item', event => {
    // Tag merge: add items from mod B into a tag mod A reads from,
    // so mod A's recipes/behavior pick them up automatically.
    // event.get('forge:ingots/example').add('somemod:some_ingot')
})
