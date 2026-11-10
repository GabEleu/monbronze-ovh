import type { Patine } from "@/content/assets";

/**
 * État du configurateur (accueil, « Les possibilités ») : aspect « source » survolé et
 * patine choisie. Écrit par le DOM, lu à chaque image par la scène WebGL.
 */
export type Look = "bronze" | "sculpture" | "objet" | "fichier" | "photos" | "impression";

let look: Look = "bronze";
let patine: Patine = "brun-medaille";
let changed = 0;
let status: "idle" | "ready" | "failed" = "idle";
const listeners = new Set<() => void>();

export function setLook(next: Look) {
  if (next === look) return;
  look = next;
  changed = performance.now();
}

export function setConfiguratorPatine(next: Patine) {
  if (next === patine) return;
  patine = next;
  changed = performance.now();
}

export const getLook = () => look;
export const getConfiguratorPatine = () => patine;
export const configuratorChangedAt = () => changed;

export function setConfiguratorStatus(next: typeof status) {
  if (next === status) return;
  status = next;
  listeners.forEach((l) => l());
}
export const getConfiguratorStatus = () => status;
export function subscribeConfiguratorStatus(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
