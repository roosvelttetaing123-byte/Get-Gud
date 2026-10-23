#!/usr/bin/env bash
# Build the installable web app into dist/ (served at /Get-Gud/ on GitHub Pages).
#   1. launch screens from the current icon (public/splash/, needs Python + Pillow;
#      without them the committed PNGs are used as they are)
#   2. expo export (copies public/ into dist/)
#   3. postbuild: build id + precache list into sw.js, 404.html, .nojekyll, link check
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v python3 >/dev/null 2>&1 && python3 -c 'import PIL' >/dev/null 2>&1; then
  python3 scripts/make-splash.py
else
  echo "warning: python3 with Pillow not found; using the existing public/splash/ images" >&2
fi

rm -rf dist
CI=1 npx expo export --platform web --output-dir dist
node scripts/postbuild-web.mjs
echo "Built dist/"
