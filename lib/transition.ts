/**
 * Pont entre les liens (TransitionLink) et le rideau de métal liquide (PageTransition).
 * Sans rideau enregistré (mouvement réduit, expérience allégée, script pas encore chargé),
 * la navigation part immédiatement.
 */
type Cover = (done: () => void) => void;
let cover: Cover | null = null;

export function registerCover(fn: Cover) {
  cover = fn;
  return () => {
    if (cover === fn) cover = null;
  };
}

/** Joue le rideau puis appelle `navigate` (ou navigue tout de suite s'il n'y en a pas). */
export function withCover(navigate: () => void) {
  const calm =
    document.documentElement.dataset.experience === "lite" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!cover || calm) return navigate();
  cover(navigate);
}
