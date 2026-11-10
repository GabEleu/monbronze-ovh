import * as THREE from "three";
import type { Patine } from "@/content/assets";
import { PATINA_PRESETS, type PatinaPreset } from "@/webgl/materials/patinas";
import {
  bronzeEmissiveBody,
  bronzeFragmentBody,
  bronzeFragmentHeader,
  bronzeNormalBody,
  bronzeVertexBody,
  bronzeVertexHeader,
} from "@/shaders/bronze";

export { PATINA_PRESETS, type PatinaPreset };

export type BronzeUniforms = ReturnType<typeof createUniforms>;

function createUniforms() {
  return {
    uMetalColor: { value: new THREE.Color() },
    uPatinaColor: { value: new THREE.Color() },
    uPatinaDeep: { value: new THREE.Color() },
    uUnderColor: { value: new THREE.Color() },
    uUnderAmount: { value: 0 },
    uMetalRoughness: { value: 0.3 },
    uPatinaRoughness: { value: 0.5 },
    uPatinaMetalness: { value: 0.8 },
    uCoverage: { value: 1 },
    uPolishLo: { value: 0.55 },
    uPolishHi: { value: 0.85 },
    uCavityLo: { value: 0.1 },
    uCavityHi: { value: 0.5 },
    uNoiseScale: { value: 5.5 },
    uNoiseAmount: { value: 0.14 },
    uDeepDarken: { value: 0.5 },
    /** Amplitude du micro-relief de fonte (unités objet, hauteur du modèle = 1). */
    uBump: { value: 0.0016 },
    uMicroRough: { value: 0.16 },
    /** Chaleur : 0 = froid, 1 = incandescent (accueil, métamorphose). */
    uHeat: { value: 0 },
    /** Apparition par le bas : 1 = entièrement visible. */
    uReveal: { value: 1 },
    uTime: { value: 0 },
    uDebugCavity: { value: 0 },
    /** Onde du tintement : secondes depuis le clic (≥ 1,6 : aucune onde). */
    uPulse: { value: 10 },
    uPulseOrigin: { value: new THREE.Vector3(0, 0.3, 0.2) },
    uLocalMatrix: { value: new THREE.Matrix4() },
  };
}

export type BronzeMaterial = THREE.MeshPhysicalMaterial & {
  userData: { uniforms: BronzeUniforms };
};

/**
 * Matériau bronze physiquement réaliste : métal (PBR) + patine couvrante, polissage
 * des crêtes, micro-relief de fonte, cire (clearcoat). Les uniformes vivent dans
 * `material.userData.uniforms` : on change de patine sans recompiler le shader.
 */
export function createBronzeMaterial(patine: Patine = "brun-medaille"): BronzeMaterial {
  const uniforms = createUniforms();
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.3,
    // Clearcoat toujours > 0 : passer à 0 changerait les defines et recompilerait le shader.
    clearcoat: 0.3,
    clearcoatRoughness: 0.45,
    envMapIntensity: 1,
  }) as BronzeMaterial;
  material.name = "bronze";
  material.userData.uniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    const inject = (src: string, chunk: string, code: string) => {
      const token = `#include <${chunk}>`;
      if (!src.includes(token))
        throw new Error(`Bronze : fragment de shader introuvable (${chunk}).`);
      return src.replace(token, `${token}\n${code}`);
    };
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `${bronzeVertexHeader}\n#include <common>`,
    );
    shader.vertexShader = inject(shader.vertexShader, "begin_vertex", bronzeVertexBody);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `${bronzeFragmentHeader}\n#include <common>`,
    );
    shader.fragmentShader = inject(
      shader.fragmentShader,
      "metalnessmap_fragment",
      bronzeFragmentBody,
    );
    shader.fragmentShader = inject(shader.fragmentShader, "normal_fragment_maps", bronzeNormalBody);
    shader.fragmentShader = inject(
      shader.fragmentShader,
      "emissivemap_fragment",
      bronzeEmissiveBody,
    );
  };
  material.customProgramCacheKey = () => "monbronze-bronze-v3";

  applyPatina(material, PATINA_PRESETS[patine]);
  return material;
}

/**
 * Active la variante « apparition » (dissolution par le bas). Recompile une fois :
 * à n'activer que pour les scènes qui en ont besoin (accueil, métamorphose).
 */
export function setReveal(material: BronzeMaterial, enabled: boolean) {
  const has = Boolean(material.defines?.MB_REVEAL);
  if (has === enabled) return;
  material.defines = { ...(material.defines ?? {}) };
  if (enabled) material.defines.MB_REVEAL = "";
  else delete material.defines.MB_REVEAL;
  material.needsUpdate = true;
}

/** Applique une patine (immédiatement, sans recompilation). */
export function applyPatina(material: BronzeMaterial, preset: PatinaPreset) {
  const u = material.userData.uniforms;
  u.uMetalColor.value.set(preset.metal);
  u.uPatinaColor.value.set(preset.patina);
  u.uPatinaDeep.value.set(preset.patinaDeep);
  u.uUnderColor.value.set(preset.under);
  u.uUnderAmount.value = preset.underAmount;
  u.uMetalRoughness.value = preset.metalRoughness;
  u.uPatinaRoughness.value = preset.patinaRoughness;
  u.uPatinaMetalness.value = preset.patinaMetalness;
  u.uCoverage.value = preset.coverage;
  u.uPolishLo.value = preset.polishLo;
  u.uPolishHi.value = preset.polishHi;
  u.uCavityLo.value = preset.cavityLo;
  u.uCavityHi.value = preset.cavityHi;
  u.uDeepDarken.value = preset.deepDarken;
  material.clearcoat = Math.max(0.001, preset.clearcoat);
}

/** Interpole deux patines (t de 0 à 1), pour les transitions du configurateur. */
export function lerpPatina(a: PatinaPreset, b: PatinaPreset, t: number): PatinaPreset {
  const c = (x: string, y: string) =>
    `#${new THREE.Color(x).lerp(new THREE.Color(y), t).getHexString()}`;
  const n = (x: number, y: number) => x + (y - x) * t;
  return {
    metal: c(a.metal, b.metal),
    patina: c(a.patina, b.patina),
    patinaDeep: c(a.patinaDeep, b.patinaDeep),
    under: c(a.under, b.under),
    underAmount: n(a.underAmount, b.underAmount),
    metalRoughness: n(a.metalRoughness, b.metalRoughness),
    patinaRoughness: n(a.patinaRoughness, b.patinaRoughness),
    patinaMetalness: n(a.patinaMetalness, b.patinaMetalness),
    coverage: n(a.coverage, b.coverage),
    polishLo: n(a.polishLo, b.polishLo),
    polishHi: n(a.polishHi, b.polishHi),
    cavityLo: n(a.cavityLo, b.cavityLo),
    cavityHi: n(a.cavityHi, b.cavityHi),
    deepDarken: n(a.deepDarken, b.deepDarken),
    clearcoat: n(a.clearcoat, b.clearcoat),
  };
}

/**
 * Prépare un objet chargé depuis un GLB préparé : renomme les attributs cuits
 * (`_cavity`, `_convex`), applique le matériau et transmet la matrice locale
 * (déquantification) au shader. Les GLB préparés n'ont qu'un maillage.
 * Règle : UN matériau bronze par sculpture affichée (uLocalMatrix est propre à chaque modèle).
 */
export function bindBronze(root: THREE.Object3D, material: BronzeMaterial) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry;
    for (const [name, fallback] of [
      ["cavity", 0.3],
      ["convex", 0.3],
    ] as const) {
      if (geometry.getAttribute(name)) continue;
      const baked = geometry.getAttribute(`_${name}`);
      // Sans attribut cuit, valeur neutre explicite (un attribut absent lirait un état GPU aléatoire).
      geometry.setAttribute(
        name,
        baked ??
          new THREE.BufferAttribute(
            new Float32Array(geometry.getAttribute("position").count).fill(fallback),
            1,
          ),
      );
    }
    mesh.material = material;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.updateMatrix();
    material.userData.uniforms.uLocalMatrix.value.copy(mesh.matrix);
  });
}
