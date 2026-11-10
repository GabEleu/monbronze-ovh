"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { site } from "@/content/site";
import { Eyebrow, pad } from "@/components/ui/Eyebrow";
import { Visual } from "@/components/ui/Visual";
import { useCalmMode } from "@/lib/preferences";
import { getLenis } from "@/components/layout/Experience";
import { playChisel } from "@/lib/sound";
import type { AtelierContent } from "@/lib/content/schemas";

gsap.registerPlugin(ScrollTrigger);

/**
 * Les six gestes de l'atelier (BRIEF.md §6.1-4) : défilement horizontal épinglé.
 * Sans JavaScript, en mouvement réduit ou « Expérience allégée » : grille verticale
 * (même HTML). La piste se déplace avec le défilement vertical, dans les deux sens.
 * Écran tactile (sans survol) : piste native que l'on fait glisser du doigt (cartes calées
 * par scroll-snap, jauge liée au glissement) ; le défilement vertical traverse la section.
 */
export function Ateliers({ gestures }: { gestures: AtelierContent["gestures"] }) {
  const t = site.home.ateliers;
  const total = gestures.length;
  const calm = useCalmMode();
  const [mode, setMode] = useState<"grid" | "horizontal" | "swipe">("grid");
  const horizontal = mode === "horizontal";
  const pin = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLOListElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);
  const lastHeight = useRef(0);

  // Changement de mode pendant que la section est au-dessus de l'écran : on compense.
  useLayoutEffect(() => {
    const el = section.current;
    if (!el) return;
    const height = el.offsetHeight;
    const delta = lastHeight.current ? height - lastHeight.current : 0;
    lastHeight.current = height;
    if (delta && el.getBoundingClientRect().bottom < 0) {
      const lenis = getLenis();
      const y = window.scrollY + delta;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    }
  }, [mode]);

  // Mode horizontal activé côté client seulement (rendu serveur = grille).
  useEffect(() => {
    const touch = window.matchMedia("(hover: none)").matches;
    const raf = requestAnimationFrame(() =>
      setMode(calm ? "grid" : touch ? "swipe" : "horizontal"),
    );
    return () => cancelAnimationFrame(raf);
  }, [calm]);

  // Piste au doigt : la jauge suit le glissement.
  useEffect(() => {
    if (mode !== "swipe" || !rail.current) return;
    const railEl = rail.current;
    const barEl = bar.current;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = railEl.scrollWidth - railEl.clientWidth;
        if (bar.current)
          bar.current.style.transform = `scaleX(${max > 0 ? railEl.scrollLeft / max : 0})`;
      });
    };
    update();
    railEl.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      railEl.removeEventListener("scroll", update);
      if (barEl) barEl.style.transform = "";
    };
  }, [mode]);

  useEffect(() => {
    if (!horizontal || !pin.current || !rail.current) return;
    const pinEl = pin.current;
    const railEl = rail.current;
    let distance = 0;
    const measure = () => {
      distance = Math.max(0, railEl.scrollWidth - railEl.clientWidth);
      pinEl.style.setProperty("--distance", `${distance}px`);
    };
    measure();
    const ro = new ResizeObserver(() => {
      measure();
      ScrollTrigger.refresh();
    });
    ro.observe(railEl);
    const header = () => document.querySelector("header")?.getBoundingClientRect().height ?? 72;
    const apply = (progress: number) => {
      railEl.style.transform = `translate3d(${-progress * distance}px, 0, 0)`;
      if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
    };
    const trigger = ScrollTrigger.create({
      trigger: pinEl,
      start: () => `top ${header()}px`,
      end: "bottom bottom",
      invalidateOnRefresh: true,
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => apply(self.progress),
    });
    ScrollTrigger.refresh();
    return () => {
      ro.disconnect();
      trigger.kill();
      railEl.style.transform = "";
    };
  }, [horizontal]);

  return (
    <section
      ref={section}
      aria-labelledby="ateliers-title"
      className="ateliers theme-light section"
      data-horizontal={horizontal ? "" : undefined}
      data-swipe={mode === "swipe" ? "" : undefined}
    >
      <div className="container-page grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Eyebrow index={4} total={8}>
            {t.eyebrow}
          </Eyebrow>
          <h2 id="ateliers-title" className="text-h2 mt-6 max-w-[18ch]">
            {t.title}
          </h2>
        </div>
        <p className="text-lead text-ink-muted lg:col-span-4 lg:col-start-9 lg:self-end">
          {t.text}
        </p>
      </div>

      <div ref={pin} className="ateliers-pin">
        <div className="ateliers-stage">
          <ol ref={rail} className="ateliers-rail container-page">
            {gestures.map((g, i) => (
              <li key={`${i}-${g.title}`} className="ateliers-card" onPointerEnter={playChisel}>
                <Visual
                  asset={{ kind: "image", subject: g.title, ...g.image, video: g.video }}
                  ratio="landscape"
                  sizes="(min-width: 1024px) 40vw, 85vw"
                />
                <div className="flex flex-col gap-3">
                  <span className="label-mono text-ink-muted">
                    {pad(i + 1)} / {pad(total)}
                  </span>
                  <h3 className="text-h3">{g.title}</h3>
                  <p className="max-w-md text-ink-muted">{g.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div aria-hidden="true" className="ateliers-progress container-page">
            <div className="ateliers-progress-track">
              <div ref={bar} className="ateliers-progress-bar" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
