"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { useCalmMode } from "@/lib/preferences";

/**
 * Extrait vidéo de l'atelier (BRIEF.md §5.3) : muet, en boucle, lancé seulement quand il
 * est à l'écran. Bouton pause / lecture toujours présent (WCAG 2.2.2). En mouvement réduit
 * ou « Expérience allégée » : affiche fixe, lecture à la demande.
 */
export function AtelierVideo({
  src,
  poster,
  label,
}: {
  src: string;
  poster: string;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const calm = useCalmMode();
  const [paused, setPaused] = useState(true);
  const [stopped, setStopped] = useState(false);
  const [near, setNear] = useState(false);

  // L'affiche (~100 Ko, priorité moyenne) n'est demandée qu'à l'approche de la section :
  // un attribut `poster` est téléchargé dès l'analyse du HTML, même loin sous la ligne de
  // flottaison, et pesait sur le LCP de l'accueil. On observe la section, pas la vidéo :
  // dans le défilement horizontal, la piste rognée cacherait la vidéo jusqu'au dernier moment.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: "150% 0px" },
    );
    io.observe(video.closest("section") ?? video);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video || calm || stopped) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [calm, stopped]);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      setStopped(false);
      void video.play().catch(() => undefined);
    } else {
      setStopped(true);
      video.pause();
    }
  };

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={near ? poster : undefined}
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        className="absolute inset-0 size-full object-cover"
      />
      <button
        type="button"
        onClick={toggle}
        aria-pressed={!paused}
        className="visual__play label-mono"
      >
        <span aria-hidden="true">{paused ? "▶" : "❚❚"}</span>
        {paused ? site.visual.play : site.visual.pause}
      </button>
    </>
  );
}
