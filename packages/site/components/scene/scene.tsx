'use client';

import { useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

import { Core } from './core';
import { ParticleField } from './particles';
import { prefersReducedMotion, usePointer, useScrollProgress } from './use-scroll-progress';

/** Camera rig: scroll dollies the camera toward the core; the pointer adds a
 *  subtle parallax tilt. All eased so motion stays buttery. */
function Rig({ progress }: { progress: React.MutableRefObject<number> }) {
  const { camera } = useThree();
  const pointer = usePointer();
  const reduced = useMemo(() => prefersReducedMotion(), []);

  useFrame(() => {
    const p = progress.current;
    const px = reduced ? 0 : pointer.current.x * 0.9;
    const py = reduced ? 0 : pointer.current.y * 0.6;
    camera.position.x += (px - camera.position.x) * 0.04;
    camera.position.y += (p * 0.6 + py - camera.position.y) * 0.04;
    // Pull BACK as the page scrolls: the orb is the hero centrepiece, then recedes
    // into a calm ambient field so content sections read cleanly over it.
    camera.position.z += (11 + p * 5 - camera.position.z) * 0.06;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/**
 * Fixed full-viewport WebGL backdrop. Mounted client-only (see SceneBackdrop's
 * dynamic import) because WebGL touches `window`/`canvas` at setup. Sits behind
 * all page content at z-0; sections render above it on translucent surfaces.
 */
export default function Scene() {
  const progress = useScrollProgress();

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 11], fov: 52 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ scene, gl }) => {
          scene.fog = new THREE.FogExp2('#09090b', 0.045);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
      >
        <Rig progress={progress} />
        <Core progress={progress} />
        <ParticleField progress={progress} />

        <EffectComposer multisampling={4}>
          {/* High threshold so only the hottest particle cores + the fresnel rim
              bloom — the field stays crisp instead of washing to a haze. */}
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.3}
            mipmapBlur
            radius={0.6}
          />
          <Vignette offset={0.3} darkness={0.85} />
        </EffectComposer>
      </Canvas>
      {/* Fade the scene into the page background at the edges for legibility. */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background" />
    </div>
  );
}
