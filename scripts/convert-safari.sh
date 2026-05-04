#!/usr/bin/env bash
# Generate a Safari Web Extension Xcode project from extension/.
# Requirements: macOS + Xcode installed (xcrun must resolve safari-web-extension-converter).
set -euo pipefail

if [[ "$(uname)" != "Darwin" ]]; then
  echo "❌ This script must be run on macOS — Safari extensions require Xcode tooling." >&2
  exit 1
fi

if ! xcrun --find safari-web-extension-converter >/dev/null 2>&1; then
  echo "❌ safari-web-extension-converter not found." >&2
  echo "   Install Xcode from the Mac App Store, then run: sudo xcode-select --install" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT_DIR="$ROOT/extension"
OUT_DIR="$ROOT/safari-build"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

xcrun safari-web-extension-converter \
  "$EXT_DIR" \
  --project-location "$OUT_DIR" \
  --app-name "Ultimate Creator Extension" \
  --bundle-identifier "com.julianespin.ultimate-creator-extension" \
  --no-prompt \
  --copy-resources \
  --force

echo ""
echo "✅ Xcode project generated."
echo ""
echo "Next steps:"
echo "  1. open \"$OUT_DIR\"/*.xcodeproj"
echo "  2. In Xcode, click ▶ Run to build & launch the container app once."
echo "  3. Quit the container app."
echo "  4. Safari → Settings → Advanced → check 'Show Develop menu'."
echo "  5. Develop menu → Allow Unsigned Extensions (must redo after each Safari restart"
echo "     unless you sign with an Apple Developer account)."
echo "  6. Safari → Settings → Extensions → enable 'Ultimate Creator Extension'."
