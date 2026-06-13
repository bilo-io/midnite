// Ashima 3D simplex noise — used by the core's vertex displacement. Public domain.
// https://github.com/ashima/webgl-noise
const SIMPLEX_NOISE = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

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
varying vec3 vColor;
varying float vTwinkle;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  // Soft sprite with a hot core and a wide glow falloff.
  float glow = smoothstep(0.5, 0.0, d);
  glow = pow(glow, 1.8);
  float core = smoothstep(0.14, 0.0, d);
  vec3 col = vColor + core * 0.5;
  gl_FragColor = vec4(col, glow * uOpacity * (0.35 + vTwinkle * 0.5));
}`;

/* ── Morphing fresnel core ───────────────────────────────────────────────── */

export const coreVertex = /* glsl */ `
uniform float uTime;
uniform float uProgress;

varying vec3 vNormal;
varying vec3 vView;
varying float vNoise;

${SIMPLEX_NOISE}

void main() {
  // Layered noise drives a flowing surface displacement.
  float n = snoise(position * 1.1 + uTime * 0.16);
  n += 0.5 * snoise(position * 2.3 - uTime * 0.22);
  vNoise = n;

  vec3 displaced = position + normal * n * (0.22 + uProgress * 0.18);

  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

export const coreFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

varying vec3 vNormal;
varying vec3 vView;
varying float vNoise;

void main() {
  float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.6);
  // Iridescent ramp: base → mid → hot rim, modulated by surface noise + time.
  float t = clamp(fres + vNoise * 0.25 + 0.08 * sin(uTime * 0.5), 0.0, 1.0);
  vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 0.6, t));
  col = mix(col, uColorC, smoothstep(0.55, 1.0, t));
  col += fres * 0.6;
  // Additive-friendly: alpha tracks the rim so the interior stays airy.
  float alpha = fres * 0.8 + 0.03;
  gl_FragColor = vec4(col, alpha);
}`;
