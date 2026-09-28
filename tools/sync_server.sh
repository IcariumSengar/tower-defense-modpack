#!/usr/bin/env bash
# Mirrors mods/config/kubejs/defaultconfigs/moonlight-global-datapacks from the live
# CurseForge instance into the dedicated server directory, so the server matches
# whatever you're currently playing on. Does NOT touch world/, server.properties,
# ops/whitelist/ban lists, or anything else server-specific.
#
# Usage: tools/sync_server.sh
set -euo pipefail

SRC="/c/Users/mattf/curseforge/minecraft/Instances/Tower Defense Modpack"
DST="/d/mc-servers/tower-defense-modpack"

# Mods that only make sense on a client (renderer/UI mods) - never copied to the server.
CLIENT_ONLY=(
  "MobDismemberment-1.20.1-8.0.1.jar"
  "MouseTweaks-forge-mc1.20.1-2.25.1.jar"
  "embeddium-0.3.31+mc1.20.1.jar"
  "entityculling-forge-1.10.5-mc1.20.1.jar"
  "justzoom_forge_2.1.1_MC_1.20.1.jar"
  # Menu reskin (FancyMenu + Drippy + Melody). FancyMenu will load on a server,
  # but its server mixins add a packet per spawn/death and a structure lookup
  # per player tick for nothing a menu needs.
  "fancymenu_forge_3.9.12_MC_1.20.1.jar"
  "drippyloadingscreen_forge_3.1.5_MC_1.20.1.jar"
  "melody_forge_1.0.3_MC_1.20.1-1.20.4.jar"
  # Performance pass 2026-09-26 - render-only (batches HUD/text drawing),
  # mods.toml declares its deps side=CLIENT.
  "ImmediatelyFast-Forge-1.5.5+1.20.4.jar"
)

is_client_only() {
  local base="$1"
  for c in "${CLIENT_ONLY[@]}"; do
    [ "$base" = "$c" ] && return 0
  done
  return 1
}

echo "Syncing mods..."
mkdir -p "$DST/mods"
before=$(ls "$DST/mods" 2>/dev/null | wc -l)
rm -f "$DST/mods/"*.jar
copied=0
for f in "$SRC/mods/"*.jar; do
  base=$(basename "$f")
  if ! is_client_only "$base"; then
    cp "$f" "$DST/mods/$base"
    copied=$((copied+1))
  fi
done
after=$(ls "$DST/mods" 2>/dev/null | wc -l)
echo "  mods: $before -> $after (copied $copied, excluded ${#CLIENT_ONLY[@]} client-only)"

for dir in config kubejs defaultconfigs moonlight-global-datapacks; do
  echo "Syncing $dir..."
  rm -rf "${DST:?}/$dir"
  cp -r "$SRC/$dir" "$DST/$dir"
done

echo "Done. If the server is currently running, mod/config changes need a restart"
echo "(type 'stop' in its console, then relaunch run.bat) - none of this hot-reloads."
