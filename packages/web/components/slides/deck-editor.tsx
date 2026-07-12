'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import type { Project } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownEditor } from '@/components/markdown-editor';
import { ProjectSelect } from '@/components/project-select';
import { useToast } from '@/components/toast';
import { createDeck, updateDeck } from '@/lib/slides/store';
import { markdownToDeck } from '@/lib/slides/markdown';

const STARTER = `# My presentation

## First section

- A point that will appear on click
- Another point, with a \`command\` and a [link](https://example.com)

## Second section

Write a paragraph and it becomes a step too.
`;

type Props = {
  /** Present when editing an existing deck; absent when creating a new one. */
  initial?: { slug: string; markdown: string; title: string; projectId: string | null };
  /** Projects available to assign the deck to (fetched from the gateway). */
  projects?: Project[];
};

export function DeckEditor({ initial, projects = [] }: Props) {
  const router = useRouter();
  const toast = useToast();
  const editing = !!initial;
  const [md, setMd] = useState(initial?.markdown ?? STARTER);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [projectId, setProjectId] = useState<string | null>(initial?.projectId ?? null);
  const [pending, setPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => markdownToDeck(md), [md]);
  const empty = !md.trim();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setMd(text);
    if (!title) setTitle(file.name.replace(/\.(md|markdown|txt)$/i, ''));
    e.target.value = ''; // allow re-selecting the same file
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (empty || pending) return;
    setPending(true);
    try {
      const slug = initial
        ? (updateDeck(initial.slug, { markdown: md, title: title || undefined, projectId }),
          initial.slug)
        : createDeck({ markdown: md, title: title || undefined, projectId });
      router.push(`/slides/present?slug=${encodeURIComponent(slug)}`);
    } catch (err) {
      setPending(false);
      toast.error(err instanceof Error ? err.message : 'Failed to save deck');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Deck title (optional — defaults to the first # heading)"
          aria-label="Deck title"
          className="min-w-[200px] flex-1"
        />
        {projects.length > 0 && (
          <ProjectSelect
            projects={projects}
            value={projectId}
            onChange={setProjectId}
            align="right"
            placeholder="No project"
          />
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        onChange={onFile}
        hidden
      />

      <MarkdownEditor
        value={md}
        onChange={setMd}
        defaultMode="edit"
        minHeight={360}
        ariaLabel="Deck markdown source"
        label={
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Markdown</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload .md
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{parsed.slides.length}</strong>{' '}
            {parsed.slides.length === 1 ? 'slide' : 'slides'}
          </span>
          {parsed.slides.map((s, i) => (
            <span
              key={i}
              className="max-w-[16ch] truncate rounded-full border border-border/60 bg-card/40 px-2.5 py-0.5 text-xs text-foreground"
            >
              {s.title || '—'}
            </span>
          ))}
        </div>
        <Button type="submit" size="sm" disabled={empty || pending}>
          {pending
            ? editing
              ? 'Saving…'
              : 'Creating…'
            : editing
              ? 'Save changes'
              : 'Create deck'}
        </Button>
      </div>
    </form>
  );
}
