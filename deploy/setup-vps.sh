#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# monbronze.fr : préparation d'un VPS OVHcloud neuf (Ubuntu 24.04). Depuis ton ordinateur :
#   scp -r deploy ubuntu@ADRESSE_IP:~/
#   ssh ubuntu@ADRESSE_IP "sudo bash ~/deploy/setup-vps.sh"
# Installe Node.js 22, Nginx, certbot, git, le pare-feu et les mises à jour de sécurité
# automatiques ; crée l'utilisateur « monbronze », le service et le dépôt git qui reçoit le
# code (git push ovh main → build sur le VPS → mise en ligne). Relançable sans risque.
# Le site ne tourne qu'après le premier « git push ». Voir DEPLOIEMENT-OVH.md.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "À lancer en root : sudo bash deploy/setup-vps.sh" >&2; exit 1; }
grep -q 'VERSION_ID="24.04"' /etc/os-release || echo "Attention : script prévu pour Ubuntu 24.04." >&2

HERE="$(cd "$(dirname "$0")" && pwd)"
APP_USER=monbronze
BASE=/srv/monbronze
export DEBIAN_FRONTEND=noninteractive

echo "→ Paquets système"
apt-get update
apt-get -y upgrade
apt-get install -y nginx certbot ufw fail2ban unattended-upgrades curl ca-certificates git

echo "→ Mémoire d'appoint (le build de Next en a besoin sur un petit VPS)"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q "^/swapfile " /etc/fstab || echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

echo "→ Node.js 22 (LTS, dépôt officiel NodeSource)"
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -Eq '^v(2[2-9]|[3-9][0-9])\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
  bash /tmp/nodesource_setup.sh
  apt-get install -y nodejs
fi
node -v

echo "→ Mises à jour de sécurité automatiques"
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "→ Pare-feu : SSH, HTTP et HTTPS seulement"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "→ Utilisateur $APP_USER (connexion par clé SSH uniquement, sans mot de passe)"
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  adduser --system --group --shell /bin/bash --home "/home/$APP_USER" "$APP_USER"
fi
install -d -o "$APP_USER" -g "$APP_USER" -m 700 "/home/$APP_USER/.ssh"
touch "/home/$APP_USER/.ssh/authorized_keys"
chown "$APP_USER:$APP_USER" "/home/$APP_USER/.ssh/authorized_keys"
chmod 600 "/home/$APP_USER/.ssh/authorized_keys"

echo "→ Dossiers du site ($BASE)"
install -d -o "$APP_USER" -g "$APP_USER" -m 755 "$BASE" "$BASE/releases" "$BASE/incoming"
# 711 : Nginx (www-data) traverse shared/ pour servir shared/media, sans pouvoir lister.
install -d -o "$APP_USER" -g "$APP_USER" -m 711 "$BASE/shared"
chmod 711 "$BASE/shared"
# Contenu et médias modifiés depuis /admin : hors des versions, conservés d'un déploiement à l'autre.
install -d -o "$APP_USER" -g "$APP_USER" -m 700 "$BASE/shared/content" "$BASE/backups"
install -d -o "$APP_USER" -g "$APP_USER" -m 755 "$BASE/shared/media"
install -d -o root -g root -m 755 "$BASE/bin"
if [ ! -f "$BASE/shared/.env.production" ]; then
  install -o "$APP_USER" -g "$APP_USER" -m 600 "$HERE/env.production.example" \
    "$BASE/shared/.env.production"
fi
ENVF="$BASE/shared/.env.production"
# Secrets créés une fois (jamais écrasés) : signature des sessions, et code d'installation
# qui permet de choisir le mot de passe de /admin dans le navigateur (première connexion).
if ! grep -qE '^ADMIN_SESSION_SECRET=.{32,}' "$ENVF"; then
  sed -i '/^ADMIN_SESSION_SECRET=/d' "$ENVF"
  echo "ADMIN_SESSION_SECRET=$(openssl rand -hex 24)" >> "$ENVF"
fi
if ! grep -qE '^ADMIN_SETUP_CODE=.{8,}' "$ENVF"; then
  sed -i '/^ADMIN_SETUP_CODE=/d' "$ENVF"
  CODE="$(openssl rand -base64 96 | tr -dc 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' | cut -c1-12)"
  echo "ADMIN_SETUP_CODE=${CODE:0:4}-${CODE:4:4}-${CODE:8:4}" >> "$ENVF"
fi
grep -q '^LETSENCRYPT_EMAIL=' "$ENVF" || echo "LETSENCRYPT_EMAIL=" >> "$ENVF"
chown "$APP_USER:$APP_USER" "$ENVF"
chmod 600 "$ENVF"

# Scripts lancés par root : copies appartenant à root (jamais depuis un dossier du site).
rm -rf "$BASE/bin/deploy"
cp -r "$HERE" "$BASE/bin/deploy"
chown -R root:root "$BASE/bin/deploy"
chmod -R go-w "$BASE/bin/deploy"
chmod 755 "$BASE/bin/deploy/"*.sh
install -o root -g root -m 755 "$HERE/activate-release.sh" "$BASE/bin/activate-release"
install -o root -g root -m 755 "$HERE/build-release.sh" "$BASE/bin/build-release"

echo "→ Dépôt git qui reçoit le code (git push ovh main)"
if [ ! -d "$BASE/repo.git" ]; then
  sudo -u "$APP_USER" git init --bare --initial-branch=main "$BASE/repo.git"
fi
install -o "$APP_USER" -g "$APP_USER" -m 755 "$HERE/post-receive" "$BASE/repo.git/hooks/post-receive"

echo "→ Sauvegarde quotidienne du contenu modifiable (14 jours gardés)"
# Lancée SOUS L'UTILISATEUR monbronze (jamais root : il écrit dans un dossier qui lui appartient).
install -o root -g root -m 755 "$HERE/backup-content.sh" "$BASE/bin/backup-content"
echo "17 3 * * * $APP_USER $BASE/bin/backup-content" > /etc/cron.d/monbronze-contenu
chmod 644 /etc/cron.d/monbronze-contenu
rm -f /etc/cron.daily/monbronze-contenu

echo "→ Service systemd"
install -m 644 "$HERE/systemd/monbronze.service" /etc/systemd/system/monbronze.service
systemctl daemon-reload
systemctl enable monbronze

echo "→ Droit de redémarrer le site (et rien d'autre) pour le déploiement"
echo "$APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart monbronze" > /etc/sudoers.d/monbronze
chmod 440 /etc/sudoers.d/monbronze
visudo -cf /etc/sudoers.d/monbronze

echo "→ Nginx (HTTP en attendant le certificat)"
install -d /var/www/certbot
install -m 644 "$HERE/nginx/monbronze-headers.conf" /etc/nginx/snippets/monbronze-headers.conf
install -m 644 "$HERE/nginx/monbronze-tls.conf" /etc/nginx/snippets/monbronze-tls.conf
install -m 644 "$HERE/nginx/monbronze-proxy.conf" /etc/nginx/snippets/monbronze-proxy.conf
# Relancé après enable-https.sh : on garde la configuration HTTPS.
if [ -f /etc/letsencrypt/live/monbronze.fr/fullchain.pem ]; then
  install -m 644 "$HERE/nginx/monbronze.fr.conf" /etc/nginx/sites-available/monbronze.fr
else
  install -m 644 "$HERE/nginx/monbronze.fr.bootstrap.conf" /etc/nginx/sites-available/monbronze.fr
fi
ln -sfn /etc/nginx/sites-available/monbronze.fr /etc/nginx/sites-enabled/monbronze.fr
rm -f /etc/nginx/sites-enabled/default
if ! nginx -t; then
  echo "Nginx refuse la configuration : rien n'a été rechargé (voir le message ci-dessus)." >&2
  exit 1
fi
systemctl reload nginx

echo "→ HTTPS automatique dès que le domaine pointe vers ce serveur"
install -m 644 "$HERE/systemd/monbronze-https.service" /etc/systemd/system/monbronze-https.service
install -m 644 "$HERE/systemd/monbronze-https.timer" /etc/systemd/system/monbronze-https.timer
systemctl daemon-reload
if [ ! -f /etc/letsencrypt/live/monbronze.fr/fullchain.pem ]; then
  systemctl enable --now monbronze-https.timer
fi

echo "Préparation du serveur terminée (détail : DEPLOIEMENT-OVH.md)."
