"use client";

import { Component, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCalmMode, useHighContrast } from "@/lib/preferences";
import { readStorage } from "@/lib/storage";
import { detectQuality, markDegraded, QUALITY_KEYS, type Quality } from "@/webgl/quality";
import { getScenes, subscribeScenes } from "@/webgl/scenes";
import { setStage } from "@/webgl/stage";

// three.js n'est jamais dans le bundle initial : chargé après le premier affichage.
const WebGLRoot = dynamic(() => import("@/webgl/WebGLRoot"), { ssr: false });

const hasScene = () => Object.values(getScenes()).some(Boolean);

function goStatic() {
  document.documentElement.dataset.webgl = "off";
  setStage({ webgl: "off" });
}

/**
 * Toute erreur du canvas (modèle ou HDR introuvable, contexte refusé, morceau de code qui
 * ne se charge pas) reste confinée ici : le site passe en version statique pour la
 * session, au lieu d'afficher une page d'erreur.
 */
class WebGLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    console.warn("[monbronze] WebGL désactivé :", error);
    markDegraded();
    goStatic();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Décide si le canvas persistant est monté (BRIEF.md §3.6 et §3.7) :
 * - seulement quand une page a enregistré une scène (pas de three.js sur les autres pages) ;
 *   une fois monté, il PERSISTE d'une page à l'autre ;
 * - jamais en mouvement réduit, en « Expérience allégée », en contraste élevé ou en
 *   couleurs forcées (visuels statiques) ;
 * - jamais si l'appareil est au niveau « off » (voir webgl/quality.ts) ;
 * - jamais sur /lab, qui a son propre canvas de réglage, ni sur /admin (aperçu des modèles).
 * La détection n'a lieu qu'une fois, quand le navigateur est inactif : le H1 HTML
 * s'affiche d'abord.
 */
export function WebGLMount() {
  const calm = useCalmMode();
  const contrast = useHighContrast();
  const pathname = usePathname();
  const sceneWanted = useSyncExternalStore(subscribeScenes, hasScene, () => false);
  const [quality, setQuality] = useState<Quality | null>(null);
  const disabled = calm || contrast;

  useEffect(() => {
    if (disabled) {
      goStatic();
      return;
    }
    if (quality !== null || !sceneWanted) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(
      () => {
        const q = detectQuality();
        setQuality(q);
        if (q === "off") goStatic();
      },
      { timeout: 1200 } as IdleRequestOptions,
    );
    return () => cancel(id as number);
  }, [disabled, sceneWanted, quality]);

  const onDegrade = useCallback(() => {
    // WebGL forcé (tests en rendu logiciel) : pas de rétrogradation.
    if (readStorage(QUALITY_KEYS.force) === "1") return;
    // Images trop lentes ou shader invalide : version statique pour la session.
    markDegraded();
    setQuality("off");
    goStatic();
  }, []);

  if (
    disabled ||
    !quality ||
    quality === "off" ||
    pathname === "/lab" ||
    pathname.startsWith("/admin")
  )
    return null;
  return (
    <WebGLBoundary>
      <WebGLRoot quality={quality} onDegrade={onDegrade} />
    </WebGLBoundary>
  );
}
