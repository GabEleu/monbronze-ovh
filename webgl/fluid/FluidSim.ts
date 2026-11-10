/*! @license MIT. Passes de simulation adaptées de « WebGL Fluid Simulation »,
 * Copyright (c) 2017 Pavel Dobryakov. Notice MIT complète : shaders/fluid.ts et /credits. */
import * as THREE from "three";
import {
  advectionShader,
  baseVertex,
  clearShader,
  curlShader,
  divergenceShader,
  forcesShader,
  gradientSubtractShader,
  pressureShader,
  splatShader,
  vorticityShader,
} from "@/shaders/fluid";

type PassName =
  | "clear"
  | "splat"
  | "advection"
  | "forces"
  | "divergence"
  | "curl"
  | "vorticity"
  | "pressure"
  | "gradient";

/** Paire de cibles de rendu (lecture / écriture) pour les passes itératives. */
class DoubleTarget {
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;
  constructor(w: number, h: number, opts: THREE.RenderTargetOptions) {
    this.read = new THREE.WebGLRenderTarget(w, h, opts);
    this.write = new THREE.WebGLRenderTarget(w, h, opts);
  }
  swap() {
    [this.read, this.write] = [this.write, this.read];
  }
  dispose() {
    this.read.dispose();
    this.write.dispose();
  }
}

export type FluidOptions = {
  /** Résolution de la simulation (vitesse, pression). */
  simResolution: number;
  /** Résolution du colorant (température). */
  dyeResolution: number;
  pressureIterations: number;
  curl: number;
  velocityDissipation: number;
  dyeDissipation: number;
  /** Dissipation du colorant à l'intérieur du moule (lettres). */
  maskDyeDissipation: number;
  gravity: number;
  maskDrag: number;
};

/**
 * Le fluide n'est jamais affiché tel quel : il agite le métal liquide DANS les lettres
 * (remous du pointeur, impact du filet). Visqueux : peu de tourbillons, vitesse amortie.
 */
export const FLUID_HIGH: FluidOptions = {
  simResolution: 128,
  dyeResolution: 512,
  pressureIterations: 16,
  curl: 2,
  velocityDissipation: 1.2,
  dyeDissipation: 1.4,
  maskDyeDissipation: 0.5,
  gravity: 60,
  maskDrag: 2,
};

export const FLUID_MEDIUM: FluidOptions = {
  ...FLUID_HIGH,
  simResolution: 64,
  dyeResolution: 256,
  pressureIterations: 10,
};

function resolution(base: number, aspect: number) {
  const ratio = aspect < 1 ? 1 / aspect : aspect;
  const max = Math.round(base * ratio);
  const min = Math.round(base);
  return aspect > 1 ? { w: max, h: min } : { w: min, h: max };
}

/**
 * Simulation de fluide en cibles de rendu demi-flottantes. Le colorant `dye` porte
 * la température du métal (R). `mask` (texture R, 1 = lettre) agit comme un moule.
 */
export class FluidSim {
  readonly options: FluidOptions;
  private renderer: THREE.WebGLRenderer;
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private scene = new THREE.Scene();
  private quad: THREE.Mesh;
  private velocity!: DoubleTarget;
  private dye!: DoubleTarget;
  private pressure!: DoubleTarget;
  private divergence!: THREE.WebGLRenderTarget;
  private curl!: THREE.WebGLRenderTarget;
  private simSize = { w: 1, h: 1 };
  private dyeSize = { w: 1, h: 1 };
  private aspect = 1;
  private emptyMask: THREE.DataTexture;
  mask: THREE.Texture;
  private mats: Record<PassName, THREE.RawShaderMaterial>;

  constructor(renderer: THREE.WebGLRenderer, aspect: number, options: FluidOptions = FLUID_HIGH) {
    this.renderer = renderer;
    this.options = options;
    this.emptyMask = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this.emptyMask.needsUpdate = true;
    this.mask = this.emptyMask;
    const make = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.RawShaderMaterial({
        vertexShader: baseVertex,
        fragmentShader,
        uniforms: { texelSize: { value: new THREE.Vector2() }, ...uniforms },
        depthTest: false,
        depthWrite: false,
      });
    this.mats = {
      clear: make(clearShader, { uTexture: { value: null }, value: { value: 0 } }),
      splat: make(splatShader, {
        uTarget: { value: null },
        aspectRatio: { value: 1 },
        color: { value: new THREE.Vector3() },
        point: { value: new THREE.Vector2() },
        radius: { value: 0.001 },
        maxValue: { value: 1000 },
      }),
      advection: make(advectionShader, {
        uVelocity: { value: null },
        uSource: { value: null },
        uMask: { value: null },
        dt: { value: 0 },
        dissipation: { value: 0 },
        maskDissipation: { value: 0 },
      }),
      forces: make(forcesShader, {
        uVelocity: { value: null },
        uDye: { value: null },
        uMask: { value: null },
        dt: { value: 0 },
        gravity: { value: 0 },
        maskDrag: { value: 0 },
      }),
      divergence: make(divergenceShader, { uVelocity: { value: null } }),
      curl: make(curlShader, { uVelocity: { value: null } }),
      vorticity: make(vorticityShader, {
        uVelocity: { value: null },
        uCurl: { value: null },
        curl: { value: 0 },
        dt: { value: 0 },
      }),
      pressure: make(pressureShader, { uPressure: { value: null }, uDivergence: { value: null } }),
      gradient: make(gradientSubtractShader, {
        uPressure: { value: null },
        uVelocity: { value: null },
      }),
    };
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mats.clear);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.resize(aspect);
  }

  /** (Ré)alloue les cibles pour un nouveau rapport largeur / hauteur. */
  resize(aspect: number) {
    this.aspect = aspect;
    this.velocity?.dispose();
    this.dye?.dispose();
    this.pressure?.dispose();
    this.divergence?.dispose();
    this.curl?.dispose();
    const opts: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
    };
    const nearest = { ...opts, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
    this.simSize = resolution(this.options.simResolution, aspect);
    this.dyeSize = resolution(this.options.dyeResolution, aspect);
    const { w, h } = this.simSize;
    this.velocity = new DoubleTarget(w, h, opts);
    this.dye = new DoubleTarget(this.dyeSize.w, this.dyeSize.h, opts);
    this.pressure = new DoubleTarget(w, h, nearest);
    this.divergence = new THREE.WebGLRenderTarget(w, h, nearest);
    this.curl = new THREE.WebGLRenderTarget(w, h, nearest);
  }

  get dyeTexture() {
    return this.dye.read.texture;
  }

  private blit(
    material: THREE.RawShaderMaterial,
    target: THREE.WebGLRenderTarget,
    size: { w: number; h: number },
  ) {
    material.uniforms.texelSize!.value.set(1 / size.w, 1 / size.h);
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Injecte du mouvement et de la chaleur en (x, y) ∈ [0,1]², vitesse (dx, dy) en px/s.
   * `heat` : température ajoutée (0 à 1+), `radius` : rayon relatif.
   */
  splat(x: number, y: number, dx: number, dy: number, heat: number, radius = 0.0025) {
    const prev = this.renderer.getRenderTarget();
    const m = this.mats.splat;
    m.uniforms.aspectRatio!.value = this.aspect;
    m.uniforms.point!.value.set(x, y);
    m.uniforms.radius!.value = radius;
    m.uniforms.uTarget!.value = this.velocity.read.texture;
    m.uniforms.maxValue!.value = 1200;
    m.uniforms.color!.value.set(dx, dy, 0);
    this.blit(m, this.velocity.write, this.simSize);
    this.velocity.swap();
    if (heat > 0) {
      m.uniforms.uTarget!.value = this.dye.read.texture;
      m.uniforms.maxValue!.value = 1.6;
      m.uniforms.color!.value.set(heat, heat * 0.5, 0);
      this.blit(m, this.dye.write, this.dyeSize);
      this.dye.swap();
    }
    // Toujours rendre la main à l'écran (sinon la scène se rendrait dans une texture).
    this.renderer.setRenderTarget(prev);
  }

  /** Avance la simulation de `dt` secondes. */
  step(dt: number) {
    const o = this.options;
    const { mats } = this;
    const prev = this.renderer.getRenderTarget();
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    mats.forces!.uniforms.uVelocity!.value = this.velocity.read.texture;
    mats.forces!.uniforms.uDye!.value = this.dye.read.texture;
    mats.forces!.uniforms.uMask!.value = this.mask;
    mats.forces!.uniforms.dt!.value = dt;
    mats.forces!.uniforms.gravity!.value = o.gravity;
    mats.forces!.uniforms.maskDrag!.value = o.maskDrag;
    this.blit(mats.forces!, this.velocity.write, this.simSize);
    this.velocity.swap();

    mats.curl!.uniforms.uVelocity!.value = this.velocity.read.texture;
    this.blit(mats.curl!, this.curl, this.simSize);

    mats.vorticity!.uniforms.uVelocity!.value = this.velocity.read.texture;
    mats.vorticity!.uniforms.uCurl!.value = this.curl.texture;
    mats.vorticity!.uniforms.curl!.value = o.curl;
    mats.vorticity!.uniforms.dt!.value = dt;
    this.blit(mats.vorticity!, this.velocity.write, this.simSize);
    this.velocity.swap();

    mats.divergence!.uniforms.uVelocity!.value = this.velocity.read.texture;
    this.blit(mats.divergence!, this.divergence, this.simSize);

    mats.clear!.uniforms.uTexture!.value = this.pressure.read.texture;
    mats.clear!.uniforms.value!.value = 0.8;
    this.blit(mats.clear!, this.pressure.write, this.simSize);
    this.pressure.swap();

    mats.pressure!.uniforms.uDivergence!.value = this.divergence.texture;
    for (let i = 0; i < o.pressureIterations; i++) {
      mats.pressure!.uniforms.uPressure!.value = this.pressure.read.texture;
      this.blit(mats.pressure!, this.pressure.write, this.simSize);
      this.pressure.swap();
    }

    mats.gradient!.uniforms.uPressure!.value = this.pressure.read.texture;
    mats.gradient!.uniforms.uVelocity!.value = this.velocity.read.texture;
    this.blit(mats.gradient!, this.velocity.write, this.simSize);
    this.velocity.swap();

    const adv = mats.advection!;
    adv.uniforms.uMask!.value = this.mask;
    adv.uniforms.dt!.value = dt;
    adv.uniforms.uVelocity!.value = this.velocity.read.texture;
    adv.uniforms.uSource!.value = this.velocity.read.texture;
    adv.uniforms.dissipation!.value = o.velocityDissipation;
    adv.uniforms.maskDissipation!.value = o.velocityDissipation * 4;
    // texelSize de la vitesse pour l'advection (coordonnées de la grille de simulation).
    adv.uniforms.texelSize!.value.set(1 / this.simSize.w, 1 / this.simSize.h);
    this.quad.material = adv;
    this.renderer.setRenderTarget(this.velocity.write);
    this.renderer.render(this.scene, this.camera);
    this.velocity.swap();

    adv.uniforms.uVelocity!.value = this.velocity.read.texture;
    adv.uniforms.uSource!.value = this.dye.read.texture;
    adv.uniforms.dissipation!.value = o.dyeDissipation;
    adv.uniforms.maskDissipation!.value = o.maskDyeDissipation;
    adv.uniforms.texelSize!.value.set(1 / this.simSize.w, 1 / this.simSize.h);
    this.quad.material = adv;
    this.renderer.setRenderTarget(this.dye.write);
    this.renderer.render(this.scene, this.camera);
    this.dye.swap();

    this.renderer.setRenderTarget(prev);
    this.renderer.autoClear = autoClear;
  }

  /** Refroidit tout le métal (multiplie la température). */
  cool(factor: number) {
    const prev = this.renderer.getRenderTarget();
    const m = this.mats.clear!;
    m.uniforms.uTexture!.value = this.dye.read.texture;
    m.uniforms.value!.value = factor;
    this.blit(m, this.dye.write, this.dyeSize);
    this.dye.swap();
    this.renderer.setRenderTarget(prev);
  }

  dispose() {
    this.velocity.dispose();
    this.dye.dispose();
    this.pressure.dispose();
    this.divergence.dispose();
    this.curl.dispose();
    Object.values(this.mats).forEach((m) => m.dispose());
    this.quad.geometry.dispose();
    this.emptyMask.dispose();
  }
}
