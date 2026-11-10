# Héberger monbronze.fr sur OVHcloud (VPS), sans autre service

Tout est prêt dans le dépôt : configuration du serveur (`deploy/`), déploiement par
`git push` directement vers le VPS (le VPS construit le site lui-même : **ni GitHub ni Vercel
nécessaires**) et stockage des pièces jointes chez OVHcloud. Les étapes marquées **(toi)**
demandent un compte, un achat ou un accès que toi seul peux faire.

Architecture :

```
Ton ordinateur ──git push ovh main──▶ VPS : dépôt git → build (2 à 4 min) → activation
                                       (vérification, retour arrière automatique si erreur)
Visiteur ──HTTPS──▶ Nginx (VPS) ──▶ Next.js autonome (127.0.0.1:3000, service systemd)
                       └─ fichiers lourds (modèles 3D, vidéos, /_next/static) servis du disque
Navigateur ──PUT signé──▶ OVHcloud Object Storage (conteneur PRIVÉ des pièces jointes)
```

Le code n'existe alors que sur ton ordinateur et sur le VPS : garde une copie de sauvegarde
(disque externe, ou le dépôt GitHub privé actuel, qui peut rester en simple archive).

> **Installation sans terminal** (tout dans le navigateur) : `GUIDE-MISE-EN-LIGNE.md`. Une ligne tapée dans la
> console KVM d'OVH télécharge le site depuis le dépôt public `monbronze-ovh` et l'installe ; le HTTPS s'active seul
> dès que le domaine pointe vers le serveur ; le mot de passe de /admin se choisit dans le navigateur avec le code
> d'installation affiché à la fin.
>
> **Installation par une autre personne, sur son propre compte OVHcloud** : lui envoyer l'archive
> `monbronze-pour-ovh.zip` et `GUIDE-MISE-EN-LIGNE.md` (pas à pas, sans prérequis technique).
> L'archive s'installe en une commande (`deploy/installer.sh`, qui enchaîne les étapes 2 et 5
> ci-dessous). Ce document-ci garde le détail technique.

## 1. Commander (toi)

| Quoi                                                                              | Où                                             | Coût indicatif                                    |
| --------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| **VPS-1**, Ubuntu 24.04, datacenter en France (Gravelines, Strasbourg ou Roubaix) | ovhcloud.com → VPS                             | ≈ 6,50 à 7,80 € HT/mois (vérifier dans le panier) |
| **Object Storage** S3, même région (ex. GRA)                                      | Espace client → Public Cloud → Object Storage  | quelques centimes par Go stocké                   |
| Domaine `monbronze.fr`                                                            | déjà chez son registrar (transfert facultatif) | —                                                 |

À la commande du VPS, ajoute ta **clé SSH publique** (sinon OVH envoie un mot de passe par e-mail).
Note l'adresse IPv4 (et IPv6) du VPS.

## 2. Préparer le VPS (une fois)

Depuis le dossier du site, sur ton ordinateur :

```bash
scp -r deploy ubuntu@ADRESSE_IP_DU_VPS:~/
ssh ubuntu@ADRESSE_IP_DU_VPS "sudo bash ~/deploy/setup-vps.sh"
```

Le script installe Node.js 22, Nginx, certbot, git, le pare-feu (SSH, HTTP, HTTPS), fail2ban,
2 Go de mémoire d'appoint et les mises à jour de sécurité automatiques ; il crée l'utilisateur
`monbronze`, les dossiers `/srv/monbronze/{releases,shared,incoming,build}`, le service
`monbronze` et le dépôt `/srv/monbronze/repo.git` qui reçoit le code.

## 3. Stockage des pièces jointes (toi, puis une commande)

1. Espace client → Public Cloud → Object Storage → **créer un utilisateur S3** (noter la clé
   d'accès et la clé secrète), puis **créer un conteneur** S3 standard, région GRA, **privé**
   (ne jamais le rendre public : la fonderie reçoit des liens signés valables 7 jours).
2. Autoriser l'envoi depuis le site (CORS), depuis ton ordinateur avec l'outil AWS CLI
   configuré avec cet utilisateur (administrateur) :

   ```bash
   aws --endpoint-url https://s3.gra.io.cloud.ovh.net s3api put-bucket-cors \
     --bucket NOM_DU_CONTENEUR --cors-configuration file://deploy/s3-cors.json
   ```

3. **Obligatoire** : une règle de cycle de vie qui supprime les objets `demandes/` après N jours
   (durée à fixer avec la fonderie, puis à écrire dans la page confidentialité ; par exemple
   90 jours). Sans elle, le stockage, donc la facture, ne fait que grandir.
4. **Un second utilisateur S3 pour le site**, avec les seuls droits nécessaires : importer la
   politique `deploy/s3-policy.json` (remplacer `NOM_DU_CONTENEUR`) dans Object Storage →
   Utilisateurs → Importer une politique. Ce sont SES clés qui vont sur le VPS (§ 4) : même volées,
   elles ne permettent ni de lister, ni de supprimer, ni de rendre un fichier public.
5. Contrôle avant mise en ligne : envoyer un fichier par le formulaire, puis vérifier qu'il n'est
   **pas** lisible sans signature (`curl -I https://NOM_DU_CONTENEUR.s3.gra.io.cloud.ovh.net/demandes/…`
   doit répondre 403), même en ajoutant `-H "x-amz-acl: public-read"` à un envoi signé.

Le site plafonne aussi lui-même les envois : 20 adresses par visiteur et par 10 minutes, 1 Go par
visiteur et par jour, 2 Go par heure et 10 Go par jour pour tout le site (`app/api/upload/route.ts`).

## 4. Clés du site sur le VPS

```bash
sudo -u monbronze nano /srv/monbronze/shared/.env.production
```

Remplir Resend, Turnstile (clé secrète) et Object Storage (modèle commenté :
`deploy/env.production.example`). Jamais dans git. Après toute modification :
`sudo systemctl restart monbronze`.

Turnstile va **par paire** : les deux clés dans ce fichier. Sans la publique, le formulaire
n'affiche pas le défi et toute demande est refusée ; sans la secrète, le site n'envoie pas
d'accusé de réception au visiteur (protection contre l'envoi d'e-mails à des inconnus par un robot).
Les variables `NEXT_PUBLIC_*` et `S3_BUCKET` sont lues au build : après les avoir changées,
reconstruire (`sudo -u monbronze /srv/monbronze/bin/build-release`).

## 5. Mettre en ligne : `git push`

Une fois, sur ton ordinateur (Git Bash) : autoriser ta clé SSH à déposer le code.

```bash
ls ~/.ssh/id_ed25519.pub || ssh-keygen -t ed25519 -C "monbronze"
cat ~/.ssh/id_ed25519.pub | ssh ubuntu@ADRESSE_IP_DU_VPS "sudo tee -a /home/monbronze/.ssh/authorized_keys"
git remote add ovh monbronze@ADRESSE_IP_DU_VPS:/srv/monbronze/repo.git
```

Puis, à chaque nouvelle version :

```bash
git push ovh main
```

Le terminal affiche le build ; le VPS installe les dépendances (seulement si elles ont changé),
construit le site, l'active, vérifie qu'il répond et revient tout seul à la version précédente
sinon. Le site reste en ligne pendant le build. Reconstruire sans nouveau code :
`ssh monbronze@ADRESSE_IP_DU_VPS /srv/monbronze/bin/build-release`.

Vérifier avant de changer le DNS : `curl -H "Host: monbronze.fr" http://ADRESSE_IP_DU_VPS/`,
ou ajouter `ADRESSE_IP_DU_VPS monbronze.fr` au fichier `hosts` de ton ordinateur le temps d'un essai.

## 6. Domaine (toi, zone DNS chez le registrar)

1. La veille : baisser le TTL des enregistrements à 300 s.
2. `A @ → IPv4 du VPS`, `AAAA @ → IPv6 du VPS`, `CNAME www → monbronze.fr.`
3. **Ne pas toucher aux enregistrements MX** (boîte contact@) ; ajouter ceux de Resend (SPF,
   DKIM, DMARC) pour l'envoi des e-mails.

## 7. HTTPS (une commande, après propagation du DNS)

```bash
ssh ubuntu@ADRESSE_IP_DU_VPS "sudo bash /srv/monbronze/build/deploy/enable-https.sh ton@adresse.fr"
```

Certificat Let's Encrypt gratuit, renouvelé automatiquement ; HTTP et `www` redirigent vers
`https://monbronze.fr`. Lancer ce script vaut acceptation des conditions de Let's Encrypt.

## 8. Espace d'administration (pour la fonderie)

Adresse : **https://monbronze.fr/admin** (non référencée par les moteurs de recherche). On y
modifie, sans toucher au code et sans reconstruire le site :

- les **réalisations** : textes, photo, nature (exemple illustratif ou réalisation réelle),
  sculpture 3D (un des modèles du site, ou un **fichier envoyé** : GLB, OBJ, STL ou PLY, préparé
  automatiquement dans le navigateur, avec aperçu en bronze) ;
- **les ateliers** de l'accueil : titres, textes, photos, vidéos, ordre ;
- les **coordonnées** du pied de page et les **pages légales**.

Mise en service (une fois, après le HTTPS : sans lui, la connexion est refusée) :

```bash
ssh monbronze@ADRESSE_IP_DU_VPS
node /srv/monbronze/build/scripts/admin-password.mjs   # demande le mot de passe, affiche 2 lignes
nano /srv/monbronze/shared/.env.production             # coller ADMIN_PASSWORD_HASH et ADMIN_SESSION_SECRET
exit
ssh ubuntu@ADRESSE_IP_DU_VPS "sudo systemctl restart monbronze"
```

Le mot de passe n'est stocké nulle part (seulement son empreinte). Pour le changer : relancer le
script et remplacer les deux lignes (tout le monde est déconnecté). Sécurité : session de 12 h
(cookie protégé), 5 essais par quart d'heure, connexion seulement en HTTPS.

**Où vit le contenu** : `/srv/monbronze/shared/content` (textes) et `/srv/monbronze/shared/media`
(fichiers envoyés), hors des versions déployées. Un `git push` ne les écrase pas. Conséquence
pour le développement : une fois une réalisation modifiée depuis /admin, les fichiers
`content/realisations/*.json` du dépôt ne servent plus que de modèle de départ.

Filets de sécurité : chaque enregistrement garde l'ancienne version
(`/srv/monbronze/shared/content/.historique/`, 30 par fichier) et une archive complète est faite
chaque nuit (`/srv/monbronze/backups/contenu-AAAAMMJJ.tar.gz`, 14 jours). En rapatrier une de
temps en temps : `scp monbronze@ADRESSE_IP_DU_VPS:/srv/monbronze/backups/contenu-*.tar.gz .`

## 9. Quitter Vercel (toi, une fois le site vérifié sur OVH)

Vercel → projet `mon-bronze` → Settings → Git → **Disconnect**, puis supprimer le projet si
l'aperçu `mon-bronze.vercel.app` n'est plus utile au client.

## 10. Vérifications

- [ ] `https://monbronze.fr` répond, `http://` et `www` redirigent, cadenas valide.
- [ ] Formulaire : une demande avec pièce jointe → e-mail reçu, lien « télécharger » valide.
- [ ] `/sitemap.xml`, `/robots.txt`, image de partage, vidéos d'atelier (lecture sur iPhone).
- [ ] Lighthouse sur l'adresse de production.
- [ ] `/admin` : connexion, modification d'un texte, visible sur le site en quelques secondes.
- [ ] `journalctl -u monbronze -n 50` sans erreur.

## 11. Au quotidien

| Besoin                  | Commande (sur le VPS)                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Journal du site         | `journalctl -u monbronze -f`                                                                                           |
| Redémarrer              | `sudo systemctl restart monbronze`                                                                                     |
| Versions installées     | `ls -1t /srv/monbronze/releases`                                                                                       |
| **Revenir en arrière**  | `sudo -u monbronze ln -sfn /srv/monbronze/releases/VERSION /srv/monbronze/current && sudo systemctl restart monbronze` |
| Mettre à jour la config | après un `git push` : `sudo bash /srv/monbronze/build/deploy/setup-vps.sh` (sans effet sur les clés)                   |

Sécurité : une fois la connexion par clé vérifiée, désactiver la connexion SSH par mot de passe
(`PasswordAuthentication no` dans `/etc/ssh/sshd_config.d/`). Sauvegardes : option
« Sauvegarde automatique » du VPS chez OVHcloud (payante) ; le site lui-même se redéploie par
`git push` ; sont à préserver : les clés (`.env.production`), le contenu modifiable
(`/srv/monbronze/shared`, archivé chaque nuit dans `/srv/monbronze/backups`) et les pièces jointes
(Object Storage).

Différences avec Vercel : pas de réseau de diffusion mondial (sans importance pour une clientèle en
Île-de-France), et la maintenance du serveur t'incombe (mises à jour de sécurité automatiques
déjà activées).
