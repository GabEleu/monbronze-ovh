"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { StoryRegistration } from "@/webgl/scenes";
import { createBronzeMaterial } from "@/webgl/materials/bronze";
import { Sculpture } from "@/webgl/scene/Sculpture";
import { bindTouchTurn } from "@/webgl/touchTurn";
import { setStoryStatus } from "@/webgl/story/store";
import { setStage } from "@/webgl/stage";

/**
 * Page d'une histoire (BRIEF.md §5 et §6.4) : le scan de l'histoire, en bronze et dans sa
 * patine, en temps réel à la place de l'image fixe. Rotation liée au défilement et au
 * pointeur (jamais automatique), rendu à la demande.
 */
function Contents({
  reg,
  demand,
  visible,
}: {
  reg: StoryRegistration;
  demand: React.RefObject<() => boolean>;
  visible: React.RefObject<boolean>;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const material = useMemo(() => createBronzeMaterial(reg.patine), [reg.patine]);
  const placement = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const pointerX = useRef(0);
  const pointerAt = useRef(0);
  const lastRect = useRef("");
  const settling = useRef(true);
  const shown = useRef(false);
  const extent = useRef<{ h: number; xz: number } | null>(null);

  useEffect(() => {
    setStoryStatus("ready");
    return () => {
      setStoryStatus("idle");
      material.dispose();
      if (document.documentElement.dataset.webgl === "ready") {
        document.documentElement.dataset.webgl = "loading";
        setStage({ webgl: "loading" });
      }
    };
  }, [material]);

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
        settling.current || performance.now() - pointerAt.current < 1200 || key !== lastRect.current
      );
    };
    return () => {
      demand.current = () => true;
    };
  }, [demand, reg]);

  useFrame((_, delta) => {
    if (!visible.current) {
      if (placement.current) placement.current.visible = false;
      return;
    }
    const k = 1 - Math.exp(-Math.min(delta, 1 / 30) * 6);
    const r = reg.visual.getBoundingClientRect();
    lastRect.current = `${r.left},${r.top},${r.width},${r.height},${window.innerWidth},${window.innerHeight}`;
    const visibleH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visibleW = visibleH * camera.aspect;
    if (placement.current) {
      placement.current.visible = true;
      placement.current.position.set(
        ((r.left + r.width / 2) / size.width - 0.5) * visibleW,
        (0.5 - (r.top + r.height / 2) / size.height) * visibleH,
        0,
      );
      if (!extent.current && spin.current) {
        const box = new THREE.Box3().setFromObject(spin.current);
        const s3 = box.getSize(new THREE.Vector3());
        // Rotation : on prend la diagonale au sol, la pièce ne sort jamais de sa boîte.
        if (s3.y > 0) extent.current = { h: s3.y, xz: Math.hypot(s3.x, s3.z) };
      }
      const e = extent.current ?? { h: 1, xz: 1 };
      const pxPerUnit = Math.min((r.height * 0.82) / e.h, (r.width * 0.92) / e.xz);
      placement.current.scale.setScalar((pxPerUnit / size.height) * visibleH);
    }
    let moving = false;
    if (spin.current) {
      const scroll = (r.top + r.height / 2) / size.height;
      const goal = -0.35 + scroll * 0.6 + pointerX.current * 0.7;
      spin.current.rotation.y += (goal - spin.current.rotation.y) * k;
      moving = Math.abs(goal - spin.current.rotation.y) > 1e-3;
    }
    settling.current = moving;
    // Première image peinte : le canvas devient visible (comme sur l'accueil).
    if (!shown.current) {
      shown.current = true;
      requestAnimationFrame(() => {
        document.documentElement.dataset.webgl = "ready";
        setStage({ webgl: "ready" });
      });
    }
  });

  return (
    <group ref={placement}>
      <group ref={spin}>
        <Sculpture src={reg.model} material={material} />
      </group>
    </group>
  );
}

export function StoryScene({
  reg,
  onVisibility,
  demand,
}: {
  reg: StoryRegistration;
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
      { threshold: 0, rootMargin: "20% 0px" },
    );
    io.observe(reg.section);
    return () => {
      io.disconnect();
      onVisibility(false);
    };
  }, [reg, onVisibility]);
  return (
    <Suspense fallback={null}>
      <Contents reg={reg} demand={demand} visible={visible} />
    </Suspense>
  );
}
