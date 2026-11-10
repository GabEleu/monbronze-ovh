"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Patine } from "@/content/assets";
import { site } from "@/content/site";
import { Eyebrow, pad } from "@/components/ui/Eyebrow";
import { Visual } from "@/components/ui/Visual";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { PatinaConfigurator, PatinaSwatches } from "@/components/sections/home/PatinaConfigurator";
import { useRegisterConfigurator } from "@/webgl/scenes";
import { useStage } from "@/webgl/stage";
import {
  getConfiguratorStatus,
  setConfiguratorPatine,
  setLook,
  subscribeConfiguratorStatus,
  type Look,
} from "@/webgl/configurator/store";

/**
 * Les possibilités et le sur-mesure (BRIEF.md §6.1-3). La sculpture 3D, fixe dans sa
 * colonne (grand écran), prend l'aspect de la source survolée ou touchée (plâtre, terre,
 * filaire, nuage de points, impression), puis la patine choisie. Effet décoratif : tout
 * le contenu reste en HTML. Sans WebGL : échantillon statique de la patine choisie.
 * Sous 1024 px : titre → sources → sculpture → rangée des patines juste dessous (le choix
 * et son résultat tiennent dans le même écran) → texte du configurateur et bouton.
 * Écran tactile (sans survol) : les sources deviennent des cartes à faire glisser, posées
 * juste au-dessus de la sculpture ; la carte affichée donne son aspect, un second toucher
 * le retire, et la sculpture revient au bronze quand les cartes quittent l'écran.
 */
export function Possibilities() {
  const t = site.home.possibilities;
  const section = useRef<HTMLElement>(null);
  const visual = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const pointerType = useRef("mouse");
  const [patine, setPatine] = useState<Patine>("brun-medaille");
  const [active, setActive] = useState<Look | null>(null);
  useRegisterConfigurator(section, visual);
  const stage = useStage();
  const status = useSyncExternalStore(
    subscribeConfiguratorStatus,
    getConfiguratorStatus,
    () => "idle" as const,
  );
  const live = stage.webgl === "ready" && status === "ready";

  useEffect(() => setConfiguratorPatine(patine), [patine]);
  useEffect(() => () => setLook("bronze"), []);

  // Toucher : aspect de la carte choisie (null = bronze), avec son état visible sur la carte.
  const activate = (look: Look | null) => {
    setActive(look);
    setLook(look ?? "bronze");
  };

  // Cartes à faire glisser (écran tactile étroit) : la carte calée à gauche donne son aspect.
  useEffect(() => {
    const ul = list.current;
    if (!ul) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (ul.scrollWidth <= ul.clientWidth + 1) return;
        const left = ul.getBoundingClientRect().left;
        let best: HTMLElement | null = null;
        let gap = Infinity;
        for (const item of Array.from(ul.children) as HTMLElement[]) {
          const d = Math.abs(item.getBoundingClientRect().left - left);
          if (d < gap) [best, gap] = [item, d];
        }
        const look = (best?.dataset.look as Look | undefined) ?? null;
        setActive(look);
        setLook(look ?? "bronze");
      });
    };
    // Cartes hors de l'écran : la sculpture redevient bronze (pour choisir la patine).
    const io = new IntersectionObserver(([entry]) => {
      if (entry && !entry.isIntersecting && ul.scrollWidth > ul.clientWidth + 1) {
        setActive(null);
        setLook("bronze");
      }
    });
    io.observe(ul);
    ul.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ul.removeEventListener("scroll", onScroll);
    };
  }, []);

  const preview = (look: Look) => ({
    "data-look": look,
    "data-active": active === look ? "" : undefined,
    onPointerDown: (e: React.PointerEvent) => (pointerType.current = e.pointerType),
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setLook(look),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && setLook("bronze"),
    // Souris : le survol suffit. Toucher : un toucher montre l'aspect, un second le retire.
    onClick: () =>
      pointerType.current === "mouse" ? setLook(look) : activate(active === look ? null : look),
  });

  const choosePatine = (next: Patine) => {
    setPatine(next);
    if (active) activate(null);
  };

  return (
    <section
      ref={section}
      aria-labelledby="possibilities-title"
      className="possibilities theme-dark section"
      data-live={live ? "" : undefined}
    >
      {/* Ordre du code = ordre de lecture au téléphone (titre, sources, sculpture et patines,
          texte du configurateur) ; grand écran : placement explicite, sculpture à gauche. */}
      <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-20">
        <div className="flex flex-col gap-6 lg:col-span-7 lg:col-start-6 lg:row-start-1">
          <Eyebrow index={3} total={8}>
            {t.eyebrow}
          </Eyebrow>
          <h2 id="possibilities-title" className="text-h2 max-w-[16ch]">
            {site.sources.title}
          </h2>
        </div>

        <ul
          ref={list}
          className="possibilities-sources grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:col-span-7 lg:col-start-6 lg:row-start-2"
        >
          {site.sources.items.map((item, i) => (
            <li
              key={item.id}
              {...preview(item.id as Look)}
              className="possibilities-source flex flex-col gap-6 bg-surface p-6 transition-colors duration-500 hover:bg-surface-raise md:p-8"
            >
              <span className="label-mono text-ink-muted">
                {pad(i + 1)} / {pad(site.sources.items.length)}
              </span>
              <div className="flex flex-col gap-3">
                <h3 className="text-h3 font-serif">{item.title}</h3>
                <p className="text-sm text-ink-muted">{item.text}</p>
              </div>
            </li>
          ))}
          <li className="possibilities-source flex flex-col gap-6 bg-surface p-6 md:p-8">
            <span aria-hidden="true" className="label-mono text-ink-muted">
              +
            </span>
            <div className="flex flex-col gap-3">
              <h3 className="text-h3 font-serif">{site.sources.other.title}</h3>
              <p className="text-sm text-ink-muted">{site.sources.other.text}</p>
              <TransitionLink
                href={site.cta.project.href}
                className="label-mono mt-2 self-start text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
              >
                {site.sources.other.link}
              </TransitionLink>
            </div>
          </li>
        </ul>

        <div className="possibilities-aside lg:col-span-5 lg:col-start-1 lg:row-span-3 lg:row-start-1">
          <p className="touch-hint touch-hint--narrow mb-4 max-w-sm font-mono text-xs leading-relaxed text-ink">
            {site.touch.swipe}
          </p>
          <div ref={visual} aria-hidden="true" className="possibilities-visual">
            <div className="possibilities-static">
              <Visual id="configurateur" ratio="square" patine={patine} />
            </div>
          </div>
          {/* Téléphone et tablette : la patine se choisit juste sous la sculpture. */}
          <PatinaSwatches
            compact
            patine={patine}
            onChange={choosePatine}
            className="mt-5 lg:hidden"
          />
          <p className="mt-4 max-w-sm font-mono text-xs leading-relaxed text-ink-muted">
            {t.caption}{" "}
            <TransitionLink
              href="/credits"
              className="underline decoration-line-strong underline-offset-4 hover:text-ink"
            >
              {t.credits}
            </TransitionLink>
          </p>
        </div>

        <div className="lg:col-span-7 lg:col-start-6 lg:row-start-3">
          <PatinaConfigurator patine={patine} onChange={choosePatine} />
        </div>
      </div>
    </section>
  );
}
