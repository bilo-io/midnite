'use client';

import dynamic from 'next/dynamic';

// WebGL is client-only — load the canvas without SSR (same pattern the web app
// uses for xterm). The grid backdrop shows immediately; the scene fades in once
// the chunk + GL context are ready.
const Scene = dynamic(() => import('./scene'), { ssr: false });

export function SceneBackdrop() {
  return <Scene />;
}
