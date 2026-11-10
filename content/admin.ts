import { fr } from "@/lib/fr";

/**
 * Textes de l'espace d'administration (/admin), à part de content/site.ts : ils ne sont
 * jamais chargés par les pages publiques. Écrits avec des espaces normales : `fr()`
 * applique la typographie française (comme site.ts).
 */
export const admin = fr({
  title: "Espace d'administration",
  intro:
    "Modifiez les réalisations, les photos de l'atelier, les coordonnées et les pages légales. Chaque enregistrement est en ligne en quelques secondes.",
  viewSite: "Voir le site",
  logout: "Se déconnecter",
  loading: "Chargement…",
  disabled:
    "L'espace d'administration n'est pas encore configuré sur ce serveur (voir DEPLOIEMENT-OVH.md, « Espace d'administration »).",
  readOnly:
    "Le serveur n'a pas de dossier de contenu (CONTENT_DIR) : les modifications ne pourraient pas être enregistrées.",
  setup: {
    title: "Première connexion : choisir le mot de passe",
    intro:
      "Saisissez le code d'installation (affiché à la fin de l'installation du serveur), puis choisissez le mot de passe de l'espace d'administration. Il ne sera demandé qu'une fois.",
    code: "Code d'installation",
    codeHint: "Par exemple ABCD-EFGH-JKLM (majuscules ou minuscules, tirets facultatifs).",
    password: "Nouveau mot de passe (12 caractères ou plus)",
    passwordHint:
      "Une petite phrase facile à retenir convient, par exemple « bronze du jeudi 1200 degrés ».",
    confirm: "Confirmer le mot de passe",
    mismatch: "Les deux mots de passe diffèrent.",
    tooShort: "12 caractères au moins.",
    submit: "Enregistrer et entrer",
  },
  login: {
    title: "Connexion",
    password: "Mot de passe",
    submit: "Se connecter",
    pending: "Connexion…",
  },
  tabs: {
    realisations: "Réalisations",
    atelier: "Les ateliers",
    pages: "Coordonnées et pages légales",
  },
  common: {
    save: "Enregistrer",
    saving: "Enregistrement…",
    saved: "Enregistré : c'est en ligne.",
    cancel: "Annuler",
    remove: "Supprimer",
    up: "Monter",
    down: "Descendre",
    required: "obligatoire",
    error: "L'enregistrement a échoué :",
    invalid: "certains champs sont à corriger.",
    confirmLeave: "Des modifications ne sont pas enregistrées. Les abandonner ?",
    unsaved: "Modifications non enregistrées",
    sessionExpired:
      "Votre session a expiré : reconnectez-vous ci-dessous, vos saisies sont conservées.",
  },
  realisations: {
    intro:
      "Une réalisation = une page « histoire ». Marquez « Réalisation réelle » uniquement pour une pièce vraiment produite par la fonderie : sinon, le badge « Exemple illustratif » reste affiché.",
    add: "Nouvelle réalisation",
    edit: "Modifier",
    editing: "Modifier « {titre} »",
    creating: "Nouvelle réalisation",
    confirmDelete:
      "Supprimer cette réalisation du site ? Une copie est gardée sur le serveur : vous pourrez la faire restaurer.",
    confirmSlug:
      "L'adresse de la page change : l'ancienne adresse ne fonctionnera plus (liens déjà partagés). Continuer ?",
    needPhoto: "Ajoutez une photo principale avant d'enregistrer.",
    needType: "Choisissez la nature : réalisation réelle ou exemple illustratif.",
    needModel:
      "Un modèle 3D préparé attend : cliquez sur « Utiliser ce modèle », ou sur « Recommencer ».",
    museumReel:
      "Cette page montre une œuvre de musée (rendu numérique) : elle ne peut pas être présentée comme une réalisation réelle. Choisissez « Exemple illustratif », ou remplacez la photo et la sculpture par celles de votre pièce.",
    museumHint:
      "Photo ou sculpture issue d'une œuvre de musée : « Exemple illustratif » obligatoire ; la légende « Rendu numérique d'après … » reste affichée.",
    fields: {
      titre: "Titre",
      slug: "Adresse de la page",
      slugHint: "Minuscules, chiffres et tirets : /realisations/",
      type: "Nature",
      illustratif: "Exemple illustratif",
      reel: "Réalisation réelle de la fonderie",
      ordre: "Ordre d'affichage",
      univers: "Univers",
      description: "Résumé (une ou deux phrases)",
      besoin: "Le besoin",
      solution: "La solution",
      etapes: "Étapes du procédé",
      etapesHint: "Cochez seulement les étapes réellement suivies pour cette pièce.",
      patine: "Patine de la sculpture 3D",
      visuel: "Photo principale",
      modele: "Sculpture 3D de la page",
      modeleSelect: "Modèle",
      modeleNone: "Aucune (photo seule)",
      modeleUploaded: "Modèle envoyé",
      legend: "Légende sous la sculpture (facultatif)",
      legendHint:
        "Ex. « Bronze patiné, 40 cm ». Pour une œuvre d'un musée : « Rendu numérique d'après … ».",
    },
    illustrativeBadge: "Exemple",
    realBadge: "Réelle",
  },
  atelier: {
    intro:
      "Les gestes de l'atelier (accueil, section « Les ateliers »). Photos d'œuvres : ne citez aucun artiste ni client sans leur accord.",
    add: "Ajouter un geste",
    gesture: "Geste",
    title: "Titre",
    text: "Texte",
    image: "Photo",
    needImage: "Chaque geste a besoin d'une photo",
    video: "Vidéo (facultative, muette, en boucle)",
    removeVideo: "Retirer la vidéo",
  },
  pages: {
    coordonnees: "Coordonnées (pied de page)",
    adresse: "Adresse",
    telephone: "Téléphone",
    emptyHint: "Laissé vide, le site affiche « [À COMPLÉTER] ».",
    mentions: "Mentions légales",
    confidentialite: "Politique de confidentialité",
    updated: "Ligne « Dernière mise à jour »",
    section: "Section",
    sectionTitle: "Titre de la section",
    paragraphs: "Paragraphes (une ligne vide entre deux paragraphes)",
    list: "Liste à puces (facultatif, un élément par ligne)",
    addSection: "Ajouter une section",
  },
  media: {
    choose: "Choisir un fichier",
    replace: "Remplacer",
    alt: "Description de l'image (lue aux personnes aveugles)",
    altHint: "Décrivez ce que montre CETTE photo, en une phrase.",
    uploading: "Envoi…",
    imageHint: "JPEG, PNG, WebP ou HEIC. L'image est redimensionnée automatiquement.",
    videoHint: "MP4, 80 Mo au plus. Quelques secondes suffisent ; le son est coupé sur le site.",
    error: "Envoi impossible :",
  },
  model: {
    choose: "Envoyer un modèle 3D",
    hint: "Uniquement vos propres pièces, ou des fichiers dont vous avez les droits. GLB, OBJ, STL ou PLY (scan ou fichier d'impression) : le modèle est simplifié et préparé pour le bronze dans votre navigateur (une à deux minutes).",
    lying: "Le modèle apparaît couché (fichier « Z vers le haut »)",
    turn: "Tourner face à la caméra",
    orientationLocked: "Pour changer l'orientation, cliquez sur « Recommencer ».",
    reading: "Lecture du fichier…",
    preparing: "Préparation du bronze",
    ready:
      "Aperçu : tournez la sculpture avec la souris ou le doigt ; l'image fixe est prise sous cet angle. Ensuite : « Utiliser ce modèle », puis « Enregistrer » en bas de la page.",
    save: "Utiliser ce modèle",
    used: "Modèle prêt : cliquez sur « Enregistrer » en bas de la page pour le publier.",
    retry: "Recommencer",
    tooBig: "Le fichier dépasse 200 Mo : réduisez-le avant l'envoi.",
    failed: "Ce fichier n'a pas pu être préparé :",
    noWebgl:
      "Ce navigateur ne peut pas afficher la 3D : utilisez un ordinateur récent (Chrome, Edge, Firefox ou Safari à jour) pour envoyer un modèle.",
    previewFailed: "L'aperçu 3D n'a pas pu s'afficher dans ce navigateur.",
  },
});
