'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Rocket } from 'lucide-react';
import { IdeaStatusChip } from '@/components/ideas/IdeaStatusChip';
import { getIdea, updateIdea, deleteIdea } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { cn } from '@/lib/utils';
import type { UpdateIdeaRequest } from '@midnite/shared';

export default function IdeaDetailView() {
  const router = useRouter();
  const id = useSearchParams().get('id') ?? '';

  const { data, error } = useApiData(() => getIdea(id), [id]);
  const idea = data?.idea ?? null;

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = useCallback(() => {
    if (!idea) return;
    setTitle(idea.title);
    setBody(idea.body);
    setEditing(true);
  }, [idea]);

  const save = useCallback(async () => {
    if (!idea) return;
    setSaving(true);
    try {
      const req: UpdateIdeaRequest = {};
      if (title !== idea.title) req.title = title;
      if (body !== idea.body) req.body = body;
      await updateIdea(idea.id, req);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [idea, title, body]);

  const promote = useCallback(async () => {
    if (!idea) return;
    await updateIdea(idea.id, { status: 'promoted' });
  }, [idea]);

  const remove = useCallback(async () => {
    if (!idea) return;
    if (!window.confirm(`Delete "${idea.title}"? This cannot be undone.`)) return;
    await deleteIdea(idea.id);
    router.push('/ideas');
  }, [idea, router]);

  if (error) {
    return (
      <div className="container py-8">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="container py-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-6 pb-12">
      <button
        onClick={() => router.push('/ideas')}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All ideas
      </button>

      <div className="flex items-start justify-between gap-4">
        {editing ? (
          <input
            className="flex-1 text-xl font-semibold bg-transparent border-b border-border focus:outline-none focus:border-primary"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        ) : (
          <h1 className="text-xl font-semibold">{idea.title}</h1>
        )}
        <IdeaStatusChip status={idea.status} />
      </div>

      {idea.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {idea.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6">
        {editing ? (
          <textarea
            className="w-full min-h-[160px] resize-y rounded-md border border-border bg-transparent p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe your idea…"
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
            {idea.body || <span className="italic">No description yet.</span>}
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <button
              onClick={save}
              disabled={saving}
              className={cn(
                'rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground',
                'hover:bg-primary/90 transition-colors disabled:opacity-50',
              )}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            {idea.status !== 'promoted' && (
              <button
                onClick={promote}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/40 transition-colors"
              >
                <Rocket className="h-4 w-4" />
                Promote to project
              </button>
            )}
            <button
              onClick={remove}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </>
        )}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Created {new Date(idea.createdAt).toLocaleString()}
        {idea.updatedAt !== idea.createdAt && (
          <> · Updated {new Date(idea.updatedAt).toLocaleString()}</>
        )}
      </p>
    </div>
  );
}
