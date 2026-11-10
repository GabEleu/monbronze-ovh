"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCalmMode, usePreferences } from "@/lib/preferences";
import { setSoundEnabled } from "@/lib/sound";

const CONSOLE_ART = String.raw`
   ███╗   ███╗ ██████╗ ███╗   ██╗██████╗ ██████╗  ██████╗ ███╗   ██╗███████╗███████╗
   ████╗ ████║██╔═══██╗████╗  ██║██╔══██╗██╔══██╗██╔═══██╗████╗  ██║╚══███╔╝██╔════╝
   ██╔████╔██║██║   ██║██╔██╗ ██║██████╔╝██████╔╝██║   ██║██╔██╗ ██║  ███╔╝ █████╗
   ██║╚██╔╝██║██║   ██║██║╚██╗██║██╔══██╗██╔══██╗██║   ██║██║╚██╗██║ ███╔╝  ██╔══╝
   ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║██████╔╝██║  ██║╚██████╔╝██║ ╚████║███████╗███████╗
   ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚══════╝`;
let greeted = false;

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;

/** Instance Lenis courante (null en mouvement réduit ou expérience allégée). */
export function getLenis() {
  return lenisInstance;
}

/**
 * Systèmes globaux d'expérience :
 * - attribut `data-experience` sur <html> (full | lite) pour le CSS ;
 * - défilement fluide Lenis, piloté par l'horloge unique `gsap.ticker`
 *   (ScrollTrigger et, plus tard, React Three Fiber partagent cette horloge).
 * Désactivé si `prefers-reduced-motion` ou « Expérience allégée ».
 */
export function Experience() {
  const calm = useCalmMode();
  const { sound } = usePreferences();

  // Son : coupé par défaut ; un geste (interrupteur « Son ») l'active.
  useEffect(() => {
    setSoundEnabled(sound);
  }, [sound]);

  // Un mot pour les curieux qui ouvrent la console.
  useEffect(() => {
    if (greeted) return;
    greeted = true;
    console.log(
      `%c${CONSOLE_ART}\n\n%cCoulé à la cire perdue, ciselé en TypeScript. La fonderie d'art accessible au plus grand nombre : contact@monbronze.fr`,
      "color:#c49a4a;font-family:monospace;font-size:8px;line-height:1",
      "color:#8b867e;font-family:monospace",
    );
  }, []);

  useEffect(() => {
    document.documentElement.dataset.experience = calm ? "lite" : "full";
  }, [calm]);

  useEffect(() => {
    if (calm) return;
    const lenis = new Lenis({ autoRaf: false, anchors: true, stopInertiaOnNavigate: true });
    lenisInstance = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisInstance = null;
    };
  }, [calm]);

  return null;
}
