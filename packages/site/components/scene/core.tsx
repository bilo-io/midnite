'use client';

import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { coreFragment, coreVertex } from './shaders';
import { prefersReducedMotion } from './use-scroll-progress';

/**
 * The centrepiece: a noise-displaced icosahedron rendered with an additive
 * iridescent-fresnel shader (glows at the silhouette), wrapped in two
 * counter-rotating wireframe shells. Bloom in the composer turns the bright rim
 * into a soft halo. Rotates and inflates slightly as `progress` advances.
 */
export function Core({ progress }: { progress: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const shellA = useRef<THREE.Mesh>(null);
  const shellB = useRef<THREE.Mesh>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uColorA: { value: new THREE.Color('#1e1b4b') }, // deep indigo interior
      uColorB: { value: new THREE.Color('#6366f1') }, // indigo/violet mid
      uColorC: { value: new THREE.Color('#22d3ee') }, // cyan hot rim
    }),
    [],
  );

  useFrame((state, delta) => {
    const p = progress.current;
    if (matRef.current) {
      if (!reduced) matRef.current.uniforms.uTime!.value += delta;
      matRef.current.uniforms.uProgress!.value = p;
    }
    if (group.current) {
      const t = reduced ? 0 : state.clock.elapsedTime;
      group.current.rotation.y = t * 0.12 + p * 1.6;
      group.current.rotation.x = t * 0.05 + p * 0.4;
      // Shrink slightly as the camera pulls back, so the orb settles into the field.
      group.current.scale.setScalar(1 - p * 0.12);
    }
    if (!reduced) {
      if (shellA.current) shellA.current.rotation.y += delta * 0.18;
      if (shellB.current) shellB.current.rotation.x -= delta * 0.12;
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[2.5, 24]} />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={coreVertex}
          fragmentShader={coreFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={shellA}>
        <icosahedronGeometry args={[3.2, 1]} />
        <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.14} />
      </mesh>
      <mesh ref={shellB} rotation={[0.4, 0.2, 0]}>
        <icosahedronGeometry args={[4.0, 2]} />
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.07} />
      </mesh>
    </group>
  );
}
