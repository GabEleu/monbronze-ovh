"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { getLenis } from "@/components/layout/Experience";
import { useCalmMode } from "@/lib/preferences";

/**
 * Galerie (BRIEF.md §6.4) : les images se déforment légèrement au déplacement. La vitesse
 * de défilement (Lenis) devient une inclinaison douce, portée par --scroll-skew sur <html>
 * et appliquée en CSS (.gallery-media). Rien en mouvement réduit ou expérience allégée.
 */
export function ScrollSkew() {
  const calm = useCalmMode();
  useEffect(() => {
    if (calm) return;
    const root = document.documentElement;
    let skew = 0;
    let written = "";
    const tick = () => {
      const velocity = getLenis()?.velocity ?? 0;
      const target = Math.max(-3, Math.min(3, velocity * 0.12));
      skew += (target - skew) * 0.12;
      if (Math.abs(skew) < 0.01) skew = 0;
      const value = skew.toFixed(2);
      if (value === written) return;
      written = value;
      root.style.setProperty("--scroll-skew", `${value}deg`);
      root.style.setProperty("--scroll-skew-abs", Math.abs(skew).toFixed(2));
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      root.style.removeProperty("--scroll-skew");
      root.style.removeProperty("--scroll-skew-abs");
    };
  }, [calm]);
  return null;
}
