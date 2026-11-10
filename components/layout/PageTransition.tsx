"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "gsap";
import { registerCover, withCover } from "@/lib/transition";

/**
 * Transition de page « métal liquide » (BRIEF.md §3.6) : un rideau de métal sombre au
 * front incandescent monte, la page change dessous, puis il se retire vers le haut.
 * Moins d'une seconde au total ; aucun effet en mouvement réduit ou expérience allégée
 * (lib/transition.ts n'appelle alors pas le rideau). Décoratif : aria-hidden.
 */
export function PageTransition() {
  const curtain = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const waiting = useRef<(() => void) | null>(null);
  const router = useRouter();

  // Un seul écouteur pour tous les liens internes (pas de coût par lien).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target || a.hasAttribute("download") || a.hasAttribute("data-plain")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname)
        return;
      e.preventDefault();
      withCover(() => router.push(url.pathname + url.search + url.hash));
    };
    // Phase de capture : avant le gestionnaire de <Link> (qui ignore un clic déjà empêché).
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  useEffect(() => {
    return registerCover((done) => {
      const el = curtain.current;
      if (!el) return done();
      gsap.killTweensOf(el);
      // Couche supérieure : au-dessus d'un menu <dialog> ouvert.
      try {
        el.showPopover?.();
      } catch {}
      gsap.set(el, { yPercent: 105, visibility: "visible" });
      gsap.to(el, {
        yPercent: 0,
        duration: 0.42,
        ease: "power3.in",
        onComplete: () => {
          waiting.current = () =>
            gsap.to(el, {
              yPercent: -105,
              duration: 0.5,
              ease: "power3.out",
              delay: 0.05,
              onComplete: () => {
                gsap.set(el, { visibility: "hidden" });
                try {
                  el.hidePopover?.();
                } catch {}
              },
            });
          done();
          // Filet de sécurité : la nouvelle page ne s'affiche pas (même chemin, erreur…).
          window.setTimeout(() => {
            waiting.current?.();
            waiting.current = null;
          }, 1200);
        },
      });
    });
  }, []);

  // Nouvelle page affichée : le rideau se retire.
  useEffect(() => {
    if (!waiting.current) return;
    const reveal = waiting.current;
    waiting.current = null;
    requestAnimationFrame(() => {
      reveal();
      // Next ne déplace pas le focus : on le place au début du contenu (WCAG 2.4.3).
      document.getElementById("contenu")?.focus({ preventScroll: true });
    });
  }, [pathname]);

  return (
    <div ref={curtain} aria-hidden="true" popover="manual" className="metal-curtain">
      <div className="metal-curtain__edge" />
    </div>
  );
}
