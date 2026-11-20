#!/usr/bin/env bash
# Deploy aplikasi web (web/ + api/). Tanpa argumen = PREVIEW. Produksi hanya dengan --prod.
# Memakai folder staging sementara supaya berkas rahasia lokal (.env.local) dan folder besar tidak ikut ter-upload
# (.vercelignore tidak mengecualikan .env*).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"
mkdir -p "$STAGE/web"
rsync -a "$ROOT/api" "$ROOT/server" "$ROOT/package.json" "$ROOT/package-lock.json" "$ROOT/vercel.json" "$ROOT/.vercelignore" "$STAGE/"
rsync -a --exclude node_modules --exclude dist "$ROOT/web/" "$STAGE/web/"
cp -R "$ROOT/.vercel" "$STAGE/.vercel"

echo "Staging: $STAGE"
cd "$STAGE"
vercel deploy --yes "$@"
