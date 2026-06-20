#!/usr/bin/env bash
# Capture LexemeReader screenshots for lexeme.uk marketing site.
#
# Run on macOS with:
#   - Pixel 4 XL connected via USB (USB debugging enabled)
#   - Xcode + iPad simulator installed
#   - LexemeReader repo checked out locally
#
# Usage:
#   LEXEMEREADER_PATH=~/Desktop/Github/LexemeReader ./scripts/capture-website-screenshots.sh
#
# Output:
#   frontend/public/screenshots/phone/{reading,lookup,study}.png
#   frontend/public/screenshots/tablet/library-tablet.png

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LEXEMEREADER_PATH="${LEXEMEREADER_PATH:-$(cd "$ROOT/.." && pwd)/LexemeReader}"
PHONE_OUT="$ROOT/frontend/public/screenshots/phone"
TABLET_OUT="$ROOT/frontend/public/screenshots/tablet"
IPAD_DEVICE="${IPAD_DEVICE:-iPad Pro (12.9-inch) (6th generation)}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

capture_android() {
  local id="$1"
  local outfile="$PHONE_OUT/${id}.png"
  echo
  echo "=== Android: $id ==="
  echo "On the Pixel 4 XL, open LexemeReader and navigate to: $id"
  read -r -p "Press Enter when the screen is ready..."
  adb exec-out screencap -p > "$outfile"
  echo "Saved $outfile"
}

capture_ios_tablet() {
  local id="$1"
  local outfile="$TABLET_OUT/${id}.png"
  echo
  echo "=== iPad simulator: $id ==="
  echo "In the iPad simulator, open LexemeReader and navigate to: $id"
  read -r -p "Press Enter when the screen is ready..."
  xcrun simctl io booted screenshot "$outfile"
  echo "Saved $outfile"
}

install_android() {
  echo "Building and installing Android debug build..."

  if [[ -f "$LEXEMEREADER_PATH/pubspec.yaml" ]] && command -v flutter >/dev/null 2>&1; then
    (
      cd "$LEXEMEREADER_PATH"
      flutter pub get
      flutter build apk --debug
      adb install -r build/app/outputs/flutter-apk/app-debug.apk
    )
    return
  fi

  if [[ -f "$LEXEMEREADER_PATH/android/gradlew" ]]; then
    (
      cd "$LEXEMEREADER_PATH/android"
      ./gradlew :app:installDebug
    )
    return
  fi

  echo "Could not detect Android build system in $LEXEMEREADER_PATH" >&2
  echo "Set LEXEMEREADER_PATH or install a debug APK manually, then press Enter."
  read -r
}

install_ios_simulator() {
  echo "Building and installing iOS simulator build..."

  if [[ -f "$LEXEMEREADER_PATH/pubspec.yaml" ]] && command -v flutter >/dev/null 2>&1; then
    (
      cd "$LEXEMEREADER_PATH"
      flutter pub get
      flutter build ios --simulator
      xcrun simctl boot "$IPAD_DEVICE" 2>/dev/null || true
      open -a Simulator
      xcrun simctl bootstatus booted -b
      APP_PATH="$(find "$LEXEMEREADER_PATH/build/ios/iphonesimulator" -name '*.app' -maxdepth 2 | head -1)"
      if [[ -z "$APP_PATH" ]]; then
        echo "Could not find built .app in build/ios/iphonesimulator" >&2
        exit 1
      fi
      xcrun simctl install booted "$APP_PATH"
      BUNDLE_ID="$(/usr/libexec/PlistBuddy -c 'Print:CFBundleIdentifier' "$APP_PATH/Info.plist")"
      xcrun simctl launch booted "$BUNDLE_ID" >/dev/null || true
    )
    return
  fi

  echo "Could not detect iOS build system in $LEXEMEREADER_PATH" >&2
  echo "Install LexemeReader on the iPad simulator manually, then press Enter."
  read -r
}

main() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "Run this script on macOS (Pixel 4 XL + iPad simulator host)." >&2
    exit 1
  fi

  require_cmd adb
  require_cmd xcrun

  mkdir -p "$PHONE_OUT" "$TABLET_OUT"

  if [[ ! -d "$LEXEMEREADER_PATH" ]]; then
    echo "LexemeReader not found at: $LEXEMEREADER_PATH" >&2
    echo "Set LEXEMEREADER_PATH to your LexemeReader checkout." >&2
    exit 1
  fi

  echo "LexemeReader path: $LEXEMEREADER_PATH"
  echo "Output directory:  $ROOT/frontend/public/screenshots"

  echo
  echo "Checking for Pixel 4 XL..."
  adb devices -l
  if ! adb devices | awk 'NR>1 && $2=="device"{found=1} END{exit !found}'; then
    echo "No Android device detected. Connect Pixel 4 XL with USB debugging enabled." >&2
    exit 1
  fi

  install_android
  capture_android reading
  capture_android lookup
  capture_android study

  install_ios_simulator
  capture_ios_tablet library-tablet

  echo
  echo "Done. Commit the screenshots:"
  echo "  git add frontend/public/screenshots"
  echo "  git commit -m 'Add LexemeReader device screenshots for lexeme.uk'"
}

main "$@"
