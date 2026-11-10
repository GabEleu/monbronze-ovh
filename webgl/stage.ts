"use client";

import { useSyncExternalStore } from "react";

/**
 * État partagé entre le DOM (accueil, creuset) et le canvas persistant.
 * Aucun rendu React côté WebGL : les scènes lisent `getStage()` à chaque image.
 */
export type IntroPhase =
  /** Ressources en cours de chargement (le creuset se remplit). */
  | "loading"
  /** Prêt : le creuset bascule, la coulée commence. */
  | "pour"
  /** Animation terminée ou passée : métal refroidi, sculpture visible. */
  | "done";

export type WebglStatus = "off" | "loading" | "ready";

export type Stage = {
  /** Progression réelle du chargement (0 → 1). */
  progress: number;
  intro: IntroPhase;
  /** Creuset de chargement (première visite de la session) en cours d'affichage. */
  crucible: "none" | "active";
  /** Horodatage (performance.now) du début de la coulée. */
  pourAt: number;
  /** L'utilisateur a passé l'intro. */
  skipped: boolean;
  webgl: WebglStatus;
  /** Bec du creuset (uv de la section) : départ du filet de métal. Null sans creuset. */
  lip: { x: number; y: number } | null;
};

let stage: Stage = {
  progress: 0,
  intro: "loading",
  crucible: "none",
  pourAt: 0,
  skipped: false,
  webgl: "off",
  lip: null,
};
const SERVER = stage;
const listeners = new Set<() => void>();
const loads = new Map<string, number>();
const WEIGHTS: Record<string, number> = { fonts: 1, engine: 3, model: 4, environment: 2 };

export function getStage() {
  return stage;
}

export function setStage(patch: Partial<Stage>) {
  stage = { ...stage, ...patch };
  listeners.forEach((l) => l());
}

/** Déclare l'avancement d'une ressource critique (clé : fonts, engine, model, environment). */
export function reportLoad(key: keyof typeof WEIGHTS, value: number) {
  loads.set(key, Math.max(loads.get(key) ?? 0, Math.min(1, value)));
  let done = 0;
  let total = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    total += w;
    done += w * (loads.get(k) ?? 0);
  }
  setStage({ progress: done / total });
}

export function startPour() {
  if (stage.intro !== "loading") return;
  setStage({ intro: "pour", pourAt: performance.now() });
}

export function skipIntro() {
  setStage({ intro: "done", skipped: true, pourAt: performance.now() - 20_000 });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useStage(): Stage {
  return useSyncExternalStore(subscribe, getStage, () => SERVER);
}

// Lecture de l'état pour les tests Playwright et le débogage (lecture seule).
if (typeof window !== "undefined") {
  (window as unknown as { __monbronzeStage?: () => Stage }).__monbronzeStage = getStage;
}
