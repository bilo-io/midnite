'use client';

import dynamic from 'next/dynamic';

import { useTheme } from '@/app/theme/theme-context';
import { useActiveSection } from '@/components/sections/section-controller';

// WebGL is client-only — load the canvas without SSR (same pattern the web app
// uses for xterm). The grid backdrop shows immediately; the scene fades in once
// the chunk + GL context are ready.
const Scene = dynamic(() => import('./scene'), { ssr: false });

export function SceneBackdrop() {
  // Read outside the R3F Canvas (React context doesn't cross the reconciler
  // boundary) and pass down as props. `useActiveSection` is undefined with no
  // SectionProvider above (e.g. the download route) — the scene uses its default.
  const active = useActiveSection();
  const { resolved } = useTheme();
  return <Scene activeSection={active ?? null} resolved={resolved} />;
}
