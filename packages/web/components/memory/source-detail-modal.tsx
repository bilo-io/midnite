'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';
import { SOURCE_KIND_LABEL, type MemorySourceContent } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Tabs, type TabOption } from '@/components/ui/tabs';
import { SourceIcon } from '@/components/source-icon';
import type { EditableSource } from '@/components/source-list-editor';
import { getMemorySourceContent } from '@/lib/api';
import { youtubeEmbedUrl } from '@/lib/youtube';
import { cn } from '@/lib/utils';

type DetailTab = 'source' | 'text';

const TAB_OPTIONS: TabOption<DetailTab>[] = [
  { value: 'source', label: 'Source' },
  { value: 'text', label: 'Text' },
];

/**
 * The source detail view: tab 1 previews the source itself (YouTube embed,
 * sandboxed website iframe with an open-original fallback, or file metadata);
 * tab 2 shows its scraped/extracted text (fetched on open).
 */
export function SourceDetailModal({
  memoryId,
  source,
  onClose,
}: {
  memoryId: string;
  source: EditableSource;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>('source');
  const label = source.title ?? source.fileName ?? source.url ?? 'Source';

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3.5">
            <SourceIcon kind={source.kind} faviconUrl={source.faviconUrl} url={source.url} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={label}>
              {label}
            </span>
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Open original <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="px-5 pt-3">
            <Tabs options={TAB_OPTIONS} value={tab} onChange={setTab} ariaLabel="Source detail view" />
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {tab === 'source' ? (
              <SourcePreview source={source} />
            ) : (
              <SourceText memoryId={memoryId} sourceId={source.id} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/** Tab 1 — the source itself. */
function SourcePreview({ source }: { source: EditableSource }) {
  const embed = source.kind === 'youtube' ? youtubeEmbedUrl(source.url) : null;

  if (embed) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border/60 bg-black">
        <iframe
          title="YouTube preview"
          src={embed}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  if (source.url) {
    return (
      <div className="space-y-2">
        <div className="h-[60vh] w-full overflow-hidden rounded-lg border border-border/60 bg-white">
          <iframe
            title={source.title ?? 'Website preview'}
            src={source.url}
            sandbox="allow-scripts allow-same-origin allow-popups"
            referrerPolicy="no-referrer"
            className="h-full w-full"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Some sites block embedding — if this stays blank,{' '}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            open the original ↗
          </a>
          .
        </p>
      </div>
    );
  }

  // A file source — no URL to embed; show its metadata.
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Type</dt>
        <dd>{SOURCE_KIND_LABEL[source.kind]}</dd>
        {source.fileName ? (
          <>
            <dt className="text-muted-foreground">File</dt>
            <dd className="break-all">{source.fileName}</dd>
          </>
        ) : null}
      </dl>
      <p className="text-xs text-muted-foreground">The extracted text is in the Text tab.</p>
    </div>
  );
}

/** Tab 2 — the scraped/extracted text. */
function SourceText({ memoryId, sourceId }: { memoryId: string; sourceId: string }) {
  const [content, setContent] = useState<MemorySourceContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMemorySourceContent(memoryId, sourceId)
      .then((c) => {
        if (!cancelled) setContent(c);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load source text');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [memoryId, sourceId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading text…
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!content) return null;

  if (content.ingestState === 'pending') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Still reading this source…
      </div>
    );
  }
  if (content.ingestState === 'failed') {
    return (
      <p className="text-sm text-destructive">
        Failed to read this source{content.ingestError ? `: ${content.ingestError}` : ''}.
      </p>
    );
  }
  if (!content.text || !content.text.trim()) {
    return <p className="text-sm text-muted-foreground">No text extracted from this source.</p>;
  }

  return (
    <pre className={cn('whitespace-pre-wrap break-words font-sans text-sm text-foreground')}>
      {content.text}
    </pre>
  );
}
