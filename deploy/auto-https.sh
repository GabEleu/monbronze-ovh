#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# monbronze.fr : active le HTTPS TOUT SEUL dès que monbronze.fr et www.monbronze.fr pointent
# vers ce serveur. Lancé toutes les 5 minutes par la minuterie monbronze-https.timer
# (installée par setup-vps.sh tant qu'il n'y a pas de certificat), qui s'arrête ensuite.
# Adresse e-mail des avis Let's Encrypt : LETSENCRYPT_EMAIL dans .env.production (facultatif).
# Journal : journalctl -u monbronze-https
# ─────────────────────────────────────────────────────────────
set -euo pipefail

BASE=/srv/monbronze
HERE="$(cd "$(dirname "$0")" && pwd)"

stop_timer() { systemctl disable --now monbronze-https.timer >/dev/null 2>&1 || true; }

if [ -f /etc/letsencrypt/live/monbronze.fr/fullchain.pem ]; then
  stop_timer
  exit 0
fi

MINE=" $(hostname -I) "
points_here() {
  local ip
  for ip in $(getent ahostsv4 "$1" | awk '{print $1}' | sort -u); do
    case "$MINE" in *" $ip "*) return 0 ;; esac
  done
  return 1
}

if ! points_here monbronze.fr || ! points_here www.monbronze.fr; then
  echo "monbronze.fr et www.monbronze.fr ne pointent pas encore tous deux vers ce serveur."
  exit 0
fi

EMAIL="$({ grep -E '^LETSENCRYPT_EMAIL=' "$BASE/shared/.env.production" || true; } | cut -d= -f2- | tr -d '"')"
bash "$HERE/enable-https.sh" "$EMAIL"
stop_timer
echo "HTTPS activé."
