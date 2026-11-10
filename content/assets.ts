/**
 * TOUS les visuels du site sont référencés ici (BRIEF.md §5.5).
 *
 * Phase 0 : aucun visuel n'existe encore (ni scan, ni rendu, ni photo).
 * Chaque entrée est un « échantillon de matière » dessiné en CSS (kind: "placeholder"),
 * décoratif et masqué aux lecteurs d'écran. Le texte alternatif est déjà rédigé
 * pour le futur rendu.
 *
 * Pour remplacer un visuel par un vrai rendu ou une vraie photo, changer UNE ligne :
 *   buste: image("/renders/buste.avif", "Buste en bronze patiné…", { width: 1600, height: 2000 })
 */

export type SculptureState =
  | "points" // CAPTURER : nuage de points
  | "filaire" // MODÉLISER : maillage
  | "impression" // FABRIQUER : impression 3D couche par couche
  | "forme" // SCULPTER : terre, plâtre
  | "cire" // MOULER : cire ambrée
  | "fusion" // FONDRE : métal en fusion
  | "bronze"; // CISELER ET PATINER : bronze final

export const PATINES = ["brun-medaille", "vert-de-gris", "noir", "dore"] as const;
export type Patine = (typeof PATINES)[number];

export type PlaceholderAsset = {
  kind: "placeholder";
  /** Sujet du futur rendu (ex. « Buste »), affiché en légende technique. */
  subject: string;
  state: SculptureState;
  patine?: Patine;
  /** Texte alternatif prévu pour le futur rendu (non lu tant que c'est un échantillon). */
  alt: string;
};

export type ImageAsset = {
  kind: "image";
  src: string;
  alt: string;
  width: number;
  height: number;
  subject: string;
  credit?: string;
  /** Média réel en attente d'autorisation écrite : badge visible, jamais en ligne. */
  pending?: boolean;
  /** Rendu d'un scan de musée : légende affichée sur l'image (« Rendu numérique d'après… »). */
  legend?: string;
  /** Extrait vidéo (muet, en boucle), avec son affiche. */
  video?: { src: string; poster: string };
};

export type VisualAsset = PlaceholderAsset | ImageAsset;

/**
 * Photos et vidéos réelles de l'atelier de la Fonderie ArtCulture, publiées avec son
 * autorisation écrite (confirmée par l'utilisateur le 2026-11-09). Fichiers dans
 * public/atelier/, produits par scripts/prepare-atelier-media.mjs (table de correspondance
 * hors dépôt : les noms d'origine citent artistes et clients). Aucun artiste ni client cité.
 */
const atelier = (
  file: string,
  alt: string,
  subject: string,
  _fallback?: VisualAsset,
  video?: string,
): VisualAsset => ({
  kind: "image",
  src: `/atelier/${file}.webp`,
  alt,
  width: 1600,
  height: 1200,
  subject,
  credit: "Fonderie ArtCulture",
  ...(video ? { video: { src: `/atelier/${video}.mp4`, poster: `/atelier/${video}.webp` } } : {}),
});

/** Rendu fixe tiré d'une scène du site (scripts/render-visuals.mjs), légendé. */
const render = (
  src: string,
  alt: string,
  width: number,
  height: number,
  legend: string,
): ImageAsset => ({ kind: "image", src, alt, width, height, subject: alt, legend });

/**
 * Rendus fixes des histoires (scripts/render-story-images.mjs), 1200 × 1500. Rendus d'une
 * œuvre de musée : la légende suit l'IMAGE (pas seulement le modèle 3D) ; elle reste donc
 * affichée même si la page n'a plus de sculpture 3D.
 */
const story = (slug: string, alt: string, legend: string): ImageAsset => ({
  kind: "image",
  src: `/images/realisations/${slug}.webp`,
  alt,
  width: 1200,
  height: 1500,
  subject: alt,
  legend,
});

const definitions = {
  // Accueil : configurateur de patine (la patine est appliquée dynamiquement)
  configurateur: render(
    "/images/sources/bronze.webp",
    "Buste en bronze patiné, rendu numérique",
    1000,
    1000,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),

  // Accueil : les six gestes de l'atelier
  "geste-moules": atelier(
    "geste-moules",
    "Mains d'un artisan ouvrant un moule en silicone rose, à l'atelier",
    "Moule",
    render(
      "/images/sources/sculpture.webp",
      "Buste en plâtre, comme un modèle original avant moulage",
      1000,
      1000,
      "un portrait romain anonyme, moulage du SMK (domaine public)",
    ),
  ),
  "geste-cire": atelier(
    "geste-cire",
    "Cire appliquée au pinceau à l'intérieur d'un moule en silicone",
    "Cire",
    render(
      "/images/sources/objet.webp",
      "Buste en matière brute, avant la cire",
      1000,
      1000,
      "un portrait romain anonyme, moulage du SMK (domaine public)",
    ),
  ),
  "geste-cire-perdue": atelier(
    "geste-cire-perdue",
    "Moules en carapace réfractaire alignés avant la coulée, artisans en tenue de protection",
    "Carapaces",
    render(
      "/images/etats/cire.webp",
      "Buste en cire ambrée, avant la fonte",
      600,
      1000,
      "un portrait romain anonyme, moulage du SMK (domaine public)",
    ),
    "geste-cire-perdue-video",
  ),
  "geste-fusion": atelier(
    "geste-coulee",
    "Bronze en fusion versé depuis le creuset dans les moules",
    "Coulée",
    render(
      "/images/etapes/fondre.webp",
      "Buste en métal en fusion",
      900,
      1200,
      "un portrait romain anonyme, moulage du SMK (domaine public)",
    ),
    "geste-coulee-video",
  ),
  "geste-ciselure": atelier(
    "geste-ciselure",
    "Artisan au travail à son établi, dans l'atelier de ciselure",
    "Ciselure",
    render(
      "/images/cas/buste.webp",
      "Buste en bronze patiné noir, repris au ciselet",
      1000,
      1000,
      "un portrait romain anonyme, moulage du SMK (domaine public)",
    ),
  ),
  "geste-patine": atelier(
    "geste-patine",
    "Deux mains en bronze patiné qui se serrent, sur un socle",
    "Patine",
    render(
      "/images/etapes/patiner.webp",
      "Buste en bronze patiné brun médaille",
      900,
      1200,
      "un portrait romain anonyme, moulage du SMK (domaine public)",
    ),
  ),

  // Métamorphose : les cinq états de la sculpture
  "etape-capturer": render(
    "/images/etapes/capturer.webp",
    "Buste en nuage de points balayé par un laser",
    900,
    1200,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "etape-modeliser": render(
    "/images/etapes/modeliser.webp",
    "Buste en maillage filaire",
    900,
    1200,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "etape-fabriquer": render(
    "/images/etapes/fabriquer.webp",
    "Buste imprimé en 3D couche par couche",
    900,
    1200,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "etape-fondre": render(
    "/images/etapes/fondre.webp",
    "Buste en métal en fusion",
    900,
    1200,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "etape-patiner": render(
    "/images/etapes/patiner.webp",
    "Buste en bronze patiné",
    900,
    1200,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),

  // Réalisations (exemples illustratifs)
  "realisation-memoire": story(
    "les-traits-d-un-aieul",
    "Buste en bronze patiné brun médaille, rendu numérique",
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "realisation-amour": story(
    "le-meme-jour-pour-toujours",
    "Relief d'un couple en bronze doré, rendu numérique",
    "un relief funéraire romain d'un couple, moulage du SMK (domaine public)",
  ),
  "realisation-fidelite": story(
    "fidele",
    "Tête de cheval en bronze patiné vert-de-gris, rendu numérique",
    "le cheval de la statue équestre de Marc Aurèle, moulage du SMK (domaine public)",
  ),
  "realisation-creation": render(
    "/images/cas/buste.webp",
    "Buste en bronze patiné noir, rendu numérique",
    1000,
    1000,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "realisation-transmission": story(
    "ce-qui-se-transmet",
    "Brûle-parfum en bronze patiné noir, rendu numérique",
    "un brûle-parfum chinois anonyme, Freer Gallery of Art, Smithsonian (CC0)",
  ),
  "realisation-patrimoine": story(
    "memoire-commune",
    "Statue monumentale en bronze patiné vert-de-gris, rendu numérique",
    "le « Prince des Thermes », moulage du SMK (domaine public)",
  ),

  // Concept : pour quels projets ?
  "projet-sculpture": render(
    "/images/sources/sculpture.webp",
    "Buste en plâtre, comme une sculpture existante",
    1000,
    1000,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "projet-echelle": render(
    "/images/cas/echelle.webp",
    "Statue monumentale en bronze patiné vert-de-gris",
    1000,
    1000,
    "le « Prince des Thermes », moulage du SMK (domaine public)",
  ),
  "projet-numerique": render(
    "/images/sources/fichier.webp",
    "Buste en maillage filaire, comme un fichier 3D",
    1000,
    1000,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "projet-scan": render(
    "/images/sources/photos.webp",
    "Buste en nuage de points, issu d'un scan",
    1000,
    1000,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "projet-impression": render(
    "/images/sources/impression.webp",
    "Buste imprimé en 3D, couches visibles",
    1000,
    1000,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),

  // Comment ça marche : six cas
  "cas-sculpture": render(
    "/images/sources/bronze.webp",
    "Buste en bronze patiné, rendu numérique",
    1000,
    1000,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "cas-buste": render(
    "/images/cas/buste.webp",
    "Buste en bronze patiné noir",
    1000,
    1000,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "cas-animal": render(
    "/images/cas/animal.webp",
    "Tête de cheval en bronze patiné",
    1000,
    1000,
    "le cheval de la statue équestre de Marc Aurèle, moulage du SMK (domaine public)",
  ),
  "cas-echelle": render(
    "/images/cas/echelle.webp",
    "Statue monumentale en bronze patiné vert-de-gris",
    1000,
    1000,
    "le « Prince des Thermes », moulage du SMK (domaine public)",
  ),
  "cas-evenement": render(
    "/images/cas/evenement.webp",
    "Relief d'un couple en bronze patiné",
    1000,
    1000,
    "un relief funéraire romain d'un couple, moulage du SMK (domaine public)",
  ),
  "cas-personnalite": render(
    "/images/cas/personnalite.webp",
    "Buste en bronze patiné vert-de-gris",
    1000,
    1000,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),

  // Qui sommes-nous : les cinq métiers (en attendant les portraits)
  "metier-designer": render(
    "/images/etapes/modeliser.webp",
    "Maillage filaire d'un buste, le travail du designer 3D",
    900,
    1200,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "metier-modeleur": render(
    "/images/etapes/fabriquer.webp",
    "Buste imprimé en 3D, le travail du modeleur",
    900,
    1200,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "metier-sculpteur": render(
    "/images/sources/sculpture.webp",
    "Buste en plâtre, le travail du sculpteur",
    1000,
    1000,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "metier-fondeur": render(
    "/images/etapes/fondre.webp",
    "Bronze en fusion, le travail du fondeur",
    900,
    1200,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
  "metier-ciseleur": render(
    "/images/etapes/patiner.webp",
    "Bronze patiné, le travail du ciseleur",
    900,
    1200,
    "un portrait romain anonyme, moulage du SMK (domaine public)",
  ),
} satisfies Record<string, VisualAsset>;

export type AssetId = keyof typeof definitions;
export const assets: Record<AssetId, VisualAsset> = definitions;

/**
 * Modèles 3D préparés (public/models, < 3 Mo chacun, voir scripts/prepare-model.mjs).
 * Chaque scan tiers doit être listé sur /credits avec sa source et sa licence (champ `credit`).
 */
/** Crédit d'une ressource tierce, affiché automatiquement sur /credits. */
export type Credit = {
  /** Titre de l'œuvre ou de la ressource, tel que publié par la source. */
  title: string;
  /** Auteur ou attribution (« anonyme » si inconnu). */
  author: string;
  /** Institution ou plateforme (ex. « SMK, Statens Museum for Kunst »). */
  source: string;
  /** Page de la ressource, où la licence est vérifiable. */
  url: string;
  license: string;
  /** Usage sur le site. */
  usage: string;
};

export type ModelAsset = {
  src: string;
  /** Ce que représente le modèle (légende technique). */
  subject: string;
  /** Rôle prévu sur le site. */
  role:
    | "buste"
    | "animal"
    | "mains-ou-groupe"
    | "figure-en-pied"
    | "piece-de-collection"
    | "monumental"
    | "filaire"
    | "laboratoire";
  credit?: Credit;
  /** Légende d'honnêteté, après « Rendu numérique d'après » (CLAUDE.md). */
  legend?: string;
};

const SMK_LICENSE =
  "Domaine public (Public Domain Mark 1.0, SMK Open) : réutilisation libre, y compris commerciale";
const SI_LICENSE = "CC0 1.0 (Smithsonian Open Access)";
const SMK = "SMK, Statens Museum for Kunst, collection royale de moulages";

const modelDefinitions = {
  "buste-romain": {
    legend: "un portrait romain anonyme, moulage du SMK (domaine public)",
    src: "/models/buste-romain.glb",
    subject: "Buste romain anonyme",
    role: "buste",
    credit: {
      title: "Portræt af mand (Portrait d'homme), moulage en plâtre",
      author: "Artiste inconnu, art romain, époque antonine",
      source: `${SMK}, inv. KAS1100`,
      url: "https://open.smk.dk/en/artwork/image/KAS1100",
      license: SMK_LICENSE,
      usage:
        "Sculpture principale du site : rendu numérique en bronze en temps réel (accueil, métamorphose), maillage filaire allégé, et image fixe (accueil sans WebGL)",
    },
  },
  "buste-romain-filaire": {
    // Version allégée (9 000 triangles) du même scan : crédit commun avec « buste-romain ».
    src: "/models/buste-romain-filaire.glb",
    subject: "Buste romain anonyme, maillage allégé",
    role: "filaire",
  },
  "tete-de-cheval": {
    legend: "le cheval de la statue équestre de Marc Aurèle, moulage du SMK (domaine public)",
    src: "/models/tete-de-cheval.glb",
    subject: "Tête de cheval d'après un bronze romain",
    role: "animal",
    credit: {
      title:
        "Hesten fra Marcus Aurelius rytterstatue (le cheval de la statue équestre de Marc Aurèle), moulage",
      author:
        "Artiste inconnu ; d'après le bronze romain doré, vers 170-180 (Musei Capitolini, Rome)",
      source: `${SMK}, inv. KAS1133/2`,
      url: "https://open.smk.dk/en/artwork/image/KAS1133%2F2",
      license: SMK_LICENSE,
      usage: "Rendu numérique en bronze : exemple illustratif « Fidèle », cas « Un animal »",
    },
  },
  "relief-couple": {
    legend: "un relief funéraire romain d'un couple, moulage du SMK (domaine public)",
    src: "/models/relief-couple.glb",
    subject: "Relief funéraire d'un couple",
    role: "mains-ou-groupe",
    credit: {
      title:
        "Gravrelief. Mands- og kvindebuste i niche. Publius Aiedius Amphio & Aiedia Fausta Melior (relief funéraire), moulage",
      author:
        "Artiste inconnu, art romain, vers 20-10 av. J.-C. (original en marbre : Staatliche Museen, Berlin)",
      source: `${SMK}, inv. DEP457`,
      url: "https://open.smk.dk/en/artwork/image/DEP457",
      license: SMK_LICENSE,
      usage:
        "Rendu numérique en bronze : exemple illustratif « Le même jour, pour toujours », cas « Un événement »",
    },
  },
  patineuse: {
    legend: "« Girl Skating » d'Abastenia St. Léger Eberle, Smithsonian American Art Museum (CC0)",
    src: "/models/patineuse.glb",
    subject: "Figure en pied, jeune patineuse",
    role: "figure-en-pied",
    credit: {
      title: "Girl Skating (modelé en 1906), bronze",
      author: "Abastenia St. Léger Eberle",
      source: "Smithsonian American Art Museum, inv. 2011.29",
      url: "https://americanart.si.edu/artwork/girl-skating-80645",
      license: SI_LICENSE,
      usage:
        "Modèle disponible dans le laboratoire interne (/lab) ; plus utilisé comme exemple sur le site",
    },
  },
  "brule-parfum": {
    legend: "un brûle-parfum chinois anonyme, Freer Gallery of Art, Smithsonian (CC0)",
    src: "/models/brule-parfum.glb",
    subject: "Petite pièce de collection, brûle-parfum",
    role: "piece-de-collection",
    credit: {
      title:
        "Lidded incense burner (xianglu) with geometric decoration and narrative scenes, bronze incrusté",
      author: "Artiste inconnu, Chine, début des Han occidentaux (IIe siècle av. J.-C.)",
      source: "Freer Gallery of Art, National Museum of Asian Art (Smithsonian), inv. F1947.15a-b",
      url: "https://asia.si.edu/object/F1947.15a-b/",
      license: SI_LICENSE,
      usage: "Rendu numérique en bronze : exemple illustratif « Ce qui se transmet »",
    },
  },
  "prince-hellenistique": {
    legend: "le « Prince des Thermes », moulage du SMK (domaine public)",
    src: "/models/prince-hellenistique.glb",
    subject: "Figure monumentale",
    role: "monumental",
    credit: {
      title:
        "Stående nøgen mand, Termeherskeren (homme nu debout, dit « le Prince des Thermes »), moulage",
      author:
        "Artiste inconnu ; d'après un bronze hellénistique, vers 200-175 av. J.-C. (Museo Nazionale Romano)",
      source: `${SMK}, inv. KAS823`,
      url: "https://open.smk.dk/en/artwork/image/KAS823",
      license: SMK_LICENSE,
      usage:
        "Rendu numérique en bronze : exemple illustratif « Mémoire commune », cas « À grande échelle »",
    },
  },
  "demo-noeud": {
    src: "/models/demo-noeud.glb",
    subject: "Échantillon procédural (nœud torique)",
    role: "laboratoire",
  },
} satisfies Record<string, ModelAsset>;

export type ModelId = keyof typeof modelDefinitions;
export const models: Record<ModelId, ModelAsset> = modelDefinitions;

/**
 * Sculpture de l'accueil : le modèle 3D, et son rendu fixe (même cadrage) pour la version
 * statique. Image produite par `npm run hero:image` (scripts/render-hero-image.mjs).
 */
export const heroSculpture = {
  model: "buste-romain" as ModelId,
  image: {
    avif: "/images/hero/buste-romain.avif",
    webp: "/images/hero/buste-romain.webp",
    width: 393,
    height: 960,
  },
};

/** Environnements d'éclairage (HDR, public/hdr). Le premier sert d'éclairage de studio. */
export type EnvironmentAsset = { src: string; subject: string; credit: Credit };
export const environments: Record<string, EnvironmentAsset> = {
  studio: {
    src: "/hdr/studio_small_03_1k.hdr",
    subject: "Petit studio photo",
    credit: {
      title: "Studio Small 03 (HDRI)",
      author: "Greg Zaal",
      source: "Poly Haven",
      url: "https://polyhaven.com/a/studio_small_03",
      license: "CC0 1.0",
      usage: "Éclairage de studio des sculptures en bronze",
    },
  },
  fonderie: {
    src: "/hdr/industrial_workshop_foundry_1k.hdr",
    subject: "Atelier industriel",
    credit: {
      title: "Industrial Workshop Foundry (HDRI)",
      author: "Dimitrios Savva et Jarod Guest",
      source: "Poly Haven",
      url: "https://polyhaven.com/a/industrial_workshop_foundry",
      license: "CC0 1.0",
      usage: "Éclairage d'ambiance « atelier »",
    },
  },
};

/** Toutes les ressources tierces créditées (modèles 3D, environnements), pour /credits. */
export function mediaCredits(): Credit[] {
  return [...Object.values(models), ...Object.values(environments)]
    .map((a) => a.credit)
    .filter((c): c is Credit => Boolean(c));
}
