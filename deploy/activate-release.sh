#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# monbronze.fr : active une version envoyée par GitHub Actions (installé par setup-vps.sh
# dans /srv/monbronze/bin/activate-release, lancé par l'utilisateur monbronze) :
#   /srv/monbronze/bin/activate-release /srv/monbronze/incoming/<AAAAMMJJhhmmss>-<commit>.tar.gz
# Décompresse dans releases/, bascule le lien « current », redémarre le service et vérifie
# que le site répond ; sinon, revient à la version précédente. Garde les 5 dernières.
# Retour manuel à une version : voir DEPLOIEMENT-OVH.md (« Revenir en arrière »).
# ─────────────────────────────────────────────────────────────
set -euo pipefail

BASE=/srv/monbronze
ARCHIVE="$(readlink -f "${1:?Archive à activer}")"
case "$ARCHIVE" in
  "$BASE"/incoming/*.tar.gz) ;;
  *) echo "Archive inattendue : $ARCHIVE" >&2; exit 1 ;;
esac
ID="$(basename "$ARCHIVE" .tar.gz)"
[[ "$ID" =~ ^[0-9]{14}-[0-9a-f]{7,40}$ ]] || { echo "Nom de version inattendu : $ID" >&2; exit 1; }

DIR="$BASE/releases/$ID"
mkdir -p "$DIR"
tar -xzf "$ARCHIVE" -C "$DIR" --no-same-owner
rm -f -- "$ARCHIVE"
[ -f "$DIR/server.js" ] || { echo "server.js absent de l'archive." >&2; exit 1; }

switch_to() {
  ln -sfn "$1" "$BASE/current.new"
  mv -T "$BASE/current.new" "$BASE/current"
  sudo /usr/bin/systemctl restart monbronze
}

# -e : vide si « current » n'existe pas encore (premier déploiement).
PREV="$(readlink -e "$BASE/current" 2>/dev/null || true)"
switch_to "$DIR"

healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null --max-time 5 http://127.0.0.1:3000/; then return 0; fi
    sleep 1
  done
  return 1
}

if ! healthy; then
  echo "La nouvelle version ($ID) ne répond pas : journalctl -u monbronze -n 50" >&2
  if [ -n "$PREV" ] && [ -d "$PREV" ] && [ "$PREV" != "$DIR" ]; then
    switch_to "$PREV"
    if healthy; then
      echo "Retour à la version précédente : $(basename "$PREV")" >&2
    else
      echo "La version précédente ($(basename "$PREV")) ne répond pas non plus." >&2
    fi
  fi
  exit 1
fi

# Garder les 5 versions les plus récentes (jamais la version active).
CURRENT="$(readlink -f "$BASE/current")"
ls -1dt "$BASE"/releases/*/ | tail -n +6 | while read -r old; do
  old="$(readlink -f "$old")"
  if [ "$old" != "$CURRENT" ]; then rm -rf -- "$old" || echo "Impossible de supprimer $old" >&2; fi
done

echo "Version active : $ID"
