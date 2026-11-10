/**
 * GLSL du matériau bronze (injecté dans MeshPhysicalMaterial via onBeforeCompile).
 *
 * Logique d'atelier (BRIEF.md §5.1) : la patine couvre la pièce et s'accumule dans les
 * creux ; le ciseleur polit le métal sur les arêtes saillantes. Deux attributs cuits
 * hors ligne par scripts/prepare-model.mjs :
 *   cavity (0 = surface exposée, 1 = creux profond) : occlusion ambiante + concavité ;
 *   convex (0 = plat ou creux, 1 = crête vive) : convexité locale.
 * S'y ajoutent une micro-surface (relief de fonte, rugosité variable), la chaleur
 * (métal incandescent qui refroidit) et l'apparition (dissolution par le bas).
 */
import { thermalGLSL } from "@/shaders/thermal";

export const noiseGLSL = /* glsl */ `
float mb_hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float mb_noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(mb_hash(i), mb_hash(i + vec3(1, 0, 0)), f.x),
        mix(mb_hash(i + vec3(0, 1, 0)), mb_hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(mb_hash(i + vec3(0, 0, 1)), mb_hash(i + vec3(1, 0, 1)), f.x),
        mix(mb_hash(i + vec3(0, 1, 1)), mb_hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float mb_fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 3; i++) {
    s += a * mb_noise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return s;
}
`;

export const bronzeVertexHeader = /* glsl */ `
attribute float cavity;
attribute float convex;
uniform mat4 uLocalMatrix;
varying float vCavity;
varying float vConvex;
varying vec3 vObjPos;
`;

export const bronzeVertexBody = /* glsl */ `
vCavity = cavity;
vConvex = convex;
vObjPos = (uLocalMatrix * vec4(position, 1.0)).xyz;
`;

export const bronzeFragmentHeader = /* glsl */ `
uniform vec3 uMetalColor;
uniform vec3 uPatinaColor;
uniform vec3 uPatinaDeep;
uniform vec3 uUnderColor;
uniform float uUnderAmount;
uniform float uMetalRoughness;
uniform float uPatinaRoughness;
uniform float uPatinaMetalness;
uniform float uCoverage;
uniform float uPolishLo;
uniform float uPolishHi;
uniform float uCavityLo;
uniform float uCavityHi;
uniform float uNoiseScale;
uniform float uNoiseAmount;
uniform float uDeepDarken;
uniform float uBump;
uniform float uMicroRough;
uniform float uHeat;
uniform float uReveal;
uniform float uTime;
uniform float uDebugCavity;
uniform float uPulse;
uniform vec3 uPulseOrigin;
varying float vCavity;
varying float vConvex;
varying vec3 vObjPos;
${noiseGLSL}
${thermalGLSL.replace("vec3 thermal(", "vec3 mb_thermal(")}
`;

/** Injecté après <metalnessmap_fragment> : roughnessFactor et metalnessFactor existent déjà. */
export const bronzeFragmentBody = /* glsl */ `
{
  float n = mb_fbm(vObjPos * uNoiseScale);
  float mottle = mb_fbm(vObjPos * uNoiseScale * 3.7 + 11.0);
  float cav = clamp(vCavity + (n - 0.5) * uNoiseAmount, 0.0, 1.0);
  // Polissage : crêtes saillantes hors des creux.
  // Seuils protégés : smoothstep(a, b, x) est indéfini si a >= b.
  float polish = smoothstep(uPolishLo, max(uPolishHi, uPolishLo + 0.001), vConvex + (n - 0.5) * uNoiseAmount)
               * (1.0 - smoothstep(0.1, 0.35, cav));
  // Patine : couvrante (uCoverage = 1) ou seulement dans les creux (doré, uCoverage = 0).
  float hollow = smoothstep(uCavityLo, max(uCavityHi, uCavityLo + 0.001), cav);
  float p = clamp(max(uCoverage * (1.0 - polish), hollow), 0.0, 1.0);
  vec3 patina = mix(uPatinaColor, uPatinaDeep, smoothstep(0.35, 0.75, mottle));
  if (uUnderAmount > 0.0) {
    float under = smoothstep(0.55, 0.8, mb_fbm(vObjPos * uNoiseScale * 1.7 + 5.0));
    patina = mix(patina, uUnderColor, uUnderAmount * under);
  }
  vec3 col = mix(uMetalColor, patina, p);
  col *= 1.0 - uDeepDarken * smoothstep(0.7, 1.0, cav);
  float micro = mb_noise(vObjPos * 220.0);
  diffuseColor.rgb = col;
  metalnessFactor = mix(1.0, uPatinaMetalness, p);
  roughnessFactor = clamp(
    mix(uMetalRoughness, uPatinaRoughness, p) + (mottle - 0.5) * 0.12 + (micro - 0.5) * uMicroRough,
    0.04, 1.0);
  if (uDebugCavity > 0.5) {
    diffuseColor.rgb = vec3(vCavity, vConvex, 0.0);
    metalnessFactor = 0.0;
    roughnessFactor = 1.0;
  }
}
`;

/** Injecté après <normal_fragment_maps> : micro-relief de fonte (bump procédural, Mikkelsen 2010). */
export const bronzeNormalBody = /* glsl */ `
if (uBump > 0.0) {
  // Atténuation quand une période du relief fait moins de ~2 px (évite le scintillement).
  float fw = length(fwidth(vObjPos * 220.0));
  float fade = 1.0 - smoothstep(0.35, 0.7, fw);
  float hgt = (mb_noise(vObjPos * 220.0) * 0.6 * fade + mb_noise(vObjPos * 75.0) * 0.4) * uBump;
  vec3 sx = dFdx(-vViewPosition);
  vec3 sy = dFdy(-vViewPosition);
  float hx = dFdx(hgt);
  float hy = dFdy(hgt);
  vec3 r1 = cross(sy, normal);
  vec3 r2 = cross(normal, sx);
  float det = dot(sx, r1) * faceDirection;
  vec3 grad = sign(det) * (hx * r1 + hy * r2);
  normal = normalize(abs(det) * normal - grad);
}
`;

/** Injecté après <emissivemap_fragment> : chaleur (incandescence) et apparition. */
export const bronzeEmissiveBody = /* glsl */ `
if (uPulse < 1.6) {
  // « Tinter le bronze » : une onde de lumière parcourt la surface depuis le point touché.
  float ring = length(vObjPos - uPulseOrigin) - uPulse * 0.9;
  float wave = exp(-ring * ring * 260.0) * (1.0 - smoothstep(0.0, 1.6, uPulse));
  totalEmissiveRadiance += vec3(1.0, 0.82, 0.55) * wave * 1.4;
}
if (uHeat > 0.001) {
  // Les reliefs (convexes) refroidissent d'abord, les creux gardent la chaleur.
  float hn = mb_fbm(vObjPos * 4.0 + vec3(0.0, uTime * 0.35, 0.0));
  float th = clamp(uHeat * 1.1 - vConvex * 0.5 + vCavity * 0.3 - hn * 0.3, 0.0, 1.0);
  // Le métal en fusion se lit par contraste : croûte sombre qui dérive, fissures vives.
  th *= 1.0 - 0.6 * smoothstep(0.5, 0.7, hn);
  // Teintes très saturées (AgX délave les hautes valeurs), pic blanc-jaune au plus chaud.
  vec3 glow = mix(vec3(0.8, 0.05, 0.0), vec3(1.0, 0.3, 0.0), smoothstep(0.3, 0.78, th));
  glow = mix(glow, vec3(1.0, 0.85, 0.5), smoothstep(0.85, 1.0, th));
  totalEmissiveRadiance += glow * th * 2.2;
  diffuseColor.rgb *= 1.0 - smoothstep(0.0, 0.35, th);
  roughnessFactor = mix(roughnessFactor, 0.55, clamp(uHeat, 0.0, 1.0));
}
#ifdef MB_REVEAL
// Variante compilée à part (discard casse l'early-Z) : activée par setReveal().
if (uReveal < 0.999) {
  float edge = vObjPos.y - (uReveal * 1.25 - 0.62) + (mb_noise(vObjPos * 9.0) - 0.5) * 0.06;
  if (edge > 0.0) discard;
  totalEmissiveRadiance += mb_thermal(1.0) * smoothstep(-0.05, 0.0, edge) * 3.0;
}
#endif
`;
