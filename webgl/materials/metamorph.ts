import * as THREE from "three";
import { createBronzeMaterial, type BronzeMaterial } from "@/webgl/materials/bronze";
import { bronzeEmissiveBody, bronzeFragmentBody, bronzeFragmentHeader } from "@/shaders/bronze";
import {
  glowVertex,
  haloFragment,
  laserFragment,
  metamorphEmissiveBody,
  metamorphFragmentBody,
  metamorphFragmentHeader,
  pointsFragment,
  pointsVertex,
  streamFragment,
  wireFragment,
  wireVertex,
} from "@/shaders/metamorph";

export type MetamorphMaterial = BronzeMaterial & {
  userData: {
    metamorph: {
      uPrint: { value: number };
      uPrintLevel: { value: number };
      uPrinting: { value: number };
      uWax: { value: number };
      uMoltenFront: { value: number };
      /** Couleur de la matière « source » (impression, plâtre, terre) et lignes de couches. */
      uPlaColor: { value: THREE.Color };
      uLayer: { value: number };
    };
  };
};

/**
 * Matériau unique de la sculpture solide de la métamorphose : le bronze du site, complété
 * par l'impression 3D, la cire et le métal en fusion (états fondus dans le shader).
 */
export function createMetamorphMaterial(): MetamorphMaterial {
  const material = createBronzeMaterial("brun-medaille") as MetamorphMaterial;
  const extra = {
    uPrint: { value: 1 },
    uPrintLevel: { value: -1 },
    uPrinting: { value: 0 },
    uWax: { value: 0 },
    uMoltenFront: { value: 1 },
    uPlaColor: { value: new THREE.Color(0.24, 0.235, 0.22) },
    uLayer: { value: 1 },
  };
  material.userData.metamorph = extra;
  const base = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    base.call(material, shader, renderer);
    Object.assign(shader.uniforms, extra);
    const swap = (src: string, find: string, replace: string) => {
      if (!src.includes(find)) throw new Error("Métamorphose : bloc de shader introuvable.");
      return src.replace(find, replace);
    };
    let fs = shader.fragmentShader;
    fs = swap(fs, bronzeFragmentHeader, `${bronzeFragmentHeader}\n${metamorphFragmentHeader}`);
    fs = swap(fs, bronzeFragmentBody, `${bronzeFragmentBody}\n${metamorphFragmentBody}`);
    // La chaleur du bronze ne vaut que là où le métal est arrivé (uHeat → chaleur locale).
    fs = swap(
      fs,
      bronzeEmissiveBody,
      `${metamorphEmissiveBody}\n#define uHeat mbHeatLocal\n${bronzeEmissiveBody}\n#undef uHeat`,
    );
    // Test du front d'impression en tête du fragment (avant tout le calcul du bronze).
    fs = swap(
      fs,
      "#include <clipping_planes_fragment>",
      "#include <clipping_planes_fragment>\n  if (vObjPos.y > uPrintLevel) discard;",
    );
    shader.fragmentShader = fs;
  };
  material.customProgramCacheKey = () => "monbronze-metamorph-v1";
  return material;
}

export function createWireMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: wireVertex,
    fragmentShader: wireFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uWire: { value: 0 },
      uLevel: { value: -1 },
      uColor: { value: new THREE.Color("#e8c98a") },
    },
  });
}

export function createPointsMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: pointsVertex,
    fragmentShader: pointsFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uSize: { value: 9 },
      uScan: { value: 0 },
      uPoints: { value: 1 },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color("#f2ece1") },
      uLaser: { value: new THREE.Color("#ff6a3d") },
    },
  });
}

export function createHaloMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: glowVertex,
    fragmentShader: haloFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uHeat: { value: 0 } },
  });
}

export function createLaserMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: glowVertex,
    fragmentShader: laserFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uOpacity: { value: 0 } },
  });
}

export function createStreamMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: glowVertex,
    fragmentShader: streamFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
  });
}
