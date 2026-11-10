"use client";

import { useLayoutEffect } from "react";
import type { Patine } from "@/content/assets";

/**
 * Registre des scènes du canvas persistant (BRIEF.md §3.6).
 * Aucune page ne crée de <Canvas> : elle ENREGISTRE sa scène (éléments DOM de référence)
 * dans un layout effect. Quand Next 16 masque la page (Activity), l'effet est nettoyé :
 * la scène se désenregistre et le canvas arrête de rendre.
 */
export type HeroRegistration = {
  section: HTMLElement;
  title: HTMLElement;
  /** Boîte de l'image statique de la sculpture : la sculpture 3D s'y superpose exactement. */
  bust: HTMLElement;
};

/** Métamorphose : section épinglée et boîte CSS où se cale la sculpture. */
export type MetamorphRegistration = {
  section: HTMLElement;
  visual: HTMLElement;
};

/** Configurateur : section et boîte CSS de la sculpture. */
export type ConfiguratorRegistration = MetamorphRegistration;

/** Histoire : boîte de l'image, scan et patine à afficher en temps réel. */
export type StoryRegistration = {
  section: HTMLElement;
  visual: HTMLElement;
  /** Adresse du modèle (GLB), livré avec le code ou envoyé depuis /admin. */
  model: string;
  patine: Patine;
};

export type SceneRegistry = {
  hero: HeroRegistration | null;
  metamorph: MetamorphRegistration | null;
  configurator: ConfiguratorRegistration | null;
  story: StoryRegistration | null;
};

let registry: SceneRegistry = { hero: null, metamorph: null, configurator: null, story: null };
const listeners = new Set<() => void>();

export function getScenes() {
  return registry;
}

export function subscribeScenes(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function set(patch: Partial<SceneRegistry>) {
  registry = { ...registry, ...patch };
  listeners.forEach((l) => l());
}

/** Enregistre la scène d'accueil tant que le composant est monté et visible. */
export function useRegisterHero(
  section: React.RefObject<HTMLElement | null>,
  title: React.RefObject<HTMLElement | null>,
  bust: React.RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const s = section.current;
    const t = title.current;
    const b = bust.current;
    if (!s || !t || !b) return;
    set({ hero: { section: s, title: t, bust: b } });
    // Ne retire que SA scène (une autre instance a pu s'enregistrer entre-temps).
    return () => {
      if (registry.hero?.section === s) set({ hero: null });
    };
  }, [section, title, bust]);
}

/** Enregistre la scène « Métamorphose » tant que la section est montée et visible. */
export function useRegisterMetamorph(
  section: React.RefObject<HTMLElement | null>,
  visual: React.RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const s = section.current;
    const v = visual.current;
    if (!s || !v) return;
    set({ metamorph: { section: s, visual: v } });
    return () => {
      if (registry.metamorph?.section === s) set({ metamorph: null });
    };
  }, [section, visual]);
}

/** Enregistre la scène du configurateur (accueil, « Les possibilités »). */
export function useRegisterConfigurator(
  section: React.RefObject<HTMLElement | null>,
  visual: React.RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const s = section.current;
    const v = visual.current;
    if (!s || !v) return;
    set({ configurator: { section: s, visual: v } });
    return () => {
      if (registry.configurator?.section === s) set({ configurator: null });
    };
  }, [section, visual]);
}

/** Enregistre la scène d'une histoire (page /realisations/[slug]). */
export function useRegisterStory(
  section: React.RefObject<HTMLElement | null>,
  visual: React.RefObject<HTMLElement | null>,
  model: string | undefined,
  patine: Patine,
) {
  useLayoutEffect(() => {
    const s = section.current;
    const v = visual.current;
    if (!s || !v || !model) return;
    set({ story: { section: s, visual: v, model, patine } });
    return () => {
      if (registry.story?.section === s) set({ story: null });
    };
  }, [section, visual, model, patine]);
}
