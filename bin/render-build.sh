#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "==> Installing server deps"
npm install --prefix server --omit=dev
echo "==> Installing + building client"
npm install --prefix client
npm run build --prefix client
echo "==> Build OK"
