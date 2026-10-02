#!/bin/bash
# Applique le patch Quick Settings Tile au projet Android généré par Capacitor
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANDROID_DIR="$SCRIPT_DIR/android"
PATCH_DIR="$SCRIPT_DIR/android-tile-patch"

if [ ! -d "$ANDROID_DIR" ]; then
  echo "Erreur : le dossier android n'existe pas. Lance d'abord 'npx cap add android'."
  exit 1
fi

echo "=== Copie du manifest ==="
cp "$PATCH_DIR/AndroidManifest.xml" "$ANDROID_DIR/app/src/main/AndroidManifest.xml"

echo "=== Copie du service QS Tile ==="
mkdir -p "$ANDROID_DIR/app/src/main/java/com/hounmetinjeremy/lyricsfinder"
cp "$PATCH_DIR/LyricsTileService.kt" "$ANDROID_DIR/app/src/main/java/com/hounmetinjeremy/lyricsfinder/LyricsTileService.kt"
cp "$PATCH_DIR/MainActivity.kt" "$ANDROID_DIR/app/src/main/java/com/hounmetinjeremy/lyricsfinder/MainActivity.kt"

echo "=== Copie de l'icône ==="
mkdir -p "$ANDROID_DIR/app/src/main/res/drawable"
cp "$PATCH_DIR/ic_tile_microphone.xml" "$ANDROID_DIR/app/src/main/res/drawable/ic_tile_microphone.xml"

echo "=== Patch Quick Settings Tile appliqué ==="
