/** État de la scène 3D d'une histoire : l'image fixe s'efface quand la scène est prête. */
type Status = "idle" | "ready";
let status: Status = "idle";
const listeners = new Set<() => void>();

export function setStoryStatus(next: Status) {
  if (next === status) return;
  status = next;
  listeners.forEach((l) => l());
}
export const getStoryStatus = () => status;
export function subscribeStoryStatus(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
