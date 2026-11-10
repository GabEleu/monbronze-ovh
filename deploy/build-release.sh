#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# monbronze.fr : déploiement « OVH seul ». Construit le site SUR LE VPS puis l'active.
# Lancé par le crochet post-receive du dépôt /srv/monbronze/repo.git à chaque
#   git push ovh main
# (installé par setup-vps.sh dans /srv/monbronze/bin/build-release, utilisateur monbronze).
# À la main, pour reconstruire la dernière version reçue :
#   sudo -u monbronze /srv/monbronze/bin/build-release
# ─────────────────────────────────────────────────────────────
set -euo pipefail

BASE=/srv/monbronze
REPO="$BASE/repo.git"
SRC="$BASE/build"
REV="${1:-main}"

# Un seul build à la fois (deux push rapprochés : le second attend).
exec 9>"$BASE/build.lock"
flock 9

export GIT_DIR="$REPO"
SHA="$(git rev-parse --verify "$REV^{commit}")"
echo "→ Version $SHA"

# Copie de travail persistante (node_modules gardé d'un build à l'autre).
mkdir -p "$SRC"
# read-tree --reset -u : copie exacte de la version (fichiers supprimés compris), puis
# nettoyage de tout le reste sauf node_modules.
git --work-tree="$SRC" read-tree --reset -u "$SHA"
git --work-tree="$SRC" clean -fdxq -e node_modules
unset GIT_DIR
cd "$SRC"

echo "→ Dépendances"
HASH="$(sha256sum package-lock.json | cut -c1-64)"
if [ ! -f node_modules/.lock-hash ] || [ "$(cat node_modules/.lock-hash)" != "$HASH" ]; then
  npm ci --no-audit --no-fund
  echo "$HASH" > node_modules/.lock-hash
fi

echo "→ Build (2 à 4 minutes ; le site actuel reste en ligne)"
# Variables lues AU BUILD (NEXT_PUBLIC_*, S3_BUCKET) : celles de la production.
set -a
# shellcheck disable=SC1091
. "$BASE/shared/.env.production"
set +a
export NEXT_TELEMETRY_DISABLED=1
npm run build

echo "→ Archive"
ID="$(date -u +%Y%m%d%H%M%S)-${SHA:0:12}"
STAGE="$BASE/incoming/$ID"
rm -rf -- "$STAGE"
cp -a .next/standalone "$STAGE"
cp -a .next/static "$STAGE/.next/static"
rm -rf -- "$STAGE/public"
cp -a public "$STAGE/public"
tar -czf "$BASE/incoming/$ID.tar.gz" -C "$STAGE" .
rm -rf -- "$STAGE"

echo "→ Activation"
"$BASE/bin/activate-release" "$BASE/incoming/$ID.tar.gz"
