#!/usr/bin/env bash
# monbronze.fr : réaffiche les informations utiles (adresses du serveur, code d'installation
# de /admin, état du site et du HTTPS) :   sudo bash /srv/monbronze/bin/deploy/infos.sh
set -uo pipefail
BASE=/srv/monbronze
IP4="$(hostname -I | tr ' ' '\n' | grep -E '^[0-9]+\.' | head -n1)"
IP6="$(hostname -I | tr ' ' '\n' | grep ':' | grep -v '^fe80' | head -n1)"
CODE="$(grep -E '^ADMIN_SETUP_CODE=' "$BASE/shared/.env.production" 2>/dev/null | cut -d= -f2-)"
SITE="arrêté"
curl -fsS -o /dev/null --max-time 5 http://127.0.0.1:3000/ && SITE="en ligne"
HTTPS="pas encore (le domaine doit pointer vers $IP4)"
[ -f /etc/letsencrypt/live/monbronze.fr/fullchain.pem ] && HTTPS="actif"
ADMIN="mot de passe à choisir sur https://monbronze.fr/admin avec le code ci-dessus"
[ -f "$BASE/shared/content/.admin-password" ] && ADMIN="mot de passe déjà choisi"
cat <<EOF
  Site          : $SITE (http://$IP4)
  Adresse IPv4  : $IP4
  Adresse IPv6  : ${IP6:-(aucune)}
  HTTPS         : $HTTPS
  Code /admin   : $CODE
  Administration: $ADMIN
EOF
