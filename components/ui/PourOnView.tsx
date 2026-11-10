"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCalmMode } from "@/lib/preferences";

/**
 * Déclenche une seule fois la « petite coulée » qui remplit le bouton enfant quand il
 * entre à l'écran (CSS .pour-cta). Rien en mouvement réduit ou « Expérience allégée ».
 */
export function PourOnView({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const calm = useCalmMode();
  const [poured, setPoured] = useState(false);
  useEffect(() => {
    if (calm || poured || !ref.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setPoured(true);
          io.disconnect();
        }
      },
      { threshold: 1 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [calm, poured]);
  return (
    <span ref={ref} className="pour-cta inline-flex" data-pour={poured ? "" : undefined}>
      {children}
    </span>
  );
}
