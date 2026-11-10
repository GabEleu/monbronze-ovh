/** Rampe de rayonnement thermique (corps noir simplifié) : rouge sombre → orange → jaune → blanc. */
export const thermalGLSL = /* glsl */ `
vec3 thermal(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(vec3(0.0), vec3(0.32, 0.03, 0.01), smoothstep(0.0, 0.18, t));
  c = mix(c, vec3(0.86, 0.16, 0.03), smoothstep(0.15, 0.42, t));
  c = mix(c, vec3(1.0, 0.42, 0.1), smoothstep(0.38, 0.62, t));
  c = mix(c, vec3(1.0, 0.74, 0.32), smoothstep(0.58, 0.82, t));
  c = mix(c, vec3(1.0, 0.96, 0.84), smoothstep(0.8, 1.0, t));
  return c;
}
`;
