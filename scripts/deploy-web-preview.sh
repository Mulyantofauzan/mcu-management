#!/usr/bin/env bash
# Deploy PREVIEW aplikasi web baru. Tidak pernah ke produksi.
# Vercel membaca buildCommand/outputDirectory dari vercel.json yang ikut ter-upload, bukan dari --local-config,
# jadi skrip ini menyiapkan folder staging sementara dengan vercel.web.json sebagai vercel.json.
set -euo pipefail

if [[ " $* " == *" --prod "* || " $* " == *" --target=production "* ]]; then
  echo "Menolak: skrip ini hanya untuk preview. Cutover produksi dilakukan terpisah." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"
mkdir -p "$STAGE/web"
rsync -a "$ROOT/api" "$ROOT/server" "$ROOT/package.json" "$ROOT/package-lock.json" "$ROOT/.vercelignore" "$STAGE/"
rsync -a --exclude node_modules --exclude dist "$ROOT/web/" "$STAGE/web/"
cp "$ROOT/vercel.web.json" "$STAGE/vercel.json"
cp -R "$ROOT/.vercel" "$STAGE/.vercel"

echo "Staging: $STAGE"
cd "$STAGE"
vercel deploy --yes "$@"
