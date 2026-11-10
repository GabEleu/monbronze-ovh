/**
 * Écran tactile : sans survol, la sculpture se tourne du doigt. Un glissement horizontal
 * sur sa boîte CSS fait tourner la pièce ; un glissement vertical reste un défilement
 * (`touch-action: pan-y`, posé en CSS sur les boîtes concernées). Sans effet à la souris :
 * l'ordinateur garde le suivi du pointeur.
 *
 * `onTurn` reçoit une valeur dans [-RANGE, RANGE] (même échelle que la position du pointeur
 * sur ordinateur, de -0,5 à 0,5, mais plus ample : on peut voir la pièce de profil).
 */
const RANGE = 1.6;
/** Largeur de la boîte parcourue du doigt → valeur gagnée. */
const GAIN = 2;

export function bindTouchTurn(el: HTMLElement, onTurn: (value: number) => void): () => void {
  if (!window.matchMedia("(hover: none)").matches) return () => undefined;
  let id = -1;
  let startX = 0;
  let base = 0;
  let value = 0;

  const down = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    id = e.pointerId;
    startX = e.clientX;
    base = value;
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    const dx = (e.clientX - startX) / Math.max(1, el.clientWidth);
    value = Math.max(-RANGE, Math.min(RANGE, base + dx * GAIN));
    onTurn(value);
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId === id) id = -1;
  };

  el.addEventListener("pointerdown", down, { passive: true });
  el.addEventListener("pointermove", move, { passive: true });
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  return () => {
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
  };
}
