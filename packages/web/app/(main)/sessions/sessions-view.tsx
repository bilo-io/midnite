'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import type { SessionSummary, SessionTranscript } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { SessionCard } from '@/components/session-card';
import { SessionTranscriptModal } from '@/components/session-transcript-modal';
import { getSessionTranscript } from '@/lib/api';
import { cn } from '@/lib/utils';

type View = 'list' | 'grid';
const VIEW_STORAGE_KEY = 'midnite.sessions.view';

export function SessionsView({ initial }: { initial: SessionSummary[] }) {
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<SessionSummary | null>(null);
  const [transcript, setTranscript] = useState<SessionTranscript | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'list' || stored === 'grid') setView(stored);
  }, []);

  const onSetView = useCallback((next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const onSelect = useCallback(async (session: SessionSummary) => {
    setSelected(session);
    setTranscript(null);
    setLoadError(null);
    setLoading(true);
    try {
      const data = await getSessionTranscript(session.projectSlug, session.id);
      setTranscript(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load transcript');
    } finally {
      setLoading(false);
    }
  }, []);

  const onClose = useCallback(() => {
    setSelected(null);
    setTranscript(null);
    setLoadError(null);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground tabular-nums">
          {initial.length} session{initial.length === 1 ? '' : 's'}
        </p>
        <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="List view"
            aria-pressed={view === 'list'}
            onClick={() => onSetView('list')}
            className={cn(
              'h-7 w-7',
              view === 'list' && 'bg-accent text-accent-foreground',
            )}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
            onClick={() => onSetView('grid')}
            className={cn(
              'h-7 w-7',
              view === 'grid' && 'bg-accent text-accent-foreground',
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
          No Claude sessions found under <code className="font-mono">~/.claude/projects</code>.
        </div>
      ) : view === 'list' ? (
        <div className="flex flex-col gap-2">
          {initial.map((s) => (
            <SessionCard
              key={`${s.projectSlug}/${s.id}`}
              session={s}
              layout="list"
              onClick={() => onSelect(s)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {initial.map((s) => (
            <SessionCard
              key={`${s.projectSlug}/${s.id}`}
              session={s}
              layout="grid"
              onClick={() => onSelect(s)}
            />
          ))}
        </div>
      )}

      {selected ? (
        <SessionTranscriptModal
          session={selected}
          transcript={transcript}
          loading={loading}
          error={loadError}
          onClose={onClose}
        />
      ) : null}
    </div>
  );
}
