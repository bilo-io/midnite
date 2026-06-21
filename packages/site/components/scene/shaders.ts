/* ── Particle field ───────────────────────────────────────────────────────── */

export const particleVertex = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uProgress;

attribute float aScale;
attribute float aPhase;
attribute vec3 aColor;

varying vec3 vColor;
varying float vTwinkle;

void main() {
  vec3 p = position;
  // Lazy swirl: rotate each particle around Y by an amount that grows with radius,
  // so the field shears into a soft vortex over time.
  float r = length(p.xz);
  float a = uTime * (0.06 + 0.04 / (r + 0.6)) + aPhase * 0.15;
  float s = sin(a), c = cos(a);
  p.xz = mat2(c, -s, s, c) * p.xz;
  // Gentle vertical breathing.
  p.y += sin(uTime * 0.4 + aPhase) * 0.12;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  float twinkle = 0.55 + 0.45 * sin(uTime * 1.6 + aPhase * 6.2831);
  vTwinkle = twinkle;
  vColor = aColor;

  // (10 / -z) is the perspective falloff; uSize is then ~ the pixel size of a
  // unit-scale particle at the reference distance. Keep uSize small (~2) — large
  // values blow points up into bokeh discs.
  gl_PointSize = uSize * aScale * uPixelRatio * (0.7 + uProgress * 0.6) * (10.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}`;

export const particleFragment = /* glsl */ `
uniform float uOpacity;
uniform vec3 uTint;
varying vec3 vColor;
varying float vTwinkle;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  // Soft sprite with a hot core and a wide glow falloff.
  float glow = smoothstep(0.5, 0.0, d);
  glow = pow(glow, 1.8);
  float core = smoothstep(0.14, 0.0, d);
  // uTint biases the per-particle brand colour toward the active section's accent;
  // mixed half-way so the shift stays subtle. White is a true no-op (mix → vColor).
  vec3 tinted = mix(vColor, vColor * uTint, 0.5);
  vec3 col = tinted + core * 0.5;
  gl_FragColor = vec4(col, glow * uOpacity * (0.35 + vTwinkle * 0.5));
}`;

/* ── Glow core ───────────────────────────────────────────────────────────────
   A smooth, stable fresnel sphere. No vertex displacement and normal (not
   additive) blending on a single convex mesh — so there's nothing to strobe as
   it rotates. The rim brightens with view angle and breathes very slowly. */

export const glowVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

export const glowFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

varying vec3 vNormal;
varying vec3 vView;

void main() {
  float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.0);
  // Very slow breathing so it feels alive without flickering.
  float pulse = 0.92 + 0.08 * sin(uTime * 0.5);
  vec3 col = mix(uColorA, uColorB, fres);
  col = mix(col, uColorC, smoothstep(0.55, 1.0, fres));
  float alpha = mix(0.18, 0.85, fres) * pulse;
  gl_FragColor = vec4(col, alpha);
}`;
