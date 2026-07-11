'use client';

import { Suspense } from 'react';

import { DigestsView } from './digests-view';

// Phase 62 G — the fleet digests feed. Selection lives in `?id=`; under
// `output: 'export'` useSearchParams needs a Suspense boundary (like
// /memory/view, /projects/view, /sessions/view).
export default function DigestsPage() {
  return (
    <Suspense fallback={null}>
      <DigestsView />
    </Suspense>
  );
}
