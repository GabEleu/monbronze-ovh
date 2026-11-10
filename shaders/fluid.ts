/*! @license MIT
 * Simulation de fluide « stable fluids » (Jos Stam, 1999) sur carte graphique.
 *
 * Structure des passes adaptée de « WebGL Fluid Simulation » :
 *   MIT License — Copyright (c) 2017 Pavel Dobryakov
 *   Permission is hereby granted, free of charge, to any person obtaining a copy of this
 *   software and associated documentation files (the "Software"), to deal in the Software
 *   without restriction, including without limitation the rights to use, copy, modify,
 *   merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 *   permit persons to whom the Software is furnished to do so, subject to the following
 *   conditions: The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS",
 *   WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 *   WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 *   IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
 *   OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
 *   OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * Réécrite et adaptée (crédit sur /credits) : le colorant porte la TEMPÉRATURE du métal
 * (canal R), le métal est lourd (gravité) et un masque (les lettres du titre) le retient
 * comme un moule.
 */

export const baseVertex = /* glsl */ `
precision highp float;
attribute vec3 position;
uniform vec2 texelSize;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main () {
  vUv = position.xy * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const header = /* glsl */ `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
`;

export const clearShader = /* glsl */ `${header}
uniform sampler2D uTexture;
uniform float value;
void main () {
  gl_FragColor = value * texture2D(uTexture, vUv);
}
`;

export const splatShader = /* glsl */ `${header}
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
uniform float maxValue;
void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture2D(uTarget, vUv).xyz;
  // Borné : au-delà, les demi-flottants saturent (Inf) et la simulation part en NaN.
  gl_FragColor = vec4(clamp(base + splat, -maxValue, maxValue), 1.0);
}
`;

export const advectionShader = /* glsl */ `${header}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform sampler2D uMask;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
uniform float maskDissipation;
void main () {
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
  vec4 result = texture2D(uSource, coord);
  if (!(result.x == result.x)) result = vec4(0.0);
  // Dans le moule (lettres), le métal se dissipe beaucoup moins : il s'y accumule.
  float m = texture2D(uMask, vUv).r;
  float decay = 1.0 + mix(dissipation, maskDissipation, m) * dt;
  gl_FragColor = result / decay;
}
`;

/** Forces externes : gravité proportionnelle à la température, freinage dans le moule. */
export const forcesShader = /* glsl */ `${header}
uniform sampler2D uVelocity;
uniform sampler2D uDye;
uniform sampler2D uMask;
uniform float dt;
uniform float gravity;
uniform float maskDrag;
void main () {
  vec2 v = texture2D(uVelocity, vUv).xy;
  // Nettoyage : une valeur NaN (x != x) est remise à zéro.
  if (!(v.x == v.x) || !(v.y == v.y)) v = vec2(0.0);
  float t = texture2D(uDye, vUv).r;
  if (!(t == t)) t = 0.0;
  v.y -= gravity * clamp(t, 0.0, 1.5) * dt;
  float m = texture2D(uMask, vUv).r;
  v *= 1.0 - maskDrag * m * dt;
  gl_FragColor = vec4(clamp(v, -1200.0, 1200.0), 0.0, 1.0);
}
`;

export const divergenceShader = /* glsl */ `${header}
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`;

export const curlShader = /* glsl */ `${header}
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}
`;

export const vorticityShader = /* glsl */ `${header}
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity += force * dt;
  velocity = min(max(velocity, -1000.0), 1000.0);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

export const pressureShader = /* glsl */ `${header}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`;

export const gradientSubtractShader = /* glsl */ `${header}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

export { thermalGLSL } from "@/shaders/thermal";
