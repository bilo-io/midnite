'use client';

import dynamic from 'next/dynamic';

// Phaser touches window/WebGL — load the whole office client-only, mirroring the
// session-terminal pattern. Keeps Phaser out of the prerender and in its own chunk.
export const OfficeView = dynamic(() => import('./office-view-impl').then((m) => m.OfficeViewImpl), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground"
      style={{ height: 'min(70vh, 560px)' }}
    >
      Loading office…
    </div>
  ),
});
