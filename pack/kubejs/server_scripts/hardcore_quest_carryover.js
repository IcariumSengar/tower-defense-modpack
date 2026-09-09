// Automatic quest-progress carryover across worlds under the same
// modpack instance - direct question 2026-09-09: "on hardcore death or
// pedestal destruction, its game over... is it possible to keep quest
// book progress on a restart?" Upgraded from the manual-copy tip
// (world_state.js's tellQuestCarryoverTip) to a real automatic mechanism
// after a live sandbox test proved this build's Rhino sandbox can reach
// real java.nio.file.Files I/O outside the normal per-world save
// boundary. See reference_ftbquests_progress_storage.md for the
// underlying FTB Quests fact-finding (progress lives at
// <save>/ftbquests/<uuid>.snbt, no export/import API exists).
//
// hqc = Hardcore Quest Carryover, this file's own prefix - top-level
// var/const names collide across server_scripts files (see
// feedback_rhino_java_reflection_quirks.md Rule 6), same reason
// loot_bag_notification.js uses a "pun" prefix and mob_aggro.js uses
// "aggro" for their own copies of this exact Class.forName bootstrap.
//
// Mechanism: on game over, copy the CURRENT world's own progress file to
// KubeJSPaths.CONFIG (this pack's instance-level config folder, shared
// by every world/save under this modpack instance - confirmed live: a
// file written there from one sandbox world survived a full server
// restart and was readable from a simulated second "world"). On any
// later login where the CURRENT world's own progress file doesn't exist
// yet (or looks like FTB Quests' own empty stub, not real progress),
// copy the carryover file back in.
//
// Real findings this file relies on, all confirmed live via RCON against
// a real dedicated-server sandbox (not guessed, not just reasoned from
// docs):
// - A `function name() {}` DECLARATION nested inside a `try { }` block
//   does not hoist correctly in this Rhino build - calling it later in
//   the SAME block throws "X is not a function, it is undefined", even
//   though a sibling declared outside any try block works fine. Fixed by
//   using `var name = function () {}` EXPRESSIONS instead everywhere in
//   this file - `var` hoists normally regardless of block nesting, and
//   every helper below is defined before its first call.
// - A bare JS array literal does NOT coerce to a typed Java array
//   through raw Method#invoke ("argument type mismatch") - built a real
//   one via java.lang.reflect.Array.newInstance(componentType, length).
// - A bare JS number does NOT coerce to java.lang.Integer through
//   invoke() either (same error) - routed through Integer.valueOf(String)
//   instead, since a String argument always converts cleanly (proven
//   repeatedly - forName, Path#resolve).
// - A Path object's CONCRETE runtime class (sun.nio.fs.WindowsPath) is a
//   JDK-internal class not exported to the rhino module - reflecting a
//   method off it can throw IllegalAccessException even for a public
//   method (hit this exact wall on toAbsolutePath()). Fixed by getting
//   the Method off the PUBLIC java.nio.file.Path INTERFACE instead - same
//   fix class as this pack's already-documented List/Stream
//   module-boundary gotcha.
// - LevelResource.ROOT and MinecraftServer#getWorldPath are both real but
//   SRG-obfuscated at the member level even though their declaring
//   classes resolve fine by clean/Mojang name - f_78182_ and m_129843_
//   respectively, dumped and confirmed live against this pack's pinned
//   Forge 47.4.10/MC 1.20.1 (no decompiled-source cache available to
//   check "the real name" any other way - ROOT identified by being the
//   one whose value stringifies to "/.", getWorldPath by being the only
//   1-param method on the server's class whose param type is
//   LevelResource).
//
// Real, honest limitation, not glossed over: which of FTB Quests' own
// login handling and this file's PlayerEvents.loggedIn handler runs
// first isn't controlled here - no graphical client in this environment
// to test an actual fresh login end-to-end. The "doesn't exist or looks
// like an empty stub" check below is a real safety net either way (worst
// case, an import that loses a race needs one relog to show up - it
// won't ever clobber real progress), but this needs a real hands-on
// check before calling the timing fully proven.

var HQC_SUBDIR = 'hardcore_quest_carryover'
var HQC_EMPTY_STUB_THRESHOLD = 300

var hqcReflect = null

function hqcGetReflection(anyObj) {
  if (hqcReflect) return hqcReflect

  var classOfClass = anyObj.getClass().getClass()
  var classMethods = classOfClass.getMethods()
  var forNameMethod = null
  for (var i = 0; i < classMethods.length; i++) {
    var m = classMethods[i]
    if (m.getName() === 'forName' && m.getParameterCount() === 1 && `${m.getParameterTypes()[0]}` === 'class java.lang.String') { forNameMethod = m; break }
  }
  var resolveClass = function (name) { return forNameMethod.invoke(null, [name]) }

  var FilesClass = resolveClass('java.nio.file.Files')
  var filesMethods = FilesClass.getMethods()
  var writeStringMethod = null
  var readStringMethod = null
  var existsMethod = null
  var createDirectoriesMethod = null
  for (var i = 0; i < filesMethods.length; i++) {
    var m = filesMethods[i]
    if (m.getName() === 'writeString' && m.getParameterCount() === 3) writeStringMethod = m
    if (m.getName() === 'readString' && m.getParameterCount() === 1) readStringMethod = m
    if (m.getName() === 'exists' && m.getParameterCount() === 2) existsMethod = m
    if (m.getName() === 'createDirectories' && m.getParameterCount() === 2) createDirectoriesMethod = m
  }

  var ArrayClass = resolveClass('java.lang.reflect.Array')
  var arrayMethods = ArrayClass.getMethods()
  var newInstanceMethod = null
  for (var i = 0; i < arrayMethods.length; i++) {
    var m = arrayMethods[i]
    if (m.getName() === 'newInstance' && m.getParameterCount() === 2 && `${m.getParameterTypes()[1]}` === 'int') { newInstanceMethod = m; break }
  }
  var IntegerClass = resolveClass('java.lang.Integer')
  var integerMethods = IntegerClass.getMethods()
  var valueOfMethod = null
  for (var i = 0; i < integerMethods.length; i++) {
    var m = integerMethods[i]
    if (m.getName() === 'valueOf' && m.getParameterCount() === 1 && `${m.getParameterTypes()[0]}` === 'class java.lang.String') { valueOfMethod = m; break }
  }
  var javaInt = function (n) { return valueOfMethod.invoke(null, [`${n}`]) }
  var emptyArray = function (componentType) { return newInstanceMethod.invoke(null, [componentType, javaInt(0)]) }

  var emptyOpenOptions = emptyArray(writeStringMethod.getParameterTypes()[2].getComponentType())
  var emptyLinkOptions = emptyArray(existsMethod.getParameterTypes()[1].getComponentType())
  var emptyFileAttributes = emptyArray(createDirectoriesMethod.getParameterTypes()[1].getComponentType())

  var PathInterface = resolveClass('java.nio.file.Path')
  var pathIfaceMethods = PathInterface.getMethods()
  var resolveMethod = null
  for (var i = 0; i < pathIfaceMethods.length; i++) {
    var m = pathIfaceMethods[i]
    if (m.getName() === 'resolve' && m.getParameterCount() === 1 && `${m.getParameterTypes()[0]}` === 'class java.lang.String') { resolveMethod = m; break }
  }

  var LevelResourceClass = resolveClass('net.minecraft.world.level.storage.LevelResource')
  var declFields = LevelResourceClass.getDeclaredFields()
  var rootField = null
  for (var i = 0; i < declFields.length; i++) {
    declFields[i].setAccessible(true)
    if (`${declFields[i].get(null)}` === '/.') { rootField = declFields[i]; break }
  }
  var rootResource = rootField.get(null)

  var KubeJSPathsClass = resolveClass('dev.latvian.mods.kubejs.KubeJSPaths')
  var configRoot = KubeJSPathsClass.getField('CONFIG').get(null)

  hqcReflect = {
    resolve: function (path, name) { return resolveMethod.invoke(path, [name]) },
    exists: function (path) { return `${existsMethod.invoke(null, [path, emptyLinkOptions])}` === 'true' },
    mkdirs: function (path) { createDirectoriesMethod.invoke(null, [path, emptyFileAttributes]) },
    readText: function (path) { return `${readStringMethod.invoke(null, [path])}` },
    writeText: function (path, text) { writeStringMethod.invoke(null, [path, text, emptyOpenOptions]) },
    configRoot: configRoot,
    saveRoot: function (server) {
      var serverMethods = server.getClass().getMethods()
      for (var i = 0; i < serverMethods.length; i++) {
        var m = serverMethods[i]
        if (m.getParameterCount() === 1 && `${m.getParameterTypes()[0]}`.indexOf('LevelResource') >= 0) {
          return m.invoke(server, [rootResource])
        }
      }
      return null
    },
  }
  return hqcReflect
}

function hqcCarryoverFile(reflect, uuid) {
  var dir = reflect.resolve(reflect.configRoot, HQC_SUBDIR)
  reflect.mkdirs(dir)
  return reflect.resolve(dir, uuid + '.snbt')
}

function hqcProgressFile(reflect, server, uuid) {
  var dir = reflect.resolve(reflect.saveRoot(server), 'ftbquests')
  reflect.mkdirs(dir)
  return reflect.resolve(dir, uuid + '.snbt')
}

// Called from both game-over triggers (pedestal_destruction.js's
// triggerPedestalDestroyed, hardcore_death.js's triggerHardcoreGameOver)
// - snapshots the losing player's OWN current-world progress out to the
// shared instance-level carryover folder. Silently no-ops if this
// world's own progress file doesn't exist yet (a player who never opened
// the quest book has nothing worth exporting).
function hqcExportProgress(player) {
  try {
    var reflect = hqcGetReflection(player)
    var server = player.getServer()
    var uuid = `${player.uuid}`
    var progressFile = hqcProgressFile(reflect, server, uuid)
    if (!reflect.exists(progressFile)) return
    reflect.writeText(hqcCarryoverFile(reflect, uuid), reflect.readText(progressFile))
  } catch (e) {
    console.log('[HardcoreCarryover] export failed: ' + e)
  }
}

// Called on every login. Only actually imports when this world's own
// progress file is either missing entirely or small enough to be FTB
// Quests' own freshly-created empty stub, not real progress - real
// content from an actual played world is comfortably over this
// threshold (the shipped example this was sized against ran ~1400
// characters for a modest handful of completed quests). Never
// overwrites real progress either way.
function hqcMaybeImportProgress(player) {
  try {
    var reflect = hqcGetReflection(player)
    var server = player.getServer()
    var uuid = `${player.uuid}`
    var carryoverFile = hqcCarryoverFile(reflect, uuid)
    if (!reflect.exists(carryoverFile)) return false

    var progressFile = hqcProgressFile(reflect, server, uuid)
    if (reflect.exists(progressFile) && reflect.readText(progressFile).length >= HQC_EMPTY_STUB_THRESHOLD) return false

    reflect.writeText(progressFile, reflect.readText(carryoverFile))
    return true
  } catch (e) {
    console.log('[HardcoreCarryover] import failed: ' + e)
    return false
  }
}

PlayerEvents.loggedIn((event) => {
  var player = event.player
  if (hqcMaybeImportProgress(player)) {
    player.tell('§7Found quest progress from a previous world - imported. If it doesn\'t show up in the quest book yet, reconnect once.')
  }
})
