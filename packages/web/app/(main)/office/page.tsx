'use client';

import { Suspense } from 'react';

import { PageHeader } from '@/components/page-header';
import { DesktopOnly } from '@/components/desktop-only';
import { OfficeSurface } from '@/components/office/office-surface';

export default function OfficePage() {
  return (
    <>
      <PageHeader
        title="Office"
        icon="Building2"
        description="Walk the floor and see what your agents are up to — step up to a desk to call or message."
      />
      <DesktopOnly label="The office">
        <div className="reveal-staged container space-y-6 pb-8 pt-2">
          {/* useSearchParams (in OfficeSurface, for ?view=2d|3d) needs a Suspense boundary. */}
          <Suspense fallback={null}>
            <OfficeSurface />
          </Suspense>
        </div>
      </DesktopOnly>
    </>
  );
}
