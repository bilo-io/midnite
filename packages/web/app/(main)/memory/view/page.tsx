'use client';

import { Suspense } from 'react';

import { MemoryDetailContainer } from './memory-detail-view';

// Static-export-friendly memory workspace (Phase 65 A): id from `?id=`.
// `output: 'export'` can't prerender arbitrary runtime ids, so — like
// /projects/view, /sessions/view — the view reads the id from the query string
// and fetches client-side. useSearchParams needs a Suspense boundary.
export default function MemoryViewPage() {
  return (
    <Suspense fallback={null}>
      <MemoryDetailContainer />
    </Suspense>
  );
}
