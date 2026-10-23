#!/usr/bin/env bash
# Build and publish to the gh-pages branch → https://roosvelttetaing123-byte.github.io/Get-Gud/
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE=$(git remote get-url origin)
./scripts/build-web.sh
BUILD=$(sed -n 's/.*<meta name="gg-build" content="\([^"]*\)".*/\1/p' dist/index.html)
cd dist
git init -q -b gh-pages
git add -A
git -c user.name="Get Gud deploy" -c user.email="deploy@localhost" commit -qm "Deploy ${BUILD:-$(date -u +%Y-%m-%dT%H:%MZ)}"
git push -qf "$REMOTE" gh-pages
rm -rf .git
echo "Deployed build ${BUILD} to https://roosvelttetaing123-byte.github.io/Get-Gud/"
