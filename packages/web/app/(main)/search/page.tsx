'use client';

import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { SearchResults } from './search-results';

export default function SearchPage() {
  return (
    <>
      <PageHeader
        title="Search"
        icon="Search"
        description="Full-text search across tasks, projects, memory, notes, councils & workflows."
        actions={<SearchBar placeholder="Search everything" />}
      />
      <div className="reveal-staged container space-y-5 pb-8 pt-2" data-tour="search">
        <SearchResults />
      </div>
    </>
  );
}
