'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BrainCircuit,
  CirclePile,
  Folder,
  ListChecks,
  LoaderCircle,
  Milestone,
  Newspaper,
  StickyNote,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import {
  EMPTY_SEARCH_RESPONSE,
  MAX_SEARCH_LIMIT,
  MIN_SEARCH_QUERY_LENGTH,
  SEARCH_TYPES,
  type SearchResponse,
  type SearchType,
} from '@midnite/shared';
import { searchAll } from '@/lib/api';
import { FilterPills, type FilterOption } from '@/components/filter-pills';
import { renderSnippet } from '@/lib/highlight';

/** How each domain renders: group heading + a row icon (mirrors the palette). */
const TYPE_META: Record<SearchType, { label: string; Icon: LucideIcon }> = {
  task: { label: 'Tasks', Icon: ListChecks },
  project: { label: 'Projects', Icon: Folder },
  memory: { label: 'Memory', Icon: BrainCircuit },
  note: { label: 'Notes', Icon: StickyNote },
  council: { label: 'Councils', Icon: CirclePile },
  workflow: { label: 'Workflows', Icon: Workflow },
  milestone: { label: 'Milestones', Icon: Milestone },
  digest: { label: 'Digests', Icon: Newspaper },
};

type FetchStatus = 'idle' | 'loading' | 'done' | 'error';

/**
 * The dedicated `/search` results surface (Phase 20 Theme D). Reads `?q=` (the
 * URL-backed SearchBar in the header writes it) + `?type=` (the FilterPills), runs
 * a single `GET /search` at a high limit, and renders the hits grouped by type
 * with highlighted snippets. Type filtering is client-side over the one response,
 * so toggling pills never refetches. Deep-linkable + shareable via the query.
 */
export function SearchResults() {
  const params = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const typeParam = params.get('type') ?? '';
  const activeTypes = new Set(
    typeParam.split(',').filter((t): t is SearchType => (SEARCH_TYPES as readonly string[]).includes(t)),
  );

  const [response, setResponse] = useState<SearchResponse>(EMPTY_SEARCH_RESPONSE);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (q.length < MIN_SEARCH_QUERY_LENGTH) {
      abortRef.current?.abort();
      abortRef.current = null;
      setResponse(EMPTY_SEARCH_RESPONSE);
      setStatus('idle');
      return undefined;
    }
    setStatus('loading');
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    void (async () => {
      try {
        const res = await searchAll(q, { limit: MAX_SEARCH_LIMIT, signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        setResponse(res);
        setStatus('done');
      } catch (err) {
        if (ctrl.signal.aborted || (err as Error)?.name === 'AbortError') return;
        setResponse(EMPTY_SEARCH_RESPONSE);
        setStatus('error');
      }
    })();
    return () => ctrl.abort();
  }, [q]);

  if (q.length < MIN_SEARCH_QUERY_LENGTH) {
    return (
      <p className="px-1 py-10 text-center text-sm text-muted-foreground">
        {q.length === 0
          ? 'Search across tasks, projects, memory, notes, councils & workflows.'
          : `Type at least ${MIN_SEARCH_QUERY_LENGTH} characters to search.`}
      </p>
    );
  }

  if (status === 'loading') {
    return (
      <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Searching…
      </p>
    );
  }

  if (status === 'error') {
    return <p className="py-10 text-center text-sm text-destructive">Search failed — try again.</p>;
  }

  if (response.total === 0) {
    return (
      <p className="px-1 py-10 text-center text-sm text-muted-foreground">
        No results for “{q}”.
      </p>
    );
  }

  // Type filtering happens client-side over the single response.
  const visible = activeTypes.size > 0
    ? response.results.filter((r) => activeTypes.has(r.type))
    : response.results;
  const sections = SEARCH_TYPES.map((type) => ({
    type,
    hits: visible.filter((r) => r.type === type),
  })).filter((s) => s.hits.length > 0);

  // Only types that actually matched become filter pills, labelled with counts.
  const pillOptions: FilterOption[] = SEARCH_TYPES.filter((t) => (response.byType[t] ?? 0) > 0).map(
    (t) => ({ value: t, label: `${TYPE_META[t].label} (${response.byType[t]})` }),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm text-muted-foreground">
          {response.total} result{response.total === 1 ? '' : 's'} for{' '}
          <span className="font-medium text-foreground">“{q}”</span>
        </span>
        {pillOptions.length > 1 && <FilterPills options={pillOptions} paramKey="type" allLabel="All types" />}
      </div>

      {sections.map((section) => {
        const { Icon, label } = TYPE_META[section.type];
        return (
          <section key={section.type} className="space-y-1.5">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
              <span className="font-normal text-muted-foreground">· {section.hits.length}</span>
            </h2>
            <ul className="overflow-hidden rounded-lg border border-border/60">
              {section.hits.map((result) => (
                <li key={`${result.type}:${result.id}`} className="border-b border-border/40 last:border-b-0">
                  <Link
                    href={result.route}
                    className="block px-3 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <span className="block truncate text-sm font-medium text-foreground">
                      {result.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {renderSnippet(result.snippet)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
