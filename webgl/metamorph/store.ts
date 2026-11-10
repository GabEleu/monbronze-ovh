/**
 * Progression du défilement épinglé de la métamorphose (0 → 1), écrite par la section DOM
 * (ScrollTrigger) et lue à chaque image par la scène WebGL.
 */
let progress = 0;
let changed = 0;

export function setMetamorphProgress(value: number) {
  if (value === progress) return;
  progress = value;
  changed = performance.now();
}

export function getMetamorphProgress() {
  return progress;
}

/** Horodatage du dernier changement (rendu à la demande). */
export function metamorphChangedAt() {
  return changed;
}

/** État de la scène 3D : la section ne s'épingle qu'une fois la scène prête. */
export type MetamorphStatus = "idle" | "ready" | "failed";
let status: MetamorphStatus = "idle";
const listeners = new Set<() => void>();

export function setMetamorphStatus(next: MetamorphStatus) {
  if (next === status) return;
  status = next;
  listeners.forEach((l) => l());
}

export function getMetamorphStatus() {
  return status;
}

export function subscribeMetamorphStatus(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
