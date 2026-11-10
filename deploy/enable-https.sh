#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# monbronze.fr : certificat HTTPS (Let's Encrypt, gratuit) et configuration Nginx définitive.
# Lancé tout seul par auto-https.sh dès que monbronze.fr ET www.monbronze.fr pointent vers ce
# VPS, ou à la main :
#   sudo bash deploy/enable-https.sh [votre@adresse.fr]
# L'adresse (facultative) reçoit les avis d'expiration de Let's Encrypt. L'installation du
# site vaut acceptation des conditions d'utilisation de Let's Encrypt
# (https://letsencrypt.org/repository/), qui délivre gratuitement le certificat.
# Renouvellement automatique : minuterie systemd « certbot.timer » (installée avec certbot).
# ─────────────────────────────────────────────────────────────
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "À lancer en root : sudo bash deploy/enable-https.sh" >&2; exit 1; }
EMAIL="${1:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"

if [ -n "$EMAIL" ]; then
  ACCOUNT=(-m "$EMAIL" --no-eff-email)
else
  ACCOUNT=(--register-unsafely-without-email)
fi
certbot certonly --non-interactive --webroot -w /var/www/certbot \
  -d monbronze.fr -d www.monbronze.fr \
  "${ACCOUNT[@]}" --agree-tos \
  --deploy-hook "systemctl reload nginx"

install -m 644 "$HERE/nginx/monbronze-headers.conf" /etc/nginx/snippets/monbronze-headers.conf
install -m 644 "$HERE/nginx/monbronze-tls.conf" /etc/nginx/snippets/monbronze-tls.conf
install -m 644 "$HERE/nginx/monbronze-proxy.conf" /etc/nginx/snippets/monbronze-proxy.conf
SITE=/etc/nginx/sites-available/monbronze.fr
cp -a "$SITE" "$SITE.avant-https"
install -m 644 "$HERE/nginx/monbronze.fr.conf" "$SITE"
if ! nginx -t; then
  cp -a "$SITE.avant-https" "$SITE"
  echo "Configuration HTTPS refusée par Nginx : configuration précédente remise." >&2
  exit 1
fi
systemctl reload nginx

echo "HTTPS actif : https://monbronze.fr (renouvellement : systemctl list-timers | grep certbot)"
