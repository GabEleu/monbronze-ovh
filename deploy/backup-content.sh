#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# monbronze.fr : sauvegarde quotidienne du contenu modifiable depuis /admin (réalisations,
# ateliers, pages légales, photos, vidéos, modèles 3D). Installé par setup-vps.sh, lancé
# chaque nuit SOUS L'UTILISATEUR monbronze (/etc/cron.d/monbronze-contenu), jamais en root.
# Archives dans /srv/monbronze/backups (14 jours gardés).
# Elles restent sur le VPS : en télécharger une de temps en temps (DEPLOIEMENT-OVH.md).
# ─────────────────────────────────────────────────────────────
set -euo pipefail

BASE=/srv/monbronze
OUT="$BASE/backups/contenu-$(date +%Y%m%d).tar.gz"
umask 077
tar -czf "$OUT.tmp" -C "$BASE/shared" content media
mv -f "$OUT.tmp" "$OUT"
find "$BASE/backups" -maxdepth 1 -name 'contenu-*.tar.gz' -mtime +14 -delete
