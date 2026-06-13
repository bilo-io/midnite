'use client';

import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { prefersReducedMotion } from './use-scroll-progress';

// Brand accent ramp — the same colours as the web app's conic-gradient motif.
const ACCENTS = ['#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981'].map(
  (hex) => new THREE.Color(hex),
);

const COUNT = 1400;

/**
 * A drifting particle field plus a slowly rotating wireframe icosahedron. Both
 * react to scroll: the camera dollies in, the field parallaxes, and the mesh
 * tilts as `progress` advances from 0 → 1.
 */
export function Particles({ progress }: { progress: MutableRefObject<number> }) {
  const pointsRef = useRef<THREE.Points>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // Distribute through a flattened sphere shell for a sense of depth.
      const r = 4 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = r * Math.cos(phi);

      const c = ACCENTS[i % ACCENTS.length]!;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, []);

  useFrame((state, delta) => {
    const p = progress.current;
    // Camera dolly: ease toward the field as the page scrolls.
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 11 - p * 4.5, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, p * 1.5, 0.06);
    camera.lookAt(0, 0, 0);

    if (reduced) return;

    const t = state.clock.elapsedTime;
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.04;
      pointsRef.current.rotation.x = p * 0.6;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.12 + p * 1.4;
      meshRef.current.rotation.x = t * 0.08;
      const s = 1 + p * 0.4;
      meshRef.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <mesh ref={meshRef}>
        <icosahedronGeometry args={[2.4, 1]} />
        <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.18} />
      </mesh>
    </group>
  );
}
