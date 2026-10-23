#!/usr/bin/env bash
# Build and publish to the gh-pages branch → https://roosvelttetaing123-byte.github.io/Get-Gud/
set -euo pipefail
cd "$(dirname "$0")/.."
./scripts/build-web.sh
REMOTE=$(git remote get-url origin)
cd dist
git init -q -b gh-pages
git add -A
git -c user.name="Get Gud deploy" -c user.email="deploy@localhost" commit -qm "Deploy $(date -u +%Y-%m-%dT%H:%MZ)"
git push -qf "$REMOTE" gh-pages
rm -rf .git
echo "Deployed to https://roosvelttetaing123-byte.github.io/Get-Gud/"
