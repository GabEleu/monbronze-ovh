"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Patine } from "@/content/assets";
import { applyPatina, createBronzeMaterial, PATINA_PRESETS } from "@/webgl/materials/bronze";
import { Sculpture } from "@/webgl/scene/Sculpture";
import { Studio } from "@/webgl/scene/Studio";

/**
 * Aperçu d'un modèle préparé, avec le bronze du site. Le canvas garde son image
 * (preserveDrawingBuffer) : l'image fixe du modèle est prise sous l'angle choisi.
 */
export default function ModelPreview({
  url,
  patine,
  onCanvas,
}: {
  url: string;
  patine: Patine;
  onCanvas: (canvas: HTMLCanvasElement | null) => void;
}) {
  const material = useMemo(() => createBronzeMaterial(patine), [patine]);
  useEffect(() => {
    applyPatina(material, PATINA_PRESETS[patine]);
    return () => material.dispose();
  }, [material, patine]);
  useEffect(() => () => onCanvas(null), [onCanvas]);

  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
      camera={{ position: [0, 0.15, 4.2], fov: 18, near: 0.1, far: 50 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.AgXToneMapping;
        gl.toneMappingExposure = 1;
        onCanvas(gl.domElement);
      }}
    >
      <Suspense fallback={null}>
        <Studio intensity={1} resolution={512} />
        <Sculpture src={url} material={material} />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={2.6} maxDistance={7} />
    </Canvas>
  );
}
