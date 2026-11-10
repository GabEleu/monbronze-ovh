/** Toutes les routes publiques du site (et /lab), utilisées par les tests et les captures. */
export type Route = { path: string; name: string; status?: number };

export const ROUTES: readonly Route[] = [
  { path: "/", name: "accueil" },
  { path: "/concept", name: "concept" },
  { path: "/comment-ca-marche", name: "comment-ca-marche" },
  { path: "/realisations", name: "realisations" },
  { path: "/realisations/les-traits-d-un-aieul", name: "realisation-aieul" },
  { path: "/qui-sommes-nous", name: "qui-sommes-nous" },
  { path: "/contact", name: "contact" },
  { path: "/mentions-legales", name: "mentions-legales" },
  { path: "/confidentialite", name: "confidentialite" },
  { path: "/credits", name: "credits" },
  { path: "/lab", name: "lab" },
  { path: "/cette-page-n-existe-pas", name: "404", status: 404 },
];

export const ALL_STORIES = [
  "les-traits-d-un-aieul",
  "le-meme-jour-pour-toujours",
  "fidele",
  "une-oeuvre-change-de-matiere",
  "ce-qui-se-transmet",
  "memoire-commune",
];
