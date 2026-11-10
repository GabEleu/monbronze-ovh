"use client";

import { useEffect, useRef, useState } from "react";
import { readStorage, STORAGE_KEYS, writeStorage } from "@/lib/storage";
import { drawTitleLayout } from "@/webgl/hero/titleLayout";
import { setStage, startPour, useStage } from "@/webgl/stage";

/** Durée maximale du chargement affiché (BRIEF.md §3.2), depuis l'arrivée sur la page. */
const MAX_MS = 3000;

/**
 * Écran de chargement « le creuset » (BRIEF.md §3.2), intégré à l'accueil : il ne masque
 * jamais le titre (le H1 HTML reste lisible pendant le chargement). Il se remplit selon la
 * progression RÉELLE (polices, moteur 3D, buste, environnement) et bascule à 100, ou au
 * plus tard 3 s après l'arrivée : le compteur garde alors la valeur réelle atteinte.
 * Son bec est placé au-dessus du point d'impact calculé sur le titre : le filet WebGL part
 * exactement de là. Décoratif (aria-hidden) : « Passer l'intro » est dans Hero.
 * Première visite de la session uniquement.
 */
export function Crucible({
  title,
  section,
}: {
  title: React.RefObject<HTMLElement | null>;
  section: React.RefObject<HTMLElement | null>;
}) {
  const stage = useStage();
  const [state, setState] = useState<"hidden" | "filling" | "tipping" | "pouring" | "gone">(
    "hidden",
  );
  const [left, setLeft] = useState(0.4);
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const level = useRef<SVGGElement>(null);
  const lipMark = useRef<SVGCircleElement>(null);
  const shown = useRef(0);
  const progress = useRef(stage.progress);
  useEffect(() => {
    progress.current = stage.progress;
  }, [stage.progress]);

  // Apparition : première visite de la session, et seulement si le WebGL se charge.
  useEffect(() => {
    if (state !== "hidden" || stage.webgl !== "loading" || stage.intro !== "loading") return;
    if (readStorage(STORAGE_KEYS.introSeen, "session") === "1") return;
    let cancelled = false;
    document.fonts.ready.then(() =>
      requestAnimationFrame(() => {
        if (cancelled || !title.current || !section.current) return;
        // Même calcul que le masque WebGL : le bec tombe au-dessus d'un jambage.
        const layout = drawTitleLayout(title.current, section.current);
        if (layout) setLeft(layout.pourX);
        shown.current = performance.now();
        setStage({ crucible: "active" });
        setState("filling");
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [stage.webgl, stage.intro, state, title, section]);

  // Remplissage animé vers la progression réelle ; bascule à 100 % ou à l'échéance.
  useEffect(() => {
    if (state !== "filling") return;
    let raf = 0;
    let value = 0;
    // Arrivée directe sur l'accueil : 3 s depuis la navigation ; sinon depuis l'apparition.
    const start = shown.current < MAX_MS + 1000 ? 0 : shown.current;
    const deadline = Math.max(start + MAX_MS, shown.current + 900);
    const loop = () => {
      value += (progress.current - value) * 0.12;
      if (progress.current >= 0.999 && value > 0.985) value = 1;
      if (counter.current)
        counter.current.textContent = String(Math.round(value * 100)).padStart(3, "0");
      level.current?.style.setProperty("--level", String(value));
      if (value >= 1 || performance.now() >= deadline) {
        setState("tipping");
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  // Bascule puis versement : la coulée WebGL commence au bec.
  useEffect(() => {
    if (state !== "tipping") return;
    const pour = window.setTimeout(() => {
      // Position RÉELLE du bec une fois le creuset basculé (uv de la section) : le filet
      // WebGL part exactement de là.
      const mark = lipMark.current?.getBoundingClientRect();
      const sr = section.current?.getBoundingClientRect();
      if (mark && sr?.width) {
        setStage({
          lip: {
            x: (mark.left + mark.width / 2 - sr.left) / sr.width,
            y: 1 - (mark.top + mark.height / 2 - sr.top) / sr.height,
          },
        });
      }
      writeStorage(STORAGE_KEYS.introSeen, "1", "session");
      startPour();
      setState("pouring");
    }, 480);
    return () => window.clearTimeout(pour);
  }, [state, section]);

  // Le creuset se vide, puis s'efface.
  useEffect(() => {
    if (state !== "pouring") return;
    const hide = window.setTimeout(() => setState("gone"), 2600);
    return () => window.clearTimeout(hide);
  }, [state]);

  // Intro passée (bouton ou Échap) : on retire le creuset.
  useEffect(() => {
    if (state === "hidden" || state === "gone" || stage.intro !== "done") return;
    const raf = requestAnimationFrame(() => setState("gone"));
    return () => cancelAnimationFrame(raf);
  }, [stage.intro, state]);

  // Retiré : la scène reprend la main (la coulée démarre dès que tout est prêt).
  useEffect(() => {
    if (state === "gone") setStage({ crucible: "none" });
  }, [state]);

  if (state === "hidden" || state === "gone") return null;

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="crucible"
      data-state={state}
      style={{ left: `${left * 100}%` }}
    >
      <span className="crucible__meta label-mono text-ink">
        <span ref={counter}>000</span>
        <span className="text-ink-muted"> → 100</span>
      </span>
      <svg viewBox="0 0 72 80" className="crucible__svg">
        <defs>
          <clipPath id="crucible-inside">
            <path d="M11.5 12 H56.5 L52 57 Q50.5 68.5 34 68.5 Q17.5 68.5 16 57 Z" />
          </clipPath>
          <linearGradient id="crucible-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3d6" />
            <stop offset="0.2" stopColor="#ffc35a" />
            <stop offset="0.6" stopColor="#ff6a1f" />
            <stop offset="1" stopColor="#a8260c" />
          </linearGradient>
        </defs>
        {/* Paroi : creuset de fonderie, fond arrondi */}
        <path
          d="M7 9 H61 L56 58 Q54 73 34 73 Q14 73 12 58 Z"
          fill="#2a2420"
          stroke="#8b867e"
          strokeWidth="1.4"
        />
        <g clipPath="url(#crucible-inside)">
          <rect x="0" y="10" width="72" height="62" fill="#15120f" />
          {/* Bain : reste horizontal pendant la bascule (contre-rotation en CSS). */}
          <g className="crucible__bath">
            <g ref={level} className="crucible__level">
              <rect x="-40" y="12" width="152" height="120" fill="url(#crucible-metal)" />
              <ellipse cx="34" cy="12.5" rx="30" ry="2" fill="#fff8e6" />
            </g>
          </g>
        </g>
        {/* Lèvre et bec verseur */}
        <rect x="4" y="6" width="60" height="5" rx="2.5" fill="#5f5a53" />
        <path d="M60 6 L71 3.5 L70.2 8.5 L62 11 Z" fill="#5f5a53" />
        {/* Repère du bec (pivot de la bascule), mesuré au moment du versement. */}
        <circle ref={lipMark} cx="71" cy="3.5" r="0.5" fill="none" />
      </svg>
    </div>
  );
}
