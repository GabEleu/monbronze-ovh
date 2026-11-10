/**
 * Chronologie de la métamorphose (BRIEF.md §3.4), SANS three.js : le DOM (texte, jauge)
 * et la scène WebGL lisent les mêmes fonctions.
 *
 * `u` ∈ [0, 5] : progression du défilement épinglé × 5. Chaque étape occupe un cinquième
 * du défilement : u ∈ [k, k + 1) → étape k. Tout est une fonction PURE de `u` : le
 * défilement arrière rejoue exactement l'inverse, sans saut d'objet.
 */
export const STEP_COUNT = 5;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** smoothstep(a, b, x). */
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Étape affichée (0 à 4). */
export function stepAt(u: number) {
  return Math.min(STEP_COUNT - 1, Math.max(0, Math.floor(u)));
}

/** Haut et bas du modèle normalisé (hauteur 1, centré) avec une marge. */
const TOP = 0.56;
const BOTTOM = -0.56;

export type MetamorphState = {
  /** 1. Capturer : nuage de points. */
  points: number;
  /** 2. Modéliser : maillage filaire (apparition progressive des arêtes). */
  wire: number;
  /** 3. Fabriquer : front d'impression (y objet). Au-dessus, rien n'est encore imprimé. */
  printLevel: number;
  /** Impression en cours (buse visible). */
  printing: number;
  /** Aspect « impression 3D » (PLA mat, couches). */
  print: number;
  /** 4. Cire ambrée translucide. */
  wax: number;
  /** Front du métal en fusion qui descend sur la cire (y objet). */
  moltenFront: number;
  /** Filet de coulée au-dessus de la pièce. */
  stream: number;
  /** Hauteur de la ligne laser du scanner (y objet), liée au défilement. */
  scan: number;
  /** Chaleur du métal (1 = incandescent). */
  heat: number;
  /** 5. Développement de la patine (0 = bronze brut poli, 1 = patine finale). */
  patina: number;
  /** Température indicative (°C). */
  temperature: number;
};

export function stateAt(u: number): MetamorphState {
  // 1 → 2 : les points se relient en arêtes.
  const points = 1 - smooth(0.7, 1.15, u);
  const wireIn = smooth(0.6, 1.1, u);
  // 3 : la buse imprime de bas en haut ; le filaire reste au-dessus du front.
  const printT = clamp01((u - 1.95) / 0.95);
  const printLevel =
    u < 1.95 ? BOTTOM - 0.05 : printT >= 1 ? TOP + 0.05 : lerp(BOTTOM, TOP, printT);
  const printing = u > 1.95 && printT < 1 ? 1 : 0;
  const wire = wireIn * (1 - smooth(2.85, 3.0, u));
  // 4 : la pièce devient cire, puis le métal coule du haut vers le bas, puis refroidit.
  const wax = smooth(2.9, 3.08, u);
  const pour = smooth(3.25, 3.6, u);
  const moltenFront = lerp(TOP + 0.08, BOTTOM - 0.08, pour);
  const stream = smooth(3.17, 3.25, u) * (1 - smooth(3.52, 3.6, u));
  // Le laser monte et descend au fil du défilement (pas d'animation perpétuelle).
  const scan = lerp(
    BOTTOM + 0.04,
    TOP - 0.04,
    0.5 - 0.5 * Math.cos(Math.min(u, 1.2) * Math.PI * 3),
  );
  const heat = smooth(3.2, 3.3, u) * (1 - smooth(3.7, 4.05, u));
  // 5 : le ciseleur polit, la patine se développe dans les creux.
  const patina = smooth(4.15, 4.65, u);
  // Jauge indicative : 20 °C, ≈ 1 200 °C pendant la fonte, refroidissement, 20 °C.
  const temperature = lerp(20, 1200, smooth(3.3, 3.5, u) * (1 - smooth(3.7, 4.05, u)));
  return {
    points,
    wire,
    printLevel,
    printing,
    print: 1,
    wax,
    moltenFront,
    stream,
    scan,
    heat,
    patina,
    temperature,
  };
}

const NUMBER = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Température arrondie : « 20 °C », ou valeur approchée (≈) au-delà. */
export function temperatureParts(celsius: number) {
  const rounded = celsius < 30 ? 20 : Math.round(celsius / 10) * 10;
  return { approx: rounded > 20, text: `${NUMBER.format(rounded)} °C` };
}

/** « 20 °C », « ≈ 1 200 °C » (espaces fines insécables, comme fr()). */
export function formatTemperature(celsius: number) {
  const { approx, text } = temperatureParts(celsius);
  return `${approx ? "≈ " : ""}${text}`;
}

/** Part de la jauge (0 à 1). */
export function gaugeAmount(celsius: number) {
  return Math.min(1, Math.max(0, (celsius - 20) / 1180));
}
