"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { models } from "@/content/assets";

/**
 * Géométries dérivées du buste (filaire, nuage de points), partagées par la métamorphose
 * et le configurateur, et GARDÉES en cache pour la session : jamais recalculées au retour
 * sur l'accueil (ne pas les libérer au démontage d'une scène).
 */
type Cloud = { cloud: THREE.BufferGeometry; positions: Float32Array; byY: number[] };
const wireCache = new WeakMap<THREE.Object3D, THREE.BufferGeometry>();
const cloudCache = new Map<string, Cloud>();

/** Premier maillage d'un GLB préparé, en coordonnées du modèle normalisé (flottants). */
export function objectSpaceGeometry(root: THREE.Object3D) {
  let found: THREE.Mesh | null = null;
  root.traverse((c) => {
    if (!found && (c as THREE.Mesh).isMesh) found = c as THREE.Mesh;
  });
  const mesh = found as THREE.Mesh | null;
  if (!mesh) throw new Error("Métamorphose : aucun maillage dans le modèle.");
  mesh.updateMatrix();
  const src = mesh.geometry;
  const pos = src.getAttribute("position");
  // Les GLB sont quantifiés (entiers normalisés) : on passe en flottants AVANT la matrice.
  const out = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrix);
    out.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(out, 3));
  if (src.index) g.setIndex(src.index.clone());
  return g;
}

/** Hachage déterministe (0 à 1), pour des apparitions stables d'une visite à l'autre. */
const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Filaire : géométrie non indexée + coordonnées barycentriques + ordre d'apparition. */
export function useWireGeometry() {
  const { scene } = useGLTF(models["buste-romain-filaire"].src, false, true);
  return useMemo(() => {
    const cached = wireCache.get(scene);
    if (cached) return cached;
    const g = objectSpaceGeometry(scene).toNonIndexed();
    const count = g.getAttribute("position").count;
    const bary = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    for (let t = 0; t < count / 3; t++) {
      bary.set([1, 0, 0, 0, 1, 0, 0, 0, 1], t * 9);
      // Les arêtes se relient du bas vers le haut, avec du désordre.
      const y = g.getAttribute("position").getY(t * 3);
      const r = Math.min(1, Math.max(0, (y + 0.5) * 0.7 + hash(t) * 0.3));
      rnd.set([r, r, r], t * 3);
    }
    g.setAttribute("bary", new THREE.BufferAttribute(bary, 3));
    g.setAttribute("edgeRnd", new THREE.BufferAttribute(rnd, 1));
    wireCache.set(scene, g);
    return g;
  }, [scene]);
}

/** Nuage de points échantillonné à la surface du scan (MeshSurfaceSampler). */
export function usePointCloud(count: number) {
  const { scene } = useGLTF(models["buste-romain"].src, false, true);
  return useMemo(() => {
    const key = `${scene.uuid}:${count}`;
    const cached = cloudCache.get(key);
    if (cached) return cached;
    const g = objectSpaceGeometry(scene);
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(g)).build();
    const positions = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    const p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      sampler.sample(p);
      positions.set([p.x, p.y, p.z], i * 3);
      rnd[i] = hash(i + 7);
    }
    g.dispose();
    const cloud = new THREE.BufferGeometry();
    cloud.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    cloud.setAttribute("rnd", new THREE.BufferAttribute(rnd, 1));
    // Index trié par hauteur : position de la buse au front d'impression.
    const byY = Array.from({ length: count }, (_, i) => i).sort(
      (a, b) => positions[a * 3 + 1]! - positions[b * 3 + 1]!,
    );
    const result = { cloud, positions, byY };
    cloudCache.set(key, result);
    return result;
  }, [scene, count]);
}
