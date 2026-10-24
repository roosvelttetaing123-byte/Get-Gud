#!/usr/bin/env bash
# Sleep engine tests: compile the pure engine in src/lib with the project's TypeScript
# (tools/engine-tests/tsconfig.json) and run it under Node's built-in test runner in three
# time zones: no daylight saving (Phnom Penh), US rules (New York) and EU rules (London).
# No extra packages.
set -euo pipefail
cd "$(dirname "$0")/.."
out="node_modules/.cache/engine-tests"
rm -rf "$out"
npx tsc -p tools/engine-tests/tsconfig.json --outDir "$out"
for tz in Asia/Phnom_Penh America/New_York Europe/London; do
  echo "TZ=$tz"
  TZ="$tz" ENGINE_DIR="$PWD/$out" node --test tools/engine-tests/*.test.mjs
done
