"use client";

import { useRef, useSyncExternalStore, ViewTransition } from "react";
import type { Patine, VisualAsset } from "@/content/assets";
import { Visual } from "@/components/ui/Visual";
import { site } from "@/content/site";
import { useRegisterStory } from "@/webgl/scenes";
import { useStage } from "@/webgl/stage";
import { getStoryStatus, subscribeStoryStatus } from "@/webgl/story/store";

/**
 * Grande image d'une histoire. Même nom de transition que la carte de la galerie : au clic,
 * l'image « s'ouvre » et grandit jusqu'à sa place (View Transitions). Avec WebGL, le scan
 * en bronze prend ensuite le relais en temps réel ; l'image fixe reste le repli.
 */
export function StoryVisual({
  slug,
  visual,
  model,
  patine,
  legend,
}: {
  slug: string;
  visual: VisualAsset;
  /** Adresse du modèle 3D (GLB) à afficher en temps réel. */
  model?: string;
  patine: Patine;
  legend?: string;
}) {
  const section = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  useRegisterStory(section, box, model, patine);
  const stage = useStage();
  const status = useSyncExternalStore(subscribeStoryStatus, getStoryStatus, () => "idle" as const);
  const live = Boolean(model) && stage.webgl === "ready" && status === "ready";

  return (
    <div ref={section} className="story-visual" data-live={live ? "" : undefined}>
      <ViewTransition name={`histoire-${slug}`} share="morph" default="none">
        <div ref={box} className="story-visual__box">
          <Visual asset={visual} ratio="portrait" priority labels={false} />
        </div>
      </ViewTransition>
      {model && (
        <p className="touch-hint mt-3 font-mono text-xs leading-relaxed text-ink">
          {site.touch.turn}
        </p>
      )}
      {legend && <p className="mt-3 font-mono text-xs leading-relaxed text-ink-muted">{legend}</p>}
    </div>
  );
}

/** Image de carte (galerie) : même nom de transition que la grande image de l'histoire. */
export function StoryThumb({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <ViewTransition name={`histoire-${slug}`} share="morph" default="none">
      <div className="gallery-media">{children}</div>
    </ViewTransition>
  );
}
