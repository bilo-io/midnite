'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/page-header';
import { DesktopOnly } from '@/components/desktop-only';
import { OfficeSurface } from '@/components/office/office-surface';

export default function OfficePage() {
  const t = useTranslations('office');
  return (
    <>
      <PageHeader title={t('page.title')} icon="Building2" description={t('page.description')} />
      <DesktopOnly label={t('page.desktopLabel')}>
        <div className="reveal-staged container space-y-6 pb-8 pt-2" data-tour="office">
          {/* OfficeSurface reads `?view=` via useSearchParams — needs a Suspense boundary. */}
          <Suspense fallback={null}>
            <OfficeSurface />
          </Suspense>
        </div>
      </DesktopOnly>
    </>
  );
}
