'use client';

import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

import { Particles } from './particles';
import { useScrollProgress } from './use-scroll-progress';

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
        camera={{ position: [0, 0, 11], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ scene }) => {
          scene.fog = new THREE.FogExp2('#09090b', 0.045);
        }}
      >
        <Particles progress={progress} />
      </Canvas>
      {/* Fade the scene into the page background at the edges for legibility. */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background" />
    </div>
  );
}
