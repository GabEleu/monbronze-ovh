"use client";

import { useEffect, useRef, useState } from "react";
import { getPatineDuJour } from "@/lib/patine";
import { site } from "@/content/site";
import { heroSculpture } from "@/content/assets";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { Crucible } from "@/components/sections/home/Crucible";
import { writeStorage, STORAGE_KEYS } from "@/lib/storage";
import { useRegisterHero } from "@/webgl/scenes";
import { skipIntro, useStage } from "@/webgl/stage";

/**
 * « Passer l'intro » : visible pendant le creuset ET pendant la coulée (aussi aux visites
 * suivantes), avec Échap comme raccourci. À la fin, si le bouton avait le focus, celui-ci
 * passe au titre (jamais perdu sur <body>).
 */
function SkipIntro({ title }: { title: React.RefObject<HTMLElement | null> }) {
  const stage = useStage();
  const button = useRef<HTMLButtonElement>(null);
  const visible =
    stage.webgl !== "off" &&
    stage.intro !== "done" &&
    (stage.crucible === "active" || stage.intro === "pour");

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      writeStorage(STORAGE_KEYS.introSeen, "1", "session");
      skipIntro();
    };
    window.addEventListener("keydown", onKey);
    const el = button.current;
    const heading = title.current;
    return () => {
      window.removeEventListener("keydown", onKey);
      if (el && document.activeElement === el) heading?.focus({ preventScroll: true });
    };
  }, [visible, title]);

  if (!visible) return null;
  return (
    <button
      ref={button}
      type="button"
      onClick={() => {
        writeStorage(STORAGE_KEYS.introSeen, "1", "session");
        skipIntro();
      }}
      className="hero-skip label-mono text-ink-muted underline decoration-line-strong underline-offset-4 hover:text-ink"
    >
      {site.home.hero.intro.skip}
    </button>
  );
}

/**
 * Accueil plein écran « La coulée » (BRIEF.md §3.3).
 * Le H1 existe en HTML dès le premier affichage (SEO, accessibilité, LCP) ; le canvas
 * persistant l'habille sans le remplacer (mix-blend-mode lighten, voir globals.css).
 * Sans WebGL (mouvement réduit, expérience allégée, contraste élevé, appareil modeste) :
 * version statique, avec un filet de métal en CSS et l'image fixe de la sculpture, au
 * même emplacement que la sculpture 3D.
 */
export function Hero() {
  const t = site.home.hero;
  const section = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const bust = useRef<HTMLDivElement>(null);
  useRegisterHero(section, title, bust);
  const img = heroSculpture.image;
  const stage = useStage();
  const [patineDuJour, setPatineDuJour] = useState<string | null>(null);
  useEffect(() => {
    if (stage.webgl !== "ready") return;
    const raf = requestAnimationFrame(() =>
      setPatineDuJour(site.patines.find((p) => p.id === getPatineDuJour())?.label ?? null),
    );
    return () => cancelAnimationFrame(raf);
  }, [stage.webgl]);

  return (
    <section
      ref={section}
      aria-labelledby="hero-title"
      className="hero theme-dark relative isolate flex min-h-[calc(100svh-var(--header-h))] flex-col overflow-hidden"
    >
      <div aria-hidden="true" className="hero-pour" />
      <Crucible title={title} section={section} />
      <SkipIntro title={title} />

      <div className="hero-content container-page relative flex flex-1 flex-col justify-end pb-8">
        <div className="relative">
          {/* Sculpture : image fixe (version statique) ; la sculpture 3D se cale sur
              cette boîte, à droite du titre (au-dessus du sur-titre sur mobile). */}
          <div
            ref={bust}
            aria-hidden="true"
            className="hero-bust"
            style={{ aspectRatio: `${img.width} / ${img.height}` }}
          >
            <picture>
              <source srcSet={img.avif} type="image/avif" />
              <img src={img.webp} alt="" width={img.width} height={img.height} decoding="async" />
            </picture>
          </div>
          {/* Téléphone : cartel à gauche du socle (voir .hero-label) ; ailleurs, en ligne. */}
          <div className="hero-label">
            <p className="touch-hint hero-hint font-mono text-xs leading-relaxed text-ink">
              {site.touch.hero}
            </p>
            <Eyebrow>{t.eyebrow}</Eyebrow>
          </div>
          <h1
            ref={title}
            id="hero-title"
            tabIndex={-1}
            className="hero-title text-display mt-6 max-w-[14ch] uppercase outline-none max-md:mt-0 lg:max-w-none"
          >
            {t.title}
          </h1>
        </div>

        <div className="mt-10 grid gap-10 md:mt-14 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7 lg:col-span-5">
            <p className="text-lead max-w-xl text-ink">{t.text}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href={site.cta.create.href} glow size="lg">
                {site.cta.create.label}
              </ButtonLink>
              <ButtonLink href={site.cta.discover.href} variant="ghost" size="lg">
                {site.cta.discover.label}
              </ButtonLink>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:col-span-5 md:col-start-8 md:items-end md:text-right lg:col-span-4 lg:col-start-9">
            <p className="max-w-xs font-serif text-xl leading-snug text-ink [font-variation-settings:'SOFT'_60,'opsz'_36]">
              {t.baseline}
            </p>
            <ul className="label-mono flex flex-wrap gap-x-4 gap-y-1 text-ink-muted md:justify-end">
              {t.techniques.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
            <p className="max-w-xs font-mono text-xs leading-relaxed text-ink-muted">
              {patineDuJour && (
                <>
                  <span className="text-ink">
                    {t.sculpture.dailyPatina}&nbsp;: {patineDuJour}
                  </span>
                  <br />
                </>
              )}
              {t.sculpture.caption}.{" "}
              <TransitionLink
                href="/credits"
                className="underline decoration-line-strong underline-offset-4 hover:text-ink"
              >
                {t.sculpture.credits}
              </TransitionLink>
            </p>
          </div>
        </div>

        <div className="label-mono mt-12 flex items-center justify-between border-t border-line pt-5 text-ink-muted">
          <span className="flex items-center gap-3">
            <span aria-hidden="true" className="hero-scroll-dot" />
            {t.scroll}
          </span>
          <span className="hidden text-right md:block">{site.brand.signature}</span>
        </div>
      </div>
    </section>
  );
}
