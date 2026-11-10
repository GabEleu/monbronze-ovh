/**
 * TOUS les textes du site (BRIEF.md §6). Aucun texte en dur dans les composants.
 *
 * Règles d'honnêteté : aucun fait inventé sur la fonderie. Ce qui est inconnu
 * reste marqué A_COMPLETER. Les textes signalés « rédigé, à valider » sont des
 * propositions de Claude (descriptions génériques du procédé), pas des faits.
 *
 * Écrire avec des espaces et apostrophes normales : `fr()` applique la typographie française.
 */
import { fr } from "@/lib/fr";
import type { AssetId, Patine } from "@/content/assets";

export const A_COMPLETER = "[À COMPLÉTER]";
export const CONTACT_EMAIL = "contact@monbronze.fr";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://monbronze.fr";
export const DEONTOLOGIE_URL =
  "https://www.fonderie-artculture.fr/code-de-deontologie-des-fondeurs-dart/";

export type StepId =
  "capturer" | "modeliser" | "fabriquer" | "mouler-et-fondre" | "ciseler-et-patiner";
export type UniversId =
  "memoire" | "amour" | "fidelite" | "creation" | "transmission" | "patrimoine";

const brand = {
  name: "monbronze",
  tld: ".fr",
  baseline: "La fonderie d'art accessible au plus grand nombre.",
  signature: "La rencontre entre l'artisanat traditionnel et les technologies modernes.",
};

const cta = {
  project: { label: "Parler de mon projet", href: "/contact" },
  create: { label: "Créer mon projet", href: "/contact" },
  discover: { label: "Découvrir le concept", href: "#le-concept" },
};

const nav = [
  { label: "Concept", href: "/concept" },
  { label: "Comment ça marche", href: "/comment-ca-marche" },
  { label: "Réalisations", href: "/realisations" },
  { label: "Qui sommes-nous ?", href: "/qui-sommes-nous" },
  { label: "Contact", href: "/contact" },
];

const legalNav = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "Confidentialité", href: "/confidentialite" },
  { label: "Crédits", href: "/credits" },
];

/** Les cinq étapes de la métamorphose (BRIEF.md §3.4 et §6.1-5). */
const steps: { id: StepId; title: string; text: string; temperature: string; asset: AssetId }[] = [
  {
    id: "capturer",
    title: "Capturer",
    text: "Scanner en 3D une sculpture, un objet, une personne ou un animal.",
    temperature: "20 °C",
    asset: "etape-capturer",
  },
  {
    id: "modeliser",
    title: "Modéliser",
    text: "Travailler et adapter le modèle grâce aux outils de conception numérique.",
    temperature: "20 °C",
    asset: "etape-modeliser",
  },
  {
    id: "fabriquer",
    title: "Fabriquer",
    text: "Utiliser l'impression 3D pour produire un modèle ou un élément nécessaire à la réalisation.",
    temperature: "20 °C",
    asset: "etape-fabriquer",
  },
  {
    id: "mouler-et-fondre",
    title: "Mouler et fondre",
    text: "Mettre en œuvre les techniques traditionnelles de fonderie, notamment la cire perdue.",
    temperature: "≈ 1 200 °C",
    asset: "etape-fondre",
  },
  {
    id: "ciseler-et-patiner",
    // Insécable : « CISELER / ET PATINER », comme « MOULER / ET FONDRE ».
    title: "Ciseler et patiner",
    text: "Réaliser les finitions artisanales qui donnent à chaque pièce son caractère définitif.",
    temperature: "20 °C",
    asset: "etape-patiner",
  },
];

/** Les cinq sources possibles d'un projet (BRIEF.md §6.1-3). */
const sources = {
  title: "Vous avez un modèle ? Nous avons une solution.",
  items: [
    {
      id: "sculpture",
      title: "Une sculpture existante",
      text: "Terre, plâtre, pierre, résine ou autre matériau.",
    },
    {
      id: "objet",
      title: "Un objet",
      text: "Un objet personnel, une pièce existante ou un modèle à reproduire.",
    },
    {
      id: "fichier",
      title: "Un fichier numérique",
      text: "Un fichier 3D ou un personnage modélisé numériquement.",
    },
    {
      id: "photos",
      title: "Des photographies",
      text: "Des photos au format JPEG, TIFF ou autres formats courants, qui peuvent servir de base à une création.",
    },
    {
      id: "impression",
      title: "Une impression 3D",
      text: "Une pièce imprimée en 3D, utilisable dans le processus de fabrication.",
    },
  ],
  /** Sixième case de la grille (accueil) : toute autre source s'étudie. */
  other: {
    title: "Autre chose ?",
    text: "Un croquis, une idée, une pièce à restaurer : chaque projet est étudié individuellement.",
    link: "Parlons-en",
  },
};

const patines: { id: Patine; label: string }[] = [
  { id: "brun-medaille", label: "Brun médaille" },
  { id: "vert-de-gris", label: "Vert-de-gris" },
  { id: "noir", label: "Noir" },
  { id: "dore", label: "Doré" },
];

/** Les cinq métiers, représentés par l'état de la sculpture (BRIEF.md §5.4). */
const metiers: { id: string; title: string; state: string; asset: AssetId }[] = [
  {
    id: "designer",
    title: "Designer numérique",
    state: "Scan et maillage",
    asset: "metier-designer",
  },
  { id: "modeleur", title: "Modeleur", state: "Cire", asset: "metier-modeleur" },
  { id: "sculpteur", title: "Sculpteur", state: "Forme", asset: "metier-sculpteur" },
  { id: "fondeur", title: "Fondeur", state: "Fusion", asset: "metier-fondeur" },
  { id: "ciseleur", title: "Ciseleur", state: "Finition et patine", asset: "metier-ciseleur" },
];

const univers: Record<UniversId, { label: string; theme: string }> = {
  memoire: { label: "La mémoire", theme: "L'hommage familial" },
  amour: { label: "L'amour", theme: "Le souvenir d'un mariage" },
  fidelite: { label: "La fidélité", theme: "Nos compagnons" },
  creation: { label: "La création", theme: "La création artistique" },
  transmission: { label: "La transmission", theme: "Le collectionneur" },
  patrimoine: { label: "Le patrimoine", theme: "Le patrimoine et la mémoire" },
};

const raw = {
  brand,
  cta,
  nav,
  legalNav,
  steps,
  sources,
  patines,
  metiers,
  univers,

  // Écran tactile : ce qui remplace le survol de la souris.
  touch: {
    swipe:
      "Faites glisser les cartes : la sculpture prend l'aspect de chaque source. Tournez-la du doigt.",
    turn: "Tournez la sculpture du doigt.",
    hero: "Glissez le doigt sur le titre : le métal se réchauffe.",
  },
  visual: {
    provisional: "Visuel provisoire",
    play: "Lecture",
    pause: "Pause",
    pending: "Photo d'atelier · en attente d'autorisation écrite",
    states: {
      points: "Nuage de points",
      filaire: "Maillage",
      impression: "Impression 3D",
      forme: "Forme",
      cire: "Cire",
      fusion: "Fusion",
      bronze: "Bronze",
    },
  },

  a11y: {
    skip: "Aller au contenu",
    home: "monbronze.fr, retour à l'accueil",
    mainNav: "Navigation principale",
    footerNav: "Plan du site",
    legalNav: "Informations légales",
    menuOpen: "Menu",
    menuClose: "Fermer",
    menuLabel: "Menu du site",
    external: "(nouvel onglet)",
  },

  footer: {
    home: "Accueil",
    navTitle: "Le site",
    contactTitle: "Contact",
    legalTitle: "Informations",
    prefsTitle: "Préférences",
    location: "Fonderie d'art en Île-de-France",
    // Valeurs saisies dans l'espace d'administration (Coordonnées) ; vides : A_COMPLETER.
    addressLabel: "Adresse",
    phoneLabel: "Téléphone",
    lite: {
      label: "Expérience allégée",
      hint: "Moins d'animations, aucun effet lourd.",
      on: "Activée",
      off: "Désactivée",
    },
    sound: { label: "Son", on: "Activé", off: "Coupé" },
    copyright: "© monbronze.fr",
  },

  cursor: { story: "Voir l'histoire" },

  // ───────────────────────────── ACCUEIL ─────────────────────────────
  home: {
    hero: {
      eyebrow: "Fonderie d'art · Île-de-France",
      title: "Et si votre idée devenait un bronze ?",
      text: "Sculpture, buste, animal, objet ou création personnelle : donnez vie à vos envies grâce à notre savoir-faire artisanal et aux technologies modernes.",
      baseline: brand.baseline,
      techniques: ["Cire perdue", "Scanner 3D", "Modélisation", "Impression 3D"],
      scroll: "Faire défiler",
      intro: { skip: "Passer l'intro" },
      sculpture: {
        dailyPatina: "Patine du jour",
        caption:
          "Rendu numérique d'après un portrait romain anonyme, moulage du SMK (domaine public)",
        credits: "Crédits",
      },
    },
    truths: {
      id: "le-concept",
      eyebrow: "Le concept",
      title: "Votre projet mérite de devenir un bronze.",
      items: [
        "Pas besoin d'être artiste.",
        "Une sculpture, un objet, une photo ou un fichier : presque tout peut devenir bronze.",
        "De vrais professionnels de la fonderie d'art, à chaque étape.",
      ],
      link: { label: "Découvrir le concept", href: "/concept" },
    },
    possibilities: {
      caption:
        "Rendu numérique d'après un portrait romain anonyme, moulage du SMK (domaine public). Matières simulées.",
      credits: "Crédits",
      eyebrow: "Les possibilités",
      configurator: {
        // rédigé, à valider
        title: "Le sur-mesure, jusqu'à la patine.",
        text: "Brun médaille, vert-de-gris, noir ou doré : la patine donne au bronze sa couleur définitive. Choisissez la vôtre.",
        legend: "Choisir une patine",
        current: "Patine",
      },
    },
    ateliers: {
      eyebrow: "Les ateliers",
      title: "Un savoir-faire artisanal, une exigence à chaque étape.",
      text: "Derrière chaque bronze se cachent des heures de travail, des gestes précis et des compétences spécifiques. Nos artisans mettent leur expérience et leur passion au service de chaque création.",
      // Textes techniques : description générique du procédé (rédigé, à valider)
      gestures: [
        {
          title: "La préparation des moules",
          text: "Un moule souple en silicone, maintenu par une chape en plâtre, reproduit chaque détail du modèle original.",
          asset: "geste-moules" as AssetId,
        },
        {
          title: "Le travail de la cire",
          text: "Une épreuve en cire est tirée du moule, puis reprise à la main : c'est elle qui deviendra le bronze.",
          asset: "geste-cire" as AssetId,
        },
        {
          title: "La technique de la cire perdue",
          text: "La cire est enrobée d'un matériau réfractaire, puis éliminée au four de décirage : elle laisse une empreinte creuse.",
          asset: "geste-cire-perdue" as AssetId,
        },
        {
          title: "La fusion et la coulée du bronze",
          text: "Porté à environ 1 200 °C dans le four de fusion, le bronze est coulé dans l'empreinte laissée par la cire.",
          asset: "geste-fusion" as AssetId,
        },
        {
          title: "La ciselure",
          text: "Le moule est cassé, les jets de coulée retirés : le ciseleur reprend les surfaces et restitue chaque détail.",
          asset: "geste-ciselure" as AssetId,
        },
        {
          title: "La finition et la patine",
          text: "Chauffée et travaillée avec des oxydes, la surface du bronze prend sa couleur définitive.",
          asset: "geste-patine" as AssetId,
        },
      ],
    },
    metamorphose: {
      eyebrow: "La métamorphose",
      title: "L'artisanat d'art rencontre les technologies de demain.",
      message: "La technologie ne remplace pas le savoir-faire, elle le complète.",
      temperatureLabel: "Température indicative",
      gaugeScale: ["1 200", "600", "20"],
      caption:
        "Rendu numérique d'après un portrait romain anonyme, moulage du SMK (domaine public). Étapes simulées.",
      credits: "Crédits",
    },
    selection: {
      eyebrow: "Réalisations",
      title: "Des créations uniques. Des histoires qui restent.",
      featured: ["les-traits-d-un-aieul", "le-meme-jour-pour-toujours", "fidele"],
      link: { label: "Toutes les histoires", href: "/realisations" },
    },
    team: {
      eyebrow: "L'équipe et la fonderie",
      title: "Sept personnes, une même passion : le bronze.",
      text: "Une fonderie d'art traditionnelle en Île-de-France, forte de plus de vingt ans d'existence. Cinq métiers complémentaires, au service de chaque projet.",
      facts: [
        { value: "+ de 20", label: "ans d'existence" },
        { value: "7", label: "professionnels" },
        { value: "5", label: "métiers" },
      ],
      link: { label: "Qui sommes-nous ?", href: "/qui-sommes-nous" },
    },
    final: {
      eyebrow: "Contact",
      title: "Et si nous parlions de votre projet ?",
      text: "Qu'il soit précis ou encore au stade de l'esquisse, chaque projet est étudié individuellement.",
      write: "Ou écrivez-nous directement :",
    },
  },

  // ───────────────────────────── CONCEPT ─────────────────────────────
  concept: {
    eyebrow: "Concept",
    ambition: "Notre ambition",
    title: "Votre projet mérite de devenir un bronze.",
    lead: "Monbronze.fr a pour ambition de rendre la fonderie d'art accessible au plus grand nombre.",
    paragraphs: [
      "Nous associons un savoir-faire artisanal traditionnel aux technologies numériques les plus récentes pour permettre à chacun de faire réaliser une sculpture ou un objet unique en bronze.",
      "La technique de la cire perdue est un procédé complexe qui nécessite des compétences spécifiques et le talent d'artisans spécialisés à chaque étape de fabrication.",
      "Pour concrétiser vos projets, monbronze.fr s'appuie sur l'expérience et le savoir-faire d'une équipe de professionnels et d'une fonderie d'art située en Île-de-France, forte de plus de vingt ans d'existence.",
      "Chaque projet est étudié individuellement afin de proposer une solution technique adaptée à vos envies et à votre budget.",
    ],
    deontology: {
      text: "Monbronze.fr s'engage à respecter le code de déontologie des fondeurs d'art.",
      link: "Lire le code de déontologie des fondeurs d'art",
    },
    audience: {
      title: "Le bronze n'est pas réservé aux artistes.",
      intro: "Monbronze.fr s'adresse à tous ceux qui souhaitent donner vie à un projet en bronze :",
      items: [
        "Sculpteurs et artistes",
        "Amateurs d'art et collectionneurs",
        "Particuliers",
        "Familles",
        "Associations",
        "Entreprises",
        "Collectivités et institutions",
      ],
      quote:
        "« Du débutant à l'artiste expérimenté, chacun peut faire réaliser une pièce unique, entièrement personnalisée. »",
    },
    projects: {
      title: "Pour quels projets ?",
      // rédigé, à valider
      intro: "Des demandes très différentes peuvent être étudiées. En voici quelques-unes.",
      items: [
        {
          title: "Transformer une sculpture existante en bronze.",
          asset: "projet-sculpture" as AssetId,
        },
        { title: "Changer l'échelle d'une œuvre.", asset: "projet-echelle" as AssetId },
        {
          title: "Créer un bronze à partir d'un modèle numérique ou d'un personnage 3D.",
          asset: "projet-numerique" as AssetId,
        },
        {
          title:
            "Réaliser une sculpture à partir du scan d'un objet, d'une personne ou d'un animal.",
          asset: "projet-scan" as AssetId,
        },
        {
          title: "Transformer une pièce imprimée en 3D en véritable bronze.",
          asset: "projet-impression" as AssetId,
        },
      ],
      outro: "Votre projet ne ressemble à aucun autre ? C'est justement ce que nous étudions.",
    },
  },

  // ───────────────────────────── COMMENT ÇA MARCHE ─────────────────────────────
  howItWorks: {
    eyebrow: "Comment ça marche",
    title: "Et si votre idée devenait une sculpture en bronze ?",
    cases: [
      {
        title: "Vous souhaitez transformer l'une de vos sculptures en bronze.",
        asset: "cas-sculpture" as AssetId,
      },
      { title: "Vous aimeriez réaliser votre propre buste.", asset: "cas-buste" as AssetId },
      {
        title: "Vous souhaitez immortaliser votre chien, votre chat ou votre cheval.",
        asset: "cas-animal" as AssetId,
      },
      { title: "Vous désirez changer l'échelle d'une sculpture.", asset: "cas-echelle" as AssetId },
      {
        title:
          "Vous souhaitez marquer un événement important : mariage, naissance ou hommage à un proche.",
        asset: "cas-evenement" as AssetId,
      },
      {
        title: "Vous voulez rendre hommage à une personnalité.",
        asset: "cas-personnalite" as AssetId,
      },
    ],
    process: {
      title: "De votre idée à votre sculpture en bronze.",
      items: [
        {
          title: "Vous nous présentez votre projet",
          text: "Depuis le formulaire de contact ou par e-mail à contact@monbronze.fr, vous nous expliquez votre idée.",
        },
        {
          title: "Vous nous transmettez vos éléments",
          text: "Photos, croquis, dimensions, fichiers 3D, références ou tout autre document utile à la compréhension de votre projet.",
        },
        {
          title: "Nous étudions votre demande",
          text: "Notre équipe analyse les possibilités techniques et revient vers vous si des précisions sont nécessaires.",
        },
        {
          title: "Vous recevez une proposition",
          text: "Nous vous transmettons une proposition technique personnalisée accompagnée d'un devis.",
        },
        {
          title: "Votre projet prend vie",
          text: "Après validation, nos artisans mettent leur savoir-faire au service de la réalisation de votre bronze.",
        },
      ],
    },
  },

  // ───────────────────────────── RÉALISATIONS ─────────────────────────────
  realisations: {
    eyebrow: "Réalisations",
    title: "Des créations uniques. Des histoires qui restent.",
    // rédigé, à valider
    intro:
      "Des exemples illustratifs pour se projeter : chaque histoire part d'un besoin, propose une solution et montre les étapes mobilisées.",
    badge: "Exemple illustratif",
    render: "Rendu numérique d'après",
    badgeNote:
      "Cette histoire est un exemple imaginé pour illustrer les possibilités : ce n'est pas une réalisation réelle de la fonderie.",
    labels: {
      univers: "Univers",
      need: "Le besoin",
      solution: "La solution envisagée",
      steps: "Les étapes",
      patine: "Patine",
      others: "Autres histoires",
      prev: "Histoire précédente",
      next: "Histoire suivante",
      all: "Toutes les histoires",
      read: "Lire l'histoire",
      similar: "Un projet qui vous ressemble ?",
      similarText: "Racontez-nous le vôtre : chaque projet est étudié individuellement.",
    },
  },

  // ───────────────────────────── QUI SOMMES-NOUS ─────────────────────────────
  about: {
    eyebrow: "Qui sommes-nous ?",
    title: "Un savoir-faire artisanal au service de vos projets.",
    paragraphs: [
      "Nous sommes avant tout une fonderie d'art traditionnelle située en Île-de-France, forte de plus de vingt ans d'existence.",
      "Nous travaillons principalement pour des artistes, mais également pour des associations, des collectivités et des entreprises.",
      "Notre métier repose sur la maîtrise de techniques ancestrales et sur une exigence de qualité à chaque étape de fabrication.",
    ],
    team: {
      title: "Sept personnes, une même passion : le bronze.",
      text: "Notre équipe est composée de sept professionnels aux compétences complémentaires : sculpteur, modeleur, fondeur, ciseleur, designer numérique.",
      distribution: `Répartition exacte des sept personnes : ${A_COMPLETER}`,
      portraits: "Les portraits de l'équipe, pris dans les ateliers, prendront place ici.",
    },
    heritage: {
      title: "L'artisanat d'hier, les technologies de demain.",
      paragraphs: [
        "Nous sommes profondément attachés à la transmission et à la perpétuation d'un savoir-faire historique.",
        "Mais nous sommes également convaincus que les nouvelles technologies permettent d'ouvrir de nouvelles perspectives à la fonderie d'art.",
        "Nous avons ainsi intégré à nos procédés traditionnels (moules silicone et plâtre, four de décirage, four de fusion, etc.) les technologies récentes de scanner 3D, de modélisation numérique et d'impression 3D.",
        "Cette complémentarité nous permet d'imaginer de nouvelles solutions techniques, de repousser les limites de la création et surtout de rendre accessible l'univers de la fonderie d'art au plus grand nombre.",
        "C'est dans cet esprit qu'est né monbronze.fr.",
      ],
      timeline: {
        label: "De l'outil traditionnel à l'outil numérique",
        tradition: "Tradition",
        numerique: "Numérique",
        items: [
          { title: "Moules silicone et plâtre", kind: "tradition" },
          { title: "Four de décirage", kind: "tradition" },
          { title: "Four de fusion", kind: "tradition" },
          { title: "Scanner 3D", kind: "numerique" },
          { title: "Modélisation numérique", kind: "numerique" },
          { title: "Impression 3D", kind: "numerique" },
        ],
      },
    },
  },

  // ───────────────────────────── CONTACT ─────────────────────────────
  contact: {
    eyebrow: "Contact",
    title: "Et si nous parlions de votre projet ?",
    paragraphs: [
      "Vous avez une idée, une envie ou un projet de sculpture en bronze ?",
      "Qu'il soit précis ou encore au stade de l'esquisse, nous sommes à votre écoute pour étudier sa faisabilité et vous accompagner.",
      "Chaque projet est unique. Racontez-nous le vôtre !",
    ],
    direct: "Vous préférez nous écrire directement ?",
    prepare: {
      title: "Ce que vous pouvez nous transmettre",
      items: [
        "Photos",
        "Croquis",
        "Dimensions",
        "Fichiers 3D",
        "Références",
        "Tout autre document utile",
      ],
    },
    next: { label: "Comment se passe la suite ?", href: "/comment-ca-marche" },
    form: {
      title: "Votre demande, en quatre étapes",
      progress: "Étape {n} sur 4",
      steps: [
        "Votre projet part de…",
        "Racontez-nous votre idée",
        "Vos pièces jointes",
        "Vos coordonnées",
      ],
      sources: [
        { id: "sculpture", label: "Une sculpture", hint: "Terre, plâtre, pierre, résine…" },
        { id: "objet", label: "Un objet", hint: "Une pièce personnelle à reproduire" },
        { id: "fichier", label: "Un fichier 3D", hint: "Un modèle ou un personnage numérique" },
        { id: "photos", label: "Des photos", hint: "JPEG, TIFF ou autres formats courants" },
        { id: "impression", label: "Une impression 3D", hint: "Une pièce déjà imprimée" },
        { id: "inconnu", label: "Je ne sais pas encore", hint: "Parlons-en ensemble" },
      ],
      patine: "Patine choisie dans le configurateur",
      demande: {
        label: "Votre demande",
        hint: "Le sujet, les dimensions souhaitées, l'usage, une échéance éventuelle…",
      },
      univers: {
        legend: "Un univers (facultatif)",
        options: {
          memoire: "La mémoire",
          amour: "L'amour",
          fidelite: "La fidélité",
          creation: "La création",
          transmission: "La transmission",
          patrimoine: "Le patrimoine",
          autre: "Autre",
        },
      },
      files: {
        drop: "Glissez vos fichiers ici, ou",
        browse: "parcourez votre appareil",
        formats:
          "Photos, croquis, fichiers 3D et documents : jpg, png, webp, heic, tif, pdf, stl, obj, glb, gltf, ply, 3mf, zip. 10 fichiers et 50 Mo par fichier au maximum.",
        remove: "Retirer",
        sent: "Envoyé",
        uploading: "Un fichier est encore en cours d'envoi : patientez quelques secondes.",
        simulated: "Mode simulé : les fichiers restent sur votre appareil (aucun envoi).",
        none: "Aucun fichier : vous pourrez aussi nous les transmettre plus tard.",
        errors: {
          type: "Format non accepté : {name}.",
          size: "{name} dépasse 50 Mo.",
          count: "10 fichiers au maximum.",
          upload: "L'envoi de {name} a échoué. Réessayez ou retirez ce fichier.",
        },
      },
      fields: {
        prenom: "Prénom",
        nom: "Nom",
        email: "Adresse e-mail",
        telephone: "Téléphone (facultatif)",
        consent: "J'accepte que monbronze.fr utilise ces informations pour répondre à ma demande.",
        privacy: "Lire la politique de confidentialité",
      },
      back: "Retour",
      next: "Continuer",
      submit: "Envoyer ma demande",
      sending: "Envoi en cours…",
      errorsTitle: "Merci de corriger les points suivants :",
      done: {
        seal: "Demande reçue",
        title: "Merci, votre demande est bien arrivée.",
        text: "Chaque projet est étudié individuellement : nous revenons vers vous pour en parler. Un e-mail de confirmation vous a été envoyé.",
        textSimulated:
          "Chaque projet est étudié individuellement : nous revenons vers vous pour en parler.",
        simulated:
          "Mode simulé (site sans clés d'envoi) : aucune demande ni aucun e-mail n'a été envoyé.",
        again: "Faire une autre demande",
      },
    },
  },

  // ───────────────────────────── PAGES LÉGALES ─────────────────────────────
  legal: {
    mentions: {
      title: "Mentions légales",
      updated: `Dernière mise à jour : ${A_COMPLETER}`,
      sections: [
        {
          title: "Éditeur du site",
          paragraphs: ["Le site monbronze.fr est édité par :"],
          list: [
            `Raison sociale : ${A_COMPLETER}`,
            `Forme juridique et capital social : ${A_COMPLETER}`,
            `Siège social : ${A_COMPLETER}`,
            `SIRET et RCS : ${A_COMPLETER}`,
            `Numéro de TVA intracommunautaire : ${A_COMPLETER}`,
            `Adresse e-mail : ${CONTACT_EMAIL}`,
            `Téléphone : ${A_COMPLETER}`,
          ],
        },
        {
          title: "Directeur de la publication",
          paragraphs: [`Nom et qualité : ${A_COMPLETER}`],
        },
        {
          title: "Hébergement",
          paragraphs: [
            `Nom, adresse et téléphone de l'hébergeur : ${A_COMPLETER}. Un hébergement chez OVHcloud (OVH SAS, 2 rue Kellermann, 59100 Roubaix, France) est envisagé.`,
          ],
        },
        {
          title: "Médiation de la consommation",
          paragraphs: [
            `Conformément à l'article L612-1 du Code de la consommation, vous pouvez recourir gratuitement à un médiateur de la consommation : ${A_COMPLETER} (nom, adresse et site du médiateur).`,
          ],
        },
        {
          title: "Propriété intellectuelle",
          paragraphs: [
            "L'ensemble des contenus de ce site (textes, mise en page, éléments graphiques, rendus 3D) est protégé par le droit de la propriété intellectuelle. Toute reproduction ou représentation, totale ou partielle, sans autorisation préalable est interdite.",
            "Les ressources tierces (modèles 3D, polices, sons, bibliothèques logicielles) ne relèvent pas de cette protection : elles sont utilisées conformément à leur licence et listées sur la page Crédits.",
          ],
        },
        {
          title: "Réalisations présentées",
          paragraphs: [
            "Les histoires signalées par le badge « Exemple illustratif » sont des projets imaginés pour illustrer les possibilités offertes. Elles ne constituent pas des réalisations réelles de la fonderie.",
          ],
        },
        {
          title: "Données personnelles",
          paragraphs: [
            "Le traitement de vos données personnelles est décrit dans la politique de confidentialité.",
          ],
        },
        {
          title: "Liens vers d'autres sites",
          paragraphs: [
            "Ce site peut contenir des liens vers des sites tiers. L'éditeur n'exerce aucun contrôle sur leur contenu et décline toute responsabilité à leur égard.",
          ],
        },
        {
          title: "Droit applicable",
          paragraphs: ["Les présentes mentions légales sont régies par le droit français."],
        },
      ],
    },
    privacy: {
      title: "Politique de confidentialité",
      updated: `Dernière mise à jour : ${A_COMPLETER}`,
      sections: [
        {
          title: "Responsable du traitement",
          paragraphs: [
            `Le responsable du traitement est ${A_COMPLETER} (raison sociale et adresse). Pour toute question relative à vos données, écrivez à ${CONTACT_EMAIL}.`,
          ],
        },
        {
          title: "Données collectées",
          paragraphs: [
            "Lorsque vous nous présentez votre projet, nous recueillons les informations que vous nous transmettez :",
          ],
          list: [
            "Vos coordonnées : nom, prénom, adresse e-mail et numéro de téléphone.",
            "La description de votre projet et l'univers choisi, le cas échéant.",
            "Vos pièces jointes : photos, croquis, fichiers 3D et documents.",
          ],
        },
        {
          title: "Finalités",
          paragraphs: [
            "Ces données servent uniquement à répondre à votre demande : étudier la faisabilité de votre projet, vous recontacter et vous adresser une proposition accompagnée d'un devis.",
          ],
        },
        {
          title: "Base légale",
          paragraphs: [
            `Le traitement repose sur les mesures précontractuelles prises à votre demande (article 6, paragraphe 1, point b du RGPD) ; la case à cocher du formulaire recueille votre accord explicite. Base légale à valider par l'éditeur du site : ${A_COMPLETER}.`,
          ],
        },
        {
          title: "Destinataires",
          paragraphs: [
            `Vos données sont destinées à l'équipe de monbronze.fr. Des prestataires techniques les traitent pour notre compte, en qualité de sous-traitants. Prestataires envisagés, à confirmer avant la mise en ligne : hébergement du site et stockage des pièces jointes (OVHcloud, en France), envoi des e-mails (Resend) et protection contre le spam (Cloudflare Turnstile) : ${A_COMPLETER}.`,
          ],
        },
        {
          title: "Durée de conservation",
          paragraphs: [`Demandes et pièces jointes : ${A_COMPLETER}.`],
        },
        {
          title: "Transferts hors de l'Union européenne",
          paragraphs: [
            `Le site et les pièces jointes seraient hébergés en France (OVHcloud). Resend et Cloudflare sont établis aux États-Unis : les transferts reposeraient sur le cadre de protection des données UE–États-Unis (Data Privacy Framework) ou des clauses contractuelles types. Les pièces jointes seraient conservées dans un espace de stockage privé, accessibles à la fonderie seule par des liens temporaires, et supprimées au terme de la durée de conservation : ${A_COMPLETER}.`,
            "Pour limiter les abus, l'adresse IP de l'expéditeur est gardée en mémoire 10 minutes au plus (limite de fréquence d'envoi), sans être enregistrée.",
          ],
        },
        {
          title: "Vos droits",
          paragraphs: [
            `Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de vos données, ainsi que du droit de retirer votre consentement à tout moment. Pour les exercer, écrivez à ${CONTACT_EMAIL}.`,
            "Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).",
          ],
        },
        {
          title: "Cookies et stockage local",
          paragraphs: [
            "Ce site ne dépose aucun cookie publicitaire ni aucun cookie de mesure d'audience soumis à consentement.",
            "Il enregistre dans votre navigateur (stockage local) vos préférences d'affichage, comme l'expérience allégée ou le son. Ces informations ne quittent pas votre appareil.",
            `Mesure d'audience : ${A_COMPLETER}. Un outil sans cookie, exempté de consentement, est envisagé.`,
          ],
        },
      ],
    },
  },

  credits: {
    title: "Crédits",
    intro:
      "Chaque ressource tierce utilisée sur ce site est listée ici, avec sa source et sa licence. Toutes permettent un usage commercial.",
    disclaimer:
      "Les sculptures du site sont des rendus numériques (bronze, et états simulés de fabrication : points, filaire, impression, cire) réalisés par monbronze.fr à partir de numérisations publiées en domaine public par les musées cités. Ces musées ne sont pas associés à monbronze.fr et n'approuvent pas ces rendus.",
    labels: { source: "Source", license: "Licence", usage: "Usage" },
    groups: [
      {
        title: "Photos et vidéos de l'atelier",
        items: [
          {
            name: "Gestes de l'atelier : moules, cire, carapaces, coulée, ciselure, patine",
            author: "Fonderie ArtCulture",
            license: "Publiées avec l'autorisation écrite de la fonderie",
            url: "https://www.fonderie-artculture.fr",
            usage:
              "Accueil, section « Les ateliers » (œuvres et commandes montrées sans citer leurs auteurs)",
          },
        ],
      },
      {
        title: "Polices",
        items: [
          {
            name: "Fraunces",
            author: "Undercase Type",
            license: "SIL Open Font License 1.1",
            url: "https://github.com/undercasetype/Fraunces",
            usage: "Titres",
          },
          {
            name: "Geist et Geist Mono",
            author: "Vercel",
            license: "SIL Open Font License 1.1",
            url: "https://github.com/vercel/geist-font",
            usage: "Textes, navigation et données techniques",
          },
        ],
      },
      {
        title: "Bibliothèques",
        items: [
          {
            name: "Next.js",
            author: "Vercel",
            license: "MIT",
            url: "https://github.com/vercel/next.js",
            usage: "Framework",
          },
          {
            name: "React",
            author: "Meta",
            license: "MIT",
            url: "https://github.com/facebook/react",
            usage: "Interface",
          },
          {
            name: "Tailwind CSS",
            author: "Tailwind Labs",
            license: "MIT",
            url: "https://github.com/tailwindlabs/tailwindcss",
            usage: "Styles",
          },
          {
            name: "GSAP",
            author: "GreenSock (Webflow)",
            license: "Licence standard GSAP, gratuite y compris pour un usage commercial",
            url: "https://gsap.com/standard-license",
            usage: "Animations",
          },
          {
            name: "Lenis",
            author: "darkroom.engineering",
            license: "MIT",
            url: "https://github.com/darkroomengineering/lenis",
            usage: "Défilement fluide",
          },
          {
            name: "Zod",
            author: "Colin McDonnell",
            license: "MIT",
            url: "https://github.com/colinhacks/zod",
            usage: "Validation des données",
          },
          {
            name: "three.js",
            author: "mrdoob et contributeurs",
            license: "MIT",
            url: "https://github.com/mrdoob/three.js",
            usage: "Rendu 3D en temps réel",
          },
          {
            name: "WebGL Fluid Simulation (structure adaptée)",
            author: "Pavel Dobryakov",
            license: "MIT",
            url: "https://github.com/PavelDoGreat/WebGL-Fluid-Simulation",
            usage: "Simulation de la coulée de bronze sur l'accueil",
          },
          {
            name: "React Hook Form et @hookform/resolvers",
            author: "Beier (Bill) Luo et contributeurs",
            license: "MIT",
            url: "https://github.com/react-hook-form/react-hook-form",
            usage: "Formulaire de contact (validation)",
          },
          {
            name: "React Three Fiber et drei",
            author: "Poimandres (pmndrs)",
            license: "MIT",
            url: "https://github.com/pmndrs/react-three-fiber",
            usage: "Intégration de la 3D dans React",
          },
        ],
      },
      {
        title: "Modèles 3D, environnements, sons et vidéos",
        empty:
          "Chaque scan, environnement HDR, son ou vidéo utilisé est listé ici avec sa source et sa licence.",
        items: [],
      },
    ],
  },

  notFound: {
    code: "404",
    title: "Cette page est repartie à la fonte.",
    text: "Elle a peut-être changé d'adresse, ou n'a jamais été coulée. Revenez à l'accueil, ou parlez-nous de votre projet.",
    home: { label: "Retour à l'accueil", href: "/" },
  },

  lab: {
    eyebrow: "Interne · non indexé",
    title: "Laboratoire",
    text: "Page interne, non indexée : réglage du matériau bronze, des quatre patines et des lumières.",
    loading: "Chargement de la scène…",
    noWebgl: "WebGL n'est pas disponible sur cet appareil : le laboratoire ne peut pas s'afficher.",
    controls: {
      title: "Réglages",
      model: "Modèle",
      patine: "Patine",
      cavityLo: "Patine : début dans les creux",
      cavityHi: "Patine : pleine dans les creux",
      noise: "Marbrure",
      deep: "Assombrissement des creux profonds",
      metalRoughness: "Rugosité du métal poli",
      patinaRoughness: "Rugosité de la patine",
      exposure: "Exposition",
      env: "Intensité du studio",
      envMap: "Environnement lumineux",
      envProcedural: "Studio procédural seul",
      rakeAngle: "Lumière rasante : angle",
      rakeIntensity: "Lumière rasante : intensité",
      toneMapping: "Rendu des tons",
      autoRotate: "Rotation automatique",
      viewAngle: "Angle de vue",
      debugCavity: "Afficher la carte des creux",
      floor: "Sol et ombre de contact",
      reset: "Revenir aux valeurs de la patine",
      polishLo: "Polissage : début sur les crêtes",
      polishHi: "Polissage : plein sur les crêtes",
      copy: "Copier le preset (JSON)",
      copied: "Preset copié",
      fps: "Images par seconde",
    },
  },

  // ───────────────────────────── SEO ─────────────────────────────
  seo: {
    default: {
      title: "monbronze.fr · Sculpture en bronze sur mesure, fonderie d'art en Île-de-France",
      description:
        "Faites réaliser une sculpture en bronze sur mesure à partir d'une sculpture, d'un objet, d'une photo ou d'un fichier 3D. Une fonderie d'art d'Île-de-France, de la cire perdue au scan 3D.",
    },
    concept: {
      title: "Le concept : la fonderie d'art accessible à tous",
      description:
        "Monbronze.fr associe la fonte à cire perdue aux technologies numériques pour que chacun puisse faire réaliser une sculpture ou un objet unique en bronze.",
    },
    howItWorks: {
      title: "Comment faire réaliser une sculpture en bronze",
      description:
        "Buste, animal, changement d'échelle, hommage : les cinq étapes pour faire réaliser votre sculpture en bronze, de votre idée à la proposition chiffrée.",
    },
    realisations: {
      title: "Réalisations : des histoires de bronzes sur mesure",
      description:
        "Buste en bronze personnalisé, sculpture animalière, souvenir de mariage : des exemples illustratifs de sculptures en bronze sur mesure.",
    },
    about: {
      title: "Qui sommes-nous ? Une fonderie d'art en Île-de-France",
      description:
        "Une fonderie d'art traditionnelle d'Île-de-France, plus de vingt ans d'existence, sept professionnels : la fonte à cire perdue rencontre le scan et l'impression 3D.",
    },
    contact: {
      title: "Contact : parlez-nous de votre projet en bronze",
      description:
        "Présentez votre projet de sculpture en bronze sur mesure : photos, croquis, fichiers 3D. Chaque demande est étudiée individuellement.",
    },
    mentions: {
      title: "Mentions légales",
      description:
        "Mentions légales du site monbronze.fr : éditeur, hébergement, propriété intellectuelle.",
    },
    privacy: {
      title: "Politique de confidentialité",
      description:
        "Comment monbronze.fr traite les données transmises avec votre demande de projet.",
    },
    credits: {
      title: "Crédits",
      description:
        "Les polices, bibliothèques et ressources utilisées sur monbronze.fr, avec leur licence.",
    },
    notFound: {
      title: "Page introuvable",
      description:
        "Cette page est repartie à la fonte. Revenez à l'accueil de monbronze.fr ou parlez-nous de votre projet en bronze.",
    },
    lab: {
      title: "Laboratoire",
      description:
        "Page interne et non indexée de monbronze.fr : réglage des matériaux, des patines et des lumières.",
    },
  },
};

export const site = fr(raw);
export type Site = typeof site;
