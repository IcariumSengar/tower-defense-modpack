#!/usr/bin/env bash
# Mirrors kubejs/config/defaultconfigs and raw mod jars from THIS REPO (the
# source of truth for all of it) into the local CurseForge instance. This is
# the missing first link in the chain - sync_server.sh only ever mirrored
# the CurseForge instance onward to the dedicated server, so a repo edit
# that never got manually copied into the instance first silently never
# reached the server either, no matter how many times sync_server.sh ran.
#
# Skips .pw.toml metafile-only mods on purpose - those still need
# packwiz/the CurseForge app's own installer to resolve and download the
# real jar (a metafile has no jar bytes to copy). Only pack/mods/*.jar
# files actually checked into the repo (the pack's own hand-patched or
# otherwise custom ones, e.g. the constant-patched Realistic Airdrop and
# Xaero's World Border jars) get copied here.
#
# Usage: tools/sync_instance.sh
#   then: tools/sync_server.sh   (instance -> dedicated server, unchanged)
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/pack"
DST="/c/Users/mattf/curseforge/minecraft/Instances/Tower Defense Modpack"

for dir in kubejs config defaultconfigs; do
  echo "Syncing $dir..."
  rm -rf "${DST:?}/$dir"
  cp -r "$SRC/$dir" "$DST/$dir"
done

echo "Syncing raw mod jars (skipping .pw.toml-only entries)..."
mkdir -p "$DST/mods"
copied=0
for f in "$SRC/mods/"*.jar; do
  [ -e "$f" ] || continue
  cp "$f" "$DST/mods/$(basename "$f")"
  copied=$((copied + 1))
done
echo "  copied $copied raw jar(s)"

echo "Done. Run tools/sync_server.sh next to push this on to the dedicated server."
