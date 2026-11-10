"use client";

import {
  memo,
  Suspense,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { ModelId, Patine } from "@/content/assets";
import { applyPatina, createBronzeMaterial, PATINA_PRESETS } from "@/webgl/materials/bronze";
import { Sculpture } from "@/webgl/scene/Sculpture";
import { Studio, type StudioEnv } from "@/webgl/scene/Studio";

export type ToneMappingMode = "neutral" | "agx" | "aces";

export type LabSettings = {
  model: ModelId;
  patine: Patine;
  cavityLo: number;
  cavityHi: number;
  polishLo: number;
  polishHi: number;
  noise: number;
  deep: number;
  metalRoughness: number;
  patinaRoughness: number;
  exposure: number;
  env: number;
  envMap: StudioEnv;
  rakeAngle: number;
  rakeIntensity: number;
  toneMapping: ToneMappingMode;
  autoRotate: boolean;
  /** Angle de vue (degrés) : alternative au glisser (WCAG 2.5.7), utilisé sans rotation auto. */
  viewAngle: number;
  debugCavity: boolean;
  /** Sol et ombre de contact (désactivés pour produire une image détourée). */
  floor: boolean;
};

const TONE_MAPPING: Record<ToneMappingMode, THREE.ToneMapping> = {
  neutral: THREE.NeutralToneMapping,
  agx: THREE.AgXToneMapping,
  aces: THREE.ACESFilmicToneMapping,
};

/** Lumière rasante : directionnelle, basse, qui tourne autour de la sculpture. */
function RakingLight({ angle, intensity }: { angle: number; intensity: number }) {
  const rad = THREE.MathUtils.degToRad(angle);
  return (
    <directionalLight
      position={[Math.cos(rad) * 3, 0.9, Math.sin(rad) * 3]}
      intensity={intensity}
      color="#fff8f0"
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-camera-left={-1}
      shadow-camera-right={1}
      shadow-camera-top={1}
      shadow-camera-bottom={-1}
    />
  );
}

/**
 * Rendu des tons et intensité de l'environnement, posés directement sur le renderer et
 * la scène (three suit déjà le tone mapping par matériau : aucune recompilation forcée).
 */
function Renderer({
  toneMapping,
  exposure,
  envIntensity,
}: {
  toneMapping: ToneMappingMode;
  exposure: number;
  envIntensity: number;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    gl.toneMapping = TONE_MAPPING[toneMapping];
    gl.toneMappingExposure = exposure;
    scene.environmentIntensity = envIntensity;
  }, [gl, scene, toneMapping, exposure, envIntensity]);
  return null;
}

/** Le studio ne dépend que du HDR choisi : sinon drei recalculerait la carte à chaque réglage. */
const StableStudio = memo(function StableStudio({ env }: { env: StudioEnv }) {
  return <Studio env={env} intensity={1} />;
});

/** Modèle affiché : changement différé pour garder l'ancien visible pendant le chargement. */
function DeferredSculpture({
  model,
  material,
  autoRotate,
  viewAngle,
}: {
  model: ModelId;
  material: ReturnType<typeof createBronzeMaterial>;
  autoRotate: boolean;
  viewAngle: number;
}) {
  const deferred = useDeferredValue(model);
  return (
    <group rotation-y={autoRotate ? 0 : THREE.MathUtils.degToRad(viewAngle)}>
      <Sculpture id={deferred} material={material} autoRotate={autoRotate} rotationSpeed={0.12} />
    </group>
  );
}

/** Compteur d'images par seconde (moyenne sur 0,5 s), sans rendu React. */
function FpsMeter({ target }: { target: React.RefObject<HTMLElement | null> }) {
  const acc = useRef({ frames: 0, time: 0 });
  useFrame((_, delta) => {
    const a = acc.current;
    a.frames++;
    a.time += delta;
    if (a.time >= 0.5) {
      const fps = a.frames / a.time;
      if (target.current) target.current.textContent = fps.toFixed(0);
      (window as unknown as { __monbronzeLab?: { fps: number } }).__monbronzeLab = { fps };
      a.frames = 0;
      a.time = 0;
    }
  });
  return null;
}

/** Texture de fondu radial (centre opaque, bord transparent) pour le sol. */
function radialAlpha() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x / (size - 1) - 0.5, y / (size - 1) - 0.5) * 2;
      const a = Math.round(255 * Math.max(0, 1 - THREE.MathUtils.smoothstep(d, 0.35, 1)));
      data.set([a, a, a, 255], (y * size + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

export default function LabScene({
  settings,
  fpsTarget,
}: {
  settings: LabSettings;
  fpsTarget: React.RefObject<HTMLElement | null>;
}) {
  // Un seul matériau : changer de patine ne recompile rien. Pas de dispose au démontage :
  // Next 16 garde la page masquée (Activity) et la réaffiche ; le matériau doit survivre.
  const material = useMemo(() => createBronzeMaterial(), []);
  const floorAlpha = useMemo(() => radialAlpha(), []);
  const root = useRef<RootState | null>(null);

  // Activity (page masquée après navigation) démonte les effets : on suspend alors la boucle
  // de rendu, sinon le canvas caché continuerait de tourner à 60 i/s.
  useLayoutEffect(() => {
    root.current?.setFrameloop("always");
    return () => root.current?.setFrameloop("never");
  }, []);

  // Réglages fins : appliqués aux uniformes, sans recompiler.
  useEffect(() => {
    const u = material.userData.uniforms;
    applyPatina(material, PATINA_PRESETS[settings.patine]);
    u.uCavityLo.value = settings.cavityLo;
    u.uCavityHi.value = settings.cavityHi;
    u.uPolishLo.value = settings.polishLo;
    u.uPolishHi.value = settings.polishHi;
    u.uNoiseAmount.value = settings.noise;
    u.uDeepDarken.value = settings.deep;
    u.uMetalRoughness.value = settings.metalRoughness;
    u.uPatinaRoughness.value = settings.patinaRoughness;
    u.uDebugCavity.value = settings.debugCavity ? 1 : 0;
  }, [material, settings]);

  // Sur écran tactile, pas d'OrbitControls : ils bloqueraient le défilement de la page.
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  return (
    <Canvas
      aria-hidden="true"
      shadows="percentage"
      // Densité plafonnée à 1,75 : net sur écran Retina, environ 23 % de pixels en moins qu'à 2.
      dpr={[1, 1.75]}
      // Focale « portrait » (≈ 100 mm) : compression flatteuse, peu de déformation.
      camera={{ position: [0, 0.2, 4], fov: 18, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={(state) => {
        root.current = state;
        // R3F place aria-hidden sur le conteneur : on le pose aussi sur le <canvas> (BRIEF.md §3.7).
        state.gl.domElement.setAttribute("aria-hidden", "true");
      }}
    >
      <Renderer
        toneMapping={settings.toneMapping}
        exposure={settings.exposure}
        envIntensity={settings.env}
      />
      <Suspense fallback={null}>
        <StableStudio env={settings.envMap} />
      </Suspense>
      <Suspense fallback={null}>
        <DeferredSculpture
          model={settings.model}
          material={material}
          autoRotate={settings.autoRotate}
          viewAngle={settings.viewAngle}
        />
        {/* Ombre de contact calculée une fois, après le chargement du modèle (le socle est
            rond : la rotation ne la change pas). Remontée à chaque changement de modèle. */}
        {settings.floor && (
          <ContactShadows
            key={settings.model}
            frames={1}
            position={[0, -0.499, 0]}
            opacity={0.9}
            scale={2.4}
            blur={1.2}
            far={0.35}
            resolution={512}
            color="#000000"
          />
        )}
      </Suspense>
      <RakingLight angle={settings.rakeAngle} intensity={settings.rakeIntensity} />
      {/* Sol d'atelier : reçoit l'ombre de la lumière rasante, fondu radial vers le fond. */}
      {settings.floor && (
        <mesh rotation-x={-Math.PI / 2} position-y={-0.501} receiveShadow>
          <circleGeometry args={[1.4, 96]} />
          <meshStandardMaterial color="#141210" roughness={0.9} transparent alphaMap={floorAlpha} />
        </mesh>
      )}
      {!coarse && (
        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={7}
          maxPolarAngle={Math.PI * 0.55}
          target={[0, 0, 0]}
          makeDefault
        />
      )}
      <FpsMeter target={fpsTarget} />
    </Canvas>
  );
}
