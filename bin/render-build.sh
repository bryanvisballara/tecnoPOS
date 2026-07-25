#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "==> TecnoPOS build from $ROOT"
echo "==> Installing server deps"
npm install --prefix server --omit=dev
echo "==> Installing + building client"
npm install --prefix client
npm run build --prefix client
test -f client/dist/index.html
test -f client/dist/build-id.json
echo "==> Build OK: $(cat client/dist/build-id.json)"
