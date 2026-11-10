"use client";

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gsap } from "gsap";
import { maxDpr, type Quality } from "@/webgl/quality";
import { getScenes, subscribeScenes } from "@/webgl/scenes";
import { getStage, reportLoad, setStage, useStage } from "@/webgl/stage";
import { setMetamorphStatus } from "@/webgl/metamorph/store";
import { HeroScene } from "@/webgl/hero/HeroScene";
import { MetamorphScene } from "@/webgl/metamorph/MetamorphScene";
import { ConfiguratorScene } from "@/webgl/configurator/ConfiguratorScene";
import { setConfiguratorStatus } from "@/webgl/configurator/store";
import { StoryScene } from "@/webgl/story/StoryScene";
import { Studio } from "@/webgl/scene/Studio";

reportLoad("engine", 1);

/**
 * Horloge unique (BRIEF.md §3.6) : gsap.ticker pilote Lenis (components/layout/Experience),
 * ScrollTrigger, puis le rendu R3F (frameloop « never » + advance). Le rendu ne tourne que
 * si une scène est active, visible, le demande, et que l'onglet est au premier plan.
 */
function Clock({
  active,
  onDegrade,
}: {
  active: React.RefObject<() => boolean>;
  onDegrade: () => void;
}) {
  const advance = useThree((s) => s.advance);
  const degradeRef = useRef(onDegrade);
  useEffect(() => {
    degradeRef.current = onDegrade;
  }, [onDegrade]);

  useEffect(() => {
    // Garde-fou (BRIEF.md §3.7, niveau « bas ») : mesuré seulement une fois tout chargé,
    // après 1 s de chauffe ; deux fenêtres de suite sous 15 i/s → version statique.
    let since = 0;
    let frames = 0;
    let windowStart = 0;
    let bad = 0;
    let degraded = false;
    const tick = () => {
      if (document.visibilityState !== "visible" || !active.current()) {
        since = 0;
        return;
      }
      const now = performance.now();
      // Horodatage en secondes : R3F en déduit le delta passé à useFrame.
      advance(now / 1000);
      if (getStage().progress < 0.999) return;
      if (!since) {
        since = now;
        windowStart = now + 1000;
        frames = 0;
        return;
      }
      if (now < windowStart) return;
      frames++;
      if (now - windowStart >= 1500) {
        const fps = (frames * 1000) / (now - windowStart);
        bad = fps < 15 ? bad + 1 : 0;
        if (bad >= 2 && !degraded) {
          degraded = true;
          degradeRef.current();
        }
        windowStart = now;
        frames = 0;
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [advance, active]);
  return null;
}

/** Une scène secondaire en erreur (modèle introuvable…) ne coupe pas tout le WebGL. */
class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    console.warn("[monbronze] scène désactivée :", error);
    this.props.onError();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

function EnvironmentLoaded() {
  useEffect(() => reportLoad("environment", 1), []);
  return null;
}

export default function WebGLRoot({
  quality,
  onDegrade,
}: {
  quality: Quality;
  onDegrade: () => void;
}) {
  const scenes = useSyncExternalStore(subscribeScenes, getScenes, getScenes);
  const stage = useStage();
  // Les calculs de la métamorphose (échantillonnage, compilation) attendent la fin de la
  // coulée de l'accueil, pour ne pas la saccader.
  const metamorphAllowed = !scenes.hero || stage.intro === "done";
  // Chaque scène signale sa visibilité et dit si elle a besoin d'une image.
  const heroVisible = useRef(false);
  const heroDemand = useRef<() => boolean>(() => true);
  const metamorphVisible = useRef(false);
  const metamorphDemand = useRef<() => boolean>(() => true);
  const configuratorVisible = useRef(false);
  const configuratorDemand = useRef<() => boolean>(() => true);
  const storyVisible = useRef(false);
  const storyDemand = useRef<() => boolean>(() => true);
  const active = useRef(() => {
    const s = getScenes();
    return (
      (Boolean(s.hero) && heroVisible.current && heroDemand.current()) ||
      (Boolean(s.metamorph) && metamorphVisible.current && metamorphDemand.current()) ||
      (Boolean(s.configurator) && configuratorVisible.current && configuratorDemand.current()) ||
      (Boolean(s.story) && storyVisible.current && storyDemand.current())
    );
  });
  const degradeRef = useRef(onDegrade);
  useEffect(() => {
    degradeRef.current = onDegrade;
  }, [onDegrade]);
  const onHeroVisibility = useCallback((v: boolean) => {
    heroVisible.current = v;
  }, []);
  const onMetamorphVisibility = useCallback((v: boolean) => {
    metamorphVisible.current = v;
  }, []);
  const onConfiguratorVisibility = useCallback((v: boolean) => {
    configuratorVisible.current = v;
  }, []);
  const onStoryVisibility = useCallback((v: boolean) => {
    storyVisible.current = v;
  }, []);

  useEffect(() => {
    // Mise en place ET nettoyage (StrictMode rejoue les deux en développement).
    document.documentElement.dataset.webgl = "loading";
    setStage({ webgl: "loading" });
    return () => {
      document.documentElement.dataset.webgl = "off";
      setStage({ webgl: "off" });
    };
  }, []);

  return (
    <div aria-hidden="true" className="webgl-root">
      <Canvas
        frameloop="never"
        dpr={[1, maxDpr(quality)]}
        camera={{ position: [0, 0, 4], fov: 30, near: 0.1, far: 50 }}
        gl={{
          antialias: quality === "high",
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.AgXToneMapping,
          toneMappingExposure: 1.15,
        }}
        onCreated={(state) => {
          state.gl.domElement.setAttribute("aria-hidden", "true");
          state.gl.setClearColor("#0e0d0c", 1);
          // Shader qui ne compile pas : rien ne serait peint → version statique.
          state.gl.debug.onShaderError = () => degradeRef.current();
          // Contexte WebGL perdu : le titre reprend aussitôt son rendu HTML normal.
          state.gl.domElement.addEventListener("webglcontextlost", () => {
            document.documentElement.dataset.webgl = "off";
            setStage({ webgl: "off" });
          });
        }}
        style={{ pointerEvents: "none" }}
      >
        <Clock active={active} onDegrade={onDegrade} />
        {/* Éclairage partagé par toutes les scènes, gardé d'une page à l'autre. */}
        <Suspense fallback={null}>
          <Studio env="studio" intensity={0.6} resolution={quality === "high" ? 256 : 128} />
          <EnvironmentLoaded />
        </Suspense>
        {/* Lumière principale courte et contre-jour : le bronze se détache du charbon. */}
        <directionalLight position={[2.5, 3, 3]} intensity={2.4} color="#fff8f0" />
        <directionalLight position={[-3, 1.5, -2]} intensity={1.6} color="#ffffff" />
        <Suspense fallback={null}>
          {scenes.hero && (
            <HeroScene
              key={scenes.hero.section.dataset.heroId ?? "hero"}
              hero={scenes.hero}
              quality={quality}
              demand={heroDemand}
              onVisibility={onHeroVisibility}
            />
          )}
        </Suspense>
        <Suspense fallback={null}>
          {scenes.story && (
            <SceneBoundary onError={() => undefined}>
              <StoryScene
                key={scenes.story.model + scenes.story.patine}
                reg={scenes.story}
                demand={storyDemand}
                onVisibility={onStoryVisibility}
              />
            </SceneBoundary>
          )}
          {scenes.configurator && metamorphAllowed && (
            <SceneBoundary onError={() => setConfiguratorStatus("failed")}>
              <ConfiguratorScene
                reg={scenes.configurator}
                quality={quality}
                demand={configuratorDemand}
                onVisibility={onConfiguratorVisibility}
              />
            </SceneBoundary>
          )}
          {scenes.metamorph && metamorphAllowed && (
            <SceneBoundary onError={() => setMetamorphStatus("failed")}>
              <MetamorphScene
                reg={scenes.metamorph}
                quality={quality}
                demand={metamorphDemand}
                onVisibility={onMetamorphVisibility}
              />
            </SceneBoundary>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
