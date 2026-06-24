'use client';

import { PageHeader } from '@/components/page-header';
import { DesktopOnly } from '@/components/desktop-only';
import { OfficeView } from '@/components/office/office-view';

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
          <OfficeView />
        </div>
      </DesktopOnly>
    </>
  );
}
