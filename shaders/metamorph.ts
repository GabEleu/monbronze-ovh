/**
 * GLSL de la métamorphose (BRIEF.md §3.4). Les états sont FONDUS dans les shaders :
 *   - nuage de points (capturer) balayé par une ligne laser ;
 *   - filaire par coordonnées barycentriques (modéliser) ;
 *   - impression couche par couche sous un front qui monte (fabriquer) ;
 *   - cire ambrée translucide, puis métal en fusion qui coule du haut (mouler et fondre) ;
 *   - bronze patiné, poli sur les reliefs (ciseler et patiner) : matériau bronze du site.
 * Le solide est le matériau bronze (shaders/bronze.ts) complété par les blocs ci-dessous.
 */
import { thermalGLSL } from "@/shaders/thermal";

/** En-tête ajouté au fragment du bronze. */
export const metamorphFragmentHeader = /* glsl */ `
uniform float uPrint;
uniform float uPrintLevel;
uniform float uPrinting;
uniform float uWax;
uniform float uMoltenFront;
uniform vec3 uPlaColor;
uniform float uLayer;
float mbMetal;
float mbWax;
float mbFront;
float mbHeatLocal;
`;

/** Après le corps du bronze (diffuse, métal, rugosité connus) : impression, cire, métal. */
export const metamorphFragmentBody = /* glsl */ `
{
  // Front du métal qui coule : irrégulier (coulures).
  mbFront = uMoltenFront + (mb_noise(vec3(vObjPos.xz * 9.0, 3.0)) - 0.5) * 0.14;
  mbMetal = smoothstep(mbFront - 0.012, mbFront + 0.012, vObjPos.y);
  mbWax = uWax * (1.0 - mbMetal);
  float pla = uPrint * (1.0 - uWax) * (1.0 - mbMetal);
  // Albédos sombres : l'éclairage est réglé pour du métal (sans diffus), un diélectrique
  // clair y serait surexposé. Impression 3D : matière mate, lignes de couches.
  float layer = abs(fract(vObjPos.y * 110.0) - 0.5) * 2.0;
  vec3 plaColor = uPlaColor * (1.0 - 0.5 * uLayer * smoothstep(0.55, 1.0, layer));
  vec3 waxColor = vec3(0.20, 0.06, 0.01);
  diffuseColor.rgb = mix(diffuseColor.rgb, plaColor, pla);
  diffuseColor.rgb = mix(diffuseColor.rgb, waxColor, mbWax);
  metalnessFactor = mix(metalnessFactor, 0.0, clamp(pla + mbWax, 0.0, 1.0));
  roughnessFactor = mix(roughnessFactor, 0.72, pla);
  roughnessFactor = mix(roughnessFactor, 0.4, mbWax);
  // Chaleur seulement là où le métal est arrivé.
  mbHeatLocal = uHeat * mbMetal;
}
`;

/** Après <emissivemap_fragment>, avant la chaleur du bronze : buse, cire, front du métal. */
export const metamorphEmissiveBody = /* glsl */ `
{
  // Buse : la couche fraîche brille au front d'impression.
  float fresh = 1.0 - smoothstep(0.0, 0.012, uPrintLevel - vObjPos.y);
  totalEmissiveRadiance += vec3(1.0, 0.6, 0.28) * fresh * 4.0 * uPrinting;
  // Cire : transparence simulée (lumière enveloppante + liseré de Fresnel).
  vec3 V = normalize(vViewPosition);
  float fres = pow(1.0 - abs(dot(normal, V)), 2.0);
  totalEmissiveRadiance += mbWax * vec3(0.9, 0.36, 0.06) * (0.18 + 1.1 * fres);
  // Le front du métal en fusion, éclatant, qui avance sur la cire.
  float edge = (1.0 - smoothstep(0.0, 0.012, abs(vObjPos.y - mbFront))) * step(0.001, uWax) * uHeat;
  totalEmissiveRadiance += vec3(1.0, 0.32, 0.03) * edge * 3.5;
}
`;

// ───────────────────────────── Filaire ─────────────────────────────

export const wireVertex = /* glsl */ `
attribute vec3 bary;
attribute float edgeRnd;
varying vec3 vBary;
varying float vRnd;
varying vec3 vObj;
void main() {
  vBary = bary;
  vRnd = edgeRnd;
  vObj = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const wireFragment = /* glsl */ `
uniform float uWire;
uniform float uLevel;
uniform vec3 uColor;
varying vec3 vBary;
varying float vRnd;
varying vec3 vObj;
void main() {
  // Le solide imprimé remplace le filaire sous le front d'impression.
  if (vObj.y < uLevel) discard;
  float e = min(min(vBary.x, vBary.y), vBary.z);
  float line = 1.0 - smoothstep(0.0, fwidth(e) * 1.3, e);
  // Les arêtes apparaissent une à une (les points se relient).
  float drawn = smoothstep(vRnd - 0.08, vRnd, uWire * 1.08);
  float a = line * drawn * (gl_FrontFacing ? 0.85 : 0.22);
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor * a, a);
}
`;

// ───────────────────────────── Nuage de points ─────────────────────────────

export const pointsVertex = /* glsl */ `
attribute float rnd;
uniform float uSize;
uniform float uScan;
uniform float uPoints;
uniform float uPixelRatio;
varying float vGlow;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = position.y - uScan;
  vGlow = exp(-d * d / 0.00035);
  vAlpha = uPoints * (0.55 + 0.45 * rnd);
  gl_PointSize = uSize * uPixelRatio * (0.7 + 0.6 * rnd + vGlow * 1.6) / -mv.z;
}
`;

export const pointsFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uLaser;
varying float vGlow;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = dot(c, c);
  if (r > 0.25) discard;
  float soft = 1.0 - smoothstep(0.05, 0.25, r);
  vec3 col = mix(uColor, uLaser, vGlow);
  float a = soft * vAlpha * (0.7 + vGlow);
  gl_FragColor = vec4(col * a, a);
}
`;

// ───────────────────────────── Halo et laser ─────────────────────────────

export const glowVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Halo de chaleur (métal en fusion) : disque doux derrière la sculpture. */
export const haloFragment = /* glsl */ `
uniform float uHeat;
varying vec2 vUv;
${thermalGLSL}
void main() {
  vec2 c = vUv - 0.5;
  float r = length(c * vec2(1.0, 0.8));
  float a = exp(-r * r / 0.05) * uHeat;
  gl_FragColor = vec4(thermal(0.55) * a * 0.55, 1.0);
}
`;

/** Ligne laser du scanner : trait horizontal fin, cœur blanc, halo rouge. */
export const laserFragment = /* glsl */ `
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float d = abs(vUv.y - 0.5) * 2.0;
  float core = 1.0 - smoothstep(0.0, 0.12, d);
  float glow = exp(-d * 4.0) * 0.5;
  float fade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
  vec3 col = vec3(1.0, 0.25, 0.12) * glow + vec3(1.0, 0.85, 0.8) * core;
  gl_FragColor = vec4(col * fade * uOpacity, 1.0);
}
`;

/** Filet de coulée au-dessus de la pièce (« l'effet de coulée revient ici »). */
export const streamFragment = /* glsl */ `
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;
${thermalGLSL}
float sh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sn(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(sh(i), sh(i + vec2(1.0, 0.0)), f.x), mix(sh(i + vec2(0.0, 1.0)), sh(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  float x = (vUv.x - 0.5) * 2.0;
  float wob = (sn(vec2(vUv.y * 6.0 - uTime * 3.0, 1.0)) - 0.5) * 0.35 * (1.0 - vUv.y);
  float d = abs(x - wob);
  float body = 1.0 - smoothstep(0.5, 0.7, d);
  float glow = exp(-d * 2.5) * 0.35;
  float flow = sn(vec2(x * 3.0, vUv.y * 30.0 + uTime * 8.0));
  vec3 col = thermal(0.72 + 0.2 * (1.0 - d)) * (0.85 + 0.3 * flow) * body + thermal(0.6) * glow;
  // Fondu en haut (le filet vient de hors champ).
  col *= smoothstep(1.0, 0.75, vUv.y);
  gl_FragColor = vec4(col * uOpacity, 1.0);
}
`;
