#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# monbronze.fr : installation (ou mise à jour) en UNE ligne, tapée dans la console du VPS
# (espace client OVHcloud → VPS → KVM), sans rien installer sur son ordinateur :
#
#   curl -L github.com/GabEleu/monbronze-ovh/raw/main/i | sudo bash
#
# Télécharge le site depuis le dépôt public, puis lance deploy/installer.sh. Le dépôt peut
# être supprimé après l'installation : le serveur garde sa propre copie.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# Tout le script est lu avant d'être exécuté (il arrive par un « | », comme l'entrée standard).
main() {
  local repo="${MONBRONZE_REPO:-https://github.com/GabEleu/monbronze-ovh}"
  local dir=/root/monbronze-installation
  echo "→ Téléchargement du site depuis $repo"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq git ca-certificates curl >/dev/null
  rm -rf -- "$dir"
  # Clone complet (pas --depth : un clone superficiel ne peut pas être poussé vers le dépôt du serveur).
  git clone --quiet "$repo" "$dir" </dev/null
  bash "$dir/deploy/installer.sh" </dev/null
}

[ "$(id -u)" -eq 0 ] || { echo "Ajoutez « sudo » : curl -L … | sudo bash" >&2; exit 1; }
main "$@"
