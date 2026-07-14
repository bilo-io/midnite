'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Newspaper } from 'lucide-react';
import type { Digest, DigestListItem } from '@midnite/shared';

import { cn } from '@/lib/utils';
import { getDigest, getDigests } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { EmptyState } from '@/components/empty-state';
import { WidgetLoader } from '@/components/spinner';
import { DigestDetail } from '@/components/digest-detail';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function DigestListRow({
  item,
  active,
  onSelect,
}: {
  item: DigestListItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
        active ? 'border-primary/60 bg-accent' : 'bg-card hover:border-primary/40 hover:bg-accent/60',
      )}
    >
      <div className="text-xs text-muted-foreground">{fmtDate(item.createdAt)}</div>
      <div className="mt-0.5 line-clamp-2 text-sm font-medium text-foreground">{item.headline}</div>
      <div className="mt-1 flex gap-2 text-[11px] tabular-nums text-muted-foreground">
        <span className="text-emerald-600 dark:text-emerald-400">{item.counts.shipped} shipped</span>
        <span className="text-rose-600 dark:text-rose-400">{item.counts.failed} failed</span>
        {item.counts.needsAttention > 0 && (
          <span className="text-amber-600 dark:text-amber-400">{item.counts.needsAttention} attn</span>
        )}
      </div>
    </button>
  );
}

/** The selected digest, self-fetched from `?id=`. Split out so its own fetch
 *  state doesn't re-render the list. */
function SelectedDigest({ id }: { id: string }) {
  const { data: digest, loading } = useApiData<Digest | null>((signal) => getDigest(id, signal), [id]);

  if (loading && !digest) {
    return (
      <div className="flex justify-center py-16">
        <WidgetLoader />
      </div>
    );
  }
  if (!digest) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Digest not found.</p>;
  }
  return <DigestDetail digest={digest} />;
}

/**
 * Phase 62 G — the Digests feed, hosted as the Digest tab on /ops. Two-pane
 * master-detail: the left rail lists recent digests (date, headline, counts);
 * the right pane renders the selected digest's structured detail with task
 * deep-links + markdown export. Selection lives in the `?id=` query param so a
 * digest is deep-linkable (and global search routes straight to one) — URL
 * updates preserve the host page's other params (e.g. `?tab=digest`).
 */
export function DigestsFeed() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  const hrefFor = (id: string): string => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', id);
    return `${pathname}?${params.toString()}`;
  };

  const { data: digests, loading } = useApiData<DigestListItem[]>((signal) => getDigests(undefined, signal), []);
  const list = digests ?? [];

  // Default the selection to the newest digest so the pane is never blank when
  // digests exist and none is chosen yet.
  const effectiveId = selectedId ?? list[0]?.id ?? null;
  useEffect(() => {
    if (!selectedId && list.length > 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('id', list[0]!.id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [selectedId, list, router, pathname, searchParams]);

  const select = (id: string) => router.replace(hrefFor(id), { scroll: false });

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6" data-tour="digests-content">
      {loading && list.length === 0 ? (
        <div className="flex justify-center py-16">
          <WidgetLoader />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          Icon={Newspaper}
          title="No digests yet"
          description="Digests are produced by the daily-digest workflow. Enable it in Workflows to get a periodic fleet roll-up here."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-[minmax(14rem,18rem)_1fr]">
          {/* Master: the feed list */}
          <nav aria-label="Digests" className="space-y-2 md:max-h-[calc(100vh-12rem)] md:overflow-y-auto">
            {list.map((item) => (
              <DigestListRow
                key={item.id}
                item={item}
                active={item.id === effectiveId}
                onSelect={() => select(item.id)}
              />
            ))}
          </nav>

          {/* Detail: the selected digest */}
          <div className="min-w-0 rounded-xl border bg-card/50 p-4 md:p-6">
            {effectiveId ? (
              <SelectedDigest id={effectiveId} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Select a digest to view it.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
