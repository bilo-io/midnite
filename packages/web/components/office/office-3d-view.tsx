'use client';

import dynamic from 'next/dynamic';

import { Spinner } from '@/components/spinner';
import { OFFICE_ASPECT } from '@/lib/office/dimensions';

// The 3D engine will be WebGL/three-based and must load client-only in its own
// lazy chunk — mirroring the Phaser `office-view` wrapper — so its bundle only
// loads when the 3D tab is active (Phase 63 F engine isolation). The three.js
// world itself lands in Theme A, which replaces `office-3d-view-impl`; Theme F
// ships the tab/routing/preference plumbing around a placeholder stage so the
// switch + teardown path is real and testable now.
export const Office3DView = dynamic(
  () => import('./office-3d-view-impl').then((m) => m.Office3DViewImpl),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-xl border border-border bg-card"
        style={{ aspectRatio: OFFICE_ASPECT }}
      >
        <Spinner />
      </div>
    ),
  },
);
