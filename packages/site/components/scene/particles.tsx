'use client';

import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { particleFragment, particleVertex } from './shaders';
import { prefersReducedMotion } from './use-scroll-progress';

// Brand accent ramp — the same colours as the web app's conic-gradient motif.
const ACCENTS = ['#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#ec4899'].map(
  (hex) => new THREE.Color(hex),
);

const COUNT = 4200;

/**
 * GPU particle field rendered with a custom additive shader: each point is a soft
 * glowing sprite that twinkles and swirls into a slow vortex (see particleVertex).
 * The field parallaxes and grows as `progress` advances.
 */
export function ParticleField({ progress }: { progress: MutableRefObject<number> }) {
  const ref = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { size, viewport } = useThree();
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const { positions, colors, scales, phases } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT);
    const phases = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      // Two populations: a dense flattened core halo and a sparse far field, for depth.
      const far = i % 5 === 0;
      const r = far ? 9 + Math.random() * 9 : 3.2 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.62;
      positions[i * 3 + 2] = r * Math.cos(phi);

      const c = ACCENTS[i % ACCENTS.length]!;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      scales[i] = far ? 0.5 + Math.random() * 0.7 : 0.9 + Math.random() * 1.8;
      phases[i] = Math.random();
    }
    return { positions, colors, scales, phases };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 2.2 },
      uPixelRatio: { value: 1 },
      uProgress: { value: 0 },
      uOpacity: { value: 0.85 },
    }),
    [],
  );

  useFrame((state, delta) => {
    const m = matRef.current;
    if (m) {
      if (!reduced) m.uniforms.uTime!.value += delta;
      m.uniforms.uProgress!.value = progress.current;
      m.uniforms.uPixelRatio!.value = Math.min(viewport.dpr, 2);
    }
    if (ref.current) {
      ref.current.rotation.x = progress.current * 0.5;
    }
  });

  // keep point size sensible across resolutions
  uniforms.uPixelRatio.value = Math.min(size.width > 0 ? viewport.dpr : 1, 2);

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        transparent
        depthWrite={false}
        // Normal (not additive) blending: 4k soft sprites would otherwise sum into
        // a white central blob that bloom blows out. This keeps the field crisp;
        // the core's additive rim is what carries the glow.
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
