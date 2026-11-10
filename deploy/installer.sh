#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# monbronze.fr : installation complète à partir de l'archive reçue, en UNE commande, sur un
# VPS OVHcloud neuf (Ubuntu 24.04). Sert aussi aux mises à jour du code (nouvelle archive).
#
#   unzip monbronze-pour-ovh.zip
#   sudo bash monbronze/deploy/installer.sh
#
# 1. Prépare le serveur (setup-vps.sh : Node.js, Nginx, pare-feu, utilisateur, service…).
# 2. Copie le code dans /srv/monbronze/source.
# 3. Le publie : construction du site sur le VPS (3 à 5 minutes), puis mise en ligne, avec
#    retour automatique à la version précédente en cas de problème.
# Le contenu modifié depuis /admin (textes, photos, modèles) n'est jamais touché.
# Guide pas à pas : GUIDE-MISE-EN-LIGNE.md.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "À lancer avec sudo : sudo bash monbronze/deploy/installer.sh" >&2; exit 1; }
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$(dirname "$HERE")"
BASE=/srv/monbronze

[ -d "$SRC/.git" ] || { echo "Dossier .git absent : décompressez l'archive complète." >&2; exit 1; }

bash "$HERE/setup-vps.sh"

echo "→ Copie du code dans $BASE/source"
rm -rf -- "$BASE/source.new"
cp -a "$SRC" "$BASE/source.new"
chown -R monbronze:monbronze "$BASE/source.new"
rm -rf -- "$BASE/source"
mv "$BASE/source.new" "$BASE/source"

echo "→ Publication : construction du site sur le VPS (3 à 5 minutes)…"
sudo -u monbronze -H git -C "$BASE/source" push --force "$BASE/repo.git" HEAD:main

if ! curl -fsS -o /dev/null --max-time 10 http://127.0.0.1:3000/; then
  echo "Le site ne répond pas : voir les messages ci-dessus, et « journalctl -u monbronze -n 50 »." >&2
  exit 1
fi

IP4="$(hostname -I | tr ' ' '\n' | grep -E '^[0-9]+\.' | head -n1 || true)"
IP6="$(hostname -I | tr ' ' '\n' | grep ':' | grep -v '^fe80' | head -n1 || true)"
CODE="$({ grep -E '^ADMIN_SETUP_CODE=' "$BASE/shared/.env.production" || true; } | cut -d= -f2-)"
cat <<EOF

══════════════════════════════════════════════════════════════
  TERMINÉ. Le site répond déjà : http://$IP4

  À NOTER (domaine, étape suivante du guide) :
    adresse IPv4 : $IP4
    adresse IPv6 : ${IP6:-(aucune)}

  CODE D'INSTALLATION (première connexion à /admin) :  $CODE

  Le HTTPS s'activera tout seul dès que monbronze.fr pointera ici.
  Pour réafficher ce message : sudo bash /srv/monbronze/bin/deploy/infos.sh
══════════════════════════════════════════════════════════════
EOF
