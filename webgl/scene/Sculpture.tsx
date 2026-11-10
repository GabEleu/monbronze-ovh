"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { models, type ModelId } from "@/content/assets";
import { bindBronze, type BronzeMaterial } from "@/webgl/materials/bronze";

/** Charge un modèle préparé (GLB Meshopt, sans Draco ni CDN) et lui applique le bronze. */
export function Sculpture({
  id,
  src,
  material,
  autoRotate = false,
  rotationSpeed = 0.25,
}: {
  /** Modèle de content/assets.ts… */
  id?: ModelId;
  /** …ou adresse directe d'un GLB préparé (modèle envoyé depuis /admin). */
  src?: string;
  material: BronzeMaterial;
  autoRotate?: boolean;
  rotationSpeed?: number;
}) {
  const { scene } = useGLTF(src ?? models[id!].src, false, true);
  const object = useMemo(() => {
    const root = scene.clone(true);
    bindBronze(root, material);
    return root;
  }, [scene, material]);
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (autoRotate && group.current) group.current.rotation.y += delta * rotationSpeed;
  });
  return (
    <group ref={group}>
      <primitive object={object} />
    </group>
  );
}

export function preloadSculpture(id: ModelId) {
  useGLTF.preload(models[id].src, false, true);
}
