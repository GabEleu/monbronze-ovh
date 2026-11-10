# Mettre monbronze.fr en ligne chez OVHcloud : tout depuis le navigateur

Ce guide s'adresse à la personne qui installe le site sur **son propre compte OVHcloud**.
Tout se fait dans le navigateur : rien à installer sur l'ordinateur. Une seule ligne est à
taper au clavier, dans la console du serveur. Comptez **45 minutes**, plus l'attente du
domaine (quelques heures).

---

## Ce qu'il faut

| Quoi                                                                    | Où                                         | Coût                                               |
| ----------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------- |
| Un compte OVHcloud                                                      | ovhcloud.com                               | gratuit                                            |
| Un **VPS-1**, système **Ubuntu 24.04**, centre de données **en France** | ovhcloud.com → VPS                         | environ 6,50 à 7,80 € HT par mois (voir le panier) |
| L'accès à la **zone DNS** du domaine monbronze.fr                       | chez le bureau d'enregistrement du domaine | —                                                  |

---

## Étape 1. Commander le serveur (10 min, puis attente de la livraison)

1. ovhcloud.com → **VPS** → **VPS-1**.
2. Système d'exploitation : **Ubuntu 24.04**. Localisation : **France** (Gravelines,
   Strasbourg ou Roubaix).
3. L'étape « Clé SSH » est facultative : on peut la passer.
4. Payez. OVHcloud envoie un e-mail quand le VPS est prêt, avec son **adresse IPv4** (quatre
   nombres, par exemple `51.75.12.34`), le nom d'utilisateur **ubuntu** et le moyen
   d'obtenir son **mot de passe**. Notez-les.

## Étape 2. Ouvrir la console du serveur (5 min)

1. Espace client OVHcloud → **Bare Metal Cloud** → **Serveurs privés virtuels** → votre VPS.
2. Bouton **« … »** en face du nom du VPS → **KVM**. Une fenêtre noire s'ouvre : c'est la
   console. Cliquez dedans. (Lien « Open in a new window » pour l'agrandir.)
3. **Test du clavier** : à la ligne `login:`, tapez `azerty` (sans valider).
   - S'il s'affiche `azerty` : parfait, continuez.
   - S'il s'affiche `qwerty` : la console est réglée en clavier américain. Effacez
     (touche ⌫), puis suivez l'encadré **« Clavier américain »** plus bas pour les étapes 2 et 3.
4. Effacez le test, tapez `ubuntu`, Entrée, puis le **mot de passe** (rien ne s'affiche
   pendant la saisie, c'est normal), Entrée.
5. Si le serveur demande de changer le mot de passe : retapez l'actuel, puis choisissez-en un
   nouveau, deux fois. Prenez des **lettres et des chiffres seulement** (plus simple à taper
   dans cette console), et notez-le.

Vous êtes connecté quand la ligne se termine par `ubuntu@…:~$`.

## Étape 3. Installer le site : une ligne à taper (15 min, automatique)

Tapez exactement cette ligne (attention aux espaces, au tiret et à la barre verticale `|`),
puis Entrée :

```bash
curl -L github.com/GabEleu/monbronze-ovh/raw/main/i | sudo bash
```

(Si un mot de passe est demandé, retapez celui de l'étape 2.)

Le serveur télécharge le site, s'équipe et le construit. Laissez faire jusqu'au cadre
**« TERMINÉ »**. Il affiche trois informations à **recopier sur papier** :

- l'**adresse IPv4** et l'**adresse IPv6** du serveur (pour l'étape 4) ;
- le **CODE D'INSTALLATION** (par exemple `K7QX-M2PA-9TRD`), pour l'étape 5.

Vérifiez dans votre navigateur : `http://ADRESSE_IPV4` affiche le site.

Pour réafficher ces informations plus tard, dans la console :
`sudo bash /srv/monbronze/bin/deploy/infos.sh`

## Étape 4. Relier le domaine monbronze.fr (10 min, puis 1 à 24 h d'attente)

Chez le bureau d'enregistrement de monbronze.fr (si c'est OVHcloud : espace client →
**Noms de domaine** → monbronze.fr → **Zone DNS**) :

| Type  | Sous-domaine | Cible                                 |
| ----- | ------------ | ------------------------------------- |
| A     | (vide, ou @) | l'adresse IPv4 du serveur             |
| AAAA  | (vide, ou @) | l'adresse IPv6 du serveur             |
| CNAME | www          | `monbronze.fr.` (avec le point final) |

- Remplacez les anciennes lignes **A**, **AAAA** et **www** si elles existent.
- **Ne touchez à aucune ligne MX** : elles font fonctionner la boîte contact@monbronze.fr.
- Si un ancien site répond aujourd'hui sur monbronze.fr, il sera remplacé par celui-ci.

**Le cadenas HTTPS s'active tout seul** : le serveur vérifie toutes les 5 minutes si le
domaine pointe vers lui, puis obtient un certificat gratuit (Let's Encrypt ; l'installation
vaut acceptation de ses conditions) et le renouvelle ensuite automatiquement. C'est fait
quand `https://monbronze.fr` affiche le site avec le cadenas.

## Étape 5. Choisir le mot de passe de l'administration (2 min, dans le navigateur)

C'est l'espace où la fonderie modifie elle-même son site : réalisations, photos, modèles 3D,
coordonnées, pages légales.

1. Ouvrez **`https://monbronze.fr/admin`** (après l'étape 4 : le cadenas est obligatoire).
2. Écran « Première connexion » : saisissez le **code d'installation** de l'étape 3, puis
   choisissez le mot de passe (12 caractères ou plus ; une petite phrase convient), deux fois.
3. Vous êtes connecté. Transmettez ce mot de passe à la fonderie **de vive voix**, jamais
   par e-mail. Il n'est stocké nulle part (seule son empreinte l'est).

## C'est en ligne

- Le site : `https://monbronze.fr`
- L'administration : `https://monbronze.fr/admin`
- Le contenu modifié depuis /admin est sauvegardé chaque nuit sur le serveur.

Le dépôt GitHub `monbronze-ovh` peut maintenant être supprimé : le serveur garde sa copie.

---

## Encadré : clavier américain (si le test de l'étape 2 affiche « qwerty »)

La console reçoit alors les touches comme un clavier américain. Sur un clavier français,
pressez **ces touches-là** pour obtenir ces caractères :

| Pour obtenir      | Pressez                          |     | Pour obtenir | Pressez     |
| ----------------- | -------------------------------- | --- | ------------ | ----------- |
| a                 | q                                |     | m            | , (virgule) |
| q                 | a                                |     | . (point)    | :           |
| z                 | w                                |     | /            | !           |
| w                 | z                                |     | - (tiret)    | )           |
| chiffres 1 à 9, 0 | & é " ' ( - è _ ç à **sans Maj** |     | \| (barre)   | Maj + \*    |

Le plus simple : **juste après vous être connecté**, passez la console en clavier français
en tapant (touches telles quelles sur votre clavier français) :

```text
sudo loqdkeys fr
```

puis Entrée (et le mot de passe si demandé). Ensuite, tout se tape normalement, y compris la
ligne de l'étape 3.

Si `loqdkeys` répond « command not found », tapez la ligne de l'étape 3 directement avec ces
touches (clavier français, console américaine) :

```text
curl )L github:co,!GqbEleu!,onbronwe)ovh!rqz!,qin!i [Maj+*] sudo bqsh
```

(`[Maj+*]` : maintenir Maj et presser la touche `*`, à côté d'Entrée.)

---

## Plus tard (avant d'annoncer le site)

Tant que ces services ne sont pas branchés, le formulaire de contact fonctionne en **mode
simulé** (rien n'est envoyé) :

1. **E-mails du formulaire** : compte gratuit sur resend.com (domaine monbronze.fr à vérifier
   par 3 lignes DNS, sans toucher aux MX) → une clé API.
2. **Anti-spam** : compte gratuit Cloudflare → Turnstile → un « widget » pour monbronze.fr
   (clé publique et clé secrète).
3. **Pièces jointes** : OVHcloud → Public Cloud → Object Storage (`DEPLOIEMENT-OVH.md`, § 3).

Ces clés se placent dans le fichier de réglages du serveur ; c'est l'affaire d'un
développeur (quelques minutes, détail dans `DEPLOIEMENT-OVH.md`).

## Mettre à jour le site plus tard

Le développeur republie un dépôt `monbronze-ovh` avec la nouvelle version ; dans la console,
la **même ligne** que l'étape 3 met le site à jour. Mots de passe, clés, certificat et
contenu modifié par la fonderie sont conservés.

## En cas de problème

| Symptôme                                                           | Que faire                                                                                                            |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| La ligne de l'étape 3 répond `curl: (6) Could not resolve host`    | Une faute de frappe dans l'adresse : retapez la ligne (la flèche ↑ la rappelle).                                     |
| Le cadre « TERMINÉ » n'apparaît pas, un message d'erreur s'affiche | Photographiez l'écran et envoyez-le au développeur.                                                                  |
| `https://monbronze.fr` sans cadenas après 24 h                     | Vérifiez les lignes DNS de l'étape 4 (A et www), puis attendez 10 minutes.                                           |
| /admin : « Connexion sécurisée (HTTPS) requise »                   | Le cadenas n'est pas encore actif : attendre la fin de l'étape 4.                                                    |
| /admin : « Code d'installation incorrect »                         | Le réafficher : `sudo bash /srv/monbronze/bin/deploy/infos.sh` dans la console.                                      |
| Mot de passe d'administration perdu                                | Dans la console : `sudo rm /srv/monbronze/shared/content/.admin-password`, puis refaire l'étape 5 avec le même code. |
