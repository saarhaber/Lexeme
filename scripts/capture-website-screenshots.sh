#!/usr/bin/env bash
# Install LexemeReader from the sibling Lexemereader repo and capture website screenshots.
#
# Requires macOS with:
#   - Pixel 4 XL connected (USB debugging on)
#   - Xcode + iPad simulator
#   - Lexemereader repo checked out (default: ../Lexemereader)
#
# Usage:
#   ./scripts/capture-website-screenshots.sh
#   LEXEMEREADER_PATH=~/Desktop/Github/Lexemereader ./scripts/capture-website-screenshots.sh
#
# Uses existing debug builds from Lexemereader when present; otherwise builds fresh.
#
# Output:
#   frontend/public/screenshots/phone/{reading,lookup,study}.png
#   frontend/public/screenshots/tablet/library-tablet.png

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PHONE_OUT="$ROOT/frontend/public/screenshots/phone"
TABLET_OUT="$ROOT/frontend/public/screenshots/tablet"
IPAD_DEVICE="${IPAD_DEVICE:-iPad Pro (12.9-inch) (6th generation)}"

resolve_lexemereader_path() {
  if [[ -n "${LEXEMEREADER_PATH:-}" && -d "$LEXEMEREADER_PATH" ]]; then
    echo "$LEXEMEREADER_PATH"
    return
  fi

  local candidate
  for candidate in \
    "$(cd "$ROOT/.." && pwd)/Lexemereader" \
    "$(cd "$ROOT/.." && pwd)/LexemeReader" \
    "$HOME/Desktop/Github/Lexemereader" \
    "$HOME/Desktop/Github/LexemeReader"; do
    if [[ -d "$candidate" ]]; then
      echo "$candidate"
      return
    fi
  done

  return 1
}

find_android_apk() {
  local repo="$1"
  find "$repo" \
    \( -path '*/app-debug.apk' -o -path '*/app-dev-debug.apk' \) \
    -not -path '*/intermediates/*' 2>/dev/null \
    | xargs -I{} stat -f '%m %N' {} 2>/dev/null \
    | sort -rn | head -1 | cut -d' ' -f2- \
    || find "$repo" \( -name 'app-debug.apk' -o -name 'app-dev-debug.apk' \) 2>/dev/null | head -1
}

find_ios_sim_app() {
  local repo="$1"
  find "$repo/build/ios/iphonesimulator" -name '*.app' -maxdepth 3 2>/dev/null | head -1
}

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
  echo "=== Android · $id ==="
  echo "Open LexemeReader on the Pixel 4 XL and navigate to the $id screen."
  read -r -p "Press Enter when ready..."
  adb exec-out screencap -p > "$outfile"
  echo "Saved $outfile"
}

capture_ios_tablet() {
  local id="$1"
  local outfile="$TABLET_OUT/${id}.png"
  echo
  echo "=== iPad simulator · $id ==="
  echo "Open LexemeReader in the iPad simulator and navigate to the $id screen."
  read -r -p "Press Enter when ready..."
  xcrun simctl io booted screenshot "$outfile"
  echo "Saved $outfile"
}

install_android() {
  local repo="$1"
  echo "Installing Android build from Lexemereader..."

  local apk
  apk="$(find_android_apk "$repo" || true)"

  if [[ -n "$apk" && -f "$apk" ]]; then
    echo "Using existing APK: $apk"
    adb install -r "$apk"
    return
  fi

  if [[ -f "$repo/pubspec.yaml" ]] && command -v flutter >/dev/null 2>&1; then
    (
      cd "$repo"
      flutter pub get
      flutter build apk --debug
      adb install -r build/app/outputs/flutter-apk/app-debug.apk
    )
    return
  fi

  if [[ -f "$repo/android/gradlew" ]]; then
    (
      cd "$repo/android"
      ./gradlew :app:installDebug
    )
    return
  fi

  echo "No APK found and no build system detected in $repo" >&2
  exit 1
}

install_ios_simulator() {
  local repo="$1"
  echo "Installing iOS simulator build from Lexemereader..."

  xcrun simctl boot "$IPAD_DEVICE" 2>/dev/null || true
  open -a Simulator
  xcrun simctl bootstatus booted -b

  local app_path
  app_path="$(find_ios_sim_app "$repo" || true)"

  if [[ -z "$app_path" && -f "$repo/pubspec.yaml" ]] && command -v flutter >/dev/null 2>&1; then
    (
      cd "$repo"
      flutter pub get
      flutter build ios --simulator
    )
    app_path="$(find_ios_sim_app "$repo" || true)"
  fi

  if [[ -z "$app_path" ]]; then
    echo "No iOS simulator .app found in $repo/build/ios/iphonesimulator" >&2
    exit 1
  fi

  echo "Using simulator app: $app_path"
  xcrun simctl install booted "$app_path"
  local bundle_id
  bundle_id="$(/usr/libexec/PlistBuddy -c 'Print:CFBundleIdentifier' "$app_path/Info.plist")"
  xcrun simctl launch booted "$bundle_id" >/dev/null || true
}

main() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "This script must run on macOS (Pixel 4 XL + iPad simulator host)." >&2
    echo "The cloud agent cannot reach USB devices; run locally after pulling this branch." >&2
    exit 1
  fi

  require_cmd adb
  require_cmd xcrun

  mkdir -p "$PHONE_OUT" "$TABLET_OUT"

  local repo
  if ! repo="$(resolve_lexemereader_path)"; then
    echo "Lexemereader repo not found." >&2
    echo "Check out Lexemereader alongside Lexeme, or set:" >&2
    echo "  LEXEMEREADER_PATH=~/Desktop/Github/Lexemereader" >&2
    exit 1
  fi

  echo "Lexemereader path: $repo"
  echo "Screenshot output: $ROOT/frontend/public/screenshots"

  echo
  echo "Checking for Pixel 4 XL..."
  adb devices -l
  if ! adb devices | awk 'NR>1 && $2=="device"{found=1} END{exit !found}'; then
    echo "No Android device detected. Connect Pixel 4 XL with USB debugging enabled." >&2
    exit 1
  fi

  install_android "$repo"
  capture_android reading
  capture_android lookup
  capture_android study

  install_ios_simulator "$repo"
  capture_ios_tablet library-tablet

  echo
  echo "Done. Commit and push:"
  echo "  git add frontend/public/screenshots"
  echo "  git commit -m 'Add LexemeReader device screenshots for lexeme.uk'"
  echo "  git push"
}

main "$@"
