"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { site } from "@/content/site";
import { Eyebrow, pad } from "@/components/ui/Eyebrow";
import { Visual } from "@/components/ui/Visual";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { useRegisterMetamorph } from "@/webgl/scenes";
import { useStage } from "@/webgl/stage";
import {
  getMetamorphStatus,
  setMetamorphProgress,
  subscribeMetamorphStatus,
} from "@/webgl/metamorph/store";
import { getLenis } from "@/components/layout/Experience";
import {
  gaugeAmount,
  stateAt,
  STEP_COUNT,
  stepAt,
  temperatureParts,
} from "@/webgl/metamorph/timeline";

gsap.registerPlugin(ScrollTrigger);

/** Part de la jauge de température (indicative) : 20 °C → ~1 200 °C. */
function heat(temperature: string) {
  const value = Number(temperature.replace(/\D/g, ""));
  return Math.max(0.03, Math.min(1, value / 1200));
}

/**
 * La métamorphose (BRIEF.md §3.4).
 * - Avec WebGL : défilement épinglé ; UNE sculpture traverse les cinq états (transitions
 *   fondues dans le shader, webgl/metamorph), le texte de l'étape et la jauge de
 *   température suivent le défilement, dans les deux sens.
 * - Sans WebGL (mouvement réduit, expérience allégée, appareil modeste) : planche statique
 *   des cinq états. Le même HTML sert les deux : la liste des étapes reste lisible en entier
 *   par les lecteurs d'écran.
 */
export function Metamorphose() {
  const t = site.home.metamorphose;
  const total = site.steps.length;
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const visual = useRef<HTMLDivElement>(null);
  const gaugeValue = useRef<HTMLSpanElement>(null);
  const gaugeApprox = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);
  const stage = useStage();
  const status = useSyncExternalStore(
    subscribeMetamorphStatus,
    getMetamorphStatus,
    () => "idle" as const,
  );
  const pinned = stage.webgl === "ready" && status === "ready";
  const lastHeight = useRef(0);

  // Changement de mode (planche ↔ épinglé) pendant que la section est au-dessus de l'écran :
  // on compense la différence de hauteur, le contenu lu ne saute pas.
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
  }, [pinned]);
  useRegisterMetamorph(section, visual);

  useEffect(() => {
    if (!pinned || !track.current) return;
    const update = (progress: number) => {
      setMetamorphProgress(progress);
      const u = progress * STEP_COUNT;
      const step = stepAt(u);
      setActive((prev) => (prev === step ? prev : step));
      const s = stateAt(u);
      const { approx, text } = temperatureParts(s.temperature);
      if (gaugeValue.current) gaugeValue.current.textContent = text;
      if (gaugeApprox.current) gaugeApprox.current.hidden = !approx;
      section.current?.style.setProperty("--heat", gaugeAmount(s.temperature).toFixed(4));
    };
    const header = () => document.querySelector("header")?.getBoundingClientRect().height ?? 72;
    const trigger = ScrollTrigger.create({
      trigger: track.current,
      start: () => `top ${header()}px`,
      end: "bottom bottom",
      invalidateOnRefresh: true,
      onUpdate: (self) => update(self.progress),
      onRefresh: (self) => update(self.progress),
    });
    // La mise en page vient de changer (planche → défilement épinglé).
    ScrollTrigger.refresh();
    return () => {
      trigger.kill();
      setMetamorphProgress(0);
    };
  }, [pinned]);

  return (
    <section
      ref={section}
      aria-labelledby="metamorphose-title"
      className="metamorph theme-dark section"
      data-pinned={pinned ? "" : undefined}
    >
      <div className="container-page grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Eyebrow index={5} total={8}>
            {t.eyebrow}
          </Eyebrow>
          <h2 id="metamorphose-title" className="text-h2 mt-6 max-w-[20ch]">
            {t.title}
          </h2>
        </div>
        <p className="font-serif text-2xl leading-snug text-ink [font-variation-settings:'SOFT'_50,'opsz'_48] lg:col-span-4 lg:self-end">
          {t.message}
        </p>
      </div>

      <div ref={track} className="metamorph-track">
        <div className="metamorph-stage container-page">
          <div ref={visual} aria-hidden="true" className="metamorph-visual" />

          <ol className="metamorph-steps">
            {site.steps.map((step, i) => {
              const current = pinned && i === active;
              return (
                <li
                  key={step.id}
                  className="metamorph-step"
                  data-active={current ? "" : undefined}
                  aria-current={current ? "step" : undefined}
                >
                  <div className="metamorph-step-visual">
                    <Visual id={step.asset} ratio="step" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <span className="label-mono text-ink-muted">
                      {pad(i + 1)} / {pad(total)}
                    </span>
                    <h3 className="metamorph-step-title text-h3 uppercase">{step.title}</h3>
                    <p className="metamorph-step-text text-sm text-ink-muted">{step.text}</p>
                    {i === total - 1 && (
                      // Le message revient à la fin de la métamorphose (doublon de l'en-tête).
                      <p
                        aria-hidden="true"
                        className="metamorph-step-message font-serif text-lg leading-snug text-ink [font-variation-settings:'SOFT'_50,'opsz'_36]"
                      >
                        {t.message}
                      </p>
                    )}
                  </div>
                  <div className="metamorph-step-temp mt-auto flex flex-col gap-2">
                    <div className="label-mono flex items-baseline justify-between text-ink-muted">
                      <span>{t.temperatureLabel}</span>
                      <span className="text-ink">{step.temperature}</span>
                    </div>
                    <div aria-hidden="true" className="h-0.5 w-full bg-line">
                      <div
                        className="h-full bg-linear-to-r from-bronze via-incandescent to-fusion"
                        style={{ width: `${heat(step.temperature) * 100}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Honnêteté : la sculpture est un scan de musée, les étapes sont simulées. */}
          <p className="metamorph-caption font-mono text-xs leading-relaxed text-ink-muted">
            {t.caption}{" "}
            <TransitionLink
              href="/credits"
              className="underline decoration-line-strong underline-offset-4 hover:text-ink"
            >
              {t.credits}
            </TransitionLink>
          </p>

          {/* Jauge animée (doublon visuel des températures de chaque étape). */}
          <div aria-hidden="true" className="metamorph-gauge">
            <span className="label-mono text-ink-muted">{t.temperatureLabel}</span>
            <span className="metamorph-gauge-value font-mono text-ink">
              <span ref={gaugeApprox} className="metamorph-gauge-approx" hidden>
                ≈{" "}
              </span>
              <span ref={gaugeValue}>{temperatureParts(20).text}</span>
            </span>
            <div className="metamorph-gauge-meter">
              <div className="metamorph-gauge-scale label-mono text-[0.625rem] text-ink-muted">
                {t.gaugeScale.map((mark) => (
                  <span key={mark}>{mark}</span>
                ))}
              </div>
              <div className="metamorph-gauge-bar">
                <div className="metamorph-gauge-fill" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
