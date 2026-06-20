'use client';

import dynamic from 'next/dynamic';

import { Spinner } from '@/components/spinner';
import { OFFICE_ASPECT } from '@/lib/office/dimensions';

// Phaser touches window/WebGL — load the whole office client-only, mirroring the
// session-terminal pattern. Keeps Phaser out of the prerender and in its own chunk.
// (OFFICE_ASPECT comes from a Phaser-free module so this eager wrapper stays light.)
export const OfficeView = dynamic(() => import('./office-view-impl').then((m) => m.OfficeViewImpl), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-xl border border-border bg-card"
      style={{ aspectRatio: OFFICE_ASPECT }}
    >
      <Spinner />
    </div>
  ),
});
