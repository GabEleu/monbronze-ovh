import type { Patine } from "@/content/assets";

/**
 * Réglages des quatre patines (sans dépendance à three.js : importable partout).
 * Couleurs en sRGB ; le shader les reçoit en linéaire (THREE.Color).
 *
 * Logique d'atelier : la patine COUVRE la pièce (coverage = 1) ; le ciseleur polit le
 * métal sur les arêtes saillantes (canal « convex »). Le doré est l'inverse
 * (coverage = 0) : métal bruni partout, patine seulement au fond des creux.
 * Valeurs issues de la revue de direction artistique (phase 1).
 */
export type PatinaPreset = {
  /** Métal nu, poli, sur les reliefs (couleur spéculaire F0). */
  metal: string;
  /** Patine, et sa variante marbrée plus sombre. */
  patina: string;
  patinaDeep: string;
  /** Sous-couche qui affleure par endroits (ex. brun sous le vert-de-gris). */
  under: string;
  underAmount: number;
  metalRoughness: number;
  patinaRoughness: number;
  /** 1 = patine métallique (oxydes fins), 0 = patine minérale (vert-de-gris crayeux). */
  patinaMetalness: number;
  /** 1 = patine couvrante ; 0 = patine seulement dans les creux. */
  coverage: number;
  /** Seuils du polissage sur le canal convexe (crêtes). */
  polishLo: number;
  polishHi: number;
  /** Seuils de la patine dans les creux. */
  cavityLo: number;
  cavityHi: number;
  deepDarken: number;
  /** Cire (vernis) : 0 pour une patine mate. */
  clearcoat: number;
};

export const PATINA_PRESETS: Record<Patine, PatinaPreset> = {
  "brun-medaille": {
    metal: "#c2925f",
    patina: "#4a2c18",
    patinaDeep: "#1f130b",
    under: "#5c3a20",
    underAmount: 0.25,
    metalRoughness: 0.3,
    patinaRoughness: 0.5,
    patinaMetalness: 0.4,
    coverage: 1,
    polishLo: 0.55,
    polishHi: 0.85,
    cavityLo: 0.15,
    cavityHi: 0.5,
    deepDarken: 0.5,
    clearcoat: 0.3,
  },
  "vert-de-gris": {
    metal: "#6e4b2e",
    patina: "#3d6a5b",
    patinaDeep: "#1f352c",
    under: "#3b2a1c",
    underAmount: 0.45,
    metalRoughness: 0.45,
    patinaRoughness: 0.9,
    patinaMetalness: 0.05,
    coverage: 1,
    polishLo: 0.6,
    polishHi: 0.9,
    cavityLo: 0.15,
    cavityHi: 0.5,
    deepDarken: 0.45,
    clearcoat: 0.0,
  },
  noir: {
    metal: "#9a7148",
    patina: "#17120f",
    patinaDeep: "#0c0908",
    under: "#2a1d14",
    underAmount: 0.15,
    metalRoughness: 0.3,
    patinaRoughness: 0.5,
    patinaMetalness: 0.35,
    coverage: 1,
    polishLo: 0.55,
    polishHi: 0.85,
    cavityLo: 0.15,
    cavityHi: 0.5,
    deepDarken: 0.4,
    clearcoat: 0.3,
  },
  dore: {
    metal: "#eab45c",
    patina: "#6b4719",
    patinaDeep: "#43290c",
    under: "#7a5524",
    underAmount: 0,
    metalRoughness: 0.14,
    patinaRoughness: 0.45,
    patinaMetalness: 0.85,
    coverage: 0,
    polishLo: 0.55,
    polishHi: 0.85,
    cavityLo: 0.25,
    cavityHi: 0.6,
    deepDarken: 0.45,
    clearcoat: 0.15,
  },
};
