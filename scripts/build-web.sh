#!/usr/bin/env bash
# Build the installable web app into dist/ (served at /Get-Gud/ on GitHub Pages).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
CI=1 npx expo export --platform web --output-dir dist
cp dist/index.html dist/404.html   # deep links (e.g. /Get-Gud/journal) load the app
touch dist/.nojekyll               # let GitHub Pages serve the _expo/ folder
echo "Built dist/"
