"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Quality } from "@/webgl/quality";
import type { ConfiguratorRegistration } from "@/webgl/scenes";
import { applyPatina, lerpPatina, PATINA_PRESETS } from "@/webgl/materials/bronze";
import type { PatinaPreset } from "@/webgl/materials/patinas";
import {
  createMetamorphMaterial,
  createPointsMaterial,
  createWireMaterial,
} from "@/webgl/materials/metamorph";
import { usePointCloud, useWireGeometry } from "@/webgl/metamorph/geometry";
import {
  configuratorChangedAt,
  getConfiguratorPatine,
  getLook,
  setConfiguratorStatus,
  type Look,
} from "@/webgl/configurator/store";
import { Sculpture } from "@/webgl/scene/Sculpture";
import { bindTouchTurn } from "@/webgl/touchTurn";

/** Aspect de chaque « source » (BRIEF.md §6.1-3) : la sculpture prend la matière du modèle. */
const LOOKS: Record<
  Look,
  {
    solid: number;
    wire: number;
    points: number;
    matter: number;
    layer: number;
    color: [number, number, number];
  }
> = {
  bronze: { solid: 1, wire: 0, points: 0, matter: 0, layer: 0, color: [0.24, 0.235, 0.22] },
  // Une sculpture existante : plâtre.
  sculpture: { solid: 1, wire: 0, points: 0, matter: 1, layer: 0, color: [0.42, 0.41, 0.39] },
  // Un objet : terre cuite.
  objet: { solid: 1, wire: 0, points: 0, matter: 1, layer: 0, color: [0.3, 0.12, 0.05] },
  // Un fichier numérique : maillage filaire.
  fichier: { solid: 0, wire: 1, points: 0, matter: 0, layer: 0, color: [0.24, 0.235, 0.22] },
  // Des photographies : nuage de points (photogrammétrie).
  photos: { solid: 0, wire: 0, points: 1, matter: 0, layer: 0, color: [0.24, 0.235, 0.22] },
  // Une impression 3D : couches visibles.
  impression: { solid: 1, wire: 0, points: 0, matter: 1, layer: 1, color: [0.24, 0.235, 0.22] },
};

const LOOK_COLORS = Object.fromEntries(
  Object.entries(LOOKS).map(([k, v]) => [k, new THREE.Color(...v.color)]),
) as Record<Look, THREE.Color>;

function Contents({
  reg,
  quality,
  demand,
  visible,
}: {
  reg: ConfiguratorRegistration;
  quality: Quality;
  demand: React.RefObject<() => boolean>;
  visible: React.RefObject<boolean>;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const wireGeometry = useWireGeometry();
  const { cloud } = usePointCloud(quality === "high" ? 36000 : 16000);
  const solid = useMemo(() => createMetamorphMaterial(), []);
  const wire = useMemo(() => createWireMaterial(), []);
  const points = useMemo(() => createPointsMaterial(), []);
  useEffect(() => () => [solid, wire, points].forEach((m) => m.dispose()), [solid, wire, points]);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    gl.compileAsync(scene, camera).catch(() => undefined);
    setConfiguratorStatus("ready");
    return () => setConfiguratorStatus("idle");
  }, [gl, scene, camera]);

  const placement = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const wireMesh = useRef<THREE.Mesh>(null);
  const cloudPoints = useRef<THREE.Points>(null);
  const current = useRef({ solid: 1, wire: 0, points: 0, matter: 0, layer: 0 });
  const color = useRef(new THREE.Color(0.24, 0.235, 0.22));
  const patina = useRef<PatinaPreset>({ ...PATINA_PRESETS["brun-medaille"] });
  const pointerX = useRef(0);
  const pointerAt = useRef(0);
  const lastRect = useRef("");
  const settling = useRef(true);

  // Lumière et rotation suivent le pointeur (aucun mouvement perpétuel).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      pointerX.current = e.clientX / window.innerWidth - 0.5;
      pointerAt.current = performance.now();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Écran tactile : la sculpture se tourne du doigt (glissement horizontal sur sa boîte).
  useEffect(
    () =>
      bindTouchTurn(reg.visual, (value) => {
        pointerX.current = value;
        pointerAt.current = performance.now();
      }),
    [reg],
  );

  useEffect(() => {
    demand.current = () => {
      const r = reg.visual.getBoundingClientRect();
      const key = `${r.left},${r.top},${r.width},${r.height},${window.innerWidth},${window.innerHeight}`;
      return (
        settling.current ||
        performance.now() - configuratorChangedAt() < 1500 ||
        performance.now() - pointerAt.current < 1200 ||
        key !== lastRect.current
      );
    };
    return () => {
      demand.current = () => true;
    };
  }, [demand, reg]);

  const solidGroup = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    // Section hors écran : rien à calculer (le canvas peut rendre une autre scène).
    if (!visible.current) {
      if (placement.current) placement.current.visible = false;
      return;
    }
    const dt = Math.min(delta, 1 / 30);
    const k = 1 - Math.exp(-dt * 6);
    const target = LOOKS[getLook()];
    const c = current.current;
    let moving = false;
    for (const key of ["solid", "wire", "points", "matter", "layer"] as const) {
      const d = target[key] - c[key];
      if (Math.abs(d) > 0.002) moving = true;
      c[key] += d * k;
    }
    color.current.lerp(LOOK_COLORS[getLook()], k);
    // Patine : fondu vers la patine choisie (seulement tant qu'elle change).
    const goal = PATINA_PRESETS[getConfiguratorPatine()];
    if (patina.current !== goal) {
      const next = lerpPatina(patina.current, goal, k);
      const done = Math.abs(next.coverage - goal.coverage) < 0.002 && next.metal === goal.metal;
      patina.current = done ? goal : next;
      applyPatina(solid, patina.current);
      if (!done) moving = true;
    }

    // Le solide se « dé-imprime » de haut en bas quand une autre matière prend le relais.
    const mm = solid.userData.metamorph;
    mm.uPrintLevel.value = -0.61 + 1.22 * c.solid;
    mm.uPrinting.value = 0;
    mm.uWax.value = 0;
    mm.uMoltenFront.value = c.matter > 0.001 ? 0.7 : -0.7;
    mm.uPrint.value = c.matter;
    mm.uLayer.value = c.layer;
    mm.uPlaColor.value.copy(color.current);
    // Avant que la matière « source » ne disparaisse, le métal doit être sous le front.
    if (c.matter > 0.001) mm.uMoltenFront.value = 0.7;
    wire.uniforms.uWire!.value = c.wire;
    wire.uniforms.uLevel!.value = -0.61 + 1.22 * c.solid;
    if (wireMesh.current) wireMesh.current.visible = c.wire > 0.002;
    if (solidGroup.current) solidGroup.current.visible = c.solid > 0.002;
    points.uniforms.uPoints!.value = c.points;
    points.uniforms.uScan!.value = -2;
    points.uniforms.uPixelRatio!.value = dpr;
    if (cloudPoints.current) cloudPoints.current.visible = c.points > 0.002;

    // Placement : la sculpture se cale sur la boîte CSS du configurateur.
    const r = reg.visual.getBoundingClientRect();
    lastRect.current = `${r.left},${r.top},${r.width},${r.height},${window.innerWidth},${window.innerHeight}`;
    const visibleH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visibleW = visibleH * camera.aspect;
    if (placement.current) {
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      placement.current.position.set(
        (cx / size.width - 0.5) * visibleW,
        (0.5 - cy / size.height) * visibleH,
        0,
      );
      placement.current.scale.setScalar(((r.height * 0.86) / size.height) * visibleH);
      placement.current.visible = r.bottom > -size.height * 0.2 && r.top < size.height * 1.2;
    }
    if (spin.current) {
      // Rotation liée au défilement et au pointeur (réversible, jamais automatique).
      const scroll = (r.top + r.height / 2) / size.height;
      const goalY = -0.4 + scroll * 0.9 + pointerX.current * 0.6;
      spin.current.rotation.y += (goalY - spin.current.rotation.y) * k;
      if (Math.abs(goalY - spin.current.rotation.y) > 1e-3) moving = true;
    }
    settling.current = moving;
  });

  return (
    <group ref={placement}>
      <group ref={spin}>
        <group ref={solidGroup}>
          <Sculpture id="buste-romain" material={solid} />
        </group>
        <mesh ref={wireMesh} geometry={wireGeometry} material={wire} renderOrder={2} />
        <points ref={cloudPoints} geometry={cloud} material={points} renderOrder={3} />
      </group>
    </group>
  );
}

/** Configurateur (BRIEF.md §6.1-3) : la sculpture prend l'aspect de la source, puis la patine. */
export function ConfiguratorScene({
  reg,
  quality,
  onVisibility,
  demand,
}: {
  reg: ConfiguratorRegistration;
  quality: Quality;
  onVisibility: (visible: boolean) => void;
  demand: React.RefObject<() => boolean>;
}) {
  const visible = useRef(false);
  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = Boolean(entry?.isIntersecting);
        onVisibility(visible.current);
      },
      {
        threshold: 0,
        rootMargin: "20% 0px",
      },
    );
    io.observe(reg.section);
    return () => {
      io.disconnect();
      onVisibility(false);
    };
  }, [reg, onVisibility]);
  return (
    <Suspense fallback={null}>
      <Contents reg={reg} quality={quality} demand={demand} visible={visible} />
    </Suspense>
  );
}
