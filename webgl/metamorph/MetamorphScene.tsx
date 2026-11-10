"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Quality } from "@/webgl/quality";
import type { MetamorphRegistration } from "@/webgl/scenes";
import { reportLoad } from "@/webgl/stage";
import {
  getMetamorphProgress,
  metamorphChangedAt,
  setMetamorphStatus,
} from "@/webgl/metamorph/store";
import { STEP_COUNT, stateAt } from "@/webgl/metamorph/timeline";
import { PATINA_PRESETS } from "@/webgl/materials/patinas";
import {
  createHaloMaterial,
  createLaserMaterial,
  createMetamorphMaterial,
  createPointsMaterial,
  createStreamMaterial,
  createWireMaterial,
  type MetamorphMaterial,
} from "@/webgl/materials/metamorph";
import { Sculpture } from "@/webgl/scene/Sculpture";
import { usePointCloud, useWireGeometry } from "@/webgl/metamorph/geometry";

function Loaded() {
  useEffect(() => {
    reportLoad("model", 1);
    setMetamorphStatus("ready");
  }, []);
  return null;
}

function Contents({
  reg,
  quality,
  demand,
}: {
  reg: MetamorphRegistration;
  quality: Quality;
  demand: React.RefObject<() => boolean>;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const wireGeometry = useWireGeometry();
  const { cloud, positions, byY } = usePointCloud(quality === "high" ? 36000 : 16000);

  const solid = useMemo<MetamorphMaterial>(() => createMetamorphMaterial(), []);
  const wire = useMemo(() => createWireMaterial(), []);
  const points = useMemo(() => createPointsMaterial(), []);
  const halo = useMemo(() => createHaloMaterial(), []);
  const laser = useMemo(() => createLaserMaterial(), []);
  const stream = useMemo(() => createStreamMaterial(), []);
  const nozzleMaterial = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,248,230,1)");
    grad.addColorStop(0.25, "rgba(255,170,90,0.9)");
    grad.addColorStop(1, "rgba(255,90,30,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
  }, []);

  useEffect(
    () => () => {
      [solid, wire, points, halo, laser, stream, nozzleMaterial].forEach((m) => m.dispose());
      nozzleMaterial.map?.dispose();
    },
    [solid, wire, points, halo, laser, stream, nozzleMaterial],
  );

  const placement = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const solidGroup = useRef<THREE.Group>(null);
  const wireMesh = useRef<THREE.Mesh>(null);
  const cloudPoints = useRef<THREE.Points>(null);
  const laserMesh = useRef<THREE.Mesh>(null);
  const haloMesh = useRef<THREE.Mesh>(null);
  const streamMesh = useRef<THREE.Mesh>(null);
  const nozzle = useRef<THREE.Sprite>(null);
  const u = useRef(0);
  const started = useRef(false);
  const lastRect = useRef("");
  const animating = useRef(true);
  const target = PATINA_PRESETS["brun-medaille"];

  // Compilation des shaders dès le montage (en parallèle si le pilote le permet) : sans
  // cela, la première apparition du solide figerait le défilement le temps de compiler.
  useEffect(() => {
    gl.compileAsync(scene, camera).catch(() => undefined);
  }, [gl, scene, camera]);

  // Rendu à la demande : défilement, animations en cours (laser, métal chaud).
  useEffect(() => {
    demand.current = () => {
      const r = reg.visual.getBoundingClientRect();
      const key = `${r.left},${r.top},${r.width},${r.height},${window.innerWidth},${window.innerHeight}`;
      return (
        animating.current ||
        performance.now() - metamorphChangedAt() < 1200 ||
        key !== lastRect.current
      );
    };
    return () => {
      demand.current = () => true;
    };
  }, [demand, reg]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const goal = getMetamorphProgress() * STEP_COUNT;
    // Lissage léger (Lenis lisse déjà) : aucun saut, même au défilement arrière rapide.
    // Premier rendu ou retour après une pause : on se cale directement (pas de rattrapage).
    if (delta > 0.1 || !started.current) u.current = goal;
    started.current = true;
    u.current += (goal - u.current) * (1 - Math.exp(-dt * 9));
    if (Math.abs(goal - u.current) < 1e-4) u.current = goal;
    const s = stateAt(u.current);
    const time = state.clock.elapsedTime;
    // Le métal chaud ondule au plus 5 s après le dernier défilement (WCAG 2.2.2).
    const recent = performance.now() - metamorphChangedAt() < 5000;
    animating.current =
      Math.abs(goal - u.current) > 1e-4 || ((s.heat > 0.01 || s.stream > 0.01) && recent);

    // Solide : impression, cire, métal en fusion, puis patine qui se développe.
    const mu = solid.userData.uniforms;
    const mm = solid.userData.metamorph;
    mm.uPrintLevel.value = s.printLevel;
    mm.uPrinting.value = s.printing;
    mm.uWax.value = s.wax;
    mm.uMoltenFront.value = s.moltenFront;
    mu.uHeat.value = s.heat;
    mu.uTime.value = time;
    mu.uCoverage.value = target.coverage * s.patina;
    // Métal chaud : pas de vernis (son reflet blanc délaverait l'incandescence).
    solid.clearcoat = Math.max(0.001, target.clearcoat * (1 - s.heat));
    if (solidGroup.current) solidGroup.current.visible = s.printLevel > -0.56;

    // Filaire et points.
    wire.uniforms.uWire!.value = s.wire;
    wire.uniforms.uLevel!.value = s.printLevel;
    if (wireMesh.current) wireMesh.current.visible = s.wire > 0.002;
    const scan = s.scan;
    points.uniforms.uPoints!.value = s.points;
    points.uniforms.uScan!.value = scan;
    points.uniforms.uPixelRatio!.value = dpr;
    if (cloudPoints.current) cloudPoints.current.visible = s.points > 0.002;
    laser.uniforms.uOpacity!.value = s.points;
    if (laserMesh.current) {
      laserMesh.current.visible = s.points > 0.002;
      laserMesh.current.position.y = scan;
    }
    halo.uniforms.uHeat!.value = s.heat;
    stream.uniforms.uOpacity!.value = s.stream;
    stream.uniforms.uTime!.value = time;
    if (streamMesh.current) streamMesh.current.visible = s.stream > 0.002;
    if (haloMesh.current) haloMesh.current.visible = s.heat > 0.002;

    // Buse : point lumineux qui tourne autour de la pièce, au front d'impression.
    if (nozzle.current) {
      nozzle.current.visible = s.printing > 0;
      if (s.printing > 0) {
        const angle = (s.printLevel + 0.56) * 260;
        let lo = 0;
        let hi = byY.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (positions[byY[mid]! * 3 + 1]! < s.printLevel) lo = mid + 1;
          else hi = mid;
        }
        let best = byY[lo] ?? 0;
        let bestD = Infinity;
        const wanted = (angle % (Math.PI * 2)) - Math.PI;
        for (let k = Math.max(0, lo - 120); k < Math.min(byY.length, lo + 120); k++) {
          const i = byY[k]!;
          const raw = Math.abs(Math.atan2(positions[i * 3 + 2]!, positions[i * 3]!) - wanted);
          const d = Math.min(raw, Math.PI * 2 - raw);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        nozzle.current.position.set(positions[best * 3]!, s.printLevel, positions[best * 3 + 2]!);
      }
    }

    // Placement : la sculpture se cale sur la boîte CSS de la scène épinglée.
    const r = reg.visual.getBoundingClientRect();
    lastRect.current = `${r.left},${r.top},${r.width},${r.height},${window.innerWidth},${window.innerHeight}`;
    const vw = size.width;
    const vh = size.height;
    const visibleH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visibleW = visibleH * camera.aspect;
    if (placement.current) {
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      placement.current.position.set((cx / vw - 0.5) * visibleW, (0.5 - cy / vh) * visibleH, 0);
      placement.current.scale.setScalar((r.height / vh) * visibleH);
      placement.current.visible = r.bottom > -vh * 0.2 && r.top < vh * 1.2;
    }
    // Rotation liée au défilement (réversible) : la pièce se présente sous plusieurs angles.
    if (spin.current) spin.current.rotation.y = -0.55 + u.current * 0.22;
  });

  return (
    <group ref={placement}>
      <mesh ref={haloMesh} position={[0, 0.05, -0.4]} material={halo}>
        <planeGeometry args={[1.8, 1.8]} />
      </mesh>
      <mesh ref={streamMesh} position={[0, 1.05, 0.05]} material={stream} renderOrder={5}>
        <planeGeometry args={[0.05, 1.2]} />
      </mesh>
      <mesh ref={laserMesh} material={laser}>
        <planeGeometry args={[1.05, 0.02]} />
      </mesh>
      <group ref={spin}>
        <group ref={solidGroup}>
          <Sculpture id="buste-romain" material={solid} />
        </group>
        <mesh ref={wireMesh} geometry={wireGeometry} material={wire} renderOrder={2} />
        <points ref={cloudPoints} geometry={cloud} material={points} renderOrder={3} />
        <sprite ref={nozzle} material={nozzleMaterial} scale={[0.12, 0.12, 1]} renderOrder={4} />
      </group>
      <Loaded />
    </group>
  );
}

/** Scène « Métamorphose » (BRIEF.md §3.4) : une seule sculpture, cinq états fondus. */
export function MetamorphScene({
  reg,
  quality,
  onVisibility,
  demand,
}: {
  reg: MetamorphRegistration;
  quality: Quality;
  onVisibility: (visible: boolean) => void;
  demand: React.RefObject<() => boolean>;
}) {
  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => onVisibility(Boolean(entry?.isIntersecting)), {
      threshold: 0,
      rootMargin: "20% 0px",
    });
    io.observe(reg.section);
    return () => {
      io.disconnect();
      onVisibility(false);
    };
  }, [reg, onVisibility]);

  return (
    <Suspense fallback={null}>
      <Contents reg={reg} quality={quality} demand={demand} />
    </Suspense>
  );
}
