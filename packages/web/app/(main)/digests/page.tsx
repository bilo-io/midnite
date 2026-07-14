'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// The digests feed moved to the Digest tab on /ops. This route stays as a
// redirect so old deep-links keep working — the gateway's global-search
// results and any bookmarks route here with `?id=<digest>`, which is carried
// over. useSearchParams needs a Suspense boundary under `output: 'export'`.
function DigestsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get('id');
    router.replace(`/ops?tab=digest${id ? `&id=${encodeURIComponent(id)}` : ''}`);
  }, [router, searchParams]);

  return null;
}

export default function DigestsPage() {
  return (
    <Suspense fallback={null}>
      <DigestsRedirect />
    </Suspense>
  );
}
