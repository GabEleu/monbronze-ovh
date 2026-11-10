"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { site } from "@/content/site";
import { useCalmMode } from "@/lib/preferences";

/**
 * Curseur (BRIEF.md §3.6) : un point avec un halo de chaleur qui suit le pointeur.
 * - magnétique sur les boutons et liens d'action (data-magnetic ou .group/btn) ;
 * - affiche « Voir l'histoire » sur les cartes de réalisations ([data-cursor="story"]) ;
 * - désactivé sur écran tactile, en mouvement réduit et en « Expérience allégée ».
 * Le curseur système reste visible : ce halo l'accompagne, il ne le remplace pas.
 */
export function Cursor() {
  const calm = useCalmMode();
  const [fine, setFine] = useState(false);
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (hover: hover)");
    const update = () => setFine(mq.matches);
    const raf = requestAnimationFrame(update);
    mq.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const el = dot.current;
    if (calm || !fine || !el) return;
    const x = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
    let magnet: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      el.dataset.visible = "";
      const target = e.target as Element | null;
      const story = target?.closest?.("[data-cursor='story']");
      el.dataset.mode = story ? "story" : "";
      const button = target?.closest?.<HTMLElement>(".group\\/btn, [data-magnetic]") ?? null;
      if (button !== magnet) {
        if (magnet) gsap.to(magnet, { x: 0, y: 0, duration: 0.6, ease: "expo.out" });
        magnet = button;
      }
      if (magnet) {
        // Bouton magnétique : il glisse légèrement vers le pointeur.
        const r = magnet.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        gsap.to(magnet, {
          x: dx * 0.18,
          y: dy * 0.28,
          duration: 0.5,
          ease: "power3.out",
          overwrite: "auto",
        });
        el.dataset.mode = "button";
      }
      x(e.clientX);
      y(e.clientY);
    };
    const onLeave = () => delete el.dataset.visible;
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (magnet) gsap.set(magnet, { x: 0, y: 0 });
    };
  }, [calm, fine]);

  if (calm || !fine) return null;
  return (
    <div ref={dot} aria-hidden="true" className="heat-cursor">
      <span className="heat-cursor__halo" />
      <span className="heat-cursor__dot" />
      <span ref={label} className="heat-cursor__label label-mono">
        {site.cursor.story}
      </span>
    </div>
  );
}
