'use client';

import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { glowFragment, glowVertex } from './shaders';
import { prefersReducedMotion } from './use-scroll-progress';

/** Soft round sprite for the lattice nodes — a radial alpha falloff so each node
 *  reads as a glowing point rather than a hard square. Built on a canvas (this
 *  module only ever runs client-side via the ssr:false dynamic import). */
function makeNodeSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The centrepiece: a smooth fresnel "orchestration core" inside a slowly
 * rotating geodesic wireframe with glowing nodes at its vertices. Deliberately
 * flicker-free — a single convex glow sphere (no displacement, normal blending)
 * plus clean line/point geometry, so nothing strobes as it turns. Eases its spin
 * with scroll via `progress`.
 */
export function Core({ progress }: { progress: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  // Geodesic lattice (detail 1) — its vertices double as the node positions.
  const lattice = useMemo(() => new THREE.IcosahedronGeometry(2.7, 1), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(lattice, 1), [lattice]);
  const sprite = useMemo(() => makeNodeSprite(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color('#1e1b4b') }, // deep indigo interior
      uColorB: { value: new THREE.Color('#6366f1') }, // indigo/violet mid
      uColorC: { value: new THREE.Color('#22d3ee') }, // cyan hot rim
    }),
    [],
  );

  useFrame((state, delta) => {
    if (matRef.current && !reduced) matRef.current.uniforms.uTime!.value += delta;
    if (group.current) {
      const t = reduced ? 0 : state.clock.elapsedTime;
      // Slow, single-axis-dominant rotation — fast spin makes thin lines strobe.
      group.current.rotation.y = t * 0.07 + progress.current * 1.1;
      group.current.rotation.x = t * 0.025;
    }
  });

  return (
    <group ref={group}>
      {/* smooth inner glow sphere — stable fresnel, no displacement */}
      <mesh>
        <sphereGeometry args={[1.75, 64, 64]} />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={glowVertex}
          fragmentShader={glowFragment}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>

      {/* geodesic wireframe shell */}
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#8b5cf6" transparent opacity={0.32} depthWrite={false} />
      </lineSegments>

      {/* glowing nodes at the lattice vertices */}
      <points geometry={lattice}>
        <pointsMaterial
          map={sprite}
          color="#c7d2fe"
          size={0.34}
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>
    </group>
  );
}
