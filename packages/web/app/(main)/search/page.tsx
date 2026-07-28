'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { SearchResults } from './search-results';

export default function SearchPage() {
  const t = useTranslations('search');
  return (
    <>
      <PageHeader title={t('page.title')} icon="Search" description={t('page.description')} />
      <div className="reveal-staged container space-y-5 pb-8 pt-2" data-tour="search">
        <SearchBar placeholder={t('page.placeholder')} clearLabel={t('page.clearAriaLabel')} />
        <SearchResults />
      </div>
    </>
  );
}
